<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductStockAdjustment extends Model
{
    use HasFactory;

    protected $table = 'product_stock_adjustments';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'product_id',
        'variant_id',
        'actor_user_id',
        'actor_org_id',
        'before_qty',
        'delta_qty',
        'after_qty',
        'reason_code',
        'note',
        'operation_id',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'before_qty' => 'integer',
            'delta_qty' => 'integer',
            'after_qty' => 'integer',
            'occurred_at' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
