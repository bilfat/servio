<?php

use App\Http\Controllers\CategoryAuditController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CategoryMasterController;
use App\Http\Controllers\CategoryRequestController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\SubcategoryController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // U01: Service health check
    Route::get('/health', [HealthController::class, 'check']);

    // C01: Master roots list (PRODUK / JASA)
    Route::get('/category-masters', [CategoryMasterController::class, 'index'])
        ->middleware('category.auth:optional');

    // C02: Full category tree
    Route::get('/categories/tree', [CategoryController::class, 'tree'])
        ->middleware('category.auth:optional');

    // C03: List categories
    Route::get('/categories', [CategoryController::class, 'index'])
        ->middleware('category.auth:optional');

    // C04: Get category detail
    Route::get('/categories/{id}', [CategoryController::class, 'show'])
        ->middleware('category.auth:optional');

    // C05: Create Category (Admin Operations)
    Route::post('/categories', [CategoryController::class, 'store'])
        ->middleware(['category.auth:required', 'category.perm:category.taxonomy.create', 'category.idempotency']);

    // C06: Edit Category (Admin Operations)
    Route::patch('/categories/{id}', [CategoryController::class, 'update'])
        ->middleware(['category.auth:required', 'category.perm:category.taxonomy.update', 'category.idempotency']);

    // C07: Change Category Status (Admin Operations)
    Route::patch('/categories/{id}/status', [CategoryController::class, 'changeStatus'])
        ->middleware(['category.auth:required', 'category.perm:category.taxonomy.change_status', 'category.idempotency']);

    // C08: Guarded Hard Delete Category (Admin Operations)
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy'])
        ->middleware(['category.auth:required', 'category.perm:category.taxonomy.hard_delete', 'category.idempotency']);

    // S01: List subcategories
    Route::get('/subcategories', [SubcategoryController::class, 'index'])
        ->middleware('category.auth:optional');

    // S02: Get subcategory detail
    Route::get('/subcategories/{id}', [SubcategoryController::class, 'show'])
        ->middleware('category.auth:optional');

    // S03: Create Subcategory (Admin Operations)
    Route::post('/subcategories', [SubcategoryController::class, 'store'])
        ->middleware(['category.auth:required', 'category.perm:category.taxonomy.create', 'category.idempotency']);

    // S04: Edit Subcategory (Admin Operations)
    Route::patch('/subcategories/{id}', [SubcategoryController::class, 'update'])
        ->middleware(['category.auth:required', 'category.perm:category.taxonomy.update', 'category.idempotency']);

    // S05: Change Subcategory Status (Admin Operations)
    Route::patch('/subcategories/{id}/status', [SubcategoryController::class, 'changeStatus'])
        ->middleware(['category.auth:required', 'category.perm:category.taxonomy.change_status', 'category.idempotency']);

    // S06: Guarded Hard Delete Subcategory (Admin Operations)
    Route::delete('/subcategories/{id}', [SubcategoryController::class, 'destroy'])
        ->middleware(['category.auth:required', 'category.perm:category.taxonomy.hard_delete', 'category.idempotency']);

    // R01: List Category Requests (Admin/CEO all, Business roles own)
    Route::get('/category-requests', [CategoryRequestController::class, 'index'])
        ->middleware(['category.auth:required', 'category.perm:category.request.read_scoped']);

    // R02: Get Category Request Detail
    Route::get('/category-requests/{id}', [CategoryRequestController::class, 'show'])
        ->middleware(['category.auth:required', 'category.perm:category.request.read_scoped']);

    // R03: Submit Category Suggestion (Merchant, Provider, Supplier)
    Route::post('/category-requests', [CategoryRequestController::class, 'store'])
        ->middleware(['category.auth:required', 'category.perm:category.request.submit', 'category.idempotency']);

    // R04: Review Category Suggestion (Admin Operations)
    Route::patch('/category-requests/{id}/review', [CategoryRequestController::class, 'review'])
        ->middleware(['category.auth:required', 'category.perm:category.request.review', 'category.idempotency']);

    // A01: Get Category Audit Logs (Admin Operations & CEO)
    Route::get('/category-audit', [CategoryAuditController::class, 'index'])
        ->middleware(['category.auth:required', 'category.perm:category.audit.read']);
});
