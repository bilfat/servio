<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserPresence extends Model
{
    use HasFactory;

    protected $primaryKey = 'user_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'is_online',
        'active_conversation_id',
        'last_seen_at',
    ];

    protected $casts = [
        'is_online' => 'boolean',
        'last_seen_at' => 'datetime',
    ];
}
