"use client";

import React from "react";
import { Info, TrendUp, TrendDown, type Icon } from "@phosphor-icons/react";

interface ExecutiveKpiCardProps {
  id: string;
  title: string;
  value: string | number;
  subValue?: string;
  changePercent?: number;
  changePeriodLabel?: string;
  definition?: string;
  icon?: Icon | React.ComponentType<{ size?: number; className?: string; weight?: string }>;
  iconColor?: string;
  bgColor?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function ExecutiveKpiCard({
  id,
  title,
  value,
  subValue,
  changePercent,
  changePeriodLabel = "vs periode lalu",
  definition,
  icon: Icon,
  iconColor = "text-primary",
  bgColor = "bg-sky/40",
  onClick,
  isActive = false,
}: ExecutiveKpiCardProps) {
  const isPositive = changePercent !== undefined ? changePercent >= 0 : true;

  return (
    <div
      id={`kpi-${id}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`glass-card p-3.5 sm:p-4 rounded-2xl border transition-all text-left relative overflow-hidden ${
        onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-servio-md hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
          : ""
      } ${isActive ? "ring-2 ring-primary/40 border-primary bg-sky/20" : "border-slate-200/80"}`}
    >
      {/* Top Header: Icon & Definition Tooltip */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {Icon ? (
          <div className={`w-7 h-7 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}>
            <Icon size={16} className={iconColor} weight="duotone" />
          </div>
        ) : (
          <div />
        )}

        {definition && (
          <div className="group/tooltip relative shrink-0">
            <button
              type="button"
              className="text-neutral-muted hover:text-neutral-slate transition-colors p-0.5"
              aria-label={`Definisi ${title}`}
            >
              <Info size={14} />
            </button>
            <div className="absolute right-0 top-full mt-1.5 hidden group-hover/tooltip:block w-52 p-2.5 rounded-xl bg-slate-900 text-white text-[11px] leading-relaxed shadow-servio-lg z-30 pointer-events-none">
              {definition}
            </div>
          </div>
        )}
      </div>

      {/* Full-width Title */}
      <p
        className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider font-display mb-1 truncate"
        title={title}
      >
        {title}
      </p>

      {/* Proportional Value & SubValue */}
      <div className="mb-2 min-h-[38px] flex flex-col justify-center">
        <div
          className="text-base sm:text-[17px] font-bold font-display text-neutral-dark tracking-tight leading-snug truncate"
          title={typeof value === "number" ? value.toLocaleString("id-ID") : String(value)}
        >
          {typeof value === "number" ? value.toLocaleString("id-ID") : value}
        </div>
        {subValue && (
          <div className="text-[11px] text-neutral-slate font-medium leading-tight truncate mt-0.5" title={subValue}>
            {subValue}
          </div>
        )}
      </div>

      {changePercent !== undefined && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
              isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {isPositive ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
            {isPositive ? `+${changePercent}%` : `${changePercent}%`}
          </span>
          <span className="text-neutral-muted text-[10px]">{changePeriodLabel}</span>
        </div>
      )}
    </div>
  );
}
