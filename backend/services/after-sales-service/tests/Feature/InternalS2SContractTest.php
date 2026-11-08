<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AfterSalesCase;
use App\Models\OrderWarrantyEntitlement;
use App\Models\WarrantyOption;
use App\Models\WarrantyOptionVersion;
use Tests\TestCase;

class InternalS2SContractTest extends TestCase
{
    public function test_internal_endpoint_without_key_is_rejected(): void
    {
        $response = $this->getJson('/internal/v1/after-sales/warranty-options/opt-001/eligibility');
        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'AFTER_SALES_UNAUTHORIZED_SERVICE');
    }

    public function test_catalog_can_check_warranty_eligibility(): void
    {
        $option = WarrantyOption::create([
            'org_type' => 'MERCHANT',
            'org_id' => 'org-merch-int',
            'slug' => 'garansi-resmi-1-tahun',
            'status' => 'ACTIVE',
        ]);

        $version = WarrantyOptionVersion::create([
            'option_id' => $option->id,
            'version_no' => 1,
            'name' => 'Garansi 365 Hari',
            'duration_days' => 365,
            'coverage_text' => 'Full coverage',
            'published_at' => now(),
            'changed_by' => 'admin-sys',
        ]);

        $option->update(['latest_version_id' => $version->id]);

        $headers = $this->internalHeaders();

        $response = $this->getJson("/internal/v1/after-sales/warranty-options/{$option->id}/eligibility", $headers);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_eligible', true)
            ->assertJsonPath('data.version.duration_days', 365);
    }

    public function test_order_completion_activates_warranty_entitlement(): void
    {
        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'GOODS',
            'order_id' => 'ord-int-complete',
            'order_item_key' => 'item-int-1',
            'customer_id' => 'cust-int',
            'owner_org_type' => 'MERCHANT',
            'owner_org_id' => 'org-merchant-int',
            'catalog_ref' => 'prod-int-1',
            'snapshot_name' => 'Garansi 14 Hari',
            'snapshot_duration_days' => 14,
            'status' => 'PENDING_START',
        ]);

        $headers = $this->internalHeaders();

        $response = $this->postJson('/internal/v1/after-sales/order-completions', [
            'source_kind' => 'GOODS',
            'order_id' => 'ord-int-complete',
            'completed_at' => now()->toIso8601String(),
        ], $headers);

        $response->assertStatus(200)
            ->assertJsonPath('data.activated_entitlements_count', 1);

        $entitlement->refresh();
        $this->assertEquals('ACTIVE', $entitlement->status);
        $this->assertNotNull($entitlement->starts_at);
        $this->assertNotNull($entitlement->expires_at);
    }

    public function test_external_status_update_appends_to_case_timeline(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_WARRANTY',
            'customer_id' => 'cust-ext-1',
            'owner_org_id' => 'org-merch-ext',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-ext-1',
            'initial_solution' => 'REPLACEMENT',
            'agreed_solution' => 'REPLACEMENT',
            'reason_code' => 'DEFECT',
            'description' => 'Test',
            'main_status' => 'IN_RESOLUTION',
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        \App\Models\CaseExternalRef::create([
            'case_id' => $case->id,
            'target_service' => '05A',
            'external_id' => 'rep-tracking-001',
            'external_status' => 'PREPARING',
            'purpose' => 'REPLACEMENT_FULFILLMENT',
        ]);

        $headers = $this->internalHeaders();

        $response = $this->postJson("/internal/v1/after-sales/cases/{$case->id}/external-update", [
            'target_service' => '05A',
            'external_id' => 'rep-tracking-001',
            'external_status' => 'SHIPPED',
            'purpose' => 'REPLACEMENT_FULFILLMENT',
            'data' => ['tracking_number' => 'JNE1234567890'],
        ], $headers);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('case_external_refs', [
            'case_id' => $case->id,
            'external_id' => 'rep-tracking-001',
            'external_status' => 'SHIPPED',
        ]);

        $this->assertDatabaseHas('case_events', [
            'case_id' => $case->id,
            'event_type' => 'EXTERNAL_STATUS_UPDATED',
        ]);
    }
}

