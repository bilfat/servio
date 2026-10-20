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
  Tag,
  Funnel,
  CaretRight,
  CaretDown,
  Check,
  SlidersHorizontal,
  Fan,
  Wrench,
  Lightning,
  Broom,
  HouseLine,
  Car,
} from "@phosphor-icons/react";
import { productsApi, taxonomyApi, shopsApi } from "@/lib/servioApi";
import { ApiProduct, ApiShopProfile, ApiBrand, getProductMediaUrl } from "@/types/domain";
import { useCart } from "@/features/cart/useCart";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useActiveLocation, isSameCity } from "@/context/LocationContext";

type ProductSortOption = "POPULAR" | "PRICE_LOW" | "PRICE_HIGH";

const PRODUCT_CATEGORY_ICONS: Record<string, React.ElementType> = {
  "Sparepart AC & Pendingin": Fan,
  "Peralatan & Perkakas Servis": Wrench,
  "Komponen Elektrik & Sanitasi": Lightning,
  "Perlengkapan Cleaning & Sanitasi": Broom,
  "Material Bangunan & Waterproofing": HouseLine,
  "Suku Cadang Otomotif": Car,
};

function getCategoryIcon(catName: string) {
  for (const [key, icon] of Object.entries(PRODUCT_CATEGORY_ICONS)) {
    if (
      catName.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(catName.toLowerCase())
    ) {
      return icon;
    }
  }
  return Package;
}

