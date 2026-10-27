<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class IntegrationInboxEvent extends Model
{
    use HasUlids;

    protected $table = 'integration_inbox_events';
    protected $keyType = 'string';
    public $incrementing = false;

    public const STATUS_PENDING = 'PENDING';
    public const STATUS_PROCESSED = 'PROCESSED';
    public const STATUS_FAILED = 'FAILED';

    protected $fillable = [
        'id',
        'source_service',
        'source_event_id',
        'event_type',
        'aggregate_id',
        'payload_hash',
        'payload_json',
        'status',
        'received_at',
        'processed_at',
        'attempt_count',
        'last_error',
    ];

    protected $casts = [
        'payload_json' => 'array',
        'received_at' => 'datetime',
        'processed_at' => 'datetime',
        'attempt_count' => 'integer',
    ];
}
