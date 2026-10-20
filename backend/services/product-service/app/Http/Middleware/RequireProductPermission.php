<?php

namespace App\Http\Middleware;

use App\Infrastructure\Identity\IdentityServiceClient;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireProductPermission
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
                'PRODUCT_UNAUTHENTICATED',
                'Autentikasi diperlukan.',
                401
            );
        }

        // Layer 1: Domain Role & Context Checks
        $domainAllowed = false;

        switch ($permission) {
            case 'product.own.read':
            case 'product.own.create':
            case 'product.own.update':
            case 'product.own.status':
            case 'product.own.delete':
            case 'product.variant.manage':
            case 'product.media.manage':
                $domainAllowed = $actor->isMerchant() && ! empty($actor->organizationId);
                break;

            case 'product.governance.read':
                $domainAllowed = $actor->isAdmin() || $actor->isCeo();
                break;

            case 'product.audit.read':
                $domainAllowed = ($actor->isMerchant() && ! empty($actor->organizationId))
                    || $actor->isAdmin()
                    || $actor->isCeo();
                break;

            case 'product.catalog.read':
                $domainAllowed = true;
                break;

            default:
                $domainAllowed = false;
                break;
        }

        if (! $domainAllowed) {
            return ApiResponse::error(
                'PRODUCT_ACCESS_DENIED',
                'Anda tidak memiliki wewenang atau konteks role yang sesuai untuk melakukan tindakan ini.',
                403
            );
        }

        // Layer 2: Evaluate Authorization via Identity Service
        $authzResult = $this->identityClient->evaluateAuthorization(
            actorUserId: $actor->id,
            permission: $permission,
            roleAssignmentId: $actor->roleAssignmentId,
            organizationId: $actor->organizationId
        );

        if (($authzResult['reason_code'] ?? null) === 'IDENTITY_SERVICE_UNAVAILABLE') {
            return ApiResponse::error(
                'PRODUCT_IDENTITY_UNAVAILABLE',
                'Layanan identitas sedang tidak dapat dihubungi. Tindakan ditolak demi keamanan (fail-closed).',
                503
            );
        }

        if (empty($authzResult['allow'])) {
            return ApiResponse::error(
                'PRODUCT_ACCESS_DENIED',
                'Izin akses ' . $permission . ' ditolak oleh sistem otorisasi pusat.',
                403,
                details: ['reason_code' => $authzResult['reason_code'] ?? 'DENIED']
            );
        }

        return $next($request);
    }
}
