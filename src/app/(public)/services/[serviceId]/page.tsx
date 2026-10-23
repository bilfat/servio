"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useServiceDetail } from "@/features/discovery/useServiceDetail";
import { useProviders } from "@/features/discovery/useProviders";
import { productsApi } from "@/lib/servioApi";
import { ApiProduct, getProductMediaUrl } from "@/types/domain";
import { EmptyState } from "@/components/feedback/EmptyState";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Wrench,
  Clock,
  HouseLine,
  Storefront,
  ArrowRight,
  ArrowLeft,
  Heart,
  Sparkle,
  Cube,
  MapPin,
  Tag,
  ChatCircleDots,
  FileText,
  Check,
  Star,
} from "@phosphor-icons/react";
import { OFFICIAL_CITIES } from "@/lib/servioApi";

function getServiceFallbackImage(title?: string, category?: string): string {
  const t = ((title || "") + " " + (category || "")).toLowerCase();
  if (t.includes("ac") || t.includes("pendingin") || t.includes("refrigeration")) {
    return "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80";
  }
  if (t.includes("mobil") || t.includes("motor") || t.includes("auto") || t.includes("kendaraan") || t.includes("bengkel")) {
    return "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80";
  }
  if (t.includes("cuci") || t.includes("bersih") || t.includes("cleaning") || t.includes("sedot") || t.includes("vacuum")) {
    return "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80";
  }
  if (t.includes("pipa") || t.includes("plumb") || t.includes("bocor") || t.includes("sanitasi") || t.includes("kran")) {
    return "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=80";
  }
  if (t.includes("listrik") || t.includes("elektr") || t.includes("kabel") || t.includes("panel")) {
    return "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&auto=format&fit=crop&q=80";
  }
  return "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80";
}

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params?.serviceId as string;

  const [selectedCityCode, setSelectedCityCode] = useState<string>("JKT-BARAT");
  const { service, provider, isNotFound, isLoading } = useServiceDetail(serviceId, selectedCityCode);
  const { providers } = useProviders();

  const [selectedProviderIdState, setSelectedProviderId] = useState<string>("");
  const [selectedModeState] = useState<string>("");
  const [isFavorited, setIsFavorited] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<ApiProduct[]>([]);

  useEffect(() => {
    if (!service) return;
    const sTitle = service.title || "";
    const sCategory = service.categoryName || "";
    const sSub = service.subcategoryName || "";
    const queryTerm = `${sTitle} ${sCategory} ${sSub}`.toLowerCase();

    productsApi
      .list({ scope: "public" })
      .then((res) => {
        const allDbProducts = res.data || [];
        const matched = allDbProducts.filter((p) => {
          const pName = (p.name || "").toLowerCase();
          if (queryTerm.includes("ban") || queryTerm.includes("mobil") || queryTerm.includes("motor") || queryTerm.includes("otomotif")) {
            return pName.includes("ban") || pName.includes("mobil") || pName.includes("motor") || pName.includes("oli");
          }
          if (queryTerm.includes("ac") || queryTerm.includes("pendingin") || queryTerm.includes("cuci")) {
            return pName.includes("ac") || pName.includes("freon") || pName.includes("kompresor");
          }
          if (queryTerm.includes("listrik") || queryTerm.includes("lampu") || queryTerm.includes("panel")) {
            return pName.includes("kabel") || pName.includes("listrik") || pName.includes("exhaust");
          }
          return false;
        });

        // Opsi 1: Hanya menampilkan jika ada produk di database yang cocok dengan kategori jasa.
        // Jika tidak ada barang yang cocok di DB (seperti ban saat ini belum ada di DB),
        // relatedProducts menjadi [] sehingga section otomatis disembunyikan (hidden).
        setRelatedProducts(matched.slice(0, 4));
      })
      .catch(() => {
        setRelatedProducts([]);
      });
  }, [service]);

  const selectedMode = selectedModeState || service?.serviceModes?.[0] || "HOME_SERVICE";
  const selectedProviderId = selectedProviderIdState || service?.providerId || providers[0]?.id || "";

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center font-body">
        <div className="w-14 h-14 rounded-2xl bg-sky-50 text-primary flex items-center justify-center mb-3 animate-pulse shadow-xs">
          <Wrench size={32} weight="duotone" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 font-display">Memuat Detail Layanan...</h3>
        <p className="text-xs text-slate-400 mt-1">Mengambil data alur diagnosa, rentang biaya &amp; profil penyedia jasa...</p>
      </div>
    );
  }

  if (isNotFound || !service) {
    return (
      <div className="py-12 max-w-4xl mx-auto px-4 font-body">
        <EmptyState
          title="Layanan Tidak Ditemukan"
          description={`Layanan dengan ID "${serviceId}" tidak ditemukan atau telah dinonaktifkan.`}
          action={
            <button
              type="button"
              onClick={() => router.push("/services")}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition shadow-xs cursor-pointer"
            >
              Kembali ke Katalog Layanan
            </button>
          }
        />
      </div>
    );
  }

  const handleBooking = () => {
    const pId = selectedProviderId || service.providerId;
    router.push(`/bookings/new?serviceId=${service.id}&providerId=${pId}&mode=${selectedMode}`);
  };

  const isFreeSurvey = service.surveyFeeModel === "FREE" || (service.surveyFee !== undefined && service.surveyFee === 0);
  const hasPaidSurvey = service.surveyFee !== undefined && service.surveyFee > 0;
  const isRange = service.priceMax && service.priceMin && service.priceMax > service.priceMin;

  const durationStr =
    service.durationMin && service.durationMax && service.durationMin !== service.durationMax
      ? `${service.durationMin} - ${service.durationMax} ${service.durationUnit === "MINUTE" ? "Menit" : "Jam"}`
      : `${service.durationMin || service.durationMax || 1} ${service.durationUnit === "MINUTE" ? "Menit" : "Jam"}`;

  const mediaList =
    Array.isArray(service.gallery) && service.gallery.length > 0
      ? service.gallery
      : service.thumbnailUrl
        ? [{ id: "main", url: service.thumbnailUrl }]
        : [];

  const fallbackImg = getServiceFallbackImage(service.title, service.categoryName);
  const rawMediaUrl = mediaList[activeMediaIndex]?.url || service.thumbnailUrl;
  const activeMediaUrl = imageLoadError || !rawMediaUrl ? fallbackImg : rawMediaUrl;

  return (
    <div className="w-full max-w-[1440px] 2xl:max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-5 space-y-8 font-body text-slate-800">
      {/* ========================================================================= */}
      {/* 1. TOP BREADCRUMB & CONTEXT BAR                                          */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-primary transition group"
        >
          <ArrowLeft size={16} weight="bold" className="group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Katalog Layanan</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-50 text-primary border border-sky-200">
            {service.categoryName || "Layanan Jasa"}
          </span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <ShieldCheck size={14} weight="fill" className="text-emerald-600" />
            <span>Mitra Resmi Terverifikasi</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN GRID: KIRI = DETAIL LAYANAN, KANAN = TOKO & ACTION CARD          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ======================================================================= */}
        {/* SEBELAH KIRI (lg:col-span-7 xl:col-span-8): DETAIL LENGKAP LAYANAN     */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Media / Galeri Foto Layanan */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-sm p-4 sm:p-5 space-y-3">
            <div className="relative h-64 sm:h-80 md:h-96 w-full rounded-2xl bg-gradient-to-br from-sky-50 via-sky-100 to-slate-100 overflow-hidden border border-slate-200/90 flex items-center justify-center group shadow-xs">
              <img
                src={activeMediaUrl}
                alt={service.title}
                onError={() => setImageLoadError(true)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

              {/* Badges on image */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-white/95 text-slate-800 shadow-xs backdrop-blur-xs border border-white/60">
                  {service.subcategoryName || service.categoryName}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/60 shadow-xs">
                  <Clock size={13} weight="bold" className="text-primary" />
                  <span>{durationStr}</span>
                </span>
              </div>

              {/* Survey fee badge on image */}
              <div className="absolute bottom-3 left-3">
                {isFreeSurvey ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-emerald-300 shadow-xs">
                    <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                    <span>Gratis Biaya Survei</span>
                  </span>
                ) : hasPaidSurvey ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-900 bg-sky-50/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-sky-300 shadow-xs">
                    <span>Biaya Survei: {formatRupiah(service.surveyFee)}</span>
                  </span>
                ) : null}
              </div>
            </div>

            {/* Gallery Thumbnails */}
            {mediaList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                {mediaList.map((m, idx) => (
                  <button
                    key={m.id || idx}
                    type="button"
                    onClick={() => {
                      setImageLoadError(false);
                      setActiveMediaIndex(idx);
                    }}
                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${activeMediaIndex === idx
                      ? "border-primary ring-2 ring-primary/25 scale-102"
                      : "border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100"
                      }`}
                  >
                    <img src={m.url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rincian Detail Layanan: Judul, Harga & Deskripsi */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-sm p-4 sm:p-5 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                  {service.categoryName || "Servis Resmi"}
                </span>
                {service.subcategoryName && (
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {service.subcategoryName}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  <Clock size={12} weight="bold" className="text-slate-500" />
                  <span>Estimasi: {durationStr}</span>
                </span>
              </div>

              <h1 className="text-base sm:text-lg md:text-xl font-bold font-display text-slate-900 leading-snug">
                {service.title}
              </h1>

              {/* Rating & Pesanan Selesai */}
              <div className="flex items-center gap-2.5 text-[11px] text-slate-500 flex-wrap">
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star size={14} weight="fill" />
                  <span className="text-slate-800">4.9</span>
                  <span className="text-slate-400 font-normal">({provider?.reviewCount || 38} ulasan)</span>
                </div>
                <span className="text-slate-300">•</span>
                <div className="text-slate-600">
                  <span className="font-bold text-slate-800">{provider?.completedJobs || 142}</span> pengerjaan selesai
                </div>
              </div>
            </div>

            {/* RENTANG BIAYA & BIAYA SURVEI BOX */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-sky-50/80 via-white to-slate-50 border border-sky-200/80 shadow-2xs space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    {isRange ? "Rentang Biaya Layanan" : "Biaya Layanan"}
                  </span>
                  <div className="text-sm sm:text-base md:text-lg font-bold font-display text-[#0F4C81] tracking-tight mt-0.5">
                    {isRange
                      ? `${formatRupiah(service.priceMin!)} – ${formatRupiah(service.priceMax!)}`
                      : service.priceFormatted}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Status Biaya Survei
                  </span>
                  <div className="text-xs font-bold font-display mt-0.5">
                    {isFreeSurvey ? (
                      <span className="text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md inline-block">
                        Gratis (Rp 0)
                      </span>
                    ) : hasPaidSurvey ? (
                      <span className="text-sky-900 bg-sky-100/70 px-2 py-0.5 rounded-md inline-block">
                        {formatRupiah(service.surveyFee)}
                      </span>
                    ) : (
                      <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                        Survei Opsional
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {service.surveyRequirement === "REQUIRED"
                      ? "Wajib survei sebelum pengerjaan"
                      : "Survei teknisi bila diperlukan"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-sky-100 flex items-center gap-1.5 text-[11px] text-slate-600">
                <ShieldCheck size={14} weight="fill" className="text-emerald-600 shrink-0" />
                <span>
                  <strong className="text-slate-800">Proteksi Pembayaran Escrow:</strong> Dana Anda disimpan aman oleh sistem dan baru diteruskan ke mitra setelah pekerjaan tuntas dan Anda verifikasi.
                </span>
              </div>
            </div>

            {/* DESKRIPSI LENGKAP LAYANAN */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <h2 className="text-xs font-bold font-display uppercase tracking-wider text-slate-700">
                Deskripsi Lengkap Layanan
              </h2>
              <div className="text-xs text-slate-600 leading-relaxed font-body whitespace-pre-line">
                {service.fullDescription || service.shortDescription || "Layanan terstandarisasi resmi dengan teknisi profesional bersertifikasi."}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* SEBELAH KANAN (lg:col-span-5 xl:col-span-4): TOKO & ACTION CARD         */}
        {/* ======================================================================= */}
        <aside className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-24">
          {/* TOKO PENYEDIA JASA CARD */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-servio-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Penyedia Jasa Resmi
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck size={13} weight="fill" className="text-emerald-600" />
                <span>Terverifikasi</span>
              </span>
            </div>

            {/* Provider Shop Identity */}
            <div className="flex items-start gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#0F4C81] to-[#0A3359] text-white flex items-center justify-center font-display font-black text-lg shadow-xs shrink-0">
                {provider?.avatarInitials || service.providerName?.slice(0, 2).toUpperCase() || (
                  <Storefront size={22} weight="duotone" className="text-sky-200" />
                )}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 leading-tight">
                  {service.providerName}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={13} className="text-primary shrink-0" />
                  <span className="truncate">{service.providerOfficeCity || provider?.city || "DKI Jakarta"}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-600 pt-0.5 flex-wrap">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star size={13} weight="fill" />
                    <span>{provider?.rating || "4.9"}</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Buka Sekarang</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Operational Info */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Jam Operasional:</span>
                <span className="font-semibold text-slate-800">{provider?.operationalHoursSummary || "08:00 - 18:00 WIB"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pesanan Selesai:</span>
                <span className="font-semibold text-slate-800">{provider?.completedJobs || 142} Servis Sukses</span>
              </div>
            </div>

            {/* Action Buttons Toko: Lihat Toko & Chat Toko */}
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href={`/providers/${service.providerId}`}
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Storefront size={15} weight="duotone" className="text-primary" />
                <span>Lihat Toko</span>
              </Link>
              <Link
                href={`/chat?providerId=${service.providerId}&name=${encodeURIComponent(service.providerName)}`}
                className="py-2.5 px-3 rounded-xl border border-sky-200 bg-sky-50/80 hover:bg-sky-100 text-primary text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ChatCircleDots size={15} weight="bold" />
                <span>Chat Toko</span>
              </Link>
            </div>

            {/* Area & City Selector */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <MapPin size={14} weight="bold" className="text-primary" />
                  <span>Lokasi Pelayanan Anda:</span>
                </span>
                {service.serviceable ? (
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" className="text-emerald-600" />
                    <span>Mitra Melayani</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 inline-flex items-center gap-1">
                    <XCircle size={12} weight="fill" className="text-rose-600" />
                    <span>Di Luar Wilayah</span>
                  </span>
                )}
              </div>

              <select
                value={selectedCityCode}
                onChange={(e) => setSelectedCityCode(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
              >
                {OFFICIAL_CITIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* ACTION BUTTONS: BOOKING & FAVORIT */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleBooking}
                disabled={!service.serviceable}
                className={`w-full py-3.5 px-5 rounded-2xl font-display font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-servio-md cursor-pointer ${service.serviceable
                  ? "bg-primary hover:bg-primary-dark text-white active:scale-98 shadow-primary/20"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  }`}
              >
                <span>{service.serviceable ? "Pesan Layanan Sekarang" : "Di Luar Wilayah Layanan"}</span>
                <ArrowRight size={16} weight="bold" />
              </button>

              <button
                type="button"
                onClick={() => setIsFavorited(!isFavorited)}
                className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${isFavorited
                  ? "bg-rose-50 border-rose-200 text-rose-600"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
              >
                <Heart size={16} weight={isFavorited ? "fill" : "regular"} />
                <span>{isFavorited ? "Layanan Tersimpan di Favorit" : "Simpan ke Favorit"}</span>
              </button>
            </div>

            {/* Assurances */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} weight="fill" className="text-emerald-600 shrink-0" />
                <span>Proteksi Escrow Servio: Dana Aman 100%</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-primary shrink-0" />
                <span>Garansi Resmi Pengerjaan 30 Hari</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ========================================================================= */}
      {/* 3. ALUR TAHAPAN & SCOPE OF WORK (2 GRID KIRI & KANAN COMPACT)              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch pt-4 border-t border-slate-200/80">
        {/* KIRI: ALUR & TAHAPAN PELAYANAN TEKNISI (SOP) RINGKAS */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-sm p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                SOP Teknisi
              </span>
              <span className="text-[11px] font-semibold text-slate-400">4 Tahapan Transparan</span>
            </div>
            <h2 className="text-base font-bold font-display text-slate-900 mt-1">
              Alur &amp; Tahapan Pelayanan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Standar operasional diagnosa, survei, hingga pengerjaan tuntas.
            </p>
          </div>

          {/* 4 Mini Steps in a 2x2 grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tahap 1 */}
            <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200/70 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-primary text-white font-display font-black text-[10px] flex items-center justify-center shrink-0">1</span>
                <h4 className="text-xs font-bold text-slate-900 truncate">Diagnosa Kendala</h4>
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
                Konsultasi keluhan unit secara gratis sebelum teknisi survei.
              </p>
            </div>

            {/* Tahap 2 */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-display font-black text-[10px] flex items-center justify-center shrink-0">2</span>
                <h4 className="text-xs font-bold text-slate-900 truncate">Survei &amp; Cek Unit</h4>
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
                Pengecekan fisik di lokasi ({isFreeSurvey ? "Biaya Survei Gratis" : `Biaya Survei ${formatRupiah(service.surveyFee)}`}).
              </p>
            </div>

            {/* Tahap 3 */}
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-amber-600 text-white font-display font-black text-[10px] flex items-center justify-center shrink-0">3</span>
                <h4 className="text-xs font-bold text-slate-900 truncate">Konfirmasi Biaya</h4>
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
                Biaya disepakati transparan sebelum eksekusi perbaikan dimulai.
              </p>
            </div>

            {/* Tahap 4 */}
            <div className="p-3 rounded-2xl bg-slate-100/80 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-800 text-white font-display font-black text-[10px] flex items-center justify-center shrink-0">4</span>
                <h4 className="text-xs font-bold text-slate-900 truncate">Uji Coba &amp; Escrow</h4>
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
                Hasil dites tuntas, verifikasi selesai, lalu dana rilis ke mitra.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck size={14} weight="fill" className="text-emerald-600 shrink-0" />
            <span>Seluruh tahapan diproteksi sistem escrow &amp; garansi Servio.</span>
          </div>
        </div>

        {/* KANAN: CAKUPAN & STANDAR PENGERJAAN (SCOPE OF WORK) RINGKAS */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-sm p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                Scope of Work
              </span>
              <span className="text-[11px] font-semibold text-slate-400">Batasan Tanggung Jawab</span>
            </div>
            <h2 className="text-base font-bold font-display text-slate-900 mt-1">
              Cakupan Pengerjaan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian hal yang termasuk dan yang tidak termasuk dalam jasa standar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Termasuk */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                <span>Termasuk</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {service.inclusions && service.inclusions.length > 0 ? (
                  service.inclusions.slice(0, 3).map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-tight">
                      <Check size={12} weight="bold" className="text-emerald-600 mt-0.5 shrink-0" />
                      <span className="text-[11px]">{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="flex items-start gap-1.5 text-[11px]">
                    <Check size={12} weight="bold" className="text-emerald-600 mt-0.5 shrink-0" />
                    <span>Penanganan dan diagnosa terstandarisasi</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Tidak Termasuk */}
            <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/70 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-900 uppercase tracking-wider">
                <XCircle size={14} weight="fill" className="text-rose-600" />
                <span>Biaya Terpisah</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {service.exclusions && service.exclusions.length > 0 ? (
                  service.exclusions.slice(0, 3).map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-tight">
                      <XCircle size={12} weight="bold" className="text-rose-500 mt-0.5 shrink-0" />
                      <span className="text-[11px]">{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="flex items-start gap-1.5 text-[11px]">
                    <XCircle size={12} weight="bold" className="text-rose-500 mt-0.5 shrink-0" />
                    <span>Suku cadang baru di luar paket</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {service.customerRequirements && service.customerRequirements.length > 0 ? (
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 truncate">
              <strong className="text-slate-700 font-semibold">Kebutuhan:</strong> {service.customerRequirements.join(", ")}
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <span>Peralatan kerja utama disiapkan sepenuhnya oleh mitra teknisi.</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PALING BAWAH: SUKU CADANG & KOMPONEN PENDUKUNG (FULL WIDTH)            */}
      {/* ========================================================================= */}
      {relatedProducts.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-sm p-6 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  Marketplace Suku Cadang
                </span>
                <span className="text-xs text-slate-400 font-medium">Kompatibel &amp; Bergaransi</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold font-display text-slate-900 mt-1 flex items-center gap-2">
                <Cube size={20} className="text-primary" weight="duotone" />
                <span>Suku Cadang &amp; Komponen Pendukung Terkait</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Suku cadang yang sering dibutuhkan untuk pengerjaan layanan ini, dapat dipesan langsung dengan pengiriman cepat.
              </p>
            </div>

            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark transition self-start sm:self-auto bg-sky-50 px-3.5 py-2 rounded-xl border border-sky-200 hover:bg-sky-100"
            >
              <span>Katalog Lengkap Suku Cadang</span>
              <ArrowRight size={13} weight="bold" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((prod) => {
              const defaultVariant = prod.variants?.[0];
              const price = defaultVariant?.price ?? prod.minPrice ?? 0;
              const mediaUrl = getProductMediaUrl(prod.media);
              return (
                <Link
                  key={prod.productId}
                  href={`/products/${prod.productId}`}
                  className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-primary/50 hover:shadow-servio-sm transition bg-white flex flex-col justify-between group cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="w-full h-36 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 group-hover:scale-102 transition-transform">
                      {mediaUrl ? (
                        <img
                          src={mediaUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Cube size={32} weight="duotone" className="text-slate-300 group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                        Stok Tersedia
                      </span>
                      <h4 className="font-semibold text-xs text-slate-800 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                        {prod.name}
                      </h4>
                    </div>
                  </div>
                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Harga</span>
                      <span className="text-xs sm:text-sm font-bold font-display text-primary">
                        {formatRupiah(price)}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                      Beli &rarr;
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
