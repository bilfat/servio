import { OrderJasaRepository } from "./OrderJasaRepository";
import { ServiceOrder, BookingCreationInput, Diagnosis, FollowUpOrderDraft, TechnicianMonthlyRecapData } from "../types";
import { orderJasaApi } from "@/lib/orderJasaApi";
import { mapBackendOrderToServiceOrder, mapBackendWorkerTaskToServiceOrder } from "./orderJasaMapper";

/**
 * HttpOrderJasaRepository
 * Real HTTP implementation connected directly to Laravel Order Jasa Service (Port 8007)
 * and Finance Service (Port 8006).
 */
export class HttpOrderJasaRepository implements OrderJasaRepository {
  private inFlightList: Promise<ServiceOrder[]> | null = null;
  private inFlightGet: Map<string, Promise<ServiceOrder | undefined>> = new Map();

  async listOrders(force = false): Promise<ServiceOrder[]> {
    if (force) {
      this.inFlightList = null;
    }
    if (this.inFlightList) {
      return this.inFlightList;
    }
    this.inFlightList = this._executeListOrders().finally(() => {
      this.inFlightList = null;
    });
    return this.inFlightList;
  }

  private async _executeListOrders(): Promise<ServiceOrder[]> {
    try {
      const activeRoleCookie =
        typeof document !== "undefined"
          ? document.cookie
            .split("; ")
            .find((row) => row.startsWith("servio_active_role="))
            ?.split("=")[1]
          : null;
      const pathname = typeof window !== "undefined" ? window.location.pathname : "";

      // 1. Strict route-context priority:
      const isCustomerRoute =
        pathname.startsWith("/orders") ||
        pathname.startsWith("/bookings") ||
        pathname.startsWith("/services") ||
        pathname.startsWith("/checkout");

      const isWorkerRoute = pathname.startsWith("/worker");
      const isProviderRoute = pathname.startsWith("/provider");
      const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/ops");
      const isFinanceRoute = pathname.startsWith("/finance");

      // 2. Resolve target portal context
      const isWorker =
        isWorkerRoute ||
        (!isCustomerRoute && !isProviderRoute && !isAdminRoute && !isFinanceRoute &&
          (activeRoleCookie === "WORKER" || activeRoleCookie === "WORKER_TECHNICIAN"));

      const isProvider =
        isProviderRoute ||
        (!isCustomerRoute && !isWorkerRoute && !isAdminRoute && !isFinanceRoute &&
          (activeRoleCookie === "PROVIDER" || activeRoleCookie === "SERVICE_PROVIDER"));

      const isAdmin =
        isAdminRoute ||
        (!isCustomerRoute && !isWorkerRoute && !isProviderRoute && !isFinanceRoute &&
          (activeRoleCookie === "ADMIN_OPERATIONS" || activeRoleCookie === "SUPER_ADMIN" || activeRoleCookie === "ADMIN"));

      const isFinance =
        isFinanceRoute ||
        (!isCustomerRoute && !isWorkerRoute && !isProviderRoute && !isAdminRoute &&
          (activeRoleCookie === "FINANCE" || activeRoleCookie === "FINANCE_PAYMENT_OPS" || activeRoleCookie === "FINANCE_OPS"));

      if (isWorker) {
        const res = await orderJasaApi.listWorkerTasks({ per_page: 50 });
        const tasks = res.data || [];
        return tasks.map((t) => mapBackendWorkerTaskToServiceOrder(t));
      }

      if (isProvider) {
        const res = await orderJasaApi.listProviderOrders({ per_page: 50 });
        const backendOrders = res.data || [];
        return backendOrders.map((o) => mapBackendOrderToServiceOrder(o, (o as any).payment_obligations));
      }

      if (isAdmin || isFinance) {
        const res = await orderJasaApi.listAdminOrders({ per_page: 50 });
        const backendOrders = res.data || [];
        return backendOrders.map((o) => mapBackendOrderToServiceOrder(o, (o as any).payment_obligations));
      }

      const res = await orderJasaApi.listCustomerOrders({ per_page: 50 });
      const backendOrders = res.data || [];
      return backendOrders.map((o) => mapBackendOrderToServiceOrder(o, (o as any).payment_obligations));
    } catch (err) {
      console.warn("[HttpOrderJasaRepository] listOrders failed:", err);
      throw err;
    }
  }

