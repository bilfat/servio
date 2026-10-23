<?php

namespace Tests\Feature;

use App\Infrastructure\Category\CategoryServiceClient;
use App\Models\Capability;
use App\Models\ServiceDefinition;
use App\Models\ServiceOffering;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminServiceDefinitionAndCapabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_and_activate_canonical_definition(): void
    {
        $catId = (string) Str::uuid();
        $subcatId = (string) Str::uuid();

        // 1. Create canonical definition (Draft)
        $createRes = $this->withHeaders($this->adminHeaders())
            ->postJson('/api/v1/admin/service-definitions', [
                'name' => 'Instalasi Pipa Gas Rumah Tangga',
                'category_id' => $catId,
                'subcategory_id' => $subcatId,
                'description' => 'Instalasi pipa gas sesuai standar keselamatan.',
            ]);

        $createRes->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'SERVICE_DEFINITION_CREATED',
                'data' => [
                    'name' => 'Instalasi Pipa Gas Rumah Tangga',
                    'status' => 'DRAFT',
                ],
            ]);

        $defId = $createRes->json('data.id');

        // 2. Activate canonical definition
        $activateRes = $this->withHeaders($this->adminHeaders())
            ->patchJson("/api/v1/admin/service-definitions/{$defId}/status", [
                'status' => 'ACTIVE',
            ]);

        $activateRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'SERVICE_DEFINITION_STATUS_UPDATED',
                'data' => [
                    'id' => $defId,
                    'status' => 'ACTIVE',
                ],
            ]);
    }

    public function test_admin_cannot_create_canonical_with_non_jasa_category(): void
    {
        // Mock CategoryServiceClient returning non-JASA branch
        CategoryServiceClient::fake(function (string $action, array $params) {
            if ($action === 'checkEligibility') {
                return [
                    'exists' => true,
                    'master_code' => 'PRODUK', // Wrong branch! Must be JASA
                    'effective_active' => true,
                ];
            }
            return null;
        });

        $response = $this->withHeaders($this->adminHeaders())
            ->postJson('/api/v1/admin/service-definitions', [
                'name' => 'Layanan Salah Branch',
                'category_id' => (string) Str::uuid(),
                'subcategory_id' => (string) Str::uuid(),
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_CATEGORY_INVALID_BRANCH',
            ]);
    }

    public function test_admin_can_create_and_update_capability(): void
    {
        // Create
        $createRes = $this->withHeaders($this->adminHeaders())
            ->postJson('/api/v1/admin/capabilities', [
                'code' => 'AC_CERTIFIED_TECHNICIAN',
                'name' => 'Teknisi AC Bersertifikat',
                'description' => 'Keahlian bersertifikat BNSP.',
            ]);

        $createRes->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'CAPABILITY_CREATED',
                'data' => [
                    'code' => 'AC_CERTIFIED_TECHNICIAN',
                    'status' => 'ACTIVE',
                ],
            ]);

        $capId = $createRes->json('data.id');

        // Update
        $updateRes = $this->withHeaders($this->adminHeaders())
            ->patchJson("/api/v1/admin/capabilities/{$capId}", [
                'name' => 'Teknisi AC Bersertifikat BNSP',
            ]);

        $updateRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'CAPABILITY_UPDATED',
                'data' => [
                    'name' => 'Teknisi AC Bersertifikat BNSP',
                ],
            ]);
    }

    public function test_admin_can_read_governance_offerings(): void
    {
        $definition = ServiceDefinition::create([
            'id' => (string) Str::uuid(),
            'code' => 'DEF-TEST-01',
            'name' => 'Layanan Tes',
            'normalized_name' => 'layanan tes',
            'category_id' => (string) Str::uuid(),
            'subcategory_id' => (string) Str::uuid(),
            'status' => 'ACTIVE',
            'created_by_user_id' => 'admin-1',
            'lock_version' => 1,
        ]);

        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $definition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Layanan Provider A',
            'normalized_display_name' => 'layanan provider a',
            'price_model' => 'RANGE',
            'min_price_idr' => 100000,
            'max_price_idr' => 200000,
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        $response = $this->withHeaders($this->adminHeaders())
            ->getJson('/api/v1/governance/service-offerings');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'GOVERNANCE_SERVICE_OFFERINGS_OK',
            ]);

        $this->assertCount(1, $response->json('data.items'));
    }

    public function test_admin_cannot_mutate_provider_offering_directly(): void
    {
        $definition = ServiceDefinition::create([
            'id' => (string) Str::uuid(),
            'code' => 'DEF-TEST-02',
            'name' => 'Layanan Tes 2',
            'normalized_name' => 'layanan tes 2',
            'category_id' => (string) Str::uuid(),
            'subcategory_id' => (string) Str::uuid(),
            'status' => 'ACTIVE',
            'created_by_user_id' => 'admin-1',
            'lock_version' => 1,
        ]);

        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $definition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Layanan Provider B',
            'normalized_display_name' => 'layanan provider b',
            'price_model' => 'RANGE',
            'min_price_idr' => 100000,
            'max_price_idr' => 200000,
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        // Admin tries to call provider mutation endpoint
        $response = $this->withHeaders($this->adminHeaders())
            ->patchJson("/api/v1/provider/services/{$offering->id}", [
                'display_name' => 'Admin Mengubah Nama Jasa',
            ]);

        // Denied: Admin cannot mutate provider offering
        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_FORBIDDEN',
            ]);
    }
}
