"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Storefront,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ShieldCheck,
  MagnifyingGlass,
  MapPin,
  Clock,
  SquaresFour,
  Tag,
  ShareNetwork,
  ChatCircleDots,
  Check,
  Wrench,
  ArrowsDownUp,
  Sparkle,
  CalendarCheck,
  HouseLine,
} from "@phosphor-icons/react";
import { publicCatalogApi, taxonomyApi, OFFICIAL_CITIES } from "@/lib/servioApi";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";
import { useActiveLocation } from "@/context/LocationContext";
import { CATEGORY_ICON_MAP } from "@/config/navigation";

interface ProviderPublicProfile {
  organization_id: string;
  store_name?: string;
  display_name?: string;
  legal_name?: string;
  logo_url?: string | null;
  office_city?: string | null;
  city?: string | null;
  province?: string | null;
  district?: string | null;
  postal_code?: string | null;
  street_address?: string | null;
  address?: any;
  operational_hours?: any;
  service_area?: any;
  is_verified?: boolean;
}

interface CategoryMeta {
  id: string;
  name: string;
  icon_name?: string;
  description?: string;
}

interface ProviderCatalogService {
  id: string;
  display_name: string;
  primary_media?: { id: string; url: string } | null;
  pricing?: {
    model: string;
    min_price_idr: number | null;
    max_price_idr: number | null;
    currency?: string;
  };
  survey_summary?: {
    available: boolean;
    fee_model: string;
    fee_idr: number | null;
  };
  duration?: {
    min: number;
    max: number;
    unit: string;
  };
  category?: {
    id: string;
    name: string;
  };
  subcategory?: {
    id: string;
    name: string;
  };
  description?: string;
  status?: string;
}

