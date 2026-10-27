<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CheckoutGroup;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrderFulfillmentTest extends TestCase
{
    use RefreshDatabase;

    private function createOrderWithStatus(string $status, string $merchantOrgId = 'ORG_STORE_A', string $customerId = 'CUST_01'): Order
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
            'payment_status_projection' => in_array($status, [Order::STATUS_CREATED, Order::STATUS_PAYMENT_PENDING]) ? 'PENDING' : 'PAID',
            'customer_total_idr' => 100000,
        ]);

        $order = Order::create([
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
            'payment_status_projection' => in_array($status, [Order::STATUS_CREATED, Order::STATUS_PAYMENT_PENDING]) ? 'PENDING' : 'PAID',
            'status' => $status,
            'version' => 1,
        ]);

        OrderItem::create([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'product_id' => 'P1',
            'variant_id' => 'V1',
            'product_snapshot' => ['name' => 'Barang A'],
            'variant_snapshot' => ['name' => 'Default'],
            'quantity' => 1,
            'unit_price_idr' => 90000,
            'line_subtotal_idr' => 90000,
        ]);

        Delivery::create([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'service_type' => 'LOCAL_MERCHANT_MANAGED',
            'status' => Delivery::STATUS_NOT_STARTED,
        ]);

        return $order;
    }

    public function test_merchant_cannot_see_unpaid_orders_in_incoming_tab(): void
    {
        // 1 unpaid order
        $this->createOrderWithStatus(Order::STATUS_PAYMENT_PENDING, 'ORG_STORE_A');
        // 1 paid confirmed order
        $this->createOrderWithStatus(Order::STATUS_CONFIRMED, 'ORG_STORE_A');

        $headers = $this->merchantHeaders('USER_M1', 'ORG_STORE_A');

        // Incoming tab (should only show CONFIRMED/PAID)
        $res = $this->getJson('/api/v1/order-barang/merchant/orders?tab=incoming', $headers);
        $res->assertStatus(200);
        $res->assertJsonCount(1, 'data.data');
        $this->assertEquals(Order::STATUS_CONFIRMED, $res->json('data.data.0.status'));
    }

    public function test_fulfillment_lifecycle_process_pack_dispatch_delivered(): void
    {
        $order = $this->createOrderWithStatus(Order::STATUS_CONFIRMED, 'ORG_STORE_A');
        $headers = $this->merchantHeaders('USER_M1', 'ORG_STORE_A');

        // 1. Process Order: CONFIRMED -> PROCESSING
        $process = $this->postJson("/api/v1/order-barang/merchant/orders/{$order->id}/process", [], $headers);
        $process->assertStatus(200);
        $this->assertEquals(Order::STATUS_PROCESSING, $process->json('data.status'));

        // 2. Pack Order: PROCESSING -> PACKED
        $pack = $this->postJson("/api/v1/order-barang/merchant/orders/{$order->id}/pack", [], $headers);
        $pack->assertStatus(200);
        $this->assertEquals(Order::STATUS_PACKED, $pack->json('data.status'));

        // 3. Configure Courier: Kurir Toko
        $courier = $this->putJson("/api/v1/order-barang/merchant/orders/{$order->id}/delivery", [
            'courier_method' => 'KURIR_TOKO',
            'courier_name' => 'Ahmad Supir',
            'courier_phone' => '+62812345678',
        ], $headers);
        $courier->assertStatus(200);
        $this->assertEquals('KURIR_TOKO', $courier->json('data.courier_method'));

        // 4. Dispatch Order: PACKED -> DELIVERING (requires proof of pickup)
        $dispatch = $this->postJson("/api/v1/order-barang/merchant/orders/{$order->id}/dispatch", [
            'proof_of_pickup' => 'evidence_pickup_001.jpg',
        ], $headers);
        $dispatch->assertStatus(200);
        $this->assertEquals(Order::STATUS_DELIVERING, $dispatch->json('data.status'));

        // 5. Mark Delivered: DELIVERING -> DELIVERED (requires recipient name & proof)
        $delivered = $this->postJson("/api/v1/order-barang/merchant/orders/{$order->id}/delivered", [
            'recipient_name' => 'Budi Santoso (Diterima Satpam)',
            'proof_reference' => 'evidence_pod_001.jpg',
        ], $headers);
        $delivered->assertStatus(200);
        $this->assertEquals(Order::STATUS_DELIVERED, $delivered->json('data.status'));
        $this->assertNotNull($delivered->json('data.delivered_at'));
    }

    public function test_delivery_failure_does_not_cancel_order_or_refund(): void
    {
        $order = $this->createOrderWithStatus(Order::STATUS_DELIVERING, 'ORG_STORE_A');
        $headers = $this->merchantHeaders('USER_M1', 'ORG_STORE_A');

        $fail = $this->postJson("/api/v1/order-barang/merchant/orders/{$order->id}/delivery-failure", [
            'failure_reason_code' => 'RECIPIENT_NOT_AT_HOME',
            'note' => 'Rumah terkunci, tidak ada yang menerima.',
        ], $headers);

        $fail->assertStatus(200);
        $fail->assertJsonPath('data.status', Delivery::STATUS_FAILED);
        $fail->assertJsonPath('data.last_failure_code', 'RECIPIENT_NOT_AT_HOME');

        // Crucial: Order status must remain DELIVERING
        $freshOrder = Order::find($order->id);
        $this->assertEquals(Order::STATUS_DELIVERING, $freshOrder->status);
    }
}
