<?php
require 'backend/services/identity-service/vendor/autoload.php';
$app = require 'backend/services/identity-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$u = App\Models\User::find('acfdfc27-9ba5-472f-bec1-3c372f47fff6');
echo json_encode($u ? $u->toArray() : null, JSON_PRETTY_PRINT);
