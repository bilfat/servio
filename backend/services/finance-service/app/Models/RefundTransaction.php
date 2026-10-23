<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class RefundTransaction extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'payment_allocation_id',
        'payment_intent_id',
        'customer_spay_account_id',
        'refund_reason_scope',
        'order_cancellation_event_id',
        'requested_amount_idr',
        'funded_amount_idr',
        'credited_amount_idr',
        'status',
        'source_funding_reference',
        'funded_at',
        'credited_at',
        'failure_code',
    ];

    protected $casts = [
        'requested_amount_idr' => 'integer',
        'funded_amount_idr' => 'integer',
        'credited_amount_idr' => 'integer',
        'funded_at' => 'datetime',
        'credited_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
        });
    }

    public function allocation(): BelongsTo
    {
        return $this->belongsTo(PaymentAllocation::class, 'payment_allocation_id');
    }

    public function paymentAllocation(): BelongsTo
    {
        return $this->allocation();
    }

    public function intent(): BelongsTo
    {
        return $this->belongsTo(PaymentIntent::class, 'payment_intent_id');
    }

    public function customerSPayAccount(): BelongsTo
    {
        return $this->belongsTo(SPayAccount::class, 'customer_spay_account_id');
    }
}
