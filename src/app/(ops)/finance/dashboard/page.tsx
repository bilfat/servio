"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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

type FinanceDashboardTab = "OVERVIEW" | "POLICY_REVENUE" | "MANAGED_FUNDS";

export default function FinanceDashboardPage() {
  const [activeTab, setActiveTab] = useState<FinanceDashboardTab>("OVERVIEW");
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

  const fetchFinanceDashboardData = async () => {
    try {
      setError(null);
      const [revRes, reconRes, payRes, refRes, polRes, wdrRes] = await Promise.all([
        financeApi.revenue.overview().catch(() => ({ data: null })),
        financeApi.ops.reconciliation().catch(() => ({ data: null })),
        financeApi.ops.payments({ per_page: 5 }).catch(() => ({ data: { data: [] } })),
        financeApi.ops.refunds({ per_page: 5 }).catch(() => ({ data: { data: [] } })),
        financeApi.policies.list({ status: "ACTIVE" }).catch(() => ({ data: { items: [] } })),
        financeApi.ops.withdrawals({ per_page: 5 }).catch(() => ({ data: { data: [] } })),
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

  return (
    <div className="space-y-8 pb-16 font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* 1. OPERATIONAL CONNECTED BANNER */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-emerald-200/60 text-emerald-900 font-bold text-xs uppercase tracking-wider shrink-0 flex items-center gap-1">
            <CheckCircle size={14} weight="fill" />
            Terhubung
          </span>
          <p className="text-xs font-semibold">
            FINANCE SERVICE V3 (PORT 8006) • KONTROL OPERASIONAL KEUANGAN RESMI
          </p>
        </div>
        <span className="text-[11px] text-emerald-700 font-medium">
          Hak Akses: FINANCE_PAYMENT_OPS • Pemantauan Pembayaran, Escrow, S-Pay & Pendapatan
        </span>
      </div>

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

      {/* 2. HEADER BANNER */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Finance Operations Hub
            </span>
            <span className="text-xs font-semibold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Modul 06 — S-Pay & Kebijakan V3
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 tracking-tight">
            Ringkasan Operasional Finansial
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Pusat pemantauan lalu lintas kas masuk QRIS/VA, penahanan escrow (120 jam), pembagian pendapatan platform sesuai kebijakan CEO, saldo S-Pay mitra/customer, dan integritas buku besar.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center justify-center cursor-pointer shadow-xs"
            title="Segarkan Data"
          >
            <ArrowsClockwise
              size={18}
              className={isRefreshing ? "animate-spin text-[#0F4C81]" : ""}
            />
          </button>

          <Link
            href="/finance/payments"
            className="px-4 py-2.5 rounded-2xl bg-[#0F4C81] hover:bg-[#0B3860] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
          >
            <span>Monitoring Pembayaran</span>
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      </div>

      {/* 3. NAVIGATION TABS (3 SECTIONS) */}
      <div className="border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            id="tab-btn-overview"
            type="button"
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "OVERVIEW"
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
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "POLICY_REVENUE"
                ? "bg-[#0F4C81] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <TrendUp size={16} weight={activeTab === "POLICY_REVENUE" ? "fill" : "bold"} />
            <span>2. Distribusi Kebijakan Platform</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === "POLICY_REVENUE" ? "bg-white/20 text-white" : "bg-sky-100 text-sky-800"
              }`}
            >
              Rp {(revenueData?.total_collected_fee_idr ?? 0).toLocaleString("id-ID")}
            </span>
          </button>

          <button
            id="tab-btn-managed-funds"
            type="button"
            onClick={() => setActiveTab("MANAGED_FUNDS")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "MANAGED_FUNDS"
                ? "bg-[#0F4C81] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Bank size={16} weight={activeTab === "MANAGED_FUNDS" ? "fill" : "bold"} />
            <span>3. Dana Mitra, Pelanggan & Pencairan</span>
          </button>
        </div>
      </div>

      {/* 4. TAB CONTENTS */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400 bg-white rounded-3xl border border-slate-200">
          <ArrowsClockwise className="w-8 h-8 animate-spin text-[#0F4C81]" />
          <p className="text-xs font-medium text-slate-500">Memuat data operasional dari Finance Service...</p>
        </div>
      ) : (
        <>
          {/* =========================================================================
              TAB 1: ARUS KAS & PEMBAYARAN MASUK (OVERVIEW KAS UTAMA)
             ========================================================================= */}
          {activeTab === "OVERVIEW" && (
        <div className="space-y-8">
          {/* Core Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Volume Pembayaran Masuk (PAID) */}
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
                  Rp {(revenueData?.mock_payment_volume_idr ?? 0).toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Total kas kotor checkout yang telah dibayar (PAID) oleh Customer.
                </span>
              </div>
            </div>

            {/* 2. Dana Tertahan (Escrow 120h) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Dana Ditahan (Escrow 120h)
                </span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <LockKey size={20} weight="duotone" />
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black font-display text-slate-900 block">
                  Rp {(revenueData?.held_liability_idr ?? 0).toLocaleString("id-ID")}
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
                  Rp {(revenueData?.total_collected_fee_idr ?? 0).toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Total fee aplikasi customer & komisi toko dari kebijakan aktif platform.
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
                  className={`p-2 rounded-xl ${
                    reconData?.is_double_entry_balanced
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  <Scales size={20} weight="duotone" />
                </span>
              </div>
              <div className="mt-3">
                <span
                  className={`text-sm font-black uppercase tracking-tight block ${
                    reconData?.is_double_entry_balanced ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {reconData?.is_double_entry_balanced ? "SEIMBANG (BALANCED)" : "SELISIH TERDETEKSI"}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Discrepancy: Rp {(reconData?.discrepancy_idr ?? 0).toLocaleString("id-ID")}
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
              <h3 className="font-black text-slate-900 text-sm">Monitoring Pembayaran</h3>
              <p className="text-xs text-slate-500 mt-1">
                Pantau daftar transaksi QRIS & Virtual Account, status expiry 6 jam, dan simulasi demo bayar.
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
                Proses penarikan saldo S-Pay ke rekening bank fisik (Merchant & Pelanggan) biaya Rp 2.500.
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
                Pantau eksekusi pengembalian 100% dana pesanan batal langsung ke S-Pay Customer.
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
                Lihat Semua Pembayaran →
              </Link>
            </div>

            {recentPayments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-200/80">
                Belum ada transaksi pembayaran yang tercatat di database Finance Service.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentPayments.map((pay) => (
                  <div key={pay.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono text-[11px] font-bold text-slate-900">{pay.id}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Metode: {pay.method} • {new Date(pay.issued_at).toLocaleDateString("id-ID")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-slate-800">
                        Rp {pay.amount_idr.toLocaleString("id-ID")}
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          pay.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : pay.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {pay.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: DISTRIBUSI KEBIJAKAN PLATFORM (POS-POS CUAN SERVIO)
         ========================================================================= */}
      {activeTab === "POLICY_REVENUE" && (
        <div className="space-y-5">
          {/* Compact Top Overview Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-sky-50 text-[#0F4C81] text-[10px] font-bold uppercase tracking-wider border border-sky-200">
                  Ringkasan Pos Biaya
                </span>
                <span className="text-xs text-slate-400">• Kebijakan Aktif CEO</span>
              </div>
              <h2 className="text-lg font-black font-display text-slate-900 tracking-tight">
                Distribusi Pendapatan Kebijakan Platform
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau total order/checkout dan revenue yang dihasilkan dari masing-masing aturan biaya.
              </p>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-left sm:text-right shrink-0">
              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                Total Pendapatan Terkumpul
              </span>
              <span className="text-xl sm:text-2xl font-black font-display text-emerald-900 mt-0.5 block">
                Rp {(revenueData?.total_collected_fee_idr ?? 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Dynamic Compact Policy Cards */}
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
                    Belum ada aturan kebijakan platform yang berstatus aktif/enforced di database Finance Service. Draft tidak ditampilkan karena belum diberlakukan.
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

                  // Scope calculation
                  const isBoth = hasCustomer && hasMerchant;
                  const isCustomerOnly = hasCustomer && !hasMerchant;
                  const isMerchantOnly = !hasCustomer && hasMerchant;

                  // Revenue subtotal for this rule
                  const custSubtotal = hasCustomer ? (revenueData?.customer_product_app_fee_idr ?? 0) : 0;
                  const merchSubtotal = hasMerchant ? (revenueData?.merchant_product_commission_idr ?? 0) : 0;
                  const totalSubtotal = custSubtotal + merchSubtotal;

                  // Processed counts
                  const paidCheckouts = recentPayments.filter((p) => p.status === "PAID").length;
                  const checkoutsCount = hasCustomer ? paidCheckouts : 0;
                  const ordersCount = hasMerchant ? paidCheckouts : 0;

                  return (
                    <div
                      key={group.id || idx}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-[#0F4C81]/40 transition flex flex-col justify-between space-y-4"
                    >
                      {/* Header: Title & Scope Badge */}
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

                    {/* Content Section: Sederhana hanya Total Order / Total Checkout & Total Revenue */}
                    {isMerchantOnly && (
                      <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                            Total Order
                          </span>
                          <span className="text-lg font-black text-slate-900 mt-0.5 block">
                            {ordersCount} Order
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                            Total Revenue
                          </span>
                          <span className="text-lg font-black text-emerald-800 mt-0.5 block">
                            Rp {merchSubtotal.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    )}

                    {isCustomerOnly && (
                      <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-rose-50/60 border border-rose-100">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                            Total Checkout
                          </span>
                          <span className="text-lg font-black text-slate-900 mt-0.5 block">
                            {checkoutsCount} Checkout
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                            Total Revenue
                          </span>
                          <span className="text-lg font-black text-emerald-800 mt-0.5 block">
                            Rp {custSubtotal.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    )}

                    {isBoth && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100">
                            <span className="text-[10px] font-bold text-rose-700 uppercase block">Pelanggan</span>
                            <span className="font-extrabold text-slate-900 block mt-0.5">{checkoutsCount} Checkout</span>
                            <span className="text-[11px] font-black text-emerald-800 block mt-0.5">
                              Rp {custSubtotal.toLocaleString("id-ID")}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
                            <span className="text-[10px] font-bold text-purple-700 uppercase block">Mitra Toko</span>
                            <span className="font-extrabold text-slate-900 block mt-0.5">{ordersCount} Order</span>
                            <span className="text-[11px] font-black text-emerald-800 block mt-0.5">
                              Rp {merchSubtotal.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs px-3">
                          <span className="font-bold text-slate-600">Total Revenue:</span>
                          <span className="font-black text-emerald-800 text-sm">
                            Rp {totalSubtotal.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Footer: Tombol Riwayat & Link Regulasi */}
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
                      {recentPayments.map((pay, i) => (
                        <div key={pay.id || i} className="p-3 flex items-center justify-between text-xs bg-white hover:bg-slate-50 transition">
                          <div>
                            <div className="font-mono font-bold text-slate-900">{pay.id}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(pay.issued_at).toLocaleDateString("id-ID")} • {pay.method}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-slate-800 block">
                              Rp {pay.amount_idr.toLocaleString("id-ID")}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              pay.status === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {pay.status}
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

      {/* =========================================================================
          TAB 3: DANA MITRA, PELANGGAN & PENCAIRAN (ESCROW, S-PAY & WITHDRAWALS)
         ========================================================================= */}
      {activeTab === "MANAGED_FUNDS" && (
        <div className="space-y-8">
          {/* 3 Managed Funds Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Dana Ditahan Escrow */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Dana Ditahan (Escrow 120h)
                </span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <LockKey size={20} weight="duotone" />
                </span>
              </div>
              <div>
                <span className="text-2xl font-black font-display text-slate-900 block">
                  Rp {(revenueData?.held_liability_idr ?? 0).toLocaleString("id-ID")}
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
                  S-Pay Merchant Tersedia
                </span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <Storefront size={20} weight="duotone" />
                </span>
              </div>
              <div>
                <span className="text-2xl font-black font-display text-emerald-800 block">
                  Rp {(revenueData?.merchant_payable_idr ?? 0).toLocaleString("id-ID")}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Saldo toko yang sudah bebas holding, siap dicairkan (payout) ke rekening bank.
                </span>
              </div>
            </div>

            {/* 3. S-Pay Pelanggan (Cadangan Refund) */}
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
                  Rp {(revenueData?.customer_refund_liability_idr ?? 0).toLocaleString("id-ID")}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Saldo customer dari refund pesanan batal (bisa dipakai belanja lagi / ditarik ke bank).
                </span>
              </div>
            </div>
          </div>

          {/* Tables Row: Recent Withdrawals & Recent Refunds */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Withdrawals (Penarikan Dana Toko & Pelanggan) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bank size={18} className="text-emerald-700" weight="duotone" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Penarikan Dana ke Bank (Payouts)</h3>
                    <p className="text-[10px] text-slate-400">Pencairan oleh Toko Merchant & Pelanggan</p>
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
                  {recentWithdrawals.map((wd) => (
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
                          Rp {wd.net_to_bank_idr.toLocaleString("id-ID")}
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
                          {wd.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Refunds (Pengembalian Dana ke S-Pay Pelanggan) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HandCoins size={18} className="text-purple-700" weight="duotone" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Pengembalian Dana (Refund)</h3>
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
                  Belum ada permohonan refund yang dieksekusi.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentRefunds.map((ref) => (
                    <div key={ref.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono text-[11px] font-bold text-slate-900">{ref.id}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Alokasi Order: {ref.payment_allocation_id}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-slate-800">
                          Rp {ref.credited_amount_idr.toLocaleString("id-ID")}
                        </div>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            ref.status === "SUCCEEDED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {ref.status}
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
        </>
      )}
    </div>
  );
}
