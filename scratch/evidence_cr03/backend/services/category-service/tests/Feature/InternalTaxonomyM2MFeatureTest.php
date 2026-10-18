<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CategoryDeleteGuard;
use App\Models\CategoryMaster;
use App\Models\Subcategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
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
            'X-Consumer-Service' => 'product-service',
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
            'X-Consumer-Service' => 'product-service',
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

        // 1. Register claim (I04) with matching consumer service header
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

    public function test_i04_missing_consumer_service_header_returns_403(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Kategori No Header',
            'normalized_name' => 'kategori no header',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // Without X-Consumer-Service header
        $headersWithoutConsumer = [
            'X-Internal-Service-Key' => env('CATEGORY_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'),
        ];

        $response = $this->withHeaders($headersWithoutConsumer)->postJson('/internal/v1/taxonomy/reference-claims', [
            'consumer_service' => 'product-service',
            'consumer_reference_id' => 'prod-item-999',
            'node_type' => 'CATEGORY',
            'node_id' => $category->id,
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_INTERNAL_CALLER_REQUIRED',
            ]);
    }

    public function test_i04_consumer_impersonation_returns_403(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Kategori Impersonate',
            'normalized_name' => 'kategori impersonate',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // Caller claims to be order-service in header, but attempts to register claim as product-service in body
        $impersonationHeaders = [
            'X-Internal-Service-Key' => env('CATEGORY_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'),
            'X-Consumer-Service' => 'order-service',
        ];

        $response = $this->withHeaders($impersonationHeaders)->postJson('/internal/v1/taxonomy/reference-claims', [
            'consumer_service' => 'product-service',
            'consumer_reference_id' => 'prod-item-impersonate',
            'node_type' => 'CATEGORY',
            'node_id' => $category->id,
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_CONSUMER_IMPERSONATION_DENIED',
            ]);
    }

    public function test_i04_unauthorized_consumer_service_header_returns_403(): void
    {
        $unauthorizedHeaders = [
            'X-Internal-Service-Key' => env('CATEGORY_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'),
            'X-Consumer-Service' => 'malicious-unregistered-service',
        ];

        $response = $this->withHeaders($unauthorizedHeaders)->postJson('/internal/v1/taxonomy/reference-claims', [
            'consumer_service' => 'malicious-unregistered-service',
            'consumer_reference_id' => 'malicious-123',
            'node_type' => 'CATEGORY',
            'node_id' => (string) Str::uuid(),
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_INTERNAL_CALLER_UNAUTHORIZED',
            ]);
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

        // Third call -> Generation incremented to 3
        $thirdResp = $this->withHeaders($this->internalHeaders)->postJson('/internal/v1/taxonomy/reference-checks/prepare', [
            'node_type' => 'CATEGORY',
            'node_id' => $category->id,
        ]);

        $thirdResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_REFERENCE_FENCE_PREPARED',
                'data' => [
                    'guard_id' => $guardId,
                    'node_type' => 'CATEGORY',
                    'node_id' => $category->id,
                    'fence_generation' => 3,
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

    public function test_i06_fence_generation_monotonically_increments_without_lost_updates(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $category = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Kategori Monotonic Test',
            'normalized_name' => 'kategori monotonic test',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $initialGuardId = null;

        for ($i = 1; $i <= 5; $i++) {
            $resp = $this->withHeaders($this->internalHeaders)->postJson('/internal/v1/taxonomy/reference-checks/prepare', [
                'node_type' => 'CATEGORY',
                'node_id' => $category->id,
            ]);

            $resp->assertStatus(200);
            $this->assertEquals($i, $resp->json('data.fence_generation'));

            if ($initialGuardId === null) {
                $initialGuardId = $resp->json('data.guard_id');
            } else {
                $this->assertEquals($initialGuardId, $resp->json('data.guard_id'), 'Guard UUID must remain stable across generations');
            }
        }

        $this->assertEquals(5, CategoryDeleteGuard::where('node_id', $category->id)->value('fence_generation'));
    }
}

