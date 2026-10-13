"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Receipt,
  CheckCircle,
  Clock,
  CurrencyCircleDollar,
  MagnifyingGlass,
  ArrowRight,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useDomainRepository } from "@/lib/repository/domainRepository";

export default function ProviderTransactionsPage() {
  const repo = useDomainRepository();
  const [search, setSearch] = useState("");
  const transactions = repo.transactions;

  const filtered = transactions.filter(
    (t) =>
      t.orderId.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 font-body">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Riwayat Transaksi
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
              Catatan Transaksi &amp; Escrow
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Catatan pembayaran pelanggan yang terverifikasi dan tercatat dalam sistem garansi escrow.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari order atau klien..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold font-display text-slate-900 border-b border-slate-100 pb-3">
          Daftar Transaksi ({filtered.length})
        </h2>

        <div className="divide-y divide-slate-100">
          {filtered.map((t) => (
            <div key={t.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900">{t.id}</span>
                  <span className="font-mono text-[11px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {t.orderId}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" />
                    {t.status}
                  </span>
                </div>
                <p className="text-slate-600 font-medium">
                  Pelanggan: <strong className="text-slate-800">{t.customerName}</strong> • Metode: {t.paymentMethod}
                </p>
                <p className="text-slate-400 text-[10px]">
                  Ref Gateway: {t.gatewayRef} • Waktu: {t.paidAt}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-bold font-display text-emerald-700">
                  Bersih: Rp {t.vendorNetAmount.toLocaleString("id-ID")}
                </p>
                <p className="text-[10px] text-slate-400">
                  Total Bayar: Rp {t.grossAmount.toLocaleString("id-ID")} (Fee: Rp {t.platformFeeAmount.toLocaleString("id-ID")})
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
