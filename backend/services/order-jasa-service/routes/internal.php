<?php

declare(strict_types=1);

use App\Http\Controllers\InternalOrderJasaController;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Route;

Route::prefix('internal/v1/order-jasa')->middleware('order_jasa.internal')->group(function () {
    Route::get('/ping', function () {
        return ApiResponse::success(['service' => 'order-jasa-service', 'status' => 'PONG']);
    });

    // Inbound Finance Service 06 events (confirmed, failed, expired)
    Route::post('/finance-events', [InternalOrderJasaController::class, 'handleFinanceEvent']);

    // S2S Order details query
    Route::get('/orders/{id}', [InternalOrderJasaController::class, 'show']);

    // Matured 120-hour escrow release trigger
    Route::post('/held-funds/process-matured', [InternalOrderJasaController::class, 'processMaturedHeldFunds']);
});
