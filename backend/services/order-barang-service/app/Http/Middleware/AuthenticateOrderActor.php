<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateOrderActor
{
    public function handle(Request $request, Closure $next, string $mode = 'required'): Response
    {
        $actor = null;

        $userId = $request->header('X-Actor-User-Id') ?: $request->header('X-User-Id');
        $role = $request->header('X-Actor-Role') ?: $request->header('X-User-Role');
        $orgId = $request->header('X-Actor-Org-Id') ?: $request->header('X-Org-Id');
        $assignmentId = $request->header('X-Actor-Role-Assignment-Id');
        $authzVersion = (int) ($request->header('X-Actor-Authz-Version', '1'));

        $expectedGatewayKey = config('order.gateway_key') ?: config('services.gateway.key');
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
                    'ORDER_UNTRUSTED_GATEWAY_CONTEXT',
                    'Konteks aktor ditolak. Header gateway tidak valid atau tidak disediakan.',
                    403
                );
            }

            if ($userId && $role) {
                $orgActive = $request->header('X-Actor-Org-Active') !== null
                    ? filter_var($request->header('X-Actor-Org-Active'), FILTER_VALIDATE_BOOLEAN)
                    : true;
                $membershipActive = $request->header('X-Actor-Membership-Active') !== null
                    ? filter_var($request->header('X-Actor-Membership-Active'), FILTER_VALIDATE_BOOLEAN)
                    : true;

                $actor = new AuthenticatedActor(
                    id: $userId,
                    role: strtoupper($role),
                    organizationId: $orgId ?: null,
                    organizationType: strtoupper($role) === 'MERCHANT' ? 'MERCHANT' : null,
                    roleAssignmentId: $assignmentId ?: null,
                    authzVersion: $authzVersion > 0 ? $authzVersion : 1,
                    isGuest: false,
                    organizationIsActive: $orgActive,
                    membershipIsActive: $membershipActive,
                );
            }
        }

        if ($mode === 'required' && !$actor) {
            return ApiResponse::error(
                'ORDER_UNAUTHENTICATED',
                'Akses memerlukan autentikasi aktor yang valid.',
                401
            );
        }

        // Check active membership and organization if merchant
        if ($actor && $actor->isMerchant()) {
            if (!$actor->organizationId) {
                return ApiResponse::error(
                    'ORDER_MERCHANT_NO_ORGANIZATION',
                    'Aktor Merchant tidak memiliki organisasi aktif.',
                    403
                );
            }
            if (!$actor->organizationIsActive) {
                return ApiResponse::error(
                    'ORDER_MERCHANT_ORG_INACTIVE',
                    'Organisasi Merchant berstatus nonaktif.',
                    403
                );
            }
            if (!$actor->membershipIsActive) {
                return ApiResponse::error(
                    'ORDER_MERCHANT_MEMBERSHIP_INACTIVE',
                    'Keanggotaan Merchant berstatus nonaktif.',
                    403
                );
            }
        }

        $request->attributes->set('actor', $actor);

        return $next($request);
    }
}
