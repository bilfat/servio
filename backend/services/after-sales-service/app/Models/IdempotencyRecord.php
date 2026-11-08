<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class IdempotencyRecord extends Model
{
    use HasUlids;

    protected $table = 'idempotency_records';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'scope_key',
        'payload_hash',
        'response_status',
        'response_headers_json',
        'response_body_json',
        'status',
        'generation',
        'locked_at',
    ];

    protected $casts = [
        'generation' => 'integer',
        'response_status' => 'integer',
        'response_headers_json' => 'array',
        'response_body_json' => 'array',
        'locked_at' => 'datetime',
    ];
}

