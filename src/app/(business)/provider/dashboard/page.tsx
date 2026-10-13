"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ClipboardText,
  ClockCountdown,
  ArrowRight,
  Storefront,
  WarningCircle,
  ShieldCheck,
  Wrench,
  Users,
  CheckCircle,
  CurrencyCircleDollar,
  Package,
  FileText,
  MagnifyingGlass,
  SlidersHorizontal,
  Handshake,
  Timer,
  Warning,
  HourglassMedium,
  CheckSquareOffset,
} from "@phosphor-icons/react";
import { useProviderOperations } from "@/features/provider/useProviderOperations";
import { useServiceOrder } from "@/features/orders/useServiceOrder";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { Toast } from "@/components/feedback/Toast";

export default function ProviderDashboardPage() {
  const { storeStatus, updateStoreStatus, workers, affiliateSummary } = useProviderOperations();
  const { orders } = useServiceOrder();
  const repo = useDomainRepository();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Authoritative Order Monitoring Metrics (docs/todo.md Section 56C.5, Phase C)
  const activeOrders = orders.filter(
    (o) => !["COMPLETED", "CANCELLED", "REFUNDED"].includes(o.status)
  );
  const waitingDiagnosisCount = orders.filter((o) =>
    ["TECHNICIAN_ARRIVED", "DIAGNOSING"].includes(o.status)
  ).length;
  const waitingPriceAuthCount = orders.filter(
    (o) =>
      o.status === "WAITING_APPROVAL" ||
      o.status === "QUOTATION_REVIEW" ||
      o.priceAdjustment?.providerAuthStatus === "PENDING"
  ).length;
  const inProgressCount = orders.filter((o) => o.status === "IN_PROGRESS").length;
  const waitingSparepartCount = orders.filter(
    (o) => o.status === "WAITING_SPAREPART" || o.sparepartBlockStatus?.isBlocked
  ).length;
  const waitingVerificationCount = orders.filter(
    (o) =>
      o.status === "AWAITING_PROOF_REVIEW" ||
      o.proofOfService?.verificationStatus === "PENDING_PROVIDER_REVIEW"
  ).length;

  const onlineWorkers = workers.filter((w) => w.isOnline);
  const pendingBookings = repo.bookings.filter((b) => b.status === "PENDING_CONFIRMATION");

  // Action Required / Exception Items (docs/todo.md Section 56C.5)
  const actionItems: {
    id: string;
    type: "PRICE_AUTH" | "PROOF_REVIEW" | "SPAREPART_DELAY" | "CUSTOMER_APPROVAL" | "DISPUTE";
    title: string;
    subtitle: string;
    orderId: string;
    badge: string;
    badgeColor: string;
    actionLabel: string;
    actionHref: string;
  }[] = [];

  orders.forEach((o) => {
    // 1. Worker submitted price adjustment requiring Provider authorization
    if (o.priceAdjustment?.requiresProviderAuth && o.priceAdjustment.providerAuthStatus === "PENDING") {
      actionItems.push({
        id: `act-auth-${o.id}`,
        type: "PRICE_AUTH",
        title: `Otorisasi Penyesuaian Biaya Diajukan oleh ${o.assignedWorker?.name || "Teknisi"}`,
        subtitle: `${o.serviceTitle} • Diajukan: Rp ${(o.priceAdjustment.totalAmount).toLocaleString("id-ID")}`,
        orderId: o.id,
        badge: "Otorisasi Diperlukan",
        badgeColor: "bg-amber-100 text-amber-900 border-amber-200",
        actionLabel: "Tinjau & Otorisasi",
        actionHref: `/provider/orders/${o.id}`,
      });
    }

    // 2. Proof of service awaiting Provider QA verification
    if (o.status === "AWAITING_PROOF_REVIEW" || o.proofOfService?.verificationStatus === "PENDING_PROVIDER_REVIEW") {
      actionItems.push({
        id: `act-proof-${o.id}`,
        type: "PROOF_REVIEW",
        title: `Hasil Servis Siap Diverifikasi (Unggahan ${o.assignedWorker?.name || "Teknisi"})`,
        subtitle: `${o.serviceTitle} • ${o.customerName}`,
        orderId: o.id,
        badge: "Verifikasi QA",
        badgeColor: "bg-sky-100 text-sky-900 border-sky-200",
        actionLabel: "Verifikasi Bukti",
        actionHref: `/provider/orders/${o.id}`,
      });
    }

    // 3. Sparepart delivery blocking service
    if (o.status === "WAITING_SPAREPART" || o.sparepartBlockStatus?.isBlocked) {
      actionItems.push({
        id: `act-part-${o.id}`,
        type: "SPAREPART_DELAY",
        title: `Pengerjaan Tertahan Suku Cadang Mitra Toko`,
        subtitle: o.sparepartBlockStatus?.reason || "Menunggu pengiriman komponen rekanan",
        orderId: o.id,
        badge: "Sparepart Partner",
        badgeColor: "bg-purple-100 text-purple-900 border-purple-200",
        actionLabel: "Pantau Status Part",
        actionHref: `/provider/orders/${o.id}`,
      });
    }

    // 4. Dispute or active exception
    if (o.status === "DISPUTED") {
      actionItems.push({
        id: `act-disp-${o.id}`,
        type: "DISPUTE",
        title: `Sengketa Terbuka — Mediasi Tripartite CS Aktif`,
        subtitle: `${o.serviceTitle} • Klien: ${o.customerName}`,
        orderId: o.id,
        badge: "Mediasi CS",
        badgeColor: "bg-rose-100 text-rose-900 border-rose-200",
        actionLabel: "Buka Order Sengketa",
        actionHref: `/provider/orders/${o.id}`,
      });
    }
  });

  const handleStatusChange = (newStatus: "ONLINE_ACCEPTING" | "BUSY_DELAYED" | "TEMPORARY_CLOSED") => {
    updateStoreStatus(newStatus);
    const label =
      newStatus === "ONLINE_ACCEPTING"
        ? "Online (Menerima Pesanan)"
        : newStatus === "BUSY_DELAYED"
        ? "Sibuk (Jadwal Terbatas)"
        : "Tutup Sementara";
    setToastMessage(`Status operasional bengkel diperbarui: ${label}`);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header & Store Status Controls */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Workspace Mitra Bengkel Servio
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
              <ShieldCheck size={14} weight="fill" />
              Pusat Pengawasan Operasional & Komersial
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
            Monitoring Operasional Layanan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantau pergerakan teknisi, penyesuaian biaya paska diagnosis, verifikasi bukti servis, dan antrean perhatian.
          </p>
        </div>

        {/* Operational Status Switcher */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Storefront size={16} className="text-[#0F4C81]" />
              Kesiapan Toko:
            </span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                storeStatus === "ONLINE_ACCEPTING"
                  ? "bg-emerald-500 animate-pulse"
                  : storeStatus === "BUSY_DELAYED"
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleStatusChange("ONLINE_ACCEPTING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                storeStatus === "ONLINE_ACCEPTING"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Online
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("BUSY_DELAYED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                storeStatus === "BUSY_DELAYED"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Sibuk
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("TEMPORARY_CLOSED")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                storeStatus === "TEMPORARY_CLOSED"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* 6 Primary Operational Monitoring KPIs (docs/todo.md Section 56C.5) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ClipboardText size={18} className="text-[#0F4C81]" />
            Metrik Pengawasan Order Lapangan
          </h2>
          <Link
            href="/provider/orders"
            className="text-xs font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
          >
            Buka Order Operasional
            <ArrowRight size={13} weight="bold" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* 1. Order Aktif */}
          <Link
            href="/provider/orders?status=ACTIVE"
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-[#0F4C81] hover:shadow-md transition flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-500">Order Aktif</span>
              <ClipboardText size={16} className="text-[#0F4C81]" />
            </div>
            <div className="my-2">
              <p className="text-2xl font-bold font-display text-slate-900 group-hover:text-[#0F4C81] transition">
                {activeOrders.length}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Dalam penanganan</span>
          </Link>

          {/* 2. Menunggu Diagnosis */}
          <Link
            href="/provider/orders?status=DIAGNOSING"
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-amber-400 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-semibold text-slate-500">Diagnosis</span>
              <Wrench size={16} />
            </div>
            <div className="my-2">
              <p className="text-2xl font-bold font-display text-amber-900">
                {waitingDiagnosisCount}
              </p>
            </div>
            <span className="text-[10px] text-amber-700 font-medium">Teknisi di lokasi</span>
          </Link>

          {/* 3. Menunggu Persetujuan Biaya / Otorisasi */}
          <Link
            href="/provider/orders?status=WAITING_APPROVAL"
            className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm hover:border-amber-500 hover:shadow-md transition flex flex-col justify-between group bg-amber-50/20"
          >
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-[11px] font-semibold text-amber-900">Otorisasi Biaya</span>
              <CurrencyCircleDollar size={16} weight="bold" />
            </div>
            <div className="my-2">
              <p className="text-2xl font-bold font-display text-amber-950">
                {waitingPriceAuthCount}
              </p>
            </div>
            <span className="text-[10px] text-amber-800 font-medium">Butuh review/approval</span>
          </Link>

          {/* 4. Sedang Dikerjakan */}
          <Link
            href="/provider/orders?status=IN_PROGRESS"
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-purple-400 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-[11px] font-semibold text-slate-500">Pengerjaan</span>
              <HourglassMedium size={16} />
            </div>
            <div className="my-2">
              <p className="text-2xl font-bold font-display text-purple-900">
                {inProgressCount}
              </p>
            </div>
            <span className="text-[10px] text-purple-700 font-medium">Eksekusi lapangan</span>
          </Link>

          {/* 5. Menunggu Sparepart */}
          <Link
            href="/provider/orders?status=WAITING_SPAREPART"
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-purple-500 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-purple-700">
              <span className="text-[11px] font-semibold text-slate-500">Suku Cadang</span>
              <Package size={16} />
            </div>
            <div className="my-2">
              <p className="text-2xl font-bold font-display text-slate-900">
                {waitingSparepartCount}
              </p>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Mitra toko rekanan</span>
          </Link>

          {/* 6. Menunggu Verifikasi Bukti */}
          <Link
            href="/provider/orders?status=AWAITING_PROOF_REVIEW"
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-sky-500 hover:shadow-md transition flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-sky-600">
              <span className="text-[11px] font-semibold text-slate-500">Verifikasi QA</span>
              <CheckSquareOffset size={16} />
            </div>
            <div className="my-2">
              <p className="text-2xl font-bold font-display text-slate-900">
                {waitingVerificationCount}
              </p>
            </div>
            <span className="text-[10px] text-sky-700 font-medium">Bukti foto kerja</span>
          </Link>
        </div>
      </div>

      {/* Attention / Action Required Queue (docs/todo.md Section 56C.5) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Warning size={18} weight="bold" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-slate-900">
                Antrean Perhatian & Tindakan Diperlukan (Attention Queue)
              </h2>
              <p className="text-xs text-slate-500">
                Item yang memerlukan aksi manajerial, otorisasi penyesuaian biaya, atau verifikasi kualitas dari Provider.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {actionItems.length} Perlu Respon
          </span>
        </div>

        {actionItems.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 space-y-1">
            <CheckCircle size={24} className="mx-auto text-emerald-500" />
            <p className="font-bold text-slate-700">Semua Order Berjalan Sesuai Rencana</p>
            <p className="text-slate-400">Tidak ada pengajuan otorisasi atau kendala mendesak yang membutuhkan intervensi Provider.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/50 px-2 rounded-xl transition"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-slate-400">{item.orderId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                  <p className="text-slate-500">{item.subtitle}</p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Link
                    href={item.actionHref}
                    className="px-4 py-2 rounded-xl bg-[#0F4C81] text-white hover:bg-[#0d3f6b] text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight size={13} weight="bold" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Section: Booking Queue & Technician Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Pending Booking Requests */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClockCountdown size={18} className="text-amber-600" weight="bold" />
              <h2 className="text-sm font-bold text-slate-900 font-display">
                Antrean Booking Masuk ({pendingBookings.length})
              </h2>
            </div>
            <Link
              href="/provider/bookings"
              className="text-xs font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
            >
              Kelola Antrean
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="space-y-3">
            {pendingBookings.slice(0, 2).map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2.5 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-slate-900">{b.customerName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Sisa: {b.expiresInMinutes} Menit
                    </span>
                  </div>
                  <p className="font-semibold text-slate-700">{b.serviceTitle}</p>
                  <p className="text-slate-500 mt-0.5">{b.address}</p>
                  <p className="text-slate-400 text-[11px] mt-1">Jadwal Permintaan: {b.requestedDate}, {b.requestedTimeSlot}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/70">
                  <Link
                    href={`/provider/bookings`}
                    className="px-3 py-1.5 rounded-xl bg-[#0F4C81] text-white hover:bg-[#0d3f6b] text-xs font-bold transition"
                  >
                    Respon &amp; Tugaskan Teknisi
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Field Technicians on Duty & Partnerships Quick Link */}
        <div className="space-y-6">
          {/* Technicians */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-emerald-600" weight="bold" />
                <h2 className="text-sm font-bold text-slate-900 font-display">
                  Status Teknisi Lapangan ({onlineWorkers.length} / {workers.length} Siaga)
                </h2>
              </div>
              <Link
                href="/provider/workers"
                className="text-xs font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
              >
                Atur Teknisi
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="space-y-2.5">
              {workers.slice(0, 3).map((w) => (
                <div
                  key={w.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-100 text-[#0F4C81] font-bold flex items-center justify-center text-xs">
                      {w.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{w.name}</p>
                      <p className="text-[11px] text-slate-500">Spesialisasi: {w.specialization?.join(", ") || "HVAC Umum"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      w.isOnline ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                    }`}>
                      {w.isOnline ? "Siap Bertugas" : "Offline"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Shortcuts to Partnerships & Verification */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded border border-purple-700">
                  Afiliasi Toko Mitra
                </span>
                <span className="text-xs font-bold text-amber-300">
                  +{affiliateSummary.earnedPoints} Pts Aktif
                </span>
              </div>
              <h3 className="text-base font-bold font-display">
                Kerja Sama Toko Rekanan
              </h3>
              <p className="text-xs text-slate-300">
                Hubungkan bengkel dengan toko resmi. {affiliateSummary.totalOrders} pesanan suku cadang telah terbit dari rekomendasi teknisi.
              </p>
            </div>
            <Link
              href="/provider/partnerships"
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0 transition flex items-center gap-1.5 shadow-md self-start sm:self-auto"
            >
              <Handshake size={16} />
              <span>Kelola Toko &amp; Poin</span>
            </Link>
          </div>
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
