"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ShoppingBag, Wrench, ArrowRight } from "@phosphor-icons/react";
import { PeriodRevenueSummary } from "@/types/finance";

export interface ProductVsServiceComparisonProps {
  comparison: PeriodRevenueSummary["comparison"];
  totalNetRevenue: number;
  className?: string;
}

export function ProductVsServiceComparison({
  comparison,
  totalNetRevenue,
  className = "",
}: ProductVsServiceComparisonProps) {
  const shouldReduceMotion = useReducedMotion();
  const { product, service } = comparison;

  const productRatio = totalNetRevenue > 0 ? (product.totalRevenue / totalNetRevenue) * 100 : 0;
  const serviceRatio = totalNetRevenue > 0 ? (service.totalRevenue / totalNetRevenue) * 100 : 0;

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-6 ${className}`}>
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-base sm:text-lg">
            Pendapatan Berdasarkan Jenis Transaksi
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Perbandingan kontribusi pendapatan bersih antara lini Suku Cadang (Produk) vs Layanan Perbaikan (Jasa)
          </p>
        </div>
        <div className="text-xs font-mono font-bold text-slate-500 self-start sm:self-auto">
          Total Net: <span className="text-[#0F4C81]">Rp {totalNetRevenue.toLocaleString("id-ID")}</span>
        </div>
      </div>

      {/* Dual Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-[#F43F5E] flex items-center gap-1.5">
            <ShoppingBag size={14} weight="bold" />
            <span>Produk ({productRatio.toFixed(1)}%)</span>
          </span>
          <span className="text-[#0F4C81] flex items-center gap-1.5">
            <Wrench size={14} weight="bold" />
            <span>Jasa ({serviceRatio.toFixed(1)}%)</span>
          </span>
        </div>

        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          <motion.div
            initial={shouldReduceMotion ? false : { width: 0 }}
            animate={{ width: `${productRatio}%` }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-rose-500 to-rose-400"
            title={`Produk: ${productRatio.toFixed(1)}%`}
          />
          <motion.div
            initial={shouldReduceMotion ? false : { width: 0 }}
            animate={{ width: `${serviceRatio}%` }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-[#1A64A3] to-[#0F4C81]"
            title={`Jasa: ${serviceRatio.toFixed(1)}%`}
          />
        </div>
      </div>

      {/* Two Comparison Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. PRODUK PANEL */}
        <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <ShoppingBag size={18} weight="bold" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 font-heading">
                  Transaksi Produk (Suku Cadang)
                </h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  {product.orderVolume} order terselesaikan
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white text-rose-700 border border-rose-200 shadow-xs">
              {product.percentage}% Porsi
            </span>
          </div>

          <div className="text-2xl font-black font-display text-slate-900">
            Rp {product.totalRevenue.toLocaleString("id-ID")}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-rose-200/60 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Biaya Aplikasi Customer:</span>
              <span className="font-mono font-bold text-slate-900">
                Rp {product.customerAppFee.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Komisi Merchant (Toko):</span>
              <span className="font-mono font-bold text-slate-900">
                Rp {product.merchantCommission.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>

        {/* 2. JASA PANEL */}
        <div className="p-5 rounded-2xl bg-sky-50/50 border border-sky-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-100 text-[#0F4C81]">
                <Wrench size={18} weight="bold" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 font-heading">
                  Transaksi Layanan Jasa (Servis)
                </h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  {service.orderVolume} order terselesaikan
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white text-[#0F4C81] border border-sky-200 shadow-xs">
              {service.percentage}% Porsi
            </span>
          </div>

          <div className="text-2xl font-black font-display text-slate-900">
            Rp {service.totalRevenue.toLocaleString("id-ID")}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-sky-200/60 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Biaya Aplikasi Customer:</span>
              <span className="font-mono font-bold text-slate-900">
                Rp {service.customerAppFee.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Komisi Service Provider (Bengkel):</span>
              <span className="font-mono font-bold text-slate-900">
                Rp {service.providerCommission.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
