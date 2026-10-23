<?php

namespace App\Http\Controllers;

use App\Domain\Service\Actions\RecordServiceAudit;
use App\Infrastructure\Category\CategoryServiceClient;
use App\Infrastructure\Outbox\OutboxPublisher;
use App\Models\Capability;
use App\Models\ServiceDefinition;
use App\Models\ServiceDefinitionMedia;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminServiceDefinitionController extends Controller
{
    public function __construct(
        protected CategoryServiceClient $categoryClient
    ) {}

    /**
     * A01: List canonical service definitions
     */
    public function index(Request $request): JsonResponse
    {
        $query = ServiceDefinition::with(['capabilities', 'media']);

        if ($status = $request->query('status')) {
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

        $items = $query->orderBy('created_at', 'desc')->get();

        return ApiResponse::success($items, 'ADMIN_SERVICE_DEFINITIONS_OK');
    }

    /**
     * A02: Create canonical service definition
     */
    public function store(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $request->validate([
            'name' => 'required|string|max:160',
            'category_id' => 'required|uuid',
            'subcategory_id' => 'required|uuid',
            'description' => 'nullable|string',
            'code' => 'nullable|string|max:40',
            'capability_ids' => 'nullable|array',
            'capability_ids.*' => 'uuid',
        ]);

        $subcatCheck = $this->categoryClient->checkEligibility('SUBCATEGORY', $request->input('subcategory_id'));
        if ($subcatCheck !== null && ($subcatCheck['master_code'] ?? '') !== 'JASA') {
            return ApiResponse::error(
                'SERVICE_CATEGORY_INVALID_BRANCH',
                'Kategori/subkategori harus berada pada branch master JASA.',
                422
            );
        }

        $code = $request->input('code') ?: 'DEF-' . strtoupper(Str::slug($request->input('name'))) . '-' . Str::random(4);

        return DB::transaction(function () use ($request, $actor, $code) {
            $definition = ServiceDefinition::create([
                'id' => (string) Str::uuid(),
                'code' => $code,
                'name' => $request->input('name'),
                'normalized_name' => mb_strtolower(trim($request->input('name'))),
                'category_id' => $request->input('category_id'),
                'subcategory_id' => $request->input('subcategory_id'),
                'description' => $request->input('description'),
                'status' => 'DRAFT',
                'created_by_user_id' => $actor->id,
                'lock_version' => 1,
            ]);

            if ($capIds = $request->input('capability_ids')) {
                $definition->capabilities()->sync($capIds);
            }

            RecordServiceAudit::execute(
                entityType: 'SERVICE_DEFINITION',
                entityId: $definition->id,
                action: 'CREATE_DEFINITION',
                before: null,
                after: $definition->toArray()
            );

            OutboxPublisher::record(
                aggregateType: 'SERVICE_DEFINITION',
                aggregateId: $definition->id,
                eventType: 'ServiceDefinitionCreated.v1',
                payload: ['definition_id' => $definition->id, 'name' => $definition->name]
            );

            $definition->load('capabilities');

            return ApiResponse::success($definition, 'SERVICE_DEFINITION_CREATED', 201);
        });
    }

    /**
     * A03: Detail canonical service definition
     */
    public function show(string $id): JsonResponse
    {
        $definition = ServiceDefinition::with(['capabilities', 'media'])->find($id);
        if (! $definition) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Canonical service definition tidak ditemukan.', 404);
        }

        return ApiResponse::success($definition, 'SERVICE_DEFINITION_DETAIL_OK');
    }

    /**
     * A04: Update canonical service definition
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $definition = ServiceDefinition::find($id);
        if (! $definition) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Canonical service definition tidak ditemukan.', 404);
        }

        $request->validate([
            'name' => 'nullable|string|max:160',
            'description' => 'nullable|string',
            'capability_ids' => 'nullable|array',
            'capability_ids.*' => 'uuid',
        ]);

        $before = $definition->toArray();

        return DB::transaction(function () use ($request, $definition, $before) {
            if ($request->has('name')) {
                $definition->name = $request->input('name');
                $definition->normalized_name = mb_strtolower(trim($request->input('name')));
            }
            if ($request->has('description')) {
                $definition->description = $request->input('description');
            }

            if ($request->has('capability_ids')) {
                $definition->capabilities()->sync($request->input('capability_ids'));
            }

            $definition->lock_version += 1;
            $definition->save();

            RecordServiceAudit::execute(
                entityType: 'SERVICE_DEFINITION',
                entityId: $definition->id,
                action: 'UPDATE_DEFINITION',
                before: $before,
                after: $definition->toArray()
            );

            $definition->load('capabilities');

            return ApiResponse::success($definition, 'SERVICE_DEFINITION_UPDATED', 200);
        });
    }

    /**
     * A05: Change status (ACTIVE / INACTIVE)
     */
    public function changeStatus(Request $request, string $id): JsonResponse
    {
        $definition = ServiceDefinition::find($id);
        if (! $definition) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Canonical service definition tidak ditemukan.', 404);
        }

        $request->validate([
            'status' => 'required|string|in:ACTIVE,INACTIVE',
        ]);

        $targetStatus = strtoupper($request->input('status'));

        if ($targetStatus === 'ACTIVE') {
            $catCheck = $this->categoryClient->checkEligibility('SUBCATEGORY', $definition->subcategory_id);
            if ($catCheck !== null && ($catCheck['master_code'] ?? '') !== 'JASA') {
                return ApiResponse::error(
                    'SERVICE_CATEGORY_INVALID_BRANCH',
                    'Kategori jasa harus berada pada branch master JASA untuk dapat diaktifkan.',
                    422
                );
            }
        }

        $before = $definition->toArray();

        return DB::transaction(function () use ($definition, $targetStatus, $before) {
            $definition->status = $targetStatus;
            $definition->lock_version += 1;
            $definition->save();

            RecordServiceAudit::execute(
                entityType: 'SERVICE_DEFINITION',
                entityId: $definition->id,
                action: $targetStatus === 'ACTIVE' ? 'ACTIVATE_DEFINITION' : 'DEACTIVATE_DEFINITION',
                before: $before,
                after: $definition->toArray()
            );

            OutboxPublisher::record(
                aggregateType: 'SERVICE_DEFINITION',
                aggregateId: $definition->id,
                eventType: $targetStatus === 'ACTIVE' ? 'ServiceDefinitionActivated.v1' : 'ServiceDefinitionDeactivated.v1',
                payload: ['definition_id' => $definition->id, 'status' => $targetStatus]
            );

            return ApiResponse::success($definition, 'SERVICE_DEFINITION_STATUS_UPDATED', 200);
        });
    }

    /**
     * A06: Upload definition media
     */
    public function storeMedia(Request $request, string $id): JsonResponse
    {
        $definition = ServiceDefinition::find($id);
        if (! $definition) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Canonical service definition tidak ditemukan.', 404);
        }

        $request->validate([
            'file' => 'required|file|mimes:jpeg,png,webp|max:5120',
            'is_primary' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $file = $request->file('file');
        $ext = $file->getClientOriginalExtension() ?: 'jpg';
        $mediaId = (string) Str::uuid();
        $storageKey = "definition-media/{$definition->id}/{$mediaId}.{$ext}";

        $file->storeAs('private/' . dirname($storageKey), basename($storageKey), 'local');

        $media = ServiceDefinitionMedia::create([
            'id' => $mediaId,
            'definition_id' => $definition->id,
            'storage_disk' => 'local',
            'storage_key' => $storageKey,
            'mime_type' => $file->getMimeType(),
            'bytes' => $file->getSize(),
            'sort_order' => (int) $request->input('sort_order', 0),
            'is_primary' => $request->boolean('is_primary', false),
            'storage_state' => 'READY',
        ]);

        return ApiResponse::success($media, 'SERVICE_DEFINITION_MEDIA_UPLOADED', 201);
    }

    /**
     * A07: Delete definition media
     */
    public function destroyMedia(string $id, string $media_id): JsonResponse
    {
        $media = ServiceDefinitionMedia::where('id', $media_id)->where('definition_id', $id)->first();
        if (! $media) {
            return ApiResponse::error('SERVICE_NOT_FOUND', 'Media tidak ditemukan.', 404);
        }

        $media->delete();

        return ApiResponse::success(['id' => $media_id, 'deleted' => true], 'SERVICE_DEFINITION_MEDIA_DELETED', 200);
    }
}
