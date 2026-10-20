<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function check(): JsonResponse
    {
        return ApiResponse::success([
            'service' => 'product-service',
            'status' => 'HEALTHY',
            'timestamp' => now()->toIso8601String(),
        ], 'PRODUCT_HEALTH_OK', 200);
    }
}
