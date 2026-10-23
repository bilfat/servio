<?php

namespace App\Http\Controllers;

use App\Infrastructure\CityRegistry\CityRegistryClient;
use App\Infrastructure\Identity\IdentityServiceClient;
use App\Models\Capability;
use App\Models\ServiceDefinition;
use App\Models\ServiceOffering;
use App\Models\ServiceOfferingMedia;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ServiceCatalogController extends Controller
{
    public function __construct(
        protected IdentityServiceClient $identityClient
    ) {}

    /**
     * P01: Public Catalog Listing with city filtering
     */
    public function index(Request $request): JsonResponse
    {
        $cityCode = $request->query('city_code');
        $limit = min(max((int) $request->query('limit', 20), 1), 100);

        // If no city_code provided, return empty list with location_required = true
        if (empty($cityCode)) {
            return ApiResponse::success([
                'items' => [],
                'location_required' => true,
                'selected_city_code' => null,
                'facets' => [
                    'categories' => [],
                    'subcategories' => [],
                    'pricing_models' => ['FREE', 'RANGE', 'AFTER_SURVEY'],
                ],
                'pagination' => [
                    'next_cursor' => null,
                    'limit' => $limit,
                    'has_more' => false,
                ],
            ], 'SERVICE_CATALOG_OK');
        }

        $normalizedCity = CityRegistryClient::normalize($cityCode);

        $query = ServiceOffering::query()
            ->with(['definition', 'primaryMedia', 'coverageCities'])
            ->where('status', 'ACTIVE')
            ->whereHas('definition', function ($q) {
                $q->where('status', 'ACTIVE');
            })
            ->whereHas('coverageCities', function ($q) use ($normalizedCity) {
                $q->where('city_code', $normalizedCity);
            });

        // Filter: search
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('display_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter: categories (comma-separated UUIDs)
        if ($categories = $request->query('categories') ?? $request->query('category')) {
            $catIds = array_filter(explode(',', $categories));
            if (! empty($catIds)) {
                $query->whereHas('definition', function ($q) use ($catIds) {
                    $q->whereIn('category_id', $catIds);
                });
            }
        }

        // Filter: subcategories (comma-separated UUIDs)
        if ($subcategories = $request->query('subcategories') ?? $request->query('subcategory')) {
            $subcatIds = array_filter(explode(',', $subcategories));
            if (! empty($subcatIds)) {
                $query->whereHas('definition', function ($q) use ($subcatIds) {
                    $q->whereIn('subcategory_id', $subcatIds);
                });
            }
        }

        // Filter: provider_id
        if ($providerId = $request->query('provider_id')) {
            $query->where('provider_organization_id', $providerId);
        }

        // Filter: price_model
        if ($priceModel = $request->query('price_model')) {
            $query->where('price_model', strtoupper($priceModel));
        }

        // Filter: price_min and price_max for RANGE models
        if ($priceMin = $request->query('price_min')) {
            $query->where('min_price_idr', '>=', (int) $priceMin);
        }
        if ($priceMax = $request->query('price_max')) {
            $query->where('max_price_idr', '<=', (int) $priceMax);
        }

        // Filter: survey_requirement
        if ($surveyReq = $request->query('survey_requirement')) {
            $query->where('survey_requirement', strtoupper($surveyReq));
        }

        // Sorting
        $sort = $request->query('sort', 'newest');
        switch ($sort) {
            case 'price_asc':
                $query->orderByRaw('CASE WHEN price_model = "AFTER_SURVEY" THEN 1 ELSE 0 END')
                      ->orderBy('min_price_idr', 'asc')
                      ->orderBy('id', 'asc');
                break;
            case 'price_desc':
                $query->orderByRaw('CASE WHEN price_model = "AFTER_SURVEY" THEN 1 ELSE 0 END')
                      ->orderBy('max_price_idr', 'desc')
                      ->orderBy('id', 'desc');
                break;
            case 'name_asc':
                $query->orderBy('normalized_display_name', 'asc')->orderBy('id', 'asc');
                break;
            case 'newest':
            default:
                $query->orderBy('created_at', 'desc')->orderBy('id', 'desc');
                break;
        }

        $items = $query->limit($limit)->get();

        $formatted = $items->map(function (ServiceOffering $offering) use ($normalizedCity) {
            $primaryMedia = $offering->primaryMedia;
            $profile = $this->identityClient->getOrganizationPublicProfile($offering->provider_organization_id);
            $providerName = $profile['store_name'] ?? $profile['display_name'] ?? $profile['legal_name'] ?? 'Penyedia Jasa';

            return [
                'id' => $offering->id,
                'display_name' => $offering->display_name,
                'primary_media' => $primaryMedia ? [
                    'id' => $primaryMedia->id,
                    'url' => "/api/v1/service-media/{$primaryMedia->id}",
                ] : null,
                'pricing' => [
                    'model' => $offering->price_model,
                    'min_price_idr' => $offering->min_price_idr,
                    'max_price_idr' => $offering->max_price_idr,
                    'currency' => $offering->currency,
                ],
                'survey_summary' => [
                    'available' => $offering->survey_availability === 'AVAILABLE',
                    'required' => $offering->survey_requirement === 'REQUIRED',
                    'fee_model' => $offering->survey_fee_model,
                    'fee_idr' => $offering->survey_fee_idr,
                ],
                'provider' => [
                    'organization_id' => $offering->provider_organization_id,
                    'display_name' => $providerName,
                    'store_name' => $providerName,
                    'logo_url' => $profile['logo_url'] ?? null,
                ],
                'category' => [
                    'id' => $offering->definition?->category_id,
                    'name' => 'Kategori Jasa',
                ],
                'subcategory' => [
                    'id' => $offering->definition?->subcategory_id,
                    'name' => $offering->definition?->name,
                ],
                'description' => $offering->description,
                'duration' => [
                    'min' => $offering->duration_min,
                    'max' => $offering->duration_max,
                    'unit' => $offering->duration_unit ?? 'HOUR',
                ],
                'service_area' => [
                    'selected_city_code' => $normalizedCity,
                    'serviceable' => true,
                ],
                'status' => $offering->status,
            ];
        });

        return ApiResponse::success([
            'items' => $formatted,
            'location_required' => false,
            'selected_city_code' => $normalizedCity,
            'facets' => [
                'categories' => [],
                'subcategories' => [],
                'pricing_models' => ['FREE', 'RANGE', 'AFTER_SURVEY'],
            ],
            'pagination' => [
                'next_cursor' => null,
                'limit' => $limit,
                'has_more' => false,
            ],
        ], 'SERVICE_CATALOG_OK');
    }

    /**
     * P02: Public Detail of a single offering
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $offering = ServiceOffering::with(['definition', 'media', 'coverageCities'])
            ->where('status', 'ACTIVE')
            ->find($id);

        if (! $offering || ! $offering->definition || $offering->definition->status !== 'ACTIVE') {
            return ApiResponse::error(
                'SERVICE_NOT_FOUND',
                'Layanan jasa tidak ditemukan atau tidak tersedia untuk publik.',
                404
            );
        }

        $cityCode = $request->query('city_code');
        $serviceable = false;
        $locationRequired = false;
        $reasonCode = 'ELIGIBLE';

        if (empty($cityCode)) {
            $locationRequired = true;
            $serviceable = false;
            $reasonCode = 'LOCATION_REQUIRED';
        } else {
            $normalizedCity = CityRegistryClient::normalize($cityCode);
            $coversCity = $offering->coverageCities->contains('city_code', $normalizedCity);
            if ($coversCity) {
                $serviceable = true;
                $reasonCode = 'ELIGIBLE';
            } else {
                $serviceable = false;
                $reasonCode = 'OUTSIDE_SERVICE_COVERAGE';
            }
        }

        $gallery = $offering->media->map(function (ServiceOfferingMedia $m) {
            return [
                'id' => $m->id,
                'url' => "/api/v1/service-media/{$m->id}",
                'is_primary' => (bool) $m->is_primary,
                'sort_order' => $m->sort_order,
            ];
        });

        $coverageList = $offering->coverageCities->map(function ($c) {
            return [
                'city_code' => $c->city_code,
                'label' => $c->city_label_snapshot ?: CityRegistryClient::getLabel($c->city_code) ?: $c->city_code,
            ];
        });

        $profile = $this->identityClient->getOrganizationPublicProfile($offering->provider_organization_id);

        // Optional related services
        $related = [];
        if (str_contains((string) $request->query('include'), 'related')) {
            $relatedQuery = ServiceOffering::where('status', 'ACTIVE')
                ->where('id', '!=', $offering->id)
                ->where('service_definition_id', $offering->service_definition_id);

            if (! empty($cityCode)) {
                $norm = CityRegistryClient::normalize($cityCode);
                $relatedQuery->whereHas('coverageCities', fn ($q) => $q->where('city_code', $norm));
            }

            $related = $relatedQuery->limit(4)->get()->map(function (ServiceOffering $rel) {
                return [
                    'id' => $rel->id,
                    'display_name' => $rel->display_name,
                    'price_model' => $rel->price_model,
                    'min_price_idr' => $rel->min_price_idr,
                    'max_price_idr' => $rel->max_price_idr,
                ];
            });
        }

        // Optional same provider services
        $otherProvider = [];
        if (str_contains((string) $request->query('include'), 'same_provider')) {
            $otherProvider = ServiceOffering::where('status', 'ACTIVE')
                ->where('id', '!=', $offering->id)
                ->where('provider_organization_id', $offering->provider_organization_id)
                ->limit(4)
                ->get()
                ->map(fn (ServiceOffering $o) => [
                    'id' => $o->id,
                    'display_name' => $o->display_name,
                    'price_model' => $o->price_model,
                ]);
        }

        return ApiResponse::success([
            'id' => $offering->id,
            'service_definition' => [
                'id' => $offering->definition->id,
                'name' => $offering->definition->name,
            ],
            'display_name' => $offering->display_name,
            'gallery' => $gallery,
            'description' => $offering->description,
            'included_items' => $offering->included_items ?: [],
            'excluded_items' => $offering->excluded_items ?: [],
            'customer_requirements' => $offering->customer_requirements ?: [],
            'pricing' => [
                'model' => $offering->price_model,
                'min_price_idr' => $offering->min_price_idr,
                'max_price_idr' => $offering->max_price_idr,
                'currency' => $offering->currency,
            ],
            'survey' => [
                'availability' => $offering->survey_availability,
                'requirement' => $offering->survey_requirement,
                'fee_model' => $offering->survey_fee_model,
                'fee_idr' => $offering->survey_fee_idr,
            ],
            'duration' => [
                'min' => $offering->duration_min,
                'max' => $offering->duration_max,
                'unit' => $offering->duration_unit,
            ],
            'coverage_cities' => $coverageList,
            'provider' => [
                'organization_id' => $offering->provider_organization_id,
                'display_name' => $profile['store_name'] ?? $profile['display_name'] ?? $profile['legal_name'] ?? 'Penyedia Jasa',
                'store_name' => $profile['store_name'] ?? $profile['display_name'] ?? $profile['legal_name'] ?? 'Penyedia Jasa',
                'office_city' => $profile['city'] ?? $profile['office_city'] ?? null,
            ],
            'location' => [
                'selected_city_code' => $cityCode ? CityRegistryClient::normalize($cityCode) : null,
                'serviceable' => $serviceable,
                'location_required' => $locationRequired,
            ],
            'next_action' => [
                'kind' => 'ORDER_JASA',
                'enabled' => $serviceable,
                'reason_code' => $reasonCode,
            ],
            'related_services' => $related,
            'other_provider_services' => $otherProvider,
        ], 'SERVICE_DETAIL_OK');
    }

    /**
     * P03: Public Provider Storefront
     */
    public function storefront(Request $request, string $provider_org_id): JsonResponse
    {
        $cityCode = $request->query('city_code');
        $profile = $this->identityClient->getOrganizationPublicProfile($provider_org_id);

        $query = ServiceOffering::where('status', 'ACTIVE')
            ->where('provider_organization_id', $provider_org_id);

        if (! empty($cityCode)) {
            $norm = CityRegistryClient::normalize($cityCode);
            $query->whereHas('coverageCities', fn ($q) => $q->where('city_code', $norm));
        }

        $items = $query->get()->map(function (ServiceOffering $o) {
            $primaryMedia = $o->primaryMedia;
            return [
                'id' => $o->id,
                'display_name' => $o->display_name,
                'primary_media' => $primaryMedia ? [
                    'id' => $primaryMedia->id,
                    'url' => "/api/v1/service-media/{$primaryMedia->id}",
                ] : null,
                'pricing' => [
                    'model' => $o->price_model,
                    'min_price_idr' => $o->min_price_idr,
                    'max_price_idr' => $o->max_price_idr,
                    'currency' => $o->currency,
                ],
                'survey_summary' => [
                    'available' => $o->survey_availability === 'AVAILABLE',
                    'fee_model' => $o->survey_fee_model,
                    'fee_idr' => $o->survey_fee_idr,
                ],
                'duration' => [
                    'min' => $o->duration_min,
                    'max' => $o->duration_max,
                    'unit' => $o->duration_unit ?? 'HOUR',
                ],
                'category' => [
                    'id' => $o->definition?->category_id,
                    'name' => 'Kategori Jasa',
                ],
                'subcategory' => [
                    'id' => $o->definition?->subcategory_id,
                    'name' => $o->definition?->name,
                ],
                'description' => $o->description,
                'status' => $o->status,
            ];
        });

        $providerName = $profile['store_name'] ?? $profile['display_name'] ?? $profile['legal_name'] ?? 'Penyedia Jasa';

        return ApiResponse::success([
            'provider_public_profile' => [
                'organization_id' => $provider_org_id,
                'display_name' => $providerName,
                'store_name' => $providerName,
                'logo_url' => $profile['logo_url'] ?? null,
                'office_city' => $profile['city'] ?? $profile['office_city'] ?? null,
                'city' => $profile['city'] ?? $profile['office_city'] ?? null,
                'province' => $profile['province'] ?? null,
                'district' => $profile['district'] ?? null,
                'postal_code' => $profile['postal_code'] ?? null,
                'street_address' => $profile['street_address'] ?? null,
                'address' => $profile['address'] ?? null,
                'operational_hours' => $profile['operational_hours'] ?? null,
                'service_area' => $profile['service_area'] ?? null,
                'is_verified' => true,
            ],
            'selected_city_code' => $cityCode ? CityRegistryClient::normalize($cityCode) : null,
            'items' => $items,
        ], 'SERVICE_STOREFRONT_OK');
    }

    /**
     * P04: List Canonical Service Definitions
     */
    public function definitions(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor|null $actor */
        $actor = $request->attributes->get('actor');

        $query = ServiceDefinition::query();

        // If not Admin or CEO, show only ACTIVE
        if (! $actor || (! $actor->isAdmin() && ! $actor->isCeo())) {
            $query->where('status', 'ACTIVE');
        } elseif ($status = $request->query('status')) {
            $query->where('status', strtoupper($status));
        }

        if ($catId = $request->query('category_id')) {
            $query->where('category_id', $catId);
        }
        if ($subcatId = $request->query('subcategory_id')) {
            $query->where('subcategory_id', $subcatId);
        }
        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        $items = $query->orderBy('name')->get();

        return ApiResponse::success($items, 'SERVICE_DEFINITIONS_OK');
    }

    /**
     * P05: List Capabilities
     */
    public function capabilities(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor|null $actor */
        $actor = $request->attributes->get('actor');

        $query = Capability::query();

        // If not Admin or CEO, show only ACTIVE
        if (! $actor || (! $actor->isAdmin() && ! $actor->isCeo())) {
            $query->where('status', 'ACTIVE');
        } elseif ($status = $request->query('status')) {
            $query->where('status', strtoupper($status));
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        $items = $query->orderBy('name')->get();

        return ApiResponse::success($items, 'SERVICE_CAPABILITIES_OK');
    }

    /**
     * P06: Serve media image
     */
    public function media(string $media_id)
    {
        $media = ServiceOfferingMedia::with('offering')->find($media_id);

        if (! $media) {
            return ApiResponse::error('SERVICE_MEDIA_NOT_FOUND', 'File gambar tidak ditemukan.', 404);
        }

        // Offering must be ACTIVE, or actor must be owner/admin
        $isPublic = $media->offering && $media->offering->status === 'ACTIVE';

        /** @var AuthenticatedActor|null $actor */
        $actor = request()->attributes->get('actor');
        $isOwner = $actor && $actor->organizationId === $media->offering?->provider_organization_id;
        $isAdmin = $actor && ($actor->isAdmin() || $actor->isCeo());

        if (! $isPublic && ! $isOwner && ! $isAdmin) {
            return ApiResponse::error('SERVICE_MEDIA_FORBIDDEN', 'Akses ke media ini dibatasi.', 403);
        }

        $path = Storage::disk($media->storage_disk)->path('private/' . $media->storage_key);
        if (! file_exists($path)) {
            return ApiResponse::error('SERVICE_MEDIA_NOT_FOUND', 'File pada disk tidak ditemukan.', 404);
        }

        return response()->file($path, [
            'Content-Type' => $media->mime_type,
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
