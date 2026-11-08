"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Wrench,
  MapPin,
  Clock,
  Phone,
  CheckCircle,
  NavigationArrow,
  Play,
  ShieldCheck,
  ArrowRight,
  User,
  CaretRight,
  BookOpen,
  WarningCircle,
  ListChecks,
  ArrowsClockwise,
  Truck,
  Sparkle,
  CalendarBlank,
  CalendarCheck,
  WhatsappLogo,
  Check,
  HourglassMedium,
  CheckSquareOffset,
  Tag,
  ArrowsInLineHorizontal,
  MagnifyingGlass,
  ArrowUpRight,
  Info,
} from "@phosphor-icons/react";
import { useActiveRole } from "@/context/RoleContext";
import { useOrderJasa } from "@/features/order-jasa/hooks/useOrderJasa";
import { ServiceOrder } from "@/features/order-jasa/types";
import { Toast } from "@/components/feedback/Toast";
import { useWorkerPhoto } from "@/features/worker/workerPhotoHelper";

type WorkerDashboardTab = "OPERATIONAL" | "SCHEDULE" | "PERFORMANCE_SOP";
type ScheduleFilter = "ALL" | "ONGOING" | "TODAY" | "FUTURE" | "COMPLETED";

// Helpers for Stage Badge & Labels
function getWorkerStageBadge(order: ServiceOrder): { label: string; className: string } {
  if (order.status === "COMPLETED") {
    return { label: "Selesai Tuntas", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (order.status === "CANCELLED") {
    return { label: "Dibatalkan", className: "bg-slate-100 text-slate-500 border-slate-200" };
  }
  if (order.subStatus === "WORKER_OTW") {
    return { label: "Menuju Lokasi (OTW)", className: "bg-amber-50 text-amber-900 border-amber-300 font-bold" };
  }
  if (order.subStatus === "WORKER_ARRIVED") {
    return { label: "Tiba di Lokasi", className: "bg-sky-50 text-sky-900 border-sky-300 font-bold" };
  }
  if (order.subStatus === "DIAGNOSING") {
    return { label: "Sedang Diagnosis", className: "bg-blue-50 text-blue-900 border-blue-300 font-bold" };
  }
  if (order.subStatus === "WAITING_CUSTOMER_CONSENT") {
    return { label: "Menunggu Otorisasi Harga", className: "bg-orange-50 text-orange-900 border-orange-300 font-bold" };
  }
  if (order.subStatus === "PRICE_APPROVED" || order.subStatus === "EXECUTING") {
    return { label: "Pengerjaan Servis", className: "bg-indigo-50 text-indigo-900 border-indigo-300 font-bold" };
  }
  if (order.subStatus === "WORK_FINISHED" || order.subStatus === "AWAITING_CUSTOMER_CONFIRMATION") {
    return { label: "Verifikasi QA Selesai", className: "bg-purple-50 text-purple-900 border-purple-300 font-bold" };
  }
  if (order.subStatus === "WORKER_ACCEPTED") {
    return { label: "Siap Berangkat", className: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  }
  if (order.subStatus === "ASSIGNED_PENDING" || order.assignment?.status === "ASSIGNED") {
    return { label: "Perlu Dikonfirmasi", className: "bg-rose-50 text-rose-800 border-rose-200 font-bold animate-pulse" };
  }
  return { label: order.subStatus || order.status, className: "bg-slate-100 text-slate-700 border-slate-200" };
}

export default function WorkerDashboardPage() {
  const { user } = useActiveRole();
  const liveWorkerPhoto = useWorkerPhoto(
    user?.id,
    user?.avatar || user?.personalProfile?.avatar || (user?.avatarUrl && user?.avatarUrl !== "/brand/logo.png" ? user?.avatarUrl : undefined)
  );
  const {
    orders,
    acceptAssignment,
    startTrip,
    arriveAtLocation,
    refresh: refreshOrders,
  } = useOrderJasa();

  // Active Dashboard Tab
  const [activeTab, setActiveTab] = useState<WorkerDashboardTab>("OPERATIONAL");

  // Readiness Toggle State (Siap Bertugas vs Istirahat)
  const [isReady, setIsReady] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("servio_worker_readiness");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  // Schedule Tab Filter & Search
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // K3 Interactive Checklist State (Self-check before departure)
  const [k3Checklist, setK3Checklist] = useState<Record<string, boolean>>({
    helm_apd: true,
    sarung_tangan: true,
    multimeter: true,
    manifold_freon: false,
    toolkit_lengkap: true,
    app_aktif: true,
  });

  const toggleK3Item = (key: string) => {
    setK3Checklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const workerName = user?.name || "Ahmad Teknisi";
  const providerName =
    user?.activeOrganization?.name ||
    (user as any)?.businessProfile?.name ||
    "PT Servio Mandiri Teknik";

  const workerInitials = workerName
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Toggle Readiness Handler
  const handleToggleReadiness = () => {
    const nextState = !isReady;
    setIsReady(nextState);
    if (typeof window !== "undefined") {
      localStorage.setItem("servio_worker_readiness", String(nextState));
    }
    setToastMessage(
      nextState
        ? "Status diaktifkan: Siaga di posko & siap menerima penugasan servis baru."
        : "Status diubah: Sedang Istirahat (Pemberitahuan tugas baru dijeda sementara)."
    );
  };

  // Filter Orders Assigned to This Worker
  const myOrders = useMemo(() => {
    const lowerName = workerName.toLowerCase().trim();
    const workerId = user?.id || "";

    const assigned = orders.filter((o) => {
      if (!o.assignment) return false;
      if (o.assignment.workerId && o.assignment.workerId === workerId) return true;
      if (o.assignment.workerName && o.assignment.workerName.toLowerCase().includes(lowerName)) return true;
      if (o.assignment.workerName && lowerName.includes(o.assignment.workerName.toLowerCase())) return true;
      return true; // fallback for current worker session
    });

    const rawList = assigned.length > 0 ? assigned : orders.filter((o) => Boolean(o.assignment?.workerName));

    // Strict deduplication by order.id
    const uniqueMap = new Map<string, ServiceOrder>();
    for (const order of rawList) {
      if (!uniqueMap.has(order.id)) {
        uniqueMap.set(order.id, order);
      } else {
        const existing = uniqueMap.get(order.id)!;
        const isCurrentActive = order.assignment?.status === "ASSIGNED" || order.assignment?.status === "ACCEPTED";
        const isExistingActive = existing.assignment?.status === "ASSIGNED" || existing.assignment?.status === "ACCEPTED";
        if ((isCurrentActive && !isExistingActive) || new Date(order.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
          uniqueMap.set(order.id, order);
        }
      }
    }
    return Array.from(uniqueMap.values());
  }, [orders, workerName, user?.id]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // 1. Sedang Berlangsung: Dihitung HANYA dari order yang sudah mulai bergerak di lapangan
  const ongoingOrders = useMemo(() => {
    return myOrders.filter(
      (o) =>
        !["COMPLETED", "CANCELLED", "REFUNDED"].includes(o.status) &&
        [
          "WORKER_OTW",
          "WORKER_ARRIVED",
          "DIAGNOSING",
          "WAITING_CUSTOMER_CONSENT",
          "PRICE_APPROVED",
          "EXECUTING",
          "WORK_FINISHED",
          "AWAITING_CUSTOMER_CONFIRMATION",
        ].includes(o.subStatus)
    );
  }, [myOrders]);

  // 2. Tugas Hari Ini: Order yang dijadwalkan hari ini
  const todayOrders = useMemo(() => {
    return myOrders.filter((o) => {
      const isToday = o.schedule?.date === todayStr;
      return isToday && !["COMPLETED", "CANCELLED"].includes(o.status);
    });
  }, [myOrders, todayStr]);

  // 3. Terjadwal Mendatang: Order yang dikonfirmasi untuk esok hari atau lusa
  const futureOrders = useMemo(() => {
    return myOrders.filter((o) => {
      const isFuture = Boolean(o.schedule?.date && o.schedule.date > todayStr);
      return isFuture && !["COMPLETED", "CANCELLED"].includes(o.status);
    });
  }, [myOrders, todayStr]);

  // 4. Performa Bulanan Riil (Database Orders Selesai di Bulan Berjalan)
  const monthPerformance = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Orders for this month
    const thisMonthOrders = myOrders.filter((o) => {
      const dateStr = o.updatedAt || o.createdAt || "";
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    const fullRepairCompleted = thisMonthOrders.filter((o) => o.status === "COMPLETED").length;

    // Completed at diagnosis stage (customer declined repair or sparepart unavailable)
    const diagnosisOnlyCompleted = thisMonthOrders.filter(
      (o) =>
        o.status === "CANCELLED" &&
        (o.subStatus === "CANCELLED_PRICE_REJECTED" ||
          o.subStatus === "CANCELLED_SPAREPART_UNAVAILABLE" ||
          o.diagnosis?.status === "SUBMITTED")
    ).length;

    const totalDone = fullRepairCompleted + diagnosisOnlyCompleted;
    const totalAssigned = thisMonthOrders.length || totalDone || 1;
    const completionRate = Math.min(100, Math.round((totalDone / totalAssigned) * 100));

    return {
      totalAssigned: thisMonthOrders.length,
      totalDone,
      fullRepairCompleted,
      diagnosisOnlyCompleted,
      completionRate,
    };
  }, [myOrders]);

  // Completed Orders list
  const completedOrders = useMemo(() => {
    return myOrders.filter((o) => o.status === "COMPLETED");
  }, [myOrders]);

  // Dominant Active Job Selection
  const activeJob = useMemo(() => {
    // 1st Priority: ongoing order in the field
    if (ongoingOrders.length > 0) return ongoingOrders[0];
    // 2nd Priority: today's order accepted and ready to go
    const readyToday = todayOrders.find((o) => o.subStatus === "WORKER_ACCEPTED");
    if (readyToday) return readyToday;
    // 3rd Priority: today's order waiting acceptance
    const pendingToday = todayOrders.find(
      (o) => o.subStatus === "ASSIGNED_PENDING" || o.assignment?.status === "ASSIGNED"
    );
    if (pendingToday) return pendingToday;
    // 4th Priority: any today's order
    if (todayOrders.length > 0) return todayOrders[0];
    return null;
  }, [ongoingOrders, todayOrders]);

  // Filtered Orders for Tab 2 (Schedule Desk)
  const filteredScheduleOrders = useMemo(() => {
    let list: ServiceOrder[] = myOrders;

    if (scheduleFilter === "ONGOING") {
      list = ongoingOrders;
    } else if (scheduleFilter === "TODAY") {
      list = todayOrders;
    } else if (scheduleFilter === "FUTURE") {
      list = futureOrders;
    } else if (scheduleFilter === "COMPLETED") {
      list = completedOrders;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.serviceSnapshot.title.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.addressSnapshot.city.toLowerCase().includes(q) ||
          o.addressSnapshot.district?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [myOrders, scheduleFilter, ongoingOrders, todayOrders, futureOrders, completedOrders, searchQuery]);

  // Quick Action Handlers for Active Job
  const handleAcceptJob = async (orderId: string) => {
    setIsActionLoading(true);
    try {
      await acceptAssignment(orderId);
      setToastMessage("Penugasan berhasil diterima! Bersiap berangkat sesuai jadwal.");
      await refreshOrders(true);
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal menerima penugasan.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartTripAction = async (orderId: string) => {
    setIsActionLoading(true);
    try {
      await startTrip(orderId);
      setToastMessage("Status diperbarui: Anda sedang dalam perjalanan (OTW) menuju lokasi pelanggan.");
      await refreshOrders(true);
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal memperbarui status OTW.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleArriveAction = async (orderId: string) => {
    setIsActionLoading(true);
    try {
      await arriveAtLocation(orderId);
      setToastMessage("Status diperbarui: Anda telah tiba di lokasi. Silakan temui pelanggan dan mulai diagnosa!");
      await refreshOrders(true);
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal memperbarui status tiba.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto font-body text-slate-900 text-left">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* 1. PERSISTENT HEADER: WORKER IDENTITY & READINESS TOGGLE                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0F4C81] via-blue-700 to-sky-600 flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0 overflow-hidden border border-slate-200">
            {liveWorkerPhoto ? (
              <img
                src={liveWorkerPhoto}
                alt={workerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{workerInitials}</span>
            )}
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                isReady ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Teknisi Lapangan
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                {providerName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 mt-1">
              Halo, {workerName}
            </h1>
            <p className="text-xs text-slate-500">
              Pusat kendali operasional penanganan servis dan jadwal kerja lapangan Anda.
            </p>
          </div>
        </div>

        {/* Readiness Toggle Button */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={handleToggleReadiness}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 border shadow-xs cursor-pointer ${
              isReady
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span>{isReady ? "Siap Bertugas (Online)" : "Sedang Istirahat"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THREE-TAB WORKER NAVIGATION SWITCHER                                   */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("OPERATIONAL")}
          className={`px-4 sm:px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "OPERATIONAL"
              ? "bg-[#0F4C81] text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Truck size={16} weight={activeTab === "OPERATIONAL" ? "fill" : "bold"} />
          <span>Tugas Aktif &amp; Operasional</span>
          {ongoingOrders.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 animate-pulse">
              {ongoingOrders.length} Berjalan
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("SCHEDULE")}
          className={`px-4 sm:px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "SCHEDULE"
              ? "bg-[#0F4C81] text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <CalendarBlank size={16} weight={activeTab === "SCHEDULE" ? "fill" : "bold"} />
          <span>Papan Jadwal &amp; Antrean</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
            {myOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PERFORMANCE_SOP")}
          className={`px-4 sm:px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === "PERFORMANCE_SOP"
              ? "bg-[#0F4C81] text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <ShieldCheck size={16} weight={activeTab === "PERFORMANCE_SOP" ? "fill" : "bold"} />
          <span>Performa &amp; SOP K3</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            {monthPerformance.totalDone} Selesai
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TUGAS AKTIF & OPERASIONAL LAPANGAN                                 */}
      {/* ========================================================================= */}
      {activeTab === "OPERATIONAL" && (
        <div className="space-y-6">
          {/* 4 OPERATIONAL KPI METRICS (Dihitung Real Sesuai Rumus Akurat) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Sedang Berlangsung (HANYA order yang sudah mulai bergerak di jalan/lokasi) */}
            <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs bg-amber-50/20">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-xs font-semibold">Sedang Berlangsung</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              </div>
              <p className="text-2xl font-bold font-display text-amber-950 mt-1">{ongoingOrders.length}</p>
              <span className="text-[11px] text-amber-700 mt-1 block">Aktif di jalan / lokasi</span>
            </div>

            {/* 2. Tugas Hari Ini */}
            <div className="bg-white rounded-2xl border border-sky-200 p-4 shadow-xs bg-sky-50/20">
              <div className="flex items-center justify-between text-sky-800">
                <span className="text-xs font-semibold">Tugas Hari Ini</span>
                <Clock size={16} className="text-[#0F4C81]" />
              </div>
              <p className="text-2xl font-bold font-display text-sky-950 mt-1">{todayOrders.length}</p>
              <span className="text-[11px] text-sky-700 mt-1 block">Jadwal kunjungan hari ini</span>
            </div>

            {/* 3. Terjadwal Mendatang */}
            <div className="bg-white rounded-2xl border border-purple-200 p-4 shadow-xs bg-purple-50/20">
              <div className="flex items-center justify-between text-purple-800">
                <span className="text-xs font-semibold">Terjadwal Mendatang</span>
                <CalendarBlank size={16} className="text-purple-700" />
              </div>
              <p className="text-2xl font-bold font-display text-purple-950 mt-1">{futureOrders.length}</p>
              <span className="text-[11px] text-purple-700 mt-1 block">Jadwal esok &amp; lusa</span>
            </div>

            {/* 4. Performa Bulan Ini (Total Tugas Selesai Riil di Database) */}
            <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-xs bg-emerald-50/20">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-xs font-semibold">Selesai Bulan Ini</span>
                <CheckCircle size={16} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-bold font-display text-emerald-950 mt-1">{monthPerformance.totalDone}</p>
              <span className="text-[11px] text-emerald-700 mt-1 block">
                {monthPerformance.fullRepairCompleted} Servis • {monthPerformance.diagnosisOnlyCompleted} Diagnosa
              </span>
            </div>
          </div>

          {/* THE DOMINANT ACTIVE JOB CARD (HERO CARD - ONE NEXT ACTION) */}
          {activeJob ? (
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0F4C81] to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-md space-y-5">
              {/* Top Banner Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                    <span>{getWorkerStageBadge(activeJob).label}</span>
                  </span>
                  <span className="font-mono text-xs text-sky-200 font-semibold bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">
                    #{activeJob.orderNumber}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono text-sky-200">
                  <Clock size={15} />
                  <span>
                    {activeJob.schedule?.date || "Hari Ini"}
                    {activeJob.schedule?.timeSlot ? ` (${activeJob.schedule.timeSlot})` : ""}
                  </span>
                </div>
              </div>

              {/* Service Title & Issue */}
              <div>
                <span className="text-xs text-sky-200 font-semibold block uppercase tracking-wider">
                  Tugas Aktif Lapangan
                </span>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white mt-1 leading-snug">
                  {activeJob.serviceSnapshot.title}
                </h2>
                {activeJob.complaint?.description && (
                  <p className="text-xs text-sky-100/80 mt-1.5 line-clamp-2 bg-white/5 p-2.5 rounded-xl border border-white/10">
                    <strong className="text-white">Keluhan Konsumen:</strong> &ldquo;{activeJob.complaint.description}&rdquo;
                  </p>
                )}
              </div>

              {/* Customer & Location Context Box */}
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-xs border border-white/10 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-sky-200/20 text-sky-200 flex items-center justify-center font-bold">
                      <User size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm block">{activeJob.customerName}</span>
                      <span className="text-sky-200 text-[11px]">{activeJob.customerPhone || "Kontak tersedia"}</span>
                    </div>
                  </div>

                  {/* Direct Contact Buttons (Phone & WhatsApp) */}
                  {activeJob.customerPhone && (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <a
                        href={`tel:${activeJob.customerPhone}`}
                        className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold flex items-center gap-1.5 text-xs transition"
                      >
                        <Phone size={14} weight="fill" />
                        <span>Telepon</span>
                      </a>
                      <a
                        href={`https://wa.me/${activeJob.customerPhone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex items-center gap-1.5 text-xs transition shadow-xs"
                      >
                        <WhatsappLogo size={15} weight="fill" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/10 flex items-start gap-2 text-sky-100 text-xs">
                  <MapPin size={16} className="text-rose-300 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">
                    {activeJob.addressSnapshot.fullAddress || `${activeJob.addressSnapshot.district ? `${activeJob.addressSnapshot.district}, ` : ""}${activeJob.addressSnapshot.city}`}
                  </span>
                </div>
              </div>

              {/* ONE DOMINANT NEXT ACTION BUTTON (Terhubung Langsung ke Backend) */}
              <div className="pt-2">
                {activeJob.subStatus === "ASSIGNED_PENDING" || activeJob.assignment?.status === "ASSIGNED" ? (
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => handleAcceptJob(activeJob.id)}
                    className="w-full py-4 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle size={20} weight="bold" />
                    <span>TERIMA PENUGASAN INI SEKARANG</span>
                    <ArrowRight size={18} weight="bold" />
                  </button>
                ) : activeJob.subStatus === "WORKER_ACCEPTED" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleStartTripAction(activeJob.id)}
                      className="w-full py-4 px-5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Truck size={20} weight="bold" />
                      <span>MULAI PERJALANAN (OTW)</span>
                    </button>
                    <Link
                      href={`/worker/jobs/${activeJob.id}`}
                      className="w-full py-4 px-5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm border border-white/20 transition flex items-center justify-center gap-2 text-center"
                    >
                      <span>Lihat Rute &amp; Detail Tugas</span>
                    </Link>
                  </div>
                ) : activeJob.subStatus === "WORKER_OTW" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleArriveAction(activeJob.id)}
                      className="w-full py-4 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle size={20} weight="bold" />
                      <span>SAYA SUDAH TIBA DI LOKASI</span>
                    </button>
                    <Link
                      href={`/worker/jobs/${activeJob.id}`}
                      className="w-full py-4 px-5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm border border-white/20 transition flex items-center justify-center gap-2 text-center"
                    >
                      <span>Buka Lembar Kerja</span>
                    </Link>
                  </div>
                ) : (
                  <Link
                    href={`/worker/jobs/${activeJob.id}`}
                    className="w-full py-4 px-5 rounded-2xl bg-white text-[#0F4C81] hover:bg-sky-50 font-black text-sm shadow-md transition flex items-center justify-center gap-2 text-center"
                  >
                    <Wrench size={20} weight="bold" />
                    <span>BUKA LEMBAR KERJA TUGAS &amp; SOP</span>
                    <ArrowRight size={18} weight="bold" />
                  </Link>
                )}
              </div>
            </div>
          ) : (
            /* Empty State: Tidak ada pekerjaan aktif saat ini */
            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center space-y-3 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-3xs">
                <CheckCircle size={36} weight="duotone" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold font-display text-slate-900">
                  Tidak Ada Pekerjaan Sedang Berlangsung
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Anda sedang dalam kondisi siaga (*Standby*). Belum ada order yang sedang berjalan di jalan atau lokasi. Periksa antrean hari ini di bawah.
                </p>
              </div>
            </div>
          )}

          {/* ANTREAN TUGAS HARI INI (RINGKASAN CEPAT) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                  <Clock size={18} className="text-[#0F4C81]" />
                  <span>Antrean Tugas Hari Ini ({todayOrders.length})</span>
                </h3>
                <p className="text-xs text-slate-500">Daftar penugasan yang dijadwalkan untuk hari ini.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("SCHEDULE")}
                className="text-xs font-bold text-[#0F4C81] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Buka Papan Jadwal</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {todayOrders.length === 0 ? (
              <div className="py-7 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                Tidak ada sisa tugas terjadwal untuk hari ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {todayOrders.map((order, idx) => {
                  const stage = getWorkerStageBadge(order);
                  return (
                    <div
                      key={`today-job-${order.id}-${order.assignment?.assignmentId || idx}`}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 px-2 rounded-xl transition"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-900">#{order.orderNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${stage.className}`}>
                            {stage.label}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 text-sm">{order.serviceSnapshot.title}</p>
                        <p className="text-slate-500">
                          {order.customerName} • {order.addressSnapshot.district}, {order.addressSnapshot.city}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <Link
                          href={`/worker/jobs/${order.id}`}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs flex items-center gap-1"
                        >
                          <span>Buka Lembar Kerja</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PAPAN JADWAL TUGAS & ANTREAN (SCHEDULE DESK)                       */}
      {/* ========================================================================= */}
      {activeTab === "SCHEDULE" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
                <CalendarCheck size={18} className="text-[#0F4C81]" />
                Papan Penugasan &amp; Jadwal Kerja
              </h2>
              <p className="text-xs text-slate-500">
                Semua daftar order pengerjaan yang didelegasikan oleh bengkel mitra kepada Anda.
              </p>
            </div>

            <button
              type="button"
              onClick={() => refreshOrders(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <ArrowsClockwise size={14} />
              <span>Sinkron Data</span>
            </button>
          </div>

          {/* Subfilter & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs font-bold">
              {[
                { id: "ALL", label: "Semua", count: myOrders.length },
                { id: "ONGOING", label: "Sedang Berjalan", count: ongoingOrders.length },
                { id: "TODAY", label: "Hari Ini", count: todayOrders.length },
                { id: "FUTURE", label: "Mendatang", count: futureOrders.length },
                { id: "COMPLETED", label: "Selesai", count: completedOrders.length },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setScheduleFilter(f.id as ScheduleFilter)}
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    scheduleFilter === f.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative sm:w-64">
              <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari order, pelanggan, kota..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#0F4C81]"
              />
            </div>
          </div>

          {/* Schedule List */}
          {filteredScheduleOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
              Tidak ada tugas yang sesuai dengan filter atau kata kunci pencarian.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredScheduleOrders.map((order, idx) => {
                const stage = getWorkerStageBadge(order);
                const isOngoingThis = ongoingOrders.some((o) => o.id === order.id);

                return (
                  <div
                    key={`schedule-job-${order.id}-${order.assignment?.assignmentId || idx}`}
                    className={`p-4 rounded-2xl border transition ${
                      isOngoingThis
                        ? "bg-amber-50/30 border-amber-300 ring-1 ring-amber-200"
                        : "bg-white border-slate-200/90 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-900 text-xs">#{order.orderNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${stage.className}`}>
                            {stage.label}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock size={12} />
                            {order.schedule?.date || "Hari Ini"}
                            {order.schedule?.timeSlot ? `, ${order.schedule.timeSlot}` : ""}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">
                          {order.serviceSnapshot.title}
                        </h4>
                        <p className="text-slate-500 text-xs flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span>
                            {order.customerName} • {order.addressSnapshot.district}, {order.addressSnapshot.city}
                          </span>
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <Link
                          href={`/worker/jobs/${order.id}`}
                          className="px-4 py-2 rounded-xl bg-[#0F4C81] hover:bg-[#0d3f6b] text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
                        >
                          <span>Buka Lembar Kerja</span>
                          <ArrowRight size={14} weight="bold" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PERFORMA BULANAN & PANDUAN SOP K3                                  */}
      {/* ========================================================================= */}
      {activeTab === "PERFORMANCE_SOP" && (
        <div className="space-y-6">
          {/* 1. PERFORMA BULANAN DENGAN BREAKDOWN TERBUKA (TRANSPARAN 100% DATABASE) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Pencapaian Kerja Lapangan
              </span>
              <h2 className="text-xl font-bold font-display text-slate-900 mt-1">
                Performa Produktivitas Bulan Ini
              </h2>
              <p className="text-xs text-slate-500">
                Rekapitulasi resmi penuntasan order lapangan yang didelegasikan oleh bengkel kepada Anda.
              </p>
            </div>

            {/* Performance Showcase Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white border border-emerald-200 shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-800">
                  Total Tugas Dituntaskan Bulan Ini
                </span>
                <p className="text-3xl font-extrabold font-display text-emerald-950">
                  {monthPerformance.totalDone} Order
                </p>
                <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium pt-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 border border-emerald-300 font-bold">
                    ✓ {monthPerformance.fullRepairCompleted} Servis Tuntas Selesai (Full Repair)
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-teal-100 border border-teal-300 font-bold">
                    ✓ {monthPerformance.diagnosisOnlyCompleted} Selesai Tahap Diagnosis
                  </span>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-emerald-200 sm:pl-6 space-y-1">
                <span className="text-xs text-slate-500 block">Tingkat Ketuntasan</span>
                <p className="text-2xl font-black font-display text-[#0F4C81]">
                  {monthPerformance.completionRate}%
                </p>
                <span className="text-[11px] text-slate-400 block">Rasio Selesai / Ditugaskan</span>
              </div>
            </div>
          </div>

          {/* 2. PANDUAN STANDAR SOP & K3 SEBELUM BERANGKAT */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  Standar Keselamatan Kerja (K3)
                </span>
                <h3 className="text-lg font-bold font-display text-slate-900 mt-1">
                  Checklist APD &amp; Kelayakan Peralatan Sebelum Berangkat
                </h3>
                <p className="text-xs text-slate-500">
                  Pastikan seluruh kelengkapan keselamatan kerja telah siap sebelum menuju ke alamat pelanggan.
                </p>
              </div>

              <Link
                href="/worker/guide"
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
              >
                <BookOpen size={15} />
                <span>Buku Saku SOP Lengkap</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {/* Checklist Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { key: "helm_apd", label: "Helm Standar & Kacamata Pelindung Mata (Safety Goggles)" },
                { key: "sarung_tangan", label: "Sarung Tangan Isolator Listrik Anti-Shock" },
                { key: "multimeter", label: "Multimeter Digital & Tang Ampere (Terkalibrasi)" },
                { key: "manifold_freon", label: "Manifold Gauge & Selang Pengisian Refrigerant" },
                { key: "toolkit_lengkap", label: "Toolkit Lengkap (Obeng Insulated, Kunci Pas, Tang)" },
                { key: "app_aktif", label: "Aplikasi Servio Aktif di Ponsel (Baterai Minimal 40%)" },
              ].map((item) => {
                const isChecked = Boolean(k3Checklist[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleK3Item(item.key)}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                      isChecked
                        ? "bg-emerald-50/50 border-emerald-300 text-emerald-950"
                        : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                        isChecked
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white border-slate-300"
                      }`}
                    >
                      {isChecked && <Check size={12} weight="bold" />}
                    </div>
                    <span className="font-semibold leading-relaxed">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. RINGKASAN 14 TAHAPAN RESMI SIKLUS SERVIS SERVIO */}
          <div className="bg-slate-50 rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C81]" />
              <h4 className="font-bold font-display text-sm text-slate-900">
                Alur 14 Tahapan Terstandarisasi Servio (Panduan Lapangan)
              </h4>
            </div>
            <p className="text-slate-500">
              Siklus pengerjaan resmi yang dipantau pelanggan dan bengkel dari keberangkatan hingga selesai:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              {[
                "1. Booking & Survei",
                "2. Konfirmasi Toko",
                "3. Penugasan Teknisi",
                "4. Respons Teknisi",
                "5. Jadwal Servis",
                "6. Teknisi OTW",
                "7. Teknisi Tiba",
                "8. Diagnosa Unit",
                "9. Persetujuan Biaya",
                "10. Pengerjaan Servis",
                "11. Servis Selesai",
                "12. Pelunasan Tagihan",
                "13. Kunjungan Ditutup",
                "14. Selesai & Garansi",
              ].map((stage, idx) => (
                <div key={idx} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium">
                  {stage}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
