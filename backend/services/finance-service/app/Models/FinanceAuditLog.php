<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class FinanceAuditLog extends Model
{
    public $incrementing = false;
    public $timestamps = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'actor_user_id',
        'actor_service',
        'action',
        'subject_type',
        'subject_id',
        'result',
        'before_state',
        'after_state',
        'reason_code',
        'correlation_id',
        'ip_hash',
        'created_at',
    ];

    protected $casts = [
        'before_state' => 'array',
        'after_state' => 'array',
        'created_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
            if (empty($model->created_at)) {
                $model->created_at = now();
            }
        });
    }
}
