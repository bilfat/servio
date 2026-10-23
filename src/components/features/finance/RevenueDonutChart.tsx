"use client";

import React, { useState, useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Info, CaretRight, Table as TableIcon, ChartPie } from "@phosphor-icons/react";
import { RevenueStreamDetail, RevenueStreamType } from "@/types/finance";

export interface RevenueDonutChartProps {
  streams: Record<RevenueStreamType, RevenueStreamDetail>;
  totalNetRevenue: number;
  totalGrossRevenue?: number;
  totalAdjustment?: number;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function RevenueDonutChart({
  streams,
  totalNetRevenue,
  totalGrossRevenue,
  totalAdjustment = 0,
  title = "Komposisi 4 Sumber Pendapatan",
  subtitle = "Berdasarkan Model C: Platform Application Fee & Partner Commission",
  className = "",
}: RevenueDonutChartProps) {
  const [hoveredStream, setHoveredStream] = useState<RevenueStreamType | null>(null);
  const [showTableView, setShowTableView] = useState<boolean>(false);
  const shouldReduceMotion = useReducedMotion();
  const componentId = useId();

  const streamList = Object.values(streams);
  const totalAmount = streamList.reduce((acc, s) => acc + s.netAmount, 0);

  // SVG Donut geometry
  const size = 260;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment angles and offsets
  let cumulativePercentage = 0;
  const segments = streamList.map((stream) => {
    const streamPct = totalAmount > 0 ? stream.netAmount / totalAmount : 0;
    const strokeDasharray = `${streamPct * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativePercentage * circumference;
    const startPct = cumulativePercentage;
    cumulativePercentage += streamPct;
    return {
      stream,
      streamPct,
      strokeDasharray,
      strokeDashoffset,
      startPct,
    };
  });

  const activeStream = hoveredStream ? streams[hoveredStream] : null;

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-50 text-[#0F4C81]">
              <ChartPie size={18} weight="bold" />
            </span>
            <h3 className="font-display font-bold text-slate-900 text-base sm:text-lg">
              {title}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-md">{subtitle}</p>
        </div>

        {/* Accessible View Toggle */}
        <button
          type="button"
          onClick={() => setShowTableView(!showTableView)}
          className="p-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          title={showTableView ? "Lihat Diagram Lingkaran" : "Lihat Tabel Aksesibilitas"}
          aria-label={showTableView ? "Beralih ke tampilan diagram" : "Beralih ke tampilan tabel"}
        >
          {showTableView ? (
            <>
              <ChartPie size={16} weight="bold" />
              <span className="hidden sm:inline">Diagram</span>
            </>
          ) : (
            <>
              <TableIcon size={16} weight="bold" />
              <span className="hidden sm:inline">Tabel</span>
            </>
          )}
        </button>
      </div>

      {showTableView ? (
        /* Accessible Table Fallback */
        <div className="my-4 overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <th className="py-2.5 px-3">Sumber Pendapatan</th>
                <th className="py-2.5 px-3">Jenis</th>
                <th className="py-2.5 px-3 text-right">Nominal Bersih</th>
                <th className="py-2.5 px-3 text-right">Porsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {streamList.map((s) => (
                <tr key={s.streamType} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 flex items-center gap-2 font-medium">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span>{s.name}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {s.orderType === "PRODUCT" ? "Produk" : "Jasa"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    Rp {s.netAmount.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">
                    {s.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-bold text-slate-900">
                <td colSpan={2} className="py-2.5 px-3">Total Pendapatan Bersih</td>
                <td className="py-2.5 px-3 text-right font-mono text-[#0F4C81]">
                  Rp {totalNetRevenue.toLocaleString("id-ID")}
                </td>
                <td className="py-2.5 px-3 text-right font-mono">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        /* Animated Donut SVG & Interactive Center */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-2">
          {/* Donut Circle Container */}
          <div className="md:col-span-6 flex flex-col items-center justify-center relative py-2">
            <div className="relative w-[260px] h-[260px]">
              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90 origin-center"
                role="img"
                aria-label={`Donut chart komposisi pendapatan total Rp ${totalNetRevenue.toLocaleString("id-ID")}`}
              >
                {/* Background Ring */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#F1F5F9"
                  strokeWidth={strokeWidth}
                />

                {/* Animated Segments */}
                {segments.map((seg, idx) => {
                  const isHovered = hoveredStream === seg.stream.streamType;
                  return (
                    <motion.circle
                      key={seg.stream.streamType}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="transparent"
                      stroke={seg.stream.color}
                      strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="round"
                      initial={shouldReduceMotion ? false : { strokeDashoffset: circumference }}
                      animate={{
                        strokeDashoffset: seg.strokeDashoffset,
                        opacity: hoveredStream && !isHovered ? 0.45 : 1,
                      }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.75,
                        delay: shouldReduceMotion ? 0 : idx * 0.12,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredStream(seg.stream.streamType)}
                      onMouseLeave={() => setHoveredStream(null)}
                      tabIndex={0}
                      onFocus={() => setHoveredStream(seg.stream.streamType)}
                      onBlur={() => setHoveredStream(null)}
                      aria-label={`${seg.stream.name}: Rp ${seg.stream.netAmount.toLocaleString("id-ID")} (${seg.stream.percentage}%)`}
                    />
                  );
                })}
              </svg>

              {/* Center Info Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {activeStream ? activeStream.shortName : "Total Net Revenue"}
                </span>
                <span className="text-xl sm:text-2xl font-black font-display text-slate-900 tracking-tight mt-0.5">
                  Rp {(activeStream ? activeStream.netAmount : totalNetRevenue).toLocaleString("id-ID")}
                </span>
                <span className="text-xs font-semibold text-slate-500 mt-0.5">
                  {activeStream
                    ? `${activeStream.percentage}% dari total`
                    : "4 Sumber Model C"}
                </span>
              </div>
            </div>

            {/* Hover Tooltip / Detail Callout below circle on mobile */}
            {activeStream && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-center text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200"
              >
                <span>{activeStream.description}</span>
              </motion.div>
            )}
          </div>

          {/* Interactive Legend List */}
          <div className="md:col-span-6 space-y-2.5">
            {streamList.map((stream) => {
              const isHovered = hoveredStream === stream.streamType;
              return (
                <div
                  key={stream.streamType}
                  role="button"
                  tabIndex={0}
                  onClick={() => setHoveredStream(isHovered ? null : stream.streamType)}
                  onMouseEnter={() => setHoveredStream(stream.streamType)}
                  onMouseLeave={() => setHoveredStream(null)}
                  onFocus={() => setHoveredStream(stream.streamType)}
                  onBlur={() => setHoveredStream(null)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isHovered
                      ? "bg-slate-50 border-slate-400 shadow-xs translate-x-1"
                      : "bg-white border-slate-200/80 hover:bg-slate-50/70"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs transition-transform duration-200"
                      style={{
                        backgroundColor: stream.color,
                        transform: isHovered ? "scale(1.2)" : "scale(1)",
                      }}
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{stream.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({stream.orderType === "PRODUCT" ? "Produk" : "Jasa"})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {stream.transactionCount} order selesai
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-extrabold text-slate-900">
                      Rp {stream.netAmount.toLocaleString("id-ID")}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500">
                      {stream.percentage}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Notes: Reversal & Reconciliation Disclaimer */}
      {totalAdjustment > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <Info size={14} weight="bold" />
            <span>
              Penyesuaian / Reversal: -Rp {totalAdjustment.toLocaleString("id-ID")} (Dipotong terpisah, tidak di-slice negatif)
            </span>
          </div>
          <span className="text-slate-400">Model C • 100% Deterministic Aggregation</span>
        </div>
      )}
    </div>
  );
}
