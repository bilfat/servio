<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class IdempotencyRecord extends Model
{
    protected $table = 'idempotency_records';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'actor_user_id',
        'actor_bucket',
        'scope',
        'idempotency_key',
        'request_hash',
        'response_status',
        'response_json',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'response_json' => 'array',
            'expires_at' => 'datetime',
            'response_status' => 'integer',
        ];
    }

    protected static function booted()
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_user_id', 'id');
    }
}
