"use client";

import React, { useState } from "react";
import Link from "next/link";
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
  Broadcast,
  User,
  CaretRight,
  BookOpen,
  Question,
  WarningCircle,
  ListChecks,
  ArrowsClockwise,
  Truck,
  MapPinLine,
  Sparkle,
} from "@phosphor-icons/react";
import { useWorkerOperations } from "@/features/worker/useWorkerOperations";
import { WORKER_STATUS_CONFIG } from "@/mocks/workerJobs";
import { Toast } from "@/components/feedback/Toast";

export default function WorkerDashboardPage() {
  const {
    worker,
    isReady,
    toggleReadiness,
    jobs,
    sortedJobs,
    activeJob,
    pendingJobs,
    inProgressJobs,
    completedJobs,
    blockedJobs,
    updateJobStatus,
    gpsActive,
    affiliateSummary,
  } = useWorkerOperations();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const workerInitials = (worker.name || "TK")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleToggleStatus = () => {
    toggleReadiness();
    setToastMessage(
      !isReady
        ? "Status diaktifkan: Siap menerima penugasan baru dari bengkel mitra."
        : "Status diubah: Sedang Istirahat (Pemberitahuan tugas baru dijeda)."
    );
  };

  const handleDominantAction = (jobId: string, currentStatus: string) => {
    if (currentStatus === "DISPATCHED") {
      updateJobStatus(jobId, "ARRIVED");
      setToastMessage("Status diperbarui: Tiba di lokasi pelanggan. Silakan sapa klien!");
    } else if (currentStatus === "ARRIVED") {
      updateJobStatus(jobId, "IN_PROGRESS");
      setToastMessage("Status diperbarui: Pengerjaan SOP teknis dimulai.");
    }
  };

  return (
    <div className="space-y-5 pb-24 max-w-xl mx-auto font-body text-left">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* 1. Header: Worker Greeting, Status & Quick Shortcuts */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-sky-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              <span>{workerInitials}</span>
              <span
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  isReady ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold font-display text-slate-900 leading-tight">
                  Halo, {worker.name}
                </h1>
                <ShieldCheck size={16} weight="fill" className="text-sky-600" />
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {worker.providerName} • Teknisi Lapangan
              </p>
            </div>
          </div>

          {/* Readiness Toggle */}
          <button
            type="button"
            onClick={handleToggleStatus}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              isReady
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isReady ? "bg-emerald-500" : "bg-amber-400"
              }`}
            />
            <span>{isReady ? "Siap Tugas" : "Istirahat"}</span>
          </button>
        </div>

        {/* Action bar: Telemetry indicator & Guide shortcut */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Broadcast
              size={16}
              weight="duotone"
              className={gpsActive ? "text-emerald-600 animate-pulse" : "text-slate-400"}
            />
            <span>
              GPS: <strong>{gpsActive ? "Aktif (Live)" : "Offline"}</strong>
            </span>
          </div>

          <Link
            href="/worker/guide"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-[#0F4C81] border border-sky-200 font-bold hover:bg-sky-100 transition"
          >
            <BookOpen size={14} weight="bold" />
            <span>Panduan Alur Kerja</span>
          </Link>
        </div>
      </div>

      {/* 2. CURRENT / NEXT JOB (Primary Dominant Card) */}
      {activeJob ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0F4C81] to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
          {/* Header pill & scheduled time */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                ["IN_PROGRESS", "ARRIVED"].includes(activeJob.status)
                  ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                  : activeJob.status === "DISPATCHED"
                  ? "bg-sky-400/20 text-sky-200 border border-sky-400/30"
                  : "bg-white/15 text-sky-100 border border-white/10"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {activeJob.status === "IN_PROGRESS"
                ? "SEDANG DIKERJAKAN"
                : activeJob.status === "ARRIVED"
                ? "SUDAH DI LOKASI"
                : activeJob.status === "DISPATCHED"
                ? "SEDANG MENUJU LOKASI"
                : "PEKERJAAN BERIKUTNYA"}
            </span>

            <span className="text-xs font-mono text-sky-200 font-semibold flex items-center gap-1">
              <Clock size={13} />
              <span>{activeJob.scheduledTime}</span>
            </span>
          </div>

          {/* Job Title & Issue */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-white leading-snug">
              {activeJob.serviceTitle}
            </h2>
            <p className="text-xs text-sky-100/80 mt-1 line-clamp-2">
              {activeJob.issueDescription}
            </p>
          </div>

          {/* Customer & Location Context */}
          <div className="bg-white/10 rounded-2xl p-3.5 backdrop-blur-xs border border-white/10 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <User size={15} className="text-sky-300" />
                {activeJob.customerName}
              </span>
              <a
                href={`tel:${activeJob.customerPhone}`}
                className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold flex items-center gap-1 text-[11px] transition"
              >
                <Phone size={13} weight="fill" />
                <span>Hubungi</span>
              </a>
            </div>

            <div className="flex items-start gap-1.5 text-sky-100/90 text-[11px]">
              <MapPin size={15} className="text-rose-300 shrink-0 mt-0.5" />
              <span className="line-clamp-2">
                {activeJob.customerAddress} ({activeJob.distanceKm} km)
              </span>
            </div>
          </div>

          {/* ONE DOMINANT PRIMARY ACTION (One-Next-Action Rule) */}
          <div className="pt-1">
            {activeJob.status === "ASSIGNED" ? (
              <Link
                href={`/worker/jobs/${activeJob.id}`}
                className="w-full py-3.5 px-4 rounded-2xl bg-white text-[#0F4C81] hover:bg-sky-50 font-bold text-sm shadow-md transition flex items-center justify-center gap-2 text-center"
              >
                <NavigationArrow size={18} weight="bold" />
                <span>LIHAT & SIAPKAN TUGAS</span>
                <ArrowRight size={16} weight="bold" />
              </Link>
            ) : activeJob.status === "DISPATCHED" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDominantAction(activeJob.id, activeJob.status)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} weight="bold" />
                  <span>SAYA SUDAH TIBA</span>
                </button>
                <Link
                  href={`/worker/jobs/${activeJob.id}`}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm border border-white/20 transition flex items-center justify-center gap-1.5 text-center"
                >
                  <span>Lihat Rincian & Navigasi</span>
                </Link>
              </div>
            ) : activeJob.status === "ARRIVED" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDominantAction(activeJob.id, activeJob.status)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  <Wrench size={18} weight="bold" />
                  <span>MULAI PENGERJAAN</span>
                </button>
                <Link
                  href={`/worker/jobs/${activeJob.id}`}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm border border-white/20 transition flex items-center justify-center gap-1.5 text-center"
                >
                  <span>Buka SOP & Checklist</span>
                </Link>
              </div>
            ) : activeJob.status === "IN_PROGRESS" ? (
              <Link
                href={`/worker/jobs/${activeJob.id}`}
                className="w-full py-3.5 px-4 rounded-2xl bg-white text-[#0F4C81] hover:bg-sky-50 font-bold text-sm shadow-md transition flex items-center justify-center gap-2 text-center"
              >
                <Wrench size={18} weight="bold" />
                <span>LANJUTKAN PEKERJAAN & SOP</span>
                <ArrowRight size={16} weight="bold" />
              </Link>
            ) : (
              <Link
                href={`/worker/jobs/${activeJob.id}`}
                className="w-full py-3.5 px-4 rounded-2xl bg-white text-[#0F4C81] hover:bg-sky-50 font-bold text-sm shadow-md transition flex items-center justify-center gap-2 text-center"
              >
                <span>BUKA LEMBAR KERJA TUGAS</span>
                <ArrowRight size={16} weight="bold" />
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* Empty State: No current active assignment */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-3 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <CheckCircle size={32} weight="duotone" className="text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold font-display text-slate-900">
              Tidak Ada Pekerjaan Aktif
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Belum ada tugas yang perlu dikerjakan saat ini. Anda dapat melihat daftar pekerjaan mendatang atau beristirahat sejenak.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/worker/jobs"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition"
            >
              <span>Lihat Jadwal Pekerjaan</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* 3. Quick Operational Summary (Low Cognitive Load, No Business KPIs) */}
      <div className="grid grid-cols-3 gap-2.5 text-center">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Tugas Hari Ini</p>
          <p className="text-xl font-bold font-display text-slate-900 mt-0.5">
            {jobs.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Sedang Proses</p>
          <p className="text-xl font-bold font-display text-[#0F4C81] mt-0.5">
            {inProgressJobs.length}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Selesai</p>
          <p className="text-xl font-bold font-display text-emerald-600 mt-0.5">
            {completedJobs.length}
          </p>
        </div>
      </div>

      {/* Phase E: Quick Affiliate Rewards Glance */}
      <Link
        href="/worker/earnings"
        className="block bg-gradient-to-r from-purple-50/90 to-indigo-50/90 border border-purple-200 rounded-3xl p-4 shadow-xs hover:border-purple-300 transition group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-xs">
              <Sparkle size={20} weight="fill" />
            </span>
            <div>
              <p className="text-xs font-bold text-purple-950">Poin Afiliasi Suku Cadang</p>
              <p className="text-[11px] text-purple-700 mt-0.5">
                <strong>+{affiliateSummary.confirmedPoints || 60} Pts</strong> Aktif • +{affiliateSummary.pendingPoints || 120} Pts Tertunda ({affiliateSummary.totalOrders} Order)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-purple-700 group-hover:translate-x-0.5 transition-transform bg-white/60 px-2.5 py-1 rounded-xl border border-purple-200">
            <span>Rincian</span>
            <CaretRight size={14} weight="bold" />
          </div>
        </div>
      </Link>

      {/* 4. TODAY'S JOBS (Easy to Scan) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold font-display text-slate-900">
            Daftar Tugas Hari Ini ({jobs.length})
          </h2>
          <Link
            href="/worker/jobs"
            className="text-xs font-bold text-[#0F4C81] hover:underline flex items-center gap-0.5"
          >
            <span>Semua Tugas</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="space-y-2.5">
          {sortedJobs.map((job) => {
            const isCurrent = job.id === activeJob?.id;
            const config = WORKER_STATUS_CONFIG[job.status] || {
              label: job.status,
              badgeClass: "bg-slate-100 text-slate-600",
            };

            return (
              <Link
                key={job.id}
                href={`/worker/jobs/${job.id}`}
                className={`block bg-white rounded-2xl border p-4 shadow-xs transition hover:border-sky-300 ${
                  isCurrent
                    ? "border-sky-400 ring-1 ring-sky-300 bg-sky-50/20"
                    : "border-slate-200/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold font-display text-slate-900 line-clamp-1">
                      {job.serviceTitle}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Klien: <strong>{job.customerName}</strong>
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${config.badgeClass}`}
                  >
                    {config.label}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-slate-400" />
                    <span>{job.scheduledTime}</span>
                  </span>

                  <span className="flex items-center gap-1 text-[#0F4C81] font-bold text-[11px]">
                    <MapPin size={13} className="text-slate-400" />
                    <span>{job.distanceKm} km</span>
                    <CaretRight size={12} weight="bold" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 5. Help / Support Shortcut */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#0F4C81] flex items-center justify-center shrink-0">
            <Question size={18} weight="bold" />
          </div>
          <div>
            <p className="font-bold text-slate-800">Butuh Bantuan Lapangan?</p>
            <p className="text-slate-500 text-[11px]">
              Koordinasi kendala akses, suku cadang, atau kontak dispatch bengkel.
            </p>
          </div>
        </div>

        <Link
          href="/support"
          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-xs shrink-0 transition"
        >
          Bantuan
        </Link>
      </div>
    </div>
  );
}
