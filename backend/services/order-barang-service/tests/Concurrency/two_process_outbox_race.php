<?php

declare(strict_types=1);

putenv('APP_ENV=testing');
putenv('DB_DATABASE=servio_order_barang_test_db');
$_ENV['APP_ENV'] = 'testing';
$_ENV['DB_DATABASE'] = 'servio_order_barang_test_db';

require __DIR__ . '/../../vendor/autoload.php';

$app = require_once __DIR__ . '/../../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$db = Illuminate\Support\Facades\DB::connection()->getDatabaseName();
if ($db !== 'servio_order_barang_test_db') {
    fwrite(STDERR, "FATAL: Test running on non-test db: {$db}\n");
    exit(1);
}

use App\Models\IntegrationOutboxEvent;
use Illuminate\Support\Str;

echo "=== FIX 20 CONCURRENCY TEST: TWO INDEPENDENT OS PROCESSES RACING AGAINST MYSQL ===\n";
echo "Target Database: {$db}\n";

// 1. Seed 20 pending outbox events (limit per worker is 10)
$testTag = 'test_race_' . Str::random(8);
$eventIds = [];

for ($i = 0; $i < 20; $i++) {
    $id = (string) Str::ulid();
    $eventIds[] = $id;
    IntegrationOutboxEvent::create([
        'id' => $id,
        'destination_service' => 'FINANCE_06',
        'event_type' => 'finance.cancellation_refund.v1',
        'aggregate_type' => 'ORDER',
        'aggregate_id' => 'ORD_' . $testTag . '_' . $i,
        'aggregate_version' => 1,
        'payload_json' => ['tag' => $testTag, 'index' => $i],
        'status' => IntegrationOutboxEvent::STATUS_PENDING,
        'available_at' => now(),
        'attempt_count' => 0,
        'correlation_id' => (string) Str::ulid(),
    ]);
}

echo "Seeded 20 pending outbox events for race condition test.\n";

try {
    // 2. Launch two independent PHP worker processes concurrently
    $workerScript = __DIR__ . '/worker.php';
    $cmd1 = 'php ' . escapeshellarg($workerScript) . ' worker_process_ALPHA';
    $cmd2 = 'php ' . escapeshellarg($workerScript) . ' worker_process_BETA';

    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];

    echo "Launching Worker ALPHA and Worker BETA simultaneously...\n";

    $proc1 = proc_open($cmd1, $descriptors, $pipes1);
    $proc2 = proc_open($cmd2, $descriptors, $pipes2);

    if (!is_resource($proc1) || !is_resource($proc2)) {
        throw new RuntimeException("Failed to spawn concurrent processes");
    }

    $out1 = stream_get_contents($pipes1[1]);
    $err1 = stream_get_contents($pipes1[2]);
    fclose($pipes1[0]); fclose($pipes1[1]); fclose($pipes1[2]);
    $status1 = proc_close($proc1);

    $out2 = stream_get_contents($pipes2[1]);
    $err2 = stream_get_contents($pipes2[2]);
    fclose($pipes2[0]); fclose($pipes2[1]); fclose($pipes2[2]);
    $status2 = proc_close($proc2);

    if ($status1 !== 0 || $status2 !== 0) {
        fwrite(STDERR, "Worker error:\nALPHA: {$err1}\nBETA: {$err2}\n");
        exit(1);
    }

    $res1 = json_decode(trim($out1), true);
    $res2 = json_decode(trim($out2), true);

    echo "Worker ALPHA claimed: {$res1['claimed_count']} events\n";
    echo "Worker BETA claimed:  {$res2['claimed_count']} events\n";

    $claimedAlpha = $res1['claimed_ids'] ?? [];
    $claimedBeta = $res2['claimed_ids'] ?? [];

    // Verify mutual exclusion: Overlap between claimedAlpha and claimedBeta MUST be 0
    $overlap = array_intersect($claimedAlpha, $claimedBeta);
    $totalClaimed = count($claimedAlpha) + count($claimedBeta);

    echo "Total claimed by both workers: {$totalClaimed}\n";
    echo "Overlap (double-claimed events): " . count($overlap) . "\n";

    if (count($overlap) > 0) {
        fwrite(STDERR, "CRITICAL FAILURE: Mutual exclusion violated! Overlap detected: " . implode(', ', $overlap) . "\n");
        exit(1);
    }

    if ($totalClaimed !== 20) {
        fwrite(STDERR, "CRITICAL FAILURE: Expected 20 events claimed, but got {$totalClaimed}\n");
        exit(1);
    }

    // Verify all 10 in DB are in PROCESSING state with claimed_by matching the respective worker
    $eventsInDb = IntegrationOutboxEvent::whereIn('id', $eventIds)->get()->keyBy('id');
    foreach ($claimedAlpha as $id) {
        if ($eventsInDb[$id]->status !== 'PROCESSING' || $eventsInDb[$id]->claimed_by !== 'worker_process_ALPHA') {
            fwrite(STDERR, "DB status mismatch for event {$id} claimed by ALPHA\n");
            exit(1);
        }
    }
    foreach ($claimedBeta as $id) {
        if ($eventsInDb[$id]->status !== 'PROCESSING' || $eventsInDb[$id]->claimed_by !== 'worker_process_BETA') {
            fwrite(STDERR, "DB status mismatch for event {$id} claimed by BETA\n");
            exit(1);
        }
    }

    echo "CONCURRENCY TEST RESULT: [PASS] Zero double claims. Exact mutual exclusion verified under real MySQL row-level locking.\n";

} finally {
    // Clean up seeded events
    IntegrationOutboxEvent::whereIn('id', $eventIds)->delete();
    echo "Cleaned up test events.\n";
}

exit(0);
