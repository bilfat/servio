<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IdempotencyRecord extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    /**
     * Idempotency Ledger: System managed internal table.
     */
    protected $guarded = ['*'];
    protected $fillable = [];

    protected $casts = [
        'response_status' => 'integer',
        'fencing_version' => 'integer',
        'payload_size_bytes' => 'integer',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
