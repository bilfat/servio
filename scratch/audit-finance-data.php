<?php

require __DIR__ . '/../backend/services/finance-service/vendor/autoload.php';
$app = require __DIR__ . '/../backend/services/finance-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== HELD ORDER FUNDS DETAIL ===" . PHP_EOL;
$hfs = DB::table('held_order_funds')
    ->join('payment_allocations', 'held_order_funds.payment_allocation_id', '=', 'payment_allocations.id')
    ->select('held_order_funds.*', 'payment_allocations.merchant_order_id', 'payment_allocations.merchant_org_id')
    ->get();

$totalHeldAll = 0;
$totalHeldProduct = 0;
$totalHeldService = 0;

foreach ($hfs as $h) {
    $isService = str_starts_with($h->merchant_order_id, 'SO-') || 
                 str_starts_with($h->merchant_order_id, 'SRV') || 
                 str_contains($h->merchant_order_id, 'diagnosis') || 
                 str_contains($h->merchant_order_id, 'service_execution');
    echo "ID: {$h->id} | Order: {$h->merchant_order_id} | Status: {$h->status} | Entitlement: {$h->merchant_entitlement_idr} | Source: {$h->hold_source} | Type: " . ($isService ? 'SERVICE' : 'PRODUCT') . PHP_EOL;
    
    if ($h->status === 'HELD') {
        $totalHeldAll += $h->merchant_entitlement_idr;
        if ($isService) {
            $totalHeldService += $h->merchant_entitlement_idr;
        } else {
            $totalHeldProduct += $h->merchant_entitlement_idr;
        }
    }
}

echo PHP_EOL . "TOTAL HELD ALL: Rp " . number_format($totalHeldAll, 0, ',', '.') . PHP_EOL;
echo "TOTAL HELD PRODUCT: Rp " . number_format($totalHeldProduct, 0, ',', '.') . PHP_EOL;
echo "TOTAL HELD SERVICE: Rp " . number_format($totalHeldService, 0, ',', '.') . PHP_EOL;
