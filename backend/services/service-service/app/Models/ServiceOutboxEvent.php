<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ServiceOutboxEvent extends Model
{
    use HasUuids;

    protected $table = 'service_outbox_events';

    protected $fillable = [
        'id',
        'aggregate_type',
        'aggregate_id',
        'offering_id',
        'event_type',
        'aggregate_version',
        'payload',
        'occurred_at',
        'published_at',
        'attempts',
        'correlation_id',
    ];

    protected function casts(): array
    {
        return [
            'aggregate_version' => 'integer',
            'payload' => 'array',
            'occurred_at' => 'datetime',
            'published_at' => 'datetime',
            'attempts' => 'integer',
        ];
    }
}
