<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class HeldOrderFund extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'payment_allocation_id',
        'status',
        'gross_held_idr',
        'merchant_entitlement_idr',
        'completed_at',
        'eligible_release_at',
        'hold_reason_code',
        'hold_source',
        'released_at',
        'refunded_at',
        'order_event_version',
    ];

    protected $casts = [
        'gross_held_idr' => 'integer',
        'merchant_entitlement_idr' => 'integer',
        'completed_at' => 'datetime',
        'eligible_release_at' => 'datetime',
        'released_at' => 'datetime',
        'refunded_at' => 'datetime',
        'order_event_version' => 'integer',
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
}
