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
     * B03: Get Application Detail (Support UUID, application_code, email, or phone)
     */
    public function getApplication(Request $request, string $id)
    {
        $user = $this->resolveUser($request);
        
        // 1. Try finding by UUID or application_code
        $app = BusinessApplication::with(['documents', 'applicant.profile', 'decisions'])->find($id);
        if (!$app) {
            $app = BusinessApplication::with(['documents', 'applicant.profile', 'decisions'])
                ->where('application_code', $id)
                ->first();
        }

        // 2. Try finding by applicant email or phone number
        if (!$app) {
            $cleanDigits = preg_replace('/[^0-9]/', '', $id);
            $matchedUser = User::where('email', $id)
                ->orWhere('phone_e164', $id)
                ->when(strlen($cleanDigits) >= 8, function ($q) use ($cleanDigits) {
                    $q->orWhere('phone_e164', $cleanDigits)
                      ->orWhere('phone_e164', 'like', "%{$cleanDigits}%");
                })
                ->first();

            if ($matchedUser) {
                $app = BusinessApplication::with(['documents', 'applicant.profile', 'decisions'])
                    ->where('applicant_user_id', $matchedUser->id)
                    ->orderByRaw('COALESCE(submitted_at, created_at) DESC')
                    ->first();
            }
        }

        if (!$app) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi bisnis tidak ditemukan.', 404);
        }

        $isPublic = $request->is('api/v1/registration-applications*');
        $isOwner = $user && $app->applicant_user_id === $user->id;
        $isReviewer = $user && $user->hasPermission('identity.business.application.review');

        // Allow public tracking check, owner, or reviewer
        if (!$isPublic && $user && !$isOwner && !$isReviewer) {
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

        $isPublic = $request->is('api/v1/registration-applications*');
        if (!$isPublic && $user && $app->applicant_user_id !== $user->id && !$user->hasPermission('identity.business.application.review')) {
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
            $app = BusinessApplication::where('application_code', $id)->first();
        }

        if (!$app) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi bisnis tidak ditemukan.', 404);
        }

        $isPublic = $request->is('api/v1/registration-applications*');
        if (!$isPublic && $user && $app->applicant_user_id !== $user->id && !$user->hasPermission('identity.business.application.review')) {
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

        // Replace existing document of the same type: delete old physical file and record so documents do not duplicate
        $existingDocs = ApplicationDocument::where('application_id', $app->id)
            ->where('doc_type', $docType)
            ->get();
        foreach ($existingDocs as $oldDoc) {
            if (!empty($oldDoc->private_storage_key) && Storage::disk('local')->exists($oldDoc->private_storage_key)) {
                Storage::disk('local')->delete($oldDoc->private_storage_key);
            }
            $oldDoc->delete();
        }

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
                $app = BusinessApplication::lockForUpdate()->where('application_code', $id)->first();
            }

            if (!$app) {
                return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi tidak ditemukan.', 404);
            }

            $isPublic = $request->is('api/v1/registration-applications*');
            if (!$isPublic && $user && $app->applicant_user_id !== $user->id && !$user->hasPermission('identity.business.application.review')) {
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
                $app = BusinessApplication::lockForUpdate()->where('application_code', $id)->first();
            }

            if (!$app) {
                return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi tidak ditemukan.', 404);
            }

            $isPublic = $request->is('api/v1/registration-applications*');
            if (!$isPublic && $user && $app->applicant_user_id !== $user->id && !$user->hasPermission('identity.business.application.review')) {
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

            // Mark replacement documents as PENDING and update revision_no
            ApplicationDocument::where('application_id', $app->id)
                ->where('verification_status', '!=', 'APPROVED')
                ->update(['verification_status' => 'PENDING', 'revision_no' => $app->revision_no]);

            $actorId = $user?->id ?? $app->applicant_user_id;

            ApplicationRevision::create([
                'application_id' => $app->id,
                'revision_no' => $app->revision_no,
                'snapshot_ciphertext' => $app->draft_data_ciphertext ?? '{}',
                'submitted_at' => now(),
                'submitted_by' => $actorId,
            ]);

            AuditService::log($actorId, 'IDENTITY_APPLICATION_RESUBMITTED', 'business_application', $app->id, 'SUCCESS');
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
        $query = BusinessApplication::with(['applicant.profile', 'documents', 'decisions']);

        if ($request->has('status') && $request->query('status') !== 'ALL') {
            $status = $request->query('status');
            if ($status === 'UNDER_REVIEW') {
                $query->whereIn('status', ['PENDING_REVIEW', 'UNDER_REVIEW', 'DRAFT']);
            } else {
                $query->where('status', $status);
            }
        }

        $targetRole = $request->query('target_role') ?? $request->query('applicantType');
        if ($targetRole && $targetRole !== 'ALL') {
            $query->where('target_role', $targetRole);
        }

        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $cleanDigits = preg_replace('/[^0-9]/', '', $search);

            $query->where(function ($q) use ($search, $cleanDigits) {
                $q->where('application_code', 'like', "%{$search}%")
                  ->orWhereHas('applicant', function ($userQ) use ($search, $cleanDigits) {
                      $userQ->where('email', 'like', "%{$search}%")
                            ->when(strlen($cleanDigits) >= 6, function ($phoneQ) use ($cleanDigits) {
                                $phoneQ->orWhere('phone_e164', 'like', "%{$cleanDigits}%");
                            })
                            ->orWhereHas('profile', function ($profQ) use ($search) {
                                $profQ->where('display_name', 'like', "%{$search}%");
                            });
                  });
            });
        }

        $paginator = $query->orderByRaw('COALESCE(submitted_at, created_at) DESC')->paginate(50);
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
        if (is_string($reqChanges)) {
            $decoded = json_decode($reqChanges, true);
            $reqChanges = is_array($decoded) ? $decoded : [$reqChanges];
        }
        if (!is_array($reqChanges)) {
            $reqChanges = [];
        }
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

                // Mark all documents as approved
                ApplicationDocument::where('application_id', $app->id)
                    ->update(['verification_status' => 'APPROVED']);

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

                $bizAddress = $draftData['business']['address_json'] 
                    ?? $draftData['business']['addressData'] 
                    ?? $draftData['business']['address'] 
                    ?? null;
                if (!is_array($bizAddress) && !empty($draftData['business']['address'])) {
                    $bizAddress = [
                        'street_address' => $draftData['business']['address'],
                        'province_name' => $draftData['business']['province'] ?? null,
                        'city_name' => $draftData['business']['city'] ?? null,
                        'district_name' => $draftData['business']['district'] ?? null,
                        'village_name' => $draftData['business']['village'] ?? null,
                        'postal_code' => $draftData['business']['postal_code'] ?? $draftData['business']['postalCode'] ?? null,
                    ];
                }

                // 2. Create Organization Profile
                OrganizationProfile::create([
                    'organization_id' => $org->id,
                    'legal_name' => $legalName,
                    'display_name' => $displayName,
                    'business_email' => $applicant?->email,
                    'business_phone' => $applicant?->phone_e164,
                    'address_json' => $bizAddress,
                    'nib_ciphertext' => Crypt::encryptString($nib),
                    'nib_lookup_hash' => hash('sha256', $nib),
                    'npwp_ciphertext' => !empty($draftData['legal']['npwp']) ? Crypt::encryptString($draftData['legal']['npwp']) : null,
                    'npwp_lookup_hash' => !empty($draftData['legal']['npwp']) ? hash('sha256', $draftData['legal']['npwp']) : null,
                    'specialization_json' => $draftData['specialization'] ?? null,
                    'operational_hours_json' => $draftData['operational_hours'] ?? [
                        'work_days' => 'Senin - Sabtu',
                        'open_time' => '08:00',
                        'close_time' => '18:00',
                    ],
                    'service_area_json' => $draftData['service_area'] ?? [
                        'areas' => 'Jakarta Barat, Jakarta Selatan, Tangerang Kota',
                        'radius_km' => 25,
                    ],
                    'competencies_json' => $draftData['competencies'] ?? [
                        'AC Split & Inverter', 'Kompresor', 'Cuci AC & Overhaul', 'Instalasi Baru', 'Kelistrikan HVAC'
                    ],
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

                // Delete physical files and records from database for documents requiring revision
                if (!empty($reqChanges)) {
                    $docsToDelete = ApplicationDocument::where('application_id', $app->id)
                        ->whereIn('doc_type', $reqChanges)
                        ->get();
                    foreach ($docsToDelete as $d) {
                        if (!empty($d->private_storage_key)) {
                            Storage::disk('local')->delete($d->private_storage_key);
                        }
                        $d->delete();
                    }

                    // Mark other non-revised documents as APPROVED
                    ApplicationDocument::where('application_id', $app->id)
                        ->whereNotIn('doc_type', $reqChanges)
                        ->update(['verification_status' => 'APPROVED']);
                }
            } else {
                $app->status = 'REJECTED';
                $app->reviewed_at = now();
                $app->lock_version++;
                $app->save();

                ApplicationDocument::where('application_id', $app->id)
                    ->update(['verification_status' => 'REJECTED']);
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

        // Deduplicate documents: each doc_type gets its latest record
        $rawDocs = ApplicationDocument::where('application_id', $app->id)
            ->orderBy('created_at', 'desc')
            ->get();
        $uniqueDocs = $rawDocs->unique('doc_type');

        $latestDecision = $app->decisions()->latest()->first();
        $reqChanges = $latestDecision?->required_changes_json ?: [];
        if (is_string($reqChanges)) {
            $decoded = json_decode($reqChanges, true);
            $reqChanges = is_array($decoded) ? $decoded : [$reqChanges];
        }
        if (!is_array($reqChanges)) {
            $reqChanges = [];
        }

        $docs = $uniqueDocs->map(function ($d) use ($app, $reqChanges, $latestDecision) {
            $isRevisedType = in_array($d->doc_type, $reqChanges);
            $status = $d->verification_status;

            if ($app->status === 'REVISION_REQUIRED' && $isRevisedType) {
                // If created before the decision, it's the old rejected document needing revision
                if ($latestDecision && $d->created_at < $latestDecision->decided_at) {
                    $status = 'REVISION_REQUIRED';
                } else {
                    $status = 'PENDING';
                }
            } elseif (($app->status === 'PENDING_REVIEW' || $app->status === 'UNDER_REVIEW') && $isRevisedType) {
                $status = 'PENDING';
            }

            return [
                'id' => $d->id,
                'documentId' => $d->id,
                'doc_type' => $d->doc_type,
                'documentType' => $d->doc_type,
                'originalName' => $d->file_name ?? $d->doc_type,
                'fileName' => $d->file_name ?? (basename($d->private_storage_key) ?: ($d->doc_type . ($d->mime === 'application/pdf' ? '.pdf' : '.jpg'))),
                'file_path' => "/api/v1/registration-applications/{$app->id}/documents/{$d->id}/download",
                'filePath' => "/api/v1/registration-applications/{$app->id}/documents/{$d->id}/download",
                'fileSize' => $d->size_bytes,
                'mime' => $d->mime,
                'status' => $status,
                'verification_status' => $status,
                'uploadedAt' => $d->created_at?->toIso8601String(),
                'is_deleted_for_revision' => ($status === 'REVISION_REQUIRED'),
            ];
        })->values()->all();

        // If the application is in REVISION_REQUIRED, add placeholders ONLY for requested types that are missing completely
        if ($app->status === 'REVISION_REQUIRED' && !empty($reqChanges)) {
            $existingDocTypes = collect($docs)->pluck('doc_type')->all();
            foreach ($reqChanges as $revType) {
                if (!in_array($revType, $existingDocTypes)) {
                    $docs[] = [
                        'id' => 'rev-' . $revType,
                        'documentId' => 'rev-' . $revType,
                        'doc_type' => $revType,
                        'documentType' => $revType,
                        'originalName' => null,
                        'fileName' => null,
                        'file_path' => null,
                        'filePath' => null,
                        'fileSize' => 0,
                        'mime' => null,
                        'status' => 'REVISION_REQUIRED',
                        'verification_status' => 'REVISION_REQUIRED',
                        'is_empty' => true,
                        'is_deleted_for_revision' => true,
                    ];
                }
            }
        }

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
            'review_note' => $latestDecision?->reason,
            'rejectionReason' => $latestDecision?->reason,
            'revisionDocTypes' => $reqChanges,
            'requiredChanges' => $reqChanges,
            'required_changes' => $reqChanges,
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
     * B13: Download / View Business Application Document
     */
    public function downloadDocument(Request $request, string $id, string $docId)
    {
        $user = $this->resolveUser($request);
        $app = BusinessApplication::find($id);
        if (!$app) {
            $app = BusinessApplication::where('application_code', $id)->first();
        }
        if (!$app) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Aplikasi tidak ditemukan.', 404);
        }

        $doc = ApplicationDocument::where('id', $docId)->where('application_id', $app->id)->first();
        if (!$doc) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Dokumen tidak ditemukan.', 404);
        }

        $isApplicant = $user && $app->applicant_user_id === $user->id;
        $isReviewer = $user && $user->hasPermission('identity.business.application.review');

        // Allow applicant, reviewer, or if user holds the application session
        if ($user && !$isApplicant && !$isReviewer) {
            return ApiResponse::error('IDENTITY_PERMISSION_DENIED', 'Akses ke dokumen legal bisnis ditolak.', 403);
        }

        $path = Storage::disk('local')->path($doc->private_storage_key);
        if (!file_exists($path)) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Berkas fisik tidak ditemukan.', 404);
        }

        AuditService::log($user?->id, 'IDENTITY_APP_DOCUMENT_DOWNLOADED', 'application_document', $doc->id, 'SUCCESS');
        
        $mime = $doc->mime ?? 'application/pdf';
        $filename = $doc->file_name ?? ($doc->doc_type . ($mime === 'application/pdf' ? '.pdf' : '.jpg'));

        return response()->file($path, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
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
