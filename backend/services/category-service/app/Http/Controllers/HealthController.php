<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    /**
     * U01: GET /api/v1/health
     */
    public function check(): JsonResponse
    {
        $dbConnected = false;
        try {
            DB::connection()->getPdo();
            $dbConnected = true;
        } catch (\Throwable $e) {
            $dbConnected = false;
        }

        $data = [
            'service' => 'category-service',
            'status' => $dbConnected ? 'UP' : 'DEGRADED',
            'database' => $dbConnected ? 'CONNECTED' : 'DISCONNECTED',
            'version' => '1.0.0',
            'timestamp' => now()->toIso8601String(),
        ];

        return ApiResponse::success($data, 'CATEGORY_SERVICE_HEALTHY', $dbConnected ? 200 : 503);
    }
}
