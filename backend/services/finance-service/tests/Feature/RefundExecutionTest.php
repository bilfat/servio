<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\HeldOrderFund;
use App\Models\RefundTransaction;
use App\Models\SpayAccount;
use Tests\TestCase;

class RefundExecutionTest extends TestCase
{
    public function test_cancellation_refund_credits_customer_spay_account(): void
    {
        $this->createStandardActivePolicy();

        // 1. Setup quote and paid payment
        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-REFUND-001',
                'customer_id' => 'CUST-REFUND-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-REF-1',
                        'merchant_org_id' => 'ORG-MERCHANT-REF',
                        'product_subtotal_idr' => 100000,
                        'shipping_customer_idr' => 10000,
                        'discount_idr' => 0,
                    ],
                ],
            ]);

        $quote = $quoteRes->json('data');

        $intentRes = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$quote['checkout_group_id']}/payment-intents", [
                'method' => 'QRIS',
                'quote_payload_hash' => $quote['payload_hash'],
            ]);

        $paymentId = $intentRes->json('data.payment_id');

        $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'MOCK-REF-EVT-01',
                'reported_amount_idr' => 113000,
            ]);

        // 2. Cancellation refund request from 05A
        $refundPayload = [
            'source_event_id' => '05A-CANCEL-EVT-001',
            'merchant_order_id' => 'MORD-REF-1',
            'checkout_group_id' => 'CHK-REFUND-001',
            'order_status' => 'CANCELLED',
            'cancelled_at' => now()->toIso8601String(),
            'decision_source' => '05A_ORDER_SERVICE',
            'reason_code' => 'MERCHANT_OUT_OF_STOCK',
        ];

        $refundRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/refunds/order-cancellations', $refundPayload);

        $refundRes->assertStatus(200)
            ->assertJsonPath('data.status', 'SUCCEEDED')
            ->assertJsonPath('data.refund_amount_idr', 113000)
            ->assertJsonPath('data.destination', 'CUSTOMER_SPAY');

        $refundId = $refundRes->json('data.refund_id');

        // Verify Customer S-Pay credited
        $custAccount = SpayAccount::where('owner_type', 'CUSTOMER')
            ->where('owner_external_id', 'CUST-REFUND-01')
            ->first();

        $this->assertNotNull($custAccount);
        $this->assertSame(113000, (int) $custAccount->available_idr);

        // Verify Held fund canceled
        $heldFund = HeldOrderFund::whereHas('allocation', fn ($q) => $q->where('merchant_order_id', 'MORD-REF-1'))->first();
        $this->assertSame('REFUNDED', $heldFund->status);

        // 3. Duplicate replay test
        $replayRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/refunds/order-cancellations', $refundPayload);

        $replayRes->assertStatus(200)
            ->assertJsonPath('data.refund_id', $refundId);

        // Balance should NOT increase on replay
        $custAccount->refresh();
        $this->assertSame(113000, (int) $custAccount->available_idr);

        // 4. Customer checks refund history
        $custHistory = $this->withHeaders($this->customerHeaders('CUST-REFUND-01'))
            ->getJson('/api/v1/finance/me/refunds');

        $custHistory->assertStatus(200)
            ->assertJsonPath('data.total', 1);
    }
}
