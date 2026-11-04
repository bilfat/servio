"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ServiceOrder,
  CustomerTabType,
  WorkerTabType,
  ProviderTabType,
  BookingCreationInput,
  Diagnosis,
  FollowUpOrderDraft,
  TechnicianMonthlyRecapData,
} from "../types";
import { httpOrderJasaRepository } from "../adapters/HttpOrderJasaRepository";
import { orderJasaApi } from "@/lib/orderJasaApi";
import { resolveCustomerTab, resolveWorkerTab, resolveProviderTab } from "../constants";
import { getStoredWorkerPhoto } from "@/features/worker/workerPhotoHelper";

export const ORDER_JASA_UPDATED_EVENT = "servio:order-jasa:updated";
const CACHE_KEY_SERVICE_ORDERS = "servio_cache_service_orders_v2";

function getRolePortalContext(): string {
  if (typeof window === "undefined") return "customer";
  const pathname = window.location.pathname;
  if (pathname.startsWith("/provider")) return "provider";
  if (pathname.startsWith("/worker")) return "worker";
  if (pathname.startsWith("/admin") || pathname.startsWith("/ops")) return "admin";
  if (pathname.startsWith("/finance")) return "finance";
  return "customer";
}

function getCacheKey(): string {
  return `servio_cache_service_orders_v3_${getRolePortalContext()}`;
}

function saveOrdersToCache(orders: ServiceOrder[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getCacheKey(), JSON.stringify(orders));
  } catch {}
}

function loadOrdersFromCache(): ServiceOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getCacheKey();
    let cached = localStorage.getItem(key);
    if (!cached) {
      cached = localStorage.getItem(CACHE_KEY_SERVICE_ORDERS);
    }
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [];
}

export function notifyOrderJasaUpdated(orderId?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ORDER_JASA_UPDATED_EVENT, { detail: { orderId, timestamp: Date.now() } })
  );
  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel("servio_order_jasa_channel");
      channel.postMessage({ orderId, timestamp: Date.now() });
      channel.close();
    }
  } catch {
    // fallback ignore
  }
}

