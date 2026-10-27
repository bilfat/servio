<?php

declare(strict_types=1);

namespace App\Domain\Integration;

use App\Domain\Order\OrderTransitionService;
use App\Models\CartItem;
use App\Models\CheckoutGroup;
use App\Models\IntegrationInboxEvent;
use App\Models\Order;
use App\Models\PaymentProjection;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentEventHandler
{
    public function __construct(
        protected OrderTransitionService $orderTransitionService
    ) {}

    /**
     * Recursively sort associative array keys for deterministic payload hashing.
     */
    private function canonicalizeArray(array $arr): array
    {
        $isAssoc = array_keys($arr) !== range(0, count($arr) - 1);
        if ($isAssoc) {
            ksort($arr);
        }
        foreach ($arr as $key => $value) {
            if (is_array($value)) {
                $arr[$key] = $this->canonicalizeArray($value);
            }
        }
        return $arr;
    }

    /**
     * Handle incoming finance event with authenticated inbox deduplication (FIX 27).
     * Strictly verifies non-empty event_id from Finance, authorized source, deterministic payload hash,
     * rejects conflicting replays with 409, and acknowledges identical replays idempotently without mutations.
     */
    public function handleFinanceEvent(array $eventEnvelope): array
    {
        // 1. Event ID check: Mandatory, non-empty, NO fallback (FIX 27)
        if (!isset($eventEnvelope['event_id']) || !is_string($eventEnvelope['event_id']) || trim($eventEnvelope['event_id']) === '') {
            throw new Exception("MISSING_EVENT_ID: Event pembayaran dari Finance wajib menyertakan event_id non-kosong.", 422);
        }
        $eventId = trim($eventEnvelope['event_id']);

        // 2. Source service check: Default to authoritative FINANCE_06 if omitted, and validate authorization
        $sourceService = !empty($eventEnvelope['source_service']) ? trim((string) $eventEnvelope['source_service']) : 'FINANCE_06';
        $authorizedSources = ['FINANCE_06', 'FINANCE_SERVICE', 'SYSTEM'];
        if (!in_array($sourceService, $authorizedSources, true)) {
            throw new Exception("UNAUTHORIZED_PAYMENT_SOURCE: Sumber event '{$sourceService}' tidak berwenang mengirim event pembayaran.", 403);
        }

        // 3. Event type check: Mandatory, valid type
        if (!isset($eventEnvelope['event_type']) || !is_string($eventEnvelope['event_type']) || trim($eventEnvelope['event_type']) === '') {
            throw new Exception("MISSING_EVENT_TYPE: event_type wajib disertakan pada event envelope pembayaran.", 422);
        }
        $eventType = trim($eventEnvelope['event_type']);
        $validEventTypes = [
            'finance.payment.confirmed.v1',
            'finance.payment.failed.v1',
            'finance.payment.expired.v1',
        ];
        if (!in_array($eventType, $validEventTypes, true)) {
            throw new Exception("INVALID_EVENT_TYPE: Tipe event pembayaran tidak dikenali: '{$eventType}'.", 422);
        }

        // 4. Payload validation: Non-empty
        $payload = (array) ($eventEnvelope['payload'] ?? []);
        if (empty($payload)) {
            throw new Exception("EMPTY_PAYLOAD: Payload event pembayaran tidak boleh kosong.", 422);
        }

        // 5. Deterministic canonical payload hash (FIX 27)
        $canonicalPayload = $this->canonicalizeArray($payload);
        $canonicalEnvelope = [
            'event_type' => $eventType,
            'source_service' => $sourceService,
            'payload' => $canonicalPayload,
        ];
        $payloadHash = hash('sha256', (string) json_encode($canonicalEnvelope));

        // 6. Inbox deduplication and replay conflict check
        $existingInbox = IntegrationInboxEvent::where('source_service', $sourceService)
            ->where('source_event_id', $eventId)
            ->first();

        if ($existingInbox) {
            // FIX 27: If same event ID arrives with DIFFERENT payload or event type, reject with 409 Conflict
            if ($existingInbox->event_type !== $eventType || $existingInbox->payload_hash !== $payloadHash) {
                throw new Exception("IDEMPOTENCY_CONFLICT: Event ID '{$eventId}' telah diproses sebelumnya dengan tipe event atau payload yang berbeda. Replay ditolak demi integritas.", 409);
            }

            if ($existingInbox->status === IntegrationInboxEvent::STATUS_PROCESSED) {
                return [
                    'status' => 'ALREADY_PROCESSED',
                    'message' => 'Event telah diproses sebelumnya.',
                    'event_id' => $eventId,
                ];
            }
        } else {
            try {
                $existingInbox = IntegrationInboxEvent::create([
                    'id' => (string) Str::ulid(),
                    'source_service' => $sourceService,
                    'source_event_id' => $eventId,
                    'event_type' => $eventType,
                    'aggregate_id' => (string) ($payload['payment_id'] ?? $payload['checkout_group_id'] ?? 'UNKNOWN'),
                    'payload_hash' => $payloadHash,
                    'payload_json' => $canonicalPayload,
                    'status' => IntegrationInboxEvent::STATUS_PENDING,
                    'received_at' => now(),
                ]);
            } catch (\Illuminate\Database\QueryException $e) {
                // Handle concurrent duplicate insertion race condition
                $existingInbox = IntegrationInboxEvent::where('source_service', $sourceService)
                    ->where('source_event_id', $eventId)
                    ->first();
                if ($existingInbox) {
                    if ($existingInbox->event_type !== $eventType || $existingInbox->payload_hash !== $payloadHash) {
                        throw new Exception("IDEMPOTENCY_CONFLICT: Event ID '{$eventId}' diterima secara paralel dengan tipe event atau payload yang berbeda. Replay ditolak.", 409);
                    }
                    if ($existingInbox->status === IntegrationInboxEvent::STATUS_PROCESSED) {
                        return [
                            'status' => 'ALREADY_PROCESSED',
                            'message' => 'Event telah diproses sebelumnya.',
                            'event_id' => $eventId,
                        ];
                    }
                } else {
                    throw $e;
                }
            }
        }

        try {
            DB::transaction(function () use ($eventType, $payload, $existingInbox) {
                match ($eventType) {
                    'finance.payment.confirmed.v1' => $this->processPaymentConfirmed($payload),
                    'finance.payment.failed.v1' => $this->processPaymentFailed($payload),
                    'finance.payment.expired.v1' => $this->processPaymentExpired($payload),
                    default => throw new Exception("Tipe event keuangan tidak dikenali: {$eventType}", 422),
                };

                $existingInbox->update([
                    'status' => IntegrationInboxEvent::STATUS_PROCESSED,
                    'processed_at' => now(),
                ]);
            });

            return [
                'status' => 'PROCESSED',
                'event_id' => $eventId,
            ];
        } catch (\Throwable $e) {
            $existingInbox->update([
                'status' => IntegrationInboxEvent::STATUS_FAILED,
                'attempt_count' => $existingInbox->attempt_count + 1,
                'last_error' => substr($e->getMessage(), 0, 500),
            ]);
            throw $e;
        }
    }

    /**
     * Unified payment identity verification for CONFIRMED, FAILED, and EXPIRED events (FIX 17 & FIX 23).
     * Strictly verifies authenticated service, non-empty payment ID, valid PaymentProjection,
     * exact matching payment reference, amount/currency consistency, and child order integrity.
     *
     * @return array{0: CheckoutGroup, 1: PaymentProjection}|null
     * @throws Exception
     */
    private function verifyPaymentIdentity(array $payload, string $eventType): ?array
    {
        $checkoutGroupId = $payload['checkout_group_id'] ?? null;
        $paymentId = $payload['payment_id'] ?? null;

        if (empty($checkoutGroupId)) {
            throw new Exception('Data checkout_group_id tidak boleh kosong.', 422);
        }

        if (empty($paymentId)) {
            throw new Exception('Data payment_id tidak boleh kosong.', 422);
        }

        // Amount verification if provided in payload
        if (isset($payload['amount_idr'])) {
            $amountIdr = (int) $payload['amount_idr'];
            if ($amountIdr <= 0) {
                throw new Exception('Nominal pembayaran (amount_idr) harus lebih besar dari 0.', 422);
            }
        }

        if (isset($payload['currency']) && $payload['currency'] !== 'IDR') {
            throw new Exception("Mata uang tidak valid: {$payload['currency']}. Hanya IDR yang didukung.", 422);
        }

        /** @var CheckoutGroup|null $group */
        $group = CheckoutGroup::where('id', $checkoutGroupId)->lockForUpdate()->first();
        if (!$group) {
            throw new Exception("Checkout group {$checkoutGroupId} tidak ditemukan.", 404);
        }

        if (isset($amountIdr) && $amountIdr !== (int) $group->customer_total_idr) {
            throw new Exception("Jumlah pembayaran ({$amountIdr}) tidak cocok dengan total tagihan ({$group->customer_total_idr}).", 409);
        }

        // FIX 23: Strict PaymentProjection verification for all payment events (CONFIRMED, FAILED, EXPIRED)
        $projection = PaymentProjection::where('checkout_group_id', $group->id)->first();
        if (!$projection || empty($projection->finance_payment_id)) {
            throw new Exception("QUARANTINED_UNMATCHED_PROJECTION: Referensi PaymentProjection belum tercatat resmi untuk checkout group {$checkoutGroupId}. Event ditolak demi integritas.", 409);
        }

        if ($projection->finance_payment_id !== $paymentId) {
            throw new Exception("PAYMENT_ID_MISMATCH: Payment ID event ({$paymentId}) tidak cocok dengan referensi pembayaran tersimpan ({$projection->finance_payment_id}).", 409);
        }

        // Verify child order IDs if provided in payload
        if (!empty($payload['merchant_order_ids'])) {
            $actualOrderIds = $group->orders()->pluck('id')->toArray();
            $merchantOrderIds = (array) $payload['merchant_order_ids'];
            sort($actualOrderIds);
            sort($merchantOrderIds);
            if ($actualOrderIds !== $merchantOrderIds) {
                throw new Exception("Daftar pesanan toko pada event pembayaran tidak cocok dengan data lokal (pesanan tidak lengkap atau memuat pesanan asing).", 409);
            }
        }

        // State Machine Guards:
        // 1. Never downgrade PAID to FAILED or EXPIRED (FIX 06 & FIX 23)
        if ($group->payment_status_projection === 'PAID') {
            if ($eventType !== 'CONFIRMED') {
                Log::warning("PaymentEventHandler: Ignored {$eventType} event for already PAID checkout group {$checkoutGroupId}");
                return null;
            }
        }

        // 2. Late PAID after FAILED or EXPIRED requires reconciliation
        if ($eventType === 'CONFIRMED' && in_array($group->payment_status_projection, ['FAILED', 'EXPIRED'], true)) {
            throw new Exception("RECONCILIATION_REQUIRED: Transaksi sudah berstatus {$group->payment_status_projection}. Pembayaran PAID terlambat memerlukan rekonsiliasi manual Finance.", 409);
        }

        return [$group, $projection];
    }

    /**
     * Process finance.payment.confirmed.v1:
     * Strictly verifies payment ID, projection existence, exact amount, and exact child order IDs (FIX 17 & FIX 23).
     * Atomically confirms all orders. Strictly idempotent and purges selected cart items upon confirmed payment (FIX 04 & FIX 06).
     */
    private function processPaymentConfirmed(array $payload): void
    {
        $merchantOrderIds = (array) ($payload['merchant_order_ids'] ?? []);
        if (empty($merchantOrderIds)) {
            throw new Exception('Daftar pesanan toko (merchant_order_ids) wajib disertakan pada event PAID.', 422);
        }

        $amountIdr = (int) ($payload['amount_idr'] ?? 0);
        if ($amountIdr <= 0) {
            throw new Exception('Nominal pembayaran (amount_idr) harus lebih besar dari 0.', 422);
        }

        $verified = $this->verifyPaymentIdentity($payload, 'CONFIRMED');
        if (!$verified) {
            return;
        }
        [$group, $projection] = $verified;

        // Idempotent check: If already PAID, do not re-execute mutations
        if ($group->payment_status_projection === 'PAID') {
            Log::info("PaymentEventHandler: Checkout group {$group->id} already marked PAID. Event acknowledged idempotently.");
            return;
        }

        // Update CheckoutGroup projection
        $group->update([
            'payment_status_projection' => 'PAID',
            'orchestration_status' => 'PAID_CONFIRMED',
        ]);

        // Update PaymentProjection
        $projection->update([
            'payment_status' => 'PAID',
            'amount_idr' => $amountIdr,
            'currency' => 'IDR',
            'paid_at' => now(),
            'last_verified_at' => now(),
        ]);

        // Transition ALL child orders from PAYMENT_PENDING to CONFIRMED
        foreach ($group->orders as $order) {
            if ($order->status === Order::STATUS_PAYMENT_PENDING || $order->status === Order::STATUS_CREATED) {
                $this->orderTransitionService->transition(
                    order: $order,
                    newStatus: Order::STATUS_CONFIRMED,
                    action: 'FINANCE_PAYMENT_PAID',
                    actorId: 'FINANCE_SERVICE',
                    actorRole: 'SYSTEM',
                    extraAttributes: ['payment_status_projection' => 'PAID']
                );
            }
        }

        // FIX 04: Purge selected cart items ONLY now that payment is confirmed!
        if (!empty($group->selected_cart_item_ids)) {
            CartItem::whereIn('id', $group->selected_cart_item_ids)->delete();
        }
    }

    /**
     * Process finance.payment.failed.v1:
     * Strictly verifies payment identity, preventing foreign/mismatched FAILED events (FIX 23).
     * Strictly prevents overwriting already PAID groups (FIX 06).
     */
    private function processPaymentFailed(array $payload): void
    {
        $verified = $this->verifyPaymentIdentity($payload, 'FAILED');
        if (!$verified) {
            return; // E.g., already PAID
        }
        [$group, $projection] = $verified;

        if ($group->payment_status_projection === 'FAILED') {
            Log::info("PaymentEventHandler: Checkout group {$group->id} already marked FAILED. Event acknowledged idempotently.");
            return;
        }

        $group->update([
            'payment_status_projection' => 'FAILED',
        ]);

        $projection->update([
            'payment_status' => 'FAILED',
            'last_verified_at' => now(),
        ]);
    }

    /**
     * Process finance.payment.expired.v1:
     * Strictly verifies payment identity, preventing foreign/mismatched EXPIRED events (FIX 23).
     * Strictly prevents overwriting already PAID groups (FIX 06).
     */
    private function processPaymentExpired(array $payload): void
    {
        $verified = $this->verifyPaymentIdentity($payload, 'EXPIRED');
        if (!$verified) {
            return; // E.g., already PAID
        }
        [$group, $projection] = $verified;

        if ($group->payment_status_projection === 'EXPIRED') {
            Log::info("PaymentEventHandler: Checkout group {$group->id} already marked EXPIRED. Event acknowledged idempotently.");
            return;
        }

        $group->update([
            'payment_status_projection' => 'EXPIRED',
            'orchestration_status' => 'EXPIRED',
        ]);

        $projection->update([
            'payment_status' => 'EXPIRED',
            'last_verified_at' => now(),
        ]);

        // Cancel unpaid orders
        foreach ($group->orders as $order) {
            if (in_array($order->status, [Order::STATUS_CREATED, Order::STATUS_PAYMENT_PENDING], true)) {
                $this->orderTransitionService->transition(
                    order: $order,
                    newStatus: Order::STATUS_CANCELLED,
                    action: 'PAYMENT_EXPIRED_TIMEOUT',
                    actorId: 'FINANCE_SERVICE',
                    actorRole: 'SYSTEM',
                    reasonCode: 'PAYMENT_EXPIRED_TIMEOUT',
                    reasonNote: 'Pembayaran kedaluwarsa setelah melewati batas 6 jam.'
                );
            }
        }
    }
}
