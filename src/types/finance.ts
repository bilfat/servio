/**
 * SERVIO FINANCE & REVENUE TYPES — PHASE 06 (MODEL C)
 * 
 * Strict Frontend-Only Type Definitions for:
 * 1. CEO Revenue Dashboard (/ceo/revenue)
 * 2. Finance Operations Monitoring (/finance/dashboard)
 * 3. 4-Stream Revenue Governance (Model C)
 * 4. 16 Financial Monitoring Categories (Addendum V1.1)
 * 
 * NOTE: Strictly for frontend simulation and UI rendering.
 * Does not execute real financial transactions or ledger entries.
 */

export type RevenueStreamType =
  | "CUSTOMER_PRODUCT_APP_FEE"     // Biaya Aplikasi Customer — Belanja Produk/Sparepart
  | "CUSTOMER_SERVICE_APP_FEE"     // Biaya Aplikasi Customer — Booking Jasa/Layanan
  | "MERCHANT_PRODUCT_COMMISSION"  // Komisi Penjualan Toko Mitra (Merchant)
  | "PROVIDER_SERVICE_COMMISSION"; // Komisi Jasa Bengkel / Service Provider

export type FinancialGroup =
  | "PLATFORM_REVENUE"             // Pendapatan Resmi SERVIO (4 Sumber + Adjustment)
  | "TAX_AND_PROCESSING_COST"      // Pajak & Biaya Transaksi (Bukan Pendapatan)
  | "MANAGED_FUNDS_AND_LIABILITY"; // Dana yang Dikelola & Kewajiban (Escrow, Settlement, S-Pay)

export type PeriodFilter = "DAILY" | "WEEKLY" | "MONTHLY";

export type OrderType = "PRODUCT" | "SERVICE";

export type PaymentStatus = "PAID" | "PENDING" | "FAILED" | "EXPIRED";

export type RevenueRecognitionStatus =
  | "RECOGNIZED"           // Pendapatan telah diakui (Order Completed/Delivered)
  | "PENDING_COMPLETION"   // Pembayaran PAID tetapi order masih berjalan (Escrow)
  | "REVERSED"             // Dibatalkan / refund sehingga fee dibatalkan
  | "NOT_RECOGNIZED";      // Pembayaran gagal/expired, tidak ada revenue

export type SettlementStatus =
  | "SETTLED"              // Dana telah masuk saldo siap tarik mitra
  | "PENDING_RELEASE"      // Menunggu order selesai / masa garansi
  | "WITHDRAWN"            // Telah dicairkan mitra ke rekening bank
  | "HELD";                // Ditahan karena dispute / audit

export type FeeCalculationType = "FIXED_AMOUNT" | "PERCENTAGE";

// Single Order Transaction with Full Fee Breakdown
export interface FinanceOrderTransaction {
  id: string;                      // e.g. "TRX-2026-9001"
  orderId: string;                 // e.g. "ORD-PRD-8801"
  paymentId: string;               // e.g. "PAY-GATEWAY-4412"
  orderType: OrderType;
  customerName: string;
  partnerName: string;             // Toko Sejuk Abadi / PT Servio Mandiri Teknik
  partnerOrgId: string;
  partnerType: "MERCHANT" | "SERVICE_PROVIDER";
  
  // Financial Waterfall
  basePrice: number;               // Harga murni produk / jasa
  customerAppFee: number;          // Biaya aplikasi customer (Model C Stream 1 or 2)
  partnerCommissionRate: number;   // e.g. 0.05 (5%) or 0.10 (10%)
  partnerCommissionAmount: number; // Komisi mitra yang dipotong SERVIO (Model C Stream 3 or 4)
  partnerSettlementAmount: number; // Hak bersih mitra = basePrice - partnerCommissionAmount
  grossAmount: number;             // Total ditagihkan ke customer = basePrice + customerAppFee
  
  // Tax & Processing Details
  taxAmount: number;               // PPN 11% yang tercatat (jika applicable)
  gatewayFee: number;              // Biaya payment gateway
  gatewayFeePayer: "SERVIO" | "CUSTOMER" | "PARTNER";
  
  // Statuses
  paymentStatus: PaymentStatus;
  paymentMethod: "BCA_VA" | "MANDIRI_VA" | "BRI_VA" | "QRIS" | "CREDIT_CARD" | "SPAY_BALANCE";
  revenueStatus: RevenueRecognitionStatus;
  settlementStatus: SettlementStatus;
  
  // Timestamps
  paidAt?: string;
  recognizedAt?: string;
  createdAt: string;
  notes?: string;
}

