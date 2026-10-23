<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class WithdrawalRequest extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'spay_account_id',
        'bank_destination_id',
        'requested_by_user_id',
        'requested_amount_idr',
        'transfer_fee_idr',
        'net_to_bank_idr',
        'status',
        'idempotency_key_hash',
        'provider',
        'provider_reference',
        'step_up_proof_reference',
        'bank_snapshot_masked',
        'initiated_at',
        'completed_at',
        'failure_code',
    ];

    protected $casts = [
        'requested_amount_idr' => 'integer',
        'transfer_fee_idr' => 'integer',
        'net_to_bank_idr' => 'integer',
        'bank_snapshot_masked' => 'array',
        'initiated_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(SPayAccount::class, 'spay_account_id');
    }

    public function spayAccount(): BelongsTo
    {
        return $this->account();
    }

    public function bankDestination(): BelongsTo
    {
        return $this->belongsTo(BankDestination::class, 'bank_destination_id');
    }

    public function payoutEvents(): HasMany
    {
        return $this->hasMany(PayoutEvent::class, 'withdrawal_request_id');
    }
}
