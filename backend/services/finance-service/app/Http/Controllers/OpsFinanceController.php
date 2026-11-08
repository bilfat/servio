<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\FinanceAuditLog;
use App\Models\HeldOrderFund;
use App\Models\LedgerLine;
use App\Models\PaymentAllocation;
use App\Models\PaymentIntent;
use App\Models\RefundTransaction;
use App\Models\WithdrawalRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OpsFinanceController extends Controller
{
    public function payments(Request $request): JsonResponse
    {
        $query = PaymentIntent::with(['checkout'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($method = $request->query('method')) {
            $query->where('method', $method);
        }

        $payments = $query->paginate((int) $request->query('per_page', 20));

        return ApiResponse::success($payments);
    }

    public function paymentAllocations(Request $request): JsonResponse
    {
        $query = PaymentAllocation::with('checkout')->latest();

        if ($merchantOrgId = $request->query('merchant_org_id')) {
            $query->where('merchant_org_id', $merchantOrgId);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $allocations = $query->paginate((int) $request->query('per_page', 20));

        return ApiResponse::success($allocations);
    }

    public function refunds(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $channel = $request->query('channel'); // ALL, BARANG_05A, JASA_05B
        $q = $request->query('q');
        $customerId = $request->query('customer_id');

        // Base query for counting / stats
        $baseQuery = RefundTransaction::with(['paymentAllocation.checkout', 'customerSPayAccount']);

        // Helper closures for channel identification
        $isJasaCondition = function ($subQuery) {
            $subQuery->whereHas('paymentAllocation', function ($allocQ) {
                $allocQ->where('merchant_order_id', 'LIKE', '%-diagnosis%')
                       ->orWhere('merchant_order_id', 'LIKE', '%-service_execution%')
                       ->orWhere('merchant_order_id', 'LIKE', 'SRV-%')
                       ->orWhere('merchant_order_id', 'LIKE', '%-jasa%');
            });
        };

        $isBarangCondition = function ($subQuery) {
            $subQuery->where(function ($bQ) {
                $bQ->whereHas('paymentAllocation', function ($allocQ) {
                    $allocQ->where('merchant_order_id', 'NOT LIKE', '%-diagnosis%')
                           ->where('merchant_order_id', 'NOT LIKE', '%-service_execution%')
                           ->where('merchant_order_id', 'NOT LIKE', 'SRV-%')
                           ->where('merchant_order_id', 'NOT LIKE', '%-jasa%');
                })->orWhereNull('payment_allocation_id');
            });
        };

        // Query for actual listing
        $query = RefundTransaction::with(['paymentAllocation.checkout', 'customerSPayAccount'])->latest();

        if ($status && $status !== 'ALL') {
            $query->where('status', $status);
        }

        if ($customerId) {
            $query->where(function ($subQ) use ($customerId) {
                $subQ->whereHas('paymentAllocation', function ($allocQ) use ($customerId) {
                    $allocQ->where('customer_id', $customerId);
                })->orWhereHas('customerSPayAccount', function ($spayQ) use ($customerId) {
                    $spayQ->where('owner_external_id', $customerId);
                });
            });
        }

        if ($channel === 'BARANG_05A') {
            $isBarangCondition($query);
        } elseif ($channel === 'JASA_05B') {
            $isJasaCondition($query);
        }

        if (!empty($q)) {
            $query->where(function ($subQ) use ($q) {
                $subQ->where('id', 'LIKE', "%{$q}%")
                     ->orWhere('payment_allocation_id', 'LIKE', "%{$q}%")
                     ->orWhere('payment_intent_id', 'LIKE', "%{$q}%")
                     ->orWhere('customer_spay_account_id', 'LIKE', "%{$q}%")
                     ->orWhere('order_cancellation_event_id', 'LIKE', "%{$q}%")
                     ->orWhere('source_funding_reference', 'LIKE', "%{$q}%")
                     ->orWhereHas('paymentAllocation', function ($allocQ) use ($q) {
                         $allocQ->where('merchant_order_id', 'LIKE', "%{$q}%")
                                ->orWhere('customer_id', 'LIKE', "%{$q}%");
                     });
            });
        }

        $refunds = $query->paginate((int) $request->query('per_page', 20));

        // Compute summary metrics across all records in DB
        $allRefunds = RefundTransaction::with('paymentAllocation')->get();
        $totalCount = $allRefunds->count();
        $pendingProcessingCount = $allRefunds->whereIn('status', ['PENDING', 'PROCESSING'])->count();
        $succeededCount = $allRefunds->where('status', 'SUCCEEDED')->count();
        $failedCount = $allRefunds->where('status', 'FAILED')->count();
        $reversedCount = $allRefunds->where('status', 'REVERSED')->count();
        $totalCreditedNetIdr = (int) $allRefunds->where('status', 'SUCCEEDED')->sum('credited_amount_idr');
        $totalCreditedGrossIdr = (int) $allRefunds->whereIn('status', ['SUCCEEDED', 'REVERSED'])->sum('credited_amount_idr');

        $countBarang = 0;
        $countJasa = 0;
        foreach ($allRefunds as $item) {
            $orderId = $item->paymentAllocation?->merchant_order_id ?? '';
            $isJasa = str_contains($orderId, '-diagnosis') ||
                      str_contains($orderId, '-service_execution') ||
                      str_starts_with($orderId, 'SRV-') ||
                      str_contains($orderId, '-jasa');
            if ($isJasa) {
                $countJasa++;
            } else {
                $countBarang++;
            }
        }

        $summary = [
            'total_count' => $totalCount,
            'pending_processing_count' => $pendingProcessingCount,
            'succeeded_count' => $succeededCount,
            'failed_count' => $failedCount,
            'reversed_count' => $reversedCount,
            'total_credited_net_idr' => $totalCreditedNetIdr,
            'total_credited_gross_idr' => $totalCreditedGrossIdr,
            'count_all' => $totalCount,
            'count_barang_05a' => $countBarang,
            'count_jasa_05b' => $countJasa,
        ];

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
                str_starts_with((string) $r->source_funding_reference, 'case-'));

            $caseId = null;
            if ($isAfterSales) {
                $caseId = $r->source_funding_reference ??
                    str_replace('AS-REF-', '', (string) $r->order_cancellation_event_id);
            }

            $arr['merchant_order_id'] = $orderId ?: null;
            $arr['merchant_org_id'] = $alloc?->merchant_org_id;
            $arr['customer_id'] = $alloc?->customer_id ?? $r->customerSPayAccount?->owner_external_id;
            $arr['checkout_group_id'] = $alloc?->checkout?->checkout_group_id;
            $arr['product_subtotal_idr'] = $alloc?->product_subtotal_idr ?? 0;
            $arr['shipping_customer_idr'] = $alloc?->shipping_customer_idr ?? 0;
            $arr['app_fee_allocated_idr'] = $alloc?->app_fee_allocated_idr ?? 0;
            $arr['source_kind'] = $isJasa ? 'JASA_05B' : 'BARANG_05A';
            $arr['is_after_sales'] = $isAfterSales;
            $arr['case_id'] = $caseId;
            return $arr;
        });

        $response = $refunds->toArray();
        $response['summary'] = $summary;

        return ApiResponse::success($response);
    }

    public function showRefund(Request $request, string $id): JsonResponse
    {
        $refund = RefundTransaction::with(['paymentAllocation.checkout', 'customerSPayAccount', 'intent'])->find($id);

        if (!$refund) {
            return ApiResponse::error('NOT_FOUND', "Transaksi refund {$id} tidak ditemukan.", 404);
        }

        $alloc = $refund->paymentAllocation;
        $orderId = $alloc?->merchant_order_id ?? '';
        $isJasa = str_contains($orderId, '-diagnosis') ||
                  str_contains($orderId, '-service_execution') ||
                  str_starts_with($orderId, 'SRV-') ||
                  str_contains($orderId, '-jasa');

        $isAfterSales = ($refund->refund_reason_scope === 'AFTER_SALES_07' ||
            str_starts_with((string) $refund->order_cancellation_event_id, 'AS-REF-') ||
            str_starts_with((string) $refund->source_funding_reference, 'case-'));

        $caseId = $isAfterSales
            ? ($refund->source_funding_reference ?? str_replace('AS-REF-', '', (string) $refund->order_cancellation_event_id))
            : null;

        $movements = \App\Models\SPayMovement::where('source_type', 'RefundTransaction')
            ->where('source_id', $refund->id)
            ->get();

        $auditLogs = FinanceAuditLog::where('subject_type', 'RefundTransaction')
            ->where('subject_id', $refund->id)
            ->latest()
            ->get();

        $data = $refund->toArray();
        $data['merchant_order_id'] = $orderId ?: null;
        $data['merchant_org_id'] = $alloc?->merchant_org_id;
        $data['customer_id'] = $alloc?->customer_id ?? $refund->customerSPayAccount?->owner_external_id;
        $data['checkout_group_id'] = $alloc?->checkout?->checkout_group_id;
        $data['product_subtotal_idr'] = $alloc?->product_subtotal_idr ?? 0;
        $data['shipping_customer_idr'] = $alloc?->shipping_customer_idr ?? 0;
        $data['app_fee_allocated_idr'] = $alloc?->app_fee_allocated_idr ?? 0;
        $data['source_kind'] = $isJasa ? 'JASA_05B' : 'BARANG_05A';
        $data['is_after_sales'] = $isAfterSales;
        $data['case_id'] = $caseId;
        $data['movements'] = $movements;
        $data['audit_logs'] = $auditLogs;

        return ApiResponse::success($data);
    }

    public function withdrawals(Request $request): JsonResponse
    {
        $query = WithdrawalRequest::with(['bankDestination', 'spayAccount'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $withdrawals = $query->paginate((int) $request->query('per_page', 20));

        return ApiResponse::success($withdrawals);
    }

    public function reconciliation(Request $request): JsonResponse
    {
        $totalDebit = (int) LedgerLine::where('entry_side', 'DEBIT')->sum('amount_idr');
        $totalCredit = (int) LedgerLine::where('entry_side', 'CREDIT')->sum('amount_idr');

        $isBalanced = ($totalDebit === $totalCredit);

        $totalPaidPayments = (int) PaymentIntent::where('status', 'PAID')->sum('amount_idr');
        $totalMaturedReleased = (int) HeldOrderFund::where('status', 'RELEASED_TO_SPAY')->sum('merchant_entitlement_idr');
        $totalRefundsSucceeded = (int) RefundTransaction::where('status', 'SUCCEEDED')->sum('credited_amount_idr');
        $totalWithdrawalsCompleted = (int) WithdrawalRequest::where('status', 'SUCCEEDED')->sum('requested_amount_idr');

        return ApiResponse::success([
            'is_double_entry_balanced' => $isBalanced,
            'total_debit_idr' => $totalDebit,
            'total_credit_idr' => $totalCredit,
            'discrepancy_idr' => abs($totalDebit - $totalCredit),
            'metrics' => [
                'total_paid_payments_idr' => $totalPaidPayments,
                'total_matured_held_released_idr' => $totalMaturedReleased,
                'total_refunds_succeeded_idr' => $totalRefundsSucceeded,
                'total_withdrawals_completed_idr' => $totalWithdrawalsCompleted,
            ],
            'audit_status' => $isBalanced ? 'CLEAN_AND_BALANCED' : 'IMBALANCE_DETECTED',
        ]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $query = FinanceAuditLog::latest();

        if ($event = $request->query('event')) {
            $query->where('action', $event);
        }

        if ($entityType = $request->query('entity_type')) {
            $query->where('subject_type', $entityType);
        }

        $logs = $query->paginate((int) $request->query('per_page', 25));

        return ApiResponse::success($logs);
    }
}
