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
        $authHeader = $request->header('Authorization', '');
        $serviceKey = null;

        if (str_starts_with($authHeader, 'Bearer ')) {
            $serviceKey = substr($authHeader, 7);
        } elseif ($request->header('X-Internal-Service-Key')) {
            $serviceKey = $request->header('X-Internal-Service-Key');
        }

        $expectedServiceKey = config('services.internal.service_key', env('SERVICE_INTERNAL_SERVICE_KEY'));
        $authorizedConsumers = config('services.internal.consumers', []);

        $validKeys = array_filter(array_merge(
            [$expectedServiceKey],
            array_column($authorizedConsumers, 'key')
        ));

        $isValid = false;
        if (! empty($serviceKey)) {
            foreach ($validKeys as $validKey) {
                if (hash_equals((string) $validKey, (string) $serviceKey)) {
                    $isValid = true;
                    break;
                }
            }
        }

        if (! $isValid) {
            return ApiResponse::error(
                'SERVICE_INTERNAL_UNAUTHORIZED',
                'Kredensial M2M antarlayanan internal tidak valid atau tidak disediakan.',
                401
            );
        }

        return $next($request);
    }
}
