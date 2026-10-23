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
        $this->internalKey = config('services.category.internal_key', env('CATEGORY_M2M_KEY_SERVICE', 'test_m2m_key_service_service_2026'));
        $this->timeout = (float) config('services.category.timeout_ms', env('SERVICE_CATEGORY_TIMEOUT_MS', 1500)) / 1000.0;
    }

    public static function fake(?Closure $callback = null): void
    {
        static::$fakeHandler = $callback ?: function (string $action, array $params) {
            if ($action === 'checkEligibility') {
                return [
                    'exists' => true,
                    'node_type' => $params['node_type'] ?? 'CATEGORY',
                    'node_id' => $params['node_id'] ?? 'node-1',
                    'master_code' => 'JASA',
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

    public function checkEligibility(string $nodeType, string $nodeId, string $operation = 'NEW_ASSIGNMENT'): ?array
    {
        if (static::$fakeHandler !== null) {
            return (static::$fakeHandler)('checkEligibility', [
                'node_type' => $nodeType,
                'node_id' => $nodeId,
                'operation' => $operation,
            ]);
        }

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->internalKey,
                    'X-Internal-Service-Key' => $this->internalKey,
                    'X-Consumer-Service' => 'service-offering-service',
                    'Accept' => 'application/json',
                    'X-Request-ID' => request()->header('X-Request-ID', (string) \Illuminate\Support\Str::uuid()),
                ])
                ->post("{$this->baseUrl}/internal/v1/taxonomy/eligibility/check", [
                    'node_type' => $nodeType,
                    'node_id' => $nodeId,
                    'operation' => $operation,
                ]);

            if ($response->successful()) {
                return $response->json('data');
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning('Category checkEligibility failed: ' . $e->getMessage());
            return null;
        }
    }

    public function storeReferenceClaim(
        string $consumerReferenceId,
        string $nodeType,
        string $nodeId,
        string $operationId
    ): ?array {
        if (static::$fakeHandler !== null) {
            return (static::$fakeHandler)('storeReferenceClaim', [
                'consumer_reference_id' => $consumerReferenceId,
                'node_type' => $nodeType,
                'node_id' => $nodeId,
                'operation_id' => $operationId,
            ]);
        }

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->internalKey,
                    'X-Internal-Service-Key' => $this->internalKey,
                    'X-Consumer-Service' => 'service-offering-service',
                    'Accept' => 'application/json',
                    'X-Request-ID' => request()->header('X-Request-ID', (string) \Illuminate\Support\Str::uuid()),
                ])
                ->post("{$this->baseUrl}/internal/v1/taxonomy/reference-claims", [
                    'consumer_service' => 'service-offering-service',
                    'consumer_reference_id' => $consumerReferenceId,
                    'node_type' => $nodeType,
                    'node_id' => $nodeId,
                    'operation_id' => $operationId,
                ]);

            if ($response->successful()) {
                return $response->json('data');
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning('Category storeReferenceClaim failed: ' . $e->getMessage());
            return null;
        }
    }
}
