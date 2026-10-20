<?php

namespace App\Http\Controllers;

use App\Domain\Product\ProductService;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternalProductController extends Controller
{
    public function __construct(
        protected ProductService $productService
    ) {}

    /**
     * I01: POST /internal/v1/category-references/check
     */
    public function checkCategoryReferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'node_type' => 'required|string|in:CATEGORY,SUBCATEGORY',
            'node_id' => 'required|string|uuid',
            'operation_id' => 'nullable|string',
        ]);

        $result = $this->productService->checkCategoryReferences(
            $validated['node_type'],
            $validated['node_id']
        );

        return ApiResponse::success($result, 'PRODUCT_CATEGORY_REFERENCES_CHECKED', 200);
    }

    /**
     * I02: GET /internal/v1/products/{id}/variants/{variant_id}/snapshot
     */
    public function getVariantSnapshot(Request $request, string $productId, string $variantId): JsonResponse
    {
        $product = Product::where('id', $productId)->whereNull('deleted_at')->first();
        if (! $product) {
            return ApiResponse::error('PRODUCT_NOT_FOUND', 'Produk tidak ditemukan.', 404);
        }

        $variant = ProductVariant::where('id', $variantId)
            ->where('product_id', $product->id)
            ->whereNull('deleted_at')
            ->first();

        if (! $variant) {
            return ApiResponse::error('VARIANT_NOT_FOUND', 'Varian tidak ditemukan.', 404);
        }

        $snapshot = [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'merchant_organization_id' => $product->merchant_organization_id,
            'price_idr' => $variant->price_idr,
            'currency' => 'IDR',
            'stock_qty' => $variant->stock_qty,
            'product_public_eligible' => $product->status === 'ACTIVE',
            'variant_active' => $variant->status === 'ACTIVE',
            'version' => $variant->lock_version,
        ];

        return ApiResponse::success($snapshot, 'PRODUCT_VARIANT_SNAPSHOT_LOADED', 200);
    }
}
