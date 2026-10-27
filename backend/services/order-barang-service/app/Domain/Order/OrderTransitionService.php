<?php

declare(strict_types=1);

namespace App\Domain\Order;

use App\Models\Delivery;
use App\Models\IntegrationOutboxEvent;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderTransitionService
{
    /**
     * Transition order status safely with optimistic concurrency locking and history recording.
     */
    public function transition(
        Order $order,
        string $newStatus,
        string $action,
        ?string $actorId,
        ?string $actorRole,
        ?string $reasonCode = null,
        ?string $reasonNote = null,
        ?int $expectedVersion = null,
        array $extraAttributes = []
    ): Order {
        $result = DB::transaction(function () use (
            $order,
            $newStatus,
            $action,
            $actorId,
            $actorRole,
            $reasonCode,
            $reasonNote,
            $expectedVersion,
            $extraAttributes
        ) {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->first();
            if (!$lockedOrder) {
                throw new Exception('Pesanan tidak ditemukan.', 404);
            }

            if ($expectedVersion !== null && $lockedOrder->version !== $expectedVersion) {
                throw new Exception(
                    "Konflik konkurensi: pesanan telah diperbarui pihak lain (versi terkini: {$lockedOrder->version}).",
                    409
                );
            }

            $currentStatus = $lockedOrder->status;

            // Validate state transition matrix
            $this->validateTransition($currentStatus, $newStatus, $lockedOrder);

            $newVersion = $lockedOrder->version + 1;

            $updateData = array_merge($extraAttributes, [
                'status' => $newStatus,
                'version' => $newVersion,
            ]);

            if ($newStatus === Order::STATUS_DELIVERED && !isset($updateData['delivered_at'])) {
                $updateData['delivered_at'] = now();
            }

            if ($newStatus === Order::STATUS_COMPLETED && !isset($updateData['completed_at'])) {
                $updateData['completed_at'] = now();
            }

            if ($newStatus === Order::STATUS_CANCELLED && !isset($updateData['cancelled_at'])) {
                $updateData['cancelled_at'] = now();
                $updateData['cancel_reason_code'] = $reasonCode;
            }

            $lockedOrder->update($updateData);

            // Record status history
            OrderStatusHistory::create([
                'id' => (string) Str::ulid(),
                'order_id' => $lockedOrder->id,
                'previous_status' => $currentStatus,
                'new_status' => $newStatus,
                'action' => $action,
                'actor_id' => $actorId,
                'actor_role' => $actorRole,
                'source_service' => 'ORDER_05A',
                'reason_code' => $reasonCode,
                'reason_note' => $reasonNote,
                'order_version' => $newVersion,
                'occurred_at' => now(),
            ]);

            // If COMPLETED, schedule single outbox event to Finance Service (triggers 120h escrow hold)
            if ($newStatus === Order::STATUS_COMPLETED) {
                $this->scheduleFinanceOrderCompletedOutbox($lockedOrder, $newVersion);
            }

            return $lockedOrder->fresh(['delivery', 'cancellationRequests']);
        });

        // Trigger Outbox Dispatcher post-commit to deliver finance.order_completed.v1 to Finance 06 immediately
        if ($newStatus === Order::STATUS_COMPLETED) {
            $maxSafeLevel = app()->runningUnitTests() ? 1 : 0;
            if (DB::transactionLevel() <= $maxSafeLevel) {
                try {
                    app(\App\Domain\Integration\OutboxDispatcherService::class)->dispatchPendingEvents();
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning("OrderTransitionService: Outbox dispatch deferred: " . $e->getMessage());
                }
            } else {
                DB::afterCommit(function () {
                    try {
                        app(\App\Domain\Integration\OutboxDispatcherService::class)->dispatchPendingEvents();
                    } catch (\Throwable $e) {
                        \Illuminate\Support\Facades\Log::warning("OrderTransitionService: Outbox afterCommit dispatch deferred: " . $e->getMessage());
                    }
                });
            }
        }

        return $result;
    }

    /**
     * Canonical state machine transition guard.
     */
    private function validateTransition(string $current, string $target, Order $order): void
    {
        // Terminal states cannot transition
        if (in_array($current, [Order::STATUS_COMPLETED, Order::STATUS_CANCELLED], true)) {
            throw new Exception("Pesanan pada status terminal {$current} tidak dapat diubah lagi.", 409);
        }

        $allowedTransitions = [
            Order::STATUS_CREATED => [Order::STATUS_PAYMENT_PENDING, Order::STATUS_CANCELLED],
            Order::STATUS_PAYMENT_PENDING => [Order::STATUS_CONFIRMED, Order::STATUS_CANCELLED],
            Order::STATUS_CONFIRMED => [Order::STATUS_PROCESSING, Order::STATUS_CANCELLED],
            Order::STATUS_PROCESSING => [Order::STATUS_PACKED, Order::STATUS_CANCELLED],
            Order::STATUS_PACKED => [Order::STATUS_DELIVERING],
            Order::STATUS_DELIVERING => [Order::STATUS_DELIVERED],
            Order::STATUS_DELIVERED => [Order::STATUS_COMPLETED],
        ];

        if (!isset($allowedTransitions[$current]) || !in_array($target, $allowedTransitions[$current], true)) {
            throw new Exception("Transisi status dari {$current} ke {$target} tidak diizinkan.", 409);
        }

        // Specific guard: When moving PROCESSING -> PACKED, must not have pending cancellation request!
        if ($current === Order::STATUS_PROCESSING && $target === Order::STATUS_PACKED) {
            if ($order->active_cancellation_request_id !== null) {
                throw new Exception('Pesanan tidak dapat dikemas karena ada pengajuan pembatalan yang sedang ditinjau.', 409);
            }
        }
    }

    /**
     * Schedule ORDER_COMPLETED event to Finance Service via reliable outbox pattern.
     */
    private function scheduleFinanceOrderCompletedOutbox(Order $order, int $orderVersion): void
    {
        $eventId = (string) Str::ulid();

        IntegrationOutboxEvent::create([
            'id' => $eventId,
            'destination_service' => 'FINANCE_06',
            'event_type' => 'finance.order_completed.v1',
            'aggregate_type' => 'ORDER',
            'aggregate_id' => $order->id,
            'aggregate_version' => $orderVersion,
            'payload_json' => [
                'event_id' => $eventId,
                'event_type' => 'ORDER_COMPLETED',
                'merchant_order_id' => $order->id,
                'checkout_group_id' => $order->checkout_group_id,
                'completed_at' => $order->completed_at?->toIso8601String() ?? now()->toIso8601String(),
                'order_version' => $orderVersion,
            ],
            'status' => IntegrationOutboxEvent::STATUS_PENDING,
            'available_at' => now(),
            'correlation_id' => (string) Str::uuid(),
        ]);
    }
}
