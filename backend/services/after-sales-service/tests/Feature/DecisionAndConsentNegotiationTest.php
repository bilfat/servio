<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AfterSalesCase;
use Tests\TestCase;

class DecisionAndConsentNegotiationTest extends TestCase
{
    private function createDummyCase(string $customerId = 'cust-301', string $orgId = 'org-merchant-301'): AfterSalesCase
    {
        return AfterSalesCase::create([
            'case_type' => 'GOODS_WARRANTY',
            'customer_id' => $customerId,
            'owner_org_id' => $orgId,
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-501',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECTIVE',
            'description' => 'Minta refund karena rusak',
            'main_status' => 'SUBMITTED',
            'substate' => 'NONE',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'WAITING',
            'version' => 1,
        ]);
    }

    public function test_business_accepts_initial_solution(): void
    {
        $case = $this->createDummyCase('cust-301', 'org-merchant-301');
        $merchHeaders = $this->merchantHeaders('merch-user-301', 'org-merchant-301');

        $response = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/decision", [
            'action' => 'ACCEPT_INITIAL',
            'reason' => 'Kami menyetujui refund penuh.',
            'case_version' => 1,
        ], $merchHeaders);

        $response->assertStatus(200)
            ->assertJsonPath('data.main_status', 'IN_RESOLUTION')
            ->assertJsonPath('data.agreed_solution', 'REFUND')
            ->assertJsonPath('data.response_state', 'RESPONDED');

        $this->assertDatabaseHas('after_sales_cases', [
            'id' => $case->id,
            'main_status' => 'IN_RESOLUTION',
            'agreed_solution' => 'REFUND',
            'response_state' => 'RESPONDED',
        ]);

        $this->assertDatabaseHas('case_resolutions', [
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'NOT_STARTED',
        ]);
    }

    public function test_business_proposes_alternative_and_customer_accepts(): void
    {
        $case = $this->createDummyCase('cust-301', 'org-merchant-301');
        $merchHeaders = $this->merchantHeaders('merch-user-301', 'org-merchant-301');
        $custHeaders = $this->customerHeaders('cust-301');

        // 1. Merchant proposes alternative REPAIR_GOODS
        $propRes = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/decision", [
            'action' => 'PROPOSE_ALTERNATIVE',
            'alternative_solution' => 'REPAIR_GOODS',
            'reason' => 'Kami tawarkan servis perbaikan gratis dengan suku cadang asli.',
            'case_version' => 1,
        ], $merchHeaders);

        $propRes->assertStatus(200)
            ->assertJsonPath('data.main_status', 'UNDER_REVIEW')
            ->assertJsonPath('data.substate', 'AWAITING_CUSTOMER_CONSENT');

        $this->assertDatabaseHas('solution_proposals', [
            'case_id' => $case->id,
            'proposal_version' => 1, // first proposal created in this test flow
            'solution_code' => 'REPAIR_GOODS',
            'state' => 'PENDING_CONSENT',
        ]);

        $proposal = \App\Models\SolutionProposal::where('case_id', $case->id)->first();

        // 2. Customer explicitly accepts alternative
        $consentRes = $this->postJson(
            "/api/v1/after-sales/cases/{$case->id}/solutions/{$proposal->id}/decision",
            [
                'decision' => 'ACCEPT',
                'reason' => 'Saya setuju perbaikan barang.',
            ],
            $custHeaders
        );

        $consentRes->assertStatus(200)
            ->assertJsonPath('data.main_status', 'IN_RESOLUTION')
            ->assertJsonPath('data.agreed_solution', 'REPAIR_GOODS');

        $this->assertDatabaseHas('customer_solution_consents', [
            'proposal_id' => $proposal->id,
            'decision' => 'ACCEPT',
        ]);

        $this->assertDatabaseHas('case_resolutions', [
            'case_id' => $case->id,
            'solution_code' => 'REPAIR_GOODS',
        ]);
    }

    public function test_customer_declines_alternative_does_not_auto_refund(): void
    {
        $case = $this->createDummyCase('cust-301', 'org-merchant-301');
        $merchHeaders = $this->merchantHeaders('merch-user-301', 'org-merchant-301');
        $custHeaders = $this->customerHeaders('cust-301');

        // Merchant proposes alternative
        $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/decision", [
            'action' => 'PROPOSE_ALTERNATIVE',
            'alternative_solution' => 'REPLACEMENT',
            'reason' => 'Kami ganti unit baru',
            'case_version' => 1,
        ], $merchHeaders);

        $proposal = \App\Models\SolutionProposal::where('case_id', $case->id)->first();

        // Customer declines
        $consentRes = $this->postJson(
            "/api/v1/after-sales/cases/{$case->id}/solutions/{$proposal->id}/decision",
            [
                'decision' => 'DECLINE',
                'reason' => 'Saya tetap ingin uang kembali.',
            ],
            $custHeaders
        );

        $consentRes->assertStatus(200)
            ->assertJsonPath('data.main_status', 'UNDER_REVIEW')
            ->assertJsonPath('data.substate', 'NONE');

        // Must NOT auto-assign agreed_solution without explicit agreement
        $this->assertDatabaseHas('after_sales_cases', [
            'id' => $case->id,
            'agreed_solution' => null,
            'main_status' => 'UNDER_REVIEW',
        ]);
    }

    public function test_business_rejection_requires_reason(): void
    {
        $case = $this->createDummyCase('cust-301', 'org-merchant-301');
        $merchHeaders = $this->merchantHeaders('merch-user-301', 'org-merchant-301');

        $response = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/decision", [
            'action' => 'REJECT_WITH_REASON',
            'reason' => '', // Empty reason!
            'case_version' => 1,
        ], $merchHeaders);

        $response->assertStatus(422);
    }

    public function test_stale_case_version_conflict_is_rejected_with_409(): void
    {
        $case = $this->createDummyCase('cust-301', 'org-merchant-301');
        $merchHeaders = $this->merchantHeaders('merch-user-301', 'org-merchant-301');

        $response = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/decision", [
            'action' => 'ACCEPT_INITIAL',
            'case_version' => 999, // Stale version!
        ], $merchHeaders);

        $response->assertStatus(409)
            ->assertJsonPath('error.code', 'AFTER_SALES_DECISION_FAILED');
    }
}

