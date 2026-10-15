<?php

namespace Tests\Feature;

use App\Models\AuthSession;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class SuspensionRevocationFeatureTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_can_suspend_user_and_revoke_all_sessions(): void
    {
        $admin = User::where('email', 'admin@servio.id')->firstOrFail();
        $customer = User::where('email', 'customer@servio.id')->firstOrFail();

        // 1. Customer creates an active session
        $custAuth = $this->authenticateAs($customer, 'CUSTOMER');

        // Customer can access /auth/me
        $meResBefore = $this->withHeaders($custAuth['headers'])->getJson('/api/v1/auth/me');
        $meResBefore->assertStatus(200);

        // 2. Admin suspends customer account
        $adminAuth = $this->authenticateAs($admin, 'ADMIN_OPERATIONS');
        $suspendRes = $this->withHeaders($adminAuth['headers'])
            ->postJson("/api/v1/admin/users/{$customer->id}/suspend", [
                'reason' => 'Pelanggaran keamanan dan investigasi fraud.',
            ]);

        $suspendRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_USER_SUSPENDED',
                'data' => [
                    'user_id' => $customer->id,
                    'status' => 'SUSPENDED',
                ],
            ]);

        // 3. Customer's existing bearer token is revoked and returns 401 or 403
        $meResAfter = $this->withHeaders($custAuth['headers'])->getJson('/api/v1/auth/me');
        $meResAfter->assertStatus(401);

        // 4. Customer login attempts are rejected with 403 IDENTITY_ACCOUNT_SUSPENDED
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'customer@servio.id',
            'password' => '12345678',
        ]);

        $loginRes->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_ACCOUNT_SUSPENDED',
            ]);

        // 5. Admin reactivates customer account
        $reactivateRes = $this->withHeaders($adminAuth['headers'])
            ->postJson("/api/v1/admin/users/{$customer->id}/reactivate");

        $reactivateRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_USER_REACTIVATED',
                'data' => [
                    'user_id' => $customer->id,
                    'status' => 'ACTIVE',
                ],
            ]);

        // 6. Customer can login again
        $reLoginRes = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'customer@servio.id',
            'password' => '12345678',
        ]);

        $reLoginRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_LOGIN_SUCCESS',
            ]);
    }
}
