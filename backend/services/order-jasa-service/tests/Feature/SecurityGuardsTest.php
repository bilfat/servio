<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

class SecurityGuardsTest extends TestCase
{
    public function test_forged_actor_headers_without_gateway_key_rejected_with_403(): void
    {
        // Attacker attempts to forge X-Actor-User-Id directly without X-Gateway-Key
        $response = $this->getJson('/api/v1/order-jasa/orders', [
            'X-Actor-User-Id' => 'CUST-HACKER',
            'X-Actor-Role' => 'CUSTOMER',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_UNTRUSTED_GATEWAY_CONTEXT',
                ],
            ]);
    }

    public function test_forged_x_source_service_header_does_not_authenticate(): void
    {
        // Prompt 01 B.5 & F.112: X-Source-Service is NOT proof of caller identity
        $response = $this->getJson('/api/v1/order-jasa/orders', [
            'X-Source-Service' => 'identity-service',
            'X-User-Id' => 'CUST-001',
            'X-User-Role' => 'CUSTOMER',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_UNTRUSTED_GATEWAY_CONTEXT',
                ],
            ]);
    }

    public function test_wrong_role_access_denied_with_403(): void
    {
        // Customer attempts to access Provider order list
        $headers = $this->customerHeaders('CUST-001');
        $response = $this->getJson('/api/v1/order-jasa/provider/orders', $headers);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_FORBIDDEN_ROLE',
                ],
            ]);
    }

    public function test_provider_without_organization_denied(): void
    {
        // Provider header without organization ID
        $headers = $this->actorHeaders('PROV-USER-001', 'PROVIDER', null);
        $response = $this->getJson('/api/v1/order-jasa/provider/orders', $headers);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_PROVIDER_NO_ORGANIZATION',
                ],
            ]);
    }

    public function test_no_route_exists_for_mark_paid(): void
    {
        // Prompt 01 F.112: Verify no user/worker/browser mark-paid route exists
        $headers = $this->customerHeaders('CUST-001');
        $response = $this->postJson('/api/v1/order-jasa/orders/SRV-001/mark-paid', [], $headers);
        $response->assertStatus(404);

        $workerHeaders = $this->workerHeaders('WORKER-001');
        $response = $this->postJson('/api/v1/order-jasa/orders/SRV-001/mark-paid', [], $workerHeaders);
        $response->assertStatus(404);
    }

    public function test_create_order_validates_required_fields(): void
    {
        // Prompt 02: Write endpoint is now active and strictly validates schema
        $headers = $this->customerHeaders('CUST-001');
        $headers['Idempotency-Key'] = 'test-idemp-key-validation-001';

        $response = $this->postJson('/api/v1/order-jasa/orders', [
            'service_offering_id' => 'srv-ac-01',
        ], $headers);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_VALIDATION_FAILED',
                ],
            ]);
    }

    public function test_spoofed_gateway_key_with_wrong_secret_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/order-jasa/orders', [
            'X-Gateway-Key' => 'attacker_forged_key_12345',
            'X-Actor-User-Id' => 'CUST-HACKER',
            'X-Actor-Role' => 'CUSTOMER',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_UNTRUSTED_GATEWAY_CONTEXT',
                ],
            ]);
    }
}
