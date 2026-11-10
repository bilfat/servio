<?php
require __DIR__ . '/../backend/services/after-sales-service/vendor/autoload.php';
$app = require __DIR__ . '/../backend/services/after-sales-service/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$items = DB::table('order_warranty_entitlements')->get();
foreach ($items as $i) {
    echo "{$i->order_number} => {$i->status} (qty: {$i->quantity}, claimed: {$i->claimed_quantity})\n";
}





