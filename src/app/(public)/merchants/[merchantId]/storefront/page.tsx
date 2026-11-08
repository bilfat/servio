"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Storefront,
  ArrowLeft,
  CheckCircle,
  Package,
  ShieldCheck,
  MagnifyingGlass,
  MapPin,
  Clock,
  Star,
  SquaresFour,
  Tag,
  ShareNetwork,
  ChatCircleDots,
  Truck,
  Check,
  Wrench,
  ArrowsDownUp,
  Sparkle,
} from "@phosphor-icons/react";
import { shopsApi, taxonomyApi } from "@/lib/servioApi";
import type { ApiProduct, ApiShopProfile } from "@/types/domain";
import { getProductMediaUrl } from "@/types/domain";
import { useLocation } from "@/context/LocationContext";
import {
  afterSalesApi,
  BusinessReputation,
  CatalogRatingSummaryItem,
  ReviewEntry,
} from "@/lib/afterSalesApi";

export default function MerchantStorefrontPage() {
  const params = useParams();
  const merchantId = (params?.merchantId as string) || "";
  const { activeLocation, getStoreDistance } = useLocation();

  const [shop, setShop] = useState<ApiShopProfile | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categoryDict, setCategoryDict] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("ALL");
  const [onlyReadyStock, setOnlyReadyStock] = useState(false);
  const [sortBy, setSortBy] = useState<"featured" | "price_asc" | "price_desc">("featured");
  const [copiedLink, setCopiedLink] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [merchantReputation, setMerchantReputation] = useState<BusinessReputation | null>(null);
  const [productRatings, setProductRatings] = useState<Record<string, CatalogRatingSummaryItem>>({});
  const [storefrontTab, setStorefrontTab] = useState<"PRODUCTS" | "REVIEWS">("PRODUCTS");
  const [businessReviews, setBusinessReviews] = useState<ReviewEntry[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (!merchantId) return;
    afterSalesApi.publicCatalog
      .getBusinessReputation("MERCHANT", merchantId)
      .then((res) => {
        if (res.data) setMerchantReputation(res.data);
      })
      .catch(() => {});

    setReviewsLoading(true);
    afterSalesApi.publicCatalog
      .getBusinessReviews("MERCHANT", merchantId, { per_page: 50 })
      .then((res) => {
        if (res.data) setBusinessReviews(res.data);
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [merchantId]);

  useEffect(() => {
    const ids = products.map((p) => p.productId).filter(Boolean);
    if (ids.length === 0) return;
    afterSalesApi.publicCatalog
      .getBatchRatingsSummary("PRODUCT", ids)
      .then((res) => {
        if (res.data) setProductRatings(res.data);
      })
      .catch(() => {});
  }, [products]);

  const loadStorefront = useCallback(async () => {
    if (!merchantId) return;
    try {
      setLoading(true);
      setError(null);
      const [res, catRes] = await Promise.all([
        shopsApi.get(merchantId),
        taxonomyApi.getCategories({ master: "PRODUK", status: "ACTIVE" }).catch(() => null),
      ]);

      const dict: Record<string, string> = {};
      if (catRes && Array.isArray(catRes.data)) {
        catRes.data.forEach((c: any) => {
          if (c.id && c.name) {
            dict[c.id] = c.name;
          }
        });
      }
      setCategoryDict(dict);

      if (res.data?.shop) {
        setShop(res.data.shop);
        setProducts(res.data.products || []);
      } else {
        setError("Profil etalase toko ini belum tersedia atau sedang dinonaktifkan.");
      }
    } catch (err: unknown) {
      const e = err as any;
      setError(e.message || "Gagal memuat profil etalase toko mitra.");
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    loadStorefront();
  }, [loadStorefront]);

  // Extract unique categories present in this merchant's actual catalog
  const storeCategories = useMemo(() => {
    const catMap = new Map<string, { id: string; name: string; count: number }>();
    products.forEach((p) => {
      const cid = p.categoryId || "uncategorized";
      const resolvedName = p.categoryName || (p as any).category?.name || categoryDict[cid] || "Sparepart AC & Pendingin";
      const current = catMap.get(cid);
      if (current) {
        current.count += 1;
      } else {
        catMap.set(cid, { id: cid, name: resolvedName, count: 1 });
      }
    });
    return Array.from(catMap.values());
  }, [products, categoryDict]);

  // Filter & sort products
  const filteredProducts = useMemo(() => {
    const result = products.filter((p) => {
      if (activeCategoryTab !== "ALL" && p.categoryId !== activeCategoryTab) {
        return false;
      }
      if (onlyReadyStock && (p.totalStock === undefined || p.totalStock <= 0)) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.brandName && p.brandName.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q))
      );
    });

    if (sortBy === "price_asc") {
      result.sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => (b.minPrice || 0) - (a.minPrice || 0));
    }

    return result;
  }, [products, activeCategoryTab, onlyReadyStock, searchQuery, sortBy]);

  const formattedAddress = useMemo(() => {
    if (!shop) return "";
    if (typeof shop.address === "string" && shop.address.trim()) return shop.address;
    if (shop.address && typeof shop.address === "object") {
      const addrObj = shop.address as Record<string, any>;
      if (addrObj.address) return String(addrObj.address);
      const parts = [
        addrObj.street_address || addrObj.streetAddress,
        addrObj.district_name || addrObj.district,
        addrObj.city_name || addrObj.city,
        addrObj.province_name || addrObj.province,
        addrObj.postal_code || addrObj.postalCode,
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }
    if (shop.streetAddress) {
      const parts = [shop.streetAddress, shop.district, shop.city, shop.postalCode].filter(Boolean);
      return parts.join(", ");
    }
    return "Harco Glodok Blok A No. 15, Jl. Hayam Wuruk, KOTA JAKARTA PUSAT, DKI JAKARTA 10410";
  }, [shop]);

  const formattedOperatingHours = useMemo(() => {
    if (!shop) return "Senin – Sabtu: 09:00 – 17:00 WIB";
    const op = shop.operationalHours;
    if (typeof op === "string" && op.trim()) return op;
    if (op && typeof op === "object") {
      const opObj = op as Record<string, any>;
      const days = opObj.days || "Senin – Sabtu";
      const open = opObj.open_time || opObj.openTime || "09:00";
      const close = opObj.close_time || opObj.closeTime || "17:00";
      return `${days}: ${open} – ${close} WIB`;
    }
    return "Senin – Sabtu: 09:00 – 17:00 WIB";
  }, [shop]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] bg-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-3xl bg-sky-50 text-[#0F4C81] flex items-center justify-center mb-4 animate-pulse shadow-xs">
          <Storefront size={36} weight="duotone" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 font-heading">Menghubungkan Etalase Toko Mitra SERVIO...</h3>
        <p className="text-xs text-slate-400 mt-1">Mengambil data katalog suku cadang resmi &amp; verifikasi toko...</p>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-[75vh] bg-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
          <Storefront size={36} weight="duotone" />
        </div>
        <h2 className="text-base font-bold text-slate-900 font-heading">Etalase Toko Tidak Tersedia</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
          {error || "Profil publik untuk mitra ini belum dapat ditampilkan sesuai kebijakan publikasi data."}
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0B3860] transition shadow-xs"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Kembali ke Katalog Suku Cadang</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:min-h-0 lg:h-screen flex flex-col overflow-hidden bg-slate-50/50 font-sans">
      {/* 1 & 2. Hero Banner With Integrated Top Breadcrumb */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0A3359] to-[#0F4C81] text-white relative shrink-0 border-b border-slate-800/80 shadow-md">
        {/* Breadcrumb Navigation (Dark Glass Bar Directly Beneath Navbar) */}
        <div className="border-b border-white/10 bg-black/15 backdrop-blur-xs">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-xs font-semibold text-sky-200 hover:text-white transition group"
            >
              <ArrowLeft size={15} weight="bold" className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Kembali ke Katalog Produk Utama</span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                <ShieldCheck size={14} weight="fill" className="text-emerald-400" />
                <span>Mitra Resmi Terverifikasi</span>
              </span>
              <span className="text-[11px] font-mono text-sky-200/90 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/15">
                ID Toko: {merchantId.slice(0, 14)}...
              </span>
            </div>
          </div>
        </div>

        {/* Store Hero Banner Content (Comfortable, Spacious & Rich) */}
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
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white font-heading tracking-tight leading-tight">
                    {shop.name}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                    <CheckCircle size={13} weight="fill" />
                    <span>Mitra Terverifikasi</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-400/20 text-sky-200 border border-sky-300/30 text-xs font-bold">
                    <ShieldCheck size={13} weight="fill" />
                    <span>Suku Cadang 100% Asli</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                  <span className="flex items-center gap-1.5 text-slate-200">
                    <MapPin size={14} className="text-sky-300 shrink-0" />
                    <span>{shop.city || "Jakarta Barat (Glodok)"}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      📍 {getStoreDistance(shop)}
                    </span>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                    <span>Buka • Siap Kirim Hari Ini</span>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 text-slate-200">
                    <Truck size={14} className="text-sky-300" />
                    <span>Instant &amp; Kargo</span>
                  </span>
                  <span>&bull;</span>
                  <span className="font-bold text-sky-200">
                    {products.length} Produk Tersedia
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics & Action Buttons */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Rating Metric (PUB05: Real Merchant Reputation from Backend 07) */}
              <button
                type="button"
                onClick={() => setStorefrontTab("REVIEWS")}
                className="bg-white/10 hover:bg-white/20 transition backdrop-blur-md border border-white/15 px-3.5 py-2 rounded-2xl text-center shrink-0 cursor-pointer"
                title="Lihat reputasi dan ulasan pelayanan toko"
              >
                <div className="text-sm font-black text-white font-heading flex items-center justify-center gap-1">
                  <Star size={15} weight="fill" className="text-amber-400" />
                  <span>
                    {merchantReputation && merchantReputation.total_reviews > 0
                      ? Number(merchantReputation.average_rating).toFixed(1)
                      : "Belum Ada"}
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  {merchantReputation && merchantReputation.total_reviews > 0
                    ? `(${merchantReputation.total_reviews} Penilaian Toko)`
                    : "(0 Penilaian Toko)"}
                </div>
              </button>

              {/* Assurance Metric */}
              <div className="hidden sm:block bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-2 rounded-2xl text-center shrink-0">
                <div className="text-xs font-black text-sky-200 font-heading flex items-center justify-center gap-1">
                  <ShieldCheck size={15} weight="fill" className="text-sky-300" />
                  <span>100% Asli</span>
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">SERVIO Shield</div>
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

      {/* 3. Main Storefront Workspace (Desktop: Fixed Left Sidebar + Only Product Grid Scrolls) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 gap-6 min-h-0">
        {/* LEFT COLUMN: Categories & Store Information (Stays Fixed / Has Internal Scroll) */}
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
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer ${activeCategoryTab === "ALL"
                  ? "bg-[#0F4C81] text-white shadow-xs font-bold"
                  : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <SquaresFour size={15} weight="bold" />
                  <span>Semua Produk</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeCategoryTab === "ALL" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                >
                  {products.length}
                </span>
              </button>

              {storeCategories.map((cat) => {
                const isActive = activeCategoryTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryTab(cat.id)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer ${isActive
                      ? "bg-[#0F4C81] text-white shadow-xs font-bold"
                      : "text-slate-600 hover:bg-slate-100"
                      }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Tag size={14} weight="bold" className={isActive ? "text-white" : "text-slate-400"} />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Ready Stock Toggle */}
            <div className="pt-2.5 border-t border-slate-100">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
                  Hanya Stok Ready
                </span>
                <input
                  type="checkbox"
                  checked={onlyReadyStock}
                  onChange={(e) => setOnlyReadyStock(e.target.checked)}
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
                  <div className="font-bold text-slate-900 text-xs">Alamat Toko &amp; Gudang Resmi</div>
                  <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    {formattedAddress}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 text-xs">Jam Layanan &amp; Pengiriman</div>
                  <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    {formattedOperatingHours}. Pesanan diproses pada hari &amp; jam kerja toko.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 text-xs">Garansi Toko &amp; Retur Part</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Jaminan ganti baru atau uang kembali jika tipe / spesifikasi part tidak sesuai deskripsi.
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
              <h4 className="text-xs font-bold text-slate-900 font-heading">Konsultasi Seri Part</h4>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Ragu modul / sparepart ini cocok untuk AC Anda? Teknisi kami siap cek plat nomor seri unit Anda.
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

        {/* RIGHT COLUMN: Search Toolbar & Scrollable Product Grid */}
        <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
          {/* Main Storefront Tabs: Katalog Produk vs Ulasan Pelayanan Toko */}
          <div className="flex items-center gap-2 mb-3 bg-white p-1.5 rounded-xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setStorefrontTab("PRODUCTS")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                storefrontTab === "PRODUCTS"
                  ? "bg-[#0F4C81] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Package size={15} weight="bold" />
              <span>Katalog Produk</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  storefrontTab === "PRODUCTS" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {products.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStorefrontTab("REVIEWS")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                storefrontTab === "REVIEWS"
                  ? "bg-[#0F4C81] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Star
                size={15}
                weight="fill"
                className={storefrontTab === "REVIEWS" ? "text-amber-300" : "text-amber-500"}
              />
              <span>Reputasi &amp; Ulasan Toko</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  storefrontTab === "REVIEWS" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800 font-bold"
                }`}
              >
                {merchantReputation?.total_reviews ?? businessReviews.length}
              </span>
            </button>
          </div>

          {storefrontTab === "PRODUCTS" ? (
            <>
              {/* Search Toolbar (Fixed at Top of Products Column) */}
          <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs mb-3 shrink-0 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex-1 relative">
                <MagnifyingGlass
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder={`Cari nama produk, tipe, atau brand di ${shop.name}...`}
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
                Menampilkan {filteredProducts.length} dari {products.length} produk
              </span>
              {(activeCategoryTab !== "ALL" || searchQuery || onlyReadyStock) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategoryTab("ALL");
                    setSearchQuery("");
                    setOnlyReadyStock(false);
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* PRODUCT SCROLLABLE AREA: THIS IS THE ONLY REGION THAT SCROLLS! */}
          <div className="flex-1 overflow-y-auto pr-1 pb-6 min-h-0 space-y-4 custom-scrollbar">
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center space-y-2.5">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 font-heading">Tidak Ada Produk Ditemukan</h3>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                    {searchQuery
                      ? `Tidak ada produk yang cocok dengan pencarian "${searchQuery}". Coba kata kunci lain.`
                      : "Belum ada produk aktif untuk kategori yang dipilih di etalase toko ini."}
                  </p>
                </div>
              </div>
            ) : (
              /* Compact Product Cards: Controlled photo size & balanced proportions */
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5">
                {filteredProducts.map((p) => {
                  const thumbUrl = p.primary_image_url || getProductMediaUrl(p.media);
                  const isStockAvailable = (p.totalStock ?? 0) > 0;

                  return (
                    <Link
                      key={p.productId}
                      href={`/products/${p.productId}`}
                      className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs hover:shadow-md hover:border-[#0F4C81]/40 transition-all flex flex-col justify-between group"
                    >
                      {/* Compact Image Box: Small height (h-28 to h-32) to prevent excessive vertical space */}
                      <div className="h-28 sm:h-32 w-full bg-slate-50 p-2 relative flex items-center justify-center border-b border-slate-100/80 overflow-hidden shrink-0">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={p.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}

                        {/* Fallback component illustration */}
                        <div className="w-10 h-10 rounded-xl bg-white shadow-2xs border border-slate-200/60 flex items-center justify-center text-[#0F4C81] group-hover:scale-105 transition-transform">
                          <Package size={22} weight="duotone" />
                        </div>

                        {/* Top Category Badge */}
                        <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-slate-600 border border-slate-200/80 shadow-2xs truncate max-w-[100px]">
                          {p.categoryName || categoryDict[p.categoryId] || "Sparepart"}
                        </span>

                        {/* Stock Badge Top Right */}
                        <span
                          className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border shadow-2xs ${isStockAvailable
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                        >
                          {isStockAvailable ? "Ready Kirim" : "Pre-Order"}
                        </span>
                      </div>

                      {/* Product Details Area: Compact and clean */}
                      <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold gap-1">
                            <span className="truncate">{p.brandName || "Universal / OEM"}</span>
                            <span className="text-emerald-700 font-bold flex items-center gap-0.5 shrink-0">
                              <ShieldCheck size={11} weight="fill" />
                              <span>Garansi</span>
                            </span>
                          </div>
                          <h3 className="text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-[#0F4C81] transition font-heading leading-tight h-8">
                            {p.name}
                          </h3>
                        </div>

                        {/* Price & Stock */}
                        <div className="pt-1.5 border-t border-slate-100 flex items-baseline justify-between gap-1">
                          <span className="text-xs sm:text-sm font-black text-[#0F4C81] font-heading">
                            {p.priceRangeFormatted || p.priceDisplay}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            Stok: <b className="text-slate-700">{p.totalStock ?? 1}</b>
                          </span>
                        </div>

                        {/* Compact CTA Button */}
                        <div className="w-full py-1.5 px-2 rounded-lg bg-slate-50 group-hover:bg-[#0F4C81] group-hover:text-white text-slate-700 text-[11px] font-bold transition flex items-center justify-center gap-1 border border-slate-200 group-hover:border-[#0F4C81]">
                          <span>Lihat Detail</span>
                          <ArrowLeft size={11} weight="bold" className="rotate-180 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Quality & Trust Assurances (Placed at bottom of scrollable product catalog) */}
            <div className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0F4C81] flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 font-heading">Pemeriksaan Fisik Part</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Setiap sparepart diperiksa fisik dan kelayakannya sebelum dikirim ke kurir rekanan.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Truck size={18} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 font-heading">Pengemasan Ekstra Aman</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Lapis bubble wrap tebal dan box karton solid anti benturan untuk keamanan jarak jauh.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Sparkle size={18} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 font-heading">Garansi Tukar Baru</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Jaminan ganti unit langsung bila part tidak cocok dengan seri perangkat Anda.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
            </>
          ) : (
            /* REVIEWS TAB CONTENT */
            <div className="flex-1 overflow-y-auto pr-1 pb-6 min-h-0 space-y-4 custom-scrollbar">
              {/* Reputasi Toko Summary Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
                      <Star size={18} weight="fill" className="text-amber-400" />
                      <span>Reputasi Pelayanan Toko</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Dihitung secara terverifikasi dari seluruh ulasan transaksi selesai pada toko ini.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-amber-50/80 px-4 py-2.5 rounded-2xl border border-amber-200">
                    <div className="text-center">
                      <span className="text-2xl font-black text-slate-900">
                        {merchantReputation && merchantReputation.total_reviews > 0
                          ? Number(merchantReputation.average_rating).toFixed(1)
                          : "0.0"}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold"> / 5.0</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            weight="fill"
                            className={
                              s <= Math.round(merchantReputation?.average_rating ?? 0)
                                ? "text-amber-400"
                                : "text-slate-200"
                            }
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-bold text-amber-800 mt-0.5 block">
                        {merchantReputation?.total_reviews ?? 0} Total Penilaian Toko
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5..1 Stars Distribution */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const total = merchantReputation?.total_reviews ?? 0;
                    const count = merchantReputation?.distribution?.[String(star)] ?? 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div
                        key={star}
                        className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100"
                      >
                        <span className="font-bold text-slate-700 flex items-center gap-0.5 shrink-0">
                          {star} <Star size={12} weight="fill" className="text-amber-400" />
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviews List */}
              {reviewsLoading ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200/80 text-center text-xs text-slate-400">
                  Memuat ulasan pelayanan toko...
                </div>
              ) : businessReviews.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200/80 text-center space-y-1.5 text-xs text-slate-500">
                  <p className="font-bold text-slate-800">Belum ada ulasan untuk toko ini</p>
                  <p className="text-[11px] text-slate-400">
                    Ulasan dari pembeli akan otomatis ditampilkan di sini setelah pesanan barang diselesaikan.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {businessReviews.map((rev) => {
                    const publicName =
                      rev.customer_display_name ||
                      (rev.submission?.customer_id
                        ? `Pelanggan #${rev.submission.customer_id.substring(0, 6)}`
                        : "Pembeli Terverifikasi");
                    const reviewDate = new Date(rev.submitted_at || rev.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    const orderDate = rev.ordered_at
                      ? new Date(rev.ordered_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : null;
                    const commentText = rev.text || rev.review_text || rev.comment;
                    const replyText = rev.reply?.text || rev.reply?.reply_text;

                    return (
                      <div
                        key={rev.id}
                        className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center font-bold text-xs shrink-0">
                              {publicName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-slate-900 block">{publicName}</span>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                {orderDate && (
                                  <span>
                                    Tanggal Order: <strong className="text-slate-700">{orderDate}</strong>
                                  </span>
                                )}
                                {orderDate && <span className="text-slate-300">•</span>}
                                <span>
                                  Tanggal Ulasan: <strong className="text-slate-700">{reviewDate}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 shrink-0">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={13}
                                weight="fill"
                                className={i < (rev.rating || 5) ? "text-amber-400" : "text-slate-200"}
                              />
                            ))}
                            <span className="text-xs font-bold text-slate-800 ml-1">{rev.rating || 5}.0</span>
                          </div>
                        </div>

                        {commentText ? (
                          <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                            &ldquo;{commentText}&rdquo;
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            Pembeli memberikan rating bintang tanpa komentar tertulis.
                          </p>
                        )}

                        {replyText && (
                          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-[#0F4C81] flex items-center gap-1.5">
                                <Storefront size={14} weight="fill" />
                                Balasan Resmi {shop.name}
                              </span>
                              {rev.reply?.created_at && (
                                <span className="text-[#0F4C81]/80 text-[10px]">
                                  {new Date(rev.reply.created_at).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-800 leading-relaxed">{replyText}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contact Merchant Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ChatCircleDots size={22} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">Hubungi Toko Mitra</h3>
                  <p className="text-[11px] text-slate-400">{shop.name}</p>
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
                Anda dapat menghubungi layanan pelanggan resmi <b>{shop.name}</b> untuk konsultasi spesifikasi suku cadang, ketersediaan stok grosir, atau pengiriman kargo cepat:
              </p>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">WhatsApp CS Mitra:</span>
                  <span className="font-bold text-emerald-700 font-mono">+62 812-8899-7711</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Jam Respons Cepat:</span>
                  <span className="font-bold text-slate-800">08:30 – 17:00 WIB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Lokasi Pengiriman:</span>
                  <span className="font-bold text-slate-800">{shop.city || "Glodok, Jakarta Barat"}</span>
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
                href={`https://wa.me/6281288997711?text=Halo%20${encodeURIComponent(shop.name)},%20saya%20ingin%20tanya%20suku%20cadang%20di%20etalase%20SERVIO`}
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
