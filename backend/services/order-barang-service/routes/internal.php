<?php

declare(strict_types=1);

use App\Http\Controllers\InternalOrderEventController;
use Illuminate\Support\Facades\Route;

Route::prefix('internal/v1/order-barang')->middleware('order.internal')->group(function () {
    Route::get('/environment', function () {
        $dbName = \Illuminate\Support\Facades\DB::connection()->getDatabaseName();
        $isTest = str_ends_with($dbName, '_test_db') || app()->environment('testing');
        return \App\Support\ApiResponse::success([
            'service' => '05A',
            'environment' => app()->environment(),
            'database' => $dbName,
            'is_isolated_test_database' => $isTest,
        ]);
    });

    // Ingest events from Finance Service 06 (confirmed, failed, expired)
    Route::post('/finance-events', [InternalOrderEventController::class, 'handleFinanceEvent']);

    // Internal query endpoints for Finance / Governance reconciliation
    Route::get('/checkouts/{checkout_group_id}', [InternalOrderEventController::class, 'showCheckout']);
    Route::get('/orders/{id}', [InternalOrderEventController::class, 'showOrder']);

    // Real Replacement Fulfillment for Phase 07
    Route::post('/replacements', [InternalOrderEventController::class, 'createReplacement']);
    Route::get('/replacements/{id}', [InternalOrderEventController::class, 'showReplacement']);
    Route::post('/replacements/{id}/deliver', [InternalOrderEventController::class, 'deliverReplacement']);

    // Hold / dispute notifications from Modul 07 / 09
    Route::post('/holds/order-events', [InternalOrderEventController::class, 'handleHoldEvent']);
});
