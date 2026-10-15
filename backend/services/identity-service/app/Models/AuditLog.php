<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AuditLog extends Model
{
    protected $table = 'audit_logs';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'actor_user_id',
        'event_code',
        'target_type',
        'target_id',
        'result',
        'ip_hash',
        'user_agent_hash',
        'request_id',
        'safe_metadata',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'safe_metadata' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    protected static function booted()
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->occurred_at)) {
                $model->occurred_at = now();
            }
        });
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_user_id', 'id');
    }
}
