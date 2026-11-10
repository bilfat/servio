<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConversationParticipant extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id',
        'conversation_id',
        'user_id',
        'entity_type',
        'entity_id',
        'display_name',
        'avatar_url',
        'unread_count',
        'last_read_at',
        'is_pinned',
    ];

    protected $casts = [
        'unread_count' => 'integer',
        'last_read_at' => 'datetime',
        'is_pinned' => 'boolean',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
