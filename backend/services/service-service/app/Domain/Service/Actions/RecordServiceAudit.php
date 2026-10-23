<?php

namespace App\Domain\Service\Actions;

use App\Models\ServiceAuditLog;
use App\Support\AuthenticatedActor;
use Illuminate\Support\Str;

class RecordServiceAudit
{
    public static function execute(
        string $entityType,
        string $entityId,
        string $action,
        ?array $before = null,
        ?array $after = null,
        ?string $offeringId = null,
        ?string $reason = null
    ): ServiceAuditLog {
        /** @var AuthenticatedActor|null $actor */
        $actor = request()->attributes->get('actor');

        return ServiceAuditLog::create([
            'id' => (string) Str::uuid(),
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'offering_id' => $offeringId,
            'actor_user_id' => $actor?->id,
            'actor_role' => $actor?->role,
            'actor_org_id' => $actor?->organizationId,
            'action' => $action,
            'safe_before' => $before,
            'safe_after' => $after,
            'reason' => $reason,
            'request_id' => request()->header('X-Request-ID'),
            'occurred_at' => now(),
        ]);
    }
}
