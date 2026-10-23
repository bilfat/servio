<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Finance\Policies\FeePolicyService;
use App\Models\BankDestination;
use App\Models\FeePolicyGroup;
use App\Models\HeldOrderFund;
use App\Models\PaymentIntent;
use App\Models\SPayAccount;
use Carbon\Carbon;
use Tests\TestCase;

class BusinessRulesFinanceV3Test extends TestCase
{
    /**
     * Section 4.A: Fee dan Checkout
     * - Customer buys 3 items from 2 Merchants in 1 checkout
     * - Customer app fee charged ONCE per checkout (not 3x, not 2x)
     * - Merchant commission calculated per merchant
     * - Exact sum invariant (Hamilton-Hare)
     * - Fee changes by CEO later do not alter old snapshot
     * - Draft / Scheduled policies not used
     */
    public function test_fee_charged_once_per_checkout_and_hamilton_hare_rounding_balanced(): void
    {
        $this->createStandardActivePolicy();

        // 3 items from 2 merchants:
        // Merchant A: Subtotal 100.000, Shipping 10.000
        // Merchant B: Subtotal 200.000, Shipping 15.000
        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-MULTI-001',
                'customer_id' => 'CUST-BIZ-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-A-1',
                        'merchant_org_id' => 'ORG-MERCHANT-A',
                        'product_subtotal_idr' => 100000,
                        'shipping_customer_idr' => 10000,
                        'discount_idr' => 0,
                    ],
                    [
                        'merchant_order_id' => 'MORD-B-1',
                        'merchant_org_id' => 'ORG-MERCHANT-B',
                        'product_subtotal_idr' => 200000,
                        'shipping_customer_idr' => 15000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);

        $quoteRes->assertStatus(201);
        $quote = $quoteRes->json('data');

        // Customer app fee must be 3.000 ONCE for the whole checkout (not 6.000 or 9.000)
        $this->assertSame(3000, $quote['customer_application_fee_idr']);

        // Total Customer Payable:
        // Subtotal (100k + 200k = 300k) + Shipping (10k + 15k = 25k) + App fee (3k) = 328.000
        $expectedTotal = 100000 + 10000 + 200000 + 15000 + 3000;
        $this->assertSame($expectedTotal, $quote['customer_total_idr']);

        // Check Hamilton-Hare allocated sum equals total customer app fee
        $allocatedAppFeeSum = 0;
        foreach ($quote['allocations'] as $alloc) {
            $allocatedAppFeeSum += $alloc['app_fee_allocated_idr'];
        }
        $this->assertSame(3000, $allocatedAppFeeSum);

        // Sum of allocations customer total must equal customer payable total
        $sumAllocations = 0;
        foreach ($quote['allocations'] as $alloc) {
            $sumAllocations += $alloc['customer_total_idr'];
        }
        $this->assertSame($expectedTotal, $sumAllocations);

        // CEO updates policy to 5.000 in a new revision (DRAFT)
        $policyService = app(FeePolicyService::class);
        $group = FeePolicyGroup::first();
        $newRevision = $policyService->createRevision(
            groupId: $group->id,
            data: [
                'change_reason' => 'CEO increased fee to 5k',
                'targets' => [
                    [
                        'policy_code' => 'CUSTOMER_PRODUCT_APP_FEE',
                        'scope' => 'PRODUCT',
                        'payer_type' => 'CUSTOMER',
                        'fee_type' => 'FIXED',
                        'fixed_amount_idr' => 5000,
                        'charge_scope' => 'CHECKOUT',
                        'calculation_base' => 'CHECKOUT_ELIGIBLE_SUBTOTAL',
                    ],
                    [
                        'policy_code' => 'MERCHANT_PRODUCT_COMMISSION',
                        'scope' => 'PRODUCT',
                        'payer_type' => 'MERCHANT',
                        'fee_type' => 'PERCENTAGE',
                        'percentage_rate' => '5.000000',
                        'charge_scope' => 'MERCHANT_ORDER',
                        'calculation_base' => 'MERCHANT_PRODUCT_SUBTOTAL',
                    ],
                ],
            ],
            actorUserId: 'CEO-USER-01'
        );

        // Before publish, new draft must be DRAFT
        $this->assertSame('DRAFT', $newRevision['status']);

        // Previous checkout snapshot remains untouched (still 3.000)
        $checkoutCheck = $this->withHeaders($this->internalHeaders())
            ->getJson("/internal/v1/finance/checkouts/{$quote['checkout_group_id']}");

