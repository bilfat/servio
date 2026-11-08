<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AfterSalesCase;
use App\Models\OrderWarrantyEntitlement;
use App\Models\ReviewEntry;
use App\Models\ReviewSubmission;
use Tests\TestCase;

class ComprehensiveEdgeCasesTest extends TestCase
{
    public function test_partial_goods_return_with_specific_quantity(): void
    {
        $headers = $this->customerHeaders('cust-edge-1');

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-edge-101',
            'case_type' => 'GOODS_RETURN',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECTIVE_PARTIAL',
            'description' => 'Dari 5 unit, 2 unit cacat produksi',
            'items' => [
                [
                    'order_item_id' => 'item-part-01',
                    'quantity' => 2, // Partial quantity!
                    'catalog_snapshot' => ['name' => 'Bohlam LED 15W', 'price' => 45000],
                ],
            ],
            'owner_org_id' => 'org-merchant-edge',
            'owner_org_type' => 'MERCHANT',
        ], $headers);

        $response->assertStatus(201)
            ->assertJsonPath('data.items.0.quantity_requested', 2);

        $this->assertDatabaseHas('case_items', [
            'source_item_ref' => 'item-part-01',
            'quantity_requested' => 2,
        ]);
    }

    public function test_provider_claims_rework_flow(): void
    {
        // Provider service warranty flow
        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'SERVICE',
            'order_id' => 'ord-s-edge-202',
            'order_item_key' => 'srv-ac-cuci',
            'customer_id' => 'cust-edge-2',
            'owner_org_type' => 'PROVIDER',
            'owner_org_id' => 'org-provider-edge',
            'catalog_ref' => 'cat-srv-ac',
            'snapshot_name' => 'Garansi Cuci AC 14 Hari',
            'snapshot_duration_days' => 14,
            'status' => 'ACTIVE',
            'starts_at' => now()->subDays(1),
            'expires_at' => now()->addDays(13),
        ]);

        $custHeaders = $this->customerHeaders('cust-edge-2');

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'SERVICE',
            'source_order_id' => 'ord-s-edge-202',
            'case_type' => 'SERVICE_WARRANTY',
            'initial_solution' => 'REWORK',
            'reason_code' => 'AC_STILL_WARM',
            'description' => 'AC masih tidak dingin setelah dicuci kemarin',
            'entitlement_id' => $entitlement->id,
            'items' => [
                [
                    'order_item_id' => 'srv-ac-cuci',
                    'quantity' => 1,
                ],
            ],
        ], $custHeaders);

        $response->assertStatus(201)
            ->assertJsonPath('data.initial_solution', 'REWORK');

        $caseId = $response->json('data.id');

        // Provider accepts rework
        $provHeaders = $this->providerHeaders('prov-edge-user', 'org-provider-edge');

        $decRes = $this->postJson("/api/v1/after-sales/business/cases/{$caseId}/decision", [
            'action' => 'ACCEPT_INITIAL',
            'reason' => 'Kami jadwalkan teknisi untuk perbaikan ulang tanpa biaya.',
            'case_version' => 1,
        ], $provHeaders);

        $decRes->assertStatus(200)
            ->assertJsonPath('data.main_status', 'IN_RESOLUTION')
            ->assertJsonPath('data.agreed_solution', 'REWORK');

        $this->assertDatabaseHas('case_resolutions', [
            'case_id' => $caseId,
            'solution_code' => 'REWORK',
        ]);
    }

    public function test_business_request_evidence_sets_substate_awaiting_info(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_WARRANTY',
            'customer_id' => 'cust-edge-3',
            'owner_org_id' => 'org-merchant-edge',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-edge-303',
            'initial_solution' => 'REPLACEMENT',
            'reason_code' => 'DEFECT',
            'description' => 'Layar bergaris',
            'main_status' => 'SUBMITTED',
            'substate' => 'NONE',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'WAITING',
            'version' => 1,
        ]);

        $merchHeaders = $this->merchantHeaders('merch-edge-user', 'org-merchant-edge');

        $response = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/decision", [
            'action' => 'REQUEST_EVIDENCE',
            'reason' => 'Mohon lampirkan video unboxing dan nomor seri produk di kardus.',
            'case_version' => 1,
        ], $merchHeaders);

        $response->assertStatus(200)
            ->assertJsonPath('data.substate', 'AWAITING_CUSTOMER_INFO');

        $this->assertDatabaseHas('case_events', [
            'case_id' => $case->id,
            'event_type' => 'EVIDENCE_REQUESTED',
        ]);
    }

    public function test_public_reputation_statistics(): void
    {
        $submission1 = ReviewSubmission::create([
            'source_kind' => 'GOODS',
            'source_order_id' => 'ord-rep-1',
            'customer_id' => 'cust-rep-1',
            'submitted_at' => now(),
        ]);

        ReviewEntry::create([
            'submission_id' => $submission1->id,
            'target_type' => 'MERCHANT',
            'target_id' => 'org-rep-shop',
            'rating' => 5,
            'status' => 'VISIBLE',
            'submitted_at' => now(),
        ]);

        $submission2 = ReviewSubmission::create([
            'source_kind' => 'GOODS',
            'source_order_id' => 'ord-rep-2',
            'customer_id' => 'cust-rep-2',
            'submitted_at' => now(),
        ]);

        ReviewEntry::create([
            'submission_id' => $submission2->id,
            'target_type' => 'MERCHANT',
            'target_id' => 'org-rep-shop',
            'rating' => 4,
            'status' => 'VISIBLE',
            'submitted_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/after-sales/businesses/merchant/org-rep-shop/reputation');

        $response->assertStatus(200)
            ->assertJsonPath('data.total_reviews', 2)
            ->assertJsonPath('data.average_rating', 4.5)
            ->assertJsonPath('data.distribution.5', 1)
            ->assertJsonPath('data.distribution.4', 1);
    }

    public function test_admin_can_filter_cases_and_monitor(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-adm-1',
            'owner_org_id' => 'org-merchant-adm',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-adm-1',
            'initial_solution' => 'REFUND',
            'reason_code' => 'NOT_COMPATIBLE',
            'description' => 'Tidak cocok',
            'main_status' => 'SUBMITTED',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'WAITING',
            'version' => 1,
        ]);

        $adminHeaders = $this->adminHeaders('admin-ops-01');

        $response = $this->getJson('/api/v1/after-sales/admin/cases?type=GOODS_RETURN', $adminHeaders);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
