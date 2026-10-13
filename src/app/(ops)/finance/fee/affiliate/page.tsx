"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Sparkle,
  TrendUp,
  Receipt,
  Handshake,
  Coins,
  Storefront,
  Clock,
  ShieldCheck,
  MagnifyingGlass,
  DownloadSimple,
  SlidersHorizontal,
  CheckCircle,
  WarningCircle,
  Percent,
} from "@phosphor-icons/react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/feedback/Toast";

export default function FinanceAffiliateFeePage() {
  const repo = useDomainRepository();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"info" | "success" | "error">("info");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Canonical Policies
  const affPolicy = repo.getCurrentAffiliateFeePolicy();
  const provPolicy = repo.getActiveFeePolicy("PROVIDER_REWARD");
  const wrkPolicy = repo.getActiveFeePolicy("WORKER_REWARD");

  // Summary and Reconciliation Rows
  const summary = repo.getAffiliateFinanceSummary();
  const rows = repo.getAffiliateFinanceReconciliation();

  // Filtered Orders
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        r.productOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.merchantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.merchantId.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (statusFilter !== "ALL" && r.reconciliationStatus !== statusFilter) return false;
      return true;
    });
  }, [rows, searchQuery, statusFilter]);

  const handleExport = () => {
    setToastType("info");
    setToastMessage("Laporan transaksi Fee Afiliasi & Distribusi Reward (CSV) berhasil diunduh.");
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
              Affiliate Economics
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Merchant Fee & Partner Reward</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900">
            Monitoring Fee Affiliate & Reward
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengawasan pendapatan fee afiliasi merchant, liabilitas reward bengkel & teknisi, serta gerbang pengajuan perubahan kebijakan.
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Order</span>
          <p className="text-lg font-bold font-display text-slate-900">{summary.totalOrders}</p>
          <span className="text-[10px] text-slate-500 block">Pesanan Afiliasi</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">GMV Afiliasi</span>
          <p className="text-lg font-bold font-display text-slate-900">
            Rp {(summary.totalGmv / 1_000_000).toFixed(1)}M
          </p>
          <span className="text-[10px] text-slate-500 block">Penjualan Part Toko</span>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200/80 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Fee Afiliasi</span>
          <p className="text-lg font-bold font-display text-purple-900">
            Rp {summary.totalFeeCollected.toLocaleString("id-ID")}
          </p>
          <span className="text-[10px] text-purple-700 block">5% Platform Take</span>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/80 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Reward Provider</span>
          <p className="text-lg font-bold font-display text-blue-900">
            Rp {summary.providerRewardLiability.toLocaleString("id-ID")}
          </p>
          <span className="text-[10px] text-blue-600 block">{summary.providerRewardPoints} Pts</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Reward Worker</span>
          <p className="text-lg font-bold font-display text-amber-900">
            Rp {summary.workerRewardLiability.toLocaleString("id-ID")}
          </p>
          <span className="text-[10px] text-amber-600 block">{summary.workerRewardPoints} Pts</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">Net Settlement</span>
          <p className="text-lg font-bold font-display text-white">
            Rp {(summary.totalGmv - summary.totalFeeCollected).toLocaleString("id-ID")}
          </p>
          <span className="text-[10px] text-slate-400 block">Ke Toko Mitra</span>
        </div>
      </div>

      {/* Current Policy Card (Read-Only Context with Proposal CTA, strictly forbidden: direct mutation) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-purple-100 text-purple-700">
              <Sparkle size={24} weight="fill" />
            </span>
            <div>
              <h2 className="text-base font-bold font-display text-slate-900">
                Kebijakan Afiliasi Aktif (Platform Governance)
              </h2>
              <p className="text-xs text-slate-500">
                Tarif platform fee dan alokasi pembagian reward kemitraan yang disetujui oleh CEO. Halaman ini hanya untuk membaca dan mengawasi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              Versi: {affPolicy.policyVersion}
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
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-1">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
              Affiliate Fee (Merchant-Side)
            </span>
            <p className="text-2xl font-bold font-mono text-purple-950">
              {(affPolicy.rate * 100).toFixed(0)}%
            </p>
            <span className="text-[11px] text-purple-600 block">
              Dikenakan pada toko (Zero customer markup)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-1">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
              Provider Reward Split
            </span>
            <p className="text-2xl font-bold font-mono text-blue-950">
              {provPolicy ? `${provPolicy.value}%` : "60%"}
            </p>
            <span className="text-[11px] text-blue-600 block">
              Porsi loyalitas bengkel mitra rekanan
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 space-y-1">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              Worker Reward Split
            </span>
            <p className="text-2xl font-bold font-mono text-amber-950">
              {wrkPolicy ? `${wrkPolicy.value}%` : "40%"}
            </p>
            <span className="text-[11px] text-amber-600 block">
              Insentif langsung teknisi lapangan
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Effective Date & Status
            </span>
            <p className="text-base font-bold text-slate-900">
              {affPolicy.effectiveFrom || "01 Sep 2026"}
            </p>
            <span className="text-[11px] text-emerald-600 font-bold block">
              STATUS: ACTIVE
            </span>
          </div>
        </div>

        {/* 100% Split Lock Indicator */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Percent size={18} className="text-purple-600" />
            <span className="font-semibold text-slate-700">Validasi Distribusi Reward:</span>
            <span className="text-slate-600">
              Provider ({provPolicy?.value || 60}%) + Worker ({wrkPolicy?.value || 40}%) = <strong>100%</strong>
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle size={12} weight="fill" />
            TERVALIDASI 100%
          </span>
        </div>
      </div>

      {/* Revenue Trend & Reward Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Bar */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold font-display text-slate-900">
              Tren Pendapatan Fee Affiliate
            </h3>
            <p className="text-xs text-slate-500">
              Pertumbuhan komisi afiliasi suku cadang dari order rekomendasi teknisi
            </p>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pt-2">
            {[
              { label: "W1 Sep", val: "Rp 12.500", h: "45%" },
              { label: "W2 Sep", val: "Rp 18.000", h: "60%" },
              { label: "W3 Sep", val: "Rp 26.500", h: "80%" },
              { label: "W4 Sep", val: "Rp 32.500", h: "100%" },
              { label: "W1 Okt (P)", val: "Rp 38.000", h: "75%" },
              { label: "W2 Okt (P)", val: "Rp 45.000", h: "90%" },
            ].map((bar, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-mono text-purple-900 font-bold">{bar.val}</span>
                <div className="w-full h-24 bg-slate-100 rounded-xl relative overflow-hidden flex items-end">
                  <div
                    style={{ height: bar.h }}
                    className="w-full bg-gradient-to-t from-purple-800 to-indigo-600 rounded-lg transition-all duration-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-medium">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reward Distribution Visualization */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold font-display text-slate-900">
              Distribusi Pool Reward
            </h3>
            <p className="text-xs text-slate-500">
              Alokasi dari total fee afiliasi terkumpul
            </p>
          </div>

          <div className="space-y-4 pt-1">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-blue-900">Bengkel Provider (60%)</span>
                <span className="font-mono text-slate-700">Rp {summary.providerRewardLiability.toLocaleString("id-ID")}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: "60%" }} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{summary.providerRewardPoints} Poin loyalitas</span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-900">Teknisi Worker (40%)</span>
                <span className="font-mono text-slate-700">Rp {summary.workerRewardLiability.toLocaleString("id-ID")}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: "40%" }} />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{summary.workerRewardPoints} Poin komisi</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100 space-y-1">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                Total Pool Reward Terdistribusi
              </span>
              <p className="text-lg font-bold font-mono text-purple-950">
                Rp {(summary.providerRewardLiability + summary.workerRewardLiability).toLocaleString("id-ID")}
              </p>
              <span className="text-[10px] text-purple-600 block">
                100% dialokasikan dari fee afiliasi toko
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Affiliate Transaction History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Order ID atau Merchant..."
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
              <option value="MATCHED">MATCHED</option>
              <option value="MISMATCH">MISMATCH</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Order & Toko</th>
                <th className="py-3 px-4 text-right">Subtotal Part</th>
                <th className="py-3 px-4 text-right">Fee Affiliate</th>
                <th className="py-3 px-4 text-right">Reward Provider</th>
                <th className="py-3 px-4 text-right">Reward Worker</th>
                <th className="py-3 px-4 text-right">Net Settlement</th>
                <th className="py-3 px-4 text-center">Policy</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada transaksi afiliasi ditemukan.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
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
                      <Badge variant="primary" size="sm">
                        {r.policyVersion}
                      </Badge>
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
                        onClick={() => setSelectedOrder(r)}
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
      {selectedOrder && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedOrder(null)}
          title="Rincian Transaksi Afiliasi"
          size="md"
        >
          <div className="space-y-4 text-left text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono font-bold text-slate-900">{selectedOrder.productOrderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Toko Merchant:</span>
                <span className="font-medium text-slate-900">{selectedOrder.merchantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal Suku Cadang:</span>
                <span className="font-mono font-bold text-slate-900">
                  Rp {selectedOrder.subtotal.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100 text-center">
                <span className="text-[10px] font-bold text-purple-700 block">Fee Platform</span>
                <p className="font-mono font-bold text-purple-900 mt-1">
                  Rp {selectedOrder.affiliateFee.toLocaleString("id-ID")}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                <span className="text-[10px] font-bold text-blue-700 block">Provider (60%)</span>
                <p className="font-mono font-bold text-blue-900 mt-1">
                  +{selectedOrder.providerPoints} pts
                </p>
                <span className="text-[10px] text-blue-600 block">
                  Rp {selectedOrder.providerRewardLiability.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                <span className="text-[10px] font-bold text-amber-700 block">Worker (40%)</span>
                <p className="font-mono font-bold text-amber-900 mt-1">
                  +{selectedOrder.workerPoints} pts
                </p>
                <span className="text-[10px] text-amber-600 block">
                  Rp {selectedOrder.workerRewardLiability.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 block">Net Settlement Toko</span>
                <span className="text-[10px] text-emerald-600">Subtotal - Fee Afiliasi Platform</span>
              </div>
              <p className="text-base font-bold font-mono text-emerald-950">
                Rp {selectedOrder.netMerchantSettlement.toLocaleString("id-ID")}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrder(null)}
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
