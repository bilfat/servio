export type PaymentGatewayStatus = "SETTLED" | "PENDING_WEBHOOK" | "EXPIRED" | "FAILED";
export type PaymentMethod = "BCA_VA" | "MANDIRI_VA" | "BRI_VA" | "QRIS" | "CREDIT_CARD" | "GOPAY";

export interface GatewayTransaction {
  id: string; // e.g. TRX-2026-9901
  orderId: string;
  orderType: "SERVICE" | "SPAREPART";
  customerName: string;
  vendorName: string;
  paymentMethod: PaymentMethod;
  grossAmount: number;
  platformFeeRate: number; // e.g. 0.10 (10%)
  platformFeeAmount: number;
  vendorNetAmount: number;
  status: PaymentGatewayStatus;
  gatewayRef: string;
  paidAt: string;
  webhookReceived: boolean;
  manualVerifiedBy?: string;
}

export type RefundStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED_AUDIT" | "COMPLETED";

export interface RefundRequest {
  id: string; // e.g. REF-2026-042
  disputeCaseId?: string;
  orderId: string;
  customerName: string;
  customerBank: string;
  customerAccountNo: string;
  refundAmount: number;
  escrowTotal: number;
  reason: string;
  source: "CS_MEDIATION" | "RETURN_PARTS" | "AUTO_CANCELLATION";
  requestedAt: string;
  status: RefundStatus;
  auditNotes?: string;
  processedBy?: string;
  processedAt?: string;
}

export type PayoutStatus = "READY_BATCH" | "PROCESSING" | "RELEASED" | "HELD_FRAUD_CHECK";

export interface VendorPayout {
  id: string; // e.g. PAY-2026-301
  vendorId: string;
  vendorName: string;
  vendorType: "SERVICE_PROVIDER" | "MERCHANT";
  bankName: string;
  bankAccountNo: string;
  accountHolder: string;
  payoutAmount: number;
  totalOrders: number;
  riskScore: "LOW" | "MEDIUM" | "HIGH";
  requestedAt: string;
  status: PayoutStatus;
  holdReason?: string;
  releasedAt?: string;
}

export type ReconciliationMatchStatus = "MATCHED" | "DISCREPANCY_AMOUNT" | "UNMATCHED_GATEWAY" | "UNMATCHED_INTERNAL";

export interface ReconciliationItem {
  id: string;
  date: string;
  gatewayTrxId: string;
  internalTrxId: string;
  bankChannel: string;
  gatewayAmount: number;
  ledgerAmount: number;
  difference: number;
  status: ReconciliationMatchStatus;
  matchedAt?: string;
}

export const MOCK_TRANSACTIONS: GatewayTransaction[] = [
  {
    id: "TRX-2026-9901",
    orderId: "ORD-2026-8901",
    orderType: "SERVICE",
    customerName: "Budi Pratama",
    vendorName: "Sejuk Jaya Teknik",
    paymentMethod: "BCA_VA",
    grossAmount: 450000,
    platformFeeRate: 0.1,
    platformFeeAmount: 45000,
    vendorNetAmount: 405000,
    status: "SETTLED",
    gatewayRef: "MID-88291039",
    paidAt: "2026-09-21 09:14 WIB",
    webhookReceived: true,
  },
  {
    id: "TRX-2026-9902",
    orderId: "ORD-2026-8902",
    orderType: "SERVICE",
    customerName: "Siti Rahma",
    vendorName: "Karya Mandiri Service",
    paymentMethod: "QRIS",
    grossAmount: 250000,
    platformFeeRate: 0.1,
    platformFeeAmount: 25000,
    vendorNetAmount: 225000,
    status: "PENDING_WEBHOOK",
    gatewayRef: "XEN-99120341",
    paidAt: "2026-09-21 11:20 WIB",
    webhookReceived: false,
  },
  {
    id: "TRX-2026-9903",
    orderId: "ORD-2026-8903",
    orderType: "SPAREPART",
    customerName: "Hendro Wijaya",
    vendorName: "Aneka Filter Prima",
    paymentMethod: "MANDIRI_VA",
    grossAmount: 1250000,
    platformFeeRate: 0.08,
    platformFeeAmount: 100000,
    vendorNetAmount: 1150000,
    status: "SETTLED",
    gatewayRef: "MID-88291090",
    paidAt: "2026-09-21 10:05 WIB",
    webhookReceived: true,
  },
  {
    id: "TRX-2026-9904",
    orderId: "ORD-2026-8904",
    orderType: "SERVICE",
    customerName: "Diana Kartika",
    vendorName: "Dingin Pol AC Clean",
    paymentMethod: "CREDIT_CARD",
    grossAmount: 780000,
    platformFeeRate: 0.1,
    platformFeeAmount: 78000,
    vendorNetAmount: 702000,
    status: "SETTLED",
    gatewayRef: "MID-88291112",
    paidAt: "2026-09-21 08:30 WIB",
    webhookReceived: true,
  },
  {
    id: "TRX-2026-9905",
    orderId: "ORD-2026-8905",
    orderType: "SPAREPART",
    customerName: "Ahmad Fauzi",
    vendorName: "Sentosa Jaya AC Part",
    paymentMethod: "BRI_VA",
    grossAmount: 560000,
    platformFeeRate: 0.08,
    platformFeeAmount: 44800,
    vendorNetAmount: 515200,
    status: "PENDING_WEBHOOK",
    gatewayRef: "BRI-77192004",
    paidAt: "2026-09-21 12:02 WIB",
    webhookReceived: false,
  },
];

