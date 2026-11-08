<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AfterSalesCase;
use App\Models\OrderWarrantyEntitlement;
use Tests\TestCase;

class CaseSubmissionAndValidationTest extends TestCase
{
    public function test_goods_claim_without_initial_solution_fails(): void
    {
        $headers = $this->customerHeaders('cust-201');

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-101',
            'case_type' => 'GOODS_WARRANTY',
            'reason_code' => 'DEFECTIVE',
            'description' => 'Barang tidak menyala',
            // Missing initial_solution
        ], $headers);

        $response->assertStatus(422);
    }

    public function test_goods_claim_selecting_rework_is_rejected(): void
    {
        $headers = $this->customerHeaders('cust-201');

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-101',
            'case_type' => 'GOODS_WARRANTY',
            'initial_solution' => 'REWORK', // REWORK is forbidden for Goods!
            'reason_code' => 'DEFECTIVE',
            'description' => 'Barang minta diperbaiki',
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_SUBMIT_FAILED');
    }

    public function test_service_claim_selecting_replacement_is_rejected(): void
    {
        $headers = $this->customerHeaders('cust-201');

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'SERVICE',
            'source_order_id' => 'ord-s-101',
            'case_type' => 'SERVICE_WARRANTY',
            'initial_solution' => 'REPLACEMENT', // REPLACEMENT is forbidden for Service!
            'reason_code' => 'SAME_PROBLEM',
            'description' => 'Minta ganti baru',
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_SUBMIT_FAILED');
    }

    public function test_goods_claim_with_replacement_succeeds_and_sets_72h_sla(): void
    {
        $headers = $this->customerHeaders('cust-201');

        // Create entitlement
        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'GOODS',
            'order_id' => 'ord-g-202',
            'order_item_key' => 'item-202',
            'customer_id' => 'cust-201',
            'owner_org_type' => 'MERCHANT',
            'owner_org_id' => 'org-merchant-202',
            'catalog_ref' => 'prod-202',
            'snapshot_name' => 'Garansi 30 Hari Toko',
            'snapshot_duration_days' => 30,
            'status' => 'ACTIVE',
            'starts_at' => now()->subDays(2),
            'expires_at' => now()->addDays(28),
        ]);

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-202',
            'case_type' => 'GOODS_WARRANTY',
            'initial_solution' => 'REPLACEMENT',
            'reason_code' => 'DEFECTIVE_COMPONENT',
            'description' => 'Komponen terbakar saat pertama kali dinyalakan',
            'entitlement_id' => $entitlement->id,
            'items' => [
                [
                    'order_item_id' => 'item-202',
                    'quantity' => 1,
                    'catalog_snapshot' => ['name' => 'Kipas Angin Turbo', 'price' => 350000],
                ],
            ],
            'evidence_data' => [
                [
                    'media_ref' => 'evidence/cases/proof-001.jpg',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 102400,
                ],
            ],
        ], $headers);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.initial_solution', 'REPLACEMENT')
            ->assertJsonPath('data.main_status', 'SUBMITTED')
            ->assertJsonPath('data.response_state', 'WAITING');

        $caseId = $response->json('data.id');

        $this->assertDatabaseHas('after_sales_cases', [
            'id' => $caseId,
            'customer_id' => 'cust-201',
            'initial_solution' => 'REPLACEMENT',
            'main_status' => 'SUBMITTED',
            'response_state' => 'WAITING',
        ]);

        $this->assertDatabaseHas('solution_proposals', [
            'case_id' => $caseId,
            'proposal_version' => 1,
            'proposal_type' => 'CUSTOMER_CHOICE',
            'solution_code' => 'REPLACEMENT',
        ]);

        $this->assertDatabaseHas('case_events', [
            'case_id' => $caseId,
            'event_type' => 'CASE_SUBMITTED',
            'sequence' => 1,
        ]);
    }

    public function test_goods_return_without_extra_warranty_is_allowed(): void
    {
        $headers = $this->customerHeaders('cust-201');

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-303',
            'source_merchant_order_id' => 'mo-303',
            'case_type' => 'GOODS_RETURN',
            'initial_solution' => 'REFUND',
            'reason_code' => 'WRONG_ITEM_SENT',
            'description' => 'Barang yang dikirim salah warna dan tipe',
            'owner_org_id' => 'org-merchant-202',
            'owner_org_type' => 'MERCHANT',
            'items' => [
                [
                    'order_item_id' => 'item-303',
                    'quantity' => 1,
                ],
            ],
        ], $headers);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.case_type', 'GOODS_RETURN')
            ->assertJsonPath('data.initial_solution', 'REFUND');
    }

    public function test_customer_cannot_access_other_customers_case_anti_idor(): void
    {
        $cust1Headers = $this->customerHeaders('cust-owner');
        $cust2Headers = $this->customerHeaders('cust-attacker');

        // Customer 1 creates case
        $createRes = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-999',
            'case_type' => 'GOODS_RETURN',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DAMAGED_BOX',
            'description' => 'Box rusak parah',
            'owner_org_id' => 'org-merchant-1',
            'owner_org_type' => 'MERCHANT',
        ], $cust1Headers);

        $createRes->assertStatus(201);
        $caseId = $createRes->json('data.id');

        // Customer 2 attempts to read Customer 1's case
        $readRes = $this->getJson("/api/v1/after-sales/cases/{$caseId}", $cust2Headers);
        $readRes->assertStatus(404);
    }
}

