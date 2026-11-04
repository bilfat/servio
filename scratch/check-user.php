<?php
require 'backend/services/identity-service/vendor/autoload.php';
$app = require 'backend/services/identity-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::with('profile')->find('acfdfc27-9ba5-472f-bec1-3c372f47fff6');
if ($user) {
    echo json_encode($user->toArray(), JSON_PRETTY_PRINT);
}
