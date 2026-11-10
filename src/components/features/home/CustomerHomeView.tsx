"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActiveRole } from "@/context/RoleContext";
import { useActiveLocation } from "@/context/LocationContext";
import { useSPay } from "@/features/spay/spay.frontend-provider";
import {
  taxonomyApi,
  productsApi,
  publicCatalogApi,
} from "@/lib/servioApi";
import { getProductMediaUrl } from "@/types/domain";
import { orderJasaApi, BackendCustomerOrder } from "@/lib/orderJasaApi";
import { orderBarangApi } from "@/lib/orderBarangApi";
import { afterSalesApi, OrderWarrantyEntitlement, CatalogRatingSummaryItem } from "@/lib/afterSalesApi";
import { ServiceCard, ServiceCardData } from "@/components/features/services/ServiceCard";
import { SPayBalanceCard } from "@/components/features/spay/SPayBalanceCard";
import { CATEGORY_ICON_MAP } from "@/config/navigation";
import {
  MagnifyingGlass,
  MapPin,
  CheckCircle,
  CircleNotch,
  NavigationArrow,
  Wrench,
  Package,
  ChatCircleDots,
  House,
  HouseLine,
  ShieldCheck,
  Headset,
  ArrowRight,
  CaretRight,
  Storefront,
  Star,
  Clock,
  ClipboardText,
  Car,
  Broom,
  GearSix,
  TreeEvergreen,
  Lightning,
  Fan,
} from "@phosphor-icons/react";

interface HomeCategoryNode {
  id: string;
  name: string;
  icon_name?: string | null;
  code?: string;
  slug?: string;
  master_code?: string;
  is_active?: boolean;
}

const CATEGORY_NAME_FALLBACK_ICONS: Record<string, React.ComponentType<any>> = {
  ac: Fan,
  pendingin: Fan,
  freon: Fan,
  elektrik: Lightning,
  listrik: Lightning,
  sanitasi: Lightning,
  kabel: Lightning,
  perkakas: Wrench,
  alat: Wrench,
  repair: Wrench,
  teknis: Wrench,
  cleaning: Broom,
  bersih: Broom,
  cuci: Broom,
  bangunan: HouseLine,
  waterproof: HouseLine,
  atap: HouseLine,
  home: HouseLine,
  rumah: HouseLine,
  otomotif: Car,
  mobil: Car,
  motor: Car,
  auto: Car,
  maintenance: GearSix,
  rawat: GearSix,
  mesin: GearSix,
  lingkungan: TreeEvergreen,
  hama: TreeEvergreen,
  taman: TreeEvergreen,
};

function resolveCategoryIcon(
  iconName?: string | null,
  categoryName?: string
): React.ComponentType<any> {
  // 1. Direct match with database icon_name in CATEGORY_ICON_MAP
  if (iconName && (CATEGORY_ICON_MAP as Record<string, any>)[iconName]) {
    return (CATEGORY_ICON_MAP as Record<string, any>)[iconName];
  }

  // 2. Keyword fallback matching based on category name
  const norm = (categoryName || "").toLowerCase();
  for (const [kw, IconComp] of Object.entries(CATEGORY_NAME_FALLBACK_ICONS)) {
    if (norm.includes(kw)) {
      return IconComp;
    }
  }

  return (CATEGORY_ICON_MAP as Record<string, any>)["Package"] || Package;
}

const DEFAULT_SERVICE_DOMAINS = [
  { id: "repair", label: "Repair & Technical", href: "/services?domain=repair", icon_name: "Wrench" },
  { id: "home", label: "Home & Building", href: "/services?domain=home", icon_name: "HouseLine" },
  { id: "cleaning", label: "Cleaning & Sanitasi", href: "/services?domain=cleaning", icon_name: "Broom" },
  { id: "maintenance", label: "Maintenance Berkala", href: "/services?domain=maintenance", icon_name: "GearSix" },
  { id: "environment", label: "Lingkungan & Hama", href: "/services?domain=environment", icon_name: "TreeEvergreen" },
  { id: "automotive", label: "Otomotif & Mobilitas", href: "/services?domain=automotive", icon_name: "Car" },
];

