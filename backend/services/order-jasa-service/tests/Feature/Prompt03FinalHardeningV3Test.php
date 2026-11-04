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
use App\Services\ExecutionBillingService;
use App\Services\FinanceEventIngestionService;
use App\Support\AuthenticatedActor;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class Prompt03FinalHardeningV3Test extends TestCase
{
    private string $customerId = 'CUST-V3-01';
    private string $providerOrgId = 'ORG-V3-01';
    private string $workerId = 'WORKER-V3-01';

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
            'order_no' => 'SO-V3-' . strtoupper(Str::random(8)),
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
            'work_subtotal_idr' => 150000,
            'provider_part_subtotal_idr' => 0,
            'service_total_base_idr' => 150000,
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

    // =========================================================================
    // GROUP A: PAYMENT RETRY & ATTEMPT MANAGEMENT (TASK 1 & TASK 5)
    // =========================================================================

    public function test_retry_when_invoice_is_still_active_returns_existing_attempt_without_duplicate(): void
    {
        $order = $this->createTestOrder('WORKER_FINISHED');
        $now = now();

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 150000,
            'currency' => 'IDR',
            'state' => 'INVOICE_PENDING',
            'payment_due_at' => $now->copy()->addHours(4), // Still active (not expired)
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $attempt1 = ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => 'PAY-ACTIVE-01',
            'finance_invoice_ref' => 'INV-ACTIVE-01',
            'reported_status' => 'PENDING',
            'amount_due_idr' => 150000,
            'issued_at' => $now,
            'expires_at' => $now->copy()->addHours(4),
            'is_current' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $headers = $this->actorHeaders($this->customerId, 'CUSTOMER');
        $headers['Idempotency-Key'] = 'idemp-retry-active-' . Str::random(8);

        $res = $this->postJson("/api/v1/order-jasa/orders/{$order->id}/payments/retry", [], $headers);

        $this->assertTrue(in_array($res->status(), [200, 201], true));
        $res->assertJson([
            'success' => true,
            'data' => [
                'attempt_no' => 1,
                'payment_attempt_id' => $attempt1->id,
                'payment_status' => 'PENDING',
                'amount_due_idr' => 150000,
                'message' => 'Tagihan pembayaran masih aktif dan valid.',
            ],
        ]);

        // CRITICAL CHECK: Exactly 1 attempt exists; NO second attempt created!
        $this->assertEquals(1, $obligation->attempts()->count());
    }

    public function test_retry_when_invoice_is_expired_creates_attempt_2_with_distinct_finance_checkout(): void
    {
        $order = $this->createTestOrder('PAYMENT_OVERDUE');
        $now = now();

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 150000,
            'currency' => 'IDR',
            'state' => 'OVERDUE',
            'payment_due_at' => $now->copy()->subMinutes(10), // Expired
            'created_at' => $now->copy()->subHours(7),
            'updated_at' => $now->copy()->subMinutes(10),
        ]);

        $oldAttempt = ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => 'PAY-EXP-01',
            'finance_invoice_ref' => 'INV-EXP-01',
            'reported_status' => 'PENDING',
            'amount_due_idr' => 150000,
            'issued_at' => $now->copy()->subHours(7),
            'expires_at' => $now->copy()->subMinutes(10),
            'is_current' => true,
            'created_at' => $now->copy()->subHours(7),
            'updated_at' => $now->copy()->subMinutes(10),
        ]);

        $headers = $this->actorHeaders($this->customerId, 'CUSTOMER');
        $headers['Idempotency-Key'] = 'idemp-retry-exp-' . Str::random(8);

        $res = $this->postJson("/api/v1/order-jasa/orders/{$order->id}/payments/retry", [], $headers);

        $this->assertTrue(in_array($res->status(), [200, 201], true));
        $res->assertJson([
            'success' => true,
            'data' => [
                'attempt_no' => 2,
                'payment_status' => 'PENDING',
                'amount_due_idr' => 150000,
            ],
        ]);

        // Verify distinct checkout url with -att2 suffix
        $checkoutUrl = $res->json('data.checkout_url');
        $this->assertStringContainsString('-att2', $checkoutUrl);

        // Verify old attempt is deactivated and expired
        $oldAttempt->refresh();
        $this->assertFalse((bool) $oldAttempt->is_current);
        $this->assertEquals('EXPIRED', $oldAttempt->reported_status);

        // Verify new attempt is active
        $newAttempt = $obligation->attempts()->where('attempt_no', 2)->first();
        $this->assertNotNull($newAttempt);
        $this->assertTrue((bool) $newAttempt->is_current);
        $this->assertEquals('PENDING', $newAttempt->reported_status);

        // Verify both attempts link to the exact same obligation
        $this->assertEquals(2, $obligation->attempts()->count());
        $this->assertEquals(150000, $obligation->principal_idr);
    }

    public function test_retry_on_already_paid_obligation_returns_409(): void
    {
        $order = $this->createTestOrder('EXECUTION_PAID');
        $now = now();

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 150000,
            'currency' => 'IDR',
            'state' => 'PAID',
            'paid_at' => $now,
            'active_finance_payment_id' => 'PAY-PAID-01',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => 'PAY-PAID-01',
            'reported_status' => 'PAID',
            'amount_due_idr' => 150000,
            'issued_at' => $now,
            'is_current' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $headers = $this->actorHeaders($this->customerId, 'CUSTOMER');
        $headers['Idempotency-Key'] = 'idemp-retry-paid-' . Str::random(8);

        $res = $this->postJson("/api/v1/order-jasa/orders/{$order->id}/payments/retry", [], $headers);
        $res->assertStatus(409);
    }

    public function test_retry_by_unauthorized_actors_is_forbidden(): void
    {
        $order = $this->createTestOrder('WORKER_FINISHED');
        ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 150000,
            'currency' => 'IDR',
            'state' => 'OVERDUE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Other customer IDOR attempt
        $attackerHeaders = $this->actorHeaders('CUST-ATTACKER-99', 'CUSTOMER');
        $attackerHeaders['Idempotency-Key'] = 'idemp-retry-att-' . Str::random(8);
        $res1 = $this->postJson("/api/v1/order-jasa/orders/{$order->id}/payments/retry", [], $attackerHeaders);
        $res1->assertStatus(403);

        // Worker attempt
        $workerHeaders = $this->actorHeaders($this->workerId, 'WORKER');
        $workerHeaders['Idempotency-Key'] = 'idemp-retry-wkr-' . Str::random(8);
        $res2 = $this->postJson("/api/v1/order-jasa/orders/{$order->id}/payments/retry", [], $workerHeaders);
        $res2->assertStatus(403);
    }

    // =========================================================================
    // GROUP B: CALLBACK PROTECTION & DEDUPLICATION (TASK 2 & TASK 3)
    // =========================================================================

    public function test_stale_expired_callback_from_old_attempt_does_not_downgrade_active_attempt_obligation(): void
    {
        $order = $this->createTestOrder('EXECUTION_IN_PROGRESS');
        $now = now();

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 150000,
            'currency' => 'IDR',
            'state' => 'INVOICE_PENDING',
            'payment_due_at' => $now->copy()->addHours(6),
            'version' => 2,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Old attempt 1 (expired, is_current = false)
        $oldAttempt = ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => 'PAY-STALE-OLD',
            'reported_status' => 'PENDING',
            'amount_due_idr' => 150000,
            'issued_at' => $now->copy()->subHours(8),
            'expires_at' => $now->copy()->subHours(2),
            'is_current' => false,
            'created_at' => $now->copy()->subHours(8),
            'updated_at' => $now->copy()->subHours(2),
        ]);

        // New attempt 2 (active and pending, is_current = true)
        $newAttempt = ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 2,
            'finance_payment_id' => 'PAY-ACTIVE-NEW',
            'reported_status' => 'PENDING',
            'amount_due_idr' => 150000,
            'issued_at' => $now,
            'expires_at' => $now->copy()->addHours(6),
            'is_current' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /** @var FinanceEventIngestionService $service */
        $service = app(FinanceEventIngestionService::class);

        // Stale callback for old attempt arrives from gateway
        $res = $service->ingestFinanceEvent([
            'event_id' => 'EVT-STALE-' . Str::ulid(),
            'event_type' => 'finance.payment.expired.v1',
            'payload' => [
                'payment_id' => 'PAY-STALE-OLD',
                'amount_idr' => 150000,
                'status' => 'EXPIRED',
            ],
        ]);

        $this->assertTrue($res['handled']);

        // Check that old attempt was updated to EXPIRED
        $oldAttempt->refresh();
        $this->assertEquals('EXPIRED', $oldAttempt->reported_status);

        // CRITICAL CHECK TASK 2: Obligation must NOT be downgraded to OVERDUE because attempt 2 is still active!
        $obligation->refresh();
        $this->assertEquals('INVOICE_PENDING', $obligation->state);
        $this->assertEquals(2, $obligation->version, 'Obligation version must not increment on stale attempt callback');
    }

    public function test_double_payment_detected_and_flagged_for_reconciliation_on_completed_order(): void
    {
        $order = $this->createTestOrder('COMPLETED');
        $order->forceFill(['phase' => 'TERMINAL', 'completed_at' => now()->subDay()])->save();
        $now = now();

        $paymentId1 = 'PAY-PRIMARY-' . Str::ulid();
        $paymentId2 = 'PAY-DOUBLE-' . Str::ulid();

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 150000,
            'currency' => 'IDR',
            'state' => 'PAID',
            'paid_at' => $now->subDay(),
            'active_finance_payment_id' => $paymentId1,
            'created_at' => $now->subDay(),
            'updated_at' => $now->subDay(),
        ]);

        ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => $paymentId1,
            'reported_status' => 'PAID',
            'amount_due_idr' => 150000,
            'issued_at' => $now->subDay(),
            'is_current' => false,
            'created_at' => $now->subDay(),
            'updated_at' => $now->subDay(),
        ]);

        // Attempt 2 was issued before completion, now also gets paid late
        $attempt2 = ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 2,
            'finance_payment_id' => $paymentId2,
            'reported_status' => 'PENDING',
            'amount_due_idr' => 150000,
            'issued_at' => $now->subHours(20),
            'is_current' => true,
            'created_at' => $now->subHours(20),
            'updated_at' => $now->subHours(20),
        ]);

        /** @var FinanceEventIngestionService $service */
        $service = app(FinanceEventIngestionService::class);

        // Callback for attempt 2 arrives AFTER order is COMPLETED
        $result = $service->ingestFinanceEvent([
            'event_id' => 'EVT-DOUBLE-COMPLETED-' . Str::ulid(),
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'payment_id' => $paymentId2,
                'amount_idr' => 150000,
                'status' => 'PAID',
            ],
        ]);

        // CRITICAL CHECK TASK 3: Double payment MUST be flagged even on COMPLETED order!
        $this->assertTrue($result['handled']);
        $this->assertTrue($result['double_payment']);
        $this->assertTrue($result['reconciliation_required']);
        $this->assertEquals('COMPLETED', $result['order_status']);

        // Verify attempt 2 recorded as PAID for audit
        $attempt2->refresh();
        $this->assertEquals('PAID', $attempt2->reported_status);

        // Verify inbox event marked RECONCILIATION_REQUIRED
        $inbox = IntegrationInboxEvent::where('source_event_id', 'like', 'EVT-DOUBLE-COMPLETED-%')->first();
        $this->assertNotNull($inbox);
        $this->assertEquals('RECONCILIATION_REQUIRED', $inbox->processing_status);

        // Verify order remains terminal COMPLETED and obligation remains PAID
        $order->refresh();
        $this->assertEquals('COMPLETED', $order->status);
        $this->assertEquals('TERMINAL', $order->phase);
    }

    // =========================================================================
    // GROUP C & D: SETTLEMENT RELEASE 120H & PER-ORDER SAFETY (TASK 4)
    // =========================================================================

    public function test_settlement_release_120h_checks_individual_order_eligibility(): void
    {
        $now = now();

        // Order A: completed 121h ago, NO dispute -> should release
        $orderA = $this->createTestOrder('COMPLETED');
        $orderA->forceFill(['completed_at' => $now->copy()->subHours(121)])->save();

        $entitlementA = ServiceFinanceEntitlementRef::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderA->id,
            'purpose' => 'SERVICE_EXECUTION',
            'finance_entitlement_id' => 'ENT-A-' . Str::ulid(),
            'finance_event_id' => 'EVT-SETTL-A-' . Str::ulid(),
            'hold_status' => 'HELD',
            'release_eligible_at' => $now->copy()->subHour(),
            'net_provider_idr' => 150000,
            'payment_allocation_reference' => $orderA->order_no,
            'created_at' => $now->copy()->subHours(121),
            'updated_at' => $now->copy()->subHours(121),
        ]);

        // Order B: completed 121h ago, but HAS OPEN DISPUTE -> must NOT release!
        $orderB = $this->createTestOrder('COMPLETED');
        $orderB->forceFill(['completed_at' => $now->copy()->subHours(121)])->save();

        $entitlementB = ServiceFinanceEntitlementRef::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderB->id,
            'purpose' => 'SERVICE_EXECUTION',
            'finance_entitlement_id' => 'ENT-B-' . Str::ulid(),
            'finance_event_id' => 'EVT-SETTL-B-' . Str::ulid(),
            'hold_status' => 'HELD',
            'release_eligible_at' => $now->copy()->subHour(),
            'net_provider_idr' => 150000,
            'payment_allocation_reference' => $orderB->order_no,
            'created_at' => $now->copy()->subHours(121),
            'updated_at' => $now->copy()->subHours(121),
        ]);

        OperationalIssue::forceCreate([
            'id' => (string) Str::ulid(),
            'issue_no' => 'ISSUE-B-' . strtoupper(Str::random(6)),
            'order_id' => $orderB->id,
            'issue_kind' => 'DISPUTE',
            'status' => 'OPEN',
            'affects_completion' => true,
            'affects_funds' => true,
            'reported_by_id' => $this->customerId,
            'reported_by_role' => 'CUSTOMER',
            'description' => 'Sengketa perbaikan unit B',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        /** @var CompletionAndSettlementService $completionService */
        $completionService = app(CompletionAndSettlementService::class);
        $releasedCount = $completionService->releaseMaturedFunds();

        // Exactly 1 order released (Order A)
        $this->assertEquals(1, $releasedCount);

        // Order A became AVAILABLE
        $entitlementA->refresh();
        $this->assertEquals('AVAILABLE', $entitlementA->hold_status);

        // Order B MUST REMAIN HELD due to open dispute!
        $entitlementB->refresh();
        $this->assertEquals('HELD', $entitlementB->hold_status);
    }
}
