<?php

declare(strict_types=1);

use App\Http\Controllers\InternalCheckoutController;
use App\Http\Controllers\InternalOrderEventController;
use App\Http\Controllers\InternalRefundController;
use Illuminate\Support\Facades\Route;

Route::prefix('internal/v1/finance')->middleware('finance.internal')->group(function () {
    // 05A Checkout quote & payment intent creation
    Route::post('/checkout-quotes', [InternalCheckoutController::class, 'createQuote']);
    Route::post('/checkouts/{checkout_group_id}/payment-intents', [InternalCheckoutController::class, 'createPaymentIntent']);
    Route::get('/checkouts/{checkout_group_id}', [InternalCheckoutController::class, 'showCheckout']);
    Route::get('/payments/{payment_id}', [InternalCheckoutController::class, 'showPayment']);

    // 05A Cancellation refund
    Route::post('/refunds/order-cancellations', [InternalRefundController::class, 'processCancellationRefund']);
    Route::get('/refunds/by-order/{merchant_order_id}', [InternalRefundController::class, 'showByOrder']);

    // 05A Order lifecycle events
    Route::post('/order-events', [InternalOrderEventController::class, 'handleOrderEvent']);

    // Matured held funds release trigger (120-hour elapsed)
    Route::post('/held-funds/process-matured', [InternalOrderEventController::class, 'processMaturedFunds']);
});
