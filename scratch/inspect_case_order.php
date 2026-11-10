<?php
require __DIR__ . '/../backend/services/after-sales-service/vendor/autoload.php';
$app = require __DIR__ . '/../backend/services/after-sales-service/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\AfterSalesCase;

$c = AfterSalesCase::where('case_number', 'CLM-20261109-AQDPUA')->first();
echo "source_order_id: '{$c->source_order_id}'\n";
echo "source_merchant_order_id: '{$c->source_merchant_order_id}'\n";

