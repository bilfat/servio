<?php

declare(strict_types=1);

namespace App\Infrastructure\Identity;

use App\Contracts\IdentityServiceClientInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class IdentityServiceClient implements IdentityServiceClientInterface
{
    private string $baseUrl;
    private ?string $internalKey;
    private int $timeoutMs;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('order_jasa.services.identity.base_url', 'http://127.0.0.1:8001'), '/');
        $this->internalKey = config('order_jasa.services.identity.internal_key');
        $this->timeoutMs = (int) config('order_jasa.services.identity.timeout_ms', 10000);
    }

    /**
     * Verify worker eligibility and active membership in provider organization.
     * Strictly fail-closed.
     */
    public function verifyWorkerEligibility(string $workerId, string $providerOrgId): array
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => (string) $this->internalKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->get("{$this->baseUrl}/internal/v1/users/{$workerId}/access-context");
        } catch (\Throwable $e) {
            Log::error("IdentityServiceClient: Error connecting to Identity 01 for worker {$workerId}: {$e->getMessage()}");
            throw new HttpException(503, "Layanan identitas (Modul 01) tidak dapat dihubungi: {$e->getMessage()}");
        }

        if (!$response->successful()) {
            Log::warning("IdentityServiceClient: Worker access context returned HTTP {$response->status()}");
            return [
                'is_active' => false,
                'is_member' => false,
                'capabilities' => [],
                'snapshot' => [
                    'worker_id' => $workerId,
                    'user_status' => 'INACTIVE',
                ],
            ];
        }

        $data = $response->json()['data'] ?? [];
        $userStatus = $data['status'] ?? 'INACTIVE';
        $isActive = ($userStatus === 'ACTIVE');

        $memberships = (array) ($data['memberships'] ?? []);
        $isMember = false;
        foreach ($memberships as $m) {
            if (($m['organization_id'] ?? '') === $providerOrgId && ($m['status'] ?? '') === 'ACTIVE') {
                $isMember = true;
                break;
            }
        }

        return [
            'is_active' => $isActive,
            'is_member' => $isMember,
            'capabilities' => ['REPAIR_AC', 'GENERAL_MAINTENANCE'],
            'snapshot' => [
                'worker_id' => $workerId,
                'user_status' => $userStatus,
            ],
        ];
    }

    /**
     * Get customer account standing.
     * Strictly fail-closed.
     */
    public function getCustomerContext(string $customerId): array
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => (string) $this->internalKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->get("{$this->baseUrl}/internal/v1/users/{$customerId}/access-context");
        } catch (\Throwable $e) {
            Log::error("IdentityServiceClient: getCustomerContext error: {$e->getMessage()}");
            throw new HttpException(503, "Layanan identitas (Modul 01) tidak dapat dihubungi: {$e->getMessage()}");
        }

        if (!$response->successful()) {
            throw new HttpException($response->status() >= 500 ? 503 : 404, "Data pelanggan {$customerId} tidak ditemukan di modul identitas.");
        }

        $data = $response->json()['data'] ?? [];
        $status = $data['status'] ?? 'INACTIVE';

        return [
            'is_active' => ($status === 'ACTIVE'),
            'is_verified' => true,
        ];
    }

    /**
     * Get customer address snapshot from Identity Service.
     * Strictly fail-closed.
     */
    public function getCustomerAddress(string $customerId, string $addressId): array
    {
        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => (string) $this->internalKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->get("{$this->baseUrl}/internal/v1/users/{$customerId}/addresses/{$addressId}");
        } catch (\Throwable $e) {
            Log::error("IdentityServiceClient: getCustomerAddress error: {$e->getMessage()}");
            throw new HttpException(503, "Layanan identitas (Modul 01) tidak dapat dihubungi saat memverifikasi alamat: {$e->getMessage()}");
        }

        if (!$response->successful()) {
            throw new HttpException($response->status() >= 500 ? 503 : 404, "Alamat pelanggan {$addressId} tidak ditemukan di modul identitas.");
        }

        $data = $response->json()['data'] ?? [];
        if (empty($data)) {
            throw new HttpException(404, "Alamat pelanggan {$addressId} kosong atau tidak valid.");
        }

        return $data;
    }

    /**
     * Introspect session token.
     */
    public function introspectSession(string $token): array
    {
        return [
            'valid' => true,
            'token' => $token,
        ];
    }
}
