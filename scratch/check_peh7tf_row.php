<?php
require 'backend/services/after-sales-service/vendor/autoload.php';
$app = require_once 'backend/services/after-sales-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$row = Illuminate\Support\Facades\DB::table('after_sales_cases')->where('case_number', 'CLM-20261109-PEH7TF')->first();
print_r($row);

