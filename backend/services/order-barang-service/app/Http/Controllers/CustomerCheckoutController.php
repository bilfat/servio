<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Cancellation\CancellationService;
use App\Domain\Checkout\CheckoutService;
use App\Infrastructure\Finance\FinanceCheckoutClient;
use App\Models\CheckoutGroup;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerCheckoutController extends Controller
{
    public function __construct(
        protected CheckoutService $checkoutService,
        protected CancellationService $cancellationService,
        protected FinanceCheckoutClient $financeClient,
    ) {}

    public function quote(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'address_id' => 'required|string',
            'cart_item_ids' => 'nullable|array',
            'cart_item_ids.*' => 'string',
            'buy_now_item' => 'nullable|array',
            'buy_now_item.product_id' => 'required_with:buy_now_item|string',
            'buy_now_item.variant_id' => 'required_with:buy_now_item|string',
            'buy_now_item.quantity' => 'required_with:buy_now_item|integer|min:1',
            'buy_now_item.merchant_org_id' => 'nullable|string',
            'merchant_notes' => 'nullable|array',
        ]);

        $quote = $this->checkoutService->previewQuote(
            customerId: $actor->id,
            cartItemIds: $validated['cart_item_ids'] ?? null,
            buyNowItem: $validated['buy_now_item'] ?? null,
            addressId: $validated['address_id'],
            merchantNotes: $validated['merchant_notes'] ?? []
        );

        return ApiResponse::success($quote, 'ORDER_CHECKOUT_QUOTED');
    }

    public function checkout(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'address_id' => 'required|string',
            'cart_item_ids' => 'nullable|array',
            'cart_item_ids.*' => 'string',
            'buy_now_item' => 'nullable|array',
            'buy_now_item.product_id' => 'required_with:buy_now_item|string',
            'buy_now_item.variant_id' => 'required_with:buy_now_item|string',
            'buy_now_item.quantity' => 'required_with:buy_now_item|integer|min:1',
            'buy_now_item.merchant_org_id' => 'nullable|string',
            'merchant_notes' => 'nullable|array',
        ]);

        $idempotencyKey = (string) ($request->header('Idempotency-Key') ?: $request->input('idempotency_key') ?: \Illuminate\Support\Str::uuid());

        $checkout = $this->checkoutService->createCheckout(
            customerId: $actor->id,
            addressId: $validated['address_id'],
            cartItemIds: $validated['cart_item_ids'] ?? null,
            buyNowItem: $validated['buy_now_item'] ?? null,
            merchantNotes: $validated['merchant_notes'] ?? [],
            idempotencyKey: $idempotencyKey
        );

        return ApiResponse::success($checkout, 'ORDER_CHECKOUT_CREATED', 201);
    }

    public function createPaymentIntent(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'method' => 'required|string|in:QRIS,VA,MOCK_QRIS,MOCK_VA,MOCK_VA_BCA,MOCK_VA_BRI,MOCK_VA_MANDIRI,MOCK_VA_BNI',
        ]);

        $intent = $this->checkoutService->createPaymentIntent(
            customerId: $actor->id,
            checkoutGroupId: $id,
            method: $validated['method']
        );

        return ApiResponse::success($intent, 'PAYMENT_INTENT_CREATED', 201);
    }

    public function showCheckout(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $group = CheckoutGroup::where('id', $id)
            ->where('customer_id', $actor->id)
            ->with(['orders.items', 'paymentProjection'])
            ->first();

        if (!$group) {
            return ApiResponse::error('CHECKOUT_NOT_FOUND', 'Checkout group tidak ditemukan.', 404);
        }

        return ApiResponse::success($group, 'CHECKOUT_LOADED');
    }

    public function showPayment(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $group = CheckoutGroup::where('id', $id)
            ->where('customer_id', $actor->id)
            ->with('paymentProjection')
            ->first();

        if (!$group) {
            return ApiResponse::error('CHECKOUT_NOT_FOUND', 'Checkout group tidak ditemukan.', 404);
        }

        $projection = $group->paymentProjection;

        return ApiResponse::success([
            'checkout_group_id' => $group->id,
            'finance_payment_id' => $group->finance_payment_id,
            'payment_status' => $projection?->payment_status ?? $group->payment_status_projection,
            'amount_idr' => $projection?->amount_idr ?? $group->customer_total_idr,
            'currency' => $group->currency,
            'expires_at' => $group->finance_expires_at?->toIso8601String(),
            'paid_at' => $projection?->paid_at?->toIso8601String(),
        ], 'PAYMENT_STATUS_LOADED');
    }

    public function cancelUnpaid(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'reason_code' => 'required|string',
        ]);

        $result = $this->cancellationService->cancelUnpaidCheckout(
            customerId: $actor->id,
            checkoutGroupId: $id,
            reasonCode: $validated['reason_code']
        );

        return ApiResponse::success($result, 'CHECKOUT_UNPAID_CANCELLED');
    }
}
