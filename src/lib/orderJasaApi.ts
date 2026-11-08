/**
 * SERVIO MODUL 05B - ORDER JASA API CLIENT
 * Connects directly to backend/services/order-jasa-service (Port 8007)
 * Prefix: /api/v1/order-jasa
 */

import { apiFetch, ApiResponse } from "./servioApi";

// -------------------------------------------------------------
// DTOs & TYPES
// -------------------------------------------------------------

export interface BackendCustomerOrder {
  id: string;
  order_no: string;
  customer_id: string;
  provider_org_id: string;
  service_offering_id: string;
  service_snapshot?: {
    id?: string;
    title?: string;
    name?: string;
    categoryName?: string;
    thumbnailUrl?: string;
    priceModel?: string;
    basePrice?: number;
    diagnosisFee?: number;
  };
  recipient_snapshot?: {
    recipient_name?: string;
    recipientName?: string;
    phone?: string;
  };
  address_snapshot?: {
    street?: string;
    addressLine?: string;
    fullAddress?: string;
    city?: string;
    notes?: string;
  };
  complaint_text: string;
  symptoms?: string[];
  customer_media_refs?: string[];
  diagnosis_fee_idr: number;
  diagnosis_fee_exemption_type?: string | null;
  status: string;
  phase: string;
  cancel_reason_code?: string | null;
  original_order_id?: string | null;
  version: number;
  schedule?: {
    start_at?: string;
    end_at?: string;
    timezone?: string;
    status?: string;
  } | null;
  assigned_worker?: {
    worker_id: string;
    status: string;
    accepted_at?: string;
    membership_snapshot?: {
      name?: string;
      phone?: string;
      photo?: string;
      rating?: number;
    };
  } | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackendProviderOrder extends BackendCustomerOrder {
  active_assignment?: {
    assignment_id: string;
    worker_id: string;
    status: string;
    assigned_at: string;
    response_due_at: string;
  };
}

export interface BackendWorkerTask {
  assignment_id: string;
  attempt_no: number;
  worker_id: string;
  provider_org_id: string;
  status: "ASSIGNED" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  assigned_at: string;
  response_due_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  order?: {
    id: string;
    order_no: string;
    service_snapshot?: any;
    recipient_snapshot?: any;
    address_snapshot?: any;
    complaint_text: string;
    symptoms?: string[];
    status: string;
    phase: string;
  };
  schedule?: {
    start_at?: string;
    end_at?: string;
    timezone?: string;
  };
  visit?: {
    status: string;
    otw_at?: string;
    arrived_at?: string;
  };
}

export interface BackendPaymentObligation {
  id: string;
  purpose: "DIAGNOSIS" | "SERVICE_EXECUTION";
  state: "UNBILLED" | "INVOICE_PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  principal_idr: number;
  paid_at?: string;
  active_finance_payment_id?: string;
  attempts?: Array<{
    id: string;
    attempt_no: number;
    amount_due_idr: number;
    reported_status: string;
    is_current: boolean;
    finance_payment_id?: string;
    finance_invoice_ref?: string;
    expires_at?: string;
  }>;
}

export interface BackendOrderTimelineEvent {
  sequence_no: number;
  event_type: string;
  from_status: string;
  to_status: string;
  actor_role: string;
  occurred_at: string;
}

export interface BackendAdminAggregates {
  total_orders: number;
  active_in_progress: number;
  completed: number;
  cancelled: number;
}

// -------------------------------------------------------------
// CLIENT IMPLEMENTATION
// -------------------------------------------------------------

export const orderJasaApi = {
  // -----------------------------------------------------------
  // 1. CUSTOMER ENDPOINTS
  // -----------------------------------------------------------
  async listCustomerOrders(params?: { status?: string; page?: number; per_page?: number }): Promise<ApiResponse<BackendCustomerOrder[]>> {
    const q = new URLSearchParams();
    if (params?.status && params.status !== "ALL") q.append("status", params.status);
    if (params?.page) q.append("page", String(params.page));
    if (params?.per_page) q.append("per_page", String(params.per_page));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiFetch<BackendCustomerOrder[]>(`/order-jasa/orders${qs}`);
  },

  async getCustomerOrder(id: string): Promise<ApiResponse<BackendCustomerOrder>> {
    return apiFetch<BackendCustomerOrder>(`/order-jasa/orders/${id}`);
  },

  async getCustomerOrderTimeline(id: string): Promise<ApiResponse<{ order_id: string; order_no: string; timeline: BackendOrderTimelineEvent[] }>> {
    return apiFetch<{ order_id: string; order_no: string; timeline: BackendOrderTimelineEvent[] }>(`/order-jasa/orders/${id}/timeline`);
  },

  async getCustomerOrderPayments(id: string): Promise<ApiResponse<{ order_id: string; order_no: string; obligations: BackendPaymentObligation[] }>> {
    return apiFetch<{ order_id: string; order_no: string; obligations: BackendPaymentObligation[] }>(`/order-jasa/orders/${id}/payments`);
  },

  async createBooking(payload: {
    service_offering_id: string;
    address_id: string;
    scheduled_start_at: string;
    scheduled_end_at?: string;
    complaint_text: string;
    symptoms_json?: string[];
    customer_media_refs?: string[];
    slot_reference?: string;
    payment_method?: string;
  }): Promise<ApiResponse<BackendCustomerOrder>> {
    return apiFetch<BackendCustomerOrder>("/order-jasa/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async retryPayment(orderId: string): Promise<ApiResponse<{ obligation_id: string; attempt_no: number; finance_payment_id: string }>> {
    return apiFetch<{ obligation_id: string; attempt_no: number; finance_payment_id: string }>(`/order-jasa/orders/${orderId}/payments/retry`, {
      method: "POST",
    });
  },

  async submitConsent(
    orderId: string,
    payload: {
      diagnosis_version_id?: string;
      method: "CUSTOMER_REMOTE" | "WORKER_RECORDED_IN_PERSON";
      decision: "APPROVED" | "REJECTED";
      statement_acknowledged: boolean;
      customer_present_reported?: boolean;
      notes?: string;
    }
  ): Promise<ApiResponse<any>> {
    return apiFetch(`/order-jasa/orders/${orderId}/consent`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async completeOrder(orderId: string): Promise<ApiResponse<any>> {
    return apiFetch(`/order-jasa/orders/${orderId}/complete`, {
      method: "POST",
    });
  },

  async cancelOrder(orderId: string, reason: string): Promise<ApiResponse<any>> {
    return apiFetch(`/order-jasa/orders/${orderId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async raiseCustomerIssue(
    orderId: string,
    payload: { issue_type: string; description: string; photo_refs?: string[] }
  ): Promise<ApiResponse<any>> {
    return apiFetch(`/order-jasa/orders/${orderId}/issues`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // -----------------------------------------------------------
  // 2. PROVIDER ENDPOINTS
  // -----------------------------------------------------------
  async listProviderOrders(params?: { status?: string; page?: number; per_page?: number }): Promise<ApiResponse<BackendProviderOrder[]>> {
    const q = new URLSearchParams();
    if (params?.status && params.status !== "ALL") q.append("status", params.status);
    if (params?.page) q.append("page", String(params.page));
    if (params?.per_page) q.append("per_page", String(params.per_page));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiFetch<BackendProviderOrder[]>(`/order-jasa/provider/orders${qs}`);
  },

  async getTechnicianRecap(params?: { month?: number; year?: number; search?: string }): Promise<ApiResponse<any>> {
    const q = new URLSearchParams();
    if (params?.month) q.append("month", String(params.month));
    if (params?.year) q.append("year", String(params.year));
    if (params?.search) q.append("search", params.search);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiFetch<any>(`/order-jasa/provider/technician-recap${qs}`);
  },

  async getProviderOrder(id: string): Promise<ApiResponse<BackendProviderOrder>> {
    return apiFetch<BackendProviderOrder>(`/order-jasa/provider/orders/${id}`);
  },

  async acceptOrder(orderId: string): Promise<ApiResponse<BackendProviderOrder>> {
    return apiFetch<BackendProviderOrder>(`/order-jasa/provider/orders/${orderId}/accept`, {
      method: "POST",
    });
  },

  async rejectOrder(orderId: string, reason: string): Promise<ApiResponse<BackendProviderOrder>> {
    return apiFetch<BackendProviderOrder>(`/order-jasa/provider/orders/${orderId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async assignWorker(
    orderId: string,
    payload: { worker_id: string; notes?: string }
  ): Promise<ApiResponse<{ attempt_id: string; worker_id: string; status: string }>> {
    return apiFetch<{ attempt_id: string; worker_id: string; status: string }>(`/order-jasa/provider/orders/${orderId}/assign`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // -----------------------------------------------------------
  // 3. WORKER ENDPOINTS
  // -----------------------------------------------------------
  async listWorkerTasks(params?: { status?: string; page?: number; per_page?: number }): Promise<ApiResponse<BackendWorkerTask[]>> {
    const q = new URLSearchParams();
    if (params?.status && params.status !== "ALL") q.append("status", params.status);
    if (params?.page) q.append("page", String(params.page));
    if (params?.per_page) q.append("per_page", String(params.per_page));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiFetch<BackendWorkerTask[]>(`/order-jasa/worker/tasks${qs}`);
  },

  async getWorkerTask(assignmentId: string): Promise<ApiResponse<BackendWorkerTask>> {
    return apiFetch<BackendWorkerTask>(`/order-jasa/worker/tasks/${assignmentId}`);
  },

  async respondTask(
    assignmentId: string,
    payload: { decision: "ACCEPT" | "REJECT"; reason?: string }
  ): Promise<ApiResponse<{ status: string }>> {
    return apiFetch<{ status: string }>(`/order-jasa/worker/tasks/${assignmentId}/respond`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateVisit(
    assignmentId: string,
    payload: { action: "OTW" | "ARRIVED" | "START_DIAGNOSIS" | "START_EXECUTION" }
  ): Promise<ApiResponse<{ visit_status: string }>> {
    return apiFetch<{ visit_status: string }>(`/order-jasa/worker/tasks/${assignmentId}/visit`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async submitDiagnosis(
    assignmentId: string,
    payload: {
      findings: string;
      suspected_cause?: string;
      root_cause?: string;
      action_plan?: string;
      recommended_actions?: string;
      work_items: Array<{
        item_name?: string;
        name?: string;
        quantity: number;
        unit_price_idr: number;
        total_price_idr?: number;
      }>;
      part_items?: Array<{
        part_name?: string;
        name?: string;
        part_source?: string;
        source?: string;
        quantity: number;
        unit_price_idr: number;
        total_price_idr?: number;
        availability_status?: string;
      }>;
      diagnosis_photos?: string[];
      diagnosis_photo_refs?: string[];
    }
  ): Promise<ApiResponse<{ diagnosis_version: { id: string; version_no: number } }>> {
    // Normalize field names for backend validator: item_name -> item_name, part_source -> part_source
    const normalizedWorkItems = payload.work_items.map((w) => ({
      item_name: w.item_name || w.name || "Pekerjaan Servis",
      quantity: Number(w.quantity) || 1,
      unit_price_idr: Number(w.unit_price_idr) || 0,
      total_price_idr: (Number(w.quantity) || 1) * (Number(w.unit_price_idr) || 0),
    }));

    const normalizedPartItems = (payload.part_items || []).map((p) => ({
      part_name: p.part_name || p.name || "Suku Cadang",
      part_source: p.part_source || p.source || "PROVIDER_SUPPLIED",
      quantity: Number(p.quantity) || 1,
      unit_price_idr: Number(p.unit_price_idr) || 0,
      total_price_idr: (Number(p.quantity) || 1) * (Number(p.unit_price_idr) || 0),
      availability_status: p.availability_status || "IN_STOCK",
    }));

    const photos = payload.diagnosis_photo_refs || payload.diagnosis_photos || [];

    return apiFetch(`/order-jasa/worker/tasks/${assignmentId}/diagnosis`, {
      method: "POST",
      body: JSON.stringify({
        findings: payload.findings,
        suspected_cause: payload.suspected_cause || payload.root_cause || "",
        root_cause: payload.root_cause || payload.suspected_cause || "",
        action_plan: payload.action_plan || payload.recommended_actions || payload.findings,
        recommended_actions: payload.recommended_actions || payload.action_plan || "",
        work_items: normalizedWorkItems,
        part_items: normalizedPartItems,
        diagnosis_photos: photos,
        diagnosis_photo_refs: photos,
      }),
    });
  },

  async finishExecution(
    assignmentId: string,
    payload: {
      summary: string;
      test_result: string;
      evidence: Array<{
        evidence_type: "BEFORE" | "AFTER";
        media_reference: string;
        sha256?: string;
      }>;
    }
  ): Promise<ApiResponse<any>> {
    return apiFetch(`/order-jasa/worker/tasks/${assignmentId}/execution/finish`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async closeVisit(assignmentId: string, payload: { reason: string }): Promise<ApiResponse<any>> {
    return apiFetch(`/order-jasa/worker/tasks/${assignmentId}/visit/close`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async raiseWorkerIssue(
    assignmentId: string,
    payload: { issue_type: string; description: string; photo_refs?: string[] }
  ): Promise<ApiResponse<any>> {
    return apiFetch(`/order-jasa/worker/tasks/${assignmentId}/issues`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // -----------------------------------------------------------
  // 4. ADMIN OPERATIONS ENDPOINTS
  // -----------------------------------------------------------
  async getAdminAggregates(): Promise<ApiResponse<BackendAdminAggregates>> {
    return apiFetch<BackendAdminAggregates>("/order-jasa/admin/orders/aggregates");
  },

  async listAdminOrders(params?: {
    status?: string;
    phase?: string;
    provider_org_id?: string;
    q?: string;
    page?: number;
    per_page?: number;
  }): Promise<ApiResponse<BackendCustomerOrder[]>> {
    const q = new URLSearchParams();
    if (params?.status && params.status !== "ALL") q.append("status", params.status);
    if (params?.phase && params.phase !== "ALL") q.append("phase", params.phase);
    if (params?.provider_org_id) q.append("provider_org_id", params.provider_org_id);
    if (params?.q) q.append("q", params.q);
    if (params?.page) q.append("page", String(params.page));
    if (params?.per_page) q.append("per_page", String(params.per_page));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiFetch<BackendCustomerOrder[]>(`/order-jasa/admin/orders${qs}`);
  },

  async getAdminOrder(id: string): Promise<ApiResponse<BackendCustomerOrder>> {
    return apiFetch<BackendCustomerOrder>(`/order-jasa/admin/orders/${id}`);
  },

  async resolveAdminIssue(issueId: string, payload: { resolution_code: string; notes?: string }): Promise<ApiResponse<any>> {
    return apiFetch(`/order-jasa/admin/issues/${issueId}/resolve`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // -----------------------------------------------------------
  // 5. FINANCE 06 INTEGRATION HELPERS
  // -----------------------------------------------------------
  async simulatePayment(paymentId: string, amountIdr: number = 50000): Promise<ApiResponse<any>> {
    return apiFetch(`/finance/demo/payments/${paymentId}/simulate`, {
      method: "POST",
      headers: {
        "X-Actor-User-Id": "6c56abab-fb6c-4735-9d58-cd1b0ed10617",
        "X-Actor-Role": "FINANCE_PAYMENT_OPS",
        "X-Gateway-Key": "servio_local_gateway_key_2026",
      },
      body: JSON.stringify({
        outcome: "PAID",
        provider_event_id: `SIM-FE-${Date.now()}`,
        reported_amount_idr: amountIdr,
      }),
    });
  },
};
