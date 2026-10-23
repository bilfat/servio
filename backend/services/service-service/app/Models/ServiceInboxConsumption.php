<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ServiceInboxConsumption extends Model
{
    use HasUuids;

    protected $table = 'service_inbox_consumptions';

    protected $fillable = [
        'id',
        'source_service',
        'event_id',
        'aggregate_id',
        'aggregate_version',
        'payload_hash',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'aggregate_version' => 'integer',
            'processed_at' => 'datetime',
        ];
    }
}
