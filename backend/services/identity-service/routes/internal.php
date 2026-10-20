<?php

use App\Http\Controllers\Internal\InternalIdentityController;
use Illuminate\Support\Facades\Route;

Route::prefix('internal/v1')->middleware('identity.internal')->group(function () {
    // I01: POST /internal/v1/auth/sessions/introspect
    Route::post('/auth/sessions/introspect', [InternalIdentityController::class, 'introspectSession']);

    // I02: POST /internal/v1/authorization/evaluate
    Route::post('/authorization/evaluate', [InternalIdentityController::class, 'evaluateAuthorization']);

    // I03: GET /internal/v1/users/{id}/access-context
    Route::get('/users/{id}/access-context', [InternalIdentityController::class, 'getUserAccessContext']);

    // I04: GET /internal/v1/organizations/{id}/status
    Route::get('/organizations/{id}/status', [InternalIdentityController::class, 'getOrganizationStatus']);

    // I05: GET /internal/v1/organizations/{id}/public-profile (CR-IDENTITY-004)
    Route::get('/organizations/{id}/public-profile', [InternalIdentityController::class, 'getOrganizationPublicProfile']);
});
