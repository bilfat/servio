<?php

declare(strict_types=1);

namespace Tests;

use App\Domain\Finance\Policies\FeePolicyService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Str;

abstract class TestCase extends BaseTestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
    }

    protected function gatewayHeaders(array $extra = []): array
    {
        return array_merge([
            'X-Gateway-Key' => config('services.gateway.key'),
            'X-Request-ID' => (string) Str::uuid(),
            'Accept' => 'application/json',
        ], $extra);
    }

    protected function ceoHeaders(string $userId = 'CEO-USER-01'): array
    {
        return $this->gatewayHeaders([
            'X-Actor-User-Id' => $userId,
            'X-Actor-Role' => 'CEO_PRODUCT_OWNER',
            'X-Actor-Role-Assignment-Id' => 'ra-ceo-1',
            'X-Actor-Authz-Version' => 1,
            'X-Actor-Permissions' => 'finance.policy.manage,finance.policy.read,finance.ops.read',
        ]);
    }

    protected function financeOpsHeaders(string $userId = 'OPS-USER-01'): array
    {
        return $this->gatewayHeaders([
            'X-Actor-User-Id' => $userId,
            'X-Actor-Role' => 'FINANCE_PAYMENT_OPS',
            'X-Actor-Role-Assignment-Id' => 'ra-ops-1',
            'X-Actor-Authz-Version' => 1,
            'X-Actor-Permissions' => 'finance.policy.read,finance.ops.read,finance.mock.simulate',
        ]);
    }

    protected function customerHeaders(string $userId = 'CUST-001'): array
    {
        return $this->gatewayHeaders([
            'X-Actor-User-Id' => $userId,
            'X-Actor-Role' => 'CUSTOMER',
            'X-Actor-Role-Assignment-Id' => 'ra-cust-1',
            'X-Actor-Authz-Version' => 1,
            'X-Actor-Permissions' => 'finance.payment.read_own,finance.spay.read_self,finance.spay.withdraw_self,finance.bank.manage_self',
        ]);
    }

    protected function merchantHeaders(string $orgId = 'ORG-MERCHANT-A', string $userId = 'USER-MERCHANT-01'): array
    {
        return $this->gatewayHeaders([
            'X-Actor-User-Id' => $userId,
            'X-Actor-Role' => 'MERCHANT',
            'X-Actor-Org-Id' => $orgId,
            'X-Actor-Role-Assignment-Id' => 'ra-merch-1',
            'X-Actor-Authz-Version' => 1,
            'X-Actor-Permissions' => 'finance.spay.read_organization,finance.spay.withdraw_organization,finance.bank.manage_organization',
        ]);
    }

    protected function internalHeaders(): array
    {
        return [
            'Authorization' => 'Bearer ' . config('services.internal.service_key'),
            'X-Request-ID' => (string) Str::uuid(),
            'Accept' => 'application/json',
        ];
    }

    protected function generateValidStepUpProof(
        string $userId,
        ?string $orgId,
        string $spayAccountId,
        int $amountIdr,
        string $bankDestinationId
    ): string {
        return \App\Domain\Finance\Withdrawals\WithdrawalService::generateStepUpProof([
            'user_id' => $userId,
            'organization_id' => $orgId,
            'spay_account_id' => $spayAccountId,
            'amount_idr' => $amountIdr,
            'bank_destination_id' => $bankDestinationId,
            'purpose' => 'WITHDRAWAL',
            'expires_at' => now()->addMinutes(10)->timestamp,
        ]);
    }

    protected function createStandardActivePolicy(): void
    {
        $policyService = app(FeePolicyService::class);
        $res = $policyService->createPolicy(
            data: [
                'name' => 'Standard Product Policy',
                'slug' => 'std-prod-policy-' . Str::random(6),
                'description' => 'Standard product fee and commission',
                'change_reason' => 'Test seed',
                'targets' => [
                    [
                        'policy_code' => 'CUSTOMER_PRODUCT_APP_FEE',
                        'scope' => 'PRODUCT',
                        'payer_type' => 'CUSTOMER',
                        'fee_type' => 'FIXED',
                        'fixed_amount_idr' => 3000,
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

        $policyService->publishVersion(
            versionId: $res['version_id'],
            effectiveFrom: null,
            reason: 'Test publish',
            actorUserId: 'CEO-USER-01'
        );
    }
}
