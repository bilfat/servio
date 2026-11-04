<?php
require __DIR__ . '/../backend/services/order-jasa-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/order-jasa-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$order = App\Models\ServiceOrder::with([
    'diagnosisVersions.workItems',
    'diagnosisVersions.partItems',
])->find('01M685VWDP4T4NY01W6MV09P9X');

$res = new App\Http\Resources\CustomerOrderResource($order);
echo json_encode($res->toArray(request()), JSON_PRETTY_PRINT);

