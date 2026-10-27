<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireOrderRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        /** @var AuthenticatedActor|null $actor */
        $actor = $request->attributes->get('actor');

        if (!$actor) {
            return ApiResponse::error(
                'ORDER_UNAUTHENTICATED',
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

        if (!in_array($actor->role, $allowedRoles, true)) {
            return ApiResponse::error(
                'ORDER_FORBIDDEN_ROLE',
                "Peran '{$actor->role}' tidak memiliki izin untuk mengakses resource ini.",
                403
            );
        }

        return $next($request);
    }
}
