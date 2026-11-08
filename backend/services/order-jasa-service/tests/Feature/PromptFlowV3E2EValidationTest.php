<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CustomerConsent;
use App\Models\DiagnosisVersion;
use App\Models\OperationalIssue;
use App\Models\OrderAuditLog;
use App\Models\ServiceExecution;
use App\Models\ServiceFinanceEntitlementRef;
use App\Models\ServiceOrder;
use App\Models\ServicePaymentAttempt;
use App\Models\ServicePaymentObligation;
use App\Models\ServiceVisit;
use App\Models\WorkerAssignmentAttempt;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * PromptFlowV3E2EValidationTest
 *
 * Comprehensive End-to-End Validation covering Section 39, Section 40, and Section 41
 * of SERVIO Phase 05B Master Implementation Prompt:
 * DIAGNOSIS -> PERSETUJUAN HARGA -> PENGERJAAN -> PEMBAYARAN -> WORKER CLOSE VISIT -> CUSTOMER CONFIRM -> COMPLETED
 */
class PromptFlowV3E2EValidationTest extends TestCase
{
    protected function internalHeaders(): array
    {
        return [
            'X-Internal-Service-Key' => $this->internalServiceKey,
            'Accept' => 'application/json',
        ];
    }

    /**
     * SECTION 39: REMOTE CUSTOMER HAPPY PATH
     */
    public function test_section_39_remote_customer_happy_path_end_to_end(): void
    {
        $customerId = 'CUST-REMOTE-V3';
        $providerOrgId = 'PROV-V3-TECH';
        $workerId = 'WRK-V3-01';

        // 1. Customer creates Booking with Diagnosis Fee
        $bookHeaders = $this->customerHeaders($customerId);
        $bookHeaders['Idempotency-Key'] = 'idemp-remote-book-' . Str::random(8);

        $bookRes = $this->postJson('/api/v1/order-jasa/orders', [
            'service_offering_id' => 'OFF-AC-01',
            'address_id' => 'ADDR-CUST-01',
            'scheduled_start_at' => now()->addDay()->format('Y-m-d 10:00:00'),
            'complaint_text' => 'AC tidak dingin, hembusan angin lemah berbau lembap.',
            'symptoms_json' => ['AC_NOT_COOLING', 'FOUL_SMELL'],
        ], $bookHeaders);

        $bookRes->assertStatus(201);
        $orderId = $bookRes->json('data.id');
        $this->assertNotNull($orderId);

        $order = ServiceOrder::find($orderId);
        $this->assertEquals('PENDING_DIAGNOSIS_PAYMENT', $order->status);

        // 2. Customer pays Diagnosis Fee
        $diagObligation = ServicePaymentObligation::where('order_id', $orderId)->where('purpose', 'DIAGNOSIS')->first();
        $this->assertNotNull($diagObligation);
        $diagAttempt = $diagObligation->attempts()->first();
        $this->assertNotNull($diagAttempt);

        $diagWebhook = [
            'event_id' => 'EVT-DIAG-REMOTE-' . Str::random(8),
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'payment_id' => $diagAttempt->finance_payment_id,
                'amount_idr' => $diagAttempt->amount_due_idr,
                'status' => 'PAID',
            ],
        ];

        $diagPayRes = $this->postJson('/internal/v1/order-jasa/finance-events', $diagWebhook, $this->internalHeaders());
        $diagPayRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('PAID_WAITING_DISPATCH', $order->status);
        $providerOrgId = $order->provider_org_id;

        // 3. Provider assigns Worker
        $assignHeaders = $this->providerHeaders('PROV-USER-01', $providerOrgId);
        $assignHeaders['Idempotency-Key'] = 'idemp-remote-assign-' . Str::random(8);

        $assignRes = $this->postJson("/api/v1/order-jasa/provider/orders/{$orderId}/assign", [
            'worker_id' => $workerId,
        ], $assignHeaders);
        $assignRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('ASSIGNED_WAITING_WORKER', $order->status);

        $attempt = WorkerAssignmentAttempt::where('order_id', $orderId)->first();
        $this->assertNotNull($attempt);
        $taskId = $attempt->id;

        // 4. Worker accepts task
        $wHeaders = $this->workerHeaders($workerId);
        $wHeaders['Idempotency-Key'] = 'idemp-remote-accept-' . Str::random(8);

