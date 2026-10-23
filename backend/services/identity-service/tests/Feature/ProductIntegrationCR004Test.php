<?php

namespace Tests\Feature;

use App\Models\Membership;
use App\Models\Organization;
use App\Models\OrganizationProfile;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductIntegrationCR004Test extends TestCase
{
    use DatabaseTransactions;

    protected string $internalKey;

    protected function setUp(): void
    {
        parent::setUp();
        $this->internalKey = env('IDENTITY_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026');
    }

    /**
     * Requirement 1: Exactly 9 product permissions registered, 9 canonical roles, exact role grants.
     */
    public function test_cr_identity_004_permissions_registry_and_canonical_role_grants(): void
    {
        // 1. Exactly 9 permissions registered under product-service
        $productPermissions = DB::table('permissions')
            ->where('owner_service', 'product-service')
            ->get();

        $this->assertCount(9, $productPermissions);

        $expectedCodes = [
            'product.own.read',
            'product.own.create',
            'product.own.update',
            'product.own.status',
            'product.own.delete',
            'product.variant.manage',
            'product.media.manage',
            'product.governance.read',
            'product.audit.read',
        ];

        $actualCodes = $productPermissions->pluck('code')->all();
        sort($expectedCodes);
        sort($actualCodes);
        $this->assertEquals($expectedCodes, $actualCodes);

        // 2. Verify all 9 are active
        foreach ($productPermissions as $perm) {
            $this->assertTrue((bool) $perm->is_active, "Permission {$perm->code} must be active");
        }

        // 3. Exactly 9 canonical roles exist, no non-canonical roles
        $roles = DB::table('roles')->get();
        $canonicalRoleCodes = [
            'CUSTOMER',
            'SERVICE_PROVIDER',
            'WORKER_TECHNICIAN',
            'MERCHANT',
            'SUPPLIER',
            'CUSTOMER_SUPPORT',
            'FINANCE_PAYMENT_OPS',
            'ADMIN_OPERATIONS',
            'CEO_PRODUCT_OWNER',
        ];
        $actualRoleCodes = $roles->pluck('code')->all();
        sort($canonicalRoleCodes);
        sort($actualRoleCodes);
        $this->assertEquals($canonicalRoleCodes, $actualRoleCodes);
        $this->assertNotContains('SUPER_ADMIN', $actualRoleCodes);
        $this->assertNotContains('MERCHANT_ADMIN', $actualRoleCodes);
        $this->assertNotContains('MERCHANT_STAFF', $actualRoleCodes);

        // 4. Granular Role Grants Verification
        $getGrants = function (string $roleCode) {
            return DB::table('role_permissions')
                ->join('roles', 'roles.id', '=', 'role_permissions.role_id')
                ->join('permissions', 'permissions.id', '=', 'role_permissions.permission_id')
                ->where('roles.code', $roleCode)
                ->where('permissions.owner_service', 'product-service')
                ->pluck('permissions.code')
                ->sort()
                ->values()
                ->all();
        };

        // MERCHANT: 8 permissions (all product.own.*, variant.manage, media.manage, audit.read)
        $merchantGrants = $getGrants('MERCHANT');
        $this->assertCount(8, $merchantGrants);
        $this->assertContains('product.own.read', $merchantGrants);
        $this->assertContains('product.own.create', $merchantGrants);
        $this->assertContains('product.own.update', $merchantGrants);
        $this->assertContains('product.own.status', $merchantGrants);
        $this->assertContains('product.own.delete', $merchantGrants);
        $this->assertContains('product.variant.manage', $merchantGrants);
        $this->assertContains('product.media.manage', $merchantGrants);
        $this->assertContains('product.audit.read', $merchantGrants);
        $this->assertNotContains('product.governance.read', $merchantGrants);

        // ADMIN_OPERATIONS: 2 permissions (governance.read, audit.read)
        $adminGrants = $getGrants('ADMIN_OPERATIONS');
        $this->assertCount(2, $adminGrants);
        $this->assertContains('product.governance.read', $adminGrants);
        $this->assertContains('product.audit.read', $adminGrants);
        $this->assertNotContains('product.own.create', $adminGrants);
        $this->assertNotContains('product.own.update', $adminGrants);
        $this->assertNotContains('product.own.delete', $adminGrants);

        // CEO_PRODUCT_OWNER: 2 permissions (governance.read, audit.read)
        $ceoGrants = $getGrants('CEO_PRODUCT_OWNER');
        $this->assertCount(2, $ceoGrants);
        $this->assertContains('product.governance.read', $ceoGrants);
        $this->assertContains('product.audit.read', $ceoGrants);
        $this->assertNotContains('product.own.create', $ceoGrants);

        // Non-participating roles must have ZERO product permissions
        $nonProductRoles = [
            'CUSTOMER',
            'SERVICE_PROVIDER',
            'WORKER_TECHNICIAN',
            'SUPPLIER',
            'CUSTOMER_SUPPORT',
            'FINANCE_PAYMENT_OPS',
        ];
        foreach ($nonProductRoles as $npRole) {
            $grants = $getGrants($npRole);
            $this->assertEmpty($grants, "Role {$npRole} should have 0 product permissions");
        }
    }

    /**
     * Requirement 2: Authorization evaluation for Merchant product permissions.
     */
    public function test_authorization_evaluation_for_merchant_product_permissions(): void
    {
        $merchant = User::where('email', 'merchant@servio.id')->firstOrFail();
        $merchantRole = Role::where('code', 'MERCHANT')->firstOrFail();
        $assignment = RoleAssignment::where('user_id', $merchant->id)
            ->where('role_id', $merchantRole->id)
            ->where('status', 'ACTIVE')
            ->firstOrFail();
        $membership = Membership::where('id', $assignment->membership_id)->firstOrFail();
        $orgId = $membership->organization_id;

        $merchantPermissions = [
            'product.own.read',
            'product.own.create',
            'product.own.update',
            'product.own.status',
            'product.own.delete',
            'product.variant.manage',
            'product.media.manage',
            'product.audit.read',
        ];

        foreach ($merchantPermissions as $perm) {
            $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
                ->postJson('/internal/v1/authorization/evaluate', [
                    'actor_user_id' => $merchant->id,
                    'permission' => $perm,
                    'active_role_assignment_id' => $assignment->id,
                    'organization_id' => $orgId,
                ]);

            $response->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'code' => 'IDENTITY_AUTHORIZATION_EVALUATED',
                    'data' => [
                        'allow' => true,
                        'reason_code' => 'POLICY_ALLOW',
                    ],
                ]);
        }

        // Merchant must NOT be allowed product.governance.read
        $govResponse = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $merchant->id,
                'permission' => 'product.governance.read',
                'active_role_assignment_id' => $assignment->id,
                'organization_id' => $orgId,
            ]);

        $govResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_AUTHORIZATION_DENIED',
                'data' => [
                    'allow' => false,
                    'reason_code' => 'PERMISSION_NOT_GRANTED',
                ],
            ]);
    }

    /**
     * Requirement 3: Admin Operations and CEO Product Owner permissions & lack of mutation permissions.
     */
    public function test_authorization_evaluation_for_admin_and_ceo(): void
    {
        $admin = User::where('email', 'admin@servio.id')->firstOrFail();
        $adminRole = Role::where('code', 'ADMIN_OPERATIONS')->firstOrFail();
        $adminAssignment = RoleAssignment::where('user_id', $admin->id)
            ->where('role_id', $adminRole->id)
            ->where('status', 'ACTIVE')
            ->firstOrFail();

        // Admin governance read -> allow
        $res = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $admin->id,
                'permission' => 'product.governance.read',
                'active_role_assignment_id' => $adminAssignment->id,
            ]);
        $res->assertStatus(200)->assertJson(['data' => ['allow' => true]]);

        // Admin audit read -> allow
        $resAudit = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $admin->id,
                'permission' => 'product.audit.read',
                'active_role_assignment_id' => $adminAssignment->id,
            ]);
        $resAudit->assertStatus(200)->assertJson(['data' => ['allow' => true]]);

        // Admin product mutation -> denied
        $resMut = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $admin->id,
                'permission' => 'product.own.create',
                'active_role_assignment_id' => $adminAssignment->id,
            ]);
        $resMut->assertStatus(200)->assertJson(['data' => ['allow' => false, 'reason_code' => 'PERMISSION_NOT_GRANTED']]);

        // CEO governance read -> allow
        $ceo = User::where('email', 'ceo@servio.id')->firstOrFail();
        $ceoRole = Role::where('code', 'CEO_PRODUCT_OWNER')->firstOrFail();
        $ceoAssignment = RoleAssignment::where('user_id', $ceo->id)
            ->where('role_id', $ceoRole->id)
            ->where('status', 'ACTIVE')
            ->firstOrFail();

        $resCeoGov = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $ceo->id,
                'permission' => 'product.governance.read',
                'active_role_assignment_id' => $ceoAssignment->id,
            ]);
        $resCeoGov->assertStatus(200)->assertJson(['data' => ['allow' => true]]);

        // CEO product mutation -> denied
        $resCeoMut = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $ceo->id,
                'permission' => 'product.own.create',
                'active_role_assignment_id' => $ceoAssignment->id,
            ]);
        $resCeoMut->assertStatus(200)->assertJson(['data' => ['allow' => false, 'reason_code' => 'PERMISSION_NOT_GRANTED']]);
    }

    /**
     * Requirement 4: Scope protection - Merchant cannot act under different organization.
     */
    public function test_authorization_evaluation_organization_mismatch_denied(): void
    {
        $merchant = User::where('email', 'merchant@servio.id')->firstOrFail();
        $merchantRole = Role::where('code', 'MERCHANT')->firstOrFail();
        $assignment = RoleAssignment::where('user_id', $merchant->id)
            ->where('role_id', $merchantRole->id)
            ->where('status', 'ACTIVE')
            ->firstOrFail();

        $otherOrgId = (string) Str::uuid();

        $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $merchant->id,
                'permission' => 'product.own.read',
                'active_role_assignment_id' => $assignment->id,
                'organization_id' => $otherOrgId,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_AUTHORIZATION_DENIED',
                'data' => [
                    'allow' => false,
                    'reason_code' => 'ORGANIZATION_SCOPE_MISMATCH',
                ],
            ]);
    }

    /**
     * Requirement 5: Suspended user denied authorization fail-closed.
     */
    public function test_authorization_evaluation_suspended_account_denied(): void
    {
        $merchant = User::where('email', 'merchant@servio.id')->firstOrFail();
        $originalStatus = $merchant->status;

        $merchant->status = 'SUSPENDED';
        $merchant->save();

        $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $merchant->id,
                'permission' => 'product.own.read',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_AUTHORIZATION_DENIED',
                'data' => [
                    'allow' => false,
                    'reason_code' => 'ACCOUNT_INACTIVE_OR_SUSPENDED',
                ],
            ]);

        $merchant->status = $originalStatus;
        $merchant->save();
    }

    /**
     * Requirement 6: Public profile internal endpoint rejects unauthorized callers.
     */
    public function test_public_merchant_profile_unauthorized_access_rejected(): void
    {
        $org = Organization::where('type', 'MERCHANT')->firstOrFail();

        // 1. Without internal service key
        $resNoKey = $this->getJson("/internal/v1/organizations/{$org->id}/public-profile");
        $resNoKey->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_PERMISSION_DENIED',
            ]);

        // 2. With invalid internal service key
        $resInvalidKey = $this->withHeaders(['X-Internal-Service-Key' => 'invalid-fake-key-1234'])
            ->getJson("/internal/v1/organizations/{$org->id}/public-profile");
        $resInvalidKey->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_PERMISSION_DENIED',
            ]);
    }

    /**
     * Requirement 7: Public profile returns correct data contract for valid Merchant.
     */
    public function test_public_merchant_profile_successful_for_valid_merchant(): void
    {
        $org = Organization::with('profile')->where('type', 'MERCHANT')->firstOrFail();

        $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->getJson("/internal/v1/organizations/{$org->id}/public-profile");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_PUBLIC_PROFILE_LOADED',
                'data' => [
                    'organization_id' => $org->id,
                    'type' => 'MERCHANT',
                    'store_name' => $org->profile->display_name,
                    'logo_url' => null,
                    'public_description' => null,
                    'status' => 'ACTIVE',
                    'operational_status' => $org->operational_status,
                    'is_verified' => null,
                    'profile_version' => 1,
                ],
                'meta' => [
                    'version' => 'v1',
                ],
            ]);

        $this->assertNotEmpty($response->json('meta.request_id'));
    }

    /**
     * Requirement 8: Security & Privacy - Absolutely no sensitive data exposed in public profile.
     */
    public function test_public_merchant_profile_sensitive_data_strict_protection(): void
    {
        $org = Organization::with('profile')->where('type', 'MERCHANT')->firstOrFail();

        $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->getJson("/internal/v1/organizations/{$org->id}/public-profile");

        $response->assertStatus(200);
        $json = $response->getContent();

        // Must not expose any sensitive or private legal fields
        $this->assertStringNotContainsString('nib_ciphertext', $json);
        $this->assertStringNotContainsString('nib_lookup_hash', $json);
        $this->assertStringNotContainsString('npwp_ciphertext', $json);
        $this->assertStringNotContainsString('npwp_lookup_hash', $json);
        $this->assertStringNotContainsString('business_email', $json);
        $this->assertStringNotContainsString('business_phone', $json);
        $this->assertStringNotContainsString('address_json', $json);
        $this->assertStringNotContainsString('password', $json);
        $this->assertStringNotContainsString('nik', $json);
        $this->assertStringNotContainsString('otp', $json);
    }

    /**
     * Requirement 9: Non-existent organization returns 404.
     */
    public function test_public_merchant_profile_non_existent_organization_returns_404(): void
    {
        $nonExistentId = (string) Str::uuid();

        $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->getJson("/internal/v1/organizations/{$nonExistentId}/public-profile");

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_ORGANIZATION_NOT_FOUND',
            ]);
    }

    /**
     * Requirement 10: Non-MERCHANT / Non-PROVIDER organization returns 422.
     */
    public function test_public_merchant_profile_non_merchant_organization_returns_422(): void
    {
        // Organization with type not MERCHANT or PROVIDER
        $unsupportedOrg = Organization::whereNotIn('type', ['MERCHANT', 'PROVIDER'])->first();
        if (! $unsupportedOrg) {
            $unsupportedOrg = Organization::create([
                'id' => (string) Str::uuid(),
                'type' => 'SERVICE_PROVIDER',
                'status' => 'ACTIVE',
            ]);
        }

        $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->getJson("/internal/v1/organizations/{$unsupportedOrg->id}/public-profile");

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_ORGANIZATION_NOT_MERCHANT',
            ]);
    }

    /**
     * CR-04-IDENTITY-001: Provider organization returns 200 with public profile.
     */
    public function test_public_profile_provider_organization(): void
    {
        $providerOrg = Organization::where('type', 'PROVIDER')->first();
        if (! $providerOrg) {
            $providerOrg = Organization::create([
                'id' => (string) Str::uuid(),
                'type' => 'PROVIDER',
                'status' => 'ACTIVE',
            ]);
        }

        $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->getJson("/internal/v1/organizations/{$providerOrg->id}/public-profile");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_PUBLIC_PROFILE_LOADED',
                'data' => [
                    'organization_id' => $providerOrg->id,
                    'type' => 'PROVIDER',
                ],
            ]);
    }

    /**
     * Requirement 11: Suspended merchant organization returns 200 with status SUSPENDED in payload.
     */
    public function test_public_merchant_profile_suspended_merchant(): void
    {
        $org = Organization::with('profile')->where('type', 'MERCHANT')->firstOrFail();
        $originalStatus = $org->status;

        $org->status = 'SUSPENDED';
        $org->save();

        $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->getJson("/internal/v1/organizations/{$org->id}/public-profile");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_PUBLIC_PROFILE_LOADED',
                'data' => [
                    'organization_id' => $org->id,
                    'type' => 'MERCHANT',
                    'status' => 'SUSPENDED',
                ],
            ]);

        $org->status = $originalStatus;
        $org->save();
    }

    /**
     * Requirement 12: Public profile endpoint is accessible via both route prefixes:
     * - /internal/v1/organizations/{id}/public-profile
     * - /api/internal/v1/organizations/{id}/public-profile
     */
    public function test_public_merchant_profile_works_on_both_route_prefixes(): void
    {
        $org = Organization::with('profile')->where('type', 'MERCHANT')->firstOrFail();

        $res1 = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->getJson("/internal/v1/organizations/{$org->id}/public-profile");
        $res1->assertStatus(200)->assertJson(['success' => true]);

        $res2 = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->getJson("/api/internal/v1/organizations/{$org->id}/public-profile");
        $res2->assertStatus(200)->assertJson(['success' => true]);
    }
}
