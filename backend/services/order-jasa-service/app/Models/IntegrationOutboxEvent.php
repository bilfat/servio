<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IntegrationOutboxEvent extends Model
{
    public $incrementing = false;
    protected $primaryKey = 'event_id';
    protected $keyType = 'string';
    public $timestamps = false;

    /**
     * Integration Outbox: Strictly system managed.
     */
    protected $guarded = ['*'];
    protected $fillable = [];

    protected $casts = [
        'aggregate_version' => 'integer',
        'schema_version' => 'integer',
        'payload_json' => 'array',
        'attempts' => 'integer',
        'next_retry_at' => 'datetime',
        'locked_until' => 'datetime',
        'delivered_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
