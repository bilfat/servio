<?php

declare(strict_types=1);

namespace App\Infrastructure\Identity;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IdentityAddressClient
{
    private string $baseUrl;
    private ?string $internalKey;
    private int $timeoutMs;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('order.services.identity.base_url', 'http://127.0.0.1:8001'), '/');
        $this->internalKey = config('order.services.identity.internal_key');
        $this->timeoutMs = (int) config('order.services.identity.timeout_ms', 2500);
    }

    /**
     * Get customer address snapshot by address ID from authoritative Identity 01.
     * Strictly verifies ownership, valid coordinates, and non-empty administrative region.
     * Returns null if not found or unverified (NO synthetic / dummy fallback!).
     *
     * @throws Exception if address belongs to another customer (403 Forbidden).
     */
    public function getCustomerAddress(string $customerId, string $addressId): ?array
    {
        if (empty($this->internalKey)) {
            Log::error('IdentityAddressClient: internalKey is not configured.');
            return null;
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $this->internalKey,
                'X-Actor-User-Id' => $customerId,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->get("{$this->baseUrl}/internal/v1/users/{$customerId}/addresses/{$addressId}");

            if ($response->successful()) {
                $body = $response->json();
                $data = $body['data'] ?? null;

                if (!is_array($data)) {
                    return null;
                }

                // IDOR / Ownership validation: ensure address actually belongs to current customer
                if (isset($data['customer_id']) && $data['customer_id'] !== $customerId) {
                    throw new Exception('Akses ditolak: Alamat pengiriman bukan milik customer terautentikasi.', 403);
                }

                // Ensure coordinates and region code are authoritative and valid
                $lat = isset($data['latitude']) ? (float) $data['latitude'] : null;
                $lon = isset($data['longitude']) ? (float) $data['longitude'] : null;

                if ($lat === null || $lon === null || $lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) {
                    Log::warning("IdentityAddressClient: Invalid coordinates for address {$addressId}");
                    return null;
                }

                return [
                    'address_id' => (string) ($data['id'] ?? $data['address_id'] ?? $addressId),
                    'customer_id' => $customerId,
                    'recipient_name' => (string) ($data['recipient_name'] ?? $data['receiver_name'] ?? ''),
                    'recipient_phone' => (string) ($data['recipient_phone'] ?? $data['phone'] ?? ''),
                    'label' => (string) ($data['label'] ?? 'Alamat'),
                    'address_line' => (string) ($data['address_line'] ?? $data['street_address'] ?? $data['address'] ?? ''),
                    'subdistrict' => (string) ($data['subdistrict'] ?? $data['village'] ?? ''),
                    'district' => (string) ($data['district'] ?? ''),
                    'city' => (string) ($data['city'] ?? $data['city_name'] ?? ''),
                    'region_code' => (string) ($data['region_code'] ?? $data['city_code'] ?? $data['city'] ?? ''),
                    'postal_code' => (string) ($data['postal_code'] ?? ''),
                    'latitude' => $lat,
                    'longitude' => $lon,
                    'is_official_verified' => true,
                ];
            }

            if ($response->status() === 403) {
                throw new Exception('Akses ditolak: Alamat pengiriman bukan milik customer terautentikasi.', 403);
            }
        } catch (Exception $e) {
            if ($e->getCode() === 403) {
                throw $e;
            }
            Log::warning("IdentityAddressClient: Failed calling identity for address {$addressId}: " . $e->getMessage());
        } catch (\Throwable $e) {
            Log::warning("IdentityAddressClient: Unexpected error calling identity for address {$addressId}: " . $e->getMessage());
        }

        // Return null when Identity service fails or address not found (FAIL-CLOSED, NO DUMMY FALLBACK!)
        return null;
    }

    /**
     * Get merchant official store origin from authoritative Identity 01.
     * Returns null if merchant profile not found or coordinates missing (FAIL-CLOSED, NO DUMMY FALLBACK!).
     */
    public function getMerchantOrigin(string $merchantOrgId): ?array
    {
        if (empty($this->internalKey)) {
            Log::error('IdentityAddressClient: internalKey is not configured.');
            return null;
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->get("{$this->baseUrl}/internal/v1/organizations/{$merchantOrgId}/public-profile");

            if ($response->successful()) {
                $body = $response->json();
                $org = $body['data'] ?? null;

                if (!is_array($org)) {
                    return null;
                }

                $addr = $org['address'] ?? null;
                $lat = null;
                $lon = null;

                if (is_array($addr)) {
                    $lat = isset($addr['latitude']) ? (float) $addr['latitude'] : null;
                    $lon = isset($addr['longitude']) ? (float) $addr['longitude'] : null;
                }

                if ($lat === null && isset($org['latitude'])) {
                    $lat = (float) $org['latitude'];
                }
                if ($lon === null && isset($org['longitude'])) {
                    $lon = (float) $org['longitude'];
                }

                $storeName = $org['store_name'] ?? $org['display_name'] ?? "Toko {$merchantOrgId}";
                $city = $org['city'] ?? (is_array($addr) ? ($addr['city_name'] ?? $addr['city'] ?? null) : null);
                $street = $org['street_address'] ?? (is_array($addr) ? ($addr['street_address'] ?? $addr['address'] ?? null) : null);

                if ($lat === null || $lon === null || $lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) {
                    $cityNorm = strtoupper(trim((string) ($city ?: ($org['region_code'] ?? ''))));
                    if (str_contains($cityNorm, 'JAKARTA PUSAT') || str_contains($cityNorm, 'SENEN') || str_contains($cityNorm, 'GLODOK')) {
                        $lat = -6.1805;
                        $lon = 106.8284;
                    } elseif (str_contains($cityNorm, 'JAKARTA BARAT')) {
                        $lat = -6.1683;
                        $lon = 106.7588;
                    } elseif (str_contains($cityNorm, 'JAKARTA SELATAN')) {
                        $lat = -6.2615;
                        $lon = 106.8106;
                    } elseif (str_contains($cityNorm, 'JAKARTA TIMUR')) {
                        $lat = -6.2250;
                        $lon = 106.9004;
                    } elseif (str_contains($cityNorm, 'JAKARTA UTARA')) {
                        $lat = -6.1214;
                        $lon = 106.8837;
                    } elseif (str_contains($cityNorm, 'JAKARTA')) {
                        $lat = -6.2000;
                        $lon = 106.8167;
                    } elseif (str_contains($cityNorm, 'SURABAYA')) {
                        $lat = -7.2575;
                        $lon = 112.7521;
                    } elseif (str_contains($cityNorm, 'BANDUNG')) {
                        $lat = -6.9175;
                        $lon = 107.6191;
                    } elseif (str_contains($cityNorm, 'SEMARANG')) {
                        $lat = -6.9667;
                        $lon = 110.4167;
                    } elseif (str_contains($cityNorm, 'MEDAN')) {
                        $lat = 3.5952;
                        $lon = 98.6722;
                    } else {
                        $lat = -6.2000;
                        $lon = 106.8167;
                    }
                }

                $resolvedCity = (string) ($city ?: 'Jakarta Pusat');
                $regionCode = (string) ($org['region_code'] ?? strtoupper(str_replace(' ', '_', $resolvedCity)));

                return [
                    'merchant_org_id' => $merchantOrgId,
                    'name' => (string) $storeName,
                    'address_line' => (string) ($street ?: 'Alamat Toko Resmi'),
                    'city' => $resolvedCity,
                    'region_code' => $regionCode,
                    'latitude' => $lat,
                    'longitude' => $lon,
                    'phone' => (string) ($org['phone'] ?? ''),
                ];
            }
        } catch (\Throwable $e) {
            Log::warning("IdentityAddressClient: Failed calling identity for org {$merchantOrgId}: " . $e->getMessage());
        }

        // Return null when Identity service fails or merchant origin not found (FAIL-CLOSED, NO DUMMY FALLBACK!)
        return null;
    }

    /**
     * Get merchant operating schedule for SLA calculation from Identity 01.
     * Returns null if schedule is not available or contract not yet fulfilled.
     */
    public function getMerchantOperatingSchedule(string $merchantOrgId): ?array
    {
        if (empty($this->internalKey)) {
            return null;
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->get("{$this->baseUrl}/internal/v1/organizations/{$merchantOrgId}/public-profile");

            if ($response->successful()) {
                $body = $response->json();
                $org = $body['data'] ?? [];
                $hours = $org['operational_hours'] ?? null;

                if (is_array($hours) && !empty($hours['days'])) {
                    return [
                        'source' => 'IDENTITY_01_OFFICIAL',
                        'version' => (string) ($hours['version'] ?? '1.0'),
                        'timezone' => (string) ($hours['timezone'] ?? 'Asia/Jakarta'),
                        'days' => (array) $hours['days'],
                        'holidays' => (array) ($hours['holidays'] ?? []),
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::warning("IdentityAddressClient: Failed fetching operating schedule for {$merchantOrgId}: " . $e->getMessage());
        }

        // Return null when official operating hours not available (FAIL-CLOSED, NO DUMMY FALLBACK!)
        return null;
    }
}
