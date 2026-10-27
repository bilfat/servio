<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Integration\PaymentEventHandler;
use App\Models\CheckoutGroup;
use App\Models\Delivery;
use App\Models\IntegrationInboxEvent;
use App\Models\Order;
use App\Models\OrderAuditLog;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\PaymentProjection;
use Exception;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class Prompt05FinalSecurityFreezeRegressionTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * Helper to create a complete Order fixture matching database schema constraints.
     */
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
            'selected_items_hash' => 'hash_test_p05',
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
            'merchant_display_snapshot' => ['name' => 'Toko Resmi P05'],
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
            'product_id' => 'PROD_P05',
            'variant_id' => 'VAR_P05',
            'product_snapshot' => ['name' => 'Produk Tes P05'],
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

    // ========================================================
    // FIX 26: STRICT HOLD & UNHOLD EVENT SEQUENCING TESTS
    // ========================================================

    public function test_fix_26_hold_without_sequence_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'hold_reason' => 'CUSTOMER_DISPUTE_FILED',
            'source_service' => 'AFTERSALES_07',
            'event_id' => 'EVT_HOLD_NO_SEQ',
            // event_sequence intentionally missing!
        ], $this->internalHeaders());

        $res->assertStatus(422);
        $this->assertEquals('PENDING_HOLD_SEQUENCE_CONTRACT', $res->json('error.code'));
        $this->assertFalse($order->fresh()->is_hold_active);
    }

    public function test_fix_26_unhold_without_sequence_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);
        $order->update(['is_hold_active' => true, 'hold_sequence' => 5]);

        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => false,
            'source_service' => 'AFTERSALES_07',
            'event_id' => 'EVT_UNHOLD_NO_SEQ_05',
        ], $this->internalHeaders());

        $res->assertStatus(422);
        $this->assertEquals('PENDING_HOLD_SEQUENCE_CONTRACT', $res->json('error.code'));
        $this->assertTrue($order->fresh()->is_hold_active);
    }

    public function test_fix_26_hold_with_zero_sequence_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'source_service' => 'AFTERSALES_07',
            'event_id' => 'EVT_HOLD_SEQ_ZERO',
            'event_sequence' => 0,
        ], $this->internalHeaders());

        $res->assertStatus(422);
        $this->assertEquals('PENDING_HOLD_SEQUENCE_CONTRACT', $res->json('error.code'));
        $this->assertFalse($order->fresh()->is_hold_active);
    }

    public function test_fix_26_negative_sequence_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'source_service' => 'AFTERSALES_07',
            'event_id' => 'EVT_HOLD_SEQ_NEG',
            'event_sequence' => -5,
        ], $this->internalHeaders());

        $res->assertStatus(422);
        $this->assertEquals('PENDING_HOLD_SEQUENCE_CONTRACT', $res->json('error.code'));
        $this->assertFalse($order->fresh()->is_hold_active);
    }

    public function test_fix_26_invalid_string_sequence_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'source_service' => 'AFTERSALES_07',
            'event_id' => 'EVT_HOLD_SEQ_STR',
            'event_sequence' => 'abc_not_numeric',
        ], $this->internalHeaders());

        $res->assertStatus(422);
        $this->assertEquals('PENDING_HOLD_SEQUENCE_CONTRACT', $res->json('error.code'));
        $this->assertFalse($order->fresh()->is_hold_active);
    }

    public function test_fix_26_empty_event_id_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'source_service' => 'AFTERSALES_07',
            'event_id' => '',
            'event_sequence' => 1,
        ], $this->internalHeaders());

        $res->assertStatus(422);
        $this->assertEquals('MISSING_EVENT_ID', $res->json('error.code'));
        $this->assertFalse($order->fresh()->is_hold_active);
    }

    public function test_fix_26_empty_source_service_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'source_service' => '',
            'event_id' => 'EVT_NO_SRC',
            'event_sequence' => 1,
        ], $this->internalHeaders());

        $res->assertStatus(422);
        $this->assertEquals('MISSING_SOURCE_SERVICE', $res->json('error.code'));
        $this->assertFalse($order->fresh()->is_hold_active);
    }

    public function test_fix_26_source_service_mismatch_with_caller_header_is_rejected_403(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        $headers = array_merge($this->internalHeaders(), [
            'X-Source-Service' => 'AFTERSALES_07',
        ]);

        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'source_service' => 'OPERATIONS_ADMIN', // Mismatched!
            'event_id' => 'EVT_MISMATCH_SRC',
            'event_sequence' => 1,
        ], $headers);

        $res->assertStatus(403);
        $this->assertEquals('SOURCE_IDENTITY_MISMATCH', $res->json('error.code'));
        $this->assertFalse($order->fresh()->is_hold_active);
    }

    public function test_fix_26_hold_seq_10_then_stale_hold_seq_9_does_not_mutate_state(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);
        $order->update([
            'is_hold_active' => true,
            'hold_sequence' => 10,
            'hold_event_id' => 'EVT_HOLD_10_ORIG',
            'hold_reason' => 'DISPUTE_INITIAL',
        ]);

        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'source_service' => 'AFTERSALES_07',
            'event_id' => 'EVT_STALE_HOLD_9',
            'event_sequence' => 9,
            'hold_reason' => 'DISPUTE_STALE_OVERWRITE',
        ], $this->internalHeaders());

        $res->assertStatus(409);
        $this->assertStringContainsString('STALE_HOLD_EVENT', $res->json('error.message'));
        $this->assertTrue($order->fresh()->is_hold_active);
        $this->assertEquals(10, $order->fresh()->hold_sequence);
        $this->assertEquals('DISPUTE_INITIAL', $order->fresh()->hold_reason);
    }

    public function test_fix_26_hold_seq_10_then_authorized_unhold_seq_11_succeeds(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);
        $order->update([
            'is_hold_active' => true,
            'hold_sequence' => 10,
            'hold_event_id' => 'EVT_HOLD_10_ACTIVE',
            'hold_source_service' => 'AFTERSALES_07',
        ]);

        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => false,
            'source_service' => 'AFTERSALES_07',
            'event_id' => 'EVT_UNHOLD_11_VALID',
            'event_sequence' => 11,
        ], $this->internalHeaders());

        $res->assertStatus(200);
        $this->assertFalse($order->fresh()->is_hold_active);
        $this->assertEquals(11, $order->fresh()->hold_sequence);
    }

    public function test_fix_26_duplicate_identical_hold_event_is_idempotent(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        $payload = [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'hold_reason' => 'DEFECTIVE_ITEM_DISPUTE',
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => 1,
            'event_id' => 'EVT_IDEMP_TEST_01',
        ];

        // First delivery
        $res1 = $this->postJson('/internal/v1/order-barang/holds/order-events', $payload, $this->internalHeaders());
        $res1->assertStatus(200);
        $this->assertEquals('PERSISTED', $res1->json('data.status'));

        // Second delivery (identical retry)
        $res2 = $this->postJson('/internal/v1/order-barang/holds/order-events', $payload, $this->internalHeaders());
        $res2->assertStatus(200);
        $this->assertEquals('ALREADY_PROCESSED', $res2->json('data.status'));
        $this->assertTrue($order->fresh()->is_hold_active);
    }

    public function test_fix_26_duplicate_event_id_with_different_payload_is_rejected_409(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        $res1 = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'hold_reason' => 'REASON_GENUINE',
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => 1,
            'event_id' => 'EVT_CONFLICT_TEST_01',
        ], $this->internalHeaders());
        $res1->assertStatus(200);

        // Tampered replay with different hold_reason
        $res2 = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'hold_reason' => 'REASON_TAMPERED_FRAUD',
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => 1,
            'event_id' => 'EVT_CONFLICT_TEST_01',
        ], $this->internalHeaders());

        $res2->assertStatus(409);
        $this->assertEquals('IDEMPOTENCY_CONFLICT', $res2->json('error.code'));
    }

    public function test_fix_26_hold_event_records_audit_log_and_status_history(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'hold_reason' => 'LEGAL_DISPUTE_ESCALATION',
            'source_service' => 'DISPUTE_GOVERNANCE_09',
            'event_sequence' => 1,
            'event_id' => 'EVT_AUDIT_VERIFY_01',
        ], $this->internalHeaders());

        $res->assertStatus(200);

        // Verify OrderAuditLog entry
        $audit = OrderAuditLog::where('order_id', $order->id)->where('action', 'HOLD_APPLIED')->first();
        $this->assertNotNull($audit);
        $this->assertEquals('DISPUTE_GOVERNANCE_09', $audit->actor_id);
        $this->assertEquals('EVT_AUDIT_VERIFY_01', $audit->correlation_id);
        $this->assertTrue($audit->after_state['is_hold_active']);

        // Verify OrderStatusHistory entry
        $history = OrderStatusHistory::where('order_id', $order->id)->where('action', 'ORDER_HOLD_APPLIED')->first();
        $this->assertNotNull($history);
        $this->assertEquals('DISPUTE_GOVERNANCE_09', $history->source_service);
    }

    // ========================================================
    // FIX 27: PAYMENT EVENT ID & REPLAY INTEGRITY TESTS
    // ========================================================

    public function test_fix_27_paid_event_without_event_id_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        $handler = app(PaymentEventHandler::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('MISSING_EVENT_ID');

        $handler->handleFinanceEvent([
            // event_id intentionally omitted!
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_001',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id],
            ],
        ]);
    }

    public function test_fix_27_failed_event_without_event_id_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        $handler = app(PaymentEventHandler::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('MISSING_EVENT_ID');

        $handler->handleFinanceEvent([
            'event_type' => 'finance.payment.failed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_001',
            ],
        ]);
    }

    public function test_fix_27_expired_event_without_event_id_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        $handler = app(PaymentEventHandler::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('MISSING_EVENT_ID');

        $handler->handleFinanceEvent([
            'event_type' => 'finance.payment.expired.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_001',
            ],
        ]);
    }

    public function test_fix_27_event_id_empty_string_is_rejected_422(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        $handler = app(PaymentEventHandler::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('MISSING_EVENT_ID');

        $handler->handleFinanceEvent([
            'event_id' => '   ',
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_001',
            ],
        ]);
    }

    public function test_fix_27_first_valid_event_is_processed_successfully(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_REAL_SUCCESS_01',
            'payment_status' => 'PENDING',
            'amount_idr' => 100000,
            'currency' => 'IDR',
            'expires_at' => now()->addHours(6),
        ]);

        $handler = app(PaymentEventHandler::class);
        $res = $handler->handleFinanceEvent([
            'event_id' => 'EVT_FIN_VALID_01',
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_REAL_SUCCESS_01',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id],
            ],
        ]);

        $this->assertEquals('PROCESSED', $res['status']);
        $this->assertEquals(Order::STATUS_CONFIRMED, $order->fresh()->status);
        $this->assertEquals('PAID', $group->fresh()->payment_status_projection);
    }

    public function test_fix_27_identical_event_sent_twice_is_strictly_idempotent_without_duplicate_mutations(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_REAL_IDEMP_01',
            'payment_status' => 'PENDING',
            'amount_idr' => 100000,
            'currency' => 'IDR',
            'expires_at' => now()->addHours(6),
        ]);

        $payload = [
            'event_id' => 'EVT_FIN_IDEMP_01',
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_REAL_IDEMP_01',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id],
            ],
        ];

        $handler = app(PaymentEventHandler::class);

        // First delivery
        $res1 = $handler->handleFinanceEvent($payload);
        $this->assertEquals('PROCESSED', $res1['status']);

        $historyCountBefore = OrderStatusHistory::where('order_id', $order->id)->count();

        // Second delivery (identical replay)
        $res2 = $handler->handleFinanceEvent($payload);
        $this->assertEquals('ALREADY_PROCESSED', $res2['status']);

        // Assert NO duplicate mutations occurred
        $historyCountAfter = OrderStatusHistory::where('order_id', $order->id)->count();
        $this->assertEquals($historyCountBefore, $historyCountAfter, "No new status history should be written on replay");
    }

    public function test_fix_27_same_event_id_with_different_amount_is_rejected_409(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_DIFF_AMT_01',
            'payment_status' => 'PENDING',
            'amount_idr' => 100000,
            'currency' => 'IDR',
            'expires_at' => now()->addHours(6),
        ]);

        $handler = app(PaymentEventHandler::class);

        // First delivery with 100,000
        $handler->handleFinanceEvent([
            'event_id' => 'EVT_REPLAY_DIFF_AMT',
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_DIFF_AMT_01',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id],
            ],
        ]);

        // Replay with DIFFERENT amount 250,000
        $this->expectException(Exception::class);
        $this->expectExceptionMessage('IDEMPOTENCY_CONFLICT');

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_REPLAY_DIFF_AMT',
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_DIFF_AMT_01',
                'amount_idr' => 250000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id],
            ],
        ]);
    }

    public function test_fix_27_same_event_id_with_different_payment_id_is_rejected_409(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_DIFF_ID_01',
            'payment_status' => 'PENDING',
            'amount_idr' => 100000,
            'currency' => 'IDR',
            'expires_at' => now()->addHours(6),
        ]);

        $handler = app(PaymentEventHandler::class);

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_REPLAY_DIFF_PAYID',
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_DIFF_ID_01',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id],
            ],
        ]);

        // Replay with DIFFERENT payment_id
        $this->expectException(Exception::class);
        $this->expectExceptionMessage('IDEMPOTENCY_CONFLICT');

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_REPLAY_DIFF_PAYID',
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_ALTERED_ID_99',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id],
            ],
        ]);
    }

    public function test_fix_27_same_event_id_with_different_event_type_is_rejected_409(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_DIFF_TYPE_01',
            'payment_status' => 'PENDING',
            'amount_idr' => 100000,
            'currency' => 'IDR',
            'expires_at' => now()->addHours(6),
        ]);

        $handler = app(PaymentEventHandler::class);

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_REPLAY_DIFF_TYPE',
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_DIFF_TYPE_01',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id],
            ],
        ]);

        // Replay with SAME event_id but DIFFERENT event_type
        $this->expectException(Exception::class);
        $this->expectExceptionMessage('IDEMPOTENCY_CONFLICT');

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_REPLAY_DIFF_TYPE',
            'event_type' => 'finance.payment.failed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_DIFF_TYPE_01',
                'amount_idr' => 100000,
                'currency' => 'IDR',
            ],
        ]);
    }

    public function test_fix_27_same_event_id_with_different_merchant_orders_is_rejected_409(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_DIFF_CHILD_01',
            'payment_status' => 'PENDING',
            'amount_idr' => 100000,
            'currency' => 'IDR',
            'expires_at' => now()->addHours(6),
        ]);

        $handler = app(PaymentEventHandler::class);

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_REPLAY_DIFF_CHILDREN',
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_DIFF_CHILD_01',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id],
            ],
        ]);

        // Replay with DIFFERENT merchant_order_ids
        $this->expectException(Exception::class);
        $this->expectExceptionMessage('IDEMPOTENCY_CONFLICT');

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_REPLAY_DIFF_CHILDREN',
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_DIFF_CHILD_01',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id, 'ANOTHER_FOREIGN_ORDER'],
            ],
        ]);
    }

    public function test_fix_27_unauthorized_source_service_is_rejected_403(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        $handler = app(PaymentEventHandler::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('UNAUTHORIZED_PAYMENT_SOURCE');

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_ROGUE_SRC',
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'ROGUE_ACTOR_99',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_ROGUE_01',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id],
            ],
        ]);
    }

    public function test_fix_27_conflicting_replay_does_not_cancel_orders_or_downgrade_paid(): void
    {
        [$group, $order] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_NO_DOWNGRADE_01',
            'payment_status' => 'PENDING',
            'amount_idr' => 100000,
            'currency' => 'IDR',
            'expires_at' => now()->addHours(6),
        ]);

        $handler = app(PaymentEventHandler::class);

        // First successfully confirm
        $handler->handleFinanceEvent([
            'event_id' => 'EVT_DOWNGRADE_GUARD_01',
            'event_type' => 'finance.payment.confirmed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_NO_DOWNGRADE_01',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id],
            ],
        ]);

        $this->assertEquals('PAID', $group->fresh()->payment_status_projection);
        $this->assertEquals(Order::STATUS_CONFIRMED, $order->fresh()->status);

        // Attempt replay with expired event type
        try {
            $handler->handleFinanceEvent([
                'event_id' => 'EVT_DOWNGRADE_GUARD_01',
                'event_type' => 'finance.payment.expired.v1',
                'source_service' => 'FINANCE_06',
                'payload' => [
                    'checkout_group_id' => $group->id,
                    'payment_id' => 'PAY_NO_DOWNGRADE_01',
                    'amount_idr' => 100000,
                    'currency' => 'IDR',
                ],
            ]);
        } catch (\Throwable $e) {
            // Expected conflict exception
            $this->assertStringContainsString('IDEMPOTENCY_CONFLICT', $e->getMessage());
        }

        // Crucial assertions: Status remains PAID and CONFIRMED
        $this->assertEquals('PAID', $group->fresh()->payment_status_projection);
        $this->assertEquals(Order::STATUS_CONFIRMED, $order->fresh()->status);
    }
}
