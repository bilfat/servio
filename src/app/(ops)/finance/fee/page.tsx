"use client";

import FinancePlatformPoliciesPage from "../policies/page";

/**
 * RECONCILED ROUTE: /ops/finance/fee -> Kebijakan Platform (Read-Only)
 * Centralized read-only portal for Finance platform policy monitoring (Active, Scheduled, History).
 */
export default function ReconciledFinanceFeeHubPage() {
  return <FinancePlatformPoliciesPage />;
}
