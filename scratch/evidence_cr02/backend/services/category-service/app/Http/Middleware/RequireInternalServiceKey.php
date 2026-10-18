<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireInternalServiceKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $expectedKey = config('services.identity.internal_key', env('CATEGORY_INTERNAL_SERVICE_KEY'));

        if (empty($expectedKey)) {
            return ApiResponse::error(
                'CATEGORY_INTERNAL_CONFIG_MISSING',
                'Kredensial M2M antarlayanan belum dikonfigurasi pada server.',
                500
            );
        }

        // Single official M2M contract: X-Internal-Service-Key
        $providedKey = $request->header('X-Internal-Service-Key');

        if (empty($providedKey) || ! hash_equals((string) $expectedKey, (string) $providedKey)) {
            return ApiResponse::error(
                'CATEGORY_INTERNAL_AUTH_FAILED',
                'Akses M2M antarlayanan ditolak. Kunci internal tidak valid.',
                403
            );
        }

        return $next($request);
    }
}
