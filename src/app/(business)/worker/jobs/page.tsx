"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Wrench,
  MapPin,
  Clock,
  Phone,
  CheckCircle,
  Play,
  NavigationArrow,
  ArrowRight,
  ShieldCheck,
  WarningCircle,
  MagnifyingGlass,
  Check,
  User,
  Package,
  CurrencyCircleDollar,
  Truck,
  WarningOctagon,
  Eye,
  HandCoins,
  Receipt,
  ArrowsClockwise,
  Sparkle,
  FileText,
} from "@phosphor-icons/react";
import { useWorkerOperations, WorkerJob } from "@/features/worker/useWorkerOperations";
import { WORKER_STATUS_CONFIG, WorkerTimelineStage } from "@/mocks/workerJobs";
import { Toast } from "@/components/feedback/Toast";

type TimelineFilterTab =
  | "ALL"
  | "TERIMA"
  | "BERANGKAT"
  | "TIBA"
  | "DIAGNOSA"
  | "SEDANG_DIKERJAKAN"
  | "SELESAI";

function matchesTimelineStage(job: WorkerJob, tab: TimelineFilterTab): boolean {
  if (tab === "ALL") return true;

  const stage = job.timelineStage;
  if (tab === "TERIMA") {
    return stage === "TERIMA" || (!stage && job.status === "ASSIGNED");
  }
  if (tab === "BERANGKAT") {
    return stage === "BERANGKAT" || (!stage && job.status === "DISPATCHED");
  }
  if (tab === "TIBA") {
    return stage === "TIBA" || (!stage && job.status === "ARRIVED");
  }
  if (tab === "DIAGNOSA") {
    return stage === "DIAGNOSA_HASIL";
  }
  if (tab === "SEDANG_DIKERJAKAN") {
    return (
      stage === "SEDANG_DIKERJAKAN" ||
      (!stage && job.status === "IN_PROGRESS")
    );
  }
  if (tab === "SELESAI") {
    return (
      stage === "SELESAI" ||
      (!stage && (job.status === "COMPLETED" || job.status === "PROOF_SUBMITTED"))
    );
  }
  return true;
}

