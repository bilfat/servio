<?php

namespace App\Http\Controllers;

use App\Domain\Product\ProductService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MerchantVariantController extends Controller
{
    public function __construct(
        protected ProductService $productService
    ) {}

    /**
     * M07: POST /api/v1/merchant/products/{id}/variants
     */
    public function store(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'attributes' => 'required|array',
            'display_name' => 'nullable|string|max:191',
            'price_idr' => 'nullable|integer|min:0',
            'stock_qty' => 'nullable|integer|min:0',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
        ]);

        $created = $this->productService->addVariant($actor, $id, $validated);

        return ApiResponse::success($created, 'VARIANT_CREATED', 201);
    }

    /**
     * M08: PATCH /api/v1/merchant/products/{id}/variants/{variant_id}
     */
    public function update(Request $request, string $id, string $variantId): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'attributes' => 'sometimes|required|array',
            'display_name' => 'nullable|string|max:191',
            'price_idr' => 'nullable|integer|min:0',
            'stock_qty' => 'nullable|integer|min:0',
            'stock_change_reason' => 'required_with:stock_qty|string|max:48',
            'stock_change_note' => 'nullable|string',
        ]);

        $ifMatch = $request->header('If-Match');

        $updated = $this->productService->updateVariant($actor, $id, $variantId, $validated, $ifMatch);

        return ApiResponse::success($updated, 'VARIANT_UPDATED', 200);
    }

    /**
     * M09: PATCH /api/v1/merchant/products/{id}/variants/{variant_id}/status
     */
    public function changeStatus(Request $request, string $id, string $variantId): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'status' => 'required|string|in:ACTIVE,INACTIVE',
        ]);

        $ifMatch = $request->header('If-Match');

        $result = $this->productService->changeVariantStatus($actor, $id, $variantId, $validated['status'], $ifMatch);

        return ApiResponse::success($result, 'VARIANT_STATUS_UPDATED', 200);
    }

    /**
     * M10: DELETE /api/v1/merchant/products/{id}/variants/{variant_id}
     */
    public function destroy(Request $request, string $id, string $variantId): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $ifMatch = $request->header('If-Match');

        $archived = $this->productService->archiveVariant($actor, $id, $variantId, $ifMatch);

        return ApiResponse::success($archived, 'VARIANT_ARCHIVED', 200);
    }
}
