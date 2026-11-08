"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle,
  CaretDown,
  CaretUp,
  CalendarBlank,
  Wrench,
  User,
  Truck,
  MapPin,
  CurrencyCircleDollar,
  ShieldCheck,
  Clock,
  HourglassMedium,
  Handshake,
  HouseLine,
  ListChecks,
  XCircle,
} from "@phosphor-icons/react";
import { ServiceOrder } from "../../types";

export interface ServiceOrderStageBannerProps {
  order: ServiceOrder;
  role: "CUSTOMER" | "PROVIDER" | "WORKER" | "ADMIN" | "FINANCE";
}

interface StageStep {
  stepNo: number;
  id: string;
  shortLabel: string;
  title: string;
  descriptionCustomer: string;
  descriptionProvider: string;
  descriptionWorker: string;
  icon: React.ComponentType<any>;
}

export const LIFECYCLE_STAGES: StageStep[] = [
  {
    stepNo: 1,
    id: "BOOKING_CREATED",
    shortLabel: "Booking & Survei",
    title: "Booking & Pembayaran Survei",
    descriptionCustomer: "Permohonan booking diajukan dan biaya survei/diagnosis telah diamankan di penampung escrow Servio.",
    descriptionProvider: "Customer mengajukan permohonan booking baru dengan jaminan biaya survei terverifikasi aman.",
    descriptionWorker: "Order baru masuk dalam antrean sistem penyedia jasa.",
    icon: CalendarBlank,
  },
  {
    stepNo: 2,
    id: "PROVIDER_REVIEW",
    shortLabel: "Konfirmasi Toko",
    title: "Keputusan Mitra Toko",
    descriptionCustomer: "Menunggu konfirmasi penerimaan pesanan oleh mitra toko.",
    descriptionProvider: "Tinjau jadwal dan keluhan pelanggan, lalu putuskan untuk Menerima atau Menolak order.",
    descriptionWorker: "Penyedia jasa sedang meninjau ketersediaan tim dan jadwal servis.",
    icon: Handshake,
  },
  {
    stepNo: 3,
    id: "WORKER_DISPATCH",
    shortLabel: "Penugasan Teknisi",
    title: "Penugasan Teknisi",
    descriptionCustomer: "Pesanan diterima mitra toko. Penyedia jasa sedang memilih teknisi yang bertugas.",
    descriptionProvider: "Pilih dan tugaskan teknisi bersertifikasi dari daftar tim bengkel Anda.",
    descriptionWorker: "Penyedia jasa sedang menugaskan teknisi untuk jadwal ini.",
    icon: User,
  },
  {
    stepNo: 4,
    id: "WORKER_REVIEW",
    shortLabel: "Respons Teknisi",
    title: "Respons Penugasan Teknisi",
    descriptionCustomer: "Teknisi telah dipilih dan sedang mengonfirmasi kesiapan jadwal kunjungan.",
    descriptionProvider: "Menunggu teknisi menerima lembar tugas kunjungan lapangan.",
    descriptionWorker: "Tugas baru masuk! Tinjau detail keluhan dan putuskan untuk Menerima atau Menolak tugas.",
    icon: Clock,
  },
  {
    stepNo: 5,
    id: "WAITING_SCHEDULE",
    shortLabel: "Jadwal Servis",
    title: "Kunjungan Terjadwal / Siap Berangkat",
    descriptionCustomer: "Penugasan teknisi terkonfirmasi. Teknisi akan berangkat pada jadwal yang ditentukan.",
    descriptionProvider: "Teknisi telah siap. Menunggu waktu keberangkatan sesuai slot jadwal.",
    descriptionWorker: "Jadwal kunjungan telah terkonfirmasi. Bersiap berangkat ke lokasi hunian pelanggan.",
    icon: HourglassMedium,
  },
  {
    stepNo: 6,
    id: "WORKER_OTW",
    shortLabel: "Teknisi OTW",
    title: "Teknisi Menuju Lokasi",
    descriptionCustomer: "Teknisi sedang dalam perjalanan menuju ke alamat hunian Anda.",
    descriptionProvider: "Teknisi sedang dalam perjalanan (OTW) menuju lokasi pelanggan.",
    descriptionWorker: "Anda sedang dalam perjalanan ke lokasi pelanggan. Berkendaralah dengan aman.",
    icon: Truck,
  },
  {
    stepNo: 7,
    id: "WORKER_ARRIVED",
    shortLabel: "Teknisi Tiba",
    title: "Teknisi Tiba di Lokasi",
    descriptionCustomer: "Teknisi telah tiba di lokasi hunian Anda dan bersiap memulai pemeriksaan.",
    descriptionProvider: "Teknisi telah sampai di lokasi hunian pelanggan.",
    descriptionWorker: "Anda telah tiba di lokasi hunian pelanggan. Siapkan peralatan inspeksi unit.",
    icon: MapPin,
  },
  {
    stepNo: 8,
    id: "DIAGNOSIS_IN_PROGRESS",
    shortLabel: "Diagnosa Unit",
    title: "Pemeriksaan & Diagnosa Unit",
    descriptionCustomer: "Teknisi sedang melakukan diagnosa menyeluruh pada unit untuk menentukan penyebab kendala.",
    descriptionProvider: "Teknisi sedang menginspeksi fisik unit dan menyusun rincian estimasi perbaikan.",
    descriptionWorker: "Lakukan pengujian fisik, analisa kerusakan, dan isi formulir hasil diagnosa lapangan.",
    icon: Wrench,
  },
  {
    stepNo: 9,
    id: "COST_APPROVAL",
    shortLabel: "Persetujuan Biaya",
    title: "Persetujuan Estimasi Biaya",
    descriptionCustomer: "Silakan tinjau rincian biaya pengerjaan & suku cadang yang diajukan oleh teknisi.",
    descriptionProvider: "Menunggu persetujuan biaya pengerjaan dari pelanggan (di aplikasi atau tatap muka langsung).",
    descriptionWorker: "Menunggu persetujuan rincian biaya oleh pelanggan sebelum perbaikan dapat dimulai.",
    icon: CurrencyCircleDollar,
  },
  {
    stepNo: 10,
    id: "EXECUTION_IN_PROGRESS",
    shortLabel: "Pengerjaan Servis",
    title: "Pelaksanaan Perbaikan Unit",
    descriptionCustomer: "Rincian biaya telah disetujui. Teknisi sedang melakukan tindakan servis dan penggantian part.",
    descriptionProvider: "Persetujuan biaya sah. Teknisi sedang melaksanakan pengerjaan servis di lokasi.",
    descriptionWorker: "Pengerjaan sedang berjalan. Laksanakan tindakan servis terstandar sesuai rincian.",
    icon: Wrench,
  },
  {
    stepNo: 11,
    id: "EXECUTION_FINISHED",
    shortLabel: "Servis Selesai",
    title: "Pengerjaan Servis Selesai",
    descriptionCustomer: "Teknisi telah menyelesaikan perbaikan dan menyerahkan hasil uji fungsi unit.",
    descriptionProvider: "Pekerjaan teknis di lokasi telah tuntas diselesaikan oleh teknisi.",
    descriptionWorker: "Pekerjaan fisik telah selesai. Bukti foto dan hasil pengujian unit telah diunggah.",
    icon: CheckCircle,
  },
  {
    stepNo: 12,
    id: "PAYMENT_EXECUTION",
    shortLabel: "Pelunasan Tagihan",
    title: "Pembayaran Pengerjaan",
    descriptionCustomer: "Silakan selesaikan pelunasan tagihan pengerjaan & suku cadang melalui platform Servio.",
    descriptionProvider: "Menunggu pelanggan menyelesaikan pembayaran tagihan pengerjaan ke rekening escrow penampung.",
    descriptionWorker: "Menunggu konfirmasi pelunasan tagihan pengerjaan oleh pelanggan.",
    icon: CurrencyCircleDollar,
  },
  {
    stepNo: 13,
    id: "VISIT_CLOSED",
    shortLabel: "Kunjungan Ditutup",
    title: "Penutupan Kunjungan Operasional",
    descriptionCustomer: "Pembayaran pengerjaan telah lunas terverifikasi. Teknisi telah menutup kunjungan kerja di lokasi.",
    descriptionProvider: "Kunjungan kerja lapangan telah ditutup oleh teknisi pasca pembayaran terverifikasi.",
    descriptionWorker: "Kunjungan lapangan selesai ditutup. Berikan rekomendasi perawatan berkala kepada pelanggan.",
    icon: HouseLine,
  },
  {
    stepNo: 14,
    id: "COMPLETED",
    shortLabel: "Selesai & Garansi",
    title: "Pesanan Selesai & Garansi Aktif",
    descriptionCustomer: "Pesanan selesai tuntas! Dana diteruskan ke mitra, garansi resmi aktif, dan Anda dapat memberi ulasan.",
    descriptionProvider: "Pesanan selesai sukses (COMPLETED). Dana masuk masa penahanan escrow 120 jam dan garansi aktif.",
    descriptionWorker: "Pekerjaan selesai sukses dan tercatat di riwayat performa kerja teknisi Anda.",
    icon: ShieldCheck,
  },
];

