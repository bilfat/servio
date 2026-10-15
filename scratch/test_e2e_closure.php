<?php

$baseServiceDir = dirname(__DIR__) . '/backend/services/identity-service';
require $baseServiceDir . '/vendor/autoload.php';

$app = require $baseServiceDir . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Role;
use App\Models\UserNikRecord;
use App\Models\IdentityVerificationRequest;
use App\Models\BusinessApplication;
use App\Models\ApplicationDocument;
use App\Models\ApplicationDecision;
use App\Models\Invitation;
use App\Models\OtpChallenge;
use App\Models\Organization;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

$baseUrl = 'http://127.0.0.1:8001/api/v1';
$otpSecret = env('IDENTITY_OTP_HASH_KEY', 'servio_local_otp_secret_key_2026');

function bruteForceOtp($hmacHex, $identifier, $secret) {
    for ($i = 100000; $i <= 999999; $i++) {
        $candidate = (string)$i;
        if (hash_hmac('sha256', $candidate . ':' . strtolower(trim($identifier)), $secret) === $hmacHex) {
            return $candidate;
        }
    }
    return null;
}

echo "================================================================\n";
echo " SERVIO MODUL 01 — COMPREHENSIVE FINAL CLOSURE VERIFICATION\n";
echo "================================================================\n\n";

$results = [
    'customerLifecycle' => false,
    'nikImmutable409' => false,
    'adminOperationsReview' => false,
    'ceoKycExclusive' => false,
    'adminKycBlocked403' => false,
    'invitationValidAccepted' => false,
    'invitationExpiredRejected410' => false,
    'sessionLogout401' => false
];

// ============================================================================
// 1. CUSTOMER LIFECYCLE REGISTER -> NIK -> OTP -> ACTIVE & IMMUTABLE 409
// ============================================================================
echo "--- [1/5] UJI CUSTOMER LIFECYCLE WAJIB SAMPAI ACTIVE & NIK 409 ---\n";
$custEmail = 'cust_closure_' . time() . '@servio.id';
$custPhone = '+62812' . rand(10000000, 99999999);
$custNik = '320101' . rand(1000000000, 9999999999);

echo "1.1 Register Customer Baru: {$custEmail}\n";
$regResp = Http::acceptJson()->post("{$baseUrl}/auth/register", [
    'name' => 'Budi Penutupan Modul',
    'email' => $custEmail,
    'phone' => $custPhone,
    'password' => 'Password123!',
    'registration_type' => 'CUSTOMER',
]);
echo "    Status: {$regResp->status()}, Message: " . ($regResp->json('message') ?? 'OK') . "\n";
$custUser = User::where('email', $custEmail)->first();
echo "    Database User ID: {$custUser->id}, Status Awal: {$custUser->status}\n";

echo "1.2 Login sebagai Customer untuk mendapatkan Token\n";
$loginResp = Http::acceptJson()->post("{$baseUrl}/auth/login", [
    'email' => $custEmail,
    'password' => 'Password123!',
]);
$custToken = $loginResp->json('data.token');
echo "    Status: {$loginResp->status()}, Token diperoleh: " . ($custToken ? 'Ya' : 'Tidak') . "\n";

echo "1.3 Submit NIK 16 Digit: {$custNik}\n";
$nikResp = Http::withToken($custToken)->acceptJson()->post("{$baseUrl}/identity/customer/nik", [
    'nik' => $custNik,
]);
echo "    Status: {$nikResp->status()}, Code: " . ($nikResp->json('code') ?? $nikResp->json('message')) . "\n";

echo "1.4 Buktikan NIK Tetap Immutable (Attempt kedua -> Wajib 409 Conflict)\n";
$secondNikResp = Http::withToken($custToken)->acceptJson()->post("{$baseUrl}/identity/customer/nik", [
    'nik' => '3201019999990001',
]);
echo "    Status: {$secondNikResp->status()}, Error: " . ($secondNikResp->json('code') ?? $secondNikResp->json('message')) . "\n";
if ($secondNikResp->status() === 409) {
    $results['nikImmutable409'] = true;
    echo "    >>> LULUS: Percobaan perubahan NIK menghasilkan HTTP 409 Conflict (IDENTITY_NIK_PERMANENTLY_LOCKED)!\n";
} else {
    echo "    >>> GAGAL: Percobaan kedua NIK tidak menghasilkan 409 ({$secondNikResp->status()})\n";
}

