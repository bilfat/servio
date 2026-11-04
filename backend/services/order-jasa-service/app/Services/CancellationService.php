<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\FinanceServiceClientInterface;
use App\Models\BookingActiveAssignment;
use App\Models\CancellationRecord;
use App\Models\OrderAuditLog;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderEvent;
use App\Models\ServicePaymentObligation;
use App\Support\AuthenticatedActor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CancellationService
{
    public function __construct(
        private readonly FinanceServiceClientInterface $financeClient,
    ) {}

    public function cancelOrder(AuthenticatedActor $actor, string $orderId, array $payload): CancellationRecord
    {
        return DB::transaction(function () use ($actor, $orderId, $payload) {
            /** @var ServiceOrder|null $order */
            $order = ServiceOrder::where('id', $orderId)->lockForUpdate()->first();

            if (!$order) {
                throw new HttpException(404, 'Pesanan jasa tidak ditemukan.');
            }

            if (!$actor->isAdmin() && $order->customer_id !== $actor->id) {
                throw new HttpException(403, 'Anda tidak memiliki hak akses untuk membatalkan pesanan ini.');
            }

            if (in_array($order->status, ['COMPLETED', 'CANCELLED'], true)) {
                throw new HttpException(422, "Pesanan sudah berstatus {$order->status} dan tidak dapat dibatalkan.");
            }

            $reasonCode = (string) ($payload['reason_code'] ?? 'CUSTOMER_REQUEST');
            $reasonText = $payload['reason_text'] ?? null;
            $statusAtCancel = $order->status;
            $now = now();

            // 1. Determine refund eligibility based on whether worker has departed (OTW)
            $preOtwStatuses = [
                'CREATED',
                'PENDING_DIAGNOSIS_PAYMENT',
                'PAID_WAITING_DISPATCH',
                'ASSIGNED_WAITING_WORKER',
                'WORKER_ACCEPTED',
            ];

            $isPreOtw = in_array($statusAtCancel, $preOtwStatuses, true);

            /** @var ServicePaymentObligation|null $diagnosisObligation */
            $diagnosisObligation = ServicePaymentObligation::where('order_id', $order->id)
                ->where('purpose', 'DIAGNOSIS')
                ->first();

            $diagnosisPaid = ($diagnosisObligation && $diagnosisObligation->state === 'PAID');
            $refundRef = null;

            if ($isPreOtw) {
                if ($diagnosisPaid && $diagnosisObligation->principal_idr > 0) {
                    $refundEligibility = 'FULL_REFUND';
                    // Trigger refund in Finance Service 06 to Customer S-Pay
                    if (method_exists($this->financeClient, 'processCancellationRefund')) {
                        $refundResult = $this->financeClient->processCancellationRefund(
                            orderId: $order->id,
                            amountIdr: (int) $diagnosisObligation->principal_idr,
                            customerId: $order->customer_id,
                            reason: $reasonCode
                        );
                        $refundRef = $refundResult['refund_id'] ?? null;
                    }
                } else {
                    $refundEligibility = 'NONE';
                }
            } else {
                // Post OTW: Worker departed or arrived, diagnosis fee is non-refundable
                $refundEligibility = 'NO_REFUND';
            }

            // 2. Release booking active assignment
            if ($order->booking) {
                BookingActiveAssignment::where('booking_id', $order->booking->id)->delete();
            }

            // 3. Transition order status
            $fromStatus = $order->status;
            $order->forceFill([
                'status' => 'CANCELLED',
                'phase' => 'TERMINAL',
                'cancel_reason_code' => $reasonCode,
                'cancelled_at' => $now,
                'version' => $order->version + 1,
            ])->save();

            // 4. Create CancellationRecord
            $cancellation = CancellationRecord::forceCreate([
                'id' => (string) Str::ulid(),
                'order_id' => $order->id,
                'cancelled_by_type' => $actor->role,
                'cancelled_by_id' => $actor->id,
                'reason_code' => $reasonCode,
                'reason_text' => $reasonText,
                'status_at_cancel' => $statusAtCancel,
                'diagnosis_fulfilled' => !$isPreOtw,
                'refund_eligibility_snapshot' => $refundEligibility,
                'refund_finance_ref' => $refundRef,
                'cancelled_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // 5. Timeline Event & Audit Log
            $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;
            \App\Support\DomainEventLogger::recordOrderEvent(
                orderId: $order->id,
                sequenceNo: $nextSeq,
                eventType: 'ORDER_CANCELLED',
                fromState: $fromStatus,
                toState: 'CANCELLED',
                actorId: $actor->id,
                actorType: $actor->role,
                metadata: [
                    'reason_code' => $reasonCode,
                    'status_at_cancel' => $statusAtCancel,
                    'refund_eligibility' => $refundEligibility,
                ]
            );

            \App\Support\DomainEventLogger::recordAuditLog(
                actor: "{$actor->role}:{$actor->id}",
                action: 'CANCEL_ORDER',
                resource: "ServiceOrder:{$order->id}",
                reason: $reasonCode
            );

            return $cancellation;
        });
    }
}
