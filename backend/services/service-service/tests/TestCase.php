<?php

namespace Tests;

use App\Infrastructure\Category\CategoryServiceClient;
use App\Infrastructure\Identity\IdentityServiceClient;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected string $defaultProviderOrg = '33333333-3333-4333-8333-333333333333';
    protected string $defaultProviderUser = '77777777-7777-4777-8777-777777777777';

    protected function setUp(): void
    {
        parent::setUp();

        IdentityServiceClient::fake();
        CategoryServiceClient::fake();

        $this->withHeader('X-Gateway-Key', config('services.gateway.key', 'servio_local_gateway_key_2026'));
    }

    protected function tearDown(): void
    {
        IdentityServiceClient::resetFake();
        CategoryServiceClient::resetFake();
        parent::tearDown();
    }

    protected function providerHeaders(?string $orgId = null, ?string $userId = null): array
    {
        return [
            'X-Gateway-Key' => config('services.gateway.key', 'servio_local_gateway_key_2026'),
            'X-Actor-User-Id' => $userId ?: $this->defaultProviderUser,
            'X-Actor-Role' => 'SERVICE_PROVIDER',
            'X-Actor-Org-Id' => $orgId ?: $this->defaultProviderOrg,
            'X-Actor-Role-Assignment-Id' => 'ra-provider-1',
            'X-Actor-Authz-Version' => 1,
        ];
    }

    protected function adminHeaders(?string $userId = null): array
    {
        return [
            'X-Gateway-Key' => config('services.gateway.key', 'servio_local_gateway_key_2026'),
            'X-Actor-User-Id' => $userId ?: 'admin-user-uuid-1',
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
            'X-Actor-Role-Assignment-Id' => 'ra-admin-1',
            'X-Actor-Authz-Version' => 1,
        ];
    }

    protected function ceoHeaders(?string $userId = null): array
    {
        return [
            'X-Gateway-Key' => config('services.gateway.key', 'servio_local_gateway_key_2026'),
            'X-Actor-User-Id' => $userId ?: 'ceo-user-uuid-1',
            'X-Actor-Role' => 'CEO_PRODUCT_OWNER',
            'X-Actor-Role-Assignment-Id' => 'ra-ceo-1',
            'X-Actor-Authz-Version' => 1,
        ];
    }

    protected function customerHeaders(?string $userId = null): array
    {
        return [
            'X-Gateway-Key' => config('services.gateway.key', 'servio_local_gateway_key_2026'),
            'X-Actor-User-Id' => $userId ?: 'cust-user-uuid-1',
            'X-Actor-Role' => 'CUSTOMER',
            'X-Actor-Role-Assignment-Id' => 'ra-cust-1',
            'X-Actor-Authz-Version' => 1,
        ];
    }

    protected function internalHeaders(): array
    {
        return [
            'Authorization' => 'Bearer ' . config('services.internal.service_key', 'servio_local_internal_service_key_2026'),
            'X-Request-ID' => (string) \Illuminate\Support\Str::uuid(),
        ];
    }
}
