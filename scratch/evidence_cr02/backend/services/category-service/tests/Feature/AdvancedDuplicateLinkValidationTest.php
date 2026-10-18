<?php

namespace Tests\Feature;

use App\Models\CategoryMaster;
use App\Models\CategoryRequest;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdvancedDuplicateLinkValidationTest extends TestCase
{
    use DatabaseTransactions;

    protected array $adminHeaders;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
            'If-Match' => '1',
        ];
    }

    public function test_business_roles_without_organization_cannot_submit_suggestion(): void
    {
        // DEC-09: Suggestion submission requires active organization context for business roles
        $merchantHeadersWithoutOrg = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'MERCHANT',
            // Missing X-Actor-Org-Id
        ];

        $response = $this->withHeaders($merchantHeadersWithoutOrg)->postJson('/api/v1/category-requests', [
            'request_type' => 'CATEGORY',
            'master_code' => 'PRODUK',
            'suggested_name' => 'Produk Non Org',
            'reason' => 'Pengujian tanpa organisasi',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_PERMISSION_DENIED',
            ]);
    }

    public function test_suggestion_cannot_be_duplicate_of_itself(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $req = CategoryRequest::create([
            'id' => (string) Str::uuid(),
            'request_type' => 'CATEGORY',
            'master_id' => $master->id,
            'requester_user_id' => (string) Str::uuid(),
            'requester_role' => 'MERCHANT',
            'requester_org_id' => (string) Str::uuid(),
            'suggested_name' => 'Barang A',
            'normalized_suggested_name' => 'barang a',
            'reason' => 'Alasan A',
            'status' => 'PROCESSING',
            'lock_version' => 1,
        ]);

        $response = $this->withHeaders($this->adminHeaders)->patchJson("/api/v1/category-requests/{$req->id}/review", [
            'to_status' => 'REJECTED',
            'review_reason' => 'Duplikat dari diri sendiri',
            'duplicate_of_request_id' => $req->id,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_VALIDATION_FAILED',
            ]);
    }

    public function test_circular_duplicate_linkage_is_rejected(): void
    {
        // DEC-08: Menolak duplicate suggestion linkage sirkular
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $reqA = CategoryRequest::create([
            'id' => (string) Str::uuid(),
            'request_type' => 'CATEGORY',
            'master_id' => $master->id,
            'requester_user_id' => (string) Str::uuid(),
            'requester_role' => 'MERCHANT',
            'requester_org_id' => (string) Str::uuid(),
            'suggested_name' => 'Barang Alpha',
            'normalized_suggested_name' => 'barang alpha',
            'reason' => 'Alasan Alpha',
            'status' => 'PROCESSING',
            'lock_version' => 1,
        ]);

        $reqB = CategoryRequest::create([
            'id' => (string) Str::uuid(),
            'request_type' => 'CATEGORY',
            'master_id' => $master->id,
            'requester_user_id' => (string) Str::uuid(),
            'requester_role' => 'MERCHANT',
            'requester_org_id' => (string) Str::uuid(),
            'suggested_name' => 'Barang Beta',
            'normalized_suggested_name' => 'barang beta',
            'reason' => 'Alasan Beta',
            'status' => 'PROCESSING',
            'duplicate_of_request_id' => $reqA->id, // B points to A
            'lock_version' => 1,
        ]);

        // Attempt to make A point to B -> Circular link!
        $response = $this->withHeaders($this->adminHeaders)->patchJson("/api/v1/category-requests/{$reqA->id}/review", [
            'to_status' => 'REJECTED',
            'review_reason' => 'Sirkular ke B',
            'duplicate_of_request_id' => $reqB->id,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_VALIDATION_FAILED',
            ]);
    }

    public function test_cross_branch_duplicate_linkage_is_rejected(): void
    {
        // DEC-08: Menolak duplicate suggestion linkage dengan konflik branch master
        $masterProduk = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $masterJasa = CategoryMaster::where('code', 'JASA')->firstOrFail();

        $reqProduk = CategoryRequest::create([
            'id' => (string) Str::uuid(),
            'request_type' => 'CATEGORY',
            'master_id' => $masterProduk->id,
            'requester_user_id' => (string) Str::uuid(),
            'requester_role' => 'MERCHANT',
            'requester_org_id' => (string) Str::uuid(),
            'suggested_name' => 'Obeng Mekanik',
            'normalized_suggested_name' => 'obeng mekanik',
            'reason' => 'Produk obeng',
            'status' => 'PROCESSING',
            'lock_version' => 1,
        ]);

        $reqJasa = CategoryRequest::create([
            'id' => (string) Str::uuid(),
            'request_type' => 'CATEGORY',
            'master_id' => $masterJasa->id,
            'requester_user_id' => (string) Str::uuid(),
            'requester_role' => 'SERVICE_PROVIDER',
            'requester_org_id' => (string) Str::uuid(),
            'suggested_name' => 'Jasa Servis Obeng',
            'normalized_suggested_name' => 'jasa servis obeng',
            'reason' => 'Servis obeng',
            'status' => 'PROCESSING',
            'lock_version' => 1,
        ]);

        // Attempt linking reqProduk as duplicate of reqJasa
        $response = $this->withHeaders($this->adminHeaders)->patchJson("/api/v1/category-requests/{$reqProduk->id}/review", [
            'to_status' => 'REJECTED',
            'review_reason' => 'Salah cabang',
            'duplicate_of_request_id' => $reqJasa->id,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_VALIDATION_FAILED',
            ]);
    }

    public function test_cross_type_duplicate_linkage_is_rejected(): void
    {
        // Menolak duplicate suggestion linkage dengan tipe pengajuan berbeda (CATEGORY vs SUBCATEGORY)
        $masterProduk = CategoryMaster::where('code', 'PRODUK')->firstOrFail();

        $reqCat = CategoryRequest::create([
            'id' => (string) Str::uuid(),
            'request_type' => 'CATEGORY',
            'master_id' => $masterProduk->id,
            'requester_user_id' => (string) Str::uuid(),
            'requester_role' => 'MERCHANT',
            'requester_org_id' => (string) Str::uuid(),
            'suggested_name' => 'Kategori Utama Barang',
            'normalized_suggested_name' => 'kategori utama barang',
            'reason' => 'Kategori baru',
            'status' => 'PROCESSING',
            'lock_version' => 1,
        ]);

        $reqSub = CategoryRequest::create([
            'id' => (string) Str::uuid(),
            'request_type' => 'SUBCATEGORY',
            'master_id' => $masterProduk->id,
            'requester_user_id' => (string) Str::uuid(),
            'requester_role' => 'MERCHANT',
            'requester_org_id' => (string) Str::uuid(),
            'suggested_name' => 'Subkategori Barang',
            'normalized_suggested_name' => 'subkategori barang',
            'reason' => 'Subkategori baru',
            'status' => 'PROCESSING',
            'lock_version' => 1,
        ]);

        // Attempt linking reqCat as duplicate of reqSub
        $response = $this->withHeaders($this->adminHeaders)->patchJson("/api/v1/category-requests/{$reqCat->id}/review", [
            'to_status' => 'REJECTED',
            'review_reason' => 'Tipe pengajuan tidak cocok',
            'duplicate_of_request_id' => $reqSub->id,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_VALIDATION_FAILED',
            ]);
    }
}
