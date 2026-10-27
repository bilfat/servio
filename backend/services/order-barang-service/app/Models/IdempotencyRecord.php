<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class IdempotencyRecord extends Model
{
    use HasUlids;

    protected $table = 'idempotency_records';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'actor_scope',
        'route_key',
        'idempotency_key',
        'request_hash',
        'response_status',
        'response_body',
        'state',
        'created_at',
        'expires_at',
    ];

    protected $casts = [
        'response_status' => 'integer',
        'response_body' => 'array',
        'created_at' => 'datetime',
        'expires_at' => 'datetime',
    ];
}
