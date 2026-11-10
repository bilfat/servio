<?php
require __DIR__ . '/../backend/services/order-jasa-service/vendor/autoload.php';
$app = require __DIR__ . '/../backend/services/order-jasa-service/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$orders = DB::table('service_orders')->get();
foreach ($orders as $o) {
    echo "ID: {$o->id} | Number: {$o->order_number} | FinalTot: {$o->final_total_idr} | Status: {$o->status}\n";
}

