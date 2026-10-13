"use client";

import React, { Suspense, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { MOCK_TAXONOMY_DOMAINS } from "@/mocks/taxonomy";
import { useServices } from "@/features/discovery/useServices";
import { ServiceCard, ServiceCardData } from "@/components/features/services/ServiceCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { FixedDomainId, ServiceOffering } from "@/types/domain";
import { Sparkle } from "@phosphor-icons/react";

function CategoryDetailSkeleton() {
  return (
    <div className="space-y-8 pb-16 animate-pulse">
      <div className="h-24 bg-slate-100 rounded-3xl border border-slate-200" />
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
  const categoryId = params?.categoryId as string;
  const initialSub = searchParams.get("sub");

  const domain = MOCK_TAXONOMY_DOMAINS.find((d) => d.id === categoryId);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(initialSub || null);

  const { services } = useServices({ domainId: categoryId as FixedDomainId });

  const filteredServices = useMemo(() => {
    if (!selectedSubId) return services;
    return services.filter((s) => s.subcategoryId === selectedSubId);
  }, [services, selectedSubId]);

  const toCardData = (s: ServiceOffering): ServiceCardData => ({
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

  if (!domain) {
    return (
      <div className="py-12">
        <EmptyState
          title="Kategori Tidak Ditemukan"
          description={`Kategori domain "${categoryId}" tidak terdaftar dalam taksonomi resmi Servio.`}
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

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title={domain.name}
        description={domain.description}
        breadcrumbs={[
          { label: "Servio", href: "/" },
          { label: "Kategori", href: "/categories" },
          { label: domain.name },
        ]}
        badge={
          domain.badge ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-secondary border border-rose-200">
              {domain.badge}
            </span>
          ) : undefined
        }
      />

      {/* Subcategories Horizontal Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-neutral-slate">
          <span>PILIH SUBKATEGORI</span>
          <span className="text-neutral-muted">{domain.subcategories.length} Subkategori</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setSelectedSubId(null)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedSubId === null
                ? "bg-primary text-white shadow-servio-xs"
                : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
            }`}
          >
            Semua Subkategori ({services.length})
          </button>
          {domain.subcategories.map((sub) => {
            const isSelected = selectedSubId === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubId(sub.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? "bg-primary text-white shadow-servio-xs"
                    : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
                }`}
              >
                <span>{sub.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10">
                  {sub.activeProvidersCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Troubleshooting Callout */}
      <div className="glass-card p-4 rounded-2xl border border-sky-200 bg-sky/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-secondary text-white shrink-0">
            <Sparkle size={20} weight="fill" />
          </div>
          <p className="text-xs text-neutral-dark leading-relaxed">
            Perlu diagnosa spesifik untuk unit {domain.name.toLowerCase()} Anda?{" "}
            <span className="text-neutral-slate">AI dapat membantu merekomendasikan estimasi biaya & suku cadang.</span>
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

        {filteredServices.length === 0 ? (
          <EmptyState
            title="Belum ada layanan untuk subkategori ini"
            description="Layanan untuk subkategori ini sedang dalam proses verifikasi mitra Servio."
            action={
              <button
                type="button"
                onClick={() => setSelectedSubId(null)}
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
