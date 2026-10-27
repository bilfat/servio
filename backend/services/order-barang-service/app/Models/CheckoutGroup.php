<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CheckoutGroup extends Model
{
    use HasUlids;

    protected $table = 'checkout_groups';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'customer_id',
        'address_id',
        'recipient_snapshot',
        'address_snapshot',
        'selected_items_hash',
        'selected_cart_item_ids',
        'idempotency_key',
        'quote_revision',
        'orchestration_status',
        'payment_status_projection',
        'finance_quote_hash',
        'finance_payment_id',
        'customer_total_idr',
        'currency',
        'finance_expires_at',
        'failure_code',
        'version',
    ];

    protected $casts = [
        'recipient_snapshot' => 'array',
        'address_snapshot' => 'array',
        'selected_cart_item_ids' => 'array',
        'quote_revision' => 'integer',
        'customer_total_idr' => 'integer',
        'finance_expires_at' => 'datetime',
        'version' => 'integer',
    ];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'checkout_group_id');
    }

    public function paymentProjection(): HasOne
    {
        return $this->hasOne(PaymentProjection::class, 'checkout_group_id');
    }
}
