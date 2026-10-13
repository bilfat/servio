"use client";

import React, { Suspense, useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useServices } from "@/features/discovery/useServices";
import { useProviders } from "@/features/discovery/useProviders";
import { productsApi } from "@/lib/servioApi";
import { ServiceCard, ServiceCardData } from "@/components/features/services/ServiceCard";
import { ProviderCard, ProviderCardData } from "@/components/features/providers/ProviderCard";
import { ProductCard, ProductCardData } from "@/components/features/products/ProductCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ServiceOffering, ServiceProvider, ApiProduct, FixedDomainId, ServiceMode, getProductMediaUrl } from "@/types/domain";
import {
  MagnifyingGlass,
  Funnel,
  ArrowsDownUp,
  Star,
  Wrench,
  Storefront,
  Cube,
  X,
  Sparkle,
} from "@phosphor-icons/react";

function SearchPageSkeleton() {
  return (
    <div className="space-y-6 pb-16 animate-pulse">
      <div className="h-28 bg-slate-100 rounded-3xl border border-slate-200" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="h-80 bg-slate-100 rounded-3xl" />
        <div className="lg:col-span-3 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-slate-100 rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialCategory = (searchParams.get("category") as FixedDomainId | "all") || "all";

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<"all" | "services" | "products" | "providers">("all");
  const [selectedDomain, setSelectedDomain] = useState<FixedDomainId | "all">(initialCategory);
  const [selectedServiceMode, setSelectedServiceMode] = useState<string>("ALL");
  const [minRating, setMinRating] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(2000000);
  const [sortBy, setSortBy] = useState<"recommended" | "price_asc" | "price_desc" | "rating">("recommended");

  const { services } = useServices(
    selectedDomain !== "all" ? { domainId: selectedDomain } : undefined
  );
  const { providers } = useProviders();

  // Filtered Services without any-cast
  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      const matchQuery =
        !query ||
        srv.title.toLowerCase().includes(query.toLowerCase()) ||
        srv.shortDescription.toLowerCase().includes(query.toLowerCase()) ||
        srv.fullDescription.toLowerCase().includes(query.toLowerCase());
      const matchRating = srv.rating >= minRating;
      const matchPrice = srv.basePrice <= maxPrice;
      const matchMode =
        selectedServiceMode === "ALL" ||
        srv.serviceModes.includes(selectedServiceMode as ServiceMode);
      return matchQuery && matchRating && matchPrice && matchMode;
    });
  }, [services, query, minRating, maxPrice, selectedServiceMode]);

  // Filtered Providers
  const filteredProviders = useMemo(() => {
    return providers.filter((prov) => {
      const matchQuery =
        !query ||
        prov.name.toLowerCase().includes(query.toLowerCase()) ||
        prov.city.toLowerCase().includes(query.toLowerCase());
      const matchRating = prov.rating >= minRating;
      return matchQuery && matchRating;
    });
  }, [providers, query, minRating]);

  const [dbProducts, setDbProducts] = useState<ApiProduct[]>([]);

  useEffect(() => {
    productsApi
      .list({ scope: "public" })
      .then((res) => {
        if (res.data) setDbProducts(res.data);
      })
      .catch(() => {});
  }, []);

  // Filtered Products from Database
  const filteredProducts = useMemo(() => {
    return dbProducts.filter((prod) => {
      const matchQuery =
        !query ||
        prod.name.toLowerCase().includes(query.toLowerCase()) ||
        (prod.categoryName && prod.categoryName.toLowerCase().includes(query.toLowerCase())) ||
        (prod.brandName && prod.brandName.toLowerCase().includes(query.toLowerCase()));
      const price = prod.variants?.[0]?.price ?? prod.minPrice ?? 0;
      const matchPrice = price <= maxPrice;
      return matchQuery && matchPrice;
    });
  }, [dbProducts, query, maxPrice]);

  const totalResults =
    (activeTab === "all" || activeTab === "services" ? filteredServices.length : 0) +
    (activeTab === "all" || activeTab === "products" ? filteredProducts.length : 0) +
    (activeTab === "all" || activeTab === "providers" ? filteredProviders.length : 0);

  const handleResetFilters = () => {
    setSelectedDomain("all");
    setSelectedServiceMode("ALL");
    setMinRating(0);
    setMaxPrice(2000000);
    setQuery("");
  };

  const toServiceCard = (s: ServiceOffering): ServiceCardData => ({
    id: s.id,
    title: s.title,
    category: s.subcategoryName || s.categoryName || "Layanan",
    price: s.basePrice,
    priceMin: s.priceMin ?? s.basePrice,
    priceMax: s.priceMax ?? s.basePrice,
    pricingModel: s.pricingModel,
    rating: s.rating,
    reviewCount: s.reviewCount,
    warrantyDays: s.warrantyDays,
    providerName: s.providerName,
    isVerifiedProvider: s.isVerifiedProvider,
    thumbnailUrl: s.thumbnailUrl,
    description: s.description || s.shortDescription || "",
  });

  const toProviderCard = (p: ServiceProvider): ProviderCardData => ({
    id: p.id,
    name: p.name,
    businessType: p.businessType,
    avatarInitials: p.avatarInitials,
    rating: p.rating,
    completedJobs: p.completedJobs,
    operationalHours: p.operationalHoursSummary,
    workRadiusKm: p.workRadiusKm,
    city: p.city,
    specialties: p.specialties,
    isVerified: p.isVerified,
  });

  const toProductCard = (p: ApiProduct): ProductCardData => {
    const defaultVariant = p.variants?.[0];
    return {
      id: p.productId,
      title: p.name,
      category: p.categoryName || p.categoryId,
      price: defaultVariant?.price ?? p.minPrice ?? 0,
      stock: p.totalStock ?? defaultVariant?.stock ?? 10,
      compatibilityTags: p.brandName ? [p.brandName] : ["Universal OEM"],
      merchantName: p.merchantName || "Toko Sparepart Glodok",
      rating: 4.9,
      thumbnailUrl: getProductMediaUrl(p.media),
      warrantyMonths: p.warrantyPolicy?.durationMonths ?? 0,
    };
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Search Header Bar */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-200/80 bg-white shadow-servio-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-muted">
              <MagnifyingGlass size={18} weight="bold" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari perbaikan AC, ganti oli, teknisi listrik, sparepart..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-100/80 border border-slate-200 text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-muted hover:text-neutral-dark"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
            <div className="flex items-center gap-1 text-xs text-neutral-slate">
              <ArrowsDownUp size={15} />
              <select
                value={sortBy}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSortBy(
                    e.target.value as "recommended" | "price_asc" | "price_desc" | "rating"
                  )
                }
                className="bg-slate-100 rounded-xl px-2.5 py-2 text-xs font-semibold text-neutral-dark border-none focus:outline-none cursor-pointer"
              >
                <option value="recommended">Rekomendasi</option>
                <option value="price_asc">Harga Termurah</option>
                <option value="price_desc">Harga Tertinggi</option>
                <option value="rating">Rating Tertinggi</option>
              </select>
            </div>
          </div>
        </form>

        {/* 4 Tabs Filter */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 overflow-x-auto">
          {[
            { id: "all", label: "Semua Hasil", count: totalResults, icon: Funnel },
            { id: "services", label: "Jasa Servis", count: filteredServices.length, icon: Wrench },
            { id: "products", label: "Produk & Suku Cadang", count: filteredProducts.length, icon: Cube },
            { id: "providers", label: "Mitra Bengkel", count: filteredProviders.length, icon: Storefront },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id as "all" | "services" | "products" | "providers")
                }
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? "bg-primary text-white shadow-servio-xs"
                    : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
                }`}
              >
                <Icon size={14} weight={isActive ? "fill" : "regular"} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-200 text-neutral-slate"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Results Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Filter Sidebar */}
        <aside className="space-y-6">
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-servio-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-display font-bold text-xs uppercase tracking-wider text-neutral-dark">
                Filter Pencarian
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                Reset
              </button>
            </div>

            {/* Domain Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-dark block">Kategori Domain</label>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value as FixedDomainId | "all")}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 border-none text-xs text-neutral-dark focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Semua Domain (6 Kategori)</option>
                <option value="repair">Repair & Technical</option>
                <option value="home">Home & Building</option>
                <option value="cleaning">Cleaning</option>
                <option value="maintenance">Maintenance</option>
                <option value="environment">Environment</option>
                <option value="automotive">Automotive</option>
              </select>
            </div>

            {/* Service Mode Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-dark block">Mode Pelaksanaan</label>
              <div className="space-y-1.5">
                {[
                  { id: "ALL", label: "Semua Mode" },
                  { id: "HOME_SERVICE", label: "Home Service (Kunjungan)" },
                  { id: "WORKSHOP", label: "Workshop (Antar Sendiri)" },
                ].map((mode) => (
                  <label
                    key={mode.id}
                    className="flex items-center gap-2 text-xs text-neutral-slate hover:text-neutral-dark cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="serviceMode"
                      value={mode.id}
                      checked={selectedServiceMode === mode.id}
                      onChange={(e) => setSelectedServiceMode(e.target.value)}
                      className="accent-primary"
                    />
                    <span>{mode.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Minimum Rating */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-dark block">Rating Minimum</label>
              <div className="flex items-center gap-2">
                {[0, 4.0, 4.5, 4.8].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setMinRating(r)}
                    className={`flex-1 py-1 rounded-xl text-xs font-bold border transition-all ${
                      minRating === r
                        ? "bg-amber-50 border-amber-300 text-amber-700"
                        : "border-slate-200 text-neutral-slate hover:bg-slate-50"
                    }`}
                  >
                    {r === 0 ? "Semua" : `${r}★`}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-dark">Batas Harga Maks:</span>
                <span className="text-primary font-mono font-bold">
                  Rp {maxPrice.toLocaleString("id-ID")}
                </span>
              </div>
              <input
                type="range"
                min={50000}
                max={3000000}
                step={50000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          </div>
        </aside>

        {/* Right Search Results Stream */}
        <main className="lg:col-span-3 space-y-6">
          {totalResults === 0 && (
            <EmptyState
              title="Tidak Ada Hasil yang Cocok"
              description={`Tidak ditemukan layanan atau produk dengan kata kunci "${query}". Cobalah gunakan kata kunci yang lebih umum atau sesuaikan filter Anda.`}
              action={
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-servio-xs hover:bg-primary-dark transition"
                >
                  Reset Seluruh Filter
                </button>
              }
            />
          )}

          {/* 1. Services Section */}
          {(activeTab === "all" || activeTab === "services") && filteredServices.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-neutral-dark flex items-center gap-2">
                  <Wrench size={18} className="text-primary" weight="duotone" />
                  Layanan Jasa Servis ({filteredServices.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={toServiceCard(service)}
                    onBook={(id: string) => router.push(`/services/${id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 2. Products Section */}
          {(activeTab === "all" || activeTab === "products") && filteredProducts.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-neutral-dark flex items-center gap-2">
                  <Cube size={18} className="text-primary" weight="duotone" />
                  Suku Cadang & Komponen Fisik ({filteredProducts.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.productId}
                    product={toProductCard(product)}
                    onAddToCart={() => router.push(`/products/${product.productId}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3. Providers Section */}
          {(activeTab === "all" || activeTab === "providers") && filteredProviders.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-neutral-dark flex items-center gap-2">
                  <Storefront size={18} className="text-primary" weight="duotone" />
                  Mitra Bengkel & Provider Terverifikasi ({filteredProviders.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredProviders.map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={toProviderCard(provider)}
                    onBook={(id: string) => router.push(`/providers/${id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}
