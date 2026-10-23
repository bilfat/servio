<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Finance\Funds\HeldFundService;
use App\Domain\Finance\Policies\FeePolicyService;
use App\Models\BankDestination;
use App\Models\FeePolicyVersion;
use App\Models\FinanceCheckout;
use App\Models\HeldOrderFund;
use App\Models\LedgerLine;
use App\Models\PaymentIntent;
use App\Models\SPayAccount;
use Tests\TestCase;

class Prompt03RegressionTest extends TestCase
{
    private function createCustomerAccount(string $customerId, int $amount = 0): SPayAccount
    {
        return SPayAccount::create([
            'owner_type' => 'CUSTOMER',
            'owner_external_id' => $customerId,
            'currency' => 'IDR',
            'available_idr' => $amount,
            'withdrawal_locked_idr' => 0,
            'account_status' => 'ACTIVE',
        ]);
    }

    private function createMerchantAccount(string $orgId, int $amount = 0): SPayAccount
    {
        return SPayAccount::create([
            'owner_type' => 'MERCHANT_ORGANIZATION',
            'owner_external_id' => $orgId,
            'currency' => 'IDR',
            'available_idr' => $amount,
            'withdrawal_locked_idr' => 0,
            'account_status' => 'ACTIVE',
        ]);
    }

    private function createBank(string $ownerType, string $ownerExternalId, string $status = 'VERIFIED', string $accNo = '1234567890'): BankDestination
    {
        $bank = new BankDestination();
        $bank->owner_type = $ownerType;
        $bank->owner_external_id = $ownerExternalId;
        $bank->bank_code = 'BCA';
        $bank->account_number = $accNo;
        $bank->account_holder_name = 'Pemilik Rekening Sah';
        $bank->verification_status = $status;
        $bank->verification_method = 'MOCK';
        $bank->created_by_user_id = $ownerExternalId;
        $bank->save();

        return $bank;
    }

    /**
     * FIX 01 — Refund Multi-Merchant Setelah Partial Refund
     * Customer membayar satu checkout dengan dua Merchant Order.
     * Merchant A dibatalkan -> refund berhasil.
     * Merchant B kemudian dibatalkan -> refund kedua juga berhasil.
     * Total refund tepat sama dengan total pembayaran eligible, tanpa refund ganda.
     */
    public function test_fix_01_multi_merchant_consecutive_refunds(): void
    {
        $this->createStandardActivePolicy();

        // 1. Setup multi-merchant checkout quote
        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-MULTI-REF-01',
                'customer_id' => 'CUST-MULTI-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-A-01',
                        'merchant_org_id' => 'ORG-MERCH-A',
                        'product_subtotal_idr' => 100000,
                        'shipping_customer_idr' => 10000,
                        'discount_idr' => 0,
                    ],
                    [
                        'merchant_order_id' => 'MORD-B-01',
                        'merchant_org_id' => 'ORG-MERCH-B',
                        'product_subtotal_idr' => 50000,
                        'shipping_customer_idr' => 5000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);

        $quoteRes->assertStatus(201);
        $quote = $quoteRes->json('data');

        // Total: A=(100k+10k+2000 app fee = 112k), B=(50k+5k+1000 app fee = 56k) -> Total 168k
        $totalPaid = $quote['customer_total_idr'];
        $this->assertSame(168000, $totalPaid);

