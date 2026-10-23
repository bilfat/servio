<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Finance\Payments\PaymentVerificationService;
use App\Domain\Finance\Withdrawals\WithdrawalService;
use App\Models\BankDestination;
use App\Models\FinanceAuditLog;
use App\Models\FinanceCheckout;
use App\Models\HeldOrderFund;
use App\Models\LedgerJournal;
use App\Models\LedgerLine;
use App\Models\OutboxEvent;
use App\Models\PaymentAllocation;
use App\Models\PaymentEvent;
use App\Models\PaymentIntent;
use App\Models\SPayAccount;
use App\Models\WithdrawalRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class Prompt05ClosingVerificationTest extends TestCase
{
    protected array $cleanupPaymentIds = [];
    protected array $cleanupCheckoutGroupIds = [];

    protected function setUp(): void
    {
        parent::setUp();
        config(['finance.step_up_secret' => 'servio_step_up_secret_2026']);
        config(['finance.mock_payment_enabled' => true]);
        config(['finance.mock_payout_enabled' => true]);
    }

    protected function tearDown(): void
    {
        // Cleanup multi-process records created with DB::commit()
        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
            if (!empty($this->cleanupPaymentIds)) {
                HeldOrderFund::whereIn('payment_allocation_id', PaymentAllocation::whereIn('finance_checkout_id', FinanceCheckout::whereIn('checkout_group_id', $this->cleanupCheckoutGroupIds)->pluck('id'))->pluck('id'))->delete();
                LedgerLine::whereIn('ledger_journal_id', LedgerJournal::whereIn('payment_intent_id', $this->cleanupPaymentIds)->pluck('id'))->delete();
                LedgerJournal::whereIn('payment_intent_id', $this->cleanupPaymentIds)->delete();
                PaymentEvent::whereIn('payment_intent_id', $this->cleanupPaymentIds)->delete();
                OutboxEvent::whereIn('aggregate_id', $this->cleanupPaymentIds)->delete();
                PaymentIntent::whereIn('id', $this->cleanupPaymentIds)->delete();
                PaymentAllocation::whereIn('finance_checkout_id', FinanceCheckout::whereIn('checkout_group_id', $this->cleanupCheckoutGroupIds)->pluck('id'))->delete();
                FinanceCheckout::whereIn('checkout_group_id', $this->cleanupCheckoutGroupIds)->delete();
            }
            HeldOrderFund::whereIn('payment_allocation_id', PaymentAllocation::where('merchant_order_id', 'like', 'MORD-%')->pluck('id'))->delete();
            PaymentEvent::where('provider', 'MOCK')->where('provider_event_id', 'like', 'EVT-%')->delete();
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        } catch (\Throwable) {
            // Ignore teardown errors
        }

        parent::tearDown();
    }

    protected function getWorkerEnv(): array
    {
        return [
            'APP_ENV' => 'testing',
            'DB_DATABASE' => 'servio_finance_test_db',
            'DB_CONNECTION' => 'mysql',
            'DB_HOST' => '127.0.0.1',
            'DB_PORT' => '3306',
            'DB_USERNAME' => 'root',
            'DB_PASSWORD' => '',
            'FINANCE_GATEWAY_KEY' => 'servio_local_gateway_key_2026',
            'FINANCE_INTERNAL_SERVICE_KEY' => 'servio_local_internal_service_key_2026',
            'FINANCE_MOCK_PAYMENT_ENABLED' => 'true',
            'FINANCE_MOCK_PAYOUT_ENABLED' => 'true',
            'FINANCE_STEP_UP_SECRET' => 'servio_step_up_secret_2026',
            'PATH' => getenv('PATH') ?: '',
            'SYSTEMROOT' => getenv('SYSTEMROOT') ?: '',
        ];
    }

    // =========================================================================
    // FIX 15 — Payment Expiry Persistence
    // =========================================================================

    public function test_fix_15_payment_expired_persists_permanently_in_database(): void
    {
        $this->createStandardActivePolicy();

        $chkId = 'CHK-EXP-' . Str::random(8);
        $mordId = 'MORD-EXP-' . Str::random(8);

        // 1. Setup payment intent
        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => $chkId,
                'customer_id' => 'CUST-EXP-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => $mordId,
                        'merchant_org_id' => 'ORG-EXP-01',
                        'product_subtotal_idr' => 100000,
                        'shipping_customer_idr' => 10000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);
        $quoteRes->assertStatus(201);
        $quoteHash = $quoteRes->json('data.payload_hash');

        $intentRes = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$chkId}/payment-intents", [
                'method' => 'QRIS',
                'quote_payload_hash' => $quoteHash,
            ]);
        $intentRes->assertStatus(201);
        $paymentId = $intentRes->json('data.payment_id');
        $amountIdr = (int) $intentRes->json('data.amount_idr');

        // Fast-forward payment intent past 6-hour expiration
        $payment = PaymentIntent::find($paymentId);
        $payment->expires_at = now()->subMinutes(15);
        $payment->save();

        // 2. Trigger verification via simulate endpoint -> Must return HTTP 410 Gone
        $expireCallbackRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-LATE-01-' . Str::random(6),
                'reported_amount_idr' => $amountIdr,
            ]);

        $expireCallbackRes->assertStatus(410);

        // 3. Verify that EXPIRED status was COMMITTED permanently to MySQL database
        // Re-read directly from fresh query
        $reloaded = PaymentIntent::where('id', $paymentId)->first();
        $this->assertNotNull($reloaded);
        $this->assertSame('EXPIRED', $reloaded->status);
        $this->assertFalse((bool) $reloaded->is_active);

        // Checkout status must also be EXPIRED
        $checkout = FinanceCheckout::where('checkout_group_id', $chkId)->first();
        $this->assertSame('EXPIRED', $checkout->status);

        // Outbox event finance.payment.expired.v1 must be recorded
        $outbox = OutboxEvent::where('aggregate_id', $paymentId)
            ->where('event_type', 'finance.payment.expired.v1')
            ->first();
        $this->assertNotNull($outbox);

        // 4. Any subsequent callbacks on EXPIRED must be rejected with 410
        $subsequentRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-LATE-02-' . Str::random(6),
                'reported_amount_idr' => $amountIdr,
            ]);
        $subsequentRes->assertStatus(410);

        // 5. Zero ledger entries and zero held funds created (no financial crediting)
        $journalsCount = LedgerJournal::where('payment_intent_id', $paymentId)->count();
        $this->assertSame(0, $journalsCount);

        $heldFundsCount = HeldOrderFund::whereHas('paymentAllocation', fn($q) => $q->where('merchant_order_id', $mordId))->count();
        $this->assertSame(0, $heldFundsCount);
    }

    public function test_fix_15_paid_payment_never_transitions_to_expired(): void
    {
        $this->createStandardActivePolicy();

        $chkId = 'CHK-PAID-NOEXP-' . Str::random(8);
        $mordId = 'MORD-PAID-' . Str::random(8);

        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => $chkId,
                'customer_id' => 'CUST-PAID-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => $mordId,
                        'merchant_org_id' => 'ORG-PAID-01',
                        'product_subtotal_idr' => 80000,
                        'shipping_customer_idr' => 10000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);
        $quoteRes->assertStatus(201);

        $intentRes = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$chkId}/payment-intents", [
                'method' => 'QRIS',
                'quote_payload_hash' => $quoteRes->json('data.payload_hash'),
            ]);
        $intentRes->assertStatus(201);
        $paymentId = $intentRes->json('data.payment_id');
        $amountIdr = (int) $intentRes->json('data.amount_idr');

        // Pay it first
        $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-PAID-FIRST-' . Str::random(6),
                'reported_amount_idr' => $amountIdr,
            ])
            ->assertStatus(200);

        // Fast-forward expires_at into past
        $payment = PaymentIntent::find($paymentId);
        $payment->expires_at = now()->subHours(2);
        $payment->save();

        // Late callback or show query must NOT change status to EXPIRED
        $lateRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-PAID-LATE-' . Str::random(6),
                'reported_amount_idr' => $amountIdr,
            ]);
        $lateRes->assertStatus(200);

        $payment->refresh();
        $this->assertSame('PAID', $payment->status);
    }

    // =========================================================================
    // FIX 16 — Step-Up Verification & Identity Contract Fail-Closed
    // =========================================================================

    public function test_fix_16_step_up_identity_verification_matrix(): void
    {
        $account = SPayAccount::create([
            'owner_type' => 'CUSTOMER',
            'owner_external_id' => 'USER-CUST-16',
            'currency' => 'IDR',
            'available_idr' => 200000,
            'withdrawal_locked_idr' => 0,
            'account_status' => 'ACTIVE',
        ]);

        $bank = BankDestination::create([
            'owner_type' => 'CUSTOMER',
            'owner_external_id' => 'USER-CUST-16',
            'bank_code' => 'BCA',
            'account_number' => '1234567890',
            'account_holder_name' => 'Cust 16',
            'verification_status' => 'VERIFIED',
            'verification_method' => 'MOCK',
            'created_by_user_id' => 'USER-CUST-16',
        ]);

        $quoteRes = $this->withHeaders($this->customerHeaders('USER-CUST-16'))
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'CUSTOMER',
                'owner_id' => 'USER-CUST-16',
                'amount_idr' => 50000,
                'bank_destination_id' => $bank->id,
            ]);
        $quoteRes->assertStatus(200);
        $quoteId = $quoteRes->json('data.quote_id');

        // 1. Token HMAC without additional authentication evidence (missing auth_method / challenge_id) -> 422
        $rawPayload = [
            'user_id' => 'USER-CUST-16',
            'spay_account_id' => $account->id,
            'amount_idr' => 50000,
            'bank_destination_id' => $bank->id,
            'purpose' => 'WITHDRAWAL',
            'expires_at' => now()->addMinutes(10)->timestamp,
        ];
        $b64 = rtrim(strtr(base64_encode(json_encode($rawPayload)), '+/', '-_'), '=');
        $sig = hash_hmac('sha256', $b64, config('finance.step_up_secret'));
        $tokenNoAuth = 'stp_' . $b64 . '.' . $sig;

        $resNoAuth = $this->withHeaders($this->customerHeaders('USER-CUST-16'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bank->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $tokenNoAuth,
            ]);
        $resNoAuth->assertStatus(422);
        $this->assertStringContainsString('tidak menyertakan bukti autentikasi tambahan', (string) $resNoAuth->json('error.message'));

        // 2. Client-forged token with invalid signature -> 422
        $forgedToken = $tokenNoAuth . 'bad_sig';
        $resForged = $this->withHeaders($this->customerHeaders('USER-CUST-16'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bank->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $forgedToken,
            ]);
        $resForged->assertStatus(422);

        // 3. Identity service timeout simulation -> 503 fail-closed
        config(['finance.identity_step_up_timeout_simulate' => true]);
        $validProof = $this->generateValidStepUpProof('USER-CUST-16', null, $account->id, 50000, $bank->id);

        $resTimeout = $this->withHeaders($this->customerHeaders('USER-CUST-16'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bank->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $validProof,
            ]);
        $resTimeout->assertStatus(503);
        $account->refresh();
        $this->assertSame(200000, (int) $account->available_idr); // ZERO balance locked
        config(['finance.identity_step_up_timeout_simulate' => false]);

        // 4. Missing Identity step-up secret -> 503 PENDING_IDENTITY_DEPENDENCY
        config(['finance.step_up_secret' => null]);
        $resNoSecret = $this->withHeaders($this->customerHeaders('USER-CUST-16'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bank->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $validProof,
            ]);
        $resNoSecret->assertStatus(503);
        $this->assertStringContainsString('PENDING_IDENTITY_DEPENDENCY', (string) $resNoSecret->json('error.message'));
        config(['finance.step_up_secret' => 'servio_step_up_secret_2026']);

        // 5. Valid step-up proof with complete Identity additional authentication evidence -> 201 SUCCEEDS
        $resSuccess = $this->withHeaders($this->customerHeaders('USER-CUST-16'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bank->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $validProof,
            ]);
        $resSuccess->assertStatus(201);
        $account->refresh();
        $this->assertSame(150000, (int) $account->available_idr);
        $this->assertSame(50000, (int) $account->withdrawal_locked_idr);
    }

    // =========================================================================
    // FIX 17 — Real Parallel Concurrency Tests (MySQL Multi-Process)
    // =========================================================================

    public function test_fix_17_real_concurrent_paid_callbacks_scenario_a(): void
    {
        $this->createStandardActivePolicy();

        $chkId = 'CHK-CONC-A-' . Str::random(8);
        $mordId = 'MORD-CONC-A-' . Str::random(8);

        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => $chkId,
                'customer_id' => 'CUST-CONC-A',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => $mordId,
                        'merchant_org_id' => 'ORG-CONC-A',
                        'product_subtotal_idr' => 100000,
                        'shipping_customer_idr' => 10000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);
        $quoteRes->assertStatus(201);

        $intentRes = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$chkId}/payment-intents", [
                'method' => 'QRIS',
                'quote_payload_hash' => $quoteRes->json('data.payload_hash'),
            ]);
        $intentRes->assertStatus(201);
        $paymentId = $intentRes->json('data.payment_id');
        $amountIdr = (int) $intentRes->json('data.amount_idr');

        $this->cleanupCheckoutGroupIds[] = $chkId;
        $this->cleanupPaymentIds[] = $paymentId;

        // Commit transaction so external child processes can query and lock the row on MySQL
        DB::commit();

        $barrierFile = storage_path('framework/testing_barrier_scenario_a_' . Str::random(8) . '.lock');
        if (file_exists($barrierFile)) {
            @unlink($barrierFile);
        }

        $evt1 = 'EVT-CONC-A1-' . Str::random(6);
        $evt2 = 'EVT-CONC-A2-' . Str::random(6);

        // Spawn 2 completely separate OS processes running artisan worker command
        $proc1 = new Process([
            PHP_BINARY,
            'artisan',
            'finance:concurrent-callback-worker',
            $paymentId,
            'SUCCESS',
            $evt1,
            (string) $amountIdr,
            '--barrier=' . $barrierFile,
            '--env=testing',
        ], base_path(), $this->getWorkerEnv());

        $proc2 = new Process([
            PHP_BINARY,
            'artisan',
            'finance:concurrent-callback-worker',
            $paymentId,
            'SUCCESS',
            $evt2,
            (string) $amountIdr,
            '--barrier=' . $barrierFile,
            '--env=testing',
        ], base_path(), $this->getWorkerEnv());

        $proc1->start();
        $proc2->start();

        // Allow both processes to boot and reach barrier
        usleep(300000);

        // RELEASE BARRIER simultaneously! Both processes attempt row lock simultaneously
        touch($barrierFile);

        $proc1->wait();
        $proc2->wait();

        @unlink($barrierFile);

        $out1 = json_decode(trim($proc1->getOutput()), true);
        $out2 = json_decode(trim($proc2->getOutput()), true);

        $this->assertTrue($proc1->isSuccessful(), 'Process 1 failed: ' . $proc1->getErrorOutput());
        $this->assertTrue($proc2->isSuccessful(), 'Process 2 failed: ' . $proc2->getErrorOutput());
        $this->assertTrue($out1['success'], 'Worker 1 error: ' . json_encode($out1));
        $this->assertTrue($out2['success'], 'Worker 2 error: ' . json_encode($out2));

        // Verify MySQL database state
        $payment = PaymentIntent::find($paymentId);
        $this->assertSame('PAID', $payment->status);

        // Exactly 1 allocation created for order
        $allocationsCount = PaymentAllocation::where('merchant_order_id', $mordId)->count();
        $this->assertSame(1, $allocationsCount);

        // Exactly 1 held fund created
        $heldFundsCount = HeldOrderFund::whereHas('paymentAllocation', fn($q) => $q->where('merchant_order_id', $mordId))->count();
        $this->assertSame(1, $heldFundsCount);

        // Exactly 1 ledger journal created (no duplicate journal entries)
        $journalsCount = LedgerJournal::where('payment_intent_id', $paymentId)->count();
        $this->assertSame(1, $journalsCount);

        // Ledger must be perfectly balanced: sum(DEBIT) === sum(CREDIT)
        $journal = LedgerJournal::where('payment_intent_id', $paymentId)->first();
        $debitTotal = LedgerLine::where('ledger_journal_id', $journal->id)->where('entry_side', 'DEBIT')->sum('amount_idr');
        $creditTotal = LedgerLine::where('ledger_journal_id', $journal->id)->where('entry_side', 'CREDIT')->sum('amount_idr');
        $this->assertSame($debitTotal, $creditTotal);
    }

    public function test_fix_17_real_concurrent_paid_vs_failed_scenario_b(): void
    {
        $this->createStandardActivePolicy();

        $chkId = 'CHK-CONC-B-' . Str::random(8);
        $mordId = 'MORD-CONC-B-' . Str::random(8);

        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => $chkId,
                'customer_id' => 'CUST-CONC-B',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => $mordId,
                        'merchant_org_id' => 'ORG-CONC-B',
                        'product_subtotal_idr' => 100000,
                        'shipping_customer_idr' => 10000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);
        $quoteRes->assertStatus(201);

        $intentRes = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$chkId}/payment-intents", [
                'method' => 'QRIS',
                'quote_payload_hash' => $quoteRes->json('data.payload_hash'),
            ]);
        $intentRes->assertStatus(201);
        $paymentId = $intentRes->json('data.payment_id');
        $amountIdr = (int) $intentRes->json('data.amount_idr');

        $this->cleanupCheckoutGroupIds[] = $chkId;
        $this->cleanupPaymentIds[] = $paymentId;

        // Commit transaction so external child processes can query and lock the row on MySQL
        DB::commit();

        $barrierFile = storage_path('framework/testing_barrier_scenario_b_' . Str::random(8) . '.lock');
        if (file_exists($barrierFile)) {
            @unlink($barrierFile);
        }

        $evtSuccess = 'EVT-CONC-B-SUCCESS-' . Str::random(6);
        $evtFailed = 'EVT-CONC-B-FAILED-' . Str::random(6);

        // Proc 1: SUCCESS callback
        $proc1 = new Process([
            PHP_BINARY,
            'artisan',
            'finance:concurrent-callback-worker',
            $paymentId,
            'SUCCESS',
            $evtSuccess,
            (string) $amountIdr,
            '--barrier=' . $barrierFile,
            '--env=testing',
        ], base_path(), $this->getWorkerEnv());

        // Proc 2: FAILED callback
        $proc2 = new Process([
            PHP_BINARY,
            'artisan',
            'finance:concurrent-callback-worker',
            $paymentId,
            'FAILED',
            $evtFailed,
            (string) $amountIdr,
            '--barrier=' . $barrierFile,
            '--env=testing',
        ], base_path(), $this->getWorkerEnv());

        $proc1->start();
        $proc2->start();

        usleep(300000);
        touch($barrierFile);

        $proc1->wait();
        $proc2->wait();
        @unlink($barrierFile);

        $payment = PaymentIntent::find($paymentId);
        $this->assertNotNull($payment);
        $this->assertContains($payment->status, ['PAID', 'FAILED']);

        // Check consistency: if PAID, exactly 1 journal; if FAILED, 0 journals
        $journalsCount = LedgerJournal::where('payment_intent_id', $paymentId)->count();
        if ($payment->status === 'PAID') {
            $this->assertSame(1, $journalsCount);
        } else {
            $this->assertSame(0, $journalsCount);
        }
    }

    public function test_fix_17_real_concurrent_paid_vs_expired_scenario_c(): void
    {
        $this->createStandardActivePolicy();

        $chkId = 'CHK-CONC-C-' . Str::random(8);
        $mordId = 'MORD-CONC-C-' . Str::random(8);

        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => $chkId,
                'customer_id' => 'CUST-CONC-C',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => $mordId,
                        'merchant_org_id' => 'ORG-CONC-C',
                        'product_subtotal_idr' => 75000,
                        'shipping_customer_idr' => 5000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);
        $quoteRes->assertStatus(201);

        $intentRes = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$chkId}/payment-intents", [
                'method' => 'QRIS',
                'quote_payload_hash' => $quoteRes->json('data.payload_hash'),
            ]);
        $intentRes->assertStatus(201);
        $paymentId = $intentRes->json('data.payment_id');
        $amountIdr = (int) $intentRes->json('data.amount_idr');

        $this->cleanupCheckoutGroupIds[] = $chkId;
        $this->cleanupPaymentIds[] = $paymentId;

        // Fast-forward expires_at to simulate expiration boundary
        $payment = PaymentIntent::find($paymentId);
        $payment->expires_at = now()->subSeconds(2);
        $payment->save();

        // Commit transaction so external child processes can query and lock the row on MySQL
        DB::commit();

        $barrierFile = storage_path('framework/testing_barrier_scenario_c_' . Str::random(8) . '.lock');
        if (file_exists($barrierFile)) {
            @unlink($barrierFile);
        }

        $evtPaid = 'EVT-CONC-C-PAID-' . Str::random(6);
        $evtLate = 'EVT-CONC-C-LATE-' . Str::random(6);

        // Proc 1: Tries SUCCESS callback
        $proc1 = new Process([
            PHP_BINARY,
            'artisan',
            'finance:concurrent-callback-worker',
            $paymentId,
            'SUCCESS',
            $evtPaid,
            (string) $amountIdr,
            '--barrier=' . $barrierFile,
            '--env=testing',
        ], base_path(), $this->getWorkerEnv());

        // Proc 2: Concurrently tries callback
        $proc2 = new Process([
            PHP_BINARY,
            'artisan',
            'finance:concurrent-callback-worker',
            $paymentId,
            'SUCCESS',
            $evtLate,
            (string) $amountIdr,
            '--barrier=' . $barrierFile,
            '--env=testing',
        ], base_path(), $this->getWorkerEnv());

        $proc1->start();
        $proc2->start();

        usleep(300000);
        touch($barrierFile);

        $proc1->wait();
        $proc2->wait();
        @unlink($barrierFile);

        $payment = PaymentIntent::find($paymentId);
        $this->assertNotNull($payment);

        // Since expires_at was already in the past, status MUST be EXPIRED
        $this->assertSame('EXPIRED', $payment->status);

        // Zero double funds, zero ledger journals
        $this->assertSame(0, LedgerJournal::where('payment_intent_id', $paymentId)->count());
        $this->assertSame(0, HeldOrderFund::whereHas('paymentAllocation', fn($q) => $q->where('merchant_order_id', $mordId))->count());
    }

    public function test_fix_17_real_concurrent_duplicate_provider_event_scenario_d(): void
    {
        $this->createStandardActivePolicy();

        $chkId = 'CHK-CONC-D-' . Str::random(8);
        $mordId = 'MORD-CONC-D-' . Str::random(8);

        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => $chkId,
                'customer_id' => 'CUST-CONC-D',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => $mordId,
                        'merchant_org_id' => 'ORG-CONC-D',
                        'product_subtotal_idr' => 50000,
                        'shipping_customer_idr' => 5000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);
        $quoteRes->assertStatus(201);

        $intentRes = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$chkId}/payment-intents", [
                'method' => 'QRIS',
                'quote_payload_hash' => $quoteRes->json('data.payload_hash'),
            ]);
        $intentRes->assertStatus(201);
        $paymentId = $intentRes->json('data.payment_id');
        $amountIdr = (int) $intentRes->json('data.amount_idr');

        $this->cleanupCheckoutGroupIds[] = $chkId;
        $this->cleanupPaymentIds[] = $paymentId;

        // Commit transaction so external child processes can query and lock the row on MySQL
        DB::commit();

        $barrierFile = storage_path('framework/testing_barrier_scenario_d_' . Str::random(8) . '.lock');
        if (file_exists($barrierFile)) {
            @unlink($barrierFile);
        }

        $identicalEvtId = 'EVT-IDENTICAL-' . Str::random(8);

        // Both processes send IDENTICAL provider event ID
        $proc1 = new Process([
            PHP_BINARY,
            'artisan',
            'finance:concurrent-callback-worker',
            $paymentId,
            'SUCCESS',
            $identicalEvtId,
            (string) $amountIdr,
            '--barrier=' . $barrierFile,
            '--env=testing',
        ], base_path(), $this->getWorkerEnv());

        $proc2 = new Process([
            PHP_BINARY,
            'artisan',
            'finance:concurrent-callback-worker',
            $paymentId,
            'SUCCESS',
            $identicalEvtId,
            (string) $amountIdr,
            '--barrier=' . $barrierFile,
            '--env=testing',
        ], base_path(), $this->getWorkerEnv());

        $proc1->start();
        $proc2->start();

        usleep(300000);
        touch($barrierFile);

        $proc1->wait();
        $proc2->wait();
        @unlink($barrierFile);

        $payment = PaymentIntent::find($paymentId);
        $this->assertSame('PAID', $payment->status);

        // Exactly 1 payment event recorded with this event ID
        $eventsCount = PaymentEvent::where('provider_event_id', $identicalEvtId)->count();
        $this->assertSame(1, $eventsCount);

        // Exactly 1 ledger journal
        $this->assertSame(1, LedgerJournal::where('payment_intent_id', $paymentId)->count());
    }

    // =========================================================================
    // FIX 18 — Demo Bank Destination Verification RBAC
    // =========================================================================

    public function test_fix_18_demo_bank_verification_rbac_and_audit(): void
    {
        $bank = BankDestination::create([
            'owner_type' => 'CUSTOMER',
            'owner_external_id' => 'USER-CUST-18',
            'bank_code' => 'BCA',
            'account_number' => '1234567890',
            'account_holder_name' => 'John Customer',
            'verification_status' => 'PENDING',
            'verification_method' => 'MOCK',
            'created_by_user_id' => 'USER-CUST-18',
        ]);

        // 1. Customer attempts verify-demo -> Strictly Forbidden (403)
        $resCust = $this->withHeaders($this->customerHeaders('USER-CUST-18'))
            ->postJson("/api/v1/finance/bank-destinations/{$bank->id}/verify-demo");
        $resCust->assertStatus(403);

        // 2. Merchant attempts verify-demo -> Strictly Forbidden (403)
        $resMerch = $this->withHeaders($this->merchantHeaders('ORG-MERCH-18', 'USER-MERCH-18'))
            ->postJson("/api/v1/finance/bank-destinations/{$bank->id}/verify-demo");
        $resMerch->assertStatus(403);

        // 3. CEO attempts verify-demo -> Strictly Forbidden (403)
        $resCeo = $this->withHeaders($this->ceoHeaders())
            ->postJson("/api/v1/finance/bank-destinations/{$bank->id}/verify-demo");
        $resCeo->assertStatus(403);

        // 4. Admin Operations attempts verify-demo -> Strictly Forbidden (403)
        $resAdmin = $this->withHeaders($this->gatewayHeaders([
            'X-Actor-User-Id' => 'ADMIN-OPS-18',
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
            'X-Actor-Role-Assignment-Id' => 'ra-admin-1',
            'X-Actor-Permissions' => 'admin.operations.read',
        ]))->postJson("/api/v1/finance/bank-destinations/{$bank->id}/verify-demo");
        $resAdmin->assertStatus(403);

        // 5. Authorized Finance Ops in demo mode -> SUCCEEDS (200), verified_at recorded
        $resOps = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/bank-destinations/{$bank->id}/verify-demo");
        $resOps->assertStatus(200);

        $bank->refresh();
        $this->assertSame('VERIFIED', $bank->verification_status);
        $this->assertNotNull($bank->verified_at);

        // 6. Audit log is recorded
        $audit = FinanceAuditLog::where('action', 'BANK_DESTINATION_DEMO_VERIFIED')
            ->where('subject_id', $bank->id)
            ->first();
        $this->assertNotNull($audit);
        $this->assertSame('SUCCESS', $audit->result);
    }
}
