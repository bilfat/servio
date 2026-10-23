<?php

namespace Tests\Feature;

use App\Models\ServiceDefinition;
use App\Models\ServiceOffering;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProviderServiceOfferingTest extends TestCase
{
    use RefreshDatabase;

    protected ServiceDefinition $activeDefinition;

    protected function setUp(): void
    {
        parent::setUp();

        $this->activeDefinition = ServiceDefinition::create([
            'id' => (string) Str::uuid(),
            'code' => 'DEF-AC-02',
            'name' => 'Perbaikan Kompresor AC',
            'normalized_name' => 'perbaikan kompresor ac',
            'category_id' => (string) Str::uuid(),
            'subcategory_id' => (string) Str::uuid(),
            'status' => 'ACTIVE',
            'created_by_user_id' => 'admin-1',
            'lock_version' => 1,
        ]);
    }

    public function test_provider_can_create_draft_offering(): void
    {
        $payload = [
            'service_definition_id' => $this->activeDefinition->id,
            'display_name' => 'Servis Kompresor AC Berkualitas',
            'description' => 'Servis unit kompresor bergaransi.',
            'pricing' => [
                'model' => 'RANGE',
                'min_price_idr' => 150000,
                'max_price_idr' => 300000,
            ],
            'survey' => [
                'availability' => 'AVAILABLE',
                'requirement' => 'OPTIONAL',
                'fee_model' => 'PAID',
                'fee_idr' => 50000,
            ],
            'coverage_city_codes' => ['JKT-BARAT', 'JKT-SEL'],
        ];

        $response = $this->withHeaders($this->providerHeaders())
            ->postJson('/api/v1/provider/services', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'SERVICE_OFFERING_CREATED',
                'data' => [
                    'status' => 'DRAFT',
                    'display_name' => 'Servis Kompresor AC Berkualitas',
                    'provider_organization_id' => $this->defaultProviderOrg,
                    'pricing' => [
                        'model' => 'RANGE',
                        'min_price_idr' => 150000,
                        'max_price_idr' => 300000,
                    ],
                ],
            ]);

        $this->assertDatabaseHas('service_offerings', [
            'display_name' => 'Servis Kompresor AC Berkualitas',
            'status' => 'DRAFT',
            'provider_organization_id' => $this->defaultProviderOrg,
        ]);
    }

    public function test_provider_cannot_create_offering_with_radius_km(): void
    {
        $payload = [
            'service_definition_id' => $this->activeDefinition->id,
            'display_name' => 'Layanan Berbasis Radius',
            'radius_km' => 15, // FORBIDDEN!
        ];

        $response = $this->withHeaders($this->providerHeaders())
            ->postJson('/api/v1/provider/services', $payload);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_UNSUPPORTED_FIELD',
            ]);
    }

    public function test_provider_cannot_create_duplicate_offering_for_same_canonical(): void
    {
        ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Layanan Pertama',
            'normalized_display_name' => 'layanan pertama',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        $payload = [
            'service_definition_id' => $this->activeDefinition->id,
            'display_name' => 'Layanan Kedua Duplikat',
        ];

        $response = $this->withHeaders($this->providerHeaders())
            ->postJson('/api/v1/provider/services', $payload);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_DUPLICATE_OFFERING',
            ]);
    }

    public function test_provider_cannot_create_offering_with_invalid_price_range(): void
    {
        $payload = [
            'service_definition_id' => $this->activeDefinition->id,
            'display_name' => 'Harga Min Lebih Besar Max',
            'pricing' => [
                'model' => 'RANGE',
                'min_price_idr' => 500000,
                'max_price_idr' => 200000, // Invalid: max < min
            ],
        ];

        $response = $this->withHeaders($this->providerHeaders())
            ->postJson('/api/v1/provider/services', $payload);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_PRICE_SURVEY_CONFLICT',
            ]);
    }

    public function test_provider_can_update_offering_details_with_if_match(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Nama Lama',
            'normalized_display_name' => 'nama lama',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        $headers = array_merge($this->providerHeaders(), ['If-Match' => '"1"']);

        $response = $this->withHeaders($headers)
            ->patchJson("/api/v1/provider/services/{$offering->id}", [
                'display_name' => 'Nama Baru Diperbarui',
                'description' => 'Deskripsi baru.',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'SERVICE_OFFERING_UPDATED',
                'data' => [
                    'display_name' => 'Nama Baru Diperbarui',
                    'lock_version' => 2,
                ],
            ]);
    }

    public function test_provider_update_fails_without_if_match(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Nama Lama',
            'normalized_display_name' => 'nama lama',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        $response = $this->withHeaders($this->providerHeaders())
            ->patchJson("/api/v1/provider/services/{$offering->id}", [
                'display_name' => 'Nama Baru',
            ]);

        $response->assertStatus(428)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_VERSION_PRECONDITION_REQUIRED',
            ]);
    }

    public function test_provider_update_fails_on_version_mismatch(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Nama Lama',
            'normalized_display_name' => 'nama lama',
            'status' => 'DRAFT',
            'lock_version' => 2, // Current is 2
        ]);

        $headers = array_merge($this->providerHeaders(), ['If-Match' => '"1"']); // Sending stale version 1

        $response = $this->withHeaders($headers)
            ->patchJson("/api/v1/provider/services/{$offering->id}", [
                'display_name' => 'Nama Baru',
            ]);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_VERSION_CONFLICT',
            ]);
    }

    public function test_provider_cannot_change_canonical_definition_id(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Layanan Uji',
            'normalized_display_name' => 'layanan uji',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        $headers = array_merge($this->providerHeaders(), ['If-Match' => '"1"']);

        $response = $this->withHeaders($headers)
            ->patchJson("/api/v1/provider/services/{$offering->id}", [
                'service_definition_id' => (string) Str::uuid(), // Forbidden mutation
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_IMMUTABLE_FIELD',
            ]);
    }
}
