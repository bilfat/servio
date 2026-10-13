"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import { CountdownState } from "@/components/feedback/CountdownState";
import { ConfirmationDialog } from "@/components/feedback/ConfirmationDialog";
import {
  CalendarBlank,
  Clock,
  MapPin,
  ChatCircleText,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
} from "@phosphor-icons/react";

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.bookingId as string;

  const [status, setStatus] = useState<"PENDING_CONFIRMATION" | "CONFIRMED" | "CANCELLED">("PENDING_CONFIRMATION");
  const [showCancelModal, setShowCancelModal] = useState(false);

  const mockBooking = {
    id: bookingId || "book-4091",
    serviceTitle: "Cuci & Perbaikan AC Split Wall",
    providerName: "PT Servio Mandiri Teknik (Bintang Teknik)",
    serviceMode: "HOME_SERVICE",
    scheduledDate: "2026-09-22",
    scheduledTimeSlot: "Pagi (08:00 - 12:00 WIB)",
    address: "Jl. Boulevard Raya Blok QF 1 No. 24, Kelapa Gading, Jakarta Utara",
    basePrice: 150000,
    unitDetails: "Daikin Inverter 1 PK - Bocor air menetes dan hembusan angin kurang dingin",
    createdAt: "2026-09-21 09:30 WIB",
  };

  const handleCancelBooking = () => {
    setStatus("CANCELLED");
    setShowCancelModal(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-neutral-muted">ID: {mockBooking.id}</span>
            <StatusBadge
              status={
                status === "CONFIRMED"
                  ? "success"
                  : status === "CANCELLED"
                  ? "error"
                  : "warning"
              }
              label={
                status === "CONFIRMED"
                  ? "Booking Diterima Mitra"
                  : status === "CANCELLED"
                  ? "Dibatalkan"
                  : "Menunggu Konfirmasi Mitra"
              }
            />
          </div>
          <h1 className="text-2xl font-display font-bold text-neutral-dark mt-1">
            Detail Pemesanan Servis
          </h1>
        </div>

        <Link
          href="/bookings"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Lihat Semua Booking
        </Link>
      </div>

      {/* Expiry Countdown when Pending */}
      {status === "PENDING_CONFIRMATION" && (
        <div className="glass-card p-5 rounded-3xl border border-amber-200 bg-amber-50/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <Clock size={16} weight="fill" className="text-amber-600" />
            <span>Batas Waktu Respon Mitra Penyedia Jasa</span>
          </div>
          <p className="text-xs text-neutral-dark leading-relaxed">
            Mitra memiliki waktu 60 menit untuk menugaskan teknisi atau mengonfirmasi jadwal kunjungan Anda. Jika melebihi batas waktu, sistem otomatis mencarikan alternatif teknisi terbaik terdekat.
          </p>
          <CountdownState initialSeconds={3600} label="Sisa Waktu Respon Mitra" />
        </div>
      )}

      {/* Main Booking Summary Card */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-servio-sm bg-white space-y-6">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-display font-bold text-lg text-neutral-dark">
              {mockBooking.serviceTitle}
            </h2>
            <p className="text-xs text-neutral-slate mt-0.5">
              Mitra: <strong className="text-neutral-dark">{mockBooking.providerName}</strong>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-neutral-muted block">Biaya Jasa Dasar</span>
            <span className="font-mono font-bold text-base text-primary">
              Rp {mockBooking.basePrice.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* Schedule & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-neutral-dark">
              <CalendarBlank size={16} className="text-primary" />
              <span>Jadwal Kedatangan</span>
            </div>
            <p className="text-neutral-slate pt-1">{mockBooking.scheduledDate}</p>
            <p className="text-neutral-slate font-medium">{mockBooking.scheduledTimeSlot}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-neutral-dark">
              <MapPin size={16} className="text-rose-500" />
              <span>Alamat Kunjungan (Home Service)</span>
            </div>
            <p className="text-neutral-slate pt-1 leading-relaxed">{mockBooking.address}</p>
          </div>
        </div>

        {/* Unit & Problem Details */}
        <div className="p-4 rounded-2xl bg-slate-50 space-y-1.5 text-xs">
          <span className="font-bold text-neutral-dark">Keluhan / Catatan Unit:</span>
          <p className="text-neutral-slate leading-relaxed">{mockBooking.unitDetails}</p>
        </div>

        {/* Escrow Guarantee Notice */}
        <div className="p-4 rounded-2xl bg-sky/30 border border-sky-200 flex items-start gap-3 text-xs text-neutral-dark">
          <ShieldCheck size={20} weight="fill" className="text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Pembayaran belum ditagihkan sekarang. Tagihan resmi diterbitkan saat teknisi tiba dan menyepakati rincian perbaikan di lokasi Anda.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 flex-wrap">
          <button
            type="button"
            onClick={() => router.push(`/chat/conv-01`)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-neutral-dark text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <ChatCircleText size={16} weight="bold" />
            <span>Chat Mitra</span>
          </button>

          {status === "PENDING_CONFIRMATION" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
              >
                Batalkan Booking
              </button>
              <button
                type="button"
                onClick={() => setStatus("CONFIRMED")}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-servio-xs"
              >
                <CheckCircle size={16} weight="fill" />
                <span>Simulasi Diterima Mitra</span>
              </button>
            </div>
          )}

          {status === "CONFIRMED" && (
            <button
              type="button"
              onClick={() => router.push("/orders/ord-normal-progress")}
              className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-servio-xs"
            >
              <span>Buka Order Pengerjaan</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showCancelModal}
        title="Batalkan Booking Ini?"
        message="Anda dapat membatalkan pemesanan ini tanpa biaya sebelum teknisi dikonfirmasi dan diberangkatkan."
        confirmLabel="Ya, Batalkan"
        cancelLabel="Kembali"
        intent="danger"
        onConfirm={handleCancelBooking}
        onClose={() => setShowCancelModal(false)}
      />
    </div>
  );
}
