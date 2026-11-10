/**
 * SERVIO PHASE 05B — ORDER JASA DOMAIN MODELS (BUSINESS BASELINE V2 LOCKED)
 * Pure TypeScript types for frontend representation across all roles:
 * Customer × Worker × Provider × Finance Ops × Admin Operations.
 */

export type ServiceOrderStatus =
  | "PENDING_PAYMENT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type ServiceOrderSubStatus =
  // PENDING_PAYMENT
  | "DIAGNOSIS_PENDING"
  | "EXECUTION_PENDING"
  | "PAYMENT_OVERDUE"
  // SCHEDULED
  | "UNASSIGNED"
  | "ASSIGNED_PENDING"
  | "WORKER_ACCEPTED"
  | "RESCHEDULE_PROPOSED"
  // IN_PROGRESS
  | "WORKER_OTW"
  | "WORKER_ARRIVED"
  | "DIAGNOSING"
  | "WAITING_CUSTOMER_CONSENT"
  | "IN_PERSON_CONSENT_RECORDED"
  | "PRICE_APPROVED"
  | "EXECUTING"
  | "WORK_FINISHED"
  | "WAITING_WORKER_CLOSE_VISIT"
  | "VISIT_CLOSED"
  | "AWAITING_CUSTOMER_CONFIRMATION"
  // COMPLETED
  | "COMPLETED_NORMAL"
  | "AUTO_COMPLETED_72H"
  // CANCELLED
  | "CANCELLED_BEFORE_OTW"
  | "CANCELLED_DIAGNOSIS_UNPAID"
  | "CANCELLED_PRICE_REJECTED"
  | "CANCELLED_SPAREPART_UNAVAILABLE"
  | "CANCELLED_REMOTE_TIMEOUT"
  | "CANCELLED_OPERATIONAL_FAILURE"
  | "CANCELLED_PROVIDER_REJECTED";

export type CustomerTabType =
  | "BELUM_BAYAR"
  | "MENUNGGU_JADWAL"
  | "BERLANGSUNG"
  | "SELESAI"
  | "BATAL";

export type WorkerTabType =
  | "TUGAS_MASUK"
  | "HARI_INI"
  | "TERJADWAL"
  | "BERLANGSUNG"
  | "SELESAI"
  | "RIWAYAT";

export type ProviderTabType =
  | "BOOKING_MASUK"
  | "PENUGASAN"
  | "BERLANGSUNG"
  | "SELESAI"
  | "BATAL";

export interface ServiceOfferingSnapshot {
  id: string;
  title: string;
  categoryName: string;
  subcategoryName: string;
  thumbnailUrl: string;
  priceModel: "FREE" | "RANGE" | "AFTER_SURVEY" | "FIXED";
  basePrice?: number;
  priceMin?: number;
  priceMax?: number;
  diagnosisFee: number; // Murni nominal, tanpa biaya platform/komisi
  serviceMode: "HOME_SERVICE" | "WORKSHOP";
  warrantyDurationDays?: number;
}

