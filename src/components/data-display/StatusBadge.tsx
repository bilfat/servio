"use client";

import React from "react";
import { CheckCircle, WarningCircle, XCircle, Info } from "@phosphor-icons/react";

export type StatusVariant = "success" | "warning" | "error" | "info" | "neutral";

export interface StatusBadgeProps {
  status: StatusVariant;
  label: string;
  showIcon?: boolean;
  showDot?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const variantStyles: Record<
  StatusVariant,
  { bg: string; text: string; border: string; dot: string; icon: typeof CheckCircle }
> = {
  success: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle,
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    icon: WarningCircle,
  },
  error: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
    icon: XCircle,
  },
  info: {
    bg: "bg-sky-50",
    text: "text-primary",
    border: "border-sky-200",
    dot: "bg-primary",
    icon: Info,
  },
  neutral: {
    bg: "bg-slate-100",
    text: "text-neutral-slate",
    border: "border-slate-200",
    dot: "bg-slate-400",
    icon: Info,
  },
};

export function StatusBadge({
  status,
  label,
  showIcon = true,
  showDot = false,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const config = variantStyles[status] || variantStyles.neutral;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border leading-none select-none font-body ${
        config.bg
      } ${config.text} ${config.border} ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      } ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
      )}
      {showIcon && !showDot && (
        <Icon size={size === "sm" ? 12 : 14} weight="fill" className="shrink-0" />
      )}
      <span>{label}</span>
    </span>
  );
}
