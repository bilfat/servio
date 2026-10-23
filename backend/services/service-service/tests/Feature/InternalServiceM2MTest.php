<?php

namespace Tests\Feature;

use App\Models\ServiceCoverageCity;
use App\Models\ServiceDefinition;
use App\Models\ServiceOffering;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class InternalServiceM2MTest extends TestCase
{
    use RefreshDatabase;

    protected ServiceDefinition $definition;
    protected ServiceOffering $offering;

    protected function setUp(): void
    {
        parent::setUp();

        $this->definition = ServiceDefinition::create([
            'id' => (string) Str::uuid(),
            'code' => 'DEF-M2M-01',
            'name' => 'Layanan M2M Snapshot',
            'normalized_name' => 'layanan m2m snapshot',
            'category_id' => (string) Str::uuid(),
            'subcategory_id' => (string) Str::uuid(),
            'status' => 'ACTIVE',
            'created_by_user_id' => 'admin-1',
            'lock_version' => 1,
        ]);

        $this->offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->definition->id,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Cuci AC M2M Snapshot',
            'normalized_display_name' => 'cuci ac m2m snapshot',
            'price_model' => 'RANGE',
            'min_price_idr' => 80000,
            'max_price_idr' => 160000,
            'survey_availability' => 'AVAILABLE',
            'survey_requirement' => 'OPTIONAL',
            'survey_fee_model' => 'PAID',
            'survey_fee_idr' => 40000,
            'duration_min' => 1,
            'duration_max' => 2,
            'duration_unit' => 'HOUR',
            'customer_requirements' => ['Akses listrik'],
            'status' => 'ACTIVE',
            'lock_version' => 3,
        ]);

        ServiceCoverageCity::create([
            'id' => (string) Str::uuid(),
            'offering_id' => $this->offering->id,
            'city_code' => 'JKT-BARAT',
        ]);
    }

    public function test_internal_eligibility_snapshot_for_order_service(): void
    {
        $payload = [
            'city_code' => 'JKT-BARAT',
            'expected_version' => 3,
            'purpose' => 'CREATE_ORDER',
        ];

        $response = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/service-offerings/{$this->offering->id}/eligibility", $payload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'SERVICE_ELIGIBILITY_CHECK_OK',
                'data' => [
                    'eligible' => true,
                    'reason_code' => 'ELIGIBLE',
                    'offering_id' => $this->offering->id,
                    'provider_org_id' => $this->defaultProviderOrg,
                    'definition_id' => $this->definition->id,
                    'offering_version' => 3,
                    'eligible_city_code' => 'JKT-BARAT',
                    'pricing_snapshot' => [
                        'model' => 'RANGE',
                        'min_price_idr' => 80000,
                        'max_price_idr' => 160000,
                        'currency' => 'IDR',
                    ],
                    'survey_snapshot' => [
                        'availability' => 'AVAILABLE',
                        'requirement' => 'OPTIONAL',
                        'fee_model' => 'PAID',
                        'fee_idr' => 40000,
                    ],
                    'duration_snapshot' => [
                        'min' => 1,
                        'max' => 2,
                        'unit' => 'HOUR',
                    ],
                ],
            ]);
    }

    public function test_internal_eligibility_fails_on_stale_expected_version(): void
    {
        $payload = [
            'city_code' => 'JKT-BARAT',
            'expected_version' => 2, // Stale! Actual is 3
            'purpose' => 'CREATE_ORDER',
        ];

        $response = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/service-offerings/{$this->offering->id}/eligibility", $payload);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_OFFERING_VERSION_CONFLICT',
            ]);
    }

    public function test_internal_category_reference_check_blocks_category_hard_delete(): void
    {
        $response = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/category-references/check', [
                'node_type' => 'CATEGORY',
                'node_id' => $this->definition->category_id,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'SERVICE_CATEGORY_REFERENCE_CHECK_OK',
                'data' => [
                    'referenced' => true,
                    'reference_count' => 1,
                    'known_consumer' => 'service-service',
                ],
            ]);
    }
}
