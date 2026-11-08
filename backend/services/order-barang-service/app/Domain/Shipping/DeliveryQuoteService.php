<?php

declare(strict_types=1);

namespace App\Domain\Shipping;

use App\Models\MerchantDeliverySetting;
use App\Models\MerchantDeliveryTier;
use InvalidArgumentException;

class DeliveryQuoteService
{
    private const EARTH_RADIUS_KM = 6371.0088;

    /**
     * Compute geographical distance using Haversine formula.
     */
    public function computeHaversineDistance(
        float $lat1,
        float $lng1,
        float $lat2,
        float $lng2
    ): float {
        // Validate coordinates
        if ($lat1 < -90.0 || $lat1 > 90.0 || $lat2 < -90.0 || $lat2 > 90.0) {
            throw new InvalidArgumentException('Latitude harus berada pada rentang -90 hingga 90 derajat.');
        }
        if ($lng1 < -180.0 || $lng1 > 180.0 || $lng2 < -180.0 || $lng2 > 180.0) {
            throw new InvalidArgumentException('Longitude harus berada pada rentang -180 hingga 180 derajat.');
        }

        $latDelta = deg2rad($lat2 - $lat1);
        $lngDelta = deg2rad($lng2 - $lng1);

        $a = sin($latDelta / 2) ** 2 +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * (sin($lngDelta / 2) ** 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        // Round to 3 decimal places (meters precision)
        return round(self::EARTH_RADIUS_KM * $c, 3);
    }

    /**
     * Calculate shipping fee based on distance and merchant active delivery tiers.
     *
     * @return array{distance_km: float, shipping_fee_idr: int, tier_id: string, distance_method: string}
     */
    public function calculateShipping(
        MerchantDeliverySetting $setting,
        float $destLat,
        float $destLng,
        ?string $destRegionCode = null
    ): array {
        if (!$setting->is_enabled) {
            throw new DeliveryException('DELIVERY_DISABLED', 'Pengiriman lokal oleh toko ini sedang nonaktif.');
        }

        if ($setting->origin_lat === null || $setting->origin_lng === null) {
            throw new DeliveryException('ORIGIN_COORDINATES_MISSING', 'Titik lokasi toko belum dikonfigurasi.');
        }

        $distanceKm = $this->computeHaversineDistance(
            (float) $setting->origin_lat,
            (float) $setting->origin_lng,
            $destLat,
            $destLng
        );

        $effectiveMaxKm = min((float) $setting->maximum_distance_km, 80.0);

        if ($distanceKm > $effectiveMaxKm) {
            throw new DeliveryException(
                'DELIVERY_OUT_OF_RANGE',
                "Jarak pengiriman ({$distanceKm} km) melebihi jangkauan maksimum toko ({$effectiveMaxKm} km)."
            );
        }

        // Find matching tier
        $tiers = $setting->activeTiers()->get();
        if ($tiers->isEmpty()) {
            throw new DeliveryException('TIERS_NOT_CONFIGURED', 'Tarif ongkir toko belum dikonfigurasi.');
        }

        $matchedTier = null;
        foreach ($tiers as $tier) {
            $from = (float) $tier->from_km;
            $to = (float) $tier->to_km;

            // First tier (position 0 or from 0): 0 <= distance <= to
            if ($tier->position === 0 || $from === 0.0) {
                if ($distanceKm >= 0.0 && $distanceKm <= $to) {
                    $matchedTier = $tier;
                    break;
                }
            } else {
                // Subsequent tiers: from < distance <= to
                if ($distanceKm > $from && $distanceKm <= $to) {
                    $matchedTier = $tier;
                    break;
                }
            }
        }

        if (!$matchedTier) {
            throw new DeliveryException(
                'TIER_NOT_COVERED',
                "Jarak pengiriman ({$distanceKm} km) tidak tercakup dalam tier ongkir toko."
            );
        }

        return [
            'distance_km' => $distanceKm,
            'shipping_fee_idr' => (int) $matchedTier->shipping_fee_idr,
            'tier_id' => $matchedTier->id,
            'distance_method' => $setting->distance_method ?? 'HAVERSINE',
        ];
    }
}
