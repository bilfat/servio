<?php
require __DIR__ . '/../backend/services/order-jasa-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/order-jasa-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$orderId = '01M6QVZ62J7SE7CJHXGGTHZ4N1';
App\Models\DiagnosisVersion::where('order_id', $orderId)->where('version_no', 2)->delete();

echo "Cleaned up Version 2.\n";
$latest = App\Models\DiagnosisVersion::where('order_id', $orderId)->latest('version_no')->first();
if ($latest) {
    echo "Active Version: {$latest->version_no}, Work: {$latest->work_subtotal_idr}, Parts: {$latest->provider_part_subtotal_idr}, Total: {$latest->service_total_base_idr}\n";
}

