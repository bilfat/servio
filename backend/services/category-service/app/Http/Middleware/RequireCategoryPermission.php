<?php

namespace App\Http\Middleware;

use App\Infrastructure\Identity\IdentityServiceClient;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireCategoryPermission
{
    public function __construct(
        protected IdentityServiceClient $identityClient
    ) {}

    public function handle(Request $request, Closure $next, string $permission): Response
    {
        /** @var AuthenticatedActor|null $actor */
        $actor = $request->attributes->get('actor');

        if (! $actor || $actor->isGuest) {
            return ApiResponse::error(
                'CATEGORY_UNAUTHENTICATED',
                'Autentikasi diperlukan.',
                401
            );
        }

        // Resolve effective permission for R01/R02
        $targetPermission = $permission;
        if ($permission === 'category.request.read_scoped' || $permission === 'category.request.read_own') {
            if ($actor->isAdmin() || $actor->isCeo()) {
                $targetPermission = 'category.request.read_all';
            } else {
                $targetPermission = 'category.request.read_own';
            }
        }

        // Layer 1: Domain Role & Context Checks (Additional Category Governance Layer)
        $domainAllowed = false;

        switch ($targetPermission) {
            case 'category.taxonomy.create':
            case 'category.taxonomy.update':
            case 'category.taxonomy.change_status':
            case 'category.taxonomy.hard_delete':
            case 'category.request.review':
                // Operational CRUD & Review restricted to ADMIN_OPERATIONS
                $domainAllowed = $actor->isAdmin();
                break;

            case 'category.taxonomy.read_inactive':
            case 'category.request.read_all':
            case 'category.audit.read':
                // Admin and CEO have governance oversight
                $domainAllowed = $actor->isAdmin() || $actor->isCeo();
                break;

            case 'category.request.submit':
                // Merchant, Provider, Supplier with active organization context (DEC-09)
                $domainAllowed = ($actor->isMerchant() || $actor->isProvider() || $actor->isSupplier())
                    && ! empty($actor->organizationId);
                break;

            case 'category.request.read_own':
                // Business actor with active organization context (DEC-09)
                $domainAllowed = ($actor->isMerchant() || $actor->isProvider() || $actor->isSupplier())
                    && ! empty($actor->organizationId);
                break;

            case 'category.taxonomy.read_active':
                $domainAllowed = true;
                break;

            default:
                $domainAllowed = false;
                break;
        }

        if (! $domainAllowed) {
            return ApiResponse::error(
                'CATEGORY_PERMISSION_DENIED',
                'Anda tidak memiliki wewenang atau konteks role yang sesuai untuk melakukan tindakan ini.',
                403
            );
        }

        // Layer 2: Evaluate Authorization via Identity Service
        $authzResult = $this->identityClient->evaluateAuthorization(
            actorUserId: $actor->id,
            permission: $targetPermission,
            roleAssignmentId: $actor->roleAssignmentId,
            organizationId: $actor->organizationId
        );

        if (($authzResult['reason_code'] ?? null) === 'IDENTITY_SERVICE_UNAVAILABLE') {
            return ApiResponse::error(
                'CATEGORY_IDENTITY_UNAVAILABLE',
                'Layanan Identity tidak dapat dihubungi untuk evaluasi otorisasi (Fail-Closed).',
                503
            );
        }

        if (empty($authzResult['allow'])) {
            $reason = $authzResult['reason_code'] ?? 'PERMISSION_DENIED';
            return ApiResponse::error(
                'CATEGORY_PERMISSION_DENIED',
                "Otorisasi Identity ditolak: {$reason}",
                403
            );
        }

        if (isset($authzResult['authz_version']) && (int) $authzResult['authz_version'] > $actor->authzVersion) {
            return ApiResponse::error(
                'CATEGORY_AUTHORIZATION_STALE',
                'Versi otorisasi sesi Anda telah kedaluwarsa. Silakan lakukan autentikasi ulang.',
                403
            );
        }

        return $next($request);
    }
}