function ProductCatalogContent() {
  const { totalItemCount } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();

  const parseParamArray = (val: string | null) => {
    if (!val || val === "ALL") return [];
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  };

  const initialSearch = searchParams.get("search") || "";
  const initialMerchantId = searchParams.get("merchantId") || "";
  const initialCategoryParam = searchParams.get("category") || searchParams.get("categoryId") || searchParams.get("categories");
  const initialSubcategoryParam = searchParams.get("subcategory") || searchParams.get("subcategoryId") || searchParams.get("subcategories");
  const initialBrandParam = searchParams.get("brand") || searchParams.get("brands");

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; category_id: string; name: string; code?: string }[]>([]);
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [matchedMerchants, setMatchedMerchants] = useState<ApiShopProfile[]>([]);
  const [selectedShop, setSelectedShop] = useState<ApiShopProfile | null>(null);
  const [recommendations, setRecommendations] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(parseParamArray(initialCategoryParam));
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(parseParamArray(initialSubcategoryParam));
  const [selectedBrands, setSelectedBrands] = useState<string[]>(parseParamArray(initialBrandParam));
  const [sortBy, setSortBy] = useState<ProductSortOption>("POPULAR");
  const { location: activeLocation, openLocationModal, getStoreDistance } = useActiveLocation();

  // State untuk Pop-up Filter Kategori, Subkategori & Merek (Multi-Select)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempCategories, setTempCategories] = useState<string[]>(parseParamArray(initialCategoryParam));
  const [tempSubcategories, setTempSubcategories] = useState<string[]>(parseParamArray(initialSubcategoryParam));
  const [tempBrands, setTempBrands] = useState<string[]>(parseParamArray(initialBrandParam));
  const [tempSortBy, setTempSortBy] = useState<ProductSortOption>("POPULAR");
  const [activePreviewCatId, setActivePreviewCatId] = useState<string | null>(null);

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Synchronize URL with active filters
  const updateUrlParams = useCallback(
    (cats: string[], subs: string[], brs: string[], search: string) => {
      const sp = new URLSearchParams();
      if (search) sp.set("search", search);
      if (initialMerchantId) sp.set("merchantId", initialMerchantId);
      if (cats.length > 0) sp.set("categories", cats.join(","));
      if (subs.length > 0) sp.set("subcategories", subs.join(","));
      if (brs.length > 0) sp.set("brands", brs.join(","));
      const newQuery = sp.toString() ? `?${sp.toString()}` : "";
      router.replace(`/products${newQuery}`, { scroll: false });
    },
    [initialMerchantId, router]
  );

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

  // 1. Load taxonomy master data once on mount
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      taxonomyApi.getCategories({ master: "PRODUK", status: "ACTIVE" }).catch(() => null),
      taxonomyApi.getSubcategories({ master: "PRODUK", status: "ACTIVE" }).catch(() => null),
      taxonomyApi.getBrands({ status: "ACTIVE" }).catch(() => null),
    ]).then(([catRes, subRes, brandRes]) => {
      if (!isMounted) return;
      if (catRes && Array.isArray(catRes.data)) {
        setCategories(
          catRes.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            code: c.code,
          }))
        );
      }
      if (subRes && Array.isArray(subRes.data)) {
        setSubcategories(
          subRes.data.map((s: any) => ({
            id: s.id,
            category_id: s.category_id || s.categoryId,
            name: s.name,
            code: s.code,
          }))
        );
      }
      if (brandRes && Array.isArray(brandRes.data)) {
        setBrands(brandRes.data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch products server-side whenever search, shop, or server filter changes
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const prodRes = await productsApi.list({
        scope: "public",
        search: debouncedSearch,
        merchantOrganizationId: selectedShop?.id,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        subcategories: selectedSubcategories.length > 0 ? selectedSubcategories : undefined,
        brands: selectedBrands.length > 0 ? selectedBrands : undefined,
        limit: 50,
      });

      setProducts(prodRes.data || []);
      setMatchedMerchants(prodRes.matchedMerchants || []);
      setRecommendations(prodRes.recommendations || []);
    } catch (err: unknown) {
      console.error("Failed to load catalog products:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedShop?.id, selectedCategories, selectedSubcategories, selectedBrands]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Available subcategories for current category selection
  const availableSubcategories = useMemo(() => {
    if (selectedCategories.length === 0) {
      return subcategories;
    }
    return subcategories.filter((s) => selectedCategories.includes(s.category_id));
  }, [subcategories, selectedCategories]);

  // Active Filter Helpers
  const isFilterActive =
    selectedCategories.length > 0 ||
    selectedSubcategories.length > 0 ||
    selectedBrands.length > 0 ||
    sortBy !== "POPULAR";

  const totalActiveFilterCount =
    selectedCategories.length +
    selectedSubcategories.length +
    selectedBrands.length +
    (sortBy !== "POPULAR" ? 1 : 0);

  const handleOpenFilterModal = () => {
    setTempCategories([...selectedCategories]);
    setTempSubcategories([...selectedSubcategories]);
    setTempBrands([...selectedBrands]);
    setTempSortBy(sortBy);
    setActivePreviewCatId(selectedCategories[0] || categories[0]?.id || null);
    setIsFilterModalOpen(true);
  };

  const handleApplyFilter = () => {
    setSelectedCategories(tempCategories);
    setSelectedSubcategories(tempSubcategories);
    setSelectedBrands(tempBrands);
    setSortBy(tempSortBy);
    setIsFilterModalOpen(false);
    updateUrlParams(tempCategories, tempSubcategories, tempBrands, debouncedSearch);
  };

  const handleRemoveCategory = (catId: string) => {
    const updated = selectedCategories.filter((id) => id !== catId);
    setSelectedCategories(updated);
    updateUrlParams(updated, selectedSubcategories, selectedBrands, debouncedSearch);
  };

  const handleRemoveSubcategory = (subId: string) => {
    const updated = selectedSubcategories.filter((id) => id !== subId);
    setSelectedSubcategories(updated);
    updateUrlParams(selectedCategories, updated, selectedBrands, debouncedSearch);
  };

  const handleRemoveBrand = (bName: string) => {
    const updated = selectedBrands.filter((b) => b !== bName);
    setSelectedBrands(updated);
    updateUrlParams(selectedCategories, selectedSubcategories, updated, debouncedSearch);
  };

  const handleClearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setSelectedBrands([]);
    setSortBy("POPULAR");
    setTempCategories([]);
    setTempSubcategories([]);
    setTempBrands([]);
    setTempSortBy("POPULAR");
    updateUrlParams([], [], [], debouncedSearch);
  };

  const sortedProducts = useMemo(() => {
    let list = [...products];

    // Filter by Categories (Multi-select: Match ANY of selected categories)
    if (selectedCategories.length > 0) {
      list = list.filter((p) => {
        return selectedCategories.some((catId) => {
          if (p.categoryId === catId) return true;
          const activeCat = categories.find((c) => c.id === catId);
          const catName = activeCat?.name.toLowerCase() || "";
          const catWords = catName.split(/[\s&,/]+/).filter((w) => w.length > 2);
          if (p.categoryName && catName && p.categoryName.toLowerCase().includes(catName)) return true;
          const targetText = `${p.name} ${p.brandName || ""} ${p.description || ""} ${p.categoryName || ""}`.toLowerCase();
          return catWords.some((w) => targetText.includes(w));
        });
      });
    }

    // Filter by Subcategories (Multi-select: Match ANY of selected subcategories)
    if (selectedSubcategories.length > 0) {
      list = list.filter((p) => {
        return selectedSubcategories.some((subId) => {
          if ((p as any).subcategoryId === subId) return true;
          const activeSub = subcategories.find((s) => s.id === subId);
          const subName = activeSub?.name.toLowerCase() || "";
          const subWords = subName.split(/[\s&,/]+/).filter((w) => w.length > 2);
          const targetText = `${p.name} ${p.brandName || ""} ${p.description || ""} ${p.categoryName || ""}`.toLowerCase();
          return subWords.some((w) => targetText.includes(w)) || targetText.includes(subName);
        });
      });
    }

    // Filter by Brands (Multi-select: Match ANY of selected brands)
    if (selectedBrands.length > 0) {
      list = list.filter((p) => {
        const pb = (p.brandName || "").toLowerCase();
        return selectedBrands.some((bName) => {
          const bLower = bName.toLowerCase();
          return pb.includes(bLower) || bLower.includes(pb);
        });
      });
    }

    // Enforce: Hanya menampilkan toko yang sekota dengan lokasi aktif pembeli/guest (luar kota tidak ditampilkan)
    list = list.filter((p) => {
      const mCity = p.merchant?.city || p.merchantCity || "Jakarta Selatan";
      return isSameCity(mCity, activeLocation.city);
    });

    if (sortBy === "PRICE_LOW") {
      return list.sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
    }
    if (sortBy === "PRICE_HIGH") {
      return list.sort((a, b) => (b.maxPrice || b.minPrice || 0) - (a.maxPrice || a.minPrice || 0));
    }
    return list;
  }, [products, selectedCategories, selectedSubcategories, selectedBrands, categories, subcategories, sortBy, activeLocation.city]);

  const sortedRecommendations = useMemo(() => {
    // Hanya rekomendasikan toko yang sekota dengan lokasi pembeli
    const list = [...recommendations].filter((p) => {
      const mCity = p.merchant?.city || p.merchantCity || "Jakarta Selatan";
      return isSameCity(mCity, activeLocation.city);
    });
    if (sortBy === "PRICE_LOW") {
      return list.sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
    }
    if (sortBy === "PRICE_HIGH") {
      return list.sort((a, b) => (b.maxPrice || b.minPrice || 0) - (a.maxPrice || a.minPrice || 0));
    }
    return list;
  }, [recommendations, sortBy, activeLocation.city]);

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
              {categories.find((c) => c.id === p.categoryId)?.name || p.categoryName || p.categoryId}
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
            {/* Merchant / Store Tag & City Origin */}
            {(() => {
              const pMerchantCity = p.merchant?.city || p.merchantCity || "Jakarta Selatan";
              const isProdSameCity = isSameCity(pMerchantCity, activeLocation.city);
              return (
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
                          city: pMerchantCity,
                          badge: "Mitra Toko Resmi SERVIO",
                        });
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F4C81] hover:text-sky-800 bg-sky-50/80 hover:bg-sky-100 px-2 py-0.5 rounded-md border border-sky-100 transition-colors"
                    title={`Lihat toko: ${p.merchantName || "Toko Mitra"} (${pMerchantCity})`}
                  >
                    <Storefront size={12} weight="bold" />
                    <span className="truncate max-w-[120px]">{p.merchantName || "Toko Mitra Resmi"}</span>
                  </button>

                  {/* Distance Pill: Menampilkan Jarak km dari Lokasi User (Bukan teks "Sekota") */}
                  {(() => {
                    const distanceStr = getStoreDistance(
                      p.merchant || {
                        city: pMerchantCity,
                        name: p.merchantName,
                        id: p.merchantOrganizationId,
                      }
                    );
                    return (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs shrink-0"
                        title={`Jarak toko dari titik pengiriman Anda di ${activeLocation.city}: ${distanceStr}`}
                      >
                        <MapPin size={10} weight="fill" className="text-emerald-600 shrink-0" />
                        <span>{distanceStr}</span>
                      </span>
                    );
                  })()}
                </div>
              );
            })()}

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

          {/* Search, Filter Button, and Sort */}
          <div className="mt-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search + Filter Kategori Group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-3xl">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[260px]">
                <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari spare part, freon, atau nama toko (misal: Glodok)..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0F4C81] focus:bg-white transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X size={14} weight="bold" />
                  </button>
                )}
              </div>

              {/* Tombol Filter (Sebelah Search) */}
              <button
                type="button"
                onClick={handleOpenFilterModal}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${isFilterActive
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/25"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs"
                  }`}
              >
                {isFilterActive ? (
                  <>
                    <CheckCircle size={17} weight="fill" className="text-white shrink-0" />
                    <span>Filter ({totalActiveFilterCount})</span>
                  </>
                ) : (
                  <>
                    <Funnel size={16} weight="bold" className="text-[#0F4C81] shrink-0" />
                    <span>Filter</span>
                  </>
                )}
                <CaretDown size={13} weight="bold" className={isFilterActive ? "text-emerald-100" : "text-slate-400"} />
              </button>

              {/* Tag Filter Terpilih di Samping Tombol Filter */}
              {isFilterActive && (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold animate-in fade-in truncate max-w-[340px]">
                  <Tag size={13} weight="bold" className="text-emerald-700 shrink-0" />
                  <span className="truncate">
                    {[
                      sortBy === "PRICE_LOW" ? "Harga Terendah" : null,
                      sortBy === "PRICE_HIGH" ? "Harga Tertinggi" : null,
                      selectedCategories.length > 0 ? `${selectedCategories.length} Kategori` : null,
                      selectedSubcategories.length > 0 ? `${selectedSubcategories.length} Sub` : null,
                      selectedBrands.length > 0 ? `${selectedBrands.length} Merek` : null,
                    ].filter(Boolean).join(" • ")}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded-md hover:bg-emerald-200/60 transition shrink-0 ml-0.5 cursor-pointer"
                    title="Hapus semua filter"
                  >
                    <X size={12} weight="bold" />
                  </button>
                </div>
              )}
            </div>

            {/* Location Group */}
            <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto shrink-0">
              {/* Quick Location Badge */}
              <button
                type="button"
                onClick={openLocationModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0F4C81] border border-sky-200 text-xs font-semibold transition cursor-pointer shadow-2xs"
                title="Klik untuk memilih kota atau alamat tujuan Anda"
              >
                <MapPin size={14} weight="fill" className={activeLocation.isGps ? "text-emerald-600" : "text-[#0F4C81]"} />
                <span className="truncate max-w-[130px]">Kirim ke: <strong>{activeLocation.city}</strong></span>
                <span className="text-[10px] text-sky-700 underline font-bold">Ubah</span>
              </button>
            </div>
          </div>

          {/* Active Filter Chips di Bawah Search & Filter */}
          {isFilterActive && (
            <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <SlidersHorizontal size={13} className="text-[#0F4C81]" />
                Filter Aktif ({totalActiveFilterCount}):
              </span>

              {/* Chip Urutan Harga jika bukan POPULAR */}
              {sortBy !== "POPULAR" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-700 text-white font-semibold text-xs shadow-xs">
                  <ArrowsDownUp size={12} weight="bold" />
                  <span>{sortBy === "PRICE_LOW" ? "Harga: Terendah" : "Harga: Tertinggi"}</span>
                  <button
                    type="button"
                    onClick={() => setSortBy("POPULAR")}
                    className="p-0.5 hover:bg-sky-600 rounded-full cursor-pointer ml-0.5 transition"
                    title="Kembalikan urutan normal"
                  >
                    <X size={11} weight="bold" />
                  </button>
                </span>
              )}

              {selectedCategories.map((catId) => {
                const cat = categories.find((c) => c.id === catId);
                if (!cat) return null;
                return (
                  <span key={`cat-${catId}`} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4C81] text-white font-semibold text-xs shadow-xs">
                    <span className="text-sky-200 text-[10px] uppercase font-bold">Kategori:</span>
                    <span>{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(catId)}
                      className="p-0.5 hover:bg-white/20 rounded-full transition ml-0.5 cursor-pointer"
                      title={`Hapus filter ${cat.name}`}
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </span>
                );
              })}

              {selectedSubcategories.map((subId) => {
                const sub = subcategories.find((s) => s.id === subId);
                if (!sub) return null;
                return (
                  <span key={`sub-${subId}`} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-semibold text-xs border border-emerald-300 shadow-xs">
                    <span className="text-emerald-700 text-[10px] uppercase font-bold">Sub:</span>
                    <span>{sub.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubcategory(subId)}
                      className="p-0.5 hover:bg-emerald-200 rounded-full transition ml-0.5 cursor-pointer"
                      title={`Hapus filter ${sub.name}`}
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </span>
                );
              })}

              {selectedBrands.map((bName) => (
                <span key={`brand-${bName}`} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-950 font-semibold text-xs border border-amber-300 shadow-xs">
                  <span className="text-amber-800 text-[10px] uppercase font-bold">Merek:</span>
                  <span>{bName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBrand(bName)}
                    className="p-0.5 hover:bg-amber-200 rounded-full transition ml-0.5 cursor-pointer"
                    title={`Hapus filter ${bName}`}
                  >
                    <X size={12} weight="bold" />
                  </button>
                </span>
              ))}

              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline ml-1 cursor-pointer"
              >
                Reset Semua Filter
              </button>
            </div>
          )}
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
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Storefront size={32} weight="duotone" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Belum Ada Toko di {activeLocation.city}</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {selectedShop
                    ? `Toko ${selectedShop.name} belum memiliki produk aktif di kota ${activeLocation.city}.`
                    : `Saat ini belum ada toko mitra yang aktif di kota ${activeLocation.city}. Silakan ganti titik lokasi pengiriman untuk menemukan suku cadang di kota terdekat.`}
                </p>
              </div>
              <button
                type="button"
                onClick={openLocationModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition shadow-xs cursor-pointer mx-auto"
              >
                <MapPin size={14} weight="bold" />
                <span>Ganti Titik Lokasi Pengiriman</span>
              </button>
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

      {/* Pop-up Modal Filter (Multi-Select) */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Katalog Produk"
        maxWidth="3xl"
        footer={
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setTempCategories([]);
                setTempSubcategories([]);
                setTempBrands([]);
                setTempSortBy("POPULAR");
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Reset Semua Filter
            </button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyFilter}
                className="bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold shadow-xs"
              >
                Terapkan Filter
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5 font-body">
          {/* ========================================================================= */}
          {/* SECTION 1: FILTER HARGA & URUTAN (Harga Terendah / Tertinggi / Relevan)   */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50/80 via-blue-50/40 to-sky-50/60 border border-sky-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-[#0F4C81] flex items-center justify-center shrink-0 shadow-2xs">
                  <ArrowsDownUp size={16} weight="bold" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900">Urutkan &amp; Filter Harga</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-[#0F4C81] font-bold border border-sky-300">
                      Urutan Harga
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Urutkan produk berdasarkan harga terendah, harga tertinggi, atau rekomendasi platform.
                  </p>
                </div>
              </div>
              {tempSortBy !== "POPULAR" && (
                <button
                  type="button"
                  onClick={() => setTempSortBy("POPULAR")}
                  className="text-xs text-[#0F4C81] hover:underline font-bold cursor-pointer shrink-0 ml-2"
                >
                  Reset Urutan
                </button>
              )}
            </div>

            {/* Opsi Pengurutan Harga */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {[
                {
                  id: "POPULAR",
                  label: "Paling Relevan",
                  desc: "Rekomendasi platform & toko terdekat",
                  icon: Sparkle,
                },
                {
                  id: "PRICE_LOW",
                  label: "Harga Terendah",
                  desc: "Mulai dari suku cadang termurah",
                  icon: ArrowsDownUp,
                },
                {
                  id: "PRICE_HIGH",
                  label: "Harga Tertinggi",
                  desc: "Mulai dari suku cadang premium",
                  icon: Tag,
                },
              ].map((opt) => {
                const isSelected = tempSortBy === opt.id;
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTempSortBy(opt.id as ProductSortOption)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-white border-[#0F4C81] shadow-sm ring-2 ring-[#0F4C81]/25"
                        : "bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-[#0F4C81] text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <IconComponent size={14} weight="bold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? "text-[#0F4C81]" : "text-slate-800"}`}>
                          {opt.label}
                        </span>
                        {isSelected && <Check size={13} weight="bold" className="text-[#0F4C81]" />}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: FILTER BERDASARKAN MEREK (MULTI-SELECT CHIP MEREK)            */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-amber-50/60 border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
                  <Tag size={16} weight="bold" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900">Filter Berdasarkan Merek</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                      Multi-Pilih • Independen
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Bisa memilih lebih dari 1 merek sekaligus (tidak dibatasi atau terikat kategori tertentu).
                  </p>
                </div>
              </div>
              {tempBrands.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTempBrands([])}
                  className="text-xs text-amber-900 hover:text-amber-950 font-bold underline cursor-pointer shrink-0 ml-2"
                >
                  Reset Merek
                </button>
              )}
            </div>

            {/* Chips Merek */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Chip: Semua Merek */}
              <button
                type="button"
                onClick={() => setTempBrands([])}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${tempBrands.length === 0
                  ? "bg-[#0F4C81] text-white shadow-xs ring-2 ring-[#0F4C81]/25"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                  }`}
              >
                <span>Semua Merek</span>
              </button>

              {/* List Chips Merek Resmi Multi-Select */}
              {brands.map((b) => {
                const isSelected = tempBrands.includes(b.name);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setTempBrands((prev) =>
                        isSelected ? prev.filter((x) => x !== b.name) : [...prev, b.name]
                      );
                    }}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer ${isSelected
                      ? "bg-amber-500 text-slate-950 font-bold shadow-xs ring-2 ring-amber-500/40"
                      : "bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-100 hover:border-slate-300 font-semibold"
                      }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                      {b.logo_url || b.logoUrl ? (
                        <img src={b.logo_url || b.logoUrl} alt={b.name} className="w-full h-full object-cover" />
                      ) : (
                        <Tag size={10} weight="bold" className="text-slate-400" />
                      )}
                    </div>
                    <span>{b.name}</span>
                    {isSelected && <Check size={12} weight="bold" className="text-slate-950 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: FILTER BERDASARKAN KATEGORI & SUBKATEGORI (MULTI-SELECT)       */}
          {/* ========================================================================= */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-sky-50 text-[#0F4C81] flex items-center justify-center shrink-0 shadow-2xs">
                  <Package size={16} weight="bold" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900">Filter Berdasarkan Kategori &amp; Subkategori</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-[#0F4C81] font-bold border border-sky-300">
                      Multi-Pilih
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Bisa memilih lebih dari 1 kategori dan subkategori. Klik nama kategori untuk melihat subkategorinya.
                  </p>
                </div>
              </div>
              {(tempCategories.length > 0 || tempSubcategories.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setTempCategories([]);
                    setTempSubcategories([]);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer shrink-0 ml-2"
                >
                  Reset Kategori &amp; Sub
                </button>
              )}
            </div>

            {/* Grid 2 Kolom Kategori & Subkategori */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
              {/* Kolom Kiri: Kategori Utama dengan Checkbox Multi-Pilih */}
              <div className="md:col-span-5 bg-white border-r border-slate-200/80 p-3 space-y-1.5 overflow-y-auto max-h-[320px]">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">
                  <span>Kategori Utama</span>
                  {tempCategories.length > 0 && (
                    <span className="text-[#0F4C81] font-bold lowercase tracking-normal">
                      {tempCategories.length} dipilih
                    </span>
                  )}
                </div>

                {/* Opsi Semua Kategori */}
                <button
                  type="button"
                  onClick={() => {
                    setTempCategories([]);
                    setTempSubcategories([]);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${tempCategories.length === 0
                    ? "bg-[#0F4C81] text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100"
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Package size={18} weight={tempCategories.length === 0 ? "fill" : "regular"} />
                    <span>Semua Kategori</span>
                  </div>
                  {tempCategories.length === 0 && <Check size={16} weight="bold" />}
                </button>

                {/* Daftar Kategori Resmi dengan Checkbox Multi-Select */}
                {categories.map((cat) => {
                  const Icon = getCategoryIcon(cat.name);
                  const isChecked = tempCategories.includes(cat.id);
                  const isPreviewed = (activePreviewCatId || categories[0]?.id) === cat.id;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setActivePreviewCatId(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer border ${isPreviewed
                        ? "border-[#0F4C81]/30 bg-sky-50/60 ring-1 ring-[#0F4C81]/20"
                        : "border-transparent hover:bg-slate-100"
                        } ${isChecked ? "text-[#0F4C81] font-bold" : "text-slate-700"}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {/* Custom Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePreviewCatId(cat.id);
                            setTempCategories((prev) =>
                              isChecked ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                            );
                          }}
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isChecked
                            ? "bg-[#0F4C81] border-[#0F4C81] text-white"
                            : "border-slate-300 bg-white hover:border-[#0F4C81]"
                            }`}
                        >
                          {isChecked && <Check size={11} weight="bold" />}
                        </button>

                        <Icon size={17} weight={isChecked ? "fill" : "regular"} className="shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <CaretRight size={13} weight="bold" className={isPreviewed ? "text-[#0F4C81]" : "text-slate-400"} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Kolom Kanan: Subkategori Sesuai Kategori yang sedang Dilihat (Multi-Select) */}
              <div className="md:col-span-7 p-3 bg-white space-y-2 overflow-y-auto max-h-[320px]">
                {(() => {
                  const currentPreviewCat = categories.find(
                    (c) => c.id === (activePreviewCatId || categories[0]?.id)
                  );
                  const previewCatSubs = currentPreviewCat
                    ? subcategories.filter((s) => s.category_id === currentPreviewCat.id)
                    : [];
                  const allPreviewSubsSelected =
                    previewCatSubs.length > 0 &&
                    previewCatSubs.every((s) => tempSubcategories.includes(s.id));

                  return (
                    <>
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 px-1">
                        <div>
                          <span className="text-[11px] font-bold text-slate-800">
                            Subkategori: {currentPreviewCat?.name || "Pilih Kategori"}
                          </span>
                          <p className="text-[10px] text-slate-400">
                            Bisa memilih beberapa subkategori sekaligus
                          </p>
                        </div>
                        {previewCatSubs.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const subIds = previewCatSubs.map((s) => s.id);
                              if (allPreviewSubsSelected) {
                                // unselect all in this category
                                setTempSubcategories((prev) => prev.filter((id) => !subIds.includes(id)));
                              } else {
                                // select all in this category
                                setTempSubcategories((prev) => Array.from(new Set([...prev, ...subIds])));
                                // Also ensure this category is marked checked
                                if (currentPreviewCat && !tempCategories.includes(currentPreviewCat.id)) {
                                  setTempCategories((prev) => [...prev, currentPreviewCat.id]);
                                }
                              }
                            }}
                            className="text-[10px] font-bold text-[#0F4C81] hover:underline cursor-pointer"
                          >
                            {allPreviewSubsSelected ? "Batalkan Semua" : "Pilih Semua Sub"}
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {previewCatSubs.length === 0 ? (
                          <div className="py-12 text-center text-slate-400 text-xs">
                            Tidak ada subkategori tersedia di kategori ini.
                          </div>
                        ) : (
                          previewCatSubs.map((sub) => {
                            const isSubChecked = tempSubcategories.includes(sub.id);
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  setTempSubcategories((prev) =>
                                    isSubChecked ? prev.filter((id) => id !== sub.id) : [...prev, sub.id]
                                  );
                                  // Auto-include parent category if checking sub
                                  if (!isSubChecked && currentPreviewCat && !tempCategories.includes(currentPreviewCat.id)) {
                                    setTempCategories((prev) => [...prev, currentPreviewCat.id]);
                                  }
                                }}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition text-left border cursor-pointer ${isSubChecked
                                  ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-1 ring-emerald-500/30"
                                  : "border-slate-200/80 hover:bg-slate-50 text-slate-700"
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isSubChecked
                                      ? "bg-emerald-600 border-emerald-600 text-white"
                                      : "border-slate-300 bg-white"
                                      }`}
                                  >
                                    {isSubChecked && <Check size={11} weight="bold" />}
                                  </div>
                                  <span>{sub.name}</span>
                                </div>
                                {isSubChecked && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                                    Terpilih
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

        </div>
      </Modal>
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
