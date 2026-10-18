<?php

namespace Tests;

use App\Infrastructure\Identity\IdentityServiceClient;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Default fake Identity client for domain unit/feature testing
        IdentityServiceClient::fake();

        // Include default gateway key so test actor headers are treated as trusted gateway context
        $this->withHeader('X-Gateway-Key', env('CATEGORY_GATEWAY_KEY', 'servio_local_gateway_key_2026'));
    }

    protected function tearDown(): void
    {
        IdentityServiceClient::resetFake();
        parent::tearDown();
    }
}
