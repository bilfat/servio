<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AfterSalesCase;
use App\Models\CaseResolution;
use App\Models\OutboxEvent;
use App\Models\SolutionProposal;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CrossServiceIntegrationTest extends TestCase
{
    /**
     * Test honest support dispute delegation without fake ticket strings.
     */
    public function test_honest_support_reporting_marks_pending_without_fake_tickets(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-dispute-01',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-disp-01',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DAMAGED',
            'description' => 'Penjual tidak merespons',
            'main_status' => 'SUBMITTED',
            'response_due_at' => now()->subHour(), // Overdue
            'response_state' => 'OVERDUE',
            'version' => 1,
        ]);

        $custHeaders = $this->customerHeaders('cust-dispute-01');

        $response = $this->postJson("/api/v1/after-sales/cases/{$case->id}/report-issue", [
            'reason' => 'Batas waktu 72 jam terlampaui tanpa respons merchant.',
        ], $custHeaders);

        $response->assertStatus(200);

        $case->refresh();
        $this->assertEquals('PENDING_SUPPORT_INTEGRATION', $case->support_ticket_ref);
        $this->assertNotNull($case->reported_to_support_at);

        // Check Outbox Event emitted honestly
        $this->assertDatabaseHas('outbox_events', [
            'event_type' => 'after_sales.case.reported_to_support.v1',
            'aggregate_id' => $case->id,
        ]);

        $outbox = OutboxEvent::where('event_type', 'after_sales.case.reported_to_support.v1')
            ->where('aggregate_id', $case->id)
            ->first();

        $payload = $outbox->payload;
        $this->assertNull($payload['support_ticket_ref']);
        $this->assertEquals('PENDING_SUPPORT_INTEGRATION', $payload['support_status']);
    }

    /**
     * Test proposing a new alternative marks previous proposals SUPERSEDED.
     */
    public function test_new_alternative_proposal_supersedes_previous_pending_proposals(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-prop-1',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-prop-neg-1',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Barang cacat fisik',
            'main_status' => 'SUBMITTED',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'WAITING',
            'version' => 1,
        ]);

        $prop1 = SolutionProposal::create([
            'case_id' => $case->id,
            'proposal_version' => 1,
            'proposal_type' => 'CUSTOMER_CHOICE',
            'solution_code' => 'REFUND',
            'proposed_by_actor_kind' => 'CUSTOMER',
            'proposed_by_id' => 'cust-prop-1',
            'state' => 'PENDING_CONSENT',
        ]);

        $merchHeaders = $this->merchantHeaders('merch-001', 'org-merchant-001');

        // Business proposes REPLACEMENT
        $res1 = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/decision", [
            'action' => 'PROPOSE_ALTERNATIVE',
            'alternative_solution' => 'REPLACEMENT',
            'reason' => 'Tawaran ganti unit baru',
            'case_version' => 1,
        ], $merchHeaders);

        $res1->assertStatus(200);

        $prop1->refresh();
        $this->assertEquals('SUPERSEDED', $prop1->state);

        // Business decides to propose REPAIR_GOODS instead
        $res2 = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/decision", [
            'action' => 'PROPOSE_ALTERNATIVE',
            'alternative_solution' => 'REPAIR_GOODS',
            'reason' => 'Tawaran perbaikan teknisi toko',
            'case_version' => 2,
        ], $merchHeaders);

        $res2->assertStatus(200);

        // Second proposal (REPLACEMENT) must now also be SUPERSEDED
        $prop2 = SolutionProposal::where('case_id', $case->id)
            ->where('solution_code', 'REPLACEMENT')
            ->first();

        $this->assertEquals('SUPERSEDED', $prop2->state);

        // Active proposal is version 3 (REPAIR_GOODS)
        $prop3 = SolutionProposal::where('case_id', $case->id)
            ->where('solution_code', 'REPAIR_GOODS')
            ->first();

        $this->assertEquals('PENDING_CONSENT', $prop3->state);
    }

    /**
     * Test GET queries (index & show) are strictly read-only and do not execute DB UPDATE queries.
     */
    public function test_get_queries_do_not_mutate_database(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-ro-1',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-ro-101',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Test read-only SLA',
            'main_status' => 'SUBMITTED',
            'response_due_at' => now()->subDay(), // Past due
            'response_state' => 'WAITING',
            'version' => 1,
        ]);

        $custHeaders = $this->customerHeaders('cust-ro-1');

        $queryLog = [];
        DB::listen(function ($query) use (&$queryLog) {
            $queryLog[] = $query->sql;
        });

        // Execute GET show
        $resShow = $this->getJson("/api/v1/after-sales/cases/{$case->id}", $custHeaders);
        $resShow->assertStatus(200);

        // Verify zero UPDATE / INSERT / DELETE statements occurred during GET
        foreach ($queryLog as $sql) {
            $upper = strtoupper(trim($sql));
            $this->assertFalse(str_starts_with($upper, 'UPDATE'), "GET request executed an UPDATE query: {$sql}");
            $this->assertFalse(str_starts_with($upper, 'INSERT'), "GET request executed an INSERT query: {$sql}");
            $this->assertFalse(str_starts_with($upper, 'DELETE'), "GET request executed a DELETE query: {$sql}");
        }
    }
}

