export type AfterSalesCaseType = "claim_product" | "claim_service" | "return_product";

export type AfterSalesMainStatus =
  | "SUBMITTED"           // Diajukan
  | "UNDER_REVIEW"        // Ditinjau
  | "IN_RESOLUTION"       // Dalam Penyelesaian
  | "COMPLETED"           // Selesai
  | "REJECTED"            // Ditolak
  | "CANCELLED"           // Dibatalkan
  | "AWAITING_RETURN";    // Menunggu Pengembalian Fisik

export type AfterSalesSpecialCondition =
  | "NONE"
  | "NO_RESPONSE"                  // Tidak Ditanggapi (+72 jam SLA)
  | "WAITING_CUSTOMER_INFO"        // Menunggu Informasi Customer
  | "CANCELLED"                    // Dibatalkan
  | "WAITING_CUSTOMER_APPROVAL";   // Menunggu Persetujuan Customer (solusi alternatif)

export type AfterSalesSolutionType = "REPAIR" | "REPLACEMENT" | "REFUND" | "OTHER";

export type RefundStepStatus =
  | "APPROVED"          // Disetujui (hak pengembalian tercatat)
  | "PROCESSING"        // Diproses (sedang ditangani, dana belum tersedia)
  | "COMPLETED_DEMO"    // Berhasil (Simulasi, bukan dana nyata)
  | "SUCCEEDED"         // Berhasil (dana telah masuk ke saldo S-Pay)
  | "REVERSED"          // Dibatalkan / dikembalikan
  | "PENDING"           // Menunggu antrean
  | "FAILED";           // Terkendala (saldo tidak berubah)

export interface RefundBreakdown {
  productAmount: number;
  approvedShippingAmount: number;
  feeAdjustment: number;
  totalRefund: number;
  approvedAt: string;
  refundReference: string;
  status: RefundStepStatus;
  financeStatus?: string;
  statusNote?: string;
  payoutDestination?: string; // e.g. "Saldo S-Pay Customer (Simulasi)"
}

export interface WarrantyJobProgress {
  jobId: string;
  jobTitle: string; // e.g. "Klaim Garansi — Service AC Cuci & Perawatan"
  isWarrantyCovered: boolean; // true = Rp0
  coveredAmountText: string;  // "Rp0 (Ditanggung Garansi Layanan)"
  workerName?: string;
  workerPhone?: string;
  scheduledDate?: string;
  operationalStatus: "ASSIGNED" | "OTW" | "IN_PROGRESS" | "DONE";
  notes?: string;
  paidWorkQuote?: {
    amount: number;
    description: string;
    customerApproved?: boolean;
  };
}