        // 2. Create Payment Intent and pay
        $intentRes = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$quote['checkout_group_id']}/payment-intents", [
                'method' => 'QRIS',
                'quote_payload_hash' => $quote['payload_hash'],
            ]);

        $intentRes->assertStatus(201);
        $paymentId = $intentRes->json('data.payment_id');

        // Simulate payment success
        $paySim = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-MULTI-PAY-01',
                'reported_amount_idr' => 168000,
            ]);
        $paySim->assertStatus(200);

        $intent = PaymentIntent::findOrFail($paymentId);
        $this->assertSame('PAID', $intent->status);

        // 3. Cancel Merchant A order -> Refund A
        $refundARes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/refunds/order-cancellations', [
                'source_event_id' => 'EVT-CANCEL-MORD-A',
                'merchant_order_id' => 'MORD-A-01',
                'checkout_group_id' => 'CHK-MULTI-REF-01',
                'order_status' => 'CANCELLED',
                'cancelled_at' => now()->toIso8601String(),
                'decision_source' => '05A_ORDER_SERVICE',
                'reason_code' => 'MERCHANT_A_OUT_OF_STOCK',
            ]);

        $refundARes->assertStatus(200);
        $refundAData = $refundARes->json('data');
        $this->assertSame('SUCCEEDED', $refundAData['status']);
        $this->assertSame(112000, $refundAData['refund_amount_idr']);

        // Check payment intent status is now PARTIALLY_REFUNDED
        $intent->refresh();
        $this->assertSame('PARTIALLY_REFUNDED', $intent->status);

        // Check Customer S-Pay account received refund A
        $custAccount = SPayAccount::where('owner_type', 'CUSTOMER')
            ->where('owner_external_id', 'CUST-MULTI-01')
            ->first();
        $this->assertNotNull($custAccount);
        $this->assertSame(112000, (int) $custAccount->available_idr);

        // 4. Cancel Merchant B order -> Refund B on PARTIALLY_REFUNDED payment
        $refundBRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/refunds/order-cancellations', [
                'source_event_id' => 'EVT-CANCEL-MORD-B',
                'merchant_order_id' => 'MORD-B-01',
                'checkout_group_id' => 'CHK-MULTI-REF-01',
                'order_status' => 'CANCELLED',
                'cancelled_at' => now()->toIso8601String(),
                'decision_source' => '05A_ORDER_SERVICE',
                'reason_code' => 'BUYER_CHANGED_MIND',
            ]);

        $refundBRes->assertStatus(200);
        $refundBData = $refundBRes->json('data');
        $this->assertSame('SUCCEEDED', $refundBData['status']);
        $this->assertSame(56000, $refundBData['refund_amount_idr']);

        // Check payment intent status is now fully REFUNDED
        $intent->refresh();
        $this->assertSame('REFUNDED', $intent->status);

        // Checkout group is CANCELLED
        $checkout = FinanceCheckout::where('checkout_group_id', 'CHK-MULTI-REF-01')->first();
        $this->assertSame('CANCELLED', $checkout->status);

        // Total in customer S-Pay account is now exactly 112.000 + 56.000 = 168.000
        $custAccount->refresh();
        $this->assertSame(168000, (int) $custAccount->available_idr);

        // 5. Try duplicate refund for Merchant A -> Must be idempotent/already refunded
        $dupRefundA = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/refunds/order-cancellations', [
                'source_event_id' => 'EVT-CANCEL-MORD-A-DUP',
                'merchant_order_id' => 'MORD-A-01',
                'checkout_group_id' => 'CHK-MULTI-REF-01',
                'order_status' => 'CANCELLED',
                'cancelled_at' => now()->toIso8601String(),
                'decision_source' => '05A_ORDER_SERVICE',
                'reason_code' => 'ALREADY_CANCELLED_DUPLICATE_CHECK',
            ]);
        $dupRefundA->assertStatus(200);
        $this->assertSame('ALREADY_REFUNDED', $dupRefundA->json('data.status'));

        // Total customer S-Pay balance must not change
        $custAccount->refresh();
        $this->assertSame(168000, (int) $custAccount->available_idr);

        // 6. Check double-entry ledger balance
        $totalDebit = LedgerLine::where('entry_side', 'DEBIT')->sum('amount_idr');
        $totalCredit = LedgerLine::where('entry_side', 'CREDIT')->sum('amount_idr');
        $this->assertSame($totalDebit, $totalCredit, 'Ledger must be balanced in double-entry bookkeeping');
    }

    /**
     * FIX 02 — Perhitungan Diskon dan Hak Merchant
     * Multi-merchant checkout dengan diskon Rp10.000.
     * Pastikan nilai pembayaran, hak merchant sesuai penanggung diskon, alokasi konsisten, total debit = credit.
     */
    public function test_fix_02_discount_calculation_and_ledger_balance(): void
    {
        $this->createStandardActivePolicy();

        // Scenario A: Discount borne by MERCHANT
        $quoteResA = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-DISC-MERCH-01',
                'customer_id' => 'CUST-DISC-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-DISC-A1',
                        'merchant_org_id' => 'ORG-MERCH-A',
                        'product_subtotal_idr' => 100000,
                        'shipping_customer_idr' => 10000,
                        'discount_idr' => 10000,
                        'discount_bearer' => 'MERCHANT',
                    ],
                ],
            ]);

        $quoteResA->assertStatus(201);
        $quoteA = $quoteResA->json('data');
        // Customer total: (100k + 10k - 10k) + 3k app fee = 103,000
        $this->assertSame(103000, $quoteA['customer_total_idr']);
        $allocA = $quoteA['allocations'][0];
        $this->assertSame(103000, $allocA['customer_total_idr']);
        $this->assertSame(10000, $allocA['discount_allocated_idr']);
        $this->assertSame('MERCHANT', $allocA['discount_bearer']);

        // Pay and Complete to verify Merchant Held Fund
        $intentResA = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$quoteA['checkout_group_id']}/payment-intents", [
                'method' => 'QRIS',
                'quote_payload_hash' => $quoteA['payload_hash'],
            ]);
        $intentResA->assertStatus(201);
        $payIdA = $intentResA->json('data.payment_id');

        $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$payIdA}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-PAY-DISC-A1',
                'reported_amount_idr' => 103000,
            ]);

        // Complete order
        $completeResA = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/order-events', [
                'event_type' => 'ORDER_COMPLETED',
                'event_id' => 'EVT-COMP-DISC-A1',
                'merchant_order_id' => 'MORD-DISC-A1',
                'payload' => [
                    'completed_at' => now()->toIso8601String(),
                ],
            ]);
        $completeResA->assertStatus(200);

        // Check held fund for Merchant: Subtotal (100k) - Discount (10k) = 90k + Shipping (10k) - Comm (5k) = 95,000
        $heldA = HeldOrderFund::whereHas('allocation', function ($q) {
            $q->where('merchant_order_id', 'MORD-DISC-A1');
        })->first();
        $this->assertNotNull($heldA);
        $this->assertSame(95000, (int) $heldA->merchant_entitlement_idr);

        // Scenario B: Discount with unknown bearer without source -> must fail safely
        $quoteResUnknown = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-DISC-UNKNOWN-01',
                'customer_id' => 'CUST-DISC-02',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-DISC-U1',
                        'merchant_org_id' => 'ORG-MERCH-A',
                        'product_subtotal_idr' => 50000,
                        'shipping_customer_idr' => 5000,
                        'discount_idr' => 5000,
                        'discount_bearer' => 'UNKNOWN_BEARER',
                    ],
                ],
            ]);
        $quoteResUnknown->assertStatus(422);

        // Check double-entry balance
        $totalDebit = LedgerLine::where('entry_side', 'DEBIT')->sum('amount_idr');
        $totalCredit = LedgerLine::where('entry_side', 'CREDIT')->sum('amount_idr');
        $this->assertSame($totalDebit, $totalCredit, 'Double-entry ledger must remain balanced');
    }

    /**
     * FIX 03 — Rekening Pencairan Tidak Boleh Diganti Setelah Quote
     * Buat quote dengan Rekening A.
     * Saat submit, ganti destination menjadi Rekening B.
     * Expected: request ditolak dan saldo tidak berubah.
     */
    public function test_fix_03_withdrawal_bank_changed_after_quote_rejected(): void
    {
        // 1. Setup customer account with 100.000 S-Pay available
        $account = $this->createCustomerAccount('CUST-FIX03-01', 100000);

        // 2. Create two verified bank destinations for this customer
        $bankA = $this->createBank('CUSTOMER', 'CUST-FIX03-01', 'VERIFIED', '1111222233');
        $bankB = $this->createBank('CUSTOMER', 'CUST-FIX03-01', 'VERIFIED', '9999888877');

        // 3. Request withdrawal quote with Bank A
        $quoteRes = $this->withHeaders($this->customerHeaders('CUST-FIX03-01'))
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'CUSTOMER',
                'amount_idr' => 50000,
                'bank_destination_id' => $bankA->id,
            ]);

        $quoteRes->assertStatus(200);
        $quoteId = $quoteRes->json('data.quote_id');

        // 4. Attempt to submit withdrawal with Bank B using Bank A's quote
        $submitRes = $this->withHeaders($this->customerHeaders('CUST-FIX03-01'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bankB->id, // Mismatch!
                'bank_details_confirmed' => true,
                'step_up_reference' => 'STEP-UP-VALID-TOKEN',
            ]);

        // Must be rejected with 422
        $submitRes->assertStatus(422);

        // Balance must remain unchanged
        $account->refresh();
        $this->assertSame(100000, (int) $account->available_idr);
        $this->assertSame(0, (int) $account->withdrawal_locked_idr);
    }

    /**
     * FIX 04 — Dana S-Pay Tidak Boleh Terbentuk Tanpa Pembayaran Sah
     * Kirim event ORDER_COMPLETED untuk Order yang belum dibayar.
     * Expected: ditolak, tidak ada dana tertahan, tidak ada saldo merchant bertambah.
     */
    public function test_fix_04_order_completed_on_unpaid_order_rejected(): void
    {
        $this->createStandardActivePolicy();

        // 1. Create quote without paying
        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-UNPAID-01',
                'customer_id' => 'CUST-UNPAID-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-UNPAID-01',
                        'merchant_org_id' => 'ORG-MERCH-UNPAID',
                        'product_subtotal_idr' => 50000,
                        'shipping_customer_idr' => 5000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);
        $quoteRes->assertStatus(201);

        // 2. Dispatch ORDER_COMPLETED without paying
        $completeRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/order-events', [
                'event_type' => 'ORDER_COMPLETED',
                'event_id' => 'EVT-COMP-UNPAID-01',
                'merchant_order_id' => 'MORD-UNPAID-01',
                'payload' => [
                    'completed_at' => now()->toIso8601String(),
                ],
            ]);

        // Must be rejected with 422
        $completeRes->assertStatus(422);

        // Ensure no HeldOrderFund exists
        $held = HeldOrderFund::whereHas('allocation', function ($q) {
            $q->where('merchant_order_id', 'MORD-UNPAID-01');
        })->first();
        $this->assertNull($held);

        // Ensure no merchant account created or credited
        $merchantAccount = SPayAccount::where('owner_type', 'MERCHANT_ORGANIZATION')
            ->where('owner_external_id', 'ORG-MERCH-UNPAID')
            ->first();
        $this->assertNull($merchantAccount);
    }

    /**
     * FIX 05 — Implementasikan Penanganan ORDER_HOLD_CHANGED
     * Order COMPLETED -> Hold aktif -> waktu mencapai 120 jam -> dana tetap tertahan.
     * Hold dicabut -> pemeriksaan kelayakan berhasil -> dana dilepaskan tepat sekali.
     */
    public function test_fix_05_order_hold_changed_lifecycle(): void
    {
        $this->createStandardActivePolicy();

        // 1. Setup, pay, and complete order
        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-HOLD-01',
                'customer_id' => 'CUST-HOLD-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-HOLD-01',
                        'merchant_org_id' => 'ORG-MERCH-HOLD',
                        'product_subtotal_idr' => 100000,
                        'shipping_customer_idr' => 10000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);
        $quoteRes->assertStatus(201);
        $quote = $quoteRes->json('data');

        $intentRes = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$quote['checkout_group_id']}/payment-intents", [
                'method' => 'QRIS',
                'quote_payload_hash' => $quote['payload_hash'],
            ]);
        $intentRes->assertStatus(201);
        $payId = $intentRes->json('data.payment_id');

        $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$payId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-PAY-HOLD-01',
                'reported_amount_idr' => 113000,
            ]);

        // Complete order -> status HELD
        $completeRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/order-events', [
                'event_type' => 'ORDER_COMPLETED',
                'event_id' => 'EVT-COMP-HOLD-01',
                'merchant_order_id' => 'MORD-HOLD-01',
                'payload' => [
                    'completed_at' => now()->toIso8601String(),
                ],
            ]);
        $completeRes->assertStatus(200);

        $heldFund = HeldOrderFund::whereHas('allocation', function ($q) {
            $q->where('merchant_order_id', 'MORD-HOLD-01');
        })->firstOrFail();
        $this->assertSame('HELD', $heldFund->status);

        // 2. Put hold on order (e.g. Complaint/Dispute opened in 05A)
        $holdEventRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/order-events', [
                'event_type' => 'ORDER_HOLD_CHANGED',
                'event_id' => 'EVT-HOLD-ACTIVATE-01',
                'merchant_order_id' => 'MORD-HOLD-01',
                'payload' => [
                    'is_hold_active' => true,
                    'hold_reason_code' => 'COMPLAINT_INVESTIGATION',
                ],
            ]);
        $holdEventRes->assertStatus(200);

        $heldFund->refresh();
        $this->assertSame('HOLD_BLOCKED', $heldFund->status);

        // Fast forward 121 hours past normal hold duration
        $heldFund->update([
            'eligible_release_at' => now()->subHours(5),
            'completed_at' => now()->subHours(125),
        ]);

        // Attempt release: Should release 0 funds because it's HOLD_BLOCKED
        $heldFundService = app(HeldFundService::class);
        $releasedCount = $heldFundService->releaseMaturedHeldFunds();
        $this->assertSame(0, $releasedCount);

        $heldFund->refresh();
        $this->assertSame('HOLD_BLOCKED', $heldFund->status);

        // 3. Lift hold (Complaint resolved in 05A)
        $unholdEventRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/order-events', [
                'event_type' => 'ORDER_HOLD_CHANGED',
                'event_id' => 'EVT-HOLD-LIFT-01',
                'merchant_order_id' => 'MORD-HOLD-01',
                'payload' => [
                    'is_hold_active' => false,
                    'hold_reason_code' => 'COMPLAINT_RESOLVED',
                ],
            ]);
        $unholdEventRes->assertStatus(200);

        $heldFund->refresh();
        $this->assertSame('HELD', $heldFund->status);

        // 4. Now release should succeed
        $releasedCount2 = $heldFundService->releaseMaturedHeldFunds();
        $this->assertSame(1, $releasedCount2);

        $heldFund->refresh();
        $this->assertSame('RELEASED_TO_SPAY', $heldFund->status);

        // Merchant account has funds
        $merchantAccount = SPayAccount::where('owner_type', 'MERCHANT_ORGANIZATION')
            ->where('owner_external_id', 'ORG-MERCH-HOLD')
            ->first();
        $this->assertNotNull($merchantAccount);
        $this->assertSame((int) $heldFund->merchant_entitlement_idr, (int) $merchantAccount->available_idr);

        // Idempotent: another release does not double-release
        $releasedCount3 = $heldFundService->releaseMaturedHeldFunds();
        $this->assertSame(0, $releasedCount3);
    }

    /**
     * FIX 06 — State Transition Pembayaran
     * 1. Pembayaran lewat 6 jam -> tersimpan EXPIRED permanen.
     * 2. Callback sukses setelah EXPIRED -> ditolak (410).
     * 3. Status FAILED -> percobaan menjadi PAID ditolak (409).
     * 4. Duplicate callback pada PAID -> idempotent, tidak ada duplikasi jurnal.
     */
    public function test_fix_06_payment_state_transitions_and_failed_to_paid_rejected(): void
    {
        $this->createStandardActivePolicy();

        // 1. Create quote & intent
        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-EXPIRE-01',
                'customer_id' => 'CUST-EXP-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-EXP-01',
                        'merchant_org_id' => 'ORG-MERCH-EXP',
                        'product_subtotal_idr' => 50000,
                        'shipping_customer_idr' => 5000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);
        $quoteRes->assertStatus(201);
        $quote = $quoteRes->json('data');

        $intentRes = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$quote['checkout_group_id']}/payment-intents", [
                'method' => 'QRIS',
                'quote_payload_hash' => $quote['payload_hash'],
            ]);
        $intentRes->assertStatus(201);
        $paymentId = $intentRes->json('data.payment_id');

        // Fast forward payment to expired (past 6 hours)
        $intent = PaymentIntent::findOrFail($paymentId);
        $intent->update(['expires_at' => now()->subHour()]);

        // Attempt verification on expired intent via show -> marks status as EXPIRED
        $verifyRes = $this->withHeaders($this->customerHeaders('CUST-EXP-01'))
            ->getJson("/api/v1/finance/payments/{$paymentId}");
        $verifyRes->assertStatus(200)
            ->assertJsonPath('data.status', 'EXPIRED');

        // Verify that EXPIRED was permanently saved in DB
        $intent->refresh();
        $this->assertSame('EXPIRED', $intent->status);

        // Late callback simulation on EXPIRED -> Rejected with 410 Gone
        $lateCallback = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-LATE-SIM-01',
                'reported_amount_idr' => 58000,
            ]);
        $lateCallback->assertStatus(410);

        // 2. FAILED status cannot transition to PAID
        $quoteFailRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-FAIL-01',
                'customer_id' => 'CUST-FAIL-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-FAIL-01',
                        'merchant_org_id' => 'ORG-MERCH-FAIL',
                        'product_subtotal_idr' => 50000,
                        'shipping_customer_idr' => 5000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);
        $quoteFail = $quoteFailRes->json('data');

        $intent2Res = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$quoteFail['checkout_group_id']}/payment-intents", [
                'method' => 'MOCK_VA_BCA',
                'quote_payload_hash' => $quoteFail['payload_hash'],
            ]);
        $intent2Res->assertStatus(201);
        $intent2Id = $intent2Res->json('data.payment_id');

        // Mark FAILED
        $failRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$intent2Id}/simulate", [
                'outcome' => 'FAILED',
                'provider_event_id' => 'EVT-FAIL-SIM-01',
                'reported_amount_idr' => 58000,
            ]);
        $failRes->assertStatus(200);

        $intent2 = PaymentIntent::findOrFail($intent2Id);
        $this->assertSame('FAILED', $intent2->status);

        // Attempt FAILED -> PAID transition: must be rejected with 409
        $failToPaid = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$intent2Id}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-FAIL-TO-PAID-01',
                'reported_amount_idr' => 58000,
            ]);
        $failToPaid->assertStatus(409);

        // 3. Duplicate callback on PAID -> Idempotent, no double journals
        $quoteIdempRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-IDEMP-01',
                'customer_id' => 'CUST-IDEMP-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-IDEMP-01',
                        'merchant_org_id' => 'ORG-MERCH-IDEMP',
                        'product_subtotal_idr' => 50000,
                        'shipping_customer_idr' => 5000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);
        $quoteIdemp = $quoteIdempRes->json('data');

        $intent3Res = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$quoteIdemp['checkout_group_id']}/payment-intents", [
                'method' => 'MOCK_VA_MANDIRI',
                'quote_payload_hash' => $quoteIdemp['payload_hash'],
            ]);
        $intent3Res->assertStatus(201);
        $intent3Id = $intent3Res->json('data.payment_id');

        // First success callback
        $payOk1 = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$intent3Id}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-IDEMP-01',
                'reported_amount_idr' => 58000,
            ]);
        $payOk1->assertStatus(200);

        $journalCountBefore = LedgerLine::count();

        // Duplicate callback
        $payOk2 = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$intent3Id}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-IDEMP-01',
                'reported_amount_idr' => 58000,
            ]);
        $payOk2->assertStatus(200);

        $journalCountAfter = LedgerLine::count();
        $this->assertSame($journalCountBefore, $journalCountAfter, 'Duplicate callback must not create duplicate ledger entries');
    }

    /**
     * FIX 07 — Hapus Fee Default yang Tidak Sah
     * 1. Tidak ada fee policy aktif -> checkout final ditolak (422).
     * 2. Ada fee policy aktif -> perhitungan berjalan.
     * 3. CEO membuat revisi DRAFT -> nominal checkout lama tidak berubah.
     */
    public function test_fix_07_missing_ceo_policy_rejects_checkout(): void
    {
        // 1. Without any published active policy, checkout quote must fail
        FeePolicyVersion::query()->update(['status' => 'HISTORICAL']);

        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-NO-POLICY-01',
                'customer_id' => 'CUST-NO-POL-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-NP-01',
                        'merchant_org_id' => 'ORG-MERCH-NP',
                        'product_subtotal_idr' => 50000,
                        'shipping_customer_idr' => 5000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);

        $quoteRes->assertStatus(422);

        // 2. Publish an active policy
        $this->createStandardActivePolicy();

        // Now checkout quote must succeed
        $quoteRes2 = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-WITH-POLICY-01',
                'customer_id' => 'CUST-WITH-POL-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-WP-01',
                        'merchant_org_id' => 'ORG-MERCH-WP',
                        'product_subtotal_idr' => 50000,
                        'shipping_customer_idr' => 5000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);
        $quoteRes2->assertStatus(201);
        $quote2 = $quoteRes2->json('data');
        $this->assertSame(58000, $quote2['customer_total_idr']);

        // 3. CEO creates a DRAFT policy with different fees -> must not affect existing snapshot
        $policyService = app(FeePolicyService::class);
        $policyService->createPolicy(
            data: [
                'name' => 'Draft Policy With 10% Fee',
                'slug' => 'draft-policy-10pct',
                'targets' => [
                    [
                        'policy_code' => 'CUSTOMER_PRODUCT_APP_FEE',
                        'scope' => 'PRODUCT',
                        'payer_type' => 'CUSTOMER',
                        'fee_type' => 'FIXED',
                        'fixed_amount_idr' => 10000,
                        'charge_scope' => 'CHECKOUT',
                        'calculation_base' => 'CHECKOUT_ELIGIBLE_SUBTOTAL',
                    ],
                ],
            ],
            actorUserId: 'CEO-USER-01'
        );

        // Previous checkout snapshot remains untouched
        $checkout = FinanceCheckout::where('checkout_group_id', 'CHK-WITH-POLICY-01')->first();
        $this->assertSame(58000, (int) $checkout->customer_payable_total_idr);
    }

    /**
     * FIX 08 — Keamanan Pencairan dan Credential
     * 1. Merchant A mencoba mencairkan saldo Merchant B -> 403 Forbidden.
     * 2. Finance Ops mencoba withdrawal milik Merchant tanpa otorisasi organisasi -> 403 Forbidden.
     * 3. Step-up authentication kosong atau invalid -> 422 Unprocessable Entity.
     * 4. Rekening belum VERIFIED -> 422 Unprocessable Entity.
     * 5. Masking nomor rekening pada response data.
     */
    public function test_fix_08_security_and_withdrawal_authorization(): void
    {
        // 1. Setup Merchant Org B with S-Pay balance
        $merchAccountB = $this->createMerchantAccount('ORG-MERCHANT-B', 500000);
        $bankB = $this->createBank('MERCHANT_ORGANIZATION', 'ORG-MERCHANT-B', 'VERIFIED', '1234567890');

        // 2. Merchant A attempts to quote withdrawal for Merchant B -> 403 Forbidden
        $badQuote = $this->withHeaders($this->merchantHeaders('ORG-MERCHANT-A', 'USER-MERCH-A'))
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'MERCHANT_ORGANIZATION',
                'owner_id' => 'ORG-MERCHANT-B',
                'amount_idr' => 50000,
                'bank_destination_id' => $bankB->id,
            ]);
        $badQuote->assertStatus(403);

        // 3. Finance Ops attempts to submit withdrawal quote for Merchant B without org membership -> 403 Forbidden
        $opsQuote = $this->withHeaders($this->financeOpsHeaders())
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'MERCHANT_ORGANIZATION',
                'owner_id' => 'ORG-MERCHANT-B',
                'amount_idr' => 50000,
                'bank_destination_id' => $bankB->id,
            ]);
        $opsQuote->assertStatus(403);

        // 4. Valid quote by Merchant B
        $validQuote = $this->withHeaders($this->merchantHeaders('ORG-MERCHANT-B', 'USER-MERCH-B'))
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'MERCHANT_ORGANIZATION',
                'owner_id' => 'ORG-MERCHANT-B',
                'amount_idr' => 100000,
                'bank_destination_id' => $bankB->id,
            ]);
        $validQuote->assertStatus(200);
        $quoteId = $validQuote->json('data.quote_id');

        // 5. Merchant B submits without step_up_reference -> Rejected (422)
        $noStepUp = $this->withHeaders($this->merchantHeaders('ORG-MERCHANT-B', 'USER-MERCH-B'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bankB->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => '', // Empty!
            ]);
        $noStepUp->assertStatus(422);

        // 6. Bank account not verified -> Rejected (422)
        $unverifiedBank = $this->createBank('MERCHANT_ORGANIZATION', 'ORG-MERCHANT-B', 'PENDING', '5555666677');

        $unverifiedQuote = $this->withHeaders($this->merchantHeaders('ORG-MERCHANT-B', 'USER-MERCH-B'))
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'MERCHANT_ORGANIZATION',
                'owner_id' => 'ORG-MERCHANT-B',
                'amount_idr' => 100000,
                'bank_destination_id' => $unverifiedBank->id,
            ]);
        $unverifiedQuote->assertStatus(422);

        // 7. Successful withdrawal with valid step-up reference
        $stepUpProof = $this->generateValidStepUpProof('USER-MERCH-B', 'ORG-MERCHANT-B', $merchAccountB->id, 100000, $bankB->id);
        $successSubmit = $this->withHeaders($this->merchantHeaders('ORG-MERCHANT-B', 'USER-MERCH-B'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bankB->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $stepUpProof,
            ]);
        $successSubmit->assertStatus(201);

        // 8. Verify bank account number masking in list (no raw account number returned)
        $listBanks = $this->withHeaders($this->merchantHeaders('ORG-MERCHANT-B', 'USER-MERCH-B'))
            ->getJson('/api/v1/finance/bank-destinations?organization_id=ORG-MERCHANT-B');
        $listBanks->assertStatus(200);
        $banksData = $listBanks->json('data');
        foreach ($banksData as $bankItem) {
            $this->assertArrayNotHasKey('account_number', $bankItem);
            $this->assertArrayHasKey('account_last4', $bankItem);
            $this->assertArrayHasKey('account_holder_name_masked', $bankItem);
        }
    }
}
