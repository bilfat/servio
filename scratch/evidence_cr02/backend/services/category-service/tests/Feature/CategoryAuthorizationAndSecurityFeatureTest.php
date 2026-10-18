<?php

namespace Tests\Feature;

use App\Infrastructure\Identity\IdentityServiceClient;
use App\Models\Category;
use App\Models\CategoryMaster;
use App\Models\CategoryRequest;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class CategoryAuthorizationAndSecurityFeatureTest extends TestCase
{
    use DatabaseTransactions;

    public function test_unauthenticated_request_to_protected_endpoint_returns_401(): void
    {
        // No authentication headers or session
        $this->flushHeaders();
        $response = $this->postJson('/api/v1/categories', [
            'name' => 'Bypass Test',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_UNAUTHENTICATED',
            ]);
    }

    public function test_actor_headers_without_valid_gateway_key_rejected_as_spoofing(): void
    {
        // Attempting to spoof actor headers without valid X-Gateway-Key
        $this->flushHeaders();
        $spoofedHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
            'X-Gateway-Key' => 'invalid-fake-gateway-key',
        ];

        $response = $this->withHeaders($spoofedHeaders)->postJson('/api/v1/categories', [
            'name' => 'Spoof Test',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_UNTRUSTED_GATEWAY_CONTEXT',
            ]);
    }

    public function test_customer_cannot_create_or_edit_category(): void
    {
        // EC-006 & EC-007: Customer cannot create or edit
        $headers = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'CUSTOMER',
        ];

        $respCreate = $this->withHeaders($headers)->postJson('/api/v1/categories', [
            'name' => 'Customer Attempt',
        ]);
        $respCreate->assertStatus(403);

        $respEdit = $this->withHeaders(array_merge($headers, ['If-Match' => '1']))
            ->patchJson('/api/v1/categories/' . Str::uuid(), [
                'name' => 'Customer Edit Attempt',
            ]);
        $respEdit->assertStatus(403);
    }

    public function test_ceo_has_oversight_read_but_cannot_perform_crud(): void
    {
        // DEC-13: CEO oversight/audit, Admin operator/reviewer (CEO tidak memperoleh CRUD operasional)
        $ceoHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'CEO_PRODUCT_OWNER',
        ];

        // 1. CEO CAN read full tree
        $respTree = $this->withHeaders($ceoHeaders)->getJson('/api/v1/categories/tree?include_inactive=true');
        $respTree->assertStatus(200);

        // 2. CEO CAN read audit logs
        $respAudit = $this->withHeaders($ceoHeaders)->getJson('/api/v1/category-audit');
        $respAudit->assertStatus(200);

        // 3. CEO CANNOT create category
        $respCreate = $this->withHeaders($ceoHeaders)->postJson('/api/v1/categories', [
            'name' => 'CEO Attempt',
        ]);
        $respCreate->assertStatus(403);

        // 4. CEO CANNOT review requests
        $respReview = $this->withHeaders(array_merge($ceoHeaders, ['If-Match' => '1']))
            ->patchJson('/api/v1/category-requests/' . Str::uuid() . '/review', [
                'to_status' => 'PROCESSING',
            ]);
        $respReview->assertStatus(403);
    }

    public function test_merchant_cannot_access_other_users_private_requests_idor(): void
    {
        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $userAId = (string) Str::uuid();
        $userBId = (string) Str::uuid();
        $orgBId = (string) Str::uuid();

        // Request owned by User A
        $requestA = CategoryRequest::create([
            'id' => (string) Str::uuid(),
            'request_type' => 'CATEGORY',
            'master_id' => $master->id,
            'requester_user_id' => $userAId,
            'requester_role' => 'MERCHANT',
            'requester_org_id' => (string) Str::uuid(),
            'suggested_name' => 'Usulan Rahasia User A',
            'normalized_suggested_name' => 'usulan rahasia user a',
            'reason' => 'Privat',
            'status' => 'NEW',
            'lock_version' => 1,
        ]);

        // User B attempts to access User A's request
        $userBHeaders = [
            'X-Actor-User-Id' => $userBId,
            'X-Actor-Role' => 'MERCHANT',
            'X-Actor-Org-Id' => $orgBId,
        ];

        $response = $this->withHeaders($userBHeaders)->getJson("/api/v1/category-requests/{$requestA->id}");

        // Must return 404 (masked) to avoid enumeration leak
        $response->assertStatus(404);
    }

    public function test_public_can_read_active_categories_anonymously(): void
    {
        // Public/guest access without headers
        $this->flushHeaders();
        $response = $this->getJson('/api/v1/categories/tree');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'CATEGORY_TREE_LOADED',
            ]);
    }

    public function test_identity_service_denial_returns_403_fail_closed(): void
    {
        // Mock Identity returning DENIED
        IdentityServiceClient::fake(function (string $action, array $params) {
            if ($action === 'evaluateAuthorization') {
                return [
                    'allow' => false,
                    'reason_code' => 'PERMISSION_NOT_GRANTED',
                    'authz_version' => 1,
                ];
            }
            return null;
        });

        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $adminHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
        ];

        $response = $this->withHeaders($adminHeaders)->postJson('/api/v1/categories', [
            'master_id' => $master->id,
            'name' => 'Kategori Denied Test',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_PERMISSION_DENIED',
            ]);
    }

    public function test_identity_service_unavailable_returns_503_fail_closed(): void
    {
        // Mock Identity timeout / unavailable
        IdentityServiceClient::fake(function (string $action, array $params) {
            if ($action === 'evaluateAuthorization') {
                return [
                    'allow' => false,
                    'reason_code' => 'IDENTITY_SERVICE_UNAVAILABLE',
                ];
            }
            return null;
        });

        $master = CategoryMaster::where('code', 'PRODUK')->firstOrFail();
        $adminHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
        ];

        $response = $this->withHeaders($adminHeaders)->postJson('/api/v1/categories', [
            'master_id' => $master->id,
            'name' => 'Kategori Unavailable Test',
        ]);

        $response->assertStatus(503)
            ->assertJson([
                'success' => false,
                'code' => 'CATEGORY_IDENTITY_UNAVAILABLE',
            ]);
    }

    public function test_r01_distinguishes_read_all_for_admin_and_read_own_for_merchant(): void
    {
        $evaluatedPermissions = [];

        IdentityServiceClient::fake(function (string $action, array $params) use (&$evaluatedPermissions) {
            if ($action === 'evaluateAuthorization') {
                $evaluatedPermissions[] = $params['permission'];
                return [
                    'allow' => true,
                    'reason_code' => 'AUTHORIZED',
                    'authz_version' => 1,
                ];
            }
            return null;
        });

        // 1. Admin accessing R01
        $adminHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
        ];
        $this->withHeaders($adminHeaders)->getJson('/api/v1/category-requests');

        // 2. Merchant accessing R01
        $merchantHeaders = [
            'X-Actor-User-Id' => (string) Str::uuid(),
            'X-Actor-Role' => 'MERCHANT',
            'X-Actor-Org-Id' => (string) Str::uuid(),
        ];
        $this->withHeaders($merchantHeaders)->getJson('/api/v1/category-requests');

        $this->assertContains('category.request.read_all', $evaluatedPermissions);
        $this->assertContains('category.request.read_own', $evaluatedPermissions);
    }
}
