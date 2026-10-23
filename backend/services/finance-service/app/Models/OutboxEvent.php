<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class OutboxEvent extends Model
{
    public $incrementing = false;
    public $timestamps = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'event_id',
        'event_type',
        'aggregate_type',
        'aggregate_id',
        'payload',
        'schema_version',
        'dispatch_status',
        'attempts',
        'next_attempt_at',
        'published_at',
        'created_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'schema_version' => 'integer',
        'attempts' => 'integer',
        'next_attempt_at' => 'datetime',
        'published_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
            if (empty($model->event_id)) {
                $model->event_id = (string) Str::ulid();
            }
            if (empty($model->created_at)) {
                $model->created_at = now();
            }
        });
    }
}
