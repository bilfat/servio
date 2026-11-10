<?php
require 'backend/services/after-sales-service/vendor/autoload.php';
$app = require_once 'backend/services/after-sales-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$cases = Illuminate\Support\Facades\DB::table('after_sales_cases')->get();
foreach ($cases as $c) {
    echo "ID: {$c->id} | Num: {$c->case_number} | Type: {$c->case_type} | Status: {$c->main_status} | SourceOrder: {$c->source_order_id} | Prov: " . ($c->provider_org_id ?? 'null') . " | Merch: " . ($c->merchant_org_id ?? 'null') . "\n";
}
