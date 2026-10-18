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

        // 1. Single official M2M credential contract: X-Internal-Service-Key
        $providedKey = $request->header('X-Internal-Service-Key');

        if (empty($providedKey) || ! hash_equals((string) $expectedKey, (string) $providedKey)) {
            return ApiResponse::error(
                'CATEGORY_INTERNAL_AUTH_FAILED',
                'Akses M2M antarlayanan ditolak. Kunci internal tidak valid.',
                403
            );
        }

        // 2. Validate and bind caller consumer service identity
        $consumerService = $request->header('X-Consumer-Service');
        $allowedConsumers = config('services.internal.allowed_consumers', [
            'product-service',
            'service-offering-service',
            'order-service',
            'catalog-service',
            'cart-service',
            'booking-service',
            'promotion-service',
        ]);

        if (! empty($consumerService)) {
            if (! in_array($consumerService, $allowedConsumers, true)) {
                return ApiResponse::error(
                    'CATEGORY_INTERNAL_CALLER_UNAUTHORIZED',
                    "Layanan pemanggil '{$consumerService}' tidak terdaftar sebagai consumer resmi.",
                    403
                );
            }
            $request->attributes->set('internal_consumer_service', $consumerService);
        }

        return $next($request);
    }
}
