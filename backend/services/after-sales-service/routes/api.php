<?php

use App\Http\Controllers\Api\AdminCaseController;
use App\Http\Controllers\Api\AdminReviewController;
use App\Http\Controllers\Api\BusinessCaseController;
use App\Http\Controllers\Api\BusinessReviewController;
use App\Http\Controllers\Api\BusinessWarrantyOptionController;
use App\Http\Controllers\Api\CatalogReviewController;
use App\Http\Controllers\Api\CustomerCaseController;
use App\Http\Controllers\Api\CustomerReviewController;
use App\Http\Controllers\Api\CustomerWarrantyController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/after-sales')->group(function () {
    // 0. Public Health Check
    Route::get('/health', function () {
        return response()->json([
            'service' => 'after-sales-service',
            'status' => 'UP',
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    // 1. Public Catalog & Storefront Reviews (No Auth Required)
    Route::get('/catalog/products/{product_id}/reviews', [CatalogReviewController::class, 'productReviews']);
    Route::get('/catalog/services/{service_id}/reviews', [CatalogReviewController::class, 'serviceReviews']);
    Route::get('/catalog/ratings/summary', [CatalogReviewController::class, 'batchRatingsSummary']);
    Route::get('/businesses/{type}/{org_id}/reputation', [CatalogReviewController::class, 'businessReputation']);
    Route::get('/businesses/{type}/{org_id}/reviews', [CatalogReviewController::class, 'businessReviews']);

    // 2. Customer Routes
    Route::middleware(['after_sales.auth', 'after_sales.role:CUSTOMER'])->group(function () {
        // Warranties
        Route::get('/warranties/summary', [CustomerWarrantyController::class, 'summary']);
        Route::get('/warranties', [CustomerWarrantyController::class, 'index']);
        Route::get('/warranties/{id}', [CustomerWarrantyController::class, 'show']);

        // Cases (Claims & Returns)
        Route::get('/cases', [CustomerCaseController::class, 'index']);
        Route::post('/cases', [CustomerCaseController::class, 'store'])->middleware('after_sales.idempotency');
        Route::get('/cases/{id}', [CustomerCaseController::class, 'show']);
        Route::post('/cases/{id}/evidence', [CustomerCaseController::class, 'addEvidence']);
        Route::post('/cases/{id}/solutions/{proposal_id}/decision', [CustomerCaseController::class, 'submitConsent'])->middleware('after_sales.idempotency');
        Route::post('/cases/{id}/report-issue', [CustomerCaseController::class, 'reportIssue']);
        Route::post('/cases/{id}/return-shipment', [CustomerCaseController::class, 'submitReturnShipment'])->middleware('after_sales.idempotency');
        Route::post('/cases/{id}/confirm-completion', [CustomerCaseController::class, 'confirmCompletion'])->middleware('after_sales.idempotency');

        // Reviews
        Route::post('/reviews', [CustomerReviewController::class, 'store'])->middleware('after_sales.idempotency');
        Route::get('/reviews/my', [CustomerReviewController::class, 'myReview']);
    });

    // 3. Business Routes (Merchant & Provider)
    Route::prefix('business')->middleware(['after_sales.auth', 'after_sales.role:MERCHANT,PROVIDER,SERVICE_PROVIDER'])->group(function () {
        // Warranty Options Management
        Route::get('/warranty-options', [BusinessWarrantyOptionController::class, 'index']);
        Route::post('/warranty-options', [BusinessWarrantyOptionController::class, 'store']);
        Route::get('/warranty-options/{id}', [BusinessWarrantyOptionController::class, 'show']);
        Route::match(['put', 'patch'], '/warranty-options/{id}', [BusinessWarrantyOptionController::class, 'update']);
        Route::post('/warranty-options/{id}/toggle-status', [BusinessWarrantyOptionController::class, 'toggleStatus']);

        // Cases Inbox & Management
        Route::get('/cases', [BusinessCaseController::class, 'index']);
        Route::get('/cases/{id}', [BusinessCaseController::class, 'show']);
        Route::post('/cases/{id}/decision', [BusinessCaseController::class, 'makeDecision']);
        Route::post('/cases/{id}/return-instructions', [BusinessCaseController::class, 'saveReturnInstructions']);
        Route::post('/cases/{id}/return-receipt', [BusinessCaseController::class, 'confirmReturnReceipt']);
        Route::post('/cases/{id}/return-inspection', [BusinessCaseController::class, 'submitReturnInspection']);
        Route::post('/cases/{id}/resolution-action', [BusinessCaseController::class, 'startResolution']);
        Route::post('/cases/{id}/replacement-shipment', [BusinessCaseController::class, 'shipReplacement']);
        Route::post('/cases/{id}/complete', [BusinessCaseController::class, 'completeCase']);

        // Review Inbox & Official Replies
        Route::get('/reviews', [BusinessReviewController::class, 'index']);
        Route::post('/reviews/{review_entry_id}/reply', [BusinessReviewController::class, 'reply']);
    });

    // 4. Admin Operations & Governance Routes
    Route::prefix('admin')->middleware(['after_sales.auth', 'after_sales.role:ADMIN_OPERATIONS,ADMIN,SUPER_ADMIN,CEO_PRODUCT_OWNER'])->group(function () {
        Route::get('/cases', [AdminCaseController::class, 'index']);
        Route::get('/reviews', [AdminReviewController::class, 'index']);
        Route::post('/reviews/{review_id}/moderate', [AdminReviewController::class, 'moderate']);
    });
});
