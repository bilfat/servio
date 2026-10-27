<?php

declare(strict_types=1);

namespace App\Domain\Completion;

use App\Domain\Order\OrderTransitionService;
use App\Infrastructure\Dispute\DisputeAuthorityClient;
use App\Models\Order;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoCompletionService
{
    public function __construct(
        protected OrderTransitionService $orderTransitionService,
        protected DisputeAuthorityClient $disputeClient,
    ) {}

    /**
     * Unified completion eligibility verification for both Customer manual confirmation
     * and Scheduler auto-completion (FIX 19 & FIX 24).
     * Strictly verifies order status, proof of delivery (POD), local hold, and authoritative dispute clearance.
     *
     * @return array{eligible: bool, error_code?: string, message?: string, status_code?: int}
     */
    public function verifyCompletionEligibility(Order $order, bool $isManual = false): array
    {
        // 1. Order status must be DELIVERED
        if ($order->status !== Order::STATUS_DELIVERED) {
            return [
                'eligible' => false,
                'error_code' => 'INVALID_STATUS',
                'message' => "Penyelesaian pesanan hanya dapat dilakukan pada status DELIVERED (status saat ini: {$order->status}).",
                'status_code' => 409,
            ];
        }

        // 2. Strict Proof of Delivery (POD) verification (FIX 10)
        $delivery = $order->delivery;
        if (!$delivery || !$delivery->proof_verified || empty($delivery->proof_reference) || empty($delivery->delivered_at)) {
            return [
                'eligible' => false,
                'error_code' => 'UNVERIFIED_DELIVERY_PROOF',
                'message' => 'Bukti pengiriman (POD) belum terverifikasi atau referensi tanda terima tidak lengkap.',
                'status_code' => 422,
            ];
        }

        // 3. For auto-completion, minimum 72 hours from delivered_at
        if (!$isManual) {
            $cutoff = now()->subHours(72);
            $deliveredAt = \Illuminate\Support\Carbon::parse($order->delivered_at);
            if ($deliveredAt->isAfter($cutoff)) {
                return [
                    'eligible' => false,
                    'error_code' => 'DELIVERY_SLA_NOT_MET',
                    'message' => 'Auto-completion memerlukan minimal 72 jam setelah barang terkirim.',
                    'status_code' => 409,
                ];
            }
        }

        // 4. Local hold check (FIX 09 & FIX 18)
        if ($order->is_hold_active) {
            return [
                'eligible' => false,
                'error_code' => 'ACTIVE_HOLD_BLOCKED',
                'message' => "Pesanan sedang dalam masa penangguhan (hold/dispute: {$order->hold_reason}) dan tidak dapat diselesaikan.",
                'status_code' => 409,
            ];
        }

        // 5. Authoritative dispute authority clearance check (FIX 19 & FIX 24)
        $disputeClearance = $this->disputeClient->verifyDisputeClearance($order->id);

        if ($disputeClearance['status'] === 'PENDING_DISPUTE_AUTHORITY') {
            return [
                'eligible' => false,
                'error_code' => 'PENDING_DISPUTE_AUTHORITY',
                'message' => "Otoritas sengketa eksternal belum siap: {$disputeClearance['message']}",
                'status_code' => 409,
            ];
        }

        if (!empty($disputeClearance['has_active_dispute']) || !empty($disputeClearance['has_active_complaint'])) {
            return [
                'eligible' => false,
                'error_code' => 'ACTIVE_DISPUTE_BLOCKED',
                'message' => "Pesanan memiliki sengketa/komplain aktif pada modul pemilik: {$disputeClearance['message']}",
                'status_code' => 409,
            ];
        }

        if ($disputeClearance['status'] !== 'CLEAR') {
            return [
                'eligible' => false,
                'error_code' => 'DISPUTE_STATUS_UNCLEAR',
                'message' => "Status clearance sengketa tidak terverifikasi ({$disputeClearance['status']}).",
                'status_code' => 409,
            ];
        }

        return [
            'eligible' => true,
        ];
    }

    /**
     * Customer manually confirms order receipt: DELIVERED -> COMPLETED.
     * Guard: Strictly checks ownership, proof of delivery, active hold, and dispute authority clearance (FIX 24).
     */
    public function confirmReceivedByCustomer(string $customerId, string $orderId): Order
    {
        return DB::transaction(function () use ($customerId, $orderId) {
            /** @var Order|null $order */
            $order = Order::where('id', $orderId)->lockForUpdate()->first();
            if (!$order) {
                throw new Exception('Pesanan tidak ditemukan.', 404);
            }

            if ($order->customer_id !== $customerId) {
                throw new Exception('Akses ditolak: Pesanan bukan milik customer terautentikasi.', 403);
            }

            $eligibility = $this->verifyCompletionEligibility($order, true);
            if (!$eligibility['eligible']) {
                throw new Exception($eligibility['message'], $eligibility['status_code'] ?? 409);
            }

            return $this->orderTransitionService->transition(
                order: $order,
                newStatus: Order::STATUS_COMPLETED,
                action: 'CUSTOMER_CONFIRMED_DELIVERY',
                actorId: $customerId,
                actorRole: 'CUSTOMER',
                extraAttributes: ['completed_at' => now()]
            );
        });
    }

    /**
     * Auto-completion scheduler:
     * Finds orders where status = DELIVERED AND delivered_at <= now() - 72 hours AND is_hold_active = false.
     * Strictly verifies POD (FIX 10) AND verifies authoritative dispute clearance with dispute authority (FIX 19 & FIX 24).
     * If dispute authority contract is pending or status cannot be verified, fails closed (PENDING_DISPUTE_AUTHORITY).
     */
    public function processAutoCompletions(): int
    {
        $eligibleCutoff = now()->subHours(72);

        $eligibleOrders = Order::where('status', Order::STATUS_DELIVERED)
            ->where('is_hold_active', false)
            ->whereNotNull('delivered_at')
            ->where('delivered_at', '<=', $eligibleCutoff)
            ->get();

        $completedCount = 0;

        foreach ($eligibleOrders as $ord) {
            try {
                DB::transaction(function () use ($ord, &$completedCount) {
                    /** @var Order|null $locked */
                    $locked = Order::where('id', $ord->id)->lockForUpdate()->first();
                    if (!$locked || $locked->status !== Order::STATUS_DELIVERED) {
                        return;
                    }

                    $eligibility = $this->verifyCompletionEligibility($locked, false);
                    if (!$eligibility['eligible']) {
                        Log::info("AutoCompletion: Skipped order {$locked->id} - {$eligibility['message']}");
                        return;
                    }

                    $this->orderTransitionService->transition(
                        order: $locked,
                        newStatus: Order::STATUS_COMPLETED,
                        action: 'SYSTEM_AUTO_COMPLETED_72H',
                        actorId: 'SYSTEM',
                        actorRole: 'SYSTEM',
                        reasonNote: 'Penyelesaian otomatis setelah 72 jam dari status DELIVERED dengan verifikasi bebas sengketa oleh otoritas sah.',
                        extraAttributes: ['completed_at' => now()]
                    );

                    $completedCount++;
                });
            } catch (\Throwable $e) {
                Log::error("AutoCompletion: Failed processing order {$ord->id}: " . $e->getMessage());
            }
        }

        return $completedCount;
    }
}

