<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CategoryMaster;
use App\Models\Subcategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class CategoryStatusAndEligibilityFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected array $adminHeaders;
    protected array $customerHeaders;
    protected array $ceoHeaders;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
        ];
        $this->customerHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'CUSTOMER',
        ];
        $this->ceoHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'CEO_PRODUCT_OWNER',
        ];
    }

    public function test_deactivate_parent_preserves_stored_child_status_but_effective_active_becomes_false(): void
    {
        // DEC-03 & EC-010: Parent INACTIVE membuat turunannya tidak eligible untuk pemakaian baru, tanpa mengubah stored status child
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Kategori Hardware',
            'normalized_name' => 'kategori hardware',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $subcategory = Subcategory::create([
            'id' => (string) Str::uuid(),
            'category_id' => $category->id,
            'name' => 'Sub Hardware',
            'normalized_name' => 'sub hardware',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // Admin deactivates parent category
        $response = $this->withHeaders(array_merge($this->adminHeaders, [
            'If-Match' => '1',
        ]))->patchJson("/api/v1/categories/{$category->id}/status", [
            'status' => 'INACTIVE',
            'reason' => 'Tidak dipakai lagi',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $category->id,
                    'status' => 'INACTIVE',
                    'children_updated' => 0, // Children status NOT cascaded
                ],
            ]);

        // Verify stored status of child is STILL 'ACTIVE' in database
        $subcategory->refresh();
        $this->assertEquals('ACTIVE', $subcategory->status, 'Stored status subcategory tetap ACTIVE');

        // But effective_active must be FALSE!
        $this->assertFalse($subcategory->effective_active, 'Effective active subcategory harus false ketika parent INACTIVE');
    }

    public function test_cannot_activate_subcategory_if_parent_is_inactive(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $inactiveCategory = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Parent Inaktif',
            'normalized_name' => 'parent inaktif',
            'status' => 'INACTIVE',
            'lock_version' => 1,
        ]);

        $subcategory = Subcategory::create([
            'id' => (string) Str::uuid(),
            'category_id' => $inactiveCategory->id,
            'name' => 'Sub Inaktif',
            'normalized_name' => 'sub inaktif',
            'status' => 'INACTIVE',
            'lock_version' => 1,
        ]);

        $response = $this->withHeaders(array_merge($this->adminHeaders, [
            'If-Match' => '1',
        ]))->patchJson("/api/v1/subcategories/{$subcategory->id}/status", [
            'status' => 'ACTIVE',
        ]);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_non_governance_cannot_view_inactive_nodes(): void
    {
        // DEC-10: Node INACTIVE terbaca hanya bagi Admin/CEO yang berwenang
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $inactiveCategory = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Kategori Tersembunyi',
            'normalized_name' => 'kategori tersembunyi',
            'status' => 'INACTIVE',
            'lock_version' => 1,
        ]);

        // Customer attempts to get detail directly
        $response = $this->withHeaders($this->customerHeaders)->getJson("/api/v1/categories/{$inactiveCategory->id}");
        $response->assertStatus(404);

        // Admin can view it
        $adminResponse = $this->withHeaders($this->adminHeaders)->getJson("/api/v1/categories/{$inactiveCategory->id}");
        $adminResponse->assertStatus(200);

        // CEO can view it
        $ceoResponse = $this->withHeaders($this->ceoHeaders)->getJson("/api/v1/categories/{$inactiveCategory->id}");
        $ceoResponse->assertStatus(200);
    }
}
