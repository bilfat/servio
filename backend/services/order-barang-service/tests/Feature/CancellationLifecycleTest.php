<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Cancellation\CancellationService;
use App\Infrastructure\Finance\FinanceCheckoutClient;
use App\Models\CancellationRequest;
use App\Models\CheckoutGroup;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class CancellationLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function createOrder(string $status, string $merchantOrgId = 'ORG_STORE_A', string $customerId = 'CUST_01'): Order
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
            'payment_status_projection' => 'PAID',
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

    public function test_customer_can_cancel_confirmed_order_directly_and_delegates_refund(): void
    {
        $order = $this->createOrder(Order::STATUS_CONFIRMED, 'ORG_STORE_A', 'CUST_01');
        $headers = $this->customerHeaders('CUST_01');

        $mockFinance = Mockery::mock(FinanceCheckoutClient::class);
        $this->app->instance(FinanceCheckoutClient::class, $mockFinance);

        $mockFinance->shouldReceive('delegateCancellationRefund')
            ->once()
            ->withArgs(function ($sourceEventId, $merchantOrderId, $checkoutGroupId, $decisionSource, $reasonCode) use ($order) {
                return $merchantOrderId === $order->id
                    && $checkoutGroupId === $order->checkout_group_id
                    && $decisionSource === 'CUSTOMER'
                    && $reasonCode === 'CHANGE_OF_MIND';
            })
            ->andReturn(['status' => 'REFUND_QUEUED']);

        $cancel = $this->postJson("/api/v1/order-barang/orders/{$order->id}/cancel", [
            'reason_code' => 'CHANGE_OF_MIND',
            'note' => 'Ingin mengganti pesanan',
        ], $headers);

        $cancel->assertStatus(200);
        $this->assertEquals(Order::STATUS_CANCELLED, $cancel->json('data.status'));
    }

    public function test_cancellation_request_in_processing_blocks_packing(): void
    {
        $order = $this->createOrder(Order::STATUS_PROCESSING, 'ORG_STORE_A', 'CUST_01');
        $custHeaders = $this->customerHeaders('CUST_01');
        $merchantHeaders = $this->merchantHeaders('USER_M1', 'ORG_STORE_A');

        // Customer submits cancellation request
        $req = $this->postJson("/api/v1/order-barang/orders/{$order->id}/cancellation-requests", [
            'reason_code' => 'WRONG_ITEM_ORDERED',
            'note' => 'Salah pilih varian',
        ], $custHeaders);

        $req->assertStatus(201);
        $this->assertEquals(CancellationRequest::STATUS_PENDING, $req->json('data.status'));

        // Order remains in PROCESSING
        $freshOrder = Order::find($order->id);
        $this->assertEquals(Order::STATUS_PROCESSING, $freshOrder->status);
        $this->assertNotNull($freshOrder->active_cancellation_request_id);

        // Merchant attempts to PACK -> MUST BE BLOCKED (409)!
        $packAttempt = $this->postJson("/api/v1/order-barang/merchant/orders/{$order->id}/pack", [], $merchantHeaders);
        $packAttempt->assertStatus(409);
        $packAttempt->assertJsonPath('error.message', 'Pesanan tidak dapat dikemas karena ada pengajuan pembatalan yang sedang ditinjau.');
    }

    public function test_merchant_reject_without_reason_is_rejected(): void
    {
        $order = $this->createOrder(Order::STATUS_PROCESSING, 'ORG_STORE_A', 'CUST_01');
        $custHeaders = $this->customerHeaders('CUST_01');
        $merchantHeaders = $this->merchantHeaders('USER_M1', 'ORG_STORE_A');

        $req = $this->postJson("/api/v1/order-barang/orders/{$order->id}/cancellation-requests", [
            'reason_code' => 'WRONG_ITEM_ORDERED',
        ], $custHeaders);

        $requestId = $req->json('data.id');

        // Merchant rejects without reason
        $rejectWithoutReason = $this->postJson("/api/v1/order-barang/merchant/cancellation-requests/{$requestId}/decision", [
            'decision' => 'REJECTED',
            'reason_code' => '', // Empty!
        ], $merchantHeaders);

        $rejectWithoutReason->assertStatus(422);
    }

    public function test_merchant_reject_with_reason_keeps_order_processing_and_unblocks_packing(): void
    {
        $order = $this->createOrder(Order::STATUS_PROCESSING, 'ORG_STORE_A', 'CUST_01');
        $custHeaders = $this->customerHeaders('CUST_01');
        $merchantHeaders = $this->merchantHeaders('USER_M1', 'ORG_STORE_A');

        $req = $this->postJson("/api/v1/order-barang/orders/{$order->id}/cancellation-requests", [
            'reason_code' => 'WRONG_ITEM_ORDERED',
        ], $custHeaders);

        $requestId = $req->json('data.id');

        // Merchant rejects with valid reason
        $reject = $this->postJson("/api/v1/order-barang/merchant/cancellation-requests/{$requestId}/decision", [
            'decision' => 'REJECTED',
            'reason_code' => 'ITEM_ALREADY_PREPARED',
            'decision_note' => 'Barang sudah dipotong khusus sesuai pesanan.',
        ], $merchantHeaders);

        $reject->assertStatus(200);
        $this->assertEquals(CancellationRequest::STATUS_REJECTED, $reject->json('data.status'));

        // Order remains in PROCESSING, and packing is now unblocked
        $freshOrder = Order::find($order->id);
        $this->assertEquals(Order::STATUS_PROCESSING, $freshOrder->status);
        $this->assertNull($freshOrder->active_cancellation_request_id);

        // Merchant packs order -> SUCCESS!
        $pack = $this->postJson("/api/v1/order-barang/merchant/orders/{$order->id}/pack", [], $merchantHeaders);
        $pack->assertStatus(200);
        $this->assertEquals(Order::STATUS_PACKED, $pack->json('data.status'));
    }

    public function test_sla_12_operational_hours_auto_rejects_on_timeout(): void
    {
        $order = $this->createOrder(Order::STATUS_PROCESSING, 'ORG_STORE_A', 'CUST_01');

        // Manually create an overdue request (deadline 1 hour ago)
        $req = CancellationRequest::create([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'requested_by_id' => 'CUST_01',
            'reason_code' => 'CUSTOMER_TIMEOUT_TEST',
            'status' => CancellationRequest::STATUS_PENDING,
            'requested_at' => now()->subHours(20),
            'response_deadline_at' => now()->subHour(), // Expired!
            'merchant_schedule_source' => 'IDENTITY_01_OFFICIAL',
            'merchant_timezone' => 'Asia/Jakarta',
            'operational_schedule_snapshot' => ['days' => []],
        ]);

        $order->update(['active_cancellation_request_id' => $req->id]);

        // Run auto-reject service
        $cancellationService = app(CancellationService::class);
        $processed = $cancellationService->autoRejectOverdueRequests();

        $this->assertEquals(1, $processed);

        // Check request status = REJECTED, reason = TIMEOUT_NO_RESPONSE, decision_source = SYSTEM
        $freshReq = CancellationRequest::find($req->id);
        $this->assertEquals(CancellationRequest::STATUS_REJECTED, $freshReq->status);
        $this->assertEquals(CancellationRequest::DECISION_SOURCE_SYSTEM, $freshReq->decision_source);
        $this->assertEquals(CancellationRequest::REASON_TIMEOUT_NO_RESPONSE, $freshReq->decision_reason);

        // Order remains PROCESSING and active reference cleared
        $freshOrder = Order::find($order->id);
        $this->assertEquals(Order::STATUS_PROCESSING, $freshOrder->status);
        $this->assertNull($freshOrder->active_cancellation_request_id);
    }
}
