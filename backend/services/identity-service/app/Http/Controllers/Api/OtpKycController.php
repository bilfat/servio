<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IdentityDocument;
use App\Models\IdentityVerificationRequest;
use App\Models\OtpChallenge;
use App\Models\User;
use App\Models\UserNikRecord;
use App\Services\AuditService;
use App\Services\OtpService;
use App\Services\OutboxService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class OtpKycController extends Controller
{
    /**
     * V01: Request OTP Challenge
     */
    public function createChallenge(Request $request)
    {
        // Bersihkan akun pendaftar yang tidak memasukkan OTP lebih dari 1 jam
        User::cleanupUnverifiedExpiredUsers(1);

        $validated = $request->validate([
            'purpose' => 'required|string|in:ACCOUNT_VERIFICATION,PASSWORD_RESET,ACCOUNT_LINKING,STEP_UP',
            'identifier' => 'nullable|string',
        ]);

        $user = Auth::user();
        $identifier = $validated['identifier'] ?? $user?->email ?? $user?->phone_e164;

        if (empty($identifier)) {
            return ApiResponse::error(
                'IDENTITY_VALIDATION_FAILED',
                'Tujuan pengiriman OTP atau nomor/email wajib ditentukan.',
                422
            );
        }

        $userId = $user?->id;
        if (!$userId) {
            $matchedUser = User::where('email', $identifier)->orWhere('phone_e164', $identifier)->first();
            $userId = $matchedUser?->id;
        }

        $challenge = OtpService::createChallenge($userId, $identifier, $validated['purpose']);

        // Mask destination
        $masked = str_contains($identifier, '@')
            ? substr($identifier, 0, 2) . '***@' . explode('@', $identifier)[1]
            : substr($identifier, 0, 4) . '***' . substr($identifier, -2);

        AuditService::log(
            $userId,
            'IDENTITY_OTP_CHALLENGE_CREATED',
            'otp_challenge',
            $challenge->id,
            'SUCCESS',
            ['purpose' => $validated['purpose']]
        );

        return ApiResponse::success([
            'challenge_id' => $challenge->id,
            'masked_destination' => $masked,
            'issued_at' => $challenge->created_at?->toIso8601String() ?? now()->toIso8601String(),
            'expires_at' => $challenge->expires_at->toIso8601String(),
            'resend_after' => $challenge->resend_available_at?->toIso8601String(),
        ], 'IDENTITY_OTP_REQUEST_ACCEPTED', 202);
    }

    /**
     * V02: Verify OTP Challenge
     */
    public function verifyChallenge(Request $request, string $id)
    {
        $validated = $request->validate([
            'otp' => 'nullable|string',
            'code' => 'nullable|string',
            'identifier' => 'nullable|string',
        ]);

        $otp = $validated['otp'] ?? $validated['code'] ?? '';
        if (empty($otp)) {
            return ApiResponse::error('IDENTITY_VALIDATION_FAILED', 'Kode OTP wajib diisi.', 422);
        }

        $user = Auth::user();
        $identifier = $validated['identifier'] ?? $user?->email ?? $user?->phone_e164;

        $result = OtpService::verifyChallenge($id, $otp, $identifier);

        if (!$result['success']) {
            return ApiResponse::error(
                $result['code'],
                $result['message'],
                $result['status']
            );
        }

        /** @var OtpChallenge $challenge */
        $challenge = $result['challenge'];
        $targetUser = null;

        // If purpose was ACCOUNT_VERIFICATION, mark user's email/phone verified
        if ($challenge->user_id && $challenge->purpose === 'ACCOUNT_VERIFICATION') {
            $targetUser = User::find($challenge->user_id);
            if ($targetUser) {
                if ($targetUser->status === 'VERIFICATION_REQUIRED' && $targetUser->created_at < now()->subHour()) {
                    DB::transaction(function () use ($targetUser) {
                        UserProfile::where('user_id', $targetUser->id)->delete();
                        RoleAssignment::where('user_id', $targetUser->id)->delete();
                        $targetUser->delete();
                    });
                    return ApiResponse::error(
                        'IDENTITY_REGISTRATION_EXPIRED',
                        'Batas waktu verifikasi pendaftaran telah kedaluwarsa (lebih dari 1 jam). Data pendaftaran Anda telah dihapus. Silakan melakukan pendaftaran ulang.',
                        410
                    );
                }

                if ($targetUser->email) {
                    $targetUser->email_verified_at = now();
                }
                if ($targetUser->phone_e164) {
                    $targetUser->phone_verified_at = now();
                }

                // CR-01: Customer activates when email OTP is verified AND NIK 16 digit format is valid
                $hasValidNik = UserNikRecord::where('user_id', $targetUser->id)->exists();

                if ($hasValidNik) {
                    $targetUser->status = 'ACTIVE';
                }

                $targetUser->save();

                OutboxService::publish(
                    'user',
                    $targetUser->id,
                    'identity.user.contact_verified.v1',
                    ['user_id' => $targetUser->id, 'status' => $targetUser->status]
                );
            }
        } elseif (!$challenge->user_id && $challenge->purpose === 'ACCOUNT_VERIFICATION' && $identifier) {
            $targetUser = User::where('email', $identifier)->orWhere('phone_e164', $identifier)->first();
            if ($targetUser) {
                if ($targetUser->email) {
                    $targetUser->email_verified_at = now();
                }
                if ($targetUser->phone_e164) {
                    $targetUser->phone_verified_at = now();
                }

                $hasValidNik = UserNikRecord::where('user_id', $targetUser->id)->exists();
                if ($hasValidNik) {
                    $targetUser->status = 'ACTIVE';
                }
                $targetUser->save();
            }
        }

        AuditService::log(
            $challenge->user_id ?? $targetUser?->id,
            'IDENTITY_OTP_VERIFIED',
            'otp_challenge',
            $challenge->id,
            'SUCCESS'
        );

        $nextStep = 'SUBMIT_NIK_FORMAT';
        $accountStatus = 'VERIFICATION_REQUIRED';

        if ($targetUser) {
            $accountStatus = $targetUser->status;
            if ($targetUser->status === 'ACTIVE') {
                $nextStep = 'CUSTOMER_ACTIVE';
            }
        }

        $responseData = [
            'verified' => true,
            'next_step' => $nextStep,
            'account_status' => $accountStatus,
        ];

        if (!empty($result['reset_grant'])) {
            $responseData['reset_grant'] = $result['reset_grant'];
        }

        return ApiResponse::success($responseData, 'IDENTITY_OTP_VERIFIED', 200);
    }

    /**
     * V03: Resend OTP
     */
    public function resendChallenge(Request $request, string $id)
    {
        $user = Auth::user();
        $challenge = OtpChallenge::find($id);
        if (!$challenge) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Tantangan OTP tidak ditemukan.', 404);
        }

        $identifier = $request->input('identifier') ?? $user?->email ?? $user?->phone_e164;
        if (!$identifier && $challenge->user_id) {
            $targetUser = User::find($challenge->user_id);
            $identifier = $targetUser?->email ?? $targetUser?->phone_e164;
        }

        if (!$identifier) {
            return ApiResponse::error('IDENTITY_VALIDATION_FAILED', 'Tujuan pengiriman tidak ditemukan.', 422);
        }

        $result = OtpService::resend($id, $identifier);

        if (!$result['success']) {
            return ApiResponse::error(
                $result['code'],
                $result['message'],
                $result['status'],
                [],
                [],
                $result['retry_after'] ?? null
            );
        }

        $newChallenge = $result['challenge'];
        return ApiResponse::success([
            'challenge_id' => $newChallenge->id,
            'resend_after' => $newChallenge->resend_available_at?->toIso8601String(),
        ], 'IDENTITY_OTP_RESENT', 202);
    }

    /**
     * V04: Submit Identity Verification (EMPLOYEE KYC ONLY per CR-01 & CR-02)
     */
    public function submitVerification(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'kind' => 'required|string|in:EMPLOYEE_KYC',
            'nik' => 'nullable|string|max:32',
            'legal_name' => 'nullable|string|max:160',
            'document_ids' => 'nullable|array',
            'document_ids.*' => 'string',
        ]);

        $nikCipher = !empty($validated['nik']) ? Crypt::encryptString($validated['nik']) : null;
        $nikHash = !empty($validated['nik']) ? hash('sha256', trim($validated['nik'])) : null;

        $verification = DB::transaction(function () use ($user, $validated, $nikCipher, $nikHash) {
            $req = IdentityVerificationRequest::create([
                'user_id' => $user->id,
                'kind' => 'EMPLOYEE_KYC',
                'status' => 'PENDING',
                'nik_ciphertext' => $nikCipher,
                'nik_lookup_hash' => $nikHash,
            ]);

            if (!empty($validated['document_ids'])) {
                IdentityDocument::whereIn('id', $validated['document_ids'])
                    ->update(['verification_request_id' => $req->id]);
            }

            AuditService::log($user->id, 'IDENTITY_KYC_SUBMITTED', 'verification_request', $req->id, 'SUCCESS');
            OutboxService::publish('verification_request', $req->id, 'identity.kyc.submitted.v1', [
                'request_id' => $req->id,
                'user_id' => $user->id,
                'kind' => $req->kind,
            ]);

            return $req;
        });

        return ApiResponse::success([
            'id' => $verification->id,
            'kind' => $verification->kind,
            'status' => $verification->status,
        ], 'IDENTITY_KYC_SUBMITTED', 201);
    }

    /**
     * V05: List Own Verifications
     */
    public function myVerifications(Request $request)
    {
        $user = Auth::user();
        $items = IdentityVerificationRequest::where('user_id', $user->id)
            ->with('documents')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($v) => $this->formatVerificationView($v));

        return ApiResponse::success(['items' => $items, 'has_more' => false], 'IDENTITY_VERIFICATIONS_LIST', 200);
    }

    /**
     * V06: Upload Identity Document (Employee KYC Evidence Only)
     */
    public function uploadDocument(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'file' => 'required|file|max:5120|mimes:jpeg,jpg,png,pdf',
            'document_type' => 'nullable|string',
            'type' => 'nullable|string',
            'verification_request_id' => 'nullable|string',
        ], [
            'file.max' => 'Ukuran berkas e-KTP maksimal 5MB.',
            'file.mimes' => 'Format berkas e-KTP harus berupa JPEG, JPG, PNG, atau PDF.',
        ]);

        $file = $request->file('file');
        $docType = $validated['document_type'] ?? $validated['type'] ?? 'EMPLOYEE_ID';

        $storagePath = $file->store('private/identity_documents');
        $sha256 = hash_file('sha256', $file->getRealPath());

        $doc = IdentityDocument::create([
            'verification_request_id' => $validated['verification_request_id'] ?? null,
            'type' => $docType,
            'private_storage_key' => $storagePath,
            'sha256' => $sha256,
            'mime' => $file->getClientMimeType(),
            'size_bytes' => $file->getSize(),
            'uploaded_at' => now(),
        ]);

        AuditService::log($user->id, 'IDENTITY_DOCUMENT_UPLOADED', 'identity_document', $doc->id, 'SUCCESS');

        return ApiResponse::success([
            'document_id' => $doc->id,
            'verification_status' => 'PENDING',
        ], 'IDENTITY_DOCUMENT_UPLOADED', 201);
    }

    /**
     * V07: Download Identity Document (Staff Owner or CEO Reviewer Only)
     */
    public function downloadDocument(Request $request, string $id)
    {
        $user = Auth::user();
        $doc = IdentityDocument::find($id);

        if (!$doc) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Dokumen tidak ditemukan.', 404);
        }

        // CR-02: Only staff owner or CEO_PRODUCT_OWNER with review permission. Admin Operations is FORBIDDEN.
        $isOwner = false;
        if ($doc->verificationRequest && $doc->verificationRequest->user_id === $user->id) {
            $isOwner = true;
        }

        $isCeo = $user->hasRole('CEO_PRODUCT_OWNER');

        if (!$isOwner && !$isCeo) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ke dokumen Employee KYC privat ditolak.', 403);
        }

        if (!Storage::exists($doc->private_storage_key)) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Berkas fisik tidak ditemukan.', 404);
        }

        AuditService::log($user->id, 'IDENTITY_DOCUMENT_DOWNLOADED', 'identity_document', $doc->id, 'SUCCESS');
        
        if ($request->query('inline') || $request->query('preview')) {
            return Storage::response($doc->private_storage_key);
        }

        return Storage::download($doc->private_storage_key);
    }

    /**
     * V08: CEO List Employee KYC Verifications Queue (CR-02 & CR-03: CEO Exclusive)
     */
    public function adminListVerifications(Request $request)
    {
        $user = Auth::user();

        // CR-02 & CR-03: Exclusive to CEO_PRODUCT_OWNER
        if (!$user->hasRole('CEO_PRODUCT_OWNER')) {
            return ApiResponse::error(
                'IDENTITY_PERMISSION_DENIED',
                'Hanya CEO_PRODUCT_OWNER yang memiliki wewenang mengakses antrean Pengecekan Berkas staf internal.',
                403
            );
        }

        $query = IdentityVerificationRequest::with(['user.profile', 'documents']);

        $statusFilter = $request->query('status');
        if (!empty($statusFilter) && $statusFilter !== 'ALL') {
            if ($statusFilter === 'PENDING_REVIEW' || $statusFilter === 'PENDING') {
                $query->whereIn('status', ['PENDING', 'PENDING_REVIEW']);
            } else {
                $query->where('status', $statusFilter);
            }
        } else if (empty($statusFilter)) {
            // CR-03 Section E: Tab Antrean Verifikasi hanya menampilkan pengajuan PENDING_REVIEW
            $query->whereIn('status', ['PENDING', 'PENDING_REVIEW']);
        }

        if ($request->has('kind')) {
            $query->where('kind', $request->query('kind'));
        }

        $items = $query->orderBy('created_at', 'desc')->paginate(20);
        $views = collect($items->items())->map(fn($v) => $this->formatVerificationView($v, true));

        return ApiResponse::success([
            'items' => $views,
            'has_more' => $items->hasMorePages(),
        ], 'IDENTITY_ADMIN_VERIFICATIONS_LIST', 200);
    }

    /**
     * V09: CEO Decision on Employee KYC / Pengecekan Berkas (CR-02 & CR-03: CEO Exclusive)
     */
    public function adminDecision(Request $request, string $id)
    {
        $admin = Auth::user();

        // CR-02 & CR-03: Exclusive to CEO_PRODUCT_OWNER
        if (!$admin->hasRole('CEO_PRODUCT_OWNER')) {
            return ApiResponse::error(
                'IDENTITY_PERMISSION_DENIED',
                'Hanya CEO_PRODUCT_OWNER yang memiliki wewenang memutuskan verifikasi berkas staf internal.',
                403
            );
        }

        $validated = $request->validate([
            'decision' => 'required|string|in:VERIFY,REJECT,APPROVE,REQUEST_REVISION',
            'reason' => 'nullable|string',
            'lock_version' => 'nullable|integer',
        ], [
            'decision.required' => 'Keputusan verifikasi wajib ditentukan.',
            'decision.in' => 'Keputusan verifikasi harus berupa APPROVE, REQUEST_REVISION, atau REJECT.',
        ]);

        $reason = trim((string)($request->input('reason') ?? $request->input('review_notes') ?? $request->input('notes') ?? ''));

        if (in_array($validated['decision'], ['REQUEST_REVISION', 'REJECT']) && empty($reason)) {
            return ApiResponse::error(
                'IDENTITY_VALIDATION_FAILED',
                'Alasan wajib diisi saat meminta revisi atau menolak berkas staf.',
                422,
                ['reason' => ['Alasan keputusan verifikasi wajib diisi.']]
            );
        }

        $verification = DB::transaction(function () use ($id, $admin, $validated, $reason) {
            $req = IdentityVerificationRequest::lockForUpdate()->findOrFail($id);

            // No self-review
            if ($req->user_id === $admin->id) {
                abort(response()->json([
                    'success' => false,
                    'code' => 'IDENTITY_PERMISSION_DENIED',
                    'message' => 'Reviewer tidak dapat menilai verifikasinya sendiri.',
                ], 403));
            }

            $rawDecision = $validated['decision'];

            if ($rawDecision === 'VERIFY' || $rawDecision === 'APPROVE') {
                $status = 'VERIFIED';
                $rejectionReason = null;
            } elseif ($rawDecision === 'REQUEST_REVISION') {
                $status = 'REVISION_REQUIRED';
                $rejectionReason = $reason;
            } else {
                $status = 'REJECTED';
                $rejectionReason = $reason;
            }

            $req->status = $status;
            $req->reviewed_by = $admin->id;
            $req->reviewed_at = now();
            $req->rejection_reason = $rejectionReason;
            $req->save();

            // Synchronize with StaffOnboarding aggregate (CR-03 Section E)
            $onboarding = \App\Models\StaffOnboarding::where('staff_user_id', $req->user_id)->first();
            $applicant = User::find($req->user_id);

            if ($status === 'VERIFIED') {
                if ($onboarding) {
                    $onboarding->status = 'COMPLETED';
                    $onboarding->completed_at = now();
                    $onboarding->last_verified_at = now();
                    $onboarding->reviewed_by = $admin->id;
                    $onboarding->save();

                    \App\Models\StaffOnboardingStep::where('onboarding_id', $onboarding->id)
                        ->where('step_key', 'EMPLOYEE_KYC')
                        ->update(['status' => 'COMPLETED', 'completed_at' => now(), 'reviewed_by' => $admin->id]);
                }

                if ($applicant) {
                    $applicant->status = 'ACTIVE';
                    $applicant->authz_version++;
                    $applicant->save();
                }

                AuditService::log(
                    $admin->id,
                    'IDENTITY_STAFF_OPERATIONAL_READY',
                    'verification_request',
                    $req->id,
                    'SUCCESS',
                    ['decision' => 'APPROVE']
                );

                OutboxService::publish('staff', $req->user_id, 'identity.staff.operational_ready.v1', [
                    'user_id' => $req->user_id,
                    'status' => 'OPERATIONAL_READY',
                ]);
            } elseif ($status === 'REVISION_REQUIRED') {
                if ($onboarding) {
                    $onboarding->status = 'REVISION_REQUIRED';
                    $onboarding->revision_notes = $reason;
                    $onboarding->reviewed_by = $admin->id;
                    $onboarding->save();

                    \App\Models\StaffOnboardingStep::where('onboarding_id', $onboarding->id)
                        ->where('step_key', 'EMPLOYEE_KYC')
                        ->update(['status' => 'REVISION_REQUIRED', 'reviewed_by' => $admin->id]);
                }

                AuditService::log(
                    $admin->id,
                    'IDENTITY_STAFF_REVISION_REQUESTED',
                    'verification_request',
                    $req->id,
                    'SUCCESS',
                    ['reason' => $reason]
                );

                OutboxService::publish('staff', $req->user_id, 'identity.staff.revision_required.v1', [
                    'user_id' => $req->user_id,
                    'reason' => $reason,
                ]);
            } else {
                if ($onboarding) {
                    $onboarding->status = 'REJECTED';
                    $onboarding->rejection_reason = $reason;
                    $onboarding->reviewed_by = $admin->id;
                    $onboarding->save();

                    \App\Models\StaffOnboardingStep::where('onboarding_id', $onboarding->id)
                        ->where('step_key', 'EMPLOYEE_KYC')
                        ->update(['status' => 'REJECTED', 'reviewed_by' => $admin->id]);
                }
            }

            // Canonical KYC Decision Audit Log
            AuditService::log(
                $admin->id,
                'IDENTITY_KYC_DECISION',
                'verification_request',
                $req->id,
                'SUCCESS',
                ['decision' => $status, 'reason' => $reason]
            );

            OutboxService::publish('verification_request', $req->id, 'identity.kyc.decided.v1', [
                'request_id' => $req->id,
                'user_id' => $req->user_id,
                'decision' => $status,
            ]);

            return $req;
        });

        return ApiResponse::success($this->formatVerificationView($verification, true), 'IDENTITY_KYC_DECIDED', 200);
    }

    /**
     * V10: Get Verification Detail
     */
    public function getVerification(Request $request, string $id)
    {
        $user = Auth::user();
        $verification = IdentityVerificationRequest::with(['user.profile', 'documents'])->find($id);

        if (!$verification) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Verifikasi tidak ditemukan.', 404);
        }

        $isOwner = $verification->user_id === $user->id;
        $isCeo = $user->hasRole('CEO_PRODUCT_OWNER');

        if (!$isOwner && !$isCeo) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ke Employee KYC ditolak.', 403);
        }

        return ApiResponse::success($this->formatVerificationView($verification, $isCeo), 'IDENTITY_VERIFICATION_LOADED', 200);
    }

    /**
     * V11: Submit Customer NIK (CR-01 & CR-02: 16 digits format-only, immutable write-once)
     */
    public function submitCustomerNik(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return ApiResponse::error('IDENTITY_UNAUTHENTICATED', 'Autentikasi diperlukan.', 401);
        }

        $validated = $request->validate([
            'nik' => ['required', 'string', 'regex:/^[0-9]{16}$/D'],
            'address' => ['nullable'],
            'address_json' => ['nullable'],
            'addressData' => ['nullable'],
        ], [
            'nik.regex' => 'NIK harus berupa 16 digit angka.',
        ]);

        $nik = $validated['nik'];

        // CR02-NIK-IMMUTABLE: If user already has a NIK record, reject immediately with 409
        $existing = UserNikRecord::where('user_id', $user->id)->first();
        if ($existing) {
            return ApiResponse::error(
                'IDENTITY_NIK_PERMANENTLY_LOCKED',
                'NIK sudah terkunci permanen dan tidak dapat diubah.',
                409
            );
        }

        return DB::transaction(function () use ($user, $nik, $request) {
            try {
                UserNikRecord::create([
                    'user_id' => $user->id,
                    'nik_ciphertext' => Crypt::encryptString($nik),
                    'format_validated_at' => now(),
                    'locked_at' => now(),
                ]);
            } catch (\Illuminate\Database\QueryException $e) {
                if ($e->getCode() === '23000' || str_contains($e->getMessage(), 'Duplicate')) {
                    return ApiResponse::error(
                        'IDENTITY_NIK_PERMANENTLY_LOCKED',
                        'NIK sudah terkunci permanen dan tidak dapat diubah.',
                        409
                    );
                }
                throw $e;
            }

            // Save address if passed during Customer onboarding
            $rawAddress = $request->input('address_json') ?? $request->input('addressData') ?? $request->input('address');
            if ($rawAddress) {
                $addressData = is_array($rawAddress) ? $rawAddress : (json_decode($rawAddress, true) ?: ['street_address' => (string) $rawAddress]);
                $profile = $user->profile ?? new UserProfile(['user_id' => $user->id]);
                $profile->address_json = $addressData;
                $profile->save();
            }

            // Check if email OTP is already verified -> transition to ACTIVE
            $refreshedUser = User::find($user->id);
            $isEmailVerified = $refreshedUser->email_verified_at !== null;
            if ($isEmailVerified) {
                $refreshedUser->status = 'ACTIVE';
                $refreshedUser->save();
            }

            AuditService::log(
                $user->id,
                'IDENTITY_CUSTOMER_NIK_SAVED',
                'user_nik_record',
                $user->id,
                'SUCCESS'
            );

            OutboxService::publish('user', $user->id, 'identity.customer.nik_format_valid.v1', [
                'user_id' => $user->id,
                'status' => $refreshedUser->status,
            ]);

            $maskedNik = str_repeat('*', 12) . substr($nik, -4);
            $nextStep = $isEmailVerified ? 'CUSTOMER_ACTIVE' : 'VERIFY_EMAIL_OTP';

            return ApiResponse::success([
                'nik_masked' => $maskedNik,
                'nik_format_status' => 'FORMAT_VALID',
                'nik_locked' => true,
                'next_step' => $nextStep,
                'account_status' => $refreshedUser->status,
                'address' => $refreshedUser->profile?->address_json,
                'address_json' => $refreshedUser->profile?->address_json,
            ], 'IDENTITY_CUSTOMER_NIK_FORMAT_VALID', 201);
        });
    }

    private function formatVerificationView(IdentityVerificationRequest $v, bool $isStaff = false): array
    {
        $docs = $v->documents->map(fn($d) => [
            'id' => $d->id,
            'type' => $d->type,
            'verification_status' => $v->status,
            'mime' => $d->mime,
            'size_bytes' => $d->size_bytes,
            'download_url' => '/api/v1/identity/documents/' . $d->id . '/download',
        ])->all();

        $user = $v->user;
        $profile = $user?->profile;
        $displayName = $profile?->display_name ?? $user?->email ?? 'Staf Internal';
        $legalName = $profile?->legal_name ?? $displayName;

        $maskedNik = null;
        if (!empty($v->nik_ciphertext)) {
            try {
                $decrypted = Crypt::decryptString($v->nik_ciphertext);
                $maskedNik = substr($decrypted, 0, 4) . '************';
            } catch (\Throwable) {
                $maskedNik = '3171************';
            }
        } elseif ($v->nik_lookup_hash) {
            $maskedNik = '3171************';
        }

        $onboarding = $user?->staffOnboarding()->with('steps')->first();
        $activeRoleModel = $user?->roleAssignments()->where('status', 'ACTIVE')->first()?->role;
        $roleCode = $activeRoleModel?->code ?? 'ADMIN_OPERATIONS';
        $roleName = $activeRoleModel?->name ?? $roleCode;

        $ndaStep = $onboarding?->steps->firstWhere('step_key', 'NDA');
        $accessStep = $onboarding?->steps->firstWhere('step_key', 'ACCESS_CONFIRMATION');
        $profileStep = $onboarding?->steps->firstWhere('step_key', 'PROFILE');
        $kycStep = $onboarding?->steps->firstWhere('step_key', 'EMPLOYEE_KYC');

        return [
            'id' => $v->id,
            'user_id' => $v->user_id,
            'kind' => $v->kind,
            'status' => $v->status,
            'nik_masked' => $maskedNik ?? ($v->nik_lookup_hash ? '3174**********' : null),
            'documents' => $docs,
            'reviewed_at' => $v->reviewed_at?->toIso8601String(),
            'rejection_reason' => $v->rejection_reason,
            'created_at' => $v->created_at?->toIso8601String(),
            'applicant_name' => $displayName,
            'applicant_legal_name' => $legalName,
            'applicant_gender' => $profile?->gender,
            'applicant_birth_date' => $profile?->birth_date ? (is_string($profile->birth_date) ? substr($profile->birth_date, 0, 10) : $profile->birth_date->format('Y-m-d')) : null,
            'applicant_email' => $user?->email,
            'applicant_phone' => $user?->phone_e164,
            'applicant_employee_id' => $profile?->employee_id,
            'applicant_department' => $profile?->department ?? 'Operasional',
            'applicant_role' => $roleCode,
            'applicant_role_name' => $roleName,
            'applicant_photo' => $profile?->photo_path,
            'onboarding_data' => [
                'status' => $onboarding?->status ?? $v->status,
                'revision_notes' => $onboarding?->revision_notes,
                'rejection_reason' => $onboarding?->rejection_reason,
                'profile' => [
                    'display_name' => $displayName,
                    'legal_name' => $legalName,
                    'gender' => $profile?->gender,
                    'birth_date' => $profile?->birth_date ? (is_string($profile->birth_date) ? substr($profile->birth_date, 0, 10) : $profile->birth_date->format('Y-m-d')) : null,
                    'phone' => $user?->phone_e164,
                    'photo_path' => $profile?->photo_path,
                    'completed' => $profileStep?->status === 'COMPLETED',
                ],
                'berkas' => [
                    'nik_masked' => $maskedNik,
                    'completed' => $kycStep?->status === 'COMPLETED',
                    'document_count' => count($docs),
                    'documents' => $docs,
                ],
                'nda' => [
                    'version' => $ndaStep?->document_version ?? 'v2026.1',
                    'accepted' => $ndaStep?->status === 'COMPLETED',
                    'completed_at' => $ndaStep?->completed_at?->toIso8601String(),
                ],
                'access_confirmation' => [
                    'employee_id' => $profile?->employee_id,
                    'email' => $user?->email,
                    'role' => $roleCode,
                    'role_name' => $roleName,
                    'department' => $profile?->department ?? 'Operasional',
                    'accepted' => $accessStep?->status === 'COMPLETED',
                    'completed_at' => $accessStep?->completed_at?->toIso8601String(),
                ],
            ],
            'user' => $user ? [
                'id' => $user->id,
                'email' => $user->email,
                'phone_e164' => $user->phone_e164,
                'status' => $user->status,
                'profile' => [
                    'full_name' => $displayName,
                    'display_name' => $displayName,
                    'legal_name' => $legalName,
                    'photo_path' => $profile?->photo_path,
                    'employee_id' => $profile?->employee_id,
                    'department' => $profile?->department,
                ],
            ] : null,
        ];
    }
}
