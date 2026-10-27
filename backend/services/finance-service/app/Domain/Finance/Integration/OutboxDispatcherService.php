<?php

declare(strict_types=1);

namespace App\Domain\Finance\Integration;

use App\Models\OutboxEvent;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OutboxDispatcherService
{
    private string $orderBaseUrl;
    private string $internalKey;
    private int $timeoutSeconds;

    public function __construct()
    {
        $this->orderBaseUrl = rtrim((string) env('ORDER_INTERNAL_BASE_URL', 'http://127.0.0.1:8005'), '/');
        $this->internalKey = (string) env('FINANCE_INTERNAL_SERVICE_KEY', env('ORDER_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'));
        $this->timeoutSeconds = 10;
    }

    /**
     * Dispatch all pending outbox events to their respective destination services.
     */
    public function dispatchPendingEvents(int $limit = 50): int
    {
        $now = now();

        $events = OutboxEvent::where(function ($q) use ($now) {
                $q->where('dispatch_status', 'PENDING')
                  ->orWhere(function ($q2) use ($now) {
                      $q2->where('dispatch_status', 'FAILED')
                         ->where('attempts', '<', 10)
                         ->where(function ($q3) use ($now) {
                             $q3->whereNull('next_attempt_at')
                                ->orWhere('next_attempt_at', '<=', $now);
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
            $success = $this->dispatchEvent($event);
            if ($success) {
                $dispatchedCount++;
            }
        }

        return $dispatchedCount;
    }

    /**
     * Dispatch a single outbox event to its destination service.
     */
    public function dispatchEvent(OutboxEvent $event): bool
    {
        try {
            // Determine destination URL
            $url = null;
            if (str_starts_with($event->event_type, 'finance.payment.') || str_starts_with($event->event_type, 'finance.refund.')) {
                $url = "{$this->orderBaseUrl}/internal/v1/order-barang/finance-events";
            }

            if (!$url) {
                Log::info("OutboxDispatcher: No destination route defined for event type '{$event->event_type}' (id: {$event->id})");
                $event->update([
                    'dispatch_status' => 'SKIPPED',
                    'published_at' => now(),
                ]);
                return true;
            }

            $envelope = [
                'event_id' => $event->event_id,
                'source_service' => 'FINANCE_06',
                'event_type' => $event->event_type,
                'payload' => $event->payload,
            ];

            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $this->internalKey,
                'X-Source-Service' => 'FINANCE_06',
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutSeconds)
            ->post($url, $envelope);

            if ($response->successful()) {
                $event->update([
                    'dispatch_status' => 'PUBLISHED',
                    'published_at' => now(),
                    'attempts' => $event->attempts + 1,
                ]);

                Log::info("OutboxDispatcher: Event {$event->event_type} ({$event->event_id}) successfully delivered to 05A Order Service.");
                return true;
            }

            $errMsg = "HTTP {$response->status()}: " . substr($response->body(), 0, 500);
            $this->recordFailure($event, $errMsg);
            return false;
        } catch (\Throwable $e) {
            $this->recordFailure($event, $e->getMessage());
            return false;
        }
    }

    private function recordFailure(OutboxEvent $event, string $error): void
    {
        $newAttempts = $event->attempts + 1;
        $backoffSeconds = min(3600, (int) (pow(2, min(8, $newAttempts)) * 5));

        $event->update([
            'dispatch_status' => $newAttempts >= 10 ? 'ABANDONED' : 'FAILED',
            'attempts' => $newAttempts,
            'next_attempt_at' => now()->addSeconds($backoffSeconds),
        ]);

        Log::warning("OutboxDispatcher: Failed delivering event {$event->event_type} ({$event->id}), attempt {$newAttempts}. Error: {$error}");
    }
}