  async getOrderById(id: string): Promise<ServiceOrder | undefined> {
    if (this.inFlightGet.has(id)) {
      return this.inFlightGet.get(id);
    }
    const promise = this._executeGetOrderById(id).finally(() => {
      this.inFlightGet.delete(id);
    });
    this.inFlightGet.set(id, promise);
    return promise;
  }

  private async _executeGetOrderById(id: string): Promise<ServiceOrder | undefined> {
    try {
      const pathname = typeof window !== "undefined" ? window.location.pathname : "";
      const isProviderRoute = pathname.startsWith("/provider");
      const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/ops");

      let backendOrder: any = null;
      if (isProviderRoute) {
        const res = await orderJasaApi.getProviderOrder(id).catch(() => null);
        backendOrder = res?.data;
      } else if (isAdminRoute) {
        const res = await orderJasaApi.getAdminOrder(id).catch(() => null);
        backendOrder = res?.data;
      }

      if (!backendOrder) {
        const res = await orderJasaApi.getCustomerOrder(id).catch(() => null);
        backendOrder = res?.data;
      }

      if (!backendOrder) {
        return undefined;
      }

      const obligations = backendOrder.payment_obligations || (backendOrder as any).obligations;
      return mapBackendOrderToServiceOrder(backendOrder, obligations);
    } catch (err) {
      console.warn(`[HttpOrderJasaRepository] getOrderById(${id}) failed:`, err);
      return undefined;
    }
  }

  async createBooking(input: BookingCreationInput): Promise<ServiceOrder> {
    const isUuid = (val?: string) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    const offeringId = isUuid(input.serviceId) ? input.serviceId : "6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd";
    const addressId = isUuid((input as any).addressId)
      ? (input as any).addressId
      : "01a155aa-cdf3-71fe-b02c-ebdc787daf4a";

    // Format scheduled_start_at properly using the chosen date and custom time
    const datePart = input.scheduledDate || new Date().toISOString().split("T")[0];
    let timePart = "10:00:00";
    if (input.scheduledTimeSlot) {
      const match = input.scheduledTimeSlot.match(/(\d{1,2}:\d{2})/);
      if (match) {
        timePart = `${match[1].length === 4 ? "0" + match[1] : match[1]}:00`;
      }
    }
    const scheduledStartAt = `${datePart} ${timePart}`;

    const res = await orderJasaApi.createBooking({
      service_offering_id: offeringId,
      address_id: addressId,
      scheduled_start_at: scheduledStartAt,
      complaint_text: input.complaintDescription || "Permohonan perbaikan jasa",
      symptoms_json: input.symptoms || ["Butuh pemeriksaan"],
      customer_media_refs: input.complaintPhotos || [],
      slot_reference: input.scheduledTimeSlot || "CUSTOM_CHOICE",
    });

    if (!res.data) {
      throw new Error(res.message || "Gagal membuat booking order jasa di backend.");
    }

    return mapBackendOrderToServiceOrder(res.data);
  }