        $acceptRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/respond", [
            'decision' => 'ACCEPT',
        ], $wHeaders);
        $acceptRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('WORKER_ACCEPTED', $order->status);

        // 5. Worker starts trip (OTW)
        $otwHeaders = $this->workerHeaders($workerId);
        $otwHeaders['Idempotency-Key'] = 'idemp-remote-otw-' . Str::random(8);

        $otwRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", [
            'action' => 'OTW',
        ], $otwHeaders);
        $otwRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('WORKER_ON_THE_WAY', $order->status);

        // 6. Worker arrives at customer location
        $arrivedHeaders = $this->workerHeaders($workerId);
        $arrivedHeaders['Idempotency-Key'] = 'idemp-remote-arr-' . Str::random(8);

        $arrRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", [
            'action' => 'ARRIVED',
        ], $arrivedHeaders);
        $arrRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('WORKER_ARRIVED', $order->status);

        // 7. Worker starts diagnosis
        $diagStartHeaders = $this->workerHeaders($workerId);
        $diagStartHeaders['Idempotency-Key'] = 'idemp-remote-diagstart-' . Str::random(8);

        $diagStartRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", [
            'action' => 'START_DIAGNOSIS',
        ], $diagStartHeaders);
        $diagStartRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('DIAGNOSIS_IN_PROGRESS', $order->status);

        // 8. Worker submits diagnosis form with work items & spareparts
        $submitDiagHeaders = $this->workerHeaders($workerId);
        $submitDiagHeaders['Idempotency-Key'] = 'idemp-remote-subdiag-' . Str::random(8);

        $diagPayload = [
            'findings' => 'Filter kotor berdebu dan kapasitor blower melemah.',
            'suspected_cause' => 'Jarang diservis berkala 6 bulan terakhir.',
            'recommended_actions' => 'Cuci kimia evaporator, kuras talang, dan ganti kapasitor 2uF.',
            'work_items' => [
                [
                    'name' => 'Cuci Kimia & Servis Besar AC',
                    'quantity' => 1,
                    'unit_price_idr' => 120000,
                ],
            ],
            'part_items' => [
                [
                    'part_name' => 'Kapasitor Fan Blower 2uF',
                    'source' => 'PROVIDER_SUPPLIED',
                    'quantity' => 1,
                    'unit_price_idr' => 65000,
                ],
            ],
        ];

        $submitDiagRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/diagnosis", $diagPayload, $submitDiagHeaders);
        $submitDiagRes->assertStatus(201);

        $order->refresh();
        $this->assertEquals('DIAGNOSIS_SUBMITTED', $order->status);

        // 9. Customer approves remote consent -> transitions strictly to PRICE_APPROVED
        $consentHeaders = $this->customerHeaders($customerId);
        $consentHeaders['Idempotency-Key'] = 'idemp-remote-consent-' . Str::random(8);

        $consentRes = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/consent", [
            'method' => 'CUSTOMER_REMOTE',
            'decision' => 'APPROVED',
            'statement_acknowledged' => true,
        ], $consentHeaders);
        $consentRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('PRICE_APPROVED', $order->status);

        // 10. Worker clicks "Lanjutkan Pengerjaan" -> transitions to EXECUTION_IN_PROGRESS
        $startExecHeaders = $this->workerHeaders($workerId);
        $startExecHeaders['Idempotency-Key'] = 'idemp-remote-startexec-' . Str::random(8);

        $startExecRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", [
            'action' => 'START_EXECUTION',
        ], $startExecHeaders);
        $startExecRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('EXECUTION_IN_PROGRESS', $order->status);

        $execution = ServiceExecution::where('order_id', $orderId)->first();
        $this->assertNotNull($execution);
        $this->assertEquals('IN_PROGRESS', $execution->status);

        // 11. Worker finishes physical execution with before/after photos and test results
        $finishHeaders = $this->workerHeaders($workerId);
        $finishHeaders['Idempotency-Key'] = 'idemp-remote-finish-' . Str::random(8);

        $finishPayload = [
            'summary' => 'Evaporator bersih, talang bebas sumbatan, kapasitor terpasang sempurna.',
            'test_result' => 'Suhu keluar 17.5C, amper 2.1A normal, aliran lancar.',
            'evidence' => [
                ['evidence_type' => 'BEFORE', 'media_reference' => 'https://servio.id/img/before1.jpg'],
                ['evidence_type' => 'AFTER', 'media_reference' => 'https://servio.id/img/after1.jpg'],
                ['evidence_type' => 'TEST', 'media_reference' => 'https://servio.id/img/test1.jpg'],
            ],
        ];

        $finishRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/execution/finish", $finishPayload, $finishHeaders);
        $finishRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('WORKER_FINISHED', $order->status);

        // 12. Execution billing invoice verified
        $execObligation = ServicePaymentObligation::where('order_id', $orderId)->where('purpose', 'SERVICE_EXECUTION')->first();
        $this->assertNotNull($execObligation);
        $this->assertEquals('INVOICE_PENDING', $execObligation->state);
        $this->assertEquals(185000, $execObligation->principal_idr); // 120k + 65k

        $execAttempt = $execObligation->attempts()->first();
        $this->assertNotNull($execAttempt);

        // 13. Finance confirms payment PAID
        $payWebhook = [
            'event_id' => 'EVT-PAY-EXEC-REMOTE-' . Str::random(8),
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'payment_id' => $execAttempt->finance_payment_id,
                'amount_idr' => 185000,
                'status' => 'PAID',
            ],
        ];

        $payRes = $this->postJson('/internal/v1/order-jasa/finance-events', $payWebhook, $this->internalHeaders());
        $payRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('EXECUTION_PAID', $order->status);

        // 14. Worker closes visit (Akhiri Kunjungan) -> status VISIT_CLOSED
        $closeHeaders = $this->workerHeaders($workerId);
        $closeHeaders['Idempotency-Key'] = 'idemp-remote-close-' . Str::random(8);

        $closeRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit/close", [
            'reason' => 'NORMAL_COMPLETION',
        ], $closeHeaders);
        $closeRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('VISIT_CLOSED', $order->status);

        $visit = ServiceVisit::where('order_id', $orderId)->first();
        $this->assertEquals('CLOSED', $visit->status);
        $this->assertNotNull($visit->visit_closed_at);

        // 15. Customer completes order (Pekerjaan Telah Selesai) -> COMPLETED
        $compHeaders = $this->customerHeaders($customerId);
        $compHeaders['Idempotency-Key'] = 'idemp-remote-comp-' . Str::random(8);

        $compRes = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/complete", [], $compHeaders);
        $compRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('COMPLETED', $order->status);
        $this->assertNotNull($order->completed_at);

        // 16. Verify Finance 120-hour escrow hold
        $entitlement = ServiceFinanceEntitlementRef::where('order_id', $orderId)->first();
        $this->assertNotNull($entitlement);
        $this->assertEquals('HELD', $entitlement->hold_status);
        $this->assertEquals(185000, $entitlement->net_provider_idr);
        $this->assertEquals(
            $order->completed_at->addHours(120)->format('Y-m-d H:i'),
            $entitlement->release_eligible_at->format('Y-m-d H:i')
        );
    }

    /**
     * SECTION 40: ONSITE CUSTOMER HAPPY PATH
     */
    public function test_section_40_onsite_customer_happy_path_end_to_end(): void
    {
        $customerId = 'CUST-ONSITE-V3';
        $providerOrgId = 'PROV-V3-ONSITE';
        $workerId = 'WRK-V3-ONSITE';
        $now = now();

        // 1. Create Free Diagnosis Booking
        $order = ServiceOrder::forceCreate([
            'id' => (string) Str::ulid(),
            'order_no' => 'SRV-' . strtoupper(Str::random(10)),
            'customer_id' => $customerId,
            'provider_org_id' => $providerOrgId,
            'service_offering_id' => 'OFF-KULKAS-01',
            'service_snapshot' => ['title' => 'Servis Kulkas 2 Pintu'],
            'recipient_snapshot' => ['recipient_name' => 'Bapak Onsite', 'phone' => '0812999888'],
            'address_snapshot' => ['fullAddress' => 'Jl. Mawar Melati No. 5', 'city' => 'Jakarta'],
            'complaint_text' => 'Freezer dingin tapi bawah tidak dingin.',
            'diagnosis_fee_idr' => 0,
            'status' => 'PAID_WAITING_DISPATCH',
            'phase' => 'WORKER_ASSIGNMENT_PENDING',
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $orderId = $order->id;

        $booking = \App\Models\ServiceBooking::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'customer_id' => $customerId,
            'provider_org_id' => $providerOrgId,
            'scheduled_start_at' => $now,
            'scheduled_end_at' => $now->copy()->addHours(2),
            'timezone' => 'Asia/Jakarta',
            'status' => 'CONFIRMED',
            'schedule_revision' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // 2. Assign Worker & Accept
        $attempt = WorkerAssignmentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'booking_id' => $booking->id,
            'provider_org_id' => $providerOrgId,
            'assigned_by_id' => 'PROV-USER-01',
            'worker_id' => $workerId,
            'attempt_no' => 1,
            'status' => 'ACCEPTED',
            'assigned_at' => $now,
            'response_due_at' => $now->copy()->addMinutes(30),
            'accepted_at' => $now,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $taskId = $attempt->id;

        \App\Models\BookingActiveAssignment::forceCreate([
            'booking_id' => $booking->id,
            'attempt_id' => $taskId,
            'worker_id' => $workerId,
            'status' => 'ACCEPTED',
            'assigned_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $visit = ServiceVisit::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'assignment_id' => $taskId,
            'worker_id' => $workerId,
            'status' => 'ARRIVED',
            'arrived_at' => $now,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $order->forceFill(['status' => 'WORKER_ARRIVED'])->save();

        // 3. Worker submits Diagnosis
        $submitDiagHeaders = $this->workerHeaders($workerId);
        $submitDiagHeaders['Idempotency-Key'] = 'idemp-onsite-diag-' . Str::random(8);

        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/diagnosis", [
            'findings' => 'Defrost thermostat putus dan fan motor macet.',
            'work_items' => [
                ['name' => 'Penggantian Defrost Kit & Fan', 'quantity' => 1, 'unit_price_idr' => 200000],
            ],
        ], $submitDiagHeaders)->assertStatus(201);

        $order->refresh();
        $this->assertEquals('DIAGNOSIS_SUBMITTED', $order->status);

        // 4. Worker records In-Person Consent (Terima Pengajuan - Customer di Lokasi)
        $onsiteConsentHeaders = $this->workerHeaders($workerId);
        $onsiteConsentHeaders['Idempotency-Key'] = 'idemp-onsite-consent-' . Str::random(8);

        $consentRes = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/consent", [
            'method' => 'WORKER_RECORDED_IN_PERSON',
            'decision' => 'APPROVED',
            'customer_present_reported' => true,
            'statement_acknowledged' => true,
        ], $onsiteConsentHeaders);
        $consentRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('PRICE_APPROVED', $order->status);

        $consent = CustomerConsent::where('order_id', $orderId)->first();
        $this->assertEquals('WORKER_RECORDED_IN_PERSON', $consent->method);
        $this->assertTrue((bool) $consent->customer_present_reported);

        // 5. Worker starts execution
        $startExecHeaders = $this->workerHeaders($workerId);
        $startExecHeaders['Idempotency-Key'] = 'idemp-onsite-start-' . Str::random(8);
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", [
            'action' => 'START_EXECUTION',
        ], $startExecHeaders)->assertStatus(200);

        $order->refresh();
        $this->assertEquals('EXECUTION_IN_PROGRESS', $order->status);

        // 6. Finish execution
        $finishHeaders = $this->workerHeaders($workerId);
        $finishHeaders['Idempotency-Key'] = 'idemp-onsite-finish-' . Str::random(8);
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/execution/finish", [
            'summary' => 'Defrost diganti baru, sirkulasi udara dingin lancar ke bawah.',
            'test_result' => 'Ruang bawah mencapai 4C dalam 30 menit.',
            'evidence' => [
                ['evidence_type' => 'BEFORE', 'media_reference' => 'https://servio.id/before.jpg'],
                ['evidence_type' => 'AFTER', 'media_reference' => 'https://servio.id/after.jpg'],
            ],
        ], $finishHeaders)->assertStatus(200);

        $order->refresh();
        $this->assertEquals('WORKER_FINISHED', $order->status);

        // 7. Finance confirms payment
        $execObligation = ServicePaymentObligation::where('order_id', $orderId)->where('purpose', 'SERVICE_EXECUTION')->first();
        $execAttempt = $execObligation->attempts()->first();

        $this->postJson('/internal/v1/order-jasa/finance-events', [
            'event_id' => 'EVT-PAY-ONSITE-' . Str::random(8),
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'payment_id' => $execAttempt->finance_payment_id,
                'amount_idr' => 200000,
                'status' => 'PAID',
            ],
        ], $this->internalHeaders())->assertStatus(200);

        $order->refresh();
        $this->assertEquals('EXECUTION_PAID', $order->status);

        // 8. Worker closes visit (VISIT_CLOSED)
        $closeHeaders = $this->workerHeaders($workerId);
        $closeHeaders['Idempotency-Key'] = 'idemp-onsite-close-' . Str::random(8);
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit/close", [], $closeHeaders)->assertStatus(200);

        $order->refresh();
        $this->assertEquals('VISIT_CLOSED', $order->status);

        // 9. Customer completes order
        $compHeaders = $this->customerHeaders($customerId);
        $compHeaders['Idempotency-Key'] = 'idemp-onsite-comp-' . Str::random(8);
        $this->postJson("/api/v1/order-jasa/orders/{$orderId}/complete", [], $compHeaders)->assertStatus(200);

        $order->refresh();
        $this->assertEquals('COMPLETED', $order->status);
    }

    /**
     * SECTION 41: NEGATIVE GUARDS & STRICT BUSINESS INVARIANTS
     */
    public function test_section_41_strict_guards_and_invariants(): void
    {
        $customerId = 'CUST-GUARD-V3';
        $workerId = 'WRK-GUARD-V3';
        $now = now();

        $order = ServiceOrder::forceCreate([
            'id' => (string) Str::ulid(),
            'order_no' => 'SRV-GUARD-' . strtoupper(Str::random(6)),
            'customer_id' => $customerId,
            'provider_org_id' => 'PROV-GUARD',
            'service_offering_id' => 'OFF-01',
            'service_snapshot' => ['title' => 'Servis AC'],
            'recipient_snapshot' => ['recipient_name' => 'Test Guard', 'phone' => '0812345'],
            'address_snapshot' => ['fullAddress' => 'Alamat Guard'],
            'complaint_text' => 'Keluhan Guard',
            'status' => 'DIAGNOSIS_SUBMITTED',
            'phase' => 'CUSTOMER_CONSENT_PENDING',
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $orderId = $order->id;

        $booking = \App\Models\ServiceBooking::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'customer_id' => $customerId,
            'provider_org_id' => 'PROV-GUARD',
            'scheduled_start_at' => $now,
            'scheduled_end_at' => $now->copy()->addHours(2),
            'timezone' => 'Asia/Jakarta',
            'status' => 'CONFIRMED',
            'schedule_revision' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $attempt = WorkerAssignmentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'booking_id' => $booking->id,
            'provider_org_id' => 'PROV-GUARD',
            'assigned_by_id' => 'PROV-USER-01',
            'worker_id' => $workerId,
            'attempt_no' => 1,
            'status' => 'ACCEPTED',
            'assigned_at' => $now,
            'response_due_at' => $now->copy()->addMinutes(30),
            'accepted_at' => $now,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $taskId = $attempt->id;

        \App\Models\BookingActiveAssignment::forceCreate([
            'booking_id' => $booking->id,
            'attempt_id' => $taskId,
            'worker_id' => $workerId,
            'status' => 'ACCEPTED',
            'assigned_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $visit = ServiceVisit::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'assignment_id' => $taskId,
            'worker_id' => $workerId,
            'status' => 'ARRIVED',
            'arrived_at' => $now,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // Guard A: Worker cannot start physical work before price is approved!
        $startExecHeaders = $this->workerHeaders($workerId);
        $startExecHeaders['Idempotency-Key'] = 'idemp-guard-start-' . Str::random(8);

        $prematureStartRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", [
            'action' => 'START_EXECUTION',
        ], $startExecHeaders);
        $prematureStartRes->assertStatus(422);

        // Guard B: Worker cannot close visit before payment is PAID!
        $execObligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'purpose' => 'SERVICE_EXECUTION',
            'principal_idr' => 150000,
            'currency' => 'IDR',
            'state' => 'INVOICE_PENDING', // Unpaid!
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $closeHeaders = $this->workerHeaders($workerId);
        $closeHeaders['Idempotency-Key'] = 'idemp-guard-close-' . Str::random(8);

        $prematureCloseRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit/close", [], $closeHeaders);
        $prematureCloseRes->assertStatus(422);

        // Guard C: Customer cannot complete order before Worker closes visit (VISIT_CLOSED)!
        $execObligation->forceFill(['state' => 'PAID', 'paid_at' => $now, 'active_finance_payment_id' => 'PAY-GUARD'])->save();
        ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $execObligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => 'PAY-GUARD',
            'reported_status' => 'PAID',
            'amount_due_idr' => 150000,
            'is_current' => true,
            'issued_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $order->forceFill(['status' => 'EXECUTION_PAID'])->save();

        $compHeaders = $this->customerHeaders($customerId);
        $compHeaders['Idempotency-Key'] = 'idemp-guard-comp-' . Str::random(8);

        // Visit is still open (status ARRIVED)! Complete must fail with 422!
        $prematureCompRes = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/complete", [], $compHeaders);
        $prematureCompRes->assertStatus(422);
        $this->assertStringContainsString('VISIT_CLOSED', (string) ($prematureCompRes->json('error.message') ?? $prematureCompRes->json('message')));

        // Once worker closes visit -> completion succeeds!
        $visit->forceFill(['status' => 'CLOSED', 'visit_closed_at' => $now])->save();
        $order->forceFill(['status' => 'VISIT_CLOSED'])->save();

        $compHeaders['Idempotency-Key'] = 'idemp-guard-comp-ok-' . Str::random(8);
        $okCompRes = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/complete", [], $compHeaders);
        $okCompRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('COMPLETED', $order->status);
    }
}
