<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Finance\Refunds\RefundExecutionService;
use App\Http\Requests\OrderCancellationRefundRequest;
use App\Models\RefundTransaction;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class InternalRefundController extends Controller
{
    public function __construct(
        private readonly RefundExecutionService $refundService,
    ) {}

    public function processCancellationRefund(OrderCancellationRefundRequest $request): JsonResponse
    {
        $data = $request->validated();

        $result = $this->refundService->executeOrderCancellationRefund(
            sourceEventId: $data['source_event_id'],
            merchantOrderId: $data['merchant_order_id'],
            checkoutGroupId: $data['checkout_group_id'],
            reasonCode: $data['reason_code'] ?? null
        );

        return ApiResponse::success([
            'refund_id' => $result['refund_id'] ?? null,
            'merchant_order_id' => $result['merchant_order_id'],
            'status' => $result['status'],
            'refund_amount_idr' => $result['refund_amount_idr'],
            'destination' => $result['destination'] ?? 'CUSTOMER_SPAY',
            'credited_amount_idr' => $result['credited_amount_idr'] ?? $result['refund_amount_idr'],
            'is_real_refund' => false,
        ], 200);
    }

    public function showByOrder(string $merchantOrderId): JsonResponse
    {
        $refund = RefundTransaction::whereHas('paymentAllocation', function ($q) use ($merchantOrderId) {
            $q->where('merchant_order_id', $merchantOrderId);
        })->first();

        if (!$refund) {
            return ApiResponse::error('REFUND_NOT_FOUND', 'Data pengembalian dana untuk pesanan ini tidak ditemukan.', 404);
        }

        return ApiResponse::success([
            'refund_id' => $refund->id,
            'merchant_order_id' => $merchantOrderId,
            'customer_id' => $refund->paymentAllocation->customer_id ?? null,
            'status' => $refund->status,
            'refund_amount_idr' => $refund->requested_amount_idr,
            'credited_amount_idr' => $refund->credited_amount_idr,
            'destination' => 'CUSTOMER_SPAY',
            'processed_at' => $refund->credited_at?->toIso8601String(),
            'is_real_refund' => false,
        ]);
    }

    public function processAfterSalesRefund(\Illuminate\Http\Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|string',
            'merchant_order_id' => 'required|string',
            'customer_id' => 'required|string',
            'refund_amount_idr' => 'required|integer|min:1',
            'reason_code' => 'nullable|string',
            'idempotency_key' => 'nullable|string',
        ]);

        try {
            $result = $this->refundService->executeAfterSalesRefund(
                caseId: $validated['case_id'],
                merchantOrderId: $validated['merchant_order_id'],
                customerId: $validated['customer_id'],
                refundAmountIdr: (int) $validated['refund_amount_idr'],
                reasonCode: $validated['reason_code'] ?? null,
                idempotencyKey: $validated['idempotency_key'] ?? null
            );

            return ApiResponse::success($result, 200);
        } catch (\DomainException|\InvalidArgumentException $e) {
            return ApiResponse::error('REFUND_VALIDATION_FAILED', $e->getMessage(), 422);
        }
    }

    public function showRefund(string $refundId): JsonResponse
    {
        $refund = RefundTransaction::find($refundId);
        if (!$refund) {
            return ApiResponse::error('REFUND_NOT_FOUND', 'Data refund tidak ditemukan.', 404);
        }

        return ApiResponse::success([
            'refund_id' => $refund->id,
            'case_id' => $refund->source_funding_reference,
            'customer_id' => $refund->customerSPayAccount?->owner_external_id,
            'status' => $refund->status,
            'refund_amount_idr' => $refund->requested_amount_idr,
            'credited_amount_idr' => $refund->credited_amount_idr,
            'destination' => 'CUSTOMER_SPAY',
            'created_at' => $refund->created_at?->toIso8601String(),
        ], 200);
    }
}
