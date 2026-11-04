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

    public function showHeldFundByOrder(string $merchantOrderId): JsonResponse
    {
        $heldFund = \App\Models\HeldOrderFund::whereHas('allocation', function ($q) use ($merchantOrderId) {
            $q->where('merchant_order_id', $merchantOrderId);
        })->with('allocation')->first();

        if (!$heldFund) {
            return ApiResponse::error('HELD_FUND_NOT_FOUND', 'Data dana tertahan untuk pesanan ini belum tersedia.', 404);
        }

        return ApiResponse::success([
            'id' => $heldFund->id,
            'merchant_order_id' => $merchantOrderId,
            'status' => $heldFund->status,
            'gross_held_idr' => $heldFund->gross_held_idr,
            'merchant_entitlement_idr' => $heldFund->merchant_entitlement_idr,
            'completed_at' => $heldFund->completed_at?->toIso8601String(),
            'eligible_release_at' => $heldFund->eligible_release_at?->toIso8601String(),
            'released_at' => $heldFund->released_at?->toIso8601String(),
            'refunded_at' => $heldFund->refunded_at?->toIso8601String(),
            'hold_reason_code' => $heldFund->hold_reason_code,
        ]);
    }

    /**
     * Release matured held fund for a specific merchant order ID.
     * Enforces individual per-order eligibility: status must be HELD (not HOLD_BLOCKED),
     * and eligible_release_at must be reached (120h).
     */
    public function releaseHeldFundByOrder(string $merchantOrderId): JsonResponse
    {
        $allocation = PaymentAllocation::where('merchant_order_id', $merchantOrderId)->first();
        if (!$allocation) {
            return ApiResponse::error('ALLOCATION_NOT_FOUND', "Alokasi pembayaran untuk pesanan {$merchantOrderId} tidak ditemukan.", 404);
        }

        /** @var \App\Models\HeldOrderFund|null $heldFund */
        $heldFund = \App\Models\HeldOrderFund::where('payment_allocation_id', $allocation->id)->first();
        if (!$heldFund) {
            return ApiResponse::error('HELD_FUND_NOT_FOUND', "Dana tertahan untuk pesanan {$merchantOrderId} belum tersedia.", 404);
        }

        if ($heldFund->status === 'RELEASED_TO_SPAY') {
            return ApiResponse::success([
                'id' => $heldFund->id,
                'merchant_order_id' => $merchantOrderId,
                'status' => 'RELEASED_TO_SPAY',
                'released_at' => $heldFund->released_at?->toIso8601String(),
                'message' => 'Dana sudah dicairkan sebelumnya.',
            ]);
        }

        if ($heldFund->status === 'HOLD_BLOCKED') {
            return ApiResponse::error('HELD_FUND_BLOCKED', 'Dana tertahan sedang dalam status HOLD/dispute aktif dan tidak dapat dicairkan.', 422);
        }

        if (empty($heldFund->eligible_release_at) || now()->lt($heldFund->eligible_release_at)) {
            return ApiResponse::error('HELD_FUND_NOT_MATURED', 'Masa penahanan dana 120 jam belum terpenuhi.', 422);
        }

        $released = $this->heldFundService->releaseSingleFund($heldFund->id);
        if (!$released) {
            return ApiResponse::error('RELEASE_FAILED', 'Gagal memproses pencairan dana tertahan.', 500);
        }

        return ApiResponse::success([
            'id' => $heldFund->id,
            'merchant_order_id' => $merchantOrderId,
            'status' => 'RELEASED_TO_SPAY',
            'released_at' => now()->toIso8601String(),
        ], 'Dana tertahan berhasil dicairkan ke S-Pay Merchant.');
    }
}

