"use client";

import React from "react";
import {
  X,
  Clock,
  CheckCircle,
  XCircle,
  WarningCircle,
  CreditCard,
  User,
  Wrench,
  ShieldCheck,
  Buildings,
  MapPin,
  FileText,
  Info,
} from "@phosphor-icons/react";
import { ServiceOrder, ServiceOrderTimelineEvent } from "../../types";

export interface OrderActivityHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder;
}

export function OrderActivityHistoryModal({
  isOpen,
  onClose,
  order,
}: OrderActivityHistoryModalProps) {
  if (!isOpen) return null;

  const events: ServiceOrderTimelineEvent[] = order.timeline || [];

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return { date: "-", time: "-" };
    try {
      const d = new Date(isoString);
      const date = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
      const time = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d) + " WIB";
      return { date, time };
    } catch {
      return { date: isoString, time: "" };
    }
  };

  const getActorBadge = (role?: string) => {
    switch (role) {
      case "CUSTOMER":
        return { label: "Pelanggan", color: "bg-blue-50 text-blue-800 border-blue-200" };
      case "WORKER":
        return { label: "Teknisi", color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "PROVIDER":
        return { label: "Bengkel / Mitra", color: "bg-purple-50 text-purple-800 border-purple-200" };
      case "FINANCE":
        return { label: "Finance Ops", color: "bg-amber-50 text-amber-800 border-amber-200" };
      case "SYSTEM":
        return { label: "Sistem", color: "bg-slate-100 text-slate-700 border-slate-200" };
      default:
        return { label: role || "Sistem", color: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  const getEventIcon = (type?: string) => {
    const t = (type || "").toUpperCase();
    if (t.includes("PAID") || t.includes("PAYMENT")) {
      return <CreditCard size={15} weight="bold" className="text-amber-600" />;
    }
    if (t.includes("CANCEL") || t.includes("REJECT") || t.includes("FAIL")) {
      return <XCircle size={15} weight="bold" className="text-rose-600" />;
    }
    if (t.includes("COMPLETE") || t.includes("ACCEPT") || t.includes("SUCCESS") || t.includes("CLOSED")) {
      return <CheckCircle size={15} weight="bold" className="text-emerald-600" />;
    }
    if (t.includes("DIAGNOS") || t.includes("WORK") || t.includes("EXECUTE")) {
      return <Wrench size={15} weight="bold" className="text-primary" />;
    }
    if (t.includes("OTW") || t.includes("ARRIV") || t.includes("VISIT")) {
      return <MapPin size={15} weight="bold" className="text-primary" />;
    }
    return <Clock size={15} weight="bold" className="text-slate-500" />;
  };

  // Planned next steps based on current subStatus (Separated clearly as FUTURE PLANNED STEPS, NOT historical events)
  const getUpcomingPlannedSteps = () => {
    const currentSub = order.subStatus;
    if (order.status === "COMPLETED" || order.status === "CANCELLED") {
      return [];
    }

    const steps = [];

    // If still in pre-diagnosis
    if (currentSub === "DIAGNOSIS_PENDING") {
      steps.push("Verifikasi Pembayaran Biaya Diagnosis oleh Finance 06");
      steps.push("Peninjauan & Konfirmasi Penerimaan oleh Mitra Penyedia Jasa");
      steps.push("Penugasan Teknisi Lapangan Bersertifikasi");
    } else if (order.providerDecisionStatus === "PENDING") {
      steps.push("Konfirmasi Penerimaan Order oleh Mitra Jasa");
      steps.push("Penugasan Teknisi Lapangan Bersertifikasi");
    } else if (!order.assignment || order.assignment.status === "REJECTED") {
      steps.push("Penugasan Teknisi Lapangan Bersertifikasi");
      steps.push("Kunjungan ke Alamat Pelanggan sesuai Jadwal");
    } else if (order.assignment.status === "ASSIGNED") {
      steps.push("Konfirmasi Kesiapan Keberangkatan oleh Teknisi");
      steps.push("Perjalanan Menuju Lokasi Kunjungan");
    } else if (currentSub === "WORKER_ACCEPTED" || currentSub === "ASSIGNED_PENDING") {
      steps.push("Keberangkatan Teknisi Menuju Lokasi Kunjungan");
      steps.push("Investigasi Kerusakan & Pengajuan Estimasi Biaya");
    } else if (currentSub === "WORKER_OTW" || currentSub === "WORKER_ARRIVED") {
      steps.push("Pemeriksaan Kerusakan Unit di Lokasi");
      steps.push("Persetujuan Estimasi Biaya oleh Pelanggan");
      steps.push("Pengerjaan Fisik & Pengujian Fungsi");
    } else if (currentSub === "DIAGNOSING" || currentSub === "WAITING_CUSTOMER_CONSENT") {
      steps.push("Persetujuan Rincian Biaya oleh Pelanggan");
      steps.push("Pengerjaan Fisik & Pengujian Hasil Kerja");
      steps.push("Penerbitan Invoice Pelunasan & Pembayaran");
    } else if (currentSub === "PRICE_APPROVED" || currentSub === "EXECUTING") {
      steps.push("Penyelesaian Pengerjaan Fisik & Laporan Dokumentasi");
      steps.push("Pelunasan Biaya Pengerjaan ke Rekening Escrow");
      steps.push("Penutupan Kunjungan Fisik oleh Teknisi");
    } else if (currentSub === "WORK_FINISHED" || currentSub === "EXECUTION_PENDING" || currentSub === "PAYMENT_OVERDUE") {
      steps.push("Pelunasan Tagihan Pengerjaan oleh Pelanggan");
      steps.push("Teknisi Merapikan Area & Menutup Kunjungan");
      steps.push("Konfirmasi Tuntas Pelanggan & Pengaktifan Garansi");
    } else if (currentSub === "WAITING_WORKER_CLOSE_VISIT") {
      steps.push("Penutupan Kunjungan Fisik oleh Teknisi");
      steps.push("Konfirmasi Tuntas Pelanggan & Pengaktifan Garansi");
    } else if (currentSub === "VISIT_CLOSED" || currentSub === "AWAITING_CUSTOMER_CONFIRMATION") {
      steps.push("Konfirmasi Pekerjaan Tuntas oleh Pelanggan");
      steps.push("Masa Tahan Escrow 120 Jam & Pengaktifan Garansi");
    }

    return steps;
  };

  const upcomingSteps = getUpcomingPlannedSteps();

  return (
    <div className="fixed inset-0 z-50 bg-neutral-dark/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-servio-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-body text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Clock size={20} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-neutral-dark font-display">
                  Riwayat Aktivitas &amp; Log Pesanan
                </h3>
                <span className="font-mono text-xs font-bold text-primary bg-sky/30 border border-primary/20 px-2 py-0.5 rounded-md">
                  #{order.orderNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Daftar rekaman kejadian aktual yang telah terverifikasi tercatat di sistem SERVIO
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* SECTION 1: EVENT HISTORIS YANG SUDAH TERJADI */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h4 className="text-xs font-bold font-display uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                <span>Aktivitas Terverifikasi ({events.length} Catatan)</span>
              </h4>
              <span className="text-[10px] text-slate-400">Diurutkan kronologis</span>
            </div>

            {events.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500">
                Belum ada aktivitas tercatat untuk pesanan ini.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {events.map((evt, idx) => {
                  const actor = getActorBadge(evt.actorRole);
                  const { date, time } = formatTimestamp(evt.timestamp);

                  return (
                    <div key={evt.id || idx} className="relative group">
                      {/* Node Icon */}
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center group-hover:border-primary transition-colors shadow-2xs">
                        {getEventIcon(evt.type)}
                      </div>

                      {/* Card Content */}
                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-3xs hover:border-primary/40 transition-colors space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h5 className="text-xs font-bold text-slate-900 leading-snug">
                            {evt.title || evt.type.replace(/_/g, " ")}
                          </h5>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${actor.color}`}>
                              {actor.label}
                            </span>
                          </div>
                        </div>

                        {evt.description && (
                          <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                            {evt.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                          <span>{date}</span>
                          <span>•</span>
                          <span>{time}</span>
                          {evt.actorName && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500">Oleh: {evt.actorName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: RENCANA ALUR BERIKUTNYA (TERPISAH & JELAS SEBAGAI FUTURE PLANNED STEPS) */}
          {upcomingSteps.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2">
                <Info size={14} weight="bold" className="text-primary shrink-0" />
                <h5 className="text-xs font-bold text-slate-800">
                  Rencana Alur Berikutnya (Tahapan Masa Depan)
                </h5>
              </div>
              <p className="text-[11px] text-slate-500">
                Langkah-langkah berikut dijadwalkan berjalan setelah kondisi saat ini terpenuhi:
              </p>
              <div className="space-y-1.5 pt-1">
                {upcomingSteps.map((step, sIdx) => (
                  <div key={sIdx} className="flex items-start gap-2 text-[11px] text-slate-700">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                      {sIdx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs cursor-pointer"
          >
            Tutup Riwayat
          </button>
        </div>
      </div>
    </div>
  );
}

