<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireInternalServiceKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $expectedKey = config('finance.internal_service_key') ?: config('services.internal.service_key');
        $providedKey = (string) ($request->header('X-Internal-Service-Key') ?: $request->bearerToken());

        if (empty($expectedKey) || empty($providedKey) || !hash_equals((string) $expectedKey, $providedKey)) {
            return ApiResponse::error(
                'FINANCE_UNAUTHORIZED_SERVICE',
                'Kredensial internal service tidak valid atau tidak disediakan.',
                401
            );
        }

        return $next($request);
    }
}
