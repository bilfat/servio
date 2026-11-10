<?php

namespace App\Http\Controllers;

use App\Domain\Product\ProductService;
use App\Infrastructure\Identity\IdentityServiceClient;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternalProductController extends Controller
{
    public function __construct(
        protected ProductService $productService,
        protected IdentityServiceClient $identityClient
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
        $resolvedProductId = (string) ($request->route('id') ?? $request->route('productId') ?? $productId);
        $resolvedVariantId = (string) ($request->route('variant_id') ?? $request->route('variantId') ?? $variantId);

        $product = Product::where('id', $resolvedProductId)->whereNull('deleted_at')->first();
        if (! $product) {
            return ApiResponse::error('PRODUCT_NOT_FOUND', 'Produk tidak ditemukan.', 404);
        }

        $variant = ProductVariant::where('id', $resolvedVariantId)
            ->where('product_id', $product->id)
            ->whereNull('deleted_at')
            ->first();

        if (! $variant) {
            return ApiResponse::error('VARIANT_NOT_FOUND', 'Varian tidak ditemukan.', 404);
        }

        $primaryImage = $product->media()->where('scope', 'GENERAL')->whereNull('deleted_at')->orderBy('is_primary', 'desc')->orderBy('sort_order', 'asc')->first();
        $variantImage = $product->media()->where('variant_id', $variant->id)->whereNull('deleted_at')->first();
        $image = $variantImage ?: $primaryImage;

        $publicProfile = $this->identityClient->getOrganizationPublicProfile($product->merchant_organization_id);
        $merchantStoreName = ! empty($publicProfile['store_name']) ? $publicProfile['store_name'] : 'Toko Mitra SERVIO';

        $snapshot = [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'name' => $product->name,
            'variant_name' => $variant->display_name ?: implode(' / ', array_values($variant->attributes_json ?? [])),
            'image_url' => $image?->getUrl(),
            'merchant_organization_id' => $product->merchant_organization_id,
            'merchant_name' => $merchantStoreName,
            'price_idr' => $variant->price_idr,
            'currency' => 'IDR',
            'stock_qty' => $variant->stock_qty,
            'product_public_eligible' => $product->status === 'ACTIVE',
            'variant_active' => $variant->status === 'ACTIVE',
            'version' => $variant->lock_version,
            'warranty_policy' => $product->warranty_policy,
        ];

        return ApiResponse::success($snapshot, 'PRODUCT_VARIANT_SNAPSHOT_LOADED', 200);
    }

    /**
     * I03: POST /internal/v1/product/inventory/reserve
     */
    public function reserveInventory(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => 'required|string',
            'items' => 'required|array',
            'items.*.variant_id' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $orderId = $validated['order_id'];
        $items = $validated['items'];

        try {
            $reservations = \Illuminate\Support\Facades\DB::transaction(function () use ($orderId, $items) {
                $results = [];
                foreach ($items as $item) {
                    $variant = ProductVariant::where('id', $item['variant_id'])->lockForUpdate()->first();
                    if (!$variant) {
                        throw new \Exception("Varian produk {$item['variant_id']} tidak ditemukan.", 404);
                    }

                    if ($variant->stock_qty < $item['quantity']) {
                        throw new \Exception("Stok tidak mencukupi untuk varian {$variant->display_name} (tersedia: {$variant->stock_qty}, diminta: {$item['quantity']}).", 409);
                    }

                    $beforeQty = $variant->stock_qty;
                    $variant->decrement('stock_qty', $item['quantity']);
                    $variant->increment('lock_version');
                    $afterQty = $variant->fresh()->stock_qty;

                    \App\Models\ProductStockAdjustment::create([
                        'id' => (string) \Illuminate\Support\Str::ulid(),
                        'product_id' => $variant->product_id,
                        'variant_id' => $variant->id,
                        'actor_user_id' => 'system-order-service',
                        'actor_org_id' => $variant->product->merchant_organization_id ?? null,
                        'before_qty' => $beforeQty,
                        'delta_qty' => -$item['quantity'],
                        'after_qty' => $afterQty,
                        'reason_code' => 'RESERVED_FOR_ORDER',
                        'note' => "Reservasi stok untuk pesanan {$orderId}",
                        'operation_id' => $orderId,
                        'occurred_at' => now(),
                    ]);

                    $results[] = [
                        'variant_id' => $variant->id,
                        'quantity' => $item['quantity'],
                        'status' => 'RESERVED',
                        'remaining_stock' => $afterQty,
                    ];
                }
                return $results;
            });

            return ApiResponse::success(['reservations' => $reservations], 'INVENTORY_RESERVED', 200);
        } catch (\Throwable $e) {
            $code = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 409;
            return ApiResponse::error('STOCK_RESERVATION_FAILED', $e->getMessage(), $code);
        }
    }

    /**
     * I04: POST /internal/v1/product/inventory/release
     */
    public function releaseInventory(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => 'required|string',
            'items' => 'required|array',
            'items.*.variant_id' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $orderId = $validated['order_id'];
        $items = $validated['items'];

        try {
            $releases = \Illuminate\Support\Facades\DB::transaction(function () use ($orderId, $items) {
                $results = [];
                foreach ($items as $item) {
                    $variant = ProductVariant::where('id', $item['variant_id'])->lockForUpdate()->first();
                    if (!$variant) continue;

                    $beforeQty = $variant->stock_qty;
                    $variant->increment('stock_qty', $item['quantity']);
                    $variant->increment('lock_version');
                    $afterQty = $variant->fresh()->stock_qty;

                    \App\Models\ProductStockAdjustment::create([
                        'id' => (string) \Illuminate\Support\Str::ulid(),
                        'product_id' => $variant->product_id,
                        'variant_id' => $variant->id,
                        'actor_user_id' => 'system-order-service',
                        'actor_org_id' => $variant->product->merchant_organization_id ?? null,
                        'before_qty' => $beforeQty,
                        'delta_qty' => $item['quantity'],
                        'after_qty' => $afterQty,
                        'reason_code' => 'RELEASE_RESERVED_ORDER',
                        'note' => "Pengembalian reservasi stok pesanan {$orderId}",
                        'operation_id' => $orderId,
                        'occurred_at' => now(),
                    ]);

                    $results[] = [
                        'variant_id' => $variant->id,
                        'quantity' => $item['quantity'],
                        'status' => 'RELEASED',
                    ];
                }
                return $results;
            });

            return ApiResponse::success(['releases' => $releases], 'INVENTORY_RELEASED', 200);
        } catch (\Throwable $e) {
            return ApiResponse::error('STOCK_RELEASE_FAILED', $e->getMessage(), 500);
        }
    }
}
