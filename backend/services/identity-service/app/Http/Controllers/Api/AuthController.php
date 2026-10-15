<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthSession;
use App\Models\ExternalAuthIdentity;
use App\Models\PasswordResetGrant;
use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\AuditService;
use App\Services\IdempotencyService;
use App\Services\OtpService;
use App\Services\OutboxService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * A01: Register (Customer or Business Applicant)
     */
    public function register(Request $request)
    {
        $idempotencyKey = $request->header('Idempotency-Key');
        if ($idempotencyKey) {
            $cached = IdempotencyService::check('auth.register', $idempotencyKey, $request->all());
            if ($cached) {
                return response()->json($cached->response_json, $cached->response_status);
            }
        }

        if (!$request->has('name') && $request->has('fullName')) {
            $request->merge(['name' => $request->input('fullName')]);
        }
        if (!$request->has('phone') && $request->has('phone_e164')) {
            $request->merge(['phone' => $request->input('phone_e164')]);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:160',
            'email' => 'nullable|email|max:191',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
            'registration_type' => 'nullable|string|in:CUSTOMER,BUSINESS_APPLICANT',
        ]);

        if (empty($validated['email']) && empty($validated['phone'])) {
            return ApiResponse::error(
                'IDENTITY_VALIDATION_FAILED',
                'Email atau nomor telepon harus diisi.',
                422,
                ['identifier' => ['Salah satu email atau nomor telepon wajib diisi.']]
            );
        }

        // 1. Bersihkan akun pendaftar yang tidak memasukkan OTP lebih dari 1 jam
        User::cleanupUnverifiedExpiredUsers(1);

        // 2. Jika ada akun dengan email/telepon yang sama dan belum verifikasi (masih VERIFICATION_REQUIRED),
        // bersihkan data lama agar pengguna bisa mendaftar ulang dan menerima OTP baru
        if (!empty($validated['email'])) {
            $existingPending = User::where('email', $validated['email'])
                ->where('status', 'VERIFICATION_REQUIRED')
                ->first();
            if ($existingPending) {
                DB::transaction(function () use ($existingPending) {
                    UserProfile::where('user_id', $existingPending->id)->delete();
                    RoleAssignment::where('user_id', $existingPending->id)->delete();
                    OtpChallenge::where('user_id', $existingPending->id)->delete();
                    $existingPending->delete();
                });
            }
        }

        if (!empty($validated['phone'])) {
            $existingPendingPhone = User::where('phone_e164', $validated['phone'])
                ->where('status', 'VERIFICATION_REQUIRED')
                ->first();
            if ($existingPendingPhone) {
                DB::transaction(function () use ($existingPendingPhone) {
                    UserProfile::where('user_id', $existingPendingPhone->id)->delete();
                    RoleAssignment::where('user_id', $existingPendingPhone->id)->delete();
                    OtpChallenge::where('user_id', $existingPendingPhone->id)->delete();
                    $existingPendingPhone->delete();
                });
            }
        }

        // 3. Cek apakah email atau nomor telepon sudah terdaftar sebagai akun aktif
        if (!empty($validated['email']) && User::where('email', $validated['email'])->exists()) {
            return ApiResponse::error(
                'IDENTITY_EMAIL_ALREADY_REGISTERED',
                'Email ini sudah terdaftar. Silakan login atau gunakan reset password.',
                409
            );
        }

        if (!empty($validated['phone']) && User::where('phone_e164', $validated['phone'])->exists()) {
            return ApiResponse::error(
                'IDENTITY_EMAIL_ALREADY_REGISTERED',
                'Nomor telepon ini sudah terdaftar.',
                409
            );
        }

        $regType = $validated['registration_type'] ?? 'CUSTOMER';

        $user = DB::transaction(function () use ($validated, $regType) {
            $user = User::create([
                'email' => $validated['email'] ?? null,
                'phone_e164' => $validated['phone'] ?? null,
                'password_hash' => Hash::make($validated['password']),
                'status' => 'VERIFICATION_REQUIRED',
                'authz_version' => 1,
            ]);

            UserProfile::create([
                'user_id' => $user->id,
                'display_name' => $validated['name'],
                'photo_path' => '/brand/logo.png',
                'locale' => 'id_ID',
            ]);

            // If Customer, grant CUSTOMER role in restricted/pending status
            if ($regType === 'CUSTOMER') {
                $customerRole = Role::where('code', 'CUSTOMER')->first();
                if ($customerRole) {
                    RoleAssignment::create([
                        'user_id' => $user->id,
                        'role_id' => $customerRole->id,
                        'status' => 'ACTIVE',
                        'assigned_at' => now(),
                    ]);
                }
            }

            // Create initial OTP challenge for account verification
            $destination = $validated['email'] ?? $validated['phone'];
            OtpService::createChallenge($user->id, $destination, 'ACCOUNT_VERIFICATION');

            AuditService::log(
                $user->id,
                'IDENTITY_USER_REGISTERED',
                'user',
                $user->id,
                'SUCCESS',
                ['type' => $regType]
            );

            OutboxService::publish(
                'user',
                $user->id,
                'identity.user.registered.v1',
                ['user_id' => $user->id, 'type' => $regType, 'status' => 'VERIFICATION_REQUIRED']
            );

            return $user;
        });

        $responseData = [
            'success' => true,
            'code' => 'IDENTITY_REGISTRATION_CREATED',
            'data' => [
                'user_id' => $user->id,
                'status' => 'VERIFICATION_REQUIRED',
                'next_step' => 'VERIFY_OTP',
                'user' => [
                    'id' => $user->id,
                    'fullName' => $user->profile?->display_name ?? $validated['name'],
                    'email' => $user->email,
                    'phone' => $user->phone_e164,
                    'status' => 'VERIFICATION_REQUIRED',
                    'role' => $regType,
                ],
                'verification' => [
                    'id' => (string) Str::uuid(),
                    'type' => !empty($user->email) ? 'EMAIL_VERIFICATION' : 'PHONE_VERIFICATION',
                    'destination' => $user->email ?? $user->phone_e164,
                ],
            ],
            'meta' => [
                'request_id' => $request->header('X-Request-Id', (string) Str::uuid()),
                'version' => 'v1',
            ],
        ];

        if ($idempotencyKey) {
            IdempotencyService::record('auth.register', $idempotencyKey, $request->all(), 201, $responseData, $user->id);
        }

        return response()->json($responseData, 201);
    }

    /**
     * A02: Login
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'identifier' => 'nullable|string',
            'email' => 'nullable|string',
            'password' => 'required|string',
        ]);

        $identifier = $validated['identifier'] ?? $validated['email'] ?? '';
        if (empty($identifier)) {
            return ApiResponse::error(
                'IDENTITY_VALIDATION_FAILED',
                'Identifier (email/telepon) wajib diisi.',
                422,
                ['identifier' => ['Identifier wajib diisi.']]
            );
        }

        // Bersihkan pendaftar kadaluarsa (> 1 jam belum verifikasi)
        User::cleanupUnverifiedExpiredUsers(1);

        $user = User::where('email', $identifier)
            ->orWhere('phone_e164', $identifier)
            ->first();

        if (!$user) {
            return ApiResponse::error(
                'IDENTITY_INVALID_CREDENTIALS',
                'Email atau kata sandi salah. Silakan periksa kembali.',
                401
            );
        }

        if ($user->status === 'VERIFICATION_REQUIRED') {
            return ApiResponse::error(
                'IDENTITY_VERIFICATION_REQUIRED',
                'Akun Anda belum aktif. Silakan masukkan kode OTP yang telah dikirim ke email Anda untuk menyelesaikan pendaftaran.',
                403
            );
        }

        if ($user->status === 'SUSPENDED') {
            return ApiResponse::error(
                'IDENTITY_ACCOUNT_SUSPENDED',
                'Akun Anda sedang ditangguhkan. Hubungi tim dukungan untuk informasi lebih lanjut.',
                403
            );
        }

        // Verify password strictly against database hash
        $passwordValid = Hash::check($validated['password'], $user->password_hash);

        if (!$passwordValid) {
            AuditService::log(
                $user->id,
                'IDENTITY_LOGIN_FAILED',
                'user',
                $user->id,
                'FAILED',
                ['reason' => 'wrong_password']
            );

            return ApiResponse::error(
                'IDENTITY_INVALID_CREDENTIALS',
                'Email atau kata sandi salah. Silakan periksa kembali.',
                401
            );
        }

        // Generate session
        $token = 'servio_' . Str::random(40);
        $primaryRoleAssignment = $user->roleAssignments()
            ->where('status', 'ACTIVE')
            ->with(['role', 'membership'])
            ->first();

        $authSession = AuthSession::create([
            'session_id' => $token,
            'user_id' => $user->id,
            'active_role_assignment_id' => $primaryRoleAssignment?->id,
            'active_organization_id' => $primaryRoleAssignment?->membership?->organization_id,
            'device_name' => $request->userAgent() ?? 'Web Browser',
            'created_ip' => $request->ip(),
            'last_seen_at' => now(),
        ]);

        $user->last_login_at = now();
        $user->save();

        Auth::login($user);

        AuditService::log(
            $user->id,
            'IDENTITY_LOGIN_SUCCESS',
            'auth_session',
            $authSession->id,
            'SUCCESS'
        );

        $contextData = $this->buildUserContext($user, $authSession);
        $contextData['token'] = $token;
        $contextData['session'] = [
            'id' => $authSession->id,
            'expires_at' => now()->addMinutes(120)->toIso8601String(),
        ];

        return ApiResponse::success($contextData, 'IDENTITY_LOGIN_SUCCESS', 200);
    }

    /**
     * A08: Get Current Context (/auth/me)
     */
    public function me(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return ApiResponse::error('IDENTITY_AUTH_UNAUTHENTICATED', 'Unauthenticated', 401);
        }

        $session = $request->attributes->get('auth_session')
            ?? AuthSession::where('user_id', $user->id)->whereNull('revoked_at')->latest('last_seen_at')->first();

        $context = $this->buildUserContext($user, $session);
        return ApiResponse::success($context, 'IDENTITY_CONTEXT_LOADED', 200);
    }

    /**
     * A09: Switch Context (/auth/context)
     */
    public function switchContext(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'role_assignment_id' => 'required|string',
            'organization_id' => 'nullable|string',
        ]);

        $assignment = RoleAssignment::where('id', $validated['role_assignment_id'])
            ->where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->with(['role', 'membership.organization'])
            ->first();

        if (!$assignment) {
            return ApiResponse::error(
                'IDENTITY_PERMISSION_DENIED',
                'Role assignment tidak valid atau tidak aktif untuk akun ini.',
                403
            );
        }

        // Validate membership & organization if scoped
        if ($assignment->membership_id) {
            $membership = $assignment->membership;
            if (!$membership || $membership->status !== 'ACTIVE') {
                return ApiResponse::error(
                    'IDENTITY_PERMISSION_DENIED',
                    'Keanggotaan organisasi terkait tidak aktif.',
                    403
                );
            }
            if ($membership->organization?->status !== 'ACTIVE') {
                return ApiResponse::error(
                    'IDENTITY_PERMISSION_DENIED',
                    'Organisasi terkait sedang tidak aktif.',
                    403
                );
            }
        }

        $session = $request->attributes->get('auth_session')
            ?? AuthSession::where('user_id', $user->id)->whereNull('revoked_at')->latest('last_seen_at')->first();

        if ($session) {
            $session->active_role_assignment_id = $assignment->id;
            $session->active_organization_id = $assignment->membership?->organization_id;
            $session->last_seen_at = now();
            $session->save();
        }

        $user->authz_version++;
        $user->save();

        AuditService::log(
            $user->id,
            'IDENTITY_CONTEXT_SWITCHED',
            'role_assignment',
            $assignment->id,
            'SUCCESS',
            ['role' => $assignment->role->code]
        );

        $context = $this->buildUserContext($user, $session);
        return ApiResponse::success($context, 'IDENTITY_CONTEXT_SWITCHED', 200);
    }

    /**
     * A10: Logout (current session)
     */
    public function logout(Request $request)
    {
        $user = Auth::user();
        if ($user) {
            $session = $request->attributes->get('auth_session');
            if ($session) {
                $session->revoked_at = now();
                $session->save();
            } else {
                AuthSession::where('user_id', $user->id)
                    ->whereNull('revoked_at')
                    ->latest('last_seen_at')
                    ->limit(1)
                    ->update(['revoked_at' => now()]);
            }

            AuditService::log($user->id, 'IDENTITY_LOGOUT', 'user', $user->id, 'SUCCESS');
            Auth::logout();
        }

        return response()->noContent();
    }

    /**
     * A11: Logout All Sessions
     */
    public function logoutAll(Request $request)
    {
        $user = Auth::user();
        if ($user) {
            AuthSession::where('user_id', $user->id)
                ->whereNull('revoked_at')
                ->update(['revoked_at' => now()]);

            $user->authz_version++;
            $user->save();

            AuditService::log($user->id, 'IDENTITY_LOGOUT_ALL', 'user', $user->id, 'SUCCESS');
            OutboxService::publish('user', $user->id, 'identity.security.sessions_revoked.v1', [
                'user_id' => $user->id,
                'reason' => 'user_logout_all',
                'authz_version' => $user->authz_version,
            ]);

            Auth::logout();
        }

        return response()->noContent();
    }

    /**
     * A12: List Sessions
     */
    public function sessions(Request $request)
    {
        $user = Auth::user();
        $sessions = AuthSession::where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->orderBy('last_seen_at', 'desc')
            ->get()
            ->map(function ($s) {
                return [
                    'id' => $s->id,
                    'device_name' => $s->device_name,
                    'created_ip' => $s->created_ip,
                    'last_seen_at' => $s->last_seen_at?->toIso8601String(),
                    'created_at' => $s->created_at?->toIso8601String(),
                    'current' => false,
                ];
            });

        return ApiResponse::success(['items' => $sessions, 'has_more' => false], 'IDENTITY_SESSIONS_LIST', 200);
    }

    /**
     * A13: Revoke Session
     */
    public function revokeSession(Request $request, string $sessionId)
    {
        $user = Auth::user();
        $session = AuthSession::where('id', $sessionId)
            ->where('user_id', $user->id)
            ->first();

        if (!$session) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Sesi tidak ditemukan.', 404);
        }

        $session->revoked_at = now();
        $session->save();

        AuditService::log($user->id, 'IDENTITY_SESSION_REVOKED', 'auth_session', $session->id, 'SUCCESS');
        return response()->noContent();
    }

    /**
     * A14: Forgot Password
     */
    public function forgotPassword(Request $request)
    {
        $validated = $request->validate([
            'identifier' => 'nullable|string',
            'email' => 'nullable|string',
        ]);

        $identifier = $validated['identifier'] ?? $validated['email'] ?? '';
        $user = User::where('email', $identifier)->orWhere('phone_e164', $identifier)->first();

        if ($user && $user->status !== 'SUSPENDED') {
            $dest = $user->email ?? $user->phone_e164;
            OtpService::createChallenge($user->id, $dest, 'PASSWORD_RESET');
        }

        // Generic anti-enumeration response
        return ApiResponse::success([
            'status' => 'ACCEPTED',
            'message' => 'Jika akun terdaftar, kode pemulihan telah dikirimkan.',
        ], 'IDENTITY_ACCEPTED', 202);
    }

    /**
     * A15: Reset Password
     */
    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'reset_grant' => 'nullable|string',
            'token' => 'nullable|string',
            'new_password' => 'nullable|string|min:8',
            'password' => 'nullable|string|min:8',
            'confirm_password' => 'nullable|string',
            'password_confirmation' => 'nullable|string',
        ]);

        $grantToken = $validated['reset_grant'] ?? $validated['token'] ?? '';
        $newPassword = $validated['new_password'] ?? $validated['password'] ?? '';

        if (empty($grantToken) || empty($newPassword)) {
            return ApiResponse::error('IDENTITY_VALIDATION_FAILED', 'Token dan kata sandi baru wajib diisi.', 422);
        }

        $grantHash = hash('sha256', $grantToken);
        $grant = PasswordResetGrant::where('grant_token_hash', $grantHash)
            ->whereNull('consumed_at')
            ->first();

        if (!$grant || $grant->expires_at < now()) {
            return ApiResponse::error(
                'IDENTITY_INVITATION_EXPIRED',
                'Token pemulihan kata sandi tidak valid atau telah kedaluwarsa.',
                410
            );
        }

        $user = User::find($grant->user_id);
        if (!$user) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Pengguna tidak ditemukan.', 404);
        }

        $user->password_hash = Hash::make($newPassword);
        $user->authz_version++;
        $user->save();

        $grant->consumed_at = now();
        $grant->save();

        // Invalidate all prior sessions
        AuthSession::where('user_id', $user->id)->whereNull('revoked_at')->update(['revoked_at' => now()]);

        AuditService::log($user->id, 'IDENTITY_PASSWORD_RESET', 'user', $user->id, 'SUCCESS');

        return ApiResponse::success([
            'user_id' => $user->id,
            'status' => $user->status,
            'message' => 'Kata sandi berhasil diperbarui. Silakan login kembali.',
        ], 'IDENTITY_PASSWORD_RESET_SUCCESS', 200);
    }

    /**
     * A16: Password Change (Authenticated)
     */
    public function changePassword(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8',
            'confirm_password' => 'nullable|string',
        ]);

        if (!Hash::check($validated['current_password'], $user->password_hash)) {
            return ApiResponse::error('IDENTITY_INVALID_CREDENTIALS', 'Kata sandi lama salah.', 422);
        }

        $user->password_hash = Hash::make($validated['new_password']);
        $user->authz_version++;
        $user->save();

        // Revoke other sessions
        $currentSessionId = $request->attributes->get('auth_session')?->id;
        AuthSession::where('user_id', $user->id)
            ->where('id', '!=', $currentSessionId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        AuditService::log($user->id, 'IDENTITY_PASSWORD_CHANGED', 'user', $user->id, 'SUCCESS');

        return ApiResponse::success([
            'user_id' => $user->id,
            'message' => 'Kata sandi berhasil diubah.',
        ], 'IDENTITY_PASSWORD_CHANGED', 200);
    }

    /**
     * A17: Onboarding Status
     */
    public function onboardingStatus(Request $request)
    {
        $user = Auth::user();
        $status = [
            'account_status' => $user->status,
            'email_verified' => $user->email_verified_at !== null,
            'phone_verified' => $user->phone_verified_at !== null,
            'next_step' => $user->status === 'ACTIVE' ? 'DASHBOARD' : 'VERIFY_IDENTITY',
        ];

        return ApiResponse::success($status, 'IDENTITY_ONBOARDING_STATUS', 200);
    }

    /**
     * A18: Account Deactivation Request
     */
    public function deactivateRequest(Request $request)
    {
        $user = Auth::user();
        $user->status = 'DEACTIVATED';
        $user->save();

        AuthSession::where('user_id', $user->id)->whereNull('revoked_at')->update(['revoked_at' => now()]);

        AuditService::log($user->id, 'IDENTITY_ACCOUNT_DEACTIVATED', 'user', $user->id, 'SUCCESS');

        return ApiResponse::success([
            'status' => 'DEACTIVATED',
            'message' => 'Permintaan penonaktifan akun telah diproses.',
        ], 'IDENTITY_DEACTIVATED', 200);
    }

    /**
     * Helper to assemble unified USER_CONTEXT according to Spec §4.2
     */
    private function buildUserContext(User $user, ?AuthSession $session): array
    {
        $profile = $user->profile;
        $activeAssignment = null;
        if ($session && $session->active_role_assignment_id) {
            $activeAssignment = RoleAssignment::where('id', $session->active_role_assignment_id)
                ->where('status', 'ACTIVE')
                ->with(['role', 'membership.organization.profile'])
                ->first();
        }

        if (!$activeAssignment) {
            $activeAssignment = $user->roleAssignments()
                ->where('status', 'ACTIVE')
                ->with(['role', 'membership.organization.profile'])
                ->first();
        }

        $allAssignments = $user->roleAssignments()
            ->where('status', 'ACTIVE')
            ->with(['role', 'membership.organization.profile'])
            ->get();

        $rolesList = $allAssignments->map(function ($ra) {
            return [
                'assignmentId' => $ra->id,
                'assignment_id' => $ra->id,
                'code' => $ra->role->code,
                'name' => $ra->role->name,
                'organization_id' => $ra->membership?->organization_id,
                'organizationId' => $ra->membership?->organization_id,
                'organization_name' => $ra->membership?->organization?->profile?->display_name,
                'membership_status' => $ra->membership?->status,
                'scopeType' => $ra->membership_id ? 'ORGANIZATION' : 'OWN',
                'status' => $ra->status,
            ];
        })->values()->all();

        // Permissions for active role
        $permissions = [];
        if ($activeAssignment) {
            $permissions = $activeAssignment->role->permissions()->pluck('code')->all();
        }

        $activeRoleContext = [
            'role_assignment_id' => $activeAssignment?->id,
            'assignmentId' => $activeAssignment?->id,
            'assignment_id' => $activeAssignment?->id,
            'role' => $activeAssignment?->role?->code ?? 'CUSTOMER',
            'code' => $activeAssignment?->role?->code ?? 'CUSTOMER',
            'scopeType' => $activeAssignment?->membership_id ? 'ORGANIZATION' : 'OWN',
            'organization_id' => $activeAssignment?->membership?->organization_id,
            'organizationId' => $activeAssignment?->membership?->organization_id,
        ];

        $userObj = [
            'id' => $user->id,
            'fullName' => $profile?->display_name ?? 'Pengguna SERVIO',
            'email' => $user->email,
            'phone' => $user->phone_e164,
            'status' => $user->status,
            'role' => $activeAssignment?->role?->code ?? 'CUSTOMER',
            'employeeId' => $profile?->employee_id,
            'department' => $profile?->department,
            'avatar' => $profile?->photo_path ?? '/brand/logo.png',
            'avatarUrl' => $profile?->photo_path ?? '/brand/logo.png',
            'emailVerified' => $user->email_verified_at !== null,
            'phoneVerified' => $user->phone_verified_at !== null,
            'staffOnboardingStatus' => $user->staffOnboarding?->status ?? ($user->status === 'ACTIVE' ? 'COMPLETED' : 'INVITED'),
            'staff_onboarding_status' => $user->staffOnboarding?->status ?? ($user->status === 'ACTIVE' ? 'COMPLETED' : 'INVITED'),
            'readiness' => ($user->status === 'ACTIVE' && in_array($user->staffOnboarding?->status ?? ($user->status === 'ACTIVE' ? 'COMPLETED' : 'INVITED'), ['COMPLETED', 'OPERATIONAL_READY'])) ? 'READY' : 'NOT_READY',
            'isOperationalReady' => ($user->status === 'ACTIVE' && in_array($user->staffOnboarding?->status ?? ($user->status === 'ACTIVE' ? 'COMPLETED' : 'INVITED'), ['COMPLETED', 'OPERATIONAL_READY'])),
            'is_operational_ready' => ($user->status === 'ACTIVE' && in_array($user->staffOnboarding?->status ?? ($user->status === 'ACTIVE' ? 'COMPLETED' : 'INVITED'), ['COMPLETED', 'OPERATIONAL_READY'])),
        ];

        $staffStatus = $user->staffOnboarding?->status ?? ($user->status === 'ACTIVE' ? 'COMPLETED' : 'INVITED');
        $isOperationalReady = ($user->status === 'ACTIVE' && in_array($staffStatus, ['COMPLETED', 'OPERATIONAL_READY']));
        $readiness = $isOperationalReady ? 'READY' : 'NOT_READY';

        return [
            // Flat root attributes for direct destructuring
            'id' => $user->id,
            'fullName' => $profile?->display_name ?? 'Pengguna SERVIO',
            'email' => $user->email,
            'phone' => $user->phone_e164,
            'status' => $user->status,
            'role' => $activeAssignment?->role?->code ?? 'CUSTOMER',
            'employeeId' => $profile?->employee_id,
            'department' => $profile?->department,
            'avatar' => $profile?->photo_path ?? '/brand/logo.png',
            'avatarUrl' => $profile?->photo_path ?? '/brand/logo.png',
            'emailVerified' => $user->email_verified_at !== null,
            'phoneVerified' => $user->phone_verified_at !== null,
            'staffOnboardingStatus' => $staffStatus,
            'staff_onboarding_status' => $staffStatus,
            'readiness' => $readiness,
            'isOperationalReady' => $isOperationalReady,
            'is_operational_ready' => $isOperationalReady,
            // Nested user object per API spec
            'user' => $userObj,
            'roles' => $rolesList,
            'activeRole' => $activeRoleContext,
            'active_context' => $activeRoleContext,
            'permissions' => $permissions,
            'onboarding' => [
                'kind' => $activeAssignment?->role?->code ?? 'CUSTOMER',
                'status' => $user->status === 'ACTIVE' ? 'COMPLETE' : 'INCOMPLETE',
            ],
            'authorization_version' => $user->authz_version,
        ];
    }
}
