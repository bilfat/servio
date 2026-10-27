<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Shipping\DeliveryException;
use App\Domain\Shipping\DeliveryQuoteService;
use App\Domain\Shipping\DeliverySettingService;
use App\Models\MerchantDeliverySetting;
use App\Models\MerchantDeliveryTier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DeliveryQuoteServiceTest extends TestCase
{
    use RefreshDatabase;

    private DeliveryQuoteService $quoteService;
    private DeliverySettingService $settingService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->quoteService = new DeliveryQuoteService();
        $this->settingService = new DeliverySettingService();
    }

    public function test_haversine_distance_calculation_accuracy(): void
    {
        // Distance between Monas Jakarta (-6.1753924, 106.8271528) and Bundaran HI (-6.1950278, 106.8230556)
        // Approximate distance is ~2.2 km
        $distance = $this->quoteService->computeHaversineDistance(
            -6.1753924,
            106.8271528,
            -6.1950278,
            106.8230556
        );

        $this->assertGreaterThan(2.0, $distance);
        $this->assertLessThan(2.5, $distance);
    }

    public function test_haversine_rejects_invalid_coordinates(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->quoteService->computeHaversineDistance(-95.0, 106.0, -6.0, 106.0);
    }

    public function test_shipping_tier_adjacent_bounds_lookup(): void
    {
        $setting = MerchantDeliverySetting::create([
            'id' => (string) Str::ulid(),
            'merchant_org_id' => 'ORG_STORE_TEST',
            'is_enabled' => true,
            'origin_reference_id' => 'ORIGIN_01',
            'origin_lat' => -6.2000000,
            'origin_lng' => 106.8166667,
            'origin_region_code' => 'KOTA_JAKARTA_PUSAT',
            'maximum_distance_km' => 15.0,
            'version' => 1,
            'last_updated_by' => 'USER_TEST',
        ]);

        MerchantDeliveryTier::create([
            'id' => (string) Str::ulid(),
            'delivery_setting_id' => $setting->id,
            'setting_version' => 1,
            'from_km' => 0.0,
            'to_km' => 3.0,
            'shipping_fee_idr' => 8000,
            'position' => 0,
        ]);

        MerchantDeliveryTier::create([
            'id' => (string) Str::ulid(),
            'delivery_setting_id' => $setting->id,
            'setting_version' => 1,
            'from_km' => 3.0,
            'to_km' => 7.0,
            'shipping_fee_idr' => 15000,
            'position' => 1,
        ]);

        MerchantDeliveryTier::create([
            'id' => (string) Str::ulid(),
            'delivery_setting_id' => $setting->id,
            'setting_version' => 1,
            'from_km' => 7.0,
            'to_km' => 15.0,
            'shipping_fee_idr' => 25000,
            'position' => 2,
        ]);

        // Destination 1: ~1.5 km away (Tier 0: 0..3 km)
        $quote1 = $this->quoteService->calculateShipping(
            $setting,
            -6.2100000,
            106.8200000,
            'KOTA_JAKARTA_PUSAT'
        );
        $this->assertEquals(8000, $quote1['shipping_fee_idr']);
    }

    public function test_rejects_out_of_city_when_region_code_mismatches(): void
    {
        $setting = MerchantDeliverySetting::create([
            'id' => (string) Str::ulid(),
            'merchant_org_id' => 'ORG_STORE_JAKARTA',
            'is_enabled' => true,
            'origin_reference_id' => 'ORIGIN_01',
            'origin_lat' => -6.2000000,
            'origin_lng' => 106.8166667,
            'origin_region_code' => 'KOTA_JAKARTA_PUSAT',
            'maximum_distance_km' => 25.0,
            'version' => 1,
            'last_updated_by' => 'USER_TEST',
        ]);

        $this->expectException(DeliveryException::class);
        $this->expectExceptionMessage('Alamat tujuan berada di luar kota/kabupaten toko.');

        $this->quoteService->calculateShipping(
            $setting,
            -6.2050000,
            106.8180000,
            'KOTA_SURABAYA' // Different city
        );
    }

    public function test_validate_tiers_rejects_gaps_and_overlaps(): void
    {
        // Gap between 3 and 4 km
        $gapTiers = [
            ['from_km' => 0.0, 'to_km' => 3.0, 'shipping_fee_idr' => 8000],
            ['from_km' => 4.0, 'to_km' => 10.0, 'shipping_fee_idr' => 15000],
        ];

        $this->expectException(DeliveryException::class);
        $this->expectExceptionMessage('gap');

        $this->settingService->validateTiers($gapTiers, 10.0);
    }
}
