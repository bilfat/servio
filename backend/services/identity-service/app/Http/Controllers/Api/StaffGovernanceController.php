<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthSession;
use App\Models\Invitation;
use App\Models\IdentityDocument;
use App\Models\IdentityVerificationRequest;
use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\StaffOnboarding;
use App\Models\StaffOnboardingStep;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\AuditService;
use App\Services\BrevoService;
use App\Services\OutboxService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StaffGovernanceController extends Controller
{
    /**
     * S01: CEO Create Internal Staff
     */
    public function createStaff(Request $request)
    {
        $ceo = Auth::user();

        // Normalize field names across frontend conventions
        $name = trim((string)($request->input('name') ?? $request->input('fullName') ?? ''));
        $email = trim(strtolower((string)($request->input('email') ?? '')));
        $role = (string)($request->input('role') ?? $request->input('roleCode') ?? 'ADMIN_OPERATIONS');
        $department = trim((string)($request->input('department') ?? 'Operations'));
        $position = trim((string)($request->input('position') ?? ''));
        $employmentType = (string)($request->input('employmentType') ?? $request->input('employment_type') ?? 'FULL_TIME');
        $startDate = (string)($request->input('startDate') ?? $request->input('start_date') ?? now()->toDateString());

        // Normalize phone number
        $rawPhone = $request->input('phone') ?? $request->input('phone_e164');
        $phone = null;
        if (!empty($rawPhone)) {
            $cleaned = preg_replace('/[^0-9+]/', '', (string)$rawPhone);
            if (str_starts_with($cleaned, '08')) {
                $cleaned = '+628' . substr($cleaned, 2);
            } elseif (str_starts_with($cleaned, '0')) {
                $cleaned = '+62' . substr($cleaned, 1);
            }
            $phone = substr($cleaned, 0, 20);
        }

        // Merge normalized attributes into request for clean Laravel validation
        $request->merge([
            'name' => $name,
            'email' => $email,
            'role' => $role,
            'department' => $department,
            'phone' => $phone,
        ]);

        $validated = $request->validate([
            'name' => 'required|string|min:2|max:160',
            'email' => 'required|email|max:191|unique:users,email',
            'role' => 'required|string|in:ADMIN_OPERATIONS,CUSTOMER_SUPPORT,FINANCE_PAYMENT_OPS,CEO_PRODUCT_OWNER',
            'department' => 'required|string|max:100',
            'phone' => 'nullable|string|max:20|unique:users,phone_e164',
        ], [
            'name.required' => 'Nama lengkap staf wajib diisi.',
            'name.min' => 'Nama lengkap minimal 2 karakter.',
            'email.required' => 'Email kantor staf wajib diisi.',
            'email.email' => 'Format email staf tidak valid.',
            'email.unique' => 'Email ini sudah terdaftar sebagai pengguna SERVIO.',
            'role.required' => 'Peran / Role staf wajib dipilih.',
            'role.in' => 'Peran / Role yang dipilih tidak valid.',
            'department.required' => 'Departemen staf wajib diisi.',
            'phone.unique' => 'Nomor telepon ini sudah digunakan oleh akun lain.',
        ]);

        // Auto-generate Employee ID: [Role Prefix]-[Name]-[Random]
        // Contoh: ADM-BUDI-7K2, FNC-BUDI-3M9, CS-BUDI-8X1
        $inputEmpId = trim((string)($request->input('employee_id') ?? $request->input('employeeId') ?? ''));
        if (empty($inputEmpId) || str_contains(strtoupper($inputEmpId), 'AUTO') || str_contains($inputEmpId, 'Dibuat')) {
            $generatedEmpId = $this->generateStaffEmployeeId($role, $name);
        } else {
            if (UserProfile::where('employee_id', $inputEmpId)->exists()) {
                $generatedEmpId = $this->generateStaffEmployeeId($role, $name);
            } else {
                $generatedEmpId = $inputEmpId;
            }
        }

        return DB::transaction(function () use ($ceo, $validated, $name, $email, $role, $department, $position, $phone, $employmentType, $startDate, $generatedEmpId) {
            $user = User::create([
                'email' => $email,
                'phone_e164' => $phone,
                'password_hash' => Hash::make(Str::random(32)), // temporary random until activation/onboarding
                'status' => 'PENDING',
                'authz_version' => 1,
            ]);

            UserProfile::create([
                'user_id' => $user->id,
                'display_name' => $name,
                'employee_id' => $generatedEmpId,
                'department' => $department,
                'photo_path' => '/brand/logo.png',
                'locale' => 'id_ID',
            ]);

            $roleModel = Role::where('code', $role)->first();
            if ($roleModel) {
                RoleAssignment::create([
                    'user_id' => $user->id,
                    'role_id' => $roleModel->id,
                    'status' => 'ACTIVE',
                    'assigned_by' => $ceo->id,
                    'assigned_at' => now(),
                ]);
            }

            // Create Staff Onboarding aggregate
            $onboarding = StaffOnboarding::create([
                'staff_user_id' => $user->id,
                'status' => 'INVITED',
                'created_by' => $ceo->id,
            ]);

            foreach (['PROFILE', 'EMPLOYEE_KYC', 'NDA', 'ACCESS_CONFIRMATION'] as $stepKey) {
                StaffOnboardingStep::create([
                    'onboarding_id' => $onboarding->id,
                    'step_key' => $stepKey,
                    'status' => 'PENDING',
                ]);
            }

            // Create invitation
            $token = Str::random(40);
            $invitation = Invitation::create([
                'kind' => 'STAFF',
                'issuer_user_id' => $ceo->id,
                'recipient_user_id' => $user->id,
                'recipient_email' => $user->email,
                'target_role' => $role,
                'token_hash' => hash('sha256', $token),
                'encrypted_token' => Crypt::encryptString($token),
                'status' => 'INVITED',
                'expires_at' => now()->addHours(12),
            ]);

            $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000'));
            $invitationPath = "/auth/invitation?token={$token}";
            $invitationUrl = rtrim($frontendUrl, '/') . $invitationPath;

            $roleTitle = match($role) {
                'ADMIN_OPERATIONS' => 'Admin Operasional / Verifikasi',
                'FINANCE_PAYMENT_OPS' => 'Finance & Payments Operasional',
                'CUSTOMER_SUPPORT' => 'Customer Support & Mediasi',
                'CEO_PRODUCT_OWNER' => 'CEO & Product Owner',
                default => $roleModel?->name ?? $role,
            };

            BrevoService::sendStaffInvitationEmail(
                $user->email,
                $name,
                $roleTitle,
                $department,
                $invitationUrl,
                $generatedEmpId
            );

            AuditService::log($ceo->id, 'IDENTITY_STAFF_CREATED', 'user', $user->id, 'SUCCESS', ['role' => $role]);
            OutboxService::publish('staff', $user->id, 'identity.staff.created.v1', [
                'user_id' => $user->id,
                'role' => $role,
                'status' => 'INVITED',
            ]);

            $accountView = [
                'id' => $user->id,
                'user_id' => $user->id,
                'fullName' => $name,
                'display_name' => $name,
                'name' => $name,
                'email' => $user->email,
                'phone' => $phone ?? '-',
                'role' => $role,
                'roleCode' => $role,
                'status' => 'INVITED',
                'employmentStatus' => 'INVITED',
                'onboardingStatus' => 'INVITED',
                'onboarding_status' => 'INVITED',
                'readiness' => 'IN_PROGRESS',
                'department' => $department,
                'employeeId' => $generatedEmpId,
                'employee_id' => $generatedEmpId,
                'position' => $position ?: ($roleModel?->name ?? $role),
                'employmentType' => $employmentType,
                'startDate' => $startDate ?: now()->toDateString(),
                'joinedAt' => now()->toIso8601String(),
                'created_at' => now()->toIso8601String(),
            ];

            return ApiResponse::success([
                'user_id' => $user->id,
                'display_name' => $name,
                'fullName' => $name,
                'name' => $name,
                'email' => $user->email,
                'role' => $role,
                'roleCode' => $role,
                'status' => 'INVITED',
                'onboarding_status' => 'INVITED',
                'department' => $department,
                'employee_id' => $generatedEmpId,
                'employeeId' => $generatedEmpId,
                'invitation_token' => $token,
                'invitationToken' => $token,
                'token' => $token,
                'invitation_path' => $invitationPath,
                'invitationPath' => $invitationPath,
                'invitation_url' => $invitationUrl,
                'invitationUrl' => $invitationUrl,
                'account' => $accountView,
            ], 'IDENTITY_STAFF_CREATED', 201);
        });
    }

    /**
     * Generate automatic Employee ID using format: [Role Prefix]-[Name]-[Random]
     * Role Prefixes:
     * - ADMIN_OPERATIONS => ADM
     * - FINANCE_PAYMENT_OPS => FNC
     * - CUSTOMER_SUPPORT => CS
     * - CEO_PRODUCT_OWNER => CEO
     * - WORKER_TECHNICIAN => TECH
     * - Default => STF
     *
     * Contoh: ADM-BUDI-7K2, FNC-BUDI-3M9, CS-BUDI-8X1
     */
    public function generateStaffEmployeeId(string $roleCode, string $name): string
    {
        $roleUpper = strtoupper($roleCode);
        $prefix = match (true) {
            str_contains($roleUpper, 'ADMIN') => 'ADM',
            str_contains($roleUpper, 'FINANCE') => 'FNC',
            str_contains($roleUpper, 'SUPPORT') || str_contains($roleUpper, 'CS') => 'CS',
            str_contains($roleUpper, 'CEO') => 'CEO',
            str_contains($roleUpper, 'WORKER') || str_contains($roleUpper, 'TECHNICIAN') => 'TECH',
            default => 'STF',
        };

        $firstWord = explode(' ', trim($name))[0] ?? 'STAF';
        $cleanName = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $firstWord), 0, 8));
        if (empty($cleanName)) {
            $cleanName = 'STAF';
        }

        for ($i = 0; $i < 10; $i++) {
            $randomCode = strtoupper(Str::random(3));
            $candidate = "{$prefix}-{$cleanName}-{$randomCode}";
            if (!UserProfile::where('employee_id', $candidate)->exists()) {
                return $candidate;
            }
        }

        return "{$prefix}-{$cleanName}-" . strtoupper(Str::random(4));
    }

    /**
     * S02: CEO List Staff
     */
    public function listStaff(Request $request)
    {
        $staffRoles = Role::whereIn('code', ['ADMIN_OPERATIONS', 'CUSTOMER_SUPPORT', 'FINANCE_PAYMENT_OPS'])->pluck('id');
        $users = User::whereHas('roleAssignments', fn($q) => $q->whereIn('role_id', $staffRoles))
            ->with(['profile', 'roleAssignments.role', 'staffOnboarding'])
            ->get()
            ->map(fn($u) => $this->formatStaffView($u));

        return ApiResponse::success(['items' => $users, 'has_more' => false], 'IDENTITY_STAFF_LIST', 200);
    }

    /**
     * S03: CEO Get Staff Detail
     */
    public function getStaff(Request $request, string $id)
    {
        $user = User::with(['profile', 'roleAssignments.role', 'staffOnboarding.steps'])->find($id);
        if (!$user) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Staf tidak ditemukan.', 404);
        }

        return ApiResponse::success($this->formatStaffView($user), 'IDENTITY_STAFF_LOADED', 200);
    }

    /**
     * S04: CEO Manage Staff Access
     */
    public function manageStaffAccess(Request $request, string $id)
    {
        $ceo = Auth::user();
        if ($id === $ceo->id) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'CEO tidak dapat mengubah akses akun sendiri.', 403);
        }

        $user = User::findOrFail($id);
        $validated = $request->validate([
            'role' => 'required|string|in:ADMIN_OPERATIONS,CUSTOMER_SUPPORT,FINANCE_PAYMENT_OPS',
            'reason' => 'required|string',
        ]);

        $roleModel = Role::where('code', $validated['role'])->first();
        if ($roleModel) {
            RoleAssignment::where('user_id', $user->id)->update(['status' => 'REVOKED']);
            RoleAssignment::create([
                'user_id' => $user->id,
                'role_id' => $roleModel->id,
                'status' => 'ACTIVE',
                'assigned_by' => $ceo->id,
                'assigned_at' => now(),
                'reason' => $validated['reason'],
            ]);
        }

        $user->authz_version++;
        $user->save();

        AuditService::log($ceo->id, 'IDENTITY_STAFF_ACCESS_UPDATED', 'user', $user->id, 'SUCCESS', ['new_role' => $validated['role']]);

        return ApiResponse::success([
            'user_id' => $user->id,
            'authorization_version' => $user->authz_version,
        ], 'IDENTITY_STAFF_ACCESS_UPDATED', 200);
    }

    /**
     * S05: CEO Suspend Staff
     */
    public function suspendStaff(Request $request, string $id)
    {
        $ceo = Auth::user();
        if ($id === $ceo->id) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Tidak dapat menangguhkan akun CEO.', 403);
        }

        $user = User::findOrFail($id);
        $validated = $request->validate(['reason' => 'required|string']);

        $user->status = 'SUSPENDED';
        $user->suspended_at = now();
        $user->authz_version++;
        $user->save();

        AuthSession::where('user_id', $user->id)->whereNull('revoked_at')->update(['revoked_at' => now()]);

        AuditService::log($ceo->id, 'IDENTITY_STAFF_SUSPENDED', 'user', $user->id, 'SUCCESS', ['reason' => $validated['reason']]);
        OutboxService::publish('user', $user->id, 'identity.user.suspended.v1', [
            'user_id' => $user->id,
            'reason' => $validated['reason'],
        ]);

        return ApiResponse::success($this->formatStaffView($user), 'IDENTITY_STAFF_SUSPENDED', 200);
    }

    /**
     * S06: CEO Activate Staff
     */
    public function activateStaff(Request $request, string $id)
    {
        $ceo = Auth::user();
        $user = User::findOrFail($id);

        $user->status = 'ACTIVE';
        $user->suspended_at = null;
        $user->authz_version++;
        $user->save();

        AuditService::log($ceo->id, 'IDENTITY_STAFF_ACTIVATED', 'user', $user->id, 'SUCCESS');

        return ApiResponse::success($this->formatStaffView($user), 'IDENTITY_STAFF_ACTIVATED', 200);
    }

    /**
     * S07: CEO Deactivate Staff
     */
    public function deactivateStaff(Request $request, string $id)
    {
        $ceo = Auth::user();
        if ($id === $ceo->id) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Tidak dapat menonaktifkan akun CEO.', 403);
        }

        $user = User::findOrFail($id);
        $user->status = 'DEACTIVATED';
        $user->authz_version++;
        $user->save();

        AuthSession::where('user_id', $user->id)->whereNull('revoked_at')->update(['revoked_at' => now()]);

        AuditService::log($ceo->id, 'IDENTITY_STAFF_DEACTIVATED', 'user', $user->id, 'SUCCESS');

        return ApiResponse::success($this->formatStaffView($user), 'IDENTITY_STAFF_DEACTIVATED', 200);
    }

    /**
     * S08: Staff Onboarding Progress (/staff/onboarding/me)
     */
    public function myOnboarding(Request $request)
    {
        $user = Auth::user();
        $onboarding = StaffOnboarding::with(['steps'])->where('staff_user_id', $user->id)->first();

        if (!$onboarding) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Data onboarding tidak ditemukan.', 404);
        }

        $profile = $user->profile;
        $activeRoleModel = $user->roleAssignments()->where('status', 'ACTIVE')->first()?->role;
        $activeRole = $activeRoleModel?->code ?? 'STAFF';

        // Check latest verification request for masked NIK & documents
        $verificationReq = IdentityVerificationRequest::where('user_id', $user->id)
            ->where('kind', 'EMPLOYEE_KYC')
            ->latest()
            ->with('documents')
            ->first();

        $maskedNik = null;
        if ($verificationReq && !empty($verificationReq->nik_ciphertext)) {
            try {
                $decryptedNik = Crypt::decryptString($verificationReq->nik_ciphertext);
                $maskedNik = substr($decryptedNik, 0, 4) . '************';
            } catch (\Throwable) {
                $maskedNik = '3171************';
            }
        } elseif ($verificationReq && $verificationReq->nik_lookup_hash) {
            $maskedNik = '3171************';
        }

        $steps = $onboarding->steps;
        $completedStepsCount = $steps->where('status', 'COMPLETED')->count();

        $progress = match ($onboarding->status) {
            'COMPLETED', 'OPERATIONAL_READY' => 100,
            'PENDING_REVIEW' => 85,
            'REVISION_REQUIRED' => 60,
            'REJECTED' => 20,
            default => min(80, $completedStepsCount * 20),
        };

        $isReady = ($user->status === 'ACTIVE' && in_array($onboarding->status, ['COMPLETED', 'OPERATIONAL_READY']));

        return ApiResponse::success([
            'id' => $onboarding->id,
            'user_id' => $user->id,
            'status' => $onboarding->status,
            'onboarding_status' => $onboarding->status,
            'revision_notes' => $onboarding->revision_notes,
            'rejection_reason' => $onboarding->rejection_reason,
            'progress' => $progress,
            'readiness' => $isReady ? 'READY' : 'NOT_READY',
            'readiness_status' => $isReady ? 'READY' : 'NOT_READY',
            'employee' => [
                'employee_id' => $profile?->employee_id ?? ('EMP-' . substr($user->id, 0, 5)),
                'email' => $user->email,
                'role' => $activeRole,
                'role_name' => $activeRoleModel?->name ?? $activeRole,
                'department' => $profile?->department ?? 'Operasional',
                'position' => $activeRoleModel?->name ?? $activeRole,
            ],
            'profile' => [
                'display_name' => $profile?->display_name ?? 'Staf Internal',
                'legal_name' => $profile?->legal_name ?? $profile?->display_name ?? 'Staf Internal',
                'gender' => $profile?->gender ?? '',
                'birth_date' => $profile?->birth_date ? (is_string($profile->birth_date) ? substr($profile->birth_date, 0, 10) : $profile->birth_date->format('Y-m-d')) : '',
                'phone' => $user->phone_e164 ?? '',
                'photo_path' => $profile?->photo_path ?? '/brand/logo.png',
            ],
            'berkas' => [
                'nik_masked' => $maskedNik,
                'verification_status' => $verificationReq?->status ?? 'PENDING',
                'document_count' => $verificationReq ? $verificationReq->documents->count() : 0,
                'documents' => $verificationReq ? $verificationReq->documents->map(fn($d) => [
                    'id' => $d->id,
                    'type' => $d->type,
                    'mime' => $d->mime,
                    'size_bytes' => $d->size_bytes,
                    'download_url' => "/api/v1/identity/documents/{$d->id}/download",
                ])->values()->all() : [],
            ],
            'steps' => $steps->map(fn($s) => [
                'id' => $s->id,
                'key' => $s->step_key,
                'code' => $s->step_key,
                'title' => match($s->step_key) {
                    'PROFILE' => '1. Profil Pribadi & Kontak',
                    'EMPLOYEE_KYC' => '2. Pengecekan Berkas (NIK & e-KTP)',
                    'NDA' => '3. Perjanjian Kerahasiaan (NDA)',
                    'ACCESS_CONFIRMATION' => '4. Konfirmasi Hak Akses Sistem',
                    default => $s->step_key,
                },
                'status' => $s->status,
                'completed' => $s->status === 'COMPLETED',
                'document_version' => $s->document_version,
                'evidence_document_id' => $s->evidence_document_id,
                'completed_at' => $s->completed_at?->toIso8601String(),
            ])->values()->all(),
        ], 'IDENTITY_STAFF_ONBOARDING_LOADED', 200);
    }

    /**
     * S09: Step 1 - PROFILE (CR-03: Nama lengkap, nama sesuai identitas, jenis kelamin, tanggal lahir, nomor HP, foto profil opsional)
     */
    public function completeProfileStep(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'display_name' => 'required|string|min:2|max:160',
            'legal_name' => 'nullable|string|min:2|max:160',
            'gender' => 'nullable|string|max:30',
            'birth_date' => 'nullable|string|max:30',
            'phone' => [
                'nullable',
                'string',
                'max:25',
                function ($attribute, $value, $fail) use ($user) {
                    if (empty($value)) return;
                    $cleaned = preg_replace('/[^0-9+]/', '', (string)$value);
                    if (str_starts_with($cleaned, '08')) {
                        $cleaned = '+628' . substr($cleaned, 2);
                    } elseif (str_starts_with($cleaned, '0')) {
                        $cleaned = '+62' . substr($cleaned, 1);
                    }
                    $exists = User::where('phone_e164', $cleaned)->where('id', '!=', $user->id)->exists();
                    if ($exists) {
                        $fail('Nomor telepon/WhatsApp sudah terdaftar pada akun lain.');
                    }
                }
            ],
            'photo_path' => 'nullable|string',
        ], [
            'display_name.required' => 'Nama lengkap staf wajib diisi.',
            'display_name.min' => 'Nama lengkap minimal 2 karakter.',
        ]);

        $profile = $user->profile ?? new UserProfile(['user_id' => $user->id]);
        $profile->display_name = trim($validated['display_name']);
        $profile->legal_name = !empty($validated['legal_name']) ? trim($validated['legal_name']) : trim($validated['display_name']);
        if (isset($validated['gender'])) {
            $profile->gender = !empty($validated['gender']) ? trim($validated['gender']) : null;
        }
        if (isset($validated['birth_date'])) {
            $rawDate = trim((string)$validated['birth_date']);
            if (!empty($rawDate)) {
                try {
                    $profile->birth_date = \Illuminate\Support\Carbon::parse($rawDate)->format('Y-m-d');
                } catch (\Throwable $e) {
                    $profile->birth_date = substr($rawDate, 0, 10);
                }
            } else {
                $profile->birth_date = null;
            }
        }
        if (!empty($validated['photo_path'])) {
            $photoInput = $validated['photo_path'];
            if (str_starts_with($photoInput, 'data:image/')) {
                // Base64 Data URL decoding
                $parts = explode(',', $photoInput, 2);
                if (count($parts) === 2) {
                    $meta = $parts[0];
                    $base64 = $parts[1];
                    $ext = 'png';
                    if (str_contains($meta, 'jpeg') || str_contains($meta, 'jpg')) {
                        $ext = 'jpg';
                    } elseif (str_contains($meta, 'webp')) {
                        $ext = 'webp';
                    }
                    $imageData = base64_decode($base64);
                    if ($imageData !== false) {
                        if (strlen($imageData) > 5 * 1024 * 1024) {
                            return ApiResponse::error('IDENTITY_FILE_TOO_LARGE', 'Ukuran foto profil maksimal 5MB.', 422);
                        }
                        $fileName = 'avatars/staff_' . $user->id . '_' . time() . '.' . $ext;
                        Storage::disk('public')->put($fileName, $imageData);
                        $profile->photo_path = Storage::url($fileName);
                    }
                }
            } else {
                $profile->photo_path = substr($photoInput, 0, 512);
            }
        }
        $profile->save();

        if (!empty($validated['phone'])) {
            $cleaned = preg_replace('/[^0-9+]/', '', (string)$validated['phone']);
            if (str_starts_with($cleaned, '08')) {
                $cleaned = '+628' . substr($cleaned, 2);
            } elseif (str_starts_with($cleaned, '0')) {
                $cleaned = '+62' . substr($cleaned, 1);
            }
            $user->phone_e164 = substr($cleaned, 0, 20);
            $user->save();
        }

        $onboarding = StaffOnboarding::where('staff_user_id', $user->id)->first();
        if ($onboarding) {
            StaffOnboardingStep::where('onboarding_id', $onboarding->id)
                ->where('step_key', 'PROFILE')
                ->update(['status' => 'COMPLETED', 'completed_at' => now()]);

            if (in_array($onboarding->status, ['INVITED', 'REVISION_REQUIRED'])) {
                $onboarding->status = 'IN_PROGRESS';
                $onboarding->save();
            }
        }

        return ApiResponse::success([
            'step' => 'PROFILE',
            'status' => 'COMPLETED',
            'profile' => [
                'display_name' => $profile->display_name,
                'legal_name' => $profile->legal_name,
                'gender' => $profile->gender,
                'birth_date' => $profile->birth_date ? (is_string($profile->birth_date) ? substr($profile->birth_date, 0, 10) : $profile->birth_date->format('Y-m-d')) : null,
                'phone' => $user->phone_e164,
                'photo_path' => $profile->photo_path,
            ],
        ], 'IDENTITY_ONBOARDING_STEP_COMPLETED', 200);
    }

    /**
     * S10: Step 2 - Pengecekan Berkas (CR-03: NIK 16 digit & upload e-KTP)
     */
    public function completeKycStep(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'nik' => ['nullable', 'string', 'regex:/^[0-9]{16}$/D'],
            'verification_request_id' => 'nullable|string',
            'document_id' => 'nullable|string',
            'file' => 'nullable|file|max:5120|mimes:jpeg,jpg,png,pdf',
        ], [
            'nik.regex' => 'NIK harus berupa 16 digit angka.',
            'file.max' => 'Ukuran berkas e-KTP maksimal 5MB.',
            'file.mimes' => 'Format berkas e-KTP harus berupa JPEG, JPG, PNG, atau PDF.',
        ]);

        $nik = $validated['nik'] ?? null;
        $onboarding = StaffOnboarding::where('staff_user_id', $user->id)->first();
        if (!$onboarding) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Onboarding staf tidak ditemukan.', 404);
        }

        return DB::transaction(function () use ($user, $onboarding, $validated, $nik, $request) {
            // Find or create IdentityVerificationRequest for EMPLOYEE_KYC
            $verification = IdentityVerificationRequest::where('user_id', $user->id)
                ->where('kind', 'EMPLOYEE_KYC')
                ->latest()
                ->first();

            if (!$verification) {
                $verification = IdentityVerificationRequest::create([
                    'user_id' => $user->id,
                    'kind' => 'EMPLOYEE_KYC',
                    'status' => 'PENDING',
                    'nik_ciphertext' => !empty($nik) ? Crypt::encryptString($nik) : null,
                    'nik_lookup_hash' => !empty($nik) ? hash('sha256', $nik) : null,
                ]);
            } else {
                if (!empty($nik)) {
                    $verification->nik_ciphertext = Crypt::encryptString($nik);
                    $verification->nik_lookup_hash = hash('sha256', $nik);
                }
                $verification->status = 'PENDING';
                $verification->save();
            }

            // Handle direct e-KTP file upload
            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $storagePath = $file->store('private/identity_documents');
                $sha256 = hash_file('sha256', $file->getRealPath());

                $doc = IdentityDocument::create([
                    'verification_request_id' => $verification->id,
                    'type' => 'KTP',
                    'private_storage_key' => $storagePath,
                    'sha256' => $sha256,
                    'mime' => $file->getClientMimeType(),
                    'size_bytes' => $file->getSize(),
                    'uploaded_at' => now(),
                ]);
            } elseif (!empty($validated['document_id'])) {
                IdentityDocument::where('id', $validated['document_id'])
                    ->update(['verification_request_id' => $verification->id]);
            }

            StaffOnboardingStep::where('onboarding_id', $onboarding->id)
                ->where('step_key', 'EMPLOYEE_KYC')
                ->update([
                    'status' => 'COMPLETED',
                    'completed_at' => now(),
                    'evidence_document_id' => $verification->id,
                ]);

            if (in_array($onboarding->status, ['INVITED', 'REVISION_REQUIRED'])) {
                $onboarding->status = 'IN_PROGRESS';
                $onboarding->save();
            }

            $maskedNik = !empty($nik) ? (substr($nik, 0, 4) . '************') : '3171************';

            return ApiResponse::success([
                'step' => 'EMPLOYEE_KYC',
                'label' => 'Pengecekan Berkas',
                'status' => 'COMPLETED',
                'nik_masked' => $maskedNik,
                'verification_request_id' => $verification->id,
            ], 'IDENTITY_ONBOARDING_STEP_COMPLETED', 200);
        });
    }

    /**
     * S11: Step 3 - NDA (CR-03: Dokumen NDA resmi SERVIO & versi)
     */
    public function completeNdaStep(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'nda_version' => 'required|string',
            'accepted' => 'required|boolean|accepted',
        ], [
            'nda_version.required' => 'Versi dokumen NDA wajib ditentukan.',
            'accepted.accepted' => 'Persetujuan terhadap Perjanjian Kerahasiaan (NDA) wajib dicentang.',
        ]);

        $onboarding = StaffOnboarding::where('staff_user_id', $user->id)->first();
        if (!$onboarding) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Onboarding staf tidak ditemukan.', 404);
        }

        StaffOnboardingStep::where('onboarding_id', $onboarding->id)
            ->where('step_key', 'NDA')
            ->update([
                'status' => 'COMPLETED',
                'document_version' => $validated['nda_version'],
                'completed_at' => now(),
            ]);

        if (in_array($onboarding->status, ['INVITED', 'REVISION_REQUIRED'])) {
            $onboarding->status = 'IN_PROGRESS';
            $onboarding->save();
        }

        return ApiResponse::success([
            'step' => 'NDA',
            'status' => 'COMPLETED',
            'nda_version' => $validated['nda_version'],
            'completed_at' => now()->toIso8601String(),
        ], 'IDENTITY_ONBOARDING_STEP_COMPLETED', 200);
    }

    /**
     * S12: Step 4 - ACCESS_CONFIRMATION (CR-03: Konfirmasi hak akses yang ditetapkan CEO)
     */
    public function confirmAccessStep(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'accepted' => 'required|boolean|accepted',
            'acknowledged_permission_version' => 'nullable|integer',
        ], [
            'accepted.accepted' => 'Konfirmasi hak akses penugasan wajib disetujui.',
        ]);

        $onboarding = StaffOnboarding::where('staff_user_id', $user->id)->first();
        if (!$onboarding) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Onboarding staf tidak ditemukan.', 404);
        }

        StaffOnboardingStep::where('onboarding_id', $onboarding->id)
            ->where('step_key', 'ACCESS_CONFIRMATION')
            ->update([
                'status' => 'COMPLETED',
                'completed_at' => now(),
            ]);

        if (in_array($onboarding->status, ['INVITED', 'REVISION_REQUIRED'])) {
            $onboarding->status = 'IN_PROGRESS';
            $onboarding->save();
        }

        return ApiResponse::success([
            'step' => 'ACCESS_CONFIRMATION',
            'status' => 'COMPLETED',
            'message' => 'Konfirmasi hak akses berhasil direkam. Silakan kirim seluruh berkas untuk verifikasi CEO.',
        ], 'IDENTITY_ONBOARDING_STEP_COMPLETED', 200);
    }

    /**
     * S12b: Kirim Onboarding untuk Verifikasi CEO (CR-03 Section E)
     */
    public function submitOnboarding(Request $request)
    {
        $user = Auth::user();
        $onboarding = StaffOnboarding::with('steps')->where('staff_user_id', $user->id)->first();

        if (!$onboarding) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Onboarding staf tidak ditemukan.', 404);
        }

        // Validate that all 4 mandatory steps are COMPLETED
        $incomplete = StaffOnboardingStep::where('onboarding_id', $onboarding->id)
            ->where('status', '!=', 'COMPLETED')
            ->pluck('step_key')
            ->all();

        if (!empty($incomplete)) {
            return ApiResponse::error(
                'IDENTITY_ONBOARDING_INCOMPLETE',
                'Seluruh empat tahap onboarding (Profil, Pengecekan Berkas, NDA, dan Konfirmasi Hak Akses) wajib diselesaikan sebelum pengajuan verifikasi.',
                422,
                ['incomplete_steps' => $incomplete]
            );
        }

        return DB::transaction(function () use ($user, $onboarding) {
            $onboarding->status = 'PENDING_REVIEW';
            $onboarding->revision_notes = null;
            $onboarding->save();

            // Ensure verification request is set to PENDING for CEO queue
            $verification = IdentityVerificationRequest::where('user_id', $user->id)
                ->where('kind', 'EMPLOYEE_KYC')
                ->latest()
                ->first();

            if ($verification) {
                $verification->status = 'PENDING';
                $verification->rejection_reason = null;
                $verification->save();
            }

            AuditService::log($user->id, 'IDENTITY_STAFF_ONBOARDING_SUBMITTED', 'staff_onboarding', $onboarding->id, 'SUCCESS');
            OutboxService::publish('staff', $user->id, 'identity.staff.onboarding_submitted.v1', [
                'user_id' => $user->id,
                'status' => 'PENDING_REVIEW',
            ]);

            return ApiResponse::success([
                'id' => $onboarding->id,
                'status' => 'PENDING_REVIEW',
                'message' => 'Berkas onboarding berhasil dikirim ke antrean verifikasi CEO.',
            ], 'IDENTITY_STAFF_ONBOARDING_SUBMITTED', 200);
        });
    }

    /**
     * S13: Admin Suspend User (Excludes CEO & Self)
     */
    public function adminSuspendUser(Request $request, string $id)
    {
        $admin = Auth::user();
        if ($id === $admin->id) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Tidak dapat menangguhkan diri sendiri.', 403);
        }

        $target = User::with('roleAssignments.role')->findOrFail($id);
        if ($target->hasRole('CEO_PRODUCT_OWNER')) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Tidak dapat menangguhkan akun CEO.', 403);
        }

        $validated = $request->validate(['reason' => 'required|string']);

        $target->status = 'SUSPENDED';
        $target->suspended_at = now();
        $target->authz_version++;
        $target->save();

        AuthSession::where('user_id', $target->id)->whereNull('revoked_at')->update(['revoked_at' => now()]);

        AuditService::log($admin->id, 'IDENTITY_USER_SUSPENDED', 'user', $target->id, 'SUCCESS', ['reason' => $validated['reason']]);

        return ApiResponse::success([
            'user_id' => $target->id,
            'status' => 'SUSPENDED',
        ], 'IDENTITY_USER_SUSPENDED', 200);
    }

    /**
     * S14: Admin Reactivate User
     */
    public function adminReactivateUser(Request $request, string $id)
    {
        $admin = Auth::user();
        $target = User::findOrFail($id);

        $target->status = 'ACTIVE';
        $target->suspended_at = null;
        $target->authz_version++;
        $target->save();

        AuditService::log($admin->id, 'IDENTITY_USER_REACTIVATED', 'user', $target->id, 'SUCCESS');

        return ApiResponse::success([
            'user_id' => $target->id,
            'status' => 'ACTIVE',
        ], 'IDENTITY_USER_REACTIVATED', 200);
    }

    /**
     * S15: Admin List Users
     */
    public function adminListUsers(Request $request)
    {
        $query = User::with(['profile', 'roleAssignments.role']);

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        $items = $query->paginate(20);
        $views = collect($items->items())->map(fn($u) => [
            'user_id' => $u->id,
            'name' => $u->profile?->display_name ?? 'Pengguna',
            'email_masked' => $u->email ? substr($u->email, 0, 2) . '***@' . explode('@', $u->email)[1] : null,
            'status' => $u->status,
            'roles' => $u->roleAssignments->map(fn($ra) => $ra->role->code)->all(),
        ]);

        return ApiResponse::success([
            'items' => $views,
            'has_more' => $items->hasMorePages(),
        ], 'IDENTITY_USERS_LIST', 200);
    }

    /**
     * S16: Admin Get User Detail
     */
    public function adminGetUser(Request $request, string $id)
    {
        $user = User::with(['profile', 'roleAssignments.role', 'memberships.organization'])->find($id);
        if (!$user) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Pengguna tidak ditemukan.', 404);
        }

        return ApiResponse::success([
            'user_id' => $user->id,
            'name' => $user->profile?->display_name,
            'status' => $user->status,
            'roles' => $user->roleAssignments->map(fn($ra) => $ra->role->code)->all(),
            'created_at' => $user->created_at?->toIso8601String(),
        ], 'IDENTITY_USER_DETAIL_LOADED', 200);
    }

    public function formatStaffView(User $u): array
    {
        $activeRoleModel = $u->roleAssignments()->where('status', 'ACTIVE')->first()?->role;
        $activeRole = $activeRoleModel?->code ?? 'STAFF';
        $name = $u->profile?->display_name ?? 'Staf Internal';
        $onboardingStatus = $u->staffOnboarding?->status ?? ($u->status === 'ACTIVE' ? 'COMPLETED' : 'INVITED');
        $isPending = in_array($u->status, ['PENDING', 'INVITED']) || $onboardingStatus === 'INVITED';
        $passwordStatus = $isPending ? 'PENDING_INVITATION' : 'CREATED';
        $passwordLabel = $isPending ? 'Belum Dibuat' : 'Sudah Dibuat';

        // CR-03 Section G: READY hanya jika akun aktif, password telah dibuat, onboarding lengkap & disetujui CEO
        $isReady = ($u->status === 'ACTIVE' && in_array($onboardingStatus, ['COMPLETED', 'OPERATIONAL_READY']));
        $readiness = $isReady ? 'READY' : 'NOT_READY';

        return [
            'id' => $u->id,
            'user_id' => $u->id,
            'fullName' => $name,
            'display_name' => $name,
            'name' => $name,
            'email' => $u->email,
            'phone' => $u->phone_e164 ?? '-',
            'role' => $activeRole,
            'roleCode' => $activeRole,
            'role_detail' => [
                'code' => $activeRole,
                'name' => $activeRoleModel?->name ?? $activeRole,
            ],
            'status' => $u->status,
            'employmentStatus' => $u->status,
            'onboardingStatus' => $onboardingStatus,
            'onboarding_status' => $onboardingStatus,
            'readiness' => $readiness,
            'department' => $u->profile?->department ?? 'Operasional',
            'employeeId' => $u->profile?->employee_id ?? ('EMP-' . substr($u->id, 0, 5)),
            'employee_id' => $u->profile?->employee_id,
            'position' => $activeRoleModel?->name ?? $activeRole,
            'employmentType' => 'FULL_TIME',
            'startDate' => $u->created_at?->toDateString(),
            'joinedAt' => $u->created_at?->toIso8601String(),
            'created_at' => $u->created_at?->toIso8601String(),
            'password' => null, // CR-03 Section A: Dilarang menampilkan password asli/hash
            'password_status' => $passwordStatus,
            'password_label' => $passwordLabel,
        ];
    }

    public function listAccounts(Request $request)
    {
        $staffRoles = Role::whereIn('code', ['ADMIN_OPERATIONS', 'CUSTOMER_SUPPORT', 'FINANCE_PAYMENT_OPS', 'CEO_PRODUCT_OWNER'])->pluck('id');
        $users = User::whereHas('roleAssignments', fn($q) => $q->whereIn('role_id', $staffRoles))
            ->with(['profile', 'roleAssignments.role', 'staffOnboarding'])
            ->get()
            ->map(fn($u) => $this->formatStaffView($u));

        $adminOpsCount = $users->filter(fn($u) => str_contains($u['roleCode'] ?? ($u['role'] ?? ''), 'ADMIN'))->count();
        $financeOpsCount = $users->filter(fn($u) => str_contains($u['roleCode'] ?? ($u['role'] ?? ''), 'FINANCE'))->count();
        $csSupportCount = $users->filter(fn($u) => str_contains($u['roleCode'] ?? ($u['role'] ?? ''), 'SUPPORT') || str_contains($u['roleCode'] ?? ($u['role'] ?? ''), 'CS'))->count();
        $readyCount = $users->where('readiness', 'READY')->count();
        $onboardingCount = $users->where('readiness', '!=', 'READY')->count();

        $stats = [
            'total' => $users->count(),
            'totalStaff' => $users->count(),
            'adminOperations' => $adminOpsCount,
            'financeOperations' => $financeOpsCount,
            'customerSupport' => $csSupportCount,
            'operationalReady' => $readyCount,
            'onboardingActive' => $onboardingCount,
            'active' => $users->where('status', 'ACTIVE')->count(),
            'onboarding' => $onboardingCount,
            'ready' => $readyCount,
        ];

        return ApiResponse::success([
            'stats' => $stats,
            'accounts' => $users,
            'items' => $users,
        ], 'IDENTITY_STAFF_ACCOUNTS_LOADED', 200);
    }

    public function getStaffAccount(Request $request, string $id)
    {
        $targetId = ($id === 'me') ? Auth::id() : $id;
        $user = User::with(['profile', 'roleAssignments.role', 'staffOnboarding.steps'])->find($targetId);
        if (!$user) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Akun internal tidak ditemukan.', 404);
        }

        $formatted = $this->formatStaffView($user);
        $onboarding = $user->staffOnboarding;
        $steps = $onboarding?->steps ?? collect();

        $latestInvite = Invitation::where(function ($q) use ($user) {
            $q->where('recipient_user_id', $user->id)
              ->orWhere('recipient_email', $user->email);
        })->where('kind', 'STAFF')->latest()->first();

        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');

        $verificationReq = IdentityVerificationRequest::where('user_id', $user->id)
            ->where('kind', 'EMPLOYEE_KYC')
            ->latest()
            ->with('documents')
            ->first();

        $maskedNik = null;
        if ($verificationReq && !empty($verificationReq->nik_ciphertext)) {
            try {
                $decryptedNik = Crypt::decryptString($verificationReq->nik_ciphertext);
                $maskedNik = substr($decryptedNik, 0, 4) . '************';
            } catch (\Throwable) {
                $maskedNik = '3171************';
            }
        } elseif ($verificationReq && $verificationReq->nik_lookup_hash) {
            $maskedNik = '3171************';
        }

        // CR-03 Section B: Only show invitation info while status is INVITED and password hasn't been set
        $canShowInvite = $latestInvite && $latestInvite->status === 'INVITED' && $user->status !== 'ACTIVE';

        $ktpDoc = $verificationReq?->documents?->firstWhere('type', 'KTP') ?? $verificationReq?->documents?->first();
        $ktpDownloadUrl = $ktpDoc ? ('/api/v1/identity/documents/' . $ktpDoc->id . '/download?inline=true') : null;

        $detail = array_merge($formatted, [
            'identity' => [
                'id' => $user->id,
                'fullName' => $formatted['fullName'],
                'legalName' => $user->profile?->legal_name ?? $formatted['fullName'],
                'email' => $user->email,
                'phone' => $user->phone_e164 ?? '',
                'status' => $user->status,
                'password' => null, // CR-03 Section A: Dilarang menampilkan password asli/hash
                'password_status' => $formatted['password_status'],
                'password_label' => $formatted['password_label'],
                'createdAt' => $user->created_at?->toIso8601String(),
                'nik' => $maskedNik,
                'ktpFilePath' => $ktpDownloadUrl,
                'emergencyContact' => null,
            ],
            'profile' => [
                'displayName' => $user->profile?->display_name ?? $formatted['fullName'],
                'legalName' => $user->profile?->legal_name ?? $formatted['fullName'],
                'bio' => null,
                'avatar' => $user->profile?->photo_path ?? null,
                'photo_path' => $user->profile?->photo_path ?? null,
                'gender' => $user->profile?->gender ?? null,
                'dateOfBirth' => $user->profile?->birth_date ? (is_string($user->profile->birth_date) ? substr($user->profile->birth_date, 0, 10) : $user->profile->birth_date->format('Y-m-d')) : null,
                'birth_date' => $user->profile?->birth_date ? (is_string($user->profile->birth_date) ? substr($user->profile->birth_date, 0, 10) : $user->profile->birth_date->format('Y-m-d')) : null,
            ],
            'role' => [
                'code' => $formatted['roleCode'],
                'name' => $formatted['role_detail']['name'] ?? $formatted['roleCode'],
            ],
            'employment' => [
                'id' => 'emp-' . $user->id,
                'employeeId' => $formatted['employeeId'],
                'department' => $formatted['department'],
                'position' => $formatted['position'],
                'employmentType' => $formatted['employmentType'],
                'startDate' => $formatted['startDate'],
                'status' => $user->status,
            ],
            'onboarding' => [
                'id' => $onboarding?->id ?? ('onb-' . $user->id),
                'status' => $formatted['onboardingStatus'],
                'revisionNotes' => $onboarding?->revision_notes,
                'rejectionReason' => $onboarding?->rejection_reason,
                'progress' => $formatted['onboardingStatus'] === 'COMPLETED' ? 100 : 50,
                'tasks' => $steps->map(fn($s) => [
                    'id' => $s->id,
                    'code' => $s->step_key,
                    'title' => match($s->step_key) {
                        'PROFILE' => '1. Profil Pribadi',
                        'EMPLOYEE_KYC' => '2. Pengecekan Berkas',
                        'NDA' => '3. NDA Kerahasiaan',
                        'ACCESS_CONFIRMATION' => '4. Konfirmasi Hak Akses',
                        default => $s->step_key,
                    },
                    'description' => 'Tahapan onboarding staf: ' . $s->step_key,
                    'required' => true,
                    'status' => $s->status,
                    'document_version' => $s->document_version,
                ])->values()->all(),
            ],
            'readiness' => [
                'ready' => $formatted['readiness'] === 'READY',
                'status' => $formatted['readiness'],
                'reason' => $formatted['readiness'] === 'READY' ? 'Semua tahapan terpenuhi & disetujui CEO.' : 'Onboarding dalam proses.',
                'checks' => [
                    'accountActive' => $user->status === 'ACTIVE',
                    'membershipActive' => true,
                    'roleAssignmentValid' => true,
                    'employmentActive' => true,
                    'onboardingCompleted' => in_array($formatted['onboardingStatus'], ['COMPLETED', 'OPERATIONAL_READY']),
                ],
            ],
            'invitation' => $canShowInvite ? [
                'id' => $latestInvite->id,
                'status' => $latestInvite->status,
                'expires_at' => $latestInvite->expires_at?->toIso8601String(),
                'is_expired' => $latestInvite->expires_at < now(),
            ] : null,
        ]);

        return ApiResponse::success($detail, 'IDENTITY_STAFF_ACCOUNT_LOADED', 200);
    }

    /**
     * S10: CEO / Internal Get or Regenerate Staff Invitation Link
     */
    public function getStaffInvitationLink(Request $request, string $id)
    {
        $user = User::with(['profile', 'roleAssignments.role'])->find($id);
        if (!$user) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Staf tidak ditemukan.', 404);
        }

        $activeRole = $user->roleAssignments->first()?->role?->code ?? 'ADMIN_OPERATIONS';
        $invitation = Invitation::where(function ($q) use ($user) {
            $q->where('recipient_user_id', $user->id)
              ->orWhere('recipient_email', $user->email);
        })->where('kind', 'STAFF')->latest()->first();

        // Enforce CR-03: Invitation link is strictly single-use and unavailable once staff has set password
        if ($user->status === 'ACTIVE' || ($invitation && $invitation->status === 'ACCEPTED')) {
            return ApiResponse::error(
                'IDENTITY_INVITATION_ALREADY_USED',
                'Akun staf telah diaktifkan dan kata sandi telah dibuat. Tautan undangan tidak lagi tersedia.',
                409
            );
        }

        $token = null;
        if ($invitation && $invitation->status === 'INVITED' && $invitation->expires_at > now() && !empty($invitation->encrypted_token)) {
            try {
                $token = Crypt::decryptString($invitation->encrypted_token);
            } catch (\Throwable) {
                $token = null;
            }
        }

        if (empty($token)) {
            $token = Str::random(40);
            $tokenHash = hash('sha256', $token);
            $expiresAt = now()->addHours(12);

            if ($invitation) {
                $invitation->token_hash = $tokenHash;
                $invitation->encrypted_token = Crypt::encryptString($token);
                $invitation->status = 'INVITED';
                $invitation->expires_at = $expiresAt;
                $invitation->save();
            } else {
                $invitation = Invitation::create([
                    'kind' => 'STAFF',
                    'issuer_user_id' => Auth::id() ?? $user->id,
                    'recipient_user_id' => $user->id,
                    'recipient_email' => $user->email,
                    'target_role' => $activeRole,
                    'token_hash' => $tokenHash,
                    'encrypted_token' => Crypt::encryptString($token),
                    'status' => 'INVITED',
                    'expires_at' => $expiresAt,
                ]);
            }
        }

        $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000'));
        $invitationUrl = rtrim($frontendUrl, '/') . '/auth/invitation?token=' . $token;

        return ApiResponse::success([
            'user_id' => $user->id,
            'staff_id' => $user->id,
            'name' => $user->profile?->display_name ?? 'Staf Internal',
            'email' => $user->email,
            'role' => $activeRole,
            'invitation_token' => $token,
            'invitation_url' => $invitationUrl,
            'expires_at' => $invitation->expires_at->toIso8601String(),
            'status' => $invitation->status,
        ], 'IDENTITY_STAFF_INVITATION_LINK_LOADED', 200);
    }

    /**
     * S10b: Resend Staff Invitation (Generates new token, invalidates previous, safe Brevo retry)
     */
    public function resendStaffInvitation(Request $request, string $id)
    {
        $user = User::with(['profile', 'roleAssignments.role'])->find($id);
        if (!$user) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Staf tidak ditemukan.', 404);
        }

        $invitation = Invitation::where(function ($q) use ($user) {
            $q->where('recipient_user_id', $user->id)
              ->orWhere('recipient_email', $user->email);
        })->where('kind', 'STAFF')->latest()->first();

        if ($user->status === 'ACTIVE' || ($invitation && $invitation->status === 'ACCEPTED')) {
            return ApiResponse::error(
                'IDENTITY_INVITATION_ALREADY_USED',
                'Akun staf telah diaktifkan dan kata sandi telah dibuat. Undangan tidak dapat dikirim ulang.',
                409
            );
        }

        $activeRole = $user->roleAssignments->first()?->role?->code ?? 'ADMIN_OPERATIONS';

        // Revoke any previous active invitations
        Invitation::where(function ($q) use ($user) {
            $q->where('recipient_user_id', $user->id)
              ->orWhere('recipient_email', $user->email);
        })->where('kind', 'STAFF')->where('status', 'INVITED')->update([
            'status' => 'REVOKED',
            'revoked_at' => now(),
            'encrypted_token' => null,
        ]);

        $token = Str::random(40);
        $tokenHash = hash('sha256', $token);
        $expiresAt = now()->addHours(12);

        $newInvite = Invitation::create([
            'kind' => 'STAFF',
            'issuer_user_id' => Auth::id() ?? $user->id,
            'recipient_user_id' => $user->id,
            'recipient_email' => $user->email,
            'target_role' => $activeRole,
            'token_hash' => $tokenHash,
            'encrypted_token' => Crypt::encryptString($token),
            'status' => 'INVITED',
            'expires_at' => $expiresAt,
        ]);

        $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:3000'));
        $invitationUrl = rtrim($frontendUrl, '/') . '/auth/invitation?token=' . $token;

        $roleTitle = match($activeRole) {
            'ADMIN_OPERATIONS' => 'Admin Operasional / Verifikasi',
            'FINANCE_PAYMENT_OPS' => 'Finance & Payments Operasional',
            'CUSTOMER_SUPPORT' => 'Customer Support & Mediasi',
            'CEO_PRODUCT_OWNER' => 'CEO & Product Owner',
            default => $activeRole,
        };

        $mailRes = BrevoService::sendStaffInvitationEmail(
            $user->email,
            $user->profile?->display_name ?? 'Staf Internal',
            $roleTitle,
            $user->profile?->department ?? 'Operasional',
            $invitationUrl,
            $user->profile?->employee_id ?? '-'
        );

        AuditService::log(Auth::id() ?? $user->id, 'IDENTITY_STAFF_INVITATION_RESENT', 'invitation', $newInvite->id, 'SUCCESS');

        return ApiResponse::success([
            'user_id' => $user->id,
            'staff_id' => $user->id,
            'email' => $user->email,
            'invitation_token' => $token,
            'invitation_url' => $invitationUrl,
            'expires_at' => $newInvite->expires_at->toIso8601String(),
            'delivery' => $mailRes,
        ], 'IDENTITY_STAFF_INVITATION_RESENT', 200);
    }

    /**
     * S10c: Cancel Staff Invitation
     */
    public function cancelStaffInvitation(Request $request, string $id)
    {
        $user = User::with(['profile'])->find($id);
        if (!$user) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Staf tidak ditemukan.', 404);
        }

        $invitation = Invitation::where(function ($q) use ($user) {
            $q->where('recipient_user_id', $user->id)
              ->orWhere('recipient_email', $user->email);
        })->where('kind', 'STAFF')->latest()->first();

        if ($user->status === 'ACTIVE' || ($invitation && $invitation->status === 'ACCEPTED')) {
            return ApiResponse::error(
                'IDENTITY_INVITATION_ALREADY_USED',
                'Akun staf telah diaktifkan dan kata sandi telah dibuat. Undangan tidak dapat dibatalkan.',
                409
            );
        }

        Invitation::where(function ($q) use ($user) {
            $q->where('recipient_user_id', $user->id)
              ->orWhere('recipient_email', $user->email);
        })->where('kind', 'STAFF')->where('status', 'INVITED')->update([
            'status' => 'REVOKED',
            'revoked_at' => now(),
            'encrypted_token' => null,
        ]);

        $onboarding = StaffOnboarding::where('staff_user_id', $user->id)->first();
        if ($onboarding) {
            $onboarding->status = 'CANCELLED';
            $onboarding->save();
        }

        $user->status = 'CANCELLED';
        $user->save();

        AuditService::log(Auth::id() ?? $user->id, 'IDENTITY_STAFF_INVITATION_CANCELLED', 'user', $user->id, 'SUCCESS');

        return ApiResponse::success([
            'user_id' => $user->id,
            'status' => 'CANCELLED',
            'message' => 'Undangan staf berhasil dibatalkan.',
        ], 'IDENTITY_STAFF_INVITATION_CANCELLED', 200);
    }

    public function updateStaffStatus(Request $request, string $id)
    {
        $user = User::find($id);
        if (!$user) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Akun internal tidak ditemukan.', 404);
        }

        $status = $request->input('status', 'ACTIVE');
        $user->status = $status;
        $user->save();

        if (in_array($status, ['SUSPENDED', 'DEACTIVATED'])) {
            AuthSession::where('user_id', $user->id)->update(['revoked_at' => now()]);
        }

        return ApiResponse::success($this->formatStaffView($user), 'IDENTITY_STAFF_STATUS_UPDATED', 200);
    }

    public function deleteStaffAccount(Request $request, string $id)
    {
        $user = User::find($id);
        if (!$user) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Akun internal tidak ditemukan.', 404);
        }

        // CR-03 Section G: Jangan melakukan hard delete terhadap staf yang sudah memiliki riwayat onboarding, NDA, atau audit. Pertahankan data sesuai kebijakan retensi.
        $hasHistory = StaffOnboarding::where('staff_user_id', $user->id)
            ->whereHas('steps', fn($q) => $q->where('status', 'COMPLETED'))
            ->exists()
            || \App\Models\AuditLog::where('actor_user_id', $user->id)->orWhere('target_id', $user->id)->exists()
            || IdentityVerificationRequest::where('user_id', $user->id)->exists();

        $user->status = 'DEACTIVATED';
        $user->save();
        AuthSession::where('user_id', $user->id)->update(['revoked_at' => now()]);

        AuditService::log(Auth::id() ?? $user->id, 'IDENTITY_STAFF_DEACTIVATED', 'user', $user->id, 'SUCCESS', [
            'retention_policy' => true,
            'had_history' => $hasHistory,
        ]);

        return ApiResponse::success([
            'id' => $id,
            'status' => 'DEACTIVATED',
            'message' => $hasHistory
                ? 'Akun staf dinonaktifkan sesuai kebijakan retensi data (riwayat audit, onboarding, dan berkas dipertahankan).'
                : 'Akun staf telah dinonaktifkan.',
        ], 'IDENTITY_STAFF_DEACTIVATED', 200);
    }

    public function getOnboardingDetail(Request $request, string $id)
    {
        $targetId = ($id === 'me') ? Auth::id() : $id;
        $user = User::with(['staffOnboarding.steps'])->find($targetId);
        if (!$user) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Akun internal tidak ditemukan.', 404);
        }

        $onboarding = $user->staffOnboarding;
        $steps = $onboarding?->steps ?? collect();

        return ApiResponse::success([
            'id' => $onboarding?->id ?? 'onb-' . $user->id,
            'status' => $onboarding?->status ?? 'COMPLETED',
            'progress' => $onboarding?->status === 'COMPLETED' ? 100 : 50,
            'tasks' => $steps->map(fn($s) => [
                'id' => $s->id,
                'name' => $s->step_key,
                'completed' => $s->status === 'COMPLETED',
                'status' => $s->status,
            ])->values()->all(),
        ], 'IDENTITY_ONBOARDING_LOADED', 200);
    }

    public function updateEmploymentDetail(Request $request, string $id)
    {
        $user = User::with('profile')->find($id);
        if (!$user) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Akun internal tidak ditemukan.', 404);
        }

        $profile = $user->profile ?? new UserProfile(['user_id' => $user->id]);
        if ($request->has('department')) $profile->department = $request->input('department');
        if ($request->has('employeeId')) $profile->employee_id = $request->input('employeeId');
        if ($request->has('position')) $profile->position = $request->input('position');
        $profile->save();

        return ApiResponse::success($this->formatStaffView($user), 'IDENTITY_EMPLOYMENT_UPDATED', 200);
    }
}
