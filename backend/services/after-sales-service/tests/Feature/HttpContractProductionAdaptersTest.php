<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\AfterSales\Contracts\OrderEligibilityDto;
use App\Domain\AfterSales\Integrations\HttpOrderEligibilityVerifier;
use App\Domain\AfterSales\Integrations\HttpResolutionCoordinator;
use App\Models\AfterSalesCase;
use App\Models\CaseExternalRef;
use App\Models\CaseItem;
use App\Models\CaseResolution;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class HttpContractProductionAdaptersTest extends TestCase
{
    /**
     * Test HttpOrderEligibilityVerifier successfully verifies completed goods order.
     */
    public function test_goods_order_eligibility_verification_success(): void
    {
        Http::fake([
            'http://127.0.0.1:8005/internal/v1/order-barang/orders/ord-goods-101' => Http::response([
                'success' => true,
                'data' => [
                    'id' => 'ord-goods-101',
                    'customer_id' => 'cust-101',
                    'merchant_org_id' => 'org-merch-real-1',
                    'status' => 'DELIVERED',
                    'items' => [
                        [
                            'id' => 'item-real-1',
                            'name' => 'Kulkas 2 Pintu',
                            'price' => 3500000,
                            'quantity' => 1,
                        ],
                    ],
                ],
            ], 200),
        ]);

        $verifier = new HttpOrderEligibilityVerifier();
        $dto = $verifier->verifyOrderEligibility('cust-101', 'GOODS', 'ord-goods-101');

        $this->assertTrue($dto->isValid);
        $this->assertTrue($dto->isEligibleForAfterSales);
        $this->assertEquals('org-merch-real-1', $dto->ownerOrgId);
        $this->assertEquals('MERCHANT', $dto->ownerOrgType);
        $this->assertCount(1, $dto->items);
        $this->assertEquals('item-real-1', $dto->items[0]['item_id']);
    }

    /**
     * Test HttpOrderEligibilityVerifier rejects order with unowned customer.
     */
    public function test_goods_order_eligibility_rejects_unowned_order(): void
    {
        Http::fake([
            'http://127.0.0.1:8005/internal/v1/order-barang/orders/ord-goods-102' => Http::response([
                'success' => true,
                'data' => [
                    'id' => 'ord-goods-102',
                    'customer_id' => 'cust-legit-owner',
                    'merchant_org_id' => 'org-merch-real-1',
                    'status' => 'DELIVERED',
                    'items' => [['id' => 'item-1', 'quantity' => 1]],
                ],
            ], 200),
        ]);

        $verifier = new HttpOrderEligibilityVerifier();
        $dto = $verifier->verifyOrderEligibility('cust-attacker', 'GOODS', 'ord-goods-102');

        $this->assertFalse($dto->isValid);
        $this->assertStringContainsString('bukan pemilik sah', $dto->errorMessage);
    }

    /**
     * Test HttpOrderEligibilityVerifier rejects PAID status alone (must be delivered/completed).
     */
    public function test_goods_order_eligibility_rejects_unreceived_paid_order(): void
    {
        Http::fake([
            'http://127.0.0.1:8005/internal/v1/order-barang/orders/ord-goods-103' => Http::response([
                'success' => true,
                'data' => [
                    'id' => 'ord-goods-103',
                    'customer_id' => 'cust-103',
                    'merchant_org_id' => 'org-merch-real-1',
                    'status' => 'PROCESSING', // Not yet received!
                    'items' => [['id' => 'item-1', 'quantity' => 1]],
                ],
            ], 200),
        ]);

        $verifier = new HttpOrderEligibilityVerifier();
        $dto = $verifier->verifyOrderEligibility('cust-103', 'GOODS', 'ord-goods-103');

        $this->assertTrue($dto->isValid);
        $this->assertFalse($dto->isEligibleForAfterSales); // NOT ELIGIBLE!
    }

    /**
     * Parent/Suborder Gate: Reject cross-parent suborder manipulation.
     */
    public function test_goods_order_eligibility_rejects_cross_parent_suborder(): void
    {
        Http::fake([
            'http://127.0.0.1:8005/internal/v1/order-barang/orders/sub-merch-404' => Http::response([
                'success' => true,
                'data' => [
                    'id' => 'sub-merch-404',
                    'checkout_group_id' => 'ord-parent-AUTHENTIC-999', // True parent in 05A
                    'customer_id' => 'cust-104',
                    'merchant_org_id' => 'org-merch-real-1',
                    'status' => 'DELIVERED',
                    'items' => [['id' => 'item-1', 'quantity' => 1]],
                ],
            ], 200),
        ]);

        $verifier = new HttpOrderEligibilityVerifier();
        // Attacker claims sub-merch-404 under foreign parent order ord-parent-FORGED-111
        $dto = $verifier->verifyOrderEligibility('cust-104', 'GOODS', 'ord-parent-FORGED-111', 'sub-merch-404');

        $this->assertFalse($dto->isValid);
        $this->assertStringContainsString('CROSS_PARENT_ORDER_VIOLATION', $dto->errorMessage);
    }

    /**
     * Parent/Suborder Gate: Reject suborder claiming under parent when parent reference is missing or empty.
     */
    public function test_goods_order_eligibility_rejects_missing_parent_reference(): void
    {
        Http::fake([
            'http://127.0.0.1:8005/internal/v1/order-barang/orders/sub-orphan-505' => Http::response([
                'success' => true,
                'data' => [
                    'id' => 'sub-orphan-505',
                    'checkout_group_id' => null, // Missing parent reference!
                    'customer_id' => 'cust-105',
                    'merchant_org_id' => 'org-merch-real-1',
                    'status' => 'DELIVERED',
                    'items' => [['id' => 'item-1', 'quantity' => 1]],
                ],
            ], 200),
        ]);

        $verifier = new HttpOrderEligibilityVerifier();
        $dto = $verifier->verifyOrderEligibility('cust-105', 'GOODS', 'ord-parent-CLAIMED-222', 'sub-orphan-505');

        $this->assertFalse($dto->isValid);
        $this->assertStringContainsString('MISSING_PARENT_ORDER_REFERENCE', $dto->errorMessage);
    }

    /**
     * Parent/Suborder Gate: Reject order when merchant org ID is empty/missing.
     */
    public function test_goods_order_eligibility_rejects_missing_or_empty_merchant_org(): void
    {
        Http::fake([
            'http://127.0.0.1:8005/internal/v1/order-barang/orders/ord-no-merchant' => Http::response([
                'success' => true,
                'data' => [
                    'id' => 'ord-no-merchant',
                    'customer_id' => 'cust-106',
                    'merchant_org_id' => '', // Empty merchant!
                    'status' => 'DELIVERED',
                    'items' => [['id' => 'item-1', 'quantity' => 1]],
                ],
            ], 200),
        ]);

        $verifier = new HttpOrderEligibilityVerifier();
        $dto = $verifier->verifyOrderEligibility('cust-106', 'GOODS', 'ord-no-merchant');

        $this->assertFalse($dto->isValid);
        $this->assertStringContainsString('Organisasi merchant tidak teridentifikasi', $dto->errorMessage);
    }

    /**
     * Test HttpResolutionCoordinator initiates real refund with Finance 06.
     */
    public function test_initiate_refund_dispatches_real_contract_to_finance_06(): void
    {
        Http::fake([
            'http://127.0.0.1:8006/internal/v1/finance/refunds/after-sales' => Http::response([
                'success' => true,
                'data' => [
                    'refund_id' => 'rfd_fin_real_999',
                    'status' => 'SUCCEEDED',
                    'refund_amount_idr' => 200000,
                    'destination' => 'CUSTOMER_SPAY',
                ],
            ], 200),
        ]);

        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-ref-test',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-fin-1',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Test refund initiation',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        CaseItem::create([
            'case_id' => $case->id,
            'source_item_ref' => 'item-1',
            'quantity_requested' => 1,
            'catalog_snapshot' => ['price' => 200000],
        ]);

        $resolution = CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'NOT_STARTED',
        ]);

        $coordinator = new HttpResolutionCoordinator();
        $dispatchData = $coordinator->initiateExternalResolution($case, $resolution);

        $this->assertEquals('rfd_fin_real_999', $dispatchData['external_id']);
        $this->assertEquals('SUCCEEDED', $dispatchData['external_status']);
        $this->assertEquals('06', $dispatchData['target_service']);
        $this->assertEquals('REFUND_DECISION', $dispatchData['purpose']);

        Http::assertSent(function ($request) use ($case) {
            return $request->url() === 'http://127.0.0.1:8006/internal/v1/finance/refunds/after-sales'
                && $request['case_id'] === $case->id
                && $request->header('X-Source-Service')[0] === 'after-sales-service';
        });
    }

    /**
     * Gate 4: Real adapter idempotent retry safety for Finance 06 refund.
     */
    public function test_adapter_refund_dispatch_is_idempotent_on_retry(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-idem-fin',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-idem-fin-1',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Test refund idempotency',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        CaseItem::create([
            'case_id' => $case->id,
            'source_item_ref' => 'item-idem-1',
            'quantity_requested' => 1,
            'catalog_snapshot' => ['price' => 150000],
        ]);

        $resolution = CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'NOT_STARTED',
        ]);

        Http::fake([
            'http://127.0.0.1:8006/internal/v1/finance/refunds/after-sales' => Http::sequence()
                ->push(['success' => true, 'data' => ['refund_id' => 'rfd_fin_idem_101', 'status' => 'SUCCEEDED', 'case_id' => $case->id]], 200)
                ->push(['success' => true, 'data' => ['refund_id' => 'rfd_fin_idem_101', 'status' => 'SUCCEEDED', 'case_id' => $case->id]], 200),
        ]);

        $coordinator = new HttpResolutionCoordinator();
        $res1 = $coordinator->initiateExternalResolution($case, $resolution);
        $res2 = $coordinator->initiateExternalResolution($case, $resolution);

        $this->assertEquals('rfd_fin_idem_101', $res1['external_id']);
        $this->assertEquals('rfd_fin_idem_101', $res2['external_id']);
        $this->assertEquals($res1, $res2, 'Adapter must return identical authoritative result across retries.');
    }

    /**
     * Gate 4: Real adapter idempotent retry safety for Order Barang 05A replacement.
     */
    public function test_adapter_replacement_dispatch_is_idempotent_on_retry(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-idem-rep',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-idem-rep-1',
            'initial_solution' => 'REPLACEMENT',
            'agreed_solution' => 'REPLACEMENT',
            'reason_code' => 'DEFECT',
            'description' => 'Test replacement idempotency',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        CaseItem::create([
            'case_id' => $case->id,
            'source_item_ref' => 'item-rep-1',
            'quantity_requested' => 1,
            'catalog_snapshot' => ['price' => 250000],
        ]);

        $resolution = CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REPLACEMENT',
            'status' => 'NOT_STARTED',
        ]);

        Http::fake([
            'http://127.0.0.1:8005/internal/v1/order-barang/replacements' => Http::sequence()
                ->push(['success' => true, 'data' => ['id' => 'rep_fulf_idem_202', 'status' => 'PREPARING', 'case_id' => $case->id]], 200)
                ->push(['success' => true, 'data' => ['id' => 'rep_fulf_idem_202', 'status' => 'PREPARING', 'case_id' => $case->id]], 200),
        ]);

        $coordinator = new HttpResolutionCoordinator();
        $res1 = $coordinator->initiateExternalResolution($case, $resolution);
        $res2 = $coordinator->initiateExternalResolution($case, $resolution);

        $this->assertEquals('rep_fulf_idem_202', $res1['external_id']);
        $this->assertEquals('rep_fulf_idem_202', $res2['external_id']);
        $this->assertEquals($res1, $res2);
    }

    /**
     * Gate 4: Real adapter idempotent retry safety for Order Jasa 05B warranty rework job.
     */
    public function test_adapter_rework_dispatch_is_idempotent_on_retry(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'SERVICE_WARRANTY',
            'customer_id' => 'cust-idem-rew',
            'owner_org_id' => 'org-provider-001',
            'owner_org_type' => 'PROVIDER',
            'source_order_kind' => 'SERVICE',
            'source_order_id' => 'ord-idem-rew-1',
            'initial_solution' => 'REWORK',
            'agreed_solution' => 'REWORK',
            'reason_code' => 'DEFECT',
            'description' => 'Test rework idempotency',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        $resolution = CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REWORK',
            'status' => 'NOT_STARTED',
        ]);

        Http::fake([
            'http://127.0.0.1:8007/internal/v1/order-jasa/warranty-jobs' => Http::sequence()
                ->push(['success' => true, 'data' => ['id' => 'job_warr_idem_303', 'status' => 'ASSIGNED', 'case_id' => $case->id]], 200)
                ->push(['success' => true, 'data' => ['id' => 'job_warr_idem_303', 'status' => 'ASSIGNED', 'case_id' => $case->id]], 200),
        ]);

        $coordinator = new HttpResolutionCoordinator();
        $res1 = $coordinator->initiateExternalResolution($case, $resolution);
        $res2 = $coordinator->initiateExternalResolution($case, $resolution);

        $this->assertEquals('job_warr_idem_303', $res1['external_id']);
        $this->assertEquals('job_warr_idem_303', $res2['external_id']);
        $this->assertEquals($res1, $res2);
    }

    /**
     * Test verifyExternalCompletion strictly validates downstream status and bans fake prefixes.
     */
    public function test_verify_completion_strictly_rejects_fake_prefixes(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-fake-verify',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-fake-verify',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Test fake prefix rejection',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        $resolution = CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'IN_PROGRESS',
        ]);

        CaseExternalRef::create([
            'case_id' => $case->id,
            'resolution_id' => $resolution->id,
            'target_service' => '06',
            'external_id' => 'rfd_pending_1',
            'external_status' => 'PENDING',
            'purpose' => 'REFUND_DECISION',
        ]);

        // Downstream Finance reports refund is still PROCESSING
        Http::fake([
            'http://127.0.0.1:8006/internal/v1/finance/refunds/rfd_pending_1' => Http::response([
                'success' => true,
                'data' => [
                    'refund_id' => 'rfd_pending_1',
                    'status' => 'PROCESSING',
                    'case_id' => $case->id,
                ],
            ], 200),
        ]);

        $coordinator = new HttpResolutionCoordinator();

        // Attempting to pass fake prefix evidence string MUST BE REJECTED
        $this->expectException(RuntimeException::class);
        $coordinator->verifyExternalCompletion($case, $resolution, 'AUTH_VERIFIED:FIN_REF_OK:fake-prefix-attempt');
    }

    /**
     * Test verifyExternalCompletion succeeds when downstream returns authentic SUCCEEDED status.
     */
    public function test_verify_completion_succeeds_on_authentic_downstream_success(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-real-verify',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-real-verify',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Test authentic downstream verification',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        $resolution = CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'IN_PROGRESS',
        ]);

        CaseExternalRef::create([
            'case_id' => $case->id,
            'resolution_id' => $resolution->id,
            'target_service' => '06',
            'external_id' => 'rfd_success_777',
            'external_status' => 'PENDING',
            'purpose' => 'REFUND_DECISION',
        ]);

        Http::fake([
            'http://127.0.0.1:8006/internal/v1/finance/refunds/rfd_success_777' => Http::response([
                'success' => true,
                'data' => [
                    'refund_id' => 'rfd_success_777',
                    'status' => 'SUCCEEDED',
                    'case_id' => $case->id,
                ],
            ], 200),
        ]);

        $coordinator = new HttpResolutionCoordinator();
        $isVerified = $coordinator->verifyExternalCompletion($case, $resolution, 'receipts/audit_proof.pdf');

        $this->assertTrue($isVerified);
        $this->assertDatabaseHas('case_external_refs', [
            'case_id' => $case->id,
            'external_id' => 'rfd_success_777',
            'external_status' => 'SUCCEEDED',
        ]);
    }

    public function test_goods_and_service_eligibility_use_lightweight_projection_when_claimed_quantities_omitted(): void
    {
        Http::fake([
            'http://127.0.0.1:8005/internal/v1/order-barang/orders/ord-g-light?projection=eligibility' => Http::response([
                'success' => true,
                'data' => [
                    'id' => 'ord-g-light',
                    'checkout_group_id' => 'grp-light-1',
                    'customer_id' => 'cust-light',
                    'merchant_org_id' => 'org-merch-light',
                    'status' => 'COMPLETED',
                    'recipient_name' => 'Ahmad Fauzi',
                    'created_at' => '2026-11-01T10:00:00Z',
                    'items' => [
                        [
                            'id' => 'item-light-1',
                            'product_id' => 'prod-light-1',
                            'name' => 'Kampas Rem',
                            'price' => 150000,
                            'quantity' => 2,
                        ],
                    ],
                ],
            ], 200),
            'http://127.0.0.1:8007/internal/v1/order-jasa/orders/ord-s-light?projection=eligibility' => Http::response([
                'success' => true,
                'data' => [
                    'id' => 'ord-s-light',
                    'customer_id' => 'cust-light',
                    'provider_org_id' => 'org-prov-light',
                    'service_offering_id' => 'srv-light-1',
                    'service_snapshot' => ['id' => 'srv-light-1', 'title' => 'Servis AC'],
                    'customer_name' => 'Ahmad Fauzi',
                    'status' => 'COMPLETED',
                    'created_at' => '2026-11-02T10:00:00Z',
                ],
            ], 200),
        ]);

        $verifier = new HttpOrderEligibilityVerifier();

        $goodsDto = $verifier->verifyOrderEligibility('cust-light', 'GOODS', 'ord-g-light', 'ord-g-light', false);
        $this->assertTrue($goodsDto->isValid);
        $this->assertEquals('COMPLETED', $goodsDto->orderStatus);
        $this->assertEquals('org-merch-light', $goodsDto->ownerOrgId);
        $this->assertEquals(2, $goodsDto->items[0]['remaining_quantity']);

        $serviceDto = $verifier->verifyOrderEligibility('cust-light', 'SERVICE', 'ord-s-light', null, false);
        $this->assertTrue($serviceDto->isValid);
        $this->assertEquals('COMPLETED', $serviceDto->orderStatus);
        $this->assertEquals('org-prov-light', $serviceDto->ownerOrgId);
        $this->assertEquals('srv-light-1', $serviceDto->items[0]['item_id']);
    }
}
