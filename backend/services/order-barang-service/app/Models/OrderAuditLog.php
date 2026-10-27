<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class OrderAuditLog extends Model
{
    use HasUlids;

    protected $table = 'order_audit_logs';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'order_id',
        'checkout_group_id',
        'actor_id',
        'actor_role',
        'action',
        'before_state',
        'after_state',
        'result',
        'correlation_id',
        'occurred_at',
    ];

    protected $casts = [
        'before_state' => 'array',
        'after_state' => 'array',
        'occurred_at' => 'datetime',
    ];
}