        $checkoutCheck->assertStatus(200)
            ->assertJsonPath('data.customer_app_fee_idr', 3000)
            ->assertJsonPath('data.customer_payable_total_idr', $expectedTotal);
    }

    /**
     * Section 4.B: Payment Gateway Mock & Expiration
     * - QRIS/VA dummy 6 hours validity
     * - Payment after expiry rejected (410)
     * - Amount mismatch rejected (422)
     * - PENDING -> FAILED
     * - Duplicate callback is idempotent
     */
    public function test_payment_intent_expiry_and_simulation_states(): void
    {
        $this->createStandardActivePolicy();

        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-EXP-001',
                'customer_id' => 'CUST-EXP-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-EXP-1',
                        'merchant_org_id' => 'ORG-MERCHANT-A',
                        'product_subtotal_idr' => 100000,
                        'shipping_customer_idr' => 10000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);

        $quote = $quoteRes->json('data');

        // Create Payment Intent (QRIS)
        $intentRes = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$quote['checkout_group_id']}/payment-intents", [
                'method' => 'QRIS',
                'quote_payload_hash' => $quote['payload_hash'],
            ]);

        $intentRes->assertStatus(201);
        $intentData = $intentRes->json('data');
        $paymentId = $intentData['payment_id'];

        // Verify expiry is 6 hours from initiation
        $intentModel = PaymentIntent::find($paymentId);
        $this->assertNotNull($intentModel->expires_at);
        $diffHours = (int) round($intentModel->created_at->diffInHours($intentModel->expires_at));
        $this->assertSame(6, $diffHours);

        // 1. Amount mismatch rejected with 422
        $mismatchRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'MOCK-EVT-MISMATCH-1',
                'reported_amount_idr' => 999999,
            ]);

        $mismatchRes->assertStatus(422);

        // 2. Simulate Payment after 6 hours expired -> rejected with 410
        Carbon::setTestNow(now()->addHours(7));

        $expiredRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'MOCK-EVT-LATE-1',
                'reported_amount_idr' => $intentModel->amount_idr,
            ]);

        $expiredRes->assertStatus(410);

        // Reset test time
        Carbon::setTestNow();

        // 3. Test PENDING -> FAILED on a fresh intent
        $quoteRes2 = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-FAIL-001',
                'customer_id' => 'CUST-FAIL-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-FAIL-1',
                        'merchant_org_id' => 'ORG-MERCHANT-A',
                        'product_subtotal_idr' => 50000,
                        'shipping_customer_idr' => 5000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);

        $quote2 = $quoteRes2->json('data');
        $intentRes2 = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$quote2['checkout_group_id']}/payment-intents", [
                'method' => 'MOCK_VA_BCA',
                'quote_payload_hash' => $quote2['payload_hash'],
            ]);

        $intentRes2->assertStatus(201);
        $paymentId2 = $intentRes2->json('data.payment_id');

        $failSimRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId2}/simulate", [
                'outcome' => 'FAILED',
                'provider_event_id' => 'MOCK-EVT-FAIL-1',
                'reported_amount_idr' => 58000,
            ]);

        $failSimRes->assertStatus(200)
            ->assertJsonPath('data.status', 'FAILED');

        // Re-sending same event ID is idempotent (200, no duplicate error)
        $idempotentRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId2}/simulate", [
                'outcome' => 'FAILED',
                'provider_event_id' => 'MOCK-EVT-FAIL-1',
                'reported_amount_idr' => 58000,
            ]);

        $idempotentRes->assertStatus(200);
    }

    /**
     * Section 4.C: Dana Pesanan dan S-Pay Merchant (120 Jam)
     * - Order COMPLETED at T
     * - At T + 119h: Still HELD
     * - At T + 120h: Eligible and released by Artisan command
     * - Re-running release does not duplicate
     */
    public function test_held_fund_120_hour_release_and_artisan_scheduler(): void
    {
        $this->createStandardActivePolicy();

        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-HOLD-001',
                'customer_id' => 'CUST-HOLD-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-HOLD-1',
                        'merchant_org_id' => 'ORG-MERCHANT-HOLD-1',
                        'product_subtotal_idr' => 200000,
                        'shipping_customer_idr' => 20000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);

        $quote = $quoteRes->json('data');

        $intentRes = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$quote['checkout_group_id']}/payment-intents", [
                'method' => 'QRIS',
                'quote_payload_hash' => $quote['payload_hash'],
            ]);

        $paymentId = $intentRes->json('data.payment_id');

        $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'MOCK-EVT-HOLD-1',
                'reported_amount_idr' => 223000,
            ]);

        // Order Service sends ORDER_COMPLETED event at T
        $completionTime = now();
        $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/order-events', [
                'event_id' => 'EVT-COMPLETED-001',
                'event_type' => 'ORDER_COMPLETED',
                'merchant_order_id' => 'MORD-HOLD-1',
                'payload' => [
                    'completed_at' => $completionTime->toIso8601String(),
                    'order_version' => 1,
                ],
            ])
            ->assertStatus(200);

        $heldFund = HeldOrderFund::first();
        $this->assertSame('HELD', $heldFund->status);

        // Advance time to T + 119 hours: Artisan release command must NOT release
        Carbon::setTestNow($completionTime->copy()->addHours(119));
        $this->artisan('finance:release-matured-funds')
            ->expectsOutputToContain('0 dana pesanan telah dipindahkan')
            ->assertExitCode(0);

        $heldFund->refresh();
        $this->assertSame('HELD', $heldFund->status);

        // Advance time to T + 120 hours: Artisan release command releases fund!
        Carbon::setTestNow($completionTime->copy()->addHours(120)->addMinute());
        $this->artisan('finance:release-matured-funds')
            ->expectsOutputToContain('1 dana pesanan telah dipindahkan')
            ->assertExitCode(0);

        $heldFund->refresh();
        $this->assertSame('RELEASED_TO_SPAY', $heldFund->status);

        // Verify Merchant S-Pay balance
        $merchantAccount = SPayAccount::where('owner_type', 'MERCHANT_ORGANIZATION')
            ->where('owner_external_id', 'ORG-MERCHANT-HOLD-1')
            ->first();

        $this->assertNotNull($merchantAccount);
        $this->assertSame($heldFund->merchant_entitlement_idr, $merchantAccount->available_idr);

        // Running command again is idempotent (releases 0)
        $this->artisan('finance:release-matured-funds')
            ->expectsOutputToContain('0 dana pesanan telah dipindahkan')
            ->assertExitCode(0);

        Carbon::setTestNow();
    }

    /**
     * Section 4.E: Withdrawal dan Payout
     * - Minimum pencairan Rp20.000 (Rp19.999 ditolak, Rp20.000 diterima)
     * - Biaya transfer Rp2.500 dipotong dari pencairan
     * - Saldo dikunci saat PENDING
     * - Payout gagal mengembalikan saldo terkunci
     */
    public function test_withdrawal_minimum_and_locked_balance_lifecycle(): void
    {
        $account = SPayAccount::create([
            'owner_type' => 'CUSTOMER',
            'owner_external_id' => 'CUST-WD-TEST-01',
            'currency' => 'IDR',
            'available_idr' => 50000,
            'withdrawal_locked_idr' => 0,
            'account_status' => 'ACTIVE',
        ]);

        $bank = BankDestination::create([
            'owner_type' => 'CUSTOMER',
            'owner_external_id' => 'CUST-WD-TEST-01',
            'bank_code' => 'BCA',
            'account_number' => '1234567890',
            'account_holder_name' => 'Budi Santoso',
            'verification_status' => 'VERIFIED',
            'is_default' => true,
            'created_by_user_id' => 'CUST-WD-TEST-01',
        ]);

        // 1. Nominal Rp19.999 ditolak dengan 422
        $quoteBelow = $this->withHeaders($this->customerHeaders('CUST-WD-TEST-01'))
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'CUSTOMER',
                'amount_idr' => 19999,
                'bank_destination_id' => $bank->id,
            ]);

        $quoteBelow->assertStatus(422);

        // 2. Nominal Rp20.000 diterima
        $quoteValid = $this->withHeaders($this->customerHeaders('CUST-WD-TEST-01'))
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'CUSTOMER',
                'amount_idr' => 20000,
                'bank_destination_id' => $bank->id,
            ]);

        $quoteValid->assertStatus(200)
            ->assertJsonPath('data.amount_idr', 20000)
            ->assertJsonPath('data.transfer_fee_idr', 2500)
            ->assertJsonPath('data.net_to_bank_idr', 17500);

        $quoteId = $quoteValid->json('data.quote_id');

        // 3. Eksekusi penarikan dana dengan konfirmasi rekening bank
        $stepUpProof = $this->generateValidStepUpProof('CUST-WD-TEST-01', null, $account->id, 20000, $bank->id);
        $wdRes = $this->withHeaders($this->customerHeaders('CUST-WD-TEST-01'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bank->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $stepUpProof,
            ]);

        $wdRes->assertStatus(201)
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.locked_amount_idr', 20000);

        $withdrawalId = $wdRes->json('data.withdrawal_id');

        // Check account balances: Available 30.000, Locked 20.000
        $account->refresh();
        $this->assertSame(30000, $account->available_idr);
        $this->assertSame(20000, $account->withdrawal_locked_idr);

        // 4. Simulasi Payout Gagal -> Memulihkan saldo terkunci kembali ke available
        $failPayout = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/withdrawals/{$withdrawalId}/simulate", [
                'outcome' => 'FAILED',
                'provider_event_id' => 'MOCK-WD-FAIL-EVT-01',
            ]);

        $failPayout->assertStatus(200)
            ->assertJsonPath('data.status', 'FAILED');

        $account->refresh();
        $this->assertSame(50000, $account->available_idr);
        $this->assertSame(0, $account->withdrawal_locked_idr);
    }
}
