<?php
require __DIR__ . '/../backend/services/order-jasa-service/vendor/autoload.php';
$app = require __DIR__ . '/../backend/services/order-jasa-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$orders = App\Models\ServiceOrder::select('id', 'order_no', 'customer_id', 'status', 'created_at')->get();
foreach ($orders as $o) {
    echo "ID: {$o->id} | NO: {$o->order_no} | CUST: {$o->customer_id} | STATUS: {$o->status}\n";
}
if ($orders->isEmpty()) {
    echo "NO ORDERS FOUND IN DB\n";
}
