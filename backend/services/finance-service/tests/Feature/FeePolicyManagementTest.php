<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\FeePolicyGroup;
use App\Models\FeePolicyVersion;
use Tests\TestCase;

class FeePolicyManagementTest extends TestCase
{
    public function test_ceo_can_create_fee_policy_draft(): void
    {
        $payload = [
            'name' => 'Biaya & Komisi Produk Standard',
            'slug' => 'biaya-komisi-std-' . uniqid(),
            'description' => 'Kebijakan biaya pengujian',
            'change_reason' => 'Pengujian CEO Policy',
            'targets' => [
                [
                    'policy_code' => 'CUSTOMER_PRODUCT_APP_FEE',
                    'scope' => 'PRODUCT',
                    'payer_type' => 'CUSTOMER',
                    'fee_type' => 'FIXED',
                    'fixed_amount_idr' => 3000,
                    'charge_scope' => 'CHECKOUT',
                    'calculation_base' => 'CHECKOUT_ELIGIBLE_SUBTOTAL',
                ],
                [
                    'policy_code' => 'MERCHANT_PRODUCT_COMMISSION',
                    'scope' => 'PRODUCT',
                    'payer_type' => 'MERCHANT',
                    'fee_type' => 'PERCENTAGE',
                    'percentage_rate' => '5.000000',
                    'charge_scope' => 'MERCHANT_ORDER',
                    'calculation_base' => 'MERCHANT_PRODUCT_SUBTOTAL',
                ],
            ],
        ];

        $response = $this->withHeaders($this->ceoHeaders())
            ->postJson('/api/v1/finance/policies', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'DRAFT')
            ->assertJsonPath('data.targets_count', 2);

        $groupId = $response->json('data.group_id');
        $this->assertDatabaseHas('fee_policy_groups', ['id' => $groupId]);
    }

    public function test_customer_cannot_create_policy(): void
    {
        $payload = [
            'name' => 'Unauthorized Policy',
            'slug' => 'unauth-policy',
            'targets' => [
                [
                    'policy_code' => 'CUSTOMER_PRODUCT_APP_FEE',
                    'scope' => 'PRODUCT',
                    'payer_type' => 'CUSTOMER',
                    'fee_type' => 'FIXED',
                    'fixed_amount_idr' => 1000,
                    'charge_scope' => 'CHECKOUT',
                    'calculation_base' => 'CHECKOUT_ELIGIBLE_SUBTOTAL',
                ],
            ],
        ];

        $response = $this->withHeaders($this->customerHeaders())
            ->postJson('/api/v1/finance/policies', $payload);

        $response->assertStatus(403);
    }

    public function test_unauthenticated_request_rejected(): void
    {
        $response = $this->postJson('/api/v1/finance/policies', ['name' => 'No Auth']);

        $response->assertStatus(401);
    }

    public function test_ceo_can_publish_draft_version(): void
    {
        $this->createStandardActivePolicy();

        $activeVersions = FeePolicyVersion::where('status', 'ACTIVE')->get();
        $this->assertNotEmpty($activeVersions);
    }

    public function test_ceo_can_view_revenue_overview(): void
    {
        $response = $this->withHeaders($this->ceoHeaders())
            ->getJson('/api/v1/finance/revenue/overview');

        $response->assertStatus(200)
            ->assertJsonPath('data.provider_service_fee', 'NOT_IMPLEMENTED')
            ->assertJsonPath('data.accounting_status', 'PENDING_ACCOUNTING_POLICY');
    }
}
