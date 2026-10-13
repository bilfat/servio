"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  NavigationArrow,
  Phone,
  Clock,
  MapPin,
  ShieldCheck,
  WarningCircle,
  CheckCircle,
  Package,
  Wrench,
  Camera,
  X,
  User,
  ArrowRight,
  Broadcast,
  Plus,
  Trash,
  Check,
  Question,
  ChatCircleDots,
  ClipboardText,
  Sparkle,
  NotePencil,
  CurrencyCircleDollar,
  Truck,
  CheckFat,
  WarningOctagon,
  HourglassMedium,
  SealCheck,
  ShieldStar,
} from "@phosphor-icons/react";
import { useWorkerOperations } from "@/features/worker/useWorkerOperations";
import { domainRepository } from "@/lib/repository/domainRepository";
import { WORKER_STATUS_CONFIG, WorkerTimelineStage } from "@/mocks/workerJobs";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";
import { WorkerSparepartStation } from "@/components/features/worker/WorkerSparepartStation";
import { WorkerDiagnosisDecisionWorkspace } from "@/components/features/worker/WorkerDiagnosisDecisionWorkspace";

function generateMaterialId(): string {
  return `mat-${Date.now()}`;
}

export default function WorkerJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawJobId = params?.jobId as string;

  const {
    jobs,
    updateJobStatus,
    toggleSopStep,
    reportJobIssue,
    markJobReady,
    saveMaterialUsage,
  } = useWorkerOperations();

  // Find job reactively
  const job =
    jobs.find((j) => j.id === rawJobId || j.orderId === rawJobId) ||
    domainRepository.findWorkerJob(rawJobId);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Safety APD checklist states
  const [safetyChecklist, setSafetyChecklist] = useState({
    apdGloves: true,
    breakerTested: true,
    ladderSecured: false,
  });

  // Issue Reporting Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueReason, setIssueReason] = useState("Pelanggan tidak ada di lokasi / tidak bisa dihubungi");
  const [issueNote, setIssueNote] = useState("");

  // Delay modal state
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(15);

  // Quick Chat Modal state
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatRecipient, setChatRecipient] = useState<"CUSTOMER" | "PROVIDER">("CUSTOMER");
  const [chatInput, setChatInput] = useState("");

  if (!job) {
    return (
      <div className="py-12 max-w-2xl mx-auto font-body text-left">
        <EmptyState
          icon={Wrench}
          title="Pekerjaan Tidak Ditemukan"
          description={`Tugas pekerjaan dengan ID "${rawJobId || "—"}" tidak terdaftar atau telah dialihkan.`}
          action={
            <Link
              href="/worker/jobs"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-sky-900 transition"
            >
              Kembali ke Pekerjaan Saya
            </Link>
          }
        />
      </div>
    );
  }

  const statusConfig = WORKER_STATUS_CONFIG[job.status] || {
    label: job.status,
    badgeClass: "bg-slate-100 text-slate-700",
    actionLabel: "Perbarui Status",
    stepperIndex: 0,
  };

  const completedSopCount = job.sopSteps.filter((s) => s.isCompleted).length;
  const isSopAllCompleted = completedSopCount === job.sopSteps.length;

  // Master 10-stage timeline steps (Section 9)
  const masterTimelineSteps = [
    { id: "ASSIGNED", label: "Ditugaskan", title: "Tugas Masuk" },
    { id: "BERANGKAT", label: "Berangkat", title: "Perjalanan" },
    { id: "TIBA", label: "Tiba", title: "Tiba Lokasi" },
    { id: "DIAGNOSIS", label: "Diagnosa", title: "Inspeksi Fisik" },
    { id: "PRICING", label: "Biaya / Part", title: "Kalkulasi" },
    { id: "APPROVAL", label: "Persetujuan", title: "Konfirmasi" },
    { id: "PAYMENT", label: "Pembayaran", title: "Transaksi" },
    { id: "EXECUTION", label: "Eksekusi", title: "Pengerjaan" },
    { id: "PROOF", label: "Bukti", title: "Validasi SOP" },
    { id: "COMPLETION", label: "Selesai", title: "Tuntas & Garansi" },
  ];

  // Determine current timeline active index
  let activeTimelineIdx = 0;
  if (job.status === "ASSIGNED") {
    activeTimelineIdx = 0;
  } else if (job.status === "DISPATCHED" || job.timelineStage === "BERANGKAT") {
    activeTimelineIdx = 1;
  } else if (job.status === "ARRIVED" || job.timelineStage === "TIBA") {
    activeTimelineIdx = 2;
  } else if (job.timelineStage === "DIAGNOSA_HASIL") {
    if (job.pricing?.providerAuthStatus === "PENDING_AUTH") {
      activeTimelineIdx = 4;
    } else if (job.pricing?.customerApprovalStatus === "PENDING") {
      activeTimelineIdx = 5;
    } else if (job.pricing?.paymentState === "PAYMENT_FAILED" || job.pricing?.paymentState === "ADDITIONAL_REQUIRED") {
      activeTimelineIdx = 6;
    } else {
      activeTimelineIdx = 3;
    }
  } else if (job.status === "IN_PROGRESS" || job.timelineStage === "SEDANG_DIKERJAKAN") {
    activeTimelineIdx = isSopAllCompleted ? 8 : 7;
  } else if (job.status === "PROOF_SUBMITTED") {
    activeTimelineIdx = 8;
  } else if (job.status === "COMPLETED" || job.timelineStage === "SELESAI") {
    activeTimelineIdx = 9;
  }

  const handleOpenGoogleMaps = () => {
    const encoded = encodeURIComponent(job.customerAddress);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
  };

  const handleSubmitIssue = () => {
    reportJobIssue(job.id, issueReason, issueNote || "Kendala dilaporkan dari lapangan.");
    setShowIssueModal(false);
    setToastMessage("Kendala telah dicatat. Status pekerjaan berubah menjadi Kendala Lapangan.");
  };

  // ONE-NEXT-ACTION Handler
  const handlePrimaryNextAction = () => {
    if (job.status === "ASSIGNED") {
      if (!job.isReadyConfirmed) {
        markJobReady(job.id);
        setToastMessage("Kesiapan dikonfirmasi: APD & peralatan siap. Silakan berangkat!");
      } else {
        updateJobStatus(job.id, "DISPATCHED");
        setToastMessage("Status: Anda sedang menuju lokasi pelanggan.");
      }
    } else if (job.status === "DISPATCHED") {
      updateJobStatus(job.id, "ARRIVED");
      setToastMessage("Status: Anda telah tiba di lokasi pelanggan. Silakan sapa klien & mulai diagnosa.");
    } else if (job.status === "ARRIVED") {
      updateJobStatus(job.id, "IN_PROGRESS");
      setToastMessage("Status: Diagnosa dan pengerjaan teknis dimulai.");
    } else if (job.status === "IN_PROGRESS") {
      if (!isSopAllCompleted) {
        setToastMessage("Mohon selesaikan seluruh checklist tugas SOP sebelum kirim bukti.");
      } else {
        router.push(`/worker/jobs/${job.id}/proof`);
      }
    } else if (job.status === "BLOCKED") {
      updateJobStatus(job.id, "IN_PROGRESS");
      setToastMessage("Kendala teratasi: Melanjutkan pekerjaan.");
    }
  };

  const renderPrimaryActionButton = () => {
    if (job.status === "ASSIGNED" && !job.isReadyConfirmed) {
      return (
        <button
          type="button"
          onClick={handlePrimaryNextAction}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
        >
          <ShieldCheck size={18} weight="bold" />
          <span>KONFIRMASI KESIAPAN KERJA & APD</span>
        </button>
      );
    }
    if (job.status === "ASSIGNED" && job.isReadyConfirmed) {
      return (
        <button
          type="button"
          onClick={handlePrimaryNextAction}
          className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
        >
          <NavigationArrow size={18} weight="bold" />
          <span>MULAI BERANGKAT KE LOKASI</span>
        </button>
      );
    }
    if (job.status === "DISPATCHED") {
      return (
        <button
          type="button"
          onClick={handlePrimaryNextAction}
          className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
        >
          <CheckCircle size={18} weight="bold" />
          <span>SAYA SUDAH TIBA DI LOKASI</span>
        </button>
      );
    }
    if (job.status === "ARRIVED") {
      return (
        <button
          type="button"
          onClick={handlePrimaryNextAction}
          className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
        >
          <Wrench size={18} weight="bold" />
          <span>MULAI DIAGNOSA FISIK DI LOKASI</span>
        </button>
      );
    }

    // If job has nextAction defined (SRV-001 through SRV-012)
    if (job.nextAction) {
      if (job.nextAction.isExecutionBlocked) {
        return (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <WarningCircle size={20} weight="fill" className="text-rose-600 shrink-0" />
              <div className="text-left">
                <span className="font-bold block">Pengerjaan Servis Tertahan</span>
                <span className="text-[11px] text-rose-800">{job.nextAction.disabledReason}</span>
              </div>
            </div>
            <a
              href={`#${job.nextAction.targetSection || "spareparts"}`}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 transition"
            >
              {job.nextAction.label}
            </a>
          </div>
        );
      }

      return (
        <a
          href={`#${job.nextAction.targetSection || "diagnosis"}`}
          className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 text-center ${
            job.nextAction.buttonVariant === "success"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : job.nextAction.buttonVariant === "warning"
              ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
              : "bg-[#0F4C81] hover:bg-sky-900 text-white"
          }`}
        >
          <ArrowRight size={18} weight="bold" />
          <span>{job.nextAction.label.toUpperCase()}</span>
        </a>
      );
    }

    if (job.status === "IN_PROGRESS") {
      if (isSopAllCompleted) {
        return (
          <Link
            href={`/worker/jobs/${job.id}/proof`}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 text-center"
          >
            <Camera size={18} weight="bold" />
            <span>UNGGAH BUKTI PENGERJAAN & SOP</span>
          </Link>
        );
      }
      return (
        <button
          type="button"
          onClick={handlePrimaryNextAction}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
        >
          <Wrench size={18} weight="bold" />
          <span>LANJUTKAN CHECKLIST TUGAS ({completedSopCount}/{job.sopSteps.length})</span>
        </button>
      );
    }

    if (job.status === "PROOF_SUBMITTED") {
      return (
        <div className="w-full py-3.5 px-4 rounded-2xl bg-purple-100 text-purple-900 font-bold text-xs text-center border border-purple-200 flex items-center justify-center gap-2">
          <CheckCircle size={18} weight="fill" className="text-purple-600" />
          <span>BUKTI TERKIRIM — MENUNGGU VERIFIKASI & KONFIRMASI KLIEN</span>
        </div>
      );
    }

    return (
      <div className="w-full py-3.5 px-4 rounded-2xl bg-emerald-100 text-emerald-900 font-bold text-xs text-center border border-emerald-200 flex items-center justify-center gap-2">
        <SealCheck size={18} weight="fill" className="text-emerald-600" />
        <span>PEKERJAAN SELESAI & GARANSI RESMI AKTIF</span>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-24 max-w-2xl mx-auto font-body text-left">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* 1. TOP JOB HEADER (Section 9) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/worker/jobs"
              className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs shrink-0 transition"
              title="Kembali ke Pekerjaan Saya"
            >
              <ArrowLeft size={18} weight="bold" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-mono font-bold text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  #{job.orderId}
                </span>
                <span>•</span>
                <span className="font-mono text-slate-400">{job.id}</span>
                <span>•</span>
                <span className="truncate">{job.scheduledTime}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold font-display text-slate-900 truncate mt-0.5">
                {job.serviceTitle}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowIssueModal(true)}
            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold shrink-0 flex items-center gap-1 transition"
          >
            <WarningCircle size={15} weight="bold" />
            <span>Lapor Kendala</span>
          </button>
        </div>

        {/* Customer & Location Pill */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <User size={16} className="text-[#0F4C81] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Pelanggan</span>
                <span className="font-bold text-slate-900 truncate block">{job.customerName}</span>
              </div>
            </div>
            <a
              href={`tel:${job.customerPhone}`}
              className="text-[#0F4C81] font-bold hover:underline flex items-center gap-1 text-[11px] px-2 py-1 bg-sky-100/70 rounded-lg"
            >
              <Phone size={12} weight="fill" />
              <span>{job.customerPhone}</span>
            </a>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin size={16} className="text-rose-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Lokasi Unit</span>
                <span className="text-slate-700 truncate block">{job.customerAddress} ({job.distanceKm} km)</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenGoogleMaps}
              className="text-[#0F4C81] font-bold text-[11px] px-2 py-1 bg-sky-100/70 rounded-lg shrink-0 flex items-center gap-1"
            >
              <NavigationArrow size={12} weight="bold" />
              <span>Maps</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TIMELINE MASTER STEPPER (Section 9) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Tahapan Pengerjaan Lapangan (Master Timeline)
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.badgeClass}`}>
            {statusConfig.label}
          </span>
        </div>

        {/* 10-Step Visual Flow */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 pt-1">
          {masterTimelineSteps.map((step, idx) => {
            const isPassed = idx < activeTimelineIdx;
            const isCurrent = idx === activeTimelineIdx;

            return (
              <div key={step.id} className="flex flex-col items-center gap-1 text-center">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold transition ${
                    isPassed
                      ? "bg-emerald-500 text-white shadow-xs"
                      : isCurrent
                      ? "bg-[#0F4C81] text-white ring-2 ring-sky-300 shadow-xs"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isPassed ? <Check size={13} weight="bold" /> : idx + 1}
                </div>
                <span
                  className={`text-[9px] line-clamp-1 leading-tight ${
                    isCurrent
                      ? "font-bold text-[#0F4C81]"
                      : isPassed
                      ? "text-slate-700 font-medium"
                      : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Primary CTA Banner */}
        <div className="pt-2 border-t border-slate-100">
          {renderPrimaryActionButton()}
        </div>
      </div>

      {/* PRE-SERVICE PREPARATION CONTEXT & PROVIDER NOTES (Phase C Refinement) */}
      <div id="pre-service-context" className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-xs scroll-mt-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#0F4C81] flex items-center justify-center font-bold">
              <Sparkle size={18} weight="fill" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-slate-900">
                Konteks Persiapan Pra-Servis &amp; Catatan Provider
              </h2>
              <p className="text-[11px] text-slate-500">
                Panduan awal persiapan sebelum melakukan diagnosis aktual di lokasi
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-[#0F4C81] border border-sky-200">
            Preparation Suggestion
          </span>
        </div>

        {/* Customer Problem Statement */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Keluhan Pelanggan (Problem Statement):
          </span>
          <p className="text-slate-800 font-medium text-[11px] leading-relaxed">
            &quot;{job.issueDescription || "Tidak ada keluhan tertulis spesifik dari pelanggan."}&quot;
          </p>
        </div>

        {/* Provider Note */}
        {job.providerNotes ? (
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
              <NotePencil size={14} weight="bold" />
              Catatan Khusus dari Provider:
            </span>
            <p className="text-[11px] text-slate-800 leading-relaxed font-medium">
              &quot;{job.providerNotes}&quot;
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px]">
            Tidak ada catatan khusus dari Provider untuk pekerjaan ini.
          </div>
        )}

        {/* AI Preparation Context */}
        {job.aiPreparationContext ? (
          <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#0F4C81] text-xs flex items-center gap-1.5">
                <Sparkle size={15} weight="fill" className="text-sky-600" />
                Rekomendasi AI Service Analysis (Panduan Pre-Servis)
              </span>
              <span className="text-[10px] font-semibold text-sky-800 bg-white border border-sky-200 px-2 py-0.5 rounded-full">
                Informasional
              </span>
            </div>

            <p className="text-slate-800 font-semibold text-xs">
              {job.aiPreparationContext.summary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              {/* Possible Issues */}
              <div className="bg-white/90 p-3 rounded-xl border border-sky-100 space-y-1">
                <span className="font-bold text-slate-700 block text-[10px] uppercase">
                  Kemungkinan Masalah (Pre-Inspection):
                </span>
                <ul className="space-y-0.5 text-slate-600">
                  {job.aiPreparationContext.possibleIssues.map((issue, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-sky-600 font-bold">•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Possible Spareparts */}
              <div className="bg-white/90 p-3 rounded-xl border border-sky-100 space-y-1">
                <span className="font-bold text-slate-700 block text-[10px] uppercase">
                  Kemungkinan Sparepart (Bawa Bila Tersedia):
                </span>
                <ul className="space-y-0.5 text-slate-600">
                  {job.aiPreparationContext.possibleSpareparts.map((part, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{part}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic bg-sky-100/40 p-2 rounded-lg border border-sky-200/50">
              <strong>Penjelasan AI: </strong>{job.aiPreparationContext.confidenceExplanation}
            </p>

            {/* AI Disclaimer */}
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
              <ShieldCheck size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Disclaimer: </strong>
                {job.aiPreparationContext.disclaimer}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px]">
            Analisis AI tidak disertakan oleh Provider untuk pekerjaan ini.
          </div>
        )}

        {/* Boundary Notice */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Batas Tanggung Jawab: </strong>
            Worker tetap <strong>Timeline Owner &amp; penentu diagnosis aktual di lokasi</strong>. Rekomendasi AI dan Catatan Provider hanya membantu persiapan dan <strong>TIDAK otomatis membuat pesanan sparepart, TIDAK membebankan biaya, dan TIDAK mengunci Worker</strong> untuk wajib memakai suku cadang tertentu.
          </p>
        </div>
      </div>

      {/* 3 & 4. DIAGNOSIS RESULT & PRICING DECISION WORKSPACE (Section 5 to 26) */}
      <div id="diagnosis" className="scroll-mt-20">
        <div id="pricing" className="scroll-mt-20">
          <WorkerDiagnosisDecisionWorkspace
            job={job}
            onToast={setToastMessage}
          />
        </div>
      </div>

      {/* 5. SPAREPART & MATERIAL MASTER STATION (id="spareparts") */}
      <div id="spareparts" className="scroll-mt-20">
        <WorkerSparepartStation job={job} onToast={setToastMessage} />
      </div>

      {/* 6. TRACKING & PERJALANAN (id="tracking") */}
      <div id="tracking" className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3.5 scroll-mt-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Truck size={18} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-slate-900">
                Perjalanan & Checkpoint Lokasi
              </h2>
              <p className="text-[11px] text-slate-500">
                Status rute teknis dan koordinat kedatangan di lokasi
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Live GPS Tracking
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Status Trip:</span>
            <span className="font-bold text-slate-900">
              {job.status === "DISPATCHED"
                ? "Sedang Menuju Lokasi (Dalam Perjalanan)"
                : job.status === "ARRIVED"
                ? "Tiba di Lokasi Klien"
                : job.status === "IN_PROGRESS"
                ? "Di Lokasi (Pengerjaan Aktif)"
                : "Belum Berangkat"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600">Estimasi Jarak & Waktu:</span>
            <span className="font-semibold text-[#0F4C81]">
              {job.distanceKm} km (~{job.tracking?.etaMinutes || 20} Menit)
            </span>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleOpenGoogleMaps}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <NavigationArrow size={14} weight="bold" />
              <span>Buka Google Maps</span>
            </button>

            {job.status === "DISPATCHED" && (
              <button
                type="button"
                onClick={() => setShowDelayModal(true)}
                className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
              >
                Info Keterlambatan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 7. COMMUNICATION (id="communication") */}
      <div id="communication" className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3.5 scroll-mt-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#0F4C81] flex items-center justify-center font-bold">
              <ChatCircleDots size={18} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-slate-900">
                Komunikasi & Catatan Pelanggan
              </h2>
              <p className="text-[11px] text-slate-500">
                Hubungi pelanggan atau koordinasi langsung dengan tim bengkel
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-[#0F4C81] border border-sky-200">
            Direct Channel
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <a
            href={`tel:${job.customerPhone}`}
            className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center gap-2 transition"
          >
            <Phone size={16} weight="fill" />
            <span>Telepon Klien</span>
          </a>

          <button
            type="button"
            onClick={() => setShowChatModal(true)}
            className="p-3 rounded-2xl bg-[#0F4C81] text-white hover:bg-sky-900 flex items-center justify-center gap-2 transition shadow-xs"
          >
            <ChatCircleDots size={16} weight="bold" />
            <span>Kirim Pesan / Obrolan</span>
          </button>
        </div>

        {job.customerNotes && (
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
            <p className="font-bold flex items-center gap-1 text-amber-900 text-[11px]">
              <WarningCircle size={14} weight="fill" />
              Catatan Akses Khusus dari Pelanggan:
            </p>
            <p className="text-[11px] leading-relaxed">&quot;{job.customerNotes}&quot;</p>
          </div>
        )}
      </div>

      {/* 8. SOP & PROOF OF SERVICE (id="proof") */}
      <div id="proof" className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4 scroll-mt-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <Camera size={18} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-slate-900">
                Eksekusi SOP & Bukti Pekerjaan
              </h2>
              <p className="text-[11px] text-slate-500">
                Langkah pengerjaan teknis, foto before-after, dan parameter uji
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#0F4C81] bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-200">
            {completedSopCount} / {job.sopSteps.length} SOP Selesai
          </span>
        </div>

        {/* SOP Steps */}
        <div className="space-y-2">
          {job.sopSteps.map((step, idx) => (
            <div
              key={step.id}
              onClick={() => {
                if (job.status !== "COMPLETED" && job.status !== "PROOF_SUBMITTED") {
                  toggleSopStep(job.id, step.id);
                }
              }}
              className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                step.isCompleted
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                  : "bg-slate-50 border-slate-200/80 text-slate-800 hover:bg-sky-50/40"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition ${
                  step.isCompleted
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {step.isCompleted ? <Check size={13} weight="bold" /> : idx + 1}
              </div>

              <div className="text-xs min-w-0 flex-1">
                <p className={`font-bold ${step.isCompleted ? "line-through opacity-80" : ""}`}>
                  {step.title}
                </p>
                <p className="text-slate-500 mt-0.5 text-[11px]">{step.description}</p>
                {step.requiresPhoto && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md mt-1">
                    <Camera size={12} />
                    <span>Wajib Foto Bukti</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Upload Proof Shortcut Button */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Lengkapi form verifikasi bukti sebelum menyelesaikan pekerjaan.
          </span>
          <Link
            href={`/worker/jobs/${job.id}/proof`}
            className="px-4 py-2 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
          >
            <Camera size={14} weight="bold" />
            <span>Form Bukti & Tanda Tangan</span>
          </Link>
        </div>
      </div>

      {/* 9. COMPLETION & WARRANTY (id="completion") */}
      <div id="completion" className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3.5 scroll-mt-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <SealCheck size={18} weight="bold" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-slate-900">
                Penyelesaian & Status Garansi
              </h2>
              <p className="text-[11px] text-slate-500">
                Penutupan order, garansi resmi SERVIO, dan penyelesaian pembayaran
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Official Completion
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Status Penyelesaian:</span>
            <span
              className={`font-bold ${
                job.status === "COMPLETED"
                  ? "text-emerald-700"
                  : job.status === "PROOF_SUBMITTED"
                  ? "text-purple-700"
                  : "text-slate-700"
              }`}
            >
              {job.status === "COMPLETED"
                ? "✓ Selesai & Dikonfirmasi Pelanggan"
                : job.status === "PROOF_SUBMITTED"
                ? "Bukti Diajukan (Menunggu Konfirmasi)"
                : "Belum Selesai (Sedang Berjalan)"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600">Garansi Layanan:</span>
            <span className="font-semibold text-slate-900">
              Garansi Servis Aktif 30 Hari paska konfirmasi
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600">Hak Insentif Teknisi:</span>
            <span className="font-bold text-[#0F4C81]">
              Rp {job.feeWorker.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>

      {/* ISSUE REPORTING MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <WarningCircle size={20} weight="fill" />
                <h3 className="text-sm font-bold font-display text-slate-900">
                  Laporkan Kendala Lapangan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Pilih Alasan Kendala:
                </label>
                <select
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 font-medium"
                >
                  <option value="Pelanggan tidak ada di lokasi / tidak bisa dihubungi">
                    Pelanggan tidak ada di lokasi / tidak bisa dihubungi
                  </option>
                  <option value="Kondisi tidak aman / bahaya instalasi listrik">
                    Kondisi tidak aman / bahaya instalasi listrik
                  </option>
                  <option value="Akses unit terkunci / dilarang satpam komplek">
                    Akses unit terkunci / dilarang satpam komplek
                  </option>
                  <option value="Material / sparepart tidak sesuai spesifikasi unit">
                    Material / sparepart tidak sesuai spesifikasi unit
                  </option>
                  <option value="Kendala teknis di luar lingkup pesanan servis">
                    Kendala teknis di luar lingkup pesanan servis
                  </option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Catatan Tambahan:
                </label>
                <textarea
                  rows={3}
                  value={issueNote}
                  onChange={(e) => setIssueNote(e.target.value)}
                  placeholder="Jelaskan situasi di lapangan secara singkat..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitIssue}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                Kirim Laporan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELAY REPORT MODAL */}
      {showDelayModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold font-display text-slate-900">
                Pemberitahuan Estimasi Keterlambatan
              </h3>
              <button
                type="button"
                onClick={() => setShowDelayModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Kirim estimasi tambahan waktu perjalanan kepada pelanggan:
            </p>

            <div className="grid grid-cols-3 gap-2 text-xs font-bold">
              {[15, 30, 45].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDelayMinutes(mins)}
                  className={`py-2 rounded-xl border transition ${
                    delayMinutes === mins
                      ? "bg-[#0F4C81] text-white border-[#0F4C81]"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  +{mins} Menit
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowDelayModal(false);
                setToastMessage(`Estimasi keterlambatan +${delayMinutes} menit terkirim ke klien.`);
              }}
              className="w-full py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs transition"
            >
              Kirim ke Pelanggan
            </button>
          </div>
        </div>
      )}

      {/* QUICK CHAT MODAL */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold font-display text-slate-900">
                Kirim Pesan Cepat
              </h3>
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            {/* Recipient toggle */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setChatRecipient("CUSTOMER")}
                className={`py-2 rounded-xl border transition ${
                  chatRecipient === "CUSTOMER"
                    ? "bg-[#0F4C81] text-white border-[#0F4C81]"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                Klien: {job.customerName.split(" ")[0]}
              </button>
              <button
                type="button"
                onClick={() => setChatRecipient("PROVIDER")}
                className={`py-2 rounded-xl border transition ${
                  chatRecipient === "PROVIDER"
                    ? "bg-[#0F4C81] text-white border-[#0F4C81]"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                Mitra Bengkel
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <textarea
                rows={3}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  chatRecipient === "CUSTOMER"
                    ? "Tulis pesan ramah kepada pelanggan..."
                    : "Tulis pesan koordinasi ke dispatch bengkel..."
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0F4C81]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!chatInput.trim()) return;
                  setShowChatModal(false);
                  setToastMessage(`Pesan terkirim ke ${chatRecipient === "CUSTOMER" ? "Pelanggan" : "Mitra Bengkel"}.`);
                  setChatInput("");
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs shadow-xs"
              >
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
