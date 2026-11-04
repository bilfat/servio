<?php
require __DIR__ . '/../backend/services/order-jasa-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/order-jasa-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Uid\Ulid;

$orgId = '0740d857-b665-4191-aaf5-d7dd3611dc1d';
$workerId = 'acfdfc27-9ba5-472f-bec1-3c372f47fff6';
$customerId = '692f03fd-2362-485a-9a23-a672bbb4533f';

// Clean up any failed partial insert
$old = DB::table('service_orders')->where('order_no', 'SO-20261102-DIAG01')->first();
if ($old) {
    DB::table('service_orders')->where('id', $old->id)->delete();
    DB::table('service_bookings')->where('order_id', $old->id)->delete();
    DB::table('worker_assignment_attempts')->where('order_id', $old->id)->delete();
    DB::table('service_visits')->where('order_id', $old->id)->delete();
    DB::table('diagnosis_versions')->where('order_id', $old->id)->delete();
    DB::table('cancellation_records')->where('order_id', $old->id)->delete();
    DB::table('service_payment_obligations')->where('order_id', $old->id)->delete();
}

$orderId = (string) Ulid::generate();
$bookingId = (string) Ulid::generate();
$attemptId = (string) Ulid::generate();
$visitId = (string) Ulid::generate();
$diagId = (string) Ulid::generate();
$cancelId = (string) Ulid::generate();

$now = Carbon::create(2026, 11, 2, 14, 0, 0, 'Asia/Jakarta')->setTimezone('UTC');

// 1. service_orders
DB::table('service_orders')->insert([
    'id' => $orderId,
    'order_no' => 'SO-20261102-DIAG01',
    'customer_id' => $customerId,
    'provider_org_id' => $orgId,
    'service_offering_id' => '6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd',
    'service_offering_version' => 4,
    'service_snapshot' => json_encode([
        'id' => '6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd',
        'title' => 'Diagnosis & Perbaikan Mesin Cuci 1 Tabung',
        'diagnosis_fee_idr' => 50000,
    ]),
    'recipient_snapshot' => json_encode(['name' => 'Budi Santoso', 'phone' => '+628123456789']),
    'address_snapshot' => json_encode(['recipient_name' => 'Budi Santoso', 'fullAddress' => 'Jl. Sudirman No. 45', 'city' => 'Jakarta Pusat']),
    'complaint_text' => 'Mesin cuci bergetar kencang dan tidak berputar',
    'symptoms_json' => json_encode(['Mesin Cuci Mati', 'Getaran Keras']),
    'diagnosis_fee_idr' => 50000,
    'status' => 'CANCELLED',
    'phase' => 'TERMINAL',
    'cancel_reason_code' => 'CUSTOMER_REJECTED_DIAGNOSIS',
    'version' => 1,
    'completed_at' => null,
    'cancelled_at' => $now,
    'created_at' => $now->copy()->subHours(3),
    'updated_at' => $now,
]);

// 2. service_bookings
DB::table('service_bookings')->insert([
    'id' => $bookingId,
    'order_id' => $orderId,
    'customer_id' => $customerId,
    'provider_org_id' => $orgId,
    'scheduled_start_at' => $now->copy()->subHours(2),
    'scheduled_end_at' => $now->copy()->subHours(1),
    'timezone' => 'Asia/Jakarta',
    'status' => 'CANCELLED',
    'created_at' => $now->copy()->subHours(3),
    'updated_at' => $now,
]);

// 3. worker_assignment_attempts
DB::table('worker_assignment_attempts')->insert([
    'id' => $attemptId,
    'booking_id' => $bookingId,
    'order_id' => $orderId,
    'attempt_no' => 1,
    'worker_id' => $workerId,
    'provider_org_id' => $orgId,
    'status' => 'ACCEPTED',
    'assigned_by_id' => '8ecc27f5-d30e-401e-89d5-aceec765a19a',
    'assigned_at' => $now->copy()->subHours(2),
    'response_due_at' => $now->copy()->subHours(2)->addMinutes(30),
    'accepted_at' => $now->copy()->subHours(2)->addMinutes(5),
    'version' => 1,
    'created_at' => $now->copy()->subHours(3),
    'updated_at' => $now,
]);

// 4. booking_active_assignments
DB::table('booking_active_assignments')->insert([
    'booking_id' => $bookingId,
    'attempt_id' => $attemptId,
    'worker_id' => $workerId,
    'status' => 'ACCEPTED',
    'assigned_at' => $now->copy()->subHours(2),
    'created_at' => $now->copy()->subHours(3),
    'updated_at' => $now,
]);

// 5. service_visits
DB::table('service_visits')->insert([
    'id' => $visitId,
    'order_id' => $orderId,
    'assignment_id' => $attemptId,
    'worker_id' => $workerId,
    'status' => 'CLOSED_POST_DIAGNOSIS',
    'otw_at' => $now->copy()->subHours(2),
    'arrived_at' => $now->copy()->subHours(1)->subMinutes(40),
    'diagnosis_started_at' => $now->copy()->subHours(1)->subMinutes(30),
    'diagnosis_submitted_at' => $now->copy()->subHour(),
    'visit_closed_at' => $now,
    'visit_close_reason' => 'CUSTOMER_DECLINED_REPAIR',
    'version' => 1,
    'created_at' => $now->copy()->subHours(2),
    'updated_at' => $now,
]);

// 6. diagnosis_versions
DB::table('diagnosis_versions')->insert([
    'id' => $diagId,
    'order_id' => $orderId,
    'visit_id' => $visitId,
    'version_no' => 1,
    'worker_id' => $workerId,
    'findings' => 'Bearing drum pecah dan v-belt motor aus',
    'work_subtotal_idr' => 220000,
    'provider_part_subtotal_idr' => 85000,
    'service_total_base_idr' => 305000,
    'status' => 'REJECTED_BY_CUSTOMER',
    'submitted_at' => $now->copy()->subHour(),
    'created_at' => $now->copy()->subHour(),
    'updated_at' => $now,
]);

// 7. cancellation_records
DB::table('cancellation_records')->insert([
    'id' => $cancelId,
    'order_id' => $orderId,
    'cancelled_by_type' => 'CUSTOMER',
    'cancelled_by_id' => $customerId,
    'reason_code' => 'CUSTOMER_REJECTED_DIAGNOSIS',
    'reason_text' => 'Pelanggan memutuskan tidak melanjutkan perbaikan setelah diagnosis.',
    'status_at_cancel' => 'WAITING_CUSTOMER_CONSENT',
    'diagnosis_fulfilled' => true,
    'refund_eligibility_snapshot' => 'NO_REFUND',
    'cancelled_at' => $now,
    'created_at' => $now,
    'updated_at' => $now,
]);

// 8. payment_obligations (diagnosis PAID)
DB::table('service_payment_obligations')->insert([
    'id' => (string) Ulid::generate(),
    'order_id' => $orderId,
    'purpose' => 'DIAGNOSIS',
    'principal_idr' => 50000,
    'state' => 'PAID',
    'currency' => 'IDR',
    'paid_at' => $now->copy()->subHours(2),
    'version' => 1,
    'created_at' => $now->copy()->subHours(3),
    'updated_at' => $now->copy()->subHours(2),
]);

echo "Created test cancelled post-diagnosis order {$orderId} (#SO-20261102-DIAG01) successfully!\n";
