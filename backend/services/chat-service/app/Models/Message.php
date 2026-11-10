<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id',
        'conversation_id',
        'sender_id',
        'sender_entity_type',
        'client_msg_id',
        'type',
        'body',
        'media_url',
        'context_metadata',
        'status',
        'read_at',
    ];

    protected $casts = [
        'context_metadata' => 'array',
        'read_at' => 'datetime',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
