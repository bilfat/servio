<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CategoryMaster;
use App\Models\Subcategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class SubcategoryCrudFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected array $adminHeaders;
    protected Category $activeCategory;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
        ];

        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $this->activeCategory = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Elektronik Utama',
            'normalized_name' => 'elektronik utama',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);
    }

    public function test_admin_can_create_subcategory_under_active_category(): void
    {
        // BR-SUB-001..004 & DEC-04: Default ACTIVE
        $response = $this->withHeaders($this->adminHeaders)->postJson('/api/v1/subcategories', [
            'category_id' => $this->activeCategory->id,
            'name' => 'Peralatan Pendingin',
            'description' => 'AC dan kipas angin',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'SUBCATEGORY_CREATED',
                'data' => [
                    'category_id' => $this->activeCategory->id,
                    'name' => 'Peralatan Pendingin',
                    'status' => 'ACTIVE',
                    'effective_active' => true,
                    'lock_version' => 1,
                ],
            ]);

        $this->assertDatabaseHas('subcategories', [
            'category_id' => $this->activeCategory->id,
            'normalized_name' => 'peralatan pendingin',
            'status' => 'ACTIVE',
        ]);
    }

    public function test_cannot_create_subcategory_without_category(): void
    {
        // EC-002: Subcategory tanpa Category
        $response = $this->withHeaders($this->adminHeaders)->postJson('/api/v1/subcategories', [
            'category_id' => (string) Str::uuid(),
            'name' => 'Subcategory Tanpa Parent',
        ]);

        $response->assertStatus(422);
    }

    public function test_cannot_create_subcategory_under_inactive_category(): void
    {
        // EC-005: Parent inactive tidak boleh menerima child baru
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $inactiveCategory = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Kategori Nonaktif',
            'normalized_name' => 'kategori nonaktif',
            'status' => 'INACTIVE',
            'lock_version' => 1,
        ]);

        $response = $this->withHeaders($this->adminHeaders)->postJson('/api/v1/subcategories', [
            'category_id' => $inactiveCategory->id,
            'name' => 'Child Baru',
        ]);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_cannot_create_duplicate_subcategory_under_same_category(): void
    {
        // BR-SUB-005 & EC-004: Duplicate Subcategory pada parent yang sama dilarang
        Subcategory::create([
            'id' => (string) Str::uuid(),
            'category_id' => $this->activeCategory->id,
            'name' => 'Aksesoris Komputer',
            'normalized_name' => 'aksesoris komputer',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $response = $this->withHeaders($this->adminHeaders)->postJson('/api/v1/subcategories', [
            'category_id' => $this->activeCategory->id,
            'name' => '  AKSESORIS   KOMPUTER  ',
        ]);

        $response->assertStatus(409);
    }

    public function test_reparent_attempt_is_rejected_on_subcategory_update(): void
    {
        // DEC-02: Parent immutable
        $sub = Subcategory::create([
            'id' => (string) Str::uuid(),
            'category_id' => $this->activeCategory->id,
            'name' => 'Original Sub',
            'normalized_name' => 'original sub',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $response = $this->withHeaders(array_merge($this->adminHeaders, [
            'If-Match' => '1',
        ]))->patchJson("/api/v1/subcategories/{$sub->id}", [
            'category_id' => (string) Str::uuid(),
            'name' => 'Trying to reparent',
        ]);

        $response->assertStatus(422);
    }
}
