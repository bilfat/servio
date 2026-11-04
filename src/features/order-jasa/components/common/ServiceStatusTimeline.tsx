"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Clock,
  Wrench,
  CreditCard,
  User,
  ShieldCheck,
  MapPin,
  FileText,
  CaretDown,
  CaretUp,
  XCircle,
  Buildings,
  CheckCircle,
} from "@phosphor-icons/react";
import { ServiceOrder, ServiceOrderTimelineEvent } from "../../types";

interface ServiceStatusTimelineProps {
  order: ServiceOrder;
}

interface StepDefinition {
  id: number;
  key: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const LIFECYCLE_STEPS: StepDefinition[] = [
  {
    id: 1,
    key: "BOOKING_CREATED",
    title: "Permohonan Booking Masuk",
    description: "Pesanan berhasil dibuat dan tercatat di antrean sistem Servio",
    icon: FileText,
  },
  {
    id: 2,
    key: "DIAGNOSIS_PAYMENT",
    title: "Pembayaran Biaya Diagnosis",
    description: "Biaya survei awal ditampung aman oleh sistem penampung resmi",
    icon: CreditCard,
  },
  {
    id: 3,
    key: "WORKER_ASSIGNED",
    title: "Penugasan Teknisi Resmi",
    description: "Mitra memilih teknisi dan teknisi mengonfirmasi kesiapan penugasan",
    icon: User,
  },
  {
    id: 4,
    key: "WORKER_TRIP",
    title: "Perjalanan & Tiba di Lokasi",
    description: "Teknisi bergerak menuju alamat pengerjaan dan tiba di lokasi",
    icon: MapPin,
  },
  {
    id: 5,
    key: "DIAGNOSIS_AND_CONSENT",
    title: "Pemeriksaan Kerusakan & Rincian Biaya",
    description: "Diagnosa unit di lokasi dan persetujuan rincian biaya pengerjaan",
    icon: Wrench,
  },
  {
    id: 6,
    key: "EXECUTION",
    title: "Pengerjaan & Pengujian Unit",
    description: "Tindakan perbaikan dilakukan teknisi dan hasil pekerjaan diuji coba",
    icon: CheckCircle,
  },
  {
    id: 7,
    key: "EXECUTION_PAYMENT",
    title: "Pelunasan Pembayaran",
    description: "Pelunasan biaya perbaikan lanjutan diverifikasi sistem",
    icon: CreditCard,
  },
  {
    id: 8,
    key: "COMPLETED",
    title: "Pesanan Selesai & Garansi Aktif",
    description: "Seluruh pekerjaan tuntas dan dilindungi garansi 30 hari Servio",
    icon: ShieldCheck,
  },
];

export function ServiceStatusTimeline({ order }: ServiceStatusTimelineProps) {
  const [showLogDetails, setShowLogDetails] = useState(false);

  const diagPayment = order.paymentSummary.diagnosisPayment;
  const execPayment = order.paymentSummary.executionPayment;
  const isCancelled = order.status === "CANCELLED";
  const subStatus = order.subStatus;

  // Determine current active step (1 to 8)
  let activeStepId = 1;

  if (order.status === "COMPLETED") {
    activeStepId = 8;
  } else if (isCancelled) {
    if (subStatus === "CANCELLED_DIAGNOSIS_UNPAID") activeStepId = 2;
    else if (subStatus === "CANCELLED_BEFORE_OTW") activeStepId = 3;
    else if (subStatus === "CANCELLED_PRICE_REJECTED" || subStatus === "CANCELLED_SPAREPART_UNAVAILABLE" || subStatus === "CANCELLED_REMOTE_TIMEOUT") activeStepId = 5;
    else activeStepId = 4;
  } else {
    // Normal progress
    if (subStatus === "DIAGNOSIS_PENDING") {
      activeStepId = 2;
    } else if (subStatus === "UNASSIGNED" || subStatus === "ASSIGNED_PENDING") {
      activeStepId = 3;
    } else if (subStatus === "WORKER_ACCEPTED" || subStatus === "WORKER_OTW") {
      activeStepId = 4;
    } else if (
      subStatus === "WORKER_ARRIVED" ||
      subStatus === "DIAGNOSING" ||
      subStatus === "WAITING_CUSTOMER_CONSENT" ||
      subStatus === "IN_PERSON_CONSENT_RECORDED" ||
      subStatus === "RESCHEDULE_PROPOSED"
    ) {
      activeStepId = 5;
    } else if (subStatus === "EXECUTING") {
      activeStepId = 6;
    } else if (
      subStatus === "WORK_FINISHED" ||
      subStatus === "EXECUTION_PENDING" ||
      subStatus === "PAYMENT_OVERDUE"
    ) {
      activeStepId = 7;
    } else if (subStatus === "AWAITING_CUSTOMER_CONFIRMATION") {
      activeStepId = 8;
    } else if (subStatus === "COMPLETED_NORMAL" || subStatus === "AUTO_COMPLETED_72H") {
      activeStepId = 8;
    }
  }

  // Calculate percentage height for the vertical animated bar
  // There are 8 steps total (indices 0 to 7)
  const totalSteps = LIFECYCLE_STEPS.length;
  const activeIndex = Math.max(0, Math.min(totalSteps - 1, activeStepId - 1));
  const progressHeightPercent = order.status === "COMPLETED" 
    ? 100 
    : Math.round((activeIndex / (totalSteps - 1)) * 100);

  const getActorBadge = (role: string) => {
    switch (role) {
      case "CUSTOMER":
        return { label: "Pelanggan", color: "bg-blue-50 text-blue-800 border-blue-200" };
      case "WORKER":
        return { label: "Teknisi", color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "PROVIDER":
        return { label: "Bengkel / Provider", color: "bg-purple-50 text-purple-800 border-purple-200" };
      case "FINANCE":
        return { label: "Finance Ops", color: "bg-amber-50 text-amber-800 border-amber-200" };
      case "SYSTEM":
        return { label: "Sistem Servio", color: "bg-slate-100 text-slate-700 border-slate-200" };
      default:
        return { label: role, color: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-xs p-5 sm:p-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Alur Perjalanan Pesanan
          </span>
          <h3 className="text-base font-bold font-display text-slate-900 mt-0.5">
            Riwayat Status &amp; Tahapan Pelaksanaan Jasa
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {isCancelled ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
              <XCircle size={15} weight="fill" />
              <span>Pesanan Dibatalkan</span>
            </span>
          ) : order.status === "COMPLETED" ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle size={15} weight="fill" />
              <span>Semua Tahap Tuntas</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-primary border border-sky-200 flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>Tahap {activeStepId} dari 8 Aktif</span>
            </span>
          )}
        </div>
      </div>

      {/* Animated Vertical Stepper Container */}
      <div className="relative pl-3 sm:pl-4 py-2">
        {/* Full Track Grey Line */}
        <div className="absolute left-[26px] sm:left-[30px] top-6 bottom-6 w-0.5 bg-slate-200" />

        {/* Animated Active Progress Line (Grows smoothly from top to current active step) */}
        <motion.div
          className={`absolute left-[26px] sm:left-[30px] top-6 w-0.5 rounded-full z-10 ${
            isCancelled
              ? "bg-gradient-to-b from-emerald-500 via-amber-500 to-rose-500"
              : "bg-gradient-to-b from-emerald-500 via-primary to-primary"
          }`}
          initial={{ height: "0%" }}
          animate={{ height: `${progressHeightPercent}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Milestone Steps */}
        <div className="space-y-6 sm:space-y-7 relative z-20">
          {LIFECYCLE_STEPS.map((step) => {
            const isCompleted = order.status === "COMPLETED" || step.id < activeStepId;
            const isCurrent = step.id === activeStepId && !isCancelled && order.status !== "COMPLETED";
            const isStepCancelled = isCancelled && step.id === activeStepId;
            const isUpcoming = step.id > activeStepId;
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex items-start gap-3.5 sm:gap-4 relative group">
                {/* Node Icon Box */}
                <div className="shrink-0 pt-0.5">
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs ring-4 ring-emerald-50"
                      title={`${step.title} — Selesai`}
                    >
                      <Check size={18} weight="bold" />
                    </motion.div>
                  ) : isCurrent ? (
                    <div className="relative">
                      {/* Pulsing Glowing Ring */}
                      <span className="absolute -inset-1 rounded-full bg-primary/20 animate-ping" />
                      <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-md ring-4 ring-primary/20">
                        <StepIcon size={18} weight="bold" />
                      </div>
                    </div>
                  ) : isStepCancelled ? (
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs ring-4 ring-rose-50">
                      <XCircle size={18} weight="bold" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border-2 border-slate-200 text-slate-300 flex items-center justify-center">
                      <StepIcon size={16} />
                    </div>
                  )}
                </div>

                {/* Content Box */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <h4
                      className={`text-xs sm:text-sm font-bold font-display transition-colors ${
                        isCompleted
                          ? "text-slate-900"
                          : isCurrent
                          ? "text-primary font-extrabold"
                          : isStepCancelled
                          ? "text-rose-700 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {step.title}
                    </h4>

                    {/* Badge Status */}
                    {isCompleted && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Check size={12} weight="bold" />
                        <span>Selesai</span>
                      </span>
                    )}

                    {isCurrent && (
                      <span className="text-[10px] font-bold text-primary bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 flex items-center gap-1 shadow-3xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span>Sedang Berjalan</span>
                      </span>
                    )}

                    {isStepCancelled && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Dibatalkan di Tahap Ini
                      </span>
                    )}

                    {isUpcoming && (
                      <span className="text-[10px] font-medium text-slate-400">
                        Tahap #{step.id}
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-xs mt-0.5 leading-relaxed ${
                      isCurrent
                        ? "text-slate-700 font-medium"
                        : isCompleted
                        ? "text-slate-500"
                        : "text-slate-400"
                    }`}
                  >
                    {step.description}
                  </p>

                  {/* Contextual Info per Step if Available */}
                  {step.id === 2 && diagPayment && (
                    <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                      <span className="text-slate-500">Biaya Diagnosis:</span>
                      <strong className="font-mono text-slate-800">
                        Rp {diagPayment.amount.toLocaleString("id-ID")}
                      </strong>
                      <span
                        className={`font-bold text-[10px] px-1.5 py-0.2 rounded ${
                          diagPayment.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {diagPayment.status === "PAID" ? "Lunas" : "Belum Bayar"}
                      </span>
                    </div>
                  )}

                  {step.id === 3 && order.assignment && order.assignment.status === "ACCEPTED" && (
                    <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                      <span className="text-slate-500">Teknisi:</span>
                      <strong className="text-slate-800">{order.assignment.workerName}</strong>
                      <span className="text-slate-400">({order.assignment.workerPhone})</span>
                    </div>
                  )}

                  {step.id === 5 && order.diagnosis && (
                    <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                      <span className="text-slate-500">Estimasi Perbaikan:</span>
                      <strong className="font-mono text-primary font-bold">
                        Rp {order.diagnosis.costBreakdown.grandTotal.toLocaleString("id-ID")}
                      </strong>
                      <span className="text-slate-400">
                        ({order.diagnosis.costBreakdown.workItems.length} Pekerjaan, {order.diagnosis.costBreakdown.spareparts.length} Sparepart)
                      </span>
                    </div>
                  )}

                  {step.id === 7 && execPayment && (
                    <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                      <span className="text-slate-500">Tagihan Pelunasan:</span>
                      <strong className="font-mono text-slate-800">
                        Rp {execPayment.amount.toLocaleString("id-ID")}
                      </strong>
                      <span
                        className={`font-bold text-[10px] px-1.5 py-0.2 rounded ${
                          execPayment.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {execPayment.status === "PAID" ? "Lunas" : "Menunggu Bayar"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsible Detailed Audit Log Section */}
      <div className="pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowLogDetails(!showLogDetails)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-primary transition py-1 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <span>Lihat Jejak Waktu &amp; Log Aktivitas Lengkap ({order.timeline.length} Peristiwa)</span>
          </div>
          {showLogDetails ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />}
        </button>

        <AnimatePresence>
          {showLogDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-3 border-t border-slate-100 space-y-4"
            >
              <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {order.timeline.map((evt, idx) => {
                  const actor = getActorBadge(evt.actorRole);
                  return (
                    <div key={evt.id || idx} className="relative group text-xs">
                      {/* Bullet Dot */}
                      <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-400 group-hover:border-primary transition-colors" />

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h5 className="font-bold text-slate-900 leading-tight">
                            {evt.title}
                          </h5>
                          <span className="text-[10px] font-mono text-slate-400">
                            {evt.timestamp}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${actor.color}`}>
                            {actor.label}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">
                            Oleh {evt.actorName}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-snug">
                          {evt.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

