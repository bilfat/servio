<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Cancellation\CancellationService;
use App\Domain\Completion\AutoCompletionService;
use App\Models\Order;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerOrderController extends Controller
{
    public function __construct(
        protected CancellationService $cancellationService,
        protected AutoCompletionService $autoCompletionService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $tab = $request->query('tab');
        $perPage = min(100, max(1, (int) $request->query('per_page', 20)));

        $query = Order::where('customer_id', $actor->id)
            ->forCustomerTab($tab)
            ->with(['items', 'delivery'])
            ->orderBy('created_at', 'desc');

        $orders = $query->paginate($perPage);

        return ApiResponse::success($orders, 'CUSTOMER_ORDERS_LOADED');
    }

    public function show(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $order = Order::where('id', $id)
            ->where('customer_id', $actor->id)
            ->with(['items', 'delivery.attempts', 'delivery.events', 'histories', 'cancellationRequests'])
            ->first();

        if (!$order) {
            return ApiResponse::error('ORDER_NOT_FOUND', 'Pesanan tidak ditemukan.', 404);
        }

        return ApiResponse::success($order, 'CUSTOMER_ORDER_DETAIL_LOADED');
    }

    public function cancel(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'reason_code' => 'required|string',
            'note' => 'nullable|string',
        ]);

        $cancelledOrder = $this->cancellationService->cancelConfirmedDirect(
            customerId: $actor->id,
            orderId: $id,
            reasonCode: $validated['reason_code'],
            note: $validated['note'] ?? null
        );

        return ApiResponse::success($cancelledOrder, 'ORDER_CANCELLED_DIRECT');
    }

    public function requestCancellation(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'reason_code' => 'required|string',
            'note' => 'nullable|string',
        ]);

        $cancellationRequest = $this->cancellationService->submitCancellationRequest(
            customerId: $actor->id,
            orderId: $id,
            reasonCode: $validated['reason_code'],
            note: $validated['note'] ?? null
        );

        return ApiResponse::success($cancellationRequest, 'CANCELLATION_REQUEST_SUBMITTED', 201);
    }

    public function cancellationRequests(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $order = Order::where('id', $id)->where('customer_id', $actor->id)->first();
        if (!$order) {
            return ApiResponse::error('ORDER_NOT_FOUND', 'Pesanan tidak ditemukan.', 404);
        }

        $requests = $order->cancellationRequests()->get();

        return ApiResponse::success($requests, 'CANCELLATION_REQUESTS_LOADED');
    }

    public function confirmReceived(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $completedOrder = $this->autoCompletionService->confirmReceivedByCustomer(
            customerId: $actor->id,
            orderId: $id
        );

        return ApiResponse::success($completedOrder, 'ORDER_CONFIRMED_COMPLETED');
    }

    public function receiptContext(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $order = Order::where('id', $id)
            ->where('customer_id', $actor->id)
            ->with(['items', 'checkoutGroup'])
            ->first();

        if (!$order) {
            return ApiResponse::error('ORDER_NOT_FOUND', 'Pesanan tidak ditemukan.', 404);
        }

        return ApiResponse::success([
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'merchant_name' => $order->merchant_display_snapshot['name'] ?? "Toko {$order->merchant_org_id}",
            'recipient' => $order->recipient_snapshot,
            'address' => $order->address_snapshot,
            'items' => $order->items,
            'product_subtotal_idr' => $order->product_subtotal_idr,
            'shipping_customer_idr' => $order->shipping_customer_idr,
            'app_fee_allocated_idr' => $order->app_fee_allocated_idr,
            'customer_tax_allocated_idr' => $order->customer_tax_allocated_idr,
            'customer_total_idr' => $order->customer_total_idr,
            'completed_at' => $order->completed_at?->toIso8601String(),
            'finance_payment_id' => $order->checkoutGroup?->finance_payment_id,
        ], 'RECEIPT_CONTEXT_LOADED');
    }
}
