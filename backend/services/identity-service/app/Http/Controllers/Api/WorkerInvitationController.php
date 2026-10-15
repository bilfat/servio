<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\AuditService;
use App\Services\BrevoService;
use App\Services\IdempotencyService;
use App\Services\OutboxService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class WorkerInvitationController extends Controller
{
    /**
     * W01: List Provider Workers
     */
    public function listWorkers(Request $request)
    {
        $user = Auth::user();
        $providerMembership = Membership::where('user_id', $user->id)
            ->where('kind', 'OWNER')
            ->where('status', 'ACTIVE')
            ->whereHas('organization', fn($q) => $q->where('type', 'PROVIDER'))
            ->first();

        if (!$providerMembership) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Hanya mitra penyedia jasa (Provider) yang memiliki daftar teknisi.', 403);
        }

        $workers = Membership::where('organization_id', $providerMembership->organization_id)
            ->where('kind', 'WORKER')
            ->with(['user.profile', 'organization.profile'])
            ->get()
            ->map(function ($m) {
                $profile = $m->user?->profile;
                $empId = $profile?->employee_id;
                if (empty($empId)) {
                    $empId = $this->generateWorkerEmployeeId(
                        $m->organization_id, 
                        $profile?->display_name ?? $m->user?->name ?? 'Teknisi'
                    );
                    if ($profile) {
                        $profile->employee_id = $empId;
                        $profile->save();
                    }
                }

                return [
                    'id' => $m->id,
                    'workerId' => $m->id,
                    'membership_id' => $m->id,
                    'userId' => $m->user_id,
                    'user_id' => $m->user_id,
                    'name' => $profile?->display_name ?? 'Teknisi',
                    'fullName' => $profile?->display_name ?? 'Teknisi',
                    'display_name' => $profile?->display_name ?? 'Teknisi',
                    'employeeId' => $empId,
                    'employee_id' => $empId,
                    'workerCode' => $empId,
                    'email' => $m->user?->email,
                    'phone' => $m->user?->phone_e164,
                    'status' => $m->status,
                    'active' => $m->status === 'ACTIVE',
                    'role' => 'WORKER_TECHNICIAN',
                    'started_at' => $m->started_at?->toIso8601String(),
                ];
            });

        return ApiResponse::success(['items' => $workers, 'workers' => $workers, 'has_more' => false], 'IDENTITY_WORKERS_LIST', 200);
    }

    /**
     * W02: Get Worker Detail
     */
    public function getWorker(Request $request, string $membershipId)
    {
        $user = Auth::user();
        $providerMembership = Membership::where('user_id', $user->id)
            ->where('kind', 'OWNER')
            ->where('status', 'ACTIVE')
            ->first();

        $worker = Membership::where('id', $membershipId)
            ->where('organization_id', $providerMembership?->organization_id)
            ->where('kind', 'WORKER')
            ->with(['user.profile', 'organization.profile'])
            ->first();

        if (!$worker) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Teknisi tidak ditemukan pada bengkel Anda.', 404);
        }

        $profile = $worker->user?->profile;
        $empId = $profile?->employee_id;
        if (empty($empId)) {
            $empId = $this->generateWorkerEmployeeId(
                $worker->organization_id, 
                $profile?->display_name ?? $worker->user?->name ?? 'Teknisi'
            );
            if ($profile) {
                $profile->employee_id = $empId;
                $profile->save();
            }
        }

        return ApiResponse::success([
            'id' => $worker->id,
            'workerId' => $worker->id,
            'membership_id' => $worker->id,
            'user_id' => $worker->user_id,
            'userId' => $worker->user_id,
            'fullName' => $profile?->display_name ?? 'Teknisi',
            'display_name' => $profile?->display_name,
            'employeeId' => $empId,
            'employee_id' => $empId,
            'workerCode' => $empId,
            'email' => $worker->user?->email,
            'phone' => $worker->user?->phone_e164,
            'status' => $worker->status,
            'active' => $worker->status === 'ACTIVE',
            'role' => 'WORKER_TECHNICIAN',
            'started_at' => $worker->started_at?->toIso8601String(),
        ], 'IDENTITY_WORKER_LOADED', 200);
    }

    /**
     * W03: Invite Worker
     */
    public function inviteWorker(Request $request)
    {
        $user = Auth::user();
        $recipientEmail = $request->input('recipient_email') ?? $request->input('email');
        if (!$recipientEmail) {
            return ApiResponse::error('IDENTITY_INVALID_INPUT', 'Email penerima undangan wajib disertakan.', 422);
        }

        $providerMembership = Membership::where('user_id', $user->id)
            ->where('kind', 'OWNER')
            ->where('status', 'ACTIVE')
            ->first();

        $orgId = $request->input('organization_id') ?? $providerMembership?->organization_id;
        if (!$orgId) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Organisasi Provider tidak valid.', 403);
        }

        // Check if active invitation already exists for this email
        $existingInvite = Invitation::where('recipient_email', $recipientEmail)
            ->where('organization_id', $orgId)
            ->where('status', 'INVITED')
            ->where('expires_at', '>', now())
            ->first();

        if ($existingInvite) {
            return ApiResponse::error(
                'IDENTITY_INVITATION_ALREADY_USED',
                'Undangan aktif untuk email ini sudah ada.',
                409
            );
        }

        // Generate automatic Worker Employee ID from Store Initials & Worker Name
        $fullName = $request->input('fullName') ?? 'Teknisi';
        $generatedEmpId = $request->input('employeeId') ?: $this->generateWorkerEmployeeId($orgId, $fullName);

        // Create or find user account for the invited worker
        $workerUser = User::where('email', $recipientEmail)->first();
        if (!$workerUser) {
            $workerUser = User::create([
                'email' => $recipientEmail,
                'phone_e164' => $request->input('phone'),
                'password_hash' => Hash::make(Str::random(32)),
                'status' => 'PENDING',
                'authz_version' => 1,
            ]);
            UserProfile::create([
                'user_id' => $workerUser->id,
                'display_name' => $fullName,
                'employee_id' => $generatedEmpId,
                'locale' => 'id_ID',
            ]);
        } else {
            $profile = UserProfile::firstOrCreate(
                ['user_id' => $workerUser->id],
                ['display_name' => $fullName, 'locale' => 'id_ID']
            );
            if (empty($profile->employee_id)) {
                $profile->employee_id = $generatedEmpId;
                $profile->save();
            } else {
                $generatedEmpId = $profile->employee_id;
            }
        }

        $rawToken = Str::random(40);
        $tokenHash = hash('sha256', $rawToken);

        $invitation = Invitation::create([
            'kind' => 'WORKER',
            'issuer_user_id' => $user->id,
            'recipient_user_id' => $workerUser->id,
            'recipient_email' => $recipientEmail,
            'organization_id' => $orgId,
            'target_role' => 'WORKER_TECHNICIAN',
            'token_hash' => $tokenHash,
            'status' => 'INVITED',
            'expires_at' => now()->addHours(12),
        ]);

        // Send invite via Brevo
        BrevoService::sendOtpEmail($recipientEmail, $rawToken, 'WORKER_INVITATION');

        AuditService::log($user->id, 'IDENTITY_WORKER_INVITED', 'invitation', $invitation->id, 'SUCCESS');
        OutboxService::publish('invitation', $invitation->id, 'identity.invitation.created.v1', [
            'invitation_id' => $invitation->id,
            'recipient_email' => $invitation->recipient_email,
            'kind' => 'WORKER',
        ]);

        $org = Organization::with('profile')->find($orgId);
        $orgName = $org?->profile?->brand_name 
            ?? $org?->profile?->display_name 
            ?? $org?->profile?->legal_name 
            ?? 'Mitra Bengkel';

        return ApiResponse::success([
            'id' => $invitation->id,
            'worker_id' => $invitation->id,
            'fullName' => $fullName,
            'email' => $recipientEmail,
            'phone' => $request->input('phone') ?? $workerUser->phone_e164,
            'kind' => 'WORKER',
            'organization' => ['id' => $orgId, 'name' => $orgName],
            'status' => 'INVITED',
            'expires_at' => $invitation->expires_at->toIso8601String(),
            'invite_token' => $rawToken,
            'invitation_token' => $rawToken,
            'invitationToken' => $rawToken,
            'debugInvitationToken' => $rawToken,
            'invitation_path' => "/auth/invitation?token={$rawToken}",
            'invitationPath' => "/auth/invitation?token={$rawToken}",
            'invitation_url' => url("/auth/invitation?token={$rawToken}"),
            'invitationUrl' => url("/auth/invitation?token={$rawToken}"),
            'employee_id' => $generatedEmpId,
            'employeeId' => $generatedEmpId,
        ], 'IDENTITY_WORKER_INVITED', 201);
    }

    /**
     * W04: List Worker Invitations
     */
    public function listInvitations(Request $request)
    {
        $user = Auth::user();
        $providerMembership = Membership::where('user_id', $user->id)->where('kind', 'OWNER')->first();

        $invites = Invitation::where('organization_id', $providerMembership?->organization_id)
            ->where('kind', 'WORKER')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($i) => [
                'id' => $i->id,
                'recipient_email' => $i->recipient_email,
                'status' => $i->status,
                'expires_at' => $i->expires_at->toIso8601String(),
                'created_at' => $i->created_at?->toIso8601String(),
            ]);

        return ApiResponse::success(['items' => $invites, 'has_more' => false], 'IDENTITY_INVITATIONS_LIST', 200);
    }

    /**
     * W05: Resend Worker Invitation
     */
    public function resendInvitation(Request $request, string $id)
    {
        $user = Auth::user();
        $invite = Invitation::find($id);

        if (!$invite || $invite->status !== 'INVITED') {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Undangan tidak ditemukan atau telah kadaluwarsa.', 404);
        }

        $rawToken = Str::random(40);
        $invite->token_hash = hash('sha256', $rawToken);
        $invite->expires_at = now()->addHours(12);
        $invite->save();

        BrevoService::sendOtpEmail($invite->recipient_email, $rawToken, 'WORKER_INVITATION');
        AuditService::log($user->id, 'IDENTITY_INVITATION_RESENT', 'invitation', $invite->id, 'SUCCESS');

        return ApiResponse::success([
            'id' => $invite->id,
            'status' => 'INVITED',
            'expires_at' => $invite->expires_at->toIso8601String(),
            'invite_token' => $rawToken,
            'invitation_token' => $rawToken,
            'invitationToken' => $rawToken,
            'invitation_path' => "/auth/invitation?token={$rawToken}",
            'invitationPath' => "/auth/invitation?token={$rawToken}",
        ], 'IDENTITY_INVITATION_RESENT', 202);
    }

    /**
     * W06: Preview Invitation Token (Public)
     */
    public function previewInvitation(Request $request, string $token)
    {
        $cleanToken = $this->sanitizeToken($token);
        $tokenHash = hash('sha256', $cleanToken);
        $invite = Invitation::where('token_hash', $tokenHash)->with(['organization.profile', 'recipient.profile'])->first();

        if (!$invite || $invite->expires_at < now() || $invite->status !== 'INVITED') {
            return ApiResponse::error('IDENTITY_INVITATION_EXPIRED', 'Tautan undangan tidak valid atau telah kedaluwarsa.', 410);
        }

        $maskedEmail = substr($invite->recipient_email, 0, 2) . '***@' . explode('@', $invite->recipient_email)[1];

        $roleLabels = [
            'ADMIN_OPERATIONS' => 'Admin Operasional',
            'FINANCE_PAYMENT_OPS' => 'Finance & Payment Ops',
            'CUSTOMER_SUPPORT' => 'Customer Support',
            'CEO_PRODUCT_OWNER' => 'CEO & Product Owner',
            'WORKER_TECHNICIAN' => 'Teknisi Lapangan',
        ];
        $roleLabel = $roleLabels[$invite->target_role] ?? $invite->target_role;

        if ($invite->kind === 'STAFF') {
            $entityName = 'Staf Internal SERVIO';
            $entityLabel = 'Staf Internal';
            $workerName = $invite->recipient?->profile?->display_name ?? 'Staf Internal';
        } else {
            $entityName = $invite->organization?->profile?->brand_name 
                ?? $invite->organization?->profile?->display_name 
                ?? $invite->organization?->profile?->legal_name 
                ?? 'Mitra Bengkel';
            $entityLabel = 'Mitra Bengkel';
            $workerName = $invite->recipient?->profile?->display_name ?? 'Teknisi';
        }

        return ApiResponse::success([
            'kind' => $invite->kind,
            'organization_id' => $invite->organization_id,
            'organization_name' => $entityName,
            'entity_name' => $entityName,
            'entity_label' => $entityLabel,
            'worker_name' => $workerName,
            'recipient_name' => $workerName,
            'employee_id' => $invite->recipient?->profile?->employee_id,
            'phone' => $invite->recipient?->phone_e164,
            'masked_recipient' => $maskedEmail,
            'recipient_email' => $maskedEmail,
            'raw_email' => $invite->recipient_email,
            'target_role' => $invite->target_role,
            'role_name' => $roleLabel,
            'role_label' => $roleLabel,
            'expires_at' => $invite->expires_at->toIso8601String(),
            'token' => $cleanToken,
        ], 'IDENTITY_INVITATION_PREVIEW', 200);
    }

    /**
     * W07: Accept Invitation
     * Enforces Single Active Provider Worker invariant!
     */
    public function acceptInvitation(Request $request, string $token)
    {
        if (empty($token)) {
            $token = (string)($request->input('token') ?? $request->input('invitation_token') ?? '');
        }
        $cleanToken = $this->sanitizeToken($token);
        if (empty($cleanToken)) {
            return ApiResponse::error('IDENTITY_INVALID_INPUT', 'Token undangan wajib disertakan.', 422);
        }

        $tokenHash = hash('sha256', $cleanToken);

        return DB::transaction(function () use ($tokenHash, $request) {
            $invite = Invitation::lockForUpdate()->where('token_hash', $tokenHash)->first();

            if (!$invite || $invite->expires_at < now()) {
                return ApiResponse::error('IDENTITY_INVITATION_EXPIRED', 'Undangan tidak valid atau telah kedaluwarsa.', 410);
            }

            if ($invite->status === 'ACCEPTED') {
                return ApiResponse::error('IDENTITY_INVITATION_ALREADY_USED', 'Undangan ini telah digunakan sebelumnya dan kata sandi telah dibuat.', 410);
            }

            if ($invite->status !== 'INVITED') {
                return ApiResponse::error('IDENTITY_INVITATION_REVOKED', 'Undangan telah dibatalkan atau tidak aktif.', 410);
            }

            // Always resolve target user strictly from invitation record (prevent browser session hijacking)
            $targetUser = null;
            if ($invite->recipient_user_id) {
                $targetUser = User::find($invite->recipient_user_id);
            }
            if (!$targetUser && $invite->recipient_email) {
                $targetUser = User::where('email', $invite->recipient_email)->first();
            }
            if (!$targetUser) {
                $targetUser = User::create([
                    'email' => $invite->recipient_email,
                    'password_hash' => Hash::make(Str::random(32)),
                    'status' => 'ACTIVE',
                    'authz_version' => 1,
                ]);
            }

            $password = $request->input('password');
            if (!empty($password)) {
                if (strlen($password) < 8) {
                    return ApiResponse::error('IDENTITY_VALIDATION_FAILED', 'Kata sandi minimal 8 karakter.', 422);
                }
                $targetUser->password_hash = Hash::make($password);

                // CR-03: Dilarang menyimpan password asli/terdekripsi
                if ($targetUser->profile && $targetUser->profile->initial_password_ciphertext) {
                    $targetUser->profile->initial_password_ciphertext = null;
                    $targetUser->profile->save();
                }
            }

            $targetUser->status = 'ACTIVE';
            if (empty($targetUser->email_verified_at)) {
                $targetUser->email_verified_at = now();
            }
            $targetUser->save();
            $user = $targetUser;

            // Invariant check: Single active Provider Worker!
            if ($invite->kind === 'WORKER') {
                $hasActiveWorker = Membership::where('user_id', $user->id)
                    ->where('kind', 'WORKER')
                    ->where('status', 'ACTIVE')
                    ->exists();

                if ($hasActiveWorker) {
                    return ApiResponse::error(
                        'IDENTITY_WORKER_ACTIVE_PROVIDER_CONFLICT',
                        'Teknisi sudah memiliki afiliasi bengkel aktif lainnya. Satu teknisi hanya dapat aktif di satu bengkel.',
                        409
                    );
                }
            }

            // Accept invitation & permanently burn temporary encrypted token (CR-03 Section B)
            $invite->status = 'ACCEPTED';
            $invite->accepted_at = now();
            $invite->encrypted_token = null;
            $invite->recipient_user_id = $user->id;
            $invite->save();

            $membership = null;
            if (!empty($invite->organization_id)) {
                $membership = Membership::create([
                    'user_id' => $user->id,
                    'organization_id' => $invite->organization_id,
                    'kind' => $invite->kind,
                    'status' => 'ACTIVE',
                    'invitation_id' => $invite->id,
                    'started_at' => now(),
                ]);
            }

            // Assign or activate role
            $role = Role::where('code', $invite->target_role)->first();
            if ($role) {
                $existingRa = RoleAssignment::where('user_id', $user->id)->where('role_id', $role->id)->first();
                if (!$existingRa) {
                    RoleAssignment::create([
                        'user_id' => $user->id,
                        'role_id' => $role->id,
                        'membership_id' => $membership?->id,
                        'status' => 'ACTIVE',
                        'assigned_at' => now(),
                    ]);
                } else {
                    $existingRa->status = 'ACTIVE';
                    if ($membership) {
                        $existingRa->membership_id = $membership->id;
                    }
                    $existingRa->save();
                }
            }

            // If staff onboarding aggregate exists, advance it to IN_PROGRESS (CR-03 Section E)
            if ($invite->kind === 'STAFF') {
                $onboarding = \App\Models\StaffOnboarding::where('staff_user_id', $user->id)->first();
                if ($onboarding && in_array($onboarding->status, ['INVITED', 'CANCELLED'])) {
                    $onboarding->status = 'IN_PROGRESS';
                    $onboarding->save();
                }
            }

            // Update personal profile fields if provided during invitation acceptance (Worker quick onboarding)
            $profile = UserProfile::firstOrCreate(
                ['user_id' => $user->id],
                ['display_name' => $invite->recipient?->profile?->display_name ?? 'Teknisi', 'locale' => 'id_ID']
            );
            if ($request->filled('display_name') || $request->filled('fullName') || $request->filled('full_name')) {
                $profile->display_name = $request->input('display_name') ?? $request->input('fullName') ?? $request->input('full_name');
            }
            if ($request->filled('gender')) {
                $profile->gender = $request->input('gender');
            }
            if ($request->filled('birth_date')) {
                $profile->birth_date = $request->input('birth_date');
            }
            if ($request->filled('photo_path')) {
                $profile->photo_path = $request->input('photo_path');
            }
            if ($request->filled('phone') && (empty($user->phone_e164) || $user->phone_e164 !== $request->input('phone'))) {
                $user->phone_e164 = $request->input('phone');
                $user->save();
            }
            $profile->save();

            if ($request->boolean('sop_agreed')) {
                AuditService::log($user->id, 'IDENTITY_WORKER_SOP_ACCEPTED', 'user', $user->id, 'SUCCESS');
            }

            $user->authz_version++;
            $user->save();

            AuditService::log($user->id, 'IDENTITY_INVITATION_ACCEPTED', 'invitation', $invite->id, 'SUCCESS');
            if ($membership) {
                OutboxService::publish('membership', $membership->id, 'identity.membership.activated.v1', [
                    'membership_id' => $membership->id,
                    'user_id' => $user->id,
                    'organization_id' => $membership->organization_id,
                    'kind' => $membership->kind,
                ]);
            } else {
                OutboxService::publish('staff', $user->id, 'identity.staff.activated.v1', [
                    'user_id' => $user->id,
                    'target_role' => $invite->target_role,
                ]);
            }

            $redirectUrl = $invite->kind === 'WORKER' ? '/worker/profile' : '/auth/login';

            return ApiResponse::success([
                'kind' => $invite->kind,
                'user_id' => $user->id,
                'membership_id' => $membership?->id,
                'next_step' => 'COMPLETE_PROFILE_IF_REQUIRED',
                'redirect_url' => $redirectUrl,
            ], 'IDENTITY_INVITATION_ACCEPTED', 200);
        });
    }

    /**
     * W08: Deactivate Worker Membership
     */
    public function deactivateWorker(Request $request, string $membershipId)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'reason' => 'required|string',
        ]);

        $providerMembership = Membership::where('user_id', $user->id)
            ->where('kind', 'OWNER')
            ->where('status', 'ACTIVE')
            ->first();

        return DB::transaction(function () use ($membershipId, $providerMembership, $user, $validated) {
            $workerMembership = Membership::lockForUpdate()
                ->where('id', $membershipId)
                ->where('organization_id', $providerMembership?->organization_id)
                ->first();

            if (!$workerMembership) {
                return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Keanggotaan teknisi tidak ditemukan.', 404);
            }

            $workerMembership->status = 'DEACTIVATED';
            $workerMembership->ended_at = now();
            $workerMembership->save();

            // Revoke role assignments bound to this membership
            RoleAssignment::where('membership_id', $workerMembership->id)
                ->update(['status' => 'REVOKED', 'revoked_at' => now(), 'reason' => $validated['reason']]);

            // Invalidate worker's authz_version
            $workerUser = User::find($workerMembership->user_id);
            if ($workerUser) {
                $workerUser->authz_version++;
                $workerUser->save();
            }

            AuditService::log(
                $user->id,
                'IDENTITY_WORKER_DEACTIVATED',
                'membership',
                $workerMembership->id,
                'SUCCESS',
                ['reason' => $validated['reason']]
            );

            OutboxService::publish('membership', $workerMembership->id, 'identity.membership.revoked.v1', [
                'membership_id' => $workerMembership->id,
                'user_id' => $workerMembership->user_id,
                'organization_id' => $workerMembership->organization_id,
                'authz_version' => $workerUser?->authz_version ?? 1,
            ]);

            return ApiResponse::success([
                'membership_id' => $workerMembership->id,
                'status' => 'DEACTIVATED',
            ], 'IDENTITY_WORKER_DEACTIVATED', 200);
        });
    }

    /**
     * Generate automatic Worker Employee ID using format: [Inisial Toko]-[Nama Worker]-[Random]
     * Contoh: BTM-NABIL-7K2
     */
    protected function generateWorkerEmployeeId(?string $orgId, string $workerName): string
    {
        $org = $orgId ? Organization::with('profile')->find($orgId) : null;
        $storeName = $org?->profile?->brand_name 
            ?? $org?->profile?->display_name 
            ?? $org?->profile?->legal_name 
            ?? 'BENGKEL';

        // Filter common business prefixes
        $cleanedStore = trim(preg_replace('/\b(PT|CV|UD|PD|TBK)\b/i', '', $storeName));
        if (empty($cleanedStore)) {
            $cleanedStore = $storeName;
        }

        // Generate store initials from words
        $words = preg_split('/[\s_-]+/', trim($cleanedStore));
        $initials = '';
        foreach ($words as $w) {
            $letters = preg_replace('/[^A-Za-z0-9]/', '', $w);
            if (!empty($letters)) {
                $initials .= strtoupper($letters[0]);
            }
        }
        if (strlen($initials) < 2) {
            $initials = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $cleanedStore), 0, 3));
        }
        if (empty($initials)) {
            $initials = 'WRK';
        }

        // Clean worker first name (uppercase, alphanumeric only, max 8 chars)
        $firstWord = explode(' ', trim($workerName))[0] ?? 'TEKNISI';
        $workerClean = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $firstWord), 0, 8));
        if (empty($workerClean)) {
            $workerClean = 'TEKNISI';
        }

        // Random 3 alphanumeric code
        $randomCode = strtoupper(Str::random(3));

        return "{$initials}-{$workerClean}-{$randomCode}";
    }

    /**
     * Clean and extract raw invitation token from URL or query string if pasted
     */
    protected function sanitizeToken(?string $token): string
    {
        if (empty($token)) {
            return '';
        }
        $token = trim($token);
        if (str_contains($token, 'token=')) {
            if (preg_match('/token=([a-zA-Z0-9_\-\.]+)/', $token, $matches)) {
                return $matches[1];
            }
        }
        return $token;
    }
}

