<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HealthController
{
    /**
     * Readiness check - verifies local DB connection and dependencies.
     */
    public function readiness(Request $request): JsonResponse
    {
        $dbConnected = false;
        $dbError = null;

        try {
            DB::connection()->getPdo();
            $dbConnected = true;
        } catch (\Throwable $e) {
            $dbError = 'Database connection failed';
        }

        $featureGates = config('order_jasa.feature_gates', []);

        $status = $dbConnected ? 'HEALTHY' : 'DEGRADED';
        $httpCode = $dbConnected ? 200 : 503;

        return ApiResponse::success([
            'service' => 'servio-order-jasa-service',
            'status' => $status,
            'timestamp' => now()->toIso8601String(),
            'checks' => [
                'database' => [
                    'status' => $dbConnected ? 'UP' : 'DOWN',
                    'error' => $dbError,
                ],
                'feature_gates' => $featureGates,
            ],
        ], $httpCode, [], $dbConnected ? 'ORDER_JASA_HEALTHY' : 'ORDER_JASA_DEGRADED');
    }

    /**
     * Simple liveness check.
     */
    public function liveness(): JsonResponse
    {
        return ApiResponse::success([
            'service' => 'servio-order-jasa-service',
            'status' => 'UP',
            'time' => now()->toIso8601String(),
        ], 200);
    }
}
