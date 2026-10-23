<?php

namespace App\Infrastructure\Outbox;

use App\Models\ServiceOutboxEvent;
use Illuminate\Support\Str;

class OutboxPublisher
{
    public static function record(
        string $aggregateType,
        string $aggregateId,
        string $eventType,
        array $payload,
        ?string $offeringId = null,
        int $aggregateVersion = 1,
        ?string $correlationId = null
    ): ServiceOutboxEvent {
        return ServiceOutboxEvent::create([
            'id' => (string) Str::uuid(),
            'aggregate_type' => $aggregateType,
            'aggregate_id' => $aggregateId,
            'offering_id' => $offeringId,
            'event_type' => $eventType,
            'aggregate_version' => $aggregateVersion,
            'payload' => $payload,
            'occurred_at' => now(),
            'published_at' => now(), // Simulated local dispatch
            'attempts' => 1,
            'correlation_id' => $correlationId ?: request()->header('X-Request-ID'),
        ]);
    }
}
