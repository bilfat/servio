<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function check(): JsonResponse
    {
        $dbStatus = 'OK';
        try {
            DB::connection()->getPdo();
        } catch (\Throwable $e) {
            $dbStatus = 'DISCONNECTED: ' . $e->getMessage();
        }

        return ApiResponse::success([
            'service' => 'order-barang-service',
            'phase' => '05A',
            'status' => $dbStatus === 'OK' ? 'HEALTHY' : 'DEGRADED',
            'database' => $dbStatus,
            'database_name' => DB::connection()->getDatabaseName(),
            'php_version' => PHP_VERSION,
            'timestamp' => now()->toIso8601String(),
        ], 'ORDER_SERVICE_HEALTHY');
    }
}
