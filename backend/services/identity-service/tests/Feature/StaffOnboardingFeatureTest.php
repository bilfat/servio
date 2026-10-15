<?php

namespace Tests\Feature;

use App\Models\StaffOnboarding;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class StaffOnboardingFeatureTest extends TestCase
{
    use DatabaseTransactions;

    public function test_ceo_can_create_internal_staff(): void
    {
        $ceo = User::where('email', 'ceo@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($ceo, 'CEO_PRODUCT_OWNER');

        $staffEmail = 'new_cs_' . uniqid() . '@servio.id';
        $payload = [
            'name' => 'Dewi Customer Support',
            'email' => $staffEmail,
            'role' => 'CUSTOMER_SUPPORT',
            'department' => 'Customer Care',
        ];

        $response = $this->withHeaders($auth['headers'])
            ->postJson('/api/v1/ceo/staff', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_STAFF_CREATED',
                'data' => [
                    'email' => $staffEmail,
                    'role' => 'CUSTOMER_SUPPORT',
                    'status' => 'INVITED',
                    'onboarding_status' => 'INVITED',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => $staffEmail,
            'status' => 'PENDING',
        ]);

        $createdUser = User::where('email', $staffEmail)->first();
        $this->assertDatabaseHas('staff_onboarding', [
            'staff_user_id' => $createdUser->id,
            'status' => 'INVITED',
        ]);
    }

    public function test_staff_progresses_through_all_steps_to_operational_ready(): void
    {
        // 1. CEO creates staff
        $ceo = User::where('email', 'ceo@servio.id')->firstOrFail();
        $ceoAuth = $this->authenticateAs($ceo, 'CEO_PRODUCT_OWNER');

        $email = 'onboard_staff_' . uniqid() . '@servio.id';
        $createRes = $this->withHeaders($ceoAuth['headers'])
            ->postJson('/api/v1/ceo/staff', [
                'name' => 'Rian FinOps',
                'email' => $email,
                'role' => 'FINANCE_PAYMENT_OPS',
                'department' => 'Finance & Escrow',
            ]);

        $staffId = $createRes->json('data.user_id');
        $staffUser = User::find($staffId);

        $staffAuth = $this->authenticateAs($staffUser, 'FINANCE_PAYMENT_OPS');

        // 2. View onboarding
        $progressRes = $this->withHeaders($staffAuth['headers'])
            ->getJson('/api/v1/staff/onboarding/me');

        $progressRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_STAFF_ONBOARDING_LOADED',
                'data' => [
                    'status' => 'INVITED',
                ],
            ]);

        $randomPhone = '+62812' . rand(1000000, 9999999);
        $step1Res = $this->withHeaders($staffAuth['headers'])
            ->patchJson('/api/v1/staff/onboarding/profile', [
                'display_name' => 'Rian Hidayat FinOps',
                'phone' => $randomPhone,
            ]);

        $step1Res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['step' => 'PROFILE', 'status' => 'COMPLETED'],
            ]);

        // 4. Step 2: KYC
        $step2Res = $this->withHeaders($staffAuth['headers'])
            ->postJson('/api/v1/staff/onboarding/kyc', [
                'verification_request_id' => 'VR-TEST-' . uniqid(),
            ]);

        $step2Res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['step' => 'EMPLOYEE_KYC', 'status' => 'COMPLETED'],
            ]);

        // 5. Step 3: NDA
        $step3Res = $this->withHeaders($staffAuth['headers'])
            ->postJson('/api/v1/staff/onboarding/nda', [
                'nda_version' => 'NDA-SERVIO-2026-V1',
                'accepted' => true,
            ]);

        $step3Res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => ['step' => 'NDA', 'status' => 'COMPLETED'],
            ]);

        // 6. Step 4: Access Confirmation
        $step4Res = $this->withHeaders($staffAuth['headers'])
            ->postJson('/api/v1/staff/onboarding/confirm-access', [
                'acknowledged_permission_version' => 1,
                'accepted' => true,
            ]);

        $step4Res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'step' => 'ACCESS_CONFIRMATION',
                    'status' => 'COMPLETED',
                ],
            ]);

        // 7. Submit Onboarding for CEO Review (CR-03 Section E)
        $submitRes = $this->withHeaders($staffAuth['headers'])
            ->postJson('/api/v1/staff/onboarding/submit');

        $submitRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_STAFF_ONBOARDING_SUBMITTED',
                'data' => [
                    'status' => 'PENDING_REVIEW',
                ],
            ]);

        $this->assertDatabaseHas('staff_onboarding', [
            'staff_user_id' => $staffUser->id,
            'status' => 'PENDING_REVIEW',
        ]);

        // 8. CEO Decision: Approve Onboarding (CR-03 Section E)
        $verification = \App\Models\IdentityVerificationRequest::where('user_id', $staffUser->id)
            ->where('kind', 'EMPLOYEE_KYC')
            ->firstOrFail();

        $ceoDecisionRes = $this->withHeaders($ceoAuth['headers'])
            ->postJson("/api/v1/ceo/identity/verifications/{$verification->id}/decision", [
                'decision' => 'APPROVE',
            ]);

        $ceoDecisionRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_KYC_DECIDED',
                'data' => [
                    'status' => 'VERIFIED',
                ],
            ]);

        $this->assertDatabaseHas('staff_onboarding', [
            'staff_user_id' => $staffUser->id,
            'status' => 'COMPLETED',
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $staffUser->id,
            'status' => 'ACTIVE',
        ]);
    }

    public function test_non_ceo_cannot_create_staff(): void
    {
        $customer = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($customer, 'CUSTOMER');

        $response = $this->withHeaders($auth['headers'])
            ->postJson('/api/v1/ceo/staff', [
                'name' => 'Illegal Staff',
                'email' => 'illegal@servio.id',
                'role' => 'ADMIN_OPERATIONS',
                'department' => 'Ops',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_PERMISSION_DENIED',
            ]);
    }
}
