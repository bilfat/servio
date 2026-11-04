"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import {
  CalendarBlank,
  Clock,
  ArrowRight,
  Plus,
  Wrench,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { useOrderJasa } from "@/features/order-jasa/hooks/useOrderJasa";
import { ServiceOrder } from "@/features/order-jasa/types";

export default function BookingListPage() {
  const router = useRouter();
  const { orders, refresh, isLoading } = useOrderJasa();
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const filtered = useMemo(() => {
    return orders.filter((b) => {
      if (filterStatus === "ALL") return true;
      if (filterStatus === "PENDING_CONFIRMATION") {
        return ["BOOKING_CREATED_UNPAID", "PAID_WAITING_DISPATCH", "ASSIGNED_WAITING_WORKER"].includes(b.status);
      }
      if (filterStatus === "CONFIRMED") {
        return [
          "WORKER_DISPATCHED",
          "WORKER_ARRIVED",
          "DIAGNOSING",
          "DIAGNOSED_WAITING_APPROVAL",
          "EXECUTION_IN_PROGRESS",
          "AWAITING_EXECUTION_PAYMENT",
        ].includes(b.status);
      }
      if (filterStatus === "COMPLETED") {
        return ["COMPLETED", "CLOSED"].includes(b.status);
      }
      return true;
    });
  }, [orders, filterStatus]);

  const formatStatusLabel = (status: string) => {
    switch (status) {
      case "BOOKING_CREATED_UNPAID":
      case "PENDING_PAYMENT":
        return "Menunggu Pembayaran Survei";
      case "PAID_WAITING_DISPATCH":
      case "SCHEDULED":
        return "Terjadwal / Menunggu Mitra";
      case "ASSIGNED_WAITING_WORKER":
        return "Teknisi Ditugaskan";
      case "WORKER_DISPATCHED":
      case "IN_PROGRESS":
        return "Teknisi Menuju Lokasi";
      case "WORKER_ARRIVED":
        return "Teknisi Tiba di Lokasi";
      case "DIAGNOSING":
        return "Pemeriksaan Fisik";
      case "DIAGNOSED_WAITING_APPROVAL":
        return "Menunggu Persetujuan Rincian";
      case "EXECUTION_IN_PROGRESS":
        return "Reparasi / Servis Berjalan";
      case "AWAITING_EXECUTION_PAYMENT":
        return "Menunggu Pelunasan";
      case "COMPLETED":
        return "Selesai";
      case "CLOSED":
        return "Ditutup";
      default:
        return status.startsWith("CANCELLED") ? "Dibatalkan" : status;
    }
  };

  const mapVariant = (status: string) => {
    if (status === "COMPLETED" || status === "CLOSED") return "neutral" as const;
    if (status.startsWith("CANCELLED")) return "error" as const;
    if (
      [
        "WORKER_DISPATCHED",
        "WORKER_ARRIVED",
        "DIAGNOSING",
        "EXECUTION_IN_PROGRESS",
      ].includes(status)
    ) {
      return "success" as const;
    }
    return "warning" as const;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-extrabold text-neutral-dark">
              Daftar Booking Servis Anda
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0F4C81] text-white">
              LIVE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-slate mt-0.5">
            Kelola dan pantau status pesanan dan kunjungan teknisi lapangan ke lokasi Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refresh()}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5 text-xs font-bold"
            title="Sinkronisasi Data"
          >
            <ArrowsClockwise size={15} />
            <span>Sinkron</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/bookings/new")}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-servio-xs shrink-0 cursor-pointer"
          >
            <Plus size={16} weight="bold" />
            <span>Buat Booking Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: "ALL", label: `Semua Booking (${orders.length})` },
          { id: "PENDING_CONFIRMATION", label: "Menunggu Respon" },
          { id: "CONFIRMED", label: "Proses Lapangan" },
          { id: "COMPLETED", label: "Selesai" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterStatus === tab.id
                ? "bg-primary text-white shadow-servio-xs"
                : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Booking Cards Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak Ada Booking"
          description="Anda belum memiliki permohonan booking dengan filter yang dipilih."
          action={
            <button
              type="button"
              onClick={() => router.push("/bookings/new")}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer"
            >
              Mulai Pesan Servis
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((b: ServiceOrder) => (
            <div
              key={b.id}
              onClick={() => router.push(`/orders/${b.id}`)}
              className="glass-card p-5 rounded-2xl border border-slate-200/80 hover:border-primary/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-sky text-primary flex items-center justify-center shrink-0">
                  <Wrench size={22} weight="duotone" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-neutral-muted">#{b.orderNumber}</span>
                    <StatusBadge status={mapVariant(b.status)} label={formatStatusLabel(b.status)} size="sm" />
                  </div>
                  <h3 className="font-display font-bold text-sm text-neutral-dark group-hover:text-primary transition-colors truncate">
                    {b.serviceSnapshot.title}
                  </h3>
                  <p className="text-xs text-neutral-slate">Mitra: {b.providerName || "Bengkel Mitra SERVIO"}</p>
                  <div className="flex items-center gap-3 text-xs text-neutral-muted pt-1">
                    <span className="flex items-center gap-1">
                      <CalendarBlank size={14} /> {b.schedule.date}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> {b.schedule.timeSlot}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="font-mono font-bold text-sm text-primary">
                  Rp {(b.paymentSummary.executionPayment?.amount || b.paymentSummary.diagnosisPayment?.amount || b.serviceSnapshot.basePrice || 0).toLocaleString("id-ID")}
                </span>
                <span className="text-xs font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1 mt-1">
                  <span>Lihat Detail</span>
                  <ArrowRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
