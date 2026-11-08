<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BookingActiveAssignment;
use App\Models\CustomerConsent;
use App\Models\DiagnosisVersion;
use App\Models\OperationalIssue;
use App\Models\ServiceExecution;
use App\Models\ServiceFinanceEntitlementRef;
use App\Models\ServiceOrder;
use App\Models\ServicePaymentAttempt;
use App\Models\ServicePaymentObligation;
use App\Models\ServiceVisit;
use App\Models\WorkerAssignmentAttempt;
use Tests\TestCase;

class OrderJasaEndToEndLifecycleTest extends TestCase
{
    /**
     * Test complete happy-path lifecycle:
     * Booking (Diagnosis Fee > 0) -> Finance Paid Webhook -> Provider Dispatch -> Worker Accept
     * -> OTW -> Arrived -> Start Diagnosis -> Submit Diagnosis -> Remote Consent
     * -> Immediate Execution Start -> Worker Finish Execution -> Single Execution Invoice
     * -> Finance Execution Paid Webhook -> Close Visit -> Customer Complete -> 120h Escrow Hold
     */
    public function test_complete_order_jasa_end_to_end_lifecycle(): void
    {
        $customerId = 'CUST-E2E-001';
        $providerOrgId = 'ORG-PROVIDER-01';
        $workerId = 'WORKER-E2E-01';

        // 1. Customer Booking with Diagnosis Fee
        $customerHeaders = $this->customerHeaders($customerId);
        $customerHeaders['Idempotency-Key'] = 'idemp-booking-e2e-001';

        $bookingPayload = [
            'service_offering_id' => 'offering-ac-wash',
            'address_id' => 'ADDR-CUST-01',
            'scheduled_start_at' => now()->addDay()->format('Y-m-d 10:00:00'),
            'complaint_text' => 'AC tidak dingin dan meneteskan air di ruang keluarga.',
            'symptoms_json' => ['bocor_air', 'kurang_dingin'],
            'customer_media_refs' => ['https://img.servio.id/ac1.jpg'],
        ];

        $bookRes = $this->postJson('/api/v1/order-jasa/orders', $bookingPayload, $customerHeaders);
        $bookRes->assertStatus(201);
        $orderData = $bookRes->json()['data'];
        $orderId = $orderData['id'];

        $this->assertEquals('PENDING_DIAGNOSIS_PAYMENT', $orderData['status']);
        $this->assertEquals(50000, $orderData['diagnosis_fee_idr']);

        // Check DB obligation & attempt
        $diagObligation = ServicePaymentObligation::where('order_id', $orderId)->where('purpose', 'DIAGNOSIS')->first();
        $this->assertNotNull($diagObligation);
        $this->assertEquals('INVOICE_PENDING', $diagObligation->state);
        $this->assertEquals(50000, $diagObligation->principal_idr);

        $attempt = ServicePaymentAttempt::where('obligation_id', $diagObligation->id)->first();
        $this->assertNotNull($attempt);
        $paymentIntentId = $attempt->finance_payment_id;

        // 2. Finance Service Webhook confirms diagnosis payment
        $webhookPayload = [
            'event_id' => 'EVT-PAY-DIAG-001',
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'payment_id' => $paymentIntentId,
                'amount_idr' => 50000,
                'status' => 'PAID',
                'merchant_order_ids' => [$orderId . '-diagnosis'],
            ],
        ];

        $webhookRes = $this->postJson('/internal/v1/order-jasa/finance-events', $webhookPayload, $this->internalHeaders());
        $webhookRes->assertStatus(200);

        // Order transitions to PAID_WAITING_DISPATCH
        $order = ServiceOrder::find($orderId);
        $this->assertEquals('PAID_WAITING_DISPATCH', $order->status);

        // Test Inbox Deduplication: send identical payment event again
        $dupRes = $this->postJson('/internal/v1/order-jasa/finance-events', $webhookPayload, $this->internalHeaders());
        $dupRes->assertStatus(200);
        $this->assertTrue($dupRes->json()['data']['duplicate'] ?? false);