export function useOrderJasa() {
  const [orders, setOrders] = useState<ServiceOrder[]>(() => loadOrdersFromCache());
  const ordersRef = useRef<ServiceOrder[]>(orders);
  ordersRef.current = orders;

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const cached = loadOrdersFromCache();
      if (cached.length > 0) return false;
    }
    return true;
  });
  const [hasLoadedBackend, setHasLoadedBackend] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const cached = loadOrdersFromCache();
      if (cached.length > 0) return true;
    }
    return false;
  });
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean>(true);
  const isSyncingRef = useRef<boolean>(false);

  // Technician Monthly Recap (Prompt 10: Provider -> Rekap Pekerjaan)
  const [technicianRecap, setTechnicianRecap] = useState<TechnicianMonthlyRecapData | null>(null);
  const [isRecapLoading, setIsRecapLoading] = useState<boolean>(false);
  const [recapError, setRecapError] = useState<string | null>(null);
  const lastRecapParamsRef = useRef<{ month?: number; year?: number; search?: string } | null>(null);

  const fetchTechnicianRecap = useCallback(
    async (month?: number, year?: number, search?: string): Promise<TechnicianMonthlyRecapData | null> => {
      setIsRecapLoading(true);
      setRecapError(null);
      lastRecapParamsRef.current = { month, year, search };
      try {
        const data = await httpOrderJasaRepository.getTechnicianRecap(month, year, search);
        setTechnicianRecap(data);
        return data;
      } catch (err: any) {
        const msg = err?.message || "Gagal memuat rekap bulanan teknisi.";
        setRecapError(msg);
        return null;
      } finally {
        setIsRecapLoading(false);
      }
    },
    []
  );

  // Sync with real backend orders
  const syncBackendOrders = useCallback(async (isBackground = false, force = false) => {
    if (force) {
      isSyncingRef.current = false;
    } else if (isSyncingRef.current) {
      return ordersRef.current;
    }
    isSyncingRef.current = true;
    if (!isBackground && ordersRef.current.length === 0) {
      setIsLoading(true);
    }
    try {
      const realOrders = await httpOrderJasaRepository.listOrders(force);
      const next = realOrders || [];
      setOrders((prev) => {
        if (
          !force &&
          prev.length === next.length &&
          prev.every(
            (o, idx) =>
              o.id === next[idx]?.id &&
              o.status === next[idx]?.status &&
              o.subStatus === next[idx]?.subStatus &&
              o.assignment?.status === next[idx]?.assignment?.status &&
              o.assignment?.workerId === next[idx]?.assignment?.workerId &&
              o.diagnosis?.status === next[idx]?.diagnosis?.status &&
              o.diagnosis?.costBreakdown?.workItems?.length === next[idx]?.diagnosis?.costBreakdown?.workItems?.length &&
              o.diagnosis?.costBreakdown?.spareparts?.length === next[idx]?.diagnosis?.costBreakdown?.spareparts?.length &&
              o.paymentSummary?.diagnosisPayment?.status === next[idx]?.paymentSummary?.diagnosisPayment?.status &&
              o.paymentSummary?.executionPayment?.status === next[idx]?.paymentSummary?.executionPayment?.status &&
              o.updatedAt === next[idx]?.updatedAt
          )
        ) {
          return prev;
        }
        saveOrdersToCache(next);
        return next;
      });
      setIsBackendAvailable(true);
      setHasLoadedBackend(true);
      return next;
    } catch (err) {
      console.error("[useOrderJasa] Failed to load orders from real backend:", err);
      setIsBackendAvailable(false);
      if (force) {
        throw err;
      }
      return ordersRef.current;
    } finally {
      isSyncingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncBackendOrders(false);
  }, [syncBackendOrders]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let debounceTimer: any = null;
    const triggerSyncDebounced = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        syncBackendOrders(true);
        if (lastRecapParamsRef.current) {
          fetchTechnicianRecap(
            lastRecapParamsRef.current.month,
            lastRecapParamsRef.current.year,
            lastRecapParamsRef.current.search
          );
        }
      }, 500);
    };

    const handleEvent = () => {
      triggerSyncDebounced();
    };

    window.addEventListener(ORDER_JASA_UPDATED_EVENT, handleEvent);

    let channel: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel("servio_order_jasa_channel");
        channel.onmessage = () => {
          triggerSyncDebounced();
        };
      }
    } catch {
      // ignore
    }

    // Adaptive auto-refresh: poll every 25s when active tab
    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      syncBackendOrders(true);
    }, 25000);

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        triggerSyncDebounced();
      }
    };

    const handleFocus = () => {
      triggerSyncDebounced();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener(ORDER_JASA_UPDATED_EVENT, handleEvent);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      clearInterval(intervalId);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (channel) channel.close();
    };
  }, [syncBackendOrders]);

  // Role-specific groupings and counters computed purely from real orders
  const customerOrdersByTab = useMemo<Record<CustomerTabType, ServiceOrder[]>>(() => {
    const groups: Record<CustomerTabType, ServiceOrder[]> = {
      BELUM_BAYAR: [],
      MENUNGGU_JADWAL: [],
      BERLANGSUNG: [],
      SELESAI: [],
      BATAL: [],
    };
    orders.forEach((o) => {
      const tab = resolveCustomerTab(o);
      groups[tab].push(o);
    });
    return groups;
  }, [orders]);

  const customerTabCounts = useMemo<Record<CustomerTabType, number>>(() => {
    return {
      BELUM_BAYAR: customerOrdersByTab.BELUM_BAYAR.length,
      MENUNGGU_JADWAL: customerOrdersByTab.MENUNGGU_JADWAL.length,
      BERLANGSUNG: customerOrdersByTab.BERLANGSUNG.length,
      SELESAI: customerOrdersByTab.SELESAI.length,
      BATAL: customerOrdersByTab.BATAL.length,
    };
  }, [customerOrdersByTab]);

  const workerOrdersByTab = useMemo<Record<WorkerTabType, ServiceOrder[]>>(() => {
    const groups: Record<WorkerTabType, ServiceOrder[]> = {
      TUGAS_MASUK: [],
      TERJADWAL: [],
      BERLANGSUNG: [],
      SELESAI: [],
      RIWAYAT: [],
    };
    orders.forEach((o) => {
      const tab = resolveWorkerTab(o);
      groups[tab].push(o);
    });
    return groups;
  }, [orders]);

  const workerTabCounts = useMemo<Record<WorkerTabType, number>>(() => {
    return {
      TUGAS_MASUK: workerOrdersByTab.TUGAS_MASUK.length,
      TERJADWAL: workerOrdersByTab.TERJADWAL.length,
      BERLANGSUNG: workerOrdersByTab.BERLANGSUNG.length,
      SELESAI: workerOrdersByTab.SELESAI.length,
      RIWAYAT: workerOrdersByTab.RIWAYAT.length,
    };
  }, [workerOrdersByTab]);

  const providerOrdersByTab = useMemo<Record<ProviderTabType, ServiceOrder[]>>(() => {
    const groups: Record<ProviderTabType, ServiceOrder[]> = {
      BOOKING_MASUK: [],
      PENUGASAN: [],
      BERLANGSUNG: [],
      SELESAI: [],
      BATAL: [],
    };
    orders.forEach((o) => {
      const tab = resolveProviderTab(o);
      groups[tab].push(o);
    });
    return groups;
  }, [orders]);

  const providerTabCounts = useMemo<Record<ProviderTabType, number>>(() => {
    return {
      BOOKING_MASUK: providerOrdersByTab.BOOKING_MASUK.length,
      PENUGASAN: providerOrdersByTab.PENUGASAN.length,
      BERLANGSUNG: providerOrdersByTab.BERLANGSUNG.length,
      SELESAI: providerOrdersByTab.SELESAI.length,
      BATAL: providerOrdersByTab.BATAL.length,
    };
  }, [providerOrdersByTab]);

  // Real Mutations without mock fallbacks
  const createBooking = useCallback(async (input: BookingCreationInput) => {
    const created = await httpOrderJasaRepository.createBooking(input);
    setOrders((prev) => {
      const next = [created, ...prev.filter((p) => p.id !== created.id)];
      saveOrdersToCache(next);
      return next;
    });
    notifyOrderJasaUpdated(created.id);
    return created;
  }, []);

  const cancelBooking = useCallback(async (orderId: string, reason: string) => {
    await httpOrderJasaRepository.cancelBooking(orderId, reason);
    await syncBackendOrders();
    notifyOrderJasaUpdated(orderId);
    return true;
  }, [syncBackendOrders]);

  const assignWorker = useCallback(
    async (orderId: string, workerId: string, workerName: string, workerPhone: string) => {
      // 1. Immediate optimistic UI update for instant tab & card transition
      const workerPhoto = getStoredWorkerPhoto(workerId) || getStoredWorkerPhoto() || "";
      setOrders((prev) => {
        const updated = prev.map((o) => {
          if (o.id === orderId || o.orderNumber === orderId) {
            return {
              ...o,
              status: "SCHEDULED" as const,
              subStatus: "ASSIGNED_PENDING" as const,
              assignment: {
                assignmentId: `asg-${o.id}`,
                workerId,
                workerName,
                workerPhone,
                workerPhoto,
                workerRating: undefined,
                assignedAt: new Date().toISOString(),
                responseDeadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                status: "ASSIGNED" as const,
              },
            };
          }
          return o;
        });
        saveOrdersToCache(updated);
        return updated;
      });
      notifyOrderJasaUpdated(orderId);

      // 2. Persist to real backend
      await httpOrderJasaRepository.assignWorker(orderId, workerId, workerName, workerPhone);
      // 3. Sync fresh backend data
      await syncBackendOrders(true);
      notifyOrderJasaUpdated(orderId);
      return true;
    },
    [syncBackendOrders]
  );

  const acceptAssignment = useCallback(async (assignmentOrOrderId: string) => {
    await httpOrderJasaRepository.acceptAssignment(assignmentOrOrderId);
    await syncBackendOrders();
    notifyOrderJasaUpdated(assignmentOrOrderId);
    return true;
  }, [syncBackendOrders]);

  const rejectAssignment = useCallback(async (assignmentOrOrderId: string, reason: string) => {
    await httpOrderJasaRepository.rejectAssignment(assignmentOrOrderId, reason);
    await syncBackendOrders();
    notifyOrderJasaUpdated(assignmentOrOrderId);
    return true;
  }, [syncBackendOrders]);

  const startTrip = useCallback(async (assignmentOrOrderId: string) => {
    await httpOrderJasaRepository.startTrip(assignmentOrOrderId);
    await syncBackendOrders();
    notifyOrderJasaUpdated(assignmentOrOrderId);
    return true;
  }, [syncBackendOrders]);

  const arriveAtLocation = useCallback(async (assignmentOrOrderId: string) => {
    await httpOrderJasaRepository.arriveAtLocation(assignmentOrOrderId);
    await syncBackendOrders();
    notifyOrderJasaUpdated(assignmentOrOrderId);
    return true;
  }, [syncBackendOrders]);

  const submitDiagnosis = useCallback(
    async (assignmentOrOrderId: string, diagnosisInput: Partial<Diagnosis>) => {
      await httpOrderJasaRepository.submitDiagnosis(assignmentOrOrderId, diagnosisInput);
      await syncBackendOrders();
      notifyOrderJasaUpdated(assignmentOrOrderId);
      return true;
    },
    [syncBackendOrders]
  );

  const recordInPersonConsent = useCallback(
    async (orderId: string, notes?: string) => {
      await httpOrderJasaRepository.recordInPersonConsent(orderId, notes);
      await syncBackendOrders();
      notifyOrderJasaUpdated(orderId);
      return true;
    },
    [syncBackendOrders]
  );

  const respondRemoteConsent = useCallback(
    async (orderId: string, approve: boolean, notes?: string) => {
      await httpOrderJasaRepository.respondRemoteConsent(orderId, approve, notes);
      await syncBackendOrders();
      notifyOrderJasaUpdated(orderId);
      return true;
    },
    [syncBackendOrders]
  );

  const startExecution = useCallback(async (assignmentOrOrderId: string) => {
    await httpOrderJasaRepository.startExecution(assignmentOrOrderId);
    await syncBackendOrders();
    notifyOrderJasaUpdated(assignmentOrOrderId);
    return true;
  }, [syncBackendOrders]);

  const finishExecution = useCallback(
    async (
      assignmentOrOrderId: string,
      executionData: {
        beforePhotos: string[];
        afterPhotos: string[];
        workSummary: string;
        testResults: string;
        usedSpareparts?: string[];
        notes?: string;
      }
    ) => {
      await httpOrderJasaRepository.finishExecution(assignmentOrOrderId, executionData);
      await syncBackendOrders();
      notifyOrderJasaUpdated(assignmentOrOrderId);
      return true;
    },
    [syncBackendOrders]
  );

  const endVisit = useCallback(async (assignmentOrOrderId: string) => {
    await httpOrderJasaRepository.endVisit(assignmentOrOrderId);
    await syncBackendOrders();
    notifyOrderJasaUpdated(assignmentOrOrderId);
    return true;
  }, [syncBackendOrders]);

  const reportPaymentIssue = useCallback(
    async (assignmentOrOrderId: string, issue: string) => {
      await httpOrderJasaRepository.reportPaymentIssue(assignmentOrOrderId, issue);
      await syncBackendOrders();
      notifyOrderJasaUpdated(assignmentOrOrderId);
      return true;
    },
    [syncBackendOrders]
  );

  const retryPayment = useCallback(
    async (orderId: string) => {
      const res = await orderJasaApi.retryPayment(orderId);
      await syncBackendOrders();
      notifyOrderJasaUpdated(orderId);
      return res.data;
    },
    [syncBackendOrders]
  );

  const simulateFinancePayment = useCallback(
    async (
      invoiceNoOrPaymentId: string,
      outcome: "PAID" | "FAILED" = "PAID",
      orderIdHint?: string,
      amountHint?: number
    ) => {
      await httpOrderJasaRepository.simulateFinancePayment(invoiceNoOrPaymentId, outcome, orderIdHint, amountHint);
      await syncBackendOrders();
      notifyOrderJasaUpdated(orderIdHint || invoiceNoOrPaymentId);
      return true;
    },
    [syncBackendOrders]
  );

  const confirmCustomerCompleted = useCallback(
    async (orderId: string) => {
      await httpOrderJasaRepository.confirmCustomerCompleted(orderId);
      await syncBackendOrders();
      notifyOrderJasaUpdated(orderId);
      return true;
    },
    [syncBackendOrders]
  );

  const simulateReleaseFunds120h = useCallback(
    async (orderId: string) => {
      await httpOrderJasaRepository.simulateReleaseFunds120h(orderId);
      await syncBackendOrders();
      notifyOrderJasaUpdated(orderId);
      return true;
    },
    [syncBackendOrders]
  );

  const createFollowUpOrder = useCallback(
    async (draft: FollowUpOrderDraft, scheduledDate: string, scheduledTimeSlot: string) => {
      const res = await httpOrderJasaRepository.createFollowUpOrder(
        draft,
        scheduledDate,
        scheduledTimeSlot
      );
      await syncBackendOrders();
      notifyOrderJasaUpdated(res.id);
      return res;
    },
    [syncBackendOrders]
  );

  const resetFixtures = useCallback(async () => {
    // Pure real backend sync
    await syncBackendOrders();
    notifyOrderJasaUpdated();
  }, [syncBackendOrders]);

  const getOrderById = useCallback(
    (id: string) => {
      return orders.find((o) => o.id === id || o.orderNumber === id);
    },
    [orders]
  );

  const fetchOrderById = useCallback(
    async (id: string, forceFresh = true): Promise<ServiceOrder | undefined> => {
      if (!forceFresh) {
        const existing = orders.find((o) => o.id === id || o.orderNumber === id);
        if (existing) return existing;
      }
      try {
        const fetched = await httpOrderJasaRepository.getOrderById(id);
        if (fetched) {
          setOrders((prev) => {
            const next = [fetched, ...prev.filter((p) => p.id !== fetched.id)];
            saveOrdersToCache(next);
            return next;
          });
          return fetched;
        }
      } catch (err) {
        console.warn(`[useOrderJasa] fetchOrderById(${id}) error:`, err);
      }
      return orders.find((o) => o.id === id || o.orderNumber === id);
    },
    [orders]
  );

  return {
    orders,
    isLoading,
    hasLoadedBackend,
    isBackendAvailable,
    customerOrdersByTab,
    customerTabCounts,
    workerOrdersByTab,
    workerTabCounts,
    providerOrdersByTab,
    providerTabCounts,
    getOrder: getOrderById,
    getOrderById,
    fetchOrderById,
    createBooking,
    cancelBooking,
    assignWorker,
    acceptAssignment,
    rejectAssignment,
    startTrip,
    arriveAtLocation,
    submitDiagnosis,
    recordInPersonConsent,
    respondRemoteConsent,
    startExecution,
    finishExecution,
    endVisit,
    reportPaymentIssue,
    retryPayment,
    simulateFinancePayment,
    confirmCustomerCompleted,
    simulateReleaseFunds120h,
    createFollowUpOrder,
    resetFixtures,
    refresh: (force = true) => syncBackendOrders(false, force),
    syncBackendOrders,
    technicianRecap,
    isRecapLoading,
    recapError,
    fetchTechnicianRecap,
  };
}
