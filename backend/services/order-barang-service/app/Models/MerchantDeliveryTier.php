<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchantDeliveryTier extends Model
{
    use HasUlids;

    protected $table = 'merchant_delivery_tiers';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'delivery_setting_id',
        'setting_version',
        'from_km',
        'to_km',
        'shipping_fee_idr',
        'position',
    ];

    protected $casts = [
        'setting_version' => 'integer',
        'from_km' => 'float',
        'to_km' => 'float',
        'shipping_fee_idr' => 'integer',
        'position' => 'integer',
    ];

    public function setting(): BelongsTo
    {
        return $this->belongsTo(MerchantDeliverySetting::class, 'delivery_setting_id');
    }
}
