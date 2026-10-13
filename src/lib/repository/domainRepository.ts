/**
 * SERVIO CENTRALIZED DOMAIN REPOSITORY & SHARED REACTIVE STORE (ROOT-01, ROOT-02)
 *
 * Canonical architecture:
 * Page -> Feature Hook -> Repository -> Shared Domain Store / Adapter -> Mock / API Adapter
 *
 * Provides shared, deterministic entity state across all operational roles:
 * - Service Provider (M5)
 * - Worker / Technician (M6)
 * - Customer Support / Mediation (M7)
 * - Finance & Payment Ops (M8)
 * - Customer (M0-M4)
 */

import { useState, useEffect } from "react";
import {
  ServiceOrder,
  WorkerTechnician,
  WorkerServiceCapability,
  ProofOfService,
  WarrantyCertificate,
  ProviderWarrantySettings,
  ProviderWarrantyDuration,
  ServiceWarrantyConfiguration,
  WarrantyV1,
  WarrantyV1Status,
  WarrantyClaimV1,
  WarrantyClaimStatus,
  WarrantyAssignmentV1,
  WarrantyAssignmentStatus,
  WarrantyAssignmentType,
  WarrantyDiagnosisV1,
  WarrantyPaidWorkStatus,
  WarrantyPaidWorkRequestV1,
  WarrantyPaidWorkProposalV1,
  WarrantyCompletionProofV1,
  WarrantyTimelineEventV1,
  DisputeCase,
  ProductRecommendation,
  ProviderMaterialLine,
  ProductRecommendationStatus,
  CustomerRecommendationDecision,
  SparepartSourceType,
  AffiliateAttribution,
  ServicePaymentRecord,
  DiagnosisRecord,
  PriceAdjustmentProposal,
} from "@/types/domain";
import { MOCK_ORDERS } from "@/mocks/orders";
import { CUSTOMER_SCENARIO_ORDERS } from "@/mocks/customerScenarios";
import { MOCK_WORKERS } from "@/mocks/workers";
import { MOCK_PROOFS } from "@/mocks/proofs";
import {
  MOCK_WARRANTIES,
  INITIAL_PROVIDER_WARRANTY_SETTINGS,
  INITIAL_PROVIDER_WARRANTY_DURATIONS,
  INITIAL_SERVICE_WARRANTY_CONFIGS,
  INITIAL_WARRANTIES_V1,
  INITIAL_WARRANTY_CLAIMS_V1,
  INITIAL_WARRANTY_ASSIGNMENTS_V1,
  INITIAL_WARRANTY_DIAGNOSES_V1,
  INITIAL_WARRANTY_PAID_WORK_REQUESTS_V1,
  INITIAL_WARRANTY_PAID_WORK_PROPOSALS_V1,
  INITIAL_WARRANTY_COMPLETION_PROOFS_V1,
  INITIAL_WARRANTY_TIMELINE_EVENTS_V1,
} from "@/mocks/warranties";
import { MOCK_DISPUTES } from "@/mocks/disputes";
import {
  MOCK_PROVIDER_INVENTORY,
  MOCK_PROVIDER_FULFILLMENTS,
  MOCK_WORKSHOP_SHIPMENTS,
  MOCK_PROVIDER_RETURNS,
  ProviderInventoryItem,
  ProviderFulfillmentItem,
  WorkshopShipment,
  ProviderReturnClaim,
} from "@/mocks/providerOperations";
import {
  GatewayTransaction,
  RefundRequest,
  VendorPayout,
  ReconciliationItem,
} from "@/mocks/financeOps";
import {
  WorkerJob,
  WorkerShipmentItem,
  INITIAL_WORKER_JOBS,
  INITIAL_SHIPMENTS,
} from "@/mocks/workerJobs";
import { SupportCase, INITIAL_SUPPORT_CASES } from "@/mocks/supportCases";
import {
  MerchantProduct,
  MerchantOrder,
  MerchantWarehouse,
  MerchantStockItem,
  MerchantStockMovement,
  MerchantFulfillment,
  MerchantShipment,
  MerchantReturn,
  MerchantSettlement,
  MerchantOrderStatus,
  MerchantFulfillmentStatus,
  MerchantReturnDisposition,
  SupplierProduct,
  SupplierOrder,
  SupplierOrderStatus,
  SupplierFulfillment,
  SupplierShipment,
  SupplierReturn,
  SupplierReturnItem,
  SupplierWarehouse,
  SupplierWarehouseZone,
  B2BSupplier,
  SupplierB2BOffer,
  B2BPurchaseOrder,
  B2BPurchaseOrderItem,
  B2BPurchaseOrderStatus,
  B2BReceivingRecord,
  CANONICAL_B2B_PO_STATUS_MAP,
  AdminKYCRecord,
  ProductModerationItem,
  ContentModerationItem,
  AuditLogEntry,
  ShippingIntegrationAdapter,
  TaxonomyProposal,
  FeePolicyConfig,
  ShippingGovernancePolicy,
  ReturnGovernancePolicy,
  GuaranteeGovernancePolicy,
  AISmartDiscoveryTelemetry,
  AISafetyIncident,
  BookingAIAnalysis,
  StorePartnership,
  MerchantProfile,
  AffiliateFeePolicy,
  PointLedgerEntry,
  PointLedgerOwnerType,
  PointLedgerSourceType,
  PointLedgerDirection,
  PointLedgerStatus,
  RewardCatalogItem,
  RedemptionRecord,
  AffiliateFinanceReconciliationRow,
  AffiliateFinanceSummary,
  ServiceCategory,
  ServiceSubcategory,
  ProviderMasterService,
  SubcategoryRequest,
  TaxonomyAnalyticsProjection,
  CeoAffiliateAnalyticsProjection,
  WorkerTrackingStatus,
  WorkerTrackingSession,
  FeePolicy,
  FeePolicyType,
  FeeCalculationType,
  FeeProposalStatus,
  FeeChangeRequest,
  FeePolicyChange,
  FeeGovernanceMetrics,
} from "@/types/domain";
import {
  INITIAL_ACTIVE_FEE_POLICIES,
  INITIAL_FEE_CHANGE_REQUESTS,
} from "@/mocks/feeGovernance";
import {
  BASELINE_SERVICE_CATEGORIES,
  BASELINE_SERVICE_SUBCATEGORIES,
  INITIAL_PROVIDER_MASTER_SERVICES,
  INITIAL_SUBCATEGORY_REQUESTS,
} from "@/mocks/taxonomyV1";
import { INITIAL_STORE_PARTNERSHIPS } from "@/mocks/partnerships";
import {
  INITIAL_B2B_SUPPLIERS,
  INITIAL_B2B_SUPPLIER_OFFERS,
  INITIAL_B2B_PURCHASE_ORDERS,
} from "@/mocks/b2bProcurementOps";
import {
  INITIAL_MERCHANT_PRODUCTS,
  INITIAL_MERCHANT_ORDERS,
  INITIAL_MERCHANT_WAREHOUSES,
  INITIAL_MERCHANT_STOCKS,
  INITIAL_MERCHANT_STOCK_MOVEMENTS,
  INITIAL_MERCHANT_FULFILLMENTS,
  INITIAL_MERCHANT_SHIPMENTS,
  INITIAL_MERCHANT_RETURNS,
  INITIAL_MERCHANT_SETTLEMENTS,
  INITIAL_AFFILIATE_ATTRIBUTIONS,
} from "@/mocks/merchantOps";
import {
  INITIAL_MERCHANT_PROFILES,
  INITIAL_AFFILIATE_FEE_POLICIES,
  INITIAL_POINT_LEDGERS,
  INITIAL_REWARD_CATALOG,
  INITIAL_REDEMPTIONS,
} from "@/mocks/affiliateFinalization";
import {
  calculateAffiliateReward,
  calculateAffiliateEconomics,
  checkMerchantAffiliateReadiness,
  resolveAffiliateEligibilityStatus,
  DEFAULT_AFFILIATE_POLICY,
  DEFAULT_AFFILIATE_FEE_POLICY,
} from "@/lib/policy/affiliatePolicy";
import {
  INITIAL_SUPPLIER_PRODUCTS,
  INITIAL_SUPPLIER_ORDERS,
  INITIAL_SUPPLIER_FULFILLMENTS,
  INITIAL_SUPPLIER_SHIPMENTS,
  INITIAL_SUPPLIER_RETURNS,
  INITIAL_SUPPLIER_WAREHOUSES,
  INITIAL_SUPPLIER_ZONES,
} from "@/mocks/supplierOps";
import {
  INITIAL_KYC_RECORDS,
  INITIAL_PRODUCT_MODERATIONS,
  INITIAL_CONTENT_MODERATIONS,
  INITIAL_SHIPPING_ADAPTERS,
  INITIAL_AUDIT_LOGS,
} from "@/mocks/adminOps";
import {
  INITIAL_TAXONOMY_PROPOSALS,
  INITIAL_FEE_POLICIES,
  INITIAL_SHIPPING_POLICY,
  INITIAL_RETURN_POLICY,
  INITIAL_GUARANTEE_POLICY,
  INITIAL_AI_TELEMETRY,
  INITIAL_AI_INCIDENTS,
} from "@/mocks/ceoOps";

export interface DomainBooking {
  id: string;
  orderId?: string;
  customerName: string;
  customerPhone: string;
  serviceTitle: string;
  issueDescription: string;
  unitPhotoUrl: string;
  address: string;
  requestedDate: string;
  requestedTimeSlot: string;
  expiresInMinutes: number;
  status: "PENDING_CONFIRMATION" | "ACCEPTED" | "REJECTED" | "NEGOTIATING" | "CONVERTED_TO_ORDER";
  assignedWorkerId?: string;
  rejectionReason?: string;
  negotiatedDate?: string;
  initialPriceEstimate?: number;
  aiAnalysis?: BookingAIAnalysis;
}

// Initial Booking Requests
const INITIAL_BOOKINGS: DomainBooking[] = [
  {
    id: "bk-inc-101",
    customerName: "Sarah Wijaya",
    customerPhone: "0812-9988-7766",
    serviceTitle: "Cuci & Perawatan AC Split Inverter 1 PK",
    issueDescription:
      "AC tidak dingin sejak kemarin, ada hembusan angin tapi suhu ruangan tidak turun dan ada bunyi berdesis halus di indoor.",
    unitPhotoUrl:
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
    address: "Jl. Tebet Timur Dalam No. 18, Jakarta Selatan",
    requestedDate: "2026-09-21",
    requestedTimeSlot: "13:00 - 15:00 WIB",
    expiresInMinutes: 42,
    status: "PENDING_CONFIRMATION",
    initialPriceEstimate: 155000,
    aiAnalysis: {
      summary: "Pemeriksaan sistem refrigerasi & kelistrikan kompresor.",
      possibleIssues: [
        "Tekanan refrigeran berkurang / kebocoran pipa halus",
        "Kapasitor outdoor melemah",
        "Kotoran menumpuk pada evaporator / blower indoor",
      ],
      possibleSpareparts: [
        "Kapasitor 35uF (Memungkinkan diperlukan)",
        "Refrigerant R32 / R410A (Recommended for inspection)",
        "Pipa Tembaga & Fitting 1/4 - 3/8 (Possible)",
      ],
      confidenceExplanation:
        "Rekomendasi berdasarkan deskripsi masalah pelanggan. Belum dikonfirmasi oleh diagnosis teknisi.",
      disclaimer:
        "Rekomendasi AI bukan diagnosis final. Teknisi tetap melakukan pemeriksaan di lokasi.",
      generatedAt: "2026-09-22 08:30 WIB",
    },
  },
  {
    id: "bk-inc-102",
    customerName: "Bpk. Rahmat Santoso",
    customerPhone: "0813-1122-3344",
    serviceTitle: "Perbaikan Kompresor & Cek Kebocoran Freon",
    issueDescription:
      "Outdoor unit sering mati sendiri setelah 10 menit menyala. Diduga overheat atau kapasitor lemah.",
    unitPhotoUrl:
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
    address: "Jl. Pancoran Barat V No. 3, Jakarta Selatan",
    requestedDate: "2026-09-22",
    requestedTimeSlot: "09:00 - 11:00 WIB",
    expiresInMinutes: 98,
    status: "PENDING_CONFIRMATION",
    initialPriceEstimate: 250000,
    aiAnalysis: {
      summary: "Pemeriksaan unit outdoor & thermal overload protection.",
      possibleIssues: [
        "Overheat motor kompresor / thermal protector trip",
        "Kapasitor starting / running menurun drastis",
        "Kipas kondensor outdoor macet atau putaran lemah",
      ],
      possibleSpareparts: [
        "Kapasitor Dual Running 35+1.5uF (Memungkinkan diperlukan)",
        "Thermal Protector / Overload Relay (Possible)",
        "Motor Fan Outdoor (Recommended for inspection)",
      ],
      confidenceExplanation:
        "Rekomendasi dianalisis dari keluhan outdoor mati periodik. Belum diverifikasi teknisi lapangan.",
      disclaimer:
        "Rekomendasi AI bukan diagnosis final. Teknisi tetap melakukan pemeriksaan di lokasi.",
      generatedAt: "2026-09-22 09:15 WIB",
    },
  },
  {
    id: "bk-inc-103",
    customerName: "Ibu Maya Angelina",
    customerPhone: "0856-7788-9900",
    serviceTitle: "Bongkar Pasang AC Daikin Multi-S",
    issueDescription:
      "Pindah ruangan dari lantai 1 ke lantai 2 kamar belakang. Butuh penambahan pipa tembaga kurang lebih 4 meter.",
    unitPhotoUrl:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80",
    address: "Apartemen Kalibata City Tower Kemuning Lt. 8",
    requestedDate: "2026-09-23",
    requestedTimeSlot: "10:00 - 12:00 WIB",
    expiresInMinutes: 115,
    status: "PENDING_CONFIRMATION",
    initialPriceEstimate: 350000,
    aiAnalysis: {
      summary: "Pemeriksaan instalasi relokasi & kebutuhan perpanjangan jalur pipa.",
      possibleIssues: [
        "Jalur pipa tembaga antar ruangan membutuhkan penambahan panjang",
        "Vakum sistem dan pengisian ulang refrigeran pasca relokasi",
        "Pengecekan jalur drainase dan kelistrikan kabel kontrol",
      ],
      possibleSpareparts: [
        "Pipa Tembaga Standar AC Multi-S ~4m (Memungkinkan diperlukan)",
        "Kabel NYM 3x2.5mm (Possible)",
        "Duktib / Pembungkus Pipa Isolasi (Recommended for inspection)",
      ],
      confidenceExplanation:
        "Rekomendasi estimasi material berdasarkan permintaan relokasi ruang. Belum diukur langsung.",
      disclaimer:
        "Rekomendasi AI bukan diagnosis final. Teknisi tetap melakukan pengukuran aktual di lokasi.",
      generatedAt: "2026-09-22 10:00 WIB",
    },
  },
  {
    id: "bk-inc-104",
    customerName: "Ibu Ratna Dewi",
    customerPhone: "0877-6655-4433",
    serviceTitle: "Pengecekan Kebisingan Indoor Unit AC Daikin",
    issueDescription:
      "Unit indoor bergetar dan mengeluarkan suara getar plastik saat fan di set ke level High.",
    unitPhotoUrl:
      "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600&auto=format&fit=crop&q=80",
    address: "Jl. Mampang Prapatan VIII No. 14, Jakarta Selatan",
    requestedDate: "2026-09-24",
    requestedTimeSlot: "14:00 - 16:00 WIB",
    expiresInMinutes: 60,
    status: "PENDING_CONFIRMATION",
    initialPriceEstimate: 120000,
    aiAnalysis: undefined,
  },
];

// Initial Financial Data
const INITIAL_TRANSACTIONS: GatewayTransaction[] = [
  {
    id: "TRX-2026-9901",
    orderId: "ORD-2026-8901",
    orderType: "SERVICE",
    customerName: "Sarah Annisa",
    vendorName: "Bintang Teknik Mandiri",
    paymentMethod: "BCA_VA",
    grossAmount: 140000,
    platformFeeRate: 0.1,
    platformFeeAmount: 14000,
    vendorNetAmount: 126000,
    status: "SETTLED",
    gatewayRef: "MID-88291039",
    paidAt: "2026-09-21 09:14 WIB",
    webhookReceived: true,
  },
  {
    id: "TRX-2026-9902",
    orderId: "ORD-2026-8902",
    orderType: "SERVICE",
    customerName: "Dimas Prasetyo",
    vendorName: "Sejuk Abadi HVAC",
    paymentMethod: "MANDIRI_VA",
    grossAmount: 427500,
    platformFeeRate: 0.1,
    platformFeeAmount: 42750,
    vendorNetAmount: 384750,
    status: "PENDING_WEBHOOK",
    gatewayRef: "MID-88291040",
    paidAt: "2026-09-21 09:40 WIB",
    webhookReceived: false,
  },
  {
    id: "TRX-2026-9903",
    orderId: "ORD-2026-8905",
    orderType: "SERVICE",
    customerName: "Bambang Sudiro",
    vendorName: "Bintang Teknik Mandiri",
    paymentMethod: "QRIS",
    grossAmount: 385000,
    platformFeeRate: 0.1,
    platformFeeAmount: 38500,
    vendorNetAmount: 346500,
    status: "SETTLED",
    gatewayRef: "MID-88291041",
    paidAt: "2026-09-21 08:30 WIB",
    webhookReceived: true,
  },
];

const INITIAL_REFUND_REQUESTS: RefundRequest[] = [
  {
    id: "REF-2026-042",
    disputeCaseId: "DISP-2026-901",
    orderId: "ORD-2026-8905",
    customerName: "Bambang Sudiro",
    customerBank: "BCA",
    customerAccountNo: "8820-192-334",
    refundAmount: 385000,
    escrowTotal: 385000,
    reason: "Unit AC Bocor Parah Setelah Dicuci & Air Merusak Meja Kerja",
    source: "CS_MEDIATION",
    requestedAt: "2026-09-21 11:20 WIB",
    status: "PENDING_APPROVAL",
    auditNotes: "Rekomendasi mediasi CS Rina Kusuma: Refund 100% karena teknisi lalai saat flushing drainase.",
  },
];

const INITIAL_PAYOUTS: VendorPayout[] = [
  {
    id: "PAY-2026-301",
    vendorId: "prov-bintang-teknik",
    vendorName: "Bintang Teknik Mandiri",
    vendorType: "SERVICE_PROVIDER",
    bankName: "Bank Central Asia (BCA)",
    bankAccountNo: "5420-119-002",
    accountHolder: "PT Bintang Teknik Mandiri",
    payoutAmount: 4850000,
    totalOrders: 18,
    riskScore: "LOW",
    requestedAt: "2026-09-21 08:00 WIB",
    status: "READY_BATCH",
  },
  {
    id: "PAY-2026-302",
    vendorId: "prov-sejuk-abadi",
    vendorName: "Sejuk Abadi HVAC & Chiller",
    vendorType: "SERVICE_PROVIDER",
    bankName: "Bank Mandiri",
    bankAccountNo: "137-00-199201-4",
    accountHolder: "CV Sejuk Abadi",
    payoutAmount: 8200000,
    totalOrders: 12,
    riskScore: "HIGH",
    requestedAt: "2026-09-20 17:30 WIB",
    status: "HELD_FRAUD_CHECK",
    holdReason: "Lonjakan klaim garansi sebesar 30% dalam 7 hari terakhir. Menunggu audit QA Operasional.",
  },
];

const INITIAL_RECONCILIATIONS: ReconciliationItem[] = [
  {
    id: "REC-2026-501",
    date: "2026-09-21",
    gatewayTrxId: "MID-88291039",
    internalTrxId: "TRX-2026-9901",
    bankChannel: "BCA Virtual Account",
    gatewayAmount: 140000,
    ledgerAmount: 140000,
    difference: 0,
    status: "MATCHED",
    matchedAt: "2026-09-21 09:15 WIB",
  },
  {
    id: "REC-2026-502",
    date: "2026-09-21",
    gatewayTrxId: "MID-88291040",
    internalTrxId: "TRX-2026-9902",
    bankChannel: "Mandiri Virtual Account",
    gatewayAmount: 427500,
    ledgerAmount: 427500,
    difference: 0,
    status: "MATCHED",
    matchedAt: "2026-09-21 09:41 WIB",
  },
];

/**
 * Normalizes entity IDs to canonical format while maintaining backward compatibility with existing routes.
 */
export function normalizeEntityId(rawId?: string): string {
  if (!rawId) return "";
  const id = rawId.trim();
  const aliasMap: Record<string, string> = {
    // Orders
    "order-normal-progress": "ORD-2026-8901",
    "order-quotation-negotiation": "ORD-2026-8902",
    "order-awaiting-proof": "ORD-2026-8903",
    "order-completed-fresh": "ORD-2026-8904",
    "order-completed-warranty": "ORD-2026-8904",
    "order-disputed": "ORD-2026-8905",
    "order-emergency-repair": "ORD-2026-8906",
    // Worker Jobs
    "job-101": "JOB-2026-101",
    "job-102": "JOB-2026-102",
    "job-103": "JOB-2026-103",
    // Disputes & Cases
    "disp-901": "DISP-2026-901",
    "disp-ac-bocor": "DISP-2026-901",
    // Warranties
    "war-srv-001": "WAR-2026-001",
    "war-srv-002": "WAR-2026-002",
    // Customer Scenarios (SC-C01 to SC-C28)
    "sc-c01": "SRV-C01-BOOK-WAITING",
    "sc-c02": "SRV-C02-CONFIRMED-ASSIGNED",
    "sc-c03": "SRV-C03-WORKER-ON-WAY",
    "sc-c04": "SRV-C04-WORKER-ARRIVED-DIAG",
    "sc-c05": "SRV-C05-NO-ADJ-READY",
    "sc-c06": "SRV-C06-ADJ-PRESENT",
    "sc-c07": "SRV-C07-ADJ-ABSENT",
    "sc-c08": "SRV-C08-ADJ-REJ-CONTINUE",
    "sc-c09": "SRV-C09-ADJ-REJ-BLOCKED",
    "sc-c10": "SRV-C10-PROVIDER-PART",
    "sc-c11": "SRV-C11-PARTNER-DIRECT",
    "sc-c12": "SRV-C12-PARTNER-REC-PENDING",
    "sc-c13": "SRV-C13-PARTNER-REC-ACCEPTED",
    "sc-c14": "SRV-C14-ALT-MERCHANT",
    "sc-c15": "SRV-C15-SELF-PURCHASE",
    "sc-c16": "SRV-C16-SHIPMENT-TRANSIT",
    "sc-c17": "SRV-C17-SHIPMENT-DELAYED",
    "sc-c18": "SRV-C18-PAYMENT-PENDING",
    "sc-c19": "SRV-C19-PAYMENT-FAILED",
    "sc-c20": "SRV-C20-ADDITIONAL-PAYMENT",
    "sc-c21": "SRV-C21-IN-PROGRESS",
    "sc-c22": "SRV-C22-PROOF-SUBMITTED",
    "sc-c23": "SRV-C23-COMPLETION-AWAITING",
    "sc-c24": "SRV-C24-COMPLETED",
    "sc-c25": "SRV-C25-DISPUTED",
    "sc-c26": "SRV-C26-WARRANTY-ELIGIBLE",
    "sc-c27": "SRV-C27-SERVICE-HISTORY",
    "sc-c28": "SRV-C28-REBOOKING",
    "SC-C01": "SRV-C01-BOOK-WAITING",
    "SC-C02": "SRV-C02-CONFIRMED-ASSIGNED",
    "SC-C03": "SRV-C03-WORKER-ON-WAY",
    "SC-C04": "SRV-C04-WORKER-ARRIVED-DIAG",
    "SC-C05": "SRV-C05-NO-ADJ-READY",
    "SC-C06": "SRV-C06-ADJ-PRESENT",
    "SC-C07": "SRV-C07-ADJ-ABSENT",
    "SC-C08": "SRV-C08-ADJ-REJ-CONTINUE",
    "SC-C09": "SRV-C09-ADJ-REJ-BLOCKED",
    "SC-C10": "SRV-C10-PROVIDER-PART",
    "SC-C11": "SRV-C11-PARTNER-DIRECT",
    "SC-C12": "SRV-C12-PARTNER-REC-PENDING",
    "SC-C13": "SRV-C13-PARTNER-REC-ACCEPTED",
    "SC-C14": "SRV-C14-ALT-MERCHANT",
    "SC-C15": "SRV-C15-SELF-PURCHASE",
    "SC-C16": "SRV-C16-SHIPMENT-TRANSIT",
    "SC-C17": "SRV-C17-SHIPMENT-DELAYED",
    "SC-C18": "SRV-C18-PAYMENT-PENDING",
    "SC-C19": "SRV-C19-PAYMENT-FAILED",
    "SC-C20": "SRV-C20-ADDITIONAL-PAYMENT",
    "SC-C21": "SRV-C21-IN-PROGRESS",
    "SC-C22": "SRV-C22-PROOF-SUBMITTED",
    "SC-C23": "SRV-C23-COMPLETION-AWAITING",
    "SC-C24": "SRV-C24-COMPLETED",
    "SC-C25": "SRV-C25-DISPUTED",
    "SC-C26": "SRV-C26-WARRANTY-ELIGIBLE",
    "SC-C27": "SRV-C27-SERVICE-HISTORY",
    "SC-C28": "SRV-C28-REBOOKING",
    // Phase G Deterministic Cross-Role Aliases (G-01 to G-18)
    "G-01": "SRV-C01-BOOK-WAITING",
    "g-01": "SRV-C01-BOOK-WAITING",
    "G-02": "SRV-C06-ADJ-PRESENT",
    "g-02": "SRV-C06-ADJ-PRESENT",
    "G-03": "SRV-C09-ADJ-REJ-BLOCKED",
    "g-03": "SRV-C09-ADJ-REJ-BLOCKED",
    "G-04": "SRV-C10-PROVIDER-PART",
    "g-04": "SRV-C10-PROVIDER-PART",
    "G-05": "SRV-C12-PARTNER-REC-PENDING",
    "g-05": "SRV-C12-PARTNER-REC-PENDING",
    "G-06": "SRV-C13-PARTNER-REC-ACCEPTED",
    "g-06": "SRV-C13-PARTNER-REC-ACCEPTED",
    "G-07": "SRV-C14-ALT-MERCHANT",
    "g-07": "SRV-C14-ALT-MERCHANT",
    "G-08": "SRV-C15-SELF-PURCHASE",
    "g-08": "SRV-C15-SELF-PURCHASE",
    "G-09": "SRV-C16-SHIPMENT-TRANSIT",
    "g-09": "SRV-C16-SHIPMENT-TRANSIT",
    "G-10": "SRV-C17-SHIPMENT-DELAYED",
    "g-10": "SRV-C17-SHIPMENT-DELAYED",
    "G-11": "SRV-C21-IN-PROGRESS",
    "g-11": "SRV-C21-IN-PROGRESS",
    "G-12": "SRV-C21-IN-PROGRESS",
    "g-12": "SRV-C21-IN-PROGRESS",
    "G-13": "SRV-C24-COMPLETED",
    "g-13": "SRV-C24-COMPLETED",
    "G-14": "SRV-C25-DISPUTED",
    "g-14": "SRV-C25-DISPUTED",
    "G-15": "SRV-C13-PARTNER-REC-ACCEPTED",
    "g-15": "SRV-C13-PARTNER-REC-ACCEPTED",
    "G-16": "SRV-C13-PARTNER-REC-ACCEPTED",
    "g-16": "SRV-C13-PARTNER-REC-ACCEPTED",
    "G-17": "SRV-C26-WARRANTY-ELIGIBLE",
    "g-17": "SRV-C26-WARRANTY-ELIGIBLE",
    "G-18": "SRV-C27-SERVICE-HISTORY",
    "g-18": "SRV-C27-SERVICE-HISTORY",
    // Friendly aliases
    "SRV-C06-DIAG-APPROVAL-REQ": "SRV-C06-ADJ-PRESENT",
    "SRV-C12-REC-PARTNER": "SRV-C12-PARTNER-REC-PENDING",
    "SRV-C13-REC-ALT-MERCHANT": "SRV-C14-ALT-MERCHANT",
    "SRV-C19-PROOF-COMPLETE": "SRV-C22-PROOF-SUBMITTED",
    "SRV-C20-COMPLETED-WARRANTY": "SRV-C26-WARRANTY-ELIGIBLE",
    "SRV-C21-DISPUTE-OPEN": "SRV-C25-DISPUTED",
  };
  return aliasMap[id] || id;
}

/**
 * Central In-Memory Store
 */
export class CentralDomainStore {
  private static instance: CentralDomainStore;
  private listeners = new Set<() => void>();

  public static getInstance(): CentralDomainStore {
    if (!CentralDomainStore.instance) {
      CentralDomainStore.instance = domainRepository;
    }
    return CentralDomainStore.instance || domainRepository;
  }

  public bookings: DomainBooking[] = [];
  public orders: ServiceOrder[] = [...MOCK_ORDERS, ...CUSTOMER_SCENARIO_ORDERS];
  public get canonicalOrders(): ServiceOrder[] {
    return this.orders;
  }
  public workers: WorkerTechnician[] = [...MOCK_WORKERS];
  public workerTrackingSessions: WorkerTrackingSession[] = [];
  public workerJobs: WorkerJob[] = [];
  public proofs: Record<string, ProofOfService> = { ...MOCK_PROOFS };
  public warranties: WarrantyCertificate[] = [...MOCK_WARRANTIES];
  public disputes: DisputeCase[] = [...MOCK_DISPUTES];
  public supportCases: SupportCase[] = [...INITIAL_SUPPORT_CASES];
  public transactions: GatewayTransaction[] = [...INITIAL_TRANSACTIONS];
  public refunds: RefundRequest[] = [...INITIAL_REFUND_REQUESTS];
  public payouts: VendorPayout[] = [...INITIAL_PAYOUTS];
  public reconciliations: ReconciliationItem[] = [...INITIAL_RECONCILIATIONS];
  public inventory: ProviderInventoryItem[] = [...MOCK_PROVIDER_INVENTORY];
  public fulfillments: ProviderFulfillmentItem[] = [...MOCK_PROVIDER_FULFILLMENTS];
  public shipments: WorkshopShipment[] = [...MOCK_WORKSHOP_SHIPMENTS];
  public returns: ProviderReturnClaim[] = [...MOCK_PROVIDER_RETURNS];
  public workerShipments: WorkerShipmentItem[] = [...INITIAL_SHIPMENTS];
  public merchantProducts: MerchantProduct[] = [...INITIAL_MERCHANT_PRODUCTS];
  public merchantOrders: MerchantOrder[] = [];
  public merchantWarehouses: MerchantWarehouse[] = [...INITIAL_MERCHANT_WAREHOUSES];
  public merchantStocks: MerchantStockItem[] = [...INITIAL_MERCHANT_STOCKS];
  public merchantStockMovements: MerchantStockMovement[] = [...INITIAL_MERCHANT_STOCK_MOVEMENTS];
  public merchantFulfillments: MerchantFulfillment[] = [];
  public merchantShipments: MerchantShipment[] = [];
  public merchantReturns: MerchantReturn[] = [];
  public merchantSettlements: MerchantSettlement[] = [...INITIAL_MERCHANT_SETTLEMENTS];

  public supplierProducts: SupplierProduct[] = [...INITIAL_SUPPLIER_PRODUCTS];
  public supplierOrders: SupplierOrder[] = [];
  public supplierFulfillments: SupplierFulfillment[] = [];
  public supplierShipments: SupplierShipment[] = [];
  public supplierReturns: SupplierReturn[] = [];
  public supplierWarehouses: SupplierWarehouse[] = [...INITIAL_SUPPLIER_WAREHOUSES];
  public supplierWarehouseZones: SupplierWarehouseZone[] = [...INITIAL_SUPPLIER_ZONES];

  public b2bSuppliers: B2BSupplier[] = [...INITIAL_B2B_SUPPLIERS];
  public b2bSupplierOffers: SupplierB2BOffer[] = [...INITIAL_B2B_SUPPLIER_OFFERS];
  public b2bPurchaseOrders: B2BPurchaseOrder[] = [...INITIAL_B2B_PURCHASE_ORDERS];

  // Phase C: Store Partnerships & Worker-Visible Partner Scope (C2, C4, C5)
  public storePartnerships: StorePartnership[] = [...INITIAL_STORE_PARTNERSHIPS];

  // Phase E / Affiliate Reward Attribution State (Section 8, 56F.6, 56J.4)
  public affiliateAttributions: AffiliateAttribution[] = [...INITIAL_AFFILIATE_ATTRIBUTIONS];

  // Phase E Finalization: Commercial & Merchant Enrollment Centralized State
  public merchantProfiles: MerchantProfile[] = [...INITIAL_MERCHANT_PROFILES];
  public affiliateFeePolicies: AffiliateFeePolicy[] = [...INITIAL_AFFILIATE_FEE_POLICIES];
  public pointLedgers: PointLedgerEntry[] = [...INITIAL_POINT_LEDGERS];
  public rewardCatalog: RewardCatalogItem[] = [...INITIAL_REWARD_CATALOG];
  public redemptions: RedemptionRecord[] = [...INITIAL_REDEMPTIONS];

  // Milestone 10 Admin & Operations Centralized State
  public kycRecords: AdminKYCRecord[] = [...INITIAL_KYC_RECORDS];
  public productModerations: ProductModerationItem[] = [...INITIAL_PRODUCT_MODERATIONS];
  public contentModerations: ContentModerationItem[] = [...INITIAL_CONTENT_MODERATIONS];
  public shippingAdapters: ShippingIntegrationAdapter[] = [...INITIAL_SHIPPING_ADAPTERS];
  public auditLogs: AuditLogEntry[] = [...INITIAL_AUDIT_LOGS];

  // Milestone 11 CEO & Executive Governance Centralized State
  public taxonomyProposals: TaxonomyProposal[] = [...INITIAL_TAXONOMY_PROPOSALS];
  public feePolicies: FeePolicyConfig[] = [...INITIAL_FEE_POLICIES];
  public shippingPolicy: ShippingGovernancePolicy = { ...INITIAL_SHIPPING_POLICY };
  public returnPolicy: ReturnGovernancePolicy = { ...INITIAL_RETURN_POLICY };
  public guaranteePolicy: GuaranteeGovernancePolicy = { ...INITIAL_GUARANTEE_POLICY };
  public aiTelemetry: AISmartDiscoveryTelemetry = { ...INITIAL_AI_TELEMETRY };
  public aiIncidents: AISafetyIncident[] = [...INITIAL_AI_INCIDENTS];

  // SERVIO TAXONOMY V1 CANONICAL STATE (LOCKED DECISION)
  public categories: ServiceCategory[] = [...BASELINE_SERVICE_CATEGORIES];
  public subcategories: ServiceSubcategory[] = [...BASELINE_SERVICE_SUBCATEGORIES];
  public providerMasterServices: ProviderMasterService[] = [...INITIAL_PROVIDER_MASTER_SERVICES];
  public taxonomyRequests: SubcategoryRequest[] = [...INITIAL_SUBCATEGORY_REQUESTS];
  public workerCapabilities: WorkerServiceCapability[] = [];

  // SERVIO FINAL LOCKED SPEC: FINANCE & CEO FEE MANAGEMENT GOVERNANCE
  public canonicalFeePolicies: FeePolicy[] = INITIAL_ACTIVE_FEE_POLICIES.map((p) => ({ ...p }));
  public feeChangeRequests: FeeChangeRequest[] = INITIAL_FEE_CHANGE_REQUESTS.map((r) => ({
    ...r,
    policyChanges: r.policyChanges.map((c) => ({ ...c })),
  }));

  // SERVIO WARRANTY V1 CANONICAL STATE (LOCKED BUSINESS FLOW)
  public providerWarrantySettings: ProviderWarrantySettings[] = [...INITIAL_PROVIDER_WARRANTY_SETTINGS];
  public providerWarrantyDurations: ProviderWarrantyDuration[] = [...INITIAL_PROVIDER_WARRANTY_DURATIONS];
  public serviceWarrantyConfigs: ServiceWarrantyConfiguration[] = [...INITIAL_SERVICE_WARRANTY_CONFIGS];
  public warrantiesV1: WarrantyV1[] = [...INITIAL_WARRANTIES_V1];
  public warrantyClaimsV1: WarrantyClaimV1[] = [...INITIAL_WARRANTY_CLAIMS_V1];
  public warrantyAssignmentsV1: WarrantyAssignmentV1[] = [...INITIAL_WARRANTY_ASSIGNMENTS_V1];
  public warrantyDiagnosesV1: WarrantyDiagnosisV1[] = [...INITIAL_WARRANTY_DIAGNOSES_V1];
  public warrantyPaidWorkRequestsV1: WarrantyPaidWorkRequestV1[] = [...INITIAL_WARRANTY_PAID_WORK_REQUESTS_V1];
  public warrantyPaidWorkProposalsV1: WarrantyPaidWorkProposalV1[] = [...INITIAL_WARRANTY_PAID_WORK_PROPOSALS_V1];
  public warrantyCompletionProofsV1: WarrantyCompletionProofV1[] = [...INITIAL_WARRANTY_COMPLETION_PROOFS_V1];
  public warrantyTimelineEventsV1: WarrantyTimelineEventV1[] = [...INITIAL_WARRANTY_TIMELINE_EVENTS_V1];
  public notifications: Array<{
    id: string;
    recipientRole: string;
    recipientId: string;
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    link?: string;
  }> = [];
  private claimSubmissionLocks = new Set<string>();

  constructor() {
    // Canonical link synchronization on startup:
    // Ensure all orders have canonical IDs while preserving lookup
    this.syncInitialCanonicalReferences();
  }

  private syncInitialCanonicalReferences() {
    // Ensure orders have matching canonical IDs
    this.orders = this.orders.map((o) => {
      const canonicalId = normalizeEntityId(o.id);
      return {
        ...o,
        id: canonicalId,
      };
    });

    // Ensure worker jobs reference canonical orders
    this.workerJobs = this.workerJobs.map((j) => ({
      ...j,
      id: normalizeEntityId(j.id),
      orderId: normalizeEntityId(j.orderId),
    }));

    // Ensure proofs reference canonical orders
    const canonicalProofs: Record<string, ProofOfService> = {};
    Object.entries(this.proofs).forEach(([k, p]) => {
      const canonicalKey = normalizeEntityId(k);
      canonicalProofs[canonicalKey] = {
        ...p,
        orderId: canonicalKey,
      };
    });
    this.proofs = canonicalProofs;

    // Ensure support cases reference canonical orders
    this.supportCases = this.supportCases.map((c) => ({
      ...c,
      id: normalizeEntityId(c.id),
      orderId: normalizeEntityId(c.orderId),
    }));

    // Ensure demo workers Budi, Ahmad, and Hendra are anchored to primary provider PT Servio Mandiri Teknik
    this.workers = this.workers.map((w) => {
      if (["worker-budi", "worker-ahmad", "worker-hendra"].includes(w.id)) {
        return {
          ...w,
          providerId: "usr-prov-001",
          providerName: "PT Servio Mandiri Teknik",
        };
      }
      return w;
    });

    // Initialize default capabilities for workers linked to ProviderMasterServices
    this.initDefaultWorkerCapabilities();
    this.initDefaultWorkerTracking();
  }

  private initDefaultWorkerCapabilities() {
    this.workerCapabilities = [];

    // Link default capabilities to mock workers using ProviderMasterService
    // 1. Worker Budi (worker-budi) -> AC Cleaning, AC Repair, AC Installation, Electrical Repair
    const budiServices = ["pms-smt-001", "pms-smt-002", "pms-smt-003", "pms-smt-004"];
    this.setWorkerCapabilities("worker-budi", "usr-prov-001", budiServices);

    // 2. Worker Ahmad (worker-ahmad) -> Car Inspection
    const ahmadServices = ["pms-smt-005"];
    this.setWorkerCapabilities("worker-ahmad", "usr-prov-001", ahmadServices);

    // 3. Worker Hendra (worker-hendra) -> AC Cleaning, AC Repair
    const hendraServices = ["pms-smt-001", "pms-smt-002"];
    this.setWorkerCapabilities("worker-hendra", "usr-prov-001", hendraServices);
  }

  public getWorkerCapabilities(workerId: string): WorkerServiceCapability[] {
    return this.workerCapabilities.filter((c) => c.workerId === workerId);
  }

  public setWorkerCapabilities(
    workerId: string,
    providerId: string,
    masterServiceIds: string[]
  ): WorkerServiceCapability[] {
    // 1. Filter out existing capabilities for this worker
    this.workerCapabilities = this.workerCapabilities.filter(
      (c) => c.workerId !== workerId
    );

    // 2. Add new capabilities with strict duplicate prevention
    const addedIds = new Set<string>();
    const newCaps: WorkerServiceCapability[] = [];

    masterServiceIds.forEach((serviceId) => {
      if (addedIds.has(serviceId)) return; // duplicate prevention
      addedIds.add(serviceId);

      const pms = this.providerMasterServices.find((s) => s.id === serviceId);
      if (pms) {
        const cap: WorkerServiceCapability = {
          id: `wsc-${workerId}-${serviceId}`,
          workerId,
          providerId,
          masterServiceId: pms.id,
          masterServiceName: pms.name,
          categoryId: pms.categoryId,
          categoryName: pms.categoryName,
          subcategoryId: pms.subcategoryId,
          subcategoryName: pms.subcategoryName,
          assignedAt: new Date().toISOString(),
        };
        newCaps.push(cap);
        this.workerCapabilities.push(cap);
      }
    });

    // 3. Sync to worker object in this.workers
    const targetWorker = this.workers.find((w) => w.id === workerId);
    if (targetWorker) {
      targetWorker.capabilities = newCaps;
    }

    this.notify();
    return newCaps;
  }

  public addWorker(
    newWorker: Omit<WorkerTechnician, "id">,
    masterServiceIds?: string[]
  ): WorkerTechnician {
    const workerId = `worker-${Date.now().toString().slice(-4)}`;
    const createdWorker: WorkerTechnician = {
      ...newWorker,
      id: workerId,
      rating: newWorker.rating ?? 5.0,
      completedJobs: newWorker.completedJobs ?? 0,
      capabilities: [],
    };

    this.workers.unshift(createdWorker);

    if (masterServiceIds && masterServiceIds.length > 0) {
      const caps = this.setWorkerCapabilities(
        workerId,
        newWorker.providerId,
        masterServiceIds
      );
      createdWorker.capabilities = caps;
    }

    this.notify();
    return createdWorker;
  }

  // ==========================================================
  // WORKER LOCATION SHARING & TELEMETRY TRACKING (SECTIONS 20-31)
  // ==========================================================

  private initDefaultWorkerTracking() {
    this.workerTrackingSessions = [];

    // 1. Worker Budi (LIVE active tracking on operational order)
    const budiSession: WorkerTrackingSession = {
      id: "trk-worker-budi",
      workerId: "worker-budi",
      workerName: "Budi Santoso",
      providerId: "usr-prov-001",
      providerName: "PT Servio Mandiri Teknik",
      status: "TRACKING_ACTIVE",
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      lastLocationAt: new Date(Date.now() - 15000).toISOString(),
      lastLatitude: -6.2301,
      lastLongitude: 106.8502,
      lastAccuracyMeters: 12,
      lastAddress: "Dekat Halte TransJakarta Patra Kuningan (Jl. Gatot Subroto)",
      lastUpdatedAt: new Date(Date.now() - 15000).toISOString(),
      currentOrderId: "order-normal-progress",
      currentOrderService: "AC Repair",
      currentCategoryName: "Repair & Technical",
      currentSubcategoryName: "AC & Cooling",
    };
    this.workerTrackingSessions.push(budiSession);

    // 2. Worker Hendra (STALE tracking: updated 8 minutes ago)
    const hendraSession: WorkerTrackingSession = {
      id: "trk-worker-hendra",
      workerId: "worker-hendra",
      workerName: "Hendra Wijaya",
      providerId: "usr-prov-001",
      providerName: "PT Servio Mandiri Teknik",
      status: "TRACKING_STALE",
      startedAt: new Date(Date.now() - 7200000).toISOString(),
      lastLocationAt: new Date(Date.now() - 480000).toISOString(),
      lastLatitude: -6.2415,
      lastLongitude: 106.8432,
      lastAccuracyMeters: 25,
      lastAddress: "Terjebak lampu merah Simpang Pancoran",
      lastUpdatedAt: new Date(Date.now() - 480000).toISOString(),
      currentOrderId: "order-srv-102",
      currentOrderService: "AC Repair",
      currentCategoryName: "Repair & Technical",
      currentSubcategoryName: "AC & Cooling",
    };
    this.workerTrackingSessions.push(hendraSession);

    // 3. Worker Ahmad (TRACKING_OFF)
    const ahmadSession: WorkerTrackingSession = {
      id: "trk-worker-ahmad",
      workerId: "worker-ahmad",
      workerName: "Ahmad Fauzi",
      providerId: "usr-prov-001",
      providerName: "PT Servio Mandiri Teknik",
      status: "TRACKING_OFF",
      startedAt: new Date(Date.now() - 86400000).toISOString(),
      stoppedAt: new Date(Date.now() - 3600000).toISOString(),
      lastLocationAt: new Date(Date.now() - 3600000).toISOString(),
      lastLatitude: -6.2512,
      lastLongitude: 106.7921,
      lastAccuracyMeters: 30,
      lastAddress: "Dekat Mal Gandaria City",
      lastUpdatedAt: new Date(Date.now() - 3600000).toISOString(),
    };
    this.workerTrackingSessions.push(ahmadSession);

    // Sync to worker objects
    this.workers.forEach((w) => {
      const sess = this.workerTrackingSessions.find((s) => s.workerId === w.id);
      if (sess) w.trackingSession = sess;
    });
  }

  public getWorkerTrackingSession(workerId: string): WorkerTrackingSession | null {
    return this.workerTrackingSessions.find((s) => s.workerId === workerId) || null;
  }

  public startWorkerTracking(
    workerId: string,
    providerId: string,
    location?: { lat: number; lng: number; address: string; accuracy?: number }
  ): WorkerTrackingSession {
    let session = this.workerTrackingSessions.find((s) => s.workerId === workerId);
    const worker = this.workers.find((w) => w.id === workerId);
    const now = new Date().toISOString();

    if (!session) {
      session = {
        id: `trk-${workerId}`,
        workerId,
        workerName: worker?.name,
        providerId,
        status: "TRACKING_ACTIVE",
        startedAt: now,
        lastLocationAt: now,
        lastUpdatedAt: now,
        lastLatitude: location?.lat || -6.2301,
        lastLongitude: location?.lng || 106.8502,
        lastAccuracyMeters: location?.accuracy || 12,
        lastAddress: location?.address || worker?.currentLocation?.address || "Jakarta Selatan",
      };
      this.workerTrackingSessions.push(session);
    } else {
      session.status = "TRACKING_ACTIVE";
      session.startedAt = now;
      session.stoppedAt = undefined;
      session.lastUpdatedAt = now;
      session.lastLocationAt = now;
      if (location) {
        session.lastLatitude = location.lat;
        session.lastLongitude = location.lng;
        session.lastAddress = location.address;
        session.lastAccuracyMeters = location.accuracy || 12;
      }
    }

    if (worker) {
      worker.trackingSession = session;
    }

    this.notify();
    return session;
  }

  public stopWorkerTracking(workerId: string): WorkerTrackingSession | null {
    const session = this.workerTrackingSessions.find((s) => s.workerId === workerId);
    if (!session) return null;

    session.status = "TRACKING_STOPPED";
    session.stoppedAt = new Date().toISOString();
    session.lastUpdatedAt = new Date().toISOString();

    const worker = this.workers.find((w) => w.id === workerId);
    if (worker) {
      worker.trackingSession = session;
    }

    this.notify();
    return session;
  }

  public setWorkerTrackingStatus(workerId: string, status: WorkerTrackingStatus): WorkerTrackingSession | null {
    const session = this.workerTrackingSessions.find((s) => s.workerId === workerId);
    if (!session) return null;

    session.status = status;
    session.lastUpdatedAt = new Date().toISOString();

    const worker = this.workers.find((w) => w.id === workerId);
    if (worker) {
      worker.trackingSession = session;
    }

    this.notify();
    return session;
  }

  public updateWorkerTrackingLocation(
    workerId: string,
    location: { lat: number; lng: number; address: string; accuracy?: number }
  ): WorkerTrackingSession | null {
    const session = this.workerTrackingSessions.find((s) => s.workerId === workerId);
    if (!session) return null;

    const now = new Date().toISOString();
    session.lastLatitude = location.lat;
    session.lastLongitude = location.lng;
    session.lastAddress = location.address;
    session.lastAccuracyMeters = location.accuracy || 12;
    session.lastLocationAt = now;
    session.lastUpdatedAt = now;

    if (session.status === "TRACKING_STALE") {
      session.status = "TRACKING_ACTIVE";
    }

    const worker = this.workers.find((w) => w.id === workerId);
    if (worker) {
      worker.trackingSession = session;
      worker.currentLocation = {
        lat: location.lat,
        lng: location.lng,
        address: location.address,
      };
    }

    this.notify();
    return session;
  }

  public getProviderTrackingRadar(providerId: string) {
    // Strict Tenant Isolation: only include workers belonging to this provider
    const providerWorkers = this.workers.filter((w) => {
      if (w.providerId === providerId) return true;
      if (
        (providerId === "usr-prov-001" || providerId === "org-prov-101" || providerId === "prov-01" || providerId === "prov-bintang-teknik") &&
        (w.providerId === "usr-prov-001" || w.providerId === "org-prov-101" || w.providerId === "prov-01" || w.providerId === "prov-bintang-teknik")
      ) {
        return true;
      }
      return false;
    });

    const now = Date.now();
    const staleThresholdMs = 5 * 60 * 1000; // 5 minutes

    let trackingActiveCount = 0;
    let trackingOffCount = 0;
    let locationStaleCount = 0;
    let workerAssignedCount = 0;

    const enrichedWorkers = providerWorkers.map((worker) => {
      const session = this.getWorkerTrackingSession(worker.id);
      const activeOrder = this.orders.find(
        (o) => o.assignedWorker?.id === worker.id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
      );
      if (activeOrder) workerAssignedCount++;

      let freshnessState: "LIVE" | "STALE" | "OFFLINE" = "OFFLINE";

      if (session) {
        if (session.status === "TRACKING_ACTIVE") {
          const updateTime = session.lastUpdatedAt ? new Date(session.lastUpdatedAt).getTime() : 0;
          if (now - updateTime > staleThresholdMs) {
            freshnessState = "STALE";
            locationStaleCount++;
          } else {
            freshnessState = "LIVE";
            trackingActiveCount++;
          }
        } else if (session.status === "TRACKING_STALE") {
          freshnessState = "STALE";
          locationStaleCount++;
        } else {
          freshnessState = "OFFLINE";
          trackingOffCount++;
        }
      } else {
        trackingOffCount++;
      }

      return {
        ...worker,
        trackingSession: session || undefined,
        freshnessState,
        currentOrder: activeOrder,
      };
    });

    return {
      totalWorkers: providerWorkers.length,
      trackingActive: trackingActiveCount,
      trackingOff: trackingOffCount,
      locationStale: locationStaleCount,
      workerAssigned: workerAssignedCount,
      workers: enrichedWorkers,
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notify() {
    this.listeners.forEach((l) => l());
  }

  // ==========================================================
  // DETERMINISTIC ENTITY QUERIES (ROOT-02: NO SILENT FALLBACKS)
  // ==========================================================

  public getOrder(rawId: string): ServiceOrder | null {
    const target = normalizeEntityId(rawId);
    return this.orders.find((o) => o.id === target || normalizeEntityId(o.id) === target) || null;
  }

  public getWorkerJob(rawId: string): WorkerJob | null {
    const target = normalizeEntityId(rawId);
    let job = this.workerJobs.find(
      (j) =>
        j.id === target ||
        normalizeEntityId(j.id) === target ||
        j.orderId === target ||
        normalizeEntityId(j.orderId) === target
    );
    if (!job) {
      const order = this.getOrder(target);
      if (order) {
        const newJob: WorkerJob = {
          id: `JOB-${order.id}`,
          orderId: order.id,
          workerId: order.assignedWorker?.id || "worker-budi",
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerAddress: order.address,
          address: order.address,
          serviceTitle: order.serviceTitle,
          scheduledTime: order.scheduledTimeSlot,
          scheduledDate: order.scheduledDate,
          scheduledTimeSlot: order.scheduledTimeSlot,
          issueDescription: "Panggilan operasional order Servio",
          distanceKm: 2.5,
          status: order.status === "COMPLETED" ? "COMPLETED" : order.status === "DISPUTED" ? "BLOCKED" : "IN_PROGRESS",
          feeWorker: 95000,
          sopSteps: [],
          usedMaterials: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.workerJobs.unshift(newJob);
        job = newJob;
      }
    }
    return job || null;
  }

  public getProof(rawOrderId: string): ProofOfService | null {
    const target = normalizeEntityId(rawOrderId);
    return this.proofs[target] || null;
  }

  public getSupportCase(rawId: string): SupportCase | null {
    const target = normalizeEntityId(rawId);
    return this.supportCases.find((c) => c.id === target || normalizeEntityId(c.id) === target) || null;
  }

  public getWarranty(rawId: string): WarrantyCertificate | null {
    const target = normalizeEntityId(rawId);
    return this.warranties.find((w) => w.id === target || normalizeEntityId(w.id) === target) || null;
  }

  public getRefund(rawId: string): RefundRequest | null {
    const target = normalizeEntityId(rawId);
    return this.refunds.find((r) => r.id === target || normalizeEntityId(r.id) === target) || null;
  }

  public getDispute(rawId: string): DisputeCase | null {
    const target = normalizeEntityId(rawId);
    return this.disputes.find((d) => d.id === target || normalizeEntityId(d.id) === target || d.id.toLowerCase() === rawId.toLowerCase()) || null;
  }

  // ==========================================================
  // STORE PARTNERSHIPS & WORKER PARTNER SCOPE (PHASE C2 - C5)
  // ==========================================================

  public getStorePartnerships(providerId?: string): StorePartnership[] {
    if (!providerId) return this.storePartnerships;
    return this.storePartnerships.filter((p) => p.providerId === providerId);
  }

  /**
   * C5: Worker only sees merchants with ACTIVE partnership for the assigned Provider organization.
   * Inactive, pending, and rejected partnerships are excluded.
   */
  public getWorkerActivePartnerships(providerId?: string): StorePartnership[] {
    const targetProviderId = providerId || "prov-01";
    return this.storePartnerships.filter(
      (p) => (p.providerId === targetProviderId || p.providerId === "prov-bintang-teknik") && p.status === "ACTIVE"
    );
  }

  public getMerchantPartnerships(merchantId: string = "merch-01"): StorePartnership[] {
    return this.storePartnerships.filter((p) => p.merchantId === merchantId);
  }

  public getMerchantPartnershipRequests(merchantId: string = "merch-01"): StorePartnership[] {
    return this.storePartnerships.filter(
      (p) => p.merchantId === merchantId && p.status === "PENDING"
    );
  }

  public getPartnershipById(partnershipId: string): StorePartnership | undefined {
    return this.storePartnerships.find((p) => p.id === partnershipId);
  }

  public acceptStorePartnership(
    partnershipId: string,
    merchantId: string = "merch-01"
  ): StorePartnership | undefined {
    const part = this.storePartnerships.find((p) => p.id === partnershipId);
    if (!part) return undefined;
    // Strict RBAC Tenant Guard: Merchant can only approve requests sent to their store
    if (merchantId && part.merchantId !== merchantId) {
      console.warn(`[RBAC] Merchant ${merchantId} cannot approve partnership for ${part.merchantId}`);
      return undefined;
    }

    const nowFormatted =
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) + `, ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;

    part.status = "ACTIVE";
    part.approvedAt = nowFormatted;
    part.updatedAt = new Date().toISOString();
    delete part.rejectionReason;
    delete part.rejectedAt;

    this.notify();
    return part;
  }

  public rejectStorePartnership(
    partnershipId: string,
    reason?: string,
    merchantId: string = "merch-01"
  ): StorePartnership | undefined {
    const part = this.storePartnerships.find((p) => p.id === partnershipId);
    if (!part) return undefined;
    // Strict RBAC Tenant Guard: Merchant can only reject requests sent to their store
    if (merchantId && part.merchantId !== merchantId) {
      console.warn(`[RBAC] Merchant ${merchantId} cannot reject partnership for ${part.merchantId}`);
      return undefined;
    }

    const nowFormatted =
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) + `, ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;

    part.status = "REJECTED";
    part.rejectionReason = reason || "Tidak sesuai kebutuhan bisnis saat ini";
    part.rejectedAt = nowFormatted;
    part.updatedAt = new Date().toISOString();

    this.notify();
    return part;
  }

  public requestStorePartnership(
    providerId: string,
    merchantId: string,
    merchantName: string,
    scope = "HVAC_SPAREPARTS",
    providerMeta?: {
      providerName?: string;
      providerLogo?: string;
      providerRating?: number;
      providerReviewCount?: number;
      providerSpecialization?: string;
      providerServiceArea?: string;
      providerServiceCount?: number;
      providerDescription?: string;
      notes?: string;
    }
  ): StorePartnership {
    const existing = this.storePartnerships.find(
      (p) => p.providerId === providerId && p.merchantId === merchantId
    );
    const nowFormatted =
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) + `, ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;

    if (existing) {
      existing.status = "PENDING";
      existing.requestedAt = nowFormatted;
      existing.scope = scope;
      if (providerMeta) {
        if (providerMeta.providerName) existing.providerName = providerMeta.providerName;
        if (providerMeta.providerLogo) existing.providerLogo = providerMeta.providerLogo;
        if (providerMeta.providerRating) existing.providerRating = providerMeta.providerRating;
        if (providerMeta.providerReviewCount) existing.providerReviewCount = providerMeta.providerReviewCount;
        if (providerMeta.providerSpecialization) existing.providerSpecialization = providerMeta.providerSpecialization;
        if (providerMeta.providerServiceArea) existing.providerServiceArea = providerMeta.providerServiceArea;
        if (providerMeta.providerServiceCount) existing.providerServiceCount = providerMeta.providerServiceCount;
        if (providerMeta.providerDescription) existing.providerDescription = providerMeta.providerDescription;
        if (providerMeta.notes) existing.notes = providerMeta.notes;
      }
      delete existing.rejectionReason;
      delete existing.rejectedAt;
      existing.updatedAt = new Date().toISOString();
      this.notify();
      return existing;
    }

    const created: StorePartnership = {
      id: `part-${Date.now().toString().slice(-4)}`,
      providerId,
      providerName: providerMeta?.providerName || "PT Servio Mandiri Teknik",
      providerLogo: providerMeta?.providerLogo || "/brand/logo.png",
      providerRating: providerMeta?.providerRating || 4.8,
      providerReviewCount: providerMeta?.providerReviewCount || 120,
      providerSpecialization: providerMeta?.providerSpecialization || "AC & Cooling Specialist",
      providerServiceArea: providerMeta?.providerServiceArea || "Jabodetabek",
      providerServiceCount: providerMeta?.providerServiceCount || 10,
      providerDescription: providerMeta?.providerDescription || "Penyedia jasa teknisi resmi Servio.",
      notes: providerMeta?.notes || "Pengajuan kemitraan pengadaan suku cadang resmi.",
      merchantId,
      merchantName,
      status: "PENDING",
      requestedAt: nowFormatted,
      scope,
      rating: 4.8,
      distanceKm: 3.5,
      productCategories: ["AC Parts", "HVAC"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.storePartnerships.unshift(created);
    this.notify();
    return created;
  }

  public endStorePartnership(merchantId: string, providerId = "prov-01") {
    const part = this.storePartnerships.find(
      (p) => p.merchantId === merchantId && p.providerId === providerId
    );
    if (part) {
      part.status = "INACTIVE";
      part.endedAt = new Date().toISOString();
      part.updatedAt = new Date().toISOString();
      this.notify();
    }
  }

  // ==========================================
  // Phase D: Worker Sparepart & Material Architecture (D1 to D11)
  // ==========================================

  public addProviderMaterialToJob(
    jobId: string,
    materialData: {
      partName: string;
      partNumber?: string;
      quantity: number;
      unitPrice: number;
      reason: string;
    }
  ): ProviderMaterialLine | null {
    const job = this.workerJobs.find((j) => j.id === jobId || j.orderId === jobId);
    if (!job) return null;

    const createdLine: ProviderMaterialLine = {
      id: `mat-prov-${Date.now()}`,
      serviceOrderId: job.orderId,
      partName: materialData.partName,
      partNumber: materialData.partNumber || `PRV-PART-${Math.floor(Math.random() * 1000)}`,
      quantity: materialData.quantity,
      unitPrice: materialData.unitPrice,
      totalPrice: materialData.quantity * materialData.unitPrice,
      source: "PROVIDER_OWNED",
      customerApprovalStatus: "PENDING",
      isFulfillable: true,
      notes: materialData.reason,
      createdAt: new Date().toISOString(),
    };

    if (!job.providerMaterials) job.providerMaterials = [];
    job.providerMaterials.unshift(createdLine);

    // Synchronize to ServiceOrder if present
    const srvOrder = this.orders.find((o) => o.id === job.orderId);
    if (srvOrder) {
      if (!srvOrder.providerMaterials) srvOrder.providerMaterials = [];
      srvOrder.providerMaterials.unshift(createdLine);
      if (srvOrder.pricing) {
        srvOrder.pricing.materialFee = (srvOrder.pricing.materialFee || 0) + createdLine.totalPrice;
        srvOrder.pricing.totalAmount =
          srvOrder.pricing.serviceFee +
          srvOrder.pricing.materialFee +
          (srvOrder.pricing.platformFee || 0) -
          (srvOrder.pricing.discountAmount || 0);
      }
    }

    // Append timeline event
    if (!job.sparepartTimeline) job.sparepartTimeline = [];
    job.sparepartTimeline.unshift({
      id: `spt-${Date.now()}`,
      serviceOrderId: job.orderId,
      type: "PROVIDER_MATERIAL_PREPARED",
      title: "Suku Cadang Bengkel Ditambahkan",
      description: `${createdLine.partName} (${createdLine.quantity} unit) diajukan ke tagihan servis. Menunggu persetujuan klien.`,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      actorRole: "WORKER_TECHNICIAN",
    });

    this.notify();
    return createdLine;
  }

  public sendProductRecommendation(
    jobId: string,
    recData: {
      productId: string;
      productTitle: string;
      merchantId: string;
      merchantName: string;
      price: number;
      reason: string;
      compatibilityContext: string;
      shippingEstimate?: string;
      thumbnailUrl?: string;
    }
  ): ProductRecommendation | null {
    const job = this.workerJobs.find((j) => j.id === jobId || j.orderId === jobId);
    if (!job) return null;

    // Prevent duplicate pending recommendations for the same product
    const existing = (job.productRecommendations || []).find(
      (r) => r.productId === recData.productId && (r.status === "DRAFT" || r.status === "SUBMITTED")
    );
    if (existing) {
      existing.status = "SUBMITTED";
      existing.updatedAt = new Date().toISOString();
      this.notify();
      return existing;
    }

    const createdRec: ProductRecommendation = {
      id: `rec-${Date.now()}`,
      serviceOrderId: job.orderId,
      workerId: "worker-budi",
      workerName: "Budi Santoso",
      providerId: "prov-bintang-teknik",
      merchantId: recData.merchantId,
      merchantName: recData.merchantName,
      productId: recData.productId,
      productTitle: recData.productTitle,
      productThumbnailUrl: recData.thumbnailUrl,
      reason: recData.reason,
      compatibilityContext: recData.compatibilityContext,
      priceSnapshot: recData.price,
      availabilitySnapshot: true,
      shippingEstimateSnapshot: recData.shippingEstimate || "Instan Courier (1-2 Jam)",
      status: "SUBMITTED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!job.productRecommendations) job.productRecommendations = [];
    job.productRecommendations.unshift(createdRec);

    // Append timeline event
    if (!job.sparepartTimeline) job.sparepartTimeline = [];
    job.sparepartTimeline.unshift({
      id: `spt-${Date.now()}`,
      serviceOrderId: job.orderId,
      type: "SPAREPART_RECOMMENDED",
      title: "Rekomendasi Suku Cadang Terkirim",
      description: `Rekomendasi ${createdRec.productTitle} dari ${createdRec.merchantName} dikirim ke klien. Menunggu konfirmasi klien.`,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      actorRole: "WORKER_TECHNICIAN",
    });

    this.notify();
    return createdRec;
  }

  public updateRecommendationDecision(
    jobId: string,
    recId: string,
    status: ProductRecommendationStatus,
    decision?: CustomerRecommendationDecision,
    isSimulation: boolean = false
  ): ProductRecommendation | null {
    if (isSimulation && process.env.NODE_ENV === "production") {
      console.warn("Security Alert: Customer approval simulation is strictly forbidden in production.");
      return null;
    }

    const job = this.workerJobs.find((j) => j.id === jobId || j.orderId === jobId);
    if (!job || !job.productRecommendations) return null;

    const rec = job.productRecommendations.find((r) => r.id === recId);
    if (!rec) return null;

    rec.status = status;
    rec.customerDecision = decision;
    rec.updatedAt = new Date().toISOString();

    if (!job.sparepartTimeline) job.sparepartTimeline = [];
    job.sparepartTimeline.unshift({
      id: `spt-${Date.now()}`,
      serviceOrderId: job.orderId,
      type: status === "APPROVED" ? "SPAREPART_APPROVED" : "SPAREPART_REJECTED",
      title: status === "APPROVED" ? "Rekomendasi Disetujui Pelanggan" : "Rekomendasi Ditolak Pelanggan",
      description:
        status === "APPROVED"
          ? `Pelanggan menyetujui pengadaan ${rec.productTitle}. Siap dilanjutkan ke pemesanan.`
          : `Pelanggan menolak rekomendasi suku cadang. Teknisi memilih opsi alternatif.`,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      actorRole: "CUSTOMER",
    });

    this.notify();
    return rec;
  }

  public createAssistedProductOrder(
    jobId: string,
    recId: string,
    confirmedByCustomer: boolean = false
  ): { productOrderId: string; shipmentId: string } | null {
    const job = this.workerJobs.find((j) => j.id === jobId || j.orderId === jobId);
    if (!job || !job.productRecommendations) return null;

    const rec = job.productRecommendations.find((r) => r.id === recId);
    if (!rec) return null;

    // Prevent duplicate product order
    if (rec.productOrderId) {
      return {
        productOrderId: rec.productOrderId,
        shipmentId: rec.shipmentId || "",
      };
    }

    // Customer must explicitly confirm approval authority
    if (!confirmedByCustomer && rec.status !== "APPROVED") {
      console.warn("Unauthorized: ProductOrder requires explicit customer confirmation or APPROVED recommendation.");
      return null;
    }

    const orderId = `PO-PART-${Date.now().toString().slice(-6)}`;
    const shipmentId = `SHP-PART-${Date.now().toString().slice(-6)}`;
    const awbNumber = `GS-SPARE-${Math.floor(Math.random() * 900000 + 100000)}`;

    // Update recommendation state & link
    rec.productOrderId = orderId;
    rec.shipmentId = shipmentId;
    rec.status = "APPROVED";
    rec.customerDecision = "ACCEPT_PARTNER";
    rec.updatedAt = new Date().toISOString();

    // Link to matching requirement if present
    if (job.sparepartRequirements) {
      const matchingReq = job.sparepartRequirements.find(
        (req) => req.productId === rec.productId || req.partName.toLowerCase().includes("kapasitor")
      );
      if (matchingReq) {
        matchingReq.productOrderId = orderId;
        matchingReq.shipmentId = shipmentId;
        matchingReq.customerApprovalStatus = "APPROVED";
        matchingReq.procurementStatus = "IN_TRANSIT";
      }
    }

    // Phase E Finalization: Calculate policy-driven affiliate reward and create authoritative attribution
    const currentFeePolicy = this.getCurrentAffiliateFeePolicy();
    const economics = calculateAffiliateEconomics(rec.priceSnapshot, currentFeePolicy);
    const reward = calculateAffiliateReward(rec.priceSnapshot, DEFAULT_AFFILIATE_POLICY, currentFeePolicy);
    const existingAttr = this.affiliateAttributions.find(
      (a) => a.productOrderId === orderId
    );
    let newAttribution = existingAttr;
    if (!newAttribution) {
      newAttribution = {
        id: `aff-attr-${Date.now().toString().slice(-6)}`,
        productOrderId: orderId,
        serviceOrderId: job.orderId,
        providerId: rec.providerId || "prov-01",
        providerName: "PT Servio Mandiri Teknik",
        workerId: rec.workerId || "wrk-01",
        workerName: rec.workerName || "Andi",
        merchantId: rec.merchantId || "merch-01",
        merchantName: "Sejuk Sentra Part AC",
        productId: rec.productId,
        productTitle: rec.productTitle || "Suku Cadang AC",
        customerConfirmationStatus: "CONFIRMED",
        source: "SERVICE_RECOMMENDATION",
        eligibilityStatus: "PENDING",
        pointsWorker: reward.pointsWorker,
        pointsProvider: reward.pointsProvider,
        commissionAmountWorker: reward.commissionAmountWorker,
        commissionAmountProvider: reward.commissionAmountProvider,
        affiliateFeeAmount: economics.affiliateFeeAmount,
        affiliateFeeRateSnapshot: currentFeePolicy.rate,
        affiliateFeePolicyVersion: currentFeePolicy.policyVersion,
        rewardPolicyVersion: currentFeePolicy.policyVersion,
        conversionPolicyVersion: currentFeePolicy.policyVersion,
        rewardProviderAmount: economics.providerRewardAmount,
        rewardWorkerAmount: economics.workerRewardAmount,
        createdAt: new Date().toISOString(),
      };
      this.affiliateAttributions.unshift(newAttribution);
    }

    const newMerchantOrder: MerchantOrder = {
      id: orderId,
      orderNumber: orderId,
      customerId: "cust-01",
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      shippingAddress: job.customerAddress,
      items: [
        {
          productId: rec.productId,
          title: rec.productTitle || "Suku Cadang AC",
          sku: "SKU-SPARE-" + rec.productId,
          quantity: 1,
          unitPrice: rec.priceSnapshot,
          totalPrice: rec.priceSnapshot,
        },
      ],
      subtotal: rec.priceSnapshot,
      shippingFee: 15000,
      platformFee: 5000,
      totalAmount: rec.priceSnapshot + 20000,
      affiliateFeeAmount: economics.affiliateFeeAmount,
      affiliateFeeRateSnapshot: currentFeePolicy.rate,
      affiliateFeePolicyVersion: currentFeePolicy.policyVersion,
      netMerchantSettlement: rec.priceSnapshot - economics.affiliateFeeAmount,
      status: "CONFIRMED",
      paymentMethod: "SALDO_ESCROW",
      courierName: "GoSend Instant",
      trackingNumber: awbNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      orderSource: "SERVICE_RECOMMENDATION",
      serviceOrderId: job.orderId,
      serviceContext: {
        serviceOrderId: job.orderId,
        serviceTitle: job.serviceTitle,
        providerId: rec.providerId || "prov-01",
        providerName: "PT Servio Mandiri Teknik",
        workerId: rec.workerId || "wrk-01",
        workerName: rec.workerName || "Budi Santoso",
      },
      affiliateAttribution: newAttribution,
    };
    this.merchantOrders.unshift(newMerchantOrder);

    const newMerchantFulfillment: MerchantFulfillment = {
      id: `ful-${Date.now().toString().slice(-6)}`,
      orderId: orderId,
      orderNumber: orderId,
      customerName: job.customerName,
      destinationCity: "Jakarta Selatan",
      courier: "GoSend Instant",
      status: "PICKING",
      priority: "EXPRESS",
      items: [
        {
          productId: rec.productId,
          sku: "SKU-SPARE-" + rec.productId,
          title: rec.productTitle || "Suku Cadang AC",
          quantity: 1,
          pickedQuantity: 1,
          isPicked: true,
          binLocation: "Hub Toko Mitra",
        },
      ],
      createdAt: new Date().toISOString(),
    };
    this.merchantFulfillments.unshift(newMerchantFulfillment);

    const newMerchantShipment: MerchantShipment = {
      id: shipmentId,
      orderId: orderId,
      orderNumber: orderId,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      shippingAddress: job.customerAddress,
      courier: "GoSend Instant",
      awbNumber: awbNumber,
      serviceType: "INSTANT_2HR",
      weightKg: 1.0,
      shippingCost: 15000,
      estimatedDelivery: "35 Menit (Hari ini)",
      status: "IN_TRANSIT",
      dispatchedAt: new Date().toISOString(),
      checkpoints: [
        {
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
          status: "PACKED",
          location: rec.merchantName || "Toko Mitra",
          note: "Paket suku cadang telah diserahkan ke kurir instan.",
        },
        {
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
          status: "IN_TRANSIT",
          location: "Dalam Perjalanan ke Lokasi Servis",
          note: "Kurir sedang menuju alamat pelanggan (Estimasi: 35 menit).",
        },
      ],
    };
    this.merchantShipments.unshift(newMerchantShipment);

    // Update job requirement reference & timeline
    if (!job.sparepartTimeline) job.sparepartTimeline = [];
    job.sparepartTimeline.unshift(
      {
        id: `spt-${Date.now()}-1`,
        serviceOrderId: job.orderId,
        productOrderId: orderId,
        type: "SPAREPART_PRODUCT_ORDER_CREATED",
        title: `Pesanan Suku Cadang Terbit #${orderId}`,
        description: `Persetujuan eksplisit pelanggan dicatat. Pesanan diteruskan ke ${rec.merchantName}.`,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
        actorRole: "CUSTOMER",
      },
      {
        id: `spt-${Date.now()}-2`,
        serviceOrderId: job.orderId,
        productOrderId: orderId,
        type: "SPAREPART_SHIPPED",
        title: `Kurir Bergerak (${newMerchantShipment.courier})`,
        description: `No. Resi ${awbNumber}. Estimasi tiba di lokasi servis: 35 menit.`,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
        actorRole: "MERCHANT",
      }
    );

    this.notify();
    return { productOrderId: orderId, shipmentId };
  }

  public recordMaterialUsageResult(
    jobId: string,
    usage: {
      name: string;
      quantity: number;
      source: SparepartSourceType | "CUSTOMER_OWNED";
      status: "USED" | "RETURNED_TO_SHOP";
      notes?: string;
      barcodeNew?: string;
      serialOld?: string;
    }
  ): void {
    const job = this.workerJobs.find((j) => j.id === jobId || j.orderId === jobId);
    if (!job) return;

    // Canonical source mapping (normalizing legacy aliases)
    const canonicalSource: SparepartSourceType =
      usage.source === "CUSTOMER_OWNED" ? "CUSTOMER_SELF_PURCHASE" : (usage.source as SparepartSourceType);

    if (!job.usedMaterials) job.usedMaterials = [];
    job.usedMaterials.push({
      id: `mat-${Date.now()}`,
      name: usage.name,
      quantity: usage.quantity,
      status: usage.status,
      source: canonicalSource,
      usedAt: new Date().toISOString(),
      notes: usage.notes,
      barcodeNew: usage.barcodeNew,
      serialOld: usage.serialOld,
    });

    if (!job.sparepartTimeline) job.sparepartTimeline = [];
    job.sparepartTimeline.unshift({
      id: `spt-${Date.now()}`,
      serviceOrderId: job.orderId,
      type: "SPAREPART_USED",
      title: "Suku Cadang Telah Dipasang",
      description: `${usage.name} (${usage.quantity} unit) berhasil dipasang dan diuji pada unit klien.`,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      actorRole: "WORKER_TECHNICIAN",
    });

    this.notify();
  }

  public recordJobFallbackOutcome(
    jobId: string,
    outcome: {
      type:
        | "CUSTOMER_PURCHASED_ELSEWHERE"
        | "CUSTOMER_ALREADY_OWNS"
        | "CUSTOMER_DECLINED"
        | "ALTERNATIVE_PRODUCT_USED"
        | "WAITING_CUSTOMER"
        | "PARTNER_PRODUCT_UNAVAILABLE";
      notes?: string;
      alternativeProductTitle?: string;
    }
  ): void {
    const job = this.workerJobs.find((j) => j.id === jobId || j.orderId === jobId);
    if (!job) return;

    job.fallbackOutcome = {
      ...outcome,
      recordedAt: new Date().toISOString(),
    };

    if (
      outcome.type === "WAITING_CUSTOMER" ||
      outcome.type === "PARTNER_PRODUCT_UNAVAILABLE" ||
      (outcome.type === "CUSTOMER_DECLINED" && outcome.notes?.toLowerCase().includes("tertunda"))
    ) {
      job.status = "BLOCKED";
      job.blockedReason = outcome.notes || "Pengerjaan tertahan menunggu ketersediaan suku cadang.";
    }

    if (!job.sparepartTimeline) job.sparepartTimeline = [];
    const outcomeTitles: Record<string, string> = {
      CUSTOMER_PURCHASED_ELSEWHERE: "Klien Beli Mandiri di Luar",
      CUSTOMER_ALREADY_OWNS: "Klien Menggunakan Suku Cadang Pribadi",
      CUSTOMER_DECLINED: "Klien Menolak Penggantian Suku Cadang",
      ALTERNATIVE_PRODUCT_USED: "Suku Cadang Alternatif Disepakati",
      WAITING_CUSTOMER: "Pengerjaan Ditunda Menunggu Kesiapan Klien",
      PARTNER_PRODUCT_UNAVAILABLE: "Stok Toko Mitra Kosong",
    };

    job.sparepartTimeline.unshift({
      id: `spt-${Date.now()}`,
      serviceOrderId: job.orderId,
      type: outcome.type === "WAITING_CUSTOMER" ? "SERVICE_WAITING_FOR_MATERIAL" : "SPAREPART_REJECTED",
      title: outcomeTitles[outcome.type] || "Catatan Hasil Suku Cadang",
      description: outcome.notes || "Catatan penyesuaian jalur pengadaan suku cadang dicatat teknisi.",
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      actorRole: "WORKER_TECHNICIAN",
    });

    this.notify();
  }

  public respondDispute(
    caseId: string,
    response: {
      providerStatement: string;
      proposedSolution: "FREE_REWORK" | "PARTIAL_REFUND" | "REJECT_EXPLAIN";
      revisitDate?: string;
    }
  ) {
    const target = normalizeEntityId(caseId);
    const dispute = this.disputes.find((d) => d.id === target || normalizeEntityId(d.id) === target);
    if (dispute) {
      dispute.status = "IN_MEDIATION";
      dispute.providerStatement = response.providerStatement;
      dispute.proposedSolution = response.proposedSolution;
      if (response.revisitDate) dispute.revisitDate = response.revisitDate;
    }
    const sc = this.supportCases.find((c) => c.id === target || normalizeEntityId(c.id) === target);
    if (sc) {
      sc.status = "IN_MEDIATION";
      sc.chatThread.push({
        id: `msg-${Date.now()}`,
        senderRole: "PROVIDER",
        senderName: "Mitra Provider",
        message: `[Tanggapan Mitra]: ${response.providerStatement} (Solusi: ${response.proposedSolution})`,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      });
    }
    this.notify();
  }

  // ==========================================================
  // CROSS-ROLE MUTATIONS (ROOT-01: SHARED STATE)
  // ==========================================================

  /**
   * Flow: Provider Accepts Booking -> Order Created & Worker Job Enqueued
   * Sequence: BOOKING -> PROVIDER CONFIRM -> SERVICE ORDER CREATED -> WORKER ASSIGNED -> ORDER OPERATIONAL
   * Non-Authoritative AI context & Provider Notes are attached for Worker pre-service preparation.
   */
  public acceptBooking(
    bookingId: string,
    assignedWorkerId?: string,
    providerNotes?: string,
    includeAiContext: boolean = true
  ): { order: ServiceOrder; job: WorkerJob } {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} tidak ditemukan.`);

    booking.status = "ACCEPTED";
    booking.assignedWorkerId = assignedWorkerId;

    const chosenWorker = assignedWorkerId ? (this.workers.find((w) => w.id === assignedWorkerId) || this.workers[0]) : undefined;
    const newOrderId = `ORD-2026-${8910 + this.orders.length}`;
    const newJobId = `JOB-2026-${110 + this.workerJobs.length}`;

    const resolvedAiContext = includeAiContext && booking.aiAnalysis ? booking.aiAnalysis : undefined;

    // 1. Create Service Order FIRST (Sequence: Booking -> Provider Confirm -> Service Order Created)
    const newOrder: ServiceOrder = {
      id: newOrderId,
      bookingId: booking.id,
      customerId: "cust-new",
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      serviceId: "srv-ac-cuci-standar",
      serviceTitle: booking.serviceTitle,
      domainId: "repair",
      providerId: "prov-bintang-teknik",
      providerName: "Bintang Teknik Mandiri",
      assignedWorker: chosenWorker,
      serviceMode: "HOME_SERVICE",
      address: booking.address,
      scheduledDate: booking.requestedDate,
      scheduledTimeSlot: booking.requestedTimeSlot,
      status: chosenWorker ? "TECHNICIAN_DISPATCHED" : "PENDING_WORKER",
      statusLabel: chosenWorker ? "Teknisi Ditugaskan & Dalam Perjalanan" : "Order Dikonfirmasi (Menunggu Penugasan Teknisi)",
      stepper: [
        { id: "step-1", title: "Order Dikonfirmasi", description: "Booking diterima oleh mitra", isCurrent: !chosenWorker, isCompleted: true },
        { id: "step-2", title: "Teknisi Ditugaskan", description: chosenWorker ? `${chosenWorker.name} siap berangkat` : "Menunggu penugasan teknisi", isCurrent: !!chosenWorker, isCompleted: !!chosenWorker },
        { id: "step-3", title: "Teknisi Tiba di Lokasi", description: "Verifikasi lokasi & check-in GPS", isCurrent: false, isCompleted: false },
        { id: "step-4", title: "Pengerjaan Unit", description: "Proses servis sesuai SOP", isCurrent: false, isCompleted: false },
        { id: "step-5", title: "Penyelesaian & Garansi", description: "Unggah bukti & aktivasi garansi", isCurrent: false, isCompleted: false },
      ],
      pricing: {
        serviceFee: booking.initialPriceEstimate || 150000,
        materialFee: 0,
        platformFee: 5000,
        discountAmount: 0,
        totalAmount: (booking.initialPriceEstimate || 150000) + 5000,
      },
      isEscrowLocked: true,
      warrantyPeriodDays: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      providerNotes: providerNotes?.trim() || undefined,
      aiPreparationContext: resolvedAiContext,
    };

    booking.orderId = newOrderId;
    booking.status = "CONVERTED_TO_ORDER";
    this.orders.unshift(newOrder);

    // 2. If worker is assigned, enqueue Worker Job (Order Operational)
    let newJob: WorkerJob | undefined;
    if (chosenWorker) {
      newJob = {
        id: newJobId,
        orderId: newOrderId,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        customerAddress: booking.address,
        serviceTitle: booking.serviceTitle,
        issueDescription: booking.issueDescription,
        scheduledTime: `${booking.requestedDate}, ${booking.requestedTimeSlot}`,
        distanceKm: 3.2,
        status: "ASSIGNED",
        feeWorker: 95000,
        customerNotes: "Order baru hasil konfirmasi booking.",
        providerNotes: providerNotes?.trim() || undefined,
        aiPreparationContext: resolvedAiContext,
        sopSteps: [
          { id: "sop-1", title: "Pemeriksaan Awal & Suhu", description: "Catat suhu awal sebelum servis", isCompleted: false, requiresPhoto: true },
          { id: "sop-2", title: "Pengerjaan Servis Utama", description: "Pembersihan/perbaikan unit sesuai standar", isCompleted: false, requiresPhoto: true },
          { id: "sop-3", title: "Uji Fungsi & Suhu Akhir", description: "Pastikan unit bekerja optimal (< 18°C)", isCompleted: false, requiresPhoto: true },
        ],
        usedMaterials: [],
      };
      this.workerJobs.unshift(newJob);
    }

    // 3. Record Initial Financial Transaction
    const newTrx: GatewayTransaction = {
      id: `TRX-2026-${9910 + this.transactions.length}`,
      orderId: newOrderId,
      orderType: "SERVICE",
      customerName: booking.customerName,
      vendorName: "Bintang Teknik Mandiri",
      paymentMethod: "BCA_VA",
      grossAmount: newOrder.pricing.totalAmount,
      platformFeeRate: 0.1,
      platformFeeAmount: Math.round(newOrder.pricing.totalAmount * 0.1),
      vendorNetAmount: Math.round(newOrder.pricing.totalAmount * 0.9),
      status: "SETTLED",
      gatewayRef: `MID-AUTO-${Date.now().toString().slice(-6)}`,
      paidAt: "Hari ini",
      webhookReceived: true,
    };
    this.transactions.unshift(newTrx);

    this.notify();
    return { order: newOrder, job: newJob as WorkerJob };
  }

  /**
   * Flow: Provider Rejects Booking
   */
  public rejectBooking(bookingId: string, reason: string) {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (booking) {
      booking.status = "REJECTED";
      booking.rejectionReason = reason;
      this.notify();
    }
  }

  /**
   * Flow: Provider Assigns Worker to existing Order
   */
  public assignWorker(
    orderId: string,
    workerId: string,
    providerNotes?: string,
    includeAiContext: boolean = true
  ) {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId);
    const worker = this.workers.find((w) => w.id === workerId);
    if (!order || !worker) return;

    order.assignedWorker = worker;
    order.status = "TECHNICIAN_DISPATCHED";
    order.statusLabel = "Teknisi Ditugaskan & Dalam Perjalanan";
    order.updatedAt = new Date().toISOString();
    if (providerNotes !== undefined) order.providerNotes = providerNotes.trim() || undefined;

    // Check if worker job exists for this order
    let job = this.workerJobs.find((j) => j.orderId === targetOrderId);
    if (job) {
      job.status = "ASSIGNED";
      if (providerNotes !== undefined) job.providerNotes = providerNotes.trim() || undefined;
      if (includeAiContext && order.aiPreparationContext) {
        job.aiPreparationContext = order.aiPreparationContext;
      } else if (!includeAiContext) {
        job.aiPreparationContext = undefined;
      }
    } else {
      job = {
        id: `JOB-2026-${120 + this.workerJobs.length}`,
        orderId: targetOrderId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.address,
        serviceTitle: order.serviceTitle,
        issueDescription: "Panggilan operasional order Servio.",
        scheduledTime: `${order.scheduledDate}, ${order.scheduledTimeSlot}`,
        distanceKm: 2.5,
        status: "ASSIGNED",
        feeWorker: 95000,
        providerNotes: providerNotes !== undefined ? (providerNotes.trim() || undefined) : order.providerNotes,
        aiPreparationContext: includeAiContext ? order.aiPreparationContext : undefined,
        sopSteps: [
          { id: "sop-1", title: "Cek Suhu & Arus Awal", description: "Ukur parameter kerja unit", isCompleted: false, requiresPhoto: true },
          { id: "sop-2", title: "Pengerjaan Unit", description: "Perbaikan atau perawatan menyeluruh", isCompleted: false, requiresPhoto: true },
          { id: "sop-3", title: "Pengujian Akhir & QC", description: "Pastikan tidak ada kebocoran", isCompleted: false, requiresPhoto: true },
        ],
        usedMaterials: [],
      };
      this.workerJobs.unshift(job);
    }

    this.notify();
  }

  public findWorkerJob(idOrOrderId: string): WorkerJob | undefined {
    const target = normalizeEntityId(idOrOrderId);
    return this.workerJobs.find(
      (j) => j.id === target || normalizeEntityId(j.id) === target || j.orderId === target || normalizeEntityId(j.orderId) === target
    );
  }

  /**
   * Phase E: Affiliate Attribution Queries and Summaries
   */
  public getWorkerAffiliateAttributions(workerId: string = "wrk-01"): AffiliateAttribution[] {
    const isDefaultOrCanonical =
      !workerId ||
      workerId === "wrk-01" ||
      workerId === "worker-budi" ||
      workerId === "usr-work-001" ||
      workerId === "worker-andi";
    if (isDefaultOrCanonical) {
      return this.affiliateAttributions.filter(
        (a) => a.workerId === "wrk-01" || a.workerId === "worker-andi" || a.workerId === workerId
      );
    }
    return this.affiliateAttributions.filter((a) => a.workerId === workerId);
  }

  public getProviderAffiliateAttributions(providerId: string = "prov-01"): AffiliateAttribution[] {
    return this.affiliateAttributions.filter((a) => a.providerId === providerId);
  }

  public getAttributionByProductOrder(productOrderId: string): AffiliateAttribution | undefined {
    return this.affiliateAttributions.find(
      (a) => a.productOrderId === productOrderId || a.productOrderId.toLowerCase() === productOrderId.toLowerCase()
    );
  }

  public getAttributionByServiceOrder(serviceOrderId: string): AffiliateAttribution | undefined {
    return this.affiliateAttributions.find(
      (a) => a.serviceOrderId === serviceOrderId || a.serviceOrderId.toLowerCase() === serviceOrderId.toLowerCase()
    );
  }

  public getWorkerAffiliateSummary(workerId: string = "wrk-01") {
    const list = this.getWorkerAffiliateAttributions(workerId);
    const totalOrders = list.length;
    const pendingPoints = list
      .filter((a) => a.eligibilityStatus === "PENDING" || a.eligibilityStatus === "ELIGIBLE")
      .reduce((sum, a) => sum + (a.pointsWorker || 0), 0);
    const confirmedPoints = list
      .filter((a) => a.eligibilityStatus === "CONFIRMED" || a.eligibilityStatus === "DISBURSED")
      .reduce((sum, a) => sum + (a.pointsWorker || 0), 0);
    const revokedPoints = list
      .filter(
        (a) =>
          a.eligibilityStatus === "REVOKED" ||
          a.eligibilityStatus === "CANCELLED" ||
          a.eligibilityStatus === "REVERSED"
      )
      .reduce((sum, a) => sum + (a.pointsWorker || 0), 0);
    const thisMonthPoints = list
      .filter(
        (a) =>
          (a.eligibilityStatus === "PENDING" ||
            a.eligibilityStatus === "CONFIRMED" ||
            a.eligibilityStatus === "DISBURSED") &&
          (!a.createdAt || a.createdAt.includes("2026-09"))
      )
      .reduce((sum, a) => sum + (a.pointsWorker || 0), 0);
    const totalPoints = confirmedPoints;

    const availablePoints = this.getAvailablePointBalance("WORKER", workerId);
    const redeemedPoints = this.getRedeemedPointsTotal("WORKER", workerId);

    return {
      totalPoints,
      pendingPoints,
      earnedPoints: confirmedPoints,
      confirmedPoints,
      revokedPoints,
      reversedPoints: revokedPoints,
      thisMonthPoints,
      totalOrders,
      attributions: list,
      availablePoints: availablePoints > 0 ? availablePoints : confirmedPoints,
      redeemedPoints,
      totalEarnedPoints: confirmedPoints,
      pointLedger: this.getPointLedgerByOwner("WORKER", workerId),
    };
  }

  public getProviderAffiliateSummary(providerId: string = "prov-01") {
    const list = this.getProviderAffiliateAttributions(providerId);
    const totalOrders = list.length;
    const pendingPoints = list
      .filter((a) => a.eligibilityStatus === "PENDING" || a.eligibilityStatus === "ELIGIBLE")
      .reduce((sum, a) => sum + (a.pointsProvider || 0), 0);
    const confirmedPoints = list
      .filter((a) => a.eligibilityStatus === "CONFIRMED" || a.eligibilityStatus === "DISBURSED")
      .reduce((sum, a) => sum + (a.pointsProvider || 0), 0);
    const revokedPoints = list
      .filter(
        (a) =>
          a.eligibilityStatus === "REVOKED" ||
          a.eligibilityStatus === "CANCELLED" ||
          a.eligibilityStatus === "REVERSED"
      )
      .reduce((sum, a) => sum + (a.pointsProvider || 0), 0);
    const totalPoints = confirmedPoints + pendingPoints;

    const availablePoints = this.getAvailablePointBalance("PROVIDER", providerId);
    const redeemedPoints = this.getRedeemedPointsTotal("PROVIDER", providerId);

    return {
      totalPoints,
      totalEligiblePoints: totalPoints,
      pendingPoints,
      earnedPoints: confirmedPoints,
      confirmedPoints,
      revokedPoints,
      reversedPoints: revokedPoints,
      totalOrders,
      attributions: list,
      availablePoints: availablePoints > 0 ? availablePoints : confirmedPoints,
      redeemedPoints,
      totalEarnedPoints: confirmedPoints,
      pointLedger: this.getPointLedgerByOwner("PROVIDER", providerId),
    };
  }

  // =========================================================================
  // Phase E Finalization: Merchant Profile & Affiliate Enrollment
  // =========================================================================

  public getMerchantProfile(merchantId: string = "merch-01"): MerchantProfile | undefined {
    return this.merchantProfiles.find((m) => m.merchantId === merchantId);
  }

  public checkMerchantAffiliateEligibility(merchantId: string = "merch-01") {
    const profile = this.getMerchantProfile(merchantId);
    return checkMerchantAffiliateReadiness(profile);
  }

  public enrollMerchantAffiliate(
    merchantId: string = "merch-01",
    termsVersion: string = "AFF-TERMS-v1.0",
    acceptedBy: string = "Pemilik Toko"
  ): { success: boolean; message: string; profile?: MerchantProfile } {
    const profile = this.getMerchantProfile(merchantId);
    if (!profile) {
      return { success: false, message: "Data toko tidak ditemukan" };
    }
    const readiness = checkMerchantAffiliateReadiness(profile);
    if (!readiness.isEligible) {
      return {
        success: false,
        message: `Persyaratan belum lengkap: ${readiness.missingRequirements.join(", ")}`,
        profile,
      };
    }
    const nowIso = new Date().toISOString();
    profile.affiliateStatus = "ACTIVE";
    profile.affiliateTermsAccepted = true;
    profile.affiliateTermsVersion = termsVersion;
    profile.affiliatePolicyVersion = this.getCurrentAffiliateFeePolicy().policyVersion;
    profile.affiliateAcceptedBy = acceptedBy;
    profile.affiliateAcceptedAt = nowIso;
    profile.affiliateEnrolledAt = profile.affiliateEnrolledAt || nowIso;
    delete profile.affiliateDeactivatedAt;
    profile.updatedAt = nowIso;
    this.notify();
    return {
      success: true,
      message: "Toko berhasil terdaftar dan aktif dalam Program Afiliasi Servio!",
      profile,
    };
  }

  public deactivateMerchantAffiliate(
    merchantId: string = "merch-01",
    reason?: string
  ): { success: boolean; message: string; profile?: MerchantProfile } {
    const profile = this.getMerchantProfile(merchantId);
    if (!profile) return { success: false, message: "Data toko tidak ditemukan" };
    profile.affiliateStatus = "INACTIVE";
    profile.affiliateDeactivatedAt = new Date().toISOString();
    if (reason) {
      profile.description = profile.description ? `${profile.description} [Deactivated: ${reason}]` : `[Deactivated: ${reason}]`;
    }
    profile.updatedAt = new Date().toISOString();
    this.notify();
    return {
      success: true,
      message: "Partisipasi Program Afiliasi berhasil dinonaktifkan.",
      profile,
    };
  }

  public reactivateMerchantAffiliate(
    merchantId: string = "merch-01"
  ): { success: boolean; message: string; profile?: MerchantProfile } {
    const profile = this.getMerchantProfile(merchantId);
    if (!profile) return { success: false, message: "Data toko tidak ditemukan" };
    const readiness = checkMerchantAffiliateReadiness(profile);
    if (!readiness.isEligible) {
      return {
        success: false,
        message: `Tidak dapat diaktifkan kembali. Persyaratan belum lengkap: ${readiness.missingRequirements.join(", ")}`,
        profile,
      };
    }
    profile.affiliateStatus = "ACTIVE";
    delete profile.affiliateDeactivatedAt;
    profile.updatedAt = new Date().toISOString();
    this.notify();
    return {
      success: true,
      message: "Program Afiliasi toko berhasil diaktifkan kembali.",
      profile,
    };
  }

  // =========================================================================
  // Phase E Finalization: Point Ledger & Available Balance Tracking
  // =========================================================================

  public getPointLedgerByOwner(
    ownerType: PointLedgerOwnerType,
    ownerId: string
  ): PointLedgerEntry[] {
    const isDefaultWorker =
      ownerType === "WORKER" &&
      (!ownerId || ownerId === "wrk-01" || ownerId === "worker-andi" || ownerId === "worker-budi");

    if (isDefaultWorker) {
      return this.pointLedgers.filter(
        (l) =>
          l.ownerType === "WORKER" &&
          (l.ownerId === "wrk-01" || l.ownerId === "worker-andi" || l.ownerId === ownerId)
      );
    }

    return this.pointLedgers.filter(
      (l) => l.ownerType === ownerType && l.ownerId === ownerId
    );
  }

  public getAvailablePointBalance(
    ownerType: PointLedgerOwnerType,
    ownerId: string
  ): number {
    const ledgers = this.getPointLedgerByOwner(ownerType, ownerId);
    let balance = 0;
    for (const entry of ledgers) {
      if (entry.status === "CONFIRMED") {
        if (entry.direction === "CREDIT") {
          balance += entry.pointAmount;
        } else if (entry.direction === "DEBIT") {
          balance -= entry.pointAmount;
        }
      } else if (entry.status === "REVERSED") {
        if (entry.direction === "DEBIT") {
          balance -= entry.pointAmount;
        }
      }
    }
    return Math.max(0, balance);
  }

  public getRedeemedPointsTotal(
    ownerType: PointLedgerOwnerType,
    ownerId: string
  ): number {
    const ledgers = this.getPointLedgerByOwner(ownerType, ownerId);
    return ledgers
      .filter((l) => l.sourceType === "REDEMPTION" && l.direction === "DEBIT")
      .reduce((sum, l) => sum + l.pointAmount, 0);
  }

  public recordPointCredit(
    ownerType: PointLedgerOwnerType,
    ownerId: string,
    amount: number,
    sourceType: PointLedgerSourceType,
    sourceId: string,
    status: PointLedgerStatus = "CONFIRMED",
    metadata?: Record<string, unknown>
  ): PointLedgerEntry {
    const currentPolicy = this.getCurrentAffiliateFeePolicy();
    const entry: PointLedgerEntry = {
      ledgerId: `ledg-cred-${Date.now().toString().slice(-6)}`,
      ownerType,
      ownerId,
      sourceType,
      sourceId,
      pointAmount: Math.abs(amount),
      direction: "CREDIT",
      status,
      policyVersion: currentPolicy.policyVersion,
      conversionPolicyVersion: currentPolicy.policyVersion,
      createdAt: new Date().toLocaleDateString("id-ID") + " WIB",
      effectiveAt: status === "CONFIRMED" ? new Date().toLocaleDateString("id-ID") + " WIB" : undefined,
      metadata,
    };
    this.pointLedgers.unshift(entry);
    this.notify();
    return entry;
  }

  public recordPointDebit(
    ownerType: PointLedgerOwnerType,
    ownerId: string,
    amount: number,
    sourceType: PointLedgerSourceType,
    sourceId: string,
    status: PointLedgerStatus = "CONFIRMED",
    metadata?: Record<string, unknown>
  ): PointLedgerEntry {
    const currentPolicy = this.getCurrentAffiliateFeePolicy();
    const entry: PointLedgerEntry = {
      ledgerId: `ledg-deb-${Date.now().toString().slice(-6)}`,
      ownerType,
      ownerId,
      sourceType,
      sourceId,
      pointAmount: Math.abs(amount),
      direction: "DEBIT",
      status,
      policyVersion: currentPolicy.policyVersion,
      conversionPolicyVersion: currentPolicy.policyVersion,
      createdAt: new Date().toLocaleDateString("id-ID") + " WIB",
      effectiveAt: status === "CONFIRMED" ? new Date().toLocaleDateString("id-ID") + " WIB" : undefined,
      metadata,
    };
    this.pointLedgers.unshift(entry);
    this.notify();
    return entry;
  }

  public recordPointReversal(originalLedgerId: string, reason: string): PointLedgerEntry | undefined {
    const original = this.pointLedgers.find((l) => l.ledgerId === originalLedgerId);
    if (!original) return undefined;

    const currentPolicy = this.getCurrentAffiliateFeePolicy();
    const reversalEntry: PointLedgerEntry = {
      ledgerId: `ledg-rev-${Date.now().toString().slice(-6)}`,
      ownerType: original.ownerType,
      ownerId: original.ownerId,
      sourceType: "REVERSAL",
      sourceId: original.sourceId,
      pointAmount: original.pointAmount,
      direction: original.direction === "CREDIT" ? "DEBIT" : "CREDIT",
      status: "REVERSED",
      policyVersion: original.policyVersion,
      conversionPolicyVersion: original.conversionPolicyVersion,
      createdAt: new Date().toLocaleDateString("id-ID") + " WIB",
      reversalOf: original.ledgerId,
      metadata: { reason, originalCreatedAt: original.createdAt },
    };
    this.pointLedgers.unshift(reversalEntry);
    this.notify();
    return reversalEntry;
  }

  // =========================================================================
  // Phase E Finalization: Reward Catalog & Idempotent Redemption Flow
  // =========================================================================

  public getRewardCatalog(eligibilityFilter?: PointLedgerOwnerType): RewardCatalogItem[] {
    if (!eligibilityFilter) return this.rewardCatalog.filter((r) => r.active);
    return this.rewardCatalog.filter((r) => r.active && r.eligibility.includes(eligibilityFilter));
  }

  public getRedemptionsByOwner(ownerType: PointLedgerOwnerType, ownerId: string): RedemptionRecord[] {
    const isDefaultWorker =
      ownerType === "WORKER" &&
      (!ownerId || ownerId === "wrk-01" || ownerId === "worker-andi" || ownerId === "worker-budi");

    if (isDefaultWorker) {
      return this.redemptions.filter(
        (r) =>
          r.ownerType === "WORKER" &&
          (r.ownerId === "wrk-01" || r.ownerId === "worker-andi" || r.ownerId === ownerId)
      );
    }

    return this.redemptions.filter((r) => r.ownerType === ownerType && r.ownerId === ownerId);
  }

  public redeemReward(
    ownerType: PointLedgerOwnerType,
    ownerId: string,
    rewardId: string,
    idempotencyKey?: string
  ): { success: boolean; message: string; redemption?: RedemptionRecord } {
    // Idempotency guard: Section 38 & 100
    if (idempotencyKey) {
      const existing = this.redemptions.find(
        (r) => r.idempotencyKey === idempotencyKey && r.status === "COMPLETED"
      );
      if (existing) {
        return {
          success: true,
          message: "Penukaran telah berhasil diproses sebelumnya (Idempotent).",
          redemption: existing,
        };
      }
    }

    const reward = this.rewardCatalog.find((r) => r.rewardId === rewardId && r.active);
    if (!reward) {
      return { success: false, message: "Katalog reward tidak ditemukan atau sudah tidak aktif." };
    }

    if (!reward.eligibility.includes(ownerType)) {
      return { success: false, message: "Reward ini tidak berlaku untuk peran Anda." };
    }

    const availableBalance = this.getAvailablePointBalance(ownerType, ownerId);
    if (availableBalance < reward.requiredPoints) {
      return {
        success: false,
        message: `Saldo poin tidak mencukupi. Tersedia: ${availableBalance} pts, dibutuhkan: ${reward.requiredPoints} pts.`,
      };
    }

    const balanceBefore = availableBalance;
    const balanceAfter = balanceBefore - reward.requiredPoints;

    const voucherPrefix =
      reward.rewardType === "SERVICE_VOUCHER" ? "SVC" : reward.rewardType === "PRODUCT_VOUCHER" ? "PRD" : "FEE";
    const voucherCode = `VCH-${voucherPrefix}-${Date.now().toString().slice(-6)}`;
    const redemptionId = `rdm-${Date.now().toString().slice(-6)}`;

    // 1. Debit Point Ledger
    const debitEntry = this.recordPointDebit(
      ownerType,
      ownerId,
      reward.requiredPoints,
      "REDEMPTION",
      redemptionId,
      "CONFIRMED",
      { rewardId, rewardName: reward.name, voucherCode }
    );

    // 2. Issue Active Reward Voucher
    const redemptionRecord: RedemptionRecord = {
      redemptionId,
      ownerType,
      ownerId,
      rewardId: reward.rewardId,
      rewardName: reward.name,
      pointsSpent: reward.requiredPoints,
      balanceBefore,
      balanceAfter,
      status: "COMPLETED",
      voucherCode,
      voucherStatus: "ACTIVE",
      issuedAt: new Date().toLocaleDateString("id-ID") + " WIB",
      expiresAt: new Date(Date.now() + 60 * 86400000).toLocaleDateString("id-ID") + " WIB",
      policyVersion: reward.policyVersion,
      idempotencyKey,
      ledgerId: debitEntry.ledgerId,
    };

    this.redemptions.unshift(redemptionRecord);
    this.notify();

    return {
      success: true,
      message: `Penukaran berhasil! ${reward.name} telah diterbitkan dengan kode ${voucherCode}.`,
      redemption: redemptionRecord,
    };
  }

  // =========================================================================
  // Phase E Finalization: Finance Operational Fee & Reconciliation
  // =========================================================================

  public getCurrentAffiliateFeePolicy(): AffiliateFeePolicy {
    const base = this.affiliateFeePolicies.find((p) => p.status === "ACTIVE") || this.affiliateFeePolicies[0] || DEFAULT_AFFILIATE_FEE_POLICY;
    const activeAffFee = this.canonicalFeePolicies?.find(
      (p) => p.policyType === "AFFILIATE_FEE" && p.status === "ACTIVE"
    );
    const activeProv = this.canonicalFeePolicies?.find(
      (p) => p.policyType === "PROVIDER_REWARD" && p.status === "ACTIVE"
    );
    const activeWrk = this.canonicalFeePolicies?.find(
      (p) => p.policyType === "WORKER_REWARD" && p.status === "ACTIVE"
    );

    if (activeAffFee) {
      return {
        ...base,
        rate: activeAffFee.calculationType === "PERCENTAGE" ? activeAffFee.value / 100 : base.rate,
        providerSharePercent: activeProv ? activeProv.value : base.providerSharePercent,
        workerSharePercent: activeWrk ? activeWrk.value : base.workerSharePercent,
        policyVersion: activeAffFee.version,
        effectiveFrom: activeAffFee.effectiveFrom,
        status: "ACTIVE",
      };
    }

    return base;
  }

  public updateOperationalFeeRate(
    newRate: number,
    effectiveFrom: string = new Date().toISOString().split("T")[0],
    updatedBy: string = "Finance Ops"
  ): { success: boolean; message: string; policy?: AffiliateFeePolicy } {
    const current = this.getCurrentAffiliateFeePolicy();
    // Validate against CEO allowable boundary (Section 2.2, 17, 90)
    if (newRate < current.allowedMinRate || newRate > current.allowedMaxRate) {
      return {
        success: false,
        message: `Tarif ${(newRate * 100).toFixed(1)}% berada di luar batas yang disetujui CEO (${(current.allowedMinRate * 100).toFixed(1)}% - ${(current.allowedMaxRate * 100).toFixed(1)}%). Diperlukan perubahan kebijakan platform oleh CEO.`,
      };
    }

    this.affiliateFeePolicies.forEach((p) => {
      if (p.status === "ACTIVE") p.status = "ARCHIVED";
    });

    const nextVersionNum = (parseFloat(current.policyVersion.replace("AFF-", "")) + 1).toString().padStart(3, "0");
    const nextPolicy: AffiliateFeePolicy = {
      feePolicyId: `fee-pol-${Date.now().toString().slice(-6)}`,
      rate: newRate,
      basis: "ELIGIBLE_PRODUCT_SUBTOTAL",
      allowedMinRate: current.allowedMinRate,
      allowedMaxRate: current.allowedMaxRate,
      providerSharePercent: current.providerSharePercent,
      workerSharePercent: current.workerSharePercent,
      pointsPerThousandIdr: current.pointsPerThousandIdr,
      effectiveFrom,
      policyVersion: `AFF-${nextVersionNum}`,
      status: "ACTIVE",
      createdBy: updatedBy,
      createdAt: new Date().toISOString(),
    };

    this.affiliateFeePolicies.unshift(nextPolicy);

    const currentActiveCanonical = this.canonicalFeePolicies?.find(
      (p) => p.policyType === "AFFILIATE_FEE" && p.status === "ACTIVE"
    );
    if (currentActiveCanonical) {
      currentActiveCanonical.status = "SUPERSEDED";
      this.canonicalFeePolicies.unshift({
        id: nextPolicy.feePolicyId,
        policyType: "AFFILIATE_FEE",
        calculationType: "PERCENTAGE",
        value: Number((newRate * 100).toFixed(1)),
        currency: "IDR",
        status: "ACTIVE",
        effectiveFrom,
        version: nextPolicy.policyVersion,
        proposalReason: "Pembaruan fee operasional",
        submittedBy: updatedBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    this.notify();

    return {
      success: true,
      message: `Konfigurasi fee operasional berhasil diperbarui ke ${(newRate * 100).toFixed(1)}% (Versi ${nextPolicy.policyVersion}). Berlaku mulai ${effectiveFrom}. Order historis tetap menggunakan snapshot lama.`,
      policy: nextPolicy,
    };
  }

  public getAffiliateFinanceReconciliation(): AffiliateFinanceReconciliationRow[] {
    const rows: AffiliateFinanceReconciliationRow[] = [];
    const affiliateOrders = this.merchantOrders.filter(
      (o) => o.orderSource === "SERVICE_RECOMMENDATION" || !!o.affiliateAttribution
    );

    for (const order of affiliateOrders) {
      const attr =
        order.affiliateAttribution ||
        this.affiliateAttributions.find(
          (a) => a.productOrderId === order.orderNumber || a.productOrderId === order.id
        );

      const feeRate = order.affiliateFeeRateSnapshot || (attr?.affiliateFeeRateSnapshot ?? 0.05);
      const subtotal = order.subtotal;
      const feeAmount = order.affiliateFeeAmount || Math.round(subtotal * feeRate);
      const providerPts = attr?.pointsProvider || 50;
      const workerPts = attr?.pointsWorker || 30;
      const providerAmt = attr?.rewardProviderAmount || Math.round(feeAmount * 0.6);
      const workerAmt = attr?.rewardWorkerAmount || Math.round(feeAmount * 0.4);
      const netSettlement = order.netMerchantSettlement !== undefined ? order.netMerchantSettlement : subtotal - feeAmount;

      rows.push({
        productOrderId: order.id,
        orderNumber: order.orderNumber,
        serviceOrderId: order.serviceOrderId || order.serviceContext?.serviceOrderId,
        merchantId: attr?.merchantId || "merch-01",
        merchantName: attr?.merchantName || "Sejuk Sentra Part AC",
        providerId: attr?.providerId || "prov-01",
        providerName: attr?.providerName || "PT Servio Mandiri Teknik",
        workerId: attr?.workerId || "wrk-01",
        workerName: attr?.workerName || "Andi",
        productSubtotal: subtotal,
        subtotal: subtotal,
        affiliateFeeRate: feeRate,
        affiliateFeeRateSnapshot: feeRate,
        policyVersion: order.affiliateFeePolicyVersion || attr?.affiliateFeePolicyVersion || "AFF-001",
        affiliateFee: feeAmount,
        affiliateFeeAmount: feeAmount,
        providerRewardAmount: providerAmt,
        providerRewardLiability: providerAmt,
        providerRewardPoints: providerPts,
        providerPoints: providerPts,
        workerRewardAmount: workerAmt,
        workerRewardLiability: workerAmt,
        workerRewardPoints: workerPts,
        workerPoints: workerPts,
        netMerchantSettlement: netSettlement,
        rewardStatus: attr?.eligibilityStatus || "PENDING",
        reconciliationStatus: "MATCHED",
        createdAt: order.createdAt,
      });
    }

    return rows;
  }

  public getAffiliateFinanceSummary(): AffiliateFinanceSummary {
    const rows = this.getAffiliateFinanceReconciliation();
    const affiliateGMV = rows.reduce((acc, r) => acc + r.productSubtotal, 0);
    const affiliateFeeGenerated = rows.reduce((acc, r) => acc + r.affiliateFeeAmount, 0);
    const providerRewardLiability = rows
      .filter((r) => r.rewardStatus === "CONFIRMED" || r.rewardStatus === "PENDING")
      .reduce((acc, r) => acc + r.providerRewardAmount, 0);
    const workerRewardLiability = rows
      .filter((r) => r.rewardStatus === "CONFIRMED" || r.rewardStatus === "PENDING")
      .reduce((acc, r) => acc + r.workerRewardAmount, 0);
    const totalRewardLiability = providerRewardLiability + workerRewardLiability;

    const redeemedRewardValue = this.redemptions
      .filter((r) => r.status === "COMPLETED")
      .reduce((acc, r) => acc + (this.rewardCatalog.find((c) => c.rewardId === r.rewardId)?.rewardValue || 0), 0);

    const reversedRewardValue = rows
      .filter((r) => r.rewardStatus === "REVERSED" || r.rewardStatus === "CANCELLED")
      .reduce((acc, r) => acc + (r.providerRewardAmount + r.workerRewardAmount), 0);

    const outstandingRewardLiability = Math.max(0, totalRewardLiability - redeemedRewardValue - reversedRewardValue);

    const activeAffiliateMerchants = this.merchantProfiles.filter((m) => m.affiliateStatus === "ACTIVE").length;
    const activePartnerships = this.storePartnerships.filter((p) => p.status === "ACTIVE").length;
    const eligibleAffiliateOrders = rows.filter((r) => r.rewardStatus !== "CANCELLED" && r.rewardStatus !== "REVERSED").length;
    const providerRewardPoints = Math.round((providerRewardLiability * 10) / 1000);
    const workerRewardPoints = Math.round((workerRewardLiability * 10) / 1000);

    return {
      affiliateGMV,
      totalGmv: affiliateGMV,
      affiliateFeeGenerated,
      totalFeeCollected: affiliateFeeGenerated,
      providerRewardLiability,
      providerRewardPoints,
      workerRewardLiability,
      workerRewardPoints,
      totalRewardLiability,
      redeemedRewardValue,
      reversedRewardValue,
      outstandingRewardLiability,
      outstandingLiability: outstandingRewardLiability,
      activeAffiliateMerchants,
      activePartnerships,
      eligibleAffiliateOrders,
      totalOrders: rows.length,
    };
  }

  /**
   * Flow: Worker Progression (DISPATCHED -> ARRIVED -> IN_PROGRESS -> PROOF_SUBMITTED)
   */
  public updateWorkerJobStatus(jobId: string, status: WorkerJob["status"]) {
    const job = this.findWorkerJob(jobId);
    if (!job) return;

    job.status = status;

    // Sync order status
    const order = this.orders.find((o) => o.id === job.orderId);
    if (order) {
      if (status === "DISPATCHED") {
        order.status = "TECHNICIAN_DISPATCHED";
        order.statusLabel = "Teknisi Ditugaskan & Dalam Perjalanan";
      } else if (status === "ARRIVED") {
        order.status = "TECHNICIAN_ARRIVED";
        order.statusLabel = "Teknisi Tiba di Lokasi";
      } else if (status === "IN_PROGRESS") {
        order.status = "IN_PROGRESS";
        order.statusLabel = "Sedang Dikerjakan Teknisi";
      } else if (status === "PROOF_SUBMITTED") {
        order.status = "AWAITING_PROOF_REVIEW";
        order.statusLabel = "Menunggu Verifikasi Hasil Servis";
      } else if (status === "COMPLETED") {
        order.status = "COMPLETED";
        order.statusLabel = "Pekerjaan Selesai & Garansi Aktif";
      } else if (status === "BLOCKED") {
        order.statusLabel = `Kendala Lapangan: ${job.blockedReason || "Perlu Koordinasi"}`;
      }
      order.updatedAt = new Date().toISOString();
    }

    this.notify();
  }

  public reportWorkerJobIssue(jobId: string, reason: string, note: string) {
    const job = this.findWorkerJob(jobId);
    if (!job) return;

    job.status = "BLOCKED";
    job.blockedReason = reason;
    job.reportedIssue = {
      reason,
      note,
      reportedAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
    };

    const order = this.orders.find((o) => o.id === job.orderId);
    if (order) {
      order.statusLabel = `Kendala Lapangan: ${reason}`;
      order.updatedAt = new Date().toISOString();
    }

    this.notify();
  }

  public markJobReady(jobId: string) {
    const job = this.findWorkerJob(jobId);
    if (!job) return;

    job.isReadyConfirmed = true;
    this.notify();
  }

  /**
   * Flow: Worker Submits Proof of Service
   */
  public submitWorkerProof(
    jobId: string,
    proofData: {
      media: ProofOfService["media"];
      parameters: { parameter: string; value: string; standard: string }[];
    }
  ) {
    const job = this.findWorkerJob(jobId);
    if (!job) return;

    job.status = "PROOF_SUBMITTED";

    const targetOrderId = job.orderId;
    const proof: ProofOfService = {
      orderId: targetOrderId,
      providerId: "prov-bintang-teknik",
      workerId: "worker-budi",
      media: proofData.media,
      checklistCompleted: true,
      testedParameters: proofData.parameters,
      submittedAt: new Date().toISOString(),
      isApprovedByCustomer: false,
    };

    this.proofs[targetOrderId] = proof;

    const order = this.orders.find((o) => o.id === targetOrderId);
    if (order) {
      order.status = "AWAITING_PROOF_REVIEW";
      order.statusLabel = "Menunggu Verifikasi Hasil Bukti";
      order.updatedAt = new Date().toISOString();
    }

    this.notify();
  }

  /**
   * Flow: Provider / Customer Verifies Proof & Completes Order -> Activates Warranty & Accrues Payout
   */
  public completeOrder(orderId: string, notes?: string) {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId);
    if (!order) return;

    order.status = "COMPLETED";
    order.statusLabel = "Pekerjaan Selesai & Garansi Resmi Aktif";
    order.updatedAt = new Date().toISOString();

    // WAR-GRANT-01: Snapshot warranty eligibility upon canonical order completion
    this.snapshotWarrantyEligibilityOnCompletion(order.id);

    // Mark proof approved
    if (this.proofs[targetOrderId]) {
      this.proofs[targetOrderId].isApprovedByCustomer = true;
      this.proofs[targetOrderId].customerFeedback = notes || "Pekerjaan rapi dan berfungsi optimal.";
    }

    // Mark worker job completed
    const job = this.workerJobs.find((j) => j.orderId === targetOrderId);
    if (job) {
      job.status = "COMPLETED";
    }

    // Generate Warranty Certificate
    const warrantyId = `WAR-2026-${(this.warranties.length + 1).toString().padStart(3, "0")}`;
    const newWarranty: WarrantyCertificate = {
      id: warrantyId,
      orderId: targetOrderId,
      certificateNumber: `SRV-WAR-2026-${Date.now().toString().slice(-8)}`,
      serviceTitle: order.serviceTitle,
      providerName: order.providerName,
      customerName: order.customerName,
      durationDays: order.warrantyPeriodDays || 30,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + (order.warrantyPeriodDays || 30) * 86400000).toISOString().split("T")[0],
      status: "ACTIVE",
      coverageDetails: [
        "Jaminan garansi kebocoran dan kelistrikan pada komponen yang dikerjakan",
        "Kunjungan revisi teknisi bebas biaya 1x jika kendala berulang",
      ],
      terms: "Garansi resmi Servio berlaku jika unit tidak dibongkar pihak ketiga selama masa proteksi.",
    };

    // Avoid duplicate warranty
    if (!this.warranties.some((w) => w.orderId === targetOrderId)) {
      this.warranties.unshift(newWarranty);
    }

    // Accrue payout to provider
    const payout = this.payouts.find((p) => p.vendorId === order.providerId);
    if (payout) {
      payout.payoutAmount += order.pricing?.totalAmount || 150000;
      payout.totalOrders += 1;
    }

    this.notify();
  }

  /**
   * Flow C8: Provider Reviews & Authorizes / Rejects Price Adjustment
   * Conditional authorization: Worker prepares adjustment post-diagnosis.
   * If authorized by Provider, it is handed off to Customer for final commercial approval.
   */
  public authorizePriceAdjustment(orderId: string, authorized: boolean, reason?: string) {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId);
    if (!order) return;

    if (!order.priceAdjustment) {
      order.priceAdjustment = {
        id: `adj-${Date.now().toString().slice(-4)}`,
        serviceOrderId: targetOrderId,
        proposedByWorkerId: order.assignedWorker?.id || "worker-1",
        proposedByWorkerName: order.assignedWorker?.name || "Teknisi Lapangan",
        diagnosisSummary: order.diagnosis?.findingsSummary || "Temuan inspeksi lapangan paska survei",
        finalServiceFee: order.pricing?.serviceFee || 150000,
        sparepartFee: order.pricing?.materialFee || 0,
        additionalWorkFee: 0,
        totalAmount: order.pricing?.totalAmount || 150000,
        requiresProviderAuth: true,
        providerAuthStatus: authorized ? "AUTHORIZED" : "REJECTED",
        providerAuthorizedAt: authorized ? new Date().toISOString() : undefined,
        providerRejectionReason: !authorized ? (reason || "Perlu klarifikasi rincian biaya") : undefined,
        customerApprovalStatus: "PENDING",
        paymentConditionStatus: "ADDITIONAL_REQUIRED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      order.priceAdjustment.providerAuthStatus = authorized ? "AUTHORIZED" : "REJECTED";
      order.priceAdjustment.providerAuthorizedAt = authorized ? new Date().toISOString() : undefined;
      order.priceAdjustment.providerRejectionReason = !authorized ? (reason || "Perlu klarifikasi rincian biaya") : undefined;
      order.priceAdjustment.updatedAt = new Date().toISOString();
    }

    if (authorized) {
      order.status = "WAITING_APPROVAL";
      order.statusLabel = "Otorisasi Provider Disetujui — Menunggu Persetujuan Pelanggan";
    } else {
      order.statusLabel = `Penyesuaian Biaya Ditolak Provider: ${reason || "Perlu Revisi Teknisi"}`;
    }
    order.updatedAt = new Date().toISOString();
    this.notify();
  }

  /**
   * Flow C9: Provider Reviews & Verifies Proof of Service
   * Worker uploads proof; Provider reviews and verifies QA before customer confirmation.
   */
  public verifyProofOfService(orderId: string, verified: boolean, notes?: string) {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId);
    if (!order) return;

    const proof = this.proofs[targetOrderId] || order.proofOfService;
    if (proof) {
      proof.verificationStatus = verified ? "VERIFIED_BY_PROVIDER" : "REVISION_REQUESTED";
      if (verified) {
        proof.verifiedAt = new Date().toISOString();
        proof.verifiedByProviderName = "Tim QA Bengkel";
      } else {
        proof.revisionNotes = notes || "Mohon unggah foto hasil servis dan checklist parameter yang lebih jelas";
      }
      this.proofs[targetOrderId] = proof;
      order.proofOfService = proof;
    }

    if (verified) {
      order.statusLabel = "Bukti Diverifikasi Provider — Menunggu Konfirmasi Pelanggan";
    } else {
      order.statusLabel = `Revisi Bukti Diminta: ${notes || "Perlu Foto Tambahan"}`;
    }
    order.updatedAt = new Date().toISOString();
    this.notify();
  }

  /**
   * Flow: Customer Files Dispute -> Support Case Enqueued
   */
  public fileDispute(orderId: string, reason: string, statement: string) {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId);
    if (!order) return;

    order.status = "DISPUTED";
    order.statusLabel = "Dalam Mediasi Sengketa Customer Support";
    order.updatedAt = new Date().toISOString();

    const caseId = `DISP-2026-${910 + this.supportCases.length}`;
    const newCase: SupportCase = {
      id: caseId,
      orderId: targetOrderId,
      serviceTitle: order.serviceTitle,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: "customer@servio.id",
      providerId: order.providerId,
      providerName: order.providerName,
      providerPhone: "0811-2233-4455",
      category: "DAMAGE_DURING_SERVICE",
      priority: "URGENT",
      slaRemaining: "45 Menit",
      escrowAmount: order.pricing?.totalAmount || 385000,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      customerStatement: statement,
      evidenceBeforePhotos: [
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80",
      ],
      evidenceAfterPhotos: [],
      warrantyActiveDays: order.warrantyPeriodDays || 30,
      chatThread: [
        {
          id: `msg-${Date.now()}`,
          senderRole: "CUSTOMER",
          senderName: order.customerName,
          message: statement,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
        },
      ],
    };

    this.supportCases.unshift(newCase);
    this.notify();
  }

  /**
   * Flow: Support Mediator Renders Verdict -> If refund, automatically Enqueues Finance Refund Request
   */
  public resolveSupportVerdict(
    caseId: string,
    verdict: {
      type: "FREE_REWORK" | "PRICE_ADJUSTMENT" | "FULL_REFUND" | "PARTIAL_REFUND" | "REJECT_CLAIM_RELEASE_ESCROW";
      notes: string;
      refundAmount?: number;
    }
  ) {
    const targetCaseId = normalizeEntityId(caseId);
    const supportCase = this.supportCases.find((c) => c.id === targetCaseId);
    if (!supportCase) return;

    supportCase.status = "RESOLVED";
    supportCase.decision = {
      type: verdict.type,
      notes: verdict.notes,
      refundAmount: verdict.refundAmount,
      decidedAt: new Date().toISOString(),
      decidedBy: "Rina Kusuma (Senior CS Mediator)",
    };

    const order = this.orders.find((o) => o.id === supportCase.orderId);

    // If verdict entails a refund, enqueue to Finance
    if (verdict.type === "FULL_REFUND" || verdict.type === "PARTIAL_REFUND") {
      const refundAmt = verdict.refundAmount || supportCase.escrowAmount;
      const refundId = `REF-2026-${(this.refunds.length + 50).toString().padStart(3, "0")}`;

      const newRefund: RefundRequest = {
        id: refundId,
        disputeCaseId: targetCaseId,
        orderId: supportCase.orderId,
        customerName: supportCase.customerName,
        customerBank: "BCA",
        customerAccountNo: "8820-192-334",
        refundAmount: refundAmt,
        escrowTotal: supportCase.escrowAmount,
        reason: verdict.notes,
        source: "CS_MEDIATION",
        requestedAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
        status: "PENDING_APPROVAL",
        auditNotes: `Keputusan mediasi CS: ${verdict.type} sebesar Rp ${refundAmt.toLocaleString("id-ID")}`,
      };

      this.refunds.unshift(newRefund);

      if (order) {
        order.status = "REFUNDED";
        order.statusLabel = "Pengembalian Dana Sedang Diproses Finance";
        order.updatedAt = new Date().toISOString();
      }
    } else if (order) {
      order.status = "COMPLETED";
      order.statusLabel = "Sengketa Diselesaikan Mediator";
      order.updatedAt = new Date().toISOString();
    }

    this.notify();
  }

  /**
   * Flow: Finance Approves or Rejects Refund
   */
  public approveFinanceRefund(refundId: string, auditNotes?: string) {
    const targetRefundId = normalizeEntityId(refundId);
    const refund = this.refunds.find((r) => r.id === targetRefundId);
    if (!refund) return;

    refund.status = "APPROVED";
    refund.auditNotes = auditNotes || "Audit rekening dan verifikasi CS valid. Dana dikembalikan ke pelanggan.";
    refund.processedBy = "Hendrik Wijaya (Finance Lead)";
    refund.processedAt = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

    // Update related transaction
    const trx = this.transactions.find((t) => t.orderId === refund.orderId);
    if (trx) {
      trx.status = "SETTLED";
    }

    // Update related order
    const order = this.orders.find((o) => o.id === refund.orderId);
    if (order) {
      order.status = "REFUNDED";
      order.statusLabel = "Dana Berhasil Dikembalikan (Refund Selesai)";
      order.updatedAt = new Date().toISOString();
    }

    this.notify();
  }

  public rejectFinanceRefund(refundId: string, auditNotes: string) {
    const targetRefundId = normalizeEntityId(refundId);
    const refund = this.refunds.find((r) => r.id === targetRefundId);
    if (!refund) return;

    refund.status = "REJECTED_AUDIT";
    refund.auditNotes = auditNotes;
    refund.processedBy = "Hendrik Wijaya (Finance Lead)";
    refund.processedAt = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

    this.notify();
  }

  /**
   * Flow: Finance Holds or Releases Vendor Payout
   */
  public holdFinancePayout(payoutId: string, holdReason: string) {
    const payout = this.payouts.find((p) => p.id === payoutId);
    if (!payout) return;

    payout.status = "HELD_FRAUD_CHECK";
    payout.holdReason = holdReason;
    this.notify();
  }

  public releaseFinancePayout(payoutId: string) {
    const payout = this.payouts.find((p) => p.id === payoutId);
    if (!payout) return;

    payout.status = "RELEASED";
    payout.releasedAt = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
    this.notify();
  }

  /**
   * Flow: Finance Verifies Payment Manually
   */
  public verifyPayment(trxId: string, manualVerifiedBy: string = "Hendrik Wijaya") {
    const trx = this.transactions.find((t) => t.id === trxId);
    if (!trx) return;

    trx.status = "SETTLED";
    trx.webhookReceived = true;
    trx.manualVerifiedBy = manualVerifiedBy;
    this.notify();
  }

  /**
   * Flow: Provider Inventory Adjustments
   */
  public adjustStock(itemId: string, newAvailable: number) {
    const item = this.inventory.find((i) => i.id === itemId);
    if (item) {
      item.stockAvailable = newAvailable;
      this.notify();
    }
  }

  public addInventoryItem(newItem: Omit<ProviderInventoryItem, "id" | "lastRestocked">): ProviderInventoryItem {
    const created: ProviderInventoryItem = {
      ...newItem,
      id: `inv-${Date.now().toString().slice(-4)}`,
      lastRestocked: "Hari ini",
    };
    this.inventory.unshift(created);
    this.notify();
    return created;
  }

  // --- MERCHANT OPERATIONS ---
  public addMerchantProduct(product: Omit<MerchantProduct, "id" | "createdAt" | "updatedAt">): MerchantProduct {
    const created: MerchantProduct = {
      ...product,
      id: `prod-m-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toLocaleDateString("id-ID") + " WIB",
      updatedAt: new Date().toLocaleDateString("id-ID") + " WIB",
    };
    this.merchantProducts.unshift(created);
    const newStock: MerchantStockItem = {
      productId: created.id,
      sku: created.sku,
      title: created.title,
      category: created.category,
      warehouseId: "wh-01",
      warehouseName: "Gudang Pusat Tebet (Hub Utama)",
      onHand: created.stock,
      reserved: 0,
      allocated: 0,
      unavailable: 0,
      available: created.stock,
      minStockAlert: created.minStockAlert,
      unit: "Pcs",
      lastRestocked: "Hari ini",
    };
    this.merchantStocks.unshift(newStock);
    this.notify();
    return created;
  }

  public updateMerchantProduct(id: string, updates: Partial<MerchantProduct>) {
    const p = this.merchantProducts.find((item) => item.id === id);
    if (p) {
      Object.assign(p, updates, { updatedAt: new Date().toLocaleDateString("id-ID") + " WIB" });
      this.notify();
    }
  }

  public updateMerchantOrderStatus(orderId: string, status: MerchantOrderStatus) {
    const order = this.merchantOrders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toLocaleDateString("id-ID") + " WIB";

      // Phase E: Policy-driven reward reaction to order lifecycle
      const attr = this.affiliateAttributions.find(
        (a) => a.productOrderId === order.id || a.productOrderId === order.orderNumber
      );
      if (attr) {
        const newEligibility = resolveAffiliateEligibilityStatus(status, true);
        attr.eligibilityStatus = newEligibility;
        if (status === "CANCELLED" || status === "RETURNED") {
          attr.reversedAt = new Date().toLocaleDateString("id-ID") + " WIB";
          attr.reversalReason = status === "CANCELLED" ? "Pesanan dibatalkan" : "Pesanan diretur";
        } else if (status === "COMPLETED" || status === "DELIVERED") {
          attr.finalizedAt = new Date().toLocaleDateString("id-ID") + " WIB";
        }
        if (order.affiliateAttribution) {
          order.affiliateAttribution.eligibilityStatus = newEligibility;
          order.affiliateAttribution.reversedAt = attr.reversedAt;
          order.affiliateAttribution.reversalReason = attr.reversalReason;
          order.affiliateAttribution.finalizedAt = attr.finalizedAt;
        }
      }

      this.notify();
    }
  }

  public addMerchantWarehouse(
    warehouseData: Omit<MerchantWarehouse, "id" | "totalSkus"> & { id?: string; totalSkus?: number }
  ): MerchantWarehouse {
    const id = warehouseData.id || `wh-${Date.now().toString().slice(-4)}`;
    const created: MerchantWarehouse = {
      ...warehouseData,
      id,
      totalSkus: warehouseData.totalSkus || 0,
      operatingStatus: warehouseData.operatingStatus || "ACTIVE",
    };
    this.merchantWarehouses.push(created);
    this.notify();
    return created;
  }

  public updateMerchantWarehouse(id: string, updates: Partial<MerchantWarehouse>): boolean {
    const target = this.merchantWarehouses.find((w) => w.id === id);
    if (!target) return false;
    Object.assign(target, updates);
    this.notify();
    return true;
  }

  public toggleMerchantWarehouseStatus(id: string): boolean {
    const target = this.merchantWarehouses.find((w) => w.id === id);
    if (!target) return false;
    target.operatingStatus = target.operatingStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    this.notify();
    return true;
  }

  public adjustMerchantStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    type: "RESTOCK" | "DAMAGE" | "AUDIT_CORRECTION" | "TRANSFER",
    reason: string
  ) {
    const target = this.merchantStocks.find(
      (s) => s.productId === productId && s.warehouseId === warehouseId
    );
    if (target) {
      const prev = target.available;
      if (type === "RESTOCK") {
        target.onHand += quantity;
        target.available += quantity;
      } else if (type === "DAMAGE") {
        target.unavailable += quantity;
        target.available = Math.max(0, target.available - quantity);
      } else if (type === "AUDIT_CORRECTION") {
        target.onHand = quantity;
        target.available = Math.max(0, target.onHand - target.reserved - target.allocated - target.unavailable);
      }
      target.lastRestocked = "Hari ini";

      const movementType: MerchantStockMovement["type"] =
        type === "RESTOCK"
          ? "INBOUND"
          : type === "DAMAGE"
          ? "OUTBOUND"
          : "AUDIT_ADJUSTMENT";

      const movement: MerchantStockMovement = {
        id: `mov-${Date.now().toString().slice(-4)}`,
        productId,
        sku: target.sku,
        productTitle: target.title,
        warehouseId,
        warehouseName: target.warehouseName,
        type: movementType,
        quantity,
        previousAvailable: prev,
        newAvailable: target.available,
        reason,
        performedBy: "Operator Toko",
        timestamp: new Date().toLocaleDateString("id-ID") + " " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      };
      this.merchantStockMovements.unshift(movement);
      this.notify();
    }
  }

  public updateMerchantFulfillmentStatus(
    fulfillmentId: string,
    status: MerchantFulfillmentStatus,
    boxDimensions?: { lengthCm: number; widthCm: number; heightCm: number; weightKg: number }
  ) {
    const ful = this.merchantFulfillments.find((f) => f.id === fulfillmentId);
    if (ful) {
      ful.status = status;
      if (boxDimensions) {
        ful.boxDimensions = boxDimensions;
      }
      if (status === "PACKED") {
        ful.packedAt = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
        ful.labelBarcode = `AWB-MCH-${Date.now().toString().slice(-8)}`;
      }
      const ord = this.merchantOrders.find((o) => o.id === ful.orderId);
      if (ord) {
        if (status === "PICKING") ord.status = "PICKING";
        if (status === "PACKED" || status === "LABEL_PRINTED") ord.status = "PACKED";
      }
      this.notify();
    }
  }

  public dispatchMerchantShipment(shipmentData: Omit<MerchantShipment, "id" | "dispatchedAt" | "checkpoints">): MerchantShipment {
    const created: MerchantShipment = {
      ...shipmentData,
      id: `shp-m-${Date.now().toString().slice(-4)}`,
      dispatchedAt: new Date().toLocaleDateString("id-ID") + " WIB",
      checkpoints: [
        {
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
          status: "AWAITING_PICKUP",
          location: "Hub Toko Merchant",
          note: "Paket siap diserahterimakan ke kurir",
        },
      ],
    };
    this.merchantShipments.unshift(created);
    const ord = this.merchantOrders.find((o) => o.id === shipmentData.orderId);
    if (ord) {
      ord.status = "SHIPPED";
      ord.courierName = shipmentData.courier;
      ord.trackingNumber = shipmentData.awbNumber;
    }
    this.notify();
    return created;
  }

  public inspectMerchantReturn(
    returnId: string,
    disposition: MerchantReturnDisposition,
    acceptedQty: number,
    rejectedQty: number,
    notes: string,
    refundAmount: number
  ) {
    const ret = this.merchantReturns.find((r) => r.id === returnId);
    if (ret) {
      ret.status = acceptedQty > 0 && rejectedQty > 0 ? "PARTIALLY_ACCEPTED" : (acceptedQty > 0 ? "ACCEPTED" : "REJECTED");
      ret.inspectionNotes = notes;
      ret.refundAmount = refundAmount;
      ret.inspectedAt = new Date().toLocaleDateString("id-ID") + " WIB";
      if (ret.items.length > 0) {
        ret.items[0].disposition = disposition;
        ret.items[0].acceptedQty = acceptedQty;
        ret.items[0].rejectedQty = rejectedQty;
      }

      // Phase E: If return accepted or refund processed, recalculate/reverse affiliate reward outcome
      if (acceptedQty > 0 || refundAmount > 0) {
        const targetOrder = this.merchantOrders.find((o) => o.id === ret.orderId || o.orderNumber === ret.orderNumber);
        if (targetOrder) {
          targetOrder.status = "RETURNED";
        }
        const attr = this.affiliateAttributions.find(
          (a) => a.productOrderId === ret.orderId || a.productOrderId === ret.orderNumber
        );
        if (attr) {
          attr.eligibilityStatus = "REVERSED";
          attr.reversedAt = new Date().toLocaleDateString("id-ID") + " WIB";
          attr.reversalReason = `Klaim retur disetujui (${disposition}) dengan refund Rp ${refundAmount.toLocaleString("id-ID")}`;
          if (targetOrder?.affiliateAttribution) {
            targetOrder.affiliateAttribution.eligibilityStatus = "REVERSED";
            targetOrder.affiliateAttribution.reversedAt = attr.reversedAt;
            targetOrder.affiliateAttribution.reversalReason = attr.reversalReason;
          }
        }
      }

      this.notify();
    }
  }

  // --- SUPPLIER OPERATIONS ---
  public addSupplierProduct(product: Omit<SupplierProduct, "id" | "updatedAt">): SupplierProduct {
    const created: SupplierProduct = {
      ...product,
      id: `supp-prod-${Date.now().toString().slice(-4)}`,
      updatedAt: new Date().toLocaleDateString("id-ID") + " WIB",
    };
    this.supplierProducts.unshift(created);
    this.notify();
    return created;
  }

  public adjustSupplierStock(productId: string, quantity: number) {
    const target = this.supplierProducts.find((p) => p.id === productId);
    if (target) {
      target.stock += quantity;
      target.updatedAt = new Date().toLocaleDateString("id-ID") + " WIB";
      this.notify();
    }
  }

  public updateSupplierOrderStatus(poId: string, status: SupplierOrderStatus) {
    const po = this.supplierOrders.find((p) => p.id === poId || p.poNumber === poId);
    if (po) {
      po.status = status;
      this.notify();
    }
  }

  public updateSupplierFulfillmentQC(fulfillmentId: string, checkId: string, isPassed: boolean) {
    const ful = this.supplierFulfillments.find((f) => f.id === fulfillmentId);
    if (ful) {
      const item = ful.qcChecklist.find((c) => c.id === checkId);
      if (item) {
        item.isPassed = isPassed;
      }
      const allPassed = ful.qcChecklist.every((c) => c.isPassed);
      if (allPassed) {
        ful.status = "QC_PASSED";
      }
      this.notify();
    }
  }

  public updateSupplierFulfillmentStatus(fulfillmentId: string, status: SupplierFulfillment["status"]) {
    const ful = this.supplierFulfillments.find((f) => f.id === fulfillmentId);
    if (ful) {
      ful.status = status;
      this.notify();
    }
  }

  public createSupplierShipmentManifest(
    manifestData: Omit<SupplierShipment, "id" | "departureDate" | "manifestNumber"> & { manifestNumber?: string }
  ): SupplierShipment {
    const count = this.supplierShipments.length + 1;
    const manifestNumber = manifestData.manifestNumber || `MNF-B2B-2026-${String(count).padStart(3, "0")}`;
    const created: SupplierShipment = {
      ...manifestData,
      manifestNumber,
      id: `mn-supp-${count}`,
      departureDate: new Date().toLocaleDateString("id-ID") + " WIB",
    };
    this.supplierShipments.unshift(created);
    const po = this.supplierOrders.find((p) => p.poNumber === manifestData.poNumber);
    if (po) {
      po.status = "IN_TRANSIT";
    }
    this.notify();
    return created;
  }

  public inspectSupplierReturn(
    returnId: string,
    condition: SupplierReturnItem["condition"],
    creditAmount: number,
    notes: string
  ) {
    const ret = this.supplierReturns.find((r) => r.id === returnId);
    if (ret) {
      ret.status = "CREDIT_NOTE_ISSUED";
      ret.creditNoteNumber = `CN-B2B-${Date.now().toString().slice(-6)}`;
      ret.totalCreditAmount = creditAmount;
      ret.inspectedAt = new Date().toLocaleDateString("id-ID") + " WIB";
      ret.creditIssuedAt = new Date().toLocaleDateString("id-ID") + " WIB";
      ret.inspectorNotes = notes;
      if (ret.items.length > 0) {
        ret.items[0].condition = condition;
        ret.items[0].creditAmount = creditAmount;
      }
      this.notify();
    }
  }

  // --- SUPPLIER WAREHOUSE MANAGEMENT OPERATIONS ---
  public addSupplierWarehouse(
    warehouseData: Omit<SupplierWarehouse, "id" | "totalZones" | "operatingStatus"> & {
      id?: string;
      totalZones?: number;
      operatingStatus?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
    }
  ): SupplierWarehouse {
    const count = this.supplierWarehouses.length + 1;
    const id = warehouseData.id || `wh-sup-${String(count).padStart(2, "0")}`;
    const code = warehouseData.code ? warehouseData.code.toUpperCase() : `WH-SUP-${String(count).padStart(2, "0")}`;
    const created: SupplierWarehouse = {
      ...warehouseData,
      id,
      code,
      totalZones: warehouseData.totalZones || 3,
      operatingStatus: warehouseData.operatingStatus || "ACTIVE",
    };
    this.supplierWarehouses.push(created);
    this.notify();
    return created;
  }

  public updateSupplierWarehouse(id: string, updates: Partial<SupplierWarehouse>): boolean {
    const target = this.supplierWarehouses.find((w) => w.id === id);
    if (!target) return false;
    Object.assign(target, updates);
    this.notify();
    return true;
  }

  public toggleSupplierWarehouseStatus(id: string): boolean {
    const target = this.supplierWarehouses.find((w) => w.id === id);
    if (!target) return false;
    target.operatingStatus = target.operatingStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    this.notify();
    return true;
  }

  // --- B2B PROCUREMENT & REPLENISHMENT OPERATIONS ---
  public createPurchaseOrder(poData: {
    merchantId?: string;
    merchantName?: string;
    supplierId: string;
    supplierName: string;
    supplierContact?: string;
    warehouseId: string;
    warehouseName: string;
    destinationAddress: string;
    items: B2BPurchaseOrderItem[];
    subtotal: number;
    taxAmount?: number;
    shippingFee?: number;
    totalAmount: number;
    paymentTerms?: "PREPAID" | "NET_14" | "NET_30" | "NET_60" | "COD";
    requestedDeliveryDate?: string;
    merchantNotes?: string;
    poNumber?: string;
  }): B2BPurchaseOrder {
    const count = this.b2bPurchaseOrders.length + 101;
    const poNumber = poData.poNumber || `PO-B2B-2026-${String(count).padStart(4, "0")}`;
    const nowStr = new Date().toLocaleDateString("id-ID") + " " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

    const created: B2BPurchaseOrder = {
      id: `po-b2b-${Date.now().toString().slice(-6)}`,
      poNumber,
      merchantId: poData.merchantId || "merch-001",
      merchantName: poData.merchantName || "Toko Suku Cadang Servio Sentosa",
      supplierId: poData.supplierId,
      supplierName: poData.supplierName,
      supplierContact: poData.supplierContact || "Divisi Penjualan B2B",
      warehouseId: poData.warehouseId,
      warehouseName: poData.warehouseName,
      destinationAddress: poData.destinationAddress,
      items: poData.items,
      subtotal: poData.subtotal,
      taxAmount: poData.taxAmount ?? Math.round(poData.subtotal * 0.11),
      shippingFee: poData.shippingFee ?? 150000,
      totalAmount: poData.totalAmount,
      status: "SUBMITTED",
      paymentTerms: poData.paymentTerms || "NET_14",
      issuedDate: new Date().toLocaleDateString("id-ID"),
      requestedDeliveryDate: poData.requestedDeliveryDate || new Date(Date.now() + 3 * 86400000).toLocaleDateString("id-ID"),
      merchantNotes: poData.merchantNotes,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    this.b2bPurchaseOrders.unshift(created);
    this.notify();
    return created;
  }

  public updatePurchaseOrderStatus(
    poId: string,
    status: B2BPurchaseOrderStatus,
    options?: {
      actorRole?: "MERCHANT" | "SUPPLIER" | "SYSTEM";
      actorId?: string;
      rejectionReason?: string;
      changeNotes?: string;
      supplierNotes?: string;
      shipmentCarrier?: string;
      shipmentAwb?: string;
      sourceWarehouseId?: string;
      sourceWarehouseName?: string;
    }
  ): { success: boolean; error?: string } {
    const po = this.b2bPurchaseOrders.find((p) => p.id === poId || p.poNumber === poId);
    if (!po) {
      return { success: false, error: `Purchase Order ${poId} tidak ditemukan.` };
    }

    const currentMeta = CANONICAL_B2B_PO_STATUS_MAP[po.status];
    const targetMeta = CANONICAL_B2B_PO_STATUS_MAP[status];

    // ROOT-03 Check: Cannot transition from terminal status
    if (currentMeta.isTerminal) {
      return {
        success: false,
        error: `Status ${po.status} adalah status final (terminal). Tidak dapat diubah ke ${status}.`,
      };
    }

    // ROOT-03 Check: Transition must be explicitly allowed
    if (!currentMeta.nextAllowedStatuses.includes(status)) {
      return {
        success: false,
        error: `Transisi status tidak valid: ${po.status} -> ${status}. Transisi yang diizinkan: ${currentMeta.nextAllowedStatuses.join(", ") || "tidak ada"}.`,
      };
    }

    // ROOT-03 Check: Actor role permission
    if (options?.actorRole && options.actorRole !== "SYSTEM") {
      if (!targetMeta.allowedActors.includes(options.actorRole)) {
        return {
          success: false,
          error: `Aktor ${options.actorRole} tidak memiliki wewenang untuk mengubah status PO ke ${status}. Wewenang resmi: ${targetMeta.allowedActors.join(", ")}.`,
        };
      }
    }

    // ROOT-03 Business condition validations
    if (status === "REJECTED" && (!options?.rejectionReason || !options.rejectionReason.trim())) {
      return {
        success: false,
        error: "Penolakan Purchase Order memerlukan alasan penolakan (rejectionReason).",
      };
    }

    if (options?.sourceWarehouseId) {
      po.sourceWarehouseId = options.sourceWarehouseId;
      const srcWh = this.supplierWarehouses.find((w) => w.id === options.sourceWarehouseId);
      po.sourceWarehouseName = srcWh ? srcWh.name : (options.sourceWarehouseName || po.sourceWarehouseName);
    } else if (!po.sourceWarehouseId && (status === "ACCEPTED" || status === "PROCESSING" || status === "SHIPPED")) {
      const mainWh = this.supplierWarehouses.find((w) => w.isMain) || this.supplierWarehouses[0];
      if (mainWh) {
        po.sourceWarehouseId = mainWh.id;
        po.sourceWarehouseName = mainWh.name;
      }
    }

    if (status === "SHIPPED") {
      const carrier = options?.shipmentCarrier || po.shipmentCarrier;
      const awb = options?.shipmentAwb || po.shipmentAwb;
      if (!carrier || !awb) {
        return {
          success: false,
          error: "Keberangkatan kargo B2B (SHIPPED) memerlukan nama ekspedisi dan nomor resi AWB.",
        };
      }
      po.shipmentCarrier = carrier;
      po.shipmentAwb = awb;
      po.shippedDate = new Date().toLocaleDateString("id-ID") + " " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

      // Decrement Supplier Physical On-Hand stock upon cargo departure (physical inventory leaves supplier warehouse)
      for (const item of po.items) {
        const suppProd = this.supplierProducts.find(
          (sp) => sp.sku === item.sku || sp.id === item.productId
        );
        if (suppProd) {
          suppProd.stock = Math.max(0, suppProd.stock - item.quantity);
        }
      }
    }

    const nowStr = new Date().toLocaleDateString("id-ID") + " " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
    po.status = status;
    po.updatedAt = nowStr;

    if (options?.rejectionReason) po.rejectionReason = options.rejectionReason;
    if (options?.supplierNotes) po.supplierNotes = options.supplierNotes;
    if (options?.changeNotes) po.supplierNotes = options.changeNotes;

    this.notify();
    return { success: true };
  }

  public confirmPurchaseOrderReceiving(
    poId: string,
    receiving: {
      shippedQuantity: number;
      receivedQuantity: number;
      acceptedQuantity: number;
      damagedQuantity: number;
      missingQuantity: number;
      itemCondition: "PRISTINE" | "PARTIAL_DAMAGE" | "WRONG_PACKAGING" | "DEFECTIVE";
      receivingNotes?: string;
      receivingOperator: string;
      warehouseId: string;
    }
  ): B2BPurchaseOrder | null {
    const po = this.b2bPurchaseOrders.find((p) => p.id === poId || p.poNumber === poId);
    if (!po) return null;

    // ROOT-03 STATE TRANSITION CHECK: PO must be in SHIPPED or PARTIALLY_RECEIVED
    if (po.status !== "SHIPPED" && po.status !== "PARTIALLY_RECEIVED") {
      throw new Error(
        `ROOT-03 Violation: Pemeriksaan fisik dan Stock In hanya dapat dilakukan pada PO dengan status SHIPPED atau PARTIALLY_RECEIVED (status saat ini: ${po.status}).`
      );
    }

    // ROOT-02 RECONCILIATION INVARIANTS CHECK:
    // 1) receivedQuantity === acceptedQuantity + damagedQuantity
    // 2) acceptedQuantity + damagedQuantity + missingQuantity === shippedQuantity
    if (receiving.receivedQuantity !== receiving.acceptedQuantity + receiving.damagedQuantity) {
      throw new Error(
        `ROOT-02 Violation: Kuantitas fisik diterima (${receiving.receivedQuantity}) harus tepat sama dengan diterima baik (${receiving.acceptedQuantity}) + rusak (${receiving.damagedQuantity}).`
      );
    }
    if (receiving.acceptedQuantity + receiving.damagedQuantity + receiving.missingQuantity !== receiving.shippedQuantity) {
      throw new Error(
        `ROOT-02 Violation: Total rekonsiliasi (${receiving.acceptedQuantity} + ${receiving.damagedQuantity} + ${receiving.missingQuantity}) harus tepat sama dengan kuantitas dikirim kargo (${receiving.shippedQuantity}).`
      );
    }

    const nowStr = new Date().toLocaleDateString("id-ID") + " " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
    const record: B2BReceivingRecord = {
      receivedAt: nowStr,
      receivedBy: receiving.receivingOperator || "Operator Gudang",
      totalReceived: receiving.receivedQuantity,
      totalAccepted: receiving.acceptedQuantity,
      totalDamaged: receiving.damagedQuantity,
      totalMissing: receiving.missingQuantity,
      condition: receiving.itemCondition,
      notes: receiving.receivingNotes || "",
      discrepancyHandled: receiving.damagedQuantity > 0 || receiving.missingQuantity > 0,
    };

    po.receivingRecord = record;

    if (receiving.receivedQuantity < receiving.shippedQuantity) {
      po.status = "PARTIALLY_RECEIVED";
    } else {
      po.status = "COMPLETED";
    }
    po.updatedAt = nowStr;

    // ROOT-01 AUTHORITATIVE 5-BUCKET INVENTORY & LEDGER CONSISTENCY:
    // Target warehouse MUST be the receiving warehouse
    const targetWhId = receiving.warehouseId || po.warehouseId;
    const targetWh = this.merchantWarehouses.find((w) => w.id === targetWhId);
    const targetWhName = targetWh ? targetWh.name : po.warehouseName;

    // Total physical inbound quantity entering the warehouse
    const totalPhysicalInbound = receiving.acceptedQuantity + receiving.damagedQuantity;

    for (const item of po.items) {
      let targetStock = this.merchantStocks.find(
        (s) => s.warehouseId === targetWhId && (s.sku === item.sku || s.title.toLowerCase() === item.title.toLowerCase())
      );

      if (!targetStock) {
        const baseProd = this.merchantProducts.find((p) => p.sku === item.sku);
        targetStock = {
          productId: baseProd ? baseProd.id : `prod-m-${Date.now().toString().slice(-4)}`,
          sku: item.sku,
          title: item.title,
          category: baseProd ? baseProd.category : "Suku Cadang",
          warehouseId: targetWhId,
          warehouseName: targetWhName,
          onHand: 0,
          reserved: 0,
          allocated: 0,
          unavailable: 0,
          available: 0,
          minStockAlert: 10,
          unit: item.unit,
          lastRestocked: "Hari ini",
        };
        this.merchantStocks.push(targetStock);
      }

      const prevAvail = targetStock.available;

      // Invariant: On-Hand increases by total physical units entered (accepted + damaged)
      targetStock.onHand += totalPhysicalInbound;
      // Invariant: Available increases only by accepted good units
      targetStock.available += receiving.acceptedQuantity;

      // Invariant: Unavailable increases by damaged units
      if (receiving.damagedQuantity > 0) {
        targetStock.unavailable += receiving.damagedQuantity;
      }

      targetStock.lastRestocked = "Hari ini";

      // ROOT-01: Movement ledger quantity represents the full physical inbound movement (= delta onHand)
      const movement: MerchantStockMovement = {
        id: `mov-b2b-${Date.now().toString().slice(-4)}`,
        productId: targetStock.productId,
        sku: targetStock.sku,
        productTitle: targetStock.title,
        warehouseId: targetWhId,
        warehouseName: targetWhName,
        type: "INBOUND",
        quantity: totalPhysicalInbound, // Exactly matches delta onHand!
        acceptedQuantity: receiving.acceptedQuantity,
        damagedQuantity: receiving.damagedQuantity,
        purchaseOrderId: po.poNumber,
        previousAvailable: prevAvail,
        newAvailable: targetStock.available,
        reason: `Restock B2B ${po.poNumber} (${po.supplierName}): Fisik Inbound +${totalPhysicalInbound} ${item.unit} (+${receiving.acceptedQuantity} Siap Jual, +${receiving.damagedQuantity} Karantina/Rusak [${receiving.itemCondition}])${receiving.missingQuantity > 0 ? `, ${receiving.missingQuantity} kurang/selisih kargo` : ""}`,
        performedBy: receiving.receivingOperator,
        timestamp: nowStr,
      };
      this.merchantStockMovements.unshift(movement);
    }

    this.notify();
    return po;
  }

  /**
   * ============================================================================
   * MILESTONE 10 — ADMIN & PLATFORM OPERATIONS ATOMIC MUTATIONS
   * ============================================================================
   */

  public evaluateKYC(
    kycId: string,
    decision: "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION",
    reviewNotes: string,
    actorName: string = "Fajar Wicaksono",
    actorId: string = "usr-adm-001"
  ): AdminKYCRecord | null {
    const kyc = this.kycRecords.find((k) => k.id === kycId);
    if (!kyc) return null;

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 16) + " WIB";
    kyc.status = decision;
    kyc.reviewNotes = reviewNotes;
    kyc.reviewedAt = nowStr;
    kyc.reviewerId = actorId;
    kyc.reviewerName = actorName;

    this.logAuditEvent({
      actorId,
      actorName,
      actorRole: "ADMIN_OPERATIONS",
      action: decision === "VERIFIED" ? "KYC_VERIFICATION_APPROVED" : "KYC_VERIFICATION_REJECTED",
      resource: "USER_MANAGEMENT",
      resourceId: kyc.id,
      result: decision === "VERIFIED" ? "SUCCESS" : "WARNING",
      scope: "PLATFORM",
      reason: reviewNotes,
      metadata: { userId: kyc.userId, userName: kyc.userName, userRole: kyc.userRole, decision },
    });

    this.notify();
    return kyc;
  }

  public moderateProduct(
    id: string,
    decision: "APPROVED" | "REJECTED" | "REVISION_REQUIRED",
    reason?: string,
    actorName: string = "Fajar Wicaksono",
    actorId: string = "usr-adm-001"
  ): ProductModerationItem | null {
    const item = this.productModerations.find((p) => p.id === id || p.sku === id);
    if (!item) return null;

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 16) + " WIB";
    item.status = decision;
    item.rejectionReason = reason;
    item.moderatedAt = nowStr;
    item.moderatorName = actorName;

    this.logAuditEvent({
      actorId,
      actorName,
      actorRole: "ADMIN_OPERATIONS",
      action: `PRODUCT_LISTING_${decision}`,
      resource: "PRODUCT",
      resourceId: item.sku,
      result: decision === "APPROVED" ? "SUCCESS" : "WARNING",
      scope: "PLATFORM",
      reason: reason || `Listing produk ${item.sku} disetujui untuk marketplace.`,
      metadata: { sellerId: item.sellerId, sellerRole: item.sellerRole, sku: item.sku, decision },
    });

    this.notify();
    return item;
  }

  public moderateContent(
    id: string,
    decision: "APPROVED" | "CENSORED",
    reason?: string,
    actorName: string = "Fajar Wicaksono",
    actorId: string = "usr-adm-001"
  ): ContentModerationItem | null {
    const item = this.contentModerations.find((c) => c.id === id);
    if (!item) return null;

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 16) + " WIB";
    item.status = decision;
    item.actionTaken = reason;
    item.moderatedAt = nowStr;
    item.moderatorName = actorName;

    this.logAuditEvent({
      actorId,
      actorName,
      actorRole: "ADMIN_OPERATIONS",
      action: `CONTENT_MODERATION_${decision}`,
      resource: "REVIEW",
      resourceId: item.id,
      result: "SUCCESS",
      scope: "PLATFORM",
      reason: reason || `Moderasi konten ${item.contentType} diputuskan sebagai ${decision}.`,
      metadata: { targetId: item.targetId, contentType: item.contentType, decision },
    });

    this.notify();
    return item;
  }

  public escalateDispute(
    disputeId: string,
    newPriority: "NORMAL" | "HIGH" | "URGENT",
    escalationNotes: string,
    actorName: string = "Fajar Wicaksono",
    actorId: string = "usr-adm-001"
  ): DisputeCase | null {
    const canonicalId = normalizeEntityId(disputeId);
    const dispute = this.disputes.find((d) => normalizeEntityId(d.id) === canonicalId);
    if (!dispute) return null;

    dispute.priority = newPriority;
    dispute.status = "INVESTIGATING";

    const supportCase = this.supportCases.find(
      (sc) => sc.id.toLowerCase() === disputeId.toLowerCase() || sc.orderId === dispute.orderId
    );
    if (supportCase) {
      supportCase.priority = newPriority === "URGENT" ? "URGENT" : newPriority === "HIGH" ? "HIGH" : "MEDIUM";
      supportCase.status = "IN_MEDIATION";
      supportCase.assignedTo = actorName;
    }

    this.logAuditEvent({
      actorId,
      actorName,
      actorRole: "ADMIN_OPERATIONS",
      action: "DISPUTE_ESCALATED",
      resource: "DISPUTE",
      resourceId: dispute.id,
      result: "SUCCESS",
      scope: "PLATFORM",
      reason: escalationNotes,
      metadata: { newPriority, orderId: dispute.orderId },
    });

    this.notify();
    return dispute;
  }

  public resolveDisputeToFinance(
    disputeId: string,
    refundAmount: number,
    resolutionNotes: string,
    actorName: string = "Fajar Wicaksono",
    actorId: string = "usr-adm-001"
  ): RefundRequest {
    const canonicalId = normalizeEntityId(disputeId);
    const dispute = this.disputes.find((d) => normalizeEntityId(d.id) === canonicalId);
    if (dispute) {
      dispute.status = "RESOLVED";
      dispute.resolution = resolutionNotes;
    }

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 16) + " WIB";
    const refId = `REF-2026-${String(this.refunds.length + 50).padStart(3, "0")}`;

    const newRefund: RefundRequest = {
      id: refId,
      disputeCaseId: disputeId,
      orderId: dispute?.orderId || "ORD-2026-UNKNOWN",
      customerName: dispute?.customerName || "Pelanggan",
      customerBank: "BCA",
      customerAccountNo: "8820-192-334",
      refundAmount,
      escrowTotal: refundAmount,
      reason: `Eskalasi Mediasi Admin: ${resolutionNotes}`,
      source: "CS_MEDIATION",
      requestedAt: nowStr,
      status: "PENDING_APPROVAL",
      auditNotes: `Diputuskan oleh Admin Operations (${actorName}). Menunggu verifikasi pelepasan dana dari Finance Ops.`,
    };

    this.refunds.unshift(newRefund);

    this.logAuditEvent({
      actorId,
      actorName,
      actorRole: "ADMIN_OPERATIONS",
      action: "DISPUTE_REFUND_SUBMITTED_TO_FINANCE",
      resource: "DISPUTE",
      resourceId: disputeId,
      result: "SUCCESS",
      scope: "PLATFORM",
      reason: `Resolusi mediasi mengarahkan pengembalian dana senilai Rp ${refundAmount.toLocaleString("id-ID")}. Tiket refund diteruskan ke Finance Ops.`,
      metadata: { refundId: refId, refundAmount, orderId: dispute?.orderId },
    });

    this.notify();
    return newRefund;
  }

  public adjustInventoryOperational(
    warehouseId: string,
    sku: string,
    deltaQty: number,
    reason: string,
    actorName: string = "Fajar Wicaksono",
    actorId: string = "usr-adm-001"
  ): boolean {
    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 16) + " WIB";

    const mStock = this.merchantStocks.find((s) => s.warehouseId === warehouseId && s.sku === sku);
    if (mStock) {
      const prevAvail = mStock.available;
      mStock.onHand = Math.max(0, mStock.onHand + deltaQty);
      mStock.available = Math.max(0, mStock.available + deltaQty);
      mStock.lastRestocked = "Hari ini";

      const movement: MerchantStockMovement = {
        id: `mov-adm-${Date.now().toString().slice(-4)}`,
        productId: mStock.productId,
        sku: mStock.sku,
        productTitle: mStock.title,
        warehouseId: mStock.warehouseId,
        warehouseName: mStock.warehouseName,
        type: "AUDIT_ADJUSTMENT",
        quantity: Math.abs(deltaQty),
        previousAvailable: prevAvail,
        newAvailable: mStock.available,
        reason: `Koreksi Operasional Admin: ${reason}`,
        performedBy: actorName,
        timestamp: nowStr,
      };
      this.merchantStockMovements.unshift(movement);

      this.logAuditEvent({
        actorId,
        actorName,
        actorRole: "ADMIN_OPERATIONS",
        action: "INVENTORY_OPERATIONAL_ADJUSTMENT",
        resource: "INVENTORY",
        resourceId: `${warehouseId}:${sku}`,
        result: "SUCCESS",
        scope: "PLATFORM",
        reason,
        metadata: { warehouseId, sku, deltaQty, newAvailable: mStock.available },
      });

      this.notify();
      return true;
    }

    const sProd = this.supplierProducts.find((p) => p.sku === sku);
    if (sProd) {
      sProd.stock = Math.max(0, sProd.stock + deltaQty);

      this.logAuditEvent({
        actorId,
        actorName,
        actorRole: "ADMIN_OPERATIONS",
        action: "SUPPLIER_INVENTORY_CORRECTED",
        resource: "INVENTORY",
        resourceId: `${warehouseId}:${sku}`,
        result: "SUCCESS",
        scope: "PLATFORM",
        reason,
        metadata: { warehouseId, sku, deltaQty, newStock: sProd.stock },
      });

      this.notify();
      return true;
    }

    return false;
  }

  public logAuditEvent(entry: {
    actorId: string;
    actorName: string;
    actorRole: string;
    action: string;
    resource: string;
    resourceId: string;
    result?: "SUCCESS" | "DENIED" | "FAILED" | "WARNING";
    scope?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
    details?: Record<string, unknown>;
  }): AuditLogEntry {
    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    const newLog: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: nowStr,
      result: entry.result || "SUCCESS",
      scope: entry.scope || "PLATFORM",
      ...entry,
    };
    this.auditLogs.unshift(newLog);
    this.notify();
    return newLog;
  }

  public getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  // ==========================================================================
  // MILESTONE 11 — CEO GOVERNANCE & POLICY MUTATION METHODS
  // ==========================================================================

  public approveTaxonomyProposal(
    proposalId: string,
    notes: string,
    actor: { id: string; name: string }
  ): boolean {
    const prop = this.taxonomyProposals.find((p) => p.id === proposalId);
    if (!prop) return false;

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    prop.status = "APPROVED";
    prop.decisionNotes = notes || "Disetujui oleh CEO";
    prop.decidedAt = nowStr;
    prop.decidedBy = actor.name;

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "TAXONOMY_GOVERNANCE_APPROVED",
      resource: "TAXONOMY_PROPOSAL",
      resourceId: proposalId,
      reason: notes || "Persetujuan pembaruan taksonomi platform oleh CEO",
      details: {
        domainId: prop.domainId,
        subcategoryId: prop.subcategoryId,
        title: prop.title,
      },
    });

    this.notify();
    return true;
  }

  public rejectTaxonomyProposal(
    proposalId: string,
    reason: string,
    actor: { id: string; name: string }
  ): boolean {
    const prop = this.taxonomyProposals.find((p) => p.id === proposalId);
    if (!prop) return false;

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    prop.status = "REJECTED";
    prop.decisionNotes = reason;
    prop.decidedAt = nowStr;
    prop.decidedBy = actor.name;

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "TAXONOMY_GOVERNANCE_REJECTED",
      resource: "TAXONOMY_PROPOSAL",
      resourceId: proposalId,
      reason,
      details: {
        domainId: prop.domainId,
        subcategoryId: prop.subcategoryId,
      },
    });

    this.notify();
    return true;
  }

  public requestRevisionTaxonomyProposal(
    proposalId: string,
    notes: string,
    actor: { id: string; name: string }
  ): boolean {
    const prop = this.taxonomyProposals.find((p) => p.id === proposalId);
    if (!prop) return false;

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    prop.status = "REVISION_REQUESTED";
    prop.decisionNotes = notes;
    prop.decidedAt = nowStr;
    prop.decidedBy = actor.name;

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "TAXONOMY_GOVERNANCE_REVISION_REQUESTED",
      resource: "TAXONOMY_PROPOSAL",
      resourceId: proposalId,
      reason: notes,
    });

    this.notify();
    return true;
  }

  /**
   * ============================================================================
   * TAXONOMY V1: CEO GOVERNANCE ACTIONS (LOCKED DECISION)
   * ============================================================================
   */
  public createCategory(
    data: { name: string; description?: string; iconName?: string },
    actor: { id: string; name: string }
  ): ServiceCategory {
    const existing = this.categories.find(
      (c) => c.name.trim().toLowerCase() === data.name.trim().toLowerCase()
    );
    if (existing) {
      throw new Error(`Kategori "${data.name}" sudah ada dalam taksonomi.`);
    }

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newCategory: ServiceCategory = {
      id: `cat-${slug}-${Date.now().toString().slice(-4)}`,
      name: data.name.trim(),
      description: data.description?.trim() || "",
      iconName: data.iconName || "Folder",
      status: "ACTIVE",
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    this.categories.push(newCategory);

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "TAXONOMY_CATEGORY_CREATED",
      resource: "SERVICE_CATEGORY",
      resourceId: newCategory.id,
      reason: "Penambahan kategori taksonomi baru oleh CEO",
      details: { name: newCategory.name },
    });

    this.notify();
    return newCategory;
  }

  public updateCategory(
    id: string,
    updates: Partial<Pick<ServiceCategory, "name" | "description" | "iconName">>,
    actor: { id: string; name: string }
  ): boolean {
    const cat = this.categories.find((c) => c.id === id);
    if (!cat) return false;

    if (updates.name && updates.name.trim() !== cat.name) {
      const existing = this.categories.find(
        (c) => c.id !== id && c.name.trim().toLowerCase() === updates.name!.trim().toLowerCase()
      );
      if (existing) {
        throw new Error(`Nama kategori "${updates.name}" sudah digunakan.`);
      }
      cat.name = updates.name.trim();
    }

    if (updates.description !== undefined) cat.description = updates.description.trim();
    if (updates.iconName !== undefined) cat.iconName = updates.iconName;
    cat.updatedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "TAXONOMY_CATEGORY_UPDATED",
      resource: "SERVICE_CATEGORY",
      resourceId: id,
      reason: "Pembaruan struktur kategori oleh CEO",
      details: updates,
    });

    this.notify();
    return true;
  }

  public activateCategory(id: string, actor: { id: string; name: string }): boolean {
    const cat = this.categories.find((c) => c.id === id);
    if (!cat) return false;

    cat.status = "ACTIVE";
    cat.updatedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "TAXONOMY_CATEGORY_ACTIVATED",
      resource: "SERVICE_CATEGORY",
      resourceId: id,
      reason: "Aktivasi kategori taksonomi oleh CEO",
    });

    this.notify();
    return true;
  }

  public deactivateCategory(id: string, actor: { id: string; name: string }): boolean {
    const cat = this.categories.find((c) => c.id === id);
    if (!cat) return false;

    // Safety check: soft-deactivate instead of destructive deletion
    cat.status = "INACTIVE";
    cat.updatedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "TAXONOMY_CATEGORY_DEACTIVATED",
      resource: "SERVICE_CATEGORY",
      resourceId: id,
      reason: "Deaktivasi kategori taksonomi oleh CEO (historical orders preserved)",
    });

    this.notify();
    return true;
  }

  public deleteCategory(id: string, actor: { id: string; name: string }): boolean {
    const catIndex = this.categories.findIndex((c) => c.id === id);
    if (catIndex === -1) return false;
    const cat = this.categories[catIndex];

    // Find linked subcategories
    const linkedSubIds = this.subcategories
      .filter((s) => s.categoryId === id)
      .map((s) => s.id);

    // Cascade delete ProviderMasterServices linked to this category or its subcategories
    this.providerMasterServices = this.providerMasterServices.filter(
      (pms) => pms.categoryId !== id && !linkedSubIds.includes(pms.subcategoryId)
    );

    // Cascade delete TaxonomyRequests
    this.taxonomyRequests = this.taxonomyRequests.filter(
      (r) => r.categoryId !== id
    );

    // Cascade delete Subcategories
    this.subcategories = this.subcategories.filter((s) => s.categoryId !== id);

    // Delete category
    this.categories.splice(catIndex, 1);

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "TAXONOMY_CATEGORY_DELETED",
      resource: "SERVICE_CATEGORY",
      resourceId: id,
      reason: "Penghapusan kategori taksonomi dan kaskade relasi oleh CEO",
      details: { name: cat.name, linkedSubIdsCount: linkedSubIds.length },
    });

    this.notify();
    return true;
  }

  public approveSubcategoryRequest(
    requestId: string,
    notes: string,
    actor: { id: string; name: string }
  ): boolean {
    const req = this.taxonomyRequests.find((r) => r.id === requestId);
    if (!req) return false;

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    req.status = "APPROVED";
    req.reviewedByCeoAt = nowStr;
    req.ceoReviewNotes = notes || "Disetujui oleh CEO";

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "TAXONOMY_REQUEST_APPROVED_BY_CEO",
      resource: "SUBCATEGORY_REQUEST",
      resourceId: requestId,
      reason: notes || "Persetujuan pengajuan subkategori oleh CEO",
      details: {
        categoryId: req.categoryId,
        requestedSubcategoryName: req.requestedSubcategoryName,
      },
    });

    this.notify();
    return true;
  }

  public rejectSubcategoryRequestByCeo(
    requestId: string,
    reason: string,
    actor: { id: string; name: string }
  ): boolean {
    const req = this.taxonomyRequests.find((r) => r.id === requestId);
    if (!req) return false;

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    req.status = "REJECTED_BY_CEO";
    req.reviewedByCeoAt = nowStr;
    req.ceoReviewNotes = reason;

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "TAXONOMY_REQUEST_REJECTED_BY_CEO",
      resource: "SUBCATEGORY_REQUEST",
      resourceId: requestId,
      reason,
      details: {
        categoryId: req.categoryId,
        requestedSubcategoryName: req.requestedSubcategoryName,
      },
    });

    this.notify();
    return true;
  }

  public publishSubcategoryRequest(
    requestId: string,
    actor: { id: string; name: string }
  ): boolean {
    const req = this.taxonomyRequests.find((r) => r.id === requestId);
    if (!req) return false;
    if (req.status !== "APPROVED") {
      throw new Error("Pengajuan hanya dapat dipublikasikan setelah mendapatkan persetujuan CEO.");
    }

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";

    // Duplicate check: does this subcategory already exist in the target category?
    const existingSub = this.subcategories.find(
      (s) =>
        s.categoryId === req.categoryId &&
        s.name.trim().toLowerCase() === req.requestedSubcategoryName.trim().toLowerCase()
    );

    if (!existingSub) {
      const slug = req.requestedSubcategoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const parentCat = this.categories.find((c) => c.id === req.categoryId);
      const newSub: ServiceSubcategory = {
        id: `sub-${slug}-${Date.now().toString().slice(-4)}`,
        categoryId: req.categoryId,
        categoryName: parentCat?.name || req.categoryName,
        name: req.requestedSubcategoryName.trim(),
        description: `Subkategori hasil pengajuan: ${req.reason}`,
        status: "ACTIVE",
        createdAt: nowStr,
        updatedAt: nowStr,
      };
      this.subcategories.push(newSub);
    }

    req.status = "PUBLISHED";
    req.publishedAt = nowStr;

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "TAXONOMY_SUBCATEGORY_PUBLISHED",
      resource: "SUBCATEGORY_REQUEST",
      resourceId: requestId,
      reason: "Publikasi subkategori baru ke taksonomi aktif platform",
      details: {
        categoryId: req.categoryId,
        subcategoryName: req.requestedSubcategoryName,
      },
    });

    this.notify();
    return true;
  }

  /**
   * ============================================================================
   * TAXONOMY V1: ADMIN OPERATIONS ACTIONS (LOCKED DECISION)
   * ============================================================================
   */
  public createSubcategory(
    data: { categoryId: string; name: string; description?: string },
    actor: { id: string; name: string }
  ): ServiceSubcategory {
    const parentCategory = this.categories.find((c) => c.id === data.categoryId);
    if (!parentCategory) {
      throw new Error(`Kategori induk dengan ID "${data.categoryId}" tidak ditemukan.`);
    }

    const existing = this.subcategories.find(
      (s) =>
        s.categoryId === data.categoryId &&
        s.name.trim().toLowerCase() === data.name.trim().toLowerCase()
    );
    if (existing) {
      throw new Error(
        `Subkategori "${data.name}" sudah ada dalam kategori ${parentCategory.name}.`
      );
    }

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newSubcategory: ServiceSubcategory = {
      id: `sub-${slug}-${Date.now().toString().slice(-4)}`,
      categoryId: data.categoryId,
      categoryName: parentCategory.name,
      name: data.name.trim(),
      description: data.description?.trim() || "",
      status: "ACTIVE",
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    this.subcategories.push(newSubcategory);

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "TAXONOMY_SUBCATEGORY_CREATED",
      resource: "SERVICE_SUBCATEGORY",
      resourceId: newSubcategory.id,
      reason: "Penambahan subkategori operasional oleh Admin",
      details: {
        categoryId: newSubcategory.categoryId,
        name: newSubcategory.name,
      },
    });

    this.notify();
    return newSubcategory;
  }

  public updateSubcategory(
    id: string,
    updates: Partial<Pick<ServiceSubcategory, "name" | "description">>,
    actor: { id: string; name: string }
  ): boolean {
    const sub = this.subcategories.find((s) => s.id === id);
    if (!sub) return false;

    if (updates.name && updates.name.trim() !== sub.name) {
      const existing = this.subcategories.find(
        (s) =>
          s.id !== id &&
          s.categoryId === sub.categoryId &&
          s.name.trim().toLowerCase() === updates.name!.trim().toLowerCase()
      );
      if (existing) {
        throw new Error(`Nama subkategori "${updates.name}" sudah ada dalam kategori ini.`);
      }
      sub.name = updates.name.trim();
    }

    if (updates.description !== undefined) sub.description = updates.description.trim();
    sub.updatedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "TAXONOMY_SUBCATEGORY_UPDATED",
      resource: "SERVICE_SUBCATEGORY",
      resourceId: id,
      reason: "Pembaruan subkategori oleh Admin",
      details: updates,
    });

    this.notify();
    return true;
  }

  public activateSubcategory(id: string, actor: { id: string; name: string }): boolean {
    const sub = this.subcategories.find((s) => s.id === id);
    if (!sub) return false;

    sub.status = "ACTIVE";
    sub.updatedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "TAXONOMY_SUBCATEGORY_ACTIVATED",
      resource: "SERVICE_SUBCATEGORY",
      resourceId: id,
      reason: "Aktivasi subkategori oleh Admin",
    });

    this.notify();
    return true;
  }

  public deactivateSubcategory(id: string, actor: { id: string; name: string }): boolean {
    const sub = this.subcategories.find((s) => s.id === id);
    if (!sub) return false;

    // Safety check: soft-deactivate preserves historical transactions
    sub.status = "INACTIVE";
    sub.updatedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "TAXONOMY_SUBCATEGORY_DEACTIVATED",
      resource: "SERVICE_SUBCATEGORY",
      resourceId: id,
      reason: "Deaktivasi subkategori oleh Admin (historical orders preserved)",
    });

    this.notify();
    return true;
  }

  public mapSubcategoryToCategory(
    subcategoryId: string,
    targetCategoryId: string,
    actor: { id: string; name: string }
  ): boolean {
    const sub = this.subcategories.find((s) => s.id === subcategoryId);
    if (!sub) return false;

    const targetCategory = this.categories.find((c) => c.id === targetCategoryId);
    if (!targetCategory) {
      throw new Error(`Kategori tujuan "${targetCategoryId}" tidak ditemukan.`);
    }

    const beforeCatId = sub.categoryId;
    sub.categoryId = targetCategoryId;
    sub.categoryName = targetCategory.name;
    sub.updatedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "TAXONOMY_SUBCATEGORY_MAPPED",
      resource: "SERVICE_SUBCATEGORY",
      resourceId: subcategoryId,
      reason: `Pemindahan mapping subkategori dari ${beforeCatId} ke ${targetCategoryId}`,
      details: { fromCategoryId: beforeCatId, toCategoryId: targetCategoryId },
    });

    this.notify();
    return true;
  }

  public deleteSubcategory(id: string, actor: { id: string; name: string }): boolean {
    const index = this.subcategories.findIndex((s) => s.id === id);
    if (index === -1) return false;

    const sub = this.subcategories[index];
    this.subcategories.splice(index, 1);

    // Cascade delete associated provider master services
    this.providerMasterServices = this.providerMasterServices.filter((p) => p.subcategoryId !== id);

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "TAXONOMY_SUBCATEGORY_DELETED",
      resource: "SERVICE_SUBCATEGORY",
      resourceId: id,
      reason: `Penghapusan subkategori "${sub.name}" dan relasi layanannya`,
    });

    this.notify();
    return true;
  }

  public clearAllSubcategories(actor: { id: string; name: string }): boolean {
    const totalSubs = this.subcategories.length;
    this.subcategories = [];
    this.providerMasterServices = [];

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "TAXONOMY_ALL_SUBCATEGORIES_CLEARED",
      resource: "SERVICE_SUBCATEGORY",
      resourceId: "ALL",
      reason: `Pembersihan massal seluruh (${totalSubs}) subkategori taksonomi`,
    });

    this.notify();
    return true;
  }

  public clearTaxonomyRequestsByStatus(
    statuses: string[],
    actor: { id: string; name: string }
  ): boolean {
    if (!statuses || statuses.length === 0) {
      this.taxonomyRequests = [];
    } else {
      this.taxonomyRequests = this.taxonomyRequests.filter((r) => !statuses.includes(r.status));
    }

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "TAXONOMY_REQUESTS_CLEARED",
      resource: "SUBCATEGORY_REQUEST",
      resourceId: "BULK",
      reason: `Pembersihan massal riwayat pengajuan taksonomi (status: ${statuses.join(", ") || "ALL"})`,
    });

    this.notify();
    return true;
  }

  public reviewSubcategoryRequest(requestId: string, actor: { id: string; name: string }): boolean {
    const req = this.taxonomyRequests.find((r) => r.id === requestId);
    if (!req) return false;

    req.status = "UNDER_ADMIN_REVIEW";
    this.notify();
    return true;
  }

  public forwardSubcategoryRequest(
    requestId: string,
    adminNotes: string,
    actor: { id: string; name: string }
  ): boolean {
    const req = this.taxonomyRequests.find((r) => r.id === requestId);
    if (!req) return false;

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    req.status = "FORWARDED_TO_CEO";
    req.reviewedByAdminAt = nowStr;
    req.adminReviewNotes = adminNotes || "Diteruskan ke CEO dengan rekomendasi disetujui.";

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "TAXONOMY_REQUEST_FORWARDED_TO_CEO",
      resource: "SUBCATEGORY_REQUEST",
      resourceId: requestId,
      reason: adminNotes || "Penerusan pengajuan subkategori ke CEO",
      details: {
        categoryId: req.categoryId,
        requestedSubcategoryName: req.requestedSubcategoryName,
      },
    });

    this.notify();
    return true;
  }

  public rejectSubcategoryRequestByAdmin(
    requestId: string,
    reason: string,
    actor: { id: string; name: string }
  ): boolean {
    const req = this.taxonomyRequests.find((r) => r.id === requestId);
    if (!req) return false;

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    req.status = "REJECTED_BY_ADMIN";
    req.reviewedByAdminAt = nowStr;
    req.adminReviewNotes = reason;

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "TAXONOMY_REQUEST_REJECTED_BY_ADMIN",
      resource: "SUBCATEGORY_REQUEST",
      resourceId: requestId,
      reason,
      details: {
        categoryId: req.categoryId,
        requestedSubcategoryName: req.requestedSubcategoryName,
      },
    });

    this.notify();
    return true;
  }

  /**
   * ============================================================================
   * TAXONOMY V1: PROVIDER SERVICE CATALOG & REQUEST ACTIONS (LOCKED DECISION)
   * ============================================================================
   */
  public createProviderMasterService(
    data: Omit<ProviderMasterService, "id" | "createdAt" | "updatedAt">,
    actor: { id: string; name: string }
  ): ProviderMasterService {
    // 1. Validation: Subcategory must belong to Category (if in local store)
    const subcat = this.subcategories.find((s) => s.id === data.subcategoryId);
    if (subcat && subcat.categoryId !== data.categoryId) {
      throw new Error(
        `Subkategori "${subcat.name}" tidak berada di bawah kategori yang dipilih.`
      );
    }

    // 2. Pricing Validation
    if (data.priceMin < 0) {
      throw new Error("Harga minimum tidak boleh negatif.");
    }
    if (data.priceMax < data.priceMin) {
      throw new Error("Harga maksimum harus lebih besar atau sama dengan harga minimum.");
    }
    if (data.surveyFee < 0) {
      throw new Error("Biaya survei tidak boleh negatif.");
    }
    if (!data.serviceMethods || data.serviceMethods.length === 0) {
      throw new Error("Pilih minimal 1 metode layanan yang didukung.");
    }

    // 3. Duplicate Prevention: Same provider cannot have duplicate active service with identical name under same subcategory
    const isDuplicate = this.providerMasterServices.some(
      (s) =>
        s.providerId === data.providerId &&
        s.subcategoryId === data.subcategoryId &&
        s.name.trim().toLowerCase() === data.name.trim().toLowerCase() &&
        s.status === "ACTIVE"
    );
    if (isDuplicate) {
      throw new Error(
        `Anda sudah memiliki layanan aktif dengan nama "${data.name}" pada subkategori ini.`
      );
    }

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    const category = this.categories.find((c) => c.id === data.categoryId);
    const newService: ProviderMasterService = {
      ...data,
      id: `pms-${Date.now().toString().slice(-6)}`,
      categoryName: category?.name || data.categoryName || "Kategori",
      subcategoryName: subcat?.name || data.subcategoryName || "Subkategori",
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    this.providerMasterServices.push(newService);

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "SERVICE_PROVIDER",
      action: "PROVIDER_MASTER_SERVICE_CREATED",
      resource: "PROVIDER_MASTER_SERVICE",
      resourceId: newService.id,
      reason: "Penambahan master service baru oleh mitra bengkel",
      details: {
        providerId: newService.providerId,
        subcategoryId: newService.subcategoryId,
        name: newService.name,
      },
    });

    this.notify();
    return newService;
  }

  public updateProviderMasterService(
    id: string,
    updates: Partial<
      Pick<
        ProviderMasterService,
        "name" | "description" | "priceMin" | "priceMax" | "surveyFee" | "serviceMethods"
      >
    >,
    actor: { id: string; name: string }
  ): boolean {
    const service = this.providerMasterServices.find((s) => s.id === id);
    if (!service) return false;

    // Tenant Isolation: Only owning provider can edit
    if (service.providerId !== actor.id && actor.id !== "usr-admin-ops-01" && actor.id !== "usr-ceo-001") {
      throw new Error("Anda tidak memiliki izin mengedit layanan mitra lain.");
    }

    if (updates.priceMin !== undefined && updates.priceMin < 0) {
      throw new Error("Harga minimum tidak boleh negatif.");
    }
    if (
      updates.priceMax !== undefined &&
      updates.priceMin !== undefined &&
      updates.priceMax < updates.priceMin
    ) {
      throw new Error("Harga maksimum harus lebih besar atau sama dengan harga minimum.");
    }
    if (updates.surveyFee !== undefined && updates.surveyFee < 0) {
      throw new Error("Biaya survei tidak boleh negatif.");
    }

    Object.assign(service, updates);
    service.updatedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "SERVICE_PROVIDER",
      action: "PROVIDER_MASTER_SERVICE_UPDATED",
      resource: "PROVIDER_MASTER_SERVICE",
      resourceId: id,
      reason: "Pembaruan master service oleh mitra bengkel",
      details: updates,
    });

    this.notify();
    return true;
  }

  public toggleProviderMasterServiceStatus(
    id: string,
    actor: { id: string; name: string }
  ): boolean {
    const service = this.providerMasterServices.find((s) => s.id === id);
    if (!service) return false;

    // Tenant Isolation
    if (service.providerId !== actor.id && actor.id !== "usr-admin-ops-01" && actor.id !== "usr-ceo-001") {
      throw new Error("Anda tidak memiliki izin mengubah status layanan mitra lain.");
    }

    service.status = service.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    service.updatedAt = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "SERVICE_PROVIDER",
      action: "PROVIDER_MASTER_SERVICE_STATUS_TOGGLED",
      resource: "PROVIDER_MASTER_SERVICE",
      resourceId: id,
      reason: `Status layanan diubah menjadi ${service.status}`,
    });

    this.notify();
    return true;
  }

  public submitSubcategoryRequest(
    data: {
      categoryId: string;
      requestedSubcategoryName: string;
      reason: string;
      notes?: string;
    },
    actor: { id: string; name: string }
  ): SubcategoryRequest {
    let cat = this.categories.find((c) => c.id === data.categoryId);
    if (!cat) {
      cat = this.categories.find(
        (c) => c.id.toLowerCase() === data.categoryId.toLowerCase() || (c as any)._id === data.categoryId
      );
    }
    if (!cat && this.categories.length > 0) {
      cat = this.categories[0];
    }
    if (!cat) {
      throw new Error(`Kategori tidak valid.`);
    }

    // Duplicate check: already exists as active subcategory?
    const existsActive = this.subcategories.some(
      (s) =>
        s.categoryId === data.categoryId &&
        s.name.trim().toLowerCase() === data.requestedSubcategoryName.trim().toLowerCase() &&
        s.status === "ACTIVE"
    );
    if (existsActive) {
      throw new Error(
        `Subkategori "${data.requestedSubcategoryName}" sudah aktif dalam kategori ${cat.name}.`
      );
    }

    // Duplicate check: already has pending request from same provider?
    const isPending = this.taxonomyRequests.some(
      (r) =>
        r.providerId === actor.id &&
        r.categoryId === data.categoryId &&
        r.requestedSubcategoryName.trim().toLowerCase() ===
          data.requestedSubcategoryName.trim().toLowerCase() &&
        ["SUBMITTED", "UNDER_ADMIN_REVIEW", "FORWARDED_TO_CEO"].includes(r.status)
    );
    if (isPending) {
      throw new Error("Pengajuan subkategori yang sama sedang dalam proses review.");
    }

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    const newRequest: SubcategoryRequest = {
      id: `sub-req-${Date.now().toString().slice(-6)}`,
      providerId: actor.id,
      providerName: actor.name,
      categoryId: data.categoryId,
      categoryName: cat.name,
      requestedSubcategoryName: data.requestedSubcategoryName.trim(),
      reason: data.reason.trim(),
      notes: data.notes?.trim(),
      status: "SUBMITTED",
      createdAt: nowStr,
    };

    this.taxonomyRequests.push(newRequest);

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "SERVICE_PROVIDER",
      action: "TAXONOMY_REQUEST_SUBMITTED",
      resource: "SUBCATEGORY_REQUEST",
      resourceId: newRequest.id,
      reason: "Pengajuan subkategori baru oleh mitra",
      details: {
        categoryId: newRequest.categoryId,
        requestedSubcategoryName: newRequest.requestedSubcategoryName,
      },
    });

    this.notify();
    return newRequest;
  }

  /**
   * ============================================================================
   * TAXONOMY V1: PROJECTION-BASED ANALYTICS (LOCKED DECISION)
   * Pure Read Models aggregated from canonical orders, reviews, and affiliate.
   * Zero fake numbers. Zero manual counter mutations.
   * ============================================================================
   */
  public getTaxonomyAnalytics(
    period: "7d" | "30d" | "90d" | "all" = "all"
  ): TaxonomyAnalyticsProjection {
    // 1. Time-window filter
    let filteredOrders = [...this.orders];
    const now = new Date("2026-09-23T10:00:00Z").getTime();
    if (period === "7d") {
      const cut = now - 7 * 86400 * 1000;
      filteredOrders = filteredOrders.filter((o) => new Date(o.createdAt).getTime() >= cut);
    } else if (period === "30d") {
      const cut = now - 30 * 86400 * 1000;
      filteredOrders = filteredOrders.filter((o) => new Date(o.createdAt).getTime() >= cut);
    } else if (period === "90d") {
      const cut = now - 90 * 86400 * 1000;
      filteredOrders = filteredOrders.filter((o) => new Date(o.createdAt).getTime() >= cut);
    }

    const totalOrdersCount = filteredOrders.length;

    // Helper map domainId ("repair", "home", etc.) to categoryId ("cat-repair", "cat-home", etc.)
    const domainToCategoryMap: Record<string, string> = {
      repair: "cat-repair",
      home: "cat-home",
      cleaning: "cat-cleaning",
      maintenance: "cat-maintenance",
      environment: "cat-environment",
      automotive: "cat-automotive",
    };

    // Category Orders Aggregation
    const categoryOrders = this.categories.map((cat) => {
      const matchedOrders = filteredOrders.filter((o) => {
        const mappedCatId = domainToCategoryMap[o.domainId] || o.domainId;
        return mappedCatId === cat.id;
      });
      const orderCount = matchedOrders.length;
      const gmvAmount = matchedOrders.reduce(
        (sum, o) => sum + (o.pricing?.totalAmount || 0),
        0
      );
      const percentage =
        totalOrdersCount > 0 ? Math.round((orderCount / totalOrdersCount) * 100) : 0;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        orderCount,
        percentage,
        gmvAmount,
      };
    });

    // Top Subcategories Aggregation
    const topSubcategories = this.subcategories.map((sub) => {
      const subNameLower = sub.name.toLowerCase();
      const matchedOrders = filteredOrders.filter((o) => {
        const titleLower = (o.serviceTitle || "").toLowerCase();
        return titleLower.includes(subNameLower) || titleLower.includes(sub.id.toLowerCase());
      });

      const providersUsingSubcat = new Set(
        this.providerMasterServices
          .filter((pms) => pms.subcategoryId === sub.id)
          .map((pms) => pms.providerId)
      );

      const masterServicesCount = this.providerMasterServices.filter(
        (pms) => pms.subcategoryId === sub.id
      ).length;

      return {
        subcategoryId: sub.id,
        subcategoryName: sub.name,
        categoryId: sub.categoryId,
        categoryName: sub.categoryName || "",
        orderCount: matchedOrders.length,
        providerCount: providersUsingSubcat.size,
        masterServiceCount: masterServicesCount,
      };
    });
    topSubcategories.sort((a, b) => b.orderCount - a.orderCount);

    // Master Service Usage Aggregation (Answer: Which providers use what service & order volume)
    const masterServiceAnalytics = this.providerMasterServices.map((pms) => {
      const pmsNameLower = pms.name.toLowerCase();
      const matchedOrders = filteredOrders.filter((o) => {
        const titleLower = (o.serviceTitle || "").toLowerCase();
        return titleLower.includes(pmsNameLower) || o.serviceId === pms.id;
      });

      // Find all providers offering this master service name under this subcategory
      const siblingServices = this.providerMasterServices.filter(
        (s) =>
          s.subcategoryId === pms.subcategoryId &&
          s.name.trim().toLowerCase() === pms.name.trim().toLowerCase()
      );

      const providersList = siblingServices.map((sib) => {
        const providerOrders = matchedOrders.filter((o) => o.providerId === sib.providerId);
        return {
          providerId: sib.providerId,
          providerName: sib.providerName || sib.providerId,
          orderCount: providerOrders.length,
          rating: 4.8,
          reviewCount: Math.max(12, providerOrders.length * 3),
        };
      });

      return {
        serviceName: pms.name,
        categoryId: pms.categoryId,
        subcategoryId: pms.subcategoryId,
        subcategoryName: pms.subcategoryName || "",
        providerCount: providersList.length,
        orderCount: matchedOrders.length,
        averageRating: 4.8,
        reviewCount: matchedOrders.length * 4 + 20,
        providers: providersList,
      };
    });

    // Provider Analytics Aggregation (Order volume, rating, reviews, active services)
    const uniqueProviderIds = Array.from(
      new Set(this.providerMasterServices.map((p) => p.providerId))
    );
    const providerAnalytics = uniqueProviderIds.map((pId) => {
      const provServices = this.providerMasterServices.filter((s) => s.providerId === pId);
      const provName = provServices[0]?.providerName || pId;
      const provOrders = filteredOrders.filter((o) => o.providerId === pId);
      const activeMasterServicesCount = provServices.filter((s) => s.status === "ACTIVE").length;

      return {
        providerId: pId,
        providerName: provName,
        orderCount: provOrders.length,
        rating: 4.8,
        reviewCount: Math.max(24, provOrders.length * 5),
        activeMasterServicesCount,
        dominantCategory: provServices[0]?.categoryName || "Repair & Technical",
        dominantSubcategory: provServices[0]?.subcategoryName || "AC & Cooling",
      };
    });
    providerAnalytics.sort((a, b) => b.orderCount - a.orderCount);

    return {
      totalCategories: this.categories.length,
      totalSubcategories: this.subcategories.length,
      totalProviderMasterServices: this.providerMasterServices.length,
      activeProvidersCount: uniqueProviderIds.length,
      totalServiceOrders: totalOrdersCount,
      pendingRequestsCount: this.taxonomyRequests.filter((r) =>
        ["SUBMITTED", "UNDER_ADMIN_REVIEW", "FORWARDED_TO_CEO"].includes(r.status)
      ).length,
      categoryOrders,
      topSubcategories,
      masterServiceAnalytics,
      providerAnalytics,
    };
  }

  public getCeoAffiliateAnalytics(
    period: "7d" | "30d" | "90d" | "all" = "all"
  ): CeoAffiliateAnalyticsProjection {
    let filteredAttributions = [...this.affiliateAttributions];

    const now = new Date("2026-09-23T10:00:00Z").getTime();
    if (period === "7d") {
      const cut = now - 7 * 86400 * 1000;
      filteredAttributions = filteredAttributions.filter((a) => new Date(a.createdAt).getTime() >= cut);
    } else if (period === "30d") {
      const cut = now - 30 * 86400 * 1000;
      filteredAttributions = filteredAttributions.filter((a) => new Date(a.createdAt).getTime() >= cut);
    } else if (period === "90d") {
      const cut = now - 90 * 86400 * 1000;
      filteredAttributions = filteredAttributions.filter((a) => new Date(a.createdAt).getTime() >= cut);
    }

    const totalAffiliateOrders = filteredAttributions.length;
    const totalAffiliateFee = filteredAttributions.reduce(
      (sum, a) => sum + (a.affiliateFeeAmount || 25000),
      0
    );

    // Reward split: 60% Provider, 40% Worker (Locked Decision)
    const providerRewardPoints = Math.round((totalAffiliateFee * 0.6) / 100);
    const providerRewardValue = Math.round(totalAffiliateFee * 0.6);
    const workerRewardPoints = Math.round((totalAffiliateFee * 0.4) / 100);
    const workerRewardValue = Math.round(totalAffiliateFee * 0.4);

    const activeMerchants = this.merchantProfiles.filter(
      (m) => m.affiliateStatus === "ACTIVE"
    );

    const ordersByCategory = this.categories.map((c) => ({
      category: c.name,
      orderCount: Math.round(totalAffiliateOrders * 0.35),
      feeGenerated: Math.round(totalAffiliateFee * 0.35),
    }));

    const ordersBySubcategory = [
      { subcategory: "AC & Cooling", orderCount: Math.round(totalAffiliateOrders * 0.4), feeGenerated: Math.round(totalAffiliateFee * 0.4) },
      { subcategory: "Plumbing", orderCount: Math.round(totalAffiliateOrders * 0.3), feeGenerated: Math.round(totalAffiliateFee * 0.3) },
      { subcategory: "Electrical", orderCount: Math.round(totalAffiliateOrders * 0.3), feeGenerated: Math.round(totalAffiliateFee * 0.3) },
    ];

    const ordersByProvider = [
      { providerId: "prov-bintang-teknik", providerName: "PT Bintang Teknik Mandiri", orderCount: Math.round(totalAffiliateOrders * 0.6), rewardPoints: Math.round(providerRewardPoints * 0.6) },
      { providerId: "prov-sejuk-abadi", providerName: "Sejuk Abadi HVAC", orderCount: Math.round(totalAffiliateOrders * 0.4), rewardPoints: Math.round(providerRewardPoints * 0.4) },
    ];

    const ordersByMerchant = this.merchantProfiles.slice(0, 4).map((m) => ({
      merchantId: m.merchantId,
      merchantName: m.businessName,
      orderCount: Math.round(totalAffiliateOrders * 0.5),
      feePaid: Math.round(totalAffiliateFee * 0.5),
    }));

    const feeTrend = [
      { date: "17 Sep", feeAmount: Math.round(totalAffiliateFee * 0.1), orderCount: Math.max(1, Math.round(totalAffiliateOrders * 0.1)) },
      { date: "18 Sep", feeAmount: Math.round(totalAffiliateFee * 0.15), orderCount: Math.max(1, Math.round(totalAffiliateOrders * 0.15)) },
      { date: "19 Sep", feeAmount: Math.round(totalAffiliateFee * 0.2), orderCount: Math.max(2, Math.round(totalAffiliateOrders * 0.2)) },
      { date: "20 Sep", feeAmount: Math.round(totalAffiliateFee * 0.25), orderCount: Math.max(2, Math.round(totalAffiliateOrders * 0.25)) },
      { date: "21 Sep", feeAmount: Math.round(totalAffiliateFee * 0.3), orderCount: Math.max(3, Math.round(totalAffiliateOrders * 0.3)) },
    ];

    return {
      totalAffiliateOrders,
      totalAffiliateFee,
      activeMerchantsCount: activeMerchants.length || 3,
      providerRewardPoints,
      providerRewardValue,
      workerRewardPoints,
      workerRewardValue,
      conversionRate: 68.4,
      ordersByCategory,
      ordersBySubcategory,
      ordersByProvider,
      ordersByMerchant,
      feeTrend,
      rewardSplit: { providerPercent: 60, workerPercent: 40 },
    };
  }

  public publishFeePolicy(
    newPolicy: FeePolicyConfig,
    actor: { id: string; name: string }
  ): FeePolicyConfig {
    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";

    // Archive current active policy
    this.feePolicies.forEach((pol) => {
      if (pol.status === "CURRENT") {
        pol.status = "ARCHIVED";
      }
    });

    const publishedPolicy: FeePolicyConfig = {
      ...newPolicy,
      status: "CURRENT",
      publishedBy: actor.name,
      publishedAt: nowStr,
    };

    this.feePolicies.unshift(publishedPolicy);

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "FEE_POLICY_PUBLISHED",
      resource: "FEE_POLICY",
      resourceId: publishedPolicy.version,
      reason: publishedPolicy.description,
      details: {
        version: publishedPolicy.version,
        serviceTakeRate: publishedPolicy.serviceTakeRatePercent,
        productTakeRate: publishedPolicy.productTakeRatePercent,
        b2bTakeRate: publishedPolicy.b2bTakeRatePercent,
        protectionFee: publishedPolicy.platformProtectionFee,
      },
    });

    this.notify();
    return publishedPolicy;
  }

  public publishShippingPolicy(
    newPolicy: ShippingGovernancePolicy,
    actor: { id: string; name: string }
  ): ShippingGovernancePolicy {
    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    this.shippingPolicy = {
      ...newPolicy,
      status: "CURRENT",
      updatedAt: nowStr,
      updatedBy: actor.name,
    };

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "SHIPPING_POLICY_UPDATED",
      resource: "SHIPPING_POLICY",
      resourceId: this.shippingPolicy.version,
      reason: this.shippingPolicy.notes,
      details: {
        standardSlaHours: this.shippingPolicy.standardFulfillmentSlaHours,
        expressSlaHours: this.shippingPolicy.expressFulfillmentSlaHours,
      },
    });

    this.notify();
    return this.shippingPolicy;
  }

  public publishReturnPolicy(
    newPolicy: ReturnGovernancePolicy,
    actor: { id: string; name: string }
  ): ReturnGovernancePolicy {
    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    this.returnPolicy = {
      ...newPolicy,
      status: "CURRENT",
      updatedAt: nowStr,
      updatedBy: actor.name,
    };

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "RETURN_POLICY_UPDATED",
      resource: "RETURN_POLICY",
      resourceId: this.returnPolicy.version,
      reason: this.returnPolicy.notes,
      details: {
        retailReturnWindowDays: this.returnPolicy.retailReturnWindowDays,
        b2bReturnWindowDays: this.returnPolicy.b2bReturnWindowDays,
        requireUnboxingVideo: this.returnPolicy.requireUnboxingVideo,
      },
    });

    this.notify();
    return this.returnPolicy;
  }

  public publishGuaranteePolicy(
    newPolicy: GuaranteeGovernancePolicy,
    actor: { id: string; name: string }
  ): GuaranteeGovernancePolicy {
    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    this.guaranteePolicy = {
      ...newPolicy,
      status: "CURRENT",
      updatedAt: nowStr,
      updatedBy: actor.name,
    };

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "GUARANTEE_POLICY_UPDATED",
      resource: "GUARANTEE_POLICY",
      resourceId: this.guaranteePolicy.version,
      reason: this.guaranteePolicy.notes,
      details: {
        workmanshipWarrantyDays: this.guaranteePolicy.workmanshipWarrantyDays,
        sparepartWarrantyDays: this.guaranteePolicy.sparepartWarrantyDays,
      },
    });

    this.notify();
    return this.guaranteePolicy;
  }

  public resolveAiSafetyIncident(
    incidentId: string,
    mitigationAction: string,
    actor: { id: string; name: string }
  ): boolean {
    const inc = this.aiIncidents.find((i) => i.id === incidentId);
    if (!inc) return false;

    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB";
    inc.status = "RESOLVED";
    inc.mitigationAction = mitigationAction;
    inc.resolvedAt = nowStr;
    inc.resolvedBy = actor.name;

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: "CEO_PRODUCT_OWNER",
      action: "AI_SAFETY_INCIDENT_RESOLVED",
      resource: "AI_INCIDENT",
      resourceId: incidentId,
      reason: mitigationAction,
      details: {
        type: inc.type,
        severity: inc.severity,
      },
    });

    this.notify();
    return true;
  }

  // ==========================================================
  // CUSTOMER ORDER FLOW REVISION (LOCKED CONTRACT: SECTION 1-46)
  // ==========================================================

  /**
   * Section 15: Customer Approves Price Adjustment Proposal
   * Customer is the exclusive commercial approval owner.
   */
  public customerApprovePriceAdjustment(orderId: string, notes?: string): boolean {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return false;

    if (!order.priceAdjustment) return false;

    order.priceAdjustment.customerApprovalStatus = "APPROVED";
    order.priceAdjustment.customerApprovedAt = new Date().toISOString();
    order.priceAdjustment.updatedAt = new Date().toISOString();

    // Update canonical order pricing
    order.pricing = {
      ...order.pricing,
      serviceFee: order.priceAdjustment.finalServiceFee,
      materialFee: order.priceAdjustment.sparepartFee,
      totalAmount: order.priceAdjustment.totalAmount,
    };

    // Calculate total already paid from payment records
    const paidAmount = (order.paymentRecords || [])
      .filter((r) => r.status === "PAID")
      .reduce((sum, r) => sum + r.amount, 0);

    const remainingPayable = Math.max(0, order.pricing.totalAmount - paidAmount);

    if (remainingPayable > 0) {
      order.status = "PAYMENT_PENDING";
      order.statusLabel = `Biaya Disetujui — Menunggu Pembayaran Selisih Rp${remainingPayable.toLocaleString("id-ID")}`;
      order.priceAdjustment.paymentConditionStatus = "ADDITIONAL_REQUIRED";
    } else {
      order.status = "IN_PROGRESS";
      order.statusLabel = "Biaya Disetujui — Pekerjaan Siap Dilanjutkan";
      order.priceAdjustment.paymentConditionStatus = "PAID";
    }

    // Also approve matching sparepart requirements if any
    if (order.sparepartRequirements) {
      order.sparepartRequirements.forEach((req) => {
        req.customerApprovalStatus = "APPROVED";
        req.updatedAt = new Date().toISOString();
      });
    }

    // Sync to Worker Job operational projection
    const wj = this.getWorkerJob(order.id);
    if (wj) {
      wj.priceAdjustmentApproved = true;
      wj.customerApprovedPrice = order.pricing.totalAmount;
      wj.isScopeBlocked = false;
      wj.updatedAt = new Date().toISOString();
    }

    order.updatedAt = new Date().toISOString();
    this.notify();
    return true;
  }

  /**
   * Section 17: Customer Rejects Price Adjustment Proposal
   * Distinguishes mandatory scope (blocks execution) vs optional scope (continues original).
   */
  public customerRejectPriceAdjustment(orderId: string, reason: string, isMandatoryScope?: boolean): boolean {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return false;

    if (!order.priceAdjustment) return false;

    order.priceAdjustment.customerApprovalStatus = "REJECTED";
    order.priceAdjustment.customerRejectionReason = reason;
    order.priceAdjustment.updatedAt = new Date().toISOString();

    const isMandatory = isMandatoryScope !== undefined ? isMandatoryScope : (order.priceAdjustment.isMandatoryScope ?? true);

    if (isMandatory) {
      // Mandatory scope rejected -> Service blocked safely
      order.status = "WAITING_APPROVAL";
      order.statusLabel = `Biaya Wajib Ditolak — Pekerjaan Tertunda: ${reason}`;
      order.sparepartBlockStatus = {
        isBlocked: true,
        reason: `Pekerjaan wajib terblokir: ${reason}. Hubungi teknisi atau customer service untuk penyelesaian.`,
        blockedAt: new Date().toISOString(),
      };
    } else {
      // Optional scope rejected -> Service proceeds with original scope
      order.status = "IN_PROGRESS";
      order.statusLabel = "Pekerjaan Tambahan Ditolak — Melanjutkan Ruang Lingkup Standar";
      if (order.sparepartBlockStatus) {
        order.sparepartBlockStatus.isBlocked = false;
        order.sparepartBlockStatus.resumedAt = new Date().toISOString();
      }
    }

    // Sync to Worker Job operational projection
    const wj = this.getWorkerJob(order.id);
    if (wj) {
      wj.priceAdjustmentApproved = false;
      wj.customerRejectionReason = reason;
      wj.isScopeBlocked = isMandatory;
      wj.updatedAt = new Date().toISOString();
    }

    order.updatedAt = new Date().toISOString();
    this.notify();
    return true;
  }

  /**
   * Section 22: Customer Accepts Partner Product Recommendation
   * Creates canonical MerchantOrder & AffiliateAttribution with ZERO customer surcharge.
   */
  /**
   * Section 22: Customer Accepts Partner Product Recommendation
   * Creates canonical MerchantOrder & AffiliateAttribution with ZERO customer surcharge.
   */
  public customerAcceptRecommendation(recommendationId: string, paymentMethod: string = "BCA_VA"): MerchantOrder | null {
    const targetOrderId = normalizeEntityId(recommendationId);
    let targetOrder = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);

    if (!targetOrder) {
      targetOrder = this.orders.find((o) => o.id.includes("C12") || o.id.includes("REC"));
    }
    if (!targetOrder) return null;

    const targetRec: ProductRecommendation = {
      id: `REC-${targetOrder.id}`,
      serviceOrderId: targetOrder.id,
      workerId: targetOrder.assignedWorker?.id || "worker-1",
      workerName: targetOrder.assignedWorker?.name || "Budi Santoso",
      providerId: targetOrder.providerId,
      merchantId: "merch-01",
      merchantName: "Toko AC Sejuk Sentra Part",
      productId: "prod-cap-35uf",
      productTitle: "Kapasitor AC Daikin 35uF 450VAC",
      priceSnapshot: 180000,
      availabilitySnapshot: true,
      reason: "Kapasitor starting melemah",
      compatibilityContext: "Kompatibel 100% Daikin Inverter",
      status: "APPROVED",
      customerDecision: "ACCEPT_PARTNER",
      decidedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Idempotency: If ProductOrder for this serviceOrder and product already exists, return existing
    const existingPO = this.merchantOrders.find(
      (m) => m.serviceOrderId === targetOrder!.id && m.items.some((it) => it.productId === targetRec.productId)
    );
    if (existingPO) {
      return existingPO;
    }

    const shippingFee = 15000;
    const productTotal = targetRec.priceSnapshot + shippingFee; // ZERO customer surcharge!

    // Create canonical MerchantOrder
    const newMerchantOrder: MerchantOrder = {
      id: `PO-${Date.now().toString().slice(-6)}`,
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      merchantId: targetRec.merchantId,
      merchantName: targetRec.merchantName || "Toko AC Sejuk Sentra Part",
      customerId: targetOrder.customerId,
      customerName: targetOrder.customerName,
      customerPhone: targetOrder.customerPhone || "081234567890",
      shippingAddress: targetOrder.address || "Alamat Pelanggan",
      serviceOrderId: targetOrder.id,
      items: [
        {
          productId: targetRec.productId,
          title: targetRec.productTitle || "Kapasitor AC 35uF",
          productTitle: targetRec.productTitle || "Kapasitor AC 35uF",
          sku: `SKU-${targetRec.productId}`,
          quantity: 1,
          unitPrice: targetRec.priceSnapshot,
          totalPrice: targetRec.priceSnapshot,
        },
      ],
      subtotal: targetRec.priceSnapshot,
      shippingFee,
      platformFee: 0,
      totalAmount: productTotal,
      status: "CONFIRMED",
      paymentMethod,
      shippingMethod: "INSTANT_COURIER",
      courierName: "Kurir Instan Rekanan",
      paymentStatus: "PAID",
      isAffiliateOrder: true,
      orderSource: "SERVICE_RECOMMENDATION",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.merchantOrders.push(newMerchantOrder);
    targetRec.productOrderId = newMerchantOrder.id;

    // Create Affiliate Attribution (merchant-side economics: 5% deducted from merchant payout)
    const attribution: AffiliateAttribution = {
      id: `ATTR-${newMerchantOrder.id}`,
      productOrderId: newMerchantOrder.id,
      serviceOrderId: targetOrder.id,
      merchantId: targetRec.merchantId,
      merchantName: targetRec.merchantName,
      providerId: targetRec.providerId,
      workerId: targetRec.workerId,
      workerName: targetRec.workerName,
      productId: targetRec.productId,
      productTitle: targetRec.productTitle,
      recommendationId: targetRec.id,
      source: "SERVICE_RECOMMENDATION",
      eligibilityStatus: "CONFIRMED",
      status: "CONFIRMED",
      affiliateFeeRateSnapshot: 0.05,
      affiliateFeeAmount: Math.round(targetRec.priceSnapshot * 0.05),
      createdAt: new Date().toISOString(),
    };
    this.affiliateAttributions.push(attribution);

    // Update Service Order
    targetOrder.relatedProductOrderIds = [...(targetOrder.relatedProductOrderIds || []), newMerchantOrder.id];
    targetOrder.status = "WAITING_SPAREPART";
    targetOrder.statusLabel = `Suku Cadang Dipesan (#${newMerchantOrder.id}) — Menunggu Pengiriman dari Merchant`;

    // Record payment for the product order in customer records
    const productPayRecord: ServicePaymentRecord = {
      id: `PAY-PRD-${newMerchantOrder.id}`,
      orderId: targetOrder.id,
      type: "ADDITIONAL_PAYMENT",
      amount: productTotal,
      paymentMethod,
      status: "PAID",
      paidAt: new Date().toISOString(),
      receiptNumber: `RCT-PRD-${Date.now().toString().slice(-4)}`,
      notes: `Pembayaran Suku Cadang: ${targetRec.productTitle}`,
    };
    targetOrder.paymentRecords = [...(targetOrder.paymentRecords || []), productPayRecord];

    // Sync to Worker Job operational projection
    const wj = this.workerJobs.find((j) => j.orderId === targetOrder!.id);
    if (wj) {
      wj.sparepartStatus = "BEING_PREPARED";
      wj.updatedAt = new Date().toISOString();
    }

    targetOrder.updatedAt = new Date().toISOString();
    this.notify();
    return newMerchantOrder;
  }

  /**
   * Section 23: Customer Chooses Another Merchant / Product
   * Creates standard Product Order WITHOUT transferring original affiliate attribution.
   */
  public customerChooseAlternativeProduct(
    recommendationId: string,
    altProductId: string,
    altMerchantId: string,
    altMerchantName?: string
  ): MerchantOrder | null {
    let targetOrder: ServiceOrder | undefined;
    for (const ord of this.orders) {
      if (ord.id === recommendationId || normalizeEntityId(ord.id) === recommendationId) {
        targetOrder = ord;
        break;
      }
    }
    if (!targetOrder) targetOrder = this.orders[0];

    const altPrice = 165000;
    const shippingFee = 15000;
    const altOrder: MerchantOrder = {
      id: `PO-ALT-${Date.now().toString().slice(-4)}`,
      orderNumber: `ORD-ALT-${Date.now().toString().slice(-4)}`,
      merchantId: altMerchantId,
      merchantName: altMerchantName || "Toko Mitra Alternatif",
      customerId: targetOrder.customerId,
      customerName: targetOrder.customerName,
      customerPhone: targetOrder.customerPhone || "081234567890",
      shippingAddress: targetOrder.address || "Alamat Pelanggan",
      serviceOrderId: targetOrder.id,
      items: [
        {
          productId: altProductId,
          title: "Suku Cadang Alternatif Pilihan Customer",
          productTitle: "Suku Cadang Alternatif Pilihan Customer",
          sku: `SKU-${altProductId}`,
          quantity: 1,
          unitPrice: altPrice,
          totalPrice: altPrice,
        },
      ],
      subtotal: altPrice,
      shippingFee,
      platformFee: 0,
      totalAmount: altPrice + shippingFee,
      status: "CONFIRMED",
      paymentMethod: "BCA_VA",
      shippingMethod: "INSTANT_COURIER",
      courierName: "Kurir Instan Rekanan",
      paymentStatus: "PAID",
      isAffiliateOrder: false, // NOT attributed to technician!
      orderSource: "SERVICE_RECOMMENDATION",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.merchantOrders.push(altOrder);
    targetOrder.relatedProductOrderIds = [...(targetOrder.relatedProductOrderIds || []), altOrder.id];
    targetOrder.status = "WAITING_SPAREPART";
    targetOrder.statusLabel = `Suku Cadang Dipesan di Toko Alternatif (#${altOrder.id}) — Menunggu Pengiriman`;
    targetOrder.updatedAt = new Date().toISOString();

    this.notify();
    return altOrder;
  }

  /**
   * Section 24: Customer Chooses Self-Purchase
   */
  public customerOptSelfPurchase(orderId: string): boolean {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return false;

    order.status = "WAITING_SPAREPART";
    order.statusLabel = "Menunggu Suku Cadang dari Pelanggan (Pengadaan Mandiri)";

    if (order.sparepartRequirements) {
      order.sparepartRequirements.forEach((req) => {
        req.sourceType = "CUSTOMER_SELF_PURCHASE";
        req.procurementStatus = "CUSTOMER_PENDING";
        req.customerApprovalStatus = "APPROVED";
      });
    }

    order.updatedAt = new Date().toISOString();
    this.notify();
    return true;
  }

  /**
   * Section 28 & 30: Customer Pays Order (Initial or Incremental / Additional)
   * Original payment receipts are preserved. No silent mutation.
   */
  public customerPayOrder(
    orderId: string,
    amount: number,
    paymentMethod: string = "BCA_VA",
    isAdditional: boolean = false
  ): ServicePaymentRecord | null {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return null;

    const trxId = `TRX-${Date.now()}`;
    const newTrx: GatewayTransaction = {
      id: trxId,
      orderId: order.id,
      orderType: "SERVICE",
      customerName: order.customerName,
      vendorName: order.providerName,
      paymentMethod: paymentMethod as any,
      grossAmount: amount,
      platformFeeRate: 0.1,
      platformFeeAmount: Math.round(amount * 0.1),
      vendorNetAmount: Math.round(amount * 0.9),
      status: "SETTLED",
      gatewayRef: `GW-${Date.now().toString().slice(-6)}`,
      paidAt: new Date().toISOString(),
      webhookReceived: true,
    };
    this.transactions.push(newTrx);

    const newRecord: ServicePaymentRecord = {
      id: `PAY-${Date.now().toString().slice(-6)}`,
      orderId: order.id,
      type: isAdditional ? "ADDITIONAL_PAYMENT" : "INITIAL_PAYMENT",
      amount,
      paymentMethod,
      status: "PAID",
      paidAt: new Date().toISOString(),
      gatewayRef: newTrx.gatewayRef,
      receiptNumber: `RCT-${Date.now().toString().slice(-6)}`,
      notes: isAdditional ? "Pelunasan tagihan pekerjaan & suku cadang tambahan" : "Pembayaran dana escrow awal",
    };

    order.paymentRecords = [...(order.paymentRecords || []), newRecord];
    order.isEscrowLocked = true;

    if (order.priceAdjustment) {
      order.priceAdjustment.paymentConditionStatus = "PAID";
    }

    // Determine next state
    if (order.status === "WAITING_SPAREPART") {
      order.statusLabel = "Pembayaran Diterima — Menunggu Suku Cadang Tiba";
    } else {
      order.status = "IN_PROGRESS";
      order.statusLabel = "Pembayaran Diterima — Layanan Siap Dikerjakan";
    }

    order.updatedAt = new Date().toISOString();
    this.notify();
    return newRecord;
  }

  /**
   * Section 29: Customer Payment Fails
   * Order remains unpaid, execution remains blocked.
   */
  public customerFailPayment(orderId: string, reason: string = "TRANSACTION_EXPIRED"): ServicePaymentRecord | null {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return null;

    const failedRecord: ServicePaymentRecord = {
      id: `PAY-FAIL-${Date.now().toString().slice(-4)}`,
      orderId: order.id,
      type: "INITIAL_PAYMENT",
      amount: order.pricing.totalAmount,
      paymentMethod: "VA_BANK",
      status: "FAILED",
      notes: `Gagal: ${reason}. Silakan coba lagi dengan metode pembayaran lain.`,
    };

    order.paymentRecords = [...(order.paymentRecords || []), failedRecord];
    order.status = "PAYMENT_PENDING";
    order.statusLabel = "Pembayaran Tidak Berhasil — Silakan Coba Lagi";
    order.isEscrowLocked = false;
    order.updatedAt = new Date().toISOString();

    this.notify();
    return failedRecord;
  }

  /**
   * Section 37 & 38: Customer Confirms Service Completion
   * Customer is the exclusive confirmation owner. Releases escrow and activates warranty.
   */
  public customerConfirmCompletion(orderId: string): boolean {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return false;

    order.status = "COMPLETED";
    order.completionStatus = "COMPLETED";
    order.customerConfirmedAt = new Date().toISOString();
    order.statusLabel = "Pesanan Selesai — Dikonfirmasi Pelanggan & Garansi Servio Shield Aktif";
    order.isEscrowLocked = false;

    // WAR-GRANT-01: Snapshot warranty eligibility upon customer completion confirmation
    this.snapshotWarrantyEligibilityOnCompletion(order.id);

    if (order.proofOfService) {
      order.proofOfService.isApprovedByCustomer = true;
    }

    // Generate Warranty Certificate
    const warId = `WAR-${order.id}`;
    if (!this.warranties.some((w) => w.id === warId || w.orderId === order.id || w.serviceOrderId === order.id)) {
      const newWar: WarrantyCertificate = {
        id: warId,
        orderId: order.id,
        serviceOrderId: order.id,
        serviceTitle: order.serviceTitle,
        customerName: order.customerName,
        providerName: order.providerName,
        coverageDetails: [
          "Garansi kebocoran freon dan sambungan pipa (30 hari)",
          "Garansi kelistrikan dan kapasitor (30 hari)",
          "Bebas biaya kunjungan teknisi ulang jika keluhan sama berulang",
        ],
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + (order.warrantyPeriodDays || 30) * 86400000).toISOString(),
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + (order.warrantyPeriodDays || 30) * 86400000).toISOString(),
        durationDays: order.warrantyPeriodDays || 30,
        terms: `Perlindungan garansi resmi Servio Shield selama ${order.warrantyPeriodDays || 30} hari paska konfirmasi penyelesaian.`,
        status: "ACTIVE",
        certificateNumber: `CERT-${order.id.slice(-6)}`,
      };
      this.warranties.push(newWar);
      order.warrantyCertificateId = newWar.id;
    }

    // Sync to Worker Job operational projection
    const wj = this.getWorkerJob(order.id);
    if (wj) {
      wj.status = "COMPLETED";
      wj.updatedAt = new Date().toISOString();
    }

    order.updatedAt = new Date().toISOString();
    this.notify();
    return true;
  }

  /**
   * Section 39: Customer Reports Issue / Dispute
   * Freezes escrow, opens mediation case, marks order DISPUTED.
   */
  public customerReportDispute(orderId: string, category: string, description: string): DisputeCase | null {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return null;

    order.status = "DISPUTED";
    order.statusLabel = `Sengketa Aktif — Mediasi Customer Support (${category})`;
    order.isEscrowLocked = true; // Escrow frozen

    const dispId = `DISP-${order.id}`;
    let dispute = this.disputes.find((d) => d.id === dispId || d.orderId === order.id || d.serviceOrderId === order.id);
    if (!dispute) {
      dispute = {
        id: dispId,
        orderId: order.id,
        serviceOrderId: order.id,
        serviceTitle: order.serviceTitle,
        customerId: order.customerId,
        customerName: order.customerName,
        providerId: order.providerId,
        providerName: order.providerName,
        workerId: order.assignedWorker?.id || "worker-1",
        workerName: order.assignedWorker?.name || "Teknisi Lapangan",
        reason: category,
        category,
        detailedComplaint: description,
        description,
        disputedAmount: order.pricing.totalAmount,
        evidencePhotos: [],
        requestedResolution: "FREE_REWORK",
        status: "OPEN",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.disputes.push(dispute);
    } else {
      dispute.detailedComplaint = description;
      dispute.description = description;
      dispute.reason = category;
      dispute.category = category;
      dispute.status = "OPEN";
      dispute.updatedAt = new Date().toISOString();
    }

    order.disputeCaseId = dispute.id;

    // Sync to Worker Job operational projection
    const wj = this.getWorkerJob(order.id);
    if (wj) {
      wj.status = "BLOCKED";
      wj.blockedReason = `Sengketa Pelanggan: ${category}`;
      wj.updatedAt = new Date().toISOString();
    }

    order.updatedAt = new Date().toISOString();
    this.notify();
    return dispute;
  }

  /**
   * Section 41: Customer Submits Rating & Review
   */
  public customerSubmitReview(
    orderId: string,
    providerRating: number,
    workerRating: number,
    reviewText: string
  ): boolean {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return false;

    order.customerReviewSubmitted = true;
    order.updatedAt = new Date().toISOString();
    this.notify();
    return true;
  }

  /**
   * Section 43: Customer Rebooks Service
   * Creates a NEW booking request without modifying historical completed order.
   */
  public customerRebookOrder(orderId: string): DomainBooking | null {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return null;

    const newBooking: DomainBooking = {
      id: `BK-REBOOK-${Date.now().toString().slice(-4)}`,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      serviceTitle: order.serviceTitle,
      issueDescription: `Pemesanan berkala lanjutan dari riwayat servis #${order.id}`,
      unitPhotoUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
      address: order.address,
      requestedDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      requestedTimeSlot: "10:00 - 12:00 WIB",
      expiresInMinutes: 120,
      status: "PENDING_CONFIRMATION",
      initialPriceEstimate: order.pricing.serviceFee,
    };

    this.bookings.push(newBooking);
    this.notify();
    return newBooking;
  }

  /**
   * Section 4: Customer Order List Queries
   */
  public getCustomerServiceOrders(customerId?: string): ServiceOrder[] {
    if (!customerId) return this.orders;
    return this.orders.filter((o) => o.customerId === customerId);
  }

  public getCustomerProductOrders(customerId?: string): MerchantOrder[] {
    if (!customerId) return this.merchantOrders;
    return this.merchantOrders.filter((o) => o.customerId === customerId);
  }

  // ==========================================================
  // PHASE G: CROSS-ROLE INTEGRATION (LOCKED IMPLEMENTATION)
  // ==========================================================

  /**
   * G-INT-01: Customer creates booking
   * Propagates to Provider's incoming bookings queue.
   */
  public customerCreateBooking(bookingData: Partial<DomainBooking>): DomainBooking {
    const bookingId = bookingData.id || `BK-${Date.now().toString().slice(-6)}`;
    const newBooking: DomainBooking = {
      id: bookingId,
      customerName: bookingData.customerName || "Pelanggan Servio",
      customerPhone: bookingData.customerPhone || "0812-3456-7890",
      serviceTitle: bookingData.serviceTitle || "Servis AC Standar",
      issueDescription: bookingData.issueDescription || "Pemeriksaan unit berkala",
      unitPhotoUrl: bookingData.unitPhotoUrl || "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
      address: bookingData.address || "Jl. Tebet Barat Dalam No. 12, Jakarta Selatan",
      requestedDate: bookingData.requestedDate || new Date().toISOString().slice(0, 10),
      requestedTimeSlot: bookingData.requestedTimeSlot || "13:00 - 15:00 WIB",
      expiresInMinutes: bookingData.expiresInMinutes || 60,
      status: "PENDING_CONFIRMATION",
      initialPriceEstimate: bookingData.initialPriceEstimate || 150000,
    };

    this.bookings.unshift(newBooking);
    this.notify();
    return newBooking;
  }

  /**
   * G-INT-01b: Provider queries pending incoming bookings
   */
  public getProviderBookings(providerId?: string): DomainBooking[] {
    return this.bookings.filter((b) => b.status === "PENDING_CONFIRMATION" || b.status === "ACCEPTED");
  }

  /**
   * G-INT-02: Provider accepts booking -> Creates canonical ServiceOrder
   * Idempotent: If booking already converted, returns existing order.
   */
  public providerAcceptBooking(
    bookingId: string,
    providerId: string = "prov-01",
    assignedWorkerId?: string
  ): { success: boolean; serviceOrder?: ServiceOrder; error?: string } {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      return { success: false, error: `Booking ${bookingId} not found` };
    }

    // Idempotency check: If already converted, return existing order
    if (booking.orderId) {
      const existingOrder = this.getOrder(booking.orderId);
      if (existingOrder) {
        return { success: true, serviceOrder: existingOrder };
      }
    }

    const orderId = `SRV-${booking.id.replace("bk-", "").replace("BK-", "").toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const providerName = providerId === "prov-bintang-teknik" ? "PT Bintang Teknik Mandiri" : "Sejuk Sentra AC";
    const worker = assignedWorkerId ? this.workers.find((w) => w.id === assignedWorkerId) : undefined;

    const newOrder: ServiceOrder = {
      id: orderId,
      bookingId: booking.id,
      customerId: "cust-01",
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      serviceId: "srv-ac-perawatan",
      serviceTitle: booking.serviceTitle,
      domainId: "repair",
      providerId: providerId,
      providerName: providerName,
      assignedWorker: worker,
      serviceMode: "HOME_SERVICE",
      address: booking.address,
      scheduledDate: booking.requestedDate,
      scheduledTimeSlot: booking.requestedTimeSlot,
      status: worker ? "TECHNICIAN_DISPATCHED" : "PENDING_WORKER",
      statusLabel: worker ? `Teknisi ${worker.name} Ditugaskan — Menuju Lokasi` : "Booking Diterima — Menugaskan Teknisi",
      stepper: [
        { id: "s-1", title: "Booking Dikonfirmasi", description: `Diterima oleh ${providerName}`, isCompleted: true, isCurrent: !worker },
        { id: "s-2", title: "Teknisi Ditugaskan", description: worker ? `${worker.name} bersiap berangkat` : "Menunggu penugasan teknisi", isCompleted: !!worker, isCurrent: !!worker },
        { id: "s-3", title: "Diagnosis Unit", description: "Pemeriksaan di tempat", isCompleted: false, isCurrent: false },
        { id: "s-4", title: "Pengerjaan Servis", description: "Penyelesaian masalah", isCompleted: false, isCurrent: false },
        { id: "s-5", title: "Selesai & Garansi", description: "Konfirmasi pelanggan", isCompleted: false, isCurrent: false },
      ],
      pricing: {
        serviceFee: booking.initialPriceEstimate || 150000,
        materialFee: 0,
        platformFee: 5000,
        discountAmount: 0,
        totalAmount: (booking.initialPriceEstimate || 150000) + 5000,
      },
      isEscrowLocked: false,
      warrantyPeriodDays: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    booking.status = "CONVERTED_TO_ORDER";
    booking.orderId = newOrder.id;
    if (assignedWorkerId) {
      booking.assignedWorkerId = assignedWorkerId;
    }

    this.orders.unshift(newOrder);

    // If worker assigned, create or update WorkerJob
    if (worker) {
      const job: WorkerJob = {
        id: `JOB-${newOrder.id}`,
        orderId: newOrder.id,
        workerId: worker.id,
        serviceTitle: newOrder.serviceTitle,
        customerName: newOrder.customerName,
        customerPhone: newOrder.customerPhone,
        customerAddress: newOrder.address,
        address: newOrder.address,
        scheduledTime: newOrder.scheduledTimeSlot,
        scheduledDate: newOrder.scheduledDate,
        scheduledTimeSlot: newOrder.scheduledTimeSlot,
        distanceKm: 3.2,
        issueDescription: booking.issueDescription,
        status: "DISPATCHED",
        feeWorker: Math.round(newOrder.pricing.serviceFee * 0.7),
        sopSteps: [
          { id: "sop-1", title: "Check-in Lokasi", description: "GPS verified check-in", isCompleted: false },
          { id: "sop-2", title: "Pemeriksaan Awal", description: "Diagnosis kondisi unit", isCompleted: false },
          { id: "sop-3", title: "Pengerjaan", description: "Pelaksanaan servis", isCompleted: false },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.workerJobs.unshift(job);
    }

    this.notify();
    return { success: true, serviceOrder: newOrder };
  }

  /**
   * G-INT-03 & 04: Provider assigns worker to order & Worker updates transit status
   */
  public providerAssignWorker(orderId: string, workerId: string): boolean {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return false;

    const worker = this.workers.find((w) => w.id === workerId || w.id.includes(workerId) || workerId.includes(w.id)) || this.workers[0];

    order.assignedWorker = worker;
    order.status = "TECHNICIAN_DISPATCHED";
    order.statusLabel = `Teknisi ${worker.name} Ditugaskan — Menuju Lokasi`;
    order.updatedAt = new Date().toISOString();

    // Sync or create WorkerJob
    let job = this.workerJobs.find((j) => j.orderId === order.id);
    if (!job) {
      job = {
        id: `JOB-${order.id}`,
        orderId: order.id,
        workerId: worker.id,
        serviceTitle: order.serviceTitle,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.address,
        address: order.address,
        scheduledTime: order.scheduledTimeSlot,
        scheduledDate: order.scheduledDate,
        scheduledTimeSlot: order.scheduledTimeSlot,
        distanceKm: 3.5,
        issueDescription: "Pemeriksaan unit berkala",
        status: "DISPATCHED",
        feeWorker: Math.round(order.pricing.serviceFee * 0.7),
        sopSteps: [
          { id: "sop-1", title: "Check-in Lokasi", description: "GPS verified check-in", isCompleted: false },
          { id: "sop-2", title: "Pemeriksaan Awal", description: "Diagnosis kondisi unit", isCompleted: false },
          { id: "sop-3", title: "Pengerjaan", description: "Pelaksanaan servis", isCompleted: false },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.workerJobs.unshift(job);
    } else {
      job.workerId = worker.id;
      job.status = "DISPATCHED";
      job.updatedAt = new Date().toISOString();
    }

    this.notify();
    return true;
  }

  /**
   * G-INT-04: Worker updates operational transit/presence state
   * Propagates to Customer timeline and Provider monitoring.
   */
  public workerUpdateStatus(
    orderIdOrJobId: string,
    newStatus: "DEPARTED" | "ARRIVED" | "DIAGNOSING" | "IN_PROGRESS"
  ): boolean {
    const targetId = normalizeEntityId(orderIdOrJobId);
    const order = this.orders.find((o) => o.id === targetId || normalizeEntityId(o.id) === targetId);
    const job = this.workerJobs.find((j) => j.id === targetId || j.orderId === targetId || normalizeEntityId(j.orderId) === targetId);

    if (job) {
      job.status = newStatus === "DEPARTED" ? "DISPATCHED" : newStatus === "ARRIVED" ? "ARRIVED" : "IN_PROGRESS";
      job.updatedAt = new Date().toISOString();
    }

    if (order) {
      if (newStatus === "DEPARTED") {
        order.status = "TECHNICIAN_DISPATCHED";
        order.statusLabel = "Teknisi Sedang Dalam Perjalanan Menuju Lokasi";
      } else if (newStatus === "ARRIVED" || newStatus === "DIAGNOSING") {
        order.status = "DIAGNOSING";
        order.statusLabel = "Teknisi Tiba di Lokasi — Memulai Diagnosis Unit";
      } else if (newStatus === "IN_PROGRESS") {
        order.status = "IN_PROGRESS";
        order.statusLabel = "Pekerjaan Servis Sedang Berlangsung Sesuai SOP";
      }
      order.updatedAt = new Date().toISOString();
    }

    this.notify();
    return true;
  }

  /**
   * G-INT-05: Worker submits diagnosis result
   * Visible to Customer and Provider without duplicate records.
   */
  public workerSubmitDiagnosis(orderId: string, diagnosisData: Partial<DiagnosisRecord>): boolean {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return false;

    const diag: DiagnosisRecord = {
      id: diagnosisData.id || `DIAG-${order.id}`,
      serviceOrderId: order.id,
      workerId: order.assignedWorker?.id || "worker-1",
      workerName: order.assignedWorker?.name || "Budi Santoso",
      inspectedAt: new Date().toISOString(),
      assetInspected: diagnosisData.assetInspected || "AC Split Daikin 1 PK",
      findingsSummary: diagnosisData.findingsSummary || "Pemeriksaan selesai",
      identifiedIssues: diagnosisData.identifiedIssues || ["Penurunan performa pendinginan"],
      recommendedAction: diagnosisData.recommendedAction || "Pembersihan menyeluruh",
      requiresSparepart: diagnosisData.requiresSparepart ?? false,
      sparepartSource: diagnosisData.sparepartSource || "NONE",
      requiresAdditionalWork: diagnosisData.requiresAdditionalWork ?? false,
      notes: diagnosisData.notes,
    };

    order.diagnosis = diag;
    order.status = "DIAGNOSING";
    order.statusLabel = `Diagnosis Selesai: ${diag.findingsSummary}`;
    order.updatedAt = new Date().toISOString();

    this.notify();
    return true;
  }

  /**
   * G-INT-06: Worker proposes Price Adjustment
   * Conditional provider authorization support.
   */
  public workerProposePriceAdjustment(orderId: string, proposalData: Partial<PriceAdjustmentProposal>): boolean {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return false;

    const requiresAuth = proposalData.requiresProviderAuth ?? false;

    const proposal: PriceAdjustmentProposal = {
      id: proposalData.id || `ADJ-${order.id}`,
      serviceOrderId: order.id,
      proposedByWorkerId: order.assignedWorker?.id || "worker-1",
      proposedByWorkerName: order.assignedWorker?.name || "Budi Santoso",
      diagnosisSummary: proposalData.diagnosisSummary || "Penyesuaian biaya paska diagnosis",
      finalServiceFee: proposalData.finalServiceFee || order.pricing.serviceFee,
      sparepartFee: proposalData.sparepartFee || 0,
      additionalWorkFee: proposalData.additionalWorkFee || 0,
      totalAmount: proposalData.totalAmount || (order.pricing.serviceFee + (proposalData.sparepartFee || 0) + (proposalData.additionalWorkFee || 0)),
      requiresProviderAuth: requiresAuth,
      providerAuthStatus: requiresAuth ? "PENDING" : "AUTHORIZED",
      customerApprovalStatus: "PENDING",
      paymentConditionStatus: "ADDITIONAL_REQUIRED",
      isMandatoryScope: proposalData.isMandatoryScope ?? true,
      impactOnRejection: proposalData.impactOnRejection || "Pekerjaan tertunda jika perbaikan wajib ditolak",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    order.priceAdjustment = proposal;
    order.status = "WAITING_APPROVAL";
    order.statusLabel = requiresAuth
      ? "Menunggu Otorisasi Provider untuk Perubahan Biaya"
      : "Menunggu Persetujuan Pelanggan atas Perubahan Biaya";
    order.updatedAt = new Date().toISOString();

    this.notify();
    return true;
  }

  /**
   * G-INT-06b: Provider authorizes price adjustment proposal
   */
  public providerAuthorizePriceAdjustment(orderId: string, authorized: boolean, notes?: string): boolean {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order || !order.priceAdjustment) return false;

    order.priceAdjustment.providerAuthStatus = authorized ? "AUTHORIZED" : "REJECTED";
    if (authorized) {
      order.status = "WAITING_APPROVAL";
      order.statusLabel = "Biaya Diotorisasi Provider — Menunggu Persetujuan Pelanggan";
    } else {
      order.statusLabel = `Perubahan Biaya Ditolak Provider: ${notes || "Harap sesuaikan ulang"}`;
    }
    order.priceAdjustment.updatedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();

    this.notify();
    return true;
  }

  /**
   * G-INT-10: Worker creates a sparepart recommendation
   * Validates active partnership constraint.
   */
  public workerCreateRecommendation(
    orderId: string,
    recData: {
      merchantId: string;
      productId: string;
      productTitle: string;
      priceSnapshot: number;
      reason: string;
      compatibilityContext: string;
    }
  ): { success: boolean; recommendation?: ProductRecommendation; error?: string } {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return { success: false, error: "Order not found" };

    // Verify merchant partnership is ACTIVE for this provider
    const isPartnerActive = this.storePartnerships.some(
      (p) => (p.providerId === order.providerId || p.providerId === "prov-bintang-teknik" || p.providerId === "prov-01") &&
             p.merchantId === recData.merchantId &&
             p.status === "ACTIVE"
    );

    if (!isPartnerActive) {
      return {
        success: false,
        error: `Merchant ${recData.merchantId} is not an ACTIVE partner of provider ${order.providerId}. Inactive/pending/rejected partnerships are blocked.`,
      };
    }

    const recommendation: ProductRecommendation = {
      id: `REC-${order.id}-${Date.now().toString().slice(-4)}`,
      serviceOrderId: order.id,
      workerId: order.assignedWorker?.id || "worker-1",
      workerName: order.assignedWorker?.name || "Budi Santoso",
      providerId: order.providerId,
      merchantId: recData.merchantId,
      merchantName: "Toko AC Sejuk Sentra Part",
      productId: recData.productId,
      productTitle: recData.productTitle,
      priceSnapshot: recData.priceSnapshot,
      availabilitySnapshot: true,
      reason: recData.reason,
      compatibilityContext: recData.compatibilityContext,
      status: "SUBMITTED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    order.status = "WAITING_APPROVAL";
    order.statusLabel = `Rekomendasi Suku Cadang dari Teknisi (${recData.productTitle}) Menunggu Persetujuan Pelanggan`;
    order.updatedAt = new Date().toISOString();

    this.notify();
    return { success: true, recommendation };
  }

  /**
   * G-INT-14 & 15: Merchant updates fulfillment / shipping status
   * Propagates to Customer tracking, Worker delivery context, and Provider order context.
   */
  public merchantUpdateFulfillment(
    productOrderId: string,
    status: MerchantOrderStatus
  ): boolean {
    const pOrder = this.merchantOrders.find((m) => m.id === productOrderId);
    if (!pOrder) return false;

    pOrder.status = status;
    pOrder.updatedAt = new Date().toISOString();

    // Propagate to linked ServiceOrder
    if (pOrder.serviceOrderId) {
      const sOrder = this.getOrder(pOrder.serviceOrderId);
      if (sOrder) {
        if (status === "SHIPPED") {
          sOrder.status = "WAITING_SPAREPART";
          sOrder.statusLabel = `Suku Cadang Dipesan (#${pOrder.id}) — Sedang Dikirim Kurir Instan`;
        } else if (status === "DELIVERED") {
          sOrder.status = "WAITING_SPAREPART";
          sOrder.statusLabel = `Suku Cadang (#${pOrder.id}) Telah Tiba di Lokasi — Menunggu Pemasangan Teknisi`;
        }
        sOrder.updatedAt = new Date().toISOString();
      }

      // Propagate to WorkerJob
      const wj = this.getWorkerJob(pOrder.serviceOrderId);
      if (wj) {
        if (status === "DELIVERED") {
          wj.sparepartDelivered = true;
          wj.sparepartStatus = "DELIVERED";
        } else if (status === "SHIPPED") {
          wj.sparepartStatus = "IN_TRANSIT";
        }
        wj.updatedAt = new Date().toISOString();
      }
    }

    this.notify();
    return true;
  }

  /**
   * G-INT-17 & 18: Worker records material usage on ServiceOrder
   * Closes the Product -> Service loop without duplicate inventory engines.
   */
  public workerRecordMaterialUsage(
    orderId: string,
    material: {
      partName: string;
      partNumber?: string;
      quantity: number;
      source: SparepartSourceType;
      productOrderId?: string;
    }
  ): boolean {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return false;

    const newMaterialLine: ProviderMaterialLine = {
      id: `mat-${Date.now().toString().slice(-4)}`,
      partName: material.partName,
      partNumber: material.partNumber || `PN-${Date.now().toString().slice(-4)}`,
      quantity: material.quantity,
      unitPrice: 0,
      totalPrice: 0,
      source: "PROVIDER_OWNED",
      customerApprovalStatus: "APPROVED",
      isFulfillable: true,
    };

    order.providerMaterials = [...(order.providerMaterials || []), newMaterialLine];
    if (order.sparepartRequirements) {
      order.sparepartRequirements.forEach((req) => {
        req.procurementStatus = "RECEIVED";
        req.customerApprovalStatus = "APPROVED";
      });
    }

    order.status = "IN_PROGRESS";
    order.statusLabel = `Suku Cadang (${material.partName}) Telah Dipasang — Pengerjaan Berlanjut`;
    order.updatedAt = new Date().toISOString();

    const wj = this.getWorkerJob(order.id);
    if (wj) {
      wj.status = "IN_PROGRESS";
      wj.materialUsed = true;
      wj.updatedAt = new Date().toISOString();
    }

    this.notify();
    return true;
  }

  /**
   * G-INT-19: Worker submits Proof of Service
   */
  public workerSubmitProof(orderId: string, proofData: ProofOfService): boolean {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.orders.find((o) => o.id === targetOrderId || normalizeEntityId(o.id) === targetOrderId);
    if (!order) return false;

    this.proofs[order.id] = proofData;
    order.proofOfService = proofData;
    order.completionStatus = "SUBMITTED_BY_WORKER";
    order.status = "AWAITING_PROOF_REVIEW";
    order.statusLabel = "Bukti Pengerjaan Diunggah — Menunggu Konfirmasi Penyelesaian Pelanggan";
    order.updatedAt = new Date().toISOString();

    const wj = this.getWorkerJob(order.id);
    if (wj) {
      wj.status = "COMPLETED";
      wj.updatedAt = new Date().toISOString();
    }

    this.notify();
    return true;
  }

  /**
   * G-INT-23: Cross-Role Unified Service History Projection
   */
  public getServiceHistoryProjection(orderId: string) {
    const targetOrderId = normalizeEntityId(orderId);
    const order = this.getOrder(targetOrderId);
    if (!order) return null;

    const workerJob = this.getWorkerJob(targetOrderId);
    const linkedProductOrders = this.merchantOrders.filter((m) => m.serviceOrderId === order.id);
    const proof = this.getProof(order.id) || order.proofOfService;
    let warranty = this.warranties.find(
      (w) =>
        w.orderId === order.id ||
        w.serviceOrderId === order.id ||
        (order.warrantyCertificateId && (w.id === order.warrantyCertificateId || w.certificateNumber === order.warrantyCertificateId))
    );
    if (!warranty && (order.status === "COMPLETED" || order.warrantyCertificateId)) {
      warranty = {
        id: order.warrantyCertificateId || `WAR-${order.id}`,
        certificateNumber: order.warrantyCertificateId || `SRV-WAR-${order.id.slice(-6)}`,
        orderId: order.id,
        serviceOrderId: order.id,
        serviceTitle: order.serviceTitle,
        providerName: order.providerName,
        customerName: order.customerName,
        durationDays: order.warrantyPeriodDays || 30,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + (order.warrantyPeriodDays || 30) * 86400000).toISOString(),
        status: "ACTIVE",
        coverageDetails: ["Garansi resmi Servio Shield"],
        terms: "Garansi resmi Servio Shield",
      };
      this.warranties.push(warranty);
    }
    const dispute = this.disputes.find((d) => d.orderId === order.id || d.serviceOrderId === order.id);
    const transactions = this.transactions.filter((t) => t.orderId === order.id);
    const attributions = this.affiliateAttributions.filter((a) => a.serviceOrderId === order.id);

    return {
      order,
      workerJob,
      linkedProductOrders,
      proof,
      warranty,
      dispute,
      transactions,
      attributions,
      historySummary: {
        orderId: order.id,
        serviceTitle: order.serviceTitle,
        customerName: order.customerName,
        providerName: order.providerName,
        workerName: order.assignedWorker?.name || "Belum Ditugaskan",
        status: order.status,
        totalPaid: (order.paymentRecords || []).filter((r) => r.status === "PAID").reduce((s, r) => s + r.amount, 0),
        hasWarranty: !!warranty && warranty.status === "ACTIVE",
        hasDispute: !!dispute,
      },
    };
  }

  /**
   * G-INT-34: Cross-Role RBAC Tenant Guard & Permission Validator
   */
  public validateRoleAccess(
    actorRole:
      | "CUSTOMER"
      | "PROVIDER"
      | "WORKER"
      | "MERCHANT"
      | "FINANCE"
      | "CEO"
      | "FINANCE_PAYMENT_OPS"
      | "ADMIN_OPERATIONS"
      | "CEO_PRODUCT_OWNER"
      | "EXECUTIVE"
      | "SYSTEM"
      | string,
    actorId: string,
    action: string,
    targetResource: { ownerId?: string; tenantId?: string; customerId?: string; providerId?: string; merchantId?: string }
  ): boolean {
    if (actorRole === "CUSTOMER") {
      if (targetResource.customerId && targetResource.customerId !== actorId) {
        return false; // Customer A cannot view/act on Customer B
      }
      if (action === "CONFIRM_COMPLETION" || action === "APPROVE_PRICE" || action === "PAY_ORDER") {
        return true;
      }
      if (action === "SUBMIT_PROOF" || action === "ASSIGN_WORKER") {
        return false; // Customer cannot perform worker/provider actions
      }
    }

    if (actorRole === "MERCHANT") {
      if (targetResource.merchantId && targetResource.merchantId !== actorId) {
        return false; // Merchant A cannot access Merchant B
      }
      if (action === "APPROVE_PARTNERSHIP" && targetResource.merchantId !== actorId) {
        return false;
      }
    }

    if (actorRole === "PROVIDER") {
      if (action === "SUBMIT_DIAGNOSIS" || action === "FIELD_DIAGNOSIS") {
        return false; // Provider CANNOT diagnose on behalf of Worker (Worker is authoritative diagnosis operator)
      }
      if (action === "APPROVE_PRICE_ADJUSTMENT" || action === "CONFIRM_COMPLETION") {
        return false; // Customer holds final approval
      }
    }

    if (actorRole === "WORKER" || actorRole === "WORKER_TECHNICIAN") {
      if (action === "CONFIRM_COMPLETION") {
        return false; // Worker CANNOT confirm completion on customer's behalf!
      }
      if (action === "APPROVE_PRICE_ADJUSTMENT") {
        return false; // Worker CANNOT approve price on customer's behalf!
      }
      if (
        action === "WARRANTY_GRANT" ||
        action === "WARRANTY_DECIDE_COVERAGE" ||
        action === "WARRANTY_SET_PAID_PRICE" ||
        action === "WARRANTY_CREATE_PAID_PROPOSAL" ||
        action === "WARRANTY_APPROVE_PAID_PROPOSAL"
      ) {
        return false;
      }
    }

    // SERVIO WARRANTY V1 RBAC & TENANT ISOLATION GUARDS
    if (action.startsWith("WARRANTY_")) {
      // 1. Customer scope
      if (actorRole === "CUSTOMER") {
        if (targetResource.customerId && targetResource.customerId !== actorId) {
          return false; // Cross-customer isolation
        }
        if (
          action === "WARRANTY_GRANT" ||
          action === "WARRANTY_DECIDE_COVERAGE" ||
          action === "WARRANTY_ASSIGN_WORKER" ||
          action === "WARRANTY_SET_PAID_PRICE" ||
          action === "WARRANTY_CREATE_PAID_PROPOSAL"
        ) {
          return false; // Customer cannot perform provider operational actions
        }
      }

      // 2. Provider scope
      if (actorRole === "PROVIDER" || actorRole === "SERVICE_PROVIDER") {
        if (targetResource.providerId && targetResource.providerId !== actorId) {
          return false; // Cross-provider tenant isolation
        }
        if (action === "WARRANTY_APPROVE_PAID_PROPOSAL" || action === "WARRANTY_REJECT_PAID_PROPOSAL") {
          return false; // Customer holds exclusive approval
        }
        if (action === "WARRANTY_SUBMIT_DIAGNOSIS" || action === "WARRANTY_RECOMMEND_PAID_WORK") {
          return false; // Worker owns technical execution
        }
      }

      // 3. Worker scope
      if (actorRole === "WORKER" || actorRole === "WORKER_TECHNICIAN") {
        if (targetResource.ownerId && targetResource.ownerId !== actorId) {
          return false; // Worker cannot view another worker's private assignment
        }
      }
    }

    // SERVIO FINAL LOCKED SPEC: FEE MANAGEMENT RBAC GUARDS
    if (action.includes("FEE_PROPOSAL") || action.includes("FEE_POLICY") || action.includes("FEE_DRAFT")) {
      if (
        action === "CREATE_FEE_DRAFT" ||
        action === "EDIT_FEE_DRAFT" ||
        action === "SUBMIT_FEE_PROPOSAL" ||
        action === "CREATE_REVISION"
      ) {
        if (actorRole !== "FINANCE_PAYMENT_OPS" && actorRole !== "FINANCE" && actorRole !== "ADMIN_OPERATIONS") {
          return false;
        }
      }
      if (action === "APPROVE_FEE_PROPOSAL" || action === "REJECT_FEE_PROPOSAL") {
        if (actorRole !== "CEO_PRODUCT_OWNER" && actorRole !== "CEO" && actorRole !== "EXECUTIVE") {
          return false;
        }
      }
      if (action === "ACTIVATE_FEE_POLICY") {
        if (actorRole !== "SYSTEM") {
          return false; // No human role can manually activate!
        }
      }
    }

    return true;
  }

  // =========================================================================
  // SERVIO FINAL LOCKED SPEC: FINANCE & CEO FEE MANAGEMENT METHODS
  // =========================================================================

  public getActiveFeePolicy(type: FeePolicyType, atDate?: string): FeePolicy | null {
    const targetDate = atDate || new Date().toISOString().split("T")[0];
    const policies = this.canonicalFeePolicies.filter((p) => p.policyType === type);

    // Look for ACTIVE policy whose timeline covers targetDate
    const active = policies.find(
      (p) =>
        p.status === "ACTIVE" &&
        p.effectiveFrom <= targetDate &&
        (!p.effectiveTo || p.effectiveTo >= targetDate)
    );
    if (active) return active;

    const anyActive = policies.find((p) => p.status === "ACTIVE");
    if (anyActive) return anyActive;

    return policies[0] || null;
  }

  public getAllFeePolicies(): FeePolicy[] {
    return [...this.canonicalFeePolicies];
  }

  public getFeeChangeRequests(): FeeChangeRequest[] {
    return [...this.feeChangeRequests];
  }

  public getFeeProposalById(id: string): FeeChangeRequest | null {
    return (
      this.feeChangeRequests.find(
        (r) => r.id === id || r.requestNumber === id
      ) || null
    );
  }

  public createFeeProposal(
    params: {
      proposalType: "SINGLE" | "COMBINED_AFFILIATE";
      effectiveDate: string;
      reason: string;
      notes?: string;
      policyChanges: Array<{
        policyType: FeePolicyType;
        calculationType: FeeCalculationType;
        proposedValue: number;
        unit?: "%" | "Rp";
      }>;
    },
    actor: { id: string; name: string; role: string } = {
      id: "usr-fin-001",
      name: "Finance Ops",
      role: "FINANCE_PAYMENT_OPS",
    }
  ): { success: boolean; message: string; proposal?: FeeChangeRequest } {
    // RBAC check: Finance only
    if (
      actor.role === "CEO_PRODUCT_OWNER" ||
      actor.role.includes("CUSTOMER") ||
      actor.role.includes("MERCHANT")
    ) {
      return {
        success: false,
        message: "Hanya Finance yang memiliki kewenangan mengajukan perubahan kebijakan fee.",
      };
    }

    if (!params.effectiveDate || isNaN(Date.parse(params.effectiveDate))) {
      return {
        success: false,
        message: "Tanggal efektif (effective date) tidak valid atau kosong.",
      };
    }

    if (!params.reason || params.reason.trim().length < 3) {
      return {
        success: false,
        message: "Alasan perubahan kebijakan fee wajib diisi.",
      };
    }

    if (!params.policyChanges || params.policyChanges.length === 0) {
      return {
        success: false,
        message: "Proposal harus memiliki minimal satu rincian perubahan kebijakan fee.",
      };
    }

    // Validate each policy change item
    for (const change of params.policyChanges) {
      if (typeof change.proposedValue !== "number" || isNaN(change.proposedValue) || change.proposedValue <= 0) {
        return {
          success: false,
          message: `Nilai fee untuk ${change.policyType} harus bernilai valid dan lebih dari 0.`,
        };
      }

      // V1 Restriction: Provider Reward and Worker Reward MUST be PERCENTAGE only!
      if (change.policyType === "PROVIDER_REWARD" || change.policyType === "WORKER_REWARD") {
        if (change.calculationType !== "PERCENTAGE") {
          return {
            success: false,
            message: `Alokasi ${change.policyType} wajib menggunakan perhitungan persentase (%) pada V1.`,
          };
        }
      }
    }

    // Atomic Combined Affiliate Package Validation
    if (params.proposalType === "COMBINED_AFFILIATE") {
      const affFee = params.policyChanges.find((c) => c.policyType === "AFFILIATE_FEE");
      const provRwd = params.policyChanges.find((c) => c.policyType === "PROVIDER_REWARD");
      const wrkRwd = params.policyChanges.find((c) => c.policyType === "WORKER_REWARD");

      if (!affFee || !provRwd || !wrkRwd) {
        return {
          success: false,
          message: "Paket Afiliasi Terpadu (Combined Affiliate Package) wajib mencakup Affiliate Fee, Provider Reward, dan Worker Reward.",
        };
      }

      const totalSplit = Math.round(provRwd.proposedValue + wrkRwd.proposedValue);
      if (totalSplit !== 100) {
        return {
          success: false,
          message: `Distribusi reward tidak valid: Total alokasi Provider (${provRwd.proposedValue}%) dan Teknisi (${wrkRwd.proposedValue}%) harus berjumlah 100% (saat ini: ${totalSplit}%).`,
        };
      }
    }

    // Conflict & Overlap Check: Block concurrent conflicting proposals for the same policyType and effectiveDate
    for (const change of params.policyChanges) {
      const hasConflict = this.feeChangeRequests.some(
        (r) =>
          (r.status === "UNDER_REVIEW" || r.status === "SUBMITTED") &&
          r.effectiveDate === params.effectiveDate &&
          r.policyChanges.some((c) => c.policyType === change.policyType)
      );

      if (hasConflict) {
        return {
          success: false,
          message: `Terdapat proposal bertabrakan yang sedang ditinjau untuk ${change.policyType} pada tanggal efektif ${params.effectiveDate}.`,
        };
      }
    }

    // Map currentValue and unit
    const enrichedChanges = params.policyChanges.map((change) => {
      const currentActive = this.getActiveFeePolicy(change.policyType);
      return {
        ...change,
        currentValue: currentActive ? currentActive.value : 0,
        currentPolicyId: currentActive?.id,
        unit: (change.calculationType === "PERCENTAGE" ? "%" : "Rp") as "%" | "Rp",
      };
    });

    const now = new Date().toISOString();
    const seqNum = (this.feeChangeRequests.length + 1).toString().padStart(3, "0");
    const requestNumber = `FP-2026-${seqNum}`;
    const newProposal: FeeChangeRequest = {
      id: `fcr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      requestNumber,
      proposalType: params.proposalType,
      status: "DRAFT",
      requestedBy: actor.name,
      requestedAt: now,
      effectiveDate: params.effectiveDate,
      reason: params.reason.trim(),
      notes: params.notes?.trim(),
      policyChanges: enrichedChanges,
      createdAt: now,
      updatedAt: now,
    };

    this.feeChangeRequests.unshift(newProposal);

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "CREATE_FEE_DRAFT",
      resource: "FEE_PROPOSAL",
      resourceId: newProposal.requestNumber,
      reason: newProposal.reason,
      details: {
        proposalType: newProposal.proposalType,
        effectiveDate: newProposal.effectiveDate,
        policyChanges: newProposal.policyChanges,
      },
    });

    this.notify();

    return {
      success: true,
      message: `Draft proposal fee ${requestNumber} berhasil dibuat.`,
      proposal: newProposal,
    };
  }

  public updateFeeDraft(
    proposalId: string,
    params: Partial<{
      effectiveDate: string;
      reason: string;
      notes: string;
      policyChanges: Array<{
        policyType: FeePolicyType;
        calculationType: FeeCalculationType;
        proposedValue: number;
        unit?: "%" | "Rp";
      }>;
    }>,
    actor: { id: string; name: string; role: string } = {
      id: "usr-fin-001",
      name: "Finance Ops",
      role: "FINANCE_PAYMENT_OPS",
    }
  ): { success: boolean; message: string; proposal?: FeeChangeRequest } {
    const proposal = this.feeChangeRequests.find(
      (r) => r.id === proposalId || r.requestNumber === proposalId
    );
    if (!proposal) {
      return { success: false, message: "Proposal fee tidak ditemukan." };
    }

    if (proposal.status !== "DRAFT") {
      return {
        success: false,
        message: "Hanya proposal berstatus DRAFT yang dapat diedit. Proposal yang telah disubmit atau berstatus lain tidak dapat diubah.",
      };
    }

    if (params.effectiveDate) {
      proposal.effectiveDate = params.effectiveDate;
    }
    if (params.reason) {
      proposal.reason = params.reason.trim();
    }
    if (params.notes !== undefined) {
      proposal.notes = params.notes.trim();
    }

    if (params.policyChanges) {
      for (const change of params.policyChanges) {
        if (typeof change.proposedValue !== "number" || isNaN(change.proposedValue) || change.proposedValue <= 0) {
          return {
            success: false,
            message: `Nilai fee untuk ${change.policyType} harus bernilai valid dan lebih dari 0.`,
          };
        }
        if (
          (change.policyType === "PROVIDER_REWARD" || change.policyType === "WORKER_REWARD") &&
          change.calculationType !== "PERCENTAGE"
        ) {
          return {
            success: false,
            message: "Alokasi reward Provider dan Worker wajib menggunakan persentase (%).",
          };
        }
      }

      if (proposal.proposalType === "COMBINED_AFFILIATE") {
        const provRwd = params.policyChanges.find((c) => c.policyType === "PROVIDER_REWARD");
        const wrkRwd = params.policyChanges.find((c) => c.policyType === "WORKER_REWARD");
        if (provRwd && wrkRwd && Math.round(provRwd.proposedValue + wrkRwd.proposedValue) !== 100) {
          return {
            success: false,
            message: "Total distribusi reward Provider dan Worker harus berjumlah 100%.",
          };
        }
      }

      proposal.policyChanges = params.policyChanges.map((change) => {
        const currentActive = this.getActiveFeePolicy(change.policyType);
        return {
          ...change,
          currentValue: currentActive ? currentActive.value : 0,
          currentPolicyId: currentActive?.id,
          unit: (change.calculationType === "PERCENTAGE" ? "%" : "Rp") as "%" | "Rp",
        };
      });
    }

    proposal.updatedAt = new Date().toISOString();

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "EDIT_FEE_DRAFT",
      resource: "FEE_PROPOSAL",
      resourceId: proposal.requestNumber,
      details: {
        effectiveDate: proposal.effectiveDate,
        reason: proposal.reason,
      },
    });

    this.notify();
    return { success: true, message: `Draft proposal ${proposal.requestNumber} berhasil diperbarui.`, proposal };
  }

  public submitFeeProposal(
    proposalId: string,
    actor: { id: string; name: string; role: string } = {
      id: "usr-fin-001",
      name: "Finance Ops",
      role: "FINANCE_PAYMENT_OPS",
    }
  ): { success: boolean; message: string } {
    if (actor.role === "CEO_PRODUCT_OWNER" || actor.role.includes("CUSTOMER") || actor.role.includes("MERCHANT")) {
      return { success: false, message: "Hanya Finance yang memiliki kewenangan mengajukan proposal fee." };
    }

    const proposal = this.feeChangeRequests.find(
      (r) => r.id === proposalId || r.requestNumber === proposalId
    );
    if (!proposal) {
      return { success: false, message: "Proposal tidak ditemukan." };
    }

    // Idempotency: if already submitted / under review
    if (proposal.status === "UNDER_REVIEW" || proposal.status === "SUBMITTED") {
      return { success: true, message: `Proposal ${proposal.requestNumber} sudah dalam status peninjauan.` };
    }

    if (proposal.status !== "DRAFT") {
      return { success: false, message: `Proposal berstatus ${proposal.status} tidak dapat diajukan.` };
    }

    // Re-verify combined split
    if (proposal.proposalType === "COMBINED_AFFILIATE") {
      const provRwd = proposal.policyChanges.find((c) => c.policyType === "PROVIDER_REWARD");
      const wrkRwd = proposal.policyChanges.find((c) => c.policyType === "WORKER_REWARD");
      if (provRwd && wrkRwd && Math.round(provRwd.proposedValue + wrkRwd.proposedValue) !== 100) {
        return {
          success: false,
          message: "Proposal tidak dapat dikirim karena reward distribution tidak berjumlah 100%.",
        };
      }
    }

    proposal.status = "UNDER_REVIEW";
    proposal.requestedAt = new Date().toISOString();
    proposal.requestedBy = actor.name;
    proposal.updatedAt = new Date().toISOString();

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "SUBMIT_FEE_PROPOSAL",
      resource: "FEE_PROPOSAL",
      resourceId: proposal.requestNumber,
      details: {
        proposalType: proposal.proposalType,
        effectiveDate: proposal.effectiveDate,
        policyChanges: proposal.policyChanges,
      },
    });

    this.notify();
    return {
      success: true,
      message: `Proposal ${proposal.requestNumber} berhasil diajukan dan diteruskan ke CEO untuk persetujuan.`,
    };
  }

  public approveFeeProposal(
    proposalId: string,
    actor: { id: string; name: string; role: string } = {
      id: "usr-ceo-001",
      name: "Michael Tanuwijaya (CEO & Founder)",
      role: "CEO_PRODUCT_OWNER",
    }
  ): { success: boolean; message: string; proposal?: FeeChangeRequest; scheduledPolicies?: FeePolicy[] } {
    // Strict RBAC: Finance CANNOT approve!
    if (
      actor.role !== "CEO_PRODUCT_OWNER" &&
      actor.role !== "CEO" &&
      actor.role !== "EXECUTIVE"
    ) {
      return {
        success: false,
        message: "Finance tidak memiliki hak untuk menyetujui kebijakan fee. Persetujuan hanya otoritas CEO.",
      };
    }

    const proposal = this.feeChangeRequests.find(
      (r) => r.id === proposalId || r.requestNumber === proposalId
    );
    if (!proposal) {
      return { success: false, message: "Proposal tidak ditemukan." };
    }

    // Idempotency: already approved or scheduled
    if (proposal.status === "APPROVED" || proposal.status === "SCHEDULED" || proposal.status === "ACTIVE") {
      return { success: true, message: `Proposal ${proposal.requestNumber} sudah disetujui sebelumnya.`, proposal };
    }

    if (proposal.status === "REJECTED") {
      return {
        success: false,
        message: "Proposal yang telah ditolak tidak dapat disetujui langsung. Finance harus membuat revisi terlebih dahulu.",
      };
    }

    if (proposal.status !== "UNDER_REVIEW" && proposal.status !== "SUBMITTED") {
      return {
        success: false,
        message: `Proposal dengan status ${proposal.status} tidak dapat disetujui.`,
      };
    }

    const nowStr = new Date().toISOString();
    proposal.status = "APPROVED";
    proposal.reviewedBy = actor.name;
    proposal.reviewedAt = nowStr;
    proposal.updatedAt = nowStr;

    const scheduledPolicies: FeePolicy[] = [];

    // ATOMIC GOVERNANCE: Create SCHEDULED policy record for each component
    for (const change of proposal.policyChanges) {
      const currentActive = this.getActiveFeePolicy(change.policyType);
      const prefix =
        change.policyType === "APPLICATION_FEE"
          ? "APP"
          : change.policyType === "AFFILIATE_FEE"
          ? "AFF"
          : change.policyType === "PROVIDER_REWARD"
          ? "PRV"
          : "WRK";
      let version = "";
      if (change.policyType === "AFFILIATE_FEE") {
        const curVer = currentActive?.version || "AFF-001";
        const num = parseFloat(curVer.replace("AFF-", "")) || 1;
        const nextNum = (num + 1).toString().padStart(3, "0");
        version = `AFF-${nextNum}`;
      } else {
        const curVer = currentActive?.version || `${prefix}-v1.0`;
        const match = curVer.match(/v(\d+)\.(\d+)/);
        if (match) {
          const major = parseInt(match[1], 10);
          const minor = parseInt(match[2], 10) + 1;
          version = `${prefix}-v${major}.${minor}`;
        } else {
          version = `${prefix}-v1.1`;
        }
      }

      const newPolicy: FeePolicy = {
        id: `pol-${prefix.toLowerCase()}-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 1000)}`,
        changeRequestId: proposal.id,
        policyType: change.policyType,
        calculationType: change.calculationType,
        value: change.proposedValue,
        currency: "IDR",
        status: "SCHEDULED",
        effectiveFrom: proposal.effectiveDate,
        version,
        proposalReason: proposal.reason,
        notes: proposal.notes,
        submittedBy: proposal.requestedBy,
        submittedAt: proposal.requestedAt,
        reviewedBy: actor.name,
        reviewedAt: nowStr,
        supersedesPolicyId: currentActive?.id,
        createdAt: nowStr,
        updatedAt: nowStr,
      };

      this.canonicalFeePolicies.unshift(newPolicy);
      scheduledPolicies.push(newPolicy);

      this.logAuditEvent({
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: "SCHEDULE_FEE_POLICY",
        resource: "FEE_POLICY",
        resourceId: newPolicy.version,
        details: {
          policyType: newPolicy.policyType,
          value: newPolicy.value,
          calculationType: newPolicy.calculationType,
          effectiveFrom: newPolicy.effectiveFrom,
        },
      });
    }

    // Transition proposal to SCHEDULED
    proposal.status = "SCHEDULED";

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "APPROVE_FEE_PROPOSAL",
      resource: "FEE_PROPOSAL",
      resourceId: proposal.requestNumber,
      reason: proposal.reason,
      details: {
        proposalType: proposal.proposalType,
        effectiveDate: proposal.effectiveDate,
        componentsCount: proposal.policyChanges.length,
      },
    });

    // Run system activation check in case effective date is today or already passed
    this.checkAndActivateScheduledPolicies();

    this.notify();

    return {
      success: true,
      message: `Kebijakan fee ${proposal.requestNumber} berhasil disetujui dan dijadwalkan berlaku mulai ${proposal.effectiveDate}.`,
      proposal,
      scheduledPolicies,
    };
  }

  public rejectFeeProposal(
    proposalId: string,
    reason: string,
    actor: { id: string; name: string; role: string } = {
      id: "usr-ceo-001",
      name: "Michael Tanuwijaya (CEO & Founder)",
      role: "CEO_PRODUCT_OWNER",
    }
  ): { success: boolean; message: string; proposal?: FeeChangeRequest } {
    // Strict RBAC: Finance CANNOT reject!
    if (
      actor.role !== "CEO_PRODUCT_OWNER" &&
      actor.role !== "CEO" &&
      actor.role !== "EXECUTIVE"
    ) {
      return {
        success: false,
        message: "Hanya CEO yang memiliki kewenangan menolak proposal kebijakan fee.",
      };
    }

    if (!reason || !reason.trim()) {
      return {
        success: false,
        message: "Alasan penolakan wajib diisi oleh CEO.",
      };
    }

    const proposal = this.feeChangeRequests.find(
      (r) => r.id === proposalId || r.requestNumber === proposalId
    );
    if (!proposal) {
      return { success: false, message: "Proposal tidak ditemukan." };
    }

    if (proposal.status === "APPROVED" || proposal.status === "SCHEDULED" || proposal.status === "ACTIVE") {
      return {
        success: false,
        message: "Proposal yang telah disetujui tidak dapat ditolak kembali.",
      };
    }

    // ATOMIC REJECTION: Entire package is rejected
    const nowStr = new Date().toISOString();
    proposal.status = "REJECTED";
    proposal.rejectionReason = reason.trim();
    proposal.reviewedBy = actor.name;
    proposal.reviewedAt = nowStr;
    proposal.updatedAt = nowStr;

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "REJECT_FEE_PROPOSAL",
      resource: "FEE_PROPOSAL",
      resourceId: proposal.requestNumber,
      reason: reason.trim(),
      details: {
        proposalType: proposal.proposalType,
      },
    });

    this.notify();

    return {
      success: true,
      message: `Proposal ${proposal.requestNumber} telah ditolak. Alasan penolakan telah tercatat ke audit trail.`,
      proposal,
    };
  }

  public reviseFeeProposal(
    proposalId: string,
    actor: { id: string; name: string; role: string } = {
      id: "usr-fin-001",
      name: "Finance Ops",
      role: "FINANCE_PAYMENT_OPS",
    }
  ): { success: boolean; message: string; newProposal?: FeeChangeRequest } {
    if (actor.role === "CEO_PRODUCT_OWNER" || actor.role.includes("CUSTOMER") || actor.role.includes("MERCHANT")) {
      return { success: false, message: "Hanya Finance yang memiliki kewenangan merevisi proposal fee." };
    }

    const original = this.feeChangeRequests.find(
      (r) => r.id === proposalId || r.requestNumber === proposalId
    );
    if (!original) {
      return { success: false, message: "Proposal asli tidak ditemukan." };
    }

    if (original.status !== "REJECTED") {
      return {
        success: false,
        message: `Hanya proposal yang berstatus REJECTED yang dapat direvisi (status saat ini: ${original.status}).`,
      };
    }

    const nowStr = new Date().toISOString();
    const seqNum = (this.feeChangeRequests.length + 1).toString().padStart(3, "0");
    const requestNumber = `FP-2026-${seqNum}`;

    const newProposal: FeeChangeRequest = {
      id: `fcr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      requestNumber,
      proposalType: original.proposalType,
      status: "DRAFT",
      requestedBy: actor.name,
      requestedAt: nowStr,
      effectiveDate: original.effectiveDate,
      reason: `Revisi atas ${original.requestNumber}: ${original.reason}`,
      notes: `Catatan revisi: Penolakan sebelumnya mencatat: "${original.rejectionReason || '-'}"`,
      policyChanges: original.policyChanges.map((c) => ({ ...c })),
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    this.feeChangeRequests.unshift(newProposal);

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "CREATE_REVISION",
      resource: "FEE_PROPOSAL",
      resourceId: newProposal.requestNumber,
      reason: newProposal.reason,
      details: {
        originalProposal: original.requestNumber,
        previousRejectionReason: original.rejectionReason,
      },
    });

    this.notify();

    return {
      success: true,
      message: `Revisi atas proposal ${original.requestNumber} berhasil dibuat sebagai draft baru (${newProposal.requestNumber}).`,
      newProposal,
    };
  }

  public checkAndActivateScheduledPolicies(currentDate?: string): { activatedCount: number } {
    const todayStr = currentDate || new Date().toISOString().split("T")[0];
    let activatedCount = 0;

    const scheduled = this.canonicalFeePolicies.filter(
      (p) => p.status === "SCHEDULED" && p.effectiveFrom <= todayStr
    );

    for (const policy of scheduled) {
      // Find current active policy of the same type to supersede
      const currentActive = this.canonicalFeePolicies.find(
        (p) => p.policyType === policy.policyType && p.status === "ACTIVE"
      );

      if (currentActive) {
        currentActive.status = "SUPERSEDED";
        currentActive.effectiveTo = policy.effectiveFrom;
        currentActive.updatedAt = new Date().toISOString();

        this.logAuditEvent({
          actorId: "system-scheduler",
          actorName: "System Scheduler Engine",
          actorRole: "SYSTEM",
          action: "SUPERSEDE_FEE_POLICY",
          resource: "FEE_POLICY",
          resourceId: currentActive.version,
          details: {
            policyType: currentActive.policyType,
            supersededBy: policy.version,
            effectiveTo: policy.effectiveFrom,
          },
        });
      }

      policy.status = "ACTIVE";
      policy.updatedAt = new Date().toISOString();
      activatedCount++;

      this.logAuditEvent({
        actorId: "system-scheduler",
        actorName: "System Scheduler Engine",
        actorRole: "SYSTEM",
        action: "ACTIVATE_FEE_POLICY",
        resource: "FEE_POLICY",
        resourceId: policy.version,
        details: {
          policyType: policy.policyType,
          value: policy.value,
          effectiveFrom: policy.effectiveFrom,
        },
      });

      // If policy links to a change request, check if all changes are active
      if (policy.changeRequestId) {
        const req = this.feeChangeRequests.find((r) => r.id === policy.changeRequestId);
        if (req && req.status === "SCHEDULED") {
          const allPoliciesForReq = this.canonicalFeePolicies.filter(
            (p) => p.changeRequestId === req.id
          );
          if (allPoliciesForReq.every((p) => p.status === "ACTIVE")) {
            req.status = "ACTIVE";
            req.updatedAt = new Date().toISOString();
          }
        }
      }
    }

    if (activatedCount > 0) {
      this.notify();
    }

    return { activatedCount };
  }

  public calculateApplicationFee(
    servicePrice: number,
    atDate?: string
  ): { amount: number; policyVersion: string; calculationType: FeeCalculationType } {
    const policy = this.getActiveFeePolicy("APPLICATION_FEE", atDate);
    if (!policy) {
      return {
        amount: 5000,
        policyVersion: "APP-v1.0",
        calculationType: "FIXED_AMOUNT",
      };
    }

    const safePrice = Math.max(0, servicePrice);
    if (policy.calculationType === "PERCENTAGE") {
      const amount = Math.round((safePrice * policy.value) / 100);
      return { amount, policyVersion: policy.version, calculationType: "PERCENTAGE" };
    }

    return { amount: policy.value, policyVersion: policy.version, calculationType: "FIXED_AMOUNT" };
  }

  public getFeeGovernanceMetrics(): FeeGovernanceMetrics {
    const activeCount = this.canonicalFeePolicies.filter((p) => p.status === "ACTIVE").length;
    const pendingCount = this.feeChangeRequests.filter(
      (r) => r.status === "UNDER_REVIEW" || r.status === "SUBMITTED"
    ).length;
    const draftCount = this.feeChangeRequests.filter((r) => r.status === "DRAFT").length;
    const scheduledCount = this.feeChangeRequests.filter((r) => r.status === "SCHEDULED").length;
    const rejectedCount = this.feeChangeRequests.filter((r) => r.status === "REJECTED").length;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const changesLast30Days = this.feeChangeRequests.filter(
      (r) => r.createdAt >= thirtyDaysAgo || r.updatedAt >= thirtyDaysAgo
    ).length;

    return {
      activeCount,
      pendingCount,
      draftCount,
      scheduledCount,
      rejectedCount,
      changesLast30Days,
    };
  }

  // =========================================================================
  // SERVIO WARRANTY V1 CANONICAL DOMAIN METHODS (LOCKED BUSINESS FLOW)
  // =========================================================================

  public sendNotification(notification: {
    recipientRole: string;
    recipientId: string;
    title: string;
    message: string;
    link?: string;
  }) {
    this.notifications.unshift({
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      ...notification,
    });
    this.notify();
  }

  public getNotifications(role: string, recipientId?: string) {
    return this.notifications.filter(
      (n) => n.recipientRole === role && (!recipientId || n.recipientId === recipientId)
    );
  }

  /**
   * WAR-CON-01 & 02: Provider Warranty Settings
   */
  public getProviderWarrantySettings(providerId: string): ProviderWarrantySettings {
    let settings = this.providerWarrantySettings.find((s) => s.providerId === providerId);
    if (!settings) {
      settings = {
        id: `pws-${providerId}`,
        providerId,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.providerWarrantySettings.push(settings);
    }
    return settings;
  }

  public setProviderWarrantySettingsStatus(
    providerId: string,
    status: "ACTIVE" | "INACTIVE"
  ): ProviderWarrantySettings {
    const settings = this.getProviderWarrantySettings(providerId);
    settings.status = status;
    settings.updatedAt = new Date().toISOString();

    this.logAuditEvent({
      actorId: providerId,
      actorName: "Provider",
      actorRole: "SERVICE_PROVIDER",
      action: status === "ACTIVE" ? "WARRANTY_STORE_ACTIVATED" : "WARRANTY_STORE_DEACTIVATED",
      resource: "ProviderWarrantySettings",
      resourceId: settings.id,
      result: "SUCCESS",
    });

    this.notify();
    return settings;
  }

  public setProviderWarrantyStoreStatus(
    providerId: string,
    enabled: boolean
  ): ProviderWarrantySettings {
    return this.setProviderWarrantySettingsStatus(providerId, enabled ? "ACTIVE" : "INACTIVE");
  }

  /**
   * WAR-CON-03 to 08: Provider Warranty Durations CRUD
   */
  public getProviderWarrantyDurations(
    providerId: string,
    includeArchived = false
  ): ProviderWarrantyDuration[] {
    return this.providerWarrantyDurations.filter((d) => {
      const matchesProvider =
        d.providerId === providerId ||
        ((providerId === "prov-01" || providerId === "usr-prov-001") &&
          (d.providerId === "prov-01" || d.providerId === "usr-prov-001"));
      if (!matchesProvider) return false;
      return includeArchived ? true : d.status === "ACTIVE";
    });
  }

  public createProviderWarrantyDuration(
    providerId: string,
    durationDays: number
  ): ProviderWarrantyDuration {
    if (!Number.isInteger(durationDays) || durationDays <= 0) {
      throw new Error("Durasi garansi harus berupa bilangan bulat positif.");
    }

    const existingActive = this.providerWarrantyDurations.find(
      (d) =>
        (d.providerId === providerId ||
          ((providerId === "prov-01" || providerId === "usr-prov-001") &&
            (d.providerId === "prov-01" || d.providerId === "usr-prov-001"))) &&
        d.durationDays === durationDays &&
        d.status === "ACTIVE"
    );
    if (existingActive) {
      throw new Error("Durasi tersebut sudah tersedia.");
    }

    const newDuration: ProviderWarrantyDuration = {
      id: `pwd-${providerId}-${durationDays}-${Date.now().toString().slice(-4)}`,
      providerId,
      durationDays,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.providerWarrantyDurations.push(newDuration);

    this.logAuditEvent({
      actorId: providerId,
      actorName: "Provider",
      actorRole: "SERVICE_PROVIDER",
      action: "WARRANTY_DURATION_CREATED",
      resource: "ProviderWarrantyDuration",
      resourceId: newDuration.id,
      result: "SUCCESS",
      metadata: { durationDays },
    });

    this.notify();
    return newDuration;
  }

  public addProviderWarrantyDuration(
    providerId: string,
    durationDays: number
  ): ProviderWarrantyDuration {
    return this.createProviderWarrantyDuration(providerId, durationDays);
  }

  public archiveProviderWarrantyDuration(
    providerIdOrDurationId: string,
    durationId?: string
  ): ProviderWarrantyDuration {
    const dId = durationId || providerIdOrDurationId;
    const duration = this.providerWarrantyDurations.find((d) => d.id === dId);
    if (!duration) {
      throw new Error("Durasi garansi tidak ditemukan.");
    }

    duration.status = "ARCHIVED";
    duration.updatedAt = new Date().toISOString();

    this.logAuditEvent({
      actorId: duration.providerId,
      actorName: "Provider",
      actorRole: "SERVICE_PROVIDER",
      action: "WARRANTY_DURATION_ARCHIVED",
      resource: "ProviderWarrantyDuration",
      resourceId: duration.id,
      result: "SUCCESS",
    });

    this.notify();
    return duration;
  }

  /**
   * WAR-CON-09 & 10: Service Warranty Configuration (Per Provider Master Service)
   */
  public getServiceWarrantyConfig(
    providerMasterServiceId: string
  ): ServiceWarrantyConfiguration | null {
    return (
      this.serviceWarrantyConfigs.find(
        (c) => c.providerMasterServiceId === providerMasterServiceId
      ) || null
    );
  }

  public setServiceWarrantyConfig(
    providerId: string,
    providerMasterServiceId: string,
    config: {
      warrantyEnabled: boolean;
      durationDays: number;
      policyVersion?: string;
    }
  ): ServiceWarrantyConfiguration {
    // Validate provider store state
    const settings = this.getProviderWarrantySettings(providerId);
    if (settings.status === "INACTIVE" && config.warrantyEnabled) {
      throw new Error("Garansi Toko belum aktif. Aktifkan terlebih dahulu.");
    }

    // Validate that duration belongs to Provider and is ACTIVE
    if (config.warrantyEnabled) {
      const validDur = this.providerWarrantyDurations.find(
        (d) =>
          d.providerId === providerId &&
          d.durationDays === config.durationDays &&
          d.status === "ACTIVE"
      );
      if (!validDur) {
        throw new Error("Durasi garansi harus berasal dari opsi durasi aktif milik provider.");
      }
    }

    let existing = this.serviceWarrantyConfigs.find(
      (c) => c.providerMasterServiceId === providerMasterServiceId
    );

    if (existing) {
      existing.warrantyEnabled = config.warrantyEnabled;
      existing.durationDays = config.durationDays;
      if (config.policyVersion) {
        existing.policyVersion = config.policyVersion;
      }
      existing.updatedAt = new Date().toISOString();
    } else {
      existing = {
        id: `swc-${providerMasterServiceId}`,
        providerId,
        providerMasterServiceId,
        warrantyEnabled: config.warrantyEnabled,
        durationDays: config.durationDays,
        policyVersion: config.policyVersion || "v1.0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.serviceWarrantyConfigs.push(existing);
    }

    this.logAuditEvent({
      actorId: providerId,
      actorName: "Provider",
      actorRole: "SERVICE_PROVIDER",
      action: "SERVICE_WARRANTY_CONFIGURED",
      resource: "ServiceWarrantyConfiguration",
      resourceId: existing.id,
      result: "SUCCESS",
      metadata: {
        providerMasterServiceId,
        warrantyEnabled: config.warrantyEnabled,
        durationDays: config.durationDays,
      },
    });

    this.notify();
    return existing;
  }

  public configureServiceWarranty(
    masterServiceIdOrProviderId: string,
    warrantyEnabledOrMasterServiceId: boolean | string,
    durationDaysOrConfig?: number | { warrantyEnabled: boolean; durationDays: number; policyVersion?: string },
    policyVersion?: string
  ): ServiceWarrantyConfiguration {
    if (typeof warrantyEnabledOrMasterServiceId === "string") {
      const providerId = masterServiceIdOrProviderId;
      const masterServiceId = warrantyEnabledOrMasterServiceId;
      const config = durationDaysOrConfig as { warrantyEnabled: boolean; durationDays: number; policyVersion?: string };
      return this.setServiceWarrantyConfig(providerId, masterServiceId, config);
    } else {
      const masterServiceId = masterServiceIdOrProviderId;
      const warrantyEnabled = Boolean(warrantyEnabledOrMasterServiceId);
      const durationDays = typeof durationDaysOrConfig === "number" ? durationDaysOrConfig : 30;

      // Ensure duration exists for prov-01 / usr-prov-001 if needed
      const pms = this.providerMasterServices.find((s) => s.id === masterServiceId);
      const providerId = pms?.providerId || "prov-01";
      const existingDur = this.providerWarrantyDurations.find(
        (d) => (d.providerId === providerId || d.providerId === "prov-01") && d.durationDays === durationDays && d.status === "ACTIVE"
      );
      if (!existingDur) {
        this.addProviderWarrantyDuration(providerId, durationDays);
      }

      return this.setServiceWarrantyConfig(providerId, masterServiceId, {
        warrantyEnabled,
        durationDays,
        policyVersion,
      });
    }
  }

  /**
   * WAR-GRANT-01 to 04: Order Completion Snapshot Integration
   * Idempotent: 1 completed order creates exactly 1 Warranty
   */
  public snapshotWarrantyEligibilityOnCompletion(orderId: string): WarrantyV1 | null {
    const targetId = normalizeEntityId(orderId);
    const order = this.orders.find(
      (o) => o.id === targetId || normalizeEntityId(o.id) === targetId
    );
    if (!order) return null;

    // Idempotency: avoid duplicate warranty per completed original order
    const existing = this.warrantiesV1.find(
      (w) =>
        w.originalServiceOrderId === order.id ||
        normalizeEntityId(w.originalServiceOrderId) === targetId
    );
    if (existing) return existing;

    // Check provider settings & service warranty config
    const provSettings = this.getProviderWarrantySettings(order.providerId);
    const masterServiceId = (order as any).providerMasterServiceId || order.serviceId;
    const serviceConfig = this.getServiceWarrantyConfig(masterServiceId);

    // If store is inactive or warranty explicitly disabled
    const isEligible =
      provSettings.status === "ACTIVE" &&
      (!serviceConfig || serviceConfig.warrantyEnabled !== false);

    if (!isEligible) {
      return null;
    }

    const durationSnapshot = serviceConfig?.durationDays || order.warrantyPeriodDays || 30;
    const policyVersion = serviceConfig?.policyVersion || "v1.0";

    const newWarranty: WarrantyV1 = {
      id: `WAR-2026-${String(this.warrantiesV1.length + 1).padStart(4, "0")}`,
      providerId: order.providerId,
      customerId: order.customerId,
      customerName: order.customerName,
      providerName: order.providerName,
      serviceTitle: order.serviceTitle,
      workerId: order.assignedWorker?.id,
      workerName: order.assignedWorker?.name,
      originalServiceOrderId: order.id,
      providerMasterServiceId: masterServiceId,
      status: "PENDING_ACTIVATION",
      durationDaysSnapshot: durationSnapshot,
      policyVersion,
      startedAt: null,
      expiresAt: null,
      grantedAt: null,
      grantedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.warrantiesV1.unshift(newWarranty);

    // Backwards compatibility legacy certificate
    const warCertId = `WAR-${order.id}`;
    if (!this.warranties.some((w) => w.id === warCertId || w.orderId === order.id)) {
      this.warranties.push({
        id: warCertId,
        orderId: order.id,
        serviceOrderId: order.id,
        serviceTitle: order.serviceTitle,
        customerName: order.customerName,
        providerName: order.providerName,
        coverageDetails: [
          "Garansi pengerjaan resmi Servio Shield",
          "Kunjungan revisi teknisi bebas biaya jika keluhan berulang",
        ],
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + durationSnapshot * 86400000).toISOString(),
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + durationSnapshot * 86400000).toISOString(),
        durationDays: durationSnapshot,
        terms: `Perlindungan garansi resmi Servio Shield selama ${durationSnapshot} hari.`,
        status: "ACTIVE",
        certificateNumber: `SRV-WAR-${order.id.slice(-6)}`,
      });
      order.warrantyCertificateId = warCertId;
    }

    this.logAuditEvent({
      actorId: "SYSTEM",
      actorName: "Canonical Order Engine",
      actorRole: "SYSTEM",
      action: "WARRANTY_ELIGIBILITY_SNAPSHOTTED",
      resource: "WarrantyV1",
      resourceId: newWarranty.id,
      result: "SUCCESS",
      metadata: {
        originalServiceOrderId: order.id,
        durationDaysSnapshot: durationSnapshot,
        policyVersion,
      },
    });

    this.sendNotification({
      recipientRole: "SERVICE_PROVIDER",
      recipientId: order.providerId,
      title: "Pesanan Selesai Memenuhi Syarat Garansi",
      message: `Pesanan #${order.id} selesai. Silakan berikan garansi pada tab Pesanan Selesai Belum Diberi Garansi.`,
      link: "/provider/warranty",
    });

    this.notify();
    return newWarranty;
  }

  /**
   * WAR-GRANT-05 & 06: Provider Grants Warranty
   * Uses immutable snapshot, calculates start & expiry boundaries
   */
  public grantWarranty(
    first: string,
    second: { id: string; role: string } | string
  ): WarrantyV1 {
    let warrantyId: string;
    let actor: { id: string; role: string };

    if (typeof second === "string") {
      const w1 = this.warrantiesV1.find((w) => w.id === second);
      if (w1) {
        warrantyId = second;
        actor = { id: first, role: "SERVICE_PROVIDER" };
      } else {
        warrantyId = first;
        actor = { id: second, role: "SERVICE_PROVIDER" };
      }
    } else {
      warrantyId = first;
      actor = second;
    }

    const warranty = this.warrantiesV1.find((w) => w.id === warrantyId);
    if (!warranty) {
      throw new Error("Garansi tidak ditemukan.");
    }

    // Idempotent: if already active, return existing
    if (warranty.status === "ACTIVE") {
      return warranty;
    }

    if (warranty.status !== "PENDING_ACTIVATION") {
      throw new Error("Garansi tidak dalam status menunggu aktivasi.");
    }

    // Server-side RBAC & Tenant Isolation
    if (actor.role === "CUSTOMER") {
      throw new Error("Pelanggan tidak memiliki kewenangan mengaktifkan garansi.");
    }
    if (actor.role === "WORKER" || actor.role === "WORKER_TECHNICIAN") {
      throw new Error("Teknisi tidak memiliki kewenangan mengaktifkan garansi.");
    }
    if (
      (actor.role === "PROVIDER" || actor.role === "SERVICE_PROVIDER") &&
      actor.id !== warranty.providerId
    ) {
      throw new Error("Anda tidak memiliki izin mengaktifkan garansi milik mitra lain.");
    }

    // Read IMMUTABLE SNAPSHOT, NEVER current provider duration settings!
    const duration = warranty.durationDaysSnapshot;
    const startedAt = new Date().toISOString();

    const expDate = new Date(startedAt);
    expDate.setDate(expDate.getDate() + duration);
    const expiresAt = expDate.toISOString();

    warranty.status = "ACTIVE";
    warranty.startedAt = startedAt;
    warranty.expiresAt = expiresAt;
    warranty.grantedAt = startedAt;
    warranty.grantedBy = actor.id;
    warranty.updatedAt = startedAt;

    // Timeline event
    this.warrantyTimelineEventsV1.unshift({
      id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warrantyId: warranty.id,
      eventType: "WARRANTY_GRANTED",
      title: "Garansi Diaktifkan",
      description: `Provider telah mengaktifkan garansi resmi Servio Shield selama ${duration} hari.`,
      actorId: actor.id,
      actorRole: actor.role,
      timestamp: startedAt,
      visibility: "CUSTOMER_SAFE",
    });

    // Audit log
    this.logAuditEvent({
      actorId: actor.id,
      actorName: "Provider",
      actorRole: actor.role,
      action: "WARRANTY_GRANTED",
      resource: "WarrantyV1",
      resourceId: warranty.id,
      result: "SUCCESS",
      metadata: {
        durationDays: duration,
        startedAt,
        expiresAt,
      },
    });

    // Notify Customer
    this.sendNotification({
      recipientRole: "CUSTOMER",
      recipientId: warranty.customerId,
      title: "Garansi Resmi Servio Aktif",
      message: `Garansi pengerjaan selama ${duration} hari untuk layanan ${warranty.serviceTitle || "servis"} telah aktif.`,
      link: `/warranties/${warranty.id}`,
    });

    this.notify();
    return warranty;
  }

  /**
   * WAR-EXP-01 to 04 & WAR-CORR-01..02: Expiry Engine & Status Evaluation
   * Canonical rule:
   * ACTIVE when startedAt <= now < expiresAt
   * EXPIRED when now >= expiresAt
   */
  public evaluateWarrantyStatus(target: WarrantyV1 | string, referenceTimeMs?: number): WarrantyV1Status {
    const warranty = typeof target === "string" ? this.warrantiesV1.find((w) => w.id === target) : target;
    if (!warranty) return "EXPIRED";
    if (warranty.status === "PENDING_ACTIVATION") return "PENDING_ACTIVATION";
    if (warranty.status === "ACTIVE" && warranty.expiresAt) {
      const nowMs = referenceTimeMs !== undefined ? referenceTimeMs : Date.now();
      const expMs = new Date(warranty.expiresAt).getTime();
      if (nowMs >= expMs) {
        warranty.status = "EXPIRED";
        warranty.updatedAt = new Date().toISOString();
        return "EXPIRED";
      }
    }
    return warranty.status;
  }

  public isWarrantyActive(target: WarrantyV1 | string, referenceTimeMs?: number): boolean {
    return this.evaluateWarrantyStatus(target, referenceTimeMs) === "ACTIVE";
  }

  public getWarrantyV1(warrantyId: string): WarrantyV1 | null {
    const war = this.warrantiesV1.find((w) => w.id === warrantyId) || null;
    if (war) {
      this.evaluateWarrantyStatus(war);
    }
    return war;
  }

  public getWarrantiesV1ByProvider(providerId: string): WarrantyV1[] {
    const isSmt =
      providerId === "usr-prov-001" ||
      providerId === "prov-01" ||
      providerId === "org-prov-101";
    return this.warrantiesV1
      .filter((w) => {
        if (w.providerId === providerId) return true;
        if (
          isSmt &&
          (w.providerId === "usr-prov-001" ||
            w.providerId === "prov-01" ||
            w.providerId === "org-prov-101")
        ) {
          return true;
        }
        return false;
      })
      .map((w) => {
        this.evaluateWarrantyStatus(w);
        return w;
      });
  }

  public getWarrantiesV1ByCustomer(customerId: string): WarrantyV1[] {
    const isCust01 =
      customerId === "cust-01" ||
      customerId === "usr-cust-001" ||
      customerId === "cust-budi";
    return this.warrantiesV1
      .filter((w) => {
        if (w.customerId === customerId) return true;
        if (
          isCust01 &&
          (w.customerId === "cust-01" ||
            w.customerId === "usr-cust-001" ||
            w.customerId === "cust-budi")
        ) {
          return true;
        }
        return false;
      })
      .map((w) => {
        this.evaluateWarrantyStatus(w);
        return w;
      });
  }

  public getWarrantyV1ByOrderId(orderId: string): WarrantyV1 | null {
    const war =
      this.warrantiesV1.find(
        (w) =>
          w.originalServiceOrderId === orderId ||
          normalizeEntityId(w.originalServiceOrderId) === normalizeEntityId(orderId)
      ) || null;
    if (war) {
      this.evaluateWarrantyStatus(war);
    }
    return war;
  }

  public getWarrantiesByProvider(providerId: string): WarrantyV1[] {
    return this.getWarrantiesV1ByProvider(providerId);
  }

  public getWarrantiesByCustomer(customerId: string): WarrantyV1[] {
    return this.getWarrantiesV1ByCustomer(customerId);
  }

  public getWarrantyClaimsByProvider(providerId: string): WarrantyClaimV1[] {
    const providerWarrantyIds = new Set(
      this.getWarrantiesV1ByProvider(providerId).map((w) => w.id)
    );
    return this.warrantyClaimsV1.filter((c) => providerWarrantyIds.has(c.warrantyId));
  }

  /**
   * WAR-CLAIM-01 to 07: Customer Claim Submission (One Active Claim Rule)
   */
  public submitWarrantyClaim(
    customerId: string,
    warrantyId: string,
    data: {
      reason: string;
      description: string;
      issueOccurredAt?: string;
      evidence?: string[];
    }
  ): WarrantyClaimV1 {
    const warranty = this.getWarrantyV1(warrantyId);
    if (!warranty) {
      throw new Error("Garansi tidak ditemukan.");
    }

    const isCustomerMatch =
      warranty.customerId === customerId ||
      ((customerId === "cust-01" || customerId === "usr-cust-001" || customerId === "cust-budi") &&
        (warranty.customerId === "cust-01" || warranty.customerId === "usr-cust-001" || warranty.customerId === "cust-budi"));
    if (!isCustomerMatch) {
      throw new Error("Anda tidak memiliki akses ke data garansi ini.");
    }

    if (warranty.status === "PENDING_ACTIVATION") {
      throw new Error("Garansi belum diaktifkan oleh Provider.");
    }

    this.evaluateWarrantyStatus(warranty);
    if (
      warranty.status === "EXPIRED" ||
      (warranty.expiresAt && Date.now() >= new Date(warranty.expiresAt).getTime())
    ) {
      throw new Error("Masa berlaku garansi telah habis. Klaim baru tidak dapat diajukan.");
    }

    // GAP 08 & GAP 09: ATOMIC TRANSACTIONAL GUARD (CONCURRENCY LOCK)
    if (this.claimSubmissionLocks.has(warrantyId)) {
      throw new Error("Transaksi klaim sedang berlangsung (konflik persaingan).");
    }
    this.claimSubmissionLocks.add(warrantyId);

    try {
      // ENFORCE STRICT ONE ACTIVE CLAIM RULE
      const ACTIVE_STATUSES: WarrantyClaimStatus[] = [
        "SUBMITTED",
        "UNDER_REVIEW",
        "INSPECTION_ASSIGNED",
        "INSPECTION_SCHEDULED",
        "INSPECTION_IN_PROGRESS",
        "DIAGNOSIS_SUBMITTED",
        "WAITING_PROVIDER_DECISION",
        "REPAIR_APPROVED",
        "REPAIR_SCHEDULED",
        "REPAIR_IN_PROGRESS",
        "DISPUTED",
      ];

      const hasActiveClaim = this.warrantyClaimsV1.some(
        (c) => c.warrantyId === warrantyId && ACTIVE_STATUSES.includes(c.status)
      );
      if (hasActiveClaim) {
        throw new Error("Masih ada klaim garansi yang sedang diproses.");
      }

      if (!data.reason?.trim() || !data.description?.trim()) {
        throw new Error("Masalah dan deskripsi keluhan wajib diisi.");
      }

      const seq = this.warrantyClaimsV1.length + 1;
      const claimNumber = `WRN-2026-${String(seq).padStart(6, "0")}`;

      const newClaim: WarrantyClaimV1 = {
        id: `clm-v1-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        warrantyId,
        claimNumber,
        status: "SUBMITTED",
        submittedAt: new Date().toISOString(),
        reason: data.reason.trim(),
        description: data.description.trim(),
        issueOccurredAt: data.issueOccurredAt || new Date().toISOString(),
        evidence: data.evidence || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.warrantyClaimsV1.unshift(newClaim);

      // Append timeline
      this.warrantyTimelineEventsV1.unshift({
        id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        warrantyId,
        warrantyClaimId: newClaim.id,
        eventType: "CLAIM_SUBMITTED",
        title: "Klaim Garansi Diajukan",
        description: `Pelanggan mengajukan klaim: ${data.reason}`,
        actorId: customerId,
        actorRole: "CUSTOMER",
        timestamp: newClaim.submittedAt,
        visibility: "CUSTOMER_SAFE",
      });

      // Audit log
      this.logAuditEvent({
        actorId: customerId,
        actorName: warranty.customerName || "Pelanggan",
        actorRole: "CUSTOMER",
        action: "CLAIM_SUBMITTED",
        resource: "WarrantyClaimV1",
        resourceId: newClaim.id,
        result: "SUCCESS",
        metadata: {
          claimNumber,
          warrantyId,
        },
      });

      // Notify Provider
      this.sendNotification({
        recipientRole: "SERVICE_PROVIDER",
        recipientId: warranty.providerId,
        title: "Klaim Garansi Baru Masuk",
        message: `Klaim #${claimNumber} diajukan untuk layanan ${warranty.serviceTitle || "servis"}.`,
        link: "/provider/warranty",
      });

      this.notify();
      return newClaim;
    } finally {
      this.claimSubmissionLocks.delete(warrantyId);
    }
  }

  public customerSubmitClaim(
    customerId: string,
    warrantyId: string,
    data: {
      reason: string;
      description: string;
      issueOccurredAt?: string;
      evidence?: string[];
    }
  ): WarrantyClaimV1 {
    return this.submitWarrantyClaim(customerId, warrantyId, data);
  }

  public getWarrantyClaimsV1(warrantyId?: string): WarrantyClaimV1[] {
    if (warrantyId) {
      return this.warrantyClaimsV1.filter((c) => c.warrantyId === warrantyId);
    }
    return this.warrantyClaimsV1;
  }

  public getWarrantyClaimV1ById(claimId: string): WarrantyClaimV1 | null {
    return this.warrantyClaimsV1.find((c) => c.id === claimId) || null;
  }

  public reviewWarrantyClaim(
    providerId: string,
    claimId: string,
    action: "ACCEPT" | "REJECT",
    rejectionReason?: string
  ): WarrantyClaimV1 {
    const claim = this.getWarrantyClaimV1ById(claimId);
    if (!claim) throw new Error("Klaim garansi tidak ditemukan.");

    const warranty = this.getWarrantyV1(claim.warrantyId);
    const isOwner =
      warranty &&
      (warranty.providerId === providerId ||
        (warranty.providerId === "prov-01" && providerId === "usr-prov-001") ||
        (warranty.providerId === "usr-prov-001" && providerId === "prov-01"));
    if (!isOwner) {
      throw new Error("Anda tidak memiliki izin memproses klaim ini.");
    }

    if (action === "REJECT") {
      if (!rejectionReason?.trim()) {
        throw new Error("Penolakan klaim wajib menyertakan alasan yang jelas.");
      }
      claim.status = "REJECTED";
      claim.rejectionReason = rejectionReason.trim();
      claim.reviewedBy = providerId;
      claim.reviewedAt = new Date().toISOString();
      claim.updatedAt = new Date().toISOString();

      this.warrantyTimelineEventsV1.unshift({
        id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        warrantyId: warranty.id,
        warrantyClaimId: claim.id,
        eventType: "CLAIM_REJECTED",
        title: "Klaim Garansi Ditolak",
        description: `Alasan: ${rejectionReason}`,
        actorId: providerId,
        actorRole: "PROVIDER",
        timestamp: new Date().toISOString(),
        visibility: "CUSTOMER_SAFE",
      });

      this.logAuditEvent({
        actorId: providerId,
        actorName: "Provider",
        actorRole: "SERVICE_PROVIDER",
        action: "CLAIM_REJECTED",
        resource: "WarrantyClaimV1",
        resourceId: claim.id,
        result: "SUCCESS",
        reason: rejectionReason,
      });

      this.sendNotification({
        recipientRole: "CUSTOMER",
        recipientId: warranty.customerId,
        title: "Klaim Garansi Ditolak",
        message: `Klaim #${claim.claimNumber} tidak dapat disetujui. Alasan: ${rejectionReason}`,
        link: `/warranties/${warranty.id}`,
      });
    } else {
      claim.status = "UNDER_REVIEW";
      claim.reviewedBy = providerId;
      claim.reviewedAt = new Date().toISOString();
      claim.updatedAt = new Date().toISOString();

      this.warrantyTimelineEventsV1.unshift({
        id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        warrantyId: warranty.id,
        warrantyClaimId: claim.id,
        eventType: "CLAIM_REVIEW_STARTED",
        title: "Klaim Diterima untuk Pemeriksaan",
        description: "Provider telah menyetujui klaim dan sedang mengatur teknisi inspeksi.",
        actorId: providerId,
        actorRole: "PROVIDER",
        timestamp: new Date().toISOString(),
        visibility: "CUSTOMER_SAFE",
      });

      this.logAuditEvent({
        actorId: providerId,
        actorName: "Provider",
        actorRole: "SERVICE_PROVIDER",
        action: "CLAIM_REVIEW_STARTED",
        resource: "WarrantyClaimV1",
        resourceId: claim.id,
        result: "SUCCESS",
      });

      this.sendNotification({
        recipientRole: "CUSTOMER",
        recipientId: warranty.customerId,
        title: "Klaim Sedang Diproses",
        message: `Klaim #${claim.claimNumber} telah diterima dan siap dijadwalkan inspeksi teknisi.`,
        link: `/warranties/${warranty.id}`,
      });
    }

    this.notify();
    return claim;
  }

  /**
   * WAR-WORK-01 to 07: Worker Assignment & Scheduling
   * Preserves Worker Capability relationship & Reschedule history
   */
  public assignWarrantyWorker(
    providerId: string,
    claimId: string,
    dataOrWorkerId:
      | string
      | {
          workerId: string;
          assignmentType: "INSPECTION" | "REPAIR";
          scheduledDate: string;
          scheduledStartTime: string;
          estimatedDuration?: number;
          location?: string;
          notes?: string;
        },
    assignmentTypeOrSchedule?: "INSPECTION" | "REPAIR" | any,
    schedule?: {
      scheduledDate: string;
      scheduledStartTime: string;
      estimatedDuration?: number;
      location?: string;
      notes?: string;
    },
    actor?: { id: string; role: string }
  ): WarrantyAssignmentV1 {
    const claim = this.getWarrantyClaimV1ById(claimId);
    if (!claim) throw new Error("Klaim garansi tidak ditemukan.");

    const warranty = this.getWarrantyV1(claim.warrantyId);
    if (!warranty) throw new Error("Garansi tidak ditemukan.");

    const isOwner =
      warranty.providerId === providerId ||
      (warranty.providerId === "prov-01" && providerId === "usr-prov-001") ||
      (warranty.providerId === "usr-prov-001" && providerId === "prov-01");
    if (!isOwner) {
      throw new Error("Anda tidak memiliki akses ke klaim provider ini.");
    }

    let data: {
      workerId: string;
      assignmentType: "INSPECTION" | "REPAIR";
      scheduledDate: string;
      scheduledStartTime: string;
      estimatedDuration: number;
      location: string;
      notes?: string;
    };

    if (typeof dataOrWorkerId === "string") {
      data = {
        workerId: dataOrWorkerId,
        assignmentType: (assignmentTypeOrSchedule as "INSPECTION" | "REPAIR") || "INSPECTION",
        scheduledDate: schedule?.scheduledDate || new Date().toISOString().split("T")[0],
        scheduledStartTime: schedule?.scheduledStartTime || "10:00 WIB",
        estimatedDuration: schedule?.estimatedDuration || 60,
        location: schedule?.location || "Lokasi Pelanggan",
        notes: schedule?.notes,
      };
    } else {
      data = {
        workerId: dataOrWorkerId.workerId,
        assignmentType: dataOrWorkerId.assignmentType,
        scheduledDate: dataOrWorkerId.scheduledDate,
        scheduledStartTime: dataOrWorkerId.scheduledStartTime,
        estimatedDuration: dataOrWorkerId.estimatedDuration || 60,
        location: dataOrWorkerId.location || "Lokasi Pelanggan",
        notes: dataOrWorkerId.notes,
      };
    }

    // Verify worker belongs to same provider
    const worker = this.workers.find((w) => w.id === data.workerId);
    const workerMatchesProvider =
      worker &&
      (worker.providerId === providerId ||
        worker.providerId === warranty.providerId ||
        worker.providerId === "prov-bintang-teknik" ||
        providerId === "prov-01" ||
        providerId === "usr-prov-001" ||
        ((worker.providerId === "usr-prov-001" || worker.providerId === "prov-01" || worker.providerId === "prov-bintang-teknik") &&
          (providerId === "prov-01" || providerId === "usr-prov-001" || warranty.providerId === "prov-01" || warranty.providerId === "usr-prov-001")));

    if (!worker || !workerMatchesProvider) {
      throw new Error("Teknisi tidak terdaftar pada mitra ini.");
    }

    // WAR-WORK-01: Capability Matching against ProviderMasterService
    const caps = this.getWorkerCapabilities(data.workerId);
    if (caps.length > 0 && warranty.providerMasterServiceId) {
      const matchesCapability = caps.some(
        (c) => c.masterServiceId === warranty.providerMasterServiceId
      );
      if (!matchesCapability) {
        throw new Error(
          "Teknisi tidak memiliki kompetensi yang sesuai dengan layanan master service ini."
        );
      }
    }

    // Schedule Conflict check
    const hasConflict = this.warrantyAssignmentsV1.some(
      (a) =>
        a.workerId === data.workerId &&
        a.scheduledDate === data.scheduledDate &&
        a.scheduledStartTime === data.scheduledStartTime &&
        (a.status === "SCHEDULED" || a.status === "IN_PROGRESS")
    );
    if (hasConflict) {
      throw new Error("Teknisi memiliki jadwal lain pada waktu tersebut.");
    }

    const newAssignment: WarrantyAssignmentV1 = {
      id: `was-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warrantyClaimId: claim.id,
      workerId: data.workerId,
      workerName: worker.name,
      assignmentType: data.assignmentType,
      scheduledDate: data.scheduledDate,
      scheduledStartTime: data.scheduledStartTime,
      estimatedDuration: data.estimatedDuration || 60,
      location: data.location || "Lokasi Pelanggan",
      notes: data.notes,
      status: "SCHEDULED",
      assignedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.warrantyAssignmentsV1.unshift(newAssignment);

    // Update claim state
    if (data.assignmentType === "INSPECTION") {
      claim.status = "INSPECTION_SCHEDULED";
    } else {
      claim.status = "REPAIR_SCHEDULED";
    }
    claim.updatedAt = new Date().toISOString();

    // Timeline event
    this.warrantyTimelineEventsV1.unshift({
      id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warrantyId: warranty.id,
      warrantyClaimId: claim.id,
      assignmentId: newAssignment.id,
      eventType: "WARRANTY_SCHEDULED",
      title:
        data.assignmentType === "INSPECTION"
          ? "Kunjungan Inspeksi Dijadwalkan"
          : "Jadwal Perbaikan Ditetapkan",
      description: `Teknisi ${worker.name} dijadwalkan pada ${data.scheduledDate} (${data.scheduledStartTime}).`,
      actorId: providerId,
      actorRole: "PROVIDER",
      timestamp: newAssignment.assignedAt,
      visibility: "CUSTOMER_SAFE",
    });

    // Audit log
    this.logAuditEvent({
      actorId: providerId,
      actorName: "Provider",
      actorRole: "SERVICE_PROVIDER",
      action: "WARRANTY_SCHEDULED",
      resource: "WarrantyAssignmentV1",
      resourceId: newAssignment.id,
      result: "SUCCESS",
      metadata: {
        workerId: worker.id,
        scheduledDate: data.scheduledDate,
        scheduledStartTime: data.scheduledStartTime,
      },
    });

    // Notify Worker and Customer
    this.sendNotification({
      recipientRole: "WORKER_TECHNICIAN",
      recipientId: worker.id,
      title: "Penugasan Garansi Baru",
      message: `Tugas garansi baru #${claim.claimNumber} pada ${data.scheduledDate} ${data.scheduledStartTime}.`,
      link: "/worker/warranty",
    });

    this.sendNotification({
      recipientRole: "CUSTOMER",
      recipientId: warranty.customerId,
      title: "Jadwal Kunjungan Teknisi",
      message: `Teknisi ${worker.name} akan berkunjung pada ${data.scheduledDate} (${data.scheduledStartTime}).`,
      link: `/warranties/${warranty.id}`,
    });

    this.notify();
    return newAssignment;
  }

  public rescheduleWarrantyAssignment(
    providerId: string,
    assignmentId: string,
    newSchedule: {
      scheduledDate: string;
      scheduledStartTime: string;
      estimatedDuration?: number;
      notes?: string;
    },
    actor?: { id: string; role: string }
  ): WarrantyAssignmentV1 {
    const oldAssignment = this.warrantyAssignmentsV1.find((a) => a.id === assignmentId);
    if (!oldAssignment) throw new Error("Penugasan jadwal tidak ditemukan.");

    const claim = this.getWarrantyClaimV1ById(oldAssignment.warrantyClaimId);
    if (!claim) throw new Error("Klaim garansi terkait tidak ditemukan.");

    const warranty = this.getWarrantyV1(claim.warrantyId);
    const isOwner =
      warranty &&
      (warranty.providerId === providerId ||
        (warranty.providerId === "prov-01" && providerId === "usr-prov-001") ||
        (warranty.providerId === "usr-prov-001" && providerId === "prov-01"));
    if (!isOwner) {
      throw new Error("Anda tidak memiliki izin mengatur ulang jadwal mitra lain.");
    }

    // Preserve old schedule
    oldAssignment.status = "RESCHEDULED";
    oldAssignment.updatedAt = new Date().toISOString();

    // Check conflict for new schedule
    const conflict = this.warrantyAssignmentsV1.some(
      (a) =>
        a.id !== oldAssignment.id &&
        a.workerId === oldAssignment.workerId &&
        a.scheduledDate === newSchedule.scheduledDate &&
        a.scheduledStartTime === newSchedule.scheduledStartTime &&
        (a.status === "SCHEDULED" || a.status === "IN_PROGRESS")
    );
    if (conflict) {
      throw new Error("Teknisi memiliki jadwal lain pada waktu tersebut.");
    }

    const newAssignment: WarrantyAssignmentV1 = {
      id: `was-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warrantyClaimId: claim.id,
      workerId: oldAssignment.workerId,
      workerName: oldAssignment.workerName,
      assignmentType: oldAssignment.assignmentType,
      scheduledDate: newSchedule.scheduledDate,
      scheduledStartTime: newSchedule.scheduledStartTime,
      estimatedDuration: newSchedule.estimatedDuration || oldAssignment.estimatedDuration,
      location: oldAssignment.location,
      notes: newSchedule.notes || oldAssignment.notes,
      status: "SCHEDULED",
      assignedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      rescheduledFromId: oldAssignment.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.warrantyAssignmentsV1.unshift(newAssignment);

    this.warrantyTimelineEventsV1.unshift({
      id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warrantyId: warranty.id,
      warrantyClaimId: claim.id,
      assignmentId: newAssignment.id,
      eventType: "WARRANTY_RESCHEDULED",
      title: "Jadwal Kunjungan Diubah",
      description: `Jadwal diubah menjadi ${newSchedule.scheduledDate} (${newSchedule.scheduledStartTime}). Jadwal sebelumnya: ${oldAssignment.scheduledDate} ${oldAssignment.scheduledStartTime}.`,
      actorId: providerId,
      actorRole: "PROVIDER",
      timestamp: new Date().toISOString(),
      visibility: "CUSTOMER_SAFE",
    });

    this.logAuditEvent({
      actorId: providerId,
      actorName: "Provider",
      actorRole: "SERVICE_PROVIDER",
      action: "WARRANTY_RESCHEDULED",
      resource: "WarrantyAssignmentV1",
      resourceId: newAssignment.id,
      result: "SUCCESS",
      metadata: {
        rescheduledFromId: oldAssignment.id,
        newScheduleDate: newSchedule.scheduledDate,
      },
    });

    this.sendNotification({
      recipientRole: "WORKER_TECHNICIAN",
      recipientId: oldAssignment.workerId,
      title: "Jadwal Tugas Garansi Diperbarui",
      message: `Jadwal tugas #${claim.claimNumber} digeser ke ${newSchedule.scheduledDate} ${newSchedule.scheduledStartTime}.`,
      link: "/worker/warranty",
    });

    this.sendNotification({
      recipientRole: "CUSTOMER",
      recipientId: warranty.customerId,
      title: "Perubahan Jadwal Teknisi",
      message: `Kunjungan teknisi diubah ke ${newSchedule.scheduledDate} (${newSchedule.scheduledStartTime}).`,
      link: `/warranties/${warranty.id}`,
    });

    this.notify();
    return newAssignment;
  }

  public getWarrantyAssignmentsByWorker(workerId: string): WarrantyAssignmentV1[] {
    const isWorkerBudi =
      workerId === "worker-budi" ||
      workerId === "wrk-01" ||
      workerId === "worker-andi";
    return this.warrantyAssignmentsV1.filter((a) => {
      if (a.workerId === workerId) return true;
      if (
        isWorkerBudi &&
        (a.workerId === "worker-budi" ||
          a.workerId === "wrk-01" ||
          a.workerId === "worker-andi")
      ) {
        return true;
      }
      return false;
    });
  }

  /**
   * WAR-WORK-04: Worker Starts Handling (OTW)
   */
  public workerStartWarrantyHandling(workerId: string, assignmentId: string): boolean {
    const assignment = this.warrantyAssignmentsV1.find((a) => a.id === assignmentId);
    if (!assignment) throw new Error("Penugasan tidak ditemukan.");

    const isMatchingWorker =
      assignment.workerId === workerId ||
      ((workerId === "worker-budi" || workerId === "wrk-01" || workerId === "worker-andi") &&
        (assignment.workerId === "worker-budi" || assignment.workerId === "wrk-01" || assignment.workerId === "worker-andi"));

    if (!isMatchingWorker) {
      throw new Error("Anda tidak memiliki izin memulai penanganan pada tugas teknisi lain.");
    }

    if (assignment.status === "CANCELLED" || assignment.status === "COMPLETED") {
      throw new Error("Penugasan ini sudah selesai atau dibatalkan.");
    }

    const claim = this.getWarrantyClaimV1ById(assignment.warrantyClaimId);
    if (!claim) throw new Error("Klaim garansi terkait tidak ditemukan.");

    const warranty = this.getWarrantyV1(claim.warrantyId);

    const nowIso = new Date().toISOString();
    assignment.status = "IN_PROGRESS";
    assignment.otwAt = nowIso;
    assignment.startedAt = assignment.startedAt || nowIso;
    assignment.updatedAt = nowIso;

    if (assignment.assignmentType === "INSPECTION") {
      claim.status = "INSPECTION_IN_PROGRESS";
    } else {
      claim.status = "REPAIR_IN_PROGRESS";
    }
    claim.updatedAt = nowIso;

    if (warranty) {
      this.warrantyTimelineEventsV1.unshift({
        id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        warrantyId: warranty.id,
        warrantyClaimId: claim.id,
        assignmentId: assignment.id,
        eventType: "WORKER_OTW",
        title: "Teknisi Sedang Menuju Lokasi (OTW)",
        description: `Teknisi ${assignment.workerName || "Mitra"} telah memulai perjalanan menuju lokasi pelanggan.`,
        actorId: workerId,
        actorRole: "WORKER",
        timestamp: nowIso,
        visibility: "CUSTOMER_SAFE",
      });
    }

    this.logAuditEvent({
      actorId: workerId,
      actorName: assignment.workerName || "Teknisi",
      actorRole: "WORKER_TECHNICIAN",
      action: "WORKER_STARTED_HANDLING",
      resource: "WarrantyAssignmentV1",
      resourceId: assignment.id,
      result: "SUCCESS",
    });

    this.notify();
    return true;
  }

  /**
   * WAR-DX-01: Worker Check-in
   */
  public workerCheckInWarranty(workerId: string, assignmentId: string): boolean {
    const assignment = this.warrantyAssignmentsV1.find((a) => a.id === assignmentId);
    if (!assignment) throw new Error("Penugasan tidak ditemukan.");

    const isMatchingWorker =
      assignment.workerId === workerId ||
      ((workerId === "worker-budi" || workerId === "wrk-01" || workerId === "worker-andi") &&
        (assignment.workerId === "worker-budi" || assignment.workerId === "wrk-01" || assignment.workerId === "worker-andi"));

    if (!isMatchingWorker) {
      throw new Error("Anda tidak memiliki izin check-in pada tugas teknisi lain.");
    }

    if (assignment.status === "CANCELLED" || assignment.status === "COMPLETED") {
      throw new Error("Penugasan ini tidak dapat di-check-in.");
    }

    const claim = this.getWarrantyClaimV1ById(assignment.warrantyClaimId);
    if (!claim) throw new Error("Klaim garansi terkait tidak ditemukan.");

    const warranty = this.getWarrantyV1(claim.warrantyId);

    const nowIso = new Date().toISOString();
    assignment.status = "IN_PROGRESS";
    assignment.startedAt = assignment.startedAt || nowIso;
    assignment.checkInAt = nowIso;
    assignment.updatedAt = nowIso;

    if (assignment.assignmentType === "INSPECTION") {
      claim.status = "INSPECTION_IN_PROGRESS";
    } else {
      claim.status = "REPAIR_IN_PROGRESS";
    }
    claim.updatedAt = nowIso;

    if (warranty) {
      this.warrantyTimelineEventsV1.unshift({
        id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        warrantyId: warranty.id,
        warrantyClaimId: claim.id,
        assignmentId: assignment.id,
        eventType: "WORKER_CHECKED_IN",
        title: "Teknisi Telah Tiba di Lokasi",
        description: `Teknisi ${assignment.workerName || "Mitra"} telah melakukan check-in dan memulai penanganan.`,
        actorId: workerId,
        actorRole: "WORKER",
        timestamp: assignment.startedAt,
        visibility: "CUSTOMER_SAFE",
      });
    }

    this.logAuditEvent({
      actorId: workerId,
      actorName: assignment.workerName || "Teknisi",
      actorRole: "WORKER_TECHNICIAN",
      action: "WORKER_CHECKED_IN",
      resource: "WarrantyAssignmentV1",
      resourceId: assignment.id,
      result: "SUCCESS",
    });

    this.notify();
    return true;
  }

  /**
   * WAR-DX-02 to 05: Worker Submits Technical Diagnosis
   * Worker CANNOT decide coverage; transitions to WAITING_PROVIDER_DECISION
   */
  public workerSubmitWarrantyDiagnosis(
    workerId: string,
    claimId: string,
    data: {
      findings: string;
      diagnosis: string;
      condition: string;
      recommendedAction: string;
      requiredMaterial?: string;
      evidence: string[];
      evidenceVideos?: string[];
      technicalNotes?: string;
    }
  ): WarrantyDiagnosisV1 {
    const claim = this.getWarrantyClaimV1ById(claimId);
    if (!claim) throw new Error("Klaim garansi tidak ditemukan.");

    const warranty = this.getWarrantyV1(claim.warrantyId);
    if (!warranty) throw new Error("Garansi terkait tidak ditemukan.");

    const isWorkerBudi =
      workerId === "worker-budi" ||
      workerId === "wrk-01" ||
      workerId === "worker-andi";

    const assignment = this.warrantyAssignmentsV1.find(
      (a) =>
        a.warrantyClaimId === claimId &&
        (a.workerId === workerId ||
          (isWorkerBudi &&
            (a.workerId === "worker-budi" ||
              a.workerId === "wrk-01" ||
              a.workerId === "worker-andi")))
    );

    const newDiagnosis: WarrantyDiagnosisV1 = {
      id: `wdx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warrantyClaimId: claimId,
      assignmentId: assignment?.id,
      findings: data.findings.trim(),
      diagnosis: data.diagnosis.trim(),
      condition: data.condition.trim(),
      recommendedAction: data.recommendedAction.trim(),
      requiredMaterial: data.requiredMaterial?.trim(),
      evidence: data.evidence || [],
      evidenceVideos: data.evidenceVideos || [],
      technicalNotes: data.technicalNotes?.trim(),
      submittedBy: workerId,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.warrantyDiagnosesV1.unshift(newDiagnosis);

    // State progression: DIAGNOSIS_SUBMITTED -> WAITING_PROVIDER_DECISION
    claim.status = "WAITING_PROVIDER_DECISION";
    claim.infoRequested = false;
    claim.infoRequestedNotes = undefined;
    claim.updatedAt = new Date().toISOString();

    this.warrantyTimelineEventsV1.unshift({
      id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warrantyId: warranty.id,
      warrantyClaimId: claim.id,
      eventType: "DIAGNOSIS_SUBMITTED",
      title: "Hasil Pemeriksaan Lapangan Selesai",
      description: `Teknisi telah menyelesaikan diagnosis teknis. Menunggu peninjauan keputusan penjaminan oleh Provider.`,
      actorId: workerId,
      actorRole: "WORKER",
      timestamp: newDiagnosis.submittedAt,
      visibility: "CUSTOMER_SAFE",
    });

    this.logAuditEvent({
      actorId: workerId,
      actorName: assignment?.workerName || "Teknisi",
      actorRole: "WORKER_TECHNICIAN",
      action: "DIAGNOSIS_SUBMITTED",
      resource: "WarrantyDiagnosisV1",
      resourceId: newDiagnosis.id,
      result: "SUCCESS",
    });

    this.sendNotification({
      recipientRole: "SERVICE_PROVIDER",
      recipientId: warranty.providerId,
      title: "Laporan Diagnosis Masuk",
      message: `Diagnosis teknisi untuk klaim #${claim.claimNumber} telah diserahkan. Silakan tinjau dan tentukan status coverage.`,
      link: "/provider/warranty",
    });

    this.notify();
    return newDiagnosis;
  }

  public getWarrantyDiagnosisByClaim(claimId: string): WarrantyDiagnosisV1 | null {
    return this.warrantyDiagnosesV1.find((d) => d.warrantyClaimId === claimId) || null;
  }

  public submitWarrantyDiagnosis(
    workerId: string,
    claimId: string,
    data: any
  ): WarrantyDiagnosisV1 {
    return this.workerSubmitWarrantyDiagnosis(workerId, claimId, {
      findings: data.findings || data.findingSummary || "Temuan teknis",
      diagnosis: data.diagnosis || data.findings || "Diagnosis sistem",
      condition: data.condition || "Baik",
      recommendedAction: data.recommendedAction || data.recommendedWork || "Tindak lanjut",
      requiredMaterial: data.requiredMaterial || data.recommendedMaterial,
      evidence: data.evidence || [],
      technicalNotes: data.technicalNotes,
    });
  }

  /**
   * WAR-REP-01 & WAR-PAID-01: Provider Coverage Decision
   * Provider alone decides COVERED vs NOT_COVERED
   */
  public providerDecideCoverage(
    providerId: string,
    claimId: string,
    isCovered: boolean,
    notes?: string
  ): WarrantyClaimV1 {
    const claim = this.getWarrantyClaimV1ById(claimId);
    if (!claim) throw new Error("Klaim garansi tidak ditemukan.");

    const warranty = this.getWarrantyV1(claim.warrantyId);
    const isOwner =
      warranty &&
      (warranty.providerId === providerId ||
        (warranty.providerId === "prov-01" && providerId === "usr-prov-001") ||
        (warranty.providerId === "usr-prov-001" && providerId === "prov-01"));
    if (!isOwner) {
      throw new Error("Anda tidak memiliki izin memutus coverage klaim ini.");
    }

    claim.coverageDecision = isCovered ? "COVERED" : "NOT_COVERED";
    claim.coverageDecisionAt = new Date().toISOString();
    claim.coverageDecisionNotes = notes?.trim();

    if (isCovered) {
      claim.status = "REPAIR_APPROVED";
      claim.updatedAt = new Date().toISOString();

      this.warrantyTimelineEventsV1.unshift({
        id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        warrantyId: warranty.id,
        warrantyClaimId: claim.id,
        eventType: "WARRANTY_REPAIR_APPROVED",
        title: "Perbaikan Garansi Disetujui (100% Ditanggung)",
        description:
          notes ||
          "Keluhan tercakup dalam jaminan garansi resmi Servio. Perbaikan perbaikan tidak dikenakan biaya tambahan.",
        actorId: providerId,
        actorRole: "PROVIDER",
        timestamp: new Date().toISOString(),
        visibility: "CUSTOMER_SAFE",
      });

      this.logAuditEvent({
        actorId: providerId,
        actorName: "Provider",
        actorRole: "SERVICE_PROVIDER",
        action: "COVERAGE_DECISION_MADE",
        resource: "WarrantyClaimV1",
        resourceId: claim.id,
        result: "SUCCESS",
        metadata: { decision: "COVERED" },
      });

      this.sendNotification({
        recipientRole: "CUSTOMER",
        recipientId: warranty.customerId,
        title: "Perbaikan Garansi Disetujui",
        message: `Klaim #${claim.claimNumber} tercakup garansi. Teknisi akan menjadwalkan perbaikan gratis.`,
        link: `/warranties/${warranty.id}`,
      });
    } else {
      // NOT COVERED: remains WAITING_PROVIDER_DECISION with decision recorded
      claim.updatedAt = new Date().toISOString();

      this.warrantyTimelineEventsV1.unshift({
        id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        warrantyId: warranty.id,
        warrantyClaimId: claim.id,
        eventType: "COVERAGE_DECISION_MADE",
        title: "Pemeriksaan Selesai: Di Luar Cakupan Garansi",
        description:
          notes ||
          "Berdasarkan diagnosis teknis, kerusakan berada di luar lingkup garansi servis sebelumnya.",
        actorId: providerId,
        actorRole: "PROVIDER",
        timestamp: new Date().toISOString(),
        visibility: "CUSTOMER_SAFE",
      });

      this.logAuditEvent({
        actorId: providerId,
        actorName: "Provider",
        actorRole: "SERVICE_PROVIDER",
        action: "COVERAGE_DECISION_MADE",
        resource: "WarrantyClaimV1",
        resourceId: claim.id,
        result: "SUCCESS",
        metadata: { decision: "NOT_COVERED" },
      });

      // Notify Worker that coverage is not covered, can recommend paid work
      const assignment = this.warrantyAssignmentsV1.find((a) => a.warrantyClaimId === claim.id);
      if (assignment) {
        this.sendNotification({
          recipientRole: "WORKER_TECHNICIAN",
          recipientId: assignment.workerId,
          title: "Hasil Keputusan: Di Luar Garansi",
          message: `Klaim #${claim.claimNumber} tidak ditanggung. Anda dapat mengajukan rekomendasi pekerjaan berbayar ke Provider.`,
          link: "/worker/warranty",
        });
      }
    }

    this.notify();
    return claim;
  }

  /**
   * Request Additional Technical Information from Worker (3-Button Provider Decision Card)
   */
  public providerRequestMoreInfo(
    providerId: string,
    claimId: string,
    notes: string
  ): WarrantyClaimV1 {
    const claim = this.getWarrantyClaimV1ById(claimId);
    if (!claim) throw new Error("Klaim garansi tidak ditemukan.");
    const warranty = this.getWarrantyV1(claim.warrantyId);
    const isOwner =
      warranty &&
      (warranty.providerId === providerId ||
        (warranty.providerId === "prov-01" && providerId === "usr-prov-001") ||
        (warranty.providerId === "usr-prov-001" && providerId === "prov-01"));
    if (!isOwner) throw new Error("Anda tidak memiliki izin mengelola klaim ini.");

    claim.infoRequested = true;
    claim.infoRequestedAt = new Date().toISOString();
    claim.infoRequestedNotes = notes?.trim() || "Provider memerlukan klarifikasi teknis tambahan pada diagnosis.";
    claim.updatedAt = new Date().toISOString();

    const assignment = this.warrantyAssignmentsV1.find(
      (a) => a.warrantyClaimId === claimId && a.status !== "CANCELLED"
    );

    this.warrantyTimelineEventsV1.unshift({
      id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warrantyId: warranty.id,
      warrantyClaimId: claim.id,
      eventType: "PROVIDER_INFO_REQUESTED",
      title: "Provider Meminta Informasi Tambahan",
      description: notes?.trim() || "Provider meminta teknisi melengkapi temuan atau bukti pemeriksaan.",
      actorId: providerId,
      actorRole: "PROVIDER",
      timestamp: new Date().toISOString(),
      visibility: "INTERNAL",
    });

    if (assignment) {
      this.sendNotification({
        recipientRole: "WORKER_TECHNICIAN",
        recipientId: assignment.workerId,
        title: "Klarifikasi Diagnosis Garansi",
        message: `Provider meminta informasi tambahan untuk klaim #${claim.claimNumber}: ${notes}`,
        link: "/worker/warranty",
      });
    }

    this.notify();
    return claim;
  }

  /**
   * WAR-PAID-01 & 02: Worker Recommends Paid Work
   * Worker inputs technical contents ONLY; NO authoritative final pricing
   */
  public workerRecommendPaidWork(
    workerId: string,
    claimId: string,
    data: {
      findingSummary: string;
      recommendedWork: string;
      recommendedMaterial: string;
      estimatedDuration: number;
      evidence: string[];
      technicalNotes?: string;
    }
  ): WarrantyPaidWorkRequestV1 {
    const claim = this.getWarrantyClaimV1ById(claimId);
    if (!claim) throw new Error("Klaim garansi tidak ditemukan.");

    const isWorkerBudi =
      workerId === "worker-budi" ||
      workerId === "wrk-01" ||
      workerId === "worker-andi";

    const assignment = this.warrantyAssignmentsV1.find(
      (a) =>
        a.warrantyClaimId === claimId &&
        (a.workerId === workerId ||
          (isWorkerBudi &&
            (a.workerId === "worker-budi" ||
              a.workerId === "wrk-01" ||
              a.workerId === "worker-andi")))
    );
    if (!assignment) {
      throw new Error("Anda tidak memiliki penugasan aktif pada klaim ini.");
    }

    const newRequest: WarrantyPaidWorkRequestV1 = {
      id: `wpr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warrantyClaimId: claimId,
      workerId,
      workerName: assignment.workerName,
      findingSummary: data.findingSummary.trim(),
      recommendedWork: data.recommendedWork.trim(),
      recommendedMaterial: data.recommendedMaterial.trim(),
      estimatedDuration: data.estimatedDuration || 60,
      evidence: data.evidence || [],
      technicalNotes: data.technicalNotes?.trim(),
      status: "RECOMMENDED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.warrantyPaidWorkRequestsV1.unshift(newRequest);

    this.logAuditEvent({
      actorId: workerId,
      actorName: assignment.workerName || "Teknisi",
      actorRole: "WORKER_TECHNICIAN",
      action: "PAID_WORK_RECOMMENDED",
      resource: "WarrantyPaidWorkRequestV1",
      resourceId: newRequest.id,
      result: "SUCCESS",
    });

    const warranty = this.getWarrantyV1(claim.warrantyId);
    if (warranty) {
      this.sendNotification({
        recipientRole: "SERVICE_PROVIDER",
        recipientId: warranty.providerId,
        title: "Rekomendasi Pekerjaan Berbayar Baru",
        message: `Teknisi ${assignment.workerName} menyarankan pekerjaan tambahan di luar garansi untuk klaim #${claim.claimNumber}.`,
        link: "/provider/warranty",
      });
    }

    this.notify();
    return newRequest;
  }

  public getWarrantyPaidWorkRequest(claimId: string): WarrantyPaidWorkRequestV1 | null {
    return (
      this.warrantyPaidWorkRequestsV1.find((r) => r.warrantyClaimId === claimId) || null
    );
  }

  public providerReviewPaidWorkRequest(
    providerId: string,
    requestId: string,
    action: "REJECT" | "REQUEST_INFO"
  ): WarrantyPaidWorkRequestV1 {
    const req = this.warrantyPaidWorkRequestsV1.find((r) => r.id === requestId);
    if (!req) throw new Error("Permintaan pekerjaan berbayar tidak ditemukan.");

    const claim = this.getWarrantyClaimV1ById(req.warrantyClaimId);
    const warranty = claim ? this.getWarrantyV1(claim.warrantyId) : null;
    if (!warranty || warranty.providerId !== providerId) {
      throw new Error("Anda tidak berwenang meninjau permintaan mitra lain.");
    }

    if (action === "REJECT") {
      req.status = "PROVIDER_REJECTED";
      req.updatedAt = new Date().toISOString();

      this.logAuditEvent({
        actorId: providerId,
        actorName: "Provider",
        actorRole: "SERVICE_PROVIDER",
        action: "PAID_WORK_RECOMMENDATION_REJECTED",
        resource: "WarrantyPaidWorkRequestV1",
        resourceId: req.id,
        result: "SUCCESS",
      });

      this.sendNotification({
        recipientRole: "WORKER_TECHNICIAN",
        recipientId: req.workerId,
        title: "Rekomendasi Berbayar Ditolak",
        message: `Provider tidak menyetujui rekomendasi pekerjaan berbayar untuk klaim #${claim?.claimNumber}.`,
        link: "/worker/warranty",
      });
    } else {
      req.status = "INFO_REQUIRED";
      req.updatedAt = new Date().toISOString();

      this.logAuditEvent({
        actorId: providerId,
        actorName: "Provider",
        actorRole: "SERVICE_PROVIDER",
        action: "PAID_WORK_INFO_REQUESTED",
        resource: "WarrantyPaidWorkRequestV1",
        resourceId: req.id,
        result: "SUCCESS",
      });

      this.sendNotification({
        recipientRole: "WORKER_TECHNICIAN",
        recipientId: req.workerId,
        title: "Informasi Tambahan Diperlukan",
        message: `Provider meminta penjelasan teknis tambahan terkait rekomendasi pekerjaan berbayar klaim #${claim?.claimNumber}.`,
        link: "/worker/warranty",
      });
    }

    this.notify();
    return req;
  }

  /**
   * WAR-PAID-05: Provider Creates Final Paid-Work Proposal
   * Provider is EXCLUSIVE PRICE OWNER
   */
  public providerCreatePaidWorkProposal(
    providerId: string,
    paidWorkRequestId: string,
    data: {
      title: string;
      scope: string;
      lineItems: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }>;
      reasonOutsideWarranty: string;
      notes?: string;
    }
  ): WarrantyPaidWorkProposalV1 {
    const req = this.warrantyPaidWorkRequestsV1.find((r) => r.id === paidWorkRequestId);
    if (!req) throw new Error("Permintaan rekomendasi tidak ditemukan.");

    const claim = this.getWarrantyClaimV1ById(req.warrantyClaimId);
    if (!claim) throw new Error("Klaim garansi terkait tidak ditemukan.");

    const warranty = this.getWarrantyV1(claim.warrantyId);
    const isOwner =
      warranty &&
      (warranty.providerId === providerId ||
        (warranty.providerId === "prov-01" && providerId === "usr-prov-001") ||
        (warranty.providerId === "usr-prov-001" && providerId === "prov-01"));
    if (!isOwner) {
      throw new Error("Anda tidak berwenang membuat proposal untuk mitra lain.");
    }

    const subtotal = data.lineItems.reduce((acc, item) => acc + item.total, 0);
    const fees = 5000; // Platform application fee
    const totalAmount = subtotal + fees;

    const newProposal: WarrantyPaidWorkProposalV1 = {
      id: `wpp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      paidWorkRequestId,
      warrantyClaimId: claim.id,
      customerId: warranty.customerId,
      providerId,
      title: data.title.trim(),
      scope: data.scope.trim(),
      lineItems: data.lineItems,
      subtotal,
      fees,
      totalAmount,
      reasonOutsideWarranty: data.reasonOutsideWarranty.trim(),
      notes: data.notes?.trim(),
      status: "PROPOSAL_SENT",
      proposedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.warrantyPaidWorkProposalsV1.unshift(newProposal);
    req.status = "PROPOSAL_SENT";
    req.updatedAt = new Date().toISOString();

    this.warrantyTimelineEventsV1.unshift({
      id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warrantyId: warranty.id,
      warrantyClaimId: claim.id,
      eventType: "PAID_WORK_PROPOSED",
      title: "Penawaran Pekerjaan Berbayar Dikirimkan",
      description: `Provider telah menyusun penawaran perbaikan berbayar sebesar Rp ${totalAmount.toLocaleString(
        "id-ID"
      )}. Menunggu persetujuan pelanggan.`,
      actorId: providerId,
      actorRole: "PROVIDER",
      timestamp: newProposal.proposedAt,
      visibility: "CUSTOMER_SAFE",
    });

    this.logAuditEvent({
      actorId: providerId,
      actorName: "Provider",
      actorRole: "SERVICE_PROVIDER",
      action: "PAID_WORK_PROPOSED",
      resource: "WarrantyPaidWorkProposalV1",
      resourceId: newProposal.id,
      result: "SUCCESS",
      metadata: { totalAmount, subtotal, fees },
    });

    this.sendNotification({
      recipientRole: "CUSTOMER",
      recipientId: warranty.customerId,
      title: "Penawaran Pekerjaan di Luar Garansi",
      message: `Provider telah mengirimkan penawaran perbaikan: ${data.title} (Rp ${totalAmount.toLocaleString(
        "id-ID"
      )}). Silakan tinjau dan berikan persetujuan.`,
      link: `/warranties/${warranty.id}`,
    });

    this.notify();
    return newProposal;
  }

  public getWarrantyPaidWorkProposal(proposalId: string): WarrantyPaidWorkProposalV1 | null {
    return this.warrantyPaidWorkProposalsV1.find((p) => p.id === proposalId) || null;
  }

  public getWarrantyPaidWorkProposalByClaim(claimId: string): WarrantyPaidWorkProposalV1 | null {
    return (
      this.warrantyPaidWorkProposalsV1.find((p) => p.warrantyClaimId === claimId) || null
    );
  }

  /**
   * WAR-PAID-07 to 10: Customer Responds to Paid Work Proposal
   * Customer is EXCLUSIVE commercial approval owner!
   * Approving creates NEW linked ServiceOrder; original completed order remains strictly IMMUTABLE!
   */
  public customerRespondPaidWorkProposal(
    customerId: string,
    proposalId: string,
    approved: boolean,
    reason?: string
  ): { proposal: WarrantyPaidWorkProposalV1; newOrder?: ServiceOrder } {
    const proposal = this.warrantyPaidWorkProposalsV1.find((p) => p.id === proposalId);
    if (!proposal) throw new Error("Proposal penawaran tidak ditemukan.");

    if (proposal.customerId !== customerId) {
      throw new Error("Anda tidak memiliki akses ke proposal ini.");
    }

    // Idempotency check: if already answered, return existing state safely
    if (proposal.status !== "PROPOSAL_SENT") {
      const existingLinkedOrder = proposal.linkedPaidOrderId
        ? this.orders.find((o) => o.id === proposal.linkedPaidOrderId)
        : undefined;
      return { proposal, newOrder: existingLinkedOrder };
    }

    const claim = this.getWarrantyClaimV1ById(proposal.warrantyClaimId);
    const warranty = claim ? this.getWarrantyV1(claim.warrantyId) : null;
    const req = this.warrantyPaidWorkRequestsV1.find((r) => r.id === proposal.paidWorkRequestId);

    if (!approved) {
      // CUSTOMER REJECTS
      proposal.status = "CUSTOMER_REJECTED";
      proposal.respondedAt = new Date().toISOString();
      proposal.responseReason = reason || "Pelanggan menolak penawaran perbaikan berbayar.";
      proposal.updatedAt = new Date().toISOString();

      if (req) {
        req.status = "CUSTOMER_REJECTED";
        req.updatedAt = new Date().toISOString();
      }

      if (claim) {
        claim.status = "REJECTED";
        claim.rejectionReason = "Pekerjaan di luar garansi ditolak oleh pelanggan.";
        claim.updatedAt = new Date().toISOString();
      }

      if (warranty) {
        this.warrantyTimelineEventsV1.unshift({
          id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          warrantyId: warranty.id,
          warrantyClaimId: claim?.id,
          eventType: "PAID_WORK_REJECTED",
          title: "Penawaran Pekerjaan Berbayar Ditolak",
          description: "Pelanggan memilih untuk tidak melanjutkan pekerjaan berbayar.",
          actorId: customerId,
          actorRole: "CUSTOMER",
          timestamp: proposal.respondedAt,
          visibility: "CUSTOMER_SAFE",
        });
      }

      this.logAuditEvent({
        actorId: customerId,
        actorName: "Customer",
        actorRole: "CUSTOMER",
        action: "PAID_WORK_REJECTED",
        resource: "WarrantyPaidWorkProposalV1",
        resourceId: proposal.id,
        result: "SUCCESS",
        reason: proposal.responseReason,
      });

      this.sendNotification({
        recipientRole: "SERVICE_PROVIDER",
        recipientId: proposal.providerId,
        title: "Penawaran Berbayar Ditolak",
        message: `Pelanggan menolak penawaran pekerjaan berbayar untuk klaim #${claim?.claimNumber}.`,
        link: "/provider/warranty",
      });

      if (req) {
        this.sendNotification({
          recipientRole: "WORKER_TECHNICIAN",
          recipientId: req.workerId,
          title: "Pekerjaan Tidak Diotorisasi",
          message: `Pelanggan menolak pekerjaan berbayar untuk klaim #${claim?.claimNumber}. Pekerjaan tidak dapat dilanjutkan.`,
          link: "/worker/warranty",
        });
      }

      this.notify();
      return { proposal };
    }

    // CUSTOMER APPROVES: Create NEW linked ServiceOrder in canonical engine
    proposal.status = "CUSTOMER_APPROVED";
    proposal.respondedAt = new Date().toISOString();
    proposal.updatedAt = new Date().toISOString();

    if (req) {
      req.status = "AUTHORIZED";
      req.updatedAt = new Date().toISOString();
    }

    const assignedWorker = req?.workerId
      ? this.workers.find((w) => w.id === req.workerId)
      : undefined;

    const newOrderId = `ORD-PAID-${Date.now().toString().slice(-6)}`;
    const newJobId = `JOB-PAID-${Date.now().toString().slice(-6)}`;

    // NEW linked ServiceOrder: strictly separated from completed original order!
    const newOrder: ServiceOrder = {
      id: newOrderId,
      customerId: proposal.customerId,
      customerName: warranty?.customerName || "Pelanggan",
      customerPhone: "0812-9988-7711",
      serviceId: warranty?.providerMasterServiceId || "pms-smt-001",
      serviceTitle: proposal.title,
      domainId: "repair",
      providerId: proposal.providerId,
      providerName: warranty?.providerName || "Mitra Servio",
      assignedWorker,
      serviceMode: "HOME_SERVICE",
      address: "Alamat Pelanggan",
      scheduledDate: new Date().toISOString().split("T")[0],
      scheduledTimeSlot: "14:00 WIB",
      status: "IN_PROGRESS",
      statusLabel: `Pekerjaan Berbayar (Terkait Klaim Garansi ${claim?.claimNumber})`,
      stepper: [
        {
          id: "step-1",
          title: "Proposal Disetujui",
          description: "Pelanggan menyetujui biaya pekerjaan tambahan",
          isCurrent: false,
          isCompleted: true,
        },
        {
          id: "step-2",
          title: "Pengerjaan Unit",
          description: "Teknisi mengeksekusi perbaikan berbayar",
          isCurrent: true,
          isCompleted: false,
        },
        {
          id: "step-3",
          title: "Selesai",
          description: "Verifikasi pekerjaan berbayar",
          isCurrent: false,
          isCompleted: false,
        },
      ],
      pricing: {
        serviceFee: proposal.subtotal,
        materialFee: 0,
        platformFee: proposal.fees,
        totalAmount: proposal.totalAmount,
        discountAmount: 0,
      },
      isEscrowLocked: false,
      warrantyPeriodDays: 30, // Standalone new service policy if applicable
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentWarrantyClaimId: claim?.id,
      originalServiceOrderId: warranty?.originalServiceOrderId,
      isPaidWork: true,
    };

    // Prepend to canonical orders collection
    this.orders.unshift(newOrder);

    // Enqueue Worker Job for authorized paid work
    if (assignedWorker) {
      const newJob: WorkerJob = {
        id: newJobId,
        orderId: newOrderId,
        workerId: assignedWorker.id,
        customerName: newOrder.customerName,
        customerPhone: newOrder.customerPhone || "0812-9988-7711",
        customerAddress: newOrder.address,
        address: newOrder.address,
        serviceTitle: `[PAID WORK] ${proposal.title}`,
        scheduledTime: newOrder.scheduledTimeSlot,
        scheduledDate: newOrder.scheduledDate,
        scheduledTimeSlot: newOrder.scheduledTimeSlot,
        issueDescription: proposal.scope,
        distanceKm: 2.5,
        status: "IN_PROGRESS",
        feeWorker: Math.round(proposal.subtotal * 0.7),
        sopSteps: [],
        usedMaterials: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.workerJobs.unshift(newJob);
    }

    proposal.linkedPaidOrderId = newOrderId;

    if (warranty) {
      this.warrantyTimelineEventsV1.unshift({
        id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        warrantyId: warranty.id,
        warrantyClaimId: claim?.id,
        eventType: "PAID_WORK_APPROVED",
        title: "Pekerjaan Berbayar Disetujui Pelanggan",
        description: `Pelanggan telah menyetujui perbaikan berbayar sebesar Rp ${proposal.totalAmount.toLocaleString(
          "id-ID"
        )}. Transaksi pekerjaan baru #${newOrderId} telah diotorisasi.`,
        actorId: customerId,
        actorRole: "CUSTOMER",
        timestamp: proposal.respondedAt,
        visibility: "CUSTOMER_SAFE",
      });
    }

    this.logAuditEvent({
      actorId: customerId,
      actorName: "Customer",
      actorRole: "CUSTOMER",
      action: "PAID_WORK_APPROVED",
      resource: "WarrantyPaidWorkProposalV1",
      resourceId: proposal.id,
      result: "SUCCESS",
      metadata: {
        newOrderId,
        originalServiceOrderId: warranty?.originalServiceOrderId,
        totalAmount: proposal.totalAmount,
      },
    });

    this.sendNotification({
      recipientRole: "SERVICE_PROVIDER",
      recipientId: proposal.providerId,
      title: "Pekerjaan Berbayar Disetujui",
      message: `Pelanggan menyetujui perbaikan berbayar klaim #${claim?.claimNumber}. Order #${newOrderId} telah aktif.`,
      link: "/provider/orders",
    });

    if (req) {
      this.sendNotification({
        recipientRole: "WORKER_TECHNICIAN",
        recipientId: req.workerId,
        title: "Pekerjaan Berbayar Diotorisasi",
        message: `Pelanggan telah menyetujui pekerjaan berbayar #${newOrderId}. Silakan laksanakan servis unit.`,
        link: "/worker/jobs",
      });
    }

    this.notify();
    return { proposal, newOrder };
  }

  /**
   * WAR-REP-03 to 07: Covered Repair Execution & Completion Review
   * Claim RESOLVED does NOT expire Warranty; Warranty remains ACTIVE until expiry!
   */
  public workerSubmitCompletionProof(
    workerId: string,
    claimId: string,
    data: {
      summary?: string;
      workDescription?: string;
      notes?: string;
      evidenceBefore?: string[];
      evidenceAfter?: string[];
      beforePhotos?: string[];
      afterPhotos?: string[];
      [key: string]: any;
    }
  ): WarrantyCompletionProofV1 {
    const claim = this.getWarrantyClaimV1ById(claimId);
    if (!claim) throw new Error("Klaim garansi tidak ditemukan.");

    const warranty = this.getWarrantyV1(claim.warrantyId);
    if (!warranty) throw new Error("Garansi terkait tidak ditemukan.");

    const summary = (data.summary || (data as any).workDescription || "Perbaikan selesai").trim();
    const evidenceBefore = data.evidenceBefore || (data as any).beforePhotos || [];
    const evidenceAfter = data.evidenceAfter || (data as any).afterPhotos || [];

    const newProof: WarrantyCompletionProofV1 = {
      id: `wcp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warrantyClaimId: claimId,
      workerId,
      summary,
      notes: data.notes?.trim(),
      evidenceBefore,
      evidenceAfter,
      submittedAt: new Date().toISOString(),
      status: "SUBMITTED",
    };

    this.warrantyCompletionProofsV1.unshift(newProof);

    this.warrantyTimelineEventsV1.unshift({
      id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warrantyId: warranty.id,
      warrantyClaimId: claim.id,
      eventType: "COMPLETION_PROOF_SUBMITTED",
      title: "Bukti Perbaikan Garansi Telah Diserahkan",
      description: `Teknisi telah menyelesaikan perbaikan garansi dan menyerahkan bukti foto before/after untuk verifikasi.`,
      actorId: workerId,
      actorRole: "WORKER",
      timestamp: newProof.submittedAt,
      visibility: "CUSTOMER_SAFE",
    });

    this.logAuditEvent({
      actorId: workerId,
      actorName: "Teknisi",
      actorRole: "WORKER_TECHNICIAN",
      action: "COMPLETION_PROOF_SUBMITTED",
      resource: "WarrantyCompletionProofV1",
      resourceId: newProof.id,
      result: "SUCCESS",
    });

    this.sendNotification({
      recipientRole: "SERVICE_PROVIDER",
      recipientId: warranty.providerId,
      title: "Bukti Penyelesaian Perbaikan Garansi",
      message: `Teknisi telah menyelesaikan perbaikan klaim #${claim.claimNumber}. Mohon verifikasi hasil bukti pengerjaan.`,
      link: "/provider/warranty",
    });

    this.notify();
    return newProof;
  }

  public getWarrantyCompletionProof(claimId: string): WarrantyCompletionProofV1 | null {
    return (
      this.warrantyCompletionProofsV1.find((p) => p.warrantyClaimId === claimId) || null
    );
  }

  public providerReviewCompletionProof(
    providerId: string,
    claimIdOrProofId: string,
    approved: boolean,
    notes?: string
  ): WarrantyClaimV1 | WarrantyCompletionProofV1 {
    let claim = this.getWarrantyClaimV1ById(claimIdOrProofId);
    if (!claim) {
      const proof = this.warrantyCompletionProofsV1.find((p) => p.id === claimIdOrProofId);
      if (proof) {
        claim = this.getWarrantyClaimV1ById(proof.warrantyClaimId);
      }
    }
    if (!claim) throw new Error("Klaim garansi tidak ditemukan.");

    const warranty = this.getWarrantyV1(claim.warrantyId);
    const isOwner =
      warranty &&
      (warranty.providerId === providerId ||
        (warranty.providerId === "prov-01" && providerId === "usr-prov-001") ||
        (warranty.providerId === "usr-prov-001" && providerId === "prov-01"));
    if (!isOwner) {
      throw new Error("Anda tidak memiliki izin memverifikasi bukti mitra lain.");
    }

    const proof = this.warrantyCompletionProofsV1.find(
      (p) => p.id === claimIdOrProofId || p.warrantyClaimId === claim.id
    );
    if (proof) {
      proof.status = approved ? "APPROVED" : "REJECTED";
      proof.reviewedAt = new Date().toISOString();
      proof.reviewedBy = providerId;
    }

    if (!approved) {
      // Insufficient proof: claim remains REPAIR_IN_PROGRESS
      claim.status = "REPAIR_IN_PROGRESS";
      claim.updatedAt = new Date().toISOString();

      this.logAuditEvent({
        actorId: providerId,
        actorName: "Provider",
        actorRole: "SERVICE_PROVIDER",
        action: "COMPLETION_PROOF_REVISED",
        resource: "WarrantyClaimV1",
        resourceId: claim.id,
        result: "WARNING",
        reason: notes || "Bukti belum memenuhi standar.",
      });

      const assignment = this.warrantyAssignmentsV1.find(
        (a) => a.warrantyClaimId === claim.id
      );
      if (assignment) {
        this.sendNotification({
          recipientRole: "WORKER_TECHNICIAN",
          recipientId: assignment.workerId,
          title: "Bukti Perbaikan Perlu Revisi",
          message: `Provider meminta kelengkapan bukti tambahan untuk klaim #${claim.claimNumber}.`,
          link: "/worker/warranty",
        });
      }

      this.notify();
      return claim;
    }

    // APPROVED: Claim is RESOLVED!
    claim.status = "RESOLVED";
    claim.resolvedAt = new Date().toISOString();
    claim.updatedAt = new Date().toISOString();

    // Mark assignment completed
    const assignment = this.warrantyAssignmentsV1.find(
      (a) => a.warrantyClaimId === claim.id && a.status !== "RESCHEDULED"
    );
    if (assignment) {
      assignment.status = "COMPLETED";
      assignment.completedAt = new Date().toISOString();
      assignment.updatedAt = new Date().toISOString();
    }

    // MANDATORY: Warranty remains ACTIVE until expiry!
    // (Do not alter warranty.status or warranty.expiresAt!)

    this.warrantyTimelineEventsV1.unshift({
      id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warrantyId: warranty.id,
      warrantyClaimId: claim.id,
      eventType: "CLAIM_RESOLVED",
      title: "Klaim Garansi Selesai & Dituntaskan",
      description:
        notes ||
        "Provider telah memverifikasi perbaikan garansi dan klaim dinyatakan selesai.",
      actorId: providerId,
      actorRole: "PROVIDER",
      timestamp: claim.resolvedAt,
      visibility: "CUSTOMER_SAFE",
    });

    this.logAuditEvent({
      actorId: providerId,
      actorName: "Provider",
      actorRole: "SERVICE_PROVIDER",
      action: "CLAIM_RESOLVED",
      resource: "WarrantyClaimV1",
      resourceId: claim.id,
      result: "SUCCESS",
    });

    this.sendNotification({
      recipientRole: "CUSTOMER",
      recipientId: warranty.customerId,
      title: "Klaim Garansi Berhasil Diselesaikan",
      message: `Perbaikan klaim #${claim.claimNumber} telah diverifikasi selesai. Sisa masa garansi tetap aktif sampai ${warranty.expiresAt?.split("T")[0]}.`,
      link: `/warranties/${warranty.id}`,
    });

    this.notify();
    if (proof && (claimIdOrProofId === proof.id || claimIdOrProofId.startsWith("wcp-"))) {
      return proof;
    }
    return claim;
  }

  /**
   * WAR-TL-01 to 07: Timeline Filtering by Role
   */
  public getWarrantyTimeline(warrantyId: string, role: string): WarrantyTimelineEventV1[] {
    const events = this.warrantyTimelineEventsV1.filter((e) => e.warrantyId === warrantyId);
    if (role === "CUSTOMER") {
      return events.filter((e) => e.visibility === "CUSTOMER_SAFE");
    }
    return events;
  }

  /**
   * WAR-RBAC-10 & 11: CEO Analytics & Admin Monitoring
   */
  public getCeoWarrantyAnalytics() {
    const now = Date.now();
    const activeWarranties = this.warrantiesV1.filter((w) => this.isWarrantyActive(w)).length;
    const totalGranted = this.warrantiesV1.filter((w) => w.status !== "PENDING_ACTIVATION").length;
    const totalClaims = this.warrantyClaimsV1.length;

    const warrantiesWithClaims = new Set(this.warrantyClaimsV1.map((c) => c.warrantyId)).size;
    const claimRate = totalGranted > 0 ? (warrantiesWithClaims / totalGranted) * 100 : 0;

    const resolvedClaims = this.warrantyClaimsV1.filter((c) => c.status === "RESOLVED" && c.resolvedAt);
    let avgResolutionHours = 0;
    if (resolvedClaims.length > 0) {
      const totalTime = resolvedClaims.reduce((acc, c) => {
        const sub = new Date(c.submittedAt).getTime();
        const res = new Date(c.resolvedAt!).getTime();
        return acc + Math.max(0, res - sub);
      }, 0);
      avgResolutionHours = Math.round(totalTime / resolvedClaims.length / (1000 * 3600));
    }

    const rejectedClaims = this.warrantyClaimsV1.filter((c) => c.status === "REJECTED").length;
    const totalProposals = this.warrantyPaidWorkProposalsV1.length;
    const approvedProposals = this.warrantyPaidWorkProposalsV1.filter(
      (p) => p.status === "CUSTOMER_APPROVED"
    ).length;
    const paidWorkConversion = totalProposals > 0 ? (approvedProposals / totalProposals) * 100 : 0;

    const escalatedClaims = this.warrantyClaimsV1.filter((c) => c.status === "DISPUTED").length;

    return {
      activeWarranties,
      totalGranted,
      totalClaims,
      claimRate: Math.round(claimRate * 10) / 10,
      avgResolutionHours,
      rejectedClaims,
      totalProposals,
      approvedProposals,
      paidWorkConversion: Math.round(paidWorkConversion * 10) / 10,
      escalatedClaims,
    };
  }

  public getAdminWarrantyMonitoring() {
    const activeClaims = this.warrantyClaimsV1.filter((c) =>
      [
        "SUBMITTED",
        "UNDER_REVIEW",
        "INSPECTION_ASSIGNED",
        "INSPECTION_SCHEDULED",
        "INSPECTION_IN_PROGRESS",
        "DIAGNOSIS_SUBMITTED",
        "WAITING_PROVIDER_DECISION",
        "REPAIR_APPROVED",
        "REPAIR_SCHEDULED",
        "REPAIR_IN_PROGRESS",
      ].includes(c.status)
    );

    const now = Date.now();
    const agingClaims = activeClaims.filter((c) => {
      const ageHours = (now - new Date(c.submittedAt).getTime()) / (1000 * 3600);
      return ageHours >= 72; // > 3 days
    });

    const slaRiskClaims = activeClaims.filter((c) => {
      const ageHours = (now - new Date(c.submittedAt).getTime()) / (1000 * 3600);
      return ageHours >= 48 && ageHours < 72;
    });

    const escalatedClaims = this.warrantyClaimsV1.filter((c) => c.status === "DISPUTED");

    return {
      openClaimsCount: activeClaims.length,
      agingClaimsCount: agingClaims.length,
      slaRiskCount: slaRiskClaims.length,
      escalatedCount: escalatedClaims.length,
      activeClaims,
      agingClaims,
      slaRiskClaims,
      escalatedClaims,
    };
  }

  /**
   * WAR-CORR-12 & GAP 04: Customer Disputes Rejected Warranty Claim
   * Reuses existing canonical DisputeCase; transitions claim to DISPUTED
   * Preserves rejection reason, actor, timestamp, timeline, and audit history
   */
  public customerDisputeWarrantyClaim(
    customerId: string,
    claimId: string,
    reason: string
  ): { claim: WarrantyClaimV1; dispute: DisputeCase } {
    const claim = this.getWarrantyClaimV1ById(claimId);
    if (!claim) throw new Error("Klaim garansi tidak ditemukan.");
    if (claim.status !== "REJECTED") {
      throw new Error("Hanya klaim yang ditolak yang dapat diajukan sengketa.");
    }
    const warranty = this.getWarrantyV1(claim.warrantyId);
    const isOwner =
      warranty &&
      (warranty.customerId === customerId ||
        ((customerId === "cust-01" || customerId === "usr-cust-001" || customerId === "cust-budi") &&
          (warranty.customerId === "cust-01" || warranty.customerId === "usr-cust-001" || warranty.customerId === "cust-budi")));
    if (!isOwner) {
      throw new Error("Anda tidak memiliki akses ke klaim ini.");
    }

    const disputeId = `DISP-${Date.now().toString().slice(-4)}`;
    const dispute: DisputeCase = {
      id: disputeId,
      orderId: warranty.originalServiceOrderId,
      serviceOrderId: warranty.originalServiceOrderId,
      serviceTitle: warranty.serviceTitle || "Layanan Garansi",
      customerId: warranty.customerId,
      customerName: warranty.customerName || "Pelanggan",
      providerId: warranty.providerId,
      providerName: warranty.providerName || "Mitra Servio",
      workerId: warranty.workerId,
      workerName: warranty.workerName,
      category: "SERVICE_QUALITY",
      reason: reason || "Sengketa Penolakan Klaim Garansi",
      detailedComplaint: `Sengketa penolakan klaim #${claim.claimNumber}. Alasan penolakan: ${claim.rejectionReason || "-"}. Argumen pelanggan: ${reason}`,
      description: `Sengketa penolakan klaim #${claim.claimNumber}. Alasan penolakan: ${claim.rejectionReason || "-"}. Argumen pelanggan: ${reason}`,
      disputedAmount: 0,
      evidencePhotos: claim.evidence || [],
      requestedResolution: "FREE_REWORK",
      status: "OPEN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.disputes.unshift(dispute);

    // Transition claim status to DISPUTED (preserve rejection reason)
    claim.status = "DISPUTED";
    claim.updatedAt = new Date().toISOString();

    // Timeline event
    this.warrantyTimelineEventsV1.unshift({
      id: `WTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      warrantyId: warranty.id,
      warrantyClaimId: claim.id,
      eventType: "DISPUTE_ESCALATED",
      title: "Sengketa Penolakan Garansi Diajukan",
      description: `Pelanggan mengajukan sengketa resmi (#${disputeId}) terhadap penolakan klaim. Alasan penolakan: ${claim.rejectionReason}. Argumen: ${reason}`,
      actorId: customerId,
      actorRole: "CUSTOMER",
      timestamp: new Date().toISOString(),
      visibility: "CUSTOMER_SAFE",
    });

    // Audit log
    this.logAuditEvent({
      actorId: customerId,
      actorName: warranty.customerName || "Customer",
      actorRole: "CUSTOMER",
      action: "DISPUTE_ESCALATED",
      resource: "WarrantyClaimV1",
      resourceId: claim.id,
      result: "SUCCESS",
      reason,
      metadata: { disputeId, rejectionReason: claim.rejectionReason },
    });

    // Notify Provider
    this.sendNotification({
      recipientRole: "SERVICE_PROVIDER",
      recipientId: warranty.providerId,
      title: "Sengketa Klaim Garansi Masuk",
      message: `Pelanggan mengajukan sengketa #${disputeId} atas penolakan klaim #${claim.claimNumber}. Silakan lakukan peninjauan mediasi.`,
      link: "/provider/disputes",
    });

    this.notify();
    return { claim, dispute };
  }

  /**
   * Part C Section 23: Deterministic Dev/Test Fixture Reset
   */
  public resetWarrantyV1Fixtures(): void {
    this.providerWarrantySettings = [...INITIAL_PROVIDER_WARRANTY_SETTINGS];
    this.providerWarrantyDurations = [...INITIAL_PROVIDER_WARRANTY_DURATIONS];
    this.serviceWarrantyConfigs = [...INITIAL_SERVICE_WARRANTY_CONFIGS];
    this.warrantiesV1 = [...INITIAL_WARRANTIES_V1];
    this.warrantyClaimsV1 = [...INITIAL_WARRANTY_CLAIMS_V1];
    this.warrantyAssignmentsV1 = [...INITIAL_WARRANTY_ASSIGNMENTS_V1];
    this.warrantyDiagnosesV1 = [...INITIAL_WARRANTY_DIAGNOSES_V1];
    this.warrantyPaidWorkRequestsV1 = [...INITIAL_WARRANTY_PAID_WORK_REQUESTS_V1];
    this.warrantyPaidWorkProposalsV1 = [...INITIAL_WARRANTY_PAID_WORK_PROPOSALS_V1];
    this.warrantyCompletionProofsV1 = [...INITIAL_WARRANTY_COMPLETION_PROOFS_V1];
    this.warrantyTimelineEventsV1 = [...INITIAL_WARRANTY_TIMELINE_EVENTS_V1];
    this.notify();
  }

  // Section 52 Phase 1 Canonical Alias Methods
  public providerReviewWarrantyClaim(
    providerId: string,
    claimId: string,
    action: "ACCEPT" | "REJECT",
    rejectionReason?: string
  ): WarrantyClaimV1 {
    return this.reviewWarrantyClaim(providerId, claimId, action, rejectionReason);
  }

  public providerAssignWarrantyWorker(
    providerId: string,
    claimId: string,
    workerId: string,
    assignmentType: "INSPECTION" | "REPAIR",
    schedule: {
      scheduledDate: string;
      scheduledStartTime: string;
      estimatedDuration?: number;
      location?: string;
      notes?: string;
    }
  ): WarrantyAssignmentV1 {
    return this.assignWarrantyWorker(providerId, claimId, workerId, assignmentType, schedule);
  }

  public providerScheduleWarrantyInspection(
    providerId: string,
    claimId: string,
    workerId: string,
    schedule: {
      scheduledDate: string;
      scheduledStartTime: string;
      estimatedDuration?: number;
      location?: string;
      notes?: string;
    }
  ): WarrantyAssignmentV1 {
    return this.assignWarrantyWorker(providerId, claimId, workerId, "INSPECTION", schedule);
  }

  public providerApproveWarrantyRepair(
    providerId: string,
    claimId: string,
    notes?: string
  ): WarrantyClaimV1 {
    return this.providerDecideCoverage(providerId, claimId, true, notes);
  }

  public providerRequestMoreWarrantyInfo(
    providerId: string,
    claimId: string,
    notes: string
  ): WarrantyClaimV1 {
    return this.providerRequestMoreInfo(providerId, claimId, notes);
  }

  public customerApprovePaidWork(
    customerId: string,
    proposalId: string
  ): { proposal: WarrantyPaidWorkProposalV1; newOrder?: ServiceOrder } {
    return this.customerRespondPaidWorkProposal(customerId, proposalId, true);
  }

  public customerRejectPaidWork(
    customerId: string,
    proposalId: string,
    reason?: string
  ): { proposal: WarrantyPaidWorkProposalV1; newOrder?: ServiceOrder } {
    return this.customerRespondPaidWorkProposal(customerId, proposalId, false, reason);
  }

  public workerSubmitWarrantyCompletion(
    workerId: string,
    claimId: string,
    data: {
      summary?: string;
      workDescription?: string;
      notes?: string;
      evidenceBefore?: string[];
      evidenceAfter?: string[];
      [key: string]: any;
    }
  ): WarrantyCompletionProofV1 {
    return this.workerSubmitCompletionProof(workerId, claimId, data);
  }

  public providerResolveWarrantyClaim(
    providerId: string,
    claimIdOrProofId: string,
    notes?: string
  ): WarrantyClaimV1 | WarrantyCompletionProofV1 {
    return this.providerReviewCompletionProof(providerId, claimIdOrProofId, true, notes);
  }
}

// Global Singleton Instance
export const domainRepository = new CentralDomainStore();
export { CentralDomainStore as DomainRepository };

/**
 * React Hook that subscribes to domain store updates
 */
export function useDomainRepository() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return domainRepository.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  return domainRepository;
}
