<?php

use App\Http\Controllers\HealthController;
use App\Http\Controllers\MerchantMediaController;
use App\Http\Controllers\MerchantProductController;
use App\Http\Controllers\MerchantVariantController;
use App\Http\Controllers\ProductCatalogController;
use App\Http\Controllers\ProductGovernanceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // U01: Service health check
    Route::get('/health', [HealthController::class, 'check']);

    // P01: Public product listing
    Route::get('/products', [ProductCatalogController::class, 'index'])
        ->middleware('product.auth:optional');

    // P02: Public product detail
    Route::get('/products/{id}', [ProductCatalogController::class, 'show'])
        ->middleware('product.auth:optional');

    // P03: Public merchant storefront
    Route::get('/merchants/{merchant_organization_id}/storefront', [ProductCatalogController::class, 'storefront'])
        ->middleware('product.auth:optional');

    // P04: Media delivery
    Route::get('/product-media/{media_id}', [ProductCatalogController::class, 'media'])
        ->middleware('product.auth:optional');

    // M01: List own products
    Route::get('/merchant/products', [MerchantProductController::class, 'index'])
        ->middleware(['product.auth:required', 'product.perm:product.own.read']);

    // M02: Get product admin detail
    Route::get('/merchant/products/{id}', [MerchantProductController::class, 'show'])
        ->middleware(['product.auth:required', 'product.perm:product.own.read']);

    // M03: Create product draft
    Route::post('/merchant/products', [MerchantProductController::class, 'store'])
        ->middleware(['product.auth:required', 'product.perm:product.own.create', 'product.idempotency']);

    // M04: Edit product basic info
    Route::patch('/merchant/products/{id}', [MerchantProductController::class, 'update'])
        ->middleware(['product.auth:required', 'product.perm:product.own.update', 'product.idempotency']);

    // M05: Change product status (activate / deactivate)
    Route::patch('/merchant/products/{id}/status', [MerchantProductController::class, 'changeStatus'])
        ->middleware(['product.auth:required', 'product.perm:product.own.status', 'product.idempotency']);

    // M06: Archive product (soft delete)
    Route::delete('/merchant/products/{id}', [MerchantProductController::class, 'destroy'])
        ->middleware(['product.auth:required', 'product.perm:product.own.delete', 'product.idempotency']);

    // M07: Add variant
    Route::post('/merchant/products/{id}/variants', [MerchantVariantController::class, 'store'])
        ->middleware(['product.auth:required', 'product.perm:product.variant.manage', 'product.idempotency']);

    // M08: Edit variant
    Route::patch('/merchant/products/{id}/variants/{variant_id}', [MerchantVariantController::class, 'update'])
        ->middleware(['product.auth:required', 'product.perm:product.variant.manage', 'product.idempotency']);

    // M09: Change variant status
    Route::patch('/merchant/products/{id}/variants/{variant_id}/status', [MerchantVariantController::class, 'changeStatus'])
        ->middleware(['product.auth:required', 'product.perm:product.variant.manage', 'product.idempotency']);

    // M10: Archive variant
    Route::delete('/merchant/products/{id}/variants/{variant_id}', [MerchantVariantController::class, 'destroy'])
        ->middleware(['product.auth:required', 'product.perm:product.variant.manage', 'product.idempotency']);

    // M11: Upload product media
    Route::post('/merchant/products/{id}/media', [MerchantMediaController::class, 'store'])
        ->middleware(['product.auth:required', 'product.perm:product.media.manage', 'product.idempotency']);

    // M12: Reorder product media
    Route::put('/merchant/products/{id}/media/order', [MerchantMediaController::class, 'reorder'])
        ->middleware(['product.auth:required', 'product.perm:product.media.manage', 'product.idempotency']);

    // M13: Delete product media
    Route::delete('/merchant/products/{id}/media/{media_id}', [MerchantMediaController::class, 'destroy'])
        ->middleware(['product.auth:required', 'product.perm:product.media.manage', 'product.idempotency']);

    // G01: List products for governance
    Route::get('/governance/products', [ProductGovernanceController::class, 'index'])
        ->middleware(['product.auth:required', 'product.perm:product.governance.read']);

    // G02: Get product governance detail
    Route::get('/governance/products/{id}', [ProductGovernanceController::class, 'show'])
        ->middleware(['product.auth:required', 'product.perm:product.governance.read']);

    // G03: Product audit logs
    Route::get('/product-audit', [ProductGovernanceController::class, 'audit'])
        ->middleware(['product.auth:required', 'product.perm:product.audit.read']);
});
