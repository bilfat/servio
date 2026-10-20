<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ProductVariantAndStockFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->product = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $this->defaultMerchantOrg,
            'created_by_user_id' => $this->defaultMerchantUser,
            'name' => 'Produk Test Varian',
            'normalized_name' => 'produk test varian',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);
    }

    public function test_add_variant_creates_variant_and_stock_adjustment(): void
    {
        $headers = $this->merchantHeaders();

        $res = $this->withHeaders($headers)->postJson("/api/v1/merchant/products/{$this->product->id}/variants", [
            'attributes' => ['warna' => 'Merah', 'ukuran' => 'XL'],
            'price_idr' => 150000,
            'stock_qty' => 20,
            'status' => 'ACTIVE',
        ]);

        $res->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'VARIANT_CREATED',
                'data' => [
                    'price_idr' => 150000,
                    'stock_qty' => 20,
                    'status' => 'ACTIVE',
                ],
            ]);

        $variantId = $res->json('data.id');

        $this->assertDatabaseHas('product_variants', [
            'id' => $variantId,
            'product_id' => $this->product->id,
            'price_idr' => 150000,
            'stock_qty' => 20,
        ]);

        $this->assertDatabaseHas('product_stock_adjustments', [
            'product_id' => $this->product->id,
            'variant_id' => $variantId,
            'before_qty' => 0,
            'delta_qty' => 20,
            'after_qty' => 20,
            'reason_code' => 'INITIAL_STOCK',
        ]);
    }

    public function test_duplicate_variant_combination_on_same_product_is_rejected(): void
    {
        $headers = $this->merchantHeaders();

        ProductVariant::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->product->id,
            'attributes_json' => ['warna' => 'Hitam', 'ukuran' => 'M'],
            'attribute_signature' => ProductVariant::computeSignature(['warna' => 'Hitam', 'ukuran' => 'M']),
            'price_idr' => 100000,
            'stock_qty' => 5,
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // Attempt to add identical attributes (even with extra spaces or different case)
        $res = $this->withHeaders($headers)->postJson("/api/v1/merchant/products/{$this->product->id}/variants", [
            'attributes' => [' UKURAN ' => 'm', 'WARNA' => ' hitam '],
            'price_idr' => 120000,
            'stock_qty' => 10,
        ]);

        $res->assertStatus(409);
    }

    public function test_same_variant_combination_allowed_on_different_product(): void
    {
        $headers = $this->merchantHeaders();

        $prod2 = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $this->defaultMerchantOrg,
            'created_by_user_id' => $this->defaultMerchantUser,
            'name' => 'Produk Lain',
            'normalized_name' => 'produk lain',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        ProductVariant::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->product->id,
            'attributes_json' => ['warna' => 'Biru'],
            'attribute_signature' => ProductVariant::computeSignature(['warna' => 'Biru']),
            'price_idr' => 50000,
            'stock_qty' => 5,
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $res = $this->withHeaders($headers)->postJson("/api/v1/merchant/products/{$prod2->id}/variants", [
            'attributes' => ['warna' => 'Biru'],
            'price_idr' => 60000,
            'stock_qty' => 10,
        ]);

        $res->assertStatus(201);
    }

    public function test_update_variant_price_and_stock_records_adjustment(): void
    {
        $headers = $this->merchantHeaders();

        $variant = ProductVariant::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->product->id,
            'attributes_json' => ['warna' => 'Kuning'],
            'attribute_signature' => ProductVariant::computeSignature(['warna' => 'Kuning']),
            'price_idr' => 75000,
            'stock_qty' => 10,
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $res = $this->withHeaders(array_merge($headers, ['If-Match' => '1']))->patchJson(
            "/api/v1/merchant/products/{$this->product->id}/variants/{$variant->id}",
            [
                'price_idr' => 80000,
                'stock_qty' => 15,
                'stock_change_reason' => 'RESTOCK_MANUAL',
                'stock_change_note' => 'Barang baru datang dari gudang',
            ]
        );

        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'VARIANT_UPDATED',
                'data' => [
                    'price_idr' => 80000,
                    'stock_qty' => 15,
                    'lock_version' => 2,
                ],
            ]);

        $this->assertDatabaseHas('product_stock_adjustments', [
            'product_id' => $this->product->id,
            'variant_id' => $variant->id,
            'before_qty' => 10,
            'delta_qty' => 5,
            'after_qty' => 15,
            'reason_code' => 'RESTOCK_MANUAL',
        ]);
    }

    public function test_deactivate_or_archive_last_active_variant_on_active_product_is_rejected(): void
    {
        $headers = $this->merchantHeaders();

        // Mark product as ACTIVE
        $this->product->update(['status' => 'ACTIVE', 'lock_version' => 2]);

        $singleVariant = ProductVariant::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->product->id,
            'attributes_json' => ['tipe' => 'Single Active'],
            'attribute_signature' => ProductVariant::computeSignature(['tipe' => 'Single Active']),
            'price_idr' => 100000,
            'stock_qty' => 5,
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // Attempt to deactivate
        $resDeact = $this->withHeaders(array_merge($headers, ['If-Match' => '1']))->patchJson(
            "/api/v1/merchant/products/{$this->product->id}/variants/{$singleVariant->id}/status",
            ['status' => 'INACTIVE']
        );
        $resDeact->assertStatus(409);

        // Attempt to archive / delete
        $resDelete = $this->withHeaders(array_merge($headers, ['If-Match' => '1']))->deleteJson(
            "/api/v1/merchant/products/{$this->product->id}/variants/{$singleVariant->id}"
        );
        $resDelete->assertStatus(409);
    }
}
