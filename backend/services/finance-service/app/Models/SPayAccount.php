<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class SPayAccount extends Model
{
    protected $table = 'spay_accounts';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'owner_type',
        'owner_external_id',
        'currency',
        'available_idr',
        'withdrawal_locked_idr',
        'account_status',
        'last_movement_at',
    ];

    protected $casts = [
        'available_idr' => 'integer',
        'withdrawal_locked_idr' => 'integer',
        'last_movement_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
        });
    }

    public function movements(): HasMany
    {
        return $this->hasMany(SPayMovement::class, 'spay_account_id');
    }

    public function withdrawals(): HasMany
    {
        return $this->hasMany(WithdrawalRequest::class, 'spay_account_id');
    }
}
