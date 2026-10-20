<?php

use App\Http\Controllers\InternalProductController;
use Illuminate\Support\Facades\Route;

Route::prefix('internal/v1')->middleware('product.internal')->group(function () {
    // I01: Verify historical category references for Category Guarded Hard Delete
    Route::post('/category-references/check', [InternalProductController::class, 'checkCategoryReferences']);

    // I02: Product & variant price/stock snapshot for future Order Service
    Route::get('/products/{id}/variants/{variant_id}/snapshot', [InternalProductController::class, 'getVariantSnapshot']);
});
