<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ServiceBooking;
use App\Models\ServiceOrder;
use App\Models\WorkerAssignmentAttempt;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthorizationAndIdorProtectionTest extends TestCase
{
    public function test_cross_customer_idor_is_prevented(): void
    {
        $orderId = (string) Str::ulid();
        $legitimateCustomerId = 'CUST-OWNER-01';
        $attackerCustomerId = 'CUST-ATTACKER-02';

        // Seed an order belonging to legitimate customer
        ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'JSA-IDOR-' . Str::random(6),
            'customer_id' => $legitimateCustomerId,
            'provider_org_id' => 'ORG-001',
            'service_offering_id' => 'srv-01',
            'service_snapshot' => ['title' => 'Service Test'],
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'complaint_text' => 'AC bermasalah',
            'status' => 'CONFIRMED',
            'phase' => 'WORKER_ASSIGNMENT_PENDING',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Attacker attempts to view legitimate customer's order
        $attackerHeaders = $this->customerHeaders($attackerCustomerId);
        $response = $this->getJson("/api/v1/order-jasa/orders/{$orderId}", $attackerHeaders);

        // MUST be 404 Not Found to prevent leaking existence or details
        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_NOT_FOUND',
                ],
            ]);

        // Legitimate customer CAN view their own order
        $legitHeaders = $this->customerHeaders($legitimateCustomerId);
        $legitResponse = $this->getJson("/api/v1/order-jasa/orders/{$orderId}", $legitHeaders);
        $legitResponse->assertStatus(200);
    }

    public function test_cross_provider_idor_is_prevented(): void
    {
        $orderId = (string) Str::ulid();
        $providerAOrg = 'ORG-PROVIDER-ALPHA';
        $providerBOrg = 'ORG-PROVIDER-BETA';

        ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'JSA-IDOR-' . Str::random(6),
            'customer_id' => 'CUST-001',
            'provider_org_id' => $providerAOrg,
            'service_offering_id' => 'srv-01',
            'service_snapshot' => ['title' => 'Service Test'],
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'complaint_text' => 'Service test',
            'status' => 'CONFIRMED',
            'phase' => 'WORKER_ASSIGNMENT_PENDING',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Provider B attempts to view Provider A's order
        $providerBHeaders = $this->providerHeaders('USER-PROV-B', $providerBOrg);
        $response = $this->getJson("/api/v1/order-jasa/provider/orders/{$orderId}", $providerBHeaders);

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_NOT_FOUND',
                ],
            ]);

        // Provider A CAN view their own order
        $providerAHeaders = $this->providerHeaders('USER-PROV-A', $providerAOrg);
        $legitResponse = $this->getJson("/api/v1/order-jasa/provider/orders/{$orderId}", $providerAHeaders);
        $legitResponse->assertStatus(200);
    }

    public function test_worker_other_task_idor_is_prevented(): void
    {
        $orderId = (string) Str::ulid();
        $bookingId = (string) Str::ulid();
        $assignmentId = (string) Str::ulid();
        $assignedWorker = 'WORKER-ALICE';
        $attackerWorker = 'WORKER-BOB';

        ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'JSA-IDOR-' . Str::random(6),
            'customer_id' => 'CUST-001',
            'provider_org_id' => 'ORG-001',
            'service_offering_id' => 'srv-01',
            'service_snapshot' => ['title' => 'Service Test'],
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'complaint_text' => 'Test',
            'status' => 'CONFIRMED',
            'phase' => 'WORKER_ASSIGNMENT_PENDING',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        ServiceBooking::forceCreate([
            'id' => $bookingId,
            'order_id' => $orderId,
            'customer_id' => 'CUST-001',
            'provider_org_id' => 'ORG-001',
            'scheduled_start_at' => now(),
            'scheduled_end_at' => now()->addHour(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        WorkerAssignmentAttempt::forceCreate([
            'id' => $assignmentId,
            'booking_id' => $bookingId,
            'order_id' => $orderId,
            'attempt_no' => 1,
            'worker_id' => $assignedWorker,
            'provider_org_id' => 'ORG-001',
            'status' => 'ASSIGNED',
            'assigned_by_id' => 'ADMIN',
            'assigned_at' => now(),
            'response_due_at' => now()->addMinutes(30),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Attacker Worker Bob attempts to view Worker Alice's assignment
        $bobHeaders = $this->workerHeaders($attackerWorker, 'ORG-001');
        $response = $this->getJson("/api/v1/order-jasa/worker/tasks/{$assignmentId}", $bobHeaders);

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_TASK_NOT_FOUND',
                ],
            ]);

        // Worker Alice CAN view her assignment
        $aliceHeaders = $this->workerHeaders($assignedWorker, 'ORG-001');
        $legitResponse = $this->getJson("/api/v1/order-jasa/worker/tasks/{$assignmentId}", $aliceHeaders);
        $legitResponse->assertStatus(200);
    }

    public function test_provider_with_inactive_membership_is_rejected(): void
    {
        $headers = $this->providerHeaders('PROV-USER-01', 'ORG-001');
        $headers['X-Actor-Membership-Active'] = 'false';

        $response = $this->getJson('/api/v1/order-jasa/provider/orders', $headers);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_PROVIDER_MEMBERSHIP_INACTIVE',
                ],
            ]);
    }

    public function test_provider_with_inactive_organization_is_rejected(): void
    {
        $headers = $this->providerHeaders('PROV-USER-01', 'ORG-001');
        $headers['X-Actor-Org-Active'] = 'false';

        $response = $this->getJson('/api/v1/order-jasa/provider/orders', $headers);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_PROVIDER_ORG_INACTIVE',
                ],
            ]);
    }

    public function test_forged_unknown_role_is_rejected(): void
    {
        $headers = $this->actorHeaders('USER-01', 'MALICIOUS_ROLE_INJECTION');

        $response = $this->getJson('/api/v1/order-jasa/orders', $headers);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_FORBIDDEN_ROLE',
                ],
            ]);
    }

    public function test_admin_role_can_view_across_orders(): void
    {
        $orderId = (string) Str::ulid();

        ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'JSA-ADMIN-' . Str::random(6),
            'customer_id' => 'CUST-ANY',
            'provider_org_id' => 'ORG-ANY',
            'service_offering_id' => 'srv-01',
            'service_snapshot' => ['title' => 'Admin test service'],
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'complaint_text' => 'Admin test',
            'status' => 'CONFIRMED',
            'phase' => 'WORKER_ASSIGNMENT_PENDING',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $adminHeaders = $this->adminHeaders('ADMIN-001');
        $response = $this->getJson("/api/v1/order-jasa/admin/orders/{$orderId}", $adminHeaders);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $orderId,
                ],
            ]);
    }

    public function test_in_person_consent_by_unassigned_worker_rejected_403(): void
    {
        $orderId = (string) Str::ulid();
        $assignedWorkerId = 'WORKER-ASSIGNED-01';
        $attackerWorkerId = 'WORKER-ATTACKER-02';

        $order = ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'SO-CONSENT-' . Str::random(6),
            'customer_id' => 'CUST-01',
            'provider_org_id' => 'ORG-01',
            'service_offering_id' => 'srv-01',
            'service_snapshot' => ['title' => 'Test'],
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'complaint_text' => 'AC rusak',
            'status' => 'DIAGNOSIS_SUBMITTED',
            'phase' => 'CUSTOMER_CONSENT_PENDING',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $visit = \App\Models\ServiceVisit::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'worker_id' => $assignedWorkerId,
            'status' => 'IN_PROGRESS',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \App\Models\DiagnosisVersion::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'visit_id' => $visit->id,
            'worker_id' => $assignedWorkerId,
            'version_no' => 1,
            'findings' => 'Kapasitor rusak',
            'work_subtotal_idr' => 100000,
            'provider_part_subtotal_idr' => 0,
            'status' => 'SUBMITTED',
            'submitted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Attacker worker attempts to record in-person consent
        $attackerHeaders = $this->workerHeaders($attackerWorkerId);
        $attackerHeaders['Idempotency-Key'] = 'idemp-consent-atk-01';
        $res = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/consent", [
            'method' => 'WORKER_RECORDED_IN_PERSON',
            'decision' => 'APPROVED',
            'customer_present_reported' => true,
            'statement_acknowledged' => true,
        ], $attackerHeaders);

        $res->assertStatus(403);

        // Assigned worker CAN record in-person consent
        $assignedHeaders = $this->workerHeaders($assignedWorkerId);
        $assignedHeaders['Idempotency-Key'] = 'idemp-consent-asg-01';
        $res2 = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/consent", [
            'method' => 'WORKER_RECORDED_IN_PERSON',
            'decision' => 'APPROVED',
            'customer_present_reported' => true,
            'statement_acknowledged' => true,
        ], $assignedHeaders);

        $res2->assertStatus(200);
    }

    public function test_customer_remote_consent_timeout_rejected_422(): void
    {
        $orderId = (string) Str::ulid();
        $customerId = 'CUST-TIMEOUT-01';

        $order = ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'SO-TIMEOUT-' . Str::random(6),
            'customer_id' => $customerId,
            'provider_org_id' => 'ORG-01',
            'service_offering_id' => 'srv-01',
            'service_snapshot' => ['title' => 'Test'],
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'complaint_text' => 'AC rusak',
            'status' => 'DIAGNOSIS_SUBMITTED',
            'phase' => 'CUSTOMER_CONSENT_PENDING',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $visit = \App\Models\ServiceVisit::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'worker_id' => 'WORKER-01',
            'status' => 'IN_PROGRESS',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \App\Models\DiagnosisVersion::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'visit_id' => $visit->id,
            'worker_id' => 'WORKER-01',
            'version_no' => 1,
            'findings' => 'Kapasitor rusak',
            'work_subtotal_idr' => 100000,
            'provider_part_subtotal_idr' => 0,
            'status' => 'SUBMITTED',
            'submitted_at' => now()->subMinutes(35),
            'remote_response_due_at' => now()->subMinutes(5), // 30m expired!
            'created_at' => now()->subMinutes(35),
            'updated_at' => now()->subMinutes(35),
        ]);

        $custHeaders = $this->customerHeaders($customerId);
        $custHeaders['Idempotency-Key'] = 'idemp-consent-tmo-01';
        $res = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/consent", [
            'method' => 'CUSTOMER_REMOTE',
            'decision' => 'APPROVED',
            'statement_acknowledged' => true,
        ], $custHeaders);

        $res->assertStatus(422);
    }

    public function test_customer_consent_rejection_cancels_order_retaining_diagnosis_fee(): void
    {
        $orderId = (string) Str::ulid();
        $customerId = 'CUST-REJECT-01';

        $order = ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'SO-REJECT-' . Str::random(6),
            'customer_id' => $customerId,
            'provider_org_id' => 'ORG-01',
            'service_offering_id' => 'srv-01',
            'service_snapshot' => ['title' => 'Test'],
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'complaint_text' => 'AC rusak',
            'status' => 'DIAGNOSIS_SUBMITTED',
            'phase' => 'CUSTOMER_CONSENT_PENDING',
            'diagnosis_fee_idr' => 50000,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $diagObligation = \App\Models\ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'purpose' => 'DIAGNOSIS',
            'principal_idr' => 50000,
            'currency' => 'IDR',
            'state' => 'PAID',
            'paid_at' => now()->subHours(1),
            'created_at' => now()->subHours(1),
            'updated_at' => now()->subHours(1),
        ]);

        $visit = \App\Models\ServiceVisit::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'worker_id' => 'WORKER-01',
            'status' => 'IN_PROGRESS',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \App\Models\DiagnosisVersion::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'visit_id' => $visit->id,
            'worker_id' => 'WORKER-01',
            'version_no' => 1,
            'findings' => 'Kapasitor rusak',
            'work_subtotal_idr' => 100000,
            'provider_part_subtotal_idr' => 0,
            'status' => 'SUBMITTED',
            'submitted_at' => now(),
            'remote_response_due_at' => now()->addMinutes(30),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $rejHeaders = $this->customerHeaders($customerId);
        $rejHeaders['Idempotency-Key'] = 'idemp-consent-rej-01';
        $res = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/consent", [
            'method' => 'CUSTOMER_REMOTE',
            'decision' => 'REJECTED',
            'statement_acknowledged' => true,
        ], $rejHeaders);

        $res->assertStatus(200);

        // Order is CANCELLED with CUSTOMER_REJECTED_DIAGNOSIS
        $order->refresh();
        $this->assertEquals('CANCELLED', $order->status);
        $this->assertEquals('TERMINAL', $order->phase);
        $this->assertEquals('CUSTOMER_REJECTED_DIAGNOSIS', $order->cancel_reason_code);

        // Diagnosis fee obligation REMAINS PAID (retained for provider)
        $diagObligation->refresh();
        $this->assertEquals('PAID', $diagObligation->state);
    }

    public function test_worker_close_visit_requires_execution_paid_or_dispute(): void
    {
        $orderId = (string) Str::ulid();
        $workerId = 'WORKER-VISIT-01';
        $taskId = (string) Str::ulid();

        $order = ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'SO-VISIT-' . Str::random(6),
            'customer_id' => 'CUST-01',
            'provider_org_id' => 'ORG-01',
            'service_offering_id' => 'srv-01',
            'service_snapshot' => ['title' => 'Test'],
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'complaint_text' => 'AC rusak',
            'status' => 'WORKER_FINISHED',
            'phase' => 'PAYMENT_PENDING',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $booking = ServiceBooking::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'customer_id' => 'CUST-01',
            'provider_org_id' => 'ORG-01',
            'scheduled_start_at' => now()->addDay(),
            'scheduled_end_at' => now()->addDay()->addHours(2),
            'status' => 'CONFIRMED',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $attempt = WorkerAssignmentAttempt::forceCreate([
            'id' => $taskId,
            'booking_id' => $booking->id,
            'order_id' => $orderId,
            'attempt_no' => 1,
            'worker_id' => $workerId,
            'provider_org_id' => 'ORG-01',
            'assigned_by_id' => 'PROV-01',
            'status' => 'ACCEPTED',
            'assigned_at' => now(),
            'response_due_at' => now()->addMinutes(30),
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \App\Models\ServiceVisit::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'worker_id' => $workerId,
            'status' => 'IN_PROGRESS',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $execObligation = \App\Models\ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 150000,
            'currency' => 'IDR',
            'state' => 'INVOICE_PENDING', // Unpaid!
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Attempt to close visit while unpaid without dispute -> rejected 422
        $workerHeaders = $this->workerHeaders($workerId);
        $workerHeaders['Idempotency-Key'] = 'idemp-close-unpaid-01';
        $res = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit/close", [], $workerHeaders);
        $res->assertStatus(422);

        // Once paid, close visit succeeds
        $execObligation->forceFill(['state' => 'PAID'])->save();
        $workerHeaders['Idempotency-Key'] = 'idemp-close-paid-02';
        $res2 = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit/close", [], $workerHeaders);
        $res2->assertStatus(200);
    }

    public function test_operational_issue_by_unauthorized_actors_rejected_403(): void
    {
        $orderId = (string) Str::ulid();
        $legitCustId = 'CUST-LEGIT-01';
        $attackerCustId = 'CUST-ATTACKER-99';

        ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'SO-ISSUE-' . Str::random(6),
            'customer_id' => $legitCustId,
            'provider_org_id' => 'ORG-01',
            'service_offering_id' => 'srv-01',
            'service_snapshot' => ['title' => 'Test'],
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'complaint_text' => 'AC rusak',
            'status' => 'EXECUTION_IN_PROGRESS',
            'phase' => 'EXECUTION_IN_PROGRESS',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Random customer reports dispute on another customer's order -> 403
        $attackerHeaders = $this->customerHeaders($attackerCustId);
        $attackerHeaders['Idempotency-Key'] = 'idemp-issue-attack-01';
        $res = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/issues", [
            'issue_kind' => 'DISPUTE_DAMAGE',
            'description' => 'Kerusakan pipa AC',
        ], $attackerHeaders);
        $res->assertStatus(403);

        // Legitimate customer CAN report dispute
        $legitHeaders = $this->customerHeaders($legitCustId);
        $legitHeaders['Idempotency-Key'] = 'idemp-issue-legit-01';
        $res2 = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/issues", [
            'issue_kind' => 'DISPUTE_DAMAGE',
            'description' => 'Kerusakan pipa AC',
        ], $legitHeaders);
        $res2->assertStatus(201);
    }

    public function test_internal_order_eligibility_projection_returns_lean_snapshot(): void
    {
        $orderId = (string) Str::ulid();

        ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'SO-PROJ-' . Str::random(6),
            'customer_id' => 'CUST-PROJ-01',
            'provider_org_id' => 'ORG-PROJ-01',
            'service_offering_id' => 'srv-proj-01',
            'service_snapshot' => [
                'id' => 'srv-proj-01',
                'title' => 'Servis AC Split',
                'name' => 'Servis AC Split',
                'warranty_config' => ['durationDays' => 30],
            ],
            'recipient_snapshot' => ['name' => 'Siti Aminah'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'complaint_text' => 'AC kurang dingin',
            'status' => 'COMPLETED',
            'phase' => 'TERMINAL',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $res = $this->getJson(
            "/internal/v1/order-jasa/orders/{$orderId}?projection=eligibility",
            $this->internalHeaders()
        );

        $res->assertStatus(200)
            ->assertJsonPath('data.id', $orderId)
            ->assertJsonPath('data.customer_id', 'CUST-PROJ-01')
            ->assertJsonPath('data.provider_org_id', 'ORG-PROJ-01')
            ->assertJsonPath('data.service_offering_id', 'srv-proj-01')
            ->assertJsonPath('data.service_snapshot.id', 'srv-proj-01')
            ->assertJsonPath('data.service_snapshot.title', 'Servis AC Split')
            ->assertJsonPath('data.service_snapshot.name', 'Servis AC Split')
            ->assertJsonPath('data.customer_name', 'Siti Aminah')
            ->assertJsonPath('data.status', 'COMPLETED')
            ->assertJsonMissingPath('data.service_snapshot.warranty_config')
            ->assertJsonMissingPath('data.booking')
            ->assertJsonMissingPath('data.payment_obligations');
    }
}
