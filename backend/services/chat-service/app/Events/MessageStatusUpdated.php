<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $conversationId;
    public string $status;
    public array $messageIds;

    public function __construct(string $conversationId, string $status, array $messageIds = [])
    {
        $this->conversationId = $conversationId;
        $this->status = $status;
        $this->messageIds = $messageIds;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('chat.' . $this->conversationId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.status_updated';
    }

    public function broadcastWith(): array
    {
        return [
            'conversation_id' => $this->conversationId,
            'status' => $this->status, // 'delivered' or 'read'
            'message_ids' => $this->messageIds,
            'updated_at' => now()->toIso8601String(),
        ];
    }
}
