<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

class HealthAndEnvelopeTest extends TestCase
{
    public function test_liveness_endpoint_returns_up(): void
    {
        $response = $this->getJson('/api/v1/order-jasa/liveness');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'ORDER_JASA_OK',
                'data' => [
                    'service' => 'servio-order-jasa-service',
                    'status' => 'UP',
                ],
            ]);

        $this->assertArrayHasKey('request_id', $response->json('meta'));
        $this->assertEquals('v1', $response->json('meta.version'));
    }

    public function test_readiness_endpoint_verifies_database_and_gates(): void
    {
        $response = $this->getJson('/api/v1/order-jasa/health');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'ORDER_JASA_HEALTHY',
                'data' => [
                    'service' => 'servio-order-jasa-service',
                    'status' => 'HEALTHY',
                    'checks' => [
                        'database' => [
                            'status' => 'UP',
                            'error' => null,
                        ],
                    ],
                ],
            ]);

        // Verify feature gates are present and disabled by default (Prompt 01 C.53)
        $gates = $response->json('data.checks.feature_gates');
        $this->assertIsArray($gates);
        $this->assertFalse($gates['identity_worker_eligibility']);
        $this->assertFalse($gates['finance_service_payment']);
        $this->assertFalse($gates['phase04_offering_and_slot']);
    }

    public function test_standard_error_envelope_on_unauthenticated(): void
    {
        $response = $this->getJson('/api/v1/order-jasa/orders');

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_UNAUTHENTICATED',
                ],
            ]);

        $this->assertArrayHasKey('request_id', $response->json('meta'));
    }
}
