<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    use DatabaseTransactions;

    protected string $gatewayKey = 'test_only_gateway_key_isolated_07';
    protected string $internalServiceKey = 'test_only_internal_key_isolated_07';

    protected function setUp(): void
    {
        parent::setUp();

        // Safety assertion: Ensure test runner is strictly on servio_after_sales_test_db!
        $currentDb = DB::connection()->getDatabaseName();
        if ($currentDb !== 'servio_after_sales_test_db') {
            throw new RuntimeException("CRITICAL SAFETY ERROR: Test is running against '{$currentDb}' instead of 'servio_after_sales_test_db'!");
        }

        // Bind in-memory test verifiers
        $this->app->singleton(
            \App\Domain\AfterSales\Contracts\OrderEligibilityVerifierInterface::class,
            \App\Domain\AfterSales\Integrations\InMemoryOrderEligibilityVerifier::class
        );

        $this->app->singleton(
            \App\Domain\AfterSales\Contracts\ResolutionCoordinatorInterface::class,
            \App\Domain\AfterSales\Integrations\InMemoryResolutionCoordinator::class
        );
    }

    protected function actorHeaders(
        string $userId,
        string $role,
        ?string $orgId = null,
        ?string $orgType = null,
        bool $validGateway = true
    ): array {
        $headers = [
            'X-Actor-User-Id' => $userId,
            'X-Actor-Role' => $role,
            'Accept' => 'application/json',
        ];

        if ($orgId !== null) {
            $headers['X-Actor-Org-Id'] = $orgId;
            $headers['X-Actor-Org-Active'] = 'true';
            $headers['X-Actor-Membership-Active'] = 'true';
        }

        if ($orgType !== null) {
            $headers['X-Actor-Org-Type'] = $orgType;
        }

        if ($validGateway) {
            $headers['X-Gateway-Key'] = $this->gatewayKey;
        }

        return $headers;
    }

    protected function customerHeaders(string $userId = 'cust-001'): array
    {
        return $this->actorHeaders($userId, 'CUSTOMER');
    }

    protected function merchantHeaders(string $userId = 'merch-user-001', string $orgId = 'org-merchant-001'): array
    {
        return $this->actorHeaders($userId, 'MERCHANT', $orgId, 'MERCHANT');
    }

    protected function providerHeaders(string $userId = 'prov-user-001', string $orgId = 'org-provider-001'): array
    {
        return $this->actorHeaders($userId, 'PROVIDER', $orgId, 'PROVIDER');
    }

    protected function adminHeaders(string $userId = 'admin-001'): array
    {
        return $this->actorHeaders($userId, 'ADMIN_OPERATIONS');
    }

    protected function internalHeaders(string $sourceService = 'order-barang-service', ?string $s2sToken = null): array
    {
        if ($s2sToken === null) {
            $s2sToken = match ($sourceService) {
                'order-barang-service', '05A' => config('after_sales.s2s.05A'),
                'order-jasa-service', '05B' => config('after_sales.s2s.05B'),
                'finance-service', '06' => config('after_sales.s2s.06'),
                'support-service', '09' => config('after_sales.s2s.09'),
                default => null,
            };
        }

        $headers = [
            'X-Internal-Service-Key' => $this->internalServiceKey,
            'X-Source-Service' => $sourceService,
            'Accept' => 'application/json',
        ];

        if ($s2sToken !== null) {
            $headers['X-Service-Token'] = $s2sToken;
        }

        return $headers;
    }
}
