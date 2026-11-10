<?php
require 'backend/services/after-sales-service/vendor/autoload.php';
$app = require_once 'backend/services/after-sales-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

// Fix event 3
DB::table('case_events')
    ->where('case_id', '1c49aea0-741c-4a40-98b5-7410adda6174')
    ->where('event_type', 'RETURN_SHIPMENT_SUBMITTED')
    ->update([
        'data_json' => json_encode([
            'courier_name' => 'GoSend Instant',
            'tracking_number' => 'https://gjk.id/track/gosend-ret-live',
            'shipping_fee_paid_idr' => 0
        ])
    ]);

// Fix event 6
DB::table('case_events')
    ->where('case_id', '1c49aea0-741c-4a40-98b5-7410adda6174')
    ->where('event_type', 'RESOLUTION_STARTED')
    ->update([
        'data_json' => json_encode([
            'external_ref_id' => '40cab818-c3d7-4796-9acf-d2f7c7bfc90e',
            'target_service' => '05A',
            'external_id' => '0812-9876-5432',
            'external_status' => 'DELIVERED'
        ])
    ]);

// Also update any other JNE or 01m in case_events
$allEvents = DB::table('case_events')->get();
foreach ($allEvents as $ev) {
    $dj = $ev->data_json;
    if ($dj && (str_contains($dj, 'JNE') || str_contains($dj, '01m70wgzeg'))) {
        $clean = str_replace('JNE Express (Reguler)', 'GoSend Instant', $dj);
        $clean = str_replace('JNE-RET-88492019482', 'https://gjk.id/track/gosend-ret-live', $clean);
        $clean = str_replace('01m70wgzeg08ppwht96m4sgesv', '0812-9876-5432', $clean);
        DB::table('case_events')->where('id', $ev->id)->update(['data_json' => $clean]);
    }
}

echo "Database cleaned successfully.\n";

