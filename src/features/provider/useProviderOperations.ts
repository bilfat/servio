"use client";

import { useState, useEffect } from "react";
import { WorkerTechnician } from "@/types/domain";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { organizationApi } from "@/lib/servioApi";
import { useActiveRole } from "@/context/RoleContext";

export type ProviderStoreStatus = "ONLINE_ACCEPTING" | "BUSY_DELAYED" | "TEMPORARY_CLOSED";

let globalStoreStatus: ProviderStoreStatus | null = null;
const listeners = new Set<(status: ProviderStoreStatus) => void>();

export function useProviderOperations() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();

  const getResolvedInitialStatus = (): ProviderStoreStatus => {
    if (globalStoreStatus) return globalStoreStatus;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("servio_provider_store_status") as ProviderStoreStatus | null;
      if (stored && ["ONLINE_ACCEPTING", "BUSY_DELAYED", "TEMPORARY_CLOSED"].includes(stored)) {
        globalStoreStatus = stored;
        return stored;
      }
    }
    const fromUser =
      (user.activeOrganization?.operational_status as ProviderStoreStatus) ||
      ((user.businessProfile as any)?.operationalStatus as ProviderStoreStatus);
    if (fromUser && ["ONLINE_ACCEPTING", "BUSY_DELAYED", "TEMPORARY_CLOSED"].includes(fromUser)) {
      globalStoreStatus = fromUser;
      return fromUser;
    }
    return "ONLINE_ACCEPTING";
  };

  const [storeStatus, setStoreStatus] = useState<ProviderStoreStatus>(getResolvedInitialStatus);

  useEffect(() => {
    const handleStatusUpdate = (newStatus: ProviderStoreStatus) => {
      setStoreStatus(newStatus);
    };
    listeners.add(handleStatusUpdate);

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("servio_provider_store_status") as ProviderStoreStatus | null;
      if (stored && stored !== storeStatus && ["ONLINE_ACCEPTING", "BUSY_DELAYED", "TEMPORARY_CLOSED"].includes(stored)) {
        setStoreStatus(stored);
        globalStoreStatus = stored;
      }
    }

    return () => {
      listeners.delete(handleStatusUpdate);
    };
  }, []);

  // 1. Store operational status toggle with backend sync
  const updateStoreStatus = async (newStatus: ProviderStoreStatus) => {
    globalStoreStatus = newStatus;
    if (typeof window !== "undefined") {
      localStorage.setItem("servio_provider_store_status", newStatus);
    }
    setStoreStatus(newStatus);
    listeners.forEach((l) => l(newStatus));

    const orgId = user.activeOrganization?.id || user.organizationId;
    if (orgId) {
      try {
        await organizationApi.updateOperationalStatus(orgId, newStatus);
      } catch (err) {
        console.error("Gagal sinkron status operasional toko ke backend:", err);
      }
    }
  };

  // 2. Worker assignment & directory
  const updateWorkerStatus = (workerId: string, isOnline: boolean) => {
    const target = repo.workers.find((w) => w.id === workerId);
    if (target) {
      target.isOnline = isOnline;
      repo.notify();
    }
  };

  const addWorker = (newWorker: Omit<WorkerTechnician, "id">, masterServiceIds?: string[]) => {
    return repo.addWorker(newWorker, masterServiceIds);
  };

  return {
    storeStatus,
    updateStoreStatus,
    workers: repo.workers,
    updateWorkerStatus,
    addWorker,
    setWorkerCapabilities: (workerId: string, providerId: string, masterServiceIds: string[]) =>
      repo.setWorkerCapabilities(workerId, providerId, masterServiceIds),
    getWorkerCapabilities: (workerId: string) => repo.getWorkerCapabilities(workerId),
    getProviderTrackingRadar: (providerId?: string) =>
      repo.getProviderTrackingRadar(providerId || "usr-prov-001"),
    startWorkerTracking: (workerId: string, providerId: string, location?: { lat: number; lng: number; address: string; accuracy?: number }) =>
      repo.startWorkerTracking(workerId, providerId, location),
    stopWorkerTracking: (workerId: string) => repo.stopWorkerTracking(workerId),
    getWorkerTrackingSession: (workerId: string) => repo.getWorkerTrackingSession(workerId),
    partnerships: repo.storePartnerships,
    // Cross-milestone bookings and orders
    bookings: repo.bookings,
    orders: repo.orders,
    acceptBooking: (
      bookingId: string,
      workerId?: string,
      providerNotes?: string,
      includeAiContext?: boolean
    ) => repo.acceptBooking(bookingId, workerId, providerNotes, includeAiContext),
    rejectBooking: (bookingId: string, reason: string) => repo.rejectBooking(bookingId, reason),
    assignWorker: (
      orderId: string,
      workerId: string,
      providerNotes?: string,
      includeAiContext?: boolean
    ) => repo.assignWorker(orderId, workerId, providerNotes, includeAiContext),
    completeOrder: (orderId: string, notes?: string) => repo.completeOrder(orderId, notes),
    // Phase E: Affiliate Points & Attribution for Provider
    affiliateSummary: repo.getProviderAffiliateSummary("prov-01"),
    getProviderAffiliateSummary: (providerId?: string) => repo.getProviderAffiliateSummary(providerId || "prov-01"),
    getAttributionByServiceOrder: (serviceOrderId: string) => repo.getAttributionByServiceOrder(serviceOrderId),
    getAttributionByProductOrder: (productOrderId: string) => repo.getAttributionByProductOrder(productOrderId),
  };
}
