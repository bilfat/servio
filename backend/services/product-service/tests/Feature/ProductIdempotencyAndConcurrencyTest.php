<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ProductIdempotencyAndConcurrencyTest extends TestCase
{
    use DatabaseTransactions;

    public function test_idempotent_request_replays_cached_response(): void
    {
        $headers = array_merge($this->merchantHeaders(), [
            'Idempotency-Key' => 'unique-test-key-12345',
        ]);

        $payload = [
            'name' => 'Produk Idempotent',
            'description' => 'Testing idempotency replay',
        ];

        // First attempt: creates product
        $res1 = $this->withHeaders($headers)->postJson('/api/v1/merchant/products', $payload);
        $res1->assertStatus(201);
        $prodId1 = $res1->json('data.id');

        // Second attempt with exact same key & body: returns replay of first response
        $res2 = $this->withHeaders($headers)->postJson('/api/v1/merchant/products', $payload);
        $res2->assertStatus(201);
        $res2->assertHeader('X-Idempotent-Replayed', 'true');
        $this->assertEquals($prodId1, $res2->json('data.id'));
    }

    public function test_reused_idempotency_key_with_different_payload_is_rejected_with_409(): void
    {
        $headers = array_merge($this->merchantHeaders(), [
            'Idempotency-Key' => 'reused-key-999',
        ]);

        $payload1 = [
            'name' => 'First Product Name',
        ];

        $payload2 = [
            'name' => 'Different Product Name Completely',
        ];

        $res1 = $this->withHeaders($headers)->postJson('/api/v1/merchant/products', $payload1);
        $res1->assertStatus(201);

        // Reusing same key for different payload -> 409
        $res2 = $this->withHeaders($headers)->postJson('/api/v1/merchant/products', $payload2);
        $res2->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'PRODUCT_IDEMPOTENCY_KEY_REUSED',
            ]);
    }

    public function test_stale_if_match_on_product_update_is_rejected_with_409(): void
    {
        $headers = $this->merchantHeaders();

        // 1. Create product (lock_version = 1)
        $res = $this->withHeaders($headers)->postJson('/api/v1/merchant/products', [
            'name' => 'Concurrent Product',
        ]);
        $prodId = $res->json('data.id');

        // 2. First update with correct If-Match: 1 (increments to lock_version = 2)
        $resUpdate1 = $this->withHeaders(array_merge($headers, ['If-Match' => '1']))->patchJson("/api/v1/merchant/products/{$prodId}", [
            'name' => 'First Update Winner',
        ]);
        $resUpdate1->assertStatus(200);

        // 3. Second update with stale If-Match: 1 (should fail with 409 Conflict)
        $resUpdate2 = $this->withHeaders(array_merge($headers, ['If-Match' => '1']))->patchJson("/api/v1/merchant/products/{$prodId}", [
            'name' => 'Second Update Stale',
        ]);
        $resUpdate2->assertStatus(409);
    }

    public function test_stale_if_match_on_variant_update_is_rejected_with_409(): void
    {
        $headers = $this->merchantHeaders();

        // 1. Create product
        $resProd = $this->withHeaders($headers)->postJson('/api/v1/merchant/products', [
            'name' => 'Concurrent Variant Product',
        ]);
        $prodId = $resProd->json('data.id');

        // 2. Create variant (lock_version = 1)
        $resVar = $this->withHeaders($headers)->postJson("/api/v1/merchant/products/{$prodId}/variants", [
            'attributes' => ['size' => 'L'],
            'price_idr' => 150000,
            'stock_qty' => 10,
        ]);
        $varId = $resVar->json('data.id');

        // 3. First update with correct If-Match: 1 (increments variant to lock_version = 2)
        $resVar1 = $this->withHeaders(array_merge($headers, ['If-Match' => '1']))->patchJson("/api/v1/merchant/products/{$prodId}/variants/{$varId}", [
            'price_idr' => 160000,
        ]);
        $resVar1->assertStatus(200);

        // 4. Second update with stale If-Match: 1 (should fail with 409 Conflict)
        $resVar2 = $this->withHeaders(array_merge($headers, ['If-Match' => '1']))->patchJson("/api/v1/merchant/products/{$prodId}/variants/{$varId}", [
            'price_idr' => 170000,
        ]);
        $resVar2->assertStatus(409);
    }
}
