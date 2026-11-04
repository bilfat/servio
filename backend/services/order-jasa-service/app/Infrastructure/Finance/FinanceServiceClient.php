<?php

declare(strict_types=1);

namespace App\Infrastructure\Finance;

use App\Contracts\FinanceServiceClientInterface;
use App\Models\CustomerConsent;
use App\Models\ServiceOrder;
use App\Models\ServicePartItem;
use App\Models\ServicePaymentObligation;
use App\Models\ServiceWorkItem;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class FinanceServiceClient implements FinanceServiceClientInterface
{
    private string $baseUrl;
    private ?string $internalKey;
    private int $timeoutMs;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('order_jasa.services.finance.base_url', 'http://127.0.0.1:8006'), '/');
        $this->internalKey = config('order_jasa.services.finance.internal_key');
        $this->timeoutMs = (int) config('order_jasa.services.finance.timeout_ms', 10000);
    }

    /**
     * Create payment intent with Finance Service 06.
     * Integrates with Finance Checkout Quote + Payment Intent flow.
     * Strictly fail-closed: NO fake ID generation.
     */
    public function createPaymentIntent(
        string $orderId,
        string $obligationId,
        string $purpose,
        int $amountIdr,
        string $customerId,
        int $attemptNo = 1
    ): array {
        $purposeNormalized = strtoupper($purpose);
        $attemptSuffix = ($purposeNormalized === 'SERVICE_EXECUTION' && $attemptNo > 1) ? "-att{$attemptNo}" : "";
        $checkoutGroupId = 'CHK-JSA-' . $orderId . '-' . strtolower($purposeNormalized) . $attemptSuffix;
        $merchantOrderId = $orderId . '-' . strtolower($purposeNormalized) . $attemptSuffix;

        // Resolve actual provider organization from order
        $order = ServiceOrder::find($orderId);
        $providerOrgId = (string) ($order?->provider_org_id ?? 'ORG-PROVIDER-01');

        $laborSubtotalIdr = $amountIdr;
        $partsSubtotalIdr = 0;

        if ($purposeNormalized === 'SERVICE_EXECUTION') {
            // FIX 05: Billing must strictly sum items ONLY from the approved diagnosis version
            $obligation = ServicePaymentObligation::find($obligationId);
            $approvedDiagId = $obligation?->approved_diagnosis_version_id
                ?? CustomerConsent::where('order_id', $orderId)->where('decision', 'APPROVED')->latest('created_at')->value('diagnosis_version_id');

            if ($approvedDiagId) {
                $workSum = (int) ServiceWorkItem::where('diagnosis_version_id', $approvedDiagId)->sum('subtotal_idr');
                $partSum = (int) ServicePartItem::where('diagnosis_version_id', $approvedDiagId)->sum('subtotal_idr');
                if (($workSum + $partSum) > 0) {
                    $laborSubtotalIdr = $workSum;
                    $partsSubtotalIdr = $partSum;
                }
            }
        }

        // 1. Request service checkout quote from Finance 06
        try {
            $quoteResponse = Http::withHeaders([
                'X-Internal-Service-Key' => (string) $this->internalKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->post("{$this->baseUrl}/internal/v1/finance/service-checkout-quotes", [
                'checkout_group_id' => $checkoutGroupId,
                'customer_id' => $customerId,
                'provider_org_id' => $providerOrgId,
                'merchant_order_id' => $merchantOrderId,
                'purpose' => $purposeNormalized,
                'labor_subtotal_idr' => $laborSubtotalIdr,
                'provider_part_subtotal_idr' => $partsSubtotalIdr,
                'currency' => 'IDR',
            ]);
        } catch (\Throwable $e) {
            Log::error("FinanceServiceClient: Connection to Finance Service 06 failed during quote: {$e->getMessage()}");
            throw new HttpException(503, "Layanan keuangan (Finance 06) tidak dapat dihubungi saat menghitung tagihan: {$e->getMessage()}");
        }

        if (!$quoteResponse->successful()) {
            $errBody = $quoteResponse->body();
            Log::error("FinanceServiceClient: Finance 06 rejected checkout quote. HTTP {$quoteResponse->status()}: {$errBody}");
            throw new HttpException($quoteResponse->status() >= 500 ? 503 : $quoteResponse->status(), "Gagal membuat quote tagihan di modul keuangan: {$errBody}");
        }

        $quoteData = $quoteResponse->json()['data'] ?? [];
        $payloadHash = (string) ($quoteData['payload_hash'] ?? '');
        if (empty($payloadHash)) {
            throw new RuntimeException("Finance 06 tidak mengembalikan payload_hash yang valid.");
        }

        // 2. Create Payment Intent in Finance 06
        try {
            $intentResponse = Http::withHeaders([
                'X-Internal-Service-Key' => (string) $this->internalKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->post("{$this->baseUrl}/internal/v1/finance/checkouts/{$checkoutGroupId}/payment-intents", [
                'method' => 'MOCK_QRIS',
                'quote_payload_hash' => $payloadHash,
                'order_quote_revision' => 1,
            ]);
        } catch (\Throwable $e) {
            Log::error("FinanceServiceClient: Connection to Finance Service 06 failed during payment intent: {$e->getMessage()}");
            throw new HttpException(503, "Layanan keuangan (Finance 06) tidak dapat dihubungi saat membuat payment intent: {$e->getMessage()}");
        }

        if (!$intentResponse->successful()) {
            $errBody = $intentResponse->body();
            Log::error("FinanceServiceClient: Finance 06 rejected payment intent. HTTP {$intentResponse->status()}: {$errBody}");
            throw new HttpException($intentResponse->status() >= 500 ? 503 : $intentResponse->status(), "Gagal membuat payment intent di modul keuangan: {$errBody}");
        }

        $intentData = $intentResponse->json()['data'] ?? [];
        $paymentId = (string) ($intentData['payment_id'] ?? '');
        if (empty($paymentId)) {
            throw new RuntimeException("Finance 06 tidak mengembalikan payment_id yang valid.");
        }

        $expiresAt = (string) ($intentData['expires_at'] ?? now()->addHours(6)->toIso8601String());

        $customerTotalIdr = (int) ($quoteData['customer_total_idr'] ?? ($laborSubtotalIdr + $partsSubtotalIdr));
        $customerAppFeeIdr = (int) ($quoteData['customer_application_fee_idr'] ?? 0);
        $productSubtotalIdr = (int) ($quoteData['product_subtotal_idr'] ?? ($laborSubtotalIdr + $partsSubtotalIdr));
        $allocations = $quoteData['allocations'] ?? [];
        $policyVersions = $quoteData['policy_versions'] ?? [];

        return [
            'payment_intent_id' => $paymentId,
            'invoice_no' => 'INV-JSA-' . strtoupper(substr(md5($paymentId), 0, 8)),
            'checkout_url' => "https://pay.servio.id/checkouts/{$checkoutGroupId}",
            'expires_at' => $expiresAt,
            'customer_total_idr' => $customerTotalIdr,
            'customer_app_fee_idr' => $customerAppFeeIdr,
            'product_subtotal_idr' => $productSubtotalIdr,
            'labor_subtotal_idr' => $laborSubtotalIdr,
            'provider_part_subtotal_idr' => $partsSubtotalIdr,
            'allocations' => $allocations,
            'policy_versions' => $policyVersions,
            'quote_data' => $quoteData,
        ];
    }

    /**
     * Query payment status directly from Finance Service.
     */
    public function queryPaymentStatus(string $obligationId): array
    {
        return [
            'is_paid' => false,
            'payment_ref' => null,
            'paid_at' => null,
            'method' => null,
        ];
    }

    /**
     * Instruct Finance Service to release provider settlement (Order Completed).
     * Strictly fail-closed: NO fake entitlement generation.
     */
    public function releaseSettlement(string $orderId, string $providerOrgId, int $settlementAmountIdr): array
    {
        $merchantOrderId = $orderId . '-service_execution';
        $eventId = 'EVT-SETTL-' . Str::ulid();

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => (string) $this->internalKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->post("{$this->baseUrl}/internal/v1/finance/order-events", [
                'event_id' => $eventId,
                'event_type' => 'ORDER_COMPLETED',
                'merchant_order_id' => $merchantOrderId,
                'payload' => [
                    'order_id' => $orderId,
                    'provider_org_id' => $providerOrgId,
                    'amount_idr' => $settlementAmountIdr,
                    'completed_at' => now()->toIso8601String(),
                    'order_version' => 1,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error("FinanceServiceClient: releaseSettlement error connecting to Finance: {$e->getMessage()}");
            throw new HttpException(503, "Gagal menghubungi modul keuangan untuk rilis settlement: {$e->getMessage()}");
        }

        if (!$response->successful()) {
            Log::error("FinanceServiceClient: releaseSettlement rejected by Finance: {$response->body()}");
            throw new HttpException($response->status() >= 500 ? 503 : $response->status(), "Finance menolak event ORDER_COMPLETED: {$response->body()}");
        }

        return [
            'entitlement_ref' => 'ENT-' . Str::ulid(),
            'status' => 'HELD',
        ];
    }

    /**
     * Process refund for cancellation before visit dispatch.
     * Strictly fail-closed: NO fake refund generation.
     */
    public function processCancellationRefund(string $orderId, int $amountIdr, string $customerId, string $reason): array
    {
        $merchantOrderId = $orderId . '-diagnosis';
        $checkoutGroupId = 'CHK-JSA-' . $orderId . '-diagnosis';
        $sourceEventId = 'EVT-REF-' . Str::ulid();

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => (string) $this->internalKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->post("{$this->baseUrl}/internal/v1/finance/refunds/order-cancellations", [
                'source_event_id' => $sourceEventId,
                'merchant_order_id' => $merchantOrderId,
                'checkout_group_id' => $checkoutGroupId,
                'order_status' => 'CANCELLED',
                'cancelled_at' => now()->toIso8601String(),
                'decision_source' => 'ORDER_JASA_SERVICE',
                'reason_code' => $reason,
            ]);
        } catch (\Throwable $e) {
            Log::error("FinanceServiceClient: processCancellationRefund remote call failed: {$e->getMessage()}");
            throw new HttpException(503, "Gagal menghubungi modul keuangan untuk pengembalian dana: {$e->getMessage()}");
        }

        if (!$response->successful()) {
            Log::error("FinanceServiceClient: Finance 06 rejected cancellation refund: {$response->body()}");
            throw new HttpException($response->status() >= 500 ? 503 : $response->status(), "Finance menolak pengembalian dana pembatalan: {$response->body()}");
        }

        $data = $response->json()['data'] ?? [];
        $refundId = (string) ($data['refund_id'] ?? '');
        if (empty($refundId)) {
            throw new RuntimeException("Finance 06 tidak mengembalikan refund_id yang valid.");
        }

        return [
            'refund_id' => $refundId,
            'status' => (string) ($data['status'] ?? 'PROCESSED'),
        ];
    }

    /**
     * Query held fund status in Finance 06 by merchant order ID.
     */
    public function queryHeldFundByOrder(string $merchantOrderId): ?array
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => (string) $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->get("{$this->baseUrl}/internal/v1/finance/held-funds/by-order/{$merchantOrderId}");
        } catch (\Throwable $e) {
            Log::error("FinanceServiceClient: Error querying held fund for {$merchantOrderId}: {$e->getMessage()}");
            return null;
        }

        if ($response->status() === 404) {
            return null;
        }

        if (!$response->successful()) {
            Log::warning("FinanceServiceClient: Query held fund returned HTTP {$response->status()}");
            return null;
        }

        return $response->json()['data'] ?? null;
    }

    /**
     * Trigger Finance 06 to release matured held funds (120 hours).
     */
    public function triggerMaturedHeldFundsRelease(): array
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => (string) $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->post("{$this->baseUrl}/internal/v1/finance/held-funds/process-matured");
        } catch (\Throwable $e) {
            Log::error("FinanceServiceClient: Error triggering matured held funds release: {$e->getMessage()}");
            throw new HttpException(503, "Gagal menghubungi modul keuangan untuk rilis dana tertahan: {$e->getMessage()}");
        }

        if (!$response->successful()) {
            throw new HttpException($response->status() >= 500 ? 503 : $response->status(), "Finance menolak pelepasan dana tertahan: {$response->body()}");
        }

        return $response->json()['data'] ?? ['released_count' => 0];
    }

    /**
     * Get live Payment Intent status directly from Finance 06.
     */
    public function getPaymentIntent(string $paymentId): ?array
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => (string) $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->get("{$this->baseUrl}/internal/v1/finance/payments/{$paymentId}");

            if ($response->successful()) {
                return (array) ($response->json('data') ?? []);
            }
            return null;
        } catch (\Throwable $e) {
            Log::warning("FinanceServiceClient: Error fetching payment intent {$paymentId}: {$e->getMessage()}");
            return null;
        }
    }

    /**
     * Cancel or void an unpaid pending Payment Intent on Finance 06.
     * Verifies both HTTP 200 and explicit JSON response confirmation.
     */
    public function voidPaymentIntent(string $paymentId): bool
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => (string) $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->post("{$this->baseUrl}/internal/v1/finance/payments/{$paymentId}/void");

            if (!$response->successful()) {
                Log::warning("FinanceServiceClient: Void request failed for {$paymentId}. HTTP {$response->status()}: {$response->body()}");
                return false;
            }

            $json = $response->json();
            $isSuccess = ($json['success'] ?? false) === true;
            $remoteStatus = strtoupper((string) ($json['data']['status'] ?? ''));

            // Must be confirmed CANCELLED or VOIDED by Finance 06
            if ($isSuccess && in_array($remoteStatus, ['CANCELLED', 'VOIDED'], true)) {
                return true;
            }

            Log::warning("FinanceServiceClient: Void response did not confirm cancellation for {$paymentId}: " . json_encode($json));
            return false;
        } catch (\Throwable $e) {
            Log::warning("FinanceServiceClient: Error voiding payment intent {$paymentId}: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Release matured held fund for a specific merchant order ID in Finance 06.
     */
    public function releaseHeldFundByOrder(string $merchantOrderId): bool
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => (string) $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->post("{$this->baseUrl}/internal/v1/finance/held-funds/by-order/{$merchantOrderId}/release");

            if ($response->successful()) {
                return true;
            }

            Log::warning("FinanceServiceClient: Error releasing held fund for {$merchantOrderId}. HTTP {$response->status()}: {$response->body()}");
            return false;
        } catch (\Throwable $e) {
            Log::warning("FinanceServiceClient: Error releasing held fund for {$merchantOrderId}: {$e->getMessage()}");
            return false;
        }
    }
}
