"use client";

import { useState } from "react";
import { WorkerTechnician } from "@/types/domain";
import { useDomainRepository } from "@/lib/repository/domainRepository";

export type ProviderStoreStatus = "ONLINE_ACCEPTING" | "BUSY_DELAYED" | "TEMPORARY_CLOSED";

export function useProviderOperations() {
  const repo = useDomainRepository();
  const [storeStatus, setStoreStatus] = useState<ProviderStoreStatus>("ONLINE_ACCEPTING");

  // 1. Store operational status toggle
  const updateStoreStatus = (newStatus: ProviderStoreStatus) => {
    setStoreStatus(newStatus);
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
