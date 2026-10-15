<?php

namespace Tests\Feature;

use App\Models\Membership;
use App\Models\Organization;
use App\Models\OrganizationProfile;
use App\Models\Role;
use App\Models\RoleAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrganizationMultiTenantIsolationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_tenant_cannot_view_or_mutate_other_organization_profile(): void
    {
        $providerRole = Role::where('code', 'SERVICE_PROVIDER')->firstOrFail();

        // 1. Create Organization A & Owner A
        $orgA = Organization::create(['type' => 'PROVIDER', 'status' => 'ACTIVE', 'activated_at' => now()]);
        $ownerA = User::create([
            'id' => (string) Str::uuid(),
            'email' => 'owner_a_' . uniqid() . '@servio.id',
            'password_hash' => bcrypt('password123'),
            'status' => 'ACTIVE',
        ]);
        $membershipA = Membership::create([
            'user_id' => $ownerA->id,
            'organization_id' => $orgA->id,
            'kind' => 'OWNER',
            'status' => 'ACTIVE',
            'started_at' => now(),
        ]);
        RoleAssignment::create([
            'user_id' => $ownerA->id,
            'role_id' => $providerRole->id,
            'membership_id' => $membershipA->id,
            'status' => 'ACTIVE',
            'assigned_at' => now(),
        ]);
        OrganizationProfile::create([
            'organization_id' => $orgA->id,
            'legal_name' => 'Bengkel Alpha',
            'display_name' => 'Alpha Auto',
        ]);

        // 2. Create Organization B & Owner B
        $orgB = Organization::create(['type' => 'PROVIDER', 'status' => 'ACTIVE', 'activated_at' => now()]);
        $ownerB = User::create([
            'id' => (string) Str::uuid(),
            'email' => 'owner_b_' . uniqid() . '@servio.id',
            'password_hash' => bcrypt('password123'),
            'status' => 'ACTIVE',
        ]);
        $membershipB = Membership::create([
            'user_id' => $ownerB->id,
            'organization_id' => $orgB->id,
            'kind' => 'OWNER',
            'status' => 'ACTIVE',
            'started_at' => now(),
        ]);
        RoleAssignment::create([
            'user_id' => $ownerB->id,
            'role_id' => $providerRole->id,
            'membership_id' => $membershipB->id,
            'status' => 'ACTIVE',
            'assigned_at' => now(),
        ]);
        OrganizationProfile::create([
            'organization_id' => $orgB->id,
            'legal_name' => 'Bengkel Beta',
            'display_name' => 'Beta Auto',
        ]);

        $authA = $this->authenticateAs($ownerA, 'SERVICE_PROVIDER', $orgA->id);

        // 3. Owner A attempts to get Org B details -> 403 Forbidden
        $getRes = $this->withHeaders($authA['headers'])
            ->getJson("/api/v1/organizations/{$orgB->id}");
        $getRes->assertStatus(403);

        // 4. Owner A attempts to update Org B profile -> 403 Forbidden
        $putRes = $this->withHeaders($authA['headers'])
            ->putJson("/api/v1/organizations/{$orgB->id}", [
                'display_name' => 'Hacked Name',
            ]);
        $putRes->assertStatus(403);

        // 5. Owner A attempts to list Org B memberships -> 403 Forbidden
        $memberRes = $this->withHeaders($authA['headers'])
            ->getJson("/api/v1/organizations/{$orgB->id}/memberships");
        $memberRes->assertStatus(403);
    }
}
