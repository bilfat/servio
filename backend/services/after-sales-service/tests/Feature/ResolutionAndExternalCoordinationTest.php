<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AfterSalesCase;
use App\Models\CaseResolution;
use Tests\TestCase;

class ResolutionAndExternalCoordinationTest extends TestCase
{
    public function test_starting_resolution_action_creates_external_coordination_ref(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_WARRANTY',
            'customer_id' => 'cust-501',
            'owner_org_id' => 'org-merchant-501',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-801',
            'initial_solution' => 'REPLACEMENT',
            'agreed_solution' => 'REPLACEMENT',
            'reason_code' => 'DEFECTIVE',
            'description' => 'Disetujui ganti unit',
            'main_status' => 'IN_RESOLUTION',
            'response_state' => 'RESPONDED',
            'version' => 2,
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REPLACEMENT',
            'status' => 'NOT_STARTED',
        ]);

        $merchHeaders = $this->merchantHeaders('merch-501', 'org-merchant-501');

        $response = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/resolution-action", [], $merchHeaders);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'IN_PROGRESS');

        $this->assertDatabaseHas('case_external_refs', [
            'case_id' => $case->id,
            'target_service' => '05A',
            'purpose' => 'REPLACEMENT_FULFILLMENT',
        ]);

        $this->assertDatabaseHas('case_events', [
            'case_id' => $case->id,
            'event_type' => 'RESOLUTION_STARTED',
        ]);
    }

    public function test_completing_case_requires_evidence_and_marks_completed(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_WARRANTY',
            'customer_id' => 'cust-501',
            'owner_org_id' => 'org-merchant-501',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-801',
            'initial_solution' => 'REPLACEMENT',
            'agreed_solution' => 'REPLACEMENT',
            'reason_code' => 'DEFECTIVE',
            'description' => 'Disetujui ganti unit',
            'main_status' => 'IN_RESOLUTION',
            'response_state' => 'RESPONDED',
            'version' => 2,
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REPLACEMENT',
            'status' => 'IN_PROGRESS',
        ]);

        /** @var \App\Domain\AfterSales\Integrations\InMemoryResolutionCoordinator $coordinator */
        $coordinator = app(\App\Domain\AfterSales\Contracts\ResolutionCoordinatorInterface::class);
        $coordinator->setExternalStatus($case->id, 'DELIVERED');

        $merchHeaders = $this->merchantHeaders('merch-501', 'org-merchant-501');

        $response = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/complete", [
            'evidence_ref' => 'receipts/replacement-signed-pod.pdf',
        ], $merchHeaders);

        $response->assertStatus(200)
            ->assertJsonPath('data.main_status', 'COMPLETED');

        $case->refresh();
        $this->assertEquals('COMPLETED', $case->main_status);
        $this->assertNotNull($case->resolved_at);

        $this->assertDatabaseHas('case_resolutions', [
            'case_id' => $case->id,
            'status' => 'VERIFIED_DONE',
            'evidence_ref' => 'receipts/replacement-signed-pod.pdf',
        ]);
    }
}

