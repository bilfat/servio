<?php

declare(strict_types=1);

namespace App\Domain\AfterSales\Returns;

use App\Models\AfterSalesCase;
use App\Models\CaseEvent;
use App\Models\CaseReturnInspection;
use App\Models\CaseReturnInstruction;
use App\Models\CaseReturnReceipt;
use App\Models\CaseReturnShipment;
use App\Models\CaseShippingExpense;
use App\Models\OutboxEvent;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class PhysicalReturnService
{
    /**
     * Merchant saves return instructions (or waives physical return).
     */
    public function saveReturnInstructions(
        string $caseId,
        string $actorId,
        string $orgId,
        array $data
    ): AfterSalesCase {
        return DB::transaction(function () use ($caseId, $actorId, $orgId, $data) {
            /** @var AfterSalesCase|null $case */
            $case = AfterSalesCase::where('id', $caseId)
                ->lockForUpdate()
                ->first();

            if (!$case) {
                throw new \Illuminate\Database\Eloquent\ModelNotFoundException("Kasus after-sales tidak ditemukan.");
            }

            if ($case->owner_org_id !== $orgId) {
                throw new \Illuminate\Auth\Access\AuthorizationException("Akses ditolak: Kasus ini bukan milik toko Anda.");
            }

            if (!in_array($case->case_type, ['GOODS_RETURN', 'GOODS_WARRANTY'], true)) {
                throw new InvalidArgumentException("Instruksi pengembalian fisik hanya berlaku untuk pesanan barang (GOODS_RETURN / GOODS_WARRANTY).");
            }

            if (in_array($case->main_status, ['COMPLETED', 'REJECTED', 'CANCELLED'], true)) {
                throw new InvalidArgumentException("Kasus berstatus '{$case->main_status}' tidak dapat diubah lagi.");
            }

            $requiresPhysicalReturn = (bool) ($data['requires_physical_return'] ?? true);
            $now = now();
            $lastSeq = (int) $case->events()->max('sequence');
            $newSeq = $lastSeq + 1;

            if (!$requiresPhysicalReturn) {
                // Return physical waived (e.g. item lost, keep item, digital component)
                $noReturnReason = trim((string) ($data['no_return_reason'] ?? 'Barang tidak perlu dikembalikan secara fisik atas persetujuan penjual.'));
                if (empty($noReturnReason)) {
                    throw new InvalidArgumentException("Alasan barang tidak perlu dikembalikan fisik wajib diisi.");
                }

                $instruction = CaseReturnInstruction::updateOrCreate(
                    ['case_id' => $case->id],
                    [
                        'requires_physical_return' => false,
                        'no_return_reason' => $noReturnReason,
                        'created_by' => $actorId,
                    ]
                );

                $case->main_status = 'IN_RESOLUTION';
                $case->save();

                CaseEvent::create([
                    'case_id' => $case->id,
                    'sequence' => $newSeq,
                    'event_type' => 'RETURN_PHYSICAL_WAIVED',
                    'from_state' => $case->getOriginal('main_status'),
                    'to_state' => 'IN_RESOLUTION',
                    'actor_kind' => 'MERCHANT',
                    'actor_id' => $actorId,
                    'reason' => $noReturnReason,
                    'data_json' => ['requires_physical_return' => false],
                    'occurred_at' => $now,
                ]);

                return $case->load(['items', 'evidence', 'events', 'returnInstruction', 'returnShipment', 'returnReceipt', 'returnInspection', 'shippingExpenses']);
            }

            // Physical return is REQUIRED
            $returnAddress = trim((string) ($data['return_address'] ?? ''));
            $recipientName = trim((string) ($data['recipient_name'] ?? ''));
            $recipientPhone = trim((string) ($data['recipient_phone'] ?? ''));
            $feePayer = strtoupper((string) ($data['shipping_fee_payer'] ?? 'MERCHANT'));

            if (empty($returnAddress) || empty($recipientName)) {
                throw new InvalidArgumentException("Alamat pengembalian dan nama penerima wajib diisi secara sah.");
            }

            if (!in_array($feePayer, ['MERCHANT', 'CUSTOMER', 'THIRD_PARTY'], true)) {
                $feePayer = 'MERCHANT';
            }

            $instruction = CaseReturnInstruction::updateOrCreate(
                ['case_id' => $case->id],
                [
                    'requires_physical_return' => true,
                    'recipient_name' => $recipientName,
                    'recipient_phone' => $recipientPhone ?: null,
                    'return_address' => $returnAddress,
                    'packaging_instructions' => $data['packaging_instructions'] ?? 'Kemas barang secara aman dalam kemasan aslinya beserta seluruh aksesoris.',
                    'shipping_fee_payer' => $feePayer,
                    'shipping_fee_method' => $data['shipping_fee_method'] ?? 'REIMBURSEMENT_BY_MERCHANT',
                    'reimbursement_instructions' => $data['reimbursement_instructions'] ?? ($feePayer === 'MERCHANT' ? 'Pelanggan membayar ongkir terlebih dahulu dan melampirkan bukti resi untuk verifikasi kompensasi.' : null),
                    'deadline_at' => !empty($data['deadline_at']) ? $data['deadline_at'] : null,
                    'merchant_notes' => $data['merchant_notes'] ?? null,
                    'created_by' => $actorId,
                ]
            );

            // Record shipping expense expectation
            CaseShippingExpense::updateOrCreate(
                [
                    'case_id' => $case->id,
                    'expense_type' => 'RETURN_SHIPPING',
                ],
                [
                    'fee_payer' => $feePayer === 'THIRD_PARTY' ? 'PLATFORM' : $feePayer,
                    'actual_fee_idr' => 0,
                    'paid_by' => 'CUSTOMER',
                    'verification_status' => 'PENDING_VERIFICATION',
                    'approved_reimbursement_idr' => 0,
                    'reimbursement_status' => $feePayer === 'MERCHANT' ? 'PENDING_FINANCE_CONTRACT' : 'NOT_REQUIRED',
                    'notes' => 'Ongkir pengembalian barang fisik ke alamat penjual.',
                ]
            );

            $case->main_status = 'AWAITING_RETURN';
            $case->save();

            CaseEvent::create([
                'case_id' => $case->id,
                'sequence' => $newSeq,
                'event_type' => 'RETURN_INSTRUCTIONS_ISSUED',
                'from_state' => $case->getOriginal('main_status'),
                'to_state' => 'AWAITING_RETURN',
                'actor_kind' => 'MERCHANT',
                'actor_id' => $actorId,
                'reason' => 'Penjual telah menetapkan instruksi pengembalian fisik barang.',
                'data_json' => [
                    'return_address' => $returnAddress,
                    'recipient_name' => $recipientName,
                    'shipping_fee_payer' => $feePayer,
                ],
                'occurred_at' => $now,
            ]);

            return $case->load(['items', 'evidence', 'events', 'returnInstruction', 'returnShipment', 'returnReceipt', 'returnInspection', 'shippingExpenses']);
        });
    }

    /**
     * Customer submits return waybill & proof.
     */
    public function submitReturnShipment(
        string $caseId,
        string $customerId,
        array $data
    ): AfterSalesCase {
        return DB::transaction(function () use ($caseId, $customerId, $data) {
            /** @var AfterSalesCase|null $case */
            $case = AfterSalesCase::where('id', $caseId)
                ->lockForUpdate()
                ->first();

            if (!$case) {
                throw new \Illuminate\Database\Eloquent\ModelNotFoundException("Kasus after-sales tidak ditemukan.");
            }

            if ($case->customer_id !== $customerId) {
                throw new \Illuminate\Auth\Access\AuthorizationException("Anda tidak berhak mengakses pengajuan milik pelanggan lain (FORBIDDEN).");
            }

            if ($case->main_status !== 'AWAITING_RETURN') {
                throw new InvalidArgumentException("Pengajuan tidak sedang dalam status menunggu pengembalian barang ('AWAITING_RETURN').");
            }

            /** @var CaseReturnInstruction|null $instruction */
            $instruction = $case->returnInstruction;
            if (!$instruction || !$instruction->requires_physical_return) {
                throw new InvalidArgumentException("Pengajuan ini tidak memerlukan pengiriman barang kembali.");
            }

            // Anti-double submission
            if ($case->returnShipment()->exists()) {
                throw new InvalidArgumentException("Data pengiriman fisik sudah pernah dikirimkan sebelumnya (DOUBLE_SUBMISSION_FORBIDDEN).");
            }

            $courierName = trim((string) ($data['courier_name'] ?? ''));
            $trackingNumber = trim((string) ($data['tracking_number'] ?? ''));
            $shippedAt = !empty($data['shipped_at']) ? $data['shipped_at'] : now();
            $shippingFee = max(0, (float) ($data['shipping_fee_paid_idr'] ?? 0));
            $receiptRef = $data['shipping_receipt_ref'] ?? null;
            $feeProofRef = $data['fee_payment_proof_ref'] ?? null;
            $customerNotes = $data['customer_notes'] ?? null;

            if (empty($courierName)) {
                throw new InvalidArgumentException("Nama kurir/ekspedisi pengiriman wajib diisi.");
            }

            $shipment = CaseReturnShipment::create([
                'case_id' => $case->id,
                'courier_name' => $courierName,
                'tracking_number' => $trackingNumber ?: null,
                'shipped_at' => $shippedAt,
                'shipping_fee_paid_idr' => $shippingFee,
                'shipping_receipt_ref' => $receiptRef,
                'fee_payment_proof_ref' => $feeProofRef,
                'customer_notes' => $customerNotes,
                'shipping_status' => 'SHIPPED',
                'created_by' => $customerId,
            ]);

            // Update shipping expense record if customer paid fee
            if ($shippingFee > 0) {
                CaseShippingExpense::updateOrCreate(
                    [
                        'case_id' => $case->id,
                        'expense_type' => 'RETURN_SHIPPING',
                    ],
                    [
                        'fee_payer' => $instruction->shipping_fee_payer === 'THIRD_PARTY' ? 'PLATFORM' : $instruction->shipping_fee_payer,
                        'actual_fee_idr' => $shippingFee,
                        'paid_by' => 'CUSTOMER',
                        'verification_status' => 'PENDING_VERIFICATION',
                        'receipt_ref' => $feeProofRef ?: $receiptRef,
                        'approved_reimbursement_idr' => ($instruction->shipping_fee_payer === 'MERCHANT') ? $shippingFee : 0,
                        'reimbursement_status' => ($instruction->shipping_fee_payer === 'MERCHANT') ? 'PENDING_FINANCE_CONTRACT' : 'NOT_REQUIRED',
                        'notes' => "Pelanggan membayar ongkir sebesar Rp" . number_format($shippingFee, 0, ',', '.') . " menggunakan {$courierName}.",
                    ]
                );
            }

            $lastSeq = (int) $case->events()->max('sequence');
            CaseEvent::create([
                'case_id' => $case->id,
                'sequence' => $lastSeq + 1,
                'event_type' => 'RETURN_SHIPMENT_SUBMITTED',
                'from_state' => 'AWAITING_RETURN',
                'to_state' => 'AWAITING_RETURN',
                'actor_kind' => 'CUSTOMER',
                'actor_id' => $customerId,
                'reason' => "Pelanggan telah mengirim barang via {$courierName}" . ($trackingNumber ? " (Resi: {$trackingNumber})" : ""),
                'data_json' => [
                    'courier_name' => $courierName,
                    'tracking_number' => $trackingNumber,
                    'shipping_fee_paid_idr' => $shippingFee,
                ],
                'occurred_at' => now(),
            ]);

            return $case->load(['items', 'evidence', 'events', 'returnInstruction', 'returnShipment', 'returnReceipt', 'returnInspection', 'shippingExpenses']);
        });
    }

    /**
     * Merchant confirms receipt of returned goods package.
     */
    public function confirmReturnReceipt(
        string $caseId,
        string $actorId,
        string $orgId,
        array $data
    ): AfterSalesCase {
        return DB::transaction(function () use ($caseId, $actorId, $orgId, $data) {
            /** @var AfterSalesCase|null $case */
            $case = AfterSalesCase::where('id', $caseId)
                ->lockForUpdate()
                ->first();

            if (!$case) {
                throw new \Illuminate\Database\Eloquent\ModelNotFoundException("Kasus after-sales tidak ditemukan.");
            }

            if ($case->owner_org_id !== $orgId) {
                throw new \Illuminate\Auth\Access\AuthorizationException("Akses ditolak: Kasus ini bukan milik toko Anda.");
            }

            if (!$case->returnShipment()->exists()) {
                throw new InvalidArgumentException("Pelanggan belum mengirimkan data pengiriman barang.");
            }

            if ($case->returnReceipt()->exists()) {
                throw new InvalidArgumentException("Penerimaan barang retur sudah pernah dikonfirmasi sebelumnya.");
            }

            $receivedAt = !empty($data['received_at']) ? $data['received_at'] : now();
            $receivedBy = trim((string) ($data['received_by'] ?? 'Staff Gudang / Penerima Resmi'));
            $quantityReceived = (int) ($data['quantity_received'] ?? 1);
            $packageCondition = trim((string) ($data['package_condition'] ?? 'BAIK_TERSEGEL'));
            $receiptProofRef = $data['receipt_proof_ref'] ?? null;
            $receiptNotes = $data['receipt_notes'] ?? null;
            $isDisputed = ($data['status'] ?? 'RECEIVED') === 'DISPUTED_NOT_RECEIVED';

            if ($quantityReceived <= 0) {
                throw new InvalidArgumentException("Jumlah unit barang yang diterima harus minimal 1.");
            }

            $receipt = CaseReturnReceipt::create([
                'case_id' => $case->id,
                'received_at' => $receivedAt,
                'received_by' => $receivedBy,
                'quantity_received' => $quantityReceived,
                'package_condition' => $packageCondition,
                'receipt_proof_ref' => $receiptProofRef,
                'receipt_notes' => $receiptNotes,
                'status' => $isDisputed ? 'DISPUTED_NOT_RECEIVED' : 'RECEIVED',
                'dispute_reason' => $isDisputed ? ($data['dispute_reason'] ?? 'Paket belum sampai atau tidak diterima di alamat tujuan.') : null,
                'created_by' => $actorId,
            ]);

            $lastSeq = (int) $case->events()->max('sequence');
            CaseEvent::create([
                'case_id' => $case->id,
                'sequence' => $lastSeq + 1,
                'event_type' => $isDisputed ? 'RETURN_RECEIPT_DISPUTED' : 'RETURN_GOODS_RECEIVED',
                'from_state' => $case->main_status,
                'to_state' => $case->main_status,
                'actor_kind' => 'MERCHANT',
                'actor_id' => $actorId,
                'reason' => $isDisputed
                    ? "Penjual melaporkan paket retur belum diterima: " . ($data['dispute_reason'] ?? '')
                    : "Barang retur fisik diterima oleh {$receivedBy} (Kondisi: {$packageCondition}, Qty: {$quantityReceived}).",
                'data_json' => [
                    'quantity_received' => $quantityReceived,
                    'package_condition' => $packageCondition,
                    'is_disputed' => $isDisputed,
                ],
                'occurred_at' => now(),
            ]);

            return $case->load(['items', 'evidence', 'events', 'returnInstruction', 'returnShipment', 'returnReceipt', 'returnInspection', 'shippingExpenses']);
        });
    }

    /**
     * Merchant conducts physical inspection on returned goods.
     */
    public function submitReturnInspection(
        string $caseId,
        string $actorId,
        string $orgId,
        array $data
    ): AfterSalesCase {
        return DB::transaction(function () use ($caseId, $actorId, $orgId, $data) {
            /** @var AfterSalesCase|null $case */
            $case = AfterSalesCase::where('id', $caseId)
                ->lockForUpdate()
                ->first();

            if (!$case) {
                throw new \Illuminate\Database\Eloquent\ModelNotFoundException("Kasus after-sales tidak ditemukan.");
            }

            if ($case->owner_org_id !== $orgId) {
                throw new \Illuminate\Auth\Access\AuthorizationException("Akses ditolak: Kasus ini bukan milik toko Anda.");
            }

            /** @var CaseReturnReceipt|null $receipt */
            $receipt = $case->returnReceipt;
            if (!$receipt || $receipt->status !== 'RECEIVED') {
                throw new InvalidArgumentException("Barang retur belum diterima secara sah oleh pihak penjual.");
            }

            if ($case->returnInspection()->exists()) {
                throw new InvalidArgumentException("Pemeriksaan fisik barang retur sudah pernah disimpan sebelumnya.");
            }

            $inspectedAt = !empty($data['inspected_at']) ? $data['inspected_at'] : now();
            $inspectedBy = trim((string) ($data['inspected_by'] ?? 'Quality Control Officer'));
            $quantityInspected = (int) ($data['quantity_inspected'] ?? $receipt->quantity_received);
            $quantityApproved = (int) ($data['quantity_approved'] ?? $quantityInspected);
            $itemCondition = trim((string) ($data['item_condition'] ?? 'CACAT_PABRIK_TERVERIFIKASI'));
            $isSkuMatched = (bool) ($data['is_sku_matched'] ?? true);
            $isIssueMatched = (bool) ($data['is_issue_matched'] ?? true);
            $isComponentsComplete = (bool) ($data['is_components_complete'] ?? true);
            $outcome = strtoupper((string) ($data['inspection_outcome'] ?? 'MATCHED'));
            $notes = $data['inspection_notes'] ?? null;
            $evidenceRefs = $data['evidence_refs'] ?? [];

            if (!in_array($outcome, ['MATCHED', 'PARTIAL', 'MISMATCH'], true)) {
                $outcome = 'MATCHED';
            }

            if ($outcome === 'MISMATCH') {
                $quantityApproved = 0;
            }

            $inspection = CaseReturnInspection::create([
                'case_id' => $case->id,
                'inspected_at' => $inspectedAt,
                'inspected_by' => $inspectedBy,
                'quantity_inspected' => $quantityInspected,
                'quantity_approved' => $quantityApproved,
                'item_condition' => $itemCondition,
                'is_sku_matched' => $isSkuMatched,
                'is_issue_matched' => $isIssueMatched,
                'is_components_complete' => $isComponentsComplete,
                'inspection_outcome' => $outcome,
                'inspection_notes' => $notes,
                'evidence_refs' => $evidenceRefs,
                'created_by' => $actorId,
            ]);

            // Transition case status to IN_RESOLUTION if inspection passed or partial
            if ($outcome === 'MATCHED' || ($outcome === 'PARTIAL' && $quantityApproved > 0)) {
                $case->main_status = 'IN_RESOLUTION';
                $case->agreed_solution = $case->initial_solution ?: 'REPLACEMENT';
                $case->save();

                \App\Models\CaseResolution::updateOrCreate(
                    ['case_id' => $case->id],
                    [
                        'solution_code' => $case->agreed_solution,
                        'agreed_at' => now(),
                        'status' => 'NOT_STARTED',
                    ]
                );
            }

            $lastSeq = (int) $case->events()->max('sequence');
            CaseEvent::create([
                'case_id' => $case->id,
                'sequence' => $lastSeq + 1,
                'event_type' => 'RETURN_INSPECTION_COMPLETED',
                'from_state' => $case->getOriginal('main_status'),
                'to_state' => $case->main_status,
                'actor_kind' => 'MERCHANT',
                'actor_id' => $actorId,
                'reason' => "Pemeriksaan fisik barang selesai: Hasil {$outcome} (Disetujui {$quantityApproved} dari {$quantityInspected} unit).",
                'data_json' => [
                    'inspection_outcome' => $outcome,
                    'quantity_inspected' => $quantityInspected,
                    'quantity_approved' => $quantityApproved,
                    'is_sku_matched' => $isSkuMatched,
                    'is_issue_matched' => $isIssueMatched,
                ],
                'occurred_at' => now(),
            ]);

            return $case->load(['items', 'evidence', 'events', 'returnInstruction', 'returnShipment', 'returnReceipt', 'returnInspection', 'shippingExpenses']);
        });
    }
}
