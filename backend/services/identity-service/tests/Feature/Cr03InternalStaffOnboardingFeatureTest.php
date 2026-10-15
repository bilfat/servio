<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\AuthSession;
use App\Models\IdentityVerificationRequest;
use App\Models\Invitation;
use App\Models\Role;
use App\Models\StaffOnboarding;
use App\Models\StaffOnboardingStep;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class Cr03InternalStaffOnboardingFeatureTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * Test 1: Alur Penuh Onboarding Staf Internal Sesuai CR-03
     * CEO Invite -> Brevo dispatch -> Password dibuat -> Link hangus -> Login -> Onboarding 4 tahap -> Submit -> Antrean CEO -> Setujui -> OPERATIONAL_READY
     */
    public function test_full_staff_onboarding_lifecycle_from_invite_to_operational_ready(): void
    {
        // 1. CEO mengundang staf baru
        $ceo = User::where('email', 'ceo@servio.id')->firstOrFail();
        $ceoAuth = $this->authenticateAs($ceo, 'CEO_PRODUCT_OWNER');

        $staffEmail = 'cr03_staff_' . uniqid() . '@servio.id';
        $createRes = $this->withHeaders($ceoAuth['headers'])
            ->postJson('/api/v1/ceo/staff', [
                'name' => 'Budi Santoso Admin',
                'email' => $staffEmail,
                'role' => 'ADMIN_OPERATIONS',
                'department' => 'Operasional Verifikasi',
                'position' => 'Admin Operasional Verifikasi',
            ]);

        $createRes->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_STAFF_CREATED',
                'data' => [
                    'email' => $staffEmail,
                    'role' => 'ADMIN_OPERATIONS',
                    'status' => 'INVITED',
                    'onboarding_status' => 'INVITED',
                ],
            ]);

        $staffId = $createRes->json('data.user_id');
        $staffUser = User::findOrFail($staffId);

        // Verifikasi database: token tersimpan terenkripsi, hash tersimpan, TTL 12 jam
        $invitation = Invitation::where('recipient_user_id', $staffId)->where('kind', 'STAFF')->firstOrFail();
        $this->assertEquals('INVITED', $invitation->status);
        $this->assertNotEmpty($invitation->encrypted_token);
        $this->assertNotEmpty($invitation->token_hash);
        $this->assertTrue($invitation->expires_at->gt(now()->addHours(11)));

        // 2. CEO melihat tautan undangan selama status masih INVITED
        $linkRes = $this->withHeaders($ceoAuth['headers'])
            ->getJson("/api/v1/ceo/staff/{$staffId}/invitation-link");

        $linkRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_STAFF_INVITATION_LINK_LOADED',
            ]);

        $plainToken = $linkRes->json('data.invitation_token');
        $this->assertNotEmpty($plainToken);

        // Verifikasi preview undangan sebelum password dibuat
        $previewRes = $this->getJson("/api/v1/invitations/{$plainToken}/preview");
        $previewRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_INVITATION_PREVIEW',
                'data' => [
                    'kind' => 'STAFF',
                    'target_role' => 'ADMIN_OPERATIONS',
                ],
            ]);

        // 3. Staf membuat password akun
        $acceptRes = $this->postJson("/api/v1/invitations/{$plainToken}/accept", [
            'password' => 'PasswordStaf123!',
            'password_confirmation' => 'PasswordStaf123!',
        ]);

        $acceptRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_INVITATION_ACCEPTED',
            ]);

        // 4. Verifikasi link hangus: token terenkripsi dihapus, undangan berstatus ACCEPTED
        $invitation->refresh();
        $this->assertEquals('ACCEPTED', $invitation->status);
        $this->assertNull($invitation->encrypted_token);

        // CEO tidak lagi dapat melihat tautan undangan yang telah hangus (harus return 409)
        $linkAfterUsedRes = $this->withHeaders($ceoAuth['headers'])
            ->getJson("/api/v1/ceo/staff/{$staffId}/invitation-link");
        $linkAfterUsedRes->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_INVITATION_ALREADY_USED',
            ]);

        // Token yang sudah dipakai ditolak jika diakses kembali
        $reuseTokenRes = $this->postJson("/api/v1/invitations/{$plainToken}/accept", [
            'password' => 'NewPassword123!',
        ]);
        $reuseTokenRes->assertStatus(410)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_INVITATION_ALREADY_USED',
            ]);

        // 5. Staf login normal menggunakan email dan password
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => $staffEmail,
            'password' => 'PasswordStaf123!',
        ]);

        $loginRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_LOGIN_SUCCESS',
                'data' => [
                    'staff_onboarding_status' => 'IN_PROGRESS',
                    'readiness' => 'NOT_READY',
                ],
            ]);

        $staffAuthToken = $loginRes->json('data.token');
        $staffHeaders = [
            'Authorization' => 'Bearer ' . $staffAuthToken,
            'Accept' => 'application/json',
        ];

        // 6. Tahap 1: Profil Pribadi & Kontak (Termasuk base64 avatar upload & gender/birth_date)
        $uniquePhone = '+628' . rand(100000000, 999999999);
        $sampleBase64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        $step1Res = $this->withHeaders($staffHeaders)
            ->patchJson('/api/v1/staff/onboarding/profile', [
                'display_name' => 'Budi Santoso Admin',
                'legal_name' => 'Budi Santoso',
                'gender' => 'Laki-laki',
                'birth_date' => '1999-02-12',
                'phone' => $uniquePhone,
                'photo_path' => $sampleBase64Png,
            ]);

        $step1Res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_ONBOARDING_STEP_COMPLETED',
                'data' => [
                    'step' => 'PROFILE',
                    'status' => 'COMPLETED',
                    'profile' => [
                        'display_name' => 'Budi Santoso Admin',
                        'legal_name' => 'Budi Santoso',
                        'gender' => 'Laki-laki',
                        'birth_date' => '1999-02-12',
                    ],
                ],
            ]);
        $this->assertStringStartsWith('/storage/avatars/', (string)$step1Res->json('data.profile.photo_path'));

        // 7. Tahap 2: Pengecekan Berkas (NIK 16 digit & e-KTP)
        $step2Res = $this->withHeaders($staffHeaders)
            ->postJson('/api/v1/staff/onboarding/kyc', [
                'nik' => '3171012304980005',
                'verification_request_id' => 'VR-TEST-' . uniqid(),
            ]);

        $step2Res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_ONBOARDING_STEP_COMPLETED',
                'data' => [
                    'step' => 'EMPLOYEE_KYC',
                    'label' => 'Pengecekan Berkas',
                    'status' => 'COMPLETED',
                    'nik_masked' => '3171************',
                ],
            ]);

        // 8. Tahap 3: Perjanjian Kerahasiaan (NDA)
        $step3Res = $this->withHeaders($staffHeaders)
            ->postJson('/api/v1/staff/onboarding/nda', [
                'nda_version' => 'v2026.1',
                'accepted' => true,
            ]);

        $step3Res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_ONBOARDING_STEP_COMPLETED',
                'data' => [
                    'step' => 'NDA',
                    'status' => 'COMPLETED',
                    'nda_version' => 'v2026.1',
                ],
            ]);

        // 9. Tahap 4: Konfirmasi Hak Akses Sistem
        $step4Res = $this->withHeaders($staffHeaders)
            ->postJson('/api/v1/staff/onboarding/confirm-access', [
                'accepted' => true,
            ]);

        $step4Res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_ONBOARDING_STEP_COMPLETED',
                'data' => [
                    'step' => 'ACCESS_CONFIRMATION',
                    'status' => 'COMPLETED',
                ],
            ]);

        // 10. Kirim untuk Verifikasi CEO (CR-03 Section E)
        $submitRes = $this->withHeaders($staffHeaders)
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
            'staff_user_id' => $staffId,
            'status' => 'PENDING_REVIEW',
        ]);

        // 11. CEO memeriksa Antrean Verifikasi
        $queueRes = $this->withHeaders($ceoAuth['headers'])
            ->getJson('/api/v1/ceo/identity/verifications?status=PENDING_REVIEW');

        $queueRes->assertStatus(200)
            ->assertJson(['success' => true]);

        $verification = IdentityVerificationRequest::where('user_id', $staffId)
            ->where('kind', 'EMPLOYEE_KYC')
            ->firstOrFail();

        // 12. CEO menyetujui berkas -> OPERATIONAL_READY
        $approveRes = $this->withHeaders($ceoAuth['headers'])
            ->postJson("/api/v1/ceo/identity/verifications/{$verification->id}/decision", [
                'decision' => 'APPROVE',
            ]);

        $approveRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_KYC_DECIDED',
                'data' => [
                    'status' => 'VERIFIED',
                ],
            ]);

        // Verifikasi onboarding COMPLETED / OPERATIONAL_READY
        $this->assertDatabaseHas('staff_onboarding', [
            'staff_user_id' => $staffId,
            'status' => 'COMPLETED',
        ]);

        $staffUser->refresh();
        $this->assertEquals('ACTIVE', $staffUser->status);

        // 13. Verifikasi /auth/me staf menunjukkan OPERATIONAL_READY
        $meRes = $this->withHeaders($staffHeaders)->getJson('/api/v1/auth/me');
        $meRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'staff_onboarding_status' => 'COMPLETED',
                    'readiness' => 'READY',
                    'is_operational_ready' => true,
                ],
            ]);
    }

    /**
     * Test 2: Otorisasi Khusus CEO (CEO-Only Authorization)
     * Admin Operasional dilarang memutuskan berkas staf internal (403)
     */
    public function test_admin_operations_denied_from_deciding_internal_staff_berkas(): void
    {
        $admin = User::where('email', 'admin@servio.id')->firstOrFail();
        $adminAuth = $this->authenticateAs($admin, 'ADMIN_OPERATIONS');

        $fakeVerificationId = (string) \Illuminate\Support\Str::uuid();

        $decisionRes = $this->withHeaders($adminAuth['headers'])
            ->postJson("/api/v1/ceo/identity/verifications/{$fakeVerificationId}/decision", [
                'decision' => 'APPROVE',
            ]);

        $decisionRes->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_PERMISSION_DENIED',
            ]);
    }

    /**
     * Test 3: CEO Meminta Revisi Berkas dengan Alasan Wajib
     */
    public function test_ceo_can_request_revision_with_mandatory_reason(): void
    {
        $ceo = User::where('email', 'ceo@servio.id')->firstOrFail();
        $ceoAuth = $this->authenticateAs($ceo, 'CEO_PRODUCT_OWNER');

        $staffEmail = 'rev_staff_' . uniqid() . '@servio.id';
        $createRes = $this->withHeaders($ceoAuth['headers'])
            ->postJson('/api/v1/ceo/staff', [
                'name' => 'Staf Revisi',
                'email' => $staffEmail,
                'role' => 'CUSTOMER_SUPPORT',
                'department' => 'Support',
            ]);

        $staffId = $createRes->json('data.user_id');
        $staffUser = User::findOrFail($staffId);
        $staffAuth = $this->authenticateAs($staffUser, 'CUSTOMER_SUPPORT');

        // Staf melengkapi KYC untuk membuat berkas verifikasi
        $this->withHeaders($staffAuth['headers'])
            ->postJson('/api/v1/staff/onboarding/kyc', [
                'nik' => '3171012304980005',
                'verification_request_id' => 'VR-REV-' . uniqid(),
            ])->assertStatus(200);

        $verification = IdentityVerificationRequest::where('user_id', $staffId)
            ->where('kind', 'EMPLOYEE_KYC')
            ->firstOrFail();

        // Permintaan revisi tanpa alasan harus gagal (422)
        $noReasonRes = $this->withHeaders($ceoAuth['headers'])
            ->postJson("/api/v1/ceo/identity/verifications/{$verification->id}/decision", [
                'decision' => 'REQUEST_REVISION',
                'reason' => '',
            ]);
        $noReasonRes->assertStatus(422);

        // Permintaan revisi dengan alasan
        $revRes = $this->withHeaders($ceoAuth['headers'])
            ->postJson("/api/v1/ceo/identity/verifications/{$verification->id}/decision", [
                'decision' => 'REQUEST_REVISION',
                'reason' => 'Foto e-KTP buram dan nomor NIK tidak terbaca dengan jelas.',
            ]);

        $revRes->assertStatus(200);

        $this->assertDatabaseHas('staff_onboarding', [
            'staff_user_id' => $staffId,
            'status' => 'REVISION_REQUIRED',
            'revision_notes' => 'Foto e-KTP buram dan nomor NIK tidak terbaca dengan jelas.',
        ]);
    }

    /**
     * Test 4: Kirim Ulang & Pembatalan Undangan (Resend & Cancel Invitation)
     */
    public function test_ceo_resend_and_cancel_invitation_lifecycle(): void
    {
        $ceo = User::where('email', 'ceo@servio.id')->firstOrFail();
        $ceoAuth = $this->authenticateAs($ceo, 'CEO_PRODUCT_OWNER');

        $staffEmail = 'invite_test_' . uniqid() . '@servio.id';
        $createRes = $this->withHeaders($ceoAuth['headers'])
            ->postJson('/api/v1/ceo/staff', [
                'name' => 'Staf Undangan',
                'email' => $staffEmail,
                'role' => 'FINANCE_PAYMENT_OPS',
                'department' => 'Finance',
            ]);

        $staffId = $createRes->json('data.user_id');
        $oldInvite = Invitation::where('recipient_user_id', $staffId)->where('status', 'INVITED')->firstOrFail();

        // 1. Kirim Ulang Undangan (Menghasilkan token baru, membatalkan token lama)
        $resendRes = $this->withHeaders($ceoAuth['headers'])
            ->postJson("/api/v1/ceo/staff/{$staffId}/resend-invitation");

        $resendRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_STAFF_INVITATION_RESENT',
            ]);

        $oldInvite->refresh();
        $this->assertEquals('REVOKED', $oldInvite->status);

        $newInvite = Invitation::where('recipient_user_id', $staffId)->where('status', 'INVITED')->firstOrFail();
        $this->assertNotEquals($oldInvite->id, $newInvite->id);
        $this->assertNotEmpty($newInvite->encrypted_token);

        // 2. Batalkan Undangan
        $cancelRes = $this->withHeaders($ceoAuth['headers'])
            ->postJson("/api/v1/ceo/staff/{$staffId}/cancel-invitation");

        $cancelRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_STAFF_INVITATION_CANCELLED',
            ]);

        $newInvite->refresh();
        $this->assertEquals('REVOKED', $newInvite->status);
        $this->assertNull($newInvite->encrypted_token);

        $this->assertDatabaseHas('staff_onboarding', [
            'staff_user_id' => $staffId,
            'status' => 'CANCELLED',
        ]);
    }

    /**
     * Test 5: Kebijakan Retensi Data Tanpa Hard Delete
     * Staf yang memiliki riwayat dinonaktifkan tanpa menghapus audit trail
     */
    public function test_staff_deletion_preserves_retention_policy_without_hard_delete(): void
    {
        $ceo = User::where('email', 'ceo@servio.id')->firstOrFail();
        $ceoAuth = $this->authenticateAs($ceo, 'CEO_PRODUCT_OWNER');

        $staffEmail = 'retention_' . uniqid() . '@servio.id';
        $createRes = $this->withHeaders($ceoAuth['headers'])
            ->postJson('/api/v1/ceo/staff', [
                'name' => 'Staf Retensi',
                'email' => $staffEmail,
                'role' => 'ADMIN_OPERATIONS',
                'department' => 'Ops',
            ]);

        $staffId = $createRes->json('data.user_id');

        // Hapus akun staf via API CEO
        $deleteRes = $this->withHeaders($ceoAuth['headers'])
            ->deleteJson("/api/v1/internal/accounts/{$staffId}");

        $deleteRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_STAFF_DEACTIVATED',
            ]);

        // Verifikasi akun tetap ada di database dengan status DEACTIVATED (tidak di-hard delete)
        $user = User::find($staffId);
        $this->assertNotNull($user);
        $this->assertEquals('DEACTIVATED', $user->status);
    }

    /**
     * Test 6: Forgot Password Menggunakan Alur OTP Tanpa Aktivasi Ulang / Invitation Reuse
     */
    public function test_forgot_password_flow_does_not_create_or_reuse_invitation(): void
    {
        $admin = User::where('email', 'admin@servio.id')->firstOrFail();

        // Staf memicu lupa password
        $res = $this->postJson('/api/v1/auth/password/forgot', [
            'email' => $admin->email,
        ]);

        $res->assertStatus(202)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_ACCEPTED',
            ]);

        // Verifikasi tidak ada record undangan baru yang dibuat
        $this->assertDatabaseMissing('invitations', [
            'recipient_email' => $admin->email,
            'status' => 'INVITED',
        ]);
    }

    /**
     * Test 7: Penangguhan Akun (Suspend) Mencabut Seluruh Sesi Aktif Staf
     */
    public function test_suspend_staff_revokes_active_sessions_and_denies_access(): void
    {
        $ceo = User::where('email', 'ceo@servio.id')->firstOrFail();
        $ceoAuth = $this->authenticateAs($ceo, 'CEO_PRODUCT_OWNER');

        $staffEmail = 'suspend_' . uniqid() . '@servio.id';
        $createRes = $this->withHeaders($ceoAuth['headers'])
            ->postJson('/api/v1/ceo/staff', [
                'name' => 'Staf Suspensi',
                'email' => $staffEmail,
                'role' => 'FINANCE_PAYMENT_OPS',
                'department' => 'Finance',
            ]);

        $staffId = $createRes->json('data.user_id');
        $staffUser = User::findOrFail($staffId);
        $staffUser->status = 'ACTIVE';
        $staffUser->save();

        $staffAuth = $this->authenticateAs($staffUser, 'FINANCE_PAYMENT_OPS');

        // Pastikan staf dapat mengakses /auth/me sebelum disuspend
        $this->withHeaders($staffAuth['headers'])->getJson('/api/v1/auth/me')->assertStatus(200);

        // CEO menangguhkan akun staf
        $suspendRes = $this->withHeaders($ceoAuth['headers'])
            ->postJson("/api/v1/ceo/staff/{$staffId}/suspend", [
                'reason' => 'Pelanggaran SOP operasional.',
            ]);

        $suspendRes->assertStatus(200);
        $staffUser->refresh();
        $this->assertEquals('SUSPENDED', $staffUser->status);

        // Akses dengan token sesi lama ditolak
        $deniedRes = $this->withHeaders($staffAuth['headers'])->getJson('/api/v1/auth/me');
        $deniedRes->assertStatus(401);
    }
}
