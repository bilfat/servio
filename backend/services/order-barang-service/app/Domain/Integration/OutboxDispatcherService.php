<?php

declare(strict_types=1);

namespace App\Domain\Integration;

use App\Infrastructure\Finance\FinanceCheckoutClient;
use App\Models\IntegrationOutboxEvent;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class OutboxDispatcherService
{
    public function __construct(
        protected FinanceCheckoutClient $financeClient
    ) {}

    /**
     * Atomically claim eligible pending outbox events (FIX 20).
     * Uses row-level locking (lockForUpdate) in a short transaction that COMMITS immediately.
     * Database lock is NOT held during subsequent external HTTP calls.
     *
     * @return Collection<int, IntegrationOutboxEvent>
     */
    public function claimEligibleEvents(string $workerId, int $limit = 20, int $leaseSeconds = 60): Collection
    {
        return DB::transaction(function () use ($workerId, $limit, $leaseSeconds) {
            $now = now();

            // Select eligible events:
            // 1. Status PENDING and available_at <= now() and next_attempt_at <= now() (or null)
            // 2. OR Status PROCESSING with expired lease (lease_expires_at <= now()) for crash recovery
            $eligible = IntegrationOutboxEvent::where(function ($q) use ($now) {
                    $q->where('status', IntegrationOutboxEvent::STATUS_PENDING)
                      ->orWhere(function ($q2) use ($now) {
                          $q2->where('status', IntegrationOutboxEvent::STATUS_PROCESSING)
                             ->whereNotNull('lease_expires_at')
                             ->where('lease_expires_at', '<=', $now);
                      });
                })
                ->where(function ($q) use ($now) {
                    $q->whereNull('available_at')->orWhere('available_at', '<=', $now->copy()->addSeconds(5));
                })
                ->where(function ($q) use ($now) {
                    $q->whereNull('next_attempt_at')->orWhere('next_attempt_at', '<=', $now);
                })
                ->orderBy('available_at', 'asc')
                ->limit($limit)
                ->lockForUpdate()
                ->get();

            if ($eligible->isEmpty()) {
                return collect();
            }

            $leaseExpiry = $now->copy()->addSeconds($leaseSeconds);

            foreach ($eligible as $event) {
                $event->update([
                    'status' => IntegrationOutboxEvent::STATUS_PROCESSING,
                    'claimed_by' => $workerId,
                    'claimed_at' => $now,
                    'lease_expires_at' => $leaseExpiry,
                ]);
            }

            return $eligible;
        });
    }

    /**
     * Dispatch pending outbox events with atomic claim and worker concurrency safety (FIX 20).
     */
    public function dispatchPendingEvents(int $limit = 20, ?string $workerId = null): int
    {
        $workerId = $workerId ?: 'worker_' . Str::random(12);
        $claimedEvents = $this->claimEligibleEvents($workerId, $limit, 60);

        if ($claimedEvents->isEmpty()) {
            return 0;
        }

        $dispatchedCount = 0;

        foreach ($claimedEvents as $event) {
            try {
                $payload = $event->payload_json;

                if ($event->destination_service === 'FINANCE_06') {
                    if ($event->event_type === 'finance.order_completed.v1') {
                        $this->financeClient->emitOrderCompleted(
                            eventId: $payload['event_id'] ?? $event->id,
                            merchantOrderId: $payload['merchant_order_id'],
                            checkoutGroupId: $payload['checkout_group_id'],
                            completedAt: $payload['completed_at'],
                            orderVersion: (int) ($payload['order_version'] ?? 1)
                        );
                    } elseif (in_array($event->event_type, ['finance.cancellation_refund.v1', 'FINANCE_ORDER_CANCELLATION_REFUND'], true)) {
                        $this->financeClient->delegateCancellationRefund(
                            sourceEventId: $payload['source_event_id'],
                            merchantOrderId: $payload['merchant_order_id'],
                            checkoutGroupId: $payload['checkout_group_id'],
                            decisionSource: $payload['decision_source'],
                            reasonCode: $payload['reason_code'],
                            cancelledAt: $payload['cancelled_at']
                        );
                    }
                }

                $event->update([
                    'status' => IntegrationOutboxEvent::STATUS_SENT,
                    'sent_at' => now(),
                    'claimed_by' => null,
                    'claimed_at' => null,
                    'lease_expires_at' => null,
                    'last_error' => null,
                ]);

                $dispatchedCount++;
            } catch (\Throwable $e) {
                $attempts = $event->attempt_count + 1;
                $delayMinutes = min(60, 2 ** $attempts);

                $event->update([
                    'attempt_count' => $attempts,
                    'next_attempt_at' => now()->addMinutes($delayMinutes),
                    'last_error' => substr($e->getMessage(), 0, 500),
                    'claimed_by' => null,
                    'claimed_at' => null,
                    'lease_expires_at' => null,
                    'status' => $attempts > 10 ? IntegrationOutboxEvent::STATUS_FAILED : IntegrationOutboxEvent::STATUS_PENDING,
                ]);

                Log::warning("OutboxDispatcher: Worker {$workerId} failed sending event {$event->id}: " . $e->getMessage());
            }
        }

        return $dispatchedCount;
    }
}
