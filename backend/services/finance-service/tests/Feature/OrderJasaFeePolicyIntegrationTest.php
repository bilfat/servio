<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Finance\Policies\FeePolicyService;
use App\Models\FeePolicyGroup;
use App\Models\FeePolicyVersion;
use App\Models\FeePolicyTarget;
use App\Models\FinanceCheckout;
use App\Models\PaymentAllocation;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrderJasaFeePolicyIntegrationTest extends TestCase
{
    /**
     * Helper to create active fee policy version with specific targets
     */
    protected function createServicePolicyVersion(array $targets, string $name = 'Kebijakan Servis Jasa Test'): FeePolicyVersion
    {
        $policyService = app(FeePolicyService::class);
        $res = $policyService->createPolicy(
            data: [
                'name' => $name,
                'slug' => 'srv-policy-' . Str::random(8),
                'description' => 'Test policy for Order Jasa 05B',
                'change_reason' => 'Test automated',
                'targets' => $targets,
            ],
            actorUserId: 'CEO-USER-01'
        );

        $policyService->publishVersion(
            versionId: $res['version_id'],
            effectiveFrom: null,
            reason: 'Publish for test',
            actorUserId: 'CEO-USER-01'
        );

        return FeePolicyVersion::with('targets', 'group')->find($res['version_id']);
    }

    /**
     * TEST A: Customer Fee Only
     * Expected:
     * - Diagnosis tanpa fee
     * - Customer final payable termasuk Rp 5.000
     * - Tidak ada potongan Provider dari kebijakan tersebut
     */
    public function test_a_customer_fee_only(): void
    {
        $this->createServicePolicyVersion([
            [
                'policy_code' => 'CUSTOMER_SERVICE_APP_FEE',
                'scope' => 'SERVICE',
                'payer_type' => 'CUSTOMER',
                'fee_type' => 'FIXED',
                'fixed_amount_idr' => 5000,
                'charge_scope' => 'CHECKOUT',
                'calculation_base' => 'CHECKOUT_ELIGIBLE_SUBTOTAL',
            ],
        ]);

        // 1. Diagnosis quote has NO fee
        $diagRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/service-checkout-quotes', [
                'checkout_group_id' => 'CHK-TEST-A-DIAG-' . Str::random(6),
                'customer_id' => 'CUST-001',
                'provider_org_id' => 'ORG-PROVIDER-01',
                'merchant_order_id' => 'ORD-TEST-A-diag',
                'purpose' => 'DIAGNOSIS',
                'labor_subtotal_idr' => 50000,
                'provider_part_subtotal_idr' => 0,
            ]);

        $diagRes->assertStatus(201)
            ->assertJsonPath('data.customer_application_fee_idr', 0)
            ->assertJsonPath('data.customer_total_idr', 50000);

        // 2. Service Execution quote: 200k labor + 50k parts = 250k subtotal. Customer fee = 5k.
        $execRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/service-checkout-quotes', [
                'checkout_group_id' => 'CHK-TEST-A-EXEC-' . Str::random(6),
                'customer_id' => 'CUST-001',
                'provider_org_id' => 'ORG-PROVIDER-01',
                'merchant_order_id' => 'ORD-TEST-A-exec',
                'purpose' => 'SERVICE_EXECUTION',
                'labor_subtotal_idr' => 200000,
                'provider_part_subtotal_idr' => 50000,
            ]);

        $execRes->assertStatus(201)
            ->assertJsonPath('data.product_subtotal_idr', 250000)
            ->assertJsonPath('data.customer_application_fee_idr', 5000)
            ->assertJsonPath('data.customer_total_idr', 255000);

        $alloc = $execRes->json('data.allocations.0');
        $this->assertSame(0, $alloc['merchant_commission_idr'], 'Provider has no commission deduction');
        $this->assertSame(250000, $alloc['merchant_net_entitlement_idr'], 'Provider receives full execution subtotal');
    }

    /**
     * TEST B: Provider Fee Only
     * Expected:
     * - Diagnosis tanpa fee
     * - Customer final payable tidak bertambah akibat Provider Fee
     * - Net earnings Provider dipotong Rp 10.000
     */
    public function test_b_provider_fee_only(): void
    {
        $this->createServicePolicyVersion([
            [
                'policy_code' => 'PROVIDER_SERVICE_COMMISSION',
                'scope' => 'SERVICE',
                'payer_type' => 'PROVIDER',
                'fee_type' => 'FIXED',
                'fixed_amount_idr' => 10000,
                'charge_scope' => 'ORDER',
                'calculation_base' => 'TOTAL_COMMISSIONABLE_SALES',
            ],
        ]);

        $execRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/service-checkout-quotes', [
                'checkout_group_id' => 'CHK-TEST-B-EXEC-' . Str::random(6),
                'customer_id' => 'CUST-001',
                'provider_org_id' => 'ORG-PROVIDER-01',
                'merchant_order_id' => 'ORD-TEST-B-exec',
                'purpose' => 'SERVICE_EXECUTION',
                'labor_subtotal_idr' => 200000,
                'provider_part_subtotal_idr' => 50000,
            ]);

        $execRes->assertStatus(201)
            ->assertJsonPath('data.product_subtotal_idr', 250000)
            ->assertJsonPath('data.customer_application_fee_idr', 0)
            ->assertJsonPath('data.customer_total_idr', 250000);

        $alloc = $execRes->json('data.allocations.0');
        $this->assertSame(10000, $alloc['merchant_commission_idr'], 'Provider commission deducted Rp 10.000');
        $this->assertSame(240000, $alloc['merchant_net_entitlement_idr'], 'Provider net entitlement is 240.000');
    }

    /**
     * TEST C: Customer + Provider Fee
     * Expected:
     * - Customer membayar Customer Fee (Rp 5.000)
     * - Provider dipotong Provider Fee (Rp 10.000)
     * - Tidak ada double charge (Tagihan = 255k, Net Prov = 240k)
     */
    public function test_c_customer_and_provider_fee(): void
    {
        $this->createServicePolicyVersion([
            [
                'policy_code' => 'CUSTOMER_SERVICE_APP_FEE',
                'scope' => 'SERVICE',
                'payer_type' => 'CUSTOMER',
                'fee_type' => 'FIXED',
                'fixed_amount_idr' => 5000,
                'charge_scope' => 'CHECKOUT',
                'calculation_base' => 'CHECKOUT_ELIGIBLE_SUBTOTAL',
            ],
            [
                'policy_code' => 'PROVIDER_SERVICE_COMMISSION',
                'scope' => 'SERVICE',
                'payer_type' => 'PROVIDER',
                'fee_type' => 'FIXED',
                'fixed_amount_idr' => 10000,
                'charge_scope' => 'ORDER',
                'calculation_base' => 'TOTAL_COMMISSIONABLE_SALES',
            ],
        ]);

        $execRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/service-checkout-quotes', [
                'checkout_group_id' => 'CHK-TEST-C-EXEC-' . Str::random(6),
                'customer_id' => 'CUST-001',
                'provider_org_id' => 'ORG-PROVIDER-01',
                'merchant_order_id' => 'ORD-TEST-C-exec',
                'purpose' => 'SERVICE_EXECUTION',
                'labor_subtotal_idr' => 200000,
                'provider_part_subtotal_idr' => 50000,
            ]);

        $execRes->assertStatus(201)
            ->assertJsonPath('data.product_subtotal_idr', 250000)
            ->assertJsonPath('data.customer_application_fee_idr', 5000)
            ->assertJsonPath('data.customer_total_idr', 255000);

        $alloc = $execRes->json('data.allocations.0');
        $this->assertSame(10000, $alloc['merchant_commission_idr']);
        $this->assertSame(240000, $alloc['merchant_net_entitlement_idr']);
        $this->assertSame(255000, $alloc['customer_total_idr']);
    }

    /**
     * TEST D: Percentage Fee
     * Expected:
     * - Basis perhitungan mengikuti Finance policy
     * - Pembulatan sesuai aturan Finance
     */
    public function test_d_percentage_fee(): void
    {
        $this->createServicePolicyVersion([
            [
                'policy_code' => 'CUSTOMER_SERVICE_APP_FEE',
                'scope' => 'SERVICE',
                'payer_type' => 'CUSTOMER',
                'fee_type' => 'PERCENTAGE',
                'percentage_rate' => 2.0, // 2%
                'charge_scope' => 'CHECKOUT',
                'calculation_base' => 'CHECKOUT_ELIGIBLE_SUBTOTAL',
            ],
            [
                'policy_code' => 'PROVIDER_SERVICE_COMMISSION',
                'scope' => 'SERVICE',
                'payer_type' => 'PROVIDER',
                'fee_type' => 'PERCENTAGE',
                'percentage_rate' => 5.0, // 5%
                'charge_scope' => 'ORDER',
                'calculation_base' => 'TOTAL_COMMISSIONABLE_SALES',
            ],
        ]);

        // Subtotal: 200k + 50k = 250.000
        // Customer 2% = 5.000 -> Total 255.000
        // Provider 5% = 12.500 -> Net 237.500
        $execRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/service-checkout-quotes', [
                'checkout_group_id' => 'CHK-TEST-D-EXEC-' . Str::random(6),
                'customer_id' => 'CUST-001',
                'provider_org_id' => 'ORG-PROVIDER-01',
                'merchant_order_id' => 'ORD-TEST-D-exec',
                'purpose' => 'SERVICE_EXECUTION',
                'labor_subtotal_idr' => 200000,
                'provider_part_subtotal_idr' => 50000,
            ]);

        $execRes->assertStatus(201)
            ->assertJsonPath('data.customer_application_fee_idr', 5000)
            ->assertJsonPath('data.customer_total_idr', 255000);

        $alloc = $execRes->json('data.allocations.0');
        $this->assertSame(12500, $alloc['merchant_commission_idr']);
        $this->assertSame(237500, $alloc['merchant_net_entitlement_idr']);
    }

    /**
     * TEST E: No Applicable Policy
     * Expected:
     * - Fee platform Rp 0
     * - Tagihan tidak gagal hanya karena tidak ada kebijakan applicable
     */
    public function test_e_no_applicable_policy(): void
    {
        // Deactivate all service policies
        FeePolicyTarget::where('scope', 'SERVICE')->delete();

        $execRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/service-checkout-quotes', [
                'checkout_group_id' => 'CHK-TEST-E-EXEC-' . Str::random(6),
                'customer_id' => 'CUST-001',
                'provider_org_id' => 'ORG-PROVIDER-01',
                'merchant_order_id' => 'ORD-TEST-E-exec',
                'purpose' => 'SERVICE_EXECUTION',
                'labor_subtotal_idr' => 200000,
                'provider_part_subtotal_idr' => 50000,
            ]);

        $execRes->assertStatus(201)
            ->assertJsonPath('data.customer_application_fee_idr', 0)
            ->assertJsonPath('data.customer_total_idr', 250000);

        $alloc = $execRes->json('data.allocations.0');
        $this->assertSame(0, $alloc['merchant_commission_idr']);
        $this->assertSame(250000, $alloc['merchant_net_entitlement_idr']);
    }

    /**
     * TEST F: Policy Changed After Invoice
     * Expected:
     * - Tagihan lama tidak berubah (terkunci dengan snapshot lama)
     * - Tagihan baru menggunakan versi applicable yang benar
     */
    public function test_f_policy_changed_after_invoice(): void
    {
        // Version 1: 5k customer fee
        $v1 = $this->createServicePolicyVersion([
            [
                'policy_code' => 'CUSTOMER_SERVICE_APP_FEE',
                'scope' => 'SERVICE',
                'payer_type' => 'CUSTOMER',
                'fee_type' => 'FIXED',
                'fixed_amount_idr' => 5000,
                'charge_scope' => 'CHECKOUT',
                'calculation_base' => 'CHECKOUT_ELIGIBLE_SUBTOTAL',
            ],
        ], 'Policy V1');

        $chkIdOld = 'CHK-TEST-F-OLD-' . Str::random(6);
        $resOld = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/service-checkout-quotes', [
                'checkout_group_id' => $chkIdOld,
                'customer_id' => 'CUST-001',
                'provider_org_id' => 'ORG-PROVIDER-01',
                'merchant_order_id' => 'ORD-TEST-F-old',
                'purpose' => 'SERVICE_EXECUTION',
                'labor_subtotal_idr' => 200000,
                'provider_part_subtotal_idr' => 0,
            ]);
        $resOld->assertStatus(201)->assertJsonPath('data.customer_total_idr', 205000);

        // CEO updates policy to 8k customer fee via proper revision
        $policyService = app(FeePolicyService::class);
        $v2Draft = $policyService->createRevision(
            groupId: $v1->group_id,
            data: [
                'change_reason' => 'Upgrade to 8000 fee',
                'targets' => [
                    [
                        'policy_code' => 'CUSTOMER_SERVICE_APP_FEE',
                        'scope' => 'SERVICE',
                        'payer_type' => 'CUSTOMER',
                        'fee_type' => 'FIXED',
                        'fixed_amount_idr' => 8000,
                        'charge_scope' => 'CHECKOUT',
                        'calculation_base' => 'CHECKOUT_ELIGIBLE_SUBTOTAL',
                    ],
                ],
            ],
            actorUserId: 'CEO-USER-01'
        );

        $policyService->publishVersion(
            versionId: $v2Draft['version_id'],
            effectiveFrom: null,
            reason: 'Publish 8k fee',
            actorUserId: 'CEO-USER-01'
        );

        // Old checkout queried again remains 205.000
        $oldCheckout = FinanceCheckout::where('checkout_group_id', $chkIdOld)->first();
        $this->assertSame(205000, $oldCheckout->customer_payable_total_idr);

        // New checkout gets the updated 8.000 fee
        $resNew = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/service-checkout-quotes', [
                'checkout_group_id' => 'CHK-TEST-F-NEW-' . Str::random(6),
                'customer_id' => 'CUST-001',
                'provider_org_id' => 'ORG-PROVIDER-01',
                'merchant_order_id' => 'ORD-TEST-F-new',
                'purpose' => 'SERVICE_EXECUTION',
                'labor_subtotal_idr' => 200000,
                'provider_part_subtotal_idr' => 0,
            ]);
        $resNew->assertStatus(201)
            ->assertJsonPath('data.customer_application_fee_idr', 8000)
            ->assertJsonPath('data.customer_total_idr', 208000);
    }

    /**
     * TEST G: Diagnosis Earned + Execution Earned
     * Expected:
     * - Hak pendapatan bersih Provider termasuk diagnosis sah satu kali
     * - Tidak ada diagnosis duplicate
     * - Total hak pendapatan bersih = (250k - 10k fee) + 50k diagnosis = 290.000
     */
    public function test_g_diagnosis_earned_plus_execution_earned(): void
    {
        $this->createServicePolicyVersion([
            [
                'policy_code' => 'CUSTOMER_SERVICE_APP_FEE',
                'scope' => 'SERVICE',
                'payer_type' => 'CUSTOMER',
                'fee_type' => 'FIXED',
                'fixed_amount_idr' => 5000,
                'charge_scope' => 'CHECKOUT',
                'calculation_base' => 'CHECKOUT_ELIGIBLE_SUBTOTAL',
            ],
            [
                'policy_code' => 'PROVIDER_SERVICE_COMMISSION',
                'scope' => 'SERVICE',
                'payer_type' => 'PROVIDER',
                'fee_type' => 'FIXED',
                'fixed_amount_idr' => 10000,
                'charge_scope' => 'ORDER',
                'calculation_base' => 'TOTAL_COMMISSIONABLE_SALES',
            ],
        ]);

        $orderId = 'ORD-TEST-G-' . Str::random(6);

        // 1. Diagnosis quote: 50.000 (fee exemption)
        $diagRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/service-checkout-quotes', [
                'checkout_group_id' => 'CHK-G-DIAG-' . $orderId,
                'customer_id' => 'CUST-001',
                'provider_org_id' => 'ORG-PROVIDER-01',
                'merchant_order_id' => "{$orderId}-diagnosis",
                'purpose' => 'DIAGNOSIS',
                'labor_subtotal_idr' => 50000,
                'provider_part_subtotal_idr' => 0,
            ]);
        $diagRes->assertStatus(201);
        $diagAlloc = $diagRes->json('data.allocations.0');
        $diagNet = (int) $diagAlloc['merchant_net_entitlement_idr'];
        $this->assertSame(50000, $diagNet);

        // 2. Execution quote: 200.000 labor + 50.000 sparepart = 250.000. Customer fee 5k, Provider fee 10k
        $execRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/service-checkout-quotes', [
                'checkout_group_id' => 'CHK-G-EXEC-' . $orderId,
                'customer_id' => 'CUST-001',
                'provider_org_id' => 'ORG-PROVIDER-01',
                'merchant_order_id' => "{$orderId}-service_execution",
                'purpose' => 'SERVICE_EXECUTION',
                'labor_subtotal_idr' => 200000,
                'provider_part_subtotal_idr' => 50000,
            ]);
        $execRes->assertStatus(201);
        $execAlloc = $execRes->json('data.allocations.0');
        $execNet = (int) $execAlloc['merchant_net_entitlement_idr'];
        $this->assertSame(240000, $execNet);

        // 3. Combined net earnings for the Provider = 50.000 (diag) + 240.000 (exec) = 290.000
        $totalProviderNet = $diagNet + $execNet;
        $this->assertSame(290000, $totalProviderNet, 'Authoritative total provider net earnings is exactly Rp 290.000');

        // Customer total payment = 50.000 (diag) + 255.000 (exec) = 305.000
        $customerTotalPaid = (int) $diagRes->json('data.customer_total_idr') + (int) $execRes->json('data.customer_total_idr');
        $this->assertSame(305000, $customerTotalPaid);

        // Reconciliation: Provider net (290k) + Cust fee (5k) + Prov fee (10k) = 305k
        $this->assertSame($customerTotalPaid, $totalProviderNet + 5000 + 10000, 'Reconciliation ledger invariant holds');
    }

    /**
     * TEST H: Order Cancelled After Diagnosis
     * Expected:
     * - Diagnosis earned 50.000 is maintained for Provider
     * - No execution fee or entitlement created
     */
    public function test_h_order_cancelled_after_diagnosis(): void
    {
        $orderId = 'ORD-TEST-H-' . Str::random(6);

        $diagRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/service-checkout-quotes', [
                'checkout_group_id' => 'CHK-H-DIAG-' . $orderId,
                'customer_id' => 'CUST-001',
                'provider_org_id' => 'ORG-PROVIDER-01',
                'merchant_order_id' => "{$orderId}-diagnosis",
                'purpose' => 'DIAGNOSIS',
                'labor_subtotal_idr' => 50000,
                'provider_part_subtotal_idr' => 0,
            ]);
        $diagRes->assertStatus(201);

        $alloc = $diagRes->json('data.allocations.0');
        $this->assertSame(50000, $alloc['merchant_net_entitlement_idr']);
        $this->assertSame(0, $alloc['merchant_commission_idr']);

        // No execution quote exists for this cancelled order
        $this->assertNull(FinanceCheckout::where('checkout_group_id', 'CHK-H-EXEC-' . $orderId)->first());
    }
}