export function resolveCancelledStageIndex(order: ServiceOrder): number {
  if (
    order.providerDecisionStatus === "REJECTED" ||
    order.subStatus === "CANCELLED_PROVIDER_REJECTED" ||
    order.cancellation?.reasonCode === "PROVIDER_UNABLE"
  ) {
    return 1; // Tahap 2: Konfirmasi Toko
  }
  if (order.subStatus === "CANCELLED_DIAGNOSIS_UNPAID") {
    return 0; // Tahap 1: Booking & Survei
  }
  if (
    order.subStatus === "CANCELLED_PRICE_REJECTED" ||
    order.subStatus === "CANCELLED_SPAREPART_UNAVAILABLE" ||
    order.subStatus === "CANCELLED_REMOTE_TIMEOUT"
  ) {
    return 8; // Tahap 9: Persetujuan Biaya
  }
  if (order.subStatus === "CANCELLED_BEFORE_OTW") {
    if (order.assignment?.status === "ACCEPTED") {
      return 4; // Tahap 5: Jadwal Servis
    }
    if (order.assignment?.status === "ASSIGNED") {
      return 3; // Tahap 4: Respons Teknisi
    }
    if (order.providerDecisionStatus === "ACCEPTED") {
      return 2; // Tahap 3: Penugasan Teknisi
    }
    return 1; // Tahap 2: Konfirmasi Toko
  }
  if (order.assignment?.status === "ACCEPTED" || order.subStatus === "WORKER_ACCEPTED") {
    return 4; // Tahap 5: Jadwal Servis
  }
  if (order.assignment?.status === "ASSIGNED" || order.subStatus === "ASSIGNED_PENDING") {
    return 3; // Tahap 4: Respons Teknisi
  }
  if (order.providerDecisionStatus === "ACCEPTED") {
    return 2; // Tahap 3: Penugasan Teknisi
  }
  return 1; // Default ke Tahap 2: Konfirmasi Toko
}

