<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IntegrationInboxEvent extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    /**
     * Integration Inbox: Strictly system managed.
     */
    protected $guarded = ['*'];
    protected $fillable = [];

    protected $casts = [
        'schema_version' => 'integer',
        'received_at' => 'datetime',
        'processed_at' => 'datetime',
    ];
}
