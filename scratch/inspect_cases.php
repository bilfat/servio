<?php
require __DIR__ . '/../backend/services/after-sales-service/vendor/autoload.php';
$app = require __DIR__ . '/../backend/services/after-sales-service/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\AfterSalesCase;

$cases = AfterSalesCase::with('items')->get();
foreach ($cases as $c) {
    echo "Case: {$c->case_number} ({$c->source_order_kind}) | Status: {$c->main_status}\n";
    foreach ($c->items as $it) {
        echo "  - Item: {$it->source_item_ref} | Qty: {$it->quantity_requested} | Snapshot: " . json_encode($it->catalog_snapshot) . "\n";
    }
}
