<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class IntegrationOutboxEvent extends Model
{
    use HasUlids;

    protected $table = 'integration_outbox_events';
    protected $keyType = 'string';
    public $incrementing = false;

    public const STATUS_PENDING = 'PENDING';
    public const STATUS_PROCESSING = 'PROCESSING';
    public const STATUS_SENT = 'SENT';
    public const STATUS_FAILED = 'FAILED';

    protected $fillable = [
        'id',
        'destination_service',
        'event_type',
        'aggregate_type',
        'aggregate_id',
        'aggregate_version',
        'payload_json',
        'status',
        'claimed_by',
        'claimed_at',
        'lease_expires_at',
        'available_at',
        'attempt_count',
        'next_attempt_at',
        'sent_at',
        'last_error',
        'correlation_id',
    ];

    protected $casts = [
        'payload_json' => 'array',
        'aggregate_version' => 'integer',
        'attempt_count' => 'integer',
        'claimed_at' => 'datetime',
        'lease_expires_at' => 'datetime',
        'available_at' => 'datetime',
        'next_attempt_at' => 'datetime',
        'sent_at' => 'datetime',
    ];
}
