<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Organization;
use App\Models\OrganizationProfile;
use App\Models\User;
use App\Models\UserNikRecord;
use App\Services\AuditService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class SensitiveDataProtectionTest extends TestCase
{
    use DatabaseTransactions;

    public function test_nib_and_npwp_are_never_stored_in_plaintext_or_raw_base64(): void
    {
        $org = Organization::create([
            'type' => 'PROVIDER',
            'status' => 'ACTIVE',
            'activated_at' => now(),
        ]);

        $rawNib = '9120009876543';
        $rawNpwp = '01.234.567.8-901.000';

        $profile = OrganizationProfile::create([
            'organization_id' => $org->id,
            'legal_name' => 'PT Bengkel Aman Terenkripsi',
            'display_name' => 'Bengkel Aman',
            'nib_ciphertext' => Crypt::encryptString($rawNib),
            'nib_lookup_hash' => hash('sha256', $rawNib),
            'npwp_ciphertext' => Crypt::encryptString($rawNpwp),
            'npwp_lookup_hash' => hash('sha256', $rawNpwp),
        ]);

        // Query raw database row using DB facade to inspect stored bytes
        $rawDbRow = DB::table('organization_profiles')
            ->where('organization_id', $org->id)
            ->first();

        // 1. Raw DB column must NOT contain plaintext NIB
        $this->assertStringNotContainsString($rawNib, $rawDbRow->nib_ciphertext);

        // 2. Raw DB column must NOT be simple base64 of NIB
        $this->assertNotEquals(base64_encode($rawNib), $rawDbRow->nib_ciphertext);

        // 3. Raw DB column must NOT contain plaintext NPWP
        $this->assertStringNotContainsString($rawNpwp, $rawDbRow->npwp_ciphertext);

        // 4. Must successfully decrypt through authorized application method
        $this->assertEquals($rawNib, $profile->getDecryptedNib());
        $this->assertEquals($rawNpwp, $profile->getDecryptedNpwp());
    }

    public function test_nik_is_never_stored_in_plaintext_and_masked_in_profile(): void
    {
        $user = User::create([
            'id' => (string) Str::uuid(),
            'email' => 'nik_test_' . uniqid() . '@servio.id',
            'password_hash' => bcrypt('password123'),
            'status' => 'ACTIVE',
        ]);

        $rawNik = '3171012304950001';

        $nikRecord = UserNikRecord::create([
            'user_id' => $user->id,
            'nik_ciphertext' => Crypt::encryptString($rawNik),
            'format_validated_at' => now(),
            'locked_at' => now(),
        ]);

        $rawDbRow = DB::table('user_nik_records')
            ->where('user_id', $user->id)
            ->first();

        // Raw database column must not contain the 16 digit NIK
        $this->assertStringNotContainsString($rawNik, $rawDbRow->nik_ciphertext);

        // Decrypted attribute matches
        $this->assertEquals($rawNik, $nikRecord->decrypted_nik);

        // Masked NIK only reveals last 4 digits
        $this->assertEquals('************0001', $nikRecord->masked_nik);
    }

    public function test_audit_logs_strictly_redact_sensitive_identity_and_credentials(): void
    {
        $actor = User::where('email', 'admin@servio.id')->firstOrFail();

        $sensitiveInput = [
            'nib' => '9120009876543',
            'npwp' => '01.234.567.8-901.000',
            'nik' => '3171012304950001',
            'password' => 'SuperSecret123!',
            'token' => 'plain_bearer_token_abc',
            'otp' => '654321',
            'safe_field' => 'Bengkel Mobil Maju',
        ];

        $log = AuditService::log(
            $actor->id,
            'IDENTITY_SECURITY_AUDIT_TEST',
            'test_entity',
            'test-id-1',
            'SUCCESS',
            $sensitiveInput
        );

        $storedMetadata = $log->safe_metadata;

        // Verify redaction
        $this->assertEquals('[REDACTED]', $storedMetadata['nib']);
        $this->assertEquals('[REDACTED]', $storedMetadata['npwp']);
        $this->assertEquals('[REDACTED]', $storedMetadata['nik']);
        $this->assertEquals('[REDACTED]', $storedMetadata['password']);
        $this->assertEquals('[REDACTED]', $storedMetadata['token']);
        $this->assertEquals('[REDACTED]', $storedMetadata['otp']);
        $this->assertEquals('Bengkel Mobil Maju', $storedMetadata['safe_field']);

        // Inspect raw database JSON representation to ensure raw tokens never hit disk
        $rawLog = DB::table('audit_logs')->where('id', $log->id)->first();
        $this->assertStringNotContainsString('SuperSecret123!', $rawLog->safe_metadata);
        $this->assertStringNotContainsString('9120009876543', $rawLog->safe_metadata);
        $this->assertStringNotContainsString('3171012304950001', $rawLog->safe_metadata);
    }
}
