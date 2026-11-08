"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Wrench,
  ChartPie,
  HourglassMedium,
  CheckFat,
  ArrowUp,
  ArrowDown,
  Sparkle,
  Money,
  SlidersHorizontal,
  Clock,
  Tag,
  Users,
  Percent,
  CalendarBlank,
  CreditCard,
  MagnifyingGlass,
  Funnel,
  Check,
} from "@phosphor-icons/react";
import { financeApi } from "@/lib/servioApi";
import { useOrderJasa } from "@/features/order-jasa/hooks/useOrderJasa";
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
type ChannelFilterType = "ALL" | "BARANG_05A" | "JASA_DIAGNOSIS" | "JASA_PENGERJAAN";

interface NormalizedPaymentRow {
  id: string;
  paymentId: string;
  orderId?: string;
  orderNumber?: string;
  channel: "BARANG_05A" | "JASA_DIAGNOSIS" | "JASA_PENGERJAAN";
  serviceTitle: string;
  customerName?: string;
  providerName?: string;
  method: string;
  amount: number;
  status: string;
  issuedAt: string;
}

export default function FinanceDashboardPage() {
  // Top-level 2 Tabs: "grafik" vs "operasional"
  const [mainTab, setMainTab] = useState<MainFinanceTab>("grafik");

  // Operational sub-tab
  const [activeTab, setActiveTab] = useState<OperationalSubTab>("OVERVIEW");

  // Filter kanal untuk tabel transaksi di dashboard
  const [channelFilter, setChannelFilter] = useState<ChannelFilterType>("ALL");
  const [funnelChannelFilter, setFunnelChannelFilter] = useState<ChannelFilterType>("ALL");

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

  // Live Order Jasa integration (05B)
  const { orders: serviceOrders05B } = useOrderJasa();

  // Interactive hover tooltip states for charts
  const [hoveredWaterfallIndex, setHoveredWaterfallIndex] = useState<number | null>(null);
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<string | null>(null);

  // Quick Time Filter (Visual context filter)
  const [timeFilter, setTimeFilter] = useState<"ALL" | "TODAY" | "7D" | "30D">("ALL");

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
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchFinanceDashboardData();
      }
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFinanceDashboardData();
  };

  // =========================================================================
  // NORMALISASI TRANSAKSI DUAL-CHANNEL (BARANG 05A & JASA 05B)
  // =========================================================================
  const normalizedPayments = useMemo<NormalizedPaymentRow[]>(() => {
    return recentPayments.map((pay) => {
      const checkoutGroupId = pay.checkout?.checkout_group_id || "";
      const isJasaDiagnosis =
        checkoutGroupId.includes("CHK-JSA-") && checkoutGroupId.includes("-diagnosis");
      const isJasaExecution =
        checkoutGroupId.includes("CHK-JSA-") && checkoutGroupId.includes("-service_execution");

      let channel: "BARANG_05A" | "JASA_DIAGNOSIS" | "JASA_PENGERJAAN" = "BARANG_05A";
      let serviceTitle = "Pesanan Belanja Produk Toko";
      let orderId: string | undefined = undefined;
      let orderNumber: string | undefined = undefined;
      let customerName: string | undefined = undefined;
      let providerName: string | undefined = undefined;

      if (isJasaDiagnosis || isJasaExecution) {
        channel = isJasaDiagnosis ? "JASA_DIAGNOSIS" : "JASA_PENGERJAAN";

        // Ekstrak order ID dari CHK-JSA-{orderId}-...
        const match = checkoutGroupId.match(/CHK-JSA-([A-Za-z0-9_-]+)-(diagnosis|service_execution)/);
        const extractedOrderId = match ? match[1] : null;

        if (extractedOrderId && serviceOrders05B) {
          const matchedOrder = serviceOrders05B.find(
            (o) =>
              o.id === extractedOrderId ||
              o.orderNumber === extractedOrderId ||
              checkoutGroupId.includes(o.id)
          );
          if (matchedOrder) {
            orderId = matchedOrder.id;
            orderNumber = matchedOrder.orderNumber;
            customerName = matchedOrder.customerName;
            providerName =
              matchedOrder.providerName && matchedOrder.providerName !== "PT Servio Mandiri Teknik"
                ? matchedOrder.providerName
                : "Mitra Servis Terdaftar";
            serviceTitle = isJasaDiagnosis
              ? `Survei Diagnostik: ${matchedOrder.serviceSnapshot?.title || "Servis Terstandar"}`
              : `Pengerjaan Servis: ${matchedOrder.serviceSnapshot?.title || "Perbaikan Unit"}`;
          } else {
            serviceTitle = isJasaDiagnosis ? "Survei Diagnostik Jasa Unit" : "Pelunasan Pengerjaan Servis";
          }
        } else {
          serviceTitle = isJasaDiagnosis ? "Survei Diagnostik Jasa Unit" : "Pelunasan Pengerjaan Servis";
        }
      }

      return {
        id: pay.id,
        paymentId: pay.id,
        orderId,
        orderNumber,
        channel,
        serviceTitle,
        customerName,
        providerName,
        method: pay.method,
        amount: pay.amount_idr,
        status: pay.status,
        issuedAt: pay.issued_at,
      };
    });
  }, [recentPayments, serviceOrders05B]);

  // Transaksi Terfilter berdasarkan Channel Tab
  const filteredPaymentRows = useMemo(() => {
    return normalizedPayments.filter((p) => {
      if (channelFilter === "ALL") return true;
      return p.channel === channelFilter;
    });
  }, [normalizedPayments, channelFilter]);

  // =========================================================================
  // METRIK FINANSIAL & KALKULASI DUAL-CHANNEL
  // =========================================================================
  const grossVolume = revenueData?.mock_payment_volume_idr || 0;
  const escrowHeldTotal = revenueData?.held_liability_idr || 0;
  const merchantPayable = revenueData?.merchant_payable_idr || 0;
  const providerPayable = revenueData?.provider_payable_idr || 0;
  const customerRefund = revenueData?.customer_refund_liability_idr || 0;
  const platformRevenue = revenueData?.total_collected_fee_idr || 0;

  // Breakdown Pendapatan Platform
  const custProductFee = revenueData?.customer_product_app_fee_idr || 0;
  const merchProductComm = revenueData?.merchant_product_commission_idr || 0;
  const custServiceFee = revenueData?.customer_service_app_fee_idr || 0;
  const provServiceComm = revenueData?.provider_service_commission_idr || 0;

  const totalProductRevenue = custProductFee + merchProductComm;
  const totalServiceRevenue = custServiceFee + provServiceComm;

  // Breakdown Kas Masuk (Gross)
  const paidJasaPayments = normalizedPayments.filter(
    (p) => p.status === "PAID" && (p.channel === "JASA_DIAGNOSIS" || p.channel === "JASA_PENGERJAAN")
  );
  const paidProductPayments = normalizedPayments.filter(
    (p) => p.status === "PAID" && p.channel === "BARANG_05A"
  );
  const grossServicePaid = paidJasaPayments.reduce((acc, p) => acc + p.amount, 0);
  const grossProductPaid = Math.max(0, grossVolume - grossServicePaid);

  // Breakdown Escrow Dana Ditahan
  const paidDiagnosisCount = normalizedPayments.filter(
    (p) => p.status === "PAID" && p.channel === "JASA_DIAGNOSIS"
  ).length;
  const paidExecutionCount = normalizedPayments.filter(
    (p) => p.status === "PAID" && p.channel === "JASA_PENGERJAAN"
  ).length;

  // Estimasi proporsional aman untuk pembagian escrow
  const estimatedServiceEscrow = Math.min(
    escrowHeldTotal,
    paidDiagnosisCount * 50000 + paidExecutionCount * 120000
  );
  const estimatedProductEscrow = Math.max(0, escrowHeldTotal - estimatedServiceEscrow);

  // Safe Total untuk Alokasi Waterfall
  const safeTotalAlloc = Math.max(
    grossVolume,
    escrowHeldTotal + merchantPayable + providerPayable + customerRefund + platformRevenue,
    1
  );

  const escrowPct = Math.round((escrowHeldTotal / safeTotalAlloc) * 100);
  const merchantPct = Math.round((merchantPayable / safeTotalAlloc) * 100);
  const providerPct = Math.round((providerPayable / safeTotalAlloc) * 100);
  const refundPct = Math.round((customerRefund / safeTotalAlloc) * 100);
  const revenuePct = Math.round((platformRevenue / safeTotalAlloc) * 100);

  // Donut Revenue Stream Split (4 Segmen Presisi)
  const totalStream = Math.max(
    custProductFee + merchProductComm + custServiceFee + provServiceComm,
    1
  );
  const custProdPct = Math.round((custProductFee / totalStream) * 100);
  const merchProdPct = Math.round((merchProductComm / totalStream) * 100);
  const custServPct = Math.round((custServiceFee / totalStream) * 100);
  const provServPct = Math.max(0, 100 - custProdPct - merchProdPct - custServPct);

  // Payments Status Funnel berdasarkan Funnel Channel Filter
  const funnelTargetPayments = useMemo(() => {
    return normalizedPayments.filter((p) => {
      if (funnelChannelFilter === "ALL") return true;
      return p.channel === funnelChannelFilter;
    });
  }, [normalizedPayments, funnelChannelFilter]);

  const paidCount = funnelTargetPayments.filter((p) => p.status === "PAID").length;
  const pendingCount = funnelTargetPayments.filter((p) => p.status === "PENDING").length;
  const expiredCount = funnelTargetPayments.filter((p) => p.status === "EXPIRED").length;
  const failedCount = funnelTargetPayments.filter(
    (p) => p.status === "FAILED" || p.status === "CANCELLED"
  ).length;
  const totalFunnelSample = Math.max(funnelTargetPayments.length, 1);
  const paymentSuccessRate = Math.round((paidCount / totalFunnelSample) * 100);

  // Inflow vs Outflow
  const totalInflow = reconData?.metrics?.total_paid_payments_idr || grossVolume || 0;
  const totalOutflow =
    (reconData?.metrics?.total_withdrawals_completed_idr || 0) +
    (reconData?.metrics?.total_refunds_succeeded_idr || 0);
  const netLiquidityPool = Math.max(0, totalInflow - totalOutflow);

  return (
    <div className="space-y-6 pb-20 font-body text-left">
      {/* Toast Notifikasi */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Alert Error */}
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

      {/* =========================================================================
          1. HEADER EKSEKUTIF DENGAN 4 KARTU DUAL-CHANNEL METRIC
          ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Pusat Operasional Finansial SERVIO
              </span>

              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                <Clock size={13} className="text-primary" />
                Sinkronisasi Langsung (4.5s)
              </span>

              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Modul 05A (Barang) &amp; 05B (Jasa)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 tracking-tight">
              Ringkasan Operasional Finansial
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Pusat pemantauan lalu lintas kas masuk QRIS/VA, penahanan dana proteksi pelanggan (escrow toko &amp; jasa survei diagnosis), distribusi bagi hasil kebijakan CEO, saldo S-Pay mitra/toko, serta verifikasi buku besar ganda (*double-entry balancing*).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Quick Refresh */}
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition flex items-center justify-center cursor-pointer shadow-2xs"
              title="Segarkan Data Sekarang"
            >
              <ArrowsClockwise
                size={18}
                className={isRefreshing ? "animate-spin text-[#0F4C81]" : ""}
              />
            </button>

            {/* Link Pintasan ke Payments & Payouts */}
            <Link
              href="/finance/payments"
              className="px-4 py-2.5 rounded-2xl bg-[#0F4C81] hover:bg-[#0B3860] text-white text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5"
            >
              <Receipt size={16} weight="bold" />
              <span>Log Pembayaran Masuk</span>
            </Link>

            <Link
              href="/finance/payouts"
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5"
            >
              <Bank size={16} weight="bold" />
              <span>Antrean Pencairan</span>
            </Link>
          </div>
        </div>

        {/* 4 Quick Stat Metric Tiles dengan Dual-Channel Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
          {/* 1. Kas Masuk Total Kotor */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Kas Masuk (Total Kotor)
              </span>
              <span className="w-8 h-8 rounded-xl bg-sky-100 text-[#0F4C81] flex items-center justify-center shrink-0">
                <Receipt size={18} weight="bold" />
              </span>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                {formatCurrency(grossVolume)}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                <span>Toko: <strong className="text-slate-800">{formatCurrency(grossProductPaid)}</strong></span>
                <span>&bull;</span>
                <span>Jasa: <strong className="text-indigo-700">{formatCurrency(grossServicePaid)}</strong></span>
              </div>
            </div>
          </div>

          {/* 2. Dana Ditahan (Escrow Liability) */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Uang Ditahan (Escrow)
              </span>
              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <LockKey size={18} weight="bold" />
              </span>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                {formatCurrency(escrowHeldTotal)}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                <span>120 Jam Toko: <strong className="text-amber-800">{formatCurrency(estimatedProductEscrow)}</strong></span>
                <span>&bull;</span>
                <span>Jasa Aktif: <strong className="text-violet-700">{formatCurrency(estimatedServiceEscrow)}</strong></span>
              </div>
            </div>
          </div>

          {/* 3. Pendapatan Bersih SERVIO */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Pendapatan SERVIO
              </span>
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <TrendUp size={18} weight="bold" />
              </span>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-emerald-800 font-display">
                {formatCurrency(platformRevenue)}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                <span>Toko: <strong className="text-emerald-800">{formatCurrency(totalProductRevenue)}</strong></span>
                <span>&bull;</span>
                <span>Jasa: <strong className="text-violet-800">{formatCurrency(totalServiceRevenue)}</strong></span>
              </div>
            </div>
          </div>

          {/* 4. Integritas Buku Besar (Double-Entry Balancing) */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Integritas Buku Besar
              </span>
              <span
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  reconData?.is_double_entry_balanced
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                <Scales size={18} weight="bold" />
              </span>
            </div>
            <div>
              <p
                className={`text-base sm:text-lg font-black uppercase font-display ${
                  reconData?.is_double_entry_balanced ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {reconData?.is_double_entry_balanced ? "SEIMBANG (SESUAI)" : "SELISIH TERDETEKSI"}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                <span>Debit = Kredit</span>
                <span className="font-mono font-bold text-slate-700">
                  Selisih: {formatCurrency(reconData?.discrepancy_idr || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2 MAIN TABS SWITCHER: SEGMENTED PILLS DESIGN */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex p-1 rounded-2xl bg-slate-100/80 border border-slate-200">
            <button
              onClick={() => setMainTab("grafik")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mainTab === "grafik"
                  ? "bg-white text-[#0F4C81] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ChartPie size={16} weight={mainTab === "grafik" ? "fill" : "regular"} />
              <span>Tab 1: Grafik &amp; Analisis Likuiditas</span>
            </button>

            <button
              onClick={() => setMainTab("operasional")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mainTab === "operasional"
                  ? "bg-white text-[#0F4C81] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <SlidersHorizontal size={16} weight={mainTab === "operasional" ? "fill" : "regular"} />
              <span>Tab 2: Rincian Operasional &amp; Regulasi</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                3 Sub-Bagian
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Sistem Otomatis Terhubung ke Port 8006 (Finance) &amp; 8007 (Jasa)</span>
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
              TAB 1: GRAFIK & ANALISIS LIKUIDITAS (DUAL-CHANNEL VISUALS)
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
                <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                          <Money size={20} className="text-[#0F4C81]" weight="duotone" />
                          <span>Alur Alokasi Kas Masuk Multi-Pos</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Aliran dana kotor pembeli dibagi ke pos Uang Ditahan (Toko &amp; Jasa), Saldo S-Pay Mitra, Pelanggan, &amp; Pendapatan Platform
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
                        <span className="font-mono font-semibold">100% dari Kas Masuk Terverifikasi</span>
                      </div>
                      <div className="w-full h-4 rounded-xl bg-slate-100 overflow-hidden flex shadow-inner p-0.5 gap-0.5">
                        {/* 1. Escrow Held Toko & Jasa */}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(escrowPct, 4)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-amber-500 rounded-lg cursor-pointer hover:brightness-110 transition relative group"
                          onMouseEnter={() => setHoveredWaterfallIndex(0)}
                          onMouseLeave={() => setHoveredWaterfallIndex(null)}
                        />
                        {/* 2. Merchant Payable (Toko) */}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(merchantPct, 4)}%` }}
                          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                          className="h-full bg-emerald-500 rounded-lg cursor-pointer hover:brightness-110 transition relative group"
                          onMouseEnter={() => setHoveredWaterfallIndex(1)}
                          onMouseLeave={() => setHoveredWaterfallIndex(null)}
                        />
                        {/* 2b. Provider Payable (Jasa Servis) */}
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(providerPct, 4)}%` }}
                          transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
                          className="h-full bg-violet-500 rounded-lg cursor-pointer hover:brightness-110 transition relative group"
                          onMouseEnter={() => setHoveredWaterfallIndex(4)}
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

                    {/* Detailed Cards for Waterfall Streams */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* 1. Dana Ditahan Escrow */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`p-3.5 rounded-2xl border transition ${
                          hoveredWaterfallIndex === 0
                            ? "bg-amber-50/80 border-amber-300 shadow-xs"
                            : "bg-slate-50/70 border-slate-200/70"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                            Uang Ditahan Escrow (Toko &amp; Jasa)
                          </span>
                          <span className="text-[10px] font-bold text-amber-800 px-1.5 py-0.5 rounded-full bg-amber-100">
                            {escrowPct}%
                          </span>
                        </div>
                        <p className="text-base font-extrabold text-slate-900 font-display">
                          {formatCurrency(escrowHeldTotal)}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Proteksi pesanan belanja 120 jam &amp; masa survei/garansi jasa
                        </p>
                      </motion.div>

                      {/* 2. S-Pay Toko Siap Tarik */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`p-3.5 rounded-2xl border transition ${
                          hoveredWaterfallIndex === 1
                            ? "bg-emerald-50/80 border-emerald-300 shadow-xs"
                            : "bg-slate-50/70 border-slate-200/70"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                            S-Pay Mitra Toko (Siap Tarik)
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800 px-1.5 py-0.5 rounded-full bg-emerald-100">
                            {merchantPct}%
                          </span>
                        </div>
                        <p className="text-base font-extrabold text-slate-900 font-display">
                          {formatCurrency(merchantPayable)}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Hak toko barang (05A) bebas kliring yang siap dicairkan ke bank
                        </p>
                      </motion.div>

                      {/* 2b. S-Pay Mitra Jasa Siap Tarik */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`p-3.5 rounded-2xl border transition ${
                          hoveredWaterfallIndex === 4
                            ? "bg-violet-50/80 border-violet-300 shadow-xs"
                            : "bg-slate-50/70 border-slate-200/70"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
                            S-Pay Mitra Jasa (Siap Tarik)
                          </span>
                          <span className="text-[10px] font-bold text-violet-800 px-1.5 py-0.5 rounded-full bg-violet-100">
                            {providerPct}%
                          </span>
                        </div>
                        <p className="text-base font-extrabold text-slate-900 font-display">
                          {formatCurrency(providerPayable)}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Hak mitra teknisi/bengkel (05B) tuntas servis siap dicairkan
                        </p>
                      </motion.div>

                      {/* 3. S-Pay Refund Pelanggan */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`p-3.5 rounded-2xl border transition ${
                          hoveredWaterfallIndex === 2
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
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Dana pengembalian 100% atas pesanan toko / diagnosis batal
                        </p>
                      </motion.div>

                      {/* 4. Pendapatan Bersih SERVIO */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`p-3.5 rounded-2xl border sm:col-span-2 transition ${
                          hoveredWaterfallIndex === 3
                            ? "bg-blue-50/80 border-blue-300 shadow-xs"
                            : "bg-slate-50/70 border-slate-200/70"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C81] shrink-0" />
                            Pendapatan Bersih Platform SERVIO
                          </span>
                          <span className="text-[10px] font-bold text-[#0F4C81] px-1.5 py-0.5 rounded-full bg-blue-100">
                            {revenuePct}%
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <p className="text-base font-extrabold text-[#0F4C81] font-display">
                            {formatCurrency(platformRevenue)}
                          </p>
                          <span className="text-[11px] text-slate-600">
                            Toko: <strong>{formatCurrency(totalProductRevenue)}</strong> &bull; Jasa Servis:{" "}
                            <strong>{formatCurrency(totalServiceRevenue)}</strong>
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <span>Rekonsiliasi otomatis per transaksi terjamin buku besar</span>
                    </span>
                    <button
                      onClick={() => {
                        setMainTab("operasional");
                        setActiveTab("OVERVIEW");
                      }}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Buka Detail Arus Kas &rarr;</span>
                    </button>
                  </div>
                </div>

                {/* GRAFIK 2: KOMPOSISI PENDAPATAN PLATFORM (DONUT SVG) (5 Col) */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                          <ChartPie size={20} className="text-emerald-700" weight="duotone" />
                          <span>Komposisi Pendapatan Platform</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Rincian 4 pos fee aplikasi &amp; komisi bagi hasil sesuai kebijakan CEO
                        </p>
                      </div>
                    </div>

                    {/* Animated Donut SVG */}
                    <div className="my-5 flex flex-col sm:flex-row items-center justify-center gap-6">
                      <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#f1f5f9"
                            strokeWidth="11"
                            fill="transparent"
                          />
                          {/* Segment 1: Biaya Aplikasi Belanja Toko */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#0F4C81"
                            strokeWidth="11"
                            strokeDasharray="238.7"
                            initial={{ strokeDashoffset: 238.7 }}
                            animate={{
                              strokeDashoffset: 238.7 - (238.7 * custProdPct) / 100,
                            }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            fill="transparent"
                            strokeLinecap="round"
                            className="cursor-pointer hover:stroke-[#0B3860] transition"
                            onMouseEnter={() => setHoveredDonutSegment("CUST_PROD")}
                            onMouseLeave={() => setHoveredDonutSegment(null)}
                          />
                          {/* Segment 2: Komisi Toko Barang */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#10b981"
                            strokeWidth="11"
                            strokeDasharray="238.7"
                            initial={{ strokeDashoffset: 238.7 }}
                            animate={{
                              strokeDashoffset: 238.7 - (238.7 * merchProdPct) / 100,
                            }}
                            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                            fill="transparent"
                            strokeLinecap="round"
                            className="cursor-pointer hover:stroke-[#059669] transition"
                            onMouseEnter={() => setHoveredDonutSegment("MERCH_PROD")}
                            onMouseLeave={() => setHoveredDonutSegment(null)}
                          />
                          {/* Segment 3: Biaya Aplikasi Jasa Servis */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#0284c7"
                            strokeWidth="11"
                            strokeDasharray="238.7"
                            initial={{ strokeDashoffset: 238.7 }}
                            animate={{
                              strokeDashoffset: 238.7 - (238.7 * custServPct) / 100,
                            }}
                            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                            fill="transparent"
                            strokeLinecap="round"
                            className="cursor-pointer hover:stroke-[#0369a1] transition"
                            onMouseEnter={() => setHoveredDonutSegment("CUST_SERV")}
                            onMouseLeave={() => setHoveredDonutSegment(null)}
                          />
                          {/* Segment 4: Komisi Mitra Jasa */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#8b5cf6"
                            strokeWidth="11"
                            strokeDasharray="238.7"
                            initial={{ strokeDashoffset: 238.7 }}
                            animate={{
                              strokeDashoffset: 238.7 - (238.7 * provServPct) / 100,
                            }}
                            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                            fill="transparent"
                            strokeLinecap="round"
                            className="cursor-pointer hover:stroke-[#7c3aed] transition"
                            onMouseEnter={() => setHoveredDonutSegment("PROV_SERV")}
                            onMouseLeave={() => setHoveredDonutSegment(null)}
                          />
                        </svg>

                        <div className="absolute flex flex-col items-center justify-center text-center p-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            Total Fee
                          </span>
                          <span className="text-sm font-black text-slate-900 font-display mt-0.5">
                            {formatCurrency(platformRevenue)}
                          </span>
                          <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 rounded-full mt-0.5">
                            100% Diakui
                          </span>
                        </div>
                      </div>

                      {/* Legend 4 Aliran Pendapatan */}
                      <div className="space-y-2 text-xs flex-1 w-full">
                        {/* 1. Biaya Aplikasi Pembeli Barang */}
                        <div
                          className={`p-2 rounded-xl border transition ${
                            hoveredDonutSegment === "CUST_PROD"
                              ? "bg-blue-50/80 border-[#0F4C81]"
                              : "bg-slate-50 border-slate-200/60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-[#0F4C81] shrink-0" />
                              Aplikasi Belanja Toko
                            </span>
                            <span className="font-mono font-bold text-[#0F4C81]">{custProdPct}%</span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 font-mono">
                            {formatCurrency(custProductFee)}
                          </p>
                        </div>

                        {/* 2. Komisi Toko Barang */}
                        <div
                          className={`p-2 rounded-xl border transition ${
                            hoveredDonutSegment === "MERCH_PROD"
                              ? "bg-emerald-50/80 border-emerald-500"
                              : "bg-slate-50 border-slate-200/60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              Komisi Penjualan Toko (05A)
                            </span>
                            <span className="font-mono font-bold text-emerald-700">{merchProdPct}%</span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 font-mono">
                            {formatCurrency(merchProductComm)}
                          </p>
                        </div>

                        {/* 3. Biaya Aplikasi Pelanggan Jasa */}
                        <div
                          className={`p-2 rounded-xl border transition ${
                            hoveredDonutSegment === "CUST_SERV"
                              ? "bg-sky-50/80 border-sky-500"
                              : "bg-slate-50 border-slate-200/60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                              Aplikasi Pelanggan Jasa
                            </span>
                            <span className="font-mono font-bold text-sky-700">{custServPct}%</span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 font-mono">
                            {formatCurrency(custServiceFee)}
                          </p>
                        </div>

                        {/* 4. Komisi Mitra Jasa Servis */}
                        <div
                          className={`p-2 rounded-xl border transition ${
                            hoveredDonutSegment === "PROV_SERV"
                              ? "bg-violet-50/80 border-violet-500"
                              : "bg-slate-50 border-slate-200/60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                              Komisi Mitra Jasa Servis (05B)
                            </span>
                            <span className="font-mono font-bold text-violet-700">{provServPct}%</span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 font-mono">
                            {formatCurrency(provServiceComm)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Notice Diagnosis 0% */}
                    <div className="p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center gap-2 text-[11px] text-amber-900">
                      <Sparkle size={16} className="text-amber-600 shrink-0" weight="fill" />
                      <span>
                        <strong>Aturan CEO:</strong> Survei diagnostik awal dibebaskan 0% dari komisi platform. Komisi jasa resmi dipotong pada tahap pengerjaan perbaikan.
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Basis Akuntansi: Akrual Langsung (Real-time)</span>
                    <button
                      onClick={() => {
                        setMainTab("operasional");
                        setActiveTab("POLICY_REVENUE");
                      }}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Lihat Rincian Kebijakan CEO &rarr;</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: GRAFIK 3 (PAYMENT SLA FUNNEL) & GRAFIK 4 (ARUS KAS LIKUIDITAS) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* GRAFIK 3: CORONG STATUS PEMBAYARAN KAS MASUK (6 Col) */}
                <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                          <Receipt size={20} className="text-sky-600" weight="duotone" />
                          <span>Status &amp; Tingkat Kelunasan Tagihan</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Konversi pembayaran QRIS / Virtual Account (Batas Waktu Jendela 6 Jam)
                        </p>
                      </div>
                      <Badge variant="success" size="sm" className="font-mono font-bold shrink-0">
                        {paymentSuccessRate}% Lunas
                      </Badge>
                    </div>

                    {/* Filter Kanal untuk Funnel */}
                    <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 text-[11px]">
                      {[
                        { id: "ALL", label: "Semua Kanal" },
                        { id: "BARANG_05A", label: "Belanja Toko (05A)" },
                        { id: "JASA_DIAGNOSIS", label: "Survei Diagnosis (05B)" },
                        { id: "JASA_PENGERJAAN", label: "Pengerjaan Servis (05B)" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFunnelChannelFilter(f.id as ChannelFilterType)}
                          className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                            funnelChannelFilter === f.id
                              ? "bg-[#0F4C81] text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Funnel Progress Bars */}
                    <div className="space-y-3 my-4">
                      {[
                        {
                          label: "Pembayaran Lunas (PAID)",
                          count: paidCount,
                          color: "bg-emerald-500",
                          pct: Math.round((paidCount / totalFunnelSample) * 100),
                          desc: "Dana berhasil diverifikasi gerbang pembayaran dan masuk ke penampung",
                        },
                        {
                          label: "Menunggu Pembayaran (PENDING)",
                          count: pendingCount,
                          color: "bg-amber-500",
                          pct: Math.round((pendingCount / totalFunnelSample) * 100),
                          desc: "Dalam jendela batas waktu 6 jam pembayaran aktif pelanggan",
                        },
                        {
                          label: "Kedaluwarsa (EXPIRED)",
                          count: expiredCount,
                          color: "bg-rose-500",
                          pct: Math.round((expiredCount / totalFunnelSample) * 100),
                          desc: "Melewati batas 6 jam tanpa pelunasan, pesanan otomatis dibatalkan",
                        },
                        {
                          label: "Gagal / Dibatalkan (FAILED)",
                          count: failedCount,
                          color: "bg-slate-400",
                          pct: Math.round((failedCount / totalFunnelSample) * 100),
                          desc: "Kendala teknis jaringan perbankan atau pembatalan sepihak",
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
                      Total sampel terpilih: {funnelTargetPayments.length} transaksi
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
                <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                          <Scales size={20} className="text-indigo-600" weight="duotone" />
                          <span>Arus Kas Masuk vs Kas Keluar (Likuiditas Bank)</span>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Perbandingan total penerimaan kas vs pencairan dana mitra &amp; refund pelanggan
                        </p>
                      </div>
                    </div>

                    {/* Dual Inflow vs Outflow Visual Cards */}
                    <div className="grid grid-cols-2 gap-4 my-4">
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
                            Penerimaan
                          </span>
                        </div>
                        <p className="text-lg sm:text-xl font-black text-emerald-950 font-display">
                          {formatCurrency(totalInflow)}
                        </p>
                        <p className="text-[10px] text-emerald-700">
                          Total dana transaksi lunas via QRIS &amp; Virtual Account
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
                          Total penarikan saldo ke bank fisik + refund pengembalian dana
                        </p>
                      </motion.div>
                    </div>

                    {/* Net Pool & Double-Entry Barometer */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">
                          Saldo Likuiditas Mengendap di Rekening Penampung:
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(netLiquidityPool)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200">
                        <span className="text-slate-500 flex items-center gap-1">
                          <CheckFat size={13} className="text-emerald-600" weight="fill" />
                          Integritas Buku Besar (Debit - Kredit):
                        </span>
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                            reconData?.is_double_entry_balanced
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
                      Rekonsiliasi perbankan otomatis via Sistem Keuangan Inti
                    </span>
                    <button
                      onClick={() => {
                        setMainTab("operasional");
                        setActiveTab("MANAGED_FUNDS");
                      }}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Lihat Antrean Pencairan Mitra &rarr;</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================================================================
              TAB 2: RINCIAN OPERASIONAL & REGULASI (3 SUB-TABS LENGKAP)
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
                    type="button"
                    onClick={() => setActiveTab("OVERVIEW")}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      activeTab === "OVERVIEW"
                        ? "bg-[#0F4C81] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Receipt size={16} weight={activeTab === "OVERVIEW" ? "fill" : "bold"} />
                    <span>1. Arus Kas &amp; Transaksi Masuk</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("POLICY_REVENUE")}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      activeTab === "POLICY_REVENUE"
                        ? "bg-[#0F4C81] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <TrendUp size={16} weight={activeTab === "POLICY_REVENUE" ? "fill" : "bold"} />
                    <span>2. Distribusi Kebijakan Platform (CEO)</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        activeTab === "POLICY_REVENUE"
                          ? "bg-white/20 text-white"
                          : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      {formatCurrency(platformRevenue)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("MANAGED_FUNDS")}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      activeTab === "MANAGED_FUNDS"
                        ? "bg-[#0F4C81] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Bank size={16} weight={activeTab === "MANAGED_FUNDS" ? "fill" : "bold"} />
                    <span>3. Dana Mitra, Pelanggan &amp; Pencairan</span>
                  </button>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  SUB-TAB 1: ARUS KAS & TRANSAKSI MASUK
                  ------------------------------------------------------------- */}
              {activeTab === "OVERVIEW" && (
                <div className="space-y-6">
                  {/* 3 Kartu Pintasan Operasional */}
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
                        Pantau daftar transaksi QRIS &amp; Virtual Account (Barang &amp; Jasa), batas waktu 6 jam, serta simulasi konfirmasi.
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
                      <h3 className="font-black text-slate-900 text-sm">Pencairan Dana (Payouts)</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Verifikasi rekening bank fisik dan proses pencairan saldo S-Pay Toko Barang &amp; Mitra Jasa Servis (Biaya Rp 2.500).
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
                      <h3 className="font-black text-slate-900 text-sm">Pengembalian Dana (Refund)</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Pantau eksekusi pengembalian dana 100% pesanan batal toko &amp; survei diagnosis langsung ke S-Pay Pelanggan.
                      </p>
                    </Link>
                  </div>

                  {/* Tabel Transaksi Pembayaran Terkini dengan Badge Kanal 05A & 05B */}
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <Receipt size={20} className="text-[#0F4C81]" weight="duotone" />
                          <h3 className="text-sm font-black text-slate-900">
                            Pembayaran Kas Masuk Terkini
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Menampilkan identitas transaksi, kanal pemesanan, dan rincian layanan
                        </p>
                      </div>

                      {/* Filter Cepat Kanal */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                        {[
                          { id: "ALL", label: "Semua Kanal" },
                          { id: "BARANG_05A", label: "Produk Toko" },
                          { id: "JASA_DIAGNOSIS", label: "Survei Diagnosis" },
                          { id: "JASA_PENGERJAAN", label: "Pengerjaan Servis" },
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setChannelFilter(f.id as ChannelFilterType)}
                            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                              channelFilter === f.id
                                ? "bg-[#0F4C81] text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredPaymentRows.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-200/80">
                        Tidak ada transaksi pembayaran untuk kanal yang dipilih.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 overflow-x-auto">
                        {filteredPaymentRows.slice(0, 8).map((pay) => (
                          <div
                            key={pay.id}
                            className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 transition px-2 rounded-xl"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Kanal Badge */}
                                {pay.channel === "BARANG_05A" && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    PRODUK: BARANG
                                  </span>
                                )}
                                {pay.channel === "JASA_DIAGNOSIS" && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    JASA: DIAGNOSIS
                                  </span>
                                )}
                                {pay.channel === "JASA_PENGERJAAN" && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                                    JASA: PENGERJAAN
                                  </span>
                                )}

                                <span className="font-mono text-[11px] font-bold text-slate-900">
                                  {pay.id}
                                </span>
                              </div>

                              <p className="font-medium text-slate-800 text-[11px]">
                                {pay.serviceTitle}
                              </p>

                              <div className="text-[10px] text-slate-400 flex items-center gap-2 flex-wrap">
                                <span>Metode: <strong className="text-slate-600">{pay.method}</strong></span>
                                <span>&bull;</span>
                                <span>{new Date(pay.issuedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                {pay.customerName && (
                                  <>
                                    <span>&bull;</span>
                                    <span>Pemesan: <strong className="text-slate-600">{pay.customerName}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="text-left sm:text-right shrink-0">
                              <div className="font-extrabold text-slate-900 text-sm font-display">
                                {formatCurrency(pay.amount)}
                              </div>
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                  pay.status === "PAID"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : pay.status === "PENDING"
                                    ? "bg-amber-100 text-amber-800"
                                    : pay.status === "REFUNDED"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {pay.status === "PAID"
                                  ? "Lunas"
                                  : pay.status === "PENDING"
                                  ? "Menunggu"
                                  : pay.status === "REFUNDED"
                                  ? "Refund Selesai"
                                  : pay.status === "EXPIRED"
                                  ? "Kedaluwarsa"
                                  : "Gagal"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Menampilkan {Math.min(filteredPaymentRows.length, 8)} dari {filteredPaymentRows.length} transaksi
                      </span>
                      <Link
                        href="/finance/payments"
                        className="font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
                      >
                        <span>Buka Modul Pembayaran Lengkap &rarr;</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  SUB-TAB 2: DISTRIBUSI KEBIJAKAN PLATFORM (CEO) - TERUPDATE & TRANSPARAN
                  ------------------------------------------------------------- */}
              {activeTab === "POLICY_REVENUE" && (
                <div className="space-y-6">
                  {/* Banner Ringkasan Regulasi CEO */}
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-[#0F4C81] text-[10px] font-bold uppercase tracking-wider border border-sky-200">
                          Tata Kelola Regulasi Finansial
                        </span>
                        <span className="text-xs text-slate-400">&bull; Kebijakan Authoritative Disahkan CEO</span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-black font-display text-slate-900 tracking-tight">
                        Distribusi Potongan &amp; Pendapatan Kebijakan Platform
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
                        Setiap kebijakan platform dapat membebankan potongan ke <strong>Pelanggan</strong> (Biaya Aplikasi), <strong>Mitra Toko</strong> (Komisi Penjualan Barang), <strong>Mitra Jasa</strong> (Komisi Pengerjaan Servis), kombinasi 2 role, maupun ketiga role sekaligus.
                      </p>
                    </div>

                    <div className="px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-left sm:text-right shrink-0">
                      <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                        Total Pendapatan Terkumpul
                      </span>
                      <span className="text-2xl font-black font-display text-emerald-900 mt-0.5 block">
                        {formatCurrency(platformRevenue)}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">
                        100% Diakui Akrual
                      </span>
                    </div>
                  </div>

                  {/* Grid Kartu Kebijakan Dinamis (Mengakomodasi 1 Role, 2 Role, dan 3 Role Sekaligus) */}
                  {(() => {
                    const activePoliciesOnly = activePolicies.filter(
                      (group) =>
                        group.business_status === "ACTIVE" &&
                        group.versions?.some((v) => v.status === "ACTIVE")
                    );

                    if (activePoliciesOnly.length === 0) {
                      return (
                        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                          <ShieldCheck size={40} className="text-slate-300 mx-auto" weight="duotone" />
                          <h4 className="font-bold text-slate-800 text-sm">Belum Ada Kebijakan Biaya Aktif</h4>
                          <p className="text-xs text-slate-400 max-w-md mx-auto">
                            Belum ada aturan kebijakan platform yang berstatus aktif di database Finance Service.
                          </p>
                          <Link
                            href="/finance/policies"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0B3860] transition"
                          >
                            <span>Buka Pengaturan Kebijakan</span>
                            <ArrowRight size={14} weight="bold" />
                          </Link>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {activePoliciesOnly.map((group, idx) => {
                          const activeVer = group.versions?.find((v) => v.status === "ACTIVE");
                          if (!activeVer) return null;

                          // Ekstrak target role dari versi aktif
                          const custTarget = activeVer.targets?.find(
                            (t) =>
                              t.policy_code === "CUSTOMER_PRODUCT_APP_FEE" ||
                              t.policy_code === "CUSTOMER_SERVICE_APP_FEE" ||
                              t.payer_type === "CUSTOMER"
                          );
                          const merchTarget = activeVer.targets?.find(
                            (t) =>
                              t.policy_code === "MERCHANT_PRODUCT_COMMISSION" ||
                              (t.payer_type === "MERCHANT" && t.scope === "PRODUCT")
                          );
                          const provTarget = activeVer.targets?.find(
                            (t) =>
                              t.policy_code === "PROVIDER_SERVICE_COMMISSION" ||
                              t.payer_type === "PROVIDER" ||
                              (t.scope === "SERVICE" && t.payer_type !== "CUSTOMER")
                          );

                          const hasCustomer = !!custTarget;
                          const hasMerchant = !!merchTarget;
                          const hasProvider = !!provTarget;
                          const targetRolesCount =
                            (hasCustomer ? 1 : 0) + (hasMerchant ? 1 : 0) + (hasProvider ? 1 : 0);

                          const isServiceScope =
                            group.slug.includes("servis") ||
                            group.slug.includes("jasa") ||
                            group.display_name.toLowerCase().includes("jasa") ||
                            group.display_name.toLowerCase().includes("servis") ||
                            hasProvider ||
                            custTarget?.scope === "SERVICE";

                          // Nominal Pendapatan Riil untuk Kebijakan Ini
                          const custRev = hasCustomer
                            ? isServiceScope
                              ? custServiceFee
                              : custProductFee
                            : 0;
                          const merchRev = hasMerchant ? merchProductComm : 0;
                          const provRev = hasProvider ? provServiceComm : 0;
                          const policyTotalRev = custRev + merchRev + provRev;

                          // Hitungan Pesanan Riil
                          const servicePaidOrders = normalizedPayments.filter(
                            (p) =>
                              p.status === "PAID" &&
                              (p.channel === "JASA_DIAGNOSIS" || p.channel === "JASA_PENGERJAAN")
                          ).length;

                          const productPaidOrders = normalizedPayments.filter(
                            (p) => p.status === "PAID" && p.channel === "BARANG_05A"
                          ).length;

                          const relevantOrdersCount = isServiceScope
                            ? Math.max(servicePaidOrders, paidExecutionCount)
                            : productPaidOrders;

                          return (
                            <div
                              key={group.id || idx}
                              className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:border-[#0F4C81]/50 transition flex flex-col justify-between space-y-4"
                            >
                              <div className="space-y-3">
                                {/* Header Kartu & Pill Target Role */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {/* Tipe Penerapan Role (Bisa 1, 2, atau 3 Role) */}
                                      {hasCustomer && hasMerchant && hasProvider && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                                          <Users size={12} weight="bold" />
                                          Target: Pelanggan, Toko &amp; Jasa (3 Role)
                                        </span>
                                      )}
                                      {hasCustomer && hasMerchant && !hasProvider && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                          <Users size={12} weight="bold" />
                                          Target: Pelanggan &amp; Mitra Toko (2 Role)
                                        </span>
                                      )}
                                      {hasCustomer && hasProvider && !hasMerchant && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                                          <Users size={12} weight="bold" />
                                          Target: Pelanggan &amp; Mitra Jasa (2 Role)
                                        </span>
                                      )}
                                      {hasMerchant && hasProvider && !hasCustomer && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 flex items-center gap-1">
                                          <Users size={12} weight="bold" />
                                          Target: Mitra Toko &amp; Mitra Jasa (2 Role)
                                        </span>
                                      )}
                                      {hasCustomer && !hasMerchant && !hasProvider && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                          <Users size={12} weight="bold" />
                                          Target: Khusus Pelanggan
                                        </span>
                                      )}
                                      {hasMerchant && !hasCustomer && !hasProvider && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                                          <Users size={12} weight="bold" />
                                          Target: Khusus Mitra Toko
                                        </span>
                                      )}
                                      {hasProvider && !hasCustomer && !hasMerchant && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 flex items-center gap-1">
                                          <Users size={12} weight="bold" />
                                          Target: Khusus Mitra Jasa
                                        </span>
                                      )}

                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                        v{activeVer.version_no} AKTIF
                                      </span>
                                    </div>

                                    <h3 className="text-base font-black text-slate-900 font-display">
                                      {group.display_name}
                                    </h3>
                                  </div>

                                  <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                                    {group.slug}
                                  </span>
                                </div>

                                {/* Besaran Potongan Sesuai Role Masing-Masing */}
                                <div className="space-y-2 pt-1">
                                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    Aturan Besaran Potongan:
                                  </p>

                                  <div className="grid grid-cols-1 gap-2">
                                    {/* 1. Target Pelanggan */}
                                    {hasCustomer && custTarget && (
                                      <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between text-xs">
                                        <div>
                                          <span className="font-bold text-blue-900 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-[#0F4C81]" />
                                            Biaya Aplikasi Pelanggan:
                                          </span>
                                          <span className="text-[10px] text-blue-700">
                                            Dikenakan per transaksi pembayaran pembeli
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-mono font-black text-blue-950 text-sm">
                                            {custTarget.fee_type === "FIXED"
                                              ? formatCurrency(custTarget.fixed_amount_idr || 0)
                                              : `${custTarget.percentage_rate}%`}
                                          </span>
                                          <span className="text-[9px] block text-blue-600 font-semibold uppercase">
                                            {custTarget.fee_type === "FIXED" ? "Nominal Tetap" : "Persentase"}
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* 2. Target Mitra Toko */}
                                    {hasMerchant && merchTarget && (
                                      <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between text-xs">
                                        <div>
                                          <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                            Komisi Penjualan Toko (05A):
                                          </span>
                                          <span className="text-[10px] text-emerald-700">
                                            Bagi hasil katalog penjualan produk resmi
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-mono font-black text-emerald-950 text-sm">
                                            {merchTarget.fee_type === "PERCENTAGE"
                                              ? `${merchTarget.percentage_rate}%`
                                              : formatCurrency(merchTarget.fixed_amount_idr || 0)}
                                          </span>
                                          <span className="text-[9px] block text-emerald-600 font-semibold uppercase">
                                            {merchTarget.fee_type === "PERCENTAGE" ? "Persentase Omzet" : "Fixed"}
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* 3. Target Mitra Jasa Servis */}
                                    {hasProvider && provTarget && (
                                      <div className="p-2.5 rounded-xl bg-violet-50/60 border border-violet-200/80 flex items-center justify-between text-xs">
                                        <div>
                                          <span className="font-bold text-violet-900 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-violet-600" />
                                            Komisi Mitra Jasa Servis (05B):
                                          </span>
                                          <span className="text-[10px] text-violet-700">
                                            Bagi hasil pelunasan pengerjaan unit (Survei 0%)
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-mono font-black text-violet-950 text-sm">
                                            {provTarget.fee_type === "PERCENTAGE"
                                              ? `${provTarget.percentage_rate}%`
                                              : formatCurrency(provTarget.fixed_amount_idr || 0)}
                                          </span>
                                          <span className="text-[9px] block text-violet-600 font-semibold uppercase">
                                            {provTarget.fee_type === "PERCENTAGE" ? "Persentase Servis" : "Fixed"}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Rincian Hasil Potongan Riil */}
                                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-slate-600">Total Order Diproses:</span>
                                    <span className="font-bold text-slate-900 font-mono">
                                      {relevantOrdersCount} {isServiceScope ? "Pesanan Jasa" : "Pesanan Toko"}
                                    </span>
                                  </div>

                                  {/* Rincian Sumber Dana jika Multi-Role (2 atau 3 Role) */}
                                  {targetRolesCount > 1 && (
                                    <div className="pt-2 border-t border-slate-200/70 space-y-1 text-[11px] text-slate-500">
                                      {hasCustomer && (
                                        <div className="flex items-center justify-between">
                                          <span className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#0F4C81]" />
                                            Dari Pelanggan (Fee Aplikasi):
                                          </span>
                                          <strong className="text-slate-800 font-mono">
                                            {formatCurrency(custRev)}
                                          </strong>
                                        </div>
                                      )}
                                      {hasMerchant && (
                                        <div className="flex items-center justify-between">
                                          <span className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                            Dari Mitra Toko (Komisi 05A):
                                          </span>
                                          <strong className="text-slate-800 font-mono">
                                            {formatCurrency(merchRev)}
                                          </strong>
                                        </div>
                                      )}
                                      {hasProvider && (
                                        <div className="flex items-center justify-between">
                                          <span className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                                            Dari Mitra Jasa (Komisi 05B):
                                          </span>
                                          <strong className="text-violet-800 font-mono">
                                            {formatCurrency(provRev)}
                                          </strong>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                                    <span className="font-bold text-slate-800">Total Uang Kebijakan Ini:</span>
                                    <span className="font-black text-emerald-800 text-sm font-display">
                                      {formatCurrency(policyTotalRev)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Aksi Riwayat & Regulasi */}
                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPolicyForHistory(group)}
                                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0F4C81] hover:text-white text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                >
                                  <ClockCounterClockwise size={14} weight="bold" />
                                  <span>Riwayat Transaksi</span>
                                </button>

                                <Link
                                  href="/finance/policies"
                                  className="text-xs font-bold text-slate-500 hover:text-[#0F4C81] transition flex items-center gap-1"
                                >
                                  <span>Atur di Modul Regulasi</span>
                                  <ArrowRight size={12} weight="bold" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Modal Riwayat Transaksi Kebijakan (Filter Spesifik Berdasarkan Kebijakan Terpilih) */}
                  {selectedPolicyForHistory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                      <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0F4C81] text-white">
                                Riwayat Transaksi Terpotong
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
                            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          >
                            <X size={18} weight="bold" />
                          </button>
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-3">
                          {normalizedPayments.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                              <Receipt size={32} className="text-slate-300 mx-auto" weight="duotone" />
                              <p className="text-xs font-bold text-slate-700">Belum Ada Riwayat Transaksi</p>
                              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                                Belum ada transaksi kas masuk yang tercatat pada kebijakan ini.
                              </p>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
                              {normalizedPayments.slice(0, 10).map((pay) => (
                                <div
                                  key={pay.id}
                                  className="p-3 flex items-center justify-between text-xs bg-white hover:bg-slate-50 transition"
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                          pay.channel === "BARANG_05A"
                                            ? "bg-emerald-50 text-emerald-800"
                                            : pay.channel === "JASA_DIAGNOSIS"
                                            ? "bg-amber-50 text-amber-800"
                                            : "bg-violet-50 text-violet-800"
                                        }`}
                                      >
                                        {pay.channel === "BARANG_05A"
                                          ? "BARANG"
                                          : pay.channel === "JASA_DIAGNOSIS"
                                          ? "DIAGNOSIS"
                                          : "SERVIS"}
                                      </span>
                                      <span className="font-mono font-bold text-slate-900">{pay.id}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 line-clamp-1">{pay.serviceTitle}</p>
                                    <div className="text-[10px] text-slate-400">
                                      {new Date(pay.issuedAt).toLocaleDateString("id-ID")} &bull; {pay.method}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-extrabold text-slate-900 block font-display">
                                      {formatCurrency(pay.amount)}
                                    </span>
                                    <span
                                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                        pay.status === "PAID"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : pay.status === "PENDING"
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {pay.status === "PAID"
                                        ? "Lunas"
                                        : pay.status === "PENDING"
                                        ? "Menunggu"
                                        : "Batal"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-400">
                            Total sampel data: {normalizedPayments.length} transaksi
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedPolicyForHistory(null)}
                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition cursor-pointer"
                          >
                            Tutup
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* -------------------------------------------------------------
                  SUB-TAB 3: DANA MITRA, PELANGGAN & PENCAIRAN
                  ------------------------------------------------------------- */}
              {activeTab === "MANAGED_FUNDS" && (
                <div className="space-y-6">
                  {/* 4 Managed Funds Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Dana Ditahan Escrow */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Uang Ditahan Escrow
                        </span>
                        <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                          <LockKey size={20} weight="duotone" />
                        </span>
                      </div>
                      <div>
                        <span className="text-2xl font-black font-display text-slate-900 block">
                          {formatCurrency(escrowHeldTotal)}
                        </span>
                        <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                          <div className="flex justify-between">
                            <span>Escrow Toko (120 Jam):</span>
                            <strong className="text-slate-800">{formatCurrency(estimatedProductEscrow)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Escrow Jasa Servis:</span>
                            <strong className="text-violet-700">{formatCurrency(estimatedServiceEscrow)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. S-Pay Merchant Siap Tarik */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          S-Pay Mitra Toko
                        </span>
                        <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                          <Storefront size={20} weight="duotone" />
                        </span>
                      </div>
                      <div>
                        <span className="text-2xl font-black font-display text-emerald-800 block">
                          {formatCurrency(merchantPayable)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Saldo toko produk (05A) bebas kliring, siap dicairkan ke bank fisik.
                        </span>
                      </div>
                    </div>

                    {/* 3. S-Pay Mitra Jasa Siap Tarik */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          S-Pay Mitra Jasa
                        </span>
                        <span className="p-2 rounded-xl bg-violet-50 text-violet-700">
                          <Wrench size={20} weight="duotone" />
                        </span>
                      </div>
                      <div>
                        <span className="text-2xl font-black font-display text-violet-800 block">
                          {formatCurrency(providerPayable)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Saldo bengkel/teknisi (05B) tuntas servis, siap ditarik ke bank.
                        </span>
                      </div>
                    </div>

                    {/* 4. S-Pay Pelanggan (Cadangan Refund) */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          S-Pay Pelanggan (Refund)
                        </span>
                        <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                          <HandCoins size={20} weight="duotone" />
                        </span>
                      </div>
                      <div>
                        <span className="text-2xl font-black font-display text-purple-800 block">
                          {formatCurrency(customerRefund)}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Saldo pengembalian 100% pesanan batal (bisa dibelanjakan lagi / ditarik).
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tables Row: Recent Withdrawals & Recent Refunds dengan Penanda Tipe Mitra */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Withdrawals */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bank size={20} className="text-emerald-700" weight="duotone" />
                          <div>
                            <h3 className="text-sm font-black text-slate-900">
                              Antrean Penarikan Dana ke Rekening Bank
                            </h3>
                            <p className="text-[10px] text-slate-400">Pencairan saldo S-Pay oleh Mitra Toko, Mitra Jasa, &amp; Pelanggan</p>
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
                          {recentWithdrawals.slice(0, 5).map((wd) => {
                            const isProvider =
                              wd.spay_account?.owner_type?.includes("PROVIDER") ||
                              wd.id?.includes("PRV");
                            const isCustomer = wd.spay_account?.owner_type === "CUSTOMER";

                            return (
                              <div key={wd.id} className="py-3 flex items-center justify-between text-xs">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                        isProvider
                                          ? "bg-violet-100 text-violet-800"
                                          : isCustomer
                                          ? "bg-purple-100 text-purple-800"
                                          : "bg-emerald-100 text-emerald-800"
                                      }`}
                                    >
                                      {isProvider ? "MITRA JASA" : isCustomer ? "PELANGGAN" : "MITRA TOKO"}
                                    </span>
                                    <span className="font-mono text-[11px] font-bold text-slate-900">
                                      {wd.id}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Tujuan: {wd.bank_destination?.bank_name || "Bank Terdaftar"} (
                                    {wd.bank_destination?.account_number_masked || "****"})
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-extrabold text-slate-900 font-display">
                                    {formatCurrency(wd.net_to_bank_idr)}
                                  </div>
                                  <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                      wd.status === "SUCCEEDED"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : wd.status === "PROCESSING"
                                        ? "bg-sky-100 text-sky-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {wd.status === "SUCCEEDED"
                                      ? "Berhasil"
                                      : wd.status === "PROCESSING"
                                      ? "Diproses"
                                      : "Menunggu"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Recent Refunds */}
                    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HandCoins size={20} className="text-purple-700" weight="duotone" />
                          <div>
                            <h3 className="text-sm font-black text-slate-900">
                              Pengembalian Dana (Batal &amp; Retur)
                            </h3>
                            <p className="text-[10px] text-slate-400">Pengembalian 100% pesanan toko batal &amp; survei diagnosis ke S-Pay</p>
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
                          {recentRefunds.slice(0, 5).map((ref) => {
                            const isDiagnosis =
                              ref.payment_allocation_id?.includes("diagnosis") ||
                              ref.id?.includes("JSA");

                            return (
                              <div key={ref.id} className="py-3 flex items-center justify-between text-xs">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                        isDiagnosis
                                          ? "bg-amber-100 text-amber-800"
                                          : "bg-purple-100 text-purple-800"
                                      }`}
                                    >
                                      {isDiagnosis ? "BATAL DIAGNOSIS" : "BATAL BELANJA TOKO"}
                                    </span>
                                    <span className="font-mono text-[11px] font-bold text-slate-900">
                                      {ref.id}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Ref Alokasi: {ref.payment_allocation_id}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-extrabold text-slate-900 font-display">
                                    {formatCurrency(ref.credited_amount_idr)}
                                  </div>
                                  <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                      ref.status === "SUCCEEDED"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {ref.status === "SUCCEEDED" ? "Berhasil (S-Pay)" : "Diproses"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
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
