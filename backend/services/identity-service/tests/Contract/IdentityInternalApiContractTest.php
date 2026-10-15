<?php

namespace Tests\Contract;

use App\Models\AuthSession;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class IdentityInternalApiContractTest extends TestCase
{
    use DatabaseTransactions;

    private string $internalKey = 'testing_internal_service_key_2026';

    public function test_accessing_internal_endpoint_without_key_fails_403(): void
    {
        $response = $this->postJson('/api/internal/v1/auth/sessions/introspect', [
            'session_reference' => 'any_token',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_PERMISSION_DENIED',
            ]);
    }

    public function test_accessing_internal_endpoint_with_invalid_key_fails_403(): void
    {
        $response = $this->withHeaders(['X-Internal-Service-Key' => 'wrong_invalid_key'])
            ->postJson('/api/internal/v1/auth/sessions/introspect', [
                'session_reference' => 'any_token',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_PERMISSION_DENIED',
            ]);
    }

    public function test_introspect_session_with_valid_key_returns_active_status(): void
    {
        $user = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($user, 'CUSTOMER');

        $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/api/internal/v1/auth/sessions/introspect', [
                'session_reference' => $auth['token'],
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_SESSION_ACTIVE',
                'data' => [
                    'active' => true,
                    'user_id' => $user->id,
                ],
            ]);
    }

    public function test_evaluate_authorization_checks_permission_policy(): void
    {
        $admin = User::where('email', 'admin@servio.id')->firstOrFail();
        $customer = User::where('email', 'customer@servio.id')->firstOrFail();

        // Admin has identity.business.application.review -> allow = true
        $adminRes = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/api/internal/v1/authorization/evaluate', [
                'actor_user_id' => $admin->id,
                'permission' => 'identity.business.application.review',
            ]);

        $adminRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'allow' => true,
                    'reason_code' => 'POLICY_ALLOW',
                ],
            ]);

        // Customer does not have identity.business.application.review -> allow = false
        $customerRes = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/api/internal/v1/authorization/evaluate', [
                'actor_user_id' => $customer->id,
                'permission' => 'identity.business.application.review',
            ]);

        $customerRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'allow' => false,
                    'reason_code' => 'PERMISSION_NOT_GRANTED',
                ],
            ]);
    }

    public function test_get_user_access_context_returns_roles_and_memberships(): void
    {
        $provider = User::where('email', 'provider@servio.id')->firstOrFail();

        $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->getJson("/api/internal/v1/users/{$provider->id}/access-context");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_ACCESS_CONTEXT_LOADED',
                'data' => [
                    'user_id' => $provider->id,
                    'status' => 'ACTIVE',
                ],
            ]);
    }

    public function test_get_organization_status_returns_valid_organization(): void
    {
        $org = Organization::firstOrFail();

        $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->getJson("/api/internal/v1/organizations/{$org->id}/status");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_ORGANIZATION_STATUS_LOADED',
                'data' => [
                    'organization_id' => $org->id,
                    'status' => $org->status,
                ],
            ]);
    }
}
