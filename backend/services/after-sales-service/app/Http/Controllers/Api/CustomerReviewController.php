<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\AfterSales\Reviews\ReviewService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class CustomerReviewController
{
    public function __construct(
        private readonly ReviewService $reviewService
    ) {}

    public function store(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'source_kind' => 'required|string|in:GOODS,SERVICE',
            'source_order_id' => 'required|string',
            'source_merchant_order_id' => 'nullable|string',
            'ratings' => 'required|array|min:2',
            'ratings.*.target_type' => 'required|string|in:PRODUCT,SERVICE,MERCHANT,PROVIDER',
            'ratings.*.target_id' => 'required|string',
            'ratings.*.rating' => 'required|integer|min:1|max:5',
            'ratings.*.text' => 'nullable|string|max:2000',
            'ratings.*.source_item_key' => 'nullable|string',
            'ratings.*.media_refs' => 'nullable|array',
        ]);

        $idempotencyKey = $request->header('Idempotency-Key');

        try {
            $submission = $this->reviewService->submitReview(
                customerId: $actor->id,
                sourceKind: $validated['source_kind'],
                sourceOrderId: $validated['source_order_id'],
                ratings: $validated['ratings'],
                sourceMerchantOrderId: $validated['source_merchant_order_id'] ?? null,
                idempotencyKey: $idempotencyKey
            );

            return ApiResponse::success($submission, 201, 'Ulasan berhasil dikirimkan.');
        } catch (Throwable $e) {
            return ApiResponse::error(
                'AFTER_SALES_REVIEW_FAILED',
                $e->getMessage(),
                422
            );
        }
    }

    public function myReview(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $orderId = $request->query('order_id');
        if (!$orderId) {
            $rawOrderIds = $request->query('order_ids');
            $orderIds = null;
            if (!empty($rawOrderIds)) {
                $orderIds = is_array($rawOrderIds)
                    ? $rawOrderIds
                    : array_filter(array_map('trim', explode(',', (string) $rawOrderIds)));
            }
            $reviews = $this->reviewService->listCustomerOrderReviews($actor->id, $orderIds);
            return ApiResponse::success($reviews);
        }

        $subOrderId = $request->query('sub_order_id') ?: $request->query('source_merchant_order_id');
        $review = $this->reviewService->getCustomerOrderReview($actor->id, (string) $orderId, $subOrderId ? (string) $subOrderId : null);

        return ApiResponse::success($review);
    }
}

