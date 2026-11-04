<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Contracts\FinanceServiceClientInterface;
use App\Contracts\IdentityServiceClientInterface;
use App\Contracts\ServiceOfferingClientInterface;
use App\Infrastructure\Finance\FakeFinanceServiceClient;
use App\Infrastructure\Finance\FinanceServiceClient;
use App\Infrastructure\Identity\FakeIdentityServiceClient;
use App\Infrastructure\ServiceCatalog\FakeServiceOfferingClient;
use App\Models\CustomerConsent;
use App\Models\DiagnosisVersion;
use App\Models\ServiceOrder;
use App\Models\ServicePartItem;
use App\Models\ServicePaymentAttempt;
use App\Models\ServicePaymentObligation;
use App\Models\ServiceVisit;
use App\Models\ServiceWorkItem;
use App\Services\ExecutionBillingService;
use App\Support\AuthenticatedActor;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class Prompt04FinalLockV4Test extends TestCase
{
    private string $customerId = 'CUST-V4-01';
    private string $providerOrgId = 'ORG-V4-01';

    protected function setUp(): void
    {
        parent::setUp();

        $this->app->singleton(IdentityServiceClientInterface::class, FakeIdentityServiceClient::class);
        $this->app->singleton(ServiceOfferingClientInterface::class, FakeServiceOfferingClient::class);
        $this->app->singleton(FinanceServiceClientInterface::class, FakeFinanceServiceClient::class);
    }

    private function createOrderWithExecutionObligation(int $amountIdr = 250000, bool $isExpired = false): array
    {
        $now = now();
        $order = ServiceOrder::forceCreate([
            'id' => (string) Str::ulid(),
            'order_no' => 'SO-V4-' . strtoupper(Str::random(8)),
            'customer_id' => $this->customerId,
            'provider_org_id' => $this->providerOrgId,
            'service_offering_id' => 'OFFERING-01',
            'service_snapshot' => ['title' => 'Service AC Split Inverter'],
            'recipient_snapshot' => ['name' => 'Customer Test', 'phone' => '08123456789'],
            'address_snapshot' => ['city' => 'Jakarta Selatan', 'address_line' => 'Jl. Sudirman No. 1'],
            'status' => 'EXECUTION_IN_PROGRESS',
            'phase' => 'EXECUTION_IN_PROGRESS',
            'complaint_text' => 'AC tidak dingin sama sekali',
            'diagnosis_fee_idr' => 50000,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $dueAt = $isExpired ? $now->copy()->subHours(2) : $now->copy()->addHours(4);

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => $amountIdr,
            'currency' => 'IDR',
            'state' => 'INVOICE_PENDING',
            'finance_obligation_ref' => 'INV-TEST-01',
            'active_finance_payment_id' => 'PAY-TEST-01',
            'payment_due_at' => $dueAt,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $attempt = ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => 'PAY-TEST-01',
            'finance_invoice_ref' => 'INV-TEST-01',
            'method' => 'MOCK',
            'reported_status' => 'PENDING',
            'amount_due_idr' => $amountIdr,
            'issued_at' => $now->copy()->subHours($isExpired ? 8 : 2),
            'expires_at' => $dueAt,
            'is_current' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return [$order, $obligation, $attempt];
    }

    /**
     * FIX 01: If active attempt is still valid, payment retry must return existing invoice idempotently.
     */
    public function test_fix01_active_valid_attempt_returns_existing_without_creating_new(): void
    {
        [$order, $obligation, $attempt] = $this->createOrderWithExecutionObligation(amountIdr: 200000, isExpired: false);

        $customerActor = new AuthenticatedActor(
            id: $this->customerId,
            role: 'CUSTOMER'
        );

        $billingService = app(ExecutionBillingService::class);
        $result = $billingService->retryExecutionPayment($customerActor, $order->id);

        $this->assertEquals(1, $result['attempt_no']);
        $this->assertEquals($attempt->id, $result['payment_attempt_id']);
        $this->assertEquals('Tagihan pembayaran masih aktif dan valid.', $result['message']);

        // Check DB: No new attempts created
        $this->assertEquals(1, ServicePaymentAttempt::where('obligation_id', $obligation->id)->count());
        $this->assertTrue($attempt->refresh()->is_current);
    }

    /**
     * FIX 01: Expired attempt with successful void produces new attempt with incremented attempt_no.
     */
    public function test_fix01_expired_attempt_with_successful_void_creates_replacement_attempt(): void
    {
        [$order, $obligation, $attempt] = $this->createOrderWithExecutionObligation(amountIdr: 200000, isExpired: true);

        // Mock Finance client where void returns true
        $financeMock = $this->createMock(FinanceServiceClientInterface::class);
        $financeMock->expects($this->once())
            ->method('getPaymentIntent')
            ->with('PAY-TEST-01')
            ->willReturn(['status' => 'PENDING']);
        $financeMock->expects($this->once())
            ->method('voidPaymentIntent')
            ->with('PAY-TEST-01')
            ->willReturn(true);
        $financeMock->expects($this->once())
            ->method('createPaymentIntent')
            ->willReturn([
                'payment_intent_id' => 'PAY-TEST-02',
                'invoice_no' => 'INV-TEST-02',
                'checkout_url' => 'https://pay.servio.id/checkouts/test-2',
            ]);

        $this->app->instance(FinanceServiceClientInterface::class, $financeMock);

        $customerActor = new AuthenticatedActor(
            id: $this->customerId,
            role: 'CUSTOMER'
        );

        $billingService = app(ExecutionBillingService::class);
        $result = $billingService->retryExecutionPayment($customerActor, $order->id);

        $this->assertEquals(2, $result['attempt_no']);
        $this->assertEquals('INV-TEST-02', $result['invoice_no']);

        // Check DB: Previous attempt deactivated and marked EXPIRED
        $this->assertFalse($attempt->refresh()->is_current);
        $this->assertEquals('EXPIRED', $attempt->refresh()->reported_status);

        // New attempt exists and is current
        $this->assertEquals(2, ServicePaymentAttempt::where('obligation_id', $obligation->id)->count());
        $newAttempt = ServicePaymentAttempt::where('obligation_id', $obligation->id)->where('is_current', true)->first();
        $this->assertNotNull($newAttempt);
        $this->assertEquals(2, $newAttempt->attempt_no);
        $this->assertEquals('PAY-TEST-02', $newAttempt->finance_payment_id);
    }

    /**
     * FIX 01: If void fails or times out, fail closed: throw 503, do NOT create new attempt!
     */
    public function test_fix01_expired_attempt_with_failed_void_fails_closed(): void
    {
        [$order, $obligation, $attempt] = $this->createOrderWithExecutionObligation(amountIdr: 200000, isExpired: true);

        // Mock Finance client where void returns false
        $financeMock = $this->createMock(FinanceServiceClientInterface::class);
        $financeMock->expects($this->once())
            ->method('getPaymentIntent')
            ->with('PAY-TEST-01')
            ->willReturn(['status' => 'PENDING']);
        $financeMock->expects($this->once())
            ->method('voidPaymentIntent')
            ->with('PAY-TEST-01')
            ->willReturn(false); // Void failed!
        $financeMock->expects($this->never())
            ->method('createPaymentIntent'); // Must NEVER be called!

        $this->app->instance(FinanceServiceClientInterface::class, $financeMock);

        $customerActor = new AuthenticatedActor(
            id: $this->customerId,
            role: 'CUSTOMER'
        );

        $billingService = app(ExecutionBillingService::class);

        try {
            $billingService->retryExecutionPayment($customerActor, $order->id);
            $this->fail('Expected HttpException 503 was not thrown.');
        } catch (HttpException $e) {
            $this->assertEquals(503, $e->getStatusCode());
            $this->assertStringContainsString('Gagal membatalkan tagihan sebelumnya', $e->getMessage());
        }

        // Check DB: NO new attempt created, old attempt still current
        $this->assertEquals(1, ServicePaymentAttempt::where('obligation_id', $obligation->id)->count());
        $this->assertTrue($attempt->refresh()->is_current);
    }

    /**
     * FIX 02: Finance unavailable (null response) must fail closed even if locally expired.
     */
    public function test_fix02_finance_unavailable_fails_closed_without_assuming_expired(): void
    {
        [$order, $obligation, $attempt] = $this->createOrderWithExecutionObligation(amountIdr: 200000, isExpired: true);

        // Mock Finance client returning null (outage/timeout)
        $financeMock = $this->createMock(FinanceServiceClientInterface::class);
        $financeMock->expects($this->once())
            ->method('getPaymentIntent')
            ->with('PAY-TEST-01')
            ->willReturn(null); // Finance is down!
        $financeMock->expects($this->never())->method('voidPaymentIntent');
        $financeMock->expects($this->never())->method('createPaymentIntent');

        $this->app->instance(FinanceServiceClientInterface::class, $financeMock);

        $customerActor = new AuthenticatedActor(
            id: $this->customerId,
            role: 'CUSTOMER'
        );

        $billingService = app(ExecutionBillingService::class);

        try {
            $billingService->retryExecutionPayment($customerActor, $order->id);
            $this->fail('Expected HttpException 503 was not thrown.');
        } catch (HttpException $e) {
            $this->assertEquals(503, $e->getStatusCode());
            $this->assertStringContainsString('Sistem keuangan (Finance 06) sedang tidak dapat dihubungi', $e->getMessage());
        }

        // DB check: state unchanged, no replacement attempt
        $this->assertEquals(1, ServicePaymentAttempt::where('obligation_id', $obligation->id)->count());
        $this->assertTrue($attempt->refresh()->is_current);
    }

    /**
     * FIX 03: When release per order returns 404, FinanceServiceClient must NOT fallback to global release.
     */
    public function test_fix03_release_held_fund_by_order_does_not_fallback_to_global_release(): void
    {
        Http::fake([
            'http://127.0.0.1:8006/internal/v1/finance/held-funds/by-order/*/release' => Http::response([
                'status' => 'error',
                'message' => 'Held fund not found for order',
            ], 404),
            'http://127.0.0.1:8006/internal/v1/finance/held-funds/release-matured' => Http::response([
                'status' => 'success',
                'data' => ['released_count' => 10],
            ], 200),
        ]);

        $client = new FinanceServiceClient();
        $result = $client->releaseHeldFundByOrder('SO-ORDER-404-TEST');

        // Must return false
        $this->assertFalse($result);

        // Global release endpoint must NEVER have been called!
        Http::assertNotSent(function ($request) {
            return str_contains($request->url(), 'release-matured');
        });
    }

    /**
     * FIX 05: Billing must strictly sum items ONLY from the approved diagnosis version, ignoring older versions.
     */
    public function test_fix05_multiple_diagnosis_versions_only_sums_approved_version_items(): void
    {
        $now = now();
        $order = ServiceOrder::forceCreate([
            'id' => (string) Str::ulid(),
            'order_no' => 'SO-V4-MULTI-' . strtoupper(Str::random(6)),
            'customer_id' => $this->customerId,
            'provider_org_id' => $this->providerOrgId,
            'service_offering_id' => 'OFFERING-01',
            'service_snapshot' => ['title' => 'Service AC Split Inverter'],
            'recipient_snapshot' => ['name' => 'Customer Test', 'phone' => '08123456789'],
            'address_snapshot' => ['city' => 'Jakarta Selatan', 'address_line' => 'Jl. Sudirman No. 1'],
            'status' => 'EXECUTION_IN_PROGRESS',
            'phase' => 'EXECUTION_IN_PROGRESS',
            'complaint_text' => 'AC tidak dingin sama sekali',
            'diagnosis_fee_idr' => 50000,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $visit = ServiceVisit::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'status' => 'VISIT_CLOSED',
            'visit_closed_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Version 1 (REJECTED by customer / revised)
        $diagV1 = DiagnosisVersion::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'visit_id' => $visit->id,
            'worker_id' => 'WORKER-01',
            'version_no' => 1,
            'status' => 'REVISED',
            'findings' => 'Diagnosis awal kerusakan pipa',
            'work_subtotal_idr' => 100000,
            'provider_part_subtotal_idr' => 50000,
            'created_at' => $now->copy()->subHours(3),
            'updated_at' => $now->copy()->subHours(3),
        ]);

        ServiceWorkItem::forceCreate([
            'id' => (string) Str::ulid(),
            'diagnosis_version_id' => $diagV1->id,
            'line_no' => 1,
            'name' => 'Jasa Cuci AC Versi 1 (Ditolak)',
            'quantity' => 1,
            'unit_price_idr' => 100000,
            'subtotal_idr' => 100000,
            'created_at' => $now->copy()->subHours(3),
            'updated_at' => $now->copy()->subHours(3),
        ]);

        ServicePartItem::forceCreate([
            'id' => (string) Str::ulid(),
            'diagnosis_version_id' => $diagV1->id,
            'line_no' => 1,
            'part_name' => 'Pipa Tembaga Versi 1 (Ditolak)',
            'source' => 'PROVIDER_SUPPLIED',
            'quantity' => 1,
            'unit_price_idr' => 50000,
            'subtotal_idr' => 50000,
            'created_at' => $now->copy()->subHours(3),
            'updated_at' => $now->copy()->subHours(3),
        ]);

        // Version 2 (APPROVED by customer)
        $diagV2 = DiagnosisVersion::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'visit_id' => $visit->id,
            'worker_id' => 'WORKER-01',
            'version_no' => 2,
            'status' => 'SUBMITTED',
            'findings' => 'Diagnosis perbaikan kompresor',
            'work_subtotal_idr' => 200000,
            'provider_part_subtotal_idr' => 75000,
            'created_at' => $now->copy()->subHours(1),
            'updated_at' => $now->copy()->subHours(1),
        ]);

        ServiceWorkItem::forceCreate([
            'id' => (string) Str::ulid(),
            'diagnosis_version_id' => $diagV2->id,
            'line_no' => 1,
            'name' => 'Jasa Perbaikan Kompresor (Disetujui)',
            'quantity' => 1,
            'unit_price_idr' => 200000,
            'subtotal_idr' => 200000,
            'created_at' => $now->copy()->subHours(1),
            'updated_at' => $now->copy()->subHours(1),
        ]);

        ServicePartItem::forceCreate([
            'id' => (string) Str::ulid(),
            'diagnosis_version_id' => $diagV2->id,
            'line_no' => 1,
            'part_name' => 'Kapasitor 35uF (Disetujui)',
            'source' => 'PROVIDER_SUPPLIED',
            'quantity' => 1,
            'unit_price_idr' => 75000,
            'subtotal_idr' => 75000,
            'created_at' => $now->copy()->subHours(1),
            'updated_at' => $now->copy()->subHours(1),
        ]);

        // Customer Consent approving Version 2
        CustomerConsent::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'diagnosis_version_id' => $diagV2->id,
            'method' => 'CUSTOMER_REMOTE',
            'decision' => 'APPROVED',
            'recorded_by_type' => 'CUSTOMER',
            'recorded_by_id' => $this->customerId,
            'customer_id' => $this->customerId,
            'statement_acknowledged' => true,
            'submitted_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $billingService = app(ExecutionBillingService::class);
        $obligation = $billingService->generateExecutionBilling($order);

        $this->assertNotNull($obligation);
        $this->assertEquals($diagV2->id, $obligation->approved_diagnosis_version_id);

        // Expected: Rp 200,000 + Rp 75,000 = Rp 275,000 (NOT Rp 425,000!)
        $this->assertEquals(275000, $obligation->principal_idr);
    }

    /**
     * FIX 06: Remote PAID state must survive in DB even when 409 exception is returned to client.
     */
    public function test_fix06_remote_paid_state_survives_rollback_in_database(): void
    {
        [$order, $obligation, $attempt] = $this->createOrderWithExecutionObligation(amountIdr: 200000, isExpired: true);

        // Mock Finance client where remote status is PAID
        $financeMock = $this->createMock(FinanceServiceClientInterface::class);
        $financeMock->expects($this->once())
            ->method('getPaymentIntent')
            ->with('PAY-TEST-01')
            ->willReturn(['status' => 'PAID']);
        $financeMock->expects($this->never())->method('voidPaymentIntent');
        $financeMock->expects($this->never())->method('createPaymentIntent');

        $this->app->instance(FinanceServiceClientInterface::class, $financeMock);

        $customerActor = new AuthenticatedActor(
            id: $this->customerId,
            role: 'CUSTOMER'
        );

        $billingService = app(ExecutionBillingService::class);

        try {
            $billingService->retryExecutionPayment($customerActor, $order->id);
            $this->fail('Expected HttpException 409 was not thrown.');
        } catch (HttpException $e) {
            $this->assertEquals(409, $e->getStatusCode());
            $this->assertStringContainsString('diverifikasi lunas oleh sistem keuangan', $e->getMessage());
        }

        // CRITICAL FIX 06 ASSERTION:
        // Even though HttpException 409 was thrown, the PAID state MUST SURVIVE in MySQL!
        $obligation->refresh();
        $attempt->refresh();

        $this->assertEquals('PAID', $obligation->state);
        $this->assertEquals('PAID', $attempt->reported_status);
        $this->assertNotNull($obligation->paid_at);
        $this->assertEquals('PAY-TEST-01', $obligation->active_finance_payment_id);
    }

    /**
     * FIX 05: FinanceServiceClient sends only approved version work & part amounts to Finance quote endpoint.
     */
    public function test_fix05_finance_client_quote_receives_only_approved_version_amounts(): void
    {
        $now = now();
        $order = ServiceOrder::forceCreate([
            'id' => (string) Str::ulid(),
            'order_no' => 'SO-V4-QUOTE-' . strtoupper(Str::random(6)),
            'customer_id' => $this->customerId,
            'provider_org_id' => $this->providerOrgId,
            'service_offering_id' => 'OFFERING-01',
            'service_snapshot' => ['title' => 'Service AC Split Inverter'],
            'recipient_snapshot' => ['name' => 'Customer Test', 'phone' => '08123456789'],
            'address_snapshot' => ['city' => 'Jakarta Selatan', 'address_line' => 'Jl. Sudirman No. 1'],
            'status' => 'EXECUTION_IN_PROGRESS',
            'phase' => 'EXECUTION_IN_PROGRESS',
            'complaint_text' => 'AC tidak dingin sama sekali',
            'diagnosis_fee_idr' => 50000,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $visit = ServiceVisit::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'status' => 'VISIT_CLOSED',
            'visit_closed_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Version 1 (Rp 100k labor + Rp 50k parts)
        $diagV1 = DiagnosisVersion::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'visit_id' => $visit->id,
            'worker_id' => 'WORKER-01',
            'version_no' => 1,
            'status' => 'REVISED',
            'findings' => 'Diagnosis V1',
            'work_subtotal_idr' => 100000,
            'provider_part_subtotal_idr' => 50000,
            'created_at' => $now->copy()->subHours(2),
            'updated_at' => $now->copy()->subHours(2),
        ]);

        ServiceWorkItem::forceCreate([
            'id' => (string) Str::ulid(),
            'diagnosis_version_id' => $diagV1->id,
            'line_no' => 1,
            'name' => 'Jasa Cuci V1',
            'quantity' => 1,
            'unit_price_idr' => 100000,
            'subtotal_idr' => 100000,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        ServicePartItem::forceCreate([
            'id' => (string) Str::ulid(),
            'diagnosis_version_id' => $diagV1->id,
            'line_no' => 1,
            'part_name' => 'Pipa V1',
            'source' => 'PROVIDER_SUPPLIED',
            'quantity' => 1,
            'unit_price_idr' => 50000,
            'subtotal_idr' => 50000,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Version 2 (Rp 200k labor + Rp 75k parts) - APPROVED
        $diagV2 = DiagnosisVersion::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'visit_id' => $visit->id,
            'worker_id' => 'WORKER-01',
            'version_no' => 2,
            'status' => 'SUBMITTED',
            'findings' => 'Diagnosis V2 Disetujui',
            'work_subtotal_idr' => 200000,
            'provider_part_subtotal_idr' => 75000,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        ServiceWorkItem::forceCreate([
            'id' => (string) Str::ulid(),
            'diagnosis_version_id' => $diagV2->id,
            'line_no' => 1,
            'name' => 'Jasa Perbaikan V2',
            'quantity' => 1,
            'unit_price_idr' => 200000,
            'subtotal_idr' => 200000,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        ServicePartItem::forceCreate([
            'id' => (string) Str::ulid(),
            'diagnosis_version_id' => $diagV2->id,
            'line_no' => 1,
            'part_name' => 'Kapasitor V2',
            'source' => 'PROVIDER_SUPPLIED',
            'quantity' => 1,
            'unit_price_idr' => 75000,
            'subtotal_idr' => 75000,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'approved_diagnosis_version_id' => $diagV2->id,
            'principal_idr' => 275000,
            'currency' => 'IDR',
            'state' => 'INVOICE_PENDING',
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $capturedQuotePayload = null;
        Http::fake([
            'http://127.0.0.1:8006/internal/v1/finance/service-checkout-quotes' => function ($request) use (&$capturedQuotePayload) {
                $capturedQuotePayload = $request->data();
                return Http::response([
                    'status' => 'success',
                    'data' => [
                        'payload_hash' => hash('sha256', 'mock_payload_quote'),
                        'grand_total_idr' => 275000,
                    ],
                ], 200);
            },
            'http://127.0.0.1:8006/internal/v1/finance/checkouts/*/payment-intents' => Http::response([
                'status' => 'success',
                'data' => [
                    'payment_id' => 'PAY-INTENT-V2',
                    'invoice_ref' => 'INV-V2',
                    'checkout_url' => 'https://pay.servio.id/checkouts/v2',
                    'expires_at' => now()->addHours(6)->toIso8601String(),
                ],
            ], 200),
        ]);

        $client = new FinanceServiceClient();
        $res = $client->createPaymentIntent(
            orderId: $order->id,
            obligationId: $obligation->id,
            purpose: 'SERVICE_EXECUTION',
            amountIdr: 275000,
            customerId: $order->customer_id
        );

        $this->assertEquals('PAY-INTENT-V2', $res['payment_intent_id']);
        $this->assertNotNull($capturedQuotePayload);
        // CRITICAL FIX 05 PROOF:
        // Must be exactly 200000 (labor) and 75000 (parts) from approved Version 2!
        // Must NEVER be 300000 and 125000!
        $this->assertEquals(200000, $capturedQuotePayload['labor_subtotal_idr']);
        $this->assertEquals(75000, $capturedQuotePayload['provider_part_subtotal_idr']);
    }

    /**
     * V4.1 Task 1: Remote status EMPTY must fail closed (HTTP 503).
     */
    public function test_v41_remote_status_empty_fails_closed(): void
    {
        [$order, $obligation, $attempt] = $this->createOrderWithExecutionObligation(amountIdr: 200000, isExpired: true);

        $financeMock = $this->createMock(FinanceServiceClientInterface::class);
        $financeMock->expects($this->once())
            ->method('getPaymentIntent')
            ->with('PAY-TEST-01')
            ->willReturn(['status' => '']); // Empty status
        $financeMock->expects($this->never())->method('voidPaymentIntent');
        $financeMock->expects($this->never())->method('createPaymentIntent');

        $this->app->instance(FinanceServiceClientInterface::class, $financeMock);

        $customerActor = new AuthenticatedActor(id: $this->customerId, role: 'CUSTOMER');
        $billingService = app(ExecutionBillingService::class);

        try {
            $billingService->retryExecutionPayment($customerActor, $order->id);
            $this->fail('Expected HttpException 503 was not thrown.');
        } catch (HttpException $e) {
            $this->assertEquals(503, $e->getStatusCode());
            $this->assertStringContainsString('Status pembayaran dari sistem keuangan tidak valid atau tidak dikenali', $e->getMessage());
        }

        $this->assertEquals(1, ServicePaymentAttempt::where('obligation_id', $obligation->id)->count());
        $this->assertTrue($attempt->refresh()->is_current);
    }

    /**
     * V4.1 Task 1: Remote status UNKNOWN must fail closed (HTTP 503).
     */
    public function test_v41_remote_status_unknown_fails_closed(): void
    {
        [$order, $obligation, $attempt] = $this->createOrderWithExecutionObligation(amountIdr: 200000, isExpired: true);

        $financeMock = $this->createMock(FinanceServiceClientInterface::class);
        $financeMock->expects($this->once())
            ->method('getPaymentIntent')
            ->with('PAY-TEST-01')
            ->willReturn(['status' => 'UNKNOWN']); // UNKNOWN status
        $financeMock->expects($this->never())->method('voidPaymentIntent');
        $financeMock->expects($this->never())->method('createPaymentIntent');

        $this->app->instance(FinanceServiceClientInterface::class, $financeMock);

        $customerActor = new AuthenticatedActor(id: $this->customerId, role: 'CUSTOMER');
        $billingService = app(ExecutionBillingService::class);

        try {
            $billingService->retryExecutionPayment($customerActor, $order->id);
            $this->fail('Expected HttpException 503 was not thrown.');
        } catch (HttpException $e) {
            $this->assertEquals(503, $e->getStatusCode());
            $this->assertStringContainsString('Status pembayaran dari sistem keuangan tidak valid atau tidak dikenali', $e->getMessage());
        }

        $this->assertEquals(1, ServicePaymentAttempt::where('obligation_id', $obligation->id)->count());
        $this->assertTrue($attempt->refresh()->is_current);
    }

    /**
     * V4.1 Task 1: Remote status unrecognized (e.g. PROCESSING) must fail closed (HTTP 503).
     */
    public function test_v41_remote_status_unrecognized_fails_closed(): void
    {
        [$order, $obligation, $attempt] = $this->createOrderWithExecutionObligation(amountIdr: 200000, isExpired: true);

        $financeMock = $this->createMock(FinanceServiceClientInterface::class);
        $financeMock->expects($this->once())
            ->method('getPaymentIntent')
            ->with('PAY-TEST-01')
            ->willReturn(['status' => 'PROCESSING']); // Unrecognized non-terminal status
        $financeMock->expects($this->never())->method('voidPaymentIntent');
        $financeMock->expects($this->never())->method('createPaymentIntent');

        $this->app->instance(FinanceServiceClientInterface::class, $financeMock);

        $customerActor = new AuthenticatedActor(id: $this->customerId, role: 'CUSTOMER');
        $billingService = app(ExecutionBillingService::class);

        try {
            $billingService->retryExecutionPayment($customerActor, $order->id);
            $this->fail('Expected HttpException 503 was not thrown.');
        } catch (HttpException $e) {
            $this->assertEquals(503, $e->getStatusCode());
            $this->assertStringContainsString('Status pembayaran dari sistem keuangan tidak valid atau tidak dikenali', $e->getMessage());
        }

        $this->assertEquals(1, ServicePaymentAttempt::where('obligation_id', $obligation->id)->count());
        $this->assertTrue($attempt->refresh()->is_current);
    }

    /**
     * V4.1 Task 2: Void response body with success=false must fail closed.
     */
    public function test_v41_void_response_body_success_false_fails_closed(): void
    {
        Http::fake([
            'http://127.0.0.1:8006/internal/v1/finance/payments/*/void' => Http::response([
                'success' => false,
                'error' => [
                    'code' => 'VOID_REJECTED',
                    'message' => 'Void rejected by processor',
                ],
            ], 200), // HTTP 200, but success is false!
        ]);

        $client = new FinanceServiceClient();
        $res = $client->voidPaymentIntent('PAY-TEST-VOID-01');

        $this->assertFalse($res);
    }

    /**
     * V4.1 Task 2: Void response body with unconfirmed status (e.g. PENDING) must fail closed.
     */
    public function test_v41_void_response_body_unconfirmed_status_fails_closed(): void
    {
        Http::fake([
            'http://127.0.0.1:8006/internal/v1/finance/payments/*/void' => Http::response([
                'success' => true,
                'data' => [
                    'payment_id' => 'PAY-TEST-VOID-02',
                    'status' => 'PENDING', // Not CANCELLED or VOIDED!
                ],
            ], 200),
        ]);

        $client = new FinanceServiceClient();
        $res = $client->voidPaymentIntent('PAY-TEST-VOID-02');

        $this->assertFalse($res);
    }

    /**
     * V4.1 Task 2: Void duplicate request returns success with already cancelled status (idempotent).
     */
    public function test_v41_void_duplicate_request_idempotent_success(): void
    {
        Http::fake([
            'http://127.0.0.1:8006/internal/v1/finance/payments/*/void' => Http::response([
                'success' => true,
                'data' => [
                    'payment_id' => 'PAY-TEST-VOID-03',
                    'status' => 'CANCELLED',
                    'message' => 'Payment intent sudah dibatalkan sebelumnya.',
                ],
            ], 200),
        ]);

        $client = new FinanceServiceClient();
        $res = $client->voidPaymentIntent('PAY-TEST-VOID-03');

        $this->assertTrue($res);
    }
}
