<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Order\OrderTransitionService;
use App\Models\CheckoutGroup;
use App\Models\Delivery;
use App\Models\Order;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ConcurrencyAndIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_idempotency_middleware_returns_cached_response_for_identical_request(): void
    {
        $headers = array_merge($this->customerHeaders('CUST_IDEMP_01'), [
            'Idempotency-Key' => 'IDEMP_KEY_XYZ_123',
        ]);

        $payload = [
            'product_id' => 'PROD_IDEMP',
            'variant_id' => 'VAR_IDEMP',
            'quantity' => 2,
            'merchant_org_id' => 'ORG_A',
        ];

        // First request
        $res1 = $this->postJson('/api/v1/order-barang/cart/items', $payload, $headers);
        $res1->assertStatus(201);
        $itemId1 = $res1->json('data.id');

        // Second identical request with same Idempotency-Key
        $res2 = $this->postJson('/api/v1/order-barang/cart/items', $payload, $headers);
        $res2->assertStatus(201);
        $itemId2 = $res2->json('data.id');

        $this->assertEquals($itemId1, $itemId2);
    }

    public function test_idempotency_middleware_returns_409_for_different_payload_with_same_key(): void
    {
        $headers = array_merge($this->customerHeaders('CUST_IDEMP_02'), [
            'Idempotency-Key' => 'IDEMP_KEY_SAME_KEY',
        ]);

        // First request: quantity = 1
        $res1 = $this->postJson('/api/v1/order-barang/cart/items', [
            'product_id' => 'PROD_1',
            'variant_id' => 'VAR_1',
            'quantity' => 1,
            'merchant_org_id' => 'ORG_A',
        ], $headers);
        $res1->assertStatus(201);

        // Second request with same key but quantity = 5 (payload altered)
        $res2 = $this->postJson('/api/v1/order-barang/cart/items', [
            'product_id' => 'PROD_1',
            'variant_id' => 'VAR_1',
            'quantity' => 5,
            'merchant_org_id' => 'ORG_A',
        ], $headers);

        $res2->assertStatus(409);
        $res2->assertJsonPath('error.code', 'IDEMPOTENCY_CONFLICT');
    }

    public function test_optimistic_locking_rejects_stale_order_version(): void
    {
        $group = CheckoutGroup::create([
            'id' => (string) Str::ulid(),
            'customer_id' => 'CUST_CONC',
            'address_id' => 'ADDR_01',
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'selected_items_hash' => 'hash',
            'idempotency_key' => 'idemp_conc_01',
            'payment_status_projection' => 'PAID',
            'customer_total_idr' => 100000,
        ]);

        $order = Order::create([
            'id' => (string) Str::ulid(),
            'order_number' => 'ORD-CONC-01',
            'checkout_group_id' => $group->id,
            'customer_id' => 'CUST_CONC',
            'merchant_org_id' => 'ORG_CONC',
            'merchant_display_snapshot' => ['name' => 'Toko Conc'],
            'address_id' => 'ADDR_01',
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'origin_snapshot' => ['city' => 'Jakarta'],
            'shipping_snapshot' => ['shipping_fee_idr' => 10000],
            'product_subtotal_idr' => 90000,
            'shipping_customer_idr' => 10000,
            'customer_total_idr' => 100000,
            'payment_status_projection' => 'PAID',
            'status' => Order::STATUS_CONFIRMED,
            'version' => 1,
        ]);

        Delivery::create([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'status' => Delivery::STATUS_NOT_STARTED,
        ]);

        $transitionService = app(OrderTransitionService::class);

        // Process order with correct expected_version = 1 -> version becomes 2
        $transitionService->transition($order, Order::STATUS_PROCESSING, 'ACTION', 'A1', 'MERCHANT', expectedVersion: 1);

        // Another concurrent worker attempts transition with expected_version = 1 -> MUST BE REJECTED (409)!
        $this->expectException(Exception::class);
        $this->expectExceptionCode(409);

        $transitionService->transition($order, Order::STATUS_PACKED, 'ACTION2', 'A2', 'MERCHANT', expectedVersion: 1);
    }
}
