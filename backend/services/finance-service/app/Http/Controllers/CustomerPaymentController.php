<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\FinanceCheckout;
use App\Models\PaymentIntent;
use App\Models\RefundTransaction;
use App\Models\SPayAccount;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerPaymentController extends Controller
{
    public function show(Request $request, string $paymentId): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        $payment = PaymentIntent::with('checkout')->find($paymentId);

        if (!$payment) {
            return ApiResponse::error('PAYMENT_NOT_FOUND', 'Tagihan pembayaran tidak ditemukan.', 404);
        }

        // Ownership verification
        if ($actor && !$actor->isFinanceOps() && $payment->checkout && $payment->checkout->customer_id !== $actor->actorId) {
            return ApiResponse::error('FORBIDDEN_PAYMENT_ACCESS', 'Anda tidak memiliki akses ke tagihan pembayaran ini.', 403);
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
            'expires_at' => $payment->expires_at?->toIso8601String(),
            'paid_at' => $payment->paid_at?->toIso8601String(),
            'payment_instruction' => $payment->instruction_payload,
            'is_real_payment' => false,
            'disclaimer' => 'SIMULASI PEMBAYARAN MOCK - Tidak melibatkan dana nyata perbankan.',
        ]);
    }

    public function receipt(Request $request, string $paymentId): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        $payment = PaymentIntent::with(['checkout.paymentAllocations'])->find($paymentId);

        if (!$payment) {
            return ApiResponse::error('PAYMENT_NOT_FOUND', 'Tagihan pembayaran tidak ditemukan.', 404);
        }

        if ($actor && !$actor->isFinanceOps() && $payment->checkout && $payment->checkout->customer_id !== $actor->actorId) {
            return ApiResponse::error('FORBIDDEN_PAYMENT_ACCESS', 'Anda tidak memiliki akses ke resi pembayaran ini.', 403);
        }

        if ($payment->status !== 'PAID') {
            return ApiResponse::error('PAYMENT_NOT_PAID', 'Resi hanya tersedia untuk pembayaran yang telah berstatus PAID.', 400);
        }

        $checkout = $payment->checkout;

        return ApiResponse::success([
            'receipt_number' => 'RCP-' . substr($payment->id, -8),
            'payment_id' => $payment->id,
            'checkout_group_id' => $checkout?->checkout_group_id,
            'paid_at' => $payment->paid_at?->toIso8601String(),
            'method' => $payment->method,
            'currency' => $payment->currency,
            'total_paid_idr' => $payment->amount_idr,
            'breakdown' => [
                'product_subtotal_idr' => $checkout?->product_subtotal_idr ?? 0,
                'shipping_total_idr' => $checkout?->shipping_total_idr ?? 0,
                'customer_application_fee_idr' => $checkout?->customer_app_fee_idr ?? 0,
                'tax_total_idr' => $checkout?->customer_tax_total_idr ?? 0,
            ],
            'orders' => ($checkout?->paymentAllocations ?? collect())->map(fn ($alloc) => [
                'merchant_order_id' => $alloc->merchant_order_id,
                'merchant_org_id' => $alloc->merchant_org_id,
                'customer_total_idr' => $alloc->customer_total_idr,
            ]),
            'is_real_receipt' => false,
            'mock_label' => 'SIMULASI DEMO RESI SERVIO - Bukan bukti setor pajak atau faktur komersial.',
        ]);
    }

    public function customerRefunds(Request $request): JsonResponse
    {
        $actor = AuthenticatedActor::fromRequest($request);
        $customerId = $actor?->actorId;

        if (!$customerId) {
            return ApiResponse::error('UNAUTHENTICATED', 'Pengguna belum terautentikasi.', 401);
        }

        $query = RefundTransaction::whereHas('paymentAllocation', function ($q) use ($customerId) {
            $q->where('customer_id', $customerId);
        })->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $refunds = $query->paginate((int) $request->query('per_page', 15));

        return ApiResponse::success($refunds);
    }
}
