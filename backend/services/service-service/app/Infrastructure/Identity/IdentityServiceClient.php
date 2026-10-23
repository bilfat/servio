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
        $this->internalKey = config('services.identity.internal_key', env('SERVICE_INTERNAL_SERVICE_KEY', 'servio_local_internal_service_key_2026'));
        $this->timeout = (float) config('services.identity.timeout_ms', env('SERVICE_IDENTITY_TIMEOUT_MS', 1500)) / 1000.0;
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
                    'user_id' => $params['session_reference'] ?? 'test-provider-user',
                    'role_code' => 'SERVICE_PROVIDER',
                    'organization_id' => '0d6928ad-1c31-4380-98f8-98355100336a',
                    'role_assignment_id' => 'role-assign-1',
                    'authz_version' => 1,
                ];
            }
            if ($action === 'getOrganizationStatus') {
                return [
                    'organization_id' => $params['organization_id'] ?? '0d6928ad-1c31-4380-98f8-98355100336a',
                    'type' => 'PROVIDER',
                    'status' => 'ACTIVE',
                    'authorization_version' => 1,
                ];
            }
            if ($action === 'getOrganizationPublicProfile') {
                return [
                    'organization_id' => $params['organization_id'] ?? '0d6928ad-1c31-4380-98f8-98355100336a',
                    'type' => 'PROVIDER',
                    'display_name' => 'Bintang Teknik Mandiri',
                    'office_city' => 'Jakarta Barat',
                    'logo_url' => null,
                    'public_description' => null,
                    'status' => 'ACTIVE',
                    'profile_version' => 1,
                ];
            }
            return null;
        };
    }

    public static function resetFake(): void
    {
        static::$fakeHandler = null;
    }

    public function introspectSession(string $sessionReference, array $requestContext = []): ?array
    {
        if (static::$fakeHandler !== null) {
            return (static::$fakeHandler)('introspectSession', [
                'session_reference' => $sessionReference,
                'request_context' => $requestContext,
            ]);
        }

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->internalKey,
                    'X-Request-ID' => request()->header('X-Request-ID', (string) \Illuminate\Support\Str::uuid()),
                ])
                ->post("{$this->baseUrl}/internal/v1/auth/sessions/introspect", [
                    'session_reference' => $sessionReference,
                    'request_context' => $requestContext,
                ]);

            if ($response->successful()) {
                return $response->json('data');
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning('Identity session introspection failed: ' . $e->getMessage());
            return null;
        }
    }

    public function evaluateAuthorization(
        string $actorUserId,
        string $roleAssignmentId,
        ?string $organizationId,
        string $permission,
        array $resourceOwnerContext = []
    ): array {
        if (static::$fakeHandler !== null) {
            $fakeRes = (static::$fakeHandler)('evaluateAuthorization', [
                'actor_user_id' => $actorUserId,
                'active_role_assignment_id' => $roleAssignmentId,
                'organization_id' => $organizationId,
                'permission' => $permission,
                'resource_owner_context' => $resourceOwnerContext,
            ]);

            if ($fakeRes !== null) {
                return $fakeRes;
            }
        }

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->internalKey,
                    'X-Request-ID' => request()->header('X-Request-ID', (string) \Illuminate\Support\Str::uuid()),
                ])
                ->post("{$this->baseUrl}/internal/v1/authorization/evaluate", [
                    'actor_user_id' => $actorUserId,
                    'active_role_assignment_id' => $roleAssignmentId,
                    'organization_id' => $organizationId,
                    'permission' => $permission,
                    'resource_owner_context' => $resourceOwnerContext,
                ]);

            if ($response->successful()) {
                return $response->json('data', [
                    'allow' => false,
                    'reason_code' => 'RESPONSE_ERROR',
                    'authz_version' => 1,
                ]);
            }

            return [
                'allow' => false,
                'reason_code' => 'HTTP_' . $response->status(),
                'authz_version' => 1,
            ];
        } catch (\Throwable $e) {
            Log::warning('Identity evaluateAuthorization failed: ' . $e->getMessage());
            return [
                'allow' => false,
                'reason_code' => 'SERVICE_UNAVAILABLE',
                'authz_version' => 1,
            ];
        }
    }

    public function getOrganizationStatus(string $organizationId): ?array
    {
        if (static::$fakeHandler !== null) {
            return (static::$fakeHandler)('getOrganizationStatus', ['organization_id' => $organizationId]);
        }

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->internalKey,
                ])
                ->get("{$this->baseUrl}/internal/v1/organizations/{$organizationId}/status");

            if ($response->successful()) {
                return $response->json('data');
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning('Identity getOrganizationStatus failed: ' . $e->getMessage());
            return null;
        }
    }

    public function getOrganizationPublicProfile(string $organizationId): ?array
    {
        if (static::$fakeHandler !== null) {
            return (static::$fakeHandler)('getOrganizationPublicProfile', ['organization_id' => $organizationId]);
        }

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->internalKey,
                ])
                ->get("{$this->baseUrl}/internal/v1/organizations/{$organizationId}/public-profile");

            if ($response->successful()) {
                return $response->json('data');
            }

            return null;
        } catch (\Throwable $e) {
            Log::warning('Identity getOrganizationPublicProfile failed: ' . $e->getMessage());
            return null;
        }
    }
}
