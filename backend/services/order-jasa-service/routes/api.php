<?php

declare(strict_types=1);

use App\Http\Controllers\AdminOrderController;
use App\Http\Controllers\CustomerOrderController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\ProviderOrderController;
use App\Http\Controllers\WorkerTaskController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/order-jasa')->group(function () {
    // 1. Health & Readiness endpoints
    Route::get('/health', [HealthController::class, 'readiness']);
    Route::get('/liveness', [HealthController::class, 'liveness']);

    // 2. Customer & Shared order read routes
    Route::middleware(['order_jasa.auth', 'order_jasa.role:CUSTOMER,PROVIDER,SERVICE_PROVIDER,WORKER,TECHNICIAN,WORKER_TECHNICIAN,ADMIN_OPERATIONS,ADMIN,FINANCE'])->group(function () {
        Route::get('/orders', [CustomerOrderController::class, 'index']);
        Route::get('/orders/{id}', [CustomerOrderController::class, 'show']);
        Route::get('/orders/{id}/timeline', [CustomerOrderController::class, 'timeline']);
        Route::get('/orders/{id}/payments', [CustomerOrderController::class, 'payments']);
        Route::post('/orders/{id}/payments/retry', [CustomerOrderController::class, 'retryPayment'])->middleware('order_jasa.idempotency');
        Route::post('/orders', [CustomerOrderController::class, 'create'])->middleware('order_jasa.idempotency');
        Route::post('/orders/{id}/complete', [CustomerOrderController::class, 'complete'])->middleware('order_jasa.idempotency');
        Route::post('/orders/{id}/cancel', [CustomerOrderController::class, 'cancel'])->middleware('order_jasa.idempotency');
        Route::post('/orders/{id}/issues', [CustomerOrderController::class, 'raiseIssue'])->middleware('order_jasa.idempotency');
    });

    // 3. Consent route (Customer Remote OR Worker In-Person)
    Route::post('/orders/{id}/consent', [CustomerOrderController::class, 'consent'])
        ->middleware(['order_jasa.auth', 'order_jasa.role:CUSTOMER,WORKER,TECHNICIAN,WORKER_TECHNICIAN,ADMIN_OPERATIONS,ADMIN', 'order_jasa.idempotency']);

    // 4. Provider read & mutation routes
    Route::prefix('provider')->middleware(['order_jasa.auth', 'order_jasa.role:PROVIDER,SERVICE_PROVIDER,ADMIN_OPERATIONS,ADMIN'])->group(function () {
        Route::get('/orders', [ProviderOrderController::class, 'index']);
        Route::get('/technician-recap', [ProviderOrderController::class, 'technicianRecap']);
        Route::get('/orders/{id}', [ProviderOrderController::class, 'show']);
        Route::post('/orders/{id}/accept', [ProviderOrderController::class, 'accept'])->middleware('order_jasa.idempotency');
        Route::post('/orders/{id}/reject', [ProviderOrderController::class, 'reject'])->middleware('order_jasa.idempotency');
        Route::post('/orders/{id}/assign', [ProviderOrderController::class, 'assignWorker'])->middleware('order_jasa.idempotency');
    });

    // 5. Worker read & mutation routes
    Route::prefix('worker')->middleware(['order_jasa.auth', 'order_jasa.role:WORKER,TECHNICIAN,WORKER_TECHNICIAN,ADMIN_OPERATIONS,ADMIN'])->group(function () {
        Route::get('/tasks', [WorkerTaskController::class, 'index']);
        Route::get('/tasks/{assignment_id}', [WorkerTaskController::class, 'show']);
        Route::post('/tasks/{assignment_id}/respond', [WorkerTaskController::class, 'respond'])->middleware('order_jasa.idempotency');
        Route::post('/tasks/{assignment_id}/visit', [WorkerTaskController::class, 'visit'])->middleware('order_jasa.idempotency');
        Route::post('/tasks/{assignment_id}/diagnosis', [WorkerTaskController::class, 'diagnosis'])->middleware('order_jasa.idempotency');
        Route::post('/tasks/{assignment_id}/execution/finish', [WorkerTaskController::class, 'finishExecution'])->middleware('order_jasa.idempotency');
        Route::post('/tasks/{assignment_id}/visit/close', [WorkerTaskController::class, 'closeVisit'])->middleware('order_jasa.idempotency');
        Route::post('/tasks/{assignment_id}/issues', [WorkerTaskController::class, 'raiseIssue'])->middleware('order_jasa.idempotency');
        Route::get('/warranty-jobs', [WorkerTaskController::class, 'warrantyJobs']);
        Route::post('/warranty-jobs/{id}/complete', [WorkerTaskController::class, 'completeWarrantyJob'])->middleware('order_jasa.idempotency');
    });

    // 6. Admin operations routes
    Route::prefix('admin')->middleware(['order_jasa.auth', 'order_jasa.role:ADMIN_OPERATIONS,SUPER_ADMIN,ADMIN,FINANCE,FINANCE_PAYMENT_OPS,FINANCE_OPS'])->group(function () {
        Route::get('/orders/aggregates', [AdminOrderController::class, 'aggregates']);
        Route::get('/orders', [AdminOrderController::class, 'index']);
        Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
        Route::post('/issues/{id}/resolve', [AdminOrderController::class, 'resolveIssue'])->middleware('order_jasa.idempotency');
    });
});
