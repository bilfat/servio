<?php

namespace App\Http\Controllers;

use App\Domain\Service\Actions\RecordServiceAudit;
use App\Models\Capability;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminCapabilityController extends Controller
{
    /**
     * A10: List all capabilities
     */
    public function index(Request $request): JsonResponse
    {
        $query = Capability::query();

        if ($status = $request->query('status')) {
            $query->where('status', strtoupper($status));
        }
        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        $items = $query->orderBy('name')->get();

        return ApiResponse::success($items, 'ADMIN_CAPABILITIES_OK');
    }

    /**
     * A11: Create capability master
     */
    public function store(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $request->validate([
            'code' => 'required|string|max:128|unique:capabilities,code',
            'name' => 'required|string|max:160',
            'description' => 'nullable|string',
        ]);

        $capability = Capability::create([
            'id' => (string) Str::uuid(),
            'code' => strtoupper(trim($request->input('code'))),
            'name' => $request->input('name'),
            'normalized_name' => mb_strtolower(trim($request->input('name'))),
            'description' => $request->input('description'),
            'status' => 'ACTIVE',
            'created_by_user_id' => $actor->id,
            'lock_version' => 1,
        ]);

        RecordServiceAudit::execute(
            entityType: 'CAPABILITY',
            entityId: $capability->id,
            action: 'CREATE_CAPABILITY',
            before: null,
            after: $capability->toArray()
        );

        return ApiResponse::success($capability, 'CAPABILITY_CREATED', 201);
    }

    /**
     * A12: Update capability master
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $capability = Capability::find($id);
        if (! $capability) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Master capability tidak ditemukan.', 404);
        }

        $request->validate([
            'name' => 'nullable|string|max:160',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:ACTIVE,INACTIVE',
        ]);

        $before = $capability->toArray();

        if ($request->has('name')) {
            $capability->name = $request->input('name');
            $capability->normalized_name = mb_strtolower(trim($request->input('name')));
        }
        if ($request->has('description')) {
            $capability->description = $request->input('description');
        }
        if ($request->has('status')) {
            $capability->status = strtoupper($request->input('status'));
        }

        $capability->lock_version += 1;
        $capability->save();

        RecordServiceAudit::execute(
            entityType: 'CAPABILITY',
            entityId: $capability->id,
            action: 'UPDATE_CAPABILITY',
            before: $before,
            after: $capability->toArray()
        );

        return ApiResponse::success($capability, 'CAPABILITY_UPDATED', 200);
    }
}
