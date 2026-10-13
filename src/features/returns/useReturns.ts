"use client";

import { useState, useEffect, useCallback } from "react";
import { returnsApi } from "@/lib/servioApi";

export interface ReturnData {
  returnId: string;
  returnNumber: string;
  orderId: string;
  status: string;
  reason: string;
  description?: string;
  submittedAt?: string;
  eligibleUntil?: string;
  rejectionReason?: string;
  items?: Array<{
    returnItemId: string;
    orderItemId: string;
    variantId?: string;
    requestedQuantity: number;
    approvedQuantity: number;
    status: string;
    conditionClaim?: string;
  }>;
  inspection?: {
    inspectionId: string;
    status: string;
    conditionFound?: string;
    inventoryDisposition: string;
    notes?: string;
    inspectedAt?: string;
  };
  resolution?: {
    resolutionId: string;
    resolutionType: string;
    refundAmount?: number;
    refundId?: string;
    replacementShipmentId?: string;
    status: string;
    notes?: string;
  };
  refund?: {
    refundId: string;
    amount: number;
    status: string;
    refundDestination?: string;
  };
}

export function useReturns(options: { autoLoad?: boolean } = { autoLoad: true }) {
  const autoLoad = options?.autoLoad ?? true;
  const [returns, setReturns] = useState<ReturnData[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReturns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await returnsApi.list();
      if (res && res.data && Array.isArray(res.data)) {
        setReturns(res.data);
      } else {
        setReturns([]);
      }
    } catch (err: any) {
      setError(err?.message || "Gagal memuat daftar pengajuan retur.");
      setReturns([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadReturns();
    }
  }, [autoLoad, loadReturns]);

  const checkEligibility = useCallback(
    async (
      orderId: string,
      orderItemId: string,
      options?: { quantity?: number; reason?: string; conditionClaim?: string }
    ) => {
      return returnsApi.checkEligibility(orderId, orderItemId, options);
    },
    []
  );

  const getReturnDetail = async (returnId: string) => {
    return returnsApi.get(returnId);
  };

  const submitReturn = async (data: {
    orderId: string;
    orderItemId: string;
    quantity: number;
    reason: string;
    description?: string;
    conditionClaim?: string;
  }) => {
    setIsSubmitting(true);
    try {
      const res = await returnsApi.create(data);
      await loadReturns();
      return res.data;
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const approveReturn = async (returnId: string) => {
    const res = await returnsApi.approve(returnId);
    await loadReturns();
    return res;
  };

  const rejectReturn = async (returnId: string, reason?: string) => {
    const res = await returnsApi.reject(returnId, reason);
    await loadReturns();
    return res;
  };

  const shipReturn = async (
    returnId: string,
    data: { trackingNumber?: string; courierName?: string; returnMethod?: string }
  ) => {
    const res = await returnsApi.ship(returnId, data);
    await loadReturns();
    return res;
  };

  const receiveReturn = async (returnId: string) => {
    const res = await returnsApi.receive(returnId);
    await loadReturns();
    return res;
  };

  const inspectReturn = async (
    returnId: string,
    data: { inventoryDisposition: string; conditionFound?: string; notes?: string }
  ) => {
    const res = await returnsApi.inspect(returnId, data);
    await loadReturns();
    return res;
  };

  const resolveReturn = async (
    returnId: string,
    data: { resolutionType: string; refundAmount?: number; notes?: string }
  ) => {
    const res = await returnsApi.resolve(returnId, data);
    await loadReturns();
    return res;
  };

  const getReturnById = (returnId: string) => {
    return returns.find((r) => r.returnId === returnId || (r as any).id === returnId);
  };

  return {
    returns,
    isLoading,
    isSubmitting,
    error,
    refreshReturns: loadReturns,
    checkEligibility,
    getReturnDetail,
    getReturnById,
    submitReturn,
    approveReturn,
    rejectReturn,
    shipReturn,
    receiveReturn,
    inspectReturn,
    resolveReturn,
    activeReturnsCount: returns.filter((r) => r.status !== "RESOLVED" && r.status !== "REJECTED").length,
  };
}
