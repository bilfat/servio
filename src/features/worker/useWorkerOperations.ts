"use client";

import { useState, useMemo } from "react";
import { useActiveRole } from "@/context/RoleContext";
import {
  WorkerTechnician,
  ProofOfService,
  ProductRecommendationStatus,
  CustomerRecommendationDecision,
  SparepartSourceType,
} from "@/types/domain";
import { useDomainRepository } from "@/lib/repository/domainRepository";

export type {
  WorkerJob,
  WorkerShipmentItem,
} from "@/mocks/workerJobs";
export {
  MOCK_WORKER_JOBS,
  MOCK_SHIPMENTS,
  INITIAL_WORKER_JOBS,
  INITIAL_SHIPMENTS,
} from "@/mocks/workerJobs";

import {
  WorkerJob,
  WorkerShipmentItem,
} from "@/mocks/workerJobs";

export function useWorkerOperations() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();
  const [isReady, setIsReady] = useState(true);
  const [gpsActive, setGpsActive] = useState(true);
  const [lastCheckIn, setLastCheckIn] = useState<string>("10:05 WIB (Jl. Gandaria Tengah IV)");
  const [sosActive, setSosActive] = useState(false);

  // Authenticated worker profile (from MongoDB /api/v1/auth/me)
  const worker: WorkerTechnician = useMemo(() => {
    const wp = user.workerProfile || {};
    return {
      id: user.id || "wrk-active",
      providerId: user.providerId || wp.providerId || "usr-prov-001",
      providerName: user.organizationName || wp.providerName || "PT Servio Mandiri Teknik",
      name: user.name || "Teknisi Servio",
      phone: user.phone || "+628120000000",
      email: user.email || undefined,
      rating: typeof wp.rating === "number" ? wp.rating : 4.9,
      completedJobs: typeof wp.completedJobs === "number" ? wp.completedJobs : 0,
      skills: Array.isArray(wp.skills) && wp.skills.length > 0 ? wp.skills : [user.department || "Teknisi Lapangan HVAC"],
      isOnline: isReady,
      currentLocation: {
        lat: -6.2,
        lng: 106.8,
        address: "Workshop Pusat",
      },
      vehicleNumber: wp.vehicleNumber || "Motor Operasional",
      capabilities: Array.isArray(wp.capabilities)
        ? wp.capabilities.map((svcId: string, idx: number) => ({
            id: `cap-${user.id || "wrk"}-${svcId}-${idx}`,
            workerId: user.id || "wrk-active",
            providerId: user.providerId || wp.providerId || "usr-prov-001",
            masterServiceId: svcId,
            assignedAt: "2026-09-25",
            status: "ACTIVE" as const,
          }))
        : [],
    };
  }, [user, isReady]);

  // Status toggle
  const toggleReadiness = () => {
    setIsReady((prev) => !prev);
  };

  // Dispatch / status flow
  const updateJobStatus = (
    jobId: string,
    newStatus: WorkerJob["status"]
  ) => {
    repo.updateWorkerJobStatus(jobId, newStatus);
  };

  // SOP step toggle
  const toggleSopStep = (jobId: string, stepId: string) => {
    const job = repo.workerJobs.find((j) => j.id === jobId);
    if (job) {
      job.sopSteps = job.sopSteps.map((s) =>
        s.id === stepId ? { ...s, isCompleted: !s.isCompleted } : s
      );
      repo.notify();
    }
  };

  // Check-in manual
  const triggerManualCheckIn = (checkpoint: string) => {
    const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
    setLastCheckIn(`${timeStr} (${checkpoint})`);
  };

  // SOS toggle
  const triggerEmergencySOS = (_reason: string) => {
    setSosActive(true);
  };

  const resolveEmergencySOS = () => {
    setSosActive(false);
  };

  // Material usage save
  const saveMaterialUsage = (jobId: string, materials: WorkerJob["usedMaterials"]) => {
    const job = repo.workerJobs.find((j) => j.id === jobId);
    if (job) {
      job.usedMaterials = materials;
      repo.notify();
    }
  };

  // Shipment update
  const updateShipmentStatus = (shipmentId: string, status: WorkerShipmentItem["status"]) => {
    const target = repo.workerShipments.find((s) => s.id === shipmentId);
    if (target) {
      target.status = status;
      repo.notify();
    }
  };

  // Metrics & Sorted Jobs
  const jobs = repo.workerJobs;

  // Status priority for linear sorting
  const statusPriority: Record<WorkerJob["status"], number> = {
    IN_PROGRESS: 1,
    ARRIVED: 2,
    DISPATCHED: 3,
    ASSIGNED: 4,
    BLOCKED: 5,
    PROOF_SUBMITTED: 6,
    COMPLETED: 7,
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    return (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
  });

  // Current active job: In-progress -> Arrived -> Dispatched -> First Assigned -> null if all done
  const activeJob =
    jobs.find((j) => ["IN_PROGRESS", "ARRIVED", "DISPATCHED"].includes(j.status)) ||
    jobs.find((j) => j.status === "ASSIGNED") ||
    null;

  const pendingJobs = jobs.filter((j) => j.status === "ASSIGNED");
  const inProgressJobs = jobs.filter((j) => ["DISPATCHED", "ARRIVED", "IN_PROGRESS"].includes(j.status));
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED" || j.status === "PROOF_SUBMITTED");
  const blockedJobs = jobs.filter((j) => j.status === "BLOCKED");
  const todayEarnings = completedJobs.reduce((acc, j) => acc + j.feeWorker, 0);

  return {
    worker,
    isReady,
    toggleReadiness,
    jobs,
    sortedJobs,
    activeJob,
    pendingJobs,
    inProgressJobs,
    completedJobs,
    blockedJobs,
    updateJobStatus,
    reportJobIssue: (jobId: string, reason: string, note: string) =>
      repo.reportWorkerJobIssue(jobId, reason, note),
    markJobReady: (jobId: string) => repo.markJobReady(jobId),
    toggleSopStep,
    saveMaterialUsage,
    shipments: repo.workerShipments,
    updateShipmentStatus,
    gpsActive,
    setGpsActive,
    lastCheckIn,
    triggerManualCheckIn,
    sosActive,
    triggerEmergencySOS,
    resolveEmergencySOS,
    todayEarnings,
    submitProof: (
      jobId: string,
      proofData: {
        media: ProofOfService["media"];
        parameters: { parameter: string; value: string; standard: string }[];
      }
    ) => repo.submitWorkerProof(jobId, proofData),
    // Phase D: Contextual Sparepart & Partner Operations (D1 to D11)
    storePartnerships: repo.storePartnerships,
    getWorkerActivePartnerships: (providerId?: string) => repo.getWorkerActivePartnerships(providerId),
    merchantProducts: repo.merchantProducts,
    merchantOrders: repo.merchantOrders,
    merchantShipments: repo.merchantShipments,
    addProviderMaterialToJob: (
      jobId: string,
      materialData: {
        partName: string;
        partNumber?: string;
        quantity: number;
        unitPrice: number;
        reason: string;
      }
    ) => repo.addProviderMaterialToJob(jobId, materialData),
    sendProductRecommendation: (
      jobId: string,
      recData: {
        productId: string;
        productTitle: string;
        merchantId: string;
        merchantName: string;
        price: number;
        reason: string;
        compatibilityContext: string;
        shippingEstimate?: string;
        thumbnailUrl?: string;
      }
    ) => repo.sendProductRecommendation(jobId, recData),
    updateRecommendationDecision: (
      jobId: string,
      recId: string,
      status: ProductRecommendationStatus,
      decision?: CustomerRecommendationDecision,
      isSimulation?: boolean
    ) => repo.updateRecommendationDecision(jobId, recId, status, decision, isSimulation),
    createAssistedProductOrder: (jobId: string, recId: string, confirmedByCustomer?: boolean) =>
      repo.createAssistedProductOrder(jobId, recId, confirmedByCustomer),
    recordMaterialUsageResult: (
      jobId: string,
      usage: {
        name: string;
        quantity: number;
        source: SparepartSourceType;
        status: "USED" | "RETURNED_TO_SHOP";
        notes?: string;
        barcodeNew?: string;
        serialOld?: string;
      }
    ) => repo.recordMaterialUsageResult(jobId, usage),
    recordJobFallbackOutcome: (
      jobId: string,
      outcome: {
        type:
          | "CUSTOMER_PURCHASED_ELSEWHERE"
          | "CUSTOMER_ALREADY_OWNS"
          | "CUSTOMER_DECLINED"
          | "ALTERNATIVE_PRODUCT_USED"
          | "WAITING_CUSTOMER"
          | "PARTNER_PRODUCT_UNAVAILABLE";
        notes?: string;
        alternativeProductTitle?: string;
      }
    ) => repo.recordJobFallbackOutcome(jobId, outcome),
    // Worker Capabilities & Location Telemetry Tracking (Locked Decisions 10, 15, 20-25)
    capabilities: repo.getWorkerCapabilities(worker.id),
    trackingSession: repo.getWorkerTrackingSession(worker.id),
    startTracking: (location?: { lat: number; lng: number; address: string; accuracy?: number }) =>
      repo.startWorkerTracking(worker.id, worker.providerId, location),
    stopTracking: () => repo.stopWorkerTracking(worker.id),
    setTrackingStatus: (status: any) => repo.setWorkerTrackingStatus(worker.id, status),
    // Phase E: Affiliate Points & Attribution
    affiliateSummary: repo.getWorkerAffiliateSummary(worker.id),
    getWorkerAffiliateSummary: (workerId?: string) => repo.getWorkerAffiliateSummary(workerId || worker.id),
    getAttributionByServiceOrder: (serviceOrderId: string) => repo.getAttributionByServiceOrder(serviceOrderId),
    getAttributionByProductOrder: (productOrderId: string) => repo.getAttributionByProductOrder(productOrderId),
  };
}
