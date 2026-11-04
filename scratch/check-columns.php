<?php
require __DIR__ . '/../backend/services/order-jasa-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/order-jasa-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "ServiceOrders columns: " . implode(', ', DB::getSchemaBuilder()->getColumnListing('service_orders')) . "\n";
echo "CancellationRecords columns: " . implode(', ', DB::getSchemaBuilder()->getColumnListing('cancellation_records')) . "\n";

