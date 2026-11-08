"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendUp,
  Receipt,
  ShoppingBag,
  Wrench,
  Storefront,
  ShieldCheck,
  ArrowsClockwise,
  Sliders,
  Info,
  Scales,
  Bank,
  CheckCircle,
  WarningCircle,
  LockKey,
  ClockCounterClockwise,
  ArrowRight,
  X,
  Users,
  Percent,
  Sparkle,
  HandCoins,
  CheckFat,
  Clock,
  Money,
  ArrowDown,
  ArrowUp,
  Tag,
} from "@phosphor-icons/react";
import { financeApi } from "@/lib/servioApi";
import { useOrderJasa } from "@/features/order-jasa/hooks/useOrderJasa";
import {
  BackendRevenueOverview,
  BackendReconciliation,
  FeePolicyGroupModel,
  BackendPaymentIntent,
} from "@/types/finance";
import { RevenueKpiCard } from "@/components/features/finance/RevenueKpiCard";
import { formatCurrency } from "@/lib/utils";

type CeoRevenueTab = "REVENUE" | "POLICY_DISTRIBUTION" | "MANAGED_FUNDS" | "HEALTH_AUDIT";

interface NormalizedCeoPaymentRow {
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

export default function CeoRevenueDashboardPage() {
  const [activeTab, setActiveTab] = useState<CeoRevenueTab>("REVENUE");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data telemetri riil dari Finance Service
  const [revenueData, setRevenueData] = useState<BackendRevenueOverview | null>(null);
  const [reconData, setReconData] = useState<BackendReconciliation | null>(null);
  const [activePolicies, setActivePolicies] = useState<FeePolicyGroupModel[]>([]);
  const [recentPayments, setRecentPayments] = useState<BackendPaymentIntent[]>([]);
  const [selectedPolicyForHistory, setSelectedPolicyForHistory] = useState<FeePolicyGroupModel | null>(null);

  // Live Order Jasa integration (05B)
  const { orders: serviceOrders05B } = useOrderJasa();

  const fetchRevenueTelemetry = async () => {
    try {
      setError(null);
      const [revRes, reconRes, polRes, payRes] = await Promise.all([
        financeApi.revenue.overview(),
        financeApi.ops.reconciliation().catch(() => ({ data: null })),
        financeApi.policies.list({ status: "ACTIVE" }).catch(() => ({ data: { items: [] } })),
        financeApi.ops.payments({ per_page: 50 }).catch(() => ({ data: { data: [] } })),
      ]);

      if (revRes && revRes.data) {
        setRevenueData(revRes.data);
      }
      if (reconRes && reconRes.data) {
        setReconData(reconRes.data);
      }
      if (polRes && polRes.data && Array.isArray(polRes.data.items)) {
        setActivePolicies(polRes.data.items);
      }
      if (payRes && payRes.data && Array.isArray(payRes.data.data)) {
        setRecentPayments(payRes.data.data);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat data keuangan CEO:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat data keuangan dari server.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRevenueTelemetry();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchRevenueTelemetry();
      }
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRevenueTelemetry();
  };

  // =========================================================================
  // NORMALISASI TRANSAKSI DUAL-CHANNEL (BARANG 05A & JASA 05B)
  // =========================================================================
  const normalizedPayments = useMemo<NormalizedCeoPaymentRow[]>(() => {
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

  // =========================================================================
  // KALKULASI FINANSIAL DUAL-CHANNEL UNTUK EKSEKUTIF CEO
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

  // Persentase Kontribusi Cuan Toko vs Jasa
  const productRevContributionPct = Math.round((totalProductRevenue / Math.max(platformRevenue, 1)) * 100);
  const serviceRevContributionPct = Math.max(0, 100 - productRevContributionPct);

  // Breakdown Kas Masuk (GMV)
  const paidJasaPayments = normalizedPayments.filter(
    (p) => p.status === "PAID" && (p.channel === "JASA_DIAGNOSIS" || p.channel === "JASA_PENGERJAAN")
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

  const estimatedServiceEscrow = Math.min(
    escrowHeldTotal,
    paidDiagnosisCount * 50000 + paidExecutionCount * 120000
  );
  const estimatedProductEscrow = Math.max(0, escrowHeldTotal - estimatedServiceEscrow);

  return (
    <div className="space-y-6 pb-20 font-body text-left">
      {/* Peringatan Kendala Koneksi */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-xs">
          <WarningCircle size={18} className="text-rose-600 shrink-0 mt-0.5" weight="fill" />
          <div className="flex-1">
            <h4 className="font-bold">Kendala Koneksi Data Finansial</h4>
            <p className="text-rose-800 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchRevenueTelemetry}
            className="text-xs font-bold px-3 py-1 bg-white border border-rose-300 rounded-xl hover:bg-rose-100 cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* HEADER UTAMA EKSEKUTIF CEO */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Laporan Keuangan Eksekutif CEO
            </span>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <ShieldCheck size={13} weight="fill" />
              Sistem Keuangan Terpadu 05A &amp; 05B
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
              <Clock size={12} className="text-primary" />
              Sinkronisasi Otomatis (4.5s)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 tracking-tight">
            Pendapatan SERVIO &amp; Arus Kas Platform
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
            Ringkasan pendapatan platform dari penjualan produk toko &amp; jasa servis, audit alokasi dana amanah pihak ketiga, serta kepatuhan akrual kebijakan CEO.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Link
            href="/ceo/governance/policies"
            className="px-4 py-2.5 rounded-2xl bg-[#0F4C81] hover:bg-[#0B3860] text-white text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
          >
            <Sliders size={16} weight="bold" />
            <span>Tata Kelola Aturan Biaya</span>
          </Link>

          <button
            type="button"
            onClick={handleRefresh}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center justify-center cursor-pointer shadow-2xs"
            title="Segarkan Data Sekarang"
          >
            <ArrowsClockwise
              size={18}
              className={isRefreshing ? "animate-spin text-[#0F4C81]" : ""}
            />
          </button>
        </div>
      </div>

      {/* 4 TAB UTAMA: SEGMENTED PILLS DESIGN */}
      <div className="border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("REVENUE")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "REVENUE"
                ? "bg-[#0F4C81] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <TrendUp size={16} weight="bold" />
            <span>Tab 1: Pendapatan &amp; GMV Platform</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("POLICY_DISTRIBUTION")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "POLICY_DISTRIBUTION"
                ? "bg-[#0F4C81] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Sliders size={16} weight="bold" />
            <span>Tab 2: Distribusi Kebijakan CEO</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === "POLICY_DISTRIBUTION"
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
            <Bank size={16} weight="bold" />
            <span>Tab 3: Dana Amanah &amp; Saldo S-Pay</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("HEALTH_AUDIT")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "HEALTH_AUDIT"
                ? "bg-[#0F4C81] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Scales size={16} weight="bold" />
            <span>Tab 4: Audit Integritas Buku Besar</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: PENDAPATAN & GMV PLATFORM (DUAL-CHANNEL RATIO & 6 PILAR)
          ===================================================================== */}
      {activeTab === "REVENUE" && (
        <div className="space-y-6">
          {/* Executive Overview Banner: Rasio Kontribusi Pendapatan Toko vs Jasa */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Rasio Kontribusi Keuntungan Platform
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-display text-slate-900">
                Total Pendapatan Terkumpul: {formatCurrency(platformRevenue)}
              </h2>
              <p className="text-xs text-slate-500">
                Pemasukan resmi platform dari fee aplikasi pembeli &amp; bagi hasil komisi mitra
              </p>
            </div>

            {/* Visual Bar Kontribusi Toko vs Jasa */}
            <div className="md:w-80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Produk Toko ({productRevContributionPct}%)
                </span>
                <span className="text-violet-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                  Jasa Servis ({serviceRevContributionPct}%)
                </span>
              </div>
              <div className="w-full h-3.5 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${Math.max(productRevContributionPct, 5)}%` }}
                  className="h-full bg-emerald-500 rounded-l-full transition-all"
                  title={`Produk Toko: ${formatCurrency(totalProductRevenue)}`}
                />
                <div
                  style={{ width: `${Math.max(serviceRevContributionPct, 5)}%` }}
                  className="h-full bg-violet-500 rounded-r-full transition-all"
                  title={`Jasa Servis: ${formatCurrency(totalServiceRevenue)}`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{formatCurrency(totalProductRevenue)}</span>
                <span>{formatCurrency(totalServiceRevenue)}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-14 flex flex-col items-center justify-center gap-2.5 text-slate-400 bg-white rounded-3xl border border-slate-200">
              <ArrowsClockwise className="w-8 h-8 animate-spin text-[#0F4C81]" />
              <p className="text-xs font-medium text-slate-500">Memuat rincian telemetri pendapatan...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Total Transaksi GMV dengan Dual-Channel Breakdown */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Total Transaksi (GMV)
                    </span>
                    <span className="p-2.5 rounded-2xl bg-sky-50 text-[#0F4C81]">
                      <Receipt size={20} weight="duotone" />
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 font-display">
                    {formatCurrency(grossVolume)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nilai transaksi kotor yang telah dibayar lunas
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Toko: <strong className="text-slate-900">{formatCurrency(grossProductPaid)}</strong></span>
                  <span>&bull;</span>
                  <span>Jasa: <strong className="text-violet-700">{formatCurrency(grossServicePaid)}</strong></span>
                </div>
              </div>

              {/* 2. Biaya Aplikasi Pembeli Barang */}
              <RevenueKpiCard
                label="Aplikasi Belanja Toko"
                subtitle="Pesanan Barang (05A)"
                amount={custProductFee}
                icon={<ShoppingBag size={20} weight="duotone" />}
                iconBg="bg-blue-50"
                iconColor="text-[#0F4C81]"
                periodLabel="Per Transaksi"
                tooltipText="Biaya aplikasi platform yang dibayarkan pembeli satu kali per transaksi checkout belanja produk toko."
              />

              {/* 3. Komisi Penjualan Toko Barang */}
              <RevenueKpiCard
                label="Komisi Penjualan Toko"
                subtitle="Katalog Barang (05A)"
                amount={merchProductComm}
                icon={<Storefront size={20} weight="duotone" />}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-700"
                periodLabel="Bagi Hasil Toko"
                tooltipText="Bagi hasil komisi platform dari nilai penjualan barang oleh mitra toko resmi."
              />

              {/* 4. Biaya Aplikasi Pelanggan Jasa */}
              <RevenueKpiCard
                label="Aplikasi Pelanggan Jasa"
                subtitle="Pesanan Servis (05B)"
                amount={custServiceFee}
                icon={<Wrench size={20} weight="duotone" />}
                iconBg="bg-sky-50"
                iconColor="text-sky-700"
                periodLabel="Per Booking Jasa"
                tooltipText="Biaya aplikasi platform yang dibayarkan pelanggan saat melakukan pemesanan booking jasa servis terstandar."
              />

              {/* 5. Komisi Mitra Jasa Servis */}
              <RevenueKpiCard
                label="Komisi Mitra Jasa"
                subtitle="Bagi Hasil Pengerjaan (05B)"
                amount={provServiceComm}
                icon={<ShieldCheck size={20} weight="duotone" />}
                iconBg="bg-violet-50"
                iconColor="text-violet-700"
                periodLabel="Per Pengerjaan Tuntas"
                tooltipText="Bagi hasil komisi platform dari nilai pengerjaan order jasa oleh mitra penyedia servis resmi (Survei awal 0% bebas komisi)."
              />

              {/* 6. Status Kepatuhan Akuntansi PSAK */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between sm:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Kepatuhan Pengakuan Akuntansi Standar Keuangan (PSAK)
                    </span>
                    <h4 className="text-sm font-black text-slate-900 mt-1 font-display">
                      {revenueData?.accounting_status === "PENDING_ACCOUNTING_POLICY"
                        ? "Menunggu Pengesahan Kebijakan Akuntansi Akrual"
                        : revenueData?.accounting_status || "Terverifikasi Sesuai Standar Akuntansi Keuangan"}
                    </h4>
                  </div>
                  <span className="p-3 rounded-2xl bg-sky-50 text-[#0F4C81]">
                    <Scales size={22} weight="duotone" />
                  </span>
                </div>
                <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-2 text-xs text-slate-600">
                  <Info size={16} className="text-[#0F4C81] shrink-0" weight="fill" />
                  <span>
                    Pendapatan platform diakui secara akrual langsung (*real-time accrual*) saat pesanan tuntas dan dilindungi rekonsiliasi buku besar otomatis.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: DISTRIBUSI KEBIJAKAN CEO (TERHUBUNG KE ORDER JASA & TRANSPARAN)
          ========================================================================= */}
      {activeTab === "POLICY_DISTRIBUTION" && (
        <div className="space-y-6">
          {/* Banner Atas: Ringkasan Kebijakan CEO */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-[#0F4C81] text-[10px] font-bold uppercase tracking-wider border border-sky-200">
                  Kebijakan Authoritative CEO
                </span>
                <span className="text-xs text-slate-400">&bull; Regulasi Terdaftar di Database Modul Keuangan</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black font-display text-slate-900 tracking-tight">
                Distribusi Potongan &amp; Pendapatan Kebijakan Platform
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
                Setiap aturan kebijakan yang disahkan CEO dapat membebankan potongan ke <strong>Pelanggan</strong> (Biaya Aplikasi), <strong>Mitra Toko</strong> (Komisi Penjualan Barang), <strong>Mitra Jasa</strong> (Komisi Pengerjaan Servis), kombinasi 2 role, maupun ketiga role sekaligus.
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
                    Belum ada aturan kebijakan platform yang berstatus aktif di database Finance Service. Draf tidak ditampilkan karena belum diberlakukan.
                  </p>
                  <Link
                    href="/ceo/governance/policies"
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

                      {/* Tombol Riwayat & Shortcut Aturan */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setSelectedPolicyForHistory(group)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0F4C81] hover:text-white text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <ClockCounterClockwise size={14} weight="bold" />
                          <span>Riwayat Transaksi</span>
                        </button>

                        <Link
                          href="/ceo/governance/policies"
                          className="text-xs font-bold text-slate-500 hover:text-[#0F4C81] transition flex items-center gap-1"
                        >
                          <span>Tata Kelola Aturan</span>
                          <ArrowRight size={12} weight="bold" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Modal Riwayat Transaksi Kebijakan dengan Badge Kanal */}
          {selectedPolicyForHistory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
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
                            <p className="text-[11px] text-slate-700 line-clamp-1">{pay.serviceTitle}</p>
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
                              {pay.status === "PAID" ? "Lunas" : pay.status === "PENDING" ? "Menunggu" : "Batal"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total data sampel: {normalizedPayments.length} transaksi</span>
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

      {/* =====================================================================
          TAB 3: DANA AMANAH PIHAK KETIGA & SALDO S-PAY (MANAGED FUNDS)
          ===================================================================== */}
      {activeTab === "MANAGED_FUNDS" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                Pemantauan Dana Amanah Pihak Ketiga
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Memantau dana pesanan dalam masa garansi/proteksi serta saldo S-Pay yang BUKAN hak milik SERVIO.
              </p>
            </div>
            <span className="text-[11px] text-sky-800 font-semibold bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Pemisahan Dana Amanah Rekening Bersama
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Dana Ditahan Escrow dengan Dual-Channel Breakdown */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Dana Ditahan Escrow
                </span>
                <span className="p-2.5 rounded-2xl bg-amber-50 text-amber-700">
                  <LockKey size={20} weight="duotone" />
                </span>
              </div>
              <div>
                <span className="text-2xl font-black font-display text-slate-900 block">
                  {formatCurrency(escrowHeldTotal)}
                </span>
                <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>120 Jam Toko:</span>
                    <strong className="text-slate-800">{formatCurrency(estimatedProductEscrow)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Jasa Servis (Survei + Garansi):</span>
                    <strong className="text-violet-700">{formatCurrency(estimatedServiceEscrow)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Saldo S-Pay Toko Siap Tarik */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  S-Pay Mitra Toko
                </span>
                <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700">
                  <Storefront size={20} weight="duotone" />
                </span>
              </div>
              <div>
                <span className="text-2xl font-black font-display text-emerald-800 block">
                  {formatCurrency(merchantPayable)}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block leading-relaxed">
                  Kewajiban platform untuk saldo toko barang (05A) yang siap dicairkan ke rekening bank.
                </span>
              </div>
            </div>

            {/* 3. Saldo S-Pay Mitra Jasa Siap Tarik */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  S-Pay Mitra Jasa
                </span>
                <span className="p-2.5 rounded-2xl bg-violet-50 text-violet-700">
                  <Wrench size={20} weight="duotone" />
                </span>
              </div>
              <div>
                <span className="text-2xl font-black font-display text-violet-800 block">
                  {formatCurrency(providerPayable)}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block leading-relaxed">
                  Kewajiban platform untuk saldo teknisi/bengkel servis (05B) tuntas yang siap ditarik ke bank.
                </span>
              </div>
            </div>

            {/* 4. Saldo S-Pay Pengembalian Pembeli */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  S-Pay Refund Pembeli
                </span>
                <span className="p-2.5 rounded-2xl bg-purple-50 text-purple-700">
                  <HandCoins size={20} weight="duotone" />
                </span>
              </div>
              <div>
                <span className="text-2xl font-black font-display text-purple-800 block">
                  {formatCurrency(customerRefund)}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block leading-relaxed">
                  Pengembalian dana 100% dari pesanan toko batal &amp; pembatalan survei diagnosis awal.
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Prinsip Pemisahan Keuangan &amp; Regulasi Amanah Platform</span>
            </h4>
            <p className="leading-relaxed text-[11px] text-slate-500">
              Sesuai tata kelola keuangan resmi, dana pesanan yang sedang ditahan serta saldo S-Pay milik toko, mitra jasa, dan pelanggan <strong>BUKAN merupakan pendapatan platform</strong> dan tidak boleh diakui sebagai keuntungan SERVIO. Seluruh dana tersebut dicatat murni sebagai kewajiban amanah platform hingga diserahkan atau dicairkan ke bank.
            </p>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: AUDIT KESEHATAN BUKU BESAR (DOUBLE-ENTRY BALANCING)
          ===================================================================== */}
      {activeTab === "HEALTH_AUDIT" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Pemeriksaan Integritas Jurnal
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5 font-display">
                  Audit Telemetri Pembukuan Ganda (Debit - Kredit)
                </h3>
              </div>
              <span
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 self-start sm:self-auto ${
                  reconData?.is_double_entry_balanced
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    : "bg-rose-100 text-rose-900 border border-rose-300"
                }`}
              >
                {reconData?.is_double_entry_balanced ? (
                  <>
                    <CheckCircle size={16} weight="fill" />
                    BUKU BESAR SEIMBANG &amp; SESUAI (DEBIT = KREDIT)
                  </>
                ) : (
                  <>
                    <WarningCircle size={16} weight="fill" />
                    ADA SELISIH PEMBUKUAN (PERLU TINJAUAN)
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Jurnal Debit</span>
                <span className="text-xl font-black font-display text-slate-900 mt-0.5 block">
                  {formatCurrency(reconData?.total_debit_idr ?? 0)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Jurnal Kredit</span>
                <span className="text-xl font-black font-display text-slate-900 mt-0.5 block">
                  {formatCurrency(reconData?.total_credit_idr ?? 0)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Selisih Pembukuan</span>
                <span
                  className={`text-xl font-black font-display mt-0.5 block ${
                    (reconData?.discrepancy_idr ?? 0) === 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {formatCurrency(reconData?.discrepancy_idr ?? 0)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Metrik Pembayaran &amp; Pelepasan Dana</span>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Total Pembayaran Lunas (Kas Masuk):</span>
                    <strong className="text-slate-900 font-mono">
                      {formatCurrency(reconData?.metrics?.total_paid_payments_idr ?? grossVolume)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Pelepasan Dana Ditahan ke Saldo S-Pay:</span>
                    <strong className="text-slate-900 font-mono">
                      {formatCurrency(reconData?.metrics?.total_matured_held_released_idr ?? 0)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Metrik Pengembalian Dana &amp; Penarikan Bank</span>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Total Pengembalian Dana (Refund) Berhasil:</span>
                    <strong className="text-slate-900 font-mono">
                      {formatCurrency(reconData?.metrics?.total_refunds_succeeded_idr ?? 0)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Penarikan Saldo ke Bank Selesai:</span>
                    <strong className="text-slate-900 font-mono">
                      {formatCurrency(reconData?.metrics?.total_withdrawals_completed_idr ?? 0)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
