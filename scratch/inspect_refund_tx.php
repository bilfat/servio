<?php
require __DIR__ . '/../backend/services/finance-service/vendor/autoload.php';
$app = require __DIR__ . '/../backend/services/finance-service/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$indexes = DB::select('SHOW INDEXES FROM refund_transactions');
foreach ($indexes as $idx) {
    echo "{$idx->Key_name} | {$idx->Column_name}\n";
}
