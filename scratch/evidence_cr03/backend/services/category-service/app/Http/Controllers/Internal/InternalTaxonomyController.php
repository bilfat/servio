<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\CategoryDeleteGuard;
use App\Models\CategoryMaster;
use App\Models\CategoryReferenceClaim;
use App\Models\Subcategory;
use App\Models\SubcategoryReferenceClaim;
use App\Services\CategoryService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InternalTaxonomyController extends Controller
{
    protected array $authorizedConsumerServices = [
        'product-service',
        'service-offering-service',
        'order-service',
        'catalog-service',
        'cart-service',
        'booking-service',
        'promotion-service',
    ];

    public function __construct(
        protected CategoryService $categoryService
    ) {}

    /**
     * I01: POST /internal/v1/taxonomy/eligibility/check
     */
    public function checkEligibility(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'node_type' => 'required|string|in:CATEGORY,SUBCATEGORY',
            'node_id' => 'required|string|uuid',
            'operation' => 'nullable|string',
        ]);

        $result = $this->categoryService->checkEligibility(
            $validated['node_type'],
            $validated['node_id'],
            $validated['operation'] ?? 'NEW_ASSIGNMENT'
        );

        return ApiResponse::success($result, 'CATEGORY_ELIGIBILITY_CHECKED');
    }

    /**
     * I02: GET /internal/v1/taxonomy/masters
     */
    public function getMasters(): JsonResponse
    {
        $masters = CategoryMaster::orderBy('sort_order')->get();

        return ApiResponse::success(['masters' => $masters], 'INTERNAL_MASTERS_LOADED');
    }

    /**
     * I03: GET /internal/v1/taxonomy/tree
     */
    public function getTree(Request $request): JsonResponse
    {
        $actor = new AuthenticatedActor(
            id: 'internal-m2m',
            role: 'ADMIN_OPERATIONS',
            isGuest: false
        );

        $tree = $this->categoryService->getTree(
            $actor,
            $request->query('master'),
            filter_var($request->query('include_inactive', true), FILTER_VALIDATE_BOOLEAN)
        );

        return ApiResponse::success(['tree' => $tree], 'INTERNAL_TREE_LOADED');
    }

    /**
     * I04: POST /internal/v1/taxonomy/reference-claims
     */
    public function storeClaim(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'consumer_service' => ['required', 'string', 'max:40', 'in:' . implode(',', $this->authorizedConsumerServices)],
            'consumer_reference_id' => 'required|string|max:128',
            'node_type' => 'required|string|in:CATEGORY,SUBCATEGORY',
            'node_id' => 'required|string|uuid',
            'operation_id' => 'nullable|string',
        ]);

        // 1. Verify caller identity bound from authenticated M2M header (Task 02)
        $authenticatedConsumer = $request->attributes->get('internal_consumer_service');
        if (empty($authenticatedConsumer)) {
            return ApiResponse::error(
                'CATEGORY_INTERNAL_CALLER_REQUIRED',
                'Header X-Consumer-Service wajib disertakan untuk mendaftarkan klaim referensi.',
                403
            );
        }

        // 2. Reject caller pretending to be another service (Anti-impersonation)
        if ($validated['consumer_service'] !== $authenticatedConsumer) {
            return ApiResponse::error(
                'CATEGORY_CONSUMER_IMPERSONATION_DENIED',
                "Layanan '{$authenticatedConsumer}' tidak diizinkan mendaftarkan klaim atas nama '{$validated['consumer_service']}'.",
                403
            );
        }

        $nodeType = strtoupper($validated['node_type']);
        $nodeId = $validated['node_id'];

        // 3. Verify node existence and register claim
        if ($nodeType === 'CATEGORY') {
            $categoryExists = Category::where('id', $nodeId)->exists();
            if (! $categoryExists) {
                return ApiResponse::error(
                    'CATEGORY_NODE_NOT_FOUND',
                    "Kategori dengan ID {$nodeId} tidak ditemukan.",
                    404
                );
            }

            $claim = CategoryReferenceClaim::where('consumer_service', $validated['consumer_service'])
                ->where('consumer_reference_id', $validated['consumer_reference_id'])
                ->where('category_id', $nodeId)
                ->first();

            if ($claim) {
                // Preserve existing primary key 'id'
                $claim->update(['state' => 'ACTIVE']);
            } else {
                $claim = CategoryReferenceClaim::create([
                    'id' => (string) Str::uuid(),
                    'consumer_service' => $validated['consumer_service'],
                    'consumer_reference_id' => $validated['consumer_reference_id'],
                    'category_id' => $nodeId,
                    'state' => 'ACTIVE',
                ]);
            }
        } else {
            $subcategoryExists = Subcategory::where('id', $nodeId)->exists();
            if (! $subcategoryExists) {
                return ApiResponse::error(
                    'CATEGORY_NODE_NOT_FOUND',
                    "Subkategori dengan ID {$nodeId} tidak ditemukan.",
                    404
                );
            }

            $claim = SubcategoryReferenceClaim::where('consumer_service', $validated['consumer_service'])
                ->where('consumer_reference_id', $validated['consumer_reference_id'])
                ->where('subcategory_id', $nodeId)
                ->first();

            if ($claim) {
                // Preserve existing primary key 'id'
                $claim->update(['state' => 'ACTIVE']);
            } else {
                $claim = SubcategoryReferenceClaim::create([
                    'id' => (string) Str::uuid(),
                    'consumer_service' => $validated['consumer_service'],
                    'consumer_reference_id' => $validated['consumer_reference_id'],
                    'subcategory_id' => $nodeId,
                    'state' => 'ACTIVE',
                ]);
            }
        }

        return ApiResponse::success([
            'claim_id' => $claim->id,
            'node_type' => $nodeType,
            'node_id' => $nodeId,
            'state' => 'ACTIVE',
        ], 'CATEGORY_REFERENCE_CLAIM_REGISTERED', 201);
    }

    /**
     * I05: GET /internal/v1/taxonomy/reference-claims/{id}
     */
    public function showClaim(string $id): JsonResponse
    {
        $catClaim = CategoryReferenceClaim::find($id);
        if ($catClaim) {
            return ApiResponse::success([
                'id' => $catClaim->id,
                'node_type' => 'CATEGORY',
                'node_id' => $catClaim->category_id,
                'consumer_service' => $catClaim->consumer_service,
                'consumer_reference_id' => $catClaim->consumer_reference_id,
                'state' => $catClaim->state,
            ], 'CATEGORY_CLAIM_LOADED');
        }

        $subClaim = SubcategoryReferenceClaim::find($id);
        if ($subClaim) {
            return ApiResponse::success([
                'id' => $subClaim->id,
                'node_type' => 'SUBCATEGORY',
                'node_id' => $subClaim->subcategory_id,
                'consumer_service' => $subClaim->consumer_service,
                'consumer_reference_id' => $subClaim->consumer_reference_id,
                'state' => $subClaim->state,
            ], 'CATEGORY_CLAIM_LOADED');
        }

        return ApiResponse::error('CATEGORY_CLAIM_NOT_FOUND', 'Klaim referensi tidak ditemukan.', 404);
    }

    /**
     * I06: POST /internal/v1/taxonomy/reference-checks/prepare
     */
    public function prepareReferenceCheck(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'node_type' => 'required|string|in:CATEGORY,SUBCATEGORY',
            'node_id' => 'required|string|uuid',
        ]);

        $nodeType = strtoupper($validated['node_type']);
        $nodeId = $validated['node_id'];

        // Verify node existence
        $nodeExists = $nodeType === 'CATEGORY'
            ? Category::where('id', $nodeId)->exists()
            : Subcategory::where('id', $nodeId)->exists();

        if (! $nodeExists) {
            return ApiResponse::error(
                'CATEGORY_NODE_NOT_FOUND',
                "Node {$nodeType} dengan ID {$nodeId} tidak ditemukan.",
                404
            );
        }

        // Atomic row-level locked transaction to prevent lost updates and handle concurrent initial inserts
        $guard = DB::transaction(function () use ($nodeType, $nodeId) {
            $existing = CategoryDeleteGuard::where('node_type', $nodeType)
                ->where('node_id', $nodeId)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                $existing->fence_generation = (int) $existing->fence_generation + 1;
                $existing->fenced_at = now();
                $existing->released_at = null;
                $existing->save();

                return $existing;
            }

            try {
                return CategoryDeleteGuard::create([
                    'id' => (string) Str::uuid(),
                    'node_type' => $nodeType,
                    'node_id' => $nodeId,
                    'fence_generation' => 1,
                    'fenced_at' => now(),
                    'released_at' => null,
                ]);
            } catch (QueryException $e) {
                // In case of concurrent initial insert race, acquire row lock and increment
                $existingAfterRace = CategoryDeleteGuard::where('node_type', $nodeType)
                    ->where('node_id', $nodeId)
                    ->lockForUpdate()
                    ->firstOrFail();

                $existingAfterRace->fence_generation = (int) $existingAfterRace->fence_generation + 1;
                $existingAfterRace->fenced_at = now();
                $existingAfterRace->released_at = null;
                $existingAfterRace->save();

                return $existingAfterRace;
            }
        }, 3);

        return ApiResponse::success([
            'guard_id' => $guard->id,
            'node_type' => $guard->node_type,
            'node_id' => $guard->node_id,
            'fence_generation' => (int) $guard->fence_generation,
            'fenced_at' => $guard->fenced_at?->toIso8601String(),
        ], 'CATEGORY_REFERENCE_FENCE_PREPARED');
    }
}
