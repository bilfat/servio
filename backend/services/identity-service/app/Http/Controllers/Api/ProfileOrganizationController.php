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

        // Resolve business application and documents for business roles
        $businessApp = \App\Models\BusinessApplication::where('applicant_user_id', $user->id)
            ->with('documents')
            ->orderByRaw('COALESCE(submitted_at, created_at) DESC')
            ->first();

        $businessProfile = null;
        $documentsList = [];

        $membership = Membership::where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->with(['organization.profile'])
            ->first();

        $org = $membership?->organization;
        $orgProf = $org?->profile;

        if ($businessApp) {
            $draftData = [];
            if (!empty($businessApp->draft_data_ciphertext)) {
                try {
                    $dec = Crypt::decryptString($businessApp->draft_data_ciphertext);
                    $draftData = json_decode($dec, true) ?: [];
                } catch (\Throwable) {
                    $draftData = json_decode($businessApp->draft_data_ciphertext, true) ?: [];
                }
            }

            $businessProfile = [
                'id' => $businessApp->id,
                'applicationId' => $businessApp->id,
                'registrationNumber' => $businessApp->application_code,
                'applicantType' => $businessApp->target_role,
                'targetRole' => $businessApp->target_role,
                'status' => $businessApp->status,
                'operationalStatus' => $org?->operational_status ?? 'ONLINE_ACCEPTING',
                'operational_status' => $org?->operational_status ?? 'ONLINE_ACCEPTING',
                'operationalHours' => $orgProf?->operational_hours_json ?? $draftData['operational_hours'] ?? [
                    'work_days' => 'Senin - Sabtu',
                    'open_time' => '08:00',
                    'close_time' => '18:00',
                ],
                'operational_hours' => $orgProf?->operational_hours_json ?? $draftData['operational_hours'] ?? [
                    'work_days' => 'Senin - Sabtu',
                    'open_time' => '08:00',
                    'close_time' => '18:00',
                ],
                'serviceArea' => $orgProf?->service_area_json ?? $draftData['service_area'] ?? [
                    'areas' => 'Jakarta Barat, Jakarta Selatan, Tangerang Kota',
                    'radius_km' => 25,
                ],
                'service_area' => $orgProf?->service_area_json ?? $draftData['service_area'] ?? [
                    'areas' => 'Jakarta Barat, Jakarta Selatan, Tangerang Kota',
                    'radius_km' => 25,
                ],
                'competencies' => $orgProf?->competencies_json ?? $draftData['competencies'] ?? [
                    'AC Split & Inverter', 'Kompresor', 'Cuci AC & Overhaul', 'Instalasi Baru', 'Kelistrikan HVAC'
                ],
                'businessData' => [
                    'brandName' => $orgProf?->display_name ?? $draftData['business']['brand_name'] ?? $draftData['business']['brandName'] ?? null,
                    'legalName' => $orgProf?->legal_name ?? $draftData['business']['legal_name'] ?? $draftData['business']['legalName'] ?? null,
                    'businessType' => $draftData['business']['business_type'] ?? $draftData['business']['businessType'] ?? ($org ? 'PT / Badan Usaha' : null),
                    'nib' => $draftData['legal']['nib'] ?? $draftData['business']['nib'] ?? null,
                    'npwp' => $draftData['legal']['npwp'] ?? $draftData['business']['npwp'] ?? null,
                    'address' => (is_array($orgProf?->address_json) ? ($orgProf->address_json['address'] ?? $orgProf->address_json['street_address'] ?? null) : $orgProf?->address_json) ?? ($draftData['business']['address'] ?? null),
                    'city' => (is_array($orgProf?->address_json) ? ($orgProf->address_json['city'] ?? $orgProf->address_json['city_name'] ?? null) : null) ?? ($draftData['business']['city'] ?? null),
                    'province' => (is_array($orgProf?->address_json) ? ($orgProf->address_json['province'] ?? $orgProf->address_json['province_name'] ?? null) : null) ?? ($draftData['business']['province'] ?? null),
                    'district' => (is_array($orgProf?->address_json) ? ($orgProf->address_json['district'] ?? $orgProf->address_json['district_name'] ?? null) : null) ?? ($draftData['business']['district'] ?? null),
                    'village' => (is_array($orgProf?->address_json) ? ($orgProf->address_json['village'] ?? $orgProf->address_json['village_name'] ?? null) : null) ?? ($draftData['business']['village'] ?? null),
                    'postalCode' => (is_array($orgProf?->address_json) ? ($orgProf->address_json['postal_code'] ?? null) : null) ?? ($draftData['business']['postal_code'] ?? $draftData['business']['postalCode'] ?? null),
                    'address_json' => $orgProf?->address_json ?? ($draftData['business']['address_json'] ?? $draftData['business']['addressData'] ?? null),
                    'addressData' => $orgProf?->address_json ?? ($draftData['business']['address_json'] ?? $draftData['business']['addressData'] ?? null),
                ],
                'picData' => [
                    'fullName' => $draftData['pic']['full_name'] ?? $draftData['pic']['fullName'] ?? $profile?->display_name,
                    'nik' => $draftData['pic']['nik'] ?? null,
                    'position' => $draftData['pic']['position'] ?? null,
                    'phone' => $draftData['pic']['phone'] ?? $user->phone_e164,
                    'email' => $draftData['pic']['email'] ?? $user->email,
                ],
                'specializedData' => $orgProf?->specialization_json ?? $draftData['specialization'] ?? $draftData['specializedData'] ?? null,
            ];

            $documentsList = $businessApp->documents->map(function ($d) use ($businessApp) {
                return [
                    'id' => $d->id,
                    'documentId' => $d->id,
                    'documentType' => $d->doc_type,
                    'doc_type' => $d->doc_type,
                    'fileName' => $d->file_name ?? ($d->doc_type . ($d->mime === 'application/pdf' ? '.pdf' : '.jpg')),
                    'originalName' => $d->file_name ?? $d->doc_type,
                    'fileSize' => $d->size_bytes,
                    'filePath' => "/api/v1/registration-applications/{$businessApp->id}/documents/{$d->id}/download",
                    'status' => $d->verification_status,
                    'verification_status' => $d->verification_status,
                    'version' => 1,
                    'uploadedAt' => $d->created_at?->toIso8601String(),
                ];
            })->values()->all();
        } elseif ($org && $orgProf) {
            $businessProfile = [
                'id' => $org->id,
                'registrationNumber' => 'REG-' . substr($org->id, 0, 8),
                'applicantType' => $org->type === 'PROVIDER' ? 'SERVICE_PROVIDER' : $org->type,
                'targetRole' => $org->type === 'PROVIDER' ? 'SERVICE_PROVIDER' : $org->type,
                'status' => 'APPROVED',
                'operationalStatus' => $org->operational_status ?? 'ONLINE_ACCEPTING',
                'operational_status' => $org->operational_status ?? 'ONLINE_ACCEPTING',
                'operationalHours' => $orgProf->operational_hours_json ?? [
                    'work_days' => 'Senin - Sabtu',
                    'open_time' => '08:00',
                    'close_time' => '18:00',
                ],
                'operational_hours' => $orgProf->operational_hours_json ?? [
                    'work_days' => 'Senin - Sabtu',
                    'open_time' => '08:00',
                    'close_time' => '18:00',
                ],
                'serviceArea' => $orgProf->service_area_json ?? [
                    'areas' => 'Jakarta Barat, Jakarta Selatan, Tangerang Kota',
                    'radius_km' => 25,
                ],
                'service_area' => $orgProf->service_area_json ?? [
                    'areas' => 'Jakarta Barat, Jakarta Selatan, Tangerang Kota',
                    'radius_km' => 25,
                ],
                'competencies' => $orgProf->competencies_json ?? [
                    'AC Split & Inverter', 'Kompresor', 'Cuci AC & Overhaul', 'Instalasi Baru', 'Kelistrikan HVAC'
                ],
                'businessData' => [
                    'brandName' => $orgProf->display_name,
                    'legalName' => $orgProf->legal_name,
                    'businessType' => 'PT / Badan Usaha',
                    'nib' => !empty($orgProf->nib_ciphertext) ? Crypt::decryptString($orgProf->nib_ciphertext) : null,
                    'npwp' => !empty($orgProf->npwp_ciphertext) ? Crypt::decryptString($orgProf->npwp_ciphertext) : null,
                    'address' => is_array($orgProf->address_json) ? ($orgProf->address_json['address'] ?? $orgProf->address_json['street_address'] ?? null) : $orgProf->address_json,
                    'city' => is_array($orgProf->address_json) ? ($orgProf->address_json['city'] ?? $orgProf->address_json['city_name'] ?? null) : null,
                    'province' => is_array($orgProf->address_json) ? ($orgProf->address_json['province'] ?? $orgProf->address_json['province_name'] ?? null) : null,
                    'district' => is_array($orgProf->address_json) ? ($orgProf->address_json['district'] ?? $orgProf->address_json['district_name'] ?? null) : null,
                    'village' => is_array($orgProf->address_json) ? ($orgProf->address_json['village'] ?? $orgProf->address_json['village_name'] ?? null) : null,
                    'postalCode' => is_array($orgProf->address_json) ? ($orgProf->address_json['postal_code'] ?? null) : null,
                    'address_json' => $orgProf->address_json,
                    'addressData' => $orgProf->address_json,
                ],
                'picData' => [
                    'fullName' => $profile?->display_name,
                    'phone' => $user->phone_e164,
                    'email' => $user->email,
                ],
                'specializedData' => $orgProf->specialization_json,
            ];
        }

        $userAddress = $profile?->address_json;

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
            'address' => $userAddress,
            'address_json' => $userAddress,
            'addressData' => $userAddress,
            'personal_profile' => [
                'displayName' => $profile?->display_name ?? 'Pengguna',
                'legalName' => $profile?->legal_name ?? $profile?->display_name ?? 'Pengguna',
                'gender' => $profile?->gender,
                'dateOfBirth' => $birthDateStr,
                'avatar' => $profile?->photo_path ?? '/brand/logo.png',
                'address' => $userAddress,
                'address_json' => $userAddress,
            ],
            'personalProfile' => [
                'displayName' => $profile?->display_name ?? 'Pengguna',
                'legalName' => $profile?->legal_name ?? $profile?->display_name ?? 'Pengguna',
                'gender' => $profile?->gender,
                'dateOfBirth' => $birthDateStr,
                'avatar' => $profile?->photo_path ?? '/brand/logo.png',
                'address' => $userAddress,
                'address_json' => $userAddress,
            ],
            'nik_format_status' => ($nikRecord || $verificationReq) ? 'FORMAT_VALID' : null,
            'nik_locked' => ($nikRecord !== null || $verificationReq !== null),
            'email_otp_verified' => $user->email_verified_at !== null,
            'email_verified' => $user->email_verified_at !== null,
            'phone_verified' => $user->phone_verified_at !== null,
            'is_staff' => $isStaff,
            'staff' => $staffData,
            'businessProfile' => $businessProfile,
            'business_profile' => $businessProfile,
            'documents' => $documentsList,
            'activeOrganization' => $org ? [
                'id' => $org->id,
                'type' => $org->type,
                'status' => $org->status,
                'operational_status' => $org->operational_status ?? 'ONLINE_ACCEPTING',
                'operationalStatus' => $org->operational_status ?? 'ONLINE_ACCEPTING',
                'name' => $orgProf?->display_name ?? $orgProf?->legal_name,
                'legalName' => $orgProf?->legal_name,
                'address' => $orgProf?->address_json,
                'address_json' => $orgProf?->address_json,
                'operational_hours' => $orgProf?->operational_hours_json,
                'service_area' => $orgProf?->service_area_json,
                'competencies' => $orgProf?->competencies_json,
            ] : null,
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
            'address' => 'nullable',
            'address_json' => 'nullable',
            'addressData' => 'nullable',
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
        if ($request->has('address') || $request->has('address_json') || $request->has('addressData')) {
            $addr = $request->input('address_json') ?? $request->input('addressData') ?? $request->input('address');
            $profile->address_json = is_array($addr) ? $addr : (json_decode($addr, true) ?: ['street_address' => (string) $addr]);
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
            'address' => $profile->address_json,
            'address_json' => $profile->address_json,
            'addressData' => $profile->address_json,
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
            'operational_status' => $org->operational_status ?? 'ONLINE_ACCEPTING',
            'operationalStatus' => $org->operational_status ?? 'ONLINE_ACCEPTING',
            'display_name' => $prof?->display_name,
            'legal_name' => $prof?->legal_name,
            'business_email' => $prof?->business_email,
            'business_phone' => $prof?->business_phone,
            'address' => $prof?->address_json,
            'operational_hours' => $prof?->operational_hours_json,
            'operationalHours' => $prof?->operational_hours_json,
            'service_area' => $prof?->service_area_json,
            'serviceArea' => $prof?->service_area_json,
            'competencies' => $prof?->competencies_json,
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

        // Verify user is active member (OWNER / staff) of this organization
        $isMember = Membership::where('user_id', $user->id)
            ->where('organization_id', $org->id)
            ->where('status', 'ACTIVE')
            ->exists();

        if (!$isMember && !$user->hasPermission('identity.organization.manage')) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ditolak. Hanya anggota aktif organisasi yang dapat memperbarui profil.', 403);
        }

        $validated = $request->validate([
            'display_name' => 'nullable|string|max:190',
            'name' => 'nullable|string|max:190',
            'brandName' => 'nullable|string|max:190',
            'legal_name' => 'nullable|string|max:190',
            'legalName' => 'nullable|string|max:190',
            'business_email' => 'nullable|email|max:191',
            'business_phone' => 'nullable|string|max:20',
            'address' => 'nullable',
            'address_json' => 'nullable',
            'addressData' => 'nullable',
            'operational_status' => 'nullable|string|in:ONLINE_ACCEPTING,BUSY_DELAYED,TEMPORARY_CLOSED,ONLINE,BUSY,CLOSED',
            'operationalStatus' => 'nullable|string|in:ONLINE_ACCEPTING,BUSY_DELAYED,TEMPORARY_CLOSED,ONLINE,BUSY,CLOSED',
            'operational_hours' => 'nullable',
            'operationalHours' => 'nullable',
            'service_area' => 'nullable',
            'serviceArea' => 'nullable',
            'competencies' => 'nullable',
        ]);

        $prof = $org->profile ?? new OrganizationProfile(['organization_id' => $org->id]);
        $name = $validated['display_name'] ?? $validated['name'] ?? $validated['brandName'] ?? null;
        if (!empty($name)) {
            $prof->display_name = $name;
        }
        $legal = $validated['legal_name'] ?? $validated['legalName'] ?? null;
        if (!empty($legal)) {
            $prof->legal_name = $legal;
        }
        if (isset($validated['business_email'])) {
            $prof->business_email = $validated['business_email'];
        }
        if (isset($validated['business_phone'])) {
            $prof->business_phone = $validated['business_phone'];
        }
        $addr = $validated['address_json'] ?? $validated['addressData'] ?? $validated['address'] ?? null;
        if (isset($addr)) {
            $prof->address_json = is_array($addr) ? $addr : (json_decode($addr, true) ?: ['address' => (string) $addr]);
        }

        $hours = $validated['operational_hours'] ?? $validated['operationalHours'] ?? null;
        if (isset($hours)) {
            $prof->operational_hours_json = is_array($hours) ? $hours : json_decode($hours, true);
        }

        $area = $validated['service_area'] ?? $validated['serviceArea'] ?? null;
        if (isset($area)) {
            $prof->service_area_json = is_array($area) ? $area : json_decode($area, true);
        }

        $comp = $validated['competencies'] ?? null;
        if (isset($comp)) {
            $prof->competencies_json = is_array($comp) ? $comp : json_decode($comp, true);
        }

        $prof->save();

        $opStatus = $validated['operational_status'] ?? $validated['operationalStatus'] ?? null;
        if (!empty($opStatus)) {
            $canonicalStatus = match ($opStatus) {
                'ONLINE' => 'ONLINE_ACCEPTING',
                'BUSY' => 'BUSY_DELAYED',
                'CLOSED' => 'TEMPORARY_CLOSED',
                default => $opStatus,
            };
            $org->operational_status = $canonicalStatus;
            $org->save();

            OutboxService::publish('organization', $org->id, 'identity.organization.operational_status_updated.v1', [
                'organization_id' => $org->id,
                'operational_status' => $canonicalStatus,
                'changed_by' => $user->id,
            ]);
        }

        AuditService::log($user->id, 'IDENTITY_ORG_PROFILE_UPDATED', 'organization_profile', $org->id, 'SUCCESS');

        return ApiResponse::success([
            'id' => $org->id,
            'display_name' => $prof->display_name,
            'status' => $org->status,
            'operational_status' => $org->operational_status,
            'operationalStatus' => $org->operational_status,
            'address' => $prof->address_json,
            'address_json' => $prof->address_json,
            'addressData' => $prof->address_json,
            'operational_hours' => $prof->operational_hours_json,
            'service_area' => $prof->service_area_json,
            'competencies' => $prof->competencies_json,
        ], 'IDENTITY_ORG_PROFILE_UPDATED', 200);
    }

    /**
     * P12: Quick Update Organization Operational Status (ONLINE, BUSY, CLOSED)
     */
    public function updateOperationalStatus(Request $request, string $id)
    {
        $user = Auth::user();
        $org = Organization::find($id);

        if (!$org) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Organisasi tidak ditemukan.', 404);
        }

        $isMember = Membership::where('user_id', $user->id)
            ->where('organization_id', $org->id)
            ->where('status', 'ACTIVE')
            ->exists();

        if (!$isMember && !$user->hasPermission('identity.organization.manage')) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ditolak.', 403);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:ONLINE_ACCEPTING,BUSY_DELAYED,TEMPORARY_CLOSED,ONLINE,BUSY,CLOSED',
        ]);

        $canonicalStatus = match ($validated['status']) {
            'ONLINE' => 'ONLINE_ACCEPTING',
            'BUSY' => 'BUSY_DELAYED',
            'CLOSED' => 'TEMPORARY_CLOSED',
            default => $validated['status'],
        };

        $org->operational_status = $canonicalStatus;
        $org->save();

        AuditService::log($user->id, 'IDENTITY_ORG_OPERATIONAL_STATUS_CHANGED', 'organization', $org->id, 'SUCCESS', [
            'operational_status' => $canonicalStatus,
        ]);

        OutboxService::publish('organization', $org->id, 'identity.organization.operational_status_updated.v1', [
            'organization_id' => $org->id,
            'operational_status' => $canonicalStatus,
            'changed_by' => $user->id,
            'updated_at' => now()->toIso8601String(),
        ]);

        return ApiResponse::success([
            'id' => $org->id,
            'operational_status' => $canonicalStatus,
            'operationalStatus' => $canonicalStatus,
        ], 'IDENTITY_ORG_OPERATIONAL_STATUS_UPDATED', 200);
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
