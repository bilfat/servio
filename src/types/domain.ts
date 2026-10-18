import { PricingModel } from "@/components/features/services/ServiceCard";

export type { PricingModel };

/**
 * 6 FIXED DOMAINS OF SERVIO
 */
export type FixedDomainId =
  | "repair"
  | "home"
  | "cleaning"
  | "maintenance"
  | "environment"
  | "automotive";

export interface TaxonomyDomain {
  id: FixedDomainId;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  badge?: string;
  subcategories: TaxonomySubcategory[];
}

export interface DynamicFormFieldSchema {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "radio" | "checkbox" | "textarea" | "file";
  placeholder?: string;
  required: boolean;
  options?: { label: string; value: string }[];
  helperText?: string;
}

export interface TaxonomySubcategory {
  id: string;
  domainId: FixedDomainId;
  name: string;
  description: string;
  activeProvidersCount: number;
  popularSearchTags: string[];
  dynamicSchema?: DynamicFormFieldSchema[];
}

/**
 * ============================================================================
 * SERVIO TAXONOMY V1 CANONICAL MODELS (LOCKED DECISION)
 * Core Hierarchy: Category -> Subcategory -> Provider Master Service
 * Zero Asset Relations. Pure Minimal Contracts. Projection-based Analytics.
 * ============================================================================
 */
export type TaxonomyStatus = "ACTIVE" | "INACTIVE";

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
  status: TaxonomyStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceSubcategory {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  description?: string;
  status: TaxonomyStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type ProviderServiceMethod =
  | "HOME_SERVICE"
  | "WORKSHOP"
  | "ON_SITE"
  | "REMOTE_ONLINE"
  | "PICKUP_RETURN"
  | "MOBILE_SERVICE";

export interface ProviderMasterService {
  id: string;
  providerId: string;
  providerName?: string;
  categoryId: string;
  categoryName?: string;
  subcategoryId: string;
  subcategoryName?: string;
  name: string;
  description: string;
  priceMin: number;
  priceMax: number;
  surveyFee: number;
  serviceMethods: ProviderServiceMethod[];
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  availability?: "AVAILABLE" | "UNAVAILABLE";
  createdAt?: string;
  updatedAt?: string;
}

export type TaxonomyRequestStatus =
  | "SUBMITTED"
  | "UNDER_ADMIN_REVIEW"
  | "FORWARDED_TO_CEO"
  | "CEO_APPROVED"
  | "CEO_REJECTED"
  | "APPROVED"
  | "REJECTED_BY_ADMIN"
  | "REJECTED_BY_CEO"
  | "PUBLISHED";

export interface SubcategoryRequest {
  id: string;
  providerId: string;
  providerName?: string;
  categoryId: string;
  categoryName?: string;
  requestedSubcategoryName: string;
  reason: string;
  notes?: string;
  status: TaxonomyRequestStatus;
  createdAt: string;
  reviewedByAdminAt?: string;
  adminReviewNotes?: string;
  reviewedByCeoAt?: string;
  ceoReviewNotes?: string;
  publishedAt?: string;
}

export interface TaxonomyAnalyticsProjection {
  totalCategories: number;
  totalSubcategories: number;
  totalProviderMasterServices: number;
  activeProvidersCount: number;
  totalServiceOrders: number;
  pendingRequestsCount: number;
  categoryOrders: {
    categoryId: string;
    categoryName: string;
    orderCount: number;
    percentage: number;
    gmvAmount: number;
  }[];
  topSubcategories: {
    subcategoryId: string;
    subcategoryName: string;
    categoryId: string;
    categoryName: string;
    orderCount: number;
    providerCount: number;
    masterServiceCount: number;
  }[];
  masterServiceAnalytics: {
    serviceName: string;
    categoryId: string;
    subcategoryId: string;
    subcategoryName: string;
    providerCount: number;
    orderCount: number;
    averageRating: number;
    reviewCount: number;
    providers: {
      providerId: string;
      providerName: string;
      orderCount: number;
      rating: number;
      reviewCount: number;
    }[];
  }[];
  providerAnalytics: {
    providerId: string;
    providerName: string;
    orderCount: number;
    rating: number;
    reviewCount: number;
    activeMasterServicesCount: number;
    dominantCategory: string;
    dominantSubcategory: string;
  }[];
}

export interface CeoAffiliateAnalyticsProjection {
  totalAffiliateOrders: number;
  totalAffiliateFee: number;
  activeMerchantsCount: number;
  providerRewardPoints: number;
  providerRewardValue: number;
  workerRewardPoints: number;
  workerRewardValue: number;
  conversionRate: number;
  ordersByCategory: { category: string; orderCount: number; feeGenerated: number }[];
  ordersBySubcategory: { subcategory: string; orderCount: number; feeGenerated: number }[];
  ordersByProvider: { providerId: string; providerName: string; orderCount: number; rewardPoints: number }[];
  ordersByMerchant: { merchantId: string; merchantName: string; orderCount: number; feePaid: number }[];
  feeTrend: { date: string; feeAmount: number; orderCount: number }[];
  rewardSplit: { providerPercent: number; workerPercent: number };
}

/**
 * SERVICE PROVIDER & WORKER TECHNICIAN
 */
export type ProviderBusinessType = "INDIVIDUAL" | "WORKSHOP";

export interface OperatingHour {
  day: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu" | "Minggu";
  open: string;
  close: string;
  isOpen: boolean;
}

export interface ServiceProvider {
  id: string;
  name: string;
  businessType: ProviderBusinessType;
  avatarInitials: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  operationalHoursSummary: string;
  operatingHoursDetail: OperatingHour[];
  workRadiusKm: number;
  address: string;
  city: string;
  coordinates: { lat: number; lng: number };
  specialties: string[];
  isVerified: boolean;
  joinedYear: number;
  badge?: string;
  phone: string;
  email: string;
}

export interface WorkerServiceCapability {
  id: string;
  workerId: string;
  providerId: string;
  masterServiceId: string;
  masterServiceName?: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  assignedAt: string;
}

export interface WorkerTechnician {
  id: string;
  providerId: string;
  providerName: string;
  name: string;
  employeeId?: string;
  avatarUrl?: string;
  phone: string;
  email?: string;
  rating: number;
  completedJobs: number;
  skills: string[];
  specialization?: string[];
  primarySpecialty?: string;
  isOnline: boolean;
  status?: string;
  currentLocation?: { lat: number; lng: number; address: string };
  vehicleNumber?: string;
  // Multi-Master-Service Capabilities (Strictly mapped to ProviderMasterService)
  capabilities?: WorkerServiceCapability[];
  // Location Sharing & Telemetry Tracking Session
  trackingSession?: WorkerTrackingSession;
}

export type WorkerTrackingStatus =
  | "TRACKING_OFF"
  | "TRACKING_PENDING_PERMISSION"
  | "TRACKING_ACTIVE"
  | "TRACKING_PERMISSION_DENIED"
  | "TRACKING_LOCATION_UNAVAILABLE"
  | "TRACKING_STALE"
  | "TRACKING_STOPPED";

export interface WorkerTrackingSession {
  id: string;
  workerId: string;
  workerName?: string;
  providerId: string;
  providerName?: string;
  status: WorkerTrackingStatus;
  startedAt: string;
  stoppedAt?: string;
  lastLocationAt?: string;
  lastLatitude?: number;
  lastLongitude?: number;
  lastAccuracyMeters?: number;
  lastAddress?: string;
  lastUpdatedAt?: string;
  currentOrderId?: string;
  currentOrderService?: string;
  currentCategoryName?: string;
  currentSubcategoryName?: string;
}

/**
 * SERVICE OFFERINGS
 */
export type ServiceMode = "HOME_SERVICE" | "WORKSHOP" | "EMERGENCY";

export interface ServiceOffering {
  id: string;
  providerMasterServiceId?: string;
  domainId: FixedDomainId;
  categoryId?: string;
  categoryName?: string;
  categoryCode?: string;
  subcategoryId: string;
  subcategoryName?: string;
  subcategoryCode?: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  pricingModel: PricingModel;
  basePrice: number;
  priceMin?: number;
  priceMax?: number;
  priceFormatted: string;
  description?: string;
  rating: number;
  reviewCount: number;
  warrantyDays: number;
  providerId: string;
  providerName: string;
  isVerifiedProvider: boolean;
  serviceModes: ServiceMode[];
  estimatedDurationHours: number;
  inclusions: string[];
  exclusions: string[];
  thumbnailUrl?: string;
}

/**
 * PRODUCTS & SPARE PARTS
 */
export interface ProductItem {
  id: string;
  title: string;
  category: string;
  price: number;
  stock: number;
  compatibilityTags: string[];
  merchantId: string;
  merchantName: string;
  rating: number;
  reviewCount: number;
  sku: string;
  description: string;
  specifications: Record<string, string>;
  thumbnailUrl?: string;
  isOriginal: boolean;
  warrantyMonths: number;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  brandName?: string;
}

/**
 * BOOKINGS
 */
export type BookingStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "RESCHEDULED"
  | "CANCELLED"
  | "CONVERTED_TO_ORDER";

export interface BookingRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceTitle: string;
  providerId: string;
  providerName: string;
  serviceMode: ServiceMode;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTimeSlot: string; // e.g. "09:00 - 11:00"
  address: {
    street: string;
    city: string;
    notes?: string;
    coordinates?: { lat: number; lng: number };
  };
  customFieldValues: Record<string, string | number | boolean>;
  notes?: string;
  status: BookingStatus;
  createdAt: string;
  expiresAt: string;
}

/**
 * SERVICE ORDERS & ESCROW
 */
