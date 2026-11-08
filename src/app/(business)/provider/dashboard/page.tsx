"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ClipboardText,
  ClockCountdown,
  ArrowRight,
  Storefront,
  WarningCircle,
  ShieldCheck,
  Wrench,
  Users,
  CheckCircle,
  CurrencyCircleDollar,
  Package,
  FileText,
  MagnifyingGlass,
  SlidersHorizontal,
  Timer,
  Warning,
  HourglassMedium,
  CheckSquareOffset,
  Sparkle,
  Star,
  Tag,
  Phone,
  ChatCircleText,
  ArrowsClockwise,
  User,
  PlusCircle,
  X,
  PaperPlaneTilt,
  Lightbulb,
  ThumbsDown,
  Buildings,
  Check,
  ArrowUpRight,
  ChartLineUp,
  MapPin,
} from "@phosphor-icons/react";
import { useActiveRole } from "@/context/RoleContext";
import { useProviderOperations } from "@/features/provider/useProviderOperations";
import { useOrderJasa } from "@/features/order-jasa/hooks/useOrderJasa";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useSPay } from "@/features/spay/spay.frontend-provider";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { SPayBalanceCard } from "@/components/features/spay/SPayBalanceCard";
import { ProviderAssignWorkerModal } from "@/features/order-jasa/components/provider/ProviderAssignWorkerModal";
import { ServiceOrder } from "@/features/order-jasa/types";
import { Toast } from "@/components/feedback/Toast";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { providerApi, ApiWorker, organizationApi } from "@/lib/servioApi";
import { afterSalesApi, ReviewEntryDto, BusinessReviewSummary } from "@/lib/afterSalesApi";

type DashboardTab = "OPERATIONAL" | "WORKFORCE" | "ANALYTICS";
type SalesTimeframe = "7_DAYS" | "30_DAYS";
type OrderTableFilter = "ALL" | "BOOKING_MASUK" | "PENUGASAN" | "OTORISASI_QA" | "BERLANGSUNG" | "SELESAI";
type WorkforceFilter = "ALL" | "STANDBY" | "ON_DUTY" | "OFFLINE";

interface CriticalReviewItem {
  id: string;
  customerName: string;
  rating: number;
  serviceTitle: string;
  date: string;
  comment: string;
  evaluationCategory: "KETEPATAN WAKTU" | "KERAPIHAN KERJA" | "KOMUNIKASI BIAYA" | "KUALITAS LAYANAN";
  evaluationInsight: string;
  replyText?: string | null;
}