export const MOCK_REFUNDS: RefundRequest[] = [
  {
    id: "REF-2026-041",
    disputeCaseId: "disp-901",
    orderId: "ORD-2026-8901",
    customerName: "Budi Pratama",
    customerBank: "BCA",
    customerAccountNo: "8820192831",
    refundAmount: 225000,
    escrowTotal: 450000,
    reason: "Putusan Mediasi CS: Partial refund 50% kompensasi pengerjaan drainase bocor.",
    source: "CS_MEDIATION",
    requestedAt: "2026-09-21 10:45 WIB",
    status: "PENDING_APPROVAL",
  },
  {
    id: "REF-2026-042",
    disputeCaseId: "disp-904",
    orderId: "ORD-2026-8904",
    customerName: "Lia Anggraini",
    customerBank: "Bank Mandiri",
    customerAccountNo: "137000918231",
    refundAmount: 380000,
    escrowTotal: 380000,
    reason: "Pemberitahuan Retur Sparepart: Modul PCB tidak cocok dengan unit pelanggan.",
    source: "RETURN_PARTS",
    requestedAt: "2026-09-21 08:15 WIB",
    status: "PENDING_APPROVAL",
  },
  {
    id: "REF-2026-040",
    orderId: "ORD-2026-8890",
    customerName: "Rudi Haryanto",
    customerBank: "BNI",
    customerAccountNo: "0291827461",
    refundAmount: 180000,
    escrowTotal: 180000,
    reason: "Pembatalan otomatis sistem: Teknisi tidak konfirmasi jadwal dalam 3 jam.",
    source: "AUTO_CANCELLATION",
    requestedAt: "2026-09-20 16:30 WIB",
    status: "COMPLETED",
    processedBy: "Fani Finance Ops",
    processedAt: "2026-09-20 17:00 WIB",
  },
];

