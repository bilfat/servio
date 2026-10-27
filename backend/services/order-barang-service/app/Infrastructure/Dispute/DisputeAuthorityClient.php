<?php

declare(strict_types=1);

namespace App\Infrastructure\Dispute;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DisputeAuthorityClient
{
    private string $baseUrl;
    private ?string $internalKey;
    private int $timeoutMs;
    private string $contractStatus;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('order.services.dispute.base_url', 'http://127.0.0.1:8007'), '/');
        $this->internalKey = config('order.services.dispute.internal_key');
        $this->timeoutMs = (int) config('order.services.dispute.timeout_ms', 2500);
        $this->contractStatus = (string) config('order.services.dispute.contract_status', 'PENDING_CONTRACT');
    }

    /**
     * Check dispute & complaint status with authoritative After-Sales / Dispute service (FIX 19).
     *
     * @return array{
     *   status: string, // 'CLEAR', 'ACTIVE_DISPUTE', 'ACTIVE_COMPLAINT', 'PENDING_DISPUTE_AUTHORITY'
     *   has_active_dispute: bool,
     *   has_active_complaint: bool,
     *   contract_available: bool,
     *   authority_source: string,
     *   message: string
     * }
     */
    public function verifyDisputeClearance(string $orderId): array
    {
        // Authoritative DEMO_CLEAR mode for E2E verified staging without external service 07
        if ($this->contractStatus === 'DEMO_CLEAR' || $this->contractStatus === 'LOCAL_CLEAR') {
            return [
                'status' => 'CLEAR',
                'has_active_dispute' => false,
                'has_active_complaint' => false,
                'contract_available' => true,
                'authority_source' => 'AFTERSALES_07_DEMO',
                'message' => 'Pesanan dinyatakan bebas sengketa dan komplain oleh otoritas sah (mode demo otoritatif).',
            ];
        }

        // Fail-closed if dispute authority contract is not fulfilled or marked pending
        if ($this->contractStatus === 'PENDING_CONTRACT') {
            return [
                'status' => 'PENDING_DISPUTE_AUTHORITY',
                'has_active_dispute' => false,
                'has_active_complaint' => false,
                'contract_available' => false,
                'authority_source' => 'DISPUTE_AUTHORITY_NONE',
                'message' => 'PENDING_DISPUTE_AUTHORITY: Kontrak integrasi otoritas dispute/komplain belum tersedia secara resmi.',
            ];
        }

        if (empty($this->internalKey)) {
            return [
                'status' => 'PENDING_DISPUTE_AUTHORITY',
                'has_active_dispute' => false,
                'has_active_complaint' => false,
                'contract_available' => false,
                'authority_source' => 'DISPUTE_AUTHORITY_NONE',
                'message' => 'PENDING_DISPUTE_AUTHORITY: Kredensial internal dispute authority belum dikonfigurasi.',
            ];
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->get("{$this->baseUrl}/internal/v1/after-sales/orders/{$orderId}/dispute-status");

            if ($response->successful()) {
                $payload = $response->json();
                $data = $payload['data'] ?? $payload;

                $hasDispute = (bool) ($data['has_active_dispute'] ?? false);
                $hasComplaint = (bool) ($data['has_active_complaint'] ?? false);

                if ($hasDispute) {
                    return [
                        'status' => 'ACTIVE_DISPUTE',
                        'has_active_dispute' => true,
                        'has_active_complaint' => $hasComplaint,
                        'contract_available' => true,
                        'authority_source' => 'AFTERSALES_07',
                        'message' => 'Pesanan memiliki sengketa aktif di After-Sales / Dispute.',
                    ];
                }

                if ($hasComplaint) {
                    return [
                        'status' => 'ACTIVE_COMPLAINT',
                        'has_active_dispute' => false,
                        'has_active_complaint' => true,
                        'contract_available' => true,
                        'authority_source' => 'AFTERSALES_07',
                        'message' => 'Pesanan memiliki komplain aktif di After-Sales / Dispute.',
                    ];
                }

                return [
                    'status' => 'CLEAR',
                    'has_active_dispute' => false,
                    'has_active_complaint' => false,
                    'contract_available' => true,
                    'authority_source' => 'AFTERSALES_07',
                    'message' => 'Pesanan dinyatakan bebas sengketa dan komplain oleh otoritas sah.',
                ];
            }

            Log::warning("DisputeAuthorityClient: Non-successful status {$response->status()} for order {$orderId}");
            return [
                'status' => 'PENDING_DISPUTE_AUTHORITY',
                'has_active_dispute' => false,
                'has_active_complaint' => false,
                'contract_available' => true,
                'authority_source' => 'AFTERSALES_07',
                'message' => 'Dispute authority returned non-200 HTTP status: ' . $response->status(),
            ];
        } catch (\Throwable $e) {
            Log::warning("DisputeAuthorityClient: Failed querying dispute status for order {$orderId}: " . $e->getMessage());
            return [
                'status' => 'PENDING_DISPUTE_AUTHORITY',
                'has_active_dispute' => false,
                'has_active_complaint' => false,
                'contract_available' => true,
                'authority_source' => 'AFTERSALES_07',
                'message' => 'Timeout or network failure querying dispute authority: ' . $e->getMessage(),
            ];
        }
    }
}
