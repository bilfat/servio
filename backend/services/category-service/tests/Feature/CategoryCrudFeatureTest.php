<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CategoryMaster;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class CategoryCrudFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected array $adminHeaders;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
        ];
    }

    public function test_admin_can_create_category(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $response = $this->withHeaders($this->adminHeaders)->postJson('/api/v1/categories', [
            'master_id' => $master->id,
            'name' => 'Elektronik & Gadget',
            'description' => 'Perangkat elektronik dan aksesoris',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_CREATED',
                'data' => [
                    'master_id' => $master->id,
                    'master_code' => 'PRODUK',
                    'name' => 'Elektronik & Gadget',
                    'status' => 'ACTIVE',
                    'effective_active' => true,
                    'lock_version' => 1,
                ],
            ]);

        $this->assertDatabaseHas('categories', [
            'master_id' => $master->id,
            'normalized_name' => 'elektronik & gadget',
        ]);

        $this->assertDatabaseHas('category_audit_logs', [
            'action' => 'CATEGORY_CREATED',
            'entity_type' => 'CATEGORY',
        ]);
    }

    public function test_cannot_create_category_without_master(): void
    {
        // EC-001: Category tanpa parent master
        $response = $this->withHeaders($this->adminHeaders)->postJson('/api/v1/categories', [
            'master_id' => (string) Str::uuid(), // non-existent
            'name' => 'Kategori Yatim',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_VALIDATION_FAILED',
            ]);
    }

    public function test_cannot_create_duplicate_category_under_same_master(): void
    {
        // BR-CAT-005, EC-003, EC-012: Duplicate normalization
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Elektronik',
            'normalized_name' => 'elektronik',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // Attempt creation with whitespace and case variation
        $response = $this->withHeaders($this->adminHeaders)->postJson('/api/v1/categories', [
            'master_id' => $master->id,
            'name' => '  ELEKTRONIK   ',
        ]);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_same_category_name_allowed_under_different_master(): void
    {
        // BR-CAT-006: Nama sama pada branch master berbeda diperbolehkan
        $masterProduk = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $masterJasa = CategoryMaster::where('code', 'JASA')->firstOrFail();

        Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $masterProduk->id,
            'name' => 'Otomotif',
            'normalized_name' => 'otomotif',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $response = $this->withHeaders($this->adminHeaders)->postJson('/api/v1/categories', [
            'master_id' => $masterJasa->id,
            'name' => 'Otomotif',
        ]);

        $response->assertStatus(201);
    }

    public function test_admin_can_update_category_name_and_description(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Elektronik Lama',
            'normalized_name' => 'elektronik lama',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $response = $this->withHeaders(array_merge($this->adminHeaders, [
            'If-Match' => '1',
        ]))->patchJson("/api/v1/categories/{$category->id}", [
            'name' => 'Elektronik Baru',
            'description' => 'Deskripsi baru',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_UPDATED',
                'data' => [
                    'name' => 'Elektronik Baru',
                    'lock_version' => 2,
                ],
            ]);
    }

    public function test_reparent_attempt_is_rejected_on_update(): void
    {
        // DEC-02: Perubahan parent Category dilarang setelah pembuatan
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $otherMaster = CategoryMaster::where('code', 'JASA')->firstOrFail();

        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Fixed Category',
            'normalized_name' => 'fixed category',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $response = $this->withHeaders(array_merge($this->adminHeaders, [
            'If-Match' => '1',
        ]))->patchJson("/api/v1/categories/{$category->id}", [
            'master_id' => $otherMaster->id,
            'name' => 'Trying to reparent',
        ]);

        $response->assertStatus(422);
    }

    public function test_missing_if_match_header_returns_428(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Precondition Test',
            'normalized_name' => 'precondition test',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // Missing If-Match header
        $response = $this->withHeaders($this->adminHeaders)->patchJson("/api/v1/categories/{$category->id}", [
            'name' => 'Updated without match header',
        ]);

        $response->assertStatus(428);
    }

    public function test_stale_lock_version_returns_409_version_conflict(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Concurrency Test',
            'normalized_name' => 'concurrency test',
            'status' => 'ACTIVE',
            'lock_version' => 2,
        ]);

        // Client sends stale version 1
        $response = $this->withHeaders(array_merge($this->adminHeaders, [
            'If-Match' => '1',
        ]))->patchJson("/api/v1/categories/{$category->id}", [
            'name' => 'Trying with stale version',
        ]);

        $response->assertStatus(409);
    }
}
