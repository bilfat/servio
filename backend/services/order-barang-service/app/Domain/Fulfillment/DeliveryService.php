<?php

declare(strict_types=1);

namespace App\Domain\Fulfillment;

use App\Domain\Order\OrderTransitionService;
use App\Models\Delivery;
use App\Models\DeliveryAttempt;
use App\Models\DeliveryEvent;
use App\Models\Order;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DeliveryService
{
    public function __construct(
        protected OrderTransitionService $orderTransitionService
    ) {}

    /**
     * Merchant packs order: PROCESSING -> PACKED.
     * Guard: Cannot pack if active_cancellation_request_id is not null!
     */
    public function packOrder(
        string $merchantOrgId,
        string $actorId,
        string $orderId,
        ?int $expectedVersion = null
    ): Order {
        return DB::transaction(function () use ($merchantOrgId, $actorId, $orderId, $expectedVersion) {
            /** @var Order $order */
            $order = Order::where('id', $orderId)
                ->where('merchant_org_id', $merchantOrgId)
                ->lockForUpdate()
                ->first();

            if (!$order) {
                throw new Exception('Pesanan tidak ditemukan atau bukan milik organisasi toko Anda.', 403);
            }

            if ($order->status !== Order::STATUS_PROCESSING) {
                throw new Exception("Pesanan hanya dapat dikemas dari status PROCESSING (status saat ini: {$order->status}).", 409);
            }

            if ($order->active_cancellation_request_id !== null) {
                throw new Exception('Pesanan tidak dapat dikemas karena ada pengajuan pembatalan yang sedang ditinjau.', 409);
            }

            $packedOrder = $this->orderTransitionService->transition(
                order: $order,
                newStatus: Order::STATUS_PACKED,
                action: 'MERCHANT_PACKED_ORDER',
                actorId: $actorId,
                actorRole: 'MERCHANT',
                expectedVersion: $expectedVersion
            );

            // Update delivery record
            $delivery = $packedOrder->delivery;
            if ($delivery) {
                $delivery->update([
                    'status' => Delivery::STATUS_READY_FOR_DELIVERY,
                    'version' => $delivery->version + 1,
                ]);
            }

            return $packedOrder;
        });
    }

    /**
     * Configure courier method (Kurir Toko or GoSend external booking reference).
     */
    public function configureCourier(
        string $merchantOrgId,
        string $actorId,
        string $orderId,
        string $courierMethod,
        ?string $bookingReference = null,
        ?string $trackingUrl = null,
        ?string $courierName = null,
        ?string $courierPhone = null
    ): Delivery {
        return DB::transaction(function () use (
            $merchantOrgId,
            $actorId,
            $orderId,
            $courierMethod,
            $bookingReference,
            $trackingUrl,
            $courierName,
            $courierPhone
        ) {
            /** @var Order $order */
            $order = Order::where('id', $orderId)->where('merchant_org_id', $merchantOrgId)->first();
            if (!$order) {
                throw new Exception('Pesanan tidak ditemukan atau bukan milik organisasi toko Anda.', 403);
            }

            $delivery = Delivery::firstOrCreate(
                ['order_id' => $order->id],
                ['id' => (string) Str::ulid(), 'version' => 1]
            );

            // Validate tracking URL if provided
            if (!empty($trackingUrl)) {
                if (!filter_var($trackingUrl, FILTER_VALIDATE_URL)) {
                    throw new Exception('Format URL tracking tidak valid.', 422);
                }
            }

            $delivery->update([
                'courier_method' => strtoupper($courierMethod),
                'booking_reference' => $bookingReference,
                'tracking_url' => $trackingUrl,
                'courier_name_ciphertext' => $courierName,
                'courier_phone_ciphertext' => $courierPhone,
            ]);

            return $delivery->fresh();
        });
    }

    /**
     * Dispatch order after physical pickup / handover: PACKED -> DELIVERING.
     */
    public function dispatchOrder(
        string $merchantOrgId,
        string $actorId,
        string $orderId,
        ?string $proofOfPickup = null,
        ?int $expectedVersion = null
    ): Order {
        return DB::transaction(function () use ($merchantOrgId, $actorId, $orderId, $proofOfPickup, $expectedVersion) {
            /** @var Order $order */
            $order = Order::where('id', $orderId)->where('merchant_org_id', $merchantOrgId)->lockForUpdate()->first();
            if (!$order) {
                throw new Exception('Pesanan tidak ditemukan.', 403);
            }

            if ($order->status !== Order::STATUS_PACKED) {
                throw new Exception("Pengiriman hanya dapat dimulai saat pesanan berstatus PACKED (status saat ini: {$order->status}).", 409);
            }

            $deliveringOrder = $this->orderTransitionService->transition(
                order: $order,
                newStatus: Order::STATUS_DELIVERING,
                action: 'MERCHANT_DISPATCHED_ORDER',
                actorId: $actorId,
                actorRole: 'MERCHANT',
                expectedVersion: $expectedVersion
            );

            $delivery = $deliveringOrder->delivery;
            if ($delivery) {
                $delivery->update([
                    'status' => Delivery::STATUS_IN_TRANSIT,
                    'picked_up_at' => now(),
                    'version' => $delivery->version + 1,
                ]);

                // Record delivery event
                DeliveryEvent::create([
                    'id' => (string) Str::ulid(),
                    'delivery_id' => $delivery->id,
                    'event_type' => 'PACKAGE_PICKED_UP',
                    'actor_id' => $actorId,
                    'evidence_reference' => $proofOfPickup,
                    'occurred_at' => now(),
                ]);
            }

            return $deliveringOrder;
        });
    }

    /**
     * Mark order as DELIVERED upon receipt confirmation / proof of delivery.
     * Records delivered_at which activates the 72-hour auto-completion clock.
     */
    public function markDelivered(
        string $merchantOrgId,
        string $actorId,
        string $orderId,
        string $recipientName,
        ?string $proofReference = null,
        ?int $expectedVersion = null
    ): Order {
        return DB::transaction(function () use (
            $merchantOrgId,
            $actorId,
            $orderId,
            $recipientName,
            $proofReference,
            $expectedVersion
        ) {
            /** @var Order $order */
            $order = Order::where('id', $orderId)->where('merchant_org_id', $merchantOrgId)->lockForUpdate()->first();
            if (!$order) {
                throw new Exception('Pesanan tidak ditemukan.', 403);
            }

            if ($order->status !== Order::STATUS_DELIVERING) {
                throw new Exception("Pesanan harus berstatus DELIVERING untuk ditandai sampai (status saat ini: {$order->status}).", 409);
            }

            // FIX 10: Proof of Delivery must be provided and non-empty!
            if (empty(trim($recipientName)) || strlen(trim($recipientName)) < 2) {
                throw new Exception('Nama penerima wajib diisi dengan benar (minimal 2 karakter).', 422);
            }

            if (empty($proofReference) || strlen(trim($proofReference)) < 3) {
                throw new Exception('Bukti serah terima penerimaan paket (proof reference / URL foto) wajib disertakan.', 422);
            }

            $now = now();

            $deliveredOrder = $this->orderTransitionService->transition(
                order: $order,
                newStatus: Order::STATUS_DELIVERED,
                action: 'MERCHANT_MARKED_DELIVERED',
                actorId: $actorId,
                actorRole: 'MERCHANT',
                expectedVersion: $expectedVersion,
                extraAttributes: ['delivered_at' => $now]
            );

            $delivery = $deliveredOrder->delivery;
            if ($delivery) {
                $delivery->update([
                    'status' => Delivery::STATUS_DELIVERED,
                    'delivered_at' => $now,
                    'recipient_name' => $recipientName,
                    'proof_reference' => $proofReference,
                    'proof_verified' => true,
                    'version' => $delivery->version + 1,
                ]);

                DeliveryEvent::create([
                    'id' => (string) Str::ulid(),
                    'delivery_id' => $delivery->id,
                    'event_type' => 'DELIVERED_TO_RECIPIENT',
                    'actor_id' => $actorId,
                    'evidence_reference' => $proofReference,
                    'occurred_at' => $now,
                ]);
            }

            return $deliveredOrder;
        });
    }

    /**
     * Record delivery failure:
     * Does NOT cancel order, does NOT refund!
     * Records attempt and failure reason.
     */
    public function recordDeliveryFailure(
        string $merchantOrgId,
        string $actorId,
        string $orderId,
        string $failureReasonCode,
        ?string $note = null
    ): Delivery {
        return DB::transaction(function () use ($merchantOrgId, $actorId, $orderId, $failureReasonCode, $note) {
            /** @var Order $order */
            $order = Order::where('id', $orderId)->where('merchant_org_id', $merchantOrgId)->first();
            if (!$order) {
                throw new Exception('Pesanan tidak ditemukan.', 403);
            }

            $delivery = $order->delivery;
            if (!$delivery) {
                throw new Exception('Data pengiriman pesanan tidak ditemukan.', 404);
            }

            $attemptNo = $delivery->attempts()->count() + 1;

            DeliveryAttempt::create([
                'id' => (string) Str::ulid(),
                'delivery_id' => $delivery->id,
                'attempt_no' => $attemptNo,
                'courier_method' => $delivery->courier_method,
                'failure_reason_code' => $failureReasonCode,
                'outcome' => 'FAILED',
                'attempted_at' => now(),
                'note' => $note,
            ]);

            $delivery->update([
                'status' => Delivery::STATUS_FAILED,
                'last_failure_code' => $failureReasonCode,
                'attempt_count' => $attemptNo,
            ]);

            return $delivery->fresh(['attempts']);
        });
    }

    /**
     * Retry delivery: restores delivery status to IN_TRANSIT.
     */
    public function retryDelivery(
        string $merchantOrgId,
        string $actorId,
        string $orderId,
        ?string $newCourierMethod = null,
        ?string $note = null
    ): Delivery {
        return DB::transaction(function () use ($merchantOrgId, $actorId, $orderId, $newCourierMethod, $note) {
            /** @var Order $order */
            $order = Order::where('id', $orderId)->where('merchant_org_id', $merchantOrgId)->first();
            if (!$order) {
                throw new Exception('Pesanan tidak ditemukan.', 403);
            }

            $delivery = $order->delivery;
            if (!$delivery) {
                throw new Exception('Data pengiriman tidak ditemukan.', 404);
            }

            $delivery->update([
                'status' => Delivery::STATUS_IN_TRANSIT,
                'courier_method' => $newCourierMethod ? strtoupper($newCourierMethod) : $delivery->courier_method,
            ]);

            DeliveryEvent::create([
                'id' => (string) Str::ulid(),
                'delivery_id' => $delivery->id,
                'event_type' => 'DELIVERY_RETRY_INITIATED',
                'actor_id' => $actorId,
                'event_payload' => ['note' => $note],
                'occurred_at' => now(),
            ]);

            return $delivery->fresh();
        });
    }
}
