<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CategoryIdempotencyRecord;
use App\Models\CategoryMaster;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class IdempotencyAndReplayTest extends TestCase
{
    use DatabaseTransactions;

    protected array $adminHeaders;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
        ];
    }

    public function test_mutation_with_idempotency_key_replays_identical_response(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $idempotencyKey = 'idem-' . Str::random(16);

        $payload = [
            'master_id' => $master->id,
            'name' => 'Kategori Idempotent Test',
            'description' => 'Test idempotency replay',
        ];

        // First attempt -> Created (201)
        $firstResponse = $this->withHeaders(array_merge($this->adminHeaders, [
            'X-Idempotency-Key' => $idempotencyKey,
        ]))->postJson('/api/v1/categories', $payload);

        $firstResponse->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_CREATED',
            ]);

        $createdId = $firstResponse->json('data.id');

        // Second attempt with exact same payload and idempotency key -> Replayed
        $secondResponse = $this->withHeaders(array_merge($this->adminHeaders, [
            'X-Idempotency-Key' => $idempotencyKey,
        ]))->postJson('/api/v1/categories', $payload);

        $secondResponse->assertStatus(201)
            ->assertHeader('X-Idempotent-Replayed', 'true')
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_CREATED',
                'data' => [
                    'id' => $createdId,
                ],
            ]);
    }

    public function test_reusing_idempotency_key_with_different_payload_returns_conflict(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $idempotencyKey = 'idem-' . Str::random(16);

        $payload1 = [
            'master_id' => $master->id,
            'name' => 'Kategori Idempotent Original',
        ];

        $payload2 = [
            'master_id' => $master->id,
            'name' => 'Kategori Idempotent Berbeda',
        ];

        // First request
        $firstResponse = $this->withHeaders(array_merge($this->adminHeaders, [
            'X-Idempotency-Key' => $idempotencyKey,
        ]))->postJson('/api/v1/categories', $payload1);

        $firstResponse->assertStatus(201);

        // Second request with same idempotency key but different payload -> 409 Conflict
        $secondResponse = $this->withHeaders(array_merge($this->adminHeaders, [
            'X-Idempotency-Key' => $idempotencyKey,
        ]))->postJson('/api/v1/categories', $payload2);

        $secondResponse->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_IDEMPOTENCY_KEY_REUSED',
            ]);
    }

    public function test_cross_user_idempotency_isolation(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $sharedKey = 'shared-idem-' . Str::random(12);

        $userAHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
            'X-Idempotency-Key' => $sharedKey,
        ];

        $userBHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
            'X-Idempotency-Key' => $sharedKey,
        ];

        // User A creates category
        $respA = $this->withHeaders($userAHeaders)->postJson('/api/v1/categories', [
            'master_id' => $master->id,
            'name' => 'Kategori User A',
        ]);
        $respA->assertStatus(201);
        $idA = $respA->json('data.id');

        // User B sends request with the EXACT SAME idempotency key
        $respB = $this->withHeaders($userBHeaders)->postJson('/api/v1/categories', [
            'master_id' => $master->id,
            'name' => 'Kategori User B',
        ]);
        $respB->assertStatus(201);
        $idB = $respB->json('data.id');

        // Verify User B did not get User A's response replayed
        $this->assertNotEquals($idA, $idB);
        $this->assertFalse($respB->headers->has('X-Idempotent-Replayed'));
    }

    public function test_concurrent_request_with_same_key_returns_conflict_and_does_not_mutate_twice(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $idempotencyKey = 'concurrent-idem-' . Str::random(12);
        $actorId = (string) Str::uuid();

        // Simulate an in-progress record currently locked by a concurrent request
        CategoryIdempotencyRecord::create([
            'id' => (string) Str::uuid(),
            'actor_user_id' => $actorId,
            'idempotency_key' => $idempotencyKey,
            'request_hash' => 'dummy-hash',
            'response_status' => 0,
            'response_body' => ['status' => 'IN_PROGRESS'],
            'expires_at' => now()->addMinutes(5),
        ]);

        $headers = [
            'X-Actor-User-Id' => $actorId,
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
            'X-Idempotency-Key' => $idempotencyKey,
        ];

        $response = $this->withHeaders($headers)->postJson('/api/v1/categories', [
            'master_id' => $master->id,
            'name' => 'Kategori Concurrent Attempt',
        ]);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_CONCURRENT_REQUEST',
            ]);

        // Verify category was not created
        $this->assertDatabaseMissing('categories', [
            'name' => 'Kategori Concurrent Attempt',
        ]);
    }
}
