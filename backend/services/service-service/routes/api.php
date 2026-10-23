<?php

use App\Http\Controllers\AdminCapabilityController;
use App\Http\Controllers\AdminServiceDefinitionController;
use App\Http\Controllers\AdminServiceDefinitionRequestController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\ProviderServiceDefinitionRequestController;
use App\Http\Controllers\ProviderServiceMediaController;
use App\Http\Controllers\ProviderServiceOfferingController;
use App\Http\Controllers\ProviderWorkerCapabilityController;
use App\Http\Controllers\ServiceCatalogController;
use App\Http\Controllers\ServiceGovernanceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Health check
    Route::get('/health', [HealthController::class, 'check']);

    // P01: Public service catalog listing
    Route::get('/services', [ServiceCatalogController::class, 'index'])
        ->middleware('service.auth:optional');

    // P02: Public service detail
    Route::get('/services/{id}', [ServiceCatalogController::class, 'show'])
        ->middleware('service.auth:optional');

    // P03: Public provider storefront
    Route::get('/providers/{provider_org_id}/services', [ServiceCatalogController::class, 'storefront'])
        ->middleware('service.auth:optional');

    // P04: Canonical service definitions
    Route::get('/service-definitions', [ServiceCatalogController::class, 'definitions'])
        ->middleware('service.auth:optional');

    // P05: Capabilities list
    Route::get('/capabilities', [ServiceCatalogController::class, 'capabilities'])
        ->middleware('service.auth:optional');

    // P06: Media delivery
    Route::get('/service-media/{media_id}', [ServiceCatalogController::class, 'media'])
        ->middleware('service.auth:optional');

    // M01: Provider list own services
    Route::get('/provider/services', [ProviderServiceOfferingController::class, 'index'])
        ->middleware(['service.auth:required', 'service.perm:service.offering.read_own']);

    // M02: Provider show own service detail
    Route::get('/provider/services/{id}', [ProviderServiceOfferingController::class, 'show'])
        ->middleware(['service.auth:required', 'service.perm:service.offering.read_own']);

    // M03: Provider create service draft
    Route::post('/provider/services', [ProviderServiceOfferingController::class, 'store'])
        ->middleware(['service.auth:required', 'service.perm:service.offering.create', 'service.idempotency']);

    // M04: Provider update service basic info & pricing
    Route::patch('/provider/services/{id}', [ProviderServiceOfferingController::class, 'update'])
        ->middleware(['service.auth:required', 'service.perm:service.offering.update_own', 'service.idempotency']);

    // M05: Provider publish directly to ACTIVE or deactivate to INACTIVE
    Route::patch('/provider/services/{id}/status', [ProviderServiceOfferingController::class, 'changeStatus'])
        ->middleware(['service.auth:required', 'service.perm:service.offering.publish_own', 'service.idempotency']);

    // M06: Provider replace coverage cities
    Route::put('/provider/services/{id}/coverage-cities', [ProviderServiceOfferingController::class, 'updateCoverageCities'])
        ->middleware(['service.auth:required', 'service.perm:service.offering.update_own', 'service.idempotency']);

    // M07: Provider replace capabilities
    Route::put('/provider/services/{id}/capabilities', [ProviderServiceOfferingController::class, 'updateCapabilities'])
        ->middleware(['service.auth:required', 'service.perm:service.offering.update_own', 'service.idempotency']);

    // M08: Provider upload media
    Route::post('/provider/services/{id}/media', [ProviderServiceMediaController::class, 'store'])
        ->middleware(['service.auth:required', 'service.perm:service.offering.update_own']);

    // M09: Provider reorder media & set primary
    Route::put('/provider/services/{id}/media/order', [ProviderServiceMediaController::class, 'reorder'])
        ->middleware(['service.auth:required', 'service.perm:service.offering.update_own', 'service.idempotency']);

    // M10: Provider delete media
    Route::delete('/provider/services/{id}/media/{media_id}', [ProviderServiceMediaController::class, 'destroy'])
        ->middleware(['service.auth:required', 'service.perm:service.offering.update_own', 'service.idempotency']);

    // M11: Provider archive service
    Route::delete('/provider/services/{id}', [ProviderServiceOfferingController::class, 'destroy'])
        ->middleware(['service.auth:required', 'service.perm:service.offering.archive_own', 'service.idempotency']);

    // R01: Submit canonical definition request
    Route::post('/provider/service-definition-requests', [ProviderServiceDefinitionRequestController::class, 'store'])
        ->middleware(['service.auth:required', 'service.perm:service.definition_request.submit', 'service.idempotency']);

    // R02: List own definition requests
    Route::get('/provider/service-definition-requests', [ProviderServiceDefinitionRequestController::class, 'index'])
        ->middleware(['service.auth:required', 'service.perm:service.definition_request.read_own']);

    // R03: Show own definition request
    Route::get('/provider/service-definition-requests/{id}', [ProviderServiceDefinitionRequestController::class, 'show'])
        ->middleware(['service.auth:required', 'service.perm:service.definition_request.read_own']);

    // W01: List worker capabilities
    Route::get('/provider/worker-capabilities', [ProviderWorkerCapabilityController::class, 'index'])
        ->middleware(['service.auth:required', 'service.perm:service.worker_capability.manage_own_org']);

    // W02: Update worker capabilities
    Route::put('/provider/workers/{worker_user_id}/capabilities', [ProviderWorkerCapabilityController::class, 'updateWorkerCapabilities'])
        ->middleware(['service.auth:required', 'service.perm:service.worker_capability.manage_own_org', 'service.idempotency']);

    // A01: Admin list canonical definitions
    Route::get('/admin/service-definitions', [AdminServiceDefinitionController::class, 'index'])
        ->middleware(['service.auth:required', 'service.perm:service.definition.read_all']);

    // A02: Admin create canonical definition
    Route::post('/admin/service-definitions', [AdminServiceDefinitionController::class, 'store'])
        ->middleware(['service.auth:required', 'service.perm:service.definition.manage', 'service.idempotency']);

    // A03: Admin show canonical definition
    Route::get('/admin/service-definitions/{id}', [AdminServiceDefinitionController::class, 'show'])
        ->middleware(['service.auth:required', 'service.perm:service.definition.read_all']);

    // A04: Admin update canonical definition
    Route::patch('/admin/service-definitions/{id}', [AdminServiceDefinitionController::class, 'update'])
        ->middleware(['service.auth:required', 'service.perm:service.definition.manage', 'service.idempotency']);

    // A05: Admin change canonical definition status
    Route::patch('/admin/service-definitions/{id}/status', [AdminServiceDefinitionController::class, 'changeStatus'])
        ->middleware(['service.auth:required', 'service.perm:service.definition.manage', 'service.idempotency']);

    // A06: Admin upload definition media
    Route::post('/admin/service-definitions/{id}/media', [AdminServiceDefinitionController::class, 'storeMedia'])
        ->middleware(['service.auth:required', 'service.perm:service.definition.manage']);

    // A07: Admin delete definition media
    Route::delete('/admin/service-definitions/{id}/media/{media_id}', [AdminServiceDefinitionController::class, 'destroyMedia'])
        ->middleware(['service.auth:required', 'service.perm:service.definition.manage', 'service.idempotency']);

    // A08: Admin list definition requests
    Route::get('/admin/service-definition-requests', [AdminServiceDefinitionRequestController::class, 'index'])
        ->middleware(['service.auth:required', 'service.perm:service.definition_request.read_all']);

    // A09: Admin review definition request
    Route::patch('/admin/service-definition-requests/{id}/review', [AdminServiceDefinitionRequestController::class, 'review'])
        ->middleware(['service.auth:required', 'service.perm:service.definition_request.review', 'service.idempotency']);

    // A10: Admin list capabilities
    Route::get('/admin/capabilities', [AdminCapabilityController::class, 'index'])
        ->middleware(['service.auth:required', 'service.perm:service.capability.read_all']);

    // A11: Admin create capability master
    Route::post('/admin/capabilities', [AdminCapabilityController::class, 'store'])
        ->middleware(['service.auth:required', 'service.perm:service.capability.manage', 'service.idempotency']);

    // A12: Admin update capability master
    Route::patch('/admin/capabilities/{id}', [AdminCapabilityController::class, 'update'])
        ->middleware(['service.auth:required', 'service.perm:service.capability.manage', 'service.idempotency']);

    // G01: Governance catalog oversight
    Route::get('/governance/service-offerings', [ServiceGovernanceController::class, 'index'])
        ->middleware(['service.auth:required', 'service.perm:service.offering.read_all']);

    // G02: Governance offering detail
    Route::get('/governance/service-offerings/{id}', [ServiceGovernanceController::class, 'show'])
        ->middleware(['service.auth:required', 'service.perm:service.offering.read_all']);

    // G03: Governance audit log
    Route::get('/service-audit', [ServiceGovernanceController::class, 'audit'])
        ->middleware(['service.auth:required', 'service.perm:service.audit.read']);
});
