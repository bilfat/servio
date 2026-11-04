<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\IntegrationInboxEvent;
use App\Models\ServiceBooking;
use App\Models\ServiceOrder;
use App\Models\ServicePaymentAttempt;
use App\Models\ServicePaymentObligation;
use Illuminate\Support\Str;
use Tests\TestCase;

class FinanceIntegrationAndDeduplicationTest extends TestCase
{
    private function createOrderWithPendingDiagnosisPayment(string $customerId, ?string $paymentRef = null): array
    {
        $orderId = (string) Str::ulid();
        $now = now();
        $paymentRef = $paymentRef ?? ('PAY-FIN-' . Str::random(10));

        $order = ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'SO-FIN-' . strtoupper(Str::random(6)),
            'customer_id' => $customerId,
            'provider_org_id' => 'ORG-PROVIDER-01',
            'service_offering_id' => 'srv-ac-01',
            'service_snapshot' => ['title' => 'Cuci AC'],
            'address_snapshot' => ['city' => 'Jakarta Barat'],
            'recipient_snapshot' => ['name' => 'Charlie'],
            'complaint_text' => 'Cuci AC rutin',
            'status' => 'PENDING_DIAGNOSIS_PAYMENT',
            'phase' => 'DIAGNOSIS_PAYMENT_PENDING',
            'diagnosis_fee_idr' => 50000,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $booking = ServiceBooking::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'customer_id' => $customerId,
            'provider_org_id' => 'ORG-PROVIDER-01',
            'scheduled_start_at' => $now->copy()->addDay(),
            'scheduled_end_at' => $now->copy()->addDay()->addHours(2),
            'status' => 'REQUESTED',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $obligation = ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'purpose' => 'DIAGNOSIS',
            'state' => 'INVOICE_PENDING',
            'currency' => 'IDR',
            'principal_idr' => 50000,
            'payment_due_at' => $now->copy()->addHours(6),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $attempt = ServicePaymentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'obligation_id' => $obligation->id,
            'attempt_no' => 1,
            'finance_payment_id' => $paymentRef,
            'reported_status' => 'PENDING',
            'amount_due_idr' => 50000,
            'issued_at' => $now,
            'expires_at' => $now->copy()->addHours(6),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return [$order, $booking, $obligation, $attempt, $paymentRef];
    }

