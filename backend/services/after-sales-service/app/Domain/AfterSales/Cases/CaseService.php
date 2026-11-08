<?php

declare(strict_types=1);

namespace App\Domain\AfterSales\Cases;

use App\Domain\AfterSales\Contracts\OrderEligibilityVerifierInterface;
use App\Models\AfterSalesCase;
use App\Models\CaseEvent;
use App\Models\CaseEvidence;
use App\Models\CaseItem;
use App\Models\OrderWarrantyEntitlement;
use App\Models\OutboxEvent;
use App\Models\SolutionProposal;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class CaseService
{
    public function __construct(
        protected OrderEligibilityVerifierInterface $eligibilityVerifier
    ) {}

    public function submitCase(
        string $customerId,
        string $sourceOrderKind, // GOODS or SERVICE
        string $sourceOrderId,
        string $caseType, // GOODS_WARRANTY, SERVICE_WARRANTY, GOODS_RETURN
        string $initialSolution, // REPLACEMENT, REWORK, REFUND
        string $reasonCode,
        string $description,
        array $items = [], // array of ['order_item_id' => ..., 'quantity' => ..., 'catalog_snapshot' => ...]
        ?string $entitlementId = null,
        ?string $sourceMerchantOrderId = null,
        ?string $ownerOrgId = null,
        ?string $ownerOrgType = null,
        array $evidenceData = [] // array of ['media_ref' => ..., 'content_type' => ..., 'size_bytes' => ...]
    ): AfterSalesCase {
        $sourceOrderKind = strtoupper($sourceOrderKind);
        $caseType = strtoupper($caseType);
        $initialSolution = strtoupper($initialSolution);

        // 1. Strict Business Validation Matrix (Amendemen V2.2)
        if ($caseType === 'GOODS_WARRANTY') {
            if (!in_array($initialSolution, ['REPLACEMENT', 'REFUND'], true)) {
                throw new InvalidArgumentException("Klaim garansi barang hanya dapat memilih solusi awal 'REPLACEMENT' atau 'REFUND'.");
            }
            if ($sourceOrderKind !== 'GOODS') {
                throw new InvalidArgumentException("GOODS_WARRANTY harus berasal dari pesanan GOODS.");
            }
        } elseif ($caseType === 'GOODS_RETURN') {
            if (!in_array($initialSolution, ['REPLACEMENT', 'REFUND'], true)) {
                throw new InvalidArgumentException("Retur barang hanya dapat memilih solusi awal 'REPLACEMENT' atau 'REFUND'.");
            }
            if ($sourceOrderKind !== 'GOODS') {
                throw new InvalidArgumentException("GOODS_RETURN harus berasal dari pesanan GOODS.");
            }
        } elseif ($caseType === 'SERVICE_WARRANTY') {
            if (!in_array($initialSolution, ['REWORK', 'REFUND'], true)) {
                throw new InvalidArgumentException("Klaim garansi jasa hanya dapat memilih solusi awal 'REWORK' atau 'REFUND'.");
            }
            if ($sourceOrderKind !== 'SERVICE') {
                throw new InvalidArgumentException("SERVICE_WARRANTY harus berasal dari pesanan SERVICE.");
            }
        } else {
            throw new InvalidArgumentException("Tipe kasus '{$caseType}' tidak dikenal.");
        }

        // 2. Authoritative Order Verification via Service 05A/05B
        $eligibility = $this->eligibilityVerifier->verifyOrderEligibility(
            customerId: $customerId,
            orderKind: $sourceOrderKind,
            orderId: $sourceOrderId,
            subOrderId: $sourceMerchantOrderId
        );

        if (!$eligibility->isValid) {
            throw new InvalidArgumentException($eligibility->errorMessage ?? "Verifikasi pesanan gagal.");
        }

        if (!$eligibility->isEligibleForAfterSales) {
            throw new InvalidArgumentException("Status pesanan '{$eligibility->orderStatus}' belum memenuhi syarat untuk pengajuan layanan purnajual.");
        }

        $orderStatus = strtoupper($eligibility->orderStatus);
        if ($caseType === 'GOODS_RETURN' && !in_array($orderStatus, ['DELIVERED', 'RECEIVED', 'COMPLETED'], true)) {
            throw new InvalidArgumentException("Pengembalian barang hanya dapat diajukan setelah barang diterima (Status DELIVERED / COMPLETED). Status saat ini: {$orderStatus}.");
        }
        if ($caseType === 'GOODS_WARRANTY' && !in_array($orderStatus, ['DELIVERED', 'COMPLETED'], true)) {
            throw new InvalidArgumentException("Klaim garansi barang hanya dapat diajukan untuk pesanan berstatus DELIVERED / COMPLETED. Status saat ini: {$orderStatus}.");
        }
        if ($caseType === 'SERVICE_WARRANTY' && !in_array($orderStatus, ['WORK_COMPLETED', 'COMPLETED'], true)) {
            throw new InvalidArgumentException("Klaim garansi jasa hanya dapat diajukan setelah pekerjaan selesai (Status WORK_COMPLETED / COMPLETED). Status saat ini: {$orderStatus}.");
        }

        // Authoritative source of truth for business owner
        $authoritativeOrgId = $eligibility->ownerOrgId;
        $authoritativeOrgType = $eligibility->ownerOrgType;

        // 3. Validate Warranty Entitlement if claim
        $entitlement = null;
        if (in_array($caseType, ['GOODS_WARRANTY', 'SERVICE_WARRANTY'], true)) {
            if (!$entitlementId) {
                $entitlement = OrderWarrantyEntitlement::where('source_kind', $sourceOrderKind)
                    ->where('order_id', $sourceOrderId)
                    ->where('customer_id', $customerId)
                    ->first();
                if (!$entitlement) {
                    throw new InvalidArgumentException("Klaim garansi memerlukan hak garansi yang sah (entitlement tidak ditemukan).");
                }
                $entitlementId = $entitlement->id;
            } else {
                $entitlement = OrderWarrantyEntitlement::where('id', $entitlementId)
                    ->where('customer_id', $customerId)
                    ->first();
                if (!$entitlement) {
                    throw new InvalidArgumentException("Hak garansi (entitlement) tidak valid untuk akun pelanggan ini.");
                }
            }

            // Cross-order validation: Entitlement MUST belong to this exact order
            if ($entitlement->order_id !== $sourceOrderId) {
                throw new InvalidArgumentException("Hak garansi ini terikat pada pesanan '{$entitlement->order_id}', bukan pesanan yang diajukan '{$sourceOrderId}' (CROSS_ORDER_WARRANTY_CLAIM_FORBIDDEN).");
            }

            // Cross-kind validation
            if ($entitlement->source_kind !== $sourceOrderKind) {
                throw new InvalidArgumentException("Hak garansi jenis '{$entitlement->source_kind}' tidak dapat digunakan untuk pesanan jenis '{$sourceOrderKind}'.");
            }

            // Cross-suborder validation
            if ($sourceMerchantOrderId && $entitlement->merchant_order_id && $entitlement->merchant_order_id !== $sourceMerchantOrderId) {
                throw new InvalidArgumentException("Hak garansi ini terikat pada suborder lain ({$entitlement->merchant_order_id}).");
            }

            // Cross-org validation: Entitlement owner MUST match authoritative order owner
            if ($entitlement->owner_org_id && $entitlement->owner_org_id !== $authoritativeOrgId) {
                throw new InvalidArgumentException("Hak garansi ini dimiliki oleh organisasi '{$entitlement->owner_org_id}', bukan penyedia sah pesanan '{$authoritativeOrgId}' (CROSS_ORG_WARRANTY_FORBIDDEN).");
            }

            if ($entitlement->status !== 'ACTIVE') {
                throw new InvalidArgumentException("Hak garansi ini berstatus '{$entitlement->status}' dan tidak dapat digunakan untuk klaim.");
            }

            if ($entitlement->remaining_quantity <= 0) {
                throw new InvalidArgumentException("Hak garansi ini sudah digunakan sepenuhnya ({$entitlement->claimed_quantity} dari {$entitlement->quantity} unit telah diajukan klaim).");
            }

            if ($entitlement->expires_at && now()->isAfter($entitlement->expires_at)) {
                throw new InvalidArgumentException("Masa berlaku garansi telah berakhir pada {$entitlement->expires_at->toIso8601String()}. Klaim baru ditolak.");
            }

            if ($entitlement->starts_at && now()->isBefore($entitlement->starts_at)) {
                throw new InvalidArgumentException("Masa berlaku garansi belum dimulai.");
            }
        }

        // 4. Verify and compute item quantities against verified order items
        $verifiedItems = [];
        $orderItemsLookup = [];
        foreach ($eligibility->items as $eItem) {
            $orderItemsLookup[(string) $eItem['item_id']] = $eItem;
            $orderItemsLookup[(string) $eItem['source_ref']] = $eItem;
            if (isset($eItem['catalog_snapshot']['product_id'])) {
                $orderItemsLookup[(string) $eItem['catalog_snapshot']['product_id']] = $eItem;
            }
            if (isset($eItem['catalog_snapshot']['service_id'])) {
                $orderItemsLookup[(string) $eItem['catalog_snapshot']['service_id']] = $eItem;
            }
            if (isset($eItem['catalog_snapshot']['service_offering_id'])) {
                $orderItemsLookup[(string) $eItem['catalog_snapshot']['service_offering_id']] = $eItem;
            }
        }

        if (empty($items)) {
            // Default to first eligible item from authoritative order
            $itemsList = $eligibility->items;
            $firstItem = !empty($itemsList) ? $itemsList[array_key_first($itemsList)] : null;
            if (!$firstItem) {
                throw new InvalidArgumentException("Tidak ada item pesanan yang valid untuk diajukan.");
            }
            if ($firstItem['remaining_quantity'] <= 0) {
                throw new InvalidArgumentException("Item pesanan ini sudah pernah diklaim atau diretur seluruhnya.");
            }

            // Cross-item entitlement validation
            $firstProductId = $firstItem['catalog_snapshot']['product_id'] ?? null;
            $firstServiceId = $firstItem['catalog_snapshot']['service_id'] ?? null;
            $isItemMatch = (
                !$entitlement ||
                !$entitlement->order_item_key ||
                $entitlement->order_item_key === (string) $firstItem['item_id'] ||
                $entitlement->order_item_key === (string) $firstItem['source_ref'] ||
                ($firstProductId && $entitlement->order_item_key === (string) $firstProductId) ||
                ($firstServiceId && $entitlement->order_item_key === (string) $firstServiceId) ||
                ($entitlement->catalog_ref && in_array($entitlement->catalog_ref, [(string) $firstItem['item_id'], (string) $firstProductId, (string) $firstServiceId], true))
            );
            if ($entitlement && !$isItemMatch) {
                throw new InvalidArgumentException("Hak garansi ini terikat pada item '{$entitlement->order_item_key}', bukan item pesanan yang diajukan (CROSS_ITEM_WARRANTY_FORBIDDEN).");
            }

            $verifiedItems[] = [
                'source_item_ref' => (string) $firstItem['item_id'],
                'catalog_snapshot' => $firstItem['catalog_snapshot'] ?? null,
                'quantity' => 1,
            ];
        } else {
            $seenItemsInPayload = [];
            $cumulativePerItem = [];

            // First pass: detect duplicate items in payload and calculate cumulative requested quantities
            foreach ($items as $item) {
                $reqItemRef = trim((string) ($item['order_item_id'] ?? ''));
                if (empty($reqItemRef)) {
                    throw new InvalidArgumentException("ID item pesanan tidak boleh kosong.");
                }

                if (isset($seenItemsInPayload[$reqItemRef])) {
                    throw new InvalidArgumentException("Item pesanan '{$reqItemRef}' tidak boleh diduplikasi dalam satu pengajuan (DUPLICATE_ORDER_ITEM).");
                }
                $seenItemsInPayload[$reqItemRef] = true;

                $reqQty = (int) ($item['quantity'] ?? 1);
                if ($reqQty <= 0) {
                    throw new InvalidArgumentException("Kuantitas item yang diajukan harus minimal 1.");
                }

                $cumulativePerItem[$reqItemRef] = ($cumulativePerItem[$reqItemRef] ?? 0) + $reqQty;
            }

            // Second pass: validate against authoritative order items and remaining claimable limits
            foreach ($items as $item) {
                $reqItemRef = trim((string) ($item['order_item_id'] ?? ''));
                $totalReqQty = $cumulativePerItem[$reqItemRef];

                if (empty($orderItemsLookup) || !isset($orderItemsLookup[$reqItemRef])) {
                    throw new InvalidArgumentException("Item '{$reqItemRef}' tidak ditemukan dalam pesanan sah.");
                }

                $matched = $orderItemsLookup[$reqItemRef];

                // Cross-item entitlement validation
                $matchedProductId = $matched['catalog_snapshot']['product_id'] ?? null;
                $matchedServiceId = $matched['catalog_snapshot']['service_id'] ?? null;
                $isMatched = (
                    !$entitlement ||
                    !$entitlement->order_item_key ||
                    $entitlement->order_item_key === $reqItemRef ||
                    $entitlement->order_item_key === (string) ($matched['item_id'] ?? '') ||
                    $entitlement->order_item_key === (string) ($matched['source_ref'] ?? '') ||
                    ($matchedProductId && $entitlement->order_item_key === (string) $matchedProductId) ||
                    ($matchedServiceId && $entitlement->order_item_key === (string) $matchedServiceId) ||
                    ($entitlement->catalog_ref && in_array($entitlement->catalog_ref, [$reqItemRef, (string) ($matched['item_id'] ?? ''), (string) $matchedProductId, (string) $matchedServiceId], true))
                );
                if ($entitlement && !$isMatched) {
                    throw new InvalidArgumentException("Hak garansi ini terikat pada item '{$entitlement->order_item_key}', bukan item '{$reqItemRef}' (CROSS_ITEM_WARRANTY_FORBIDDEN).");
                }

                if ($totalReqQty > $matched['remaining_quantity']) {
                    throw new InvalidArgumentException(
                        "Jumlah item yang diajukan ({$totalReqQty}) melebihi sisa kuantitas yang sah ({$matched['remaining_quantity']})."
                    );
                }

                $verifiedItems[] = [
                    'source_item_ref' => $reqItemRef,
                    'catalog_snapshot' => $matched['catalog_snapshot'] ?? ($item['catalog_snapshot'] ?? null),
                    'quantity' => $totalReqQty,
                ];
            }
        }

        return DB::transaction(function () use (
            $customerId,
            $sourceOrderKind,
            $sourceOrderId,
            $caseType,
            $initialSolution,
            $reasonCode,
            $description,
            $verifiedItems,
            $entitlementId,
            $sourceMerchantOrderId,
            $authoritativeOrgId,
            $authoritativeOrgType,
            $evidenceData,
            $orderItemsLookup,
            $eligibility
        ) {
            $normalizedSubOrderId = $sourceMerchantOrderId ? trim($sourceMerchantOrderId) : '';

            // Validate parent-suborder integrity
            if ($sourceMerchantOrderId && $eligibility->subOrderId && $eligibility->subOrderId !== $sourceMerchantOrderId) {
                throw new InvalidArgumentException("Suborder '{$sourceMerchantOrderId}' bukan bagian sah dari pesanan induk '{$sourceOrderId}'.");
            }

            // Atomic reservation & pessimistic row locks on order item allocations
            $acquiredLocks = [];
            foreach ($verifiedItems as $vItem) {
                $itemRef = $vItem['source_item_ref'];
                $originalTotal = (int) ($orderItemsLookup[$itemRef]['quantity'] ?? 1);

                \App\Models\OrderItemClaimLock::firstOrCreate(
                    [
                        'source_order_id' => $sourceOrderId,
                        'source_merchant_order_id' => $normalizedSubOrderId,
                        'source_item_ref' => $itemRef,
                    ],
                    [
                        'total_ordered_quantity' => $originalTotal,
                        'total_claimed_quantity' => 0,
                    ]
                );

                /** @var \App\Models\OrderItemClaimLock $claimLock */
                $claimLock = \App\Models\OrderItemClaimLock::where('source_order_id', $sourceOrderId)
                    ->where('source_merchant_order_id', $normalizedSubOrderId)
                    ->where('source_item_ref', $itemRef)
                    ->lockForUpdate()
                    ->first();

                // Calculate all cumulative active claimed quantities
                $alreadyClaimed = (int) CaseItem::whereHas('afterSalesCase', function ($q) use ($sourceOrderId, $normalizedSubOrderId) {
                    $q->where('source_order_id', $sourceOrderId)
                        ->whereNotIn('main_status', ['REJECTED', 'CANCELLED']);
                    if ($normalizedSubOrderId !== '') {
                        $q->where('source_merchant_order_id', $normalizedSubOrderId);
                    }
                })->where('source_item_ref', $itemRef)->sum('quantity_requested');

                $remainingAllowed = $claimLock->total_ordered_quantity - $alreadyClaimed;
                if ($vItem['quantity'] > $remainingAllowed) {
                    throw new InvalidArgumentException("Kuantitas pengajuan untuk item '{$itemRef}' ({$vItem['quantity']}) melebihi sisa kuantitas pesanan yang dapat diklaim ({$remainingAllowed}).");
                }

                $acquiredLocks[] = ['lock' => $claimLock, 'qty' => $vItem['quantity']];
            }

            $responseDueAt = now()->addHours(72);

            $case = AfterSalesCase::create([
                'case_type' => $caseType,
                'customer_id' => $customerId,
                'owner_org_id' => $authoritativeOrgId,
                'owner_org_type' => $authoritativeOrgType,
                'source_order_kind' => $sourceOrderKind,
                'source_order_id' => $sourceOrderId,
                'source_merchant_order_id' => $sourceMerchantOrderId,
                'entitlement_id' => $entitlementId,
                'initial_solution' => $initialSolution,
                'reason_code' => $reasonCode,
                'description' => $description,
                'main_status' => 'SUBMITTED',
                'substate' => 'NONE',
                'response_due_at' => $responseDueAt,
                'response_state' => 'WAITING',
                'version' => 1,
            ]);

            // Save items
            foreach ($verifiedItems as $vItem) {
                CaseItem::create([
                    'case_id' => $case->id,
                    'source_item_ref' => $vItem['source_item_ref'],
                    'catalog_snapshot' => $vItem['catalog_snapshot'],
                    'quantity_requested' => $vItem['quantity'],
                    'quantity_allocated' => 0,
                    'is_service' => $sourceOrderKind === 'SERVICE',
                ]);
            }

            // Commit reservation on locks
            foreach ($acquiredLocks as $acq) {
                $acq['lock']->increment('total_claimed_quantity', $acq['qty']);
            }

            // Atomically lock claimed quantity and entitlement status
            if ($entitlementId) {
                /** @var OrderWarrantyEntitlement|null $entModel */
                $entModel = OrderWarrantyEntitlement::where('id', $entitlementId)->lockForUpdate()->first();
                if ($entModel) {
                    $totalClaimedInThisCase = collect($verifiedItems)->sum('quantity');
                    $entModel->increment('claimed_quantity', (int) $totalClaimedInThisCase);
                    if ($entModel->remaining_quantity <= 0) {
                        $entModel->update(['status' => 'CLAIM_LOCKED']);
                    }
                }
            }

            // Save evidence
            foreach ($evidenceData as $ev) {
                CaseEvidence::create([
                    'case_id' => $case->id,
                    'uploaded_by' => $customerId,
                    'media_ref' => $ev['media_ref'],
                    'content_type' => $ev['content_type'] ?? 'image/jpeg',
                    'size_bytes' => (int) ($ev['size_bytes'] ?? 0),
                    'sha256' => $ev['sha256'] ?? null,
                    'visibility' => 'CASE_PARTIES',
                ]);
            }

            // Record initial proposal
            SolutionProposal::create([
                'case_id' => $case->id,
                'proposal_version' => 1,
                'proposal_type' => 'CUSTOMER_CHOICE',
                'solution_code' => $initialSolution,
                'reason' => 'Pilihan awal konsumen pada formulir pengajuan.',
                'proposed_by_actor_kind' => 'CUSTOMER',
                'proposed_by_id' => $customerId,
                'state' => 'PENDING_CONSENT',
            ]);

            // Record initial event
            CaseEvent::create([
                'case_id' => $case->id,
                'sequence' => 1,
                'event_type' => 'CASE_SUBMITTED',
                'from_state' => null,
                'to_state' => 'SUBMITTED',
                'actor_kind' => 'CUSTOMER',
                'actor_id' => $customerId,
                'reason' => $description,
                'data_json' => [
                    'initial_solution' => $initialSolution,
                    'case_type' => $caseType,
                    'response_due_at' => $responseDueAt->toIso8601String(),
                ],
                'occurred_at' => now(),
            ]);

            // Dispatch outbox event
            OutboxEvent::create([
                'event_type' => 'after_sales.case.created.v1',
                'aggregate_type' => 'AFTER_SALES_CASE',
                'aggregate_id' => $case->id,
                'payload' => [
                    'case_id' => $case->id,
                    'case_number' => $case->case_number,
                    'customer_id' => $customerId,
                    'owner_org_id' => $authoritativeOrgId,
                    'case_type' => $caseType,
                    'initial_solution' => $initialSolution,
                    'response_due_at' => $responseDueAt->toIso8601String(),
                ],
            ]);

            return $case->load(['items', 'evidence', 'events', 'proposals']);
        });
    }

    public function listCustomerCases(
        string $customerId,
        ?string $type = null,
        ?string $status = null,
        int $perPage = 15
    ): LengthAwarePaginator {
        $query = AfterSalesCase::with(['items', 'resolution', 'latestProposal', 'returnInstruction', 'returnShipment', 'returnReceipt', 'returnInspection', 'externalRefs'])
            ->where('customer_id', $customerId);

        if ($type) {
            $query->where('case_type', strtoupper($type));
        }

        if ($status) {
            $statusUpper = strtoupper($status);
            if ($statusUpper === 'ACTIVE' || $statusUpper === 'BERJALAN') {
                $query->whereIn('main_status', ['SUBMITTED', 'UNDER_REVIEW', 'AWAITING_RETURN', 'IN_RESOLUTION']);
            } elseif ($statusUpper === 'COMPLETED' || $statusUpper === 'SELESAI') {
                $query->where('main_status', 'COMPLETED');
            } elseif ($statusUpper === 'REJECTED' || $statusUpper === 'DITOLAK') {
                $query->where('main_status', 'REJECTED');
            } elseif ($statusUpper === 'OVERDUE' || $statusUpper === 'TIDAK_DITANGGAPI') {
                $query->where('response_state', 'OVERDUE');
            } else {
                $query->where('main_status', $statusUpper);
            }
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function listBusinessCases(
        string $orgId,
        ?string $type = null,
        ?string $status = null,
        int $perPage = 15
    ): LengthAwarePaginator {
        $query = AfterSalesCase::with(['items', 'resolution', 'latestProposal', 'returnInstruction', 'returnShipment', 'returnReceipt', 'returnInspection', 'externalRefs'])
            ->where('owner_org_id', $orgId);

        if ($type) {
            $query->where('case_type', strtoupper($type));
        }

        if ($status) {
            $query->where('main_status', strtoupper($status));
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function getCaseDetail(string $caseId, ?string $actorUserId = null, ?string $actorOrgId = null): AfterSalesCase
    {
        $case = AfterSalesCase::with([
            'items',
            'evidence',
            'events',
            'proposals.consent',
            'resolution',
            'externalRefs',
            'entitlement',
            'returnInstruction',
            'returnShipment',
            'returnReceipt',
            'returnInspection',
            'shippingExpenses',
        ])->where('id', $caseId)->firstOrFail();

        // Anti-IDOR Authorization Check
        if ($actorUserId !== null && $actorOrgId === null) {
            // Customer read check
            if ($case->customer_id !== $actorUserId) {
                throw new RuntimeException("Akses ditolak: Anda bukan pemilik pengajuan kasus ini.");
            }
        } elseif ($actorOrgId !== null) {
            // Business read check
            if ($case->owner_org_id !== $actorOrgId) {
                throw new RuntimeException("Akses ditolak: Kasus ini bukan milik organisasi bisnis Anda.");
            }
        }

        return $case;
    }

    public function addEvidence(
        string $caseId,
        string $uploaderId,
        string $mediaRef,
        string $contentType,
        int $sizeBytes,
        ?string $sha256 = null,
        ?string $actorOrgId = null
    ): CaseEvidence {
        $case = AfterSalesCase::findOrFail($caseId);

        // Anti-IDOR Check: Actor must be either the case customer OR belonging to case owner organization
        $isCustomerOwner = ($uploaderId === $case->customer_id);
        $isBusinessOwner = ($actorOrgId !== null && $actorOrgId === $case->owner_org_id);

        if (!$isCustomerOwner && !$isBusinessOwner) {
            throw new RuntimeException("Akses ditolak: Anda tidak memiliki wewenang untuk menambahkan bukti pada kasus ini.");
        }

        // State Check: Cannot add evidence to closed/terminal cases
        if (in_array($case->main_status, ['COMPLETED', 'REJECTED', 'CANCELLED'], true)) {
            throw new InvalidArgumentException("Tidak dapat menambahkan bukti baru pada kasus yang sudah ditutup ({$case->main_status}).");
        }

        return DB::transaction(function () use ($case, $uploaderId, $mediaRef, $contentType, $sizeBytes, $sha256, $isCustomerOwner) {
            $evidence = CaseEvidence::create([
                'case_id' => $case->id,
                'uploaded_by' => $uploaderId,
                'media_ref' => $mediaRef,
                'content_type' => $contentType,
                'size_bytes' => $sizeBytes,
                'sha256' => $sha256,
                'visibility' => 'CASE_PARTIES',
            ]);

            $lastSeq = (int) $case->events()->max('sequence');
            CaseEvent::create([
                'case_id' => $case->id,
                'sequence' => $lastSeq + 1,
                'event_type' => 'EVIDENCE_ADDED',
                'from_state' => $case->main_status,
                'to_state' => $case->main_status,
                'actor_kind' => $isCustomerOwner ? 'CUSTOMER' : 'MERCHANT',
                'actor_id' => $uploaderId,
                'reason' => 'Lampiran bukti baru ditambahkan.',
                'data_json' => ['evidence_id' => $evidence->id],
                'occurred_at' => now(),
            ]);

            return $evidence;
        });
    }

    public function reportIssueToSupport(string $caseId, string $customerId, string $reason): AfterSalesCase
    {
        return DB::transaction(function () use ($caseId, $customerId, $reason) {
            /** @var AfterSalesCase $case */
            $case = AfterSalesCase::where('id', $caseId)
                ->where('customer_id', $customerId)
                ->lockForUpdate()
                ->firstOrFail();

            // Customers can dispute rejection or report no-response; only COMPLETED and CANCELLED cannot be reported
            if (in_array($case->main_status, ['COMPLETED', 'CANCELLED'], true)) {
                throw new InvalidArgumentException("Kasus dalam status {$case->main_status} tidak dapat diteruskan ke support.");
            }

            $case->reported_to_support_at = now();
            // Honest support status: No fake ticket strings like 'SPT-1234'
            $case->support_ticket_ref = 'PENDING_SUPPORT_INTEGRATION';
            $case->save();

            $lastSeq = (int) $case->events()->max('sequence');
            CaseEvent::create([
                'case_id' => $case->id,
                'sequence' => $lastSeq + 1,
                'event_type' => 'REPORTED_TO_SUPPORT',
                'from_state' => $case->main_status,
                'to_state' => $case->main_status,
                'actor_kind' => 'CUSTOMER',
                'actor_id' => $customerId,
                'reason' => $reason,
                'data_json' => [
                    'support_ticket_ref' => null,
                    'support_status' => 'PENDING_SUPPORT_INTEGRATION',
                    'reported_at' => now()->toIso8601String(),
                ],
                'occurred_at' => now(),
            ]);

            OutboxEvent::create([
                'event_type' => 'after_sales.case.reported_to_support.v1',
                'aggregate_type' => 'AFTER_SALES_CASE',
                'aggregate_id' => $case->id,
                'payload' => [
                    'case_id' => $case->id,
                    'case_number' => $case->case_number,
                    'support_ticket_ref' => null,
                    'support_status' => 'PENDING_SUPPORT_INTEGRATION',
                    'reason' => $reason,
                ],
            ]);

            return $case;
        });
    }
}
