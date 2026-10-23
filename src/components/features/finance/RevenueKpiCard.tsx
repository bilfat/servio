"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendUp, TrendDown, Info } from "@phosphor-icons/react";

export interface RevenueKpiCardProps {
  label: string;
  amount: number;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  periodLabel?: string;
  growthPercentage?: number; // e.g. 14.2 for +14.2%, -5.1 for -5.1%
  subtitle?: string;
  tooltipText?: string;
  isLoading?: boolean;
  isNegativeAdjustment?: boolean;
  className?: string;
}

export function RevenueKpiCard({
  label,
  amount,
  icon,
  iconBg = "bg-sky-50",
  iconColor = "text-[#0F4C81]",
  periodLabel,
  growthPercentage,
  subtitle,
  tooltipText,
  isLoading = false,
  isNegativeAdjustment = false,
  className = "",
}: RevenueKpiCardProps) {
  if (isLoading) {
    return (
      <div className={`bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs animate-pulse ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-28 bg-slate-200 rounded-lg" />
          <div className="w-10 h-10 rounded-2xl bg-slate-200" />
        </div>
        <div className="h-8 w-36 bg-slate-200 rounded-lg my-2" />
        <div className="h-3 w-24 bg-slate-100 rounded-lg mt-2" />
      </div>
    );
  }

  const isPositiveGrowth = growthPercentage !== undefined && growthPercentage >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all ${className}`}
    >
      <div>
        {/* Top Header: Label, Tooltip, and Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                {label}
              </span>
              {tooltipText && (
                <div className="relative group/tooltip inline-block cursor-help">
                  <Info size={13} className="text-slate-400 hover:text-slate-600" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover/tooltip:block z-30 w-48 p-2 rounded-xl bg-slate-900 text-white text-[11px] font-normal leading-tight text-center shadow-lg pointer-events-none">
                    {tooltipText}
                    <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mb-1 transform bottom-0 left-1/2 -translate-x-1/2 absolute" />
                  </div>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-slate-400 font-medium truncate">{subtitle}</p>
            )}
          </div>

          <div className={`w-10 h-10 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105`}>
            {icon}
          </div>
        </div>

        {/* Amount */}
        <div className="mt-3">
          <div
            className={`text-2xl sm:text-3xl font-black font-display tracking-tight ${
              isNegativeAdjustment ? "text-amber-600" : "text-slate-900"
            }`}
          >
            {isNegativeAdjustment ? "- " : ""}
            Rp {amount.toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      {/* Footer: Growth Indicator or Period */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2 flex-wrap">
        {growthPercentage !== undefined ? (
          <div
            className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full ${
              isPositiveGrowth
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {isPositiveGrowth ? (
              <TrendUp size={12} weight="bold" />
            ) : (
              <TrendDown size={12} weight="bold" />
            )}
            <span>
              {isPositiveGrowth ? "+" : ""}
              {growthPercentage.toFixed(1)}%
            </span>
            <span className="text-slate-400 font-normal ml-0.5">vs periode lalu</span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 font-medium">
            {periodLabel || "Model C Recognized"}
          </span>
        )}

        {periodLabel && growthPercentage !== undefined && (
          <span className="text-[10px] text-slate-400 font-mono">
            {periodLabel}
          </span>
        )}
      </div>
    </motion.div>
  );
}
