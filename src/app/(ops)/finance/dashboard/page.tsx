"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bank,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  FileText,
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  Clock,
  Scales,
  TrendUp,
  ArrowsLeftRight,
  CurrencyCircleDollar,
  HandCoins,
  ArrowRight,
  Sparkle,
} from "@phosphor-icons/react";
import { useFinanceOperations } from "@/features/finance/useFinanceOperations";
import { Toast } from "@/components/feedback/Toast";

export default function FinanceDashboardPage() {
  const {
    activeEscrowTotal,
    platformGMVToday,
    dailyPayoutTotal,
    pendingPayoutTotal,
    refunds,
    transactions,
    payouts,
  } = useFinanceOperations();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const pendingRefunds = refunds.filter((r) => r.status === "PENDING_APPROVAL");
  const pendingWebhookTrx = transactions.filter((t) => t.status === "PENDING_WEBHOOK");
  const readyPayouts = payouts.filter((p) => p.status === "READY_BATCH");

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

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Finance & Escrow Governance
            </span>
            <span className="text-xs font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-sky-200">
              <ShieldCheck size={14} weight="fill" />
              Otoritas Kliring Finansial
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
            Pusat Operasional Keuangan & Escrow
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Audit saldo rekening penampung escrow, pengawasan penyelesaian webhook gateway, persetujuan refund dana sengketa, dan pencairan batch ke rekening bank mitra.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/ops/finance/payouts"
            className="px-4 py-2.5 rounded-2xl bg-[#0F4C81] hover:bg-sky-900 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <HandCoins size={16} weight="bold" />
            <span>Pencairan Dana ({readyPayouts.length})</span>
          </Link>
          <Link
            href="/ops/finance/refunds"
            className="px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Receipt size={16} weight="bold" />
            <span>Antrean Refund ({pendingRefunds.length})</span>
          </Link>
        </div>
      </div>

      {/* 4 Core Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Saldo Escrow Penampung Aktif */}
        <div className="bg-gradient-to-br from-slate-900 to-[#0F4C81] text-white rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-200 uppercase tracking-wider">
                Saldo Escrow Aktif
              </span>
              <span className="p-2 rounded-xl bg-white/10 text-emerald-300">
                <Bank size={18} weight="fill" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-300 pt-1">
              Rp {activeEscrowTotal.toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-sky-100/80">
              Dana penampung transaksi jasa & sparepart aman
            </p>
          </div>
          <div className="pt-4 mt-2 border-t border-white/15 flex items-center justify-between text-[11px]">
            <span className="text-slate-300">Rekening Kustodian</span>
            <span className="font-mono font-bold text-white">BCA / Mandiri</span>
          </div>
        </div>

        {/* 2. Total Pencairan Dana Harian (Payouts) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pencairan Hari Ini
              </span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <ArrowUpRight size={18} weight="bold" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 pt-1">
              Rp {dailyPayoutTotal.toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-slate-500">
              Telah ditransfer ke rekening bank mitra
            </p>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Siap Ditransfer (Antrean)</span>
            <span className="font-mono font-bold text-amber-600">
              Rp {pendingPayoutTotal.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* 3. Volume GMV Platform */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Volume GMV Harian
              </span>
              <span className="p-2 rounded-xl bg-sky-50 text-[#0F4C81]">
                <TrendUp size={18} weight="bold" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 pt-1">
              Rp {platformGMVToday.toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <span>+14.8%</span>
              <span className="text-slate-400 font-normal">vs rata-rata pekan lalu</span>
            </p>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Estimasi Fee Platform (10%)</span>
            <span className="font-mono font-bold text-slate-800">
              Rp {Math.round(platformGMVToday * 0.1).toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* 4. Antrian Pengembalian Dana (Refunds) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Antrean Refund
              </span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <Receipt size={18} weight="duotone" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 pt-1">
              {pendingRefunds.length} Kasus
            </div>
            <p className="text-[11px] text-slate-500">
              Total Rp{" "}
              {pendingRefunds
                .reduce((sum, r) => sum + r.refundAmount, 0)
                .toLocaleString("id-ID")}
            </p>
          </div>
          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Hasil Mediasi CS</span>
            <Link
              href="/ops/finance/refunds"
              className="font-bold text-[#0F4C81] hover:underline flex items-center gap-0.5"
            >
              <span>Tinjau</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* Critical Alert Bar: Webhook Delay or Fraud Hold */}
      {(pendingWebhookTrx.length > 0 || payouts.some((p) => p.status === "HELD_FRAUD_CHECK")) && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <WarningCircle size={20} weight="fill" />
            </span>
            <div>
              <h2 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Perhatian Operasional Keuangan
              </h2>
              <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                Terdapat <strong>{pendingWebhookTrx.length} transaksi</strong> tertunda konfirmasi webhook gateway dan{" "}
                <strong>1 mitra berisiko</strong> ditahan dalam status audit fraud.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/ops/finance/payments"
              className="px-3.5 py-2 rounded-xl bg-amber-800 text-white text-xs font-bold hover:bg-amber-900 transition"
            >
              Verifikasi Webhook Manual
            </Link>
          </div>
        </div>
      )}

      {/* Quick Flow Grid: Recent Gateway Transactions & Payouts Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payment Log Preview */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold font-display text-slate-900">
                Mutasi Pembayaran Gateway Terbaru
              </h2>
              <p className="text-xs text-slate-500">
                Log real-time pembayaran VA, QRIS, & Kartu Kredit
              </p>
            </div>
            <Link
              href="/ops/finance/payments"
              className="text-xs font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
            >
              <span>Lihat Semua Log</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-2.5">
            {transactions.slice(0, 4).map((trx) => (
              <div
                key={trx.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{trx.id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                      {trx.paymentMethod}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {trx.customerName} • {trx.vendorName}
                  </p>
                </div>

                <div className="text-right space-y-0.5">
                  <span className="font-mono font-bold text-slate-900 block">
                    Rp {trx.grossAmount.toLocaleString("id-ID")}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                      trx.status === "SETTLED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {trx.status === "SETTLED" ? "SETTLED" : "PENDING WEBHOOK"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payouts & Disbursements Queue Preview */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold font-display text-slate-900">
                Pencairan Dana Dompet Mitra
              </h2>
              <p className="text-xs text-slate-500">
                Permintaan transfer hak pendapatan jasa & toko
              </p>
            </div>
            <Link
              href="/ops/finance/payouts"
              className="text-xs font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
            >
              <span>Kelola Payout</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-2.5">
            {payouts.slice(0, 4).map((pay) => (
              <div
                key={pay.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{pay.vendorName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-50 text-[#0F4C81] font-semibold border border-sky-200">
                      {pay.bankName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Rek: {pay.bankAccountNo} • a/n {pay.accountHolder}
                  </p>
                </div>

                <div className="text-right space-y-0.5">
                  <span className="font-mono font-bold text-slate-900 block">
                    Rp {pay.payoutAmount.toLocaleString("id-ID")}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                      pay.status === "RELEASED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : pay.status === "HELD_FRAUD_CHECK"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-teal-50 text-teal-800 border border-teal-200"
                    }`}
                  >
                    {pay.status === "RELEASED"
                      ? "DITRANSFER"
                      : pay.status === "HELD_FRAUD_CHECK"
                      ? "DITAHAN FRAUD"
                      : "SIAP BATCH"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
