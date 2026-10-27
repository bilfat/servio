<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Cancellation\CancellationService;
use App\Domain\Fulfillment\DeliveryService;
use App\Domain\Order\OrderTransitionService;
use App\Infrastructure\Finance\FinanceCheckoutClient;
use App\Models\Order;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MerchantOrderController extends Controller
{
    public function __construct(
        protected OrderTransitionService $orderTransitionService,
        protected DeliveryService $deliveryService,
        protected CancellationService $cancellationService,
        protected FinanceCheckoutClient $financeClient
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $tab = $request->query('tab');
        $perPage = min(100, max(1, (int) $request->query('per_page', 20)));

        $orders = Order::where('merchant_org_id', $actor->organizationId)
            ->forMerchantTab($tab)
            ->with(['items', 'delivery'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return ApiResponse::success($orders, 'MERCHANT_ORDERS_LOADED');
    }

    public function show(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $order = Order::where('id', $id)
            ->where('merchant_org_id', $actor->organizationId)
            ->with(['items', 'delivery.attempts', 'delivery.events', 'histories', 'cancellationRequests'])
            ->first();

        if (!$order) {
            return ApiResponse::error('ORDER_NOT_FOUND', 'Pesanan tidak ditemukan atau bukan milik organisasi toko Anda.', 404);
        }

        return ApiResponse::success($order, 'MERCHANT_ORDER_DETAIL_LOADED');
    }

    public function process(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'expected_version' => 'nullable|integer',
        ]);

        $order = Order::where('id', $id)->where('merchant_org_id', $actor->organizationId)->first();
        if (!$order) {
            return ApiResponse::error('ORDER_NOT_FOUND', 'Pesanan tidak ditemukan.', 404);
        }

        $processed = $this->orderTransitionService->transition(
            order: $order,
            newStatus: Order::STATUS_PROCESSING,
            action: 'MERCHANT_PROCESSED_ORDER',
            actorId: $actor->id,
            actorRole: 'MERCHANT',
            expectedVersion: $validated['expected_version'] ?? null
        );

        return ApiResponse::success($processed, 'ORDER_PROCESSED');
    }

    public function pack(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'expected_version' => 'nullable|integer',
        ]);

        $packed = $this->deliveryService->packOrder(
            merchantOrgId: $actor->organizationId,
            actorId: $actor->id,
            orderId: $id,
            expectedVersion: $validated['expected_version'] ?? null
        );

        return ApiResponse::success($packed, 'ORDER_PACKED');
    }

    public function updateDelivery(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'courier_method' => 'required|string|in:KURIR_TOKO,GOSEND,EXTERNAL_COURIER',
            'booking_reference' => 'nullable|string',
            'tracking_url' => 'nullable|url',
            'courier_name' => 'nullable|string',
            'courier_phone' => 'nullable|string',
        ]);

        $delivery = $this->deliveryService->configureCourier(
            merchantOrgId: $actor->organizationId,
            actorId: $actor->id,
            orderId: $id,
            courierMethod: $validated['courier_method'],
            bookingReference: $validated['booking_reference'] ?? null,
            trackingUrl: $validated['tracking_url'] ?? null,
            courierName: $validated['courier_name'] ?? null,
            courierPhone: $validated['courier_phone'] ?? null
        );

        return ApiResponse::success($delivery, 'COURIER_CONFIGURED');
    }

    public function dispatch(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'proof_of_pickup' => 'nullable|string',
            'expected_version' => 'nullable|integer',
        ]);

        $dispatched = $this->deliveryService->dispatchOrder(
            merchantOrgId: $actor->organizationId,
            actorId: $actor->id,
            orderId: $id,
            proofOfPickup: $validated['proof_of_pickup'] ?? null,
            expectedVersion: $validated['expected_version'] ?? null
        );

        return ApiResponse::success($dispatched, 'ORDER_DISPATCHED');
    }

    public function delivered(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'recipient_name' => 'required|string|min:2',
            'proof_reference' => 'required|string|min:3',
            'expected_version' => 'nullable|integer',
        ]);

        $delivered = $this->deliveryService->markDelivered(
            merchantOrgId: $actor->organizationId,
            actorId: $actor->id,
            orderId: $id,
            recipientName: $validated['recipient_name'],
            proofReference: $validated['proof_reference'] ?? null,
            expectedVersion: $validated['expected_version'] ?? null
        );

        return ApiResponse::success($delivered, 'ORDER_MARKED_DELIVERED');
    }

    public function deliveryFailure(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'failure_reason_code' => 'required|string',
            'note' => 'nullable|string',
        ]);

        $delivery = $this->deliveryService->recordDeliveryFailure(
            merchantOrgId: $actor->organizationId,
            actorId: $actor->id,
            orderId: $id,
            failureReasonCode: $validated['failure_reason_code'],
            note: $validated['note'] ?? null
        );

        return ApiResponse::success($delivery, 'DELIVERY_FAILURE_RECORDED');
    }

    public function deliveryRetry(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'courier_method' => 'nullable|string',
            'note' => 'nullable|string',
        ]);

        $delivery = $this->deliveryService->retryDelivery(
            merchantOrgId: $actor->organizationId,
            actorId: $actor->id,
            orderId: $id,
            newCourierMethod: $validated['courier_method'] ?? null,
            note: $validated['note'] ?? null
        );

        return ApiResponse::success($delivery, 'DELIVERY_RETRY_INITIATED');
    }

    public function cancel(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'reason_code' => 'required|string',
            'note' => 'nullable|string',
        ]);

        $order = Order::where('id', $id)->where('merchant_org_id', $actor->organizationId)->first();
        if (!$order) {
            return ApiResponse::error('ORDER_NOT_FOUND', 'Pesanan tidak ditemukan.', 404);
        }

        if (!in_array($order->status, [Order::STATUS_CONFIRMED, Order::STATUS_PROCESSING], true)) {
            return ApiResponse::error('CANNOT_CANCEL', "Pembatalan operasional toko tidak diizinkan pada status {$order->status}.", 409);
        }

        $cancelled = $this->orderTransitionService->transition(
            order: $order,
            newStatus: Order::STATUS_CANCELLED,
            action: 'MERCHANT_CANCELLED_ORDER',
            actorId: $actor->id,
            actorRole: 'MERCHANT',
            reasonCode: $validated['reason_code'],
            reasonNote: $validated['note'] ?? null
        );

        // Delegate refund to Finance
        $sourceEventId = 'CXL_MERCH_' . $cancelled->id . '_' . Str::upper(Str::random(6));
        try {
            $this->financeClient->delegateCancellationRefund(
                sourceEventId: $sourceEventId,
                merchantOrderId: $cancelled->id,
                checkoutGroupId: $cancelled->checkout_group_id,
                decisionSource: 'MERCHANT',
                reasonCode: $validated['reason_code'],
                cancelledAt: now()->toIso8601String()
            );
        } catch (\Throwable) {
            // Outbox retry
        }

        return ApiResponse::success($cancelled, 'ORDER_CANCELLED_BY_MERCHANT');
    }

    public function decideCancellationRequest(Request $request, string $requestId): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'decision' => 'required|string|in:APPROVED,REJECTED',
            'reason_code' => 'nullable|string',
            'decision_note' => 'nullable|string',
            'expected_request_version' => 'nullable|integer',
        ]);

        $decided = $this->cancellationService->decideCancellationRequest(
            merchantOrgId: $actor->organizationId,
            actorId: $actor->id,
            requestId: $requestId,
            decision: $validated['decision'],
            reasonCode: $validated['reason_code'] ?? null,
            note: $validated['decision_note'] ?? null,
            expectedVersion: $validated['expected_request_version'] ?? null
        );

        return ApiResponse::success($decided, 'CANCELLATION_REQUEST_DECIDED');
    }
}
