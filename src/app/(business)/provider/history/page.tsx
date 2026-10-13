"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ClockCounterClockwise,
  Calendar,
  DownloadSimple,
  CheckCircle,
  FileText,
  MagnifyingGlass,
  Coins,
  ArrowRight,
  ShieldCheck,
  User,
  Wrench,
} from "@phosphor-icons/react";
import { MOCK_ORDERS } from "@/mocks/orders";

export default function ProviderHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"THIS_MONTH" | "LAST_3_MONTHS" | "ALL">("THIS_MONTH");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "CANCELLED">("ALL");

  // Historical data records
  const historyRecords = [
    {
      orderId: "order-hist-001",
      customerName: "Rudy Gunawan",
      serviceTitle: "Flushing Pipa Freon & Vacuum AC Inverter",
      date: "18 September 2026",
      technician: "Budi Santoso",
      totalAmount: 480000,
      status: "COMPLETED",
      partsReplaced: "Pipa Tembaga 1/4 + 3/8 (3m), Freon R32 (0.5kg)",
      duration: "1 Jam 30 Menit",
    },
    {
      orderId: "order-hist-002",
      customerName: "Maya Indrawati",
      serviceTitle: "Penggantian Kapasitor Fan Outdoor AC Panasonic",
      date: "12 September 2026",
      technician: "Hendra Wijaya",
      totalAmount: 215000,
      status: "COMPLETED",
      partsReplaced: "Kapasitor 35 uF",
      duration: "45 Menit",
    },
    {
      orderId: "order-hist-003",
      customerName: "PT Graha Sentosa",
      serviceTitle: "Maintenance Rutin 4 Unit AC Cassette Kantor",
      date: "05 September 2026",
      technician: "Budi Santoso & Doni Kusuma",
      totalAmount: 980000,
      status: "COMPLETED",
      partsReplaced: "Pembersihan Filter Udara & Drain Pan",
      duration: "3 Jam 15 Menit",
    },
    {
      orderId: "order-hist-004",
      customerName: "Anton Surya",
      serviceTitle: "Pengecekan Kompresor Macet",
      date: "28 Agustus 2026",
      technician: "Ahmad Fauzi",
      totalAmount: 100000,
      status: "CANCELLED",
      partsReplaced: "Tidak ada (Dibatalkan oleh pelanggan)",
      duration: "30 Menit (Survei Awal)",
    },
  ];

  const filteredRecords = historyRecords.filter((rec) => {
    const matchesSearch =
      rec.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.technician.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === "COMPLETED") return matchesSearch && rec.status === "COMPLETED";
    if (statusFilter === "CANCELLED") return matchesSearch && rec.status === "CANCELLED";
    return matchesSearch;
  });

  const totalCompleted = filteredRecords.filter((r) => r.status === "COMPLETED").length;
  const totalRevenue = filteredRecords
    .filter((r) => r.status === "COMPLETED")
    .reduce((acc, r) => acc + r.totalAmount, 0);

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["ID Order,Pelanggan,Layanan,Tanggal,Teknisi,Total Biaya,Status"]
        .concat(
          filteredRecords.map(
            (r) =>
              `"${r.orderId}","${r.customerName}","${r.serviceTitle}","${r.date}","${r.technician}",${r.totalAmount},"${r.status}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `servio_provider_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-body text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display text-neutral-dark">
              Arsip Riwayat Pengerjaan & Audit Servis
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-neutral-slate">
              Audit Ready
            </span>
          </div>
          <p className="text-sm text-neutral-slate mt-1">
            Data rekam jejak pesanan lampau untuk pelaporan keuangan, garansi retensi, dan evaluasi performa teknisi.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-neutral-dark flex items-center gap-2 shadow-servio-xs self-start sm:self-auto transition-colors"
        >
          <DownloadSimple size={16} weight="bold" />
          <span>Ekspor Rekap (CSV)</span>
        </button>
      </div>

      {/* Recap Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-servio-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xl font-display">
            {totalCompleted}
          </div>
          <div>
            <span className="text-xs text-neutral-slate block font-medium">Order Selesai Penuh</span>
            <span className="text-base font-bold font-display text-neutral-dark">{totalCompleted} Transaksi</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-servio-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky text-primary flex items-center justify-center font-bold text-xl font-display">
            <Coins size={22} weight="bold" />
          </div>
          <div>
            <span className="text-xs text-neutral-slate block font-medium">Total Omset Periode Ini</span>
            <span className="text-base font-bold font-display text-primary">
              Rp {totalRevenue.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-servio-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-neutral-dark flex items-center justify-center font-bold text-base font-display">
            100%
          </div>
          <div>
            <span className="text-xs text-neutral-slate block font-medium">Kepatuhan Retensi Data</span>
            <span className="text-base font-bold font-display text-neutral-dark">Tersimpan Permanen</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-servio-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari ID arsip (#ord-hist-...), nama pelanggan, atau nama teknisi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(["ALL", "COMPLETED", "CANCELLED"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                statusFilter === st
                  ? "bg-neutral-dark text-white"
                  : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
              }`}
            >
              {st === "ALL" ? "Semua Status" : st === "COMPLETED" ? "Selesai" : "Batal"}
            </button>
          ))}
        </div>
      </div>

      {/* Historical Data Table / Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-servio-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-neutral-slate font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-5">ID & Tanggal</th>
                <th className="py-3.5 px-5">Layanan & Pelanggan</th>
                <th className="py-3.5 px-5">Teknisi Bertugas</th>
                <th className="py-3.5 px-5">Suku Cadang & Durasi</th>
                <th className="py-3.5 px-5 text-right">Nilai Transaksi</th>
                <th className="py-3.5 px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((item) => (
                <tr key={item.orderId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-5">
                    <span className="font-mono font-bold text-primary block">#{item.orderId}</span>
                    <span className="text-[11px] text-slate-400">{item.date}</span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="font-bold text-neutral-dark block">{item.serviceTitle}</span>
                    <span className="text-[11px] text-neutral-slate">Klien: {item.customerName}</span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="font-medium text-neutral-dark flex items-center gap-1.5">
                      <User size={13} className="text-slate-400" />
                      {item.technician}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-neutral-dark block font-medium">{item.partsReplaced}</span>
                    <span className="text-[10px] text-slate-400">Durasi: {item.duration}</span>
                  </td>
                  <td className="py-4 px-5 text-right font-mono font-bold text-neutral-dark">
                    Rp {item.totalAmount.toLocaleString("id-ID")}
                  </td>
                  <td className="py-4 px-5 text-center">
                    {item.status === "COMPLETED" ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        SELESAI
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                        BATAL
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
