"use client";

import React from "react";
import {
  Sparkle,
  CreditCard,
  Bank,
  Receipt,
  CheckCircle,
  WarningCircle,
  Info,
} from "@phosphor-icons/react";
import { TaxAndCostSummary } from "@/types/finance";

export interface TaxAndCostSectionProps {
  taxAndCosts: TaxAndCostSummary;
  className?: string;
}

export function TaxAndCostSection({
  taxAndCosts,
  className = "",
}: TaxAndCostSectionProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Informative Note */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 flex items-start gap-3 shadow-xs">
        <Info size={18} weight="bold" className="text-slate-500 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold text-slate-900">Pemisahan Beban Biaya & Pajak:</span> Bagian ini memantau kewajiban perpajakan negara (PPN/PPh) serta biaya pemrosesan transaksi pihak ketiga (Payment Gateway & BI-FAST Payout). Biaya yang ditanggung langsung oleh pengguna (Convenience Fee) tidak dicatat sebagai beban operasional SERVIO.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Panel 1: Pajak & Kepatuhan Fiskal */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <Sparkle size={18} weight="bold" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base font-heading">
                  Monitoring Pajak Transaksi (PPN & PPh)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Kewajiban perpajakan yang tercatat dari transaksi platform
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle size={12} weight="fill" />
              <span>{taxAndCosts.taxComplianceStatus}</span>
            </span>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50">
              <span className="text-slate-600 font-medium">PPN 11% Tercatat (Layanan):</span>
              <span className="font-mono font-bold text-slate-900">
                Rp {taxAndCosts.recordedPPN.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50">
              <span className="text-slate-600 font-medium">PPh 23 Jasa Teknisi Tercatat:</span>
              <span className="font-mono font-bold text-slate-900">
                Rp {taxAndCosts.recordedPPh23.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-purple-50/70 border border-purple-200/80 font-bold text-purple-950">
              <span>Total Kewajiban Pajak Terpantau:</span>
              <span className="font-mono text-sm">
                Rp {(taxAndCosts.recordedPPN + taxAndCosts.recordedPPh23).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>

        {/* Panel 2: Biaya Pemrosesan Gateway & Payout */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-50 text-[#0F4C81]">
                <CreditCard size={18} weight="bold" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base font-heading">
                  Biaya Pemrosesan Transaksi (Processing Fees)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Gateway payment vendor & jaringan pencairan bank BI-FAST
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50">
              <div>
                <span className="text-slate-700 font-medium block">Payment Gateway Fee (Beban SERVIO):</span>
                <span className="text-[10px] text-slate-400">VA & Credit Card absorpsi platform</span>
              </div>
              <span className="font-mono font-bold text-slate-900">
                Rp {taxAndCosts.gatewayFeesServioExpense.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50">
              <div>
                <span className="text-slate-700 font-medium block">Pencairan Bank BI-FAST (Beban SERVIO):</span>
                <span className="text-[10px] text-slate-400">Rp 2.500 per transfer ke rekening mitra</span>
              </div>
              <span className="font-mono font-bold text-slate-900">
                Rp {taxAndCosts.payoutFeesServioExpense.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50/70 border border-slate-200">
              <div>
                <span className="text-slate-500 block">Gateway Fee Dibebankan ke User:</span>
                <span className="text-[10px] text-slate-400">Convenience fee (tidak membebani laba SERVIO)</span>
              </div>
              <span className="font-mono text-slate-600">
                Rp {taxAndCosts.gatewayFeesUserPaid.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-rose-50/70 border border-rose-200/80 font-bold text-rose-950">
              <span>Total Beban Pemrosesan Ditanggung SERVIO:</span>
              <span className="font-mono text-sm">
                Rp {taxAndCosts.totalServioProcessingCost.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
