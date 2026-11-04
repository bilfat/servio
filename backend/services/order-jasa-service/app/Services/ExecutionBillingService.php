<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\FinanceServiceClientInterface;
use App\Models\CustomerConsent;
use App\Models\DiagnosisVersion;
use App\Models\ServiceOrder;
use App\Models\ServicePartItem;
use App\Models\ServicePaymentAttempt;
use App\Models\ServicePaymentObligation;
use App\Models\ServiceWorkItem;
use App\Support\AuthenticatedActor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ExecutionBillingService
{
    public function __construct(
        private readonly FinanceServiceClientInterface $financeClient,
    ) {}

    public function generateExecutionBilling(ServiceOrder $order): ?ServicePaymentObligation
    {
        // FIX 05: Billing must strictly use the approved diagnosis version from customer consent
        /** @var CustomerConsent|null $approvedConsent */
        $approvedConsent = CustomerConsent::where('order_id', $order->id)
            ->where('decision', 'APPROVED')
            ->latest('created_at')
            ->first();

        if ($approvedConsent && $approvedConsent->diagnosis_version_id) {
            $diagnosis = DiagnosisVersion::where('id', $approvedConsent->diagnosis_version_id)
                ->where('order_id', $order->id)
                ->first();
        } else {
            /** @var DiagnosisVersion|null $diagnosis */
            $diagnosis = DiagnosisVersion::where('order_id', $order->id)
                ->where('status', 'SUBMITTED')
                ->latest('version_no')
                ->first();
        }

        if (!$diagnosis) {
            return null;
        }

        $workItemsSum = (int) ServiceWorkItem::where('diagnosis_version_id', $diagnosis->id)->sum('subtotal_idr');
        $partItemsSum = (int) ServicePartItem::where('diagnosis_version_id', $diagnosis->id)->sum('subtotal_idr');

        if (($workItemsSum + $partItemsSum) > 0) {
            $laborSubtotal = $workItemsSum;
            $partsSubtotal = $partItemsSum;
        } else {
            $laborSubtotal = (int) $diagnosis->work_subtotal_idr;
            $partsSubtotal = (int) $diagnosis->provider_part_subtotal_idr;
        }
        $totalExecutionIdr = $laborSubtotal + $partsSubtotal;

        $obligationId = (string) Str::ulid();
        $now = now();
        $dueAt = $now->copy()->addHours(6); // 6-hour payment window

        if ($totalExecutionIdr <= 0) {
            // Free / covered service
            return ServicePaymentObligation::forceCreate([
                'id' => $obligationId,
                'order_id' => $order->id,
                'purpose' => 'SERVICE_EXECUTION',
                'approved_diagnosis_version_id' => $diagnosis->id,
                'principal_idr' => 0,
                'currency' => 'IDR',
                'state' => 'NOT_REQUIRED',
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // Call Finance Service 06 to create single execution invoice
        $financeResult = $this->financeClient->createPaymentIntent(
            orderId: $order->id,
            obligationId: $obligationId,
            purpose: 'SERVICE_EXECUTION',
            amountIdr: $totalExecutionIdr,
            customerId: $order->customer_id
        );

        $customerTotalIdr = (int) ($financeResult['customer_total_idr'] ?? $totalExecutionIdr);
        $customerAppFeeIdr = (int) ($financeResult['customer_app_fee_idr'] ?? 0);
        $allocations = $financeResult['allocations'] ?? [];
        $firstAlloc = $allocations[0] ?? [];
        $providerCommissionIdr = (int) ($firstAlloc['merchant_commission_idr'] ?? 0);
        $providerNetEntitlementIdr = (int) ($firstAlloc['merchant_net_entitlement_idr'] ?? max(0, $totalExecutionIdr - $providerCommissionIdr));
        $policyVersions = $financeResult['policy_versions'] ?? [];

        $feeSnapshot = [
            'purpose' => 'SERVICE_EXECUTION',
            'labor_subtotal_idr' => $laborSubtotal,
            'provider_part_subtotal_idr' => $partsSubtotal,
            'execution_subtotal_idr' => $totalExecutionIdr,
            'customer_platform_fee_idr' => $customerAppFeeIdr,
            'customer_total_idr' => $customerTotalIdr,
            'provider_commission_idr' => $providerCommissionIdr,
            'provider_net_entitlement_idr' => $providerNetEntitlementIdr,
            'policy_name' => $policyVersions['customer_app_fee_policy_name'] ?? $policyVersions['provider_commission_policy_name'] ?? 'Kebijakan Layanan & Komisi Servis Jasa 2026',
            'policy_version' => $policyVersions['customer_app_fee_version'] ?? $policyVersions['merchant_commission_version'] ?? 1,
            'policy_snapshot' => $policyVersions,
        ];

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => $obligationId,
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'approved_diagnosis_version_id' => $diagnosis->id,
            'principal_idr' => $customerTotalIdr,
            'currency' => 'IDR',
            'fee_snapshot' => $feeSnapshot,
            'state' => 'INVOICE_PENDING',
            'finance_obligation_ref' => $financeResult['invoice_no'],
            'active_finance_payment_id' => $financeResult['payment_intent_id'],
            'payment_due_at' => $dueAt,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligationId,
            'attempt_no' => 1,
            'finance_payment_id' => $financeResult['payment_intent_id'],
            'finance_invoice_ref' => $financeResult['invoice_no'],
            'method' => 'MOCK',
            'reported_status' => 'PENDING',
            'amount_due_idr' => $customerTotalIdr,
            'issued_at' => $now,
            'expires_at' => $dueAt,
            'is_current' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $obligation;
    }

    /**
     * Customer requests a retry / replacement invoice for an overdue or expired execution payment.
     * Uses the exact SAME obligation, creates a NEW attempt, maintains 6-hour SLA window.
     */
    public function retryExecutionPayment(AuthenticatedActor $actor, string $orderId): array
    {
        $alreadyPaid = false;
        $alreadyPaidMessage = 'Pembayaran sebelumnya sudah berhasil diverifikasi lunas oleh sistem keuangan.';
        $existingAttemptResponse = null;
        $newAttemptResult = null;

        DB::transaction(function () use ($actor, $orderId, &$alreadyPaid, &$alreadyPaidMessage, &$existingAttemptResponse, &$newAttemptResult) {
            /** @var ServiceOrder|null $order */
            $order = ServiceOrder::where('id', $orderId)->lockForUpdate()->first();

            if (!$order) {
                throw new HttpException(404, 'Pesanan jasa tidak ditemukan.');
            }

            // Authorization: only the customer owner or admin can request retry
            if (!$actor->isAdmin() && $order->customer_id !== $actor->id) {
                throw new HttpException(403, 'Anda tidak berwenang meminta tagihan pengganti untuk pesanan ini.');
            }

            // Cannot retry payment for terminal orders
            if ($order->status === 'COMPLETED') {
                throw new HttpException(409, 'Pesanan sudah berstatus selesai (COMPLETED). Tidak diperlukan pembayaran.');
            }
            if ($order->status === 'CANCELLED') {
                throw new HttpException(422, 'Pesanan yang telah dibatalkan tidak dapat diproses pembayarannya.');
            }

            /** @var ServicePaymentObligation|null $obligation */
            $obligation = ServicePaymentObligation::where('order_id', $order->id)
                ->where('purpose', 'SERVICE_EXECUTION')
                ->lockForUpdate()
                ->first();

            if (!$obligation) {
                throw new HttpException(404, 'Tagihan pengerjaan belum diterbitkan untuk pesanan ini.');
            }

            // If already PAID, set flag so transaction commits and 409 is thrown after
            if ($obligation->state === 'PAID') {
                $alreadyPaid = true;
                $alreadyPaidMessage = 'Tagihan pengerjaan sudah lunas. Tidak diperlukan tagihan pengganti.';
                return;
            }

            if ($obligation->state === 'NOT_REQUIRED') {
                throw new HttpException(422, 'Layanan ini tidak memerlukan pembayaran (Rp0).');
            }

            // Check if any attempt is already PAID (prevent race condition)
            $alreadyPaidAttempt = $obligation->attempts()
                ->where('reported_status', 'PAID')
                ->lockForUpdate()
                ->first();

            if ($alreadyPaidAttempt) {
                $obligation->forceFill([
                    'state' => 'PAID',
                    'active_finance_payment_id' => $alreadyPaidAttempt->finance_payment_id,
                    'paid_at' => $alreadyPaidAttempt->updated_at ?? now(),
                ])->save();

                $alreadyPaid = true;
                $alreadyPaidMessage = 'Pembayaran sebelumnya sudah berhasil tercatat sebagai lunas.';
                return;
            }

            $now = now();
            $dueAt = $now->copy()->addHours(6); // 6-hour payment window for replacement invoice

            // Task 1: Check if the current attempt is still valid and active
            /** @var ServicePaymentAttempt|null $currentAttempt */
            $currentAttempt = $obligation->attempts()
                ->where('is_current', true)
                ->lockForUpdate()
                ->latest('attempt_no')
                ->first();

            if ($currentAttempt) {
                // Query Finance 06 for remote status
                $financeStatus = $this->financeClient->getPaymentIntent($currentAttempt->finance_payment_id);

                // FIX 02: Finance unavailable must fail closed! Local expiry is NOT proof of remote expiry.
                if ($financeStatus === null) {
                    throw new HttpException(503, 'Sistem keuangan (Finance 06) sedang tidak dapat dihubungi untuk memverifikasi status pembayaran. Silakan coba beberapa saat lagi.');
                }

                $remoteStatus = strtoupper(trim((string) ($financeStatus['status'] ?? '')));

                // V4.1 Task 1: Empty, UNKNOWN, or unrecognized status MUST FAIL CLOSED!
                $recognizedStatuses = ['PAID', 'PENDING', 'EXPIRED', 'CANCELLED', 'FAILED', 'VOIDED'];
                if (empty($remoteStatus) || $remoteStatus === 'UNKNOWN' || !in_array($remoteStatus, $recognizedStatuses, true)) {
                    throw new HttpException(503, "Status pembayaran dari sistem keuangan tidak valid atau tidak dikenali ('{$remoteStatus}'). Pembuatan tagihan baru ditunda untuk mencegah penagihan ganda.");
                }

                // FIX 06: If remote reports PAID, persist PAID state and commit before 409
                if ($remoteStatus === 'PAID') {
                    $currentAttempt->forceFill([
                        'reported_status' => 'PAID',
                        'status_last_verified_at' => $now,
                    ])->save();

                    $obligation->forceFill([
                        'state' => 'PAID',
                        'active_finance_payment_id' => $currentAttempt->finance_payment_id,
                        'paid_at' => $now,
                    ])->save();

                    $alreadyPaid = true;
                    $alreadyPaidMessage = 'Pembayaran sebelumnya sudah berhasil diverifikasi lunas oleh sistem keuangan.';
                    return;
                }

                $isLocallyExpired = $currentAttempt->expires_at && $now->gte($currentAttempt->expires_at);
                $isRemotelyExpired = in_array($remoteStatus, ['EXPIRED', 'FAILED', 'CANCELLED', 'VOIDED'], true);

                // FIX 01: If previous bill is STILL VALID AND ACTIVE (not expired, reported_status is PENDING)
                if (!$isLocallyExpired && !$isRemotelyExpired && $currentAttempt->reported_status === 'PENDING') {
                    $attNo = $currentAttempt->attempt_no;
                    $attSuffix = $attNo > 1 ? "-att{$attNo}" : "";
                    $existingAttemptResponse = [
                        'order_id' => $order->id,
                        'payment_obligation_id' => $obligation->id,
                        'payment_attempt_id' => $currentAttempt->id,
                        'attempt_no' => $attNo,
                        'payment_status' => 'PENDING',
                        'amount_idr' => (int) $currentAttempt->amount_due_idr,
                        'amount_due_idr' => (int) $currentAttempt->amount_due_idr,
                        'expires_at' => $currentAttempt->expires_at?->toISOString() ?? $currentAttempt->expires_at?->toIso8601String(),
                        'invoice_no' => $currentAttempt->finance_invoice_ref,
                        'checkout_url' => "https://pay.servio.id/checkouts/CHK-JSA-{$order->id}-service_execution{$attSuffix}",
                        'is_overdue' => false,
                        'message' => 'Tagihan pembayaran masih aktif dan valid.',
                    ];
                    return;
                }

                // FIX 01: If pending on Finance 06, void must be confirmed before replacement
                if ($remoteStatus === 'PENDING') {
                    $voidSuccess = $this->financeClient->voidPaymentIntent($currentAttempt->finance_payment_id);
                    if (!$voidSuccess) {
                        throw new HttpException(503, 'Gagal membatalkan tagihan sebelumnya pada modul keuangan (Finance 06). Pembuatan tagihan pengganti ditunda untuk mencegah tagihan ganda.');
                    }
                }
            }

            // Deactivate all previous attempts (set is_current = false, and EXPIRED if still PENDING)
            $previousAttempts = $obligation->attempts()
                ->where('is_current', true)
                ->lockForUpdate()
                ->get();

            foreach ($previousAttempts as $prev) {
                $updateData = ['is_current' => false];
                if ($prev->reported_status === 'PENDING') {
                    $updateData['reported_status'] = 'EXPIRED';
                }
                $prev->forceFill($updateData)->save();
            }

            $lastAttemptNo = (int) ($obligation->attempts()->max('attempt_no') ?? 0);
            $nextAttemptNo = $lastAttemptNo + 1;

            // Generate new Payment Intent from Finance 06 with distinct attempt identity!
            $execSubtotalInput = (int) ($obligation->fee_snapshot['execution_subtotal_idr'] ?? $obligation->principal_idr);
            $financeResult = $this->financeClient->createPaymentIntent(
                orderId: $order->id,
                obligationId: $obligation->id,
                purpose: 'SERVICE_EXECUTION',
                amountIdr: $execSubtotalInput,
                customerId: $order->customer_id,
                attemptNo: $nextAttemptNo
            );

            $customerTotalIdr = (int) ($financeResult['customer_total_idr'] ?? $obligation->principal_idr);
            $customerAppFeeIdr = (int) ($financeResult['customer_app_fee_idr'] ?? ($obligation->fee_snapshot['customer_platform_fee_idr'] ?? 0));
            $allocations = $financeResult['allocations'] ?? [];
            $firstAlloc = $allocations[0] ?? [];
            $providerCommissionIdr = (int) ($firstAlloc['merchant_commission_idr'] ?? ($obligation->fee_snapshot['provider_commission_idr'] ?? 0));
            $execSubtotal = (int) ($obligation->fee_snapshot['execution_subtotal_idr'] ?? max(0, $customerTotalIdr - $customerAppFeeIdr));
            $providerNetEntitlementIdr = (int) ($firstAlloc['merchant_net_entitlement_idr'] ?? max(0, $execSubtotal - $providerCommissionIdr));
            $policyVersions = $financeResult['policy_versions'] ?? ($obligation->fee_snapshot['policy_snapshot'] ?? []);

            $updatedFeeSnapshot = array_merge($obligation->fee_snapshot ?? [], [
                'customer_platform_fee_idr' => $customerAppFeeIdr,
                'customer_total_idr' => $customerTotalIdr,
                'provider_commission_idr' => $providerCommissionIdr,
                'provider_net_entitlement_idr' => $providerNetEntitlementIdr,
                'policy_snapshot' => $policyVersions,
            ]);

            // Create new ServicePaymentAttempt
            $newAttempt = ServicePaymentAttempt::forceCreate([
                'id' => (string) Str::ulid(),
                'obligation_id' => $obligation->id,
                'attempt_no' => $nextAttemptNo,
                'finance_payment_id' => $financeResult['payment_intent_id'],
                'finance_invoice_ref' => $financeResult['invoice_no'],
                'method' => 'MOCK',
                'reported_status' => 'PENDING',
                'amount_due_idr' => $customerTotalIdr,
                'issued_at' => $now,
                'expires_at' => $dueAt,
                'is_current' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Update obligation with active payment details and reset state to INVOICE_PENDING
            $obligation->forceFill([
                'principal_idr' => $customerTotalIdr,
                'fee_snapshot' => $updatedFeeSnapshot,
                'state' => 'INVOICE_PENDING',
                'finance_obligation_ref' => $financeResult['invoice_no'],
                'active_finance_payment_id' => $financeResult['payment_intent_id'],
                'payment_due_at' => $dueAt,
                'version' => $obligation->version + 1,
                'updated_at' => $now,
            ])->save();

            // Log domain event & audit log
            $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;
            \App\Support\DomainEventLogger::recordOrderEvent(
                orderId: $order->id,
                sequenceNo: $nextSeq,
                eventType: 'PAYMENT_RETRY_INVOICE_GENERATED',
                fromState: $order->status,
                toState: $order->status,
                actorId: $actor->id,
                actorType: $actor->role,
                metadata: [
                    'attempt_no' => $nextAttemptNo,
                    'finance_payment_id' => $financeResult['payment_intent_id'],
                    'invoice_no' => $financeResult['invoice_no'],
                    'expires_at' => $dueAt->toIso8601String(),
                    'amount_idr' => $obligation->principal_idr,
                ]
            );

            \App\Support\DomainEventLogger::recordAuditLog(
                actor: "{$actor->role}:{$actor->id}",
                action: 'PAYMENT_RETRY_INVOICE_GENERATED',
                resource: "ServiceOrder:{$order->id}",
                reason: "Customer membuat tagihan pengganti attempt #{$nextAttemptNo} untuk pembayaran pengerjaan."
            );

            $newAttemptResult = [
                'order_id' => $order->id,
                'payment_obligation_id' => $obligation->id,
                'payment_attempt_id' => $newAttempt->id,
                'attempt_no' => $newAttempt->attempt_no,
                'payment_status' => 'PENDING',
                'amount_idr' => (int) $obligation->principal_idr,
                'amount_due_idr' => (int) $obligation->principal_idr,
                'expires_at' => $dueAt->toISOString(),
                'invoice_no' => $financeResult['invoice_no'],
                'checkout_url' => $financeResult['checkout_url'],
                'is_overdue' => false,
                'message' => 'Tagihan pengganti pembayaran pengerjaan berhasil diterbitkan (SLA 6 jam).',
            ];
        });

        // If marked as alreadyPaid, the transaction has safely committed the PAID state!
        if ($alreadyPaid) {
            throw new HttpException(409, $alreadyPaidMessage);
        }

        if ($existingAttemptResponse !== null) {
            return $existingAttemptResponse;
        }

        return $newAttemptResult;
    }
}

