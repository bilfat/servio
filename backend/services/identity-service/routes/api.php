<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BusinessApplicationController;
use App\Http\Controllers\Api\OtpKycController;
use App\Http\Controllers\Api\ProfileOrganizationController;
use App\Http\Controllers\Api\StaffGovernanceController;
use App\Http\Controllers\Api\WorkerInvitationController;
use App\Http\Controllers\Internal\InternalIdentityController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SERVIO Modul 01 — Identity & Access Service API Routes
|--------------------------------------------------------------------------
*/

// Public v1 routes (PUB / STEP)
Route::prefix('v1')->group(function () {
    // Auth & Recovery
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/password/forgot', [AuthController::class, 'forgotPassword']); // frontend compatibility alias
    Route::post('/auth/password/verify-otp', function (\Illuminate\Http\Request $request) {
        $code = $request->input('code') ?? $request->input('otp');
        $identifier = $request->input('identifier') ?? $request->input('email');
        $challengeId = $request->input('challenge_id');

        if (empty($code) || (empty($identifier) && empty($challengeId))) {
            return \App\Support\ApiResponse::error('IDENTITY_VALIDATION_FAILED', 'Email/identifier dan kode OTP wajib diisi.', 422);
        }

        if ($challengeId) {
            $challenge = \App\Models\OtpChallenge::find($challengeId);
        } else {
            $hash = \App\Services\OtpService::hashIdentifier($identifier);
            $challenge = \App\Models\OtpChallenge::where('identifier_hash', $hash)
                ->where('purpose', 'PASSWORD_RESET')
                ->where('status', 'ISSUED')
                ->latest()
                ->first();
        }

        if (!$challenge) {
            return \App\Support\ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Tantangan OTP pemulihan sandi tidak ditemukan atau sudah kedaluwarsa.', 404);
        }

        $controller = app(\App\Http\Controllers\Api\OtpKycController::class);
        return $controller->verifyChallenge($request, $challenge->id);
    });
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/auth/password/reset', [AuthController::class, 'resetPassword']); // frontend compatibility alias

    // OTP
    Route::post('/otp/challenges', [OtpKycController::class, 'createChallenge']);
    Route::post('/otp/challenges/{id}/verify', [OtpKycController::class, 'verifyChallenge']);
    Route::post('/otp/challenges/{id}/resend', [OtpKycController::class, 'resendChallenge']);

    // Frontend alias for OTP send/verify
    Route::post('/auth/verification/send', [OtpKycController::class, 'createChallenge']);
    Route::post('/auth/verification/verify', function (\Illuminate\Http\Request $request) {
        // Find latest challenge for identifier or ip
        $code = $request->input('code') ?? $request->input('otp');
        $identifier = $request->input('identifier') ?? $request->input('email');
        $hash = \App\Services\OtpService::hashIdentifier($identifier ?? '');
        $challenge = \App\Models\OtpChallenge::where('identifier_hash', $hash)->where('status', 'ISSUED')->latest()->first();
        if (!$challenge) {
            return \App\Support\ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Tantangan OTP tidak ditemukan.', 404);
        }
        $controller = app(OtpKycController::class);
        return $controller->verifyChallenge($request, $challenge->id);
    });

    // Public Invitation & Activation Endpoints
    Route::get('/invitations/{token}/preview', [WorkerInvitationController::class, 'previewInvitation']);
    Route::get('/invitations/{token}', [WorkerInvitationController::class, 'previewInvitation']);
    Route::get('/auth/invitations/{token}', [WorkerInvitationController::class, 'previewInvitation']);
    Route::post('/invitations/{token}/accept', [WorkerInvitationController::class, 'acceptInvitation']);
    Route::post('/auth/invitations/{token}/accept', [WorkerInvitationController::class, 'acceptInvitation']);
    Route::post('/auth/invitation/complete', function (\Illuminate\Http\Request $request) {
        $token = $request->input('token');
        $controller = app(WorkerInvitationController::class);
        return $controller->acceptInvitation($request, $token);
    });

    // Public Registration Requirements
    Route::get('/registration-document-requirements', function (\Illuminate\Http\Request $request) {
        $type = $request->input('applicantType', 'SERVICE_PROVIDER');
        $requirements = [
            'SERVICE_PROVIDER' => [
                ['id' => 'req-1', 'applicantType' => 'SERVICE_PROVIDER', 'documentType' => 'KTP_PIC', 'label' => 'KTP Penanggung Jawab', 'required' => true, 'description' => 'Foto e-KTP asli yang masih berlaku', 'maxFileSizeMB' => 5, 'allowedExtensions' => ['jpg', 'jpeg', 'png', 'pdf']],
                ['id' => 'req-2', 'applicantType' => 'SERVICE_PROVIDER', 'documentType' => 'NPWP_BISNIS', 'label' => 'NPWP Badan / Usaha', 'required' => true, 'description' => 'NPWP atas nama entitas atau pemilik usaha', 'maxFileSizeMB' => 5, 'allowedExtensions' => ['jpg', 'jpeg', 'png', 'pdf']],
                ['id' => 'req-3', 'applicantType' => 'SERVICE_PROVIDER', 'documentType' => 'NIB', 'label' => 'Nomor Induk Berusaha (NIB)', 'required' => true, 'description' => 'Dokumen NIB dari OSS / BKPM', 'maxFileSizeMB' => 5, 'allowedExtensions' => ['pdf', 'jpg', 'jpeg', 'png']],
                ['id' => 'req-4', 'applicantType' => 'SERVICE_PROVIDER', 'documentType' => 'FOTO_BENGKEL', 'label' => 'Foto Fisik Lokasi / Bengkel', 'required' => false, 'description' => 'Foto tampak depan workshop/bengkel operasional', 'maxFileSizeMB' => 5, 'allowedExtensions' => ['jpg', 'jpeg', 'png', 'webp']],
            ],
            'MERCHANT' => [
                ['id' => 'req-1', 'applicantType' => 'MERCHANT', 'documentType' => 'KTP_PIC', 'label' => 'KTP Penanggung Jawab', 'required' => true, 'description' => 'Foto e-KTP asli yang masih berlaku', 'maxFileSizeMB' => 5, 'allowedExtensions' => ['jpg', 'jpeg', 'png', 'pdf']],
                ['id' => 'req-2', 'applicantType' => 'MERCHANT', 'documentType' => 'NPWP_BISNIS', 'label' => 'NPWP Badan / Usaha', 'required' => true, 'description' => 'NPWP entitas atau perseorangan toko', 'maxFileSizeMB' => 5, 'allowedExtensions' => ['jpg', 'jpeg', 'png', 'pdf']],
                ['id' => 'req-3', 'applicantType' => 'MERCHANT', 'documentType' => 'NIB', 'label' => 'Nomor Induk Berusaha (NIB)', 'required' => true, 'description' => 'Dokumen NIB legal toko retail', 'maxFileSizeMB' => 5, 'allowedExtensions' => ['pdf', 'jpg', 'jpeg', 'png']],
                ['id' => 'req-4', 'applicantType' => 'MERCHANT', 'documentType' => 'FOTO_TOKO', 'label' => 'Foto Fisik Toko / Gudang', 'required' => false, 'description' => 'Foto toko atau rak display produk', 'maxFileSizeMB' => 5, 'allowedExtensions' => ['jpg', 'jpeg', 'png', 'webp']],
            ],
            'SUPPLIER' => [
                ['id' => 'req-1', 'applicantType' => 'SUPPLIER', 'documentType' => 'KTP_PIC', 'label' => 'KTP Direksi / PIC', 'required' => true, 'description' => 'Foto e-KTP direksi/kuasa pengurus', 'maxFileSizeMB' => 5, 'allowedExtensions' => ['jpg', 'jpeg', 'png', 'pdf']],
                ['id' => 'req-2', 'applicantType' => 'SUPPLIER', 'documentType' => 'NPWP_BISNIS', 'label' => 'NPWP Perusahaan', 'required' => true, 'description' => 'NPWP perusahaan distributor/manufaktur', 'maxFileSizeMB' => 5, 'allowedExtensions' => ['jpg', 'jpeg', 'png', 'pdf']],
                ['id' => 'req-3', 'applicantType' => 'SUPPLIER', 'documentType' => 'NIB', 'label' => 'NIB & Izin Edar / Distributor', 'required' => true, 'description' => 'NIB dan izin usaha resmi', 'maxFileSizeMB' => 8, 'allowedExtensions' => ['pdf', 'jpg', 'jpeg', 'png']],
                ['id' => 'req-4', 'applicantType' => 'SUPPLIER', 'documentType' => 'AKTA_PERUSAHAAN', 'label' => 'Akta Pendirian / SK Kemenkumham', 'required' => false, 'description' => 'Salinan akta notaris & SK persetujuan', 'maxFileSizeMB' => 10, 'allowedExtensions' => ['pdf']],
            ],
        ];
        $list = $requirements[$type] ?? $requirements['SERVICE_PROVIDER'];
        return \App\Support\ApiResponse::success($list, 'IDENTITY_DOC_REQUIREMENTS_LOADED', 200);
    });

    // Public / Draft Business Application Submission & Status Tracking
    Route::post('/registration-applications', [BusinessApplicationController::class, 'createApplication']);
    Route::get('/registration-applications/{id}', [BusinessApplicationController::class, 'getApplication']);
    Route::match(['patch', 'put'], '/registration-applications/{id}', [BusinessApplicationController::class, 'updateApplication']);
    Route::post('/registration-applications/{id}/submit', [BusinessApplicationController::class, 'submitApplication']);
    Route::post('/registration-applications/{id}/resubmit', [BusinessApplicationController::class, 'resubmitApplication']);
    Route::post('/registration-applications/{id}/documents', [BusinessApplicationController::class, 'uploadDocument']);
    Route::delete('/registration-applications/{id}/documents/{docId}', [BusinessApplicationController::class, 'deleteDocument']);
    Route::get('/registration-applications/{id}/documents/{docId}/download', [BusinessApplicationController::class, 'downloadDocument']);
    Route::get('/registration-applications/{id}/documents/{docId}/view', [BusinessApplicationController::class, 'downloadDocument']);

    // Protected Routes (Session / Token Authenticated)
    Route::middleware('identity.auth')->group(function () {
        // Account & Context
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::match(['patch', 'post'], '/auth/context', [AuthController::class, 'switchContext']);
        Route::post('/auth/roles/switch', [AuthController::class, 'switchContext']); // frontend alias
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/logout-all', [AuthController::class, 'logoutAll']);
        Route::get('/auth/sessions', [AuthController::class, 'sessions']);
        Route::delete('/auth/sessions/{id}', [AuthController::class, 'revokeSession']);
        Route::post('/auth/password/change', [AuthController::class, 'changePassword']);
        Route::get('/auth/onboarding/status', [AuthController::class, 'onboardingStatus']);
        Route::post('/auth/account/deactivate-request', [AuthController::class, 'deactivateRequest']);

        // Customer NIK (CR-01 & CR-02: V11)
        Route::post('/identity/customer/nik', [OtpKycController::class, 'submitCustomerNik']);
        Route::post('/auth/customer/onboarding/nik', [OtpKycController::class, 'submitCustomerNik']);

        // KYC & Documents
        Route::post('/identity/verifications', [OtpKycController::class, 'submitVerification']);
        Route::get('/identity/verifications/me', [OtpKycController::class, 'myVerifications']);
        Route::post('/identity/documents', [OtpKycController::class, 'uploadDocument']);
        Route::get('/identity/documents/{id}/download', [OtpKycController::class, 'downloadDocument']);
        Route::get('/identity/verifications/{id}', [OtpKycController::class, 'getVerification']);

        // CEO Employee KYC Verification (CR-02: Exclusive to CEO)
        Route::get('/ceo/identity/verifications', [OtpKycController::class, 'adminListVerifications']);
        Route::post('/ceo/identity/verifications/{id}/decision', [OtpKycController::class, 'adminDecision']);
        Route::get('/ceo/staff/verifications', [OtpKycController::class, 'adminListVerifications']);
        Route::post('/ceo/staff/verifications/{id}/decision', [OtpKycController::class, 'adminDecision']);

        // Business Applications (Own)
        Route::post('/business/applications', [BusinessApplicationController::class, 'createApplication']);
        Route::get('/business/applications', [BusinessApplicationController::class, 'myApplications']);
        Route::get('/business/applications/{id}', [BusinessApplicationController::class, 'getApplication']);
        Route::match(['patch', 'put'], '/business/applications/{id}', [BusinessApplicationController::class, 'updateApplication']);
        Route::post('/business/applications/{id}/documents', [BusinessApplicationController::class, 'uploadDocument']);
        Route::get('/business/applications/{id}/documents/{document_id}/download', [BusinessApplicationController::class, 'downloadDocument']);
        Route::post('/business/applications/{id}/submit', [BusinessApplicationController::class, 'submitApplication']);
        Route::post('/business/applications/{id}/resubmit', [BusinessApplicationController::class, 'resubmitApplication']);
        Route::get('/business/applications/{id}/history', [BusinessApplicationController::class, 'applicationHistory']);

        // Ops & Admin Registration Applications List & Review
        Route::get('/registration-applications', function (\Illuminate\Http\Request $request) {
            $user = Auth::user();
            $controller = app(BusinessApplicationController::class);
            if ($user && $user->hasPermission('identity.business.application.review')) {
                return $controller->adminListApplications($request);
            }
            return $controller->myApplications($request);
        });
        Route::post('/registration-applications/{id}/review', [BusinessApplicationController::class, 'adminDecision']);
        Route::delete('/registration-applications/{id}', [BusinessApplicationController::class, 'deleteApplication']);
        Route::get('/registration-applications-monitoring/stats', function () {
            $stats = [
                'total' => \App\Models\BusinessApplication::count(),
                'underReview' => \App\Models\BusinessApplication::where('status', 'PENDING_REVIEW')->count(),
                'pendingReview' => \App\Models\BusinessApplication::where('status', 'PENDING_REVIEW')->count(),
                'approved' => \App\Models\BusinessApplication::where('status', 'APPROVED')->count(),
                'revisionRequired' => \App\Models\BusinessApplication::where('status', 'REVISION_REQUIRED')->count(),
                'rejected' => \App\Models\BusinessApplication::where('status', 'REJECTED')->count(),
            ];
            return \App\Support\ApiResponse::success($stats, 'IDENTITY_APPLICATION_STATS_LOADED', 200);
        });

        // Profile, Organization & RBAC
        Route::get('/profiles/me', [ProfileOrganizationController::class, 'myProfile']);
        Route::patch('/profiles/me', [ProfileOrganizationController::class, 'updateMyProfile']);
        Route::post('/profiles/change-requests', [ProfileOrganizationController::class, 'requestChange']);
        Route::get('/profiles/change-requests/{id}', [ProfileOrganizationController::class, 'getChangeRequest']);
        Route::get('/organizations/me', [ProfileOrganizationController::class, 'myOrganizations']);
        Route::get('/organizations/{id}', [ProfileOrganizationController::class, 'getOrganization']);
        Route::match(['patch', 'put'], '/organizations/{id}/profile', [ProfileOrganizationController::class, 'updateOrganizationProfile']);
        Route::match(['patch', 'put'], '/organizations/{id}', [ProfileOrganizationController::class, 'updateOrganizationProfile']);
        Route::match(['patch', 'post'], '/organizations/{id}/operational-status', [ProfileOrganizationController::class, 'updateOperationalStatus']);
        Route::match(['patch', 'post'], '/organizations/{id}/status', [ProfileOrganizationController::class, 'updateOperationalStatus']);
        Route::get('/organizations/{id}/memberships', [ProfileOrganizationController::class, 'organizationMemberships']);
        Route::get('/roles/me', [ProfileOrganizationController::class, 'myRoles']);
        Route::get('/permissions/me', [ProfileOrganizationController::class, 'myPermissions']);
        Route::post('/profiles/me/avatar', [ProfileOrganizationController::class, 'uploadAvatar']);

        // Customer Addresses (Buku Alamat Pengerjaan)
        Route::get('/me/addresses', [\App\Http\Controllers\Api\UserAddressController::class, 'index']);
        Route::post('/me/addresses', [\App\Http\Controllers\Api\UserAddressController::class, 'store']);
        Route::match(['patch', 'put'], '/me/addresses/{id}', [\App\Http\Controllers\Api\UserAddressController::class, 'update']);
        Route::delete('/me/addresses/{id}', [\App\Http\Controllers\Api\UserAddressController::class, 'destroy']);

        // Internal Accounts & Team Endpoints
        Route::get('/internal/team', [StaffGovernanceController::class, 'listStaff']);
        Route::get('/internal/accounts', [StaffGovernanceController::class, 'listAccounts']);
        Route::post('/internal/accounts', [StaffGovernanceController::class, 'createStaff']);
        Route::get('/internal/accounts/{id}', [StaffGovernanceController::class, 'getStaffAccount']);
        Route::patch('/internal/accounts/{id}/status', [StaffGovernanceController::class, 'updateStaffStatus']);
        Route::delete('/internal/accounts/{id}', [StaffGovernanceController::class, 'deleteStaffAccount']);
        Route::get('/internal/accounts/{id}/onboarding', [StaffGovernanceController::class, 'getOnboardingDetail']);
        Route::patch('/internal/accounts/{id}/employment', [StaffGovernanceController::class, 'updateEmploymentDetail']);
        Route::get('/internal/accounts/{id}/invitation-link', [StaffGovernanceController::class, 'getStaffInvitationLink']);
        Route::post('/internal/accounts/{id}/resend-invitation', [StaffGovernanceController::class, 'resendStaffInvitation']);
        Route::post('/internal/accounts/{id}/cancel-invitation', [StaffGovernanceController::class, 'cancelStaffInvitation']);

        // Provider Workers & Invitations
        Route::get('/provider/workers', [WorkerInvitationController::class, 'listWorkers']);
        Route::post('/provider/workers', [WorkerInvitationController::class, 'inviteWorker']);
        Route::get('/provider/workers/{id}', [WorkerInvitationController::class, 'getWorker']);
        Route::post('/provider/worker-invitations', [WorkerInvitationController::class, 'inviteWorker']);
        Route::get('/provider/worker-invitations', [WorkerInvitationController::class, 'listInvitations']);
        Route::post('/provider/worker-invitations/{id}/resend', [WorkerInvitationController::class, 'resendInvitation']);
        Route::post('/provider/workers/{id}/deactivate', [WorkerInvitationController::class, 'deactivateWorker']);

        // Staff Onboarding Steps
        Route::get('/staff/onboarding/me', [StaffGovernanceController::class, 'myOnboarding']);
        Route::get('/staff/onboarding', [StaffGovernanceController::class, 'myOnboarding']); // compatibility alias
        Route::patch('/staff/onboarding/profile', [StaffGovernanceController::class, 'completeProfileStep']);
        Route::post('/staff/onboarding/kyc', [StaffGovernanceController::class, 'completeKycStep']);
        Route::post('/staff/onboarding/nda', [StaffGovernanceController::class, 'completeNdaStep']);
        Route::post('/staff/onboarding/confirm-access', [StaffGovernanceController::class, 'confirmAccessStep']);
        Route::post('/staff/onboarding/submit', [StaffGovernanceController::class, 'submitOnboarding']);

        // Admin & Reviewer Endpoints
        Route::middleware('identity.perm:identity.kyc.review')->group(function () {
            Route::get('/admin/identity/verifications', [OtpKycController::class, 'adminListVerifications']);
            Route::post('/admin/identity/verifications/{id}/decision', [OtpKycController::class, 'adminDecision']);
        });

        Route::middleware('identity.perm:identity.business.application.review')->group(function () {
            Route::get('/admin/business/applications', [BusinessApplicationController::class, 'adminListApplications']);
            Route::get('/admin/business/applications/{id}', [BusinessApplicationController::class, 'adminGetApplication']);
            Route::post('/admin/business/applications/{id}/decisions', [BusinessApplicationController::class, 'adminDecision']);
            Route::post('/admin/applications/{id}/decision', [BusinessApplicationController::class, 'adminDecision']);
            Route::get('/admin/applications/{id}', [BusinessApplicationController::class, 'adminGetApplication']);
            Route::get('/admin/business/applications/{id}/history', [BusinessApplicationController::class, 'applicationHistory']);
        });

        Route::middleware('identity.perm:identity.profile.sensitive_change.review')->group(function () {
            Route::get('/admin/profiles/change-requests', [ProfileOrganizationController::class, 'adminListChangeRequests']);
            Route::post('/admin/profiles/change-requests/{id}/decisions', [ProfileOrganizationController::class, 'adminDecisionChangeRequest']);
        });

        // CEO Staff Management
        Route::middleware('identity.perm:identity.staff.create')->group(function () {
            Route::post('/ceo/staff', [StaffGovernanceController::class, 'createStaff']);
        });
        Route::middleware('identity.perm:identity.staff.read')->group(function () {
            Route::get('/ceo/staff', [StaffGovernanceController::class, 'listStaff']);
            Route::get('/ceo/staff/{id}', [StaffGovernanceController::class, 'getStaff']);
            Route::get('/ceo/staff/{id}/invitation-link', [StaffGovernanceController::class, 'getStaffInvitationLink']);
        });
        Route::middleware('identity.perm:identity.staff.access.manage')->group(function () {
            Route::patch('/ceo/staff/{id}/access', [StaffGovernanceController::class, 'manageStaffAccess']);
        });
        Route::middleware('identity.perm:identity.staff.lifecycle.manage')->group(function () {
            Route::post('/ceo/staff/{id}/suspend', [StaffGovernanceController::class, 'suspendStaff']);
            Route::post('/ceo/staff/{id}/activate', [StaffGovernanceController::class, 'activateStaff']);
            Route::post('/ceo/staff/{id}/deactivate', [StaffGovernanceController::class, 'deactivateStaff']);
            Route::post('/ceo/staff/{id}/resend-invitation', [StaffGovernanceController::class, 'resendStaffInvitation']);
            Route::post('/ceo/staff/{id}/cancel-invitation', [StaffGovernanceController::class, 'cancelStaffInvitation']);
        });

        // User Governance (Admin)
        Route::middleware('identity.perm:identity.account.suspend')->group(function () {
            Route::post('/admin/users/{id}/suspend', [StaffGovernanceController::class, 'adminSuspendUser']);
            Route::post('/admin/users/{id}/reactivate', [StaffGovernanceController::class, 'adminReactivateUser']);
        });
        Route::middleware('identity.perm:identity.account.read_scoped')->group(function () {
            Route::get('/admin/users', [StaffGovernanceController::class, 'adminListUsers']);
            Route::get('/admin/users/{id}', [StaffGovernanceController::class, 'adminGetUser']);
        });

        // Audit Logs (Staff)
        Route::middleware('identity.perm:identity.audit.read_scoped')->group(function () {
            Route::get('/audit/identity', [InternalIdentityController::class, 'getAuditLogs']);
        });
    });
});

// Internal Machine-to-Machine Endpoints (SYS only, guarded by internal key)
Route::prefix('internal/v1')->middleware('identity.internal')->group(function () {
    Route::post('/auth/sessions/introspect', [InternalIdentityController::class, 'introspectSession']);
    Route::post('/authorization/evaluate', [InternalIdentityController::class, 'evaluateAuthorization']);
    Route::get('/users/{id}/access-context', [InternalIdentityController::class, 'getUserAccessContext']);
    Route::get('/organizations/{id}/status', [InternalIdentityController::class, 'getOrganizationStatus']);
    Route::get('/organizations/{id}/public-profile', [InternalIdentityController::class, 'getOrganizationPublicProfile']);
});
