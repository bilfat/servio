<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Interface contract for S2S financial communication with Finance Service (Port 8006).
 * Formalized for Prompt 02 integration while keeping feature_gates.finance_service_payment fail-closed in Prompt 01.
 */
interface FinanceServiceClientInterface
{
    /**
     * Request creation of payment intent / invoice for a specific service obligation.
     *
     * @param string $orderId
     * @param string $obligationId ULID of service_payment_obligations
     * @param string $purpose DIAGNOSIS | SERVICE | PARTS
     * @param int $amountIdr Integer amount in IDR
     * @param string $customerId
     * @param int $attemptNo Monotonically increasing attempt number (1, 2, 3...)
     * @return array{payment_intent_id: string, invoice_no: string, checkout_url: string, expires_at: string}
     */
    public function createPaymentIntent(
        string $orderId,
        string $obligationId,
        string $purpose,
        int $amountIdr,
        string $customerId,
        int $attemptNo = 1
    ): array;

    /**
     * Get live Payment Intent status directly from Finance 06.
     *
     * @param string $paymentId
     * @return array{payment_id: string, status: string, amount_idr: int, expires_at: ?string}|null
     */
    public function getPaymentIntent(string $paymentId): ?array;

    /**
     * Cancel or void an unpaid pending Payment Intent on Finance 06.
     *
     * @param string $paymentId
     * @return bool
     */
    public function voidPaymentIntent(string $paymentId): bool;

    /**
     * Verify payment status directly with Finance S2S if webhook is delayed.
     *
     * @param string $obligationId
     * @return array{is_paid: bool, payment_ref: ?string, paid_at: ?string, method: ?string}
     */
    public function queryPaymentStatus(string $obligationId): array;

    /**
     * Instruct Finance to release provider settlement upon order completion.
     *
     * @param string $orderId
     * @param string $providerOrgId
     * @param int $settlementAmountIdr
     * @return array{entitlement_ref: string, status: string}
     */
    public function releaseSettlement(string $orderId, string $providerOrgId, int $settlementAmountIdr): array;

    /**
     * Process refund to customer S-Pay account upon order cancellation.
     *
     * @param string $orderId
     * @param int $amountIdr
     * @param string $customerId
     * @param string $reason
     * @return array{refund_id: string, status: string}
     */
    public function processCancellationRefund(
        string $orderId,
        int $amountIdr,
        string $customerId,
        string $reason
    ): array;

    /**
     * Query held fund status in Finance 06 by merchant order ID.
     */
    public function queryHeldFundByOrder(string $merchantOrderId): ?array;

    /**
     * Trigger Finance 06 to release matured held funds (120 hours).
     */
    public function triggerMaturedHeldFundsRelease(): array;

    /**
     * Release matured held fund for a specific merchant order ID in Finance 06.
     */
    public function releaseHeldFundByOrder(string $merchantOrderId): bool;
}