export interface ServiceAddressSnapshot {
  recipientName: string;
  phone: string;
  fullAddress: string;
  city: string;
  district?: string;
  postalCode?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export interface WorkerAssignment {
  assignmentId: string;
  workerId: string;
  workerName: string;
  workerPhone: string;
  workerPhoto?: string;
  workerRating?: number;
  assignedAt: string;
  responseDeadline: string; // 30 menit operasional
  status: "ASSIGNED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  rejectReason?: string;
  notes?: string;
}

export interface ServiceWorkItem {
  id: string;
  title: string;
  description: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export type SparepartSource = "PROVIDER" | "MERCHANT_05A" | "CUSTOMER";

export interface SparepartItem {
  id: string;
  name: string;
  specification?: string;
  source: SparepartSource;
  qty: number;
  unitPrice: number; // Rp0 if customer supplied or external
  subtotal: number;
  merchantProductRef?: string; // Phase 05A product link if applicable
  isCompatibleConfirmed?: boolean;
  isAvailableForVisit: boolean; // false triggers FollowUpOrder flow if essential
}

export interface ServiceCostBreakdown {
  workItems: ServiceWorkItem[];
  spareparts: SparepartItem[];
  workTotal: number;
  sparepartTotal: number;
  grandTotal: number; // Dasar pengerjaan
  version: number;
}

export type CustomerConsentType =
  | "IN_PERSON_RECORDED"
  | "REMOTE_APPROVED"
  | "REMOTE_REJECTED"
  | "REMOTE_TIMEOUT";

export interface CustomerConsent {
  type: CustomerConsentType;
  recordedByWorkerName?: string;
  workerDeclaration?: boolean;
  timestamp: string;
  notes?: string;
  disagreementReported?: boolean;
  reportReason?: string;
}

export interface Diagnosis {
  id: string;
  workerId: string;
  workerName: string;
  diagnosisTime: string;
  findings: string;
  rootCause?: string;
  damagePhotos: string[];
  recommendedActions: string;
  costBreakdown: ServiceCostBreakdown;
  spareparts: SparepartItem[];
  version: number;
  consent?: CustomerConsent;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
}

export interface ServiceExecution {
  startedAt?: string;
  finishedAt?: string;
  beforePhotos: string[];
  afterPhotos: string[];
  workSummary: string;
  testResults: string;
  usedSpareparts: string[];
  notes?: string;
  visitStatus:
    | "IN_PROGRESS"
    | "AWAITING_PAYMENT"
    | "PAID_VISIT_ENDED"
    | "PAYMENT_ISSUE_REPORTED";
  paymentIssueReason?: string;
}

export interface PaymentInvoiceInfo {
  invoiceNo: string;
  invoiceNumber?: string;
  paymentId?: string;
  amount: number;
  laborSubtotal?: number;
  partsSubtotal?: number;
  executionSubtotal?: number;
  platformFee?: number;
  policyName?: string;
  policyVersion?: number;
  status: "PENDING" | "PAID" | "EXPIRED" | "OVERDUE" | "CANCELLED";
  method: "QRIS" | "BCA_VA" | "MANDIRI_VA" | "BRI_VA" | "BNI_VA";
  paymentMethod?: string;
  paymentReference?: string;
  virtualAccountNo?: string;
  vaNumber?: string;
  qrPayload?: string;
  qrCodeUrl?: string;
  expiresAt: string; // 6 jam batas pembayaran
  paidAt?: string;
}

export interface RefundSummary {
  refundId: string;
  amount: number;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";
  reason: string;
  requestedAt: string;
  processedAt?: string;
}

export interface ProviderFundSummary {
  grossAmount: number;
  executionGross?: number;
  laborAmount?: number;
  partsAmount?: number;
  diagnosisGross?: number;
  diagnosisStatus?: "PAID" | "UNPAID" | "REFUNDED" | "HELD" | "AVAILABLE";
  platformFee: number;
  platformFeeName?: string;
  platformFeeVersion?: number;
  platformFeeType?: string;
  netExecution?: number;
  netAmount: number;
  status: "HELD" | "AVAILABLE" | "WITHDRAWN";
  heldUntil: string; // 120 jam setelah COMPLETED atau BATAL sah
  releasedAt?: string;
}

export interface ServicePaymentSummary {
  diagnosisPayment?: PaymentInvoiceInfo;
  executionPayment?: PaymentInvoiceInfo;
  refundSummary?: RefundSummary;
  providerFunds?: ProviderFundSummary;
}

export interface CancellationRecord {
  cancelledAt: string;
  cancelledByRole: "CUSTOMER" | "WORKER" | "PROVIDER" | "SYSTEM" | "ADMIN";
  cancelledByName: string;
  reasonCode:
    | "CUSTOMER_BEFORE_OTW"
    | "DIAGNOSIS_UNPAID_EXPIRED"
    | "PRICE_REJECTED"
    | "SPAREPART_UNAVAILABLE"
    | "REMOTE_TIMEOUT_30M"
    | "PROVIDER_UNABLE"
    | "WORKER_NO_SHOW"
    | "OPERATIONAL_FAILURE";
  reasonDetail: string;
  diagnosisEligibleForHold: boolean; // Jika sudah diagnosis sah, hak diagnosis tetap dipegang provider
  refundEligible: boolean;
}

export interface RescheduleRequest {
  requestedBy: "CUSTOMER" | "PROVIDER";
  proposedDate: string;
  proposedTimeSlot: string;
  reason: string;
  status: "PROPOSED" | "ACCEPTED" | "REJECTED";
  requestedAt: string;
}

export interface FollowUpOrderDraft {
  originalOrderId: string;
  serviceId: string;
  serviceTitle: string;
  providerId: string;
  providerName: string;
  complaintSummary: string;
  diagnosisSummary: string;
  damagePhotos: string[];
  requiredSpareparts: SparepartItem[];
  savedAddress: ServiceAddressSnapshot;
  diagnosisPreviouslyPaid: boolean; // Wajib Rp0 / tidak ditagih ulang
}

export interface ServiceOrderTimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  actorRole: "CUSTOMER" | "WORKER" | "PROVIDER" | "FINANCE" | "SYSTEM" | "ADMIN";
  actorName: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface OperationalIssue {
  id: string;
  reportedByRole: "CUSTOMER" | "WORKER" | "PROVIDER";
  reportedByName: string;
  category: "PAYMENT_STUCK" | "NO_SHOW" | "SAFETY" | "DISAGREEMENT" | "WORK_DEFECT";
  description: string;
  reportedAt: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED";
  resolutionNotes?: string;
}

/**
 * The Master Service Order Domain Entity (Phase 05B)
 */
export interface ServiceOrder {
  id: string; // e.g., "SRV-20261028-001"
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  providerId: string;
  providerName: string;
  serviceSnapshot: ServiceOfferingSnapshot;
  addressSnapshot: ServiceAddressSnapshot;

