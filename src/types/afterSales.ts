export type AfterSalesCaseType = "claim_product" | "claim_service" | "return_product";

export type AfterSalesMainStatus =
  | "SUBMITTED"           // Diajukan
  | "UNDER_REVIEW"        // Ditinjau
  | "IN_RESOLUTION"       // Dalam Penyelesaian
  | "COMPLETED"           // Selesai
  | "REJECTED";           // Ditolak

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
  | "FAILED";           // Terkendala (saldo tidak berubah)

export interface RefundBreakdown {
  productAmount: number;
  approvedShippingAmount: number;
  feeAdjustment: number;
  totalRefund: number;
  approvedAt: string;
  refundReference: string;
  status: RefundStepStatus;
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

export interface ReturnShippingDetail {
  requiresPhysicalReturn: boolean;
  shippingFeePayer: "MERCHANT" | "CUSTOMER";
  feePayerExplanation: string;
  returnAddress?: string;
  courierName?: string;
  trackingNumber?: string;
  shippingFeeReceiptUrl?: string;
  claimedShippingFee?: number;
  receivedByMerchant?: boolean;
  inspectedByMerchant?: boolean;
  inspectionNote?: string;
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
  merchantAlternativeProposal?: {
    solution: AfterSalesSolutionType;
    note: string;
    proposedAt: string;
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
  refundDetail?: RefundBreakdown;
  reportedToSupport?: boolean;
  reportDetails?: {
    reportId: string;
    reportedAt: string;
    reason: string;
  };
}

export interface WarrantyPreset {
  id: string;
  organizationId: string;
  organizationType: "MERCHANT" | "PROVIDER";
  name: string;
  durationDays: number; // positive integer, free user input
  coverage: string;
  exclusions: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

export interface CustomerWarrantyEntitlement {
  id: string;
  warrantyNumber: string;
  orderId: string;
  orderNumber: string;
  itemType: "PRODUCT" | "SERVICE";
  itemTitle: string;
  itemImageUrl?: string;
  organizationId: string;
  organizationName: string;
  presetName: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  coverage: string;
  terms: string;
  isActive: boolean;
  activeCaseId?: string;
}
