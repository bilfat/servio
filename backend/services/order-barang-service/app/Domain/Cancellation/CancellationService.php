<?php

declare(strict_types=1);

namespace App\Domain\Cancellation;

use App\Domain\Order\OrderTransitionService;
use App\Infrastructure\Finance\FinanceCheckoutClient;
use App\Infrastructure\Identity\IdentityAddressClient;
use App\Models\CancellationRequest;
use App\Models\CheckoutGroup;
use App\Models\IntegrationOutboxEvent;
use App\Models\Order;
use App\Models\PaymentProjection;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CancellationService
{
    public function __construct(
        protected OrderTransitionService $orderTransitionService,
        protected OperatingHoursCalculator $hoursCalculator,
        protected IdentityAddressClient $identityClient,
        protected FinanceCheckoutClient $financeClient,
        protected \App\Infrastructure\Product\ProductClient $productClient,
    ) {}

    /**
     * Cancel unpaid checkout group.
     * Enforces synchronization with Finance authoritative payment status (FIX 07).
     */
    public function cancelUnpaidCheckout(
        string $customerId,
        string $checkoutGroupId,
        string $reasonCode
    ): array {
        /** @var CheckoutGroup|null $group */
        $group = CheckoutGroup::where('id', $checkoutGroupId)->where('customer_id', $customerId)->first();
        if (!$group) {
            throw new Exception('Checkout group tidak ditemukan atau bukan milik Anda.', 404);
        }

        if ($group->payment_status_projection === 'PAID') {
            throw new Exception('Tagihan telah dibayar dan tidak dapat dibatalkan melalui jalur belum bayar.', 409);
        }

        // Check authoritative payment status with Finance Service (FIX 15)
        try {
            $financeCheckout = $this->financeClient->getCheckout($checkoutGroupId);
        } catch (\Throwable $e) {
            throw new Exception("Gagal memeriksa status pembayaran di Finance Service: {$e->getMessage()}. Pembatalan ditahan demi integritas data.", 503);
        }

        if ($financeCheckout === null) {
            throw new Exception('Finance Service tidak menemukan data checkout atau mengembalikan status tidak sah. Pembatalan belum bayar ditolak.', 502);
        }

        $financeStatus = null;
        if (is_array($financeCheckout)) {
            if (isset($financeCheckout['data']) && is_array($financeCheckout['data'])) {
                $financeStatus = $financeCheckout['data']['status'] ?? $financeCheckout['data']['payment_status'] ?? null;
            }
            if (empty($financeStatus) && isset($financeCheckout['status']) && !is_numeric($financeCheckout['status'])) {
                $financeStatus = $financeCheckout['status'];
            }
            if (empty($financeStatus)) {
                $financeStatus = $financeCheckout['payment_status'] ?? null;
            }
        }

        if (empty($financeStatus)) {
            throw new Exception('Status pembayaran tidak ditemukan pada respons Finance Service. Pembatalan belum bayar ditolak.', 502);
        }

        if ($financeStatus === 'PAID') {
            throw new Exception('Tagihan telah terkonfirmasi dibayar di Finance Service. Pembatalan belum bayar ditolak.', 409);
        }

        // Check if payment intent is still active in Finance (race condition protection)
        $projection = PaymentProjection::where('checkout_group_id', $group->id)->first();
        if ($projection && !empty($projection->finance_payment_id)) {
            try {
                $paymentInfo = $this->financeClient->getPayment($projection->finance_payment_id);
            } catch (\Throwable $e) {
                throw new Exception("Gagal memeriksa status Payment Intent di Finance Service: {$e->getMessage()}. Pembatalan ditahan.", 503);
            }

            if ($paymentInfo) {
                $paymentStatus = is_array($paymentInfo)
                    ? ($paymentInfo['status'] ?? $paymentInfo['data']['status'] ?? $paymentInfo['payment_status'] ?? $paymentInfo['data']['payment_status'] ?? null)
                    : null;

                if ($paymentStatus === 'PAID') {
                    throw new Exception('Tagihan telah terkonfirmasi dibayar di Finance Service (Payment Intent PAID). Pembatalan belum bayar ditolak.', 409);
                }
                if ($paymentStatus === 'PENDING') {
                    try {
                        $this->financeClient->voidPaymentIntent($projection->finance_payment_id);
                    } catch (\Throwable $e) {
                        throw new Exception("Gagal membatalkan instruksi pembayaran aktif di Finance Service: {$e->getMessage()}", 502);
                    }
                }
            }
        }

        return DB::transaction(function () use ($group, $customerId, $reasonCode, $projection) {
            if ($projection) {
                $projection->update(['payment_status' => 'CANCELLED']);
            }

            foreach ($group->orders as $order) {
                if ($order->stockReservations->isNotEmpty()) {
                    try {
                        $this->productClient->releaseInventory(
                            $order->id,
                            $order->items->map(fn($it) => ['variant_id' => $it->variant_id, 'quantity' => $it->quantity])->toArray()
                        );
                        $order->stockReservations()->update(['reservation_status' => 'RELEASED']);
                    } catch (\Throwable $e) {
                        Log::warning("Failed releasing stock on cancel: " . $e->getMessage());
                    }
                }
            }
            foreach ($group->orders as $order) {
                if (in_array($order->status, [Order::STATUS_CREATED, Order::STATUS_PAYMENT_PENDING], true)) {
                    $this->orderTransitionService->transition(
                        order: $order,
                        newStatus: Order::STATUS_CANCELLED,
                        action: 'CUSTOMER_CANCEL_UNPAID',
                        actorId: $customerId,
                        actorRole: 'CUSTOMER',
                        reasonCode: $reasonCode,
                        reasonNote: 'Pembatalan sebelum pembayaran oleh Pelanggan'
                    );
                }
            }

            $group->update([
                'payment_status_projection' => 'CANCELLED',
                'orchestration_status' => 'CANCELLED',
            ]);

            return [
                'checkout_group_id' => $group->id,
                'status' => 'CANCELLED',
                'message' => 'Checkout belum bayar berhasil dibatalkan.',
            ];
        });
    }

    /**
     * Direct cancellation when order is CONFIRMED (before merchant processes).
     * Atomically records persistent refund outbox event (FIX 08).
     */
    public function cancelConfirmedDirect(
        string $customerId,
        string $orderId,
        string $reasonCode,
        ?string $note
    ): Order {
        $cancelledOrder = DB::transaction(function () use ($customerId, $orderId, $reasonCode, $note) {
            /** @var Order $order */
            $order = Order::where('id', $orderId)->where('customer_id', $customerId)->lockForUpdate()->first();
            if (!$order) {
                throw new Exception('Pesanan tidak ditemukan atau bukan milik Anda.', 404);
            }

            if ($order->status !== Order::STATUS_CONFIRMED) {
                throw new Exception("Pembatalan langsung hanya diizinkan saat status CONFIRMED (status saat ini: {$order->status}).", 409);
            }

            $cancelledOrder = $this->orderTransitionService->transition(
                order: $order,
                newStatus: Order::STATUS_CANCELLED,
                action: 'CUSTOMER_CANCEL_CONFIRMED',
                actorId: $customerId,
                actorRole: 'CUSTOMER',
                reasonCode: $reasonCode,
                reasonNote: $note
            );

            // FIX 08 & FIX 16: Transactional Outbox Pattern
            // Event is persisted atomically with Order CANCELLED in DB.
            // NO HTTP network calls are executed inside this uncommitted database transaction.
            $sourceEventId = 'REFUND_CXL_' . $cancelledOrder->id;
            $cancelledAt = $cancelledOrder->cancelled_at?->toIso8601String() ?? now()->toIso8601String();

            IntegrationOutboxEvent::create([
                'id' => (string) Str::ulid(),
                'destination_service' => 'FINANCE_06',
                'event_type' => 'finance.cancellation_refund.v1',
                'aggregate_type' => 'ORDER',
                'aggregate_id' => $cancelledOrder->id,
                'aggregate_version' => $cancelledOrder->version,
                'payload_json' => [
                    'source_event_id' => $sourceEventId,
                    'merchant_order_id' => $cancelledOrder->id,
                    'checkout_group_id' => $cancelledOrder->checkout_group_id,
                    'decision_source' => 'CUSTOMER',
                    'reason_code' => $reasonCode,
                    'cancelled_at' => $cancelledAt,
                ],
                'status' => IntegrationOutboxEvent::STATUS_PENDING,
                'available_at' => now(),
                'attempt_count' => 0,
                'correlation_id' => (string) Str::ulid(),
            ]);

            return $cancelledOrder;
        });

        // Phase B: Outbox Dispatcher is triggered strictly AFTER database transaction has committed!
        $maxSafeLevel = app()->runningUnitTests() ? 1 : 0;
        if (DB::transactionLevel() <= $maxSafeLevel) {
            try {
                app(\App\Domain\Integration\OutboxDispatcherService::class)->dispatchPendingEvents();
            } catch (\Throwable $e) {
                Log::warning("OutboxDispatcher post-commit execution deferred: " . $e->getMessage());
            }
        } else {
            DB::afterCommit(function () {
                app(\App\Domain\Integration\OutboxDispatcherService::class)->dispatchPendingEvents();
            });
        }

        return $cancelledOrder;
    }

    /**
     * Customer submits cancellation request while order is PROCESSING.
     * Enforces SLA 12 OPERATIONAL HOURS using authoritative merchant schedule (FIX 11).
     */
    public function submitCancellationRequest(
        string $customerId,
        string $orderId,
        string $reasonCode,
        ?string $note
    ): CancellationRequest {
        return DB::transaction(function () use ($customerId, $orderId, $reasonCode, $note) {
            /** @var Order $order */
            $order = Order::where('id', $orderId)->where('customer_id', $customerId)->lockForUpdate()->first();
            if (!$order) {
                throw new Exception('Pesanan tidak ditemukan.', 404);
            }

            if ($order->status !== Order::STATUS_PROCESSING) {
                throw new Exception("Pengajuan pembatalan hanya dapat dilakukan pada pesanan status PROCESSING (status saat ini: {$order->status}).", 409);
            }

            if ($order->active_cancellation_request_id !== null) {
                throw new Exception('Sudah ada pengajuan pembatalan yang sedang menunggu respons dari Penjual.', 409);
            }

            // FIX 11: Authoritative merchant operating schedule
            $schedule = $this->identityClient->getMerchantOperatingSchedule($order->merchant_org_id);
            $requestedAt = now();

            if ($schedule !== null && !empty($schedule['days'])) {
                $responseDeadline = $this->hoursCalculator->calculateDeadline($requestedAt, $schedule, 12);
                $scheduleSource = $schedule['source'] ?? 'IDENTITY_01_OFFICIAL';
                $scheduleVersion = $schedule['version'] ?? '1.0';
                $timezone = $schedule['timezone'] ?? 'Asia/Jakarta';
            } else {
                // If official merchant schedule is not yet fulfilled by Identity, fail-closed against fake auto-reject deadlines (FIX 11)
                $responseDeadline = null;
                $scheduleSource = 'PENDING_MERCHANT_OPERATING_HOURS_CONTRACT';
                $scheduleVersion = '0.0';
                $timezone = 'Asia/Jakarta';
            }

            $request = CancellationRequest::create([
                'id' => (string) Str::ulid(),
                'order_id' => $order->id,
                'requested_by_id' => $customerId,
                'reason_code' => $reasonCode,
                'reason_note' => $note,
                'status' => CancellationRequest::STATUS_PENDING,
                'requested_at' => $requestedAt,
                'response_deadline_at' => $responseDeadline,
                'merchant_schedule_source' => $scheduleSource,
                'merchant_schedule_version' => $scheduleVersion,
                'merchant_timezone' => $timezone,
                'operational_schedule_snapshot' => $schedule,
                'version' => 1,
            ]);

            // Guard active cancellation reference on order (blocks PACKED!)
            $order->update([
                'active_cancellation_request_id' => $request->id,
            ]);

            return $request;
        });
    }

    /**
     * Merchant decides cancellation request (APPROVED or REJECTED).
     * Atomically records persistent refund outbox event upon APPROVE (FIX 08).
     */
    public function decideCancellationRequest(
        string $merchantOrgId,
        string $actorId,
        string $requestId,
        string $decision,
        ?string $reasonCode,
        ?string $note,
        ?int $expectedVersion = null
    ): CancellationRequest {
        $decision = strtoupper(trim($decision));
        if (!in_array($decision, ['APPROVED', 'REJECTED'], true)) {
            throw new Exception("Keputusan tidak valid: harus APPROVED atau REJECTED.", 422);
        }

        if ($decision === 'REJECTED' && empty($reasonCode)) {
            throw new Exception('Alasan penolakan pembatalan wajib diisi.', 422);
        }

        $updatedRequest = DB::transaction(function () use (
            $merchantOrgId,
            $actorId,
            $requestId,
            $decision,
            $reasonCode,
            $note,
            $expectedVersion
        ) {
            /** @var CancellationRequest $request */
            $request = CancellationRequest::where('id', $requestId)->lockForUpdate()->first();
            if (!$request) {
                throw new Exception('Pengajuan pembatalan tidak ditemukan.', 404);
            }

            if ($request->status !== CancellationRequest::STATUS_PENDING) {
                throw new Exception("Pengajuan pembatalan telah diputuskan sebelumnya ({$request->status}).", 409);
            }

            // Check if deadline already passed (only if deadline was set)
            if ($request->response_deadline_at !== null && now()->greaterThanOrEqualTo($request->response_deadline_at)) {
                throw new Exception('Batas waktu peninjauan (SLA 12 jam operasional) telah berakhir.', 409);
            }

            /** @var Order $order */
            $order = Order::where('id', $request->order_id)
                ->where('merchant_org_id', $merchantOrgId)
                ->lockForUpdate()
                ->first();

            if (!$order) {
                throw new Exception('Pesanan tidak ditemukan atau bukan milik organisasi toko Anda.', 403);
            }

            $request->update([
                'status' => $decision === 'APPROVED' ? CancellationRequest::STATUS_APPROVED : CancellationRequest::STATUS_REJECTED,
                'decided_at' => now(),
                'decision_source' => CancellationRequest::DECISION_SOURCE_MERCHANT,
                'decision_actor_id' => $actorId,
                'decision_reason' => $reasonCode ?: ($decision === 'APPROVED' ? 'MERCHANT_AGREED' : null),
                'decision_note' => $note,
                'version' => $request->version + 1,
            ]);

            // Release active reference on order
            $order->update(['active_cancellation_request_id' => null]);

            if ($decision === 'APPROVED') {
                $cancelledOrder = $this->orderTransitionService->transition(
                    order: $order,
                    newStatus: Order::STATUS_CANCELLED,
                    action: 'MERCHANT_APPROVED_CANCELLATION',
                    actorId: $actorId,
                    actorRole: 'MERCHANT',
                    reasonCode: $reasonCode ?: 'MERCHANT_APPROVED',
                    reasonNote: $note
                );

                // FIX 08 & FIX 16: Transactional Outbox Pattern
                // Persistent refund outbox event recorded atomically inside DB transaction.
                // NO HTTP network calls are executed inside this uncommitted database transaction.
                $sourceEventId = 'REFUND_CXL_REQ_' . $request->id;
                $cancelledAt = now()->toIso8601String();

                IntegrationOutboxEvent::create([
                    'id' => (string) Str::ulid(),
                    'destination_service' => 'FINANCE_06',
                    'event_type' => 'finance.cancellation_refund.v1',
                    'aggregate_type' => 'ORDER',
                    'aggregate_id' => $order->id,
                    'aggregate_version' => $cancelledOrder->version,
                    'payload_json' => [
                        'source_event_id' => $sourceEventId,
                        'merchant_order_id' => $order->id,
                        'checkout_group_id' => $order->checkout_group_id,
                        'decision_source' => 'MERCHANT',
                        'reason_code' => $reasonCode ?: 'MERCHANT_APPROVED',
                        'cancelled_at' => $cancelledAt,
                    ],
                    'status' => IntegrationOutboxEvent::STATUS_PENDING,
                    'available_at' => now(),
                    'attempt_count' => 0,
                    'correlation_id' => (string) Str::ulid(),
                ]);
            }

            return $request->fresh();
        });

        // Phase B: Outbox Dispatcher is triggered strictly AFTER database transaction has committed!
        if ($decision === 'APPROVED') {
            $maxSafeLevel = app()->runningUnitTests() ? 1 : 0;
            if (DB::transactionLevel() <= $maxSafeLevel) {
                try {
                    app(\App\Domain\Integration\OutboxDispatcherService::class)->dispatchPendingEvents();
                } catch (\Throwable $e) {
                    Log::warning("OutboxDispatcher post-commit execution deferred: " . $e->getMessage());
                }
            } else {
                DB::afterCommit(function () {
                    app(\App\Domain\Integration\OutboxDispatcherService::class)->dispatchPendingEvents();
                });
            }
        }

        return $updatedRequest;
    }

    /**
     * Overdue cancellation requests auto-reject scheduler handler.
     * When SLA 12 operational hours expires without merchant response:
     * -> Request REJECTED with reason TIMEOUT_NO_RESPONSE
     * -> Decision source = SYSTEM
     * -> Order stays PROCESSING
     * -> PACKED unblocked
     * -> NO REFUND, NO SUPPORT ESCALATION.
     */
    public function autoRejectOverdueRequests(): int
    {
        $overdueRequests = CancellationRequest::where('status', CancellationRequest::STATUS_PENDING)
            ->whereNotNull('response_deadline_at')
            ->where('response_deadline_at', '<=', now())
            ->get();

        $processedCount = 0;

        foreach ($overdueRequests as $req) {
            DB::transaction(function () use ($req, &$processedCount) {
                /** @var CancellationRequest $lockedReq */
                $lockedReq = CancellationRequest::where('id', $req->id)->lockForUpdate()->first();
                if (!$lockedReq || $lockedReq->status !== CancellationRequest::STATUS_PENDING) {
                    return;
                }

                $lockedReq->update([
                    'status' => CancellationRequest::STATUS_REJECTED,
                    'decided_at' => now(),
                    'decision_source' => CancellationRequest::DECISION_SOURCE_SYSTEM,
                    'decision_reason' => CancellationRequest::REASON_TIMEOUT_NO_RESPONSE,
                    'decision_note' => 'Penjual tidak merespons hingga batas SLA 12 jam operasional.',
                    'version' => $lockedReq->version + 1,
                ]);

                // Unblock order packing
                Order::where('id', $lockedReq->order_id)->update([
                    'active_cancellation_request_id' => null,
                ]);

                $processedCount++;
            });
        }

        return $processedCount;
    }
}
