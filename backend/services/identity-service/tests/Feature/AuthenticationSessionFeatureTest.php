<?php

namespace Tests\Feature;

use App\Models\AuthSession;
use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class AuthenticationSessionFeatureTest extends TestCase
{
    use DatabaseTransactions;

    public function test_login_with_valid_canonical_credentials_succeeds(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'customer@servio.id',
            'password' => '12345678',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_LOGIN_SUCCESS',
            ])
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'session' => ['id', 'expires_at'],
                    'user' => ['id', 'email', 'fullName', 'role', 'status'],
                    'roles',
                    'active_context' => ['role_assignment_id', 'role'],
                    'permissions',
                ],
            ]);

        $this->assertEquals('customer@servio.id', $response->json('data.user.email'));
        $this->assertEquals('CUSTOMER', $response->json('data.active_context.role'));
    }

    public function test_login_with_invalid_password_fails(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'customer@servio.id',
            'password' => 'WrongPassword999',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_INVALID_CREDENTIALS',
            ]);
    }

    public function test_authenticated_user_can_access_auth_me_endpoint(): void
    {
        $user = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($user, 'CUSTOMER');

        $response = $this->withHeaders($auth['headers'])
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_CONTEXT_LOADED',
                'data' => [
                    'user' => [
                        'email' => 'customer@servio.id',
                    ],
                ],
            ]);
    }

    public function test_user_can_switch_context_to_assigned_role(): void
    {
        $user = User::where('email', 'customer@servio.id')->firstOrFail();

        // Assign a second role to test context switching
        $spRole = Role::where('code', 'SERVICE_PROVIDER')->firstOrFail();
        $assignment = RoleAssignment::create([
            'user_id' => $user->id,
            'role_id' => $spRole->id,
            'status' => 'ACTIVE',
            'assigned_at' => now(),
        ]);

        $auth = $this->authenticateAs($user, 'CUSTOMER');

        $response = $this->withHeaders($auth['headers'])
            ->patchJson('/api/v1/auth/context', [
                'role_assignment_id' => $assignment->id,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_CONTEXT_SWITCHED',
                'data' => [
                    'active_context' => [
                        'role' => 'SERVICE_PROVIDER',
                    ],
                ],
            ]);
    }

    public function test_user_cannot_switch_context_to_unassigned_or_other_users_role(): void
    {
        $user = User::where('email', 'customer@servio.id')->firstOrFail();
        $otherUser = User::where('email', 'provider@servio.id')->firstOrFail();

        $otherAssignment = RoleAssignment::where('user_id', $otherUser->id)->firstOrFail();

        $auth = $this->authenticateAs($user, 'CUSTOMER');

        $response = $this->withHeaders($auth['headers'])
            ->patchJson('/api/v1/auth/context', [
                'role_assignment_id' => $otherAssignment->id,
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_PERMISSION_DENIED',
            ]);
    }

    public function test_logout_revokes_session(): void
    {
        $user = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($user, 'CUSTOMER');

        $logoutRes = $this->withHeaders($auth['headers'])
            ->postJson('/api/v1/auth/logout');

        $logoutRes->assertStatus(204);

        // Verify session revoked in database
        $session = AuthSession::where('session_id', $auth['token'])->first();
        $this->assertNotNull($session->revoked_at);

        // Subsequent /auth/me with that bearer token fails with 401
        $meRes = $this->withHeaders($auth['headers'])->getJson('/api/v1/auth/me');
        $meRes->assertStatus(401);
    }

    public function test_user_can_change_password_with_valid_current_password(): void
    {
        $user = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($user, 'CUSTOMER');

        $changeRes = $this->withHeaders($auth['headers'])
            ->postJson('/api/v1/auth/password/change', [
                'current_password' => '12345678',
                'new_password' => 'NewSecurePassword2026!',
                'new_password_confirmation' => 'NewSecurePassword2026!',
            ]);

        $changeRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_PASSWORD_CHANGED',
            ]);

        // Attempt login with new password
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'customer@servio.id',
            'password' => 'NewSecurePassword2026!',
        ]);

        $loginRes->assertStatus(200);
    }
}
