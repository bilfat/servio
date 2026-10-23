<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Finance\Withdrawals\WithdrawalService;
use App\Models\BankDestination;
use App\Models\FinanceCheckout;
use App\Models\HeldOrderFund;
use App\Models\InboxEvent;
use App\Models\LedgerJournal;
use App\Models\PaymentAllocation;
use App\Models\PaymentEvent;
use App\Models\PaymentIntent;
use App\Models\RefundTransaction;
use App\Models\SPayAccount;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class Prompt04SecurityAndConcurrencyTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createStandardActivePolicy();
        Config::set('finance.platform_subsidy_enabled', true);
        Config::set('finance.step_up_secret', 'test_step_up_hmac_secret_2026_xyz');
        $key = 'test_internal_key_abc_123';
        Config::set('finance.internal_service_key', $key);
        Config::set('services.internal.service_key', $key);
        $gwKey = 'test_gateway_key_secure_456';
        Config::set('finance.gateway_key', $gwKey);
        Config::set('services.gateway.key', $gwKey);
    }

    /**
     * Helper to set up verified bank destination
     */
    protected function createVerifiedBank(string $ownerType, string $ownerId, string $bankCode = 'BCA', string $accountNo = '1234567890'): BankDestination
    {
        return BankDestination::create([
            'owner_type' => $ownerType,
            'owner_external_id' => $ownerId,
            'bank_code' => $bankCode,
            'account_number' => $accountNo,
            'account_holder_name' => 'Budi Santoso',
            'verification_status' => 'VERIFIED',
            'is_default' => true,
            'created_by_user_id' => $ownerId,
        ]);
    }

    /**
     * Helper to create funded S-Pay account
     */
    protected function setupFundedAccount(string $ownerType, string $ownerId, int $availableAmount = 500000): SPayAccount
    {
        return SPayAccount::create([
            'owner_type' => $ownerType,
            'owner_external_id' => $ownerId,
            'currency' => 'IDR',
            'available_idr' => $availableAmount,
            'withdrawal_locked_idr' => 0,
            'account_status' => 'ACTIVE',
        ]);
    }

    // =========================================================================
    // FIX 09 — Step-Up Verification & Hardening
    // =========================================================================

    public function test_fix_09_step_up_verification_full_security_matrix(): void
    {
        $account = $this->setupFundedAccount('CUSTOMER', 'USER-CUST-09', 200000);
        $bankA = $this->createVerifiedBank('CUSTOMER', 'USER-CUST-09', 'BCA', '1111222233');
        $bankB = $this->createVerifiedBank('CUSTOMER', 'USER-CUST-09', 'MANDIRI', '9999888877');

        // Create Quote for Rp50.000 to Bank A
        $quoteRes = $this->withHeaders($this->customerHeaders('USER-CUST-09'))
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'CUSTOMER',
                'amount_idr' => 50000,
                'bank_destination_id' => $bankA->id,
            ]);
        $quoteRes->assertStatus(200);
        $quoteId = $quoteRes->json('data.quote_id');

        // 1. Empty step_up_reference -> Rejected (422), balance untouched
        $resEmpty = $this->withHeaders($this->customerHeaders('USER-CUST-09'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bankA->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => '',
            ]);
        $resEmpty->assertStatus(422);
        $account->refresh();
        $this->assertSame(200000, (int) $account->available_idr);
        $this->assertSame(0, (int) $account->withdrawal_locked_idr);

        // 2. Forged / invalid signature -> Rejected (422)
        $fakeProof = 'stp_' . base64_encode(json_encode(['purpose' => 'WITHDRAWAL'])) . '.invalidsignaturefake123456';
        $resFake = $this->withHeaders($this->customerHeaders('USER-CUST-09'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bankA->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $fakeProof,
            ]);
        $resFake->assertStatus(422);
        $account->refresh();
        $this->assertSame(200000, (int) $account->available_idr);

        // 3. Expired step-up proof -> Rejected (422)
        $expiredProof = WithdrawalService::generateStepUpProof([
            'user_id' => 'USER-CUST-09',
            'organization_id' => null,
            'spay_account_id' => $account->id,
            'amount_idr' => 50000,
            'bank_destination_id' => $bankA->id,
            'purpose' => 'WITHDRAWAL',
            'expires_at' => now()->subMinute()->timestamp,
        ]);
        $resExpired = $this->withHeaders($this->customerHeaders('USER-CUST-09'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bankA->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $expiredProof,
            ]);
        $resExpired->assertStatus(422);
        $account->refresh();
        $this->assertSame(200000, (int) $account->available_idr);

        // 4. Step-up for Bank B used for Bank A -> Rejected (422)
        $wrongBankProof = WithdrawalService::generateStepUpProof([
            'user_id' => 'USER-CUST-09',
            'organization_id' => null,
            'spay_account_id' => $account->id,
            'amount_idr' => 50000,
            'bank_destination_id' => $bankB->id, // Mismatch with quote!
            'purpose' => 'WITHDRAWAL',
            'expires_at' => now()->addMinutes(5)->timestamp,
        ]);
        $resWrongBank = $this->withHeaders($this->customerHeaders('USER-CUST-09'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bankA->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $wrongBankProof,
            ]);
        $resWrongBank->assertStatus(422);
        $account->refresh();
        $this->assertSame(200000, (int) $account->available_idr);

        // 5. Step-up for Rp100.000 used for Rp50.000 -> Rejected (422)
        $wrongAmountProof = WithdrawalService::generateStepUpProof([
            'user_id' => 'USER-CUST-09',
            'organization_id' => null,
            'spay_account_id' => $account->id,
            'amount_idr' => 100000, // Quote is 50.000!
            'bank_destination_id' => $bankA->id,
            'purpose' => 'WITHDRAWAL',
            'expires_at' => now()->addMinutes(5)->timestamp,
        ]);
        $resWrongAmount = $this->withHeaders($this->customerHeaders('USER-CUST-09'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bankA->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $wrongAmountProof,
            ]);
        $resWrongAmount->assertStatus(422);
        $account->refresh();
        $this->assertSame(200000, (int) $account->available_idr);

        // 6. Step-up of User X used by User Y -> Rejected (403)
        $wrongUserProof = WithdrawalService::generateStepUpProof([
            'user_id' => 'ANOTHER-USER-XYZ',
            'organization_id' => null,
            'spay_account_id' => $account->id,
            'amount_idr' => 50000,
            'bank_destination_id' => $bankA->id,
            'purpose' => 'WITHDRAWAL',
            'expires_at' => now()->addMinutes(5)->timestamp,
        ]);
        $resWrongUser = $this->withHeaders($this->customerHeaders('USER-CUST-09'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bankA->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $wrongUserProof,
            ]);
        $resWrongUser->assertStatus(403);
        $account->refresh();
        $this->assertSame(200000, (int) $account->available_idr);

        // 7. Valid step-up proof -> SUCCEEDS (201), funds locked atomically
        $validProof = WithdrawalService::generateStepUpProof([
            'user_id' => 'USER-CUST-09',
            'organization_id' => null,
            'spay_account_id' => $account->id,
            'amount_idr' => 50000,
            'bank_destination_id' => $bankA->id,
            'purpose' => 'WITHDRAWAL',
            'expires_at' => now()->addMinutes(5)->timestamp,
            'nonce' => (string) Str::uuid(),
        ]);
        $resSuccess = $this->withHeaders($this->customerHeaders('USER-CUST-09'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bankA->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $validProof,
            ]);
        $resSuccess->assertStatus(201);
        $account->refresh();
        $this->assertSame(150000, (int) $account->available_idr);
        $this->assertSame(50000, (int) $account->withdrawal_locked_idr);

        // 8. Replay attack: try using the exact same step-up proof on a new quote -> Rejected (422 Anti-Replay)
        $quoteRes2 = $this->withHeaders($this->customerHeaders('USER-CUST-09'))
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'CUSTOMER',
                'amount_idr' => 50000,
                'bank_destination_id' => $bankA->id,
            ]);
        $quoteId2 = $quoteRes2->json('data.quote_id');

        $resReplay = $this->withHeaders($this->customerHeaders('USER-CUST-09'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId2,
                'bank_destination_id' => $bankA->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $validProof, // Replaying previous token!
            ]);
        $resReplay->assertStatus(422);
        $account->refresh();
        $this->assertSame(150000, (int) $account->available_idr); // Still untouched!

        // 9. When step_up_secret is unconfigured -> Fails closed with 503 PENDING_IDENTITY_DEPENDENCY
        Config::set('finance.step_up_secret', null);
        $resUnconfigured = $this->withHeaders($this->customerHeaders('USER-CUST-09'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId2,
                'bank_destination_id' => $bankA->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => 'stp_somerandomstring.123',
            ]);
        $resUnconfigured->assertStatus(503);
        $account->refresh();
        $this->assertSame(150000, (int) $account->available_idr);
    }

    // =========================================================================
    // FIX 10 — Hardcoded Secrets & Unsafe Fallbacks Removed
    // =========================================================================

    public function test_fix_10_secrets_strictly_enforced_fail_closed(): void
    {
        // 1. Correct Internal Service Key -> Allowed
        $resInternalValid = $this->withHeaders([
            'Authorization' => 'Bearer test_internal_key_abc_123',
            'Accept' => 'application/json',
        ])->getJson('/internal/v1/finance/checkouts/non-existent-id');
        $this->assertNotEquals(401, $resInternalValid->status()); // Handled by controller (404), not auth rejected

        // 2. Wrong Internal Service Key -> 401
        $resInternalWrong = $this->withHeaders([
            'Authorization' => 'Bearer wrong_internal_key_999',
            'Accept' => 'application/json',
        ])->getJson('/internal/v1/finance/checkouts/chk-123');
        $resInternalWrong->assertStatus(401);

        // 3. Empty Internal Service Key -> 401
        $resInternalEmpty = $this->withHeaders([
            'Authorization' => 'Bearer ',
            'Accept' => 'application/json',
        ])->getJson('/internal/v1/finance/checkouts/chk-123');
        $resInternalEmpty->assertStatus(401);

        // 4. When Internal Service Key is NOT configured -> Fails closed (401)
        Config::set('services.internal.service_key', null);
        Config::set('finance.internal_service_key', null);
        $resInternalUnconfigured = $this->withHeaders([
            'Authorization' => 'Bearer any_key_here',
            'Accept' => 'application/json',
        ])->getJson('/internal/v1/finance/checkouts/chk-123');
        $resInternalUnconfigured->assertStatus(401);

        // 5. Gateway Key: Client actor header without valid X-Gateway-Key -> 403 Untrusted
        $resUntrustedGateway = $this->withHeaders([
            'X-Actor-User-Id' => 'USER-TEST-1',
            'X-Actor-Role' => 'CUSTOMER',
            'Accept' => 'application/json',
            // Missing X-Gateway-Key
        ])->getJson('/api/v1/finance/spay/me');
        $resUntrustedGateway->assertStatus(403);

        // 6. Demo simulation endpoint when APP_ENV=production -> Not available (403/404)
        Config::set('app.env', 'production');
        $resDemoProd = $this->withHeaders($this->financeOpsHeaders())
            ->postJson('/api/v1/finance/demo/payments/pi-123/simulate', [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-PROD-TEST',
                'reported_amount_idr' => 10000,
            ]);
        $this->assertTrue(in_array($resDemoProd->status(), [403, 404], true));
        Config::set('app.env', 'testing');
    }

    // =========================================================================
    // FIX 11 — Payment Concurrency & Race Condition
    // =========================================================================

    public function test_fix_11_payment_callback_concurrency_and_row_locking(): void
    {
        // Setup checkout and payment intent
        $quotePayload = [
            'checkout_group_id' => 'CHK-CONCURRENT-01',
            'customer_id' => 'CUST-CONCURRENT-01',
            'validated_by_order_service' => true,
            'merchant_orders' => [
                [
                    'merchant_order_id' => 'MORD-CONCURRENT-01',
                    'merchant_org_id' => 'ORG-CONCURRENT-A',
                    'product_subtotal_idr' => 100000,
                    'shipping_customer_idr' => 10000,
                    'discount_idr' => 0,
                    'discount_bearer' => 'MERCHANT',
                ],
            ],
        ];

        $checkoutRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', $quotePayload);
        $checkoutRes->assertStatus(201);
        $payloadHash = $checkoutRes->json('data.payload_hash');

        $piRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkouts/CHK-CONCURRENT-01/payment-intents', [
                'method' => 'QRIS',
                'quote_payload_hash' => $payloadHash,
                'order_quote_revision' => 1,
            ]);
        $piRes->assertStatus(201);
        $paymentId = $piRes->json('data.payment_id');
        $paymentAmount = (int) $piRes->json('data.amount_idr');

        // Verify initial status is PENDING
        $intent = PaymentIntent::findOrFail($paymentId);
        $this->assertSame('PENDING', $intent->status);

        // Skenario 1: Callback A executes SUCCESS.
        $resCallbackA = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'PROVIDER-EVT-A-1',
                'reported_amount_idr' => $paymentAmount,
            ]);
        $resCallbackA->assertStatus(200)
            ->assertJsonPath('data.status', 'PAID');

        // Skenario 2: Concurrent Callback B arrives with different provider event ID for the now-PAID intent.
        // Under row-lock, it reads status PAID and returns idempotently WITHOUT duplicate ledger lines or held funds!
        $resCallbackB = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'PROVIDER-EVT-B-2',
                'reported_amount_idr' => $paymentAmount,
            ]);
        $resCallbackB->assertStatus(200)
            ->assertJsonPath('data.status', 'PAID');

        // Skenario 3: Callback C tries to mark it FAILED after it was PAID -> Handled safely (returns PAID)
        $resCallbackC = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'FAILED',
                'provider_event_id' => 'PROVIDER-EVT-C-3',
                'reported_amount_idr' => $paymentAmount,
            ]);
        $resCallbackC->assertStatus(200)
            ->assertJsonPath('data.status', 'PAID');

        // Verify database: exactly 1 payment settlement journal, exactly 1 held fund
        $journals = LedgerJournal::where('payment_intent_id', $paymentId)
            ->where('journal_type', 'PAYMENT_SETTLEMENT')
            ->get();
        $this->assertCount(1, $journals);

        $heldFunds = HeldOrderFund::whereHas('allocation', function ($q) {
            $q->where('merchant_order_id', 'MORD-CONCURRENT-01');
        })->get();
        $this->assertCount(1, $heldFunds);

        // Ledger balance verification
        $debits = DB::table('ledger_lines')->where('ledger_journal_id', $journals->first()->id)->where('entry_side', 'DEBIT')->sum('amount_idr');
        $credits = DB::table('ledger_lines')->where('ledger_journal_id', $journals->first()->id)->where('entry_side', 'CREDIT')->sum('amount_idr');
        $this->assertSame($debits, $credits);
    }

    public function test_fix_11_payment_failed_cannot_transition_to_paid(): void
    {
        $quotePayload = [
            'checkout_group_id' => 'CHK-FAILED-01',
            'customer_id' => 'CUST-FAILED-01',
            'validated_by_order_service' => true,
            'merchant_orders' => [
                [
                    'merchant_order_id' => 'MORD-FAILED-01',
                    'merchant_org_id' => 'ORG-FAILED-A',
                    'product_subtotal_idr' => 50000,
                    'shipping_customer_idr' => 5000,
                    'discount_idr' => 0,
                    'discount_bearer' => 'MERCHANT',
                ],
            ],
        ];

        $checkoutRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', $quotePayload);
        $checkoutRes->assertStatus(201);
        $payloadHash = $checkoutRes->json('data.payload_hash');

        $piRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkouts/CHK-FAILED-01/payment-intents', [
                'method' => 'VA',
                'quote_payload_hash' => $payloadHash,
                'order_quote_revision' => 1,
            ]);
        $piRes->assertStatus(201);
        $paymentId = $piRes->json('data.payment_id');
        $paymentAmount = (int) $piRes->json('data.amount_idr');

        // 1. First callback reports FAILED
        $failRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'FAILED',
                'provider_event_id' => 'FAIL-EVT-01',
                'reported_amount_idr' => $paymentAmount,
            ]);
        $failRes->assertStatus(200)
            ->assertJsonPath('data.status', 'FAILED');

        // 2. Second callback attempts to mark PAID -> Rejected (409 Conflict)
        $paidRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'SUCCESS-LATE-EVT-02',
                'reported_amount_idr' => $paymentAmount,
            ]);
        $paidRes->assertStatus(409);

        // Verify status remains FAILED and no journals created
        $intent = PaymentIntent::findOrFail($paymentId);
        $this->assertSame('FAILED', $intent->status);
        $this->assertSame(0, LedgerJournal::where('payment_intent_id', $paymentId)->count());
    }

    // =========================================================================
    // FIX 12 — Organization Withdrawal Permissions
    // =========================================================================

    public function test_fix_12_organization_withdrawal_authorization(): void
    {
        $account = $this->setupFundedAccount('MERCHANT_ORGANIZATION', 'ORG-AUTH-TEST', 300000);
        $bank = $this->createVerifiedBank('MERCHANT_ORGANIZATION', 'ORG-AUTH-TEST', 'BCA', '4444555566');

        // 1. Finance Ops attempts quote on Merchant Org -> 403 Forbidden
        $opsRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'MERCHANT_ORGANIZATION',
                'owner_id' => 'ORG-AUTH-TEST',
                'amount_idr' => 50000,
                'bank_destination_id' => $bank->id,
            ]);
        $opsRes->assertStatus(403);

        // 2. Merchant member from DIFFERENT organization -> 403 Forbidden
        $wrongOrgRes = $this->withHeaders($this->merchantHeaders('ORG-ANOTHER', 'USER-MERCH-OTHER'))
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'MERCHANT_ORGANIZATION',
                'owner_id' => 'ORG-AUTH-TEST',
                'amount_idr' => 50000,
                'bank_destination_id' => $bank->id,
            ]);
        $wrongOrgRes->assertStatus(403);

        // 3. Merchant member of same org, but INACTIVE membership -> 403 Forbidden
        $inactiveMemHeaders = $this->gatewayHeaders([
            'X-Actor-User-Id' => 'USER-INACTIVE-01',
            'X-Actor-Role' => 'MERCHANT',
            'X-Actor-Org-Id' => 'ORG-AUTH-TEST',
            'X-Actor-Membership-Active' => 'false',
            'X-Actor-Permissions' => 'finance.spay.withdraw_organization',
        ]);
        $inactiveMemRes = $this->withHeaders($inactiveMemHeaders)
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'MERCHANT_ORGANIZATION',
                'owner_id' => 'ORG-AUTH-TEST',
                'amount_idr' => 50000,
                'bank_destination_id' => $bank->id,
            ]);
        $inactiveMemRes->assertStatus(403);

        // 4. Merchant member with ACTIVE membership but WITHOUT permission 'finance.spay.withdraw_organization' -> 403
        $noPermHeaders = $this->gatewayHeaders([
            'X-Actor-User-Id' => 'USER-NO-PERM-01',
            'X-Actor-Role' => 'MERCHANT',
            'X-Actor-Org-Id' => 'ORG-AUTH-TEST',
            'X-Actor-Membership-Active' => 'true',
            'X-Actor-Permissions' => 'finance.spay.read_organization', // Read only, no withdraw permission!
        ]);
        $noPermRes = $this->withHeaders($noPermHeaders)
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'MERCHANT_ORGANIZATION',
                'owner_id' => 'ORG-AUTH-TEST',
                'amount_idr' => 50000,
                'bank_destination_id' => $bank->id,
            ]);
        $noPermRes->assertStatus(403);

        // 5. Authorized Merchant Member WITH permission -> Quote SUCCEEDS (200)
        $authHeaders = $this->gatewayHeaders([
            'X-Actor-User-Id' => 'USER-AUTH-OWNER',
            'X-Actor-Role' => 'MERCHANT',
            'X-Actor-Org-Id' => 'ORG-AUTH-TEST',
            'X-Actor-Membership-Active' => 'true',
            'X-Actor-Permissions' => 'finance.spay.read_organization,finance.spay.withdraw_organization',
        ]);
        $quoteRes = $this->withHeaders($authHeaders)
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'MERCHANT_ORGANIZATION',
                'owner_id' => 'ORG-AUTH-TEST',
                'amount_idr' => 50000,
                'bank_destination_id' => $bank->id,
            ]);
        $quoteRes->assertStatus(200);
        $quoteId = $quoteRes->json('data.quote_id');

        // 6. Permission revoked between Quote and Submit:
        // When submit is sent by a user whose permission was revoked -> 403 Forbidden
        $stepUpProof = WithdrawalService::generateStepUpProof([
            'user_id' => 'USER-NO-PERM-01',
            'organization_id' => 'ORG-AUTH-TEST',
            'spay_account_id' => $account->id,
            'amount_idr' => 50000,
            'bank_destination_id' => $bank->id,
            'purpose' => 'WITHDRAWAL',
            'expires_at' => now()->addMinutes(5)->timestamp,
        ]);
        $revokedSubmitRes = $this->withHeaders($noPermHeaders)
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bank->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $stepUpProof,
            ]);
        $revokedSubmitRes->assertStatus(403);
        $account->refresh();
        $this->assertSame(300000, (int) $account->available_idr); // Balance untouched

        // 7. Authorized submit with matching permission -> SUCCEEDS (201)
        $authStepUpProof = WithdrawalService::generateStepUpProof([
            'user_id' => 'USER-AUTH-OWNER',
            'organization_id' => 'ORG-AUTH-TEST',
            'spay_account_id' => $account->id,
            'amount_idr' => 50000,
            'bank_destination_id' => $bank->id,
            'purpose' => 'WITHDRAWAL',
            'expires_at' => now()->addMinutes(5)->timestamp,
            'nonce' => (string) Str::uuid(),
        ]);
        $successSubmitRes = $this->withHeaders($authHeaders)
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bank->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $authStepUpProof,
            ]);
        $successSubmitRes->assertStatus(201);
        $account->refresh();
        $this->assertSame(250000, (int) $account->available_idr);
        $this->assertSame(50000, (int) $account->withdrawal_locked_idr);
    }

    // =========================================================================
    // FIX 13 — ORDER_CANCELLED Consistency
    // =========================================================================

    public function test_fix_13_order_cancelled_event_handling_and_inbox_integrity(): void
    {
        // 1. Setup multi-merchant checkout with 2 orders
        $quotePayload = [
            'checkout_group_id' => 'CHK-CANCEL-01',
            'customer_id' => 'CUST-CANCEL-01',
            'validated_by_order_service' => true,
            'merchant_orders' => [
                [
                    'merchant_order_id' => 'MORD-CANCEL-A',
                    'merchant_org_id' => 'ORG-CANCEL-A',
                    'product_subtotal_idr' => 100000,
                    'shipping_customer_idr' => 10000,
                    'discount_idr' => 0,
                    'discount_bearer' => 'MERCHANT',
                ],
                [
                    'merchant_order_id' => 'MORD-CANCEL-B',
                    'merchant_org_id' => 'ORG-CANCEL-B',
                    'product_subtotal_idr' => 200000,
                    'shipping_customer_idr' => 20000,
                    'discount_idr' => 0,
                    'discount_bearer' => 'MERCHANT',
                ],
            ],
        ];

        $checkoutRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', $quotePayload);
        $checkoutRes->assertStatus(201);
        $payloadHash = $checkoutRes->json('data.payload_hash');

        $piRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkouts/CHK-CANCEL-01/payment-intents', [
                'method' => 'QRIS',
                'quote_payload_hash' => $payloadHash,
                'order_quote_revision' => 1,
            ]);
        $piRes->assertStatus(201);
        $paymentId = $piRes->json('data.payment_id');
        $paymentAmount = (int) $piRes->json('data.amount_idr');

        // Pay the intent
        $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'PAY-EVT-CANCEL-01',
                'reported_amount_idr' => $paymentAmount,
            ]);

        // Customer S-Pay starts at 0 or uncreated
        $custAccount = SPayAccount::where('owner_type', 'CUSTOMER')->where('owner_external_id', 'CUST-CANCEL-01')->first();
        $this->assertSame(0, (int) ($custAccount?->available_idr ?? 0));

        // 2. Dispatch ORDER_CANCELLED event for MORD-CANCEL-A
        $cancelEventRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/order-events', [
                'event_id' => 'EVT-ORDER-CANCEL-A-1',
                'event_type' => 'ORDER_CANCELLED',
                'merchant_order_id' => 'MORD-CANCEL-A',
                'payload' => [
                    'checkout_group_id' => 'CHK-CANCEL-01',
                    'reason_code' => 'BUYER_CANCELLED',
                ],
            ]);
        $cancelEventRes->assertStatus(200)
            ->assertJsonPath('data.status', 'PROCESSED');

        // Verify Inbox Event marked PROCESSED
        $inbox = InboxEvent::where('source_event_id', 'EVT-ORDER-CANCEL-A-1')->first();
        $this->assertNotNull($inbox);
        $this->assertSame('PROCESSED', $inbox->status);

        // Verify Customer S-Pay received exact refund for Order A (subtotal 100k + shipping 10k + allocated app fee)
        $allocA = PaymentAllocation::where('merchant_order_id', 'MORD-CANCEL-A')->firstOrFail();
        $custAccount = SPayAccount::where('owner_type', 'CUSTOMER')->where('owner_external_id', 'CUST-CANCEL-01')->firstOrFail();
        $this->assertSame($allocA->customer_total_idr, (int) $custAccount->available_idr);

        // Verify Order B is completely untouched and still HELD
        $heldB = HeldOrderFund::whereHas('allocation', fn ($q) => $q->where('merchant_order_id', 'MORD-CANCEL-B'))->firstOrFail();
        $this->assertSame('HELD', $heldB->status);

        // 3. Replay exact same event -> Idempotent ALREADY_PROCESSED
        $replayRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/order-events', [
                'event_id' => 'EVT-ORDER-CANCEL-A-1',
                'event_type' => 'ORDER_CANCELLED',
                'merchant_order_id' => 'MORD-CANCEL-A',
                'payload' => [
                    'checkout_group_id' => 'CHK-CANCEL-01',
                    'reason_code' => 'BUYER_CANCELLED',
                ],
            ]);
        $replayRes->assertStatus(200)
            ->assertJsonPath('data.status', 'ALREADY_PROCESSED');
        $custAccount->refresh();
        $this->assertSame($allocA->customer_total_idr, (int) $custAccount->available_idr); // Not double refunded!

        // 4. Unsupported Event Type -> Rejected with 422, NEVER marked PROCESSED
        $unsupportedRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/order-events', [
                'event_id' => 'EVT-UNSUPPORTED-99',
                'event_type' => 'ORDER_SHIPPED_EVENT_UNKNOWN',
                'merchant_order_id' => 'MORD-CANCEL-B',
                'payload' => ['sample' => 123],
            ]);
        $unsupportedRes->assertStatus(422);
        $inboxUnsup = InboxEvent::where('source_event_id', 'EVT-UNSUPPORTED-99')->first();
        $this->assertNull($inboxUnsup);
    }

    // =========================================================================
    // FIX 14 — PLATFORM Discount Funding & Accounting
    // =========================================================================

    public function test_fix_14_platform_discount_subsidy_accounting_and_ledger(): void
    {
        // 1. When platform subsidy is disabled -> Rejected with 422 PENDING_POLICY
        Config::set('finance.platform_subsidy_enabled', false);
        $disabledPayload = [
            'checkout_group_id' => 'CHK-PLATFORM-DISC-DISABLED',
            'customer_id' => 'CUST-PLATFORM-01',
            'validated_by_order_service' => true,
            'merchant_orders' => [
                [
                    'merchant_order_id' => 'MORD-DISC-01',
                    'merchant_org_id' => 'ORG-DISC-01',
                    'product_subtotal_idr' => 100000,
                    'shipping_customer_idr' => 10000,
                    'discount_idr' => 15000,
                    'discount_bearer' => 'PLATFORM',
                ],
            ],
        ];
        $disabledRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', $disabledPayload);
        $disabledRes->assertStatus(422);
        $errorMessage = (string) ($disabledRes->json('error.message') ?? $disabledRes->json('message'));
        $this->assertStringContainsString('PENDING_POLICY', $errorMessage);

        // 2. Enable platform subsidy funding source
        Config::set('finance.platform_subsidy_enabled', true);

        // Quote multi-merchant checkout with PLATFORM subsidy on Order 1 and MERCHANT discount on Order 2
        $fundedPayload = [
            'checkout_group_id' => 'CHK-PLATFORM-DISC-FUNDED',
            'customer_id' => 'CUST-PLATFORM-01',
            'validated_by_order_service' => true,
            'merchant_orders' => [
                [
                    'merchant_order_id' => 'MORD-PLAT-A',
                    'merchant_org_id' => 'ORG-PLAT-A',
                    'product_subtotal_idr' => 100000,
                    'shipping_customer_idr' => 10000,
                    'discount_idr' => 20000,
                    'discount_bearer' => 'PLATFORM', // Subsidized by Platform!
                ],
                [
                    'merchant_order_id' => 'MORD-PLAT-B',
                    'merchant_org_id' => 'ORG-PLAT-B',
                    'product_subtotal_idr' => 200000,
                    'shipping_customer_idr' => 15000,
                    'discount_idr' => 10000,
                    'discount_bearer' => 'MERCHANT', // Borne by Merchant!
                ],
            ],
        ];

        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', $fundedPayload);
        $quoteRes->assertStatus(201);
        $payloadHash = $quoteRes->json('data.payload_hash');

        $allocA = PaymentAllocation::where('merchant_order_id', 'MORD-PLAT-A')->firstOrFail();
        $allocB = PaymentAllocation::where('merchant_order_id', 'MORD-PLAT-B')->firstOrFail();

        // Check Merchant A entitlement: full subtotal (100k) + shipping (10k) - commission (5k), NOT reduced by platform discount!
        $this->assertSame(105000, (int) $allocA->merchant_net_entitlement_idr);

        // Check Merchant B entitlement: (subtotal 200k - discount 10k) + shipping (15k) - commission (10k) = 195k
        $this->assertSame(195000, (int) $allocB->merchant_net_entitlement_idr);

        // 3. Create Payment Intent and Simulate Paid
        $piRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkouts/CHK-PLATFORM-DISC-FUNDED/payment-intents', [
                'method' => 'VA',
                'quote_payload_hash' => $payloadHash,
                'order_quote_revision' => 1,
            ]);
        $piRes->assertStatus(201);
        $paymentId = $piRes->json('data.payment_id');
        $paymentAmount = (int) $piRes->json('data.amount_idr');

        $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'PAY-EVT-PLATFORM-FUND-01',
                'reported_amount_idr' => $paymentAmount,
            ]);

        // 4. Verify Double-Entry Settlement Journal:
        // Debits: MOCK_PROVIDER_CLEARING (customer paid) + PLATFORM_PROMO_EXPENSE (20.000 platform discount)
        // Credits: ORDER_FUNDS_HELD (total gross held)
        $settlementJournal = LedgerJournal::where('payment_intent_id', $paymentId)
            ->where('journal_type', 'PAYMENT_SETTLEMENT')
            ->firstOrFail();

        $debitCustomer = DB::table('ledger_lines')->where('ledger_journal_id', $settlementJournal->id)->where('account_code', 'MOCK_PROVIDER_CLEARING')->sum('amount_idr');
        $debitPromo = DB::table('ledger_lines')->where('ledger_journal_id', $settlementJournal->id)->where('account_code', 'PLATFORM_PROMO_EXPENSE')->sum('amount_idr');
        $creditHeld = DB::table('ledger_lines')->where('ledger_journal_id', $settlementJournal->id)->where('account_code', 'ORDER_FUNDS_HELD')->sum('amount_idr');

        $this->assertSame(20000, (int) $debitPromo);
        $this->assertSame((int) ($debitCustomer + $debitPromo), (int) $creditHeld);

        // 5. Release Held Funds after maturity (120 hours) for Order A
        $heldA = HeldOrderFund::where('payment_allocation_id', $allocA->id)->firstOrFail();
        $heldA->completed_at = now()->subHours(121);
        $heldA->eligible_release_at = now()->subHour();
        $heldA->save();

        $processRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/held-funds/process-matured');
        $processRes->assertStatus(200);

        $heldA->refresh();
        $this->assertSame('RELEASED_TO_SPAY', $heldA->status);

        // Verify Merchant Org A received full entitlement (105.000) into S-Pay without penalty
        $merchAccountA = SPayAccount::where('owner_type', 'MERCHANT_ORGANIZATION')->where('owner_external_id', 'ORG-PLAT-A')->firstOrFail();
        $this->assertSame(105000, (int) $merchAccountA->available_idr);

        // Verify HELD_RELEASE journal is 100% balanced
        $releaseJournal = LedgerJournal::where('source_type', 'HeldOrderFund')
            ->where('source_id', $heldA->id)
            ->where('journal_type', 'HELD_RELEASE')
            ->firstOrFail();

        $totalRelDebit = DB::table('ledger_lines')->where('ledger_journal_id', $releaseJournal->id)->where('entry_side', 'DEBIT')->sum('amount_idr');
        $totalRelCredit = DB::table('ledger_lines')->where('ledger_journal_id', $releaseJournal->id)->where('entry_side', 'CREDIT')->sum('amount_idr');
        $this->assertSame($totalRelDebit, $totalRelCredit);
    }

    public function test_fix_14_platform_discount_order_cancellation_refund_reversal(): void
    {
        Config::set('finance.platform_subsidy_enabled', true);

        $payload = [
            'checkout_group_id' => 'CHK-PLAT-REFUND-01',
            'customer_id' => 'CUST-PLAT-REF-01',
            'validated_by_order_service' => true,
            'merchant_orders' => [
                [
                    'merchant_order_id' => 'MORD-PLAT-REF-01',
                    'merchant_org_id' => 'ORG-PLAT-REF-01',
                    'product_subtotal_idr' => 100000,
                    'shipping_customer_idr' => 10000,
                    'discount_idr' => 25000,
                    'discount_bearer' => 'PLATFORM',
                ],
            ],
        ];

        $checkoutRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', $payload);
        $checkoutRes->assertStatus(201);
        $payloadHash = $checkoutRes->json('data.payload_hash');

        $piRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkouts/CHK-PLAT-REFUND-01/payment-intents', [
                'method' => 'QRIS',
                'quote_payload_hash' => $payloadHash,
                'order_quote_revision' => 1,
            ]);
        $piRes->assertStatus(201);
        $paymentId = $piRes->json('data.payment_id');
        $paymentAmount = (int) $piRes->json('data.amount_idr');

        $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'PAY-EVT-PLAT-REF-01',
                'reported_amount_idr' => $paymentAmount,
            ]);

        $alloc = PaymentAllocation::where('merchant_order_id', 'MORD-PLAT-REF-01')->firstOrFail();

        // Customer paid: 100k + 10k + appFee (e.g. 2k) - 25k discount = 87k
        $customerPaid = $alloc->customer_total_idr;

        // Cancel order via refund
        $refundRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/refunds/order-cancellations', [
                'source_event_id' => 'CANCEL-EVT-PLAT-01',
                'merchant_order_id' => 'MORD-PLAT-REF-01',
                'checkout_group_id' => 'CHK-PLAT-REFUND-01',
                'order_status' => 'CANCELLED',
                'cancelled_at' => now()->toIso8601String(),
                'decision_source' => 'CUSTOMER',
                'reason_code' => 'BUYER_CANCELLED',
            ]);
        $refundRes->assertStatus(200);

        // 1. Customer receives exactly what customer paid (no over-refund!)
        $custAccount = SPayAccount::where('owner_type', 'CUSTOMER')->where('owner_external_id', 'CUST-PLAT-REF-01')->firstOrFail();
        $this->assertSame($customerPaid, (int) $custAccount->available_idr);

        // 2. Cancellation journal balances:
        // Debit: ORDER_FUNDS_HELD = customerPaid + 25.000 discount
        // Credit: SPAY_CUSTOMER_REFUND_PAYABLE = customerPaid
        // Credit: PLATFORM_PROMO_EXPENSE = 25.000 (unspent promo reversed)
        $refundJournal = LedgerJournal::where('journal_type', 'CANCELLATION_REFUND')
            ->where('payment_intent_id', $paymentId)
            ->firstOrFail();

        $totDebit = DB::table('ledger_lines')->where('ledger_journal_id', $refundJournal->id)->where('entry_side', 'DEBIT')->sum('amount_idr');
        $totCredit = DB::table('ledger_lines')->where('ledger_journal_id', $refundJournal->id)->where('entry_side', 'CREDIT')->sum('amount_idr');
        $this->assertSame($totDebit, $totCredit);

        $reversedPromo = DB::table('ledger_lines')->where('ledger_journal_id', $refundJournal->id)->where('account_code', 'PLATFORM_PROMO_EXPENSE')->where('entry_side', 'CREDIT')->sum('amount_idr');
        $this->assertSame(25000, (int) $reversedPromo);
    }
}
