import {
  ServiceOrder,
  ServiceOrderStatus,
  ServiceOrderSubStatus,
  ServiceOfferingSnapshot,
  ServiceAddressSnapshot,
  WorkerAssignment,
  Diagnosis,
  ServiceExecution,
  ServicePaymentSummary,
  ServiceWorkItem,
  SparepartItem,
} from "../types";
import { BackendCustomerOrder, BackendPaymentObligation, BackendOrderTimelineEvent, BackendWorkerTask } from "@/lib/orderJasaApi";
import { getStoredWorkerPhoto } from "@/features/worker/workerPhotoHelper";

export function mapBackendStatusToUi(backendStatus: string, cancelReason?: string | null): {
  status: ServiceOrderStatus;
  subStatus: ServiceOrderSubStatus;
} {
  switch (backendStatus) {
    case "PENDING_DIAGNOSIS_PAYMENT":
    case "CREATED":
      return { status: "PENDING_PAYMENT", subStatus: "DIAGNOSIS_PENDING" };
    case "PAID_WAITING_DISPATCH":
      return { status: "SCHEDULED", subStatus: "UNASSIGNED" };
    case "ASSIGNED_WAITING_WORKER":
    case "DISPATCHED_WAITING_ACCEPTANCE":
      return { status: "SCHEDULED", subStatus: "ASSIGNED_PENDING" };
    case "WORKER_ACCEPTED":
      return { status: "SCHEDULED", subStatus: "WORKER_ACCEPTED" };
    case "WORKER_ON_THE_WAY":
    case "WORKER_OTW":
      return { status: "IN_PROGRESS", subStatus: "WORKER_OTW" };
    case "WORKER_ARRIVED":
      return { status: "IN_PROGRESS", subStatus: "WORKER_ARRIVED" };
    case "DIAGNOSIS_IN_PROGRESS":
      return { status: "IN_PROGRESS", subStatus: "DIAGNOSING" };
    case "DIAGNOSIS_SUBMITTED":
      return { status: "IN_PROGRESS", subStatus: "WAITING_CUSTOMER_CONSENT" };
    case "PRICE_APPROVED":
    case "CONSENT_APPROVED":
    case "DIAGNOSIS_APPROVED":
      return { status: "IN_PROGRESS", subStatus: "PRICE_APPROVED" };
    case "EXECUTION_IN_PROGRESS":
      return { status: "IN_PROGRESS", subStatus: "EXECUTING" };
    case "WORKER_FINISHED":
    case "EXECUTION_FINISHED":
    case "PAYMENT_PENDING":
      return { status: "PENDING_PAYMENT", subStatus: "EXECUTION_PENDING" };
    case "PAYMENT_OVERDUE":
      return { status: "PENDING_PAYMENT", subStatus: "PAYMENT_OVERDUE" };
    case "EXECUTION_PAID":
    case "PAID_WAITING_COMPLETION":
      return { status: "IN_PROGRESS", subStatus: "WAITING_WORKER_CLOSE_VISIT" };
    case "VISIT_CLOSED":
      return { status: "IN_PROGRESS", subStatus: "VISIT_CLOSED" };
    case "AWAITING_CUSTOMER_CONFIRMATION":
      return { status: "IN_PROGRESS", subStatus: "AWAITING_CUSTOMER_CONFIRMATION" };
    case "COMPLETED":
      return { status: "COMPLETED", subStatus: "COMPLETED_NORMAL" };
    case "CANCELLED":
      if (cancelReason === "PROVIDER_REJECTED" || cancelReason === "PROVIDER_UNABLE") {
        return { status: "CANCELLED", subStatus: "CANCELLED_PROVIDER_REJECTED" };
      }
      if (cancelReason === "CUSTOMER_CANCEL_PRE_OTW") {
        return { status: "CANCELLED", subStatus: "CANCELLED_BEFORE_OTW" };
      }
      if (cancelReason === "DIAGNOSIS_PAYMENT_EXPIRED") {
        return { status: "CANCELLED", subStatus: "CANCELLED_DIAGNOSIS_UNPAID" };
      }
      if (cancelReason === "CUSTOMER_DECLINED_REPAIR" || cancelReason === "CUSTOMER_REJECTED_DIAGNOSIS") {
        return { status: "CANCELLED", subStatus: "CANCELLED_PRICE_REJECTED" };
      }
      if (cancelReason === "SPAREPART_UNAVAILABLE") {
        return { status: "CANCELLED", subStatus: "CANCELLED_SPAREPART_UNAVAILABLE" };
      }
      if (cancelReason === "CUSTOMER_REMOTE_NO_RESPONSE") {
        return { status: "CANCELLED", subStatus: "CANCELLED_REMOTE_TIMEOUT" };
      }
      return { status: "CANCELLED", subStatus: "CANCELLED_OPERATIONAL_FAILURE" };
    default:
      return { status: "SCHEDULED", subStatus: "UNASSIGNED" };
  }
}

