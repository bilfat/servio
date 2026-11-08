"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Tag,
  MapPin,
  Clock,
  Storefront,
  CheckCircle,
  Star,
} from "@phosphor-icons/react";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";

export type PricingModel = "FLAT" | "PER_UNIT" | "SURVEY_ESTIMATE" | "HOURLY" | "RANGE" | string;

export interface ServiceCardData {
  id: string;
  title: string;
  category: string;
  price: number;
  priceMin?: number;
  priceMax?: number;
  pricingModel: PricingModel;
  rating?: number;
  reviewCount?: number;
  warrantyDays?: number;
  warrantyName?: string;
  providerName: string;
  providerId?: string;
  providerRating?: number;
  providerReviewCount?: number;
  isVerifiedProvider?: boolean;
  thumbnailUrl?: string | null;
  warrantyEnabled?: boolean;
  description?: string;
  distance?: string;
  surveyFee?: number;
  surveyFeeModel?: string;
  durationMin?: number;
  durationMax?: number;
  durationUnit?: string;
}

export interface ServiceCardProps {
  service: ServiceCardData;
  onBook?: (id: string) => void;
  className?: string;
}

const pricingLabels: Record<string, string> = {
  FLAT: "Tarif Tetap",
  PER_UNIT: "/ Unit",
  SURVEY_ESTIMATE: "Estimasi Survei",
  HOURLY: "/ Jam",
  RANGE: "Rentang Biaya",
};

function formatDuration(min?: number, max?: number, unit?: string) {
  if (!min && !max) return null;
  const unitLabel = unit === "MINUTE" ? "Menit" : unit === "DAY" ? "Hari" : "Jam";
  if (min && max && min !== max) {
    return `${min} - ${max} ${unitLabel}`;
  }
  return `${min || max} ${unitLabel}`;
}

