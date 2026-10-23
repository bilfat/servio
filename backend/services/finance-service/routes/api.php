<?php

declare(strict_types=1);

use App\Http\Controllers\BankDestinationController;
use App\Http\Controllers\CustomerPaymentController;
use App\Http\Controllers\DemoSimulationController;
use App\Http\Controllers\FeePolicyController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\OpsFinanceController;
use App\Http\Controllers\SPayController;
use App\Http\Controllers\WithdrawalController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/finance')->group(function () {
    // Health Check
    Route::get('/health', [HealthController::class, 'check']);

    // Tax References (Authenticated)
    Route::get('/tax-references', [FeePolicyController::class, 'taxReferences'])
        ->middleware('finance.auth');

    // Fee Policies (CEO & Finance Ops)
    Route::post('/policies', [FeePolicyController::class, 'store'])
        ->middleware(['finance.auth', 'finance.role:CEO_PRODUCT_OWNER', 'finance.idempotency']);

    Route::get('/policies', [FeePolicyController::class, 'index'])
        ->middleware(['finance.auth', 'finance.role:CEO_PRODUCT_OWNER,FINANCE_PAYMENT_OPS,ADMIN_OPERATIONS']);

    Route::get('/policies/{group_id}', [FeePolicyController::class, 'show'])
        ->middleware(['finance.auth', 'finance.role:CEO_PRODUCT_OWNER,FINANCE_PAYMENT_OPS,ADMIN_OPERATIONS']);

    Route::post('/policies/{group_id}/publish', [FeePolicyController::class, 'publish'])
        ->middleware(['finance.auth', 'finance.role:CEO_PRODUCT_OWNER', 'finance.idempotency']);

    Route::post('/policies/{group_id}/revisions', [FeePolicyController::class, 'createRevision'])
        ->middleware(['finance.auth', 'finance.role:CEO_PRODUCT_OWNER', 'finance.idempotency']);

    // CEO Revenue Overview
    Route::get('/revenue/overview', [FeePolicyController::class, 'revenueOverview'])
        ->middleware(['finance.auth', 'finance.role:CEO_PRODUCT_OWNER,FINANCE_PAYMENT_OPS']);

    // Customer Payment Read, Receipt, and Refunds
    Route::get('/payments/{payment_id}', [CustomerPaymentController::class, 'show'])
        ->middleware('finance.auth');

    Route::get('/payments/{payment_id}/receipt', [CustomerPaymentController::class, 'receipt'])
        ->middleware('finance.auth');

    Route::get('/me/refunds', [CustomerPaymentController::class, 'customerRefunds'])
        ->middleware(['finance.auth', 'finance.role:CUSTOMER']);

    // S-Pay Accounts & Movements
    Route::get('/spay/me', [SPayController::class, 'myAccount'])
        ->middleware(['finance.auth', 'finance.role:CUSTOMER']);

    Route::get('/spay/me/movements', [SPayController::class, 'myMovements'])
        ->middleware(['finance.auth', 'finance.role:CUSTOMER']);

    Route::get('/spay/organizations/{org_id}', [SPayController::class, 'organizationAccount'])
        ->middleware(['finance.auth', 'finance.role:MERCHANT,FINANCE_PAYMENT_OPS']);

    Route::get('/spay/organizations/{org_id}/movements', [SPayController::class, 'organizationMovements'])
        ->middleware(['finance.auth', 'finance.role:MERCHANT,FINANCE_PAYMENT_OPS']);

    Route::get('/held-funds', [SPayController::class, 'heldFunds'])
        ->middleware(['finance.auth', 'finance.role:MERCHANT,FINANCE_PAYMENT_OPS']);

    // Bank Destinations
    Route::get('/bank-destinations', [BankDestinationController::class, 'index'])
        ->middleware('finance.auth');

    Route::post('/bank-destinations', [BankDestinationController::class, 'store'])
        ->middleware(['finance.auth', 'finance.idempotency']);

    Route::post('/bank-destinations/{id}/verify-demo', [BankDestinationController::class, 'verifyDemo'])
        ->middleware(['finance.auth', 'finance.demo', 'finance.role:FINANCE_PAYMENT_OPS']);

    // Withdrawals
    Route::post('/withdrawals/quote', [WithdrawalController::class, 'quote'])
        ->middleware('finance.auth');

    Route::post('/withdrawals', [WithdrawalController::class, 'store'])
        ->middleware(['finance.auth', 'finance.idempotency']);

    Route::get('/withdrawals', [WithdrawalController::class, 'index'])
        ->middleware('finance.auth');

    Route::get('/withdrawals/{id}', [WithdrawalController::class, 'show'])
        ->middleware('finance.auth');

    // Demo Simulations (MOCK & Non-Production Only)
    Route::prefix('demo')->middleware(['finance.auth', 'finance.role:FINANCE_PAYMENT_OPS', 'finance.demo'])->group(function () {
        Route::post('/payments/{payment_id}/simulate', [DemoSimulationController::class, 'simulatePayment']);
        Route::post('/withdrawals/{withdrawal_id}/simulate', [DemoSimulationController::class, 'simulateWithdrawal']);
    });

    // Ops Finance
    Route::prefix('ops')->middleware(['finance.auth', 'finance.role:FINANCE_PAYMENT_OPS'])->group(function () {
        Route::get('/payments', [OpsFinanceController::class, 'payments']);
        Route::get('/payment-allocations', [OpsFinanceController::class, 'paymentAllocations']);
        Route::get('/refunds', [OpsFinanceController::class, 'refunds']);
        Route::get('/withdrawals', [OpsFinanceController::class, 'withdrawals']);
        Route::get('/reconciliation', [OpsFinanceController::class, 'reconciliation']);
        Route::get('/audit-logs', [OpsFinanceController::class, 'auditLogs']);
    });
});
