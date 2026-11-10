"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActiveRole } from "@/context/RoleContext";
import { useServices } from "@/features/discovery/useServices";
import { CATEGORY_ICON_MAP } from "@/config/navigation";
import { ServiceCard, ServiceCardData } from "@/components/features/services/ServiceCard";
import {
  ServiceOffering,
  ApiProduct,
  getProductMediaUrl,
} from "@/types/domain";
import { taxonomyApi, productsApi } from "@/lib/servioApi";
import { afterSalesApi, CatalogRatingSummaryItem } from "@/lib/afterSalesApi";
import {
  MagnifyingGlass,
  ChatCircleDots,
  ArrowRight,
  ShieldCheck,
  Wrench,
  MapPin,
  CheckCircle,
  CaretRight,
  Star,
  Lightning,
  NavigationArrow,
  CircleNotch,
  Package,
  Storefront,
  UserPlus,
  Handshake,
} from "@phosphor-icons/react";
import { useActiveLocation } from "@/context/LocationContext";
import { getRoleDashboard, isOperationalRole } from "@/lib/roleNavigation";
import { GuestBackdropCanvas } from "@/components/features/home/GuestBackdropCanvas";
import { HeroTechnicianIllustration } from "@/components/features/home/HeroTechnicianIllustration";
import { AnimatedServiceJourney } from "@/components/features/home/AnimatedServiceJourney";
import { CustomerFeaturesBento } from "@/components/features/home/CustomerFeaturesBento";
import { AiDiagnosticSandbox } from "@/components/features/home/AiDiagnosticSandbox";
import { CustomerHomeView } from "@/components/features/home/CustomerHomeView";

interface HomeCategoryNode {
  id: string;
  name: string;
  icon_name?: string | null;
}

type ServiceWithRatings = ServiceOffering & {
  providerRating?: number;
  providerReviewCount?: number;
  provider?: { rating?: number; reviewCount?: number };
};

type ProductWithRatings = ApiProduct & {
  merchantId?: string;
  rating?: number;
  reviewCount?: number;
  merchantRating?: number;
  merchantReviewCount?: number;
};

const PRODUCT_CATEGORY_ICON_RULES: Array<{ keyword: string; icon: React.ElementType }> = [
  { keyword: "ac", icon: Wrench },
  { keyword: "pendingin", icon: Wrench },
  { keyword: "perkakas", icon: Wrench },
  { keyword: "elektrik", icon: Lightning },
  { keyword: "listrik", icon: Lightning },
];

