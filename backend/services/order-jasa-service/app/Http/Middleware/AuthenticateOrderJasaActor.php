<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateOrderJasaActor
{
    private const ALLOWED_ROLES = [
        'CUSTOMER',
        'PROVIDER',
        'SERVICE_PROVIDER',
        'WORKER',
        'TECHNICIAN',
        'WORKER_TECHNICIAN',
        'ADMIN_OPERATIONS',
        'SUPER_ADMIN',
        'ADMIN',
        'FINANCE',
        'FINANCE_OPS',
        'FINANCE_PAYMENT_OPS',
        'FINANCE_CONTROLLER',
        'FINANCE_MANAGER',
    ];

    public function handle(Request $request, Closure $next, string $mode = 'required'): Response
    {
        $actor = null;

        $userId = $request->header('X-Actor-User-Id') ?: $request->header('X-User-Id');
        $role = $request->header('X-Actor-Role') ?: $request->header('X-User-Role');
        $orgId = $request->header('X-Actor-Org-Id') ?: $request->header('X-Org-Id');
        $assignmentId = $request->header('X-Actor-Role-Assignment-Id');
        $authzVersion = (int) ($request->header('X-Actor-Authz-Version', '1'));

        $expectedGatewayKey = config('order_jasa.gateway_key') ?: config('services.gateway.key');
        $providedGatewayKey = $request->header('X-Gateway-Key');

        // 1. Gateway header trust check:
        // Any request providing Actor / User headers MUST provide a valid X-Gateway-Key.
        // If not provided or mismatched, reject immediately with 403 untrusted context!
        if ($userId !== null || $role !== null) {
            // Test keys are strictly prohibited in production environments
            if (app()->environment('production') && (!empty($providedGatewayKey) && str_starts_with((string) $providedGatewayKey, 'test_'))) {
                return ApiResponse::error(
                    'ORDER_JASA_UNTRUSTED_GATEWAY_CONTEXT',
                    'Kunci gateway pengujian dilarang di lingkungan produksi.',
                    403
                );
            }

            $isGatewayTrusted = !empty($expectedGatewayKey)
                && !empty($providedGatewayKey)
                && hash_equals((string) $expectedGatewayKey, (string) $providedGatewayKey);

            if (!$isGatewayTrusted) {
                return ApiResponse::error(
                    'ORDER_JASA_UNTRUSTED_GATEWAY_CONTEXT',
                    'Konteks aktor ditolak. Header gateway tidak valid atau tidak disediakan.',
                    403
                );
            }

            if ($userId && $role) {
                $roleUpper = strtoupper(trim((string) $role));

                // Validate role against domain whitelist
                if (!in_array($roleUpper, self::ALLOWED_ROLES, true)) {
                    return ApiResponse::error(
                        'ORDER_JASA_FORBIDDEN_ROLE',
                        'Role aktor tidak dikenal dalam sistem pesanan jasa.',
                        403
                    );
                }

                // Zero-trust: Provider organization & membership flags must be explicitly true
                $orgActiveHeader = $request->header('X-Actor-Org-Active');
                $orgActive = $orgActiveHeader !== null
                    ? filter_var($orgActiveHeader, FILTER_VALIDATE_BOOLEAN)
                    : ($roleUpper === 'PROVIDER' || $roleUpper === 'SERVICE_PROVIDER' ? false : true);

                $membershipActiveHeader = $request->header('X-Actor-Membership-Active');
                $membershipActive = $membershipActiveHeader !== null
                    ? filter_var($membershipActiveHeader, FILTER_VALIDATE_BOOLEAN)
                    : ($roleUpper === 'PROVIDER' || $roleUpper === 'SERVICE_PROVIDER' ? false : true);

                $actor = new AuthenticatedActor(
                    id: (string) $userId,
                    role: $roleUpper,
                    organizationId: $orgId ? (string) $orgId : null,
                    organizationType: in_array($roleUpper, ['PROVIDER', 'SERVICE_PROVIDER'], true) ? 'SERVICE_PROVIDER' : null,
                    roleAssignmentId: $assignmentId ? (string) $assignmentId : null,
                    authzVersion: $authzVersion > 0 ? $authzVersion : 1,
                    isGuest: false,
                    organizationIsActive: $orgActive,
                    membershipIsActive: $membershipActive,
                );
            }
        }

        if ($mode === 'required' && !$actor) {
            return ApiResponse::error(
                'ORDER_JASA_UNAUTHENTICATED',
                'Akses memerlukan autentikasi aktor yang valid.',
                401
            );
        }

        // Check active membership and organization if Provider
        if ($actor && $actor->isProvider()) {
            if (!$actor->organizationId) {
                return ApiResponse::error(
                    'ORDER_JASA_PROVIDER_NO_ORGANIZATION',
                    'Aktor Provider tidak memiliki organisasi aktif.',
                    403
                );
            }
            if (!$actor->organizationIsActive) {
                return ApiResponse::error(
                    'ORDER_JASA_PROVIDER_ORG_INACTIVE',
                    'Organisasi Provider berstatus nonaktif.',
                    403
                );
            }
            if (!$actor->membershipIsActive) {
                return ApiResponse::error(
                    'ORDER_JASA_PROVIDER_MEMBERSHIP_INACTIVE',
                    'Keanggotaan Provider berstatus nonaktif.',
                    403
                );
            }
        }

        $request->attributes->set('actor', $actor);

        return $next($request);
    }
}
