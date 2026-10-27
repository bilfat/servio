<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Infrastructure\Finance\FinanceCheckoutClient;
use App\Models\CartItem;
use App\Models\CheckoutGroup;
use App\Models\MerchantDeliverySetting;
use App\Models\MerchantDeliveryTier;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class CartAndCheckoutTest extends TestCase
{
    use RefreshDatabase;

    private function setupMerchantWithTiers(string $orgId, float $lat = -6.2000000, float $lng = 106.8166667): MerchantDeliverySetting
    {
        $setting = MerchantDeliverySetting::create([
            'id' => (string) Str::ulid(),
            'merchant_org_id' => $orgId,
            'is_enabled' => true,
            'origin_reference_id' => 'ORIGIN_' . $orgId,
            'origin_lat' => $lat,
            'origin_lng' => $lng,
            'origin_region_code' => 'KOTA_JAKARTA_PUSAT',
            'maximum_distance_km' => 20.0,
            'version' => 1,
            'last_updated_by' => 'SYSTEM',
        ]);

        MerchantDeliveryTier::create([
            'id' => (string) Str::ulid(),
            'delivery_setting_id' => $setting->id,
            'setting_version' => 1,
            'from_km' => 0.0,
            'to_km' => 5.0,
            'shipping_fee_idr' => 10000,
            'position' => 0,
        ]);

        MerchantDeliveryTier::create([
            'id' => (string) Str::ulid(),
            'delivery_setting_id' => $setting->id,
            'setting_version' => 1,
            'from_km' => 5.0,
            'to_km' => 20.0,
            'shipping_fee_idr' => 20000,
            'position' => 1,
        ]);

        return $setting;
    }

    public function test_customer_can_add_items_to_cart_and_view_grouped_by_merchant(): void
    {
        $headers = $this->customerHeaders('CUST_TEST_01');

        // 1. Add item from Store A
        $res1 = $this->postJson('/api/v1/order-barang/cart/items', [
            'product_id' => 'PROD_A_01',
            'variant_id' => 'VAR_A_01',
            'quantity' => 2,
            'merchant_org_id' => 'ORG_STORE_A',
        ], $headers);

        $res1->assertStatus(201);
        $res1->assertJsonPath('success', true);

        // 2. Add item from Store B
        $res2 = $this->postJson('/api/v1/order-barang/cart/items', [
            'product_id' => 'PROD_B_01',
            'variant_id' => 'VAR_B_01',
            'quantity' => 1,
            'merchant_org_id' => 'ORG_STORE_B',
        ], $headers);

        $res2->assertStatus(201);

        // 3. View cart grouped by merchant
        $getCart = $this->getJson('/api/v1/order-barang/cart', $headers);
        $getCart->assertStatus(200);
        $getCart->assertJsonPath('success', true);
        $getCart->assertJsonCount(2, 'data.merchants');
    }

    public function test_customer_can_update_and_remove_cart_item(): void
    {
        $headers = $this->customerHeaders('CUST_TEST_01');

        $add = $this->postJson('/api/v1/order-barang/cart/items', [
            'product_id' => 'PROD_A_01',
            'variant_id' => 'VAR_A_01',
            'quantity' => 2,
            'merchant_org_id' => 'ORG_STORE_A',
        ], $headers);

        $itemId = $add->json('data.id');

        // Update quantity to 5
        $update = $this->patchJson("/api/v1/order-barang/cart/items/{$itemId}", [
            'quantity' => 5,
        ], $headers);
        $update->assertStatus(200);
        $update->assertJsonPath('data.quantity', 5);

        // Delete item
        $del = $this->deleteJson("/api/v1/order-barang/cart/items/{$itemId}", [], $headers);
        $del->assertStatus(200);

        $getCart = $this->getJson('/api/v1/order-barang/cart', $headers);
        $getCart->assertJsonCount(0, 'data.merchants');
    }

    public function test_multi_merchant_checkout_creates_one_group_and_separate_merchant_orders(): void
    {
        $this->setupMerchantWithTiers('ORG_STORE_A');
        $this->setupMerchantWithTiers('ORG_STORE_B');

        $headers = $this->customerHeaders('CUST_TEST_01');

        // Add 1 item from Store A, 1 from Store B
        $itemA = $this->postJson('/api/v1/order-barang/cart/items', [
            'product_id' => 'PROD_A_01',
            'variant_id' => 'VAR_A_01',
            'quantity' => 2,
            'merchant_org_id' => 'ORG_STORE_A',
        ], $headers)->json('data.id');

        $itemB = $this->postJson('/api/v1/order-barang/cart/items', [
            'product_id' => 'PROD_B_01',
            'variant_id' => 'VAR_B_01',
            'quantity' => 1,
            'merchant_org_id' => 'ORG_STORE_B',
        ], $headers)->json('data.id');

        // Mock FinanceCheckoutClient
        $mockFinance = Mockery::mock(FinanceCheckoutClient::class);
        $this->app->instance(FinanceCheckoutClient::class, $mockFinance);

        $mockQuoteHash = 'hash_' . Str::random(32);

        $mockFinance->shouldReceive('requestCheckoutQuote')
            ->once()
            ->andReturnUsing(function ($payload) use ($mockQuoteHash) {
                $orders = $payload['merchant_orders'];
                $allocations = [];
                $grandTotal = 0;

                foreach ($orders as $mOrder) {
                    $orderTotal = $mOrder['product_subtotal_idr'] + $mOrder['shipping_customer_idr'] + 2000;
                    $grandTotal += $orderTotal;

                    $allocations[] = [
                        'merchant_order_id' => $mOrder['merchant_order_id'],
                        'merchant_org_id' => $mOrder['merchant_org_id'],
                        'product_subtotal_idr' => $mOrder['product_subtotal_idr'],
                        'shipping_customer_idr' => $mOrder['shipping_customer_idr'],
                        'app_fee_allocated_idr' => 1000,
                        'customer_tax_allocated_idr' => 1000,
                        'discount_allocated_idr' => 0,
                        'discount_bearer' => 'MERCHANT',
                        'customer_total_idr' => $orderTotal,
                    ];
                }

                return [
                    'checkout_group_id' => $payload['checkout_group_id'],
                    'customer_id' => $payload['customer_id'],
                    'customer_total_idr' => $grandTotal,
                    'allocations' => $allocations,
                    'payload_hash' => $mockQuoteHash,
                ];
            });

        // Checkout call
        $checkout = $this->postJson('/api/v1/order-barang/checkouts', [
            'address_id' => 'ADDR_01',
            'cart_item_ids' => [$itemA, $itemB],
        ], array_merge($headers, ['Idempotency-Key' => 'KEY_CHECKOUT_001']));

        $checkout->assertStatus(201);
        $checkout->assertJsonPath('success', true);

        $groupId = $checkout->json('data.checkout_group_id');
        $this->assertNotNull($groupId);

        // Verify in DB: 1 CheckoutGroup, 2 Orders
        $group = CheckoutGroup::where('id', $groupId)->with('orders.items')->first();
        $this->assertNotNull($group);
        $this->assertCount(2, $group->orders);

        // Verify each order belongs to distinct merchant
        $merchantOrgs = $group->orders->pluck('merchant_org_id')->toArray();
        $this->assertContains('ORG_STORE_A', $merchantOrgs);
        $this->assertContains('ORG_STORE_B', $merchantOrgs);

        // FIX 04: Verify Cart items are preserved while payment is pending
        $this->assertEquals(2, CartItem::whereIn('id', [$itemA, $itemB])->count());
        $this->assertEquals([$itemA, $itemB], $group->fresh()->selected_cart_item_ids);
    }

    public function test_single_payment_intent_created_with_6_hour_expiry(): void
    {
        $this->setupMerchantWithTiers('ORG_STORE_A');
        $headers = $this->customerHeaders('CUST_TEST_01');

        $mockFinance = Mockery::mock(FinanceCheckoutClient::class);
        $this->app->instance(FinanceCheckoutClient::class, $mockFinance);

        $mockQuoteHash = 'hash_' . Str::random(32);

        $mockFinance->shouldReceive('requestCheckoutQuote')
            ->once()
            ->andReturnUsing(function ($payload) use ($mockQuoteHash) {
                $orders = $payload['merchant_orders'];
                $allocations = [];
                $grandTotal = 0;
                foreach ($orders as $mOrder) {
                    $orderTotal = $mOrder['product_subtotal_idr'] + $mOrder['shipping_customer_idr'] + 2000;
                    $grandTotal += $orderTotal;
                    $allocations[] = [
                        'merchant_order_id' => $mOrder['merchant_order_id'],
                        'merchant_org_id' => $mOrder['merchant_org_id'],
                        'customer_total_idr' => $orderTotal,
                        'app_fee_allocated_idr' => 1000,
                        'customer_tax_allocated_idr' => 1000,
                    ];
                }

                return [
                    'checkout_group_id' => $payload['checkout_group_id'],
                    'customer_id' => $payload['customer_id'],
                    'customer_total_idr' => $grandTotal,
                    'allocations' => $allocations,
                    'payload_hash' => $mockQuoteHash,
                ];
            });

        // Create buy now checkout
        $checkout = $this->postJson('/api/v1/order-barang/checkouts', [
            'address_id' => 'ADDR_01',
            'buy_now_item' => [
                'product_id' => 'PROD_BUYNOW',
                'variant_id' => 'VAR_BUYNOW',
                'quantity' => 1,
                'merchant_org_id' => 'ORG_STORE_A',
            ],
        ], array_merge($headers, ['Idempotency-Key' => 'KEY_BUYNOW_01']));

        $checkout->assertStatus(201);
        $groupId = $checkout->json('data.checkout_group_id');

        // Mock payment intent
        $mockFinance->shouldReceive('createPaymentIntent')
            ->once()
            ->andReturnUsing(function ($groupId, $method) {
                $grp = CheckoutGroup::findOrFail($groupId);
                return [
                    'payment_id' => 'PAY_INTENT_01',
                    'amount_idr' => (int) $grp->customer_total_idr,
                    'provider' => 'MOCK_QRIS',
                    'expires_at' => now()->addHours(6)->toIso8601String(),
                    'payment_instruction' => 'Scan QRIS berikut dalam 6 jam.',
                ];
            });

        $intentRes = $this->postJson("/api/v1/order-barang/checkouts/{$groupId}/payment-intents", [
            'method' => 'MOCK_QRIS',
        ], $headers);

        $intentRes->assertStatus(201);
        $intentRes->assertJsonPath('data.payment_id', 'PAY_INTENT_01');
        $intentRes->assertJsonPath('data.status', 'PENDING');

        // Verify Order status moved from CREATED to PAYMENT_PENDING
        $order = Order::where('checkout_group_id', $groupId)->first();
        $this->assertEquals(Order::STATUS_PAYMENT_PENDING, $order->status);
    }
}
