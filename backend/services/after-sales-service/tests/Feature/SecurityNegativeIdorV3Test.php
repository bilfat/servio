<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\AfterSales\Contracts\OrderEligibilityDto;
use App\Domain\AfterSales\Integrations\InMemoryOrderEligibilityVerifier;
use App\Domain\AfterSales\Integrations\InMemoryResolutionCoordinator;
use App\Models\AfterSalesCase;
use App\Models\CaseExternalRef;
use App\Models\CaseItem;
use App\Models\CaseResolution;
use App\Models\OrderWarrantyEntitlement;
use App\Models\ReviewSubmission;
use App\Domain\AfterSales\Integrations\HttpResolutionCoordinator;
use Tests\TestCase;

class SecurityNegativeIdorV3Test extends TestCase
{
    /**
     * V3-1: Unknown order item is rejected immediately with 422.
     */
    public function test_unknown_order_item_is_rejected(): void
    {
        $headers = $this->customerHeaders('cust-v3-1');

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-v3-known-1',
            'case_type' => 'GOODS_RETURN',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Mencoba klaim item yang tidak ada di pesanan',
            'items' => [
                [
                    'order_item_id' => 'item-ghost-999', // UNKNOWN ITEM!
                    'quantity' => 1,
                ],
            ],
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_SUBMIT_FAILED');
    }

    /**
     * V3-2: Empty item ID is rejected.
     */
    public function test_empty_item_id_is_rejected(): void
    {
        $headers = $this->customerHeaders('cust-v3-2');

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-v3-known-2',
            'case_type' => 'GOODS_RETURN',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Item ID kosong',
            'items' => [
                [
                    'order_item_id' => '', // EMPTY!
                    'quantity' => 1,
                ],
            ],
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_SUBMIT_FAILED');
    }

