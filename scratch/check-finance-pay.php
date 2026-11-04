<?php
require __DIR__ . '/../backend/services/finance-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/finance-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$p = App\Models\PaymentIntent::where('id', '01M685VY6S7DTD1Y09FBFJK98B')->orWhere('finance_checkout_id', '01M685VWDP4T4NY01W6MV09P9X')->first();
if ($p) {
    echo "PaymentIntent found: {$p->id} - status: {$p->status} - amount: {$p->amount_idr} - expires_at: {$p->expires_at}\n";
} else {
    echo "PaymentIntent NOT found by id. Listing last 5 payments:\n";
    foreach (App\Models\PaymentIntent::orderBy('created_at', 'desc')->take(5)->get() as $item) {
        echo "  {$item->id} - checkout_id: {$item->finance_checkout_id} - status: {$item->status} - amount: {$item->amount_idr}\n";
    }
}
