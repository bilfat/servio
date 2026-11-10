<?php
require __DIR__ . '/../backend/services/after-sales-service/vendor/autoload.php';
$app = require __DIR__ . '/../backend/services/after-sales-service/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$cases = DB::table('after_sales_cases')->get();
foreach ($cases as $c) {
    if (in_array($c->main_status, ['COMPLETED', 'REJECTED', 'CANCELLED'], true)) {
        if ($c->entitlement_id) {
            $ent = DB::table('order_warranty_entitlements')->where('id', $c->entitlement_id)->first();
            if ($ent) {
                DB::table('order_warranty_entitlements')->where('id', $c->entitlement_id)->update([
                    'status' => 'CONSUMED',
                    'claimed_quantity' => $ent->quantity,
                ]);
                echo "Updated entitlement {$ent->id} (Order {$ent->order_number}) to CONSUMED (claimed {$ent->quantity}/{$ent->quantity})\n";
            }
        }
    }
}

echo "\n--- CURRENT ENTITLEMENTS STATUS ---\n";
$all = DB::table('order_warranty_entitlements')->get();
foreach ($all as $e) {
    echo "ID: {$e->id} | Order: {$e->order_number} | Status: {$e->status} | Qty: {$e->quantity} | Claimed: {$e->claimed_quantity}\n";
}

