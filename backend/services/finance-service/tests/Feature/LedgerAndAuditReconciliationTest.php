<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\FinanceAuditLog;
use Tests\TestCase;

class LedgerAndAuditReconciliationTest extends TestCase
{
    public function test_reconciliation_reports_balanced_ledger(): void
    {
        $this->createStandardActivePolicy();

        // 1. Run a full checkout + payment
        $quoteRes = $this->withHeaders($this->internalHeaders())
            ->postJson('/internal/v1/finance/checkout-quotes', [
                'checkout_group_id' => 'CHK-RECON-001',
                'customer_id' => 'CUST-RECON-01',
                'currency' => 'IDR',
                'validated_by_order_service' => true,
                'merchant_orders' => [
                    [
                        'merchant_order_id' => 'MORD-RECON-1',
                        'merchant_org_id' => 'ORG-MERCHANT-RECON',
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
                'provider_event_id' => 'MOCK-RECON-EVT-01',
                'reported_amount_idr' => 113000,
            ]);

        // 2. Query Ops Reconciliation
        $reconRes = $this->withHeaders($this->financeOpsHeaders())
            ->getJson('/api/v1/finance/ops/reconciliation');

        $reconRes->assertStatus(200)
            ->assertJsonPath('data.is_double_entry_balanced', true)
            ->assertJsonPath('data.discrepancy_idr', 0)
            ->assertJsonPath('data.audit_status', 'CLEAN_AND_BALANCED');

        // 3. Customer cannot access ops reconciliation (403)
        $unauthRecon = $this->withHeaders($this->customerHeaders())
            ->getJson('/api/v1/finance/ops/reconciliation');

        $unauthRecon->assertStatus(403);

        // 4. Query audit logs
        $logsRes = $this->withHeaders($this->financeOpsHeaders())
            ->getJson('/api/v1/finance/ops/audit-logs');

        $logsRes->assertStatus(200)
            ->assertJsonPath('data.total', fn ($total) => $total > 0);
    }
}