echo "1.5 Request OTP Challenge untuk: {$custEmail}\n";
$otpResp = Http::acceptJson()->post("{$baseUrl}/otp/challenges", [
    'purpose' => 'ACCOUNT_VERIFICATION',
    'identifier' => $custEmail,
]);
$challengeId = $otpResp->json('data.challenge_id');
echo "    Status: {$otpResp->status()}, Challenge ID: {$challengeId}\n";

// Dapatkan OTP dari DB test fixture (tanpa memalsukan pengiriman email Brevo live)
$challenge = OtpChallenge::find($challengeId);
$crackedOtp = bruteForceOtp($challenge->otp_hmac, $custEmail, $otpSecret);
echo "    [Test Fixture Secure Hash Cracker] OTP Code: {$crackedOtp}\n";

echo "1.6 Verifikasi OTP Challenge\n";
$verifyResp = Http::acceptJson()->post("{$baseUrl}/otp/challenges/{$challengeId}/verify", [
    'code' => $crackedOtp,
    'identifier' => $custEmail,
]);
echo "    Status: {$verifyResp->status()}, Next Step: " . ($verifyResp->json('data.next_step') ?? 'NONE') . "\n";

echo "1.7 Cek /auth/me -> Wajib ACTIVE\n";
$meResp = Http::withToken($custToken)->acceptJson()->get("{$baseUrl}/auth/me");
$finalStatus = $meResp->json('data.status');
echo "    Status: {$meResp->status()}, User Status: {$finalStatus}\n";

if ($finalStatus === 'ACTIVE') {
    $results['customerLifecycle'] = true;
    echo "    >>> LULUS: Customer berhasil bertransisi ke status ACTIVE!\n";
} else {
    echo "    >>> GAGAL: Status customer bukan ACTIVE ({$finalStatus})\n";
}

// ============================================================================
// 2. ADMIN OPERATIONS LEGAL BUSINESS QUEUE & REVIEW
// ============================================================================
echo "\n--- [2/5] UJI ADMIN OPERATIONS LEGAL BUSINESS QUEUE & REVIEW ---\n";
// Buat aplikasi bisnis baru
$appId = (string) Str::uuid();
$appCode = 'APP-CLOSURE-' . time();
$businessApp = BusinessApplication::create([
    'id' => $appId,
    'application_code' => $appCode,
    'applicant_user_id' => $custUser->id,
    'target_role' => 'WORKSHOP_PARTNER',
    'status' => 'PENDING_REVIEW',
    'revision_no' => 1,
    'lock_version' => 1,
    'draft_data_ciphertext' => Crypt::encryptString(json_encode(['business_name' => 'Bengkel Sejahtera Bersama'])),
    'submitted_at' => now(),
]);

ApplicationDocument::create([
    'id' => (string) Str::uuid(),
    'application_id' => $appId,
    'revision_no' => 1,
    'doc_type' => 'NIB',
    'private_storage_key' => 'documents/nib_bengkel.pdf',
    'sha256' => hash('sha256', 'dummy_nib'),
    'mime' => 'application/pdf',
    'size_bytes' => 102400,
    'verification_status' => 'PENDING',
]);

echo "2.1 Login sebagai Admin Operations (admin@servio.id)\n";
$adminLogin = Http::acceptJson()->post("{$baseUrl}/auth/login", [
    'email' => 'admin@servio.id',
    'password' => '12345678',
]);
$adminToken = $adminLogin->json('data.token');
echo "    Status: {$adminLogin->status()}, Token diperoleh: " . ($adminToken ? 'Ya' : 'Tidak') . "\n";

