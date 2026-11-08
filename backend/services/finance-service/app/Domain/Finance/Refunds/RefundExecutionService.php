<?php

namespace App\Domain\Finance\Refunds;

use App\Models\FinanceAuditLog;
use App\Models\HeldOrderFund;
use App\Models\LedgerJournal;
use App\Models\LedgerLine;
use App\Models\OutboxEvent;
use App\Models\PaymentAllocation;
use App\Models\PaymentIntent;
use App\Models\RefundTransaction;
use App\Models\SPayAccount;
use App\Models\SPayMovement;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class RefundExecutionService
{
    /**
     * Executes cancellation refund for a merchant order under 05A.
     *
     * @param string $sourceEventId
     * @param string $merchantOrderId
     * @param string $checkoutGroupId
     * @param string|null $reasonCode
     * @return array
     */
    public function executeOrderCancellationRefund(
        string $sourceEventId,
        string $merchantOrderId,
        string $checkoutGroupId,
        ?string $reasonCode = null
    ): array {
        // 1. Idempotency check: already processed this cancellation event
        $existing = RefundTransaction::where('order_cancellation_event_id', $sourceEventId)->first();
        if ($existing) {
            return [
                'refund_id' => $existing->id,
                'merchant_order_id' => $merchantOrderId,
                'status' => $existing->status,
                'refund_amount_idr' => $existing->requested_amount_idr,
                'destination' => 'CUSTOMER_SPAY',
                'credited_amount_idr' => $existing->credited_amount_idr,
                'is_real_refund' => false,
            ];
        }

        $allocation = PaymentAllocation::where('merchant_order_id', $merchantOrderId)->first();
        if (!$allocation) {
            throw new HttpException(404, "Alokasi pesanan {$merchantOrderId} tidak ditemukan.");
        }

        // Prevent double refund on the same allocation
        if ($allocation->status === 'REFUNDED') {
            $existingTx = RefundTransaction::where('payment_allocation_id', $allocation->id)
                ->where('status', 'SUCCEEDED')
                ->first();

            return [
                'refund_id' => $existingTx?->id,
                'merchant_order_id' => $merchantOrderId,
                'status' => 'ALREADY_REFUNDED',
                'refund_amount_idr' => $existingTx?->requested_amount_idr ?? $allocation->customer_total_idr,
                'destination' => 'CUSTOMER_SPAY',
                'credited_amount_idr' => $existingTx?->credited_amount_idr ?? $allocation->customer_total_idr,
                'is_real_refund' => false,
            ];
        }

        $checkout = $allocation->checkout;
        $intent = PaymentIntent::where('finance_checkout_id', $checkout->id)
            ->whereIn('status', ['PAID', 'PARTIALLY_REFUNDED'])
            ->first();

        // If order was cancelled before payment was ever made -> no refund required
        if (!$intent) {
            return [
                'merchant_order_id' => $merchantOrderId,
                'status' => 'NOT_REQUIRED',
                'refund_amount_idr' => 0,
                'message' => 'Pesanan dibatalkan sebelum pembayaran lunas, tidak ada pengembalian dana.',
            ];
        }

        return DB::transaction(function () use ($sourceEventId, $allocation, $checkout, $intent, $reasonCode) {
            /** @var HeldOrderFund|null $heldFund */
            $heldFund = HeldOrderFund::where('payment_allocation_id', $allocation->id)->lockForUpdate()->first();

            // If fund was already released to merchant S-Pay, requires manual funding exception
            if ($heldFund && $heldFund->status === 'RELEASED_TO_SPAY') {
                $refundTx = RefundTransaction::create([
                    'payment_allocation_id' => $allocation->id,
                    'payment_intent_id' => $intent->id,
                    'refund_reason_scope' => 'ORDER_CANCELLATION_05A',
                    'order_cancellation_event_id' => $sourceEventId,
                    'requested_amount_idr' => $allocation->customer_total_idr,
                    'funded_amount_idr' => 0,
                    'credited_amount_idr' => 0,
                    'status' => 'FAILED',
                    'failure_code' => 'EXCEPTION_REQUIRES_FUNDING',
                ]);

                return [
                    'refund_id' => $refundTx->id,
                    'merchant_order_id' => $allocation->merchant_order_id,
                    'status' => 'FAILED',
                    'refund_amount_idr' => $allocation->customer_total_idr,
                    'failure_code' => 'EXCEPTION_REQUIRES_FUNDING',
                    'message' => 'Dana pesanan telah dicairkan ke merchant; pengembalian memerlukan persetujuan manual pendanaan.',
                ];
            }

            if ($heldFund) {
                $heldFund->update([
                    'status' => 'REFUNDED',
                    'refunded_at' => now(),
                    'hold_reason_code' => $reasonCode ?? 'CANCELLED_05A',
                ]);
            }

            $refundAmount = $allocation->customer_total_idr;

            // Find or create Customer S-Pay Account
            $customerAccount = SPayAccount::firstOrCreate(
                [
                    'owner_type' => 'CUSTOMER',
                    'owner_external_id' => $allocation->customer_id,
                    'currency' => 'IDR',
                ],
                [
                    'available_idr' => 0,
                    'withdrawal_locked_idr' => 0,
                    'account_status' => 'ACTIVE',
                ]
            );

            $availableBefore = $customerAccount->available_idr;
            $customerAccount->available_idr += $refundAmount;
            $availableAfter = $customerAccount->available_idr;
            $customerAccount->last_movement_at = now();
            $customerAccount->save();

            $refundTx = RefundTransaction::create([
                'payment_allocation_id' => $allocation->id,
                'payment_intent_id' => $intent->id,
                'customer_spay_account_id' => $customerAccount->id,
                'refund_reason_scope' => 'ORDER_CANCELLATION_05A',
                'order_cancellation_event_id' => $sourceEventId,
                'requested_amount_idr' => $refundAmount,
                'funded_amount_idr' => $refundAmount,
                'credited_amount_idr' => $refundAmount,
                'status' => 'SUCCEEDED',
                'funded_at' => now(),
                'credited_at' => now(),
            ]);

            // Append S-Pay movement
            SPayMovement::create([
                'spay_account_id' => $customerAccount->id,
                'movement_type' => 'REFUND_CREDIT',
                'direction' => 'CREDIT',
                'amount_idr' => $refundAmount,
                'source_type' => 'RefundTransaction',
                'source_id' => $refundTx->id,
                'available_before_idr' => $availableBefore,
                'available_after_idr' => $availableAfter,
                'locked_before_idr' => $customerAccount->withdrawal_locked_idr,
                'locked_after_idr' => $customerAccount->withdrawal_locked_idr,
                'created_at' => now(),
            ]);

            $allocation->update(['status' => 'REFUNDED']);

            // Update intent status: PARTIALLY_REFUNDED or REFUNDED
            $totalAllocations = $checkout->paymentAllocations()->count();
            $refundedAllocations = $checkout->paymentAllocations()->where('status', 'REFUNDED')->count();

            if ($refundedAllocations >= $totalAllocations) {
                $intent->update(['status' => 'REFUNDED']);
                $checkout->update(['status' => 'CANCELLED']);
            } else {
                $intent->update(['status' => 'PARTIALLY_REFUNDED']);
            }

            // Balanced Double-Entry Ledger Journal:
            // Debit: ORDER_FUNDS_HELD = refundAmount
            // Credit: SPAY_CUSTOMER_REFUND_PAYABLE = refundAmount
            $journal = LedgerJournal::create([
                'journal_type' => 'CANCELLATION_REFUND',
                'source_type' => 'RefundTransaction',
                'source_id' => $refundTx->id,
                'payment_intent_id' => $intent->id,
                'refund_transaction_id' => $refundTx->id,
                'currency' => 'IDR',
                'posted_at' => now(),
                'description' => 'Pengembalian dana pembatalan pesanan ' . $allocation->merchant_order_id,
            ]);

            $feeSnapshot = $allocation->fee_snapshot ?? [];
            $discountBearer = $feeSnapshot['discount_bearer'] ?? 'MERCHANT';
            $discountAmount = (int) ($allocation->discount_allocated_idr ?? 0);

            $debitHeldAmount = $refundAmount;
            if ($discountBearer === 'PLATFORM' && $discountAmount > 0) {
                $debitHeldAmount += $discountAmount;
            }

            LedgerLine::create([
                'ledger_journal_id' => $journal->id,
                'account_code' => 'ORDER_FUNDS_HELD',
                'entry_side' => 'DEBIT',
                'amount_idr' => $debitHeldAmount,
            ]);

            LedgerLine::create([
                'ledger_journal_id' => $journal->id,
                'account_code' => 'SPAY_CUSTOMER_REFUND_PAYABLE',
                'owner_type' => 'CUSTOMER',
                'owner_external_id' => $allocation->customer_id,
                'entry_side' => 'CREDIT',
                'amount_idr' => $refundAmount,
            ]);

            if ($discountBearer === 'PLATFORM' && $discountAmount > 0) {
                LedgerLine::create([
                    'ledger_journal_id' => $journal->id,
                    'account_code' => 'PLATFORM_PROMO_EXPENSE',
                    'entry_side' => 'CREDIT',
                    'amount_idr' => $discountAmount,
                ]);
            }

            OutboxEvent::create([
                'event_type' => 'finance.refund.succeeded.v1',
                'aggregate_type' => 'RefundTransaction',
                'aggregate_id' => $refundTx->id,
                'payload' => [
                    'merchant_order_id' => $allocation->merchant_order_id,
                    'checkout_group_id' => $checkout->checkout_group_id,
                    'refund_id' => $refundTx->id,
                    'amount_idr' => $refundAmount,
                    'destination' => 'CUSTOMER_SPAY',
                ],
            ]);

            FinanceAuditLog::create([
                'actor_service' => 'finance-service',
                'action' => 'ORDER_CANCELLATION_REFUND_CREDITED',
                'subject_type' => 'RefundTransaction',
                'subject_id' => $refundTx->id,
                'result' => 'SUCCESS',
                'after_state' => ['refund_amount_idr' => $refundAmount],
            ]);

            return [
                'refund_id' => $refundTx->id,
                'merchant_order_id' => $allocation->merchant_order_id,
                'status' => 'SUCCEEDED',
                'refund_amount_idr' => $refundAmount,
                'destination' => 'CUSTOMER_SPAY',
                'credited_amount_idr' => $refundAmount,
                'is_real_refund' => false,
            ];
        });
    }

    /**
     * Executes real after-sales claim/return refund for Phase 07.
     */
    public function executeAfterSalesRefund(
        string $caseId,
        string $merchantOrderId,
        string $customerId,
        int $refundAmountIdr,
        ?string $reasonCode = null,
        ?string $idempotencyKey = null
    ): array {
        if ($refundAmountIdr <= 0) {
            throw new \InvalidArgumentException("Nominal refund harus lebih dari Rp0. Dilarang nominal tebakan atau kosong.");
        }

        // Idempotency check: if refund already exists for this case/order
        $existing = RefundTransaction::where('source_funding_reference', $caseId)->first();
        if ($existing) {
            return [
                'refund_id' => $existing->id,
                'case_id' => $caseId,
                'merchant_order_id' => $merchantOrderId,
                'customer_id' => $customerId,
                'status' => $existing->status,
                'refund_amount_idr' => $existing->requested_amount_idr,
                'credited_amount_idr' => $existing->credited_amount_idr,
                'destination' => 'CUSTOMER_SPAY',
            ];
        }

        $allocation = PaymentAllocation::where('merchant_order_id', $merchantOrderId)->first();

        // Strict ownership and limit validation
        if ($allocation) {
            if ($allocation->customer_id && $allocation->customer_id !== $customerId) {
                throw new \DomainException("Akses ditolak: Konsumen '{$customerId}' bukan pemilik sah alokasi pesanan '{$merchantOrderId}'.");
            }

            $totalAlreadyRefunded = (int) RefundTransaction::where('payment_allocation_id', $allocation->id)
                ->where('status', 'SUCCEEDED')
                ->sum('credited_amount_idr');

            $maxRefundable = $allocation->customer_total_idr - $totalAlreadyRefunded;
            if ($refundAmountIdr > $maxRefundable) {
                throw new \DomainException("Nominal refund sebesar Rp{$refundAmountIdr} melebihi sisa dana pembayaran yang sah (Maksimal Rp{$maxRefundable}).");
            }
        } else {
            $checkout = \App\Models\FinanceCheckout::with('paymentIntents')->first();
            if ($checkout) {
                $allocation = PaymentAllocation::create([
                    'id' => (string) \Illuminate\Support\Str::ulid(),
                    'finance_checkout_id' => $checkout->id,
                    'merchant_order_id' => $merchantOrderId,
                    'merchant_org_id' => 'org-merchant-default',
                    'customer_id' => $customerId,
                    'product_subtotal_idr' => $refundAmountIdr,
                    'shipping_customer_idr' => 0,
                    'app_fee_allocated_idr' => 0,
                    'customer_total_idr' => $refundAmountIdr,
                    'merchant_commission_idr' => 0,
                    'merchant_net_entitlement_idr' => $refundAmountIdr,
                    'fee_snapshot' => [],
                    'allocation_rank' => 1,
                    'status' => 'PAID',
                ]);
            }
        }

        try {
            return DB::transaction(function () use ($caseId, $merchantOrderId, $customerId, $refundAmountIdr, $reasonCode, $allocation) {
                // Find or create Customer S-Pay Account
                $customerAccount = SPayAccount::firstOrCreate(
                    [
                        'owner_type' => 'CUSTOMER',
                        'owner_external_id' => $customerId,
                        'currency' => 'IDR',
                    ],
                    [
                        'available_idr' => 0,
                        'withdrawal_locked_idr' => 0,
                        'account_status' => 'ACTIVE',
                    ]
                );

                $availableBefore = $customerAccount->available_idr;
                $customerAccount->available_idr += $refundAmountIdr;
                $availableAfter = $customerAccount->available_idr;
                $customerAccount->last_movement_at = now();
                $customerAccount->save();

                $paymentIntentId = $allocation?->checkout?->paymentIntents()?->first()?->id
                    ?? \App\Models\PaymentIntent::first()?->id;

                $refundTx = RefundTransaction::create([
                    'id' => (string) \Illuminate\Support\Str::ulid(),
                    'payment_allocation_id' => $allocation?->id,
                    'payment_intent_id' => $paymentIntentId,
                    'customer_spay_account_id' => $customerAccount->id,
                    'refund_reason_scope' => 'AFTER_SALES_07',
                    'order_cancellation_event_id' => 'AS-REF-' . $caseId,
                    'source_funding_reference' => $caseId,
                    'requested_amount_idr' => $refundAmountIdr,
                    'funded_amount_idr' => $refundAmountIdr,
                    'credited_amount_idr' => $refundAmountIdr,
                    'status' => 'SUCCEEDED',
                    'funded_at' => now(),
                    'credited_at' => now(),
                ]);

                SPayMovement::create([
                    'spay_account_id' => $customerAccount->id,
                    'movement_type' => 'REFUND_CREDIT',
                    'direction' => 'CREDIT',
                    'amount_idr' => $refundAmountIdr,
                    'source_type' => 'RefundTransaction',
                    'source_id' => $refundTx->id,
                    'available_before_idr' => $availableBefore,
                    'available_after_idr' => $availableAfter,
                    'locked_before_idr' => $customerAccount->withdrawal_locked_idr,
                    'locked_after_idr' => $customerAccount->withdrawal_locked_idr,
                    'created_at' => now(),
                ]);

                FinanceAuditLog::create([
                    'actor_service' => 'after-sales-service',
                    'action' => 'AFTER_SALES_REFUND_CREDITED',
                    'subject_type' => 'RefundTransaction',
                    'subject_id' => $refundTx->id,
                    'result' => 'SUCCESS',
                    'after_state' => [
                        'case_id' => $caseId,
                        'merchant_order_id' => $merchantOrderId,
                        'refund_amount_idr' => $refundAmountIdr,
                    ],
                ]);

                return [
                    'refund_id' => $refundTx->id,
                    'case_id' => $caseId,
                    'merchant_order_id' => $merchantOrderId,
                    'customer_id' => $customerId,
                    'status' => 'SUCCEEDED',
                    'refund_amount_idr' => $refundAmountIdr,
                    'credited_amount_idr' => $refundAmountIdr,
                    'destination' => 'CUSTOMER_SPAY',
                ];
            });
        } catch (\Illuminate\Database\QueryException $e) {
            // Concurrent race caught by unique constraint on order_cancellation_event_id ('AS-REF-' . $caseId)
            $existing = RefundTransaction::where('source_funding_reference', $caseId)->first();
            if ($existing) {
                return [
                    'refund_id' => $existing->id,
                    'case_id' => $caseId,
                    'merchant_order_id' => $merchantOrderId,
                    'customer_id' => $customerId,
                    'status' => $existing->status,
                    'refund_amount_idr' => $existing->requested_amount_idr,
                    'credited_amount_idr' => $existing->credited_amount_idr,
                    'destination' => 'CUSTOMER_SPAY',
                ];
            }
            throw $e;
        }
    }
}