function WorkerJobsContent() {
  const searchParams = useSearchParams();
  const rawFilter = searchParams.get("filter")?.toUpperCase();
  const initialFilter: TimelineFilterTab =
    rawFilter === "TERIMA" ||
    rawFilter === "BERANGKAT" ||
    rawFilter === "TIBA" ||
    rawFilter === "DIAGNOSA" ||
    rawFilter === "SEDANG_DIKERJAKAN" ||
    rawFilter === "SELESAI"
      ? (rawFilter as TimelineFilterTab)
      : "ALL";

  const { jobs, updateJobStatus } = useWorkerOperations();
  const [filterTab, setFilterTab] = useState<TimelineFilterTab>(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Derivation of live summary metrics
  const summaryCounts = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter(
      (j) =>
        j.status === "IN_PROGRESS" ||
        j.status === "DISPATCHED" ||
        j.status === "ARRIVED" ||
        j.timelineStage === "BERANGKAT" ||
        j.timelineStage === "TIBA" ||
        j.timelineStage === "SEDANG_DIKERJAKAN"
    ).length;
    const waiting = jobs.filter(
      (j) =>
        j.status === "ASSIGNED" ||
        j.timelineStage === "TERIMA" ||
        j.timelineStage === "DIAGNOSA_HASIL" ||
        j.status === "BLOCKED"
    ).length;
    const completed = jobs.filter(
      (j) =>
        j.status === "COMPLETED" ||
        j.status === "PROOF_SUBMITTED" ||
        j.timelineStage === "SELESAI"
    ).length;
    const blocked = jobs.filter(
      (j) =>
        j.status === "BLOCKED" ||
        j.nextAction?.isExecutionBlocked ||
        j.postDiagnosisBranch === "MANDATORY_PART_BLOCKED" ||
        j.postDiagnosisBranch === "PAYMENT_FAILED_AFTER_APPROVAL"
    ).length;

    return { total, active, waiting, completed, blocked };
  }, [jobs]);

  // Derivation of timeline tab counts
  const tabCounts = useMemo(() => {
    return {
      ALL: jobs.length,
      TERIMA: jobs.filter((j) => matchesTimelineStage(j, "TERIMA")).length,
      BERANGKAT: jobs.filter((j) => matchesTimelineStage(j, "BERANGKAT")).length,
      TIBA: jobs.filter((j) => matchesTimelineStage(j, "TIBA")).length,
      DIAGNOSA: jobs.filter((j) => matchesTimelineStage(j, "DIAGNOSA")).length,
      SEDANG_DIKERJAKAN: jobs.filter((j) => matchesTimelineStage(j, "SEDANG_DIKERJAKAN")).length,
      SELESAI: jobs.filter((j) => matchesTimelineStage(j, "SELESAI")).length,
    };
  }, [jobs]);

  // Filtered jobs list
  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesStage = matchesTimelineStage(job, filterTab);
      if (!matchesStage) return false;

      if (!query) return true;
      const idMatch = job.id.toLowerCase().includes(query);
      const orderIdMatch = job.orderId.toLowerCase().includes(query);
      const titleMatch = job.serviceTitle.toLowerCase().includes(query);
      const customerMatch = job.customerName.toLowerCase().includes(query);
      const addressMatch = job.customerAddress.toLowerCase().includes(query);
      const diagnosisMatch =
        job.diagnosis?.findingsSummary?.toLowerCase().includes(query) ||
        job.diagnosis?.problemFound?.toLowerCase().includes(query);

      return idMatch || orderIdMatch || titleMatch || customerMatch || addressMatch || !!diagnosisMatch;
    });
  }, [jobs, filterTab, searchQuery]);

  const handleQuickStatusAction = (jobId: string, currentStatus: WorkerJob["status"]) => {
    if (currentStatus === "ASSIGNED") {
      updateJobStatus(jobId, "DISPATCHED");
      setToastMessage("Status diperbarui: Anda sedang menuju lokasi pelanggan.");
    } else if (currentStatus === "DISPATCHED") {
      updateJobStatus(jobId, "ARRIVED");
      setToastMessage("Status diperbarui: Anda telah tiba di lokasi pelanggan.");
    } else if (currentStatus === "ARRIVED") {
      updateJobStatus(jobId, "IN_PROGRESS");
      setToastMessage("Status diperbarui: Mulai pengerjaan teknis.");
    }
  };

  const getTimelineStageBadge = (stage?: WorkerTimelineStage, status?: WorkerJob["status"]) => {
    switch (stage) {
      case "TERIMA":
        return {
          label: "Terima Pekerjaan",
          className: "bg-sky-50 text-[#0F4C81] border-sky-200",
        };
      case "BERANGKAT":
        return {
          label: "Dalam Perjalanan",
          className: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "TIBA":
        return {
          label: "Tiba di Lokasi",
          className: "bg-amber-50 text-amber-800 border-amber-200",
        };
      case "DIAGNOSA_HASIL":
        return {
          label: "Diagnosa / Hasil",
          className: "bg-violet-50 text-violet-800 border-violet-200",
        };
      case "SEDANG_DIKERJAKAN":
        return {
          label: "Sedang Dikerjakan",
          className: "bg-emerald-50 text-emerald-800 border-emerald-200",
        };
      case "SELESAI":
        return {
          label: "Selesai",
          className: "bg-slate-100 text-slate-700 border-slate-200",
        };
      default:
        return {
          label: status || "Aktif",
          className: WORKER_STATUS_CONFIG[status || "ASSIGNED"]?.badgeClass || "bg-slate-100 text-slate-700",
        };
    }
  };

  return (
    <div className="space-y-5 pb-24 max-w-2xl mx-auto font-body">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* TOP HEADER & SUMMARY METRICS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Master Job Workspace
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                Pekerjaan Terjadwal
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 tracking-tight">
              Pekerjaan Saya
            </h1>
          </div>
          <p className="text-xs text-slate-500 max-w-xs sm:text-right">
            Satu ruang kerja utama untuk memantau tugas, diagnosa, dan tahapan servis lapangan.
          </p>
        </div>

        {/* 5 Top Summary Cards */}
        <div className="grid grid-cols-5 gap-2 pt-1 text-center">
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total
            </span>
            <span className="text-base sm:text-lg font-bold font-display text-slate-900">
              {summaryCounts.total}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-sky-50/70 border border-sky-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] block">
              Aktif
            </span>
            <span className="text-base sm:text-lg font-bold font-display text-[#0F4C81]">
              {summaryCounts.active}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
              Menunggu
            </span>
            <span className="text-base sm:text-lg font-bold font-display text-amber-800">
              {summaryCounts.waiting}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Selesai
            </span>
            <span className="text-base sm:text-lg font-bold font-display text-emerald-800">
              {summaryCounts.completed}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-rose-50/70 border border-rose-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
              Kendala
            </span>
            <span className="text-base sm:text-lg font-bold font-display text-rose-800">
              {summaryCounts.blocked}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative pt-1">
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Cari Service Order ID (#SRV-001), pelanggan, layanan, diagnosa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81] transition"
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

      {/* TIMELINE FILTER CHIPS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs font-bold">
        {[
          { id: "ALL" as const, label: "Semua", count: tabCounts.ALL },
          { id: "TERIMA" as const, label: "Terima", count: tabCounts.TERIMA },
          { id: "BERANGKAT" as const, label: "Berangkat", count: tabCounts.BERANGKAT },
          { id: "TIBA" as const, label: "Tiba", count: tabCounts.TIBA },
          { id: "DIAGNOSA" as const, label: "Diagnosa / Hasil", count: tabCounts.DIAGNOSA },
          { id: "SEDANG_DIKERJAKAN" as const, label: "Sedang Dikerjakan", count: tabCounts.SEDANG_DIKERJAKAN },
          { id: "SELESAI" as const, label: "Selesai", count: tabCounts.SELESAI },
        ].map((tab) => {
          const isActive = filterTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-2 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? "bg-[#0F4C81] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? "bg-white/20 text-white font-bold"
                    : "bg-slate-100 text-slate-500 font-semibold"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* LIST OF JOB CARDS */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">
              Tidak ada pekerjaan pada tahapan & kata kunci ini.
            </p>
            <p>
              Coba ganti filter tahapan atau hapus kata pencarian untuk melihat penugasan lainnya.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilterTab("ALL");
                setSearchQuery("");
              }}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              <ArrowsClockwise size={14} />
              <span>Reset Filter</span>
            </button>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const stageBadge = getTimelineStageBadge(job.timelineStage, job.status);
            const isFinished =
              job.status === "COMPLETED" ||
              job.status === "PROOF_SUBMITTED" ||
              job.timelineStage === "SELESAI";
            const isBlocked =
              job.status === "BLOCKED" ||
              job.nextAction?.isExecutionBlocked ||
              job.postDiagnosisBranch === "MANDATORY_PART_BLOCKED" ||
              job.postDiagnosisBranch === "PAYMENT_FAILED_AFTER_APPROVAL";

            // Target section hash link for Job Detail
            const targetSection = job.nextAction?.targetSection || "overview";
            const detailHref = `/worker/jobs/${job.id}`;
            const targetSectionHref = `${detailHref}#${targetSection}`;

            return (
              <div
                key={job.id}
                className={`bg-white rounded-3xl border p-4 sm:p-5 shadow-xs space-y-3.5 transition hover:shadow-md ${
                  isBlocked
                    ? "border-rose-300 ring-1 ring-rose-200 bg-rose-50/10"
                    : job.timelineStage === "DIAGNOSA_HASIL"
                    ? "border-violet-200 ring-1 ring-violet-100"
                    : job.status === "IN_PROGRESS"
                    ? "border-sky-300 ring-1 ring-sky-200"
                    : "border-slate-200/90"
                }`}
              >
                {/* Top Row: Order ID, Job ID, Schedule, Stage Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-mono font-bold text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                        #{job.orderId}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {job.id}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        {job.scheduledTime}
                      </span>
                    </div>

                    <h2 className="text-sm sm:text-base font-bold font-display text-slate-900 leading-snug">
                      {job.serviceTitle}
                    </h2>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 border uppercase tracking-wider ${stageBadge.className}`}
                  >
                    {stageBadge.label}
                  </span>
                </div>

                {/* Urgency / Exception Banner if Blocked or Critical */}
                {isBlocked && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800">
                      <WarningOctagon size={16} weight="fill" className="text-rose-600 shrink-0" />
                      <span>
                        {job.postDiagnosisBranch === "MANDATORY_PART_BLOCKED"
                          ? "SERVIS TERTAHAN — KOMPONEN WAJIB BELUM TERSEDIA"
                          : job.postDiagnosisBranch === "PAYMENT_FAILED_AFTER_APPROVAL"
                          ? "PEMBAYARAN BELUM BERHASIL"
                          : "KENDALA LAPANGAN DILAPORKAN"}
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-900 leading-relaxed">
                      {job.nextAction?.disabledReason ||
                        job.blockedReason ||
                        "Pengerjaan teknis tertahan sementara hingga kondisi terpenuhi."}
                    </p>
                  </div>
                )}

                {/* PRE-SERVICE HANDOFF CONTEXT BADGE & PREVIEW */}
                {(job.providerNotes || job.aiPreparationContext) && (
                  <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] flex items-center gap-1">
                        <Sparkle size={13} weight="fill" className="text-sky-600" />
                        Konteks Persiapan dari Provider & AI
                      </span>
                      <span className="text-[9px] font-semibold text-sky-700 bg-white border border-sky-200 px-1.5 py-0.2 rounded">
                        Panduan Awal
                      </span>
                    </div>

                    {job.providerNotes && (
                      <p className="text-[11px] text-slate-700 leading-snug">
                        <strong className="text-amber-800">Catatan Provider: </strong>
                        &quot;{job.providerNotes}&quot;
                      </p>
                    )}

                    {job.aiPreparationContext?.possibleSpareparts && job.aiPreparationContext.possibleSpareparts.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 overflow-hidden">
                        <span className="font-semibold text-slate-600 shrink-0">Saran Part:</span>
                        <span className="truncate text-slate-700 font-medium">
                          {job.aiPreparationContext.possibleSpareparts.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* DIAGNOSIS RESULT & POST-DIAGNOSIS BRANCH SUMMARY */}
                {job.diagnosis && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <Wrench size={12} weight="bold" className="text-slate-500" />
                        Hasil Diagnosa Fisik
                      </span>
                      {job.diagnosis.assetDetails && (
                        <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {job.diagnosis.assetDetails}
                        </span>
                      )}
                    </div>

                    <p className="text-slate-800 font-medium text-[11px] leading-relaxed">
                      &quot;{job.diagnosis.findingsSummary}&quot;
                    </p>

                    {/* Technical details grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                      {/* Pricing State */}
                      {job.pricing && (
                        <div className="flex items-start gap-1.5 bg-white p-2 rounded-xl border border-slate-100">
                          <CurrencyCircleDollar size={15} className="text-[#0F4C81] shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">
                              Status Biaya
                            </span>
                            <span className="font-semibold text-slate-800 block truncate">
                              Rp {job.pricing.totalAmount.toLocaleString("id-ID")}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                job.pricing.customerApprovalStatus === "APPROVED"
                                  ? "text-emerald-700"
                                  : job.pricing.customerApprovalStatus === "REJECTED"
                                  ? "text-rose-700"
                                  : job.pricing.providerAuthStatus === "PENDING_AUTH"
                                  ? "text-amber-700"
                                  : "text-slate-600"
                              }`}
                            >
                              {job.pricing.providerAuthStatus === "PENDING_AUTH"
                                ? "🟠 Menunggu Otorisasi Provider"
                                : job.pricing.customerApprovalStatus === "PENDING"
                                ? "🟡 Menunggu Persetujuan Customer"
                                : job.pricing.paymentState === "PAYMENT_FAILED"
                                ? "🔴 Pembayaran Gagal"
                                : job.pricing.paymentState === "PAID"
                                ? "✓ Lunas"
                                : "Fixed / Sesuai Estimasi"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Sparepart / Material State */}
                      {job.sparepartSummary && (
                        <div className="flex items-start gap-1.5 bg-white p-2 rounded-xl border border-slate-100">
                          <Package size={15} className="text-purple-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">
                              Suku Cadang / Material
                            </span>
                            <span className="font-semibold text-slate-800 block truncate">
                              {job.sparepartSummary.materialName}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                job.sparepartSummary.status === "REJECTED"
                                  ? "text-slate-500"
                                  : job.sparepartSummary.status === "WAITING_PARTNER_SHIPMENT"
                                  ? "text-blue-700"
                                  : job.sparepartSummary.status === "UNAVAILABLE"
                                  ? "text-rose-700"
                                  : "text-purple-700"
                              }`}
                            >
                              {job.sparepartSummary.status === "NONE_REQUIRED"
                                ? "Tidak Perlu Penggantian"
                                : job.sparepartSummary.status === "PROVIDER_PREPARED"
                                ? "Sedia di Bengkel (Rp " + (job.sparepartSummary.price || 0).toLocaleString("id-ID") + ")"
                                : job.sparepartSummary.status === "WAITING_PARTNER_SHIPMENT"
                                ? "Kurir Dalam Pengiriman (ETA " + job.sparepartSummary.etaMinutes + " mnt)"
                                : job.sparepartSummary.status === "WAITING_CUSTOMER_PURCHASE"
                                ? "Menunggu Pembelian Pelanggan"
                                : job.sparepartSummary.status === "CUSTOMER_OWNED"
                                ? "Dimiliki Pelanggan"
                                : job.sparepartSummary.status === "REJECTED"
                                ? "Opsional Ditolak (Servis Berlanjut)"
                                : job.sparepartSummary.status === "UNAVAILABLE"
                                ? "Komponen Wajib Tidak Tersedia"
                                : job.sparepartSummary.source}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Customer & Location */}
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <User size={15} className="text-[#0F4C81]" />
                      {job.customerName}
                    </span>
                    <a
                      href={`tel:${job.customerPhone}`}
                      className="text-[#0F4C81] font-bold hover:underline flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-sky-50"
                    >
                      <Phone size={12} weight="fill" />
                      <span>{job.customerPhone}</span>
                    </a>
                  </div>

                  <p className="text-slate-500 text-[11px] flex items-start gap-1">
                    <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{job.customerAddress} ({job.distanceKm} km)</span>
                  </p>
                </div>

                {/* CARD ACTION FOOTER */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  {/* Secondary: Buka Workspace Master */}
                  <Link
                    href={detailHref}
                    className="text-xs font-bold text-slate-700 hover:text-[#0F4C81] flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
                  >
                    <Eye size={14} />
                    <span>Workspace Detail</span>
                    <ArrowRight size={12} />
                  </Link>

                  {/* Primary State-Aware CTA */}
                  <div className="flex items-center gap-2">
                    {/* If quick status progression for travel */}
                    {job.status === "ASSIGNED" && (
                      <button
                        type="button"
                        onClick={() => handleQuickStatusAction(job.id, job.status)}
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Play size={13} weight="fill" />
                        <span>Mulai Berangkat</span>
                      </button>
                    )}

                    {job.status === "DISPATCHED" && (
                      <button
                        type="button"
                        onClick={() => handleQuickStatusAction(job.id, job.status)}
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle size={14} weight="bold" />
                        <span>Saya Tiba</span>
                      </button>
                    )}

                    {job.status === "ARRIVED" && (
                      <Link
                        href={`${detailHref}#diagnosis`}
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Wrench size={14} weight="bold" />
                        <span>Mulai Diagnosis</span>
                      </Link>
                    )}

                    {/* If nextAction explicitly defined (e.g. SRV-001 through SRV-012) */}
                    {job.nextAction &&
                      job.status !== "ASSIGNED" &&
                      job.status !== "DISPATCHED" && (
                        <Link
                          href={targetSectionHref}
                          className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 ${
                            job.nextAction.buttonVariant === "danger"
                              ? "bg-rose-600 hover:bg-rose-700 text-white"
                              : job.nextAction.buttonVariant === "warning"
                              ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                              : job.nextAction.buttonVariant === "success"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-[#0F4C81] hover:bg-sky-900 text-white"
                          }`}
                        >
                          {job.nextAction.isExecutionBlocked ? (
                            <WarningCircle size={14} weight="bold" />
                          ) : (
                            <ArrowRight size={14} weight="bold" />
                          )}
                          <span>{job.nextAction.label}</span>
                        </Link>
                      )}

                    {/* If completed */}
                    {isFinished && !job.nextAction && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200">
                        <CheckCircle size={15} weight="fill" />
                        Pekerjaan Tuntas
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function WorkerAssignedJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">
          Memuat master workspace pekerjaan...
        </div>
      }
    >
      <WorkerJobsContent />
    </Suspense>
  );
}
