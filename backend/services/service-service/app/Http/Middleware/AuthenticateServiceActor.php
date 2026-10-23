<?php

namespace App\Http\Middleware;

use App\Infrastructure\Identity\IdentityServiceClient;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateServiceActor
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

        $expectedGatewayKey = config('services.gateway.key', env('SERVICE_GATEWAY_KEY'));
        $providedGatewayKey = $request->header('X-Gateway-Key');

        // 1. If actor headers are provided, verify they originate from trusted API Gateway
        if ($userId !== null || $role !== null) {
            $isGatewayTrusted = ! empty($expectedGatewayKey)
                && ! empty($providedGatewayKey)
                && hash_equals((string) $expectedGatewayKey, (string) $providedGatewayKey);

            if (! $isGatewayTrusted) {
                return ApiResponse::error(
                    'SERVICE_UNTRUSTED_GATEWAY_CONTEXT',
                    'Konteks aktor ditolak. Header gateway tidak valid atau tidak disediakan.',
                    403
                );
            }

            if ($userId && $role) {
                $actor = new AuthenticatedActor(
                    id: $userId,
                    role: strtoupper($role),
                    organizationId: $orgId ?: null,
                    organizationType: strtoupper($role) === 'SERVICE_PROVIDER' ? 'PROVIDER' : null,
                    roleAssignmentId: $assignmentId ?: null,
                    authzVersion: $authzVersion > 0 ? $authzVersion : 1,
                    isGuest: false
                );
            }
        }

        // 2. Browser request or API Bearer token: Inspect session via Identity Service
        if (! $actor) {
            $sessionRef = $request->cookie('servio_session') ?: $request->bearerToken();
            if ($sessionRef) {
                $sessionData = $this->identityClient->introspectSession($sessionRef, [
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);

                if ($sessionData && ! empty($sessionData['active'])) {
                    $actor = new AuthenticatedActor(
                        id: $sessionData['user_id'] ?? null,
                        role: strtoupper($sessionData['role_code'] ?? 'GUEST'),
                        organizationId: $sessionData['organization_id'] ?? null,
                        organizationType: strtoupper($sessionData['role_code'] ?? '') === 'SERVICE_PROVIDER' ? 'PROVIDER' : null,
                        roleAssignmentId: $sessionData['role_assignment_id'] ?? null,
                        authzVersion: (int) ($sessionData['authz_version'] ?? 1),
                        isGuest: false
                    );
                }
            }
        }

        // 3. Fallback to Guest if not found
        if (! $actor) {
            $actor = AuthenticatedActor::guest();
        }

        // 4. If authentication is strictly required, reject Guest
        if ($mode === 'required' && $actor->isGuest) {
            return ApiResponse::error(
                'SERVICE_UNAUTHENTICATED',
                'Autentikasi diperlukan untuk mengakses resource ini.',
                401
            );
        }

        $request->attributes->set('actor', $actor);

        return $next($request);
    }
}
