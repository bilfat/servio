"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

interface DataPoint {
  period: string;
  service: number;
  product: number;
  b2b: number;
  total: number;
}

interface ExecutiveTrendChartProps {
  title: string;
  subtitle?: string;
  data: DataPoint[];
  metricLabel?: string;
  isCurrency?: boolean;
}

export function ExecutiveTrendChart({
  title,
  subtitle,
  data,
  metricLabel = "GMV",
  isCurrency = true,
}: ExecutiveTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxValue = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-neutral-dark font-display">{title}</h3>
          {subtitle && <p className="text-xs text-neutral-slate mt-0.5">{subtitle}</p>}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-semibold text-neutral-slate">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-primary shrink-0" />
            <span>Jasa</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-purple-500 shrink-0" />
            <span>Retail Produk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-500 shrink-0" />
            <span>Grosir B2B</span>
          </div>
        </div>
      </div>

      {/* Chart Visualizer */}
      <div className="pt-4 pb-2">
        <div className="h-44 sm:h-52 flex items-end gap-2 sm:gap-4 px-1 border-b border-slate-200">
          {data.map((item, idx) => {
            const totalHeightPercent = Math.min(100, Math.round((item.total / maxValue) * 100));
            const serviceHeight = item.total > 0 ? (item.service / item.total) * 100 : 0;
            const productHeight = item.total > 0 ? (item.product / item.total) * 100 : 0;
            const b2bHeight = item.total > 0 ? (item.b2b / item.total) * 100 : 0;

            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={item.period}
                className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 w-48 p-2.5 rounded-xl bg-slate-900 text-white text-[11px] shadow-servio-lg z-30 pointer-events-none animate-in fade-in zoom-in-95">
                    <p className="font-bold text-amber-300 mb-1">{item.period}</p>
                    <div className="space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-300">Jasa:</span>
                        <span className="font-semibold">
                          {isCurrency ? formatCurrency(item.service) : item.service.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Produk:</span>
                        <span className="font-semibold">
                          {isCurrency ? formatCurrency(item.product) : item.product.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-indigo-300">B2B:</span>
                        <span className="font-semibold">
                          {isCurrency ? formatCurrency(item.b2b) : item.b2b.toLocaleString()}
                        </span>
                      </div>
                      <div className="border-t border-slate-700 pt-1 mt-1 flex justify-between font-bold text-white">
                        <span>Total:</span>
                        <span>{isCurrency ? formatCurrency(item.total) : item.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stacked Bar with Bottom-to-Top Animation (Turun ke Naik) */}
                <motion.div
                  key={`${item.period}-${item.total}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: `${Math.max(totalHeightPercent, 12)}%`, opacity: 1 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: idx * 0.08 }}
                  className={`w-full max-w-[42px] rounded-t-lg flex flex-col justify-end overflow-hidden transition-shadow duration-200 ${
                    isHovered ? "ring-2 ring-primary brightness-110 scale-105" : ""
                  }`}
                >
                  <div style={{ height: `${b2bHeight}%` }} className="bg-indigo-500 w-full" />
                  <div style={{ height: `${productHeight}%` }} className="bg-purple-500 w-full" />
                  <div style={{ height: `${serviceHeight}%` }} className="bg-primary w-full" />
                </motion.div>

                <span className="text-[10px] sm:text-xs text-neutral-slate font-medium mt-2 truncate w-full text-center">
                  {item.period}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
