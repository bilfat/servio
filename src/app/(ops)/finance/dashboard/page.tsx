"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bank,
  Receipt,
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  Scales,
  TrendUp,
  HandCoins,
  ArrowRight,
  Storefront,
  LockKey,
  ArrowsClockwise,
  ClockCounterClockwise,
  X,
  ChartPie,
  ChartBar,
  ChartLineUp,
  HourglassMedium,
  CheckFat,
  ArrowUp,
  ArrowDown,
  Sparkle,
  Money,
  SlidersHorizontal,
  Clock,
} from "@phosphor-icons/react";
import { financeApi } from "@/lib/servioApi";
import {
  BackendRevenueOverview,
  BackendReconciliation,
  BackendPaymentIntent,
  BackendRefundTransaction,
  BackendWithdrawalRequest,
  FeePolicyGroupModel,
} from "@/types/finance";
import { Toast } from "@/components/feedback/Toast";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

type MainFinanceTab = "grafik" | "operasional";
type OperationalSubTab = "OVERVIEW" | "POLICY_REVENUE" | "MANAGED_FUNDS";

export default function FinanceDashboardPage() {
  // Top-level 2 Tabs: "grafik" (Tab 1 Kiri) vs "operasional" (Tab 2 Kanan)
  const [mainTab, setMainTab] = useState<MainFinanceTab>("grafik");

  // Operational sub-tab
  const [activeTab, setActiveTab] = useState<OperationalSubTab>("OVERVIEW");

  // Loading & states
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Finance Service V3 data
  const [revenueData, setRevenueData] = useState<BackendRevenueOverview | null>(null);
  const [reconData, setReconData] = useState<BackendReconciliation | null>(null);
  const [recentPayments, setRecentPayments] = useState<BackendPaymentIntent[]>([]);
  const [recentRefunds, setRecentRefunds] = useState<BackendRefundTransaction[]>([]);
  const [recentWithdrawals, setRecentWithdrawals] = useState<BackendWithdrawalRequest[]>([]);
  const [activePolicies, setActivePolicies] = useState<FeePolicyGroupModel[]>([]);
  const [selectedPolicyForHistory, setSelectedPolicyForHistory] = useState<FeePolicyGroupModel | null>(null);

  // Interactive hover tooltip states for charts
  const [hoveredWaterfallIndex, setHoveredWaterfallIndex] = useState<number | null>(null);
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<"CUST_FEE" | "MERCH_COMM" | null>(null);

  const fetchFinanceDashboardData = async () => {
    try {
      setError(null);
      const [revRes, reconRes, payRes, refRes, polRes, wdrRes] = await Promise.all([
        financeApi.revenue.overview().catch(() => ({ data: null })),
        financeApi.ops.reconciliation().catch(() => ({ data: null })),
        financeApi.ops.payments({ per_page: 50 }).catch(() => ({ data: { data: [] } })),
        financeApi.ops.refunds({ per_page: 50 }).catch(() => ({ data: { data: [] } })),
        financeApi.policies.list({ status: "ACTIVE" }).catch(() => ({ data: { items: [] } })),
        financeApi.ops.withdrawals({ per_page: 50 }).catch(() => ({ data: { data: [] } })),
      ]);

      if (revRes && revRes.data) {
        setRevenueData(revRes.data);
      }
      if (reconRes && reconRes.data) {
        setReconData(reconRes.data);
      }
      if (payRes && payRes.data && Array.isArray(payRes.data.data)) {
        setRecentPayments(payRes.data.data);
      }
      if (refRes && refRes.data && Array.isArray(refRes.data.data)) {
        setRecentRefunds(refRes.data.data);
      }
      if (wdrRes && wdrRes.data && Array.isArray(wdrRes.data.data)) {
        setRecentWithdrawals(wdrRes.data.data);
      }
      if (polRes && polRes.data && Array.isArray(polRes.data.items)) {
        setActivePolicies(polRes.data.items);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat ringkasan finance ops:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat data dari Finance Service.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFinanceDashboardData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFinanceDashboardData();
  };

  // =========================================================================
  // CALCULATIONS FOR ANIMATED CHARTS
  // =========================================================================
  const grossVolume = revenueData?.mock_payment_volume_idr || 0;
  const escrowHeld = revenueData?.held_liability_idr || 0;
  const merchantPayable = revenueData?.merchant_payable_idr || 0;
  const customerRefund = revenueData?.customer_refund_liability_idr || 0;
  const platformRevenue = revenueData?.total_collected_fee_idr || 0;

  // Safe Total for Cash Allocation Bar
  const safeTotalAlloc = Math.max(
    grossVolume,
    escrowHeld + merchantPayable + customerRefund + platformRevenue,
    1
  );

  const escrowPct = Math.round((escrowHeld / safeTotalAlloc) * 100);
  const merchantPct = Math.round((merchantPayable / safeTotalAlloc) * 100);
  const refundPct = Math.round((customerRefund / safeTotalAlloc) * 100);
  const revenuePct = Math.round((platformRevenue / safeTotalAlloc) * 100);

  // Revenue Streams Split
  const custFee = revenueData?.customer_product_app_fee_idr || 0;
  const merchComm = revenueData?.merchant_product_commission_idr || 0;
  const totalStream = Math.max(custFee + merchComm, 1);
  const custFeePct = Math.round((custFee / totalStream) * 100);
  const merchCommPct = 100 - custFeePct;

  // Payments Status Funnel
  const paidCount = recentPayments.filter((p) => p.status === "PAID").length;
  const pendingCount = recentPayments.filter((p) => p.status === "PENDING").length;
  const expiredCount = recentPayments.filter((p) => p.status === "EXPIRED").length;
  const failedCount = recentPayments.filter((p) => p.status === "FAILED").length;
  const totalPayments = Math.max(recentPayments.length, 1);
  const paymentSuccessRate = Math.round((paidCount / totalPayments) * 100);

  // Inflow vs Outflow
  const totalInflow = reconData?.metrics?.total_paid_payments_idr || grossVolume || 0;
  const totalOutflow =
    (reconData?.metrics?.total_withdrawals_completed_idr || 0) +
    (reconData?.metrics?.total_refunds_succeeded_idr || 0);
  const netLiquidityPool = Math.max(0, totalInflow - totalOutflow);

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
      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-sm">
          <WarningCircle size={20} className="text-rose-600 shrink-0 mt-0.5" weight="fill" />
          <div className="flex-1">
            <h4 className="font-bold">Kendala Koneksi Finance</h4>
            <p className="text-xs text-rose-800 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchFinanceDashboardData}
            className="text-xs font-bold px-3 py-1 bg-white border border-rose-300 rounded-xl hover:bg-rose-100"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 2. HEADER BANNER WITH TOP STATS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Pusat Operasional Finansial
              </span>

              <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                <Clock size={13} className="text-primary" />
                Sinkronisasi Langsung
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 tracking-tight">
              Ringkasan Operasional Finansial
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Pusat pemantauan lalu lintas kas masuk QRIS/VA, penahanan uang (120 jam), pembagian pendapatan platform sesuai kebijakan CEO, saldo S-Pay mitra/pelanggan, dan integritas buku besar.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center justify-center cursor-pointer shadow-2xs"
              title="Segarkan Data"
            >
              <ArrowsClockwise
                size={18}
                className={isRefreshing ? "animate-spin text-[#0F4C81]" : ""}
              />
            </button>

            <Link
              href="/finance/payments"
              className="px-4 py-2.5 rounded-2xl bg-[#0F4C81] hover:bg-[#0B3860] text-white text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5"
            >
              <span>Pemantauan Pembayaran</span>
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </div>

        {/* Quick Stat Tiles in Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-sky-100 text-[#0F4C81] flex items-center justify-center shrink-0">
              <Receipt size={18} weight="bold" />
            </span>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Kas Masuk (Total Kotor)</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 font-display">
                {formatCurrency(grossVolume)}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <LockKey size={18} weight="bold" />
            </span>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Uang Ditahan (120 Jam)</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 font-display">
                {formatCurrency(escrowHeld)}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <TrendUp size={18} weight="bold" />
            </span>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Pendapatan SERVIO</p>
              <p className="text-base sm:text-lg font-bold text-emerald-800 font-display">
                {formatCurrency(platformRevenue)}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${reconData?.is_double_entry_balanced
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
                }`}
            >
              <Scales size={18} weight="bold" />
            </span>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Buku Besar</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 uppercase">
                {reconData?.is_double_entry_balanced ? "Seimbang" : "Selisih"}
              </p>
            </div>
          </div>
        </div>

        {/* 2 MAIN TABS SWITCHER: TAB 1 GRAFIK vs TAB 2 OPERASIONAL */}
        <div className="mt-6 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setMainTab("grafik")}
              className={`flex items-center gap-2 pb-3.5 px-2 text-sm font-bold transition-all relative ${mainTab === "grafik"
                ? "text-[#0F4C81] border-b-2 border-[#0F4C81]"
                : "text-slate-500 hover:text-slate-900"
                }`}
            >
              <ChartPie size={18} weight={mainTab === "grafik" ? "fill" : "regular"} />
              <span>Tab 1: Grafik & Analisis Likuiditas</span>
            </button>

            <button
              onClick={() => setMainTab("operasional")}
              className={`flex items-center gap-2 pb-3.5 px-2 text-sm font-bold transition-all relative ${mainTab === "operasional"
                ? "text-[#0F4C81] border-b-2 border-[#0F4C81]"
                : "text-slate-500 hover:text-slate-900"
                }`}
            >
              <SlidersHorizontal size={18} weight={mainTab === "operasional" ? "fill" : "regular"} />
              <span>Tab 2: Rincian Operasional Finansial</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-normal">
                3 Sub-Bagian
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading Screen */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400 bg-white rounded-3xl border border-slate-200">
          <ArrowsClockwise className="w-8 h-8 animate-spin text-[#0F4C81]" />
          <p className="text-xs font-medium text-slate-500">Memuat data operasional dari Finance Service...</p>
        </div>
      ) : (
        <>
          {/* ===================================================================
              TAB 1: GRAFIK & ANALISIS LIKUIDITAS (FULL ANIMASI)
              =================================================================== */}
          {mainTab === "grafik" && (
            <motion.div
              key="main-tab-grafik"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* TOP ROW: GRAFIK 1 (WATERFALL ALOKASI) & GRAFIK 2 (DONUT REVENUE STREAM) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* GRAFIK 1: WATERFALL ALOKASI KAS MASUK (7 Col) */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                          <Money size={20} className="text-[#0F4C81]" weight="duotone" />
                          <span>Alur Alokasi Kas Masuk (Total Kotor)</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Aliran dana kotor pembeli dibagi ke pos Uang Ditahan, Toko Mitra, Pelanggan, &amp; Pendapatan SERVIO
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-sky-50 text-[#0F4C81] text-xs font-mono font-bold border border-sky-200 shrink-0">
                        Total {formatCurrency(grossVolume)}
                      </span>
                    </div>

                    {/* Animated Stacked Progress Bar */}
                    <div className="my-5">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                        <span>Porsi Alokasi Dana Keseluruhan</span>
                        <span className="font-mono font-semibold">100% dari Kas Masuk</span>
                      </div>
                      <div className="w-full h-4 rounded-xl bg-slate-100 overflow-hidden flex shadow-inner p-0.5 gap-0.5">
                        {/* 1. Escrow Held */}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(escrowPct, 4)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-amber-500 rounded-lg cursor-pointer hover:brightness-110 transition relative group"
                          onMouseEnter={() => setHoveredWaterfallIndex(0)}
                          onMouseLeave={() => setHoveredWaterfallIndex(null)}
                        />
                        {/* 2. Merchant Payable */}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(merchantPct, 4)}%` }}
                          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                          className="h-full bg-emerald-500 rounded-lg cursor-pointer hover:brightness-110 transition relative group"
                          onMouseEnter={() => setHoveredWaterfallIndex(1)}
                          onMouseLeave={() => setHoveredWaterfallIndex(null)}
                        />
                        {/* 3. Customer Refund */}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(refundPct, 4)}%` }}
                          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                          className="h-full bg-purple-500 rounded-lg cursor-pointer hover:brightness-110 transition relative group"
                          onMouseEnter={() => setHoveredWaterfallIndex(2)}
                          onMouseLeave={() => setHoveredWaterfallIndex(null)}
                        />
                        {/* 4. Platform Revenue */}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(revenuePct, 4)}%` }}
                          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                          className="h-full bg-[#0F4C81] rounded-lg cursor-pointer hover:brightness-110 transition relative group"
                          onMouseEnter={() => setHoveredWaterfallIndex(3)}
                          onMouseLeave={() => setHoveredWaterfallIndex(null)}
                        />
                      </div>
                    </div>

                    {/* Detailed Cards for 4 Waterfall Streams */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* 1. Dana Ditahan Escrow */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`p-3.5 rounded-2xl border transition ${hoveredWaterfallIndex === 0
                          ? "bg-amber-50/80 border-amber-300 shadow-xs"
                          : "bg-slate-50/70 border-slate-200/70"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                            Uang Ditahan (120 Jam)
                          </span>
                          <span className="text-[10px] font-bold text-amber-800 px-1.5 py-0.5 rounded-full bg-amber-100">
                            {escrowPct}%
                          </span>
                        </div>
                        <p className="text-base font-extrabold text-slate-900 font-display">
                          {formatCurrency(escrowHeld)}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                          Proteksi pesanan belanja selama pengiriman & 5 hari garansi
                        </p>
                      </motion.div>

                      {/* 2. S-Pay Toko Siap Tarik */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`p-3.5 rounded-2xl border transition ${hoveredWaterfallIndex === 1
                          ? "bg-emerald-50/80 border-emerald-300 shadow-xs"
                          : "bg-slate-50/70 border-slate-200/70"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                            S-Pay Toko (Siap Tarik)
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800 px-1.5 py-0.5 rounded-full bg-emerald-100">
                            {merchantPct}%
                          </span>
                        </div>
                        <p className="text-base font-extrabold text-slate-900 font-display">
                          {formatCurrency(merchantPayable)}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                          Hak toko yang telah tuntas masa tahan dan dapat dicairkan ke bank
                        </p>
                      </motion.div>

                      {/* 3. S-Pay Refund Pelanggan */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`p-3.5 rounded-2xl border transition ${hoveredWaterfallIndex === 2
                          ? "bg-purple-50/80 border-purple-300 shadow-xs"
                          : "bg-slate-50/70 border-slate-200/70"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                            S-Pay Pengembalian Pelanggan
                          </span>
                          <span className="text-[10px] font-bold text-purple-800 px-1.5 py-0.5 rounded-full bg-purple-100">
                            {refundPct}%
                          </span>
                        </div>
                        <p className="text-base font-extrabold text-slate-900 font-display">
                          {formatCurrency(customerRefund)}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                          Dana pengembalian 100% atas pesanan yang dibatalkan
                        </p>
                      </motion.div>

                      {/* 4. Pendapatan Bersih SERVIO */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`p-3.5 rounded-2xl border transition ${hoveredWaterfallIndex === 3
                          ? "bg-blue-50/80 border-blue-300 shadow-xs"
                          : "bg-slate-50/70 border-slate-200/70"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C81] shrink-0" />
                            Pendapatan Bersih SERVIO
                          </span>
                          <span className="text-[10px] font-bold text-[#0F4C81] px-1.5 py-0.5 rounded-full bg-blue-100">
                            {revenuePct}%
                          </span>
                        </div>
                        <p className="text-base font-extrabold text-[#0F4C81] font-display">
                          {formatCurrency(platformRevenue)}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                          Biaya aplikasi pelanggan & komisi mitra toko resmi platform
                        </p>
                      </motion.div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <span>Rekonsiliasi per transaksi terlindungi otomatis</span>
                    </span>
                    <button
                      onClick={() => {
                        setMainTab("operasional");
                        setActiveTab("OVERVIEW");
                      }}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Lihat Rincian Kas &rarr;</span>
                    </button>
                  </div>
                </div>

                {/* GRAFIK 2: KOMPOSISI PENDAPATAN PLATFORM (DONUT SVG) (5 Col) */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                          <ChartPie size={20} className="text-emerald-700" weight="duotone" />
                          <span>Komposisi Pendapatan Platform</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Porsi biaya aplikasi pelanggan vs komisi toko mitra
                        </p>
                      </div>
                    </div>

                    {/* Animated Donut SVG */}
                    <div className="my-5 flex flex-col sm:flex-row items-center justify-center gap-6">
                      <div className="relative w-40 h-40 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#f1f5f9"
                            strokeWidth="11"
                            fill="transparent"
                          />
                          {/* Segment 1: Biaya Aplikasi Customer (Rose / Blue) */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#0F4C81"
                            strokeWidth="11"
                            strokeDasharray="238.7"
                            initial={{ strokeDashoffset: 238.7 }}
                            animate={{
                              strokeDashoffset: 238.7 - (238.7 * custFeePct) / 100,
                            }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            fill="transparent"
                            strokeLinecap="round"
                            className="cursor-pointer hover:stroke-[#0B3860] transition"
                            onMouseEnter={() => setHoveredDonutSegment("CUST_FEE")}
                            onMouseLeave={() => setHoveredDonutSegment(null)}
                          />
                          {/* Segment 2: Komisi Toko (Emerald) */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#10b981"
                            strokeWidth="11"
                            strokeDasharray="238.7"
                            initial={{ strokeDashoffset: 238.7 }}
                            animate={{
                              strokeDashoffset: 238.7 - (238.7 * merchCommPct) / 100,
                            }}
                            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                            fill="transparent"
                            strokeLinecap="round"
                            className="cursor-pointer hover:stroke-[#059669] transition"
                            onMouseEnter={() => setHoveredDonutSegment("MERCH_COMM")}
                            onMouseLeave={() => setHoveredDonutSegment(null)}
                          />
                        </svg>

                        <div className="absolute flex flex-col items-center justify-center text-center p-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            Total Pendapatan
                          </span>
                          <span className="text-sm font-black text-slate-900 font-display mt-0.5">
                            {formatCurrency(platformRevenue)}
                          </span>
                          <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 rounded-full mt-0.5">
                            100% Diakui
                          </span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="space-y-3 text-xs flex-1">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className={`p-2.5 rounded-xl border transition ${hoveredDonutSegment === "CUST_FEE"
                            ? "bg-blue-50/80 border-[#0F4C81]"
                            : "bg-slate-50 border-slate-200/60"
                            }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C81] shrink-0" />
                              Biaya Aplikasi Pembeli
                            </span>
                            <span className="font-extrabold text-[#0F4C81] font-mono">
                              {custFeePct}%
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 font-mono">
                            {formatCurrency(custFee)}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Rp 2.000 / transaksi belanja produk
                          </p>
                        </motion.div>

                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className={`p-2.5 rounded-xl border transition ${hoveredDonutSegment === "MERCH_COMM"
                            ? "bg-emerald-50/80 border-emerald-500"
                            : "bg-slate-50 border-slate-200/60"
                            }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                              Komisi Penjualan Toko
                            </span>
                            <span className="font-extrabold text-emerald-700 font-mono">
                              {merchCommPct}%
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 font-mono">
                            {formatCurrency(merchComm)}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            5% dari subtotal suku cadang mitra toko
                          </p>
                        </motion.div>
                      </div>
                    </div>

                    {/* Active CEO Policy Tag */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">Regulasi Kebijakan Aktif</p>
                        <p className="text-[11px] text-slate-500">
                          {activePolicies.length > 0 ? activePolicies[0].display_name : "Kebijakan Standard V1.0"}
                        </p>
                      </div>
                      <Link
                        href="/finance/policies"
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        Atur Regulasi &rarr;
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Basis Akuntansi: Akrual Langsung (Real-time)
                    </span>
                    <button
                      onClick={() => {
                        setMainTab("operasional");
                        setActiveTab("POLICY_REVENUE");
                      }}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Rincian Kebijakan &rarr;</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: GRAFIK 3 (PAYMENT SLA FUNNEL) & GRAFIK 4 (ARUS KAS LIKUIDITAS) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* GRAFIK 3: CORONG STATUS PEMBAYARAN KAS MASUK (6 Col) */}
                <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                          <Receipt size={20} className="text-sky-600" weight="duotone" />
                          <span>Status & Tingkat Keberhasilan Pembayaran</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Konversi transaksi pelanggan QRIS / Akun Virtual (Batas Waktu 6 Jam)
                        </p>
                      </div>
                      <Badge variant="success" size="sm" className="font-mono font-bold">
                        {paymentSuccessRate}% Lunas
                      </Badge>
                    </div>

                    {/* Funnel Progress Bars */}
                    <div className="space-y-3.5 my-5">
                      {[
                        {
                          label: "Pembayaran Lunas",
                          count: paidCount,
                          color: "bg-emerald-500",
                          pct: Math.round((paidCount / totalPayments) * 100),
                          desc: "Uang berhasil masuk dan diverifikasi gerbang pembayaran",
                        },
                        {
                          label: "Menunggu Pembayaran",
                          count: pendingCount,
                          color: "bg-amber-500",
                          pct: Math.round((pendingCount / totalPayments) * 100),
                          desc: "Menunggu pembayaran dalam jendela batas waktu 6 jam",
                        },
                        {
                          label: "Kedaluwarsa (Batal)",
                          count: expiredCount,
                          color: "bg-rose-500",
                          pct: Math.round((expiredCount / totalPayments) * 100),
                          desc: "Pelanggan melewati batas waktu 6 jam, tagihan dibatalkan",
                        },
                        {
                          label: "Gagal Diproses",
                          count: failedCount,
                          color: "bg-slate-400",
                          pct: Math.round((failedCount / totalPayments) * 100),
                          desc: "Kendala teknis jaringan bank atau dibatalkan sistem",
                        },
                      ].map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                              {item.label}
                            </span>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-slate-400 text-[11px]">{item.pct}%</span>
                              <strong className="text-slate-900">{item.count} Transaksi</strong>
                            </div>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.pct}%` }}
                              transition={{ duration: 0.6, delay: idx * 0.08 }}
                              className={`h-full ${item.color} rounded-full`}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Total sampel: {recentPayments.length} transaksi
                    </span>
                    <Link
                      href="/finance/payments"
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Lihat Semua Log Transaksi &rarr;</span>
                    </Link>
                  </div>
                </div>

                {/* GRAFIK 4: BAROMETER ARUS KAS & LIKUIDITAS BANK (6 Col) */}
                <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                          <Scales size={20} className="text-indigo-600" weight="duotone" />
                          <span>Arus Kas Masuk vs Kas Keluar (Arus Likuiditas)</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Perbandingan total penerimaan kas vs pencairan dana (penarikan) &amp; pengembalian
                        </p>
                      </div>
                    </div>

                    {/* Dual Inflow vs Outflow Visual Cards */}
                    <div className="grid grid-cols-2 gap-4 my-5">
                      {/* Kas Masuk (Inflow) */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                            <ArrowDown size={14} weight="bold" />
                            Kas Masuk
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900">
                            Pembayaran
                          </span>
                        </div>
                        <p className="text-lg sm:text-xl font-black text-emerald-950 font-display">
                          {formatCurrency(totalInflow)}
                        </p>
                        <p className="text-[10px] text-emerald-700">
                          Total dana transaksi yang dibayar pembeli via QRIS &amp; Akun Virtual
                        </p>
                      </motion.div>

                      {/* Kas Keluar (Outflow) */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
                            <ArrowUp size={14} weight="bold" />
                            Kas Keluar
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-200/60 text-rose-900">
                            Pencairan
                          </span>
                        </div>
                        <p className="text-lg sm:text-xl font-black text-rose-950 font-display">
                          {formatCurrency(totalOutflow)}
                        </p>
                        <p className="text-[10px] text-rose-700">
                          Total penarikan saldo toko ke bank + pengembalian berhasil
                        </p>
                      </motion.div>
                    </div>

                    {/* Net Pool & Double-Entry Barometer */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">
                          Saldo Likuiditas Mengendap di Bank:
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(netLiquidityPool)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200">
                        <span className="text-slate-500 flex items-center gap-1">
                          <CheckFat size={13} className="text-emerald-600" weight="fill" />
                          Integritas Buku Besar (Debit-Kredit):
                        </span>
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded-md ${reconData?.is_double_entry_balanced
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                            }`}
                        >
                          {reconData?.is_double_entry_balanced
                            ? "SEIMBANG (Rp 0 SELISIH)"
                            : `SELISIH ${formatCurrency(reconData?.discrepancy_idr || 0)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Rekonsiliasi otomatis harian via Sistem Keuangan Inti
                    </span>
                    <button
                      onClick={() => {
                        setMainTab("operasional");
                        setActiveTab("MANAGED_FUNDS");
                      }}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Lihat Antrean Pencairan &rarr;</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================================================================
              TAB 2: RINCIAN OPERASIONAL FINANSIAL (EXISTING 3 SUB-TABS)
              =================================================================== */}
          {mainTab === "operasional" && (
            <motion.div
              key="main-tab-operasional"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* 3 SUB-TABS NAVIGATION */}
              <div className="border-b border-slate-200 pb-1">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <button
                    id="tab-btn-overview"
                    type="button"
                    onClick={() => setActiveTab("OVERVIEW")}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "OVERVIEW"
                      ? "bg-[#0F4C81] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                  >
                    <Receipt size={16} weight={activeTab === "OVERVIEW" ? "fill" : "bold"} />
                    <span>1. Arus Kas & Pembayaran Masuk</span>
                  </button>

                  <button
                    id="tab-btn-policy-revenue"
                    type="button"
                    onClick={() => setActiveTab("POLICY_REVENUE")}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "POLICY_REVENUE"
                      ? "bg-[#0F4C81] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                  >
                    <TrendUp size={16} weight={activeTab === "POLICY_REVENUE" ? "fill" : "bold"} />
                    <span>2. Distribusi Kebijakan Platform</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === "POLICY_REVENUE" ? "bg-white/20 text-white" : "bg-sky-100 text-sky-800"
                        }`}
                    >
                      {formatCurrency(revenueData?.total_collected_fee_idr ?? 0)}
                    </span>
                  </button>

                  <button
                    id="tab-btn-managed-funds"
                    type="button"
                    onClick={() => setActiveTab("MANAGED_FUNDS")}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "MANAGED_FUNDS"
                      ? "bg-[#0F4C81] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                  >
                    <Bank size={16} weight={activeTab === "MANAGED_FUNDS" ? "fill" : "bold"} />
                    <span>3. Dana Mitra, Pelanggan & Pencairan</span>
                  </button>
                </div>
              </div>

              {/* SUB-TAB 1: ARUS KAS & PEMBAYARAN MASUK */}
              {activeTab === "OVERVIEW" && (
                <div className="space-y-8">
                  {/* Core Metric Tiles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Volume Pembayaran Masuk */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Total Pembayaran Masuk
                        </span>
                        <span className="p-2 rounded-xl bg-sky-50 text-[#0F4C81]">
                          <Receipt size={20} weight="duotone" />
                        </span>
                      </div>
                      <div className="mt-3">
                        <span className="text-2xl font-black font-display text-slate-900 block">
                          {formatCurrency(revenueData?.mock_payment_volume_idr ?? 0)}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Total kas kotor transaksi yang telah dibayar lunas oleh Pelanggan.
                        </span>
                      </div>
                    </div>

                    {/* 2. Dana Tertahan (Uang Ditahan 120 Jam) */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Uang Ditahan (120 Jam)
                        </span>
                        <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                          <LockKey size={20} weight="duotone" />
                        </span>
                      </div>
                      <div className="mt-3">
                        <span className="text-2xl font-black font-display text-slate-900 block">
                          {formatCurrency(revenueData?.held_liability_idr ?? 0)}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Hak bersih toko yang masih diamankan sistem selama pengiriman & proteksi 5 hari.
                        </span>
                      </div>
                    </div>

                    {/* 3. Pendapatan Kotor SERVIO Terkumpul */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Pendapatan Kotor SERVIO
                        </span>
                        <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                          <TrendUp size={20} weight="duotone" />
                        </span>
                      </div>
                      <div className="mt-3">
                        <span className="text-2xl font-black font-display text-emerald-800 block">
                          {formatCurrency(revenueData?.total_collected_fee_idr ?? 0)}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Total biaya aplikasi pelanggan & komisi toko dari kebijakan aktif platform.
                        </span>
                      </div>
                    </div>

                    {/* 4. Integritas Buku Besar */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Integritas Buku Besar
                        </span>
                        <span
                          className={`p-2 rounded-xl ${reconData?.is_double_entry_balanced
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                            }`}
                        >
                          <Scales size={20} weight="duotone" />
                        </span>
                      </div>
                      <div className="mt-3">
                        <span
                          className={`text-sm font-black uppercase tracking-tight block ${reconData?.is_double_entry_balanced ? "text-emerald-700" : "text-rose-700"
                            }`}
                        >
                          {reconData?.is_double_entry_balanced ? "SEIMBANG (SESUAI)" : "SELISIH TERDETEKSI"}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Selisih: {formatCurrency(reconData?.discrepancy_idr ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Shortcut Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                      href="/finance/payments"
                      className="p-5 rounded-3xl bg-white border border-slate-200/90 hover:border-[#0F4C81] transition shadow-xs group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-sky-50 text-[#0F4C81]">
                          <Receipt size={22} weight="duotone" />
                        </div>
                        <ArrowRight
                          size={16}
                          className="text-slate-400 group-hover:text-[#0F4C81] group-hover:translate-x-1 transition"
                        />
                      </div>
                      <h3 className="font-black text-slate-900 text-sm">Pemantauan Pembayaran</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Pantau daftar transaksi QRIS & Akun Virtual, status kedaluwarsa 6 jam, dan simulasi uji coba pembayaran.
                      </p>
                    </Link>

                    <Link
                      href="/finance/payouts"
                      className="p-5 rounded-3xl bg-white border border-slate-200/90 hover:border-emerald-600 transition shadow-xs group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700">
                          <Bank size={22} weight="duotone" />
                        </div>
                        <ArrowRight
                          size={16}
                          className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition"
                        />
                      </div>
                      <h3 className="font-black text-slate-900 text-sm">Pencairan Dana (Penarikan)</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Proses penarikan saldo S-Pay ke rekening bank fisik (Mitra Toko & Pelanggan) biaya Rp 2.500.
                      </p>
                    </Link>

                    <Link
                      href="/finance/refunds"
                      className="p-5 rounded-3xl bg-white border border-slate-200/90 hover:border-purple-600 transition shadow-xs group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-purple-50 text-purple-700">
                          <HandCoins size={22} weight="duotone" />
                        </div>
                        <ArrowRight
                          size={16}
                          className="text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition"
                        />
                      </div>
                      <h3 className="font-black text-slate-900 text-sm">Pengembalian Dana (Batal & Retur)</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Pantau eksekusi pengembalian 100% dana pesanan batal langsung ke S-Pay Pelanggan.
                      </p>
                    </Link>
                  </div>

                  {/* Table: Recent Payments */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt size={18} className="text-[#0F4C81]" weight="duotone" />
                        <h3 className="text-sm font-black text-slate-900">Pembayaran Kas Masuk Terkini</h3>
                      </div>
                      <Link href="/finance/payments" className="text-xs font-bold text-[#0F4C81] hover:underline">
                        Lihat Semua Pembayaran &rarr;
                      </Link>
                    </div>

                    {recentPayments.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-200/80">
                        Belum ada transaksi pembayaran yang tercatat di database Finance Service.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {recentPayments.slice(0, 5).map((pay) => (
                          <div key={pay.id} className="py-3 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-mono text-[11px] font-bold text-slate-900">{pay.id}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Metode: {pay.method} &bull; {new Date(pay.issued_at).toLocaleDateString("id-ID")}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-extrabold text-slate-800">
                                {formatCurrency(pay.amount_idr)}
                              </div>
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${pay.status === "PAID"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : pay.status === "PENDING"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-700"
                                  }`}
                              >
                                {pay.status === "PAID" ? "Lunas" : pay.status === "PENDING" ? "Menunggu" : pay.status === "EXPIRED" ? "Kedaluwarsa" : "Gagal"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: DISTRIBUSI KEBIJAKAN PLATFORM */}
              {activeTab === "POLICY_REVENUE" && (
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-[#0F4C81] text-[10px] font-bold uppercase tracking-wider border border-sky-200">
                          Ringkasan Pos Biaya
                        </span>
                        <span className="text-xs text-slate-400">&bull; Kebijakan Aktif CEO</span>
                      </div>
                      <h2 className="text-lg font-black font-display text-slate-900 tracking-tight">
                        Distribusi Pendapatan Kebijakan Platform
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pantau total pesanan/transaksi dan pendapatan yang dihasilkan dari masing-masing aturan biaya.
                      </p>
                    </div>

                    <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-left sm:text-right shrink-0">
                      <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                        Total Pendapatan Terkumpul
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-display text-emerald-900 mt-0.5 block">
                        {formatCurrency(revenueData?.total_collected_fee_idr ?? 0)}
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const activePoliciesOnly = activePolicies.filter(
                      (group) =>
                        group.business_status === "ACTIVE" &&
                        group.versions?.some((v) => v.status === "ACTIVE")
                    );

                    if (activePoliciesOnly.length === 0) {
                      return (
                        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                          <ShieldCheck size={36} className="text-slate-300 mx-auto" weight="duotone" />
                          <h4 className="font-bold text-slate-800 text-sm">Belum Ada Kebijakan Biaya Aktif</h4>
                          <p className="text-xs text-slate-400 max-w-md mx-auto">
                            Belum ada aturan kebijakan platform yang berstatus aktif di database Finance Service.
                          </p>
                          <Link
                            href="/finance/policies"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-sky-900 transition"
                          >
                            <span>Kelola Kebijakan</span>
                            <ArrowRight size={14} weight="bold" />
                          </Link>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activePoliciesOnly.map((group, idx) => {
                          const activeVer = group.versions?.find((v) => v.status === "ACTIVE");
                          if (!activeVer) return null;

                          const custTarget = activeVer?.targets?.find(
                            (t) => t.policy_code === "CUSTOMER_PRODUCT_APP_FEE"
                          );
                          const merchTarget = activeVer?.targets?.find(
                            (t) => t.policy_code === "MERCHANT_PRODUCT_COMMISSION"
                          );

                          const hasCustomer = !!custTarget;
                          const hasMerchant = !!merchTarget;

                          const isBoth = hasCustomer && hasMerchant;
                          const isCustomerOnly = hasCustomer && !hasMerchant;
                          const isMerchantOnly = !hasCustomer && hasMerchant;

                          const custSubtotal = hasCustomer ? (revenueData?.customer_product_app_fee_idr ?? 0) : 0;
                          const merchSubtotal = hasMerchant ? (revenueData?.merchant_product_commission_idr ?? 0) : 0;
                          const totalSubtotal = custSubtotal + merchSubtotal;

                          const paidCheckouts = recentPayments.filter((p) => p.status === "PAID").length;
                          const checkoutsCount = hasCustomer ? paidCheckouts : 0;
                          const ordersCount = hasMerchant ? paidCheckouts : 0;

                          return (
                            <div
                              key={group.id || idx}
                              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-[#0F4C81]/40 transition flex flex-col justify-between space-y-4"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {isBoth && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        Pelanggan & Toko
                                      </span>
                                    )}
                                    {isCustomerOnly && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                        Khusus Pelanggan
                                      </span>
                                    )}
                                    {isMerchantOnly && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                        Khusus Mitra Toko
                                      </span>
                                    )}
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                      v{activeVer.version_no} AKTIF
                                    </span>
                                  </div>

                                  <span className="text-[10px] font-mono text-slate-400">
                                    {group.slug}
                                  </span>
                                </div>

                                <h3 className="text-sm font-black text-slate-900 font-display">
                                  {group.display_name}
                                </h3>
                              </div>

                              {isMerchantOnly && (
                                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                                      Total Pesanan
                                    </span>
                                    <span className="text-lg font-black text-slate-900 mt-0.5 block">
                                      {ordersCount} Pesanan
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                                      Total Pendapatan
                                    </span>
                                    <span className="text-lg font-black text-emerald-800 mt-0.5 block">
                                      {formatCurrency(merchSubtotal)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {isCustomerOnly && (
                                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-rose-50/60 border border-rose-100">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                                      Total Transaksi
                                    </span>
                                    <span className="text-lg font-black text-slate-900 mt-0.5 block">
                                      {checkoutsCount} Transaksi
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                                      Total Pendapatan
                                    </span>
                                    <span className="text-lg font-black text-emerald-800 mt-0.5 block">
                                      {formatCurrency(custSubtotal)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {isBoth && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100">
                                      <span className="text-[10px] font-bold text-rose-700 uppercase block">Pelanggan</span>
                                      <span className="font-extrabold text-slate-900 block mt-0.5">{checkoutsCount} Transaksi</span>
                                      <span className="text-[11px] font-black text-emerald-800 block mt-0.5">
                                        {formatCurrency(custSubtotal)}
                                      </span>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
                                      <span className="text-[10px] font-bold text-purple-700 uppercase block">Mitra Toko</span>
                                      <span className="font-extrabold text-slate-900 block mt-0.5">{ordersCount} Pesanan</span>
                                      <span className="text-[11px] font-black text-emerald-800 block mt-0.5">
                                        {formatCurrency(merchSubtotal)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs px-3">
                                    <span className="font-bold text-slate-600">Total Pendapatan:</span>
                                    <span className="font-black text-emerald-800 text-sm">
                                      {formatCurrency(totalSubtotal)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPolicyForHistory(group)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0F4C81] hover:text-white text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                                >
                                  <ClockCounterClockwise size={14} weight="bold" />
                                  <span>Riwayat</span>
                                </button>

                                <Link
                                  href="/finance/policies"
                                  className="text-xs font-bold text-slate-400 hover:text-[#0F4C81] transition flex items-center gap-1"
                                >
                                  <span>Regulasi</span>
                                  <ArrowRight size={12} weight="bold" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Modal Riwayat Transaksi Kebijakan */}
                  {selectedPolicyForHistory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                      <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0F4C81] text-white">
                                Riwayat Transaksi
                              </span>
                              <span className="text-xs font-mono text-slate-400">
                                {selectedPolicyForHistory.slug}
                              </span>
                            </div>
                            <h3 className="text-base font-black text-slate-900 font-display">
                              {selectedPolicyForHistory.display_name}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedPolicyForHistory(null)}
                            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                          >
                            <X size={18} weight="bold" />
                          </button>
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-3">
                          {recentPayments.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                              <Receipt size={32} className="text-slate-300 mx-auto" weight="duotone" />
                              <p className="text-xs font-bold text-slate-700">Belum Ada Riwayat Transaksi</p>
                              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                                Belum ada transaksi pembayaran kas masuk yang tercatat pada kebijakan ini.
                              </p>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
                              {recentPayments.slice(0, 10).map((pay, i) => (
                                <div key={pay.id || i} className="p-3 flex items-center justify-between text-xs bg-white hover:bg-slate-50 transition">
                                  <div>
                                    <div className="font-mono font-bold text-slate-900">{pay.id}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {new Date(pay.issued_at).toLocaleDateString("id-ID")} &bull; {pay.method}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-extrabold text-slate-800 block">
                                      {formatCurrency(pay.amount_idr)}
                                    </span>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${pay.status === "PAID"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                      }`}>
                                      {pay.status === "PAID" ? "Lunas" : pay.status === "PENDING" ? "Menunggu" : pay.status === "EXPIRED" ? "Kedaluwarsa" : "Gagal"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Total data: {recentPayments.length} transaksi</span>
                          <button
                            type="button"
                            onClick={() => setSelectedPolicyForHistory(null)}
                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition"
                          >
                            Tutup
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 3: DANA MITRA, PELANGGAN & PENCAIRAN */}
              {activeTab === "MANAGED_FUNDS" && (
                <div className="space-y-8">
                  {/* 3 Managed Funds Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Dana Ditahan */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Uang Ditahan (120 Jam)
                        </span>
                        <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                          <LockKey size={20} weight="duotone" />
                        </span>
                      </div>
                      <div>
                        <span className="text-2xl font-black font-display text-slate-900 block">
                          {formatCurrency(revenueData?.held_liability_idr ?? 0)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Uang pesanan milik toko yang masih diamankan sistem selama masa proteksi 5 hari.
                        </span>
                      </div>
                    </div>

                    {/* 2. S-Pay Merchant Siap Tarik */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          S-Pay Mitra Toko Tersedia
                        </span>
                        <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                          <Storefront size={20} weight="duotone" />
                        </span>
                      </div>
                      <div>
                        <span className="text-2xl font-black font-display text-emerald-800 block">
                          {formatCurrency(revenueData?.merchant_payable_idr ?? 0)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Saldo toko yang sudah bebas masa tahan, siap dicairkan ke rekening bank.
                        </span>
                      </div>
                    </div>

                    {/* 3. S-Pay Pelanggan (Cadangan Refund) */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          S-Pay Pelanggan (Pengembalian)
                        </span>
                        <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                          <HandCoins size={20} weight="duotone" />
                        </span>
                      </div>
                      <div>
                        <span className="text-2xl font-black font-display text-purple-800 block">
                          {formatCurrency(revenueData?.customer_refund_liability_idr ?? 0)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Saldo pelanggan dari pengembalian pesanan batal (bisa dipakai belanja lagi / ditarik ke bank).
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tables Row: Recent Withdrawals & Recent Refunds */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Withdrawals */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bank size={18} className="text-emerald-700" weight="duotone" />
                          <div>
                            <h3 className="text-sm font-black text-slate-900">Penarikan Dana ke Rekening Bank</h3>
                            <p className="text-[10px] text-slate-400">Pencairan oleh Mitra Toko &amp; Pelanggan</p>
                          </div>
                        </div>
                        <Link
                          href="/finance/payouts"
                          className="text-xs font-bold text-[#0F4C81] hover:underline"
                        >
                          Lihat Semua
                        </Link>
                      </div>

                      {recentWithdrawals.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-200/80">
                          Belum ada permohonan penarikan dana ke rekening bank.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {recentWithdrawals.slice(0, 5).map((wd) => (
                            <div key={wd.id} className="py-3 flex items-center justify-between text-xs">
                              <div>
                                <div className="font-mono text-[11px] font-bold text-slate-900">{wd.id}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Tujuan: {wd.bank_destination?.bank_name || "Bank Terdaftar"} (
                                  {wd.bank_destination?.account_number_masked || "****"})
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-extrabold text-slate-800">
                                  {formatCurrency(wd.net_to_bank_idr)}
                                </div>
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${wd.status === "SUCCEEDED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : wd.status === "PROCESSING"
                                      ? "bg-sky-100 text-sky-800"
                                      : "bg-amber-100 text-amber-800"
                                    }`}
                                >
                                  {wd.status === "SUCCEEDED" ? "Berhasil" : wd.status === "PROCESSING" ? "Diproses" : "Menunggu"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Refunds */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HandCoins size={18} className="text-purple-700" weight="duotone" />
                          <div>
                            <h3 className="text-sm font-black text-slate-900">Pengembalian Dana (Batal &amp; Retur)</h3>
                            <p className="text-[10px] text-slate-400">Pengembalian 100% pesanan batal ke S-Pay Pelanggan</p>
                          </div>
                        </div>
                        <Link
                          href="/finance/refunds"
                          className="text-xs font-bold text-[#0F4C81] hover:underline"
                        >
                          Lihat Semua
                        </Link>
                      </div>

                      {recentRefunds.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-200/80">
                          Belum ada permohonan pengembalian dana yang dieksekusi.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {recentRefunds.slice(0, 5).map((ref) => (
                            <div key={ref.id} className="py-3 flex items-center justify-between text-xs">
                              <div>
                                <div className="font-mono text-[11px] font-bold text-slate-900">{ref.id}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Alokasi Pesanan: {ref.payment_allocation_id}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-extrabold text-slate-800">
                                  {formatCurrency(ref.credited_amount_idr)}
                                </div>
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${ref.status === "SUCCEEDED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                    }`}
                                >
                                  {ref.status === "SUCCEEDED" ? "Berhasil" : "Diproses"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
