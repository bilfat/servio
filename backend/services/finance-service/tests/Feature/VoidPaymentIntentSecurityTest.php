<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\FinanceCheckout;
use App\Models\PaymentIntent;
use App\Services\PaymentVerificationService;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class VoidPaymentIntentSecurityTest extends TestCase
{
    private string $internalKey;

    protected function setUp(): void
    {
        parent::setUp();
        $this->internalKey = (string) (config('finance.internal_service_key') ?: env('FINANCE_INTERNAL_SERVICE_KEY'));
    }

    private function createPendingPaymentIntent(int $amountIdr = 150000): PaymentIntent
    {
        $checkout = FinanceCheckout::create([
            'id' => (string) Str::ulid(),
            'checkout_group_id' => 'CHK-VOID-' . Str::random(8),
            'customer_id' => 'CUST-TEST-01',
            'currency' => 'IDR',
            'status' => 'PENDING',
            'product_subtotal_idr' => $amountIdr,
            'shipping_total_idr' => 0,
            'customer_app_fee_idr' => 0,
            'customer_tax_total_idr' => 0,
            'discount_total_idr' => 0,
            'customer_payable_total_idr' => $amountIdr,
            'pricing_policy_snapshot' => [],
            'tax_snapshot' => [],
            'checkout_payload_hash' => hash('sha256', 'test_quote'),
            'quoted_at' => now(),
            'expires_at' => now()->addHours(6),
        ]);

        return PaymentIntent::create([
            'id' => (string) Str::ulid(),
            'finance_checkout_id' => $checkout->id,
            'amount_idr' => $amountIdr,
            'currency' => 'IDR',
            'status' => 'PENDING',
            'method' => 'MOCK_QRIS',
            'provider_reference' => 'REF-' . Str::random(8),
            'instruction_payload' => ['qr_string' => 'mock_qr'],
            'invoice_ref' => 'INV-VOID-' . strtoupper(Str::random(6)),
            'is_active' => true,
            'issued_at' => now(),
            'expires_at' => now()->addHours(6),
        ]);
    }

    public function test_void_pending_payment_intent_succeeds_and_prevents_subsequent_payment(): void
    {
        $payment = $this->createPendingPaymentIntent(200000);

        // 1. Call void endpoint via internal service key
        $response = $this->withHeaders([
            'X-Internal-Service-Key' => $this->internalKey,
            'Accept' => 'application/json',
        ])->postJson("/internal/v1/finance/payments/{$payment->id}/void");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'payment_id' => $payment->id,
                'status' => 'CANCELLED',
            ],
        ]);

        $payment->refresh();
        $this->assertEquals('CANCELLED', $payment->status);
        $this->assertFalse($payment->is_active);

        // 2. CRITICAL SECURITY ASSERTION:
        // Trying to simulate payment on a CANCELLED payment intent must be REJECTED!
        $verificationService = app(\App\Domain\Finance\Payments\PaymentVerificationService::class);

        try {
            $verificationService->simulatePaymentOutcome(
                paymentId: $payment->id,
                outcome: 'SUCCESS',
                providerEventId: 'EVT-' . Str::random(8),
                reportedAmountIdr: 200000
            );
            $this->fail('Expected HttpException 409 was not thrown for cancelled payment.');
        } catch (HttpException $e) {
            $this->assertEquals(409, $e->getStatusCode());
            $this->assertStringContainsString('dibatalkan', $e->getMessage());
        }
    }

    public function test_void_duplicate_request_is_idempotent(): void
    {
        $payment = $this->createPendingPaymentIntent(100000);

        // First void
        $this->withHeaders([
            'X-Internal-Service-Key' => $this->internalKey,
            'Accept' => 'application/json',
        ])->postJson("/internal/v1/finance/payments/{$payment->id}/void")->assertStatus(200);

        // Duplicate void
        $duplicateResponse = $this->withHeaders([
            'X-Internal-Service-Key' => $this->internalKey,
            'Accept' => 'application/json',
        ])->postJson("/internal/v1/finance/payments/{$payment->id}/void");

        $duplicateResponse->assertStatus(200);
        $duplicateResponse->assertJson([
            'success' => true,
            'data' => [
                'payment_id' => $payment->id,
                'status' => 'CANCELLED',
                'message' => 'Payment intent sudah dibatalkan sebelumnya.',
            ],
        ]);
    }

    public function test_void_already_paid_payment_returns_409(): void
    {
        $payment = $this->createPendingPaymentIntent(150000);
        $payment->update(['status' => 'PAID']);

        $response = $this->withHeaders([
            'X-Internal-Service-Key' => $this->internalKey,
            'Accept' => 'application/json',
        ])->postJson("/internal/v1/finance/payments/{$payment->id}/void");

        $response->assertStatus(409);
        $response->assertJson([
            'success' => false,
            'error' => [
                'code' => 'PAYMENT_ALREADY_PAID',
            ],
        ]);
    }

    public function test_void_non_existent_payment_returns_404(): void
    {
        $response = $this->withHeaders([
            'X-Internal-Service-Key' => $this->internalKey,
            'Accept' => 'application/json',
        ])->postJson('/internal/v1/finance/payments/NON-EXISTENT-ID/void');

        $response->assertStatus(404);
        $response->assertJson([
            'success' => false,
            'error' => [
                'code' => 'PAYMENT_NOT_FOUND',
            ],
        ]);
    }
}
