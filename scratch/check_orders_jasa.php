<?php
require 'backend/services/order-jasa-service/vendor/autoload.php';
$app = require_once 'backend/services/order-jasa-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$orders = Illuminate\Support\Facades\DB::table('service_orders')->where('id', '01M6QVZ62J7SE7CJHXGGTHZ4N1')->orWhere('order_no', 'LIKE', '%PXZ500%')->get();
foreach ($orders as $o) {
    echo "ID: {$o->id} | OrderNo: {$o->order_no} | Status: {$o->status}\n";
}