  complaint: {
    description: string;
    symptoms?: string[];
    photos?: string[];
    notes?: string;
  };

  schedule: {
    date: string; // YYYY-MM-DD
    timeSlot: string; // e.g. "09:00 - 11:00 WIB"
  };

  status: ServiceOrderStatus;
  subStatus: ServiceOrderSubStatus;

  providerDecisionStatus?: "PENDING" | "ACCEPTED" | "REJECTED";
  providerDecisionAt?: string | null;
  providerRejectionReason?: string | null;

  assignment?: WorkerAssignment;
  assignmentHistory?: WorkerAssignment[];

  visit?: {
    status?: string;
    otwAt?: string;
    arrivedAt?: string;
    closedAt?: string;
  };

  diagnosis?: Diagnosis;
  diagnosisHistory?: Diagnosis[];

  execution?: ServiceExecution;

  paymentSummary: ServicePaymentSummary;

  cancellation?: CancellationRecord;
  reschedule?: RescheduleRequest;
  followUpDraft?: FollowUpOrderDraft;

  timeline: ServiceOrderTimelineEvent[];
  issues: OperationalIssue[];

  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingCreationInput {
  serviceId: string;
  providerId: string;
  complaintDescription: string;
  symptoms?: string[];
  complaintPhotos?: string[];
  notes?: string;
  address: ServiceAddressSnapshot;
  scheduledDate: string;
  scheduledTimeSlot: string;
  paymentMethod?: "QRIS" | "BCA_VA" | "MANDIRI_VA" | "BRI_VA" | "BNI_VA";
}

/**
 * Technician Monthly Work Recap (Phase 05B)
 * Evaluates technician productivity:
 * 1. Pengerjaan Selesai (COMPLETED orders: labor + parts + diagnosis)
 * 2. Diagnosis Selesai — Perbaikan Tidak Dilanjutkan (CANCELLED post-diagnosis: strictly diagnosis fee)
 */
export interface TechnicianRecapOrderItem {
  order_id: string;
  order_no: string;
  service_title: string;
  completion_date: string;
  activity_type: "EXECUTION_COMPLETED" | "DIAGNOSIS_ONLY_COMPLETED";
  activity_label: string;
  status: "COMPLETED" | "CANCELLED";
  order_value: number;
  diagnosis_fee: number;
  labor_fee: number;
  parts_fee: number;
}

export interface TechnicianRecapItem {
  worker_id: string;
  name: string;
  employee_id?: string | null;
  photo_url?: string | null;
  completed_count: number;
  diagnosis_only_count: number;
  total_activities: number;
  total_work_value: number;
  orders: TechnicianRecapOrderItem[];
}

export interface TechnicianRecapPeriod {
  month: number;
  year: number;
  month_name: string;
  timezone: string;
}

export interface TechnicianRecapSummary {
  total_technicians: number;
  total_completed_count: number;
  total_diagnosis_only_count: number;
  total_activities: number;
  total_work_value: number;
}

export interface TechnicianMonthlyRecapData {
  period: TechnicianRecapPeriod;
  organization: {
    id: string;
  };
  summary: TechnicianRecapSummary;
  technicians: TechnicianRecapItem[];
}
