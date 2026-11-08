<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\FinanceServiceClientInterface;
use App\Models\IntegrationOutboxEvent;
use App\Models\OperationalIssue;
use App\Models\OrderAuditLog;
use App\Models\ServiceFinanceEntitlementRef;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderEvent;
use App\Models\ServicePaymentObligation;
use App\Models\ServiceVisit;
use App\Support\AuthenticatedActor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CompletionAndSettlementService
{
    public function __construct(
        private readonly FinanceServiceClientInterface $financeClient,
    ) {}

    public function completeOrder(AuthenticatedActor $actor, string $orderId, bool $isAutoCompleted = false): ServiceOrder
    {
        return DB::transaction(function () use ($actor, $orderId, $isAutoCompleted) {
            /** @var ServiceOrder|null $order */
            $order = ServiceOrder::where('id', $orderId)->lockForUpdate()->first();

            if (!$order) {
                throw new HttpException(404, 'Pesanan jasa tidak ditemukan.');
            }

            if ($order->status === 'COMPLETED') {
                throw new HttpException(409, 'Pesanan sudah berstatus selesai (COMPLETED).');
            }

            if ($order->status === 'CANCELLED') {
                throw new HttpException(422, 'Pesanan yang telah dibatalkan tidak dapat diselesaikan.');
            }

            if (!$actor->isAdmin() && $order->customer_id !== $actor->id && !$isAutoCompleted) {
                throw new HttpException(403, 'Hanya pelanggan yang bersangkutan atau sistem yang dapat menyelesaikan pesanan ini.');
            }

            // Task 2: Strict Payment Obligation Validation.
            // Obligation MUST exist. NEVER treat null as paid!
            /** @var ServicePaymentObligation|null $executionObligation */
            $executionObligation = ServicePaymentObligation::where('order_id', $order->id)
                ->where('purpose', 'SERVICE_EXECUTION')
                ->lockForUpdate()
                ->first();

            if (!$executionObligation) {
                throw new HttpException(422, 'Pesanan belum dapat diselesaikan: kewajiban pembayaran pengerjaan (SERVICE_EXECUTION) tidak ditemukan.');
            }

            // Case A: NOT_REQUIRED is ONLY valid if principal_idr is strictly 0
            if ($executionObligation->state === 'NOT_REQUIRED') {
                if ((int) $executionObligation->principal_idr !== 0) {
                    throw new HttpException(422, 'Kewajiban pembayaran NOT_REQUIRED tidak sah karena nominal pengerjaan bukan Rp0.');
                }
            } elseif ($executionObligation->state === 'PAID') {
                // Case B: PAID must be backed by Finance 06 verification (paid_at, active_finance_payment_id, and at least one PAID attempt)
                if (!$executionObligation->paid_at || empty($executionObligation->active_finance_payment_id)) {
                    throw new HttpException(422, 'Status pembayaran tidak konsisten: tanggal pelunasan atau ID transaksi keuangan belum tercatat.');
                }

                $hasVerifiedAttempt = $executionObligation->attempts()
                    ->where('reported_status', 'PAID')
                    ->exists();

                if (!$hasVerifiedAttempt) {
                    throw new HttpException(422, 'Status pelunasan pembayaran belum terverifikasi dari modul keuangan (Finance 06).');
                }
            } else {
                // Case C: INVOICE_PENDING, OVERDUE, FAILED, EXPIRED, etc. are strictly rejected
                $amountFormatted = number_format((float) $executionObligation->principal_idr, 0, ',', '.');
                throw new HttpException(
                    422,
                    "Pesanan belum dapat diselesaikan. Tagihan pengerjaan belum lunas (status tagihan: {$executionObligation->state}, nominal: Rp {$amountFormatted})."
                );
            }

            // Strict V3 Rule: Worker must have finished work and closed the visit (VISIT_CLOSED)
            $visit = ServiceVisit::where('order_id', $order->id)->first();
            if (!$visit || !in_array($visit->status, ['CLOSED', 'VISIT_CLOSED'], true) || empty($visit->visit_closed_at)) {
                throw new HttpException(422, 'Teknisi belum mengakhiri kunjungan (VISIT_CLOSED). Pelanggan hanya dapat menyelesaikan pesanan setelah teknisi mengakhiri kunjungan.');
            }

            // Verify order lifecycle status
            $validOrderStatuses = ['VISIT_CLOSED', 'EXECUTION_PAID', 'WORKER_FINISHED'];
            if (!in_array($order->status, $validOrderStatuses, true)) {
                throw new HttpException(422, "Status pesanan saat ini ({$order->status}) belum memenuhi syarat untuk diselesaikan.");
            }

            // Check blocking operational issues (disputes)
            $hasBlockingIssue = OperationalIssue::where('order_id', $order->id)
                ->where('status', 'OPEN')
                ->where('affects_completion', true)
                ->exists();

            if ($hasBlockingIssue) {
                throw new HttpException(422, 'Penyelesaian pesanan ditangguhkan karena terdapat kendala operasional (dispute) aktif yang belum diselesaikan.');
            }

            $now = now();
            $fromStatus = $order->status;

            // 1. Transition order to COMPLETED
            $order->forceFill([
                'status' => 'COMPLETED',
                'phase' => 'TERMINAL',
                'completed_at' => $now,
                'version' => $order->version + 1,
            ])->save();

            // 2. CRITICAL LOCKED RULE: 120-hour escrow hold!
            // Provider funds remain in HELD status for 120 hours before becoming AVAILABLE in S-Pay.
            $releaseEligibleAt = $now->copy()->addHours(120);
            $netProviderIdr = (int) ($executionObligation->fee_snapshot['provider_net_entitlement_idr'] ?? $executionObligation->principal_idr);
            $eventId = 'EVT-COMPL-' . Str::ulid();

            $existingRef = ServiceFinanceEntitlementRef::where('order_id', $order->id)
                ->where('purpose', 'SERVICE_EXECUTION')
                ->first();

            if (!$existingRef) {
                ServiceFinanceEntitlementRef::forceCreate([
                    'id' => (string) Str::ulid(),
                    'order_id' => $order->id,
                    'purpose' => 'SERVICE_EXECUTION',
                    'finance_entitlement_id' => 'ENT-' . Str::ulid(),
                    'finance_event_id' => $eventId,
                    'hold_status' => 'HELD', // Held for 120 hours
                    'release_eligible_at' => $releaseEligibleAt,
                    'net_provider_idr' => $netProviderIdr,
                    'payment_allocation_reference' => $order->order_no,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            // 3. Notify Finance Service 06 via OutboxEvent (Idempotent per order)
            $existingOutbox = IntegrationOutboxEvent::where('aggregate_type', 'ServiceOrder')
                ->where('aggregate_id', $order->id)
                ->where('event_type', 'order_jasa.order.completed.v1')
                ->first();

            if (!$existingOutbox) {
                IntegrationOutboxEvent::forceCreate([
                    'event_id' => (string) Str::ulid(),
                    'event_type' => 'order_jasa.order.completed.v1',
                    'aggregate_type' => 'ServiceOrder',
                    'aggregate_id' => $order->id,
                    'aggregate_version' => 1,
                    'schema_version' => 1,
                    'destination' => 'finance-service',
                    'payload_json' => [
                        'order_id' => $order->id,
                        'order_no' => $order->order_no,
                        'provider_org_id' => $order->provider_org_id,
                        'customer_id' => $order->customer_id,
                        'net_provider_idr' => $netProviderIdr,
                        'completed_at' => $now->toISOString(),
                        'escrow_hold_until' => $releaseEligibleAt->toISOString(),
                    ],
                    'status' => 'PENDING',
                    'attempts' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            // 4. Timeline Event & Audit Log
            $nextSeq = ($order->events()->max('sequence_no') ?? 0) + 1;
            \App\Support\DomainEventLogger::recordOrderEvent(
                orderId: $order->id,
                sequenceNo: $nextSeq,
                eventType: 'ORDER_COMPLETED',
                fromState: $fromStatus,
                toState: 'COMPLETED',
                actorId: $actor->id,
                actorType: $isAutoCompleted ? 'SYSTEM' : $actor->role,
                metadata: [
                    'auto_completed' => $isAutoCompleted,
                    'escrow_hold_hours' => 120,
                    'release_eligible_at' => $releaseEligibleAt->toISOString(),
                ]
            );

            \App\Support\DomainEventLogger::recordAuditLog(
                actor: $isAutoCompleted ? 'SYSTEM' : "{$actor->role}:{$actor->id}",
                action: 'COMPLETE_ORDER',
                resource: "ServiceOrder:{$order->id}"
            );

            // 5. Notify After-Sales Service if warranty was promised
            $this->notifyAfterSalesWarranty($order);

            return $order;
        });
    }

    private function notifyAfterSalesWarranty(ServiceOrder $order): void
    {
        try {
            $snap = $order->service_snapshot ?? [];
            $wCfg = $snap['warranty_config'] ?? ($snap['warranty_policy'] ?? ($snap['warrantyPolicy'] ?? null));
            if (is_string($wCfg)) {
                $wCfg = json_decode($wCfg, true) ?: null;
            }

            $days = (int) ($wCfg['duration_days'] ?? ($wCfg['durationDays'] ?? 0));
            if ($days > 0) {
                $baseUrl = config('services.after_sales.base_url', 'http://127.0.0.1:8008');
                $key = config('services.after_sales.internal_key', 'servio_local_internal_service_key_2026');

                \Illuminate\Support\Facades\Http::timeout(3)
                    ->withHeaders([
                        'X-Internal-Service-Key' => $key,
                        'X-Source-Service' => '05B',
                    ])
                    ->post("{$baseUrl}/internal/v1/after-sales/order-completions", [
                        'source_kind' => 'SERVICE',
                        'order_id' => (string) $order->id,
                        'completed_at' => $order->completed_at?->toIso8601String() ?? now()->toIso8601String(),
                        'items' => [
                            [
                                'order_item_key' => (string) ($order->service_offering_id ?: $order->id),
                                'catalog_ref' => (string) ($order->service_offering_id ?: $order->id),
                                'item_title' => $snap['name'] ?? ($snap['title'] ?? ($snap['display_name'] ?? 'Layanan Jasa Bergaransi')),
                                'item_image_url' => $snap['image_url'] ?? ($snap['primary_media']['url'] ?? null),
                                'quantity' => 1,
                                'customer_id' => (string) $order->customer_id,
                                'owner_org_type' => 'PROVIDER',
                                'owner_org_id' => (string) $order->provider_org_id,
                                'organization_name' => $snap['provider_name'] ?? ($snap['provider']['store_name'] ?? 'Mitra Penyedia Jasa'),
                                'order_number' => (string) ($order->order_no ?: $order->id),
                                'has_warranty' => true,
                                'snapshot_name' => $wCfg['name'] ?? ($wCfg['presetName'] ?? 'Garansi Layanan Resmi'),
                                'snapshot_duration_days' => $days,
                                'snapshot_coverage' => $wCfg['coverage'] ?? ($wCfg['coverage_text'] ?? 'Perbaikan ulang atas kendala yang muncul pasca servis'),
                                'snapshot_exclusion' => $wCfg['exclusions'] ?? ($wCfg['exclusion_text'] ?? 'Kerusakan di luar lingkup servis sebelumnya'),
                                'catalog_snapshot' => [
                                    'name' => $snap['name'] ?? ($snap['title'] ?? null),
                                    'image_url' => $snap['image_url'] ?? null,
                                    'price_idr' => (int) ($snap['base_price_idr'] ?? ($snap['price'] ?? 0)),
                                ],
                            ]
                        ],
                    ]);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("CompletionAndSettlementService: after-sales notification failed: " . $e->getMessage());
        }
    }

    /**
     * Process 120-hour matured held funds release.
     * Strictly verifies with Finance 06 and checks for active disputes.
     */
    public function releaseMaturedFunds(): int
    {
        $maturedRefs = ServiceFinanceEntitlementRef::where('hold_status', 'HELD')
            ->where('release_eligible_at', '<=', now())
            ->get();

        $count = 0;
        foreach ($maturedRefs as $ref) {
            DB::transaction(function () use ($ref, &$count) {
                // 1. Guard against blocking disputes
                $hasBlockingIssue = OperationalIssue::where('order_id', $ref->order_id)
                    ->where('status', 'OPEN')
                    ->where('affects_completion', true)
                    ->exists();

                if ($hasBlockingIssue) {
                    return;
                }

                $order = ServiceOrder::find($ref->order_id);
                if (!$order) {
                    return;
                }

                // 2. Query Finance 06 held fund status (source of truth)
                $obligation = ServicePaymentObligation::where('order_id', $order->id)
                    ->where('purpose', 'SERVICE_EXECUTION')
                    ->first();
                $paidAttempt = $obligation?->attempts()->where('reported_status', 'PAID')->latest('attempt_no')->first();
                $merchantOrderId = ($paidAttempt && $paidAttempt->attempt_no > 1)
                    ? "{$order->id}-service_execution-att{$paidAttempt->attempt_no}"
                    : "{$order->id}-service_execution";

                $financeHeldFund = $this->financeClient->queryHeldFundByOrder($merchantOrderId);

                if ($financeHeldFund && ($financeHeldFund['status'] ?? '') === 'RELEASED_TO_SPAY') {
                    $ref->forceFill([
                        'hold_status' => 'AVAILABLE',
                        'updated_at' => now(),
                    ])->save();
                    $count++;
                    return;
                }

                // 3. Trigger targeted single release for this specific order on Finance 06
                try {
                    $this->financeClient->releaseHeldFundByOrder($merchantOrderId);
                } catch (\Throwable) {
                    return;
                }

                // 4. Re-check status from Finance 06
                $recheck = $this->financeClient->queryHeldFundByOrder($merchantOrderId);
                if ($recheck && ($recheck['status'] ?? '') === 'RELEASED_TO_SPAY') {
                    $ref->forceFill([
                        'hold_status' => 'AVAILABLE',
                        'updated_at' => now(),
                    ])->save();
                    $count++;
                }
            });
        }

        return $count;
    }
}
