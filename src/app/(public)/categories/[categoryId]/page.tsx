"use client";

import React, { Suspense, useState, useMemo, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { taxonomyApi } from "@/lib/servioApi";
import { useServices } from "@/features/discovery/useServices";
import { ServiceCard, ServiceCardData } from "@/components/features/services/ServiceCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { CATEGORY_ICON_MAP } from "@/config/navigation";
import { ServiceOffering } from "@/types/domain";
import { Sparkle, Wrench, CircleNotch } from "@phosphor-icons/react";

interface CategoryDetailData {
  id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  status: string;
}

interface SubcategoryDetailData {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  status: string;
}

const CATEGORY_BADGES: Record<string, string> = {
  "Repair & Technical": "Paling Populer",
  "Cleaning": "Diskon Promo",
  "Maintenance": "Paket Rutin",
};

function CategoryDetailSkeleton() {
  return (
    <div className="space-y-8 pb-16 animate-pulse">
      <div className="h-28 bg-slate-100 rounded-3xl border border-slate-200" />
      <div className="h-10 bg-slate-100 rounded-2xl w-3/4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-72 bg-slate-100 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

function CategoryDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCategoryId = (params?.categoryId as string) || "";
  const initialSub = searchParams.get("sub");

  const [category, setCategory] = useState<CategoryDetailData | null>(null);
  const [subcategories, setSubcategories] = useState<SubcategoryDetailData[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(initialSub || null);
  const [isLoadingCategory, setIsLoadingCategory] = useState(true);
  const [categoryNotFound, setCategoryNotFound] = useState(false);

  // Fetch Category Detail & Subcategories directly from Category Service
  useEffect(() => {
    let isMounted = true;
    if (!rawCategoryId) return;

    setIsLoadingCategory(true);
    setCategoryNotFound(false);

    taxonomyApi
      .getCategory(rawCategoryId)
      .then(async (res) => {
        if (!isMounted) return;
        const catData = res.data;
        if (!catData || !catData.id) {
          setCategoryNotFound(true);
          return;
        }

        setCategory({
          id: catData.id,
          name: catData.name,
          description: catData.description,
          icon_name: catData.icon_name,
          status: catData.status,
        });

        // Fetch subcategories for this category
        try {
          const subRes = await taxonomyApi.getSubcategories({
            category_id: catData.id,
            status: "ACTIVE",
          });
          if (isMounted && subRes.data && Array.isArray(subRes.data)) {
            setSubcategories(
              subRes.data.map((s: any) => ({
                id: s.id,
                category_id: s.category_id,
                name: s.name,
                description: s.description,
                status: s.status,
              }))
            );
          }
        } catch {
          // Keep empty subcategories on fetch failure
        }
      })
      .catch((err) => {
        console.warn("Category detail API lookup failed:", err);
        if (isMounted) {
          setCategoryNotFound(true);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingCategory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [rawCategoryId]);

  // Keep selectedSubId synced with search params if user navigates back/forward
  useEffect(() => {
    if (initialSub) {
      setSelectedSubId(initialSub);
    }
  }, [initialSub]);

  // Load all available services from catalog
  const { services, isLoading: isLoadingServices } = useServices();

  // Normalize string for fuzzy matching
  const normalize = (str?: string) =>
    (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // Filter services by active category and selected subcategory
  const filteredServices = useMemo(() => {
    if (!category) return [];

    const catNorm = normalize(category.name);

    // 1. Filter services belonging to this category
    const categoryServices = services.filter((s) => {
      if (s.categoryId === category.id) return true;
      const sCatNorm = normalize(s.categoryName);
      if (sCatNorm && catNorm.includes(sCatNorm)) return true;
      if (sCatNorm && sCatNorm.includes(catNorm)) return true;
      // Domain-based fallback
      if (category.name.toLowerCase().includes("repair") && s.domainId === "repair") return true;
      if (category.name.toLowerCase().includes("cleaning") && s.domainId === "cleaning") return true;
      if (category.name.toLowerCase().includes("maintenance") && s.domainId === "maintenance") return true;
      if (category.name.toLowerCase().includes("building") && s.domainId === "home") return true;
      if (category.name.toLowerCase().includes("automotive") && s.domainId === "automotive") return true;
      if (category.name.toLowerCase().includes("environment") && s.domainId === "environment") return true;
      return false;
    });

    // 2. If subcategory selected, filter further
    if (!selectedSubId) {
      return categoryServices;
    }

    const selectedSub = subcategories.find((s) => s.id === selectedSubId);
    const selectedSubNorm = normalize(selectedSub?.name);

    const subFiltered = categoryServices.filter((s) => {
      if (s.subcategoryId === selectedSubId) return true;
      if (selectedSubNorm && normalize(s.subcategoryName).includes(selectedSubNorm)) return true;
      if (selectedSubNorm && selectedSubNorm.includes(normalize(s.subcategoryName))) return true;
      return false;
    });

    return subFiltered;
  }, [category, subcategories, selectedSubId, services]);

  const toCardData = (s: ServiceOffering): ServiceCardData => ({
    id: s.id,
    title: s.title,
    category: s.subcategoryName || s.categoryName || category?.name || "Layanan",
    price: s.basePrice,
    priceMin: s.priceMin ?? s.basePrice,
    priceMax: s.priceMax ?? s.basePrice,
    pricingModel: s.pricingModel,
    providerName: s.providerName || "Penyedia Jasa",
    isVerifiedProvider: s.isVerifiedProvider,
    thumbnailUrl: s.thumbnailUrl,
    description: s.description || s.shortDescription || "",
    surveyFee: s.surveyFee,
    surveyFeeModel: s.surveyFeeModel,
    durationMin: s.durationMin,
    durationMax: s.durationMax,
    durationUnit: s.durationUnit,
  });

  if (isLoadingCategory) {
    return <CategoryDetailSkeleton />;
  }

  if (categoryNotFound || !category) {
    return (
      <div className="py-12">
        <EmptyState
          title="Kategori Tidak Ditemukan"
          description={`Kategori "${rawCategoryId}" tidak ditemukan dalam basis data kategori resmi Servio.`}
          action={
            <button
              type="button"
              onClick={() => router.push("/categories")}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
            >
              Kembali ke Daftar Kategori
            </button>
          }
        />
      </div>
    );
  }

  const badge = CATEGORY_BADGES[category.name];

  return (
    <div className="space-y-8 pb-16 font-body">
      <PageHeader
        title={category.name}
        description={
          category.description ||
          `Layanan perbaikan, pemeliharaan, dan perawatan terstandarisasi untuk kategori ${category.name.toLowerCase()} dengan teknisi terverifikasi.`
        }
        breadcrumbs={[
          { label: "Servio", href: "/" },
          { label: "Kategori", href: "/categories" },
          { label: category.name },
        ]}
        badge={
          badge ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-secondary border border-rose-200">
              {badge}
            </span>
          ) : undefined
        }
      />

      {/* Subcategories Horizontal Bar (Live from Category Service) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-neutral-slate">
          <span>PILIH SUBKATEGORI</span>
          <span className="text-neutral-muted">
            {subcategories.length > 0 ? `${subcategories.length} Subkategori Resmi` : "Tidak ada subkategori"}
          </span>
        </div>

        {subcategories.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-neutral-slate text-center">
            Belum ada subkategori untuk kategori ini dalam basis data.
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setSelectedSubId(null);
                router.replace(`/categories/${category.id}`);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedSubId === null
                  ? "bg-primary text-white shadow-servio-xs"
                  : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
              }`}
            >
              Semua Subkategori ({subcategories.length})
            </button>
            {subcategories.map((sub) => {
              const isSelected = selectedSubId === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubId(sub.id);
                    router.replace(`/categories/${category.id}?sub=${sub.id}`);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? "bg-primary text-white shadow-servio-xs"
                      : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
                  }`}
                >
                  <span>{sub.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Troubleshooting Callout */}
      <div className="glass-card p-4 rounded-2xl border border-sky-200 bg-sky/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-secondary text-white shrink-0">
            <Sparkle size={20} weight="fill" />
          </div>
          <p className="text-xs text-neutral-dark leading-relaxed">
            Perlu diagnosa spesifik untuk unit {category.name.toLowerCase()} Anda?{" "}
            <span className="text-neutral-slate">
              AI dapat membantu merekomendasikan estimasi biaya &amp; suku cadang.
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/smart-discovery")}
          className="shrink-0 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors"
        >
          Diagnosa AI
        </button>
      </div>

      {/* Services Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-neutral-dark">
            Layanan Tersedia ({filteredServices.length})
          </h2>
        </div>

        {isLoadingServices ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <EmptyState
            title="Belum ada layanan untuk subkategori ini"
            description="Layanan untuk subkategori ini sedang dalam proses verifikasi mitra Servio."
            action={
              <button
                type="button"
                onClick={() => {
                  setSelectedSubId(null);
                  router.replace(`/categories/${category.id}`);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
              >
                Tampilkan Semua Layanan
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={toCardData(service)}
                onBook={(id: string) => router.push(`/services/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CategoryDetailPage() {
  return (
    <Suspense fallback={<CategoryDetailSkeleton />}>
      <CategoryDetailContent />
    </Suspense>
  );
}
