"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
} from "@phosphor-icons/react";
import { financeApi } from "@/lib/servioApi";
import {
  BackendRevenueOverview,
  BackendReconciliation,
  FeePolicyGroupModel,
  BackendPaymentIntent,
} from "@/types/finance";
import { RevenueKpiCard } from "@/components/features/finance/RevenueKpiCard";

type CeoRevenueTab = "REVENUE" | "POLICY_DISTRIBUTION" | "MANAGED_FUNDS" | "HEALTH_AUDIT";

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

  const fetchRevenueTelemetry = async () => {
    try {
      setError(null);
      const [revRes, reconRes, polRes, payRes] = await Promise.all([
        financeApi.revenue.overview(),
        financeApi.ops.reconciliation().catch(() => ({ data: null })),
        financeApi.policies.list({ status: "ACTIVE" }).catch(() => ({ data: { items: [] } })),
        financeApi.ops.payments({ per_page: 20 }).catch(() => ({ data: { data: [] } })),
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
      console.error("Gagal memuat data keuangan:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat data keuangan dari server.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRevenueTelemetry();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRevenueTelemetry();
  };

  return (
    <div className="space-y-6 pb-16 font-body text-left">
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
            className="text-xs font-bold px-3 py-1 bg-white border border-rose-300 rounded-xl hover:bg-rose-100"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* HEADER UTAMA: Ukuran font ringkas dan elegan */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Laporan Keuangan Eksekutif
            </span>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <ShieldCheck size={13} weight="fill" />
              Sistem Keuangan Resmi
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold font-display text-slate-900 tracking-tight">
            Pendapatan SERVIO & Arus Dana Platform
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
            Pemantauan 4 pilar pendapatan platform, pemisahan dana amanah pihak ketiga, dan pengawasan audit buku besar.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/ceo/governance/policies"
            className="px-3.5 py-2 rounded-xl bg-[#0F4C81] hover:bg-[#0B3860] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <Sliders size={15} weight="bold" />
            <span>Aturan Biaya & Komisi</span>
          </Link>

          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center justify-center cursor-pointer shadow-xs"
            title="Segarkan Data"
          >
            <ArrowsClockwise
              size={16}
              className={isRefreshing ? "animate-spin text-[#0F4C81]" : ""}
            />
          </button>
        </div>
      </div>

      {/* 4 TAB UTAMA */}
      <div className="border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("REVENUE")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "REVENUE"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
          >
            <TrendUp size={15} weight="bold" />
            <span>Tab 1: Pendapatan SERVIO</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("POLICY_DISTRIBUTION")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "POLICY_DISTRIBUTION"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
          >
            <Sliders size={15} weight="bold" />
            <span>Tab 2: Distribusi Kebijakan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("MANAGED_FUNDS")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "MANAGED_FUNDS"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
          >
            <Bank size={15} weight="bold" />
            <span>Tab 3: Dana Pihak Ketiga & S-Pay</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("HEALTH_AUDIT")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "HEALTH_AUDIT"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
          >
            <Scales size={15} weight="bold" />
            <span>Tab 4: Audit Buku Besar</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: PENDAPATAN SERVIO (4 PILAR SUMBER PENDAPATAN)
          ===================================================================== */}
      {activeTab === "REVENUE" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                Pilar Pendapatan Resmi Platform
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Khusus memantau penerimaan uang yang sah menjadi hak milik SERVIO (cuan platform).
              </p>
            </div>
            <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Cakupan: Pesanan Produk Barang
            </span>
          </div>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-2.5 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <ArrowsClockwise className="w-7 h-7 animate-spin text-[#0F4C81]" />
              <p className="text-xs font-medium text-slate-500">Memuat rincian pendapatan platform...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Total Pendapatan Terkumpul */}
              <RevenueKpiCard
                label="Total Pendapatan Terkumpul"
                subtitle="Pemasukan Operasional Resmi"
                amount={revenueData?.total_collected_fee_idr ?? 0}
                icon={<TrendUp size={18} weight="bold" />}
                iconBg="bg-gradient-to-br from-[#0F4C81] to-[#1A64A3]"
                iconColor="text-white"
                periodLabel="Resmi Tercatat"
                tooltipText="Total pemasukan resmi platform yang bersumber dari biaya aplikasi pembeli dan komisi penjualan toko."
              />

              {/* 2. Biaya Aplikasi Pembeli Barang */}
              <RevenueKpiCard
                label="Biaya Aplikasi Pembeli"
                subtitle="Pesanan Barang (Aktif)"
                amount={revenueData?.customer_product_app_fee_idr ?? 0}
                icon={<ShoppingBag size={18} weight="bold" />}
                iconBg="bg-rose-50"
                iconColor="text-[#F43F5E]"
                periodLabel="1x per Transaksi"
                tooltipText="Biaya aplikasi platform yang dibayarkan pembeli satu kali per transaksi checkout belanja."
              />

              {/* 3. Komisi Penjualan Toko Barang */}
              <RevenueKpiCard
                label="Komisi Penjualan Toko"
                subtitle="Pesanan Barang (Aktif)"
                amount={revenueData?.merchant_product_commission_idr ?? 0}
                icon={<Storefront size={18} weight="bold" />}
                iconBg="bg-purple-50"
                iconColor="text-[#8B5CF6]"
                periodLabel="Per Pesanan Toko"
                tooltipText="Bagi hasil komisi platform dari nilai penjualan barang oleh mitra toko."
              />

              {/* 4. Total Nilai Transaksi Belanja (GMV) */}
              <RevenueKpiCard
                label="Total Transaksi Belanja"
                subtitle="Nilai Transaksi Lunas Dibayar"
                amount={revenueData?.mock_payment_volume_idr ?? 0}
                icon={<Receipt size={18} weight="bold" />}
                iconBg="bg-sky-50"
                iconColor="text-[#0F4C81]"
                periodLabel="Transaksi Lunas"
                tooltipText="Total nilai perputaran belanja yang berhasil dibayar lunas oleh pembeli."
              />

              {/* 5. Biaya Aplikasi Jasa (Roadmap Mendatang) */}
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-2xl border border-indigo-200/70 p-4 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block">
                      Biaya Aplikasi Pemesanan Jasa
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Pemesanan Teknisi & Layanan</p>
                  </div>
                  <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                    <Wrench size={16} weight="duotone" />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black font-display text-slate-400">Rp 0</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Rencana Fitur Jasa Mendatang
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                    Pilar pendapatan ke-3: Biaya aplikasi per booking teknisi servis berlisensi (Akan dibuka saat rilis modul jasa).
                  </p>
                </div>
              </div>

              {/* 6. Komisi Penyedia Jasa (Roadmap Mendatang) */}
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-2xl border border-indigo-200/70 p-4 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block">
                      Komisi Mitra Penyedia Jasa
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Bagi Hasil Mitra Bengkel & Teknisi</p>
                  </div>
                  <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                    <ShieldCheck size={16} weight="duotone" />
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black font-display text-slate-400">Rp 0</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Rencana Fitur Jasa Mendatang
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                    Pilar pendapatan ke-4: Bagi hasil komisi resmi mitra bengkel & teknisi servis rekanan SERVIO.
                  </p>
                </div>
              </div>

              {/* 7. Status Pengakuan Akuntansi PSAK */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Kepatuhan Pengakuan Akuntansi PSAK
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                      {revenueData?.accounting_status === "PENDING_ACCOUNTING_POLICY"
                        ? "Menunggu Pengesahan Kebijakan Akuntansi"
                        : revenueData?.accounting_status || "Terverifikasi Sesuai Standar Akuntansi"}
                    </h4>
                  </div>
                  <span className="p-2 rounded-xl bg-sky-50 text-[#0F4C81]">
                    <Scales size={18} weight="duotone" />
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <Info size={14} className="inline mr-1 text-[#0F4C81]" />
                  Pendapatan riil diakui setelah kepatuhan audit standar akuntansi keuangan (PSAK) disahkan secara resmi.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: DISTRIBUSI KEBIJAKAN PLATFORM (SELARAS DENGAN FINANCE)
          ========================================================================= */}
      {activeTab === "POLICY_DISTRIBUTION" && (
        <div className="space-y-4">
          {/* Baris Ringkasan Atas */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-sky-50 text-[#0F4C81] text-[10px] font-bold uppercase tracking-wider border border-sky-200">
                  Ringkasan Aturan Biaya
                </span>
                <span className="text-xs text-slate-400">• Kebijakan Aktif Disahkan</span>
              </div>
              <h2 className="text-base font-bold font-display text-slate-900 tracking-tight">
                Distribusi Pendapatan Kebijakan Platform
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau total transaksi belanja pembeli, pesanan toko, dan revenue dari setiap kebijakan aktif.
              </p>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-left sm:text-right shrink-0">
              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                Total Pendapatan Terkumpul
              </span>
              <span className="text-lg font-black font-display text-emerald-900 mt-0.5 block">
                Rp {(revenueData?.total_collected_fee_idr ?? 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Kartu Kebijakan Aktif (Format Ringkas Selaras Finance) */}
          {(() => {
            const activePoliciesOnly = activePolicies.filter(
              (group) =>
                group.business_status === "ACTIVE" &&
                group.versions?.some((v) => v.status === "ACTIVE")
            );

            if (activePoliciesOnly.length === 0) {
              return (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5">
                  <ShieldCheck size={32} className="text-slate-300 mx-auto" weight="duotone" />
                  <h4 className="font-bold text-slate-800 text-xs">Belum Ada Kebijakan Biaya Aktif</h4>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    Belum ada aturan kebijakan platform yang berstatus aktif di database keuangan. Draf tidak ditampilkan karena belum diberlakukan.
                  </p>
                  <Link
                    href="/ceo/governance/policies"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-sky-900 transition"
                  >
                    <span>Kelola Kebijakan</span>
                    <ArrowRight size={13} weight="bold" />
                  </Link>
                </div>
              );
            }

            const paidCheckouts = recentPayments.filter((p) => p.status === "PAID").length;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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

                  const checkoutsCount = hasCustomer ? paidCheckouts : 0;
                  const ordersCount = hasMerchant ? paidCheckouts : 0;

                  return (
                    <div
                      key={group.id || idx}
                      className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-[#0F4C81]/40 transition flex flex-col justify-between space-y-3"
                    >
                      {/* Judul & Lingkup Sasaran */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isBoth && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Pembeli & Mitra Toko
                              </span>
                            )}
                            {isCustomerOnly && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Khusus Pembeli
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

                        <h3 className="text-xs font-bold text-slate-900 font-display">
                          {group.display_name}
                        </h3>
                      </div>

                      {/* Format Ringkas: Total Pesanan / Total Transaksi & Total Pendapatan */}
                      {isMerchantOnly && (
                        <div className="grid grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-purple-50/60 border border-purple-100">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                              Total Pesanan
                            </span>
                            <span className="text-base font-black text-slate-900 mt-0.5 block">
                              {ordersCount} Pesanan
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                              Total Pendapatan
                            </span>
                            <span className="text-base font-black text-emerald-800 mt-0.5 block">
                              Rp {merchSubtotal.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      )}

                      {isCustomerOnly && (
                        <div className="grid grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-rose-50/60 border border-rose-100">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                              Total Transaksi
                            </span>
                            <span className="text-base font-black text-slate-900 mt-0.5 block">
                              {checkoutsCount} Transaksi
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                              Total Pendapatan
                            </span>
                            <span className="text-base font-black text-emerald-800 mt-0.5 block">
                              Rp {custSubtotal.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      )}

                      {isBoth && (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded-xl bg-rose-50/50 border border-rose-100">
                              <span className="text-[10px] font-bold text-rose-700 uppercase block">Pembeli</span>
                              <span className="font-extrabold text-slate-900 block mt-0.5">{checkoutsCount} Transaksi</span>
                              <span className="text-[10px] font-black text-emerald-800 block mt-0.5">
                                Rp {custSubtotal.toLocaleString("id-ID")}
                              </span>
                            </div>

                            <div className="p-2 rounded-xl bg-purple-50/50 border border-purple-100">
                              <span className="text-[10px] font-bold text-purple-700 uppercase block">Mitra Toko</span>
                              <span className="font-extrabold text-slate-900 block mt-0.5">{ordersCount} Pesanan</span>
                              <span className="text-[10px] font-black text-emerald-800 block mt-0.5">
                                Rp {merchSubtotal.toLocaleString("id-ID")}
                              </span>
                            </div>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs px-2.5">
                            <span className="font-bold text-slate-600 text-[11px]">Total Pendapatan:</span>
                            <span className="font-black text-emerald-800 text-xs">
                              Rp {totalSubtotal.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Tombol Riwayat & Shortcut Aturan */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setSelectedPolicyForHistory(group)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0F4C81] hover:text-white text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <ClockCounterClockwise size={13} weight="bold" />
                          <span>Riwayat Transaksi</span>
                        </button>

                        <Link
                          href="/ceo/governance/policies"
                          className="text-xs font-bold text-slate-400 hover:text-[#0F4C81] transition flex items-center gap-1"
                        >
                          <span>Aturan Regulasi</span>
                          <ArrowRight size={11} weight="bold" />
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
              <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 shadow-2xl space-y-3.5 max-h-[85vh] flex flex-col">
                <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0F4C81] text-white">
                        Riwayat Transaksi
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {selectedPolicyForHistory.slug}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 font-display">
                      {selectedPolicyForHistory.display_name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPolicyForHistory(null)}
                    className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 space-y-2">
                  {recentPayments.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <Receipt size={28} className="text-slate-300 mx-auto" weight="duotone" />
                      <p className="text-xs font-bold text-slate-700">Belum Ada Riwayat Transaksi</p>
                      <p className="text-[10px] text-slate-400">
                        Belum ada transaksi pembayaran kas masuk yang tercatat pada kebijakan ini.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
                      {recentPayments.map((pay, i) => (
                        <div key={pay.id || i} className="p-2.5 flex items-center justify-between text-xs bg-white hover:bg-slate-50 transition">
                          <div>
                            <div className="font-mono font-bold text-slate-900 text-[11px]">{pay.id}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(pay.issued_at).toLocaleDateString("id-ID")} • Metode: {pay.method}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-slate-800 block text-xs">
                              Rp {pay.amount_idr.toLocaleString("id-ID")}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${pay.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                              }`}>
                              {pay.status === "PAID" ? "Lunas" : "Menunggu"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Total: {recentPayments.length} transaksi</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPolicyForHistory(null)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
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
          TAB 3: DANA PIHAK KETIGA & SALDO S-PAY (MANAGED FUNDS)
          ===================================================================== */}
      {activeTab === "MANAGED_FUNDS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-heading">
                Pemantauan Dana Amanah Pihak Ketiga
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Khusus memantau dana pesanan dan saldo S-Pay yang BUKAN merupakan hak milik SERVIO.
              </p>
            </div>
            <span className="text-[11px] text-sky-800 font-semibold bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Pemisahan Dana Amanah
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Dana Ditahan (Rekening Bersama 120 Jam) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Dana Ditahan (120 Jam)
                </span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <LockKey size={18} weight="duotone" />
                </span>
              </div>
              <div>
                <span className="text-xl font-bold font-display text-slate-900 block">
                  Rp {(revenueData?.held_liability_idr ?? 0).toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                  Hak bersih toko yang ditahan sementara selama 5 hari (120 jam) setelah pesanan diselesaikan pembeli.
                </span>
              </div>
            </div>

            {/* 2. Saldo S-Pay Toko Siap Tarik */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Saldo S-Pay Toko Siap Tarik
                </span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <Storefront size={18} weight="duotone" />
                </span>
              </div>
              <div>
                <span className="text-xl font-bold font-display text-emerald-800 block">
                  Rp {(revenueData?.merchant_payable_idr ?? 0).toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                  Kewajiban platform untuk saldo toko yang sudah berhak dicairkan kapan saja ke rekening bank.
                </span>
              </div>
            </div>

            {/* 3. Saldo S-Pay Pengembalian Dana Pembeli */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Saldo S-Pay Pengembalian Pembeli
                </span>
                <span className="p-2 rounded-xl bg-sky-50 text-sky-700">
                  <Receipt size={18} weight="duotone" />
                </span>
              </div>
              <div>
                <span className="text-xl font-bold font-display text-sky-800 block">
                  Rp {(revenueData?.customer_refund_liability_idr ?? 0).toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block leading-relaxed">
                  Pengembalian dana dari pesanan yang dibatalkan; dapat dicairkan jika saldo mencapai minimal Rp 20.000.
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs text-xs text-slate-600 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs">Prinsip Pemisahan Keuangan & Regulasi Amanah Platform</h4>
            <p className="leading-relaxed text-[11px] text-slate-500">
              Sesuai regulasi keuangan resmi, dana pesanan yang sedang ditahan serta saldo S-Pay milik toko dan pelanggan <strong>BUKAN merupakan pendapatan platform</strong> dan tidak boleh diakui sebagai keuntungan SERVIO. Seluruh dana tersebut dicatat murni sebagai kewajiban amanah platform hingga diserahkan atau dicairkan.
            </p>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: AUDIT KESEHATAN BUKU BESAR (PEMBUKUAN GANDA)
          ===================================================================== */}
      {activeTab === "HEALTH_AUDIT" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Pemeriksaan Audit Integritas
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  Audit Telemetri Pembukuan Ganda (Debit-Kredit Seimbang)
                </h3>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 self-start sm:self-auto ${reconData?.is_double_entry_balanced
                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                  : "bg-rose-100 text-rose-900 border border-rose-300"
                  }`}
              >
                {reconData?.is_double_entry_balanced ? (
                  <>
                    <CheckCircle size={14} weight="fill" />
                    BUKU BESAR SEIMBANG & SESUAI (DEBIT = KREDIT)
                  </>
                ) : (
                  <>
                    <WarningCircle size={14} weight="fill" />
                    ADA SELISIH PEMBUKUAN (PERLU TINJAUAN)
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Jurnal Debit</span>
                <span className="text-lg font-bold font-display text-slate-900 mt-0.5 block">
                  Rp {(reconData?.total_debit_idr ?? 0).toLocaleString("id-ID")}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Jurnal Kredit</span>
                <span className="text-lg font-bold font-display text-slate-900 mt-0.5 block">
                  Rp {(reconData?.total_credit_idr ?? 0).toLocaleString("id-ID")}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Selisih Pembukuan</span>
                <span className={`text-lg font-bold font-display mt-0.5 block ${(reconData?.discrepancy_idr ?? 0) === 0 ? "text-emerald-700" : "text-rose-700"
                  }`}>
                  Rp {(reconData?.discrepancy_idr ?? 0).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-xs font-bold text-slate-800 block mb-2">Metrik Pembayaran & Pelepasan Dana</span>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Total Pembayaran Lunas (Kas Masuk):</span>
                    <strong className="text-slate-900">
                      Rp {(reconData?.metrics?.total_paid_payments_idr ?? 0).toLocaleString("id-ID")}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Pelepasan Dana Ditahan ke Saldo S-Pay:</span>
                    <strong className="text-slate-900">
                      Rp {(reconData?.metrics?.total_matured_held_released_idr ?? 0).toLocaleString("id-ID")}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-xs font-bold text-slate-800 block mb-2">Metrik Pengembalian Dana & Penarikan Bank</span>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Total Pengembalian Dana (Refund) Berhasil:</span>
                    <strong className="text-slate-900">
                      Rp {(reconData?.metrics?.total_refunds_succeeded_idr ?? 0).toLocaleString("id-ID")}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Penarikan Saldo ke Rekening Bank Selesai:</span>
                    <strong className="text-slate-900">
                      Rp {(reconData?.metrics?.total_withdrawals_completed_idr ?? 0).toLocaleString("id-ID")}
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
