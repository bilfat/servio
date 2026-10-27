<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Cancellation\CancellationService;
use App\Domain\Completion\AutoCompletionService;
use App\Infrastructure\Finance\FinanceCheckoutClient;
use App\Infrastructure\Product\ProductClient;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\CheckoutGroup;
use App\Models\Delivery;
use App\Models\IntegrationOutboxEvent;
use App\Models\MerchantDeliverySetting;
use App\Models\MerchantDeliveryTier;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PaymentProjection;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class Prompt02TargetedFixesRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->setupMerchantWithTiers('ORG_STORE_A');
        $this->setupMerchantWithTiers('ORG_NO_SCHEDULE');
    }

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

    private function createConfirmedOrder(string $customerId = 'CUST_A', string $merchantOrgId = 'ORG_STORE_A', int $total = 100000): array
    {
        $group = CheckoutGroup::create([
            'id' => (string) Str::ulid(),
            'customer_id' => $customerId,
            'address_id' => 'ADDR_01',
            'recipient_snapshot' => ['recipient_name' => 'Budi Santoso'],
            'address_snapshot' => ['city' => 'Jakarta Pusat'],
            'selected_items_hash' => 'hash_confirmed',
            'idempotency_key' => (string) Str::uuid(),
            'orchestration_status' => 'PAID_CONFIRMED',
            'payment_status_projection' => 'PAID',
            'customer_total_idr' => $total,
        ]);

        $order = Order::create([
            'id' => (string) Str::ulid(),
            'order_number' => 'ORD-' . Str::upper(Str::random(8)),
            'checkout_group_id' => $group->id,
            'customer_id' => $customerId,
            'merchant_org_id' => $merchantOrgId,
            'merchant_display_snapshot' => ['name' => 'Toko Resmi'],
            'address_id' => 'ADDR_01',
            'recipient_snapshot' => ['recipient_name' => 'Budi Santoso'],
            'address_snapshot' => ['city' => 'Jakarta Pusat'],
            'origin_snapshot' => ['city' => 'Jakarta Pusat'],
            'shipping_snapshot' => ['shipping_fee_idr' => 10000],
            'product_subtotal_idr' => $total - 10000,
            'shipping_customer_idr' => 10000,
            'customer_total_idr' => $total,
            'payment_status_projection' => 'PAID',
            'status' => Order::STATUS_CONFIRMED,
            'confirmed_at' => now(),
            'version' => 1,
        ]);

        OrderItem::create([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'product_id' => 'PROD_01',
            'variant_id' => 'VAR_01',
            'product_snapshot' => ['name' => 'Barang A'],
            'variant_snapshot' => ['name' => 'Default'],
            'quantity' => 1,
            'unit_price_idr' => $total - 10000,
            'line_subtotal_idr' => $total - 10000,
        ]);

        $delivery = Delivery::create([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'service_type' => 'LOCAL_MERCHANT_MANAGED',
            'status' => Delivery::STATUS_NOT_STARTED,
            'version' => 1,
        ]);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'FIN_PAY_CONFIRMED',
            'payment_method' => 'MOCK_QRIS',
            'payment_status' => 'PAID',
            'amount_idr' => $total,
            'expires_at' => now()->addHours(6),
            'paid_at' => now(),
            'version' => 1,
        ]);

        return [$group, $order, $delivery];
    }

    /**
     * FIX 01: Address validation & fail-closed.
     */
    public function test_fix_01_customer_cannot_checkout_with_foreign_address_returns_403(): void
    {
        $headers = $this->customerHeaders('CUST_ATTACKER');
        $res = $this->postJson('/api/v1/order-barang/checkouts', [
            'address_id' => 'ADDR_FOREIGN',
            'buy_now_item' => [
                'product_id' => 'PROD_BUYNOW',
                'variant_id' => 'VAR_BUYNOW',
                'quantity' => 1,
                'merchant_org_id' => 'ORG_STORE_A',
            ],
        ], $headers);

        $res->assertStatus(403);
    }

    public function test_fix_01_checkout_with_missing_address_is_rejected(): void
    {
        $headers = $this->customerHeaders('CUST_TEST_01');
        $res = $this->postJson('/api/v1/order-barang/checkouts', [
            'address_id' => 'ADDR_NOT_FOUND',
            'buy_now_item' => [
                'product_id' => 'PROD_BUYNOW',
                'variant_id' => 'VAR_BUYNOW',
                'quantity' => 1,
                'merchant_org_id' => 'ORG_STORE_A',
            ],
        ], $headers);

        $res->assertStatus(404);
    }

    /**
     * FIX 02: Product inactive or out-of-stock without fallback.
     */
    public function test_fix_02_product_inactive_is_rejected(): void
    {
        $headers = $this->customerHeaders('CUST_TEST_01');
        $res = $this->postJson('/api/v1/order-barang/checkouts', [
            'address_id' => 'ADDR_01',
            'buy_now_item' => [
                'product_id' => 'PROD_INACTIVE_01',
                'variant_id' => 'VAR_01',
                'quantity' => 1,
                'merchant_org_id' => 'ORG_STORE_A',
            ],
        ], $headers);

        $res->assertStatus(422);
    }

    public function test_fix_02_product_out_of_stock_is_rejected(): void
    {
        $headers = $this->customerHeaders('CUST_TEST_01');
        $res = $this->postJson('/api/v1/order-barang/checkouts', [
            'address_id' => 'ADDR_01',
            'buy_now_item' => [
                'product_id' => 'PROD_OUT_OF_STOCK_01',
                'variant_id' => 'VAR_01',
                'quantity' => 1,
                'merchant_org_id' => 'ORG_STORE_A',
            ],
        ], $headers);

        $res->assertStatus(422);
    }

    /**
     * FIX 03: Stock reservation fail-closed when contract unavailable.
     */
    public function test_fix_03_stock_reservation_fails_closed_when_contract_unavailable(): void
    {
        config(['order.features.mock_product_reservation_enabled' => false]);

        $productMock = Mockery::mock(ProductClient::class);
        $productMock->shouldReceive('getVariantSnapshot')
            ->andReturn([
                'product_id' => 'PROD_01',
                'variant_id' => 'VAR_01',
                'merchant_organization_id' => 'ORG_STORE_A',
                'price_idr' => 50000,
                'stock_qty' => 10,
                'product_public_eligible' => true,
                'variant_active' => true,
                'version' => 1,
            ]);
        $productMock->shouldReceive('isStockReservationContractAvailable')
            ->andReturn(false);
        $productMock->shouldReceive('reserveInventory')
            ->andReturn([
                'success' => false,
                'status' => 'PENDING_PRODUCT_CONTRACT',
                'message' => 'Kontrak reservasi stok anti-oversell belum tersedia di Product Service 03.',
            ]);

        $this->app->instance(ProductClient::class, $productMock);

        // Mock Finance quote
        $mockFinance = Mockery::mock(FinanceCheckoutClient::class);
        $mockFinance->shouldReceive('requestCheckoutQuote')
            ->andReturnUsing(function ($payload) {
                $allocations = [];
                foreach ($payload['merchant_orders'] as $mOrd) {
                    $allocations[] = [
                        'merchant_order_id' => $mOrd['merchant_order_id'],
                        'merchant_org_id' => $mOrd['merchant_org_id'],
                        'customer_total_idr' => 60000,
                        'app_fee_allocated_idr' => 1000,
                        'customer_tax_allocated_idr' => 1000,
                    ];
                }
                return [
                    'checkout_group_id' => $payload['checkout_group_id'],
                    'customer_id' => $payload['customer_id'],
                    'customer_total_idr' => 60000,
                    'allocations' => $allocations,
                    'payload_hash' => 'hash_quote',
                ];
            });
        $this->app->instance(FinanceCheckoutClient::class, $mockFinance);

        $headers = $this->customerHeaders('CUST_TEST_01');
        $res = $this->postJson('/api/v1/order-barang/checkouts', [
            'address_id' => 'ADDR_01',
            'buy_now_item' => [
                'product_id' => 'PROD_01',
                'variant_id' => 'VAR_01',
                'quantity' => 1,
                'merchant_org_id' => 'ORG_STORE_A',
            ],
        ], $headers);

        // Checkout group creation succeeds in CREATED, but payment intent must fail-closed with 409
        $res->assertStatus(201);
        $groupId = $res->json('data.checkout_group_id');

        $intentRes = $this->postJson("/api/v1/order-barang/checkouts/{$groupId}/payment-intents", [
            'method' => 'MOCK_QRIS',
        ], $headers);

        $intentRes->assertStatus(409);
        $intentRes->assertJsonPath('error.code', 'ORDER_CONFLICT');
        $this->assertStringContainsString('PENDING_PRODUCT_CONTRACT', $intentRes->json('error.message'));
    }

    /**
     * FIX 04: Cart ownership verification & unselected items retention.
     */
    public function test_fix_04_customer_cannot_checkout_items_owned_by_another_customer(): void
    {
        // Customer B creates a cart item
        $cartB = Cart::create([
            'id' => (string) Str::ulid(),
            'customer_id' => 'CUST_VICTIM',
        ]);
        $itemB = CartItem::create([
            'id' => (string) Str::ulid(),
            'cart_id' => $cartB->id,
            'product_id' => 'PROD_01',
            'variant_id' => 'VAR_01',
            'merchant_org_id' => 'ORG_STORE_A',
            'quantity' => 1,
            'unit_price_idr' => 50000,
            'item_total_idr' => 50000,
        ]);

        // Attacker has an active cart
        Cart::create([
            'id' => (string) Str::ulid(),
            'customer_id' => 'CUST_ATTACKER',
        ]);

        // Customer A attempts to checkout using Customer B's item ID
        $headersA = $this->customerHeaders('CUST_ATTACKER');
        $res = $this->postJson('/api/v1/order-barang/checkouts', [
            'address_id' => 'ADDR_01',
            'cart_item_ids' => [$itemB->id],
        ], $headersA);

        $res->assertStatus(403);
        $this->assertStringContainsString('milik pengguna lain', $res->json('error.message'));
    }

    public function test_fix_04_unselected_cart_items_remain_in_cart(): void
    {
        $headers = $this->customerHeaders('CUST_SPLIT_01');
        $cart = Cart::create([
            'id' => (string) Str::ulid(),
            'customer_id' => 'CUST_SPLIT_01',
        ]);
        $item1 = CartItem::create([
            'id' => (string) Str::ulid(),
            'cart_id' => $cart->id,
            'product_id' => 'PROD_01',
            'variant_id' => 'VAR_01',
            'merchant_org_id' => 'ORG_STORE_A',
            'quantity' => 1,
            'unit_price_idr' => 50000,
            'item_total_idr' => 50000,
        ]);
        $item2 = CartItem::create([
            'id' => (string) Str::ulid(),
            'cart_id' => $cart->id,
            'product_id' => 'PROD_02',
            'variant_id' => 'VAR_02',
            'merchant_org_id' => 'ORG_STORE_A',
            'quantity' => 2,
            'unit_price_idr' => 50000,
            'item_total_idr' => 100000,
        ]);

        // Mock Finance quote
        $mockFinance = Mockery::mock(FinanceCheckoutClient::class);
        $mockFinance->shouldReceive('requestCheckoutQuote')
            ->andReturnUsing(function ($payload) {
                $allocations = [];
                foreach ($payload['merchant_orders'] as $mOrd) {
                    $allocations[] = [
                        'merchant_order_id' => $mOrd['merchant_order_id'],
                        'merchant_org_id' => $mOrd['merchant_org_id'],
                        'customer_total_idr' => 60000,
                        'app_fee_allocated_idr' => 1000,
                        'customer_tax_allocated_idr' => 1000,
                    ];
                }
                return [
                    'checkout_group_id' => $payload['checkout_group_id'],
                    'customer_id' => $payload['customer_id'],
                    'customer_total_idr' => 60000,
                    'allocations' => $allocations,
                    'payload_hash' => 'hash_quote',
                ];
            });
        $this->app->instance(FinanceCheckoutClient::class, $mockFinance);

        // Checkout ONLY item1
        $res = $this->postJson('/api/v1/order-barang/checkouts', [
            'address_id' => 'ADDR_01',
            'cart_item_ids' => [$item1->id],
        ], $headers);

        $res->assertStatus(201);

        // Assert: unselected item2 must still be present in the cart!
        $this->assertDatabaseHas('cart_items', [
            'id' => $item2->id,
            'cart_id' => $cart->id,
        ]);

        // Assert: item1 must also still be present until PAID!
        $this->assertDatabaseHas('cart_items', [
            'id' => $item1->id,
            'cart_id' => $cart->id,
        ]);
    }

    /**
     * FIX 05: Payment intent strictly validates amount and expiry.
     */
    public function test_fix_05_payment_intent_rejects_amount_mismatch_from_finance(): void
    {
        $headers = $this->customerHeaders('CUST_TEST_01');

        $mockFinance = Mockery::mock(FinanceCheckoutClient::class);
        $mockFinance->shouldReceive('requestCheckoutQuote')
            ->andReturnUsing(function ($payload) {
                $allocations = [];
                foreach ($payload['merchant_orders'] as $mOrd) {
                    $allocations[] = [
                        'merchant_order_id' => $mOrd['merchant_order_id'],
                        'merchant_org_id' => $mOrd['merchant_org_id'],
                        'customer_total_idr' => 60000,
                        'app_fee_allocated_idr' => 1000,
                        'customer_tax_allocated_idr' => 1000,
                    ];
                }
                return [
                    'checkout_group_id' => $payload['checkout_group_id'],
                    'customer_id' => $payload['customer_id'],
                    'customer_total_idr' => 60000,
                    'allocations' => $allocations,
                    'payload_hash' => 'hash_quote',
                ];
            });
        $mockFinance->shouldReceive('createPaymentIntent')
            ->once()
            ->andReturn([
                'payment_id' => 'PAY_INVALID_AMT',
                'amount_idr' => 999999, // Mismatched! Expected 60000
                'provider' => 'MOCK_QRIS',
                'expires_at' => now()->addHours(6)->toIso8601String(),
            ]);
        $this->app->instance(FinanceCheckoutClient::class, $mockFinance);

        $checkout = $this->postJson('/api/v1/order-barang/checkouts', [
            'address_id' => 'ADDR_01',
            'buy_now_item' => [
                'product_id' => 'PROD_BUYNOW',
                'variant_id' => 'VAR_BUYNOW',
                'quantity' => 1,
                'merchant_org_id' => 'ORG_STORE_A',
            ],
        ], $headers);

        $checkout->assertStatus(201);
        $groupId = $checkout->json('data.checkout_group_id');

        $intentRes = $this->postJson("/api/v1/order-barang/checkouts/{$groupId}/payment-intents", [
            'method' => 'MOCK_QRIS',
        ], $headers);

        $intentRes->assertStatus(409);
        $this->assertStringContainsString('tidak sesuai dengan total tagihan', $intentRes->json('error.message'));
    }

    /**
     * FIX 06: Payment event state guards prevent PAID overwrite by FAILED/EXPIRED.
     */
    public function test_fix_06_paid_status_cannot_be_overwritten_by_failed_or_expired_event(): void
    {
        [$group, $order, $delivery] = $this->createConfirmedOrder('CUST_TEST_01', 'ORG_STORE_A', 100000);

        $headers = $this->internalHeaders();

        // Send FAILED event for this paid group
        $failedPayload = [
            'event_id' => (string) Str::uuid(),
            'event_type' => 'finance.payment.failed.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'FIN_PAY_CONFIRMED',
                'amount_idr' => 100000,
                'currency' => 'IDR',
                'failure_reason' => 'User timed out',
            ],
        ];

        $resFailed = $this->postJson('/internal/v1/order-barang/finance-events', $failedPayload, $headers);
        $resFailed->assertStatus(200);
        $resFailed->assertJsonPath('data.status', 'PROCESSED');

        // Verify order status is STILL CONFIRMED and group STILL PAID
        $order->refresh();
        $this->assertEquals(Order::STATUS_CONFIRMED, $order->status);
        $group->refresh();
        $this->assertEquals('PAID', $group->payment_status_projection);

        // Send EXPIRED event for this paid group
        $expiredPayload = [
            'event_id' => (string) Str::uuid(),
            'event_type' => 'finance.payment.expired.v1',
            'source_service' => 'FINANCE_06',
            'payload' => [
                'checkout_group_id' => $group->id,
                'payment_id' => 'FIN_PAY_CONFIRMED',
                'amount_idr' => 100000,
                'currency' => 'IDR',
            ],
        ];

        $resExpired = $this->postJson('/internal/v1/order-barang/finance-events', $expiredPayload, $headers);
        $resExpired->assertStatus(200);
        $resExpired->assertJsonPath('data.status', 'PROCESSED');

        $order->refresh();
        $this->assertEquals(Order::STATUS_CONFIRMED, $order->status);
        $group->refresh();
        $this->assertEquals('PAID', $group->payment_status_projection);
    }

    /**
     * FIX 07: Unpaid cancellation cannot proceed if Finance is already PAID.
     */
    public function test_fix_07_unpaid_cancellation_rejected_if_finance_already_paid(): void
    {
        $group = CheckoutGroup::create([
            'id' => (string) Str::ulid(),
            'customer_id' => 'CUST_A',
            'address_id' => 'ADDR_01',
            'recipient_snapshot' => ['recipient_name' => 'Budi'],
            'address_snapshot' => ['city' => 'Jakarta'],
            'selected_items_hash' => 'hash123',
            'idempotency_key' => (string) Str::uuid(),
            'orchestration_status' => 'PAYMENT_PENDING',
            'payment_status_projection' => 'PENDING',
            'customer_total_idr' => 50000,
        ]);

        PaymentProjection::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => $group->id,
            'finance_payment_id' => 'PAY_ALREADY_PAID_AT_FINANCE',
            'payment_method' => 'MOCK_QRIS',
            'payment_status' => 'PENDING',
            'amount_idr' => 50000,
            'expires_at' => now()->addHours(6),
            'version' => 1,
        ]);

        // Mock Finance client returning status = 'PAID'
        $mockFinance = Mockery::mock(FinanceCheckoutClient::class);
        $mockFinance->shouldReceive('getCheckout')
            ->with($group->id)
            ->andReturn([
                'payment_status' => 'PAID',
                'customer_total_idr' => 50000,
            ]);
        $this->app->instance(FinanceCheckoutClient::class, $mockFinance);

        $cancelService = $this->app->make(CancellationService::class);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Tagihan telah terkonfirmasi dibayar di Finance Service');

        $cancelService->cancelUnpaidCheckout('CUST_A', $group->id, 'Batal beli');
    }

    /**
     * FIX 08: Persistent refund outbox on paid cancellation.
     */
    public function test_fix_08_paid_cancellation_records_persistent_refund_outbox(): void
    {
        [$group, $order, $delivery] = $this->createConfirmedOrder('CUST_TEST_01', 'ORG_STORE_A', 100000);

        $mockFinance = Mockery::mock(FinanceCheckoutClient::class);
        $mockFinance->shouldReceive('delegateCancellationRefund')
            ->andReturn(['status' => 'REFUND_QUEUED']);
        $this->app->instance(FinanceCheckoutClient::class, $mockFinance);

        $headers = $this->customerHeaders('CUST_TEST_01');
        $res = $this->postJson("/api/v1/order-barang/orders/{$order->id}/cancel", [
            'reason_code' => 'CHANGE_OF_MIND',
            'note' => 'Ingin ganti varian barang.',
        ], $headers);

        $res->assertStatus(200);
        $res->assertJsonPath('data.status', 'CANCELLED');

        // Verify outbox entry exists with retry metadata
        $this->assertDatabaseHas('integration_outbox_events', [
            'event_type' => 'finance.cancellation_refund.v1',
            'aggregate_id' => $order->id,
            'status' => 'SENT',
        ]);
    }

    /**
     * FIX 09: Active hold state blocks auto-completion.
     */
    public function test_fix_09_active_hold_state_blocks_auto_completion(): void
    {
        [$group, $order, $delivery] = $this->createConfirmedOrder('CUST_TEST_01', 'ORG_STORE_A', 100000);

        // Move order to DELIVERED 75 hours ago
        $order->status = Order::STATUS_DELIVERED;
        $order->delivered_at = Carbon::now()->subHours(75);
        $order->is_hold_active = true;
        $order->hold_reason = 'Komplain barang tidak sesuai';
        $order->save();

        $delivery->update([
            'status' => Delivery::STATUS_DELIVERED,
            'proof_reference' => 'PROOF_REF_VALID',
            'proof_verified' => true,
            'delivered_at' => Carbon::now()->subHours(75),
        ]);

        $autoCompletionService = $this->app->make(AutoCompletionService::class);
        $completedCount = $autoCompletionService->processAutoCompletions();

        // Order with active hold must NOT be completed
        $this->assertEquals(0, $completedCount);

        $order->refresh();
        $this->assertEquals(Order::STATUS_DELIVERED, $order->status);

        // When hold is lifted
        $order->is_hold_active = false;
        $order->hold_reason = null;
        $order->save();

        $completedAfterUnhold = $autoCompletionService->processAutoCompletions();
        $this->assertEquals(1, $completedAfterUnhold);

        $order->refresh();
        $this->assertEquals(Order::STATUS_COMPLETED, $order->status);
    }

    /**
     * FIX 10: markDelivered requires proof_reference.
     */
    public function test_fix_10_mark_delivered_requires_proof_reference(): void
    {
        [$group, $order, $delivery] = $this->createConfirmedOrder('CUST_TEST_01', 'ORG_STORE_A', 100000);
        $order->status = Order::STATUS_DELIVERING;
        $order->save();

        $headers = $this->merchantHeaders('USER_MERCH_01', 'ORG_STORE_A');

        // Missing proof_reference
        $resFail = $this->postJson("/api/v1/order-barang/merchant/orders/{$order->id}/delivered", [
            'recipient_name' => 'Budi Santoso',
            'proof_reference' => '',
        ], $headers);

        $resFail->assertStatus(422);

        // Valid proof_reference
        $resSuccess = $this->postJson("/api/v1/order-barang/merchant/orders/{$order->id}/delivered", [
            'recipient_name' => 'Budi Santoso',
            'proof_reference' => 'PROOF_IMG_URL_OR_ID_9988',
        ], $headers);

        $resSuccess->assertStatus(200);
        $resSuccess->assertJsonPath('data.status', 'DELIVERED');

        $order->refresh();
        $this->assertNotNull($order->delivered_at);
        $this->assertEquals('PROOF_IMG_URL_OR_ID_9988', $order->delivery->proof_reference);
    }

    /**
     * FIX 11: Operational schedule unavailable sets response_deadline_at to null.
     */
    public function test_fix_11_schedule_unavailable_sets_deadline_nullable_pending_contract(): void
    {
        [$group, $order, $delivery] = $this->createConfirmedOrder('CUST_TEST_01', 'ORG_NO_SCHEDULE', 100000);
        $order->status = Order::STATUS_PROCESSING;
        $order->save();

        $headers = $this->customerHeaders('CUST_TEST_01');
        $res = $this->postJson("/api/v1/order-barang/orders/{$order->id}/cancellation-requests", [
            'reason_code' => 'STORE_DELAY',
            'note' => 'Toko tidak ada jadwal operasional.',
        ], $headers);

        $res->assertStatus(201);
        $res->assertJsonPath('data.status', 'PENDING');
        $res->assertJsonPath('data.merchant_schedule_source', 'PENDING_MERCHANT_OPERATING_HOURS_CONTRACT');
        $res->assertJsonPath('data.response_deadline_at', null);

        // Verify cancellation request deadline is NULL
        $this->assertDatabaseHas('cancellation_requests', [
            'order_id' => $order->id,
            'status' => 'PENDING',
            'response_deadline_at' => null,
            'merchant_schedule_source' => 'PENDING_MERCHANT_OPERATING_HOURS_CONTRACT',
        ]);
    }

    /**
     * FIX 12: Secret authentication rejects untrusted callers.
     */
    public function test_fix_12_security_rejects_untrusted_gateway_and_service_keys(): void
    {
        // 1. Untrusted gateway key
        $badGatewayRes = $this->getJson('/api/v1/order-barang/cart', [
            'X-Gateway-Key' => 'INVALID_GATEWAY_KEY',
            'X-Actor-User-Id' => 'CUST_TEST_01',
            'X-Actor-Role' => 'CUSTOMER',
        ]);
        $badGatewayRes->assertStatus(403);

        // 2. Untrusted internal service key
        $badServiceRes = $this->postJson('/internal/v1/order-barang/finance-events', [
            'event_id' => 'test-id',
        ], [
            'X-Internal-Service-Key' => 'WRONG_INTERNAL_SECRET',
        ]);
        $badServiceRes->assertStatus(401);
    }
}
