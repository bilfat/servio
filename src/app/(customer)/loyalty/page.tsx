"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Coins,
  Crown,
  Ticket,
  Copy,
  Check,
  ClockCountdown,
  ArrowRight,
  Sparkle,
  Gift,
} from "@phosphor-icons/react";
import { useLoyaltyWallet } from "@/features/loyalty/useLoyaltyWallet";
import { Toast } from "@/components/feedback/Toast";

export default function LoyaltyWalletPage() {
  const { wallet, applyVoucher } = useLoyaltyWallet();
  const [manualCode, setManualCode] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setToastMessage(`Kode voucher "${code}" disalin ke clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleClaimManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const res = applyVoucher(manualCode, 150000);
    setToastMessage(res.message);
    setManualCode("");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Servio Rewards & Loyalty
                </span>
              </div>
              <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">
                Dompet Poin & Kupon Diskon
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Kumpulkan poin dari setiap transaksi servis dan tukarkan dengan voucher hemat.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Tier & Points Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F4C81] via-[#092e4e] to-slate-900 p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-300">
                <Crown size={24} weight="fill" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Member Level {wallet.tier}
                </span>
              </div>
              <p className="text-xs text-sky-200">Saldo Poin Servio Koin Aktif</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black font-display tracking-tight text-white">
                  {wallet.pointsBalance.toLocaleString("id-ID")}
                </span>
                <span className="text-sm font-semibold text-sky-200">Poin (Rp {wallet.pointsBalance.toLocaleString("id-ID")})</span>
              </div>
              <p className="text-xs text-amber-200/80 pt-1 flex items-center gap-1.5">
                <ClockCountdown size={14} />
                {wallet.pointsExpiringSoon} poin akan kedaluwarsa pada 31 Des 2026
              </p>
            </div>

            {/* Progress to Next Tier */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 w-full md:w-72 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Progress ke Platinum</span>
                <span className="text-amber-300 font-bold">{wallet.tierProgressPercentage}%</span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${wallet.tierProgressPercentage}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-200 rounded-full"
                />
              </div>
              <p className="text-[11px] text-sky-100/70">
                Selesaikan 2 transaksi servis lagi untuk membuka diskon otomatis 10% setiap booking!
              </p>
            </div>
          </div>
        </div>

        {/* Claim Code Section */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Gift size={20} weight="duotone" className="text-[#0F4C81]" />
              Punya Kode Promo Khusus?
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Masukkan kode voucher dari event atau merchant partner untuk klaim potongan.
            </p>
          </div>

          <form onSubmit={handleClaimManual} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="CONTOH: SERVIOHEMAT"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0F4C81] w-full sm:w-52"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition shrink-0"
            >
              Klaim
            </button>
          </form>
        </div>

        {/* Vouchers Catalog */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Ticket size={22} weight="duotone" className="text-[#0F4C81]" />
            Katalog Kupon & Voucher Diskon Anda
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wallet.vouchers.map((voucher) => (
              <motion.div
                key={voucher.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                      Diskon Rp {voucher.discountAmount.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Hingga {voucher.validUntil}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-1">{voucher.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Min. transaksi Rp {voucher.minSpend.toLocaleString("id-ID")}
                    {voucher.domainRestriction && ` • Khusus Kategori ${voucher.domainRestriction}`}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/60 font-mono text-xs font-bold text-slate-800">
                    {voucher.code}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(voucher.code)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition"
                  >
                    {copiedCode === voucher.code ? (
                      <>
                        <Check size={14} weight="bold" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy size={14} weight="bold" />
                        Salin Kode
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
