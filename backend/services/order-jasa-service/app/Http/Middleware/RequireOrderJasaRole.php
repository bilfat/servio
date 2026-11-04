<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireOrderJasaRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        /** @var AuthenticatedActor|null $actor */
        $actor = $request->attributes->get('actor');

        if (!$actor) {
            return ApiResponse::error(
                'ORDER_JASA_UNAUTHENTICATED',
                'Akses memerlukan autentikasi aktor.',
                401
            );
        }

        // Split comma-separated roles if passed as a single string
        $allowedRoles = [];
        foreach ($roles as $role) {
            foreach (explode(',', $role) as $r) {
                $trimmed = trim($r);
                if ($trimmed !== '') {
                    $allowedRoles[] = strtoupper($trimmed);
                }
            }
        }

        // Normalizations
        $actorRole = strtoupper($actor->role);
        $hasAccess = in_array($actorRole, $allowedRoles, true);

        // Alias matching (e.g. ADMIN matches ADMIN_OPERATIONS, SERVICE_PROVIDER matches PROVIDER)
        if (!$hasAccess) {
            if ($actorRole === 'SERVICE_PROVIDER' && in_array('PROVIDER', $allowedRoles, true)) {
                $hasAccess = true;
            } elseif (in_array($actorRole, ['TECHNICIAN', 'WORKER_TECHNICIAN', 'WORKER'], true) && in_array('WORKER', $allowedRoles, true)) {
                $hasAccess = true;
            } elseif (in_array($actorRole, ['SUPER_ADMIN', 'ADMIN'], true) && in_array('ADMIN_OPERATIONS', $allowedRoles, true)) {
                $hasAccess = true;
            } elseif (in_array($actorRole, ['FINANCE', 'FINANCE_OPS', 'FINANCE_PAYMENT_OPS', 'FINANCE_CONTROLLER', 'FINANCE_MANAGER'], true) && in_array('FINANCE', $allowedRoles, true)) {
                $hasAccess = true;
            }
        }

        if (!$hasAccess) {
            return ApiResponse::error(
                'ORDER_JASA_FORBIDDEN_ROLE',
                "Peran '{$actor->role}' tidak memiliki izin untuk mengakses resource ini.",
                403
            );
        }

        return $next($request);
    }
}
