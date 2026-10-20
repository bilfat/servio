"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bank,
  ArrowLeft,
  ArrowsClockwise,
  ShieldCheck,
  CheckCircle,
  Plus,
  Sparkle,
  Buildings,
  Info,
} from "@phosphor-icons/react";
import { useSPay } from "@/features/spay/spay.frontend-provider";
import { SPayBalanceCard } from "./SPayBalanceCard";
import { SPayOverview } from "./SPayOverview";
import { SPayWithdrawModal } from "./SPayWithdrawModal";
import { SPayTransactionHistory } from "./SPayTransactionHistory";

export interface SPayDetailPageProps {
  backHref?: string;
  backLabel?: string;
}

export function SPayDetailPage({
  backHref,
  backLabel,
}: SPayDetailPageProps) {
  const {
    ownerType,
    summary,
    isBalanceVisible,
    toggleBalanceVisibility,
    withdrawSimulation,
    resetSimulationState,
    availableOrgs,
    currentOrgId,
    switchOrganization,
  } = useSPay();

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  // Default back href
  const resolvedBackHref =
    backHref ||
    (ownerType === "MERCHANT"
      ? "/merchant/dashboard"
      : ownerType === "SERVICE_PROVIDER"
      ? "/provider/dashboard"
      : "/");

  const resolvedBackLabel =
    backLabel ||
    (ownerType === "MERCHANT"
      ? "Kembali ke Dashboard Toko"
      : ownerType === "SERVICE_PROVIDER"
      ? "Kembali ke Dashboard Provider"
      : "Kembali ke Beranda");

  return (
    <div className="space-y-8 pb-20 font-body">
      {/* 1. TOP BANNER: FRONTEND ONLY DISCLAIMER */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkle size={16} weight="fill" className="text-amber-600 shrink-0" />
          <span className="font-semibold">
            FRONTEND-ONLY SIMULATION — Tidak ada dana riil yang dipindahkan. Terisolasi dari backend Finance &amp; Gateway.
          </span>
        </div>
        <button
          type="button"
          onClick={resetSimulationState}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition shadow-xs self-start sm:self-auto"
          title="Reset saldo dan riwayat mutasi ke kondisi awal"
        >
          <ArrowsClockwise size={13} weight="bold" />
          <span>Reset Demo</span>
        </button>
      </div>

      {/* 2. HEADER: BREADCRUMB, LOGO RESMI, & ORG CONTEXT */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <Link
            href={resolvedBackHref}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F4C81] hover:underline transition"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>{resolvedBackLabel}</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border border-slate-200/80 p-2.5 flex items-center justify-center shrink-0 shadow-sm">
              <div className="relative w-full h-full drop-shadow-xs">
                <Image
                  src="/brand/logo-Spay.png"
                  alt="Logo Resmi S-Pay SERVIO"
                  fill
                  sizes="64px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900">
                  Dompet S-Pay
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0F4C81]/10 text-[#0F4C81] border border-[#0F4C81]/20">
                  {ownerType === "CUSTOMER"
                    ? "Akun Pelanggan"
                    : ownerType === "MERCHANT"
                    ? "Akun Toko Mitra"
                    : "Akun Bengkel Rekanan"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {summary.organizationName
                  ? `${summary.organizationName} • ${summary.ownerName}`
                  : `Pemilik Akun: ${summary.ownerName}`}
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Org Switcher for Testing (Merchant & Provider) */}
        {availableOrgs.length > 1 && (
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Buildings size={14} />
              <span>Ganti Konteks Organisasi:</span>
            </label>
            <select
              value={currentOrgId}
              onChange={(e) => switchOrganization(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 w-full"
            >
              {availableOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.id})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. CARD & ACTION ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left 2 Cols: S-Pay Balance Card */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <SPayBalanceCard
            balance={summary.withdrawableBalance}
            ownerType={ownerType}
            organizationName={summary.organizationName}
            accountNumber={summary.accountNumber}
            isBalanceVisible={isBalanceVisible}
            onToggleVisibility={toggleBalanceVisibility}
            className="h-full"
          />
        </div>

        {/* Right Col: Quick Tarik Dana Action & Bank Preview */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pencairan Saldo
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle size={12} weight="fill" />
                <span>BI-FAST Aktif</span>
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-500">Saldo Dapat Dicairkan:</p>
              <p className="text-2xl font-bold font-display text-slate-900 mt-0.5">
                {isBalanceVisible
                  ? `Rp ${summary.withdrawableBalance.toLocaleString("id-ID")}`
                  : "Rp ••••••"}
              </p>
            </div>

            {/* Destination Bank Account Preview */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>Rekening Tujuan Utama:</span>
                <span className="text-emerald-700 font-bold">Terverifikasi</span>
              </div>
              <p className="font-bold text-slate-900">
                {summary.destinationAccounts[0]?.bankName || "Bank BCA"}
              </p>
              <p className="font-mono text-[11px] text-slate-600">
                {summary.destinationAccounts[0]?.accountNumber} • an.{" "}
                {summary.destinationAccounts[0]?.accountHolder}
              </p>
            </div>
          </div>

          {/* Tarik Dana Button */}
          <button
            type="button"
            onClick={() => setIsWithdrawOpen(true)}
            disabled={summary.withdrawableBalance <= 0}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#0F4C81] hover:bg-sky-900 active:scale-[0.98] text-white font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <Bank size={18} weight="bold" />
            <span>Tarik Dana Sekarang</span>
          </button>
        </div>
      </div>

      {/* 4. FINANCIAL OVERVIEW ACCORDING TO ROLE */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm">
        <SPayOverview summary={summary} isBalanceVisible={isBalanceVisible} />
      </div>

      {/* 5. REKENING BANK TUJUAN LIST */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold font-display text-slate-900">
              Rekening Bank Tujuan Terdaftar
            </h2>
            <p className="text-xs text-slate-500">
              Rekening yang telah terverifikasi melalui data legal identitas akun Anda.
            </p>
          </div>
          <span className="text-[11px] text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium self-start sm:self-auto">
            Dikelola via Legal Identity Modul 01
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.destinationAccounts.map((acc) => (
            <div
              key={acc.id}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0F4C81] shadow-xs">
                  <Bank size={20} weight="bold" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{acc.bankName}</span>
                    {acc.isPrimary && (
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-sky-100 text-[#0F4C81]">
                        Utama
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-slate-700 mt-0.5">{acc.accountNumber}</p>
                  <p className="text-[11px] text-slate-500">an. {acc.accountHolder}</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle size={11} weight="fill" />
                <span>Aktif</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. TRANSAKSI DUMMY MUTASI */}
      <SPayTransactionHistory transactions={summary.transactions} />

      {/* 7. WITHDRAWAL MODAL */}
      <SPayWithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        summary={summary}
        onWithdraw={withdrawSimulation}
      />
    </div>
  );
}
