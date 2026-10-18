<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CategoryOutboxEvent extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'category_outbox_events';

    protected $fillable = [
        'id',
        'event_type',
        'aggregate_type',
        'aggregate_id',
        'aggregate_version',
        'payload',
        'correlation_id',
        'occurred_at',
        'published_at',
        'attempts',
    ];

    protected $casts = [
        'payload' => 'array',
        'aggregate_version' => 'integer',
        'attempts' => 'integer',
        'occurred_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
        'published_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
        'created_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
        'updated_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
    ];
}
