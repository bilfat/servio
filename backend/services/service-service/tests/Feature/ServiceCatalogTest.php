<?php

namespace Tests\Feature;

use App\Models\Capability;
use App\Models\ServiceCoverageCity;
use App\Models\ServiceDefinition;
use App\Models\ServiceOffering;
use App\Models\ServiceOfferingMedia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ServiceCatalogTest extends TestCase
{
    use RefreshDatabase;

    protected ServiceDefinition $activeDefinition;

    protected function setUp(): void
    {
        parent::setUp();

        $this->activeDefinition = ServiceDefinition::create([
            'id' => (string) Str::uuid(),
            'code' => 'DEF-CUCI-AC-01',
            'name' => 'Cuci AC Standard',
            'normalized_name' => 'cuci ac standard',
            'category_id' => (string) Str::uuid(),
            'subcategory_id' => (string) Str::uuid(),
            'description' => 'Layanan pembersihan AC indoor & outdoor.',
            'status' => 'ACTIVE',
            'created_by_user_id' => 'admin-1',
            'lock_version' => 1,
        ]);
    }

    public function test_health_check_returns_ok(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'SERVICE_HEALTH_OK',
                'data' => [
                    'service' => 'servio-service-service',
                    'status' => 'UP',
                ],
            ]);
    }

    public function test_public_services_without_city_returns_location_required(): void
    {
        $response = $this->getJson('/api/v1/services');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'SERVICE_CATALOG_OK',
                'data' => [
                    'items' => [],
                    'location_required' => true,
                    'selected_city_code' => null,
                ],
            ]);
    }

    public function test_public_services_with_city_returns_matching_offerings(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Cuci AC Inverter Cepat Bersih',
            'normalized_display_name' => 'cuci ac inverter cepat bersih',
            'price_model' => 'RANGE',
            'min_price_idr' => 75000,
            'max_price_idr' => 150000,
            'currency' => 'IDR',
            'survey_availability' => 'NOT_AVAILABLE',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        ServiceCoverageCity::create([
            'id' => (string) Str::uuid(),
            'offering_id' => $offering->id,
            'city_code' => 'JKT-BARAT',
            'city_label_snapshot' => 'Kota Jakarta Barat',
        ]);

        // Search with matching city: JKT-BARAT
        $responseMatch = $this->getJson('/api/v1/services?city_code=JKT-BARAT');
        $responseMatch->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'location_required' => false,
                    'selected_city_code' => 'JKT-BARAT',
                ],
            ]);
        $this->assertCount(1, $responseMatch->json('data.items'));
        $this->assertEquals($offering->id, $responseMatch->json('data.items.0.id'));

        // Search with non-matching city: BDG-KOTA
        $responseNoMatch = $this->getJson('/api/v1/services?city_code=BDG-KOTA');
        $responseNoMatch->assertStatus(200);
        $this->assertCount(0, $responseNoMatch->json('data.items'));
    }

    public function test_public_service_detail_serviceable_in_covered_city(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Cuci AC Inverter Cepat Bersih',
            'normalized_display_name' => 'cuci ac inverter cepat bersih',
            'price_model' => 'RANGE',
            'min_price_idr' => 75000,
            'max_price_idr' => 150000,
            'currency' => 'IDR',
            'survey_availability' => 'NOT_AVAILABLE',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        ServiceCoverageCity::create([
            'id' => (string) Str::uuid(),
            'offering_id' => $offering->id,
            'city_code' => 'JKT-BARAT',
        ]);

        $response = $this->getJson("/api/v1/services/{$offering->id}?city_code=JKT-BARAT");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $offering->id,
                    'location' => [
                        'selected_city_code' => 'JKT-BARAT',
                        'serviceable' => true,
                        'location_required' => false,
                    ],
                    'next_action' => [
                        'kind' => 'ORDER_JASA',
                        'enabled' => true,
                        'reason_code' => 'ELIGIBLE',
                    ],
                ],
            ]);
    }

    public function test_public_service_detail_disabled_in_uncovered_city(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Cuci AC Inverter Cepat Bersih',
            'normalized_display_name' => 'cuci ac inverter cepat bersih',
            'price_model' => 'RANGE',
            'min_price_idr' => 75000,
            'max_price_idr' => 150000,
            'currency' => 'IDR',
            'survey_availability' => 'NOT_AVAILABLE',
            'status' => 'ACTIVE',
            'lock_version' => 1,
        ]);

        ServiceCoverageCity::create([
            'id' => (string) Str::uuid(),
            'offering_id' => $offering->id,
            'city_code' => 'JKT-BARAT',
        ]);

        $response = $this->getJson("/api/v1/services/{$offering->id}?city_code=CITY_CODE_9");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $offering->id,
                    'location' => [
                        'selected_city_code' => 'CITY_CODE_9',
                        'serviceable' => false,
                    ],
                    'next_action' => [
                        'kind' => 'ORDER_JASA',
                        'enabled' => false,
                        'reason_code' => 'OUTSIDE_SERVICE_COVERAGE',
                    ],
                ],
            ]);
    }

    public function test_public_service_detail_draft_or_inactive_returns_404(): void
    {
        $draftOffering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Draft Layanan',
            'normalized_display_name' => 'draft layanan',
            'price_model' => 'RANGE',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        $response = $this->getJson("/api/v1/services/{$draftOffering->id}?city_code=JKT-BARAT");
        $response->assertStatus(404);
    }
}
