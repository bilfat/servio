"use client";

import { useState, useMemo } from "react";
import {
  DISCOVERY_MERCHANT_PARTNERS,
  MerchantPartnerDiscoveryItem,
} from "@/mocks/partnerships";
import { StorePartnershipStatus } from "@/types/domain";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { partnershipApi } from "@/lib/servioApi";

export function useProviderPartnerships() {
  const repo = useDomainRepository();
  const [merchants] = useState<MerchantPartnerDiscoveryItem[]>(DISCOVERY_MERCHANT_PARTNERS);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [maxDistance, setMaxDistance] = useState<number>(10);
  const [minRating, setMinRating] = useState<number>(0);

  const partnerships = repo.storePartnerships;

  // Active partnerships accessible by assigned workers (Checklist item 7: Connect worker-visible partner scope)
  const workerVisiblePartners = useMemo(() => {
    return merchants.filter((m) => {
      const part = partnerships.find(
        (p) => p.merchantId === m.id && (p.providerId === "prov-01" || p.providerId === "prov-bintang-teknik")
      );
      return part && part.status === "ACTIVE";
    });
  }, [merchants, partnerships]);

  // Filtered merchant list for Provider Discovery (Section 11.1 & 56C.15)
  const filteredMerchants = useMemo(() => {
    return merchants.map((merchant) => {
      const currentPart = partnerships.find(
        (p) => p.merchantId === merchant.id && (p.providerId === "prov-01" || p.providerId === "prov-bintang-teknik")
      );
      return {
        ...merchant,
        partnership: currentPart,
      };
    }).filter((merchant) => {
      const currentStatus: StorePartnershipStatus = merchant.partnership ? merchant.partnership.status : "INACTIVE";

      // Search matching name, specialization, or address
      const matchesQuery =
        !searchQuery ||
        merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        merchant.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        merchant.productCategories.some((cat) => cat.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      let matchesStatus = true;
      if (statusFilter === "ACTIVE") matchesStatus = currentStatus === "ACTIVE";
      else if (statusFilter === "PENDING") matchesStatus = currentStatus === "PENDING";
      else if (statusFilter === "REJECTED") matchesStatus = currentStatus === "REJECTED";
      else if (statusFilter === "INACTIVE") matchesStatus = currentStatus === "INACTIVE";

      // Category filter
      const matchesCategory =
        categoryFilter === "ALL" ||
        merchant.productCategories.some((cat) => cat.toLowerCase().includes(categoryFilter.toLowerCase()));

      // Distance filter
      const matchesDistance = merchant.distanceKm <= maxDistance;

      // Rating filter
      const matchesRating = merchant.rating >= minRating;

      return matchesQuery && matchesStatus && matchesCategory && matchesDistance && matchesRating;
    });
  }, [merchants, partnerships, searchQuery, statusFilter, categoryFilter, maxDistance, minRating]);

  // Request new partnership (Section 11.2 & 56C.16)
  const requestPartnership = async (merchantId: string, scope = "HVAC_SPAREPARTS") => {
    const merchant = merchants.find((m) => m.id === merchantId);
    if (!merchant) return;

    repo.requestStorePartnership(
      "prov-01",
      merchant.id,
      merchant.name,
      scope,
      {
        providerName: "PT Servio Mandiri Teknik",
        providerRating: 4.9,
        providerReviewCount: 342,
        providerSpecialization: "HVAC & Electrical Specialist",
        providerServiceArea: "Jakarta Selatan & Depok",
        providerServiceCount: 18,
        providerDescription: "Mitra resmi Servio dengan teknisi AC bersertifikasi BNSP.",
        notes: `Pengajuan kemitraan pengadaan suku cadang scope ${scope}.`,
      }
    );

    try {
      await partnershipApi.requestPartnership({
        targetOrganizationId: merchantId,
        scope,
        notes: `Pengajuan kemitraan pengadaan suku cadang scope ${scope}.`,
      });
    } catch {
      // Gracefully handled for local fallback
    }
  };

  // Cancel pending partnership request
  const cancelPartnershipRequest = (merchantId: string) => {
    repo.endStorePartnership(merchantId, "prov-01");
  };

  // End active partnership
  const endPartnership = (merchantId: string) => {
    repo.endStorePartnership(merchantId, "prov-01");
  };

  return {
    merchants: filteredMerchants,
    rawMerchantsCount: merchants.length,
    partnerships,
    workerVisiblePartners,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    maxDistance,
    setMaxDistance,
    minRating,
    setMinRating,
    requestPartnership,
    cancelPartnershipRequest,
    endPartnership,
  };
}
