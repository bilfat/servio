<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductCategoryAssignment;
use App\Models\ProductMedia;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ProductCrudAndLifecycleFeatureTest extends TestCase
{
    use DatabaseTransactions;

    public function test_merchant_can_create_draft_product(): void
    {
        $headers = $this->merchantHeaders();

        $response = $this->withHeaders($headers)->postJson('/api/v1/merchant/products', [
            'name' => 'Kulkas 2 Pintu Inverter',
            'description' => 'Kulkas hemat listrik untuk keluarga',
            'brand' => 'Samsung',
            'category_id' => '11111111-1111-4111-8111-111111111111',
            'subcategory_id' => '22222222-2222-4222-8222-222222222222',
            'variants' => [
                [
                    'attributes' => ['warna' => 'Silver', 'kapasitas' => '250L'],
                    'display_name' => 'Silver / 250L',
                    'price_idr' => 4500000,
                    'stock_qty' => 5,
                    'status' => 'ACTIVE',
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_CREATED',
                'data' => [
                    'name' => 'Kulkas 2 Pintu Inverter',
                    'status' => 'DRAFT',
                    'lock_version' => 1,
                ],
            ]);

        $productId = $response->json('data.id');

        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'name' => 'Kulkas 2 Pintu Inverter',
            'status' => 'DRAFT',
        ]);

        $this->assertDatabaseHas('product_category_assignments', [
            'product_id' => $productId,
            'category_id' => '11111111-1111-4111-8111-111111111111',
        ]);

        $this->assertDatabaseHas('product_variants', [
            'product_id' => $productId,
            'price_idr' => 4500000,
            'stock_qty' => 5,
        ]);
    }

    public function test_merchant_can_list_and_get_own_products(): void
    {
        $headers = $this->merchantHeaders();

        $prod = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $this->defaultMerchantOrg,
            'created_by_user_id' => $this->defaultMerchantUser,
            'name' => 'Mesin Cuci Front Load',
            'normalized_name' => 'mesin cuci front load',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        // List
        $listRes = $this->withHeaders($headers)->getJson('/api/v1/merchant/products');
        $listRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'MERCHANT_PRODUCTS_LISTED',
            ]);

        // Detail
        $detailRes = $this->withHeaders($headers)->getJson("/api/v1/merchant/products/{$prod->id}");
        $detailRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_FOUND',
                'data' => [
                    'id' => $prod->id,
                    'name' => 'Mesin Cuci Front Load',
                ],
            ]);
    }

    public function test_merchant_can_update_product_basic_info(): void
    {
        $headers = $this->merchantHeaders();

        $prod = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $this->defaultMerchantOrg,
            'created_by_user_id' => $this->defaultMerchantUser,
            'name' => 'Original Name',
            'normalized_name' => 'original name',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        // 428 when If-Match missing
        $resNoHeader = $this->withHeaders($headers)->patchJson("/api/v1/merchant/products/{$prod->id}", [
            'name' => 'Updated Name',
        ]);
        $resNoHeader->assertStatus(428);

        // 409 when version mismatch
        $resWrongVer = $this->withHeaders(array_merge($headers, ['If-Match' => '99']))->patchJson("/api/v1/merchant/products/{$prod->id}", [
            'name' => 'Updated Name',
        ]);
        $resWrongVer->assertStatus(409);

        // Success update with correct If-Match
        $resOk = $this->withHeaders(array_merge($headers, ['If-Match' => '1']))->patchJson("/api/v1/merchant/products/{$prod->id}", [
            'name' => 'Updated Name',
            'brand' => 'LG',
        ]);
        $resOk->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_UPDATED',
                'data' => [
                    'name' => 'Updated Name',
                    'brand' => 'LG',
                    'lock_version' => 2,
                ],
            ]);

        $this->assertDatabaseHas('products', [
            'id' => $prod->id,
            'name' => 'Updated Name',
            'brand_name' => 'LG',
            'lock_version' => 2,
        ]);
    }

    public function test_activate_product_fails_if_requirements_not_met(): void
    {
        $headers = $this->merchantHeaders();

        // Product without variants or media
        $prod = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $this->defaultMerchantOrg,
            'created_by_user_id' => $this->defaultMerchantUser,
            'name' => 'Incomplete Product',
            'normalized_name' => 'incomplete product',
            'category_id' => '11111111-1111-4111-8111-111111111111',
            'subcategory_id' => '22222222-2222-4222-8222-222222222222',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        $res = $this->withHeaders(array_merge($headers, ['If-Match' => '1']))->patchJson("/api/v1/merchant/products/{$prod->id}/status", [
            'status' => 'ACTIVE',
        ]);

        $res->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'PRODUCT_ACTIVATION_REQUIREMENTS_NOT_MET',
            ]);
    }

    public function test_activate_product_succeeds_when_all_requirements_met(): void
    {
        $headers = $this->merchantHeaders();

        $prod = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $this->defaultMerchantOrg,
            'created_by_user_id' => $this->defaultMerchantUser,
            'name' => 'Complete Product',
            'normalized_name' => 'complete product',
            'category_id' => '11111111-1111-4111-8111-111111111111',
            'subcategory_id' => '22222222-2222-4222-8222-222222222222',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        // Add active variant with positive price
        ProductVariant::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $prod->id,
            'attributes_json' => ['tipe' => 'Standard'],
            'attribute_signature' => ProductVariant::computeSignature(['tipe' => 'Standard']),
            'price_idr' => 200000,
            'stock_qty' => 10,
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // Add ready general media
        ProductMedia::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $prod->id,
            'scope' => 'GENERAL',
            'storage_key' => 'products/dummy.jpg',
            'mime_type' => 'image/jpeg',
            'bytes' => 1000,
            'sha256' => 'dummy',
            'sort_order' => 0,
            'is_primary' => true,
            'storage_state' => 'READY',
        ]);

        $res = $this->withHeaders(array_merge($headers, ['If-Match' => '1']))->patchJson("/api/v1/merchant/products/{$prod->id}/status", [
            'status' => 'ACTIVE',
        ]);

        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_STATUS_UPDATED',
                'data' => [
                    'id' => $prod->id,
                    'status' => 'ACTIVE',
                    'lock_version' => 2,
                ],
            ]);

        $this->assertEquals('ACTIVE', $prod->fresh()->status);
    }

    public function test_merchant_can_archive_product(): void
    {
        $headers = $this->merchantHeaders();

        $prod = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $this->defaultMerchantOrg,
            'created_by_user_id' => $this->defaultMerchantUser,
            'name' => 'To be archived',
            'normalized_name' => 'to be archived',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        $res = $this->withHeaders(array_merge($headers, ['If-Match' => '1']))->deleteJson("/api/v1/merchant/products/{$prod->id}", [
            'reason' => 'Sudah tidak diproduksi',
        ]);

        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_ARCHIVED',
            ]);

        $this->assertNotNull($prod->fresh()->deleted_at);
    }
}
