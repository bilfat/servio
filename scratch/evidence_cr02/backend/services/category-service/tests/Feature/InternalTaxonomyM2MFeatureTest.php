<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CategoryMaster;
use App\Models\Subcategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class InternalTaxonomyM2MFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected array $internalHeaders;

    protected function setUp(): void
    {
        parent::setUp();
        $this->internalHeaders = [
            'X-Internal-Service-Key' => env('CATEGORY_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'),
        ];
    }

    public function test_internal_endpoint_without_key_returns_403(): void
    {
        $response = $this->postJson('/internal/v1/taxonomy/eligibility/check', [
            'node_type' => 'CATEGORY',
            'node_id' => (string) Str::uuid(),
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_INTERNAL_AUTH_FAILED',
            ]);
    }

    public function test_internal_endpoint_with_invalid_key_returns_403(): void
    {
        $response = $this->withHeaders([
            'X-Internal-Service-Key' => 'invalid_service_key_xyz',
        ])->postJson('/internal/v1/taxonomy/eligibility/check', [
            'node_type' => 'CATEGORY',
            'node_id' => (string) Str::uuid(),
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_INTERNAL_AUTH_FAILED',
            ]);
    }

    public function test_internal_eligibility_check_returns_valid_contract(): void
    {
        // I01: POST /internal/v1/taxonomy/eligibility/check
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Kategori Eligibel',
            'normalized_name' => 'kategori eligibel',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $subcategory = Subcategory::create([
            'id' => (string) Str::uuid(),
            'category_id' => $category->id,
            'name' => 'Sub Eligibel',
            'normalized_name' => 'sub eligibel',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // Check Category eligibility
        $respCat = $this->withHeaders($this->internalHeaders)->postJson('/internal/v1/taxonomy/eligibility/check', [
            'node_type' => 'CATEGORY',
            'node_id' => $category->id,
        ]);

        $respCat->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_ELIGIBILITY_CHECKED',
                'data' => [
                    'exists' => true,
                    'node_type' => 'CATEGORY',
                    'node_id' => $category->id,
                    'master_code' => 'PRODUK',
                    'stored_status' => 'ACTIVE',
                    'effective_active' => true,
                    'claim_required_for_safe_reference' => true,
                ],
            ]);

        // Check Subcategory eligibility
        $respSub = $this->withHeaders($this->internalHeaders)->postJson('/internal/v1/taxonomy/eligibility/check', [
            'node_type' => 'SUBCATEGORY',
            'node_id' => $subcategory->id,
        ]);

        $respSub->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_ELIGIBILITY_CHECKED',
                'data' => [
                    'exists' => true,
                    'node_type' => 'SUBCATEGORY',
                    'node_id' => $subcategory->id,
                    'master_code' => 'PRODUK',
                    'stored_status' => 'ACTIVE',
                    'effective_active' => true,
                ],
            ]);
    }

    public function test_i02_get_masters_returns_canonical_masters(): void
    {
        // I02: GET /internal/v1/taxonomy/masters
        $response = $this->withHeaders($this->internalHeaders)->getJson('/internal/v1/taxonomy/masters');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'INTERNAL_MASTERS_LOADED',
            ]);

        $masters = $response->json('data.masters');
        $this->assertCount(2, $masters);
        $codes = array_column($masters, 'code');
        $this->assertContains('PRODUK', $codes);
        $this->assertContains('JASA', $codes);
    }

    public function test_i03_get_tree_returns_hierarchy(): void
    {
        // I03: GET /internal/v1/taxonomy/tree
        $response = $this->withHeaders($this->internalHeaders)->getJson('/internal/v1/taxonomy/tree');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'INTERNAL_TREE_LOADED',
            ]);

        $tree = $response->json('data.tree');
        $this->assertIsArray($tree);
    }

    public function test_internal_reference_claim_registration_and_retrieval(): void
    {
        // I04 & I05
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Kategori Klaim',
            'normalized_name' => 'kategori klaim',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // 1. Register claim (I04)
        $respStore = $this->withHeaders($this->internalHeaders)->postJson('/internal/v1/taxonomy/reference-claims', [
            'consumer_service' => 'product-service',
            'consumer_reference_id' => 'prod-item-1234',
            'node_type' => 'CATEGORY',
            'node_id' => $category->id,
        ]);

        $respStore->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_REFERENCE_CLAIM_REGISTERED',
                'data' => [
                    'node_type' => 'CATEGORY',
                    'node_id' => $category->id,
                    'state' => 'ACTIVE',
                ],
            ]);

        $claimId = $respStore->json('data.claim_id');

        // 2. Retrieve claim (I05)
        $respGet = $this->withHeaders($this->internalHeaders)->getJson("/internal/v1/taxonomy/reference-claims/{$claimId}");
        $respGet->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_CLAIM_LOADED',
                'data' => [
                    'id' => $claimId,
                    'consumer_service' => 'product-service',
                    'consumer_reference_id' => 'prod-item-1234',
                ],
            ]);

        // 3. Re-register same claim (upsert) -> preserves existing primary key 'id'
        $respReStore = $this->withHeaders($this->internalHeaders)->postJson('/internal/v1/taxonomy/reference-claims', [
            'consumer_service' => 'product-service',
            'consumer_reference_id' => 'prod-item-1234',
            'node_type' => 'CATEGORY',
            'node_id' => $category->id,
        ]);

        $respReStore->assertStatus(201);
        $this->assertEquals($claimId, $respReStore->json('data.claim_id'), 'Upsert must not mutate primary key claim id');
    }

    public function test_i04_unauthorized_consumer_service_is_rejected(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Kategori Klaim Reject',
            'normalized_name' => 'kategori klaim reject',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $response = $this->withHeaders($this->internalHeaders)->postJson('/internal/v1/taxonomy/reference-claims', [
            'consumer_service' => 'unknown-malicious-service',
            'consumer_reference_id' => 'malicious-123',
            'node_type' => 'CATEGORY',
            'node_id' => $category->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_i06_prepare_reference_check_creates_and_increments_generation(): void
    {
        // I06: POST /internal/v1/taxonomy/reference-checks/prepare
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Kategori Guard Test',
            'normalized_name' => 'kategori guard test',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // First call -> Initial generation = 1
        $firstResp = $this->withHeaders($this->internalHeaders)->postJson('/internal/v1/taxonomy/reference-checks/prepare', [
            'node_type' => 'CATEGORY',
            'node_id' => $category->id,
        ]);

        $firstResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_REFERENCE_FENCE_PREPARED',
                'data' => [
                    'node_type' => 'CATEGORY',
                    'node_id' => $category->id,
                    'fence_generation' => 1,
                ],
            ]);

        $guardId = $firstResp->json('data.guard_id');

        // Second call -> Generation incremented to 2, primary key id preserved
        $secondResp = $this->withHeaders($this->internalHeaders)->postJson('/internal/v1/taxonomy/reference-checks/prepare', [
            'node_type' => 'CATEGORY',
            'node_id' => $category->id,
        ]);

        $secondResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_REFERENCE_FENCE_PREPARED',
                'data' => [
                    'guard_id' => $guardId,
                    'node_type' => 'CATEGORY',
                    'node_id' => $category->id,
                    'fence_generation' => 2,
                ],
            ]);
    }

    public function test_i06_prepare_reference_check_fails_on_non_existent_node(): void
    {
        $response = $this->withHeaders($this->internalHeaders)->postJson('/internal/v1/taxonomy/reference-checks/prepare', [
            'node_type' => 'CATEGORY',
            'node_id' => (string) Str::uuid(),
        ]);

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_NODE_NOT_FOUND',
            ]);
    }
}
