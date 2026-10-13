"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import {
  CalendarBlank,
  Clock,
  MapPin,
  ArrowRight,
  Plus,
  Wrench,
  Funnel,
} from "@phosphor-icons/react";

export default function BookingListPage() {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const mockBookings = [
    {
      id: "book-4091",
      serviceTitle: "Cuci & Perbaikan AC Split Wall",
      providerName: "PT Servio Mandiri Teknik (Bintang Teknik)",
      serviceMode: "HOME_SERVICE",
      scheduledDate: "2026-09-22",
      scheduledTimeSlot: "Pagi (08:00 - 12:00 WIB)",
      status: "PENDING_CONFIRMATION",
      statusLabel: "Menunggu Respon Mitra",
      statusVariant: "warning" as const,
      basePrice: 150000,
    },
    {
      id: "book-3012",
      serviceTitle: "Pemeriksaan MCB & Jalur Stop Kontak",
      providerName: "Bintang Teknik Listrik",
      serviceMode: "HOME_SERVICE",
      scheduledDate: "2026-09-18",
      scheduledTimeSlot: "Siang (13:00 - 16:00 WIB)",
      status: "CONFIRMED",
      statusLabel: "Telah Diterima",
      statusVariant: "success" as const,
      basePrice: 120000,
    },
    {
      id: "book-2109",
      serviceTitle: "Pembersihan Karpet & Sofa Deep Clean",
      providerName: "Kinclong Home Care",
      serviceMode: "HOME_SERVICE",
      scheduledDate: "2026-09-10",
      scheduledTimeSlot: "Pagi (09:00 - 12:00 WIB)",
      status: "COMPLETED",
      statusLabel: "Tuntas Selesai",
      statusVariant: "neutral" as const,
      basePrice: 350000,
    },
  ];

  const filtered = mockBookings.filter((b) => {
    if (filterStatus === "ALL") return true;
    return b.status === filterStatus;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-neutral-dark">
            Daftar Booking Servis Anda
          </h1>
          <p className="text-xs sm:text-sm text-neutral-slate mt-0.5">
            Kelola dan pantau status permohonan kunjungan teknisi ke lokasi Anda.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/bookings/new")}
          className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-servio-xs shrink-0"
        >
          <Plus size={16} weight="bold" />
          <span>Buat Booking Baru</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: "ALL", label: "Semua Booking" },
          { id: "PENDING_CONFIRMATION", label: "Menunggu Respon" },
          { id: "CONFIRMED", label: "Diterima Mitra" },
          { id: "COMPLETED", label: "Selesai" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
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
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
            >
              Mulai Pesan Servis
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div
              key={b.id}
              onClick={() => router.push(`/bookings/${b.id}`)}
              className="glass-card p-5 rounded-2xl border border-slate-200/80 hover:border-primary/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-sky text-primary flex items-center justify-center shrink-0">
                  <Wrench size={22} weight="duotone" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-neutral-muted">{b.id}</span>
                    <StatusBadge status={b.statusVariant} label={b.statusLabel} size="sm" />
                  </div>
                  <h3 className="font-display font-bold text-sm text-neutral-dark group-hover:text-primary transition-colors truncate">
                    {b.serviceTitle}
                  </h3>
                  <p className="text-xs text-neutral-slate">Mitra: {b.providerName}</p>
                  <div className="flex items-center gap-3 text-xs text-neutral-muted pt-1">
                    <span className="flex items-center gap-1">
                      <CalendarBlank size={14} /> {b.scheduledDate}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> {b.scheduledTimeSlot}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span className="font-mono font-bold text-sm text-primary">
                  Rp {b.basePrice.toLocaleString("id-ID")}
                </span>
                <span className="text-xs font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1 mt-1">
                  <span>Detail</span>
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
