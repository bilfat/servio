<?php

namespace Tests\Feature;

use App\Models\ServiceCoverageCity;
use App\Models\ServiceDefinition;
use App\Models\ServiceOffering;
use App\Models\ServiceOfferingMedia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DirectActivationTest extends TestCase
{
    use RefreshDatabase;

    protected ServiceDefinition $activeDefinition;

    protected function setUp(): void
    {
        parent::setUp();

        $this->activeDefinition = ServiceDefinition::create([
            'id' => (string) Str::uuid(),
            'code' => 'DEF-SURVEI-01',
            'name' => 'Instalasi AC Multi-Split',
            'normalized_name' => 'instalasi ac multi-split',
            'category_id' => (string) Str::uuid(),
            'subcategory_id' => (string) Str::uuid(),
            'status' => 'ACTIVE',
            'created_by_user_id' => 'admin-1',
            'lock_version' => 1,
        ]);
    }

    public function test_provider_cannot_activate_without_coverage_cities(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Instalasi AC',
            'normalized_display_name' => 'instalasi ac',
            'price_model' => 'RANGE',
            'min_price_idr' => 200000,
            'max_price_idr' => 400000,
            'survey_availability' => 'NOT_AVAILABLE',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        // Add primary media, but NO coverage city
        ServiceOfferingMedia::create([
            'id' => (string) Str::uuid(),
            'offering_id' => $offering->id,
            'storage_key' => 'test/photo.jpg',
            'mime_type' => 'image/jpeg',
            'bytes' => 1024,
            'is_primary' => true,
            'storage_state' => 'READY',
        ]);

        $headers = array_merge($this->providerHeaders(), ['If-Match' => '"1"']);

        $response = $this->withHeaders($headers)
            ->patchJson("/api/v1/provider/services/{$offering->id}/status", [
                'status' => 'ACTIVE',
            ]);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_COVERAGE_REQUIRED',
            ]);
    }

    public function test_provider_cannot_activate_without_primary_media(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Instalasi AC',
            'normalized_display_name' => 'instalasi ac',
            'price_model' => 'RANGE',
            'min_price_idr' => 200000,
            'max_price_idr' => 400000,
            'survey_availability' => 'NOT_AVAILABLE',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        // Add coverage city, but NO primary media
        ServiceCoverageCity::create([
            'id' => (string) Str::uuid(),
            'offering_id' => $offering->id,
            'city_code' => 'JKT-BARAT',
        ]);

        $headers = array_merge($this->providerHeaders(), ['If-Match' => '"1"']);

        $response = $this->withHeaders($headers)
            ->patchJson("/api/v1/provider/services/{$offering->id}/status", [
                'status' => 'ACTIVE',
            ]);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_MEDIA_PRIMARY_REQUIRED',
            ]);
    }

    public function test_direct_activation_succeeds_without_admin_approval(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Instalasi AC Siap Aktif',
            'normalized_display_name' => 'instalasi ac siap aktif',
            'price_model' => 'RANGE',
            'min_price_idr' => 200000,
            'max_price_idr' => 400000,
            'survey_availability' => 'NOT_AVAILABLE',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        // Add coverage city
        ServiceCoverageCity::create([
            'id' => (string) Str::uuid(),
            'offering_id' => $offering->id,
            'city_code' => 'JKT-BARAT',
        ]);

        // Add primary ready media
        ServiceOfferingMedia::create([
            'id' => (string) Str::uuid(),
            'offering_id' => $offering->id,
            'storage_key' => 'test/photo.jpg',
            'mime_type' => 'image/jpeg',
            'bytes' => 1024,
            'is_primary' => true,
            'storage_state' => 'READY',
        ]);

        $headers = array_merge($this->providerHeaders(), ['If-Match' => '"1"']);

        $response = $this->withHeaders($headers)
            ->patchJson("/api/v1/provider/services/{$offering->id}/status", [
                'status' => 'ACTIVE',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'SERVICE_OFFERING_ACTIVATED',
                'data' => [
                    'id' => $offering->id,
                    'status' => 'ACTIVE',
                    'publication' => [
                        'requires_admin_approval' => false,
                        'visibility' => 'IMMEDIATE_ELIGIBILITY',
                    ],
                    'public_eligible' => true,
                    'lock_version' => 2,
                ],
            ]);

        $this->assertDatabaseHas('service_offerings', [
            'id' => $offering->id,
            'status' => 'ACTIVE',
            'lock_version' => 2,
        ]);

        // Outbox event was emitted
        $this->assertDatabaseHas('service_outbox_events', [
            'aggregate_type' => 'SERVICE_OFFERING',
            'aggregate_id' => $offering->id,
            'event_type' => 'ServiceOfferingPublished.v1',
        ]);
    }

    public function test_provider_can_deactivate_active_offering(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Layanan Sedang Aktif',
            'normalized_display_name' => 'layanan sedang aktif',
            'price_model' => 'RANGE',
            'min_price_idr' => 200000,
            'max_price_idr' => 400000,
            'status' => 'ACTIVE',
            'lock_version' => 2,
        ]);

        $headers = array_merge($this->providerHeaders(), ['If-Match' => '"2"']);

        $response = $this->withHeaders($headers)
            ->patchJson("/api/v1/provider/services/{$offering->id}/status", [
                'status' => 'INACTIVE',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'SERVICE_OFFERING_DEACTIVATED',
                'data' => [
                    'id' => $offering->id,
                    'status' => 'INACTIVE',
                    'lock_version' => 3,
                ],
            ]);
    }

    public function test_cannot_delete_primary_media_while_offering_is_active(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Layanan Aktif',
            'normalized_display_name' => 'layanan aktif',
            'price_model' => 'RANGE',
            'min_price_idr' => 200000,
            'max_price_idr' => 400000,
            'status' => 'ACTIVE',
            'lock_version' => 2,
        ]);

        $media = ServiceOfferingMedia::create([
            'id' => (string) Str::uuid(),
            'offering_id' => $offering->id,
            'storage_key' => 'test/photo.jpg',
            'mime_type' => 'image/jpeg',
            'bytes' => 1024,
            'is_primary' => true,
            'storage_state' => 'READY',
        ]);

        $response = $this->withHeaders($this->providerHeaders())
            ->deleteJson("/api/v1/provider/services/{$offering->id}/media/{$media->id}");

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_MEDIA_PRIMARY_REQUIRED',
            ]);
    }
}
