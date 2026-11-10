"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ServiceHealthReport } from "@/app/api/dev/health/route";

export type RefreshIntervalMode = "5s" | "10s" | "paused";

export interface DevTopHealthPill {
  id: string;
  shortName: string;
  port: number;
  status: "UP" | "DEGRADED" | "DOWN";
  latencyMs: number;
}

export interface DevTopSummary {
  upCount: number;
  totalServices: number;
  degradedCount: number;
  downCount: number;
  dbConnectedCount: number;
  totalLogErrors: number;
  totalLogWarnings: number;
  totalClientErrors: number;
  outboxIssuesCount: number;
  checkedAt: string | null;
}

interface DevAutoRefreshContextValue {
  intervalMode: RefreshIntervalMode;
  setIntervalMode: (mode: RefreshIntervalMode) => void;
  refreshTick: number;
  triggerRefresh: () => void;
  topSummary: DevTopSummary;
  topServices: DevTopHealthPill[];
  healthServices: ServiceHealthReport[];
  hasLoadedHealth: boolean;
  isRefreshingSummary: boolean;
}

const DEFAULT_SUMMARY: DevTopSummary = {
  upCount: 0,
  totalServices: 8,
  degradedCount: 0,
  downCount: 0,
  dbConnectedCount: 0,
  totalLogErrors: 0,
  totalLogWarnings: 0,
  totalClientErrors: 0,
  outboxIssuesCount: 0,
  checkedAt: null,
};

const DevAutoRefreshContext = createContext<DevAutoRefreshContextValue | null>(null);

export function DevAutoRefreshProvider({ children }: { children: React.ReactNode }) {
  const [intervalMode, setIntervalMode] = useState<RefreshIntervalMode>("10s");
  const [refreshTick, setRefreshTick] = useState(0);
  const [topSummary, setTopSummary] = useState<DevTopSummary>(DEFAULT_SUMMARY);
  const [topServices, setTopServices] = useState<DevTopHealthPill[]>([]);
  const [healthServices, setHealthServices] = useState<ServiceHealthReport[]>([]);
  const [hasLoadedHealth, setHasLoadedHealth] = useState(false);
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (intervalMode === "paused") return;
    const ms = intervalMode === "5s" ? 5000 : 10000;
    const id = setInterval(() => {
      setRefreshTick((t) => t + 1);
    }, ms);
    return () => clearInterval(id);
  }, [intervalMode]);

  useEffect(() => {
    let active = true;
    const loadTopHealth = async () => {
      setIsRefreshingSummary(true);
      try {
        const res = await fetch("/api/dev/health", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!active) return;
        if (json?.summary) {
          setTopSummary({
            upCount: json.summary.upCount ?? 0,
            totalServices: json.summary.totalServices ?? 8,
            degradedCount: json.summary.degradedCount ?? 0,
            downCount: json.summary.downCount ?? 0,
            dbConnectedCount: json.summary.dbConnectedCount ?? 0,
            totalLogErrors: json.summary.totalLogErrors ?? 0,
            totalLogWarnings: json.summary.totalLogWarnings ?? 0,
            totalClientErrors: json.summary.totalClientErrors ?? 0,
            outboxIssuesCount: json.summary.outboxIssuesCount ?? 0,
            checkedAt: json.summary.checkedAt ?? new Date().toISOString(),
          });
        }
        if (Array.isArray(json?.services)) {
          setHealthServices(json.services as ServiceHealthReport[]);
          setTopServices(
            json.services.map((s: ServiceHealthReport) => ({
              id: s.id,
              shortName: s.shortName,
              port: s.port,
              status: s.status,
              latencyMs: s.latencyMs,
            }))
          );
        }
        setHasLoadedHealth(true);
      } catch {
        // silent background poll error
      } finally {
        if (active) setIsRefreshingSummary(false);
      }
    };

    loadTopHealth();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  return (
    <DevAutoRefreshContext.Provider
      value={{
        intervalMode,
        setIntervalMode,
        refreshTick,
        triggerRefresh,
        topSummary,
        topServices,
        healthServices,
        hasLoadedHealth,
        isRefreshingSummary,
      }}
    >
      {children}
    </DevAutoRefreshContext.Provider>
  );
}

export function useDevAutoRefresh() {
  const ctx = useContext(DevAutoRefreshContext);
  if (!ctx) {
    throw new Error("useDevAutoRefresh must be used within DevAutoRefreshProvider");
  }
  return ctx;
}