// Single Recognized Revenue Record
export interface RecognizedRevenueRecord {
  id: string;
  transactionId: string;
  orderId: string;
  orderType: OrderType;
  streamType: RevenueStreamType;
  streamName: string;
  amount: number;
  recognizedAt: string;
  isReversed: boolean;
  reversalReason?: string;
}

// Reversal / Adjustment Record
export interface RevenueAdjustmentRecord {
  id: string;
  originalRevenueId: string;
  orderId: string;
  adjustmentType: "REFUND_REVERSAL" | "DISPUTE_DEDUCTION" | "COMMISSION_CORRECTION";
  amount: number;
  reason: string;
  adjustedAt: string;
}

// Single Stream Breakdown for Charts & Tables
export interface RevenueStreamDetail {
  streamType: RevenueStreamType;
  name: string;
  shortName: string;
  orderType: OrderType;
  grossAmount: number;
  adjustmentAmount: number;
  netAmount: number;
  percentage: number;
  transactionCount: number;
  color: string;
  description: string;
}

// Period Summary for Dashboard
export interface PeriodRevenueSummary {
  period: PeriodFilter;
  periodLabel: string;
  startDate: string;
  endDate: string;
  
  // Aggregated Platform Revenue (Model C)
  totalGrossRevenue: number;
  totalAdjustment: number;
  totalNetRevenue: number;         // = totalGrossRevenue - totalAdjustment
  growthRateVsPreviousPeriod: number; // e.g. +14.2%
  
  // 4 Streams Breakdown
  streams: Record<RevenueStreamType, RevenueStreamDetail>;
  
  // Transaction Type Comparison (Product vs Service)
  comparison: {
    product: {
      customerAppFee: number;
      merchantCommission: number;
      totalRevenue: number;
      percentage: number;
      orderVolume: number;
    };
    service: {
      customerAppFee: number;
      providerCommission: number;
      totalRevenue: number;
      percentage: number;
      orderVolume: number;
    };
  };
  
  // Bar Chart Time Series Data
  timeSeries: Array<{
    timestamp: string;
    label: string;
    totalRevenue: number;
    productRevenue: number;
    serviceRevenue: number;
  }>;
}

// Managed Funds & Liabilities (Separate from Platform Revenue!)
export interface ManagedFundsSummary {
  gmvTotal: number;                         // Total Nilai Transaksi Order (GMV)
  confirmedPaymentsTotal: number;           // Pembayaran sukses terkonfirmasi
  pendingPaymentsTotal: number;             // Pembayaran pending webhook
  activeEscrowBalance: number;              // Dana penampung aktif sebelum order selesai
  merchantSettlementBalance: number;        // Hak settlement Merchant siap tarik
  providerSettlementBalance: number;        // Hak settlement Service Provider siap tarik
  spayCustomerRefundBalance: number;        // Saldo refund di dompet S-Pay customer
  unfundedRefundLiability: number;          // Kewajiban refund yang belum terdanai
  totalWithdrawnToBank: number;             // Dana yang telah dicairkan ke bank mitra
  pendingWithdrawalBatch: number;           // Antrean penarikan dana
}

// Tax & Processing Costs Summary
export interface TaxAndCostSummary {
  recordedPPN: number;                      // PPN 11% yang tercatat
  recordedPPh23: number;                    // PPh 23 jasa (jika ada)
  taxComplianceStatus: "COMPLIANT" | "AUDIT_PENDING" | "NEEDS_ATTENTION";
  gatewayFeesServioExpense: number;         // Biaya gateway ditanggung SERVIO
  gatewayFeesUserPaid: number;              // Biaya gateway dibebankan ke user
  payoutFeesServioExpense: number;          // Biaya pencairan bank ditanggung SERVIO
  totalServioProcessingCost: number;        // Total beban gateway + payout
  netPlatformContribution: number;          // Net Revenue - Total Servio Processing Cost
}

// Financial Health & Reconciliation Metrics
export interface FinancialHealthMetrics {
  outstandingSettlementAmount: number;
  outstandingRefundCount: number;
  outstandingRefundAmount: number;
  pendingPayoutBatchCount: number;
  pendingPayoutBatchAmount: number;
  reconciliationMatchCount: number;
  reconciliationDiscrepancyCount: number;
  reconciliationDiscrepancyAmount: number;
  reconciliationMatchRate: number;          // e.g. 99.4%
}

// Active Fee Policy Definition (Read-Only for Finance, Editable for CEO)
export interface ActiveFeePolicyItem {
  id: string;
  streamType: RevenueStreamType;
  title: string;
  orderType: OrderType;
  calculationType: FeeCalculationType;
  currentValue: number;                     // 5000 or 5 (%)
  displayValue: string;                     // "Rp 5.000" or "5.0%"
  status: "ACTIVE" | "PENDING_SCHEDULED";
  version: string;                          // "v2.1"
  effectiveFrom: string;
  appliedBy: string;
  notes: string;
}