  async cancelBooking(orderId: string, reason: string): Promise<boolean> {
    try {
      const res = await orderJasaApi.cancelOrder(orderId, reason);
      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] cancelBooking failed:`, err);
      throw err;
    }
  }

  async respondRemoteConsent(orderId: string, approve: boolean, notes?: string): Promise<boolean> {
    try {
      const res = await orderJasaApi.submitConsent(orderId, {
        method: "CUSTOMER_REMOTE",
        decision: approve ? "APPROVED" : "REJECTED",
        statement_acknowledged: true,
        notes,
      });
      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] respondRemoteConsent failed:`, err);
      throw err;
    }
  }

  async confirmCustomerCompleted(orderId: string): Promise<boolean> {
    try {
      const res = await orderJasaApi.completeOrder(orderId);
      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] confirmCustomerCompleted failed:`, err);
      throw err;
    }
  }

  async createFollowUpOrder(
    draft: FollowUpOrderDraft,
    scheduledDate: string,
    scheduledTimeSlot: string
  ): Promise<ServiceOrder> {
    const res = await orderJasaApi.createBooking({
      service_offering_id: draft.serviceId,
      address_id: "01a155aa-cdf3-71fe-b02c-ebdc787daf4a",
      scheduled_start_at: `${scheduledDate} 10:00:00`,
      complaint_text: `[Lanjutan Pesanan ${draft.originalOrderId}] ${draft.complaintSummary}`,
      symptoms_json: ["Lanjutan pemeriksaan sparepart"],
    });

    if (!res.data) {
      throw new Error(res.message || "Gagal membuat order lanjutan di backend.");
    }

    return mapBackendOrderToServiceOrder(res.data);
  }

  async acceptAssignment(assignmentId: string): Promise<boolean> {
    try {
      const res = await orderJasaApi.respondTask(assignmentId, { decision: "ACCEPT" });
      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] acceptAssignment failed:`, err);
      throw err;
    }
  }

  async rejectAssignment(assignmentId: string, reason: string): Promise<boolean> {
    try {
      const res = await orderJasaApi.respondTask(assignmentId, { decision: "REJECT", reason });
      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] rejectAssignment failed:`, err);
      throw err;
    }
  }

  async startTrip(assignmentId: string): Promise<boolean> {
    try {
      const res = await orderJasaApi.updateVisit(assignmentId, { action: "OTW" });
      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] startTrip failed:`, err);
      throw err;
    }
  }

  async arriveAtLocation(assignmentId: string): Promise<boolean> {
    try {
      const res = await orderJasaApi.updateVisit(assignmentId, { action: "ARRIVED" });
      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] arriveAtLocation failed:`, err);
      throw err;
    }
  }

  async submitDiagnosis(assignmentId: string, diagnosisInput: Partial<Diagnosis>): Promise<boolean> {
    try {
      const workItems = diagnosisInput.costBreakdown?.workItems || [
        {
          name: "Deep Cleaning & Cuci Kimia",
          quantity: 1,
          unit_price_idr: 100000,
        },
      ];

      const partItems = diagnosisInput.costBreakdown?.spareparts || [];

      const res = await orderJasaApi.submitDiagnosis(assignmentId, {
        findings: diagnosisInput.findings || "Hasil pemeriksaan teknisi di lokasi",
        action_plan: diagnosisInput.recommendedActions || "Pembersihan dan perbaikan komponen",
        work_items: workItems.map((w: any) => ({
          item_name: w.title || w.name,
          quantity: w.qty || w.quantity || 1,
          unit_price_idr: w.unitPrice || w.unit_price_idr || 100000,
          total_price_idr: w.subtotal || w.total_price_idr || 100000,
        })),
        part_items: partItems.map((p: any) => ({
          part_name: p.name,
          part_source: p.source || "PROVIDER_SUPPLIED",
          quantity: p.qty || p.quantity || 1,
          unit_price_idr: p.unitPrice || p.unit_price_idr || 50000,
          total_price_idr: p.subtotal || p.total_price_idr || 50000,
          availability_status: p.isAvailableForVisit === false ? "OUT_OF_STOCK" : "IN_STOCK",
        })),
      });

      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] submitDiagnosis failed:`, err);
      throw err;
    }
  }

  async recordInPersonConsent(orderId: string, notes?: string): Promise<boolean> {
    try {
      const res = await orderJasaApi.submitConsent(orderId, {
        method: "WORKER_RECORDED_IN_PERSON",
        decision: "APPROVED",
        statement_acknowledged: true,
        customer_present_reported: true,
        notes,
      });
      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] recordInPersonConsent failed:`, err);
      throw err;
    }
  }

  async startExecution(assignmentId: string): Promise<boolean> {
    try {
      const res = await orderJasaApi.updateVisit(assignmentId, { action: "START_DIAGNOSIS" });
      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] startExecution failed:`, err);
      throw err;
    }
  }

  async finishExecution(
    assignmentId: string,
    executionData: {
      beforePhotos: string[];
      afterPhotos: string[];
      workSummary: string;
      testResults: string;
      usedSpareparts?: string[];
      notes?: string;
    }
  ): Promise<boolean> {
    try {
      const res = await orderJasaApi.finishExecution(assignmentId, {
        summary: executionData.workSummary || "Pekerjaan servis telah selesai.",
        test_result: executionData.testResults || "Fungsi alat berjalan normal.",
        evidence: [
          {
            evidence_type: "BEFORE",
            media_reference:
              executionData.beforePhotos?.[0] || "https://img.servio.id/ev-before-v41.jpg",
          },
          {
            evidence_type: "AFTER",
            media_reference:
              executionData.afterPhotos?.[0] || "https://img.servio.id/ev-after-v41.jpg",
          },
        ],
      });
      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] finishExecution failed:`, err);
      throw err;
    }
  }

  async endVisit(assignmentId: string): Promise<boolean> {
    try {
      const res = await orderJasaApi.closeVisit(assignmentId, {
        reason: "PEKERJAAN_SELESAI_NORMAL",
      });
      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] endVisit failed:`, err);
      throw err;
    }
  }

  async reportPaymentIssue(assignmentId: string, issue: string): Promise<boolean> {
    try {
      const res = await orderJasaApi.raiseWorkerIssue(assignmentId, {
        issue_type: "PAYMENT_STUCK",
        description: issue,
      });
      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] reportPaymentIssue failed:`, err);
      throw err;
    }
  }

  async assignWorker(
    orderId: string,
    workerId: string,
    _workerName: string,
    _workerPhone: string
  ): Promise<boolean> {
    try {
      const res = await orderJasaApi.assignWorker(orderId, {
        worker_id: workerId,
        notes: "Ditugaskan melalui portal Provider SERVIO",
      });
      this.inFlightList = null;
      this.inFlightGet.delete(orderId);
      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] assignWorker failed:`, err);
      throw err;
    }
  }

  async getTechnicianRecap(
    month?: number,
    year?: number,
    search?: string
  ): Promise<TechnicianMonthlyRecapData> {
    try {
      const res = await orderJasaApi.getTechnicianRecap({ month, year, search });
      if (!res.success || !res.data) {
        throw new Error((res as any)?.error?.message || res.message || "Gagal memuat data rekap teknisi.");
      }
      return res.data;
    } catch (err) {
      console.error("[HttpOrderJasaRepository] getTechnicianRecap failed:", err);
      throw err;
    }
  }

  async simulateFinancePayment(
    invoiceNoOrPaymentId: string,
    _outcome: "PAID" | "FAILED" = "PAID",
    orderIdHint?: string,
    amountHint?: number
  ): Promise<boolean> {
    try {
      let paymentId = invoiceNoOrPaymentId;
      let reportedAmount: number | undefined = amountHint;

      const targetOrderId = orderIdHint;
      let matchedOrder: ServiceOrder | undefined;

      if (!targetOrderId) {
        const orders = await this.listOrders();
        matchedOrder = orders.find(
          (o) =>
            o.id === invoiceNoOrPaymentId ||
            o.orderNumber === invoiceNoOrPaymentId ||
            o.paymentSummary.diagnosisPayment?.invoiceNo === invoiceNoOrPaymentId ||
            o.paymentSummary.executionPayment?.invoiceNo === invoiceNoOrPaymentId
        );
      }

      const orderIdToQuery = targetOrderId || matchedOrder?.id;

      if (orderIdToQuery) {
        try {
          const paymentsRes = await orderJasaApi.getCustomerOrderPayments(orderIdToQuery);
          const obligations = paymentsRes.data?.obligations || [];
          const isExec = invoiceNoOrPaymentId.includes("EXEC");
          const targetObligation = isExec
            ? (obligations.find((ob) => ob.purpose === "SERVICE_EXECUTION") || obligations[0])
            : (obligations.find((ob) => ob.purpose === "DIAGNOSIS") || obligations[0]);

          const foundId =
            targetObligation?.active_finance_payment_id ||
            targetObligation?.attempts?.find((a) => a.is_current)?.finance_payment_id ||
            targetObligation?.attempts?.[0]?.finance_payment_id;

          if (foundId) {
            paymentId = foundId;
          }
          if (targetObligation?.principal_idr) {
            reportedAmount = targetObligation.principal_idr;
          }
        } catch (fetchErr) {
          console.warn("[HttpOrderJasaRepository] Could not resolve payment ID via order obligations:", fetchErr);
        }
      }

      const res = await orderJasaApi.simulatePayment(paymentId, reportedAmount);
      return res.success ?? true;
    } catch (err) {
      console.error(`[HttpOrderJasaRepository] simulateFinancePayment failed:`, err);
      throw err;
    }
  }

  async simulateReleaseFunds120h(_orderId: string): Promise<boolean> {
    return true;
  }

  async resetFixtures(): Promise<void> {
    // No-op for real backend
  }
}

export const httpOrderJasaRepository = new HttpOrderJasaRepository();
