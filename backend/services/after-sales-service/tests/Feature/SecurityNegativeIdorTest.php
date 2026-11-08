<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\AfterSales\Contracts\OrderEligibilityDto;
use App\Domain\AfterSales\Integrations\InMemoryOrderEligibilityVerifier;
use App\Models\AfterSalesCase;
use App\Models\CaseResolution;
use App\Models\OrderWarrantyEntitlement;
use App\Models\ReviewEntry;
use App\Models\ReviewSubmission;
use App\Models\SolutionProposal;
use Tests\TestCase;

class SecurityNegativeIdorTest extends TestCase
{
    /**
     * Negative Case 1: Customer A cannot read Customer B's case detail.
     */
    public function test_customer_cannot_read_other_customer_case(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-victim',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-victim-101',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DAMAGED',
            'description' => 'Barang rusak',
            'main_status' => 'SUBMITTED',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'WAITING',
            'version' => 1,
        ]);

        $attackerHeaders = $this->customerHeaders('cust-attacker');
        $response = $this->getJson("/api/v1/after-sales/cases/{$case->id}", $attackerHeaders);

        $response->assertStatus(404)
            ->assertJsonPath('error.code', 'AFTER_SALES_CASE_NOT_FOUND');
    }

    /**
     * Negative Case 2: Business A cannot make a decision on Business B's case.
     */
    public function test_business_cannot_decide_other_business_case(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-001',
            'owner_org_id' => 'org-merchant-legit',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-legit-202',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Cacat pabrik',
            'main_status' => 'SUBMITTED',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'WAITING',
            'version' => 1,
        ]);

        $attackerMerchant = $this->merchantHeaders('merch-attacker', 'org-merchant-attacker');

        $response = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/decision", [
            'action' => 'ACCEPT_INITIAL',
            'case_version' => 1,
        ], $attackerMerchant);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_DECISION_FAILED');
    }

    /**
     * Negative Case 3: Business A cannot start resolution on Business B's case.
     */
    public function test_business_cannot_start_resolution_on_other_business_case(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-001',
            'owner_org_id' => 'org-merchant-legit',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-legit-203',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Cacat pabrik',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 2,
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'NOT_STARTED',
        ]);

        $attackerMerchant = $this->merchantHeaders('merch-attacker', 'org-merchant-attacker');

        $response = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/resolution-action", [], $attackerMerchant);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_RESOLUTION_FAILED');
    }

    /**
     * Negative Case 4: Business A cannot complete Business B's case.
     */
    public function test_business_cannot_complete_other_business_case(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-001',
            'owner_org_id' => 'org-merchant-legit',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-legit-204',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Cacat pabrik',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 2,
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'IN_PROGRESS',
        ]);

        /** @var \App\Domain\AfterSales\Integrations\InMemoryResolutionCoordinator $coordinator */
        $coordinator = app(\App\Domain\AfterSales\Contracts\ResolutionCoordinatorInterface::class);
        $coordinator->setExternalStatus($case->id, 'SUCCEEDED');

        $attackerMerchant = $this->merchantHeaders('merch-attacker', 'org-merchant-attacker');

        $response = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/complete", [
            'evidence_ref' => 'receipts/refund-proof.pdf',
        ], $attackerMerchant);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_COMPLETE_FAILED');
    }

    /**
     * Negative Case 5: Business cannot reply to a review belonging to another merchant.
     */
    public function test_business_cannot_reply_to_other_business_review(): void
    {
        $sub = ReviewSubmission::create([
            'source_kind' => 'GOODS',
            'source_order_id' => 'ord-review-target-1',
            'customer_id' => 'cust-001',
            'submitted_at' => now(),
        ]);

        $entry = ReviewEntry::create([
            'submission_id' => $sub->id,
            'owner_org_id' => 'org-merchant-legit',
            'target_type' => 'MERCHANT',
            'target_id' => 'org-merchant-legit',
            'rating' => 5,
            'text' => 'Toko amanah!',
            'status' => 'VISIBLE',
            'submitted_at' => now(),
        ]);

        $attackerMerchant = $this->merchantHeaders('merch-attacker', 'org-merchant-attacker');

        $response = $this->postJson("/api/v1/after-sales/business/reviews/{$entry->id}/reply", [
            'text' => 'Terima kasih dari toko bajakan!',
        ], $attackerMerchant);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_REPLY_FAILED');
    }

    /**
     * Negative Case 6: Customer cannot add evidence to other customer's case.
     */
    public function test_customer_cannot_add_evidence_to_other_customer_case(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-victim',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-victim-303',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DAMAGED',
            'description' => 'Barang rusak',
            'main_status' => 'SUBMITTED',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'WAITING',
            'version' => 1,
        ]);

        $attackerCustomer = $this->customerHeaders('cust-attacker');

        $response = $this->postJson("/api/v1/after-sales/cases/{$case->id}/evidence", [
            'media_ref' => 'evidence/attacker_trojan.jpg',
            'content_type' => 'image/jpeg',
            'size_bytes' => 12345,
        ], $attackerCustomer);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_EVIDENCE_FAILED');
    }

    /**
     * Negative Case 7: Untrusted gateway header rejected with 403.
     */
    public function test_untrusted_gateway_header_is_rejected(): void
    {
        $headers = [
            'X-Actor-User-Id' => 'cust-001',
            'X-Actor-Role' => 'CUSTOMER',
            'X-Gateway-Key' => 'invalid_random_gateway_key',
            'Accept' => 'application/json',
        ];

        $response = $this->getJson('/api/v1/after-sales/cases', $headers);
        $response->assertStatus(403)
            ->assertJsonPath('error.code', 'AFTER_SALES_UNTRUSTED_GATEWAY_CONTEXT');
    }

    /**
     * Negative Case 8: Forbidden actor role (e.g. FINANCE trying customer case submission).
     */
    public function test_forbidden_role_access_is_rejected(): void
    {
        $financeHeaders = $this->actorHeaders('fin-001', 'FINANCE');

        $response = $this->getJson('/api/v1/after-sales/cases', $financeHeaders);
        $response->assertStatus(403)
            ->assertJsonPath('error.code', 'AFTER_SALES_UNAUTHORIZED_ROLE');
    }

    /**
     * Negative Case 9: Internal S2S endpoint without key is rejected.
     */
    public function test_internal_endpoint_without_key_rejected(): void
    {
        $response = $this->getJson('/internal/v1/after-sales/ping');
        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'AFTER_SALES_UNAUTHORIZED_SERVICE');
    }

    /**
     * Negative Case 10: Internal S2S endpoint with wrong key is rejected.
     */
    public function test_internal_endpoint_with_invalid_key_rejected(): void
    {
        $response = $this->getJson('/internal/v1/after-sales/ping', [
            'X-Internal-Service-Key' => 'wrong_internal_service_key_xxx',
            'Accept' => 'application/json',
        ]);
        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'AFTER_SALES_UNAUTHORIZED_SERVICE');
    }

    /**
     * Negative Case 11: Claiming order not owned by the customer is rejected.
     */
    public function test_claim_on_unowned_order_is_rejected(): void
    {
        /** @var InMemoryOrderEligibilityVerifier $verifier */
        $verifier = app(\App\Domain\AfterSales\Contracts\OrderEligibilityVerifierInterface::class);
        $verifier->setOrder('ord-foreign-999', new OrderEligibilityDto(
            isValid: true,
            orderId: 'ord-foreign-999',
            subOrderId: null,
            customerId: 'cust-real-owner',
            ownerOrgId: 'org-merchant-001',
            ownerOrgType: 'MERCHANT',
            orderStatus: 'DELIVERED',
            isEligibleForAfterSales: true,
            items: [
                ['item_id' => 'it-1', 'source_ref' => 'it-1', 'name' => 'Item', 'price' => 50000, 'quantity' => 1, 'claimed_quantity' => 0, 'remaining_quantity' => 1],
            ]
        ));

        $attackerCustomer = $this->customerHeaders('cust-attacker');

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-foreign-999',
            'case_type' => 'GOODS_RETURN',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DAMAGED',
            'description' => 'Mencoba klaim pesanan orang lain',
        ], $attackerCustomer);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_SUBMIT_FAILED');
    }

    /**
     * Negative Case 12: Claiming unpaid / non-eligible order is rejected.
     */
    public function test_claim_on_unpaid_order_is_rejected(): void
    {
        $custHeaders = $this->customerHeaders('cust-001');

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'unpaid-order-123',
            'case_type' => 'GOODS_RETURN',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DAMAGED',
            'description' => 'Barang belum dibayar',
        ], $custHeaders);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_SUBMIT_FAILED');
    }

    /**
     * Negative Case 13: Claiming quantity exceeding remaining eligible quantity is rejected.
     */
    public function test_claim_quantity_exceeding_remaining_is_rejected(): void
    {
        /** @var InMemoryOrderEligibilityVerifier $verifier */
        $verifier = app(\App\Domain\AfterSales\Contracts\OrderEligibilityVerifierInterface::class);
        $verifier->setOrder('ord-qty-limit-01', new OrderEligibilityDto(
            isValid: true,
            orderId: 'ord-qty-limit-01',
            subOrderId: null,
            customerId: 'cust-qty-01',
            ownerOrgId: 'org-merchant-001',
            ownerOrgType: 'MERCHANT',
            orderStatus: 'DELIVERED',
            isEligibleForAfterSales: true,
            items: [
                [
                    'item_id' => 'item-qty-01',
                    'source_ref' => 'item-qty-01',
                    'name' => 'Baju Kemeja',
                    'price' => 150000,
                    'quantity' => 2,
                    'claimed_quantity' => 1,
                    'remaining_quantity' => 1, // Only 1 item remaining
                ],
            ]
        ));

        $custHeaders = $this->customerHeaders('cust-qty-01');

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-qty-limit-01',
            'case_type' => 'GOODS_RETURN',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Minta refund 3 padahal beli 2 dan sisa 1',
            'items' => [
                [
                    'order_item_id' => 'item-qty-01',
                    'quantity' => 3, // Request 3 > 1
                ],
            ],
        ], $custHeaders);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_SUBMIT_FAILED');
    }

    /**
     * Negative Case 14: Review submission for unowned order is rejected.
     */
    public function test_review_on_unowned_order_is_rejected(): void
    {
        /** @var InMemoryOrderEligibilityVerifier $verifier */
        $verifier = app(\App\Domain\AfterSales\Contracts\OrderEligibilityVerifierInterface::class);
        $verifier->setOrder('ord-rev-foreign-1', new OrderEligibilityDto(
            isValid: true,
            orderId: 'ord-rev-foreign-1',
            subOrderId: null,
            customerId: 'cust-real-buyer',
            ownerOrgId: 'org-merchant-001',
            ownerOrgType: 'MERCHANT',
            orderStatus: 'DELIVERED',
            isEligibleForAfterSales: true,
            items: []
        ));

        $attacker = $this->customerHeaders('cust-attacker');

        $response = $this->postJson('/api/v1/after-sales/reviews', [
            'source_kind' => 'GOODS',
            'source_order_id' => 'ord-rev-foreign-1',
            'ratings' => [
                ['target_type' => 'PRODUCT', 'target_id' => 'p-1', 'rating' => 5],
                ['target_type' => 'MERCHANT', 'target_id' => 'org-merchant-001', 'rating' => 5],
            ],
        ], $attacker);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_REVIEW_FAILED');
    }

    /**
     * Negative Case 15: Review submission with forbidden WORKER rating is rejected.
     */
    public function test_review_with_worker_target_is_forbidden(): void
    {
        $custHeaders = $this->customerHeaders('cust-001');

        $response = $this->postJson('/api/v1/after-sales/reviews', [
            'source_kind' => 'SERVICE',
            'source_order_id' => 'ord-serv-001',
            'ratings' => [
                ['target_type' => 'SERVICE', 'target_id' => 'srv-ac', 'rating' => 5],
                ['target_type' => 'PROVIDER', 'target_id' => 'org-provider-001', 'rating' => 5],
                ['target_type' => 'WORKER', 'target_id' => 'tech-budi', 'rating' => 1], // FORBIDDEN!
            ],
        ], $custHeaders);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_VALIDATION_FAILED');
    }

    /**
     * Negative Case 16: Fake completion rejected without authentic external status.
     */
    public function test_fake_completion_without_downstream_confirmation_is_rejected(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-001',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-fake-check-01',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'DAMAGED',
            'description' => 'Test fake completion',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 2,
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'IN_PROGRESS',
        ]);

        $merchHeaders = $this->merchantHeaders('merch-001', 'org-merchant-001');

        // Arbitrary unverified text string -> MUST BE REJECTED!
        $response = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/complete", [
            'evidence_ref' => 'saya_sudah_transfer_langsung_ke_rekening_pembeli_tanpa_finance',
        ], $merchHeaders);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_COMPLETE_FAILED');

        $case->refresh();
        $this->assertNotEquals('COMPLETED', $case->main_status);
    }

    /**
     * Negative Case 17: Adding evidence to closed case is rejected.
     */
    public function test_cannot_add_evidence_to_completed_case(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-001',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-completed-01',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DAMAGED',
            'description' => 'Barang rusak',
            'main_status' => 'COMPLETED',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 3,
        ]);

        $custHeaders = $this->customerHeaders('cust-001');

        $response = $this->postJson("/api/v1/after-sales/cases/{$case->id}/evidence", [
            'media_ref' => 'evidence/post_completion.jpg',
            'content_type' => 'image/jpeg',
            'size_bytes' => 1234,
        ], $custHeaders);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_EVIDENCE_FAILED');
    }

    /**
     * Negative Case 18: Decision on already completed case is rejected.
     */
    public function test_cannot_make_decision_on_completed_case(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-001',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-completed-02',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DAMAGED',
            'description' => 'Barang rusak',
            'main_status' => 'COMPLETED',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 3,
        ]);

        $merchHeaders = $this->merchantHeaders('merch-001', 'org-merchant-001');

        $response = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/decision", [
            'action' => 'ACCEPT_INITIAL',
            'case_version' => 3,
        ], $merchHeaders);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_DECISION_FAILED');
    }

    /**
     * Negative Case 19: Customer consent on non-pending proposal is rejected.
     */
    public function test_customer_consent_on_non_pending_proposal_is_rejected(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-001',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-prop-01',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DAMAGED',
            'description' => 'Barang rusak',
            'main_status' => 'UNDER_REVIEW',
            'substate' => 'AWAITING_CUSTOMER_CONSENT',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'WAITING',
            'version' => 2,
        ]);

        $prop = SolutionProposal::create([
            'case_id' => $case->id,
            'proposal_version' => 1,
            'proposal_type' => 'ALTERNATIVE',
            'solution_code' => 'REPLACEMENT',
            'proposed_by_actor_kind' => 'MERCHANT',
            'proposed_by_id' => 'merch-001',
            'state' => 'SUPERSEDED', // Already superseded!
        ]);

        $custHeaders = $this->customerHeaders('cust-001');

        $response = $this->postJson("/api/v1/after-sales/cases/{$case->id}/solutions/{$prop->id}/decision", [
            'decision' => 'ACCEPT',
        ], $custHeaders);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_CONSENT_FAILED');
    }

    /**
     * Negative Case 20: Inactive organization merchant cannot access business case endpoints.
     */
    public function test_inactive_organization_actor_is_blocked(): void
    {
        $headers = [
            'X-Actor-User-Id' => 'merch-suspended',
            'X-Actor-Role' => 'MERCHANT',
            'X-Actor-Org-Id' => 'org-suspended-001',
            'X-Actor-Org-Type' => 'MERCHANT',
            'X-Actor-Org-Active' => 'false', // INACTIVE ORGANIZATION!
            'X-Gateway-Key' => $this->gatewayKey,
            'Accept' => 'application/json',
        ];

        $response = $this->getJson('/api/v1/after-sales/business/cases', $headers);
        $response->assertStatus(403)
            ->assertJsonPath('error.code', 'AFTER_SALES_ORGANIZATION_INACTIVE');
    }
}
