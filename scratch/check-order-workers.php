<?php

require 'backend/services/order-jasa-service/vendor/autoload.php';
$app = require 'backend/services/order-jasa-service/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$orders = App\Models\ServiceOrder::with([
    'booking.activeAssignment.attempt',
    'visit',
    'execution',
    'diagnosisVersions',
    'cancellation',
    'paymentObligations',
])->get();

foreach ($orders as $o) {
    $workerId = $o->execution?->worker_id
        ?? $o->visit?->worker_id
        ?? $o->booking?->activeAssignment?->worker_id
        ?? $o->booking?->assignmentAttempts()->where('status', 'ACCEPTED')->latest('attempt_no')->first()?->worker_id;

    $hasDiag = $o->diagnosisVersions->where('status', 'SUBMITTED')->count() > 0;
    $diagPaid = $o->paymentObligations->where('purpose', 'DIAGNOSIS')->where('state', 'PAID')->count() > 0;
    $execPaid = $o->paymentObligations->where('purpose', 'SERVICE_EXECUTION')->where('state', 'PAID')->count() > 0;

    echo "ID: {$o->id} | No: {$o->order_no} | Status: {$o->status} | CancelReason: {$o->cancel_reason_code}\n";
    echo "  Worker: {$workerId} | CompletedAt: {$o->completed_at} | CancelledAt: {$o->cancelled_at}\n";
    echo "  DiagSubmitted: " . ($hasDiag ? 'YES' : 'NO') . " | DiagPaid: " . ($diagPaid ? 'YES' : 'NO') . " | ExecPaid: " . ($execPaid ? 'YES' : 'NO') . "\n";
    if ($o->cancellation) {
        echo "  Cancellation: Reason={$o->cancellation->reason_code}, DiagFulfilled=" . ($o->cancellation->diagnosis_fulfilled ? 'YES' : 'NO') . ", Refund={$o->cancellation->refund_eligibility_snapshot}\n";
    }
}