echo "2.2 Admin Mengakses Antrean Aplikasi Legal Bisnis (/registration-applications)\n";
$opsQueue = Http::withToken($adminToken)->acceptJson()->get("{$baseUrl}/registration-applications");
$items = $opsQueue->json('data.items') ?? $opsQueue->json('data') ?? [];
$targetFound = false;
foreach ($items as $item) {
    if (($item['id'] ?? '') === $appId) {
        $targetFound = true;
        break;
    }
}
echo "    Status: {$opsQueue->status()}, Total Antrean: " . count($items) . ", Ditemukan: " . ($targetFound ? 'Ya' : 'Tidak') . "\n";

echo "2.3 Admin Menyetujui (APPROVE) Aplikasi Bisnis: {$appId}\n";
$reviewResp = Http::withToken($adminToken)->acceptJson()->post("{$baseUrl}/registration-applications/{$appId}/review", [
    'action' => 'APPROVE',
    'decision' => 'APPROVE',
    'reviewNote' => 'Dokumen NIB dan profil bengkel sah dan terverifikasi.',
    'reason' => 'Dokumen NIB dan profil bengkel sah dan terverifikasi.',
]);
echo "    Status: {$reviewResp->status()}, Message: " . ($reviewResp->json('message') ?? 'OK') . "\n";

$refreshedApp = BusinessApplication::find($appId);
$decisionRecord = ApplicationDecision::where('application_id', $appId)->first();
echo "    Database Status: {$refreshedApp->status}, Decision: {$decisionRecord?->decision}\n";

if ($refreshedApp->status === 'APPROVED' && $decisionRecord?->decision === 'APPROVE') {
    $results['adminOperationsReview'] = true;
    echo "    >>> LULUS: Admin Legal Business Review & Perubahan MySQL Berhasil!\n";
} else {
    echo "    >>> GAGAL: Status aplikasi belum APPROVED ({$refreshedApp->status})\n";
}

// ============================================================================
// 3. CEO EMPLOYEE KYC & RBAC GUARD (V08 & V09)
// ============================================================================
echo "\n--- [3/5] UJI CEO EMPLOYEE KYC & RBAC GUARD (V08 & V09) ---\n";
// Buat user staf dan verification request
$staffUser = User::create([
    'id' => (string) Str::uuid(),
    'email' => 'technician_' . time() . '@servio.id',
    'phone_e164' => '+62817' . rand(10000000, 99999999),
    'status' => 'PENDING',
]);

$kycId = (string) Str::uuid();
$kycReq = IdentityVerificationRequest::create([
    'id' => $kycId,
    'user_id' => $staffUser->id,
    'kind' => 'EMPLOYEE_KYC',
    'status' => 'PENDING',
    'nik_ciphertext' => Crypt::encryptString('3201010101010088'),
    'nik_lookup_hash' => hash('sha256', '3201010101010088'),
]);

echo "3.1 Admin Operations mencoba mengakses Antrean KYC (/ceo/identity/verifications) -> Wajib 403 Forbidden\n";
$adminKycList = Http::withToken($adminToken)->acceptJson()->get("{$baseUrl}/ceo/identity/verifications");
echo "    Status: {$adminKycList->status()}\n";

echo "3.2 Admin Operations mencoba mengeksekusi Keputusan KYC -> Wajib 403 Forbidden\n";
$adminKycDec = Http::withToken($adminToken)->acceptJson()->post("{$baseUrl}/ceo/identity/verifications/{$kycId}/decision", [
    'decision' => 'APPROVE',
    'reason' => 'Admin mencoba memotong wewenang CEO',
]);
echo "    Status: {$adminKycDec->status()}, Error: " . json_encode($adminKycDec->json('error') ?? $adminKycDec->json('message')) . "\n";

if ($adminKycList->status() === 403 && $adminKycDec->status() === 403) {
    $results['adminKycBlocked403'] = true;
    echo "    >>> LULUS: Admin Operations terbukti DITOLAK 403 Forbidden dari Employee KYC!\n";
} else {
    echo "    >>> GAGAL: Admin tidak diblokir 403 dari Employee KYC\n";
}

