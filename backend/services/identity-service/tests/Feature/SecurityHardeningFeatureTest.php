<?php

namespace Tests\Feature;

use App\Models\AuthSession;
use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class TestStrictCsrfMiddleware extends \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken
{
    protected function runningUnitTests()
    {
        return false;
    }
}

class SecurityHardeningFeatureTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * S01: CSRF Protection - Stateful request without CSRF is rejected with 419
     */
    public function test_stateful_post_without_csrf_token_is_rejected_419(): void
    {
        config(['sanctum.middleware.validate_csrf_token' => TestStrictCsrfMiddleware::class]);

        $response = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
            'Accept' => 'application/json',
        ])->postJson('/api/v1/auth/login', [
            'identifier' => 'customer@servio.id',
            'password' => '12345678',
        ]);

        $response->assertStatus(419)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_CSRF_TOKEN_MISMATCH',
            ]);
    }

    /**
     * S02: CSRF Protection - Stateful request with valid CSRF token succeeds
     */
    public function test_stateful_post_with_valid_csrf_token_succeeds(): void
    {
        // 1. Fetch CSRF cookie to initialize session
        $csrfResponse = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->get('/sanctum/csrf-cookie');

        $csrfResponse->assertStatus(204);

        $token = csrf_token();

        // 2. Perform stateful mutating request with X-XSRF-TOKEN / X-CSRF-TOKEN
        $response = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
            'X-CSRF-TOKEN' => $token,
            'Accept' => 'application/json',
        ])->postJson('/api/v1/auth/login', [
            'identifier' => 'customer@servio.id',
            'password' => '12345678',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_LOGIN_SUCCESS',
            ]);
    }

    /**
     * S03: Password Security - Wrong password strictly rejected across demo accounts
     */
    public function test_wrong_password_strictly_rejected_across_demo_accounts(): void
    {
        $demoEmails = [
            'customer@servio.id',
            'provider@servio.id',
            'merchant@servio.id',
            'supplier@servio.id',
            'worker@servio.id',
            'support@servio.id',
            'finance@servio.id',
            'admin@servio.id',
            'ceo@servio.id',
        ];

        foreach ($demoEmails as $email) {
            $response = $this->postJson('/api/v1/auth/login', [
                'identifier' => $email,
                'password' => 'WrongPassword!2026',
            ]);

            $response->assertStatus(401)
                ->assertJson([
                    'success' => false,
                    'code' => 'IDENTITY_INVALID_CREDENTIALS',
                ]);
        }
    }

    /**
     * S04: Password Security - No universal fallback password bypass accepted
     */
    public function test_no_universal_fallback_bypass_accepted_for_changed_password(): void
    {
        // Set a distinct custom password on customer account
        $user = User::where('email', 'customer@servio.id')->firstOrFail();
        $user->password_hash = Hash::make('MyNewStrongSecret#2026');
        $user->save();

        // Attempt login using previous default '12345678' - MUST BE REJECTED
        $resDefault = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'customer@servio.id',
            'password' => '12345678',
        ]);
        $resDefault->assertStatus(401)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_INVALID_CREDENTIALS',
            ]);

        // Attempt login using old role-specific password 'ServioCustomer2026!' - MUST BE REJECTED
        $resRole = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'customer@servio.id',
            'password' => 'ServioCustomer2026!',
        ]);
        $resRole->assertStatus(401)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_INVALID_CREDENTIALS',
            ]);

        // Login using actual password hash MUST SUCCEED
        $resValid = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'customer@servio.id',
            'password' => 'MyNewStrongSecret#2026',
        ]);
        $resValid->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_LOGIN_SUCCESS',
            ]);
    }

    /**
     * S05: Unauthorized Session - Invalid or missing token rejected with 401
     */
    public function test_unauthorized_session_rejected_with_401(): void
    {
        // 1. Missing token
        $res1 = $this->getJson('/api/v1/auth/me');
        $res1->assertStatus(401)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_AUTH_UNAUTHENTICATED',
            ]);

        // 2. Non-existent / forged token
        $res2 = $this->withHeaders([
            'Authorization' => 'Bearer forged_token_' . Str::random(32),
        ])->getJson('/api/v1/auth/me');
        $res2->assertStatus(401)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_AUTH_UNAUTHENTICATED',
            ]);
    }

    /**
     * S06: Revoked Session - Revoked session token immediately rejected with 401
     */
    public function test_revoked_session_token_rejected_with_401(): void
    {
        $user = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($user, 'CUSTOMER');
        $token = $auth['token'];

        // Access succeeds while active
        $resBefore = $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->getJson('/api/v1/auth/me');
        $resBefore->assertStatus(200);

        // Revoke the session
        AuthSession::where('session_id', $token)->update(['revoked_at' => now()]);

        // Access must now be rejected 401
        $resAfter = $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->getJson('/api/v1/auth/me');
        $resAfter->assertStatus(401)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_AUTH_UNAUTHENTICATED',
            ]);
    }

    /**
     * S07: Session Fixation Protection - Fresh unique session token generated on login
     */
    public function test_session_fixation_protection_generates_fresh_token_on_login(): void
    {
        $login1 = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'customer@servio.id',
            'password' => '12345678',
        ]);
        $token1 = $login1->json('data.token');

        $login2 = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'customer@servio.id',
            'password' => '12345678',
        ]);
        $token2 = $login2->json('data.token');

        $this->assertNotEmpty($token1);
        $this->assertNotEmpty($token2);
        $this->assertNotEquals($token1, $token2);
    }

    /**
     * S08: Role Escalation - Customer cannot switch context to unassigned admin or operational role
     */
    public function test_role_escalation_by_unassigned_role_switch_rejected(): void
    {
        $user = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($user, 'CUSTOMER');

        // Customer attempts to switch to an unassigned role
        $fakeAdminAssignmentId = (string) Str::uuid();

        $response = $this->withHeaders($auth['headers'])
            ->patchJson('/api/v1/auth/context', [
                'role_assignment_id' => $fakeAdminAssignmentId,
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_PERMISSION_DENIED',
            ]);
    }

    /**
     * S09: Role Escalation - Customer cannot access admin-only endpoints
     */
    public function test_customer_cannot_access_admin_governance_endpoints(): void
    {
        $user = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($user, 'CUSTOMER');

        // Customer attempts to create internal staff (CEO only)
        $resStaff = $this->withHeaders($auth['headers'])
            ->postJson('/api/v1/ceo/staff', [
                'fullName' => 'Malicious Staff',
                'email' => 'malicious@servio.id',
            ]);
        $resStaff->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_PERMISSION_DENIED',
            ]);

        // Customer attempts to suspend a user (Admin Operations only)
        $targetUser = User::where('email', 'provider@servio.id')->firstOrFail();
        $resSuspend = $this->withHeaders($auth['headers'])
            ->postJson("/api/v1/admin/users/{$targetUser->id}/suspend", [
                'reason' => 'Unauthorized attempt',
            ]);
        $resSuspend->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_PERMISSION_DENIED',
            ]);
    }

    /**
     * S10: Cross-Origin Security - Untrusted origin rejected by CORS
     */
    public function test_untrusted_cross_origin_request_is_not_stateful(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'http://attacker-evil-website.com',
            'Accept' => 'application/json',
        ])->get('/api/v1/auth/me');

        // Untrusted origin must not receive Access-Control-Allow-Origin for malicious site
        $allowOrigin = $response->headers->get('Access-Control-Allow-Origin');
        $this->assertNotEquals('http://attacker-evil-website.com', $allowOrigin);
    }
}
