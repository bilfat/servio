<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;

class RequireInternalServiceKey
{
    public function handle(Request $request, Closure $next)
    {
        $expectedKey = env('IDENTITY_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026');

        $providedKey = $request->header('X-Internal-Service-Key')
            ?? $request->bearerToken();

        if (empty($providedKey) || !hash_equals($expectedKey, (string) $providedKey)) {
            return ApiResponse::error(
                'IDENTITY_PERMISSION_DENIED',
                'Akses layanan internal tidak sah atau kredensial mesin salah.',
                403
            );
        }

        return $next($request);
    }
}