echo "3.3 Login sebagai CEO (ceo@servio.id)\n";
$ceoLogin = Http::acceptJson()->post("{$baseUrl}/auth/login", [
    'email' => 'ceo@servio.id',
    'password' => '12345678',
]);
$ceoToken = $ceoLogin->json('data.token');
echo "    Status: {$ceoLogin->status()}, Token diperoleh: " . ($ceoToken ? 'Ya' : 'Tidak') . "\n";

echo "3.4 CEO Mengakses Antrean Employee KYC (/ceo/identity/verifications)\n";
$ceoKycList = Http::withToken($ceoToken)->acceptJson()->get("{$baseUrl}/ceo/identity/verifications");
echo "    Status: {$ceoKycList->status()}, Items: " . count($ceoKycList->json('data.items') ?? $ceoKycList->json('data') ?? []) . "\n";

echo "3.5 CEO Mengeksekusi Keputusan (APPROVE) untuk KYC ID: {$kycId}\n";
$ceoKycDec = Http::withToken($ceoToken)->acceptJson()->post("{$baseUrl}/ceo/identity/verifications/{$kycId}/decision", [
    'decision' => 'APPROVE',
    'reason' => 'Disetujui oleh CEO setelah pemeriksaan dokumen.',
]);
echo "    Status: {$ceoKycDec->status()}, Decision Status: " . ($ceoKycDec->json('data.status') ?? 'OK') . "\n";

$refreshedKyc = IdentityVerificationRequest::find($kycId);
echo "    Database Status: {$refreshedKyc->status}, Reviewed By: {$refreshedKyc->reviewed_by}\n";

if ($refreshedKyc->status === 'VERIFIED') {
    $results['ceoKycExclusive'] = true;
    echo "    >>> LULUS: CEO Employee KYC Berhasil & Tercatat di MySQL!\n";
} else {
    echo "    >>> GAGAL: Status KYC belum VERIFIED ({$refreshedKyc->status})\n";
}

// ============================================================================
// 4. INVITATION WORKER & STAFF (12 JAM TTL, VALID VS EXPIRED)
// ============================================================================
echo "\n--- [4/5] UJI INVITATION WORKER & STAFF (12H TTL, VALID VS EXPIRED) ---\n";
$org = Organization::first();
$orgId = $org ? $org->id : null;

// 4.1 Token Valid (< 12 jam)
$rawTokenValid = bin2hex(random_bytes(20));
$tokenHashValid = hash('sha256', $rawTokenValid);
$invValidId = (string) Str::uuid();
$validEmail = 'worker_val_' . time() . '@servio.id';

Invitation::create([
    'id' => $invValidId,
    'kind' => 'WORKER',
    'issuer_user_id' => $custUser->id,
    'recipient_email' => $validEmail,
    'organization_id' => $orgId,
    'target_role' => 'WORKER_TECHNICIAN',
    'token_hash' => $tokenHashValid,
    'status' => 'INVITED',
    'expires_at' => now()->addHours(12),
]);

echo "4.1 Terima Undangan Valid (< 12 jam TTL)\n";
$acceptValid = Http::acceptJson()->post("{$baseUrl}/invitations/{$rawTokenValid}/accept", [
    'password' => 'PasswordTeknisi123!',
]);
echo "    Status: {$acceptValid->status()}, Message: " . ($acceptValid->json('message') ?? 'OK') . "\n";

$refreshedInvValid = Invitation::find($invValidId);
echo "    Database Status: {$refreshedInvValid->status}, Accepted At: {$refreshedInvValid->accepted_at}\n";
if ($refreshedInvValid->status === 'ACCEPTED' && $refreshedInvValid->accepted_at) {
    $results['invitationValidAccepted'] = true;
    echo "    >>> LULUS: Undangan valid berhasil diterima dan tercatat di MySQL!\n";
} else {
    echo "    >>> GAGAL: Status undangan belum ACCEPTED\n";
}

// 4.2 Token Expired (> 12 jam lalu)
$rawTokenExp = bin2hex(random_bytes(20));
$tokenHashExp = hash('sha256', $rawTokenExp);
$invExpId = (string) Str::uuid();
$expEmail = 'worker_exp_' . time() . '@servio.id';

