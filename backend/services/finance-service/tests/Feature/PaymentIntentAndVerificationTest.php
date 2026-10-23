<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\LedgerLine;
use App\Models\PaymentIntent;
use Tests\TestCase;

class PaymentIntentAndVerificationTest extends TestCase
{
    private function setupTestQuote(): array
    {
        $this->createStandardActivePolicy();

        $payload = [
            'checkout_group_id' => 'CHK-PAY-001',
            'customer_id' => 'CUST-001',
            'currency' => 'IDR',
            'validated_by_order_service' => true,
            'order_quote_revision' => 1,
            'merchant_orders' => [
                [
                    'merchant_order_id' => 'MORD-PAY-A',
                    'merchant_org_id' => 'ORG-MERCHANT-A',
                    'product_subtotal_idr' => 100000,
                    'shipping_customer_idr' => 10000,
                    'discount_idr' => 0,
                ],
            ],
        ];

        $res = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', $payload);

        return $res->json('data');
    }

    public function test_create_payment_intent_and_demo_simulate_paid(): void
    {
        $quoteData = $this->setupTestQuote();

        // 1. Create payment intent (05A -> 06)
        $intentPayload = [
            'method' => 'QRIS',
            'quote_payload_hash' => $quoteData['payload_hash'],
            'order_quote_revision' => 1,
        ];

        $intentRes = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$quoteData['checkout_group_id']}/payment-intents", $intentPayload);

        $intentRes->assertStatus(201)
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.amount_idr', 113000)
            ->assertJsonPath('data.is_real_payment', false);

        $paymentId = $intentRes->json('data.payment_id');

        // 2. Customer can view pending payment
        $custView = $this->withHeaders($this->customerHeaders('CUST-001'))
            ->getJson("/api/v1/finance/payments/{$paymentId}");

        $custView->assertStatus(200)
            ->assertJsonPath('data.status', 'PENDING')
            ->assertJsonPath('data.amount_idr', 113000);

        // 3. Receipt cannot be viewed when pending (400)
        $receiptPending = $this->withHeaders($this->customerHeaders('CUST-001'))
            ->getJson("/api/v1/finance/payments/{$paymentId}/receipt");

        $receiptPending->assertStatus(400);

        // 4. Operator simulates payment success
        $simPayload = [
            'outcome' => 'SUCCESS',
            'provider_event_id' => 'MOCK-PAY-EVT-001',
            'reported_amount_idr' => 113000,
        ];

        $simRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", $simPayload);

        $simRes->assertStatus(200)
            ->assertJsonPath('data.status', 'PAID');

        // Verify PaymentIntent is PAID
        $this->assertDatabaseHas('payment_intents', [
            'id' => $paymentId,
            'status' => 'PAID',
        ]);

        // Verify Held funds created
        $this->assertDatabaseHas('held_order_funds', [
            'status' => 'HELD',
            'merchant_entitlement_idr' => 105000,
        ]);

        // Verify Balanced Ledger Lines
        $totalDebit = (int) LedgerLine::where('entry_side', 'DEBIT')->sum('amount_idr');
        $totalCredit = (int) LedgerLine::where('entry_side', 'CREDIT')->sum('amount_idr');
        $this->assertSame($totalDebit, $totalCredit);
        $this->assertGreaterThan(0, $totalDebit);

        // 5. Customer can now view receipt
        $receiptPaid = $this->withHeaders($this->customerHeaders('CUST-001'))
            ->getJson("/api/v1/finance/payments/{$paymentId}/receipt");

        $receiptPaid->assertStatus(200)
            ->assertJsonPath('data.total_paid_idr', 113000)
            ->assertJsonPath('data.is_real_receipt', false);
    }

    public function test_payment_simulation_amount_mismatch_rejected(): void
    {
        $quoteData = $this->setupTestQuote();

        $intentRes = $this->withHeaders($this->internalHeaders())
            ->postJson("/internal/v1/finance/checkouts/{$quoteData['checkout_group_id']}/payment-intents", [
                'method' => 'QRIS',
                'quote_payload_hash' => $quoteData['payload_hash'],
            ]);

        $paymentId = $intentRes->json('data.payment_id');

        $simRes = $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'MOCK-PAY-EVT-WRONG-AMT',
                'reported_amount_idr' => 50000, // incorrect
            ]);

        $simRes->assertStatus(422);
    }
}
