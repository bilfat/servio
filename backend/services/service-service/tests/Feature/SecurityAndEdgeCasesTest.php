<?php

namespace Tests\Feature;

use App\Infrastructure\Category\CategoryServiceClient;
use App\Infrastructure\Identity\IdentityServiceClient;
use App\Models\Capability;
use App\Models\ServiceCoverageCity;
use App\Models\ServiceDefinition;
use App\Models\ServiceOffering;
use App\Models\ServiceOfferingMedia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Tests\TestCase;

class SecurityAndEdgeCasesTest extends TestCase
{
    use RefreshDatabase;

    protected ServiceDefinition $activeDefinition;

    protected function setUp(): void
    {
        parent::setUp();

        $this->activeDefinition = ServiceDefinition::create([
            'id' => (string) Str::uuid(),
            'code' => 'DEF-AC-SEC-01',
            'name' => 'Instalasi AC Inverter',
            'normalized_name' => 'instalasi ac inverter',
            'category_id' => (string) Str::uuid(),
            'subcategory_id' => (string) Str::uuid(),
            'status' => 'ACTIVE',
            'created_by_user_id' => 'admin-1',
            'lock_version' => 1,
        ]);
    }

    /**
     * 1. Authorization spoofing / untrusted gateway context
     */
    public function test_rejects_untrusted_gateway_key_when_actor_headers_provided(): void
    {
        $headers = [
            'X-Gateway-Key' => 'spoofed-fake-key-12345',
            'X-Actor-User-Id' => 'some-user',
            'X-Actor-Role' => 'SERVICE_PROVIDER',
            'X-Actor-Org-Id' => $this->defaultProviderOrg,
        ];

        $response = $this->withHeaders($headers)
            ->getJson('/api/v1/provider/services');

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_UNTRUSTED_GATEWAY_CONTEXT',
            ]);
    }

    /**
     * 2. Missing authentication on protected provider endpoint
     */
    public function test_rejects_unauthenticated_access_to_provider_routes(): void
    {
        // Calling with only valid gateway key, but no actor credentials
        $response = $this->withHeaders([
            'X-Gateway-Key' => config('services.gateway.key', 'servio_local_gateway_key_2026'),
        ])->getJson('/api/v1/provider/services');

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_UNAUTHENTICATED',
            ]);
    }

    /**
     * 3. Cross-provider data access isolation
     */
    public function test_provider_cannot_view_or_modify_another_providers_offering(): void
    {
        $otherOrgId = '99999999-9999-4999-8999-999999999999';

        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $otherOrgId,
            'service_definition_id' => $this->activeDefinition->id,
            'canonical_code' => $this->activeDefinition->code,
            'created_by_user_id' => 'other-user',
            'display_name' => 'Jasa Milik Provider Lain',
            'normalized_display_name' => 'jasa milik provider lain',
            'price_model' => 'FREE',
            'survey_availability' => 'NOT_AVAILABLE',
            'survey_requirement' => 'NONE',
            'survey_fee_model' => 'FREE',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        // Attempt to view offering with default provider org
        $responseView = $this->withHeaders($this->providerHeaders())
            ->getJson("/api/v1/provider/services/{$offering->id}");

        $responseView->assertStatus(404)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_NOT_FOUND',
            ]);

        // Attempt to update offering with default provider org
        $responseUpdate = $this->withHeaders($this->providerHeaders())
            ->withHeader('If-Match', '1')
            ->patchJson("/api/v1/provider/services/{$offering->id}", [
                'display_name' => 'Perubahan Ilegal Oleh Provider Lain',
            ]);

        $responseUpdate->assertStatus(404)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_NOT_FOUND',
            ]);
    }

    /**
     * 4. Idempotency handling (duplicate key with different vs identical payload)
     */
    public function test_idempotency_cached_on_same_payload_and_rejected_on_conflicting_payload(): void
    {
        $idempotencyKey = (string) Str::uuid();

        $payload1 = [
            'service_definition_id' => $this->activeDefinition->id,
            'display_name' => 'Layanan Idempotensi 1',
            'pricing' => [
                'model' => 'FREE',
            ],
            'survey' => [
                'availability' => 'NOT_AVAILABLE',
            ],
            'coverage_city_codes' => ['JKT-BARAT'],
        ];

        // First attempt -> Created 201
        $resp1 = $this->withHeaders($this->providerHeaders())
            ->withHeader('Idempotency-Key', $idempotencyKey)
            ->postJson('/api/v1/provider/services', $payload1);

        $resp1->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'SERVICE_OFFERING_CREATED',
            ]);

        $createdId = $resp1->json('data.id');

        // Second attempt with SAME idempotency key and SAME payload -> Cached 201 response
        $resp2 = $this->withHeaders($this->providerHeaders())
            ->withHeader('Idempotency-Key', $idempotencyKey)
            ->postJson('/api/v1/provider/services', $payload1);

        $resp2->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'SERVICE_OFFERING_CREATED',
                'data' => [
                    'id' => $createdId,
                ],
            ]);

        // Third attempt with SAME idempotency key but DIFFERENT payload -> 409 Conflict
        $payload2 = $payload1;
        $payload2['display_name'] = 'Layanan Idempotensi 2 Berbeda Payload';

        $resp3 = $this->withHeaders($this->providerHeaders())
            ->withHeader('Idempotency-Key', $idempotencyKey)
            ->postJson('/api/v1/provider/services', $payload2);

        $resp3->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_IDEMPOTENCY_KEY_REUSED',
            ]);
    }

    /**
     * 5. Concurrency control via If-Match lock_version
     */
    public function test_concurrency_conflict_detected_when_lock_version_mismatched(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'canonical_code' => $this->activeDefinition->code,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Layanan Bersaing',
            'normalized_display_name' => 'layanan bersaing',
            'price_model' => 'FREE',
            'survey_availability' => 'NOT_AVAILABLE',
            'survey_requirement' => 'NONE',
            'survey_fee_model' => 'FREE',
            'status' => 'DRAFT',
            'lock_version' => 2,
        ]);

        // Request provides outdated If-Match: 1
        $response = $this->withHeaders($this->providerHeaders())
            ->withHeader('If-Match', '1')
            ->patchJson("/api/v1/provider/services/{$offering->id}", [
                'display_name' => 'Update Dengan Versi Usang',
            ]);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_VERSION_CONFLICT',
            ]);
    }

    /**
     * 6. Upload security: Unsupported MIME type
     */
    public function test_rejects_unsupported_or_executable_file_uploads(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'canonical_code' => $this->activeDefinition->code,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Layanan Uji Media',
            'normalized_display_name' => 'layanan uji media',
            'price_model' => 'FREE',
            'survey_availability' => 'NOT_AVAILABLE',
            'survey_requirement' => 'NONE',
            'survey_fee_model' => 'FREE',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        $fakeExe = UploadedFile::fake()->create('malicious.exe', 100, 'application/x-msdownload');

        $response = $this->withHeaders($this->providerHeaders())
            ->postJson("/api/v1/provider/services/{$offering->id}/media", [
                'file' => $fakeExe,
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_VALIDATION_FAILED',
            ]);
    }

    /**
     * 7. Upload security: Oversized file (> 5MB)
     */
    public function test_rejects_oversized_file_uploads(): void
    {
        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $this->activeDefinition->id,
            'canonical_code' => $this->activeDefinition->code,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Layanan Uji Media Ukuran',
            'normalized_display_name' => 'layanan uji media ukuran',
            'price_model' => 'FREE',
            'survey_availability' => 'NOT_AVAILABLE',
            'survey_requirement' => 'NONE',
            'survey_fee_model' => 'FREE',
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        // 6 MB image file (create with dummy content, no GD required)
        $oversizedJpg = UploadedFile::fake()->create('huge.jpg', 6000, 'image/jpeg');

        $response = $this->withHeaders($this->providerHeaders())
            ->postJson("/api/v1/provider/services/{$offering->id}/media", [
                'file' => $oversizedJpg,
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_VALIDATION_FAILED',
            ]);
    }

    /**
     * 8. Dependency timeout / failure during direct activation: Category Service down
     */
    public function test_activation_fails_closed_when_category_service_is_unavailable(): void
    {
        $offering = $this->createPublishableOffering();

        // Simulate Category Service timeout/outage
        CategoryServiceClient::fake(function (string $action) {
            return null; // triggers 503
        });

        $response = $this->withHeaders($this->providerHeaders())
            ->withHeader('If-Match', '1')
            ->patchJson("/api/v1/provider/services/{$offering->id}/status", [
                'status' => 'ACTIVE',
            ]);

        $response->assertStatus(503)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_CATEGORY_UNAVAILABLE',
            ]);
    }

    /**
     * 9. Dependency timeout / failure during direct activation: Identity Service down
     */
    public function test_activation_fails_closed_when_identity_service_is_unavailable(): void
    {
        $offering = $this->createPublishableOffering();

        // Category responds OK, but Identity times out/fails
        CategoryServiceClient::fake(function () {
            return [
                'exists' => true,
                'master_code' => 'JASA',
                'stored_status' => 'ACTIVE',
            ];
        });

        IdentityServiceClient::fake(function (string $action) {
            if ($action === 'getOrganizationStatus') {
                return null; // triggers 503
            }
            return ['allow' => true, 'authz_version' => 1];
        });

        $response = $this->withHeaders($this->providerHeaders())
            ->withHeader('If-Match', '1')
            ->patchJson("/api/v1/provider/services/{$offering->id}/status", [
                'status' => 'ACTIVE',
            ]);

        $response->assertStatus(503)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_IDENTITY_UNAVAILABLE',
            ]);
    }

    /**
     * 10. Provider organization suspended in Identity Service
     */
    public function test_activation_rejected_when_provider_organization_is_suspended(): void
    {
        $offering = $this->createPublishableOffering();

        CategoryServiceClient::fake(function () {
            return [
                'exists' => true,
                'master_code' => 'JASA',
                'stored_status' => 'ACTIVE',
            ];
        });

        IdentityServiceClient::fake(function (string $action, array $params) {
            if ($action === 'getOrganizationStatus') {
                return [
                    'organization_id' => $params['organization_id'],
                    'type' => 'PROVIDER',
                    'status' => 'SUSPENDED',
                ];
            }
            return ['allow' => true, 'authz_version' => 1];
        });

        $response = $this->withHeaders($this->providerHeaders())
            ->withHeader('If-Match', '1')
            ->patchJson("/api/v1/provider/services/{$offering->id}/status", [
                'status' => 'ACTIVE',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_PROVIDER_INACTIVE',
            ]);
    }

    /**
     * 11. Category branch not JASA (e.g., BARANG root)
     */
    public function test_activation_rejected_when_category_branch_is_not_jasa(): void
    {
        $offering = $this->createPublishableOffering();

        CategoryServiceClient::fake(function () {
            return [
                'exists' => true,
                'master_code' => 'BARANG', // Invalid branch
                'stored_status' => 'ACTIVE',
            ];
        });

        IdentityServiceClient::fake(function (string $action, array $params) {
            if ($action === 'getOrganizationStatus') {
                return [
                    'organization_id' => $this->defaultProviderOrg,
                    'status' => 'ACTIVE',
                ];
            }
            return ['allow' => true, 'authz_version' => 1];
        });

        $response = $this->withHeaders($this->providerHeaders())
            ->withHeader('If-Match', '1')
            ->patchJson("/api/v1/provider/services/{$offering->id}/status", [
                'status' => 'ACTIVE',
            ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_CATEGORY_INVALID_BRANCH',
            ]);
    }

    /**
     * 12. Canonical Service Definition is INACTIVE
     */
    public function test_activation_rejected_when_canonical_definition_is_inactive(): void
    {
        $inactiveDef = ServiceDefinition::create([
            'id' => (string) Str::uuid(),
            'code' => 'DEF-INACTIVE-01',
            'name' => 'Jasa Nonaktif',
            'normalized_name' => 'jasa nonaktif',
            'category_id' => (string) Str::uuid(),
            'subcategory_id' => (string) Str::uuid(),
            'status' => 'INACTIVE',
            'created_by_user_id' => 'admin-1',
            'lock_version' => 1,
        ]);

        $offering = $this->createPublishableOffering($inactiveDef);

        $response = $this->withHeaders($this->providerHeaders())
            ->withHeader('If-Match', '1')
            ->patchJson("/api/v1/provider/services/{$offering->id}/status", [
                'status' => 'ACTIVE',
            ]);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'SERVICE_CANONICAL_INACTIVE',
            ]);
    }

    /**
     * 13. Category guarded hard-delete reference protection
     */
    public function test_internal_endpoint_detects_category_references_for_hard_delete_protection(): void
    {
        $targetCatId = $this->activeDefinition->category_id;

        $response = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/category-references/check', [
                'node_type' => 'CATEGORY',
                'node_id' => $targetCatId,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'SERVICE_CATEGORY_REFERENCE_CHECK_OK',
                'data' => [
                    'referenced' => true,
                    'reference_count' => 1,
                    'authoritative' => true,
                ],
            ]);
    }

    protected function createPublishableOffering(?ServiceDefinition $def = null): ServiceOffering
    {
        $def = $def ?: $this->activeDefinition;

        $offering = ServiceOffering::create([
            'id' => (string) Str::uuid(),
            'provider_organization_id' => $this->defaultProviderOrg,
            'service_definition_id' => $def->id,
            'canonical_code' => $def->code,
            'created_by_user_id' => $this->defaultProviderUser,
            'display_name' => 'Jasa Uji Publikasi Lengkap',
            'normalized_display_name' => 'jasa uji publikasi lengkap',
            'price_model' => 'RANGE',
            'min_price_idr' => 100000,
            'max_price_idr' => 200000,
            'survey_availability' => 'AVAILABLE',
            'survey_requirement' => 'OPTIONAL',
            'survey_fee_model' => 'PAID',
            'survey_fee_idr' => 50000,
            'status' => 'DRAFT',
            'lock_version' => 1,
        ]);

        ServiceCoverageCity::create([
            'id' => (string) Str::uuid(),
            'offering_id' => $offering->id,
            'city_code' => 'JKT-BARAT',
            'city_label_snapshot' => 'Kota Administrasi Jakarta Barat',
        ]);

        ServiceOfferingMedia::create([
            'id' => (string) Str::uuid(),
            'offering_id' => $offering->id,
            'storage_disk' => 'local',
            'storage_key' => "service-media/{$offering->id}/test.jpg",
            'mime_type' => 'image/jpeg',
            'bytes' => 12345,
            'sha256' => hash('sha256', 'dummy'),
            'sort_order' => 0,
            'is_primary' => true,
            'storage_state' => 'READY',
        ]);

        return $offering;
    }
}
