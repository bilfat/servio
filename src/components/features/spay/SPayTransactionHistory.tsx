"use client";

import React, { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ClockCountdown,
  CheckCircle,
  WarningCircle,
  Receipt,
  MagnifyingGlass,
  Funnel,
  X,
  CreditCard,
  Bank,
} from "@phosphor-icons/react";
import { SPayTransaction, SPayTransactionStatus } from "@/types/spay";

export interface SPayTransactionHistoryProps {
  transactions: SPayTransaction[];
  className?: string;
}

export function SPayTransactionHistory({
  transactions,
  className = "",
}: SPayTransactionHistoryProps) {
  const [filterDirection, setFilterDirection] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTx, setSelectedTx] = useState<SPayTransaction | null>(null);

  // Filtered list
  const filtered = transactions.filter((tx) => {
    if (filterDirection === "IN" && tx.direction !== "IN") return false;
    if (filterDirection === "OUT" && tx.direction !== "OUT") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = tx.title.toLowerCase().includes(q);
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchRef = tx.referenceNo.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchRef;
    }
    return true;
  });

  const getStatusBadge = (status: SPayTransactionStatus) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle size={12} weight="fill" />
            <span>Berhasil</span>
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <ClockCountdown size={12} weight="fill" />
            <span>Diproses</span>
          </span>
        );
      case "REQUESTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-[#0F4C81] border border-sky-200">
            <span>Diajukan</span>
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <WarningCircle size={12} weight="fill" />
            <span>Gagal</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-display text-neutral-dark">
            Riwayat Transaksi S-Pay
          </h2>
          <p className="text-xs text-neutral-slate">
            Catatan mutasi dana refund, settlement, dan simulasi penarikan dana.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterDirection("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterDirection === "ALL"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setFilterDirection("IN")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterDirection === "IN"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Dana Masuk
          </button>
          <button
            type="button"
            onClick={() => setFilterDirection("OUT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterDirection === "OUT"
                ? "bg-white text-rose-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Dana Keluar
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <MagnifyingGlass size={16} weight="bold" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari berdasarkan referensi, judul, atau keterangan transaksi..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X size={14} weight="bold" />
          </button>
        )}
      </div>

      {/* Transaction List Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          /* Empty State */
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt size={28} weight="light" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 font-display">
                Tidak Ada Transaksi Ditemukan
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? "Tidak ada mutasi yang cocok dengan kata kunci pencarian Anda."
                  : filterDirection !== "ALL"
                  ? `Belum ada catatan mutasi kategori ${filterDirection === "IN" ? "Dana Masuk" : "Dana Keluar"}.`
                  : "Belum ada transaksi pada akun S-Pay ini."}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((tx) => {
              const isIncome = tx.direction === "IN";
              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedTx(tx);
                    }
                  }}
                  className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition cursor-pointer group"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Direction Icon */}
                    <div
                      className={`p-2.5 sm:p-3 rounded-2xl shrink-0 transition-transform group-hover:scale-105 ${
                        isIncome
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : "bg-rose-50 text-rose-600 border border-rose-100"
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft size={20} weight="bold" />
                      ) : (
                        <ArrowUpRight size={20} weight="bold" />
                      )}
                    </div>

                    {/* Transaction Details */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-slate-400">
                          {tx.referenceNo}
                        </span>
                        {getStatusBadge(tx.status)}
                      </div>

                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm font-display truncate">
                        {tx.title}
                      </h3>

                      <p className="text-[11px] text-slate-500 truncate max-w-md">
                        {tx.description}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                        <span>{tx.timestamp}</span>
                        {tx.channel && <span>• {tx.channel}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Amount Column */}
                  <div className="shrink-0 text-right">
                    <div
                      className={`font-display font-bold text-sm sm:text-base ${
                        isIncome ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {isIncome ? "+" : "-"}Rp {tx.amount.toLocaleString("id-ID")}
                    </div>
                    <span className="text-[10px] text-slate-400 group-hover:text-primary transition font-medium">
                      Rincian &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt size={20} className="text-[#0F4C81]" weight="bold" />
                <h3 className="font-bold font-display text-slate-900 text-sm">
                  Bukti Mutasi S-Pay
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="text-center py-2 space-y-1">
              <span className="text-xs text-slate-500">Nominal Transaksi:</span>
              <div
                className={`text-2xl sm:text-3xl font-bold font-display ${
                  selectedTx.direction === "IN" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {selectedTx.direction === "IN" ? "+" : "-"}Rp{" "}
                {selectedTx.amount.toLocaleString("id-ID")}
              </div>
              <div className="pt-1">{getStatusBadge(selectedTx.status)}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor Referensi:</span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedTx.referenceNo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jenis Transaksi:</span>
                <span className="font-semibold text-slate-800">{selectedTx.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu Transaksi:</span>
                <span className="text-slate-800">{selectedTx.timestamp}</span>
              </div>
              {selectedTx.channel && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Kanal / Saluran:</span>
                  <span className="font-semibold text-slate-800">{selectedTx.channel}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 block mb-1">Deskripsi:</span>
                <p className="text-slate-700 leading-relaxed">{selectedTx.description}</p>
              </div>
              {selectedTx.notes && (
                <div className="pt-1">
                  <span className="text-slate-500 block mb-1">Catatan Tambahan:</span>
                  <p className="text-slate-600 italic text-[11px]">{selectedTx.notes}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedTx(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
