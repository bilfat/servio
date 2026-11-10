/**
 * SERVIO MODUL 07 - AFTER-SALES & FEEDBACK API CLIENT
 * Connects to backend/services/after-sales-service (Port 8008)
 * Prefix: /api/v1/after-sales
 */

import { apiFetch, ApiResponse } from "./servioApi";

// -------------------------------------------------------------
// TYPES & DATA CONTRACTS
// -------------------------------------------------------------

export interface PaginatedMeta {
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface WarrantyOptionVersion {
  id: string;
  warranty_option_id: string;
  version_no: number;
  name: string;
  duration_days: number;
  coverage_text: string;
  exclusion_text?: string | null;
  created_by?: string | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WarrantyOption {
  id: string;
  org_type: "MERCHANT" | "PROVIDER";
  org_id: string;
  slug?: string;
  name: string;
  duration_days: number;
  coverage_text: string;
  exclusion_text?: string | null;
  status: "ACTIVE" | "INACTIVE";
  version: number;
  latest_version_id?: string | null;
  latest_version?: WarrantyOptionVersion | null;
  versions?: WarrantyOptionVersion[];
  created_at: string;
  updated_at: string;
}

export interface OrderWarrantyEntitlement {
  id: string;
  customer_id: string;
  source_kind?: "GOODS" | "SERVICE";
  source_order_kind: "GOODS" | "SERVICE";
  order_id?: string;
  source_order_id: string;
  merchant_order_id?: string | null;
  source_merchant_order_id?: string | null;
  order_item_key?: string | null;
  source_item_id?: string | null;
  catalog_ref?: string | null;
  product_id?: string | null;
  service_id?: string | null;
  owner_org_id: string;
  owner_org_type: "MERCHANT" | "PROVIDER";
  warranty_option_id?: string | null;
  warranty_option_version_id?: string | null;
  snapshot_name?: string;
  snapshot_duration_days?: number;
  snapshot_coverage?: string;
  snapshot_exclusion?: string | null;
  quantity?: number;
  ordered_at?: string | null;
  source_completed_at?: string | null;
  starts_at: string;
  expires_at: string;
  status: "PENDING_START" | "ACTIVE" | "EXPIRED" | "CLAIMED" | "VOID";
  terms_snapshot?: {
    name?: string;
    duration_days?: number;
    coverage?: string;
    coverage_text?: string;
    exclusion?: string;
    exclusion_text?: string;
    [key: string]: any;
  };
  catalog_snapshot?: {
    name?: string;
    title?: string;
    image_url?: string;
    price?: number;
    price_idr?: number;
    sku?: string;
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}

export interface CaseItem {
  id: string;
  case_id: string;
  source_item_ref: string;
  quantity_requested: number;
  catalog_snapshot?: {
    name?: string;
    title?: string;
    price?: number;
    unit_price?: number;
    price_idr?: number;
    sku?: string;
    image_url?: string;
    [key: string]: any;
  };
}

export interface CaseEvidence {
  id: string;
  case_id: string;
  media_ref: string;
  content_type?: string | null;
  size_bytes?: number | null;
  sha256?: string | null;
  created_at: string;
}

export interface CaseEvent {
  id: string;
  case_id: string;
  sequence: number;
  event_type: string;
  from_state?: string | null;
  to_state: string;
  actor_kind: "CUSTOMER" | "MERCHANT" | "PROVIDER" | "SYSTEM" | "SUPPORT" | "ADMIN";
  actor_id?: string | null;
  reason?: string | null;
  data_json?: Record<string, any> | null;
  occurred_at?: string;
  created_at: string;
}

export interface CaseProposal {
  id: string;
  case_id: string;
  proposed_by: "MERCHANT" | "PROVIDER" | "CUSTOMER";
  solution_code: "REPLACEMENT" | "REWORK" | "REFUND" | "REPAIR_GOODS";
  reason_text: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "SUPERSEDED";
  customer_decision_at?: string | null;
  customer_decision_reason?: string | null;
  created_at: string;
}

export interface CaseExternalRef {
  id: string;
  case_id: string;
  resolution_id?: string | null;
  target_service: "05A" | "05B" | "06" | "09";
  external_id: string;
  purpose: "REPLACEMENT_FULFILLMENT" | "WARRANTY_JOB" | "REFUND_DECISION" | "SUPPORT_DISPUTE";
  external_status: string;
  last_checked_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CaseResolution {
  id: string;
  case_id: string;
  solution_code: "REPLACEMENT" | "REWORK" | "REFUND" | "REPAIR_GOODS";
  status: "NOT_STARTED" | "IN_PROGRESS" | "VERIFIED_DONE" | "FAILED" | "ON_HOLD";
  evidence_ref?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AfterSalesCase {
  id: string;
  case_number: string;
  case_type: "GOODS_WARRANTY" | "SERVICE_WARRANTY" | "GOODS_RETURN";
  customer_id: string;
  owner_org_id: string;
  owner_org_type: "MERCHANT" | "PROVIDER";
  source_order_kind: "GOODS" | "SERVICE";
  source_order_id: string;
  source_merchant_order_id?: string | null;
  entitlement_id?: string | null;
  initial_solution: "REPLACEMENT" | "REWORK" | "REFUND";
  agreed_solution?: "REPLACEMENT" | "REWORK" | "REFUND" | "REPAIR_GOODS" | null;
  reason_code: string;
  description: string;
  main_status: "SUBMITTED" | "UNDER_REVIEW" | "AWAITING_RETURN" | "IN_RESOLUTION" | "COMPLETED" | "REJECTED" | "CANCELLED";
  substate?: "AWAITING_CUSTOMER_INFO" | "AWAITING_CUSTOMER_CONSENT" | "AWAITING_RETURN" | null;
  response_due_at: string;
  response_state: "WAITING" | "RESPONDED" | "OVERDUE";
  first_meaningful_response_at?: string | null;
  overdue_first_detected_at?: string | null;
  rejected_at?: string | null;
  reject_reason?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  items?: CaseItem[];
  evidence?: CaseEvidence[];
  events?: CaseEvent[];
  proposals?: CaseProposal[];
  latest_proposal?: CaseProposal | null;
  latestProposal?: CaseProposal | null;
  resolution?: CaseResolution | null;
  external_refs?: CaseExternalRef[];
  externalRefs?: CaseExternalRef[];
  return_instruction?: any;
  returnInstruction?: any;
  return_shipment?: any;
  returnShipment?: any;
  return_receipt?: any;
  returnReceipt?: any;
  return_inspection?: any;
  returnInspection?: any;
  shipping_expenses?: any[];
  shippingExpenses?: any[];
}

export interface ReviewReply {
  id: string;
  review_entry_id: string;
  owner_org_id?: string;
  business_org_id: string;
  replied_by?: string;
  actor_id: string;
  text: string;
  reply_text: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewEntry {
  id: string;
  submission_id?: string;
  review_submission_id: string;
  owner_org_id?: string | null;
  target_type: "PRODUCT" | "SERVICE" | "MERCHANT" | "PROVIDER";
  target_id: string;
  rating: number;
  text?: string | null;
  review_text?: string | null;
  comment?: string | null;
  source_item_key?: string | null;
  media_refs?: string[] | null;
  status: "VISIBLE" | "PUBLISHED" | "HIDDEN";
  submitted_at: string;
  created_at?: string;
  ordered_at?: string | null;
  customer_display_name?: string | null;
  source_order_id?: string | null;
  source_merchant_order_id?: string | null;
  source_kind?: "GOODS" | "SERVICE" | null;
  reply?: ReviewReply | null;
  submission?: ReviewSubmission;
  moderations?: Array<{
    id: string;
    review_entry_id: string;
    admin_id: string;
    action: "HIDE" | "RESTORE";
    reason: string;
    occurred_at: string;
  }>;
}

export type ReviewEntryDto = ReviewEntry;

export interface ReviewSubmission {
  id: string;
  customer_id: string;
  customer_display_name?: string | null;
  source_kind: "GOODS" | "SERVICE";
  source_order_id: string;
  source_merchant_order_id?: string | null;
  ordered_at?: string | null;
  submitted_at: string;
  entries?: ReviewEntry[];
}

export interface BusinessReputation {
  target_type?: "PRODUCT" | "SERVICE" | "MERCHANT" | "PROVIDER";
  target_id?: string;
  type?: "MERCHANT" | "PROVIDER";
  org_id?: string;
  average_rating: number;
  total_reviews: number;
  distribution?: Record<string, number>;
  rating_distribution?: Record<string, number>;
}

export type BusinessReputationDto = BusinessReputation;

export interface BusinessReviewSummary {
  org_id: string;
  org_type: "MERCHANT" | "PROVIDER";
  item_average_rating: number;
  item_total_ratings: number;
  business_average_rating: number;
  business_total_ratings: number;
  product_average_rating: number;
  product_total_ratings: number;
  merchant_average_rating: number;
  merchant_total_ratings: number;
  service_average_rating: number;
  service_total_ratings: number;
  provider_average_rating: number;
  provider_total_ratings: number;
  total_reviews: number;
  unreplied_count: number;
}

export interface CatalogRatingSummaryItem {
  target_type: "PRODUCT" | "SERVICE" | "MERCHANT" | "PROVIDER";
  target_id: string;
  total_reviews: number;
  average_rating: number;
  distribution?: Record<string, number>;
}

// -------------------------------------------------------------
// PAYLOAD INTERFACES
// -------------------------------------------------------------

export interface SubmitCasePayload {
  source_order_kind: "GOODS" | "SERVICE";
  source_order_id: string;
  case_type: "GOODS_WARRANTY" | "SERVICE_WARRANTY" | "GOODS_RETURN";
  initial_solution: "REPLACEMENT" | "REWORK" | "REFUND";
  reason_code: string;
  description: string;
  items?: Array<{
    order_item_id?: string;
    quantity?: number;
    catalog_snapshot?: Record<string, any>;
  }>;
  entitlement_id?: string | null;
  source_merchant_order_id?: string | null;
  owner_org_id?: string | null;
  owner_org_type?: "MERCHANT" | "PROVIDER" | null;
  evidence_data?: Array<{
    media_ref: string;
    content_type?: string;
    size_bytes?: number;
  }>;
}

export interface SubmitReviewPayload {
  source_kind: "GOODS" | "SERVICE";
  source_order_id: string;
  source_merchant_order_id?: string | null;
  ratings: Array<{
    target_type: "PRODUCT" | "SERVICE" | "MERCHANT" | "PROVIDER";
    target_id: string;
    rating: number; // 1-5
    text?: string;
    source_item_key?: string;
    media_refs?: string[];
  }>;
}

export interface CreateWarrantyOptionPayload {
  name: string;
  duration_days: number;
  coverage_text: string;
  exclusion_text?: string;
}

export interface UpdateWarrantyOptionPayload {
  name: string;
  duration_days: number;
  coverage_text: string;
  exclusion_text?: string;
}

export interface BusinessDecisionPayload {
  action: "ACCEPT_INITIAL" | "REJECT_WITH_REASON" | "PROPOSE_ALTERNATIVE" | "REQUEST_EVIDENCE";
  alternative_solution?: "REPLACEMENT" | "REWORK" | "REFUND" | "REPAIR_GOODS";
  reason?: string;
  case_version?: number;
}

export interface ReturnShipmentPayload {
  courier_name: string;
  tracking_number?: string;
  shipped_at?: string;
  shipping_fee_paid_idr?: number;
  shipping_receipt_ref?: string;
  fee_payment_proof_ref?: string;
  customer_notes?: string;
}

export interface ReturnInstructionsPayload {
  requires_physical_return: boolean;
  no_return_reason?: string;
  recipient_name?: string;
  recipient_phone?: string;
  return_address?: string;
  packaging_instructions?: string;
  shipping_fee_payer?: "MERCHANT" | "CUSTOMER" | "THIRD_PARTY";
  shipping_fee_method?: string;
  reimbursement_instructions?: string;
  deadline_at?: string;
  merchant_notes?: string;
}

export interface ReturnReceiptPayload {
  received_at?: string;
  received_by?: string;
  quantity_received: number;
  package_condition: string;
  receipt_proof_ref?: string;
  receipt_notes?: string;
  status?: "RECEIVED" | "DISPUTED_NOT_RECEIVED";
  dispute_reason?: string;
}

export interface ReturnInspectionPayload {
  inspected_at?: string;
  inspected_by?: string;
  quantity_inspected: number;
  quantity_approved: number;
  item_condition: string;
  is_sku_matched?: boolean;
  is_issue_matched?: boolean;
  is_components_complete?: boolean;
  inspection_outcome: "MATCHED" | "PARTIAL" | "MISMATCH";
  inspection_notes?: string;
  evidence_refs?: string[];
}

// -------------------------------------------------------------
// NORMALIZERS (Transport -> Domain Schema)
// -------------------------------------------------------------

export function normalizeWarrantyOptionDto(raw: any): WarrantyOption {
  if (!raw || typeof raw !== "object") return raw;
  const lv = raw.latest_version || raw.latestVersion || null;
  return {
    ...raw,
    name: lv?.name ?? raw.name ?? "Garansi",
    duration_days: Number(lv?.duration_days ?? raw.duration_days ?? 0),
    coverage_text: lv?.coverage_text ?? raw.coverage_text ?? "",
    exclusion_text: lv?.exclusion_text ?? raw.exclusion_text ?? null,
    version: Number(lv?.version_no ?? raw.version ?? 1),
    latest_version: lv,
  };
}

export function normalizeWarrantyEntitlementDto(raw: any): OrderWarrantyEntitlement {
  if (!raw || typeof raw !== "object") return raw;
  const sourceOrderKind = (raw.source_order_kind || raw.source_kind || "GOODS") as "GOODS" | "SERVICE";
  const sourceOrderId = raw.source_order_id || raw.order_id || "";
  const sourceMerchantOrderId = raw.source_merchant_order_id ?? raw.merchant_order_id ?? null;
  const terms = raw.terms_snapshot || {
    name: raw.snapshot_name,
    duration_days: raw.snapshot_duration_days,
    coverage: raw.snapshot_coverage,
    coverage_text: raw.snapshot_coverage,
    exclusion: raw.snapshot_exclusion,
    exclusion_text: raw.snapshot_exclusion,
  };
  return {
    ...raw,
    source_kind: sourceOrderKind,
    source_order_kind: sourceOrderKind,
    order_id: sourceOrderId,
    source_order_id: sourceOrderId,
    merchant_order_id: sourceMerchantOrderId,
    source_merchant_order_id: sourceMerchantOrderId,
    source_item_id: raw.source_item_id ?? raw.order_item_key ?? null,
    product_id: raw.product_id ?? (sourceOrderKind === "GOODS" ? raw.catalog_ref : null) ?? null,
    service_id: raw.service_id ?? (sourceOrderKind === "SERVICE" ? raw.catalog_ref : null) ?? null,
    warranty_option_id: raw.warranty_option_id ?? raw.warranty_option_version_id ?? null,
    terms_snapshot: terms,
  };
}

export function normalizeReviewReplyDto(raw: any): ReviewReply | null {
  if (!raw || typeof raw !== "object") return null;
  const text = raw.text ?? raw.reply_text ?? "";
  return {
    ...raw,
    business_org_id: raw.business_org_id ?? raw.owner_org_id ?? "",
    actor_id: raw.actor_id ?? raw.replied_by ?? "",
    text,
    reply_text: text,
  };
}

export function normalizeReviewEntryDto(raw: any): ReviewEntry {
  if (!raw || typeof raw !== "object") return raw;
  const text = raw.text ?? raw.review_text ?? null;
  const reply = normalizeReviewReplyDto(raw.reply);
  const sub = raw.submission;
  return {
    ...raw,
    review_submission_id: raw.review_submission_id ?? raw.submission_id ?? "",
    text,
    review_text: text,
    reply,
    ordered_at: raw.ordered_at ?? sub?.ordered_at ?? sub?.created_at ?? null,
    customer_display_name: raw.customer_display_name ?? sub?.customer_display_name ?? null,
    source_order_id: raw.source_order_id ?? sub?.source_order_id ?? null,
    source_merchant_order_id: raw.source_merchant_order_id ?? sub?.source_merchant_order_id ?? null,
    source_kind: raw.source_kind ?? sub?.source_kind ?? null,
  };
}

export function normalizeReviewSubmissionDto(raw: any): ReviewSubmission | null {
  if (!raw || typeof raw !== "object") return null;
  const entries = Array.isArray(raw.entries) ? raw.entries.map(normalizeReviewEntryDto) : [];
  return {
    ...raw,
    entries,
    ordered_at: raw.ordered_at ?? entries[0]?.ordered_at ?? raw.created_at ?? null,
    customer_display_name: raw.customer_display_name ?? entries[0]?.customer_display_name ?? null,
  };
}

const publicCatalogMethods = {
  async getProductReviews(productId: string, params?: { per_page?: number; page?: number }) {
    const q = new URLSearchParams();
    if (params?.per_page) q.set("per_page", String(params.per_page));
    if (params?.page) q.set("page", String(params.page));
    const qs = q.toString() ? `?${q.toString()}` : "";
    const res = await apiFetch<ReviewEntry[]>(`/after-sales/catalog/products/${productId}/reviews${qs}`);
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.map(normalizeReviewEntryDto);
    }
    return res;
  },

  async getServiceReviews(serviceId: string, params?: { per_page?: number; page?: number }) {
    const q = new URLSearchParams();
    if (params?.per_page) q.set("per_page", String(params.per_page));
    if (params?.page) q.set("page", String(params.page));
    const qs = q.toString() ? `?${q.toString()}` : "";
    const res = await apiFetch<ReviewEntry[]>(`/after-sales/catalog/services/${serviceId}/reviews${qs}`);
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.map(normalizeReviewEntryDto);
    }
    return res;
  },

  async getBatchRatingsSummary(
    targetType: "PRODUCT" | "SERVICE" | "MERCHANT" | "PROVIDER",
    targetIds: string[]
  ) {
    const clean = Array.from(new Set(targetIds.map((id) => id.trim()).filter(Boolean)));
    if (clean.length === 0) {
      return { success: true, data: {} as Record<string, CatalogRatingSummaryItem> };
    }
    const q = new URLSearchParams({
      target_type: targetType,
      target_ids: clean.join(","),
    });
    return apiFetch<Record<string, CatalogRatingSummaryItem>>(
      `/after-sales/catalog/ratings/summary?${q.toString()}`
    );
  },

  async getBusinessReputation(type: "MERCHANT" | "PROVIDER", orgId: string) {
    const res = await apiFetch<BusinessReputation>(`/after-sales/businesses/${type}/${orgId}/reputation`);
    if (res.success && res.data) {
      res.data = {
        ...res.data,
        type,
        org_id: orgId,
        rating_distribution: res.data.rating_distribution ?? res.data.distribution ?? {},
      };
    }
    return res;
  },

  async getBusinessReviews(
    type: "MERCHANT" | "PROVIDER",
    orgId: string,
    params?: { per_page?: number; page?: number }
  ) {
    const q = new URLSearchParams();
    if (params?.per_page) q.set("per_page", String(params.per_page));
    if (params?.page) q.set("page", String(params.page));
    const qs = q.toString() ? `?${q.toString()}` : "";
    const res = await apiFetch<ReviewEntry[]>(`/after-sales/businesses/${type}/${orgId}/reviews${qs}`);
    if (res.success && Array.isArray(res.data)) {
      res.data = res.data.map(normalizeReviewEntryDto);
    }
    return res;
  },
};

// -------------------------------------------------------------
// AFTER-SALES API CLIENT
// -------------------------------------------------------------

export const afterSalesApi = {
  // ===========================================================
  // PUBLIC STOREFRONT & CATALOG APIS
  // ===========================================================
  public: publicCatalogMethods,
  publicCatalog: publicCatalogMethods,

  // ===========================================================
  // CUSTOMER APIS
  // ===========================================================
  customer: {
    // Warranties
    async getWarranties(params?: {
      state?: "active" | "expired";
      type?: "goods" | "service";
      per_page?: number;
      page?: number;
    }) {
      const q = new URLSearchParams();
      if (params?.state) q.set("state", params.state);
      if (params?.type) q.set("type", params.type);
      if (params?.per_page) q.set("per_page", String(params.per_page));
      if (params?.page) q.set("page", String(params.page));
      const qs = q.toString() ? `?${q.toString()}` : "";
      const res = await apiFetch<OrderWarrantyEntitlement[]>(`/after-sales/warranties${qs}`);
      if (res.success && Array.isArray(res.data)) {
        res.data = res.data.map(normalizeWarrantyEntitlementDto);
      }
      return res;
    },

    async getWarrantyDetail(id: string) {
      const res = await apiFetch<OrderWarrantyEntitlement>(`/after-sales/warranties/${id}`);
      if (res.success && res.data) {
        res.data = normalizeWarrantyEntitlementDto(res.data);
      }
      return res;
    },

    // Cases
    async getCases(params?: {
      type?: string;
      status?: string;
      per_page?: number;
      page?: number;
    }) {
      const q = new URLSearchParams();
      if (params?.type && params.type !== "ALL") q.set("type", params.type);
      if (params?.status && params.status !== "ALL") q.set("status", params.status);
      if (params?.per_page) q.set("per_page", String(params.per_page));
      if (params?.page) q.set("page", String(params.page));
      const qs = q.toString() ? `?${q.toString()}` : "";
      return apiFetch<AfterSalesCase[]>(`/after-sales/cases${qs}`);
    },

    async getCaseDetail(id: string) {
      return apiFetch<AfterSalesCase>(`/after-sales/cases/${id}`);
    },

    async submitCase(payload: SubmitCasePayload) {
      return apiFetch<AfterSalesCase>("/after-sales/cases", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async addEvidence(
      caseId: string,
      payload: {
        media_ref: string;
        content_type?: string;
        size_bytes?: number;
        sha256?: string;
      }
    ) {
      return apiFetch<CaseEvidence>(`/after-sales/cases/${caseId}/evidence`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async submitConsent(
      caseId: string,
      proposalId: string,
      decision: "ACCEPT" | "DECLINE",
      reason?: string
    ) {
      return apiFetch<AfterSalesCase>(
        `/after-sales/cases/${caseId}/solutions/${proposalId}/decision`,
        {
          method: "POST",
          body: JSON.stringify({ decision, reason }),
        }
      );
    },

    async reportIssue(caseId: string, reason: string) {
      return apiFetch<AfterSalesCase & { message?: string; substate?: string; support_ticket_ref?: string | null }>(
        `/after-sales/cases/${caseId}/report-issue`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        }
      );
    },

    async submitReturnShipment(caseId: string, payload: ReturnShipmentPayload) {
      return apiFetch<AfterSalesCase>(`/after-sales/cases/${caseId}/return-shipment`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async confirmCompletion(caseId: string, payload?: { notes?: string; rating?: number }) {
      return apiFetch<AfterSalesCase>(`/after-sales/cases/${caseId}/confirm-completion`, {
        method: "POST",
        body: JSON.stringify(payload || {}),
      });
    },

    // Reviews
    async submitReview(payload: SubmitReviewPayload) {
      const res = await apiFetch<ReviewSubmission>("/after-sales/reviews", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.success && res.data) {
        res.data = normalizeReviewSubmissionDto(res.data)!;
      }
      return res;
    },

    async getMyReview(orderId: string, subOrderId?: string) {
      const q = new URLSearchParams({ order_id: orderId });
      if (subOrderId) q.set("sub_order_id", subOrderId);
      const res = await apiFetch<ReviewSubmission | null>(`/after-sales/reviews/my?${q.toString()}`);
      if (res.success && res.data) {
        res.data = normalizeReviewSubmissionDto(res.data);
      }
      return res;
    },

    async getMyReviewsList(orderIds?: string[]) {
      const q = new URLSearchParams();
      if (orderIds && orderIds.length > 0) {
        q.set("order_ids", orderIds.join(","));
      }
      const qs = q.toString() ? `?${q.toString()}` : "";
      const res = await apiFetch<ReviewSubmission[]>(`/after-sales/reviews/my${qs}`);
      if (res.success && Array.isArray(res.data)) {
        res.data = res.data
          .map(normalizeReviewSubmissionDto)
          .filter((item): item is ReviewSubmission => item !== null);
      }
      return res;
    },
  },

  // ===========================================================
  // BUSINESS APIS (MERCHANT & PROVIDER)
  // ===========================================================
  business: {
    // Warranty Options
    async getWarrantyOptions(headers?: Record<string, string>) {
      const res = await apiFetch<WarrantyOption[]>("/after-sales/business/warranty-options", {
        headers,
      });
      if (res.success && Array.isArray(res.data)) {
        res.data = res.data.map(normalizeWarrantyOptionDto);
      }
      return res;
    },

    async createWarrantyOption(payload: CreateWarrantyOptionPayload, headers?: Record<string, string>) {
      const res = await apiFetch<WarrantyOption>("/after-sales/business/warranty-options", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (res.success && res.data) {
        res.data = normalizeWarrantyOptionDto(res.data);
      }
      return res;
    },

    async getWarrantyOptionDetail(id: string, headers?: Record<string, string>) {
      const res = await apiFetch<WarrantyOption>(`/after-sales/business/warranty-options/${id}`, {
        headers,
      });
      if (res.success && res.data) {
        res.data = normalizeWarrantyOptionDto(res.data);
      }
      return res;
    },

    async updateWarrantyOption(id: string, payload: UpdateWarrantyOptionPayload, headers?: Record<string, string>) {
      const res = await apiFetch<WarrantyOption>(`/after-sales/business/warranty-options/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });
      if (res.success && res.data) {
        res.data = normalizeWarrantyOptionDto(res.data);
      }
      return res;
    },

    async toggleWarrantyOptionStatus(id: string, headers?: Record<string, string>) {
      const res = await apiFetch<WarrantyOption>(`/after-sales/business/warranty-options/${id}/toggle-status`, {
        method: "POST",
        headers,
      });
      if (res.success && res.data) {
        res.data = normalizeWarrantyOptionDto(res.data);
      }
      return res;
    },

    // Cases
    async getCases(params?: {
      type?: string;
      status?: string;
      per_page?: number;
      page?: number;
    }) {
      const q = new URLSearchParams();
      if (params?.type && params.type !== "ALL") q.set("type", params.type);
      if (params?.status && params.status !== "ALL") q.set("status", params.status);
      if (params?.per_page) q.set("per_page", String(params.per_page));
      if (params?.page) q.set("page", String(params.page));
      const qs = q.toString() ? `?${q.toString()}` : "";
      return apiFetch<AfterSalesCase[]>(`/after-sales/business/cases${qs}`);
    },

    async getCaseDetail(id: string) {
      return apiFetch<AfterSalesCase>(`/after-sales/business/cases/${id}`);
    },

    async makeDecision(caseId: string, payload: BusinessDecisionPayload) {
      return apiFetch<AfterSalesCase>(`/after-sales/business/cases/${caseId}/decision`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async saveReturnInstructions(caseId: string, payload: ReturnInstructionsPayload) {
      return apiFetch<AfterSalesCase>(`/after-sales/business/cases/${caseId}/return-instructions`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async confirmReturnReceipt(caseId: string, payload: ReturnReceiptPayload) {
      return apiFetch<AfterSalesCase>(`/after-sales/business/cases/${caseId}/return-receipt`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async submitReturnInspection(caseId: string, payload: ReturnInspectionPayload) {
      return apiFetch<AfterSalesCase>(`/after-sales/business/cases/${caseId}/return-inspection`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async startResolution(caseId: string) {
      return apiFetch<CaseResolution>(`/after-sales/business/cases/${caseId}/resolution-action`, {
        method: "POST",
      });
    },

    async shipReplacement(
      caseId: string,
      payload: {
        shipping_method?: "GOSEND" | "KURIR_TOKO";
        courier_name: string;
        driver_name?: string;
        driver_phone?: string;
        tracking_number?: string;
        tracking_url?: string;
        notes?: string;
      }
    ) {
      return apiFetch<AfterSalesCase>(`/after-sales/business/cases/${caseId}/replacement-shipment`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async completeCase(caseId: string, evidenceRef: string) {
      return apiFetch<AfterSalesCase>(`/after-sales/business/cases/${caseId}/complete`, {
        method: "POST",
        body: JSON.stringify({ evidence_ref: evidenceRef }),
      });
    },

    // Reviews
    async getReviews(params?: { per_page?: number; page?: number }) {
      const q = new URLSearchParams();
      if (params?.per_page) q.set("per_page", String(params.per_page));
      if (params?.page) q.set("page", String(params.page));
      const qs = q.toString() ? `?${q.toString()}` : "";
      const res = await apiFetch<ReviewEntry[]>(`/after-sales/business/reviews${qs}`);
      if (res.success && Array.isArray(res.data)) {
        res.data = res.data.map(normalizeReviewEntryDto);
      }
      return res;
    },

    async replyReview(reviewEntryId: string, payloadOrText: string | { text: string }) {
      const text = typeof payloadOrText === "string" ? payloadOrText : payloadOrText.text;
      const res = await apiFetch<ReviewReply>(`/after-sales/business/reviews/${reviewEntryId}/reply`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      if (res.success && res.data) {
        res.data = normalizeReviewReplyDto(res.data)!;
      }
      return res;
    },
  },

  // ===========================================================
  // ADMIN OPERATIONS APIS
  // ===========================================================
  admin: {
    async getCases(params?: {
      type?: string;
      status?: string;
      response_state?: string;
      per_page?: number;
      page?: number;
    }) {
      const q = new URLSearchParams();
      if (params?.type && params.type !== "ALL") q.set("type", params.type);
      if (params?.status && params.status !== "ALL") q.set("status", params.status);
      if (params?.response_state && params.response_state !== "ALL") q.set("response_state", params.response_state);
      if (params?.per_page) q.set("per_page", String(params.per_page));
      if (params?.page) q.set("page", String(params.page));
      const qs = q.toString() ? `?${q.toString()}` : "";
      return apiFetch<AfterSalesCase[]>(`/after-sales/admin/cases${qs}`);
    },

    async getReviews(params?: { status?: string; per_page?: number; page?: number }) {
      const q = new URLSearchParams();
      if (params?.status && params.status !== "ALL") q.set("status", params.status);
      if (params?.per_page) q.set("per_page", String(params.per_page));
      if (params?.page) q.set("page", String(params.page));
      const qs = q.toString() ? `?${q.toString()}` : "";
      const res = await apiFetch<ReviewEntry[]>(`/after-sales/admin/reviews${qs}`);
      if (res.success && Array.isArray(res.data)) {
        res.data = res.data.map(normalizeReviewEntryDto);
      }
      return res;
    },

    async moderateReview(reviewId: string, action: "HIDE" | "RESTORE", reason: string) {
      return apiFetch<{ review_entry_id: string; status: string }>(
        `/after-sales/admin/reviews/${reviewId}/moderate`,
        {
          method: "POST",
          body: JSON.stringify({ action, reason }),
        }
      );
    },
  },
};

