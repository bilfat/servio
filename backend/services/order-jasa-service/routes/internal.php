<?php

declare(strict_types=1);

use App\Http\Controllers\InternalOrderJasaController;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Route;

Route::prefix('internal/v1/order-jasa')->middleware('order_jasa.internal')->group(function () {
    Route::get('/environment', function () {
        $dbName = \Illuminate\Support\Facades\DB::connection()->getDatabaseName();
        $isTest = str_ends_with($dbName, '_test_db') || app()->environment('testing');
        return ApiResponse::success([
            'service' => '05B',
            'environment' => app()->environment(),
            'database' => $dbName,
            'is_isolated_test_database' => $isTest,
        ]);
    });

    Route::get('/ping', function () {
        return ApiResponse::success(['service' => 'order-jasa-service', 'status' => 'PONG']);
    });

    // Inbound Finance Service 06 events (confirmed, failed, expired)
    Route::post('/finance-events', [InternalOrderJasaController::class, 'handleFinanceEvent']);

    // S2S Order details query
    Route::get('/orders/{id}', [InternalOrderJasaController::class, 'show']);

    // Real Warranty Job for Phase 07 Rework
    Route::post('/warranty-jobs', [InternalOrderJasaController::class, 'createWarrantyJob']);
    Route::get('/warranty-jobs/{id}', [InternalOrderJasaController::class, 'showWarrantyJob']);
    Route::post('/warranty-jobs/{id}/complete', [InternalOrderJasaController::class, 'completeWarrantyJob']);

    // Matured 120-hour escrow release trigger
    Route::post('/held-funds/process-matured', [InternalOrderJasaController::class, 'processMaturedHeldFunds']);
});
