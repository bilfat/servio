"use client";

import { useState, useEffect, useMemo } from "react";
import { ServiceOffering, ServiceProvider, FixedDomainId, PricingModel } from "@/types/domain";
import { publicCatalogApi, ApiCatalogService } from "@/lib/servioApi";
import { MOCK_PROVIDERS } from "@/mocks/providers";

function mapCategoryCodeToDomainId(code?: string): FixedDomainId {
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

export interface ServiceDetailCoverageCity {
  city_code: string;
  label?: string;
}

export interface ServiceDetailPricing {
  model: "FREE" | "RANGE" | "AFTER_SURVEY" | string;
  min_price_idr: number | null;
  max_price_idr: number | null;
  currency?: string;
}

export interface ServiceDetailSurvey {
  availability: string;
  requirement: string;
  fee_model: string;
  fee_idr: number | null;
}

export function useServiceDetail(serviceId: string, cityCode = "JKT-BARAT") {
  const [apiService, setApiService] = useState<any | null>(null);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchDetail = async () => {
      if (!serviceId) return;
      try {
        setIsLoading(true);
        const [res, catalogRes] = await Promise.allSettled([
          publicCatalogApi.getDetail(serviceId, cityCode),
          publicCatalogApi.getCatalog({ city_code: cityCode }),
        ]);
        if (mounted && res.status === "fulfilled" && res.value && res.value.data) {
          setApiService(res.value.data);
        }
        if (mounted && catalogRes.status === "fulfilled" && catalogRes.value && catalogRes.value.data) {
          const raw = Array.isArray(catalogRes.value.data?.items)
            ? catalogRes.value.data.items
            : Array.isArray(catalogRes.value.data)
            ? catalogRes.value.data
            : [];
          setCatalogItems(raw);
        }
      } catch {
        // Error handling handled by isNotFound state
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchDetail();
    return () => {
      mounted = false;
    };
  }, [serviceId, cityCode]);

  const service = useMemo(() => {
    if (!apiService) return undefined;

    const basePrice = Number(apiService.pricing?.min_price_idr ?? apiService.basePrice ?? apiService.priceMin ?? 0);
    const maxPrice = Number(apiService.pricing?.max_price_idr ?? apiService.priceMax ?? basePrice);

    return {
      id: apiService.id,
      providerMasterServiceId: apiService.id,
      providerId: apiService.provider?.organization_id || apiService.providerId || "0740d857-b665-4191-aaf5-d7dd3611dc1d",
      providerName: apiService.provider?.store_name || apiService.provider?.display_name || apiService.providerName || "Penyedia Jasa",
      providerOfficeCity: apiService.provider?.office_city || apiService.provider?.city || null,
      isVerifiedProvider: true,
      domainId: mapCategoryCodeToDomainId(apiService.categoryCode || apiService.service_definition?.name),
      categoryId: apiService.categoryId || apiService.service_definition?.category_id || "repair",
      categoryName: apiService.categoryName || "Servis & Perbaikan",
      categoryCode: apiService.categoryCode || "REPAIR",
      subcategoryId: apiService.subcategoryId || apiService.service_definition?.subcategory_id || "ac",
      subcategoryName: apiService.service_definition?.name || apiService.subcategoryName || "Servis AC",
      subcategoryCode: apiService.subcategoryCode || "AC",
      title: apiService.display_name || apiService.title || apiService.name || "Layanan Jasa",
      shortDescription: apiService.description ? apiService.description.slice(0, 160) : "",
      fullDescription: apiService.description || "",
      pricingModel: (apiService.pricing?.model || "RANGE") as PricingModel,
      basePrice,
      priceMin: basePrice,
      priceMax: maxPrice,
      priceFormatted:
        apiService.pricing?.model === "FREE"
          ? "Gratis (Rp0)"
          : apiService.pricing?.model === "AFTER_SURVEY"
          ? "Setelah Survei"
          : `Rp ${Number(basePrice || 0).toLocaleString("id-ID")}${maxPrice > basePrice ? ` – Rp ${Number(maxPrice || 0).toLocaleString("id-ID")}` : ""}`,
      estimatedDurationHours: apiService.duration?.max || apiService.duration?.min || 1,
      durationMin: apiService.duration?.min ?? 1,
      durationMax: apiService.duration?.max ?? 2,
      durationUnit: apiService.duration?.unit ?? "HOUR",
      surveyFee: apiService.survey?.fee_idr ?? 0,
      surveyFeeModel: apiService.survey?.fee_model ?? ((apiService.survey?.fee_idr !== undefined && apiService.survey?.fee_idr > 0) ? "PAID" : "FREE"),
      surveyAvailability: apiService.survey?.availability ?? "AVAILABLE",
      surveyRequirement: apiService.survey?.requirement ?? "OPTIONAL",
      warrantyDays: 0,
      rating: 0,
      reviewCount: 0,
      thumbnailUrl: apiService.gallery?.[0]?.url || (apiService.primary_media?.url ?? null),
      serviceModes: ["HOME_SERVICE", "WORKSHOP"] as ("HOME_SERVICE" | "WORKSHOP")[],
      inclusions: Array.isArray(apiService.included_items) && apiService.included_items.length > 0
        ? apiService.included_items
        : ["Pemeriksaan unit dan diagnosis", "Pengerjaan terstandarisasi Servio", "Pengujian fungsi pasca perbaikan"],
      exclusions: Array.isArray(apiService.excluded_items) && apiService.excluded_items.length > 0
        ? apiService.excluded_items
        : ["Suku cadang / komponen pengganti tambahan di luar paket"],
      customerRequirements: apiService.customer_requirements || [],
      pricing: apiService.pricing as ServiceDetailPricing,
      survey: apiService.survey as ServiceDetailSurvey,
      coverageCities: (apiService.coverage_cities || []) as ServiceDetailCoverageCity[],
      serviceable: apiService.location?.serviceable ?? true,
      selectedCityCode: apiService.location?.selected_city_code || cityCode,
      nextAction: apiService.next_action,
      gallery: Array.isArray(apiService.gallery) && apiService.gallery.length > 0
        ? apiService.gallery
        : (apiService.primary_media ? [{ id: apiService.primary_media.id, url: apiService.primary_media.url, is_primary: true }] : []),
    };
  }, [apiService, cityCode]);

  const provider: ServiceProvider | undefined = useMemo(() => {
    if (!service) return undefined;
    return ({
      id: service.providerId,
      name: service.providerName,
      businessType: "COMPANY",
      avatarInitials: service.providerName.slice(0, 2).toUpperCase(),
      rating: 4.9,
      reviewCount: 38,
      completedJobs: 142,
      operationalHoursSummary: "08:00 - 18:00 WIB",
      operatingHoursDetail: [],
      address: "Kawasan Industri Servio Center",
      city: "Jakarta Barat",
      specialties: [service.title],
      isVerified: true,
      joinedYear: 2024,
      badge: "Mitra Resmi Terverifikasi",
      phone: "+6281234567890",
      email: "mitra@servio.id",
    } as unknown) as ServiceProvider;
  }, [service]);

  const relatedServices: ServiceOffering[] = useMemo(() => {
    if (!service || catalogItems.length === 0) return [];
    return catalogItems
      .filter((s) => s.id !== service.id)
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        providerMasterServiceId: s.id,
        providerId: s.providerId || s.provider_organization_id || "0740d857-b665-4191-aaf5-d7dd3611dc1d",
        providerName: s.providerName || "Penyedia Jasa",
        isVerifiedProvider: true,
        domainId: mapCategoryCodeToDomainId(s.categoryCode),
        categoryId: s.categoryId || "repair",
        categoryName: s.categoryName || "Kategori Jasa",
        categoryCode: s.categoryCode || "REPAIR",
        subcategoryId: s.subcategoryId || "subcat",
        subcategoryName: s.subcategoryName || "Subkategori",
        subcategoryCode: s.subcategoryCode || "SUBCAT",
        title: s.title || s.name || s.display_name || "Layanan Jasa",
        shortDescription: s.shortDescription || s.description || "",
        fullDescription: s.description || s.shortDescription || "",
        pricingModel: (s.pricingModel || "ESTIMATED_RANGE") as PricingModel,
        basePrice: Number(s.basePrice || s.priceMin || 0),
        priceFormatted: `Rp ${Number(s.basePrice || s.priceMin || 0).toLocaleString("id-ID")}`,
        estimatedDurationHours: 1,
        warrantyDays: s.warrantyDays || 30,
        rating: s.rating || 4.9,
        reviewCount: s.reviewCount || 12,
        thumbnailUrl: s.thumbnailUrl || "/images/services/default.jpg",
        serviceModes: ["HOME_SERVICE"],
        inclusions: ["Inspeksi Awal", "Pengerjaan Profesional Bergaransi"],
        exclusions: ["Suku Cadang Tambahan"],
      }));
  }, [service, catalogItems]);

  return {
    service,
    provider,
    relatedServices,
    isLoading,
    isNotFound: !isLoading && !service,
  };
}
