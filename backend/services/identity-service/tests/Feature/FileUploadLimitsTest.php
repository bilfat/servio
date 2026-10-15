<?php

namespace Tests\Feature;

use App\Models\BusinessApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FileUploadLimitsTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');
    }

    public function test_avatar_upload_rejects_file_larger_than_5mb(): void
    {
        $user = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($user, 'CUSTOMER');

        // 6 MB image (> 5 MB)
        $largeFile = UploadedFile::fake()->create('large_avatar.png', 6144, 'image/png');

        $response = $this->withHeaders($auth['headers'])
            ->postJson('/api/v1/profiles/me/avatar', [
                'file' => $largeFile,
            ]);

        $response->assertStatus(422);
        $fieldErrors = $response->json('error.field_errors') ?? $response->json('errors') ?? [];
        $this->assertArrayHasKey('file', $fieldErrors);
    }

    public function test_avatar_upload_accepts_file_within_5mb(): void
    {
        $user = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($user, 'CUSTOMER');

        // 3 MB image (<= 5 MB)
        $validFile = UploadedFile::fake()->create('valid_avatar.jpg', 3072, 'image/jpeg');

        $response = $this->withHeaders($auth['headers'])
            ->postJson('/api/v1/profiles/me/avatar', [
                'file' => $validFile,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_AVATAR_UPLOADED',
            ]);
    }

    public function test_staff_kyc_rejects_file_larger_than_5mb(): void
    {
        $ceo = User::where('email', 'ceo@servio.id')->firstOrFail();
        $ceoAuth = $this->authenticateAs($ceo, 'CEO_PRODUCT_OWNER');

        $staffEmail = 'test_staff_kyc_' . uniqid() . '@servio.id';
        $createRes = $this->withHeaders($ceoAuth['headers'])
            ->postJson('/api/v1/ceo/staff', [
                'name' => 'Staf Uji KYC',
                'email' => $staffEmail,
                'role' => 'ADMIN_OPERATIONS',
                'department' => 'Operasional',
                'position' => 'Admin Ops',
            ]);
        $staffId = $createRes->json('data.user_id');
        $staffUser = User::findOrFail($staffId);
        $staffAuth = $this->authenticateAs($staffUser, 'ADMIN_OPERATIONS');

        // 6 MB PDF (> 5 MB)
        $largeKtp = UploadedFile::fake()->create('ktp_oversized.pdf', 6144, 'application/pdf');

        $response = $this->withHeaders($staffAuth['headers'])
            ->postJson('/api/v1/staff/onboarding/kyc', [
                'nik' => '3171012304980005',
                'file' => $largeKtp,
            ]);

        $response->assertStatus(422);
        $fieldErrors = $response->json('error.field_errors') ?? $response->json('errors') ?? [];
        $this->assertArrayHasKey('file', $fieldErrors);
    }

    public function test_business_document_rejects_oversized_files_per_doc_type(): void
    {
        $applicant = User::where('email', 'customer@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($applicant, 'CUSTOMER');

        $app = BusinessApplication::create([
            'application_code' => 'APP-TEST-DOC-' . uniqid(),
            'applicant_user_id' => $applicant->id,
            'target_role' => 'SUPPLIER',
            'status' => 'DRAFT',
            'revision_no' => 0,
            'lock_version' => 1,
        ]);

        // 1. KTP_PIC > 5MB -> rejected
        $ktpLarge = UploadedFile::fake()->create('ktp.jpg', 5500, 'image/jpeg');
        $resKtp = $this->withHeaders($auth['headers'])
            ->postJson("/api/v1/business/applications/{$app->id}/documents", [
                'doc_type' => 'KTP_PIC',
                'file' => $ktpLarge,
            ]);
        $resKtp->assertStatus(422);
        $this->assertArrayHasKey('file', $resKtp->json('error.field_errors') ?? $resKtp->json('errors') ?? []);

        // 2. NIB > 8MB -> rejected
        $nibLarge = UploadedFile::fake()->create('nib.pdf', 9000, 'application/pdf');
        $resNib = $this->withHeaders($auth['headers'])
            ->postJson("/api/v1/business/applications/{$app->id}/documents", [
                'doc_type' => 'NIB',
                'file' => $nibLarge,
            ]);
        $resNib->assertStatus(422);
        $this->assertArrayHasKey('file', $resNib->json('error.field_errors') ?? $resNib->json('errors') ?? []);

        // 3. AKTA_PERUSAHAAN > 10MB -> rejected
        $aktaLarge = UploadedFile::fake()->create('akta.pdf', 11000, 'application/pdf');
        $resAkta = $this->withHeaders($auth['headers'])
            ->postJson("/api/v1/business/applications/{$app->id}/documents", [
                'doc_type' => 'AKTA_PERUSAHAAN',
                'file' => $aktaLarge,
            ]);
        $resAkta->assertStatus(422);
        $this->assertArrayHasKey('file', $resAkta->json('error.field_errors') ?? $resAkta->json('errors') ?? []);

        // 4. AKTA_PERUSAHAAN within 10MB (e.g. 7MB) -> accepted
        $aktaValid = UploadedFile::fake()->create('akta_valid.pdf', 7168, 'application/pdf');
        $resValid = $this->withHeaders($auth['headers'])
            ->postJson("/api/v1/business/applications/{$app->id}/documents", [
                'doc_type' => 'AKTA_PERUSAHAAN',
                'file' => $aktaValid,
            ]);
        $resValid->assertStatus(201)->assertJson(['success' => true]);
    }
}
