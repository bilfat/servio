<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class OutboxEvent extends Model
{
    protected $table = 'outbox_events';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'event_id';

    protected $fillable = [
        'event_id',
        'event_type',
        'event_version',
        'aggregate_type',
        'aggregate_id',
        'payload',
        'status',
        'retry_count',
        'last_error',
        'published_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'event_version' => 'integer',
        'retry_count' => 'integer',
        'published_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (OutboxEvent $model) {
            if (empty($model->event_id)) {
                $model->event_id = 'evt_' . Str::ulid();
            }
        });
    }
}

