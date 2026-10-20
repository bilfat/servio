<?php

namespace App\Http\Controllers;

use App\Domain\Product\ProductService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MerchantMediaController extends Controller
{
    public function __construct(
        protected ProductService $productService
    ) {}

    /**
     * M11: POST /api/v1/merchant/products/{id}/media
     */
    public function store(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $request->validate([
            'file' => 'required|file|image|max:5120',
            'scope' => 'required|string|in:GENERAL,VARIANT',
            'variant_id' => 'nullable|string|uuid',
        ]);

        $file = $request->file('file');
        $scope = $request->input('scope');
        $variantId = $request->input('variant_id');

        $created = $this->productService->uploadMedia($actor, $id, $file, $scope, $variantId);

        return ApiResponse::success($created, 'PRODUCT_MEDIA_CREATED', 201);
    }

    /**
     * M12: PUT /api/v1/merchant/products/{id}/media/order
     */
    public function reorder(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'scope' => 'required|string|in:GENERAL,VARIANT',
            'variant_id' => 'nullable|string|uuid',
            'ordered_media_ids' => 'required|array',
            'ordered_media_ids.*' => 'required|string|uuid',
        ]);

        $ifMatch = $request->header('If-Match');

        $result = $this->productService->reorderMedia(
            $actor,
            $id,
            $validated['scope'],
            $validated['variant_id'] ?? null,
            $validated['ordered_media_ids'],
            $ifMatch
        );

        return ApiResponse::success($result, 'PRODUCT_MEDIA_REORDERED', 200);
    }

    /**
     * M13: DELETE /api/v1/merchant/products/{id}/media/{media_id}
     */
    public function destroy(Request $request, string $id, string $mediaId): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $ifMatch = $request->header('If-Match');

        $archived = $this->productService->archiveMedia($actor, $id, $mediaId, $ifMatch);

        return ApiResponse::success($archived, 'PRODUCT_MEDIA_ARCHIVED', 200);
    }
}
