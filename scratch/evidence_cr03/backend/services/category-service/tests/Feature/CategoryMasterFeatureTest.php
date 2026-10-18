<?php

namespace Tests\Feature;

use App\Models\CategoryMaster;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class CategoryMasterFeatureTest extends TestCase
{
    use DatabaseTransactions;

    public function test_exactly_two_master_roots_exist(): void
    {
        $masters = CategoryMaster::all();

        $this->assertCount(2, $masters, 'BR-MASTER-001: Master Category hanya boleh tepat dua (PRODUK dan JASA).');
        $codes = $masters->pluck('code')->sort()->values()->all();
        $this->assertEquals(['JASA', 'PRODUK'], $codes);
    }

    public function test_get_category_masters_endpoint_returns_success(): void
    {
        $response = $this->getJson('/api/v1/category-masters');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_MASTERS_LOADED',
            ])
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'code', 'name', 'status', 'sort_order', 'accessible'],
                ],
                'meta' => ['request_id', 'version'],
            ]);

        $this->assertCount(2, $response->json('data'));
    }

    public function test_admin_cannot_create_master_category_via_crud(): void
    {
        // BR-MASTER-002: There is no POST route for category-masters
        $response = $this->postJson('/api/v1/category-masters', [
            'code' => 'KENDARAAN',
            'name' => 'Kendaraan',
        ]);

        $response->assertStatus(405); // Method Not Allowed
    }
}
