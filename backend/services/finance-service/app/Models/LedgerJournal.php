<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class LedgerJournal extends Model
{
    public $incrementing = false;
    public $timestamps = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'journal_type',
        'source_type',
        'source_id',
        'payment_intent_id',
        'refund_transaction_id',
        'withdrawal_request_id',
        'currency',
        'posted_at',
        'description',
        'created_at',
    ];

    protected $casts = [
        'posted_at' => 'datetime',
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

    public function lines(): HasMany
    {
        return $this->hasMany(LedgerLine::class, 'ledger_journal_id');
    }

    public function paymentIntent(): BelongsTo
    {
        return $this->belongsTo(PaymentIntent::class, 'payment_intent_id');
    }

    public function refundTransaction(): BelongsTo
    {
        return $this->belongsTo(RefundTransaction::class, 'refund_transaction_id');
    }

    public function withdrawalRequest(): BelongsTo
    {
        return $this->belongsTo(WithdrawalRequest::class, 'withdrawal_request_id');
    }
}