export function CustomerHomeView() {
  const router = useRouter();
  const { user } = useActiveRole();
  const {
    location: activeLoc,
    openLocationModal,
    detectGps,
    isDetectingGps,
    locationFeedback,
    getStoreDistance,
  } = useActiveLocation();
  const { summary: spaySummary, isBalanceVisible, toggleBalanceVisibility } = useSPay();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Live Orders state (Jasa & Barang)
  const [activeJasaOrder, setActiveJasaOrder] = useState<BackendCustomerOrder | null>(null);
  const [activeGoodsOrder, setActiveGoodsOrder] = useState<any | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // Live Warranties state
  const [activeWarranties, setActiveWarranties] = useState<OrderWarrantyEntitlement[]>([]);
  const [isLoadingWarranties, setIsLoadingWarranties] = useState(true);

  // Catalog Tab: JASA vs PRODUK
  const [catalogTab, setCatalogTab] = useState<"JASA" | "PRODUK">("JASA");
  const [liveServiceCategories, setLiveServiceCategories] = useState<HomeCategoryNode[]>([]);
  const [liveProductCategories, setLiveProductCategories] = useState<HomeCategoryNode[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [serviceRatings, setServiceRatings] = useState<Record<string, CatalogRatingSummaryItem>>({});
  const [productRatings, setProductRatings] = useState<Record<string, CatalogRatingSummaryItem>>({});
  const [merchantRatings, setMerchantRatings] = useState<Record<string, CatalogRatingSummaryItem>>({});
  const [failedProductImages, setFailedProductImages] = useState<Record<string, boolean>>({});

  // 1. Fetch real active orders from Database
  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      orderJasaApi.listCustomerOrders({ per_page: 5 }),
      orderBarangApi.customer.getOrders("processing", 1, 5),
    ]).then(([jasaRes, goodsRes]) => {
      if (!isMounted) return;

      if (jasaRes.status === "fulfilled" && Array.isArray(jasaRes.value?.data)) {
        // Find most recent active order that is not terminal
        const terminalStatuses = ["CANCELLED", "COMPLETED", "VOID"];
        const active = jasaRes.value.data.find((o) => !terminalStatuses.includes(o.status?.toUpperCase()));
        setActiveJasaOrder(active || null);
      }

      if (goodsRes.status === "fulfilled" && Array.isArray((goodsRes.value as any)?.data)) {
        const goodsList = (goodsRes.value as any).data;
        setActiveGoodsOrder(goodsList[0] || null);
      }

      setIsLoadingOrders(false);
    }).catch(() => {
      if (isMounted) setIsLoadingOrders(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch real active warranties from Database
  useEffect(() => {
    let isMounted = true;

    afterSalesApi.customer.getWarranties({ state: "active", per_page: 5 })
      .then((res) => {
        if (!isMounted) return;
        if (res.success && Array.isArray(res.data)) {
          setActiveWarranties(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingWarranties(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Fetch real Categories & Catalog (Limit 30 items)
  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      taxonomyApi.getCategories({ master_code: "JASA", status: "ACTIVE" }),
      taxonomyApi.getCategories({ master_code: "PRODUK", status: "ACTIVE" }),
      publicCatalogApi.getCatalog({ limit: "30" }),
      productsApi.list({ scope: "public", limit: 30 }),
    ]).then(([catJasaRes, catProdRes, svcRes, prodRes]) => {
      if (!isMounted) return;

      if (catJasaRes.status === "fulfilled" && Array.isArray(catJasaRes.value?.data)) {
        setLiveServiceCategories(catJasaRes.value.data as HomeCategoryNode[]);
      }
      if (catProdRes.status === "fulfilled" && Array.isArray(catProdRes.value?.data)) {
        setLiveProductCategories(catProdRes.value.data as HomeCategoryNode[]);
      }

      if (svcRes.status === "fulfilled") {
        const resVal = svcRes.value as any;
        const rawItems = Array.isArray(resVal?.data?.items)
          ? resVal.data.items
          : Array.isArray(resVal?.data)
          ? resVal.data
          : [];
        setServices(rawItems.slice(0, 30));
      }

      if (prodRes.status === "fulfilled" && Array.isArray(prodRes.value?.data)) {
        setProducts(prodRes.value.data.slice(0, 30));
      }

      setIsLoadingCatalog(false);
    }).catch(() => {
      if (isMounted) setIsLoadingCatalog(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Enrich ratings from database
  useEffect(() => {
    if (services.length === 0 && products.length === 0) return;

    const sIds = services.map((s) => s.id).filter(Boolean);
    const pIds = products.map((p) => p.productId).filter(Boolean);

    if (sIds.length > 0) {
      afterSalesApi.public.getBatchRatingsSummary("SERVICE", sIds)
        .then((res) => {
          if (res.success && res.data) {
            setServiceRatings(res.data);
          }
        })
        .catch(() => {});
    }

    if (pIds.length > 0) {
      afterSalesApi.public.getBatchRatingsSummary("PRODUCT", pIds)
        .then((res) => {
          if (res.success && res.data) {
            setProductRatings(res.data);
          }
        })
        .catch(() => {});

      const mIds = Array.from(
        new Set(
          products
            .map((p) => p.merchantOrganizationId || p.merchantId || p.merchant?.id)
            .filter(Boolean) as string[]
        )
      );
      if (mIds.length > 0) {
        afterSalesApi.public.getBatchRatingsSummary("MERCHANT", mIds)
          .then((res) => {
            if (res.success && res.data) {
              setMerchantRatings(res.data);
            }
          })
          .catch(() => {});
      }
    }
  }, [services, products]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const activeServiceDomains = useMemo(() => {
    if (liveServiceCategories.length > 0) {
      return liveServiceCategories.map((c) => {
        const Icon = resolveCategoryIcon(c.icon_name, c.name);
        return {
          id: c.id,
          label: c.name,
          href: `/services?categories=${encodeURIComponent(c.id)}`,
          icon: Icon,
          badgeText: "Cari Servis",
        };
      });
    }
    return DEFAULT_SERVICE_DOMAINS.map((domain) => {
      const Icon = resolveCategoryIcon(domain.icon_name, domain.label);
      return { ...domain, icon: Icon, badgeText: "Cari Servis" };
    });
  }, [liveServiceCategories]);

  const activeProductDomains = useMemo(() => {
    if (liveProductCategories.length > 0) {
      return liveProductCategories.map((c) => {
        const Icon = resolveCategoryIcon(c.icon_name, c.name);
        return {
          id: c.id,
          label: c.name,
          href: `/products?categoryId=${encodeURIComponent(c.id)}`,
          icon: Icon,
          badgeText: "Cari Sparepart",
        };
      });
    }
    return DEFAULT_SERVICE_DOMAINS.map((domain) => ({
      ...domain,
      href: `/products?domain=${domain.id}`,
      icon: resolveCategoryIcon(domain.icon_name, domain.label),
      badgeText: "Cari Sparepart",
    }));
  }, [liveProductCategories]);

  const displayedCategories =
    catalogTab === "JASA" ? activeServiceDomains : activeProductDomains;

  // Convert service to ServiceCardData
  const toCardData = (s: any): ServiceCardData => {
    const svcR = serviceRatings[s.id];
    const minPrice = s.pricing?.min_price_idr ?? s.priceMin ?? s.basePrice ?? 0;
    const maxPrice = s.pricing?.max_price_idr ?? s.priceMax ?? minPrice;

    return {
      id: s.id,
      title: s.display_name || s.name || s.title || "Layanan Jasa",
      category: s.category?.name || s.categoryName || "Layanan",
      price: minPrice,
      priceMin: minPrice,
      priceMax: maxPrice,
      pricingModel: s.pricing?.model || s.pricingModel || "RANGE",
      providerName: s.provider?.store_name || s.providerName || "Penyedia Jasa",
      providerId: s.provider?.organization_id || s.providerId,
      isVerifiedProvider: true,
      thumbnailUrl: s.thumbnailUrl,
      description: s.description || "",
      surveyFee: s.survey_summary?.fee_idr ?? s.surveyFee ?? 0,
      surveyFeeModel: s.survey_summary?.fee_model ?? "PAID",
      durationMin: s.duration?.min ?? 1,
      durationMax: s.duration?.max ?? 2,
      durationUnit: s.duration?.unit ?? "jam",
      warrantyDays: s.warrantyDays || 30,
      warrantyEnabled: true,
      rating: svcR?.average_rating ?? s.rating ?? 0,
      reviewCount: svcR?.total_reviews ?? s.reviewCount ?? 0,
      providerRating: s.providerRating ?? 5,
      providerReviewCount: s.providerReviewCount ?? 0,
    };
  };

  const userName = user?.name || user?.email?.split("@")[0] || "Pelanggan";
  const primaryWarranty = activeWarranties[0];
  const [remainingWarrantyDays, setRemainingWarrantyDays] = useState<number | null>(null);

  useEffect(() => {
    if (!primaryWarranty?.expires_at) return;
    const exp = new Date(primaryWarranty.expires_at).getTime();
    const diff = Math.max(0, Math.ceil((exp - Date.now()) / (1000 * 60 * 60 * 24)));
    const timer = setTimeout(() => setRemainingWarrantyDays(diff), 0);
    return () => clearTimeout(timer);
  }, [primaryWarranty]);

  return (
    <div className="w-full bg-white min-h-screen">
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-16 space-y-8">
        {/* =================================================================
            1. HEADER PERSONAL PELANGGAN (WELCOME BAR & LOKASI AKTIF)
           ================================================================= */}
        <section
          className="relative overflow-hidden rounded-3xl text-white p-5 sm:p-7 lg:p-8 shadow-servio-md"
          style={{
            backgroundImage: [
              "radial-gradient(circle at 88% 12%, rgba(244, 63, 94, 0.20) 0%, transparent 40%)",
              "radial-gradient(circle at 12% 92%, rgba(56, 189, 248, 0.18) 0%, transparent 45%)",
              "linear-gradient(135deg, #0F4C81 0%, #155E9C 52%, #0B3860 100%)",
            ].join(", "),
          }}
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/12 text-xs font-semibold text-sky tracking-wide border border-white/15">
                <CheckCircle size={14} weight="fill" className="text-emerald-300" />
                <span>Akun Pelanggan Aktif Terverifikasi</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold tracking-tight">
                Halo, <span className="text-sky-200">{userName}</span>!
              </h1>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                Mau perbaiki fasilitas rumah, pesan suku cadang resmi, atau cek status garansi unit Anda hari ini?
              </p>

              {/* Lokasi Servis Aktif Selector */}
              <div className="pt-1 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={openLocationModal}
                  className="flex items-center gap-1.5 text-sky-light text-xs font-medium bg-white/12 hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/15 transition-colors cursor-pointer"
                  title="Klik untuk memilih kota atau ubah alamat pengiriman Anda"
                >
                  <MapPin
                    size={14}
                    weight="fill"
                    className={activeLoc.isGps ? "text-emerald-300" : "text-sky-300"}
                  />
                  <span>Lokasi Servis: <strong>{activeLoc.displayName}</strong></span>
                  <span className="text-[11px] text-sky-200 underline font-semibold ml-1">
                    Ubah
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => detectGps()}
                  disabled={isDetectingGps}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-xs active:scale-95 transition-colors disabled:opacity-70 cursor-pointer"
                >
                  {isDetectingGps ? (
                    <>
                      <CircleNotch size={13} weight="bold" className="animate-spin text-white" />
                      <span>GPS...</span>
                    </>
                  ) : activeLoc.isGps ? (
                    <>
                      <CheckCircle size={13} weight="fill" className="text-emerald-300" />
                      <span>GPS Aktif</span>
                    </>
                  ) : (
                    <>
                      <NavigationArrow size={13} weight="bold" className="text-white" />
                      <span>Deteksi GPS</span>
                    </>
                  )}
                </button>

                {locationFeedback && (
                  <span className="text-[11px] text-emerald-200 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30">
                    {locationFeedback}
                  </span>
                )}
              </div>
            </div>

            {/* Bilah Pencarian Cepat */}
            <div className="w-full md:max-w-md">
              <form onSubmit={handleSearch} className="relative">
                <div className="flex items-center shadow-servio-md rounded-2xl bg-white p-1.5 focus-within:ring-4 focus-within:ring-sky/40 transition-shadow">
                  <div className="pl-3.5 text-slate-400 flex items-center pointer-events-none">
                    <MagnifyingGlass size={20} weight="bold" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari teknisi, servis AC, montir, sparepart..."
                    className="w-full px-3 py-2 text-sm text-neutral-dark placeholder:text-slate-400 focus:outline-none rounded-xl"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
                  >
                    Cari
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* =================================================================
            2. PUSAT KONTROL STATUS & TRANSAKSI (3 KARTU UTAMA)
           ================================================================= */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-heading flex items-center gap-2">
              <ClipboardText size={17} weight="bold" className="text-primary" />
              <span>Pusat Kendali Pelanggan</span>
            </h2>
            <Link href="/orders" className="text-xs font-semibold text-primary hover:underline">
              Lihat Riwayat Pesanan &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KARTU 1: Status Pesanan Berjalan (Live Tracker) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Wrench size={16} weight="duotone" className="text-primary" />
                    <span>Pesanan Aktif</span>
                  </span>
                  {activeJasaOrder ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-primary border border-sky-200">
                      {activeJasaOrder.status?.replace(/_/g, " ")}
                    </span>
                  ) : activeGoodsOrder ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Diproses
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      Standby
                    </span>
                  )}
                </div>

                {isLoadingOrders ? (
                  <div className="space-y-2 py-2 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                ) : activeJasaOrder ? (
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <h3 className="font-bold text-xs text-neutral-dark line-clamp-1">
                      {activeJasaOrder.service_snapshot?.title || activeJasaOrder.service_snapshot?.name || "Layanan Jasa Servis"}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Order No: <strong className="font-mono text-slate-700">{activeJasaOrder.order_no}</strong>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Keluhan: &ldquo;{activeJasaOrder.complaint_text?.slice(0, 45)}...&rdquo;
                    </p>
                  </div>
                ) : activeGoodsOrder ? (
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <h3 className="font-bold text-xs text-neutral-dark line-clamp-1">
                      {activeGoodsOrder.orderNo || "Pesanan Suku Cadang"}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Total: Rp {activeGoodsOrder.totalAmount?.toLocaleString("id-ID")}
                    </p>
                  </div>
                ) : (
                  <div className="py-2.5 space-y-1">
                    <p className="text-xs text-slate-700 font-medium">
                      Tidak ada pekerjaan teknisi yang sedang berjalan.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Unit Anda dalam kondisi prima. Jadwalkan servis kapan saja Anda membutuhkan.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-3">
                {activeJasaOrder ? (
                  <Link
                    href={`/orders/${activeJasaOrder.id}`}
                    className="font-bold text-primary hover:text-primary-dark inline-flex items-center gap-1"
                  >
                    <span>Pantau Live Tracker</span>
                    <ArrowRight size={13} weight="bold" />
                  </Link>
                ) : (
                  <Link
                    href="/services"
                    className="font-bold text-primary hover:text-primary-dark inline-flex items-center gap-1"
                  >
                    <span>Panggil Teknisi Sekarang</span>
                    <ArrowRight size={13} weight="bold" />
                  </Link>
                )}
              </div>
            </div>

            {/* KARTU 2: Dompet S-Pay & Saldo Refund (Signature Brand Card) */}
            <div className="h-full flex flex-col min-h-[175px]">
              <SPayBalanceCard
                balance={spaySummary.withdrawableBalance ?? 0}
                ownerType="CUSTOMER"
                subtitle="Saldo Refund Siap Ditarik"
                detailHref="/spay"
                isBalanceVisible={isBalanceVisible}
                onToggleVisibility={toggleBalanceVisibility}
                className="h-full rounded-2xl shadow-servio-md flex flex-col justify-between"
              />
            </div>

            {/* KARTU 3: Garansi Digital Aktif */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Clock size={16} weight="duotone" className="text-indigo-600" />
                    <span>Garansi Digital Aktif</span>
                  </span>
                  {activeWarranties.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {activeWarranties.length} Unit
                    </span>
                  )}
                </div>

                {isLoadingWarranties ? (
                  <div className="space-y-2 py-2 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                ) : primaryWarranty ? (
                  <div className="space-y-1.5 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                    <h3 className="font-bold text-xs text-indigo-950 line-clamp-1">
                      {primaryWarranty.snapshot_name || "Garansi Servis Resmi"}
                    </h3>
                    <p className="text-[11px] text-indigo-900 font-semibold">
                      {remainingWarrantyDays !== null ? `Sisa ${remainingWarrantyDays} hari lagi` : "Aktif"}
                    </p>
                    <p className="text-[10px] text-indigo-700 truncate">
                      Berlaku s.d: {new Date(primaryWarranty.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                ) : (
                  <div className="py-2.5 space-y-1">
                    <p className="text-xs text-slate-700 font-medium">
                      Belum ada kartu garansi digital aktif.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Setiap pemesanan jasa &amp; suku cadang resmi otomatis bergaransi purna jual 30–90 hari.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-3">
                <Link
                  href="/warranties"
                  className="font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1"
                >
                  <span>{primaryWarranty ? "Klaim Masalah" : "Lihat Pusat Garansi"}</span>
                  <ArrowRight size={13} weight="bold" />
                </Link>
                <span className="text-[10px] text-slate-400">Garansi Transparan</span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            3. BILAH TINDAKAN CEPAT (QUICK ACTIONS GRID)
           ================================================================= */}
        <section className="space-y-3.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-heading">
            Tindakan Cepat
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link
              href="/services"
              className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/90 hover:border-primary/40 hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <Wrench size={20} weight="duotone" />
              </div>
              <span className="text-xs font-bold text-neutral-dark group-hover:text-primary transition-colors">
                Panggil Teknisi
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">AC, Listrik, dsb</span>
            </Link>

            <Link
              href="/smart-discovery"
              className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/90 hover:border-primary/40 hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-secondary text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <ChatCircleDots size={22} weight="duotone" />
              </div>
              <span className="text-xs font-bold text-neutral-dark group-hover:text-secondary transition-colors">
                Diagnosa AI
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Smart Discovery</span>
            </Link>

            <Link
              href="/products"
              className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/90 hover:border-primary/40 hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <Package size={20} weight="duotone" />
              </div>
              <span className="text-xs font-bold text-neutral-dark group-hover:text-amber-700 transition-colors">
                Beli Sparepart
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Komponen Resmi</span>
            </Link>

            <Link
              href="/orders"
              className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/90 hover:border-primary/40 hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <House size={20} weight="duotone" />
              </div>
              <span className="text-xs font-bold text-neutral-dark group-hover:text-sky-700 transition-colors">
                Aset Rumah Saya
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Daftar Perangkat</span>
            </Link>

            <Link
              href="/warranties"
              className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/90 hover:border-primary/40 hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <ShieldCheck size={20} weight="duotone" />
              </div>
              <span className="text-xs font-bold text-neutral-dark group-hover:text-indigo-700 transition-colors">
                Pusat Garansi
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Klaim Purna Jual</span>
            </Link>

            <Link
              href="/contact"
              className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/90 hover:border-primary/40 hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <Headset size={20} weight="duotone" />
              </div>
              <span className="text-xs font-bold text-neutral-dark group-hover:text-emerald-700 transition-colors">
                Bantuan 24/7
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Customer Support</span>
            </Link>
          </div>
        </section>

        {/* =================================================================
            4. KATALOG LENGKAP (BATAS 30 ITEM + TOMBOL LIHAT LAINNYA)
           ================================================================= */}
        <section className="space-y-4 pt-2">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary font-heading">
                Eksplorasi Katalog Lengkap
              </span>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-display font-extrabold text-neutral-dark mt-0.5">
                Pilihan Layanan Jasa &amp; Suku Cadang Resmi
              </h2>
              <p className="text-xs sm:text-sm text-neutral-slate mt-0.5">
                Menampilkan penawaran resmi dari penyedia jasa dan merchant toko terdaftar di platform.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Tab Selector Jasa vs Produk */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCatalogTab("JASA")}
                  className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    catalogTab === "JASA"
                      ? "bg-white text-primary shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Wrench size={14} weight={catalogTab === "JASA" ? "fill" : "regular"} />
                  <span>Jasa Teknisi ({services.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogTab("PRODUK")}
                  className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    catalogTab === "PRODUK"
                      ? "bg-white text-primary shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Package size={14} weight={catalogTab === "PRODUK" ? "fill" : "regular"} />
                  <span>Suku Cadang ({products.length})</span>
                </button>
              </div>

              <Link
                href={catalogTab === "JASA" ? "/services" : "/products"}
                className="text-xs sm:text-sm font-bold text-primary hover:text-primary-dark flex items-center gap-1 shrink-0"
              >
                <span>Lihat Seluruh {catalogTab === "JASA" ? "Jasa" : "Produk"}</span>
                <CaretRight size={16} weight="bold" />
              </Link>
            </div>
          </div>

          {/* Quick Domain Category Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {displayedCategories.map((domain) => {
              const Icon = domain.icon;
              return (
                <Link
                  key={domain.id}
                  href={domain.href}
                  className="bg-slate-50/60 hover:bg-white p-3 rounded-2xl flex flex-col items-center text-center cursor-pointer group border border-slate-200/80 hover:border-primary/40 hover:shadow-xs transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky/70 text-primary group-hover:bg-primary group-hover:text-white transition-colors flex items-center justify-center mb-1.5">
                    <Icon size={20} weight="duotone" />
                  </div>
                  <h3 className="font-display font-bold text-xs text-neutral-dark group-hover:text-primary transition-colors line-clamp-1">
                    {domain.label}
                  </h3>
                  <span className="text-[10px] text-neutral-muted mt-0.5">
                    {catalogTab === "JASA" ? "Cari Servis" : "Cari Sparepart"}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Catalog Items Display (Up to 30 items) */}
          {isLoadingCatalog ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : catalogTab === "JASA" ? (
            <div className="space-y-6 pt-2">
              {services.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={toCardData(service)}
                      onBook={(id: string) => router.push(`/services/${id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  Belum ada penawaran layanan jasa yang tersedia saat ini.
                </div>
              )}

              {/* Tombol Lihat Seluruh Katalog */}
              <div className="pt-2 flex justify-center">
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
                >
                  <span>Lihat Seluruh Katalog Layanan Jasa</span>
                  <ArrowRight size={15} weight="bold" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              {products.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {products.map((p) => {
                    const totalStock =
                      p.totalStock ?? p.variants?.reduce((acc: number, v: any) => acc + (v.stock || 0), 0) ?? 0;
                    const isOutOfStock = totalStock <= 0;
                    const mediaSrc = getProductMediaUrl(p.media);

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
                        className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs hover:shadow-servio-md hover:border-primary/30 transition-all duration-200 flex flex-col justify-between text-left group"
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
                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  Belum ada produk suku cadang yang ditayangkan saat ini.
                </div>
              )}

              {/* Tombol Lihat Seluruh Katalog */}
              <div className="pt-2 flex justify-center">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
                >
                  <span>Lihat Seluruh Katalog Suku Cadang &amp; Perkakas</span>
                  <ArrowRight size={15} weight="bold" />
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
