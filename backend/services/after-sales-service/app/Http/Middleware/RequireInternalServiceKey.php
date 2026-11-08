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
        $expectedInternalKey = (string) config('after_sales.internal_service_key');
        $providedKey = (string) ($request->header('X-Internal-Service-Key') ?: $request->header('X-Service-Token') ?: '');

        $validKeys = array_filter(array_merge(
            [$expectedInternalKey],
            array_values(config('after_sales.s2s', []))
        ));

        $isValid = false;
        foreach ($validKeys as $validKey) {
            if (!empty($validKey) && hash_equals((string) $validKey, $providedKey)) {
                $isValid = true;
                break;
            }
        }

        if (!$isValid || empty($providedKey)) {
            return ApiResponse::error(
                'AFTER_SALES_UNAUTHORIZED_SERVICE',
                'Kunci layanan internal tidak valid atau tidak disediakan.',
                401
            );
        }

        return $next($request);
    }
}

