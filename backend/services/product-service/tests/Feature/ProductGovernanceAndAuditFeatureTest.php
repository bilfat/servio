<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductAuditLog;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ProductGovernanceAndAuditFeatureTest extends TestCase
{
    use DatabaseTransactions;

    protected Product $prodMerchantA;
    protected Product $prodMerchantB;

    protected function setUp(): void
    {
        parent::setUp();

        // Product Merchant A
        $this->prodMerchantA = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => '11111111-aaaa-4111-8111-111111111111',
            'created_by_user_id' => 'user-merchant-a',
            'name' => 'Produk Organisasi Alpha',
            'normalized_name' => 'produk organisasi alpha',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        ProductVariant::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->prodMerchantA->id,
            'attributes_json' => ['tipe' => 'Alpha'],
            'attribute_signature' => ProductVariant::computeSignature(['tipe' => 'Alpha']),
            'price_idr' => 200000,
            'stock_qty' => 15,
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // Product Merchant B
        $this->prodMerchantB = Product::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'merchant_organization_id' => '22222222-bbbb-4222-8222-222222222222',
            'created_by_user_id' => 'user-merchant-b',
            'name' => 'Produk Organisasi Beta',
            'normalized_name' => 'produk organisasi beta',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        // Audit Log entry
        ProductAuditLog::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->prodMerchantA->id,
            'actor_user_id' => 'admin-user-uuid-1',
            'actor_role' => 'ADMIN_OPERATIONS',
            'actor_org_id' => null,
            'action' => 'PRODUCT_STATUS_CHANGED',
            'entity_type' => 'PRODUCT',
            'entity_id' => $this->prodMerchantA->id,
            'before_safe' => ['status' => 'DRAFT'],
            'after_safe' => ['status' => 'ACTIVE'],
            'request_id' => (string) \Illuminate\Support\Str::uuid(),
            'occurred_at' => now(),
        ]);
    }

    public function test_governance_list_products_returns_all_products_across_merchants(): void
    {
        $headers = $this->adminHeaders();

        $res = $this->withHeaders($headers)->getJson('/api/v1/governance/products');
        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_GOVERNANCE_LISTED',
            ]);

        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertContains($this->prodMerchantA->id, $ids);
        $this->assertContains($this->prodMerchantB->id, $ids);
    }

    public function test_governance_get_product_detail_and_related_audit_logs(): void
    {
        $headers = $this->adminHeaders();

        // 1. G02: Detail
        $res = $this->withHeaders($headers)->getJson("/api/v1/governance/products/{$this->prodMerchantA->id}");
        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_GOVERNANCE_FOUND',
                'data' => [
                    'id' => $this->prodMerchantA->id,
                    'name' => 'Produk Organisasi Alpha',
                    'merchant_organization_id' => '11111111-aaaa-4111-8111-111111111111',
                ],
            ]);

        // 2. G03: Audit log for this product
        $resAudit = $this->withHeaders($headers)->getJson("/api/v1/product-audit?product_id={$this->prodMerchantA->id}");
        $resAudit->assertStatus(200);
        $this->assertNotEmpty($resAudit->json('data'));
        $this->assertEquals('PRODUCT_STATUS_CHANGED', $resAudit->json('data.0.action'));
    }

    public function test_governance_audit_endpoint_filters_by_action(): void
    {
        $headers = $this->adminHeaders();

        $res = $this->withHeaders($headers)->getJson('/api/v1/product-audit?action=PRODUCT_STATUS_CHANGED');
        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_AUDIT_LISTED',
            ]);

        $items = $res->json('data');
        $this->assertNotEmpty($items);
        $this->assertEquals('PRODUCT_STATUS_CHANGED', $items[0]['action']);
    }

    public function test_merchant_cannot_access_governance_endpoints_without_permission(): void
    {
        $merchantHeaders = $this->merchantHeaders();

        // Custom fake handler: evaluateAuthorization returns DENIED for product.governance.read on merchant
        \App\Infrastructure\Identity\IdentityServiceClient::fake(function (string $action, array $params) {
            if ($action === 'evaluateAuthorization') {
                if (str_starts_with($params['permission'], 'product.governance.') || str_starts_with($params['permission'], 'product.audit.')) {
                    return [
                        'allow' => false,
                        'reason_code' => 'PERMISSION_NOT_GRANTED',
                        'authz_version' => 1,
                    ];
                }
                return ['allow' => true, 'reason_code' => 'POLICY_ALLOW', 'authz_version' => 1];
            }
            return null;
        });

        $resGov = $this->withHeaders($merchantHeaders)->getJson('/api/v1/governance/products');
        $resGov->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'PRODUCT_ACCESS_DENIED',
            ]);

        $resAudit = $this->withHeaders($merchantHeaders)->getJson('/api/v1/product-audit');
        $resAudit->assertStatus(403);
    }

    public function test_merchant_with_audit_read_permission_is_strictly_scoped_to_own_organization(): void
    {
        // 1. Create audit log for Merchant A
        $logA = ProductAuditLog::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->prodMerchantA->id,
            'actor_user_id' => 'user-merchant-a',
            'actor_role' => 'MERCHANT',
            'actor_org_id' => '11111111-aaaa-4111-8111-111111111111',
            'action' => 'PRODUCT_UPDATED',
            'entity_type' => 'PRODUCT',
            'entity_id' => $this->prodMerchantA->id,
            'before_safe' => ['name' => 'Old Name'],
            'after_safe' => ['name' => 'New Name'],
            'request_id' => (string) \Illuminate\Support\Str::uuid(),
            'occurred_at' => now(),
        ]);

        // 2. Create audit log for Merchant B
        $logB = ProductAuditLog::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'product_id' => $this->prodMerchantB->id,
            'actor_user_id' => 'user-merchant-b',
            'actor_role' => 'MERCHANT',
            'actor_org_id' => '22222222-bbbb-4222-8222-222222222222',
            'action' => 'PRODUCT_CREATED',
            'entity_type' => 'PRODUCT',
            'entity_id' => $this->prodMerchantB->id,
            'before_safe' => null,
            'after_safe' => ['name' => 'Produk Organisasi Beta'],
            'request_id' => (string) \Illuminate\Support\Str::uuid(),
            'occurred_at' => now(),
        ]);

        // Fake authorization: Merchant A has product.audit.read
        \App\Infrastructure\Identity\IdentityServiceClient::fake(function (string $action, array $params) {
            if ($action === 'evaluateAuthorization') {
                return ['allow' => true, 'reason_code' => 'POLICY_ALLOW', 'authz_version' => 1];
            }
            return null;
        });

        // Merchant A headers (orgId, userId)
        $merchantAHeaders = $this->merchantHeaders('11111111-aaaa-4111-8111-111111111111', 'user-merchant-a');

        $res = $this->withHeaders($merchantAHeaders)->getJson('/api/v1/product-audit');
        $res->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'PRODUCT_AUDIT_LISTED',
            ]);

        $itemIds = collect($res->json('data'))->pluck('id')->all();

        // Merchant A must see their own audit log
        $this->assertContains($logA->id, $itemIds);

        // Merchant A must NEVER see Merchant B's audit log
        $this->assertNotContains($logB->id, $itemIds);
    }
}