export function ServiceCard({
  service,
  onBook,
  className = "",
}: ServiceCardProps) {
  const [imageError, setImageError] = useState(false);

  const minPrice = service.priceMin !== undefined ? service.priceMin : service.price;
  const maxPrice = service.priceMax !== undefined ? service.priceMax : service.price;
  const isRange = maxPrice > minPrice;

  // Determine survey status
  const isFreeSurvey = service.surveyFeeModel === "FREE" || service.surveyFee === 0;
  const hasPaidSurvey = service.surveyFee !== undefined && service.surveyFee > 0;

  const durationStr = formatDuration(service.durationMin, service.durationMax, service.durationUnit);

  // Rating Gabungan Katalog Jasa & Provider (Rata-rata akurat per katalog, tidak dipisah)
  const hasServiceRating = Boolean((service.reviewCount ?? 0) > 0 && (service.rating ?? 0) > 0);
  const hasProviderRating = Boolean((service.providerReviewCount ?? 0) > 0 && (service.providerRating ?? 0) > 0);

  let combinedRating: number | null = null;
  if (hasServiceRating && hasProviderRating) {
    combinedRating = ((service.rating ?? 0) + (service.providerRating ?? 0)) / 2;
  } else if (hasServiceRating) {
    combinedRating = service.rating ?? null;
  } else if (hasProviderRating) {
    combinedRating = service.providerRating ?? null;
  }

  const reviewCountDisplay =
    (service.reviewCount ?? 0) > 0
      ? service.reviewCount
      : (service.providerReviewCount ?? 0);

  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-servio-xs hover:shadow-servio-md hover:border-primary/40 transition-all duration-200 flex flex-col font-body text-left group ${className}`}
    >
      {/* Thumbnail Header */}
      <Link
        href={`/services/${service.id}`}
        className="block relative h-44 bg-gradient-to-br from-sky-50 via-sky-100 to-slate-100 p-3.5 flex flex-col justify-between overflow-hidden cursor-pointer"
      >
        {/* Real Thumbnail Image */}
        {service.thumbnailUrl && !imageError ? (
          <img
            src={service.thumbnailUrl}
            alt={service.title}
            onError={() => setImageError(true)}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:scale-105 transition-transform duration-300">
            <div className="w-28 h-28 rounded-full bg-sky-200/60 blur-xl" />
            <Tag size={64} weight="duotone" className="text-primary/25" />
          </div>
        )}

        {/* Gradient shadow overlay for readable badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/35 pointer-events-none" />

        {/* Top Badges Row */}
        <div className="flex items-center justify-between z-10 gap-2">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/95 text-slate-800 shadow-xs backdrop-blur-xs font-display truncate max-w-[180px] border border-white/60">
            {service.category}
          </span>
          {Boolean(service.warrantyEnabled || (service.warrantyDays || 0) > 0) && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50/95 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0 shadow-2xs backdrop-blur-xs">
              <ShieldCheck size={12} weight="fill" className="text-emerald-600" />
              <span>Tersedia Garansi</span>
            </span>
          )}
        </div>

        {/* Bottom Badges in Image (Survey Fee & GPS Distance) */}
        <div className="z-10 flex items-center justify-between gap-1.5 flex-wrap">
          {/* Survey fee badge */}
          {isFreeSurvey ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50/95 backdrop-blur-xs px-2.5 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
              <CheckCircle size={12} weight="fill" className="text-emerald-600 shrink-0" />
              <span>Gratis Survei</span>
            </span>
          ) : hasPaidSurvey ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-900 bg-sky-50/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-sky-300 shadow-2xs">
              <span>Survei: {formatRupiah(service.surveyFee!)}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md shadow-2xs">
              <span>Survei Opsional</span>
            </span>
          )}

          {/* GPS Distance Badge */}
          {service.distance && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs shrink-0"
              title={`Jarak mitra dari lokasi GPS Anda: ${service.distance}`}
            >
              <MapPin size={11} weight="fill" className="text-emerald-600 shrink-0" />
              <span>{service.distance.startsWith("±") || service.distance.startsWith(">") ? service.distance : `±${service.distance}`}</span>
            </span>
          )}
        </div>
      </Link>

      {/* Body Content */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div className="space-y-2">
          {/* Title */}
          <Link
            href={`/services/${service.id}`}
            className="text-sm font-bold font-display text-slate-900 group-hover:text-primary transition-colors line-clamp-2 leading-snug block"
          >
            {service.title}
          </Link>

          {/* Provider / Toko Info: Logo Toko + Nama Provider Jasa + Provider Rating */}
          <div className="flex items-center justify-between gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-xs">
            <Link
              href={service.providerId ? `/providers/${service.providerId}` : "#"}
              className="flex items-center gap-1.5 min-w-0 flex-1 hover:text-primary transition-colors"
              title={`Penyedia Jasa: ${service.providerName}`}
            >
              <Storefront size={14} weight="duotone" className="text-primary shrink-0" />
              <span className="text-xs font-bold text-slate-800 truncate">
                {service.providerName && service.providerName !== "Penyedia Jasa"
                  ? service.providerName
                  : "Mitra Resmi SERVIO"}
              </span>
            </Link>

            {/* Provider Verification Badge (Rating digabung pada card utama) */}
            {service.isVerifiedProvider ? (
              <span
                title="Mitra Resmi Terverifikasi SERVIO"
                className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0"
              >
                <ShieldCheck size={10} weight="fill" className="text-emerald-600 shrink-0" />
                <span>Resmi</span>
              </span>
            ) : null}
          </div>

          {/* Meta Info: Duration & Single Unified Average Rating */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap pt-0.5">
            {durationStr ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                <Clock size={11} weight="bold" className="text-slate-500" />
                <span>Pengerjaan: {durationStr}</span>
              </span>
            ) : (
              <span />
            )}
            {combinedRating !== null ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200"
                title={
                  hasServiceRating && hasProviderRating
                    ? `Rating rata-rata: ${combinedRating.toFixed(1)} (Layanan: ${(service.rating ?? 0).toFixed(1)} & Penyedia: ${(service.providerRating ?? 0).toFixed(1)})`
                    : hasServiceRating
                    ? `Rating layanan: ${(service.rating ?? 0).toFixed(1)} (${service.reviewCount} penilaian)`
                    : `Rating penyedia: ${(service.providerRating ?? 0).toFixed(1)} (${service.providerReviewCount} ulasan)`
                }
              >
                <Star size={11} weight="fill" className="text-amber-400" />
                <span>{combinedRating.toFixed(1)}</span>
                <span className="text-slate-400 font-normal">
                  ({reviewCountDisplay} penilaian)
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                <Star size={11} className="text-slate-300" />
                <span>Belum ada penilaian</span>
              </span>
            )}
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
              {isRange ? "Rentang Biaya" : "Mulai Dari"}
            </p>
            <p className="text-[11px] sm:text-xs font-bold font-display text-[#0F4C81] leading-tight whitespace-nowrap">
              {isRange
                ? `${formatRupiah(minPrice)} – ${formatRupiah(maxPrice)}`
                : formatRupiah(minPrice)}
            </p>
          </div>

          <Link
            href={`/services/${service.id}`}
            onClick={(e) => {
              if (onBook) {
                e.preventDefault();
                onBook(service.id);
              }
            }}
            className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-[11px] font-bold transition-all shadow-servio-xs flex items-center gap-1 min-h-[30px] shrink-0 cursor-pointer active:scale-95 group/btn"
          >
            <span>Detail Layanan</span>
            <ArrowRight size={12} weight="bold" className="group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
