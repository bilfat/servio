<?php

namespace Tests\Feature;

use App\Infrastructure\Identity\IdentityServiceClient;
use App\Models\Category;
use App\Models\CategoryMaster;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class LiveIdentityIntegrationTest extends TestCase
{
    use DatabaseTransactions;

    protected string $identityUrl;
    protected string $internalKey;

    protected function setUp(): void
    {
        parent::setUp();
        // Explicitly reset fake to test against real live Identity Service instance (port 8001)
        IdentityServiceClient::resetFake();
        $this->identityUrl = rtrim((string) env('IDENTITY_INTERNAL_BASE_URL', 'http://127.0.0.1:8001'), '/');
        $this->internalKey = env('CATEGORY_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026');
    }

    /**
     * Test live HTTP communication with running Identity Service (port 8001)
     */
    public function test_live_identity_service_introspect_session(): void
    {
        $client = app(IdentityServiceClient::class);

        // Test introspecting an invalid session reference against live Identity Service -> returns null
        $result = $client->introspectSession('invalid_dummy_session_ref_12345');
        $this->assertNull($result, 'Introspect session tidak valid pada Identity Service nyata harus mengembalikan null.');
    }

    /**
     * Test fail-closed behavior when Identity Service denies permissions for unknown user
     */
    public function test_live_identity_permission_check_fail_closed_for_unknown_user(): void
    {
        $client = app(IdentityServiceClient::class);

        $authzResult = $client->evaluateAuthorization(
            actorUserId: '00000000-0000-0000-0000-000000000001',
            permission: 'category.taxonomy.create'
        );

        $this->assertIsArray($authzResult);
        $this->assertFalse($authzResult['allow'], 'Evaluasi otorisasi user tidak dikenal pada Identity Service harus fail-closed (allow: false).');
        $this->assertNotEmpty($authzResult['reason_code'], 'Evaluasi otorisasi harus mengembalikan reason code penolakan.');
    }

    /**
     * Test M2M security: Identity Service rejects unauthorized internal caller
     */
    public function test_live_identity_m2m_rejects_unauthorized_service_key(): void
    {
        // Call Identity internal evaluate endpoint with an invalid service key
        $response = Http::withHeaders([
            'X-Internal-Service-Key' => 'invalid_unauthorized_key_999',
            'Accept' => 'application/json',
        ])->post("{$this->identityUrl}/internal/v1/authorization/evaluate", [
            'actor_user_id' => '00000000-0000-0000-0000-000000000001',
            'permission' => 'category.taxonomy.create',
        ]);

        // Must be rejected with 403 Forbidden by Identity Service
        $this->assertEquals(403, $response->status(), 'Identity Service harus menolak panggilan internal dengan M2M key yang tidak sah (403 Forbidden).');
    }

    /**
     * Requirement 5: End-to-End Positive Integration Flow
     * 1. User login via Identity Service (Admin Operations)
     * 2. Identity verifies credentials & issues session with active role assignment
     * 3. Category Service receives trusted gateway actor headers
     * 4. Category Service evaluates category.taxonomy.create via live Identity Service
     * 5. Identity returns allow: true (POLICY_ALLOW)
     * 6. Category Service permits operation and category is created!
     */
    public function test_live_end_to_end_identity_login_and_admin_category_creation(): void
    {
        // 1. User login using Identity Service
        $loginResponse = Http::post("{$this->identityUrl}/api/v1/auth/login", [
            'identifier' => 'admin@servio.id',
            'password' => '12345678',
        ]);

        $this->assertEquals(200, $loginResponse->status(), 'Login admin ke Identity Service harus sukses');
        $loginData = $loginResponse->json('data');
        $this->assertNotEmpty($loginData['token']);
        $adminUserId = $loginData['user']['id'];
        $roleAssignmentId = $loginData['active_context']['role_assignment_id'];

        // 2. Identity Service session introspection via M2M
        $client = app(IdentityServiceClient::class);
        $sessionInfo = $client->introspectSession($loginData['token']);
        $this->assertNotNull($sessionInfo);
        $this->assertTrue($sessionInfo['active']);
        $this->assertEquals($adminUserId, $sessionInfo['user_id']);

        // 3. Category Service receives trusted gateway context & calls Identity evaluate live
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $categoryName = 'Live Integrated Category ' . Str::random(6);

        $adminHeaders = [
            'X-Gateway-Key' => env('CATEGORY_GATEWAY_KEY', 'servio_local_gateway_key_2026'),
            'X-Actor-User-Id' => $adminUserId,
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
            'X-Actor-Role-Assignment-Id' => $roleAssignmentId,
            'X-Actor-Authz-Version' => 1,
        ];

        // 4, 5, 6. Category Service endpoint with live Identity evaluateAuthorization
        $createResponse = $this->withHeaders($adminHeaders)->postJson('/api/v1/categories', [
            'master_id' => $master->id,
            'name' => $categoryName,
            'description' => 'Kategori hasil integrasi live Identity dan Category Service',
        ]);

        $createResponse->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_CREATED',
                'data' => [
                    'master_id' => $master->id,
                    'name' => $categoryName,
                    'status' => 'ACTIVE',
                ],
            ]);

        $this->assertDatabaseHas('categories', [
            'name' => $categoryName,
            'status' => 'ACTIVE',
        ]);
    }

    /**
     * Requirement 5: End-to-End Negative Integration Flow (CEO cannot create category)
     * 1. CEO login via Identity Service
     * 2. Identity returns CEO active context
     * 3. Category Service evaluates mutation -> Denied with 403 Forbidden!
     */
    public function test_live_end_to_end_ceo_category_mutation_denied(): void
    {
        // 1. Login CEO
        $loginResponse = Http::post("{$this->identityUrl}/api/v1/auth/login", [
            'identifier' => 'ceo@servio.id',
            'password' => '12345678',
        ]);

        $this->assertEquals(200, $loginResponse->status());
        $loginData = $loginResponse->json('data');
        $ceoUserId = $loginData['user']['id'];
        $roleAssignmentId = $loginData['active_context']['role_assignment_id'];

        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $ceoHeaders = [
            'X-Gateway-Key' => env('CATEGORY_GATEWAY_KEY', 'servio_local_gateway_key_2026'),
            'X-Actor-User-Id' => $ceoUserId,
            'X-Actor-Role' => 'CEO_PRODUCT_OWNER',
            'X-Actor-Role-Assignment-Id' => $roleAssignmentId,
            'X-Actor-Authz-Version' => 1,
        ];

        // 2. Attempt mutation -> Must be rejected with 403
        $response = $this->withHeaders($ceoHeaders)->postJson('/api/v1/categories', [
            'master_id' => $master->id,
            'name' => 'CEO Illegal Category ' . Str::random(6),
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_PERMISSION_DENIED',
            ]);
    }

    /**
     * Requirement 5: End-to-End Negative Integration Flow (Customer cannot create category)
     * 1. Customer login via Identity Service
     * 2. Customer attempts category mutation -> Denied with 403 Forbidden!
     */
    public function test_live_end_to_end_customer_category_mutation_denied(): void
    {
        $loginResponse = Http::post("{$this->identityUrl}/api/v1/auth/login", [
            'identifier' => 'customer@servio.id',
            'password' => '12345678',
        ]);

        $this->assertEquals(200, $loginResponse->status());
        $loginData = $loginResponse->json('data');
        $customerUserId = $loginData['user']['id'];

        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $customerHeaders = [
            'X-Gateway-Key' => env('CATEGORY_GATEWAY_KEY', 'servio_local_gateway_key_2026'),
            'X-Actor-User-Id' => $customerUserId,
            'X-Actor-Role' => 'CUSTOMER',
            'X-Actor-Authz-Version' => 1,
        ];

        $response = $this->withHeaders($customerHeaders)->postJson('/api/v1/categories', [
            'master_id' => $master->id,
            'name' => 'Customer Illegal Category ' . Str::random(6),
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_PERMISSION_DENIED',
            ]);
    }
}
