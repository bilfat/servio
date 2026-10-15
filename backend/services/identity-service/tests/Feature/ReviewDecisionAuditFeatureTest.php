<?php

namespace Tests\Feature;

use App\Models\BusinessApplication;
use App\Models\IdentityVerificationRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ReviewDecisionAuditFeatureTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_can_reject_business_application_with_audit_logging(): void
    {
        $admin = User::where('email', 'admin@servio.id')->firstOrFail();
        $adminAuth = $this->authenticateAs($admin, 'ADMIN_OPERATIONS');

        $applicant = User::where('email', 'customer@servio.id')->firstOrFail();

        $app = BusinessApplication::create([
            'application_code' => 'APP-REJECT-TEST-' . rand(1000, 9999),
            'applicant_user_id' => $applicant->id,
            'target_role' => 'SERVICE_PROVIDER',
            'status' => 'PENDING_REVIEW',
            'revision_no' => 0,
            'lock_version' => 1,
            'draft_data_ciphertext' => json_encode(['business' => ['legal_name' => 'Toko Ditolak']]),
            'submitted_at' => now(),
        ]);

        $payload = [
            'decision' => 'REJECT',
            'notes' => 'Dokumen legalitas tidak memenuhi kualifikasi standar SERVIO.',
            'lock_version' => 1,
        ];

        $response = $this->withHeaders($adminAuth['headers'])
            ->postJson("/api/v1/admin/applications/{$app->id}/decision", $payload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'REJECTED',
                ],
            ]);

        $app->refresh();
        $this->assertEquals('REJECTED', $app->status);
        $this->assertEquals(2, $app->lock_version);

        // Verify audit log recorded
        $this->assertDatabaseHas('audit_logs', [
            'actor_user_id' => $admin->id,
            'event_code' => 'IDENTITY_BUSINESS_APPLICATION_DECISION',
            'target_type' => 'business_application',
            'target_id' => $app->id,
            'result' => 'SUCCESS',
        ]);
    }

    public function test_non_admin_cannot_decide_business_application(): void
    {
        $customer = User::where('email', 'customer@servio.id')->firstOrFail();
        $custAuth = $this->authenticateAs($customer, 'CUSTOMER');

        $app = BusinessApplication::create([
            'application_code' => 'APP-UNAUTH-' . rand(1000, 9999),
            'applicant_user_id' => $customer->id,
            'target_role' => 'SERVICE_PROVIDER',
            'status' => 'PENDING_REVIEW',
            'revision_no' => 0,
            'lock_version' => 1,
            'draft_data_ciphertext' => json_encode([]),
        ]);

        $response = $this->withHeaders($custAuth['headers'])
            ->postJson("/api/v1/admin/applications/{$app->id}/decision", [
                'decision' => 'REJECT',
                'notes' => 'Unauthorized rejection',
                'lock_version' => 1,
            ]);

        $response->assertStatus(403);
    }

    public function test_ceo_can_reject_employee_kyc_with_reason(): void
    {
        $ceo = User::where('email', 'ceo@servio.id')->firstOrFail();
        $ceoAuth = $this->authenticateAs($ceo, 'CEO');

        $staff = User::where('email', 'customer@servio.id')->firstOrFail();

        $kyc = IdentityVerificationRequest::create([
            'user_id' => $staff->id,
            'kind' => 'EMPLOYEE_KYC',
            'status' => 'PENDING',
        ]);

        $response = $this->withHeaders($ceoAuth['headers'])
            ->postJson("/api/v1/ceo/staff/verifications/{$kyc->id}/decision", [
                'decision' => 'REJECT',
                'review_notes' => 'Foto e-KTP buram dan tidak terbaca jelas.',
            ]);

        $response->assertStatus(200);

        $kyc->refresh();
        $this->assertEquals('REJECTED', $kyc->status);

        $this->assertDatabaseHas('audit_logs', [
            'actor_user_id' => $ceo->id,
            'event_code' => 'IDENTITY_KYC_DECISION',
            'target_type' => 'verification_request',
            'target_id' => $kyc->id,
        ]);
    }
}
