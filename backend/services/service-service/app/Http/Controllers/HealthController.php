<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function check(): JsonResponse
    {
        $dbReady = false;
        try {
            DB::connection()->getPdo();
            $dbReady = true;
        } catch (\Throwable $e) {
            $dbReady = false;
        }

        return ApiResponse::success([
            'service' => 'servio-service-service',
            'version' => 'v1',
            'status' => $dbReady ? 'UP' : 'DEGRADED',
            'database' => $dbReady ? 'CONNECTED' : 'DISCONNECTED',
            'timestamp' => now()->toISOString(),
        ], 'SERVICE_HEALTH_OK');
    }
}
