<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CheckoutGroup;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminGlobalOrdersTest extends TestCase
{
    use RefreshDatabase;

    private function adminHeaders(): array
    {
        return [
            'X-Gateway-Key' => 'servio_local_gateway_key_2026',
            'X-Actor-User-Id' => '8480d446-5855-4cb1-9488-01879e2da2cf',
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
            'X-Actor-Role-Assignment-Id' => '4bc23467-ad37-483f-84fc-e382001b2009',
            'Accept' => 'application/json',
        ];
    }

    private function seedOrder(string $status = Order::STATUS_CONFIRMED, string $paymentStatus = 'PAID'): Order
    {
        $group = CheckoutGroup::create([
            'id' => (string) Str::ulid(),
            'customer_id' => '692f03fd-2362-485a-9a23-a672bbb4533f',
            'address_id' => 'ADDR-01',
            'recipient_snapshot' => ['recipient_name' => 'Ahmad Fauzi', 'recipient_phone' => '08123456789'],
            'address_snapshot' => ['city' => 'Jakarta Pusat', 'address_line' => 'Jl. Kebon Kacang'],
            'selected_items_hash' => 'hash_test',
            'idempotency_key' => (string) Str::uuid(),
            'orchestration_status' => 'PAID_CONFIRMED',
            'payment_status_projection' => $paymentStatus,
            'finance_payment_id' => 'PAY-01M5TEST',
            'customer_total_idr' => 150000,
        ]);

        $order = Order::create([
            'id' => (string) Str::ulid(),
            'order_number' => 'ORD-' . Str::upper(Str::random(8)),
            'checkout_group_id' => $group->id,
            'customer_id' => '692f03fd-2362-485a-9a23-a672bbb4533f',
            'merchant_org_id' => 'ORG-MERCHANT-01',
            'merchant_display_snapshot' => ['name' => 'Toko Suku Cadang Glodok', 'city' => 'Jakarta Pusat'],
            'address_id' => 'ADDR-01',
            'recipient_snapshot' => ['recipient_name' => 'Ahmad Fauzi', 'recipient_phone' => '08123456789'],
            'address_snapshot' => ['city' => 'Jakarta Pusat', 'address_line' => 'Jl. Kebon Kacang'],
            'origin_snapshot' => ['city' => 'Jakarta Pusat', 'address_line' => 'Harco Glodok'],
            'shipping_snapshot' => ['shipping_fee_idr' => 10000, 'distance_km' => 2.5],
            'product_subtotal_idr' => 140000,
            'shipping_customer_idr' => 10000,
            'customer_total_idr' => 150000,
            'payment_status_projection' => $paymentStatus,
            'status' => $status,
            'version' => 1,
        ]);

        OrderItem::create([
            'id' => (string) Str::ulid(),
            'order_id' => $order->id,
            'product_id' => 'PROD-01',
            'variant_id' => 'VAR-01',
            'product_snapshot' => ['name' => 'Kabel Power Standard NYM'],
            'variant_snapshot' => ['sku' => 'SKU-KABEL-01', 'price_idr' => 140000],
            'quantity' => 1,
            'unit_price_idr' => 140000,
            'line_subtotal_idr' => 140000,
        ]);

        return $order;
    }

    public function test_admin_can_list_global_product_orders(): void
    {
        $this->seedOrder(Order::STATUS_CONFIRMED, 'PAID');
        $this->seedOrder(Order::STATUS_PAYMENT_PENDING, 'PENDING');

        $response = $this->withHeaders($this->adminHeaders())
            ->getJson('/api/v1/order-barang/admin/orders');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'code',
            'data' => [
                'current_page',
                'data' => [
                    '*' => [
                        'id',
                        'order_number',
                        'checkout_group_id',
                        'merchant_org_id',
                        'customer_id',
                        'status',
                        'payment_status_projection',
                        'customer_total_idr',
                        'items',
                    ],
                ],
                'total',
                'per_page',
            ],
        ]);
        $this->assertTrue($response->json('success'));
        $this->assertSame(2, $response->json('data.total'));
    }

    public function test_admin_can_filter_orders_by_status_and_search(): void
    {
        $this->seedOrder(Order::STATUS_CONFIRMED, 'PAID');
        $this->seedOrder(Order::STATUS_PAYMENT_PENDING, 'PENDING');

        // Filter status Belum Bayar
        $resUnpaid = $this->withHeaders($this->adminHeaders())
            ->getJson('/api/v1/order-barang/admin/orders?status=BELUM_BAYAR');
        $resUnpaid->assertStatus(200);
        $this->assertSame(1, $resUnpaid->json('data.total'));

        // Filter status Masuk (CONFIRMED)
        $resConfirmed = $this->withHeaders($this->adminHeaders())
            ->getJson('/api/v1/order-barang/admin/orders?status=MASUK');
        $resConfirmed->assertStatus(200);
        $this->assertSame(1, $resConfirmed->json('data.total'));

        // Search query
        $resSearch = $this->withHeaders($this->adminHeaders())
            ->getJson('/api/v1/order-barang/admin/orders?search=Kabel');
        $resSearch->assertStatus(200);
        $this->assertSame(2, $resSearch->json('data.total'));
    }

    public function test_admin_can_get_order_status_counts(): void
    {
        $this->seedOrder(Order::STATUS_CONFIRMED, 'PAID');
        $this->seedOrder(Order::STATUS_PAYMENT_PENDING, 'PENDING');

        $response = $this->withHeaders($this->adminHeaders())
            ->getJson('/api/v1/order-barang/admin/orders/counts');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'code',
            'data' => [
                'total',
                'belum_bayar',
                'masuk',
                'diproses',
                'dikemas',
                'dikirim',
                'diterima',
                'selesai',
                'batal',
                'payment_pending',
                'payment_paid',
                'payment_expired',
                'payment_failed',
            ],
        ]);
        $this->assertSame(2, $response->json('data.total'));
        $this->assertSame(1, $response->json('data.belum_bayar'));
        $this->assertSame(1, $response->json('data.masuk'));
    }

    public function test_admin_can_view_order_detail_with_enriched_data(): void
    {
        $order = $this->seedOrder(Order::STATUS_CONFIRMED, 'PAID');

        $response = $this->withHeaders($this->adminHeaders())
            ->getJson("/api/v1/order-barang/admin/orders/{$order->id}");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'code',
            'data' => [
                'id',
                'order_number',
                'checkout_group_id',
                'merchant_org_id',
                'items',
                'checkout_group',
            ],
        ]);
        $this->assertSame($order->id, $response->json('data.id'));
    }

    public function test_customer_role_cannot_access_admin_orders(): void
    {
        $headers = [
            'X-Gateway-Key' => 'servio_local_gateway_key_2026',
            'X-Actor-User-Id' => '692f03fd-2362-485a-9a23-a672bbb4533f',
            'X-Actor-Role' => 'CUSTOMER',
            'Accept' => 'application/json',
        ];

        $response = $this->withHeaders($headers)
            ->getJson('/api/v1/order-barang/admin/orders');

        $response->assertStatus(403);
        $response->assertJsonPath('error.code', 'ORDER_FORBIDDEN_ROLE');
    }

    public function test_merchant_role_cannot_access_admin_orders(): void
    {
        $headers = [
            'X-Gateway-Key' => 'servio_local_gateway_key_2026',
            'X-Actor-User-Id' => '4bee4c28-6799-4054-87a3-321e29811921',
            'X-Actor-Role' => 'MERCHANT',
            'X-Actor-Org-Id' => '0c1467e7-af68-4b26-ae84-daa41d51aed0',
            'Accept' => 'application/json',
        ];

        $response = $this->withHeaders($headers)
            ->getJson('/api/v1/order-barang/admin/orders');

        $response->assertStatus(403);
        $response->assertJsonPath('error.code', 'ORDER_FORBIDDEN_ROLE');
    }

    public function test_untrusted_gateway_context_is_rejected(): void
    {
        $headers = [
            'X-Gateway-Key' => 'invalid_or_fake_gateway_key',
            'X-Actor-User-Id' => '8480d446-5855-4cb1-9488-01879e2da2cf',
            'X-Actor-Role' => 'ADMIN_OPERATIONS',
            'Accept' => 'application/json',
        ];

        $response = $this->withHeaders($headers)
            ->getJson('/api/v1/order-barang/admin/orders');

        $response->assertStatus(403);
        $response->assertJsonPath('error.code', 'ORDER_UNTRUSTED_GATEWAY_CONTEXT');
    }
}
