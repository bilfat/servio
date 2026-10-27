<?php

declare(strict_types=1);

putenv('APP_ENV=testing');
putenv('DB_DATABASE=servio_order_barang_test_db');
$_ENV['APP_ENV'] = 'testing';
$_ENV['DB_DATABASE'] = 'servio_order_barang_test_db';

// Worker script for two-process concurrency test
require __DIR__ . '/../../vendor/autoload.php';

$app = require_once __DIR__ . '/../../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Verify test db safety
$db = Illuminate\Support\Facades\DB::connection()->getDatabaseName();
if ($db !== 'servio_order_barang_test_db') {
    fwrite(STDERR, "FATAL: Worker running on non-test db: {$db}\n");
    exit(1);
}

$workerId = $argv[1] ?? 'worker_unknown';
$dispatcher = $app->make(App\Domain\Integration\OutboxDispatcherService::class);

$claimed = $dispatcher->claimEligibleEvents($workerId, 10, 60);

$claimedIds = $claimed->pluck('id')->toArray();
echo json_encode([
    'worker' => $workerId,
    'claimed_count' => count($claimedIds),
    'claimed_ids' => $claimedIds,
]) . PHP_EOL;

exit(0);
