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
        if ($actor && !$actor->isFinanceOps() && !$actor->isAdmin() && !$actor->isCeo() && $payment->checkout && $payment->checkout->customer_id !== $actor->actorId) {
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

        if ($actor && !$actor->isFinanceOps() && !$actor->isAdmin() && !$actor->isCeo() && $payment->checkout && $payment->checkout->customer_id !== $actor->actorId) {
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

        $query = RefundTransaction::with(['paymentAllocation.checkout', 'customerSPayAccount'])
            ->where(function ($q) use ($customerId) {
                $q->whereHas('paymentAllocation', function ($allocQ) use ($customerId) {
                    $allocQ->where('customer_id', $customerId);
                })->orWhereHas('customerSPayAccount', function ($spayQ) use ($customerId) {
                    $spayQ->where('owner_external_id', $customerId);
                });
            })->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $refunds = $query->paginate((int) $request->query('per_page', 15));
        $refunds->getCollection()->transform(function (RefundTransaction $r) {
            $alloc = $r->paymentAllocation;
            $arr = $r->toArray();
            $orderId = $alloc?->merchant_order_id ?? '';

            $isJasa = str_contains($orderId, '-diagnosis') ||
                      str_contains($orderId, '-service_execution') ||
                      str_starts_with($orderId, 'SRV-') ||
                      str_contains($orderId, '-jasa');

            $isAfterSales = ($r->refund_reason_scope === 'AFTER_SALES_07' ||
                str_starts_with((string) $r->order_cancellation_event_id, 'AS-REF-') ||
                str_starts_with((string) $r->source_funding_reference, 'case-') ||
                str_starts_with((string) $r->order_cancellation_event_id, 'case'));

            $caseId = null;
            if ($isAfterSales) {
                $caseId = $r->source_funding_reference ??
                    str_replace('AS-REF-', '', (string) $r->order_cancellation_event_id);
            }

            $arr['payment_id'] = $r->payment_intent_id;
            $arr['merchant_order_id'] = $orderId ?: null;
            $arr['merchant_org_id'] = $alloc?->merchant_org_id;
            $arr['checkout_group_id'] = $alloc?->checkout?->checkout_group_id;
            $arr['source_event_id'] = $r->order_cancellation_event_id ?? $r->id;
            $arr['decision_source'] = $isAfterSales ? 'AFTER_SALES_07' : 'ORDER_05A';
            $arr['source_kind'] = $isJasa ? 'JASA_05B' : 'BARANG_05A';
            $arr['case_id'] = $caseId;
            $arr['reason_code'] = $r->refund_reason_scope ?? 'ORDER_REFUND';
            $arr['gross_refund_amount_idr'] = $r->requested_amount_idr;
            $arr['customer_net_refund_idr'] = $r->credited_amount_idr > 0 ? $r->credited_amount_idr : $r->requested_amount_idr;
            $arr['product_subtotal_idr'] = $alloc?->product_subtotal_idr ?? 0;
            $arr['shipping_customer_idr'] = $alloc?->shipping_customer_idr ?? 0;
            $arr['app_fee_allocated_idr'] = $alloc?->app_fee_allocated_idr ?? 0;
            $arr['processed_at'] = $r->credited_at?->toIso8601String() ?? $r->funded_at?->toIso8601String();
            return $arr;
        });

        return ApiResponse::success($refunds);
    }
}
