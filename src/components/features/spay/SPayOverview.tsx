"use client";

import React from "react";
import {
  CurrencyCircleDollar,
  ClockCountdown,
  ShieldCheck,
  Lock,
  Scales,
  Info,
  WarningCircle,
  CheckCircle,
} from "@phosphor-icons/react";
import { SPayAccountSummary, SPayOwnerType } from "@/types/spay";

export interface SPayOverviewProps {
  summary: SPayAccountSummary;
  isBalanceVisible?: boolean;
}

export function SPayOverview({
  summary,
  isBalanceVisible = true,
}: SPayOverviewProps) {
  const {
    ownerType,
    withdrawableBalance,
    pendingRefundBalance = 0,
    pendingSettlement = 0,
    reservedBalance = 0,
    financialHold = 0,
    outstandingObligation = 0,
  } = summary;

  const mask = (num: number) =>
    isBalanceVisible ? `Rp ${num.toLocaleString("id-ID")}` : "Rp ••••••";

  if (ownerType === "CUSTOMER") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold font-display text-neutral-dark">
            Rincian Saldo Refund Pelanggan
          </h2>
          <span className="text-xs text-neutral-slate font-medium">
            Virtual Account: {summary.accountNumber}
          </span>
        </div>

        {/* Customer Balance Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. Saldo kamu */}
          <div className="glass-card p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Saldo Refund Tersedia
              </span>
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle size={20} weight="fill" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-display text-emerald-950">
                {mask(withdrawableBalance)}
              </div>
              <p className="text-xs text-emerald-700 mt-1 font-medium">
                Siap ditarik ke rekening bank terdaftar kapan saja
              </p>
            </div>
          </div>

          {/* 2. Saldo Refund Sedang Diproses */}
          <div className="glass-card p-5 rounded-2xl border border-amber-200 bg-amber-50/40 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Refund Dalam Proses
              </span>
              <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <ClockCountdown size={20} weight="fill" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-display text-amber-950">
                {mask(pendingRefundBalance)}
              </div>
              <p className="text-xs text-amber-700 mt-1 font-medium">
                Menunggu verifikasi audit pembatalan / nota selisih biaya
              </p>
            </div>
          </div>
        </div>

        {/* Customer Scope Policy Notice */}
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200/80 flex items-start gap-3 text-xs text-slate-700">
          <div className="p-2 rounded-xl bg-primary text-white shrink-0 mt-0.5">
            <Info size={18} weight="bold" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-primary font-display text-xs sm:text-sm">
              Kebijakan Saldo S-Pay Pelanggan (Customer Scope)
            </p>
            <p className="text-slate-600 leading-relaxed">
              Saldo S-Pay Customer hanya menampung <strong>dana pengembalian (refund)</strong> resmi dari transaksi order atau servis yang dibatalkan. Sesuai regulasi kepatuhan keuangan, Customer <strong>tidak memiliki fitur Top Up saldo, pembayaran belanja dengan S-Pay, maupun transfer ke sesama pengguna</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Merchant & Service Provider Financial Breakdown
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-display text-neutral-dark">
            Struktur Saldo &amp; Kliring Keuangan
          </h2>
          <p className="text-xs text-neutral-slate">
            Status pemisahan dana withdrawable, pending settlement, dan retensi risiko operasional.
          </p>
        </div>
        <span className="text-xs font-mono font-semibold text-slate-500 self-start sm:self-auto bg-slate-100 px-2.5 py-1 rounded-lg">
          {summary.accountNumber}
        </span>
      </div>

      {/* Grid of 5 Key Financial Breakdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Withdrawable */}
        <div className="glass-card p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Dapat Dicairkan
              </span>
              <CheckCircle size={18} weight="fill" />
            </div>
            <div className="my-2">
              <p className="text-xl sm:text-2xl font-bold font-display text-emerald-950">
                {mask(withdrawableBalance)}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-emerald-800 font-medium">
            Hak dana bersih (withdrawable)
          </span>
        </div>

        {/* 2. Pending Settlement */}
        <div className="glass-card p-4 rounded-2xl border border-amber-200 bg-amber-50/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Pending Settlement
              </span>
              <ClockCountdown size={18} weight="bold" />
            </div>
            <div className="my-2">
              <p className="text-xl sm:text-2xl font-bold font-display text-amber-950">
                {mask(pendingSettlement)}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-amber-800 font-medium">
            {ownerType === "MERCHANT"
              ? "Menunggu konfirmasi kurir/pembeli"
              : "Menunggu verifikasi QA pengerjaan"}
          </span>
        </div>

        {/* 3. Reserved Balance */}
        <div className="glass-card p-4 rounded-2xl border border-sky-200 bg-sky-50/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#0F4C81]">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Reserved Balance
              </span>
              <ShieldCheck size={18} weight="bold" />
            </div>
            <div className="my-2">
              <p className="text-xl sm:text-2xl font-bold font-display text-slate-900">
                {mask(reservedBalance)}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-slate-600 font-medium">
            Cadangan jaminan garansi/retur
          </span>
        </div>

        {/* 4. Financial Hold */}
        <div className="glass-card p-4 rounded-2xl border border-rose-200 bg-rose-50/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Financial Hold
              </span>
              <Lock size={18} weight="bold" />
            </div>
            <div className="my-2">
              <p className="text-xl sm:text-2xl font-bold font-display text-rose-950">
                {mask(financialHold)}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-rose-800 font-medium">
            {financialHold > 0 ? "Penahanan investigasi fraud" : "Tidak ada penahanan"}
          </span>
        </div>

        {/* 5. Outstanding Obligation */}
        <div className="glass-card p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Obligation
              </span>
              <Scales size={18} weight="bold" />
            </div>
            <div className="my-2">
              <p className="text-xl sm:text-2xl font-bold font-display text-slate-900">
                {mask(outstandingObligation)}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Kewajiban denda SLA/biaya platform
          </span>
        </div>
      </div>

      {/* Safety Guideline Note */}
      <div className="text-[11px] text-slate-500 bg-white/70 border border-slate-200 rounded-xl p-3 flex items-center gap-2">
        <Info size={15} className="text-primary shrink-0" />
        <span>
          <strong>Aturan Pencairan:</strong> Hanya saldo <strong>Dapat Dicairkan (Withdrawable)</strong> yang dapat diproses melalui Tarik Dana. Saldo Pending Settlement dan Reserved Balance tidak dapat ditarik sebelum masa garansi/kliring tuntas.
        </span>
      </div>
    </div>
  );
}
