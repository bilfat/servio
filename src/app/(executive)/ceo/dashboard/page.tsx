"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useExecutiveAnalytics } from "@/features/ceo/useExecutiveAnalytics";
import { ExecutiveKpiCard } from "@/components/features/executive/ExecutiveKpiCard";
import { ExecutiveTrendChart } from "@/components/features/executive/ExecutiveTrendChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { productAnalyticsApi } from "@/lib/servioApi";
import type { ApiProductAnalytics } from "@/types/domain";
import {
  CurrencyDollar,
  ChartLineUp,
  Receipt,
  Users,
  ShieldCheck,
  Star,
  ClockCounterClockwise,
  Sparkle,
  TrendUp,
  Package,
  Wrench,
  Buildings,
  Handshake,
  Coins,
  ArrowRight,
  Stack,
  Tag,
} from "@phosphor-icons/react";

type DashboardSection = "overview" | "orders" | "revenue" | "fees" | "growth" | "catalog" | "affiliate" | "warranty";

export default function ExecutiveDashboardPage() {
  const repo = useDomainRepository();
  const affiliateSummary = repo.getAffiliateFinanceSummary();
  const warrantyAnalytics = repo.getCeoWarrantyAnalytics();
  const adminMonitoring = repo.getAdminWarrantyMonitoring();
  const { analytics, timeRange, setTimeRange } = useExecutiveAnalytics();
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");

  const [productAnalytics, setProductAnalytics] = useState<ApiProductAnalytics | null>(null);

  React.useEffect(() => {
    productAnalyticsApi
      .get()
      .then((res) => {
        if (res.data) setProductAnalytics(res.data);
      })
      .catch((err) => console.error("Failed to load product analytics:", err));
  }, []);

  const { kpi, breakdown, domainHealth } = analytics;

  // Generate deterministic trend periods based on selected time range
  const trendData = React.useMemo(() => {
    if (timeRange === "today") {
      return [
        { period: "08:00", service: Math.round(breakdown.serviceGmv * 0.12), product: Math.round(breakdown.productGmv * 0.1), b2b: Math.round(breakdown.b2bGmv * 0.08), total: Math.round(kpi.gmv * 0.1) },
        { period: "12:00", service: Math.round(breakdown.serviceGmv * 0.28), product: Math.round(breakdown.productGmv * 0.25), b2b: Math.round(breakdown.b2bGmv * 0.3), total: Math.round(kpi.gmv * 0.28) },
        { period: "16:00", service: Math.round(breakdown.serviceGmv * 0.35), product: Math.round(breakdown.productGmv * 0.38), b2b: Math.round(breakdown.b2bGmv * 0.4), total: Math.round(kpi.gmv * 0.36) },
        { period: "20:00", service: Math.round(breakdown.serviceGmv * 0.25), product: Math.round(breakdown.productGmv * 0.27), b2b: Math.round(breakdown.b2bGmv * 0.22), total: Math.round(kpi.gmv * 0.26) },
      ];
    } else if (timeRange === "7d") {
      return [
        { period: "Sen", service: Math.round(breakdown.serviceGmv * 0.12), product: Math.round(breakdown.productGmv * 0.1), b2b: Math.round(breakdown.b2bGmv * 0.15), total: Math.round(kpi.gmv * 0.12) },
        { period: "Sel", service: Math.round(breakdown.serviceGmv * 0.14), product: Math.round(breakdown.productGmv * 0.13), b2b: Math.round(breakdown.b2bGmv * 0.12), total: Math.round(kpi.gmv * 0.13) },
        { period: "Rab", service: Math.round(breakdown.serviceGmv * 0.15), product: Math.round(breakdown.productGmv * 0.14), b2b: Math.round(breakdown.b2bGmv * 0.16), total: Math.round(kpi.gmv * 0.15) },
        { period: "Kam", service: Math.round(breakdown.serviceGmv * 0.16), product: Math.round(breakdown.productGmv * 0.15), b2b: Math.round(breakdown.b2bGmv * 0.18), total: Math.round(kpi.gmv * 0.16) },
        { period: "Jum", service: Math.round(breakdown.serviceGmv * 0.18), product: Math.round(breakdown.productGmv * 0.19), b2b: Math.round(breakdown.b2bGmv * 0.2), total: Math.round(kpi.gmv * 0.19) },
        { period: "Sab", service: Math.round(breakdown.serviceGmv * 0.15), product: Math.round(breakdown.productGmv * 0.17), b2b: Math.round(breakdown.b2bGmv * 0.11), total: Math.round(kpi.gmv * 0.14) },
        { period: "Min", service: Math.round(breakdown.serviceGmv * 0.1), product: Math.round(breakdown.productGmv * 0.12), b2b: Math.round(breakdown.b2bGmv * 0.08), total: Math.round(kpi.gmv * 0.11) },
      ];
    } else {
      return [
        { period: "W1", service: Math.round(breakdown.serviceGmv * 0.22), product: Math.round(breakdown.productGmv * 0.2), b2b: Math.round(breakdown.b2bGmv * 0.21), total: Math.round(kpi.gmv * 0.21) },
        { period: "W2", service: Math.round(breakdown.serviceGmv * 0.24), product: Math.round(breakdown.productGmv * 0.23), b2b: Math.round(breakdown.b2bGmv * 0.25), total: Math.round(kpi.gmv * 0.24) },
        { period: "W3", service: Math.round(breakdown.serviceGmv * 0.26), product: Math.round(breakdown.productGmv * 0.27), b2b: Math.round(breakdown.b2bGmv * 0.28), total: Math.round(kpi.gmv * 0.27) },
        { period: "W4", service: Math.round(breakdown.serviceGmv * 0.28), product: Math.round(breakdown.productGmv * 0.3), b2b: Math.round(breakdown.b2bGmv * 0.26), total: Math.round(kpi.gmv * 0.28) },
      ];
    }
  }, [breakdown, kpi.gmv, timeRange]);

  return (
    <div className="space-y-6">
      {/* Top Header & Time Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="Executive Analytics Command Center"
          description="Pemantauan kinerja makro, tata kelola take-rate, likuiditas platform, dan indikator pertumbuhan ekosistem SERVIO."
          breadcrumbs={[
            { label: "Executive", href: "/ceo/dashboard" },
            { label: "Analytics Dashboard", href: "/ceo/dashboard" },
          ]}
        />

        {/* Time Range Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 self-start md:self-auto">
          {(["today", "7d", "30d", "90d"] as const).map((range) => {
            const label =
              range === "today" ? "Hari Ini" : range === "7d" ? "7 Hari" : range === "30d" ? "30 Hari" : "90 Hari";
            const isActive = timeRange === range;

            return (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? "bg-white text-primary shadow-servio-xs font-bold"
                    : "text-neutral-slate hover:text-neutral-dark"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary KPI Grid (6 Top Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <ExecutiveKpiCard
          id="gmv"
          title="Total GMV"
          value={formatCurrency(kpi.gmv)}
          changePercent={kpi.gmvChangePercent}
          definition="Total nilai kotor seluruh transaksi jasa, pesanan sparepart retail, dan pengadaan B2B."
          icon={CurrencyDollar}
          iconColor="text-primary"
          bgColor="bg-sky/50"
          onClick={() => setActiveSection("revenue")}
          isActive={activeSection === "revenue"}
        />

        <ExecutiveKpiCard
          id="take-rate"
          title="Take Rate"
          value={`${kpi.takeRate}%`}
          subValue={formatCurrency(kpi.revenue)}
          changePercent={1.8}
          definition="Rata-rata persentase bagi hasil / komisi yang dihasilkan platform terhadap total GMV."
          icon={ChartLineUp}
          iconColor="text-amber-700"
          bgColor="bg-amber-100"
          onClick={() => setActiveSection("fees")}
          isActive={activeSection === "fees"}
        />

        <ExecutiveKpiCard
          id="orders"
          title="Total Transaksi"
          value={kpi.totalOrders}
          subValue="Pesanan Selesai"
          changePercent={kpi.ordersChangePercent}
          definition="Jumlah akumulasi seluruh pesanan jasa, retail e-commerce, dan PO B2B."
          icon={Receipt}
          iconColor="text-purple-600"
          bgColor="bg-purple-100"
          onClick={() => setActiveSection("orders")}
          isActive={activeSection === "orders"}
        />

        <ExecutiveKpiCard
          id="revenue"
          title="Net Revenue"
          value={formatCurrency(kpi.revenue)}
          changePercent={kpi.revenueChangePercent}
          definition="Pendapatan bersih komisi platform sebelum dikurangi biaya operasional gateway."
          icon={TrendUp}
          iconColor="text-emerald-700"
          bgColor="bg-emerald-100"
          onClick={() => setActiveSection("revenue")}
          isActive={activeSection === "revenue"}
        />

        <ExecutiveKpiCard
          id="growth"
          title="Pertumbuhan"
          value={`+${kpi.customerGrowth}`}
          subValue={`+${kpi.providerGrowth} Mitra`}
          changePercent={14.2}
          definition="Penambahan pelanggan baru dan mitra penyedia jasa terverifikasi."
          icon={Users}
          iconColor="text-blue-600"
          bgColor="bg-blue-100"
          onClick={() => setActiveSection("growth")}
          isActive={activeSection === "growth"}
        />

        <ExecutiveKpiCard
          id="sla"
          title="SLA & Rating"
          value={`${kpi.slaOnTimePercent}%`}
          subValue={`★ ${kpi.averageRating}`}
          changePercent={0.5}
          definition="Tingkat ketepatan waktu pengerjaan servis dan rata-rata ulasan bintang pelanggan."
          icon={Star}
          iconColor="text-amber-600"
          bgColor="bg-amber-100"
          onClick={() => setActiveSection("overview")}
          isActive={activeSection === "overview"}
        />
      </div>

      {/* Analytical Section Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: "overview", label: "Ringkasan Eksekutif" },
          { id: "catalog", label: "Analisis Produk & Suku Cadang" },
          { id: "orders", label: "Analisis Order & Volume" },
          { id: "revenue", label: "Pendapatan & GMV" },
          { id: "fees", label: "Fee Platform & Proteksi" },
          { id: "growth", label: "Pertumbuhan & Jangkauan" },
          { id: "affiliate", label: "Program Afiliasi Mitra" },
          { id: "warranty", label: "Tata Kelola Garansi & Klaim" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id as DashboardSection)}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap rounded-t-xl transition-all border-b-2 ${
              activeSection === tab.id
                ? "border-primary text-primary bg-sky/20"
                : "border-transparent text-neutral-slate hover:text-neutral-dark hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION CONTENT: Overview */}
      {activeSection === "overview" && (
        <div className="space-y-6">
          <ExecutiveTrendChart
            title="Tren Kinerja GMV & Komposisi Bisnis"
            subtitle={`Visualisasi pertumbuhan omzet kotor periode ${timeRange} berdasarkan pilar Jasa, Retail Sparepart, dan Grosir B2B.`}
            data={trendData}
            isCurrency
          />

          {/* 6 Canonical Domains Health Matrix */}
          <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-neutral-dark font-display">
                  Kesehatan Operasional 6 Domain Kanonikal
                </h3>
                <p className="text-xs text-neutral-slate mt-0.5">
                  Distribusi omzet, ketersediaan mitra terverifikasi, dan kepatuhan SLA per kategori utama
                </p>
              </div>
              <span className="text-[11px] font-bold text-primary px-3 py-1 rounded-full bg-sky">
                6 Domain Aktif
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-neutral-slate font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Domain Kanonikal</th>
                    <th className="py-2.5 px-3">Kontribusi GMV</th>
                    <th className="py-2.5 px-3">Mitra Aktif</th>
                    <th className="py-2.5 px-3">Order Berjalan</th>
                    <th className="py-2.5 px-3">Kepatuhan SLA</th>
                    <th className="py-2.5 px-3">Growth (MoM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {domainHealth.map((d) => (
                    <tr key={d.domainId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-bold text-neutral-dark font-display">
                        {d.domainName}
                      </td>
                      <td className="py-3 px-3 font-semibold text-neutral-dark">
                        {formatCurrency(d.gmv)}
                      </td>
                      <td className="py-3 px-3 text-neutral-slate">{d.activeProviders} Mitra</td>
                      <td className="py-3 px-3 text-neutral-slate">{d.activeOrders} Order</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <motion.div
                              key={`${d.domainId}-${d.slaPercent}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${d.slaPercent}%` }}
                              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          </div>
                          <span className="font-semibold text-emerald-700">{d.slaPercent}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-600">+{d.growthPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-servio-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-sky-50 text-[#0F4C81]">
                  <Package size={18} weight="fill" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-neutral-dark font-display">
                    Ringkasan Analitik Produk &amp; Suku Cadang (Level 07)
                  </h3>
                  <p className="text-[11px] text-neutral-slate">
                    Metrik realtime pasokan inventaris suku cadang, varian aktif, dan distribusi kategori dari MongoDB.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection("catalog")}
                className="text-xs font-bold text-[#0F4C81] hover:text-[#0b3860] flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Lihat Analisis Lengkap</span>
                <ArrowRight size={13} weight="bold" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-150">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Produk</span>
                <p className="text-xl font-black text-slate-900 font-display mt-0.5">
                  {productAnalytics?.metrics?.totalProducts ?? 0}
                </p>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {productAnalytics?.metrics?.activeProducts ?? 0} Aktif
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-150">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Varian</span>
                <p className="text-xl font-black text-[#0F4C81] font-display mt-0.5">
                  {productAnalytics?.metrics?.totalVariants ?? 0}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  {productAnalytics?.metrics?.activeVariants ?? 0} Siap Jual
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-150">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kategori Resmi</span>
                <p className="text-xl font-black text-purple-900 font-display mt-0.5">
                  {productAnalytics?.metrics?.totalCategories ?? 0}
                </p>
                <span className="text-[10px] text-purple-700 font-medium">
                  {productAnalytics?.categoryDistribution?.length ?? 0} Aktif
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-150">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">B2B Supplier</span>
                <p className="text-xl font-black text-amber-900 font-display mt-0.5">
                  {productAnalytics?.metrics?.totalSupplierProducts ?? 0}
                </p>
                <span className="text-[10px] text-amber-700 font-medium">Katalog Pasokan</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION CONTENT: Orders */}
      {activeSection === "orders" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <Wrench size={18} />
              <span>Pemesanan Jasa Teknis</span>
            </div>
            <p className="text-3xl font-bold text-neutral-dark font-display">
              {breakdown.serviceOrdersCount}
            </p>
            <p className="text-xs text-neutral-slate">
              Nilai: <span className="font-semibold">{formatCurrency(breakdown.serviceGmv)}</span>
            </p>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.round((breakdown.serviceOrdersCount / kpi.totalOrders) * 100)}%`,
                }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="bg-primary h-full rounded-full"
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-2">
            <div className="flex items-center gap-2 text-purple-600 font-bold text-xs">
              <Package size={18} />
              <span>Penjualan Sparepart Retail</span>
            </div>
            <p className="text-3xl font-bold text-neutral-dark font-display">
              {breakdown.productOrdersCount}
            </p>
            <p className="text-xs text-neutral-slate">
              Nilai: <span className="font-semibold">{formatCurrency(breakdown.productGmv)}</span>
            </p>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.round((breakdown.productOrdersCount / kpi.totalOrders) * 100)}%`,
                }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                className="bg-purple-500 h-full rounded-full"
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
              <Buildings size={18} />
              <span>Purchase Order Grosir B2B</span>
            </div>
            <p className="text-3xl font-bold text-neutral-dark font-display">
              {breakdown.b2bOrdersCount}
            </p>
            <p className="text-xs text-neutral-slate">
              Nilai: <span className="font-semibold">{formatCurrency(breakdown.b2bGmv)}</span>
            </p>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.round((breakdown.b2bOrdersCount / kpi.totalOrders) * 100)}%`,
                }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                className="bg-indigo-500 h-full rounded-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION CONTENT: Revenue & Fees */}
      {(activeSection === "revenue" || activeSection === "fees") && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-dark font-display">
            Rincian Yield Pendapatan Platform & Margin Komisi
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-neutral-slate">Komisi Jasa (12.5%)</span>
              <p className="text-xl font-bold text-neutral-dark font-display mt-1">
                {formatCurrency(Math.round((breakdown.serviceGmv * 0.125)))}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-neutral-slate">Komisi Produk Retail (8.0%)</span>
              <p className="text-xl font-bold text-neutral-dark font-display mt-1">
                {formatCurrency(Math.round((breakdown.productGmv * 0.08)))}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-neutral-slate">Fee Transaksi Grosir B2B (3.5%)</span>
              <p className="text-xl font-bold text-neutral-dark font-display mt-1">
                {formatCurrency(Math.round((breakdown.b2bGmv * 0.035)))}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] text-emerald-800 font-semibold">Total Pendapatan Bersih</span>
              <p className="text-xl font-bold text-emerald-950 font-display mt-1">
                {formatCurrency(kpi.revenue)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION CONTENT: Growth & Analytics */}
      {activeSection === "growth" && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-dark font-display">
            Metrik Pertumbuhan Pelanggan & Mitra Jasa
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] text-neutral-slate font-medium">Pelanggan Baru</span>
              <p className="text-2xl font-bold text-slate-900 font-display">+{kpi.customerGrowth}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">+14.2% MoM</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] text-neutral-slate font-medium">Mitra Jasa Terdaftar</span>
              <p className="text-2xl font-bold text-slate-900 font-display">+{kpi.providerGrowth}</p>
              <span className="text-[10px] text-blue-600 font-semibold">Toko & Bengkel Terverifikasi</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] text-neutral-slate font-medium">SLA Ketepatan Servis</span>
              <p className="text-2xl font-bold text-emerald-700 font-display">{kpi.slaOnTimePercent}%</p>
              <span className="text-[10px] text-emerald-600 font-semibold">Rating Rata-rata ★ {kpi.averageRating}</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION CONTENT: Dedicated Product Analytics (Level 07) */}
      {activeSection === "catalog" && (
        <div className="space-y-6">
          {/* Top Product Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-slate font-bold uppercase tracking-wider">Total Produk</span>
                <span className="p-2 rounded-xl bg-sky-50 text-[#0F4C81]">
                  <Package size={20} weight="fill" />
                </span>
              </div>
              <p className="text-3xl font-black text-slate-900 font-display">
                {productAnalytics?.metrics?.totalProducts ?? 0}
              </p>
              <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <span>●</span>
                <span>{productAnalytics?.metrics?.activeProducts ?? 0} Produk Aktif di Katalog</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-slate font-bold uppercase tracking-wider">Total Varian Suku Cadang</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <Stack size={20} weight="fill" />
                </span>
              </div>
              <p className="text-3xl font-black text-[#0F4C81] font-display">
                {productAnalytics?.metrics?.totalVariants ?? 0}
              </p>
              <div className="text-[11px] text-slate-500 font-medium">
                {productAnalytics?.metrics?.activeVariants ?? 0} Varian Aktif Siap Jual
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-slate font-bold uppercase tracking-wider">Kategori Resmi</span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                  <Tag size={20} weight="fill" />
                </span>
              </div>
              <p className="text-3xl font-black text-purple-900 font-display">
                {productAnalytics?.metrics?.totalCategories ?? 0}
              </p>
              <div className="text-[11px] text-purple-700 font-semibold">
                Kategori Kanonikal Aktif
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-slate font-bold uppercase tracking-wider">Katalog Grosir Supplier</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Buildings size={20} weight="fill" />
                </span>
              </div>
              <p className="text-3xl font-black text-amber-900 font-display">
                {productAnalytics?.metrics?.totalSupplierProducts ?? 0}
              </p>
              <div className="text-[11px] text-amber-700 font-semibold">
                Produk Terdaftar di B2B Supply
              </div>
            </div>
          </div>

          {/* Product Category Distribution and Inventory Health */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-dark font-display">
                    Distribusi Produk Berdasarkan Kategori Resmi
                  </h3>
                  <p className="text-xs text-neutral-slate">
                    Sebaran katalog suku cadang aktif di seluruh domain ekosistem SERVIO.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#0F4C81] px-3 py-1 rounded-full bg-sky-50 border border-sky-100">
                  {productAnalytics?.categoryDistribution?.length ?? 0} Kategori
                </span>
              </div>

              <div className="space-y-3">
                {productAnalytics?.categoryDistribution && productAnalytics.categoryDistribution.length > 0 ? (
                  productAnalytics.categoryDistribution.map((cat) => {
                    const total = productAnalytics.metrics?.totalProducts || 1;
                    const percent = Math.round((cat.productCount / total) * 100);
                    return (
                      <div key={cat.categoryId} className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-150">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">{cat.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-500">{percent}%</span>
                            <span className="font-bold text-[#0F4C81] bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                              {cat.productCount} Produk
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-[#0F4C81] rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percent, 5)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-slate-400 py-8 text-center">Memuat data kategori...</div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-neutral-dark font-display">
                    Kesehatan Stok &amp; Pasokan
                  </h3>
                  <p className="text-xs text-neutral-slate">
                    Status kesiapan inventaris suku cadang retail dan grosir.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-800 block">Varian Siap Jual</span>
                      <span className="text-[10px] text-emerald-600">Stok tersedia di merchant</span>
                    </div>
                    <span className="text-xl font-black text-emerald-900 font-display">
                      {productAnalytics?.metrics?.activeVariants ?? 0}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex justify-between items-center">
                    <div>
                      <span className="text-[11px] font-bold text-rose-800 block">Varian Habis (Out of Stock)</span>
                      <span className="text-[10px] text-rose-600">Perlu restock dari supplier</span>
                    </div>
                    <span className="text-xl font-black text-rose-900 font-display">
                      {productAnalytics?.metrics?.outOfStockVariants ?? 0}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex justify-between items-center">
                    <div>
                      <span className="text-[11px] font-bold text-amber-800 block">Katalog B2B Supplier</span>
                      <span className="text-[10px] text-amber-600">Pasokan terhubung ke kanonikal</span>
                    </div>
                    <span className="text-xl font-black text-amber-900 font-display">
                      {productAnalytics?.metrics?.totalSupplierProducts ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Sumber: MongoDB API Kanonikal</span>
                <span className="font-bold text-emerald-600">Sinkronisasi Realtime</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION CONTENT: Affiliate Commercial & Partnership Ecosystem */}
      {activeSection === "affiliate" && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                  <Handshake size={22} weight="fill" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-neutral-dark font-display">
                    Kinerja Makro Program Kemitraan &amp; Afiliasi Sparepart
                  </h3>
                  <p className="text-xs text-neutral-slate">
                    Pertumbuhan transaksi rekomendasi suku cadang dari toko rekanan resmi, pemotongan fee, dan saldo liabilitas reward platform.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/ceo/pricing"
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Tata Kelola Fee CEO
                </Link>
                <Link
                  href="/ops/finance/affiliate"
                  className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1 transition shadow-2xs"
                >
                  <span>Audit Finance Ops</span>
                  <ArrowRight size={13} weight="bold" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] text-neutral-slate font-medium">GMV Afiliasi Produk</span>
                <p className="text-2xl font-bold text-neutral-dark font-display">
                  {formatCurrency(affiliateSummary.totalGmv)}
                </p>
                <span className="text-[10px] text-slate-500">Omzet rekomendasi teratribusi</span>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-1">
                <span className="text-[11px] text-purple-800 font-medium">Fee Terpotong (5%)</span>
                <p className="text-2xl font-bold text-purple-900 font-display">
                  {formatCurrency(affiliateSummary.totalFeeCollected)}
                </p>
                <span className="text-[10px] text-purple-700">Dipotong dari settlement toko</span>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
                <span className="text-[11px] text-blue-800 font-medium">Reward Bengkel (60%)</span>
                <p className="text-2xl font-bold text-blue-900 font-display font-mono">
                  +{affiliateSummary.providerRewardPoints} pts
                </p>
                <span className="text-[10px] text-blue-700">
                  {formatCurrency(affiliateSummary.providerRewardLiability)} liabilitas voucher
                </span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                <span className="text-[11px] text-amber-800 font-medium">Reward Teknisi (40%)</span>
                <p className="text-2xl font-bold text-amber-900 font-display font-mono">
                  +{affiliateSummary.workerRewardPoints} pts
                </p>
                <span className="text-[10px] text-amber-700">
                  {formatCurrency(affiliateSummary.workerRewardLiability)} insentif terbit
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block">
                  Sisa Liabilitas Poin &amp; Cadangan Kas Voucher
                </span>
                <p className="text-xs text-slate-300">
                  Total cadangan likuiditas kas Servio untuk melayani penukaran reward resmi mitra:
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-display text-white">
                  {formatCurrency(affiliateSummary.outstandingLiability)}
                </span>
                <span className="text-[10px] text-emerald-400 block font-semibold">
                  Cadangan Terproteksi 100%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION CONTENT: Warranty & Claims Governance (GAP 07 & WAR-RBAC-10) */}
      {activeSection === "warranty" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-400 text-emerald-950 tracking-wider">
                  Servio Shield V1
                </span>
                <span className="text-xs text-slate-300 font-medium">Tata Kelola &amp; Integritas Operasional Garansi</span>
              </div>
              <h2 className="text-lg font-bold font-display mt-1 text-white">
                Executive Warranty &amp; Claims Intelligence
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                Pengawasan makro tingkat kepatuhan jaminan kualitas layanan, rasio klaim pelanggan terhadap order selesai, efektivitas resolusi teknisi, dan konversi pekerjaan berbayar di luar tanggungan garansi.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start md:self-auto">
              <Link
                href="/admin/warranties"
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/20"
              >
                <span>Buka Admin Monitoring SLA</span>
                <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
          </div>

          {/* 8 Canonical Warranty KPI Grid (Dynamic from repo records) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-1">
              <span className="text-xs text-neutral-slate font-medium">Garansi Aktif (Active Warranties)</span>
              <p className="text-3xl font-black text-emerald-800 font-display font-mono">
                {warrantyAnalytics.activeWarranties}
              </p>
              <div className="flex items-center justify-between text-[11px] text-neutral-slate pt-1">
                <span>Total Terbit: {warrantyAnalytics.totalGranted}</span>
                <span className="text-emerald-700 font-bold">100% Proteksi Servio</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-1">
              <span className="text-xs text-neutral-slate font-medium">Total Volume Klaim (Claim Volume)</span>
              <p className="text-3xl font-black text-purple-900 font-display font-mono">
                {warrantyAnalytics.totalClaims}
              </p>
              <div className="flex items-center justify-between text-[11px] text-neutral-slate pt-1">
                <span>Klaim Masuk Periode Ini</span>
                <span className="text-purple-700 font-bold">Terdistribusi Mitra</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-1">
              <span className="text-xs text-neutral-slate font-medium">Tingkat Klaim (Claim Rate)</span>
              <p className="text-3xl font-black text-primary font-display font-mono">
                {warrantyAnalytics.claimRate}%
              </p>
              <div className="flex items-center justify-between text-[11px] text-neutral-slate pt-1">
                <span>Terhadap Order Bergaransi</span>
                <span className="text-slate-500 font-semibold">&le; 30% Standar Industri</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-1">
              <span className="text-xs text-neutral-slate font-medium">Rata-rata Waktu Resolusi (Avg Resolution)</span>
              <p className="text-3xl font-black text-amber-900 font-display font-mono">
                {warrantyAnalytics.avgResolutionHours} <span className="text-sm font-bold text-amber-700">Jam</span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-neutral-slate pt-1">
                <span>Dari Pengajuan s.d Selesai</span>
                <span className="text-amber-700 font-bold">Target &lt; 72 Jam</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-1">
              <span className="text-xs text-neutral-slate font-medium">Klaim Ditolak Provider (Rejected Claims)</span>
              <p className="text-3xl font-black text-rose-800 font-display font-mono">
                {warrantyAnalytics.rejectedClaims}
              </p>
              <div className="flex items-center justify-between text-[11px] text-neutral-slate pt-1">
                <span>Di Luar Syarat Garansi</span>
                <span className="text-rose-700 font-bold">Hak Prerogatif Mitra</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-1">
              <span className="text-xs text-neutral-slate font-medium">Penawaran Berbayar (Paid Work Proposals)</span>
              <p className="text-3xl font-black text-blue-900 font-display font-mono">
                {warrantyAnalytics.totalProposals}
              </p>
              <div className="flex items-center justify-between text-[11px] text-neutral-slate pt-1">
                <span>Disetujui Pelanggan: {warrantyAnalytics.approvedProposals}</span>
                <span className="text-blue-700 font-bold">Peluang Revenue Tambahan</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-1">
              <span className="text-xs text-neutral-slate font-medium">Konversi Pekerjaan Berbayar (Conversion)</span>
              <p className="text-3xl font-black text-indigo-900 font-display font-mono">
                {warrantyAnalytics.paidWorkConversion}%
              </p>
              <div className="flex items-center justify-between text-[11px] text-neutral-slate pt-1">
                <span>Rasio Persetujuan Pelanggan</span>
                <span className="text-indigo-700 font-bold">Otorisasi Eksklusif Customer</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-1">
              <span className="text-xs text-neutral-slate font-medium">Tren Eskalasi / Sengketa (Escalation Trend)</span>
              <p className="text-3xl font-black text-purple-800 font-display font-mono">
                {warrantyAnalytics.escalatedClaims}
              </p>
              <div className="flex items-center justify-between text-[11px] text-neutral-slate pt-1">
                <span>Status Klaim DISPUTED</span>
                <span className="text-purple-700 font-bold">Dalam Mediasi Admin</span>
              </div>
            </div>
          </div>

          {/* Operational Health & SLA Monitoring Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-dark font-display">
                  Distribusi Kepatuhan SLA Klaim Platform
                </h3>
                <span className="text-[11px] font-bold text-slate-500 font-mono">
                  Total Aktif: {adminMonitoring.openClaimsCount}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-950 block">Dalam Standar SLA (&lt; 48 Jam)</span>
                    <span className="text-emerald-700 text-[11px]">Proses investigasi / perbaikan berjalan lancar</span>
                  </div>
                  <strong className="text-emerald-900 text-sm font-mono">
                    {Math.max(0, adminMonitoring.openClaimsCount - adminMonitoring.slaRiskCount - adminMonitoring.agingClaimsCount)}
                  </strong>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-950 block">SLA At Risk (48 - 72 Jam)</span>
                    <span className="text-amber-700 text-[11px]">Memerlukan tindak lanjut Provider segera</span>
                  </div>
                  <strong className="text-amber-900 text-sm font-mono">{adminMonitoring.slaRiskCount}</strong>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-rose-950 block">Aging Claims (&gt; 72 Jam)</span>
                    <span className="text-rose-700 text-[11px]">Terlambat dari komitmen SLA layanan</span>
                  </div>
                  <strong className="text-rose-900 text-sm font-mono">{adminMonitoring.agingClaimsCount}</strong>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-dark font-display">
                  Pemisahan Kewenangan Tata Kelola (RBAC Governance)
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Strictly Enforced
                </span>
              </div>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="text-slate-900 block mb-0.5">Mitra Service Provider:</strong>
                  <span>Penentu eksklusif cakupan garansi (COVERED/NOT_COVERED) dan harga resmi proposal perbaikan berbayar.</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="text-slate-900 block mb-0.5">Pelanggan (Customer):</strong>
                  <span>Pemberi otorisasi komersial tunggal atas pekerjaan berbayar dan pemilik hak klaim/sengketa.</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="text-slate-900 block mb-0.5">Teknisi &amp; Admin Ops:</strong>
                  <span>Teknisi terbatas pada diagnosis teknis; Admin terbatas pada investigasi SLA dan eskalasi mediasi netral.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
