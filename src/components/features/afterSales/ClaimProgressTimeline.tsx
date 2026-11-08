"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Clock,
  X,
  WarningCircle,
  Truck,
  Wrench,
  ShieldCheck,
  Bank,
  Package,
  User,
  ArrowRight,
  Info,
  CalendarCheck,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { AfterSalesCase, TimelineActivity } from "@/types/afterSales";

export interface TimelineStep {
  id: string;
  label: string;
  sublabel?: string;
  status: "COMPLETED" | "CURRENT" | "UPCOMING" | "REJECTED" | "WARNING";
  timestamp?: string;
  actor?: string;
  description?: string;
  evidenceRefs?: string[];
  icon?: React.ElementType;
}

interface ClaimProgressTimelineProps {
  caseData: AfterSalesCase;
  className?: string;
}

export function ClaimProgressTimeline({
  caseData,
  className = "",
}: ClaimProgressTimelineProps) {
  const [selectedStep, setSelectedStep] = useState<TimelineStep | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -240 : 240;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  // Build adaptive steps based on resolution flow & current state
  const steps = buildAdaptiveTimelineSteps(caseData);

  const currentStepIndex = steps.findIndex((s) => s.status === "CURRENT");
  const progressPercent =
    steps.length <= 1
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            ((currentStepIndex >= 0
              ? currentStepIndex
              : steps.filter((s) => s.status === "COMPLETED").length - 1) /
              (steps.length - 1)) *
              100
          )
        );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Alur Perkembangan Pengajuan
          </h4>
        </div>

        {/* Scroll Controls (Desktop & Mobile) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
            title="Geser Kiri"
          >
            <CaretLeft size={13} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
            title="Geser Kanan"
          >
            <CaretRight size={13} weight="bold" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Timeline Track */}
      <div
        ref={scrollRef}
        className="relative overflow-x-auto pb-4 pt-3 no-scrollbar scroll-smooth"
      >
        <div className="min-w-max px-3 relative">
          {/* Background Connecting Line */}
          <div className="absolute top-5 left-8 right-8 h-1 bg-slate-100 rounded-full" />

          {/* Animated Active Progress Line */}
          <motion.div
            className="absolute top-5 left-8 h-1 bg-gradient-to-r from-emerald-500 to-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />

          {/* Step Nodes Row */}
          <div className="relative flex items-start gap-8 sm:gap-12">
            {steps.map((step, idx) => {
              const Icon = step.icon || ShieldCheck;
              const isSelected = selectedStep?.id === step.id;

              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center text-center cursor-pointer group"
                  style={{ width: "115px" }}
                  onClick={() => setSelectedStep(isSelected ? null : step)}
                >
                  {/* Node Circle */}
                  <motion.div
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 z-10 shadow-xs ${
                      step.status === "COMPLETED"
                        ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                        : step.status === "CURRENT"
                        ? "bg-primary text-white ring-4 ring-sky-200 shadow-md animate-bounce-short"
                        : step.status === "REJECTED"
                        ? "bg-rose-600 text-white ring-4 ring-rose-100"
                        : step.status === "WARNING"
                        ? "bg-amber-500 text-white ring-4 ring-amber-100"
                        : "bg-white text-slate-300 border-2 border-slate-200 group-hover:border-slate-400 group-hover:text-slate-500"
                    }`}
                  >
                    {step.status === "COMPLETED" ? (
                      <Check size={16} weight="bold" />
                    ) : step.status === "REJECTED" ? (
                      <X size={16} weight="bold" />
                    ) : step.status === "WARNING" ? (
                      <WarningCircle size={16} weight="fill" />
                    ) : (
                      <Icon size={16} weight="bold" />
                    )}

                    {/* Step number badge */}
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-[9px] font-black text-slate-700 border border-slate-200 flex items-center justify-center shadow-2xs">
                      {idx + 1}
                    </span>
                  </motion.div>

                  {/* Labels */}
                  <div className="mt-2 space-y-0.5">
                    <p
                      className={`text-[11px] font-bold leading-tight ${
                        step.status === "CURRENT"
                          ? "text-primary"
                          : step.status === "COMPLETED"
                          ? "text-slate-900"
                          : step.status === "REJECTED"
                          ? "text-rose-700"
                          : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </p>

                    {step.timestamp ? (
                      <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                        {formatShortDate(step.timestamp)}
                      </p>
                    ) : step.sublabel ? (
                      <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                        {step.sublabel}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Step Details Card / Popover */}
      <AnimatePresence>
        {selectedStep && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 relative shadow-2xs"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    selectedStep.status === "COMPLETED"
                      ? "bg-emerald-500"
                      : selectedStep.status === "CURRENT"
                      ? "bg-primary"
                      : selectedStep.status === "REJECTED"
                      ? "bg-rose-500"
                      : "bg-slate-300"
                  }`}
                />
                <h5 className="font-bold text-slate-800 text-xs">
                  {selectedStep.label}
                </h5>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                  {selectedStep.status === "COMPLETED"
                    ? "Selesai"
                    : selectedStep.status === "CURRENT"
                    ? "Sedang Berjalan"
                    : selectedStep.status === "REJECTED"
                    ? "Ditolak"
                    : "Menunggu"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStep(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Waktu Kejadian:</span>
                <span className="font-semibold text-slate-700">
                  {selectedStep.timestamp
                    ? formatFullDate(selectedStep.timestamp)
                    : "Menunggu tahapan sebelumnya selesai"}
                </span>
              </div>
              {selectedStep.actor && (
                <div>
                  <span className="text-slate-400 block">Diproses Oleh:</span>
                  <span className="font-semibold text-slate-700">
                    {selectedStep.actor}
                  </span>
                </div>
              )}
            </div>

            {selectedStep.description && (
              <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/70 leading-relaxed">
                {selectedStep.description}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -------------------------------------------------------------
// Timeline Step Builder: Adaptive based on Case Resolution Type
// -------------------------------------------------------------
function buildAdaptiveTimelineSteps(caseData: AfterSalesCase): TimelineStep[] {
  const activities = caseData.timeline || [];
  const findAct = (matcher: (a: TimelineActivity) => boolean) =>
    activities.find(matcher);

  const isCompleted = caseData.mainStatus === "COMPLETED";
  const isRejected = caseData.mainStatus === "REJECTED";
  const isNoResponse = caseData.isNoResponse;
  const isUnderReview =
    caseData.mainStatus === "UNDER_REVIEW" ||
    caseData.specialCondition === "WAITING_CUSTOMER_INFO";
  const isActionRequired =
    caseData.specialCondition === "WAITING_CUSTOMER_INFO" ||
    caseData.specialCondition === "WAITING_CUSTOMER_APPROVAL";
  const isAlternative = caseData.specialCondition === "WAITING_CUSTOMER_APPROVAL";
  const isInResolution = caseData.mainStatus === "IN_RESOLUTION";

  const resolvedSolution =
    caseData.approvedSolution ||
    caseData.chosenSolution ||
    caseData.customerRequestedSolution;

  // 1. Case Rejection Flow
  if (isRejected) {
    const rejAct = findAct(
      (a) =>
        a.title.toLowerCase().includes("tolak") ||
        a.description.toLowerCase().includes("tolak")
    );
    return [
      {
        id: "step-submitted",
        label: "Diajukan",
        status: "COMPLETED",
        timestamp: caseData.submittedAt,
        actor: "Pelanggan",
        description: `Klaim diajukan dengan alasan: ${caseData.issueReason}`,
        icon: ShieldCheck,
      },
      {
        id: "step-reviewed",
        label: "Ditinjau",
        status: "COMPLETED",
        timestamp: caseData.respondedAt || caseData.submittedAt,
        actor: caseData.organizationName,
        description: "Pemeriksaan data & kelayakan garansi dilakukan.",
        icon: Clock,
      },
      {
        id: "step-rejected",
        label: "Ditolak",
        status: "REJECTED",
        timestamp: caseData.respondedAt || activities[activities.length - 1]?.timestamp,
        actor: caseData.organizationName,
        description:
          caseData.rejectionReason ||
          rejAct?.description ||
          "Klaim tidak memenuhi kriteria garansi resmi.",
        icon: X,
      },
    ];
  }

  // 2. Case No Response Flow
  if (isNoResponse) {
    return [
      {
        id: "step-submitted",
        label: "Diajukan",
        status: "COMPLETED",
        timestamp: caseData.submittedAt,
        actor: "Pelanggan",
        description: `Klaim diajukan dengan alasan: ${caseData.issueReason}`,
        icon: ShieldCheck,
      },
      {
        id: "step-sla-breach",
        label: "72 Jam Lewat",
        status: "WARNING",
        timestamp: caseData.slaDeadlineAt,
        actor: "Sistem SERVIO",
        description:
          "Batas waktu respons 3 x 24 jam kalender pelaku usaha telah terlewati tanpa tanggapan.",
        icon: WarningCircle,
      },
      {
        id: "step-escalate",
        label: "Eskalasi Support",
        status: caseData.reportedToSupport ? "COMPLETED" : "CURRENT",
        timestamp: caseData.reportDetails?.reportedAt,
        actor: caseData.reportedToSupport ? "Pelanggan" : "Menunggu Pelanggan",
        description: caseData.reportedToSupport
          ? `Laporan diteruskan ke Pusat Bantuan SERVIO (Ref: ${caseData.reportDetails?.reportId}).`
          : "Anda berhak melaporkan masalah ini langsung ke tim mediasi SERVIO.",
        icon: Info,
      },
    ];
  }

  // 3. REFUND Flow
  if (resolvedSolution === "REFUND") {
    const isRefundProcessing =
      isInResolution && caseData.refundTrack?.status === "PROCESSING";
    const isRefundSuccess =
      isCompleted || caseData.refundTrack?.status === "SUCCEEDED";

    return [
      {
        id: "step-submitted",
        label: "Diajukan",
        status: "COMPLETED",
        timestamp: caseData.submittedAt,
        actor: "Pelanggan",
        description: `Klaim diajukan dengan permintaan solusi Refund.`,
        icon: ShieldCheck,
      },
      {
        id: "step-reviewed",
        label: isUnderReview
          ? "Sedang Ditinjau"
          : isAlternative
          ? "Tawaran Solusi"
          : "Ditinjau",
        status:
          isUnderReview || isActionRequired || isAlternative
            ? "CURRENT"
            : isInResolution || isCompleted
            ? "COMPLETED"
            : "UPCOMING",
        timestamp: caseData.respondedAt,
        actor: caseData.organizationName,
        description: isAlternative
          ? `Pelaku usaha menawarkan solusi alternatif. Menunggu persetujuan Anda.`
          : `Klaim diperiksa kelayakannya oleh ${caseData.organizationName}.`,
        icon: Clock,
      },
      {
        id: "step-approved",
        label: "Disetujui",
        status:
          isInResolution || isCompleted
            ? "COMPLETED"
            : isUnderReview || isActionRequired
            ? "UPCOMING"
            : "UPCOMING",
        timestamp: caseData.respondedAt,
        actor: caseData.organizationName,
        description: `Solusi Refund pengembalian dana telah disetujui.`,
        icon: Check,
      },
      {
        id: "step-refund-processing",
        label: "Refund Diproses",
        status: isRefundSuccess
          ? "COMPLETED"
          : isRefundProcessing
          ? "CURRENT"
          : "UPCOMING",
        timestamp: caseData.refundTrack?.approvedAt,
        actor: "Finance 06",
        description: `Pencairan dana ${
          caseData.refundTrack?.totalRefund
            ? "Rp " + Number(caseData.refundTrack.totalRefund).toLocaleString("id-ID")
            : ""
        } sedang diproses oleh sistem keuangan.`,
        icon: Bank,
      },
      {
        id: "step-completed",
        label: "Dana di S-Pay",
        status: isRefundSuccess ? "COMPLETED" : "UPCOMING",
        timestamp: caseData.refundTrack?.approvedAt,
        actor: "S-Pay Escrow",
        description: `Dana berhasil masuk ke saldo S-Pay akun pelanggan. Selesai.`,
        icon: ShieldCheck,
      },
    ];
  }

  // 4. REWORK Flow (Pengerjaan Ulang Jasa)
  if (resolvedSolution === "REPAIR" || (resolvedSolution as any) === "REWORK") {
    const job = caseData.warrantyJob;
    const isJobScheduled = Boolean(job?.scheduledDate || job?.workerName);
    const isExecuting =
      job?.operationalStatus === "IN_PROGRESS" || job?.operationalStatus === "OTW";
    const isFinished =
      job?.operationalStatus === "DONE" || isCompleted;

    return [
      {
        id: "step-submitted",
        label: "Diajukan",
        status: "COMPLETED",
        timestamp: caseData.submittedAt,
        actor: "Pelanggan",
        description: `Pengajuan klaim garansi servis pengerjaan teknisi.`,
        icon: ShieldCheck,
      },
      {
        id: "step-reviewed",
        label: isUnderReview ? "Sedang Ditinjau" : "Ditinjau",
        status:
          isUnderReview || isActionRequired
            ? "CURRENT"
            : isInResolution || isCompleted
            ? "COMPLETED"
            : "UPCOMING",
        timestamp: caseData.respondedAt,
        actor: caseData.organizationName,
        description: "Provider memeriksa riwayat servis dan keluhan garansi.",
        icon: Clock,
      },
      {
        id: "step-approved",
        label: "Dijadwalkan",
        status: isJobScheduled || isExecuting || isFinished ? "COMPLETED" : isInResolution ? "CURRENT" : "UPCOMING",
        timestamp: job?.scheduledDate,
        actor: caseData.organizationName,
        description: job?.workerName
          ? `Teknisi ${job.workerName} ditugaskan pada ${job.scheduledDate || "jadwal disepakati"}.`
          : "Provider menyetujui servis ulang tanpa biaya tambahan (Rp0).",
        icon: CalendarCheck,
      },
      {
        id: "step-execution",
        label: "Pengerjaan",
        status: isFinished ? "COMPLETED" : isExecuting ? "CURRENT" : "UPCOMING",
        timestamp: undefined,
        actor: job?.workerName || "Teknisi",
        description: isExecuting
          ? "Teknisi sedang melaksanakan pengerjaan ulang garansi di lokasi."
          : isFinished
          ? "Pengerjaan fisik telah selesai dan unit telah diuji kembali."
          : "Menunggu kedatangan teknisi.",
        icon: Wrench,
      },
      {
        id: "step-completed",
        label: "Selesai",
        status: isCompleted ? "COMPLETED" : isFinished ? "CURRENT" : "UPCOMING",
        timestamp: isCompleted ? caseData.respondedAt : undefined,
        actor: "Pelanggan & Provider",
        description: isCompleted
          ? "Garansi servis selesai diverifikasi. Hak konsumen terpenuhi penuh."
          : "Menunggu verifikasi pengerjaan selesai dari pelanggan.",
        icon: ShieldCheck,
      },
    ];
  }

  // 5. REPLACEMENT Flow (Penggantian Barang)
  const rep = caseData.replacementShipment;
  const isPacked = rep?.shippingStatus === "PREPARING" || rep?.shippingStatus === "SHIPPED" || rep?.shippingStatus === "DELIVERED" || isCompleted;
  const isShipped = rep?.shippingStatus === "SHIPPED" || rep?.shippingStatus === "DELIVERED" || isCompleted;
  const isDelivered = rep?.shippingStatus === "DELIVERED" || isCompleted;

  return [
    {
      id: "step-submitted",
      label: "Diajukan",
      status: "COMPLETED",
      timestamp: caseData.submittedAt,
      actor: "Pelanggan",
      description: `Klaim diajukan dengan permintaan unit pengganti baru.`,
      icon: ShieldCheck,
    },
    {
      id: "step-reviewed",
      label: isUnderReview ? "Sedang Ditinjau" : "Ditinjau",
      status:
        isUnderReview || isActionRequired
          ? "CURRENT"
          : isInResolution || isCompleted
          ? "COMPLETED"
          : "UPCOMING",
      timestamp: caseData.respondedAt,
      actor: caseData.organizationName,
      description: "Merchant memeriksa kecocokan unit dan bukti kendala.",
      icon: Clock,
    },
    {
      id: "step-approved",
      label: "Disetujui",
      status: isInResolution || isCompleted ? "COMPLETED" : "UPCOMING",
      timestamp: caseData.respondedAt,
      actor: caseData.organizationName,
      description: "Penggantian unit baru disetujui tanpa biaya (Rp0).",
      icon: Check,
    },
    {
      id: "step-packed",
      label: "Dikemas",
      status: isShipped ? "COMPLETED" : isPacked ? "CURRENT" : "UPCOMING",
      timestamp: undefined,
      actor: caseData.organizationName,
      description: "Unit pengganti baru sedang disiapkan dan dikemas rapi.",
      icon: Package,
    },
    {
      id: "step-shipped",
      label: "Dikirim",
      status: isDelivered ? "COMPLETED" : isShipped ? "CURRENT" : "UPCOMING",
      timestamp: rep?.shippedAt,
      actor: rep?.courierName || "Kurir Pengiriman",
      description: rep?.trackingNumber
        ? `Barang dikirim dengan ${rep.courierName || "Ekspedisi"} (Resi: ${rep.trackingNumber}).`
        : "Barang sedang dalam perjalanan ke alamat Anda.",
      icon: Truck,
    },
    {
      id: "step-completed",
      label: "Diterima",
      status: isCompleted ? "COMPLETED" : isDelivered ? "CURRENT" : "UPCOMING",
      timestamp: rep?.deliveredAt,
      actor: "Pelanggan",
      description: isCompleted
        ? "Barang pengganti diterima dengan baik. Penyelesaian garansi selesai."
        : "Barang telah tiba. Silakan konfirmasi penerimaan unit pengganti.",
      icon: ShieldCheck,
    },
  ];
}

function formatShortDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return isoString;
  }
}

function formatFullDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}
