<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductCategoryAssignment;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class InternalProductM2MTest extends TestCase
{
    use DatabaseTransactions;

    protected string $internalKey = 'servio_local_internal_service_key_2026';

    public function test_internal_routes_reject_unauthorized_callers(): void
    {
        $res = $this->withHeaders([
            'X-Internal-Service-Key' => 'invalid_unauthorized_key',
        ])->postJson('/internal/v1/category-references/check', [
            'node_type' => 'CATEGORY',
            'node_id' => '11111111-1111-4111-8111-111111111111',
        ]);

        $res->assertStatus(403);
    }

    public function test_internal_category_reference_check_returns_true_for_referenced_category(): void
    {
        $catId = '33333333-1111-4111-8111-111111111111';

        // Create product referencing this category
        $prod = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $this->defaultMerchantOrg,
            'created_by_user_id' => $this->defaultMerchantUser,
            'name' => 'Produk Dengan Kategori Tertentu',
            'normalized_name' => 'produk dengan kategori tertentu',
            'category_id' => $catId,
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        ProductCategoryAssignment::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $prod->id,
            'category_id' => $catId,
            'subcategory_id' => (string) \Illuminate\Support\Str::uuid(),
            'assigned_by_user_id' => $this->defaultMerchantUser,
            'effective_from' => now(),
        ]);

        $res = $this->withHeaders([
            'X-Internal-Service-Key' => $this->internalKey,
        ])->postJson('/internal/v1/category-references/check', [
            'node_type' => 'CATEGORY',
            'node_id' => $catId,
        ]);

        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_CATEGORY_REFERENCES_CHECKED',
                'data' => [
                    'node_type' => 'CATEGORY',
                    'node_id' => $catId,
                    'has_any_current_or_historical_reference' => true,
                    'authoritative' => true,
                ],
            ]);
    }

    public function test_internal_variant_snapshot_returns_accurate_price_and_stock(): void
    {
        $prod = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $this->defaultMerchantOrg,
            'created_by_user_id' => $this->defaultMerchantUser,
            'name' => 'Snapshot Test Product',
            'normalized_name' => 'snapshot test product',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $variant = ProductVariant::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $prod->id,
            'attributes_json' => ['tipe' => 'Snapshot Item'],
            'attribute_signature' => ProductVariant::computeSignature(['tipe' => 'Snapshot Item']),
            'price_idr' => 750000,
            'stock_qty' => 12,
            'status' => 'ACTIVE',
            'lock_version' => 3,
        ]);

        $res = $this->withHeaders([
            'X-Internal-Service-Key' => $this->internalKey,
        ])->getJson("/internal/v1/products/{$prod->id}/variants/{$variant->id}/snapshot");

        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_VARIANT_SNAPSHOT_LOADED',
                'data' => [
                    'product_id' => $prod->id,
                    'variant_id' => $variant->id,
                    'price_idr' => 750000,
                    'stock_qty' => 12,
                    'product_public_eligible' => true,
                    'variant_active' => true,
                ],
            ]);
    }
}
