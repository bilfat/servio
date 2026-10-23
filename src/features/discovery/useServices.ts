"use client";

import { useState, useMemo, useEffect } from "react";
import { FixedDomainId, PricingModel, ServiceOffering } from "@/types/domain";
import { publicCatalogApi, ApiCatalogService } from "@/lib/servioApi";

export interface ServiceFilterOptions {
  cityCode?: string;
  domainId?: FixedDomainId | "all";
  categoryId?: string;
  subcategoryId?: string;
  searchQuery?: string;
  pricingModel?: PricingModel | "all";
  minRating?: number;
  sortBy?: "rating" | "price_asc" | "price_desc" | "reviews";
}

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

export function useServices(initialFilters?: ServiceFilterOptions) {
  const cityCode = initialFilters?.cityCode || "JKT-SEL";
  const categoryId = initialFilters?.categoryId || "all";
  const subcategoryId = initialFilters?.subcategoryId || "all";
  const pricingModel = initialFilters?.pricingModel || "all";
  const searchQuery = initialFilters?.searchQuery || "";
  const domainId = initialFilters?.domainId || "all";
  const sortBy = initialFilters?.sortBy || "rating";
  const minRating = initialFilters?.minRating;

  const [catalogItems, setCatalogItems] = useState<ApiCatalogService[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    const fetchCatalog = async () => {
      try {
        const params: Record<string, string> = {};
        if (cityCode) params.city_code = cityCode;
        if (searchQuery) params.search = searchQuery;
        if (categoryId && categoryId !== "all") params.categories = categoryId;
        if (subcategoryId && subcategoryId !== "all") params.subcategories = subcategoryId;
        if (pricingModel && pricingModel !== "all") params.price_model = pricingModel;

        const res = await publicCatalogApi.getCatalog(params);
        if (mounted) {
          const rawItems = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.items)
            ? res.data.items
            : [];
          setCatalogItems(rawItems);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const e = err as Error;
          setError(e.message || "Gagal memuat katalog layanan kanonikal.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCatalog();
    return () => {
      mounted = false;
    };
  }, [cityCode, categoryId, subcategoryId, pricingModel, searchQuery]);

  const allOfferings: ServiceOffering[] = useMemo(() => {
    if (catalogItems.length > 0) {
      return catalogItems.map((s) => {
        const minPrice = s.pricing?.min_price_idr ?? s.priceMin ?? s.basePrice ?? 0;
        const maxPrice = s.pricing?.max_price_idr ?? s.priceMax ?? minPrice;
        const basePrice = Number(minPrice);
        const priceMin = Number(minPrice);
        const priceMax = Number(maxPrice);

        return {
          id: s.id,
          providerMasterServiceId: s.id,
          providerId: s.providerId || s.provider_organization_id || (s as any).provider?.organization_id || "0740d857-b665-4191-aaf5-d7dd3611dc1d",
          providerName: s.providerName || (s as any).provider?.store_name || (s as any).provider?.display_name || "Penyedia Jasa",
          isVerifiedProvider: true,
          domainId: mapCategoryCodeToDomainId(s.categoryCode),
          categoryId: (s as any).category?.id || s.categoryId || "repair",
          categoryName: (s as any).category?.name || s.categoryName || "Servis & Perbaikan",
          categoryCode: s.categoryCode || "REPAIR",
          subcategoryId: (s as any).subcategory?.id || s.subcategoryId || "subcat",
          subcategoryName: (s as any).subcategory?.name || s.subcategoryName || "Subkategori",
          subcategoryCode: s.subcategoryCode || "SUBCAT",
          title: s.title || (s as any).display_name || s.name || "Layanan Jasa",
          description: s.description || s.shortDescription || "",
          shortDescription: s.shortDescription || s.description || "",
          fullDescription: s.description || s.shortDescription || "",
          pricingModel: "ESTIMATED_RANGE" as PricingModel,
          basePrice,
          priceMin,
          priceMax,
          priceFormatted: `Rp ${Number(basePrice || 0).toLocaleString("id-ID")}`,
          estimatedDurationHours: s.duration?.max ?? s.duration_max ?? 1,
          durationMin: s.duration?.min ?? s.duration_min ?? 1,
          durationMax: s.duration?.max ?? s.duration_max ?? 2,
          durationUnit: s.duration?.unit ?? s.duration_unit ?? "HOUR",
          surveyFee: s.survey_summary?.fee_idr ?? s.surveyFee ?? 0,
          surveyFeeModel: s.survey_summary?.fee_model ?? ((s.surveyFee && s.surveyFee > 0) ? "PAID" : "FREE"),
          warrantyDays: s.warrantyDays || 0,
          rating: s.rating || 0,
          reviewCount: s.reviewCount || 0,
          thumbnailUrl: s.thumbnailUrl || (s as any).primary_media?.url || null,
          serviceModes: ((s.serviceModes || ["HOME_SERVICE"]).filter((m) => m === "HOME_SERVICE" || m === "WORKSHOP").length > 0
            ? ((s.serviceModes || ["HOME_SERVICE"]).filter((m) => m === "HOME_SERVICE" || m === "WORKSHOP") as ("HOME_SERVICE" | "WORKSHOP")[])
            : (["HOME_SERVICE"] as ("HOME_SERVICE" | "WORKSHOP")[])),
          inclusions: ["Inspeksi Awal", "Pengerjaan Profesional", "Proteksi Pembayaran Escrow"],
          exclusions: ["Suku Cadang / Material Tambahan (Bila ada)"],
        };
      });
    }
    return [];
  }, [catalogItems]);

  const filteredServices = useMemo(() => {
    let result = [...allOfferings];

    if (domainId && domainId !== "all") {
      result = result.filter((s) => s.domainId === domainId);
    }

    if (subcategoryId && subcategoryId !== "all") {
      result = result.filter((s) => s.subcategoryId === subcategoryId);
    }

    if (pricingModel && pricingModel !== "all") {
      result = result.filter((s) => s.pricingModel === pricingModel);
    }

    if (minRating) {
      result = result.filter((s) => s.rating >= (minRating ?? 0));
    }

    if (searchQuery && searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.shortDescription.toLowerCase().includes(q) ||
          s.providerName.toLowerCase().includes(q)
      );
    }

    // Sorting
    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case "price_desc":
        result.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case "reviews":
        result.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case "rating":
      default:
        result.sort((a, b) => b.rating - a.rating);
        break;
    }

    return result;
  }, [allOfferings, domainId, subcategoryId, pricingModel, minRating, searchQuery, sortBy]);

  const filters: ServiceFilterOptions = useMemo(
    () => ({
      cityCode,
      categoryId,
      subcategoryId,
      pricingModel,
      searchQuery,
      domainId,
      sortBy,
      minRating,
    }),
    [cityCode, categoryId, subcategoryId, pricingModel, searchQuery, domainId, sortBy, minRating]
  );

  const updateFilters = (_newFilters: Partial<ServiceFilterOptions>) => {
    // Caller can pass updated props directly
  };

  const resetFilters = () => {
    // Caller can reset props directly
  };

  return {
    services: filteredServices,
    totalCount: filteredServices.length,
    isLoading,
    error,
    filters,
    setFilters: updateFilters,
    resetFilters,
  };
}
