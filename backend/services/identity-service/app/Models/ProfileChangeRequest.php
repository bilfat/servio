<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ProfileChangeRequest extends Model
{
    protected $table = 'profile_change_requests';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'target_type',
        'target_id',
        'requested_fields_ciphertext',
        'status',
        'reviewed_by',
        'review_reason',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
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

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by', 'id');
    }

    public function getRequestedFieldsAttribute(): array
    {
        if (empty($this->requested_fields_ciphertext)) {
            return [];
        }
        try {
            $dec = \Illuminate\Support\Facades\Crypt::decryptString($this->requested_fields_ciphertext);
            return json_decode($dec, true) ?: [];
        } catch (\Throwable $e) {
            return json_decode($this->requested_fields_ciphertext, true) ?: [];
        }
    }
}
