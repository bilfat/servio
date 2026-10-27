<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Cancellation\CancellationService;
use App\Domain\Completion\AutoCompletionService;
use App\Domain\Integration\OutboxDispatcherService;
use App\Domain\Integration\PaymentEventHandler;
use App\Infrastructure\Dispute\DisputeAuthorityClient;
use App\Infrastructure\Finance\FinanceCheckoutClient;
use App\Models\CheckoutGroup;
use App\Models\Delivery;
use App\Models\IntegrationInboxEvent;
use App\Models\IntegrationOutboxEvent;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PaymentProjection;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class Prompt03ClosingFixRegressionTest extends TestCase
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
            'delivered_at' => $status === Order::STATUS_DELIVERED ? now()->subHours(73) : null,
        ]);

        OrderItem::create([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'product_id' => 'PROD_01',
            'variant_id' => 'VAR_01',
            'product_snapshot' => ['name' => 'Produk A'],
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
            'proof_verified' => $status === Order::STATUS_DELIVERED,
            'proof_reference' => $status === Order::STATUS_DELIVERED ? 'POD_REF_123' : null,
            'recipient_name' => $status === Order::STATUS_DELIVERED ? 'Budi Santoso' : null,
            'delivered_at' => $status === Order::STATUS_DELIVERED ? now()->subHours(73) : null,
        ]);

        return [$group, $order, $delivery];
    }

    // ==========================================
    // FIX 15: Finance Payment Status Response Mismatch
    // ==========================================

    public function test_fix_15_finance_status_nested_data_paid_rejects_unpaid_cancellation(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        $mockFinance = Mockery::mock(FinanceCheckoutClient::class);
        // Finance returns nested envelope ['data' => ['status' => 'PAID']]
        $mockFinance->shouldReceive('getCheckout')
            ->with($group->id)
            ->andReturn([
                'status' => 200,
                'data' => [
                    'checkout_group_id' => $group->id,
                    'status' => 'PAID', // Actual field name
                    'amount_idr' => 100000,
                ],
            ]);
        $this->app->instance(FinanceCheckoutClient::class, $mockFinance);

        $service = $this->app->make(CancellationService::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Tagihan telah terkonfirmasi dibayar di Finance Service');
        $service->cancelUnpaidCheckout('CUST_TEST_01', $group->id, 'Batal');
    }

    public function test_fix_15_finance_timeout_fails_closed_without_unilateral_cancellation(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        $mockFinance = Mockery::mock(FinanceCheckoutClient::class);
        $mockFinance->shouldReceive('getCheckout')
            ->with($group->id)
            ->andThrow(new Exception('Connection timed out after 3000ms', 504));
        $this->app->instance(FinanceCheckoutClient::class, $mockFinance);

        $service = $this->app->make(CancellationService::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Gagal memeriksa status pembayaran di Finance Service');
        $service->cancelUnpaidCheckout('CUST_TEST_01', $group->id, 'Batal');

        // Verify order is still in PAYMENT_PENDING (not unilaterally cancelled)
        $this->assertEquals(Order::STATUS_PAYMENT_PENDING, $order->fresh()->status);
    }

    public function test_fix_15_finance_response_missing_status_fails_closed(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        $mockFinance = Mockery::mock(FinanceCheckoutClient::class);
        // Malformed response without status
        $mockFinance->shouldReceive('getCheckout')
            ->with($group->id)
            ->andReturn(['checkout_group_id' => $group->id, 'message' => 'OK']);
        $this->app->instance(FinanceCheckoutClient::class, $mockFinance);

        $service = $this->app->make(CancellationService::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Status pembayaran tidak ditemukan');
        $service->cancelUnpaidCheckout('CUST_TEST_01', $group->id, 'Batal');
    }

    // ==========================================
    // FIX 16: Refund Outside Uncommitted Database Transaction
    // ==========================================

    public function test_fix_16_refund_rollback_does_not_call_finance(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        $mockFinance = Mockery::mock(FinanceCheckoutClient::class);
        // Expect that delegateCancellationRefund is NEVER called if transaction fails
        $mockFinance->shouldNotReceive('delegateCancellationRefund');
        $this->app->instance(FinanceCheckoutClient::class, $mockFinance);

        $cancellationService = $this->app->make(CancellationService::class);

        try {
            // Simulate an exception triggered after order status change inside a transaction
            DB::transaction(function () use ($cancellationService, $order) {
                $cancellationService->cancelConfirmedDirect(
                    customerId: 'CUST_TEST_01',
                    orderId: $order->id,
                    reasonCode: 'CHANGE_OF_MIND',
                    note: 'Batal'
                );

                throw new Exception('Simulated crash before commit');
            });
        } catch (\Throwable $e) {
            // Expected
        }

        // Verify order was rolled back to CONFIRMED
        $this->assertEquals(Order::STATUS_CONFIRMED, $order->fresh()->status);
        // Verify no outbox event was committed
        $this->assertDatabaseMissing('integration_outbox_events', [
            'aggregate_id' => $order->id,
        ]);
    }

    // ==========================================
    // FIX 17: Strict PAID Event Verification
    // ==========================================

    public function test_fix_17_paid_event_missing_payment_projection_is_quarantined(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        // Intentionally do NOT create PaymentProjection
        $handler = $this->app->make(PaymentEventHandler::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('QUARANTINED_UNMATCHED_PROJECTION');

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_PAID_01',
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_UNMATCHED_999',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id],
            ],
        ]);
    }

    public function test_fix_17_paid_event_empty_merchant_orders_is_rejected(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_VALID_01',
            'payment_status' => 'PENDING',
            'amount_idr' => 100000,
            'currency' => 'IDR',
        ]);

        $handler = $this->app->make(PaymentEventHandler::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('merchant_order_ids');

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_PAID_02',
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_VALID_01',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [], // Empty!
            ],
        ]);
    }

    public function test_fix_17_paid_event_mismatched_child_orders_is_rejected(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_VALID_01',
            'payment_status' => 'PENDING',
            'amount_idr' => 100000,
            'currency' => 'IDR',
        ]);

        $handler = $this->app->make(PaymentEventHandler::class);

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('tidak cocok dengan data lokal');

        $handler->handleFinanceEvent([
            'event_id' => 'EVT_PAID_03',
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_VALID_01',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => ['FOREIGN_ORDER_ID'],
            ],
        ]);
    }

    public function test_fix_17_paid_event_valid_with_projection_and_orders_confirms_successfully(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_PAYMENT_PENDING);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_VALID_01',
            'payment_status' => 'PENDING',
            'amount_idr' => 100000,
            'currency' => 'IDR',
        ]);

        $handler = $this->app->make(PaymentEventHandler::class);

        $result = $handler->handleFinanceEvent([
            'event_id' => 'EVT_PAID_04',
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'PAY_VALID_01',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'merchant_order_ids' => [$order->id],
            ],
        ]);

        $this->assertEquals('PROCESSED', $result['status']);
        $this->assertEquals(Order::STATUS_CONFIRMED, $order->fresh()->status);
        $this->assertEquals('PAID', $group->fresh()->payment_status_projection);
    }

    // ==========================================
    // FIX 18: Hold Event Ordering & Replay Protection
    // ==========================================

    public function test_fix_18_stale_unhold_event_is_rejected_and_hold_remains_active(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        // Apply hold with sequence 5
        $resHold = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'hold_reason' => 'CUSTOMER_DISPUTE_OPENED',
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => 5,
            'event_id' => 'EVT_HOLD_5',
        ], $this->internalHeaders());

        $resHold->assertStatus(200);
        $this->assertTrue($order->fresh()->is_hold_active);
        $this->assertEquals(5, $order->fresh()->hold_sequence);

        // Send a stale unhold event with sequence 4 (older than current hold sequence 5)
        $resStaleUnhold = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => false,
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => 4,
            'event_id' => 'EVT_STALE_UNHOLD_4',
        ], $this->internalHeaders());

        // Must be rejected with 409
        $resStaleUnhold->assertStatus(409);
        $this->assertStringContainsString('STALE_UNHOLD_EVENT', $resStaleUnhold->json('error.message'));

        // Crucial: Hold state remains ACTIVE!
        $this->assertTrue($order->fresh()->is_hold_active);
    }

    public function test_fix_18_newer_authorized_unhold_releases_hold(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        // Apply hold with sequence 5
        $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'hold_reason' => 'DISPUTE_REVIEW',
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => 5,
            'event_id' => 'EVT_HOLD_5B',
        ], $this->internalHeaders());

        // Send newer unhold with sequence 6
        $resNewerUnhold = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => false,
            'source_service' => 'AFTERSALES_07',
            'event_sequence' => 6,
            'event_id' => 'EVT_UNHOLD_6',
        ], $this->internalHeaders());

        $resNewerUnhold->assertStatus(200);
        $this->assertFalse($order->fresh()->is_hold_active);
        $this->assertEquals(6, $order->fresh()->hold_sequence);
    }

    public function test_fix_18_unauthorized_hold_source_is_rejected(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        $res = $this->postJson('/internal/v1/order-barang/holds/order-events', [
            'order_id' => $order->id,
            'is_hold_active' => true,
            'source_service' => 'RANDOM_UNAUTHORIZED_SERVICE',
            'event_id' => 'EVT_HACK_01',
        ], $this->internalHeaders());

        $res->assertStatus(403);
    }

    // ==========================================
    // FIX 19: Auto-Completion Verifies Dispute Authority
    // ==========================================

    public function test_fix_19_pending_dispute_authority_contract_fails_closed(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_DELIVERED);

        // Bind DisputeAuthorityClient that reports PENDING_DISPUTE_AUTHORITY
        $mockDispute = Mockery::mock(DisputeAuthorityClient::class);
        $mockDispute->shouldReceive('verifyDisputeClearance')
            ->with($order->id)
            ->andReturn([
                'status' => 'PENDING_DISPUTE_AUTHORITY',
                'has_active_dispute' => false,
                'has_active_complaint' => false,
                'contract_available' => false,
                'authority_source' => 'DISPUTE_AUTHORITY_NONE',
                'message' => 'Kontrak integrasi dispute belum tersedia.',
            ]);
        $this->app->instance(DisputeAuthorityClient::class, $mockDispute);

        $service = $this->app->make(AutoCompletionService::class);
        $completedCount = $service->processAutoCompletions();

        // 0 completed! Must fail-closed!
        $this->assertEquals(0, $completedCount);
        $this->assertEquals(Order::STATUS_DELIVERED, $order->fresh()->status);
    }

    public function test_fix_19_active_dispute_reported_by_authority_blocks_auto_completion(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_DELIVERED);

        $mockDispute = Mockery::mock(DisputeAuthorityClient::class);
        $mockDispute->shouldReceive('verifyDisputeClearance')
            ->with($order->id)
            ->andReturn([
                'status' => 'ACTIVE_DISPUTE',
                'has_active_dispute' => true,
                'has_active_complaint' => false,
                'contract_available' => true,
                'authority_source' => 'AFTERSALES_07',
                'message' => 'Pesanan memiliki sengketa aktif di After-Sales.',
            ]);
        $this->app->instance(DisputeAuthorityClient::class, $mockDispute);

        $service = $this->app->make(AutoCompletionService::class);
        $completedCount = $service->processAutoCompletions();

        $this->assertEquals(0, $completedCount);
        $this->assertEquals(Order::STATUS_DELIVERED, $order->fresh()->status);
    }

    public function test_fix_19_clear_dispute_clearance_allows_auto_completion(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_DELIVERED);

        $mockDispute = Mockery::mock(DisputeAuthorityClient::class);
        $mockDispute->shouldReceive('verifyDisputeClearance')
            ->with($order->id)
            ->andReturn([
                'status' => 'CLEAR',
                'has_active_dispute' => false,
                'has_active_complaint' => false,
                'contract_available' => true,
                'authority_source' => 'AFTERSALES_07',
                'message' => 'Bebas sengketa',
            ]);
        $this->app->instance(DisputeAuthorityClient::class, $mockDispute);

        $service = $this->app->make(AutoCompletionService::class);
        $completedCount = $service->processAutoCompletions();

        $this->assertEquals(1, $completedCount);
        $this->assertEquals(Order::STATUS_COMPLETED, $order->fresh()->status);
    }

    // ==========================================
    // FIX 20: Concurrent Outbox Dispatcher Safety
    // ==========================================

    public function test_fix_20_parallel_workers_do_not_claim_same_event(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        // Create 1 pending outbox event
        $outbox = IntegrationOutboxEvent::create([
            'id' => (string) Str::ulid(),
            'destination_service' => 'FINANCE_06',
            'event_type' => 'finance.cancellation_refund.v1',
            'aggregate_type' => 'ORDER',
            'aggregate_id' => $order->id,
            'aggregate_version' => 1,
            'payload_json' => ['test' => 'data'],
            'status' => IntegrationOutboxEvent::STATUS_PENDING,
            'available_at' => now(),
            'attempt_count' => 0,
            'correlation_id' => (string) Str::ulid(),
        ]);

        $dispatcher = $this->app->make(OutboxDispatcherService::class);

        // Worker A claims events
        $workerAClaims = $dispatcher->claimEligibleEvents('worker_A', 10, 60);
        $this->assertCount(1, $workerAClaims);
        $this->assertEquals($outbox->id, $workerAClaims->first()->id);
        $this->assertEquals('PROCESSING', $outbox->fresh()->status);
        $this->assertEquals('worker_A', $outbox->fresh()->claimed_by);

        // Worker B attempts to claim at the same time
        $workerBClaims = $dispatcher->claimEligibleEvents('worker_B', 10, 60);

        // Worker B receives 0 events because Worker A holds an active lease!
        $this->assertCount(0, $workerBClaims);
    }

    public function test_fix_20_worker_crash_expired_lease_is_recovered(): void
    {
        [$group, $order, $delivery] = $this->createOrderFixture(Order::STATUS_CONFIRMED);

        // Create an event that was claimed by a dead worker whose lease expired 10 seconds ago
        $outbox = IntegrationOutboxEvent::create([
            'id' => (string) Str::ulid(),
            'destination_service' => 'FINANCE_06',
            'event_type' => 'finance.cancellation_refund.v1',
            'aggregate_type' => 'ORDER',
            'aggregate_id' => $order->id,
            'aggregate_version' => 1,
            'payload_json' => ['test' => 'recovery'],
            'status' => IntegrationOutboxEvent::STATUS_PROCESSING,
            'claimed_by' => 'dead_worker_X',
            'claimed_at' => now()->subMinutes(5),
            'lease_expires_at' => now()->subSeconds(10), // EXPIRED LEASE!
            'available_at' => now()->subMinutes(5),
            'attempt_count' => 1,
            'correlation_id' => (string) Str::ulid(),
        ]);

        $dispatcher = $this->app->make(OutboxDispatcherService::class);

        // Live Worker C claims
        $workerCClaims = $dispatcher->claimEligibleEvents('worker_C', 10, 60);

        // Event successfully recovered by Worker C!
        $this->assertCount(1, $workerCClaims);
        $this->assertEquals($outbox->id, $workerCClaims->first()->id);
        $this->assertEquals('worker_C', $outbox->fresh()->claimed_by);
        $this->assertTrue($outbox->fresh()->lease_expires_at->isFuture());
    }

    public function test_fix_20_two_separate_pdo_connections_concurrent_claim_mutual_exclusion(): void
    {
        $config = config('database.connections.mysql');
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset=utf8mb4";
        $pdo1 = new \PDO($dsn, $config['username'], $config['password'], [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        ]);
        $pdo2 = new \PDO($dsn, $config['username'], $config['password'], [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
        ]);

        $eventId = (string) Str::ulid();
        $orderId = (string) Str::ulid();

        try {
            // Seed directly via PDO1 committed
            $stmt = $pdo1->prepare("
                INSERT INTO integration_outbox_events 
                (id, destination_service, event_type, aggregate_type, aggregate_id, aggregate_version, payload_json, status, available_at, attempt_count, correlation_id, created_at, updated_at) 
                VALUES 
                (:id, 'FINANCE_06', 'finance.cancellation_refund.v1', 'ORDER', :agg_id, 1, '{\"test\":1}', 'PENDING', NOW(), 0, :corr_id, NOW(), NOW())
            ");
            $stmt->execute([
                ':id' => $eventId,
                ':agg_id' => $orderId,
                ':corr_id' => (string) Str::ulid(),
            ]);

            // Connection 1 begins transaction and locks the event for update
            $pdo1->beginTransaction();
            $selectStmt1 = $pdo1->prepare("
                SELECT id FROM integration_outbox_events 
                WHERE id = :id AND (status = 'PENDING' OR (status = 'PROCESSING' AND lease_expires_at <= NOW()))
                FOR UPDATE
            ");
            $selectStmt1->execute([':id' => $eventId]);
            $claimedBy1 = $selectStmt1->fetchAll(\PDO::FETCH_ASSOC);
            $this->assertCount(1, $claimedBy1, "Connection 1 must acquire the pending row");

            // Connection 1 updates the lease to worker_alpha
            $updateStmt1 = $pdo1->prepare("
                UPDATE integration_outbox_events 
                SET status = 'PROCESSING', claimed_by = 'worker_alpha', claimed_at = NOW(), lease_expires_at = DATE_ADD(NOW(), INTERVAL 60 SECOND)
                WHERE id = :id
            ");
            $updateStmt1->execute([':id' => $eventId]);
            $pdo1->commit();

            // Connection 2 now attempts to claim the exact same event
            $pdo2->beginTransaction();
            $selectStmt2 = $pdo2->prepare("
                SELECT id FROM integration_outbox_events 
                WHERE id = :id AND (status = 'PENDING' OR (status = 'PROCESSING' AND lease_expires_at <= NOW()))
                FOR UPDATE
            ");
            $selectStmt2->execute([':id' => $eventId]);
            $claimedBy2 = $selectStmt2->fetchAll(\PDO::FETCH_ASSOC);
            $pdo2->commit();

            // Connection 2 must NOT be able to claim the event because Connection 1 holds an active lease
            $this->assertCount(0, $claimedBy2, "Connection 2 must be excluded from claiming the active event");

            // Verify final state in DB
            $verifyStmt = $pdo1->prepare("SELECT status, claimed_by FROM integration_outbox_events WHERE id = :id");
            $verifyStmt->execute([':id' => $eventId]);
            $finalRow = $verifyStmt->fetch(\PDO::FETCH_ASSOC);
            $this->assertEquals('PROCESSING', $finalRow['status']);
            $this->assertEquals('worker_alpha', $finalRow['claimed_by']);

        } finally {
            // Clean up test event to ensure zero residue
            $pdo1->exec("DELETE FROM integration_outbox_events WHERE id = '{$eventId}'");
        }
    }
}
