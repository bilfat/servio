<?php

namespace App\Http\Controllers;

use App\Domain\Product\ProductService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductGovernanceController extends Controller
{
    public function __construct(
        protected ProductService $productService
    ) {}

    /**
     * G01: GET /api/v1/governance/products
     */
    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $filters = $request->only(['merchant_id', 'status', 'category_id', 'search', 'limit', 'cursor']);
        $result = $this->productService->listGovernanceProducts($actor, $filters);

        return ApiResponse::success($result['items'], 'PRODUCT_GOVERNANCE_LISTED', 200, [
            'page' => $result['page'],
        ]);
    }

    /**
     * G02: GET /api/v1/governance/products/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $detail = $this->productService->getGovernanceProductDetail($actor, $id);

        if (! $detail) {
            return ApiResponse::error(
                'PRODUCT_NOT_FOUND',
                'Produk tidak ditemukan.',
                404
            );
        }

        return ApiResponse::success($detail, 'PRODUCT_GOVERNANCE_FOUND', 200);
    }

    /**
     * G03: GET /api/v1/product-audit
     */
    public function audit(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $filters = $request->only(['product_id', 'action', 'limit', 'cursor']);
        $result = $this->productService->listAuditLogs($actor, $filters);

        return ApiResponse::success($result['items'], 'PRODUCT_AUDIT_LISTED', 200, [
            'page' => $result['page'],
        ]);
    }
}