export default function ProviderStorefrontPage() {
  const params = useParams();
  const router = useRouter();
  const providerId = (params?.providerId as string) || "";
  const { location: activeLocation, getStoreDistance } = useActiveLocation();

  const [profile, setProfile] = useState<ProviderPublicProfile | null>(null);
  const [services, setServices] = useState<ProviderCatalogService[]>([]);
  const [categoryDict, setCategoryDict] = useState<Record<string, string>>({});
  const [categoryMeta, setCategoryMeta] = useState<Record<string, CategoryMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("ALL");
  const [onlyActive, setOnlyActive] = useState(false);
  const [sortBy, setSortBy] = useState<"featured" | "price_asc" | "price_desc">("featured");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const loadStorefront = useCallback(async () => {
    if (!providerId) return;
    try {
      setLoading(true);
      setError(null);
      const [res, catRes, subRes] = await Promise.all([
        publicCatalogApi.getStorefront(providerId).catch(() => null),
        taxonomyApi.getCategories({ master: "JASA", status: "ACTIVE" }).catch(() => null),
        taxonomyApi.getSubcategories({ master: "JASA", status: "ACTIVE" }).catch(() => null),
      ]);

      const dict: Record<string, string> = {};
      const metaMap: Record<string, CategoryMeta> = {};
      if (catRes && Array.isArray(catRes.data)) {
        catRes.data.forEach((c: any) => {
          if (c.id && c.name) {
            dict[c.id] = c.name;
            metaMap[c.id] = {
              id: c.id,
              name: c.name,
              icon_name: c.icon_name,
              description: c.description,
            };
          }
        });
      }
      setCategoryDict(dict);
      setCategoryMeta(metaMap);

      const subCatMap: Record<string, { categoryId: string; categoryName: string; name: string }> = {};
      if (subRes && Array.isArray(subRes.data)) {
        subRes.data.forEach((s: any) => {
          if (s.id) {
            subCatMap[s.id] = {
              categoryId: s.category_id || s.categoryId,
              categoryName: s.category_name || s.categoryName || dict[s.category_id] || "",
              name: s.name,
            };
          }
        });
      }

      if (res?.data) {
        setProfile(res.data.provider_public_profile || null);
        const rawItems = Array.isArray(res.data.items) ? res.data.items : [];
        const enrichedItems = rawItems.map((item: any) => {
          const rawCid = item.category?.id || item.categoryId || item.category_id || "";
          const subInfo = item.subcategory?.id ? subCatMap[item.subcategory.id] : null;
          const cid = rawCid || subInfo?.categoryId || "uncategorized";

          // Resolve canonical category name taken from Category Taxonomy Service
          const resolvedCatName =
            dict[cid] ||
            subInfo?.categoryName ||
            (item.category?.name && item.category.name !== "Kategori Jasa" && item.category.name !== "Layanan Jasa" ? item.category.name : null) ||
            dict[rawCid] ||
            "Layanan Jasa";

          return {
            ...item,
            category: {
              id: cid,
              name: resolvedCatName,
            },
          };
        });
        setServices(enrichedItems);
      } else {
        setError("Profil etalase toko penyedia jasa ini belum tersedia atau sedang dinonaktifkan.");
      }
    } catch (err: unknown) {
      const e = err as any;
      setError(e.message || "Gagal memuat profil etalase toko penyedia jasa.");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    loadStorefront();
  }, [loadStorefront]);

  // Extract unique categories present in this provider's catalog
  const storeCategories = useMemo(() => {
    const catMap = new Map<string, { id: string; name: string; count: number; icon_name?: string }>();
    services.forEach((s) => {
      const cid = s.category?.id || "uncategorized";
      const resolvedName =
        categoryDict[cid] ||
        (s.category?.name && s.category.name !== "Kategori Jasa" && s.category.name !== "Layanan Jasa" ? s.category.name : null) ||
        "Layanan Jasa";

      const iconName = categoryMeta[cid]?.icon_name;
      const current = catMap.get(cid);
      if (current) {
        current.count += 1;
      } else {
        catMap.set(cid, {
          id: cid,
          name: resolvedName,
          count: 1,
          icon_name: iconName,
        });
      }
    });
    return Array.from(catMap.values());
  }, [services, categoryDict, categoryMeta]);

  // Filter & sort services
  const filteredServices = useMemo(() => {
    let result = services.filter((s) => {
      if (activeCategoryTab !== "ALL" && s.category?.id !== activeCategoryTab) {
        return false;
      }
      if (onlyActive && s.status && s.status !== "ACTIVE") {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.display_name.toLowerCase().includes(q) ||
        (s.subcategory?.name && s.subcategory.name.toLowerCase().includes(q)) ||
        (s.category?.name && s.category.name.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
      );
    });

    if (sortBy === "price_asc") {
      result.sort((a, b) => (a.pricing?.min_price_idr || 0) - (b.pricing?.min_price_idr || 0));
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => (b.pricing?.max_price_idr || b.pricing?.min_price_idr || 0) - (a.pricing?.max_price_idr || a.pricing?.min_price_idr || 0));
    }

    return result;
  }, [services, activeCategoryTab, onlyActive, searchQuery, sortBy]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const storeName =
    (profile?.store_name && profile.store_name !== "Penyedia Jasa" ? profile.store_name : null) ||
    (profile?.display_name && profile.display_name !== "Penyedia Jasa" ? profile.display_name : null) ||
    profile?.legal_name ||
    "PT Servio Mandiri Teknik";
  const city = profile?.city || profile?.office_city || "Kota Jakarta Timur";

  // Build full address string
  const streetAddress = profile?.street_address || (profile?.address && typeof profile.address === "object" ? profile.address.street_address || profile.address.address : null) || "Jl. Kebon Jeruk Raya No. 88, Ciracas";
  const district = profile?.district || (profile?.address && typeof profile.address === "object" ? profile.address.district : null) || "Ciracas";
  const fullAddressStr = `${streetAddress}, ${district}, ${city}${profile?.province ? `, ${profile.province}` : ""}${profile?.postal_code ? ` ${profile.postal_code}` : ""}`;

  // Operational hours string
  const opHoursObj = profile?.operational_hours;
  const opHoursStr =
    opHoursObj && typeof opHoursObj === "object" && opHoursObj.work_days
      ? `${opHoursObj.work_days}: ${opHoursObj.open_time || "08:00"} – ${opHoursObj.close_time || "18:00"} WIB`
      : "Senin – Sabtu: 08:00 – 18:00 WIB";

  // Distance string from GPS
  const distanceStr = getStoreDistance({
    city: activeLocation?.city,
    latitude: activeLocation?.latitude,
    longitude: activeLocation?.longitude,
    name: storeName,
    id: providerId,
  });

  if (loading) {
    return (
      <div className="min-h-[75vh] bg-white flex flex-col items-center justify-center p-8 text-center font-body">
        <div className="w-16 h-16 rounded-3xl bg-sky-50 text-[#0F4C81] flex items-center justify-center mb-4 animate-pulse shadow-xs">
          <Storefront size={36} weight="duotone" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 font-display">Menghubungkan Etalase Toko Penyedia Jasa...</h3>
        <p className="text-xs text-slate-400 mt-1">Mengambil data katalog layanan resmi, profil &amp; verifikasi toko...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[75vh] bg-white flex flex-col items-center justify-center p-8 text-center font-body">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
          <Storefront size={36} weight="duotone" />
        </div>
        <h2 className="text-base font-bold text-slate-900 font-display">Etalase Toko Tidak Tersedia</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
          {error || "Profil publik untuk mitra penyedia jasa ini belum dapat ditampilkan sesuai kebijakan publikasi data."}
        </p>
        <Link
          href="/services"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0B3860] transition shadow-xs"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Kembali ke Katalog Layanan</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:min-h-0 lg:h-screen flex flex-col overflow-hidden bg-slate-50/50 font-body">
      {/* ========================================================================= */}
      {/* 1 & 2. HERO BANNER PERSIS DETAIL TOKO MERCHANT (DARK NAVY GRADIENT)       */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0A3359] to-[#0F4C81] text-white relative shrink-0 border-b border-slate-800/80 shadow-md">
        {/* Breadcrumb Navigation Directly Beneath Navbar */}
        <div className="border-b border-white/10 bg-black/15 backdrop-blur-xs">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-xs font-semibold text-sky-200 hover:text-white transition group"
            >
              <ArrowLeft size={15} weight="bold" className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Kembali ke Katalog Layanan Utama</span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                <ShieldCheck size={14} weight="fill" className="text-emerald-400" />
                <span>Mitra Resmi Terverifikasi</span>
              </span>
              <span className="text-[11px] font-mono text-sky-200/90 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/15">
                ID Toko: {providerId.slice(0, 14)}...
              </span>
            </div>
          </div>
        </div>

        {/* Store Hero Banner Content */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
            {/* Storefront Identity */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg shrink-0 relative">
                <Storefront size={34} weight="duotone" className="text-sky-200" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs border-2 border-slate-900">
                  <Check size={11} weight="bold" />
                </span>
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white font-display tracking-tight leading-tight">
                    {storeName}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                    <CheckCircle size={13} weight="fill" />
                    <span>Mitra Terverifikasi</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-400/20 text-sky-200 border border-sky-300/30 text-xs font-bold">
                    <ShieldCheck size={13} weight="fill" />
                    <span>Layanan Resmi Terstandarisasi</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                  <span className="flex items-center gap-1.5 text-slate-200">
                    <MapPin size={14} className="text-sky-300 shrink-0" />
                    <span>{city}</span>
                    {distanceStr && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        📍 {distanceStr}
                      </span>
                    )}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                    <span>Buka • Siap Melayani Hari Ini</span>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 text-slate-200">
                    <HouseLine size={14} className="text-sky-300" />
                    <span>Home Service &amp; Workshop</span>
                  </span>
                  <span>&bull;</span>
                  <span className="font-bold text-sky-200">
                    {services.length} Layanan Tersedia
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics & Action Buttons */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Escrow Assurance Metric */}
              <div className="bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-2 rounded-2xl text-center shrink-0">
                <div className="text-xs font-black text-sky-200 font-display flex items-center justify-center gap-1">
                  <ShieldCheck size={15} weight="fill" className="text-emerald-400" />
                  <span>100% Aman</span>
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">SERVIO Escrow</div>
              </div>

              {/* Verified Badge */}
              <div className="hidden sm:block bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-2 rounded-2xl text-center shrink-0">
                <div className="text-xs font-black text-emerald-300 font-display flex items-center justify-center gap-1">
                  <CheckCircle size={15} weight="fill" className="text-emerald-400" />
                  <span>Teknisi Uji</span>
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">SOP Resmi</div>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-xs"
                title="Salin tautan toko"
              >
                {copiedLink ? (
                  <>
                    <Check size={14} weight="bold" className="text-emerald-400" />
                    <span className="text-emerald-300">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <ShareNetwork size={14} weight="bold" />
                    <span>Bagikan Toko</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-md shadow-emerald-950/30"
              >
                <ChatCircleDots size={14} weight="bold" />
                <span>Hubungi Toko</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN STOREFRONT WORKSPACE (LEFT FIXED SIDEBAR + SCROLLABLE SERVICES)   */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 gap-6 min-h-0">
        {/* LEFT COLUMN: Categories & Store Information */}
        <div className="lg:w-80 shrink-0 lg:h-full lg:overflow-y-auto space-y-4 pr-1 custom-scrollbar">
          {/* Kategori Etalase Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Tag size={16} weight="bold" className="text-[#0F4C81]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Kategori Etalase</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">{storeCategories.length} Kategori</span>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setActiveCategoryTab("ALL")}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                  activeCategoryTab === "ALL"
                    ? "bg-[#0F4C81] text-white shadow-xs font-bold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <SquaresFour size={15} weight="bold" />
                  <span>Semua Layanan</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeCategoryTab === "ALL" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {services.length}
                </span>
              </button>

              {storeCategories.map((cat) => {
                const isActive = activeCategoryTab === cat.id;
                const IconComp = CATEGORY_ICON_MAP[cat.icon_name || ""] || Tag;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryTab(cat.id)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                      isActive
                        ? "bg-[#0F4C81] text-white shadow-xs font-bold"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <IconComp size={15} weight="bold" className={isActive ? "text-white" : "text-[#0F4C81]"} />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Only Filter */}
            <div className="pt-2.5 border-t border-slate-100">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
                  Hanya Layanan Aktif
                </span>
                <input
                  type="checkbox"
                  checked={onlyActive}
                  onChange={(e) => setOnlyActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0F4C81] focus:ring-[#0F4C81] cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Store Information & Trust Badges Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3.5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Storefront size={16} weight="bold" className="text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Informasi &amp; Jaminan Toko</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 text-xs">Lokasi Kantor &amp; Workshop</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {fullAddressStr}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 text-xs">Jam Layanan &amp; Operasional</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {opHoursStr}. Respon cepat dan penjadwalan fleksibel.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 text-xs">Standar Pengerjaan &amp; Escrow</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Pengerjaan dilakukan oleh teknisi resmi terverifikasi dengan jaminan pembayaran aman via sistem Escrow Servio.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Consultation Card */}
          <div className="bg-gradient-to-br from-blue-50 to-sky-100/70 rounded-2xl p-4 sm:p-5 border border-blue-200/70 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#0F4C81] text-white flex items-center justify-center shrink-0">
                <Wrench size={16} weight="duotone" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 font-display">Konsultasi Kendala</h4>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Ragu dengan kendala perangkat atau rincian layanan yang dibutuhkan? Teknisi kami siap membantu diagnosa awal.
            </p>
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="w-full py-2 px-3.5 rounded-xl bg-white hover:bg-slate-50 text-[#0F4C81] border border-blue-200 text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ChatCircleDots size={14} weight="bold" />
              <span>Konsultasi via Chat</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Search Toolbar & Scrollable Services Grid */}
        <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
          {/* Search Toolbar */}
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs mb-3 shrink-0 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex-1 relative">
                <MagnifyingGlass
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder={`Cari nama layanan atau kategori di ${storeName}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] focus:bg-white transition"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <ArrowsDownUp size={13} />
                  <span className="hidden sm:inline font-medium">Urutkan:</span>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 cursor-pointer"
                >
                  <option value="featured">Paling Sesuai / Rekomendasi</option>
                  <option value="price_asc">Harga Terendah</option>
                  <option value="price_desc">Harga Tertinggi</option>
                </select>
              </div>
            </div>

            {/* Status counter & reset */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-700">
                Menampilkan {filteredServices.length} dari {services.length} layanan
              </span>
              {(activeCategoryTab !== "ALL" || searchQuery || onlyActive) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategoryTab("ALL");
                    setSearchQuery("");
                    setOnlyActive(false);
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* SERVICES SCROLLABLE GRID */}
          <div className="flex-1 overflow-y-auto pr-1 pb-6 min-h-0 space-y-4 custom-scrollbar">
            {filteredServices.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center space-y-2.5">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Wrench size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 font-display">Tidak Ada Layanan Ditemukan</h3>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                    {searchQuery
                      ? `Tidak ada layanan yang cocok dengan pencarian "${searchQuery}". Coba kata kunci lain.`
                      : "Belum ada layanan aktif untuk kategori yang dipilih di etalase toko penyedia jasa ini."}
                  </p>
                </div>
              </div>
            ) : (
              /* Compact Service Cards: Identical aesthetic to Merchant Storefront */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {filteredServices.map((s) => {
                  const thumbUrl = s.primary_media?.url || null;
                  const minPrice = s.pricing?.min_price_idr || 0;
                  const maxPrice = s.pricing?.max_price_idr || minPrice;
                  const isRange = maxPrice > minPrice;
                  const feeIdr = s.survey_summary?.fee_idr;
                  const isFreeSurvey = s.survey_summary?.fee_model === "FREE" || (feeIdr !== undefined && feeIdr !== null && feeIdr === 0);
                  const hasPaidSurvey = typeof feeIdr === "number" && feeIdr > 0;

                  const durationMin = s.duration?.min ?? 1;
                  const durationMax = s.duration?.max ?? 2;
                  const durationUnit = s.duration?.unit === "MINUTE" ? "Menit" : "Jam";
                  const durationLabel = durationMin !== durationMax ? `${durationMin} - ${durationMax} ${durationUnit}` : `${durationMin} ${durationUnit}`;

                  return (
                    <div
                      key={s.id}
                      className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs hover:shadow-md hover:border-[#0F4C81]/40 transition-all flex flex-col justify-between group text-left"
                    >
                      {/* Image Thumbnail Box */}
                      <div className="h-36 w-full bg-slate-100 relative flex items-center justify-center border-b border-slate-100 overflow-hidden shrink-0">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={s.display_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}

                        {/* Fallback illustration */}
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-slate-200/60 flex items-center justify-center text-[#0F4C81] group-hover:scale-105 transition-transform">
                          <Wrench size={24} weight="duotone" />
                        </div>

                        {/* Top Category Badge */}
                        <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-slate-700 border border-slate-200/80 shadow-2xs truncate max-w-[140px]">
                          {s.subcategory?.name || s.category?.name || "Layanan Jasa"}
                        </span>

                        {/* Survey Fee Badge Bottom Left */}
                        <div className="absolute bottom-2 left-2">
                          {isFreeSurvey ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                              <CheckCircle size={11} weight="fill" className="text-emerald-600" />
                              <span>Gratis Survei</span>
                            </span>
                          ) : hasPaidSurvey && typeof feeIdr === "number" ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-900 bg-sky-50/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-sky-300 shadow-2xs">
                              <span>Survei: {formatRupiah(feeIdr)}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Service Details Area */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold gap-1">
                            <span className="flex items-center gap-1 text-slate-600">
                              <Clock size={12} className="text-slate-400" />
                              <span>Pengerjaan: {durationLabel}</span>
                            </span>
                            <span className="text-emerald-700 font-bold flex items-center gap-0.5 shrink-0">
                              <ShieldCheck size={12} weight="fill" />
                              <span>Terstandarisasi</span>
                            </span>
                          </div>

                          <Link
                            href={`/services/${s.id}`}
                            className="text-xs font-bold text-slate-800 line-clamp-2 hover:text-[#0F4C81] transition font-display leading-snug block"
                          >
                            {s.display_name}
                          </Link>
                        </div>

                        {/* Price & Action Button */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                              {isRange ? "Rentang Biaya" : "Mulai Dari"}
                            </span>
                            <span className="text-[11px] sm:text-xs font-bold text-[#0F4C81] font-display whitespace-nowrap block">
                              {isRange
                                ? `${formatRupiah(minPrice)} – ${formatRupiah(maxPrice)}`
                                : formatRupiah(minPrice)}
                            </span>
                          </div>

                          <Link
                            href={`/services/${s.id}`}
                            className="py-1.5 px-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-[11px] font-bold transition flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer active:scale-95"
                          >
                            <span>Detail Layanan</span>
                            <ArrowRight size={12} weight="bold" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quality & Trust Assurances (Identical to Merchant Storefront Bottom) */}
            <div className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0F4C81] flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 font-display">Diagnosa &amp; Estimasi Transparan</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Pemeriksaan kendala di awal dengan estimasi biaya transparan sebelum pengerjaan.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle size={18} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 font-display">Teknisi Terverifikasi Resmi</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Seluruh teknisi mitra telah lolos verifikasi identitas dan sertifikasi kompetensi resmi Servio.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Sparkle size={18} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 font-display">Proteksi Pembayaran Escrow</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Dana Anda aman di escrow dan hanya diteruskan setelah pekerjaan selesai dan Anda puas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CONTACT MODAL (IDENTICAL TO MERCHANT STOREFRONT)                       */}
      {/* ========================================================================= */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ChatCircleDots size={22} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">Hubungi Toko Mitra</h3>
                  <p className="text-[11px] text-slate-400">{storeName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Anda dapat menghubungi customer service resmi <b>{storeName}</b> untuk konsultasi teknis, pertanyaan ketersediaan teknisi, atau jadwal survei:
              </p>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">WhatsApp CS Mitra:</span>
                  <span className="font-bold text-emerald-700 font-mono">+62 816-3344-556</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Jam Respons Cepat:</span>
                  <span className="font-bold text-slate-800">{opHoursStr}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Lokasi Workshop:</span>
                  <span className="font-bold text-slate-800">{city}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
              <a
                href={`https://wa.me/628163344556?text=Halo%20${encodeURIComponent(storeName)},%20saya%20ingin%20konsultasi%20layanan%20jasa%20di%20etalase%20SERVIO`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-800/20"
              >
                <ChatCircleDots size={16} weight="bold" />
                <span>Buka WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
