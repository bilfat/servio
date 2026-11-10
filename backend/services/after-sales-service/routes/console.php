<?php

use App\Domain\AfterSales\Sla\SlaService;
use App\Models\OutboxEvent;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

Artisan::command('after-sales:process-sla', function (SlaService $slaService) {
    $this->info('Evaluating After-Sales 72h SLA deadlines...');
    $count = $slaService->evaluateOverdueCases();
    $this->info("Completed. Marked {$count} cases as OVERDUE (TIDAK DITANGGAPI).");
})->purpose('Evaluate cases exceeding 72h initial response deadline');

Schedule::command('after-sales:process-sla')->everyTenMinutes();

Artisan::command('after-sales:process-expiry', function () {
    $now = now();
    $count = \App\Models\OrderWarrantyEntitlement::whereIn('status', ['ACTIVE', 'CLAIM_LOCKED'])
        ->whereNotNull('expires_at')
        ->where('expires_at', '<', $now)
        ->where(function ($q) {
            // When remaining quantity is completely 0, it is either CLAIM_LOCKED or CONSUMED.
            // If it had zero claims and expired, mark EXPIRED.
            // If it had partial claims and remaining units expired without being claimed, mark EXPIRED for the remainder.
            $q->whereNull('claimed_quantity')
              ->orWhereRaw('(quantity - COALESCE(claimed_quantity, 0)) > 0');
        })
        ->update([
            'status' => 'EXPIRED',
            'updated_at' => $now,
        ]);

    $this->info("Completed. Marked {$count} unclaimed warranty entitlements as EXPIRED.");
})->purpose('Evaluate and transition expired warranty entitlements to EXPIRED');

Schedule::command('after-sales:process-expiry')->hourly();

Artisan::command('after-sales:dispatch-outbox', function () {
    $events = OutboxEvent::where('status', 'PENDING')
        ->where('retry_count', '<', 5)
        ->orderBy('created_at', 'asc')
        ->limit(50)
        ->get();

    $published = 0;
    $retried = 0;
    $deadLettered = 0;

    $notifUrl = config('after_sales.services.notification.base_url', 'http://127.0.0.1:8010');
    $notifKey = config('after_sales.services.notification.internal_key', 'servio_local_internal_service_key_2026');

    $supportUrl = config('after_sales.services.support.base_url', 'http://127.0.0.1:8009');
    $supportKey = config('after_sales.services.support.internal_key', 'servio_local_internal_service_key_2026');

    foreach ($events as $event) {
        $eventType = (string) $event->event_type;
        $isSupportConsumer = str_contains($eventType, 'support')
            || str_contains($eventType, 'dispute')
            || $event->aggregate_type === 'DISPUTE';

        $targetUrl = $isSupportConsumer
            ? "{$supportUrl}/internal/v1/support/events"
            : "{$notifUrl}/internal/v1/notifications/events";

        $targetKey = $isSupportConsumer ? $supportKey : $notifKey;
        $consumerName = $isSupportConsumer ? 'Support 09' : 'Notification 10';

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $targetKey,
                'X-Source-Service' => 'after-sales-service',
                'Accept' => 'application/json',
            ])->timeout(2)->post($targetUrl, [
                'event_id' => $event->event_id,
                'event_type' => $event->event_type,
                'aggregate_type' => $event->aggregate_type,
                'aggregate_id' => $event->aggregate_id,
                'payload' => $event->payload,
            ]);

            if ($response->successful()) {
                $event->update([
                    'status' => 'PUBLISHED',
                    'published_at' => now(),
                    'last_error' => null,
                ]);
                $published++;
                continue;
            }

            // Downstream error response (non-2xx)
            $newRetryCount = $event->retry_count + 1;
            $newStatus = $newRetryCount >= 5 ? 'DEAD_LETTER' : 'PENDING';

            $event->update([
                'retry_count' => $newRetryCount,
                'status' => $newStatus,
                'last_error' => "{$consumerName} responded HTTP {$response->status()}: " . substr($response->body(), 0, 200),
            ]);

            if ($newStatus === 'DEAD_LETTER') {
                $deadLettered++;
            } else {
                $retried++;
            }
        } catch (\Throwable $e) {
            // Downstream unavailable / connection refused - DO NOT FALSELY PUBLISH
            $newRetryCount = $event->retry_count + 1;
            $newStatus = $newRetryCount >= 5 ? 'DEAD_LETTER' : 'PENDING';

            $event->update([
                'retry_count' => $newRetryCount,
                'status' => $newStatus,
                'last_error' => "{$consumerName} connection failed: " . $e->getMessage(),
            ]);

            if ($newStatus === 'DEAD_LETTER') {
                $deadLettered++;
            } else {
                $retried++;
            }
        }
    }

    $this->info("Durable outbox dispatcher completed: {$published} PUBLISHED, {$retried} RETRIED, {$deadLettered} DEAD_LETTER. Honest pending maintained.");
})->purpose('Durable outbox dispatcher with consumer routing');

Schedule::command('after-sales:dispatch-outbox')->everyMinute();

Artisan::command('after-sales:redrive-outbox {--limit=100}', function () {
    $limit = (int) $this->option('limit');
    $records = OutboxEvent::whereIn('status', ['DEAD_LETTER', 'FAILED'])
        ->limit($limit)
        ->get();

    $count = 0;
    foreach ($records as $record) {
        $record->update([
            'status' => 'PENDING',
            'retry_count' => 0,
            'last_error' => 'Redriven at ' . now()->toIso8601String() . ' (Prior error: ' . $record->last_error . ')',
        ]);
        $count++;
    }

    $this->info("Outbox redrive completed. Reset {$count} dead-lettered events to PENDING.");
})->purpose('Redrive dead-lettered outbox events back to PENDING');
