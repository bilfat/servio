<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Completion\AutoCompletionService;
use App\Domain\Integration\PaymentEventHandler;
use App\Infrastructure\Dispute\DisputeAuthorityClient;
use App\Infrastructure\Finance\FinanceCheckoutClient;
use App\Infrastructure\Product\ProductClient;
use App\Models\CheckoutGroup;
use App\Models\Delivery;
use App\Models\IntegrationInboxEvent;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PaymentProjection;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class Prompt04SecurityClosingRegressionTest extends TestCase
{
    use RefreshDatabase;

    private function createOrderFixture(
        string $status = Order::STATUS_CONFIRMED,
        string $orgId = 'ORG_STORE_A',
        string $customerId = 'CUST_TEST_01',
        int $totalIdr = 100000
    ): array {
        $groupId = (string) Str::ulid();
        $group = CheckoutGroup::create([
            'id' => $groupId,
            'customer_id' => $customerId,
            'address_id' => 'ADDR_01',
            'recipient_snapshot' => ['recipient_name' => 'Budi Santoso', 'phone' => '+6281234567890'],
            'address_snapshot' => ['address_id' => 'ADDR_01', 'city' => 'Jakarta Pusat', 'region_code' => 'KOTA_JAKARTA_PUSAT'],
            'selected_items_hash' => 'hash_test',
            'idempotency_key' => 'idemp_' . Str::random(10),
            'payment_status_projection' => $status === Order::STATUS_PAYMENT_PENDING ? 'PENDING' : 'PAID',
            'customer_total_idr' => $totalIdr,
        ]);

        $order = Order::create([
            'id' => (string) Str::ulid(),
            'order_number' => 'ORD-' . strtoupper(Str::random(8)),
            'checkout_group_id' => $groupId,
            'customer_id' => $customerId,
            'merchant_org_id' => $orgId,
            'merchant_display_snapshot' => ['name' => 'Toko Resmi'],
            'address_id' => 'ADDR_01',
            'recipient_snapshot' => ['recipient_name' => 'Budi Santoso'],
            'address_snapshot' => ['city' => 'Jakarta Pusat'],
            'origin_snapshot' => ['city' => 'Jakarta Pusat'],
            'shipping_snapshot' => ['tier_id' => 'TIER_1', 'shipping_fee_idr' => 10000],
            'product_subtotal_idr' => $totalIdr - 10000,
            'shipping_customer_idr' => 10000,
            'customer_total_idr' => $totalIdr,
            'payment_status_projection' => $status === Order::STATUS_PAYMENT_PENDING ? 'PENDING' : 'PAID',
            'status' => $status,
            'version' => 1,
            'is_hold_active' => false,
            'hold_sequence' => 0,
            'delivered_at' => $status === Order::STATUS_DELIVERED ? now()->subHours(80) : null,
        ]);

        OrderItem::create([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'product_id' => 'PROD_01',
            'variant_id' => 'VAR_01',
            'product_snapshot' => ['name' => 'Produk Tes'],
            'variant_snapshot' => ['name' => 'Default'],
            'quantity' => 1,
            'unit_price_idr' => $totalIdr - 10000,
            'line_subtotal_idr' => $totalIdr - 10000,
        ]);

        $delivery = Delivery::create([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'service_type' => 'LOCAL_MERCHANT_MANAGED',
            'status' => $status === Order::STATUS_DELIVERED ? Delivery::STATUS_DELIVERED : Delivery::STATUS_NOT_STARTED,
            'delivered_at' => $status === Order::STATUS_DELIVERED ? now()->subHours(80) : null,
            'recipient_name' => 'Budi Santoso',
            'proof_reference' => 'PROOF_POD_01',
            'proof_verified' => true,
        ]);

        return [$group, $order, $delivery];
    }

    // ==========================================
    // FIX 22: STRICT HOLD/UNHOLD SEQUENCE TESTS
    // ==========================================

    public function test_fix_22_unhold_without_sequence_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        // Put order on hold first
        $order->update(['is_hold_active' => true, 'hold_sequence' => 5]);

        // Attempt UNHOLD without event_sequence field
        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => false,
            'source_service' => 'AFTERSALES_07',
            'event_id' => 'EVT_UNHOLD_NO_SEQ',
        ], $this->internalHeaders());

        $res->assertStatus(422);
        $this->assertEquals('PENDING_HOLD_SEQUENCE_CONTRACT', $res->json('error.code'));
        $this->assertTrue($order->fresh()->is_hold_active, "Hold must remain ACTIVE!");
    }

    public function test_fix_22_unhold_with_null_sequence_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);
        $order->update(['is_hold_active' => true, 'hold_sequence' => 5]);

        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => false,
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => null,
            'event_id' => 'EVT_UNHOLD_NULL_SEQ',
        ], $this->internalHeaders());

        $res->assertStatus(422);
        $this->assertEquals('PENDING_HOLD_SEQUENCE_CONTRACT', $res->json('error.code'));
        $this->assertTrue($order->fresh()->is_hold_active);
    }

    public function test_fix_22_unhold_with_invalid_string_sequence_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);
        $order->update(['is_hold_active' => true, 'hold_sequence' => 5]);

        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => false,
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => 'not_a_valid_integer',
            'event_id' => 'EVT_UNHOLD_BAD_SEQ',
        ], $this->internalHeaders());

        $res->assertStatus(422);
        $this->assertTrue($order->fresh()->is_hold_active);
    }

    public function test_fix_22_unhold_with_smaller_sequence_is_rejected_409(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        // Active hold with sequence 10
        $order->update([
            'is_hold_active' => true,
            'hold_sequence' => 10,
            'hold_event_id' => 'EVT_HOLD_10',
            'hold_source_service' => 'AFTERSALES_07',
        ]);

        // Stale UNHOLD with sequence 9
        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => false,
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => 9,
            'event_id' => 'EVT_UNHOLD_9',
        ], $this->internalHeaders());

        $res->assertStatus(409);
        $this->assertStringContainsString('STALE_UNHOLD_EVENT', $res->json('error.message'));
        $this->assertTrue($order->fresh()->is_hold_active, "Hold must remain ACTIVE!");
        $this->assertEquals(10, $order->fresh()->hold_sequence);
    }

    public function test_fix_22_unhold_with_same_sequence_different_payload_is_rejected_409(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        // Active hold applied at sequence 10 with event EVT_HOLD_10
        $order->update([
            'is_hold_active' => true,
            'hold_sequence' => 10,
            'hold_event_id' => 'EVT_HOLD_10',
            'hold_source_service' => 'AFTERSALES_07',
        ]);

        // UNHOLD with same sequence 10 but different event_id
        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => false,
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => 10,
            'event_id' => 'EVT_UNHOLD_DIFFERENT_10',
        ], $this->internalHeaders());

        $res->assertStatus(409);
        $this->assertStringContainsString('CONFLICTING_HOLD_SEQUENCE', $res->json('error.message'));
        $this->assertTrue($order->fresh()->is_hold_active);
    }

    public function test_fix_22_hold_sequence_10_then_authorized_unhold_sequence_11_succeeds(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        // Apply hold sequence 10
        $resHold = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'hold_reason' => 'CUSTOMER_DISPUTE_OPENED',
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => 10,
            'event_id' => 'EVT_HOLD_10A',
        ], $this->internalHeaders());
        $resHold->assertStatus(200);

        // Send valid UNHOLD with sequence 11
        $resUnhold = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => false,
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => 11,
            'event_id' => 'EVT_UNHOLD_11',
        ], $this->internalHeaders());

        $resUnhold->assertStatus(200);
        $this->assertFalse($order->fresh()->is_hold_active, "Hold must be RELEASED");
        $this->assertEquals(11, $order->fresh()->hold_sequence);
    }

    public function test_fix_22_duplicate_event_id_with_different_payload_rejected_409(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        // First event processed
        $res1 = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'hold_reason' => 'DISPUTE_A',
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => 1,
            'event_id' => 'EVT_IDEMP_SAME',
        ], $this->internalHeaders());
        $res1->assertStatus(200);

        // Second event with SAME event_id but DIFFERENT payload (different reason)
        $res2 = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'hold_reason' => 'DISPUTE_B_TAMPERED',
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => 1,
            'event_id' => 'EVT_IDEMP_SAME',
        ], $this->internalHeaders());

        $res2->assertStatus(409);
        $this->assertEquals('IDEMPOTENCY_CONFLICT', $res2->json('error.code'));
    }

    // ========================================================
    // FIX 23: PAYMENT FAILED/EXPIRED IDENTITY VERIFICATION
    // ========================================================

    public function test_fix_23_failed_event_with_valid_payment_id_processes_lifecycle(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        $paymentId = 'PAY_REAL_001';
        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => $paymentId,
            'payment_status' => 'PENDING',
            'amount_idr' => 100000,
            'currency' => 'IDR',
            'expires_at' => now()->addHours(6),
        ]);

        $handler = app(PaymentEventHandler::class);
        $result = $handler->handleFinanceEvent([
            'event_id' => 'EVT_FAIL_01',
            'event_type' => 'finance.payment.failed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => $paymentId,
                'amount_idr' => 100000,
                'currency' => 'IDR',
            ],
        ]);

        $this->assertEquals('PROCESSED', $result['status']);
        $this->assertEquals('FAILED', $group->fresh()->payment_status_projection);
    }

    public function test_fix_23_expired_event_with_valid_payment_id_cancels_unpaid_orders(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        $paymentId = 'PAY_REAL_002';
        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => $paymentId,
            'payment_status' => 'PENDING',
            'amount_idr' => 100000,
            'currency' => 'IDR',
            'expires_at' => now()->subMinutes(5),
        ]);

        $handler = app(PaymentEventHandler::class);
        $result = $handler->handleFinanceEvent([
            'event_id' => 'EVT_EXP_01',
            'event_type' => 'finance.payment.expired.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => $paymentId,
                'amount_idr' => 100000,
                'currency' => 'IDR',
            ],
        ]);

        $this->assertEquals('PROCESSED', $result['status']);
        $this->assertEquals('EXPIRED', $group->fresh()->payment_status_projection);
        $this->assertEquals(Order::STATUS_CANCELLED, $order->fresh()->status);
    }

    public function test_fix_23_failed_event_with_foreign_payment_id_is_rejected_409(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_REAL_OFFICIAL',
            'payment_status' => 'PENDING',
            'amount_idr' => 100000,
            'currency' => 'IDR',
            'expires_at' => now()->addHours(6),
        ]);

        $handler = app(PaymentEventHandler::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('PAYMENT_ID_MISMATCH');

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_FAIL_ROGUE',
            'event_type' => 'finance.payment.failed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_FOREIGN_HACK',
                'amount_idr' => 100000,
                'currency' => 'IDR',
            ],
        ]);

        // Status must NOT change
        $this->assertEquals('PENDING', $group->fresh()->payment_status_projection);
    }

    public function test_fix_23_expired_event_with_foreign_payment_id_is_rejected_409(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_REAL_OFFICIAL',
            'payment_status' => 'PENDING',
            'amount_idr' => 100000,
            'currency' => 'IDR',
            'expires_at' => now()->addHours(6),
        ]);

        $handler = app(PaymentEventHandler::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('PAYMENT_ID_MISMATCH');

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_EXP_ROGUE',
            'event_type' => 'finance.payment.expired.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_FOREIGN_HACK',
                'amount_idr' => 100000,
                'currency' => 'IDR',
            ],
        ]);

        // Orders must NOT be cancelled!
        $this->assertEquals(Order::STATUS_PAYMENT_PENDING, $order->fresh()->status);
    }

    public function test_fix_23_failed_event_without_payment_id_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        $handler = app(PaymentEventHandler::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Data payment_id tidak boleh kosong');

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_FAIL_EMPTY_PAY',
            'event_type' => 'finance.payment.failed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => '',
            ],
        ]);
    }

    public function test_fix_23_expired_event_without_payment_projection_is_rejected_409(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);
        // NO PaymentProjection created!

        $handler = app(PaymentEventHandler::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('QUARANTINED_UNMATCHED_PROJECTION');

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_EXP_NO_PROJ',
            'event_type' => 'finance.payment.expired.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_UNPROJECTION_01',
            ],
        ]);
    }

    public function test_fix_23_paid_then_expired_does_not_downgrade_orders(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);
        $group->update(['payment_status_projection' => 'PAID']);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_ALREADY_PAID',
            'payment_status' => 'PAID',
            'amount_idr' => 100000,
            'currency' => 'IDR',
            'expires_at' => now()->addHours(6),
        ]);

        $handler = app(PaymentEventHandler::class);
        $result = $handler->handleFinanceEvent([
            'event_id' => 'EVT_EXP_AFTER_PAID',
            'event_type' => 'finance.payment.expired.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_ALREADY_PAID',
                'amount_idr' => 100000,
                'currency' => 'IDR',
            ],
        ]);

        $this->assertEquals('PROCESSED', $result['status']);
        // Crucial: Group remains PAID and order remains CONFIRMED
        $this->assertEquals('PAID', $group->fresh()->payment_status_projection);
        $this->assertEquals(Order::STATUS_CONFIRMED, $order->fresh()->status);
    }

    public function test_fix_23_late_paid_after_expired_requires_reconciliation(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CANCELLED);
        $group->update(['payment_status_projection' => 'EXPIRED']);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_LATE_ARRIVING',
            'payment_status' => 'EXPIRED',
            'amount_idr' => 100000,
            'currency' => 'IDR',
            'expires_at' => now()->subHours(1),
        ]);

        $handler = app(PaymentEventHandler::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('RECONCILIATION_REQUIRED');

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_PAID_LATE',
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_LATE_ARRIVING',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id],
            ],
        ]);
    }

    // ========================================================
    // FIX 24: MANUAL COMPLETION MUST CHECK DISPUTE AUTHORITY
    // ========================================================

    public function test_fix_24_customer_manual_confirm_with_clear_dispute_authority_succeeds(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_DELIVERED);

        // Dispute mock defaults to CLEAR in TestCase
        $res = $this->postJson("/api/v1/order-barang/orders/{$order->id}/confirm-received", [], $this->customerHeaders($order->customer_id));

        $res->assertStatus(200);
        $this->assertEquals(Order::STATUS_COMPLETED, $order->fresh()->status);
    }

    public function test_fix_24_customer_manual_confirm_before_72h_with_clear_authority_succeeds(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_DELIVERED);
        // Delivered only 2 hours ago (< 72 hours)
        $order->update(['delivered_at' => now()->subHours(2)]);
        $delivery->update(['delivered_at' => now()->subHours(2)]);

        $res = $this->postJson("/api/v1/order-barang/orders/{$order->id}/confirm-received", [], $this->customerHeaders($order->customer_id));

        $res->assertStatus(200);
        $this->assertEquals(Order::STATUS_COMPLETED, $order->fresh()->status);
    }

    public function test_fix_24_customer_manual_confirm_with_active_dispute_is_rejected_409(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_DELIVERED);

        $mockDispute = Mockery::mock(DisputeAuthorityClient::class);
        $mockDispute->shouldReceive('verifyDisputeClearance')
            ->once()
            ->andReturn([
                'status' => 'DISPUTE_ACTIVE',
                'has_active_dispute' => true,
                'has_active_complaint' => false,
                'contract_available' => true,
                'message' => 'Pesanan memiliki sengketa aktif dalam proses mediasi.',
            ]);
        $this->app->instance(DisputeAuthorityClient::class, $mockDispute);

        $res = $this->postJson("/api/v1/order-barang/orders/{$order->id}/confirm-received", [], $this->customerHeaders($order->customer_id));

        $res->assertStatus(409);
        $this->assertStringContainsString('Pesanan memiliki sengketa/komplain aktif', $res->json('error.message'));
        $this->assertEquals(Order::STATUS_DELIVERED, $order->fresh()->status, "Order must NOT become COMPLETED!");
    }

    public function test_fix_24_customer_manual_confirm_with_pending_authority_contract_fails_closed_409(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_DELIVERED);

        $mockDispute = Mockery::mock(DisputeAuthorityClient::class);
        $mockDispute->shouldReceive('verifyDisputeClearance')
            ->once()
            ->andReturn([
                'status' => 'PENDING_DISPUTE_AUTHORITY',
                'has_active_dispute' => false,
                'has_active_complaint' => false,
                'contract_available' => false,
                'message' => 'Kontrak Otoritas Sengketa belum tersedia.',
            ]);
        $this->app->instance(DisputeAuthorityClient::class, $mockDispute);

        $res = $this->postJson("/api/v1/order-barang/orders/{$order->id}/confirm-received", [], $this->customerHeaders($order->customer_id));

        $res->assertStatus(409);
        $this->assertStringContainsString('Otoritas sengketa eksternal belum siap', $res->json('error.message'));
        $this->assertEquals(Order::STATUS_DELIVERED, $order->fresh()->status);
    }

    public function test_fix_24_customer_manual_confirm_foreign_order_is_forbidden_403(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_DELIVERED, customerId: 'CUST_A');

        // Customer B attempts to confirm Customer A's order
        $res = $this->postJson("/api/v1/order-barang/orders/{$order->id}/confirm-received", [], $this->customerHeaders('CUST_B_ATTACKER'));

        $res->assertStatus(403);
        $this->assertEquals(Order::STATUS_DELIVERED, $order->fresh()->status);
    }

    public function test_fix_24_customer_manual_confirm_without_pod_is_rejected_422(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_DELIVERED);
        // POD unverified
        $delivery->update(['proof_verified' => false, 'proof_reference' => null]);

        $res = $this->postJson("/api/v1/order-barang/orders/{$order->id}/confirm-received", [], $this->customerHeaders($order->customer_id));

        $res->assertStatus(422);
        $this->assertEquals(Order::STATUS_DELIVERED, $order->fresh()->status);
    }

    // ========================================================
    // FIX 25: REMOVE RUNTIME STOCK RESERVATION MOCK BYPASS
    // ========================================================

    public function test_fix_25_real_product_client_reservation_fails_closed_without_mock(): void
    {
        // Unbind any mock to get real ProductClient instance
        $realClient = new ProductClient();

        $this->assertFalse($realClient->isStockReservationContractAvailable());

        $res = $realClient->reserveInventory('ORD_TEST', [
            ['variant_id' => 'VAR_01', 'quantity' => 2],
        ]);

        $this->assertFalse($res['success']);
        $this->assertEquals('PENDING_PRODUCT_CONTRACT', $res['status']);
    }

    public function test_fix_25_runtime_flag_cannot_bypass_stock_reservation(): void
    {
        // Even if someone injects a fake config in runtime, real ProductClient MUST NOT return RESERVED
        config(['order.features.mock_product_reservation_enabled' => true]);

        $realClient = new ProductClient();
        $this->assertFalse($realClient->isStockReservationContractAvailable(), "Bypass flag must have zero effect!");

        $res = $realClient->reserveInventory('ORD_TEST', [
            ['variant_id' => 'VAR_01', 'quantity' => 1],
        ]);

        $this->assertFalse($res['success']);
        $this->assertEquals('PENDING_PRODUCT_CONTRACT', $res['status']);
    }
}
