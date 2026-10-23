<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ServiceAuditLog extends Model
{
    use HasUuids;

    protected $table = 'service_audit_logs';

    protected $fillable = [
        'id',
        'entity_type',
        'entity_id',
        'offering_id',
        'actor_user_id',
        'actor_role',
        'actor_org_id',
        'action',
        'safe_before',
        'safe_after',
        'reason',
        'request_id',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'safe_before' => 'array',
            'safe_after' => 'array',
            'occurred_at' => 'datetime',
        ];
    }
}
