<?php
require 'backend/services/identity-service/vendor/autoload.php';
$app = require 'backend/services/identity-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$provUser = App\Models\User::whereHas('memberships', function($q) {
  $q->where('kind', 'OWNER')->whereHas('organization', fn($o) => $o->where('type', 'PROVIDER'));
})->first();
echo 'Provider user: ' . ($provUser ? $provUser->email : 'NOT FOUND') . PHP_EOL;
if ($provUser) {
  Illuminate\Support\Facades\Auth::login($provUser);
  $controller = new App\Http\Controllers\Api\WorkerInvitationController();
  $req = Illuminate\Http\Request::create('/provider/workers', 'GET');
  $res = $controller->listWorkers($req);
  echo json_encode($res->getData(), JSON_PRETTY_PRINT) . PHP_EOL;
}

