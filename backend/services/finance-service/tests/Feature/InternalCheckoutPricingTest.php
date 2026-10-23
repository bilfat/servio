<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\FinanceCheckout;
use Tests\TestCase;

class InternalCheckoutPricingTest extends TestCase
{
    public function test_internal_checkout_quote_calculates_allocations_correctly(): void
    {
        $this->createStandardActivePolicy();

        $payload = [
            'checkout_group_id' => 'CHK-TEST-001',
            'customer_id' => 'USER-CUSTOMER-01',
            'currency' => 'IDR',
            'validated_by_order_service' => true,
            'order_quote_revision' => 1,
            'merchant_orders' => [
                [
                    'merchant_order_id' => 'MORD-A-01',
                    'merchant_org_id' => 'ORG-MERCHANT-A',
                    'product_subtotal_idr' => 100000,
                    'shipping_customer_idr' => 10000,
                    'discount_idr' => 0,
                ],
                [
                    'merchant_order_id' => 'MORD-B-01',
                    'merchant_org_id' => 'ORG-MERCHANT-B',
                    'product_subtotal_idr' => 200000,
                    'shipping_customer_idr' => 15000,
                    'discount_idr' => 0,
                ],
            ],
        ];

        $response = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.checkout_group_id', 'CHK-TEST-001')
            ->assertJsonPath('data.quote_status', 'QUOTED')
            ->assertJsonPath('data.product_subtotal_idr', 300000)
            ->assertJsonPath('data.shipping_total_idr', 25000)
            ->assertJsonPath('data.customer_application_fee_idr', 3000)
            ->assertJsonPath('data.tax_total_idr', 0)
            ->assertJsonPath('data.customer_total_idr', 328000);

        $allocations = collect($response->json('data.allocations'));
        $allocA = $allocations->firstWhere('merchant_order_id', 'MORD-A-01');
        $allocB = $allocations->firstWhere('merchant_order_id', 'MORD-B-01');

        $this->assertNotNull($allocA);
        $this->assertNotNull($allocB);

        // Order A: 100k subtotal + 10k shipping + 1k app fee = 111k customer total. Commission = 5k. Net = 105k
        $this->assertSame(1000, $allocA['app_fee_allocated_idr']);
        $this->assertSame(111000, $allocA['customer_total_idr']);
        $this->assertSame(5000, $allocA['merchant_commission_idr']);
        $this->assertSame(105000, $allocA['merchant_net_entitlement_idr']);

        // Order B: 200k subtotal + 15k shipping + 2k app fee = 217k customer total. Commission = 10k. Net = 205k
        $this->assertSame(2000, $allocB['app_fee_allocated_idr']);
        $this->assertSame(217000, $allocB['customer_total_idr']);
        $this->assertSame(10000, $allocB['merchant_commission_idr']);
        $this->assertSame(205000, $allocB['merchant_net_entitlement_idr']);

        // Database record check
        $this->assertDatabaseHas('finance_checkouts', [
            'checkout_group_id' => 'CHK-TEST-001',
            'customer_payable_total_idr' => 328000,
        ]);
    }

    public function test_internal_checkout_quote_requires_service_key(): void
    {
        $response = $this->postJson('/internal/v1/finance/checkout-quotes', []);
        $response->assertStatus(401);
    }
}
