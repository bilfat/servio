<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireFinanceRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        /** @var AuthenticatedActor|null $actor */
        $actor = $request->attributes->get('actor');

        if (!$actor || $actor->isGuest) {
            return ApiResponse::error(
                'FINANCE_UNAUTHENTICATED',
                'Autentikasi diperlukan.',
                401
            );
        }

        $allowedRoles = array_map('strtoupper', $roles);
        if (!in_array($actor->role, $allowedRoles, true)) {
            return ApiResponse::error(
                'FINANCE_FORBIDDEN',
                'Peran Anda (' . $actor->role . ') tidak memiliki izin untuk tindakan ini.',
                403
            );
        }

        return $next($request);
    }
}
