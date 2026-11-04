<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\WorkerAssignmentAttempt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin WorkerAssignmentAttempt
 */
class WorkerTaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $order = $this->order;
        $booking = $this->booking;

        return [
            'assignment_id' => $this->id,
            'attempt_no' => $this->attempt_no,
            'worker_id' => $this->worker_id,
            'provider_org_id' => $this->provider_org_id,
            'status' => $this->status, // ASSIGNED, ACCEPTED, REJECTED, EXPIRED, CANCELLED
            'assigned_at' => $this->assigned_at?->toIso8601String(),
            'response_due_at' => $this->response_due_at?->toIso8601String(),
            'accepted_at' => $this->accepted_at?->toIso8601String(),
            'rejected_at' => $this->rejected_at?->toIso8601String(),
            'order' => $order ? [
                'id' => $order->id,
                'order_no' => $order->order_no,
                'service_snapshot' => $order->service_snapshot,
                'recipient_snapshot' => $order->recipient_snapshot,
                'address_snapshot' => $order->address_snapshot,
                'complaint_text' => $order->complaint_text,
                'symptoms' => $order->symptoms_json,
                'status' => $order->status,
                'phase' => $order->phase,
            ] : null,
            'schedule' => $booking ? [
                'start_at' => $booking->scheduled_start_at?->toIso8601String(),
                'end_at' => $booking->scheduled_end_at?->toIso8601String(),
                'timezone' => $booking->timezone,
            ] : null,
            'visit' => $order?->visit ? [
                'status' => $order->visit->status,
                'otw_at' => $order->visit->otw_at?->toIso8601String(),
                'arrived_at' => $order->visit->arrived_at?->toIso8601String(),
            ] : null,
        ];
    }
}
