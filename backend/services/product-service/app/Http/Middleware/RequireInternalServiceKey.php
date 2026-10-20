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
        $providedKey = $request->header('X-Internal-Service-Key');

        if (empty($providedKey)) {
            return ApiResponse::error(
                'PRODUCT_INTERNAL_AUTH_FAILED',
                'Akses M2M antarlayanan ditolak. Kunci internal tidak disertakan.',
                403
            );
        }

        $consumers = config('services.internal.consumers', []);
        $derivedConsumer = null;

        foreach ($consumers as $consumerName => $consumerConf) {
            $configuredKey = $consumerConf['key'] ?? null;
            if (! empty($configuredKey) && hash_equals((string) $configuredKey, (string) $providedKey)) {
                $derivedConsumer = $consumerName;
                break;
            }
        }

        $defaultServiceKey = config('services.internal.service_key');
        if ($derivedConsumer === null && ! empty($defaultServiceKey) && hash_equals((string) $defaultServiceKey, (string) $providedKey)) {
            $derivedConsumer = 'internal-service';
        }

        if ($derivedConsumer === null) {
            return ApiResponse::error(
                'PRODUCT_INTERNAL_AUTH_FAILED',
                'Akses M2M antarlayanan ditolak. Kunci internal tidak valid.',
                403
            );
        }

        $providedConsumerHeader = $request->header('X-Consumer-Service');
        if (! empty($providedConsumerHeader) && $providedConsumerHeader !== $derivedConsumer && $derivedConsumer !== 'internal-service') {
            return ApiResponse::error(
                'PRODUCT_CONSUMER_IMPERSONATION_DENIED',
                "Kredensial M2M milik '{$derivedConsumer}', tidak diizinkan menyamar sebagai '{$providedConsumerHeader}'.",
                403
            );
        }

        $request->attributes->set('internal_consumer_service', $derivedConsumer);

        return $next($request);
    }
}
