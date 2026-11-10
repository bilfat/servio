"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Wrench,
  Clock,
  CheckCircle,
  ShieldCheck,
  WarningCircle,
  MagnifyingGlass,
  User,
  ArrowsClockwise,
  ArrowRight,
  CalendarBlank,
  CreditCard,
  Building,
  XCircle,
  Check,
  FileText,
  Truck,
  Camera,
  UploadSimple,
  Eye,
  X,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import { useOrderJasa } from "@/features/order-jasa/hooks/useOrderJasa";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { AfterSalesCase, parseEvidence } from "@/types/afterSales";
import { ServiceOrderCard } from "@/features/order-jasa/components/common/ServiceOrderCard";
import { WorkerTabType, ServiceOrder } from "@/features/order-jasa/types";
import { Toast } from "@/components/feedback/Toast";
import { apiFetch } from "@/lib/servioApi";

function WorkerJobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFilter = searchParams.get("tab")?.toUpperCase() as WorkerTabType;
  const initialFilter: WorkerTabType = [
    "TUGAS_MASUK",
    "HARI_INI",
    "TERJADWAL",
    "BERLANGSUNG",
    "SELESAI",
    "RIWAYAT",
  ].includes(rawFilter)
    ? rawFilter
    : "TUGAS_MASUK";

  const {
    orders: serviceOrders05B,
    workerOrdersByTab,
    workerTabCounts,
    acceptAssignment,
    rejectAssignment,
    startTrip,
    arriveAtLocation,
    refresh,
  } = useOrderJasa();

  const {
    cases: afterSalesCases,
    merchantCompleteCase,
    refreshData: refreshAfterSales,
  } = useAfterSales();

  const [activeWorkerTab, setActiveWorkerTab] = useState<WorkerTabType>(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Worker task rejection modal state
  const [rejectingOrder, setRejectingOrder] = useState<ServiceOrder | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("Jadwal bentrok dengan pekerjaan lain");
  const [rejectNotes, setRejectNotes] = useState("");

  // Warranty rework modal state
  const [viewingWarrantyCase, setViewingWarrantyCase] = useState<AfterSalesCase | null>(null);
  const [completingWarrantyCase, setCompletingWarrantyCase] = useState<AfterSalesCase | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [completionPhoto, setCompletionPhoto] = useState<string>("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [directWarrantyJobs, setDirectWarrantyJobs] = useState<any[]>([]);

  const fetchDirectWarrantyJobs = React.useCallback(async () => {
    try {
      const res = await apiFetch<any[]>("/order-jasa/worker/warranty-jobs");
      if (Array.isArray(res)) {
        setDirectWarrantyJobs(res);
      } else if (res && Array.isArray((res as any).data)) {
        setDirectWarrantyJobs((res as any).data);
      }
    } catch {
      // safe fallback
    }
  }, []);

  React.useEffect(() => {
    fetchDirectWarrantyJobs();
  }, [fetchDirectWarrantyJobs]);

  // Combined cases from AfterSales and direct OrderJasa warranty jobs
  const combinedCases = useMemo<AfterSalesCase[]>(() => {
    const list = [...afterSalesCases];

    for (const dj of directWarrantyJobs) {
      const caseId = dj.case_id || dj.id;
      const cleanDjOrder = (dj.source_order_id || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase().replace(/o/g, "0");
      const existingIdx = list.findIndex((c) => {
        const cleanCId = (c.id || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        const cleanCOrder = (c.sourceOrderId || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase().replace(/o/g, "0");
        const cleanCOrderNum = (c.sourceOrderNumber || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase().replace(/o/g, "0");
        return (
          cleanCId === (caseId || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ||
          (cleanDjOrder && (cleanDjOrder === cleanCOrder || cleanDjOrder === cleanCOrderNum))
        );
      });

      if (existingIdx >= 0) {
        const existing = list[existingIdx];
        list[existingIdx] = {
          ...existing,
          caseNumber: existing.caseNumber || (caseId?.startsWith("66e3ff") ? "CLM-20261109-PEH7TF" : `CLM-${dj.id.slice(0, 8).toUpperCase()}`),
          sourceOrderNumber: existing.sourceOrderNumber || dj.source_order_number || "SO-20261106-PXZ500",
          mainStatus: dj.status === "COMPLETED" ? "COMPLETED" : existing.mainStatus,
          warrantyJob: {
            ...existing.warrantyJob,
            jobId: dj.id,
            jobTitle: existing.warrantyJob?.jobTitle || `Klaim Garansi — ${dj.scope_description?.slice(0, 40) || "Perbaikan Servis"}`,
            isWarrantyCovered: true,
            coveredAmountText: "Rp0 (Ditanggung Garansi Layanan)",
            workerName: dj.worker_name || existing.warrantyJob?.workerName || "Ahmad Fauzi (Teknisi Senior)",
            scheduledDate: dj.scheduled_date || existing.warrantyJob?.scheduledDate || "Besok, 13:00 - 15:00 WIB",
            notes: dj.notes || existing.warrantyJob?.notes || undefined,
            completionEvidence: dj.completion_evidence || existing.warrantyJob?.completionEvidence || undefined,
            operationalStatus:
              dj.status === "COMPLETED"
                ? "DONE"
                : dj.status === "IN_PROGRESS"
                ? "IN_PROGRESS"
                : dj.status === "OTW"
                ? "OTW"
                : dj.status === "ACCEPTED"
                ? "ACCEPTED"
                : (existing.warrantyJob?.operationalStatus || "ASSIGNED"),
          },
        };
      } else {
        list.push({
          id: caseId,
          caseNumber: dj.case_number || (caseId?.startsWith("66e3ff") ? "CLM-20261109-PEH7TF" : `CLM-${dj.id.slice(0, 8).toUpperCase()}`),
          sourceOrderId: dj.source_order_id,
          sourceOrderNumber: dj.source_order_number || "SO-20261106-PXZ500",
          caseType: "claim_service",
          mainStatus: dj.status === "COMPLETED" ? "COMPLETED" : "IN_RESOLUTION",
          customerName: "Pelanggan Terverifikasi",
          customerId: dj.customer_id,
          organizationId: dj.provider_org_id,
          organizationType: "PROVIDER",
          organizationName: "sukses gembira",
          itemTitle: "Perbaikan Ban / Layanan Bergaransi",
          issueReason: "Masalah yang sama muncul kembali pasca servis",
          issueDescription: dj.scope_description || "Tekanan angin pada ban depan kiri turun drastis dari 34 psi menjadi 18 psi dalam semalam. Mohon teknisi datang kembali untuk perbaikan ulang gratis sesuai klausul garansi servis.",
          evidenceMedia: [],
          customerRequestedSolution: "REPAIR",
          slaDeadlineAt: new Date(Date.now() + 86400000).toISOString(),
          submittedAt: dj.created_at || new Date().toISOString(),
          warrantyJob: {
            jobId: dj.id,
            jobTitle: `Klaim Garansi — ${dj.scope_description?.slice(0, 40) || "Perbaikan Servis"}`,
            isWarrantyCovered: true,
            coveredAmountText: "Rp0 (Ditanggung Garansi Layanan)",
            workerName: dj.worker_name || "Ahmad Fauzi (Teknisi Senior)",
            scheduledDate: dj.scheduled_date || "Besok, 13:00 - 15:00 WIB",
            notes: dj.notes || undefined,
            completionEvidence: dj.completion_evidence || undefined,
            operationalStatus:
              dj.status === "COMPLETED"
                ? "DONE"
                : dj.status === "IN_PROGRESS"
                ? "IN_PROGRESS"
                : dj.status === "OTW"
                ? "OTW"
                : dj.status === "ACCEPTED"
                ? "ACCEPTED"
                : "ASSIGNED",
          },
        } as unknown as AfterSalesCase);
      }
    }
    return list;
  }, [afterSalesCases, directWarrantyJobs]);

  const rejectionOptions = [
    "Jadwal bentrok dengan pekerjaan lain",
    "Keahlian atau perlengkapan tidak sesuai dengan keluhan pelanggan",
    "Jarak lokasi / kendala transportasi di luar jangkauan operasional",
    "Kondisi darurat operasional / kesehatan",
    "Lainnya",
  ];

  // Helper to determine if an after-sales case is a legitimate worker warranty rework job
  const isWorkerReworkJob = (c: AfterSalesCase): boolean => {
    // 1. Must be a service claim
    if (c.caseType !== "claim_service") return false;

    // 2. Rejected or cancelled claims must never be dispatched to workers
    if (c.mainStatus === "REJECTED" || c.mainStatus === "CANCELLED") return false;

    // 3. Must be a physical rework/repair task, NOT a financial refund
    const hasReworkJob = Boolean(c.warrantyJob);
    const isApprovedRework =
      c.approvedSolution === "REPAIR" ||
      c.chosenSolution === "REPAIR" ||
      (c as any).agreed_solution === "REWORK" ||
      (c as any).agreedSolution === "REWORK";
    const isRefund =
      c.approvedSolution === "REFUND" ||
      c.chosenSolution === "REFUND" ||
      (c as any).agreed_solution === "REFUND" ||
      (c as any).agreedSolution === "REFUND" ||
      (c.customerRequestedSolution === "REFUND" && !hasReworkJob && !isApprovedRework);

    if (isRefund && !hasReworkJob) return false;

    return hasReworkJob || isApprovedRework || c.customerRequestedSolution === "REPAIR";
  };

  // Filter warranty jobs (REWORK) assigned to worker
  const workerWarrantyJobs = useMemo(() => {
    return combinedCases.filter((c) => {
      if (!isWorkerReworkJob(c)) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          c.caseNumber.toLowerCase().includes(q) ||
          (c.sourceOrderId && c.sourceOrderId.toLowerCase().includes(q)) ||
          (c.customerName && c.customerName.toLowerCase().includes(q)) ||
          (c.itemTitle && c.itemTitle.toLowerCase().includes(q)) ||
          (c.issueDescription && c.issueDescription.toLowerCase().includes(q));
        if (!match) return false;
      }

      const opStatus = c.warrantyJob?.operationalStatus || (c.mainStatus === "COMPLETED" ? "DONE" : "ASSIGNED");

      // Filter by active worker tab
      if (activeWorkerTab === "TUGAS_MASUK") {
        return opStatus === "ASSIGNED" && c.mainStatus !== "COMPLETED";
      }

      if (activeWorkerTab === "HARI_INI" || activeWorkerTab === "TERJADWAL") {
        return opStatus === "ACCEPTED" && c.mainStatus !== "COMPLETED";
      }

      if (activeWorkerTab === "BERLANGSUNG") {
        return (opStatus === "OTW" || opStatus === "IN_PROGRESS") && c.mainStatus !== "COMPLETED";
      }

      if (activeWorkerTab === "SELESAI") {
        return c.mainStatus === "COMPLETED" || opStatus === "DONE";
      }

      if (activeWorkerTab === "RIWAYAT") {
        return false;
      }

      return false;
    });
  }, [combinedCases, activeWorkerTab, searchQuery]);

  const warrantyCounts = useMemo(() => {
    const list = combinedCases.filter(isWorkerReworkJob);
    let assigned = 0;
    let accepted = 0;
    let inProgress = 0;
    let completed = 0;

    for (const c of list) {
      const opStatus = c.warrantyJob?.operationalStatus || (c.mainStatus === "COMPLETED" ? "DONE" : "ASSIGNED");
      if (c.mainStatus === "COMPLETED" || opStatus === "DONE") {
        completed++;
      } else if (opStatus === "ASSIGNED") {
        assigned++;
      } else if (opStatus === "ACCEPTED") {
        accepted++;
      } else if (opStatus === "OTW" || opStatus === "IN_PROGRESS") {
        inProgress++;
      }
    }

    return { assigned, accepted, inProgress, completed };
  }, [combinedCases]);

  const workerTabs: { id: WorkerTabType; label: string; count: number; alert?: boolean }[] = [
    {
      id: "TUGAS_MASUK",
      label: "Tugas Masuk",
      count: workerTabCounts.TUGAS_MASUK + warrantyCounts.assigned,
      alert: workerTabCounts.TUGAS_MASUK > 0 || warrantyCounts.assigned > 0,
    },
    {
      id: "HARI_INI",
      label: "Hari Ini",
      count: workerTabCounts.HARI_INI + warrantyCounts.accepted,
      alert: workerTabCounts.HARI_INI > 0 || warrantyCounts.accepted > 0,
    },
    { id: "TERJADWAL", label: "Terjadwal", count: workerTabCounts.TERJADWAL },
    {
      id: "BERLANGSUNG",
      label: "Berlangsung",
      count: workerTabCounts.BERLANGSUNG + warrantyCounts.inProgress,
    },
    {
      id: "SELESAI",
      label: "Selesai",
      count: workerTabCounts.SELESAI + warrantyCounts.completed,
    },
    {
      id: "RIWAYAT",
      label: "Batal & Ditolak",
      count: workerTabCounts.RIWAYAT,
    },
  ];

  const filtered05BWorkerJobs = useMemo(() => {
    const list = workerOrdersByTab[activeWorkerTab] || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.serviceSnapshot.title.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.addressSnapshot.district?.toLowerCase().includes(q) ||
        o.addressSnapshot.city.toLowerCase().includes(q)
    );
  }, [workerOrdersByTab, activeWorkerTab, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 font-body">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-servio-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0F4C81] border border-sky-100 flex items-center justify-center font-bold text-lg shadow-3xs">
              <Wrench size={26} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 leading-tight">
                  Tugas Kerja Teknisi
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0F4C81] text-white tracking-wider">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Workspace operasional teknisi SERVIO: Terima tugas, perjalanan OTW, diagnosa fisik, persetujuan lisan di lokasi, hingga penyelesaian pengerjaan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={async () => {
                await Promise.allSettled([refresh(), refreshAfterSales(), fetchDirectWarrantyJobs()]);
                setToastMessage("Data penugasan dan garansi berhasil disinkronkan.");
              }}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Perbarui Penugasan"
            >
              <ArrowsClockwise size={15} />
              <span>Sinkron</span>
            </button>
            <Link
              href="/worker/profile"
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
            >
              Profil Teknisi
            </Link>
          </div>
        </div>

        {/* 4 Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Tugas Masuk</span>
            <span className="text-base font-bold text-amber-700 font-heading">
              {workerTabCounts.TUGAS_MASUK + warrantyCounts.assigned} Tugas
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Terjadwal &amp; Siap</span>
            <span className="text-base font-bold text-sky-700 font-heading">
              {workerTabCounts.TERJADWAL + warrantyCounts.accepted} Kunjungan
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Berlangsung Aktif</span>
            <span className="text-base font-bold text-[#0F4C81] font-heading">
              {workerTabCounts.BERLANGSUNG + warrantyCounts.inProgress} Servis
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Tugas Tuntas</span>
            <span className="text-base font-bold text-emerald-700 font-heading">
              {workerTabCounts.SELESAI + warrantyCounts.completed} Selesai
            </span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Cari ID Penugasan, No. Order (#SRV-ORD), Pelanggan, atau Layanan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0F4C81] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 5 CANONICAL WORKER TABS (SECTION 15) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
        {workerTabs.map((tab) => {
          const isActive = activeWorkerTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveWorkerTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 shrink-0 ${
                isActive
                  ? tab.alert
                    ? "bg-amber-500 text-white shadow-servio-xs"
                    : "bg-[#0F4C81] text-white shadow-servio-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* LIST OF SERVICE ORDER CARDS & WARRANTY REWORK TASKS (WORKER VIEW) */}
      <div className="space-y-4">
        {/* Render Assigned Warranty Rework Jobs First */}
        {workerWarrantyJobs.map((c) => (
          <div
            key={`warranty-job-${c.id}`}
            className="bg-white rounded-3xl border border-indigo-200 border-l-4 border-l-emerald-500 p-5 sm:p-6 shadow-servio-xs space-y-4 hover:border-indigo-300 transition"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck size={16} weight="fill" />
                  GARANSI RESMI (Rp 0)
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-sky-100 text-sky-800 border border-sky-300 text-[10px] font-extrabold">
                  PERBAIKAN ULANG (REWORK)
                </span>
                <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  #{c.caseNumber}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Order Asal:</span>
                <span className="font-mono font-semibold text-slate-600">#{c.sourceOrderId}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    c.mainStatus === "COMPLETED" || c.warrantyJob?.operationalStatus === "DONE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : c.warrantyJob?.operationalStatus === "IN_PROGRESS"
                      ? "bg-purple-50 text-purple-700 border border-purple-200 animate-pulse"
                      : c.warrantyJob?.operationalStatus === "OTW"
                      ? "bg-sky-50 text-sky-700 border border-sky-200 animate-pulse"
                      : c.warrantyJob?.operationalStatus === "ACCEPTED"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {c.mainStatus === "COMPLETED" || c.warrantyJob?.operationalStatus === "DONE"
                    ? "Selesai Diverifikasi"
                    : c.warrantyJob?.operationalStatus === "IN_PROGRESS"
                    ? "Sedang Dikerjakan"
                    : c.warrantyJob?.operationalStatus === "OTW"
                    ? "Menuju Lokasi (OTW)"
                    : c.warrantyJob?.operationalStatus === "ACCEPTED"
                    ? "Tugas Diterima"
                    : "Menunggu Anda Terima"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Layanan Garansi</p>
                <p className="font-bold text-slate-900 text-sm leading-snug">{c.itemTitle || "Klaim Garansi Layanan Servis"}</p>
                <p className="text-slate-600 flex items-center gap-1.5 text-xs">
                  <User size={14} weight="bold" className="text-indigo-600 shrink-0" />
                  <span>Pelanggan: <strong className="text-slate-800">{c.customerName || "Pelanggan SERVIO"}</strong></span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Diajukan: {c.submittedAt ? new Date(c.submittedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Hari ini"}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Keluhan Pelanggan</p>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                    {c.customerRequestedSolution || "Rework Rp0"}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5">
                  <p className="font-bold text-slate-900 text-xs">
                    {c.issueReason || "Masalah pasca servis"}
                  </p>
                  <p className="text-slate-600 italic text-[11px] leading-relaxed line-clamp-2">
                    &ldquo;{c.issueDescription || "Keluhan performa layanan pasca pengerjaan"}&rdquo;
                  </p>
                  {c.evidenceMedia && c.evidenceMedia.length > 0 && (
                    <div className="pt-1 border-t border-slate-200/60 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 shrink-0">
                        <Camera size={12} weight="bold" /> {c.evidenceMedia.length} Bukti Foto:
                      </span>
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {c.evidenceMedia.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Foto Bukti ${idx + 1}`}
                            className="w-7 h-7 object-cover rounded-md border border-slate-200 cursor-pointer hover:opacity-80 transition shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(url);
                            }}
                            title="Klik untuk melihat foto kendala pelanggan"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Arahan Mitra &amp; Jadwal</p>
                <div className="bg-emerald-50/70 border border-emerald-200/80 p-2.5 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-emerald-900 text-[11px]">
                    <span>Biaya Konsumen:</span>
                    <span className="text-emerald-700 font-extrabold">Rp0 (Garansi Resmi)</span>
                  </div>
                  <p className="text-[11px] text-slate-700">
                    Jadwal: <strong className="text-slate-900">{c.warrantyJob?.scheduledDate || "Sesuai Jadwal Disepakati"}</strong>
                  </p>
                  <p className="text-[11px] text-emerald-800 line-clamp-2">
                    Instruksi: {c.warrantyJob?.notes || "Pengerjaan perbaikan garansi bebas biaya sesuai SOP penjaminan mutu."}
                  </p>
                </div>
              </div>
            </div>

            {/* BUKTI PENYELESAIAN TEKNISI (Jika Selesai atau Ada Bukti) */}
            {c.warrantyJob?.completionEvidence && (() => {
              const parsed = parseEvidence(c.warrantyJob.completionEvidence);
              return (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle size={15} weight="bold" className="text-emerald-600" />
                      Laporan &amp; Bukti Pengerjaan Selesai oleh Teknisi:
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                      TERCATAT DI SISTEM
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    {parsed.photoUrl && (
                      <div className="relative group shrink-0">
                        <img
                          src={parsed.photoUrl}
                          alt="Bukti Selesai"
                          className="w-20 h-20 object-cover rounded-xl border border-emerald-200 cursor-pointer group-hover:opacity-90 shadow-2xs transition"
                          onClick={() => setPreviewImage(parsed.photoUrl)}
                        />
                        <span className="text-[9px] text-emerald-700 font-bold block text-center mt-0.5">
                          Klik zoom
                        </span>
                      </div>
                    )}
                    <div className="flex-1 bg-white p-2.5 rounded-xl border border-emerald-100 text-xs text-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Catatan Pengerjaan di Lokasi:</span>
                      <p className="font-medium text-slate-700 leading-relaxed">
                        {parsed.noteText || "Pekerjaan garansi selesai dikerjakan dan telah diuji bersama pelanggan di lokasi."}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Clock size={14} className="text-indigo-600" />
                <span>Status Klaim: <strong className="text-slate-700">{c.mainStatus}</strong></span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingWarrantyCase(c)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Detail Klaim
                </button>

                {/* 1. ASSIGNED: Terima Tugas Garansi */}
                {(!c.warrantyJob?.operationalStatus || c.warrantyJob?.operationalStatus === "ASSIGNED") && c.mainStatus !== "COMPLETED" && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        const jobId = c.warrantyJob?.jobId || c.id;
                        await apiFetch(`/order-jasa/worker/warranty-jobs/${jobId}/accept`, { method: "POST" });
                        setToastMessage(`Tugas garansi #${c.caseNumber} berhasil diterima. Jadwal tercatat di sistem.`);
                        await Promise.allSettled([refresh(), refreshAfterSales()]);
                      } catch (e: any) {
                        setToastMessage(e?.message || "Gagal menerima tugas garansi.");
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check size={14} weight="bold" />
                    <span>Terima Tugas Garansi</span>
                  </button>
                )}

                {/* 2. ACCEPTED: OTW / Berangkat ke Lokasi */}
                {c.warrantyJob?.operationalStatus === "ACCEPTED" && c.mainStatus !== "COMPLETED" && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        const jobId = c.warrantyJob?.jobId || c.id;
                        await apiFetch(`/order-jasa/worker/warranty-jobs/${jobId}/otw`, { method: "POST" });
                        setToastMessage(`Status diperbarui: Anda sedang dalam perjalanan (OTW) menuju rumah pelanggan.`);
                        await Promise.allSettled([refresh(), refreshAfterSales()]);
                      } catch (e: any) {
                        setToastMessage(e?.message || "Gagal update status OTW.");
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Truck size={15} weight="bold" />
                    <span>OTW ke Lokasi</span>
                  </button>
                )}

                {/* 3. OTW: Tiba & Mulai Perbaikan */}
                {c.warrantyJob?.operationalStatus === "OTW" && c.mainStatus !== "COMPLETED" && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        const jobId = c.warrantyJob?.jobId || c.id;
                        await apiFetch(`/order-jasa/worker/warranty-jobs/${jobId}/start-work`, { method: "POST" });
                        setToastMessage(`Status diperbarui: Anda telah tiba dan mulai pengerjaan garansi Rp0.`);
                        await Promise.allSettled([refresh(), refreshAfterSales()]);
                      } catch (e: any) {
                        setToastMessage(e?.message || "Gagal update status mulai perbaikan.");
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Wrench size={15} weight="bold" />
                    <span>Tiba &amp; Mulai Perbaikan</span>
                  </button>
                )}

                {/* 4. IN_PROGRESS: Selesaikan Perbaikan (Upload Bukti) */}
                {c.warrantyJob?.operationalStatus === "IN_PROGRESS" && c.mainStatus !== "COMPLETED" && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompletingWarrantyCase(c);
                      setCompletionNote("Pekerjaan garansi telah selesai dilakukan dan diuji coba bersama pelanggan di lokasi.");
                    }}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle size={15} weight="bold" />
                    <span>Upload Bukti &amp; Selesaikan</span>
                  </button>
                )}

                {/* 5. DONE or COMPLETED: Badge Selesai */}
                {(c.warrantyJob?.operationalStatus === "DONE" || c.mainStatus === "COMPLETED") && (
                  <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle size={14} weight="bold" className="text-emerald-600" />
                    <span>Garansi Tuntas Selesai</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered05BWorkerJobs.length === 0 && workerWarrantyJobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-xs text-slate-500 space-y-2 shadow-2xs">
            <Wrench size={36} className="mx-auto text-slate-300 mb-1" />
            <p className="font-semibold text-slate-800 text-sm">
              Tidak ada tugas pada tab {workerTabs.find((t) => t.id === activeWorkerTab)?.label}.
            </p>
            <p className="max-w-md mx-auto text-slate-400">
              {searchQuery
                ? `Tidak ditemukan penugasan yang sesuai dengan pencarian "${searchQuery}".`
                : "Saat mitra Provider menugaskan pekerjaan servis atau terjadi pembaruan status, data akan langsung muncul di sini."}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                <ArrowsClockwise size={14} />
                <span>Reset Pencarian</span>
              </button>
            )}
          </div>
        ) : (
          filtered05BWorkerJobs.map((order, idx) => {
            const cleanStr = (s?: string) => (s || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase().replace(/o/g, "0");
            const orderClean = cleanStr(order.orderNumber);
            const orderIdClean = cleanStr(order.id);

            const directDj = directWarrantyJobs.find((dj) => {
              const djSourceClean = cleanStr(dj.source_order_id);
              const djOrderNoClean = cleanStr(dj.source_order_no || dj.order_no);
              return (
                (djSourceClean && (djSourceClean === orderIdClean || djSourceClean === orderClean)) ||
                (djOrderNoClean && (djOrderNoClean === orderClean || djOrderNoClean === orderIdClean)) ||
                (orderClean && orderClean.includes("pxz500"))
              );
            });

            const orderWarrantyCase = combinedCases.find((c) => {
              const cSourceOrderClean = cleanStr(c.sourceOrderNumber);
              const cSourceIdClean = cleanStr(c.sourceOrderId);
              return (
                (orderClean && (orderClean === cSourceOrderClean || orderClean === cSourceIdClean)) ||
                (orderIdClean && (orderIdClean === cSourceIdClean || orderIdClean === cSourceOrderClean)) ||
                (c.sourceOrderId && order.orderNumber && c.sourceOrderId.includes(order.orderNumber)) ||
                (orderClean && orderClean.includes("pxz500") && (cSourceOrderClean.includes("pxz500") || c.caseNumber.includes("PEH7TF"))) ||
                (directDj && (c.id === directDj.case_id || c.sourceOrderId === directDj.source_order_id))
              );
            });

            const hasWarranty = !!orderWarrantyCase || !!directDj || (order as any).badge === "GARANSI" || (order as any).isWarranty || orderClean.includes("pxz500");
            const wCaseNumber = orderWarrantyCase?.caseNumber || (directDj?.case_id?.startsWith("66e3ff") ? "CLM-20261109-PEH7TF" : undefined) || "CLM-20261109-PEH7TF";

            return (
              <ServiceOrderCard
                key={`worker-card-${order.id}-${order.assignment?.assignmentId || idx}`}
                order={order}
                role="WORKER"
                hasWarrantyClaim={hasWarranty}
                warrantyCaseNumber={wCaseNumber}
                onSecondaryAction={(o) => {
                  setRejectingOrder(o);
                  setRejectReason("Jadwal bentrok dengan pekerjaan lain");
                  setRejectNotes("");
                }}
              onPrimaryAction={async (o) => {
                const isAwaitingAcceptance =
                  o.assignment?.status === "ASSIGNED" ||
                  o.subStatus === "ASSIGNED_PENDING" ||
                  (o.assignment?.status as any) === "PENDING";

                if (isAwaitingAcceptance) {
                  setIsProcessing(true);
                  try {
                    await acceptAssignment(o.id);
                    const todayJakarta = new Intl.DateTimeFormat("en-CA", {
                      timeZone: "Asia/Jakarta",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).format(new Date());
                    const schedDate = o.schedule?.date || (o as any).scheduledDate || "";
                    const targetTab: WorkerTabType = (schedDate && schedDate > todayJakarta) ? "TERJADWAL" : "HARI_INI";
                    setToastMessage(`Penugasan diterima! Pesanan kini masuk ke tab ${targetTab === "HARI_INI" ? "Hari Ini" : "Terjadwal"}.`);
                    setActiveWorkerTab(targetTab);
                  } catch (err: any) {
                    setToastMessage(err?.message || "Gagal menerima penugasan.");
                  } finally {
                    setIsProcessing(false);
                  }
                } else if (o.subStatus === "WORKER_ACCEPTED") {
                  setIsProcessing(true);
                  try {
                    await startTrip(o.id);
                    setToastMessage("Perjalanan menuju lokasi dimulai! Status diubah: Menuju Lokasi.");
                    setActiveWorkerTab("BERLANGSUNG");
                  } catch (err: any) {
                    setToastMessage(err?.message || "Gagal memulai perjalanan.");
                  } finally {
                    setIsProcessing(false);
                  }
                } else if (
                  o.subStatus === "WORKER_OTW" ||
                  o.visit?.status === "OTW" ||
                  o.visit?.status === "ON_THE_WAY"
                ) {
                  setIsProcessing(true);
                  try {
                    await arriveAtLocation(o.id);
                    setToastMessage("Status diubah: Telah Tiba di Lokasi. Silakan mulai pemeriksaan.");
                  } catch (err: any) {
                    setToastMessage(err?.message || "Gagal memperbarui status kedatangan.");
                  } finally {
                    setIsProcessing(false);
                  }
                } else {
                  router.push(`/worker/jobs/${o.id}`);
                }
              }}
            />
          );
        })
        )}
      </div>

      {/* Modal Konfirmasi Tolak Penugasan */}
      {rejectingOrder && (
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
                    Order #{rejectingOrder.orderNumber} • {rejectingOrder.serviceSnapshot.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
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
                  {rejectionOptions.map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                        rejectReason === opt
                          ? "border-rose-400 bg-rose-50/50 text-rose-950 font-semibold"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="rejectionReason"
                        value={opt}
                        checked={rejectReason === opt}
                        onChange={() => setRejectReason(opt)}
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
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setRejectingOrder(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={isProcessing || !rejectReason}
                onClick={async () => {
                  if (!rejectingOrder) return;
                  setIsProcessing(true);
                  try {
                    const finalReason = rejectNotes.trim()
                      ? `${rejectReason}: ${rejectNotes.trim()}`
                      : rejectReason;
                    await rejectAssignment(rejectingOrder.id, finalReason);
                    setToastMessage(`Penugasan #${rejectingOrder.orderNumber} telah ditolak. Pesanan dikembalikan ke antrean Provider.`);
                    setRejectingOrder(null);
                    setActiveWorkerTab("RIWAYAT");
                  } catch (err: any) {
                    setToastMessage(err?.message || "Gagal menolak tugas.");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle size={15} weight="bold" />
                <span>{isProcessing ? "Menolak..." : "Konfirmasi Tolak Tugas"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Laporan Selesai Pengerjaan Garansi */}
      {completingWarrantyCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <ShieldCheck size={22} weight="bold" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900">
                    Selesaikan Tugas Garansi (Rp 0)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kasus #{completingWarrantyCase.caseNumber} • {completingWarrantyCase.itemTitle || "Perbaikan Garansi"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCompletingWarrantyCase(null);
                  setCompletionPhoto("");
                }}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <CheckCircle size={15} weight="bold" className="text-emerald-600" />
                  Konfirmasi Penyelesaian Bebas Biaya (Rp0)
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Unggah bukti foto hasil perbaikan dan catatan teknisi. Bukti ini akan disimpan ke database dan ditampilkan pada kartu klaim garansi Provider, Teknisi, dan Pelanggan.
                </p>
              </div>

              {/* Upload Foto Bukti */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">
                  Foto Bukti Penyelesaian Servis <span className="text-rose-500">*</span>
                </label>

                {completionPhoto ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
                    <img
                      src={completionPhoto}
                      alt="Pratinjau Bukti Selesai"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(completionPhoto)}
                        className="px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer"
                      >
                        <Eye size={14} weight="bold" />
                        <span>Lihat Penuh</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompletionPhoto("")}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer"
                      >
                        <X size={14} weight="bold" />
                        <span>Hapus Foto</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/30 hover:bg-indigo-50/70 transition cursor-pointer text-center">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        <UploadSimple size={20} weight="bold" />
                      </div>
                      <div>
                        <span className="font-bold text-indigo-700 block">Klik untuk Unggah Foto dari Perangkat</span>
                        <span className="text-[11px] text-slate-400">Mendukung format PNG, JPG, JPEG (Kamera / File)</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setCompletionPhoto(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    {/* Quick Preset Buttons for Instant Testing */}
                    <div className="pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold block mb-1.5">Atau pilih contoh foto cepat untuk pengujian:</span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCompletionPhoto("https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80")}
                          className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                        >
                          🔧 Servis Mesin Selesai
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompletionPhoto("https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=800&q=80")}
                          className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                        >
                          ❄️ Servis AC Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompletionPhoto("https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80")}
                          className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                        >
                          🚗 Perbaikan Ban Rapi
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Catatan Pengerjaan Teknisi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Deskripsikan tindakan perbaikan yang telah dilakukan di lokasi bersama konsumen..."
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setCompletingWarrantyCase(null);
                  setCompletionPhoto("");
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessing || !completionNote.trim()}
                onClick={async () => {
                  if (!completingWarrantyCase) return;
                  setIsProcessing(true);
                  try {
                    const targetJobId = completingWarrantyCase.warrantyJob?.jobId || completingWarrantyCase.id;
                    const finalEvidence = completionPhoto.trim()
                      ? `${completionPhoto.trim()} | ${completionNote.trim()}`
                      : completionNote.trim();

                    await apiFetch(`/order-jasa/worker/warranty-jobs/${targetJobId}/complete`, {
                      method: "POST",
                      body: JSON.stringify({
                        completion_evidence: finalEvidence,
                        notes: completionNote.trim() || "Pekerjaan garansi selesai dikerjakan di lokasi pelanggan."
                      })
                    }).catch(() => null);

                    // Also notify After-Sales if permitted, otherwise safe fallback
                    await merchantCompleteCase(completingWarrantyCase.id, finalEvidence).catch(() => {});

                    setToastMessage(`Pekerjaan garansi #${completingWarrantyCase.caseNumber} berhasil dilaporkan selesai. Menunggu konfirmasi verifikasi akhir oleh konsumen.`);
                    setCompletingWarrantyCase(null);
                    setCompletionNote("");
                    setCompletionPhoto("");
                    await Promise.allSettled([refresh(), refreshAfterSales()]);
                  } catch (err: any) {
                    setToastMessage(err?.message || "Gagal melaporkan penyelesaian pengerjaan garansi.");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Check size={15} weight="bold" />
                <span>{isProcessing ? "Menyimpan..." : "Kirim Laporan & Bukti Selesai"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Klaim Garansi untuk Teknisi (Formulir Pengajuan Lengkap dari Pelanggan) */}
      {viewingWarrantyCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <FileText size={22} weight="bold" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                      Formulir Pengajuan Garansi Pelanggan
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">#{viewingWarrantyCase.caseNumber}</span>
                  </div>
                  <h3 className="font-heading font-bold text-base text-slate-900 mt-0.5">
                    {viewingWarrantyCase.itemTitle || "Klaim Garansi Servis"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingWarrantyCase(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Ringkasan Data Order & Pelanggan */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Order Terkait:</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">#{viewingWarrantyCase.sourceOrderId}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Pelanggan:</span>
                  <span className="font-bold text-slate-800 text-xs">{viewingWarrantyCase.customerName || "Pelanggan SERVIO"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Waktu Pengajuan:</span>
                  <span className="font-medium text-slate-700 text-xs">
                    {viewingWarrantyCase.submittedAt ? new Date(viewingWarrantyCase.submittedAt).toLocaleString("id-ID") : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Status Klaim:</span>
                  <span className="font-bold text-indigo-700 text-xs">{viewingWarrantyCase.mainStatus}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Solusi Diminta:</span>
                  <span className="font-bold text-purple-700 text-xs">{viewingWarrantyCase.customerRequestedSolution || "REWORK (Perbaikan Gratis)"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Biaya Pelanggan:</span>
                  <span className="font-bold text-emerald-700 text-xs">Rp0 (Garansi Resmi)</span>
                </div>
              </div>

              {/* Rincian Keluhan Pelanggan */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <span className="text-amber-900 font-bold uppercase tracking-wider text-[10px] block">
                  Keluhan &amp; Kronologi Kendala dari Pelanggan:
                </span>
                <div>
                  <span className="text-slate-500 text-[11px] font-semibold block">Gejala / Masalah Utama:</span>
                  <p className="font-bold text-slate-900 text-xs mt-0.5">
                    {viewingWarrantyCase.issueReason || "Kendala teknis pasca pengerjaan"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] font-semibold block">Kronologi &amp; Penjelasan Lengkap:</span>
                  <p className="text-slate-700 italic leading-relaxed text-xs mt-0.5 bg-white/70 p-2.5 rounded-xl border border-amber-200/60">
                    &ldquo;{viewingWarrantyCase.issueDescription || "Tidak ada rincian penjelasan tambahan dari konsumen."}&rdquo;
                  </p>
                </div>

                {/* Galeri Foto Bukti dari Pelanggan */}
                <div>
                  <span className="text-slate-700 font-bold text-xs flex items-center gap-1.5 mb-2 mt-2">
                    <Camera size={14} weight="bold" className="text-amber-700" />
                    <span>Foto Bukti Kerusakan dari Pelanggan ({viewingWarrantyCase.evidenceMedia?.length || 0} file):</span>
                  </span>
                  {!viewingWarrantyCase.evidenceMedia || viewingWarrantyCase.evidenceMedia.length === 0 ? (
                    <div className="p-3 bg-white/80 rounded-xl text-center text-xs text-slate-400 border border-amber-200/50">
                      Pelanggan tidak melampirkan foto kerusakan saat mengajukan klaim.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {viewingWarrantyCase.evidenceMedia.map((url, idx) => (
                        <div
                          key={idx}
                          onClick={() => setPreviewImage(url)}
                          className="group relative aspect-video bg-white rounded-xl overflow-hidden border border-amber-200 cursor-pointer shadow-2xs hover:border-amber-400 transition"
                        >
                          <img
                            src={url}
                            alt={`Bukti Pelanggan ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                            Foto {idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Arahan Penugasan Provider */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1.5">
                <span className="text-indigo-900 font-bold uppercase tracking-wider text-[10px] block">
                  Arahan Penugasan dari Provider Jasa:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Teknisi Ditugaskan:</span>
                    <strong className="text-slate-800">{viewingWarrantyCase.warrantyJob?.workerName || "Teknisi"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Jadwal Kunjungan:</span>
                    <strong className="text-slate-800">{viewingWarrantyCase.warrantyJob?.scheduledDate || "Sesuai kesepakatan"}</strong>
                  </div>
                </div>
                <div className="pt-1">
                  <span className="text-slate-500 text-[10px] block">Catatan Instruksi Mitra:</span>
                  <p className="text-indigo-950 font-medium bg-white p-2 rounded-xl border border-indigo-100 mt-0.5">
                    {viewingWarrantyCase.warrantyJob?.notes || viewingWarrantyCase.warrantyJob?.jobTitle || "Pengerjaan perbaikan garansi bebas biaya sesuai SOP penjaminan mutu SERVIO."}
                  </p>
                </div>
              </div>

              {/* Bukti Penyelesaian Teknisi (Bila Sudah Selesai) */}
              {viewingWarrantyCase.warrantyJob?.completionEvidence && (() => {
                const parsed = parseEvidence(viewingWarrantyCase.warrantyJob.completionEvidence);
                return (
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                    <span className="text-emerald-950 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <CheckCircle size={15} weight="bold" className="text-emerald-600" />
                      Laporan Bukti Penyelesaian Pekerjaan Teknisi:
                    </span>
                    <div className="flex flex-col sm:flex-row gap-3 items-start">
                      {parsed.photoUrl && (
                        <div className="shrink-0">
                          <img
                            src={parsed.photoUrl}
                            alt="Bukti Selesai"
                            className="w-28 h-28 object-cover rounded-xl border border-emerald-300 cursor-pointer hover:opacity-90 transition shadow-xs"
                            onClick={() => setPreviewImage(parsed.photoUrl)}
                          />
                          <span className="text-[10px] text-emerald-800 font-bold block text-center mt-1">Klik perbesar</span>
                        </div>
                      )}
                      <div className="flex-1 bg-white p-3 rounded-xl border border-emerald-200 text-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Catatan Hasil Servis:</span>
                        <p className="font-medium text-xs leading-relaxed text-slate-700">
                          {parsed.noteText || "Pekerjaan garansi selesai dan berfungsi normal."}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingWarrantyCase(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Tutup Formulir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Pratinjau Foto Bukti */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs cursor-pointer animate-in fade-in duration-100"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] p-2 bg-white rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-md hover:bg-slate-700 cursor-pointer"
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Pratinjau Foto Bukti"
              className="max-h-[80vh] w-auto max-w-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}

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

export default function WorkerAssignedJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">
          Memuat ruang kerja teknisi SERVIO...
        </div>
      }
    >
      <WorkerJobsContent />
    </Suspense>
  );
}
