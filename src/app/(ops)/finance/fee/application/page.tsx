"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Receipt,
  TrendUp,
  Clock,
  ShieldCheck,
  Info,
  MagnifyingGlass,
  Funnel,
  DownloadSimple,
  SlidersHorizontal,
  ArrowRight,
  CheckCircle,
  WarningCircle,
  CurrencyCircleDollar,
} from "@phosphor-icons/react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/feedback/Toast";

export default function FinanceApplicationFeePage() {
  const repo = useDomainRepository();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"info" | "success" | "error">("info");
  const [periodFilter, setPeriodFilter] = useState<"7D" | "30D" | "90D" | "ALL">("30D");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);

  // Canonical Active Policy for Application Fee
  const activePolicy = repo.getActiveFeePolicy("APPLICATION_FEE");

  // Derive Fee Transactions from Canonical Orders
  const transactions = useMemo(() => {
    return repo.canonicalOrders.map((order) => {
      const baseAmount = order.price || 0;
      const calcResult = repo.calculateApplicationFee(baseAmount);
      const appFee = order.applicationFee !== undefined ? order.applicationFee : calcResult.amount;
      const policyVersion = order.applicationFeePolicyVersion || calcResult.policyVersion || "APP-v1.0";
      const totalCustomer = baseAmount + appFee;

      let txStatus: "SETTLED" | "PENDING" | "REFUNDED" | "FAILED" = "SETTLED";
      if (order.status === "CANCELLED" || order.status === "REFUNDED") {
        txStatus = "REFUNDED";
      } else if (order.paymentStatus === "UNPAID" || order.paymentStatus === "PENDING") {
        txStatus = "PENDING";
      } else {
        txStatus = "SETTLED";
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber || order.id,
        customerName: order.customerName,
        serviceTitle: order.serviceTitle,
        date: order.createdAt || "2026-09-22",
        baseAmount,
        feeAmount: appFee,
        totalCustomer,
        calculationType: calcResult.calculationType,
        policyVersion,
        status: txStatus,
      };
    });
  }, [repo]);

  // Derived KPI Metrics
  const kpi = useMemo(() => {
    const totalTransactions = transactions.length;
    const totalFee = transactions.reduce((sum, tx) => sum + tx.feeAmount, 0);
    const avgFee = totalTransactions > 0 ? Math.round(totalFee / totalTransactions) : 0;
    // Current period fee
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
      if (!matchSearch) return false;
      if (statusFilter !== "ALL" && tx.status !== statusFilter) return false;
      return true;
    });
  }, [transactions, searchQuery, statusFilter]);

  const handleExport = () => {
    setToastType("info");
    setToastMessage("Laporan transaksi Fee Aplikasi (CSV) berhasil diunduh.");
  };

  return (
    <div className="space-y-6 pb-20 font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-purple-100 text-purple-800 uppercase">
              Platform Revenue
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Customer Service Protection Fee</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900">
            Monitoring Fee Aplikasi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemantauan pendapatan biaya layanan aplikasi pelanggan, audit transaksi, dan pengajuan usulan penyesuaian tarif terpusat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs text-slate-700 bg-white"
          >
            <DownloadSimple size={14} />
            <span>Unduh Laporan</span>
          </Button>
          <Link href="/ops/finance/fee/proposals">
            <Button variant="primary" size="sm" className="flex items-center gap-1.5 text-xs">
              <SlidersHorizontal size={14} />
              <span>Ajukan Perubahan</span>
            </Button>
          </Link>
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
          <span className="text-[11px] text-blue-600 block">Order terkena fee aplikasi</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rata-rata Fee / Order</span>
            <TrendUp size={20} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-display text-slate-900">
            Rp {kpi.avgFee.toLocaleString("id-ID")}
          </p>
          <span className="text-[11px] text-emerald-600 block">Per transaksi pesanan jasa</span>
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

      {/* Current Policy Card (Read-Only Context with Proposal CTA, strictly forbidden: direct update) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-purple-100 text-purple-700">
              <Receipt size={24} weight="fill" />
            </span>
            <div>
              <h2 className="text-base font-bold font-display text-slate-900">
                Kebijakan Aktif Fee Aplikasi (Kanonikal)
              </h2>
              <p className="text-xs text-slate-500">
                Kebijakan resmi platform yang dibebankan kepada Customer pada invoice pemesanan. Perubahan hanya dapat dilakukan melalui pengajuan proposal ke CEO.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              Versi: {activePolicy?.version || "APP-v1.0"}
            </Badge>
            <Link href="/ops/finance/fee/proposals">
              <Button variant="primary" size="sm" className="text-xs flex items-center gap-1.5">
                <SlidersHorizontal size={14} />
                <span>Ajukan Perubahan</span>
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
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tipe Kalkulasi</span>
            <p className="text-base font-bold text-slate-900">
              {activePolicy?.calculationType === "PERCENTAGE" ? "Persentase (%)" : "Nominal Tetap (Rp)"}
            </p>
            <span className="text-[11px] text-slate-500 block">Mendukung % dan Rp</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Effective From</span>
            <p className="text-base font-bold text-slate-900">
              {activePolicy?.effectiveFrom || "2026-09-01"}
            </p>
            <span className="text-[11px] text-emerald-600 font-bold block">Status: ACTIVE</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Billing Target</span>
            <p className="text-base font-bold text-slate-900">Customer Invoice</p>
            <span className="text-[11px] text-purple-600 block">Zero Affiliate Markup</span>
          </div>
        </div>
      </div>

      {/* Revenue Trend Visual Representation */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold font-display text-slate-900">
              Tren Pendapatan Fee Aplikasi
            </h3>
            <p className="text-xs text-slate-500">
              Akumulasi mingguan penerimaan platform fee aplikasi dari pesanan terselesaikan
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {(["7D", "30D", "90D", "ALL"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodFilter(p)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  periodFilter === p
                    ? "bg-purple-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p === "ALL" ? "Semua" : `${p.replace("D", " Hari")}`}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Trend Bars */}
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

      {/* Transaction Fee History Table */}
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

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
            >
              <option value="ALL">Semua</option>
              <option value="SETTLED">Settled</option>
              <option value="PENDING">Pending</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer & Jasa</th>
                <th className="py-3 px-4 text-center">Tanggal</th>
                <th className="py-3 px-4 text-right">Base Amount</th>
                <th className="py-3 px-4 text-right">Fee Aplikasi</th>
                <th className="py-3 px-4 text-center">Tipe</th>
                <th className="py-3 px-4 text-center">Policy Version</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
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
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{tx.customerName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{tx.serviceTitle}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">{tx.date}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      Rp {tx.baseAmount.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-purple-900">
                      Rp {tx.feeAmount.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">{tx.calculationType}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="primary" size="sm">
                        {tx.policyVersion}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.status === "SETTLED"
                            ? "bg-emerald-100 text-emerald-800"
                            : tx.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedTransaction(tx)}
                        className="text-purple-700 hover:text-purple-900 text-xs font-bold underline"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTransaction(null)}
          title="Rincian Billing Fee Aplikasi"
          size="md"
        >
          <div className="space-y-4 text-left text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono font-bold text-slate-900">{selectedTransaction.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pelanggan:</span>
                <span className="font-medium text-slate-900">{selectedTransaction.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Layanan:</span>
                <span className="text-slate-900">{selectedTransaction.serviceTitle}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2">
              <div className="flex justify-between text-slate-700">
                <span>Harga Layanan (Base Amount):</span>
                <span className="font-mono font-bold">Rp {selectedTransaction.baseAmount.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-purple-900 font-bold">
                <span>Fee Aplikasi:</span>
                <span className="font-mono">Rp {selectedTransaction.feeAmount.toLocaleString("id-ID")}</span>
              </div>
              <div className="border-t border-purple-200 pt-2 flex justify-between text-slate-950 font-bold text-sm">
                <span>Total Ditagihkan ke Customer:</span>
                <span className="font-mono text-purple-950">
                  Rp {selectedTransaction.totalCustomer.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Snapshot Kebijakan:</span>
                <span className="font-mono font-bold text-purple-900">{selectedTransaction.policyVersion}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Metode Perhitungan:</span>
                <span className="font-bold text-slate-800">{selectedTransaction.calculationType}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Status Transaksi:</span>
                <span className="font-bold text-emerald-700">{selectedTransaction.status}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTransaction(null)}
                className="text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
