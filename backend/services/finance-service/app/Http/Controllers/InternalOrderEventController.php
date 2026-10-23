<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Finance\Funds\HeldFundService;
use App\Domain\Finance\Refunds\RefundExecutionService;
use App\Http\Requests\OrderEventRequest;
use App\Models\InboxEvent;
use App\Models\PaymentAllocation;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class InternalOrderEventController extends Controller
{
    public function __construct(
        private readonly HeldFundService $heldFundService,
        private readonly RefundExecutionService $refundService,
    ) {}

    public function handleOrderEvent(OrderEventRequest $request): JsonResponse
    {
        $data = $request->validated();
        $eventId = $data['event_id'];
        $eventType = $data['event_type'];
        $merchantOrderId = $data['merchant_order_id'];
        $payload = $data['payload'];

        // Strict whitelist of supported events
        if (!in_array($eventType, ['ORDER_COMPLETED', 'ORDER_HOLD_CHANGED', 'ORDER_CANCELLED'], true)) {
            return ApiResponse::error('UNSUPPORTED_EVENT_TYPE', "Jenis event {$eventType} tidak didukung oleh handler keuangan ini.", 422);
        }

        // Idempotent inbox record
        $inbox = InboxEvent::firstOrCreate(
            [
                'source_service' => '05A_ORDER_SERVICE',
                'source_event_id' => $eventId,
            ],
            [
                'event_type' => $eventType,
                'aggregate_id' => $merchantOrderId,
                'payload_hash' => hash('sha256', json_encode($payload)),
                'received_at' => now(),
                'status' => 'RECEIVED',
            ]
        );

        if ($inbox->status === 'PROCESSED') {
            return ApiResponse::success([
                'event_id' => $eventId,
                'status' => 'ALREADY_PROCESSED',
            ], 'Event sebelumnya telah diproses (idempotent).');
        }

        try {
            if ($eventType === 'ORDER_COMPLETED') {
                $completedAt = !empty($payload['completed_at'])
                    ? CarbonImmutable::parse($payload['completed_at'])
                    : CarbonImmutable::now('UTC');

                $this->heldFundService->handleOrderCompleted(
                    merchantOrderId: $merchantOrderId,
                    completedAt: $completedAt->toIso8601String(),
                    orderVersion: (int) ($payload['order_version'] ?? 1)
                );
            } elseif ($eventType === 'ORDER_HOLD_CHANGED') {
                $isHoldActive = (bool) ($payload['is_hold_active'] ?? $payload['active_hold'] ?? false);
                $reasonCode = (string) ($payload['hold_reason_code'] ?? $payload['reason'] ?? 'ORDER_HOLD_MANUAL');
                $orderVersion = (int) ($payload['order_version'] ?? 1);

                $this->heldFundService->handleOrderHoldChanged(
                    merchantOrderId: $merchantOrderId,
                    isHoldActive: $isHoldActive,
                    reasonCode: $reasonCode,
                    orderVersion: $orderVersion
                );
            } elseif ($eventType === 'ORDER_CANCELLED') {
                $alloc = PaymentAllocation::where('merchant_order_id', $merchantOrderId)->first();
                $checkoutGroupId = $payload['checkout_group_id'] ?? $alloc?->checkout?->checkout_group_id ?? '';

                $result = $this->refundService->executeOrderCancellationRefund(
                    sourceEventId: $eventId,
                    merchantOrderId: $merchantOrderId,
                    checkoutGroupId: (string) $checkoutGroupId,
                    reasonCode: $payload['reason_code'] ?? 'ORDER_CANCELLED_05A'
                );

                if (($result['status'] ?? '') === 'FAILED') {
                    $inbox->update(['status' => 'FAILED']);
                    return ApiResponse::error(
                        'REFUND_FAILED',
                        $result['message'] ?? 'Pengembalian dana pembatalan pesanan gagal.',
                        422,
                        $result
                    );
                }
            }

            $inbox->update([
                'status' => 'PROCESSED',
                'processed_at' => now(),
            ]);

            return ApiResponse::success([
                'event_id' => $eventId,
                'merchant_order_id' => $merchantOrderId,
                'status' => 'PROCESSED',
            ], 'Order event berhasil diproses.');
        } catch (\Throwable $e) {
            // NEVER record failed event as PROCESSED
            $inbox->update(['status' => 'FAILED']);

            $statusCode = $e instanceof HttpException ? $e->getStatusCode() : 500;
            return ApiResponse::error('EVENT_PROCESSING_FAILED', $e->getMessage(), $statusCode);
        }
    }

    public function processMaturedFunds(Request $request): JsonResponse
    {
        $releasedCount = $this->heldFundService->releaseMaturedHeldFunds();

        return ApiResponse::success([
            'released_count' => $releasedCount,
        ], 'Pemrosesan dana tertahan yang jatuh tempo (120 jam) selesai.');
    }
}
