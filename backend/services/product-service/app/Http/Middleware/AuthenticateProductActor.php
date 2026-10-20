<?php

namespace App\Http\Middleware;

use App\Infrastructure\Identity\IdentityServiceClient;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateProductActor
{
    public function __construct(
        protected IdentityServiceClient $identityClient
    ) {}

    public function handle(Request $request, Closure $next, string $mode = 'optional'): Response
    {
        $actor = null;

        $userId = $request->header('X-Actor-User-Id');
        $role = $request->header('X-Actor-Role');
        $orgId = $request->header('X-Actor-Org-Id');
        $assignmentId = $request->header('X-Actor-Role-Assignment-Id');
        $authzVersion = (int) ($request->header('X-Actor-Authz-Version', '1'));

        $expectedGatewayKey = config('services.gateway.key', env('PRODUCT_GATEWAY_KEY'));
        $providedGatewayKey = $request->header('X-Gateway-Key');

        // 1. If actor headers are provided, verify they originate from trusted API Gateway
        if ($userId !== null || $role !== null) {
            $isGatewayTrusted = ! empty($expectedGatewayKey)
                && ! empty($providedGatewayKey)
                && hash_equals((string) $expectedGatewayKey, (string) $providedGatewayKey);

            if (! $isGatewayTrusted) {
                return ApiResponse::error(
                    'PRODUCT_UNTRUSTED_GATEWAY_CONTEXT',
                    'Konteks aktor ditolak. Header gateway tidak valid atau tidak disediakan.',
                    403
                );
            }

            if ($userId && $role) {
                $actor = new AuthenticatedActor(
                    id: $userId,
                    role: strtoupper($role),
                    organizationId: $orgId ?: null,
                    organizationType: strtoupper($role) === 'MERCHANT' ? 'MERCHANT' : null,
                    roleAssignmentId: $assignmentId ?: null,
                    authzVersion: $authzVersion > 0 ? $authzVersion : 1,
                    isGuest: false
                );
            }
        }

        // 2. Browser request or API Bearer token: Inspect session
        if (! $actor) {
            $sessionRef = $request->cookie('servio_session') ?: $request->bearerToken();

            if ($sessionRef) {
                $sessionData = $this->identityClient->introspectSession($sessionRef);
                if ($sessionData && ! empty($sessionData['user_id'])) {
                    $actor = new AuthenticatedActor(
                        id: $sessionData['user_id'],
                        role: strtoupper($sessionData['role_code'] ?? 'CUSTOMER'),
                        organizationId: $sessionData['organization_id'] ?? null,
                        organizationType: ($sessionData['role_code'] ?? '') === 'MERCHANT' ? 'MERCHANT' : null,
                        roleAssignmentId: $sessionData['role_assignment_id'] ?? null,
                        authzVersion: $sessionData['authz_version'] ?? 1,
                        isGuest: false
                    );
                }
            }
        }

        // 3. Fallback or guest handling
        if (! $actor) {
            if ($mode === 'required') {
                return ApiResponse::error(
                    'PRODUCT_UNAUTHENTICATED',
                    'Autentikasi diperlukan untuk mengakses layanan ini.',
                    401
                );
            }
            $actor = AuthenticatedActor::guest();
        }

        $request->attributes->set('actor', $actor);

        return $next($request);
    }
}