export type OrderStatus =
  | "DRAFT"
  | "PENDING_WORKER"
  | "PENDING_SURVEY"
  | "QUOTATION_REVIEW"
  | "WAITING_APPROVAL"
  | "PAYMENT_PENDING"
  | "TECHNICIAN_DISPATCHED"
  | "TECHNICIAN_ARRIVED"
  | "DIAGNOSING"
  | "IN_PROGRESS"
  | "AWAITING_PROOF_REVIEW"
  | "COMPLETED"
  | "DISPUTED"
  | "CANCELLED"
  | "REFUNDED"
  | "WAITING_SPAREPART";

export interface OrderStepperStep {
  id: string;
  title: string;
  description: string;
  timestamp?: string;
  isCurrent: boolean;
  isCompleted: boolean;
  isFailed?: boolean;
}

export interface ServiceOrder {
  id: string;
  bookingId?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceTitle: string;
  domainId: FixedDomainId;
  providerId: string;
  providerName: string;
  assignedWorker?: WorkerTechnician;
  serviceMode: ServiceMode;
  address: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
  status: OrderStatus;
  statusLabel: string;
  stepper: OrderStepperStep[];
  pricing: {
    serviceFee: number;
    surveyFee?: number;
    materialFee: number;
    platformFee: number;
    discountAmount: number;
    totalAmount: number;
  };
  isEscrowLocked: boolean;
  escrowReleaseDeadline?: string;
  warrantyPeriodDays?: number;
  createdAt: string;
  updatedAt: string;

  // Phase B: Role-Flow Extension Relations
  sparepartRequirements?: SparepartRequirement[];
  providerMaterials?: ProviderMaterialLine[];
  relatedProductOrderIds?: string[];
  sparepartTimeline?: SparepartTimelineEvent[];
  sparepartBlockStatus?: {
    isBlocked: boolean;
    reason?: string;
    blockedAt?: string;
    resumedAt?: string;
  };

  // Phase C: Operational Lifecycle Extension (Diagnosis, Price Adjustment, Proof & Completion)
  diagnosis?: DiagnosisRecord;
  priceAdjustment?: PriceAdjustmentProposal;
  proofOfService?: ProofOfService;
  completionStatus?:
    | "IN_SERVICE"
    | "SUBMITTED_BY_WORKER"
    | "AWAITING_CUSTOMER_CONFIRMATION"
    | "CUSTOMER_CONFIRMED"
    | "COMPLETED";
  customerConfirmedAt?: string;

  // Phase C: Pre-Service Handoff & Worker Preparation Context
  providerNotes?: string;
  aiPreparationContext?: BookingAIAnalysis;

  // Phase Customer Revision: Consolidated Financial & Journey Records
  initialEstimateRange?: { min: number; max: number; label?: string };
  pricingModelType?: PricingModel;
  paymentRecords?: ServicePaymentRecord[];
  disputeCaseId?: string;
  warrantyCertificateId?: string;
  customerReviewSubmitted?: boolean;

  // Fee Management & Invoicing Extension
  orderNumber?: string;
  price?: number;
  applicationFee?: number;
  applicationFeePolicyVersion?: string;
  paymentStatus?: "PAID" | "PENDING" | "REFUNDED" | "SETTLED" | string;

  // Warranty V1 Linked Context
  parentWarrantyClaimId?: string;
  originalServiceOrderId?: string;
  isPaidWork?: boolean;
}

export interface ServicePaymentRecord {
  id: string;
  orderId: string;
  type: "INITIAL_PAYMENT" | "ADDITIONAL_PAYMENT" | "SURVEY_FEE" | "REFUND";
  amount: number;
  paymentMethod: string;
  status: "PAID" | "PENDING" | "FAILED";
  paidAt?: string;
  gatewayRef?: string;
  receiptNumber?: string;
  notes?: string;
}

export interface CustomerDisputeSubmission {
  orderId: string;
  category: "SERVICE_NOT_COMPLETED" | "POOR_QUALITY" | "WRONG_SPAREPART" | "DAMAGED_ITEM" | "OVERCHARGED" | "OTHER";
  description: string;
  photos?: string[];
  contactPreference?: string;
}

/**
 * Phase C: AI Service Analysis & Pre-Service Preparation Context
 * Non-authoritative preparation suggestion. NOT a final diagnosis,
 * NOT a sparepart transaction, NOT an inventory authority.
 */
export interface BookingAIAnalysis {
  summary: string;
  possibleIssues: string[];
  possibleSpareparts: string[];
  confidenceExplanation: string;
  disclaimer: string;
  generatedAt: string;
}

/**
 * Phase C: Field Diagnosis Record
 * Conducted by Worker on-site (Timeline Owner / Diagnosis Operator).
 */
export interface DiagnosisRecord {
  id: string;
  serviceOrderId: string;
  workerId: string;
  workerName: string;
  inspectedAt: string;
  assetInspected?: string;
  findingsSummary: string;
  identifiedIssues: string[];
  recommendedAction: string;
  requiresSparepart: boolean;
  sparepartSource?: "PROVIDER_OWNED" | "PARTNER_STORE" | "CUSTOMER_PURCHASE" | "NONE";
  requiresAdditionalWork: boolean;
  notes?: string;
}

/**
 * Phase C: Contextual Price Adjustment Proposal
 * Prepared by Worker post-diagnosis. Provider authorization is conditional based on policy/threshold.
 * Final approval is strictly owned by Customer.
 */
export type PriceAdjustmentStatus =
  | "DRAFT"
  | "PENDING_PROVIDER_AUTH"
  | "AUTHORIZED_BY_PROVIDER"
  | "PENDING_CUSTOMER_APPROVAL"
  | "APPROVED_BY_CUSTOMER"
  | "REJECTED_BY_CUSTOMER";

export interface PriceAdjustmentProposal {
  id: string;
  serviceOrderId: string;
  proposedByWorkerId: string;
  proposedByWorkerName: string;
  diagnosisSummary: string;

  // Cost breakdown
  finalServiceFee: number;
  sparepartFee: number;
  additionalWorkFee: number;
  totalAmount: number;

  // Conditional Provider Authorization
  requiresProviderAuth: boolean;
  providerAuthReason?: string;
  providerAuthStatus: "NOT_REQUIRED" | "PENDING" | "AUTHORIZED" | "REJECTED";
  providerAuthorizedAt?: string;
  providerRejectionReason?: string;

  // Customer Commercial Approval
  customerApprovalStatus: "PENDING" | "APPROVED" | "REJECTED";
  customerApprovedAt?: string;
  customerRejectionReason?: string;

  // Payment condition
  paymentConditionStatus: "UNPAID" | "PAID" | "ADDITIONAL_REQUIRED" | "ADDITIONAL_PAID";

  // Scope criticality (Mandatory vs Optional)
  isMandatoryScope?: boolean;
  impactOnRejection?: string;
  items?: {
    id: string;
    description: string;
    amount: number;
    isMandatory: boolean;
    type: "SERVICE" | "SPAREPART" | "MATERIAL" | "OTHER";
  }[];

  createdAt: string;
  updatedAt: string;
}

/**
 * QUOTATIONS
 */
export type QuotationStatus = "PENDING_CUSTOMER" | "ACCEPTED" | "REJECTED" | "NEGOTIATING" | "EXPIRED";

export interface QuotationItem {
  id: string;
  name: string;
  type: "LABOR" | "MATERIAL" | "SURVEY";
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Quotation {
  id: string;
  orderId: string;
  providerId: string;
  providerName: string;
  surveySummary: string;
  items: QuotationItem[];
  subtotal: number;
  platformFee: number;
  totalAmount: number;
  surveyFeeDeduction: number;
  finalPayableAmount: number;
  validUntil: string;
  status: QuotationStatus;
  negotiationNote?: string;
  createdAt: string;
}

/**
 * EXECUTION & SOP
 */
export interface SopStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  isCompleted: boolean;
  requiresPhoto: boolean;
  photoUrl?: string;
  completedAt?: string;
}

export interface ExecutionSession {
  orderId: string;
  workerId: string;
  workerName: string;
  startedAt: string;
  sopChecklist: SopStep[];
  safetyStopTriggered: boolean;
  safetyStopReason?: string;
  notes?: string;
}

/**
 * TRACKING
 */
export interface LiveTrackingData {
  orderId: string;
  workerId: string;
  workerName: string;
  workerPhone: string;
  workerVehicleNumber: string;
  workerLocation: { lat: number; lng: number };
  destinationLocation: { lat: number; lng: number };
  destinationAddress: string;
  estimatedArrivalMinutes: number;
  distanceKm: number;
  status: "DEPARTED" | "NEARBY" | "ARRIVED";
  lastUpdated: string;
  shareableUrl: string;
}

/**
 * PROOF OF SERVICE
 */
export interface ProofMediaItem {
  id: string;
  label: string;
  type: "BEFORE" | "AFTER";
  imageUrl: string;
  capturedAt: string;
  description: string;
}

export interface ProofOfService {
  orderId: string;
  providerId: string;
  workerId: string;
  media: ProofMediaItem[];
  checklistCompleted: boolean;
  testedParameters: { parameter: string; value: string; standard: string }[];
  customerSignatureUrl?: string;
  submittedAt: string;
  isApprovedByCustomer: boolean;
  customerFeedback?: string;
  // Phase C: Provider Verification Fields
  verificationStatus?:
    | "PENDING_REVIEW"
    | "PENDING_PROVIDER_REVIEW"
    | "VERIFIED"
    | "VERIFIED_BY_PROVIDER"
    | "REVISION_REQUESTED";
  verifiedAt?: string;
  verifiedByProviderName?: string;
  revisionNotes?: string;
}

/**
 * WARRANTIES
 */
export type WarrantyStatus = "ACTIVE" | "EXPIRED" | "CLAIMED" | "VOID";

export interface WarrantyCertificate {
  id: string;
  orderId: string;
  serviceOrderId?: string;
  serviceTitle: string;
  providerName: string;
  customerName: string;
  coverageDetails: string[];
  startDate: string;
  endDate: string;
  validFrom?: string;
  validUntil?: string;
  durationDays: number;
  status: WarrantyStatus;
  terms: string;
  certificateNumber: string;
}

