<?php
require_once __DIR__ . '/../backend/services/order-jasa-service/vendor/autoload.php';

$app = require_once __DIR__ . '/../backend/services/order-jasa-service/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\ServiceOrder;
use App\Models\CancellationRecord;
use Illuminate\Http\Request;

$orderId = '01M6X0C5YEM7VB0CSH3F7PG06B';

echo "1. Resetting order to PENDING...\n";
$order = ServiceOrder::find($orderId);
$order->provider_decision_status = 'PENDING';
$order->status = 'PAID_WAITING_DISPATCH';
$order->phase = 'PAID_WAITING_DISPATCH';
$order->cancelled_at = null;
$order->cancel_reason_code = null;
$order->save();

CancellationRecord::where('order_id', $orderId)->delete();

echo "Order is now: status={$order->status}, provider_decision_status={$order->provider_decision_status}\n";

$controller = app()->make(App\Http\Controllers\ProviderOrderController::class);

echo "\n2. Testing ACCEPT...\n";
$actor = new App\Support\AuthenticatedActor(
    id: '8ecc27f5-d30e-401e-89d5-aceec765a19a',
    role: 'PROVIDER',
    organizationId: '0740d857-b665-4191-aaf5-d7dd3611dc1d',
    permissions: []
);

$requestAccept = Request::create("/api/v1/order-jasa/provider/orders/{$orderId}/accept", 'POST');
$requestAccept->attributes->set('actor', $actor);

try {
    $resAccept = $controller->accept($requestAccept, $orderId);
    echo "Accept response code: " . $resAccept->getStatusCode() . "\n";
    echo "Accept response body: " . json_encode($resAccept->getData()) . "\n";
} catch (\Throwable $e) {
    echo "Accept ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
}

echo "\n3. Resetting order to PENDING for REJECT test...\n";
$order->fresh();
$order->provider_decision_status = 'PENDING';
$order->status = 'PAID_WAITING_DISPATCH';
$order->phase = 'PAID_WAITING_DISPATCH';
$order->cancelled_at = null;
$order->cancel_reason_code = null;
$order->save();

echo "\n4. Testing REJECT...\n";
$requestReject = Request::create("/api/v1/order-jasa/provider/orders/{$orderId}/reject", 'POST', [
    'reason' => 'Jadwal teknisi penuh'
]);
$requestReject->attributes->set('actor', $actor);

try {
    $resReject = $controller->reject($requestReject, $orderId);
    echo "Reject response code: " . $resReject->getStatusCode() . "\n";
    echo "Reject response body: " . json_encode($resReject->getData()) . "\n";
} catch (\Throwable $e) {
    echo "Reject ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
}

echo "\n5. Checking cancellation record...\n";
$canc = CancellationRecord::where('order_id', $orderId)->first();
if ($canc) {
    echo "CancellationRecord found: id={$canc->id}, reason_code={$canc->reason_code}, reason_text={$canc->reason_text}\n";
} else {
    echo "NO CancellationRecord found!\n";
}

echo "\n6. Finally, resetting order back to PENDING so user can test either accept or reject cleanly in UI...\n";
$order->refresh();
$order->provider_decision_status = 'PENDING';
$order->status = 'PAID_WAITING_DISPATCH';
$order->phase = 'PAID_WAITING_DISPATCH';
$order->cancelled_at = null;
$order->cancel_reason_code = null;
$order->save();
CancellationRecord::where('order_id', $orderId)->delete();
echo "Order is back to PENDING.\n";

