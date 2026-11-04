<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CancellationRecord;
use App\Models\CustomerConsent;
use App\Models\DiagnosisVersion;
use App\Models\ServiceBooking;
use App\Models\ServiceExecution;
use App\Models\ServiceOrder;
use App\Models\ServicePaymentObligation;
use App\Models\ServiceVisit;
use App\Models\WorkerAssignmentAttempt;
use Carbon\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

class TechnicianMonthlyRecapTest extends TestCase
{
    private string $orgId = 'ORG-MANDIRI-01';
    private string $providerUserId = 'PROV-USER-01';
    private string $workerId = 'WORKER-AHMAD-01';

    public function test_execution_completed_orders_aggregated_correctly(): void
    {
        $orderId = (string) Str::ulid();
        $bookingId = (string) Str::ulid();
        $attemptId = (string) Str::ulid();
        $diagId = (string) Str::ulid();

        $completedAt = Carbon::create(2026, 11, 5, 10, 0, 0, 'Asia/Jakarta')->setTimezone('UTC');

        ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'SO-20261105-001',
            'customer_id' => 'CUST-001',
            'provider_org_id' => $this->orgId,
            'service_offering_id' => 'SRV-AC-01',
            'service_snapshot' => ['title' => 'Cuci AC Split'],
            'recipient_snapshot' => ['name' => 'Fauzi'],
            'address_snapshot' => ['city' => 'Jakarta Pusat'],
            'complaint_text' => 'AC kotor',
            'diagnosis_fee_idr' => 50000,
            'status' => 'COMPLETED',
            'phase' => 'TERMINAL',
            'completed_at' => $completedAt,
            'created_at' => $completedAt->copy()->subHours(4),
            'updated_at' => $completedAt,
        ]);

        ServiceBooking::forceCreate([
            'id' => $bookingId,
            'order_id' => $orderId,
            'customer_id' => 'CUST-001',
            'provider_org_id' => $this->orgId,
            'scheduled_start_at' => $completedAt->copy()->subHours(2),
            'scheduled_end_at' => $completedAt->copy()->subHour(),
            'timezone' => 'Asia/Jakarta',
            'status' => 'COMPLETED',
            'created_at' => $completedAt->copy()->subHours(4),
            'updated_at' => $completedAt,
        ]);

        WorkerAssignmentAttempt::forceCreate([
            'id' => $attemptId,
            'booking_id' => $bookingId,
            'order_id' => $orderId,
            'attempt_no' => 1,
            'worker_id' => $this->workerId,
            'provider_org_id' => $this->orgId,
            'status' => 'ACCEPTED',
            'assigned_by_id' => $this->providerUserId,
            'assigned_at' => $completedAt->copy()->subHours(3),
            'response_due_at' => $completedAt->copy()->subHours(2),
            'accepted_at' => $completedAt->copy()->subHours(2),
            'version' => 1,
            'created_at' => $completedAt->copy()->subHours(4),
            'updated_at' => $completedAt,
        ]);

        $visitId = (string) Str::ulid();
        ServiceVisit::forceCreate([
            'id' => $visitId,
            'order_id' => $orderId,
            'assignment_id' => $attemptId,
            'worker_id' => $this->workerId,
            'status' => 'IN_PROGRESS',
            'version' => 1,
            'created_at' => $completedAt->copy()->subHours(3),
            'updated_at' => $completedAt,
        ]);

        DiagnosisVersion::forceCreate([
            'id' => $diagId,
            'order_id' => $orderId,
            'visit_id' => $visitId,
            'version_no' => 1,
            'worker_id' => $this->workerId,
            'findings' => 'Filter kotor',
            'work_subtotal_idr' => 175000,
            'provider_part_subtotal_idr' => 25000,
            'service_total_base_idr' => 200000,
            'status' => 'APPROVED',
            'submitted_at' => $completedAt->copy()->subHours(2),
            'created_at' => $completedAt->copy()->subHours(2),
            'updated_at' => $completedAt,
        ]);

        $consentId = (string) Str::ulid();
        CustomerConsent::forceCreate([
            'id' => $consentId,
            'order_id' => $orderId,
            'diagnosis_version_id' => $diagId,
            'method' => 'REMOTE_OTP',
            'decision' => 'APPROVED',
            'recorded_by_type' => 'CUSTOMER',
            'recorded_by_id' => 'CUST-001',
            'customer_id' => 'CUST-001',
            'statement_acknowledged' => true,
            'customer_present_reported' => true,
            'submitted_at' => $completedAt->copy()->subHours(2),
            'created_at' => $completedAt->copy()->subHours(2),
            'updated_at' => $completedAt,
        ]);

        ServiceExecution::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'visit_id' => $visitId,
            'consent_id' => $consentId,
            'diagnosis_version_id' => $diagId,
            'worker_id' => $this->workerId,
            'status' => 'WORKER_FINISHED',
            'started_at' => $completedAt->copy()->subHour(),
            'finished_at' => $completedAt,
            'created_at' => $completedAt->copy()->subHour(),
            'updated_at' => $completedAt,
        ]);

        $headers = $this->providerHeaders($this->providerUserId, $this->orgId);
        $res = $this->getJson('/api/v1/order-jasa/provider/technician-recap?month=11&year=2026', $headers);

        $res->assertStatus(200);
        $data = $res->json('data');

        $this->assertEquals(1, $data['summary']['total_completed_count']);
        $this->assertEquals(0, $data['summary']['total_diagnosis_only_count']);
        $this->assertEquals(1, $data['summary']['total_activities']);
        // 50.000 (diag) + 175.000 (work) + 25.000 (parts) = 250.000
        $this->assertEquals(250000, $data['summary']['total_work_value']);
    }

    public function test_cancelled_post_diagnosis_order_counts_as_diagnosis_only(): void
    {
        $orderId = (string) Str::ulid();
        $bookingId = (string) Str::ulid();
        $attemptId = (string) Str::ulid();
        $diagId = (string) Str::ulid();

        $cancelledAt = Carbon::create(2026, 11, 8, 14, 0, 0, 'Asia/Jakarta')->setTimezone('UTC');

        ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'SO-20261108-DIAG',
            'customer_id' => 'CUST-002',
            'provider_org_id' => $this->orgId,
            'service_offering_id' => 'SRV-WASH-01',
            'service_snapshot' => ['title' => 'Diagnosis Mesin Cuci'],
            'recipient_snapshot' => ['name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'complaint_text' => 'Getar kencang',
            'diagnosis_fee_idr' => 60000,
            'status' => 'CANCELLED',
            'phase' => 'TERMINAL',
            'cancel_reason_code' => 'CUSTOMER_REJECTED_DIAGNOSIS',
            'cancelled_at' => $cancelledAt,
            'created_at' => $cancelledAt->copy()->subHours(3),
            'updated_at' => $cancelledAt,
        ]);

        ServiceBooking::forceCreate([
            'id' => $bookingId,
            'order_id' => $orderId,
            'customer_id' => 'CUST-002',
            'provider_org_id' => $this->orgId,
            'scheduled_start_at' => $cancelledAt->copy()->subHours(2),
            'scheduled_end_at' => $cancelledAt->copy()->subHour(),
            'timezone' => 'Asia/Jakarta',
            'status' => 'CANCELLED',
            'created_at' => $cancelledAt->copy()->subHours(3),
            'updated_at' => $cancelledAt,
        ]);

        WorkerAssignmentAttempt::forceCreate([
            'id' => $attemptId,
            'booking_id' => $bookingId,
            'order_id' => $orderId,
            'attempt_no' => 1,
            'worker_id' => $this->workerId,
            'provider_org_id' => $this->orgId,
            'status' => 'ACCEPTED',
            'assigned_by_id' => $this->providerUserId,
            'assigned_at' => $cancelledAt->copy()->subHours(2),
            'response_due_at' => $cancelledAt->copy()->subHours(1),
            'accepted_at' => $cancelledAt->copy()->subHours(2),
            'version' => 1,
            'created_at' => $cancelledAt->copy()->subHours(3),
            'updated_at' => $cancelledAt,
        ]);

        $visitId = (string) Str::ulid();
        ServiceVisit::forceCreate([
            'id' => $visitId,
            'order_id' => $orderId,
            'assignment_id' => $attemptId,
            'worker_id' => $this->workerId,
            'status' => 'IN_PROGRESS',
            'version' => 1,
            'created_at' => $cancelledAt->copy()->subHours(3),
            'updated_at' => $cancelledAt,
        ]);

        DiagnosisVersion::forceCreate([
            'id' => $diagId,
            'order_id' => $orderId,
            'visit_id' => $visitId,
            'version_no' => 1,
            'worker_id' => $this->workerId,
            'findings' => 'Motor aus',
            'work_subtotal_idr' => 300000,
            'provider_part_subtotal_idr' => 150000,
            'service_total_base_idr' => 450000,
            'status' => 'REJECTED_BY_CUSTOMER',
            'submitted_at' => $cancelledAt->copy()->subHour(),
            'created_at' => $cancelledAt->copy()->subHour(),
            'updated_at' => $cancelledAt,
        ]);

        CancellationRecord::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'cancelled_by_type' => 'CUSTOMER',
            'cancelled_by_id' => 'CUST-002',
            'reason_code' => 'CUSTOMER_REJECTED_DIAGNOSIS',
            'reason_text' => 'Pelanggan menolak estimasi perbaikan',
            'status_at_cancel' => 'WAITING_CUSTOMER_CONSENT',
            'diagnosis_fulfilled' => true,
            'refund_eligibility_snapshot' => 'NO_REFUND',
            'cancelled_at' => $cancelledAt,
            'created_at' => $cancelledAt,
            'updated_at' => $cancelledAt,
        ]);

        $headers = $this->providerHeaders($this->providerUserId, $this->orgId);
        $res = $this->getJson('/api/v1/order-jasa/provider/technician-recap?month=11&year=2026', $headers);

        $res->assertStatus(200);
        $data = $res->json('data');

        $this->assertEquals(1, $data['summary']['total_diagnosis_only_count']);
        // Strictly diagnosis fee Rp 60.000, NOT the rejected estimate (450.000)
        $this->assertEquals(60000, $data['summary']['total_work_value']);
    }

    public function test_cancelled_before_diagnosis_excluded_from_recap(): void
    {
        $orderId = (string) Str::ulid();
        $cancelledAt = Carbon::create(2026, 11, 10, 10, 0, 0, 'Asia/Jakarta')->setTimezone('UTC');

        ServiceOrder::forceCreate([
            'id' => $orderId,
            'order_no' => 'SO-20261110-CANCEL',
            'customer_id' => 'CUST-003',
            'provider_org_id' => $this->orgId,
            'service_offering_id' => 'SRV-AC-01',
            'service_snapshot' => ['title' => 'Cuci AC'],
            'recipient_snapshot' => ['name' => 'Doni'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'complaint_text' => 'Cancel awal',
            'diagnosis_fee_idr' => 50000,
            'status' => 'CANCELLED',
            'phase' => 'TERMINAL',
            'cancel_reason_code' => 'CUSTOMER_CANCELLED_BEFORE_ACCEPT',
            'cancelled_at' => $cancelledAt,
            'created_at' => $cancelledAt->copy()->subHours(1),
            'updated_at' => $cancelledAt,
        ]);

        CancellationRecord::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $orderId,
            'cancelled_by_type' => 'CUSTOMER',
            'cancelled_by_id' => 'CUST-003',
            'reason_code' => 'CUSTOMER_CANCELLED_BEFORE_ACCEPT',
            'reason_text' => 'Batal sebelum teknisi jalan',
            'status_at_cancel' => 'UNASSIGNED',
            'diagnosis_fulfilled' => false,
            'refund_eligibility_snapshot' => 'FULL_REFUND',
            'cancelled_at' => $cancelledAt,
            'created_at' => $cancelledAt,
            'updated_at' => $cancelledAt,
        ]);

        $headers = $this->providerHeaders($this->providerUserId, $this->orgId);
        $res = $this->getJson('/api/v1/order-jasa/provider/technician-recap?month=11&year=2026', $headers);

        $res->assertStatus(200);
        $data = $res->json('data');

        // MUST be 0
        $this->assertEquals(0, $data['summary']['total_activities']);
        $this->assertEquals(0, $data['summary']['total_work_value']);
    }

    public function test_mixed_orders_four_completed_one_cancelled_post_diagnosis(): void
    {
        $testOrg = 'ORG-TEST-MIXED-' . Str::random(4);
        $testWorker = 'WORKER-TEST-MIXED-' . Str::random(4);
        $testProvUser = 'PROV-USER-MIXED-' . Str::random(4);

        $dt = Carbon::create(2026, 11, 15, 10, 0, 0, 'Asia/Jakarta')->setTimezone('UTC');

        // Create 4 completed orders
        for ($i = 1; $i <= 4; $i++) {
            $oId = (string) Str::ulid();
            $bId = (string) Str::ulid();
            $attId = (string) Str::ulid();
            $vId = (string) Str::ulid();
            $dId = (string) Str::ulid();
            $cId = (string) Str::ulid();

            ServiceOrder::forceCreate([
                'id' => $oId,
                'order_no' => "SO-MIX-{$i}",
                'customer_id' => "CUST-MIX-{$i}",
                'provider_org_id' => $testOrg,
                'service_offering_id' => 'SRV-01',
                'service_snapshot' => ['title' => "Layanan Servis {$i}"],
                'recipient_snapshot' => ['name' => 'Pelanggan'],
                'address_snapshot' => ['city' => 'Jakarta'],
                'complaint_text' => 'Keluhan',
                'diagnosis_fee_idr' => 50000,
                'status' => 'COMPLETED',
                'phase' => 'TERMINAL',
                'completed_at' => $dt,
                'created_at' => $dt->copy()->subHours(5),
                'updated_at' => $dt,
            ]);

            ServiceBooking::forceCreate([
                'id' => $bId,
                'order_id' => $oId,
                'customer_id' => "CUST-MIX-{$i}",
                'provider_org_id' => $testOrg,
                'scheduled_start_at' => $dt->copy()->subHours(2),
                'scheduled_end_at' => $dt->copy()->subHour(),
                'timezone' => 'Asia/Jakarta',
                'status' => 'COMPLETED',
                'created_at' => $dt->copy()->subHours(5),
                'updated_at' => $dt,
            ]);

            WorkerAssignmentAttempt::forceCreate([
                'id' => $attId,
                'booking_id' => $bId,
                'order_id' => $oId,
                'attempt_no' => 1,
                'worker_id' => $testWorker,
                'provider_org_id' => $testOrg,
                'status' => 'ACCEPTED',
                'assigned_by_id' => $testProvUser,
                'assigned_at' => $dt->copy()->subHours(4),
                'response_due_at' => $dt->copy()->subHours(3),
                'accepted_at' => $dt->copy()->subHours(3),
                'version' => 1,
                'created_at' => $dt->copy()->subHours(5),
                'updated_at' => $dt,
            ]);

            $visit = ServiceVisit::forceCreate([
                'id' => $vId,
                'order_id' => $oId,
                'assignment_id' => $attId,
                'worker_id' => $testWorker,
                'status' => 'IN_PROGRESS',
                'version' => 1,
                'created_at' => $dt->copy()->subHours(3),
                'updated_at' => $dt,
            ]);

            DiagnosisVersion::forceCreate([
                'id' => $dId,
                'order_id' => $oId,
                'visit_id' => $vId,
                'version_no' => 1,
                'worker_id' => $testWorker,
                'findings' => 'Perlu servis',
                'work_subtotal_idr' => 200000,
                'provider_part_subtotal_idr' => 50000,
                'service_total_base_idr' => 250000,
                'status' => 'APPROVED',
                'submitted_at' => $dt->copy()->subHours(2),
                'created_at' => $dt->copy()->subHours(2),
                'updated_at' => $dt,
            ]);

            CustomerConsent::forceCreate([
                'id' => $cId,
                'order_id' => $oId,
                'diagnosis_version_id' => $dId,
                'method' => 'REMOTE_OTP',
                'decision' => 'APPROVED',
                'recorded_by_type' => 'CUSTOMER',
                'recorded_by_id' => "CUST-MIX-{$i}",
                'customer_id' => "CUST-MIX-{$i}",
                'statement_acknowledged' => true,
                'customer_present_reported' => true,
                'submitted_at' => $dt->copy()->subHours(2),
                'created_at' => $dt->copy()->subHours(2),
                'updated_at' => $dt,
            ]);

            ServiceExecution::forceCreate([
                'id' => (string) Str::ulid(),
                'order_id' => $oId,
                'visit_id' => $vId,
                'consent_id' => $cId,
                'diagnosis_version_id' => $dId,
                'worker_id' => $testWorker,
                'status' => 'WORKER_FINISHED',
                'started_at' => $dt->copy()->subHour(),
                'finished_at' => $dt,
                'created_at' => $dt->copy()->subHour(),
                'updated_at' => $dt,
            ]);
        }

        // Create 1 post-diagnosis cancelled order
        $cancelOrderId = (string) Str::ulid();
        $cancelBookingId = (string) Str::ulid();
        $cancelAttId = (string) Str::ulid();
        $cancelVisitId = (string) Str::ulid();
        $cancelDiagId = (string) Str::ulid();

        ServiceOrder::forceCreate([
            'id' => $cancelOrderId,
            'order_no' => 'SO-MIX-CANCEL-1',
            'customer_id' => 'CUST-MIX-CANCEL',
            'provider_org_id' => $testOrg,
            'service_offering_id' => 'SRV-01',
            'service_snapshot' => ['title' => 'Layanan Batal Diagnosis'],
            'recipient_snapshot' => ['name' => 'Pelanggan Batal'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'complaint_text' => 'Keluhan',
            'diagnosis_fee_idr' => 50000,
            'status' => 'CANCELLED',
            'phase' => 'TERMINAL',
            'cancel_reason_code' => 'CUSTOMER_REJECTED_DIAGNOSIS',
            'cancelled_at' => $dt,
            'created_at' => $dt->copy()->subHours(5),
            'updated_at' => $dt,
        ]);

        ServiceBooking::forceCreate([
            'id' => $cancelBookingId,
            'order_id' => $cancelOrderId,
            'customer_id' => 'CUST-MIX-CANCEL',
            'provider_org_id' => $testOrg,
            'scheduled_start_at' => $dt->copy()->subHours(2),
            'scheduled_end_at' => $dt->copy()->subHour(),
            'timezone' => 'Asia/Jakarta',
            'status' => 'CANCELLED',
            'created_at' => $dt->copy()->subHours(5),
            'updated_at' => $dt,
        ]);

        WorkerAssignmentAttempt::forceCreate([
            'id' => $cancelAttId,
            'booking_id' => $cancelBookingId,
            'order_id' => $cancelOrderId,
            'attempt_no' => 1,
            'worker_id' => $testWorker,
            'provider_org_id' => $testOrg,
            'status' => 'ACCEPTED',
            'assigned_by_id' => $testProvUser,
            'assigned_at' => $dt->copy()->subHours(4),
            'response_due_at' => $dt->copy()->subHours(3),
            'accepted_at' => $dt->copy()->subHours(3),
            'version' => 1,
            'created_at' => $dt->copy()->subHours(5),
            'updated_at' => $dt,
        ]);

        ServiceVisit::forceCreate([
            'id' => $cancelVisitId,
            'order_id' => $cancelOrderId,
            'assignment_id' => $cancelAttId,
            'worker_id' => $testWorker,
            'status' => 'CLOSED_POST_DIAGNOSIS',
            'version' => 1,
            'created_at' => $dt->copy()->subHours(3),
            'updated_at' => $dt,
        ]);

        DiagnosisVersion::forceCreate([
            'id' => $cancelDiagId,
            'order_id' => $cancelOrderId,
            'visit_id' => $cancelVisitId,
            'version_no' => 1,
            'worker_id' => $testWorker,
            'findings' => 'Estimasi mahal',
            'work_subtotal_idr' => 500000,
            'provider_part_subtotal_idr' => 200000,
            'service_total_base_idr' => 700000,
            'status' => 'REJECTED_BY_CUSTOMER',
            'submitted_at' => $dt->copy()->subHours(2),
            'created_at' => $dt->copy()->subHours(2),
            'updated_at' => $dt,
        ]);

        CancellationRecord::forceCreate([
            'id' => (string) Str::ulid(),
            'order_id' => $cancelOrderId,
            'cancelled_by_type' => 'CUSTOMER',
            'cancelled_by_id' => 'CUST-MIX-CANCEL',
            'reason_code' => 'CUSTOMER_REJECTED_DIAGNOSIS',
            'reason_text' => 'Pelanggan menolak estimasi perbaikan',
            'status_at_cancel' => 'WAITING_CUSTOMER_CONSENT',
            'diagnosis_fulfilled' => true,
            'refund_eligibility_snapshot' => 'NO_REFUND',
            'cancelled_at' => $dt,
            'created_at' => $dt,
            'updated_at' => $dt,
        ]);

        $headers = $this->providerHeaders($testProvUser, $testOrg);
        $res = $this->getJson('/api/v1/order-jasa/provider/technician-recap?month=11&year=2026', $headers);

        $res->assertStatus(200);
        $data = $res->json('data');

        // 4 COMPLETED orders + 1 DIAGNOSIS_ONLY order = 5 activities!
        $this->assertEquals(4, $data['summary']['total_completed_count']);
        $this->assertEquals(1, $data['summary']['total_diagnosis_only_count']);
        $this->assertEquals(5, $data['summary']['total_activities']);

        // Each completed order = 50.000 + 200.000 + 50.000 = 300.000 x 4 = 1.200.000
        // Cancelled diagnosis order = 50.000
        // Total work value = 1.250.000!
        $this->assertEquals(1250000, $data['summary']['total_work_value']);
    }

    public function test_cross_organization_access_is_forbidden(): void
    {
        $otherOrgId = 'ORG-ATTACKER-99';
        $headers = $this->providerHeaders($this->providerUserId, $this->orgId);

        // Attempting to query another organization's recap
        $res = $this->getJson("/api/v1/order-jasa/provider/technician-recap?organization_id={$otherOrgId}&month=11&year=2026", $headers);

        $res->assertStatus(403);
    }
}
