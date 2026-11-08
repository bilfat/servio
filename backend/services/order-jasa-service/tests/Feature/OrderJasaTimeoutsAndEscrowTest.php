<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BookingActiveAssignment;
use App\Models\CustomerConsent;
use App\Models\DiagnosisVersion;
use App\Models\OperationalIssue;
use App\Models\ServiceBooking;
use App\Models\ServiceExecution;
use App\Models\ServiceFinanceEntitlementRef;
use App\Models\ServiceOrder;
use App\Models\ServicePaymentObligation;
use App\Models\ServicePaymentAttempt;
use App\Models\ServiceVisit;
use App\Models\WorkerAssignmentAttempt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrderJasaTimeoutsAndEscrowTest extends TestCase
{
    private function createBaseOrder(string $customerId, string $status = 'PAID_WAITING_DISPATCH'): ServiceOrder
    {
        $orderId = (string) Str::ulid();
        $now = now();

        $order = ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'SO-SLA-' . strtoupper(Str::random(6)),
            'customer_id' => $customerId,
            'provider_org_id' => 'ORG-PROVIDER-01',
            'service_offering_id' => 'srv-ac-01',
            'service_snapshot' => ['title' => 'Perbaikan AC Inverter'],
            'address_snapshot' => ['city' => 'Jakarta Selatan'],
            'recipient_snapshot' => ['name' => 'Budi Santoso'],
            'complaint_text' => 'AC tidak dingin dan berisik',
            'status' => $status,
            'phase' => 'WORKER_ASSIGNMENT_PENDING',
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        ServiceBooking::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'customer_id' => $customerId,
            'provider_org_id' => 'ORG-PROVIDER-01',
            'scheduled_start_at' => $now->copy()->addDay(),
            'scheduled_end_at' => $now->copy()->addDay()->addHours(2),
            'status' => 'CONFIRMED',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $order;
    }

    public function test_30m_worker_assignment_sla_timeout_expires_attempt_and_reverts_order_to_dispatch(): void
    {
        $order = $this->createBaseOrder('CUST-SLA-01', 'ASSIGNED_WAITING_WORKER');
        $now = now();

        $attempt = WorkerAssignmentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'booking_id' => $order->booking->id,
            'order_id' => $order->id,
            'attempt_no' => 1,
            'worker_id' => 'WKR-TIMEOUT-01',
            'provider_org_id' => 'ORG-PROVIDER-01',
            'assigned_by_id' => 'PROV-USER-01',
            'status' => 'ASSIGNED',
            'assigned_at' => $now->copy()->subMinutes(35),
            'response_due_at' => $now->copy()->subMinutes(5), // Overdue!
            'version' => 1,
            'created_at' => $now->copy()->subMinutes(35),
            'updated_at' => $now->copy()->subMinutes(35),
        ]);

        BookingActiveAssignment::forceCreate([
            'booking_id' => $order->booking->id,
            'attempt_id' => $attempt->id,
            'worker_id' => 'WKR-TIMEOUT-01',
            'status' => 'ASSIGNED',
            'assigned_at' => $now->copy()->subMinutes(35),
            'created_at' => $now->copy()->subMinutes(35),
            'updated_at' => $now->copy()->subMinutes(35),
        ]);

        // Run SLA timeout command
        $this->artisan('order-jasa:process-timeouts')
            ->assertSuccessful();

        // 1. Attempt transitioned to EXPIRED
        $attempt->refresh();
        $this->assertEquals('EXPIRED', $attempt->status);
        $this->assertEquals('RESPONSE_SLA_30MIN_EXCEEDED', $attempt->expiry_reason);

        // 2. Active assignment deleted so provider can re-dispatch
        $active = BookingActiveAssignment::where('booking_id', $order->booking->id)->first();
        $this->assertNull($active, 'Active assignment must be cleared on SLA timeout');

        // 3. Order reverted to PAID_WAITING_DISPATCH
        $order->refresh();
        $this->assertEquals('PAID_WAITING_DISPATCH', $order->status);
        $this->assertEquals('WORKER_ASSIGNMENT_PENDING', $order->phase);

        // 4. Verify timeline event
        $event = $order->events()->where('event_type', 'WORKER_ASSIGNMENT_EXPIRED')->first();
        $this->assertNotNull($event);
        $this->assertEquals('ASSIGNED_WAITING_WORKER', $event->from_state);
        $this->assertEquals('PAID_WAITING_DISPATCH', $event->to_state);
    }

    public function test_6h_payment_expiration_marks_obligation_overdue_without_cancelling_physical_order(): void
    {
        $order = $this->createBaseOrder('CUST-SLA-02', 'EXECUTION_IN_PROGRESS');
        $now = now();

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 250000,
            'currency' => 'IDR',
            'state' => 'INVOICE_PENDING',
            'payment_due_at' => $now->copy()->subHours(2), // Overdue by 2 hours
            'created_at' => $now->copy()->subHours(8),
            'updated_at' => $now->copy()->subHours(8),
        ]);

        // Run SLA timeout sweep
        $this->artisan('order-jasa:process-timeouts')
            ->assertSuccessful();

        // Obligation is OVERDUE
        $obligation->refresh();
        $this->assertEquals('OVERDUE', $obligation->state);

        // CRITICAL BUSINESS RULE: Physical order MUST NOT be cancelled!
        $order->refresh();
        $this->assertEquals('EXECUTION_IN_PROGRESS', $order->status);
        $this->assertNull($order->cancelled_at);
    }

    public function test_blocking_operational_issue_prevents_completion_until_resolved_by_admin(): void
    {
        $customerId = 'CUST-SLA-03';
        $order = $this->createBaseOrder($customerId, 'EXECUTION_PAID');
        $now = now();

        ServiceVisit::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'worker_id' => 'WKR-01',
            'status' => 'CLOSED',
            'arrived_at' => $now->copy()->subHours(2),
            'visit_closed_at' => $now->copy()->subHour(),
            'version' => 1,
            'created_at' => $now->copy()->subHours(2),
            'updated_at' => $now->copy()->subHour(),
        ]);

        // Obligation is PAID and verified
        $paymentId = 'PAY-' . Str::ulid();
        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 150000,
            'currency' => 'IDR',
            'state' => 'PAID',
            'paid_at' => $now,
            'active_finance_payment_id' => $paymentId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => $paymentId,
            'reported_status' => 'PAID',
            'amount_due_idr' => 150000,
            'is_current' => true,
            'issued_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Create an OPEN blocking operational issue
        $issue = OperationalIssue::forceCreate([
            'id' => (string) Str::ulid(),
            'issue_no' => 'ISSUE-' . strtoupper(Str::random(6)),
            'order_id' => $order->id,
            'reported_by_role' => 'WORKER',
            'reported_by_id' => 'WKR-01',
            'issue_kind' => 'WORK_QUALITY',
            'status' => 'OPEN',
            'description' => 'Pelanggan komplain pipa rembes',
            'affects_completion' => true,
            'affects_funds' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $headers = $this->customerHeaders($customerId);
        $headers['Idempotency-Key'] = 'idemp-compl-blocked-' . Str::random(12);

        // Attempt completion -> Must be blocked with 422!
        $response = $this->postJson("/api/v1/order-jasa/orders/{$order->id}/complete", [], $headers);
        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);

        $order->refresh();
        $this->assertNotEquals('COMPLETED', $order->status);

        // Now Admin resolves the issue
        $adminHeaders = $this->adminHeaders();
        $adminHeaders['Idempotency-Key'] = 'idemp-resolve-' . Str::random(12);

        $resolveResponse = $this->postJson("/api/v1/order-jasa/admin/issues/{$issue->id}/resolve", [
            'resolution_code' => 'CUSTOMER_SATISFACTION_REPAIRED',
            'resolution_notes' => 'Pipa sudah disambung ulang dan ditest tanpa kebocoran',
        ], $adminHeaders);

        $resolveResponse->assertStatus(200);

        // Now completion succeeds!
        $headers['Idempotency-Key'] = 'idemp-compl-ok-' . Str::random(12);
        $successResponse = $this->postJson("/api/v1/order-jasa/orders/{$order->id}/complete", [], $headers);
        $successResponse->assertStatus(200);

        $order->refresh();
        $this->assertEquals('COMPLETED', $order->status);
    }

    public function test_72h_auto_completion_completes_order_without_dispute(): void
    {
        $order = $this->createBaseOrder('CUST-SLA-04', 'EXECUTION_PAID');
        $now = now();

        $visit = ServiceVisit::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'worker_id' => 'WKR-01',
            'status' => 'VISIT_CLOSED',
            'arrived_at' => $now->copy()->subHours(80),
            'visit_closed_at' => $now->copy()->subHours(75),
            'version' => 1,
            'created_at' => $now->copy()->subHours(80),
            'updated_at' => $now->copy()->subHours(80),
        ]);

        $diagnosis = DiagnosisVersion::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'visit_id' => $visit->id,
            'worker_id' => 'WKR-01',
            'version_no' => 1,
            'status' => 'SUBMITTED',
            'findings' => 'Kapasitor rusak',
            'work_subtotal_idr' => 100000,
            'provider_part_subtotal_idr' => 0,
            'service_total_base_idr' => 100000,
            'submitted_at' => $now->copy()->subHours(79),
            'created_at' => $now->copy()->subHours(79),
            'updated_at' => $now->copy()->subHours(79),
        ]);

        $consent = CustomerConsent::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'diagnosis_version_id' => $diagnosis->id,
            'method' => 'CUSTOMER_REMOTE',
            'decision' => 'APPROVED',
            'recorded_by_type' => 'CUSTOMER',
            'recorded_by_id' => 'CUST-SLA-04',
            'customer_id' => 'CUST-SLA-04',
            'statement_acknowledged' => true,
            'submitted_at' => $now->copy()->subHours(78),
            'created_at' => $now->copy()->subHours(78),
            'updated_at' => $now->copy()->subHours(78),
        ]);

        // Service Execution finished 75 hours ago (exceeding 72h SLA)
        ServiceExecution::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'visit_id' => $visit->id,
            'diagnosis_version_id' => $diagnosis->id,
            'consent_id' => $consent->id,
            'worker_id' => 'WKR-01',
            'status' => 'WORKER_FINISHED',
            'started_at' => $now->copy()->subHours(78),
            'finished_at' => $now->copy()->subHours(75),
            'summary' => 'Selesai diganti',
            'version' => 1,
            'created_at' => $now->copy()->subHours(78),
            'updated_at' => $now->copy()->subHours(75),
        ]);

        // Obligation is PAID and verified
        $paymentId = 'PAY-' . Str::ulid();
        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 100000,
            'currency' => 'IDR',
            'state' => 'PAID',
            'paid_at' => $now->copy()->subHours(75),
            'active_finance_payment_id' => $paymentId,
            'created_at' => $now->copy()->subHours(78),
            'updated_at' => $now->copy()->subHours(75),
        ]);

        ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => $paymentId,
            'reported_status' => 'PAID',
            'amount_due_idr' => 100000,
            'is_current' => true,
            'issued_at' => $now->copy()->subHours(78),
            'created_at' => $now->copy()->subHours(78),
            'updated_at' => $now->copy()->subHours(75),
        ]);

        // Run auto-completion scheduler
        $this->artisan('order-jasa:process-timeouts')
            ->assertSuccessful();

        $order->refresh();
        $this->assertEquals('COMPLETED', $order->status);
        $this->assertEquals('TERMINAL', $order->phase);
        $this->assertNotNull($order->completed_at);

        // Verify timeline event shows SYSTEM auto-completion
        $event = $order->events()->where('event_type', 'ORDER_COMPLETED')->first();
        $this->assertNotNull($event);
        $this->assertEquals('SYSTEM', $event->actor_type);
        $this->assertTrue((bool) ($event->metadata_json['auto_completed'] ?? false));
    }

    public function test_120h_escrow_holding_period_releases_matured_funds_to_provider(): void
    {
        $order = $this->createBaseOrder('CUST-SLA-05', 'COMPLETED');
        $now = now();

        $entitlement = ServiceFinanceEntitlementRef::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'SERVICE_EXECUTION',
            'finance_entitlement_id' => 'ENT-' . Str::ulid(),
            'finance_event_id' => 'EVT-ESCROW-' . Str::ulid(),
            'hold_status' => 'HELD',
            'release_eligible_at' => $now->copy()->subHour(), // 120 hours have passed!
            'net_provider_idr' => 200000,
            'payment_allocation_reference' => $order->order_no,
            'created_at' => $now->copy()->subDays(6),
            'updated_at' => $now->copy()->subDays(6),
        ]);

        // Run sweep command
        $this->artisan('order-jasa:process-timeouts')
            ->assertSuccessful();

        // Entitlement hold matures to AVAILABLE in S-Pay
        $entitlement->refresh();
        $this->assertEquals('AVAILABLE', $entitlement->hold_status);
    }

    public function test_6h_unpaid_diagnosis_payment_cancels_order_with_diagnosis_payment_expired(): void
    {
        $order = $this->createBaseOrder('CUST-SLA-DIAG', 'PENDING_DIAGNOSIS_PAYMENT');
        $now = now();

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'purpose' => 'DIAGNOSIS',
            'principal_idr' => 50000,
            'currency' => 'IDR',
            'state' => 'INVOICE_PENDING',
            'payment_due_at' => $now->copy()->subHour(), // 6 hours expired!
            'created_at' => $now->copy()->subHours(7),
            'updated_at' => $now->copy()->subHours(7),
        ]);

        $attempt = \App\Models\ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => 'PAY-DIAG-EXPIRED-01',
            'reported_status' => 'PENDING',
            'amount_due_idr' => 50000,
            'issued_at' => $now->copy()->subHours(7),
            'expires_at' => $now->copy()->subHour(),
            'created_at' => $now->copy()->subHours(7),
            'updated_at' => $now->copy()->subHours(7),
        ]);

        $this->artisan('order-jasa:process-timeouts')
            ->assertSuccessful();

        // Obligation is EXPIRED
        $obligation->refresh();
        $this->assertEquals('EXPIRED', $obligation->state);

        // Attempt is EXPIRED
        $attempt->refresh();
        $this->assertEquals('EXPIRED', $attempt->reported_status);

        // Order is CANCELLED with DIAGNOSIS_PAYMENT_EXPIRED
        $order->refresh();
        $this->assertEquals('CANCELLED', $order->status);
        $this->assertEquals('TERMINAL', $order->phase);
        $this->assertEquals('DIAGNOSIS_PAYMENT_EXPIRED', $order->cancel_reason_code);
        $this->assertNotNull($order->cancelled_at);
    }
}
