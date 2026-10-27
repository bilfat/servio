<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MerchantDeliverySetting extends Model
{
    use HasUlids;

    protected $table = 'merchant_delivery_settings';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'merchant_org_id',
        'is_enabled',
        'origin_reference_id',
        'origin_lat',
        'origin_lng',
        'origin_region_code',
        'maximum_distance_km',
        'distance_method',
        'operational_note',
        'version',
        'last_updated_by',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'origin_lat' => 'float',
        'origin_lng' => 'float',
        'maximum_distance_km' => 'float',
        'version' => 'integer',
    ];

    public function tiers(): HasMany
    {
        return $this->hasMany(MerchantDeliveryTier::class, 'delivery_setting_id')
            ->orderBy('position', 'asc');
    }

    public function activeTiers(): HasMany
    {
        return $this->hasMany(MerchantDeliveryTier::class, 'delivery_setting_id')
            ->where('setting_version', $this->version)
            ->orderBy('position', 'asc');
    }
}
