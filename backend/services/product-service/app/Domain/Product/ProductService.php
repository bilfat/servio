<?php

namespace App\Domain\Product;

use App\Infrastructure\Category\CategoryServiceClient;
use App\Infrastructure\Identity\IdentityServiceClient;
use App\Models\Product;
use App\Models\ProductAuditLog;
use App\Models\ProductCategoryAssignment;
use App\Models\ProductMedia;
use App\Models\ProductOutboxEvent;
use App\Models\ProductStockAdjustment;
use App\Models\ProductVariant;
use App\Support\AuthenticatedActor;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ProductService
{
    public function __construct(
        protected IdentityServiceClient $identityClient,
        protected CategoryServiceClient $categoryClient,
    ) {}

    protected ?array $taxonomyCache = null;

    public function getTaxonomyMap(): array
    {
        if ($this->taxonomyCache !== null) {
            return $this->taxonomyCache;
        }

        $tree = $this->categoryClient->getTree('PRODUK') ?: [];
        $catMap = [];
        $subMap = [];

        foreach ($tree as $master) {
            foreach ($master['categories'] ?? [] as $cat) {
                $catMap[$cat['id']] = $cat['name'];
                foreach ($cat['subcategories'] ?? [] as $sub) {
                    $subMap[$sub['id']] = $sub['name'];
                }
            }
        }

        $this->taxonomyCache = ['categories' => $catMap, 'subcategories' => $subMap];
        return $this->taxonomyCache;
    }

    /**
     * Parse and sanitize If-Match lock version header (supports raw integer or RFC quoted string).
     */
    protected function parseLockVersion(?string $ifMatch): ?int
    {
        if ($ifMatch === null) {
            return null;
        }

        $trimmed = trim($ifMatch, "\"'\t\n\r ");
        return is_numeric($trimmed) ? (int) $trimmed : -1;
    }

    /**
     * Compute real-time activation requirements and check whether product can be activated.
     */
    public function evaluateActivationRequirements(Product $product): array
    {
        $blockingReasons = [];

        // 1. Merchant eligible
        $orgStatus = $this->identityClient->getOrganizationStatus($product->merchant_organization_id);
        $merchantEligible = $orgStatus !== null && ($orgStatus['status'] ?? '') === 'ACTIVE';
        if (! $merchantEligible) {
            $blockingReasons[] = 'Organisasi Merchant tidak aktif atau tidak ditemukan.';
        }

        // 2. Category & Subcategory eligible
        $categoryEligible = false;
        $subcategoryEligible = false;

        if ($product->category_id && $product->subcategory_id) {
            $catCheck = $this->categoryClient->checkEligibility('CATEGORY', $product->category_id, 'VERIFY_ACTIVE');
            $subCheck = $this->categoryClient->checkEligibility('SUBCATEGORY', $product->subcategory_id, 'VERIFY_ACTIVE');

            $categoryEligible = ! empty($catCheck['effective_active']) && ($catCheck['master_code'] ?? '') === 'PRODUK';
            $subcategoryEligible = ! empty($subCheck['effective_active']) && ($subCheck['master_code'] ?? '') === 'PRODUK';

            if (! $categoryEligible) {
                $blockingReasons[] = 'Kategori tidak aktif atau bukan dari cabang PRODUK.';
            }
            if (! $subcategoryEligible) {
                $blockingReasons[] = 'Subkategori tidak aktif atau bukan dari cabang PRODUK.';
            }
        } else {
            $blockingReasons[] = 'Kategori dan subkategori wajib dipilih.';
        }

        // 3. Has at least 1 active variant
        $activeVariantCount = $product->variants()
            ->where('status', 'ACTIVE')
            ->whereNull('deleted_at')
            ->count();
        $hasActiveVariant = $activeVariantCount > 0;
        if (! $hasActiveVariant) {
            $blockingReasons[] = 'Produk wajib memiliki minimal 1 varian aktif.';
        }

        // 4. Has at least 1 ready general media
        $generalMediaCount = $product->media()
            ->where('scope', 'GENERAL')
            ->where('storage_state', 'READY')
            ->whereNull('deleted_at')
            ->count();
        $hasGeneralMedia = $generalMediaCount > 0;
        if (! $hasGeneralMedia) {
            $blockingReasons[] = 'Produk wajib memiliki minimal 1 foto umum (GENERAL).';
        }

        // 5. Check price policy for price = 0 (D-08: zero price not allowed to activate)
        $zeroPriceActiveVariant = $product->variants()
            ->where('status', 'ACTIVE')
            ->where('price_idr', 0)
            ->whereNull('deleted_at')
            ->exists();
        if ($zeroPriceActiveVariant) {
            $blockingReasons[] = 'Harga varian tidak boleh Rp 0 untuk aktivasi produk.';
        }

        $canActivate = empty($blockingReasons);

        return [
            'merchant_eligible' => $merchantEligible,
            'category_eligible' => $categoryEligible,
            'subcategory_eligible' => $subcategoryEligible,
            'has_active_variant' => $hasActiveVariant,
            'has_general_media' => $hasGeneralMedia,
            'can_activate' => $canActivate,
            'blocking_reasons' => $blockingReasons,
        ];
    }

    /**
     * P01: Public Catalog search, filter, facets, and pagination
     */
    public function listPublicProducts(array $filters): array
    {
        $query = Product::query()
            ->where('status', 'ACTIVE')
            ->whereNull('deleted_at')
            ->whereHas('variants', function ($q) {
                $q->where('status', 'ACTIVE')->whereNull('deleted_at');
            })
            ->whereHas('media', function ($q) {
                $q->where('scope', 'GENERAL')
                    ->where('storage_state', 'READY')
                    ->whereNull('deleted_at');
            })
            ->with(['variants' => function ($q) {
                $q->where('status', 'ACTIVE')->whereNull('deleted_at')->orderBy('price_idr', 'asc');
            }, 'media' => function ($q) {
                $q->where('scope', 'GENERAL')->where('storage_state', 'READY')->whereNull('deleted_at')->orderBy('sort_order', 'asc');
            }]);

        // Search
        if (! empty($filters['search'])) {
            $normalizedSearch = Product::normalizeString($filters['search']);
            $query->where(function ($q) use ($normalizedSearch) {
                $q->where('normalized_name', 'LIKE', "%{$normalizedSearch}%")
                    ->orWhere('brand_normalized', 'LIKE', "%{$normalizedSearch}%");
            });
        }

        // Filter Categories (comma-separated UUIDs)
        if (! empty($filters['categories'])) {
            $cats = is_array($filters['categories']) ? $filters['categories'] : explode(',', (string) $filters['categories']);
            $cats = array_filter(array_map('trim', $cats));
            if (! empty($cats)) {
                $query->whereIn('category_id', $cats);
            }
        }

        // Filter Subcategories (comma-separated UUIDs)
        if (! empty($filters['subcategories'])) {
            $subs = is_array($filters['subcategories']) ? $filters['subcategories'] : explode(',', (string) $filters['subcategories']);
            $subs = array_filter(array_map('trim', $subs));
            if (! empty($subs)) {
                $query->whereIn('subcategory_id', $subs);
            }
        }

        // Filter Brands (independent of category)
        if (! empty($filters['brands'])) {
            $brands = is_array($filters['brands']) ? $filters['brands'] : explode(',', (string) $filters['brands']);
            $brands = array_filter(array_map([Product::class, 'normalizeString'], $brands));
            if (! empty($brands)) {
                $query->whereIn('brand_normalized', $brands);
            }
        }

        // Filter Merchant
        if (! empty($filters['merchant_id'])) {
            $query->where('merchant_organization_id', $filters['merchant_id']);
        }

        // Filter Price Range
        if (isset($filters['price_min']) && is_numeric($filters['price_min'])) {
            $min = (int) $filters['price_min'];
            $query->whereHas('variants', function ($q) use ($min) {
                $q->where('status', 'ACTIVE')->whereNull('deleted_at')->where('price_idr', '>=', $min);
            });
        }
        if (isset($filters['price_max']) && is_numeric($filters['price_max'])) {
            $max = (int) $filters['price_max'];
            $query->whereHas('variants', function ($q) use ($max) {
                $q->where('status', 'ACTIVE')->whereNull('deleted_at')->where('price_idr', '<=', $max);
            });
        }

        // Filter Availability (IN_STOCK / OUT_OF_STOCK)
        if (! empty($filters['availability'])) {
            if ($filters['availability'] === 'IN_STOCK') {
                $query->whereHas('variants', function ($q) {
                    $q->where('status', 'ACTIVE')->whereNull('deleted_at')->where('stock_qty', '>', 0);
                });
            } elseif ($filters['availability'] === 'OUT_OF_STOCK') {
                $query->whereDoesntHave('variants', function ($q) {
                    $q->where('status', 'ACTIVE')->whereNull('deleted_at')->where('stock_qty', '>', 0);
                });
            }
        }

        // Sorting
        $sort = $filters['sort'] ?? 'newest';
        switch ($sort) {
            case 'name_asc':
                $query->orderBy('name', 'asc')->orderBy('id', 'asc');
                break;
            case 'price_asc':
            case 'price_desc':
            case 'newest':
            default:
                $query->orderBy('created_at', 'desc')->orderBy('id', 'desc');
                break;
        }

        $limit = min(max((int) ($filters['limit'] ?? 20), 1), 100);
        $paginator = $query->paginate($limit);

        // Preload merchant public profiles to prevent N+1 HTTP calls
        $merchantIds = $paginator->getCollection()->pluck('merchant_organization_id')->unique()->all();
        $this->identityClient->preloadOrganizationProfiles($merchantIds);

        $items = [];
        foreach ($paginator->items() as $prod) {
            $items[] = $this->formatProductCard($prod);
        }

        // Optional facets
        $facets = null;
        if (! empty($filters['include_facets'])) {
            $facets = [
                'brands' => Product::where('status', 'ACTIVE')
                    ->whereNull('deleted_at')
                    ->whereNotNull('brand_name')
                    ->select('brand_normalized as value', 'brand_name as label', DB::raw('count(*) as count'))
                    ->groupBy('brand_normalized', 'brand_name')
                    ->get(),
                'categories' => [],
                'subcategories' => [],
            ];
        }

        return [
            'items' => $items,
            'page' => [
                'limit' => $limit,
                'has_more' => $paginator->hasMorePages(),
                'total' => $paginator->total(),
            ],
            'facets' => $facets,
        ];
    }

    /**
     * Format ProductCardView for public catalog
     */
    public function formatProductCard(Product $prod): array
    {
        $activeVariants = $prod->variants->where('status', 'ACTIVE');
        $prices = $activeVariants->pluck('price_idr')->all();

        $minPrice = ! empty($prices) ? min($prices) : 0;
        $maxPrice = ! empty($prices) ? max($prices) : 0;
        $priceKind = $minPrice === $maxPrice ? 'EXACT' : 'RANGE';

        $totalStock = $activeVariants->sum('stock_qty');
        $availability = $totalStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';

        $primaryImage = $prod->media->firstWhere('is_primary', true) ?: $prod->media->first();

        // Merchant public profile info via Identity Public Profile M2M contract
        $publicProfile = $this->identityClient->getOrganizationPublicProfile($prod->merchant_organization_id);
        $hasUpstreamProfile = ! empty($publicProfile['store_name']);
        $storeName = $hasUpstreamProfile ? $publicProfile['store_name'] : null;
        $profileStatus = $hasUpstreamProfile ? 'AVAILABLE' : ($publicProfile ? 'UNAVAILABLE' : 'PENDING_IDENTITY_INTEGRATION');

        $tax = $this->getTaxonomyMap();
        $catName = $tax['categories'][$prod->category_id] ?? null;
        $subName = $tax['subcategories'][$prod->subcategory_id] ?? null;

        return [
            'id' => $prod->id,
            'name' => $prod->name,
            'brand' => $prod->brand_name,
            'brand_name' => $prod->brand_name,
            'primary_image' => $primaryImage ? [
                'url' => $primaryImage->getUrl(),
                'alt' => $prod->name,
            ] : null,
            'display_price' => [
                'currency' => 'IDR',
                'kind' => $priceKind,
                'min' => $minPrice,
                'max' => $maxPrice,
                'formatted_hint' => null,
            ],
            'total_stock' => $totalStock,
            'availability' => $availability,
            'merchant' => [
                'organization_id' => $prod->merchant_organization_id,
                'store_name' => $storeName,
                'store_profile_status' => $profileStatus,
                'storefront_url' => "/merchants/{$prod->merchant_organization_id}/storefront",
                'city' => $publicProfile['city'] ?? null,
                'province' => $publicProfile['province'] ?? null,
                'district' => $publicProfile['district'] ?? null,
                'postal_code' => $publicProfile['postal_code'] ?? null,
                'street_address' => $publicProfile['street_address'] ?? null,
            ],
            'category_id' => $prod->category_id,
            'category_name' => $catName,
            'subcategory_id' => $prod->subcategory_id,
            'subcategory_name' => $subName,
        ];
    }

    /**
     * P02: Public Product Detail with single gallery, variants, and related/same-store
     */
    public function getProductDetail(string $id, array $includes = []): ?array
    {
        $prod = Product::where('id', $id)
            ->where('status', 'ACTIVE')
            ->whereNull('deleted_at')
            ->with([
                'variants' => fn($q) => $q->where('status', 'ACTIVE')->whereNull('deleted_at')->orderBy('price_idr', 'asc'),
                'media' => fn($q) => $q->whereNull('deleted_at')->orderBy('sort_order', 'asc'),
            ])
            ->first();

        if (! $prod || $prod->variants->isEmpty()) {
            return null;
        }

        $card = $this->formatProductCard($prod);

        // Separate general vs variant media
        $generalMedia = [];
        $variantMediaMap = [];

        foreach ($prod->media as $m) {
            $item = [
                'id' => $m->id,
                'scope' => $m->scope,
                'variant_id' => $m->variant_id,
                'url' => $m->getUrl(),
                'sort_order' => $m->sort_order,
                'is_primary' => $m->is_primary,
            ];

            if ($m->scope === 'GENERAL') {
                $generalMedia[] = $item;
            } elseif ($m->variant_id) {
                $variantMediaMap[$m->variant_id][] = $item;
            }
        }

        // Format active variants for customer
        $variants = [];
        foreach ($prod->variants as $v) {
            $variants[] = [
                'id' => $v->id,
                'display_name' => $v->display_name ?: implode(' / ', array_values($v->attributes_json ?? [])),
                'attributes' => $v->attributes_json ?? [],
                'price_idr' => $v->price_idr,
                'stock_qty' => $v->stock_qty,
                'available' => $v->stock_qty > 0,
                'media' => $variantMediaMap[$v->id] ?? [],
            ];
        }

        // Related and Same Store lists
        $relatedProducts = [];
        $sameStoreProducts = [];

        if (in_array('related', $includes, true)) {
            // First try same subcategory, fallback to same category, excluding current product
            $query = Product::where('status', 'ACTIVE')
                ->where('id', '!=', $prod->id)
                ->whereNull('deleted_at')
                ->whereHas('variants', fn($q) => $q->where('status', 'ACTIVE')->whereNull('deleted_at'))
                ->whereHas('media', fn($q) => $q->where('scope', 'GENERAL')->whereNull('deleted_at'));

            if ($prod->subcategory_id) {
                $relatedQuery = (clone $query)->where('subcategory_id', $prod->subcategory_id)->limit(6)->get();
                if ($relatedQuery->count() < 6 && $prod->category_id) {
                    $excludeIds = $relatedQuery->pluck('id')->push($prod->id)->all();
                    $catQuery = (clone $query)->where('category_id', $prod->category_id)->whereNotIn('id', $excludeIds)->limit(6 - $relatedQuery->count())->get();
                    $relatedQuery = $relatedQuery->concat($catQuery);
                }
            } else {
                $relatedQuery = $query->limit(6)->get();
            }

            foreach ($relatedQuery as $rel) {
                $relatedProducts[] = $this->formatProductCard($rel);
            }
        }

        if (in_array('same_store', $includes, true)) {
            $storeQuery = Product::where('status', 'ACTIVE')
                ->where('merchant_organization_id', $prod->merchant_organization_id)
                ->where('id', '!=', $prod->id)
                ->whereNull('deleted_at')
                ->whereHas('variants', fn($q) => $q->where('status', 'ACTIVE')->whereNull('deleted_at'))
                ->whereHas('media', fn($q) => $q->where('scope', 'GENERAL')->whereNull('deleted_at'))
                ->limit(6)
                ->get();

            foreach ($storeQuery as $st) {
                $sameStoreProducts[] = $this->formatProductCard($st);
            }
        }

        return [
            'id' => $prod->id,
            'name' => $prod->name,
            'description' => $prod->description,
            'brand' => $prod->brand_name,
            'category' => [
                'id' => $prod->category_id,
                'name' => $card['category_name'] ?? 'Kategori Produk',
            ],
            'subcategory' => [
                'id' => $prod->subcategory_id,
                'name' => $card['subcategory_name'] ?? 'Subkategori',
            ],
            'display_price' => $card['display_price'],
            'availability' => $card['availability'],
            'general_media' => $generalMedia,
            'media' => $prod->media->map(fn($m) => [
                'id' => $m->id,
                'scope' => $m->scope,
                'variant_id' => $m->variant_id,
                'url' => $m->getUrl(),
                'sort_order' => $m->sort_order,
                'is_primary' => $m->is_primary,
            ])->values()->all(),
            'variants' => $variants,
            'merchant' => $card['merchant'],
            'related_products' => $relatedProducts,
            'same_store_products' => $sameStoreProducts,
        ];
    }

    /**
     * P03: Merchant Storefront
     */
    public function getStorefront(string $merchantOrgId, array $filters = []): array
    {
        $orgStatus = $this->identityClient->getOrganizationStatus($merchantOrgId);
        $publicProfile = $this->identityClient->getOrganizationPublicProfile($merchantOrgId);

        $hasUpstreamProfile = ! empty($publicProfile['store_name']);
        $storeName = $hasUpstreamProfile ? $publicProfile['store_name'] : null;
        $profileStatus = $hasUpstreamProfile ? 'AVAILABLE' : ($publicProfile ? 'UNAVAILABLE' : 'PENDING_IDENTITY_INTEGRATION');

        $query = Product::where('merchant_organization_id', $merchantOrgId)
            ->where('status', 'ACTIVE')
            ->whereNull('deleted_at')
            ->whereHas('variants', fn($q) => $q->where('status', 'ACTIVE')->whereNull('deleted_at'))
            ->whereHas('media', fn($q) => $q->where('scope', 'GENERAL')->whereNull('deleted_at'));

        if (! empty($filters['search'])) {
            $norm = Product::normalizeString($filters['search']);
            $query->where('normalized_name', 'LIKE', "%{$norm}%");
        }

        $limit = min(max((int) ($filters['limit'] ?? 20), 1), 100);
        $paginator = $query->paginate($limit);

        // Preload profile into memory cache so formatProductCard does not repeat calls
        $this->identityClient->preloadOrganizationProfiles([$merchantOrgId]);

        $products = [];
        $activeCategories = [];
        $seenCatIds = [];
        foreach ($paginator->items() as $p) {
            $card = $this->formatProductCard($p);
            $products[] = $card;
            $cid = $card['category_id'] ?? null;
            if ($cid && ! isset($seenCatIds[$cid])) {
                $seenCatIds[$cid] = true;
                $activeCategories[] = [
                    'id' => $cid,
                    'name' => $card['category_name'] ?? 'Kategori Produk',
                ];
            }
        }

        return [
            'merchant' => [
                'organization_id' => $merchantOrgId,
                'store_name' => $storeName,
                'store_profile_status' => $profileStatus,
                'logo_url' => $publicProfile['logo_url'] ?? null,
                'public_description' => $publicProfile['public_description'] ?? null,
                'business_status' => $orgStatus['status'] ?? $publicProfile['status'] ?? 'ACTIVE',
            ],
            'active_product_count' => $paginator->total(),
            'active_categories' => $activeCategories,
            'products' => $products,
            'page' => [
                'limit' => $limit,
                'has_more' => $paginator->hasMorePages(),
            ],
        ];
    }

    /**
     * M01: Merchant List own products (admin view)
     */
    public function listMerchantProducts(AuthenticatedActor $actor, array $filters = []): array
    {
        $query = Product::withTrashed()
            ->where('merchant_organization_id', $actor->organizationId)
            ->withCount(['variants as variant_count' => fn($q) => $q->withTrashed()])
            ->with([
                'media' => fn($q) => $q->where('scope', 'GENERAL')->withTrashed()->orderBy('is_primary', 'desc'),
                'variants' => fn($q) => $q->withTrashed(),
            ]);

        if (! empty($filters['status']) && strtoupper($filters['status']) !== 'ALL') {
            $st = strtoupper($filters['status']);
            if ($st === 'INACTIVE' || $st === 'ARCHIVED') {
                $query->where(function ($q) {
                    $q->whereNotNull('deleted_at')
                      ->orWhere('status', 'INACTIVE')
                      ->orWhere('status', 'ARCHIVED');
                });
            } else {
                $query->whereNull('deleted_at')->where('status', $st);
            }
        }

        if (! empty($filters['category_id']) && $filters['category_id'] !== 'ALL') {
            $query->where('category_id', $filters['category_id']);
        }

        if (! empty($filters['search'])) {
            $norm = Product::normalizeString($filters['search']);
            $query->where('normalized_name', 'LIKE', "%{$norm}%");
        }

        $limit = min(max((int) ($filters['limit'] ?? 50), 1), 100);
        $paginator = $query->orderBy('updated_at', 'desc')->paginate($limit);

        $tax = $this->getTaxonomyMap();
        $items = [];
        foreach ($paginator->items() as $p) {
            $primary = $p->media->first();
            $variants = $p->variants;
            $minPrice = $variants->isNotEmpty() ? (int) $variants->min('price_idr') : 0;
            $maxPrice = $variants->isNotEmpty() ? (int) $variants->max('price_idr') : 0;
            $totalStock = $variants->isNotEmpty() ? (int) $variants->sum('stock_qty') : 0;

            $effectiveStatus = $p->deleted_at !== null ? 'ARCHIVED' : $p->status;

            $items[] = [
                'id' => $p->id,
                'name' => $p->name,
                'brand' => $p->brand_name,
                'brand_name' => $p->brand_name,
                'category_id' => $p->category_id,
                'category_name' => $tax['categories'][$p->category_id] ?? null,
                'subcategory_id' => $p->subcategory_id,
                'subcategory_name' => $tax['subcategories'][$p->subcategory_id] ?? null,
                'status' => $effectiveStatus,
                'is_archived' => $p->deleted_at !== null,
                'deleted_at' => $p->deleted_at?->toIso8601String(),
                'variant_count' => (int) $p->variant_count,
                'min_price' => $minPrice,
                'max_price' => $maxPrice,
                'price_idr' => $minPrice,
                'total_stock' => $totalStock,
                'lock_version' => $p->lock_version,
                'primary_image_url' => $primary?->getUrl(),
                'created_at' => $p->created_at->toIso8601String(),
                'updated_at' => $p->updated_at->toIso8601String(),
            ];
        }

        return [
            'items' => $items,
            'page' => [
                'limit' => $limit,
                'has_more' => $paginator->hasMorePages(),
                'total' => $paginator->total(),
            ],
        ];
    }

    /**
     * M02: Merchant Get Product Detail (Admin View)
     */
    public function getMerchantProductDetail(AuthenticatedActor $actor, string $id): ?array
    {
        $prod = Product::where('id', $id)
            ->where('merchant_organization_id', $actor->organizationId)
            ->whereNull('deleted_at')
            ->with([
                'variants' => fn($q) => $q->whereNull('deleted_at'),
                'media' => fn($q) => $q->whereNull('deleted_at')->orderBy('sort_order', 'asc'),
            ])
            ->first();

        if (! $prod) {
            return null;
        }

        return $this->formatProductAdminView($prod);
    }

    /**
     * Format full ProductAdminView
     */
    public function formatProductAdminView(Product $prod): array
    {
        $variants = [];
        $variantMediaMap = [];

        foreach ($prod->media as $m) {
            if ($m->variant_id) {
                $variantMediaMap[$m->variant_id][] = [
                    'id' => $m->id,
                    'scope' => $m->scope,
                    'variant_id' => $m->variant_id,
                    'url' => $m->getUrl(),
                    'sort_order' => $m->sort_order,
                    'is_primary' => $m->is_primary,
                    'storage_state' => $m->storage_state,
                ];
            }
        }

        foreach ($prod->variants as $v) {
            $variants[] = [
                'id' => $v->id,
                'attributes' => $v->attributes_json ?? [],
                'display_name' => $v->display_name ?: implode(' / ', array_values($v->attributes_json ?? [])),
                'price_idr' => $v->price_idr,
                'stock_qty' => $v->stock_qty,
                'status' => $v->status,
                'lock_version' => $v->lock_version,
                'media' => $variantMediaMap[$v->id] ?? [],
            ];
        }

        $allMedia = [];
        foreach ($prod->media as $m) {
            $allMedia[] = [
                'id' => $m->id,
                'scope' => $m->scope,
                'variant_id' => $m->variant_id,
                'url' => $m->getUrl(),
                'sort_order' => $m->sort_order,
                'is_primary' => $m->is_primary,
                'storage_state' => $m->storage_state,
            ];
        }

        $tax = $this->getTaxonomyMap();
        $publicProfile = ! empty($prod->merchant_organization_id)
            ? $this->identityClient->getOrganizationPublicProfile($prod->merchant_organization_id)
            : null;
        $storeName = ! empty($publicProfile['store_name']) ? $publicProfile['store_name'] : null;

        $variantCollection = collect($variants);
        $minPrice = $variantCollection->isNotEmpty() ? (int) $variantCollection->min('price_idr') : 0;
        $maxPrice = $variantCollection->isNotEmpty() ? (int) $variantCollection->max('price_idr') : 0;
        $totalStock = $variantCollection->isNotEmpty() ? (int) $variantCollection->sum('stock_qty') : 0;
        $primaryMedia = collect($allMedia)->firstWhere('is_primary', true) ?: (collect($allMedia)->first() ?: null);

        return [
            'id' => $prod->id,
            'merchant_organization_id' => $prod->merchant_organization_id,
            'merchant_name' => $storeName ?: 'Mitra Toko SERVIO',
            'merchant' => [
                'organization_id' => $prod->merchant_organization_id,
                'store_name' => $storeName ?: 'Mitra Toko SERVIO',
                'store_profile_status' => $storeName ? 'AVAILABLE' : 'PENDING_IDENTITY_INTEGRATION',
                'public_profile' => $publicProfile,
            ],
            'name' => $prod->name,
            'description' => $prod->description,
            'brand' => $prod->brand_name,
            'brand_name' => $prod->brand_name,
            'category_id' => $prod->category_id,
            'category_name' => $tax['categories'][$prod->category_id] ?? null,
            'subcategory_id' => $prod->subcategory_id,
            'subcategory_name' => $tax['subcategories'][$prod->subcategory_id] ?? null,
            'status' => $prod->status,
            'lock_version' => $prod->lock_version,
            'min_price' => $minPrice,
            'max_price' => $maxPrice,
            'price_idr' => $minPrice,
            'total_stock' => $totalStock,
            'primary_image_url' => $primaryMedia['url'] ?? null,
            'variants' => $variants,
            'media' => $allMedia,
            'activation_requirements' => $this->evaluateActivationRequirements($prod),
            'created_at' => $prod->created_at->toIso8601String(),
            'updated_at' => $prod->updated_at->toIso8601String(),
        ];
    }

    /**
     * M03: Create Product (Draft)
     */
    public function createProduct(AuthenticatedActor $actor, array $data): array
    {
        $productId = (string) Str::uuid();
        $name = trim($data['name']);
        $normalizedName = Product::normalizeString($name);
        $brandName = ! empty($data['brand']) ? trim($data['brand']) : null;
        $brandNorm = Product::normalizeString($brandName);
        $description = $data['description'] ?? null;
        $categoryId = $data['category_id'] ?? null;
        $subcategoryId = $data['subcategory_id'] ?? null;

        // If category provided, validate and claim
        $catClaimId = null;
        $subClaimId = null;

        if ($categoryId && $subcategoryId) {
            $catCheck = $this->categoryClient->checkEligibility('CATEGORY', $categoryId, 'NEW_ASSIGNMENT');
            $subCheck = $this->categoryClient->checkEligibility('SUBCATEGORY', $subcategoryId, 'NEW_ASSIGNMENT');

            if (! $catCheck || empty($catCheck['effective_active']) || ($catCheck['master_code'] ?? '') !== 'PRODUK') {
                throw new HttpException(422, 'Kategori tidak valid atau bukan dari cabang PRODUK.');
            }
            if (! $subCheck || empty($subCheck['effective_active']) || ($subCheck['master_code'] ?? '') !== 'PRODUK') {
                throw new HttpException(422, 'Subkategori tidak valid atau bukan dari cabang PRODUK.');
            }

            // Register reference claims
            $claimCat = $this->categoryClient->storeReferenceClaim('CATEGORY', $categoryId, $productId);
            $claimSub = $this->categoryClient->storeReferenceClaim('SUBCATEGORY', $subcategoryId, $productId);
            $catClaimId = $claimCat['claim_id'] ?? null;
            $subClaimId = $claimSub['claim_id'] ?? null;
        }

        return DB::transaction(function () use (
            $productId,
            $actor,
            $name,
            $normalizedName,
            $brandName,
            $brandNorm,
            $description,
            $categoryId,
            $subcategoryId,
            $catClaimId,
            $subClaimId,
            $data
        ) {
            $product = Product::create([
                'id' => $productId,
                'merchant_organization_id' => $actor->organizationId,
                'created_by_user_id' => $actor->id,
                'name' => $name,
                'normalized_name' => $normalizedName,
                'description' => $description,
                'brand_name' => $brandName,
                'brand_normalized' => $brandNorm,
                'category_id' => $categoryId,
                'subcategory_id' => $subcategoryId,
                'status' => 'DRAFT',
                'lock_version' => 1,
            ]);

            // Save assignment history if category is present
            if ($categoryId && $subcategoryId) {
                ProductCategoryAssignment::create([
                    'id' => (string) Str::uuid(),
                    'product_id' => $productId,
                    'category_id' => $categoryId,
                    'subcategory_id' => $subcategoryId,
                    'assigned_by_user_id' => $actor->id,
                    'effective_from' => now(),
                    'category_claim_id' => $catClaimId,
                    'subcategory_claim_id' => $subClaimId,
                ]);
            }

            // Inline variants if provided
            if (! empty($data['variants']) && is_array($data['variants'])) {
                $signatures = [];
                foreach ($data['variants'] as $v) {
                    $attr = $v['attributes'] ?? [];
                    if (empty($attr) || ! is_array($attr)) {
                        throw new HttpException(422, 'Atribut varian wajib diisi.');
                    }
                    $sig = ProductVariant::computeSignature($attr);
                    if (in_array($sig, $signatures, true)) {
                        throw new HttpException(409, 'Kombinasi atribut varian duplikat ditemukan dalam satu produk.');
                    }
                    $signatures[] = $sig;

                    $price = max(0, (int) ($v['price_idr'] ?? 0));
                    $stock = max(0, (int) ($v['stock_qty'] ?? 0));
                    $varStatus = strtoupper($v['status'] ?? 'INACTIVE');

                    $variantId = (string) Str::uuid();
                    ProductVariant::create([
                        'id' => $variantId,
                        'product_id' => $productId,
                        'attributes_json' => $attr,
                        'attribute_signature' => $sig,
                        'display_name' => $v['display_name'] ?? null,
                        'price_idr' => $price,
                        'stock_qty' => $stock,
                        'status' => $varStatus,
                        'lock_version' => 1,
                    ]);

                    if ($stock > 0) {
                        ProductStockAdjustment::create([
                            'id' => (string) Str::uuid(),
                            'product_id' => $productId,
                            'variant_id' => $variantId,
                            'actor_user_id' => $actor->id,
                            'actor_org_id' => $actor->organizationId,
                            'before_qty' => 0,
                            'delta_qty' => $stock,
                            'after_qty' => $stock,
                            'reason_code' => 'INITIAL_STOCK',
                            'occurred_at' => now(),
                        ]);
                    }
                }
            }

            // Audit Log
            ProductAuditLog::create([
                'id' => (string) Str::uuid(),
                'product_id' => $productId,
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'PRODUCT_CREATED',
                'entity_type' => 'PRODUCT',
                'entity_id' => $productId,
                'after_safe' => ['name' => $name, 'status' => 'DRAFT'],
                'request_id' => request()->header('X-Request-Id', (string) Str::uuid()),
                'occurred_at' => now(),
            ]);

            // Outbox Event
            ProductOutboxEvent::create([
                'id' => (string) Str::uuid(),
                'product_id' => $productId,
                'event_type' => 'product.created.v1',
                'aggregate_version' => 1,
                'payload' => [
                    'product_id' => $productId,
                    'merchant_org_id' => $actor->organizationId,
                    'status' => 'DRAFT',
                ],
                'occurred_at' => now(),
            ]);

            return $this->formatProductAdminView($product->fresh(['variants', 'media']));
        });
    }

    /**
     * M04: Edit Product
     */
    public function updateProduct(AuthenticatedActor $actor, string $id, array $data, ?string $ifMatch): array
    {
        $product = Product::where('id', $id)
            ->where('merchant_organization_id', $actor->organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (! $product) {
            throw new HttpException(404, 'Produk tidak ditemukan.');
        }

        if ($ifMatch === null) {
            throw new HttpException(428, 'Header If-Match diperlukan.');
        }
        if ($this->parseLockVersion($ifMatch) !== (int) $product->lock_version) {
            throw new HttpException(409, 'Versi produk telah berubah (version conflict).');
        }

        // If category is changing
        $newCategoryId = $data['category_id'] ?? $product->category_id;
        $newSubcategoryId = $data['subcategory_id'] ?? $product->subcategory_id;
        $categoryChanging = ($newCategoryId !== $product->category_id || $newSubcategoryId !== $product->subcategory_id);

        $catClaimId = null;
        $subClaimId = null;

        if ($categoryChanging) {
            if ($newCategoryId && $newSubcategoryId) {
                $catCheck = $this->categoryClient->checkEligibility('CATEGORY', $newCategoryId, 'NEW_ASSIGNMENT');
                $subCheck = $this->categoryClient->checkEligibility('SUBCATEGORY', $newSubcategoryId, 'NEW_ASSIGNMENT');

                if (! $catCheck || empty($catCheck['effective_active']) || ($catCheck['master_code'] ?? '') !== 'PRODUK') {
                    throw new HttpException(422, 'Kategori baru tidak valid atau bukan PRODUK.');
                }
                if (! $subCheck || empty($subCheck['effective_active']) || ($subCheck['master_code'] ?? '') !== 'PRODUK') {
                    throw new HttpException(422, 'Subkategori baru tidak valid atau bukan PRODUK.');
                }

                $claimCat = $this->categoryClient->storeReferenceClaim('CATEGORY', $newCategoryId, $product->id);
                $claimSub = $this->categoryClient->storeReferenceClaim('SUBCATEGORY', $newSubcategoryId, $product->id);
                $catClaimId = $claimCat['claim_id'] ?? null;
                $subClaimId = $claimSub['claim_id'] ?? null;
            }
        }

        return DB::transaction(function () use (
            $product,
            $actor,
            $data,
            $newCategoryId,
            $newSubcategoryId,
            $categoryChanging,
            $catClaimId,
            $subClaimId
        ) {
            $beforeSafe = [
                'name' => $product->name,
                'category_id' => $product->category_id,
                'subcategory_id' => $product->subcategory_id,
            ];

            if (isset($data['name'])) {
                $product->name = trim($data['name']);
                $product->normalized_name = Product::normalizeString($data['name']);
            }
            if (isset($data['description'])) {
                $product->description = $data['description'];
            }
            if (isset($data['brand'])) {
                $product->brand_name = trim($data['brand']);
                $product->brand_normalized = Product::normalizeString($data['brand']);
            }

            if ($categoryChanging) {
                // Close existing assignment
                ProductCategoryAssignment::where('product_id', $product->id)
                    ->whereNull('effective_to')
                    ->update(['effective_to' => now()]);

                $product->category_id = $newCategoryId;
                $product->subcategory_id = $newSubcategoryId;

                if ($newCategoryId && $newSubcategoryId) {
                    ProductCategoryAssignment::create([
                        'id' => (string) Str::uuid(),
                        'product_id' => $product->id,
                        'category_id' => $newCategoryId,
                        'subcategory_id' => $newSubcategoryId,
                        'assigned_by_user_id' => $actor->id,
                        'effective_from' => now(),
                        'category_claim_id' => $catClaimId,
                        'subcategory_claim_id' => $subClaimId,
                    ]);
                }
            }

            $product->lock_version += 1;
            $product->save();

            // Audit
            ProductAuditLog::create([
                'id' => (string) Str::uuid(),
                'product_id' => $product->id,
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'PRODUCT_UPDATED',
                'entity_type' => 'PRODUCT',
                'entity_id' => $product->id,
                'before_safe' => $beforeSafe,
                'after_safe' => [
                    'name' => $product->name,
                    'category_id' => $product->category_id,
                    'subcategory_id' => $product->subcategory_id,
                ],
                'request_id' => request()->header('X-Request-Id', (string) Str::uuid()),
                'occurred_at' => now(),
            ]);

            return $this->formatProductAdminView($product->fresh(['variants', 'media']));
        });
    }

    /**
     * M05: Change Product Status (Activate / Deactivate)
     */
    public function changeProductStatus(AuthenticatedActor $actor, string $id, string $targetStatus, ?string $ifMatch): array
    {
        $product = Product::withTrashed()
            ->where('id', $id)
            ->where('merchant_organization_id', $actor->organizationId)
            ->first();

        if (! $product) {
            throw new HttpException(404, 'Produk tidak ditemukan.');
        }

        if ($ifMatch === null) {
            throw new HttpException(428, 'Header If-Match diperlukan.');
        }
        if ($this->parseLockVersion($ifMatch) !== (int) $product->lock_version) {
            throw new HttpException(409, 'Versi produk telah berubah (version conflict).');
        }

        $targetStatus = strtoupper($targetStatus);

        if (! in_array($targetStatus, ['ACTIVE', 'INACTIVE'], true)) {
            throw new HttpException(422, 'Status tujuan tidak valid. Hanya ACTIVE atau INACTIVE yang diizinkan.');
        }

        if ($targetStatus === 'ACTIVE') {
            $requirements = $this->evaluateActivationRequirements($product);
            if (! $requirements['can_activate']) {
                return [
                    'error_code' => 'PRODUCT_ACTIVATION_REQUIREMENTS_NOT_MET',
                    'message' => 'Syarat aktivasi produk belum terpenuhi: ' . implode(', ', $requirements['blocking_reasons']),
                    'status_code' => 409,
                    'data' => [
                        'id' => $product->id,
                        'status' => $product->status,
                        'lock_version' => $product->lock_version,
                        'activation_requirements' => $requirements,
                    ],
                ];
            }
        }

        return DB::transaction(function () use ($product, $actor, $targetStatus) {
            $beforeStatus = $product->status;
            if ($targetStatus === 'ACTIVE') {
                $product->deleted_at = null;
                $product->status = 'ACTIVE';
            } else {
                $product->status = $targetStatus;
            }
            $product->lock_version += 1;
            $product->save();

            ProductAuditLog::create([
                'id' => (string) Str::uuid(),
                'product_id' => $product->id,
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'PRODUCT_STATUS_CHANGED',
                'entity_type' => 'PRODUCT',
                'entity_id' => $product->id,
                'before_safe' => ['status' => $beforeStatus],
                'after_safe' => ['status' => $targetStatus],
                'request_id' => request()->header('X-Request-Id', (string) Str::uuid()),
                'occurred_at' => now(),
            ]);

            ProductOutboxEvent::create([
                'id' => (string) Str::uuid(),
                'product_id' => $product->id,
                'event_type' => 'product.status_changed.v1',
                'aggregate_version' => $product->lock_version,
                'payload' => [
                    'product_id' => $product->id,
                    'status' => $targetStatus,
                ],
                'occurred_at' => now(),
            ]);

            return [
                'id' => $product->id,
                'status' => $product->status,
                'lock_version' => $product->lock_version,
                'activation_requirements' => $this->evaluateActivationRequirements($product),
            ];
        });
    }

    /**
     * M06: Archive / Soft Delete Product
     */
    public function archiveProduct(AuthenticatedActor $actor, string $id, ?string $reason, ?string $ifMatch): array
    {
        $product = Product::withTrashed()
            ->where('id', $id)
            ->where('merchant_organization_id', $actor->organizationId)
            ->first();

        if (! $product) {
            throw new HttpException(404, 'Produk tidak ditemukan.');
        }

        if ($ifMatch === null) {
            throw new HttpException(428, 'Header If-Match diperlukan.');
        }
        if ($this->parseLockVersion($ifMatch) !== (int) $product->lock_version) {
            throw new HttpException(409, 'Versi produk telah berubah (version conflict).');
        }

        return DB::transaction(function () use ($product, $actor, $reason) {
            $product->deleted_at = now();
            $product->status = 'ARCHIVED';
            $product->lock_version += 1;
            $product->save();

            ProductAuditLog::create([
                'id' => (string) Str::uuid(),
                'product_id' => $product->id,
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'PRODUCT_ARCHIVED',
                'entity_type' => 'PRODUCT',
                'entity_id' => $product->id,
                'reason' => $reason,
                'request_id' => request()->header('X-Request-Id', (string) Str::uuid()),
                'occurred_at' => now(),
            ]);

            ProductOutboxEvent::create([
                'id' => (string) Str::uuid(),
                'product_id' => $product->id,
                'event_type' => 'product.archived.v1',
                'aggregate_version' => $product->lock_version,
                'payload' => [
                    'product_id' => $product->id,
                    'archived_at' => now()->toIso8601String(),
                ],
                'occurred_at' => now(),
            ]);

            return [
                'product_id' => $product->id,
                'deleted_at' => $product->deleted_at->toIso8601String(),
                'physical_delete' => false,
            ];
        });
    }

    /**
     * M07: Add Variant
     */
    public function addVariant(AuthenticatedActor $actor, string $productId, array $data): array
    {
        $product = Product::where('id', $productId)
            ->where('merchant_organization_id', $actor->organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (! $product) {
            throw new HttpException(404, 'Produk tidak ditemukan.');
        }

        $attr = $data['attributes'] ?? [];
        if (empty($attr) || ! is_array($attr)) {
            throw new HttpException(422, 'Atribut varian wajib diisi.');
        }

        $sig = ProductVariant::computeSignature($attr);

        // Check if duplicate signature on nondeleted variants
        $existing = ProductVariant::where('product_id', $product->id)
            ->where('attribute_signature', $sig)
            ->whereNull('deleted_at')
            ->exists();

        if ($existing) {
            throw new HttpException(409, 'Kombinasi atribut varian sudah ada pada produk ini.');
        }

        $price = max(0, (int) ($data['price_idr'] ?? 0));
        $stock = max(0, (int) ($data['stock_qty'] ?? 0));
        $status = strtoupper($data['status'] ?? 'ACTIVE');

        return DB::transaction(function () use ($product, $actor, $attr, $sig, $price, $stock, $status, $data) {
            $variantId = (string) Str::uuid();

            $variant = ProductVariant::create([
                'id' => $variantId,
                'product_id' => $product->id,
                'attributes_json' => $attr,
                'attribute_signature' => $sig,
                'display_name' => $data['display_name'] ?? null,
                'price_idr' => $price,
                'stock_qty' => $stock,
                'status' => $status,
                'lock_version' => 1,
            ]);

            if ($stock > 0) {
                ProductStockAdjustment::create([
                    'id' => (string) Str::uuid(),
                    'product_id' => $product->id,
                    'variant_id' => $variantId,
                    'actor_user_id' => $actor->id,
                    'actor_org_id' => $actor->organizationId,
                    'before_qty' => 0,
                    'delta_qty' => $stock,
                    'after_qty' => $stock,
                    'reason_code' => 'INITIAL_STOCK',
                    'occurred_at' => now(),
                ]);
            }

            $product->lock_version += 1;
            $product->save();

            ProductAuditLog::create([
                'id' => (string) Str::uuid(),
                'product_id' => $product->id,
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'VARIANT_CREATED',
                'entity_type' => 'VARIANT',
                'entity_id' => $variantId,
                'after_safe' => ['attributes' => $attr, 'price_idr' => $price, 'stock_qty' => $stock],
                'request_id' => request()->header('X-Request-Id', (string) Str::uuid()),
                'occurred_at' => now(),
            ]);

            return [
                'id' => $variant->id,
                'product_id' => $variant->product_id,
                'attributes' => $variant->attributes_json,
                'display_name' => $variant->display_name ?: implode(' / ', array_values($variant->attributes_json ?? [])),
                'price_idr' => $variant->price_idr,
                'stock_qty' => $variant->stock_qty,
                'status' => $variant->status,
                'lock_version' => $variant->lock_version,
                'media' => [],
            ];
        });
    }

    /**
     * M08: Edit Variant (Price, Stock, Attributes)
     */
    public function updateVariant(AuthenticatedActor $actor, string $productId, string $variantId, array $data, ?string $ifMatch): array
    {
        $product = Product::where('id', $productId)
            ->where('merchant_organization_id', $actor->organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (! $product) {
            throw new HttpException(404, 'Produk tidak ditemukan.');
        }

        $variant = ProductVariant::where('id', $variantId)
            ->where('product_id', $product->id)
            ->whereNull('deleted_at')
            ->first();

        if (! $variant) {
            throw new HttpException(404, 'Varian tidak ditemukan.');
        }

        if ($ifMatch === null) {
            throw new HttpException(428, 'Header If-Match diperlukan.');
        }
        if ($this->parseLockVersion($ifMatch) !== (int) $variant->lock_version) {
            throw new HttpException(409, 'Versi varian telah berubah (version conflict).');
        }

        // If updating attributes, check uniqueness
        if (! empty($data['attributes'])) {
            $sig = ProductVariant::computeSignature($data['attributes']);
            $existing = ProductVariant::where('product_id', $product->id)
                ->where('id', '!=', $variant->id)
                ->where('attribute_signature', $sig)
                ->whereNull('deleted_at')
                ->exists();

            if ($existing) {
                throw new HttpException(409, 'Kombinasi atribut varian sudah digunakan oleh varian lain pada produk ini.');
            }
        }

        return DB::transaction(function () use ($product, $variant, $actor, $data) {
            $beforeSafe = [
                'price_idr' => $variant->price_idr,
                'stock_qty' => $variant->stock_qty,
            ];

            if (isset($data['attributes'])) {
                $variant->attributes_json = $data['attributes'];
                $variant->attribute_signature = ProductVariant::computeSignature($data['attributes']);
            }
            if (isset($data['display_name'])) {
                $variant->display_name = $data['display_name'];
            }
            if (isset($data['price_idr'])) {
                $variant->price_idr = max(0, (int) $data['price_idr']);
            }
            if (isset($data['stock_qty'])) {
                $newStock = max(0, (int) $data['stock_qty']);
                $oldStock = (int) $variant->stock_qty;
                $delta = $newStock - $oldStock;

                if ($delta !== 0) {
                    $reasonCode = $data['stock_change_reason'] ?? 'MERCHANT_CORRECTION';
                    ProductStockAdjustment::create([
                        'id' => (string) Str::uuid(),
                        'product_id' => $product->id,
                        'variant_id' => $variant->id,
                        'actor_user_id' => $actor->id,
                        'actor_org_id' => $actor->organizationId,
                        'before_qty' => $oldStock,
                        'delta_qty' => $delta,
                        'after_qty' => $newStock,
                        'reason_code' => $reasonCode,
                        'note' => $data['stock_change_note'] ?? null,
                        'occurred_at' => now(),
                    ]);
                    $variant->stock_qty = $newStock;
                }
            }

            $variant->lock_version += 1;
            $variant->save();

            $product->lock_version += 1;
            $product->save();

            ProductAuditLog::create([
                'id' => (string) Str::uuid(),
                'product_id' => $product->id,
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'VARIANT_UPDATED',
                'entity_type' => 'VARIANT',
                'entity_id' => $variant->id,
                'before_safe' => $beforeSafe,
                'after_safe' => ['price_idr' => $variant->price_idr, 'stock_qty' => $variant->stock_qty],
                'request_id' => request()->header('X-Request-Id', (string) Str::uuid()),
                'occurred_at' => now(),
            ]);

            return [
                'id' => $variant->id,
                'product_id' => $variant->product_id,
                'attributes' => $variant->attributes_json,
                'display_name' => $variant->display_name ?: implode(' / ', array_values($variant->attributes_json ?? [])),
                'price_idr' => $variant->price_idr,
                'stock_qty' => $variant->stock_qty,
                'status' => $variant->status,
                'lock_version' => $variant->lock_version,
                'media' => $variant->media->map(fn($m) => [
                    'id' => $m->id,
                    'url' => $m->getUrl(),
                    'sort_order' => $m->sort_order,
                ])->all(),
            ];
        });
    }

    /**
     * M09: Change Variant Status
     */
    public function changeVariantStatus(AuthenticatedActor $actor, string $productId, string $variantId, string $targetStatus, ?string $ifMatch): array
    {
        $product = Product::where('id', $productId)
            ->where('merchant_organization_id', $actor->organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (! $product) {
            throw new HttpException(404, 'Produk tidak ditemukan.');
        }

        $variant = ProductVariant::where('id', $variantId)
            ->where('product_id', $product->id)
            ->whereNull('deleted_at')
            ->first();

        if (! $variant) {
            throw new HttpException(404, 'Varian tidak ditemukan.');
        }

        if ($ifMatch === null) {
            throw new HttpException(428, 'Header If-Match diperlukan.');
        }
        if ($this->parseLockVersion($ifMatch) !== (int) $variant->lock_version) {
            throw new HttpException(409, 'Versi varian telah berubah (version conflict).');
        }

        $targetStatus = strtoupper($targetStatus);

        // If product is ACTIVE and we are deactivating this variant, ensure it's not the last active variant
        if ($product->status === 'ACTIVE' && $targetStatus === 'INACTIVE') {
            $otherActiveCount = ProductVariant::where('product_id', $product->id)
                ->where('id', '!=', $variant->id)
                ->where('status', 'ACTIVE')
                ->whereNull('deleted_at')
                ->count();

            if ($otherActiveCount === 0) {
                throw new HttpException(409, 'Produk ACTIVE wajib memiliki minimal 1 varian aktif.');
            }
        }

        return DB::transaction(function () use ($product, $variant, $actor, $targetStatus) {
            $variant->status = $targetStatus;
            $variant->lock_version += 1;
            $variant->save();

            $product->lock_version += 1;
            $product->save();

            ProductAuditLog::create([
                'id' => (string) Str::uuid(),
                'product_id' => $product->id,
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'VARIANT_STATUS_CHANGED',
                'entity_type' => 'VARIANT',
                'entity_id' => $variant->id,
                'after_safe' => ['status' => $targetStatus],
                'request_id' => request()->header('X-Request-Id', (string) Str::uuid()),
                'occurred_at' => now(),
            ]);

            return [
                'id' => $variant->id,
                'product_id' => $variant->product_id,
                'status' => $variant->status,
                'lock_version' => $variant->lock_version,
            ];
        });
    }

    /**
     * M10: Archive / Soft Delete Variant
     */
    public function archiveVariant(AuthenticatedActor $actor, string $productId, string $variantId, ?string $ifMatch): array
    {
        $product = Product::where('id', $productId)
            ->where('merchant_organization_id', $actor->organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (! $product) {
            throw new HttpException(404, 'Produk tidak ditemukan.');
        }

        $variant = ProductVariant::where('id', $variantId)
            ->where('product_id', $product->id)
            ->whereNull('deleted_at')
            ->first();

        if (! $variant) {
            throw new HttpException(404, 'Varian tidak ditemukan.');
        }

        if ($ifMatch === null) {
            throw new HttpException(428, 'Header If-Match diperlukan.');
        }
        if ($this->parseLockVersion($ifMatch) !== (int) $variant->lock_version) {
            throw new HttpException(409, 'Versi varian telah berubah (version conflict).');
        }

        // If product is ACTIVE and this variant is ACTIVE, reject if it's the last active variant
        if ($product->status === 'ACTIVE' && $variant->status === 'ACTIVE') {
            $otherActiveCount = ProductVariant::where('product_id', $product->id)
                ->where('id', '!=', $variant->id)
                ->where('status', 'ACTIVE')
                ->whereNull('deleted_at')
                ->count();

            if ($otherActiveCount === 0) {
                throw new HttpException(409, 'Tidak dapat menghapus varian aktif terakhir pada produk ACTIVE.');
            }
        }

        return DB::transaction(function () use ($product, $variant, $actor) {
            $variant->deleted_at = now();
            $variant->lock_version += 1;
            $variant->save();

            $product->lock_version += 1;
            $product->save();

            ProductAuditLog::create([
                'id' => (string) Str::uuid(),
                'product_id' => $product->id,
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'VARIANT_ARCHIVED',
                'entity_type' => 'VARIANT',
                'entity_id' => $variant->id,
                'request_id' => request()->header('X-Request-Id', (string) Str::uuid()),
                'occurred_at' => now(),
            ]);

            return [
                'variant_id' => $variant->id,
                'product_id' => $product->id,
                'deleted_at' => $variant->deleted_at->toIso8601String(),
                'physical_delete' => false,
            ];
        });
    }

    /**
     * M11: Upload Media (General or Variant)
     */
    public function uploadMedia(AuthenticatedActor $actor, string $productId, UploadedFile $file, string $scope, ?string $variantId): array
    {
        $product = Product::where('id', $productId)
            ->where('merchant_organization_id', $actor->organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (! $product) {
            throw new HttpException(404, 'Produk tidak ditemukan.');
        }

        $scope = strtoupper($scope);

        if ($scope === 'GENERAL') {
            if (! empty($variantId)) {
                throw new HttpException(422, 'Foto umum (GENERAL) tidak boleh mengaitkan variant_id.');
            }
        } elseif ($scope === 'VARIANT') {
            if (empty($variantId)) {
                throw new HttpException(422, 'Foto varian (VARIANT) wajib menyertakan variant_id.');
            }
            $variantExists = ProductVariant::where('id', $variantId)
                ->where('product_id', $product->id)
                ->whereNull('deleted_at')
                ->exists();
            if (! $variantExists) {
                throw new HttpException(422, 'Varian yang dipilih tidak ditemukan pada produk ini.');
            }
        } else {
            throw new HttpException(422, 'Scope media tidak valid. Pilih GENERAL atau VARIANT.');
        }

        // Validate MIME and size
        $mime = $file->getMimeType();
        $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (! in_array($mime, $allowedMimes, true)) {
            throw new HttpException(415, 'Format gambar tidak didukung. Gunakan JPEG, PNG, atau WebP.');
        }

        $bytes = $file->getSize();
        $maxBytes = (int) config('services.media.max_bytes', env('PRODUCT_MEDIA_MAX_BYTES', 5242880));
        if ($bytes > $maxBytes) {
            throw new HttpException(413, 'Ukuran berkas melebihi batas 5MB.');
        }

        $sha256 = hash_file('sha256', $file->getRealPath());
        $ext = $file->getClientOriginalExtension() ?: 'jpg';
        $mediaId = (string) Str::uuid();
        $storageKey = "products/{$product->id}/{$mediaId}.{$ext}";

        $storageDisk = 'local';
        $fileSaved = false;

        try {
            $fileContent = file_get_contents($file->getRealPath());
            if ($fileContent === false) {
                throw new HttpException(500, 'Gagal membaca berkas media.');
            }

            $putOk = Storage::disk($storageDisk)->put($storageKey, $fileContent);
            if (! $putOk) {
                throw new HttpException(500, 'Gagal menyimpan berkas ke object storage.');
            }
            $fileSaved = true;

            return DB::transaction(function () use (
                $product,
                $mediaId,
                $scope,
                $variantId,
                $storageDisk,
                $storageKey,
                $file,
                $mime,
                $bytes,
                $sha256,
                $actor
            ) {
                // Determine sort order
                $currentMaxOrder = ProductMedia::where('product_id', $product->id)
                    ->where('scope', $scope)
                    ->when($variantId, fn($q) => $q->where('variant_id', $variantId))
                    ->whereNull('deleted_at')
                    ->max('sort_order') ?? -1;

                $isPrimary = false;
                if ($scope === 'GENERAL') {
                    $hasGeneral = ProductMedia::where('product_id', $product->id)
                        ->where('scope', 'GENERAL')
                        ->whereNull('deleted_at')
                        ->exists();
                    $isPrimary = ! $hasGeneral;
                }

                $media = ProductMedia::create([
                    'id' => $mediaId,
                    'product_id' => $product->id,
                    'variant_id' => $variantId,
                    'scope' => $scope,
                    'storage_disk' => $storageDisk,
                    'storage_key' => $storageKey,
                    'original_filename' => $file->getClientOriginalName(),
                    'mime_type' => $mime,
                    'bytes' => $bytes,
                    'sha256' => $sha256,
                    'sort_order' => $currentMaxOrder + 1,
                    'is_primary' => $isPrimary,
                    'storage_state' => 'READY',
                ]);

                $product->lock_version += 1;
                $product->save();

                ProductAuditLog::create([
                    'id' => (string) Str::uuid(),
                    'product_id' => $product->id,
                    'actor_user_id' => $actor->id,
                    'actor_role' => $actor->role,
                    'actor_org_id' => $actor->organizationId,
                    'action' => 'MEDIA_UPLOADED',
                    'entity_type' => 'MEDIA',
                    'entity_id' => $mediaId,
                    'after_safe' => ['scope' => $scope, 'variant_id' => $variantId, 'bytes' => $bytes],
                    'request_id' => request()->header('X-Request-Id', (string) Str::uuid()),
                    'occurred_at' => now(),
                ]);

                return [
                    'id' => $media->id,
                    'scope' => $media->scope,
                    'product_id' => $media->product_id,
                    'variant_id' => $media->variant_id,
                    'url' => $media->getUrl(),
                    'sort_order' => $media->sort_order,
                    'is_primary' => $media->is_primary,
                    'storage_state' => $media->storage_state,
                ];
            });
        } catch (\Throwable $e) {
            if ($fileSaved && Storage::disk($storageDisk)->exists($storageKey)) {
                Storage::disk($storageDisk)->delete($storageKey);
            }
            throw $e;
        }
    }

    /**
     * M12: Reorder Product Media
     */
    public function reorderMedia(AuthenticatedActor $actor, string $productId, string $scope, ?string $variantId, array $orderedIds, ?string $ifMatch): array
    {
        $product = Product::where('id', $productId)
            ->where('merchant_organization_id', $actor->organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (! $product) {
            throw new HttpException(404, 'Produk tidak ditemukan.');
        }

        if ($ifMatch === null) {
            throw new HttpException(428, 'Header If-Match diperlukan.');
        }
        if ($this->parseLockVersion($ifMatch) !== (int) $product->lock_version) {
            throw new HttpException(409, 'Versi produk telah berubah (version conflict).');
        }

        $scope = strtoupper($scope);

        $existingMedia = ProductMedia::where('product_id', $product->id)
            ->where('scope', $scope)
            ->when($variantId, fn($q) => $q->where('variant_id', $variantId), fn($q) => $q->whereNull('variant_id'))
            ->whereNull('deleted_at')
            ->get();

        $existingIds = $existingMedia->pluck('id')->all();

        // Must be exact permutation
        sort($existingIds);
        $testOrdered = $orderedIds;
        sort($testOrdered);

        if ($existingIds !== $testOrdered) {
            throw new HttpException(422, 'Daftar ID media untuk reorder harus merupakan permutasi lengkap dari media aktif.');
        }

        return DB::transaction(function () use ($product, $scope, $variantId, $orderedIds, $existingMedia) {
            foreach ($orderedIds as $index => $id) {
                ProductMedia::where('id', $id)->update([
                    'sort_order' => $index,
                    'is_primary' => ($scope === 'GENERAL' && $index === 0),
                ]);
            }

            $product->lock_version += 1;
            $product->save();

            $updated = ProductMedia::where('product_id', $product->id)
                ->where('scope', $scope)
                ->when($variantId, fn($q) => $q->where('variant_id', $variantId))
                ->whereNull('deleted_at')
                ->orderBy('sort_order', 'asc')
                ->get()
                ->map(fn($m) => [
                    'id' => $m->id,
                    'scope' => $m->scope,
                    'variant_id' => $m->variant_id,
                    'url' => $m->getUrl(),
                    'sort_order' => $m->sort_order,
                    'is_primary' => $m->is_primary,
                ])
                ->all();

            return [
                'product_id' => $product->id,
                'scope' => $scope,
                'variant_id' => $variantId,
                'media' => $updated,
                'product_lock_version' => $product->lock_version,
            ];
        });
    }

    /**
     * M13: Archive / Soft Delete Media
     */
    public function archiveMedia(AuthenticatedActor $actor, string $productId, string $mediaId, ?string $ifMatch): array
    {
        $product = Product::where('id', $productId)
            ->where('merchant_organization_id', $actor->organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (! $product) {
            throw new HttpException(404, 'Produk tidak ditemukan.');
        }

        if ($ifMatch === null) {
            throw new HttpException(428, 'Header If-Match diperlukan.');
        }
        if ($this->parseLockVersion($ifMatch) !== (int) $product->lock_version) {
            throw new HttpException(409, 'Versi produk telah berubah (version conflict).');
        }

        $media = ProductMedia::where('id', $mediaId)
            ->where('product_id', $product->id)
            ->whereNull('deleted_at')
            ->first();

        if (! $media) {
            throw new HttpException(404, 'Media tidak ditemukan.');
        }

        // If product is ACTIVE and this is the last READY GENERAL media, reject
        if ($product->status === 'ACTIVE' && $media->scope === 'GENERAL') {
            $otherGeneralCount = ProductMedia::where('product_id', $product->id)
                ->where('id', '!=', $media->id)
                ->where('scope', 'GENERAL')
                ->where('storage_state', 'READY')
                ->whereNull('deleted_at')
                ->count();

            if ($otherGeneralCount === 0) {
                throw new HttpException(409, 'Tidak dapat menghapus foto umum terakhir pada produk ACTIVE.');
            }
        }

        return DB::transaction(function () use ($product, $media, $actor) {
            $media->deleted_at = now();
            $media->save();

            $product->lock_version += 1;
            $product->save();

            ProductAuditLog::create([
                'id' => (string) Str::uuid(),
                'product_id' => $product->id,
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'MEDIA_ARCHIVED',
                'entity_type' => 'MEDIA',
                'entity_id' => $media->id,
                'request_id' => request()->header('X-Request-Id', (string) Str::uuid()),
                'occurred_at' => now(),
            ]);

            return [
                'media_id' => $media->id,
                'product_id' => $product->id,
                'deleted_at' => $media->deleted_at->toIso8601String(),
                'physical_delete' => false,
            ];
        });
    }

    /**
     * P04: Stream Product Media
     */
    public function getMediaBinary(string $mediaId, AuthenticatedActor $actor): ?array
    {
        $media = ProductMedia::where('id', $mediaId)->first();
        if (! $media || $media->storage_state !== 'READY') {
            return null;
        }

        $product = Product::find($media->product_id);
        if (! $product) {
            return null;
        }

        // If guest or customer: product must be public eligible
        if ($actor->isGuest || $actor->isCustomer()) {
            if ($product->status !== 'ACTIVE' || $product->deleted_at !== null) {
                return null;
            }
        } else {
            // If merchant: can view own media
            if ($actor->isMerchant()) {
                if ($product->merchant_organization_id !== $actor->organizationId) {
                    return null;
                }
            } elseif (! $actor->isGovernance()) {
                return null;
            }
        }

        if (! Storage::disk('local')->exists($media->storage_key)) {
            return null;
        }

        $content = Storage::disk('local')->get($media->storage_key);

        return [
            'content' => $content,
            'mime_type' => $media->mime_type,
            'filename' => $media->original_filename ?: 'image',
        ];
    }

    /**
     * G01: Governance List Products (Admin / CEO)
     */
    public function listGovernanceProducts(AuthenticatedActor $actor, array $filters = []): array
    {
        $query = Product::query()
            ->withCount(['variants as variant_count' => fn($q) => $q->whereNull('deleted_at')])
            ->with([
                'variants' => fn($q) => $q->whereNull('deleted_at'),
                'media' => fn($q) => $q->where('scope', 'GENERAL')->whereNull('deleted_at')->orderBy('is_primary', 'desc'),
            ])
            ->orderBy('created_at', 'desc');

        if (! empty($filters['merchant_id'])) {
            $query->where('merchant_organization_id', $filters['merchant_id']);
        }
        if (! empty($filters['status'])) {
            $query->where('status', strtoupper($filters['status']));
        }
        if (! empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }
        if (! empty($filters['search'])) {
            $norm = Product::normalizeString($filters['search']);
            $query->where('normalized_name', 'LIKE', "%{$norm}%");
        }

        $limit = min(max((int) ($filters['limit'] ?? 20), 1), 100);
        $paginator = $query->paginate($limit);

        // Preload merchant organizations
        $merchantIds = $paginator->getCollection()->pluck('merchant_organization_id')->filter()->unique()->all();
        $this->identityClient->preloadOrganizationProfiles($merchantIds);

        $tax = $this->getTaxonomyMap();
        $items = [];
        foreach ($paginator->items() as $p) {
            $primary = $p->media->first();
            $variants = $p->variants;
            $minPrice = $variants->isNotEmpty() ? (int) $variants->min('price_idr') : 0;
            $maxPrice = $variants->isNotEmpty() ? (int) $variants->max('price_idr') : 0;
            $totalStock = $variants->isNotEmpty() ? (int) $variants->sum('stock_qty') : 0;

            $publicProfile = $this->identityClient->getOrganizationPublicProfile($p->merchant_organization_id);
            $storeName = ! empty($publicProfile['store_name']) ? $publicProfile['store_name'] : null;

            $items[] = [
                'id' => $p->id,
                'name' => $p->name,
                'brand' => $p->brand_name,
                'brand_name' => $p->brand_name,
                'merchant_organization_id' => $p->merchant_organization_id,
                'merchant_name' => $storeName ?: 'Mitra Toko SERVIO',
                'merchant' => [
                    'organization_id' => $p->merchant_organization_id,
                    'store_name' => $storeName ?: 'Mitra Toko SERVIO',
                    'store_profile_status' => $storeName ? 'AVAILABLE' : 'PENDING_IDENTITY_INTEGRATION',
                ],
                'status' => $p->status,
                'variant_count' => (int) $p->variant_count,
                'min_price' => $minPrice,
                'max_price' => $maxPrice,
                'price_idr' => $minPrice,
                'total_stock' => $totalStock,
                'category_id' => $p->category_id,
                'category_name' => $tax['categories'][$p->category_id] ?? null,
                'subcategory_id' => $p->subcategory_id,
                'subcategory_name' => $tax['subcategories'][$p->subcategory_id] ?? null,
                'lock_version' => $p->lock_version,
                'primary_image_url' => $primary?->getUrl(),
                'created_at' => $p->created_at->toIso8601String(),
                'updated_at' => $p->updated_at->toIso8601String(),
            ];
        }

        return [
            'items' => $items,
            'page' => [
                'limit' => $limit,
                'has_more' => $paginator->hasMorePages(),
                'total' => $paginator->total(),
            ],
        ];
    }

    /**
     * G02: Governance Get Product Detail
     */
    public function getGovernanceProductDetail(AuthenticatedActor $actor, string $id): ?array
    {
        $product = Product::with(['variants', 'media'])->find($id);
        if (! $product) {
            return null;
        }

        return $this->formatProductAdminView($product);
    }

    /**
     * G03: Product Audit Logs
     */
    public function listAuditLogs(AuthenticatedActor $actor, array $filters = []): array
    {
        $query = ProductAuditLog::query()->orderBy('occurred_at', 'desc');

        if ($actor->isMerchant()) {
            $query->where('actor_org_id', $actor->organizationId);
        }

        if (! empty($filters['product_id'])) {
            $query->where('product_id', $filters['product_id']);
        }
        if (! empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        $limit = min(max((int) ($filters['limit'] ?? 20), 1), 100);
        $paginator = $query->paginate($limit);

        $items = [];
        foreach ($paginator->items() as $log) {
            $items[] = [
                'id' => $log->id,
                'product_id' => $log->product_id,
                'action' => $log->action,
                'entity_type' => $log->entity_type,
                'entity_id' => $log->entity_id,
                'actor_role' => $log->actor_role,
                'occurred_at' => $log->occurred_at->toIso8601String(),
                'before_safe' => $log->before_safe,
                'after_safe' => $log->after_safe,
                'reason' => $log->reason,
            ];
        }

        return [
            'items' => $items,
            'page' => [
                'limit' => $limit,
                'has_more' => $paginator->hasMorePages(),
            ],
        ];
    }

    /**
     * Internal I01: Check Category References for Category Hard Delete Protection
     */
    public function checkCategoryReferences(string $nodeType, string $nodeId): array
    {
        $nodeType = strtoupper($nodeType);

        if ($nodeType === 'CATEGORY') {
            $count = ProductCategoryAssignment::where('category_id', $nodeId)->count();
            if ($count === 0) {
                $count = Product::where('category_id', $nodeId)->count();
            }
        } else {
            $count = ProductCategoryAssignment::where('subcategory_id', $nodeId)->count();
            if ($count === 0) {
                $count = Product::where('subcategory_id', $nodeId)->count();
            }
        }

        return [
            'node_type' => $nodeType,
            'node_id' => $nodeId,
            'has_any_current_or_historical_reference' => $count > 0,
            'reference_count_at_least' => $count,
            'authoritative' => true,
            'checked_at' => now()->toIso8601String(),
            'evidence_version' => 'product-reference-db-v1',
        ];
    }
}
