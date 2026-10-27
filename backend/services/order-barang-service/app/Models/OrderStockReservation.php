<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderStockReservation extends Model
{
    use HasUlids;

    protected $table = 'order_stock_reservations';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'order_id',
        'order_item_id',
        'variant_id',
        'remote_reservation_id',
        'quantity',
        'reservation_status',
        'reserved_until',
        'last_sync_at',
        'attempt_count',
        'last_error_code',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'attempt_count' => 'integer',
        'reserved_until' => 'datetime',
        'last_sync_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class, 'order_item_id');
    }
}
