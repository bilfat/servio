"use client";

import React from "react";
import { ShieldCheck, Info } from "@phosphor-icons/react";

export interface PriceItem {
  id: string;
  label: string;
  amount: number;
  subtitle?: string;
  isDiscount?: boolean;
}

export interface PriceBreakdownProps {
  items: PriceItem[];
  applicationFee?: number;
  applicationFeeLabel?: string;
  discountTotal?: number;
  escrowProtected?: boolean;
  className?: string;
  taxStatus?: "NOT_USED" | "USED";
  taxAmount?: number | null;
  taxRate?: number | null;
  taxLabel?: string;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PriceBreakdown({
  items,
  applicationFee = 5000,
  applicationFeeLabel = "Fee Aplikasi",
  discountTotal = 0,
  escrowProtected = true,
  className = "",
  taxStatus,
  taxAmount = null,
  taxRate = null,
  taxLabel,
}: PriceBreakdownProps) {
  const subtotal = items.reduce((sum, item) => sum + (item.isDiscount ? -item.amount : item.amount), 0);
  const effectiveTax = taxStatus === "USED" && typeof taxAmount === "number" ? Math.max(0, taxAmount) : 0;
  const grandTotal = Math.max(0, subtotal + applicationFee + effectiveTax - discountTotal);

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-4 font-body text-left ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-dark font-display">
          Rincian Biaya Transaksi
        </h4>
        {escrowProtected && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <ShieldCheck size={14} weight="fill" />
            Servio Escrow Protection
          </span>
        )}
      </div>

      {/* Itemized list */}
      <div className="space-y-2 text-xs">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-neutral-dark font-medium">{item.label}</span>
              {item.subtitle && (
                <p className="text-[11px] text-neutral-slate">{item.subtitle}</p>
              )}
            </div>
            <span
              className={`font-mono font-semibold shrink-0 ${
                item.isDiscount ? "text-secondary" : "text-neutral-dark"
              }`}
            >
              {item.isDiscount ? `- ${formatRupiah(item.amount)}` : formatRupiah(item.amount)}
            </span>
          </div>
        ))}

        {applicationFee > 0 && (
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-dashed border-slate-100">
            <span className="text-neutral-slate flex items-center gap-1">
              {applicationFeeLabel}
              <Info size={14} className="text-neutral-muted" />
            </span>
            <span className="font-mono font-semibold text-neutral-dark">
              {formatRupiah(applicationFee)}
            </span>
          </div>
        )}

        {taxStatus && (
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-dashed border-slate-100">
            <span className="text-neutral-slate flex items-center gap-1">
              {taxLabel || (taxStatus === "USED" && taxRate ? `Pajak (${taxRate}%)` : "Pajak (Tax)")}
              <Info size={14} className="text-neutral-muted" />
            </span>
            <span className="font-mono font-semibold text-neutral-dark">
              {taxStatus === "USED" && effectiveTax > 0
                ? formatRupiah(effectiveTax)
                : "—"}
            </span>
          </div>
        )}

        {discountTotal > 0 && (
          <div className="flex items-center justify-between gap-3 text-secondary">
            <span>Diskon Kupon Promo</span>
            <span className="font-mono font-semibold">
              - {formatRupiah(discountTotal)}
            </span>
          </div>
        )}
      </div>

      {/* Total Section */}
      <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
        <div>
          <span className="text-xs text-neutral-slate font-medium">Total Pembayaran</span>
          <p className="text-[10px] text-neutral-muted">
            {taxStatus === "USED" ? "Termasuk pajak & garansi servis" : "Belum dikenakan pajak (Tax: NOT_USED)"}
          </p>
        </div>
        <span className="text-base font-bold font-display text-primary">
          {formatRupiah(grandTotal)}
        </span>
      </div>
    </div>
  );
}
