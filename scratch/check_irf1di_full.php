<?php
require 'backend/services/after-sales-service/vendor/autoload.php';
$app = require_once 'backend/services/after-sales-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$case = DB::table('after_sales_cases')->where('case_number', 'CLM-20261109-IRF1DI')->first();
echo "Case: " . json_encode($case) . "\n";

$refs = DB::table('case_external_refs')->where('case_id', $case->id)->get();
echo "Refs: " . json_encode($refs) . "\n";

$ship = DB::table('case_return_shipments')->where('case_id', $case->id)->get();
echo "Return Shipments: " . json_encode($ship) . "\n";

$events = DB::table('case_events')->where('case_id', $case->id)->get();
echo "Events: " . json_encode($events) . "\n";