export interface ReplacementProgress {
  replacementItemName: string;
  courierName: string;
  trackingNumber?: string;
  shippingStatus: "PREPARING" | "SHIPPED" | "DELIVERED";
  estimatedArrival?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface ShippingExpenseDetail {
  expenseType: "INITIAL_PURCHASE_SHIPPING" | "RETURN_SHIPPING" | "REPLACEMENT_SHIPPING";
  feePayer: "MERCHANT" | "CUSTOMER" | "PLATFORM" | "CARRIER";
  actualFeeIdr: number;
  paidBy: "MERCHANT" | "CUSTOMER" | "PLATFORM" | "CARRIER";
  verificationStatus: "PENDING_VERIFICATION" | "VERIFIED" | "DISPUTED" | "NOT_APPLICABLE";
  approvedReimbursementIdr: number;
  reimbursementStatus: "NOT_REQUIRED" | "PENDING_FINANCE_CONTRACT" | "PROCESSING" | "SUCCEEDED" | "REJECTED";
  receiptRef?: string;
  notes?: string;
}

export interface ReturnShippingDetail {
  requiresPhysicalReturn: boolean;
  noReturnReason?: string;
  shippingFeePayer: "MERCHANT" | "CUSTOMER" | "THIRD_PARTY";
  feePayerExplanation: string;
  recipientName?: string;
  recipientPhone?: string;
  returnAddress?: string;
  packagingInstructions?: string;
  shippingFeeMethod?: string;
  reimbursementInstructions?: string;
  deadlineAt?: string;
  courierName?: string;
  trackingNumber?: string;
  shippedAt?: string;
  shippingFeeReceiptUrl?: string;
  feePaymentProofUrl?: string;
  claimedShippingFee?: number;
  customerNotes?: string;
  receivedByMerchant?: boolean;
  receivedAt?: string;
  receivedBy?: string;
  quantityReceived?: number;
  packageCondition?: string;
  receiptProofUrl?: string;
  receiptNotes?: string;
  receiptStatus?: "RECEIVED" | "DISPUTED_NOT_RECEIVED";
  disputeReason?: string;
  inspectedByMerchant?: boolean;
  inspectedAt?: string;
  inspectedBy?: string;
  quantityInspected?: number;
  quantityApproved?: number;
  inspectionOutcome?: "MATCHED" | "PARTIAL" | "MISMATCH";
  itemCondition?: string;
  isSkuMatched?: boolean;
  isIssueMatched?: boolean;
  isComponentsComplete?: boolean;
  inspectionNote?: string;
  inspectionEvidence?: string[];
}

export interface TimelineActivity {
  id: string;
  timestamp: string;
  actor: "CUSTOMER" | "MERCHANT" | "PROVIDER" | "SYSTEM" | "SUPPORT";
  title: string;
  description: string;
}

export interface AfterSalesCase {
  id: string;
  caseNumber: string;
  caseType: AfterSalesCaseType;
  sourceOrderId: string;
  sourceOrderNumber: string;
  customerId: string;
  customerName: string;
  organizationId: string;
  organizationName: string;
  organizationType: "MERCHANT" | "PROVIDER";
  itemTitle: string;
  itemImageUrl?: string;
  itemCategory?: string;
  orderedQuantity: number;
  affectedQuantity: number; // For partial returns (e.g. 1 of 2)
  itemPrice: number;
  issueReason: string;
  issueDescription: string;
  evidenceMedia: string[];
  warrantyId?: string;
  warrantyName?: string;
  warrantyDurationDays?: number;
  warrantyExpiryDate?: string;
  customerRequestedSolution?: AfterSalesSolutionType;
  approvedSolution?: AfterSalesSolutionType;
  chosenSolution?: AfterSalesSolutionType;
  merchantAlternativeProposal?: {
    proposalId?: string;
    solution: AfterSalesSolutionType;
    rawSolutionCode?: string;
    note: string;
    proposedAt: string;
    state?: string;
    customerAccepted?: boolean;
  };
  submittedAt: string;
  slaDeadlineAt: string; // submittedAt + 72 jam
  respondedAt?: string;
  isNoResponse: boolean;
  mainStatus: AfterSalesMainStatus;
  specialCondition: AfterSalesSpecialCondition;
  rejectionReason?: string;
  timeline: TimelineActivity[];
  warrantyJob?: WarrantyJobProgress;
  replacementShipment?: ReplacementProgress;
  returnShipping?: ReturnShippingDetail;
  shippingExpenses?: ShippingExpenseDetail[];
  refundDetail?: RefundBreakdown;
  refundTrack?: RefundBreakdown;
  reportedToSupport?: boolean;
  reportDetails?: {
    reportId: string;
    reportedAt: string;
    reason: string;
  };
  backend?: any;
}

export interface WarrantyPreset {
  id: string;
  organizationId: string;
  organizationType: "MERCHANT" | "PROVIDER";
  slug?: string;
  name: string;
  durationDays: number; // positive integer, free user input
  coverage: string;
  exclusions: string;
  terms?: string;
  isActive: boolean;
  version?: number;
  usageCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerWarrantyEntitlement {
  id: string;
  warrantyNumber: string;
  orderId: string;
  merchantOrderId?: string;
  orderNumber: string;
  orderItemKey?: string;
  catalogRef?: string;
  itemType: "PRODUCT" | "SERVICE";
  itemTitle: string;
  itemImageUrl?: string;
  organizationId: string;
  organizationName: string;
  ownerOrgType?: "MERCHANT" | "PROVIDER";
  presetName: string;
  durationDays: number;
  orderedAt?: string;
  completedAt?: string;
  startDate: string;
  endDate: string;
  coverage: string;
  exclusions?: string;
  terms: string;
  quantity?: number;
  claimedQuantity?: number;
  remainingQuantity?: number;
  status?: "PENDING_START" | "ACTIVE" | "CLAIM_LOCKED" | "CONSUMED" | "EXPIRED" | "CANCELLED" | "CLAIMED" | "VOID";
  isActive: boolean;
  activeCaseId?: string;
  activeCaseStatus?: AfterSalesMainStatus;
  activeCaseNumber?: string;
  remainingDays?: number;
  hasActiveCase?: boolean;
  isClaimEligible?: boolean;
  catalogSnapshot?: any;
  cases?: any[];
}
