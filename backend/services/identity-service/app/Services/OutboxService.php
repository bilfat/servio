<?php

namespace App\Services;

use App\Models\OutboxEvent;

class OutboxService
{
    public static function publish(
        string $aggregateType,
        string $aggregateId,
        string $eventType,
        array $payload,
        int $schemaVersion = 1
    ): OutboxEvent {
        return OutboxEvent::create([
            'aggregate_type' => $aggregateType,
            'aggregate_id' => $aggregateId,
            'event_type' => $eventType,
            'schema_version' => $schemaVersion,
            'payload_json' => $payload,
            'occurred_at' => now(),
            'published_at' => null,
            'attempts' => 0,
        ]);
    }

    public static function markPublished(OutboxEvent $event): void
    {
        $event->published_at = now();
        $event->save();
    }

    public static function recordAttemptFailure(OutboxEvent $event, string $error): void
    {
        $event->attempts++;
        $event->last_error = $error;
        $event->save();
    }
}
