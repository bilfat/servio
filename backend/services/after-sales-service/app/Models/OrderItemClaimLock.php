<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class OrderItemClaimLock extends Model
{
    protected $table = 'order_item_claim_locks';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'source_order_id',
        'source_merchant_order_id',
        'source_item_ref',
        'total_ordered_quantity',
        'total_claimed_quantity',
        'version',
    ];

    protected $casts = [
        'total_ordered_quantity' => 'integer',
        'total_claimed_quantity' => 'integer',
        'version' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (OrderItemClaimLock $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }
}

