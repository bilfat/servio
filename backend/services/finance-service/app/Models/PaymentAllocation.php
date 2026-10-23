<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class PaymentAllocation extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'finance_checkout_id',
        'merchant_order_id',
        'merchant_org_id',
        'customer_id',
        'product_subtotal_idr',
        'shipping_customer_idr',
        'app_fee_allocated_idr',
        'customer_tax_allocated_idr',
        'discount_allocated_idr',
        'customer_total_idr',
        'merchant_commission_idr',
        'merchant_tax_or_withholding_idr',
        'merchant_net_entitlement_idr',
        'fee_snapshot',
        'allocation_rank',
        'status',
    ];

    protected $casts = [
        'product_subtotal_idr' => 'integer',
        'shipping_customer_idr' => 'integer',
        'app_fee_allocated_idr' => 'integer',
        'customer_tax_allocated_idr' => 'integer',
        'discount_allocated_idr' => 'integer',
        'customer_total_idr' => 'integer',
        'merchant_commission_idr' => 'integer',
        'merchant_tax_or_withholding_idr' => 'integer',
        'merchant_net_entitlement_idr' => 'integer',
        'fee_snapshot' => 'array',
        'allocation_rank' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
        });
    }

    public function checkout(): BelongsTo
    {
        return $this->belongsTo(FinanceCheckout::class, 'finance_checkout_id');
    }

    public function heldFund(): HasOne
    {
        return $this->hasOne(HeldOrderFund::class, 'payment_allocation_id');
    }

    public function refundTransaction(): HasOne
    {
        return $this->hasOne(RefundTransaction::class, 'payment_allocation_id');
    }
}