// Helpers for ServiceOrder fields from database
function getOrderStageBadge(order: ServiceOrder): { label: string; className: string } {
  if (order.status === "COMPLETED") {
    return { label: "Selesai", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (order.status === "CANCELLED") {
    return { label: "Dibatalkan", className: "bg-slate-100 text-slate-500 border-slate-200" };
  }
  if (order.providerDecisionStatus === "PENDING") {
    return { label: "Booking Masuk", className: "bg-rose-50 text-rose-700 border-rose-200 font-bold" };
  }
  if (order.subStatus === "UNASSIGNED" || order.subStatus === "ASSIGNED_PENDING" || !order.assignment?.workerName) {
    return { label: "Menunggu Penugasan", className: "bg-purple-50 text-purple-700 border-purple-200" };
  }
  if (order.subStatus === "WORKER_OTW") {
    return { label: "Menuju Lokasi", className: "bg-amber-50 text-amber-800 border-amber-200" };
  }
  if (order.subStatus === "WORKER_ARRIVED") {
    return { label: "Tiba di Lokasi", className: "bg-amber-50 text-amber-800 border-amber-200" };
  }
  if (order.subStatus === "DIAGNOSING") {
    return { label: "Sedang Diagnosis", className: "bg-sky-50 text-sky-700 border-sky-200" };
  }
  if (order.subStatus === "WAITING_CUSTOMER_CONSENT") {
    return { label: "Menunggu Persetujuan Biaya", className: "bg-orange-50 text-orange-700 border-orange-200 font-bold" };
  }
  if (order.subStatus === "PRICE_APPROVED" || order.subStatus === "EXECUTING") {
    return { label: "Pengerjaan Servis", className: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  if (order.subStatus === "WORK_FINISHED" || order.subStatus === "AWAITING_CUSTOMER_CONFIRMATION") {
    return { label: "Verifikasi QA", className: "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold" };
  }
  return { label: order.subStatus || order.status, className: "bg-slate-100 text-slate-700 border-slate-200" };
}

function getOrderStageLabel(order: ServiceOrder): string {
  return getOrderStageBadge(order).label;
}

function getOrderPrice(order: ServiceOrder): number {
  return (
    order.paymentSummary?.executionPayment?.amount ||
    order.paymentSummary?.diagnosisPayment?.amount ||
    order.diagnosis?.costBreakdown?.grandTotal ||
    order.serviceSnapshot?.basePrice ||
    order.serviceSnapshot?.diagnosisFee ||
    0
  );
}

function getOrderScheduleText(order: ServiceOrder): string {
  if (order.schedule?.date) {
    return `${order.schedule.date}${order.schedule.timeSlot ? `, ${order.schedule.timeSlot}` : ""}`;
  }
  return "Hari ini";
}

export default function ProviderDashboardPage() {
  const { user } = useActiveRole();
  const currentOrgName =
    user?.activeOrganization?.name ||
    (user as any)?.businessProfile?.name ||
    user?.name ||
    "Bengkel Mitra Servio";

  // Main Dashboard Tab: Operasional vs Monitoring Teknisi vs Analitik
  const [activeTab, setActiveTab] = useState<DashboardTab>("OPERATIONAL");

  // Filters
  const [salesTimeframe, setSalesTimeframe] = useState<SalesTimeframe>("7_DAYS");
  const [orderTableFilter, setOrderTableFilter] = useState<OrderTableFilter>("ALL");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [workforceFilter, setWorkforceFilter] = useState<WorkforceFilter>("ALL");
  const [workforceSearchQuery, setWorkforceSearchQuery] = useState("");

  // Context & Hooks
  const { summary: spaySummary, isBalanceVisible, toggleBalanceVisibility } = useSPay();
  const { storeStatus, updateStoreStatus, workers: repoWorkers } = useProviderOperations();
  const {
    orders,
    providerOrdersByTab,
    providerTabCounts,
    acceptOrder,
    assignWorker,
    refresh: refreshOrders,
  } = useOrderJasa();
  const { cases } = useAfterSales();

  // Toast & Modals
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [assigningOrder, setAssigningOrder] = useState<ServiceOrder | null>(null);
  const [replyModalTarget, setReplyModalTarget] = useState<CriticalReviewItem | null>(null);
  const [replyInputText, setReplyInputText] = useState("");
  const [criticalReviews, setCriticalReviews] = useState<CriticalReviewItem[]>([]);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Live Backend States
  const [apiWorkers, setApiWorkers] = useState<ApiWorker[]>([]);
  const [reviews, setReviews] = useState<ReviewEntryDto[]>([]);
  const [reviewSummary, setReviewSummary] = useState<BusinessReviewSummary | null>(null);
  const [coverageRadiusKm, setCoverageRadiusKm] = useState<number>(15);
  const [coverageCitiesCount, setCoverageCitiesCount] = useState<number>(5);

  // 1. Load Workers from backend database
  const loadWorkers = useCallback(async () => {
    try {
      const res = await providerApi.getWorkers();
      if (res.data && Array.isArray(res.data)) {
        setApiWorkers(res.data);
      }
    } catch {
      // fallback to repo
    }
  }, []);

  // 2. Load Coverage Settings from backend database
  const loadCoverage = useCallback(async () => {
    try {
      const orgId = user?.activeOrganization?.id || (user as any)?.organizationId;
      if (!orgId) return;
      const res = await organizationApi.getCoverage(orgId);
      if (res.data) {
        if (res.data.coverageRadiusKm !== null && res.data.coverageRadiusKm !== undefined) {
          setCoverageRadiusKm(res.data.coverageRadiusKm);
        }
        if (res.data.serviceAreas && Array.isArray(res.data.serviceAreas)) {
          setCoverageCitiesCount(res.data.serviceAreas.length);
        }
      }
    } catch {
      // fallback keep defaults
    }
  }, [user]);

  // 3. Load Reviews from backend database
  const loadReviews = useCallback(async () => {
    try {
      const orgId = user?.activeOrganization?.id || (user as any)?.organizationId;
      const targetIds = orgId ? [orgId] : [];
      const [revRes, sumRes] = await Promise.allSettled([
        afterSalesApi.business.getReviews(),
        targetIds.length > 0
          ? afterSalesApi.public.getBatchRatingsSummary("PROVIDER", targetIds)
          : Promise.resolve({ data: null }),
      ]);
      if (revRes.status === "fulfilled" && revRes.value?.data && Array.isArray(revRes.value.data)) {
        setReviews(revRes.value.data);
        const lowReviews = revRes.value.data.filter((r) => r.rating <= 2);
        setCriticalReviews(
          lowReviews.map((r, idx) => ({
            id: r.id || `crit-${idx}`,
            customerName:
              (r as any).customer_display_name ||
              (r as any).customer_name ||
              (r as any).submission?.customer_display_name ||
              "Pelanggan Servio",
            rating: r.rating,
            serviceTitle:
              (r as any).target_title ||
              (r as any).service_name ||
              (r as any).service_snapshot?.title ||
              "Layanan Servis",
            date: r.created_at
              ? new Date(r.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "Baru saja",
            comment: (r as any).text || (r as any).comment || "Kendala hasil pengerjaan servis",
            evaluationCategory:
              r.rating === 1 ? "KERAPIHAN KERJA" : "KETEPATAN WAKTU",
            evaluationInsight:
              "Tinjau SOP pengerjaan teknisi pada order ini untuk mencegah komplain berulang.",
            replyText:
              (r as any).reply?.reply_text ||
              (r as any).reply?.text ||
              (r as any).official_reply?.comment ||
              null,
          }))
        );
      }
      if (sumRes.status === "fulfilled" && (sumRes.value as any)?.data) {
        setReviewSummary((sumRes.value as any).data);
      }
    } catch (err) {
      console.warn("Reviews load warning:", err);
    }
  }, [user]);

  useEffect(() => {
    loadWorkers();
    loadReviews();
    loadCoverage();
  }, [loadWorkers, loadReviews, loadCoverage]);

  // Combined Active Orders
  const activeOrders = useMemo(() => {
    return orders.filter(
      (o) => !["COMPLETED", "CANCELLED", "REFUNDED"].includes(o.status)
    );
  }, [orders]);

  // Active Warranty Claims for Provider
  const activeClaims = useMemo(() => {
    return cases.filter(
      (c) =>
        (c.caseType === "claim_service" || c.organizationType === "PROVIDER") &&
        !["COMPLETED", "REJECTED", "CANCELLED"].includes(c.mainStatus)
    );
  }, [cases]);

  // Merged Workers List (from API Workers with fallback to local personnel)
  const mergedWorkers = useMemo(() => {
    if (apiWorkers.length > 0) {
      return apiWorkers.map((w) => ({
        id: w.id,
        name: w.fullName || w.name,
        phone: w.phone || "-",
        specialization:
          w.specialization && w.specialization.length > 0
            ? w.specialization
            : w.skills && w.skills.length > 0
            ? w.skills
            : ["Teknisi Lapangan"],
        isOnline: w.isOnline ?? true,
        rating: w.rating || 5.0,
        completedJobs: w.completedJobs || 0,
        vehicleNumber: w.vehicleNumber || "-",
      }));
    }
    return repoWorkers.map((w) => ({
      id: w.id,
      name: w.name,
      phone: w.phone || "-",
      specialization:
        w.specialization && w.specialization.length > 0
          ? w.specialization
          : ["Teknisi Servis"],
      isOnline: w.isOnline ?? true,
      rating: (w as any).rating || 5.0,
      completedJobs: (w as any).completedJobs || 0,
      vehicleNumber: (w as any).vehicleNumber || "-",
    }));
  }, [apiWorkers, repoWorkers]);

  // Map Active Orders to Workers
  const workerActiveJobMap = useMemo(() => {
    const map = new Map<string, ServiceOrder>();
    activeOrders.forEach((o) => {
      const workerId = o.assignment?.workerId;
      const workerName = o.assignment?.workerName?.toLowerCase();
      if (workerId) map.set(workerId, o);
      if (workerName) map.set(workerName, o);
    });
    return map;
  }, [activeOrders]);

  // Enriched Workers with Live Status
  const enrichedWorkers = useMemo(() => {
    return mergedWorkers.map((worker) => {
      const activeJob =
        workerActiveJobMap.get(worker.id) ||
        workerActiveJobMap.get(worker.name.toLowerCase());

      let statusType: "STANDBY" | "ON_DUTY" | "OFFLINE" = "OFFLINE";
      let statusLabel = "Offline";
      let statusColor = "bg-slate-100 text-slate-600 border-slate-200";

      if (!worker.isOnline) {
        statusType = "OFFLINE";
        statusLabel = "Offline (Tidak Bertugas)";
        statusColor = "bg-slate-100 text-slate-600 border-slate-200";
      } else if (activeJob) {
        statusType = "ON_DUTY";
        if (activeJob.subStatus === "WORKER_OTW") {
          statusLabel = "Menuju Lokasi Pelanggan";
          statusColor = "bg-amber-100 text-amber-900 border-amber-300";
        } else if (activeJob.subStatus === "DIAGNOSING" || activeJob.subStatus === "WORKER_ARRIVED") {
          statusLabel = "Sedang Melakukan Diagnosis";
          statusColor = "bg-sky-100 text-sky-900 border-sky-300";
        } else if (activeJob.subStatus === "WAITING_CUSTOMER_CONSENT") {
          statusLabel = "Menunggu Otorisasi Biaya";
          statusColor = "bg-orange-100 text-orange-900 border-orange-300";
        } else if (activeJob.subStatus === "WORK_FINISHED" || activeJob.subStatus === "AWAITING_CUSTOMER_CONFIRMATION") {
          statusLabel = "Menunggu Verifikasi QA";
          statusColor = "bg-purple-100 text-purple-900 border-purple-300";
        } else {
          statusLabel = "Sedang Mengerjakan Servis";
          statusColor = "bg-blue-100 text-blue-900 border-blue-300";
        }
      } else {
        statusType = "STANDBY";
        statusLabel = "Siaga di Workshop (Siap Ditugaskan)";
        statusColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
      }

      return {
        ...worker,
        statusType,
        statusLabel,
        statusColor,
        activeJob,
      };
    });
  }, [mergedWorkers, workerActiveJobMap]);

  // Fleet Stats Counts
  const standbyCount = enrichedWorkers.filter((w) => w.statusType === "STANDBY").length;
  const onDutyCount = enrichedWorkers.filter((w) => w.statusType === "ON_DUTY").length;
  const offlineCount = enrichedWorkers.filter((w) => w.statusType === "OFFLINE").length;

  // Filtered Workers for Workforce Tab
  const filteredWorkforce = useMemo(() => {
    return enrichedWorkers.filter((w) => {
      if (workforceFilter === "STANDBY" && w.statusType !== "STANDBY") return false;
      if (workforceFilter === "ON_DUTY" && w.statusType !== "ON_DUTY") return false;
      if (workforceFilter === "OFFLINE" && w.statusType !== "OFFLINE") return false;

      if (workforceSearchQuery.trim()) {
        const q = workforceSearchQuery.toLowerCase();
        const matchName = w.name.toLowerCase().includes(q);
        const matchSpec = w.specialization.some((s) => s.toLowerCase().includes(q));
        const matchJob =
          w.activeJob?.orderNumber.toLowerCase().includes(q) ||
          w.activeJob?.serviceSnapshot.title.toLowerCase().includes(q);
        return matchName || matchSpec || matchJob;
      }
      return true;
    });
  }, [enrichedWorkers, workforceFilter, workforceSearchQuery]);

  // Action Center Items (Urgent Attention Queue)
  const actionItems = useMemo(() => {
    const items: {
      id: string;
      type: "BOOKING_MASUK" | "PENUGASAN" | "PRICE_AUTH" | "PROOF_REVIEW" | "WARRANTY_CLAIM";
      title: string;
      subtitle: string;
      badge: string;
      badgeColor: string;
      actionLabel: string;
      actionHref?: string;
      onAction?: () => void;
    }[] = [];

    // 1. Booking Masuk Butuh Konfirmasi
    if (providerTabCounts.BOOKING_MASUK > 0) {
      const firstBooking = providerOrdersByTab.BOOKING_MASUK?.[0];
      items.push({
        id: "act-booking",
        type: "BOOKING_MASUK",
        title: `${providerTabCounts.BOOKING_MASUK} Booking Servis Baru Masuk Menunggu Penerimaan`,
        subtitle: firstBooking
          ? `${firstBooking.serviceSnapshot.title} • Klien: ${firstBooking.customerName}`
          : "Konfirmasi reservasi pelanggan sebelum batas waktu kedaluwarsa.",
        badge: "Booking Baru",
        badgeColor: "bg-rose-100 text-rose-900 border-rose-200",
        actionLabel: "Terima & Tugaskan",
        onAction: () => {
          if (firstBooking) {
            handleAcceptOrder(firstBooking);
          } else {
            setActiveTab("OPERATIONAL");
            setOrderTableFilter("BOOKING_MASUK");
          }
        },
      });
    }

    // 2. Perlu Penugasan Teknisi
    if (providerTabCounts.PENUGASAN > 0) {
      const unassignedOrder = providerOrdersByTab.PENUGASAN?.[0];
      items.push({
        id: "act-unassigned",
        type: "PENUGASAN",
        title: `${providerTabCounts.PENUGASAN} Order Diterima Belum Memiliki Teknisi`,
        subtitle: unassignedOrder
          ? `#${unassignedOrder.orderNumber} • ${unassignedOrder.serviceSnapshot.title}`
          : "Pilih teknisi yang sedang siaga untuk segera diberangkatkan ke lokasi.",
        badge: "Pilih Teknisi",
        badgeColor: "bg-purple-100 text-purple-900 border-purple-200",
        actionLabel: "Tugaskan Teknisi",
        onAction: () => {
          if (unassignedOrder) {
            setAssigningOrder(unassignedOrder);
          } else {
            setActiveTab("OPERATIONAL");
            setOrderTableFilter("PENUGASAN");
          }
        },
      });
    }

    // 3. Otorisasi Biaya Tambahan dari Diagnosis Teknisi
    orders.forEach((o) => {
      if (
        o.subStatus === "WAITING_CUSTOMER_CONSENT" ||
        o.diagnosis?.status === "SUBMITTED"
      ) {
        items.push({
          id: `act-auth-${o.id}`,
          type: "PRICE_AUTH",
          title: `Otorisasi Penyesuaian Biaya (${o.assignment?.workerName || "Teknisi Lapangan"})`,
          subtitle: `${o.serviceSnapshot.title} • Nilai: Rp ${getOrderPrice(o).toLocaleString("id-ID")}`,
          badge: "Otorisasi Biaya",
          badgeColor: "bg-amber-100 text-amber-900 border-amber-200",
          actionLabel: "Tinjau Biaya",
          actionHref: `/provider/orders/${o.id}`,
        });
      }
    });

    // 4. Verifikasi Bukti Servis QA
    orders.forEach((o) => {
      if (
        o.subStatus === "WORK_FINISHED" ||
        o.subStatus === "AWAITING_CUSTOMER_CONFIRMATION" ||
        (o.execution?.afterPhotos && o.execution.afterPhotos.length > 0)
      ) {
        items.push({
          id: `act-proof-${o.id}`,
          type: "PROOF_REVIEW",
          title: `Hasil Servis Siap Diverifikasi QA (${o.assignment?.workerName || "Teknisi"})`,
          subtitle: `${o.serviceSnapshot.title} • ${o.customerName}`,
          badge: "Verifikasi QA",
          badgeColor: "bg-sky-100 text-sky-900 border-sky-200",
          actionLabel: "Verifikasi Bukti",
          actionHref: `/provider/orders/${o.id}`,
        });
      }
    });

    // 5. Klaim Garansi Aktif Masuk
    if (activeClaims.length > 0) {
      const claim = activeClaims[0];
      items.push({
        id: "act-claim",
        type: "WARRANTY_CLAIM",
        title: `${activeClaims.length} Tiket Klaim Garansi Purnajual Masuk`,
        subtitle: `Komplain: ${claim.issueReason || "Permintaan servis ulang pelanggan"} • ${claim.itemTitle || "Jasa Servis"}`,
        badge: "Klaim Garansi",
        badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-200",
        actionLabel: "Tinjau Klaim",
        actionHref: `/provider/warranty/requests`,
      });
    }

    return items;
  }, [providerTabCounts, providerOrdersByTab, orders, activeClaims]);

  // Orders needing Authorization or QA verification
  const authAndQaOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        !["COMPLETED", "CANCELLED"].includes(o.status) &&
        (o.subStatus === "WAITING_CUSTOMER_CONSENT" ||
          o.diagnosis?.status === "SUBMITTED" ||
          o.subStatus === "WORK_FINISHED" ||
          o.subStatus === "AWAITING_CUSTOMER_CONFIRMATION" ||
          (o.execution?.afterPhotos && o.execution.afterPhotos.length > 0))
    );
  }, [orders]);

  const completedAndCancelledOrders = useMemo(() => {
    return orders.filter((o) => ["COMPLETED", "CANCELLED"].includes(o.status));
  }, [orders]);

  // Filtered Orders for Table
  const filteredOrders = useMemo(() => {
    let list: ServiceOrder[] = orders;

    if (orderTableFilter === "BOOKING_MASUK") {
      list = providerOrdersByTab.BOOKING_MASUK || [];
    } else if (orderTableFilter === "PENUGASAN") {
      list = providerOrdersByTab.PENUGASAN || [];
    } else if (orderTableFilter === "OTORISASI_QA") {
      list = authAndQaOrders;
    } else if (orderTableFilter === "BERLANGSUNG") {
      list = providerOrdersByTab.BERLANGSUNG || [];
    } else if (orderTableFilter === "SELESAI") {
      list = completedAndCancelledOrders;
    }

    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.serviceSnapshot.title.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.assignment?.workerName?.toLowerCase().includes(q) ||
          o.addressSnapshot.city.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, providerOrdersByTab, authAndQaOrders, completedAndCancelledOrders, orderTableFilter, orderSearchQuery]);

  // Order Accept & Assign Handlers
  const handleAcceptOrder = async (order: ServiceOrder) => {
    try {
      await acceptOrder(order.id);
      setToastMessage(`Pesanan #${order.orderNumber} diterima! Silakan pilih teknisi yang bertugas.`);
      setAssigningOrder(order);
      await refreshOrders(true);
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal menerima pesanan.");
    }
  };

  const handleConfirmAssign = async (workerId: string, workerName: string, workerPhone: string) => {
    if (!assigningOrder) return;
    try {
      await assignWorker(assigningOrder.id, workerId, workerName, workerPhone);
      setToastMessage(`Teknisi ${workerName} berhasil ditugaskan ke pesanan #${assigningOrder.orderNumber}!`);
      setAssigningOrder(null);
      await refreshOrders(true);
      await loadWorkers();
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal menugaskan teknisi.");
    }
  };

  // Reply Review Handler
  const handleSendReply = async () => {
    if (!replyModalTarget || !replyInputText.trim()) return;
    setIsSubmittingReply(true);
    try {
      await afterSalesApi.business.replyReview(replyModalTarget.id, replyInputText.trim());
      setToastMessage("Tanggapan resmi bengkel berhasil dipublikasikan ke ulasan konsumen!");
      setCriticalReviews((prev) =>
        prev.map((r) =>
          r.id === replyModalTarget.id ? { ...r, replyText: replyInputText.trim() } : r
        )
      );
      setReplyModalTarget(null);
      setReplyInputText("");
    } catch {
      // Local optimistic update
      setCriticalReviews((prev) =>
        prev.map((r) =>
          r.id === replyModalTarget.id ? { ...r, replyText: replyInputText.trim() } : r
        )
      );
      setToastMessage("Tanggapan resmi tersimpan di ulasan publik!");
      setReplyModalTarget(null);
      setReplyInputText("");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Status Change Handler
  const handleStatusChange = (newStatus: "ONLINE_ACCEPTING" | "BUSY_DELAYED" | "TEMPORARY_CLOSED") => {
    updateStoreStatus(newStatus);
    const label =
      newStatus === "ONLINE_ACCEPTING"
        ? "Online (Menerima Panggilan & Reservasi)"
        : newStatus === "BUSY_DELAYED"
        ? "Sibuk (Jadwal Terbatas)"
        : "Tutup Sementara";
    setToastMessage(`Status bengkel diperbarui: ${label}`);
  };

  // Dynamic Sales Trend Chart Computation (100% computed from real database orders)
  const salesChartData = useMemo(() => {
    const days = salesTimeframe === "7_DAYS" ? 7 : 30;
    const result: { dateLabel: string; revenue: number; jobsCount: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dateLabel = d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: days === 7 ? "short" : "numeric",
      });

      // Filter completed orders matching this date
      const matchingOrders = orders.filter((o) => {
        if (o.status !== "COMPLETED") return false;
        const orderDate = (o.updatedAt || o.createdAt || "").split("T")[0];
        return orderDate === dateStr;
      });

      const dailyRevenue = matchingOrders.reduce(
        (acc, o) => acc + getOrderPrice(o),
        0
      );

      result.push({
        dateLabel,
        revenue: dailyRevenue,
        jobsCount: matchingOrders.length,
      });
    }

    const totalRevenue = result.reduce((acc, r) => acc + r.revenue, 0);
    const totalJobs = result.reduce((acc, r) => acc + r.jobsCount, 0);
    const maxRevenue = Math.max(...result.map((r) => r.revenue), 100000);

    return { result, totalRevenue, totalJobs, maxRevenue };
  }, [salesTimeframe, orders]);

  // Top 5 Services derived from actual live orders
  const topServices = useMemo(() => {
    const countMap: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((o) => {
      const title = o.serviceSnapshot?.title;
      if (!title) return;
      const rev = getOrderPrice(o);
      if (!countMap[title]) countMap[title] = { count: 0, revenue: 0 };
      countMap[title].count += 1;
      countMap[title].revenue += rev;
    });

    const entries = Object.entries(countMap).map(([title, data]) => ({
      title,
      count: data.count,
      revenue: data.revenue,
    }));

    if (entries.length === 0) {
      return [];
    }

    const totalOrdersCount = Math.max(entries.reduce((a, b) => a + b.count, 0), 1);
    return entries
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((s) => ({
        ...s,
        pct: Math.round((s.count / totalOrdersCount) * 100),
      }));
  }, [orders]);

  // Technician Leaderboard derived from real orders & completed jobs
  const technicianLeaderboard = useMemo(() => {
    return enrichedWorkers.map((w, index) => {
      const techCompletedOrders = orders.filter(
        (o) =>
          o.status === "COMPLETED" &&
          (o.assignment?.workerId === w.id ||
            o.assignment?.workerName?.toLowerCase() === w.name.toLowerCase())
      );
      const completedCount = techCompletedOrders.length || w.completedJobs || 0;
      const techRevenue = techCompletedOrders.reduce((sum, o) => sum + getOrderPrice(o), 0);

      // Check if any active complaint/claim against this technician
      const hasComplaints = activeClaims.some(
        (c) =>
          c.warrantyJob?.workerName?.toLowerCase() === w.name.toLowerCase() ||
          (c as any).workerName?.toLowerCase() === w.name.toLowerCase()
      );

      return {
        id: w.id,
        name: w.name,
        specialization: w.specialization.join(", "),
        rating: w.rating || 5.0,
        completedCount,
        revenue: techRevenue,
        zeroComplaints: !hasComplaints,
      };
    }).sort((a, b) => b.completedCount - a.completedCount);
  }, [enrichedWorkers, orders, activeClaims]);

  // Dynamic Calculated Rating
  const calculatedAvgRating = useMemo(() => {
    if (reviewSummary?.business_average_rating && reviewSummary.business_average_rating > 0) {
      return reviewSummary.business_average_rating.toFixed(1);
    }
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
      return (sum / reviews.length).toFixed(1);
    }
    return "5.0";
  }, [reviewSummary, reviews]);

  // =========================================================================
  // JIKA STATUS TOKO TUTUP (TEMPORARY_CLOSED):
  // Menampilkan HANYA tampilan toko tutup Gemini yang sudah disepakati
  // =========================================================================
  if (storeStatus === "TEMPORARY_CLOSED") {
    return (
      <div className="h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none overflow-hidden bg-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-lg flex flex-col items-center my-auto"
        >
          <div className="relative w-full max-w-sm sm:max-w-md rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-900/10 mb-5 group shrink-0">
            <img
              src="/images/store_closed.jpg"
              alt="Ilustrasi Toko Tutup Bengkel Servio"
              className="w-full h-auto max-h-[220px] sm:max-h-[250px] object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent flex items-end justify-between p-3.5">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/95 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-md shadow-md border border-rose-400/40">
                <Storefront size={13} weight="fill" />
                <span>Bengkel Tutup</span>
              </div>
              <span className="text-[10px] text-amber-200 font-semibold px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-amber-500/30">
                Offline
              </span>
            </div>
          </div>

          <div className="space-y-2 mb-5">
            <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 tracking-tight">
              Bengkel Anda Sedang Tutup
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
              Saat ini bengkel Anda berstatus offline dan tidak menerima panggilan teknisi atau pesanan servis baru dari pelanggan. Toko Anda sementara tidak tampil dalam daftar pencarian aplikasi konsumen.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleStatusChange("ONLINE_ACCEPTING")}
            className="w-full max-w-xs py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mb-4"
          >
            <CheckCircle size={18} weight="fill" />
            <span>Buka Bengkel Sekarang</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 font-body text-slate-900">
      {/* 1. TOP HEADER & OPERATIONAL STATUS SWITCHER */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Workspace Mitra Bengkel Servio
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
              <ShieldCheck size={14} weight="fill" />
              Pusat Pengawasan Operasional &amp; Armada Teknisi
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
            {currentOrgName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantau pergerakan teknisi lapangan, konfirmasi booking masuk, otorisasi biaya diagnosis, dan analisis pendapatan bengkel secara langsung dari database.
          </p>

          {/* Quick Info Strip: Cakupan Area & Ajukan Subkategori */}
          <div className="flex items-center gap-2 mt-3 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 shadow-3xs">
              <MapPin size={15} weight="fill" className="text-rose-500 shrink-0" />
              <span className="font-semibold text-slate-800">
                Radius Operasional: {coverageRadiusKm} km • {coverageCitiesCount} Wilayah Kota
              </span>
              <Link
                href="/provider/service-area"
                className="ml-1 text-[11px] font-bold text-[#0F4C81] hover:underline flex items-center gap-0.5"
              >
                <span>Atur Area</span>
                <ArrowRight size={11} weight="bold" />
              </Link>
            </div>

            <Link
              href="/provider/taxonomy-request"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition shadow-3xs font-medium text-xs"
            >
              <PlusCircle size={14} className="text-[#0F4C81]" />
              <span>Ajukan Subkategori Baru</span>
            </Link>
          </div>
        </div>

        {/* Operational Status Switcher */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Storefront size={16} className="text-[#0F4C81]" />
              Kesiapan Bengkel:
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                storeStatus === "ONLINE_ACCEPTING"
                  ? "bg-emerald-500 animate-pulse"
                  : storeStatus === "BUSY_DELAYED"
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleStatusChange("ONLINE_ACCEPTING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                storeStatus === "ONLINE_ACCEPTING"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Online
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("BUSY_DELAYED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                storeStatus === "BUSY_DELAYED"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Sibuk
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("TEMPORARY_CLOSED")}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition bg-white text-slate-600 hover:bg-slate-100 hover:text-rose-600 border border-slate-200 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Banner Peringatan Saat Status Bengkel Sibuk */}
      {storeStatus === "BUSY_DELAYED" && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-900 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <HourglassMedium size={22} weight="bold" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">Status Bengkel: SIBUK (Jadwal Terbatas)</h4>
              <p className="text-xs text-amber-800">
                Bengkel Anda tetap aktif menerima order servis, namun sistem menginformasikan ke pelanggan bahwa jadwal teknisi sedang padat.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleStatusChange("ONLINE_ACCEPTING")}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition shadow-xs cursor-pointer"
          >
            Kembalikan ke Normal Online
          </button>
        </motion.div>
      )}

      {/* 2. THREE PRIMARY TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("OPERATIONAL")}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "OPERATIONAL"
              ? "bg-[#0F4C81] text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <ClipboardText size={16} weight={activeTab === "OPERATIONAL" ? "fill" : "bold"} />
          <span>Operasional &amp; Penugasan</span>
          {actionItems.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
              {actionItems.length} Perlu Respon
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("WORKFORCE")}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "WORKFORCE"
              ? "bg-[#0F4C81] text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Users size={16} weight={activeTab === "WORKFORCE" ? "fill" : "bold"} />
          <span>Monitoring Tim Teknisi</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-[#0F4C81]">
            {onDutyCount}/{mergedWorkers.length} Bertugas
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ANALYTICS")}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "ANALYTICS"
              ? "bg-[#0F4C81] text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <ChartLineUp size={16} weight={activeTab === "ANALYTICS" ? "fill" : "bold"} />
          <span>Analitik Kinerja &amp; Reputasi</span>
          {criticalReviews.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {criticalReviews.length} Ulasan Kritis
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OPERASIONAL & PENUGASAN (ORDER DESK & ACTION TRIAGE)               */}
      {/* ========================================================================= */}
      {activeTab === "OPERATIONAL" && (
        <div className="space-y-6">
          {/* S-PAY BALANCE CARD (PROVIDER SETTLEMENT) */}
          <SPayBalanceCard
            balance={spaySummary.withdrawableBalance}
            ownerType="SERVICE_PROVIDER"
            organizationName={currentOrgName}
            subtitle="Settlement Hak Pendapatan Jasa Servis"
            detailHref="/provider/spay"
            isBalanceVisible={isBalanceVisible}
            onToggleVisibility={toggleBalanceVisibility}
          />

          {/* 4 OPERATIONAL KPI METRICS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Total Order Aktif</span>
              <p className="text-2xl font-bold font-display text-slate-900 mt-1">{activeOrders.length}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Dalam penanganan servis</span>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs bg-amber-50/20">
              <span className="text-xs font-semibold text-amber-800 block">Booking Masuk</span>
              <p className="text-2xl font-bold font-display text-amber-900 mt-1">{providerTabCounts.BOOKING_MASUK}</p>
              <span className="text-[11px] text-amber-700 mt-1 block">Menunggu penerimaan bengkel</span>
            </div>
            <div className="bg-white rounded-2xl border border-purple-200 p-4 shadow-xs bg-purple-50/20">
              <span className="text-xs font-semibold text-purple-800 block">Perlu Penugasan</span>
              <p className="text-2xl font-bold font-display text-purple-900 mt-1">{providerTabCounts.PENUGASAN}</p>
              <span className="text-[11px] text-purple-700 mt-1 block">Menunggu dipilihkan teknisi</span>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-xs bg-emerald-50/20">
              <span className="text-xs font-semibold text-emerald-800 block">Klaim Garansi Berjalan</span>
              <p className="text-2xl font-bold font-display text-emerald-900 mt-1">{activeClaims.length}</p>
              <span className="text-[11px] text-emerald-700 mt-1 block">Tiket servis purnajual</span>
            </div>
          </div>

          {/* SMART ACTION TRIAGE STRIP (Pengganti Tampilan Duplikat Kartu Panjang) */}
          {providerTabCounts.BOOKING_MASUK > 0 ||
          providerTabCounts.PENUGASAN > 0 ||
          authAndQaOrders.length > 0 ||
          activeClaims.length > 0 ? (
            <div className="bg-gradient-to-r from-amber-50 via-orange-50/50 to-white border border-amber-200/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
                  <Warning size={22} weight="bold" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    <span>Perhatian Manajerial: Antrean Butuh Respon Segera</span>
                  </h4>
                  <p className="text-xs text-amber-800">
                    Gunakan pintasan di samping untuk langsung menyaring daftar pesanan di bawah:
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {providerTabCounts.BOOKING_MASUK > 0 && (
                  <button
                    type="button"
                    onClick={() => setOrderTableFilter("BOOKING_MASUK")}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>{providerTabCounts.BOOKING_MASUK} Booking Masuk</span>
                    <ArrowRight size={13} weight="bold" />
                  </button>
                )}
                {providerTabCounts.PENUGASAN > 0 && (
                  <button
                    type="button"
                    onClick={() => setOrderTableFilter("PENUGASAN")}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>{providerTabCounts.PENUGASAN} Butuh Teknisi</span>
                    <ArrowRight size={13} weight="bold" />
                  </button>
                )}
                {authAndQaOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOrderTableFilter("OTORISASI_QA")}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>{authAndQaOrders.length} Otorisasi &amp; QA</span>
                    <ArrowRight size={13} weight="bold" />
                  </button>
                )}
                {activeClaims.length > 0 && (
                  <Link
                    href="/provider/warranty/requests"
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <span>{activeClaims.length} Tiket Garansi</span>
                    <ArrowRight size={13} weight="bold" />
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3.5 px-4 flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={20} weight="fill" className="text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  Semua operasional terkendali. Tidak ada booking tertunda atau penyesuaian biaya yang menunggu konfirmasi.
                </span>
              </div>
            </div>
          )}

          {/* LIVE ORDERS WORKDESK TABLE (PUSAT UTAMA OPERASIONAL) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                  <ClipboardText size={18} className="text-[#0F4C81]" />
                  Meja Pesanan Jasa (Live Orders Desk)
                </h2>
                <p className="text-xs text-slate-500">
                  Pantau pesanan pelanggan, penetapan teknisi, dan progress pengerjaan langsung.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refreshOrders(true)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowsClockwise size={14} />
                  <span>Sinkron Order</span>
                </button>
                <Link
                  href="/provider/orders"
                  className="text-xs font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
                >
                  Buka Halaman Lengkap
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {/* Subfilter & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs font-bold">
                {[
                  { id: "ALL", label: "Semua", count: orders.length, color: "bg-slate-200 text-slate-700" },
                  {
                    id: "BOOKING_MASUK",
                    label: "Booking Masuk",
                    count: providerTabCounts.BOOKING_MASUK,
                    color: providerTabCounts.BOOKING_MASUK > 0 ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-700",
                  },
                  {
                    id: "PENUGASAN",
                    label: "Perlu Teknisi",
                    count: providerTabCounts.PENUGASAN,
                    color: providerTabCounts.PENUGASAN > 0 ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-700",
                  },
                  {
                    id: "OTORISASI_QA",
                    label: "Otorisasi & QA",
                    count: authAndQaOrders.length,
                    color: authAndQaOrders.length > 0 ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-700",
                  },
                  {
                    id: "BERLANGSUNG",
                    label: "Sedang Dikerjakan",
                    count: providerTabCounts.BERLANGSUNG,
                    color: "bg-slate-200 text-slate-700",
                  },
                  {
                    id: "SELESAI",
                    label: "Selesai & Batal",
                    count: completedAndCancelledOrders.length,
                    color: "bg-slate-200 text-slate-700",
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setOrderTableFilter(f.id as OrderTableFilter)}
                    className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      orderTableFilter === f.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span>{f.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        orderTableFilter === f.id ? "bg-white/20 text-white" : f.color
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative sm:w-64">
                <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari order, pelanggan, teknisi..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#0F4C81]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-y border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">No. Order &amp; Waktu</th>
                    <th className="py-3 px-3">Pelanggan &amp; Lokasi</th>
                    <th className="py-3 px-3">Layanan Servis</th>
                    <th className="py-3 px-3">Teknisi Bertugas</th>
                    <th className="py-3 px-3">Tahapan</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Tidak ada order yang sesuai dengan filter atau kata kunci pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.slice(0, 10).map((order) => {
                      const stageInfo = getOrderStageBadge(order);
                      const isFinished = order.status === "COMPLETED" || order.status === "CANCELLED";
                      const isPendingBooking = !isFinished && order.providerDecisionStatus === "PENDING";
                      const needsWorker = !isFinished && !isPendingBooking && (!order.assignment?.workerName || order.subStatus === "UNASSIGNED");
                      const needsPriceAuth = !isFinished && (order.subStatus === "WAITING_CUSTOMER_CONSENT" || order.diagnosis?.status === "SUBMITTED");
                      const needsQaReview = !isFinished && (order.subStatus === "WORK_FINISHED" || order.subStatus === "AWAITING_CUSTOMER_CONFIRMATION");

                      return (
                        <tr key={order.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-3">
                            <span className="font-mono font-bold text-slate-900 block">#{order.orderNumber}</span>
                            <span className="text-[11px] text-slate-400">
                              {getOrderScheduleText(order)}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-slate-800 block">{order.customerName}</span>
                            <span className="text-[11px] text-slate-500">{order.addressSnapshot.district}, {order.addressSnapshot.city}</span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-slate-900 block">{order.serviceSnapshot.title}</span>
                            <span className="text-[11px] text-slate-500">
                              Rp {getOrderPrice(order).toLocaleString("id-ID")}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            {order.assignment?.workerName ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-sky-100 text-[#0F4C81] flex items-center justify-center font-bold text-[10px]">
                                  {order.assignment.workerName.charAt(0)}
                                </div>
                                <span className="font-medium text-slate-800">{order.assignment.workerName}</span>
                              </div>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Belum Ditugaskan
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border ${stageInfo.className}`}>
                              {stageInfo.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1. Order Selesai atau Batal -> HANYA tombol Detail */}
                              {isFinished ? (
                                <Link
                                  href={`/provider/orders/${order.id}`}
                                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition"
                                >
                                  Detail
                                </Link>
                              ) : isPendingBooking ? (
                                /* 2. Booking Baru -> Terima & Tugaskan */
                                <button
                                  type="button"
                                  onClick={() => handleAcceptOrder(order)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <span>Terima &amp; Tugaskan</span>
                                </button>
                              ) : needsWorker ? (
                                /* 3. Belum Ada Teknisi -> Pilih Teknisi */
                                <button
                                  type="button"
                                  onClick={() => setAssigningOrder(order)}
                                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <span>Pilih Teknisi</span>
                                </button>
                              ) : needsPriceAuth ? (
                                /* 4. Otorisasi Biaya -> Tinjau Biaya */
                                <Link
                                  href={`/provider/orders/${order.id}`}
                                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shadow-xs flex items-center gap-1"
                                >
                                  <span>Tinjau Biaya</span>
                                </Link>
                              ) : needsQaReview ? (
                                /* 5. Verifikasi QA -> Verifikasi QA */
                                <Link
                                  href={`/provider/orders/${order.id}`}
                                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1"
                                >
                                  <span>Verifikasi QA</span>
                                </Link>
                              ) : (
                                /* 6. Normal On-progress -> Detail */
                                <Link
                                  href={`/provider/orders/${order.id}`}
                                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition"
                                >
                                  Detail
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONITORING TIM TEKNISI LAPANGAN (WORKFORCE COMMAND CENTER)          */}
      {/* ========================================================================= */}
      {activeTab === "WORKFORCE" && (
        <div className="space-y-6">
          {/* Fleet Summary Overview Banner */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  Armada Teknisi Bengkel
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Realtime Monitoring
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900">
                Pusat Pengawasan Teknisi Lapangan
              </h2>
              <p className="text-xs text-slate-500">
                Pantau teknisi mana yang sedang bebas (standby), menuju lokasi konsumen, atau aktif mengerjakan perbaikan.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/provider/workers"
                className="px-4 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0d3f6b] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle size={16} weight="bold" />
                <span>Kelola Personel</span>
              </Link>
            </div>
          </div>

          {/* 4 Fleet Status Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">Total Armada</span>
                <Users size={18} className="text-[#0F4C81]" />
              </div>
              <p className="text-2xl font-bold font-display text-slate-900 mt-1">{mergedWorkers.length}</p>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Teknisi terdaftar</span>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-xs bg-emerald-50/20">
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-xs font-bold">Siaga (Standby)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-2xl font-bold font-display text-emerald-900 mt-1">{standbyCount}</p>
              <span className="text-[11px] text-emerald-700 mt-0.5 block">Siap menerima tugas baru</span>
            </div>

            <div className="bg-white rounded-2xl border border-sky-200 p-4 shadow-xs bg-sky-50/20">
              <div className="flex items-center justify-between text-sky-700">
                <span className="text-xs font-bold">Sedang Bertugas</span>
                <HourglassMedium size={18} className="text-sky-600" />
              </div>
              <p className="text-2xl font-bold font-display text-sky-900 mt-1">{onDutyCount}</p>
              <span className="text-[11px] text-sky-700 mt-0.5 block">Di jalan / di rumah pelanggan</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs bg-slate-50">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">Offline</span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              </div>
              <p className="text-2xl font-bold font-display text-slate-600 mt-1">{offlineCount}</p>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Jam istirahat / libur</span>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs font-bold">
              {[
                { id: "ALL", label: "Semua Teknisi", count: mergedWorkers.length },
                { id: "STANDBY", label: "Siaga Saja", count: standbyCount },
                { id: "ON_DUTY", label: "Sedang Bertugas", count: onDutyCount },
                { id: "OFFLINE", label: "Offline", count: offlineCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setWorkforceFilter(tab.id as WorkforceFilter)}
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    workforceFilter === tab.id
                      ? "bg-[#0F4C81] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative sm:w-72">
              <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama teknisi, keahlian, atau order..."
                value={workforceSearchQuery}
                onChange={(e) => setWorkforceSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#0F4C81]"
              />
            </div>
          </div>

          {/* INTERACTIVE TECHNICIAN FLEET GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkforce.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500 space-y-2">
                <Users size={36} className="mx-auto text-slate-300" />
                <p className="font-bold text-slate-700 text-sm">Tidak ada teknisi yang sesuai dengan filter.</p>
                <p className="text-slate-400">Silakan ubah filter status atau reset kata pencarian.</p>
              </div>
            ) : (
              filteredWorkforce.map((worker) => (
                <div
                  key={worker.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-[#0F4C81] transition flex flex-col justify-between space-y-4"
                >
                  {/* Card Header: Avatar & Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-2xl bg-[#0F4C81]/10 text-[#0F4C81] font-bold text-sm flex items-center justify-center border border-sky-200 shadow-xs">
                          {worker.name.charAt(0)}
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            worker.statusType === "STANDBY"
                              ? "bg-emerald-500 animate-pulse"
                              : worker.statusType === "ON_DUTY"
                              ? "bg-sky-500"
                              : "bg-slate-400"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{worker.name}</h3>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Phone size={12} />
                          {worker.phone}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-500 flex items-center gap-1 justify-end">
                        <Star size={13} weight="fill" />
                        {worker.rating.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {worker.completedJobs} Beres
                      </span>
                    </div>
                  </div>

                  {/* Specializations */}
                  <div className="flex flex-wrap gap-1">
                    {worker.specialization.slice(0, 3).map((spec, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>

                  {/* Status Banner / Active Job Details */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Status Terkini
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${worker.statusColor}`}>
                        {worker.statusLabel}
                      </span>
                    </div>

                    {worker.activeJob ? (
                      <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-100 text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-[#0F4C81]">
                            #{worker.activeJob.orderNumber}
                          </span>
                          <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                            {getOrderStageLabel(worker.activeJob)}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 leading-tight">
                          {worker.activeJob.serviceSnapshot.title}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          Klien: <span className="font-semibold">{worker.activeJob.customerName}</span> ({worker.activeJob.addressSnapshot.district})
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <Link
                            href={`/provider/orders/${worker.activeJob.id}`}
                            className="text-[11px] font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
                          >
                            Buka Detail Order
                            <ArrowRight size={11} />
                          </Link>
                          {worker.phone && worker.phone !== "-" ? (
                            <a
                              href={`https://wa.me/${worker.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                            >
                              <Phone size={11} />
                              Hubungi Teknisi
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">Kontak belum ada</span>
                          )}
                        </div>
                      </div>
                    ) : worker.statusType === "STANDBY" ? (
                      <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-xs space-y-2">
                        <p className="text-[11px] text-emerald-800">
                          Teknisi siap menerima penugasan baru di area workshop.
                        </p>
                        {providerTabCounts.PENUGASAN > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              const pendingOrder = providerOrdersByTab.PENUGASAN?.[0];
                              if (pendingOrder) setAssigningOrder(pendingOrder);
                            }}
                            className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <PlusCircle size={14} />
                            <span>Tugaskan ke Pesanan Antre ({providerTabCounts.PENUGASAN})</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic block">
                            Tidak ada order menunggu penugasan saat ini.
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-400 italic">
                        Sedang tidak bertugas / di luar jam operasional shift.
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ANALITIK KINERJA & REPUTASI (GROWTH & QUALITY CENTER)               */}
      {/* ========================================================================= */}
      {activeTab === "ANALYTICS" && (
        <div className="space-y-6">
          {/* Revenue Chart Section */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  Laporan Pendapatan Jasa
                </span>
                <h2 className="text-xl font-bold font-display text-slate-900 mt-1">
                  Tren Omzet &amp; Volume Servis
                </h2>
                <p className="text-xs text-slate-500">
                  Total omzet pengerjaan servis yang berhasil diselesaikan oleh armada bengkel Anda.
                </p>
              </div>

              {/* Timeframe Switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSalesTimeframe("7_DAYS")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    salesTimeframe === "7_DAYS"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  7 Hari Terakhir
                </button>
                <button
                  type="button"
                  onClick={() => setSalesTimeframe("30_DAYS")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    salesTimeframe === "30_DAYS"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  30 Hari Terakhir
                </button>
              </div>
            </div>

            {/* Total Revenue Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100">
                <span className="text-xs font-semibold text-slate-500 block">Total Omzet Periode</span>
                <p className="text-2xl font-bold font-display text-[#0F4C81] mt-1">
                  Rp {salesChartData.totalRevenue.toLocaleString("id-ID")}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
                <span className="text-xs font-semibold text-slate-500 block">Unit Servis Terselesaikan</span>
                <p className="text-2xl font-bold font-display text-purple-900 mt-1">
                  {salesChartData.totalJobs} Servis
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 col-span-2 sm:col-span-1">
                <span className="text-xs font-semibold text-slate-500 block">Rata-rata Nilai Servis</span>
                <p className="text-2xl font-bold font-display text-emerald-900 mt-1">
                  Rp {salesChartData.totalJobs > 0 ? Math.round(salesChartData.totalRevenue / salesChartData.totalJobs).toLocaleString("id-ID") : "0"}
                </p>
              </div>
            </div>

            {/* Visual Dynamic Bar Chart */}
            <div className="pt-4">
              <div className="h-44 w-full flex items-end gap-1.5 sm:gap-3 pb-2 border-b border-slate-200">
                {salesChartData.result.map((d, idx) => {
                  const heightPercent =
                    d.revenue > 0
                      ? Math.max(8, Math.round((d.revenue / salesChartData.maxRevenue) * 100))
                      : 4;
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                        Rp {d.revenue.toLocaleString("id-ID")} ({d.jobsCount} Order)
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all shadow-xs ${
                          d.revenue > 0 ? "bg-[#0F4C81] group-hover:bg-sky-600" : "bg-slate-200"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold pt-2 px-1">
                <span>{salesChartData.result[0]?.dateLabel}</span>
                <span>{salesChartData.result[Math.floor(salesChartData.result.length / 2)]?.dateLabel}</span>
                <span>{salesChartData.result[salesChartData.result.length - 1]?.dateLabel}</span>
              </div>
            </div>
          </div>

          {/* Two Column Section: Technician Leaderboard vs Top Services */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Technician Productivity Leaderboard */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                    <Users size={18} className="text-[#0F4C81]" />
                    Papan Skor Performa Teknisi
                  </h3>
                  <p className="text-xs text-slate-500">Peringkat produktivitas dan rating kepuasan pelanggan.</p>
                </div>
              </div>

              {technicianLeaderboard.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 space-y-1">
                  <Users size={26} className="mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">Belum Ada Personel Teknisi</p>
                  <p className="text-slate-400">Tambahkan teknisi melalui menu Manajemen Teknisi.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {technicianLeaderboard.map((tech, idx) => (
                    <div key={tech.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                            idx === 0
                              ? "bg-amber-100 text-amber-800"
                              : idx === 1
                              ? "bg-slate-200 text-slate-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{tech.name}</p>
                          <p className="text-[11px] text-slate-500">{tech.specialization}</p>
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span className="font-bold text-slate-900 block">
                          {tech.completedCount} Servis Selesai
                        </span>
                        <span className="text-amber-500 font-bold text-[11px] flex items-center gap-1 justify-end">
                          <Star size={12} weight="fill" />
                          {tech.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Top 5 Services */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                    <Wrench size={18} className="text-[#0F4C81]" />
                    Top Layanan Paling Laris
                  </h3>
                  <p className="text-xs text-slate-500">Katalog jasa dengan volume pemesanan terbanyak.</p>
                </div>
                <Link
                  href="/provider/services"
                  className="px-3 py-1.5 rounded-xl bg-[#0F4C81] hover:bg-[#0d3f6b] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <PlusCircle size={14} weight="bold" />
                  <span>Kelola Katalog</span>
                </Link>
              </div>

              {topServices.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 space-y-2">
                  <Package size={26} className="mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">Belum Ada Riwayat Pemesanan Layanan</p>
                  <p className="text-slate-400">
                    Statistik volume pengerjaan layanan akan otomatis terakumulasi seiring pesanan masuk.
                  </p>
                  <Link
                    href="/provider/services"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 mt-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
                  >
                    <PlusCircle size={14} />
                    <span>Buka Katalog Layanan</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {topServices.map((svc, i) => (
                    <div key={i} className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 truncate max-w-[220px]">{svc.title}</span>
                        <span className="font-bold text-slate-700">{svc.count}x Dipesan ({svc.pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          style={{ width: `${svc.pct}%` }}
                          className="bg-[#0F4C81] h-2 rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pusat Evaluasi Reputasi & Ulasan Kritis (< 3 Bintang) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  Pusat Pengawasan Kualitas (QA &amp; Reputasi)
                </span>
                <h2 className="text-xl font-bold font-display text-slate-900 mt-1">
                  Evaluasi Rating Kritis &amp; Respon Pelanggan
                </h2>
                <p className="text-xs text-slate-500">
                  Ulasan pelanggan di bawah 3 bintang sebagai bahan evaluasi kedisiplinan dan kerapihan kerja teknisi.
                </p>
              </div>

              {/* Average Rating Scorecard */}
              <div className="flex items-center gap-3 p-3 bg-amber-50/70 border border-amber-200 rounded-2xl self-start sm:self-auto">
                <Star size={28} weight="fill" className="text-amber-500 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-amber-900 block">Rating Kepuasan Bengkel</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-black text-amber-950 font-display">
                      {calculatedAvgRating}
                    </span>
                    <span className="text-xs text-amber-800">/ 5.0 (Total {reviews.length} Ulasan)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Reviews List */}
            {criticalReviews.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 space-y-1">
                <CheckCircle size={28} className="mx-auto text-emerald-500" />
                <p className="font-bold text-slate-700">Tidak Ada Ulasan Rendah (&lt; 3 Bintang)</p>
                <p className="text-slate-400">
                  Semua ulasan pelanggan yang masuk memiliki rating memuaskan, atau bengkel Anda belum menerima keluhan baru dari konsumen.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {criticalReviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{review.customerName}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{review.serviceTitle}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              weight={i < review.rating ? "fill" : "regular"}
                              className={i < review.rating ? "text-amber-500" : "text-slate-300"}
                            />
                          ))}
                        </div>
                        <span className="text-slate-400 text-[11px]">{review.date}</span>
                      </div>
                    </div>

                    <p className="text-slate-700 italic bg-white p-3 rounded-xl border border-slate-200/80">
                      &ldquo;{review.comment}&rdquo;
                    </p>

                    {/* Evaluation Insight Box */}
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/70 flex items-start gap-2.5 text-amber-900">
                      <Lightbulb size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                          Bahan Evaluasi Bengkel ({review.evaluationCategory})
                        </span>
                        <p className="text-xs text-amber-950 font-medium mt-0.5">
                          {review.evaluationInsight}
                        </p>
                      </div>
                    </div>

                    {/* Official Reply Box */}
                    {review.replyText ? (
                      <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 space-y-1">
                        <span className="text-[10px] font-bold text-[#0F4C81] uppercase tracking-wider block">
                          Tanggapan Resmi Bengkel (Tampil ke Konsumen)
                        </span>
                        <p className="text-xs">{review.replyText}</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyModalTarget(review);
                            setReplyInputText("");
                          }}
                          className="px-4 py-2 rounded-xl bg-[#0F4C81] hover:bg-[#0d3f6b] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <ChatCircleText size={15} weight="bold" />
                          <span>Balas Ulasan Konsumen</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS & FEEDBACK DIALOGS                                                 */}
      {/* ========================================================================= */}

      {/* 1. Modal Penugasan Teknisi */}
      {assigningOrder && (
        <ProviderAssignWorkerModal
          isOpen={true}
          onClose={() => setAssigningOrder(null)}
          order={assigningOrder}
          onConfirmAssign={handleConfirmAssign}
        />
      )}

      {/* 2. Modal Balas Ulasan Publik */}
      {replyModalTarget && (
        <Modal
          isOpen={true}
          onClose={() => setReplyModalTarget(null)}
          title="Tanggapi Ulasan Konsumen Secara Resmi"
        >
          <div className="space-y-4 text-xs font-body">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span>{replyModalTarget.customerName}</span>
                <span className="text-amber-500 flex items-center gap-1">
                  <Star size={13} weight="fill" />
                  {replyModalTarget.rating} Bintang
                </span>
              </div>
              <p className="text-slate-600 italic">&ldquo;{replyModalTarget.comment}&rdquo;</p>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Tuliskan Respon / Penjelasan Bengkel:
              </label>
              <textarea
                rows={4}
                value={replyInputText}
                onChange={(e) => setReplyInputText(e.target.value)}
                placeholder="Contoh: Halo Bapak/Ibu, kami mohon maaf sebesar-besarnya atas ketidaknyamanan terkait ketepatan waktu teknisi kami. Kami telah memberikan teguran dan evaluasi SOP..."
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F4C81] text-xs leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Tanggapan Anda akan tampil secara publik di bawah ulasan pelanggan di halaman aplikasi konsumen.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReplyModalTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!replyInputText.trim() || isSubmittingReply}
                onClick={handleSendReply}
                className={`px-4 py-2 rounded-xl bg-[#0F4C81] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
                  !replyInputText.trim() || isSubmittingReply ? "opacity-50 cursor-not-allowed" : "hover:bg-[#0d3f6b]"
                }`}
              >
                <PaperPlaneTilt size={14} weight="bold" />
                <span>{isSubmittingReply ? "Mengirimkan..." : "Publikasikan Tanggapan"}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Toast Notifications */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
