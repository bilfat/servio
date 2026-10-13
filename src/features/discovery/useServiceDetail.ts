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

export function useServiceDetail(serviceId: string) {
  const [apiService, setApiService] = useState<ApiCatalogService | null>(null);
  const [catalogItems, setCatalogItems] = useState<ApiCatalogService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchDetail = async () => {
      if (!serviceId) return;
      try {
        setIsLoading(true);
        const [res, catalogRes] = await Promise.allSettled([
          publicCatalogApi.getDetail(serviceId),
          publicCatalogApi.getCatalog(),
        ]);
        if (mounted && res.status === "fulfilled" && res.value && res.value.data) {
          setApiService(res.value.data);
        }
        if (mounted && catalogRes.status === "fulfilled" && catalogRes.value && catalogRes.value.data) {
          setCatalogItems(catalogRes.value.data);
        }
      } catch {
        // Fallback handled below
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchDetail();
    return () => {
      mounted = false;
    };
  }, [serviceId]);

  const service: ServiceOffering | undefined = useMemo(() => {
    if (apiService) {
      return {
        id: apiService.id,
        providerMasterServiceId: apiService.id,
        providerId: apiService.providerId,
        providerName: apiService.providerName,
        isVerifiedProvider: true,
        domainId: mapCategoryCodeToDomainId(apiService.categoryCode),
        categoryId: apiService.categoryId,
        categoryName: apiService.categoryName,
        categoryCode: apiService.categoryCode,
        subcategoryId: apiService.subcategoryId,
        subcategoryName: apiService.subcategoryName,
        subcategoryCode: apiService.subcategoryCode,
        title: apiService.title || apiService.name,
        shortDescription: apiService.shortDescription || apiService.description,
        fullDescription: apiService.description || apiService.shortDescription || "",
        pricingModel: "ESTIMATED_RANGE" as PricingModel,
        basePrice: apiService.basePrice || apiService.priceMin,
        priceFormatted: `Rp ${(apiService.basePrice || apiService.priceMin).toLocaleString("id-ID")}`,
        estimatedDurationHours: 1,
        warrantyDays: apiService.warrantyDays || (apiService.warrantyConfig?.durationDays ?? 30),
        rating: apiService.rating || 4.9,
        reviewCount: apiService.reviewCount || 38,
        thumbnailUrl: apiService.thumbnailUrl || "/images/services/default.jpg",
        serviceModes: ((apiService.serviceModes || ["HOME_SERVICE"]).filter((m) => m === "HOME_SERVICE" || m === "WORKSHOP").length > 0
          ? ((apiService.serviceModes || ["HOME_SERVICE"]).filter((m) => m === "HOME_SERVICE" || m === "WORKSHOP") as ("HOME_SERVICE" | "WORKSHOP")[])
          : (["HOME_SERVICE"] as ("HOME_SERVICE" | "WORKSHOP")[])),
        inclusions: ["Inspeksi Awal", "Pengerjaan Profesional Bergaransi", "Proteksi Pembayaran Escrow"],
        exclusions: ["Suku Cadang / Material Tambahan (Bila ada)"],
      };
    }
    return undefined;
  }, [apiService]);

  const provider: ServiceProvider | undefined = useMemo(() => {
    if (!service) return undefined;
    const found = MOCK_PROVIDERS.find((p) => p.id === service.providerId);
    if (found) return found;
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
      workRadiusKm: 25,
      address: "Kawasan Industri Servio Center",
      city: "Jakarta Selatan",
      coordinates: { lat: -6.2, lng: 106.8 },
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
      .filter((s) => s.id !== service.id && (s.categoryId === service.categoryId || mapCategoryCodeToDomainId(s.categoryCode) === service.domainId))
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        providerMasterServiceId: s.id,
        providerId: s.providerId,
        providerName: s.providerName,
        isVerifiedProvider: true,
        domainId: mapCategoryCodeToDomainId(s.categoryCode),
        categoryId: s.categoryId,
        categoryName: s.categoryName,
        categoryCode: s.categoryCode,
        subcategoryId: s.subcategoryId,
        subcategoryName: s.subcategoryName,
        subcategoryCode: s.subcategoryCode,
        title: s.title || s.name,
        shortDescription: s.shortDescription || s.description,
        fullDescription: s.description || s.shortDescription || "",
        pricingModel: "ESTIMATED_RANGE" as PricingModel,
        basePrice: s.basePrice || s.priceMin,
        priceFormatted: `Rp ${(s.basePrice || s.priceMin).toLocaleString("id-ID")}`,
        estimatedDurationHours: 1,
        warrantyDays: s.warrantyDays || (s.warrantyConfig?.durationDays ?? 30),
        rating: s.rating || 4.9,
        reviewCount: s.reviewCount || 38,
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