Invitation::create([
    'id' => $invExpId,
    'kind' => 'WORKER',
    'issuer_user_id' => $custUser->id,
    'recipient_email' => $expEmail,
    'organization_id' => $orgId,
    'target_role' => 'WORKER_TECHNICIAN',
    'token_hash' => $tokenHashExp,
    'status' => 'INVITED',
    'expires_at' => now()->subHours(2), // Sudah lewat 2 jam
]);

echo "4.2 Preview Undangan Kedaluwarsa -> Wajib 410\n";
$previewExp = Http::acceptJson()->get("{$baseUrl}/invitations/{$rawTokenExp}/preview");
echo "    Preview Status: {$previewExp->status()}\n";

echo "4.3 Terima Undangan Kedaluwarsa (> 12 jam TTL) -> Wajib 410\n";
$acceptExp = Http::acceptJson()->post("{$baseUrl}/invitations/{$rawTokenExp}/accept", [
    'password' => 'PasswordTeknisi123!',
]);
echo "    Accept Status: {$acceptExp->status()}, Error: " . json_encode($acceptExp->json('error') ?? $acceptExp->json('message')) . "\n";
if ($acceptExp->status() === 410 && $previewExp->status() === 410) {
    $results['invitationExpiredRejected410'] = true;
    echo "    >>> LULUS: Undangan kedaluwarsa ditolak secara tepat (HTTP 410 Gone/Expired)!\n";
} else {
    echo "    >>> GAGAL: Undangan kedaluwarsa tidak mengembalikan 410 ({$acceptExp->status()})\n";
}

// ============================================================================
// 5. ROLE & SESSION SECURITY (SWITCH ROLE, FORBIDDEN ACCESS & LOGOUT)
// ============================================================================
echo "\n--- [5/5] UJI ROLE SWITCH, FORBIDDEN ACCESS & SESSION LOGOUT ---\n";
// Ambil user customer yang sudah dibuat
$custMe = Http::withToken($custToken)->acceptJson()->get("{$baseUrl}/auth/me");
echo "5.1 User Customer mencoba mengakses rute CEO -> Wajib 403 Forbidden\n";
$custForbidden = Http::withToken($custToken)->acceptJson()->get("{$baseUrl}/ceo/identity/verifications");
echo "    Status: {$custForbidden->status()}\n";

echo "5.2 Akses /auth/me dengan token CEO aktif -> 200 OK\n";
$preLogoutMe = Http::withToken($ceoToken)->acceptJson()->get("{$baseUrl}/auth/me");
echo "    Status: {$preLogoutMe->status()}\n";

echo "5.3 Logout Session CEO (/auth/logout)\n";
$logoutResp = Http::withToken($ceoToken)->acceptJson()->post("{$baseUrl}/auth/logout");
echo "    Status: {$logoutResp->status()}, Message: " . $logoutResp->json('message') . "\n";

echo "5.4 Akses /auth/me Sesudah Logout -> Wajib 401 Unauthorized\n";
$postLogoutMe = Http::withToken($ceoToken)->acceptJson()->get("{$baseUrl}/auth/me");
echo "    Status: {$postLogoutMe->status()}\n";
if ($postLogoutMe->status() === 401 && $custForbidden->status() === 403) {
    $results['sessionLogout401'] = true;
    echo "    >>> LULUS: RBAC Guard & Session Invalid Setelah Logout (401 Unauthorized)!\n";
} else {
    echo "    >>> GAGAL: Akses sesudah logout tidak mengembalikan 401 ({$postLogoutMe->status()})\n";
}

echo "\n================================================================\n";
echo " REKAPITULASI HASIL VERIFIKASI PENUTUP MODUL 01:\n";
echo "================================================================\n";
foreach ($results as $k => $v) {
    echo sprintf("%-30s : %s\n", $k, $v ? 'PASS' : 'FAIL');
}

$allPass = !in_array(false, $results, true);
if ($allPass) {
    echo "\nSTATUS KELULUSAN BACKEND CLOSURE: 100% PASS\n";
} else {
    echo "\nSTATUS KELULUSAN BACKEND CLOSURE: PARTIAL\n";
}
