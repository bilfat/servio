<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\AfterSales\Reviews\ReviewService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogReviewController
{
    public function __construct(
        private readonly ReviewService $reviewService
    ) {}

    public function productReviews(Request $request, string $productId): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 10);
        $paginator = $this->reviewService->listCatalogReviews('PRODUCT', $productId, $perPage);
        $summary = $this->reviewService->getCatalogReputation('PRODUCT', $productId);

        return ApiResponse::success($paginator->items(), 200, [
            'summary' => $summary,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function serviceReviews(Request $request, string $serviceId): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 10);
        $paginator = $this->reviewService->listCatalogReviews('SERVICE', $serviceId, $perPage);
        $summary = $this->reviewService->getCatalogReputation('SERVICE', $serviceId);

        return ApiResponse::success($paginator->items(), 200, [
            'summary' => $summary,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function batchRatingsSummary(Request $request): JsonResponse
    {
        $targetType = strtoupper((string) $request->query('target_type', 'PRODUCT'));
        if (!in_array($targetType, ['PRODUCT', 'SERVICE', 'MERCHANT', 'PROVIDER'], true)) {
            return ApiResponse::error('AFTER_SALES_INVALID_TARGET_TYPE', 'target_type harus PRODUCT, SERVICE, MERCHANT, atau PROVIDER.', 422);
        }

        $rawIds = $request->query('target_ids', '');
        $targetIds = is_array($rawIds)
            ? $rawIds
            : explode(',', (string) $rawIds);

        $summaryMap = $this->reviewService->getBatchCatalogReputation($targetType, $targetIds);

        return ApiResponse::success($summaryMap);
    }

    public function businessReputation(string $type, string $orgId): JsonResponse
    {
        $targetType = strtoupper($type) === 'MERCHANT' ? 'MERCHANT' : 'PROVIDER';
        $reputation = $this->reviewService->getCatalogReputation($targetType, $orgId);

        return ApiResponse::success($reputation);
    }

    public function businessReviews(Request $request, string $type, string $orgId): JsonResponse
    {
        $targetType = strtoupper($type) === 'MERCHANT' ? 'MERCHANT' : 'PROVIDER';
        $perPage = (int) $request->query('per_page', 10);
        $paginator = $this->reviewService->listCatalogReviews($targetType, $orgId, $perPage);
        $summary = $this->reviewService->getCatalogReputation($targetType, $orgId);

        return ApiResponse::success($paginator->items(), 200, [
            'summary' => $summary,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}

