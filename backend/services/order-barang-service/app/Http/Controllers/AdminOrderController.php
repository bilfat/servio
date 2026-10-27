<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Infrastructure\Finance\FinanceCheckoutClient;
use App\Models\Order;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    public function __construct(
        protected FinanceCheckoutClient $financeClient
    ) {}

    /**
     * Get paginated global product orders with filtering for Admin Operations.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $status = $request->query('status');
        $paymentStatus = $request->query('payment_status');
        $search = $request->query('search');
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        $perPage = min(100, max(1, (int) $request->query('per_page', 15)));

        $query = Order::with(['items', 'delivery', 'checkoutGroup']);

        // Status Filter
        if (!empty($status) && strtoupper($status) !== 'ALL') {
            $statusUpper = strtoupper($status);
            switch ($statusUpper) {
                case 'BELUM_BAYAR':
                case 'PAYMENT_PENDING':
                case 'UNPAID':
                    $query->whereIn('status', [Order::STATUS_CREATED, Order::STATUS_PAYMENT_PENDING]);
                    break;
                case 'MASUK':
                case 'CONFIRMED':
                case 'INCOMING':
                    $query->where('status', Order::STATUS_CONFIRMED);
                    break;
                case 'DIPROSES':
                case 'PROCESSING':
                    $query->where('status', Order::STATUS_PROCESSING);
                    break;
                case 'DIKEMAS':
                case 'PACKED':
                    $query->where('status', Order::STATUS_PACKED);
                    break;
                case 'DIKIRIM':
                case 'DELIVERING':
                case 'SHIPPED':
                    $query->where('status', Order::STATUS_DELIVERING);
                    break;
                case 'DITERIMA':
                case 'DELIVERED':
                    $query->where('status', Order::STATUS_DELIVERED);
                    break;
                case 'SELESAI':
                case 'COMPLETED':
                    $query->where('status', Order::STATUS_COMPLETED);
                    break;
                case 'BATAL':
                case 'CANCELLED':
                    $query->where('status', Order::STATUS_CANCELLED);
                    break;
                default:
                    $query->where('status', $statusUpper);
                    break;
            }
        }

        // Payment Status Filter
        if (!empty($paymentStatus) && strtoupper($paymentStatus) !== 'ALL') {
            $query->where('payment_status_projection', strtoupper($paymentStatus));
        }

        // Date Range Filters
        if (!empty($dateFrom)) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if (!empty($dateTo)) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        // Search Query
        if (!empty($search)) {
            $trimmedSearch = trim((string) $search);
            $query->where(function ($q) use ($trimmedSearch) {
                $q->where('order_number', 'LIKE', "%{$trimmedSearch}%")
                    ->orWhere('checkout_group_id', 'LIKE', "%{$trimmedSearch}%")
                    ->orWhere('id', 'LIKE', "%{$trimmedSearch}%")
                    ->orWhere('recipient_snapshot->recipient_name', 'LIKE', "%{$trimmedSearch}%")
                    ->orWhere('address_snapshot->recipient_name', 'LIKE', "%{$trimmedSearch}%")
                    ->orWhere('address_snapshot->city', 'LIKE', "%{$trimmedSearch}%")
                    ->orWhere('merchant_display_snapshot->name', 'LIKE', "%{$trimmedSearch}%")
                    ->orWhereHas('items', function ($itemQuery) use ($trimmedSearch) {
                        $itemQuery->where('product_snapshot->name', 'LIKE', "%{$trimmedSearch}%")
                            ->orWhere('variant_snapshot->sku', 'LIKE', "%{$trimmedSearch}%")
                            ->orWhere('variant_snapshot->name', 'LIKE', "%{$trimmedSearch}%");
                    });
            });
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return ApiResponse::success($orders, 'ADMIN_GLOBAL_ORDERS_LOADED');
    }

    /**
     * Get aggregate counts of Product Orders by status for Admin Operations.
     */
    public function counts(Request $request): JsonResponse
    {
        $counts = [
            'total' => Order::count(),
            'belum_bayar' => Order::whereIn('status', [Order::STATUS_CREATED, Order::STATUS_PAYMENT_PENDING])->count(),
            'masuk' => Order::where('status', Order::STATUS_CONFIRMED)->count(),
            'diproses' => Order::where('status', Order::STATUS_PROCESSING)->count(),
            'dikemas' => Order::where('status', Order::STATUS_PACKED)->count(),
            'dikirim' => Order::where('status', Order::STATUS_DELIVERING)->count(),
            'diterima' => Order::where('status', Order::STATUS_DELIVERED)->count(),
            'selesai' => Order::where('status', Order::STATUS_COMPLETED)->count(),
            'batal' => Order::where('status', Order::STATUS_CANCELLED)->count(),
            'payment_pending' => Order::where('payment_status_projection', 'PENDING')->count(),
            'payment_paid' => Order::where('payment_status_projection', 'PAID')->count(),
            'payment_expired' => Order::where('payment_status_projection', 'EXPIRED')->count(),
            'payment_failed' => Order::where('payment_status_projection', 'FAILED')->count(),
        ];

        return ApiResponse::success($counts, 'ADMIN_ORDER_COUNTS_LOADED');
    }

    /**
     * Get comprehensive Product Order detail enriched with Finance 06 data for Admin Operations.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $order = Order::where('id', $id)
            ->orWhere('order_number', $id)
            ->with([
                'items',
                'delivery.attempts',
                'delivery.events',
                'histories',
                'cancellationRequests',
                'checkoutGroup',
            ])
            ->first();

        if (!$order) {
            return ApiResponse::error('ORDER_NOT_FOUND', 'Pesanan tidak ditemukan.', 404);
        }

        // Authoritative Finance 06 Data Orchestration
        $financePayment = null;
        $financeAllocation = null;
        $financeRefund = null;
        $financeSettlement = null;

        $paymentId = $order->checkoutGroup?->finance_payment_id;

        if ($paymentId) {
            try {
                $paymentResult = $this->financeClient->getPayment($paymentId);
                if ($paymentResult) {
                    $financePayment = [
                        'payment_id' => $paymentResult['payment_id'] ?? $paymentId,
                        'checkout_group_id' => $paymentResult['checkout_group_id'] ?? $order->checkout_group_id,
                        'method' => $paymentResult['method'] ?? null,
                        'provider' => $paymentResult['provider'] ?? null,
                        'status' => $paymentResult['status'] ?? null,
                        'amount_idr' => $paymentResult['amount_idr'] ?? null,
                        'currency' => $paymentResult['currency'] ?? 'IDR',
                        'paid_at' => $paymentResult['paid_at'] ?? null,
                        'expires_at' => $paymentResult['expires_at'] ?? null,
                        'is_real_payment' => $paymentResult['is_real_payment'] ?? false,
                    ];

                    // Find allocation for this specific Merchant Order
                    $allocations = $paymentResult['allocations'] ?? [];
                    foreach ($allocations as $alloc) {
                        if (($alloc['merchant_order_id'] ?? null) === $order->id) {
                            $financeAllocation = [
                                'allocation_id' => $alloc['id'] ?? null,
                                'merchant_order_id' => $alloc['merchant_order_id'] ?? $order->id,
                                'merchant_org_id' => $alloc['merchant_org_id'] ?? $order->merchant_org_id,
                                'product_subtotal_idr' => $alloc['product_subtotal_idr'] ?? $order->product_subtotal_idr,
                                'shipping_customer_idr' => $alloc['shipping_customer_idr'] ?? $order->shipping_customer_idr,
                                'app_fee_allocated_idr' => $alloc['app_fee_allocated_idr'] ?? $order->app_fee_allocated_idr,
                                'customer_tax_allocated_idr' => $alloc['customer_tax_allocated_idr'] ?? $order->customer_tax_allocated_idr,
                                'customer_total_idr' => $alloc['customer_total_idr'] ?? $order->customer_total_idr,
                                'merchant_commission_idr' => $alloc['merchant_commission_idr'] ?? 0,
                                'merchant_fee_breakdown' => $alloc['merchant_fee_breakdown'] ?? ($alloc['fee_snapshot']['merchant_fee_breakdown'] ?? []),
                                'merchant_tax_or_withholding_idr' => $alloc['merchant_tax_or_withholding_idr'] ?? 0,
                                'merchant_net_entitlement_idr' => $alloc['merchant_net_entitlement_idr'] ?? null,
                                'status' => $alloc['status'] ?? null,
                            ];
                            break;
                        }
                    }
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("AdminOrderController: Failed querying payment for order {$order->id}: " . $e->getMessage());
            }
        }

        // If order was cancelled and was paid, retrieve authoritative refund details
        if ($order->status === Order::STATUS_CANCELLED && $order->payment_status_projection === 'PAID') {
            try {
                $refundData = $this->financeClient->getRefundByOrder($order->id);
                if ($refundData) {
                    $financeRefund = [
                        'refund_id' => $refundData['refund_id'] ?? null,
                        'merchant_order_id' => $order->id,
                        'status' => $refundData['status'] ?? null,
                        'refund_amount_idr' => $refundData['refund_amount_idr'] ?? null,
                        'credited_amount_idr' => $refundData['credited_amount_idr'] ?? null,
                        'destination' => $refundData['destination'] ?? 'CUSTOMER_SPAY',
                        'processed_at' => $refundData['processed_at'] ?? null,
                    ];
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("AdminOrderController: Failed querying refund for order {$order->id}: " . $e->getMessage());
            }
        }

        // If order is completed, retrieve authoritative held fund & settlement details
        if ($order->status === Order::STATUS_COMPLETED) {
            try {
                $settlementData = $this->financeClient->getHeldFundByOrder($order->id);
                if ($settlementData) {
                    $financeSettlement = [
                        'held_fund_id' => $settlementData['id'] ?? null,
                        'merchant_order_id' => $order->id,
                        'status' => $settlementData['status'] ?? null,
                        'gross_held_idr' => $settlementData['gross_held_idr'] ?? null,
                        'merchant_entitlement_idr' => $settlementData['merchant_entitlement_idr'] ?? null,
                        'completed_at' => $settlementData['completed_at'] ?? null,
                        'eligible_release_at' => $settlementData['eligible_release_at'] ?? null,
                        'released_at' => $settlementData['released_at'] ?? null,
                        'refunded_at' => $settlementData['refunded_at'] ?? null,
                        'hold_reason_code' => $settlementData['hold_reason_code'] ?? null,
                    ];
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("AdminOrderController: Failed querying held fund for order {$order->id}: " . $e->getMessage());
            }
        }

        $orderData = $order->toArray();
        $orderData['finance_payment'] = $financePayment;
        $orderData['finance_allocation'] = $financeAllocation;
        $orderData['finance_refund'] = $financeRefund;
        $orderData['finance_settlement'] = $financeSettlement;

        return ApiResponse::success($orderData, 'ADMIN_ORDER_DETAIL_LOADED');
    }
}
