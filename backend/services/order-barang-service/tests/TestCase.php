<?php

declare(strict_types=1);

namespace Tests;

use App\Infrastructure\Identity\IdentityAddressClient;
use App\Infrastructure\Product\ProductClient;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Mockery;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    protected string $gatewayKey = 'servio_local_gateway_key_2026';
    protected string $internalServiceKey = 'servio_local_internal_service_key_2026';

    protected function setUp(): void
    {
        parent::setUp();

        // Safety assertion: Ensure test runner is strictly on servio_order_barang_test_db!
        $currentDb = DB::connection()->getDatabaseName();
        if ($currentDb !== 'servio_order_barang_test_db') {
            throw new RuntimeException("CRITICAL SAFETY ERROR: Test is running against '{$currentDb}' instead of 'servio_order_barang_test_db'!");
        }

        $this->setupDefaultTestDoubles();
    }

    /**
     * Setup isolated test doubles for external services (Identity 01 & Product 03).
     * Tests can override these bindings anytime for specific edge cases.
     */
    protected function setupDefaultTestDoubles(): void
    {
        // Default IdentityAddressClient double
        $identityMock = Mockery::mock(IdentityAddressClient::class);
        $identityMock->shouldReceive('getCustomerAddress')
            ->byDefault()
            ->andReturnUsing(function ($customerId, $addressId) {
                if ($addressId === 'ADDR_FOREIGN') {
                    throw new \Exception('Akses ditolak: Alamat pengiriman bukan milik customer terautentikasi.', 403);
                }
                if ($addressId === 'ADDR_NOT_FOUND' || $addressId === 'ADDR_INVALID') {
                    return null;
                }
                return [
                    'address_id' => $addressId,
                    'customer_id' => $customerId,
                    'recipient_name' => 'Budi Santoso',
                    'recipient_phone' => '+6281234567890',
                    'label' => 'Rumah',
                    'address_line' => 'Jl. Sudirman No. 123',
                    'subdistrict' => 'Karet Tengsin',
                    'district' => 'Tanah Abang',
                    'city' => 'Jakarta Pusat',
                    'region_code' => 'KOTA_JAKARTA_PUSAT',
                    'postal_code' => '10220',
                    'latitude' => -6.2088000,
                    'longitude' => 106.8200000,
                    'is_official_verified' => true,
                ];
            });

        $identityMock->shouldReceive('getMerchantOrigin')
            ->byDefault()
            ->andReturnUsing(function ($merchantOrgId) {
                if ($merchantOrgId === 'ORG_NOT_FOUND' || $merchantOrgId === 'ORG_UNVERIFIED') {
                    return null;
                }
                return [
                    'merchant_org_id' => $merchantOrgId,
                    'name' => "Toko {$merchantOrgId}",
                    'address_line' => 'Kawasan Niaga Terpadu',
                    'city' => 'Jakarta Pusat',
                    'region_code' => 'KOTA_JAKARTA_PUSAT',
                    'latitude' => -6.2000000,
                    'longitude' => 106.8166667,
                    'phone' => '+6281987654321',
                ];
            });

        $identityMock->shouldReceive('getMerchantOperatingSchedule')
            ->byDefault()
            ->andReturnUsing(function ($merchantOrgId) {
                if ($merchantOrgId === 'ORG_NO_SCHEDULE') {
                    return null;
                }
                return [
                    'source' => 'IDENTITY_01_OFFICIAL',
                    'version' => '1.0',
                    'timezone' => 'Asia/Jakarta',
                    'days' => [
                        'monday' => ['open' => '08:00', 'close' => '20:00', 'is_closed' => false],
                        'tuesday' => ['open' => '08:00', 'close' => '20:00', 'is_closed' => false],
                        'wednesday' => ['open' => '08:00', 'close' => '20:00', 'is_closed' => false],
                        'thursday' => ['open' => '08:00', 'close' => '20:00', 'is_closed' => false],
                        'friday' => ['open' => '08:00', 'close' => '20:00', 'is_closed' => false],
                        'saturday' => ['open' => '09:00', 'close' => '18:00', 'is_closed' => false],
                        'sunday' => ['open' => '09:00', 'close' => '18:00', 'is_closed' => false],
                    ],
                    'holidays' => [],
                ];
            });

        $this->app->instance(IdentityAddressClient::class, $identityMock);

        // Default ProductClient double
        $productMock = Mockery::mock(ProductClient::class);
        $productMock->shouldReceive('getVariantSnapshot')
            ->byDefault()
            ->andReturnUsing(function ($productId, $variantId) {
                if ($productId === 'PROD_NOT_FOUND') {
                    return null;
                }
                $isInactive = str_contains($productId, 'INACTIVE');
                $isOutOfStock = str_contains($productId, 'OUT_OF_STOCK');
                $orgId = str_contains($productId, 'STORE_B') || str_contains($productId, 'PROD_B_') ? 'ORG_STORE_B' : 'ORG_STORE_A';

                return [
                    'product_id' => $productId,
                    'variant_id' => $variantId,
                    'merchant_organization_id' => $orgId,
                    'price_idr' => 50000,
                    'stock_qty' => $isOutOfStock ? 0 : 100,
                    'product_public_eligible' => !$isInactive,
                    'variant_active' => !$isInactive,
                    'version' => 1,
                ];
            });

        $productMock->shouldReceive('isStockReservationContractAvailable')
            ->byDefault()
            ->andReturn(true);

        $productMock->shouldReceive('reserveInventory')
            ->byDefault()
            ->andReturn([
                'success' => true,
                'status' => 'RESERVED',
                'reservations' => [],
            ]);

        $this->app->instance(ProductClient::class, $productMock);

        // Default DisputeAuthorityClient double (FIX 19)
        $disputeMock = Mockery::mock(\App\Infrastructure\Dispute\DisputeAuthorityClient::class);
        $disputeMock->shouldReceive('verifyDisputeClearance')
            ->byDefault()
            ->andReturn([
                'status' => 'CLEAR',
                'has_active_dispute' => false,
                'has_active_complaint' => false,
                'contract_available' => true,
                'authority_source' => 'AFTERSALES_07',
                'message' => 'Pesanan dinyatakan bebas sengketa dan komplain oleh otoritas sah.',
            ]);

        $this->app->instance(\App\Infrastructure\Dispute\DisputeAuthorityClient::class, $disputeMock);
    }

    /**
     * Helper to build customer headers.
     */
    protected function customerHeaders(string $customerId = 'CUST_TEST_01'): array
    {
        return [
            'X-Gateway-Key' => $this->gatewayKey,
            'X-Actor-User-Id' => $customerId,
            'X-Actor-Role' => 'CUSTOMER',
            'Accept' => 'application/json',
        ];
    }

    /**
     * Helper to build merchant headers.
     */
    protected function merchantHeaders(string $merchantId = 'USER_MERCH_01', string $merchantOrgId = 'ORG_STORE_A'): array
    {
        return [
            'X-Gateway-Key' => $this->gatewayKey,
            'X-Actor-User-Id' => $merchantId,
            'X-Actor-Role' => 'MERCHANT',
            'X-Actor-Org-Id' => $merchantOrgId,
            'X-Actor-Org-Active' => 'true',
            'X-Actor-Membership-Active' => 'true',
            'Accept' => 'application/json',
        ];
    }

    /**
     * Helper to build internal service headers.
     */
    protected function internalHeaders(): array
    {
        return [
            'X-Internal-Service-Key' => $this->internalServiceKey,
            'Accept' => 'application/json',
        ];
    }
}
