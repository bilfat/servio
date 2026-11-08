<?php

declare(strict_types=1);

namespace App\Infrastructure\Finance;

use App\Contracts\FinanceServiceClientInterface;
use Illuminate\Support\Str;

class FakeFinanceServiceClient implements FinanceServiceClientInterface
{
    public int $defaultCustomerFee = 0;
    public int $defaultProviderCommission = 0;

    public function createPaymentIntent(
        string $orderId,
        string $obligationId,
        string $purpose,
        int $amountIdr,
        string $customerId,
        int $attemptNo = 1,
        string $method = 'QRIS'
    ): array {
        $simulatedPaymentId = 'PAY-' . Str::ulid();
        $invoiceNo = 'INV-JSA-' . strtoupper(Str::random(8));
        $attemptSuffix = ($attemptNo > 1) ? "-att{$attemptNo}" : "";

        $customerAppFee = $this->defaultCustomerFee;
        $customerTotal = $amountIdr + $customerAppFee;

        return [
            'payment_intent_id' => $simulatedPaymentId,
            'invoice_no' => $invoiceNo,
            'checkout_url' => "https://pay.servio.id/checkouts/CHK-JSA-{$orderId}-" . strtolower($purpose) . $attemptSuffix,
            'expires_at' => now()->addHours(6)->toIso8601String(),
            'customer_total_idr' => $customerTotal,
            'customer_app_fee_idr' => $customerAppFee,
            'product_subtotal_idr' => $amountIdr,
            'labor_subtotal_idr' => $amountIdr,
            'provider_part_subtotal_idr' => 0,
            'allocations' => [
                [
                    'merchant_commission_idr' => $this->defaultProviderCommission,
                    'merchant_net_entitlement_idr' => max(0, $amountIdr - $this->defaultProviderCommission),
                ]
            ],
            'policy_versions' => [
                'customer_app_fee_policy_name' => $customerAppFee > 0 ? 'Kebijakan Layanan & Komisi Servis Jasa 2026' : null,
                'customer_app_fee_version' => $customerAppFee > 0 ? 1 : null,
                'provider_commission_policy_name' => $this->defaultProviderCommission > 0 ? 'Komisi Platform Layanan Jasa' : null,
                'merchant_commission_version' => $this->defaultProviderCommission > 0 ? 1 : null,
            ],
        ];
    }

    public function getPaymentIntent(string $paymentId): ?array
    {
        return [
            'payment_id' => $paymentId,
            'status' => 'PENDING',
            'amount_idr' => 100000,
            'expires_at' => now()->addHours(6)->toIso8601String(),
        ];
    }

    public function voidPaymentIntent(string $paymentId): bool
    {
        return true;
    }

    public function releaseHeldFundByOrder(string $merchantOrderId): bool
    {
        return true;
    }

    public function queryPaymentStatus(string $obligationId): array
    {
        return [
            'is_paid' => false,
            'payment_ref' => null,
            'paid_at' => null,
            'method' => null,
        ];
    }

    public function releaseSettlement(string $orderId, string $providerOrgId, int $settlementAmountIdr): array
    {
        return [
            'entitlement_ref' => 'ENT-' . Str::ulid(),
            'status' => 'HELD',
        ];
    }

    public function processCancellationRefund(string $orderId, int $amountIdr, string $customerId, string $reason): array
    {
        return [
            'refund_id' => 'REF-' . Str::ulid(),
            'status' => 'PROCESSED',
        ];
    }

    public function queryHeldFundByOrder(string $merchantOrderId): ?array
    {
        return [
            'merchant_order_id' => $merchantOrderId,
            'status' => 'RELEASED_TO_SPAY',
            'gross_held_idr' => 100000,
            'merchant_entitlement_idr' => 100000,
        ];
    }

    public function triggerMaturedHeldFundsRelease(): array
    {
        return [
            'released_count' => 1,
        ];
    }
}

