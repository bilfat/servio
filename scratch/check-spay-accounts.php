<?php
require __DIR__ . '/../backend/services/finance-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/finance-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$accounts = DB::table('spay_accounts')->get();
echo json_encode($accounts, JSON_PRETTY_PRINT);

