<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\SPayAccount;
use Tests\TestCase;

class SecurityHardeningAndRBACTest extends TestCase
{
    public function test_simulation_endpoints_strictly_forbidden_for_ceo(): void
    {
        // CEO must NOT be allowed to simulate payments or payouts
        $resPayment = $this->withHeaders($this->ceoHeaders())
            ->postJson('/api/v1/finance/demo/payments/PAY-MOCK-001/simulate', [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-CEO-SIM-01',
                'reported_amount_idr' => 100000,
            ]);

        $resPayment->assertStatus(403);

        $resPayout = $this->withHeaders($this->ceoHeaders())
            ->postJson('/api/v1/finance/demo/withdrawals/WD-MOCK-001/simulate', [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-CEO-WD-01',
            ]);

        $resPayout->assertStatus(403);
    }

    public function test_simulation_endpoints_strictly_forbidden_for_customer_and_merchant(): void
    {
        // Customer
        $resCust = $this->withHeaders($this->customerHeaders())
            ->postJson('/api/v1/finance/demo/payments/PAY-MOCK-001/simulate', [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-CUST-SIM-01',
                'reported_amount_idr' => 100000,
            ]);

        $resCust->assertStatus(403);

        // Merchant
        $resMerch = $this->withHeaders($this->merchantHeaders())
            ->postJson('/api/v1/finance/demo/payments/PAY-MOCK-001/simulate', [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'EVT-MERCH-SIM-01',
                'reported_amount_idr' => 100000,
            ]);

        $resMerch->assertStatus(403);
    }

    public function test_untrusted_client_actor_headers_without_gateway_key_rejected_403(): void
    {
        // Untrusted client sending actor headers directly without valid X-Gateway-Key
        $res = $this->withHeaders([
            'X-Actor-User-Id' => 'SPOOFED-USER',
            'X-Actor-Role' => 'CEO_PRODUCT_OWNER',
            'Accept' => 'application/json',
        ])->getJson('/api/v1/finance/policies');

        $res->assertStatus(403)
            ->assertJsonPath('error.code', 'FINANCE_UNTRUSTED_GATEWAY_CONTEXT');

        // Same for X-User-Role
        $res2 = $this->withHeaders([
            'X-User-Id' => 'SPOOFED-USER-2',
            'X-User-Role' => 'FINANCE_PAYMENT_OPS',
            'Accept' => 'application/json',
        ])->getJson('/api/v1/finance/ops/reconciliation');

        $res2->assertStatus(403)
            ->assertJsonPath('error.code', 'FINANCE_UNTRUSTED_GATEWAY_CONTEXT');
    }

    public function test_merchant_cannot_access_other_organization_spay_or_held_funds(): void
    {
        // Merchant Org A tries to access Org B's S-Pay
        $res = $this->withHeaders($this->merchantHeaders('ORG-MERCHANT-A'))
            ->getJson('/api/v1/finance/spay/organizations/ORG-MERCHANT-B');

        $res->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN_ORGANIZATION_ACCESS');

        // Merchant Org A tries to view Org B's held funds
        $resHeld = $this->withHeaders($this->merchantHeaders('ORG-MERCHANT-A'))
            ->getJson('/api/v1/finance/held-funds?organization_id=ORG-MERCHANT-B');

        $resHeld->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN_ORGANIZATION_ACCESS');
    }

    public function test_customer_cannot_access_other_customer_withdrawal(): void
    {
        // Create an account and request for Customer 1
        $acc1 = SPayAccount::create([
            'owner_type' => 'CUSTOMER',
            'owner_external_id' => 'CUST-OWNER-01',
            'currency' => 'IDR',
            'available_idr' => 50000,
            'withdrawal_locked_idr' => 0,
            'account_status' => 'ACTIVE',
        ]);

        $bank = \App\Models\BankDestination::create([
            'owner_type' => 'CUSTOMER',
            'owner_external_id' => 'CUST-OWNER-01',
            'bank_code' => 'BCA',
            'account_number' => '1234567890',
            'account_holder_name' => 'John Doe',
            'verification_status' => 'VERIFIED',
            'is_default' => true,
            'created_by_user_id' => 'CUST-OWNER-01',
        ]);

        $wd = \App\Models\WithdrawalRequest::create([
            'spay_account_id' => $acc1->id,
            'bank_destination_id' => $bank->id,
            'requested_by_user_id' => 'CUST-OWNER-01',
            'requested_amount_idr' => 25000,
            'transfer_fee_idr' => 2500,
            'net_to_bank_idr' => 22500,
            'status' => 'PENDING',
            'idempotency_key_hash' => hash('sha256', 'idem-test-1'),
            'bank_snapshot_masked' => ['bank_code' => 'BCA', 'account_last4' => '7890'],
            'initiated_at' => now(),
        ]);

        // Customer 2 tries to view Customer 1's withdrawal
        $res = $this->withHeaders($this->customerHeaders('CUST-ATTACKER-02'))
            ->getJson("/api/v1/finance/withdrawals/{$wd->id}");

        $res->assertStatus(403);
    }
}
