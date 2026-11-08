<?php
require 'backend/services/order-jasa-service/vendor/autoload.php';
$app = require_once 'backend/services/order-jasa-service/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
DB::purge();
$res = DB::select('SHOW VARIABLES LIKE "max_allowed_packet"');
print_r($res);
