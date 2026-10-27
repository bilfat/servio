<?php

declare(strict_types=1);

use App\Http\Controllers\AdminOrderController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CustomerCheckoutController;
use App\Http\Controllers\CustomerOrderController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MerchantDeliverySettingController;
use App\Http\Controllers\MerchantOrderController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/order-barang')->group(function () {
    // Health Check
    Route::get('/health', [HealthController::class, 'check']);

    // Public Delivery Check (Calculates Haversine distance & checks merchant max radius)
    Route::get('/delivery-check', [MerchantDeliverySettingController::class, 'checkDelivery']);

    // -------------------------------------------------------------
    // Customer Endpoints
    // -------------------------------------------------------------
    Route::middleware(['order.auth', 'order.role:CUSTOMER'])->group(function () {
        // Cart
        Route::get('/cart', [CartController::class, 'index']);
        Route::post('/cart/items', [CartController::class, 'addItem'])->middleware('order.idempotency');
        Route::patch('/cart/items/{item_id}', [CartController::class, 'updateItem']);
        Route::delete('/cart/items/{item_id}', [CartController::class, 'removeItem']);

        // Checkout & Payment
        Route::post('/checkout-quotes', [CustomerCheckoutController::class, 'quote']);
        Route::post('/checkouts', [CustomerCheckoutController::class, 'checkout'])->middleware('order.idempotency');
        Route::post('/checkouts/{id}/payment-intents', [CustomerCheckoutController::class, 'createPaymentIntent'])->middleware('order.idempotency');
        Route::get('/checkouts/{id}', [CustomerCheckoutController::class, 'showCheckout']);
        Route::get('/checkouts/{id}/payment', [CustomerCheckoutController::class, 'showPayment']);
        Route::post('/checkouts/{id}/cancel-unpaid', [CustomerCheckoutController::class, 'cancelUnpaid'])->middleware('order.idempotency');

        // Customer Orders
        Route::get('/orders', [CustomerOrderController::class, 'index']);
        Route::get('/orders/{id}', [CustomerOrderController::class, 'show']);
        Route::post('/orders/{id}/cancel', [CustomerOrderController::class, 'cancel'])->middleware('order.idempotency');
        Route::post('/orders/{id}/cancellation-requests', [CustomerOrderController::class, 'requestCancellation'])->middleware('order.idempotency');
        Route::get('/orders/{id}/cancellation-requests', [CustomerOrderController::class, 'cancellationRequests']);
        Route::post('/orders/{id}/confirm-received', [CustomerOrderController::class, 'confirmReceived'])->middleware('order.idempotency');
        Route::get('/orders/{id}/receipt-context', [CustomerOrderController::class, 'receiptContext']);
    });

    // -------------------------------------------------------------
    // Merchant Endpoints
    // -------------------------------------------------------------
    Route::middleware(['order.auth', 'order.role:MERCHANT'])->group(function () {
        // Delivery Settings & Tiers
        Route::get('/merchant/delivery-settings', [MerchantDeliverySettingController::class, 'show']);
        Route::put('/merchant/delivery-settings', [MerchantDeliverySettingController::class, 'update'])->middleware('order.idempotency');

        // Merchant Orders
        Route::get('/merchant/orders', [MerchantOrderController::class, 'index']);
        Route::get('/merchant/orders/{id}', [MerchantOrderController::class, 'show']);
        Route::post('/merchant/orders/{id}/process', [MerchantOrderController::class, 'process'])->middleware('order.idempotency');
        Route::post('/merchant/orders/{id}/pack', [MerchantOrderController::class, 'pack'])->middleware('order.idempotency');
        Route::put('/merchant/orders/{id}/delivery', [MerchantOrderController::class, 'updateDelivery']);
        Route::post('/merchant/orders/{id}/dispatch', [MerchantOrderController::class, 'dispatch'])->middleware('order.idempotency');
        Route::post('/merchant/orders/{id}/delivered', [MerchantOrderController::class, 'delivered'])->middleware('order.idempotency');
        Route::post('/merchant/orders/{id}/delivery-failure', [MerchantOrderController::class, 'deliveryFailure'])->middleware('order.idempotency');
        Route::post('/merchant/orders/{id}/delivery-retry', [MerchantOrderController::class, 'deliveryRetry'])->middleware('order.idempotency');
        Route::post('/merchant/orders/{id}/cancel', [MerchantOrderController::class, 'cancel'])->middleware('order.idempotency');
        Route::post('/merchant/cancellation-requests/{id}/decision', [MerchantOrderController::class, 'decideCancellationRequest'])->middleware('order.idempotency');
    });

    // -------------------------------------------------------------
    // Admin Global Orders Endpoints (Read-Only)
    // -------------------------------------------------------------
    Route::middleware(['order.auth', 'order.role:ADMIN_OPERATIONS,CEO_PRODUCT_OWNER'])->prefix('admin')->group(function () {
        Route::get('/orders', [AdminOrderController::class, 'index']);
        Route::get('/orders/counts', [AdminOrderController::class, 'counts']);
        Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
    });
});

