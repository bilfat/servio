<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\BankDestination;
use App\Models\SPayAccount;
use App\Models\WithdrawalRequest;
use Tests\TestCase;

class WithdrawalAndPayoutTest extends TestCase
{
    private function setupFundedCustomerAccount(string $customerId = 'CUST-WD-01', int $amount = 100000): SPayAccount
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

    private function createVerifiedBank(string $ownerType, string $ownerExternalId, string $bankCode = 'BCA', string $accNo = '1234567890'): BankDestination
    {
        $bank = new BankDestination();
        $bank->owner_type = $ownerType;
        $bank->owner_external_id = $ownerExternalId;
        $bank->bank_code = $bankCode;
        $bank->account_number = $accNo;
        $bank->account_holder_name = 'Nasabah Terverifikasi';
        $bank->verification_status = 'VERIFIED';
        $bank->verification_method = 'MOCK';
        $bank->created_by_user_id = $ownerExternalId;
        $bank->save();

        return $bank;
    }

    public function test_withdrawal_below_minimum_rejected(): void
    {
        $this->setupFundedCustomerAccount('CUST-WD-01', 50000);
        $bank = $this->createVerifiedBank('CUSTOMER', 'CUST-WD-01');

        $res = $this->withHeaders($this->customerHeaders('CUST-WD-01'))
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'CUSTOMER',
                'amount_idr' => 15000, // Below Rp20.000 minimum
                'bank_destination_id' => $bank->id,
            ]);

        $res->assertStatus(422);
    }

    public function test_full_withdrawal_lifecycle_with_payout_simulation(): void
    {
        $account = $this->setupFundedCustomerAccount('CUST-WD-02', 100000);

        // 1. Add bank destination
        $addBankRes = $this->withHeaders($this->customerHeaders('CUST-WD-02'))
            ->postJson('/api/v1/finance/bank-destinations', [
                'owner_type' => 'CUSTOMER',
                'bank_code' => 'BCA',
                'account_number' => '9876543210',
                'account_holder_name' => 'Nasabah Setia',
            ]);

        $addBankRes->assertStatus(201)
            ->assertJsonPath('data.verification_status', 'PENDING');

        $bankId = $addBankRes->json('data.id');

        // 2. Cannot quote with unverified bank (422)
        $quoteUnverified = $this->withHeaders($this->customerHeaders('CUST-WD-02'))
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'CUSTOMER',
                'amount_idr' => 50000,
                'bank_destination_id' => $bankId,
            ]);

        $quoteUnverified->assertStatus(422);

        // 3. Verify bank via demo endpoint (must be performed by FINANCE_PAYMENT_OPS per FIX 18)
        $verifyRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/bank-destinations/{$bankId}/verify-demo");

        $verifyRes->assertStatus(200)
            ->assertJsonPath('data.verification_status', 'VERIFIED');

        // 4. Quote withdrawal
        $quoteRes = $this->withHeaders($this->customerHeaders('CUST-WD-02'))
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'CUSTOMER',
                'amount_idr' => 50000,
                'bank_destination_id' => $bankId,
            ]);

        $quoteRes->assertStatus(200)
            ->assertJsonPath('data.amount_idr', 50000)
            ->assertJsonPath('data.transfer_fee_idr', 2500)
            ->assertJsonPath('data.net_to_bank_idr', 47500);

        $quoteId = $quoteRes->json('data.quote_id');

        // 5. Submit withdrawal request
        $stepUpProof = $this->generateValidStepUpProof('CUST-WD-02', null, $account->id, 50000, $bankId);
        $wdRes = $this->withHeaders($this->customerHeaders('CUST-WD-02'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bankId,
                'bank_details_confirmed' => true,
                'step_up_reference' => $stepUpProof,
            ]);

        $wdRes->assertStatus(201)
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.requested_amount_idr', 50000)
            ->assertJsonPath('data.locked_amount_idr', 50000)
            ->assertJsonPath('data.remaining_available_idr', 50000);

        $wdId = $wdRes->json('data.withdrawal_id');

        // Balance check: Available should be 50.000, Locked should be 50.000
        $account->refresh();
        $this->assertSame(50000, (int) $account->available_idr);
        $this->assertSame(50000, (int) $account->withdrawal_locked_idr);

        // 6. Simulate payout success by Operator
        $simRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/withdrawals/{$wdId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'MOCK-PAYOUT-EVT-01',
            ]);

        $simRes->assertStatus(200)
            ->assertJsonPath('data.status', 'SUCCEEDED');

        // Balance check: Locked should be reduced to 0, available remains 50.000
        $account->refresh();
        $this->assertSame(50000, (int) $account->available_idr);
        $this->assertSame(0, (int) $account->withdrawal_locked_idr);
    }

    public function test_payout_failure_restores_locked_balance(): void
    {
        $account = $this->setupFundedCustomerAccount('CUST-WD-03', 50000);
        $bank = $this->createVerifiedBank('CUSTOMER', 'CUST-WD-03', 'BRI', '1122334455');

        $quoteRes = $this->withHeaders($this->customerHeaders('CUST-WD-03'))
            ->postJson('/api/v1/finance/withdrawals/quote', [
                'owner_type' => 'CUSTOMER',
                'amount_idr' => 30000,
                'bank_destination_id' => $bank->id,
            ]);

        $quoteId = $quoteRes->json('data.quote_id');

        $stepUpProof = $this->generateValidStepUpProof('CUST-WD-03', null, $account->id, 30000, $bank->id);
        $wdRes = $this->withHeaders($this->customerHeaders('CUST-WD-03'))
            ->postJson('/api/v1/finance/withdrawals', [
                'quote_id' => $quoteId,
                'bank_destination_id' => $bank->id,
                'bank_details_confirmed' => true,
                'step_up_reference' => $stepUpProof,
            ]);

        $wdId = $wdRes->json('data.withdrawal_id');

        // Locked is now 30.000, available is 20.000
        $account->refresh();
        $this->assertSame(20000, (int) $account->available_idr);
        $this->assertSame(30000, (int) $account->withdrawal_locked_idr);

        // Simulate FAILURE
        $simRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/withdrawals/{$wdId}/simulate", [
                'outcome' => 'FAILED',
                'provider_event_id' => 'MOCK-PAYOUT-FAIL-01',
            ]);

        $simRes->assertStatus(200)
            ->assertJsonPath('data.status', 'FAILED');

        // Balance check: Available restored to 50.000, Locked back to 0
        $account->refresh();
        $this->assertSame(50000, (int) $account->available_idr);
        $this->assertSame(0, (int) $account->withdrawal_locked_idr);
    }
}
