<?php

use App\Http\Controllers\InternalServiceController;
use Illuminate\Support\Facades\Route;

Route::prefix('internal/v1')->middleware('service.internal')->group(function () {
    // I01: Check offering eligibility and return snapshot for Modul 05B Order Jasa
    Route::post('/service-offerings/{id}/eligibility', [InternalServiceController::class, 'checkOfferingEligibility']);

    // I02: Offering catalog snapshot
    Route::get('/service-offerings/{id}/catalog-snapshot', [InternalServiceController::class, 'getCatalogSnapshot']);

    // I03: Category reference existence check for Category Guarded Hard Delete
    Route::post('/category-references/check', [InternalServiceController::class, 'checkCategoryReferences']);

    // I04: Service definition status
    Route::get('/service-definitions/{id}/status', [InternalServiceController::class, 'getDefinitionStatus']);

    // I05: Capability status
    Route::get('/capabilities/{id}/status', [InternalServiceController::class, 'getCapabilityStatus']);

    // I06: Worker capabilities eligibility check
    Route::post('/worker-capabilities/eligibility', [InternalServiceController::class, 'checkWorkerCapabilities']);

    // I07: Integrations health
    Route::get('/integrations/health', [InternalServiceController::class, 'health']);
});
