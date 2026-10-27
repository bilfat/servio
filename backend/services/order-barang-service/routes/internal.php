<?php

declare(strict_types=1);

use App\Http\Controllers\InternalOrderEventController;
use Illuminate\Support\Facades\Route;

Route::prefix('internal/v1/order-barang')->middleware('order.internal')->group(function () {
    // Ingest events from Finance Service 06 (confirmed, failed, expired)
    Route::post('/finance-events', [InternalOrderEventController::class, 'handleFinanceEvent']);

    // Internal query endpoints for Finance / Governance reconciliation
    Route::get('/checkouts/{checkout_group_id}', [InternalOrderEventController::class, 'showCheckout']);
    Route::get('/orders/{id}', [InternalOrderEventController::class, 'showOrder']);

    // Hold / dispute notifications from Modul 07 / 09
    Route::post('/holds/order-events', [InternalOrderEventController::class, 'handleHoldEvent']);
});
