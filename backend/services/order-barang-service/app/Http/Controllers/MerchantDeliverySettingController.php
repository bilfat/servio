<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Shipping\DeliveryQuoteService;
use App\Domain\Shipping\DeliverySettingService;
use App\Infrastructure\Identity\IdentityAddressClient;
use App\Models\MerchantDeliverySetting;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MerchantDeliverySettingController extends Controller
{
    public function __construct(
        protected DeliverySettingService $deliverySettingService,
        protected IdentityAddressClient $identityClient,
        protected DeliveryQuoteService $quoteService
    ) {}

    public function show(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $setting = MerchantDeliverySetting::where('merchant_org_id', $actor->organizationId)
            ->first();

        $originInfo = $this->identityClient->getMerchantOrigin($actor->organizationId);
        $storeName = $originInfo['name'] ?? null;
        $addressLine = $originInfo['address_line'] ?? null;
        $cityName = $originInfo['city'] ?? null;

        if (!$setting) {
            // Default response if not configured yet
            return ApiResponse::success([
                'merchant_org_id' => $actor->organizationId,
                'merchant_name' => $storeName,
                'store_name' => $storeName,
                'address' => $addressLine,
                'address_line' => $addressLine,
                'city' => $cityName,
                'origin_lat' => $originInfo['latitude'] ?? -6.2000000,
                'origin_lng' => $originInfo['longitude'] ?? 106.8166667,
                'origin_region_code' => $originInfo['region_code'] ?? 'KOTA_JAKARTA_PUSAT',
                'is_enabled' => false,
                'maximum_distance_km' => 25.0,
                'distance_method' => 'HAVERSINE',
                'operational_note' => null,
                'version' => 0,
                'tiers' => [],
            ], 'DELIVERY_SETTINGS_DEFAULT');
        }

        $tiers = \App\Models\MerchantDeliveryTier::where('delivery_setting_id', $setting->id)
            ->where('setting_version', $setting->version)
            ->orderBy('position', 'asc')
            ->get();

        if (!$cityName && $setting->origin_region_code) {
            $cityName = ucwords(strtolower(str_replace(['KOTA_', '_'], ['', ' '], (string) $setting->origin_region_code)));
        }

        return ApiResponse::success([
            'id' => $setting->id,
            'merchant_org_id' => $setting->merchant_org_id,
            'merchant_name' => $storeName,
            'store_name' => $storeName,
            'address' => $addressLine,
            'address_line' => $addressLine,
            'city' => $cityName,
            'is_enabled' => $setting->is_enabled,
            'origin_reference_id' => $setting->origin_reference_id,
            'origin_lat' => $originInfo['latitude'] ?? $setting->origin_lat,
            'origin_lng' => $originInfo['longitude'] ?? $setting->origin_lng,
            'origin_region_code' => $setting->origin_region_code,
            'maximum_distance_km' => $setting->maximum_distance_km,
            'distance_method' => $setting->distance_method,
            'operational_note' => $setting->operational_note,
            'version' => $setting->version,
            'tiers' => $tiers,
        ], 'DELIVERY_SETTINGS_LOADED');
    }

    public function update(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'is_enabled' => 'required|boolean',
            'maximum_distance_km' => 'required|numeric|min:0.1|max:100',
            'tiers' => 'required|array|min:1',
            'tiers.*.from_km' => 'required|numeric|min:0',
            'tiers.*.to_km' => 'required|numeric|gt:tiers.*.from_km',
            'tiers.*.shipping_fee_idr' => 'required|integer|min:0',
            'tiers.*.position' => 'nullable|integer',
            'operational_note' => 'nullable|string|max:1000',
            'expected_version' => 'nullable|integer',
        ]);

        // Official origin coordinates must be fetched from Identity Service (do not accept arbitrary coordinates from client)
        $officialOrigin = $this->identityClient->getMerchantOrigin($actor->organizationId);

        $setting = $this->deliverySettingService->updateSettings(
            merchantOrgId: $actor->organizationId,
            isEnabled: (bool) $validated['is_enabled'],
            maxDistanceKm: (float) $validated['maximum_distance_km'],
            tiers: $validated['tiers'],
            operationalNote: $validated['operational_note'] ?? null,
            actorId: $actor->id,
            expectedVersion: isset($validated['expected_version']) ? (int) $validated['expected_version'] : null,
            officialOrigin: $officialOrigin
        );

        $tiers = \App\Models\MerchantDeliveryTier::where('delivery_setting_id', $setting->id)
            ->where('setting_version', $setting->version)
            ->orderBy('position', 'asc')
            ->get();

        $storeName = $officialOrigin['name'] ?? null;
        $addressLine = $officialOrigin['address_line'] ?? null;
        $cityName = $officialOrigin['city'] ?? ucwords(strtolower(str_replace(['KOTA_', '_'], ['', ' '], (string) $setting->origin_region_code)));

        return ApiResponse::success([
            'id' => $setting->id,
            'merchant_org_id' => $setting->merchant_org_id,
            'merchant_name' => $storeName,
            'store_name' => $storeName,
            'address' => $addressLine,
            'address_line' => $addressLine,
            'city' => $cityName,
            'is_enabled' => $setting->is_enabled,
            'origin_lat' => $setting->origin_lat,
            'origin_lng' => $setting->origin_lng,
            'origin_region_code' => $setting->origin_region_code,
            'maximum_distance_km' => $setting->maximum_distance_km,
            'version' => $setting->version,
            'tiers' => $tiers,
        ], 'DELIVERY_SETTINGS_UPDATED');
    }

    /**
     * Public calculation of distance and delivery availability based on merchant radius settings.
     */
    public function checkDelivery(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'merchant_org_id' => 'required|string',
            'dest_lat' => 'nullable|numeric',
            'dest_lng' => 'nullable|numeric',
            'dest_city' => 'nullable|string',
        ]);

        $merchantOrgId = (string) $validated['merchant_org_id'];
        $setting = MerchantDeliverySetting::where('merchant_org_id', $merchantOrgId)->first();

        $originInfo = $this->identityClient->getMerchantOrigin($merchantOrgId);
        $storeName = $originInfo['name'] ?? null;
        $cityName = $originInfo['city'] ?? null;

        if (!$cityName && $setting?->origin_region_code) {
            $cityName = ucwords(strtolower(str_replace(['KOTA_', '_'], ['', ' '], (string) $setting->origin_region_code)));
        }

        $originLat = $setting?->origin_lat ?? $originInfo['latitude'] ?? -6.1805;
        $originLng = $setting?->origin_lng ?? $originInfo['longitude'] ?? 106.8284;
        $maxDistanceKm = (float) ($setting?->maximum_distance_km ?? 25.0);
        $isEnabled = (bool) ($setting?->is_enabled ?? true);

        // Destination coordinates
        $destLat = isset($validated['dest_lat']) ? (float) $validated['dest_lat'] : null;
        $destLng = isset($validated['dest_lng']) ? (float) $validated['dest_lng'] : null;

        if ($destLat === null || $destLng === null) {
            $destLat = -6.2415;
            $destLng = 106.7932;
        }

        // Calculate Haversine distance
        $rawDistance = $this->quoteService->computeHaversineDistance(
            (float) $originLat,
            (float) $originLng,
            (float) $destLat,
            (float) $destLng
        );
        $distanceKm = round($rawDistance, 1);

        $isWithinRange = ($distanceKm <= $maxDistanceKm);
        $isDeliverable = $isEnabled && $isWithinRange;

        $reason = null;
        if (!$isEnabled) {
            $reason = 'Pengiriman lokal oleh toko ini sedang dinonaktifkan.';
        } elseif (!$isWithinRange) {
            $reason = "Jarak pengiriman ({$distanceKm} km) melebihi batas radius pengiriman toko ({$maxDistanceKm} km).";
        }

        return ApiResponse::success([
            'merchant_org_id' => $merchantOrgId,
            'store_name' => $storeName,
            'origin_city' => $cityName,
            'is_enabled' => $isEnabled,
            'is_deliverable' => $isDeliverable,
            'is_within_range' => $isWithinRange,
            'distance_km' => $distanceKm,
            'maximum_distance_km' => $maxDistanceKm,
            'origin_lat' => (float) $originLat,
            'origin_lng' => (float) $originLng,
            'dest_lat' => (float) $destLat,
            'dest_lng' => (float) $destLng,
            'reason' => $reason,
        ], 'DELIVERY_CHECK_COMPLETED');
    }
}
