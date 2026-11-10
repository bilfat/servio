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
import { afterSalesApi, ReviewEntry, CatalogRatingSummaryItem, BusinessReputationDto } from "@/lib/afterSalesApi";

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
  const [serviceReviews, setServiceReviews] = useState<ReviewEntry[]>([]);
  const [reviewSummary, setReviewSummary] = useState<CatalogRatingSummaryItem | null>(null);
  const [providerReputation, setProviderReputation] = useState<BusinessReputationDto | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (!serviceId) return;
    setReviewsLoading(true);
    afterSalesApi.public
      .getServiceReviews(serviceId)
      .then((res) => {
        if (res.data) setServiceReviews(res.data);
        if (res.meta?.summary) setReviewSummary(res.meta.summary);
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [serviceId]);

  useEffect(() => {
    const provId = service?.providerId || provider?.id;
    if (!provId) return;
    afterSalesApi.public
      .getBusinessReputation("PROVIDER", provId)
      .then((res) => {
        if (res.data) setProviderReputation(res.data);
      })
      .catch(() => {});
  }, [service?.providerId, provider?.id]);

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

  // Unified Combined Average Rating (Service + Provider)
  const sAvg = reviewSummary?.average_rating ?? null;
  const sCount = reviewSummary?.total_reviews ?? 0;
  const pAvg = providerReputation?.average_rating ?? null;
  const pCount = providerReputation?.total_reviews ?? 0;

  let detailCombinedRating: number | null = null;
  if (sAvg !== null && sCount > 0 && pAvg !== null && pCount > 0) {
    detailCombinedRating = (sAvg + pAvg) / 2;
  } else if (sAvg !== null && sCount > 0) {
    detailCombinedRating = sAvg;
  } else if (pAvg !== null && pCount > 0) {
    detailCombinedRating = pAvg;
  }
  const detailTotalReviews = sCount > 0 ? sCount : pCount;

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
                {detailCombinedRating !== null ? (
                  <div className="flex items-center gap-1 text-amber-500 font-bold" title={`Rating rata-rata: ${detailCombinedRating.toFixed(1)}`}>
                    <Star size={14} weight="fill" />
                    <span className="text-slate-800">{detailCombinedRating.toFixed(1)}</span>
                    <span className="text-slate-400 font-normal">({detailTotalReviews} penilaian)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-slate-400">
                    <Star size={14} className="text-slate-300" />
                    <span>Belum dinilai</span>
                  </div>
                )}
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
                  <strong className="text-slate-800">Proteksi Uang Aman:</strong> Dana Anda disimpan aman oleh sistem dan baru diteruskan ke mitra setelah pekerjaan tuntas dan Anda verifikasi.
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
                  <div className="flex items-center gap-1 text-amber-500 font-bold" title="Reputasi Mitra Penyedia Jasa (PROVIDER)">
                    <Star size={13} weight="fill" />
                    <span>
                      {(providerReputation?.total_reviews ?? 0) > 0
                        ? `${providerReputation!.average_rating.toFixed(1)} (${providerReputation!.total_reviews} ulasan mitra)`
                        : provider?.rating
                          ? `${provider.rating}`
                          : "Belum dinilai"}
                    </span>
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
                href={`/chat?partner_id=${encodeURIComponent(service.providerId || "0740d857-b665-4191-aaf5-d7dd3611dc1d")}&partner_type=provider&partner_name=${encodeURIComponent(service.providerName || "sukses gembira")}&ctx_type=catalog_jasa&ctx_id=${encodeURIComponent(service.id)}&ctx_title=${encodeURIComponent((service as any).title || "Layanan Jasa")}&ctx_price=${encodeURIComponent(service.basePrice || 0)}&ctx_thumb=${encodeURIComponent((service as any).imageUrl || "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80")}&ctx_summary=${encodeURIComponent(`Mitra Resmi: ${service.providerName || "sukses gembira"} • Garansi Layanan 30 Hari • Estimasi 1-2 Jam`)}&ctx_url=${encodeURIComponent(`/services/${service.id}`)}`}
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
                <span>Proteksi Uang Aman Servio: 100% Aman</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-primary shrink-0" />
                <span>
                  {service.warrantyEnabled && (service.warrantyDays || 0) > 0
                    ? `Garansi Layanan ${service.warrantyDays} Hari Kalender`
                    : "Proteksi Standar Operasional Servio"}
                </span>
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
                <h4 className="text-xs font-bold text-slate-900 truncate">Uji Coba &amp; Rilis Dana</h4>
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
                Hasil dites tuntas, verifikasi selesai, lalu dana rilis ke mitra.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck size={14} weight="fill" className="text-emerald-600 shrink-0" />
            <span>Seluruh tahapan diproteksi jaminan uang aman &amp; garansi Servio.</span>
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
      {/* SECTION: GARANSI LAYANAN (MODUL 07 AFTER-SALES PHASE INTEGRATION)        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-sm p-6 sm:p-7 space-y-4">
        {(() => {
          const isWarOn = Boolean(service.warrantyEnabled && (service.warrantyDays || 0) > 0);
          const warDays = service.warrantyDays || 0;
          const warName = (service as any).warrantyName || "Garansi Layanan Purna Jual";
          const warCoverage = (service as any).warrantyCoverage || "Jaminan perbaikan ulang tanpa biaya tambahan jika keluhan atau malafungsi teknis yang sama terjadi kembali pasca pengerjaan.";
          const rawExclusions = (service as any).warrantyExclusions;
          const warExclusions = (rawExclusions && rawExclusions.trim() !== "" && rawExclusions !== "null") ? rawExclusions : "Tidak ada pengecualian khusus.";
          const warTerms = (service as any).warrantyTerms || "Klaim dapat diajukan konsumen di pusat purnajual selama masa garansi aktif dengan mengunggah foto/video kendala pengerjaan teknisi.";

          if (isWarOn) {
            return (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={20} className="text-emerald-600" weight="fill" />
                    <div>
                      <h2 className="text-base font-bold font-display text-slate-900">
                        Tersedia Garansi Layanan
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Layanan ini dilengkapi jaminan purna jual resmi langsung dari mitra penyedia jasa.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                    GARANSI AKTIF ({warDays} HARI)
                  </span>
                </div>

                <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-3 text-xs shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-900 uppercase block">Nama Pilihan Garansi</span>
                      <span className="font-extrabold text-emerald-950 text-sm">{warName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-emerald-900 uppercase block">Masa Berlaku</span>
                      <span className="font-bold text-emerald-800 text-xs px-2.5 py-0.5 rounded-md bg-white border border-emerald-200">
                        {warDays} Hari Kalender
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <p className="text-emerald-950 leading-relaxed">
                      <strong className="text-emerald-900 font-bold">Cakupan Garansi:</strong>{" "}
                      {warCoverage}
                    </p>
                    <p className="text-emerald-900/90 leading-relaxed">
                      <strong className="text-emerald-900 font-bold">Pengecualian Garansi:</strong>{" "}
                      {warExclusions}
                    </p>
                    <p className="text-emerald-800/80 leading-relaxed text-[11px] pt-1.5 border-t border-emerald-200/50">
                      <strong className="text-emerald-900 font-semibold">Syarat &amp; Ketentuan Klaim:</strong>{" "}
                      {warTerms}
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ShieldCheck size={20} className="text-slate-400" weight="bold" />
                <div>
                  <h2 className="text-base font-bold font-display text-slate-800">
                    Garansi Layanan
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Informasi ketentuan purna jual untuk layanan jasa ini.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
                <p className="font-bold text-slate-800">
                  Tidak ada garansi tambahan dari penyedia jasa untuk layanan ini.
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Layanan ini tidak menyertakan opsi garansi purnajual lanjutan dari mitra penyedia jasa. Namun demikian, setiap pengerjaan tetap diproteksi sepenuhnya oleh standar operasional platform SERVIO, termasuk garansi serah terima dan proteksi dana pembayaran aman hingga status pengerjaan dinyatakan selesai.
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ========================================================================= */}
      {/* ULASAN PELANGGAN TERVERIFIKASI (PUB04)                                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-sm p-6 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Star size={18} weight="fill" className="text-amber-400" />
              <h2 className="text-base font-bold text-slate-900 font-display">
                Ulasan &amp; Penilaian Kualitas Layanan
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {reviewSummary?.total_reviews ?? serviceReviews.length} Ulasan
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan nama pelanggan publik, tanggal order, tanggal penilaian, rating kualitas layanan (tanpa rating individual teknisi), dan tanggapan resmi mitra.
            </p>
          </div>
          {(reviewSummary?.total_reviews ?? serviceReviews.length) > 0 && (
            <div className="flex items-center gap-3 bg-amber-50/70 px-3.5 py-2 rounded-2xl border border-amber-200">
              <div className="text-center">
                <span className="text-xl font-extrabold text-slate-900">
                  {(
                    reviewSummary?.average_rating ??
                    serviceReviews.reduce((acc, r) => acc + r.rating, 0) / serviceReviews.length
                  ).toFixed(1)}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold"> / 5.0</span>
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    weight="fill"
                    className={
                      s <=
                      Math.round(
                        reviewSummary?.average_rating ??
                          serviceReviews.reduce((acc, r) => acc + r.rating, 0) /
                            serviceReviews.length
                      )
                        ? "text-amber-400"
                        : "text-slate-300"
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Distribution 5..1 Stars & Separate Provider Reputation (PUB04 & PUB05) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {(reviewSummary?.total_reviews ?? serviceReviews.length) > 0 && (
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              {[5, 4, 3, 2, 1].map((star) => {
                const total = reviewSummary?.total_reviews ?? serviceReviews.length;
                const count =
                  reviewSummary?.distribution?.[String(star)] ??
                  serviceReviews.filter((r) => Math.round(r.rating) === star).length;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2 bg-white px-2.5 py-2 rounded-xl border border-slate-200/70">
                    <span className="font-bold text-slate-700 flex items-center gap-0.5 shrink-0">
                      {star} <Star size={12} weight="fill" className="text-amber-400" />
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="lg:col-span-4 p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                Reputasi Penyedia Jasa (Terpisah)
              </span>
              <span className="font-bold text-slate-900 block mt-0.5">
                {provider?.name || service.providerName || "Penyedia Jasa Mitra"}
              </span>
              <span className="text-[11px] text-slate-500">
                {providerReputation && providerReputation.total_reviews > 0
                  ? `${providerReputation.total_reviews} penilaian reputasi usaha`
                  : "Belum ada penilaian usaha"}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-center shrink-0">
              <div className="flex items-center gap-1 font-extrabold text-slate-900 text-sm">
                <Star size={14} weight="fill" className="text-amber-400" />
                <span>
                  {providerReputation && providerReputation.total_reviews > 0
                    ? Number(providerReputation.average_rating).toFixed(1)
                    : "-"}
                </span>
              </div>
              <span className="text-[9px] font-bold text-purple-700 uppercase">Provider</span>
            </div>
          </div>
        </div>

        {reviewsLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Memuat ulasan layanan...
          </div>
        ) : serviceReviews.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-slate-200/80 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Belum ada ulasan untuk layanan ini</p>
            <p className="text-[11px] text-slate-400">Pesan layanan ini dan jadilah yang pertama memberikan ulasan setelah pengerjaan selesai!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {serviceReviews.map((rev) => {
              const publicName =
                rev.customer_display_name ||
                (rev.submission?.customer_id
                  ? `Pelanggan #${rev.submission.customer_id.substring(0, 6)}`
                  : "Pelanggan Terverifikasi");
              const reviewDateStr = new Date(
                rev.submitted_at || rev.created_at
              ).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
              const orderDateStr = rev.ordered_at
                ? new Date(rev.ordered_at).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : null;
              const commentText = rev.review_text ?? rev.comment;
              const replyText = rev.reply?.reply_text ?? rev.reply?.text;

              return (
                <div key={rev.id} className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {publicName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{publicName}</span>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          {orderDateStr && (
                            <span>
                              Tanggal Order: <strong className="text-slate-700">{orderDateStr}</strong>
                            </span>
                          )}
                          {orderDateStr && <span className="text-slate-300">•</span>}
                          <span>
                            Tanggal Ulasan: <strong className="text-slate-700">{reviewDateStr}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          weight="fill"
                          className={i < (rev.rating || 5) ? "text-amber-400" : "text-slate-200"}
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-800 ml-1">{rev.rating || 5}.0</span>
                    </div>
                  </div>

                  {commentText ? (
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {commentText}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Pelanggan memberikan rating bintang tanpa komentar tertulis.
                    </p>
                  )}

                  {/* Provider Reply if exists */}
                  {replyText && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                          Balasan Resmi Penyedia Jasa:
                        </span>
                        {rev.reply?.created_at && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(rev.reply.updated_at || rev.reply.created_at).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {replyText}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