export function resolveCurrentStageIndex(order: ServiceOrder): number {
  const status = (order.status || "") as string;
  const subStatus = (order.subStatus || "") as string;
  const providerDecision = (order.providerDecisionStatus || "") as string;
  const visitStatus = ((order.execution?.visitStatus || order.visit?.status || "") as string);
  const consentType = (order.diagnosis?.consent?.type || "") as string;
  const diagStatus = (order.diagnosis?.status || "") as string;
  const execPayment = order.paymentSummary?.executionPayment;

  // Step 14: Completed & Warranty Active
  if (
    status === "COMPLETED" ||
    subStatus === "COMPLETED_NORMAL" ||
    subStatus === "AUTO_COMPLETED_72H"
  ) {
    return 13; // Tahap 14 (Index 13)
  }

  // Cancelled or Rejected by Provider
  if (
    status === "CANCELLED" ||
    providerDecision === "REJECTED" ||
    subStatus === "CANCELLED_PROVIDER_REJECTED" ||
    subStatus.startsWith("CANCELLED_")
  ) {
    return resolveCancelledStageIndex(order);
  }

  // Step 13: Visit Closed
  if (
    subStatus === "VISIT_CLOSED" ||
    subStatus === "WAITING_WORKER_CLOSE_VISIT" ||
    visitStatus === "PAID_VISIT_ENDED" ||
    visitStatus === "CLOSED" ||
    order.visit?.status === "CLOSED" ||
    order.visit?.status === "PAID_VISIT_ENDED" ||
    (order.execution?.finishedAt && execPayment?.status === "PAID")
  ) {
    return 12; // Tahap 13 (Index 12)
  }

  // Step 12: Payment Execution (Pelunasan Tagihan)
  // ONLY active after execution is finished AND payment is pending/overdue!
  if (
    subStatus === "WAITING_PAYMENT_EXECUTION" ||
    subStatus === "EXECUTION_PENDING" ||
    subStatus === "PAYMENT_OVERDUE" ||
    visitStatus === "WAITING_PAYMENT" ||
    (Boolean(order.execution?.finishedAt) && execPayment && execPayment.status !== "PAID")
  ) {
    return 11; // Tahap 12 (Index 11)
  }

  // Step 11: Execution Finished (Menunggu Konfirmasi QA / Pembayaran)
  if (
    subStatus === "WORKER_FINISHED" ||
    subStatus === "WORK_FINISHED" ||
    subStatus === "EXECUTION_FINISHED" ||
    subStatus === "AWAITING_CUSTOMER_CONFIRMATION" ||
    Boolean(order.execution?.finishedAt)
  ) {
    return 10; // Tahap 11 (Index 10)
  }

  // Step 10: Execution In Progress
  if (
    subStatus === "EXECUTING" ||
    subStatus === "EXECUTION_IN_PROGRESS" ||
    subStatus === "PRICE_APPROVED" ||
    subStatus === "CONSENT_APPROVED" ||
    subStatus === "APPROVED_BY_CUSTOMER" ||
    consentType === "IN_PERSON_RECORDED" ||
    consentType === "REMOTE_APPROVED" ||
    Boolean(order.execution?.startedAt)
  ) {
    return 9; // Tahap 10 (Index 9)
  }

  // Step 9: Cost Approval
  if (
    subStatus === "WAITING_CUSTOMER_CONSENT" ||
    subStatus === "DIAGNOSIS_SUBMITTED" ||
    (diagStatus === "SUBMITTED" && consentType !== "REMOTE_APPROVED" && consentType !== "IN_PERSON_RECORDED")
  ) {
    return 8; // Tahap 9 (Index 8)
  }

  // Step 8: Diagnosis In Progress
  if (
    subStatus === "DIAGNOSING" ||
    subStatus === "DIAGNOSIS_IN_PROGRESS" ||
    visitStatus === "DIAGNOSING" ||
    order.visit?.status === "DIAGNOSING" ||
    (visitStatus === "ARRIVED" && (!diagStatus || diagStatus === "DRAFT"))
  ) {
    return 7; // Tahap 8 (Index 7)
  }

  // Step 7: Worker Arrived
  if (
    subStatus === "WORKER_ARRIVED" ||
    subStatus === "ARRIVED" ||
    visitStatus === "ARRIVED" ||
    order.visit?.status === "ARRIVED"
  ) {
    return 6; // Tahap 7 (Index 6)
  }

  // Step 6: Worker OTW
  if (
    subStatus === "WORKER_OTW" ||
    subStatus === "WORKER_ON_THE_WAY" ||
    subStatus === "OTW" ||
    visitStatus === "ON_THE_WAY" ||
    visitStatus === "OTW" ||
    order.visit?.status === "ON_THE_WAY" ||
    order.visit?.status === "OTW"
  ) {
    return 5; // Tahap 6 (Index 5)
  }

  // Step 5: Waiting Schedule (Worker has accepted assignment)
  if (
    subStatus === "WORKER_ACCEPTED" ||
    (order.assignment && order.assignment.status === "ACCEPTED")
  ) {
    return 4; // Tahap 5 (Index 4)
  }

  // Step 4: Worker Review (Dispatched to technician, awaiting worker response)
  if (
    subStatus === "ASSIGNED" ||
    subStatus === "ASSIGNED_PENDING" ||
    subStatus === "WAITING_WORKER_ACCEPTANCE" ||
    subStatus === "DISPATCHED_WAITING_ACCEPTANCE" ||
    (order.assignment && (order.assignment.status === "ASSIGNED" || (order.assignment.status as string) === "PENDING"))
  ) {
    return 3; // Tahap 4 (Index 3)
  }

  // Step 3: Worker Dispatch (Provider accepted order, now selecting technician)
  if (
    providerDecision === "ACCEPTED" ||
    subStatus === "PROVIDER_ACCEPTED" ||
    subStatus === "PAID_WAITING_DISPATCH"
  ) {
    return 2; // Tahap 3 (Index 2)
  }

  // Step 2: Provider Review (Incoming booking waiting for provider review/decision)
  if (
    providerDecision === "PENDING" ||
    subStatus === "WAITING_PROVIDER_ACCEPTANCE" ||
    subStatus === "UNASSIGNED" ||
    subStatus === "BOOKING_PAID" ||
    status === "BOOKING_PLACED"
  ) {
    return 1; // Tahap 2 (Index 1)
  }

  // Step 1: Initial Booking
  return 0; // Tahap 1 (Index 0)
}

