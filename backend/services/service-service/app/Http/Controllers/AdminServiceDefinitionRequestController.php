<?php

namespace App\Http\Controllers;

use App\Domain\Service\Actions\RecordServiceAudit;
use App\Models\ServiceDefinition;
use App\Models\ServiceDefinitionRequest;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminServiceDefinitionRequestController extends Controller
{
    /**
     * A08: List canonical definition requests from providers
     */
    public function index(Request $request): JsonResponse
    {
        $query = ServiceDefinitionRequest::with('fulfilledDefinition');

        if ($status = $request->query('status')) {
            $query->where('status', strtoupper($status));
        }
        if ($provId = $request->query('provider_id')) {
            $query->where('provider_organization_id', $provId);
        }

        $items = $query->orderBy('created_at', 'desc')->get();

        return ApiResponse::success($items, 'ADMIN_SERVICE_DEFINITION_REQUESTS_OK');
    }

    /**
     * A09: Review canonical definition request
     */
    public function review(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $defReq = ServiceDefinitionRequest::find($id);
        if (! $defReq) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Pengajuan canonical jasa tidak ditemukan.', 404);
        }

        $request->validate([
            'action' => 'required|string|in:START_REVIEW,REJECT,FULFILL',
            'reason' => 'nullable|string',
            'definition_id' => 'nullable|uuid',
        ]);

        $action = $request->input('action');
        $before = $defReq->toArray();

        if ($action === 'START_REVIEW') {
            $defReq->status = 'PROCESSING';
            $defReq->reviewer_user_id = $actor->id;
        } elseif ($action === 'REJECT') {
            $defReq->status = 'REJECTED';
            $defReq->reviewer_user_id = $actor->id;
            $defReq->review_note = $request->input('reason');
        } elseif ($action === 'FULFILL') {
            $defId = $request->input('definition_id');
            if (empty($defId) || ! ServiceDefinition::where('id', $defId)->exists()) {
                return ApiResponse::error(
                    'SERVICE_VALIDATION_FAILED',
                    'ID canonical definition resmi wajib disertakan dan harus valid untuk memenuhi permintaan.',
                    422,
                    ['definition_id' => ['Canonical definition tidak ditemukan.']]
                );
            }

            $defReq->status = 'FULFILLED';
            $defReq->reviewer_user_id = $actor->id;
            $defReq->fulfilled_definition_id = $defId;
            $defReq->review_note = $request->input('reason');
        }

        $defReq->lock_version += 1;
        $defReq->save();

        RecordServiceAudit::execute(
            entityType: 'SERVICE_DEFINITION_REQUEST',
            entityId: $defReq->id,
            action: 'REVIEW_REQUEST_' . $action,
            before: $before,
            after: $defReq->toArray()
        );

        return ApiResponse::success($defReq, 'SERVICE_DEFINITION_REQUEST_REVIEWED', 200);
    }
}
