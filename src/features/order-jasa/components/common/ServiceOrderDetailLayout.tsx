"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Wrench,
  Clock,
  CalendarBlank,
  MapPin,
  User,
  ShieldCheck,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  WarningCircle,
  Buildings,
  Phone,
  Camera,
  Cube,
  Tag,
  ArrowsClockwise,
  Check,
  X,
  WarningOctagon,
  Info,
  Bank,
  FileText,
  CurrencyCircleDollar,
  Star,
  XCircle,
  Eye,
} from "@phosphor-icons/react";
import { ServiceOrder } from "../../types";
import { getSubStatusBadgeInfo } from "../../constants";
import { ServiceOrderStageBanner } from "./ServiceOrderStageBanner";
import { CurrentOrderStatusPanel } from "./CurrentOrderStatusPanel";
import { OrderActivityHistoryModal } from "./OrderActivityHistoryModal";
import { DiagnosisReviewModal } from "./DiagnosisReviewModal";
import { SparepartSourceModal } from "./SparepartSourceModal";
import { FollowUpOrderDraftModal } from "./FollowUpOrderDraftModal";
import { CompleteOrderSummaryModal } from "./CompleteOrderSummaryModal";
import { getStoredWorkerPhoto, useWorkerPhoto } from "@/features/worker/workerPhotoHelper";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { OrderReviewModal } from "@/components/features/afterSales/OrderReviewModal";
import { WarrantyClaimModal } from "@/components/features/afterSales/WarrantyClaimModal";
import { afterSalesApi, ReviewSubmission } from "@/lib/afterSalesApi";

