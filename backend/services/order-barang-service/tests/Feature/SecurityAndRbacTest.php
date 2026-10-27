<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CheckoutGroup;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SecurityAndRbacTest extends TestCase
{
    use RefreshDatabase;

    private function createOrderFor(string $customerId, string $merchantOrgId): Order
    {
        $group = CheckoutGroup::create([
            'id' => (string) Str::ulid(),
            'customer_id' => $customerId,
            'address_id' => 'ADDR_01',
            'recipient_snapshot' => ['recipient_name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'selected_items_hash' => 'hash123',
            'idempotency_key' => (string) Str::uuid(),
            'orchestration_status' => 'PAID_CONFIRMED',
            'payment_status_projection' => 'PAID',
            'customer_total_idr' => 100000,
        ]);

        return Order::create([
            'id' => (string) Str::ulid(),
            'order_number' => 'ORD-' . Str::upper(Str::random(8)),
            'checkout_group_id' => $group->id,
            'customer_id' => $customerId,
            'merchant_org_id' => $merchantOrgId,
            'merchant_display_snapshot' => ['name' => 'Toko A'],
            'address_id' => 'ADDR_01',
            'recipient_snapshot' => ['recipient_name' => 'Budi'],
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
    }

    public function test_customer_a_cannot_view_customer_b_order(): void
    {
        $orderB = $this->createOrderFor('CUST_B', 'ORG_STORE_A');

        // Customer A attempts to view Customer B's order
        $headersA = $this->customerHeaders('CUST_A');
        $res = $this->getJson("/api/v1/order-barang/orders/{$orderB->id}", $headersA);

        $res->assertStatus(404);
        $res->assertJsonPath('error.code', 'ORDER_NOT_FOUND');
    }

    public function test_merchant_a_cannot_view_or_manipulate_merchant_b_order(): void
    {
        $orderB = $this->createOrderFor('CUST_A', 'ORG_STORE_B');

        // Merchant A attempts to view Merchant B's order
        $headersA = $this->merchantHeaders('USER_M1', 'ORG_STORE_A');
        $res = $this->getJson("/api/v1/order-barang/merchant/orders/{$orderB->id}", $headersA);

        $res->assertStatus(404);

        // Merchant A attempts to process Merchant B's order
        $proc = $this->postJson("/api/v1/order-barang/merchant/orders/{$orderB->id}/process", [], $headersA);
        $proc->assertStatus(404);
    }

    public function test_untrusted_gateway_context_is_rejected_with_403(): void
    {
        // Request with actor header but WRONG gateway key
        $badHeaders = [
            'X-Gateway-Key' => 'invalid_gateway_key_9999',
            'X-Actor-User-Id' => 'CUST_A',
            'X-Actor-Role' => 'CUSTOMER',
        ];

        $res = $this->getJson('/api/v1/order-barang/cart', $badHeaders);
        $res->assertStatus(403);
        $res->assertJsonPath('error.code', 'ORDER_UNTRUSTED_GATEWAY_CONTEXT');
    }

    public function test_internal_routes_reject_unauthenticated_callers_with_401(): void
    {
        // Request internal route with wrong key
        $res = $this->getJson('/internal/v1/order-barang/orders/dummy_id', [
            'X-Internal-Service-Key' => 'wrong_key',
        ]);

        $res->assertStatus(401);
        $res->assertJsonPath('error.code', 'ORDER_UNAUTHORIZED_SERVICE');
    }

    public function test_role_enforcement_prevents_unauthorized_endpoints(): void
    {
        // Customer attempting to access merchant orders endpoint
        $custHeaders = $this->customerHeaders('CUST_01');
        $res = $this->getJson('/api/v1/order-barang/merchant/orders', $custHeaders);

        $res->assertStatus(403);
        $res->assertJsonPath('error.code', 'ORDER_FORBIDDEN_ROLE');
    }
}