export function ServiceOrderStageBanner({ order, role }: ServiceOrderStageBannerProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [animatedProgress, setAnimatedProgress] = useState<number>(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeNodeRef = useRef<HTMLDivElement>(null);

  const isRejectedByProvider =
    order.providerDecisionStatus === "REJECTED" ||
    order.subStatus === "CANCELLED_PROVIDER_REJECTED" ||
    (order.status === "CANCELLED" && order.cancellation?.cancelledByRole === "PROVIDER");

  const isCancelled =
    order.status === "CANCELLED" ||
    order.providerDecisionStatus === "REJECTED" ||
    order.subStatus === "CANCELLED_PROVIDER_REJECTED";

  const rejectionReason =
    order.cancellation?.reasonDetail ||
    order.providerRejectionReason ||
    (isRejectedByProvider
      ? "Pesanan ditolak oleh mitra penyedia jasa."
      : "Pesanan dibatalkan sesuai kebijakan operasional.");

  const currentStageIndex = resolveCurrentStageIndex(order);
  const currentStage = LIFECYCLE_STAGES[currentStageIndex] || LIFECYCLE_STAGES[0];

  const totalStages = LIFECYCLE_STAGES.length;
  // Progress between center of 1st node (index 0 = 0%) and center of 14th node (index 13 = 100%)
  const targetProgressPercent = totalStages > 1
    ? Math.min(100, (currentStageIndex / (totalStages - 1)) * 100)
    : 0;

  // Contextual description based on role
  const resolvedDescription =
    role === "PROVIDER"
      ? currentStage.descriptionProvider
      : role === "WORKER"
      ? currentStage.descriptionWorker
      : currentStage.descriptionCustomer;

  // Check if today is scheduled date
  const todayStr = new Date().toISOString().split("T")[0];
  const isScheduledFuture =
    order.schedule?.date && order.schedule.date > todayStr && currentStageIndex <= 4;

  const prevExpandedRef = useRef<boolean>(false);

  // Animate the progress line smoothly to active node whenever expanded or when stage updates
  useEffect(() => {
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;

    if (isExpanded) {
      const isJustOpened = !prevExpandedRef.current;
      prevExpandedRef.current = true;

      if (isJustOpened) {
        // Reset progress to 0% initially so animation starts visibly from the left
        setAnimatedProgress(0);
        t1 = setTimeout(() => {
          setAnimatedProgress(targetProgressPercent);
        }, 120);
      } else {
        // Status updated while banner is already open: animate smoothly to the new stage
        setAnimatedProgress(targetProgressPercent);
      }

      // Smoothly center the active node in horizontal scroll container
      t2 = setTimeout(() => {
        if (activeNodeRef.current && scrollContainerRef.current) {
          activeNodeRef.current.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });
        }
      }, isJustOpened ? 350 : 150);
    } else {
      prevExpandedRef.current = false;
      setAnimatedProgress(0);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isExpanded, targetProgressPercent]);

  return (
    <div className={`w-full rounded-2xl bg-white border shadow-servio-xs overflow-hidden transition-all duration-300 ${isCancelled ? "border-rose-200" : "border-slate-200/90"}`}>
      {/* --------------------------------------------------------------------- */}
      {/* 1. TOP COMPACT SUMMARY BANNER (ALWAYS VISIBLE)                         */}
      {/* --------------------------------------------------------------------- */}
      <div
        className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ${
          isCancelled
            ? "bg-gradient-to-r from-rose-50/90 via-red-50/40 to-white border-rose-200/80"
            : "bg-gradient-to-r from-sky-50/70 via-indigo-50/40 to-white border-slate-100"
        }`}
      >
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
              isCancelled
                ? "bg-rose-100 border border-rose-200 text-rose-600"
                : "bg-primary/10 border border-primary/20 text-primary"
            }`}
          >
            {isCancelled ? (
              <XCircle size={22} weight="bold" />
            ) : (
              React.createElement(currentStage.icon, { size: 20, weight: "bold" })
            )}
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isCancelled ? (
                <>
                  <span className="font-mono text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs">
                    {isRejectedByProvider ? "Ditolak Mitra Toko" : "Pesanan Batal"} • Tahap {currentStage.stepNo} dari {totalStages}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    ✓ Refund 100% S-Pay (Rp {(order.serviceSnapshot.diagnosisFee || 50000).toLocaleString("id-ID")})
                  </span>
                </>
              ) : (
                <>
                  <span className="font-mono text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-primary text-white shadow-2xs">
                    Tahap {currentStage.stepNo} dari {totalStages}
                  </span>
                  {isScheduledFuture && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Terjadwal ({order.schedule.date})
                    </span>
                  )}
                  {order.status === "COMPLETED" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Selesai Tuntas
                    </span>
                  )}
                </>
              )}
            </div>
            <h3 className={`text-sm sm:text-base font-black font-display leading-tight truncate ${isCancelled ? "text-rose-950" : "text-slate-900"}`}>
              {isCancelled
                ? isRejectedByProvider
                  ? `Pesanan Ditolak oleh Mitra Toko (${currentStage.title})`
                  : `Pesanan Telah Dibatalkan (${currentStage.title})`
                : currentStage.title}
            </h3>
            <p className={`text-xs leading-relaxed max-w-3xl line-clamp-2 md:line-clamp-none ${isCancelled ? "text-rose-800 font-medium" : "text-slate-600"}`}>
              {isCancelled
                ? `Alasan: "${rejectionReason}". Alur pengerjaan resmi terhenti di Tahap ${currentStage.stepNo} (${currentStage.shortLabel}) dan dana survei telah dikembalikan utuh ke saldo S-Pay.`
                : resolvedDescription}
            </p>
          </div>
        </div>

        {/* Right Toggle Button */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-2xs cursor-pointer group"
          >
            <span>{isExpanded ? "Tutup Alur Pesanan" : "Tampilkan Seluruh Alur Pesanan"}</span>
            {isExpanded ? (
              <CaretUp size={14} weight="bold" className="text-slate-500 group-hover:-translate-y-0.5 transition-transform" />
            ) : (
              <CaretDown size={14} weight="bold" className="text-slate-500 group-hover:translate-y-0.5 transition-transform" />
            )}
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. EXPANDABLE ANIMATED 14-STAGE PROGRESS ROADMAP (HORIZONTAL SCROLL)    */}
      {/* --------------------------------------------------------------------- */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isExpanded ? "max-h-[950px] opacity-100 p-4 sm:p-6 bg-slate-50/60" : "max-h-0 opacity-0 p-0"
        }`}
      >
        <div className="space-y-4">
          {/* Header Roadmap Clean */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200/70">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ring-2 ${
                  isCancelled ? "bg-rose-600 ring-rose-200" : "bg-[#0F4C81] ring-sky-200"
                }`}
              />
              <h4 className="font-display font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
                {isCancelled
                  ? `Alur Perjalanan Pesanan Jasa (Terhenti di Tahap ${currentStage.stepNo}: ${currentStage.shortLabel})`
                  : "Alur Perjalanan Pesanan Jasa (14 Tahapan Terstandarisasi)"}
              </h4>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500">Progres Alur:</span>
              <span
                className={`font-extrabold px-2.5 py-0.5 rounded-full border ${
                  isCancelled
                    ? "text-rose-700 bg-rose-100 border-rose-300"
                    : "text-[#0F4C81] bg-sky-100/80 border-[#0F4C81]/20"
                }`}
              >
                {isCancelled
                  ? `Terhenti di Tahap ${currentStage.stepNo} / ${totalStages}`
                  : `${Math.round(targetProgressPercent)}% (${currentStage.stepNo} / ${totalStages} Tahapan)`}
              </span>
            </div>
          </div>

          {/* Stepper Card with Comfortable Horizontal Scroll (Bebas Dempet) */}
          <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 relative">
            {/* Rejection / Cancellation Notice Banner */}
            {isCancelled && (
              <div className="mb-3.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3 shadow-3xs">
                <div className="flex items-center gap-2.5">
                  <XCircle size={20} weight="fill" className="text-rose-600 shrink-0" />
                  <span className="leading-snug">
                    <strong className="font-bold">Pesanan Dihentikan:</strong> {isRejectedByProvider ? "Mitra toko menolak pesanan pada tahap ini." : "Pesanan dibatalkan pada tahap ini."} Alasan: &ldquo;{rejectionReason}&rdquo;. Dana survei sebesar Rp {(order.serviceSnapshot.diagnosisFee || 50000).toLocaleString("id-ID")} telah dikembalikan 100% ke akun S-Pay pelanggan.
                  </span>
                </div>
              </div>
            )}

            {/* Scroll Hint & Focus Quick Action */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3 px-1">
              <span className="font-medium text-slate-500 flex items-center gap-1.5">
                <span className="text-slate-400">↔</span>
                <span>Geser ke samping untuk meninjau seluruh 14 tahapan siklus pengerjaan</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  activeNodeRef.current?.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest",
                  });
                }}
                className={`hover:underline font-bold cursor-pointer text-[11px] ${
                  isCancelled ? "text-rose-700" : "text-[#0F4C81]"
                }`}
              >
                {isCancelled ? "Fokus ke Tahap Penolakan" : "Fokus ke Tahap Aktif"}
              </button>
            </div>

            {/* Horizontal Scroll Track Container */}
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto pb-4 pt-3 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 scroll-smooth"
            >
              <div className="min-w-[1460px] relative px-2 select-none">
                {/* Track Line Container: Spans exactly from center of Node 0 to center of Node 13 */}
                <div
                  className="absolute top-[28px] h-1.5 z-0"
                  style={{
                    left: "calc(100% / 28)",
                    right: "calc(100% / 28)",
                  }}
                >
                  {/* Background Track Line */}
                  <div className="w-full h-full bg-slate-200/80 rounded-full" />

                  {/* Active Animated Progress Line */}
                  <div
                    className="absolute top-0 left-0 h-full rounded-full shadow-xs overflow-visible"
                    style={{
                      width: `${animatedProgress}%`,
                      transitionProperty: "width",
                      transitionDuration: "1350ms",
                      transitionTimingFunction: "cubic-bezier(0.25, 0.8, 0.25, 1)",
                      background: isCancelled
                        ? "linear-gradient(90deg, #10b981 0%, #f59e0b 60%, #e11d48 100%)"
                        : "linear-gradient(90deg, #10b981 0%, #0F4C81 70%, #2563eb 100%)",
                    }}
                  >
                    {/* Glowing Leading Head Pulser */}
                    {animatedProgress > 0 && (
                      <span
                        className={`absolute -right-2 -top-[5px] w-4 h-4 bg-white rounded-full border-2 shadow-sm flex items-center justify-center ${
                          isCancelled
                            ? "border-rose-600 shadow-[0_0_12px_rgba(225,29,72,0.9)]"
                            : "border-primary shadow-[0_0_12px_rgba(15,76,129,0.9)]"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full animate-ping ${
                            isCancelled ? "bg-rose-600" : "bg-primary"
                          }`}
                        />
                      </span>
                    )}
                  </div>
                </div>

                {/* Stepper Nodes Flex Row (Spacious & Lega: min-w-[96px] per Node) */}
                <div className="flex items-start justify-between relative z-10 gap-1">
                  {LIFECYCLE_STAGES.map((st, idx) => {
                    const isPassed = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    const isFuture = idx > currentStageIndex;

                    return (
                      <div
                        key={st.id}
                        ref={isCurrent ? activeNodeRef : undefined}
                        className={`flex-1 min-w-[96px] max-w-[108px] flex flex-col items-center text-center p-2.5 rounded-2xl transition-all duration-300 ${
                          isCurrent
                            ? isCancelled
                              ? "bg-rose-50/95 border-2 border-rose-600 ring-4 ring-rose-500/20 shadow-md scale-105"
                              : "bg-sky-50/90 border-2 border-[#0F4C81] ring-4 ring-[#0F4C81]/15 shadow-md scale-105"
                            : isPassed
                            ? "bg-emerald-50/40 border border-emerald-100/90 hover:bg-emerald-50/70"
                            : "bg-slate-50/40 border border-slate-100 opacity-50"
                        }`}
                      >
                        {/* Circle Node Indicator */}
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-2xs mb-2 ${
                            isPassed
                              ? "bg-emerald-600 text-white"
                              : isCurrent
                              ? isCancelled
                                ? "bg-rose-600 text-white ring-4 ring-rose-500/25 shadow-sm"
                                : "bg-[#0F4C81] text-white ring-4 ring-[#0F4C81]/25 shadow-sm"
                              : "bg-slate-200 text-slate-400 border border-slate-300/60"
                          }`}
                        >
                          {isPassed ? (
                            <CheckCircle size={18} weight="bold" />
                          ) : isCurrent && isCancelled ? (
                            <XCircle size={18} weight="bold" />
                          ) : (
                            <span className={`font-mono text-xs ${isCancelled && isFuture ? "line-through opacity-60" : ""}`}>
                              {st.stepNo}
                            </span>
                          )}
                        </div>

                        {/* Step Short Label */}
                        <span
                          className={`text-[11px] font-bold leading-tight h-8 flex items-center justify-center line-clamp-2 px-1 ${
                            isCurrent
                              ? isCancelled
                                ? "text-rose-900 font-black"
                                : "text-[#0F4C81] font-black"
                              : isPassed
                              ? "text-slate-800"
                              : isCancelled
                              ? "text-slate-400 line-through opacity-70"
                              : "text-slate-500"
                          }`}
                        >
                          {st.shortLabel}
                        </span>

                        {/* Status Pill Badge */}
                        <span className="mt-2 text-[9px] font-mono uppercase tracking-wider block">
                          {isPassed ? (
                            <span className="text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                              Tuntas
                            </span>
                          ) : isCurrent ? (
                            isCancelled ? (
                              <span className="text-rose-800 font-extrabold bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300 shadow-2xs">
                                {isRejectedByProvider ? "Ditolak" : "Batal"}
                              </span>
                            ) : (
                              <span className="text-[#0F4C81] font-black bg-white px-2.5 py-0.5 rounded-full border border-[#0F4C81]/40 shadow-2xs animate-pulse">
                                Aktif
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                              {isCancelled ? "Batal" : "Nanti"}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Current Stage Context Callout */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isCancelled ? "bg-rose-500 animate-ping" : "bg-emerald-500 animate-ping"
                }`}
              />
              <span className="font-medium text-slate-700">
                {isCancelled ? (
                  <>
                    Status Pesanan: <strong className="text-rose-800 font-bold">{isRejectedByProvider ? "Ditolak oleh Mitra Toko" : "Pesanan Dibatalkan"}</strong> (Terhenti di Tahap {currentStage.stepNo}: {currentStage.title})
                  </>
                ) : (
                  <>
                    Tahap Sekarang: <strong className="text-slate-900 font-bold">{currentStage.title}</strong>
                  </>
                )}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 italic">
              {isCancelled
                ? "Pesanan ditutup. Dana diagnosis 100% telah dikembalikan ke saldo S-Pay pelanggan."
                : "Animasi garis berjalan secara otomatis menyesuaikan setiap kali pesanan diperbarui."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
