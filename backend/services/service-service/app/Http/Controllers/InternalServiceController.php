<?php

namespace App\Http\Controllers;

use App\Infrastructure\CityRegistry\CityRegistryClient;
use App\Models\Capability;
use App\Models\ServiceCategoryReferenceHistory;
use App\Models\ServiceDefinition;
use App\Models\ServiceOffering;
use App\Models\WorkerCapability;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternalServiceController extends Controller
{
    /**
     * I01: Check offering eligibility and return snapshot for Modul 05B Order Jasa
     */
    public function checkOfferingEligibility(Request $request, string $id): JsonResponse
    {
        $cityCode = $request->input('city_code');
        $expectedVersion = $request->input('expected_version');

        $offering = ServiceOffering::with(['definition', 'coverageCities', 'capabilities'])->find($id);

        if (! $offering || $offering->status !== 'ACTIVE' || ! $offering->definition || $offering->definition->status !== 'ACTIVE') {
            return ApiResponse::success([
                'eligible' => false,
                'reason_code' => 'OFFERING_INACTIVE_OR_NOT_FOUND',
                'offering_id' => $id,
                'checked_at' => now()->toISOString(),
            ], 'SERVICE_ELIGIBILITY_CHECK_OK');
        }

        if ($expectedVersion !== null && (int) $expectedVersion !== (int) $offering->lock_version) {
            return ApiResponse::error(
                'SERVICE_OFFERING_VERSION_CONFLICT',
                'Versi katalog penawaran jasa telah berubah sejak peninjauan sebelumnya.',
                409,
                [],
                [
                    'current_version' => $offering->lock_version,
                    'expected_version' => (int) $expectedVersion,
                ]
            );
        }

        $normCity = CityRegistryClient::normalize((string) $cityCode);
        $coversCity = $offering->coverageCities->contains('city_code', $normCity);

        if (! $coversCity) {
            return ApiResponse::success([
                'eligible' => false,
                'reason_code' => 'OUTSIDE_SERVICE_COVERAGE',
                'offering_id' => $offering->id,
                'eligible_city_code' => $normCity,
                'checked_at' => now()->toISOString(),
            ], 'SERVICE_ELIGIBILITY_CHECK_OK');
        }

        return ApiResponse::success([
            'eligible' => true,
            'reason_code' => 'ELIGIBLE',
            'offering_id' => $offering->id,
            'provider_org_id' => $offering->provider_organization_id,
            'definition_id' => $offering->service_definition_id,
            'offering_version' => $offering->lock_version,
            'eligible_city_code' => $normCity,
            'pricing_snapshot' => [
                'model' => $offering->price_model,
                'min_price_idr' => $offering->min_price_idr,
                'max_price_idr' => $offering->max_price_idr,
                'currency' => $offering->currency,
            ],
            'survey_snapshot' => [
                'availability' => $offering->survey_availability,
                'requirement' => $offering->survey_requirement,
                'fee_model' => $offering->survey_fee_model,
                'fee_idr' => $offering->survey_fee_idr,
            ],
            'duration_snapshot' => [
                'min' => $offering->duration_min,
                'max' => $offering->duration_max,
                'unit' => $offering->duration_unit,
            ],
            'requirements_snapshot' => $offering->customer_requirements ?: [],
            'capability_ids' => $offering->capabilities->pluck('id')->values()->all(),
            'checked_at' => now()->toISOString(),
        ], 'SERVICE_ELIGIBILITY_CHECK_OK');
    }

    /**
     * I02: Catalog snapshot
     */
    public function getCatalogSnapshot(Request $request, string $id): JsonResponse
    {
        return $this->checkOfferingEligibility($request, $id);
    }

    /**
     * I03: Category reference check for Category Guarded Hard Delete
     */
    public function checkCategoryReferences(Request $request): JsonResponse
    {
        $nodeType = strtoupper((string) $request->input('node_type'));
        $nodeId = $request->input('node_id');

        if (empty($nodeId)) {
            return ApiResponse::error('SERVICE_VALIDATION_FAILED', 'node_id wajib disertakan.', 422);
        }

        $count = 0;

        if ($nodeType === 'CATEGORY') {
            $defCount = ServiceDefinition::withTrashed()->where('category_id', $nodeId)->count();
            $histCount = ServiceCategoryReferenceHistory::where('category_id', $nodeId)->count();
            $count = $defCount + $histCount;
        } elseif ($nodeType === 'SUBCATEGORY') {
            $defCount = ServiceDefinition::withTrashed()->where('subcategory_id', $nodeId)->count();
            $histCount = ServiceCategoryReferenceHistory::where('subcategory_id', $nodeId)->count();
            $count = $defCount + $histCount;
        }

        return ApiResponse::success([
            'referenced' => $count > 0,
            'reference_count' => $count,
            'known_consumer' => 'service-service',
            'checked_at' => now()->toISOString(),
            'authoritative' => true,
        ], 'SERVICE_CATEGORY_REFERENCE_CHECK_OK');
    }

    /**
     * I04: Service definition status check
     */
    public function getDefinitionStatus(string $id): JsonResponse
    {
        $definition = ServiceDefinition::find($id);
        if (! $definition) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Definition not found.', 404);
        }

        return ApiResponse::success([
            'definition_id' => $definition->id,
            'status' => $definition->status,
            'category_id' => $definition->category_id,
            'subcategory_id' => $definition->subcategory_id,
            'version' => $definition->lock_version,
        ]);
    }

    /**
     * I05: Capability status check
     */
    public function getCapabilityStatus(string $id): JsonResponse
    {
        $cap = Capability::find($id);
        if (! $cap) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Capability not found.', 404);
        }

        return ApiResponse::success([
            'capability_id' => $cap->id,
            'status' => $cap->status,
            'code' => $cap->code,
            'version' => $cap->lock_version,
        ]);
    }

    /**
     * I06: Worker capabilities eligibility check
     */
    public function checkWorkerCapabilities(Request $request): JsonResponse
    {
        $providerOrgId = $request->input('provider_org_id');
        $workerUserId = $request->input('worker_user_id');
        $requiredCapIds = $request->input('required_capability_ids', []);

        $workerCapIds = WorkerCapability::where('provider_organization_id', $providerOrgId)
            ->where('worker_user_id', $workerUserId)
            ->where('status', 'ACTIVE')
            ->pluck('capability_id')
            ->all();

        $missing = array_values(array_diff($requiredCapIds, $workerCapIds));

        return ApiResponse::success([
            'capabilities_match' => empty($missing),
            'missing_capability_ids' => $missing,
            'checked_at' => now()->toISOString(),
        ]);
    }

    /**
     * I07: Health
     */
    public function health(): JsonResponse
    {
        return ApiResponse::success([
            'service' => 'service-service',
            'schema_ready' => true,
            'dependency_status' => 'CONNECTED',
            'timestamp' => now()->toISOString(),
        ]);
    }
}
