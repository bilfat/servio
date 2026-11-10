<?php

use App\Http\Controllers\ConversationController;
use App\Http\Controllers\MediaUploadController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\PresenceController;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SERVIO Chat Service API Routes (v1)
|--------------------------------------------------------------------------
*/

Route::get('/health', function () {
    return ApiResponse::success([
        'service' => 'servio-chat-service',
        'status' => 'UP',
        'port' => 8009,
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::prefix('v1/chat')->group(function () {
    // 1. Conversations
    Route::post('/conversations/initiate', [ConversationController::class, 'initiate']);
    Route::get('/conversations', [ConversationController::class, 'index']);
    Route::get('/conversations/{id}', [ConversationController::class, 'show']);

    // 2. Messages
    Route::get('/conversations/{id}/messages', [MessageController::class, 'index']);
    Route::post('/conversations/{id}/messages', [MessageController::class, 'store']);
    Route::patch('/conversations/{id}/status', [MessageController::class, 'updateStatus']);

    // 3. Media Upload (Photos & Camera)
    Route::post('/upload-media', [MediaUploadController::class, 'upload']);

    // 4. Presence & Heartbeat
    Route::post('/presence/heartbeat', [PresenceController::class, 'heartbeat']);
    Route::get('/presence/{userId}', [PresenceController::class, 'show']);
});
