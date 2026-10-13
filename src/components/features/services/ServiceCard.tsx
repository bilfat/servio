"use client";

import React from "react";
import Link from "next/link";
import { Star, ShieldCheck, ArrowRight, Tag } from "@phosphor-icons/react";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";

export type PricingModel = "FLAT" | "PER_UNIT" | "SURVEY_ESTIMATE" | "HOURLY";

export interface ServiceCardData {
  id: string;
  title: string;
  category: string;
  price: number;
  priceMin?: number;
  priceMax?: number;
  pricingModel: PricingModel;
  rating: number;
  reviewCount: number;
  warrantyDays: number;
  providerName: string;
  isVerifiedProvider?: boolean;
  thumbnailUrl?: string;
  warrantyEnabled?: boolean;
  description?: string;
}

export interface ServiceCardProps {
  service: ServiceCardData;
  onBook?: (id: string) => void;
  className?: string;
}

const pricingLabels: Record<PricingModel, string> = {
  FLAT: "Tarif Tetap",
  PER_UNIT: "/ Unit",
  SURVEY_ESTIMATE: "Estimasi Survei",
  HOURLY: "/ Jam",
};

export function ServiceCard({
  service,
  onBook,
  className = "",
}: ServiceCardProps) {
  const hasWarranty = service.warrantyEnabled !== undefined ? service.warrantyEnabled : service.warrantyDays > 0;
  const minPrice = service.priceMin !== undefined ? service.priceMin : service.price;
  const maxPrice = service.priceMax !== undefined ? service.priceMax : service.price;
  const isRange = maxPrice > minPrice;

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-servio-xs hover:shadow-servio-md transition-all flex flex-col font-body text-left group ${className}`}>
      {/* Thumbnail Header */}
      <div className="relative h-44 bg-gradient-to-br from-sky to-sky-100 p-4 flex flex-col justify-between overflow-hidden">
        <div className="flex items-center justify-between z-10">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/90 text-primary shadow-xs backdrop-blur-xs font-display truncate max-w-[140px]">
            {service.category}
          </span>
          {hasWarranty && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-xs shrink-0">
              <ShieldCheck size={12} weight="fill" />
              ✓ Garansi Tersedia
            </span>
          )}
        </div>

        {/* Mock Graphic / Illustration Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:scale-105 transition-transform duration-300">
          <div className="w-24 h-24 rounded-full bg-sky-200/60 blur-xl" />
          <Tag size={64} weight="duotone" className="text-primary/20" />
        </div>

        <div className="z-10 flex items-center justify-between">
          <span className="text-[11px] text-neutral-dark/90 font-bold truncate max-w-[180px] bg-white/70 px-2 py-0.5 rounded-md backdrop-blur-xs">
            {service.providerName}
          </span>
          {service.isVerifiedProvider && (
            <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-0.5 bg-white/80 px-1.5 py-0.5 rounded-md">
              <ShieldCheck size={12} weight="fill" /> Terverifikasi
            </span>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <Link
            href={`/services/${service.id}`}
            className="text-sm font-bold font-display text-neutral-dark hover:text-primary transition-colors line-clamp-2 leading-snug"
          >
            {service.title}
          </Link>

          {service.description && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-body">
              {service.description}
            </p>
          )}

          {/* Rating */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-slate pt-0.5">
            <span className="flex items-center text-amber-500 font-bold gap-0.5">
              <Star size={14} weight="fill" />
              {service.rating.toFixed(1)}
            </span>
            <span>•</span>
            <span className="text-[11px]">({service.reviewCount} ulasan)</span>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] text-neutral-slate font-medium">
              {isRange ? "Estimasi Biaya" : "Mulai dari"}
            </p>
            <p className="text-sm font-bold font-display text-primary leading-tight">
              {isRange
                ? `${formatRupiah(minPrice)} – ${formatRupiah(maxPrice)}`
                : formatRupiah(minPrice)}
              {pricingLabels[service.pricingModel] && !isRange && (
                <span className="text-[10px] font-normal text-neutral-slate ml-1 font-body">
                  {pricingLabels[service.pricingModel]}
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onBook?.(service.id)}
            className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all shadow-servio-xs flex items-center gap-1 min-h-[38px] shrink-0"
          >
            <span>Pesan</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
