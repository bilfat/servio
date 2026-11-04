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

    protected string $gatewayKey = 'test_only_gateway_key_isolated_05b';
    protected string $internalServiceKey = 'test_only_internal_key_isolated_05b';

    protected function setUp(): void
    {
        parent::setUp();

        // Safety assertion: Ensure test runner is strictly on servio_order_jasa_test_db!
        $currentDb = DB::connection()->getDatabaseName();
        if ($currentDb !== 'servio_order_jasa_test_db') {
            throw new RuntimeException("CRITICAL SAFETY ERROR: Test is running against '{$currentDb}' instead of 'servio_order_jasa_test_db'!");
        }
    }

    /**
     * Build trusted headers with valid X-Gateway-Key
     */
    protected function actorHeaders(
        string $userId,
        string $role,
        ?string $orgId = null,
        bool $validGateway = true
    ): array {
        $headers = [
            'X-Actor-User-Id' => $userId,
            'X-Actor-Role' => $role,
            'Accept' => 'application/json',
        ];

        if ($orgId !== null) {
            $headers['X-Actor-Org-Id'] = $orgId;
        }

        if ($validGateway) {
            $headers['X-Gateway-Key'] = $this->gatewayKey;
        }

        return $headers;
    }

    protected function customerHeaders(string $customerId = 'CUST-001'): array
    {
        return $this->actorHeaders($customerId, 'CUSTOMER');
    }

    protected function providerHeaders(string $userId = 'PROV-USER-001', string $orgId = 'ORG-PROV-001'): array
    {
        $headers = $this->actorHeaders($userId, 'PROVIDER', $orgId);
        $headers['X-Actor-Org-Active'] = 'true';
        $headers['X-Actor-Membership-Active'] = 'true';
        return $headers;
    }

    protected function workerHeaders(string $workerId = 'WORKER-001', string $orgId = 'ORG-PROV-001'): array
    {
        $headers = $this->actorHeaders($workerId, 'WORKER', $orgId);
        $headers['X-Actor-Org-Active'] = 'true';
        $headers['X-Actor-Membership-Active'] = 'true';
        return $headers;
    }

    protected function adminHeaders(string $adminId = 'ADMIN-001'): array
    {
        return $this->actorHeaders($adminId, 'ADMIN_OPERATIONS');
    }

    protected function internalHeaders(): array
    {
        return [
            'X-Internal-Service-Key' => $this->internalServiceKey,
            'Accept' => 'application/json',
        ];
    }
}
