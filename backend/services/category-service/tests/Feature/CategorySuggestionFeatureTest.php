<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CategoryMaster;
use App\Models\CategoryRequest;
use App\Models\Subcategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class CategorySuggestionFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected array $adminHeaders;
    protected array $merchantHeaders;
    protected array $providerHeaders;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
        ];
        $this->merchantHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'MERCHANT',
            'X-Actor-Org-Id' => (string) Str::uuid(),
        ];
        $this->providerHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'SERVICE_PROVIDER',
            'X-Actor-Org-Id' => (string) Str::uuid(),
        ];
    }

    public function test_merchant_can_submit_produk_suggestion_but_not_jasa(): void
    {
        // DEC-11: Merchant can read PRODUK+JASA, but suggestion PRODUK only
        $responseSuccess = $this->withHeaders($this->merchantHeaders)->postJson('/api/v1/category-requests', [
            'request_type' => 'CATEGORY',
            'master_code' => 'PRODUK',
            'suggested_name' => 'Alat Perkakas Listrik',
            'reason' => 'Banyak permintaan perkakas listrik',
        ]);

        $responseSuccess->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_REQUEST_CREATED',
                'data' => [
                    'status' => 'NEW',
                    'master_code' => 'PRODUK',
                ],
            ]);

        // Attempt submit JASA suggestion by Merchant -> must be denied (403)
        $responseDenied = $this->withHeaders($this->merchantHeaders)->postJson('/api/v1/category-requests', [
            'request_type' => 'CATEGORY',
            'master_code' => 'JASA',
            'suggested_name' => 'Layanan Pemasangan',
            'reason' => 'Ingin pasang',
        ]);

        $responseDenied->assertStatus(403);
    }

    public function test_provider_can_submit_jasa_suggestion_but_not_produk(): void
    {
        // DEC-11: Provider suggest JASA only
        $responseSuccess = $this->withHeaders($this->providerHeaders)->postJson('/api/v1/category-requests', [
            'request_type' => 'CATEGORY',
            'master_code' => 'JASA',
            'suggested_name' => 'Instalasi Pipa & Saluran',
            'reason' => 'Kategori instalasi belum ada',
        ]);

        $responseSuccess->assertStatus(201);

        // Attempt submit PRODUK suggestion by Provider -> must be denied (403)
        $responseDenied = $this->withHeaders($this->providerHeaders)->postJson('/api/v1/category-requests', [
            'request_type' => 'CATEGORY',
            'master_code' => 'PRODUK',
            'suggested_name' => 'Sparepart Pipa',
            'reason' => 'Perlu sparepart',
        ]);

        $responseDenied->assertStatus(403);
    }

    public function test_suggestion_submission_does_not_create_official_category(): void
    {
        // BR-REQ-001..004 & EC-008: Request tidak pernah auto-create category
        $this->withHeaders($this->merchantHeaders)->postJson('/api/v1/category-requests', [
            'request_type' => 'CATEGORY',
            'master_code' => 'PRODUK',
            'suggested_name' => 'Robotika & Drone',
            'reason' => 'Teknologi baru',
        ]);

        $this->assertDatabaseMissing('categories', [
            'normalized_name' => 'robotika & drone',
        ]);

        $this->assertDatabaseHas('category_requests', [
            'normalized_suggested_name' => 'robotika & drone',
            'status' => 'NEW',
        ]);
    }

    public function test_admin_can_review_and_move_request_to_processing_then_reject(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $request = CategoryRequest::create([
            'id' => (string) Str::uuid(),
            'request_type' => 'CATEGORY',
            'master_id' => $master->id,
            'requester_user_id' => (string) Str::uuid(),
            'requester_role' => 'MERCHANT',
            'requester_org_id' => (string) Str::uuid(),
            'suggested_name' => 'Kategori Aneh',
            'normalized_suggested_name' => 'kategori aneh',
            'reason' => 'Alasan coba-coba',
            'status' => 'NEW',
            'lock_version' => 1,
        ]);

        // 1. Move NEW -> PROCESSING
        $respProcessing = $this->withHeaders(array_merge($this->adminHeaders, [
            'If-Match' => '1',
        ]))->patchJson("/api/v1/category-requests/{$request->id}/review", [
            'to_status' => 'PROCESSING',
        ]);

        $respProcessing->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'PROCESSING',
                    'lock_version' => 2,
                ],
            ]);

        // 2. Move PROCESSING -> REJECTED with reason
        $respReject = $this->withHeaders(array_merge($this->adminHeaders, [
            'If-Match' => '2',
        ]))->patchJson("/api/v1/category-requests/{$request->id}/review", [
            'to_status' => 'REJECTED',
            'review_reason' => 'Tidak memenuhi standar taksonomi platform.',
        ]);

        $respReject->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'REJECTED',
                    'review_reason' => 'Tidak memenuhi standar taksonomi platform.',
                    'lock_version' => 3,
                ],
            ]);
    }

    public function test_admin_can_fulfill_request_linking_manual_official_node(): void
    {
        // DEC-12: FULFILLED hanya setelah Admin membuat/memilih node resmi manual dan mengaitkannya
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        // 1. Existing request in PROCESSING
        $request = CategoryRequest::create([
            'id' => (string) Str::uuid(),
            'request_type' => 'CATEGORY',
            'master_id' => $master->id,
            'requester_user_id' => (string) Str::uuid(),
            'requester_role' => 'MERCHANT',
            'requester_org_id' => (string) Str::uuid(),
            'suggested_name' => 'Perkakas Tangan',
            'normalized_suggested_name' => 'perkakas tangan',
            'reason' => 'Kebutuhan pertukangan',
            'status' => 'PROCESSING',
            'lock_version' => 1,
        ]);

        // 2. Admin creates the official category manually
        $officialCat = Category::create([
            'id' => (string) Str::uuid(),
            'master_id' => $master->id,
            'name' => 'Perkakas Tangan & Alat Ukur',
            'normalized_name' => 'perkakas tangan & alat ukur',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // 3. Admin links official node to fulfill the request
        $respFulfill = $this->withHeaders(array_merge($this->adminHeaders, [
            'If-Match' => '1',
        ]))->patchJson("/api/v1/category-requests/{$request->id}/review", [
            'to_status' => 'FULFILLED',
            'review_reason' => 'Kategori resmi telah dibuat manual dengan nama Perkakas Tangan & Alat Ukur.',
            'fulfilled_node' => [
                'node_type' => 'CATEGORY',
                'node_id' => $officialCat->id,
            ],
        ]);

        $respFulfill->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'FULFILLED',
                    'fulfilled_node' => [
                        'node_type' => 'CATEGORY',
                        'node_id' => $officialCat->id,
                    ],
                ],
            ]);
    }
}
