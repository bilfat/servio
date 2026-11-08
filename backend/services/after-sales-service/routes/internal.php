<?php

use App\Http\Controllers\Internal\InternalAfterSalesController;
use Illuminate\Support\Facades\Route;

Route::prefix('internal/v1/after-sales')->middleware('after_sales.internal')->group(function () {
    Route::get('/environment', function () {
        $dbName = \Illuminate\Support\Facades\DB::connection()->getDatabaseName();
        $isTest = str_ends_with($dbName, '_test_db') || app()->environment('testing');
        return \App\Support\ApiResponse::success([
            'service' => '07',
            'environment' => app()->environment(),
            'database' => $dbName,
            'is_isolated_test_database' => $isTest,
        ]);
    });

    Route::get('/ping', function () {
        return \App\Support\ApiResponse::success(['service' => 'after-sales-service', 'status' => 'PONG']);
    });

    // 1. Warranty Eligibility Check (03 Product / 04 Offering)
    Route::get('/warranty-options/{id}/eligibility', [InternalAfterSalesController::class, 'checkOptionEligibility']);

    // 2. Order Warranty Snapshot Record (05A Order Barang / 05B Order Jasa)
    Route::post('/order-warranty-snapshots', [InternalAfterSalesController::class, 'recordWarrantySnapshot']);

    // 3. Order Completion Entitlement Activation (05A / 05B)
    Route::post('/order-completions', [InternalAfterSalesController::class, 'handleOrderCompletion']);

    // 4. External Status Updates (05A Fulfillment, 05B Warranty Job, 06 Finance Refund, 09 Support)
    Route::post('/cases/{id}/external-update', [InternalAfterSalesController::class, 'handleExternalUpdate']);
});
