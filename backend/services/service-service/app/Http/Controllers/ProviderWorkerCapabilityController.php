<?php

namespace App\Http\Controllers;

use App\Domain\Service\Actions\RecordServiceAudit;
use App\Models\Capability;
use App\Models\WorkerCapability;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProviderWorkerCapabilityController extends Controller
{
    /**
     * W01: List worker capabilities
     */
    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $query = WorkerCapability::with('capability')
            ->where('provider_organization_id', $actor->organizationId);

        if ($workerId = $request->query('worker_user_id')) {
            $query->where('worker_user_id', $workerId);
        }

        $items = $query->orderBy('created_at', 'desc')->get();

        return ApiResponse::success($items, 'WORKER_CAPABILITIES_OK');
    }

    /**
     * W02: Update capabilities for a worker
     */
    public function updateWorkerCapabilities(Request $request, string $worker_user_id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $request->validate([
            'capability_ids' => 'required|array',
            'capability_ids.*' => 'uuid',
        ]);

        $capIds = $request->input('capability_ids', []);
        $validCaps = Capability::whereIn('id', $capIds)->where('status', 'ACTIVE')->pluck('id')->all();

        return DB::transaction(function () use ($actor, $worker_user_id, $validCaps) {
            // Delete existing records for this worker in this organization
            WorkerCapability::where('provider_organization_id', $actor->organizationId)
                ->where('worker_user_id', $worker_user_id)
                ->delete();

            foreach ($validCaps as $capId) {
                WorkerCapability::create([
                    'id' => (string) Str::uuid(),
                    'worker_user_id' => $worker_user_id,
                    'provider_organization_id' => $actor->organizationId,
                    'capability_id' => $capId,
                    'status' => 'ACTIVE',
                    'recorded_by_user_id' => $actor->id,
                    'recorded_at' => now(),
                ]);
            }

            RecordServiceAudit::execute(
                entityType: 'WORKER_CAPABILITY',
                entityId: $worker_user_id,
                action: 'UPDATE_WORKER_CAPABILITIES',
                before: null,
                after: ['capability_ids' => $validCaps]
            );

            $results = WorkerCapability::with('capability')
                ->where('provider_organization_id', $actor->organizationId)
                ->where('worker_user_id', $worker_user_id)
                ->get();

            return ApiResponse::success($results, 'WORKER_CAPABILITIES_UPDATED');
        });
    }
}
