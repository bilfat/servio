<?php

namespace App\Http\Controllers;

use App\Domain\Product\ProductService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MerchantProductController extends Controller
{
    public function __construct(
        protected ProductService $productService
    ) {}

    /**
     * M01: GET /api/v1/merchant/products
     */
    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $filters = $request->only(['status', 'category_id', 'search', 'limit', 'cursor']);
        $result = $this->productService->listMerchantProducts($actor, $filters);

        return ApiResponse::success($result['items'], 'MERCHANT_PRODUCTS_LISTED', 200, [
            'page' => $result['page'],
        ]);
    }

    /**
     * M02: GET /api/v1/merchant/products/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $detail = $this->productService->getMerchantProductDetail($actor, $id);

        if (! $detail) {
            return ApiResponse::error(
                'PRODUCT_NOT_FOUND',
                'Produk tidak ditemukan atau bukan milik organisasi Anda.',
                404
            );
        }

        return ApiResponse::success($detail, 'PRODUCT_FOUND', 200);
    }

    /**
     * M03: POST /api/v1/merchant/products
     */
    public function store(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'description' => 'nullable|string',
            'brand' => 'nullable|string|max:160',
            'category_id' => 'nullable|string|uuid',
            'subcategory_id' => 'nullable|string|uuid',
            'variants' => 'nullable|array',
            'variants.*.attributes' => 'required_with:variants|array',
            'variants.*.display_name' => 'nullable|string|max:191',
            'variants.*.price_idr' => 'nullable|integer|min:0',
            'variants.*.stock_qty' => 'nullable|integer|min:0',
            'variants.*.status' => 'nullable|string|in:ACTIVE,INACTIVE',
        ]);

        $created = $this->productService->createProduct($actor, $validated);

        return ApiResponse::success($created, 'PRODUCT_CREATED', 201);
    }

    /**
     * M04: PATCH /api/v1/merchant/products/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:191',
            'description' => 'nullable|string',
            'brand' => 'nullable|string|max:160',
            'category_id' => 'nullable|string|uuid',
            'subcategory_id' => 'nullable|string|uuid',
        ]);

        $ifMatch = $request->header('If-Match');

        $updated = $this->productService->updateProduct($actor, $id, $validated, $ifMatch);

        return ApiResponse::success($updated, 'PRODUCT_UPDATED', 200);
    }

    /**
     * M05: PATCH /api/v1/merchant/products/{id}/status
     */
    public function changeStatus(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'status' => 'required|string|in:ACTIVE,INACTIVE',
        ]);

        $ifMatch = $request->header('If-Match');

        $result = $this->productService->changeProductStatus($actor, $id, $validated['status'], $ifMatch);

        if (isset($result['error_code'])) {
            return ApiResponse::error(
                $result['error_code'],
                $result['message'],
                $result['status_code'],
                details: $result['data']
            );
        }

        return ApiResponse::success($result, 'PRODUCT_STATUS_UPDATED', 200);
    }

    /**
     * M06: DELETE /api/v1/merchant/products/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $ifMatch = $request->header('If-Match');
        $reason = $request->input('reason');

        $archived = $this->productService->archiveProduct($actor, $id, $reason, $ifMatch);

        return ApiResponse::success($archived, 'PRODUCT_ARCHIVED', 200);
    }
}
