"use client";

import React from "react";
import { ShieldCheck, Fire, Sparkle, Warning } from "@phosphor-icons/react";

export type BadgeType = "verified" | "popular" | "ai-match" | "low-stock" | "custom";
export type BadgeVariant = "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";

export interface BadgeProps {
  type?: BadgeType;
  variant?: BadgeVariant;
  label?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

const badgePresets: Record<
  Exclude<BadgeType, "custom">,
  { label: string; icon: React.ReactNode; styles: string }
> = {
  verified: {
    label: "Terverifikasi",
    icon: <ShieldCheck size={14} weight="fill" />,
    styles: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  popular: {
    label: "Populer",
    icon: <Fire size={14} weight="fill" />,
    styles: "bg-rose-50 text-secondary border-rose-200",
  },
  "ai-match": {
    label: "AI Rekomendasi",
    icon: <Sparkle size={14} weight="fill" />,
    styles: "bg-ivory text-amber-900 border-amber-200",
  },
  "low-stock": {
    label: "Sisa Sedikit",
    icon: <Warning size={14} weight="fill" />,
    styles: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-blue-50 text-primary border-blue-200",
  secondary: "bg-purple-50 text-purple-700 border-purple-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
};

export function Badge({
  type = "custom",
  variant,
  label,
  children,
  icon,
  size = "md",
  className = "",
}: BadgeProps) {
  const preset = type !== "custom" ? badgePresets[type] : null;
  const displayLabel = label || preset?.label || children;
  const displayIcon = icon || preset?.icon;
  const defaultStyles =
    (variant && variantStyles[variant]) ||
    preset?.styles ||
    "bg-slate-100 text-neutral-slate border-slate-200";

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border font-body select-none leading-none ${defaultStyles} ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      } ${className}`}
    >
      {displayIcon && <span className="shrink-0">{displayIcon}</span>}
      <span>{displayLabel}</span>
    </span>
  );
}
