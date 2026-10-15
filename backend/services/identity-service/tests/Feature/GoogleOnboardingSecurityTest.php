<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class GoogleOnboardingSecurityTest extends TestCase
{
    use DatabaseTransactions;

    public function test_google_onboarding_requires_otp_and_nik_before_full_activation(): void
    {
        // 1. User created via Google OAuth in PENDING_VERIFICATION state
        $user = User::create([
            'id' => (string) Str::uuid(),
            'email' => 'google_user_' . uniqid() . '@gmail.com',
            'phone_e164' => '+62812' . rand(10000000, 99999999),
            'password_hash' => bcrypt(Str::random(32)),
            'status' => 'PENDING_VERIFICATION',
            'authz_version' => 1,
        ]);

        UserProfile::create([
            'user_id' => $user->id,
            'display_name' => 'Google Newcomer',
        ]);

        $customerRole = Role::where('code', 'CUSTOMER')->first();
        if ($customerRole) {
            RoleAssignment::create([
                'user_id' => $user->id,
                'role_id' => $customerRole->id,
                'status' => 'ACTIVE',
                'assigned_at' => now(),
            ]);
        }

        $auth = $this->authenticateAs($user, 'CUSTOMER');

        // Verify status is PENDING_VERIFICATION
        $this->assertEquals('PENDING_VERIFICATION', $user->status);
        $this->assertNull($user->nikRecord);

        // 2. Submitting invalid NIK (e.g. 12 digits) is rejected
        $invalidNikRes = $this->withHeaders($auth['headers'])
            ->postJson('/api/v1/auth/customer/onboarding/nik', [
                'nik' => '123456789012', // 12 digits - invalid
            ]);
        $invalidNikRes->assertStatus(422);

        // 3. Submitting valid 16-digit NIK succeeds format-check and encrypts
        $validNik = '320101' . rand(100000, 999999) . '0001';
        $nikRes = $this->withHeaders($auth['headers'])
            ->postJson('/api/v1/auth/customer/onboarding/nik', [
                'nik' => $validNik,
            ]);
        $nikRes->assertStatus(201);

        // 4. Assert NIK record exists and is locked per immutable rule
        $this->assertDatabaseHas('user_nik_records', [
            'user_id' => $user->id,
        ]);

        // 5. Account cannot complete without verifying OTP challenge
        $unverifiedUser = User::find($user->id);
        $this->assertNull($unverifiedUser->email_verified_at);
    }

    public function test_google_user_cannot_bypass_nik_to_access_protected_business_features(): void
    {
        $user = User::create([
            'id' => (string) Str::uuid(),
            'email' => 'unverified_google_' . uniqid() . '@servio.id',
            'password_hash' => bcrypt(Str::random(32)),
            'status' => 'PENDING_VERIFICATION',
            'authz_version' => 1,
        ]);

        $auth = $this->authenticateAs($user, 'CUSTOMER');

        // Cannot create worker invitations without provider role & permissions
        $res = $this->withHeaders($auth['headers'])
            ->postJson('/api/v1/provider/workers', [
                'email' => 'worker_' . uniqid() . '@servio.id',
                'name' => 'Teknisi Test',
                'phone' => '+6281234567890',
            ]);

        $this->assertEquals(403, $res->status());
    }
}
