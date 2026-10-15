<?php

namespace Tests\Unit;

use App\Models\Permission;
use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class IdentityAuthorizationPolicyTest extends TestCase
{
    use DatabaseTransactions;

    public function test_all_nine_official_roles_exist_in_database(): void
    {
        $expectedRoles = [
            'CEO_PRODUCT_OWNER',
            'ADMIN_OPERATIONS',
            'CUSTOMER',
            'SERVICE_PROVIDER',
            'WORKER_TECHNICIAN',
            'CUSTOMER_SUPPORT',
            'FINANCE_PAYMENT_OPS',
            'MERCHANT',
            'SUPPLIER',
        ];

        foreach ($expectedRoles as $roleCode) {
            $this->assertDatabaseHas('roles', ['code' => $roleCode]);
        }
    }

    public function test_eighteen_identity_permissions_exist_in_database(): void
    {
        $expectedPermissions = [
            'identity.profile.read_own',
            'identity.profile.update_own',
            'identity.kyc.submit_own',
            'identity.kyc.review',
            'identity.profile.sensitive_change.review',
            'identity.business.application.create',
            'identity.business.application.update_own',
            'identity.business.application.review',
            'identity.organization.profile.manage',
            'identity.provider.worker.manage',
            'identity.staff.create',
            'identity.staff.read',
            'identity.staff.access.manage',
            'identity.staff.lifecycle.manage',
            'identity.account.suspend',
            'identity.account.read_scoped',
            'identity.audit.read_scoped',
            'identity.auth.session.manage_own',
        ];

        foreach ($expectedPermissions as $permCode) {
            $this->assertDatabaseHas('permissions', ['code' => $permCode]);
        }
    }

    public function test_admin_has_review_permissions_while_customer_does_not(): void
    {
        $adminRole = Role::where('code', 'ADMIN_OPERATIONS')->with('permissions')->first();
        $customerRole = Role::where('code', 'CUSTOMER')->with('permissions')->first();

        $this->assertNotNull($adminRole);
        $this->assertNotNull($customerRole);

        $adminPerms = $adminRole->permissions->pluck('code')->toArray();
        $customerPerms = $customerRole->permissions->pluck('code')->toArray();

        $this->assertContains('identity.business.application.review', $adminPerms);
        // CR02-CEO-KYC: Admin Operations does NOT have identity.kyc.review; it is exclusive to CEO
        $this->assertNotContains('identity.kyc.review', $adminPerms);

        $this->assertNotContains('identity.business.application.review', $customerPerms);
        $this->assertNotContains('identity.kyc.review', $customerPerms);
    }

    public function test_suspended_role_assignment_is_not_active(): void
    {
        $user = User::where('email', 'customer@servio.id')->firstOrFail();
        $role = Role::where('code', 'CUSTOMER')->firstOrFail();

        $assignment = RoleAssignment::where('user_id', $user->id)
            ->where('role_id', $role->id)
            ->first();

        $this->assertNotNull($assignment);
        $this->assertEquals('ACTIVE', $assignment->status);

        // Mutate status to SUSPENDED
        $assignment->status = 'SUSPENDED';
        $assignment->save();

        $isActive = RoleAssignment::where('user_id', $user->id)
            ->where('role_id', $role->id)
            ->where('status', 'ACTIVE')
            ->exists();

        $this->assertFalse($isActive);
    }
}
