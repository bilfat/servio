"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MagnifyingGlass,
  ShieldCheck,
  ArrowsClockwise,
  Eye,
  Copy,
  Check,
  CheckCircle,
  Clock,
  CalendarBlank,
  Wallet,
  Receipt,
  ArrowSquareOut,
  Info,
  WarningCircle,
  FileText,
  Building,
  User,
  ArrowRight,
  CurrencyCircleDollar,
} from "@phosphor-icons/react";
import { financeApi } from "@/lib/servioApi";
import { BackendRefundTransaction } from "@/types/finance";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";

interface RefundSummaryState {
  total_count: number;
  pending_processing_count: number;
  succeeded_count: number;
  failed_count: number;
  reversed_count: number;
  total_credited_net_idr: number;
  total_credited_gross_idr: number;
  count_all: number;
  count_barang_05a: number;
  count_jasa_05b: number;
}

export default function RefundOperationsQueuePage() {
  const [refunds, setRefunds] = useState<BackendRefundTransaction[]>([]);
  const [summary, setSummary] = useState<RefundSummaryState>({
    total_count: 0,
    pending_processing_count: 0,
    succeeded_count: 0,
    failed_count: 0,
    reversed_count: 0,
    total_credited_net_idr: 0,
    total_credited_gross_idr: 0,
    count_all: 0,
    count_barang_05a: 0,
    count_jasa_05b: 0,
  });

  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [channelFilter, setChannelFilter] = useState<"ALL" | "BARANG_05A" | "JASA_05B">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Inspection Modal State
  const [selectedRefund, setSelectedRefund] = useState<BackendRefundTransaction | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchRefunds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await financeApi.ops.refunds({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        channel: channelFilter !== "ALL" ? channelFilter : undefined,
        q: searchQuery.trim() || undefined,
        page: currentPage,
        per_page: 20,
      });

      if (res && res.data) {
        const payload = res.data as any;
        setRefunds(payload.data || []);
        setTotalCount(payload.total || 0);
        setCurrentPage(payload.current_page || 1);
        setLastPage(payload.last_page || 1);

        if (payload.summary) {
          setSummary(payload.summary);
        }
      }
    } catch (err: unknown) {
      console.error("Gagal memuat log refund dari Finance Service:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat daftar pengembalian dana.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, channelFilter, searchQuery, currentPage]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleOpenDetail = async (refund: BackendRefundTransaction) => {
    setSelectedRefund(refund);
    setDetailData(null);
    setIsLoadingDetail(true);
    try {
      const res = await financeApi.ops.refundDetail(refund.id);
      if (res?.data) {
        setDetailData(res.data);
      }
    } catch (err) {
      console.warn("Gagal memuat rincian mendalam refund:", err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // One-click copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, key: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const formatRupiah = (val?: number | null) => `Rp ${Number(val || 0).toLocaleString("id-ID")}`;

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return (
        new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Jakarta",
        }).format(d) + " WIB"
      );
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatTimeOnly = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return (
        new Intl.DateTimeFormat("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Jakarta",
        }).format(d) + " WIB"
      );
    } catch {
      return "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCEEDED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-3xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>SUCCEEDED</span>
          </span>
        );
      case "REVERSED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 bg-purple-50 text-purple-800 border border-purple-200 shadow-3xs">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>REVERSED</span>
          </span>
        );
      case "PENDING":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 shadow-3xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            <span>PENDING</span>
          </span>
        );
      case "PROCESSING":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 bg-sky-50 text-[#0F4C81] border border-sky-200 shadow-3xs">
            <ArrowsClockwise size={11} className="animate-spin text-[#0F4C81]" />
            <span>PROCESSING</span>
          </span>
        );
      case "FAILED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-200 shadow-3xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>FAILED</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>{status}</span>
          </span>
        );
    }
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
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            Customer Refund &amp; S-Pay Credit Queue
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 mt-1">
            Monitoring Pengembalian Dana (Refund)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Audit eksekusi pendanaan refund 100% alokasi dana pesanan yang dibatalkan sah oleh 05A/05B, klaim After-Sales Phase 07, pengkreditan ke saldo S-Pay Customer, dan riwayat status rekonsiliasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-2 rounded-2xl bg-slate-100 text-slate-700">
            Total {summary.total_count} Refund Tercatat
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRefunds}
            disabled={loading}
            className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
          >
            <ArrowsClockwise className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin text-[#0F4C81]" : "text-slate-500"}`} />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Notice Banner: Boundary Clarification */}
      <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-sky-950 flex items-start gap-3 text-xs leading-relaxed">
        <ShieldCheck size={20} className="text-[#0F4C81] shrink-0 mt-0.5" weight="fill" />
        <div>
          <strong className="font-bold">Ketentuan Batas Domain Modul 06 (Finance V3):</strong>
          <p className="mt-0.5 text-sky-900">
            Keputusan pembatalan pesanan dan persetujuan klaim retur adalah hak prerogatif Modul 05A / 05B Order atau After-Sales 07. Finance bertugas memvalidasi pembayaran awal PAID, alokasi dana pesanan sah, memproses pendanaan, dan mengkreditkan tepat satu kali ke S-Pay Customer via double-entry ledger.
          </p>
        </div>
      </div>

      {/* Top 5 Real KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Refund
          </span>
          <span className="text-xl font-black font-display text-slate-900">
            {summary.total_count}
          </span>
          <span className="text-[11px] text-slate-500 block">Transaksi 05A, 05B &amp; 07</span>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200/80 p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
            Menunggu / Diproses
          </span>
          <span className="text-xl font-black font-display text-amber-600">
            {summary.pending_processing_count}
          </span>
          <span className="text-[11px] text-slate-500 block">PENDING / PROCESSING</span>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Berhasil (SUCCEEDED)
          </span>
          <span className="text-xl font-black font-display text-emerald-600">
            {summary.succeeded_count}
          </span>
          <span className="text-[11px] text-slate-500 block">Telah masuk ke S-Pay</span>
        </div>

        <div className="bg-white rounded-2xl border border-rose-200/80 p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
            Gagal (FAILED)
          </span>
          <span className="text-xl font-black font-display text-rose-600">
            {summary.failed_count}
          </span>
          <span className="text-[11px] text-slate-500 block">Perlu audit rekonsiliasi</span>
        </div>

        <div className="bg-white rounded-2xl border border-purple-200/80 p-4 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
            Total Dikreditkan S-Pay
          </span>
          <span className="text-lg font-black font-display text-purple-900 font-mono">
            Rp {summary.total_credited_net_idr.toLocaleString("id-ID")}
          </span>
          <div className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>Net aktif di dompet</span>
            {summary.reversed_count > 0 && (
              <span className="font-bold text-purple-700">
                {summary.reversed_count} Reversal
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CHANNEL FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
        {[
          { id: "ALL" as const, label: "Semua Refund", count: summary.count_all },
          { id: "BARANG_05A" as const, label: "Order Barang 05A", count: summary.count_barang_05a },
          { id: "JASA_05B" as const, label: "Order Jasa 05B", count: summary.count_jasa_05b },
        ].map((tab) => {
          const isActive = channelFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setChannelFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 shrink-0 cursor-pointer ${
                isActive
                  ? "bg-[#0F4C81] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari ID Refund, Alokasi, Nomor Order, Kasus 07, atau S-Pay Account..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="SUCCEEDED">SUCCEEDED (Berhasil)</option>
            <option value="REVERSED">REVERSED (Reversal/Audit)</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="FAILED">FAILED (Gagal)</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <ArrowsClockwise className="w-8 h-8 animate-spin text-[#0F4C81]" />
            <p className="text-xs font-medium text-slate-500">Memuat log transaksi refund resmi dari Finance 06...</p>
          </div>
        ) : refunds.length === 0 ? (
          <div className="p-16 text-center">
            <EmptyState
              title="Tidak Ada Riwayat Refund"
              description="Belum ada transaksi refund atau pembatalan pesanan yang cocok dengan kriteria filter."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Transaksi Refund</th>
                  <th className="py-3.5 px-4">Sumber Pesanan &amp; Alokasi</th>
                  <th className="py-3.5 px-4">Nominal Refund</th>
                  <th className="py-3.5 px-4">Kredit S-Pay</th>
                  <th className="py-3.5 px-4">Status &amp; Waktu</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {refunds.map((refund) => {
                  const isJasa = refund.source_kind === "JASA_05B";
                  const isAfterSales = refund.is_after_sales;
                  const isReversed = refund.status === "REVERSED";

                  return (
                    <tr
                      key={refund.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isReversed ? "bg-purple-50/20" : ""
                      }`}
                    >
                      {/* 1. Transaksi Refund */}
                      <td className="py-4 px-5 align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-slate-900 tracking-tight">
                              #{refund.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(refund.id, `id-${refund.id}`)}
                              title="Salin ID Refund"
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition cursor-pointer"
                            >
                              {copiedKey === `id-${refund.id}` ? (
                                <Check size={12} className="text-emerald-600" weight="bold" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                isJasa
                                  ? "bg-sky-50 text-[#0F4C81] border-sky-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}
                            >
                              {isJasa ? "05B Jasa" : "05A Barang"}
                            </span>
                            {isAfterSales && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                                07 After-Sales
                              </span>
                            )}
                          </div>

                          {refund.payment_intent_id && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                              <span className="truncate max-w-[160px]" title={refund.payment_intent_id}>
                                Pay: {refund.payment_intent_id}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(refund.payment_intent_id!, `pay-${refund.id}`)}
                                className="hover:text-slate-700 cursor-pointer"
                              >
                                {copiedKey === `pay-${refund.id}` ? (
                                  <Check size={10} className="text-emerald-600" />
                                ) : (
                                  <Copy size={10} />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Sumber Pesanan & Alokasi */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1.5 min-w-[210px] max-w-[280px]">
                          {refund.merchant_order_id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 font-mono text-xs">
                                #{refund.merchant_order_id}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(refund.merchant_order_id!, `order-${refund.id}`)}
                                title="Salin No. Order"
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                {copiedKey === `order-${refund.id}` ? (
                                  <Check size={12} className="text-emerald-600" weight="bold" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Pesanan Langsung</span>
                          )}

                          {refund.case_id && (
                            <div className="flex items-center gap-1">
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block truncate max-w-[220px]"
                                title={refund.case_id}
                              >
                                Kasus #{refund.case_id.replace(/^case-/, "")}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(refund.case_id!, `case-${refund.id}`)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                {copiedKey === `case-${refund.id}` ? (
                                  <Check size={10} className="text-emerald-600" />
                                ) : (
                                  <Copy size={10} />
                                )}
                              </button>
                            </div>
                          )}

                          {refund.payment_allocation_id && (
                            <div className="text-[10px] text-slate-400 font-mono truncate" title={`Alokasi: ${refund.payment_allocation_id}`}>
                              Alokasi: <span className="text-slate-600">{refund.payment_allocation_id.slice(0, 14)}...</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Nominal Refund */}
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-bold font-mono text-xs text-slate-900">
                            {formatRupiah(refund.requested_amount_idr)}
                          </div>
                          <div className="text-[10px] font-medium text-emerald-700 flex items-center gap-1">
                            <CheckCircle size={11} weight="fill" className="text-emerald-500" />
                            <span>100% Didanai Escrow</span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Kredit S-Pay */}
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div
                            className={`font-mono font-black text-xs ${
                              isReversed
                                ? "text-purple-700 line-through"
                                : refund.status === "SUCCEEDED"
                                ? "text-emerald-700"
                                : "text-slate-700"
                            }`}
                          >
                            +{formatRupiah(refund.credited_amount_idr)}
                          </div>
                          <div className="text-[10px]">
                            {isReversed ? (
                              <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                Dibalikkan (Reversal)
                              </span>
                            ) : (
                              <span className="text-slate-400">Masuk Saldo Dompet</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 5. Status & Waktu */}
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        <div className="space-y-1">
                          <div>{getStatusBadge(refund.status)}</div>
                          <div className="text-[11px] text-slate-500 leading-tight">
                            <div className="font-medium text-slate-700">
                              {formatDateOnly(refund.created_at)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {formatTimeOnly(refund.created_at)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 6. Aksi */}
                      <td className="py-4 px-5 align-top text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(refund)}
                          className="text-xs text-[#0F4C81] border-slate-200 hover:border-[#0F4C81] hover:bg-sky-50 rounded-xl font-bold cursor-pointer transition shadow-3xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Rincian
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {lastPage > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Halaman {currentPage} dari {lastPage} (Total {totalCount} transaksi)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="text-xs rounded-xl cursor-pointer"
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= lastPage || loading}
                onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                className="text-xs rounded-xl cursor-pointer"
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          STRUCTURED MODAL: RINCIAN AUDIT REFUND FINANCE 06 (REDESIGNED)
         ========================================================================= */}
      <Modal
        isOpen={!!selectedRefund}
        onClose={() => {
          setSelectedRefund(null);
          setDetailData(null);
        }}
        title="Audit Pengembalian Dana (Refund & S-Pay)"
        size="2xl"
      >
        {selectedRefund && (
          <div className="space-y-5 text-left font-body text-xs">
            {/* 1. HERO FINANCIAL HEADER BANNER */}
            <div
              className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                selectedRefund.status === "REVERSED"
                  ? "bg-gradient-to-r from-purple-50/90 via-fuchsia-50/40 to-white border-purple-200"
                  : selectedRefund.status === "SUCCEEDED"
                  ? "bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white border-emerald-200"
                  : "bg-gradient-to-r from-slate-50 via-slate-50/50 to-white border-slate-200"
              }`}
            >
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {selectedRefund.status === "REVERSED"
                    ? "Status Refund: Dibalikkan (Reversal)"
                    : "Total Nominal Dikreditkan ke S-Pay"}
                </span>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl sm:text-3xl font-black font-display font-mono ${
                      selectedRefund.status === "REVERSED"
                        ? "text-purple-900 line-through"
                        : "text-emerald-700"
                    }`}
                  >
                    {formatRupiah(selectedRefund.credited_amount_idr)}
                  </span>
                  {selectedRefund.status === "REVERSED" && (
                    <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      Reversal
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 pt-1 text-slate-600 font-mono text-[11px]">
                  <span>ID: #{selectedRefund.id}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedRefund.id, "hero-id")}
                    className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    title="Salin ID"
                  >
                    {copiedKey === "hero-id" ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-2">
                <div>{getStatusBadge(selectedRefund.status)}</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                      selectedRefund.source_kind === "JASA_05B"
                        ? "bg-sky-100 text-[#0F4C81] border-sky-200"
                        : "bg-emerald-100 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {selectedRefund.source_kind === "JASA_05B" ? "05B Order Jasa" : "05A Order Barang"}
                  </span>
                  {selectedRefund.is_after_sales && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                      Phase 07 After-Sales
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. CARD: INFORMASI SUMBER & IDENTITAS PESANAN */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3 shadow-3xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Receipt size={14} className="text-[#0F4C81]" weight="bold" />
                  <span>Konteks &amp; Sumber Pesanan</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Alasan: <strong className="text-slate-700">{selectedRefund.refund_reason_scope || "ORDER_CANCELLATION"}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Order No */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Nomor Order Asal</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 truncate">
                      {selectedRefund.merchant_order_id ? `#${selectedRefund.merchant_order_id}` : "-"}
                    </span>
                    {selectedRefund.merchant_order_id && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedRefund.merchant_order_id!, "modal-order")}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {copiedKey === "modal-order" ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* S-Pay Account */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Akun S-Pay Penerima</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 truncate" title={selectedRefund.customer_spay_account_id}>
                      {selectedRefund.customer_spay_account_id ? `${selectedRefund.customer_spay_account_id.slice(0, 14)}...` : "-"}
                    </span>
                    {selectedRefund.customer_spay_account_id && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedRefund.customer_spay_account_id!, "modal-spay")}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {copiedKey === "modal-spay" ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Customer ID */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">ID Customer</span>
                  <span className="font-mono font-bold text-slate-800 block truncate" title={selectedRefund.customer_id}>
                    {selectedRefund.customer_id ? `${selectedRefund.customer_id.slice(0, 14)}...` : "-"}
                  </span>
                </div>

                {/* Kasus After-Sales */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Kasus After-Sales 07</span>
                  <span className="font-mono font-bold text-indigo-700 block truncate" title={selectedRefund.case_id || ""}>
                    {selectedRefund.case_id ? `#${selectedRefund.case_id.replace(/^case-/, "")}` : "Bukan Kasus 07"}
                  </span>
                </div>
              </div>

              {/* Sub-meta details */}
              <div className="pt-2 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                <span className="truncate">
                  Org Merchant/Provider: <strong className="font-mono text-slate-700">{selectedRefund.merchant_org_id || "-"}</strong>
                </span>
                <span className="truncate">
                  Event Pembatalan: <strong className="font-mono text-slate-700">{selectedRefund.order_cancellation_event_id || "-"}</strong>
                </span>
              </div>
            </div>

            {/* 3. CARD: RINCIAN ALOKASI FINANSIAL (BREAKDOWN) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3 shadow-3xs">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <CurrencyCircleDollar size={15} className="text-emerald-600" weight="bold" />
                <span>Rincian Finansial &amp; Alokasi Pembayaran</span>
              </span>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Subtotal Produk / Jasa Asal:</span>
                  <span className="font-mono font-medium text-slate-900">
                    {formatRupiah(selectedRefund.product_subtotal_idr || selectedRefund.requested_amount_idr)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Alokasi Ongkir Pelanggan:</span>
                  <span className="font-mono font-medium text-slate-900">
                    {formatRupiah(selectedRefund.shipping_customer_idr || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Alokasi Biaya Aplikasi:</span>
                  <span className="font-mono font-medium text-slate-900">
                    {formatRupiah(selectedRefund.app_fee_allocated_idr || 0)}
                  </span>
                </div>

                <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center text-slate-700 font-semibold">
                    <span>Total Nominal Refund Diminta:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatRupiah(selectedRefund.requested_amount_idr)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-800 font-semibold">
                    <span>Nominal Didanai Escrow (100% Sah):</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatRupiah(selectedRefund.funded_amount_idr)}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                  <div>
                    <strong className="text-slate-900 text-xs block">Nominal Dikreditkan ke S-Pay:</strong>
                    <span className="text-[10px] text-slate-500">Masuk sebagai saldo aktif dompet pelanggan</span>
                  </div>
                  <strong
                    className={`text-base font-black font-mono ${
                      selectedRefund.status === "REVERSED"
                        ? "text-purple-700 line-through"
                        : "text-emerald-700"
                    }`}
                  >
                    +{formatRupiah(selectedRefund.credited_amount_idr)}
                  </strong>
                </div>

                {selectedRefund.status === "REVERSED" && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[11px] leading-relaxed">
                    <strong className="block font-bold">Catatan Audit Reversal:</strong>
                    Transaksi pengembalian dana ini telah dibalikkan (reversal) dalam audit rekonsiliasi berkala. Saldo kredit telah disesuaikan di double-entry ledger dan dinonaktifkan dari saldo tersedia S-Pay Customer.
                  </div>
                )}
              </div>
            </div>

            {/* 4. CARD: LINIMASA AUDIT & REKAM MUTASI SALDO S-PAY */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3 shadow-3xs">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Clock size={15} className="text-[#0F4C81]" weight="bold" />
                <span>Linimasa &amp; Rekam Mutasi S-Pay (Ledger Movement)</span>
              </span>

              {/* Timestamp Progression */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">Waktu Dibuat:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatDateTime(selectedRefund.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Waktu Pendanaan:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatDateTime(selectedRefund.funded_at)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold block">Waktu Kredit S-Pay:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {formatDateTime(selectedRefund.credited_at)}
                  </span>
                </div>
              </div>

              {/* Mutasi Ledger Detail */}
              {isLoadingDetail ? (
                <div className="py-4 text-center text-slate-400 text-xs">
                  <ArrowsClockwise className="w-4 h-4 animate-spin inline mr-1.5" />
                  Memuat riwayat mutasi ledger dan audit log...
                </div>
              ) : (
                <>
                  {detailData?.movements && detailData.movements.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Mutasi Saldo S-Pay (Double-Entry Ledger):
                      </span>
                      <div className="space-y-1.5">
                        {detailData.movements.map((m: any) => (
                          <div
                            key={m.id}
                            className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-900 text-xs">#{m.id}</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${
                                    m.direction === "CREDIT"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {m.movement_type} ({m.direction})
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono block">
                                Saldo: Rp {m.available_before_idr?.toLocaleString("id-ID")} &rarr; Rp {m.available_after_idr?.toLocaleString("id-ID")}
                              </span>
                            </div>
                            <span className="font-mono font-black text-emerald-700 text-sm">
                              +{m.amount_idr?.toLocaleString("id-ID")} IDR
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailData?.audit_logs && detailData.audit_logs.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Log Audit Finansial:
                      </span>
                      <div className="space-y-1">
                        {detailData.audit_logs.map((log: any) => (
                          <div
                            key={log.id}
                            className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <strong className="text-slate-800 font-mono">{log.action}</strong>
                              <span className="text-slate-400 ml-2">via {log.actor_service || "finance-service"}</span>
                            </div>
                            <span className="font-mono text-emerald-700 font-bold">{log.result}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 5. FOOTER & AUDIT INTEGRITY NOTE */}
            <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100 text-[11px] text-sky-950 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#0F4C81] shrink-0" weight="fill" />
              <span>
                <strong>Audit Finansial Read-Only:</strong> Seluruh mutasi dicatat secara atomik pada Double-Entry Ledger Modul 06. Rekonsiliasi saldo berjalan otomatis sesuai kontrak integritas finansial.
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Link
                  href="/finance/reconciliation"
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <span>Rekonsiliasi Bank</span>
                  <ArrowSquareOut size={13} />
                </Link>
                <Link
                  href="/finance"
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <span>Dashboard Finansial</span>
                  <ArrowSquareOut size={13} />
                </Link>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRefund(null);
                  setDetailData(null);
                }}
                className="rounded-xl px-5 py-2 text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
