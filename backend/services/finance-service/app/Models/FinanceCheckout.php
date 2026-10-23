<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class FinanceCheckout extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'checkout_group_id',
        'customer_id',
        'currency',
        'status',
        'product_subtotal_idr',
        'shipping_total_idr',
        'customer_app_fee_idr',
        'customer_tax_total_idr',
        'discount_total_idr',
        'customer_payable_total_idr',
        'pricing_policy_snapshot',
        'tax_snapshot',
        'checkout_payload_hash',
        'expires_at',
        'quoted_at',
    ];

    protected $casts = [
        'product_subtotal_idr' => 'integer',
        'shipping_total_idr' => 'integer',
        'customer_app_fee_idr' => 'integer',
        'customer_tax_total_idr' => 'integer',
        'discount_total_idr' => 'integer',
        'customer_payable_total_idr' => 'integer',
        'pricing_policy_snapshot' => 'array',
        'tax_snapshot' => 'array',
        'expires_at' => 'datetime',
        'quoted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
        });
    }

    public function paymentIntents(): HasMany
    {
        return $this->hasMany(PaymentIntent::class, 'finance_checkout_id');
    }

    public function paymentAllocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class, 'finance_checkout_id');
    }
}
