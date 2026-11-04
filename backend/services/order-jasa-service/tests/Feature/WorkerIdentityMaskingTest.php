<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BookingActiveAssignment;
use App\Models\ServiceBooking;
use App\Models\ServiceOrder;
use App\Models\WorkerAssignmentAttempt;
use Illuminate\Support\Str;
use Tests\TestCase;

class WorkerIdentityMaskingTest extends TestCase
{
    public function test_worker_identity_absent_from_customer_json_before_accepted(): void
    {
        $orderId = (string) Str::ulid();
        $bookingId = (string) Str::ulid();
        $attemptId = (string) Str::ulid();
        $customerId = 'CUST-MASK-001';
        $providerOrgId = 'ORG-PROV-001';

        // 1. Create order
        ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'JSA-TEST-001',
            'customer_id' => $customerId,
            'provider_org_id' => $providerOrgId,
            'service_offering_id' => 'srv-ac-split',
            'service_snapshot' => ['title' => 'Servis AC'],
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'complaint_text' => 'AC tidak dingin',
            'diagnosis_fee_idr' => 35000,
            'status' => 'CONFIRMED',
            'phase' => 'WORKER_ASSIGNMENT_PENDING',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Create booking
        ServiceBooking::forceCreate([
            'id' => $bookingId,
            'order_id' => $orderId,
            'customer_id' => $customerId,
            'provider_org_id' => $providerOrgId,
            'scheduled_start_at' => now()->addDay(),
            'scheduled_end_at' => now()->addDay()->addHours(2),
            'status' => 'READY',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 3. Create assignment attempt with status ASSIGNED (not yet ACCEPTED)
        WorkerAssignmentAttempt::forceCreate([
            'id' => $attemptId,
            'booking_id' => $bookingId,
            'order_id' => $orderId,
            'attempt_no' => 1,
            'worker_id' => 'WORKER-SECRET-AGENT-007',
            'provider_org_id' => $providerOrgId,
            'status' => 'ASSIGNED',
            'assigned_by_id' => 'PROV-ADMIN-01',
            'assigned_at' => now(),
            'response_due_at' => now()->addMinutes(30),
            'worker_membership_snapshot' => ['name' => 'Pak Bambang Rahasia'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        BookingActiveAssignment::forceCreate([
            'booking_id' => $bookingId,
            'attempt_id' => $attemptId,
            'worker_id' => 'WORKER-SECRET-AGENT-007',
            'status' => 'ASSIGNED',
            'assigned_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Request order as Customer
        $headers = $this->customerHeaders($customerId);
        $response = $this->getJson("/api/v1/order-jasa/orders/{$orderId}", $headers);

        $response->assertStatus(200);

        // V2 Business Lock Verification: Worker identity MUST BE ABSENT (null) before ACCEPTED!
        $this->assertNull(
            $response->json('data.assigned_worker'),
            'CRITICAL SECURITY FAILED: Worker identity was leaked to customer before assignment was ACCEPTED!'
        );

        // 4. Now simulate worker ACCEPTING the assignment
        WorkerAssignmentAttempt::where('id', $attemptId)->update([
            'status' => 'ACCEPTED',
            'accepted_at' => now(),
        ]);
        BookingActiveAssignment::where('booking_id', $bookingId)->update([
            'status' => 'ACCEPTED',
        ]);

        // Re-request order as Customer
        $responseAfterAccept = $this->getJson("/api/v1/order-jasa/orders/{$orderId}", $headers);
        $responseAfterAccept->assertStatus(200);

        // Worker identity should now be visible
        $assignedWorker = $responseAfterAccept->json('data.assigned_worker');
        $this->assertNotNull($assignedWorker);
        $this->assertEquals('WORKER-SECRET-AGENT-007', $assignedWorker['worker_id']);
        $this->assertEquals('ACCEPTED', $assignedWorker['status']);
    }
}
