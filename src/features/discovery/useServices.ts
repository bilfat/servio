"use client";

import { useState, useMemo, useEffect } from "react";
import { FixedDomainId, PricingModel, ServiceOffering } from "@/types/domain";
import { publicCatalogApi, ApiCatalogService } from "@/lib/servioApi";

export interface ServiceFilterOptions {
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
  const [filters, setFilters] = useState<ServiceFilterOptions>({
    domainId: "all",
    pricingModel: "all",
    sortBy: "rating",
    ...initialFilters,
  });

  const [catalogItems, setCatalogItems] = useState<ApiCatalogService[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchCatalog = async () => {
      try {
        setIsLoading(true);
        const res = await publicCatalogApi.getCatalog();
        if (mounted && res && res.data) {
          setCatalogItems(res.data);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const e = err as Error;
          setError(e.message || "Gagal memuat katalog layanan kanonikal.");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  const allOfferings: ServiceOffering[] = useMemo(() => {
    if (catalogItems.length > 0) {
      return catalogItems.map((s) => ({
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
        description: s.description || s.shortDescription || "",
        shortDescription: s.shortDescription || s.description || "",
        fullDescription: s.description || s.shortDescription || "",
        pricingModel: "ESTIMATED_RANGE" as PricingModel,
        basePrice: s.basePrice || s.priceMin,
        priceMin: s.priceMin ?? s.basePrice,
        priceMax: s.priceMax ?? s.basePrice,
        priceFormatted: `Rp ${(s.basePrice || s.priceMin).toLocaleString("id-ID")}`,
        estimatedDurationHours: 1,
        warrantyDays: s.warrantyDays || (s.warrantyConfig?.durationDays ?? 30),
        rating: s.rating || 4.9,
        reviewCount: s.reviewCount || 38,
        thumbnailUrl: s.thumbnailUrl || "/images/services/default.jpg",
        serviceModes: ((s.serviceModes || ["HOME_SERVICE"]).filter((m) => m === "HOME_SERVICE" || m === "WORKSHOP").length > 0
          ? ((s.serviceModes || ["HOME_SERVICE"]).filter((m) => m === "HOME_SERVICE" || m === "WORKSHOP") as ("HOME_SERVICE" | "WORKSHOP")[])
          : (["HOME_SERVICE"] as ("HOME_SERVICE" | "WORKSHOP")[])),
        inclusions: ["Inspeksi Awal", "Pengerjaan Profesional Bergaransi", "Proteksi Pembayaran Escrow"],
        exclusions: ["Suku Cadang / Material Tambahan (Bila ada)"],
      }));
    }
    return [];
  }, [catalogItems]);

  const filteredServices = useMemo(() => {
    let result = [...allOfferings];

    if (filters.domainId && filters.domainId !== "all") {
      result = result.filter((s) => s.domainId === filters.domainId);
    }

    if (filters.subcategoryId && filters.subcategoryId !== "all") {
      result = result.filter((s) => s.subcategoryId === filters.subcategoryId);
    }

    if (filters.pricingModel && filters.pricingModel !== "all") {
      result = result.filter((s) => s.pricingModel === filters.pricingModel);
    }

    if (filters.minRating) {
      result = result.filter((s) => s.rating >= (filters.minRating ?? 0));
    }

    if (filters.searchQuery && filters.searchQuery.trim() !== "") {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.shortDescription.toLowerCase().includes(q) ||
          s.providerName.toLowerCase().includes(q)
      );
    }

    // Sorting
    switch (filters.sortBy) {
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
  }, [allOfferings, filters]);

  const updateFilters = (newFilters: Partial<ServiceFilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters({
      domainId: "all",
      pricingModel: "all",
      sortBy: "rating",
    });
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
