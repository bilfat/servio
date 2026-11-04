<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BookingActiveAssignment;
use App\Models\DiagnosisVersion;
use App\Models\IntegrationInboxEvent;
use App\Models\IntegrationOutboxEvent;
use App\Models\ServiceBooking;
use App\Models\ServiceOrder;
use App\Models\ServicePaymentObligation;
use App\Models\WorkerAssignmentAttempt;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;
use Tests\TestCase;

class SchemaConstraintsAndInvariantsTest extends TestCase
{
    public function test_booking_active_assignment_enforces_one_active_assignment_per_booking(): void
    {
        $orderId = (string) Str::ulid();
        $bookingId = (string) Str::ulid();
        $attempt1 = (string) Str::ulid();
        $attempt2 = (string) Str::ulid();

        ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'JSA-INV-' . Str::random(6),
            'customer_id' => 'CUST-001',
            'provider_org_id' => 'ORG-001',
            'service_offering_id' => 'srv-01',
            'service_snapshot' => [],
            'recipient_snapshot' => [],
            'address_snapshot' => [],
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
            'id' => $attempt1,
            'booking_id' => $bookingId,
            'order_id' => $orderId,
            'attempt_no' => 1,
            'worker_id' => 'WORKER-1',
            'provider_org_id' => 'ORG-001',
            'status' => 'ASSIGNED',
            'assigned_by_id' => 'ADMIN',
            'assigned_at' => now(),
            'response_due_at' => now()->addMinutes(30),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        WorkerAssignmentAttempt::forceCreate([
            'id' => $attempt2,
            'booking_id' => $bookingId,
            'order_id' => $orderId,
            'attempt_no' => 2,
            'worker_id' => 'WORKER-2',
            'provider_org_id' => 'ORG-001',
            'status' => 'ASSIGNED',
            'assigned_by_id' => 'ADMIN',
            'assigned_at' => now(),
            'response_due_at' => now()->addMinutes(30),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Insert first active assignment
        BookingActiveAssignment::forceCreate([
            'booking_id' => $bookingId,
            'attempt_id' => $attempt1,
            'worker_id' => 'WORKER-1',
            'status' => 'ASSIGNED',
            'assigned_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Attempting to insert a competing second active assignment for the SAME booking MUST FAIL at the DB layer!
        $this->expectException(QueryException::class);

        BookingActiveAssignment::forceCreate([
            'booking_id' => $bookingId,
            'attempt_id' => $attempt2,
            'worker_id' => 'WORKER-2',
            'status' => 'ASSIGNED',
            'assigned_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_payment_obligations_strictly_unique_per_order_and_purpose(): void
    {
        $orderId = (string) Str::ulid();

        ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'JSA-INV-' . Str::random(6),
            'customer_id' => 'CUST-002',
            'provider_org_id' => 'ORG-002',
            'service_offering_id' => 'srv-02',
            'service_snapshot' => [],
            'recipient_snapshot' => [],
            'address_snapshot' => [],
            'complaint_text' => 'Test',
            'status' => 'CREATED',
            'phase' => 'DIAGNOSIS_PAYMENT_PENDING',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'purpose' => 'DIAGNOSIS',
            'principal_idr' => 50000,
            'state' => 'REQUIRES_INVOICE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Inserting a DUPLICATE DIAGNOSIS obligation for the same order MUST FAIL at DB layer
        $this->expectException(QueryException::class);

        ServicePaymentObligation::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'purpose' => 'DIAGNOSIS',
            'principal_idr' => 50000,
            'state' => 'REQUIRES_INVOICE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_inbox_events_deduplicate_by_producer_and_source_event_id(): void
    {
        IntegrationInboxEvent::forceCreate([
            'id' => (string) Str::ulid(),
            'producer' => 'finance-service',
            'source_event_id' => 'FIN-EVT-999',
            'event_type' => 'PAYMENT_CONFIRMED',
            'schema_version' => 1,
            'payload_hash' => hash('sha256', 'payload-1'),
            'processing_status' => 'PENDING',
            'received_at' => now(),
        ]);

        // Inserting the same producer + source_event_id MUST FAIL with uniqueness constraint
        $this->expectException(QueryException::class);

        IntegrationInboxEvent::forceCreate([
            'id' => (string) Str::ulid(),
            'producer' => 'finance-service',
            'source_event_id' => 'FIN-EVT-999',
            'event_type' => 'PAYMENT_CONFIRMED',
            'schema_version' => 1,
            'payload_hash' => hash('sha256', 'payload-2'),
            'processing_status' => 'PENDING',
            'received_at' => now(),
        ]);
    }

    public function test_outbox_event_id_strictly_unique(): void
    {
        $eventId = (string) Str::ulid();

        IntegrationOutboxEvent::forceCreate([
            'event_id' => $eventId,
            'aggregate_type' => 'ServiceOrder',
            'aggregate_id' => 'SRV-001',
            'event_type' => 'ORDER_CREATED',
            'payload_json' => ['test' => true],
            'destination' => 'finance-service',
            'status' => 'PENDING',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(QueryException::class);

        IntegrationOutboxEvent::forceCreate([
            'event_id' => $eventId,
            'aggregate_type' => 'ServiceOrder',
            'aggregate_id' => 'SRV-002',
            'event_type' => 'ORDER_CREATED',
            'payload_json' => ['test' => false],
            'destination' => 'finance-service',
            'status' => 'PENDING',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
