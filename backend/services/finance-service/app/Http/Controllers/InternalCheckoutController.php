<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Finance\Payments\PaymentIntentService;
use App\Domain\Finance\Pricing\CheckoutPricingService;
use App\Http\Requests\CheckoutQuoteRequest;
use App\Http\Requests\CreatePaymentIntentRequest;
use App\Models\FinanceCheckout;
use App\Models\PaymentIntent;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class InternalCheckoutController extends Controller
{
    public function __construct(
        private readonly CheckoutPricingService $pricingService,
        private readonly PaymentIntentService $paymentIntentService,
    ) {}

    public function createQuote(CheckoutQuoteRequest $request): JsonResponse
    {
        $checkout = $this->pricingService->quoteCheckout($request->validated());

        $allocations = $checkout->paymentAllocations->map(fn ($alloc) => [
            'merchant_order_id' => $alloc->merchant_order_id,
            'merchant_org_id' => $alloc->merchant_org_id,
            'product_subtotal_idr' => $alloc->product_subtotal_idr,
            'shipping_customer_idr' => $alloc->shipping_customer_idr,
            'app_fee_allocated_idr' => $alloc->app_fee_allocated_idr,
            'discount_allocated_idr' => $alloc->discount_allocated_idr,
            'discount_bearer' => $alloc->fee_snapshot['discount_bearer'] ?? 'MERCHANT',
            'customer_total_idr' => $alloc->customer_total_idr,
            'merchant_commission_idr' => $alloc->merchant_commission_idr,
            'merchant_net_entitlement_idr' => $alloc->merchant_net_entitlement_idr,
        ]);

        return ApiResponse::success([
            'checkout_group_id' => $checkout->checkout_group_id,
            'customer_id' => $checkout->customer_id,
            'quote_status' => $checkout->status,
            'currency' => $checkout->currency,
            'product_subtotal_idr' => $checkout->product_subtotal_idr,
            'shipping_total_idr' => $checkout->shipping_total_idr,
            'customer_application_fee_idr' => $checkout->customer_app_fee_idr,
            'tax_total_idr' => $checkout->customer_tax_total_idr,
            'tax_status' => 'MOCK_FIXTURE',
            'customer_total_idr' => $checkout->customer_payable_total_idr,
            'allocations' => $allocations,
            'policy_versions' => $checkout->pricing_policy_snapshot,
            'payload_hash' => $checkout->checkout_payload_hash,
        ], 201);
    }

    public function createPaymentIntent(CreatePaymentIntentRequest $request, string $checkoutGroupId): JsonResponse
    {
        $data = $request->validated();

        $payment = $this->paymentIntentService->createPaymentIntent(
            checkoutGroupId: $checkoutGroupId,
            method: $data['method'],
            quotePayloadHash: $data['quote_payload_hash'],
            orderQuoteRevision: $data['order_quote_revision'] ?? 1
        );

        return ApiResponse::success([
            'payment_id' => $payment->id,
            'checkout_group_id' => $checkoutGroupId,
            'method' => $payment->method,
            'provider' => $payment->provider,
            'status' => $payment->status,
            'amount_idr' => $payment->amount_idr,
            'currency' => $payment->currency,
            'expires_at' => $payment->expires_at?->toIso8601String(),
            'payment_instruction' => $payment->instruction_payload,
            'is_real_payment' => false,
        ], 201);
    }

    public function showCheckout(string $checkoutGroupId): JsonResponse
    {
        $checkout = FinanceCheckout::with(['paymentAllocations', 'paymentIntents'])->where('checkout_group_id', $checkoutGroupId)->first();

        if (!$checkout) {
            return ApiResponse::error('CHECKOUT_NOT_FOUND', 'Data checkout tidak ditemukan.', 404);
        }

        return ApiResponse::success($checkout);
    }

    public function showPayment(string $paymentId): JsonResponse
    {
        $payment = PaymentIntent::with(['checkout.paymentAllocations', 'events'])->find($paymentId);

        if (!$payment) {
            return ApiResponse::error('PAYMENT_NOT_FOUND', 'Data payment intent tidak ditemukan.', 404);
        }

        // Auto-expire check
        if ($payment->status === 'PENDING' && $payment->expires_at && now()->gte($payment->expires_at)) {
            $payment->update(['status' => 'EXPIRED', 'is_active' => false]);
            $payment->checkout?->update(['status' => 'EXPIRED']);
        }

        return ApiResponse::success([
            'payment_id' => $payment->id,
            'checkout_group_id' => $payment->checkout->checkout_group_id ?? null,
            'method' => $payment->method,
            'provider' => $payment->provider,
            'status' => $payment->status,
            'amount_idr' => $payment->amount_idr,
            'currency' => $payment->currency,
            'paid_at' => $payment->paid_at?->toIso8601String(),
            'expires_at' => $payment->expires_at?->toIso8601String(),
            'allocations' => $payment->checkout->paymentAllocations ?? [],
            'is_real_payment' => false,
        ]);
    }
}
