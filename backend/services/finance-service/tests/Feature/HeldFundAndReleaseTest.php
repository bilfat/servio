<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\Finance\Funds\HeldFundService;
use App\Models\HeldOrderFund;
use App\Models\SPayAccount;
use Carbon\CarbonImmutable;
use Tests\TestCase;

class HeldFundAndReleaseTest extends TestCase
{
    public function test_held_fund_lifecycle_and_120_hour_release(): void
    {
        $this->createStandardActivePolicy();

        // 1. Create quote & payment intent
        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-HOLD-001',
                'customer_id' => 'CUST-001',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-HOLD-1',
                        'merchant_org_id' => 'ORG-MERCHANT-ALPHA',
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

        // 2. Mark PAID via simulation
        $this->withHeaders($this->financeOpsHeaders())
            ->postJson("/api/v1/finance/demo/payments/{$paymentId}/simulate", [
                'outcome' => 'SUCCESS',
                'provider_event_id' => 'MOCK-HOLD-EVT-01',
                'reported_amount_idr' => 113000,
            ]);

        $heldFund = HeldOrderFund::whereHas('allocation', fn ($q) => $q->where('merchant_order_id', 'MORD-HOLD-1'))->first();
        $this->assertNotNull($heldFund);
        $this->assertSame('HELD', $heldFund->status);
        $this->assertSame(105000, (int) $heldFund->merchant_entitlement_idr);

        // 3. Receive ORDER_COMPLETED event from 05A
        $completedTime = CarbonImmutable::now('UTC')->subHours(121); // simulate 121 hours ago
        $eventRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/order-events', [
                'event_id' => 'EVT-ORD-CMP-001',
                'event_type' => 'ORDER_COMPLETED',
                'merchant_order_id' => 'MORD-HOLD-1',
                'payload' => [
                    'completed_at' => $completedTime->toIso8601String(),
                ],
            ]);

        $eventRes->assertStatus(200);

        // 4. Process matured funds release
        $heldService = app(HeldFundService::class);
        $releasedCount = $heldService->releaseMaturedHeldFunds();

        $this->assertSame(1, $releasedCount);

        // Verify status is RELEASED_TO_SPAY
        $this->assertDatabaseHas('held_order_funds', [
            'id' => $heldFund->id,
            'status' => 'RELEASED_TO_SPAY',
        ]);

        // Verify Merchant S-Pay account credited
        $spayAccount = SPayAccount::where('owner_type', 'MERCHANT_ORGANIZATION')
            ->where('owner_external_id', 'ORG-MERCHANT-ALPHA')
            ->first();

        $this->assertNotNull($spayAccount);
        $this->assertSame(105000, (int) $spayAccount->available_idr);

        // 5. Merchant queries organization account
        $merchantView = $this->withHeaders($this->merchantHeaders('ORG-MERCHANT-ALPHA'))
            ->getJson('/api/v1/finance/spay/organizations/ORG-MERCHANT-ALPHA');

        $merchantView->assertStatus(200)
            ->assertJsonPath('data.available_idr', 105000)
            ->assertJsonPath('data.can_withdraw', true);
    }
}
