"use client";

import React, { useState, useMemo } from "react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Sparkle,
  Bank,
  Storefront,
  Users,
  ChartLineUp,
  Percent,
  CalendarBlank,
  CheckCircle,
  CurrencyCircleDollar,
} from "@phosphor-icons/react";

export default function CeoAffiliateDashboardPage() {
  const repo = useDomainRepository();
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "all">("all");

  const affiliateData = useMemo(
    () => repo.getCeoAffiliateAnalytics(selectedPeriod),
    [repo, selectedPeriod, repo.orders, repo.merchantProfiles]
  );

  return (
    <div className="space-y-6 font-body pb-20">
      <PageHeader
        title="Dashboard Bisnis Afiliasi"
        description="Analisis performa program komisi afiliasi sparepart, distribusi reward mitra & teknisi, dan monetisasi toko merchant."
        breadcrumbs={[
          { label: "Executive", href: "/ceo/dashboard" },
          { label: "Affiliate", href: "/ceo/affiliate" },
        ]}
      />

      {/* Period Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Monitoring Komersial Afiliasi Platform</h2>
          <p className="text-xs text-slate-500">
            Kebijakan fee take-rate 5%, zero markup pelanggan, dan skema split reward 60% Mitra / 40% Teknisi.
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl">
          {[
            { id: "7d", label: "7 Hari" },
            { id: "30d", label: "30 Hari" },
            { id: "90d", label: "90 Hari" },
            { id: "all", label: "Semua" },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPeriod(p.id as typeof selectedPeriod)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedPeriod === p.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Pesanan Afiliasi</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-[#0F4C81]">
              <ChartLineUp size={16} weight="duotone" />
            </span>
          </div>
          <p className="text-xl font-bold font-display text-slate-900">{affiliateData.totalAffiliateOrders}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Fee Platform</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Bank size={16} weight="duotone" />
            </span>
          </div>
          <p className="text-lg font-bold font-display text-slate-900 truncate">
            Rp {affiliateData.totalAffiliateFee.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Merchant Terdaftar</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Storefront size={16} weight="duotone" />
            </span>
          </div>
          <p className="text-xl font-bold font-display text-slate-900">{affiliateData.activeMerchantsCount}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Reward Mitra (60%)</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Sparkle size={16} weight="duotone" />
            </span>
          </div>
          <p className="text-lg font-bold font-display text-slate-900">{affiliateData.providerRewardPoints} Pts</p>
          <p className="text-[10px] text-slate-500 font-semibold">Rp {affiliateData.providerRewardValue.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Reward Teknisi (40%)</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Users size={16} weight="duotone" />
            </span>
          </div>
          <p className="text-lg font-bold font-display text-slate-900">{affiliateData.workerRewardPoints} Pts</p>
          <p className="text-[10px] text-slate-500 font-semibold">Rp {affiliateData.workerRewardValue.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Konversi Afiliasi</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Percent size={16} weight="duotone" />
            </span>
          </div>
          <p className="text-xl font-bold font-display text-slate-900">{affiliateData.conversionRate}%</p>
        </div>
      </div>

      {/* Breakdowns & Fee Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Tren Pendapatan Fee Afiliasi Harian</h3>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              5% Take Rate
            </span>
          </div>
          <div className="space-y-3">
            {affiliateData.feeTrend.map((t) => (
              <div key={t.date} className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 w-16">{t.date}</span>
                <div className="flex-1 mx-3 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#0F4C81] h-2 rounded-full"
                    style={{ width: `${Math.min(100, (t.feeAmount / 40000) * 100)}%` }}
                  />
                </div>
                <div className="text-right w-28">
                  <span className="font-bold text-slate-900">Rp {t.feeAmount.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 block">{t.orderCount} order</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reward Distribution Rule */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Distribusi Alokasi Komisi Platform</h3>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <div className="flex justify-between items-center font-bold">
              <span className="text-[#0F4C81]">Mitra Bengkel (Penyedia Jasa)</span>
              <span className="text-slate-900">60%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div className="bg-[#0F4C81] h-2.5 rounded-full" style={{ width: "60%" }} />
            </div>
            <div className="flex justify-between items-center font-bold pt-2">
              <span className="text-amber-700">Teknisi Lapangan (Worker)</span>
              <span className="text-slate-900">40%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: "40%" }} />
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              *Tiap 100 poin reward bernilai setara Rp 10.000 voucher potongan belanja sparepart B2B platform.
            </p>
          </div>
        </div>
      </div>

      {/* Breakdowns by Merchant and Provider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orders by Merchant */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Kontribusi Merchant Toko Sparepart</h3>
          <div className="divide-y divide-slate-100 text-xs">
            {affiliateData.ordersByMerchant.map((m) => (
              <div key={m.merchantId} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{m.merchantName}</p>
                  <p className="text-[11px] text-slate-500">{m.orderCount} pesanan sparepart terpenuhi</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-700">Rp {m.feePaid.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">Fee dibayarkan</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Orders by Provider */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Akumulasi Reward Mitra Teratas</h3>
          <div className="divide-y divide-slate-100 text-xs">
            {affiliateData.ordersByProvider.map((p) => (
              <div key={p.providerId} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{p.providerName}</p>
                  <p className="text-[11px] text-slate-500">{p.orderCount} pesanan terafiliasi</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-700">{p.rewardPoints} Poin</p>
                  <p className="text-[10px] text-slate-400">Terkreditasi</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
