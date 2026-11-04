<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Contracts\FinanceServiceClientInterface;
use App\Contracts\IdentityServiceClientInterface;
use App\Contracts\ServiceOfferingClientInterface;
use App\Infrastructure\Finance\FinanceServiceClient;
use App\Infrastructure\Identity\IdentityServiceClient;
use App\Infrastructure\ServiceCatalog\ServiceOfferingClient;
use App\Models\ServiceExecution;
use App\Models\ServiceOrder;
use App\Models\ServicePaymentAttempt;
use App\Models\ServicePaymentObligation;
use App\Models\ServiceVisit;
use App\Models\WorkerAssignmentAttempt;
use App\Services\OrderJasaOutboxDispatcherService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class RealMicroserviceE2EIntegrationTest extends TestCase
{
    protected function setUp(): void
    {
        putenv('FORCE_REAL_MICROSERVICES=true');
        $_ENV['FORCE_REAL_MICROSERVICES'] = 'true';
        $_SERVER['FORCE_REAL_MICROSERVICES'] = 'true';

        parent::setUp();

        // Configure actual service key for live microservices communication from environment
        $internalKey = env('LIVE_INTERNAL_SERVICE_KEY') ?: getenv('LIVE_INTERNAL_SERVICE_KEY');
        $gatewayKey = env('LIVE_GATEWAY_KEY') ?: getenv('LIVE_GATEWAY_KEY');
        if (empty($internalKey) || empty($gatewayKey)) {
            $this->markTestSkipped('LIVE_INTERNAL_SERVICE_KEY or LIVE_GATEWAY_KEY is not configured in process environment.');
        }

        config([
            'order_jasa.services.identity.internal_key' => $internalKey,
            'order_jasa.services.service_catalog.internal_key' => $internalKey,
            'order_jasa.services.finance.internal_key' => $internalKey,
        ]);

        $this->app->forgetInstance(\App\Contracts\FinanceServiceClientInterface::class);
        $this->app->forgetInstance(\App\Contracts\IdentityServiceClientInterface::class);
        $this->app->forgetInstance(\App\Contracts\ServiceOfferingClientInterface::class);
        $this->app->forgetInstance(\App\Services\BookingService::class);
        $this->app->forgetInstance(\App\Services\ExecutionBillingService::class);
        $this->app->forgetInstance(\App\Services\CancellationService::class);

        $this->app->singleton(IdentityServiceClientInterface::class, IdentityServiceClient::class);
        $this->app->singleton(ServiceOfferingClientInterface::class, ServiceOfferingClient::class);
        $this->app->singleton(FinanceServiceClientInterface::class, FinanceServiceClient::class);
    }

    /**
     * Query servio_finance_db directly via isolated PDO to bypass test transaction isolation.
     */
    protected function queryFinance(string $sql, array $params = []): ?object
    {
        static $financePdo = null;
        if ($financePdo === null) {
            $dbHost = env('DB_HOST', '127.0.0.1');
            $dbPort = env('DB_PORT', '3306');
            $dbUser = env('DB_USERNAME', 'root');
            $dbPass = env('DB_PASSWORD', '');
            $financePdo = new \PDO("mysql:host={$dbHost};port={$dbPort};dbname=servio_finance_db", $dbUser, $dbPass, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_OBJ,
            ]);
        }
        $stmt = $financePdo->prepare($sql);
        $stmt->execute($params);
        $res = $stmt->fetch();
        return $res ?: null;
    }

    /**
     * Priority 7: Real cross-microservice end-to-end integration:
     * 1. Booking with real Identity 01 & Catalog 04 & Finance 06 -> real records in servio_finance_db
     * 2. Real Finance 06 payment simulation -> Finance outbox dispatches to 05B -> order becomes PAID_WAITING_DISPATCH
     * 3. Worker lifecycle (Accept, OTW, Arrived, Diagnose) -> Consent approved -> Physical execution -> Worker finished
     * 4. Real Execution Billing in Finance 06 -> Real Finance payment simulation -> Webhook -> Order becomes EXECUTION_PAID
     * 5. Worker close visit -> Customer complete order
     * 6. Real Order Jasa Outbox dispatch -> sends ORDER_COMPLETED to Finance 06 -> real HeldOrderFund (120h) in servio_finance_db
     */
    public function test_full_cross_microservice_e2e_with_real_databases_and_http(): void
    {
        // 1. Real Identity 01 & Catalog 04 Fixtures
        $customerId = '692f03fd-2362-485a-9a23-a672bbb4533f';
        $addressId = '01a155aa-cdf3-71fe-b02c-ebdc787daf4a';
        $offeringId = '6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd';
        $providerOrgId = '0740d857-b665-4191-aaf5-d7dd3611dc1d';
        $providerUserId = '8ecc27f5-d30e-401e-89d5-aceec765a19a';
        $workerId = 'acfdfc27-9ba5-472f-bec1-3c372f47fff6';

        $customerHeaders = $this->customerHeaders($customerId);
        $customerHeaders['Idempotency-Key'] = 'idemp-real-e2e-book-' . Str::random(8);

        // --- STEP 1: Real Customer Booking ---
        $bookRes = $this->postJson('/api/v1/order-jasa/orders', [
            'service_offering_id' => $offeringId,
            'address_id' => $addressId,
            'scheduled_start_at' => now()->addDay()->format('Y-m-d 10:00:00'),
            'complaint_text' => 'AC ruang tamu bocor air deras dan tidak dingin',
            'symptoms_json' => ['bocor_air', 'kurang_dingin'],
        ], $customerHeaders);

        $bookRes->assertStatus(201);
        $orderData = $bookRes->json('data');
        $orderId = $orderData['id'];
        $this->assertEquals('PENDING_DIAGNOSIS_PAYMENT', $orderData['status']);
        $this->assertEquals(50000, $orderData['diagnosis_fee_idr']);

        // Verify Diagnosis Payment Intent created in real Finance DB
        $diagAttempt = ServicePaymentAttempt::whereHas('obligation', fn ($q) => $q->where('order_id', $orderId)->where('purpose', 'DIAGNOSIS'))->first();
        $this->assertNotNull($diagAttempt);
        $diagPaymentId = $diagAttempt->finance_payment_id;

        $financeCheckout = $this->queryFinance("SELECT * FROM finance_checkouts WHERE checkout_group_id = ?", ['CHK-JSA-' . $orderId . '-diagnosis']);
        $this->assertNotNull($financeCheckout, 'FinanceCheckout must exist in servio_finance_db');
        $this->assertEquals(50000, $financeCheckout->customer_payable_total_idr);

        $financePayment = $this->queryFinance("SELECT * FROM payment_intents WHERE id = ?", [$diagPaymentId]);
        $this->assertNotNull($financePayment, 'PaymentIntent must exist in servio_finance_db');
        $this->assertEquals('PENDING', $financePayment->status);

        // --- STEP 2: Real Payment Simulation in Finance 06 ---
        $financeSimRes = Http::withHeaders([
            'X-Gateway-Key' => (string) (env('LIVE_GATEWAY_KEY') ?: getenv('LIVE_GATEWAY_KEY')),
            'X-Actor-User-Id' => 'USR-FIN-OPS',
            'X-Actor-Role' => 'FINANCE_PAYMENT_OPS',
            'Content-Type' => 'application/json',
        ])->post("http://127.0.0.1:8006/api/v1/finance/demo/payments/{$diagPaymentId}/simulate", [
            'outcome' => 'PAID',
            'provider_event_id' => 'MOCK-EVT-' . Str::random(10),
            'reported_amount_idr' => 50000,
        ]);

        $this->assertTrue($financeSimRes->successful(), 'Finance payment simulation must succeed: ' . $financeSimRes->body());

        // Ingest the payment confirmation webhook into 05B
        $webhookRes = $this->postJson('/internal/v1/order-jasa/finance-events', [
            'event_id' => 'EVT-DIAG-PAID-' . Str::ulid(),
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'payment_id' => $diagPaymentId,
                'amount_idr' => 50000,
                'status' => 'PAID',
            ],
        ], $this->internalHeaders());

        $webhookRes->assertStatus(200);

        // Verify Order Jasa transitioned to PAID_WAITING_DISPATCH
        $order = ServiceOrder::findOrFail($orderId);
        $this->assertEquals('PAID_WAITING_DISPATCH', $order->status);
        $this->assertEquals('WORKER_ASSIGNMENT_PENDING', $order->phase);

        // --- STEP 3: Provider Dispatches Worker ---
        $providerHeaders = $this->providerHeaders($providerUserId, $providerOrgId);
        $providerHeaders['Idempotency-Key'] = 'idemp-dispatch-' . Str::random(8);

        $assignRes = $this->postJson("/api/v1/order-jasa/provider/orders/{$orderId}/assign", [
            'worker_id' => $workerId,
            'notes' => 'Tolong prioritaskan',
        ], $providerHeaders);

        $assignRes->assertStatus(200);
        $taskId = $assignRes->json('data.attempt_id');

        // --- STEP 4: Worker Lifecycle ---
        $workerHeaders = $this->workerHeaders($workerId);

        // Worker Accepts Task
        $workerHeaders['Idempotency-Key'] = 'idemp-wkr-accept-' . Str::random(8);
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/respond", [
            'decision' => 'ACCEPT',
        ], $workerHeaders)->assertStatus(200);

        // Worker Travel
        $workerHeaders['Idempotency-Key'] = 'idemp-wkr-otw-' . Str::random(8);
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", [
            'action' => 'OTW',
        ], $workerHeaders)->assertStatus(200);

        // Worker Arrived
        $workerHeaders['Idempotency-Key'] = 'idemp-wkr-arrived-' . Str::random(8);
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", [
            'action' => 'ARRIVED',
        ], $workerHeaders)->assertStatus(200);

        // Worker Starts Diagnosis
        $workerHeaders['Idempotency-Key'] = 'idemp-wkr-diag-start-' . Str::random(8);
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", [
            'action' => 'START_DIAGNOSIS',
        ], $workerHeaders)->assertStatus(200);

        // Worker Submits Diagnosis with Real Breakdown
        $workerHeaders['Idempotency-Key'] = 'idemp-wkr-diag-sub-' . Str::random(8);
        $diagSubRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/diagnosis", [
            'findings' => 'Kapasitor fan indoor mati dan evaporator berlendir kotor',
            'work_items' => [
                [
                    'item_name' => 'Ganti Kapasitor Fan',
                    'quantity' => 1,
                    'unit_price_idr' => 75000,
                    'total_price_idr' => 75000,
                ],
                [
                    'item_name' => 'Cuci Kimia Evaporator',
                    'quantity' => 1,
                    'unit_price_idr' => 50000,
                    'total_price_idr' => 50000,
                ],
            ],
            'part_items' => [
                [
                    'part_name' => 'Kapasitor 1.5uF 450V',
                    'part_source' => 'PROVIDER_SUPPLIED',
                    'quantity' => 1,
                    'unit_price_idr' => 35000,
                    'total_price_idr' => 35000,
                    'availability_status' => 'IN_STOCK',
                ],
            ],
        ], $workerHeaders);

        $diagSubRes->assertStatus(201);
        $order->refresh();
        $this->assertEquals('DIAGNOSIS_SUBMITTED', $order->status);

        // --- STEP 5: Customer Approves Remote Consent ---
        $customerHeaders['Idempotency-Key'] = 'idemp-cust-consent-' . Str::random(8);
        $consentRes = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/consent", [
            'method' => 'CUSTOMER_REMOTE',
            'decision' => 'APPROVED',
            'statement_acknowledged' => true,
        ], $customerHeaders);

        $consentRes->assertStatus(200);
        $order->refresh();
        $this->assertEquals('EXECUTION_IN_PROGRESS', $order->status);

        // --- STEP 6: Worker Finishes Execution (with Photos) -> Triggers Real Finance Execution Billing ---
        $workerHeaders['Idempotency-Key'] = 'idemp-wkr-finish-' . Str::random(8);
        $finishRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/execution/finish", [
            'summary' => 'Kapasitor diganti dan evaporator dibersihkan tuntas.',
            'test_result' => 'Suhu output AC 16 derajat Celcius, fungsi normal.',
            'evidence' => [
                [
                    'evidence_type' => 'BEFORE',
                    'media_reference' => 'https://img.servio.id/ev-before-01.jpg',
                    'sha256' => hash('sha256', 'before_photo'),
                ],
                [
                    'evidence_type' => 'AFTER',
                    'media_reference' => 'https://img.servio.id/ev-after-01.jpg',
                    'sha256' => hash('sha256', 'after_photo'),
                ],
            ],
        ], $workerHeaders);

        $finishRes->assertStatus(200);

        // Total execution amount: 75000 + 50000 (labor) + 35000 (parts) = 160,000 IDR
        $execObligation = ServicePaymentObligation::where('order_id', $orderId)->where('purpose', 'SERVICE_EXECUTION')->firstOrFail();
        $this->assertEquals(160000, $execObligation->principal_idr);
        $this->assertEquals('INVOICE_PENDING', $execObligation->state);

        $execPaymentAttempt = ServicePaymentAttempt::where('obligation_id', $execObligation->id)->firstOrFail();
        $execPaymentId = $execPaymentAttempt->finance_payment_id;

        // Verify Real Execution Quote & Payment Intent in Finance 06 DB
        $execFinanceCheckout = $this->queryFinance("SELECT * FROM finance_checkouts WHERE checkout_group_id = ?", ['CHK-JSA-' . $orderId . '-service_execution']);
        $this->assertNotNull($execFinanceCheckout, 'Execution FinanceCheckout must exist in servio_finance_db');

        // --- STEP 7: Real Payment Simulation for Execution in Finance 06 ---
        $execSimRes = Http::withHeaders([
            'X-Gateway-Key' => (string) (env('LIVE_GATEWAY_KEY') ?: getenv('LIVE_GATEWAY_KEY')),
            'X-Actor-User-Id' => 'USR-FIN-OPS',
            'X-Actor-Role' => 'FINANCE_PAYMENT_OPS',
            'Content-Type' => 'application/json',
        ])->post("http://127.0.0.1:8006/api/v1/finance/demo/payments/{$execPaymentId}/simulate", [
            'outcome' => 'PAID',
            'provider_event_id' => 'MOCK-EXEC-EVT-' . Str::random(10),
            'reported_amount_idr' => (int) $execFinanceCheckout->customer_payable_total_idr,
        ]);

        $this->assertTrue($execSimRes->successful(), 'Finance execution payment simulation must succeed: ' . $execSimRes->body());

        // Webhook ingested
        $this->postJson('/internal/v1/order-jasa/finance-events', [
            'event_id' => 'EVT-EXEC-PAID-' . Str::ulid(),
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'payment_id' => $execPaymentId,
                'amount_idr' => 160000,
                'status' => 'PAID',
            ],
        ], $this->internalHeaders())->assertStatus(200);

        $order->refresh();
        $this->assertEquals('EXECUTION_PAID', $order->status);

        // --- STEP 8: Worker Closes Visit ---
        $workerHeaders['Idempotency-Key'] = 'idemp-close-visit-' . Str::random(8);
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit/close", [
            'reason' => 'PEKERJAAN_SELESAI_NORMAL',
        ], $workerHeaders)->assertStatus(200);

        // --- STEP 9: Customer Completes Order ---
        $customerHeaders['Idempotency-Key'] = 'idemp-complete-' . Str::random(8);
        $completeRes = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/complete", [], $customerHeaders);
        $completeRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('COMPLETED', $order->status);
        $this->assertEquals('TERMINAL', $order->phase);
        $this->assertNotNull($order->completed_at);

        // --- STEP 10: Dispatch Outbox Event to Finance 06 ---
        $this->artisan('order-jasa:dispatch-outbox')
            ->assertSuccessful();

        // --- STEP 11: Assert Real 120-Hour Held Fund in servio_finance_db ---
        $heldFund = $this->queryFinance("
            SELECT hf.* FROM held_order_funds hf
            JOIN payment_allocations pa ON hf.payment_allocation_id = pa.id
            WHERE pa.merchant_order_id = ?
        ", [$orderId . '-service_execution']);

        $this->assertNotNull($heldFund, 'HeldOrderFund must exist in servio_finance_db after order completion!');
        $this->assertEquals('HELD', $heldFund->status);
        $this->assertNotNull($heldFund->eligible_release_at);
    }

    /**
     * Priority 7: Scenario 5 — Pre-OTW Cancellation & Real Refund in Finance 06
     */
    public function test_cancellation_before_otw_triggers_real_finance_refund_in_spay(): void
    {
        $customerId = '692f03fd-2362-485a-9a23-a672bbb4533f';
        $addressId = '01a155aa-cdf3-71fe-b02c-ebdc787daf4a';
        $offeringId = '6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd';

        $customerHeaders = $this->customerHeaders($customerId);
        $customerHeaders['Idempotency-Key'] = 'idemp-cancel-flow-' . Str::random(8);

        // 1. Create Booking with Diagnosis Fee
        $bookRes = $this->postJson('/api/v1/order-jasa/orders', [
            'service_offering_id' => $offeringId,
            'address_id' => $addressId,
            'scheduled_start_at' => now()->addDay()->format('Y-m-d 10:00:00'),
            'complaint_text' => 'AC tidak dingin, pembatalan uji refund',
        ], $customerHeaders);

        $bookRes->assertStatus(201);
        $orderId = $bookRes->json('data.id');

        $diagAttempt = ServicePaymentAttempt::whereHas('obligation', fn ($q) => $q->where('order_id', $orderId)->where('purpose', 'DIAGNOSIS'))->firstOrFail();
        $diagPaymentId = $diagAttempt->finance_payment_id;

        // 2. Simulate Payment in Finance 06
        Http::withHeaders([
            'X-Gateway-Key' => (string) (env('LIVE_GATEWAY_KEY') ?: getenv('LIVE_GATEWAY_KEY')),
            'X-Actor-User-Id' => 'USR-FIN-OPS',
            'X-Actor-Role' => 'FINANCE_PAYMENT_OPS',
            'Content-Type' => 'application/json',
        ])->post("http://127.0.0.1:8006/api/v1/finance/demo/payments/{$diagPaymentId}/simulate", [
            'outcome' => 'PAID',
            'provider_event_id' => 'MOCK-EVT-REFUND-' . Str::random(8),
            'reported_amount_idr' => 50000,
        ]);

        // Ingest Webhook
        $this->postJson('/internal/v1/order-jasa/finance-events', [
            'event_id' => 'EVT-REFUND-PRE-' . Str::ulid(),
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'payment_id' => $diagPaymentId,
                'amount_idr' => 50000,
                'status' => 'PAID',
            ],
        ], $this->internalHeaders())->assertStatus(200);

        // Order is now PAID_WAITING_DISPATCH (Pre-OTW)
        $order = ServiceOrder::findOrFail($orderId);
        $this->assertEquals('PAID_WAITING_DISPATCH', $order->status);

        // 3. Customer Cancels Order Before OTW
        $customerHeaders['Idempotency-Key'] = 'idemp-cancel-act-' . Str::random(8);
        $cancelRes = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/cancel", [
            'reason_code' => 'CUSTOMER_CHANGE_MIND',
            'reason_text' => 'Ingin menjadwalkan ulang di lain waktu',
        ], $customerHeaders);

        $cancelRes->assertStatus(200);
        $this->assertEquals('FULL_REFUND', $cancelRes->json('data.refund_eligibility_snapshot'));

        $order->refresh();
        $this->assertEquals('CANCELLED', $order->status);
        $this->assertEquals('TERMINAL', $order->phase);

        // 4. Verify Real Refund in servio_finance_db
        $refund = $this->queryFinance("
            SELECT rt.* FROM refund_transactions rt
            JOIN payment_allocations pa ON rt.payment_allocation_id = pa.id
            WHERE pa.merchant_order_id = ?
        ", [$orderId . '-diagnosis']);

        $this->assertNotNull($refund, 'RefundTransaction must exist in servio_finance_db');
        $this->assertEquals(50000, $refund->requested_amount_idr);
        $this->assertEquals('SUCCEEDED', $refund->status);
        $this->assertNotNull($refund->customer_spay_account_id);
    }

    /**
     * V4.1: Real Cross-Microservice Payment Retry & Void against live Finance 06 daemon
     */
    public function test_real_microservice_payment_retry_and_void_against_live_finance(): void
    {
        $customerId = '692f03fd-2362-485a-9a23-a672bbb4533f';
        $addressId = '01a155aa-cdf3-71fe-b02c-ebdc787daf4a';
        $offeringId = '6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd';
        $providerOrgId = '0740d857-b665-4191-aaf5-d7dd3611dc1d';
        $providerUserId = '8ecc27f5-d30e-401e-89d5-aceec765a19a';
        $workerId = 'acfdfc27-9ba5-472f-bec1-3c372f47fff6';

        $customerHeaders = $this->customerHeaders($customerId);
        $customerHeaders['Idempotency-Key'] = 'idemp-v41-book-' . Str::random(8);

        // --- STEP 1: Real Customer Booking ---
        $bookRes = $this->postJson('/api/v1/order-jasa/orders', [
            'service_offering_id' => $offeringId,
            'address_id' => $addressId,
            'scheduled_start_at' => now()->addDay()->format('Y-m-d 10:00:00'),
            'complaint_text' => 'AC bocor dan butuh perbaikan segera',
            'symptoms_json' => ['bocor_air'],
        ], $customerHeaders);

        $bookRes->assertStatus(201);
        $orderId = $bookRes->json('data.id');

        $diagAttempt = ServicePaymentAttempt::whereHas('obligation', fn ($q) => $q->where('order_id', $orderId)->where('purpose', 'DIAGNOSIS'))->first();
        $this->assertNotNull($diagAttempt);
        $diagPaymentId = $diagAttempt->finance_payment_id;

        // --- STEP 2: Pay Diagnosis Fee on Live Finance 06 ---
        $gatewayKey = (string) (env('LIVE_GATEWAY_KEY') ?: getenv('LIVE_GATEWAY_KEY'));
        $financeSimRes = Http::withHeaders([
            'X-Gateway-Key' => $gatewayKey,
            'X-Actor-User-Id' => 'USR-FIN-OPS',
            'X-Actor-Role' => 'FINANCE_PAYMENT_OPS',
            'Content-Type' => 'application/json',
        ])->post("http://127.0.0.1:8006/api/v1/finance/demo/payments/{$diagPaymentId}/simulate", [
            'outcome' => 'PAID',
            'provider_event_id' => 'MOCK-EVT-' . Str::random(10),
            'reported_amount_idr' => 50000,
        ]);
        $this->assertTrue($financeSimRes->successful());

        // Ingest diagnosis payment callback
        $this->postJson('/internal/v1/order-jasa/finance-events', [
            'event_id' => 'EVT-DIAG-PAID-' . Str::ulid(),
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'payment_id' => $diagPaymentId,
                'amount_idr' => 50000,
                'status' => 'PAID',
            ],
        ], $this->internalHeaders())->assertStatus(200);

        // --- STEP 3: Assign & Dispatch ---
        $providerHeaders = $this->providerHeaders($providerUserId, $providerOrgId);
        $providerHeaders['Idempotency-Key'] = 'idemp-v41-assign-' . Str::random(8);
        $assignRes = $this->postJson("/api/v1/order-jasa/provider/orders/{$orderId}/assign", [
            'worker_id' => $workerId,
            'notes' => 'Tolong prioritaskan',
        ], $providerHeaders);
        $assignRes->assertStatus(200);
        $taskId = $assignRes->json('data.attempt_id');

        // Worker lifecycle
        $workerHeaders = $this->workerHeaders($workerId, $providerOrgId);
        $workerHeaders['Idempotency-Key'] = 'idemp-v41-accept-' . Str::random(8);
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/respond", [
            'decision' => 'ACCEPT',
        ], $workerHeaders)->assertStatus(200);

        $workerHeaders['Idempotency-Key'] = 'idemp-v41-otw-' . Str::random(8);
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", [
            'action' => 'OTW',
        ], $workerHeaders)->assertStatus(200);

        $workerHeaders['Idempotency-Key'] = 'idemp-v41-arrived-' . Str::random(8);
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", [
            'action' => 'ARRIVED',
        ], $workerHeaders)->assertStatus(200);

        $workerHeaders['Idempotency-Key'] = 'idemp-v41-diag-start-' . Str::random(8);
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", [
            'action' => 'START_DIAGNOSIS',
        ], $workerHeaders)->assertStatus(200);

        // Submit Diagnosis
        $workerHeaders['Idempotency-Key'] = 'idemp-v41-diag-' . Str::random(8);
        $diagRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/diagnosis", [
            'findings' => 'Perlu pembersihan evaporator dan penggantian kapasitor',
            'work_items' => [
                [
                    'item_name' => 'Deep Cleaning Evaporator',
                    'quantity' => 1,
                    'unit_price_idr' => 100000,
                    'total_price_idr' => 100000,
                ],
            ],
            'part_items' => [
                [
                    'part_name' => 'Kapasitor 30uF',
                    'part_source' => 'PROVIDER_SUPPLIED',
                    'quantity' => 1,
                    'unit_price_idr' => 50000,
                    'total_price_idr' => 50000,
                    'availability_status' => 'IN_STOCK',
                ],
            ],
        ], $workerHeaders);
        $diagRes->assertStatus(201);

        // Customer Approves Consent
        $customerHeaders['Idempotency-Key'] = 'idemp-v41-consent-' . Str::random(8);
        $this->postJson("/api/v1/order-jasa/orders/{$orderId}/consent", [
            'method' => 'CUSTOMER_REMOTE',
            'decision' => 'APPROVED',
            'statement_acknowledged' => true,
        ], $customerHeaders)->assertStatus(200);

        // Worker Finishes Execution -> Triggers Execution Billing on Live Finance 06
        $workerHeaders['Idempotency-Key'] = 'idemp-v41-finish-' . Str::random(8);
        $finishRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/execution/finish", [
            'summary' => 'Evaporator dibersihkan dan kapasitor diganti.',
            'test_result' => 'Suhu normal 18C.',
            'evidence' => [
                [
                    'evidence_type' => 'BEFORE',
                    'media_reference' => 'https://img.servio.id/ev-before-v41.jpg',
                    'sha256' => hash('sha256', 'before_v41'),
                ],
                [
                    'evidence_type' => 'AFTER',
                    'media_reference' => 'https://img.servio.id/ev-after-v41.jpg',
                    'sha256' => hash('sha256', 'after_v41'),
                ],
            ],
        ], $workerHeaders);
        $finishRes->assertStatus(200);

        $obligation = ServicePaymentObligation::where('order_id', $orderId)
            ->where('purpose', 'SERVICE_EXECUTION')
            ->first();
        $this->assertNotNull($obligation);
        $this->assertEquals(150000, $obligation->principal_idr);
        $attempt1 = $obligation->attempts()->where('attempt_no', 1)->first();
        $this->assertNotNull($attempt1);
        $execPaymentId1 = $attempt1->finance_payment_id;

        // Check on live Finance 06 that Attempt #1 is PENDING
        $financePayment1 = $this->queryFinance("SELECT * FROM payment_intents WHERE id = ?", [$execPaymentId1]);
        $this->assertNotNull($financePayment1);
        $this->assertEquals('PENDING', $financePayment1->status);

        // Force local attempt #1 to be past expiry so retry triggers void on Finance
        $attempt1->forceFill(['expires_at' => now()->subMinutes(10)])->save();

        // --- STEP 4: Customer Calls Payment Retry ---
        $customerHeaders['Idempotency-Key'] = 'idemp-v41-retry-' . Str::random(8);
        $retryRes = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/payments/retry", [], $customerHeaders);
        $retryRes->assertStatus(201);
        $this->assertEquals(2, $retryRes->json('data.attempt_no'));

        $attempt2 = $obligation->attempts()->where('attempt_no', 2)->first();
        $this->assertNotNull($attempt2);
        $execPaymentId2 = $attempt2->finance_payment_id;

        // --- STEP 5: VERIFY VOID ON LIVE FINANCE 06 ---
        $financePayment1After = $this->queryFinance("SELECT * FROM payment_intents WHERE id = ?", [$execPaymentId1]);
        $this->assertEquals('CANCELLED', $financePayment1After->status, 'Attempt #1 must be CANCELLED on live Finance 06!');
        $this->assertEquals(0, $financePayment1After->is_active);

        // Verify Attempt #1 CANNOT be paid anymore on Finance 06!
        $payAttempt1Res = Http::withHeaders([
            'X-Gateway-Key' => $gatewayKey,
            'X-Actor-User-Id' => 'USR-FIN-OPS',
            'X-Actor-Role' => 'FINANCE_PAYMENT_OPS',
            'Content-Type' => 'application/json',
        ])->post("http://127.0.0.1:8006/api/v1/finance/demo/payments/{$execPaymentId1}/simulate", [
            'outcome' => 'PAID',
            'provider_event_id' => 'MOCK-EVT-' . Str::random(10),
            'reported_amount_idr' => 150000,
        ]);
        $this->assertEquals(409, $payAttempt1Res->status(), 'Voided payment intent must be REJECTED with 409 on live Finance 06!');

        // Check Attempt #2 on live Finance 06 is PENDING
        $financePayment2 = $this->queryFinance("SELECT * FROM payment_intents WHERE id = ?", [$execPaymentId2]);
        $this->assertNotNull($financePayment2);
        $this->assertEquals('PENDING', $financePayment2->status);

        // --- STEP 6: Pay Attempt #2 on Live Finance 06 ---
        $payAttempt2Res = Http::withHeaders([
            'X-Gateway-Key' => $gatewayKey,
            'X-Actor-User-Id' => 'USR-FIN-OPS',
            'X-Actor-Role' => 'FINANCE_PAYMENT_OPS',
            'Content-Type' => 'application/json',
        ])->post("http://127.0.0.1:8006/api/v1/finance/demo/payments/{$execPaymentId2}/simulate", [
            'outcome' => 'PAID',
            'provider_event_id' => 'MOCK-EVT-' . Str::random(10),
            'reported_amount_idr' => (int) $financePayment2->amount_idr,
        ]);
        $this->assertTrue($payAttempt2Res->successful(), 'Payment simulation for attempt 2 must succeed: ' . $payAttempt2Res->body());

        // Ingest payment callback
        $this->postJson('/internal/v1/order-jasa/finance-events', [
            'event_id' => 'EVT-EXEC-PAID-' . Str::ulid(),
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'payment_id' => $execPaymentId2,
                'merchant_order_id' => $orderId . '-service_execution-att2',
                'amount_idr' => 150000,
                'status' => 'PAID',
            ],
        ], $this->internalHeaders())->assertStatus(200);

        $obligation->refresh();
        $this->assertEquals('PAID', $obligation->state);
        $this->assertEquals($execPaymentId2, $obligation->active_finance_payment_id);
    }
}
