<?php

namespace Tests\Feature;

use App\Models\BusinessApplication;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\RoleAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BusinessApplicationFeatureTest extends TestCase
{
    use DatabaseTransactions;

    public function test_user_can_create_business_application_draft(): void
    {
        $applicant = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($applicant, 'CUSTOMER');

        $payload = [
            'target_role' => 'SERVICE_PROVIDER',
            'business' => [
                'legal_name' => 'PT Servio Mandiri Sejahtera',
                'brand_name' => 'Bengkel Mandiri Sejahtera',
                'address' => 'Jl. Otista Raya No. 45, Jakarta Timur',
            ],
            'legal' => [
                'nib' => '9120009876543',
            ],
        ];

        $response = $this->withHeaders($auth['headers'])
            ->postJson('/api/v1/business/applications', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_APPLICATION_CREATED',
                'data' => [
                    'target_role' => 'SERVICE_PROVIDER',
                    'status' => 'DRAFT',
                    'revision_no' => 0,
                    'lock_version' => 1,
                ],
            ]);

        $appId = $response->json('data.id');
        $this->assertDatabaseHas('business_applications', [
            'id' => $appId,
            'status' => 'DRAFT',
            'target_role' => 'SERVICE_PROVIDER',
        ]);
    }

    public function test_user_can_submit_business_application(): void
    {
        $applicant = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($applicant, 'CUSTOMER');

        $app = BusinessApplication::create([
            'application_code' => 'APP-TEST-SUBMIT-' . uniqid(),
            'applicant_user_id' => $applicant->id,
            'target_role' => 'MERCHANT',
            'status' => 'DRAFT',
            'revision_no' => 0,
            'lock_version' => 1,
            'draft_data_ciphertext' => json_encode(['business' => ['legal_name' => 'Toko Sinar Jaya']]),
        ]);

        $response = $this->withHeaders($auth['headers'])
            ->postJson("/api/v1/business/applications/{$app->id}/submit", [
                'lock_version' => 1,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_APPLICATION_SUBMITTED',
                'data' => [
                    'status' => 'PENDING_REVIEW',
                    'lock_version' => 2,
                ],
            ]);

        $this->assertDatabaseHas('business_applications', [
            'id' => $app->id,
            'status' => 'PENDING_REVIEW',
        ]);
    }

    public function test_submit_with_version_conflict_fails_with_409(): void
    {
        $applicant = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($applicant, 'CUSTOMER');

        $app = BusinessApplication::create([
            'application_code' => 'APP-TEST-CONFLICT-' . uniqid(),
            'applicant_user_id' => $applicant->id,
            'target_role' => 'MERCHANT',
            'status' => 'DRAFT',
            'revision_no' => 0,
            'lock_version' => 3,
            'draft_data_ciphertext' => json_encode([]),
        ]);

        $response = $this->withHeaders($auth['headers'])
            ->postJson("/api/v1/business/applications/{$app->id}/submit", [
                'lock_version' => 1, // outdated version
            ]);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_APPLICATION_VERSION_CONFLICT',
            ]);
    }

    public function test_admin_can_request_revision_and_applicant_can_resubmit(): void
    {
        $applicant = User::where('email', 'customer@servio.id')->firstOrFail();
        $admin = User::where('email', 'admin@servio.id')->firstOrFail();

        $app = BusinessApplication::create([
            'application_code' => 'APP-TEST-REV-' . uniqid(),
            'applicant_user_id' => $applicant->id,
            'target_role' => 'SERVICE_PROVIDER',
            'status' => 'PENDING_REVIEW',
            'revision_no' => 0,
            'lock_version' => 1,
            'draft_data_ciphertext' => json_encode(['business' => ['legal_name' => 'Bengkel Revisi']]),
        ]);

        $adminAuth = $this->authenticateAs($admin, 'ADMIN_OPERATIONS');

        // Admin requests revision
        $revRes = $this->withHeaders($adminAuth['headers'])
            ->postJson("/api/v1/admin/business/applications/{$app->id}/decisions", [
                'decision' => 'REQUEST_REVISION',
                'reason' => 'NPWP belum terlampir dengan jelas.',
                'lock_version' => 1,
            ]);

        $revRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_APPLICATION_DECISION_PROCESSED',
                'data' => [
                    'application' => [
                        'status' => 'REVISION_REQUIRED',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('business_applications', [
            'id' => $app->id,
            'status' => 'REVISION_REQUIRED',
        ]);

        // Applicant resubmits
        $applicantAuth = $this->authenticateAs($applicant, 'CUSTOMER');
        $resubmitRes = $this->withHeaders($applicantAuth['headers'])
            ->postJson("/api/v1/business/applications/{$app->id}/resubmit");

        $resubmitRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_APPLICATION_RESUBMITTED',
                'data' => [
                    'status' => 'PENDING_REVIEW',
                    'revision_no' => 1,
                ],
            ]);
    }

    public function test_admin_approves_application_creating_organization_and_membership(): void
    {
        $applicant = User::where('email', 'customer@servio.id')->firstOrFail();
        $admin = User::where('email', 'admin@servio.id')->firstOrFail();

        $app = BusinessApplication::create([
            'application_code' => 'APP-TEST-APPROVE-' . uniqid(),
            'applicant_user_id' => $applicant->id,
            'target_role' => 'SERVICE_PROVIDER',
            'status' => 'PENDING_REVIEW',
            'revision_no' => 0,
            'lock_version' => 1,
            'draft_data_ciphertext' => json_encode([
                'business' => [
                    'legal_name' => 'PT Bengkel Unggul Sejati',
                    'brand_name' => 'Bengkel Unggul',
                ],
                'legal' => [
                    'nib' => '9120008877665',
                ],
            ]),
        ]);

        $adminAuth = $this->authenticateAs($admin, 'ADMIN_OPERATIONS');

        $approveRes = $this->withHeaders($adminAuth['headers'])
            ->postJson("/api/v1/admin/business/applications/{$app->id}/decisions", [
                'decision' => 'APPROVE',
                'reason' => 'Semua dokumen valid dan memenuhi syarat.',
                'lock_version' => 1,
            ]);

        $approveRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_APPLICATION_DECISION_PROCESSED',
                'data' => [
                    'application' => [
                        'status' => 'APPROVED',
                    ],
                ],
            ]);

        // Verify organization created
        $org = Organization::where('approved_application_id', $app->id)->first();
        $this->assertNotNull($org);
        $this->assertEquals('PROVIDER', $org->type);
        $this->assertEquals('ACTIVE', $org->status);

        // Verify membership created as OWNER
        $membership = Membership::where('organization_id', $org->id)
            ->where('user_id', $applicant->id)
            ->first();
        $this->assertNotNull($membership);
        $this->assertEquals('OWNER', $membership->kind);
        $this->assertEquals('ACTIVE', $membership->status);

        // Verify RoleAssignment created
        $roleAssignment = RoleAssignment::where('user_id', $applicant->id)
            ->where('membership_id', $membership->id)
            ->first();
        $this->assertNotNull($roleAssignment);
        $this->assertEquals('ACTIVE', $roleAssignment->status);
    }
}
