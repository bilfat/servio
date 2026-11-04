<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Middleware\HandleOrderJasaIdempotency;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class IdempotencyPersistenceFailureTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        try {
            DB::statement('DROP TRIGGER IF EXISTS trigger_fail_idempotency_completed');
            DB::table('idempotency_records')->delete();
        } catch (\Throwable $ignore) {}
    }

    protected function tearDown(): void
    {
        try {
            DB::statement('DROP TRIGGER IF EXISTS trigger_fail_idempotency_completed');
            DB::table('idempotency_records')->delete();
        } catch (\Throwable $ignore) {}

        parent::tearDown();
    }

    /**
     * Item A: Deterministic fault injection on finalization persistence.
     * Response MUST NOT be 200/201. Must be 503 ORDER_JASA_IDEMPOTENCY_PERSISTENCE_FAILED.
     * Record MUST transition to RECONCILIATION_REQUIRED.
     * Retries MUST NOT create duplicates or execute downstream again.
     */
    public function test_persistence_failure_during_finalization_fails_closed_and_marks_reconciliation(): void
    {
        $idempotencyKey = 'idemp-fault-inject-persist-01';
        $actorId = 'CUST-FAIL-01';

        $request = Request::create('/api/v1/order-jasa/orders', 'POST', ['service' => 'ac-test']);
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

        $downstreamExecuted = false;

        // 1. First execution: downstream sets trigger so finalization update fails
        $response = $middleware->handle($request, function ($req) use (&$downstreamExecuted) {
            $downstreamExecuted = true;
            $req->attributes->set('idempotency_has_side_effect', true);

            // Injected fault: Trigger fires ONLY when attempting to update state to 'COMPLETED'
            DB::statement("
                CREATE TRIGGER trigger_fail_idempotency_completed
                BEFORE UPDATE ON idempotency_records
                FOR EACH ROW
                BEGIN
                    IF NEW.state = 'COMPLETED' THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Deterministic simulated persistence failure during finalization';
                    END IF;
                END;
            ");

            return ApiResponse::success(['order_id' => 'ORDER-FAULT-001'], 201);
        });

        // 2. Assertions on failed finalization
        $this->assertTrue($downstreamExecuted, 'Downstream was executed before finalization failure');
        $this->assertEquals(503, $response->getStatusCode(), 'Must fail-closed with 503, NEVER 200 or 201');

        $body = json_decode((string) $response->getContent(), true);
        $this->assertFalse($body['success']);
        $this->assertEquals('ORDER_JASA_IDEMPOTENCY_PERSISTENCE_FAILED', $body['error']['code']);

        // 3. Verify record was marked RECONCILIATION_REQUIRED in database
        $record = DB::table('idempotency_records')
            ->where('key_hash', hash('sha256', $idempotencyKey))
            ->first();

        $this->assertNotNull($record, 'Idempotency record must exist');
        $this->assertEquals('RECONCILIATION_REQUIRED', $record->state);
        $this->assertEquals('PERSISTENCE_FAILURE_AFTER_EXECUTION', $record->recovery_state);

        // 4. Clean up trigger before retry test
        DB::statement('DROP TRIGGER IF EXISTS trigger_fail_idempotency_completed');

        // 5. Retry with the SAME Idempotency-Key
        $retryExecuted = false;
        $retryRequest = Request::create('/api/v1/order-jasa/orders', 'POST', ['service' => 'ac-test']);
        $retryRequest->headers->set('Idempotency-Key', $idempotencyKey);
        $retryRequest->headers->set('X-Gateway-Key', 'test_only_gateway_key_isolated_05b');
        $retryRequest->headers->set('X-Actor-User-Id', $actorId);
        $retryRequest->headers->set('X-Actor-Role', 'CUSTOMER');
        $retryRequest->attributes->set('actor', $actor);

        $retryResponse = $middleware->handle($retryRequest, function () use (&$retryExecuted) {
            $retryExecuted = true;
            return ApiResponse::success(['order_id' => 'ORDER-DUPLICATE-RETRY'], 201);
        });

        // Downstream MUST NOT be executed again!
        $this->assertFalse($retryExecuted, 'Downstream must NEVER be re-executed on ambiguous reconciliation required state');
        $this->assertEquals(409, $retryResponse->getStatusCode());
        $retryBody = json_decode((string) $retryResponse->getContent(), true);
        $this->assertEquals('ORDER_JASA_IDEMPOTENCY_RECONCILIATION_REQUIRED', $retryBody['error']['code']);
    }

    /**
     * Item B: 5xx after side effect MUST NOT be marked FAILED_RETRYABLE.
     * It must be marked RECONCILIATION_REQUIRED with 5XX_AFTER_SIDE_EFFECT.
     */
    public function test_5xx_after_side_effect_transitions_to_reconciliation_required_not_retryable(): void
    {
        $idempotencyKey = 'idemp-side-effect-500-01';
        $actorId = 'CUST-SE-01';

        $request = Request::create('/api/v1/order-jasa/orders', 'POST', ['action' => 'pay']);
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

        $response = $middleware->handle($request, function ($req) {
            // Downstream records that external/DB side-effects have occurred (e.g. Finance invoice created)
            $req->attributes->set('idempotency_has_side_effect', true);
            // But downstream returned 502/500 (e.g. downstream network timeout after invoice creation)
            return ApiResponse::error('FINANCE_DOWNSTREAM_TIMEOUT', 'Finance timeout after invoice created', 502);
        });

        $this->assertEquals(502, $response->getStatusCode());

        // Check DB state
        $record = DB::table('idempotency_records')
            ->where('key_hash', hash('sha256', $idempotencyKey))
            ->first();

        $this->assertNotNull($record);
        $this->assertEquals('RECONCILIATION_REQUIRED', $record->state);
        $this->assertEquals('5XX_AFTER_SIDE_EFFECT', $record->recovery_state);

        // Retry must be blocked with 409
        $retryExecuted = false;
        $retryResponse = $middleware->handle($request, function () use (&$retryExecuted) {
            $retryExecuted = true;
            return ApiResponse::success(['status' => 'OK']);
        });

        $this->assertFalse($retryExecuted);
        $this->assertEquals(409, $retryResponse->getStatusCode());
    }

    /**
     * Item B: Unhandled exception after side effect transitions to RECONCILIATION_REQUIRED.
     */
    public function test_exception_after_side_effect_transitions_to_reconciliation_required(): void
    {
        $idempotencyKey = 'idemp-side-effect-exc-01';
        $actorId = 'CUST-EXC-01';

        $request = Request::create('/api/v1/order-jasa/orders', 'POST', ['action' => 'process']);
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

        try {
            $middleware->handle($request, function ($req) {
                $req->attributes->set('idempotency_has_side_effect', true);
                throw new \RuntimeException('Database committed but downstream cache worker crashed');
            });
            $this->fail('Expected exception was not thrown');
        } catch (\RuntimeException $e) {
            $this->assertEquals('Database committed but downstream cache worker crashed', $e->getMessage());
        }

        $record = DB::table('idempotency_records')
            ->where('key_hash', hash('sha256', $idempotencyKey))
            ->first();

        $this->assertNotNull($record);
        $this->assertEquals('RECONCILIATION_REQUIRED', $record->state);
        $this->assertEquals('EXCEPTION_AFTER_SIDE_EFFECT', $record->recovery_state);
    }

    /**
     * Test acquisition failure when DB connection fails -> 503 ORDER_JASA_IDEMPOTENCY_STORAGE_ERROR
     */
    public function test_db_outage_before_acquire_fails_closed_with_503(): void
    {
        $idempotencyKey = 'idemp-db-outage-001';
        $actorId = 'CUST-OUTAGE-01';

        // Disconnect DB connection and configure invalid port on localhost (immediate connection refused)
        config(['database.connections.mysql.host' => '127.0.0.1']);
        config(['database.connections.mysql.port' => 65534]);
        DB::purge('mysql');

        $request = Request::create('/api/v1/order-jasa/orders', 'POST', ['service' => 'ac-test']);
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

        $response = $middleware->handle($request, function () {
            // Downstream must NEVER be reached during DB outage
            $this->fail('Downstream must not be executed during idempotency storage outage');
        });

        // Assert fail-closed 503
        $this->assertEquals(503, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true);
        $this->assertEquals('ORDER_JASA_IDEMPOTENCY_STORAGE_ERROR', $body['error']['code'] ?? null);

        // Restore DB connection
        config(['database.connections.mysql.host' => '127.0.0.1']);
        config(['database.connections.mysql.port' => 3306]);
        DB::purge('mysql');
    }
}
