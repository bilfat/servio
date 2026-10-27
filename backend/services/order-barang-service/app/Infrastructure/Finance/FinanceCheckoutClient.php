<?php

declare(strict_types=1);

namespace App\Infrastructure\Finance;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FinanceCheckoutClient
{
    private string $baseUrl;
    private ?string $internalKey;
    private int $timeoutMs;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('order.services.finance.base_url', 'http://127.0.0.1:8006'), '/');
        $this->internalKey = config('order.services.finance.internal_key');
        $this->timeoutMs = (int) config('order.services.finance.timeout_ms', 3000);
    }

    /**
     * Request official checkout quote from Finance Service 06.
     *
     * @param array{
     *   checkout_group_id: string,
     *   customer_id: string,
     *   currency: string,
     *   order_quote_revision: int,
     *   validated_by_order_service: bool,
     *   merchant_orders: array<array{
     *     merchant_order_id: string,
     *     merchant_org_id: string,
     *     product_subtotal_idr: int,
     *     shipping_customer_idr: int,
     *     discount_idr: int,
     *     discount_bearer: string
     *   }>
     * } $payload
     * @return array
     */
    public function requestCheckoutQuote(array $payload): array
    {
        if (empty($this->internalKey)) {
            throw new Exception('Kredensial Finance Service internalKey belum dikonfigurasi.', 500);
        }

        $response = Http::withHeaders([
            'X-Internal-Service-Key' => $this->internalKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ])
        ->timeout($this->timeoutMs / 1000)
        ->post("{$this->baseUrl}/internal/v1/finance/checkout-quotes", $payload);

        if (!$response->successful()) {
            $error = $response->json()['error'] ?? [];
            $code = $error['code'] ?? 'FINANCE_QUOTE_FAILED';
            $message = $error['message'] ?? 'Gagal memperoleh quote kalkulasi dari Finance Service.';
            throw new Exception("Finance Service Error [{$code}]: {$message}", $response->status());
        }

        return $response->json()['data'] ?? [];
    }

    /**
     * Get active customer fee policy from Finance Service 06.
     */
    public function getActiveCustomerFeePolicy(): ?array
    {
        if (empty($this->internalKey)) {
            return null;
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $this->internalKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])
            ->timeout(2.0)
            ->get("{$this->baseUrl}/internal/v1/finance/active-customer-fee");

            if ($response->successful()) {
                return $response->json()['data'] ?? null;
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Failed to fetch active customer fee policy from Finance: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Create single combined payment intent at Finance Service 06.
     */
    public function createPaymentIntent(
        string $checkoutGroupId,
        string $method,
        string $quotePayloadHash,
        int $orderQuoteRevision = 1
    ): array {
        if (empty($this->internalKey)) {
            throw new Exception('Kredensial Finance Service internalKey belum dikonfigurasi.', 500);
        }

        $response = Http::withHeaders([
            'X-Internal-Service-Key' => $this->internalKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ])
        ->timeout($this->timeoutMs / 1000)
        ->post("{$this->baseUrl}/internal/v1/finance/checkouts/{$checkoutGroupId}/payment-intents", [
            'method' => $method,
            'quote_payload_hash' => $quotePayloadHash,
            'order_quote_revision' => $orderQuoteRevision,
        ]);

        if (!$response->successful()) {
            $error = $response->json()['error'] ?? [];
            $code = $error['code'] ?? 'FINANCE_PAYMENT_INTENT_FAILED';
            $message = $error['message'] ?? 'Gagal membuat instruksi pembayaran di Finance Service.';
            throw new Exception("Finance Service Error [{$code}]: {$message}", $response->status());
        }

        return $response->json()['data'] ?? [];
    }

    /**
     * Query checkout status from Finance Service 06.
     * Fails closed on timeout or network error to prevent unilateral cancellation (FIX 15).
     */
    public function getCheckout(string $checkoutGroupId): ?array
    {
        if (empty($this->internalKey)) {
            throw new Exception('Kredensial Finance Service internalKey belum dikonfigurasi.', 500);
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->get("{$this->baseUrl}/internal/v1/finance/checkouts/{$checkoutGroupId}");

            if ($response->successful()) {
                $payload = $response->json();
                return $payload['data'] ?? $payload;
            }

            if ($response->status() === 404) {
                return null;
            }

            throw new Exception("Finance Service getCheckout error HTTP {$response->status()}: " . $response->body(), $response->status());
        } catch (\Throwable $e) {
            Log::warning("FinanceCheckoutClient: Failed querying checkout {$checkoutGroupId}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get payment details from Finance Service 06.
     * Fails closed on timeout or network error (FIX 15).
     */
    public function getPayment(string $paymentId): ?array
    {
        if (empty($this->internalKey)) {
            throw new Exception('Kredensial Finance Service internalKey belum dikonfigurasi.', 500);
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->get("{$this->baseUrl}/internal/v1/finance/payments/{$paymentId}");

            if ($response->successful()) {
                $payload = $response->json();
                return $payload['data'] ?? $payload;
            }

            if ($response->status() === 404) {
                return null;
            }

            throw new Exception("Finance Service getPayment error HTTP {$response->status()}: " . $response->body(), $response->status());
        } catch (\Throwable $e) {
            Log::warning("FinanceCheckoutClient: Failed getting payment {$paymentId}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Void pending payment intent at Finance Service 06.
     */
    public function voidPaymentIntent(string $paymentId): bool
    {
        if (empty($this->internalKey)) {
            throw new Exception('Kredensial Finance Service internalKey belum dikonfigurasi.', 500);
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->post("{$this->baseUrl}/internal/v1/finance/payments/{$paymentId}/void");

            return $response->successful();
        } catch (\Throwable $e) {
            Log::warning("FinanceCheckoutClient: Failed voiding payment {$paymentId}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Normalize payment/checkout status from Finance Service 06 (FIX 15).
     */
    public function extractStatus(?array $financeData): ?string
    {
        if ($financeData === null) {
            return null;
        }

        return $financeData['status'] 
            ?? $financeData['data']['status'] 
            ?? $financeData['payment_status'] 
            ?? $financeData['data']['payment_status'] 
            ?? null;
    }

    /**
     * Delegate refund to Finance Service via canonical refund route.
     * POST /internal/v1/finance/refunds/order-cancellations
     */
    public function delegateCancellationRefund(
        string $sourceEventId,
        string $merchantOrderId,
        string $checkoutGroupId,
        string $decisionSource,
        string $reasonCode,
        string $cancelledAt
    ): array {
        if (empty($this->internalKey)) {
            throw new Exception('Kredensial Finance Service internalKey belum dikonfigurasi.', 500);
        }

        $response = Http::withHeaders([
            'X-Internal-Service-Key' => $this->internalKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ])
        ->timeout($this->timeoutMs / 1000)
        ->post("{$this->baseUrl}/internal/v1/finance/refunds/order-cancellations", [
            'source_event_id' => $sourceEventId,
            'merchant_order_id' => $merchantOrderId,
            'checkout_group_id' => $checkoutGroupId,
            'order_status' => 'CANCELLED',
            'cancelled_at' => $cancelledAt,
            'decision_source' => $decisionSource,
            'reason_code' => $reasonCode,
        ]);

        if (!$response->successful()) {
            $error = $response->json()['error'] ?? [];
            $code = $error['code'] ?? 'FINANCE_REFUND_FAILED';
            $message = $error['message'] ?? 'Gagal mendelegasikan refund ke Finance Service.';
            throw new Exception("Finance Service Refund Error [{$code}]: {$message}", $response->status());
        }

        return $response->json()['data'] ?? [];
    }

    /**
     * Send Order Completed event to Finance Service (triggers 120-hour hold).
     * POST /internal/v1/finance/order-events
     */
    public function emitOrderCompleted(
        string $eventId,
        string $merchantOrderId,
        string $checkoutGroupId,
        string $completedAt,
        int $orderVersion
    ): array {
        if (empty($this->internalKey)) {
            throw new Exception('Kredensial Finance Service internalKey belum dikonfigurasi.', 500);
        }

        $response = Http::withHeaders([
            'X-Internal-Service-Key' => $this->internalKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ])
        ->timeout($this->timeoutMs / 1000)
        ->post("{$this->baseUrl}/internal/v1/finance/order-events", [
            'event_id' => $eventId,
            'event_type' => 'ORDER_COMPLETED',
            'merchant_order_id' => $merchantOrderId,
            'payload' => [
                'checkout_group_id' => $checkoutGroupId,
                'completed_at' => $completedAt,
                'order_version' => $orderVersion,
            ],
        ]);

        if (!$response->successful()) {
            $error = $response->json()['error'] ?? [];
            $code = $error['code'] ?? 'FINANCE_EVENT_FAILED';
            $message = $error['message'] ?? 'Gagal mengirim event ORDER_COMPLETED ke Finance Service.';
            throw new Exception("Finance Event Error [{$code}]: {$message}", $response->status());
        }

        return $response->json()['data'] ?? [];
    }

    /**
     * Send Order Hold Changed event to Finance Service.
     */
    public function emitOrderHoldChanged(
        string $eventId,
        string $merchantOrderId,
        bool $isHoldActive,
        string $reasonCode,
        int $orderVersion
    ): array {
        if (empty($this->internalKey)) {
            throw new Exception('Kredensial Finance Service internalKey belum dikonfigurasi.', 500);
        }

        $response = Http::withHeaders([
            'X-Internal-Service-Key' => $this->internalKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ])
        ->timeout($this->timeoutMs / 1000)
        ->post("{$this->baseUrl}/internal/v1/finance/order-events", [
            'event_id' => $eventId,
            'event_type' => 'ORDER_HOLD_CHANGED',
            'merchant_order_id' => $merchantOrderId,
            'payload' => [
                'is_hold_active' => $isHoldActive,
                'hold_reason_code' => $reasonCode,
                'order_version' => $orderVersion,
            ],
        ]);

        return $response->json()['data'] ?? [];
    }

    /**
     * Query refund information by merchant order id from Finance Service 06.
     */
    public function getRefundByOrder(string $merchantOrderId): ?array
    {
        if (empty($this->internalKey)) {
            return null;
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->get("{$this->baseUrl}/internal/v1/finance/refunds/by-order/{$merchantOrderId}");

            if ($response->successful()) {
                $payload = $response->json();
                return $payload['data'] ?? $payload;
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning("FinanceCheckoutClient: Failed querying refund for order {$merchantOrderId}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Query held fund and settlement information by merchant order id from Finance Service 06.
     */
    public function getHeldFundByOrder(string $merchantOrderId): ?array
    {
        if (empty($this->internalKey)) {
            return null;
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->get("{$this->baseUrl}/internal/v1/finance/held-funds/by-order/{$merchantOrderId}");

            if ($response->successful()) {
                $payload = $response->json();
                return $payload['data'] ?? $payload;
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning("FinanceCheckoutClient: Failed querying held fund for order {$merchantOrderId}: " . $e->getMessage());
            return null;
        }
    }
}

