<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class OrderItem extends Model
{
    use HasUlids;

    protected $table = 'order_items';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'order_id',
        'product_id',
        'variant_id',
        'product_snapshot',
        'variant_snapshot',
        'product_image_ref',
        'quantity',
        'unit_price_idr',
        'line_subtotal_idr',
    ];

    protected $casts = [
        'product_snapshot' => 'array',
        'variant_snapshot' => 'array',
        'quantity' => 'integer',
        'unit_price_idr' => 'integer',
        'line_subtotal_idr' => 'integer',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function reservation(): HasOne
    {
        return $this->hasOne(OrderStockReservation::class, 'order_item_id');
    }
}
