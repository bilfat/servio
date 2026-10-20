<?php

namespace App\Infrastructure\Category;

use Closure;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CategoryServiceClient
{
    protected string $baseUrl;
    protected ?string $internalKey;
    protected float $timeout;

    /**
     * Optional fake callback for testing without live network
     */
    protected static ?Closure $fakeHandler = null;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.category.base_url', env('CATEGORY_INTERNAL_BASE_URL', 'http://localhost:8002')), '/');
        $this->internalKey = config('services.category.internal_key', env('CATEGORY_M2M_KEY_PRODUCT_SERVICE', 'test_m2m_key_product_service_2026'));
        $this->timeout = (float) config('services.category.timeout_ms', env('PRODUCT_CATEGORY_TIMEOUT_MS', 1500)) / 1000.0;
    }

    public static function fake(?Closure $callback = null): void
    {
        static::$fakeHandler = $callback ?: function (string $action, array $params) {
            if ($action === 'checkEligibility') {
                return [
                    'exists' => true,
                    'node_type' => $params['node_type'] ?? 'CATEGORY',
                    'node_id' => $params['node_id'] ?? 'node-1',
                    'master_code' => 'PRODUK',
                    'stored_status' => 'ACTIVE',
                    'effective_active' => true,
                    'eligibility_version' => 1,
                    'claim_required_for_safe_reference' => true,
                ];
            }
            if ($action === 'storeReferenceClaim') {
                return [
                    'claim_id' => 'claim-' . uniqid(),
                    'node_type' => $params['node_type'] ?? 'CATEGORY',
                    'node_id' => $params['node_id'] ?? 'node-1',
                    'state' => 'ACTIVE',
                ];
            }
            if ($action === 'getTree') {
                return [];
            }
            return null;
        };
    }

    public static function resetFake(): void
    {
        static::$fakeHandler = null;
    }

    protected function getInternalHeaders(): array
    {
        return [
            'X-Internal-Service-Key' => $this->internalKey,
            'X-Consumer-Service' => 'product-service',
            'Accept' => 'application/json',
        ];
    }

    public function checkEligibility(string $nodeType, string $nodeId, string $operation = 'NEW_ASSIGNMENT'): ?array
    {
        if (static::$fakeHandler) {
            $result = (static::$fakeHandler)('checkEligibility', [
                'node_type' => $nodeType,
                'node_id' => $nodeId,
                'operation' => $operation,
            ]);
            if ($result !== null) {
                return $result;
            }
        }

        try {
            $response = Http::withHeaders($this->getInternalHeaders())
                ->timeout($this->timeout)
                ->post("{$this->baseUrl}/internal/v1/taxonomy/eligibility/check", [
                    'node_type' => strtoupper($nodeType),
                    'node_id' => $nodeId,
                    'operation' => $operation,
                ]);

            if ($response->successful()) {
                return $response->json()['data'] ?? null;
            }

            Log::warning('Category eligibility check returned non-200', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Category eligibility check failed: ' . $e->getMessage());
        }

        return null;
    }

    public function storeReferenceClaim(string $nodeType, string $nodeId, string $consumerReferenceId, ?string $operationId = null): ?array
    {
        if (static::$fakeHandler) {
            $result = (static::$fakeHandler)('storeReferenceClaim', [
                'node_type' => $nodeType,
                'node_id' => $nodeId,
                'consumer_reference_id' => $consumerReferenceId,
                'operation_id' => $operationId,
            ]);
            if ($result !== null) {
                return $result;
            }
        }

        try {
            $response = Http::withHeaders($this->getInternalHeaders())
                ->timeout($this->timeout)
                ->post("{$this->baseUrl}/internal/v1/taxonomy/reference-claims", [
                    'consumer_service' => 'product-service',
                    'consumer_reference_id' => $consumerReferenceId,
                    'node_type' => strtoupper($nodeType),
                    'node_id' => $nodeId,
                    'operation_id' => $operationId,
                ]);

            if ($response->successful()) {
                return $response->json()['data'] ?? null;
            }

            Log::warning('Category reference claim returned non-200', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Category reference claim failed: ' . $e->getMessage());
        }

        return null;
    }

    public function getTree(?string $master = null, bool $includeInactive = false): ?array
    {
        if (static::$fakeHandler) {
            $result = (static::$fakeHandler)('getTree', [
                'master' => $master,
                'include_inactive' => $includeInactive,
            ]);
            if ($result !== null) {
                return $result;
            }
        }

        try {
            $response = Http::withHeaders($this->getInternalHeaders())
                ->timeout($this->timeout)
                ->get("{$this->baseUrl}/internal/v1/taxonomy/tree", [
                    'master' => $master,
                    'include_inactive' => $includeInactive ? 'true' : 'false',
                ]);

            if ($response->successful()) {
                return $response->json()['data']['tree'] ?? null;
            }
        } catch (\Throwable $e) {
            Log::warning('Category getTree failed: ' . $e->getMessage());
        }

        return null;
    }
}
