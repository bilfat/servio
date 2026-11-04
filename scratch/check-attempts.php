<?php
require __DIR__ . '/../backend/services/order-jasa-service/vendor/autoload.php';
$app = require __DIR__ . '/../backend/services/order-jasa-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$attempts = App\Models\WorkerAssignmentAttempt::all();
foreach ($attempts as $a) {
    echo "ID: {$a->id} | ORDER: {$a->order_id} | WORKER: {$a->worker_id} | STATUS: {$a->status}\n";
}
if ($attempts->isEmpty()) {
    echo "NO WORKER ATTEMPTS FOUND\n";
}

