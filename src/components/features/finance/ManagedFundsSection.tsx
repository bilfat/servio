"use client";

import React from "react";
import {
  Bank,
  HandCoins,
  ShieldCheck,
  Receipt,
  ArrowsLeftRight,
  WarningCircle,
  CheckCircle,
  Info,
  Clock,
  Scales,
} from "@phosphor-icons/react";
import { ManagedFundsSummary, FinancialHealthMetrics } from "@/types/finance";

export interface ManagedFundsSectionProps {
  managedFunds: ManagedFundsSummary;
  healthMetrics?: FinancialHealthMetrics;
  className?: string;
}

export function ManagedFundsSection({
  managedFunds,
  healthMetrics,
  className = "",
}: ManagedFundsSectionProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Explicit Disclaimer Callout Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-900 flex items-start gap-3 shadow-xs">
        <Info size={20} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold">Prinsip Akuntansi Finansial SERVIO:</span> Dana yang tertera pada bagian ini merupakan{" "}
          <strong>Dana Transaksi & Kewajiban yang Dikelola (Managed Funds)</strong> — mencakup dana escrow, hak settlement mitra, dan saldo dompet refund customer.{" "}
          <strong className="underline">DILARANG menjumlahkan metrik ini ke dalam Platform Revenue</strong>, karena dana ini bukan pendapatan milik SERVIO melainkan dana titipan transaksi.
        </div>
      </div>

      {/* Grid of 6 Core Managed Funds Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. GMV Transaksi Order */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Volume GMV Transaksi
              </span>
              <span className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <ArrowsLeftRight size={18} weight="bold" />
              </span>
            </div>
            <div className="text-2xl font-black font-display text-slate-900 pt-1">
              Rp {managedFunds.gmvTotal.toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-slate-500">
              Total nilai kotor seluruh order produk & booking jasa
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Pembayaran Sukses:</span>
            <span className="font-mono font-bold text-emerald-600">
              Rp {managedFunds.confirmedPaymentsTotal.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* 2. Saldo Escrow Penampung Aktif */}
        <div className="bg-gradient-to-br from-slate-900 to-[#0F4C81] text-white rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-200 uppercase tracking-wider">
                Dana Escrow Aktif
              </span>
              <span className="p-2 rounded-xl bg-white/10 text-emerald-300">
                <Bank size={18} weight="fill" />
              </span>
            </div>
            <div className="text-2xl font-black font-display text-emerald-300 pt-1">
              Rp {managedFunds.activeEscrowBalance.toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-sky-100/80">
              Dana penampung transaksi yang belum selesai/dikonfirmasi
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-white/15 flex items-center justify-between text-[11px]">
            <span className="text-slate-300">Rekening Kustodian:</span>
            <span className="font-mono font-bold text-white">BCA / Mandiri Virtual</span>
          </div>
        </div>

        {/* 3. Hak Settlement Merchant (Toko Mitra) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Settlement Toko Mitra
              </span>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <HandCoins size={18} weight="bold" />
              </span>
            </div>
            <div className="text-2xl font-black font-display text-purple-900 pt-1">
              Rp {managedFunds.merchantSettlementBalance.toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-slate-500">
              Saldo siap ditarik oleh toko suku cadang mitra
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Status Kewajiban:</span>
            <span className="font-semibold text-purple-700 flex items-center gap-1">
              <CheckCircle size={12} weight="fill" />
              Siap Cair ke Bank
            </span>
          </div>
        </div>

        {/* 4. Hak Settlement Service Provider (Bengkel/Teknisi) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Settlement Jasa Bengkel
              </span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <ShieldCheck size={18} weight="bold" />
              </span>
            </div>
            <div className="text-2xl font-black font-display text-emerald-900 pt-1">
              Rp {managedFunds.providerSettlementBalance.toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-slate-500">
              Saldo siap ditarik oleh bengkel/teknisi rekanan
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Total Mitra Terdaftar:</span>
            <span className="font-mono font-bold text-slate-800">42 Organisasi</span>
          </div>
        </div>

        {/* 5. Saldo Refund Customer (Dompet S-Pay) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Saldo S-Pay Customer
              </span>
              <span className="p-2 rounded-xl bg-rose-50 text-rose-700">
                <Receipt size={18} weight="bold" />
              </span>
            </div>
            <div className="text-2xl font-black font-display text-rose-900 pt-1">
              Rp {managedFunds.spayCustomerRefundBalance.toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-slate-500">
              Saldo refund resmi customer (dapat ditarik ke rekening pribadi)
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Kewajiban Belum Terdanai:</span>
            <span className="font-bold text-emerald-700">Rp 0 (100% Backed)</span>
          </div>
        </div>

        {/* 6. Total Pencairan ke Bank Mitra (Disbursement) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pencairan Sukses (Payout)
              </span>
              <span className="p-2 rounded-xl bg-sky-50 text-[#0F4C81]">
                <Bank size={18} weight="bold" />
              </span>
            </div>
            <div className="text-2xl font-black font-display text-slate-900 pt-1">
              Rp {managedFunds.totalWithdrawnToBank.toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-slate-500">
              Telah ditransfer ke rekening bank via BI-FAST / Batch Payout
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Antrean Batch Payout:</span>
            <span className="font-mono font-bold text-amber-600">
              Rp {managedFunds.pendingWithdrawalBatch.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>

      {/* Financial Health Indicators Row (If provided) */}
      {healthMetrics && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Scales size={18} weight="bold" />
            </span>
            <h4 className="font-display font-bold text-slate-900 text-sm sm:text-base">
              Ringkasan Kesehatan Keuangan & Rekonsiliasi Audit
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-slate-500 text-[11px] block">Tingkat Match Rekonsiliasi</span>
              <span className="text-base font-bold text-emerald-700 font-mono mt-0.5 block">
                {healthMetrics.reconciliationMatchRate}%
              </span>
              <span className="text-[10px] text-slate-400">148 matched gateway</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-slate-500 text-[11px] block">Selisih Discrepancy</span>
              <span className="text-base font-bold text-amber-700 font-mono mt-0.5 block">
                Rp {healthMetrics.reconciliationDiscrepancyAmount.toLocaleString("id-ID")}
              </span>
              <span className="text-[10px] text-slate-400">{healthMetrics.reconciliationDiscrepancyCount} pembulatan biaya bank</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-slate-500 text-[11px] block">Antrean Refund CS</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                {healthMetrics.outstandingRefundCount} Kasus
              </span>
              <span className="text-[10px] text-slate-400">Rp {healthMetrics.outstandingRefundAmount.toLocaleString("id-ID")}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-slate-500 text-[11px] block">Batch Payout Siap Rilis</span>
              <span className="text-base font-bold text-indigo-700 font-mono mt-0.5 block">
                {healthMetrics.pendingPayoutBatchCount} Batch
              </span>
              <span className="text-[10px] text-slate-400">Rp {healthMetrics.pendingPayoutBatchAmount.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
