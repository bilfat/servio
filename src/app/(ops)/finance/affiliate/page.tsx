"use client";

import FinanceOperationsPage from "../fee/operations/page";

/**
 * RECONCILED ROUTE: /ops/finance/affiliate -> Operasional Fee & Rekonsiliasi
 * Direct fee percentage mutation ("updateOperationalFeeRate") has been completely removed.
 * All fee mutations now strictly route through the Finance Proposal -> CEO Approval flow.
 */
export default function ReconciledAffiliateOperationsPage() {
  return <FinanceOperationsPage />;
}
