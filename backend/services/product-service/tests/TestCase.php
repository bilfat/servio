<?php

namespace Tests;

use App\Infrastructure\Category\CategoryServiceClient;
use App\Infrastructure\Identity\IdentityServiceClient;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected string $defaultMerchantOrg = '0d6928ad-1c31-4380-98f8-98355100336a';
    protected string $defaultMerchantUser = '5e0409f7-94bc-4933-8c26-92427e0dfd2e';

    protected function setUp(): void
    {
        parent::setUp();

        IdentityServiceClient::fake();
        CategoryServiceClient::fake();

        $this->withHeader('X-Gateway-Key', env('PRODUCT_GATEWAY_KEY', 'servio_local_gateway_key_2026'));
    }

    protected function tearDown(): void
    {
        IdentityServiceClient::resetFake();
        CategoryServiceClient::resetFake();
        parent::tearDown();
    }

    protected function merchantHeaders(?string $orgId = null, ?string $userId = null): array
    {
        return [
            'X-Gateway-Key' => env('PRODUCT_GATEWAY_KEY', 'servio_local_gateway_key_2026'),
            'X-Actor-User-Id' => $userId ?: $this->defaultMerchantUser,
            'X-Actor-Role' => 'MERCHANT',
            'X-Actor-Org-Id' => $orgId ?: $this->defaultMerchantOrg,
            'X-Actor-Role-Assignment-Id' => 'ra-test-1',
            'X-Actor-Authz-Version' => 1,
        ];
    }

    protected function adminHeaders(?string $userId = null): array
    {
        return [
            'X-Gateway-Key' => env('PRODUCT_GATEWAY_KEY', 'servio_local_gateway_key_2026'),
            'X-Actor-User-Id' => $userId ?: 'admin-user-uuid-1',
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
            'X-Actor-Role-Assignment-Id' => 'ra-admin-1',
            'X-Actor-Authz-Version' => 1,
        ];
    }
}
