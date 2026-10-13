"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useServiceDetail } from "@/features/discovery/useServiceDetail";
import { useProviders } from "@/features/discovery/useProviders";
import { productsApi } from "@/lib/servioApi";
import { ApiProduct, getProductMediaUrl } from "@/types/domain";
import { EmptyState } from "@/components/feedback/EmptyState";
import {
  ShieldCheck,
  Star,
  CheckCircle,
  XCircle,
  Wrench,
  Clock,
  HouseLine,
  Storefront,
  ArrowRight,
  Heart,
  Sparkle,
  Cube,
  CalendarCheck,
} from "@phosphor-icons/react";

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params?.serviceId as string;

  const { service, isNotFound } = useServiceDetail(serviceId);
  const { providers } = useProviders();

  const [selectedProviderIdState, setSelectedProviderId] = useState<string>("");
  const [selectedModeState, setSelectedMode] = useState<string>("");
  const [isFavorited, setIsFavorited] = useState(false);

  const selectedMode = selectedModeState || service?.serviceModes?.[0] || "";
  const selectedProviderId = selectedProviderIdState || providers[0]?.id || "";

  if (isNotFound || !service) {
    return (
      <div className="py-12">
        <EmptyState
          title="Layanan Tidak Ditemukan"
          description={`Layanan dengan kode "${serviceId}" tidak ditemukan atau telah dinonaktifkan.`}
          action={
            <button
              type="button"
              onClick={() => router.push("/search")}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
            >
              Kembali ke Daftar Layanan
            </button>
          }
        />
      </div>
    );
  }

  // Real related products from database
  const [relatedProducts, setRelatedProducts] = useState<ApiProduct[]>([]);

  useEffect(() => {
    productsApi
      .list({ scope: "public" })
      .then((res) => {
        if (res.data) setRelatedProducts(res.data.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  const handleBooking = () => {
    const pId = selectedProviderId || (providers[0]?.id ?? "prov-bintang-01");
    router.push(`/bookings/new?serviceId=${service.id}&providerId=${pId}&mode=${selectedMode}`);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* 1. HERO BANNER */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-servio-sm bg-white">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky text-primary border border-sky-200">
                {service.subcategoryId.toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck size={14} weight="fill" />
                Garansi {service.warrantyDays} Hari
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-neutral-dark">
              {service.title}
            </h1>

            <p className="text-sm text-neutral-slate leading-relaxed">
              {service.fullDescription || service.shortDescription}
            </p>

            {/* Ratings & Meta */}
            <div className="flex items-center gap-4 text-xs text-neutral-slate flex-wrap pt-1">
              <div className="flex items-center gap-1 font-bold text-neutral-dark">
                <Star size={16} weight="fill" className="text-amber-500" />
                <span>{service.rating}</span>
                <span className="text-neutral-muted font-normal">({service.reviewCount} ulasan)</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Clock size={16} className="text-primary" />
                <span>Estimasi {service.estimatedDurationHours} Jam</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Wrench size={16} className="text-secondary" />
                <span>Model: {service.pricingModel.replace(/_/g, " ")}</span>
              </div>
            </div>
          </div>

          {/* Price Card & Booking Callout */}
          <div className="w-full lg:w-80 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 shrink-0">
            <div>
              <span className="text-xs text-neutral-muted">Mulai dari</span>
              <div className="text-2xl sm:text-3xl font-display font-extrabold text-primary">
                Rp {service.basePrice.toLocaleString("id-ID")}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                <ShieldCheck size={13} weight="fill" />
                Dana diamankan sistem Escrow
              </span>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleBooking}
                className="w-full py-3 rounded-xl bg-primary text-white font-display font-bold text-sm hover:bg-primary-dark transition-all flex items-center justify-center gap-2 shadow-servio-sm active:scale-95"
              >
                <span>Pesan Sekarang</span>
                <ArrowRight size={16} weight="bold" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFavorited(!isFavorited)}
                  className={`flex-1 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    isFavorited
                      ? "bg-rose-50 border-rose-200 text-rose-600"
                      : "border-slate-200 text-neutral-slate hover:bg-white"
                  }`}
                >
                  <Heart size={15} weight={isFavorited ? "fill" : "regular"} />
                  <span>{isFavorited ? "Tersimpan" : "Favorit"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/smart-discovery")}
                  className="flex-1 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-amber-100 transition-colors"
                >
                  <Sparkle size={15} weight="fill" className="text-amber-500" />
                  <span>Tanya AI</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN DETAILS: SCOPE (INCLUDED / EXCLUDED) & MODES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Scope Checklist Card */}
          <div className="glass-card p-6 rounded-3xl border border-slate-200/80 space-y-4">
            <h2 className="font-display font-bold text-base text-neutral-dark">
              Cakupan & Standar Pengerjaan (Scope of Work)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Included */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                  <span>Termasuk Dalam Jasa</span>
                </div>
                <ul className="space-y-2 text-xs text-neutral-dark">
                  {service.inclusions?.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle size={14} weight="bold" className="text-emerald-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Excluded */}
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/70 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-800 uppercase tracking-wider">
                  <XCircle size={16} weight="fill" className="text-rose-600" />
                  <span>Tidak Termasuk (Biaya Tambahan)</span>
                </div>
                <ul className="space-y-2 text-xs text-neutral-dark">
                  {service.exclusions?.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <XCircle size={14} weight="bold" className="text-rose-500 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Supported Modes */}
          <div className="glass-card p-6 rounded-3xl border border-slate-200/80 space-y-3">
            <h3 className="font-display font-bold text-base text-neutral-dark">
              Pilihan Mode Layanan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {service.serviceModes?.map((mode: string) => {
                const isSelected = selectedMode === mode;
                return (
                  <div
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? "border-primary bg-sky/20 ring-2 ring-primary/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isSelected ? "bg-primary text-white" : "bg-slate-100 text-neutral-slate"
                      }`}
                    >
                      {mode === "HOME_SERVICE" ? (
                        <HouseLine size={20} weight="duotone" />
                      ) : (
                        <Storefront size={20} weight="duotone" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-neutral-dark">
                        {mode === "HOME_SERVICE" ? "Home Service (Datang ke Rumah)" : "Workshop (Bawa ke Bengkel)"}
                      </div>
                      <p className="text-[11px] text-neutral-slate mt-0.5">
                        {mode === "HOME_SERVICE"
                          ? "Teknisi datang langsung membawa perlengkapan standar."
                          : "Unit dibawa ke workshop mitra untuk pengujian intensif."}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended Providers List */}
          <div className="glass-card p-6 rounded-3xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-neutral-dark">
                Pilih Mitra Penyedia ({providers.length})
              </h3>
              <span className="text-xs text-neutral-slate">Terverifikasi Servio Shield</span>
            </div>

            <div className="space-y-3">
              {providers.map((provider) => {
                const isSelected = selectedProviderId === provider.id;
                return (
                  <div
                    key={provider.id}
                    onClick={() => setSelectedProviderId(provider.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? "border-primary bg-sky/15 ring-2 ring-primary/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky text-primary flex items-center justify-center font-bold text-sm">
                        {provider.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-xs sm:text-sm text-neutral-dark">
                          {provider.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-neutral-slate mt-0.5">
                          <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                            <Star size={13} weight="fill" /> {provider.rating}
                          </span>
                          <span>•</span>
                          <span>Radius {provider.workRadiusKm} km</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/providers/${provider.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Profil
                      </Link>
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setSelectedProviderId(provider.id)}
                        className="text-primary focus:ring-primary"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RELATED PRODUCTS / SPARE PARTS */}
        <aside className="space-y-6">
          <div className="glass-card p-5 rounded-3xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-neutral-dark flex items-center gap-1.5">
                <Cube size={16} className="text-secondary" weight="bold" />
                Suku Cadang Terkait
              </h3>
              <Link href="/products" className="text-[11px] font-semibold text-primary hover:underline">
                Lihat Semua
              </Link>
            </div>

            <div className="space-y-3">
              {relatedProducts.map((prod) => {
                const defaultVariant = prod.variants?.[0];
                const price = defaultVariant?.price ?? prod.minPrice ?? 0;
                return (
                  <Link
                    key={prod.productId}
                    href={`/products/${prod.productId}`}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-slate-100 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden text-slate-400 group-hover:text-primary">
                      {getProductMediaUrl(prod.media) ? (
                        <img src={getProductMediaUrl(prod.media)} alt={prod.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Cube size={22} weight="duotone" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display font-semibold text-xs text-neutral-dark truncate group-hover:text-primary">
                        {prod.name}
                      </h4>
                      <span className="text-[10px] text-neutral-muted">{prod.categoryName || prod.categoryId}</span>
                      <div className="font-mono text-xs font-bold text-primary mt-0.5">
                        Rp {price.toLocaleString("id-ID")}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Guarantee & FAQ Card */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 font-display font-bold text-xs text-neutral-dark">
              <CalendarCheck size={18} className="text-emerald-600" weight="fill" />
              Ketentuan Garansi Servio
            </div>
            <p className="text-xs text-neutral-slate leading-relaxed">
              Jasa ini dilindungi garansi kerja {service.warrantyDays} hari. Sertifikat garansi digital otomatis terbit di akun Anda setelah penyelesaian pesanan.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