export const MOCK_PAYOUTS: VendorPayout[] = [
  {
    id: "PAY-2026-301",
    vendorId: "v-sejuk",
    vendorName: "Sejuk Jaya Teknik",
    vendorType: "SERVICE_PROVIDER",
    bankName: "BCA",
    bankAccountNo: "5420198821",
    accountHolder: "PT Sejuk Jaya Solusi",
    payoutAmount: 4850000,
    totalOrders: 14,
    riskScore: "LOW",
    requestedAt: "2026-09-21 07:00 WIB",
    status: "READY_BATCH",
  },
  {
    id: "PAY-2026-302",
    vendorId: "v-mandiri",
    vendorName: "Karya Mandiri Service",
    vendorType: "SERVICE_PROVIDER",
    bankName: "Bank Mandiri",
    bankAccountNo: "123000918273",
    accountHolder: "CV Karya Mandiri",
    payoutAmount: 2150000,
    totalOrders: 6,
    riskScore: "LOW",
    requestedAt: "2026-09-21 08:30 WIB",
    status: "READY_BATCH",
  },
  {
    id: "PAY-2026-303",
    vendorId: "v-aneka",
    vendorName: "Aneka Filter Prima",
    vendorType: "MERCHANT",
    bankName: "BCA",
    bankAccountNo: "8839102911",
    accountHolder: "Aneka Filter Prima CV",
    payoutAmount: 8900000,
    totalOrders: 22,
    riskScore: "LOW",
    requestedAt: "2026-09-21 06:15 WIB",
    status: "READY_BATCH",
  },
  {
    id: "PAY-2026-304",
    vendorId: "v-curious",
    vendorName: "Teknik Dingin Cepat (Mitra Baru)",
    vendorType: "SERVICE_PROVIDER",
    bankName: "BRI",
    bankAccountNo: "019283746192",
    accountHolder: "Bambang Pamungkas",
    payoutAmount: 3400000,
    totalOrders: 8,
    riskScore: "HIGH",
    requestedAt: "2026-09-21 09:40 WIB",
    status: "HELD_FRAUD_CHECK",
    holdReason: "Lonjakan klaim garansi 3x dalam 48 jam. Ditahan untuk audit fraud.",
  },
  {
    id: "PAY-2026-300",
    vendorId: "v-dinginpol",
    vendorName: "Dingin Pol AC Clean",
    vendorType: "SERVICE_PROVIDER",
    bankName: "BCA",
    bankAccountNo: "6800192831",
    accountHolder: "Dingin Pol Teknik",
    payoutAmount: 6420000,
    totalOrders: 18,
    riskScore: "LOW",
    requestedAt: "2026-09-20 18:00 WIB",
    status: "RELEASED",
    releasedAt: "2026-09-21 08:00 WIB",
  },
];

export const MOCK_RECONCILIATIONS: ReconciliationItem[] = [
  {
    id: "REC-101",
    date: "2026-09-21",
    gatewayTrxId: "MID-88291039",
    internalTrxId: "TRX-2026-9901",
    bankChannel: "BCA VA",
    gatewayAmount: 450000,
    ledgerAmount: 450000,
    difference: 0,
    status: "MATCHED",
    matchedAt: "2026-09-21 09:15 WIB",
  },
  {
    id: "REC-102",
    date: "2026-09-21",
    gatewayTrxId: "MID-88291090",
    internalTrxId: "TRX-2026-9903",
    bankChannel: "Mandiri VA",
    gatewayAmount: 1250000,
    ledgerAmount: 1250000,
    difference: 0,
    status: "MATCHED",
    matchedAt: "2026-09-21 10:06 WIB",
  },
  {
    id: "REC-103",
    date: "2026-09-21",
    gatewayTrxId: "XEN-99120341",
    internalTrxId: "TRX-2026-9902",
    bankChannel: "QRIS",
    gatewayAmount: 250000,
    ledgerAmount: 250000,
    difference: 0,
    status: "UNMATCHED_GATEWAY",
  },
  {
    id: "REC-104",
    date: "2026-09-21",
    gatewayTrxId: "MID-88291112",
    internalTrxId: "TRX-2026-9904",
    bankChannel: "Credit Card",
    gatewayAmount: 780000,
    ledgerAmount: 780000,
    difference: 0,
    status: "MATCHED",
    matchedAt: "2026-09-21 08:31 WIB",
  },
  {
    id: "REC-105",
    date: "2026-09-21",
    gatewayTrxId: "BRI-9920199",
    internalTrxId: "TRX-2026-9877",
    bankChannel: "BRI VA",
    gatewayAmount: 320000,
    ledgerAmount: 300000,
    difference: 20000,
    status: "DISCREPANCY_AMOUNT",
  },
];

export const INITIAL_TRANSACTIONS = MOCK_TRANSACTIONS;
export const INITIAL_REFUNDS = MOCK_REFUNDS;
export const INITIAL_PAYOUTS = MOCK_PAYOUTS;
export const INITIAL_RECONCILIATION = MOCK_RECONCILIATIONS;
