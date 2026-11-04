<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\IdempotencyRecord;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class TrueParallelIdempotencyConcurrencyTest extends TestCase
{
    private string $workerScript;
    private array $seededKeys = [];

    protected function setUp(): void
    {
        parent::setUp();
        // Since we test real separate OS processes via proc_open connecting directly to MySQL,
        // we commit the TestCase transaction so child processes can see committed data without lock timeouts.
        if (DB::transactionLevel() > 0) {
            DB::commit();
        }
        $this->workerScript = realpath(__DIR__ . '/../Helpers/ParallelIdempotencyWorker.php');
    }

    protected function tearDown(): void
    {
        if (!empty($this->seededKeys)) {
            DB::table('idempotency_records')->whereIn('key_hash', $this->seededKeys)->delete();
        }
        parent::tearDown();
    }

    /**
     * Test 1: Real Parallel Multi-Process Test
     * Spawns two distinct OS processes via proc_open concurrently against MySQL.
     * Process 1 holds the lock for 1200ms.
     * Process 2 attempts the same key concurrently and MUST get 409 IN_PROGRESS.
     * Process 3 runs after Process 1 completes and MUST get safe 201 Replay.
     */
    public function test_real_parallel_processes_prevent_duplicate_execution(): void
    {
        $idempotencyKey = 'idemp-parallel-' . Str::random(16);
        $actorId = 'CUST-PARALLEL-01';
        $payload = ['service_id' => 'srv-ac-wash', 'note' => 'AC mati total'];

        // Process 1: holds execution for 1200ms
        $opt1 = base64_encode(json_encode([
            'key' => $idempotencyKey,
            'actor_id' => $actorId,
            'payload' => $payload,
            'delay_ms' => 1200,
            'simulated_status' => 201,
        ]));

        // Process 2: competing concurrent request
        $opt2 = base64_encode(json_encode([
            'key' => $idempotencyKey,
            'actor_id' => $actorId,
            'payload' => $payload,
            'delay_ms' => 0,
            'simulated_status' => 201,
        ]));

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        // Launch Process 1 (holding lease)
        $p1 = proc_open("php \"{$this->workerScript}\" {$opt1}", $descriptors, $pipes1);

        // Brief delay (150ms) to ensure Process 1 has inserted PROCESSING row into MySQL
        usleep(150000);

        // Launch Process 2 concurrently while Process 1 is still running!
        $p2 = proc_open("php \"{$this->workerScript}\" {$opt2}", $descriptors, $pipes2);

        // Wait for Process 2
        $rawOut2 = stream_get_contents($pipes2[1]);
        fclose($pipes2[1]);
        proc_close($p2);

        // Wait for Process 1 to complete
        $rawOut1 = stream_get_contents($pipes1[1]);
        fclose($pipes1[1]);
        proc_close($p1);

        $res1 = json_decode($rawOut1, true);
        $res2 = json_decode($rawOut2, true);

        // Assert Process 1 won and succeeded with 201
        $this->assertEquals(201, $res1['status'] ?? null, "Process 1 should succeed with 201. Raw: {$rawOut1}");
        $this->assertFalse($res1['is_replay'] ?? true);

        // Assert Process 2 was rejected concurrently with 409 ORDER_JASA_IDEMPOTENCY_IN_PROGRESS
        $this->assertEquals(409, $res2['status'] ?? null, "Process 2 should be rejected with 409 IN_PROGRESS. Raw: {$rawOut2}");
        $this->assertEquals('ORDER_JASA_IDEMPOTENCY_IN_PROGRESS', $res2['body']['error']['code'] ?? null);

        // Process 3: Retry after Process 1 completed -> MUST replay cached 201!
        $opt3 = base64_encode(json_encode([
            'key' => $idempotencyKey,
            'actor_id' => $actorId,
            'payload' => $payload,
        ]));
        $p3 = proc_open("php \"{$this->workerScript}\" {$opt3}", $descriptors, $pipes3);
        $rawOut3 = stream_get_contents($pipes3[1]);
        fclose($pipes3[1]);
        proc_close($p3);

        $res3 = json_decode($rawOut3, true);
        $this->assertEquals(201, $res3['status'] ?? null);
        $this->assertTrue($res3['is_replay'] ?? false, 'Subsequent retry must be served from idempotent cache replay');
    }

    /**
     * Test 2: Two requests with identical key but different payloads.
     * Second request MUST return 409 ORDER_JASA_IDEMPOTENCY_CONFLICT.
     */
    public function test_parallel_request_with_different_payload_returns_409_conflict(): void
    {
        $idempotencyKey = 'idemp-conflict-' . Str::random(16);
        $actorId = 'CUST-CONFLICT-01';

        $descriptors = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];

        // Process 1 with Payload A
        $opt1 = base64_encode(json_encode([
            'key' => $idempotencyKey,
            'actor_id' => $actorId,
            'payload' => ['item' => 'service-a'],
            'simulated_status' => 201,
        ]));
        $p1 = proc_open("php \"{$this->workerScript}\" {$opt1}", $descriptors, $pipes1);
        $raw1 = stream_get_contents($pipes1[1]);
        fclose($pipes1[1]);
        proc_close($p1);

        $res1 = json_decode($raw1, true);
        $this->assertEquals(201, $res1['status'] ?? null);

        // Process 2 with SAME key but DIFFERENT Payload B
        $opt2 = base64_encode(json_encode([
            'key' => $idempotencyKey,
            'actor_id' => $actorId,
            'payload' => ['item' => 'service-b-DIFFERENT'],
            'simulated_status' => 201,
        ]));
        $p2 = proc_open("php \"{$this->workerScript}\" {$opt2}", $descriptors, $pipes2);
        $raw2 = stream_get_contents($pipes2[1]);
        fclose($pipes2[1]);
        proc_close($p2);

        $res2 = json_decode($raw2, true);
        $this->assertEquals(409, $res2['status'] ?? null);
        $this->assertEquals('ORDER_JASA_IDEMPOTENCY_CONFLICT', $res2['body']['error']['code'] ?? null);
    }

    /**
     * Test 3: Stale PROCESSING lock (> 120s) transitions to RECONCILIATION_REQUIRED.
     * Protects downstream from duplicate mutations when old processor may have had side effects.
     */
    public function test_stale_processing_lock_transitions_to_reconciliation_required_and_fences_old_worker(): void
    {
        $idempotencyKey = 'idemp-stale-' . Str::random(16);
        $keyHash = hash('sha256', $idempotencyKey);
        $this->seededKeys[] = $keyHash;
        $actorId = 'CUST-STALE-01';
        $payload = ['service' => 'ac-01'];
        $canonicalJson = (string) json_encode($payload);
        $requestHash = hash('sha256', 'POST:api/v1/order-jasa/orders:' . $canonicalJson);

        // Seed a stale PROCESSING record older than 120 seconds
        DB::table('idempotency_records')->insert([
            'id' => (string) Str::ulid(),
            'actor_scope' => "CUSTOMER:{$actorId}",
            'operation' => 'mutation',
            'key_hash' => $keyHash,
            'request_hash' => $requestHash,
            'response_status' => 0,
            'response_body_redacted' => null,
            'state' => 'PROCESSING',
            'recovery_state' => null,
            'lease_token' => 'old-lease-token-123',
            'fencing_version' => 1,
            'payload_size_bytes' => strlen($canonicalJson),
            'expires_at' => now()->addHours(24),
            'created_at' => now()->subMinutes(5),
            'updated_at' => now()->subMinutes(5), // 300 seconds ago (> 120s)
        ]);

        // Attempting with the same key
        $descriptors = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        $opt = base64_encode(json_encode([
            'key' => $idempotencyKey,
            'actor_id' => $actorId,
            'payload' => $payload,
        ]));
        $p = proc_open("php \"{$this->workerScript}\" {$opt}", $descriptors, $pipes);
        $raw = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        proc_close($p);

        $res = json_decode($raw, true);

        // MUST be 409 ORDER_JASA_IDEMPOTENCY_RECONCILIATION_REQUIRED
        $this->assertEquals(409, $res['status'] ?? null);
        $this->assertEquals('ORDER_JASA_IDEMPOTENCY_RECONCILIATION_REQUIRED', $res['body']['error']['code'] ?? null);

        // Verify DB record transitioned state and bumped version
        $updatedRecord = DB::table('idempotency_records')->where('key_hash', $keyHash)->first();
        $this->assertEquals('RECONCILIATION_REQUIRED', $updatedRecord->state);
        $this->assertEquals(2, (int) $updatedRecord->fencing_version);
        $this->assertEquals('STALE_PROCESSING_DETECTED', $updatedRecord->recovery_state);
    }

    /**
     * Test 4: Transient 5xx failure is marked FAILED_RETRYABLE and permits atomic retry.
     */
    public function test_transient_failure_marked_retryable_and_allows_atomic_retry_with_version_increment(): void
    {
        $idempotencyKey = 'idemp-transient-' . Str::random(16);
        $keyHash = hash('sha256', $idempotencyKey);
        $actorId = 'CUST-RETRY-02';
        $payload = ['service' => 'ac-02'];

        $descriptors = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];

        // Process 1: returns simulated 503
        $opt1 = base64_encode(json_encode([
            'key' => $idempotencyKey,
            'actor_id' => $actorId,
            'payload' => $payload,
            'simulated_status' => 503,
        ]));
        $p1 = proc_open("php \"{$this->workerScript}\" {$opt1}", $descriptors, $pipes1);
        $raw1 = stream_get_contents($pipes1[1]);
        fclose($pipes1[1]);
        proc_close($p1);

        $res1 = json_decode($raw1, true);
        $this->assertEquals(503, $res1['status'] ?? null);

        // Record in DB must be FAILED_RETRYABLE
        $record1 = DB::table('idempotency_records')->where('key_hash', $keyHash)->first();
        $this->assertEquals('FAILED_RETRYABLE', $record1->state);
        $this->assertEquals(1, (int) $record1->fencing_version);

        // Process 2 (Retry): should acquire with bumped fencing version and succeed
        $opt2 = base64_encode(json_encode([
            'key' => $idempotencyKey,
            'actor_id' => $actorId,
            'payload' => $payload,
            'simulated_status' => 201,
        ]));
        $p2 = proc_open("php \"{$this->workerScript}\" {$opt2}", $descriptors, $pipes2);
        $raw2 = stream_get_contents($pipes2[1]);
        fclose($pipes2[1]);
        proc_close($p2);

        $res2 = json_decode($raw2, true);
        $this->assertEquals(201, $res2['status'] ?? null);

        // Record in DB must now be COMPLETED with fencing_version = 2
        $record2 = DB::table('idempotency_records')->where('key_hash', $keyHash)->first();
        $this->assertEquals('COMPLETED', $record2->state);
        $this->assertEquals(2, (int) $record2->fencing_version);
    }

    /**
     * Test 5: Key length and character format validations.
     */
    public function test_idempotency_key_validations_fail_closed(): void
    {
        $actorId = 'CUST-VAL-01';
        $descriptors = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];

        // 1. Too short (< 16 chars)
        $optShort = base64_encode(json_encode([
            'key' => 'short-key',
            'actor_id' => $actorId,
            'payload' => ['a' => 'b'],
        ]));
        $p = proc_open("php \"{$this->workerScript}\" {$optShort}", $descriptors, $pipes);
        $raw = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        proc_close($p);
        $res = json_decode($raw, true);
        $this->assertEquals(400, $res['status'] ?? null);
        $this->assertEquals('ORDER_JASA_IDEMPOTENCY_KEY_INVALID', $res['body']['error']['code'] ?? null);

        // 2. Invalid characters (spaces, symbols)
        $optInvalid = base64_encode(json_encode([
            'key' => 'invalid key with spaces!@#$',
            'actor_id' => $actorId,
            'payload' => ['a' => 'b'],
        ]));
        $p = proc_open("php \"{$this->workerScript}\" {$optInvalid}", $descriptors, $pipes);
        $raw = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        proc_close($p);
        $res = json_decode($raw, true);
        $this->assertEquals(400, $res['status'] ?? null);
        $this->assertEquals('ORDER_JASA_IDEMPOTENCY_KEY_INVALID', $res['body']['error']['code'] ?? null);
    }
}
