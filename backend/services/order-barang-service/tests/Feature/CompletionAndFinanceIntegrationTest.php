<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Completion\AutoCompletionService;
use App\Models\CheckoutGroup;
use App\Models\Delivery;
use App\Models\IntegrationOutboxEvent;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PaymentProjection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CompletionAndFinanceIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private function createDeliveredOrder(string $deliveredAt): Order
    {
        $group = CheckoutGroup::create([
            'id' => (string) Str::ulid(),
            'customer_id' => 'CUST_01',
            'address_id' => 'ADDR_01',
            'recipient_snapshot' => ['recipient_name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'selected_items_hash' => 'hash123',
            'idempotency_key' => (string) Str::uuid(),
            'orchestration_status' => 'PAID_CONFIRMED',
            'payment_status_projection' => 'PAID',
            'customer_total_idr' => 100000,
        ]);

        $order = Order::create([
            'id' => (string) Str::ulid(),
            'order_number' => 'ORD-' . Str::upper(Str::random(8)),
            'checkout_group_id' => $group->id,
            'customer_id' => 'CUST_01',
            'merchant_org_id' => 'ORG_STORE_A',
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
            'status' => Order::STATUS_DELIVERED,
            'delivered_at' => $deliveredAt,
            'version' => 5,
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
            'status' => Delivery::STATUS_DELIVERED,
            'delivered_at' => $deliveredAt,
            'recipient_name' => 'Budi Santoso',
            'proof_reference' => 'PROOF_POD_001',
            'proof_verified' => true,
        ]);

        return $order;
    }

    public function test_customer_can_manually_confirm_order_and_generates_finance_outbox_event(): void
    {
        $order = $this->createDeliveredOrder(now()->subHours(10)->toDateTimeString());
        $headers = $this->customerHeaders('CUST_01');

        $confirm = $this->postJson("/api/v1/order-barang/orders/{$order->id}/confirm-received", [], $headers);
        $confirm->assertStatus(200);
        $this->assertEquals(Order::STATUS_COMPLETED, $confirm->json('data.status'));

        // Verify single outbox event for Finance 06
        $outbox = IntegrationOutboxEvent::where('destination_service', 'FINANCE_06')
            ->where('aggregate_id', $order->id)
            ->first();

        $this->assertNotNull($outbox);
        $this->assertEquals('finance.order_completed.v1', $outbox->event_type);
        $this->assertEquals($order->id, $outbox->payload_json['merchant_order_id']);
    }

    public function test_auto_completion_strictly_at_72_hours_post_delivered(): void
    {
        // Order 1: delivered 71 hours ago -> NOT eligible!
        $orderNotEligible = $this->createDeliveredOrder(now()->subHours(71)->toDateTimeString());

        // Order 2: delivered 73 hours ago -> ELIGIBLE!
        $orderEligible = $this->createDeliveredOrder(now()->subHours(73)->toDateTimeString());

        $autoCompletionService = app(AutoCompletionService::class);
        $completedCount = $autoCompletionService->processAutoCompletions();

        $this->assertEquals(1, $completedCount);

        // Order 1 remains DELIVERED
        $this->assertEquals(Order::STATUS_DELIVERED, Order::find($orderNotEligible->id)->status);

        // Order 2 moved to COMPLETED
        $this->assertEquals(Order::STATUS_COMPLETED, Order::find($orderEligible->id)->status);
    }

    public function test_finance_payment_confirmed_event_inbox_atomically_confirms_child_orders(): void
    {
        // Create CheckoutGroup with 2 orders in PAYMENT_PENDING
        $groupId = (string) Str::ulid();
        $group = CheckoutGroup::create([
            'id' => $groupId,
            'customer_id' => 'CUST_01',
            'address_id' => 'ADDR_01',
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'selected_items_hash' => 'hash',
            'idempotency_key' => 'idemp_pay_01',
            'payment_status_projection' => 'PENDING',
            'customer_total_idr' => 200000,
        ]);

        $orderA = Order::create([
            'id' => (string) Str::ulid(),
            'order_number' => 'ORD-A-01',
            'checkout_group_id' => $groupId,
            'customer_id' => 'CUST_01',
            'merchant_org_id' => 'ORG_A',
            'merchant_display_snapshot' => ['name' => 'Toko A'],
            'address_id' => 'ADDR_01',
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'origin_snapshot' => ['city' => 'Jakarta'],
            'shipping_snapshot' => ['shipping_fee_idr' => 10000],
            'product_subtotal_idr' => 90000,
            'shipping_customer_idr' => 10000,
            'customer_total_idr' => 100000,
            'payment_status_projection' => 'PENDING',
            'status' => Order::STATUS_PAYMENT_PENDING,
            'version' => 1,
        ]);

        $orderB = Order::create([
            'id' => (string) Str::ulid(),
            'order_number' => 'ORD-B-01',
            'checkout_group_id' => $groupId,
            'customer_id' => 'CUST_01',
            'merchant_org_id' => 'ORG_B',
            'merchant_display_snapshot' => ['name' => 'Toko B'],
            'address_id' => 'ADDR_01',
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'origin_snapshot' => ['city' => 'Jakarta'],
            'shipping_snapshot' => ['shipping_fee_idr' => 10000],
            'product_subtotal_idr' => 90000,
            'shipping_customer_idr' => 10000,
            'customer_total_idr' => 100000,
            'payment_status_projection' => 'PENDING',
            'status' => Order::STATUS_PAYMENT_PENDING,
            'version' => 1,
        ]);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $groupId,
            'finance_payment_id' => 'PAY_001',
            'payment_status' => 'PENDING',
            'amount_idr' => 200000,
            'currency' => 'IDR',
        ]);

        $eventId = 'FIN_EVT_' . Str::random(16);

        $payload = [
            'event_id' => $eventId,
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $groupId,
                'payment_id' => 'PAY_001',
                'amount_idr' => 200000,
                'currency' => 'IDR',
                'paid_at' => now()->toIso8601String(),
                'merchant_order_ids' => [$orderA->id, $orderB->id],
            ],
        ];

        // Post internal finance event
        $res = $this->postJson('/internal/v1/order-barang/finance-events', $payload, $this->internalHeaders());
        $res->assertStatus(200);
        $res->assertJsonPath('data.status', 'PROCESSED');

        // Verify both orders are now CONFIRMED
        $this->assertEquals(Order::STATUS_CONFIRMED, Order::find($orderA->id)->status);
        $this->assertEquals(Order::STATUS_CONFIRMED, Order::find($orderB->id)->status);

        // Verify duplicate callback returns ALREADY_PROCESSED
        $resDup = $this->postJson('/internal/v1/order-barang/finance-events', $payload, $this->internalHeaders());
        $resDup->assertStatus(200);
        $resDup->assertJsonPath('data.status', 'ALREADY_PROCESSED');
    }
}
