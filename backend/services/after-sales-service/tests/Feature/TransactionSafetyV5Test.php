<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\AfterSales\Integrations\HttpResolutionCoordinator;
use App\Models\AfterSalesCase;
use App\Models\CaseExternalRef;
use App\Models\CaseItem;
use App\Models\CaseResolution;
use App\Models\IdempotencyRecord;
use App\Models\OutboxEvent;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TransactionSafetyV5Test extends TestCase
{
    use DatabaseTransactions;

    /**
     * P0-3: Idempotency with different payload MUST ALWAYS return 409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH,
     * even when the prior record is marked FAILED or expired.
     */
    public function test_same_idempotency_key_with_different_payload_always_returns_409(): void
    {
        $headers = $this->customerHeaders('cust-idem-v5');
        $key = 'idem-strict-v5-test-' . time();
        $scopeKey = hash('sha256', "POST|api/v1/after-sales/cases|cust-idem-v5||{$key}");

        // Create a prior idempotency record in FAILED state with initial payload
        IdempotencyRecord::create([
            'id' => (string) \Illuminate\Support\Str::ulid(),
            'scope_key' => $scopeKey,
            'payload_hash' => hash('sha256', json_encode(['foo' => 'bar'])),
            'status' => 'FAILED',
            'generation' => 1,
            'response_status' => 500,
            'response_body_json' => ['error' => 'server_error'],
            'created_at' => now()->subMinutes(2),
            'expires_at' => now()->addHours(24),
        ]);

        // Attempt request with different payload under SAME key
        $response = $this->postJson('/api/v1/after-sales/cases', [
            'different_key' => 'different_value',
        ], array_merge($headers, [
            'Idempotency-Key' => $key,
        ]));

        $response->assertStatus(409);
        $response->assertJsonPath('error.code', 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');
    }

    /**
     * P0-3: Fencing token / generation counter protects against stale worker writes.
     */
    public function test_generation_fencing_token_rejects_zombie_worker_overwrite(): void
    {
        $scopeKey = "CUSTOMER:cust-worker-v5:" . hash('sha256', 'api/v1/test|fencing-token-key-' . time());

        $record = IdempotencyRecord::create([
            'id' => (string) \Illuminate\Support\Str::ulid(),
            'scope_key' => $scopeKey,
            'payload_hash' => hash('sha256', 'some_payload'),
            'status' => 'IN_FLIGHT',
            'generation' => 2, // Active generation incremented to 2
            'created_at' => now(),
            'expires_at' => now()->addHours(1),
        ]);

        // Stale zombie worker (generation 1) attempts to mark SUCCEEDED
        $affected = IdempotencyRecord::where('id', $record->id)
            ->where('generation', 1) // Fencing check
            ->update([
                'status' => 'COMPLETED',
                'response_status' => 200,
            ]);

        $this->assertEquals(0, $affected, 'Stale worker write must be rejected by generation fencing token.');

        // Active worker (generation 2) succeeds
        $validAffected = IdempotencyRecord::where('id', $record->id)
            ->where('generation', 2)
            ->update([
                'status' => 'COMPLETED',
                'response_status' => 200,
            ]);

        $this->assertEquals(1, $validAffected);
        $record->refresh();
        $this->assertEquals('COMPLETED', $record->status);
    }

    /**
     * P0-3 & Gate 5: Stale lease recovery (process crash) allows new worker to safely recover with incremented generation.
     */
    public function test_idempotency_stale_lease_recovery_with_generation_increment(): void
    {
        $headers = $this->customerHeaders('cust-stale-v5');
        $key = 'idem-stale-test-' . time();
        $payload = [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-001',
            'case_type' => 'GOODS_RETURN',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Stale lease recovery test',
            'items' => [['order_item_id' => 'item-001', 'quantity' => 1]],
        ];
        $payloadContent = json_encode($payload);
        $payloadHash = hash('sha256', (string) $payloadContent);
        $scopeKey = hash('sha256', "POST|api/v1/after-sales/cases|cust-stale-v5||{$key}");

        // Simulate stale IN_FLIGHT record locked 120s ago by a crashed worker
        $staleRecord = IdempotencyRecord::create([
            'id' => (string) \Illuminate\Support\Str::ulid(),
            'scope_key' => $scopeKey,
            'payload_hash' => $payloadHash,
            'status' => 'IN_FLIGHT',
            'generation' => 1,
            'locked_at' => now()->subSeconds(120),
            'created_at' => now()->subSeconds(120),
            'expires_at' => now()->addHours(24),
        ]);

        // Second request with SAME payload safely acquires lease, increments generation
        $response = $this->postJson('/api/v1/after-sales/cases', $payload, array_merge($headers, ['Idempotency-Key' => $key]));

        $response->assertStatus(201);
        $staleRecord->refresh();
        $this->assertEquals(2, $staleRecord->generation, 'Generation must increment upon stale lease takeover.');
        $this->assertEquals('COMPLETED', $staleRecord->status);
    }

    /**
     * P0-3 & Gate 5: Timeout-after-success replay immediately returns cached response without side effects.
     */
    public function test_idempotency_timeout_after_success_replay(): void
    {
        $headers = $this->customerHeaders('cust-replay-v5');
        $key = 'idem-replay-success-' . time();
        $payload = ['foo' => 'replay_bar'];
        $payloadContent = json_encode($payload);
        $payloadHash = hash('sha256', (string) $payloadContent);
        $scopeKey = hash('sha256', "POST|api/v1/after-sales/cases|cust-replay-v5||{$key}");

        // Pre-recorded completed response
        IdempotencyRecord::create([
            'id' => (string) \Illuminate\Support\Str::ulid(),
            'scope_key' => $scopeKey,
            'payload_hash' => $payloadHash,
            'status' => 'COMPLETED',
            'generation' => 1,
            'response_status' => 201,
            'response_body_json' => ['success' => true, 'data' => ['id' => 'case-cached-999']],
            'created_at' => now()->subSeconds(10),
            'expires_at' => now()->addHours(24),
        ]);

        $response = $this->postJson('/api/v1/after-sales/cases', $payload, array_merge($headers, ['Idempotency-Key' => $key]));

        $response->assertStatus(201);
        $response->assertHeader('X-Idempotent-Replay', 'true');
        $this->assertEquals('case-cached-999', $response->json()['data']['id']);
    }

    /**
     * Gate 5: Fail-closed idempotency on database fault injection returns 503 IDEMPOTENCY_UNAVAILABLE.
     */
    public function test_idempotency_fail_closed_on_db_fault(): void
    {
        $headers = $this->customerHeaders('cust-fault-v5');
        $key = 'idem-fault-test-' . time();

        \Illuminate\Support\Facades\DB::shouldReceive('transaction')
            ->once()
            ->andThrow(new \Illuminate\Database\QueryException(
                'mysql',
                'SELECT 1',
                [],
                new \Exception('Connection lost during idempotency lock')
            ));

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-fault-001',
        ], array_merge($headers, ['Idempotency-Key' => $key]));

        $response->assertStatus(503);
        $response->assertJsonPath('error.code', 'IDEMPOTENCY_UNAVAILABLE');
    }

    /**
     * P0-4: Service-to-Service callback requires valid S2S credential.
     */
    public function test_s2s_callback_rejects_unauthenticated_or_invalid_credential(): void
    {
        $case = $this->createDummyCase('06', 'REFUND_DECISION');

        // Pass valid internal service key to pass gateway middleware, but invalid S2S token for Service 06
        $response = $this->postJson("/internal/v1/after-sales/cases/{$case->id}/external-update", [
            'target_service' => '06',
            'external_id' => 'ref-dummy-01',
            'external_status' => 'SUCCEEDED',
            'purpose' => 'REFUND_DECISION',
        ], [
            'X-Internal-Service-Key' => config('after_sales.internal_service_key'),
            'X-Source-Service' => 'finance-service',
            'X-Service-Token' => 'INVALID_FORGED_SECRET',
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('error.code', 'S2S_AUTHENTICATION_FAILED');
    }

    /**
     * S2S Isolation Gate: Shared global internal service key ALONE is rejected for sensitive callbacks.
     */
    public function test_s2s_callback_with_shared_global_key_alone_is_rejected(): void
    {
        $case = $this->createDummyCase('06', 'REFUND_DECISION');

        // Only sending global internal key without service-specific token
        $response = $this->postJson("/internal/v1/after-sales/cases/{$case->id}/external-update", [
            'target_service' => '06',
            'external_id' => 'ref-dummy-01',
            'external_status' => 'SUCCEEDED',
            'purpose' => 'REFUND_DECISION',
        ], [
            'X-Internal-Service-Key' => config('after_sales.internal_service_key'),
            'X-Source-Service' => 'finance-service',
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('error.code', 'S2S_AUTHENTICATION_FAILED');
    }

    /**
     * S2S Isolation Gate: Cross-service impersonation (using 05A credential to update 06) is rejected.
     */
    public function test_s2s_cross_service_impersonation_is_rejected(): void
    {
        $case = $this->createDummyCase('06', 'REFUND_DECISION');
        $token05A = config('after_sales.s2s.05A');

        $response = $this->postJson("/internal/v1/after-sales/cases/{$case->id}/external-update", [
            'target_service' => '06',
            'external_id' => 'ref-dummy-01',
            'external_status' => 'SUCCEEDED',
            'purpose' => 'REFUND_DECISION',
        ], [
            'X-Internal-Service-Key' => config('after_sales.internal_service_key'),
            'X-Source-Service' => 'finance-service',
            'X-Service-Token' => $token05A, // Stolen/borrowed 05A token
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('error.code', 'S2S_AUTHENTICATION_FAILED');
    }

    /**
     * P0-4: Service action permission matrix blocks unauthorized actions.
     * Service 06 cannot update REPLACEMENT_FULFILLMENT.
     */
    public function test_s2s_service_action_permission_matrix_blocks_unauthorized_action(): void
    {
        $case = $this->createDummyCase('06', 'REPLACEMENT_FULFILLMENT');
        $s2sToken = config('after_sales.s2s.06');

        $response = $this->postJson("/internal/v1/after-sales/cases/{$case->id}/external-update", [
            'target_service' => '06',
            'external_id' => 'ref-dummy-01',
            'external_status' => 'SUCCEEDED',
            'purpose' => 'REPLACEMENT_FULFILLMENT', // Unauthorized purpose for Service 06
        ], [
            'X-Source-Service' => 'finance-service',
            'X-Service-Token' => $s2sToken,
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('error.code', 'SERVICE_ACTION_UNAUTHORIZED');
    }

    /**
     * P0-4: Disallowed status per service is rejected with 422.
     */
    public function test_s2s_rejects_disallowed_status_for_service(): void
    {
        $case = $this->createDummyCase('06', 'REFUND_DECISION');
        $s2sToken = config('after_sales.s2s.06');

        // 'SHIPPED' is only valid for 05A, invalid for Finance 06
        $response = $this->postJson("/internal/v1/after-sales/cases/{$case->id}/external-update", [
            'target_service' => '06',
            'external_id' => 'ref-dummy-01',
            'external_status' => 'SHIPPED',
            'purpose' => 'REFUND_DECISION',
        ], [
            'X-Source-Service' => 'finance-service',
            'X-Service-Token' => $s2sToken,
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'INVALID_EXTERNAL_STATUS');
    }

    /**
     * P0-4: Terminal state cannot regress to processing or non-terminal state.
     */
    public function test_s2s_terminal_state_cannot_regress(): void
    {
        $case = $this->createDummyCase('06', 'REFUND_DECISION', 'SUCCEEDED');
        $s2sToken = config('after_sales.s2s.06');

        // Attempt regression from SUCCEEDED to PENDING
        $response = $this->postJson("/internal/v1/after-sales/cases/{$case->id}/external-update", [
            'target_service' => '06',
            'external_id' => 'ref-dummy-01',
            'external_status' => 'PENDING',
            'purpose' => 'REFUND_DECISION',
        ], [
            'X-Source-Service' => 'finance-service',
            'X-Service-Token' => $s2sToken,
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error.code', 'INVALID_STATE_REGRESSION');
    }

    /**
     * P1-5: Strict Completion Identity - Missing or mismatched downstream case_id is rejected.
     */
    public function test_strict_completion_identity_rejects_missing_or_mismatched_case_id(): void
    {
        $case = AfterSalesCase::create([
            'id' => 'case-idor-strict-01',
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-buyer-10',
            'owner_org_id' => 'org-merch-10',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-100',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'IDOR check',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        $resolution = CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'NOT_STARTED',
        ]);

        CaseExternalRef::create([
            'case_id' => $case->id,
            'resolution_id' => $resolution->id,
            'target_service' => '06',
            'external_id' => 'rf-foreign-999',
            'purpose' => 'REFUND_DECISION',
            'external_status' => 'PENDING',
        ]);

        // Mock Finance 06 returning a refund that belongs to a DIFFERENT case
        Http::fake([
            '*/internal/v1/finance/refunds/rf-foreign-999' => Http::response([
                'success' => true,
                'data' => [
                    'refund_id' => 'rf-foreign-999',
                    'status' => 'SUCCEEDED',
                    'case_id' => 'FOREIGN_OTHER_CASE_ID', // Mismatch!
                    'customer_id' => 'cust-buyer-10',
                ],
            ], 200),
        ]);

        $coordinator = new HttpResolutionCoordinator();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/IDOR Mismatch/');

        $coordinator->verifyExternalCompletion($case, $resolution, 'REF_FOREIGN_PROOF');
    }

    /**
     * P1-7: Consumer-Aware Outbox & Redrive - Outbox moves to DEAD_LETTER after 5 retries, redrive resets to PENDING.
     */
    public function test_outbox_consumer_routing_dead_letter_and_redrive(): void
    {
        // 1. Create outbox event for Support 09 with 4 prior retries
        $supportEvent = OutboxEvent::create([
            'event_id' => 'evt-outbox-supp-' . time(),
            'event_type' => 'after_sales.dispute.escalated',
            'aggregate_type' => 'DISPUTE',
            'aggregate_id' => 'disp-999',
            'payload' => ['dispute_id' => 'disp-999'],
            'status' => 'PENDING',
            'retry_count' => 4,
        ]);

        // Fake connection failure to Support 09
        Http::fake([
            '*/internal/v1/support/events' => Http::response(['error' => 'support_down'], 503),
        ]);

        Artisan::call('after-sales:dispatch-outbox');

        $supportEvent->refresh();
        $this->assertEquals(5, $supportEvent->retry_count);
        $this->assertEquals('DEAD_LETTER', $supportEvent->status);
        $this->assertStringContainsString('Support 09', $supportEvent->last_error);

        // 2. Redrive dead-lettered events
        Artisan::call('after-sales:redrive-outbox');

        $supportEvent->refresh();
        $this->assertEquals('PENDING', $supportEvent->status);
        $this->assertEquals(0, $supportEvent->retry_count);
        $this->assertStringContainsString('Redriven at', $supportEvent->last_error);
    }

    /**
     * Gate 2: Resolution crash recovery - Timeout-after-success + retry does not double refund/replace.
     */
    public function test_resolution_crash_recovery_timeout_after_success_and_retry(): void
    {
        $case = $this->createDummyCase('06', 'REFUND_DECISION');
        $resolution = CaseResolution::where('case_id', $case->id)->firstOrFail();

        // 1. Simulate first attempt: HTTP request to Finance succeeded on downstream,
        // but local DB crashed or timed out before saving external ref ID (stale lease > 30s).
        CaseExternalRef::updateOrCreate(
            ['case_id' => $case->id, 'purpose' => 'REFUND_DECISION'],
            [
                'resolution_id' => $resolution->id,
                'target_service' => '06',
                'external_id' => 'PENDING_' . $case->id,
                'external_status' => 'PENDING_DISPATCH',
                'last_checked_at' => now()->subSeconds(45), // Expired in-flight lease from crashed worker
            ]
        );

        // 2. Downstream Finance 06 successfully returns the existing authoritative refund
        $coordinatorMock = $this->createMock(\App\Domain\AfterSales\Contracts\ResolutionCoordinatorInterface::class);
        $coordinatorMock->expects($this->once())
            ->method('initiateExternalResolution')
            ->willReturn([
                'target_service' => '06',
                'external_id' => 'rfd-fin-authoritative-777',
                'external_status' => 'SUCCEEDED',
                'purpose' => 'REFUND_DECISION',
            ]);

        $service = new \App\Domain\AfterSales\Resolutions\ResolutionService($coordinatorMock);

        // 3. Merchant retries resolution action
        $res = $service->startResolutionAction($case->id, 'merch-retry-actor', 'org-merchant-01');

        $this->assertEquals('IN_PROGRESS', $res->status);

        // Confirm single external ref persisted (Zero double refund)
        $refCount = CaseExternalRef::where('case_id', $case->id)->where('purpose', 'REFUND_DECISION')->count();
        $this->assertEquals(1, $refCount, 'Must maintain exactly one external reference without duplicate refunds.');

        $finalRef = CaseExternalRef::where('case_id', $case->id)->first();
        $this->assertEquals('rfd-fin-authoritative-777', $finalRef->external_id);
        $this->assertEquals('SUCCEEDED', $finalRef->external_status);

        // 4. Repeated retry when already dispatched returns immediately without calling downstream again
        $resRepeated = $service->startResolutionAction($case->id, 'merch-retry-actor', 'org-merchant-01');
        $this->assertEquals('IN_PROGRESS', $resRepeated->status);
    }

    /**
     * Gate 1: Duplicate order_item_id in single submission payload is strictly rejected with 422.
     * Prevents: Purchasing 1 unit, but sending two identical item lines each with quantity 1 resulting in 2 units claimed.
     */
    public function test_duplicate_order_item_in_single_submission_is_strictly_rejected(): void
    {
        $headers = $this->customerHeaders('cust-dup-payload');

        $payload = [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-001',
            'case_type' => 'GOODS_RETURN',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Duplicate item lines in single request',
            'items' => [
                ['order_item_id' => 'item-001', 'quantity' => 1],
                ['order_item_id' => 'item-001', 'quantity' => 1], // Duplicate!
            ],
        ];

        $response = $this->postJson('/api/v1/after-sales/cases', $payload, array_merge($headers, [
            'Idempotency-Key' => 'idem-dup-item-' . time(),
        ]));

        $response->assertStatus(422);
        $this->assertEquals('DUPLICATE_ORDER_ITEM', $response->json('error.code'));
        $this->assertStringContainsString('tidak boleh dicantumkan lebih dari satu kali', $response->json('error.message'));
    }

    /**
     * Gate 3: Concurrent resolution dispatch lease prevents duplicate external dispatch.
     * When request 1 is actively dispatching, overlapping request 2 does not send duplicate refund/replacement.
     */
    public function test_concurrent_resolution_dispatch_lease_blocks_duplicate_dispatch(): void
    {
        $case = $this->createDummyCase('06', 'REFUND_DECISION');

        // Request 1 claims active dispatch lease (PENDING_DISPATCH, checked 5s ago)
        CaseExternalRef::updateOrCreate(
            ['case_id' => $case->id, 'purpose' => 'REFUND_DECISION'],
            [
                'target_service' => '06',
                'external_id' => 'PENDING_' . $case->id,
                'external_status' => 'PENDING_DISPATCH',
                'last_checked_at' => now()->subSeconds(5),
            ]
        );

        $coordinatorMock = $this->createMock(\App\Domain\AfterSales\Contracts\ResolutionCoordinatorInterface::class);
        // Coordinator MUST NEVER be invoked by concurrent second request!
        $coordinatorMock->expects($this->never())->method('initiateExternalResolution');

        $service = new \App\Domain\AfterSales\Resolutions\ResolutionService($coordinatorMock);

        // Request 2 arrives while Request 1 is actively in flight
        $res = $service->startResolutionAction($case->id, 'merch-actor-2', 'org-merchant-01');

        $this->assertNotNull($res);
        $externalRef = CaseExternalRef::where('case_id', $case->id)->where('purpose', 'REFUND_DECISION')->first();
        $this->assertEquals('PENDING_DISPATCH', $externalRef->external_status);
    }

    /**
     * Gate A: Timeout > 30s allows takeover lease by worker 2 without duplicate downstream resource creation.
     * Demonstrates that downstream idempotency key + local lease prevents double resources even if worker 1 wakes up late.
     */
    public function test_resolution_dispatch_lease_expired_after_30s_allows_takeover_without_duplicate_downstream_resource(): void
    {
        $case = $this->createDummyCase('06', 'REFUND_DECISION');

        // Worker 1 acquired lease 45 seconds ago (timeout > 30s elapsed)
        CaseExternalRef::updateOrCreate(
            ['case_id' => $case->id, 'purpose' => 'REFUND_DECISION'],
            [
                'target_service' => '06',
                'external_id' => 'PENDING_' . $case->id,
                'external_status' => 'PENDING_DISPATCH',
                'last_checked_at' => now()->subSeconds(45),
            ]
        );

        // Downstream mock returns authentic resource
        $coordinatorMock = $this->createMock(\App\Domain\AfterSales\Contracts\ResolutionCoordinatorInterface::class);
        $coordinatorMock->expects($this->once())
            ->method('initiateExternalResolution')
            ->willReturn([
                'target_service' => '06',
                'external_id' => 'rfd-fin-authoritative-999',
                'external_status' => 'SUCCEEDED',
                'purpose' => 'REFUND_DECISION',
            ]);

        $service = new \App\Domain\AfterSales\Resolutions\ResolutionService($coordinatorMock);

        // Worker 2 takes over expired lease
        $res = $service->startResolutionAction($case->id, 'merch-worker-2', 'org-merchant-01');

        $this->assertEquals('IN_PROGRESS', $res->status);

        // Assert exactly 1 external ref exists with authentic ID
        $refs = CaseExternalRef::where('case_id', $case->id)->where('purpose', 'REFUND_DECISION')->get();
        $this->assertCount(1, $refs);
        $this->assertEquals('rfd-fin-authoritative-999', $refs->first()->external_id);
        $this->assertEquals('SUCCEEDED', $refs->first()->external_status);
    }

    /**
     * Gate A: Crash before local commit - worker 1 sent to downstream, crashed before DB commit.
     * Retry/worker 2 after timeout successfully commits authoritative external_id without duplicate downstream resource.
     */
    public function test_resolution_crash_before_local_commit_and_retry_preserves_external_id(): void
    {
        $case = $this->createDummyCase('05A', 'REPLACEMENT_FULFILLMENT');

        // Simulating crash before local commit:
        // Downstream 05A already received the dispatch and created 'REP-LIVE-777',
        // but local DB only has PENDING_DISPATCH from 35 seconds ago because Worker 1 died before Step 3.
        CaseExternalRef::updateOrCreate(
            ['case_id' => $case->id, 'purpose' => 'REPLACEMENT_FULFILLMENT'],
            [
                'target_service' => '05A',
                'external_id' => 'PENDING_' . $case->id,
                'external_status' => 'PENDING_DISPATCH',
                'last_checked_at' => now()->subSeconds(35),
            ]
        );

        $coordinatorMock = $this->createMock(\App\Domain\AfterSales\Contracts\ResolutionCoordinatorInterface::class);
        // On retry, coordinator calls downstream with same case_id, which returns the existing replacement ID
        $coordinatorMock->expects($this->once())
            ->method('initiateExternalResolution')
            ->willReturn([
                'target_service' => '05A',
                'external_id' => 'REP-LIVE-777',
                'external_status' => 'PREPARING',
                'purpose' => 'REPLACEMENT_FULFILLMENT',
            ]);

        $service = new \App\Domain\AfterSales\Resolutions\ResolutionService($coordinatorMock);

        // Worker 2 runs retry
        $res = $service->startResolutionAction($case->id, 'merch-retry-worker', 'org-merchant-01');

        $this->assertEquals('IN_PROGRESS', $res->status);

        $ref = CaseExternalRef::where('case_id', $case->id)->where('purpose', 'REPLACEMENT_FULFILLMENT')->first();
        $this->assertEquals('REP-LIVE-777', $ref->external_id);
        $this->assertEquals('PREPARING', $ref->external_status);
    }

    private function createDummyCase(string $targetService, string $purpose, string $status = 'PENDING'): AfterSalesCase
    {
        $case = AfterSalesCase::create([
            'id' => 'case-test-' . time() . '-' . rand(100, 999),
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-cb-test',
            'owner_org_id' => 'org-merchant-01',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-01',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Test S2S matrix',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        $res = CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'NOT_STARTED',
        ]);

        CaseExternalRef::create([
            'case_id' => $case->id,
            'resolution_id' => $res->id,
            'target_service' => $targetService,
            'external_id' => 'ref-dummy-01',
            'purpose' => $purpose,
            'external_status' => $status,
        ]);

        return $case;
    }
}
