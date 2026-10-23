<?php

namespace App\Http\Controllers;

use App\Domain\Service\Actions\RecordServiceAudit;
use App\Domain\Service\DTOs\ServicePriceSurveyConfiguration;
use App\Domain\Service\Validators\PriceSurveyValidator;
use App\Http\Requests\ChangeServiceOfferingStatusRequest;
use App\Http\Requests\CreateServiceOfferingRequest;
use App\Http\Requests\UpdateCapabilitiesRequest;
use App\Http\Requests\UpdateCoverageCitiesRequest;
use App\Http\Requests\UpdateServiceOfferingRequest;
use App\Infrastructure\Category\CategoryServiceClient;
use App\Infrastructure\CityRegistry\CityRegistryClient;
use App\Infrastructure\Identity\IdentityServiceClient;
use App\Infrastructure\Outbox\OutboxPublisher;
use App\Models\Capability;
use App\Models\ServiceCoverageCity;
use App\Models\ServiceDefinition;
use App\Models\ServiceOffering;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProviderServiceOfferingController extends Controller
{
    public function __construct(
        protected IdentityServiceClient $identityClient,
        protected CategoryServiceClient $categoryClient
    ) {}

    /**
     * M01: List own offerings
     */
    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');
        $limit = min(max((int) $request->query('limit', 20), 1), 100);

        $query = ServiceOffering::with(['definition', 'media', 'primaryMedia', 'coverageCities'])
            ->where('provider_organization_id', $actor->organizationId);

        if ($status = $request->query('status')) {
            $query->where('status', strtoupper($status));
        }

        if ($search = $request->query('search')) {
            $query->where('display_name', 'like', "%{$search}%");
        }

        if ($catId = $request->query('category_id')) {
            $query->whereHas('definition', fn ($q) => $q->where('category_id', $catId));
        }

        $items = $query->orderBy('created_at', 'desc')->limit($limit)->get();

        $data = $items->map(fn (ServiceOffering $o) => $this->formatOfferingDetail($o));

        return ApiResponse::success($data, 'SERVICE_PROVIDER_OFFERINGS_OK');
    }

    /**
     * M02: Detail of own offering
     */
    public function show(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $offering = ServiceOffering::with(['definition', 'media', 'coverageCities', 'capabilities'])
            ->where('provider_organization_id', $actor->organizationId)
            ->find($id);

        if (! $offering) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Penawaran jasa tidak ditemukan.', 404);
        }

        return ApiResponse::success($this->formatOfferingDetail($offering), 'SERVICE_PROVIDER_OFFERING_DETAIL_OK');
    }

    /**
     * M03: Create offering draft
     */
    public function store(CreateServiceOfferingRequest $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $defId = $request->input('service_definition_id');
        $definition = ServiceDefinition::find($defId);

        if (! $definition || ! $definition->isActive()) {
            return ApiResponse::error(
                'SERVICE_CANONICAL_INACTIVE',
                'Jenis canonical jasa yang dipilih tidak ditemukan atau sedang tidak aktif.',
                422,
                ['service_definition_id' => ['Canonical service definition harus aktif.']]
            );
        }

        // Prevent duplicate live offering for same provider + canonical definition
        $exists = ServiceOffering::where('provider_organization_id', $actor->organizationId)
            ->where('service_definition_id', $defId)
            ->whereIn('status', ['DRAFT', 'ACTIVE', 'INACTIVE'])
            ->exists();

        if ($exists) {
            return ApiResponse::error(
                'SERVICE_DUPLICATE_OFFERING',
                'Organisasi Anda telah memiliki penawaran jasa untuk jenis canonical ini.',
                409
            );
        }

        // Validate Price and Survey
        $config = ServicePriceSurveyConfiguration::fromArray($request->all());
        $priceErrors = PriceSurveyValidator::validateForDraft($config);
        if (! empty($priceErrors)) {
            return ApiResponse::error(
                'SERVICE_PRICE_SURVEY_CONFLICT',
                'Kombinasi model harga dan survei tidak valid.',
                422,
                $priceErrors
            );
        }

        $duration = $request->input('duration', []);
        $durMin = isset($duration['min']) ? (int) $duration['min'] : null;
        $durMax = isset($duration['max']) ? (int) $duration['max'] : null;
        if ($durMin !== null && $durMax !== null && $durMin > $durMax) {
            return ApiResponse::error(
                'SERVICE_VALIDATION_FAILED',
                'Durasi minimum tidak boleh lebih besar dari durasi maksimum.',
                422,
                ['duration' => ['Durasi min > max']]
            );
        }

        return DB::transaction(function () use ($request, $actor, $definition, $config, $duration, $durMin, $durMax) {
            $offering = ServiceOffering::create([
                'id' => (string) Str::uuid(),
                'provider_organization_id' => $actor->organizationId,
                'service_definition_id' => $definition->id,
                'created_by_user_id' => $actor->id,
                'display_name' => $request->input('display_name'),
                'normalized_display_name' => mb_strtolower(trim($request->input('display_name'))),
                'description' => $request->input('description'),
                'included_items' => $request->input('included_items', []),
                'excluded_items' => $request->input('excluded_items', []),
                'customer_requirements' => $request->input('customer_requirements', []),
                'price_model' => $config->priceModel,
                'min_price_idr' => $config->minPriceIdr,
                'max_price_idr' => $config->maxPriceIdr,
                'currency' => 'IDR',
                'survey_availability' => $config->surveyAvailability,
                'survey_requirement' => $config->surveyRequirement,
                'survey_fee_model' => $config->surveyFeeModel,
                'survey_fee_idr' => $config->surveyFeeIdr,
                'duration_min' => $durMin,
                'duration_max' => $durMax,
                'duration_unit' => $duration['unit'] ?? null,
                'status' => 'DRAFT',
                'lock_version' => 1,
            ]);

            // Save initial coverage cities if provided
            if ($cityCodes = $request->input('coverage_city_codes')) {
                foreach (array_unique($cityCodes) as $cityCode) {
                    $normCity = CityRegistryClient::normalize($cityCode);
                    if (CityRegistryClient::isValid($normCity)) {
                        ServiceCoverageCity::create([
                            'id' => (string) Str::uuid(),
                            'offering_id' => $offering->id,
                            'city_code' => $normCity,
                            'city_label_snapshot' => CityRegistryClient::getLabel($normCity),
                        ]);
                    }
                }
            }

            // Save capabilities if provided
            if ($capIds = $request->input('capability_ids')) {
                $validCapIds = Capability::whereIn('id', $capIds)->where('status', 'ACTIVE')->pluck('id');
                $offering->capabilities()->sync($validCapIds);
            }

            RecordServiceAudit::execute(
                entityType: 'SERVICE_OFFERING',
                entityId: $offering->id,
                action: 'CREATE_DRAFT',
                before: null,
                after: $offering->toArray(),
                offeringId: $offering->id
            );

            OutboxPublisher::record(
                aggregateType: 'SERVICE_OFFERING',
                aggregateId: $offering->id,
                eventType: 'ServiceOfferingCreated.v1',
                payload: ['offering_id' => $offering->id, 'status' => 'DRAFT'],
                offeringId: $offering->id
            );

            $offering->load(['definition', 'media', 'coverageCities', 'capabilities']);

            return ApiResponse::success(
                $this->formatOfferingDetail($offering),
                'SERVICE_OFFERING_CREATED',
                201
            );
        });
    }

    /**
     * M04: Update offering basic info & pricing
     */
    public function update(UpdateServiceOfferingRequest $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $offering = ServiceOffering::where('provider_organization_id', $actor->organizationId)->find($id);
        if (! $offering) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Penawaran jasa tidak ditemukan.', 404);
        }

        // Concurrency If-Match check
        $ifMatch = trim((string) $request->header('If-Match'), '"');
        if ((int) $ifMatch !== (int) $offering->lock_version) {
            return ApiResponse::error(
                'SERVICE_VERSION_CONFLICT',
                'Data telah diubah oleh operasi lain. Silakan muat ulang.',
                409
            );
        }

        // Price and Survey validation
        $rawConfig = array_merge($offering->toArray(), $request->all());
        $config = ServicePriceSurveyConfiguration::fromArray($rawConfig);

        $validatorErrors = $offering->isActive()
            ? PriceSurveyValidator::validateForActivation($config)
            : PriceSurveyValidator::validateForDraft($config);

        if (! empty($validatorErrors)) {
            return ApiResponse::error(
                'SERVICE_PRICE_SURVEY_CONFLICT',
                'Kombinasi model harga dan survei tidak valid.',
                422,
                $validatorErrors
            );
        }

        $before = $offering->toArray();

        return DB::transaction(function () use ($request, $offering, $config, $before) {
            if ($request->has('display_name')) {
                $offering->display_name = $request->input('display_name');
                $offering->normalized_display_name = mb_strtolower(trim($request->input('display_name')));
            }
            if ($request->has('description')) {
                $offering->description = $request->input('description');
            }
            if ($request->has('included_items')) {
                $offering->included_items = $request->input('included_items');
            }
            if ($request->has('excluded_items')) {
                $offering->excluded_items = $request->input('excluded_items');
            }
            if ($request->has('customer_requirements')) {
                $offering->customer_requirements = $request->input('customer_requirements');
            }

            if ($request->has('pricing') || $request->has('price_model')) {
                $offering->price_model = $config->priceModel;
                $offering->min_price_idr = $config->minPriceIdr;
                $offering->max_price_idr = $config->maxPriceIdr;
            }

            if ($request->has('survey') || $request->has('survey_availability')) {
                $offering->survey_availability = $config->surveyAvailability;
                $offering->survey_requirement = $config->surveyRequirement;
                $offering->survey_fee_model = $config->surveyFeeModel;
                $offering->survey_fee_idr = $config->surveyFeeIdr;
            }

            if ($request->has('duration')) {
                $dur = $request->input('duration', []);
                $offering->duration_min = isset($dur['min']) ? (int) $dur['min'] : null;
                $offering->duration_max = isset($dur['max']) ? (int) $dur['max'] : null;
                $offering->duration_unit = $dur['unit'] ?? null;
            }

            $offering->lock_version += 1;
            $offering->save();

            RecordServiceAudit::execute(
                entityType: 'SERVICE_OFFERING',
                entityId: $offering->id,
                action: 'UPDATE_DETAILS',
                before: $before,
                after: $offering->toArray(),
                offeringId: $offering->id
            );

            OutboxPublisher::record(
                aggregateType: 'SERVICE_OFFERING',
                aggregateId: $offering->id,
                eventType: 'ServiceOfferingUpdated.v1',
                payload: ['offering_id' => $offering->id, 'version' => $offering->lock_version],
                offeringId: $offering->id,
                aggregateVersion: $offering->lock_version
            );

            $offering->load(['definition', 'media', 'coverageCities', 'capabilities']);

            return ApiResponse::success(
                $this->formatOfferingDetail($offering),
                'SERVICE_OFFERING_UPDATED',
                200
            );
        });
    }

    /**
     * M05: Direct publication to ACTIVE or deactivation to INACTIVE
     */
    public function changeStatus(ChangeServiceOfferingStatusRequest $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $offering = ServiceOffering::with(['definition', 'media', 'coverageCities'])
            ->where('provider_organization_id', $actor->organizationId)
            ->find($id);

        if (! $offering) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Penawaran jasa tidak ditemukan.', 404);
        }

        // Concurrency If-Match check
        $ifMatch = trim((string) $request->header('If-Match'), '"');
        if ((int) $ifMatch !== (int) $offering->lock_version) {
            return ApiResponse::error(
                'SERVICE_VERSION_CONFLICT',
                'Data telah diubah oleh operasi lain. Silakan muat ulang.',
                409
            );
        }

        $targetStatus = strtoupper($request->input('status'));

        // If target is ACTIVE -> DIRECT PUBLICATION VALIDATION (No Admin Approval Queue!)
        if ($targetStatus === 'ACTIVE') {
            // 1. Verify canonical definition is ACTIVE
            if (! $offering->definition || $offering->definition->status !== 'ACTIVE') {
                return ApiResponse::error(
                    'SERVICE_CANONICAL_INACTIVE',
                    'Jenis canonical jasa ini sedang tidak aktif sehingga penawaran tidak dapat diaktifkan.',
                    409
                );
            }

            // 2. Verify Category and Subcategory with Category Service (Branch must be JASA)
            $catCheck = $this->categoryClient->checkEligibility('SUBCATEGORY', $offering->definition->subcategory_id);
            if ($catCheck === null) {
                return ApiResponse::error(
                    'SERVICE_CATEGORY_UNAVAILABLE',
                    'Gagal memverifikasi kategori jasa pada Category Service. Silakan coba beberapa saat lagi.',
                    503
                );
            }

            if (($catCheck['master_code'] ?? '') !== 'JASA') {
                return ApiResponse::error(
                    'SERVICE_CATEGORY_INVALID_BRANCH',
                    'Kategori jasa ini tidak berada pada branch root master JASA.',
                    422
                );
            }

            // 3. Verify Provider Organization is ACTIVE with Identity Service
            $orgStatus = $this->identityClient->getOrganizationStatus($actor->organizationId);
            if ($orgStatus === null) {
                return ApiResponse::error(
                    'SERVICE_IDENTITY_UNAVAILABLE',
                    'Gagal memverifikasi status organisasi penyedia pada Identity Service.',
                    503
                );
            }

            if (($orgStatus['status'] ?? '') !== 'ACTIVE') {
                return ApiResponse::error(
                    'SERVICE_PROVIDER_INACTIVE',
                    'Organisasi penyedia jasa sedang ditangguhkan atau tidak aktif.',
                    403
                );
            }

            // 4. Must have at least 1 coverage city
            if ($offering->coverageCities->isEmpty()) {
                return ApiResponse::error(
                    'SERVICE_COVERAGE_REQUIRED',
                    'Penawaran jasa wajib memiliki minimal satu kota layanan aktif sebelum dapat dipublikasikan.',
                    409
                );
            }

            // 5. Must have at least 1 primary media with READY status
            $hasPrimaryReadyMedia = $offering->media()
                ->where('is_primary', true)
                ->where('storage_state', 'READY')
                ->exists();

            if (! $hasPrimaryReadyMedia) {
                return ApiResponse::error(
                    'SERVICE_MEDIA_PRIMARY_REQUIRED',
                    'Penawaran jasa wajib memiliki foto utama yang telah selesai diproses (READY) sebelum diaktifkan.',
                    409
                );
            }

            // 6. Strict Price & Survey Validator
            $config = ServicePriceSurveyConfiguration::fromArray($offering->toArray());
            $priceErrors = PriceSurveyValidator::validateForActivation($config);
            if (! empty($priceErrors)) {
                return ApiResponse::error(
                    'SERVICE_PRICE_SURVEY_CONFLICT',
                    'Konfigurasi harga dan survei belum lengkap atau tidak valid.',
                    422,
                    $priceErrors
                );
            }
        }

        $before = $offering->toArray();

        return DB::transaction(function () use ($offering, $targetStatus, $before) {
            $offering->status = $targetStatus;
            if ($targetStatus === 'ACTIVE') {
                $offering->activated_at = now();
            }
            $offering->lock_version += 1;
            $offering->save();

            RecordServiceAudit::execute(
                entityType: 'SERVICE_OFFERING',
                entityId: $offering->id,
                action: match($targetStatus) {
                    'ACTIVE' => 'ACTIVATE',
                    'ARCHIVED' => 'ARCHIVE',
                    default => 'DEACTIVATE',
                },
                before: $before,
                after: $offering->toArray(),
                offeringId: $offering->id
            );

            OutboxPublisher::record(
                aggregateType: 'SERVICE_OFFERING',
                aggregateId: $offering->id,
                eventType: $targetStatus === 'ACTIVE' ? 'ServiceOfferingPublished.v1' : 'ServiceOfferingDeactivated.v1',
                payload: [
                    'offering_id' => $offering->id,
                    'status' => $targetStatus,
                    'version' => $offering->lock_version,
                ],
                offeringId: $offering->id,
                aggregateVersion: $offering->lock_version
            );

            $offering->load(['definition', 'media', 'coverageCities', 'capabilities']);

            $responseCode = match($targetStatus) {
                'ACTIVE' => 'SERVICE_OFFERING_ACTIVATED',
                'ARCHIVED' => 'SERVICE_OFFERING_ARCHIVED',
                'DRAFT' => 'SERVICE_OFFERING_DRAFTED',
                default => 'SERVICE_OFFERING_DEACTIVATED',
            };

            return ApiResponse::success([
                'id' => $offering->id,
                'status' => $offering->status,
                'publication' => [
                    'requires_admin_approval' => false,
                    'visibility' => $targetStatus === 'ACTIVE' ? 'IMMEDIATE_ELIGIBILITY' : 'HIDDEN',
                    'published_at' => $offering->activated_at?->toISOString(),
                ],
                'public_eligible' => $targetStatus === 'ACTIVE',
                'coverage_city_codes' => $offering->coverageCities->pluck('city_code')->values()->all(),
                'lock_version' => $offering->lock_version,
            ], $responseCode, 200);
        });
    }

    /**
     * M06: Replace coverage cities atomically
     */
    public function updateCoverageCities(UpdateCoverageCitiesRequest $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $offering = ServiceOffering::with('coverageCities')
            ->where('provider_organization_id', $actor->organizationId)
            ->find($id);

        if (! $offering) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Penawaran jasa tidak ditemukan.', 404);
        }

        // Concurrency If-Match check
        $ifMatch = trim((string) $request->header('If-Match'), '"');
        if ((int) $ifMatch !== (int) $offering->lock_version) {
            return ApiResponse::error('SERVICE_VERSION_CONFLICT', 'Data telah diubah oleh operasi lain.', 409);
        }

        $rawCodes = $request->input('city_codes', []);
        $cleanCodes = array_values(array_unique(array_filter($rawCodes)));

        // If offering is ACTIVE, empty coverage is forbidden
        if ($offering->isActive() && empty($cleanCodes)) {
            return ApiResponse::error(
                'SERVICE_COVERAGE_REQUIRED',
                'Penawaran jasa aktif wajib memiliki minimal satu kota layanan.',
                409
            );
        }

        // Validate all city codes against Indonesian city registry
        $invalidCodes = [];
        foreach ($cleanCodes as $code) {
            if (! CityRegistryClient::isValid($code)) {
                $invalidCodes[] = $code;
            }
        }

        if (! empty($invalidCodes)) {
            return ApiResponse::error(
                'SERVICE_COVERAGE_CITY_INVALID',
                'Satu atau lebih kode kota administratif tidak valid.',
                422,
                ['city_codes' => $invalidCodes]
            );
        }

        return DB::transaction(function () use ($offering, $cleanCodes) {
            ServiceCoverageCity::where('offering_id', $offering->id)->delete();

            foreach ($cleanCodes as $code) {
                $norm = CityRegistryClient::normalize($code);
                ServiceCoverageCity::create([
                    'id' => (string) Str::uuid(),
                    'offering_id' => $offering->id,
                    'city_code' => $norm,
                    'city_label_snapshot' => CityRegistryClient::getLabel($norm),
                ]);
            }

            $offering->lock_version += 1;
            $offering->save();

            RecordServiceAudit::execute(
                entityType: 'SERVICE_OFFERING',
                entityId: $offering->id,
                action: 'REPLACE_COVERAGE_CITIES',
                before: null,
                after: ['coverage_city_codes' => $cleanCodes],
                offeringId: $offering->id
            );

            OutboxPublisher::record(
                aggregateType: 'SERVICE_OFFERING',
                aggregateId: $offering->id,
                eventType: 'ServiceOfferingCoverageChanged.v1',
                payload: ['offering_id' => $offering->id, 'city_codes' => $cleanCodes],
                offeringId: $offering->id,
                aggregateVersion: $offering->lock_version
            );

            return ApiResponse::success([
                'id' => $offering->id,
                'coverage_city_codes' => $cleanCodes,
                'lock_version' => $offering->lock_version,
            ], 'SERVICE_COVERAGE_UPDATED', 200);
        });
    }

    /**
     * M07: Replace capabilities atomically
     */
    public function updateCapabilities(UpdateCapabilitiesRequest $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $offering = ServiceOffering::where('provider_organization_id', $actor->organizationId)->find($id);
        if (! $offering) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Penawaran jasa tidak ditemukan.', 404);
        }

        // Concurrency If-Match check
        $ifMatch = trim((string) $request->header('If-Match'), '"');
        if ((int) $ifMatch !== (int) $offering->lock_version) {
            return ApiResponse::error('SERVICE_VERSION_CONFLICT', 'Data telah diubah oleh operasi lain.', 409);
        }

        $capIds = $request->input('capability_ids', []);
        $validCapIds = Capability::whereIn('id', $capIds)->where('status', 'ACTIVE')->pluck('id')->all();

        if (count($validCapIds) !== count($capIds)) {
            return ApiResponse::error(
                'SERVICE_CAPABILITY_INVALID',
                'Satu atau lebih ID kapabilitas tidak ditemukan atau sedang tidak aktif.',
                422
            );
        }

        return DB::transaction(function () use ($offering, $validCapIds) {
            $offering->capabilities()->sync($validCapIds);
            $offering->lock_version += 1;
            $offering->save();

            RecordServiceAudit::execute(
                entityType: 'SERVICE_OFFERING',
                entityId: $offering->id,
                action: 'REPLACE_CAPABILITIES',
                before: null,
                after: ['capability_ids' => $validCapIds],
                offeringId: $offering->id
            );

            return ApiResponse::success([
                'id' => $offering->id,
                'capability_ids' => $validCapIds,
                'lock_version' => $offering->lock_version,
            ], 'SERVICE_CAPABILITIES_UPDATED', 200);
        });
    }

    /**
     * M11: Archive offering (soft delete)
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $offering = ServiceOffering::where('provider_organization_id', $actor->organizationId)->find($id);
        if (! $offering) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Penawaran jasa tidak ditemukan.', 404);
        }

        // Concurrency If-Match check
        $ifMatch = trim((string) $request->header('If-Match'), '"');
        if ((int) $ifMatch !== (int) $offering->lock_version) {
            return ApiResponse::error('SERVICE_VERSION_CONFLICT', 'Data telah diubah oleh operasi lain.', 409);
        }

        $offering->delete();

        RecordServiceAudit::execute(
            entityType: 'SERVICE_OFFERING',
            entityId: $offering->id,
            action: 'ARCHIVE',
            before: ['status' => $offering->status],
            after: ['deleted_at' => now()],
            offeringId: $offering->id
        );

        return ApiResponse::success([
            'id' => $offering->id,
            'archived' => true,
        ], 'SERVICE_OFFERING_ARCHIVED', 200);
    }

    protected function formatOfferingDetail(ServiceOffering $o): array
    {
        return [
            'id' => $o->id,
            'provider_organization_id' => $o->provider_organization_id,
            'service_definition_id' => $o->service_definition_id,
            'service_definition' => $o->definition ? [
                'id' => $o->definition->id,
                'name' => $o->definition->name,
                'category_id' => $o->definition->category_id,
                'subcategory_id' => $o->definition->subcategory_id,
            ] : null,
            'display_name' => $o->display_name,
            'description' => $o->description,
            'included_items' => $o->included_items ?: [],
            'excluded_items' => $o->excluded_items ?: [],
            'customer_requirements' => $o->customer_requirements ?: [],
            'pricing' => [
                'model' => $o->price_model,
                'min_price_idr' => $o->min_price_idr,
                'max_price_idr' => $o->max_price_idr,
                'currency' => $o->currency,
            ],
            'survey' => [
                'availability' => $o->survey_availability,
                'requirement' => $o->survey_requirement,
                'fee_model' => $o->survey_fee_model,
                'fee_idr' => $o->survey_fee_idr,
            ],
            'duration' => [
                'min' => $o->duration_min,
                'max' => $o->duration_max,
                'unit' => $o->duration_unit,
            ],
            'coverage_city_codes' => $o->coverageCities->pluck('city_code')->values()->all(),
            'capability_ids' => $o->capabilities ? $o->capabilities->pluck('id')->values()->all() : [],
            'media' => $o->media->map(fn ($m) => [
                'id' => $m->id,
                'url' => "/api/v1/service-media/{$m->id}",
                'is_primary' => (bool) $m->is_primary,
                'sort_order' => $m->sort_order,
                'storage_state' => $m->storage_state,
            ])->values()->all(),
            'status' => $o->status,
            'lock_version' => $o->lock_version,
            'created_at' => $o->created_at?->toISOString(),
            'updated_at' => $o->updated_at?->toISOString(),
        ];
    }
}