export interface WarrantyClaim {
  id: string;
  warrantyId: string;
  orderId: string;
  issueDescription: string;
  evidenceUrls: string[];
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "IN_REPAIR";
  submittedAt: string;
  resolutionNotes?: string;
}

/**
 * =========================================================================
 * SERVIO WARRANTY V1 FINAL LOCKED DOMAIN MODEL
 * Scheme 2: Provider Store -> Duration Options -> Master Service Config
 * State Machine: PENDING_ACTIVATION -> ACTIVE -> EXPIRED
 * =========================================================================
 */
export type WarrantyV1Status = "PENDING_ACTIVATION" | "ACTIVE" | "EXPIRED";

export interface ProviderWarrantySettings {
  id: string;
  providerId: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface ProviderWarrantyDuration {
  id: string;
  providerId: string;
  durationDays: number;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface ServiceWarrantyConfiguration {
  id: string;
  providerId: string;
  providerMasterServiceId: string;
  warrantyEnabled: boolean;
  durationDays: number;
  policyVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyV1 {
  id: string;
  providerId: string;
  customerId: string;
  customerName?: string;
  providerName?: string;
  serviceTitle?: string;
  workerId?: string; // original worker reference
  workerName?: string;
  originalWorkerName?: string;
  originalServiceOrderId: string;
  providerMasterServiceId: string;
  status: WarrantyV1Status;
  durationDaysSnapshot: number;
  policyVersion: string;
  claimCount?: number;
  startedAt?: string | null;
  expiresAt?: string | null;
  grantedAt?: string | null;
  grantedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type WarrantyClaimStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "INSPECTION_ASSIGNED"
  | "INSPECTION_SCHEDULED"
  | "INSPECTION_IN_PROGRESS"
  | "DIAGNOSIS_SUBMITTED"
  | "WAITING_PROVIDER_DECISION"
  | "REPAIR_APPROVED"
  | "REPAIR_SCHEDULED"
  | "REPAIR_IN_PROGRESS"
  | "RESOLVED"
  | "REJECTED"
  | "DISPUTED";

export interface WarrantyClaimV1 {
  id: string;
  warrantyId: string;
  claimNumber: string;
  status: WarrantyClaimStatus;
  submittedAt: string;
  reason: string;
  description: string;
  issueOccurredAt: string;
  evidence: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  coverageDecision?: "COVERED" | "NOT_COVERED";
  coverageDecisionAt?: string;
  coverageDecisionNotes?: string;
  infoRequested?: boolean;
  infoRequestedAt?: string;
  infoRequestedNotes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type WarrantyAssignmentStatus =
  | "UNSCHEDULED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED";

export type WarrantyAssignmentType = "INSPECTION" | "REPAIR";

export interface WarrantyAssignmentV1 {
  id: string;
  warrantyClaimId: string;
  workerId: string;
  workerName?: string;
  assignmentType: WarrantyAssignmentType;
  scheduledDate: string;
  scheduledStartTime: string;
  estimatedDuration: number; // minutes
  location: string;
  notes?: string;
  status: WarrantyAssignmentStatus;
  assignedAt: string;
  otwAt?: string | null;
  startedAt?: string | null;
  checkInAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  rescheduledFromId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyDiagnosisV1 {
  id: string;
  warrantyClaimId: string;
  assignmentId?: string;
  findings: string;
  diagnosis: string;
  condition: string;
  recommendedAction: string;
  requiredMaterial?: string;
  evidence: string[]; // Foto bukti
  evidenceVideos?: string[]; // Video bukti
  technicalNotes?: string;
  submittedBy: string;
  submittedAt: string;
  updatedAt: string;
}

export type WarrantyPaidWorkStatus =
  | "RECOMMENDED"
  | "INFO_REQUIRED"
  | "PROVIDER_REJECTED"
  | "PROPOSAL_SENT"
  | "CUSTOMER_APPROVED"
  | "CUSTOMER_REJECTED"
  | "AUTHORIZED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface WarrantyPaidWorkRequestV1 {
  id: string;
  warrantyClaimId: string;
  workerId: string;
  workerName?: string;
  findingSummary: string;
  recommendedWork: string;
  recommendedMaterial: string;
  estimatedDuration: number;
  evidence: string[];
  technicalNotes?: string;
  status: WarrantyPaidWorkStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyPaidWorkLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface WarrantyPaidWorkProposalV1 {
  id: string;
  paidWorkRequestId: string;
  warrantyClaimId: string;
  customerId: string;
  providerId: string;
  title: string;
  scope: string;
  lineItems: WarrantyPaidWorkLineItem[];
  subtotal: number;
  fees: number;
  totalAmount: number;
  reasonOutsideWarranty: string;
  notes?: string;
  status: WarrantyPaidWorkStatus;
  proposedAt: string;
  respondedAt?: string;
  responseReason?: string;
  linkedPaidOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyCompletionProofV1 {
  id: string;
  warrantyClaimId: string;
  workerId: string;
  summary: string;
  notes?: string;
  evidenceBefore: string[];
  evidenceAfter: string[];
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  status?: "SUBMITTED" | "APPROVED" | "REJECTED";
}

export interface WarrantyTimelineEventV1 {
  id: string;
  warrantyId: string;
  warrantyClaimId?: string;
  assignmentId?: string;
  eventType: string;
  title: string;
  description: string;
  actorId: string;
  actorRole: string;
  timestamp: string;
  visibility: "CUSTOMER_SAFE" | "INTERNAL";
  metadata?: Record<string, unknown>;
}

/**
 * MAINTENANCE PLANS
 */
export interface MaintenancePlan {
  id: string;
  assetId?: string;
  assetName?: string;
  targetName?: string;
  title: string;
  frequencyMonths: number;
  nextDueDate: string;
  isOverdue: boolean;
  isSnoozed: boolean;
  snoozeUntil?: string;
  recommendedServiceId: string;
  lastServiceDate?: string;
}

/**
 * CART & CHECKOUT
 */
export interface CartItemEntity {
  cartItemId?: string;
  productId: string;
  variantId?: string;
  variantName?: string;
  productTitle: string;
  merchantId: string;
  merchantName: string;
  unitPrice: number;
  unitPriceSnapshot: number;
  quantity: number;
  stock: number;
  thumbnailUrl?: string;
  linkedServiceOrderId?: string;
}

export interface CartStoreGroup {
  merchantId: string;
  merchantName: string;
  items: CartItemEntity[];
  subtotal: number;
}

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
}

/**
 * DISPUTES & MEDIATION
 */
export type DisputeStatus = "OPEN" | "IN_MEDIATION" | "RESOLVED_REFUND" | "RESOLVED_REWORK" | "REJECTED" | "RESOLVED" | "INVESTIGATING";

export interface DisputeCase {
  id: string;
  orderId: string;
  serviceOrderId?: string;
  serviceTitle: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  workerId?: string;
  workerName?: string;
  reason: string;
  category?: string;
  detailedComplaint: string;
  description?: string;
  disputedAmount?: number;
  evidencePhotos: string[];
  requestedResolution: "FULL_REFUND" | "PARTIAL_REFUND" | "FREE_REWORK";
  status: DisputeStatus;
  createdAt: string;
  updatedAt?: string;
  mediatorName?: string;
  mediationNotes?: string;
  resolutionDecision?: string;
  providerStatement?: string;
  proposedSolution?: "FREE_REWORK" | "PARTIAL_REFUND" | "REJECT_EXPLAIN" | string;
  revisitDate?: string;
  priority?: "NORMAL" | "HIGH" | "URGENT";
  resolution?: string;
}

/**
 * RETURNS & PRODUCT REFUNDS
 */
export type ReturnResolutionType = "REFUND" | "EXCHANGE";
export type ReturnStatus = "SUBMITTED" | "APPROVED" | "SHIPPED_BACK" | "INSPECTED" | "REFUNDED" | "REJECTED";

export interface ReturnRequest {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  merchantId: string;
  merchantName: string;
  reason: string;
  resolutionType: ReturnResolutionType;
  unboxingVideoUrl?: string;
  evidencePhotoUrls: string[];
  status: ReturnStatus;
  returnCourier?: string;
  returnTrackingNumber?: string;
  refundAmount: number;
  createdAt: string;
}

/**
 * LOYALTY & REWARDS
 */
export interface LoyaltyVoucher {
  id: string;
  code: string;
  title: string;
  discountAmount: number;
  minSpend: number;
  validUntil: string;
  domainRestriction?: FixedDomainId;
}

export interface LoyaltyWalletData {
  pointsBalance: number;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  tierProgressPercentage: number;
  pointsExpiringSoon: number;
  vouchers: LoyaltyVoucher[];
}

/**
 * MILESTONE 9: MERCHANT DOMAIN TYPES (TOKO SUKU CADANG)
 */

export type MerchantProductStatus = "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";

export interface MerchantProduct {
  id: string;
  sku: string;
  title: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStockAlert: number;
  status: MerchantProductStatus;
  compatibilityTags: string[];
  description: string;
  specifications: Record<string, string>;
  isOriginal: boolean;
  warrantyMonths: number;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type MerchantOrderStatus =
  | "UNPAID"
  | "PENDING_PAYMENT"
  | "NEW"
  | "CONFIRMED"
  | "PICKING"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "RETURNED";

export interface MerchantOrderItem {
  productId: string;
  sku: string;
  title: string;
  productTitle?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  thumbnailUrl?: string;
}

export interface MerchantOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  items: MerchantOrderItem[];
  subtotal: number;
  shippingFee: number;
  platformFee: number;
  totalAmount: number;
  status: MerchantOrderStatus;
  paymentMethod: string;
  merchantName?: string;
  merchantId?: string;
  shippingMethod?: string;
  paymentStatus?: "PAID" | "PENDING" | "FAILED";
  isAffiliateOrder?: boolean;
  courierName?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  fulfillmentId?: string;
  shipmentId?: string;

  // Phase B: Service Context & Affiliate Attribution (Section 8, 9, 24-26, 56J.4)
  orderSource?: "DIRECT" | "SERVICE_RECOMMENDATION";
  serviceOrderId?: string;
  sparepartRequirementId?: string;
  serviceContext?: {
    serviceOrderId: string;
    serviceTitle: string;
    providerId: string;
    providerName: string;
    workerId?: string;
    workerName?: string;
  };
  affiliateAttribution?: AffiliateAttribution;
  affiliateFeeAmount?: number;
  affiliateFeeRateSnapshot?: number;
  affiliateFeePolicyVersion?: string;
  netMerchantSettlement?: number;
}

export interface MerchantStockItem {
  productId: string;
  sku: string;
  title: string;
  category: string;
  warehouseId: string;
  warehouseName: string;
  // 12C Guardrail: MUST distinguish on-hand, reserved, allocated, unavailable, and available
  onHand: number;
  reserved: number;
  allocated: number;
  unavailable: number;
  available: number;
  minStockAlert: number;
  unit: string;
  lastRestocked: string;
}

export interface MerchantWarehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  isMain: boolean;
  totalSkus: number;
  picName?: string;
  picPhone?: string;
  operatingStatus?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  operatingHours?: string;
  notes?: string;
}

export interface MerchantStockMovement {
  id: string;
  productId: string;
  sku: string;
  productTitle: string;
  warehouseId: string;
  warehouseName: string;
  type: "INBOUND" | "OUTBOUND" | "RESERVED" | "AUDIT_ADJUSTMENT" | "TRANSFER";
  quantity: number; // Total physical delta On-Hand
  previousAvailable: number;
  newAvailable: number;
  reason: string;
  performedBy: string;
  timestamp: string;
  // B2B Procurement Metadata (ROOT-01 Consistency)
  acceptedQuantity?: number;
  damagedQuantity?: number;
  purchaseOrderId?: string;
  receivingId?: string;
}

export type MerchantFulfillmentStatus =
  | "PENDING_PICK"
  | "PICKING"
  | "PICKED"
  | "PACKING"
  | "PACKED"
  | "LABEL_PRINTED";

export interface MerchantFulfillmentItem {
  productId: string;
  sku: string;
  title: string;
  quantity: number;
  pickedQuantity: number;
  isPicked: boolean;
  binLocation: string;
}

export interface MerchantFulfillment {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  destinationCity: string;
  courier: string;
  items: MerchantFulfillmentItem[];
  status: MerchantFulfillmentStatus;
  priority: "NORMAL" | "HIGH" | "EXPRESS";
  boxDimensions?: {
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    weightKg: number;
  };
  assignedPicker?: string;
  labelBarcode?: string;
  packedAt?: string;
  createdAt: string;
}

export type MerchantShipmentStatus =
  | "AWAITING_PICKUP"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED_ATTEMPT"
  | "DELIVERY_EXCEPTION";

export interface MerchantShipmentCheckpoint {
  timestamp: string;
  status: string;
  location: string;
  note: string;
}

export interface MerchantShipment {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  courier: string;
  serviceType: string;
  awbNumber: string;
  weightKg: number;
  shippingCost: number;
  status: MerchantShipmentStatus;
  estimatedDelivery: string;
  checkpoints: MerchantShipmentCheckpoint[];
  dispatchedAt: string;
}

export type MerchantReturnDisposition =
  | "ACCEPT_RESTOCK"
  | "ACCEPT_REFURBISH"
  | "ACCEPT_DISPOSE"
  | "REJECT";

export type MerchantReturnStatus =
  | "REQUESTED"
  | "IN_TRANSIT_BACK"
  | "RECEIVED_AWAITING_INSPECTION"
  | "INSPECTING"
  | "PARTIALLY_ACCEPTED"
  | "ACCEPTED"
  | "REJECTED"
  | "REFUND_PROCESSED";

export interface MerchantReturnItem {
  productId: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
  condition?: "GOOD" | "DAMAGED" | "WRONG_ITEM" | "DEFECTIVE";
  disposition?: MerchantReturnDisposition;
  acceptedQty: number;
  rejectedQty: number;
}

export interface MerchantReturn {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  reason: string;
  evidencePhotoUrls: string[];
  unboxingVideoUrl?: string;
  items: MerchantReturnItem[];
  status: MerchantReturnStatus;
  courierAwb?: string;
  inspectionNotes?: string;
  refundAmount: number;
  requestedAt: string;
  receivedAt?: string;
  inspectedAt?: string;
}

export type MerchantSettlementStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "ON_HOLD";

export interface MerchantSettlementTransaction {
  id: string;
  orderNumber: string;
  date: string;
  grossAmount: number;
  platformFee: number;
  paymentGatewayFee: number;
  netPayout: number;
}

export interface MerchantSettlement {
  id: string;
  cycleNumber: string;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
  grossSales: number;
  platformDeduction: number;
  netAmount: number;
  status: MerchantSettlementStatus;
  bankName: string;
  bankAccountMasked: string;
  bankHolder: string;
  payoutDate?: string;
  transactions: MerchantSettlementTransaction[];
}

/**
 * MILESTONE 9: SUPPLIER DOMAIN TYPES (B2B GROSIR)
 */

export interface SupplierPriceTier {
  minQty: number;
  maxQty?: number;
  pricePerUnit: number;
  label: string;
}

export interface SupplierProduct {
  id: string;
  sku: string;
  title: string;
  category: string;
  moq: number;
  unit: string;
  stock: number;
  tiers: SupplierPriceTier[];
  leadTimeDays: number;
  status: "ACTIVE" | "INACTIVE";
  description: string;
  specifications: Record<string, string>;
  thumbnailUrl?: string;
  updatedAt: string;
}

export interface SupplierWarehouseRack {
  rackCode: string;
  binRange: string;
}

export interface SupplierWarehouseZone {
  id: string;
  warehouseId: string;
  zoneCode: string;
  name: string;
  description: string;
  racks: SupplierWarehouseRack[];
}

export interface SupplierWarehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  isMain: boolean;
  capacityM2: number;
  totalZones: number;
  picName: string;
  picPhone: string;
  operatingStatus: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  operatingHours: string;
  notes?: string;
}

export type SupplierOrderStatus =
  | "PO_RECEIVED"
  | "CONFIRMED"
  | "PREPARING"
  | "QC_INSPECTION"
  | "PACKED"
  | "MANIFESTED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export type SupplierPaymentTerms = "PREPAID" | "NET_14" | "NET_30" | "NET_60" | "COD";

export interface SupplierOrderItem {
  productId: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SupplierOrder {
  id: string;
  poNumber: string;
  buyerName: string;
  buyerType: "MERCHANT" | "SERVICE_PROVIDER" | "WORKSHOP_CHAIN" | "CORPORATE";
  buyerContact: string;
  deliveryAddress: string;
  items: SupplierOrderItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: SupplierOrderStatus;
  paymentTerms: SupplierPaymentTerms;
  issuedDate: string;
  dueDate: string;
  notes?: string;
}

export interface SupplierQCCheckItem {
  id: string;
  checkLabel: string;
  isPassed: boolean;
  notes?: string;
}

export interface SupplierFulfillment {
  id: string;
  poNumber: string;
  buyerName: string;
  destinationCity: string;
  sourceWarehouseId?: string;
  sourceWarehouseName?: string;
  palletCount: number;
  totalWeightKg: number;
  status: "QUEUED" | "PALLETIZING" | "QC_IN_PROGRESS" | "QC_PASSED" | "MANIFEST_GENERATED" | "STAGING";
  qcChecklist: SupplierQCCheckItem[];
  items: {
    sku: string;
    title: string;
    requestedQty: number;
    packedQty: number;
    palletNumber: string;
  }[];
  inspectedBy?: string;
  createdAt: string;
}

export type SupplierShipmentStatus =
  | "SCHEDULED"
  | "LOADING_CARGO"
  | "DEPARTED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "EXCEPTION";

export interface SupplierShipment {
  id: string;
  manifestNumber: string;
  poNumber: string;
  buyerName: string;
  destination: string;
  sourceWarehouseId?: string;
  sourceWarehouseName?: string;
  kargoCarrier: string;
  truckType: string;
  plateNumber: string;
  driverName: string;
  driverPhone: string;
  palletCount: number;
  totalWeightKg: number;
  status: SupplierShipmentStatus;
  departureDate: string;
  estimatedArrival: string;
  podSignedBy?: string;
  podImageUrl?: string;
  deliveredAt?: string;
}

export type SupplierReturnStatus =
  | "REQUESTED"
  | "ARRIVED_WAREHOUSE"
  | "QC_INSPECTION"
  | "CREDIT_NOTE_ISSUED"
  | "REJECTED";

export interface SupplierReturnItem {
  sku: string;
  title: string;
  quantity: number;
  reason: string;
  condition: "PRISTINE_RESTOCK" | "DAMAGED_SCRAP" | "DEFECTIVE_FACTORY";
  acceptedQty: number;
  creditAmount: number;
}

export interface SupplierReturn {
  id: string;
  returnNumber: string;
  poNumber: string;
  buyerName: string;
  items: SupplierReturnItem[];
  status: SupplierReturnStatus;
  creditNoteNumber?: string;
  totalCreditAmount: number;
  requestedAt: string;
  inspectedAt?: string;
  creditIssuedAt?: string;
  inspectorNotes?: string;
}

/**
 * B2B PROCUREMENT & REPLENISHMENT EXTENSION TYPES (MERCHANT -> SUPPLIER)
 */

export type B2BPurchaseOrderStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "CONFIRMED"
  | "ACCEPTED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "PARTIALLY_RECEIVED"
  | "RECONCILED"
  | "COMPLETED"
  | "CLOSED"
  | "REJECTED"
  | "CANCELLED";

export interface B2BPOStatusMetadata {
  status: B2BPurchaseOrderStatus;
  label: string; // Indonesian UI Label
  badgeVariant: "neutral" | "primary" | "secondary" | "success" | "warning" | "danger";
  description: string;
  allowedActors: ("MERCHANT" | "SUPPLIER" | "SYSTEM")[];
  nextAllowedStatuses: B2BPurchaseOrderStatus[];
  isTerminal: boolean;
}

export const CANONICAL_B2B_PO_STATUS_MAP: Record<B2BPurchaseOrderStatus, B2BPOStatusMetadata> = {
  DRAFT: {
    status: "DRAFT",
    label: "Draf PO",
    badgeVariant: "neutral",
    description: "Purchase order disimpan lokal belum diterbitkan ke supplier",
    allowedActors: ["MERCHANT"],
    nextAllowedStatuses: ["SUBMITTED", "CANCELLED"],
    isTerminal: false,
  },
  SUBMITTED: {
    status: "SUBMITTED",
    label: "Menunggu Supplier",
    badgeVariant: "warning",
    description: "PO resmi diterbitkan dan menunggu konfirmasi dari principal supplier",
    allowedActors: ["MERCHANT"],
    nextAllowedStatuses: ["ACCEPTED", "REJECTED", "CANCELLED"],
    isTerminal: false,
  },
  ACCEPTED: {
    status: "ACCEPTED",
    label: "Disetujui Supplier",
    badgeVariant: "primary",
    description: "Supplier menyetujui komitmen kuantitas dan harga PO",
    allowedActors: ["SUPPLIER"],
    nextAllowedStatuses: ["PROCESSING"],
    isTerminal: false,
  },
  PROCESSING: {
    status: "PROCESSING",
    label: "Disiapkan di Gudang",
    badgeVariant: "primary",
    description: "Pesanan dalam proses picking, packing palet, dan inspeksi QC gudang supplier",
    allowedActors: ["SUPPLIER"],
    nextAllowedStatuses: ["SHIPPED"],
    isTerminal: false,
  },
  SHIPPED: {
    status: "SHIPPED",
    label: "Dalam Pengiriman",
    badgeVariant: "neutral",
    description: "Kargo telah diberangkatkan via ekspedisi dengan nomor resi AWB",
    allowedActors: ["SUPPLIER"],
    nextAllowedStatuses: ["PARTIALLY_RECEIVED", "COMPLETED"],
    isTerminal: false,
  },
  PARTIALLY_RECEIVED: {
    status: "PARTIALLY_RECEIVED",
    label: "Diterima Sebagian",
    badgeVariant: "warning",
    description: "Barang telah diterima di gudang merchant dengan catatan selisih/kerusakan",
    allowedActors: ["MERCHANT"],
    nextAllowedStatuses: ["COMPLETED"],
    isTerminal: false,
  },
  COMPLETED: {
    status: "COMPLETED",
    label: "Selesai (Stock In)",
    badgeVariant: "success",
    description: "Kargo diterima lengkap dan seluruh unit telah masuk ke inventori gudang",
    allowedActors: ["MERCHANT"],
    nextAllowedStatuses: [],
    isTerminal: true,
  },
  REJECTED: {
    status: "REJECTED",
    label: "Ditolak",
    badgeVariant: "danger",
    description: "Supplier menolak pesanan karena kapasitas atau kendala stok",
    allowedActors: ["SUPPLIER"],
    nextAllowedStatuses: [],
    isTerminal: true,
  },
  CONFIRMED: {
    status: "CONFIRMED",
    label: "Terkonfirmasi",
    badgeVariant: "primary",
    description: "Pesanan telah dikonfirmasi oleh supplier",
    allowedActors: ["SUPPLIER"],
    nextAllowedStatuses: ["PROCESSING"],
    isTerminal: false,
  },
  DELIVERED: {
    status: "DELIVERED",
    label: "Tiba di Tujuan",
    badgeVariant: "success",
    description: "Kargo tiba di gudang tujuan dan siap proses receiving",
    allowedActors: ["MERCHANT"],
    nextAllowedStatuses: ["RECONCILED", "COMPLETED"],
    isTerminal: false,
  },
  RECONCILED: {
    status: "RECONCILED",
    label: "Terekonsiliasi",
    badgeVariant: "success",
    description: "Kuantitas fisik cocok dengan faktur dan PO",
    allowedActors: ["MERCHANT", "SUPPLIER"],
    nextAllowedStatuses: ["COMPLETED", "CLOSED"],
    isTerminal: false,
  },
  CLOSED: {
    status: "CLOSED",
    label: "Ditutup",
    badgeVariant: "neutral",
    description: "PO B2B ditutup permanen",
    allowedActors: ["MERCHANT", "SUPPLIER"],
    nextAllowedStatuses: [],
    isTerminal: true,
  },
  CANCELLED: {
    status: "CANCELLED",
    label: "Dibatalkan",
    badgeVariant: "neutral",
    description: "Merchant membatalkan pesanan sebelum diproses supplier",
    allowedActors: ["MERCHANT"],
    nextAllowedStatuses: [],
    isTerminal: true,
  },
};

export interface B2BPurchaseOrderItem {
  productId: string;
  sku: string;
  title: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  receivedQty?: number;
  acceptedQty?: number;
  damagedQty?: number;
  missingQty?: number;
}

export interface B2BReceivingRecord {
  receivedAt: string;
  receivedBy: string;
  totalReceived: number;
  totalAccepted: number;
  totalDamaged: number;
  totalMissing: number;
  condition: "PRISTINE" | "PARTIAL_DAMAGE" | "WRONG_PACKAGING" | "DEFECTIVE";
  notes: string;
  discrepancyHandled: boolean;
}

export interface B2BPurchaseOrder {
  id: string;
  poNumber: string;
  merchantId: string;
  merchantName: string;
  supplierId: string;
  supplierName: string;
  supplierContact: string;
  warehouseId: string; // Destination warehouse for Stock In
  warehouseName: string;
  destinationAddress: string;
  sourceWarehouseId?: string; // Source Supplier warehouse for picking & palletizing
  sourceWarehouseName?: string;
  items: B2BPurchaseOrderItem[];
  subtotal: number;
  taxAmount: number;
  shippingFee: number;
  totalAmount: number;
  status: B2BPurchaseOrderStatus;
  paymentTerms: "PREPAID" | "NET_14" | "NET_30" | "NET_60" | "COD";
  issuedDate: string;
  requestedDeliveryDate: string;
  actualDeliveryDate?: string;
  supplierNotes?: string;
  merchantNotes?: string;
  rejectionReason?: string;
  shipmentCarrier?: string;
  shipmentAwb?: string;
  shippedDate?: string;
  receivingRecord?: B2BReceivingRecord;
  createdAt: string;
  updatedAt: string;
}

export interface B2BSupplier {
  id: string;
  name: string;
  code: string;
  rating: number;
  completedOrdersCount: number;
  city: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  categories: string[];
  isVerified: boolean;
}

export interface SupplierB2BOffer {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierRating: number;
  supplierCity: string;
  productId: string;
  sku: string;
  title: string;
  category: string;
  moq: number;
  unit: string;
  unitPrice: number;
  tiers: SupplierPriceTier[];
  leadTimeDays: number;
  stockAvailable: number;
  warranty: string;
  compatibleWithSkus: string[];
  thumbnailUrl?: string;
  description: string;
}

/**
 * ============================================================================
 * MILESTONE 10 — PLATFORM OPERATIONS & ADMIN DOMAIN TYPES
 * ============================================================================
 */

export type KYCStatus = "PENDING_REVIEW" | "VERIFIED" | "REJECTED" | "NEEDS_RESUBMISSION";

export interface AdminKYCRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: "CUSTOMER" | "SERVICE_PROVIDER" | "WORKER_TECHNICIAN" | "MERCHANT" | "SUPPLIER";
  organizationId?: string;
  organizationName?: string;
  businessType?: "INDIVIDUAL" | "CV" | "PT" | "BENGKEL" | "TOKO";
  idNumber: string; // NIK / KTP
  taxNumber?: string; // NPWP
  businessLicenseNumber?: string; // NIB / SIUP
  submittedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewerName?: string;
  status: KYCStatus;
  documents: {
    type: "KTP" | "NPWP" | "NIB" | "WORKSHOP_PHOTO" | "STOREFRONT_PHOTO" | "BANK_STATEMENT";
    title: string;
    fileUrl: string;
    verified: boolean;
  }[];
  reviewNotes?: string;
}

export type ProductModerationStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUIRED";

export interface ProductModerationItem {
  id: string;
  productId: string;
  sku: string;
  title: string;
  category: string;
  sellerId: string;
  sellerName: string;
  sellerRole: "MERCHANT" | "SUPPLIER";
  price: number;
  moq?: number;
  stock: number;
  submittedAt: string;
  status: ProductModerationStatus;
  compatibilityList: string[];
  rejectionReason?: string;
  moderatedAt?: string;
  moderatorName?: string;
}

export type ContentModerationStatus = "PENDING" | "APPROVED" | "CENSORED" | "RESOLVED";

export interface ContentModerationItem {
  id: string;
  contentType: "SERVICE_REVIEW" | "PRODUCT_REVIEW" | "SELLER_COMMENT" | "CHAT_MESSAGE";
  targetId: string;
  targetTitle: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  rating?: number;
  content: string;
  reportedReason?: string;
  reportedBy?: string;
  reportedAt: string;
  status: ContentModerationStatus;
  moderatedAt?: string;
  moderatorName?: string;
  actionTaken?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceId: string;
  result: "SUCCESS" | "DENIED" | "FAILED" | "WARNING";
  scope: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

export interface ShippingIntegrationAdapter {
  id: string;
  carrierCode: "JNE" | "SICEPAT" | "GOSEND" | "LALAMOVE" | "CARGO_FREIGHT";
  carrierName: string;
  serviceType: "PARCEL_EXPRESS" | "INSTANT_COURIER" | "HEAVY_CARGO" | "INTERCITY_FREIGHT";
  isActive: boolean;
  endpointUrl: string;
  webhookStatus: "HEALTHY" | "DEGRADED" | "DISCONNECTED";
  lastSyncAt: string;
  pendingWebhooksCount: number;
  failureRatePercent: number;
  authMode: "API_KEY" | "OAUTH2" | "HMAC_SIGNATURE";
}

/**
 * ============================================================================
 * MILESTONE 11 — CEO & PRODUCT OWNER GOVERNANCE & EXECUTIVE ANALYTICS TYPES
 * ============================================================================
 */

export type TaxonomyProposalStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "REVISION_REQUESTED";

export interface TaxonomyProposal {
  id: string;
  domainId: FixedDomainId;
  domainName: string;
  subcategoryId: string;
  subcategoryName: string;
  proposalType: "NEW_SUBCATEGORY" | "UPDATE_SCHEMA" | "UPDATE_REQUIREMENTS" | "DEPRECATE_SERVICE";
  title: string;
  description: string;
  proposedBy: string;
  proposedByRole: string;
  proposedAt: string;
  status: TaxonomyProposalStatus;
  decisionNotes?: string;
  decidedAt?: string;
  decidedBy?: string;
  impactSummary: {
    affectedServicesCount: number;
    activeProvidersCount: number;
    estimatedGmvImpactPercent: number;
    catalogCompatibilityNotes: string;
  };
  schemaChanges?: {
    addedFields?: string[];
    removedFields?: string[];
    modifiedValidations?: string[];
  };
}

export type FeePolicyStatus = "CURRENT" | "DRAFT" | "SCHEDULED" | "ARCHIVED";

export interface FeePolicyConfig {
  id: string;
  version: string;
  status: FeePolicyStatus;
  effectiveDate: string;
  serviceTakeRatePercent: number;
  productTakeRatePercent: number;
  b2bTakeRatePercent: number;
  platformProtectionFee: number;
  escrowFeePercent: number;
  minServiceFee: number;
  maxServiceFeeCap?: number;
  description: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  publishedBy?: string;
  publishedAt?: string;
}

export interface ShippingGovernancePolicy {
  id: string;
  version: string;
  status: "CURRENT" | "DRAFT" | "ARCHIVED";
  effectiveDate: string;
  standardFulfillmentSlaHours: number;
  expressFulfillmentSlaHours: number;
  cargoStagingSlaHours: number;
  carrierEscalationThresholdMinutes: number;
  remoteAreaSurchargeAllowed: boolean;
  maxFreeInsuranceCap: number;
  notes: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ReturnGovernancePolicy {
  id: string;
  version: string;
  status: "CURRENT" | "DRAFT" | "ARCHIVED";
  effectiveDate: string;
  retailReturnWindowDays: number;
  b2bReturnWindowDays: number;
  requireUnboxingVideo: boolean;
  inspectionSlaHours: number;
  sellerRestockingFeePercent: number;
  disputeEscalationWindowDays: number;
  notes: string;
  updatedAt: string;
  updatedBy: string;
}

export interface GuaranteeGovernancePolicy {
  id: string;
  version: string;
  status: "CURRENT" | "DRAFT" | "ARCHIVED";
  effectiveDate: string;
  workmanshipWarrantyDays: number;
  sparepartWarrantyDays: number;
  autoRefundThreshold: number;
  reServiceMaxAttempts: number;
  customerSatisfactionCoveragePercent: number;
  notes: string;
  updatedAt: string;
  updatedBy: string;
}

export type AISafetySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AISafetyIncident {
  id: string;
  timestamp: string;
  severity: AISafetySeverity;
  type:
    | "UNSAFE_SCOPE"
    | "PRICE_INVENTION_ATTEMPT"
    | "OUT_OF_STOCK_RECOMMENDATION"
    | "HIGH_VOLTAGE_CERT_BYPASS"
    | "HALLUCINATED_COMPATIBILITY"
    | "MODEL_TIMEOUT";
  description: string;
  promptSummary: string;
  blockedBy: "HARD_RULES" | "GEMINI_GUARDRAIL" | "CATALOG_CONSTRAINT";
  status: "INVESTIGATING" | "RESOLVED" | "MITIGATED";
  mitigationAction: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AISmartDiscoveryTelemetry {
  totalDiscoverySessions: number;
  recommendationAcceptanceRate: number; // percentage e.g. 74.2
  clickThroughRate: number; // percentage e.g. 58.4
  conversionRate: number; // percentage e.g. 32.1
  averageLatencyMs: number;
  ruleFallbackRate: number; // percentage e.g. 4.6
  userSatisfactionScore: number; // out of 5 e.g. 4.8
  lastUpdated: string;
  architectureLayers: {
    name: string;
    description: string;
    status: "HEALTHY" | "DEGRADED" | "STANDBY";
    latencyMs: number;
  }[];
}

export type ExecutiveTimeRange = "today" | "7d" | "30d" | "90d";

export interface ExecutiveAnalyticsData {
  timeRange: ExecutiveTimeRange;
  kpi: {
    gmv: number;
    gmvChangePercent: number;
    takeRate: number;
    takeRateYieldRevenue: number;
    totalOrders: number;
    ordersChangePercent: number;
    revenue: number;
    revenueChangePercent: number;
    platformFees: number;
    customerGrowth: number;
    providerGrowth: number;
    demandVolume: number;
    supplyActiveCount: number;
    slaOnTimePercent: number;
    averageRating: number;
    cancellationRatePercent: number;
    returnRatePercent: number;
    refundAmount: number;
  };
  breakdown: {
    serviceGmv: number;
    productGmv: number;
    b2bGmv: number;
    serviceOrdersCount: number;
    productOrdersCount: number;
    b2bOrdersCount: number;
  };
  domainHealth: {
    domainId: FixedDomainId;
    domainName: string;
    gmv: number;
    activeProviders: number;
    activeOrders: number;
    slaPercent: number;
    growthPercent: number;
  }[];
}

/**
 * ============================================================================
 * PHASE B: ROLE-FLOW REVISION DOMAIN CONTRACTS (docs/todo.md Section 56J)
 * ============================================================================
 */

/**
 * 3 Canonical Sourcing Scenarios for Service Spareparts (docs/todo.md Section 3)
 */
export type SparepartSourceType =
  | "PROVIDER_OWNED"
  | "PARTNER_MERCHANT"
  | "CUSTOMER_SELF_PURCHASE";

/**
 * Meaningful lifecycle statuses for service procurement context (docs/todo.md Section 21)
 * NOTE: Independent of Product Order, Payment, Fulfillment, or Service Order status.
 */
export type SparepartStatus =
  | "RECOMMENDED"
  | "CUSTOMER_PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ORDERED"
  | "PROCESSING"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RECEIVED"
  | "USED"
  | "CANCELLED"
  | "UNAVAILABLE";

/**
 * Customer Approval Decision Status (docs/todo.md Section 2.4 & 18.2)
 */
export type SparepartApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

/**
 * 56J.1 SparepartRequirement
 * Contextual requirement generated by diagnosis or inspection during service.
 */
export interface SparepartRequirement {
  id: string;
  serviceOrderId: string;
  sourceType: SparepartSourceType;
  partName: string;
  productId?: string;
  merchantId?: string;
  providerId: string;
  workerId?: string;
  quantity: number;
  reason: string;
  diagnosisContext?: string;
  unitPrice?: number;
  totalPrice?: number;
  customerApprovalStatus: SparepartApprovalStatus;
  procurementStatus: SparepartStatus;
  productOrderId?: string;
  shipmentId?: string;
  usedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 56J.2 StorePartnership
 * Formal partnership between Service Provider and Merchant/Toko Partner (docs/todo.md Section 11).
 */
export type StorePartnershipStatus =
  | "PENDING"
  | "ACTIVE"
  | "INACTIVE"
  | "REJECTED"
  | "SUSPENDED";

export interface StorePartnership {
  id: string;
  providerId: string;
  merchantId: string;
  merchantName?: string;
  providerName?: string;
  providerLogo?: string;
  providerRating?: number;
  providerReviewCount?: number;
  providerSpecialization?: string;
  providerServiceArea?: string;
  providerServiceCount?: number;
  providerDescription?: string;
  status: StorePartnershipStatus;
  requestedAt: string;
  approvedAt?: string;
  endedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  notes?: string;
  scope: string; // e.g. "HVAC_SPAREPARTS" | "ELECTRICAL" | "GENERAL"
  rating?: number;
  distanceKm?: number;
  productCategories?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 56J.3 ProductRecommendation
 * Worker-generated recommendation grounded in partner merchant products.
 */
export type ProductRecommendationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "DECLINED"
  | "EXPIRED";

export type CustomerRecommendationDecision =
  | "ACCEPT_PARTNER"
  | "CHOOSE_ALTERNATIVE"
  | "SELF_PURCHASE"
  | "DECLINE";

export interface ProductRecommendation {
  id: string;
  serviceOrderId: string;
  workerId: string;
  workerName?: string;
  providerId: string;
  merchantId: string;
  merchantName?: string;
  productId: string;
  productTitle?: string;
  productThumbnailUrl?: string;
  reason: string;
  compatibilityContext: string;
  priceSnapshot: number;
  availabilitySnapshot: boolean;
  shippingEstimateSnapshot?: string;
  status: ProductRecommendationStatus;
  customerDecision?: CustomerRecommendationDecision;
  alternativeProductId?: string;
  alternativeMerchantId?: string;
  alternativeMerchantName?: string;
  decidedAt?: string;
  declineReason?: string;
  productOrderId?: string;
  shipmentId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 56J.4 AffiliateAttribution
 * Attribution metadata connecting Product Order to recommending Provider & Worker (docs/todo.md Section 8).
 */
export type AffiliateEligibilityStatus =
  | "PENDING"
  | "ELIGIBLE"
  | "CONFIRMED"
  | "DISBURSED"
  | "CANCELLED"
  | "REVOKED"
  | "REVERSED";

export interface AffiliateAttribution {
  id: string;
  productOrderId: string;
  serviceOrderId: string;
  providerId: string;
  providerName?: string;
  workerId: string;
  workerName?: string;
  merchantId: string;
  merchantName?: string;
  productId: string;
  productTitle?: string;
  recommendationId?: string;
  customerConfirmationStatus?: "PENDING" | "CONFIRMED" | "REJECTED";
  source: "SERVICE_RECOMMENDATION";
  eligibilityStatus: AffiliateEligibilityStatus;
  status?: string;
  pointsProvider?: number;
  pointsWorker?: number;
  commissionAmountProvider?: number;
  commissionAmountWorker?: number;
  affiliateFeeAmount?: number;
  affiliateFeeRateSnapshot?: number;
  affiliateFeePolicyVersion?: string;
  rewardPolicyVersion?: string;
  conversionPolicyVersion?: string;
  rewardProviderAmount?: number;
  rewardWorkerAmount?: number;
  pointLedgerIds?: string[];
  createdAt: string;
  finalizedAt?: string;
  reversedAt?: string;
  reversalReason?: string;
}

/**
 * Provider-Owned Material Line (docs/todo.md Section 4 & 7.1)
 * Physical materials brought/held by Provider, NOT managed via on-platform inventory.
 */
export interface ProviderMaterialLine {
  id: string;
  serviceOrderId?: string;
  sparepartRequirementId?: string;
  partName: string;
  partNumber?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  source: "PROVIDER_OWNED";
  customerApprovalStatus: SparepartApprovalStatus;
  isFulfillable?: boolean;
  approvedAt?: string;
  recordedByWorkerId?: string;
  usedAt?: string;
  notes?: string;
  createdAt?: string;
}

/**
 * Sparepart Timeline Events & Projection (docs/todo.md Section 19 & 60)
 */
export type SparepartTimelineEventType =
  | "SPAREPART_RECOMMENDED"
  | "SPAREPART_CUSTOMER_APPROVAL_REQUIRED"
  | "SPAREPART_APPROVED"
  | "SPAREPART_REJECTED"
  | "PROVIDER_MATERIAL_PREPARED"
  | "SPAREPART_PRODUCT_ORDER_CREATED"
  | "SPAREPART_MERCHANT_ACCEPTED"
  | "SPAREPART_FULFILLMENT_STARTED"
  | "SPAREPART_SHIPPED"
  | "SPAREPART_DELIVERED"
  | "SPAREPART_RECEIVED"
  | "SPAREPART_USED"
  | "SPAREPART_UNAVAILABLE"
  | "SERVICE_WAITING_FOR_MATERIAL"
  | "SERVICE_RESUMED_AFTER_MATERIAL";

export interface SparepartTimelineEvent {
  id: string;
  serviceOrderId: string;
  sparepartRequirementId?: string;
  productOrderId?: string;
  type: SparepartTimelineEventType;
  title: string;
  description: string;
  timestamp: string;
  actorRole: "CUSTOMER" | "SERVICE_PROVIDER" | "WORKER_TECHNICIAN" | "MERCHANT" | "SYSTEM";
  actorName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Product Order Structure for Customer Sourcing & Merchant Fulfillment (docs/todo.md Section 7, 29, 56J)
 */
export interface ProductOrderItem {
  productId: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  thumbnailUrl?: string;
}

export interface ProductOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  merchantId: string;
  merchantName: string;
  items: ProductOrderItem[];
  subtotal: number;
  shippingFee: number;
  insuranceFee?: number;
  platformFee: number;
  totalAmount: number;
  status: MerchantOrderStatus;
  paymentMethod: string;
  shippingAddress: string;
  courierName?: string;
  trackingNumber?: string;
  podPhotoUrl?: string;
  createdAt: string;
  updatedAt: string;

  // Contextual Service Relation (docs/todo.md Section 7, 29, 56J)
  orderSource?: "DIRECT" | "SERVICE_RECOMMENDATION";
  serviceOrderId?: string;
  sparepartRequirementId?: string;
  serviceContext?: {
    serviceOrderId: string;
    serviceTitle: string;
    providerId: string;
    providerName: string;
    workerId?: string;
    workerName?: string;
  };
  affiliateAttribution?: AffiliateAttribution;
}

/**
 * Phase E Finalization: Merchant Profile & Affiliate Enrollment
 */
export type MerchantRegistrationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "NEEDS_REVISION"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export type MerchantAffiliateStatus =
  | "NOT_ELIGIBLE"
  | "ELIGIBLE"
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

export interface MerchantProfile {
  id: string;
  merchantId: string;
  businessName: string;
  description: string;
  category: string;
  productCategories: string[];
  address: string;
  city: string;
  phone: string;
  email: string;
  operatingHours: string;
  responsiblePerson: string;
  status: MerchantRegistrationStatus;
  affiliateStatus: MerchantAffiliateStatus;
  isProfileComplete: boolean;
  isKycVerified: boolean;
  isProductCatalogValid: boolean;
  isFulfillmentReady: boolean;
  isSettlementInfoComplete: boolean;
  hasActiveSuspension: boolean;
  affiliateTermsAccepted: boolean;
  affiliateTermsVersion?: string;
  affiliatePolicyVersion?: string;
  affiliateAcceptedBy?: string;
  affiliateAcceptedAt?: string;
  affiliateEnrolledAt?: string;
  affiliateDeactivatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Phase E Finalization: Affiliate Fee Policy (CEO Governance & Finance Operational)
 */
export interface AffiliateFeePolicy {
  feePolicyId: string;
  rate: number; // e.g. 0.05 (5%)
  basis: "ELIGIBLE_PRODUCT_SUBTOTAL";
  allowedMinRate: number; // e.g. 0.01 (1%)
  allowedMaxRate: number; // e.g. 0.10 (10%)
  providerSharePercent: number; // e.g. 60 (60%)
  workerSharePercent: number; // e.g. 40 (40%)
  pointsPerThousandIdr: number; // e.g. 10 (100 pts = Rp 10.000)
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string;
  policyVersion: string; // e.g. "AFF-001"
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  createdBy: string;
  createdAt: string;
}

/**
 * Phase E Finalization: Point Ledger (Canonical Double-Entry / Auditable Movement)
 */
export type PointLedgerOwnerType = "PROVIDER" | "WORKER";
export type PointLedgerSourceType =
  | "AFFILIATE_REWARD"
  | "REDEMPTION"
  | "REVERSAL"
  | "ADJUSTMENT";
export type PointLedgerDirection = "CREDIT" | "DEBIT";
export type PointLedgerStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "REVERSED";

export interface PointLedgerEntry {
  ledgerId: string;
  ownerType: PointLedgerOwnerType;
  ownerId: string;
  sourceType: PointLedgerSourceType;
  sourceId: string; // e.g. attributionId, redemptionId, orderNumber
  pointAmount: number; // Positive integer
  direction: PointLedgerDirection;
  status: PointLedgerStatus;
  policyVersion: string;
  conversionPolicyVersion: string;
  createdAt: string;
  effectiveAt?: string;
  reversalOf?: string; // Links to original ledgerId when reversing
  metadata?: Record<string, unknown>;
}

/**
 * Phase E Finalization: Reward Catalog & Redemptions
 */
export type RewardType = "SERVICE_VOUCHER" | "PRODUCT_VOUCHER" | "FEE_DISCOUNT";

export interface RewardCatalogItem {
  rewardId: string;
  name: string;
  description: string;
  requiredPoints: number;
  rewardValue: number; // Value in IDR
  rewardType: RewardType;
  eligibility: PointLedgerOwnerType[];
  active: boolean;
  startDate?: string;
  endDate?: string;
  redemptionLimit?: number;
  usagePolicy?: string;
  createdBy?: string;
  policyVersion: string;
}

export type VoucherStatus = "ISSUED" | "ACTIVE" | "USED" | "EXPIRED";
export type RedemptionStatus = "COMPLETED" | "FAILED" | "REVERSED";

export interface RedemptionRecord {
  redemptionId: string;
  ownerType: PointLedgerOwnerType;
  ownerId: string;
  rewardId: string;
  rewardName: string;
  pointsSpent: number;
  balanceBefore: number;
  balanceAfter: number;
  status: RedemptionStatus;
  voucherCode: string;
  voucherStatus: VoucherStatus;
  issuedAt: string;
  expiresAt?: string;
  policyVersion: string;
  idempotencyKey?: string;
  ledgerId?: string;
}

/**
 * Phase E Finalization: Finance Reconciliation
 */
export interface AffiliateFinanceReconciliationRow {
  productOrderId: string;
  orderNumber: string;
  serviceOrderId?: string;
  merchantId: string;
  merchantName: string;
  providerId: string;
  providerName: string;
  workerId: string;
  workerName: string;
  productSubtotal: number;
  subtotal?: number;
  affiliateFeeRate: number;
  affiliateFeeRateSnapshot?: number;
  policyVersion?: string;
  affiliateFee?: number;
  affiliateFeeAmount: number;
  providerRewardAmount: number;
  providerRewardPoints: number;
  providerRewardLiability?: number;
  providerPoints?: number;
  workerRewardAmount: number;
  workerRewardPoints: number;
  workerRewardLiability?: number;
  workerPoints?: number;
  netMerchantSettlement: number;
  rewardStatus: AffiliateEligibilityStatus;
  reconciliationStatus: "MATCHED" | "DISCREPANCY" | "MANUAL_REVIEW" | "REVERSED" | "MISMATCH";
  createdAt: string;
}

export interface AffiliateFinanceSummary {
  affiliateGMV: number;
  totalGmv: number;
  affiliateFeeGenerated: number;
  totalFeeCollected: number;
  providerRewardLiability: number;
  providerRewardPoints: number;
  workerRewardLiability: number;
  workerRewardPoints: number;
  totalRewardLiability: number;
  redeemedRewardValue: number;
  reversedRewardValue: number;
  outstandingRewardLiability: number;
  outstandingLiability: number;
  activeAffiliateMerchants: number;
  activePartnerships: number;
  eligibleAffiliateOrders: number;
  totalOrders?: number;
}

// ============================================================================
// SERVIO FINAL LOCKED SPEC: FINANCE & CEO FEE MANAGEMENT GOVERNANCE
// ============================================================================

export type FeePolicyType =
  | "APPLICATION_FEE"
  | "AFFILIATE_FEE"
  | "PROVIDER_REWARD"
  | "WORKER_REWARD";

export type FeeCalculationType = "PERCENTAGE" | "FIXED_AMOUNT";

export type FeeProposalStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "SCHEDULED"
  | "ACTIVE"
  | "REJECTED"
  | "SUPERSEDED";

export interface FeePolicy {
  id: string;
  changeRequestId?: string;
  policyType: FeePolicyType;
  calculationType: FeeCalculationType;
  value: number; // Percentage (e.g. 5 for 5%) or IDR numeric (e.g. 5000 for Rp 5.000)
  currency: "IDR";
  status: FeeProposalStatus;
  effectiveFrom: string; // ISO date YYYY-MM-DD
  effectiveTo?: string;
  version: string; // e.g. "APP-v1.0", "AFF-v1.0"
  proposalReason: string;
  notes?: string;
  submittedBy: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  supersedesPolicyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeePolicyChange {
  policyType: FeePolicyType;
  calculationType: FeeCalculationType;
  currentValue: number;
  proposedValue: number;
  unit: "%" | "Rp";
  currentPolicyId?: string;
  proposedPolicyId?: string;
}

export interface FeeChangeRequest {
  id: string; // e.g. "fcr-2026-001"
  requestNumber: string; // e.g. "FP-2026-009"
  proposalType: "SINGLE" | "COMBINED_AFFILIATE";
  status: FeeProposalStatus;
  requestedBy: string;
  requestedAt: string;
  effectiveDate: string; // YYYY-MM-DD
  reason: string;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  policyChanges: FeePolicyChange[];
  createdAt: string;
  updatedAt: string;
}

export interface FeeGovernanceMetrics {
  activeCount: number;
  pendingCount: number;
  draftCount: number;
  scheduledCount: number;
  rejectedCount: number;
  changesLast30Days: number;
}

/**
 * TAX POLICY GOVERNANCE V2 (Level 05 C)
 */
export type TaxStatus = "NOT_USED" | "USED";
export type TaxType = "PPN";
export type TaxCalculationType = "PERCENTAGE";
export type TaxBasis = "SERVICE_PRICE" | "ORDER_SUBTOTAL" | "OTHER_SUPPORTED_BASE";

export interface TaxPolicyConfiguration {
  enabled: boolean;
  status?: TaxStatus;
  taxType: TaxType;
  calculationType: TaxCalculationType;
  rate: number | null;
  taxBasis: TaxBasis;
}

export interface TaxEffectivePolicy {
  status: TaxStatus;
  taxStatus: TaxStatus;
  taxType: string;
  calculationType: string;
  rate: number | null;
  taxBasis: string;
  activeRule: string;
  effectiveFrom?: string | null;
  version?: string | null;
  configurationDigest?: string;
  configuration?: TaxPolicyConfiguration;
}

export interface TaxProposalRequest {
  id: string;
  proposalCode: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "SCHEDULED" | "ACTIVE" | "REJECTED";
  policyType: "TAX";
  proposedBy: string;
  proposedAt: string;
  effectiveFrom: string;
  reason: string;
  notes?: string;
  currentConfiguration: {
    status: TaxStatus;
    taxType: string;
    rate: number | null;
    taxBasis: string;
    effectiveFrom?: string | null;
  };
  proposedConfiguration: TaxPolicyConfiguration;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * ============================================================================
 * PLATFORM POLICY (CEO-OWNED UNIFIED MODEL - HARDENED LEVEL 05)
 * 5 Core Governed Fields: Application Fee, Affiliate Fee, Provider Reward, Worker Reward, Tax.
 * Single Authoritative Version Snapshot.
 * ============================================================================
 */
export interface PlatformPolicyConfiguration {
  applicationFee: {
    calculationType: "FIXED_AMOUNT" | "PERCENTAGE";
    value: number;
    currency?: string;
  };
  affiliateFee: {
    calculationType: "PERCENTAGE" | "FIXED_AMOUNT";
    value: number;
    basis?: string;
  };
  providerReward: {
    calculationType: "PERCENTAGE";
    value: number;
  };
  workerReward: {
    calculationType: "PERCENTAGE";
    value: number;
  };
  tax: {
    enabled: boolean;
    status: "NOT_USED" | "USED";
    taxType: string;
    calculationType: string;
    rate: number | null;
    taxBasis: string;
  };
}

export interface PlatformPolicyVersion {
  id: string;
  version: string;
  status: "ACTIVE" | "SCHEDULED" | "SUPERSEDED" | "CANCELLED";
  effectiveFrom: string;
  effectiveUntil?: string | null;
  configuration: PlatformPolicyConfiguration;
  configurationDigest: string;
  changeReason: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  appliedBy: string;
  appliedAt: string;
  supersedesVersionId?: string | null;
}

export interface PlatformPolicyChangePayload {
  effectiveMode: "IMMEDIATE" | "SCHEDULED";
  effectiveFrom?: string;
  changeReason: string;
  notes?: string;
  changes: {
    applicationFee?: {
      calculationType?: "FIXED_AMOUNT" | "PERCENTAGE";
      value?: number;
      currency?: string;
    };
    affiliateFee?: {
      calculationType?: "PERCENTAGE" | "FIXED_AMOUNT";
      value?: number;
      basis?: string;
    };
    providerReward?: {
      calculationType?: "PERCENTAGE";
      value?: number;
    };
    workerReward?: {
      calculationType?: "PERCENTAGE";
      value?: number;
    };
    tax?: {
      enabled?: boolean;
      status?: "NOT_USED" | "USED";
      rate?: number | null;
      taxType?: string;
      taxBasis?: string;
    };
  };
}

/* =========================================================================
   LEVEL 07 ITEMS 86-92: SIMPLIFIED MARKETPLACE PRODUCT DOMAIN
   ========================================================================= */

export type ProductLifecycleStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type ProductCategoryStatus = "ACTIVE" | "INACTIVE";

export interface ApiBrand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  logoUrl?: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  product_count?: number;
  productCount?: number;
  created_at?: string;
  createdAt?: string;
}

export interface ApiProductCategory {
  _id?: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  status: ProductCategoryStatus;
  sortOrder: number;
  productCount?: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiProductVariant {
  _id?: string;
  variantId: string;
  productId: string;
  name: string;
  price: number;
  stock: number;
  status: ProductLifecycleStatus;
  media?: Array<{ url: string; type?: string; sortOrder?: number }>;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiProduct {
  _id?: string;
  productId: string;
  merchantOrganizationId: string;
  merchantName?: string;
  providerName?: string;
  categoryId: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  name: string;
  brandName?: string;
  description?: string;
  media?: Array<{ url: string; type?: string; sortOrder?: number } | string>;
  status: ProductLifecycleStatus;
  publishedAt?: string | null;
  minPrice?: number;
  maxPrice?: number;
  priceDisplay?: string;
  priceRangeFormatted?: string;
  totalStock?: number;
  variantCount?: number;
  variants?: ApiProductVariant[];
  warrantyPolicy?: {
    durationMonths?: number;
    durationDays?: number;
    type?: string;
    coverage?: string;
    exclusions?: string;
    terms?: string;
  };
  warrantyDays?: number;
  merchant?: {
    id: string;
    name: string;
    brandName?: string;
  };
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function getProductMediaUrl(media?: Array<{ url: string; type?: string; sortOrder?: number } | string>): string | undefined {
  if (!media || media.length === 0) return undefined;
  const first = media[0];
  if (typeof first === "string") return first;
  return first?.url;
}

export interface ApiProductCompatibility {
  _id?: string;
  compatibilityId: string;
  variantAId: string;
  variantBId: string;
  compatibilityKey: string;
  notes?: string;
  status: "ACTIVE" | "INACTIVE";
  variantA?: ApiProductVariant;
  variantB?: ApiProductVariant;
  targetVariant?: ApiProductVariant;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiSupplierProduct {
  _id?: string;
  supplierProductId: string;
  supplierOrganizationId: string;
  productId: string;
  variantId: string;
  supplierProductCode: string;
  supplierProductName: string;
  supplierDescription?: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  product?: ApiProduct;
  variant?: ApiProductVariant;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiProductAnalytics {
  metrics: {
    totalProducts: number;
    activeProducts: number;
    totalCategories: number;
    totalVariants: number;
    activeVariants: number;
    outOfStockVariants: number;
    totalSupplierProducts: number;
  };
  categoryDistribution: Array<{
    categoryId: string;
    name: string;
    productCount: number;
  }>;
}

export interface ApiShopProfile {
  id: string;
  name: string;
  organizationCode?: string;
  status?: string;
  productCount: number;
  rating?: number;
  reviewCount?: number;
  city?: string;
  verified?: boolean;
  badge?: string;
  joinedYear?: string;
  warrantyOffer?: string;
  description?: string;
}


