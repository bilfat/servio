"use client";

import { useState, useEffect, useCallback } from "react";
import { LiveTrackingData } from "@/types/domain";
import { trackingApi } from "@/lib/servioApi";

export function useTracking(orderId: string = "") {
  const [tracking, setTracking] = useState<LiveTrackingData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = useCallback(async () => {
    if (!orderId) {
      setTracking(null);
      setIsLoading(false);
      setError("Order ID tidak ditentukan.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await trackingApi.getSafeProjection(orderId);
      if (res.data) {
        const isDeparted = res.data.status === "TRACKING_ACTIVE" || res.data.status === "TRACKING_STALE";
        setTracking({
          orderId,
          workerId: "assigned-worker",
          workerName: "Teknisi Mitra",
          workerPhone: "",
          workerVehicleNumber: "",
          workerLocation: { lat: 0, lng: 0 },
          destinationLocation: { lat: 0, lng: 0 },
          destinationAddress: "",
          estimatedArrivalMinutes: res.data.eta ?? 0,
          distanceKm: res.data.distanceKm ?? 0,
          status: isDeparted ? "DEPARTED" : "ARRIVED",
          lastUpdated: res.data.lastUpdated
            ? new Date(res.data.lastUpdated).toLocaleTimeString("id-ID")
            : "Baru saja",
          shareableUrl: typeof window !== "undefined" ? window.location.href : "",
        });
        setError(null);
      } else {
        setTracking(null);
        setError("Data pelacakan tidak ditemukan.");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Informasi pelacakan belum tersedia.";
      setTracking(null);
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 10000);
    return () => clearInterval(interval);
  }, [fetchTracking]);

  return {
    tracking,
    isLoading,
    error,
    refresh: fetchTracking,
  };
}
