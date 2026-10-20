export type SPayOwnerType = "CUSTOMER" | "MERCHANT" | "SERVICE_PROVIDER";

export type SPayTransactionType =
  | "REFUND_IN"
  | "WITHDRAWAL"
  | "REFUND_PENDING"
  | "SETTLEMENT_SALES"
  | "SETTLEMENT_SERVICE"
  | "SETTLEMENT_PENDING"
  | "HOLD_SECURITY"
  | "RESERVED_DISPUTE";

export type SPayTransactionStatus = "COMPLETED" | "PROCESSING" | "REQUESTED" | "FAILED";

export type SPayTransactionDirection = "IN" | "OUT";

export type SPaySimulationResult = "SUCCESS" | "FAIL";

export interface SPayTransaction {
  id: string;
  referenceNo: string;
  type: SPayTransactionType;
  direction: SPayTransactionDirection;
  amount: number;
  fee?: number;
  timestamp: string;
  status: SPayTransactionStatus;
  title: string;
  description: string;
  channel?: string;
  notes?: string;
}

export interface SPayBankAccount {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  isPrimary: boolean;
  logoUrl?: string;
}

export interface SPayBalanceBreakdown {
  // Primary withdrawable amount
  withdrawableBalance: number;

  // Customer specific
  pendingRefundBalance?: number;

  // Merchant & Service Provider specific
  pendingSettlement?: number;
  reservedBalance?: number;
  financialHold?: number;
  outstandingObligation?: number;
}

export interface SPayAccountSummary extends SPayBalanceBreakdown {
  ownerType: SPayOwnerType;
  organizationId?: string;
  organizationName?: string;
  ownerName: string;
  accountNumber: string; // S-Pay Virtual Account Identifier
  destinationAccounts: SPayBankAccount[];
  transactions: SPayTransaction[];
}

export interface SPayWithdrawSimulationParams {
  amount: number;
  destinationAccountId: string;
  notes?: string;
  simulationResult: SPaySimulationResult;
}

export interface SPayWithdrawResult {
  success: boolean;
  status: SPayTransactionStatus;
  transaction?: SPayTransaction;
  message: string;
}
