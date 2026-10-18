<?php

namespace App\Infrastructure\Identity;

use Closure;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IdentityServiceClient
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
        $this->baseUrl = rtrim((string) config('services.identity.base_url', env('IDENTITY_INTERNAL_BASE_URL', 'http://localhost:8001')), '/');
        $this->internalKey = config('services.identity.internal_key', env('CATEGORY_INTERNAL_SERVICE_KEY'));
        $this->timeout = (float) config('services.identity.timeout_ms', env('CATEGORY_REFERENCE_CHECK_TIMEOUT_MS', 1500)) / 1000.0;
    }

    /**
     * Set a fake handler for testing
     */
    public static function fake(?Closure $callback = null): void
    {
        static::$fakeHandler = $callback ?: function (string $action, array $params) {
            if ($action === 'evaluateAuthorization') {
                return [
                    'allow' => true,
                    'reason_code' => 'AUTHORIZED',
                    'authz_version' => 1,
                ];
            }
            if ($action === 'introspectSession') {
                return [
                    'active' => true,
                    'user_id' => $params['session_reference'] ?? 'test-user',
                    'role_code' => 'CUSTOMER',
                    'authz_version' => 1,
                ];
            }
            if ($action === 'getOrganizationStatus') {
                return [
                    'id' => $params['organization_id'] ?? 'org-test',
                    'status' => 'ACTIVE',
                ];
            }
            return null;
        };
    }

    /**
     * Reset the fake handler to re-enable live HTTP communication
     */
    public static function resetFake(): void
    {
        static::$fakeHandler = null;
    }

    /**
     * Single official M2M header contract
     */
    protected function getInternalHeaders(): array
    {
        if (empty($this->internalKey)) {
            throw new \RuntimeException('CATEGORY_INTERNAL_SERVICE_KEY is not configured on the server.');
        }

        return [
            'X-Internal-Service-Key' => $this->internalKey,
            'Accept' => 'application/json',
        ];
    }

    /**
     * Introspect session reference from Identity Service
     */
    public function introspectSession(string $sessionReference): ?array
    {
        if (static::$fakeHandler) {
            $result = (static::$fakeHandler)('introspectSession', [
                'session_reference' => $sessionReference,
            ]);
            if ($result !== null) {
                return $result;
            }
        }

        if (empty($this->internalKey)) {
            Log::error('CATEGORY_INTERNAL_SERVICE_KEY not configured for introspectSession.');
            return null;
        }

        try {
            $response = Http::withHeaders($this->getInternalHeaders())
                ->timeout($this->timeout)
                ->post("{$this->baseUrl}/internal/v1/auth/sessions/introspect", [
                    'session_reference' => $sessionReference,
                ]);

            if ($response->successful()) {
                $body = $response->json();
                if (!empty($body['data']['active'])) {
                    return $body['data'];
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Identity session introspection failed: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Evaluate permission via Identity Service using FINAL internal contract
     */
    public function evaluateAuthorization(string $actorUserId, string $permission, ?string $roleAssignmentId = null, ?string $organizationId = null): array
    {
        if (static::$fakeHandler) {
            $result = (static::$fakeHandler)('evaluateAuthorization', [
                'actor_user_id' => $actorUserId,
                'permission' => $permission,
                'role_assignment_id' => $roleAssignmentId,
                'organization_id' => $organizationId,
            ]);
            if ($result !== null) {
                return $result;
            }
        }

        if (empty($this->internalKey)) {
            Log::error('CATEGORY_INTERNAL_SERVICE_KEY not configured for evaluateAuthorization.');
            return ['allow' => false, 'reason_code' => 'M2M_CREDENTIAL_NOT_CONFIGURED'];
        }

        try {
            $response = Http::withHeaders($this->getInternalHeaders())
                ->timeout($this->timeout)
                ->post("{$this->baseUrl}/internal/v1/authorization/evaluate", [
                    'actor_user_id' => $actorUserId,
                    'permission' => $permission,
                    'active_role_assignment_id' => $roleAssignmentId,
                    'organization_id' => $organizationId,
                ]);

            if ($response->successful()) {
                $body = $response->json();
                return $body['data'] ?? ['allow' => false, 'reason_code' => 'UNKNOWN'];
            }

            Log::warning('Identity authorization evaluated to non-200', [
                'status' => $response->status(),
                'code' => $response->json('code'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Identity authorization evaluation error: ' . $e->getMessage());
            return ['allow' => false, 'reason_code' => 'IDENTITY_SERVICE_UNAVAILABLE'];
        }

        return ['allow' => false, 'reason_code' => 'DENIED'];
    }

    /**
     * Verify organization status from Identity Service
     */
    public function getOrganizationStatus(string $organizationId): ?array
    {
        if (static::$fakeHandler) {
            $result = (static::$fakeHandler)('getOrganizationStatus', [
                'organization_id' => $organizationId,
            ]);
            if ($result !== null) {
                return $result;
            }
        }

        if (empty($this->internalKey)) {
            Log::error('CATEGORY_INTERNAL_SERVICE_KEY not configured for getOrganizationStatus.');
            return null;
        }

        try {
            $response = Http::withHeaders($this->getInternalHeaders())
                ->timeout($this->timeout)
                ->get("{$this->baseUrl}/internal/v1/organizations/{$organizationId}/status");

            if ($response->successful()) {
                return $response->json()['data'] ?? null;
            }
        } catch (\Throwable $e) {
            Log::warning('Identity organization status check failed: ' . $e->getMessage());
        }

        return null;
    }
}
