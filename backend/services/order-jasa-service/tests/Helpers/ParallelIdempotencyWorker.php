<?php

declare(strict_types=1);

namespace Tests\Helpers;

putenv('APP_ENV=testing');
$_ENV['APP_ENV'] = 'testing';
putenv('DB_DATABASE=servio_order_jasa_test_db');
$_ENV['DB_DATABASE'] = 'servio_order_jasa_test_db';

require __DIR__ . '/../../vendor/autoload.php';
$app = require __DIR__ . '/../../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Middleware\HandleOrderJasaIdempotency;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\Request;

$rawArg = $argv[1] ?? '{}';
$decoded = base64_decode($rawArg, true);
$jsonString = ($decoded !== false && json_validate($decoded)) ? $decoded : $rawArg;
$options = json_decode($jsonString, true) ?: [];
$idempotencyKey = $options['key'] ?? 'idemp-default-key-16';
$actorId = $options['actor_id'] ?? 'CUST-PARALLEL-01';
$payload = $options['payload'] ?? ['service_id' => 'ac-01'];
$delayMs = (int) ($options['delay_ms'] ?? 0);
$simulatedStatus = (int) ($options['simulated_status'] ?? 201);
$path = $options['path'] ?? 'api/v1/order-jasa/orders';
$method = $options['method'] ?? 'POST';

$jsonPayload = json_encode($payload);
$request = Request::create(
    '/' . ltrim($path, '/'),
    $method,
    [],
    [],
    [],
    [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_ACCEPT' => 'application/json',
    ],
    $jsonPayload
);
$request->headers->set('Idempotency-Key', $idempotencyKey);
$request->headers->set('X-Gateway-Key', 'test_only_gateway_key_isolated_05b');
$request->headers->set('X-Actor-User-Id', $actorId);
$request->headers->set('X-Actor-Role', 'CUSTOMER');

$actor = new AuthenticatedActor(
    id: $actorId,
    role: 'CUSTOMER',
    organizationId: null,
    organizationType: null,
    roleAssignmentId: null,
    authzVersion: 1,
    isGuest: false,
    organizationIsActive: true,
    membershipIsActive: true,
);
$request->attributes->set('actor', $actor);

$middleware = new HandleOrderJasaIdempotency();

$response = $middleware->handle($request, function ($req) use ($delayMs, $simulatedStatus) {
    if ($delayMs > 0) {
        usleep($delayMs * 1000);
    }
    if ($simulatedStatus >= 500) {
        return ApiResponse::error('DEPENDENCY_NOT_READY', 'Simulated failure', $simulatedStatus);
    }
    return ApiResponse::success(['order_id' => 'ORDER-SUCCESS-01'], $simulatedStatus);
});

echo json_encode([
    'status' => $response->getStatusCode(),
    'is_replay' => $response->headers->get('X-Idempotent-Replay') === 'true',
    'body' => json_decode((string) $response->getContent(), true),
]);
