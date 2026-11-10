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
  MapPin,
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

          {/* Animated Active Progress Line with Flowing Light Beam */}
          <motion.div
            className="absolute top-5 left-8 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-primary rounded-full overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              className="w-full h-full bg-gradient-to-r from-transparent via-white/80 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
            />
          </motion.div>

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
                    {step.status === "CURRENT" && (
                      <span className="absolute -inset-1 rounded-2xl bg-sky-400/40 animate-ping pointer-events-none" />
                    )}

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

  // 4. REWORK Flow (Pengerjaan Ulang Jasa Digital Penuh)
  if (resolvedSolution === "REPAIR" || (resolvedSolution as any) === "REWORK") {
    const job = caseData.warrantyJob;
    const opStatus = job?.operationalStatus || (isCompleted ? "DONE" : isInResolution ? "ASSIGNED" : "NEW");
    const isJobAssigned = isInResolution || isCompleted || Boolean(job?.scheduledDate || job?.workerName);
    const isJobAccepted = isCompleted || opStatus === "ACCEPTED" || opStatus === "OTW" || opStatus === "IN_PROGRESS" || opStatus === "DONE";
    const isOtw = isCompleted || opStatus === "OTW" || opStatus === "IN_PROGRESS" || opStatus === "DONE";
    const isWorking = isCompleted || opStatus === "IN_PROGRESS" || opStatus === "DONE";
    const isDone = isCompleted || opStatus === "DONE";

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
        id: "step-assigned",
        label: "Ditugaskan",
        status: isJobAssigned ? "COMPLETED" : isUnderReview ? "CURRENT" : "UPCOMING",
        timestamp: caseData.respondedAt,
        actor: caseData.organizationName,
        description: job?.workerName
          ? `Teknisi ${job.workerName} ditugaskan untuk kunjungan ${job.scheduledDate || "sesuai jadwal"}.`
          : "Provider menyetujui servis ulang garansi Rp0 dan menugaskan teknisi resmi.",
        icon: CalendarCheck,
      },
      {
        id: "step-accepted",
        label: "Teknisi Terima",
        status: isJobAccepted ? "COMPLETED" : opStatus === "ASSIGNED" ? "CURRENT" : "UPCOMING",
        timestamp: undefined,
        actor: job?.workerName || "Teknisi",
        description: isJobAccepted
          ? `Teknisi ${job?.workerName || "Resmi"} telah menerima tugas dan siap berangkat.`
          : `Menunggu konfirmasi penerimaan tugas dari teknisi di aplikasi.`,
        icon: Check,
      },
      {
        id: "step-otw",
        label: "Teknisi OTW",
        status: isOtw ? (opStatus === "OTW" ? "CURRENT" : "COMPLETED") : opStatus === "ACCEPTED" ? "CURRENT" : "UPCOMING",
        timestamp: undefined,
        actor: job?.workerName || "Teknisi",
        description: opStatus === "OTW"
          ? `Teknisi sedang dalam perjalanan menuju lokasi Anda.`
          : isOtw
          ? `Teknisi telah sampai di lokasi perbaikan.`
          : `Teknisi bersiap menuju lokasi pelanggan.`,
        icon: Truck,
      },
      {
        id: "step-execution",
        label: "Pengerjaan Rp0",
        status: isDone ? "COMPLETED" : opStatus === "IN_PROGRESS" ? "CURRENT" : "UPCOMING",
        timestamp: undefined,
        actor: job?.workerName || "Teknisi",
        description: opStatus === "IN_PROGRESS"
          ? `Teknisi tiba di lokasi dan langsung melaksanakan perbaikan garansi bebas biaya.`
          : isDone
          ? `Pengerjaan fisik perbaikan selesai dan telah diuji tuntas.`
          : `Pengerjaan servis ulang garansi bebas biaya (tanpa diagnosa berbayar).`,
        icon: Wrench,
      },
      {
        id: "step-completed",
        label: "Selesai",
        status: isCompleted ? "COMPLETED" : isDone ? "CURRENT" : "UPCOMING",
        timestamp: isCompleted ? (caseData.respondedAt || caseData.submittedAt) : undefined,
        actor: "Pelanggan & Provider",
        description: isCompleted
          ? `Perbaikan garansi tuntas dan terverifikasi dengan bukti autentik hasil pengerjaan.`
          : `Menunggu konfirmasi akhir penyelesaian garansi.`,
        icon: ShieldCheck,
      },
    ];
  }

  // 5. REPLACEMENT Flow (Penggantian Barang / Retur Fisik)
  const rep = caseData.replacementShipment;
  const isDelivered = rep?.shippingStatus === "DELIVERED" || isCompleted;
  const isShipped = rep?.shippingStatus === "SHIPPED" || isDelivered;
  const isPacked = rep?.shippingStatus === "PREPARING" || isShipped;

  // Jika membutuhkan Retur Fisik ke Toko lebih dulu (Alur 6 Langkah Retur & Penggantian Unit)
  if (caseData.requiresReturn || caseData.returnShipping?.requiresPhysicalReturn || caseData.returnShipping) {
    const ret = caseData.returnShipping;
    const isAddressIssued = caseData.mainStatus !== "SUBMITTED";
    const isReturnShipped = Boolean(ret?.trackingNumber);
    const isQcPassed = Boolean(ret?.inspectedByMerchant);
    const isNewUnitShipped = rep?.shippingStatus === "SHIPPED" || isDelivered;

    return [
      {
        id: "step-submitted",
        label: "Diajukan",
        status: "COMPLETED",
        timestamp: caseData.submittedAt,
        actor: "Pelanggan",
        description: `Klaim retur dan penggantian unit diajukan oleh pembeli.`,
        icon: ShieldCheck,
      },
      {
        id: "step-address",
        label: "Alamat Terbit",
        status: isAddressIssued ? "COMPLETED" : "CURRENT",
        timestamp: caseData.respondedAt,
        actor: caseData.organizationName,
        description: isAddressIssued
          ? `Alamat gudang toko retur telah diterbitkan untuk pengiriman balik barang.`
          : `Menunggu penerbitan instruksi dan alamat gudang retur dari penjual.`,
        icon: MapPin,
      },
      {
        id: "step-return-shipped",
        label: "Kirim Retur",
        status: isReturnShipped ? "COMPLETED" : isAddressIssued ? "CURRENT" : "UPCOMING",
        timestamp: ret?.shippedAt,
        actor: "Pelanggan",
        description: isReturnShipped
          ? `Barang retur telah dikirim pembeli (Resi: ${ret?.trackingNumber || "-"}).`
          : `Pembeli menyiapkan dan mengirimkan barang rusak ke alamat retur toko.`,
        icon: Truck,
      },
      {
        id: "step-qc",
        label: "Toko QC",
        status: isQcPassed ? "COMPLETED" : isReturnShipped ? "CURRENT" : "UPCOMING",
        timestamp: ret?.receivedAt,
        actor: caseData.organizationName,
        description: isQcPassed
          ? `Barang retur telah diterima di gudang toko dan lulus inspeksi fisik.`
          : isReturnShipped
          ? `Barang retur dalam perjalanan atau antrian inspeksi QC toko.`
          : `Menunggu barang retur sampai di toko untuk pemeriksaan QC.`,
        icon: Check,
      },
      {
        id: "step-replacement-shipped",
        label: "Kirim Unit Baru",
        status: isDelivered ? "COMPLETED" : isNewUnitShipped ? "CURRENT" : isQcPassed ? "CURRENT" : "UPCOMING",
        timestamp: rep?.shippedAt,
        actor: rep?.courierName || caseData.organizationName,
        description: isNewUnitShipped
          ? (rep?.trackingUrl
              ? `Unit pengganti baru sedang diantar via ${rep?.courierName || "GoSend Instant"} (Ongkir Rp0). Pelanggan dapat memantau live tracking Gojek.`
              : `Unit baru dikirim via ${rep?.courierName || "Kurir Toko"} (Ongkir Rp0).`)
          : isQcPassed
          ? `Inspeksi QC lolos. Toko sedang menyiapkan unit baru untuk segera dikirimkan.`
          : `Pengiriman unit baru dilakukan setelah barang retur lolos inspeksi QC.`,
        icon: Truck,
      },
      {
        id: "step-completed",
        label: "Selesai",
        status: isCompleted ? "COMPLETED" : isDelivered ? "CURRENT" : "UPCOMING",
        timestamp: isCompleted ? (caseData.respondedAt || rep?.deliveredAt) : undefined,
        actor: "Pelanggan & Toko",
        description: isCompleted
          ? `Unit baru telah diterima dengan baik oleh pelanggan. Kasus retur selesai.`
          : `Menunggu penerimaan fisik dan konfirmasi unit pengganti dari pelanggan.`,
        icon: ShieldCheck,
      },
    ];
  }

  // Jika penggantian unit tanpa retur fisik (misal rusak total saat tiba)
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
      description: "Merchant memeriksa kelayakan klaim dan bukti kendala.",
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
      id: "step-shipped",
      label: "Kirim Unit Baru",
      status: isDelivered ? "COMPLETED" : isShipped ? "CURRENT" : isPacked ? "CURRENT" : "UPCOMING",
      timestamp: rep?.shippedAt,
      actor: rep?.courierName || "Kurir Toko",
      description: (() => {
        if (!rep) return "Unit baru sedang disiapkan dan dikirim ke alamat Anda.";
        const isGoSend = rep.shippingMethod === "GOSEND" || rep.courierName?.toLowerCase().includes("gosend");
        if (isGoSend) {
          const driver = rep.driverName || "Driver GoSend";
          const phone = rep.driverPhone || "0812-9876-5432";
          return `Barang baru dikirim via GoSend Instant (${driver} - ${phone}) bebas ongkir.`;
        }
        const sender = rep.driverName || "Kurir Toko";
        const phone = rep.driverPhone || "0813-9876-5432";
        return `Barang baru diantar langsung oleh Kurir Toko (${sender} - ${phone}) bebas ongkir.`;
      })(),
      icon: Truck,
    },
    {
      id: "step-completed",
      label: "Selesai",
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
