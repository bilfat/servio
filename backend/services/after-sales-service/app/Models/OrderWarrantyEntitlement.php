<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class OrderWarrantyEntitlement extends Model
{
    protected $table = 'order_warranty_entitlements';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'source_kind',
        'order_id',
        'merchant_order_id',
        'order_number',
        'order_item_key',
        'customer_id',
        'owner_org_type',
        'owner_org_id',
        'organization_name',
        'catalog_ref',
        'item_title',
        'item_image_url',
        'warranty_option_version_id',
        'snapshot_name',
        'snapshot_duration_days',
        'snapshot_coverage',
        'snapshot_exclusion',
        'catalog_snapshot',
        'quantity',
        'claimed_quantity',
        'status',
        'ordered_at',
        'source_completed_at',
        'starts_at',
        'expires_at',
        'source_event_id',
    ];

    protected $casts = [
        'snapshot_duration_days' => 'integer',
        'quantity' => 'integer',
        'claimed_quantity' => 'integer',
        'ordered_at' => 'datetime',
        'source_completed_at' => 'datetime',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'catalog_snapshot' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (OrderWarrantyEntitlement $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function cases(): HasMany
    {
        return $this->hasMany(AfterSalesCase::class, 'entitlement_id');
    }

    public function isCurrentlyActive(): bool
    {
        if ($this->status !== 'ACTIVE') {
            return false;
        }

        if ($this->expires_at && now()->isAfter($this->expires_at)) {
            return false;
        }

        return $this->remaining_quantity > 0;
    }

    public function getRemainingQuantityAttribute(): int
    {
        $qty = (int) ($this->quantity ?: 1);
        return max(0, $qty - (int) ($this->claimed_quantity ?? 0));
    }

    public function isClaimEligible(): bool
    {
        return $this->isCurrentlyActive() && $this->remaining_quantity > 0;
    }
}

