<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\OrderWarrantyEntitlement;
use App\Models\WarrantyOption;
use Tests\TestCase;

class WarrantyOptionAndEntitlementTest extends TestCase
{
    public function test_merchant_can_create_warranty_option_with_custom_days(): void
    {
        $headers = $this->merchantHeaders('merch-1', 'org-merchant-101');

        $response = $this->postJson('/api/v1/after-sales/business/warranty-options', [
            'name' => 'Garansi Resmi Toko 30 Hari',
            'duration_days' => 30,
            'coverage_text' => 'Meliputi kerusakan mesin dan fungsi utama.',
            'exclusion_text' => 'Tidak meliputi kerusakan akibat kelalaian pembeli.',
        ], $headers);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.org_id', 'org-merchant-101')
            ->assertJsonPath('data.status', 'ACTIVE')
            ->assertJsonPath('data.latest_version.duration_days', 30);

        $this->assertDatabaseHas('warranty_options', [
            'org_id' => 'org-merchant-101',
            'status' => 'ACTIVE',
        ]);

        $this->assertDatabaseHas('warranty_option_versions', [
            'name' => 'Garansi Resmi Toko 30 Hari',
            'duration_days' => 30,
            'version_no' => 1,
        ]);
    }

    public function test_cannot_create_warranty_with_zero_or_negative_days(): void
    {
        $headers = $this->merchantHeaders('merch-1', 'org-merchant-101');

        $response = $this->postJson('/api/v1/after-sales/business/warranty-options', [
            'name' => 'Garansi Invalid',
            'duration_days' => 0,
            'coverage_text' => 'Cakupan',
        ], $headers);

        $response->assertStatus(422);
    }

    public function test_merchant_can_publish_new_version_when_updating_warranty(): void
    {
        $headers = $this->merchantHeaders('merch-1', 'org-merchant-101');

        // Initial creation
        $createRes = $this->postJson('/api/v1/after-sales/business/warranty-options', [
            'name' => 'Garansi Mesin 60 Hari',
            'duration_days' => 60,
            'coverage_text' => 'Versi 1 cakupan.',
        ], $headers);

        $optionId = $createRes->json('data.id');

        // Update creates version 2
        $updateRes = $this->patchJson("/api/v1/after-sales/business/warranty-options/{$optionId}", [
            'name' => 'Garansi Mesin 90 Hari (Diperpanjang)',
            'duration_days' => 90,
            'coverage_text' => 'Versi 2 cakupan lebih luas.',
            'exclusion_text' => 'Kecuali bencana alam.',
        ], $headers);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.latest_version.version_no', 2)
            ->assertJsonPath('data.latest_version.duration_days', 90);

        $this->assertDatabaseHas('warranty_option_versions', [
            'option_id' => $optionId,
            'version_no' => 2,
            'duration_days' => 90,
        ]);
    }

    public function test_cross_organization_access_forbidden(): void
    {
        $headersOrg1 = $this->merchantHeaders('merch-1', 'org-merchant-101');
        $headersOrg2 = $this->merchantHeaders('merch-2', 'org-merchant-999');

        $createRes = $this->postJson('/api/v1/after-sales/business/warranty-options', [
            'name' => 'Garansi Org 1',
            'duration_days' => 14,
            'coverage_text' => 'Cakupan Org 1',
        ], $headersOrg1);

        $optionId = $createRes->json('data.id');

        // Org 2 tries to update Org 1's warranty option
        $updateRes = $this->patchJson("/api/v1/after-sales/business/warranty-options/{$optionId}", [
            'name' => 'Hacked Option',
            'duration_days' => 7,
            'coverage_text' => 'Illegal modification',
        ], $headersOrg2);

        $updateRes->assertStatus(422);
    }

    public function test_customer_can_list_active_warranties(): void
    {
        $custHeaders = $this->customerHeaders('cust-101');

        // Create active entitlement
        OrderWarrantyEntitlement::create([
            'source_kind' => 'GOODS',
            'order_id' => 'ord-001',
            'order_item_key' => 'item-001',
            'customer_id' => 'cust-101',
            'owner_org_type' => 'MERCHANT',
            'owner_org_id' => 'org-merchant-101',
            'catalog_ref' => 'prod-001',
            'snapshot_name' => 'Garansi 30 Hari',
            'snapshot_duration_days' => 30,
            'snapshot_coverage' => 'Purna jual lengkap',
            'status' => 'ACTIVE',
            'starts_at' => now()->subDays(5),
            'expires_at' => now()->addDays(25),
        ]);

        $response = $this->getJson('/api/v1/after-sales/warranties?state=active', $custHeaders);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.order_id', 'ord-001');
    }
}

