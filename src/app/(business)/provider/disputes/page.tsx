"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  WarningOctagon,
  ShieldWarning,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  MagnifyingGlass,
  Wrench,
  ChatCircleText,
} from "@phosphor-icons/react";
import { MOCK_DISPUTES } from "@/mocks/disputes";

export default function ProviderDisputesListPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDisputes = MOCK_DISPUTES.filter(
    (d) =>
      d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-body text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display text-neutral-dark">
              Pusat Mediasi Sengketa & Klaim Garansi (Disputes)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
              Escrow Protection Active
            </span>
          </div>
          <p className="text-sm text-neutral-slate mt-1">
            Respon klaim komplain pelanggan, ajukan sanggahan teknis berbasis SOP, atau tawarkan perbaikan ulang gratis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
            <Clock size={16} weight="bold" />
            <span>Tenggat Respon Mediasi: 24 Jam Kerja</span>
          </div>
        </div>
      </div>

      {/* Escrow Freeze Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-servio-xs">
        <div className="flex items-center gap-3">
          <ShieldWarning size={28} weight="fill" className="text-amber-600 shrink-0" />
          <div>
            <p className="font-bold text-sm">Status Dana Escrow Selama Sengketa</p>
            <p className="text-amber-800 mt-0.5">
              Dana transaksi ditahan sementara di sistem escrow Servio hingga kesepakatan solusi tercapai antara mitra dan pelanggan.
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-servio-xs flex items-center gap-3">
        <MagnifyingGlass size={18} className="text-slate-400" />
        <input
          type="text"
          placeholder="Cari ID sengketa (#disp-...), nomor order (#ord-...), atau nama konsumen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs border-0 focus:outline-none focus:ring-0 text-neutral-dark"
        />
      </div>

      {/* Dispute Cards Grid */}
      <div className="space-y-4">
        {filteredDisputes.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <CheckCircle size={48} className="mx-auto text-emerald-500 mb-2" />
            <h3 className="font-bold text-sm text-neutral-dark">Tidak Ada Kasus Sengketa Aktif</h3>
            <p className="text-xs text-neutral-slate mt-1">Semua pesanan berjalan baik tanpa komplain terbuka.</p>
          </div>
        ) : (
          filteredDisputes.map((dispute) => (
            <div
              key={dispute.id}
              className="p-5 bg-white rounded-3xl border border-slate-200 shadow-servio-xs hover:shadow-servio transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              {/* Left Info */}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-200">
                    #{dispute.id}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky text-primary font-semibold">
                    Order #{dispute.orderId}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Clock size={12} weight="bold" />
                    DALAM MEDIASI CS
                  </span>
                </div>

                <h3 className="text-base font-bold font-display text-neutral-dark">
                  {dispute.reason}
                </h3>

                <p className="text-xs text-neutral-slate line-clamp-2">
                  &ldquo;{dispute.detailedComplaint}&rdquo;
                </p>

                <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                  <span>Pelanggan: <strong className="text-neutral-dark">{dispute.customerName}</strong></span>
                  <span>•</span>
                  <span>Solusi Diajukan: <strong className="text-primary">{dispute.requestedResolution === "FREE_REWORK" ? "Kunjungan Perbaikan Gratis" : "Refund Dana"}</strong></span>
                </div>
              </div>

              {/* Right Action */}
              <div className="shrink-0 flex items-center gap-3">
                <Link
                  href={`/provider/disputes/${dispute.id}`}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <span>Buka Panel Tanggapan</span>
                  <ArrowRight size={14} weight="bold" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
