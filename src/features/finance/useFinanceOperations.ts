"use client";

export type {
  PaymentGatewayStatus,
  PaymentMethod,
  GatewayTransaction,
  RefundStatus,
  RefundRequest,
  PayoutStatus,
  VendorPayout,
  ReconciliationMatchStatus,
  ReconciliationItem,
} from "@/mocks/financeOps";

import { useDomainRepository } from "@/lib/repository/domainRepository";
import { refundsApi } from "@/lib/servioApi";

export function useFinanceOperations() {
  const repo = useDomainRepository();
  const transactions = repo.transactions;
  const refunds = repo.refunds;
  const payouts = repo.payouts;
  const reconciliations = repo.reconciliations;

  // Escrow Metrics
  const activeEscrowTotal = 48500000;
  const platformGMVToday = transactions.reduce((acc, t) => acc + (t.status === "SETTLED" ? t.grossAmount : 0), 0);
  const dailyPayoutTotal = payouts
    .filter((p) => p.status === "RELEASED")
    .reduce((sum, p) => sum + p.payoutAmount, 0);
  const pendingPayoutTotal = payouts
    .filter((p) => p.status === "READY_BATCH")
    .reduce((sum, p) => sum + p.payoutAmount, 0);

  // 1. Force Manual Webhook Verification
  const forceVerifyWebhook = (trxId: string, verifiedBy: string = "Finance Ops") => {
    repo.verifyPayment(trxId, verifiedBy);
  };

  // 2. Approve Refund
  const approveRefund = (refundId: string, notes: string = "Approved by Finance Ops") => {
    repo.approveFinanceRefund(refundId, notes);
    const target = refunds.find((r) => r.id === refundId);
    if (target) {
      refundsApi
        .execute({
          orderId: target.orderId,
          amount: target.refundAmount,
          reason: notes,
        })
        .catch((err) => console.warn("Backend refund execute async sync:", err));
    }
  };

  // 3. Reject / Hold Refund
  const rejectRefund = (refundId: string, reason: string) => {
    repo.rejectFinanceRefund(refundId, reason);
  };

  // 4. Batch Release Payouts
  const batchReleasePayouts = () => {
    payouts.forEach((p) => {
      if (p.status === "READY_BATCH") {
        p.status = "RELEASED";
        p.releasedAt = "Baru saja (Batch Auto-Disbursement)";
      }
    });
    repo.notify();
  };

  // 5. Individual Release Payout
  const releaseIndividualPayout = (payoutId: string) => {
    repo.releaseFinancePayout(payoutId);
  };

  // 6. Hold Payout for Fraud Check
  const holdPayoutFraud = (payoutId: string, reason: string) => {
    repo.holdFinancePayout(payoutId, reason);
  };

  // 7. Auto Reconcile Match
  const triggerAutoReconciliation = () => {
    reconciliations.forEach((r) => {
      if (r.status === "UNMATCHED_GATEWAY") {
        r.status = "MATCHED";
        r.matchedAt = "Rekonsiliasi Otomatis (Baru saja)";
      }
    });
    repo.notify();
  };

  return {
    transactions,
    refunds,
    payouts,
    reconciliations,
    activeEscrowTotal,
    platformGMVToday,
    dailyPayoutTotal,
    pendingPayoutTotal,
    forceVerifyWebhook,
    approveRefund,
    rejectRefund,
    batchReleasePayouts,
    releaseIndividualPayout,
    holdPayoutFraud,
    triggerAutoReconciliation,
  };
}

