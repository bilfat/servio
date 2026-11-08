<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireAfterSalesRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        /** @var AuthenticatedActor|null $actor */
        $actor = $request->attributes->get('actor');

        if (!$actor) {
            return ApiResponse::error(
                'AFTER_SALES_UNAUTHENTICATED',
                'Akses memerlukan autentikasi aktor.',
                401
            );
        }

        $expandedRoles = [];
        foreach ($roles as $r) {
            foreach (explode(',', $r) as $part) {
                $trimmed = trim($part);
                if ($trimmed !== '') {
                    $expandedRoles[] = strtoupper($trimmed);
                }
            }
        }

        // Aliases
        if (in_array('PROVIDER', $expandedRoles, true) && !in_array('SERVICE_PROVIDER', $expandedRoles, true)) {
            $expandedRoles[] = 'SERVICE_PROVIDER';
        }
        if (in_array('ADMIN', $expandedRoles, true) && !in_array('ADMIN_OPERATIONS', $expandedRoles, true)) {
            $expandedRoles[] = 'ADMIN_OPERATIONS';
            $expandedRoles[] = 'SUPER_ADMIN';
        }

        if (!$actor->hasRole(...$expandedRoles)) {
            return ApiResponse::error(
                'AFTER_SALES_UNAUTHORIZED_ROLE',
                'Role aktor tidak memiliki wewenang untuk tindakan ini.',
                403
            );
        }

        return $next($request);
    }
}

