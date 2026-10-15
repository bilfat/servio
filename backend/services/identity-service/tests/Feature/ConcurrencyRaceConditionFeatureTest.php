<?php

namespace Tests\Feature;

use App\Models\BusinessApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ConcurrencyRaceConditionFeatureTest extends TestCase
{
    use DatabaseTransactions;

    public function test_concurrent_application_decision_with_stale_lock_version_fails_409(): void
    {
        $admin = User::where('email', 'admin@servio.id')->firstOrFail();
        $adminAuth = $this->authenticateAs($admin, 'ADMIN_OPERATIONS');

        $applicant = User::where('email', 'customer@servio.id')->firstOrFail();

        $app = BusinessApplication::create([
            'application_code' => 'APP-CONCUR-' . rand(1000, 9999),
            'applicant_user_id' => $applicant->id,
            'target_role' => 'SERVICE_PROVIDER',
            'status' => 'PENDING_REVIEW',
            'revision_no' => 0,
            'lock_version' => 1,
            'draft_data_ciphertext' => json_encode(['business' => ['legal_name' => 'Toko Bersama']]),
            'submitted_at' => now(),
        ]);

        // Reviewer attempts to decide with mismatched stale lock_version = 99
        $res2 = $this->withHeaders($adminAuth['headers'])
            ->postJson("/api/v1/admin/applications/{$app->id}/decision", [
                'decision' => 'REJECT',
                'lock_version' => 99,
            ]);

        // Must fail with 409 Conflict due to optimistic lock mismatch
        $res2->assertStatus(409)
            ->assertJson([
                'code' => 'IDENTITY_APPLICATION_VERSION_CONFLICT',
            ]);
    }

    public function test_concurrent_draft_save_with_mismatched_lock_version_fails_409(): void
    {
        $applicant = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($applicant, 'CUSTOMER');

        $app = BusinessApplication::create([
            'application_code' => 'APP-DRAFT-RACE-' . rand(1000, 9999),
            'applicant_user_id' => $applicant->id,
            'target_role' => 'SERVICE_PROVIDER',
            'status' => 'DRAFT',
            'revision_no' => 0,
            'lock_version' => 2, // Current version is 2
            'draft_data_ciphertext' => json_encode([]),
        ]);

        // Stale client sends lock_version = 1
        $res = $this->withHeaders($auth['headers'])
            ->putJson("/api/v1/business/applications/{$app->id}", [
                'business' => ['legal_name' => 'Name from Stale Tab'],
                'lock_version' => 1,
            ]);

        $res->assertStatus(409)
            ->assertJson([
                'code' => 'IDENTITY_APPLICATION_VERSION_CONFLICT',
            ]);
    }
}
