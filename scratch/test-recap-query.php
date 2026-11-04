<?php
require __DIR__ . '/../backend/services/order-jasa-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/order-jasa-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

$tz = new \DateTimeZone('Asia/Jakarta');
$now = Carbon::now($tz);
$month = 11;
$year = 2026;

$startUtc = Carbon::create($year, $month, 1, 0, 0, 0, $tz)->startOfMonth()->setTimezone('UTC');
$endUtc = Carbon::create($year, $month, 1, 0, 0, 0, $tz)->endOfMonth()->setTimezone('UTC');
$orgId = '0740d857-b665-4191-aaf5-d7dd3611dc1d';

echo "Querying period: {$startUtc} to {$endUtc} UTC for org {$orgId}\n";

// 1. Completed orders
$completedOrders = App\Models\ServiceOrder::with([
    'booking.activeAssignment.attempt',
    'visit',
    'execution',
    'diagnosisVersions.workItems',
    'diagnosisVersions.partItems',
    'paymentObligations',
])
->where('provider_org_id', $orgId)
->where('status', 'COMPLETED')
->whereBetween('completed_at', [$startUtc, $endUtc])
->get();

echo "Found completed orders: " . $completedOrders->count() . "\n";

foreach ($completedOrders as $o) {
    $workerId = $o->execution?->worker_id 
        ?: $o->booking?->activeAssignment?->worker_id 
        ?: $o->booking?->activeAssignment?->attempt?->worker_id;
    $diag = $o->diagnosisVersions->sortByDesc('version_no')->first();
    $workSubtotal = $diag?->work_subtotal_idr ?? 0;
    $partsSubtotal = $diag?->provider_part_subtotal_idr ?? 0;
    $diagFee = $o->diagnosis_fee_idr ?? 0;
    $totalVal = $diagFee + $workSubtotal + $partsSubtotal;
    
    echo "Order: {$o->order_no} | Worker: {$workerId} | Completed: {$o->completed_at} | DiagFee: {$diagFee} | Work: {$workSubtotal} | Parts: {$partsSubtotal} | Total: {$totalVal}\n";
}

