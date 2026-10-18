<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CategoryMaster;
use App\Models\Subcategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class CategoryHardDeleteGuardsFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected array $adminHeaders;
    protected array $customerHeaders;

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
    }

    public function test_cannot_hard_delete_category_with_children(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Kategori Parent',
            'normalized_name' => 'kategori parent',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        Subcategory::create([
            'id' => (string) Str::uuid(),
            'category_id' => $category->id,
            'name' => 'Anak Sub',
            'normalized_name' => 'anak sub',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $response = $this->withHeaders(array_merge($this->adminHeaders, [
            'If-Match' => '1',
        ]))->deleteJson("/api/v1/categories/{$category->id}", [
            'reason' => 'Ingin hapus parent',
        ]);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_cannot_hard_delete_when_verification_protocol_is_unavailable_fail_closed(): void
    {
        // Section 07.3 / DEC-05: Fail-closed 503 if verification barrier is not adopted yet
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Kategori Tanpa Anak',
            'normalized_name' => 'kategori tanpa anak',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // Config default: CATEGORY_REFERENCE_FENCE_ENABLED=false
        $response = $this->withHeaders(array_merge($this->adminHeaders, [
            'If-Match' => '1',
        ]))->deleteJson("/api/v1/categories/{$category->id}", [
            'reason' => 'Mau hapus',
        ]);

        $response->assertStatus(503)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_REFERENCE_VERIFICATION_UNAVAILABLE',
            ]);
    }

    public function test_non_admin_cannot_hard_delete(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Kategori Protected',
            'normalized_name' => 'kategori protected',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $response = $this->withHeaders(array_merge($this->customerHeaders, [
            'If-Match' => '1',
        ]))->deleteJson("/api/v1/categories/{$category->id}", [
            'reason' => 'Bypass attempt',
        ]);

        $response->assertStatus(403);
    }
}