        // 3. Provider assigns eligible worker
        $providerHeaders = $this->providerHeaders('PROV-USER-01', $providerOrgId);
        $providerHeaders['Idempotency-Key'] = 'idemp-assign-worker-001';

        $assignRes = $this->postJson("/api/v1/order-jasa/provider/orders/{$orderId}/assign", [
            'worker_id' => $workerId,
        ], $providerHeaders);

        $assignRes->assertStatus(200);
        $taskId = $assignRes->json()['data']['attempt_id'];

        $order->refresh();
        $this->assertEquals('ASSIGNED_WAITING_WORKER', $order->status);

        // Active assignment lock exists
        $activeAssignment = BookingActiveAssignment::where('booking_id', $order->booking->id)->first();
        $this->assertNotNull($activeAssignment);
        $this->assertEquals('ASSIGNED', $activeAssignment->status);
        $this->assertEquals($workerId, $activeAssignment->worker_id);

        // Customer view: Worker identity must remain masked before acceptance!
        $custViewRes = $this->getJson("/api/v1/order-jasa/orders/{$orderId}", $customerHeaders);
        $custViewData = $custViewRes->json()['data'];
        $this->assertNull($custViewData['assigned_worker'] ?? null);

        // 4. Worker accepts assignment
        $workerHeaders = $this->workerHeaders($workerId);
        $workerHeaders['Idempotency-Key'] = 'idemp-accept-task-001';

