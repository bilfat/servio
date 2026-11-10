<?php
require 'backend/services/order-jasa-service/vendor/autoload.php';
$app = require_once 'backend/services/order-jasa-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$row = Illuminate\Support\Facades\DB::table('service_orders')->first();
print_r(array_keys((array)$row));

