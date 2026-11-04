<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BookingActiveAssignment;
use App\Models\CancellationRecord;
use App\Models\ServiceBooking;
use App\Models\ServiceOrder;
use App\Models\ServicePaymentObligation;
use App\Models\WorkerAssignmentAttempt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrderJasaCancellationAndRefundTest extends TestCase
{
    private function createOrderForCancellation(
        string $customerId,
        string $status = 'PAID_WAITING_DISPATCH',
        bool $diagnosisPaid = true
    ): ServiceOrder {
        $orderId = (string) Str::ulid();
        $now = now();

        $order = ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'SO-CANCEL-' . strtoupper(Str::random(6)),
            'customer_id' => $customerId,
            'provider_org_id' => 'ORG-PROVIDER-01',
            'service_offering_id' => 'srv-ac-01',
            'service_snapshot' => ['title' => 'Perbaikan AC'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'recipient_snapshot' => ['name' => 'Test User'],
            'complaint_text' => 'AC tidak dingin sama sekali',
            'status' => $status,
            'phase' => 'WORKER_ASSIGNMENT_PENDING',
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
            'status' => 'CONFIRMED',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        if ($diagnosisPaid) {
            ServicePaymentObligation::forceCreate([
                'id' => (string) Str::ulid(),
                'order_id' => $orderId,
                'purpose' => 'DIAGNOSIS',
                'state' => 'PAID',
                'currency' => 'IDR',
                'principal_idr' => 50000,
                'paid_at' => $now,
                'payment_due_at' => $now->copy()->addHours(6),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        return $order;
    }

    public function test_pre_otw_cancellation_grants_full_refund(): void
    {
        $customerId = 'CUST-CANCEL-001';
        $order = $this->createOrderForCancellation($customerId, 'PAID_WAITING_DISPATCH', true);

        // Also assign a worker to have an active assignment
        $attempt = WorkerAssignmentAttempt::forceCreate([
            'id' => (string) Str::ulid(),
            'booking_id' => $order->booking->id,
            'order_id' => $order->id,
            'attempt_no' => 1,
            'worker_id' => 'WKR-01',
            'provider_org_id' => 'ORG-PROVIDER-01',
            'assigned_by_id' => 'PROV-USER-01',
            'status' => 'ASSIGNED',
            'assigned_at' => now(),
            'response_due_at' => now()->addMinutes(30),
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        BookingActiveAssignment::forceCreate([
            'booking_id' => $order->booking->id,
            'attempt_id' => $attempt->id,
            'worker_id' => 'WKR-01',
            'status' => 'ASSIGNED',
            'assigned_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $headers = $this->customerHeaders($customerId);
        $headers['Idempotency-Key'] = 'idemp-cancel-' . Str::random(12);

        $response = $this->postJson("/api/v1/order-jasa/orders/{$order->id}/cancel", [
            'reason_code' => 'CUSTOMER_CHANGE_MIND',
            'reason_text' => 'Sudah diperbaiki kerabat sendiri',
        ], $headers);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'order_id' => $order->id,
                    'refund_eligibility_snapshot' => 'FULL_REFUND',
                ],
            ]);

        // Verify order state
        $order->refresh();
        $this->assertEquals('CANCELLED', $order->status);
        $this->assertEquals('TERMINAL', $order->phase);
        $this->assertNotNull($order->cancelled_at);

        // Verify active assignment was released
        $activeAssignment = BookingActiveAssignment::where('booking_id', $order->booking->id)->first();
        $this->assertNull($activeAssignment, 'Active assignment must be released upon cancellation');

        // Verify cancellation record
        $record = CancellationRecord::where('order_id', $order->id)->first();
        $this->assertNotNull($record);
        $this->assertEquals('FULL_REFUND', $record->refund_eligibility_snapshot);
        $this->assertNotNull($record->refund_finance_ref);

        // Verify timeline event
        $event = $order->events()->where('event_type', 'ORDER_CANCELLED')->first();
        $this->assertNotNull($event);
        $this->assertEquals('PAID_WAITING_DISPATCH', $event->from_state);
        $this->assertEquals('CANCELLED', $event->to_state);
    }

    public function test_post_otw_cancellation_forfeits_diagnosis_fee(): void
    {
        $customerId = 'CUST-CANCEL-002';
        $order = $this->createOrderForCancellation($customerId, 'WORKER_EN_ROUTE', true);

        $headers = $this->customerHeaders($customerId);
        $headers['Idempotency-Key'] = 'idemp-cancel-' . Str::random(12);

        $response = $this->postJson("/api/v1/order-jasa/orders/{$order->id}/cancel", [
            'reason_code' => 'CUSTOMER_UNAVAILABLE',
            'reason_text' => 'Harus keluar kota mendadak',
        ], $headers);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'order_id' => $order->id,
                    'refund_eligibility_snapshot' => 'NO_REFUND',
                ],
            ]);

        $order->refresh();
        $this->assertEquals('CANCELLED', $order->status);

        $record = CancellationRecord::where('order_id', $order->id)->first();
        $this->assertNotNull($record);
        $this->assertEquals('NO_REFUND', $record->refund_eligibility_snapshot);
        $this->assertTrue((bool) $record->diagnosis_fulfilled);
    }

    public function test_customer_cannot_cancel_other_customer_order(): void
    {
        $order = $this->createOrderForCancellation('CUST-OWNER-01', 'PAID_WAITING_DISPATCH', true);

        // Attacker is CUST-ATTACKER-99
        $headers = $this->customerHeaders('CUST-ATTACKER-99');
        $headers['Idempotency-Key'] = 'idemp-cancel-' . Str::random(12);

        $response = $this->postJson("/api/v1/order-jasa/orders/{$order->id}/cancel", [
            'reason_code' => 'MALICIOUS_CANCEL',
        ], $headers);

        $response->assertStatus(403);
    }

    public function test_cannot_cancel_completed_order(): void
    {
        $customerId = 'CUST-COMPL-001';
        $order = $this->createOrderForCancellation($customerId, 'COMPLETED', true);

        $headers = $this->customerHeaders($customerId);
        $headers['Idempotency-Key'] = 'idemp-cancel-' . Str::random(12);

        $response = $this->postJson("/api/v1/order-jasa/orders/{$order->id}/cancel", [
            'reason_code' => 'CUSTOMER_REQUEST',
        ], $headers);

        $response->assertStatus(422);
    }
}
