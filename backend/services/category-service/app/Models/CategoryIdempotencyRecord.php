<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CategoryIdempotencyRecord extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'category_idempotency_records';

    protected $fillable = [
        'id',
        'actor_user_id',
        'idempotency_key',
        'request_hash',
        'response_status',
        'response_body',
        'expires_at',
    ];

    protected $casts = [
        'response_status' => 'integer',
        'response_body' => 'array',
        'expires_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
        'created_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
        'updated_at' => 'datetime:Y-m-d\TH:i:s.up\Z',
    ];
}
