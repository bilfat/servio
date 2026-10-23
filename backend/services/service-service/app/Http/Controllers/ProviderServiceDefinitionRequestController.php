<?php

namespace App\Http\Controllers;

use App\Domain\Service\Actions\RecordServiceAudit;
use App\Models\ServiceDefinitionRequest;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProviderServiceDefinitionRequestController extends Controller
{
    /**
     * R01: Submit canonical definition request
     */
    public function store(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $request->validate([
            'proposed_name' => 'required|string|max:191',
            'category_id' => 'required|uuid',
            'subcategory_id' => 'required|uuid',
            'reason' => 'nullable|string',
        ]);

        $defReq = ServiceDefinitionRequest::create([
            'id' => (string) Str::uuid(),
            'requester_user_id' => $actor->id,
            'provider_organization_id' => $actor->organizationId,
            'proposed_name' => $request->input('proposed_name'),
            'normalized_name' => mb_strtolower(trim($request->input('proposed_name'))),
            'category_id' => $request->input('category_id'),
            'subcategory_id' => $request->input('subcategory_id'),
            'reason' => $request->input('reason'),
            'status' => 'NEW',
            'lock_version' => 1,
        ]);

        RecordServiceAudit::execute(
            entityType: 'SERVICE_DEFINITION_REQUEST',
            entityId: $defReq->id,
            action: 'SUBMIT_REQUEST',
            before: null,
            after: $defReq->toArray()
        );

        return ApiResponse::success([
            'id' => $defReq->id,
            'proposed_name' => $defReq->proposed_name,
            'category_id' => $defReq->category_id,
            'subcategory_id' => $defReq->subcategory_id,
            'reason' => $defReq->reason,
            'status' => $defReq->status,
            'created_at' => $defReq->created_at?->toISOString(),
        ], 'SERVICE_DEFINITION_REQUEST_CREATED', 201);
    }

    /**
     * R02: List own definition requests
     */
    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $items = ServiceDefinitionRequest::where('provider_organization_id', $actor->organizationId)
            ->orderBy('created_at', 'desc')
            ->get();

        return ApiResponse::success($items, 'SERVICE_DEFINITION_REQUESTS_OK');
    }

    /**
     * R03: Detail of own definition request
     */
    public function show(string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = request()->attributes->get('actor');

        $item = ServiceDefinitionRequest::where('provider_organization_id', $actor->organizationId)
            ->find($id);

        if (! $item) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Pengajuan canonical jasa tidak ditemukan.', 404);
        }

        return ApiResponse::success($item, 'SERVICE_DEFINITION_REQUEST_DETAIL_OK');
    }
}
