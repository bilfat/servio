<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\UserPresence;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresenceController extends Controller
{
    /**
     * Heartbeat / update active status and active room.
     */
    public function heartbeat(Request $request): JsonResponse
    {
        $userId = $request->header('X-Actor-User-Id') ?: $request->header('X-User-Id') ?: $request->input('user_id');
        if (!$userId) {
            return ApiResponse::error('USER_ID_REQUIRED', 'Identitas pengguna diperlukan.', 400);
        }

        $activeConversationId = $request->input('active_conversation_id');
        $isOnline = $request->boolean('is_online', true);

        $presence = UserPresence::updateOrCreate(
            ['user_id' => $userId],
            [
                'is_online' => $isOnline,
                'active_conversation_id' => $activeConversationId,
                'last_seen_at' => now(),
            ]
        );

        return ApiResponse::success([
            'user_id' => $presence->user_id,
            'is_online' => $presence->is_online,
            'last_seen_at' => $presence->last_seen_at->toIso8601String(),
        ]);
    }

    /**
     * Get presence info for a specific user.
     */
    public function show(string $userId): JsonResponse
    {
        $presence = UserPresence::find($userId);

        return ApiResponse::success([
            'user_id' => $userId,
            'is_online' => $presence?->is_online ?? false,
            'last_seen_at' => $presence?->last_seen_at?->toIso8601String(),
        ]);
    }
}
