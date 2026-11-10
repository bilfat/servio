<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Events\MessageStatusUpdated;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Message;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MessageController extends Controller
{
    protected function getAuthUser(Request $request): array
    {
        return [
            'id' => $request->header('X-Actor-User-Id') ?: $request->header('X-User-Id') ?: 'user-guest-001',
            'role' => strtoupper($request->header('X-Actor-Role') ?: $request->header('X-User-Role') ?: 'CUSTOMER'),
        ];
    }

    /**
     * Get paginated messages for a conversation.
     */
    public function index(Request $request, string $conversationId): JsonResponse
    {
        $me = $this->getAuthUser($request);
        $myUserId = $me['id'];

        $conversation = Conversation::find($conversationId);
        if (!$conversation) {
            return ApiResponse::error('CONVERSATION_NOT_FOUND', 'Percakapan tidak ditemukan.', 404);
        }

        $limit = min((int) $request->query('limit', 50), 100);
        $before = $request->query('before'); // cursor ISO timestamp

        $query = Message::where('conversation_id', $conversationId)
            ->orderBy('created_at', 'asc');

        if ($before) {
            $query->where('created_at', '<', $before);
        }

        $messages = $query->take($limit)->get();

        return ApiResponse::success([
            'conversation_id' => $conversationId,
            'messages' => $messages->map(function ($msg) use ($myUserId) {
                return [
                    'id' => $msg->id,
                    'client_msg_id' => $msg->client_msg_id,
                    'conversation_id' => $msg->conversation_id,
                    'sender_id' => $msg->sender_id,
                    'sender_entity_type' => $msg->sender_entity_type,
                    'is_me' => $msg->sender_id === $myUserId,
                    'type' => $msg->type,
                    'body' => $msg->body,
                    'media_url' => $msg->media_url,
                    'context_metadata' => $msg->context_metadata,
                    'status' => $msg->status, // pending, sent, delivered, read
                    'read_at' => $msg->read_at?->toIso8601String(),
                    'created_at' => $msg->created_at->toIso8601String(),
                ];
            }),
        ]);
    }

    /**
     * Send a new message (text, media, or contextual card).
     */
    public function store(Request $request, string $conversationId): JsonResponse
    {
        $validated = $request->validate([
            'client_msg_id' => 'nullable|string',
            'type' => 'required|string|in:text,image,context_catalog,context_order,context_warranty',
            'body' => 'nullable|string',
            'media_url' => 'nullable|string',
            'context_metadata' => 'nullable|array',
        ]);

        $me = $this->getAuthUser($request);
        $myUserId = $me['id'];
        $myRole = strtolower($me['role']);

        $conversation = Conversation::with('participants')->find($conversationId);
        if (!$conversation) {
            return ApiResponse::error('CONVERSATION_NOT_FOUND', 'Percakapan tidak ditemukan.', 404);
        }

        $msgId = (string) Str::uuid();

        $message = DB::transaction(function () use (
            $msgId,
            $conversation,
            $myUserId,
            $myRole,
            $validated
        ) {
            $msg = Message::create([
                'id' => $msgId,
                'conversation_id' => $conversation->id,
                'sender_id' => $myUserId,
                'sender_entity_type' => $myRole,
                'client_msg_id' => $validated['client_msg_id'] ?? null,
                'type' => $validated['type'],
                'body' => $validated['body'] ?? null,
                'media_url' => $validated['media_url'] ?? null,
                'context_metadata' => $validated['context_metadata'] ?? null,
                'status' => 'sent', // Ack status: centang 1 (✓)
            ]);

            // Update conversation last message pointer
            $conversation->update([
                'last_message_id' => $msg->id,
                'last_message_at' => $msg->created_at,
            ]);

            // Increment unread count for other participants
            ConversationParticipant::where('conversation_id', $conversation->id)
                ->where('user_id', '!=', $myUserId)
                ->increment('unread_count');

            return $msg;
        });

        // Trigger Reverb Broadcast Event if class exists
        if (class_exists(MessageSent::class)) {
            broadcast(new MessageSent($message))->toOthers();
        }

        return ApiResponse::success([
            'message' => [
                'id' => $message->id,
                'client_msg_id' => $message->client_msg_id,
                'conversation_id' => $message->conversation_id,
                'sender_id' => $message->sender_id,
                'sender_entity_type' => $message->sender_entity_type,
                'is_me' => true,
                'type' => $message->type,
                'body' => $message->body,
                'media_url' => $message->media_url,
                'context_metadata' => $message->context_metadata,
                'status' => 'sent',
                'created_at' => $message->created_at->toIso8601String(),
            ],
        ], 201, [], 'Pesan berhasil dikirim.');
    }

    /**
     * Update delivery status (WhatsApp-style: delivered / read).
     */
    public function updateStatus(Request $request, string $conversationId): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:delivered,read',
            'message_ids' => 'nullable|array',
            'message_ids.*' => 'string',
        ]);

        $me = $this->getAuthUser($request);
        $myUserId = $me['id'];
        $status = $validated['status'];
        $messageIds = $validated['message_ids'] ?? [];

        $query = Message::where('conversation_id', $conversationId)
            ->where('sender_id', '!=', $myUserId);

        if (!empty($messageIds)) {
            $query->whereIn('id', $messageIds);
        } else {
            // If empty, apply to all unread messages in conversation
            $query->where('status', '!=', 'read');
        }

        $updatePayload = ['status' => $status];
        if ($status === 'read') {
            $updatePayload['read_at'] = now();

            // Reset unread count for current user
            ConversationParticipant::where('conversation_id', $conversationId)
                ->where('user_id', $myUserId)
                ->update(['unread_count' => 0, 'last_read_at' => now()]);
        }

        $updatedCount = $query->update($updatePayload);

        // Broadcast status update event to sender
        if (class_exists(MessageStatusUpdated::class)) {
            broadcast(new MessageStatusUpdated($conversationId, $status, $messageIds))->toOthers();
        }

        return ApiResponse::success([
            'status' => $status,
            'updated_count' => $updatedCount,
        ], 'Status pesan berhasil diperbarui.');
    }
}
