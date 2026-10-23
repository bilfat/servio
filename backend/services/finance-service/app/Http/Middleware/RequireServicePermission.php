<?php

namespace App\Http\Middleware;

use App\Infrastructure\Identity\IdentityServiceClient;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireServicePermission
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
                'SERVICE_UNAUTHENTICATED',
                'Autentikasi diperlukan.',
                401
            );
        }

        // Layer 1: Domain Role & Context Checks
        $domainAllowed = false;

        switch ($permission) {
            case 'service.offering.read_own':
            case 'service.offering.create':
            case 'service.offering.update_own':
            case 'service.offering.publish_own':
            case 'service.offering.archive_own':
            case 'service.definition_request.submit':
            case 'service.definition_request.read_own':
            case 'service.worker_capability.manage_own_org':
                $domainAllowed = $actor->isProvider() && ! empty($actor->organizationId);
                break;

            case 'service.definition.manage':
            case 'service.capability.manage':
            case 'service.definition_request.review':
                $domainAllowed = $actor->isAdmin();
                break;

            case 'service.offering.read_all':
            case 'service.definition.read_all':
            case 'service.capability.read_all':
            case 'service.definition_request.read_all':
                $domainAllowed = $actor->isAdmin() || $actor->isCeo();
                break;

            case 'service.definition.read_active':
            case 'service.capability.read_active':
                $domainAllowed = $actor->isProvider() || $actor->isAdmin() || $actor->isCeo();
                break;

            case 'service.audit.read':
                $domainAllowed = ($actor->isProvider() && ! empty($actor->organizationId))
                    || $actor->isAdmin()
                    || $actor->isCeo();
                break;

            case 'service.catalog.read_public':
                $domainAllowed = true;
                break;

            default:
                $domainAllowed = false;
        }

        if (! $domainAllowed) {
            return ApiResponse::error(
                'SERVICE_FORBIDDEN',
                'Akses ditolak. Peran atau konteks organisasi Anda tidak memiliki izin untuk tindakan ini.',
                403
            );
        }

        // Layer 2: M2M Authorization Evaluation with Identity Service (if role assignment present)
        if ($actor->roleAssignmentId) {
            $eval = $this->identityClient->evaluateAuthorization(
                actorUserId: (string) $actor->id,
                roleAssignmentId: (string) $actor->roleAssignmentId,
                organizationId: $actor->organizationId,
                permission: $permission,
                resourceOwnerContext: [
                    'organization_id' => $actor->organizationId,
                ]
            );

            if (empty($eval['allow'])) {
                return ApiResponse::error(
                    'SERVICE_PERMISSION_REVOKED',
                    'Izin tindakan ini telah dicabut atau dinonaktifkan oleh Identity Service.',
                    403,
                    [],
                    ['reason_code' => $eval['reason_code'] ?? 'PERMISSION_DENIED']
                );
            }
        }

        return $next($request);
    }
}
