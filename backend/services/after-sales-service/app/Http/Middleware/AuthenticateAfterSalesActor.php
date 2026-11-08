<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateAfterSalesActor
{
    private const ALLOWED_ROLES = [
        'CUSTOMER',
        'MERCHANT',
        'PROVIDER',
        'SERVICE_PROVIDER',
        'ADMIN_OPERATIONS',
        'SUPER_ADMIN',
        'ADMIN',
        'FINANCE',
        'FINANCE_OPS',
        'FINANCE_PAYMENT_OPS',
        'CUSTOMER_SUPPORT',
        'SUPPORT',
        'CEO_PRODUCT_OWNER',
    ];

    public function handle(Request $request, Closure $next, string $mode = 'required'): Response
    {
        $actor = null;

        $userId = $request->header('X-Actor-User-Id') ?: $request->header('X-User-Id');
        $role = $request->header('X-Actor-Role') ?: $request->header('X-User-Role');
        $orgId = $request->header('X-Actor-Org-Id') ?: $request->header('X-Org-Id');
        $orgType = $request->header('X-Actor-Org-Type') ?: $request->header('X-Org-Type');
        $assignmentId = $request->header('X-Actor-Role-Assignment-Id');
        $authzVersion = (int) ($request->header('X-Actor-Authz-Version', '1'));

        $expectedGatewayKey = config('after_sales.gateway_key') ?: config('services.gateway.key');
        $providedGatewayKey = $request->header('X-Gateway-Key');

        // Gateway header trust check
        if ($userId !== null || $role !== null) {
            if (app()->environment('production') && (!empty($providedGatewayKey) && str_starts_with((string) $providedGatewayKey, 'test_'))) {
                return ApiResponse::error(
                    'AFTER_SALES_UNTRUSTED_GATEWAY_CONTEXT',
                    'Kunci gateway pengujian dilarang di lingkungan produksi.',
                    403
                );
            }

            $isGatewayTrusted = !empty($expectedGatewayKey)
                && !empty($providedGatewayKey)
                && hash_equals((string) $expectedGatewayKey, (string) $providedGatewayKey);

            if (!$isGatewayTrusted) {
                return ApiResponse::error(
                    'AFTER_SALES_UNTRUSTED_GATEWAY_CONTEXT',
                    'Konteks aktor ditolak. Header gateway tidak valid atau tidak disediakan.',
                    403
                );
            }

            if ($userId && $role) {
                $roleUpper = strtoupper(trim((string) $role));

                if (!in_array($roleUpper, self::ALLOWED_ROLES, true)) {
                    return ApiResponse::error(
                        'AFTER_SALES_FORBIDDEN_ROLE',
                        'Role aktor tidak dikenal dalam sistem purnajual.',
                        403
                    );
                }

                $orgActiveHeader = $request->header('X-Actor-Org-Active');
                $orgActive = $orgActiveHeader !== null
                    ? filter_var($orgActiveHeader, FILTER_VALIDATE_BOOLEAN)
                    : true;

                $membershipActiveHeader = $request->header('X-Actor-Membership-Active');
                $membershipActive = $membershipActiveHeader !== null
                    ? filter_var($membershipActiveHeader, FILTER_VALIDATE_BOOLEAN)
                    : true;

                $resolvedOrgType = $orgType ? strtoupper((string) $orgType) : null;
                if (!$resolvedOrgType) {
                    if ($roleUpper === 'MERCHANT') {
                        $resolvedOrgType = 'MERCHANT';
                    } elseif (in_array($roleUpper, ['PROVIDER', 'SERVICE_PROVIDER'], true)) {
                        $resolvedOrgType = 'PROVIDER';
                    }
                }

                $actor = new AuthenticatedActor(
                    id: (string) $userId,
                    role: $roleUpper,
                    organizationId: $orgId ? (string) $orgId : null,
                    organizationType: $resolvedOrgType,
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
                'AFTER_SALES_UNAUTHENTICATED',
                'Akses memerlukan autentikasi aktor yang valid.',
                401
            );
        }

        // Validate active organization for business roles
        if ($actor && ($actor->isMerchant() || $actor->isProvider())) {
            if (!$actor->organizationId) {
                return ApiResponse::error(
                    'AFTER_SALES_BUSINESS_NO_ORGANIZATION',
                    'Aktor bisnis tidak memiliki organisasi aktif.',
                    403
                );
            }

            if (!$actor->organizationIsActive) {
                return ApiResponse::error(
                    'AFTER_SALES_ORGANIZATION_INACTIVE',
                    'Organisasi aktor tidak aktif.',
                    403
                );
            }

            if (!$actor->membershipIsActive) {
                return ApiResponse::error(
                    'AFTER_SALES_MEMBERSHIP_INACTIVE',
                    'Keanggotaan aktor dalam organisasi tidak aktif.',
                    403
                );
            }
        }

        $request->attributes->set('actor', $actor);

        return $next($request);
    }
}
