<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApplicationDecision;
use App\Models\ApplicationDocument;
use App\Models\ApplicationRevision;
use App\Models\AuthSession;
use App\Models\BusinessApplication;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\OrganizationProfile;
use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\AuditService;
use App\Services\IdempotencyService;
use App\Services\OutboxService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BusinessApplicationController extends Controller
{
    /**
     * B01: Create Business Application (Draft)
     */
    public function createApplication(Request $request)
    {
        // Bersihkan akun unverified yang tidak memasukkan OTP lebih dari 1 jam
        User::cleanupUnverifiedExpiredUsers(1);

        $idempotencyKey = $request->header('Idempotency-Key');
        if ($idempotencyKey) {
            $cached = IdempotencyService::check('business.create', $idempotencyKey, $request->all(), Auth::id());
            if ($cached) {
                return response()->json($cached->response_json, $cached->response_status);
            }
        }

        $user = $this->resolveUser($request);

        $sessionToken = null;

        // Support unauthenticated business registration wizard (via account or picData)
        if (!$user && ($request->has('account') || $request->has('picData') || $request->has('pic'))) {
            $acc = $request->input('account') ?? $request->input('picData') ?? $request->input('pic');
            $userEmail = $acc['email'] ?? null;
            if ($userEmail) {
                $user = User::where('email', $userEmail)->first();
                if (!$user) {
                    $user = User::create([
                        'email' => $userEmail,
                        'phone_e164' => $acc['phone'] ?? null,
                        'password_hash' => Hash::make($acc['password'] ?? Str::random(16)),
                        'status' => 'PENDING',
                        'authz_version' => 1,
                    ]);
                    UserProfile::create([
                        'user_id' => $user->id,
                        'display_name' => $acc['fullName'] ?? 'Pemohon Bisnis',
                        'locale' => 'id_ID',
                    ]);
                }

                // Issue session token so subsequent requests from wizard are authenticated
                $sessionToken = 'servio_' . Str::random(40);
                AuthSession::create([
                    'session_id' => $sessionToken,
                    'user_id' => $user->id,
                    'device_name' => $request->userAgent() ?? 'Frontend Web',
                    'created_ip' => $request->ip() ?? '127.0.0.1',
                    'last_seen_at' => now(),
                ]);
                Auth::setUser($user);
            }
        }

        if (!$user) {
            return ApiResponse::error('IDENTITY_AUTH_UNAUTHENTICATED', 'Silakan login atau sertakan data akun untuk mendaftar bisnis.', 401);
        }

        $targetRole = $request->input('target_role') ?? $request->input('applicantType') ?? 'SERVICE_PROVIDER';
        if (!in_array($targetRole, ['SERVICE_PROVIDER', 'MERCHANT', 'SUPPLIER'])) {
            $targetRole = 'SERVICE_PROVIDER';
        }

        $pic = $request->input('pic') ?? $request->input('picData') ?? [];
        $business = $request->input('business') ?? $request->input('businessData') ?? [];
        $legal = $request->input('legal') ?? $request->input('legalData') ?? [];
        $specialization = $request->input('specialization') ?? $request->input('specializedData') ?? [];

        $appCode = 'APP-' . date('Y') . '-' . str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);

        $draftData = [
            'pic' => $pic,
            'business' => $business,
            'legal' => $legal,
            'specialization' => $specialization,
        ];

        $application = BusinessApplication::create([
            'application_code' => $appCode,
            'applicant_user_id' => $user->id,
            'target_role' => $targetRole,
            'status' => 'DRAFT',
            'revision_no' => 0,
            'lock_version' => 1,
            'draft_data_ciphertext' => Crypt::encryptString(json_encode($draftData)),
        ]);

        AuditService::log($user->id, 'IDENTITY_BUSINESS_APPLICATION_CREATED', 'business_application', $application->id, 'SUCCESS');

        $formatted = $this->formatApplicationView($application);
        $payload = array_merge($formatted, [
            'application' => $formatted,
            'token' => $sessionToken,
            'user' => [
                'id' => $user->id,
                'fullName' => $user->profile?->display_name ?? 'Pemohon Bisnis',
                'email' => $user->email,
            ],
        ]);

        $responseData = [
            'success' => true,
            'code' => 'IDENTITY_APPLICATION_CREATED',
            'data' => $payload,
            'meta' => ['request_id' => $request->header('X-Request-Id', (string) Str::uuid())],
        ];

        if ($idempotencyKey) {
            IdempotencyService::record('business.create', $idempotencyKey, $request->all(), 201, $responseData, $user->id);
        }

        return response()->json($responseData, 201);
    }

    /**
     * B02: List Own Applications
     */
    public function myApplications(Request $request)
    {
        $user = Auth::user();
        $apps = BusinessApplication::where('applicant_user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($a) => $this->formatApplicationView($a));

        return ApiResponse::success(['items' => $apps, 'has_more' => false], 'IDENTITY_APPLICATIONS_LIST', 200);
    }

    /**
     * B03: Get Application Detail
     */
    public function getApplication(Request $request, string $id)
    {
        $user = $this->resolveUser($request);
        $app = BusinessApplication::with('documents')->find($id);

        if (!$app) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi bisnis tidak ditemukan.', 404);
        }

        $isOwner = $user && $app->applicant_user_id === $user->id;
        $isReviewer = $user && $user->hasPermission('identity.business.application.review');

        if ($user && !$isOwner && !$isReviewer) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ke aplikasi ini ditolak.', 403);
        }

        return ApiResponse::success($this->formatApplicationView($app, (bool) $isReviewer), 'IDENTITY_APPLICATION_LOADED', 200);
    }

    /**
     * B04: Update Application Draft
     */
    public function updateApplication(Request $request, string $id)
    {
        $user = $this->resolveUser($request);
        $app = BusinessApplication::find($id);

        if (!$app) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi bisnis tidak ditemukan.', 404);
        }

        if ($user && $app->applicant_user_id !== $user->id && !$user->hasPermission('identity.business.application.review')) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ke aplikasi ini ditolak.', 403);
        }

        if (!in_array($app->status, ['DRAFT', 'REVISION_REQUIRED'])) {
            return ApiResponse::error(
                'IDENTITY_APPLICATION_INVALID_STATE',
                'Aplikasi yang sedang dalam peninjauan tidak dapat disunting.',
                409
            );
        }

        if ($request->has('lock_version') && $request->input('lock_version') != $app->lock_version) {
            return ApiResponse::error(
                'IDENTITY_APPLICATION_VERSION_CONFLICT',
                'Aplikasi telah diperbarui. Muat ulang sebelum menyimpan.',
                409
            );
        }

        $currentData = $this->decodeDraftData($app->draft_data_ciphertext);
        $mappings = [
            'pic' => ['pic', 'picData'],
            'business' => ['business', 'businessData'],
            'legal' => ['legal', 'legalData'],
            'specialization' => ['specialization', 'specializedData'],
        ];
        foreach ($mappings as $canonical => $aliases) {
            foreach ($aliases as $key) {
                if ($request->has($key)) {
                    $currentData[$canonical] = $request->input($key);
                    break;
                }
            }
        }

        $app->draft_data_ciphertext = Crypt::encryptString(json_encode($currentData));
        $app->lock_version++;
        $app->save();

        AuditService::log($user->id, 'IDENTITY_APPLICATION_UPDATED', 'business_application', $app->id, 'SUCCESS');

        return ApiResponse::success($this->formatApplicationView($app), 'IDENTITY_APPLICATION_UPDATED', 200);
    }

    /**
     * B05: Upload Application Document
     */
    public function uploadDocument(Request $request, string $id)
    {
        $user = $this->resolveUser($request);
        $app = BusinessApplication::find($id);

        if (!$app) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi bisnis tidak ditemukan.', 404);
        }

        if ($user && $app->applicant_user_id !== $user->id && !$user->hasPermission('identity.business.application.review')) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ke aplikasi ini ditolak.', 403);
        }

        $docType = $request->input('doc_type') ?? $request->input('documentType') ?? 'DOCUMENT';

        $maxKilobytes = match ($docType) {
            'AKTA_PERUSAHAAN' => 10240, // 10MB
            'NIB' => 8192,             // 8MB
            default => 5120,           // 5MB
        };

        $allowedMimes = match ($docType) {
            'FOTO_BENGKEL', 'FOTO_TOKO' => 'jpeg,jpg,png,webp',
            'AKTA_PERUSAHAAN' => 'pdf',
            default => 'jpeg,jpg,png,pdf',
        };

        $validated = $request->validate([
            'file' => "required|file|max:{$maxKilobytes}|mimes:{$allowedMimes}",
        ], [
            'file.max' => 'Ukuran berkas melebihi batas maksimal (' . round($maxKilobytes / 1024) . 'MB).',
            'file.mimes' => 'Format berkas tidak sesuai untuk tipe dokumen ini.',
        ]);

        $file = $request->file('file');
        $storagePath = $file->store('private/business_documents');

        $doc = ApplicationDocument::create([
            'application_id' => $app->id,
            'revision_no' => $app->revision_no,
            'doc_type' => $docType,
            'private_storage_key' => $storagePath,
            'sha256' => hash_file('sha256', $file->getRealPath()),
            'mime' => $file->getClientMimeType(),
            'size_bytes' => $file->getSize(),
            'verification_status' => 'PENDING',
        ]);

        AuditService::log($user?->id, 'IDENTITY_APPLICATION_DOCUMENT_UPLOADED', 'application_document', $doc->id, 'SUCCESS');

        return ApiResponse::success([
            'id' => $doc->id,
            'document_id' => $doc->id,
            'documentId' => $doc->id,
            'doc_type' => $doc->doc_type,
            'documentType' => $doc->doc_type,
            'fileName' => $file->getClientOriginalName(),
            'fileSize' => $file->getSize(),
            'verification_status' => 'PENDING',
            'status' => 'PENDING',
        ], 'IDENTITY_DOCUMENT_UPLOADED', 201);
    }

    /**
     * B06: Submit Application (DRAFT -> PENDING_REVIEW)
     */
    public function submitApplication(Request $request, string $id)
    {
        $user = $this->resolveUser($request);
        return DB::transaction(function () use ($id, $user, $request) {
            $app = BusinessApplication::lockForUpdate()->find($id);

            if (!$app) {
                return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi tidak ditemukan.', 404);
            }

            if ($user && $app->applicant_user_id !== $user->id && !$user->hasPermission('identity.business.application.review')) {
                return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ke aplikasi ini ditolak.', 403);
            }

            if ($app->status === 'REVISION_REQUIRED') {
                return $this->resubmitApplication($request, $id);
            }

            if ($app->status !== 'DRAFT') {
                return ApiResponse::error('IDENTITY_APPLICATION_INVALID_STATE', 'Hanya aplikasi berstatus DRAFT yang dapat diajukan.', 409);
            }

            if ($request->has('lock_version') && $request->input('lock_version') != $app->lock_version) {
                return ApiResponse::error('IDENTITY_APPLICATION_VERSION_CONFLICT', 'Versi aplikasi tidak sesuai.', 409);
            }

            $app->status = 'PENDING_REVIEW';
            $app->submitted_at = now();
            $app->lock_version++;
            $app->save();

            // Record snapshot
            ApplicationRevision::create([
                'application_id' => $app->id,
                'revision_no' => $app->revision_no,
                'snapshot_ciphertext' => $app->draft_data_ciphertext ?? '{}',
                'submitted_at' => now(),
                'submitted_by' => $user?->id ?? $app->applicant_user_id,
            ]);

            AuditService::log($user?->id ?? $app->applicant_user_id, 'IDENTITY_APPLICATION_SUBMITTED', 'business_application', $app->id, 'SUCCESS');
            OutboxService::publish('business_application', $app->id, 'identity.business_application.submitted.v1', [
                'application_id' => $app->id,
                'target_role' => $app->target_role,
                'status' => 'PENDING_REVIEW',
            ]);

            return ApiResponse::success($this->formatApplicationView($app), 'IDENTITY_APPLICATION_SUBMITTED', 200);
        });
    }

    /**
     * B07: Resubmit Application (REVISION_REQUIRED -> PENDING_REVIEW)
     */
    public function resubmitApplication(Request $request, string $id)
    {
        $user = $this->resolveUser($request);
        return DB::transaction(function () use ($id, $user, $request) {
            $app = BusinessApplication::lockForUpdate()->find($id);

            if (!$app) {
                return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi tidak ditemukan.', 404);
            }

            if ($user && $app->applicant_user_id !== $user->id && !$user->hasPermission('identity.business.application.review')) {
                return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ke aplikasi ini ditolak.', 403);
            }

            if ($app->status !== 'REVISION_REQUIRED') {
                return ApiResponse::error('IDENTITY_APPLICATION_INVALID_STATE', 'Hanya aplikasi yang meminta revisi yang dapat diajukan ulang.', 409);
            }

            $app->revision_no++;
            $app->status = 'PENDING_REVIEW';
            $app->submitted_at = now();
            $app->lock_version++;
            $app->save();

            ApplicationRevision::create([
                'application_id' => $app->id,
                'revision_no' => $app->revision_no,
                'snapshot_ciphertext' => $app->draft_data_ciphertext ?? '{}',
                'submitted_at' => now(),
                'submitted_by' => $user->id,
            ]);

            AuditService::log($user->id, 'IDENTITY_APPLICATION_RESUBMITTED', 'business_application', $app->id, 'SUCCESS');
            OutboxService::publish('business_application', $app->id, 'identity.business_application.resubmitted.v1', [
                'application_id' => $app->id,
                'revision_no' => $app->revision_no,
                'status' => 'PENDING_REVIEW',
            ]);

            return ApiResponse::success($this->formatApplicationView($app), 'IDENTITY_APPLICATION_RESUBMITTED', 200);
        });
    }

    /**
     * B08: History (Applicant or Staff)
     */
    public function applicationHistory(Request $request, string $id)
    {
        $user = Auth::user();
        $app = BusinessApplication::with(['revisions', 'decisions'])->find($id);

        if (!$app) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi tidak ditemukan.', 404);
        }

        $isOwner = $app->applicant_user_id === $user->id;
        $isStaff = $user->hasPermission('identity.business.application.review');

        if (!$isOwner && !$isStaff) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ditolak.', 403);
        }

        return ApiResponse::success([
            'application_code' => $app->application_code,
            'revisions' => $app->revisions,
            'decisions' => $app->decisions,
        ], 'IDENTITY_APPLICATION_HISTORY', 200);
    }

    /**
     * B09: Admin List Applications Queue
     */
    public function adminListApplications(Request $request)
    {
        $query = BusinessApplication::with(['applicant.profile']);

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->has('target_role')) {
            $query->where('target_role', $request->query('target_role'));
        }

        $paginator = $query->orderBy('submitted_at', 'desc')->paginate(20);
        $items = collect($paginator->items())->map(fn($a) => $this->formatApplicationView($a, true));

        return ApiResponse::success([
            'items' => $items,
            'has_more' => $paginator->hasMorePages(),
        ], 'IDENTITY_ADMIN_APPLICATIONS_LIST', 200);
    }

    /**
     * B10: Admin View Application Detail
     */
    public function adminGetApplication(Request $request, string $id)
    {
        $app = BusinessApplication::with(['applicant.profile', 'documents', 'revisions', 'decisions'])->find($id);
        if (!$app) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi tidak ditemukan.', 404);
        }

        return ApiResponse::success($this->formatApplicationView($app, true), 'IDENTITY_ADMIN_APPLICATION_LOADED', 200);
    }

    /**
     * B11: Admin Decision (APPROVE, REQUEST_REVISION, REJECT)
     * Concurrency guarded with lockForUpdate and lock_version check
     */
    public function adminDecision(Request $request, string $id)
    {
        $admin = $this->resolveUser($request);
        if (!$admin) {
            return ApiResponse::error('IDENTITY_AUTH_UNAUTHENTICATED', 'Sesi tidak valid atau belum terautentikasi.', 401);
        }
        $rawDecision = $request->input('decision') ?? $request->input('action') ?? 'APPROVE';
        $reason = $request->input('reason') ?? $request->input('reviewNote') ?? ($rawDecision === 'APPROVE' ? 'Pendaftaran disetujui oleh Administrator.' : 'Catatan peninjauan pendaftaran.');
        $reqChanges = $request->input('required_changes') ?? $request->input('revisionDocTypes');
        $lockVersion = $request->input('lock_version');

        return DB::transaction(function () use ($id, $admin, $rawDecision, $reason, $reqChanges, $lockVersion) {
            $app = BusinessApplication::lockForUpdate()->find($id);

            if (!$app) {
                return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi tidak ditemukan.', 404);
            }

            if ($app->status !== 'PENDING_REVIEW') {
                return ApiResponse::error(
                    'IDENTITY_APPLICATION_INVALID_STATE',
                    'Hanya aplikasi berstatus PENDING_REVIEW yang dapat diproses.',
                    409
                );
            }

            if ($lockVersion !== null && $app->lock_version != $lockVersion) {
                return ApiResponse::error(
                    'IDENTITY_APPLICATION_VERSION_CONFLICT',
                    'Aplikasi telah diperbarui. Muat ulang sebelum membuat keputusan.',
                    409
                );
            }

            if ($app->applicant_user_id === $admin->id) {
                return ApiResponse::error(
                    'IDENTITY_PERMISSION_DENIED',
                    'Reviewer tidak dapat menyetujui aplikasinya sendiri.',
                    403
                );
            }

            $fromStatus = $app->status;
            $decisionType = $rawDecision;
            $createdOrgId = null;

            if ($decisionType === 'APPROVE') {
                $app->status = 'APPROVED';
                $app->reviewed_at = now();
                $app->lock_version++;
                $app->save();

                $applicant = User::find($app->applicant_user_id);
                $draftData = $this->decodeDraftData($app->draft_data_ciphertext);

                $legalName = $draftData['business']['legal_name'] ?? ('Bisnis ' . $app->application_code);
                $displayName = $draftData['business']['brand_name'] ?? $legalName;
                $nib = $draftData['legal']['nib'] ?? 'NIB-' . uniqid();

                $orgType = match ($app->target_role) {
                    'SERVICE_PROVIDER' => 'PROVIDER',
                    'MERCHANT' => 'MERCHANT',
                    'SUPPLIER' => 'SUPPLIER',
                    default => 'PROVIDER',
                };

                // 1. Create Organization
                $org = Organization::create([
                    'type' => $orgType,
                    'status' => 'ACTIVE',
                    'approved_application_id' => $app->id,
                    'activated_at' => now(),
                ]);
                $createdOrgId = $org->id;

                // 2. Create Organization Profile
                OrganizationProfile::create([
                    'organization_id' => $org->id,
                    'legal_name' => $legalName,
                    'display_name' => $displayName,
                    'business_email' => $applicant?->email,
                    'business_phone' => $applicant?->phone_e164,
                    'address_json' => $draftData['business']['address'] ?? null,
                    'nib_ciphertext' => Crypt::encryptString($nib),
                    'nib_lookup_hash' => hash('sha256', $nib),
                    'npwp_ciphertext' => !empty($draftData['legal']['npwp']) ? Crypt::encryptString($draftData['legal']['npwp']) : null,
                    'npwp_lookup_hash' => !empty($draftData['legal']['npwp']) ? hash('sha256', $draftData['legal']['npwp']) : null,
                    'specialization_json' => $draftData['specialization'] ?? null,
                ]);

                // 3. Create Membership as OWNER
                $membership = Membership::create([
                    'user_id' => $applicant->id,
                    'organization_id' => $org->id,
                    'kind' => 'OWNER',
                    'status' => 'ACTIVE',
                    'started_at' => now(),
                ]);

                // 4. Grant Business Role
                $role = Role::where('code', $app->target_role)->first();
                if ($role) {
                    RoleAssignment::create([
                        'user_id' => $applicant->id,
                        'role_id' => $role->id,
                        'membership_id' => $membership->id,
                        'status' => 'ACTIVE',
                        'assigned_by' => $admin->id,
                        'assigned_at' => now(),
                    ]);
                }

                // If applicant was pending verification, activate
                if ($applicant && $applicant->status !== 'SUSPENDED') {
                    $applicant->status = 'ACTIVE';
                    $applicant->save();
                }

                OutboxService::publish('organization', $org->id, 'identity.organization.activated.v1', [
                    'organization_id' => $org->id,
                    'type' => $org->type,
                    'status' => 'ACTIVE',
                    'owner_user_id' => $applicant->id,
                ]);

            } elseif ($decisionType === 'REQUEST_REVISION') {
                $app->status = 'REVISION_REQUIRED';
                $app->reviewed_at = now();
                $app->lock_version++;
                $app->save();
            } else {
                $app->status = 'REJECTED';
                $app->reviewed_at = now();
                $app->lock_version++;
                $app->save();
            }

            // Record Decision
            $decision = ApplicationDecision::create([
                'application_id' => $app->id,
                'reviewer_user_id' => $admin->id,
                'decision' => $decisionType,
                'reason' => $reason,
                'required_changes_json' => $reqChanges,
                'from_status' => $fromStatus,
                'to_status' => $app->status,
                'lock_version' => $app->lock_version,
                'decided_at' => now(),
            ]);

            AuditService::log(
                $admin->id,
                'IDENTITY_BUSINESS_APPLICATION_DECISION',
                'business_application',
                $app->id,
                'SUCCESS',
                ['decision' => $decisionType]
            );

            OutboxService::publish('business_application', $app->id, 'identity.business_application.decided.v1', [
                'application_id' => $app->id,
                'target_role' => $app->target_role,
                'decision' => $decisionType,
                'organization_id' => $createdOrgId,
            ]);

            $appFormatted = $this->formatApplicationView($app, true);
            $responsePayload = array_merge($appFormatted, [
                'application' => $appFormatted,
                'decision' => [
                    'decision' => $decision->decision,
                    'reason' => $decision->reason,
                    'reviewer_id' => $admin->id,
                    'decided_at' => $decision->decided_at->toIso8601String(),
                ],
                'organization_id' => $createdOrgId,
            ]);

            return ApiResponse::success($responsePayload, 'IDENTITY_APPLICATION_DECISION_PROCESSED', 200);
        });
    }

    public function formatApplicationView(BusinessApplication $app, bool $includeDetails = false): array
    {
        $draftData = $this->decodeDraftData($app->draft_data_ciphertext);
        $docs = $app->documents->map(function ($d) {
            return [
                'id' => $d->id,
                'documentId' => $d->id,
                'doc_type' => $d->doc_type,
                'documentType' => $d->doc_type,
                'originalName' => $d->file_name ?? $d->doc_type,
                'fileName' => $d->file_name ?? $d->doc_type,
                'file_path' => $d->private_storage_key,
                'fileSize' => $d->size_bytes,
                'status' => $d->verification_status,
                'verification_status' => $d->verification_status,
                'uploadedAt' => $d->created_at?->toIso8601String(),
            ];
        })->values()->all();

        $latestDecision = $app->decisions()->latest()->first();

        return [
            'id' => $app->id,
            'application_code' => $app->application_code,
            'registrationNumber' => $app->application_code,
            'target_role' => $app->target_role,
            'applicantType' => $app->target_role,
            'status' => $app->status,
            'revision_no' => $app->revision_no,
            'revisionNo' => $app->revision_no,
            'lock_version' => $app->lock_version,
            'lockVersion' => $app->lock_version,
            'pic' => $draftData['pic'] ?? null,
            'picData' => $draftData['pic'] ?? null,
            'business' => $draftData['business'] ?? null,
            'businessData' => $draftData['business'] ?? null,
            'legal' => $draftData['legal'] ?? null,
            'legalData' => $draftData['legal'] ?? null,
            'specialization' => $draftData['specialization'] ?? null,
            'specializedData' => $draftData['specialization'] ?? null,
            'documents' => $docs,
            'reviewNote' => $latestDecision?->reason,
            'rejectionReason' => $latestDecision?->reason,
            'revisionDocTypes' => $latestDecision?->required_changes_json,
            'applicant' => [
                'id' => $app->applicant?->id ?? $app->applicant_user_id,
                'fullName' => $app->applicant?->profile?->display_name ?? 'Pemohon Bisnis',
                'email' => $app->applicant?->email,
                'phone' => $app->applicant?->phone_e164,
            ],
            'account' => [
                'id' => $app->applicant?->id ?? $app->applicant_user_id,
                'fullName' => $app->applicant?->profile?->display_name ?? 'Pemohon Bisnis',
                'email' => $app->applicant?->email,
                'phone' => $app->applicant?->phone_e164,
            ],
            'submitted_at' => $app->submitted_at?->toIso8601String(),
            'submittedAt' => $app->submitted_at?->toIso8601String(),
            'reviewed_at' => $app->reviewed_at?->toIso8601String(),
            'reviewedAt' => $app->reviewed_at?->toIso8601String(),
            'created_at' => $app->created_at?->toIso8601String(),
            'createdAt' => $app->created_at?->toIso8601String(),
        ];
    }

    /**
     * Delete an uploaded document from draft application
     */
    public function deleteDocument(Request $request, string $appId, string $docId)
    {
        $user = Auth::user();
        $app = BusinessApplication::where('id', $appId)->where('applicant_user_id', $user->id)->first();
        if (!$app) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi bisnis tidak ditemukan.', 404);
        }

        $doc = ApplicationDocument::where('id', $docId)->where('application_id', $app->id)->first();
        if (!$doc) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Dokumen tidak ditemukan.', 404);
        }

        if (!in_array($app->status, ['DRAFT', 'REVISION_REQUIRED'])) {
            return ApiResponse::error('IDENTITY_APPLICATION_INVALID_STATE', 'Dokumen tidak dapat dihapus saat peninjauan.', 409);
        }

        Storage::disk('local')->delete($doc->private_storage_key);
        $doc->delete();

        return ApiResponse::success(['deleted_id' => $docId], 'IDENTITY_DOCUMENT_DELETED', 200);
    }

    /**
     * Admin delete application
     */
    public function deleteApplication(Request $request, string $id)
    {
        $app = BusinessApplication::find($id);
        if (!$app) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi tidak ditemukan.', 404);
        }

        foreach ($app->documents as $doc) {
            Storage::disk('local')->delete($doc->private_storage_key);
            $doc->delete();
        }

        $app->revisions()->delete();
        $app->decisions()->delete();
        $app->delete();

        return ApiResponse::success(['id' => $id], 'IDENTITY_APPLICATION_DELETED', 200);
    }

    /**
     * B13: Download Business Application Document
     */
    public function downloadDocument(Request $request, string $id, string $docId)
    {
        $user = Auth::user();
        $app = BusinessApplication::find($id);
        if (!$app) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi tidak ditemukan.', 404);
        }

        $doc = ApplicationDocument::where('id', $docId)->where('application_id', $app->id)->first();
        if (!$doc) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Dokumen tidak ditemukan.', 404);
        }

        $isApplicant = $user && $app->applicant_user_id === $user->id;
        $isReviewer = $user && $user->hasPermission('identity.business.application.review');

        if (!$isApplicant && !$isReviewer) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ke dokumen legal bisnis ditolak.', 403);
        }

        if (!Storage::exists($doc->private_storage_key)) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Berkas fisik tidak ditemukan.', 404);
        }

        AuditService::log($user?->id, 'IDENTITY_APP_DOCUMENT_DOWNLOADED', 'application_document', $doc->id, 'SUCCESS');
        return Storage::download($doc->private_storage_key);
    }

    private function resolveUser(Request $request): ?User
    {
        $user = Auth::user();
        if ($user) {
            return $user;
        }

        $token = $request->bearerToken()
            ?? $request->cookie('servio_token')
            ?? $request->cookie('servio_session')
            ?? $request->header('X-Session-Token');

        if ($token) {
            $session = AuthSession::where('session_id', $token)
                ->whereNull('revoked_at')
                ->with('user')
                ->first();
            if ($session && $session->user) {
                Auth::setUser($session->user);
                return $session->user;
            }
        }

        return null;
    }

    protected function decodeDraftData(?string $ciphertext): array
    {
        if (empty($ciphertext)) {
            return [];
        }
        try {
            $dec = Crypt::decryptString($ciphertext);
            return json_decode($dec, true) ?: [];
        } catch (\Throwable) {
            return json_decode($ciphertext, true) ?: [];
        }
    }
}
