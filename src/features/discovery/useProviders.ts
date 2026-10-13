"use client";

import { useState, useMemo } from "react";
import { ServiceProvider } from "@/types/domain";
import { MOCK_PROVIDERS } from "@/mocks/providers";

export interface ProviderFilterOptions {
  city?: string;
  specialty?: string;
  minRating?: number;
  isVerifiedOnly?: boolean;
  searchQuery?: string;
}

export function useProviders(initialFilters?: ProviderFilterOptions) {
  const [filters, setFilters] = useState<ProviderFilterOptions>({
    isVerifiedOnly: false,
    ...initialFilters,
  });

  const providers = useMemo(() => {
    let result = [...MOCK_PROVIDERS];

    if (filters.isVerifiedOnly) {
      result = result.filter((p) => p.isVerified);
    }

    if (filters.city) {
      result = result.filter((p) => p.city.toLowerCase() === filters.city?.toLowerCase());
    }

    if (filters.specialty) {
      result = result.filter((p) =>
        p.specialties.some((sp) => sp.toLowerCase().includes(filters.specialty!.toLowerCase()))
      );
    }

    if (filters.minRating) {
      result = result.filter((p) => p.rating >= filters.minRating!);
    }

    if (filters.searchQuery && filters.searchQuery.trim() !== "") {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.specialties.some((s) => s.toLowerCase().includes(q))
      );
    }

    return result;
  }, [filters]);

  const updateFilters = (newFilters: Partial<ProviderFilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const getProviderById = (id: string): ServiceProvider | undefined => {
    return MOCK_PROVIDERS.find((p) => p.id === id);
  };

  return {
    providers,
    totalCount: providers.length,
    filters,
    setFilters: updateFilters,
    getProviderById,
  };
}
