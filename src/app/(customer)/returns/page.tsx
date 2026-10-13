"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowsClockwise,
  Plus,
  Package,
  CheckCircle,
  WarningCircle,
  Storefront,
  ArrowRight,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useReturns } from "@/features/returns/useReturns";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function ReturnCenterPage() {
  const { returns, activeReturnsCount } = useReturns();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  Pusat Resolusi Produk
                </span>
              </div>
              <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">
                Pusat Retur & Pengembalian Barang
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Kelola status klaim retur suku cadang, pengiriman balik ke merchant, dan verifikasi refund.
              </p>
            </div>

            <Link
              href="/returns/new"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] shadow-lg shadow-sky-900/15 transition self-start sm:self-auto"
            >
              <Plus size={16} weight="bold" />
              Ajukan Retur Baru
            </Link>
          </div>
        </div>
      </div>

      {/* Return List */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {returns.length === 0 ? (
          <EmptyState
            title="Belum Ada Pengajuan Retur"
            description="Tidak ada klaim retur barang yang sedang berlangsung."
            action={
              <Link
                href="/orders"
                className="px-4 py-2 bg-[#0F4C81] text-white text-xs font-bold rounded-xl"
              >
                Lihat Riwayat Pesanan
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {returns.map((ret: any) => {
              const currentId = ret.returnId || ret.id;
              const displayRefund = ret.resolution?.refundAmount || ret.refund?.amount || ret.refundAmount || 0;
              const resType = ret.resolution?.resolutionType || ret.resolutionType || "REFUND";

              return (
                <motion.div
                  key={currentId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{ret.returnNumber || currentId}
                      </span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs font-bold text-slate-700">
                        {ret.merchantName || "Official Merchant"}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          ret.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : ret.status === "RESOLVED"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : ret.status === "REJECTED"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {ret.status === "APPROVED"
                          ? "Retur Disetujui (Kirim Balik)"
                          : ret.status === "RESOLVED"
                          ? "Selesai (Resolved)"
                          : ret.status === "REJECTED"
                          ? "Ditolak (Rejected)"
                          : ret.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">
                      {ret.productTitle || (ret.items && ret.items[0]?.orderItemId) || "Komponen Suku Cadang Pesanan"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Alasan: <span className="text-slate-700 font-medium">{ret.reason}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Solusi:{" "}
                      <span className="font-bold text-slate-700">
                        {resType === "EXCHANGE"
                          ? "Tukar Unit Baru"
                          : resType === "REPLACEMENT"
                          ? "Penggantian Unit (Replacement)"
                          : "Pengembalian Dana (Refund)"}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {displayRefund > 0 && (
                      <span className="text-sm font-bold font-display text-[#0F4C81]">
                        Nilai: {formatRupiah(displayRefund)}
                      </span>
                    )}
                    <Link
                      href={`/returns/${currentId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-[#0F4C81] hover:text-white text-slate-700 text-xs font-bold transition"
                    >
                      Buka Detail Retur
                      <ArrowRight size={14} weight="bold" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
