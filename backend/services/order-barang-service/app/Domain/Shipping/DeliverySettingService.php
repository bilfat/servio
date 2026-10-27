<?php

declare(strict_types=1);

namespace App\Domain\Shipping;

use App\Models\MerchantDeliverySetting;
use App\Models\MerchantDeliveryTier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DeliverySettingService
{
    /**
     * Validate tier structure:
     * - Starts from 0.0
     * - No gaps between tiers
     * - No overlaps (from_km < to_km)
     * - Covers full maximum_distance_km
     * - Non-negative shipping fees
     */
    public function validateTiers(array $tiers, float $maxDistanceKm): void
    {
        if (empty($tiers)) {
            throw new DeliveryException('TIERS_EMPTY', 'Daftar tier ongkir tidak boleh kosong.');
        }

        // Sort by position or from_km
        usort($tiers, fn ($a, $b) => ($a['from_km'] <=> $b['from_km']));

        $currentKm = 0.0;

        foreach ($tiers as $index => $tier) {
            $from = (float) ($tier['from_km'] ?? 0.0);
            $to = (float) ($tier['to_km'] ?? 0.0);
            $fee = (int) ($tier['shipping_fee_idr'] ?? 0);

            if ($fee < 0) {
                throw new DeliveryException('TIER_NEGATIVE_FEE', "Ongkir pada tier ke-{$index} tidak boleh negatif.");
            }

            if ($from >= $to) {
                throw new DeliveryException(
                    'TIER_INVALID_BOUNDS',
                    "Tier ke-{$index} tidak valid: batas awal ({$from} km) harus lebih kecil dari batas akhir ({$to} km)."
                );
            }

            // Check gap or overlap
            if (abs($from - $currentKm) > 0.001) {
                if ($from > $currentKm) {
                    throw new DeliveryException(
                        'TIER_GAP_DETECTED',
                        "Terdapat celah jarak (gap) antara {$currentKm} km dan {$from} km pada konfigurasi tier."
                    );
                } else {
                    throw new DeliveryException(
                        'TIER_OVERLAP_DETECTED',
                        "Terdapat tumpang tindih (overlap) jarak pada tier ke-{$index} ({$from} km vs batas sebelumnya {$currentKm} km)."
                    );
                }
            }

            $currentKm = $to;
        }

        // Check if full coverage covers maximum_distance_km
        if ($currentKm < $maxDistanceKm - 0.001) {
            throw new DeliveryException(
                'TIER_INSUFFICIENT_COVERAGE',
                "Tier ongkir hanya mencakup hingga {$currentKm} km, belum menutup jangkauan maksimum ({$maxDistanceKm} km)."
            );
        }
    }

    /**
     * Update merchant delivery settings with version guard and historical tiers preservation.
     */
    public function updateSettings(
        string $merchantOrgId,
        bool $isEnabled,
        float $maxDistanceKm,
        array $tiers,
        ?string $operationalNote,
        string $actorId,
        ?int $expectedVersion = null,
        ?array $officialOrigin = null
    ): MerchantDeliverySetting {
        $this->validateTiers($tiers, $maxDistanceKm);

        return DB::transaction(function () use (
            $merchantOrgId,
            $isEnabled,
            $maxDistanceKm,
            $tiers,
            $operationalNote,
            $actorId,
            $expectedVersion,
            $officialOrigin
        ) {
            $setting = MerchantDeliverySetting::where('merchant_org_id', $merchantOrgId)
                ->lockForUpdate()
                ->first();

            if ($setting) {
                if ($expectedVersion !== null && $setting->version !== $expectedVersion) {
                    throw new DeliveryException(
                        'VERSION_CONFLICT',
                        "Pengaturan pengiriman telah diubah oleh pihak lain (versi terkini: {$setting->version}).",
                        409
                    );
                }

                $newVersion = $setting->version + 1;

                $updateData = [
                    'is_enabled' => $isEnabled,
                    'maximum_distance_km' => $maxDistanceKm,
                    'operational_note' => $operationalNote,
                    'version' => $newVersion,
                    'last_updated_by' => $actorId,
                ];

                // If official origin passed, update origin reference
                if ($officialOrigin) {
                    $updateData['origin_reference_id'] = $officialOrigin['reference_id'] ?? $setting->origin_reference_id;
                    $updateData['origin_lat'] = $officialOrigin['lat'] ?? $officialOrigin['latitude'] ?? $setting->origin_lat;
                    $updateData['origin_lng'] = $officialOrigin['lng'] ?? $officialOrigin['longitude'] ?? $setting->origin_lng;
                    $updateData['origin_region_code'] = $officialOrigin['region_code'] ?? $setting->origin_region_code;
                }

                $setting->update($updateData);
            } else {
                $newVersion = 1;
                $setting = MerchantDeliverySetting::create([
                    'id' => (string) Str::ulid(),
                    'merchant_org_id' => $merchantOrgId,
                    'is_enabled' => $isEnabled,
                    'origin_reference_id' => $officialOrigin['reference_id'] ?? 'ORIGIN_' . $merchantOrgId,
                    'origin_lat' => $officialOrigin['lat'] ?? $officialOrigin['latitude'] ?? -6.2000000,
                    'origin_lng' => $officialOrigin['lng'] ?? $officialOrigin['longitude'] ?? 106.8166667,
                    'origin_region_code' => $officialOrigin['region_code'] ?? 'KOTA_JAKARTA_PUSAT',
                    'maximum_distance_km' => $maxDistanceKm,
                    'distance_method' => 'HAVERSINE',
                    'operational_note' => $operationalNote,
                    'version' => $newVersion,
                    'last_updated_by' => $actorId,
                ]);
            }

            // Insert new version tiers
            usort($tiers, fn ($a, $b) => ($a['from_km'] <=> $b['from_km']));
            foreach ($tiers as $position => $tier) {
                MerchantDeliveryTier::create([
                    'id' => (string) Str::ulid(),
                    'delivery_setting_id' => $setting->id,
                    'setting_version' => $newVersion,
                    'from_km' => (float) $tier['from_km'],
                    'to_km' => (float) $tier['to_km'],
                    'shipping_fee_idr' => (int) $tier['shipping_fee_idr'],
                    'position' => (int) ($tier['position'] ?? $position),
                ]);
            }

            return $setting->fresh(['activeTiers']);
        });
    }
}
