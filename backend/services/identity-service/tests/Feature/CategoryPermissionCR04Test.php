<?php

namespace Tests\Feature;

use App\Models\AuthSession;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class CategoryPermissionCR04Test extends TestCase
{
    use DatabaseTransactions;

    protected string $internalKey;

    protected function setUp(): void
    {
        parent::setUp();
        $this->internalKey = env('IDENTITY_INTERNAL_SERVICE_KEY', 'testing_internal_service_key_2026');
    }

    /**
     * Requirement 2: 11 permissions registered, 9 canonical roles, no SUPER_ADMIN, exact role grants.
     */
    public function test_cr04_permissions_registry_and_canonical_role_grants(): void
    {
        // 1. Exactly 11 permissions registered under category-service
        $categoryPermissions = DB::table('permissions')
            ->where('owner_service', 'category-service')
            ->get();

        $this->assertCount(11, $categoryPermissions);

        $expectedCodes = [
            'category.taxonomy.read_active',
            'category.taxonomy.read_inactive',
            'category.taxonomy.create',
            'category.taxonomy.update',
            'category.taxonomy.change_status',
            'category.taxonomy.hard_delete',
            'category.request.submit',
            'category.request.read_own',
            'category.request.read_all',
            'category.request.review',
            'category.audit.read',
        ];

        $actualCodes = $categoryPermissions->pluck('code')->all();
        sort($expectedCodes);
        sort($actualCodes);
        $this->assertEquals($expectedCodes, $actualCodes);

        // 2. Exactly 9 canonical roles exist, no SUPER_ADMIN
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

        // 3. Matriks Hak Akses Granular
        $getGrants = function (string $roleCode) {
            return DB::table('role_permissions')
                ->join('roles', 'roles.id', '=', 'role_permissions.role_id')
                ->join('permissions', 'permissions.id', '=', 'role_permissions.permission_id')
                ->where('roles.code', $roleCode)
                ->where('permissions.owner_service', 'category-service')
                ->pluck('permissions.code')
                ->sort()
                ->values()
                ->all();
        };

        // ADMIN_OPERATIONS: 9 permissions (semua kecuali submit dan read_own)
        $adminGrants = $getGrants('ADMIN_OPERATIONS');
        $this->assertCount(9, $adminGrants);
        $this->assertContains('category.taxonomy.create', $adminGrants);
        $this->assertContains('category.taxonomy.update', $adminGrants);
        $this->assertContains('category.taxonomy.change_status', $adminGrants);
        $this->assertContains('category.taxonomy.hard_delete', $adminGrants);
        $this->assertNotContains('category.request.submit', $adminGrants);

        // CEO_PRODUCT_OWNER: strictly 4 read-only/governance permissions
        $ceoGrants = $getGrants('CEO_PRODUCT_OWNER');
        $this->assertCount(4, $ceoGrants);
        $this->assertEquals([
            'category.audit.read',
            'category.request.read_all',
            'category.taxonomy.read_active',
            'category.taxonomy.read_inactive',
        ], $ceoGrants);
        $this->assertNotContains('category.taxonomy.create', $ceoGrants);
        $this->assertNotContains('category.taxonomy.update', $ceoGrants);
        $this->assertNotContains('category.taxonomy.change_status', $ceoGrants);
        $this->assertNotContains('category.taxonomy.hard_delete', $ceoGrants);

        // Business Roles: SERVICE_PROVIDER, MERCHANT, SUPPLIER -> 3 permissions
        $expectedBusiness = [
            'category.request.read_own',
            'category.request.submit',
            'category.taxonomy.read_active',
        ];
        $this->assertEquals($expectedBusiness, $getGrants('SERVICE_PROVIDER'));
        $this->assertEquals($expectedBusiness, $getGrants('MERCHANT'));
        $this->assertEquals($expectedBusiness, $getGrants('SUPPLIER'));

        // Customer & Staff non-category: 1 permission (read_active)
        $this->assertEquals(['category.taxonomy.read_active'], $getGrants('CUSTOMER'));
        $this->assertEquals(['category.taxonomy.read_active'], $getGrants('WORKER_TECHNICIAN'));
        $this->assertEquals(['category.taxonomy.read_active'], $getGrants('CUSTOMER_SUPPORT'));
        $this->assertEquals(['category.taxonomy.read_active'], $getGrants('FINANCE_PAYMENT_OPS'));
    }

    /**
     * Requirement 4: Admin Operations evaluation -> allow: true for category.taxonomy.create
     */
    public function test_internal_evaluate_admin_operations_can_create_category(): void
    {
        $admin = User::where('email', 'admin@servio.id')->firstOrFail();
        $adminAssignment = RoleAssignment::where('user_id', $admin->id)
            ->whereHas('role', fn ($q) => $q->where('code', 'ADMIN_OPERATIONS'))
            ->where('status', 'ACTIVE')
            ->firstOrFail();

        $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $admin->id,
                'permission' => 'category.taxonomy.create',
                'active_role_assignment_id' => $adminAssignment->id,
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

    /**
     * Requirement 4: CEO evaluation -> allow: true for category.audit.read, allow: false for category.taxonomy.create
     */
    public function test_internal_evaluate_ceo_can_read_audit_but_cannot_create_category(): void
    {
        $ceo = User::where('email', 'ceo@servio.id')->firstOrFail();
        $ceoAssignment = RoleAssignment::where('user_id', $ceo->id)
            ->whereHas('role', fn ($q) => $q->where('code', 'CEO_PRODUCT_OWNER'))
            ->where('status', 'ACTIVE')
            ->firstOrFail();

        // 1. Audit read -> ALLOW: TRUE
        $auditResp = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $ceo->id,
                'permission' => 'category.audit.read',
                'active_role_assignment_id' => $ceoAssignment->id,
            ]);

        $auditResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'allow' => true,
                    'reason_code' => 'POLICY_ALLOW',
                ],
            ]);

        // 2. Category mutation (create) -> ALLOW: FALSE (STRICT READ-ONLY)
        $createResp = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $ceo->id,
                'permission' => 'category.taxonomy.create',
                'active_role_assignment_id' => $ceoAssignment->id,
            ]);

        $createResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'allow' => false,
                    'reason_code' => 'PERMISSION_NOT_GRANTED',
                ],
            ]);
    }

    /**
     * Requirement 4: Merchant/Provider/Supplier suggestion permissions with active organization
     */
    public function test_internal_evaluate_merchant_provider_supplier_suggestion_permissions(): void
    {
        // Merchant
        $merchant = User::where('email', 'merchant@servio.id')->firstOrFail();
        $merchantAssignment = RoleAssignment::where('user_id', $merchant->id)
            ->whereHas('role', fn ($q) => $q->where('code', 'MERCHANT'))
            ->where('status', 'ACTIVE')
            ->firstOrFail();
        $merchantOrgId = $merchantAssignment->membership->organization_id;

        // 1. Valid matching organization -> ALLOW: TRUE
        $submitResp = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $merchant->id,
                'permission' => 'category.request.submit',
                'active_role_assignment_id' => $merchantAssignment->id,
                'organization_id' => $merchantOrgId,
            ]);

        $submitResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'allow' => true,
                    'reason_code' => 'POLICY_ALLOW',
                ],
            ]);

        // 2. Mismatched organization -> ALLOW: FALSE (ORGANIZATION_SCOPE_MISMATCH)
        $fakeOrgId = (string) Str::uuid();
        $mismatchResp = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $merchant->id,
                'permission' => 'category.request.submit',
                'active_role_assignment_id' => $merchantAssignment->id,
                'organization_id' => $fakeOrgId,
            ]);

        $mismatchResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'allow' => false,
                    'reason_code' => 'ORGANIZATION_SCOPE_MISMATCH',
                ],
            ]);

        // Provider
        $provider = User::where('email', 'provider@servio.id')->firstOrFail();
        $providerAssignment = RoleAssignment::where('user_id', $provider->id)
            ->whereHas('role', fn ($q) => $q->where('code', 'SERVICE_PROVIDER'))
            ->where('status', 'ACTIVE')
            ->firstOrFail();

        $providerResp = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $provider->id,
                'permission' => 'category.request.submit',
                'active_role_assignment_id' => $providerAssignment->id,
                'organization_id' => $providerAssignment->membership->organization_id,
            ]);

        $providerResp->assertStatus(200)->assertJsonPath('data.allow', true);
    }

    /**
     * Requirement 4: Customer cannot perform category mutations
     */
    public function test_internal_evaluate_customer_cannot_mutate_category(): void
    {
        $customer = User::where('email', 'customer@servio.id')->firstOrFail();

        // Customer can read active taxonomy
        $readResp = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $customer->id,
                'permission' => 'category.taxonomy.read_active',
            ]);
        $readResp->assertStatus(200)->assertJsonPath('data.allow', true);

        // Customer CANNOT mutate taxonomy
        $mutationPermissions = [
            'category.taxonomy.create',
            'category.taxonomy.update',
            'category.taxonomy.change_status',
            'category.taxonomy.hard_delete',
            'category.request.review',
        ];

        foreach ($mutationPermissions as $perm) {
            $resp = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
                ->postJson('/internal/v1/authorization/evaluate', [
                    'actor_user_id' => $customer->id,
                    'permission' => $perm,
                ]);

            $resp->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'data' => [
                        'allow' => false,
                        'reason_code' => 'PERMISSION_NOT_GRANTED',
                    ],
                ]);
        }
    }

    /**
     * Requirement 4: Suspended account or revoked session denied
     */
    public function test_internal_evaluate_suspended_or_inactive_account_denied(): void
    {
        $user = User::where('email', 'admin@servio.id')->firstOrFail();
        $user->update(['status' => 'SUSPENDED']);

        $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $user->id,
                'permission' => 'category.taxonomy.create',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'allow' => false,
                    'reason_code' => 'ACCOUNT_INACTIVE_OR_SUSPENDED',
                ],
            ]);
    }

    /**
     * Requirement 4: Unknown permission denied
     */
    public function test_internal_evaluate_unregistered_permission_denied(): void
    {
        $admin = User::where('email', 'admin@servio.id')->firstOrFail();

        $response = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/authorization/evaluate', [
                'actor_user_id' => $admin->id,
                'permission' => 'category.taxonomy.teleport_non_existent',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'allow' => false,
                    'reason_code' => 'PERMISSION_NOT_GRANTED',
                ],
            ]);
    }

    /**
     * Additional Requirement: Microservice Dependency Isolation
     * Identity core operations operate 100% normally without Category Service.
     */
    public function test_identity_core_operations_run_without_category_service_dependency(): void
    {
        // 1. Core Login
        $loginResp = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'customer@servio.id',
            'password' => '12345678',
        ]);

        $loginResp->assertStatus(200);
        $token = $loginResp->json('data.token');
        $this->assertNotEmpty($token);

        // 2. Profile / Auth context fetch
        $profileResp = $this->withHeaders(['Authorization' => 'Bearer ' . $token])
            ->getJson('/api/v1/auth/me');

        $profileResp->assertStatus(200)
            ->assertJsonPath('data.user.email', 'customer@servio.id');

        // 3. Introspect session via internal M2M
        $introspectResp = $this->withHeaders(['X-Internal-Service-Key' => $this->internalKey])
            ->postJson('/internal/v1/auth/sessions/introspect', [
                'session_reference' => $token,
            ]);

        $introspectResp->assertStatus(200)
            ->assertJsonPath('data.active', true);
    }
}
