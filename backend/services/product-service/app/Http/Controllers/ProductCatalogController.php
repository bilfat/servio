<?php

namespace App\Http\Controllers;

use App\Domain\Product\ProductService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ProductCatalogController extends Controller
{
    public function __construct(
        protected ProductService $productService
    ) {}

    /**
     * P01: GET /api/v1/products
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'search',
            'categories',
            'subcategories',
            'brands',
            'price_min',
            'price_max',
            'merchant_id',
            'availability',
            'sort',
            'limit',
            'cursor',
            'include_facets',
        ]);

        $result = $this->productService->listPublicProducts($filters);

        $meta = [
            'page' => $result['page'],
        ];
        if (isset($result['facets'])) {
            $meta['facets'] = $result['facets'];
        }

        return ApiResponse::success($result['items'], 'PRODUCT_LISTED', 200, $meta);
    }

    /**
     * P02: GET /api/v1/products/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $includes = [];
        if ($request->has('include')) {
            $includes = explode(',', (string) $request->query('include'));
            $includes = array_map('trim', $includes);
        }

        $detail = $this->productService->getProductDetail($id, $includes);

        if (! $detail) {
            return ApiResponse::error(
                'PRODUCT_NOT_FOUND',
                'Produk tidak ditemukan atau tidak tersedia untuk publik.',
                404
            );
        }

        return ApiResponse::success($detail, 'PRODUCT_FOUND', 200);
    }

    /**
     * P03: GET /api/v1/merchants/{merchant_organization_id}/storefront
     */
    public function storefront(Request $request, string $merchantOrganizationId): JsonResponse
    {
        $filters = $request->only(['search', 'limit', 'cursor']);
        $result = $this->productService->getStorefront($merchantOrganizationId, $filters);

        return ApiResponse::success($result, 'MERCHANT_STOREFRONT_FOUND', 200, [
            'page' => $result['page'],
        ]);
    }

    /**
     * P04: GET /api/v1/product-media/{media_id}
     */
    public function media(Request $request, string $mediaId): Response
    {
        /** @var AuthenticatedActor|null $actor */
        $actor = $request->attributes->get('actor') ?: AuthenticatedActor::guest();

        $binary = $this->productService->getMediaBinary($mediaId, $actor);

        if (! $binary) {
            return ApiResponse::error(
                'PRODUCT_MEDIA_NOT_FOUND',
                'Berkas media tidak ditemukan atau Anda tidak memiliki akses.',
                404
            );
        }

        return response($binary['content'], 200)
            ->header('Content-Type', $binary['mime_type'])
            ->header('Content-Disposition', 'inline; filename="' . $binary['filename'] . '"')
            ->header('Cache-Control', 'private, max-age=86400');
    }
}
