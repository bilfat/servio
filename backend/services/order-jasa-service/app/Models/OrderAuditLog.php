<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderAuditLog extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    /**
     * Audit Log Record: Append-only immutable log.
     */
    protected $guarded = ['*'];
    protected $fillable = [];

    protected $casts = [
        'old_version' => 'integer',
        'new_version' => 'integer',
        'created_at' => 'datetime',
    ];
}
