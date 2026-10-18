<?php

namespace App\Services;

use App\Models\Category;
use App\Models\CategoryAuditLog;
use App\Models\CategoryDeleteGuard;
use App\Models\CategoryMaster;
use App\Models\CategoryOutboxEvent;
use App\Models\CategoryReferenceClaim;
use App\Models\CategoryRequest;
use App\Models\Subcategory;
use App\Models\SubcategoryReferenceClaim;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use App\Support\CategoryNormalizer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CategoryService
{
    /**
     * C01: Get Master Categories (PRODUK / JASA)
     */
    public function getMasters(AuthenticatedActor $actor): array
    {
        $masters = CategoryMaster::orderBy('sort_order')->get();

        return $masters->map(function ($m) use ($actor) {
            return [
                'id' => $m->id,
                'code' => $m->code,
                'name' => $m->name,
                'status' => $m->status,
                'sort_order' => $m->sort_order,
                'accessible' => $actor->canReadBranch($m->code),
            ];
        })->values()->all();
    }

    /**
     * C02: Get Full Category Tree
     */
    public function getTree(AuthenticatedActor $actor, ?string $masterCode = null, bool $includeInactive = false): array
    {
        $canSeeInactive = $includeInactive && $actor->isGovernance();

        $query = CategoryMaster::with(['categories' => function ($cq) use ($canSeeInactive) {
            if (! $canSeeInactive) {
                $cq->where('status', 'ACTIVE');
            }
            $cq->with(['subcategories' => function ($sq) use ($canSeeInactive) {
                if (! $canSeeInactive) {
                    $sq->where('status', 'ACTIVE');
                }
                $sq->orderBy('name');
            }])->orderBy('name');
        }])->orderBy('sort_order');

        if ($masterCode) {
            $query->where('code', strtoupper($masterCode));
        }

        $masters = $query->get();

        $tree = [];
        foreach ($masters as $master) {
            if (! $actor->canReadBranch($master->code)) {
                continue;
            }

            $categories = [];
            foreach ($master->categories as $category) {
                $subcategories = [];
                foreach ($category->subcategories as $sub) {
                    $subEffective = $sub->status === 'ACTIVE' 
                        && $category->status === 'ACTIVE' 
                        && $master->status === 'ACTIVE';

                    // If non-governance actor, skip if not effective active
                    if (! $canSeeInactive && ! $subEffective) {
                        continue;
                    }

                    $subcategories[] = [
                        'id' => $sub->id,
                        'category_id' => $sub->category_id,
                        'name' => $sub->name,
                        'description' => $sub->description,
                        'status' => $sub->status,
                        'effective_active' => $subEffective,
                        'lock_version' => $sub->lock_version,
                        'created_at' => $sub->created_at?->toIso8601String(),
                        'updated_at' => $sub->updated_at?->toIso8601String(),
                    ];
                }

                $catEffective = $category->status === 'ACTIVE' && $master->status === 'ACTIVE';
                if (! $canSeeInactive && ! $catEffective) {
                    continue;
                }

                $categories[] = [
                    'id' => $category->id,
                    'master_id' => $category->master_id,
                    'master_code' => $master->code,
                    'name' => $category->name,
                    'description' => $category->description,
                    'icon_name' => $category->icon_name,
                    'status' => $category->status,
                    'effective_active' => $catEffective,
                    'lock_version' => $category->lock_version,
                    'subcategories' => $subcategories,
                    'created_at' => $category->created_at?->toIso8601String(),
                    'updated_at' => $category->updated_at?->toIso8601String(),
                ];
            }

            $tree[] = [
                'id' => $master->id,
                'code' => $master->code,
                'name' => $master->name,
                'status' => $master->status,
                'sort_order' => $master->sort_order,
                'categories' => $categories,
            ];
        }

        return $tree;
    }

    /**
     * C03: List Categories with pagination and filters
     */
    public function listCategories(AuthenticatedActor $actor, array $filters): array
    {
        $canSeeInactive = ! empty($filters['include_inactive']) && $actor->isGovernance();

        $query = Category::with('master');

        // Master branch filter
        $masterParam = $filters['master'] ?? $filters['master_code'] ?? null;
        if (! empty($masterParam)) {
            $masterCode = strtoupper($masterParam);
            if (! $actor->canReadBranch($masterCode)) {
                return ['items' => [], 'total' => 0];
            }
            $query->whereHas('master', fn($q) => $q->where('code', $masterCode));
        } else {
            // Apply actor branch access restrictions
            if ($actor->isProvider()) {
                $query->whereHas('master', fn($q) => $q->where('code', 'JASA'));
            } elseif ($actor->isSupplier()) {
                $query->whereHas('master', fn($q) => $q->where('code', 'PRODUK'));
            }
        }

        // Status filter
        if (! empty($filters['status'])) {
            $status = strtoupper($filters['status']);
            if ($status === 'INACTIVE' && ! $actor->isGovernance()) {
                // Non-governance cannot view inactive nodes
                return ['items' => [], 'total' => 0];
            }
            $query->where('status', $status);
        } elseif (! $canSeeInactive) {
            $query->where('status', 'ACTIVE');
        }

        // Search query
        if (! empty($filters['search'])) {
            $search = CategoryNormalizer::normalize($filters['search']);
            $query->where('normalized_name', 'like', "%{$search}%");
        }

        // Sorting
        $sort = $filters['sort'] ?? 'name';
        if ($sort === '-name') {
            $query->orderByDesc('name');
        } elseif ($sort === 'created_at') {
            $query->orderBy('created_at');
        } elseif ($sort === '-created_at') {
            $query->orderByDesc('created_at');
        } else {
            $query->orderBy('name');
        }

        $limit = min(500, max(1, (int) ($filters['limit'] ?? 100)));
        $paginated = $query->paginate($limit);

        $items = $paginated->getCollection()->map(function (Category $c) {
            return [
                'id' => $c->id,
                'master_id' => $c->master_id,
                'master_code' => $c->master?->code,
                'name' => $c->name,
                'description' => $c->description,
                'icon_name' => $c->icon_name,
                'status' => $c->status,
                'effective_active' => $c->effective_active,
                'lock_version' => $c->lock_version,
                'created_at' => $c->created_at?->toIso8601String(),
                'updated_at' => $c->updated_at?->toIso8601String(),
            ];
        })->all();

        return [
            'items' => $items,
            'pagination' => [
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
            ],
        ];
    }

    /**
     * C04: Get Category Detail
     */
    public function getCategory(AuthenticatedActor $actor, string $id): array
    {
        $category = Category::with('master')
            ->where(function ($q) use ($id) {
                $q->where('id', $id)
                  ->orWhere('normalized_name', CategoryNormalizer::normalize($id))
                  ->orWhere('normalized_name', str_replace('-', ' ', CategoryNormalizer::normalize($id)))
                  ->orWhereRaw("REPLACE(REPLACE(LOWER(name), ' & ', '-'), ' ', '-') = ?", [strtolower($id)]);
            })
            ->first();

        if (! $category) {
            throw new HttpException(404, 'Kategori tidak ditemukan.');
        }

        if (! $actor->canReadBranch($category->master?->code ?? '')) {
            throw new HttpException(404, 'Kategori tidak ditemukan.');
        }

        if ($category->status !== 'ACTIVE' && ! $actor->isGovernance()) {
            throw new HttpException(404, 'Kategori tidak ditemukan.');
        }

        return [
            'id' => $category->id,
            'master_id' => $category->master_id,
            'master_code' => $category->master?->code,
            'name' => $category->name,
            'description' => $category->description,
            'icon_name' => $category->icon_name,
            'status' => $category->status,
            'effective_active' => $category->effective_active,
            'lock_version' => $category->lock_version,
            'created_at' => $category->created_at?->toIso8601String(),
            'updated_at' => $category->updated_at?->toIso8601String(),
        ];
    }

    /**
     * C05: Create Category
     */
    public function createCategory(AuthenticatedActor $actor, array $data): array
    {
        $master = CategoryMaster::find($data['master_id']);
        if (! $master) {
            throw new HttpException(422, 'Master Category tidak ditemukan.');
        }

        $normalizedName = CategoryNormalizer::normalize($data['name']);
        if (empty($normalizedName)) {
            throw new HttpException(422, 'Nama kategori tidak valid.');
        }

        // Duplicate check on same parent (master_id)
        $exists = Category::where('master_id', $master->id)
            ->where('normalized_name', $normalizedName)
            ->exists();

        if ($exists) {
            throw new HttpException(409, 'Nama kategori sudah digunakan pada parent yang sama.');
        }

        return DB::transaction(function () use ($actor, $master, $data, $normalizedName) {
            $category = Category::create([
                'id' => (string) Str::uuid(),
                'master_id' => $master->id,
                'name' => trim($data['name']),
                'normalized_name' => $normalizedName,
                'description' => $data['description'] ?? null,
                'icon_name' => $data['icon_name'] ?? null,
                'status' => 'ACTIVE',
                'lock_version' => 1,
            ]);

            // Audit log
            CategoryAuditLog::create([
                'id' => (string) Str::uuid(),
                'request_id' => request()->header('X-Request-Id'),
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'CATEGORY_CREATED',
                'entity_type' => 'CATEGORY',
                'entity_id' => $category->id,
                'new_safe_snapshot' => $category->toArray(),
                'occurred_at' => now(),
            ]);

            // Transactional Outbox
            CategoryOutboxEvent::create([
                'id' => (string) Str::uuid(),
                'event_type' => 'category.category.created.v1',
                'aggregate_type' => 'CATEGORY',
                'aggregate_id' => $category->id,
                'aggregate_version' => 1,
                'payload' => [
                    'category_id' => $category->id,
                    'master_code' => $master->code,
                    'status' => 'ACTIVE',
                    'version' => 1,
                ],
                'occurred_at' => now(),
            ]);

            return [
                'id' => $category->id,
                'master_id' => $category->master_id,
                'master_code' => $master->code,
                'name' => $category->name,
                'description' => $category->description,
                'icon_name' => $category->icon_name,
                'status' => $category->status,
                'effective_active' => true,
                'lock_version' => $category->lock_version,
                'created_at' => $category->created_at?->toIso8601String(),
                'updated_at' => $category->updated_at?->toIso8601String(),
            ];
        });
    }

    /**
     * C06: Update Category
     */
    public function updateCategory(AuthenticatedActor $actor, string $id, array $data, ?int $expectedVersion = null): array
    {
        $category = Category::with('master')->find($id);
        if (! $category) {
            throw new HttpException(404, 'Kategori tidak ditemukan.');
        }

        // Optimistic concurrency lock
        if ($expectedVersion !== null && $category->lock_version !== $expectedVersion) {
            throw new HttpException(409, 'Versi data kategori sudah berubah. Muat ulang data terbaru.');
        }

        $oldSnapshot = $category->toArray();

        // Check rename duplicate
        if (! empty($data['name'])) {
            $normalizedName = CategoryNormalizer::normalize($data['name']);
            $duplicate = Category::where('master_id', $category->master_id)
                ->where('normalized_name', $normalizedName)
                ->where('id', '<>', $category->id)
                ->exists();

            if ($duplicate) {
                throw new HttpException(409, 'Nama kategori sudah digunakan pada parent yang sama.');
            }

            $category->name = trim($data['name']);
            $category->normalized_name = $normalizedName;
        }

        if (array_key_exists('description', $data)) {
            $category->description = $data['description'];
        }

        if (array_key_exists('icon_name', $data)) {
            $category->icon_name = $data['icon_name'];
        }

        return DB::transaction(function () use ($actor, $category, $oldSnapshot) {
            $category->lock_version += 1;
            $category->save();

            // Audit
            CategoryAuditLog::create([
                'id' => (string) Str::uuid(),
                'request_id' => request()->header('X-Request-Id'),
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'CATEGORY_UPDATED',
                'entity_type' => 'CATEGORY',
                'entity_id' => $category->id,
                'old_safe_snapshot' => $oldSnapshot,
                'new_safe_snapshot' => $category->toArray(),
                'occurred_at' => now(),
            ]);

            // Outbox
            CategoryOutboxEvent::create([
                'id' => (string) Str::uuid(),
                'event_type' => 'category.category.updated.v1',
                'aggregate_type' => 'CATEGORY',
                'aggregate_id' => $category->id,
                'aggregate_version' => $category->lock_version,
                'payload' => [
                    'category_id' => $category->id,
                    'master_code' => $category->master?->code,
                    'version' => $category->lock_version,
                ],
                'occurred_at' => now(),
            ]);

            return [
                'id' => $category->id,
                'master_id' => $category->master_id,
                'master_code' => $category->master?->code,
                'name' => $category->name,
                'description' => $category->description,
                'icon_name' => $category->icon_name,
                'status' => $category->status,
                'effective_active' => $category->effective_active,
                'lock_version' => $category->lock_version,
                'created_at' => $category->created_at?->toIso8601String(),
                'updated_at' => $category->updated_at?->toIso8601String(),
            ];
        });
    }

    /**
     * C07: Change Category Status (ACTIVE / INACTIVE)
     */
    public function changeCategoryStatus(AuthenticatedActor $actor, string $id, string $status, ?string $reason = null, ?int $expectedVersion = null): array
    {
        $category = Category::with('master')->find($id);
        if (! $category) {
            throw new HttpException(404, 'Kategori tidak ditemukan.');
        }

        if ($expectedVersion !== null && $category->lock_version !== $expectedVersion) {
            throw new HttpException(409, 'Versi data kategori sudah berubah.');
        }

        $oldSnapshot = $category->toArray();
        $action = $status === 'ACTIVE' ? 'CATEGORY_ACTIVATED' : 'CATEGORY_DEACTIVATED';

        return DB::transaction(function () use ($actor, $category, $status, $reason, $oldSnapshot, $action) {
            $category->status = $status;
            $category->lock_version += 1;
            $category->save();

            CategoryAuditLog::create([
                'id' => (string) Str::uuid(),
                'request_id' => request()->header('X-Request-Id'),
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => $action,
                'entity_type' => 'CATEGORY',
                'entity_id' => $category->id,
                'old_safe_snapshot' => $oldSnapshot,
                'new_safe_snapshot' => $category->toArray(),
                'reason' => $reason,
                'occurred_at' => now(),
            ]);

            CategoryOutboxEvent::create([
                'id' => (string) Str::uuid(),
                'event_type' => 'category.category.status_changed.v1',
                'aggregate_type' => 'CATEGORY',
                'aggregate_id' => $category->id,
                'aggregate_version' => $category->lock_version,
                'payload' => [
                    'category_id' => $category->id,
                    'status' => $category->status,
                    'version' => $category->lock_version,
                ],
                'occurred_at' => now(),
            ]);

            return [
                'id' => $category->id,
                'status' => $category->status,
                'lock_version' => $category->lock_version,
                'children_updated' => 0, // Invariant DEC-03: stored child status is untouched
            ];
        });
    }

    /**
     * C08: Guarded Hard Delete Category (DEC-05)
     */
    public function deleteCategory(AuthenticatedActor $actor, string $id, string $reason, ?int $expectedVersion = null): array
    {
        $category = Category::find($id);
        if (! $category) {
            throw new HttpException(404, 'Kategori tidak ditemukan.');
        }

        if ($expectedVersion !== null && $category->lock_version !== $expectedVersion) {
            throw new HttpException(409, 'Versi data kategori sudah berubah.');
        }

        // 1. Guard against existing children
        $childrenCount = Subcategory::where('category_id', $category->id)->count();
        if ($childrenCount > 0) {
            throw new HttpException(409, 'Kategori tidak dapat dihapus permanen karena masih memiliki subkategori.');
        }

        // 2. Guard against internal references in claims & requests
        $hasClaims = CategoryReferenceClaim::where('category_id', $category->id)->exists();
        $hasFulfilledRequests = CategoryRequest::where('fulfilled_category_id', $category->id)->exists();
        if ($hasClaims || $hasFulfilledRequests) {
            throw new HttpException(409, 'Kategori tidak dapat dihapus permanen karena memiliki referensi klaim atau pengajuan historis.');
        }

        // 3. Fencing / Downstream verification protocol check (DEC-05)
        $fenceEnabled = config('services.category.reference_fence_enabled', env('CATEGORY_REFERENCE_FENCE_ENABLED', false));
        if (! $fenceEnabled) {
            // Fail-closed default as per technical specification Section 07.3
            throw new HttpException(503, 'Protokol verifikasi referensi downstream belum aktif. Gunakan penonaktifan (deactivate).');
        }

        return DB::transaction(function () use ($actor, $category, $reason) {
            $snapshot = $category->toArray();
            $deletedId = $category->id;

            $category->delete();

            $audit = CategoryAuditLog::create([
                'id' => (string) Str::uuid(),
                'request_id' => request()->header('X-Request-Id'),
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'CATEGORY_HARD_DELETED',
                'entity_type' => 'CATEGORY',
                'entity_id' => $deletedId,
                'old_safe_snapshot' => $snapshot,
                'reason' => $reason,
                'occurred_at' => now(),
            ]);

            CategoryOutboxEvent::create([
                'id' => (string) Str::uuid(),
                'event_type' => 'category.category.deleted.v1',
                'aggregate_type' => 'CATEGORY',
                'aggregate_id' => $deletedId,
                'aggregate_version' => $category->lock_version,
                'payload' => [
                    'category_id' => $deletedId,
                    'deleted_at' => now()->toIso8601String(),
                ],
                'occurred_at' => now(),
            ]);

            return [
                'node_type' => 'CATEGORY',
                'deleted_id' => $deletedId,
                'deleted_at' => now()->toIso8601String(),
                'audit_event_id' => $audit->id,
                'reference_guard_verified' => true,
            ];
        });
    }

    /**
     * S01: List Subcategories
     */
    public function listSubcategories(AuthenticatedActor $actor, array $filters): array
    {
        $canSeeInactive = ! empty($filters['include_inactive']) && $actor->isGovernance();

        $query = Subcategory::with(['category.master']);

        // Parent Category filter
        if (! empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        // Master branch filter
        $masterParam = $filters['master'] ?? $filters['master_code'] ?? null;
        if (! empty($masterParam)) {
            $masterCode = strtoupper($masterParam);
            if (! $actor->canReadBranch($masterCode)) {
                return ['items' => [], 'total' => 0];
            }
            $query->whereHas('category.master', fn($q) => $q->where('code', $masterCode));
        } else {
            if ($actor->isProvider()) {
                $query->whereHas('category.master', fn($q) => $q->where('code', 'JASA'));
            } elseif ($actor->isSupplier()) {
                $query->whereHas('category.master', fn($q) => $q->where('code', 'PRODUK'));
            }
        }

        // Status filter
        if (! empty($filters['status'])) {
            $status = strtoupper($filters['status']);
            if ($status === 'INACTIVE' && ! $actor->isGovernance()) {
                return ['items' => [], 'total' => 0];
            }
            $query->where('status', $status);
        } elseif (! $canSeeInactive) {
            $query->where('status', 'ACTIVE');
        }

        // Search
        if (! empty($filters['search'])) {
            $search = CategoryNormalizer::normalize($filters['search']);
            $query->where('normalized_name', 'like', "%{$search}%");
        }

        $sort = $filters['sort'] ?? 'name';
        if ($sort === '-name') {
            $query->orderByDesc('name');
        } elseif ($sort === 'created_at') {
            $query->orderBy('created_at');
        } elseif ($sort === '-created_at') {
            $query->orderByDesc('created_at');
        } else {
            $query->orderBy('name');
        }

        $limit = min(500, max(1, (int) ($filters['limit'] ?? 100)));
        $paginated = $query->paginate($limit);

        $items = $paginated->getCollection()->map(function (Subcategory $s) {
            return [
                'id' => $s->id,
                'category_id' => $s->category_id,
                'category_name' => $s->category?->name,
                'master_code' => $s->category?->master?->code,
                'name' => $s->name,
                'description' => $s->description,
                'status' => $s->status,
                'effective_active' => $s->effective_active,
                'lock_version' => $s->lock_version,
                'created_at' => $s->created_at?->toIso8601String(),
                'updated_at' => $s->updated_at?->toIso8601String(),
            ];
        })->all();

        return [
            'items' => $items,
            'pagination' => [
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
            ],
        ];
    }

    /**
     * S02: Get Subcategory Detail
     */
    public function getSubcategory(AuthenticatedActor $actor, string $id): array
    {
        $subcategory = Subcategory::with(['category.master'])->find($id);

        if (! $subcategory) {
            throw new HttpException(404, 'Subkategori tidak ditemukan.');
        }

        $masterCode = $subcategory->category?->master?->code ?? '';
        if (! $actor->canReadBranch($masterCode)) {
            throw new HttpException(404, 'Subkategori tidak ditemukan.');
        }

        if ($subcategory->status !== 'ACTIVE' && ! $actor->isGovernance()) {
            throw new HttpException(404, 'Subkategori tidak ditemukan.');
        }

        return [
            'id' => $subcategory->id,
            'category_id' => $subcategory->category_id,
            'category_name' => $subcategory->category?->name,
            'master_code' => $masterCode,
            'name' => $subcategory->name,
            'description' => $subcategory->description,
            'status' => $subcategory->status,
            'effective_active' => $subcategory->effective_active,
            'lock_version' => $subcategory->lock_version,
            'created_at' => $subcategory->created_at?->toIso8601String(),
            'updated_at' => $subcategory->updated_at?->toIso8601String(),
        ];
    }

    /**
     * S03: Create Subcategory (parent must be ACTIVE)
     */
    public function createSubcategory(AuthenticatedActor $actor, array $data): array
    {
        $category = Category::with('master')->find($data['category_id']);
        if (! $category) {
            throw new HttpException(422, 'Parent Category tidak ditemukan.');
        }

        // EC-005 / BR-STATUS: Cannot create child under INACTIVE parent
        if ($category->status !== 'ACTIVE') {
            throw new HttpException(409, 'Tidak dapat menambahkan subkategori pada parent kategori yang berstatus INACTIVE.');
        }

        $normalizedName = CategoryNormalizer::normalize($data['name']);
        if (empty($normalizedName)) {
            throw new HttpException(422, 'Nama subkategori tidak valid.');
        }

        $exists = Subcategory::where('category_id', $category->id)
            ->where('normalized_name', $normalizedName)
            ->exists();

        if ($exists) {
            throw new HttpException(409, 'Nama subkategori sudah digunakan pada parent kategori yang sama.');
        }

        return DB::transaction(function () use ($actor, $category, $data, $normalizedName) {
            $subcategory = Subcategory::create([
                'id' => (string) Str::uuid(),
                'category_id' => $category->id,
                'name' => trim($data['name']),
                'normalized_name' => $normalizedName,
                'description' => $data['description'] ?? null,
                'status' => 'ACTIVE',
                'lock_version' => 1,
            ]);

            CategoryAuditLog::create([
                'id' => (string) Str::uuid(),
                'request_id' => request()->header('X-Request-Id'),
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'SUBCATEGORY_CREATED',
                'entity_type' => 'SUBCATEGORY',
                'entity_id' => $subcategory->id,
                'new_safe_snapshot' => $subcategory->toArray(),
                'occurred_at' => now(),
            ]);

            CategoryOutboxEvent::create([
                'id' => (string) Str::uuid(),
                'event_type' => 'category.subcategory.created.v1',
                'aggregate_type' => 'SUBCATEGORY',
                'aggregate_id' => $subcategory->id,
                'aggregate_version' => 1,
                'payload' => [
                    'subcategory_id' => $subcategory->id,
                    'category_id' => $category->id,
                    'status' => 'ACTIVE',
                    'version' => 1,
                ],
                'occurred_at' => now(),
            ]);

            return [
                'id' => $subcategory->id,
                'category_id' => $subcategory->category_id,
                'name' => $subcategory->name,
                'description' => $subcategory->description,
                'status' => $subcategory->status,
                'effective_active' => true,
                'lock_version' => $subcategory->lock_version,
                'created_at' => $subcategory->created_at?->toIso8601String(),
                'updated_at' => $subcategory->updated_at?->toIso8601String(),
            ];
        });
    }

    /**
     * S04: Update Subcategory
     */
    public function updateSubcategory(AuthenticatedActor $actor, string $id, array $data, ?int $expectedVersion = null): array
    {
        $subcategory = Subcategory::with('category')->find($id);
        if (! $subcategory) {
            throw new HttpException(404, 'Subkategori tidak ditemukan.');
        }

        if ($expectedVersion !== null && $subcategory->lock_version !== $expectedVersion) {
            throw new HttpException(409, 'Versi data subkategori sudah berubah.');
        }

        $oldSnapshot = $subcategory->toArray();

        if (! empty($data['name'])) {
            $normalizedName = CategoryNormalizer::normalize($data['name']);
            $duplicate = Subcategory::where('category_id', $subcategory->category_id)
                ->where('normalized_name', $normalizedName)
                ->where('id', '<>', $subcategory->id)
                ->exists();

            if ($duplicate) {
                throw new HttpException(409, 'Nama subkategori sudah digunakan pada parent kategori yang sama.');
            }

            $subcategory->name = trim($data['name']);
            $subcategory->normalized_name = $normalizedName;
        }

        if (array_key_exists('description', $data)) {
            $subcategory->description = $data['description'];
        }

        return DB::transaction(function () use ($actor, $subcategory, $oldSnapshot) {
            $subcategory->lock_version += 1;
            $subcategory->save();

            CategoryAuditLog::create([
                'id' => (string) Str::uuid(),
                'request_id' => request()->header('X-Request-Id'),
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'SUBCATEGORY_UPDATED',
                'entity_type' => 'SUBCATEGORY',
                'entity_id' => $subcategory->id,
                'old_safe_snapshot' => $oldSnapshot,
                'new_safe_snapshot' => $subcategory->toArray(),
                'occurred_at' => now(),
            ]);

            CategoryOutboxEvent::create([
                'id' => (string) Str::uuid(),
                'event_type' => 'category.subcategory.updated.v1',
                'aggregate_type' => 'SUBCATEGORY',
                'aggregate_id' => $subcategory->id,
                'aggregate_version' => $subcategory->lock_version,
                'payload' => [
                    'subcategory_id' => $subcategory->id,
                    'version' => $subcategory->lock_version,
                ],
                'occurred_at' => now(),
            ]);

            return [
                'id' => $subcategory->id,
                'category_id' => $subcategory->category_id,
                'name' => $subcategory->name,
                'description' => $subcategory->description,
                'status' => $subcategory->status,
                'effective_active' => $subcategory->effective_active,
                'lock_version' => $subcategory->lock_version,
                'created_at' => $subcategory->created_at?->toIso8601String(),
                'updated_at' => $subcategory->updated_at?->toIso8601String(),
            ];
        });
    }

    /**
     * S05: Change Subcategory Status
     */
    public function changeSubcategoryStatus(AuthenticatedActor $actor, string $id, string $status, ?string $reason = null, ?int $expectedVersion = null): array
    {
        $subcategory = Subcategory::with('category')->find($id);
        if (! $subcategory) {
            throw new HttpException(404, 'Subkategori tidak ditemukan.');
        }

        if ($expectedVersion !== null && $subcategory->lock_version !== $expectedVersion) {
            throw new HttpException(409, 'Versi data subkategori sudah berubah.');
        }

        // If activating, parent category must be ACTIVE
        if ($status === 'ACTIVE' && ($subcategory->category?->status !== 'ACTIVE')) {
            throw new HttpException(409, 'Tidak dapat mengaktifkan subkategori karena parent kategori berstatus INACTIVE.');
        }

        $oldSnapshot = $subcategory->toArray();
        $action = $status === 'ACTIVE' ? 'SUBCATEGORY_ACTIVATED' : 'SUBCATEGORY_DEACTIVATED';

        return DB::transaction(function () use ($actor, $subcategory, $status, $reason, $oldSnapshot, $action) {
            $subcategory->status = $status;
            $subcategory->lock_version += 1;
            $subcategory->save();

            CategoryAuditLog::create([
                'id' => (string) Str::uuid(),
                'request_id' => request()->header('X-Request-Id'),
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => $action,
                'entity_type' => 'SUBCATEGORY',
                'entity_id' => $subcategory->id,
                'old_safe_snapshot' => $oldSnapshot,
                'new_safe_snapshot' => $subcategory->toArray(),
                'reason' => $reason,
                'occurred_at' => now(),
            ]);

            CategoryOutboxEvent::create([
                'id' => (string) Str::uuid(),
                'event_type' => 'category.subcategory.status_changed.v1',
                'aggregate_type' => 'SUBCATEGORY',
                'aggregate_id' => $subcategory->id,
                'aggregate_version' => $subcategory->lock_version,
                'payload' => [
                    'subcategory_id' => $subcategory->id,
                    'status' => $subcategory->status,
                    'version' => $subcategory->lock_version,
                ],
                'occurred_at' => now(),
            ]);

            return [
                'id' => $subcategory->id,
                'status' => $subcategory->status,
                'lock_version' => $subcategory->lock_version,
            ];
        });
    }

    /**
     * S06: Guarded Hard Delete Subcategory
     */
    public function deleteSubcategory(AuthenticatedActor $actor, string $id, string $reason, ?int $expectedVersion = null): array
    {
        $subcategory = Subcategory::find($id);
        if (! $subcategory) {
            throw new HttpException(404, 'Subkategori tidak ditemukan.');
        }

        if ($expectedVersion !== null && $subcategory->lock_version !== $expectedVersion) {
            throw new HttpException(409, 'Versi data subkategori sudah berubah.');
        }

        $hasClaims = SubcategoryReferenceClaim::where('subcategory_id', $subcategory->id)->exists();
        $hasFulfilledRequests = CategoryRequest::where('fulfilled_subcategory_id', $subcategory->id)->exists();
        if ($hasClaims || $hasFulfilledRequests) {
            throw new HttpException(409, 'Subkategori tidak dapat dihapus permanen karena memiliki referensi klaim atau pengajuan historis.');
        }

        $fenceEnabled = config('services.category.reference_fence_enabled', env('CATEGORY_REFERENCE_FENCE_ENABLED', false));
        if (! $fenceEnabled) {
            throw new HttpException(503, 'Protokol verifikasi referensi downstream belum aktif. Gunakan penonaktifan (deactivate).');
        }

        return DB::transaction(function () use ($actor, $subcategory, $reason) {
            $snapshot = $subcategory->toArray();
            $deletedId = $subcategory->id;

            $subcategory->delete();

            $audit = CategoryAuditLog::create([
                'id' => (string) Str::uuid(),
                'request_id' => request()->header('X-Request-Id'),
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'SUBCATEGORY_HARD_DELETED',
                'entity_type' => 'SUBCATEGORY',
                'entity_id' => $deletedId,
                'old_safe_snapshot' => $snapshot,
                'reason' => $reason,
                'occurred_at' => now(),
            ]);

            CategoryOutboxEvent::create([
                'id' => (string) Str::uuid(),
                'event_type' => 'category.subcategory.deleted.v1',
                'aggregate_type' => 'SUBCATEGORY',
                'aggregate_id' => $deletedId,
                'aggregate_version' => $subcategory->lock_version,
                'payload' => [
                    'subcategory_id' => $deletedId,
                    'deleted_at' => now()->toIso8601String(),
                ],
                'occurred_at' => now(),
            ]);

            return [
                'node_type' => 'SUBCATEGORY',
                'deleted_id' => $deletedId,
                'deleted_at' => now()->toIso8601String(),
                'audit_event_id' => $audit->id,
                'reference_guard_verified' => true,
            ];
        });
    }

    /**
     * R03: Submit Category Suggestion / Request
     */
    public function submitRequest(AuthenticatedActor $actor, array $data): array
    {
        $masterCode = strtoupper($data['master_code']);

        // Check actor branch entitlement (DEC-11)
        if (! $actor->canSuggestBranch($masterCode)) {
            throw new HttpException(403, "Peran Anda ({$actor->role}) tidak memiliki wewenang untuk mengajukan kategori pada cabang {$masterCode}.");
        }

        // DEC-09: Business roles (Merchant, Provider, Supplier) must have active organization context
        if (in_array($actor->role, ['MERCHANT', 'SERVICE_PROVIDER', 'SUPPLIER'], true) && empty($actor->organizationId)) {
            throw new HttpException(403, 'Aktor dengan peran Merchant/Provider/Supplier wajib memiliki organisasi yang valid untuk mengajukan saran kategori.');
        }

        $master = CategoryMaster::where('code', $masterCode)->first();
        if (! $master) {
            throw new HttpException(422, 'Master branch tidak valid.');
        }

        $requestType = strtoupper($data['request_type']);
        $proposedParentId = null;

        if ($requestType === 'SUBCATEGORY') {
            $parent = Category::find($data['proposed_parent_category_id'] ?? null);
            if (! $parent) {
                throw new HttpException(422, 'Parent Category tidak ditemukan.');
            }
            if ($parent->master_id !== $master->id) {
                throw new HttpException(422, 'Parent Category yang diajukan tidak cocok dengan cabang Master.');
            }
            $proposedParentId = $parent->id;
        }

        $normalizedName = CategoryNormalizer::normalize($data['suggested_name']);

        return DB::transaction(function () use ($actor, $master, $requestType, $proposedParentId, $data, $normalizedName) {
            $request = CategoryRequest::create([
                'id' => (string) Str::uuid(),
                'request_type' => $requestType,
                'master_id' => $master->id,
                'proposed_parent_category_id' => $proposedParentId,
                'requester_user_id' => $actor->id,
                'requester_role' => $actor->role,
                'requester_org_id' => $actor->organizationId,
                'suggested_name' => trim($data['suggested_name']),
                'normalized_suggested_name' => $normalizedName,
                'reason' => trim($data['reason']),
                'additional_information' => $data['additional_information'] ?? null,
                'status' => 'NEW',
                'lock_version' => 1,
            ]);

            CategoryAuditLog::create([
                'id' => (string) Str::uuid(),
                'request_id' => request()->header('X-Request-Id'),
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => 'CATEGORY_REQUEST_CREATED',
                'entity_type' => 'CATEGORY_REQUEST',
                'entity_id' => $request->id,
                'new_safe_snapshot' => $request->toArray(),
                'occurred_at' => now(),
            ]);

            CategoryOutboxEvent::create([
                'id' => (string) Str::uuid(),
                'event_type' => 'category.request.created.v1',
                'aggregate_type' => 'CATEGORY_REQUEST',
                'aggregate_id' => $request->id,
                'aggregate_version' => 1,
                'payload' => [
                    'request_id' => $request->id,
                    'request_type' => $requestType,
                    'master_code' => $master->code,
                    'status' => 'NEW',
                ],
                'occurred_at' => now(),
            ]);

            return [
                'id' => $request->id,
                'status' => 'NEW',
                'request_type' => $request->request_type,
                'master_code' => $master->code,
                'proposed_parent_category_id' => $request->proposed_parent_category_id,
                'suggested_name' => $request->suggested_name,
                'duplicate_of_request_id' => null,
                'lock_version' => $request->lock_version,
                'created_at' => $request->created_at?->toIso8601String(),
            ];
        });
    }

    /**
     * R01: List Category Requests
     */
    public function listRequests(AuthenticatedActor $actor, array $filters): array
    {
        $query = CategoryRequest::with(['master', 'proposedParent', 'fulfilledCategory', 'fulfilledSubcategory']);

        // Non-governance can only see their own requests (DEC-09)
        if (! $actor->isGovernance()) {
            $query->where('requester_user_id', $actor->id);
        } elseif (! empty($filters['requester_user_id'])) {
            $query->where('requester_user_id', $filters['requester_user_id']);
        }

        if (! empty($filters['status'])) {
            $query->where('status', strtoupper($filters['status']));
        }

        if (! empty($filters['request_type'])) {
            $query->where('request_type', strtoupper($filters['request_type']));
        }

        if (! empty($filters['master_code'])) {
            $query->whereHas('master', fn($q) => $q->where('code', strtoupper($filters['master_code'])));
        }

        $query->orderByDesc('created_at');
        $limit = min(100, max(1, (int) ($filters['limit'] ?? 20)));
        $paginated = $query->paginate($limit);

        $items = $paginated->getCollection()->map(function (CategoryRequest $r) {
            return [
                'id' => $r->id,
                'request_type' => $r->request_type,
                'master_code' => $r->master?->code,
                'proposed_parent_category_id' => $r->proposed_parent_category_id,
                'proposed_parent_name' => $r->proposedParent?->name,
                'suggested_name' => $r->suggested_name,
                'reason' => $r->reason,
                'additional_information' => $r->additional_information,
                'status' => $r->status,
                'duplicate_of_request_id' => $r->duplicate_of_request_id,
                'requester_user_id' => $r->requester_user_id,
                'requester_role' => $r->requester_role,
                'reviewer_user_id' => $r->reviewer_user_id,
                'review_reason' => $r->review_reason,
                'fulfilled_category_id' => $r->fulfilled_category_id,
                'fulfilled_subcategory_id' => $r->fulfilled_subcategory_id,
                'lock_version' => $r->lock_version,
                'reviewed_at' => $r->reviewed_at?->toIso8601String(),
                'created_at' => $r->created_at?->toIso8601String(),
            ];
        })->all();

        return [
            'items' => $items,
            'pagination' => [
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
            ],
        ];
    }

    /**
     * R02: Get Category Request Detail
     */
    public function getRequest(AuthenticatedActor $actor, string $id): array
    {
        $request = CategoryRequest::with(['master', 'proposedParent', 'fulfilledCategory', 'fulfilledSubcategory'])->find($id);

        if (! $request) {
            throw new HttpException(404, 'Pengajuan kategori tidak ditemukan.');
        }

        // Anti-IDOR: Non-governance actor cannot view other actors' requests
        if (! $actor->isGovernance() && $request->requester_user_id !== $actor->id) {
            throw new HttpException(404, 'Pengajuan kategori tidak ditemukan.');
        }

        return [
            'id' => $request->id,
            'request_type' => $request->request_type,
            'master_code' => $request->master?->code,
            'proposed_parent_category_id' => $request->proposed_parent_category_id,
            'proposed_parent_name' => $request->proposedParent?->name,
            'suggested_name' => $request->suggested_name,
            'reason' => $request->reason,
            'additional_information' => $request->additional_information,
            'status' => $request->status,
            'duplicate_of_request_id' => $request->duplicate_of_request_id,
            'requester_user_id' => $request->requester_user_id,
            'requester_role' => $request->requester_role,
            'reviewer_user_id' => $request->reviewer_user_id,
            'review_reason' => $request->review_reason,
            'fulfilled_node' => $request->fulfilled_category_id
                ? ['node_type' => 'CATEGORY', 'node_id' => $request->fulfilled_category_id, 'name' => $request->fulfilledCategory?->name]
                : ($request->fulfilled_subcategory_id
                    ? ['node_type' => 'SUBCATEGORY', 'node_id' => $request->fulfilled_subcategory_id, 'name' => $request->fulfilledSubcategory?->name]
                    : null),
            'lock_version' => $request->lock_version,
            'reviewed_at' => $request->reviewed_at?->toIso8601String(),
            'created_at' => $request->created_at?->toIso8601String(),
        ];
    }

    /**
     * R04: Review Category Suggestion / Request (Admin Operations)
     */
    public function reviewRequest(AuthenticatedActor $actor, string $id, array $data, ?int $expectedVersion = null): array
    {
        $request = CategoryRequest::with('master')->find($id);
        if (! $request) {
            throw new HttpException(404, 'Pengajuan kategori tidak ditemukan.');
        }

        if ($expectedVersion !== null && $request->lock_version !== $expectedVersion) {
            throw new HttpException(409, 'Versi pengajuan sudah berubah. Muat ulang data terbaru.');
        }

        $toStatus = strtoupper($data['to_status']);
        $currentStatus = $request->status;

        // Valid transitions: NEW -> PROCESSING, NEW -> APPROVED, NEW -> REJECTED, PROCESSING -> APPROVED, PROCESSING -> REJECTED, PROCESSING -> FULFILLED, APPROVED -> FULFILLED, APPROVED -> REJECTED
        $allowedTransitions = [
            'NEW' => ['PROCESSING', 'APPROVED', 'REJECTED'],
            'PROCESSING' => ['APPROVED', 'REJECTED', 'FULFILLED'],
            'APPROVED' => ['FULFILLED', 'REJECTED', 'PROCESSING'],
        ];

        if (! isset($allowedTransitions[$currentStatus]) || ! in_array($toStatus, $allowedTransitions[$currentStatus], true)) {
            throw new HttpException(409, "Transisi status pengajuan dari {$currentStatus} ke {$toStatus} tidak diizinkan.");
        }

        $fulfilledCategoryId = null;
        $fulfilledSubcategoryId = null;

        if ($toStatus === 'FULFILLED') {
            $node = $data['fulfilled_node'] ?? [];
            $nodeType = strtoupper($node['node_type'] ?? '');
            $nodeId = $node['node_id'] ?? '';

            if ($request->request_type === 'CATEGORY') {
                if ($nodeType !== 'CATEGORY') {
                    throw new HttpException(422, 'Target fulfillment node_type harus CATEGORY.');
                }
                $targetCat = Category::find($nodeId);
                if (! $targetCat || $targetCat->master_id !== $request->master_id) {
                    throw new HttpException(422, 'Target Category tidak ditemukan atau cabang Master tidak cocok.');
                }
                $fulfilledCategoryId = $targetCat->id;
            } elseif ($request->request_type === 'SUBCATEGORY') {
                if ($nodeType !== 'SUBCATEGORY') {
                    throw new HttpException(422, 'Target fulfillment node_type harus SUBCATEGORY.');
                }
                $targetSub = Subcategory::with('category')->find($nodeId);
                if (! $targetSub || $targetSub->category?->master_id !== $request->master_id) {
                    throw new HttpException(422, 'Target Subcategory tidak ditemukan atau cabang Master tidak cocok.');
                }
                $fulfilledSubcategoryId = $targetSub->id;
            }
        }

        $duplicateOfId = null;
        if (! empty($data['duplicate_of_request_id'])) {
            if ($data['duplicate_of_request_id'] === $request->id) {
                throw new HttpException(422, 'Pengajuan tidak dapat ditandai sebagai duplikat dari dirinya sendiri.');
            }

            $targetDuplicate = CategoryRequest::find($data['duplicate_of_request_id']);
            if (! $targetDuplicate) {
                throw new HttpException(422, 'Pengajuan target duplikat tidak ditemukan.');
            }

            // Circular link prevention (DEC-08): check direct or chained back-reference
            if ($targetDuplicate->duplicate_of_request_id === $request->id) {
                throw new HttpException(422, 'Tautan duplikat sirkular tidak diizinkan.');
            }

            // Master branch mismatch prevention (DEC-08)
            if ($targetDuplicate->master_id !== $request->master_id) {
                throw new HttpException(422, 'Tautan duplikat antar cabang master yang berbeda tidak diizinkan.');
            }

            // Request type mismatch prevention
            if ($targetDuplicate->request_type !== $request->request_type) {
                throw new HttpException(422, 'Tautan duplikat antar tipe pengajuan yang berbeda tidak diizinkan.');
            }

            $duplicateOfId = $targetDuplicate->id;
        }

        return DB::transaction(function () use ($actor, $request, $toStatus, $data, $fulfilledCategoryId, $fulfilledSubcategoryId, $duplicateOfId) {
            $request->status = $toStatus;
            $request->reviewer_user_id = $actor->id;
            $request->review_reason = $data['review_reason'] ?? null;
            $request->reviewed_at = now();
            $request->lock_version += 1;

            if ($duplicateOfId) {
                $request->duplicate_of_request_id = $duplicateOfId;
            }
            if ($fulfilledCategoryId) {
                $request->fulfilled_category_id = $fulfilledCategoryId;
            }
            if ($fulfilledSubcategoryId) {
                $request->fulfilled_subcategory_id = $fulfilledSubcategoryId;
            }

            $request->save();

            CategoryAuditLog::create([
                'id' => (string) Str::uuid(),
                'request_id' => request()->header('X-Request-Id'),
                'actor_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'actor_org_id' => $actor->organizationId,
                'action' => "CATEGORY_REQUEST_{$toStatus}",
                'entity_type' => 'CATEGORY_REQUEST',
                'entity_id' => $request->id,
                'new_safe_snapshot' => $request->toArray(),
                'reason' => $request->review_reason,
                'occurred_at' => now(),
            ]);

            CategoryOutboxEvent::create([
                'id' => (string) Str::uuid(),
                'event_type' => 'category.request.reviewed.v1',
                'aggregate_type' => 'CATEGORY_REQUEST',
                'aggregate_id' => $request->id,
                'aggregate_version' => $request->lock_version,
                'payload' => [
                    'request_id' => $request->id,
                    'status' => $toStatus,
                    'fulfilled_node_id' => $fulfilledCategoryId ?: $fulfilledSubcategoryId,
                    'reviewer_user_id' => $actor->id,
                ],
                'occurred_at' => now(),
            ]);

            return [
                'id' => $request->id,
                'status' => $request->status,
                'review_reason' => $request->review_reason,
                'reviewer_user_id' => $request->reviewer_user_id,
                'reviewed_at' => $request->reviewed_at?->toIso8601String(),
                'lock_version' => $request->lock_version,
                'fulfilled_node' => $fulfilledCategoryId
                    ? ['node_type' => 'CATEGORY', 'node_id' => $fulfilledCategoryId]
                    : ($fulfilledSubcategoryId
                        ? ['node_type' => 'SUBCATEGORY', 'node_id' => $fulfilledSubcategoryId]
                        : null),
            ];
        });
    }

    /**
     * A01: Get Category Audit Logs
     */
    public function listAuditLogs(AuthenticatedActor $actor, array $filters): array
    {
        $query = CategoryAuditLog::query();

        if (! empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (! empty($filters['entity_type'])) {
            $query->where('entity_type', strtoupper($filters['entity_type']));
        }

        if (! empty($filters['entity_id'])) {
            $query->where('entity_id', $filters['entity_id']);
        }

        if (! empty($filters['actor_user_id'])) {
            $query->where('actor_user_id', $filters['actor_user_id']);
        }

        $query->orderByDesc('occurred_at');
        $limit = min(100, max(1, (int) ($filters['limit'] ?? 20)));
        $paginated = $query->paginate($limit);

        return [
            'items' => $paginated->items(),
            'pagination' => [
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
            ],
        ];
    }

    /**
     * I01: Internal Eligibility Check
     */
    public function checkEligibility(string $nodeType, string $nodeId, string $operation = 'NEW_ASSIGNMENT'): array
    {
        $nodeType = strtoupper($nodeType);

        if ($nodeType === 'CATEGORY') {
            $cat = Category::with('master')->find($nodeId);
            if (! $cat) {
                return [
                    'exists' => false,
                    'node_type' => 'CATEGORY',
                    'node_id' => $nodeId,
                    'effective_active' => false,
                ];
            }

            return [
                'exists' => true,
                'node_type' => 'CATEGORY',
                'node_id' => $cat->id,
                'master_code' => $cat->master?->code,
                'stored_status' => $cat->status,
                'effective_active' => $cat->effective_active,
                'eligibility_version' => $cat->lock_version,
                'claim_required_for_safe_reference' => true,
            ];
        }

        if ($nodeType === 'SUBCATEGORY') {
            $sub = Subcategory::with('category.master')->find($nodeId);
            if (! $sub) {
                return [
                    'exists' => false,
                    'node_type' => 'SUBCATEGORY',
                    'node_id' => $nodeId,
                    'effective_active' => false,
                ];
            }

            return [
                'exists' => true,
                'node_type' => 'SUBCATEGORY',
                'node_id' => $sub->id,
                'master_code' => $sub->category?->master?->code,
                'stored_status' => $sub->status,
                'effective_active' => $sub->effective_active,
                'eligibility_version' => $sub->lock_version,
                'claim_required_for_safe_reference' => true,
            ];
        }

        throw new HttpException(422, 'Jenis node tidak valid.');
    }
}
