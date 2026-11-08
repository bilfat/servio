<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\AfterSales\Sla\SlaService;
use App\Models\AfterSalesCase;
use Tests\TestCase;

class SlaAndDisputeReportTest extends TestCase
{
    public function test_case_exceeding_72h_is_marked_overdue_without_auto_reject_or_auto_refund(): void
    {
        // Create case with deadline in the past
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_WARRANTY',
            'customer_id' => 'cust-401',
            'owner_org_id' => 'org-merchant-401',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-701',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECTIVE',
            'description' => 'Tidak direspon',
            'main_status' => 'SUBMITTED',
            'substate' => 'NONE',
            'response_due_at' => now()->subHours(2), // Expired!
            'response_state' => 'WAITING',
            'version' => 1,
        ]);

        $slaService = app(SlaService::class);
        $count = $slaService->evaluateOverdueCases();

        $this->assertGreaterThanOrEqual(1, $count);

        $case->refresh();
        $this->assertEquals('OVERDUE', $case->response_state);
        // Business Rule: Still SUBMITTED (NOT auto-rejected, NOT auto-approved, NOT auto-refunded)
        $this->assertEquals('SUBMITTED', $case->main_status);
        $this->assertNotNull($case->overdue_first_detected_at);

        $this->assertDatabaseHas('case_events', [
            'case_id' => $case->id,
            'event_type' => 'SLA_BREACH_DETECTED',
            'actor_kind' => 'SYSTEM',
        ]);
    }

    public function test_customer_can_report_issue_to_support_when_overdue(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_WARRANTY',
            'customer_id' => 'cust-401',
            'owner_org_id' => 'org-merchant-401',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-701',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECTIVE',
            'description' => 'Tidak direspon 72 jam',
            'main_status' => 'SUBMITTED',
            'response_due_at' => now()->subHours(2),
            'response_state' => 'OVERDUE',
            'version' => 1,
        ]);

        $custHeaders = $this->customerHeaders('cust-401');

        $response = $this->postJson("/api/v1/after-sales/cases/{$case->id}/report-issue", [
            'reason' => 'Toko tidak merespon lebih dari 3 hari, mohon mediasi SERVIO.',
        ], $custHeaders);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $case->refresh();
        $this->assertNotNull($case->reported_to_support_at);
        $this->assertNotNull($case->support_ticket_ref);

        $this->assertDatabaseHas('case_events', [
            'case_id' => $case->id,
            'event_type' => 'REPORTED_TO_SUPPORT',
            'actor_kind' => 'CUSTOMER',
        ]);
    }
}

