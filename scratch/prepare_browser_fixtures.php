<?php

require __DIR__ . '/vendor/autoload.php';

$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\UserProfile;
use App\Models\BusinessApplication;
use App\Models\ApplicationDocument;
use App\Models\IdentityVerificationRequest;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

$user = User::first();

// 1. Fixture Business Application for Admin
$appId = (string) Str::uuid();
$bizApp = BusinessApplication::create([
    'id' => $appId,
    'application_code' => 'APP-UI-' . time(),
    'applicant_user_id' => $user->id,
    'target_role' => 'WORKSHOP_PARTNER',
    'status' => 'PENDING_REVIEW',
    'revision_no' => 1,
    'lock_version' => 1,
    'draft_data_ciphertext' => Crypt::encryptString(json_encode(['business_name' => 'Bengkel Sejahtera UI E2E'])),
    'submitted_at' => now(),
]);

ApplicationDocument::create([
    'id' => (string) Str::uuid(),
    'application_id' => $appId,
    'revision_no' => 1,
    'doc_type' => 'NIB',
    'private_storage_key' => 'documents/nib_bengkel.pdf',
    'sha256' => hash('sha256', 'dummy'),
    'mime' => 'application/pdf',
    'size_bytes' => 102400,
    'verification_status' => 'PENDING',
]);

// 2. Fixture Employee KYC for CEO
$staff = User::create([
    'id' => (string) Str::uuid(),
    'email' => 'staff_ui_' . time() . '@servio.id',
    'phone_e164' => '+628198765432',
    'status' => 'PENDING',
]);

UserProfile::create([
    'user_id' => $staff->id,
    'display_name' => 'Ahmad Teknisi UI E2E',
]);

$kycReq = IdentityVerificationRequest::create([
    'id' => (string) Str::uuid(),
    'user_id' => $staff->id,
    'kind' => 'EMPLOYEE_KYC',
    'status' => 'PENDING',
    'nik_ciphertext' => Crypt::encryptString('3201019988776655'),
    'nik_lookup_hash' => hash('sha256', '3201019988776655'),
]);

echo "SUCCESS: Fixtures Ready!\n";
echo "Business App ID: {$bizApp->id}\n";
echo "Employee KYC ID: {$kycReq->id}\n";
