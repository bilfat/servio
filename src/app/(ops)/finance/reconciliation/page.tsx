"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Scales,
  MagnifyingGlass,
  ArrowRight,
  ShieldCheck,
  WarningCircle,
  CheckCircle,
  ArrowsClockwise,
  Check,
  X,
  Clock,
  DownloadSimple,
  Bank,
  FileText,
  ArrowsLeftRight,
  TrendUp,
} from "@phosphor-icons/react";
import { useFinanceOperations, ReconciliationMatchStatus } from "@/features/finance/useFinanceOperations";
import { Toast } from "@/components/feedback/Toast";

export default function FinancialReconciliationPage() {
  const { reconciliations, triggerAutoReconciliation } = useFinanceOperations();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  const matchedCount = reconciliations.filter((r) => r.status === "MATCHED").length;
  const matchRate = Math.round((matchedCount / reconciliations.length) * 100);
  const totalDiscrepancy = reconciliations.reduce((sum, r) => sum + r.difference, 0);

  const filteredItems = reconciliations.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.gatewayTrxId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.internalTrxId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.bankChannel.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;

    return true;
  });

  const handleTriggerAutoReconcile = () => {
    setIsReconciling(true);
    setTimeout(() => {
      triggerAutoReconciliation();
      setIsReconciling(false);
      setToastMessage(
        "Proses rekonsiliasi otomatis berhasil dijalankan. Mutasi gateway telah dipetakan ke buku besar internal."
      );
    }, 600);
  };

  const handleExportCSV = () => {
    setToastMessage("Laporan rekonsiliasi keuangan format CSV berhasil diunduh.");
  };

  return (
    <div className="space-y-6 pb-16 font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Bank & Ledger Reconciliation
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
              <ShieldCheck size={14} weight="fill" />
              Buku Besar Akuntansi
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
            Rekonsiliasi Finansial Bank & Gateway
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Pencocokan mutasi kas masuk/keluar dari payment gateway & bank kustodian dengan buku besar internal transaksi Servio untuk memastikan zero variance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
          >
            <DownloadSimple size={16} weight="bold" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            disabled={isReconciling}
            onClick={handleTriggerAutoReconcile}
            className="px-4 py-2.5 rounded-2xl bg-[#0F4C81] hover:bg-sky-900 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <ArrowsClockwise size={16} weight="bold" className={isReconciling ? "animate-spin" : ""} />
            <span>{isReconciling ? "Mencocokkan..." : "Jalankan Auto-Match"}</span>
          </button>
        </div>
      </div>

      {/* KPI Reconciliation Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tingkat Kecocokan (Match Rate)</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle size={18} weight="fill" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600">
              {matchRate}%
            </span>
            <span className="text-xs text-slate-400">
              ({matchedCount} dari {reconciliations.length} mutasi)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Target kepatuhan akuntansi &gt; 95%</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Selisih (Discrepancy)</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Scales size={18} weight="duotone" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-600">
              Rp {totalDiscrepancy.toLocaleString("id-ID")}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Perbedaan rounding atau fee transfer</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Status Siklus Kliring</span>
            <span className="p-2 rounded-xl bg-sky-50 text-[#0F4C81]">
              <Clock size={18} weight="duotone" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-display text-slate-900">
              T+0 Real-Time
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Sinkronisasi mutasi bank setiap 15 menit</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari ID mutasi, ID gateway, nomor transaksi internal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-bold">
            {[
              { id: "ALL", label: "Semua Mutasi" },
              { id: "MATCHED", label: "Cocok (Matched)" },
              { id: "DISCREPANCY_AMOUNT", label: "Selisih Nominal" },
              { id: "UNMATCHED_GATEWAY", label: "Belum Tercocokkan" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-2 rounded-xl transition whitespace-nowrap ${
                  statusFilter === tab.id
                    ? "bg-[#0F4C81] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reconciliation Comparison Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-4 pl-6">ID & Tanggal</th>
                <th className="p-4">Ref Gateway Pihak Ketiga</th>
                <th className="p-4">ID Buku Besar Servio</th>
                <th className="p-4">Kanal Bank</th>
                <th className="p-4 text-right">Nominal Gateway</th>
                <th className="p-4 text-right">Nominal Ledger</th>
                <th className="p-4 text-right">Selisih (Variance)</th>
                <th className="p-4 pr-6 text-center">Status Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-4 pl-6 space-y-0.5">
                    <span className="font-mono font-bold text-slate-900 block">{item.id}</span>
                    <span className="text-[10px] text-slate-400 block">{item.date}</span>
                  </td>

                  <td className="p-4 font-mono font-bold text-slate-800">
                    {item.gatewayTrxId}
                  </td>

                  <td className="p-4 font-mono text-[#0F4C81] font-bold">
                    {item.internalTrxId}
                  </td>

                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 font-semibold text-slate-700">
                      {item.bankChannel}
                    </span>
                  </td>

                  <td className="p-4 text-right font-mono font-bold text-slate-900">
                    Rp {item.gatewayAmount.toLocaleString("id-ID")}
                  </td>

                  <td className="p-4 text-right font-mono font-bold text-slate-900">
                    Rp {item.ledgerAmount.toLocaleString("id-ID")}
                  </td>

                  <td className="p-4 text-right font-mono font-bold">
                    {item.difference === 0 ? (
                      <span className="text-emerald-600">Rp 0 (Sesuai)</span>
                    ) : (
                      <span className="text-amber-600">
                        +Rp {item.difference.toLocaleString("id-ID")}
                      </span>
                    )}
                  </td>

                  <td className="p-4 pr-6 text-center">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block ${
                        item.status === "MATCHED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : item.status === "DISCREPANCY_AMOUNT"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-sky-50 text-sky-800 border border-sky-200"
                      }`}
                    >
                      {item.status === "MATCHED"
                        ? "MATCHED"
                        : item.status === "DISCREPANCY_AMOUNT"
                        ? "SELISIH NOMINAL"
                        : "UNMATCHED GATEWAY"}
                    </span>
                    {item.matchedAt && (
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {item.matchedAt}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
