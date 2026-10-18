<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireInternalServiceKey
{
    /**
     * Map of operation/route authorization rules:
     * Defines which consumers are authorized for specific internal endpoints.
     */
    protected array $operationAuthorizations = [
        'internal/v1/taxonomy/reference-claims' => [
            'product-service',
            'service-offering-service',
            'order-service',
            'catalog-service',
            'cart-service',
            'booking-service',
            'promotion-service',
        ],
        'internal/v1/taxonomy/reference-checks/prepare' => [
            'category-orchestrator',
        ],
        'internal/v1/taxonomy/eligibility/check' => [
            'product-service',
            'service-offering-service',
            'order-service',
            'catalog-service',
            'cart-service',
            'booking-service',
            'promotion-service',
            'identity-service',
        ],
        'internal/v1/taxonomy/masters' => [
            'product-service',
            'service-offering-service',
            'order-service',
            'catalog-service',
            'cart-service',
            'booking-service',
            'promotion-service',
            'identity-service',
        ],
        'internal/v1/taxonomy/tree' => [
            'product-service',
            'service-offering-service',
            'order-service',
            'catalog-service',
            'cart-service',
            'booking-service',
            'promotion-service',
            'identity-service',
        ],
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $providedKey = $request->header('X-Internal-Service-Key');

        if (empty($providedKey)) {
            return ApiResponse::error(
                'CATEGORY_INTERNAL_AUTH_FAILED',
                'Akses M2M antarlayanan ditolak. Kunci internal tidak disertakan.',
                403
            );
        }

        // 1. Derive caller consumer service identity strictly from validated credentials
        $consumers = config('services.internal.consumers', []);
        $derivedConsumer = null;

        foreach ($consumers as $consumerName => $consumerConf) {
            $configuredKey = $consumerConf['key'] ?? null;
            if (! empty($configuredKey) && hash_equals((string) $configuredKey, (string) $providedKey)) {
                $derivedConsumer = $consumerName;
                break;
            }
        }

        if ($derivedConsumer === null) {
            return ApiResponse::error(
                'CATEGORY_INTERNAL_AUTH_FAILED',
                'Akses M2M antarlayanan ditolak. Kunci internal tidak valid.',
                403
            );
        }

        // 2. Reject cross-consumer claims / caller header impersonation
        // If caller presents X-Consumer-Service header, it MUST match the derived identity.
        $providedConsumerHeader = $request->header('X-Consumer-Service');
        if (! empty($providedConsumerHeader) && $providedConsumerHeader !== $derivedConsumer) {
            return ApiResponse::error(
                'CATEGORY_CONSUMER_IMPERSONATION_DENIED',
                "Kredensial M2M milik '{$derivedConsumer}', tidak diizinkan menyamar sebagai '{$providedConsumerHeader}'.",
                403
            );
        }

        // 3. Operation-level authorization per internal route
        $path = $request->path();
        foreach ($this->operationAuthorizations as $routePrefix => $allowedList) {
            if (str_starts_with($path, $routePrefix)) {
                if (! in_array($derivedConsumer, $allowedList, true)) {
                    return ApiResponse::error(
                        'CATEGORY_INTERNAL_OPERATION_UNAUTHORIZED',
                        "Layanan '{$derivedConsumer}' tidak memiliki otorisasi untuk operasi '{$path}'.",
                        403
                    );
                }
                break;
            }
        }

        // 4. Bind the derived, validated caller identity to request attributes
        $request->attributes->set('internal_consumer_service', $derivedConsumer);

        return $next($request);
    }
}