export default function HomePage() {
  const router = useRouter();
  const { isPublicGuest, activeRole, isAuthenticated } = useActiveRole();
  const isOperational = Boolean(
    isAuthenticated && !isPublicGuest && isOperationalRole(activeRole)
  );

  // Semua hooks dideklarasikan di top-level sebelum conditional render
  const { services, isLoading: loadingServices } = useServices();

  const [searchQuery, setSearchQuery] = useState("");
  const {
    location: activeLoc,
    isDetectingGps,
    locationFeedback,
    detectGps,
    openLocationModal,
    getStoreDistance,
  } = useActiveLocation();

  // Tab kategori: JASA vs PRODUK
  const [categoryTab, setCategoryTab] = useState<"JASA" | "PRODUK">("JASA");
  const [liveServiceCategories, setLiveServiceCategories] = useState<HomeCategoryNode[]>([]);
  const [liveProductCategories, setLiveProductCategories] = useState<HomeCategoryNode[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Featured Products (Suku Cadang & Perkakas 05A)
  const [featuredProducts, setFeaturedProducts] = useState<ProductWithRatings[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [failedProductImages, setFailedProductImages] = useState<Record<string, boolean>>({});
  const [productRatings, setProductRatings] = useState<Record<string, CatalogRatingSummaryItem>>({});
  const [merchantRatings, setMerchantRatings] = useState<Record<string, CatalogRatingSummaryItem>>({});
  const [serviceRatings, setServiceRatings] = useState<Record<string, CatalogRatingSummaryItem>>({});
  const [providerRatings, setProviderRatings] = useState<Record<string, CatalogRatingSummaryItem>>({});

  useEffect(() => {
    if (isOperational) {
      const target = getRoleDashboard(activeRole);
      router.replace(target);
    }
  }, [isOperational, activeRole, router]);

  // Fetch Kategori Jasa & Kategori Produk secara paralel
  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      taxonomyApi.getCategories({ master_code: "JASA", status: "ACTIVE" }),
      taxonomyApi.getCategories({ master_code: "PRODUK", status: "ACTIVE" }),
    ])
      .then(([svcRes, prodRes]) => {
        if (!mounted) return;
        if (svcRes.status === "fulfilled" && Array.isArray(svcRes.value?.data)) {
          setLiveServiceCategories(svcRes.value.data as HomeCategoryNode[]);
        }
        if (prodRes.status === "fulfilled" && Array.isArray(prodRes.value?.data)) {
          setLiveProductCategories(prodRes.value.data as HomeCategoryNode[]);
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingCategories(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch Produk Suku Cadang Resmi (05A) untuk Etalase Ganda
  useEffect(() => {
    let mounted = true;
    productsApi
      .list({ scope: "public", limit: 8 })
      .then((res) => {
        if (!mounted) return;
        const items = Array.isArray(res?.data) ? res.data : [];
        const recs = Array.isArray(res?.recommendations) ? res.recommendations : [];
        const combined = (items.length > 0 ? items : recs) as ProductWithRatings[];
        setFeaturedProducts(combined.slice(0, 4));
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingProducts(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Enrich Ratings untuk Produk Unggulan (Modul 07)
  useEffect(() => {
    if (featuredProducts.length === 0) return;
    const prodIds = Array.from(new Set(featuredProducts.map((p) => p.productId).filter(Boolean)));
    const merchIds = Array.from(
      new Set(
        featuredProducts
          .map((p) => p.merchantOrganizationId || p.merchantId || p.merchant?.id)
          .filter(Boolean) as string[]
      )
    );
    if (prodIds.length > 0) {
      afterSalesApi.public
        .getBatchRatingsSummary("PRODUCT", prodIds)
        .then((res) => {
          if (res.data) setProductRatings((prev) => ({ ...prev, ...res.data }));
        })
        .catch(() => {});
    }
    if (merchIds.length > 0) {
      afterSalesApi.public
        .getBatchRatingsSummary("MERCHANT", merchIds)
        .then((res) => {
          if (res.data) setMerchantRatings((prev) => ({ ...prev, ...res.data }));
        })
        .catch(() => {});
    }
  }, [featuredProducts]);

  // Enrich Ratings untuk Layanan Jasa Unggulan (Modul 07)
  const featuredServices = useMemo(() => services.slice(0, 4), [services]);
  useEffect(() => {
    if (featuredServices.length === 0) return;
    const svcIds = Array.from(new Set(featuredServices.map((s) => s.id).filter(Boolean)));
    const provIds = Array.from(
      new Set(featuredServices.map((s) => s.providerId).filter(Boolean) as string[])
    );
    if (svcIds.length > 0) {
      afterSalesApi.public
        .getBatchRatingsSummary("SERVICE", svcIds)
        .then((res) => {
          if (res.data) setServiceRatings((prev) => ({ ...prev, ...res.data }));
        })
        .catch(() => {});
    }
    if (provIds.length > 0) {
      afterSalesApi.public
        .getBatchRatingsSummary("PROVIDER", provIds)
        .then((res) => {
          if (res.data) setProviderRatings((prev) => ({ ...prev, ...res.data }));
        })
        .catch(() => {});
    }
  }, [featuredServices]);

  const activeServiceDomains = useMemo(() => {
    return liveServiceCategories.map((c) => {
      const IconComponent = CATEGORY_ICON_MAP[c.icon_name || ""] || Wrench;
      return {
        id: c.id,
        label: c.name,
        href: `/services?categories=${c.id}`,
        icon: IconComponent,
      };
    });
  }, [liveServiceCategories]);

  const activeProductDomains = useMemo(() => {
    return liveProductCategories.map((c) => {
      const lowerName = String(c.name || "").toLowerCase();
      const matchedRule = PRODUCT_CATEGORY_ICON_RULES.find((r) => lowerName.includes(r.keyword));
      const IconComponent =
        CATEGORY_ICON_MAP[c.icon_name || ""] || matchedRule?.icon || Package;
      return {
        id: c.id,
        label: c.name,
        href: `/products?categories=${c.id}`,
        icon: IconComponent,
      };
    });
  }, [liveProductCategories]);

  if (isOperational) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <CircleNotch size={32} className="animate-spin text-primary" />
          <p className="text-sm font-medium text-slate-600">
            Mengarahkan ke Dashboard {activeRole?.replace(/_/g, " ")}...
          </p>
        </div>
      </div>
    );
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/search");
    }
  };

  const toCardData = (s: ServiceWithRatings): ServiceCardData => {
    const svcR = serviceRatings[s.id];
    const provR = s.providerId ? providerRatings[s.providerId] : null;
    return {
      id: s.id,
      title: s.title,
      category: s.subcategoryName || s.categoryName || "Layanan",
      price: s.basePrice,
      priceMin: s.priceMin ?? s.basePrice,
      priceMax: s.priceMax ?? s.basePrice,
      pricingModel: s.pricingModel,
      providerName: s.providerName || "Penyedia Jasa",
      providerId: s.providerId,
      isVerifiedProvider: s.isVerifiedProvider,
      thumbnailUrl: s.thumbnailUrl,
      description: s.description || s.shortDescription || "",
      surveyFee: s.surveyFee,
      surveyFeeModel: s.surveyFeeModel,
      durationMin: s.durationMin,
      durationMax: s.durationMax,
      durationUnit: s.durationUnit,
      warrantyDays: s.warrantyDays || 0,
      warrantyEnabled: s.warrantyEnabled || s.warrantyDays > 0,
      rating: svcR?.average_rating ?? s.rating ?? 0,
      reviewCount: svcR?.total_reviews ?? s.reviewCount ?? 0,
      providerRating: provR?.average_rating ?? s.providerRating ?? s.provider?.rating,
      providerReviewCount:
        provR?.total_reviews ?? s.providerReviewCount ?? s.provider?.reviewCount,
    };
  };

  const displayedCategories =
    categoryTab === "JASA" ? activeServiceDomains : activeProductDomains;

  // Jika pengguna adalah Pelanggan (Customer) yang sedang login, tampilkan Beranda Khusus Pelanggan
  if ((!isPublicGuest || isAuthenticated) && activeRole === "CUSTOMER") {
    return <CustomerHomeView />;
  }

  return (
    <GuestBackdropCanvas>
      <div className="space-y-8 sm:space-y-10">
        {/* =================================================================
            1. HERO 2-KOLOM + ILUSTRASI TEKNISI ANIMASI UNIK
           ================================================================= */}
        <section
          className="relative overflow-hidden rounded-3xl text-white p-5 sm:p-7 lg:p-9 shadow-servio-lg"
          style={{
            backgroundImage: [
              "radial-gradient(circle at 88% 12%, rgba(244, 63, 94, 0.22) 0%, transparent 40%)",
              "radial-gradient(circle at 12% 92%, rgba(56, 189, 248, 0.20) 0%, transparent 45%)",
              "linear-gradient(135deg, #0F4C81 0%, #155E9C 52%, #0B3860 100%)",
            ].join(", "),
          }}
        >
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Kolom Kiri: Headline, Search Bar & Kontrol GPS */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/12 text-xs font-semibold text-sky tracking-wide">
                  <ShieldCheck size={15} weight="fill" className="text-secondary" />
                  <span>Garansi Resmi &amp; Proteksi Rekening Uang Aman</span>
                </span>
                <a
                  href="#uji-diagnosa-ai"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-secondary to-rose-600 hover:from-secondary-dark hover:to-rose-700 text-white text-xs font-bold shadow-xs transition-all hover:scale-102 group"
                >
                  <ChatCircleDots size={15} weight="duotone" className="text-white" />
                  <span>Coba Diagnosa AI</span>
                </a>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-display font-extrabold tracking-tight leading-[1.14]">
                More Than Service, <br className="hidden sm:inline" />
                <span className="text-sky-200">
                  A Better Everyday.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl">
                Solusi satu atap panggil teknisi bersertifikasi, belanja suku cadang asli, diagnosa gejala dengan Asisten AI Servio, dan jaminan garansi digital transparan.
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="pt-0.5">
                <div className="relative flex items-center shadow-servio-md rounded-2xl bg-white p-1.5 focus-within:ring-4 focus-within:ring-sky/40 transition-shadow">
                  <div className="pl-3.5 text-neutral-slate flex items-center pointer-events-none">
                    <MagnifyingGlass size={21} weight="bold" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari servis AC bocor, Freon R32, PCB kulkas, teknisi listrik..."
                    className="w-full px-3 py-2.5 text-sm text-neutral-dark placeholder:text-neutral-muted focus:outline-none rounded-xl"
                  />
                  <button
                    type="submit"
                    className="shrink-0 px-5 sm:px-6 py-2.5 rounded-xl bg-secondary text-white font-display font-bold text-xs sm:text-sm hover:bg-secondary-dark active:scale-[0.98] transition-all flex items-center gap-2 shadow-servio-sm cursor-pointer"
                  >
                    <span>Cari</span>
                    <ArrowRight size={15} weight="bold" />
                  </button>
                </div>

                {/* Popular Keywords + GPS Control */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 mt-3 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-300/80 font-medium">Populer:</span>
                    {["Cuci AC", "Freon R32", "Pipa Bocor", "Tune Up Mobil", "PCB Kulkas"].map(
                      (k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            setSearchQuery(k);
                            router.push(`/search?q=${encodeURIComponent(k)}`);
                          }}
                          className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-[11px] cursor-pointer"
                        >
                          {k}
                        </button>
                      )
                    )}
                  </div>

                  {/* Location Pill & Aktifkan GPS */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={openLocationModal}
                      className="flex items-center gap-1.5 text-sky-light text-[11px] font-medium bg-white/12 hover:bg-white/22 px-2.5 py-1 rounded-full border border-white/15 transition-colors cursor-pointer"
                      title="Klik untuk memilih kota atau alamat pengiriman Anda"
                    >
                      <MapPin
                        size={14}
                        weight="fill"
                        className={activeLoc.isGps ? "text-emerald-300" : "text-sky-300"}
                      />
                      <span>Lokasi: {activeLoc.displayName}</span>
                      {activeLoc.isGps && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-400/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          GPS Aktif
                        </span>
                      )}
                      <span className="text-[10px] text-sky-200 underline font-semibold ml-0.5">
                        Ubah
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => detectGps()}
                      disabled={isDetectingGps}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary hover:bg-secondary-dark text-white text-[11px] font-bold shadow-xs active:scale-95 transition-colors disabled:opacity-70 cursor-pointer"
                    >
                      {isDetectingGps ? (
                        <>
                          <CircleNotch size={13} weight="bold" className="animate-spin text-white" />
                          <span>Mendeteksi GPS...</span>
                        </>
                      ) : activeLoc.isGps ? (
                        <>
                          <CheckCircle size={13} weight="fill" className="text-emerald-300" />
                          <span>GPS Terhubung</span>
                        </>
                      ) : (
                        <>
                          <NavigationArrow size={13} weight="bold" className="text-white" />
                          <span>Aktifkan GPS</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {locationFeedback && (
                  <div className="mt-2 text-left">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                        activeLoc.isGps
                          ? "bg-emerald-500/25 text-emerald-100 border border-emerald-400/35"
                          : "bg-sky-500/25 text-sky-100 border border-sky-400/35"
                      }`}
                    >
                      <CheckCircle size={13} weight="fill" />
                      <span>{locationFeedback}</span>
                    </span>
                  </div>
                )}
              </form>

              {/* Micro-Highlight Bar */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-sky-100/90 border-t border-white/12">
                <span className="flex items-center gap-1.5">
                  <Wrench size={14} weight="fill" className="text-rose-300" />
                  <span>Teknisi Servis &amp; Perbaikan</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Package size={14} weight="fill" className="text-amber-300" />
                  <span>Suku Cadang Resmi Merchant</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <ChatCircleDots size={15} weight="duotone" className="text-sky-300" />
                  <span>Diagnosa AI &amp; Garansi Digital</span>
                </span>
              </div>
            </div>

            {/* Kolom Kanan: Ilustrasi Vektor Animasi Teknisi Unik */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <HeroTechnicianIllustration />
            </div>
          </div>
        </section>

        {/* =================================================================
            2. CARA KERJA AMAN (4 LANGKAH)
           ================================================================= */}
        <AnimatedServiceJourney />

        {/* =================================================================
            4. BENTO GRID INTERAKTIF: FITUR LENGKAP PELANGGAN
           ================================================================= */}
        <CustomerFeaturesBento />

        {/* =================================================================
            5. UJI COBA DIAGNOSA AI SERVIO (INTERAKTIF + VECTOR BOT MASCOT)
           ================================================================= */}
        <AiDiagnosticSandbox services={services} />

        {/* =================================================================
            6. KATALOG UNGGULAN: JASA TEKNISI & SUKU CADANG RESMI (INTERAKTIF)
           ================================================================= */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary font-heading">
                Eksplorasi Resmi Servio
              </span>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-display font-extrabold text-neutral-dark mt-0.5">
                Katalog Jasa Teknisi &amp; Suku Cadang Terkurasi
              </h2>
              <p className="text-xs sm:text-sm text-neutral-slate mt-0.5">
                Pilih bidang perbaikan profesional atau temukan suku cadang resmi bergaransi dari merchant terverifikasi.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Toggle Jasa vs Produk */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCategoryTab("JASA")}
                  className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    categoryTab === "JASA"
                      ? "bg-white text-primary shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Wrench size={14} weight={categoryTab === "JASA" ? "fill" : "regular"} />
                  <span>Jasa Teknisi ({services.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTab("PRODUK")}
                  className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    categoryTab === "PRODUK"
                      ? "bg-white text-primary shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Package size={14} weight={categoryTab === "PRODUK" ? "fill" : "regular"} />
                  <span>Suku Cadang Resmi</span>
                </button>
              </div>

              <Link
                href={categoryTab === "JASA" ? "/services" : "/products"}
                className="text-xs sm:text-sm font-bold text-primary hover:text-primary-dark flex items-center gap-1 shrink-0"
              >
                <span>Semua {categoryTab === "JASA" ? "Layanan Jasa" : "Suku Cadang"}</span>
                <CaretRight size={16} weight="bold" />
              </Link>
            </div>
          </div>

          {/* Quick Domain Categories */}
          {isLoadingCategories ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-slate-50 flex flex-col items-center text-center animate-pulse border border-slate-200/80 space-y-2"
                >
                  <div className="w-10 h-10 rounded-2xl bg-slate-200" />
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                  <div className="h-2 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : displayedCategories.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
              <p className="text-xs font-bold text-neutral-dark">
                Belum ada kategori {categoryTab === "JASA" ? "layanan jasa" : "suku cadang"} aktif
              </p>
              <p className="text-[11px] text-neutral-slate">
                Data kategori dari database sedang tidak tersedia saat ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {displayedCategories.map((domain) => {
                const Icon = domain.icon;
                return (
                  <Link
                    key={domain.id}
                    href={domain.href}
                    className="bg-slate-50/60 hover:bg-white p-3 rounded-2xl flex flex-col items-center text-center cursor-pointer group border border-slate-200/80 hover:border-primary/40 hover:shadow-xs hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky/70 text-primary group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center mb-2">
                      <Icon size={22} weight="duotone" />
                    </div>
                    <h3 className="font-display font-bold text-xs text-neutral-dark group-hover:text-primary transition-colors line-clamp-1">
                      {domain.label}
                    </h3>
                    <span className="text-[10px] text-neutral-muted mt-0.5">
                      {categoryTab === "JASA" ? "Pilih Layanan" : "Lihat Suku Cadang"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Tab Content: JASA vs PRODUK */}
          {categoryTab === "JASA" ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Rekomendasi Teknisi Terdekat di Kota Anda</span>
                <Link href="/services" className="text-primary hover:underline font-bold inline-flex items-center gap-1">
                  Lihat Semua ({services.length}) Jasa <ArrowRight size={12} weight="bold" />
                </Link>
              </div>

              {loadingServices ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />
                  ))}
                </div>
              ) : featuredServices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {featuredServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={toCardData(service)}
                      onBook={(id: string) => router.push(`/services/${id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500">
                  Belum ada penawaran layanan jasa yang ditayangkan saat ini.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Suku Cadang &amp; Perkakas Resmi Merchant Terverifikasi</span>
                <Link href="/products" className="text-primary hover:underline font-bold inline-flex items-center gap-1">
                  Katalog Lengkap <ArrowRight size={12} weight="bold" />
                </Link>
              </div>

          {isLoadingProducts ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-68 rounded-2xl bg-white border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredProducts.map((p) => {
                const totalStock =
                  p.totalStock ?? p.variants?.reduce((acc, v) => acc + (v.stock || 0), 0) ?? 0;
                const isOutOfStock = totalStock <= 0;
                const mediaSrc = getProductMediaUrl(p.media);

                // Rating Gabungan Produk & Toko
                const mId = p.merchantOrganizationId || p.merchantId || p.merchant?.id;
                const mRating = mId ? merchantRatings[mId] : null;
                const mAvg = mRating?.average_rating ?? p.merchantRating ?? 0;
                const mTotal = mRating?.total_reviews ?? p.merchantReviewCount ?? 0;

                const prodR = productRatings[p.productId];
                const pAvg = prodR?.average_rating ?? p.rating ?? 0;
                const pTotal = prodR?.total_reviews ?? p.reviewCount ?? 0;

                let combinedAvg: number | null = null;
                if (pTotal > 0 && pAvg > 0 && mTotal > 0 && mAvg > 0) {
                  combinedAvg = (pAvg + mAvg) / 2;
                } else if (pTotal > 0 && pAvg > 0) {
                  combinedAvg = pAvg;
                } else if (mTotal > 0 && mAvg > 0) {
                  combinedAvg = mAvg;
                }
                const reviewCount = pTotal > 0 ? pTotal : mTotal;

                const distanceStr = getStoreDistance({
                  city: p.merchant?.city || p.merchantCity || "Jakarta Pusat",
                  latitude: p.merchant?.latitude,
                  longitude: p.merchant?.longitude,
                  name: p.merchantName || p.merchant?.name,
                  id: p.merchantOrganizationId || p.merchant?.id,
                });

                return (
                  <div
                    key={p.productId}
                    className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:shadow-servio-md hover:border-primary/30 transition-all duration-200 flex flex-col justify-between text-left group"
                  >
                    <Link
                      href={`/products/${p.productId}`}
                      className="relative h-38 bg-slate-50/90 p-3 flex flex-col justify-between border-b border-slate-100 block"
                    >
                      <div className="flex items-center justify-between z-10 gap-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 truncate">
                          {liveProductCategories.find((c) => c.id === p.categoryId)?.name ||
                            p.categoryName ||
                            "Suku Cadang"}
                        </span>
                        {isOutOfStock ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 shrink-0">
                            Habis
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5 shrink-0">
                            <CheckCircle size={12} weight="fill" /> Siap
                          </span>
                        )}
                      </div>

                      {mediaSrc && !failedProductImages[p.productId] ? (
                        <div className="absolute inset-0 overflow-hidden">
                          <Image
                            src={mediaSrc}
                            alt={p.name}
                            fill
                            unoptimized
                            sizes="(max-width: 768px) 50vw, 25vw"
                            onError={() =>
                              setFailedProductImages((prev) => ({
                                ...prev,
                                [p.productId]: true,
                              }))
                            }
                            className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-25 group-hover:scale-105 transition-transform duration-300">
                          <Package size={48} weight="duotone" className="text-primary" />
                        </div>
                      )}

                      <div className="z-10 text-[10px] text-slate-400 truncate">
                        {p.brandName || "OEM / Original"}
                      </div>
                    </Link>

                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 truncate max-w-[130px]">
                            <Storefront size={11} weight="bold" />
                            <span className="truncate">{p.merchantName || "Toko Mitra"}</span>
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                            <MapPin size={10} weight="fill" />
                            <span>{distanceStr}</span>
                          </span>
                        </div>

                        <Link href={`/products/${p.productId}`}>
                          <h3 className="text-xs font-bold text-neutral-dark group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                            {p.name}
                          </h3>
                        </Link>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[10px] text-slate-400">
                            {p.variantCount || p.variants?.length || 1} Varian
                          </span>
                          {combinedAvg !== null ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                              <Star size={11} weight="fill" className="text-amber-400" />
                              <span>{combinedAvg.toFixed(1)}</span>
                              <span className="text-slate-400 font-normal">({reviewCount})</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Produk Terkurasi</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">Harga Resmi</p>
                          <p className="text-xs sm:text-sm font-bold text-primary leading-tight">
                            {p.priceRangeFormatted ||
                              p.priceDisplay ||
                              (p.minPrice !== undefined &&
                              p.maxPrice !== undefined &&
                              p.minPrice !== p.maxPrice
                                ? `Rp${p.minPrice.toLocaleString("id-ID")} - Rp${p.maxPrice.toLocaleString("id-ID")}`
                                : p.minPrice
                                ? `Rp${p.minPrice.toLocaleString("id-ID")}`
                                : "Lihat Detail")}
                          </p>
                        </div>

                        <Link
                          href={`/products/${p.productId}`}
                          className="p-2 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-primary group-hover:text-white transition-colors"
                          title="Lihat Detail Produk"
                        >
                          <ArrowRight size={14} weight="bold" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500">
              Belum ada produk suku cadang yang ditayangkan saat ini.
            </div>
          )}
            </div>
          )}
        </section>

        {/* =================================================================
            7. DUAL CTA (PELANGGAN vs MITRA)
           ================================================================= */}
        {isPublicGuest && (
          <section className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CTA Kiri: Pelanggan */}
              <div className="rounded-2xl bg-[#0F4C81] text-white p-5 sm:p-6 shadow-servio-md flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-200">
                    <UserPlus size={16} weight="duotone" />
                    <span>Untuk Pemilik Rumah &amp; Kendaraan</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-display font-extrabold">
                    Siap Servis &amp; Belanja Tanpa Rasa Khawatir?
                  </h3>
                  <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed">
                    Daftar gratis dalam hitungan detik untuk booking teknisi, menikmati saldo S-Pay, dan mengelola seluruh garansi digital Anda.
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href="/register"
                    className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs sm:text-sm font-bold shadow-xs transition-colors inline-flex items-center gap-2"
                  >
                    <span>Daftar Pelanggan Gratis</span>
                    <ArrowRight size={15} weight="bold" />
                  </Link>
                  <Link
                    href="/login"
                    className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold transition-colors"
                  >
                    Masuk Akun
                  </Link>
                </div>
              </div>

              {/* CTA Kanan: Mitra Bisnis */}
              <div className="rounded-2xl bg-white border border-slate-200/90 text-neutral-dark p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    <Handshake size={16} weight="duotone" />
                    <span>Kemitraan Servio</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-display font-extrabold">
                    Punya Bengkel, Jasa Teknisi, atau Toko Sparepart?
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
                    Bergabunglah sebagai Mitra Provider Jasa, Merchant Toko Suku Cadang, atau Supplier B2B dan jangkau ribuan pelanggan terverifikasi.
                  </p>
                </div>
                <div>
                  <Link
                    href="/registration"
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold shadow-xs transition-colors inline-flex items-center gap-2"
                  >
                    <span>Gabung Jadi Mitra Servio</span>
                    <ArrowRight size={15} weight="bold" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </GuestBackdropCanvas>
  );
}
