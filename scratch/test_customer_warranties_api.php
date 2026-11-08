<?php
require __DIR__ . '/../backend/services/after-sales-service/vendor/autoload.php';
$app = require_once __DIR__ . '/../backend/services/after-sales-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;
use App\Http\Controllers\Api\CustomerWarrantyController;
use App\Support\AuthenticatedActor;

$controller = app(CustomerWarrantyController::class);

$actor = new AuthenticatedActor(
    id: '692f03fd-2362-485a-9a23-a672bbb4533f',
    role: 'CUSTOMER'
);

$request = Request::create('/api/v1/after-sales/warranties', 'GET', ['state' => 'active']);
$request->attributes->set('actor', $actor);

$response = $controller->index($request);
echo "Status: " . $response->getStatusCode() . "\n";
echo json_encode(json_decode($response->getContent(), true), JSON_PRETTY_PRINT) . "\n";