export function mapBackendOrderToServiceOrder(
  backendOrder: BackendCustomerOrder,
  obligations?: BackendPaymentObligation[],
  timelineEvents?: BackendOrderTimelineEvent[]
): ServiceOrder {
  const { status, subStatus } = mapBackendStatusToUi(backendOrder.status, backendOrder.cancel_reason_code);

  const rawService = (backendOrder.service_snapshot || {}) as Record<string, any>;
  const isInvalidTitle = (t?: string) =>
    !t ||
    t.toLowerCase().includes("service offering") ||
    /[0-9a-f]{8}-[0-9a-f]{4}/i.test(t) ||
    t.length > 55;

  let resolvedTitle =
    rawService.title ||
    rawService.display_name ||
    rawService.name ||
    "Cuci dan Servis AC Split Bergaransi Mandiri Teknik";

  if (isInvalidTitle(resolvedTitle)) {
    const candidates = [
      rawService.definition_name,
      rawService.name,
      rawService.display_name,
      "Cuci dan Servis AC Split Bergaransi Mandiri Teknik",
    ];
    resolvedTitle = candidates.find((c) => !isInvalidTitle(c)) || "Cuci dan Servis AC Split Bergaransi Mandiri Teknik";
  }

  const rawWCfg =
    rawService.warranty_config ||
    rawService.warrantyConfig ||
    (backendOrder as any).warranty_config;
  let resolvedWarrantyDays = 0;
  if (rawWCfg) {
    if (typeof rawWCfg === "string") {
      try {
        const parsed = JSON.parse(rawWCfg);
        resolvedWarrantyDays =
          parsed.duration_days ??
          parsed.durationDays ??
          (parsed.warrantyEnabled !== false ? 20 : 0);
      } catch {}
    } else if (typeof rawWCfg === "object") {
      resolvedWarrantyDays =
        rawWCfg.duration_days ??
        rawWCfg.durationDays ??
        (rawWCfg.warrantyEnabled !== false ? 20 : 0);
    }
  } else if (
    backendOrder.service_offering_id === "6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd" ||
    (rawService.title && rawService.title.toLowerCase().includes("ac"))
  ) {
    resolvedWarrantyDays = 20;
  }

  const resolvedSubcategory =
    rawService.subcategory_name ||
    rawService.subcategoryName ||
    rawService.subcategory?.name ||
    rawService.definition_name ||
    "AC & Pendingin Udara";

  const resolvedCategory =
    rawService.category_name ||
    rawService.categoryName ||
    rawService.category?.name ||
    "Repair & Technical";

  const serviceSnapshot: ServiceOfferingSnapshot = {
    id: backendOrder.service_offering_id || rawService.id || "srv-ac-split",
    title: resolvedTitle,
    categoryName: resolvedCategory,
    subcategoryName: resolvedSubcategory,
    thumbnailUrl:
      rawService.thumbnailUrl ||
      rawService.thumbnail_url ||
      rawService.image_url ||
      rawService.primary_media_url ||
      rawService.primary_media?.url ||
      (Array.isArray(rawService.media) ? rawService.media[0]?.url : undefined) ||
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=80",
    priceModel: (rawService.priceModel as any) || "AFTER_SURVEY",
    diagnosisFee: backendOrder.diagnosis_fee_idr ?? 50000,
    serviceMode: "HOME_SERVICE",
    warrantyDurationDays: resolvedWarrantyDays,
  };

  const rawAddr = backendOrder.address_snapshot || {};
  const rawRecipient = backendOrder.recipient_snapshot || {};
  const addressSnapshot: ServiceAddressSnapshot = {
    recipientName: rawRecipient.recipient_name || (rawRecipient as any).name || "Pelanggan",
    phone: rawRecipient.phone || (rawRecipient as any).recipient_phone || "-",
    fullAddress:
      rawAddr.fullAddress ||
      rawAddr.street ||
      rawAddr.addressLine ||
      (rawAddr as any).address_line ||
      (rawAddr as any).street_address ||
      "-",
    city: rawAddr.city || (rawAddr as any).city_name || "-",
    district: (rawAddr as any).district || "-",
    postalCode: (rawAddr as any).postalCode || (rawAddr as any).postal_code || "-",
    notes: rawAddr.notes || "",
  };

  // Schedule mapping
  const rawStartAt = backendOrder.schedule?.start_at || backendOrder.created_at;
  const scheduleDate = rawStartAt ? rawStartAt.substring(0, 10) : new Date().toISOString().substring(0, 10);
  let scheduleTimeSlot = "10:00 WIB";
  if (rawStartAt && rawStartAt.includes("T")) {
    const timeStr = rawStartAt.split("T")[1]?.substring(0, 5);
    if (timeStr) scheduleTimeSlot = `${timeStr} WIB`;
  } else if (rawStartAt && rawStartAt.includes(" ")) {
    const timeStr = rawStartAt.split(" ")[1]?.substring(0, 5);
    if (timeStr) scheduleTimeSlot = `${timeStr} WIB`;
  }

  // Worker assignment
  let assignment: WorkerAssignment | undefined = undefined;
  const isPendingWorkerResponse =
    subStatus === "ASSIGNED_PENDING" ||
    backendOrder.status === "ASSIGNED_WAITING_WORKER" ||
    backendOrder.status === "DISPATCHED_WAITING_ACCEPTANCE";

  if (backendOrder.assigned_worker) {
    const w = backendOrder.assigned_worker;
    const resolvedPhoto =
      w.membership_snapshot?.photo ||
      getStoredWorkerPhoto(w.worker_id) ||
      getStoredWorkerPhoto() ||
      "";
    assignment = {
      assignmentId: `asg-${backendOrder.id}`,
      workerId: w.worker_id,
      workerName: w.membership_snapshot?.name || "Ahmad Teknisi",
      workerPhone: w.membership_snapshot?.phone || "+62 819-6677-889",
      workerPhoto: resolvedPhoto,
      workerRating: undefined,
      assignedAt: backendOrder.created_at,
      responseDeadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      status: isPendingWorkerResponse ? "ASSIGNED" : "ACCEPTED",
    };
  } else if ((backendOrder as any).active_assignment) {
    const act = (backendOrder as any).active_assignment;
    const resolvedPhoto =
      act.worker_photo ||
      getStoredWorkerPhoto(act.worker_id) ||
      getStoredWorkerPhoto() ||
      "";
    assignment = {
      assignmentId: act.attempt_id || `asg-${backendOrder.id}`,
      workerId: act.worker_id,
      workerName: act.worker_name || "Ahmad Teknisi",
      workerPhone: act.worker_phone || "+62 819-6677-889",
      workerPhoto: resolvedPhoto,
      workerRating: undefined,
      assignedAt: act.assigned_at || backendOrder.created_at,
      responseDeadline: act.response_due_at || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      status: act.status || (isPendingWorkerResponse ? "ASSIGNED" : "ACCEPTED"),
    };
  }

  // Payment summary mapping
  const effectiveObligations: BackendPaymentObligation[] | undefined =
    obligations ||
    (backendOrder as any).payment_obligations ||
    (backendOrder as any).obligations;

  const diagObligation = effectiveObligations?.find((o) => o.purpose === "DIAGNOSIS");
  const execObligation = effectiveObligations?.find((o) => o.purpose === "SERVICE_EXECUTION");

  const diagAttempt = diagObligation?.attempts?.find((a) => a.is_current) || diagObligation?.attempts?.[0];
  const execAttempt = execObligation?.attempts?.find((a) => a.is_current) || execObligation?.attempts?.[0];

  const isDiagPaid =
    (diagObligation && (diagObligation.state === "PAID" || (diagObligation as any).paid_at)) ||
    (backendOrder.status !== "PENDING_DIAGNOSIS_PAYMENT" &&
      backendOrder.status !== "CANCELLED_DIAGNOSIS_UNPAID");

  const isExecPaid =
    backendOrder.status === "COMPLETED" ||
    backendOrder.status === "EXECUTION_PAID" ||
    backendOrder.status === "PAID_WAITING_COMPLETION" ||
    backendOrder.status === "VISIT_CLOSED" ||
    backendOrder.status === "AWAITING_CUSTOMER_CONFIRMATION" ||
    (execObligation && (execObligation.state === "PAID" || (execObligation as any).paid_at));

  const hasCompletedExecution =
    backendOrder.status === "COMPLETED" ||
    backendOrder.status === "EXECUTION_PAID" ||
    backendOrder.status === "PAID_WAITING_COMPLETION" ||
    backendOrder.status === "VISIT_CLOSED" ||
    backendOrder.status === "AWAITING_CUSTOMER_CONFIRMATION" ||
    backendOrder.status === "WORKER_FINISHED" ||
    backendOrder.status === "EXECUTION_FINISHED" ||
    backendOrder.status === "PAYMENT_PENDING" ||
    backendOrder.status === "PAYMENT_OVERDUE" ||
    !!execObligation;

  const execFeeSnapshot = (execObligation as any)?.fee_snapshot;
  const rawBackendDiag = (backendOrder as any)?.diagnosis;
  const laborSubtotal =
    rawBackendDiag?.work_subtotal_idr ??
    execFeeSnapshot?.labor_subtotal_idr ??
    (execObligation ? Math.min(execObligation.principal_idr, 175000) : (hasCompletedExecution ? 175000 : 0));
  const partsSubtotal =
    rawBackendDiag?.provider_part_subtotal_idr ??
    execFeeSnapshot?.provider_part_subtotal_idr ??
    (execObligation ? Math.max(0, (execFeeSnapshot?.execution_subtotal_idr ?? 200000) - laborSubtotal) : (hasCompletedExecution ? 25000 : 0));
  const executionSubtotal =
    rawBackendDiag?.grand_total_idr ??
    (laborSubtotal + partsSubtotal > 0 ? laborSubtotal + partsSubtotal : (execFeeSnapshot?.execution_subtotal_idr ?? (execObligation?.principal_idr || (hasCompletedExecution ? 200000 : 0))));
  const customerPlatformFee =
    execFeeSnapshot?.customer_platform_fee_idr ??
    (execObligation && execObligation.principal_idr > executionSubtotal ? execObligation.principal_idr - executionSubtotal : 5000);
  const providerCommissionFee =
    execFeeSnapshot?.provider_commission_idr ??
    (hasCompletedExecution ? 10000 : 0);
  const netExecution =
    execFeeSnapshot?.provider_net_entitlement_idr ??
    Math.max(0, executionSubtotal - providerCommissionFee);

  const diagnosisFee = backendOrder.diagnosis_fee_idr ?? 50000;
  const isDiagEarned =
    isDiagPaid &&
    backendOrder.status !== "PENDING_DIAGNOSIS_PAYMENT" &&
    backendOrder.status !== "CANCELLED_DIAGNOSIS_UNPAID";

  const providerGross = (isDiagEarned ? diagnosisFee : 0) + (hasCompletedExecution ? executionSubtotal : 0);
  const providerNet = (isDiagEarned ? diagnosisFee : 0) + (hasCompletedExecution ? netExecution : 0);

  const paymentSummary: ServicePaymentSummary = {
    diagnosisPayment: {
      invoiceNo: diagAttempt?.finance_invoice_ref || (diagAttempt as any)?.finance_payment_id || `INV-DIAG-${backendOrder.order_no}`,
      invoiceNumber: diagAttempt?.finance_invoice_ref || (diagAttempt as any)?.finance_payment_id || `INV-DIAG-${backendOrder.order_no}`,
      paymentId: diagAttempt?.finance_payment_id || (diagObligation as any)?.active_finance_payment_id || diagAttempt?.finance_invoice_ref || `INV-DIAG-${backendOrder.order_no}`,
      amount: diagnosisFee,
      status: isDiagPaid ? "PAID" : "PENDING",
      method: "QRIS",
      paymentMethod: "QRIS",
      paymentReference: diagAttempt?.finance_payment_id || (diagObligation as any)?.active_finance_payment_id || `PAY-DIAG-${backendOrder.id}`,
      qrPayload: "00020101021226580016ID.CO.SERVIO.WWW01189360099900000123455204581253033605802ID5913SERVIO PAY6007JAKARTA",
      qrCodeUrl: "/brand/logo.png",
      vaNumber: "827708123456789",
      expiresAt: diagAttempt?.expires_at || new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      paidAt: isDiagPaid ? (diagObligation?.paid_at || backendOrder.created_at) : undefined,
    } as any,
    executionPayment: (execObligation || hasCompletedExecution || !!rawBackendDiag)
      ? ({
          invoiceNo: execAttempt?.finance_invoice_ref || (execAttempt as any)?.finance_payment_id || `INV-EXEC-${backendOrder.order_no}`,
          invoiceNumber: execAttempt?.finance_invoice_ref || (execAttempt as any)?.finance_payment_id || `INV-EXEC-${backendOrder.order_no}`,
          paymentId: execAttempt?.finance_payment_id || (execObligation as any)?.active_finance_payment_id || execAttempt?.finance_invoice_ref || `INV-EXEC-${backendOrder.order_no}`,
          amount: execObligation?.principal_idr || (executionSubtotal + customerPlatformFee),
          laborSubtotal,
          partsSubtotal,
          executionSubtotal,
          platformFee: customerPlatformFee,
          policyName: execFeeSnapshot?.policy_name || "Kebijakan Layanan & Komisi Servis Jasa 2026",
          policyVersion: execFeeSnapshot?.policy_version || 1,
          status: isExecPaid ? "PAID" : (execObligation?.state === "OVERDUE" ? "OVERDUE" : "PENDING"),
          method: "BCA_VA",
          paymentMethod: "BCA_VA",
          paymentReference: execAttempt?.finance_payment_id || (execObligation as any)?.active_finance_payment_id || `PAY-EXEC-${backendOrder.id}`,
          virtualAccountNo: "827708123456789",
          vaNumber: "827708123456789",
          expiresAt: execAttempt?.expires_at || new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
          paidAt: isExecPaid ? (execObligation?.paid_at || new Date().toISOString()) : undefined,
        } as any)
      : undefined,
    providerFunds: {
      grossAmount: providerGross,
      executionGross: hasCompletedExecution ? executionSubtotal : 0,
      laborAmount: laborSubtotal,
      partsAmount: partsSubtotal,
      diagnosisGross: isDiagEarned ? diagnosisFee : 0,
      diagnosisStatus: isDiagPaid ? "PAID" : "UNPAID",
      platformFee: hasCompletedExecution ? providerCommissionFee : 0,
      platformFeeName: execFeeSnapshot?.policy_name || "Kebijakan Layanan & Komisi Servis Jasa 2026",
      platformFeeVersion: execFeeSnapshot?.policy_version || 1,
      platformFeeType: execFeeSnapshot?.policy_snapshot?.provider_commission_type || "FIXED",
      netExecution: hasCompletedExecution ? netExecution : 0,
      netAmount: providerNet,
      status: backendOrder.status === "COMPLETED" ? "HELD" : (isDiagPaid ? "HELD" : "AVAILABLE"),
      heldUntil: backendOrder.completed_at
        ? new Date(new Date(backendOrder.completed_at).getTime() + 120 * 3600 * 1000).toISOString()
        : new Date(Date.now() + 120 * 3600 * 1000).toISOString(),
    },
    refundSummary:
      backendOrder.status === "CANCELLED" || (backendOrder as any).provider_decision_status === "REJECTED"
        ? {
            refundId: `REF-${backendOrder.id.substring(0, 8)}`,
            amount: backendOrder.diagnosis_fee_idr || 50000,
            status: "SUCCEEDED",
            reason:
              (backendOrder as any).provider_rejection_reason ||
              (backendOrder as any).cancellation_reason ||
              "Pengembalian dana survei 100% S-Pay (Section 50)",
            requestedAt: backendOrder.cancelled_at || (backendOrder as any).provider_decision_at || new Date().toISOString(),
            processedAt: backendOrder.cancelled_at || (backendOrder as any).provider_decision_at || new Date().toISOString(),
          }
        : undefined,
  };

  // Timeline mapping
  const timeline = (timelineEvents || []).map((t, idx) => ({
    id: `tl-${idx}`,
    type: t.event_type || "ACTIVITY",
    title: t.to_status ? t.to_status.replace(/_/g, " ") : (t.event_type ? t.event_type.replace(/_/g, " ") : "Aktivitas"),
    description: `Status berubah dari ${t.from_status || "Awal"} menjadi ${t.to_status || "-"}`,
    actorRole: (t.actor_role as any) || "SYSTEM",
    actorName: t.actor_role || "Sistem SERVIO",
    timestamp: t.occurred_at || new Date().toISOString(),
  }));

  if (timeline.length === 0) {
    timeline.push({
      id: "tl-0",
      type: "ORDER_CREATED",
      title: "Pesanan Dibuat",
      description: "Customer membuat booking layanan melalui aplikasi",
      actorRole: "CUSTOMER",
      actorName: addressSnapshot.recipientName,
      timestamp: backendOrder.created_at,
    });
    if (isDiagPaid) {
      timeline.push({
        id: "tl-1",
        type: "DIAGNOSIS_PAID",
        title: "Biaya Diagnosis Terbayar",
        description: "Pembayaran biaya diagnosis terverifikasi oleh Finance 06",
        actorRole: "FINANCE",
        actorName: "Finance Gateway",
        timestamp: backendOrder.created_at,
      });
    }
  }

  // Real Diagnosis mapping (only present if diagnosis has actually occurred on backend)
  let diagnosis: Diagnosis | undefined = undefined;
  const rawDiag = (backendOrder as any).diagnosis;
  if (rawDiag) {
    let rawWorkItems: ServiceWorkItem[] = (rawDiag.work_items || []).map((w: any, idx: number) => {
      const qty = Number(w.qty || w.quantity) || 1;
      const unitPrice = Number(w.unitPrice || w.unit_price || w.unit_price_idr) || 0;
      const subtotal = Number(w.subtotal || w.subtotal_idr || w.total_price_idr) || (unitPrice * qty);
      const title = w.title || w.name || w.item_name || (idx === 0 ? "Jasa Cuci & Servis AC Split" : "Reparasi Modul & Saluran");
      return {
        id: w.id || `wi-${idx + 1}`,
        title,
        description: w.description || "",
        qty,
        unitPrice,
        subtotal,
      };
    });

    if (rawWorkItems.length === 0 && (Number(rawDiag.work_subtotal_idr) || 0) > 0) {
      rawWorkItems = [
        {
          id: `wi-1`,
          title: "Jasa Servis AC Split & Cuci Kimia",
          description: "Pembersihan indoor & outdoor unit",
          qty: 1,
          unitPrice: 100000,
          subtotal: 100000,
        },
        {
          id: `wi-2`,
          title: "Reparasi & Pembersihan Saluran Drainase",
          description: "Pelancaran drainase pipa pembuangan",
          qty: 1,
          unitPrice: 75000,
          subtotal: 75000,
        },
      ];
    }

    let rawSpareparts: SparepartItem[] = (rawDiag.spareparts || rawDiag.part_items || []).map((p: any, idx: number) => {
      const qty = Number(p.qty || p.quantity) || 1;
      const unitPrice = Number(p.unitPrice || p.unit_price || p.unit_price_idr) || 0;
      const subtotal = Number(p.subtotal || p.subtotal_idr || p.total_price_idr) || (unitPrice * qty);
      const sourceRaw = String(p.source || p.part_source || "PROVIDER_SUPPLIED").toUpperCase();
      const source = (sourceRaw === "PROVIDER" || sourceRaw === "PROVIDER_SUPPLIED")
        ? "PROVIDER"
        : (sourceRaw === "MERCHANT_05A" || sourceRaw === "SERVIO_MERCHANT")
        ? "MERCHANT_05A"
        : "CUSTOMER";
      return {
        id: p.id || `sp-${idx + 1}`,
        name: p.part_name || p.name || "Pipa Pembuangan Air Fleksibel",
        source: source as any,
        qty,
        unitPrice,
        subtotal,
        isAvailableForVisit: p.isAvailableForVisit ?? true,
      };
    });

    if (rawSpareparts.length === 0 && (Number(rawDiag.provider_part_subtotal_idr) || 0) > 0) {
      rawSpareparts = [
        {
          id: `sp-1`,
          name: "Pipa Pembuangan Air Fleksibel",
          source: "PROVIDER" as any,
          qty: 1,
          unitPrice: 25000,
          subtotal: 25000,
          isAvailableForVisit: true,
        },
      ];
    }

    const workTotal = Number(rawDiag.work_subtotal_idr) || rawWorkItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    const sparepartTotal = Number(rawDiag.provider_part_subtotal_idr) || rawSpareparts.reduce((acc, curr) => acc + curr.subtotal, 0);
    const grandTotal = Number(rawDiag.grand_total_idr) || (workTotal + sparepartTotal);

    const rawConsent = (backendOrder as any).consent;
    let consent: any = undefined;
    if (rawConsent && rawConsent.decision === "APPROVED") {
      consent = {
        type: rawConsent.method === "WORKER_RECORDED_IN_PERSON" ? "IN_PERSON_RECORDED" : "REMOTE_APPROVED",
        timestamp: rawConsent.submitted_at || backendOrder.updated_at || backendOrder.created_at,
        notes: rawConsent.method === "WORKER_RECORDED_IN_PERSON" ? "Persetujuan langsung di lokasi" : "Persetujuan via aplikasi",
      };
    } else if (
      rawDiag.status === "APPROVED" ||
      backendOrder.status === "EXECUTION_IN_PROGRESS" ||
      backendOrder.status === "WORKER_FINISHED" ||
      backendOrder.status === "COMPLETED"
    ) {
      consent = {
        type: "IN_PERSON_RECORDED",
        timestamp: backendOrder.updated_at || backendOrder.created_at,
        notes: "Persetujuan biaya perbaikan",
      };
    }

    diagnosis = {
      id: rawDiag.id || `diag-${backendOrder.id}`,
      workerId: backendOrder.assigned_worker?.worker_id || assignment?.workerId || "",
      workerName: assignment?.workerName || "Teknisi Bertugas",
      diagnosisTime: rawDiag.submitted_at || backendOrder.created_at,
      findings: rawDiag.findings_summary || rawDiag.findings || "",
      rootCause: rawDiag.root_cause || undefined,
      recommendedActions: rawDiag.recommended_action || rawDiag.recommendedActions || "",
      costBreakdown: {
        workItems: rawWorkItems,
        spareparts: rawSpareparts,
        workTotal,
        sparepartTotal,
        grandTotal,
        version: rawDiag.version_no || 1,
      },
      spareparts: rawSpareparts,
      version: rawDiag.version_no || 1,
      status: (rawDiag.status as any) || "APPROVED",
      damagePhotos: rawDiag.diagnosis_photos || rawDiag.damagePhotos || rawDiag.diagnosis_photo_refs || [],
      consent,
    };
  }

  const rawVisit = (backendOrder as any).visit;
  const mappedVisit = rawVisit
    ? {
        status: rawVisit.status,
        otwAt: rawVisit.otw_at || undefined,
        arrivedAt: rawVisit.arrived_at || undefined,
        closedAt: rawVisit.visit_closed_at || undefined,
      }
    : undefined;

  // Real Execution mapping (only present if execution has occurred on backend)
  let execution: ServiceExecution | undefined = undefined;
  const rawExec = (backendOrder as any).execution;
  if (rawExec) {
    const beforeEvidences = (rawExec.evidences || []).filter((e: any) => e.type === "BEFORE" || e.evidence_type === "BEFORE");
    const afterEvidences = (rawExec.evidences || []).filter((e: any) => e.type === "AFTER" || e.evidence_type === "AFTER");

    const resolvedVisitStatus: ServiceExecution["visitStatus"] =
      backendOrder.completed_at ||
      rawVisit?.status === "CLOSED" ||
      backendOrder.status === "VISIT_CLOSED"
        ? "PAID_VISIT_ENDED"
        : rawExec.finished_at && !isExecPaid
        ? "AWAITING_PAYMENT"
        : "IN_PROGRESS";

    execution = {
      visitStatus: resolvedVisitStatus,
      startedAt: rawExec.started_at || backendOrder.created_at,
      finishedAt: rawExec.finished_at || backendOrder.completed_at || undefined,
      beforePhotos: beforeEvidences.map((e: any) => e.url || e.media_reference),
      afterPhotos: afterEvidences.map((e: any) => e.url || e.media_reference),
      workSummary: rawExec.summary || rawExec.execution_notes || rawExec.workSummary || "Pekerjaan servis telah selesai.",
      testResults: rawExec.test_result || rawExec.test_results || rawExec.testResults || "Fungsi alat beroperasi normal.",
      usedSpareparts: rawExec.used_spareparts || rawExec.actual_part_usage_json || [],
    };
  }

  return {
    id: backendOrder.id,
    orderNumber: backendOrder.order_no,
    customerId: backendOrder.customer_id,
    customerName: addressSnapshot.recipientName,
    customerPhone: addressSnapshot.phone,
    providerId: backendOrder.provider_org_id,
    providerName:
      (backendOrder as any).provider_name && (backendOrder as any).provider_name !== "PT Servio Mandiri Teknik"
        ? (backendOrder as any).provider_name
        : (rawService as any).provider_name && (rawService as any).provider_name !== "PT Servio Mandiri Teknik"
        ? (rawService as any).provider_name
        : (rawService as any).store_name && (rawService as any).store_name !== "PT Servio Mandiri Teknik"
        ? (rawService as any).store_name
        : "sukses gembira",
    serviceSnapshot,
    addressSnapshot,
    complaint: {
      description: backendOrder.complaint_text || "Layanan servis",
      symptoms: (() => {
        const rawSym = backendOrder.symptoms || (backendOrder as any).symptoms_json;
        if (Array.isArray(rawSym)) return rawSym;
        if (typeof rawSym === "string") {
          try {
            const parsed = JSON.parse(rawSym);
            if (Array.isArray(parsed)) return parsed;
          } catch {}
          return [rawSym];
        }
        return ["Kurang dingin"];
      })(),
      photos: (() => {
        const rawPhotos =
          (backendOrder as any).customer_media_refs ||
          (backendOrder as any).complaintPhotos ||
          (backendOrder as any).complaint?.photos ||
          [];
        if (Array.isArray(rawPhotos)) return rawPhotos.filter(Boolean);
        if (typeof rawPhotos === "string" && rawPhotos.trim().length > 0) {
          try {
            const parsed = JSON.parse(rawPhotos);
            if (Array.isArray(parsed)) return parsed.filter(Boolean);
          } catch {
            return [rawPhotos];
          }
        }
        return [];
      })(),
    },
    schedule: {
      date: scheduleDate,
      timeSlot: scheduleTimeSlot,
    },
    status,
    subStatus,
    providerDecisionStatus: ((backendOrder as any).provider_decision_status as any) || "PENDING",
    providerDecisionAt: (backendOrder as any).provider_decision_at || null,
    providerRejectionReason: (backendOrder as any).provider_rejection_reason || null,
    cancellation:
      backendOrder.status === "CANCELLED"
        ? {
            cancelledAt: (backendOrder as any).cancelled_at || backendOrder.updated_at,
            cancelledByRole: (((backendOrder as any).provider_decision_status === "REJECTED" ? "PROVIDER" : "CUSTOMER") as any),
            cancelledByName: (backendOrder as any).provider_decision_status === "REJECTED" ? "Mitra Penyedia Jasa" : addressSnapshot.recipientName,
            reasonCode: (((backendOrder as any).cancel_reason_code || "PROVIDER_UNABLE") as any),
            reasonDetail:
              (backendOrder as any).provider_rejection_reason ||
              (backendOrder as any).cancellation_reason ||
              (backendOrder as any).cancel_reason ||
              "Pesanan dibatalkan / ditolak.",
            diagnosisEligibleForHold: false,
            refundEligible: true,
          }
        : undefined,
    assignment,
    visit: mappedVisit,
    diagnosis,
    execution,
    paymentSummary,
    timeline,
    issues: [],
    completedAt: backendOrder.completed_at || undefined,
    createdAt: backendOrder.created_at,
    updatedAt: backendOrder.updated_at,
  };
}

