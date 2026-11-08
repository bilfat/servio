<?php

declare(strict_types=1);

use App\Http\Controllers\InternalCheckoutController;
use App\Http\Controllers\InternalOrderEventController;
use App\Http\Controllers\InternalRefundController;
use Illuminate\Support\Facades\Route;

Route::prefix('internal/v1/finance')->middleware('finance.internal')->group(function () {
    Route::get('/environment', function () {
        $dbName = \Illuminate\Support\Facades\DB::connection()->getDatabaseName();
        $isTest = str_ends_with($dbName, '_test_db') || app()->environment('testing');
        return \App\Support\ApiResponse::success([
            'service' => '06',
            'environment' => app()->environment(),
            'database' => $dbName,
            'is_isolated_test_database' => $isTest,
        ]);
    });

    // 05A Checkout quote & payment intent creation
    Route::get('/active-customer-fee', [\App\Http\Controllers\FeePolicyController::class, 'activeCustomerFee']);
    Route::post('/checkout-quotes', [InternalCheckoutController::class, 'createQuote']);
    Route::post('/service-checkout-quotes', [InternalCheckoutController::class, 'createServiceQuote']);
    Route::post('/checkouts/{checkout_group_id}/payment-intents', [InternalCheckoutController::class, 'createPaymentIntent']);
    Route::get('/checkouts/{checkout_group_id}', [InternalCheckoutController::class, 'showCheckout']);
    Route::get('/payments/{payment_id}', [InternalCheckoutController::class, 'showPayment']);
    Route::post('/payments/{payment_id}/void', [InternalCheckoutController::class, 'voidPaymentIntent']);

    // 05A Cancellation refund
    Route::post('/refunds/order-cancellations', [InternalRefundController::class, 'processCancellationRefund']);
    Route::post('/refunds/after-sales', [InternalRefundController::class, 'processAfterSalesRefund']);
    Route::get('/refunds/by-order/{merchant_order_id}', [InternalRefundController::class, 'showByOrder']);
    Route::get('/refunds/{id}', [InternalRefundController::class, 'showRefund']);

    // 05A Order lifecycle events
    Route::post('/order-events', [InternalOrderEventController::class, 'handleOrderEvent']);

    // Matured held funds release trigger (120-hour elapsed)
    Route::post('/held-funds/process-matured', [InternalOrderEventController::class, 'processMaturedFunds']);
    Route::get('/held-funds/by-order/{merchant_order_id}', [InternalOrderEventController::class, 'showHeldFundByOrder']);
    Route::post('/held-funds/by-order/{merchant_order_id}/release', [InternalOrderEventController::class, 'releaseHeldFundByOrder']);
});
