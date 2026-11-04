<?php
require __DIR__ . '/../backend/services/identity-service/vendor/autoload.php';
$app = require __DIR__ . '/../backend/services/identity-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$addresses = Illuminate\Support\Facades\DB::table('user_addresses')->get();
echo "FOUND " . $addresses->count() . " USER ADDRESSES:\n";
foreach ($addresses as $a) {
    echo json_encode($a, JSON_PRETTY_PRINT) . "\n---\n";
}