    /**
     * V3-3: Review target product outside order items is rejected.
     */
    public function test_review_target_product_outside_order_is_rejected(): void
    {
        $headers = $this->customerHeaders('cust-v3-3');

        $response = $this->postJson('/api/v1/after-sales/reviews', [
            'source_kind' => 'GOODS',
            'source_order_id' => 'ord-v3-review-1',
            'ratings' => [
                ['target_type' => 'PRODUCT', 'target_id' => 'prod-foreign-item-xxx', 'rating' => 5], // Outside order!
                ['target_type' => 'MERCHANT', 'target_id' => 'org-merchant-001', 'rating' => 5],
            ],
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_REVIEW_FAILED');
    }

    /**
     * V3-4: Review target merchant outside order is rejected.
     */
    public function test_review_target_merchant_outside_order_is_rejected(): void
    {
        $headers = $this->customerHeaders('cust-v3-4');

        $response = $this->postJson('/api/v1/after-sales/reviews', [
            'source_kind' => 'GOODS',
            'source_order_id' => 'ord-v3-review-2',
            'ratings' => [
                ['target_type' => 'PRODUCT', 'target_id' => 'item-001', 'rating' => 5],
                ['target_type' => 'MERCHANT', 'target_id' => 'org-foreign-merchant-xxx', 'rating' => 5], // Outside order!
            ],
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_REVIEW_FAILED');
    }

    /**
     * V3-5: Duplicated target rating in single review request is rejected.
     */
    public function test_duplicated_target_rating_in_single_request_is_rejected(): void
    {
        $headers = $this->customerHeaders('cust-v3-5');

        $response = $this->postJson('/api/v1/after-sales/reviews', [
            'source_kind' => 'GOODS',
            'source_order_id' => 'ord-v3-review-3',
            'ratings' => [
                ['target_type' => 'PRODUCT', 'target_id' => 'item-001', 'rating' => 5],
                ['target_type' => 'PRODUCT', 'target_id' => 'item-001', 'rating' => 4], // DUPLICATED!
                ['target_type' => 'MERCHANT', 'target_id' => 'org-merchant-001', 'rating' => 5],
            ],
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_REVIEW_FAILED');
    }

    /**
     * V3-6: Overwrite existing warranty snapshot with conflicting data is rejected with 409 Conflict.
     */
    public function test_overwrite_existing_warranty_snapshot_conflict_rejected(): void
    {
        $internalHeaders = $this->internalHeaders();

        $snapshotPayload = [
            'source_kind' => 'GOODS',
            'order_id' => 'ord-snap-immutable-1',
            'order_item_key' => 'item-snap-1',
            'customer_id' => 'cust-snap-1',
            'owner_org_type' => 'MERCHANT',
            'owner_org_id' => 'org-merchant-001',
            'catalog_ref' => 'cat-ref-1',
            'snapshot_name' => 'Garansi Resmi 30 Hari',
            'snapshot_duration_days' => 30,
        ];

        // First record
        $res1 = $this->postJson('/internal/v1/after-sales/order-warranty-snapshots', $snapshotPayload, $internalHeaders);
        $res1->assertStatus(201);

        // Attempt to tamper with immutable snapshot (e.g. changing duration to 365 days)
        $conflictingPayload = array_merge($snapshotPayload, [
            'snapshot_duration_days' => 365,
        ]);

        $res2 = $this->postJson('/internal/v1/after-sales/order-warranty-snapshots', $conflictingPayload, $internalHeaders);
        $res2->assertStatus(409)
            ->assertJsonPath('error.code', 'AFTER_SALES_SNAPSHOT_CONFLICT');
    }

    /**
     * V3-7: Claim on expired warranty entitlement is rejected with 422.
     */
    public function test_claim_on_expired_warranty_is_rejected(): void
    {
        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'GOODS',
            'order_id' => 'ord-g-expired-1',
            'order_item_key' => 'item-001',
            'customer_id' => 'cust-exp-1',
            'owner_org_type' => 'MERCHANT',
            'owner_org_id' => 'org-merchant-001',
            'catalog_ref' => 'cat-exp-1',
            'snapshot_name' => 'Garansi 7 Hari',
            'snapshot_duration_days' => 7,
            'status' => 'ACTIVE',
            'starts_at' => now()->subDays(10),
            'expires_at' => now()->subDays(3), // EXPIRED 3 DAYS AGO!
        ]);

        $headers = $this->customerHeaders('cust-exp-1');

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-expired-1',
            'case_type' => 'GOODS_WARRANTY',
            'initial_solution' => 'REPLACEMENT',
            'reason_code' => 'DEFECT',
            'description' => 'Mencoba klaim garansi yang sudah basi',
            'entitlement_id' => $entitlement->id,
            'items' => [
                ['order_item_id' => 'item-001', 'quantity' => 1],
            ],
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_SUBMIT_FAILED');
    }

    /**
     * V3-8: Internal callback from mismatched caller identity is rejected with 403.
     */
    public function test_internal_callback_source_service_mismatch_rejected(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-cb-1',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-cb-1',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Test callback',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        $headers = array_merge($this->internalHeaders(), [
            'X-Source-Service' => 'finance-service', // Claiming finance service...
        ]);

        // ...but payload specifies 05A (Order Barang)!
        $response = $this->postJson("/internal/v1/after-sales/cases/{$case->id}/external-update", [
            'target_service' => '05A',
            'external_id' => 'rep_123',
            'external_status' => 'DELIVERED',
            'purpose' => 'REPLACEMENT_FULFILLMENT',
        ], $headers);

        $response->assertStatus(403)
            ->assertJsonPath('error.code', 'SOURCE_IDENTITY_MISMATCH');
    }

    /**
     * V3-9: Internal callback with unknown external_id is rejected with 404.
     */
    public function test_internal_callback_unknown_external_id_rejected(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-cb-2',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-cb-2',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Test callback unknown ID',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        $headers = $this->internalHeaders('finance-service');

        $response = $this->postJson("/internal/v1/after-sales/cases/{$case->id}/external-update", [
            'target_service' => '06',
            'external_id' => 'rfd_unknown_fake_999', // UNREGISTERED ID!
            'external_status' => 'SUCCEEDED',
            'purpose' => 'REFUND_DECISION',
        ], $headers);

        $response->assertStatus(404)
            ->assertJsonPath('error.code', 'UNKNOWN_EXTERNAL_RESOURCE');
    }

    /**
     * V3-10: Internal callback state regression from terminal SUCCEEDED to PENDING is rejected.
     */
    public function test_internal_callback_state_regression_rejected(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-cb-3',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-cb-3',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Test regression',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        $res = CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'IN_PROGRESS',
        ]);

        CaseExternalRef::create([
            'case_id' => $case->id,
            'resolution_id' => $res->id,
            'target_service' => '06',
            'external_id' => 'rfd_terminal_101',
            'external_status' => 'SUCCEEDED', // ALREADY SUCCEEDED!
            'purpose' => 'REFUND_DECISION',
        ]);

        $headers = $this->internalHeaders('finance-service');

        // Regress from SUCCEEDED to PENDING -> FORBIDDEN!
        $response = $this->postJson("/internal/v1/after-sales/cases/{$case->id}/external-update", [
            'target_service' => '06',
            'external_id' => 'rfd_terminal_101',
            'external_status' => 'PENDING',
            'purpose' => 'REFUND_DECISION',
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'INVALID_STATE_REGRESSION');
    }

    /**
     * V4-1: Cross-order warranty claim using entitlement belonging to a different order is rejected with 422.
     */
    public function test_v4_cross_order_warranty_claim_is_rejected(): void
    {
        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'GOODS',
            'order_id' => 'ord-g-original-order-1', // BELONGS TO ORDER 1
            'order_item_key' => 'item-001',
            'customer_id' => 'cust-v4-cross-order',
            'owner_org_type' => 'MERCHANT',
            'owner_org_id' => 'org-merchant-001',
            'catalog_ref' => 'cat-001',
            'snapshot_name' => 'Garansi 30 Hari',
            'snapshot_duration_days' => 30,
            'status' => 'ACTIVE',
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(29),
        ]);