    public function test_finance_webhook_transitions_order_and_is_idempotently_deduplicated(): void
    {
        $paymentRef = 'PAY-FIN-' . Str::random(10);
        [$order, $booking, $obligation, $attempt] = $this->createOrderWithPendingDiagnosisPayment('CUST-FIN-01', $paymentRef);

        $eventId = 'EVT-FIN-TEST-' . Str::ulid();
        $paidAt = now()->toIso8601String();

        $webhookPayload = [
            'event_id' => $eventId,
            'event_type' => 'finance.payment.completed.v1',
            'occurred_at' => $paidAt,
            'data' => [
                'payment_id' => $paymentRef,
                'merchant_order_id' => $order->id . '-diagnosis',
                'obligation_id' => $obligation->id,
                'order_id' => $order->id,
                'status' => 'PAID',
                'amount_idr' => 50000,
                'paid_at' => $paidAt,
            ],
        ];

        // 1. First webhook delivery
        $res1 = $this->postJson('/internal/v1/order-jasa/finance-events', $webhookPayload, $this->internalHeaders());

        $res1->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'duplicate' => false,
                    'status' => 'PAID',
                ],
            ]);

        // Verify order transitioned to PAID_WAITING_DISPATCH
        $order->refresh();
        $this->assertEquals('PAID_WAITING_DISPATCH', $order->status);
        $this->assertEquals('WORKER_ASSIGNMENT_PENDING', $order->phase);

        // Verify obligation transitioned to PAID
        $obligation->refresh();
        $this->assertEquals('PAID', $obligation->state);
        $this->assertEquals($paymentRef, $obligation->active_finance_payment_id);

        // Verify inbox event was recorded
        $inboxEvent = IntegrationInboxEvent::where('producer', 'finance-service')
            ->where('source_event_id', $eventId)
            ->first();
        $this->assertNotNull($inboxEvent, 'Inbox event must be recorded');
        $this->assertEquals('PROCESSED', $inboxEvent->processing_status);

        // 2. Second webhook delivery with the SAME event_id (Duplicate webhook replay)
        $res2 = $this->postJson('/internal/v1/order-jasa/finance-events', $webhookPayload, $this->internalHeaders());

        $res2->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'duplicate' => true,
                ],
            ]);

        // Order state remains unchanged without multiple events
        $order->refresh();
        $this->assertEquals('PAID_WAITING_DISPATCH', $order->status);
    }

    public function test_internal_finance_webhook_requires_valid_gateway_auth(): void
    {
        $webhookPayload = [
            'event_id' => 'EVT-TEST-SPOOF',
            'event_type' => 'finance.payment.completed.v1',
            'data' => [],
        ];

        // Without internal service key -> 401
        $res = $this->postJson('/internal/v1/order-jasa/finance-events', $webhookPayload);
        $res->assertStatus(401);

        // With wrong internal key -> 401
        $res2 = $this->postJson('/internal/v1/order-jasa/finance-events', $webhookPayload, [
            'X-Internal-Service-Key' => 'wrong_internal_key',
        ]);
        $res2->assertStatus(401);
    }

    public function test_finance_callback_without_event_id_rejected_422(): void
    {
        $res = $this->postJson('/internal/v1/order-jasa/finance-events', [
            'event_type' => 'finance.payment.completed.v1',
            'payload' => ['payment_id' => 'PAY-123'],
        ], $this->internalHeaders());

        $res->assertStatus(422);
    }

    public function test_finance_callback_with_unknown_event_type_rejected_422(): void
    {
        $res = $this->postJson('/internal/v1/order-jasa/finance-events', [
            'event_id' => 'EVT-UNKNOWN-01',
            'event_type' => 'random.unsupported.event.type',
            'payload' => ['payment_id' => 'PAY-123'],
        ], $this->internalHeaders());

        $res->assertStatus(422);
    }

    public function test_finance_callback_amount_mismatch_rejected_422(): void
    {
        $paymentRef = 'PAY-MISMATCH-' . Str::random(10);
        [$order, $booking, $obligation, $attempt] = $this->createOrderWithPendingDiagnosisPayment('CUST-FIN-02', $paymentRef);

        $res = $this->postJson('/internal/v1/order-jasa/finance-events', [
            'event_id' => 'EVT-MISMATCH-01',
            'event_type' => 'finance.payment.completed.v1',
            'payload' => [
                'payment_id' => $paymentRef,
                'amount_idr' => 25000, // Expected 50000
            ],
        ], $this->internalHeaders());

        $res->assertStatus(422);

        // Verify obligation NOT marked as PAID
        $obligation->refresh();
        $this->assertEquals('INVOICE_PENDING', $obligation->state);
    }

    public function test_finance_callback_on_cancelled_order_never_reactivates_order(): void
    {
        $paymentRef = 'PAY-CANCELLED-' . Str::random(10);
        [$order, $booking, $obligation, $attempt] = $this->createOrderWithPendingDiagnosisPayment('CUST-FIN-03', $paymentRef);

        // Cancel the order first
        $order->forceFill([
            'status' => 'CANCELLED',
            'phase' => 'TERMINAL',
            'cancel_reason_code' => 'DIAGNOSIS_PAYMENT_EXPIRED',
            'cancelled_at' => now(),
        ])->save();

        $res = $this->postJson('/internal/v1/order-jasa/finance-events', [
            'event_id' => 'EVT-LATE-CANCELLED-01',
            'event_type' => 'finance.payment.completed.v1',
            'payload' => [
                'payment_id' => $paymentRef,
                'amount_idr' => 50000,
            ],
        ], $this->internalHeaders());

        $res->assertStatus(200);

        // Crucial verification: order MUST REMAIN CANCELLED!
        $order->refresh();
        $this->assertEquals('CANCELLED', $order->status);
        $this->assertEquals('TERMINAL', $order->phase);
    }
}
