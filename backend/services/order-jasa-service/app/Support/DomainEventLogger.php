<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\OrderAuditLog;
use App\Models\ServiceOrderEvent;
use Illuminate\Support\Str;

class DomainEventLogger
{
    public static function recordOrderEvent(
        string $orderId,
        int $sequenceNo,
        string $eventType,
        ?string $fromState,
        ?string $toState,
        string $actorId,
        string $actorType,
        ?array $metadata = null
    ): ServiceOrderEvent {
        return ServiceOrderEvent::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'sequence_no' => $sequenceNo,
            'event_type' => $eventType,
            'actor_type' => $actorType,
            'actor_id' => $actorId,
            'from_state' => $fromState,
            'to_state' => $toState,
            'metadata_json' => $metadata,
            'occurred_at' => now(),
        ]);
    }

    public static function recordAuditLog(
        string $actor,
        string $action,
        string $resource,
        ?string $reason = null,
        ?int $oldVersion = null,
        ?int $newVersion = null
    ): OrderAuditLog {
        return OrderAuditLog::forceCreate([
            'id' => (string) Str::ulid(),
            'request_id' => request()->header('X-Request-Id', (string) Str::uuid()),
            'actor' => $actor,
            'action' => $action,
            'resource' => $resource,
            'old_version' => $oldVersion,
            'new_version' => $newVersion,
            'reason' => $reason,
            'ip_hash' => hash('sha256', request()->ip() ?? '127.0.0.1'),
            'created_at' => now(),
        ]);
    }
}

