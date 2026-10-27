<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    use HasUlids;

    protected $table = 'orders';
    protected $keyType = 'string';
    public $incrementing = false;

    // Canonical Statuses
    public const STATUS_CREATED = 'CREATED';
    public const STATUS_PAYMENT_PENDING = 'PAYMENT_PENDING';
    public const STATUS_CONFIRMED = 'CONFIRMED';
    public const STATUS_PROCESSING = 'PROCESSING';
    public const STATUS_PACKED = 'PACKED';
    public const STATUS_DELIVERING = 'DELIVERING';
    public const STATUS_DELIVERED = 'DELIVERED';
    public const STATUS_COMPLETED = 'COMPLETED';
    public const STATUS_CANCELLED = 'CANCELLED';

    protected $fillable = [
        'id',
        'order_number',
        'checkout_group_id',
        'customer_id',
        'merchant_org_id',
        'merchant_display_snapshot',
        'address_id',
        'recipient_snapshot',
        'address_snapshot',
        'origin_snapshot',
        'shipping_snapshot',
        'product_subtotal_idr',
        'shipping_customer_idr',
        'app_fee_allocated_idr',
        'customer_tax_allocated_idr',
        'discount_allocated_idr',
        'discount_bearer',
        'customer_total_idr',
        'finance_allocation_reference',
        'payment_status_projection',
        'status',
        'active_cancellation_request_id',
        'is_hold_active',
        'hold_reason',
        'hold_sequence',
        'hold_applied_at',
        'hold_event_id',
        'hold_source_service',
        'notes',
        'delivered_at',
        'completed_at',
        'cancelled_at',
        'cancel_reason_code',
        'version',
    ];

    protected $casts = [
        'merchant_display_snapshot' => 'array',
        'recipient_snapshot' => 'array',
        'address_snapshot' => 'array',
        'origin_snapshot' => 'array',
        'shipping_snapshot' => 'array',
        'product_subtotal_idr' => 'integer',
        'shipping_customer_idr' => 'integer',
        'app_fee_allocated_idr' => 'integer',
        'customer_tax_allocated_idr' => 'integer',
        'discount_allocated_idr' => 'integer',
        'customer_total_idr' => 'integer',
        'is_hold_active' => 'boolean',
        'hold_sequence' => 'integer',
        'hold_applied_at' => 'datetime',
        'delivered_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'version' => 'integer',
    ];

    public function checkoutGroup(): BelongsTo
    {
        return $this->belongsTo(CheckoutGroup::class, 'checkout_group_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'order_id');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class, 'order_id')->orderBy('occurred_at', 'asc');
    }

    public function delivery(): HasOne
    {
        return $this->hasOne(Delivery::class, 'order_id');
    }

    public function cancellationRequests(): HasMany
    {
        return $this->hasMany(CancellationRequest::class, 'order_id')->orderBy('requested_at', 'desc');
    }

    public function activeCancellationRequest(): BelongsTo
    {
        return $this->belongsTo(CancellationRequest::class, 'active_cancellation_request_id');
    }

    public function stockReservations(): HasMany
    {
        return $this->hasMany(OrderStockReservation::class, 'order_id');
    }

    // Customer tab filters
    public function scopeForCustomerTab(Builder $query, ?string $tab): Builder
    {
        if (empty($tab)) {
            return $query;
        }

        return match (strtolower($tab)) {
            'unpaid' => $query->whereIn('status', [self::STATUS_CREATED, self::STATUS_PAYMENT_PENDING]),
            'processing' => $query->whereIn('status', [self::STATUS_CONFIRMED, self::STATUS_PROCESSING, self::STATUS_PACKED]),
            'shipping' => $query->where('status', self::STATUS_DELIVERING),
            'delivered', 'tiba' => $query->where('status', self::STATUS_DELIVERED),
            'completed' => $query->where('status', self::STATUS_COMPLETED),
            'cancelled' => $query->where('status', self::STATUS_CANCELLED),
            default => $query,
        };
    }

    // Merchant tab filters
    public function scopeForMerchantTab(Builder $query, ?string $tab): Builder
    {
        if (empty($tab) || strtolower($tab) === 'all') {
            return $query;
        }

        return match (strtolower($tab)) {
            'unpaid', 'pending', 'belum_bayar' => $query->whereIn('status', [self::STATUS_CREATED, self::STATUS_PAYMENT_PENDING]),
            'incoming' => $query->where('status', self::STATUS_CONFIRMED),
            'processing' => $query->whereIn('status', [self::STATUS_PROCESSING, self::STATUS_PACKED]),
            'shipping' => $query->where('status', self::STATUS_DELIVERING),
            'delivered', 'tiba' => $query->where('status', self::STATUS_DELIVERED),
            'completed' => $query->where('status', self::STATUS_COMPLETED),
            'cancelled' => $query->where('status', self::STATUS_CANCELLED)
                ->whereNotIn('payment_status_projection', ['UNPAID', 'PENDING']),
            default => $query,
        };
    }
}
