<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ProductAuthorizationAndSecurityTest extends TestCase
{
    use DatabaseTransactions;

    public function test_unauthenticated_request_to_merchant_routes_rejected_with_401(): void
    {
        $res = $this->withHeaders(['X-Gateway-Key' => ''])->getJson('/api/v1/merchant/products');
        $res->assertStatus(401);
    }

    public function test_merchant_cannot_access_or_modify_another_merchants_product_idor(): void
    {
        $merchantA_org = '0d6928ad-1c31-4380-98f8-98355100336a';
        $merchantB_org = 'ffffffff-2222-4222-8222-222222222222';

        $prodA = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $merchantA_org,
            'created_by_user_id' => 'user-a',
            'name' => 'Produk Milik Merchant A',
            'normalized_name' => 'produk milik merchant a',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        // Merchant B tries to view Product A
        $headersB = $this->merchantHeaders($merchantB_org, 'user-b');
        $resShow = $this->withHeaders($headersB)->getJson("/api/v1/merchant/products/{$prodA->id}");
        $resShow->assertStatus(404);

        // Merchant B tries to edit Product A
        $resEdit = $this->withHeaders(array_merge($headersB, ['If-Match' => '1']))->patchJson("/api/v1/merchant/products/{$prodA->id}", [
            'name' => 'Hacked by Merchant B',
        ]);
        $resEdit->assertStatus(404);
    }

    public function test_spoofed_actor_headers_without_valid_gateway_key_rejected_with_403(): void
    {
        $spoofedHeaders = [
            'X-Gateway-Key' => 'wrong_untrusted_gateway_key',
            'X-Actor-User-Id' => 'attacker-user',
            'X-Actor-Role' => 'MERCHANT',
            'X-Actor-Org-Id' => $this->defaultMerchantOrg,
        ];

        $res = $this->withHeaders($spoofedHeaders)->getJson('/api/v1/merchant/products');
        $res->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'PRODUCT_UNTRUSTED_GATEWAY_CONTEXT',
            ]);
    }

    public function test_merchant_cannot_add_variant_or_media_to_another_merchants_product(): void
    {
        $merchantA_org = '0d6928ad-1c31-4380-98f8-98355100336a';
        $merchantB_org = 'ffffffff-2222-4222-8222-222222222222';

        $prodA = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => $merchantA_org,
            'created_by_user_id' => 'user-a',
            'name' => 'Produk Milik Merchant A',
            'normalized_name' => 'produk milik merchant a',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        $headersB = $this->merchantHeaders($merchantB_org, 'user-b');

        // Merchant B attempts to add a variant to Merchant A's product
        $resVariant = $this->withHeaders($headersB)->postJson("/api/v1/merchant/products/{$prodA->id}/variants", [
            'attributes' => ['color' => 'Blue'],
            'price_idr' => 99000,
            'stock_qty' => 10,
        ]);
        $resVariant->assertStatus(404);

        // Merchant B attempts to upload media to Merchant A's product
        $pngContent = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        $file = \Illuminate\Http\UploadedFile::fake()->createWithContent('malicious.png', $pngContent);

        $resMedia = $this->withHeaders($headersB)->postJson("/api/v1/merchant/products/{$prodA->id}/media", [
            'file' => $file,
            'scope' => 'GENERAL',
        ]);
        $resMedia->assertStatus(404);
    }
}
