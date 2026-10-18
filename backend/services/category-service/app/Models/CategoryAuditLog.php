<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CategoryAuditLog extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $table = 'category_audit_logs';

    protected $fillable = [
        'id',
        'request_id',
        'actor_user_id',
        'actor_role',
        'actor_org_id',
        'action',
        'entity_type',
        'entity_id',
        'old_safe_snapshot',
        'new_safe_snapshot',
        'reason',
        'occurred_at',
        'correlation_id',
    ];

    protected $casts = [
        'old_safe_snapshot' => 'array',
        'new_safe_snapshot' => 'array',
        'occurred_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
    ];
}