        $headers = $this->customerHeaders('cust-v4-cross-order');

        // Customer attempts to use entitlement on a completely different order
        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-different-order-2', // DIFFERENT ORDER!
            'case_type' => 'GOODS_WARRANTY',
            'initial_solution' => 'REPLACEMENT',
            'reason_code' => 'DEFECT',
            'description' => 'Mencoba klaim garansi dari pesanan berbeda',
            'entitlement_id' => $entitlement->id,
            'items' => [
                ['order_item_id' => 'item-001', 'quantity' => 1],
            ],
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_SUBMIT_FAILED');
        $this->assertStringContainsString('bukan pesanan yang diajukan', $response->json('error.message'));
    }

    /**
     * V4-2: Cross-item warranty claim using entitlement belonging to a different item is rejected with 422.
     */
    public function test_v4_cross_item_warranty_claim_is_rejected(): void
    {
        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'GOODS',
            'order_id' => 'ord-g-item-check-1',
            'order_item_key' => 'item-001', // ENTITLEMENT IS FOR ITEM-001
            'customer_id' => 'cust-v4-cross-item',
            'owner_org_type' => 'MERCHANT',
            'owner_org_id' => 'org-merchant-001',
            'catalog_ref' => 'cat-001',
            'snapshot_name' => 'Garansi 30 Hari',
            'snapshot_duration_days' => 30,
            'status' => 'ACTIVE',
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(29),
        ]);

        $headers = $this->customerHeaders('cust-v4-cross-item');

        // Customer attempts to claim item-303 using entitlement for item-001
        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-item-check-1',
            'case_type' => 'GOODS_WARRANTY',
            'initial_solution' => 'REPLACEMENT',
            'reason_code' => 'DEFECT',
            'description' => 'Mencoba klaim garansi untuk item lain',
            'entitlement_id' => $entitlement->id,
            'items' => [
                ['order_item_id' => 'item-303', 'quantity' => 1], // DIFFERENT ITEM!
            ],
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_SUBMIT_FAILED');
        $this->assertStringContainsString('terikat pada item', $response->json('error.message'));
    }

    /**
     * V4-3: Cross-organization warranty claim is rejected with 422.
     */
    public function test_v4_cross_org_warranty_claim_is_rejected(): void
    {
        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'GOODS',
            'order_id' => 'ord-g-org-check-1',
            'order_item_key' => 'item-001',
            'customer_id' => 'cust-v4-cross-org',
            'owner_org_type' => 'MERCHANT',
            'owner_org_id' => 'org-foreign-attacker', // FOREIGN ORG!
            'catalog_ref' => 'cat-001',
            'snapshot_name' => 'Garansi 30 Hari',
            'snapshot_duration_days' => 30,
            'status' => 'ACTIVE',
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDays(29),
        ]);

        $headers = $this->customerHeaders('cust-v4-cross-org');

        $response = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-org-check-1',
            'case_type' => 'GOODS_WARRANTY',
            'initial_solution' => 'REPLACEMENT',
            'reason_code' => 'DEFECT',
            'description' => 'Mencoba klaim dengan organisasi asing',
            'entitlement_id' => $entitlement->id,
            'items' => [
                ['order_item_id' => 'item-001', 'quantity' => 1],
            ],
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_SUBMIT_FAILED');
        $this->assertStringContainsString('CROSS_ORG_WARRANTY_FORBIDDEN', $response->json('error.message'));
    }

    /**
     * V4-4: Review on delivered-only (non-COMPLETED) order is rejected with 422.
     */
    public function test_v4_review_on_delivered_but_uncompleted_order_is_rejected(): void
    {
        $headers = $this->customerHeaders('cust-v4-review-deliv');

        // Order has DELIVERED status in InMemoryVerifier, not COMPLETED
        $response = $this->postJson('/api/v1/after-sales/reviews', [
            'source_kind' => 'GOODS',
            'source_order_id' => 'delivered-only-ord-1', // Non-COMPLETED!
            'ratings' => [
                ['target_type' => 'PRODUCT', 'target_id' => 'item-001', 'rating' => 5],
                ['target_type' => 'MERCHANT', 'target_id' => 'org-merchant-001', 'rating' => 5],
            ],
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_REVIEW_FAILED');
        $this->assertStringContainsString('COMPLETED', $response->json('error.message'));
    }

    /**
     * V4-5: Internal callback without X-Source-Service header is rejected with 403.
     */
    public function test_v4_internal_callback_without_source_service_header_rejected(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-cb-no-header',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-cb-no-header',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Test missing header',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        $headers = [
            'X-Internal-Service-Key' => $this->internalServiceKey,
            'Accept' => 'application/json',
            // OMITTING X-Source-Service completely!
        ];

        $response = $this->postJson("/internal/v1/after-sales/cases/{$case->id}/external-update", [
            'target_service' => '06',
            'external_id' => 'rfd_123',
            'external_status' => 'SUCCEEDED',
            'purpose' => 'REFUND_DECISION',
        ], $headers);

        $response->assertStatus(403)
            ->assertJsonPath('error.code', 'SOURCE_SERVICE_REQUIRED');
    }

    /**
     * V4-6: Internal callback with mismatched purpose is rejected with 422.
     */
    public function test_v4_internal_callback_mismatched_purpose_rejected(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-cb-purpose',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-cb-purpose',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Test purpose mismatch',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        $res = CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'IN_PROGRESS',
        ]);

        CaseExternalRef::create([
            'case_id' => $case->id,
            'resolution_id' => $res->id,
            'target_service' => '06',
            'external_id' => 'rfd_purpose_101',
            'external_status' => 'IN_PROGRESS',
            'purpose' => 'REFUND_DECISION', // REGISTERED PURPOSE
        ]);

        $headers = $this->internalHeaders('finance-service');

        // Sending mismatched purpose (REPLACEMENT_FULFILLMENT instead of REFUND_DECISION)
        $response = $this->postJson("/internal/v1/after-sales/cases/{$case->id}/external-update", [
            'target_service' => '06',
            'external_id' => 'rfd_purpose_101',
            'external_status' => 'SUCCEEDED',
            'purpose' => 'REPLACEMENT_FULFILLMENT', // MISMATCHED!
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'MISMATCHED_PURPOSE');
    }

    /**
     * V4-7: REPAIR_GOODS does NOT create replacement fulfillment and is blocked.
     */
    public function test_v4_repair_goods_does_not_create_replacement(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-repair-test',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-repair-test-1',
            'initial_solution' => 'REPLACEMENT',
            'agreed_solution' => 'REPAIR_GOODS',
            'reason_code' => 'DEFECT',
            'description' => 'Perbaikan barang',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        CaseItem::create([
            'case_id' => $case->id,
            'source_item_ref' => 'item-001',
            'quantity_requested' => 1,
            'catalog_snapshot' => ['price' => 100000],
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REPAIR_GOODS',
            'status' => 'NOT_STARTED',
        ]);

        $merchHeaders = $this->merchantHeaders('merch-user', 'org-merchant-001');

        $response = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/resolution-action", [], $merchHeaders);

        // REPAIR_GOODS MUST be blocked and not create replacement
        $response->assertStatus(422);
        $this->assertStringContainsString('REPAIR_GOODS saat ini ditangguhkan', $response->json('error.message'));

        $this->assertDatabaseMissing('case_external_refs', [
            'case_id' => $case->id,
            'purpose' => 'REPLACEMENT_FULFILLMENT',
        ]);
    }

    /**
     * V4-8: In-flight concurrent idempotency request returns 409 Conflict.
     */
    public function test_v4_concurrent_in_flight_idempotency_request_returns_409(): void
    {
        $headers = $this->customerHeaders('cust-v4-inflight');
        $idempotencyKey = 'concurrent-key-' . time();
        $headers['Idempotency-Key'] = $idempotencyKey;

        // Pre-insert an IN_FLIGHT record
        $scopeKey = hash('sha256', 'POST|api/v1/after-sales/cases|cust-v4-inflight||' . $idempotencyKey);
        $payload = [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-v4-inflight-1',
            'case_type' => 'GOODS_RETURN',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Test in-flight conflict',
            'items' => [
                ['order_item_id' => 'item-001', 'quantity' => 1],
            ],
        ];

        \App\Models\IdempotencyRecord::create([
            'scope_key' => $scopeKey,
            'payload_hash' => hash('sha256', json_encode($payload)),
            'status' => 'IN_FLIGHT',
            'locked_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/after-sales/cases', $payload, $headers);

        $response->assertStatus(409)
            ->assertJsonPath('error.code', 'REQUEST_IN_FLIGHT');
    }

    /**
     * V4-9: Refund calculation without valid price fails and bans guessed amounts.
     */
    public function test_v4_refund_calculation_without_valid_price_fails(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-no-price',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-no-price-1',
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'No price test',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        // Item with EMPTY price snapshot!
        \App\Models\CaseItem::create([
            'case_id' => $case->id,
            'source_item_ref' => 'item-zero',
            'quantity_requested' => 1,
            'catalog_snapshot' => ['title' => 'Produk Tanpa Harga'], // NO PRICE!
        ]);

        $res = CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'NOT_STARTED',
        ]);

        $coordinator = new HttpResolutionCoordinator();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Nominal tebakan dilarang');

        $coordinator->initiateExternalResolution($case, $res);
    }

    /**
     * V4-10: Outbox dispatcher does not falsely publish when downstream service fails.
     */
    public function test_v4_outbox_dispatcher_does_not_falsely_publish_when_downstream_fails(): void
    {
        $event = \App\Models\OutboxEvent::create([
            'event_type' => 'after_sales.test.v4',
            'aggregate_type' => 'TEST',
            'aggregate_id' => 'test-agg-1',
            'payload' => ['foo' => 'bar'],
            'status' => 'PENDING',
        ]);

        // Run artisan command (Notification 10 is down on test env)
        $this->artisan('after-sales:dispatch-outbox');

        $event->refresh();
        $this->assertNotEquals('PUBLISHED', $event->status);
        $this->assertTrue(in_array($event->status, ['PENDING', 'FAILED'], true));
        $this->assertNotNull($event->last_error);
    }
}

