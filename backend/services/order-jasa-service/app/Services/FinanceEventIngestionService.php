<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\IntegrationInboxEvent;
use App\Models\OrderAuditLog;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderEvent;
use App\Models\ServicePaymentAttempt;
use App\Models\ServicePaymentObligation;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class FinanceEventIngestionService
{
    private const ALLOWED_EVENT_TYPES = [
        'finance.payment.completed.v1',
        'finance.payment.confirmed.v1',
        'finance.payment.succeeded.v1',
        'finance.payment.failed.v1',
        'finance.payment.expired.v1',
        'finance.refund.succeeded.v1',
        'finance.refund.failed.v1',
    ];

    public function ingestFinanceEvent(array $payload): array
    {
        // 1. Strict event_id validation: MANDATORY, reject missing with HTTP 422
        $eventId = (string) ($payload['event_id'] ?? '');
        if (trim($eventId) === '') {
            throw new HttpException(422, 'Field event_id wajib disertakan dalam callback keuangan.');
        }

        // 2. Strict event_type validation against whitelist: reject unknown with HTTP 422
        $eventType = (string) ($payload['event_type'] ?? '');
        if (!in_array($eventType, self::ALLOWED_EVENT_TYPES, true)) {
            throw new HttpException(422, "Jenis event {$eventType} tidak didukung oleh webhook keuangan ini.");
        }

        // 3. Idempotent Inbox Deduplication: producer + source_event_id unique constraint
        $inboxId = (string) Str::ulid();
        $payloadHash = hash('sha256', (string) json_encode($payload));

        try {
            IntegrationInboxEvent::forceCreate([
                'id' => $inboxId,
                'producer' => 'finance-service',
                'source_event_id' => $eventId,
                'event_type' => $eventType,
                'schema_version' => 1,
                'payload_hash' => $payloadHash,
                'processing_status' => 'PENDING',
                'received_at' => now(),
            ]);
        } catch (QueryException $e) {
            // Duplicate event from producer (unique constraint 23000 / 1062) -> idempotent acknowledge
            if ($e->getCode() === '23000' || ($e->errorInfo[1] ?? 0) === 1062) {
                return [
                    'handled' => true,
                    'duplicate' => true,
                    'message' => 'Event already processed and deduplicated by inbox.',
                ];
            }
            throw $e;
        }

        $eventData = (array) ($payload['payload'] ?? $payload['data'] ?? $payload);
        $paymentId = (string) ($eventData['payment_id'] ?? $eventData['payment_intent_id'] ?? '');

        // 4. Process event under database lock
        return DB::transaction(function () use ($inboxId, $eventType, $eventData, $paymentId) {
            /** @var ServicePaymentAttempt|null $attempt */
            $attempt = null;
            if (!empty($paymentId)) {
                $attempt = ServicePaymentAttempt::where('finance_payment_id', $paymentId)->lockForUpdate()->first();
            }

            if (!$attempt) {
                // Check by provider_reference / finance_invoice_ref
                $invRef = (string) ($eventData['provider_reference'] ?? $eventData['invoice_ref'] ?? '');
                if (!empty($invRef)) {
                    $attempt = ServicePaymentAttempt::where('finance_invoice_ref', $invRef)->lockForUpdate()->first();
                }
            }

            if (!$attempt) {
                // Check by checkout_group_id / order_no
                $chkGroup = (string) ($eventData['checkout_group_id'] ?? '');
                $cleanNo = ltrim($chkGroup, '#');
                if (!empty($cleanNo)) {
                    $matchedOrder = ServiceOrder::where('order_no', $cleanNo)->orWhere('id', $cleanNo)->first();
                    if ($matchedOrder) {
                        $ob = $matchedOrder->paymentObligations()
                            ->where('state', '!=', 'PAID')
                            ->orderBy('created_at', 'asc')
                            ->first();
                        $attempt = $ob?->attempts()->where('is_current', true)->first() ?: $ob?->attempts()->latest()->first();
                    }
                }
            }

            // Strictly forbidden: NEVER create synthetic attempts or bind random obligations
            if (!$attempt) {
                IntegrationInboxEvent::where('id', $inboxId)->update(['processing_status' => 'IGNORED']);
                return [
                    'handled' => true,
                    'matched' => false,
                    'message' => 'Payment event acknowledged but no matching local order attempt found.',
                ];
            }

            /** @var ServicePaymentObligation $obligation */
            $obligation = ServicePaymentObligation::where('id', $attempt->obligation_id)->lockForUpdate()->firstOrFail();

            /** @var ServiceOrder $order */
            $order = ServiceOrder::where('id', $obligation->order_id)->lockForUpdate()->firstOrFail();

            // 5. Verification of amount and currency
            $reportedAmount = isset($eventData['amount_idr'])
                ? (int) $eventData['amount_idr']
                : (isset($eventData['amount']) ? (int) $eventData['amount'] : null);

            // In Finance 06, customer payable total may include customer app/platform fee (e.g. Rp 5.000),
            // while attempt amount_due_idr stores the principal order labor/parts cost.
            // Therefore, reportedAmount is valid if it equals or covers the full principal due amount.
            if ($reportedAmount !== null && $reportedAmount < (int) $attempt->amount_due_idr) {
                IntegrationInboxEvent::where('id', $inboxId)->update(['processing_status' => 'RECONCILIATION_REQUIRED']);
                throw new HttpException(422, "Nominal pembayaran tidak mencukupi (diharapkan minimal {$attempt->amount_due_idr}, diterima {$reportedAmount}).");
            }

            $reportedCurrency = (string) ($eventData['currency'] ?? 'IDR');
            if (strtoupper($reportedCurrency) !== 'IDR') {
                IntegrationInboxEvent::where('id', $inboxId)->update(['processing_status' => 'RECONCILIATION_REQUIRED']);
                throw new HttpException(422, "Mata uang pembayaran {$reportedCurrency} tidak didukung.");
            }

            $now = now();
            $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;

            $isPaidEvent = str_contains(strtolower($eventType), 'paid')
                || str_contains(strtolower($eventType), 'confirmed')
                || str_contains(strtolower($eventType), 'completed')
                || str_contains(strtolower($eventType), 'succeeded');

            // 5a. Deduplication check: if attempt is already PAID and obligation is already PAID
            if ($isPaidEvent && $attempt->reported_status === 'PAID' && $obligation->state === 'PAID') {
                IntegrationInboxEvent::where('id', $inboxId)->update([
                    'processing_status' => 'PROCESSED',
                    'processed_at' => $now,
                ]);

                return [
                    'handled' => true,
                    'matched' => true,
                    'duplicate' => true,
                    'order_id' => $order->id,
                    'order_status' => $order->status,
                    'obligation_purpose' => $obligation->purpose,
                    'obligation_state' => $obligation->state,
                    'message' => 'Callback pembayaran sudah pernah diproses sebelumnya. Tidak ada perubahan status ganda.',
                ];
            }

            // 5b. Task 3: Double payment detection across different attempts on the same obligation
            // MUST run unconditionally for all order states (including COMPLETED and CANCELLED)
            if ($isPaidEvent) {
                $isDoublePayment = ($obligation->state === 'PAID')
                    && ($obligation->active_finance_payment_id !== $attempt->finance_payment_id);

                if ($isDoublePayment) {
                    $attempt->forceFill([
                        'reported_status' => 'PAID',
                        'status_last_verified_at' => $now,
                    ])->save();

                    IntegrationInboxEvent::where('id', $inboxId)->update([
                        'processing_status' => 'RECONCILIATION_REQUIRED',
                        'processed_at' => $now,
                    ]);

                    \App\Support\DomainEventLogger::recordOrderEvent(
                        orderId: $order->id,
                        sequenceNo: $nextSeq,
                        eventType: 'DOUBLE_PAYMENT_DETECTED',
                        fromState: $order->status,
                        toState: $order->status,
                        actorId: 'FINANCE_SERVICE',
                        actorType: 'FINANCE',
                        metadata: [
                            'attempt_id' => $attempt->id,
                            'attempt_no' => $attempt->attempt_no,
                            'payment_id' => $attempt->finance_payment_id,
                            'primary_payment_id' => $obligation->active_finance_payment_id,
                            'amount_idr' => $attempt->amount_due_idr,
                            'action_needed' => 'RECONCILIATION_REQUIRED',
                        ]
                    );

                    \App\Support\DomainEventLogger::recordAuditLog(
                        actor: 'FINANCE_SERVICE',
                        action: 'DOUBLE_PAYMENT_DETECTED',
                        resource: "ServiceOrder:{$order->id}",
                        reason: "Pembayaran ganda diterima pada attempt {$attempt->id} (Payment ID: {$attempt->finance_payment_id}). Kewajiban sudah dibayar oleh {$obligation->active_finance_payment_id}."
                    );

                    return [
                        'handled' => true,
                        'matched' => true,
                        'duplicate' => false,
                        'double_payment' => true,
                        'reconciliation_required' => true,
                        'order_id' => $order->id,
                        'order_status' => $order->status,
                        'obligation_purpose' => $obligation->purpose,
                        'obligation_state' => $obligation->state,
                        'message' => 'Pembayaran ganda terdeteksi lintas attempt. Ditandai untuk rekonsiliasi keuangan.',
                    ];
                }
            }

            // 6. Terminal order check: NEVER reactivate a CANCELLED order!
            if ($order->status === 'CANCELLED') {
                IntegrationInboxEvent::where('id', $inboxId)->update([
                    'processing_status' => 'PROCESSED',
                    'processed_at' => $now,
                ]);

                \App\Support\DomainEventLogger::recordOrderEvent(
                    orderId: $order->id,
                    sequenceNo: $nextSeq,
                    eventType: 'LATE_PAYMENT_ON_CANCELLED_ORDER',
                    fromState: 'CANCELLED',
                    toState: 'CANCELLED',
                    actorId: 'FINANCE_SERVICE',
                    actorType: 'FINANCE',
                    metadata: [
                        'payment_id' => $attempt->finance_payment_id,
                        'amount_idr' => $attempt->amount_due_idr,
                        'action_needed' => 'AUTO_REFUND_RECONCILIATION',
                    ]
                );

                \App\Support\DomainEventLogger::recordAuditLog(
                    actor: 'FINANCE_SERVICE',
                    action: 'LATE_PAYMENT_ON_CANCELLED_ORDER',
                    resource: "ServiceOrder:{$order->id}",
                    reason: 'Pembayaran diterima pada pesanan yang telah dibatalkan; pesanan tetap CANCELLED.'
                );

                return [
                    'handled' => true,
                    'matched' => true,
                    'duplicate' => false,
                    'order_id' => $order->id,
                    'order_status' => 'CANCELLED',
                    'message' => 'Pembayaran diterima pada pesanan yang sudah dibatalkan. Status pesanan tetap CANCELLED.',
                ];
            }

            // 6b. Terminal order check: NEVER revert a COMPLETED order to non-terminal! (Task 1)
            if ($order->status === 'COMPLETED') {
                if ($isPaidEvent) {
                    $attempt->forceFill([
                        'reported_status' => 'PAID',
                        'status_last_verified_at' => $now,
                    ])->save();

                    if ($obligation->state !== 'PAID') {
                        $obligation->forceFill([
                            'state' => 'PAID',
                            'active_finance_payment_id' => $attempt->finance_payment_id,
                            'paid_at' => $now,
                            'version' => $obligation->version + 1,
                        ])->save();
                    }
                }

                IntegrationInboxEvent::where('id', $inboxId)->update([
                    'processing_status' => 'PROCESSED',
                    'processed_at' => $now,
                ]);

                \App\Support\DomainEventLogger::recordOrderEvent(
                    orderId: $order->id,
                    sequenceNo: $nextSeq,
                    eventType: 'LATE_PAYMENT_ON_COMPLETED_ORDER',
                    fromState: 'COMPLETED',
                    toState: 'COMPLETED',
                    actorId: 'FINANCE_SERVICE',
                    actorType: 'FINANCE',
                    metadata: [
                        'payment_id' => $attempt->finance_payment_id,
                        'amount_idr' => $attempt->amount_due_idr,
                        'obligation_state' => $obligation->state,
                    ]
                );

                \App\Support\DomainEventLogger::recordAuditLog(
                    actor: 'FINANCE_SERVICE',
                    action: 'LATE_PAYMENT_ON_COMPLETED_ORDER',
                    resource: "ServiceOrder:{$order->id}",
                    reason: 'Callback pembayaran diterima setelah pesanan COMPLETED. Status terminal COMPLETED tetap dipertahankan.'
                );

                return [
                    'handled' => true,
                    'matched' => true,
                    'duplicate' => false,
                    'order_id' => $order->id,
                    'order_status' => 'COMPLETED',
                    'obligation_purpose' => $obligation->purpose,
                    'obligation_state' => $obligation->state,
                    'message' => 'Pembayaran diterima pada pesanan yang sudah selesai. Status pesanan tetap COMPLETED.',
                ];
            }

            // 7. Payment Success handling
            if ($isPaidEvent) {
                $attempt->forceFill([
                    'reported_status' => 'PAID',
                    'status_last_verified_at' => $now,
                ])->save();

                $obligation->forceFill([
                    'state' => 'PAID',
                    'active_finance_payment_id' => $attempt->finance_payment_id,
                    'paid_at' => $now,
                    'version' => $obligation->version + 1,
                ])->save();

                if ($obligation->purpose === 'DIAGNOSIS') {
                    // Only transition order if still in pre-diagnosis-paid state
                    if (in_array($order->status, ['CREATED', 'PENDING_DIAGNOSIS_PAYMENT'], true)) {
                        $fromStatus = $order->status;
                        $order->forceFill([
                            'status' => 'PAID_WAITING_DISPATCH',
                            'phase' => 'WORKER_ASSIGNMENT_PENDING',
                            'version' => $order->version + 1,
                        ])->save();

                        \App\Support\DomainEventLogger::recordOrderEvent(
                            orderId: $order->id,
                            sequenceNo: $nextSeq,
                            eventType: 'DIAGNOSIS_PAID',
                            fromState: $fromStatus,
                            toState: 'PAID_WAITING_DISPATCH',
                            actorId: 'FINANCE_SERVICE',
                            actorType: 'FINANCE',
                            metadata: [
                                'payment_id' => $attempt->finance_payment_id,
                                'amount_idr' => $attempt->amount_due_idr,
                            ]
                        );
                    }
                } elseif ($obligation->purpose === 'SERVICE_EXECUTION') {
                    $eligibleStatuses = [
                        'EXECUTION_IN_PROGRESS',
                        'EXECUTION_FINISHED',
                        'DIAGNOSIS_APPROVED',
                        'WORKER_FINISHED',
                        'VISIT_CLOSED',
                        'PAYMENT_OVERDUE',
                        'PAYMENT_PENDING',
                    ];

                    if (in_array($order->status, $eligibleStatuses, true)) {
                        $fromStatus = $order->status;
                        $order->forceFill([
                            'status' => 'EXECUTION_PAID',
                            'version' => $order->version + 1,
                        ])->save();

                        \App\Support\DomainEventLogger::recordOrderEvent(
                            orderId: $order->id,
                            sequenceNo: $nextSeq,
                            eventType: 'EXECUTION_PAID',
                            fromState: $fromStatus,
                            toState: 'EXECUTION_PAID',
                            actorId: 'FINANCE_SERVICE',
                            actorType: 'FINANCE',
                            metadata: [
                                'payment_id' => $attempt->finance_payment_id,
                                'amount_idr' => $attempt->amount_due_idr,
                            ]
                        );
                    }
                }
            } elseif (str_contains(strtolower($eventType), 'failed') || str_contains(strtolower($eventType), 'expired')) {
                // Out-of-order check: if obligation is already PAID, NEVER downgrade to expired/failed!
                if ($obligation->state === 'PAID') {
                    IntegrationInboxEvent::where('id', $inboxId)->update([
                        'processing_status' => 'PROCESSED',
                        'processed_at' => $now,
                    ]);

                    return [
                        'handled' => true,
                        'matched' => true,
                        'duplicate' => false,
                        'order_id' => $order->id,
                        'order_status' => $order->status,
                        'obligation_purpose' => $obligation->purpose,
                        'obligation_state' => $obligation->state,
                        'message' => 'Event kegagalan/kedaluwarsa diabaikan karena kewajiban pembayaran sudah berstatus lunas.',
                    ];
                }

                // Payment Failed / Expired
                $reportedStatus = str_contains(strtolower($eventType), 'expired') ? 'EXPIRED' : 'FAILED';
                $attempt->forceFill([
                    'reported_status' => $reportedStatus,
                    'status_last_verified_at' => $now,
                ])->save();

                if ($obligation->purpose === 'SERVICE_EXECUTION') {
                    // Task 2: Stale callback protection.
                    // Only transition obligation to OVERDUE if this attempt was the CURRENT active attempt
                    // AND no other attempt is currently active and pending payment!
                    $hasNewerPendingAttempt = $obligation->attempts()
                        ->where('id', '!=', $attempt->id)
                        ->where('is_current', true)
                        ->where('reported_status', 'PENDING')
                        ->exists();

                    if ($attempt->is_current && !$hasNewerPendingAttempt) {
                        $obligation->forceFill([
                            'state' => 'OVERDUE',
                            'version' => $obligation->version + 1,
                        ])->save();
                    } else {
                        \App\Support\DomainEventLogger::recordAuditLog(
                            actor: 'FINANCE_SERVICE',
                            action: 'STALE_PAYMENT_CALLBACK_IGNORED',
                            resource: "ServicePaymentAttempt:{$attempt->id}",
                            reason: "Callback {$reportedStatus} dari attempt lama diabaikan untuk kewajiban pembayaran karena attempt baru masih aktif."
                        );
                    }
                }
            }

            IntegrationInboxEvent::where('id', $inboxId)->update([
                'processing_status' => 'PROCESSED',
                'processed_at' => $now,
            ]);

            return [
                'handled' => true,
                'matched' => true,
                'duplicate' => false,
                'status' => $obligation->state,
                'order_id' => $order->id,
                'order_status' => $order->status,
                'obligation_purpose' => $obligation->purpose,
                'obligation_state' => $obligation->state,
            ];
        });
    }
}
