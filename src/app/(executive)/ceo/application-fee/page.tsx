"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Receipt,
  TrendUp,
  Clock,
  ShieldCheck,
  CheckCircle,
  CurrencyCircleDollar,
  MagnifyingGlass,
  ArrowRight,
  SlidersHorizontal,
  Bank,
} from "@phosphor-icons/react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function CeoApplicationFeePage() {
  const repo = useDomainRepository();
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Read-only Active Canonical Policy
  const activePolicy = repo.getActiveFeePolicy("APPLICATION_FEE");

  // Derive Transactions from Canonical Orders
  const transactions = useMemo(() => {
    return repo.canonicalOrders.map((order) => {
      const baseAmount = order.price || 0;
      const calcResult = repo.calculateApplicationFee(baseAmount);
      const appFee = order.applicationFee !== undefined ? order.applicationFee : calcResult.amount;
      const policyVersion = order.applicationFeePolicyVersion || calcResult.policyVersion || "APP-v1.0";

      return {
        id: order.id,
        orderNumber: order.orderNumber || order.id,
        customerName: order.customerName,
        serviceTitle: order.serviceTitle,
        baseAmount,
        feeAmount: appFee,
        policyVersion,
        date: order.createdAt || "2026-09-22",
        invoiceStatus: order.status === "COMPLETED" ? "PAID" : "SETTLED",
        paymentStatus: order.paymentStatus || "PAID",
      };
    });
  }, [repo]);

  // Derived KPI Metrics
  const kpi = useMemo(() => {
    const totalTransactions = transactions.length;
    const totalFee = transactions.reduce((sum, tx) => sum + tx.feeAmount, 0);
    const avgFee = totalTransactions > 0 ? Math.round(totalFee / totalTransactions) : 0;
    const currentPeriodFee = totalFee;

    return {
      totalFee,
      totalTransactions,
      avgFee,
      currentPeriodFee,
    };
  }, [transactions]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        tx.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [transactions, searchQuery]);

  return (
    <div className="space-y-6 font-body pb-20 text-left">
      <PageHeader
        title="Analitik Eksekutif: Fee Aplikasi"
        description="Analisis performa pendapatan biaya perlindungan aplikasi platform (Customer Protection Fee), audit transaksi, dan konteks tata kelola kanonikal."
        breadcrumbs={[
          { label: "Executive", href: "/ceo/dashboard" },
          { label: "Fee Aplikasi", href: "/ceo/application-fee" },
        ]}
      />

      {/* Period Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Monitoring Pendapatan Biaya Aplikasi Layanan</h2>
          <p className="text-xs text-slate-500">
            Biaya resmi yang dibebankan kepada Customer pada saat order jasa dibuat. Transaksi historis bersifat immutable.
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl">
          {[
            { id: "7d", label: "7 Hari" },
            { id: "30d", label: "30 Hari" },
            { id: "90d", label: "90 Hari" },
            { id: "all", label: "Semua" },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPeriod(p.id as typeof selectedPeriod)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedPeriod === p.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Fee Aplikasi</span>
            <Receipt size={20} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold font-display text-purple-950">
            Rp {kpi.totalFee.toLocaleString("id-ID")}
          </p>
          <span className="text-[11px] text-purple-700 block">Total terakumulasi</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Transaksi</span>
            <CheckCircle size={20} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-display text-slate-900">
            {kpi.totalTransactions}
          </p>
          <span className="text-[11px] text-blue-600 block">Order jasa aktif/selesai</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rata-rata Fee / Order</span>
            <TrendUp size={20} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-display text-slate-900">
            Rp {kpi.avgFee.toLocaleString("id-ID")}
          </p>
          <span className="text-[11px] text-emerald-600 block">Per pesanan terselesaikan</span>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-900 to-indigo-950 text-white shadow-xs p-5 space-y-1">
          <div className="flex items-center justify-between text-purple-200">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fee Periode Ini</span>
            <CurrencyCircleDollar size={20} />
          </div>
          <p className="text-2xl font-bold font-display text-white">
            Rp {kpi.currentPeriodFee.toLocaleString("id-ID")}
          </p>
          <span className="text-[11px] text-purple-300 block">Bulan September 2026</span>
        </div>
      </div>

      {/* Current Policy Card (Read-Only Executive Context) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-purple-100 text-purple-700">
              <Receipt size={24} weight="fill" />
            </span>
            <div>
              <h2 className="text-base font-bold font-display text-slate-900">
                Kebijakan Aktif Fee Aplikasi (Read-Only)
              </h2>
              <p className="text-xs text-slate-500">
                Kebijakan resmi platform yang dibebankan kepada Customer. Persetujuan perubahan kebijakan dikelola di portal Persetujuan & Riwayat.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              Versi: {activePolicy?.version || "APP-v1.0"}
            </Badge>
            <Link href="/ceo/fee-governance">
              <Button variant="outline" size="sm" className="text-xs bg-white text-slate-700 flex items-center gap-1.5">
                <Bank size={14} />
                <span>Persetujuan & Riwayat</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tarif Aktif</span>
            <p className="text-xl font-bold font-mono text-purple-950">
              {activePolicy?.calculationType === "PERCENTAGE"
                ? `${activePolicy.value}%`
                : `Rp ${(activePolicy?.value || 5000).toLocaleString("id-ID")}`}
            </p>
            <span className="text-[11px] text-slate-500 block">Baseline Kanonikal</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Metode Kalkulasi</span>
            <p className="text-base font-bold text-slate-900">
              {activePolicy?.calculationType === "PERCENTAGE" ? "Persentase (%)" : "Nominal Tetap (Rp)"}
            </p>
            <span className="text-[11px] text-slate-500 block">Dukungan Fleksibel</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Berlaku Sejak</span>
            <p className="text-base font-bold text-slate-900">
              {activePolicy?.effectiveFrom || "2026-09-01"}
            </p>
            <span className="text-[11px] text-emerald-600 font-bold block">Status: ACTIVE</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Sasaran Penagihan</span>
            <p className="text-base font-bold text-slate-900">Customer Invoice</p>
            <span className="text-[11px] text-purple-600 block">Biaya Layanan Aplikasi</span>
          </div>
        </div>
      </div>

      {/* Trend Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold font-display text-slate-900">
            Tren Pertumbuhan Pendapatan Fee Aplikasi
          </h3>
          <p className="text-xs text-slate-500">
            Proyeksi dan pertumbuhan mingguan penerimaan platform fee aplikasi
          </p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 pt-2">
          {[
            { label: "W1 Sep", val: "Rp 15.000", height: "40%" },
            { label: "W2 Sep", val: "Rp 25.000", height: "65%" },
            { label: "W3 Sep", val: "Rp 35.000", height: "85%" },
            { label: "W4 Sep", val: "Rp 40.000", height: "100%" },
            { label: "W1 Okt (P)", val: "Rp 45.000", height: "70%" },
            { label: "W2 Okt (P)", val: "Rp 50.000", height: "80%" },
            { label: "W3 Okt (P)", val: "Rp 55.000", height: "90%" },
            { label: "W4 Okt (P)", val: "Rp 60.000", height: "95%" },
          ].map((bar, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-mono text-purple-900 font-bold">{bar.val}</span>
              <div className="w-full h-24 bg-slate-100 rounded-xl relative overflow-hidden flex items-end">
                <div
                  style={{ height: bar.height }}
                  className="w-full bg-gradient-to-t from-purple-800 to-indigo-600 rounded-lg transition-all duration-500"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-medium">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Order ID atau Pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="text-xs text-slate-500">
            Menampilkan <strong>{filteredTransactions.length}</strong> transaksi kanonikal
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Layanan</th>
                <th className="py-3 px-4 text-right">Base Amount</th>
                <th className="py-3 px-4 text-right">Fee Aplikasi</th>
                <th className="py-3 px-4 text-center">Policy</th>
                <th className="py-3 px-4 text-center">Tanggal</th>
                <th className="py-3 px-4 text-center">Status Invoice</th>
                <th className="py-3 px-4 text-center">Status Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada transaksi fee aplikasi ditemukan.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{tx.orderNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{tx.customerName}</td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[160px]">{tx.serviceTitle}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      Rp {tx.baseAmount.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-purple-900">
                      Rp {tx.feeAmount.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="primary" size="sm">
                        {tx.policyVersion}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500">{tx.date}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {tx.invoiceStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {tx.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
