<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Integration\PaymentEventHandler;
use App\Models\CheckoutGroup;
use App\Models\IntegrationInboxEvent;
use App\Models\Order;
use App\Models\OrderAuditLog;
use App\Models\OrderStatusHistory;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InternalOrderEventController extends Controller
{
    public function __construct(
        protected PaymentEventHandler $paymentEventHandler
    ) {}

    /**
     * Ingest events emitted by Finance Service (payment confirmed, failed, expired).
     */
    public function handleFinanceEvent(Request $request): JsonResponse
    {
        $callerHeader = $request->header('X-Source-Service')
            ?: $request->header('X-Caller-Service')
            ?: $request->header('X-Sender-Service');

        $bodySource = $request->input('source_service');

        if (!empty($callerHeader) && !empty($bodySource) && $callerHeader !== $bodySource) {
            return ApiResponse::error(
                'SOURCE_IDENTITY_MISMATCH',
                "Identitas pengirim pada header '{$callerHeader}' tidak cocok dengan source_service pada body '{$bodySource}'.",
                403
            );
        }

        $result = $this->paymentEventHandler->handleFinanceEvent($request->all());

        return ApiResponse::success($result, 'FINANCE_EVENT_HANDLED');
    }

    /**
     * Internal read for CheckoutGroup and child orders for Finance reconciliation.
     */
    public function showCheckout(string $checkoutGroupId): JsonResponse
    {
        $group = CheckoutGroup::where('id', $checkoutGroupId)->with(['orders', 'paymentProjection'])->first();
        if (!$group) {
            return ApiResponse::error('CHECKOUT_NOT_FOUND', 'Checkout group tidak ditemukan.', 404);
        }

        return ApiResponse::success($group, 'CHECKOUT_LOADED');
    }

    /**
     * Internal read for Order snapshot.
     */
    public function showOrder(string $orderId): JsonResponse
    {
        $order = Order::where('id', $orderId)->with(['items', 'delivery'])->first();
        if (!$order) {
            return ApiResponse::error('ORDER_NOT_FOUND', 'Pesanan tidak ditemukan.', 404);
        }

        return ApiResponse::success($order, 'ORDER_LOADED');
    }

    /**
     * Ingest hold / dispute events from Modul 07 / 09 / Finance.
     * Persistently stores hold state and protects against stale out-of-order holds and unholds (FIX 26).
     */
    public function handleHoldEvent(Request $request): JsonResponse
    {
        // 1. Caller header verification against body source_service
        $callerHeader = $request->header('X-Source-Service')
            ?: $request->header('X-Caller-Service')
            ?: $request->header('X-Sender-Service');

        // 2. Body source_service check: Mandatory, non-empty, no fallback!
        $sourceService = $request->input('source_service');
        if ($sourceService === null || trim((string) $sourceService) === '') {
            return ApiResponse::error(
                'MISSING_SOURCE_SERVICE',
                'Source service wajib disertakan dan tidak boleh kosong.',
                422
            );
        }
        $sourceService = trim((string) $sourceService);

        // Verify body source against header if header provided
        if (!empty($callerHeader) && $callerHeader !== $sourceService) {
            return ApiResponse::error(
                'SOURCE_IDENTITY_MISMATCH',
                "Identitas pengirim pada header '{$callerHeader}' tidak cocok dengan source_service pada body '{$sourceService}'.",
                403
            );
        }

        // Whitelist of authorized source services
        $authorizedSources = ['AFTERSALES_07', 'DISPUTE_GOVERNANCE_09', 'FINANCE_06', 'OPERATIONS_ADMIN', 'SYSTEM'];
        if (!in_array($sourceService, $authorizedSources, true)) {
            return ApiResponse::error('UNAUTHORIZED_HOLD_SOURCE', "Sumber event hold '{$sourceService}' tidak memiliki otorisasi yang sah.", 403);
        }

        // 3. Event ID check: Mandatory, non-empty, no fallback!
        $eventId = $request->input('event_id');
        if ($eventId === null || trim((string) $eventId) === '') {
            return ApiResponse::error(
                'MISSING_EVENT_ID',
                'Event ID wajib disertakan dan tidak boleh kosong.',
                422
            );
        }
        $eventId = trim((string) $eventId);

        // 4. Order ID check: Mandatory, non-empty
        $orderId = $request->input('order_id');
        if ($orderId === null || trim((string) $orderId) === '') {
            return ApiResponse::error(
                'MISSING_ORDER_ID',
                'Order ID wajib disertakan dan tidak boleh kosong.',
                422
            );
        }
        $orderId = trim((string) $orderId);

        // 5. is_hold_active check: Mandatory boolean
        if ($request->input('is_hold_active') === null) {
            return ApiResponse::error(
                'MISSING_HOLD_ACTIVE',
                'is_hold_active wajib disertakan.',
                422
            );
        }
        $isHoldActive = (bool) $request->input('is_hold_active');

        // 6. FIX 26: Strict Monotonic Sequence Requirement for BOTH HOLD and UNHOLD
        $rawSequence = $request->input('event_sequence');
        if ($rawSequence === null || (!is_int($rawSequence) && (!is_string($rawSequence) || !ctype_digit((string) $rawSequence))) || (int) $rawSequence <= 0) {
            return ApiResponse::error(
                'PENDING_HOLD_SEQUENCE_CONTRACT',
                'Event ' . ($isHoldActive ? 'HOLD' : 'UNHOLD') . ' ditolak: Wajib menyertakan event_sequence integer positif otoritatif dari kontrak sumber.',
                422
            );
        }
        $incomingSequence = (int) $rawSequence;

        // 7. Event type check
        $eventType = (string) ($request->input('event_type') ?? ($isHoldActive ? 'order.hold_applied.v1' : 'order.hold_released.v1'));
        $validEventTypes = [
            'order.hold_changed.v1',
            'order.hold_applied.v1',
            'order.hold_released.v1',
            'hold.applied.v1',
            'hold.released.v1',
        ];
        if (!in_array($eventType, $validEventTypes, true)) {
            return ApiResponse::error('INVALID_EVENT_TYPE', "Tipe event hold '{$eventType}' tidak dikenali.", 422);
        }

        // Canonical deterministic payload hash
        $canonicalPayload = [
            'order_id' => $orderId,
            'is_hold_active' => $isHoldActive,
            'hold_reason' => $request->input('hold_reason'),
            'source_service' => $sourceService,
            'event_id' => $eventId,
            'event_sequence' => $incomingSequence,
            'event_type' => $eventType,
        ];
        ksort($canonicalPayload);
        $incomingHash = hash('sha256', (string) json_encode($canonicalPayload));

        // Inbox deduplication check
        $existingInbox = IntegrationInboxEvent::where('source_service', $sourceService)
            ->where('source_event_id', $eventId)
            ->first();

        if ($existingInbox) {
            // FIX 22 & 26: If same event ID arrives with DIFFERENT payload, reject with conflict
            if ($existingInbox->payload_hash !== $incomingHash) {
                return ApiResponse::error(
                    'IDEMPOTENCY_CONFLICT',
                    "Event ID '{$eventId}' telah diproses sebelumnya dengan payload yang berbeda.",
                    409
                );
            }

            if ($existingInbox->status === IntegrationInboxEvent::STATUS_PROCESSED) {
                return ApiResponse::success([
                    'status' => 'ALREADY_PROCESSED',
                    'order_id' => $orderId,
                ], 'HOLD_EVENT_ALREADY_PROCESSED');
            }
        } else {
            try {
                $existingInbox = IntegrationInboxEvent::create([
                    'id' => (string) Str::ulid(),
                    'source_service' => $sourceService,
                    'source_event_id' => $eventId,
                    'event_type' => $eventType,
                    'aggregate_id' => $orderId,
                    'payload_hash' => $incomingHash,
                    'payload_json' => $canonicalPayload,
                    'status' => IntegrationInboxEvent::STATUS_PENDING,
                    'received_at' => now(),
                ]);
            } catch (\Illuminate\Database\QueryException $e) {
                // Concurrent insert handling
                $existingInbox = IntegrationInboxEvent::where('source_service', $sourceService)
                    ->where('source_event_id', $eventId)
                    ->first();
                if ($existingInbox) {
                    if ($existingInbox->payload_hash !== $incomingHash) {
                        return ApiResponse::error(
                            'IDEMPOTENCY_CONFLICT',
                            "Event ID '{$eventId}' diterima secara paralel dengan payload yang berbeda.",
                            409
                        );
                    }
                    if ($existingInbox->status === IntegrationInboxEvent::STATUS_PROCESSED) {
                        return ApiResponse::success([
                            'status' => 'ALREADY_PROCESSED',
                            'order_id' => $orderId,
                        ], 'HOLD_EVENT_ALREADY_PROCESSED');
                    }
                } else {
                    throw $e;
                }
            }
        }

        try {
            $order = DB::transaction(function () use ($orderId, $isHoldActive, $incomingSequence, $eventId, $sourceService, $request, $existingInbox) {
                /** @var Order|null $locked */
                $locked = Order::where('id', $orderId)->lockForUpdate()->first();
                if (!$locked) {
                    return null;
                }

                $previousState = [
                    'is_hold_active' => $locked->is_hold_active,
                    'hold_reason' => $locked->hold_reason,
                    'hold_sequence' => $locked->hold_sequence,
                    'hold_source_service' => $locked->hold_source_service,
                    'hold_event_id' => $locked->hold_event_id,
                ];

                // FIX 26: Strict Monotonic Ordering Check for BOTH HOLD and UNHOLD
                if (!$isHoldActive) {
                    // UNHOLD
                    if ($locked->is_hold_active) {
                        if ($locked->hold_sequence > 0) {
                            if ($incomingSequence < $locked->hold_sequence) {
                                throw new \Exception("STALE_UNHOLD_EVENT: Urutan event ({$incomingSequence}) lebih lama dari hold aktif saat ini ({$locked->hold_sequence}). Event unhold ditolak demi integritas.", 409);
                            }

                            if ($incomingSequence === $locked->hold_sequence) {
                                if ($locked->hold_event_id === $eventId) {
                                    return $locked;
                                }
                                throw new \Exception("CONFLICTING_HOLD_SEQUENCE: Event unhold memiliki sequence ({$incomingSequence}) yang sama dengan hold aktif saat ini tetapi dengan identitas/payload berbeda. Event ditolak.", 409);
                            }
                        }

                        // Authority check: If hold was placed by DISPUTE_GOVERNANCE_09, only DISPUTE_GOVERNANCE_09 or OPERATIONS_ADMIN can release it
                        if ($locked->hold_source_service === 'DISPUTE_GOVERNANCE_09' && !in_array($sourceService, ['DISPUTE_GOVERNANCE_09', 'OPERATIONS_ADMIN'], true)) {
                            throw new \Exception("UNAUTHORIZED_UNHOLD: Penangguhan dari Otoritas Dispute Tata Kelola tidak dapat dilepaskan oleh {$sourceService}.", 403);
                        }
                    }
                } else {
                    // HOLD sequence validation (FIX 26)
                    if ($locked->hold_sequence > 0) {
                        if ($incomingSequence < $locked->hold_sequence) {
                            throw new \Exception("STALE_HOLD_EVENT: Urutan event hold ({$incomingSequence}) lebih lama dari hold_sequence saat ini ({$locked->hold_sequence}). Event ditolak.", 409);
                        }
                        if ($incomingSequence === $locked->hold_sequence) {
                            if ($locked->hold_event_id === $eventId) {
                                return $locked;
                            }
                            throw new \Exception("CONFLICTING_HOLD_SEQUENCE: Event hold memiliki sequence ({$incomingSequence}) yang sama tetapi payload berbeda.", 409);
                        }
                    }
                }

                $reason = $request->input('hold_reason') ?? ($isHoldActive ? 'HOLD_DISPUTE_ACTIVE' : null);

                $locked->update([
                    'is_hold_active' => $isHoldActive,
                    'hold_reason' => $reason,
                    'hold_sequence' => $incomingSequence,
                    'hold_applied_at' => $isHoldActive ? now() : null,
                    'hold_event_id' => $eventId,
                    'hold_source_service' => $sourceService,
                ]);

                OrderStatusHistory::create([
                    'id' => (string) Str::ulid(),
                    'order_id' => $locked->id,
                    'previous_status' => $locked->status,
                    'new_status' => $locked->status,
                    'action' => $isHoldActive ? 'ORDER_HOLD_APPLIED' : 'ORDER_HOLD_RELEASED',
                    'actor_id' => $sourceService,
                    'actor_role' => 'SYSTEM',
                    'source_service' => $sourceService,
                    'reason_code' => $reason,
                    'order_version' => $locked->version,
                    'occurred_at' => now(),
                ]);

                OrderAuditLog::create([
                    'id' => (string) Str::ulid(),
                    'order_id' => $locked->id,
                    'checkout_group_id' => $locked->checkout_group_id,
                    'actor_id' => $sourceService,
                    'actor_role' => 'SYSTEM',
                    'action' => $isHoldActive ? 'HOLD_APPLIED' : 'HOLD_RELEASED',
                    'before_state' => $previousState,
                    'after_state' => [
                        'is_hold_active' => $locked->is_hold_active,
                        'hold_reason' => $locked->hold_reason,
                        'hold_sequence' => $locked->hold_sequence,
                        'hold_source_service' => $locked->hold_source_service,
                        'hold_event_id' => $locked->hold_event_id,
                    ],
                    'result' => 'SUCCESS',
                    'correlation_id' => $eventId,
                    'occurred_at' => now(),
                ]);

                $existingInbox->update([
                    'status' => IntegrationInboxEvent::STATUS_PROCESSED,
                    'processed_at' => now(),
                ]);

                return $locked->fresh();
            });
        } catch (\Throwable $e) {
            $existingInbox->update([
                'status' => IntegrationInboxEvent::STATUS_FAILED,
                'last_error' => substr($e->getMessage(), 0, 500),
            ]);
            return ApiResponse::error('HOLD_EVENT_REJECTED', $e->getMessage(), $e->getCode() >= 400 && $e->getCode() <= 599 ? (int) $e->getCode() : 409);
        }

        if (!$order) {
            return ApiResponse::error('ORDER_NOT_FOUND', 'Pesanan tidak ditemukan.', 404);
        }

        return ApiResponse::success([
            'status' => 'PERSISTED',
            'order_id' => $order->id,
            'is_hold_active' => $order->is_hold_active,
            'hold_reason' => $order->hold_reason,
            'hold_sequence' => $order->hold_sequence,
        ], 'HOLD_STATE_PERSISTED');
    }

    /**
     * Create real non-commercial replacement fulfillment record for Phase 07.
     */
    public function createReplacement(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|string',
            'source_order_id' => 'required|string',
            'merchant_org_id' => 'required|string',
            'customer_id' => 'required|string',
            'items' => 'required|array',
            'waybill_number' => 'nullable|string',
            'courier_name' => 'nullable|string',
        ]);

        // Idempotent lookup
        $existing = \App\Models\OrderReplacement::where('case_id', $validated['case_id'])->first();
        if ($existing) {
            return ApiResponse::success($existing, 'REPLACEMENT_FULFILLMENT_EXISTS');
        }

        try {
            $replacement = \App\Models\OrderReplacement::create([
                'case_id' => $validated['case_id'],
                'source_order_id' => $validated['source_order_id'],
                'merchant_org_id' => $validated['merchant_org_id'],
                'customer_id' => $validated['customer_id'],
                'items_json' => $validated['items'],
                'status' => 'PREPARING',
                'waybill_number' => $validated['waybill_number'] ?? ('REP-' . strtoupper(\Illuminate\Support\Str::random(10))),
                'courier_name' => $validated['courier_name'] ?? 'SERVIO Express',
            ]);

            return ApiResponse::success($replacement, 'REPLACEMENT_FULFILLMENT_CREATED');
        } catch (\Illuminate\Database\QueryException $e) {
            // Concurrent race condition caught by DB unique constraint
            $existing = \App\Models\OrderReplacement::where('case_id', $validated['case_id'])->first();
            if ($existing) {
                return ApiResponse::success($existing, 'REPLACEMENT_FULFILLMENT_EXISTS');
            }
            throw $e;
        }
    }

    /**
     * Read real replacement fulfillment record.
     */
    public function showReplacement(string $id): JsonResponse
    {
        $replacement = \App\Models\OrderReplacement::find($id);
        if (!$replacement) {
            // Check by case_id fallback
            $replacement = \App\Models\OrderReplacement::where('case_id', $id)->first();
        }

        if (!$replacement) {
            return ApiResponse::error('REPLACEMENT_NOT_FOUND', 'Data replacement fulfillment tidak ditemukan.', 404);
        }

        return ApiResponse::success($replacement, 'REPLACEMENT_FULFILLMENT_LOADED');
    }

    /**
     * Advance replacement fulfillment to delivered status with authentic POD.
     */
    public function deliverReplacement(Request $request, string $id): JsonResponse
    {
        $replacement = \App\Models\OrderReplacement::find($id)
            ?? \App\Models\OrderReplacement::where('case_id', $id)->first();

        if (!$replacement) {
            return ApiResponse::error('REPLACEMENT_NOT_FOUND', 'Data replacement fulfillment tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'proof_of_delivery' => 'required|string',
        ]);

        $replacement->update([
            'status' => 'DELIVERED',
            'proof_of_delivery' => $validated['proof_of_delivery'],
            'delivered_at' => now(),
        ]);

        return ApiResponse::success($replacement, 'REPLACEMENT_DELIVERED');
    }
}
