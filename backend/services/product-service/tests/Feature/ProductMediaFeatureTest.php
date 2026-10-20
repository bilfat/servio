<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductMediaFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected Product $product;
    protected ProductVariant $variant;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->product = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $this->defaultMerchantOrg,
            'created_by_user_id' => $this->defaultMerchantUser,
            'name' => 'Produk Media Test',
            'normalized_name' => 'produk media test',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        $this->variant = ProductVariant::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->product->id,
            'attributes_json' => ['warna' => 'Merah'],
            'attribute_signature' => ProductVariant::computeSignature(['warna' => 'Merah']),
            'price_idr' => 100000,
            'stock_qty' => 10,
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);
    }

    protected function createRealFakeImage(string $filename = 'photo.png'): UploadedFile
    {
        // 1x1 valid PNG binary (works without requiring PHP GD extension)
        $pngContent = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        return UploadedFile::fake()->createWithContent($filename, $pngContent);
    }

    public function test_upload_general_media_succeeds_and_sets_primary(): void
    {
        $headers = $this->merchantHeaders();
        $file = $this->createRealFakeImage('general.png');

        $res = $this->withHeaders($headers)->postJson("/api/v1/merchant/products/{$this->product->id}/media", [
            'file' => $file,
            'scope' => 'GENERAL',
        ]);

        $res->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_MEDIA_CREATED',
                'data' => [
                    'scope' => 'GENERAL',
                    'variant_id' => null,
                    'is_primary' => true,
                ],
            ]);

        $mediaId = $res->json('data.id');
        $this->assertDatabaseHas('product_media', [
            'id' => $mediaId,
            'product_id' => $this->product->id,
            'scope' => 'GENERAL',
            'is_primary' => 1,
        ]);
    }

    public function test_upload_general_media_with_variant_id_is_rejected(): void
    {
        $headers = $this->merchantHeaders();
        $file = $this->createRealFakeImage('photo.png');

        $res = $this->withHeaders($headers)->postJson("/api/v1/merchant/products/{$this->product->id}/media", [
            'file' => $file,
            'scope' => 'GENERAL',
            'variant_id' => $this->variant->id,
        ]);

        $res->assertStatus(422);
    }

    public function test_upload_variant_media_without_variant_id_is_rejected(): void
    {
        $headers = $this->merchantHeaders();
        $file = $this->createRealFakeImage('photo.png');

        $res = $this->withHeaders($headers)->postJson("/api/v1/merchant/products/{$this->product->id}/media", [
            'file' => $file,
            'scope' => 'VARIANT',
        ]);

        $res->assertStatus(422);
    }

    public function test_upload_variant_media_with_valid_variant_succeeds(): void
    {
        $headers = $this->merchantHeaders();
        $file = $this->createRealFakeImage('variant_red.png');

        $res = $this->withHeaders($headers)->postJson("/api/v1/merchant/products/{$this->product->id}/media", [
            'file' => $file,
            'scope' => 'VARIANT',
            'variant_id' => $this->variant->id,
        ]);

        $res->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_MEDIA_CREATED',
                'data' => [
                    'scope' => 'VARIANT',
                    'variant_id' => $this->variant->id,
                ],
            ]);
    }

    public function test_delete_last_general_media_on_active_product_is_rejected(): void
    {
        $headers = $this->merchantHeaders();

        $this->product->update(['status' => 'ACTIVE', 'lock_version' => 2]);

        $singleMedia = ProductMedia::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->product->id,
            'scope' => 'GENERAL',
            'storage_key' => 'products/only_general.png',
            'mime_type' => 'image/png',
            'bytes' => 500,
            'sha256' => 'abc',
            'sort_order' => 0,
            'is_primary' => true,
            'storage_state' => 'READY',
        ]);

        $res = $this->withHeaders(array_merge($headers, ['If-Match' => '2']))->deleteJson(
            "/api/v1/merchant/products/{$this->product->id}/media/{$singleMedia->id}"
        );

        $res->assertStatus(409);
    }

    public function test_media_reorder_within_scope_succeeds(): void
    {
        $headers = $this->merchantHeaders();

        $m1 = ProductMedia::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->product->id,
            'scope' => 'GENERAL',
            'storage_key' => 'products/m1.png',
            'mime_type' => 'image/png',
            'bytes' => 100,
            'sha256' => 'm1',
            'sort_order' => 0,
            'is_primary' => true,
            'storage_state' => 'READY',
        ]);

        $m2 = ProductMedia::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->product->id,
            'scope' => 'GENERAL',
            'storage_key' => 'products/m2.png',
            'mime_type' => 'image/png',
            'bytes' => 100,
            'sha256' => 'm2',
            'sort_order' => 1,
            'is_primary' => false,
            'storage_state' => 'READY',
        ]);

        // Reorder: m2 first, then m1 with optimistic locking If-Match: 1
        $res = $this->withHeaders(array_merge($headers, ['If-Match' => '1']))->putJson("/api/v1/merchant/products/{$this->product->id}/media/order", [
            'scope' => 'GENERAL',
            'ordered_media_ids' => [$m2->id, $m1->id],
        ]);

        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_MEDIA_REORDERED',
            ]);

        $this->assertEquals(0, $m2->fresh()->sort_order);
        $this->assertEquals(1, $m1->fresh()->sort_order);
    }

    public function test_media_streaming_serves_binary_for_active_product(): void
    {
        $this->product->update(['status' => 'ACTIVE']);

        $pngContent = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        $storageKey = "products/{$this->product->id}/stream_test.png";
        Storage::disk('local')->put($storageKey, $pngContent);

        $media = ProductMedia::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->product->id,
            'scope' => 'GENERAL',
            'storage_key' => $storageKey,
            'mime_type' => 'image/png',
            'bytes' => strlen($pngContent),
            'sha256' => hash('sha256', $pngContent),
            'sort_order' => 0,
            'is_primary' => true,
            'storage_state' => 'READY',
        ]);

        $res = $this->get("/api/v1/product-media/{$media->id}");
        $res->assertStatus(200);
        $res->assertHeader('Content-Type', 'image/png');
    }

    public function test_media_streaming_returns_404_for_draft_product(): void
    {
        // Status remains DRAFT
        $pngContent = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        $storageKey = "products/{$this->product->id}/draft_test.png";
        Storage::disk('local')->put($storageKey, $pngContent);

        $media = ProductMedia::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->product->id,
            'scope' => 'GENERAL',
            'storage_key' => $storageKey,
            'mime_type' => 'image/png',
            'bytes' => strlen($pngContent),
            'sha256' => hash('sha256', $pngContent),
            'sort_order' => 0,
            'is_primary' => true,
            'storage_state' => 'READY',
        ]);

        $res = $this->get("/api/v1/product-media/{$media->id}");
        $res->assertStatus(404);
    }

    public function test_upload_media_cleans_up_storage_file_when_db_transaction_fails(): void
    {
        $headers = $this->merchantHeaders();
        $file = $this->createRealFakeImage('fail_test.png');

        $originalDispatcher = \App\Models\ProductMedia::getEventDispatcher();
        \App\Models\ProductMedia::saving(function () {
            throw new \RuntimeException('Simulated database deadlock/failure during media insert');
        });

        try {
            $this->withHeaders($headers)->postJson("/api/v1/merchant/products/{$this->product->id}/media", [
                'file' => $file,
                'scope' => 'GENERAL',
            ]);
        } catch (\Throwable $e) {
            // Expected
        } finally {
            \App\Models\ProductMedia::setEventDispatcher($originalDispatcher);
        }

        // Verify storage compensation: No orphaned files left in products/{productId}/
        $files = Storage::disk('local')->allFiles("products/{$this->product->id}");
        $this->assertEmpty($files, 'Storage compensation must remove orphaned files when DB transaction fails.');
    }
}
