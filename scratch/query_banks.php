<?php
require __DIR__ . '/../backend/services/finance-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/finance-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$banks = App\Models\BankDestination::all(['id', 'owner_type', 'owner_external_id', 'bank_code', 'account_last4', 'account_holder_name_masked', 'verification_status'])->toArray();
echo json_encode($banks, JSON_PRETTY_PRINT);
