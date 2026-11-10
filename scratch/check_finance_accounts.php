<?php
require __DIR__ . '/../backend/services/finance-service/vendor/autoload.php';
$app = require __DIR__ . '/../backend/services/finance-service/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\PaymentAllocation;
use App\Models\SPayAccount;

echo "--- PAYMENT ALLOCATIONS ---\n";
foreach (PaymentAllocation::all() as $pa) {
    echo "ID: {$pa->id} | Order: {$pa->merchant_order_id} | Org: {$pa->merchant_org_id} | CustTot: {$pa->customer_total_idr} | Net: {$pa->merchant_net_entitlement_idr}\n";
}

echo "\n--- SPAY ACCOUNTS ---\n";
foreach (SPayAccount::all() as $a) {
    echo "ID: {$a->id} | Type: {$a->owner_type} | Owner: {$a->owner_external_id} | Avail: {$a->available_idr} | Locked: {$a->withdrawal_locked_idr}\n";
}
