<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\AfterSales\Contracts\OrderEligibilityDto;
use App\Domain\AfterSales\Contracts\OrderEligibilityVerifierInterface;
use App\Domain\AfterSales\Contracts\ResolutionCoordinatorInterface;
use App\Models\AfterSalesCase;
use App\Models\CaseExternalRef;
use App\Models\CaseProposal;
use App\Models\CaseResolution;
use App\Models\OrderWarrantyEntitlement;
use Tests\TestCase;

class Phase07MasterScenariosTest extends TestCase
{
    /**
     * TEST A: Aktivasi Garansi Barang Otomatis
     * Order 05A item bergaransi (contoh: 30 hari).
     * Saat pesanan sampai dan di-complete -> webhook / S2S event masuk ke After-Sales.
     * Entitlement tercipta dengan status ACTIVE, starts_at = now(), expires_at = now() + 30 days.
     */
    public function test_scenario_a_automatic_goods_warranty_activation(): void
    {
        $orderId = 'ord-goods-scen-a-' . uniqid();
        $customerId = 'cust-scen-a-001';
        $merchantOrgId = 'org-merchant-001';

        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'GOODS',
            'order_id' => $orderId,
            'order_item_key' => 'item-a-1',
            'customer_id' => $customerId,
            'owner_org_type' => 'MERCHANT',
            'owner_org_id' => $merchantOrgId,
            'catalog_ref' => 'prod-nym-kabel',
            'snapshot_name' => 'Garansi Toko Resmi 30 Hari',
            'snapshot_duration_days' => 30,
            'quantity' => 1,
            'claimed_quantity' => 0,
            'status' => 'PENDING_START',
        ]);

        $headers = $this->internalHeaders('order-barang-service');
        $completionTime = now();

        $response = $this->postJson('/internal/v1/after-sales/order-completions', [
            'source_kind' => 'GOODS',
            'order_id' => $orderId,
            'completed_at' => $completionTime->toIso8601String(),
        ], $headers);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.activated_entitlements_count', 1);

        $entitlement->refresh();
        $this->assertEquals('ACTIVE', $entitlement->status);
        $this->assertNotNull($entitlement->starts_at);
        $this->assertNotNull($entitlement->expires_at);
        $this->assertTrue($entitlement->expires_at->isAfter($entitlement->starts_at));
        $this->assertEquals(30, (int) $entitlement->starts_at->diffInDays($entitlement->expires_at));
    }

    /**
     * TEST B: Aktivasi Garansi Jasa Otomatis
     * Order 05B jasa servis AC bergaransi (contoh: 14 hari).
     * Saat pesanan selesai dan settled -> webhook / S2S event masuk ke After-Sales.
     * Entitlement tercipta dengan status ACTIVE, source_kind = SERVICE.
     */
    public function test_scenario_b_automatic_service_warranty_activation(): void
    {
        $orderId = 'ord-jasa-scen-b-' . uniqid();
        $customerId = 'cust-scen-b-002';
        $providerOrgId = 'org-provider-001';

        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'SERVICE',
            'order_id' => $orderId,
            'order_item_key' => 'svc-item-b-1',
            'customer_id' => $customerId,
            'owner_org_type' => 'PROVIDER',
            'owner_org_id' => $providerOrgId,
            'catalog_ref' => 'svc-cuci-ac-split',
            'snapshot_name' => 'Garansi Cuci AC 14 Hari',
            'snapshot_duration_days' => 14,
            'quantity' => 1,
            'claimed_quantity' => 0,
            'status' => 'PENDING_START',
        ]);

        $headers = $this->internalHeaders('order-jasa-service');
        $completionTime = now();

        $response = $this->postJson('/internal/v1/after-sales/order-completions', [
            'source_kind' => 'SERVICE',
            'order_id' => $orderId,
            'completed_at' => $completionTime->toIso8601String(),
        ], $headers);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.activated_entitlements_count', 1);

        $entitlement->refresh();
        $this->assertEquals('ACTIVE', $entitlement->status);
        $this->assertEquals('SERVICE', $entitlement->source_kind);
        $this->assertNotNull($entitlement->starts_at);
        $this->assertNotNull($entitlement->expires_at);
        $this->assertEquals(14, (int) $entitlement->starts_at->diffInDays($entitlement->expires_at));
    }

    /**
     * TEST C: Alur Klaim Garansi Barang — Solusi Refund
     * Customer mengajukan klaim garansi pada entitlement barang: customerRequestedSolution = REFUND.
     * Merchant menyetujui klaim: action = ACCEPT_INITIAL, startResolution().
     * Finance memproses kredit saldo S-Pay ke Customer.
     * Case beralih ke IN_RESOLUTION -> COMPLETED, entitlement menjadi CONSUMED.
     */
    public function test_scenario_c_goods_warranty_claim_refund_flow(): void
    {
        $orderId = 'ord-goods-c-' . uniqid();
        $customerId = '692f03fd-2362-485a-9a23-a672bbb4533f';
        $merchantOrgId = 'org-merchant-001';

        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'GOODS',
            'order_id' => $orderId,
            'order_item_key' => 'item-001',
            'customer_id' => $customerId,
            'owner_org_type' => 'MERCHANT',
            'owner_org_id' => $merchantOrgId,
            'catalog_ref' => 'prod-kulkas-sharp',
            'snapshot_name' => 'Garansi Toko 30 Hari',
            'snapshot_duration_days' => 30,
            'quantity' => 1,
            'claimed_quantity' => 0,
            'starts_at' => now()->subDays(2),
            'expires_at' => now()->addDays(28),
            'status' => 'ACTIVE',
        ]);

        // Customer submits claim with REFUND solution
        $cHeaders = $this->customerHeaders($customerId);
        $submitRes = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => $orderId,
            'case_type' => 'GOODS_WARRANTY',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECTIVE_COMPONENT',
            'description' => 'Kompresor kulkas tidak mendingin sama sekali sejak hari pertama.',
            'entitlement_id' => $entitlement->id,
            'items' => [
                [
                    'order_item_id' => 'item-001',
                    'quantity' => 1,
                    'catalog_snapshot' => [
                        'name' => 'Kulkas 2 Pintu Inverter',
                        'price_idr' => 3500000,
                    ],
                ],
            ],
            'evidence_data' => [
                [
                    'media_ref' => 'evidence/cases/proof-c.jpg',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 102400,
                ],
            ],
        ], $cHeaders);

        $submitRes->assertStatus(201);
        $caseId = $submitRes->json()['data']['id'];

        $entitlement->refresh();
        $this->assertEquals(1, $entitlement->claimed_quantity);

        // Merchant reviews and accepts REFUND
        $mHeaders = $this->merchantHeaders('4bee4c28-6799-4054-87a3-321e29811921', $merchantOrgId);
        $decideRes = $this->postJson("/api/v1/after-sales/business/cases/{$caseId}/decision", [
            'action' => 'ACCEPT_INITIAL',
            'case_version' => 1,
            'reason' => 'Disetujui untuk pengembalian dana penuh ke saldo S-Pay.',
        ], $mHeaders);
        $decideRes->assertStatus(200);

        // Merchant triggers resolution start (Dispatches refund to Finance 06)
        $resStart = $this->postJson("/api/v1/after-sales/business/cases/{$caseId}/resolution-action", [], $mHeaders);
        $resStart->assertStatus(200);

        $case = AfterSalesCase::findOrFail($caseId);
        $this->assertEquals('IN_RESOLUTION', $case->main_status);
        $this->assertEquals('REFUND', $case->agreed_solution);

        // Customer confirms completion
        $confirmRes = $this->postJson("/api/v1/after-sales/cases/{$caseId}/confirm-completion", [
            'notes' => 'Dana refund telah masuk ke saldo S-Pay. Terima kasih.',
            'rating' => 5,
        ], $cHeaders);
        $confirmRes->assertStatus(200);

        $case->refresh();
        $this->assertEquals('COMPLETED', $case->main_status);

        $entitlement->refresh();
        $this->assertEquals('CONSUMED', $entitlement->status);
    }

    /**
     * TEST D: Alur Klaim Garansi Barang — Solusi Penggantian Barang (Replacement)
     * Customer mengajukan klaim garansi barang: customerRequestedSolution = REPLACEMENT.
     * Merchant menyetujui klaim: action = ACCEPT_INITIAL, startResolution().
     * Replacement fulfillment dicatat ke Order Barang 05A.
     * Customer mengonfirmasi penerimaan di /warranties -> case COMPLETED, entitlement CONSUMED.
     */
    public function test_scenario_d_goods_warranty_claim_replacement_flow(): void
    {
        $orderId = 'ord-goods-d-' . uniqid();
        $customerId = '692f03fd-2362-485a-9a23-a672bbb4533f';
        $merchantOrgId = 'org-merchant-001';

        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'GOODS',
            'order_id' => $orderId,
            'order_item_key' => 'item-001',
            'customer_id' => $customerId,
            'owner_org_type' => 'MERCHANT',
            'owner_org_id' => $merchantOrgId,
            'catalog_ref' => 'prod-exhaust-fan',
            'snapshot_name' => 'Garansi Resmi Toko 14 Hari',
            'snapshot_duration_days' => 14,
            'quantity' => 1,
            'claimed_quantity' => 0,
            'starts_at' => now()->subDays(1),
            'expires_at' => now()->addDays(13),
            'status' => 'ACTIVE',
        ]);

        $cHeaders = $this->customerHeaders($customerId);
        $submitRes = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => $orderId,
            'case_type' => 'GOODS_WARRANTY',
            'initial_solution' => 'REPLACEMENT',
            'reason_code' => 'DAMAGED_ON_ARRIVAL',
            'description' => 'Baling-baling kipas pecah saat pertama kali dibuka dari kemasan.',
            'entitlement_id' => $entitlement->id,
            'items' => [
                [
                    'order_item_id' => 'item-001',
                    'quantity' => 1,
                    'catalog_snapshot' => [
                        'name' => 'Kipas Exhaust Industri 886',
                        'price_idr' => 450000,
                    ],
                ],
            ],
            'evidence_data' => [
                [
                    'media_ref' => 'evidence/cases/proof-d.jpg',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 102400,
                ],
            ],
        ], $cHeaders);

        $submitRes->assertStatus(201);
        $caseId = $submitRes->json()['data']['id'];

        // Merchant accepts REPLACEMENT
        $mHeaders = $this->merchantHeaders('4bee4c28-6799-4054-87a3-321e29811921', $merchantOrgId);
        $this->postJson("/api/v1/after-sales/business/cases/{$caseId}/decision", [
            'action' => 'ACCEPT_INITIAL',
            'case_version' => 1,
            'reason' => 'Disetujui penggantian unit baru.',
        ], $mHeaders)->assertStatus(200);

        // Merchant starts resolution (Dispatches replacement to 05A)
        $this->postJson("/api/v1/after-sales/business/cases/{$caseId}/resolution-action", [], $mHeaders)->assertStatus(200);

        $case = AfterSalesCase::findOrFail($caseId);
        $this->assertEquals('IN_RESOLUTION', $case->main_status);
        $this->assertEquals('REPLACEMENT', $case->agreed_solution);

        // Customer confirms receipt of replacement
        $this->postJson("/api/v1/after-sales/cases/{$caseId}/confirm-completion", [
            'notes' => 'Unit pengganti telah diterima dengan kondisi mulus dan berfungsi baik.',
            'rating' => 5,
        ], $cHeaders)->assertStatus(200);

        $case->refresh();
        $this->assertEquals('COMPLETED', $case->main_status);

        $entitlement->refresh();
        $this->assertEquals('CONSUMED', $entitlement->status);
    }

    /**
     * TEST E: Alur Klaim Garansi Jasa — Solusi Refund
     * Customer mengajukan klaim garansi jasa: customerRequestedSolution = REFUND.
     * Provider menyetujui: action = ACCEPT_INITIAL, startResolution().
     * Finance memproses refund ke saldo S-Pay Customer.
     * Case COMPLETED, entitlement CONSUMED.
     */
    public function test_scenario_e_service_warranty_claim_refund_flow(): void
    {
        $orderId = 'ord-jasa-e-' . uniqid();
        $customerId = '692f03fd-2362-485a-9a23-a672bbb4533f';
        $providerOrgId = 'org-provider-001';

        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'SERVICE',
            'order_id' => $orderId,
            'order_item_key' => 'item-001',
            'customer_id' => $customerId,
            'owner_org_type' => 'PROVIDER',
            'owner_org_id' => $providerOrgId,
            'catalog_ref' => 'svc-cuci-ac-split',
            'snapshot_name' => 'Garansi Cuci AC 14 Hari',
            'snapshot_duration_days' => 14,
            'quantity' => 1,
            'claimed_quantity' => 0,
            'starts_at' => now()->subDays(3),
            'expires_at' => now()->addDays(11),
            'status' => 'ACTIVE',
        ]);

        $cHeaders = $this->customerHeaders($customerId);
        $submitRes = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'SERVICE',
            'source_order_id' => $orderId,
            'case_type' => 'SERVICE_WARRANTY',
            'initial_solution' => 'REFUND',
            'reason_code' => 'SERVICE_UNSATISFACTORY',
            'description' => 'Teknisi tidak membersihkan unit outdoor dan AC masih tidak dingin.',
            'entitlement_id' => $entitlement->id,
            'items' => [
                [
                    'order_item_id' => 'item-001',
                    'quantity' => 1,
                    'catalog_snapshot' => [
                        'name' => 'Cuci dan Servis AC Split Mandiri',
                        'price_idr' => 150000,
                    ],
                ],
            ],
            'evidence_data' => [
                [
                    'media_ref' => 'evidence/cases/proof-e.jpg',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 102400,
                ],
            ],
        ], $cHeaders);

        $submitRes->assertStatus(201);
        $caseId = $submitRes->json()['data']['id'];

        // Provider reviews and accepts REFUND
        $pHeaders = $this->providerHeaders('8ecc27f5-d30e-401e-89d5-aceec765a19a', $providerOrgId);
        $this->postJson("/api/v1/after-sales/business/cases/{$caseId}/decision", [
            'action' => 'ACCEPT_INITIAL',
            'case_version' => 1,
            'reason' => 'Disetujui refund biaya jasa.',
        ], $pHeaders)->assertStatus(200);

        // Provider starts resolution
        $this->postJson("/api/v1/after-sales/business/cases/{$caseId}/resolution-action", [], $pHeaders)->assertStatus(200);

        $case = AfterSalesCase::findOrFail($caseId);
        $this->assertEquals('IN_RESOLUTION', $case->main_status);

        // Customer confirms completion
        $this->postJson("/api/v1/after-sales/cases/{$caseId}/confirm-completion", [
            'notes' => 'Dana telah dikembalikan ke saldo S-Pay.',
        ], $cHeaders)->assertStatus(200);

        $case->refresh();
        $this->assertEquals('COMPLETED', $case->main_status);

        $entitlement->refresh();
        $this->assertEquals('CONSUMED', $entitlement->status);
    }

    /**
     * TEST F: Alur Klaim Garansi Jasa — Solusi Perbaikan Ulang (Rework)
     * Customer mengajukan klaim garansi jasa: customerRequestedSolution = REWORK.
     * Provider menyetujui penugasan pengerjaan garansi Rp0.
     * After-Sales memanggil Order Jasa 05B yang membuat ServiceWarrantyJob.
     * Customer memverifikasi di /warranties -> case COMPLETED, entitlement CONSUMED.
     */
    public function test_scenario_f_service_warranty_claim_rework_flow(): void
    {
        $orderId = 'ord-jasa-f-' . uniqid();
        $customerId = '692f03fd-2362-485a-9a23-a672bbb4533f';
        $providerOrgId = 'org-provider-001';

        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'SERVICE',
            'order_id' => $orderId,
            'order_item_key' => 'item-001',
            'customer_id' => $customerId,
            'owner_org_type' => 'PROVIDER',
            'owner_org_id' => $providerOrgId,
            'catalog_ref' => 'svc-cuci-ac-split',
            'snapshot_name' => 'Garansi Cuci AC 14 Hari',
            'snapshot_duration_days' => 14,
            'quantity' => 1,
            'claimed_quantity' => 0,
            'starts_at' => now()->subDays(2),
            'expires_at' => now()->addDays(12),
            'status' => 'ACTIVE',
        ]);

        $cHeaders = $this->customerHeaders($customerId);
        $submitRes = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'SERVICE',
            'source_order_id' => $orderId,
            'case_type' => 'SERVICE_WARRANTY',
            'initial_solution' => 'REWORK',
            'reason_code' => 'RECURRING_ISSUE',
            'description' => 'Talang air indoor AC menetes setelah dicuci.',
            'entitlement_id' => $entitlement->id,
            'items' => [
                [
                    'order_item_id' => 'item-001',
                    'quantity' => 1,
                    'catalog_snapshot' => [
                        'name' => 'Cuci dan Servis AC Split Mandiri',
                        'price_idr' => 150000,
                    ],
                ],
            ],
            'evidence_data' => [
                [
                    'media_ref' => 'evidence/cases/proof-f.jpg',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 102400,
                ],
            ],
        ], $cHeaders);

        $submitRes->assertStatus(201);
        $caseId = $submitRes->json()['data']['id'];

        // Provider accepts REWORK and assigns technician
        $pHeaders = $this->providerHeaders('8ecc27f5-d30e-401e-89d5-aceec765a19a', $providerOrgId);
        $this->postJson("/api/v1/after-sales/business/cases/{$caseId}/decision", [
            'action' => 'ACCEPT_INITIAL',
            'case_version' => 1,
            'reason' => 'Teknisi Ahmad Fauzi ditugaskan untuk reposisi talang air garansi Rp0.',
        ], $pHeaders)->assertStatus(200);

        // Provider starts resolution (Triggers warranty job creation in 05B)
        $this->postJson("/api/v1/after-sales/business/cases/{$caseId}/resolution-action", [], $pHeaders)->assertStatus(200);

        $case = AfterSalesCase::findOrFail($caseId);
        $this->assertEquals('IN_RESOLUTION', $case->main_status);
        $this->assertEquals('REWORK', $case->agreed_solution);

        // Customer verifies completion
        $this->postJson("/api/v1/after-sales/cases/{$caseId}/confirm-completion", [
            'notes' => 'Teknisi telah datang dan memperbaiki talang air. Bocor sudah teratasi.',
            'rating' => 5,
        ], $cHeaders)->assertStatus(200);

        $case->refresh();
        $this->assertEquals('COMPLETED', $case->main_status);

        $entitlement->refresh();
        $this->assertEquals('CONSUMED', $entitlement->status);
    }

    /**
     * TEST G: Partial Quantity Claim & Multiple Units
     * Order barang quantity 2 unit.
     * Entitlement memiliki quantity: 2, claimed_quantity: 0. Status: ACTIVE.
     * Customer mengajukan klaim untuk 1 unit saja.
     * Entitlement tetap ACTIVE dengan sisa 1 unit yang masih bisa diklaim.
     * Unit pertama diselesaikan -> claimed_quantity: 1, status: ACTIVE.
     * Customer sekarang dapat mengajukan klaim untuk unit ke-2.
     */
    public function test_scenario_g_partial_quantity_claim_and_multiple_units(): void
    {
        $orderId = 'ord-goods-g-' . uniqid();
        $customerId = '692f03fd-2362-485a-9a23-a672bbb4533f';
        $merchantOrgId = 'org-merchant-001';

        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'GOODS',
            'order_id' => $orderId,
            'order_item_key' => 'item-001',
            'customer_id' => $customerId,
            'owner_org_type' => 'MERCHANT',
            'owner_org_id' => $merchantOrgId,
            'catalog_ref' => 'prod-kabel-roll',
            'snapshot_name' => 'Garansi 30 Hari',
            'snapshot_duration_days' => 30,
            'quantity' => 2,
            'claimed_quantity' => 0,
            'starts_at' => now()->subDays(1),
            'expires_at' => now()->addDays(29),
            'status' => 'ACTIVE',
        ]);

        $cHeaders = $this->customerHeaders($customerId);

        // 1. Claim Unit 1 of 2
        $submit1 = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => $orderId,
            'case_type' => 'GOODS_WARRANTY',
            'initial_solution' => 'REPLACEMENT',
            'reason_code' => 'DEFECTIVE_COMPONENT',
            'description' => 'Kabel unit pertama putus di bagian sambungan tembaga.',
            'entitlement_id' => $entitlement->id,
            'items' => [
                [
                    'order_item_id' => 'item-001',
                    'quantity' => 1,
                    'catalog_snapshot' => [
                        'name' => 'Kabel Power NYM Roll',
                        'price_idr' => 250000,
                    ],
                ],
            ],
            'evidence_data' => [
                [
                    'media_ref' => 'evidence/cases/proof-g1.jpg',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 102400,
                ],
            ],
        ], $cHeaders);

        $submit1->assertStatus(201);
        $case1Id = $submit1->json()['data']['id'];

        $entitlement->refresh();
        $this->assertEquals(1, $entitlement->claimed_quantity);
        $this->assertEquals(1, $entitlement->remaining_quantity);
        $this->assertEquals('ACTIVE', $entitlement->status);

        // 2. Resolve Case 1
        $mHeaders = $this->merchantHeaders('4bee4c28-6799-4054-87a3-321e29811921', $merchantOrgId);
        $this->postJson("/api/v1/after-sales/business/cases/{$case1Id}/decision", [
            'action' => 'ACCEPT_INITIAL',
            'case_version' => 1,
            'reason' => 'Disetujui penggantian unit 1.',
        ], $mHeaders)->assertStatus(200);

        $this->postJson("/api/v1/after-sales/business/cases/{$case1Id}/resolution-action", [], $mHeaders)->assertStatus(200);

        $this->postJson("/api/v1/after-sales/cases/{$case1Id}/confirm-completion", [
            'notes' => 'Unit 1 pengganti selesai diterima.',
        ], $cHeaders)->assertStatus(200);

        // Entitlement must remain ACTIVE because 1 unit remains unconsumed!
        $entitlement->refresh();
        $this->assertEquals('ACTIVE', $entitlement->status);
        $this->assertEquals(1, $entitlement->remaining_quantity);

        // 3. Claim Unit 2 of 2
        $submit2 = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => $orderId,
            'case_type' => 'GOODS_WARRANTY',
            'initial_solution' => 'REPLACEMENT',
            'reason_code' => 'DEFECTIVE_COMPONENT',
            'description' => 'Kabel unit kedua juga mengalami isolasi leleh.',
            'entitlement_id' => $entitlement->id,
            'items' => [
                [
                    'order_item_id' => 'item-001',
                    'quantity' => 1,
                    'catalog_snapshot' => [
                        'name' => 'Kabel Power NYM Roll',
                        'price_idr' => 250000,
                    ],
                ],
            ],
            'evidence_data' => [
                [
                    'media_ref' => 'evidence/cases/proof-g1.jpg',
                    'content_type' => 'image/jpeg',
                    'size_bytes' => 102400,
                ],
            ],
        ], $cHeaders);

        $submit2->assertStatus(201);
        $case2Id = $submit2->json()['data']['id'];

        $entitlement->refresh();
        $this->assertEquals(2, $entitlement->claimed_quantity);
        $this->assertEquals(0, $entitlement->remaining_quantity);

        // Resolve Case 2
        $this->postJson("/api/v1/after-sales/business/cases/{$case2Id}/decision", [
            'action' => 'ACCEPT_INITIAL',
            'case_version' => 1,
            'reason' => 'Disetujui penggantian unit 2.',
        ], $mHeaders)->assertStatus(200);

        $this->postJson("/api/v1/after-sales/business/cases/{$case2Id}/resolution-action", [], $mHeaders)->assertStatus(200);

        $this->postJson("/api/v1/after-sales/cases/{$case2Id}/confirm-completion", [
            'notes' => 'Unit 2 selesai.',
        ], $cHeaders)->assertStatus(200);

        // Now with remaining_quantity = 0, status must transition to CONSUMED
        $entitlement->refresh();
        $this->assertEquals('CONSUMED', $entitlement->status);
    }

    /**
     * TEST H: Expiry Tanpa Klaim
     * Entitlement memiliki tanggal garansi yang sudah lewat (expires_at < now()).
     * Tanpa klaim aktif, entitlement otomatis tidak dapat diklaim lagi (isClaimEligible: false / 422).
     */
    public function test_scenario_h_expiry_without_claim_transitions_to_expired(): void
    {
        $orderId = 'ord-goods-h-' . uniqid();
        $customerId = '692f03fd-2362-485a-9a23-a672bbb4533f';
        $merchantOrgId = 'org-merchant-001';

        $entitlement = OrderWarrantyEntitlement::create([
            'source_kind' => 'GOODS',
            'order_id' => $orderId,
            'order_item_key' => 'item-001',
            'customer_id' => $customerId,
            'owner_org_type' => 'MERCHANT',
            'owner_org_id' => $merchantOrgId,
            'catalog_ref' => 'prod-stopkontak-broco',
            'snapshot_name' => 'Garansi 7 Hari',
            'snapshot_duration_days' => 7,
            'quantity' => 1,
            'claimed_quantity' => 0,
            'starts_at' => now()->subDays(10),
            'expires_at' => now()->subDays(3), // Expired 3 days ago!
            'status' => 'EXPIRED',
        ]);

        $cHeaders = $this->customerHeaders($customerId);

        // Attempting to claim an expired warranty must be rejected
        $submitRes = $this->postJson('/api/v1/after-sales/cases', [
            'source_order_kind' => 'GOODS',
            'source_order_id' => $orderId,
            'case_type' => 'GOODS_WARRANTY',
            'initial_solution' => 'REPLACEMENT',
            'reason_code' => 'MALFUNCTION',
            'description' => 'Mencoba klaim garansi yang sudah kedaluwarsa.',
            'entitlement_id' => $entitlement->id,
            'items' => [
                [
                    'order_item_id' => 'item-001',
                    'quantity' => 1,
                    'catalog_snapshot' => [
                        'name' => 'Stopkontak Broco 4 Lubang',
                        'price_idr' => 85000,
                    ],
                ],
            ],
        ], $cHeaders);

        $submitRes->assertStatus(422)
            ->assertJsonPath('success', false);
    }
}
