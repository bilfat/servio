<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Message;
use App\Models\UserPresence;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConversationController extends Controller
{
    /**
     * Resolve current user context from standard gateway headers.
     */
    protected function getAuthUser(Request $request): array
    {
        return [
            'id' => $request->header('X-Actor-User-Id') ?: $request->header('X-User-Id') ?: 'user-guest-001',
            'role' => strtoupper($request->header('X-Actor-Role') ?: $request->header('X-User-Role') ?: 'CUSTOMER'),
            'name' => $request->header('X-Actor-Name') ?: 'User',
            'avatar' => $request->header('X-Actor-Avatar') ?: null,
        ];
    }

    /**
     * Initiate or find existing continuous conversation (Shopee/Tokopedia style).
     */
    public function initiate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_user_id' => 'required|string',
            'target_entity_type' => 'required|string|in:customer,merchant,worker,provider,support',
            'target_entity_id' => 'required|string',
            'target_display_name' => 'required|string',
            'target_avatar_url' => 'nullable|string',
            'my_entity_type' => 'nullable|string|in:customer,merchant,worker,provider,support',
            'my_entity_id' => 'nullable|string',
            'my_display_name' => 'nullable|string',
            'my_avatar_url' => 'nullable|string',
        ]);

        $me = $this->getAuthUser($request);
        $myUserId = $me['id'];
        $myEntityType = $validated['my_entity_type'] ?? strtolower($me['role']);
        $myEntityId = $validated['my_entity_id'] ?? $myUserId;
        $myDisplayName = $validated['my_display_name'] ?? $me['name'];
        $myAvatarUrl = $validated['my_avatar_url'] ?? $me['avatar'];

        $targetUserId = $validated['target_user_id'];
        $targetEntityType = $validated['target_entity_type'];
        $targetEntityId = $validated['target_entity_id'];
        $targetDisplayName = $validated['target_display_name'];
        $targetAvatarUrl = $validated['target_avatar_url'] ?? null;

        // Check if there is an existing direct conversation between me and the target entity
        $existingConvId = DB::table('conversation_participants as p1')
            ->join('conversation_participants as p2', 'p1.conversation_id', '=', 'p2.conversation_id')
            ->join('conversations as c', 'c.id', '=', 'p1.conversation_id')
            ->where('c.type', 'direct')
            ->where(function ($q) use ($myUserId, $myEntityId) {
                $q->where('p1.user_id', $myUserId)
                  ->orWhere('p1.entity_id', $myUserId)
                  ->orWhere('p1.entity_id', $myEntityId);
            })
            ->where(function ($q) use ($targetUserId, $targetEntityId) {
                $q->where('p2.user_id', $targetUserId)
                  ->orWhere('p2.entity_id', $targetEntityId)
                  ->orWhere('p2.entity_id', $targetUserId)
                  ->orWhere('p2.user_id', $targetEntityId);
            })
            ->value('c.id');

        if ($existingConvId) {
            $conversation = Conversation::with(['participants', 'lastMessage'])->find($existingConvId);
            return ApiResponse::success([
                'conversation' => $conversation,
                'is_new' => false,
            ], 'Percakapan berhasil ditemukan.');
        }

        // Create new continuous conversation
        $conversation = DB::transaction(function () use (
            $myUserId,
            $myEntityType,
            $myEntityId,
            $myDisplayName,
            $myAvatarUrl,
            $targetUserId,
            $targetEntityType,
            $targetEntityId,
            $targetDisplayName,
            $targetAvatarUrl
        ) {
            $conv = Conversation::create([
                'id' => (string) Str::uuid(),
                'type' => 'direct',
            ]);

            // Add Current User participant
            ConversationParticipant::create([
                'id' => (string) Str::uuid(),
                'conversation_id' => $conv->id,
                'user_id' => $myUserId,
                'entity_type' => $myEntityType,
                'entity_id' => $myEntityId,
                'display_name' => $myDisplayName,
                'avatar_url' => $myAvatarUrl,
                'unread_count' => 0,
            ]);

            // Add Target participant
            ConversationParticipant::create([
                'id' => (string) Str::uuid(),
                'conversation_id' => $conv->id,
                'user_id' => $targetUserId,
                'entity_type' => $targetEntityType,
                'entity_id' => $targetEntityId,
                'display_name' => $targetDisplayName,
                'avatar_url' => $targetAvatarUrl,
                'unread_count' => 0,
            ]);

            return $conv->load('participants');
        });

        return ApiResponse::success([
            'conversation' => $conversation,
            'is_new' => true,
        ], 201, [], 'Percakapan baru berhasil dibuat.');
    }

    /**
     * List user's conversations (Inbox).
     */
    public function index(Request $request): JsonResponse
    {
        $me = $this->getAuthUser($request);
        $myUserId = $me['id'];

        $participants = ConversationParticipant::where(function ($q) use ($myUserId) {
                $q->where('user_id', $myUserId)
                  ->orWhere('entity_id', $myUserId);
            })
            ->with(['conversation.participants', 'conversation.lastMessage'])
            ->orderBy('updated_at', 'desc')
            ->get();

        $inbox = $participants->map(function ($myPart) use ($myUserId) {
            $conv = $myPart->conversation;
            if (!$conv) return null;

            $partner = $conv->participants->firstWhere('user_id', '!=', $myUserId)
                ?? $conv->participants->first();

            // Presence check
            $presence = $partner ? UserPresence::find($partner->user_id) : null;

            return [
                'conversation_id' => $conv->id,
                'type' => $conv->type,
                'partner' => [
                    'user_id' => $partner?->user_id,
                    'entity_type' => $partner?->entity_type,
                    'entity_id' => $partner?->entity_id,
                    'display_name' => $partner?->display_name ?? 'Lawan Bicara',
                    'avatar_url' => $partner?->avatar_url,
                    'is_online' => $presence?->is_online ?? false,
                    'last_seen_at' => $presence?->last_seen_at?->toIso8601String(),
                ],
                'unread_count' => $myPart->unread_count,
                'last_message' => $conv->lastMessage ? [
                    'id' => $conv->lastMessage->id,
                    'body' => $conv->lastMessage->body,
                    'type' => $conv->lastMessage->type,
                    'status' => $conv->lastMessage->status,
                    'created_at' => $conv->lastMessage->created_at->toIso8601String(),
                    'is_me' => $conv->lastMessage->sender_id === $myUserId,
                ] : null,
                'updated_at' => $conv->updated_at->toIso8601String(),
            ];
        })->filter()->values();

        return ApiResponse::success([
            'total_unread' => $inbox->sum('unread_count'),
            'conversations' => $inbox,
        ]);
    }

    /**
     * Get single conversation details.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $me = $this->getAuthUser($request);
        $conv = Conversation::with(['participants'])->find($id);

        if (!$conv) {
            return ApiResponse::error('CONVERSATION_NOT_FOUND', 'Percakapan tidak ditemukan.', 404);
        }

        $partner = $conv->participants->firstWhere('user_id', '!=', $me['id'])
            ?? $conv->participants->first();

        $presence = $partner ? UserPresence::find($partner->user_id) : null;

        return ApiResponse::success([
            'conversation' => $conv,
            'partner' => [
                'user_id' => $partner?->user_id,
                'entity_type' => $partner?->entity_type,
                'entity_id' => $partner?->entity_id,
                'display_name' => $partner?->display_name,
                'avatar_url' => $partner?->avatar_url,
                'is_online' => $presence?->is_online ?? false,
                'last_seen_at' => $presence?->last_seen_at?->toIso8601String(),
            ],
        ]);
    }
}
