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
        $query = RefundTransaction::latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($customerId = $request->query('customer_id')) {
            $query->where('customer_id', $customerId);
        }

        $refunds = $query->paginate((int) $request->query('per_page', 20));

        return ApiResponse::success($refunds);
    }

    public function withdrawals(Request $request): JsonResponse
    {
        $query = WithdrawalRequest::with('bankDestination')->latest();

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
