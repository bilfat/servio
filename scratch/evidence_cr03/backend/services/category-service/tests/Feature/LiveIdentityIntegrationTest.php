<?php

namespace Tests\Feature;

use App\Infrastructure\Identity\IdentityServiceClient;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LiveIdentityIntegrationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Explicitly reset fake to test against real live Identity Service instance (port 8001)
        IdentityServiceClient::resetFake();
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
     * Test fail-closed behavior when Identity Service denies permissions or lacks category permissions
     */
    public function test_live_identity_permission_check_fail_closed_for_category_permissions(): void
    {
        $client = app(IdentityServiceClient::class);

        // Evaluate unseeded permission 'category.taxonomy.create' for a dummy user against live Identity Service
        $authzResult = $client->evaluateAuthorization(
            actorUserId: '00000000-0000-0000-0000-000000000001',
            permission: 'category.taxonomy.create'
        );

        $this->assertIsArray($authzResult);
        $this->assertFalse($authzResult['allow'], 'Evaluasi otorisasi permission yang belum terdaftar di Identity Service harus fail-closed (allow: false).');
        $this->assertNotEmpty($authzResult['reason_code'], 'Evaluasi otorisasi harus mengembalikan reason code penolakan.');
    }

    /**
     * Test M2M security: Identity Service rejects unauthorized internal caller
     */
    public function test_live_identity_m2m_rejects_unauthorized_service_key(): void
    {
        $baseUrl = rtrim((string) env('IDENTITY_INTERNAL_BASE_URL', 'http://127.0.0.1:8001'), '/');

        // Call Identity internal evaluate endpoint with an invalid service key
        $response = Http::withHeaders([
            'X-Internal-Service-Key' => 'invalid_unauthorized_key_999',
            'Accept' => 'application/json',
        ])->post("{$baseUrl}/internal/v1/authorization/evaluate", [
            'actor_user_id' => '00000000-0000-0000-0000-000000000001',
            'permission' => 'category.taxonomy.create',
        ]);

        // Must be rejected with 403 Forbidden by Identity Service
        $this->assertEquals(403, $response->status(), 'Identity Service harus menolak panggilan internal dengan M2M key yang tidak sah (403 Forbidden).');
    }
}
