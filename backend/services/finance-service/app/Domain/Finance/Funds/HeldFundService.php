<?php

namespace App\Domain\Finance\Funds;

use App\Models\FinanceAuditLog;
use App\Models\HeldOrderFund;
use App\Models\LedgerJournal;
use App\Models\LedgerLine;
use App\Models\PaymentAllocation;
use App\Models\SPayAccount;
use App\Models\SPayMovement;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class HeldFundService
{
    /**
     * Handles order completion event from 05A Order Service.
     * Sets completed_at and schedules release eligibility exactly 120 hours after completed_at.
     */
    public function handleOrderCompleted(
        string $merchantOrderId,
        string $completedAt,
        int $orderVersion,
        bool $activeHold = false
    ): HeldOrderFund {
        $allocation = PaymentAllocation::where('merchant_order_id', $merchantOrderId)->first();
        if (!$allocation) {
            throw new HttpException(404, "Alokasi pembayaran untuk pesanan merchant {$merchantOrderId} tidak ditemukan.");
        }

        // Must be paid
        if ($allocation->status !== 'PAID') {
            throw new HttpException(422, "Pesanan {$merchantOrderId} belum lunas dibayar (status alokasi: {$allocation->status}). Event ORDER_COMPLETED ditolak.");
        }

        $checkout = $allocation->checkout;
        $isPaid = $checkout && $checkout->paymentIntents()->whereIn('status', ['PAID', 'PARTIALLY_REFUNDED'])->exists();
        if (!$isPaid) {
            throw new HttpException(422, "Tagihan pembayaran checkout belum berstatus lunas. Event ORDER_COMPLETED ditolak.");
        }

        return DB::transaction(function () use ($allocation, $completedAt, $orderVersion, $activeHold) {
            /** @var HeldOrderFund $heldFund */
            $heldFund = HeldOrderFund::where('payment_allocation_id', $allocation->id)->lockForUpdate()->first();
            if (!$heldFund) {
                $heldFund = HeldOrderFund::create([
                    'payment_allocation_id' => $allocation->id,
                    'status' => 'HELD',
                    'gross_held_idr' => $allocation->customer_total_idr,
                    'merchant_entitlement_idr' => $allocation->merchant_net_entitlement_idr,
                ]);
            }

            // Ignore stale event versions if already processed newer version
            if ($heldFund->order_event_version !== null && $orderVersion < $heldFund->order_event_version) {
                return $heldFund;
            }

            $completedTime = Carbon::parse($completedAt);
            $eligibleTime = $completedTime->copy()->addHours(120); // 120 hours hold

            $heldFund->completed_at = $completedTime;
            $heldFund->eligible_release_at = $eligibleTime;
            $heldFund->order_event_version = $orderVersion;

            if ($activeHold) {
                $heldFund->status = 'HOLD_BLOCKED';
                $heldFund->hold_reason_code = 'ORDER_ACTIVE_HOLD_FLAG';
            } elseif ($heldFund->status === 'HOLD_BLOCKED') {
                $heldFund->status = 'HELD';
            }

            $heldFund->save();

            return $heldFund;
        });
    }

    /**
     * Handles order hold status changes (disputes, investigation, or release) from 05A/09.
     */
    public function handleOrderHoldChanged(
        string $merchantOrderId,
        bool $isHoldActive,
        string $reasonCode,
        int $orderVersion = 1
    ): HeldOrderFund {
        $allocation = PaymentAllocation::where('merchant_order_id', $merchantOrderId)->first();
        if (!$allocation) {
            throw new HttpException(404, "Alokasi pembayaran untuk pesanan merchant {$merchantOrderId} tidak ditemukan.");
        }

        return DB::transaction(function () use ($allocation, $isHoldActive, $reasonCode, $orderVersion) {
            /** @var HeldOrderFund|null $heldFund */
            $heldFund = HeldOrderFund::where('payment_allocation_id', $allocation->id)->lockForUpdate()->first();
            if (!$heldFund) {
                throw new HttpException(404, "Dana tertahan untuk pesanan {$allocation->merchant_order_id} tidak ditemukan.");
            }

            // Stale event check
            if ($heldFund->order_event_version !== null && $orderVersion < $heldFund->order_event_version) {
                return $heldFund;
            }

            // Cannot alter already released or refunded funds
            if ($heldFund->status === 'RELEASED_TO_SPAY' || $heldFund->status === 'REFUNDED') {
                return $heldFund;
            }

            if ($isHoldActive) {
                $heldFund->status = 'HOLD_BLOCKED';
                $heldFund->hold_reason_code = $reasonCode ?: 'ORDER_HOLD_ACTIVE';
            } else {
                $heldFund->status = 'HELD';
                $heldFund->hold_reason_code = null;
            }

            $heldFund->order_event_version = $orderVersion;
            $heldFund->save();

            FinanceAuditLog::create([
                'actor_service' => 'finance-service',
                'action' => $isHoldActive ? 'ORDER_HOLD_APPLIED' : 'ORDER_HOLD_LIFTED',
                'subject_type' => 'HeldOrderFund',
                'subject_id' => $heldFund->id,
                'result' => 'SUCCESS',
                'reason_code' => $reasonCode,
                'after_state' => ['status' => $heldFund->status],
            ]);

            return $heldFund;
        });
    }

    /**
     * Releases matured funds (completed_at + 120 hours reached with no active hold/dispute).
     *
     * @return int Number of released held funds
     */
    public function releaseMaturedHeldFunds(): int
    {
        $now = now();
        $maturedFunds = HeldOrderFund::where('status', 'HELD')
            ->whereNotNull('eligible_release_at')
            ->where('eligible_release_at', '<=', $now)
            ->with('allocation')
            ->get();

        $releasedCount = 0;

        foreach ($maturedFunds as $fund) {
            $released = $this->releaseSingleFund($fund->id);
            if ($released) {
                $releasedCount++;
            }
        }

        return $releasedCount;
    }

    /**
     * Releases a single held fund atomically to Merchant's S-Pay account.
     */
    public function releaseSingleFund(string $heldFundId): bool
    {
        return DB::transaction(function () use ($heldFundId) {
            /** @var HeldOrderFund|null $fund */
            $fund = HeldOrderFund::where('id', $heldFundId)->lockForUpdate()->first();
            if (!$fund || $fund->status !== 'HELD') {
                return false;
            }

            // Invariant check: cannot release before eligible_release_at
            if (empty($fund->eligible_release_at) || now()->lt($fund->eligible_release_at)) {
                return false;
            }

            $alloc = $fund->allocation;
            if (!$alloc) {
                return false;
            }

            $fund->status = 'RELEASED_TO_SPAY';
            $fund->released_at = now();
            $fund->save();

            // Find or create Merchant S-Pay Account
            $account = SPayAccount::firstOrCreate(
                [
                    'owner_type' => 'MERCHANT_ORGANIZATION',
                    'owner_external_id' => $alloc->merchant_org_id,
                    'currency' => 'IDR',
                ],
                [
                    'available_idr' => 0,
                    'withdrawal_locked_idr' => 0,
                    'account_status' => 'ACTIVE',
                ]
            );

            $availableBefore = $account->available_idr;
            $account->available_idr += $fund->merchant_entitlement_idr;
            $availableAfter = $account->available_idr;
            $account->last_movement_at = now();
            $account->save();

            // Append S-Pay movement
            SPayMovement::create([
                'spay_account_id' => $account->id,
                'movement_type' => 'MERCHANT_RELEASE',
                'direction' => 'CREDIT',
                'amount_idr' => $fund->merchant_entitlement_idr,
                'source_type' => 'HeldOrderFund',
                'source_id' => $fund->id,
                'available_before_idr' => $availableBefore,
                'available_after_idr' => $availableAfter,
                'locked_before_idr' => $account->withdrawal_locked_idr,
                'locked_after_idr' => $account->withdrawal_locked_idr,
                'created_at' => now(),
            ]);

            // Balanced Double-Entry Ledger Journal:
            // Debit: ORDER_FUNDS_HELD = gross_held_idr
            // Credit: SPAY_MERCHANT_PAYABLE = merchant_entitlement_idr
            // Credit: PLATFORM_FEE_PENDING_OR_RECOGNIZED = commission + app fee
            // Credit: TAX_PAYABLE_IF_APPLICABLE = taxes
            $journal = LedgerJournal::create([
                'journal_type' => 'HELD_RELEASE',
                'source_type' => 'HeldOrderFund',
                'source_id' => $fund->id,
                'currency' => 'IDR',
                'posted_at' => now(),
                'description' => 'Pencairan dana tertahan pesanan ' . $alloc->merchant_order_id . ' ke S-Pay Merchant',
            ]);

            LedgerLine::create([
                'ledger_journal_id' => $journal->id,
                'account_code' => 'ORDER_FUNDS_HELD',
                'owner_type' => 'MERCHANT_ORGANIZATION',
                'owner_external_id' => $alloc->merchant_org_id,
                'entry_side' => 'DEBIT',
                'amount_idr' => $fund->gross_held_idr,
            ]);

            LedgerLine::create([
                'ledger_journal_id' => $journal->id,
                'account_code' => 'SPAY_MERCHANT_PAYABLE',
                'owner_type' => 'MERCHANT_ORGANIZATION',
                'owner_external_id' => $alloc->merchant_org_id,
                'entry_side' => 'CREDIT',
                'amount_idr' => $fund->merchant_entitlement_idr,
            ]);

            $commission = (int) $alloc->merchant_commission_idr;
            $appFee = (int) $alloc->app_fee_allocated_idr;
            $platformFee = $commission + $appFee;

            if ($platformFee > 0) {
                LedgerLine::create([
                    'ledger_journal_id' => $journal->id,
                    'account_code' => 'PLATFORM_FEE_PENDING_OR_RECOGNIZED',
                    'entry_side' => 'CREDIT',
                    'amount_idr' => $platformFee,
                ]);
            }

            $taxTotal = $alloc->merchant_tax_or_withholding_idr + $alloc->customer_tax_allocated_idr;
            if ($taxTotal > 0) {
                LedgerLine::create([
                    'ledger_journal_id' => $journal->id,
                    'account_code' => 'TAX_PAYABLE_IF_APPLICABLE',
                    'entry_side' => 'CREDIT',
                    'amount_idr' => $taxTotal,
                ]);
            }

            FinanceAuditLog::create([
                'actor_service' => 'finance-service',
                'action' => 'HELD_FUND_RELEASED_TO_SPAY',
                'subject_type' => 'HeldOrderFund',
                'subject_id' => $fund->id,
                'result' => 'SUCCESS',
                'after_state' => [
                    'merchant_entitlement_idr' => $fund->merchant_entitlement_idr,
                    'spay_account_id' => $account->id,
                ],
            ]);

            return true;
        });
    }
}
