<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class InboxEvent extends Model
{
    public $incrementing = false;
    public $timestamps = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'source_service',
        'source_event_id',
        'event_type',
        'aggregate_id',
        'status',
        'received_at',
        'processed_at',
        'failure_reason',
        'payload_hash',
    ];

    protected $casts = [
        'received_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
            if (empty($model->received_at)) {
                $model->received_at = now();
            }
        });
    }
}
