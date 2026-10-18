"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useServices } from "@/features/discovery/useServices";
import { ServiceCard, ServiceCardData } from "@/components/features/services/ServiceCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { FixedDomainId, ServiceOffering } from "@/types/domain";
import { useDomainRepository } from "@/lib/repository/domainRepository";
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
} from "@phosphor-icons/react";

import { taxonomyApi } from "@/lib/servioApi";

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  repair: <Wrench size={24} weight="duotone" className="text-primary" />,
  home: <HouseLine size={24} weight="duotone" className="text-blue-600" />,
  cleaning: <Broom size={24} weight="duotone" className="text-teal-600" />,
  maintenance: <GearSix size={24} weight="duotone" className="text-amber-600" />,
  environment: <TreeEvergreen size={24} weight="duotone" className="text-emerald-600" />,
  automotive: <Car size={24} weight="duotone" className="text-rose-600" />,
};

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

export default function ServicesCatalogPage() {
  const repo = useDomainRepository();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<FixedDomainId | "all">("all");
  const [canonicalCategories, setCanonicalCategories] = useState<{ id: string; domainId: FixedDomainId; name: string; code?: string; status: string; subcategoriesCount: number }[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  React.useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      taxonomyApi.getCategories({ master: "JASA", status: "ACTIVE" }),
      taxonomyApi.getSubcategories({ master: "JASA", status: "ACTIVE" }),
    ]).then(([catsRes, subsRes]) => {
      if (!mounted) return;
      if (catsRes.status === "fulfilled" && catsRes.value?.data) {
        const subcats = subsRes.status === "fulfilled" && subsRes.value?.data ? subsRes.value.data : [];
        const cats = catsRes.value.data
          .filter((c: any) => c.status === "ACTIVE" && (c.master_code === "JASA" || !c.master_code))
          .map((c: any) => {
            const catId = c.id || c._id;
            return {
              id: catId,
              domainId: categoryCodeToDomainId(c.code || c.name),
              name: c.name,
              code: c.code,
              status: c.status,
              subcategoriesCount: subcats.filter((s: any) => (s.category_id === catId || s.categoryId === catId) && s.status === "ACTIVE").length,
            };
          });
        setCanonicalCategories(cats);
      }
    }).finally(() => {
      if (mounted) setIsLoadingCategories(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const displayDomains = canonicalCategories;

  const { services } = useServices(
    selectedDomain !== "all" ? { domainId: selectedDomain } : undefined
  );

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.shortDescription.toLowerCase().includes(q) ||
        s.providerName.toLowerCase().includes(q)
    );
  }, [services, searchQuery]);

  const toCardData = (s: ServiceOffering): ServiceCardData => {
    const wConfig = repo.getServiceWarrantyConfig(s.id);
    const hasWarranty = wConfig ? wConfig.warrantyEnabled : s.warrantyDays > 0;
    const resolvedCategory = s.subcategoryName || s.categoryName || repo.subcategories.find((sub) => sub.id === s.subcategoryId)?.name || "Layanan";

    return {
      id: s.id,
      title: s.title,
      category: resolvedCategory,
      price: s.basePrice,
      priceMin: s.priceMin ?? s.basePrice,
      priceMax: s.priceMax ?? s.basePrice,
      pricingModel: s.pricingModel,
      rating: s.rating,
      reviewCount: s.reviewCount,
      warrantyDays: wConfig ? wConfig.durationDays : s.warrantyDays,
      warrantyEnabled: hasWarranty,
      providerName: s.providerName,
      isVerifiedProvider: s.isVerifiedProvider,
      thumbnailUrl: s.thumbnailUrl,
      description: s.description || s.shortDescription || "",
    };
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Katalog Layanan Jasa Terstandarisasi"
        description="Jelajahi ratusan spesialisasi teknis bergaransi resmi Servio yang dikerjakan oleh mitra teknisi berlisensi dan dilindungi garansi escrow."
        breadcrumbs={[
          { label: "Servio", href: "/" },
          { label: "Layanan Jasa" },
        ]}
      />

      {/* Search and Domain Filters */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-200/80 bg-white shadow-servio-xs space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-muted">
            <MagnifyingGlass size={18} weight="bold" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari servis AC, renovasi, teknisi listrik, cuci toren, tune up mobil..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-100/80 border border-slate-200 text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
          />
        </div>

        {/* Dynamic Domain Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedDomain("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${selectedDomain === "all"
              ? "bg-primary text-white shadow-servio-xs"
              : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
              }`}
          >
            Semua Domain ({displayDomains.length})
          </button>
          {isLoadingCategories ? (
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-24 rounded-xl bg-slate-200 animate-pulse shrink-0" />
              ))}
            </div>
          ) : (
            displayDomains.map((domain) => {
              const isSelected = selectedDomain === domain.domainId;
              return (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => setSelectedDomain(domain.domainId)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${isSelected
                    ? "bg-primary text-white shadow-servio-xs"
                    : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
                    }`}
                >
                  <span>{domain.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
                    {domain.subcategoriesCount}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Domain Cards Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-neutral-dark">
            Kategori Servio
          </h2>
          <Link
            href="/categories"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>Lihat Layanan Servio Lainnya</span>
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>

        {isLoadingCategories ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-100 animate-pulse h-28" />
            ))}
          </div>
        ) : displayDomains.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-200 text-xs text-neutral-slate">
            Belum ada kategori layanan aktif di database.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {displayDomains.map((d) => (
              <Link
                key={d.id}
                href={`/categories/${d.id}`}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-primary/50 hover:shadow-servio-xs transition-all flex flex-col items-center text-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  {DOMAIN_ICONS[d.domainId] || <Wrench size={22} />}
                </div>
                <p className="text-xs font-bold text-neutral-dark group-hover:text-primary transition-colors">
                  {d.name}
                </p>
                <p className="text-[11px] text-neutral-muted mt-0.5">
                  {d.subcategoriesCount} Subkategori
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Smart Discovery Callout */}
      <div className="glass-card p-5 rounded-3xl border border-sky-200 bg-sky/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-primary text-white shrink-0">
            <Sparkle size={22} weight="fill" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xs sm:text-sm text-neutral-dark">
              Bingung Menentukan Jenis Kerusakan?
            </h3>
            <p className="text-xs text-neutral-slate mt-0.5">
              Gunakan Asisten Diagnosa AI untuk mencocokkan gejala dengan estimasi biaya dan suku cadang yang dibutuhkan.
            </p>
          </div>
        </div>
        <Link
          href="/smart-discovery"
          className="shrink-0 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark transition shadow-servio-xs"
        >
          Konsultasi AI Gratis
        </Link>
      </div>

      {/* Services Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-neutral-dark">
            Daftar Layanan ({filteredServices.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={toCardData(service)}
              onBook={(id: string) => router.push(`/services/${id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
