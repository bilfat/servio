"use client";

import React, { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useServices } from "@/features/discovery/useServices";
import { ServiceCard, ServiceCardData } from "@/components/features/services/ServiceCard";
import { FixedDomainId, ServiceOffering } from "@/types/domain";
import { useActiveLocation } from "@/context/LocationContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  MagnifyingGlass,
  Wrench,
  HouseLine,
  Broom,
  GearSix,
  TreeEvergreen,
  Car,
  Sparkle,
  ArrowRight,
  MapPin,
  CheckCircle,
  CircleNotch,
  Funnel,
  CaretRight,
  CaretDown,
  Check,
  SlidersHorizontal,
  ArrowsDownUp,
  X,
  Tag,
  Star,
  ShieldCheck,
} from "@phosphor-icons/react";
import {
  taxonomyApi,
  OFFICIAL_CITIES,
  resolveLocationToCityCode,
  getCityNameByCode,
} from "@/lib/servioApi";

type ServiceSortOption = "RELEVANT" | "PRICE_LOW" | "PRICE_HIGH";

// Category Icons Mapping for JASA
const JASA_CATEGORY_ICONS: Record<string, React.ElementType> = {
  automotive: Car,
  cleaning: Broom,
  environment: TreeEvergreen,
  home: HouseLine,
  building: HouseLine,
  maintenance: GearSix,
  repair: Wrench,
  technical: Wrench,
};

const KNOWN_JASA_CATEGORIES: Record<string, string> = {
  "06e8f70c-6a07-417c-ba04-38cf26976aef": "Automotive",
  "4e7f1415-07ae-4c93-966c-b44172ba4d67": "Cleaning",
  "48cadd7a-6707-4139-b650-4cadc74ca76b": "Environment",
  "92438132-1530-4711-8bf2-4d1c631fabf0": "Home & Building",
  "8c927438-8b79-41ff-a8f4-9e2288e8b5b8": "Maintenance",
  "2e379ce0-0a88-4c9e-8085-1a37fb487b62": "Repair & Technical",
};

function getJasaCategoryIcon(catName?: string, iconName?: string): React.ElementType {
  if (iconName) {
    const key = iconName.toLowerCase();
    if (key.includes("car") || key.includes("auto")) return Car;
    if (key.includes("broom") || key.includes("clean")) return Broom;
    if (key.includes("tree") || key.includes("env")) return TreeEvergreen;
    if (key.includes("house") || key.includes("building") || key.includes("home")) return HouseLine;
    if (key.includes("gear") || key.includes("maint")) return GearSix;
    if (key.includes("wrench") || key.includes("repair")) return Wrench;
  }
  if (catName) {
    const key = catName.toLowerCase();
    if (key.includes("auto") || key.includes("mobil") || key.includes("motor")) return Car;
    if (key.includes("clean") || key.includes("cuci") || key.includes("bersih")) return Broom;
    if (key.includes("env") || key.includes("taman") || key.includes("pohon") || key.includes("lingkungan")) return TreeEvergreen;
    if (key.includes("home") || key.includes("building") || key.includes("bangunan") || key.includes("atap") || key.includes("rumah")) return HouseLine;
    if (key.includes("maint") || key.includes("perawatan") || key.includes("rutin")) return GearSix;
    if (key.includes("repair") || key.includes("teknis") || key.includes("servis") || key.includes("listrik")) return Wrench;
  }
  return Wrench;
}

function categoryCodeToDomainId(code?: string): FixedDomainId {
  if (!code) return "repair";
  const c = code.toUpperCase();
  if (c.includes("REPAIR")) return "repair";
  if (c.includes("BUILDING") || c.includes("HOME")) return "home";
  if (c.includes("CLEAN")) return "cleaning";
  if (c.includes("MAINT")) return "maintenance";
  if (c.includes("ENV")) return "environment";
  if (c.includes("AUTO")) return "automotive";
  return "repair";
}

function ServicesCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const parseParamArray = (val: string | null) => {
    if (!val || val === "ALL") return [];
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  };

  const urlCity = searchParams.get("city") || searchParams.get("city_code");
  const initialSearch = searchParams.get("search") || searchParams.get("q") || "";
  const initialCategoryParam = searchParams.get("category") || searchParams.get("categories");
  const initialSubcategoryParam = searchParams.get("subcategory") || searchParams.get("subcategories");
  const initialSort = (searchParams.get("sort") as ServiceSortOption) || "RELEVANT";

  const { location: activeLocation, openLocationModal, getStoreDistance } = useActiveLocation();

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  const [selectedCityCode, setSelectedCityCode] = useState<string>(() => {
    if (urlCity) return urlCity;
    return resolveLocationToCityCode(activeLocation?.city);
  });

  // Active filters applied to the catalog
  const [selectedCategories, setSelectedCategories] = useState<string[]>(parseParamArray(initialCategoryParam));
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(parseParamArray(initialSubcategoryParam));
  const [sortBy, setSortBy] = useState<ServiceSortOption>(initialSort);

  // Taxonomy lists from backend
  const [categories, setCategories] = useState<{ id: string; name: string; icon_name?: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; category_id: string; name: string }[]>([]);
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(true);

  // Filter Modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempCategories, setTempCategories] = useState<string[]>(parseParamArray(initialCategoryParam));
  const [tempSubcategories, setTempSubcategories] = useState<string[]>(parseParamArray(initialSubcategoryParam));
  const [tempSortBy, setTempSortBy] = useState<ServiceSortOption>(initialSort);
  const [activePreviewCatId, setActivePreviewCatId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Sync with activeLocation from Beranda if no manual URL query overrides
  useEffect(() => {
    if (urlCity) {
      setSelectedCityCode(urlCity);
    } else if (activeLocation?.city) {
      setSelectedCityCode(resolveLocationToCityCode(activeLocation.city));
    }
  }, [urlCity, activeLocation?.city]);

  // Handle city change
  const handleCityChange = (newCode: string) => {
    setSelectedCityCode(newCode);
    const sp = new URLSearchParams(window.location.search);
    sp.set("city", newCode);
    router.replace(`/services?${sp.toString()}`, { scroll: false });
  };

  // Synchronize state when URL search params change (e.g. from Home category clicks)
  useEffect(() => {
    const catParam = searchParams.get("category") || searchParams.get("categories");
    const subParam = searchParams.get("subcategory") || searchParams.get("subcategories");
    const sortParam = (searchParams.get("sort") as ServiceSortOption) || "RELEVANT";
    const searchParam = searchParams.get("search") || searchParams.get("q") || "";

    const parsedCats = parseParamArray(catParam);
    const parsedSubs = parseParamArray(subParam);

    setSelectedCategories(parsedCats);
    setTempCategories(parsedCats);
    setSelectedSubcategories(parsedSubs);
    setTempSubcategories(parsedSubs);
    setSortBy(sortParam);
    setTempSortBy(sortParam);
    if (searchParam) {
      setSearchQuery(searchParam);
      setDebouncedSearch(searchParam);
    }
  }, [searchParams]);

  // Synchronize URL params
  const updateUrlParams = useCallback(
    (cats: string[], subs: string[], search: string, sort: string, city: string) => {
      const sp = new URLSearchParams();
      if (city) sp.set("city", city);
      if (search) sp.set("search", search);
      if (cats.length > 0) sp.set("categories", cats.join(","));
      if (subs.length > 0) sp.set("subcategories", subs.join(","));
      if (sort && sort !== "RELEVANT") sp.set("sort", sort);
      const newQuery = sp.toString() ? `?${sp.toString()}` : "";
      router.replace(`/services${newQuery}`, { scroll: false });
    },
    [router]
  );

  // Fetch taxonomy categories and subcategories for JASA
  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      taxonomyApi.getCategories({ master: "JASA", status: "ACTIVE" }),
      taxonomyApi.getSubcategories({ master: "JASA", status: "ACTIVE" }),
    ])
      .then(([catsRes, subsRes]) => {
        if (!mounted) return;
        if (catsRes.status === "fulfilled" && catsRes.value?.data) {
          const rawCats = catsRes.value.data.filter((c: any) => c.status === "ACTIVE");
          setCategories(
            rawCats.map((c: any) => ({
              id: c.id || c._id,
              name: c.name,
              icon_name: c.icon_name,
            }))
          );
        }
        if (subsRes.status === "fulfilled" && subsRes.value?.data) {
          const rawSubs = subsRes.value.data.filter((s: any) => s.status === "ACTIVE");
          setSubcategories(
            rawSubs.map((s: any) => ({
              id: s.id || s._id,
              category_id: s.category_id || s.categoryId,
              name: s.name,
            }))
          );
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingTaxonomy(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch live services from backend database for the selected city
  const { services, isLoading } = useServices({
    cityCode: selectedCityCode,
    searchQuery: debouncedSearch.trim() || undefined,
  });

  // Calculate active filters count
  const isFilterActive =
    selectedCategories.length > 0 ||
    selectedSubcategories.length > 0 ||
    sortBy !== "RELEVANT";

  const totalActiveFilterCount =
    selectedCategories.length +
    selectedSubcategories.length +
    (sortBy !== "RELEVANT" ? 1 : 0);

  // Open filter modal and synchronize temporary state
  const handleOpenFilterModal = () => {
    setTempCategories([...selectedCategories]);
    setTempSubcategories([...selectedSubcategories]);
    setTempSortBy(sortBy);
    if (!activePreviewCatId && categories.length > 0) {
      setActivePreviewCatId(categories[0].id);
    }
    setIsFilterModalOpen(true);
  };

  // Apply filters from modal
  const handleApplyFilter = () => {
    setSelectedCategories(tempCategories);
    setSelectedSubcategories(tempSubcategories);
    setSortBy(tempSortBy);
    setIsFilterModalOpen(false);
    updateUrlParams(tempCategories, tempSubcategories, debouncedSearch, tempSortBy, selectedCityCode);
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setSortBy("RELEVANT");
    setTempCategories([]);
    setTempSubcategories([]);
    setTempSortBy("RELEVANT");
    updateUrlParams([], [], debouncedSearch, "RELEVANT", selectedCityCode);
  };

  // Remove individual category filter
  const handleRemoveCategory = (catId: string) => {
    const updated = selectedCategories.filter((id) => id !== catId);
    setSelectedCategories(updated);
    // Also remove subcategories belonging to this category
    const catSubIds = subcategories.filter((s) => s.category_id === catId).map((s) => s.id);
    const updatedSubs = selectedSubcategories.filter((id) => !catSubIds.includes(id));
    setSelectedSubcategories(updatedSubs);
    updateUrlParams(updated, updatedSubs, debouncedSearch, sortBy, selectedCityCode);
  };

  // Remove individual subcategory filter
  const handleRemoveSubcategory = (subId: string) => {
    const updated = selectedSubcategories.filter((id) => id !== subId);
    setSelectedSubcategories(updated);
    updateUrlParams(selectedCategories, updated, debouncedSearch, sortBy, selectedCityCode);
  };

  // Filter & Sort services client-side
  const filteredAndSortedServices = useMemo(() => {
    let result = [...services];

    // Filter by categories if selected
    if (selectedCategories.length > 0) {
      result = result.filter((s) => {
        if (!s.categoryId) return false;
        return (
          selectedCategories.includes(s.categoryId) ||
          (s.categoryName && selectedCategories.some((c) => c.toLowerCase() === s.categoryName!.toLowerCase())) ||
          (s.domainId && selectedCategories.some((c) => c.toLowerCase() === s.domainId.toLowerCase()))
        );
      });
    }

    // Filter by subcategories if selected
    if (selectedSubcategories.length > 0) {
      result = result.filter((s) => {
        if (!s.subcategoryId) return false;
        return selectedSubcategories.includes(s.subcategoryId);
      });
    }

    // Filter by search query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.shortDescription && s.shortDescription.toLowerCase().includes(q)) ||
          (s.providerName && s.providerName.toLowerCase().includes(q)) ||
          (s.categoryName && s.categoryName.toLowerCase().includes(q)) ||
          (s.subcategoryName && s.subcategoryName.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (sortBy) {
      case "PRICE_LOW":
        result.sort((a, b) => (a.priceMin ?? a.basePrice) - (b.priceMin ?? b.basePrice));
        break;
      case "PRICE_HIGH":
        result.sort((a, b) => (b.priceMax ?? b.basePrice) - (a.priceMax ?? a.basePrice));
        break;
      default:
        // RELEVANT: keep default order
        break;
    }

    return result;
  }, [services, selectedCategories, selectedSubcategories, debouncedSearch, sortBy]);

  // Transform ServiceOffering to ServiceCardData
  const toCardData = (s: ServiceOffering): ServiceCardData => {
    const resolvedSub = subcategories.find((sub) => sub.id === s.subcategoryId);
    const resolvedCat = categories.find((c) => c.id === s.categoryId || c.name.toLowerCase() === s.categoryName?.toLowerCase());
    const resolvedCategory =
      resolvedSub?.name ||
      (s.subcategoryName && s.subcategoryName !== "Subkategori" ? s.subcategoryName : null) ||
      resolvedCat?.name ||
      (s.categoryName && s.categoryName !== "Kategori Jasa" && s.categoryName !== "Servis & Perbaikan" ? s.categoryName : null) ||
      "Layanan Jasa";

    // Distance calculated from active user location (GPS)
    const distanceStr = getStoreDistance({
      city: activeLocation?.city,
      latitude: activeLocation?.latitude,
      longitude: activeLocation?.longitude,
      name: s.providerName,
      id: s.providerId || s.id,
    });

    return {
      id: s.id,
      title: s.title,
      category: resolvedCategory,
      price: s.basePrice,
      priceMin: s.priceMin ?? s.basePrice,
      priceMax: s.priceMax ?? s.basePrice,
      pricingModel: s.pricingModel,
      providerName: s.providerName || "Penyedia Jasa",
      isVerifiedProvider: s.isVerifiedProvider,
      thumbnailUrl: s.thumbnailUrl,
      description: s.description || s.shortDescription || "",
      distance: distanceStr,
      surveyFee: s.surveyFee,
      surveyFeeModel: s.surveyFeeModel,
      durationMin: s.durationMin,
      durationMax: s.durationMax,
      durationUnit: s.durationUnit,
    };
  };

  const activeCityName = getCityNameByCode(selectedCityCode);

  return (
    <div className="min-h-screen bg-white pb-24 font-body">
      {/* ========================================================================= */}
      {/* 1. HEADER & SEARCH BAR (IDENTIK DENGAN NAVIGASI /PRODUCTS)               */}
      {/* ========================================================================= */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="w-full max-w-[1440px] 2xl:max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  Layanan Jasa Teknisi &amp; Perbaikan Resmi
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck size={13} weight="fill" className="text-emerald-600" />
                  Garansi Escrow &amp; Mitra Terverifikasi
                </span>
              </div>
              <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">
                Katalog Layanan Jasa Terstandarisasi
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Ratusan spesialisasi teknis bergaransi resmi Servio yang dikerjakan oleh mitra teknisi berlisensi dan dilindungi garansi escrow.
              </p>
            </div>

            {/* Smart Discovery AI Consultation Shortcut */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <Link
                href="/smart-discovery"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-sky-50 text-[#0F4C81] border border-sky-200 text-xs font-bold hover:bg-sky-100 transition shadow-2xs"
              >
                <Sparkle size={16} weight="fill" className="text-primary" />
                <span>Diagnosa AI Gratis</span>
              </Link>
            </div>
          </div>

          {/* Search, Filter Button, and GPS Location */}
          <div className="mt-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search + Filter Button Group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-3xl">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[260px]">
                <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Cari servis AC, montir mobil, pipa bocor, teknisi di ${activeCityName}...`}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0F4C81] focus:bg-white transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X size={14} weight="bold" />
                  </button>
                )}
              </div>

              {/* Tombol Filter (Sebelah Search) */}
              <button
                type="button"
                onClick={handleOpenFilterModal}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isFilterActive
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

              {/* Tag Ringkasan Filter Terpilih di Samping Tombol Filter */}
              {isFilterActive && (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold animate-in fade-in truncate max-w-[340px]">
                  <Tag size={13} weight="bold" className="text-emerald-700 shrink-0" />
                  <span className="truncate">
                    {[
                      sortBy === "PRICE_LOW" ? "Harga Terendah" : null,
                      sortBy === "PRICE_HIGH" ? "Harga Tertinggi" : null,
                      selectedCategories.length > 0 ? `${selectedCategories.length} Kategori` : null,
                      selectedSubcategories.length > 0 ? `${selectedSubcategories.length} Sub` : null,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
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

            {/* GPS Location Pill (Terhubung Langsung dari Home / Beranda) */}
            <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto shrink-0">
              <button
                type="button"
                onClick={openLocationModal}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0F4C81] border border-sky-200 text-xs font-semibold transition cursor-pointer shadow-2xs"
                title="Titik GPS aktif terhubung dari Home / Beranda"
              >
                <div className="relative flex items-center justify-center">
                  <MapPin
                    size={16}
                    weight="fill"
                    className={activeLocation.isGps ? "text-emerald-600" : "text-[#0F4C81]"}
                  />
                  {activeLocation.isGps && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  )}
                </div>
                <span className="truncate max-w-[150px]">
                  {activeLocation.isGps ? "GPS: " : "Kirim ke: "}
                  <strong>{activeLocation.city || activeCityName}</strong>
                </span>
                <span className="text-[10px] text-sky-700 underline font-bold">Ubah</span>
              </button>

              {/* Quick City Selector Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500">Kota:</span>
                <select
                  value={selectedCityCode}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="text-xs font-bold text-primary bg-transparent focus:outline-none cursor-pointer"
                >
                  {OFFICIAL_CITIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. ACTIVE FILTER CHIPS (MUNCUL DI BAWAH SEARCH & FILTER)                 */}
          {/* ========================================================================= */}
          {isFilterActive && (
            <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <SlidersHorizontal size={13} className="text-[#0F4C81]" />
                Filter Aktif ({totalActiveFilterCount}):
              </span>

              {/* Chip Urutan Harga / Rating */}
              {sortBy !== "RELEVANT" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-700 text-white font-semibold text-xs shadow-xs">
                  <ArrowsDownUp size={12} weight="bold" />
                  <span>
                    {sortBy === "PRICE_LOW"
                      ? "Harga: Terendah"
                      : sortBy === "PRICE_HIGH"
                      ? "Harga: Tertinggi"
                      : "Rating Tertinggi"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("RELEVANT");
                      updateUrlParams(selectedCategories, selectedSubcategories, debouncedSearch, "RELEVANT", selectedCityCode);
                    }}
                    className="p-0.5 hover:bg-sky-600 rounded-full cursor-pointer ml-0.5 transition"
                    title="Kembalikan urutan normal"
                  >
                    <X size={11} weight="bold" />
                  </button>
                </span>
              )}

              {/* Chip Kategori */}
              {selectedCategories.map((catId) => {
                const cat = categories.find((c) => c.id === catId || c.name.toLowerCase() === catId.toLowerCase());
                const catLabel = cat?.name || KNOWN_JASA_CATEGORIES[catId] || catId;
                const IconComponent = getJasaCategoryIcon(cat?.name || KNOWN_JASA_CATEGORIES[catId], cat?.icon_name);
                return (
                  <span
                    key={`cat-${catId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F4C81] text-white font-semibold text-xs shadow-xs"
                  >
                    <IconComponent size={12} weight="bold" className="text-sky-200" />
                    <span className="text-sky-200 text-[10px] uppercase font-bold">Kategori:</span>
                    <span>{catLabel}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(catId)}
                      className="p-0.5 hover:bg-white/20 rounded-full transition ml-0.5 cursor-pointer"
                      title={`Hapus filter ${catLabel}`}
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </span>
                );
              })}

              {/* Chip Subkategori */}
              {selectedSubcategories.map((subId) => {
                const sub = subcategories.find((s) => s.id === subId);
                if (!sub) return null;
                return (
                  <span
                    key={`sub-${subId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-semibold text-xs border border-emerald-300 shadow-xs"
                  >
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

      {/* ========================================================================= */}
      {/* 5. SERVICES CATALOG GRID (CARD KATALOG LAYANAN DENGAN INFORMASI LENGKAP)  */}
      {/* ========================================================================= */}
      <div className="w-full max-w-[1440px] 2xl:max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h2 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
              <span>Layanan Tersedia di {activeCityName}</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {isLoading ? "Memuat..." : `${filteredAndSortedServices.length} Layanan`}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap kartu jasa menyertakan rentang biaya, biaya survei, nama penyedia, estimasi jarak GPS, dan durasi pengerjaan.
            </p>
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 animate-pulse">
                <div className="h-44 rounded-xl bg-slate-100" />
                <div className="h-4 w-3/4 rounded bg-slate-100" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
                <div className="h-10 rounded-xl bg-slate-100 mt-4" />
              </div>
            ))}
          </div>
        ) : filteredAndSortedServices.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center rounded-3xl bg-slate-50 border border-slate-200/90 max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <MapPin size={28} weight="duotone" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-neutral-dark">
                Tidak Ada Layanan yang Cocok di {activeCityName}
              </h3>
              <p className="text-xs text-neutral-slate max-w-sm mx-auto">
                {isFilterActive
                  ? "Tidak ada layanan yang sesuai dengan kombinasi filter Anda. Coba hapus beberapa filter atau ubah kata kunci pencarian."
                  : `Mitra teknisi resmi belum tersedia untuk wilayah administratif ${selectedCityCode}. Silakan pilih kota terdekat.`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              {isFilterActive ? (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition shadow-xs cursor-pointer"
                >
                  Reset Semua Filter
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleCityChange("JKT-SEL")}
                    className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition shadow-xs cursor-pointer"
                  >
                    Lihat Jakarta Selatan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCityChange("JKT-BARAT")}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition shadow-xs cursor-pointer"
                  >
                    Lihat Jakarta Barat
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Real Services Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredAndSortedServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={toCardData(service)}
                onBook={(id: string) => router.push(`/services/${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2 & 3. MODAL FILTER KATALOG LAYANAN JASA (MULTI-SELECT & STICKY FOOTER)   */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Katalog Layanan Jasa"
        description="Pilih kategori, subkategori, dan urutan harga sesuai kebutuhan servis Anda."
        maxWidth="3xl"
        footer={
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setTempCategories([]);
                setTempSubcategories([]);
                setTempSortBy("RELEVANT");
              }}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 transition cursor-pointer"
            >
              Reset Semua Filter
            </button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterModalOpen(false)}
              >
                Batalkan
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
          {/* SECTION 1: FILTER HARGA & URUTAN */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50/80 via-blue-50/40 to-sky-50/60 border border-sky-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-[#0F4C81] flex items-center justify-center shrink-0 shadow-2xs">
                  <ArrowsDownUp size={16} weight="bold" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900">Urutkan Layanan Jasa</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-[#0F4C81] font-bold border border-sky-300">
                      Pengurutan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Urutkan berdasarkan rekomendasi platform, harga terendah, harga tertinggi, atau rating teknisi.
                  </p>
                </div>
              </div>
              {tempSortBy !== "RELEVANT" && (
                <button
                  type="button"
                  onClick={() => setTempSortBy("RELEVANT")}
                  className="text-xs text-[#0F4C81] hover:underline font-bold cursor-pointer shrink-0 ml-2"
                >
                  Reset Urutan
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {[
                {
                  id: "RELEVANT",
                  label: "Paling Relevan",
                  desc: "Rekomendasi teknisi terdekat",
                  icon: Sparkle,
                },
                {
                  id: "PRICE_LOW",
                  label: "Harga Terendah",
                  desc: "Mulai dari biaya termurah",
                  icon: ArrowsDownUp,
                },
                {
                  id: "PRICE_HIGH",
                  label: "Harga Tertinggi",
                  desc: "Spesialisasi teknisi premium",
                  icon: Tag,
                },
              ].map((opt) => {
                const isSelected = tempSortBy === opt.id;
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTempSortBy(opt.id as ServiceSortOption)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-white border-[#0F4C81] shadow-sm ring-2 ring-[#0F4C81]/25"
                        : "bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? "bg-[#0F4C81] text-white" : "bg-slate-100 text-slate-500"
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

          {/* SECTION 2: FILTER KATEGORI & SUBKATEGORI (MULTI-SELECT) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-sky-50 text-[#0F4C81] flex items-center justify-center shrink-0 shadow-2xs">
                  <Wrench size={16} weight="bold" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900">
                      Filter Berdasarkan Kategori &amp; Subkategori Jasa
                    </h3>
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
              {/* Kolom Kiri: Kategori Utama dengan Format 'icon | nama kategori' */}
              <div className="md:col-span-5 bg-white border-r border-slate-200/80 p-3 space-y-1.5 overflow-y-auto max-h-[340px]">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1">
                  <span>Kategori Jasa</span>
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    tempCategories.length === 0 ? "bg-[#0F4C81] text-white shadow-xs" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wrench size={16} weight={tempCategories.length === 0 ? "fill" : "regular"} />
                    <span className="text-slate-300 font-light mx-0.5">|</span>
                    <span>Semua Kategori</span>
                  </div>
                  {tempCategories.length === 0 && <Check size={16} weight="bold" />}
                </button>

                {/* List Kategori dengan icon | nama kategori */}
                {isLoadingTaxonomy ? (
                  <div className="p-4 text-center text-xs text-slate-400 space-y-2">
                    <CircleNotch size={18} className="animate-spin text-primary mx-auto" />
                    <p>Memuat kategori...</p>
                  </div>
                ) : (
                  categories.map((cat) => {
                    const IconComponent = getJasaCategoryIcon(cat.name, cat.icon_name);
                    const isChecked = tempCategories.includes(cat.id);
                    const isPreviewed = (activePreviewCatId || categories[0]?.id) === cat.id;

                    return (
                      <div
                        key={cat.id}
                        onClick={() => setActivePreviewCatId(cat.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer border ${
                          isPreviewed
                            ? "border-[#0F4C81]/30 bg-sky-50/60 ring-1 ring-[#0F4C81]/20"
                            : "border-transparent hover:bg-slate-100"
                        } ${isChecked ? "text-[#0F4C81] font-bold" : "text-slate-700"}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          {/* Multi-Select Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePreviewCatId(cat.id);
                              setTempCategories((prev) =>
                                isChecked ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                              );
                            }}
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                              isChecked
                                ? "bg-[#0F4C81] border-[#0F4C81] text-white"
                                : "border-slate-300 bg-white hover:border-[#0F4C81]"
                            }`}
                          >
                            {isChecked && <Check size={11} weight="bold" />}
                          </button>

                          {/* Format: icon | nama kategori */}
                          <div className="flex items-center gap-1.5 truncate">
                            <IconComponent size={16} weight={isChecked ? "fill" : "regular"} className="shrink-0 text-[#0F4C81]" />
                            <span className="text-slate-300 font-light mx-0.5 select-none">|</span>
                            <span className="truncate">{cat.name}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <CaretRight size={13} weight="bold" className={isPreviewed ? "text-[#0F4C81]" : "text-slate-400"} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Kolom Kanan: Subkategori Multi-Select */}
              <div className="md:col-span-7 p-3 bg-white space-y-2 overflow-y-auto max-h-[340px]">
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
                            Pilih beberapa subkategori sekaligus
                          </p>
                        </div>
                        {previewCatSubs.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const subIds = previewCatSubs.map((s) => s.id);
                              if (allPreviewSubsSelected) {
                                setTempSubcategories((prev) => prev.filter((id) => !subIds.includes(id)));
                              } else {
                                setTempSubcategories((prev) => Array.from(new Set([...prev, ...subIds])));
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
                                  // Auto-select parent category if checking sub
                                  if (!isSubChecked && currentPreviewCat && !tempCategories.includes(currentPreviewCat.id)) {
                                    setTempCategories((prev) => [...prev, currentPreviewCat.id]);
                                  }
                                }}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition text-left border cursor-pointer ${
                                  isSubChecked
                                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-1 ring-emerald-500/30"
                                    : "border-slate-200/80 hover:bg-slate-50 text-slate-700"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                      isSubChecked
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

export default function ServicesCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-400">
          <CircleNotch size={24} className="animate-spin text-primary mr-2" />
          Memuat katalog layanan jasa SERVIO...
        </div>
      }
    >
      <ServicesCatalogContent />
    </Suspense>
  );
}
