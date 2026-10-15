<?php

namespace Tests\Feature;

use App\Services\BrevoService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BrevoResilienceFeatureTest extends TestCase
{
    use DatabaseTransactions;

    public function test_brevo_delivery_failure_is_handled_gracefully(): void
    {
        // Mock Brevo API returning HTTP 500
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => Http::response(['message' => 'Internal Brevo Error'], 500),
        ]);

        // Temporarily bind testing config
        config([
            'services.brevo.api_key' => 'fake_brevo_key_for_testing',
            'services.brevo.test_force_http' => true,
        ]);

        $result = BrevoService::sendOtpEmail('test_fail@servio.id', '123456', 'REGISTRATION');

        $this->assertIsArray($result);
        $this->assertArrayHasKey('success', $result);
        $this->assertFalse($result['success']);
        // Does not throw uncaught exception
    }

    public function test_brevo_network_exception_does_not_crash_flow(): void
    {
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => function () {
                throw new \Illuminate\Http\Client\ConnectionException('Connection timed out to Brevo');
            },
        ]);

        config([
            'services.brevo.api_key' => 'fake_brevo_key_for_testing',
            'services.brevo.test_force_http' => true,
        ]);

        $result = BrevoService::sendOtpEmail('timeout@servio.id', '654321', 'LOGIN');

        $this->assertIsArray($result);
        $this->assertFalse($result['success']);
        $this->assertEquals('DELIVERY_FAILED', $result['state']);
        $this->assertStringContainsString('Connection timed out', $result['error']);
    }
}
