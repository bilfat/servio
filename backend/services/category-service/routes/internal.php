<?php

use App\Http\Controllers\Internal\InternalTaxonomyController;
use Illuminate\Support\Facades\Route;

Route::prefix('internal/v1')->middleware('category.internal')->group(function () {
    // I01: Eligibility check for consumer services
    Route::post('/taxonomy/eligibility/check', [InternalTaxonomyController::class, 'checkEligibility']);

    // I02: Internal master roots query
    Route::get('/taxonomy/masters', [InternalTaxonomyController::class, 'getMasters']);

    // I03: Internal full tree query
    Route::get('/taxonomy/tree', [InternalTaxonomyController::class, 'getTree']);

    // I04: Register reference claim
    Route::post('/taxonomy/reference-claims', [InternalTaxonomyController::class, 'storeClaim']);

    // I05: Get reference claim detail
    Route::get('/taxonomy/reference-claims/{id}', [InternalTaxonomyController::class, 'showClaim']);

    // I06: Prepare reference check / delete fence
    Route::post('/taxonomy/reference-checks/prepare', [InternalTaxonomyController::class, 'prepareReferenceCheck']);
});
