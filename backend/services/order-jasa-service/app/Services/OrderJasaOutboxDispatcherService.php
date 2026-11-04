<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\IntegrationOutboxEvent;
use App\Models\ServicePaymentObligation;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OrderJasaOutboxDispatcherService
{
    private string $financeBaseUrl;
    private ?string $internalKey;
    private int $timeoutSeconds;

    public function __construct()
    {
        $this->financeBaseUrl = rtrim((string) config('order_jasa.services.finance.base_url', 'http://127.0.0.1:8006'), '/');
        $this->internalKey = config('order_jasa.services.finance.internal_key');
        $this->timeoutSeconds = 10;
    }

    /**
     * Dispatch all pending outbox events to external destination services.
     */
    public function dispatchPendingEvents(int $limit = 50): int
    {
        $now = now();

        $events = IntegrationOutboxEvent::where(function ($q) use ($now) {
                $q->where('status', 'PENDING')
                  ->orWhere(function ($q2) use ($now) {
                      $q2->where('status', 'FAILED')
                         ->where('attempts', '<', 10)
                         ->where(function ($q3) use ($now) {
                             $q3->whereNull('next_retry_at')
                                ->orWhere('next_retry_at', '<=', $now);
                         });
                  });
            })
            ->orderBy('created_at', 'asc')
            ->limit($limit)
            ->get();

        if ($events->isEmpty()) {
            return 0;
        }

        $dispatchedCount = 0;
        foreach ($events as $event) {
            if ($this->dispatchEvent($event)) {
                $dispatchedCount++;
            }
        }

        return $dispatchedCount;
    }

    /**
     * Dispatch a single outbox event to its destination service.
     */
    public function dispatchEvent(IntegrationOutboxEvent $event): bool
    {
        try {
            if ($event->destination === 'finance-service') {
                return $this->dispatchToFinance($event);
            }

            // Unknown destination -> skip
            $event->forceFill([
                'status' => 'SKIPPED',
                'delivered_at' => now(),
                'updated_at' => now(),
            ])->save();

            return true;
        } catch (\Throwable $e) {
            $this->recordFailure($event, $e->getMessage());
            return false;
        }
    }

    private function dispatchToFinance(IntegrationOutboxEvent $event): bool
    {
        $payload = (array) $event->payload_json;
        $orderId = (string) ($payload['order_id'] ?? $event->aggregate_id);
        $providerOrgId = (string) ($payload['provider_org_id'] ?? 'ORG-PROVIDER-01');
        $completedAt = (string) ($payload['completed_at'] ?? now()->toIso8601String());

        // For ORDER_COMPLETED, send event for service execution allocation
        $obligation = ServicePaymentObligation::where('order_id', $orderId)
            ->where('purpose', 'SERVICE_EXECUTION')
            ->first();
        $paidAttempt = $obligation?->attempts()->where('reported_status', 'PAID')->latest('attempt_no')->first();
        $merchantOrderId = ($paidAttempt && $paidAttempt->attempt_no > 1)
            ? "{$orderId}-service_execution-att{$paidAttempt->attempt_no}"
            : "{$orderId}-service_execution";

        $body = [
            'event_id' => $event->event_id,
            'event_type' => 'ORDER_COMPLETED',
            'merchant_order_id' => $merchantOrderId,
            'payload' => [
                'order_id' => $orderId,
                'provider_org_id' => $providerOrgId,
                'completed_at' => $completedAt,
                'order_version' => 1,
            ],
        ];

        $response = Http::withHeaders([
            'X-Internal-Service-Key' => (string) $this->internalKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ])
        ->timeout($this->timeoutSeconds)
        ->post("{$this->financeBaseUrl}/internal/v1/finance/order-events", $body);

        if ($response->successful()) {
            $event->forceFill([
                'status' => 'DELIVERED',
                'delivered_at' => now(),
                'attempts' => $event->attempts + 1,
                'updated_at' => now(),
            ])->save();

            Log::info("OrderJasaOutbox: Event {$event->event_id} delivered to Finance 06.");
            return true;
        }

        $err = "HTTP {$response->status()}: " . substr($response->body(), 0, 500);
        $this->recordFailure($event, $err);
        return false;
    }

    private function recordFailure(IntegrationOutboxEvent $event, string $error): void
    {
        $newAttempts = $event->attempts + 1;
        $backoffSeconds = min(3600, (int) (pow(2, min(8, $newAttempts)) * 5));

        $event->forceFill([
            'status' => $newAttempts >= 10 ? 'ABANDONED' : 'FAILED',
            'attempts' => $newAttempts,
            'next_retry_at' => now()->addSeconds($backoffSeconds),
            'updated_at' => now(),
        ])->save();

        Log::warning("OrderJasaOutbox: Event {$event->event_id} failed attempt {$newAttempts}: {$error}");
    }
}

