"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  ShoppingCart,
  CheckCircle,
  ArrowsDownUp,
  Package,
  ShieldCheck,
  Storefront,
  Star,
  MapPin,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkle,
} from "@phosphor-icons/react";
import { productsApi, productCategoriesApi, shopsApi } from "@/lib/servioApi";
import { ApiProduct, ApiProductCategory, ApiShopProfile, getProductMediaUrl } from "@/types/domain";
import { useCart } from "@/features/cart/useCart";

type ProductSortOption = "POPULAR" | "PRICE_LOW" | "PRICE_HIGH";

function ProductCatalogContent() {
  const { totalItemCount } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialSearch = searchParams.get("search") || "";
  const initialMerchantId = searchParams.get("merchantId") || "";

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiProductCategory[]>([]);
  const [matchedMerchants, setMatchedMerchants] = useState<ApiShopProfile[]>([]);
  const [selectedShop, setSelectedShop] = useState<ApiShopProfile | null>(null);
  const [recommendations, setRecommendations] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [sortBy, setSortBy] = useState<ProductSortOption>("POPULAR");

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load shop profile if merchantId is in URL
  useEffect(() => {
    if (initialMerchantId) {
      shopsApi
        .get(initialMerchantId)
        .then((res) => {
          if (res.data?.shop) {
            setSelectedShop(res.data.shop);
          }
        })
        .catch((err) => console.error("Failed to load initial shop:", err));
    }
  }, [initialMerchantId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const prodRes = await productsApi.list({
        scope: "public",
        search: debouncedSearch,
        categoryId: selectedCategory,
        merchantOrganizationId: selectedShop?.id,
      });

      const catRes = await productCategoriesApi.list({ status: "ACTIVE" });

      const uniqueCats: ApiProductCategory[] = [];
      const seenNames = new Set<string>();
      for (const cat of catRes.data || []) {
        const key = cat.name.trim().toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          uniqueCats.push(cat);
        }
      }

      setProducts(prodRes.data || []);
      setCategories(uniqueCats);
      setMatchedMerchants(prodRes.matchedMerchants || []);
      setRecommendations(prodRes.recommendations || []);
    } catch (err: unknown) {
      console.error("Failed to load catalog products:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedShop?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortBy === "PRICE_LOW") {
      return list.sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
    }
    if (sortBy === "PRICE_HIGH") {
      return list.sort((a, b) => (b.maxPrice || b.minPrice || 0) - (a.maxPrice || a.minPrice || 0));
    }
    return list;
  }, [products, sortBy]);

  const sortedRecommendations = useMemo(() => {
    const list = [...recommendations];
    if (sortBy === "PRICE_LOW") {
      return list.sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
    }
    if (sortBy === "PRICE_HIGH") {
      return list.sort((a, b) => (b.maxPrice || b.minPrice || 0) - (a.maxPrice || a.minPrice || 0));
    }
    return list;
  }, [recommendations, sortBy]);

  const handleSelectShop = (shop: ApiShopProfile) => {
    setSelectedShop(shop);
    setSearchQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearShop = () => {
    setSelectedShop(null);
    setSearchQuery("");
    router.replace("/products");
  };

  const renderProductCard = (p: ApiProduct, isRecommendation = false) => {
    const totalStock = p.totalStock ?? p.variants?.reduce((acc, v) => acc + (v.stock || 0), 0) ?? 0;
    const isOutOfStock = totalStock <= 0;

    return (
      <div
        key={`${isRecommendation ? "rec-" : "prod-"}${p.productId}`}
        className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between font-body text-left group"
      >
        <Link href={`/products/${p.productId}`} className="relative h-40 bg-slate-50 p-3 flex flex-col justify-between border-b border-slate-100 block">
          <div className="flex items-center justify-between z-10 gap-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 truncate">
              {p.categoryName || p.categoryId}
            </span>
            <div className="flex items-center gap-1">
              {p.warrantyPolicy?.durationMonths ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                  <ShieldCheck size={12} weight="fill" className="text-emerald-600" />
                  Garansi {p.warrantyPolicy.durationMonths} Bln
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1 shrink-0">
                  Non-Garansi
                </span>
              )}
              {isOutOfStock ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                  Habis
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                  <CheckCircle size={12} weight="fill" /> Siap
                </span>
              )}
            </div>
          </div>

          {getProductMediaUrl(p.media) ? (
            <div className="absolute inset-0 flex items-center justify-center p-3 overflow-hidden">
              <img
                src={getProductMediaUrl(p.media)}
                alt={p.name}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:scale-105 transition-transform duration-300">
              <Package size={56} weight="duotone" className="text-[#0F4C81]" />
            </div>
          )}

          <div className="z-10 flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate">{p.brandName || "Universal / OEM"}</span>
          </div>
        </Link>

        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            {/* Merchant / Store Tag */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (p.merchantOrganizationId) {
                    handleSelectShop({
                      id: p.merchantOrganizationId,
                      name: p.merchantName || "Toko Mitra",
                      productCount: 1,
                      city: "Jakarta Barat (Glodok)",
                      badge: "Mitra Toko Resmi SERVIO",
                    });
                  }
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F4C81] hover:text-sky-800 bg-sky-50/80 hover:bg-sky-100 px-2 py-0.5 rounded-md border border-sky-100 transition-colors"
                title="Lihat semua produk dari toko ini"
              >
                <Storefront size={12} weight="bold" />
                <span className="truncate max-w-[150px]">{p.merchantName || "Toko Mitra Resmi"}</span>
              </button>
            </div>

            <Link href={`/products/${p.productId}`}>
              <h2 className="text-xs font-bold text-slate-900 group-hover:text-[#0F4C81] transition-colors line-clamp-2 leading-snug">
                {p.name}
              </h2>
            </Link>
            <p className="text-[10px] text-slate-400">
              {p.variantCount || p.variants?.length || 1} Pilihan Varian
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Rentang Harga</p>
              <p className="text-xs sm:text-sm font-bold text-[#0F4C81] leading-tight">
                {p.priceRangeFormatted ||
                  p.priceDisplay ||
                  (p.minPrice !== undefined && p.maxPrice !== undefined && p.minPrice !== p.maxPrice
                    ? `Rp${p.minPrice.toLocaleString("id-ID")} - Rp${p.maxPrice.toLocaleString("id-ID")}`
                    : p.minPrice
                    ? `Rp${p.minPrice.toLocaleString("id-ID")}`
                    : "Rp0")}
              </p>
            </div>

            <Link
              href={`/products/${p.productId}`}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-[#0F4C81] group-hover:text-white transition-colors"
              title="Lihat Detail Produk"
            >
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white pb-24 font-body">
      {/* Header & Search Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  Marketplace Suku Cadang &amp; Komponen
                </span>
                {selectedShop && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <Storefront size={12} weight="bold" />
                    Katalog Toko: {selectedShop.name}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">
                {selectedShop ? selectedShop.name : "Katalog Produk & Komponen Resmi"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedShop
                  ? `Menampilkan seluruh katalog suku cadang dari ${selectedShop.name} dengan jaminan garansi resmi.`
                  : "Suku cadang original terverifikasi teknisi Servio. Cari berdasarkan nama produk, spesifikasi, atau nama toko mitra."}
              </p>
            </div>

            {/* Cart Quick Button */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              {selectedShop && (
                <button
                  type="button"
                  onClick={handleClearShop}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition border border-slate-200"
                >
                  <ArrowLeft size={14} weight="bold" />
                  <span>Semua Katalog</span>
                </button>
              )}

              <Link
                href="/cart"
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition shadow-md shadow-sky-900/15"
              >
                <ShoppingCart size={18} weight="bold" />
                <span>Keranjang Belanja</span>
                {totalItemCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white text-[#0F4C81] text-[10px] font-extrabold">
                    {totalItemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari spare part, freon, atau nama toko (misal: Glodok)..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <ArrowsDownUp size={16} />
                <span>Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as ProductSortOption)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="POPULAR">Paling Relevan</option>
                  <option value="PRICE_LOW">Harga Terendah</option>
                  <option value="PRICE_HIGH">Harga Tertinggi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === "ALL"
                  ? "bg-[#0F4C81] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua Kategori
            </button>
            {categories.map((cat) => (
              <button
                key={cat.categoryId}
                onClick={() => setSelectedCategory(cat.categoryId)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat.categoryId
                    ? "bg-[#0F4C81] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* CASE 1: SPECIFIC SHOP PROFILE SELECTED (CLICKED PROFILE VIEW) */}
        {selectedShop && (
          <div className="bg-white border-2 border-sky-100 rounded-3xl p-6 sm:p-8 text-slate-900 shadow-xs relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0F4C81] flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Storefront size={36} weight="duotone" className="text-white" />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle size={12} weight="fill" className="text-emerald-600" />
                      {selectedShop.badge || "Mitra Toko Resmi SERVIO"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200">
                      ID: {selectedShop.organizationCode || selectedShop.id.slice(-6).toUpperCase()}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-slate-900">
                    {selectedShop.name}
                  </h2>

                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                    {selectedShop.description ||
                      "Distributor & Toko Resmi suku cadang pendingin, freon murni, dan komponen kelistrikan AC bergaransi platform."}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1 text-amber-600 font-bold">
                      <Star size={14} weight="fill" />
                      <span>{selectedShop.rating || 4.9}</span>
                      <span className="text-slate-400 font-normal">({selectedShop.reviewCount || 128} Ulasan)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={14} weight="fill" className="text-rose-500" />
                      <span>{selectedShop.city || "Jakarta Barat (Pusat Niaga Glodok)"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sky-700 font-medium">
                      <Package size={14} weight="fill" />
                      <span>{products.length} Produk Aktif</span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-700 font-medium">
                      <ShieldCheck size={14} weight="fill" />
                      <span>{selectedShop.warrantyOffer || "Garansi Toko & Pabrik 12 Bulan"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                <button
                  type="button"
                  onClick={handleClearShop}
                  className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center gap-1.5 shadow-xs"
                >
                  <ArrowLeft size={16} weight="bold" />
                  <span>Lihat Semua Toko</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CASE 2: SEARCH QUERY MATCHED MERCHANT SHOPS (SEARCH BY STORE NAME) */}
        {!selectedShop && matchedMerchants.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-sky-100 text-[#0F4C81]">
                <Storefront size={16} weight="bold" />
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Profil Toko Mitra Ditemukan ({matchedMerchants.length} Toko)
              </h2>
              <span className="text-xs text-slate-400">
                — Hasil pencarian toko dari kata kunci &ldquo;{debouncedSearch}&rdquo;
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchedMerchants.map((shop) => (
                <div
                  key={shop.id}
                  onClick={() => handleSelectShop(shop)}
                  className="rounded-3xl border-2 border-sky-100 bg-gradient-to-r from-sky-50/60 via-white to-slate-50 p-5 hover:border-[#0F4C81] hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#0F4C81] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <Storefront size={24} weight="bold" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {shop.badge || "Mitra Toko Resmi"}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {shop.productCount} Produk
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0F4C81] transition-colors">
                          {shop.name}
                        </h3>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                            <Star size={12} weight="fill" />
                            {shop.rating || 4.9}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MapPin size={12} />
                            {shop.city || "Jakarta Barat"}
                          </span>
                          <span className="flex items-center gap-0.5 text-emerald-700 font-medium">
                            <ShieldCheck size={12} weight="fill" />
                            Garansi 12 Bln
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectShop(shop);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#0F4C81] text-white text-[11px] font-bold hover:bg-[#0c3c66] transition shrink-0 flex items-center gap-1 shadow-xs"
                    >
                      <span>Katalog Toko</span>
                      <ArrowRight size={12} weight="bold" />
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 line-clamp-2 pl-[62px]">
                    {shop.description ||
                      "Distributor & Toko Resmi suku cadang pendingin, freon murni, dan komponen kelistrikan AC bergaransi platform."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 1: MAIN SEARCHED / SELECTED SHOP PRODUCTS */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {selectedShop ? (
                  <>
                    <Storefront size={20} className="text-[#0F4C81]" weight="bold" />
                    <span>Semua Katalog Produk dari {selectedShop.name}</span>
                  </>
                ) : matchedMerchants.length > 0 ? (
                  <>
                    <Package size={20} className="text-[#0F4C81]" weight="bold" />
                    <span>Katalog Produk dari Toko Yang Dicari</span>
                  </>
                ) : (
                  <>
                    <Package size={20} className="text-[#0F4C81]" weight="bold" />
                    <span>Katalog Suku Cadang &amp; Komponen</span>
                  </>
                )}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {sortedProducts.length} Produk
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedShop
                  ? `Seluruh produk terdaftar di bawah pengawasan toko resmi ${selectedShop.name}`
                  : "Produk suku cadang AC dan pendingin dengan jaminan garansi resmi"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-20 text-center text-xs text-slate-400">Memuat katalog resmi SERVIO...</div>
          ) : sortedProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 max-w-md mx-auto space-y-3">
              <Package size={48} className="text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Tidak ada produk ditemukan</h3>
              <p className="text-xs text-slate-400">
                {selectedShop
                  ? `Toko ${selectedShop.name} belum memiliki produk aktif di kategori ini.`
                  : "Coba ubah kata kunci pencarian atau pilih kategori lain."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
              {sortedProducts.map((p) => renderProductCard(p, false))}
            </div>
          )}
        </div>

        {/* SECTION 2: RECOMMENDATIONS FROM OTHER SHOPS (SELALU ADA REKOMENDASI PRODUK DARI TOKO LAIN) */}
        {sortedRecommendations.length > 0 && (
          <div className="pt-8 border-t-2 border-slate-200/80 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-amber-100 text-amber-700">
                    <Sparkle size={16} weight="fill" />
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    Rekomendasi Katalog dari Toko Mitra Lainnya
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Pilihan suku cadang terlaris dan bergaransi resmi dari toko-toko mitra tepercaya lainnya di platform
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 self-start sm:self-auto">
                {sortedRecommendations.length} Produk Pilihan
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
              {sortedRecommendations.map((p) => renderProductCard(p, true))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-400">
          Memuat katalog SERVIO...
        </div>
      }
    >
      <ProductCatalogContent />
    </Suspense>
  );
}
