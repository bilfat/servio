"use client";

import React from "react";
import Link from "next/link";
import { Star, ShieldCheck, MapPin, Clock } from "@phosphor-icons/react";

export interface ProviderCardData {
  id: string;
  name: string;
  businessType: "INDIVIDUAL" | "WORKSHOP";
  avatarInitials: string;
  rating: number;
  completedJobs: number;
  operationalHours: string;
  workRadiusKm: number;
  city: string;
  specialties: string[];
  isVerified: boolean;
}

export interface ProviderCardProps {
  provider: ProviderCardData;
  onBook?: (id: string) => void;
  className?: string;
}

export function ProviderCard({
  provider,
  onBook,
  className = "",
}: ProviderCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-servio-xs hover:shadow-servio-md transition-all flex flex-col justify-between space-y-4 font-body text-left ${className}`}>
      {/* Header: Avatar, Name, Rating */}
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-light text-white font-bold font-display flex items-center justify-center text-sm shadow-servio-xs shrink-0">
          {provider.avatarInitials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/providers/${provider.id}`}
              className="text-xs font-bold font-display text-neutral-dark hover:text-primary transition-colors truncate"
            >
              {provider.name}
            </Link>
            {provider.isVerified && (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded flex items-center gap-0.5 border border-emerald-200">
                <ShieldCheck size={12} weight="fill" /> Terverifikasi
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-slate">
            <span className="flex items-center text-amber-500 font-bold gap-0.5">
              <Star size={12} weight="fill" />
              {provider.rating.toFixed(1)}
            </span>
            <span>•</span>
            <span>{provider.completedJobs} servis selesai</span>
          </div>
        </div>
      </div>

      {/* Meta Specs: Jam Operasional, Radius, Kota */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-slate bg-slate-50 p-2.5 rounded-xl border border-slate-100">
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-primary shrink-0" />
          <span className="truncate">{provider.operationalHours}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-secondary shrink-0" />
          <span className="truncate">Radius {provider.workRadiusKm} km ({provider.city})</span>
        </div>
      </div>

      {/* Specialties Tags */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          {provider.specialties.map((spec) => (
            <span
              key={spec}
              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-sky text-primary border border-sky-200"
            >
              {spec}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <Link
          href={`/providers/${provider.id}`}
          className="text-xs font-semibold text-neutral-slate hover:text-neutral-dark px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          Lihat Profil
        </Link>

        <button
          type="button"
          onClick={() => onBook?.(provider.id)}
          className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all shadow-servio-xs min-h-[38px]"
        >
          Booking Teknisi
        </button>
      </div>
    </div>
  );
}
