<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PublicCatalogAndStorefrontFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected Product $activeProd1;
    protected Product $activeProd2;
    protected Product $draftProd;

    protected function setUp(): void
    {
        parent::setUp();

        // Active Product 1 (Brand: Daikin, Category: Cat1, Subcat: Sub1, 2 variants: 100k, 200k -> RANGE)
        $this->activeProd1 = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $this->defaultMerchantOrg,
            'created_by_user_id' => $this->defaultMerchantUser,
            'name' => 'AC Split Inverter Daikin',
            'normalized_name' => 'ac split inverter daikin',
            'brand_name' => 'Daikin',
            'brand_normalized' => 'daikin',
            'category_id' => '11111111-1111-4111-8111-111111111111',
            'subcategory_id' => '22222222-2222-4222-8222-222222222222',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        ProductVariant::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->activeProd1->id,
            'attributes_json' => ['pk' => '0.5 PK'],
            'attribute_signature' => ProductVariant::computeSignature(['pk' => '0.5 PK']),
            'price_idr' => 3000000,
            'stock_qty' => 5,
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        ProductVariant::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->activeProd1->id,
            'attributes_json' => ['pk' => '1 PK'],
            'attribute_signature' => ProductVariant::computeSignature(['pk' => '1 PK']),
            'price_idr' => 4000000,
            'stock_qty' => 3,
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        ProductMedia::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->activeProd1->id,
            'scope' => 'GENERAL',
            'storage_key' => 'products/daikin.jpg',
            'mime_type' => 'image/jpeg',
            'bytes' => 1000,
            'sha256' => 'daikin',
            'sort_order' => 0,
            'is_primary' => true,
            'storage_state' => 'READY',
        ]);

        // Active Product 2 (Brand: Panasonic, Category: Cat1, Subcat: Sub1, 1 variant -> EXACT)
        $this->activeProd2 = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $this->defaultMerchantOrg,
            'created_by_user_id' => $this->defaultMerchantUser,
            'name' => 'Kipas Angin Panasonic',
            'normalized_name' => 'kipas angin panasonic',
            'brand_name' => 'Panasonic',
            'brand_normalized' => 'panasonic',
            'category_id' => '11111111-1111-4111-8111-111111111111',
            'subcategory_id' => '22222222-2222-4222-8222-222222222222',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        ProductVariant::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->activeProd2->id,
            'attributes_json' => ['warna' => 'Hitam'],
            'attribute_signature' => ProductVariant::computeSignature(['warna' => 'Hitam']),
            'price_idr' => 500000,
            'stock_qty' => 10,
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        ProductMedia::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->activeProd2->id,
            'scope' => 'GENERAL',
            'storage_key' => 'products/panasonic.jpg',
            'mime_type' => 'image/jpeg',
            'bytes' => 1000,
            'sha256' => 'panasonic',
            'sort_order' => 0,
            'is_primary' => true,
            'storage_state' => 'READY',
        ]);

        // Draft Product (must NEVER appear in public listing)
        $this->draftProd = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $this->defaultMerchantOrg,
            'created_by_user_id' => $this->defaultMerchantUser,
            'name' => 'Draft Secret Product',
            'normalized_name' => 'draft secret product',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);
    }

    public function test_public_catalog_listing_and_filtering(): void
    {
        // 1. Unfiltered query
        $resAll = $this->getJson('/api/v1/products');
        $resAll->assertStatus(200);

        $items = $resAll->json('data');
        $itemIds = collect($items)->pluck('id')->all();

        $this->assertContains($this->activeProd1->id, $itemIds);
        $this->assertContains($this->activeProd2->id, $itemIds);
        $this->assertNotContains($this->draftProd->id, $itemIds, 'Draft produk tidak boleh muncul di katalog publik.');

        // 2. Price Kind verification
        $item1 = collect($items)->firstWhere('id', $this->activeProd1->id);
        $this->assertEquals('RANGE', $item1['display_price']['kind']);
        $this->assertEquals(3000000, $item1['display_price']['min']);
        $this->assertEquals(4000000, $item1['display_price']['max']);

        $item2 = collect($items)->firstWhere('id', $this->activeProd2->id);
        $this->assertEquals('EXACT', $item2['display_price']['kind']);
        $this->assertEquals(500000, $item2['display_price']['min']);

        // 3. Search filter
        $resSearch = $this->getJson('/api/v1/products?search=daikin');
        $searchIds = collect($resSearch->json('data'))->pluck('id')->all();
        $this->assertContains($this->activeProd1->id, $searchIds);
        $this->assertNotContains($this->activeProd2->id, $searchIds);

        // 4. Brand filter (independent)
        $resBrand = $this->getJson('/api/v1/products?brands=panasonic');
        $brandIds = collect($resBrand->json('data'))->pluck('id')->all();
        $this->assertContains($this->activeProd2->id, $brandIds);
        $this->assertNotContains($this->activeProd1->id, $brandIds);
    }

    public function test_public_product_detail_and_related_sections(): void
    {
        $res = $this->getJson("/api/v1/products/{$this->activeProd1->id}?include=related,same_store");
        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_FOUND',
                'data' => [
                    'id' => $this->activeProd1->id,
                    'name' => 'AC Split Inverter Daikin',
                ],
            ]);

        $data = $res->json('data');
        $this->assertCount(2, $data['variants']);
        $this->assertNotEmpty($data['general_media']);
        $this->assertEquals('Jakarta Selatan', $data['merchant']['city'] ?? null);
        $this->assertEquals('DKI Jakarta', $data['merchant']['province'] ?? null);

        // Current product must be excluded from related
        $relatedIds = collect($data['related_products'])->pluck('id')->all();
        $this->assertNotContains($this->activeProd1->id, $relatedIds);
    }

    public function test_public_merchant_storefront(): void
    {
        $res = $this->getJson("/api/v1/merchants/{$this->defaultMerchantOrg}/storefront");
        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'MERCHANT_STOREFRONT_FOUND',
                'data' => [
                    'merchant' => [
                        'organization_id' => $this->defaultMerchantOrg,
                    ],
                ],
            ]);

        $productIds = collect($res->json('data.products'))->pluck('id')->all();
        $this->assertContains($this->activeProd1->id, $productIds);
        $this->assertContains($this->activeProd2->id, $productIds);
        $this->assertNotContains($this->draftProd->id, $productIds);
    }

    public function test_empty_storefront_returns_valid_empty_list(): void
    {
        $emptyOrgId = (string) \Illuminate\Support\Str::uuid();
        $res = $this->getJson("/api/v1/merchants/{$emptyOrgId}/storefront");

        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'MERCHANT_STOREFRONT_FOUND',
                'data' => [
                    'active_product_count' => 0,
                    'products' => [],
                ],
            ]);
    }

    public function test_public_storefront_and_cards_display_store_name_from_identity_public_profile(): void
    {
        \App\Infrastructure\Identity\IdentityServiceClient::fake(function (string $action, array $params) {
            if ($action === 'getOrganizationPublicProfile') {
                return [
                    'organization_id' => $params['organization_id'],
                    'type' => 'MERCHANT',
                    'store_name' => 'Sinar AC & Sparepart Glodok',
                    'logo_url' => null,
                    'public_description' => null,
                    'status' => 'ACTIVE',
                    'operational_status' => 'ONLINE_ACCEPTING',
                    'is_verified' => null,
                    'profile_version' => 1,
                ];
            }
            if ($action === 'getOrganizationStatus') {
                return [
                    'organization_id' => $params['organization_id'],
                    'type' => 'MERCHANT',
                    'status' => 'ACTIVE',
                    'authorization_version' => 1,
                ];
            }
            return null;
        });

        // 1. Storefront returns real store_name and AVAILABLE status
        $resStore = $this->getJson("/api/v1/merchants/{$this->defaultMerchantOrg}/storefront");
        $resStore->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'merchant' => [
                        'organization_id' => $this->defaultMerchantOrg,
                        'store_name' => 'Sinar AC & Sparepart Glodok',
                        'store_profile_status' => 'AVAILABLE',
                    ],
                ],
            ]);

        // 2. Product Card in catalog returns real store_name
        $resCatalog = $this->getJson('/api/v1/products');
        $resCatalog->assertStatus(200);
        $card = collect($resCatalog->json('data'))->firstWhere('id', $this->activeProd1->id);
        $this->assertEquals('Sinar AC & Sparepart Glodok', $card['merchant']['store_name']);
        $this->assertEquals('AVAILABLE', $card['merchant']['store_profile_status']);
    }

    public function test_public_storefront_and_cards_handle_upstream_identity_failure(): void
    {
        // Simulate upstream failure returning null via false
        \App\Infrastructure\Identity\IdentityServiceClient::fake(function (string $action, array $params) {
            if ($action === 'getOrganizationPublicProfile' || $action === 'getOrganizationStatus') {
                return false;
            }
            return null;
        });

        $resStore = $this->getJson("/api/v1/merchants/{$this->defaultMerchantOrg}/storefront");
        $resStore->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'merchant' => [
                        'organization_id' => $this->defaultMerchantOrg,
                        'store_name' => null,
                        'store_profile_status' => 'PENDING_IDENTITY_INTEGRATION',
                    ],
                ],
            ]);

        $resCatalog = $this->getJson('/api/v1/products');
        $card = collect($resCatalog->json('data'))->firstWhere('id', $this->activeProd1->id);
        $this->assertNull($card['merchant']['store_name']);
        $this->assertEquals('PENDING_IDENTITY_INTEGRATION', $card['merchant']['store_profile_status']);
    }

    public function test_public_storefront_reflects_suspended_merchant_status(): void
    {
        \App\Infrastructure\Identity\IdentityServiceClient::fake(function (string $action, array $params) {
            if ($action === 'getOrganizationStatus') {
                return [
                    'organization_id' => $params['organization_id'],
                    'type' => 'MERCHANT',
                    'status' => 'SUSPENDED',
                    'authorization_version' => 1,
                ];
            }
            if ($action === 'getOrganizationPublicProfile') {
                return [
                    'organization_id' => $params['organization_id'],
                    'type' => 'MERCHANT',
                    'store_name' => 'Toko Suspended Official',
                    'logo_url' => null,
                    'public_description' => null,
                    'status' => 'SUSPENDED',
                    'operational_status' => 'SUSPENDED',
                    'is_verified' => null,
                    'profile_version' => 1,
                ];
            }
            return null;
        });

        $res = $this->getJson("/api/v1/merchants/{$this->defaultMerchantOrg}/storefront");
        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'merchant' => [
                        'organization_id' => $this->defaultMerchantOrg,
                        'store_name' => 'Toko Suspended Official',
                        'business_status' => 'SUSPENDED',
                    ],
                ],
            ]);
    }
}
