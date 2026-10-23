<?php

namespace App\Http\Controllers;

use App\Models\ServiceAuditLog;
use App\Models\ServiceOffering;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceGovernanceController extends Controller
{
    /**
     * G01: Admin/CEO read-only catalog oversight across all providers
     */
    public function index(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', 20), 1), 100);

        $query = ServiceOffering::with(['definition', 'primaryMedia', 'coverageCities']);

        if ($provId = $request->query('provider_id')) {
            $query->where('provider_organization_id', $provId);
        }
        if ($status = $request->query('status')) {
            $query->where('status', strtoupper($status));
        }
        if ($catId = $request->query('category_id')) {
            $query->whereHas('definition', fn ($q) => $q->where('category_id', $catId));
        }
        if ($subcatId = $request->query('subcategory_id')) {
            $query->whereHas('definition', fn ($q) => $q->where('subcategory_id', $subcatId));
        }
        if ($cityCode = $request->query('city_code')) {
            $query->whereHas('coverageCities', fn ($q) => $q->where('city_code', strtoupper(trim($cityCode))));
        }
        if ($search = $request->query('search')) {
            $query->where('display_name', 'like', "%{$search}%");
        }

        $items = $query->orderBy('created_at', 'desc')->limit($limit)->get();

        $data = $items->map(function (ServiceOffering $o) {
            return [
                'id' => $o->id,
                'provider_organization_id' => $o->provider_organization_id,
                'display_name' => $o->display_name,
                'canonical_name' => $o->definition?->name,
                'category_id' => $o->definition?->category_id,
                'subcategory_id' => $o->definition?->subcategory_id,
                'pricing' => [
                    'model' => $o->price_model,
                    'min_price_idr' => $o->min_price_idr,
                    'max_price_idr' => $o->max_price_idr,
                ],
                'survey' => [
                    'availability' => $o->survey_availability,
                    'requirement' => $o->survey_requirement,
                    'fee_model' => $o->survey_fee_model,
                    'fee_idr' => $o->survey_fee_idr,
                ],
                'status' => $o->status,
                'coverage_city_codes' => $o->coverageCities->pluck('city_code')->values()->all(),
                'primary_media_url' => $o->primaryMedia ? "/api/v1/service-media/{$o->primaryMedia->id}" : null,
                'updated_at' => $o->updated_at?->toISOString(),
            ];
        });

        return ApiResponse::success([
            'items' => $data,
            'pagination' => [
                'limit' => $limit,
                'has_more' => false,
            ],
        ], 'GOVERNANCE_SERVICE_OFFERINGS_OK');
    }

    /**
     * G02: Admin/CEO read-only detail of an offering
     */
    public function show(string $id): JsonResponse
    {
        $offering = ServiceOffering::with(['definition', 'media', 'coverageCities', 'capabilities'])->find($id);
        if (! $offering) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Penawaran jasa tidak ditemukan.', 404);
        }

        return ApiResponse::success($offering, 'GOVERNANCE_SERVICE_OFFERING_DETAIL_OK');
    }

    /**
     * G03: Audit log queries
     */
    public function audit(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');
        $limit = min(max((int) $request->query('limit', 20), 1), 100);

        $query = ServiceAuditLog::query();

        // If Provider, scope to own organization
        if ($actor->isProvider()) {
            $query->where('actor_org_id', $actor->organizationId);
        }

        if ($entityType = $request->query('entity_type')) {
            $query->where('entity_type', $entityType);
        }
        if ($entityId = $request->query('entity_id')) {
            $query->where('entity_id', $entityId);
        }

        $items = $query->orderBy('occurred_at', 'desc')->limit($limit)->get();

        return ApiResponse::success([
            'items' => $items,
            'pagination' => [
                'limit' => $limit,
                'has_more' => false,
            ],
        ], 'SERVICE_AUDIT_LOGS_OK');
    }
}
