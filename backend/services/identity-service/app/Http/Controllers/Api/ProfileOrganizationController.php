<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\OrganizationProfile;
use App\Models\ProfileChangeRequest;
use App\Models\RoleAssignment;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\AuditService;
use App\Services\OutboxService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProfileOrganizationController extends Controller
{
    /**
     * P01: Get Own Profile
     */
    public function myProfile(Request $request)
    {
        $user = Auth::user();
        $profile = $user->profile;
        $nikRecord = $user->nikRecord;

        // For internal staff: resolve masked NIK from employee KYC verification request if not in nikRecord
        $verificationReq = \App\Models\IdentityVerificationRequest::where('user_id', $user->id)
            ->where('kind', 'EMPLOYEE_KYC')
            ->latest()
            ->with('documents')
            ->first();

        $decryptedNik = null;
        $maskedNik = $nikRecord?->masked_nik;
        if ($verificationReq && !empty($verificationReq->nik_ciphertext)) {
            try {
                $decryptedNik = Crypt::decryptString($verificationReq->nik_ciphertext);
                $maskedNik = substr($decryptedNik, 0, 4) . '************';
            } catch (\Throwable) {
                $maskedNik = '3171************';
            }
        } elseif ($nikRecord && !empty($nikRecord->nik_ciphertext)) {
            try {
                $decryptedNik = Crypt::decryptString($nikRecord->nik_ciphertext);
                $maskedNik = substr($decryptedNik, 0, 4) . '************';
            } catch (\Throwable) {
                $maskedNik = $nikRecord->masked_nik ?? '3171************';
            }
        } elseif (empty($maskedNik) && $verificationReq && $verificationReq->nik_lookup_hash) {
            $maskedNik = '3171************';
        }

        $firstDoc = $verificationReq?->documents?->first();
        $ktpDownloadUrl = $firstDoc ? "/api/v1/identity/documents/{$firstDoc->id}/download?inline=true" : null;

        $onboarding = $user->staffOnboarding;
        $activeRole = $user->roleAssignments()->where('status', 'ACTIVE')->first()?->role?->code ?? 'CUSTOMER';
        $isStaff = in_array($activeRole, ['ADMIN_OPERATIONS', 'CUSTOMER_SUPPORT', 'FINANCE_PAYMENT_OPS', 'CEO_PRODUCT_OWNER']);

        $staffData = null;
        if ($isStaff || $onboarding) {
            $steps = $onboarding ? $onboarding->steps()->get() : collect();
            $isReady = ($user->status === 'ACTIVE' && in_array($onboarding?->status, ['COMPLETED', 'OPERATIONAL_READY']));

            $staffData = [
                'role' => $activeRole,
                'employee_id' => $profile?->employee_id,
                'department' => $profile?->department ?? 'Operasional',
                'onboarding_status' => $onboarding?->status ?? 'COMPLETED',
                'readiness' => $isReady ? 'READY' : 'NOT_READY',
                'revision_notes' => $onboarding?->revision_notes,
                'rejection_reason' => $onboarding?->rejection_reason,
                'nik' => $decryptedNik ?? $maskedNik,
                'nik_masked' => $maskedNik,
                'ktp_url' => $ktpDownloadUrl,
                'berkas_status' => $verificationReq?->status ?? 'PENDING',
                'has_ktp_document' => $verificationReq ? ($verificationReq->documents->count() > 0) : false,
                'steps' => $steps->map(fn($s) => [
                    'key' => $s->step_key,
                    'status' => $s->status,
                    'document_version' => $s->document_version,
                    'completed_at' => $s->completed_at?->toIso8601String(),
                ])->values()->all(),
            ];
        }

        $birthDateStr = $profile?->birth_date ? (is_string($profile->birth_date) ? substr($profile->birth_date, 0, 10) : $profile->birth_date->format('Y-m-d')) : null;

        return ApiResponse::success([
            'id' => $user->id,
            'name' => $profile?->display_name ?? 'Pengguna',
            'legal_name' => $profile?->legal_name ?? $profile?->display_name ?? 'Pengguna',
            'gender' => $profile?->gender,
            'birth_date' => $birthDateStr,
            'email' => $user->email,
            'phone' => $user->phone_e164,
            'phone_masked' => $user->phone_e164 ? substr($user->phone_e164, 0, 4) . '****' . substr($user->phone_e164, -2) : null,
            'photo_url' => $profile?->photo_path ?? '/brand/logo.png',
            'employee_id' => $profile?->employee_id,
            'department' => $profile?->department,
            'account_status' => $user->status,
            'nik' => $decryptedNik ?? $maskedNik,
            'nik_masked' => $maskedNik,
            'nik_raw' => $decryptedNik,
            'ktp_file_url' => $ktpDownloadUrl,
            'ktp_file_path' => $ktpDownloadUrl,
            'personal_profile' => [
                'displayName' => $profile?->display_name ?? 'Pengguna',
                'legalName' => $profile?->legal_name ?? $profile?->display_name ?? 'Pengguna',
                'gender' => $profile?->gender,
                'dateOfBirth' => $birthDateStr,
                'avatar' => $profile?->photo_path ?? '/brand/logo.png',
            ],
            'personalProfile' => [
                'displayName' => $profile?->display_name ?? 'Pengguna',
                'legalName' => $profile?->legal_name ?? $profile?->display_name ?? 'Pengguna',
                'gender' => $profile?->gender,
                'dateOfBirth' => $birthDateStr,
                'avatar' => $profile?->photo_path ?? '/brand/logo.png',
            ],
            'nik_format_status' => ($nikRecord || $verificationReq) ? 'FORMAT_VALID' : null,
            'nik_locked' => ($nikRecord !== null || $verificationReq !== null),
            'email_otp_verified' => $user->email_verified_at !== null,
            'email_verified' => $user->email_verified_at !== null,
            'phone_verified' => $user->phone_verified_at !== null,
            'is_staff' => $isStaff,
            'staff' => $staffData,
        ], 'IDENTITY_PROFILE_LOADED', 200);
    }

    /**
     * P02: Update Own Profile (Editable fields only - CR02-NIK-IMMUTABLE)
     */
    public function updateMyProfile(Request $request)
    {
        // Reject NIK mutation per CR02-NIK-IMMUTABLE
        if ($request->has('nik') || $request->has('nik_ciphertext') || $request->has('ktp')) {
            return ApiResponse::error(
                'IDENTITY_NIK_IMMUTABLE_FIELD',
                'NIK bersifat permanen dan tidak dapat diubah.',
                422
            );
        }

        $user = Auth::user();
        $validated = $request->validate([
            'display_name' => 'nullable|string|max:160',
            'legal_name' => 'nullable|string|max:160',
            'gender' => 'nullable|string|max:30',
            'birth_date' => 'nullable|string|max:30',
            'date_of_birth' => 'nullable|string|max:30',
            'phone' => 'nullable|string|max:20',
            'locale' => 'nullable|string|max:12',
        ]);

        $profile = $user->profile ?? new UserProfile(['user_id' => $user->id]);
        if (isset($validated['display_name'])) {
            $profile->display_name = $validated['display_name'];
        }
        if (isset($validated['legal_name'])) {
            $profile->legal_name = $validated['legal_name'];
        }
        if (isset($validated['gender'])) {
            $profile->gender = $validated['gender'];
        }
        $rawBirth = $validated['birth_date'] ?? $validated['date_of_birth'] ?? null;
        if (!empty($rawBirth)) {
            $profile->birth_date = substr(trim($rawBirth), 0, 10);
        }
        if (isset($validated['locale'])) {
            $profile->locale = $validated['locale'];
        }
        $profile->save();

        if (isset($validated['phone']) && $validated['phone'] !== $user->phone_e164) {
            $user->phone_e164 = $validated['phone'];
            $user->phone_verified_at = null; // resets verification on change
            $user->save();
        }

        AuditService::log($user->id, 'IDENTITY_PROFILE_UPDATED', 'user_profile', $user->id, 'SUCCESS');

        $nikRecord = $user->nikRecord;

        return ApiResponse::success([
            'id' => $user->id,
            'name' => $profile->display_name,
            'legal_name' => $profile->legal_name,
            'gender' => $profile->gender,
            'birth_date' => $profile->birth_date ? (is_string($profile->birth_date) ? substr($profile->birth_date, 0, 10) : $profile->birth_date->format('Y-m-d')) : null,
            'email' => $user->email,
            'phone' => $user->phone_e164,
            'photo_url' => $profile->photo_path,
            'nik_masked' => $nikRecord?->masked_nik,
            'nik_format_status' => $nikRecord ? 'FORMAT_VALID' : null,
            'nik_locked' => $nikRecord !== null,
            'account_status' => $user->status,
        ], 'IDENTITY_PROFILE_UPDATED', 200);
    }

    /**
     * P03: Request Verified Field Change (CR02-NIK-IMMUTABLE)
     */
    public function requestChange(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'target_type' => 'required|string|in:USER,ORGANIZATION',
            'target_id' => 'required|string',
            'fields' => 'required|array',
            'reason' => 'required|string',
        ]);

        // Reject NIK mutation per CR02-NIK-IMMUTABLE
        if (isset($validated['fields']['nik']) || isset($validated['fields']['nik_ciphertext']) || in_array('nik', array_keys($validated['fields']))) {
            return ApiResponse::error(
                'IDENTITY_NIK_IMMUTABLE_FIELD',
                'NIK bersifat permanen dan tidak dapat diajukan perubahannya.',
                422
            );
        }

        $changeReq = ProfileChangeRequest::create([
            'user_id' => $user->id,
            'target_type' => $validated['target_type'],
            'target_id' => $validated['target_id'],
            'requested_fields_ciphertext' => Crypt::encryptString(json_encode($validated['fields'])),
            'status' => 'PENDING_REVIEW',
            'review_reason' => $validated['reason'],
        ]);

        AuditService::log($user->id, 'IDENTITY_PROFILE_CHANGE_REQUESTED', 'profile_change_request', $changeReq->id, 'SUCCESS');

        return ApiResponse::success([
            'id' => $changeReq->id,
            'status' => 'PENDING_REVIEW',
        ], 'IDENTITY_PROFILE_CHANGE_REQUESTED', 201);
    }

    /**
     * P04: Get Change Request Detail
     */
    public function getChangeRequest(Request $request, string $id)
    {
        $user = Auth::user();
        $changeReq = ProfileChangeRequest::find($id);

        if (!$changeReq) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Permintaan perubahan tidak ditemukan.', 404);
        }

        $isOwner = $changeReq->user_id === $user->id;
        $isStaff = $user->hasPermission('identity.profile.sensitive_change.review');

        if (!$isOwner && !$isStaff) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ditolak.', 403);
        }

        return ApiResponse::success([
            'id' => $changeReq->id,
            'status' => $changeReq->status,
            'target_type' => $changeReq->target_type,
            'review_reason' => $changeReq->review_reason,
            'created_at' => $changeReq->created_at?->toIso8601String(),
        ], 'IDENTITY_PROFILE_CHANGE_REQUEST_LOADED', 200);
    }

    /**
     * P05: Get Own Organizations
     */
    public function myOrganizations(Request $request)
    {
        $user = Auth::user();
        $memberships = Membership::where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->with(['organization.profile'])
            ->get();

        $orgs = $memberships->map(function ($m) {
            $org = $m->organization;
            $prof = $org?->profile;
            return [
                'id' => $org?->id,
                'type' => $org?->type,
                'status' => $org?->status,
                'display_name' => $prof?->display_name ?? $prof?->legal_name ?? 'Organisasi',
                'legal_name' => $prof?->legal_name,
                'membership_kind' => $m->kind,
            ];
        })->filter(fn($o) => !empty($o['id']))->values()->all();

        return ApiResponse::success(['items' => $orgs, 'has_more' => false], 'IDENTITY_ORGANIZATIONS_LIST', 200);
    }

    /**
     * P06: Get Organization Detail
     */
    public function getOrganization(Request $request, string $id)
    {
        $user = Auth::user();
        $org = Organization::with('profile')->find($id);

        if (!$org) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Organisasi tidak ditemukan.', 404);
        }

        // Check user belongs to organization or is staff
        $isMember = Membership::where('user_id', $user->id)
            ->where('organization_id', $org->id)
            ->where('status', 'ACTIVE')
            ->exists();

        $isStaff = $user->hasPermission('identity.account.read_scoped');

        if (!$isMember && !$isStaff) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ke data organisasi ini ditolak.', 403);
        }

        $prof = $org->profile;
        return ApiResponse::success([
            'id' => $org->id,
            'type' => $org->type,
            'status' => $org->status,
            'display_name' => $prof?->display_name,
            'legal_name' => $prof?->legal_name,
            'business_email' => $prof?->business_email,
            'business_phone' => $prof?->business_phone,
            'address' => $prof?->address_json,
        ], 'IDENTITY_ORGANIZATION_LOADED', 200);
    }

    /**
     * P07: Update Organization Profile (Editable fields)
     */
    public function updateOrganizationProfile(Request $request, string $id)
    {
        $user = Auth::user();
        $org = Organization::find($id);

        if (!$org) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Organisasi tidak ditemukan.', 404);
        }

        // Verify user is active OWNER of this organization
        $isOwner = Membership::where('user_id', $user->id)
            ->where('organization_id', $org->id)
            ->where('kind', 'OWNER')
            ->where('status', 'ACTIVE')
            ->exists();

        if (!$isOwner) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Hanya pemilik organisasi yang dapat memperbarui profil.', 403);
        }

        $validated = $request->validate([
            'display_name' => 'nullable|string|max:190',
            'business_email' => 'nullable|email|max:191',
            'business_phone' => 'nullable|string|max:20',
            'address' => 'nullable|array',
        ]);

        $prof = $org->profile ?? new OrganizationProfile(['organization_id' => $org->id]);
        if (isset($validated['display_name'])) {
            $prof->display_name = $validated['display_name'];
        }
        if (isset($validated['business_email'])) {
            $prof->business_email = $validated['business_email'];
        }
        if (isset($validated['business_phone'])) {
            $prof->business_phone = $validated['business_phone'];
        }
        if (isset($validated['address'])) {
            $prof->address_json = $validated['address'];
        }
        $prof->save();

        AuditService::log($user->id, 'IDENTITY_ORG_PROFILE_UPDATED', 'organization_profile', $org->id, 'SUCCESS');

        return ApiResponse::success([
            'id' => $org->id,
            'display_name' => $prof->display_name,
            'status' => $org->status,
        ], 'IDENTITY_ORG_PROFILE_UPDATED', 200);
    }

    /**
     * P08: Get Organization Memberships
     */
    public function organizationMemberships(Request $request, string $id)
    {
        $user = Auth::user();
        $isMember = Membership::where('user_id', $user->id)
            ->where('organization_id', $id)
            ->where('status', 'ACTIVE')
            ->exists();

        if (!$isMember && !$user->hasPermission('identity.account.read_scoped')) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ditolak.', 403);
        }

        $members = Membership::where('organization_id', $id)
            ->with(['user.profile'])
            ->get()
            ->map(fn($m) => [
                'membership_id' => $m->id,
                'user_id' => $m->user_id,
                'display_name' => $m->user?->profile?->display_name ?? 'Staf',
                'kind' => $m->kind,
                'status' => $m->status,
                'started_at' => $m->started_at?->toIso8601String(),
            ]);

        return ApiResponse::success(['items' => $members, 'has_more' => false], 'IDENTITY_MEMBERSHIPS_LIST', 200);
    }

    /**
     * P09: Get Own Roles
     */
    public function myRoles(Request $request)
    {
        $user = Auth::user();
        $roles = RoleAssignment::where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->with(['role', 'membership.organization'])
            ->get()
            ->map(fn($ra) => [
                'assignment_id' => $ra->id,
                'code' => $ra->role->code,
                'name' => $ra->role->name,
                'organization_id' => $ra->membership?->organization_id,
                'status' => $ra->status,
            ]);

        return ApiResponse::success(['roles' => $roles], 'IDENTITY_ROLES_LOADED', 200);
    }

    /**
     * P10: Get Own Permissions
     */
    public function myPermissions(Request $request)
    {
        $user = Auth::user();
        $session = $request->attributes->get('auth_session');

        $activeRoleAssignment = null;
        if ($session && $session->active_role_assignment_id) {
            $activeRoleAssignment = RoleAssignment::find($session->active_role_assignment_id);
        }

        if (!$activeRoleAssignment) {
            $activeRoleAssignment = RoleAssignment::where('user_id', $user->id)
                ->where('status', 'ACTIVE')
                ->first();
        }

        $permissions = [];
        if ($activeRoleAssignment) {
            $permissions = $activeRoleAssignment->role->permissions()->pluck('code')->all();
        }

        return ApiResponse::success([
            'active_role' => $activeRoleAssignment?->role?->code ?? 'CUSTOMER',
            'permissions' => $permissions,
            'scope' => $activeRoleAssignment?->membership_id ? 'ORGANIZATION' : 'OWN',
            'authorization_version' => $user->authz_version,
        ], 'IDENTITY_PERMISSIONS_LOADED', 200);
    }

    /**
     * P11: Upload Personal Avatar (Distinct from KYC e-KTP per Section 8.2)
     */
    public function uploadAvatar(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'file' => 'required|file|image|max:5120|mimes:jpeg,jpg,png,webp',
        ]);

        $file = $request->file('file');
        $path = $file->store('public/avatars');
        $publicUrl = Storage::url($path);

        $profile = $user->profile ?? new UserProfile(['user_id' => $user->id]);
        $profile->photo_path = $publicUrl;
        $profile->save();

        AuditService::log($user->id, 'IDENTITY_AVATAR_UPLOADED', 'user_profile', $user->id, 'SUCCESS');

        return ApiResponse::success([
            'photo_url' => $publicUrl,
            'profile_version' => $user->authz_version,
        ], 'IDENTITY_AVATAR_UPLOADED', 200);
    }

    /**
     * P12: Admin List Profile Change Requests
     */
    public function adminListChangeRequests(Request $request)
    {
        $items = ProfileChangeRequest::with('user.profile')->orderBy('created_at', 'desc')->paginate(20);
        return ApiResponse::success([
            'items' => $items->items(),
            'has_more' => $items->hasMorePages(),
        ], 'IDENTITY_ADMIN_CHANGE_REQUESTS_LIST', 200);
    }

    /**
     * P13: Admin Decision on Profile Change Request
     */
    public function adminDecisionChangeRequest(Request $request, string $id)
    {
        $admin = Auth::user();
        $validated = $request->validate([
            'decision' => 'required|string|in:APPROVE,REJECT',
            'reason' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($id, $admin, $validated) {
            $changeReq = ProfileChangeRequest::lockForUpdate()->findOrFail($id);

            $decision = $validated['decision'] === 'APPROVE' ? 'APPROVED' : 'REJECTED';
            $changeReq->status = $decision;
            $changeReq->reviewed_by = $admin->id;
            $changeReq->reviewed_at = now();
            if (!empty($validated['reason'])) {
                $changeReq->review_reason = $validated['reason'];
            }
            $changeReq->save();

            if ($decision === 'APPROVED') {
                $fields = $changeReq->requested_fields;
                if ($changeReq->target_type === 'ORGANIZATION') {
                    $orgProfile = OrganizationProfile::where('organization_id', $changeReq->target_id)->first();
                    if ($orgProfile) {
                        if (!empty($fields['nib'])) {
                            $orgProfile->nib_ciphertext = Crypt::encryptString($fields['nib']);
                            $orgProfile->nib_lookup_hash = hash('sha256', trim($fields['nib']));
                        }
                        if (!empty($fields['npwp'])) {
                            $orgProfile->npwp_ciphertext = Crypt::encryptString($fields['npwp']);
                            $orgProfile->npwp_lookup_hash = hash('sha256', trim($fields['npwp']));
                        }
                        if (!empty($fields['legal_name'])) {
                            $orgProfile->legal_name = $fields['legal_name'];
                        }
                        if (!empty($fields['display_name'])) {
                            $orgProfile->display_name = $fields['display_name'];
                        }
                        $orgProfile->save();
                    }
                }
            }

            AuditService::log(
                $admin->id,
                'IDENTITY_PROFILE_CHANGE_DECIDED',
                'profile_change_request',
                $changeReq->id,
                'SUCCESS',
                ['decision' => $decision]
            );

            return ApiResponse::success([
                'id' => $changeReq->id,
                'status' => $changeReq->status,
            ], 'IDENTITY_PROFILE_CHANGE_DECIDED', 200);
        });
    }
}
