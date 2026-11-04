<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Contracts\FinanceServiceClientInterface;
use App\Contracts\IdentityServiceClientInterface;
use App\Contracts\ServiceOfferingClientInterface;
use App\Infrastructure\Finance\FakeFinanceServiceClient;
use App\Infrastructure\Identity\FakeIdentityServiceClient;
use App\Infrastructure\ServiceCatalog\FakeServiceOfferingClient;
use App\Models\CustomerConsent;
use App\Models\DiagnosisVersion;
use App\Models\IntegrationInboxEvent;
use App\Models\IntegrationOutboxEvent;
use App\Models\OperationalIssue;
use App\Models\ServiceExecution;
use App\Models\ServiceFinanceEntitlementRef;
use App\Models\ServiceOrder;
use App\Models\ServicePaymentAttempt;
use App\Models\ServicePaymentObligation;
use App\Models\ServiceVisit;
use App\Services\CompletionAndSettlementService;
use App\Services\FinanceEventIngestionService;
use App\Support\AuthenticatedActor;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class Prompt02HardenPaymentAndCompletionTest extends TestCase
{
    private string $customerId = 'CUST-HARDEN-01';
    private string $providerOrgId = 'ORG-HARDEN-01';
    private string $workerId = 'WORKER-HARDEN-01';

    protected function setUp(): void
    {
        parent::setUp();

        $this->app->singleton(IdentityServiceClientInterface::class, FakeIdentityServiceClient::class);
        $this->app->singleton(ServiceOfferingClientInterface::class, FakeServiceOfferingClient::class);
        $this->app->singleton(FinanceServiceClientInterface::class, FakeFinanceServiceClient::class);
    }

    private function createTestOrder(string $status = 'EXECUTION_PAID'): ServiceOrder
    {
        $now = now();
        $order = ServiceOrder::forceCreate([
            'id' => (string) Str::ulid(),
            'order_no' => 'SO-' . strtoupper(Str::random(8)),
            'customer_id' => $this->customerId,
            'provider_org_id' => $this->providerOrgId,
            'service_offering_id' => 'OFFERING-01',
            'service_snapshot' => ['title' => 'Service AC Split Inverter'],
            'recipient_snapshot' => ['name' => 'Customer Test', 'phone' => '08123456789'],
            'address_snapshot' => ['city' => 'Jakarta Selatan', 'address_line' => 'Jl. Sudirman No. 1'],
            'status' => $status,
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

        $diagnosis = DiagnosisVersion::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'visit_id' => $visit->id,
            'version_no' => 1,
            'status' => 'SUBMITTED',
            'worker_id' => $this->workerId,
            'findings' => 'Kapasitor rusak',
            'work_subtotal_idr' => 100000,
            'provider_part_subtotal_idr' => 0,
            'service_total_base_idr' => 100000,
            'currency' => 'IDR',
            'submitted_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $consent = CustomerConsent::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'diagnosis_version_id' => $diagnosis->id,
            'method' => 'CUSTOMER_REMOTE',
            'decision' => 'APPROVED',
            'recorded_by_type' => 'CUSTOMER',
            'recorded_by_id' => $order->customer_id,
            'customer_id' => $order->customer_id,
            'statement_acknowledged' => true,
            'submitted_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        ServiceExecution::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'visit_id' => $visit->id,
            'diagnosis_version_id' => $diagnosis->id,
            'consent_id' => $consent->id,
            'worker_id' => $this->workerId,
            'status' => 'WORKER_FINISHED',
            'started_at' => $now,
            'finished_at' => $now,
            'summary' => 'Selesai perbaikan kapasitor',
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $order;
    }

    // ==========================================
    // TASK 1: PAYMENT CALLBACK STATE TRANSITIONS
    // ==========================================

    public function test_payment_callback_on_completed_order_does_not_mutate_terminal_status(): void
    {
        $order = $this->createTestOrder('COMPLETED');
        $order->forceFill(['phase' => 'TERMINAL', 'completed_at' => now()])->save();

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 150000,
            'currency' => 'IDR',
            'state' => 'PAID',
            'paid_at' => now(),
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $paymentId = 'PAY-' . Str::ulid();
        $attempt = ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => $paymentId,
            'method' => 'MOCK',
            'reported_status' => 'PENDING',
            'amount_due_idr' => 150000,
            'issued_at' => now(),
            'is_current' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        /** @var FinanceEventIngestionService $service */
        $service = app(FinanceEventIngestionService::class);

        // Late payment arrives after order is COMPLETED
        $result = $service->ingestFinanceEvent([
            'event_id' => 'EVT-LATE-' . Str::ulid(),
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'payment_id' => $paymentId,
                'amount_idr' => 150000,
                'status' => 'PAID',
            ],
        ]);

        $this->assertTrue($result['handled']);
        $this->assertEquals('COMPLETED', $result['order_status']);

        $order->refresh();
        $this->assertEquals('COMPLETED', $order->status, 'Terminal order status COMPLETED must never revert to EXECUTION_PAID');
        $this->assertEquals('TERMINAL', $order->phase);

        $attempt->refresh();
        $this->assertEquals('PAID', $attempt->reported_status);
    }

    public function test_duplicate_payment_callback_does_not_create_duplicate_financial_effects(): void
    {
        $order = $this->createTestOrder('EXECUTION_PAID');
        $paymentId = 'PAY-DUP-' . Str::ulid();

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 120000,
            'currency' => 'IDR',
            'state' => 'PAID',
            'active_finance_payment_id' => $paymentId,
            'paid_at' => now(),
            'version' => 2,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $attempt = ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => $paymentId,
            'method' => 'MOCK',
            'reported_status' => 'PAID',
            'amount_due_idr' => 120000,
            'issued_at' => now(),
            'is_current' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        /** @var FinanceEventIngestionService $service */
        $service = app(FinanceEventIngestionService::class);

        $result = $service->ingestFinanceEvent([
            'event_id' => 'EVT-DUP-' . Str::ulid(),
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'payment_id' => $paymentId,
                'amount_idr' => 120000,
                'status' => 'PAID',
            ],
        ]);

        $this->assertTrue($result['handled']);
        $this->assertTrue($result['duplicate']);
        $this->assertEquals('PAID', $result['obligation_state']);

        $obligation->refresh();
        $this->assertEquals(2, $obligation->version, 'Obligation version must not increment on duplicate callback');
    }

    public function test_out_of_order_failed_or_expired_callback_does_not_downgrade_paid_obligation(): void
    {
        $order = $this->createTestOrder('EXECUTION_PAID');
        $paymentId = 'PAY-PAID-' . Str::ulid();

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 100000,
            'currency' => 'IDR',
            'state' => 'PAID',
            'active_finance_payment_id' => $paymentId,
            'paid_at' => now(),
            'version' => 2,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $attempt = ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => $paymentId,
            'method' => 'MOCK',
            'reported_status' => 'PAID',
            'amount_due_idr' => 100000,
            'issued_at' => now(),
            'is_current' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        /** @var FinanceEventIngestionService $service */
        $service = app(FinanceEventIngestionService::class);

        // Delayed expired callback arrives after payment was already confirmed
        $result = $service->ingestFinanceEvent([
            'event_id' => 'EVT-STALE-EXP-' . Str::ulid(),
            'event_type' => 'finance.payment.expired.v1',
            'payload' => [
                'payment_id' => $paymentId,
                'amount_idr' => 100000,
            ],
        ]);

        $this->assertTrue($result['handled']);
        $obligation->refresh();
        $this->assertEquals('PAID', $obligation->state, 'A PAID obligation must never be downgraded by stale expired callback');
    }

    public function test_double_payment_on_different_attempt_is_flagged_for_reconciliation(): void
    {
        $order = $this->createTestOrder('EXECUTION_PAID');
        $paidPaymentId1 = 'PAY-FIRST-' . Str::ulid();
        $paidPaymentId2 = 'PAY-SECOND-' . Str::ulid();

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 100000,
            'currency' => 'IDR',
            'state' => 'PAID',
            'active_finance_payment_id' => $paidPaymentId1,
            'paid_at' => now(),
            'version' => 2,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Attempt 1 already paid
        ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => $paidPaymentId1,
            'reported_status' => 'PAID',
            'amount_due_idr' => 100000,
            'is_current' => false,
            'issued_at' => now()->subMinutes(30),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Attempt 2 also receives payment callback from gateway (double charge scenario)
        ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 2,
            'finance_payment_id' => $paidPaymentId2,
            'reported_status' => 'PENDING',
            'amount_due_idr' => 100000,
            'is_current' => true,
            'issued_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        /** @var FinanceEventIngestionService $service */
        $service = app(FinanceEventIngestionService::class);

        $result = $service->ingestFinanceEvent([
            'event_id' => 'EVT-DOUBLE-' . Str::ulid(),
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'payment_id' => $paidPaymentId2,
                'amount_idr' => 100000,
                'status' => 'PAID',
            ],
        ]);

        $this->assertTrue($result['handled']);
        $this->assertTrue($result['double_payment'] ?? false, 'Double payment must be detected');
        $this->assertEquals('PAID', $obligation->state);
    }

    // ==========================================
    // TASK 2: STRICT PAYMENT OBLIGATION VALIDATION
    // ==========================================

    public function test_completion_with_null_payment_obligation_is_strictly_rejected(): void
    {
        $order = $this->createTestOrder('WORKER_FINISHED');
        // Do NOT create ServicePaymentObligation

        $actor = new AuthenticatedActor(
            id: $this->customerId,
            role: 'CUSTOMER',
            organizationId: null,
            organizationType: null,
            roleAssignmentId: null,
            authzVersion: 1,
            isGuest: false,
            organizationIsActive: true,
            membershipIsActive: true,
        );

        /** @var CompletionAndSettlementService $completionService */
        $completionService = app(CompletionAndSettlementService::class);

        try {
            $completionService->completeOrder($actor, $order->id);
            $this->fail('Expected HttpException 422');
        } catch (HttpException $e) {
            $this->assertEquals(422, $e->getStatusCode());
            $this->assertStringContainsString('kewajiban pembayaran', $e->getMessage());
        }
    }

    public function test_completion_with_unpaid_or_overdue_obligation_is_strictly_rejected(): void
    {
        $order = $this->createTestOrder('WORKER_FINISHED');

        ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 175000,
            'currency' => 'IDR',
            'state' => 'OVERDUE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $actor = new AuthenticatedActor(
            id: $this->customerId,
            role: 'CUSTOMER',
            organizationId: null,
            organizationType: null,
            roleAssignmentId: null,
            authzVersion: 1,
            isGuest: false,
            organizationIsActive: true,
            membershipIsActive: true,
        );

        /** @var CompletionAndSettlementService $completionService */
        $completionService = app(CompletionAndSettlementService::class);

        try {
            $completionService->completeOrder($actor, $order->id);
            $this->fail('Expected HttpException 422');
        } catch (HttpException $e) {
            $this->assertEquals(422, $e->getStatusCode());
            $this->assertStringContainsString('belum lunas', $e->getMessage());
        }
    }

    public function test_completion_with_fake_not_required_obligation_with_nonzero_principal_is_rejected(): void
    {
        $order = $this->createTestOrder('WORKER_FINISHED');

        // Fraudulent claim: state NOT_REQUIRED but principal is Rp 150.000
        ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 150000,
            'currency' => 'IDR',
            'state' => 'NOT_REQUIRED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $actor = new AuthenticatedActor(
            id: $this->customerId,
            role: 'CUSTOMER',
            organizationId: null,
            organizationType: null,
            roleAssignmentId: null,
            authzVersion: 1,
            isGuest: false,
            organizationIsActive: true,
            membershipIsActive: true,
        );

        /** @var CompletionAndSettlementService $completionService */
        $completionService = app(CompletionAndSettlementService::class);

        try {
            $completionService->completeOrder($actor, $order->id);
            $this->fail('Expected HttpException 422');
        } catch (HttpException $e) {
            $this->assertEquals(422, $e->getStatusCode());
            $this->assertStringContainsString('bukan Rp0', $e->getMessage());
        }
    }

    public function test_completion_with_valid_not_required_rp0_obligation_succeeds(): void
    {
        $order = $this->createTestOrder('WORKER_FINISHED');

        // Genuine Rp0 obligation (e.g. warranty covered)
        ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 0,
            'currency' => 'IDR',
            'state' => 'NOT_REQUIRED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $actor = new AuthenticatedActor(
            id: $this->customerId,
            role: 'CUSTOMER',
            organizationId: null,
            organizationType: null,
            roleAssignmentId: null,
            authzVersion: 1,
            isGuest: false,
            organizationIsActive: true,
            membershipIsActive: true,
        );

        /** @var CompletionAndSettlementService $completionService */
        $completionService = app(CompletionAndSettlementService::class);

        $completedOrder = $completionService->completeOrder($actor, $order->id);

        $this->assertEquals('COMPLETED', $completedOrder->status);
        $this->assertEquals('TERMINAL', $completedOrder->phase);
        $this->assertNotNull($completedOrder->completed_at);
    }

    public function test_completion_with_valid_paid_obligation_succeeds_and_creates_idempotent_outbox(): void
    {
        $order = $this->createTestOrder('EXECUTION_PAID');
        $paymentId = 'PAY-VALID-' . Str::ulid();

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 200000,
            'currency' => 'IDR',
            'state' => 'PAID',
            'paid_at' => now(),
            'active_finance_payment_id' => $paymentId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => $paymentId,
            'reported_status' => 'PAID',
            'amount_due_idr' => 200000,
            'is_current' => true,
            'issued_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $actor = new AuthenticatedActor(
            id: $this->customerId,
            role: 'CUSTOMER',
            organizationId: null,
            organizationType: null,
            roleAssignmentId: null,
            authzVersion: 1,
            isGuest: false,
            organizationIsActive: true,
            membershipIsActive: true,
        );

        /** @var CompletionAndSettlementService $completionService */
        $completionService = app(CompletionAndSettlementService::class);

        $completedOrder = $completionService->completeOrder($actor, $order->id);

        $this->assertEquals('COMPLETED', $completedOrder->status);
        $this->assertEquals('TERMINAL', $completedOrder->phase);

        // Verify Outbox Event created
        $outbox = IntegrationOutboxEvent::where('aggregate_id', $order->id)
            ->where('event_type', 'order_jasa.order.completed.v1')
            ->first();
        $this->assertNotNull($outbox);
        $this->assertEquals(200000, $outbox->payload_json['net_provider_idr']);

        // Verify Entitlement Ref created with 120-hour escrow hold
        $entitlement = ServiceFinanceEntitlementRef::where('order_id', $order->id)->first();
        $this->assertNotNull($entitlement);
        $this->assertEquals('HELD', $entitlement->hold_status);
        $this->assertTrue(\Carbon\Carbon::parse($entitlement->release_eligible_at)->gt(now()->addHours(119)));
    }

    public function test_active_dispute_blocks_order_completion(): void
    {
        $order = $this->createTestOrder('EXECUTION_PAID');

        ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 150000,
            'currency' => 'IDR',
            'state' => 'PAID',
            'paid_at' => now(),
            'active_finance_payment_id' => 'PAY-DISP-' . Str::ulid(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => ServicePaymentObligation::where('order_id', $order->id)->first()->id,
            'attempt_no' => 1,
            'finance_payment_id' => 'PAY-DISP-' . Str::ulid(),
            'reported_status' => 'PAID',
            'amount_due_idr' => 150000,
            'is_current' => true,
            'issued_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Open blocking dispute
        OperationalIssue::forceCreate([
            'id' => (string) Str::ulid(),
            'issue_no' => 'ISSUE-' . strtoupper(Str::random(8)),
            'order_id' => $order->id,
            'issue_kind' => 'DISPUTE',
            'status' => 'OPEN',
            'affects_completion' => true,
            'affects_funds' => true,
            'reported_by_id' => $this->customerId,
            'reported_by_role' => 'CUSTOMER',
            'description' => 'Pipa AC bocor kembali setelah teknisi selesai',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $actor = new AuthenticatedActor(
            id: $this->customerId,
            role: 'CUSTOMER',
            organizationId: null,
            organizationType: null,
            roleAssignmentId: null,
            authzVersion: 1,
            isGuest: false,
            organizationIsActive: true,
            membershipIsActive: true,
        );

        /** @var CompletionAndSettlementService $completionService */
        $completionService = app(CompletionAndSettlementService::class);

        try {
            $completionService->completeOrder($actor, $order->id);
            $this->fail('Expected HttpException 422');
        } catch (HttpException $e) {
            $this->assertEquals(422, $e->getStatusCode());
            $this->assertStringContainsString('kendala operasional', $e->getMessage());
        }
    }

    // ==========================================
    // TASK 3: PAYMENT RETRY / REPLACEMENT INVOICE
    // ==========================================

    public function test_overdue_payment_retry_creates_new_attempt_on_same_obligation(): void
    {
        $order = $this->createTestOrder('PAYMENT_OVERDUE');

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 180000,
            'currency' => 'IDR',
            'state' => 'OVERDUE',
            'payment_due_at' => now()->subHour(),
            'finance_obligation_ref' => 'INV-OLD-01',
            'active_finance_payment_id' => 'PAY-OLD-01',
            'version' => 1,
            'created_at' => now()->subHours(7),
            'updated_at' => now()->subHour(),
        ]);

        $oldAttempt = ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => 'PAY-OLD-01',
            'finance_invoice_ref' => 'INV-OLD-01',
            'reported_status' => 'EXPIRED',
            'amount_due_idr' => 180000,
            'issued_at' => now()->subHours(7),
            'expires_at' => now()->subHour(),
            'is_current' => true,
            'created_at' => now()->subHours(7),
            'updated_at' => now()->subHour(),
        ]);

        $customerHeaders = $this->actorHeaders($this->customerId, 'CUSTOMER');
        $customerHeaders['Idempotency-Key'] = 'idemp-retry-test-' . Str::random(8);

        $res = $this->postJson("/api/v1/order-jasa/orders/{$order->id}/payments/retry", [], $customerHeaders);

        $res->assertStatus(201);
        $data = $res->json('data');

        $this->assertEquals($order->id, $data['order_id']);
        $this->assertEquals($obligation->id, $data['payment_obligation_id'], 'Must reuse the exact same obligation ID');
        $this->assertEquals(2, $data['attempt_no'], 'Must increment attempt number');
        $this->assertEquals(180000, $data['amount_idr']);
        $this->assertEquals('PENDING', $data['payment_status']);
        $this->assertNotEmpty($data['checkout_url']);

        // Verify database state
        $oldAttempt->refresh();
        $this->assertFalse((bool) $oldAttempt->is_current, 'Old attempt must be deactivated');

        $newAttempt = ServicePaymentAttempt::where('id', $data['payment_attempt_id'])->first();
        $this->assertNotNull($newAttempt);
        $this->assertTrue((bool) $newAttempt->is_current);
        $this->assertEquals(2, $newAttempt->attempt_no);
        $this->assertEquals($obligation->id, $newAttempt->obligation_id);

        $obligation->refresh();
        $this->assertEquals('INVOICE_PENDING', $obligation->state);
        $this->assertEquals($newAttempt->finance_payment_id, $obligation->active_finance_payment_id);
    }

    public function test_payment_retry_on_already_paid_obligation_is_rejected_409(): void
    {
        $order = $this->createTestOrder('EXECUTION_PAID');

        ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 160000,
            'currency' => 'IDR',
            'state' => 'PAID',
            'paid_at' => now(),
            'version' => 2,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $customerHeaders = $this->actorHeaders($this->customerId, 'CUSTOMER');
        $customerHeaders['Idempotency-Key'] = 'idemp-retry-paid-' . Str::random(8);

        $res = $this->postJson("/api/v1/order-jasa/orders/{$order->id}/payments/retry", [], $customerHeaders);

        $res->assertStatus(409);
    }

    public function test_payment_retry_by_unauthorized_customer_is_forbidden_403(): void
    {
        $order = $this->createTestOrder('PAYMENT_OVERDUE');

        ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 150000,
            'currency' => 'IDR',
            'state' => 'OVERDUE',
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Malicious / other customer
        $otherCustomerHeaders = $this->actorHeaders('CUST-ATTACKER-99', 'CUSTOMER');
        $otherCustomerHeaders['Idempotency-Key'] = 'idemp-retry-idor-' . Str::random(8);

        $res = $this->postJson("/api/v1/order-jasa/orders/{$order->id}/payments/retry", [], $otherCustomerHeaders);

        $res->assertStatus(403);
    }

    // ==========================================
    // TASK 4: ESCROW HOLD & SETTLEMENT HARDENING
    // ==========================================

    public function test_escrow_hold_120h_release_requires_finance_confirmation_and_checks_dispute(): void
    {
        $order = $this->createTestOrder('COMPLETED');
        $order->forceFill(['completed_at' => now()->subHours(121)])->save();

        $entitlement = ServiceFinanceEntitlementRef::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'finance_entitlement_id' => 'ENT-' . Str::ulid(),
            'finance_event_id' => 'EVT-SETTL-' . Str::ulid(),
            'hold_status' => 'HELD',
            'release_eligible_at' => now()->subHour(), // Matured
            'net_provider_idr' => 160000,
            'payment_allocation_reference' => $order->order_no,
            'created_at' => now()->subHours(121),
            'updated_at' => now()->subHours(121),
        ]);

        // Case A: With active blocking dispute -> must NOT release
        $issue = OperationalIssue::forceCreate([
            'id' => (string) Str::ulid(),
            'issue_no' => 'ISSUE-' . strtoupper(Str::random(8)),
            'order_id' => $order->id,
            'issue_kind' => 'DISPUTE',
            'status' => 'OPEN',
            'affects_completion' => true,
            'affects_funds' => true,
            'reported_by_id' => $this->customerId,
            'reported_by_role' => 'CUSTOMER',
            'description' => 'Menunggu verifikasi teknisi',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        /** @var CompletionAndSettlementService $completionService */
        $completionService = app(CompletionAndSettlementService::class);
        $released = $completionService->releaseMaturedFunds();

        $this->assertEquals(0, $released, 'Must not release matured funds when order has active dispute');
        $entitlement->refresh();
        $this->assertEquals('HELD', $entitlement->hold_status);

        // Case B: Dispute resolved -> matured funds successfully release to AVAILABLE
        $issue->forceFill(['status' => 'RESOLVED'])->save();

        $releasedAfterResolve = $completionService->releaseMaturedFunds();
        $this->assertEquals(1, $releasedAfterResolve);

        $entitlement->refresh();
        $this->assertEquals('AVAILABLE', $entitlement->hold_status);
    }
}

