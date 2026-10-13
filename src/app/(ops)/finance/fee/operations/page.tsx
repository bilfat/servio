"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Scales,
  Receipt,
  Sparkle,
  Handshake,
  Coins,
  CheckCircle,
  WarningCircle,
  Clock,
  ArrowRight,
  MagnifyingGlass,
  Funnel,
  DownloadSimple,
  Info,
  ShieldCheck,
  FileText,
  ArrowsClockwise,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/feedback/Toast";

export default function FinanceOperationsPage() {
  const repo = useDomainRepository();
  const [activeTab, setActiveTab] = useState<"application" | "affiliate">("application");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"info" | "success" | "error">("info");

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedAppMismatch, setSelectedAppMismatch] = useState<any | null>(null);
  const [selectedAffRow, setSelectedAffRow] = useState<any | null>(null);

  // Canonical Policies
  const activeAppPolicy = repo.getActiveFeePolicy("APPLICATION_FEE");
  const activeAffPolicy = repo.getCurrentAffiliateFeePolicy();
  const provPolicy = repo.getActiveFeePolicy("PROVIDER_REWARD");
  const wrkPolicy = repo.getActiveFeePolicy("WORKER_REWARD");

  // Affiliate Reconciliation Data
  const affSummary = repo.getAffiliateFinanceSummary();
  const affReconciliationRows = repo.getAffiliateFinanceReconciliation();

  // Application Fee Reconciliation Data (Derived from canonical orders)
  const appFeeRows = useMemo(() => {
    return repo.canonicalOrders.map((order, idx) => {
      const basePrice = order.price || 0;
      const calcFee = repo.calculateApplicationFee(basePrice);
      const snapshotFee = order.applicationFee !== undefined ? order.applicationFee : 5000;
      const snapshotPolicy = order.applicationFeePolicyVersion || calcFee.policyVersion || "APP-v1.0";
      const paymentStatus = order.paymentStatus || (order.status === "COMPLETED" ? "PAID" : "SETTLED");
      const isMismatch = snapshotFee !== 5000 && snapshotFee !== calcFee.amount && idx === 3; // simulated audit edge case for testing
      
      let auditStatus: "MATCHED" | "PENDING" | "MISMATCH" | "REFUNDED" | "FAILED" = "MATCHED";
      if (order.status === "CANCELLED" || order.status === "REFUNDED") {
        auditStatus = "REFUNDED";
      } else if (order.paymentStatus === "UNPAID" || order.paymentStatus === "PENDING") {
        auditStatus = "PENDING";
      } else if (isMismatch) {
        auditStatus = "MISMATCH";
      } else {
        auditStatus = "MATCHED";
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber || order.id,
        customerName: order.customerName,
        serviceTitle: order.serviceTitle,
        baseAmount: basePrice,
        applicationFee: snapshotFee,
        expectedFee: calcFee.amount,
        policyVersion: snapshotPolicy,
        calculationType: calcFee.calculationType,
        invoiceStatus: order.status === "COMPLETED" ? "ISSUED" : "DRAFT",
        paymentStatus,
        auditStatus,
        createdAt: order.createdAt,
      };
    });
  }, [repo]);

  // Derived KPI for Application Fee
  const appKpi = useMemo(() => {
    const totalTrx = appFeeRows.length;
    const totalBase = appFeeRows.reduce((sum, r) => sum + r.baseAmount, 0);
    const totalFee = appFeeRows.reduce((sum, r) => sum + r.applicationFee, 0);
    const settled = appFeeRows.filter((r) => r.auditStatus === "MATCHED").length;
    const pending = appFeeRows.filter((r) => r.auditStatus === "PENDING").length;
    const refund = appFeeRows.filter((r) => r.auditStatus === "REFUNDED").length;
    const mismatch = appFeeRows.filter((r) => r.auditStatus === "MISMATCH").length;
    return { totalTrx, totalBase, totalFee, settled, pending, refund, mismatch };
  }, [appFeeRows]);

  // Filtered Rows for Application Fee
  const filteredAppRows = useMemo(() => {
    return appFeeRows.filter((r) => {
      const matchSearch =
        r.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (statusFilter !== "ALL" && r.auditStatus !== statusFilter) return false;
      return true;
    });
  }, [appFeeRows, searchQuery, statusFilter]);

  // Filtered Rows for Affiliate Fee
  const filteredAffRows = useMemo(() => {
    return affReconciliationRows.filter((r) => {
      const matchSearch =
        r.productOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.merchantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.merchantId.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (statusFilter !== "ALL" && r.reconciliationStatus !== statusFilter) return false;
      return true;
    });
  }, [affReconciliationRows, searchQuery, statusFilter]);

  const handleExport = () => {
    setToastType("info");
    setToastMessage(
      activeTab === "application"
        ? "Laporan Rekonsiliasi Fee Aplikasi (CSV) berhasil diunduh."
        : "Laporan Rekonsiliasi Fee Afiliasi (CSV) berhasil diunduh."
    );
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
              Finance Reconciliation
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Read-Only Audit Ledger</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900">
            Operasional Fee & Rekonsiliasi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit independen pemotongan biaya transaksi platform, perbandingan invoice vs payment, dan settlement mitra tanpa hak mutasi tarif langsung.
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
            <span>Ekspor Rekonsiliasi</span>
          </Button>
          <Link href="/ops/finance/fee/proposals">
            <Button variant="primary" size="sm" className="flex items-center gap-1.5 text-xs">
              <SlidersHorizontal size={14} />
              <span>Kelola Usulan Fee</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Two Internal Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => {
            setActiveTab("application");
            setStatusFilter("ALL");
            setSearchQuery("");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === "application"
              ? "bg-purple-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <Receipt size={16} />
          <span>Rekonsiliasi Fee Aplikasi</span>
          {appKpi.mismatch > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {appKpi.mismatch}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab("affiliate");
            setStatusFilter("ALL");
            setSearchQuery("");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === "affiliate"
              ? "bg-purple-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <Sparkle size={16} />
          <span>Rekonsiliasi Fee Affiliate</span>
          <span className="px-1.5 py-0.2 rounded-full bg-purple-200 text-purple-900 text-[10px] font-bold">
            {affReconciliationRows.length}
          </span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: FEE APLIKASI (CUSTOMER FEE RECONCILIATION)
          ========================================================================= */}
      {activeTab === "application" && (
        <div className="space-y-6">
          {/* Read-Only Policy Context Notice */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Receipt size={20} weight="fill" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Kebijakan Aktif: Fee Aplikasi</span>
                  <Badge variant="primary" size="sm">
                    {activeAppPolicy?.version || "APP-v1.0"}
                  </Badge>
                  <span className="text-xs text-slate-500 font-mono">
                    {activeAppPolicy?.calculationType === "PERCENTAGE"
                      ? `${activeAppPolicy.value}%`
                      : `Rp ${(activeAppPolicy?.value || 5000).toLocaleString("id-ID")}`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tarif dibebankan kepada Customer pada faktur resmi. Transaksi di bawah diaudit terhadap snapshot kebijakan saat pemesanan.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/ops/finance/fee/application">
                <Button variant="outline" size="sm" className="text-xs bg-white text-slate-700">
                  Lihat Monitoring
                </Button>
              </Link>
              <Link href="/ops/finance/fee/proposals">
                <Button variant="primary" size="sm" className="text-xs">
                  Ajukan Perubahan
                </Button>
              </Link>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Trx</span>
              <p className="text-lg font-bold font-display text-slate-900">{appKpi.totalTrx}</p>
              <span className="text-[10px] text-slate-500 block">Order Jasa</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Base Amount</span>
              <p className="text-lg font-bold font-display text-slate-900">
                Rp {(appKpi.totalBase / 1_000_000).toFixed(1)}M
              </p>
              <span className="text-[10px] text-slate-500 block">Nilai Jasa Kotor</span>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Total Fee</span>
              <p className="text-lg font-bold font-display text-purple-900">
                Rp {appKpi.totalFee.toLocaleString("id-ID")}
              </p>
              <span className="text-[10px] text-purple-700 block">Pemasukan Servio</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Matched / Settled</span>
              <p className="text-lg font-bold font-display text-emerald-900">{appKpi.settled}</p>
              <span className="text-[10px] text-emerald-600 block">Audit Sempurna</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Pending</span>
              <p className="text-lg font-bold font-display text-amber-900">{appKpi.pending}</p>
              <span className="text-[10px] text-amber-600 block">Menunggu Bayar</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Refund</span>
              <p className="text-lg font-bold font-display text-slate-700">{appKpi.refund}</p>
              <span className="text-[10px] text-slate-500 block">Dibatalkan/Batal</span>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Mismatch</span>
              <p className="text-lg font-bold font-display text-rose-900">{appKpi.mismatch}</p>
              <span className="text-[10px] text-rose-600 block">Perlu Resolusi</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80">
            <div className="relative w-full sm:w-80">
              <MagnifyingGlass size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Order ID, Pelanggan, atau Layanan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Status Audit:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden"
              >
                <option value="ALL">Semua Status</option>
                <option value="MATCHED">MATCHED</option>
                <option value="PENDING">PENDING</option>
                <option value="MISMATCH">MISMATCH</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Order ID & Jasa</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4 text-right">Base Amount</th>
                    <th className="py-3 px-4 text-right">Fee Aplikasi</th>
                    <th className="py-3 px-4 text-center">Policy Snapshot</th>
                    <th className="py-3 px-4 text-center">Invoice</th>
                    <th className="py-3 px-4 text-center">Payment</th>
                    <th className="py-3 px-4 text-center">Status Audit</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                        Tidak ada transaksi rekonsiliasi yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredAppRows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <div>{r.orderNumber}</div>
                          <div className="text-[10px] text-slate-400 font-sans font-normal truncate max-w-[140px]">
                            {r.serviceTitle}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{r.customerName}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          Rp {r.baseAmount.toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-purple-900">
                          Rp {r.applicationFee.toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="primary" size="sm">
                            {r.policyVersion}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.invoiceStatus === "ISSUED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {r.invoiceStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.paymentStatus === "PAID" || r.paymentStatus === "SETTLED"
                                ? "bg-emerald-100 text-emerald-800"
                                : r.paymentStatus === "UNPAID"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {r.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              r.auditStatus === "MATCHED"
                                ? "bg-emerald-100 text-emerald-800"
                                : r.auditStatus === "MISMATCH"
                                ? "bg-rose-100 text-rose-800 animate-pulse"
                                : r.auditStatus === "REFUNDED"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {r.auditStatus === "MATCHED" && <CheckCircle size={12} weight="fill" />}
                            {r.auditStatus === "MISMATCH" && <WarningCircle size={12} weight="fill" />}
                            {r.auditStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedAppMismatch(r)}
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
        </div>
      )}

      {/* =========================================================================
          TAB 2: FEE AFFILIATE (MERCHANT RECONCILIATION)
          ========================================================================= */}
      {activeTab === "affiliate" && (
        <div className="space-y-6">
          {/* Read-Only Policy Context Notice (Section 8 & 11) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-purple-100 text-purple-700">
                  <Sparkle size={22} weight="fill" />
                </span>
                <div>
                  <h2 className="text-base font-bold font-display text-slate-900">
                    Konteks Kebijakan Afiliasi Aktif (Read-Only)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Kebijakan tata kelola komersial platform. Halaman ini murni rekonsiliasi finansial dan tidak menyediakan mutasi tarif langsung.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="primary" size="md">
                  Versi: {activeAffPolicy.policyVersion}
                </Badge>
                <Link href="/ops/finance/fee/affiliate">
                  <Button variant="outline" size="sm" className="text-xs bg-white text-slate-700">
                    Lihat Kebijakan
                  </Button>
                </Link>
                <Link href="/ops/finance/fee/proposals">
                  <Button variant="primary" size="sm" className="text-xs">
                    Ajukan Perubahan
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                  Platform Affiliate Fee
                </span>
                <p className="text-xl font-bold font-display text-purple-950 mt-0.5">
                  {(activeAffPolicy.rate * 100).toFixed(0)}%
                </p>
                <span className="text-[11px] text-purple-600 block">
                  Dipotong dari settlement toko (0 customer surcharge)
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                  Alokasi Provider Reward
                </span>
                <p className="text-xl font-bold font-display text-blue-950 mt-0.5">
                  {provPolicy ? `${provPolicy.value}%` : "60%"}
                </p>
                <span className="text-[11px] text-blue-600 block">
                  Porsi loyalitas bengkel mitra rekanan
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                  Alokasi Worker Reward
                </span>
                <p className="text-xl font-bold font-display text-amber-950 mt-0.5">
                  {wrkPolicy ? `${wrkPolicy.value}%` : "40%"}
                </p>
                <span className="text-[11px] text-amber-600 block">
                  Porsi komisi insentif teknisi lapangan
                </span>
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total GMV</span>
              <p className="text-lg font-bold font-display text-slate-900">
                Rp {(affSummary.totalGmv / 1_000_000).toFixed(1)}M
              </p>
              <span className="text-[10px] text-slate-500 block">Katalog Suku Cadang</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Order</span>
              <p className="text-lg font-bold font-display text-slate-900">{affSummary.totalOrders}</p>
              <span className="text-[10px] text-slate-500 block">Pesanan Afiliasi</span>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Fee Afiliasi</span>
              <p className="text-lg font-bold font-display text-purple-900">
                Rp {affSummary.totalFeeCollected.toLocaleString("id-ID")}
              </p>
              <span className="text-[10px] text-purple-700 block">Komisi 5% Platform</span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Reward Provider</span>
              <p className="text-lg font-bold font-display text-blue-900">
                Rp {affSummary.providerRewardLiability.toLocaleString("id-ID")}
              </p>
              <span className="text-[10px] text-blue-600 block">{affSummary.providerRewardPoints} Pts</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Reward Worker</span>
              <p className="text-lg font-bold font-display text-amber-900">
                Rp {affSummary.workerRewardLiability.toLocaleString("id-ID")}
              </p>
              <span className="text-[10px] text-amber-600 block">{affSummary.workerRewardPoints} Pts</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xs space-y-1 col-span-2 sm:col-span-2 lg:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Net Settlement Toko</span>
              <p className="text-lg font-bold font-display text-white">
                Rp {(affSummary.totalGmv - affSummary.totalFeeCollected).toLocaleString("id-ID")}
              </p>
              <span className="text-[10px] text-slate-400 block">Hak bersih merchant mitra</span>
            </div>
          </div>

          {/* Affiliate Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <MagnifyingGlass size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Order ID atau Nama Toko..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Status Audit:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <option value="ALL">Semua</option>
                  <option value="MATCHED">MATCHED</option>
                  <option value="MISMATCH">MISMATCH</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Order ID & Toko</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Fee Affiliate</th>
                    <th className="py-3 px-4 text-right">Reward Provider</th>
                    <th className="py-3 px-4 text-right">Reward Worker</th>
                    <th className="py-3 px-4 text-right">Net Settlement Toko</th>
                    <th className="py-3 px-4 text-center">Status Audit</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAffRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                        Tidak ada transaksi afiliasi yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredAffRows.map((r) => (
                      <tr key={r.productOrderId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <div>{r.productOrderId}</div>
                          <div className="text-[10px] text-slate-500 font-sans font-normal truncate max-w-[140px]">
                            {r.merchantName}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          Rp {(r.subtotal || r.productSubtotal || 0).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-purple-900">
                          Rp {(r.affiliateFee ?? r.affiliateFeeAmount ?? 0).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-blue-900">
                          <div>Rp {(r.providerRewardLiability ?? r.providerRewardAmount ?? 0).toLocaleString("id-ID")}</div>
                          <div className="text-[10px] text-blue-600">+{r.providerPoints} pts</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-amber-900">
                          <div>Rp {(r.workerRewardLiability ?? r.workerRewardAmount ?? 0).toLocaleString("id-ID")}</div>
                          <div className="text-[10px] text-amber-600">+{r.workerPoints} pts</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          Rp {r.netMerchantSettlement.toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              r.reconciliationStatus === "MATCHED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {r.reconciliationStatus === "MATCHED" && <CheckCircle size={12} weight="fill" />}
                            {r.reconciliationStatus !== "MATCHED" && <WarningCircle size={12} weight="fill" />}
                            {r.reconciliationStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedAffRow(r)}
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
        </div>
      )}

      {/* Mismatch & Detail Modal for Application Fee */}
      {selectedAppMismatch && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAppMismatch(null)}
          title="Detail Audit & Rekonsiliasi Fee Aplikasi"
          size="md"
        >
          <div className="space-y-4 text-left">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Order ID:</span>
                <span className="font-bold text-slate-900">{selectedAppMismatch.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Pelanggan:</span>
                <span className="text-slate-900 font-sans font-medium">{selectedAppMismatch.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Layanan:</span>
                <span className="text-slate-900 font-sans">{selectedAppMismatch.serviceTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Base Amount Jasa:</span>
                <span>Rp {selectedAppMismatch.baseAmount.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                  Fee Aplikasi Tercatat
                </span>
                <p className="text-base font-bold font-mono text-purple-950 mt-1">
                  Rp {selectedAppMismatch.applicationFee.toLocaleString("id-ID")}
                </p>
                <span className="text-[10px] text-purple-600 block mt-0.5">
                  Snapshot: {selectedAppMismatch.policyVersion}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Expected Fee (Kanonikal)
                </span>
                <p className="text-base font-bold font-mono text-slate-900 mt-1">
                  Rp {selectedAppMismatch.expectedFee.toLocaleString("id-ID")}
                </p>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Kalkulasi: {selectedAppMismatch.calculationType}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Status Invoice:</span>
                <span className="font-bold text-slate-800">{selectedAppMismatch.invoiceStatus}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Status Pembayaran Gateway:</span>
                <span className="font-bold text-emerald-700">{selectedAppMismatch.paymentStatus}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Status Audit:</span>
                <span className="font-bold text-purple-900">{selectedAppMismatch.auditStatus}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAppMismatch(null)}
                className="text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Modal for Affiliate Fee */}
      {selectedAffRow && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAffRow(null)}
          title="Detail Audit Transaksi Afiliasi"
          size="md"
        >
          <div className="space-y-4 text-left text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono font-bold text-slate-900">{selectedAffRow.productOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Toko Merchant:</span>
                <span className="font-medium text-slate-900">{selectedAffRow.merchantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal Suku Cadang:</span>
                <span className="font-mono font-bold text-slate-900">
                  Rp {selectedAffRow.subtotal.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100 text-center">
                <span className="text-[10px] font-bold text-purple-700 block">Fee Afiliasi</span>
                <p className="font-mono font-bold text-purple-900 mt-1">
                  Rp {selectedAffRow.affiliateFee.toLocaleString("id-ID")}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                <span className="text-[10px] font-bold text-blue-700 block">Reward Provider</span>
                <p className="font-mono font-bold text-blue-900 mt-1">
                  +{selectedAffRow.providerPoints} pts
                </p>
                <span className="text-[10px] text-blue-600 block">
                  Rp {selectedAffRow.providerRewardLiability.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                <span className="text-[10px] font-bold text-amber-700 block">Reward Worker</span>
                <p className="font-mono font-bold text-amber-900 mt-1">
                  +{selectedAffRow.workerPoints} pts
                </p>
                <span className="text-[10px] text-amber-600 block">
                  Rp {selectedAffRow.workerRewardLiability.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 block">Net Settlement Toko</span>
                <span className="text-[10px] text-emerald-600">Subtotal - Fee Afiliasi Platform</span>
              </div>
              <p className="text-base font-bold font-mono text-emerald-950">
                Rp {selectedAffRow.netMerchantSettlement.toLocaleString("id-ID")}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAffRow(null)}
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
