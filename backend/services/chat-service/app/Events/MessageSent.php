<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Message $message;

    /**
     * Create a new event instance.
     */
    public function __construct(Message $message)
    {
        $this->message = $message;
    }

    /**
     * Get the channels the event should broadcast on.
     * Broadcast to conversation channel and also to receiver's private channel (for navbar badge).
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('chat.' . $this->message->conversation_id),
        ];
    }

    /**
     * Broadcast as custom event name.
     */
    public function broadcastAs(): string
    {
        return 'message.new';
    }

    /**
     * Payload for the event.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'client_msg_id' => $this->message->client_msg_id,
            'conversation_id' => $this->message->conversation_id,
            'sender_id' => $this->message->sender_id,
            'sender_entity_type' => $this->message->sender_entity_type,
            'type' => $this->message->type,
            'body' => $this->message->body,
            'media_url' => $this->message->media_url,
            'context_metadata' => $this->message->context_metadata,
            'status' => $this->message->status,
            'created_at' => $this->message->created_at->toIso8601String(),
        ];
    }
}
