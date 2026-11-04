<?php
require __DIR__ . '/../backend/services/order-jasa-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/order-jasa-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
echo "customer_consents: " . implode(', ', DB::getSchemaBuilder()->getColumnListing('customer_consents')) . "\n";
