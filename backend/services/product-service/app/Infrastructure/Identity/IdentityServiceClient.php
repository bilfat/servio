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
        $this->internalKey = config('services.identity.internal_key', env('PRODUCT_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'));
        $this->timeout = (float) config('services.identity.timeout_ms', env('PRODUCT_IDENTITY_TIMEOUT_MS', 1500)) / 1000.0;
    }

    public static function fake(?Closure $callback = null): void
    {
        static::$fakeHandler = $callback ?: function (string $action, array $params) {
            if ($action === 'evaluateAuthorization') {
                return [
                    'allow' => true,
                    'reason_code' => 'POLICY_ALLOW',
                    'authz_version' => 1,
                ];
            }
            if ($action === 'introspectSession') {
                return [
                    'active' => true,
                    'user_id' => $params['session_reference'] ?? 'test-merchant-user',
                    'role_code' => 'MERCHANT',
                    'organization_id' => '0d6928ad-1c31-4380-98f8-98355100336a',
                    'role_assignment_id' => 'role-assign-1',
                    'authz_version' => 1,
                ];
            }
            if ($action === 'getOrganizationStatus') {
                return [
                    'organization_id' => $params['organization_id'] ?? '0d6928ad-1c31-4380-98f8-98355100336a',
                    'type' => 'MERCHANT',
                    'status' => 'ACTIVE',
                    'authorization_version' => 1,
                ];
            }
            if ($action === 'getOrganizationPublicProfile') {
                return [
                    'organization_id' => $params['organization_id'] ?? '0d6928ad-1c31-4380-98f8-98355100336a',
                    'type' => 'MERCHANT',
                    'store_name' => 'ACME Elektronik Official',
                    'city' => 'Jakarta Selatan',
                    'province' => 'DKI Jakarta',
                    'district' => 'Kebayoran Baru',
                    'postal_code' => '12150',
                    'street_address' => 'Jl. Iskandarsyah Raya No. 12',
                    'logo_url' => null,
                    'public_description' => null,
                    'status' => 'ACTIVE',
                    'operational_status' => 'ONLINE_ACCEPTING',
                    'is_verified' => null,
                    'profile_version' => 1,
                ];
            }
            return null;
        };
    }

    protected array $profileMemoryCache = [];

    public function clearProfileCache(?string $organizationId = null): void
    {
        if ($organizationId) {
            unset($this->profileMemoryCache[$organizationId]);
            try {
                \Illuminate\Support\Facades\Cache::forget("identity_public_profile_{$organizationId}");
            } catch (\Throwable $e) {
                // ignore cache failures
            }
        } else {
            $this->profileMemoryCache = [];
        }
    }

    public function preloadOrganizationProfiles(array $organizationIds): void
    {
        $uniqueIds = array_filter(array_unique($organizationIds));
        foreach ($uniqueIds as $orgId) {
            if (! isset($this->profileMemoryCache[$orgId])) {
                $this->getOrganizationPublicProfile($orgId);
            }
        }
    }

    public static function resetFake(): void
    {
        static::$fakeHandler = null;
    }

    protected function getInternalHeaders(): array
    {
        return [
            'X-Internal-Service-Key' => $this->internalKey,
            'Accept' => 'application/json',
        ];
    }

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

            Log::warning('Identity evaluate returned non-200', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Identity authorization evaluation error: ' . $e->getMessage());
            return ['allow' => false, 'reason_code' => 'IDENTITY_SERVICE_UNAVAILABLE'];
        }

        return ['allow' => false, 'reason_code' => 'DENIED'];
    }

    public function getOrganizationStatus(string $organizationId): ?array
    {
        if (static::$fakeHandler) {
            $result = (static::$fakeHandler)('getOrganizationStatus', [
                'organization_id' => $organizationId,
            ]);
            if ($result === false) {
                return null;
            }
            if ($result !== null) {
                return $result;
            }
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

    public function getOrganizationPublicProfile(string $organizationId, bool $skipCache = false): ?array
    {
        if (static::$fakeHandler) {
            $result = (static::$fakeHandler)('getOrganizationPublicProfile', [
                'organization_id' => $organizationId,
            ]);
            if ($result === false) {
                return null;
            }
            if ($result !== null) {
                return $result;
            }
        }

        if (! $skipCache) {
            if (isset($this->profileMemoryCache[$organizationId])) {
                return $this->profileMemoryCache[$organizationId];
            }

            try {
                $cached = \Illuminate\Support\Facades\Cache::get("identity_public_profile_{$organizationId}");
                if ($cached !== null) {
                    $this->profileMemoryCache[$organizationId] = $cached;
                    return $cached;
                }
            } catch (\Throwable $e) {
                // proceed to live call if cache fails
            }
        }

        try {
            $response = Http::withHeaders($this->getInternalHeaders())
                ->timeout($this->timeout)
                ->get("{$this->baseUrl}/internal/v1/organizations/{$organizationId}/public-profile");

            if ($response->successful()) {
                $data = $response->json()['data'] ?? null;
                if ($data) {
                    $this->profileMemoryCache[$organizationId] = $data;
                    try {
                        \Illuminate\Support\Facades\Cache::put("identity_public_profile_{$organizationId}", $data, now()->addSeconds(120));
                    } catch (\Throwable $e) {
                        // ignore cache write failures
                    }
                    return $data;
                }
            }

            Log::warning('Identity getOrganizationPublicProfile returned non-200', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Identity organization public profile check failed: ' . $e->getMessage());
        }

        return null;
    }
}
