<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AfterSalesCase;
use App\Models\CaseResolution;
use Tests\TestCase;

class PhysicalReturnAndOperationAddendumTest extends TestCase
{
    public function test_physical_return_full_lifecycle_with_instructions_shipment_receipt_and_inspection(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-ret-101',
            'owner_org_id' => 'org-merchant-ret-101',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-ret-101',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'WRONG_ITEM',
            'description' => 'Salah kirim varian warna',
            'main_status' => 'UNDER_REVIEW',
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'NOT_STARTED',
        ]);

        $merchHeaders = $this->merchantHeaders('merch-101', 'org-merchant-ret-101');
        $custHeaders = $this->customerHeaders('cust-ret-101');

        // Step 1: Merchant saves return instructions (requires_physical_return = true)
        $instructionResp = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/return-instructions", [
            'requires_physical_return' => true,
            'return_recipient_name' => 'Gudang Retur Servio',
            'return_address' => 'Jl. Industri No. 45, Jakarta Barat',
            'return_phone' => '081298765432',
            'return_courier_notes' => 'Gunakan bubble wrap berlapis',
            'shipping_fee_bearer' => 'MERCHANT',
        ], $merchHeaders);

        $instructionResp->assertStatus(200);
        $case->refresh();
        $this->assertEquals('AWAITING_RETURN', $case->main_status);
        $this->assertDatabaseHas('case_return_instructions', [
            'case_id' => $case->id,
            'requires_physical_return' => 1,
            'shipping_fee_payer' => 'MERCHANT',
        ]);

        // Step 2: Customer submits return shipment waybill & fee
        $shipmentResp = $this->postJson("/api/v1/after-sales/cases/{$case->id}/return-shipment", [
            'courier_name' => 'JNE',
            'tracking_number' => 'JNE-RET-TEST-888',
            'shipping_fee_paid' => 28000,
            'proof_receipt_url' => 'https://storage.servio.id/proof/resi-888.jpg',
            'reimbursement_proof_url' => 'https://storage.servio.id/proof/nota-888.jpg',
            'customer_notes' => 'Paket sudah dikirimkan via agen JNE Kebon Jeruk',
        ], $custHeaders);

        $shipmentResp->assertStatus(200);
        $this->assertDatabaseHas('case_return_shipments', [
            'case_id' => $case->id,
            'courier_name' => 'JNE',
            'tracking_number' => 'JNE-RET-TEST-888',
            'shipping_status' => 'SHIPPED',
        ]);
        $this->assertDatabaseHas('case_shipping_expenses', [
            'case_id' => $case->id,
            'expense_type' => 'RETURN_SHIPPING',
            'actual_fee_idr' => 28000,
            'paid_by' => 'CUSTOMER',
            'fee_payer' => 'MERCHANT',
            'reimbursement_status' => 'PENDING_FINANCE_CONTRACT',
        ]);

        // Step 3: Merchant confirms return receipt
        $receiptResp = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/return-receipt", [
            'condition_upon_arrival' => 'GOOD',
            'notes' => 'Paket tiba dalam kondisi segel utuh',
            'proof_url' => 'https://storage.servio.id/proof/unboxing-888.jpg',
        ], $merchHeaders);

        $receiptResp->assertStatus(200);
        $this->assertDatabaseHas('case_return_receipts', [
            'case_id' => $case->id,
            'package_condition' => 'GOOD',
        ]);

        // Step 4: Merchant submits return inspection outcome
        $inspectionResp = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/return-inspection", [
            'inspection_outcome' => 'MATCHED',
            'sku_match' => true,
            'physical_condition' => 'LIKE_NEW',
            'approved_quantity' => 1,
            'notes' => 'Barang lengkap sesuai pesanan awal',
            'proof_urls' => ['https://storage.servio.id/proof/qc-888.jpg'],
        ], $merchHeaders);

        $inspectionResp->assertStatus(200);
        $case->refresh();
        $this->assertEquals('IN_RESOLUTION', $case->main_status);
        $this->assertDatabaseHas('case_return_inspections', [
            'case_id' => $case->id,
            'inspection_outcome' => 'MATCHED',
            'quantity_approved' => 1,
        ]);

        // Step 5: Resolution action can now proceed
        $resResp = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/resolution-action", [], $merchHeaders);
        $resResp->assertStatus(200);
        $this->assertEquals('IN_PROGRESS', $resResp->json('data.status'));
    }

    public function test_physical_return_waived_transitions_directly_to_in_resolution(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-ret-102',
            'owner_org_id' => 'org-merchant-ret-102',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-ret-102',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'DAMAGED_BEYOND_REPAIR',
            'description' => 'Pecah total saat pengiriman',
            'main_status' => 'UNDER_REVIEW',
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'NOT_STARTED',
        ]);

        $merchHeaders = $this->merchantHeaders('merch-102', 'org-merchant-ret-102');

        $instructionResp = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/return-instructions", [
            'requires_physical_return' => false,
            'waived_reason' => 'Barang pecah belah hancur total, tidak ekonomis dikirim balik',
        ], $merchHeaders);

        $instructionResp->assertStatus(200);
        $case->refresh();
        $this->assertEquals('IN_RESOLUTION', $case->main_status);

        // Resolution action should proceed directly without requiring physical shipment
        $resResp = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/resolution-action", [], $merchHeaders);
        $resResp->assertStatus(200);
    }

    public function test_inspection_mismatch_blocks_resolution_action(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-ret-103',
            'owner_org_id' => 'org-merchant-ret-103',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-ret-103',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'WRONG_ITEM',
            'description' => 'Klaim salah varian',
            'main_status' => 'UNDER_REVIEW',
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'NOT_STARTED',
        ]);

        $merchHeaders = $this->merchantHeaders('merch-103', 'org-merchant-ret-103');
        $custHeaders = $this->customerHeaders('cust-ret-103');

        // Instructions
        $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/return-instructions", [
            'requires_physical_return' => true,
            'return_recipient_name' => 'Merchant Gudang',
            'return_address' => 'Jl. Gudang No. 1',
            'shipping_fee_bearer' => 'CUSTOMER',
        ], $merchHeaders);

        // Shipment
        $this->postJson("/api/v1/after-sales/cases/{$case->id}/return-shipment", [
            'courier_name' => 'SiCepat',
            'tracking_number' => 'SCP-103-999',
            'shipping_fee_paid' => 15000,
        ], $custHeaders);

        // Receipt
        $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/return-receipt", [
            'condition_upon_arrival' => 'DAMAGED',
        ], $merchHeaders);

        // Inspection Mismatch
        $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/return-inspection", [
            'inspection_outcome' => 'MISMATCH',
            'sku_match' => false,
            'physical_condition' => 'HEAVILY_USED',
            'approved_quantity' => 0,
            'notes' => 'Barang yang dikembalikan berbeda produk dan rusak pemakaian',
        ], $merchHeaders);

        // Resolution action must be blocked because case is not resolved / outcome is MISMATCH
        $resResp = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/resolution-action", [], $merchHeaders);
        $resResp->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_RESOLUTION_FAILED');
    }

    public function test_double_shipment_submission_is_forbidden(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-ret-104',
            'owner_org_id' => 'org-merchant-ret-104',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-ret-104',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'DEFECTIVE',
            'description' => 'Rusak fungsi',
            'main_status' => 'UNDER_REVIEW',
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        $merchHeaders = $this->merchantHeaders('merch-104', 'org-merchant-ret-104');
        $custHeaders = $this->customerHeaders('cust-ret-104');

        $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/return-instructions", [
            'requires_physical_return' => true,
            'return_recipient_name' => 'Merchant Gudang',
            'return_address' => 'Jl. Gudang No. 1',
            'shipping_fee_bearer' => 'MERCHANT',
        ], $merchHeaders);

        // First submission succeeds
        $resp1 = $this->postJson("/api/v1/after-sales/cases/{$case->id}/return-shipment", [
            'courier_name' => 'J&T Express',
            'tracking_number' => 'JT-104-001',
            'shipping_fee_paid' => 20000,
        ], $custHeaders);
        $resp1->assertStatus(200);

        // Second submission must fail
        $resp2 = $this->postJson("/api/v1/after-sales/cases/{$case->id}/return-shipment", [
            'courier_name' => 'J&T Express',
            'tracking_number' => 'JT-104-002',
            'shipping_fee_paid' => 20000,
        ], $custHeaders);

        $resp2->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_RETURN_SHIPMENT_FAILED');
        $this->assertStringContainsString('DOUBLE_SUBMISSION_FORBIDDEN', $resp2->json('error.message'));
    }

    public function test_idor_protection_for_return_shipment(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-ret-105-legit',
            'owner_org_id' => 'org-merchant-ret-105',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-ret-105',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'DEFECTIVE',
            'description' => 'Rusak fungsi',
            'main_status' => 'UNDER_REVIEW',
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        $merchHeaders = $this->merchantHeaders('merch-105', 'org-merchant-ret-105');
        $attackerHeaders = $this->customerHeaders('cust-attacker-999');

        $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/return-instructions", [
            'requires_physical_return' => true,
            'return_recipient_name' => 'Merchant Gudang',
            'return_address' => 'Jl. Gudang No. 1',
            'shipping_fee_bearer' => 'MERCHANT',
        ], $merchHeaders);

        // Attacker attempts to submit shipment for another customer's case
        $resp = $this->postJson("/api/v1/after-sales/cases/{$case->id}/return-shipment", [
            'courier_name' => 'J&T Express',
            'tracking_number' => 'JT-ATTACK-001',
            'shipping_fee_paid' => 20000,
        ], $attackerHeaders);

        $resp->assertStatus(403);
    }

    public function test_service_warranty_rework_execution_and_external_coordination_05b(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'SERVICE_WARRANTY',
            'customer_id' => 'cust-srv-201',
            'owner_org_id' => 'org-provider-srv-201',
            'owner_org_type' => 'PROVIDER',
            'source_order_kind' => 'SERVICE',
            'source_order_id' => 'ord-s-srv-201',
            'initial_solution' => 'REWORK',
            'agreed_solution' => 'REWORK',
            'reason_code' => 'SERVICE_DEFECT',
            'description' => 'AC masih belum dingin setelah diservis',
            'main_status' => 'IN_RESOLUTION',
            'response_state' => 'RESPONDED',
            'version' => 2,
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REWORK',
            'status' => 'NOT_STARTED',
        ]);

        $provHeaders = $this->providerHeaders('prov-201', 'org-provider-srv-201');

        $resResp = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/resolution-action", [], $provHeaders);
        $resResp->assertStatus(200);

        $this->assertDatabaseHas('case_external_refs', [
            'case_id' => $case->id,
            'target_service' => '05B',
            'purpose' => 'WARRANTY_JOB',
        ]);

        /** @var \App\Domain\AfterSales\Integrations\InMemoryResolutionCoordinator $coordinator */
        $coordinator = app(\App\Domain\AfterSales\Contracts\ResolutionCoordinatorInterface::class);
        $coordinator->setExternalStatus($case->id, 'COMPLETED');

        // Complete rework with technician evidence
        $compResp = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/complete", [
            'evidence_ref' => 'https://storage.servio.id/evidence/rework-ac-done.jpg',
        ], $provHeaders);

        $compResp->assertStatus(200);
        $case->refresh();
        $this->assertEquals('COMPLETED', $case->main_status);
    }

    public function test_service_warranty_refund_execution_finance_06(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'SERVICE_WARRANTY',
            'customer_id' => 'cust-srv-202',
            'owner_org_id' => 'org-provider-srv-202',
            'owner_org_type' => 'PROVIDER',
            'source_order_kind' => 'SERVICE',
            'source_order_id' => 'ord-s-srv-202',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'CANNOT_FIX',
            'description' => 'Kompresor rusak permanen tidak dapat diperbaiki',
            'main_status' => 'IN_RESOLUTION',
            'response_state' => 'RESPONDED',
            'version' => 2,
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'NOT_STARTED',
        ]);

        $provHeaders = $this->providerHeaders('prov-202', 'org-provider-srv-202');

        $resResp = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/resolution-action", [], $provHeaders);
        $resResp->assertStatus(200);

        $this->assertDatabaseHas('case_external_refs', [
            'case_id' => $case->id,
            'target_service' => '06',
            'purpose' => 'REFUND_DECISION',
        ]);
    }

    public function test_replacement_fulfillment_external_coordination_05a(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-g-301',
            'owner_org_id' => 'org-merchant-g-301',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-g-301',
            'initial_solution' => 'REPLACEMENT',
            'agreed_solution' => 'REPLACEMENT',
            'reason_code' => 'DEFECTIVE_COMPONENT',
            'description' => 'Komponen rusak, disepakati penggantian barang baru',
            'main_status' => 'IN_RESOLUTION',
            'response_state' => 'RESPONDED',
            'version' => 2,
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REPLACEMENT',
            'status' => 'NOT_STARTED',
        ]);

        $merchHeaders = $this->merchantHeaders('merch-301', 'org-merchant-g-301');

        $resResp = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/resolution-action", [], $merchHeaders);
        $resResp->assertStatus(200);

        $this->assertDatabaseHas('case_external_refs', [
            'case_id' => $case->id,
            'target_service' => '05A',
            'purpose' => 'REPLACEMENT_FULFILLMENT',
        ]);
    }
}
