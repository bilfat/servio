<?php
require __DIR__ . '/../backend/services/order-jasa-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/order-jasa-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
echo "users: " . implode(', ', DB::getSchemaBuilder()->getColumnListing('servio_identity_db.users')) . "\n";
echo "user_profiles: " . implode(', ', DB::getSchemaBuilder()->getColumnListing('servio_identity_db.user_profiles')) . "\n";

