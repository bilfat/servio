<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InboxEvent extends Model
{
    protected $table = 'inbox_events';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'event_id';

    protected $fillable = [
        'event_id',
        'source_service',
        'event_type',
        'payload',
        'status',
        'error_message',
        'processed_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'processed_at' => 'datetime',
    ];
}

