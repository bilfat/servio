<?php

namespace App\Http\Middleware;

use App\Infrastructure\Identity\IdentityServiceClient;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateFinanceActor
{
    public function __construct(
        protected IdentityServiceClient $identityClient
    ) {}

    public function handle(Request $request, Closure $next, string $mode = 'optional'): Response
    {
        $actor = null;

        $userId = $request->header('X-Actor-User-Id') ?: $request->header('X-User-Id');
        $role = $request->header('X-Actor-Role') ?: $request->header('X-User-Role');
        $orgId = $request->header('X-Actor-Org-Id') ?: $request->header('X-Org-Id');
        $assignmentId = $request->header('X-Actor-Role-Assignment-Id');
        $authzVersion = (int) ($request->header('X-Actor-Authz-Version', '1'));

        $expectedGatewayKey = config('finance.gateway_key') ?: config('services.gateway.key');
        $providedGatewayKey = $request->header('X-Gateway-Key');

        // 1. Gateway header trust check:
        // Any request providing Actor / User headers MUST provide a valid X-Gateway-Key.
        // If not provided or mismatched, reject immediately with 403 untrusted context!
        if ($userId !== null || $role !== null) {
            $isGatewayTrusted = !empty($expectedGatewayKey)
                && !empty($providedGatewayKey)
                && hash_equals((string) $expectedGatewayKey, (string) $providedGatewayKey);

            if (!$isGatewayTrusted) {
                return ApiResponse::error(
                    'FINANCE_UNTRUSTED_GATEWAY_CONTEXT',
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
                    isGuest: false,
                    organizationIsActive: $request->header('X-Actor-Org-Active') !== null
                        ? filter_var($request->header('X-Actor-Org-Active'), FILTER_VALIDATE_BOOLEAN)
                        : true,
                    membershipIsActive: $request->header('X-Actor-Membership-Active') !== null
                        ? filter_var($request->header('X-Actor-Membership-Active'), FILTER_VALIDATE_BOOLEAN)
                        : true,
                    permissions: array_filter(array_map('trim', explode(',', (string) ($request->header('X-Actor-Permissions') ?? $request->header('X-User-Permissions', '')))))
                );
            }
        }

        // 2. Cookie or Bearer token fallback via Identity introspection
        if (!$actor) {
            $sessionRef = $request->cookie('servio_session') ?: $request->bearerToken();
            if ($sessionRef) {
                $sessionData = $this->identityClient->introspectSession($sessionRef, [
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);

                if ($sessionData && !empty($sessionData['active'])) {
                    $actor = new AuthenticatedActor(
                        id: $sessionData['user_id'] ?? null,
                        role: strtoupper($sessionData['role_code'] ?? 'GUEST'),
                        organizationId: $sessionData['organization_id'] ?? null,
                        organizationType: strtoupper($sessionData['role_code'] ?? '') === 'MERCHANT' ? 'MERCHANT' : null,
                        roleAssignmentId: $sessionData['role_assignment_id'] ?? null,
                        authzVersion: (int) ($sessionData['authz_version'] ?? 1),
                        isGuest: false,
                        permissions: (array) ($sessionData['permissions'] ?? [])
                    );
                }
            }
        }

        // 3. Guest fallback
        if (!$actor) {
            $actor = AuthenticatedActor::guest();
        }

        // 4. Required mode guard
        if ($mode === 'required' && $actor->isGuest) {
            return ApiResponse::error(
                'FINANCE_UNAUTHENTICATED',
                'Autentikasi diperlukan untuk mengakses resource keuangan ini.',
                401
            );
        }

        $request->attributes->set('actor', $actor);

        return $next($request);
    }
}
