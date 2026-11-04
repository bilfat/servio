<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\IdempotencyRecord;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class IdempotencyConcurrencyAndRetryTest extends TestCase
{
    public function test_same_idempotency_key_with_different_payload_returns_409_conflict(): void
    {
        $idempotencyKey = 'idemp-' . Str::random(16);
        $headers = $this->customerHeaders('CUST-IDEMP-01');
        $headers['Idempotency-Key'] = $idempotencyKey;

        // First attempt with Payload A (returns 422 validation error or 503)
        $res1 = $this->postJson('/api/v1/order-jasa/orders', [
            'service_offering_id' => 'srv-ac-01',
            'complaint' => 'AC bocor',
        ], $headers);

        $this->assertTrue(in_array($res1->getStatusCode(), [422, 503]));

        // Manually mark as COMPLETED for Payload A to test replay/conflict
        $keyHash = hash('sha256', $idempotencyKey);
        DB::table('idempotency_records')->where('key_hash', $keyHash)->update([
            'state' => 'COMPLETED',
            'response_status' => 201,
            'response_body_redacted' => json_encode(['data' => ['order_no' => 'JSA-001']]),
        ]);

        // Second attempt with DIFFERENT Payload B using SAME Idempotency-Key
        $res2 = $this->postJson('/api/v1/order-jasa/orders', [
            'service_offering_id' => 'srv-ac-DIFFERENT',
            'complaint' => 'AC mati total',
        ], $headers);

        $res2->assertStatus(409)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_IDEMPOTENCY_CONFLICT',
                ],
            ]);
    }

    public function test_concurrent_request_while_processing_returns_409_in_progress(): void
    {
        $idempotencyKey = 'idemp-' . Str::random(16);
        $keyHash = hash('sha256', $idempotencyKey);
        $customerId = 'CUST-CONCURRENT-01';

        $payload = ['service_offering_id' => 'srv-01'];
        $requestHash = hash('sha256', 'POST:api/v1/order-jasa/orders:' . json_encode($payload));

        // Simulate an in-flight request currently holding the lock in PROCESSING state
        DB::table('idempotency_records')->insert([
            'id' => (string) Str::ulid(),
            'actor_scope' => "CUSTOMER:{$customerId}",
            'operation' => 'mutation',
            'key_hash' => $keyHash,
            'request_hash' => $requestHash,
            'response_status' => 0,
            'response_body_redacted' => null,
            'state' => 'PROCESSING',
            'recovery_state' => null,
            'lease_token' => (string) Str::uuid(),
            'fencing_version' => 1,
            'payload_size_bytes' => strlen(json_encode($payload)),
            'expires_at' => now()->addHours(24),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $headers = $this->customerHeaders($customerId);
        $headers['Idempotency-Key'] = $idempotencyKey;

        // Competing concurrent request with identical key & payload
        $response = $this->postJson('/api/v1/order-jasa/orders', $payload, $headers);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_IDEMPOTENCY_IN_PROGRESS',
                ],
            ]);
    }

    public function test_transient_503_is_marked_retryable_and_allows_subsequent_retry(): void
    {
        $idempotencyKey = 'idemp-transient-' . Str::random(16);
        $headers = $this->customerHeaders('CUST-RETRY-01');
        $headers['Idempotency-Key'] = $idempotencyKey;

        $payload = [
            'service_offering_id' => 'srv-01',
            'address_id' => 'addr-cust-01',
            'scheduled_start_at' => now()->addDays(2)->toIso8601String(),
            'complaint_text' => 'AC tidak dingin dan mengeluarkan bunyi berisik',
        ];

        // Simulate transient 503 from upstream dependency without side effect
        $this->instance(
            \App\Contracts\ServiceOfferingClientInterface::class,
            \Mockery::mock(\App\Contracts\ServiceOfferingClientInterface::class, function ($mock) {
                $mock->shouldReceive('getOfferingSnapshot')->andReturnUsing(function () {
                    abort(503, 'Upstream catalog service unavailable');
                });
            })
        );

        // First attempt returns 503
        $res1 = $this->postJson('/api/v1/order-jasa/orders', $payload, $headers);

        $res1->assertStatus(503);

        // Verify the record is FAILED_RETRYABLE, NOT COMPLETED!
        $keyHash = hash('sha256', $idempotencyKey);
        $record = DB::table('idempotency_records')->where('key_hash', $keyHash)->first();
        $this->assertNotNull($record);
        $this->assertEquals('FAILED_RETRYABLE', $record->state);
        $this->assertEquals(503, (int) $record->response_status);

        // Re-attempting with the same key should NOT be blocked by conflict!
        // It should successfully acquire the lock again and attempt execution!
        $res2 = $this->postJson('/api/v1/order-jasa/orders', $payload, $headers);

        // Still 503 because dependency gate is not open, but proved that retry was allowed!
        $res2->assertStatus(503);
    }

    public function test_completed_mutation_is_replayed_with_idempotent_header(): void
    {
        $idempotencyKey = 'idemp-replay-' . Str::random(16);
        $customerId = 'CUST-REPLAY-01';
        $keyHash = hash('sha256', $idempotencyKey);

        $payload = ['service_offering_id' => 'srv-ac-01'];
        $requestHash = hash('sha256', 'POST:api/v1/order-jasa/orders:' . json_encode($payload));

        $mockResponseBody = [
            'success' => true,
            'code' => 'ORDER_JASA_OK',
            'data' => [
                'order_no' => 'JSA-REPLAY-SUCCESS',
                'status' => 'CREATED',
            ],
        ];

        // Seed a COMPLETED idempotency record
        DB::table('idempotency_records')->insert([
            'id' => (string) Str::ulid(),
            'actor_scope' => "CUSTOMER:{$customerId}",
            'operation' => 'mutation',
            'key_hash' => $keyHash,
            'request_hash' => $requestHash,
            'response_status' => 201,
            'response_body_redacted' => json_encode($mockResponseBody),
            'state' => 'COMPLETED',
            'recovery_state' => null,
            'lease_token' => (string) Str::uuid(),
            'fencing_version' => 1,
            'payload_size_bytes' => strlen(json_encode($payload)),
            'expires_at' => now()->addHours(24),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $headers = $this->customerHeaders($customerId);
        $headers['Idempotency-Key'] = $idempotencyKey;

        // Replay request
        $response = $this->postJson('/api/v1/order-jasa/orders', $payload, $headers);

        $response->assertStatus(201)
            ->assertHeader('X-Idempotent-Replay', 'true')
            ->assertJson([
                'success' => true,
                'data' => [
                    'order_no' => 'JSA-REPLAY-SUCCESS',
                ],
            ]);
    }
}