export function mapBackendWorkerTaskToServiceOrder(task: BackendWorkerTask): ServiceOrder {
  const rawOrder = task.order || ({} as any);
  const baseOrder = mapBackendOrderToServiceOrder(
    {
      id: rawOrder.id || task.assignment_id,
      order_no: rawOrder.order_no || `TASK-${task.assignment_id.slice(-6)}`,
      customer_id: rawOrder.customer_id || "cust-default",
      provider_org_id: task.provider_org_id || "org-default",
      service_offering_id: rawOrder.service_offering_id || "srv-default",
      service_snapshot: rawOrder.service_snapshot,
      recipient_snapshot: rawOrder.recipient_snapshot,
      address_snapshot: rawOrder.address_snapshot,
      complaint_text: rawOrder.complaint_text || "Keluhan teknis",
      symptoms: rawOrder.symptoms,
      customer_media_refs: rawOrder.customer_media_refs || [],
      diagnosis_fee_idr: rawOrder.diagnosis_fee_idr,
      diagnosis_fee_exemption_type: rawOrder.diagnosis_fee_exemption_type,
      status: rawOrder.status || (task.status === "ASSIGNED" ? "DISPATCHED_WAITING_ACCEPTANCE" : "WORKER_ACCEPTED"),
      phase: rawOrder.phase || "VISIT_PENDING",
      cancel_reason_code: rawOrder.cancel_reason_code,
      created_at: task.assigned_at || new Date().toISOString(),
      updated_at: task.accepted_at || task.assigned_at || new Date().toISOString(),
      diagnosis: rawOrder.diagnosis,
      consent: rawOrder.consent,
      execution: rawOrder.execution,
      visit: rawOrder.visit || task.visit,
      completed_at: rawOrder.completed_at,
    } as any,
    rawOrder.payment_obligations
  );

  baseOrder.assignment = {
    assignmentId: task.assignment_id,
    workerId: task.worker_id,
    workerName: "Ahmad Teknisi",
    workerPhone: "+62 819-6677-889",
    workerPhoto: getStoredWorkerPhoto(task.worker_id) || getStoredWorkerPhoto() || "/storage/avatars/tY7SeXSkRKHBMrsVkJ3mqGV8Jl6pn6q3H0cRI0f2.jpg",
    workerRating: undefined,
    assignedAt: task.assigned_at,
    responseDeadline: task.response_due_at || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    status: (task.status as any) || "ASSIGNED",
  };

  if (task.schedule?.start_at) {
    baseOrder.schedule.date = task.schedule.start_at.substring(0, 10);
  }

  if (task.visit) {
    baseOrder.visit = {
      status: task.visit.status as any,
      otwAt: task.visit.otw_at,
      arrivedAt: task.visit.arrived_at,
      closedAt: (task.visit as any).visit_closed_at || undefined,
    };
    // Only infer subStatus from visit if order is still in scheduled/pre-diagnosis phase
    if (
      baseOrder.status === "SCHEDULED" ||
      baseOrder.subStatus === "WORKER_ACCEPTED" ||
      baseOrder.subStatus === "ASSIGNED_PENDING"
    ) {
      if (task.visit.status === "OTW" || task.visit.status === "ON_THE_WAY") {
        baseOrder.status = "IN_PROGRESS";
        baseOrder.subStatus = "WORKER_OTW";
      } else if (task.visit.status === "ARRIVED") {
        baseOrder.status = "IN_PROGRESS";
        baseOrder.subStatus = "WORKER_ARRIVED";
      }
    }
  }

  return baseOrder;
}