        $acceptRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/respond", [
            'decision' => 'ACCEPT',
        ], $workerHeaders);
        $acceptRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('WORKER_ACCEPTED', $order->status);

        // Customer view: Worker identity is now visible!
        $custViewRes2 = $this->getJson("/api/v1/order-jasa/orders/{$orderId}", $customerHeaders);
        $custViewData2 = $custViewRes2->json()['data'];
        $this->assertNotNull($custViewData2['assigned_worker']);
        $this->assertEquals($workerId, $custViewData2['assigned_worker']['worker_id']);

        // 5. Worker Visit: OTW -> ARRIVED -> START_DIAGNOSIS
        $otwHeaders = $this->workerHeaders($workerId);
        $otwHeaders['Idempotency-Key'] = 'idemp-visit-otw-001';
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", ['action' => 'OTW'], $otwHeaders)->assertStatus(200);
        $order->refresh();
        $this->assertEquals('WORKER_ON_THE_WAY', $order->status);

        $arrivedHeaders = $this->workerHeaders($workerId);
        $arrivedHeaders['Idempotency-Key'] = 'idemp-visit-arr-001';
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", ['action' => 'ARRIVED'], $arrivedHeaders)->assertStatus(200);
        $order->refresh();
        $this->assertEquals('WORKER_ARRIVED', $order->status);

        $diagStartHeaders = $this->workerHeaders($workerId);
        $diagStartHeaders['Idempotency-Key'] = 'idemp-visit-diag-001';
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", ['action' => 'START_DIAGNOSIS'], $diagStartHeaders)->assertStatus(200);
        $order->refresh();
        $this->assertEquals('DIAGNOSIS_IN_PROGRESS', $order->status);

        // 6. Worker Submits Diagnosis
        $diagSubmitHeaders = $this->workerHeaders($workerId);
        $diagSubmitHeaders['Idempotency-Key'] = 'idemp-submit-diag-001';

        $diagnosisPayload = [
            'findings' => 'Filter kotor tersumbat debu tebal, evaporator berlendir, dan kapasitor fan aus.',
            'initial_condition' => 'Unit indoor berisik dan angin lemah',
            'suspected_cause' => 'Perawatan rutin terlambat lebih dari 6 bulan',
            'recommended_actions' => 'Cuci besar indoor/outdoor dan ganti kapasitor fan',
            'work_items' => [
                [
                    'name' => 'Jasa Cuci Overhaul AC 1 PK',
                    'unit_price_idr' => 150000,
                    'quantity' => 1,
                    'description' => 'Pembersihan evaporator, blower, dan saluran drainase',
                ],
            ],
            'part_items' => [
                [
                    'part_name' => 'Kapasitor Fan 1.5 uF',
                    'source' => 'PROVIDER_SUPPLIED', // Billed in 05B
                    'unit_price_idr' => 65000,
                    'quantity' => 1,
                ],
                [
                    'part_name' => 'Pipa Drain Fleksibel 2m',
                    'source' => 'CUSTOMER_SUPPLIED', // Rp 0
                    'unit_price_idr' => 0,
                    'quantity' => 1,
                ],
                [
                    'part_name' => 'Freon R32 Kaleng',
                    'source' => 'SERVIO_MERCHANT', // Bought from Order Barang 05A, excluded from 05B execution invoice
                    'unit_price_idr' => 120000,
                    'quantity' => 1,
                ],
            ],
        ];

        $diagRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/diagnosis", $diagnosisPayload, $diagSubmitHeaders);
        $diagRes->assertStatus(201);

        $order->refresh();
        $this->assertEquals('DIAGNOSIS_SUBMITTED', $order->status);

        $diagnosis = DiagnosisVersion::where('order_id', $orderId)->first();
        $this->assertNotNull($diagnosis);
        $this->assertEquals(150000, $diagnosis->work_subtotal_idr);
        $this->assertEquals(65000, $diagnosis->provider_part_subtotal_idr); // Only provider parts!
        $this->assertEquals(215000, $diagnosis->service_total_base_idr); // 150000 + 65000

        // 7. Customer Remote Consent APPROVED
        // CRITICAL LOCKED RULE: Worker is immediately authorized to start physical work WITHOUT waiting for execution payment!
        $consentHeaders = $this->customerHeaders($customerId);
        $consentHeaders['Idempotency-Key'] = 'idemp-consent-appr-001';

        $consentRes = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/consent", [
            'method' => 'CUSTOMER_REMOTE',
            'decision' => 'APPROVED',
            'statement_acknowledged' => true,
        ], $consentHeaders);
        $consentRes->assertStatus(200);

        $order->refresh();
        // V3 Rule: Consent approval sets status to PRICE_APPROVED (Harga Telah Disetujui)
        $this->assertEquals('PRICE_APPROVED', $order->status);

        // 7b. Worker explicitly clicks "Lanjutkan Pengerjaan" (START_EXECUTION)
        $startExecHeaders = $this->workerHeaders($workerId);
        $startExecHeaders['Idempotency-Key'] = 'idemp-start-exec-001';
        $startExecRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", [
            'action' => 'START_EXECUTION',
        ], $startExecHeaders);
        $startExecRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('EXECUTION_IN_PROGRESS', $order->status);

        $execution = ServiceExecution::where('order_id', $orderId)->first();
        $this->assertNotNull($execution);
        $this->assertEquals('IN_PROGRESS', $execution->status);

        // 8. Worker Finishes Physical Execution
        $finishHeaders = $this->workerHeaders($workerId);
        $finishHeaders['Idempotency-Key'] = 'idemp-finish-exec-001';

        $finishPayload = [
            'summary' => 'Pembersihan AC dan penggantian kapasitor telah selesai dikerjakan.',
            'test_result' => 'Suhu output 18C, hembusan kencang, tidak ada kebocoran air.',
            'evidence' => [
                [
                    'evidence_type' => 'BEFORE',
                    'media_reference' => 'https://img.servio.id/evidence/before-ac.jpg',
                ],
                [
                    'evidence_type' => 'AFTER',
                    'media_reference' => 'https://img.servio.id/evidence/after-ac.jpg',
                ],
                [
                    'evidence_type' => 'TEST',
                    'media_reference' => 'https://img.servio.id/evidence/thermometer-test.jpg',
                ],
            ],
        ];

        $finishRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/execution/finish", $finishPayload, $finishHeaders);
        $finishRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('WORKER_FINISHED', $order->status);

        // Single execution invoice was created for Labor + Provider parts (Rp 215.000) with 6h window
        $execObligation = ServicePaymentObligation::where('order_id', $orderId)->where('purpose', 'SERVICE_EXECUTION')->first();
        $this->assertNotNull($execObligation);
        $this->assertEquals('INVOICE_PENDING', $execObligation->state);
        $this->assertEquals(215000, $execObligation->principal_idr);

        $execAttempt = ServicePaymentAttempt::where('obligation_id', $execObligation->id)->first();
        $this->assertNotNull($execAttempt);
        $this->assertEquals(215000, $execAttempt->amount_due_idr);
        $execPaymentIntentId = $execAttempt->finance_payment_id;

        // 9. Finance confirms execution payment
        $execWebhookPayload = [
            'event_id' => 'EVT-PAY-EXEC-001',
            'event_type' => 'finance.payment.confirmed.v1',
            'payload' => [
                'payment_id' => $execPaymentIntentId,
                'amount_idr' => 215000,
                'status' => 'PAID',
                'merchant_order_ids' => [$orderId . '-service_execution'],
            ],
        ];

        $execWebhookRes = $this->postJson('/internal/v1/order-jasa/finance-events', $execWebhookPayload, $this->internalHeaders());
        $execWebhookRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('EXECUTION_PAID', $order->status);
        $execObligation->refresh();
        $this->assertEquals('PAID', $execObligation->state);

        // 10. Worker closes visit
        $closeHeaders = $this->workerHeaders($workerId);
        $closeHeaders['Idempotency-Key'] = 'idemp-close-visit-001';
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit/close", ['reason' => 'SERVIS_SELESAI_NORMAL'], $closeHeaders)->assertStatus(200);

        $order->refresh();
        $this->assertEquals('VISIT_CLOSED', $order->status);

        // 11. Customer Completes Order
        $compHeaders = $this->customerHeaders($customerId);
        $compHeaders['Idempotency-Key'] = 'idemp-complete-order-001';

        $compRes = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/complete", [], $compHeaders);
        $compRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('COMPLETED', $order->status);
        $this->assertNotNull($order->completed_at);

        // 12. CRITICAL LOCKED RULE: 120-hour escrow hold!
        $entitlement = ServiceFinanceEntitlementRef::where('order_id', $orderId)->first();
        $this->assertNotNull($entitlement);
        $this->assertEquals('HELD', $entitlement->hold_status);
        $this->assertEquals(215000, $entitlement->net_provider_idr);

        // Eligible release is 120 hours in the future
        $expectedEligible = $order->completed_at->addHours(120);
        $this->assertEquals($expectedEligible->format('Y-m-d H:i'), $entitlement->release_eligible_at->format('Y-m-d H:i'));
    }

    /**
     * Test free diagnosis booking (diagnosis fee = 0):
     * Should immediately enter PAID_WAITING_DISPATCH without needing payment.
     */
    public function test_booking_with_free_diagnosis_fee_immediately_enters_dispatch(): void
    {
        $customerId = 'CUST-FREE-01';
        $customerHeaders = $this->customerHeaders($customerId);
        $customerHeaders['Idempotency-Key'] = 'idemp-booking-free-001';

        $bookingPayload = [
            'service_offering_id' => 'offering-free-diagnosis', // diagnosis fee = 0
            'address_id' => 'ADDR-CUST-02',
            'scheduled_start_at' => now()->addDays(2)->format('Y-m-d 14:00:00'),
            'complaint_text' => 'Pengecekan unit AC baru sebelum instalasi pipa.',
        ];

        $res = $this->postJson('/api/v1/order-jasa/orders', $bookingPayload, $customerHeaders);
        $res->assertStatus(201);

        $orderData = $res->json()['data'];
        $this->assertEquals('PAID_WAITING_DISPATCH', $orderData['status']);
        $this->assertEquals(0, $orderData['diagnosis_fee_idr']);

        $orderId = $orderData['id'];
        $diagObligation = ServicePaymentObligation::where('order_id', $orderId)->where('purpose', 'DIAGNOSIS')->first();
        $this->assertNotNull($diagObligation);
        $this->assertEquals('NOT_REQUIRED', $diagObligation->state);
    }

    /**
     * Test Worker Recorded In-Person Consent
     */
    public function test_worker_recorded_in_person_consent(): void
    {
        $customerId = 'CUST-INPERSON-01';
        $workerId = 'WORKER-INPERSON-01';
        $providerOrgId = 'ORG-PROVIDER-01';

        // 1. Create order up to DIAGNOSIS_SUBMITTED
        $customerHeaders = $this->customerHeaders($customerId);
        $customerHeaders['Idempotency-Key'] = 'idemp-inperson-book-01';

        $res = $this->postJson('/api/v1/order-jasa/orders', [
            'service_offering_id' => 'offering-free-diagnosis',
            'address_id' => 'ADDR-01',
            'scheduled_start_at' => now()->addDay()->format('Y-m-d 10:00:00'),
            'complaint_text' => 'AC berbau apek saat pertama kali dinyalakan.',
        ], $customerHeaders);
        $orderId = $res->json()['data']['id'];

        // Provider assigns worker
        $pHeaders = $this->providerHeaders('PROV-01', $providerOrgId);
        $pHeaders['Idempotency-Key'] = 'idemp-inperson-assign-01';
        $assignRes = $this->postJson("/api/v1/order-jasa/provider/orders/{$orderId}/assign", [
            'worker_id' => $workerId,
        ], $pHeaders);
        $taskId = $assignRes->json()['data']['attempt_id'];

        // Worker accepts & arrives
        $wHeaders = $this->workerHeaders($workerId);
        $wHeaders['Idempotency-Key'] = 'idemp-inperson-acc-01';
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/respond", ['decision' => 'ACCEPT'], $wHeaders);

        $wHeaders['Idempotency-Key'] = 'idemp-inperson-arr-01';
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", ['action' => 'ARRIVED'], $wHeaders);

        // Worker submits diagnosis
        $wHeaders['Idempotency-Key'] = 'idemp-inperson-diag-01';
        $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/diagnosis", [
            'findings' => 'Jamur pada blower drum indoor.',
            'work_items' => [['name' => 'Pembersihan Jamur Kimia', 'unit_price_idr' => 125000, 'quantity' => 1]],
        ], $wHeaders);

        // 2. Worker records In-Person Consent
        $wConsentHeaders = $this->workerHeaders($workerId);
        $wConsentHeaders['Idempotency-Key'] = 'idemp-inperson-consent-01';

        $consentRes = $this->postJson("/api/v1/order-jasa/orders/{$orderId}/consent", [
            'method' => 'WORKER_RECORDED_IN_PERSON',
            'decision' => 'APPROVED',
            'customer_present_reported' => true,
            'statement_acknowledged' => true,
        ], $wConsentHeaders);

        $consentRes->assertStatus(200);

        $order = ServiceOrder::find($orderId);
        $this->assertEquals('PRICE_APPROVED', $order->status);

        // Worker explicitly clicks "Lanjutkan Pengerjaan"
        $startExecHeaders = $this->workerHeaders($workerId);
        $startExecHeaders['Idempotency-Key'] = 'idemp-start-exec-02';
        $startExecRes = $this->postJson("/api/v1/order-jasa/worker/tasks/{$taskId}/visit", [
            'action' => 'START_EXECUTION',
        ], $startExecHeaders);
        $startExecRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals('EXECUTION_IN_PROGRESS', $order->status);

        $consent = CustomerConsent::where('order_id', $orderId)->first();
        $this->assertEquals('WORKER_RECORDED_IN_PERSON', $consent->method);
        $this->assertTrue((bool) $consent->customer_present_reported);
    }
}

