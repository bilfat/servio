<?php
require __DIR__ . '/../backend/services/product-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/product-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$cols = Illuminate\Support\Facades\Schema::getColumnListing('products');
echo "Columns:\n" . json_encode($cols, JSON_PRETTY_PRINT) . "\n";

$sample = Illuminate\Support\Facades\DB::table('products')->select('id', 'name', 'warranty_policy')->first();
echo "Sample product:\n" . json_encode($sample, JSON_PRETTY_PRINT) . "\n";

