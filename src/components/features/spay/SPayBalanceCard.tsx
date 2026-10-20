"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeSlash,
  CaretRight,
  ShieldCheck,
  CircleNotch,
} from "@phosphor-icons/react";
import { SPayOwnerType } from "@/types/spay";

export interface SPayBalanceCardProps {
  balance?: number;
  ownerType?: SPayOwnerType;
  organizationName?: string;
  accountNumber?: string;
  detailHref?: string;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  subtitle?: string;
  isBalanceVisible?: boolean;
  onToggleVisibility?: () => void;
  onCardClick?: () => void;
}

export function SPayBalanceCard({
  balance = 0,
  ownerType = "CUSTOMER",
  organizationName,
  accountNumber,
  detailHref,
  isLoading = false,
  error = null,
  className = "",
  subtitle,
  isBalanceVisible: controlledVisibility,
  onToggleVisibility,
  onCardClick,
}: SPayBalanceCardProps) {
  const router = useRouter();

  // Internal visibility fallback if not controlled
  const [internalVisibility, setInternalVisibility] = useState<boolean>(true);
  const isVisible = controlledVisibility !== undefined ? controlledVisibility : internalVisibility;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleVisibility) {
      onToggleVisibility();
    } else {
      setInternalVisibility((prev) => !prev);
    }
  };

  // Resolve default href based on ownerType if not provided
  const resolvedHref =
    detailHref ||
    (ownerType === "MERCHANT"
      ? "/merchant/spay"
      : ownerType === "SERVICE_PROVIDER"
        ? "/provider/spay"
        : "/spay");

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick();
    } else if (resolvedHref) {
      router.push(resolvedHref);
    }
  };

  // Role subtitle / description badge
  const defaultSubtitle =
    subtitle ||
    (ownerType === "CUSTOMER"
      ? "Dana Refund Tersedia"
      : ownerType === "MERCHANT"
        ? "Settlement Penjualan Produk"
        : "Settlement Jasa Layanan");

  const formattedAmount = isVisible
    ? `Rp ${balance.toLocaleString("id-ID")}`
    : "Rp ••••••";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`Kartu Saldo S-Pay: ${isVisible ? formattedAmount : "Saldo disembunyikan"}. Klik untuk melihat detail.`}
      className={`group relative overflow-hidden rounded-3xl cursor-pointer select-none transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-rose-400/40 active:scale-[0.99] ${className}`}
      style={{
        // Signature SERVIO dual-tone blend: Coral Pink/Merah (#E11D48 / #F43F5E) to Deep Ocean Blue (#1D4ED8 / #0F4C81 / #0B3860)
        background: "linear-gradient(130deg, #E11D48 0%, #F43F5E 32%, #1D4ED8 70%, #0F4C81 100%)",
        boxShadow: "0 16px 38px -6px rgba(244, 63, 94, 0.38), 0 8px 24px -4px rgba(15, 76, 129, 0.32)",
      }}
    >
      {/* Decorative Ornaments: Smooth translucent organic curves matching official mockup */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Coral Pink & Ocean Blue Ambient Glow Spheres */}
        <div className="absolute -top-14 -left-14 w-60 h-60 rounded-full bg-[#FB7185]/35 blur-2xl" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-[#0F4C81]/45 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-[#F43F5E]/20 blur-xl" />

        {/* Dynamic Organic Flowing Wave Ribbons */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 500 240"
        >
          {/* Top-Right Soft Coral Curved Glow */}
          <path
            d="M 160,0 Q 320,120 500,45 L 500,0 Z"
            fill="url(#coralTopGlow)"
            opacity="0.8"
          />

          {/* Elegant Diagonal Wave cutting into Blue Bottom */}
          <path
            d="M 0,95 Q 180,220 360,115 T 500,165 L 500,240 L 0,240 Z"
            fill="url(#blueWaveGrad)"
            opacity="0.88"
          />

          {/* Secondary Shimmer Ribbon Curve */}
          <path
            d="M -30,135 Q 190,245 380,125 T 520,175"
            fill="none"
            stroke="rgba(255, 255, 255, 0.30)"
            strokeWidth="1.8"
          />
          <path
            d="M -20,155 Q 200,265 390,145 T 530,195"
            fill="none"
            stroke="rgba(224, 242, 254, 0.18)"
            strokeWidth="1"
          />

          <defs>
            <linearGradient id="coralTopGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FB7185" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#F43F5E" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="blueWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B3860" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#0F4C81" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#1A64A3" stopOpacity="0.80" />
            </linearGradient>
          </defs>
        </svg>

        {/* Top edge subtle glow line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-white/40 via-white/70 to-white/20" />
      </div>

      {/* Main Content Layout */}
      <div className="relative z-10 p-5 sm:p-6 lg:p-7 flex flex-col justify-between min-h-[160px] sm:min-h-[175px] text-white">
        {/* TOP ROW: 'Saldo [logo] - Pay' on Left, Subtitle Badge on Right */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            {/* Inline 'Saldo [Logo] - Pay' Title with White Circular Badge */}
            <div className="inline-flex items-center gap-2 font-display font-black text-sm sm:text-base lg:text-lg tracking-wide text-white drop-shadow-md flex-wrap">
              <span>Saldo</span>
              <span className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-md p-1 shrink-0 transition-transform duration-300 group-hover:scale-110">
                <span className="relative w-full h-full block">
                  <Image
                    src="/brand/logo-Spay.png"
                    alt="Logo S-Pay"
                    fill
                    sizes="32px"
                    className="object-contain"
                    priority
                  />
                </span>
              </span>
              <span>- Pay</span>
              <CaretRight size={14} weight="bold" className="text-white/80 group-hover:translate-x-0.5 transition-transform ml-0.5" />
            </div>

            {organizationName && (
              <p className="text-xs text-white/90 font-medium truncate max-w-[240px] sm:max-w-xs drop-shadow-xs">
                {organizationName}
              </p>
            )}
          </div>

          {/* Subtitle / Role Badge on Top Right */}
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md border border-white/25 text-white shadow-xs">
              <ShieldCheck size={12} weight="fill" className="text-amber-200" />
              <span>{defaultSubtitle}</span>
            </span>
          </div>
        </div>

        {/* BOTTOM ROW: Nominal Amount, Eye Toggle, and Navigation Chevron */}
        <div className="mt-4 flex items-end justify-between gap-4 pt-2">
          <div className="space-y-1">
            <span className="text-[11px] text-white/85 font-medium tracking-wide drop-shadow-xs">
              {ownerType === "CUSTOMER"
                ? "Saldo Refund Siap Ditarik"
                : "Saldo Tersedia (Withdrawable)"}
            </span>

            <div className="flex items-center gap-3">
              {isLoading ? (
                <div className="flex items-center gap-2 text-white text-lg font-bold">
                  <CircleNotch size={20} className="animate-spin text-white" />
                  <span>Memuat saldo...</span>
                </div>
              ) : error ? (
                <span className="text-rose-200 text-sm font-semibold">{error}</span>
              ) : (
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-display tracking-tight text-white drop-shadow-md">
                  {formattedAmount}
                </div>
              )}

              {/* Eye Button to Toggle Balance Visibility */}
              <button
                type="button"
                onClick={handleToggle}
                className="p-1.5 sm:p-2 rounded-xl bg-white/20 hover:bg-white/30 active:scale-90 text-white transition-all backdrop-blur-md border border-white/25 focus:outline-none focus:ring-2 focus:ring-white/60 cursor-pointer shrink-0 shadow-xs"
                aria-label={isVisible ? "Sembunyikan nominal saldo" : "Tampilkan nominal saldo"}
                title={isVisible ? "Sembunyikan nominal" : "Tampilkan nominal"}
              >
                {isVisible ? (
                  <EyeSlash size={18} weight="bold" />
                ) : (
                  <Eye size={18} weight="bold" />
                )}
              </button>
            </div>
          </div>

          {/* Right Navigation Arrow Pill */}
          <div className="shrink-0 flex items-center">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 group-hover:bg-white/30 border border-white/30 flex items-center justify-center text-white transition-all duration-300 group-hover:translate-x-1 shadow-md backdrop-blur-md">
              <CaretRight size={20} weight="bold" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