function DetailWorkerAvatar({
  workerId,
  name,
  fallbackPhoto,
}: {
  workerId?: string;
  name: string;
  fallbackPhoto?: string;
}) {
  const photo = useWorkerPhoto(workerId, fallbackPhoto);
  return (
    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
      <img
        src={photo || "/storage/avatars/tY7SeXSkRKHBMrsVkJ3mqGV8Jl6pn6q3H0cRI0f2.jpg"}
        alt={name}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
import { WorkerDiagnosisFormModal } from "../worker/WorkerDiagnosisFormModal";
import { WorkerInPersonConsentModal } from "../worker/WorkerInPersonConsentModal";
import { WorkerFinishFormModal } from "../worker/WorkerFinishFormModal";
import { ProviderAssignWorkerModal } from "../provider/ProviderAssignWorkerModal";
import { useOrderJasa, ORDER_JASA_UPDATED_EVENT } from "../../hooks/useOrderJasa";

interface ServiceOrderDetailLayoutProps {
  order: ServiceOrder;
  role: "CUSTOMER" | "WORKER" | "PROVIDER" | "ADMIN" | "FINANCE";
  backHref: string;
  onOrderUpdated?: (order: ServiceOrder) => void;
}

export function ServiceOrderDetailLayout({
  order: initialOrder,
  role,
  backHref,
  onOrderUpdated,
}: ServiceOrderDetailLayoutProps) {
  const [order, setOrder] = useState<ServiceOrder>(initialOrder);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  const {
    cancelBooking,
    acceptOrder,
    rejectOrder,
    assignWorker,
    acceptAssignment,
    rejectAssignment,
    startTrip,
    arriveAtLocation,
    submitDiagnosis,
    recordInPersonConsent,
    respondRemoteConsent,
    startExecution,
    finishExecution,
    endVisit,
    reportPaymentIssue,
    simulateFinancePayment,
    confirmCustomerCompleted,
    simulateReleaseFunds120h,
    createFollowUpOrder,
    retryPayment,
    fetchOrderById,
  } = useOrderJasa();

  const refreshCurrentOrder = React.useCallback(
    async (orderId: string) => {
      try {
        const fresh = await fetchOrderById(orderId, true);
        if (fresh) {
          setOrder(fresh);
          if (onOrderUpdated) onOrderUpdated(fresh);
        }
      } catch (err) {
        console.warn("[ServiceOrderDetailLayout] refreshCurrentOrder error:", err);
      }
    },
    [fetchOrderById, onOrderUpdated]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUpdate = (e: any) => {
      const updatedId = e?.detail?.orderId;
      if (!updatedId || updatedId === order.id || updatedId === order.orderNumber) {
        refreshCurrentOrder(order.id);
      }
    };
    window.addEventListener(ORDER_JASA_UPDATED_EVENT, handleUpdate);

    // Cross-tab & Cross-role real-time broadcast channel synchronization
    let channel: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel("servio_order_jasa_channel");
        channel.onmessage = (e) => {
          const updatedId = e?.data?.orderId;
          if (!updatedId || updatedId === order.id || updatedId === order.orderNumber) {
            refreshCurrentOrder(order.id);
          }
        };
      }
    } catch {
      // fallback ignore
    }

    // Storage event fallback for cross-tab sync
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "servio_service_orders_cache_v2") {
        refreshCurrentOrder(order.id);
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    // Adaptive auto-refresh: poll every 2s when active tab, and recheck on visibility/focus
    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      refreshCurrentOrder(order.id);
    }, 2000);

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        refreshCurrentOrder(order.id);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      window.removeEventListener(ORDER_JASA_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleStorageEvent);
      if (channel) channel.close();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
      clearInterval(intervalId);
    };
  }, [order.id, order.orderNumber, refreshCurrentOrder]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isDiagnosisReviewOpen, setIsDiagnosisReviewOpen] = useState(false);
  const [isSparepartSourceOpen, setIsSparepartSourceOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isWorkerDiagnosisOpen, setIsWorkerDiagnosisOpen] = useState(false);
  const [isWorkerConsentOpen, setIsWorkerConsentOpen] = useState(false);
  const [isWorkerFinishOpen, setIsWorkerFinishOpen] = useState(false);
  const [isProviderAssignOpen, setIsProviderAssignOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  // Payment modal state
  const [activePaymentModal, setActivePaymentModal] = useState<{
    type: "DIAGNOSIS" | "EXECUTION";
    invoiceNo: string;
    paymentId?: string;
    amount: number;
    method: string;
    vaNumber?: string;
    expiresAt: string;
  } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>("QRIS");
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Provider order rejection modal state (Section 50 S-Pay Guarantee)
  const [showProviderRejectModal, setShowProviderRejectModal] = useState(false);
  const [providerRejectReason, setProviderRejectReason] = useState("Jadwal teknisi penuh");

  // Worker task rejection modal state
  const [showWorkerRejectModal, setShowWorkerRejectModal] = useState(false);
  const [workerRejectReason, setWorkerRejectReason] = useState("Jadwal bentrok dengan pekerjaan lain");
  const [workerRejectNotes, setWorkerRejectNotes] = useState("");

  // Phase 07 After-Sales & Review state
  const { warranties, cases } = useAfterSales();
  const [isServiceReviewModalOpen, setIsServiceReviewModalOpen] = useState(false);
  const [isServiceClaimModalOpen, setIsServiceClaimModalOpen] = useState(false);
  const [existingServiceReview, setExistingServiceReview] = useState<ReviewSubmission | null>(null);

  const associatedWarranty = React.useMemo(() => {
    if (!warranties || warranties.length === 0) return null;
    return (
      warranties.find(
        (w) => w.orderId === order.id || w.orderNumber === order.orderNumber
      ) || null
    );
  }, [warranties, order.id, order.orderNumber]);

  const activeAfterSalesCase = React.useMemo(() => {
    if (!cases || cases.length === 0) return null;
    return (
      cases.find(
        (c) => c.sourceOrderId === order.id || c.sourceOrderNumber === order.orderNumber
      ) || null
    );
  }, [cases, order.id, order.orderNumber]);

  const isWarrantyReworkJob = Boolean(
    (order as any).isWarrantyJob ||
      (order as any).caseId ||
      order.serviceSnapshot.title.toLowerCase().includes("garansi") ||
      activeAfterSalesCase?.warrantyJob
  );

  useEffect(() => {
    if (role !== "CUSTOMER" || !order.id) return;
    afterSalesApi.customer
      .getMyReview(order.id)
      .then((res) => {
        if (res.success && res.data && res.data.id) {
          setExistingServiceReview(res.data);
        }
      })
      .catch(() => {});
  }, [role, order.id]);

  const badgeInfo = getSubStatusBadgeInfo(order.subStatus);

  const formatRupiah = (val?: number) => {
    if (val === undefined || val === null) return "Rp 0";
    return `Rp ${val.toLocaleString("id-ID")}`;
  };

  const badgeColorClass = {
    primary: "bg-sky-50 text-[#0F4C81] border-sky-200",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-rose-50 text-rose-800 border-rose-200",
    info: "bg-blue-50 text-blue-800 border-blue-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
  }[badgeInfo.variant];

  const diagPayment = order.paymentSummary.diagnosisPayment;
  const execPayment = order.paymentSummary.executionPayment;
  const refund = order.paymentSummary.refundSummary;
  const providerFunds = order.paymentSummary.providerFunds;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 font-body text-slate-800 pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <CheckCircle size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP BREADCRUMB & ORDER HEADER                                          */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-primary transition group"
        >
          <ArrowLeft size={16} weight="bold" className="group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Daftar Pesanan</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {isWarrantyReworkJob && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 border border-purple-300 text-[11px] font-bold">
              <ShieldCheck size={14} weight="fill" />
              GARANSI — PEKERJAAN ULANG
            </span>
          )}
          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            #{order.orderNumber}
          </span>
          <span className={`text-[11px] font-bold px-3 py-1 rounded-full border shadow-3xs flex items-center gap-1.5 ${badgeColorClass}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>{badgeInfo.label}</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. HERO ANIMATED 14-STAGE LIFECYCLE BANNER                                */}
      {/* ========================================================================= */}
      <ServiceOrderStageBanner order={order} role={role} />

      {/* ========================================================================= */}
      {/* 3. TWO-COLUMN RESPONSIVE LAYOUT                                           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================================= */}
        {/* KOLOM KIRI (lg:col-span-7 xl:col-span-7): STATUS OPERASIONAL & RIWAYAT  */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          {/* 1. HERO ACTIVE STATUS PANEL (DYNAMIC MULTI-ROLE REPLACEMENT) */}
          <CurrentOrderStatusPanel
            order={order}
            role={role}
            onOpenSummaryModal={() => setIsSummaryModalOpen(true)}
            onOpenActivityHistoryModal={() => setIsActivityModalOpen(true)}
            onAcceptOrder={
              role === "PROVIDER"
                ? async () => {
                    setIsActionLoading(true);
                    try {
                      await acceptOrder(order.id);
                      await refreshCurrentOrder(order.id);
                      setToastMessage("Pesanan berhasil diterima! Silakan pilih dan tugaskan teknisi.");
                    } catch (err: any) {
                      setToastMessage(err?.message || "Gagal menerima pesanan.");
                    } finally {
                      setIsActionLoading(false);
                    }
                  }
                : role === "WORKER"
                ? async () => {
                    setIsActionLoading(true);
                    try {
                      await acceptAssignment(order.id);
                      await refreshCurrentOrder(order.id);
                      setToastMessage("Penugasan diterima! Siap berangkat sesuai jadwal.");
                    } catch (err: any) {
                      setToastMessage(err?.message || "Gagal menerima tugas.");
                    } finally {
                      setIsActionLoading(false);
                    }
                  }
                : undefined
            }
            onRejectOrder={
              role === "PROVIDER"
                ? () => {
                    setProviderRejectReason("Jadwal teknisi penuh");
                    setShowProviderRejectModal(true);
                  }
                : role === "WORKER"
                ? () => {
                    setWorkerRejectReason("Jadwal bentrok dengan pekerjaan lain");
                    setWorkerRejectNotes("");
                    setShowWorkerRejectModal(true);
                  }
                : undefined
            }
            onAssignWorker={() => setIsProviderAssignOpen(true)}
            onPayDiagnosis={() => {
              if (diagPayment) {
                setActivePaymentModal({
                  type: "DIAGNOSIS",
                  invoiceNo: diagPayment.invoiceNo,
                  paymentId: diagPayment.paymentId,
                  amount: diagPayment.amount,
                  method: diagPayment.method || "QRIS",
                  vaNumber: diagPayment.vaNumber || "827708123456789",
                  expiresAt: diagPayment.expiresAt,
                });
                setSelectedMethod(diagPayment.method || "QRIS");
              }
            }}
            onPayExecution={() => {
              if (execPayment) {
                setActivePaymentModal({
                  type: "EXECUTION",
                  invoiceNo: execPayment.invoiceNo,
                  paymentId: execPayment.paymentId,
                  amount: execPayment.amount,
                  method: execPayment.method || "BCA_VA",
                  vaNumber: execPayment.vaNumber || "827708123456789",
                  expiresAt: execPayment.expiresAt,
                });
                setSelectedMethod(execPayment.method || "BCA_VA");
              }
            }}
            onReviewDiagnosis={() => setIsDiagnosisReviewOpen(true)}
            onConfirmCompleted={async () => {
              setIsActionLoading(true);
              try {
                await confirmCustomerCompleted(order.id);
                await refreshCurrentOrder(order.id);
                setToastMessage("Terima kasih! Pesanan servis berhasil diselesaikan.");
              } catch (err: any) {
                setToastMessage(err?.message || "Gagal mengonfirmasi selesai.");
              } finally {
                setIsActionLoading(false);
              }
            }}
            onRetryPayment={async () => {
              setIsRetryingPayment(true);
              try {
                await retryPayment(order.id);
                await refreshCurrentOrder(order.id);
                setToastMessage("Tagihan pengganti berhasil diterbitkan! Nomor invoice baru siap dibayar.");
              } catch (e: any) {
                setToastMessage(e?.message || "Gagal membuat tagihan pengganti.");
              } finally {
                setIsRetryingPayment(false);
              }
            }}
            onStartTrip={async () => {
              setIsActionLoading(true);
              try {
                await startTrip(order.id);
                await refreshCurrentOrder(order.id);
                setToastMessage("Status diubah: Menuju Lokasi.");
              } catch (err: any) {
                setToastMessage(err?.message || "Gagal memperbarui status.");
              } finally {
                setIsActionLoading(false);
              }
            }}
            onArrive={async () => {
              setIsActionLoading(true);
              try {
                await arriveAtLocation(order.id);
                await refreshCurrentOrder(order.id);
                setToastMessage("Status diubah: Telah Tiba di Lokasi.");
              } catch (err: any) {
                setToastMessage(err?.message || "Gagal memperbarui status.");
              } finally {
                setIsActionLoading(false);
              }
            }}
            onStartDiagnosis={() => setIsWorkerDiagnosisOpen(true)}
            onOpenDiagnosisForm={() => setIsWorkerDiagnosisOpen(true)}
            onInPersonConsent={() => setIsWorkerConsentOpen(true)}
            onStartExecution={async () => {
              setIsActionLoading(true);
              try {
                await startExecution(order.id);
                await refreshCurrentOrder(order.id);
                setToastMessage("Pengerjaan fisik dimulai. Status: Sedang Dikerjakan.");
              } catch (err: any) {
                setToastMessage(err?.message || "Gagal memulai pengerjaan.");
              } finally {
                setIsActionLoading(false);
              }
            }}
            onOpenFinishForm={() => setIsWorkerFinishOpen(true)}
            onCloseVisit={async () => {
              setIsActionLoading(true);
              try {
                await endVisit(order.id);
                await refreshCurrentOrder(order.id);
                setToastMessage("Kunjungan operasional berhasil diakhiri (VISIT_CLOSED).");
              } catch (err: any) {
                setToastMessage(err?.message || "Gagal mengakhiri kunjungan.");
              } finally {
                setIsActionLoading(false);
              }
            }}
            isActionLoading={isActionLoading || isRetryingPayment}
          />

          {/* Card Khusus: Pesanan Ditolak / Dibatalkan (Section 50 Jaminan S-Pay 100% Refund) */}
          {(order.status === "CANCELLED" || order.providerDecisionStatus === "REJECTED") && (
            <div className="bg-rose-50/70 rounded-3xl border border-rose-200 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-rose-200/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                    <XCircle size={22} weight="bold" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm sm:text-base text-rose-950">
                      {order.providerDecisionStatus === "REJECTED" || order.subStatus === "CANCELLED_PROVIDER_REJECTED"
                        ? "Pesanan Ditolak oleh Mitra Toko"
                        : "Pesanan Telah Dibatalkan"}
                    </h3>
                    <p className="text-[11px] text-rose-800">
                      {order.cancellation?.cancelledAt
                        ? `Dibatalkan pada: ${new Date(order.cancellation.cancelledAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB`
                        : "Pesanan telah resmi dihentikan oleh sistem"}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-rose-200 text-rose-900 border border-rose-300">
                  Status: Batal
                </span>
              </div>

              {/* Alasan Penolakan / Pembatalan Resmi dari Database */}
              <div className="p-3.5 rounded-2xl bg-white/90 border border-rose-200/90 space-y-1.5 text-xs shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                    Alasan {order.providerDecisionStatus === "REJECTED" ? "Penolakan Mitra" : "Pembatalan"}:
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">
                    Pihak: {order.cancellation?.cancelledByName || (order.providerDecisionStatus === "REJECTED" ? order.providerName : "Pelanggan")}
                  </span>
                </div>
                <p className="text-slate-900 font-semibold italic text-xs sm:text-sm bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
                  &ldquo;{order.cancellation?.reasonDetail || order.providerRejectionReason || "Pesanan tidak dapat dipenuhi oleh penyedia jasa."}&rdquo;
                </p>
              </div>

              {/* Jaminan Pengembalian Dana 100% S-Pay (Section 50) */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck size={16} weight="fill" className="text-emerald-600" />
                    <span>Jaminan S-Pay 100% Refund (Section 50)</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Refund Sukses 100%
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>Nominal Biaya Survei/Diagnosis:</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    {formatRupiah(order.serviceSnapshot.diagnosisFee || 50000)}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-snug">
                  Seluruh dana biaya survei telah dikembalikan secara utuh tanpa potongan ke saldo dompet S-Pay pelanggan.
                </p>
                <div className="pt-1">
                  <Link
                    href={role === "CUSTOMER" ? "/customer/spay" : "/provider/spay"}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline"
                  >
                    <span>Cek Saldo Dompet S-Pay</span>
                    <ArrowRight size={12} weight="bold" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Customer pre-OTW Cancel Shortcut */}
          {role === "CUSTOMER" &&
            (order.subStatus === "DIAGNOSIS_PENDING" ||
              order.subStatus === "UNASSIGNED" ||
              order.subStatus === "ASSIGNED_PENDING" ||
              order.subStatus === "WORKER_ACCEPTED") && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition cursor-pointer"
                >
                  Batalkan Pesanan
                </button>
              </div>
            )}

          {/* Customer After-Sales & Review Shortcuts for COMPLETED orders */}
          {role === "CUSTOMER" && order.status === "COMPLETED" && (
            <div className="p-4 rounded-3xl bg-emerald-50/70 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                  <ShieldCheck size={16} weight="fill" className="text-emerald-600" />
                  <span>Layanan Selesai — Purnajual &amp; Penilaian</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsServiceReviewModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Star size={14} weight="fill" className="text-amber-500" />
                  <span>{existingServiceReview ? "Lihat Penilaian Anda" : "Beri Rating & Ulasan"}</span>
                </button>
                {associatedWarranty ? (
                  <button
                    type="button"
                    onClick={() => setIsServiceClaimModalOpen(true)}
                    className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck size={14} weight="bold" />
                    <span>Ajukan Klaim Garansi</span>
                  </button>
                ) : (
                  <Link
                    href="/warranties"
                    className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck size={14} weight="bold" />
                    <span>Pusat Garansi Servio</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Worker on-site issue reporting */}
          {role === "WORKER" &&
            (order.subStatus === "WORK_FINISHED" ||
              order.subStatus === "EXECUTION_PENDING" ||
              order.subStatus === "PAYMENT_OVERDUE") &&
            order.paymentSummary?.executionPayment?.status !== "PAID" && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
                <span className="text-[11px] leading-snug">
                  Pelanggan dapat membayar via QRIS/VA. Jika perlu meninggalkan lokasi sebelum pembayaran, laporkan kendala:
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const reason = prompt("Masukkan alasan kendala pembayaran di lokasi:");
                    if (reason) {
                      try {
                        await reportPaymentIssue(order.id, reason);
                        await endVisit(order.id);
                        await refreshCurrentOrder(order.id);
                        setToastMessage("Kendala pembayaran dilaporkan dan kunjungan ditutup.");
                      } catch (e: any) {
                        setToastMessage(e?.message || "Gagal melaporkan kendala.");
                      }
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 hover:bg-amber-100 text-amber-800 font-bold text-xs transition shrink-0 cursor-pointer"
                >
                  Laporkan Kendala
                </button>
              </div>
            )}

          {/* Finance Ops Gateway Simulation */}
          {role === "FINANCE" && (
            <div className="space-y-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs">
              <span className="font-bold text-amber-900 block">Gateway Pembayaran (Finance Service 06)</span>
              {diagPayment?.status === "PENDING" && (
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={async () => {
                    setIsActionLoading(true);
                    try {
                      await simulateFinancePayment(diagPayment.invoiceNo, "PAID");
                      await refreshCurrentOrder(order.id);
                      setToastMessage("Konfirmasi: Tagihan diagnosis berhasil diselesaikan di Finance 06.");
                    } catch (err: any) {
                      setToastMessage(err?.message || "Gagal memproses simulasi pembayaran.");
                    } finally {
                      setIsActionLoading(false);
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Konfirmasi Pembayaran Diagnosis (Finance 06)
                </button>
              )}
              {execPayment?.status === "PENDING" && (
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={async () => {
                    setIsActionLoading(true);
                    try {
                      await simulateFinancePayment(execPayment.invoiceNo, "PAID");
                      await refreshCurrentOrder(order.id);
                      setToastMessage("Konfirmasi: Tagihan pengerjaan berhasil diselesaikan di Finance 06.");
                    } catch (err: any) {
                      setToastMessage(err?.message || "Gagal memproses simulasi pembayaran.");
                    } finally {
                      setIsActionLoading(false);
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Konfirmasi Pembayaran Pengerjaan (Finance 06)
                </button>
              )}
              {providerFunds?.status === "HELD" && (
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={async () => {
                    setIsActionLoading(true);
                    try {
                      await simulateReleaseFunds120h(order.id);
                      await refreshCurrentOrder(order.id);
                      setToastMessage("Pelepasan Dana: Masa hold 120 jam diselesaikan, dana kini AVAILABLE di S-Pay.");
                    } catch (err: any) {
                      setToastMessage(err?.message || "Gagal melepaskan dana.");
                    } finally {
                      setIsActionLoading(false);
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  Rilis Dana Penahanan (120 Jam SLA)
                </button>
              )}
            </div>
          )}

          {/* Card 2: Profil Teknisi Bertugas (Hanya setelah ACCEPTED) */}
          {order.assignment && order.assignment.status === "ACCEPTED" && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-xs p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <User size={15} className="text-primary" weight="bold" />
                  <span>Teknisi Bertugas Resmi</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Terkonfirmasi
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <DetailWorkerAvatar
                  workerId={order.assignment.workerId}
                  name={order.assignment.workerName}
                  fallbackPhoto={order.assignment.workerPhoto}
                />

                <div className="space-y-0.5 min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-900">{order.assignment.workerName}</h4>
                  <p className="text-xs text-slate-500 font-mono">{order.assignment.workerPhone}</p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                    <span className="text-emerald-700 font-semibold">Mitra Terverifikasi Servio</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card 3: Hasil Pemeriksaan & Rincian Biaya (Bila sudah diagnosis) */}
          {order.diagnosis && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Wrench size={16} className="text-primary" weight="bold" />
                    <span>Hasil Pemeriksaan &amp; Rincian Biaya Lapangan</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Oleh {order.diagnosis.workerName} • Versi #{order.diagnosis.version}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDiagnosisReviewOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-50 text-primary border border-sky-200 hover:bg-sky-100 font-bold text-xs transition cursor-pointer"
                >
                  Buka Rincian Penuh
                </button>
              </div>

              {/* Temuan */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Temuan Kerusakan:</span>
                  <p className="text-slate-800 font-medium">{order.diagnosis.findings}</p>
                </div>
                {order.diagnosis.rootCause && (
                  <div className="pt-1.5 border-t border-slate-200/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Penyebab Utama:</span>
                    <p className="text-slate-700">{order.diagnosis.rootCause}</p>
                  </div>
                )}
                {order.diagnosis.recommendedActions && (
                  <div className="pt-1.5 border-t border-slate-200/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Rekomendasi Tindakan:</span>
                    <p className="text-slate-700">{order.diagnosis.recommendedActions}</p>
                  </div>
                )}
                {order.diagnosis.damagePhotos && order.diagnosis.damagePhotos.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                      Foto Bukti Pemeriksaan ({order.diagnosis.damagePhotos.length}):
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {order.diagnosis.damagePhotos.map((photo, i) => (
                        <a key={i} href={photo} target="_blank" rel="noreferrer" className="shrink-0 group">
                          <img
                            src={photo}
                            alt={`Bukti ${i + 1}`}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-200 group-hover:opacity-80 transition shadow-2xs"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Daftar Pekerjaan Ringkas */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Pekerjaan &amp; Suku Cadang:</span>
                <div className="divide-y divide-slate-100">
                  {order.diagnosis.costBreakdown.workItems.map((item, i) => (
                    <div key={i} className="py-1.5 flex justify-between items-center">
                      <span className="text-slate-800">{item.title}</span>
                      <span className="font-bold font-mono text-slate-900">{formatRupiah(item.subtotal)}</span>
                    </div>
                  ))}
                  {order.diagnosis.costBreakdown.spareparts.map((sp, i) => (
                    <div key={i} className="py-1.5 flex justify-between items-center text-slate-600">
                      <span>{sp.name} ({sp.qty}x)</span>
                      <span className="font-bold font-mono text-slate-900">{formatRupiah(sp.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold">
                  <span>Total Biaya Pengerjaan:</span>
                  <span className="text-primary font-mono text-sm">
                    {formatRupiah(order.diagnosis.costBreakdown.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card 4: Bukti Hasil Pengerjaan Selesai (Bila sudah FINISHED) */}
          {order.execution && order.execution.finishedAt && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-emerald-600" weight="bold" />
                  <span>Bukti Hasil Pekerjaan &amp; Pengujian</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Selesai Dikerjakan
                </span>
              </div>

              {/* Foto Before & After */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Foto Sebelum:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.execution.beforePhotos.map((p, i) => (
                      <a key={i} href={p} target="_blank" rel="noopener noreferrer" title="Buka Foto Sebelum Pengerjaan">
                        <img src={p} alt="Before" className="w-20 h-20 rounded-xl object-cover border border-slate-200 hover:opacity-85 transition cursor-pointer shadow-2xs" />
                      </a>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Foto Sesudah:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.execution.afterPhotos.map((p, i) => (
                      <a key={i} href={p} target="_blank" rel="noopener noreferrer" title="Buka Foto Sesudah Pengerjaan">
                        <img src={p} alt="After" className="w-20 h-20 rounded-xl object-cover border border-slate-200 hover:opacity-85 transition cursor-pointer shadow-2xs" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Ringkasan &amp; Uji Coba:</span>
                <p className="text-slate-800">{order.execution.workSummary}</p>
                <div className="pt-1 text-[11px] text-emerald-800">
                  <strong>Hasil Tes:</strong> {order.execution.testResults}
                </div>
              </div>
            </div>
          )}

          {/* Card 5: Follow Up Order Info jika ada */}
          {order.followUpDraft && (
            <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 text-xs">Tersedia Opsi Lanjutkan Perbaikan</span>
                <button
                  type="button"
                  onClick={() => setIsFollowUpModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  Lanjutkan Perbaikan
                </button>
              </div>
              <p className="text-[11px] text-amber-800 leading-snug">
                Pesanan ini sebelumnya dibatalkan karena suku cadang tidak tersedia saat kunjungan. Hasil pemeriksaan tetap tersimpan dan Anda tidak dikenakan biaya diagnosis kedua.
              </p>
            </div>
          )}

          {/* 3. CARD RINGKASAN PEMBAYARAN & FINANSIAL (DINAMIS SESUAI ROLE) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-xs p-5 sm:p-6 space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Ringkasan Pembayaran &amp; Biaya
            </span>

            {/* CUSTOMER BILL BREAKDOWN */}
            {role === "CUSTOMER" && (
              <div className="space-y-4">
                {/* 1. Rincian Pembayaran Pengerjaan */}
                {execPayment ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 text-sm">Rincian Pembayaran Pengerjaan</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        execPayment.status === "PAID"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : execPayment.status === "OVERDUE"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}>
                        {execPayment.status === "PAID"
                          ? "Lunas"
                          : execPayment.status === "OVERDUE"
                          ? "Terlambat"
                          : "Menunggu Pembayaran"}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1 text-slate-600">
                      <div className="flex justify-between items-center">
                        <span>Subtotal Jasa Pengerjaan:</span>
                        <span className="font-mono font-medium text-slate-900">
                          {formatRupiah(execPayment.laborSubtotal || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Subtotal Sparepart Bengkel:</span>
                        <span className="font-mono font-medium text-slate-900">
                          {formatRupiah(execPayment.partsSubtotal || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 font-semibold text-slate-800">
                        <span>Subtotal Pengerjaan:</span>
                        <span className="font-mono">{formatRupiah(execPayment.executionSubtotal || ((execPayment.laborSubtotal || 0) + (execPayment.partsSubtotal || 0)))}</span>
                      </div>
                      <div className="flex justify-between items-center text-primary">
                        <div className="flex items-center gap-1">
                          <span>Biaya Layanan Aplikasi:</span>
                        </div>
                        <span className="font-mono font-bold">+{formatRupiah(execPayment.platformFee || 0)}</span>
                      </div>
                      {execPayment.policyName && (
                        <div className="text-[10px] text-slate-400 italic">
                          Kebijakan: {execPayment.policyName}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                      <span className="font-bold text-slate-900">Total Tagihan Akhir:</span>
                      <span className="font-mono font-bold text-base text-primary">
                        {formatRupiah(execPayment.amount)}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono">
                      Ref: {execPayment.invoiceNo}
                    </div>

                    {/* CONFIRMED LUNAS BANNER */}
                    {execPayment.status === "PAID" && (
                      <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
                          <span className="font-medium">
                            Pembayaran tagihan pengerjaan telah lunas diverifikasi oleh Finance 06. Dana diamankan di penampung resmi.
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-900 shrink-0 ml-2">LUNAS</span>
                      </div>
                    )}

                    {/* INLINE PAYMENT SELECTION & ACTION (FOR INSTANT CUSTOMER PAYMENT / SIMULATION) */}
                    {execPayment.status !== "PAID" && (
                      <div className="pt-3 border-t border-slate-200/80 space-y-3">
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Pilih Metode Pembayaran
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: "QRIS", name: "QRIS Dinamis" },
                              { id: "BCA_VA", name: "BCA Virtual Account" },
                              { id: "MANDIRI_VA", name: "Mandiri VA" },
                              { id: "BRI_VA", name: "BRI Virtual Account" },
                            ].map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setSelectedMethod(m.id)}
                                className={`p-2 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                                  selectedMethod === m.id
                                    ? "border-primary bg-sky-50 text-primary ring-1 ring-primary"
                                    : "border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {m.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Instruction display */}
                        {selectedMethod === "QRIS" ? (
                          <div className="p-3 bg-white rounded-xl border border-slate-200 text-center space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">
                              Scan QRIS via Mobile Banking / E-Wallet
                            </span>
                            <div className="w-28 h-28 mx-auto bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden p-1">
                              <img
                                src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=00020101021226580016ID.CO.SERVIO.WWW01189360099900000123455204581253033605802ID5913SERVIO PAY6007JAKARTA"
                                alt="QRIS Payment Code"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              NMID: ID1020000123456 • SERVIO PAY
                            </span>
                          </div>
                        ) : (
                          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">
                              Nomor Virtual Account ({selectedMethod.replace("_VA", "")})
                            </span>
                            <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-xs font-bold text-slate-900">
                              <span>{execPayment.vaNumber || "827708123456789"}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                                    navigator.clipboard.writeText(execPayment.vaNumber || "827708123456789");
                                  }
                                  setToastMessage("Nomor VA berhasil disalin!");
                                }}
                                className="text-primary hover:underline font-sans font-bold text-[11px] cursor-pointer"
                              >
                                Salin
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              Transfer dapat dilakukan dari ATM, m-Banking, atau internet banking mana pun.
                            </span>
                          </div>
                        )}

                        {/* Pay action buttons */}
                        <div className="space-y-2 pt-1">
                          <button
                            type="button"
                            disabled={isSimulatingPayment}
                            onClick={async () => {
                              setIsSimulatingPayment(true);
                              try {
                                await simulateFinancePayment(
                                  execPayment.paymentId || execPayment.invoiceNo,
                                  "PAID",
                                  order.id,
                                  execPayment.amount
                                );
                                await refreshCurrentOrder(order.id);
                                setToastMessage("Pembayaran berhasil diverifikasi oleh Finance! Pesanan otomatis beralih ke tahap menunggu teknisi menutup kunjungan.");
                              } catch (e: any) {
                                setToastMessage(e?.message || "Gagal memproses pembayaran ke Finance.");
                              } finally {
                                setIsSimulatingPayment(false);
                              }
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle size={16} weight="bold" className={isSimulatingPayment ? "animate-spin" : ""} />
                            <span>
                              {isSimulatingPayment
                                ? "Memverifikasi ke Finance 06..."
                                : `Bayar & Lunasi Tagihan (${formatRupiah(execPayment.amount)}) — Kirim ke Finance 06`}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActivePaymentModal({
                                type: "EXECUTION",
                                invoiceNo: execPayment.invoiceNo,
                                paymentId: execPayment.paymentId,
                                amount: execPayment.amount,
                                method: selectedMethod,
                                vaNumber: execPayment.vaNumber || "827708123456789",
                                expiresAt: execPayment.expiresAt,
                              });
                            }}
                            className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                          >
                            Buka Dialog Pembayaran Lengkap
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
                    Menunggu teknisi menyelesaikan pengerjaan untuk penerbitan tagihan final.
                  </div>
                )}

                {/* 2. Riwayat Biaya Survei (Terpisah & Non-duplicate) */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-950">Riwayat Biaya Survei / Diagnosis</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Lunas
                    </span>
                  </div>

                  <div className="flex justify-between items-center font-mono text-slate-700">
                    <span className="text-slate-500">Nominal Terbayar:</span>
                    <span className="font-bold text-slate-900">{formatRupiah(diagPayment?.amount || 50000)}</span>
                  </div>

                  
                </div>
              </div>
            )}

            {/* WORKER VIEW: HANYA TOTAL AKHIR PEKERJAAN (TANPA POTONGAN & TANPA S-PAY) */}
            {role === "WORKER" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                    <span className="font-bold text-slate-900 text-sm">
                      Ringkasan Pekerjaan Teknisi
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      order.status === "COMPLETED" || execPayment?.status === "PAID"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}>
                      {order.status === "COMPLETED" || execPayment?.status === "PAID"
                        ? "Lunas"
                        : "Menunggu Penyelesaian"}
                    </span>
                  </div>

                  <div className="space-y-2 pt-0.5 text-slate-600">
                    <div className="flex justify-between items-center">
                      <span>Status Pengerjaan:</span>
                      <span className="font-semibold text-slate-800">
                        {order.status === "COMPLETED"
                          ? "Selesai & Diverifikasi"
                          : order.subStatus === "EXECUTING"
                          ? "Sedang Dikerjakan"
                          : "Tugas Aktif"}
                      </span>
                    </div>

                    {order.diagnosis?.costBreakdown?.grandTotal ? (
                      <div className="flex justify-between items-center">
                        <span>Nilai Jasa &amp; Bahan Disetujui:</span>
                        <span className="font-mono font-medium text-slate-900">
                          {formatRupiah(order.diagnosis.costBreakdown.grandTotal)}
                        </span>
                      </div>
                    ) : null}

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                      <span className="font-bold text-slate-900 text-sm">Total Nilai Pengerjaan:</span>
                      <span className="font-mono font-bold text-base text-primary">
                        {order.diagnosis?.costBreakdown?.grandTotal
                          ? formatRupiah(order.diagnosis.costBreakdown.grandTotal)
                          : execPayment?.executionSubtotal
                          ? formatRupiah(execPayment.executionSubtotal)
                          : execPayment?.amount
                          ? formatRupiah(execPayment.amount)
                          : "Menunggu Pemeriksaan Fisik"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-[#0F4C81] leading-relaxed">
                    Pekerjaan resmi ditugaskan oleh Mitra Jasa. Seluruh pencairan hak dan administrasi ditangani terpusat oleh sistem.
                  </div>
                </div>
              </div>
            )}

            {/* PROVIDER / FINANCE / ADMIN: RINCIAN PENDAPATAN LENGKAP DENGAN KEBIJAKAN & POTONGAN CEO */}
            {(role === "PROVIDER" || role === "ADMIN" || role === "FINANCE") && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b border-sky-200/60 pb-2">
                    <span className="font-bold text-[#0F4C81] text-sm uppercase tracking-wide">
                      Rincian Pendapatan Mitra Jasa
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      providerFunds?.status === "AVAILABLE"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}>
                      {providerFunds?.status === "AVAILABLE" ? "AVAILABLE (Siap Tarik)" : "HELD (Ditahan 120 Jam)"}
                    </span>
                  </div>

                  {/* A. Pendapatan Pengerjaan */}
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 block text-[11px]">A. Pendapatan Pengerjaan</span>
                    <div className="flex justify-between items-center text-slate-600 pl-2">
                      <span>• Jasa Pengerjaan:</span>
                      <span className="font-mono">
                        {formatRupiah(
                          order.diagnosis?.costBreakdown?.workTotal ??
                          providerFunds?.laborAmount ??
                          (execPayment?.laborSubtotal || 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 pl-2">
                      <span>• Suku Cadang Bengkel:</span>
                      <span className="font-mono">
                        {formatRupiah(
                          order.diagnosis?.costBreakdown?.sparepartTotal ??
                          providerFunds?.partsAmount ??
                          (execPayment?.partsSubtotal || 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-semibold text-slate-800 pl-2 pt-0.5 border-t border-sky-100">
                      <span>Subtotal Pengerjaan:</span>
                      <span className="font-mono">
                        {formatRupiah(
                          order.diagnosis?.costBreakdown?.grandTotal ??
                          providerFunds?.executionGross ??
                          (execPayment?.executionSubtotal || 0)
                        )}
                      </span>
                    </div>
                  </div>

                  {/* B. Pendapatan Survei/Diagnosis */}
                  <div className="space-y-1 pt-1 border-t border-sky-200/60">
                    <span className="font-bold text-slate-800 block text-[11px]">B. Pendapatan Survei / Diagnosis</span>
                    <div className="flex justify-between items-center text-slate-600 pl-2">
                      <span>• Hak Biaya Diagnosis:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatRupiah(providerFunds?.diagnosisGross ?? (diagPayment?.amount || 50000))}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 pl-2 italic">
                      Diagnosis telah sah terlaksana. Dihitung 1x dalam hak bersih (bebas biaya platform).
                    </p>
                  </div>

                  {/* C. Potongan dan Biaya Platform CEO */}
                  <div className="space-y-1 pt-1 border-t border-sky-200/60">
                    <span className="font-bold text-slate-800 block text-[11px]">C. Potongan Biaya Platform CEO</span>
                    <div className="flex justify-between items-center text-rose-700 pl-2">
                      <span>• Komisi Platform Layanan:</span>
                      <span className="font-mono font-bold">-{formatRupiah(providerFunds?.platformFee ?? 10000)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 pl-2">
                      Kebijakan: {providerFunds?.platformFeeName || "Kebijakan Layanan & Komisi Servis Jasa 2026"} (v{providerFunds?.platformFeeVersion || 1})
                    </div>
                  </div>

                  {/* D. Total Hak Pendapatan Bersih */}
                  <div className="pt-2 border-t-2 border-sky-200 space-y-1">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Total Pendapatan Kotor:</span>
                      <span className="font-mono font-bold">
                        {formatRupiah(providerFunds?.grossAmount ?? ((providerFunds?.executionGross || 200000) + (providerFunds?.diagnosisGross || 50000)))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-rose-600">
                      <span>Total Potongan Platform:</span>
                      <span className="font-mono font-bold">-{formatRupiah(providerFunds?.platformFee ?? 10000)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-sky-200 text-sm font-bold text-[#0F4C81]">
                      <span>Total Hak Bersih Mitra:</span>
                      <span className="font-mono text-base text-primary">
                        {formatRupiah(providerFunds?.netAmount ?? 240000)}
                      </span>
                    </div>
                  </div>

                  {/* S-Pay Wallet Link */}
                  <div className="pt-2">
                    <Link
                      href="/provider/spay"
                      className="w-full py-2 px-3 rounded-xl bg-white border border-[#0F4C81]/30 hover:bg-sky-100 text-[#0F4C81] font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <CurrencyCircleDollar size={16} weight="bold" />
                      <span>Buka Dompet S-Pay Mitra</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* KOLOM KANAN (lg:col-span-5 xl:col-span-5): DATA STATIS (TETAP / PATEN)  */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-6 lg:sticky lg:top-20">
          {/* Card 1: Alamat Pengerjaan & Pelanggan */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-xs p-5 sm:p-6 space-y-3.5 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Alamat Pengerjaan &amp; Pelanggan
            </span>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User size={15} className="text-primary shrink-0" weight="bold" />
                <span className="font-bold text-slate-900">{order.addressSnapshot.recipientName}</span>
                <span className="text-slate-400 font-mono">({order.addressSnapshot.phone})</span>
              </div>

              <div className="flex items-start gap-2 text-slate-600">
                <MapPin size={15} className="text-rose-500 shrink-0 mt-0.5" weight="fill" />
                <p className="leading-snug">
                  {order.addressSnapshot.fullAddress}, {order.addressSnapshot.city}
                </p>
              </div>

              {order.addressSnapshot.notes && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-500 block mb-0.5">Catatan Akses:</span>
                  {order.addressSnapshot.notes}
                </div>
              )}
            </div>

            {/* Jadwal Kunjungan */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-700">
                <CalendarBlank size={14} className="text-primary" weight="bold" />
                <span className="font-semibold">{order.schedule.date}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 font-mono">
                <Clock size={13} className="text-slate-400" />
                <span>{order.schedule.timeSlot}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Layanan Dipesan & Garansi Resmi */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-xs p-5 sm:p-6 space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Layanan Dipesan &amp; Garansi
            </span>

            <div className="flex items-start gap-3.5">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                <img
                  src={order.serviceSnapshot.thumbnailUrl}
                  alt={order.serviceSnapshot.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                    {order.serviceSnapshot.subcategoryName}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {order.serviceSnapshot.serviceMode === "HOME_SERVICE" ? "Kunjungan ke Rumah" : "Bengkel / Workshop"}
                  </span>
                </div>

                <h4 className="text-sm font-bold font-display text-slate-900 leading-tight">
                  {(() => {
                    const rawTitle = order.serviceSnapshot?.title || "";
                    return (!rawTitle || rawTitle.toLowerCase().includes("service offering") || /[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawTitle))
                      ? "Cuci dan Servis AC Split Bergaransi Mandiri Teknik"
                      : rawTitle;
                  })()}
                </h4>

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Buildings size={13} className="text-primary shrink-0" weight="bold" />
                  <span className="font-medium text-slate-800">{order.providerName}</span>
                </div>

                <div className="pt-1">
                  {order.serviceSnapshot.warrantyDurationDays && order.serviceSnapshot.warrantyDurationDays > 0 ? (
                    <div className="space-y-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        <ShieldCheck size={13} weight="fill" className="text-emerald-600" />
                        Garansi {order.serviceSnapshot.warrantyDurationDays} Hari Servio
                      </span>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Jaminan purnajual terproteksi: Perbaikan ulang gratis untuk kendala komponen yang sama selama {order.serviceSnapshot.warrantyDurationDays} hari kalender.
                      </p>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                      Tanpa Garansi
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Keluhan Kerusakan & Bukti Awal */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-xs p-5 sm:p-6 space-y-3.5 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Keluhan &amp; Gejala Kerusakan
            </span>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Keluhan Pelanggan:
              </span>
              <p className="text-slate-800 font-medium leading-relaxed">
                {order.complaint.description}
              </p>

              {order.complaint.symptoms && order.complaint.symptoms.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {order.complaint.symptoms.map((sym, i) => (
                    <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                      {sym}
                    </span>
                  ))}
                </div>
              )}

              {order.complaint.photos && order.complaint.photos.length > 0 && (
                <div className="pt-1.5 flex items-center gap-2 flex-wrap">
                  {order.complaint.photos.map((p, i) => (
                    <a
                      key={i}
                      href={p}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Lihat Foto Kerusakan Awal"
                      className="group/img relative rounded-xl overflow-hidden border border-slate-200 hover:border-primary transition-all cursor-pointer block shadow-2xs"
                    >
                      <img
                        src={p}
                        alt="Kondisi Awal"
                        className="w-14 h-14 object-cover group-hover/img:scale-105 transition-transform"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODALS ATTACHMENTS                                                     */}
      {/* ========================================================================= */}
      {/* Complete Structured Order Summary Modal (Section 26: A-H) */}
      <CompleteOrderSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        order={order}
      />

      {/* Authenticated Timeline Activity History Modal */}
      <OrderActivityHistoryModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        order={order}
      />

      {order.diagnosis && (
        <DiagnosisReviewModal
          isOpen={isDiagnosisReviewOpen}
          onClose={() => setIsDiagnosisReviewOpen(false)}
          diagnosis={order.diagnosis}
          orderNumber={order.orderNumber}
          orderStatus={order.status}
          orderSubStatus={order.subStatus}
          readOnly={role !== "CUSTOMER" || order.status === "COMPLETED" || order.subStatus !== "WAITING_CUSTOMER_CONSENT"}
          isConsentPending={order.subStatus === "WAITING_CUSTOMER_CONSENT"}
          onApproveRemote={async () => {
            setIsActionLoading(true);
            try {
              await respondRemoteConsent(order.id, true);
              try {
                await startExecution(order.id);
              } catch {}
              await refreshCurrentOrder(order.id);
              setIsDiagnosisReviewOpen(false);
              setToastMessage("Rincian biaya disetujui! Status: Pengerjaan Servis Sedang Berlangsung.");
            } catch (err: any) {
              setToastMessage(err?.message || "Gagal menyetujui rincian biaya.");
            } finally {
              setIsActionLoading(false);
            }
          }}
          onRejectRemote={async (reason) => {
            setIsActionLoading(true);
            try {
              await respondRemoteConsent(order.id, false, reason);
              await refreshCurrentOrder(order.id);
              setIsDiagnosisReviewOpen(false);
              setToastMessage("Rincian perbaikan ditolak. Pesanan dibatalkan.");
            } catch (err: any) {
              setToastMessage(err?.message || "Gagal menolak rincian biaya.");
            } finally {
              setIsActionLoading(false);
            }
          }}
          onChangeSparepartSource={() => {
            setIsDiagnosisReviewOpen(false);
            setIsSparepartSourceOpen(true);
          }}
        />
      )}

      {order.diagnosis && (
        <SparepartSourceModal
          isOpen={isSparepartSourceOpen}
          onClose={() => setIsSparepartSourceOpen(false)}
          spareparts={order.diagnosis.costBreakdown.spareparts}
          onSaveSourceSelection={async (updated) => {
            setIsActionLoading(true);
            try {
              const newTotal =
                order.diagnosis!.costBreakdown.workTotal +
                updated.reduce((acc, c) => acc + c.subtotal, 0);
              await submitDiagnosis(order.id, {
                costBreakdown: {
                  ...order.diagnosis!.costBreakdown,
                  spareparts: updated,
                  sparepartTotal: updated.reduce((acc, c) => acc + c.subtotal, 0),
                  grandTotal: newTotal,
                  version: order.diagnosis!.version + 1,
                },
              });
              await refreshCurrentOrder(order.id);
              setToastMessage("Sumber suku cadang diperbarui. Versi rincian baru telah dibuat.");
            } catch (err: any) {
              setToastMessage(err?.message || "Gagal memperbarui sumber suku cadang.");
            } finally {
              setIsActionLoading(false);
            }
          }}
        />
      )}

      {order.followUpDraft && (
        <FollowUpOrderDraftModal
          isOpen={isFollowUpModalOpen}
          onClose={() => setIsFollowUpModalOpen(false)}
          draft={order.followUpDraft}
          onConfirmFollowUp={async (date, slot) => {
            setIsActionLoading(true);
            try {
              await createFollowUpOrder(order.followUpDraft!, date, slot);
              await refreshCurrentOrder(order.id);
              setToastMessage("Order Lanjutan berhasil dijadwalkan tanpa biaya diagnosis kedua!");
            } catch (err: any) {
              setToastMessage(err?.message || "Gagal membuat order lanjutan.");
            } finally {
              setIsActionLoading(false);
            }
          }}
        />
      )}

      {/* Worker Modals */}
      <WorkerDiagnosisFormModal
        isOpen={isWorkerDiagnosisOpen}
        onClose={() => setIsWorkerDiagnosisOpen(false)}
        order={order}
        onSubmitDiagnosis={async (diag) => {
          setIsActionLoading(true);
          try {
            await submitDiagnosis(order.id, diag);
            await refreshCurrentOrder(order.id);
            setToastMessage("Hasil pemeriksaan & rincian biaya berhasil dikirimkan ke pelanggan.");
          } catch (err: any) {
            setToastMessage(err?.message || "Gagal mengirimkan rincian pemeriksaan.");
          } finally {
            setIsActionLoading(false);
          }
        }}
        onAcceptInPerson={async (diag) => {
          setIsActionLoading(true);
          try {
            await submitDiagnosis(order.id, diag);
            await recordInPersonConsent(order.id, "Persetujuan lisan di lokasi dicatat resmi oleh teknisi.");
            try {
              await startExecution(order.id);
            } catch {}
            await refreshCurrentOrder(order.id);
            setToastMessage("Persetujuan di lokasi berhasil dicatat! Status: Pengerjaan Servis Dimulai.");
          } catch (err: any) {
            setToastMessage(err?.message || "Gagal mencatat persetujuan di lokasi.");
          } finally {
            setIsActionLoading(false);
          }
        }}
      />

      <WorkerInPersonConsentModal
        isOpen={isWorkerConsentOpen}
        onClose={() => setIsWorkerConsentOpen(false)}
        order={order}
        onRecordConsent={async (notes) => {
          setIsActionLoading(true);
          try {
            await recordInPersonConsent(order.id, notes);
            try {
              await startExecution(order.id);
            } catch {}
            await refreshCurrentOrder(order.id);
            setToastMessage("Persetujuan lisan di lokasi telah dicatat resmi. Pengerjaan servis sedang berlangsung!");
          } catch (err: any) {
            setToastMessage(err?.message || "Gagal mencatat persetujuan.");
          } finally {
            setIsActionLoading(false);
          }
        }}
      />

      <WorkerFinishFormModal
        isOpen={isWorkerFinishOpen}
        onClose={() => setIsWorkerFinishOpen(false)}
        order={order}
        onFinishJob={async (data) => {
          setIsActionLoading(true);
          try {
            await finishExecution(order.id, data);
            await refreshCurrentOrder(order.id);
            setToastMessage("Pekerjaan berhasil diselesaikan! Tagihan pelunasan dikirimkan ke pelanggan.");
          } catch (err: any) {
            setToastMessage(err?.message || "Gagal menyelesaikan pekerjaan.");
          } finally {
            setIsActionLoading(false);
          }
        }}
      />

      {/* Provider Modal */}
      <ProviderAssignWorkerModal
        isOpen={isProviderAssignOpen}
        onClose={() => setIsProviderAssignOpen(false)}
        order={order}
        onConfirmAssign={async (workerId, workerName, workerPhone) => {
          setIsActionLoading(true);
          try {
            await assignWorker(order.id, workerId, workerName, workerPhone);
            await refreshCurrentOrder(order.id);
            setToastMessage(`Teknisi ${workerName} berhasil ditugaskan. Batas waktu konfirmasi 30 menit.`);
          } catch (err: any) {
            setToastMessage(err?.message || "Gagal menugaskan teknisi.");
          } finally {
            setIsActionLoading(false);
          }
        }}
      />

      {/* Provider Order Rejection Modal with Section 50 S-Pay Guarantee */}
      {showProviderRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <WarningCircle size={20} weight="fill" />
                <span>Tolak &amp; Batalkan Pesanan</span>
              </div>
              <button
                type="button"
                onClick={() => setShowProviderRejectModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                Anda akan menolak pesanan <strong className="text-slate-900 font-bold">#{order.orderNumber}</strong> ({order.serviceSnapshot.title}) dari pelanggan <strong className="text-slate-900 font-bold">{order.customerName}</strong>.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={15} weight="fill" className="text-amber-600 shrink-0" />
                  Jaminan S-Pay Pelanggan (Section 50)
                </span>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Jika pelanggan telah membayar biaya diagnosis/survei, dana sebesar <strong className="font-bold">Rp {(order.serviceSnapshot.diagnosisFee || 50000).toLocaleString("id-ID")}</strong> akan otomatis dikembalikan 100% ke akun S-Pay pelanggan tanpa potongan.
                </p>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!providerRejectReason.trim()) return;
                setIsActionLoading(true);
                try {
                  await rejectOrder(order.id, providerRejectReason.trim());
                  await refreshCurrentOrder(order.id);
                  setShowProviderRejectModal(false);
                  setToastMessage(`Pesanan #${order.orderNumber} telah ditolak. Jika ada biaya diagnosis terbayar, dana telah di-refund 100% ke akun S-Pay pelanggan.`);
                } catch (err: any) {
                  setToastMessage(err?.message || "Gagal menolak pesanan.");
                } finally {
                  setIsActionLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={providerRejectReason}
                  onChange={(e) => setProviderRejectReason(e.target.value)}
                  placeholder="Contoh: Jadwal operasional penuh, kapasitas servis tidak mencukupi, atau alamat di luar jangkauan."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "Jadwal teknisi penuh",
                    "Kapasitas servis tidak mencukupi",
                    "Alamat di luar area jangkauan",
                    "Peralatan servis sedang maintenance",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setProviderRejectReason(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                        providerRejectReason === preset
                          ? "bg-rose-50 border-rose-300 text-rose-700 font-bold"
                          : "bg-slate-100 border-transparent hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => setShowProviderRejectModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || providerRejectReason.trim().length < 3}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isActionLoading ? (
                    <>
                      <ArrowsClockwise size={14} weight="bold" className="animate-spin" />
                      <span>Memproses Refund...</span>
                    </>
                  ) : (
                    "Konfirmasi Tolak & Refund 100%"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Worker Task Rejection Modal */}
      {showWorkerRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <XCircle size={22} weight="bold" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900">
                    Tolak Penugasan Pekerjaan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Order #{order.orderNumber} • {order.serviceSnapshot.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkerRejectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <p className="font-bold mb-1">Perhatian Teknisi:</p>
                <p>
                  Penolakan tugas akan mengembalikan pesanan ke antrean Provider agar dapat ditugaskan ke teknisi lain. Pelanggan tidak perlu melakukan pemesanan ulang.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Pilih Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    "Jadwal bentrok dengan pekerjaan lain",
                    "Keahlian atau perlengkapan tidak sesuai dengan keluhan pelanggan",
                    "Jarak lokasi / kendala transportasi di luar jangkauan operasional",
                    "Kondisi darurat operasional / kesehatan",
                    "Lainnya",
                  ].map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                        workerRejectReason === opt
                          ? "border-rose-400 bg-rose-50/50 text-rose-950 font-semibold"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="workerRejectReasonModal"
                        value={opt}
                        checked={workerRejectReason === opt}
                        onChange={() => setWorkerRejectReason(opt)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Tambahkan detail kendala operasional untuk pihak Provider..."
                  value={workerRejectNotes}
                  onChange={(e) => setWorkerRejectNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => setShowWorkerRejectModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={isActionLoading || !workerRejectReason}
                onClick={async () => {
                  setIsActionLoading(true);
                  try {
                    const finalReason = workerRejectNotes.trim()
                      ? `${workerRejectReason}: ${workerRejectNotes.trim()}`
                      : workerRejectReason;
                    await rejectAssignment(order.id, finalReason);
                    await refreshCurrentOrder(order.id);
                    setToastMessage(`Penugasan #${order.orderNumber} telah ditolak. Pesanan dikembalikan ke antrean Provider.`);
                    setShowWorkerRejectModal(false);
                  } catch (err: any) {
                    setToastMessage(err?.message || "Gagal menolak tugas.");
                  } finally {
                    setIsActionLoading(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle size={15} weight="bold" />
                <span>{isActionLoading ? "Menolak..." : "Konfirmasi Tolak Tugas"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-100">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0">
                <WarningCircle size={22} weight="fill" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">Batalkan Pesanan Servis</h3>
                <p className="text-[11px] text-slate-500">Konfirmasi pembatalan pesanan dan rincian pengembalian dana</p>
              </div>
            </div>

            {/* Service & Order Context */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Nomor Pesanan:</span>
                <span className="font-mono font-bold text-slate-800">#{order.orderNumber}</span>
              </div>
              <div className="flex items-start justify-between text-[11px] gap-2">
                <span className="text-slate-400 shrink-0">Layanan:</span>
                <span className="font-semibold text-slate-800 text-right line-clamp-1">
                  {(() => {
                    const rawTitle = order.serviceSnapshot?.title || "";
                    return (!rawTitle || rawTitle.toLowerCase().includes("service offering") || /[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawTitle))
                      ? "Cuci dan Servis AC Split Bergaransi Mandiri Teknik"
                      : rawTitle;
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                <span className="text-slate-400">Biaya Diagnosis:</span>
                <span className="font-bold text-slate-900">
                  {formatRupiah(order.paymentSummary.diagnosisPayment?.amount || 50000)}
                </span>
              </div>
            </div>

            {/* Refund Info Banner */}
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-900 space-y-1">
              <span className="font-bold block flex items-center gap-1.5 text-emerald-800">
                <ShieldCheck size={14} weight="fill" className="text-emerald-600 shrink-0" />
                <span>Pengembalian Dana 100% (Full Refund)</span>
              </span>
              <p className="text-emerald-700 leading-snug">
                Pembatalan sebelum teknisi berangkat (OTW) berhak atas pengembalian dana diagnosis penuh ke saldo S-Pay Anda secara otomatis.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Pembatalan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Tuliskan alasan pembatalan (misal: jadwal mendadak berubah)..."
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim() || isActionLoading}
                onClick={async () => {
                  setIsActionLoading(true);
                  try {
                    await cancelBooking(order.id, cancelReason);
                    await refreshCurrentOrder(order.id);
                    setShowCancelModal(false);
                    setToastMessage("Pesanan berhasil dibatalkan.");
                  } catch (err: any) {
                    setToastMessage(err?.message || "Gagal membatalkan pesanan.");
                  } finally {
                    setIsActionLoading(false);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs disabled:opacity-50 transition shadow-xs"
              >
                {isActionLoading ? "Membatalkan..." : "Konfirmasi Batal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Payment Gateway Modal */}
      {activePaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-primary flex items-center justify-center font-bold">
                  <CreditCard size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activePaymentModal.type === "DIAGNOSIS" ? "Pembayaran Biaya Diagnosis" : "Pelunasan Tagihan Pekerjaan"}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Invoice #{activePaymentModal.invoiceNo}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePaymentModal(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tagihan</span>
              <div className="text-2xl font-bold font-display text-slate-900 font-mono">
                {formatRupiah(activePaymentModal.amount)}
              </div>
              <span className="text-[10px] text-slate-500 block">SLA Pembayaran: 6 Jam sejak diterbitkan</span>
            </div>

            {/* Metode Pembayaran */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Pilih Metode Pembayaran
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "QRIS", name: "QRIS Dinamis" },
                  { id: "BCA_VA", name: "BCA Virtual Account" },
                  { id: "MANDIRI_VA", name: "Mandiri VA" },
                  { id: "BRI_VA", name: "BRI Virtual Account" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMethod(m.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                      selectedMethod === m.id
                        ? "border-primary bg-sky-50/60 text-primary ring-1 ring-primary"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Instruction display */}
            {selectedMethod === "QRIS" ? (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Scan QRIS melalui aplikasi banking/e-wallet Anda</span>
                <div className="w-36 h-36 mx-auto bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden p-2">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=00020101021226580016ID.CO.SERVIO.WWW01189360099900000123455204581253033605802ID5913SERVIO PAY6007JAKARTA"
                    alt="QRIS Payment Code"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block font-mono">NMID: ID1020000123456 • SERVIO PAY</span>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Nomor Virtual Account</span>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 font-mono text-sm font-bold text-slate-900">
                  <span>{activePaymentModal.vaNumber || "827708123456789"}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.clipboard) {
                        navigator.clipboard.writeText(activePaymentModal.vaNumber || "827708123456789");
                      }
                      setToastMessage("Nomor VA disalin ke clipboard!");
                    }}
                    className="text-xs text-primary hover:underline font-sans font-bold"
                  >
                    Salin
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 block">Bank menerima pembayaran dari semua channel ATM &amp; m-Banking.</span>
              </div>
            )}

            <div className="pt-2 space-y-2">
              <button
                type="button"
                disabled={isSimulatingPayment}
                onClick={async () => {
                  setIsSimulatingPayment(true);
                  try {
                    await simulateFinancePayment(activePaymentModal.paymentId || activePaymentModal.invoiceNo, "PAID");
                    await refreshCurrentOrder(order.id);
                    setToastMessage("Pembayaran berhasil diverifikasi oleh Finance 06! Pesanan otomatis diperbarui.");
                    setActivePaymentModal(null);
                  } catch (e: any) {
                    setToastMessage(e?.message || "Gagal memproses simulasi pembayaran.");
                  } finally {
                    setIsSimulatingPayment(false);
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle size={16} weight="bold" className={isSimulatingPayment ? "animate-spin" : ""} />
                <span>{isSimulatingPayment ? "Memverifikasi ke Finance 06..." : "Bayar Sekarang (Simulasi Real Finance 06)"}</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePaymentModal(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition"
              >
                Tutup &amp; Bayar Nanti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 07 Service Order Review Modal (C06 / C07) */}
      <OrderReviewModal
        isOpen={isServiceReviewModalOpen}
        onClose={() => setIsServiceReviewModalOpen(false)}
        target={{
          sourceKind: "SERVICE",
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderedAt: order.createdAt,
          completedAt: (order as any).completedAt || order.updatedAt,
          businessOrgId: order.providerId || "prov-surya-teknik",
          businessName: order.providerName || "Penyedia Jasa",
          items: [
            {
              orderItemId: order.id,
              targetId: (order as any).serviceId || order.serviceSnapshot.id || order.id,
              title: order.serviceSnapshot.title,
              quantity: 1,
              variantLabel: order.serviceSnapshot.categoryName,
              price: (order as any).pricing?.finalTotal ?? order.paymentSummary?.executionPayment?.amount ?? (order.serviceSnapshot as any).minPrice,
            },
          ],
          existingSubmission: existingServiceReview,
        }}
        onSubmitted={(sub) => {
          setExistingServiceReview(sub);
          setToastMessage("Penilaian layanan jasa dan penyedia berhasil disimpan!");
        }}
      />

      {/* Phase 07 Service Warranty Claim Modal (C13) */}
      {isServiceClaimModalOpen && associatedWarranty && (
        <WarrantyClaimModal
          isOpen={isServiceClaimModalOpen}
          onClose={() => setIsServiceClaimModalOpen(false)}
          warranty={associatedWarranty}
          onSuccess={() => {
            setIsServiceClaimModalOpen(false);
            setToastMessage("Klaim garansi layanan jasa berhasil diajukan!");
          }}
        />
      )}
    </div>
  );
}