// ============================================================================
// CANONICAL FINANCE V3 BACKEND CONTRACTS (MODUL 06)
// ============================================================================

export type FeePolicyCode = "CUSTOMER_PRODUCT_APP_FEE" | "MERCHANT_PRODUCT_COMMISSION";

export interface FeePolicyTargetModel {
  id: string;
  version_id: string;
  policy_code: FeePolicyCode;
  scope: "PRODUCT";
  payer_type: "CUSTOMER" | "MERCHANT";
  fee_type: "FIXED" | "PERCENTAGE";
  fixed_amount_idr?: number | null;
  percentage_rate?: number | null;
  charge_scope: "CHECKOUT" | "MERCHANT_ORDER";
  calculation_base: "CHECKOUT_ELIGIBLE_SUBTOTAL" | "MERCHANT_PRODUCT_SUBTOTAL";
  rounding_method?: string;
  min_fee_idr?: number | null;
  max_fee_idr?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type FeePolicyVersionStatus = "DRAFT" | "ACTIVE" | "SCHEDULED" | "HISTORICAL" | "SUPERSEDED" | "INACTIVE";

export interface FeePolicyVersionModel {
  id: string;
  group_id: string;
  version_no: number;
  status: FeePolicyVersionStatus;
  effective_from?: string | null;
  effective_until?: string | null;
  change_reason?: string | null;
  created_by_user_id?: string;
  published_by_user_id?: string | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  targets: FeePolicyTargetModel[];
}

export interface FeePolicyGroupModel {
  id: string;
  slug: string;
  display_name: string;
  description?: string | null;
  business_status: "ACTIVE" | "INACTIVE";
  created_by_user_id?: string;
  created_at?: string;
  updated_at?: string;
  versions: FeePolicyVersionModel[];
}

export interface BackendRevenueOverview {
  customer_product_app_fee_idr: number;
  merchant_product_commission_idr: number;
  total_collected_fee_idr: number;
  mock_payment_volume_idr: number;
  held_liability_idr: number;
  merchant_payable_idr: number;
  customer_refund_liability_idr: number;
  provider_service_fee: string;
  accounting_status: string;
  note: string;
}

export interface BackendPaymentIntent {
  id: string;
  finance_checkout_id: string;
  method: string;
  provider: string;
  provider_reference?: string | null;
  instruction_payload?: any;
  amount_idr: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "PARTIALLY_REFUNDED" | "REFUNDED";
  issued_at: string;
  expires_at?: string | null;
  paid_at?: string | null;
  is_active: boolean;
  checkout?: {
    id: string;
    checkout_group_id: string;
    customer_user_id: string;
    total_bill_idr: number;
  };
}

export interface BackendRefundTransaction {
  id: string;
  payment_allocation_id: string;
  payment_intent_id: string;
  customer_spay_account_id: string;
  refund_reason_scope?: string;
  order_cancellation_event_id?: string;
  requested_amount_idr: number;
  funded_amount_idr: number;
  credited_amount_idr: number;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";
  source_funding_reference?: string;
  funded_at?: string | null;
  credited_at?: string | null;
  failure_code?: string | null;
}

export interface BackendWithdrawalRequest {
  id: string;
  spay_account_id: string;
  bank_destination_id: string;
  requested_by_user_id: string;
  requested_amount_idr: number;
  transfer_fee_idr: number;
  net_to_bank_idr: number;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";
  bank_snapshot_masked?: {
    bank_name?: string;
    account_number_masked?: string;
    account_holder_name?: string;
  };
  initiated_at: string;
  completed_at?: string | null;
  failure_code?: string | null;
  bank_destination?: {
    id: string;
    bank_name: string;
    account_number_masked: string;
    account_holder_name: string;
  };
}

export interface BackendReconciliation {
  is_double_entry_balanced: boolean;
  total_debit_idr: number;
  total_credit_idr: number;
  discrepancy_idr: number;
  metrics: {
    total_paid_payments_idr: number;
    total_matured_held_released_idr: number;
    total_refunds_succeeded_idr: number;
    total_withdrawals_completed_idr: number;
  };
  audit_status: string;
}

export interface BackendFinanceAuditLog {
  id: string;
  actor_user_id: string;
  actor_service: string;
  action: string;
  subject_type: string;
  subject_id: string;
  result: string;
  before_state?: any;
  after_state?: any;
  reason_code?: string;
  created_at: string;
}
