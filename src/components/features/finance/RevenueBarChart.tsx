"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChartBar, CalendarBlank, Table as TableIcon } from "@phosphor-icons/react";
import { PeriodFilter, PeriodRevenueSummary } from "@/types/finance";

export interface RevenueBarChartProps {
  timeSeries: PeriodRevenueSummary["timeSeries"];
  currentPeriod: PeriodFilter;
  onPeriodChange?: (period: PeriodFilter) => void;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function RevenueBarChart({
  timeSeries,
  currentPeriod,
  onPeriodChange,
  title = "Tren Pertumbuhan Pendapatan",
  subtitle = "Perbandingan pendapatan murni dari transaksi Produk vs Layanan Jasa",
  className = "",
}: RevenueBarChartProps) {
  const [activeMetric, setActiveMetric] = useState<"ALL" | "PRODUCT" | "SERVICE">("ALL");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showTableView, setShowTableView] = useState<boolean>(false);
  const shouldReduceMotion = useReducedMotion();

  // Find max value for relative scaling
  const maxValue = Math.max(
    ...timeSeries.map((d) =>
      activeMetric === "ALL"
        ? d.totalRevenue
        : activeMetric === "PRODUCT"
        ? d.productRevenue
        : d.serviceRevenue
    ),
    1
  );

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col justify-between ${className}`}>
      {/* Header with Title and Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-50 text-[#0F4C81]">
              <ChartBar size={18} weight="bold" />
            </span>
            <h3 className="font-display font-bold text-slate-900 text-base sm:text-lg">
              {title}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-md">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Period Filter Buttons */}
          {onPeriodChange && (
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => onPeriodChange("DAILY")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  currentPeriod === "DAILY"
                    ? "bg-white text-[#0F4C81] shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Harian
              </button>
              <button
                type="button"
                onClick={() => onPeriodChange("WEEKLY")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  currentPeriod === "WEEKLY"
                    ? "bg-white text-[#0F4C81] shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Mingguan
              </button>
              <button
                type="button"
                onClick={() => onPeriodChange("MONTHLY")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  currentPeriod === "MONTHLY"
                    ? "bg-white text-[#0F4C81] shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Bulanan
              </button>
            </div>
          )}

          {/* Table View Toggle */}
          <button
            type="button"
            onClick={() => setShowTableView(!showTableView)}
            className="p-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1 cursor-pointer"
            title={showTableView ? "Lihat Diagram Batang" : "Lihat Tabel Aksesibilitas"}
          >
            {showTableView ? <ChartBar size={16} /> : <TableIcon size={16} />}
          </button>
        </div>
      </div>

      {/* Metric Selector Tabs */}
      <div className="flex items-center gap-2 mb-4 text-xs font-semibold overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveMetric("ALL")}
          className={`px-3 py-1.5 rounded-full border transition-all ${
            activeMetric === "ALL"
              ? "bg-[#0F4C81] border-[#0F4C81] text-white shadow-xs"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Semua Pendapatan
        </button>
        <button
          type="button"
          onClick={() => setActiveMetric("PRODUCT")}
          className={`px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
            activeMetric === "PRODUCT"
              ? "bg-rose-500 border-rose-500 text-white shadow-xs"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          <span>Produk (App Fee + Komisi)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMetric("SERVICE")}
          className={`px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
            activeMetric === "SERVICE"
              ? "bg-[#0F4C81] border-[#0F4C81] text-white shadow-xs"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-sky-300" />
          <span>Jasa (App Fee + Komisi)</span>
        </button>
      </div>

      {showTableView ? (
        /* Accessible Table */
        <div className="overflow-x-auto my-2">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <th className="py-2.5 px-3">Periode</th>
                <th className="py-2.5 px-3 text-right">Pendapatan Produk</th>
                <th className="py-2.5 px-3 text-right">Pendapatan Jasa</th>
                <th className="py-2.5 px-3 text-right">Total Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {timeSeries.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-medium text-slate-900">{row.label}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-semibold">
                    Rp {row.productRevenue.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#0F4C81] font-semibold">
                    Rp {row.serviceRevenue.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    Rp {row.totalRevenue.toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Animated Bar Chart */
        <div className="relative pt-6 pb-2">
          {/* Subtle Grid Lines */}
          <div className="absolute inset-x-0 top-6 bottom-10 flex flex-col justify-between pointer-events-none opacity-40">
            <div className="border-b border-dashed border-slate-200 w-full" />
            <div className="border-b border-dashed border-slate-200 w-full" />
            <div className="border-b border-dashed border-slate-200 w-full" />
          </div>

          {/* Bars Flex Container */}
          <div className="relative z-10 flex items-end justify-between gap-2 sm:gap-4 h-[220px] px-2 sm:px-4">
            {timeSeries.map((item, index) => {
              const isHovered = hoveredIndex === index;
              const val =
                activeMetric === "ALL"
                  ? item.totalRevenue
                  : activeMetric === "PRODUCT"
                  ? item.productRevenue
                  : item.serviceRevenue;

              const heightPercentage = Math.max((val / maxValue) * 100, 6);

              // Sub-breakdowns for stacked look if ALL is active
              const productRatio = val > 0 ? (item.productRevenue / item.totalRevenue) * 100 : 0;
              const serviceRatio = val > 0 ? (item.serviceRevenue / item.totalRevenue) * 100 : 0;

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Floating Tooltip */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.15 }}
                      className="absolute -top-16 z-30 px-3 py-2 rounded-xl bg-slate-900 text-white shadow-xl text-center pointer-events-none whitespace-nowrap"
                    >
                      <div className="text-[10px] text-slate-400 font-medium">{item.label}</div>
                      <div className="text-xs font-mono font-bold text-white">
                        Rp {val.toLocaleString("id-ID")}
                      </div>
                      {activeMetric === "ALL" && (
                        <div className="text-[9px] text-slate-300 mt-0.5 flex items-center justify-center gap-2">
                          <span className="text-rose-300">Prd: Rp {(item.productRevenue / 1000).toFixed(0)}k</span>
                          <span className="text-sky-300">Jsa: Rp {(item.serviceRevenue / 1000).toFixed(0)}k</span>
                        </div>
                      )}
                      <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mb-1 transform -bottom-1 absolute left-1/2 -translate-x-1/2" />
                    </motion.div>
                  )}

                  {/* The Growing Bar Element */}
                  <div className="w-full max-w-[42px] sm:max-w-[48px] h-full flex items-end justify-center">
                    <motion.div
                      initial={shouldReduceMotion ? false : { height: 0 }}
                      animate={{ height: `${heightPercentage}%` }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.65,
                        delay: shouldReduceMotion ? 0 : index * 0.08,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className={`w-full rounded-2xl relative overflow-hidden transition-all duration-300 ${
                        isHovered ? "ring-4 ring-[#0F4C81]/20 scale-[1.03]" : ""
                      }`}
                      style={{
                        backgroundColor:
                          activeMetric === "PRODUCT"
                            ? "#F43F5E"
                            : activeMetric === "SERVICE"
                            ? "#0F4C81"
                            : undefined,
                      }}
                    >
                      {/* Stacked visualization when ALL metric is active */}
                      {activeMetric === "ALL" && (
                        <div className="w-full h-full flex flex-col justify-end">
                          {/* Jasa part (top) */}
                          <div
                            style={{ height: `${serviceRatio}%` }}
                            className="w-full bg-[#0F4C81] transition-all"
                            title={`Jasa: Rp ${item.serviceRevenue.toLocaleString("id-ID")}`}
                          />
                          {/* Produk part (bottom) */}
                          <div
                            style={{ height: `${productRatio}%` }}
                            className="w-full bg-[#F43F5E] transition-all"
                            title={`Produk: Rp ${item.productRevenue.toLocaleString("id-ID")}`}
                          />
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {/* X-Axis Label */}
                  <div className="mt-2.5 text-center">
                    <span
                      className={`text-[11px] font-medium block truncate max-w-[48px] sm:max-w-[64px] transition-colors ${
                        isHovered ? "text-[#0F4C81] font-bold" : "text-slate-500"
                      }`}
                    >
                      {item.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" />
                <span>Pendapatan Produk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C81]" />
                <span>Pendapatan Jasa</span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400">
              *Tumbuh dinamis dengan Framer Motion
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
