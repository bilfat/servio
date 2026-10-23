<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ServiceIdempotencyRecord extends Model
{
    use HasUuids;

    protected $table = 'service_idempotency_records';

    protected $fillable = [
        'id',
        'actor_key',
        'route_key',
        'idempotency_key',
        'request_hash',
        'response_status',
        'response_body',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'response_status' => 'integer',
            'expires_at' => 'datetime',
        ];
    }
}
