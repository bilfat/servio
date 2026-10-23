<?php

namespace App\Domain\Finance\Payments;

use App\Models\FinanceAuditLog;
use App\Models\HeldOrderFund;
use App\Models\LedgerJournal;
use App\Models\LedgerLine;
use App\Models\OutboxEvent;
use App\Models\PaymentEvent;
use App\Models\PaymentIntent;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class PaymentVerificationService
{
    /**
     * Simulates and verifies payment provider outcome for a mock payment intent.
     *
     * @param string $paymentId
     * @param string $outcome 'SUCCESS' or 'FAILED'
     * @param string $providerEventId
     * @param int|null $reportedAmountIdr
     * @param string|null $actorUserId
     * @return PaymentIntent
     */
    public function simulatePaymentOutcome(
        string $paymentId,
        string $outcome,
        string $providerEventId,
        ?int $reportedAmountIdr = null,
        ?string $actorUserId = null
    ): PaymentIntent {
        $outcome = strtoupper($outcome);
        if (!in_array($outcome, ['SUCCESS', 'FAILED'], true)) {
            throw new HttpException(422, 'Outcome simulator hanya boleh SUCCESS atau FAILED.');
        }

        if (empty($providerEventId) || trim($providerEventId) === '') {
            throw new HttpException(422, 'Provider event ID tidak boleh kosong.');
        }

        // Entire verification runs inside DB transaction with row-level locking (up to 3 retries for transient deadlocks)
        $isExpired = false;
        $expiredMessage = null;

        $intent = DB::transaction(function () use ($paymentId, $outcome, $providerEventId, $reportedAmountIdr, $actorUserId, &$isExpired, &$expiredMessage) {
            // 1. Acquire row-level lock on Payment Intent FIRST
            /** @var PaymentIntent|null $intent */
            $intent = PaymentIntent::where('id', $paymentId)->lockForUpdate()->first();
            if (!$intent) {
                throw new HttpException(404, 'Tagihan pembayaran tidak ditemukan.');
            }

            // 2. Re-read provider event under lock (idempotent callback deduplication)
            $existingEvent = PaymentEvent::where('provider', 'MOCK')
                ->where('provider_event_id', $providerEventId)
                ->first();

            if ($existingEvent) {
                return $intent->load('checkout.paymentAllocations');
            }

            // 3. Status check under lock: already PAID (idempotent, no duplicate mutations)
            // A payment that is already PAID cannot transition to EXPIRED or FAILED.
            if ($intent->status === 'PAID') {
                return $intent->load('checkout.paymentAllocations');
            }

            // 4. Strict transition check: FAILED cannot transition to PAID
            if ($intent->status === 'FAILED') {
                if ($outcome === 'SUCCESS') {
                    throw new HttpException(409, 'Pembayaran ditolak: tagihan telah berstatus FAILED dan tidak dapat diubah menjadi PAID.');
                }
                return $intent->load('checkout.paymentAllocations');
            }

            // 5. Expiration check under lock
            if ($intent->status === 'EXPIRED') {
                $isExpired = true;
                $expiredMessage = 'Pembayaran ditolak: tagihan telah kedaluwarsa.';
                return $intent->load('checkout.paymentAllocations');
            }

            if ($intent->status === 'PENDING' && now()->gte($intent->expires_at)) {
                $intent->update(['status' => 'EXPIRED', 'is_active' => false]);
                $intent->checkout?->update(['status' => 'EXPIRED']);

                PaymentEvent::firstOrCreate(
                    [
                        'payment_intent_id' => $intent->id,
                        'provider_event_id' => $providerEventId,
                    ],
                    [
                        'provider' => 'MOCK',
                        'event_type' => 'PAYMENT_EXPIRED',
                        'reported_amount_idr' => $reportedAmountIdr,
                        'received_at' => now(),
                        'validation_result' => 'EXPIRED',
                        'payload' => ['reason' => 'Event arrived at or after expiration timestamp'],
                    ]
                );

                OutboxEvent::create([
                    'event_type' => 'finance.payment.expired.v1',
                    'aggregate_type' => 'PaymentIntent',
                    'aggregate_id' => $intent->id,
                    'payload' => [
                        'checkout_group_id' => $intent->checkout?->checkout_group_id,
                        'payment_id' => $intent->id,
                        'status' => 'EXPIRED',
                    ],
                ]);

                $isExpired = true;
                $expiredMessage = 'Pembayaran ditolak: tagihan telah kedaluwarsa.';
                return $intent->load('checkout.paymentAllocations');
            }

            // 6. Amount mismatch check under lock
            if ($reportedAmountIdr !== null && (int) $reportedAmountIdr !== $intent->amount_idr) {
                PaymentEvent::create([
                    'payment_intent_id' => $intent->id,
                    'provider' => 'MOCK',
                    'provider_event_id' => $providerEventId,
                    'event_type' => 'PAYMENT_INVALID_AMOUNT',
                    'reported_amount_idr' => $reportedAmountIdr,
                    'received_at' => now(),
                    'validation_result' => 'AMOUNT_MISMATCH',
                    'payload' => ['expected' => $intent->amount_idr, 'reported' => $reportedAmountIdr],
                ]);

                throw new HttpException(422, 'Jumlah pembayaran yang dilaporkan tidak sesuai dengan nilai tagihan.');
            }

            // 7. Handle FAILED outcome
            if ($outcome === 'FAILED') {
                $intent->update([
                    'status' => 'FAILED',
                    'is_active' => false,
                    'last_provider_event_id' => $providerEventId,
                ]);

                $intent->checkout->update(['status' => 'FAILED']);

                PaymentEvent::create([
                    'payment_intent_id' => $intent->id,
                    'provider' => 'MOCK',
                    'provider_event_id' => $providerEventId,
                    'event_type' => 'PAYMENT_FAILED',
                    'reported_amount_idr' => $reportedAmountIdr ?? $intent->amount_idr,
                    'received_at' => now(),
                    'validation_result' => 'FAILED',
                    'payload' => ['outcome' => 'FAILED'],
                ]);

                OutboxEvent::create([
                    'event_type' => 'finance.payment.failed.v1',
                    'aggregate_type' => 'PaymentIntent',
                    'aggregate_id' => $intent->id,
                    'payload' => [
                        'checkout_group_id' => $intent->checkout->checkout_group_id,
                        'payment_id' => $intent->id,
                        'status' => 'FAILED',
                    ],
                ]);

                return $intent->load('checkout.paymentAllocations');
            }

            // 8. Handle SUCCESS outcome -> single atomic transition to PAID
            $intent->update([
                'status' => 'PAID',
                'paid_at' => now(),
                'is_active' => false,
                'last_provider_event_id' => $providerEventId,
            ]);

            $intent->checkout->update(['status' => 'PAID']);

            PaymentEvent::create([
                'payment_intent_id' => $intent->id,
                'provider' => 'MOCK',
                'provider_event_id' => $providerEventId,
                'event_type' => 'PAYMENT_PAID',
                'reported_amount_idr' => $reportedAmountIdr ?? $intent->amount_idr,
                'provider_occurred_at' => now(),
                'received_at' => now(),
                'validation_result' => 'VALID',
                'payload' => ['outcome' => 'SUCCESS', 'amount_idr' => $intent->amount_idr],
            ]);

            // Create Held Order Funds for each allocation and calculate platform subsidy if any
            $merchantOrderIds = [];
            $totalPlatformSubsidy = 0;
            $totalGrossHeld = 0;

            foreach ($intent->checkout->paymentAllocations as $alloc) {
                $alloc->update(['status' => 'PAID']);
                $merchantOrderIds[] = $alloc->merchant_order_id;

                $feeSnapshot = $alloc->fee_snapshot ?? [];
                $discountBearer = $feeSnapshot['discount_bearer'] ?? 'MERCHANT';
                $discountAmount = (int) ($alloc->discount_allocated_idr ?? 0);

                // If platform subsidizes the discount, the gross held covers customer payment + platform subsidy
                $grossHeldForOrder = $alloc->customer_total_idr;
                if ($discountBearer === 'PLATFORM' && $discountAmount > 0) {
                    $grossHeldForOrder += $discountAmount;
                    $totalPlatformSubsidy += $discountAmount;
                }

                $totalGrossHeld += $grossHeldForOrder;

                HeldOrderFund::firstOrCreate(
                    ['payment_allocation_id' => $alloc->id],
                    [
                        'status' => 'HELD',
                        'gross_held_idr' => $grossHeldForOrder,
                        'merchant_entitlement_idr' => $alloc->merchant_net_entitlement_idr,
                    ]
                );
            }

            // Balanced Double-Entry Ledger Journal:
            // Debit: MOCK_PROVIDER_CLEARING = $intent->amount_idr (customer payment collected)
            // Debit (if platform discount): PLATFORM_PROMO_EXPENSE = $totalPlatformSubsidy (platform promo funded)
            // Credit: ORDER_FUNDS_HELD = $totalGrossHeld
            // Invariant: Customer Amount + Platform Subsidy == Total Gross Held!
            $journal = LedgerJournal::create([
                'journal_type' => 'PAYMENT_SETTLEMENT',
                'source_type' => 'PaymentIntent',
                'source_id' => $intent->id,
                'payment_intent_id' => $intent->id,
                'currency' => $intent->currency,
                'posted_at' => now(),
                'description' => 'Pembayaran tagihan checkout ' . $intent->checkout->checkout_group_id . ' lunas',
            ]);

            LedgerLine::create([
                'ledger_journal_id' => $journal->id,
                'account_code' => 'MOCK_PROVIDER_CLEARING',
                'entry_side' => 'DEBIT',
                'amount_idr' => $intent->amount_idr,
            ]);

            if ($totalPlatformSubsidy > 0) {
                LedgerLine::create([
                    'ledger_journal_id' => $journal->id,
                    'account_code' => 'PLATFORM_PROMO_EXPENSE',
                    'entry_side' => 'DEBIT',
                    'amount_idr' => $totalPlatformSubsidy,
                ]);
            }

            LedgerLine::create([
                'ledger_journal_id' => $journal->id,
                'account_code' => 'ORDER_FUNDS_HELD',
                'entry_side' => 'CREDIT',
                'amount_idr' => $totalGrossHeld,
            ]);

            // Outbox event to 05A Order Service
            OutboxEvent::create([
                'event_type' => 'finance.payment.confirmed.v1',
                'aggregate_type' => 'PaymentIntent',
                'aggregate_id' => $intent->id,
                'payload' => [
                    'checkout_group_id' => $intent->checkout->checkout_group_id,
                    'payment_id' => $intent->id,
                    'amount_idr' => $intent->amount_idr,
                    'currency' => $intent->currency,
                    'paid_at' => $intent->paid_at->toIso8601String(),
                    'merchant_order_ids' => $merchantOrderIds,
                ],
            ]);

            FinanceAuditLog::create([
                'actor_user_id' => $actorUserId,
                'actor_service' => 'finance-service',
                'action' => 'PAYMENT_SIMULATED_PAID',
                'subject_type' => 'PaymentIntent',
                'subject_id' => $intent->id,
                'result' => 'SUCCESS',
                'after_state' => ['status' => 'PAID', 'amount_idr' => $intent->amount_idr],
            ]);

            return $intent->load('checkout.paymentAllocations');
        }, 3);

        if ($isExpired) {
            throw new HttpException(410, $expiredMessage ?? 'Pembayaran ditolak: tagihan telah kedaluwarsa.');
        }

        return $intent;
    }
}
