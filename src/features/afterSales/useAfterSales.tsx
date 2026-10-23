"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  AfterSalesCase,
  AfterSalesCaseType,
  AfterSalesMainStatus,
  AfterSalesSolutionType,
  CustomerWarrantyEntitlement,
  WarrantyPreset,
  TimelineActivity,
} from "@/types/afterSales";
import {
  MOCK_AFTER_SALES_CASES,
  MOCK_CUSTOMER_WARRANTIES,
  MOCK_WARRANTY_PRESETS,
} from "@/mocks/afterSales.mock";

const STORAGE_KEY_CASES = "servio_demo_aftersales_cases_v2";
const STORAGE_KEY_WARRANTIES = "servio_demo_aftersales_warranties_v2";
const STORAGE_KEY_PRESETS = "servio_demo_aftersales_presets_v2";

interface SubmitClaimPayload {
  caseType: "claim_product" | "claim_service";
  sourceOrderId: string;
  sourceOrderNumber: string;
  itemTitle: string;
  itemImageUrl?: string;
  itemCategory?: string;
  itemPrice: number;
  organizationId: string;
  organizationName: string;
  organizationType: "MERCHANT" | "PROVIDER";
  warrantyId?: string;
  warrantyName?: string;
  warrantyDurationDays?: number;
  warrantyExpiryDate?: string;
  issueReason: string;
  issueDescription: string;
  evidenceMedia?: string[];
  customerRequestedSolution?: AfterSalesSolutionType;
}

interface SubmitReturnPayload {
  sourceOrderId: string;
  sourceOrderNumber: string;
  itemTitle: string;
  itemImageUrl?: string;
  itemCategory?: string;
  itemPrice: number;
  orderedQuantity: number;
  affectedQuantity: number;
  organizationId: string;
  organizationName: string;
  issueReason: string;
  issueDescription: string;
  evidenceMedia?: string[];
  customerRequestedSolution: "REFUND" | "REPLACEMENT";
}

interface AfterSalesContextType {
  cases: AfterSalesCase[];
  warranties: CustomerWarrantyEntitlement[];
  presets: WarrantyPreset[];
  warrantyPresets: WarrantyPreset[];
  activeOrgId: string;
  setActiveOrgId: (orgId: string) => void;
  // Selectors
  getCaseById: (id: string) => AfterSalesCase | undefined;
  getWarrantyById: (id: string) => CustomerWarrantyEntitlement | undefined;
  getPresetsByOrg: (orgId: string) => WarrantyPreset[];
  getActivePresetsByOrg: (orgId: string) => WarrantyPreset[];
  getCasesByOrg: (orgId: string) => AfterSalesCase[];
  // Customer Actions
  submitClaim: (payload: SubmitClaimPayload) => AfterSalesCase;
  submitReturn: (payload: SubmitReturnPayload) => AfterSalesCase;
  customerAcceptAlternativeProposal: (caseId: string) => void;
  customerRejectAlternativeProposal: (caseId: string, reason: string) => void;
  customerSubmitReturnShipping: (caseId: string, trackingNumber: string, courierName: string, claimedFee?: number) => void;
  customerReportIssue: (caseId: string, reason: string) => void;
  customerApprovePaidWork: (caseId: string) => void;
  // Merchant / Provider Actions
  merchantApproveCase: (caseId: string, solution: AfterSalesSolutionType, note: string) => void;
  merchantRejectCase: (caseId: string, rejectionReason: string) => void;
  merchantProposeAlternative: (caseId: string, alternativeSolution: AfterSalesSolutionType, note: string) => void;
  merchantConfirmReturnReceived: (caseId: string, inspected: boolean, inspectionNote?: string) => void;
  providerApproveWarrantyJob: (caseId: string, workerName: string, scheduledDate: string, note?: string) => void;
  providerRejectClaim: (caseId: string, rejectionReason: string) => void;
  // Preset Management
  addPreset: (preset: Omit<WarrantyPreset, "id" | "createdAt" | "usageCount">) => WarrantyPreset;
  updatePreset: (id: string, updates: Partial<WarrantyPreset>) => void;
  togglePresetStatus: (id: string) => void;
  // Demo Reset
  resetDemoData: () => void;
}

const AfterSalesContext = createContext<AfterSalesContextType | null>(null);

export function AfterSalesProvider({ children }: { children: React.ReactNode }) {
  const [cases, setCases] = useState<AfterSalesCase[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_CASES);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.warn("Could not read stored after-sales cases:", e);
      }
    }
    return MOCK_AFTER_SALES_CASES;
  });

  const [warranties, setWarranties] = useState<CustomerWarrantyEntitlement[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_WARRANTIES);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.warn("Could not read stored customer warranties:", e);
      }
    }
    return MOCK_CUSTOMER_WARRANTIES;
  });

  const [presets, setPresets] = useState<WarrantyPreset[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_PRESETS);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.warn("Could not read stored warranty presets:", e);
      }
    }
    return MOCK_WARRANTY_PRESETS;
  });

  const [activeOrgId, setActiveOrgId] = useState<string>("merch-jaya-motor");

  // Save to localStorage when state changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_CASES, JSON.stringify(cases));
    }
  }, [cases]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_WARRANTIES, JSON.stringify(warranties));
    }
  }, [warranties]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
    }
  }, [presets]);

  const getCaseById = (id: string) => cases.find((c) => c.id === id || c.caseNumber === id);
  const getWarrantyById = (id: string) => warranties.find((w) => w.id === id || w.warrantyNumber === id);
  const getPresetsByOrg = (orgId: string) => presets.filter((p) => p.organizationId === orgId);
  const getActivePresetsByOrg = (orgId: string) => presets.filter((p) => p.organizationId === orgId && p.isActive);
  const getCasesByOrg = (orgId: string) => cases.filter((c) => c.organizationId === orgId);

  const submitClaim = (payload: SubmitClaimPayload): AfterSalesCase => {
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const caseId = `CAS-CLM-${Date.now().toString().slice(-6)}`;
    const caseNumber = `CAS-2026-CLM-${Math.floor(100 + Math.random() * 900)}`;

    const initialTimeline: TimelineActivity[] = [
      {
        id: `tl-${Date.now()}-1`,
        timestamp: now.toISOString(),
        actor: "CUSTOMER",
        title: payload.caseType === "claim_product" ? "Klaim Garansi Toko Dikirim" : "Klaim Garansi Layanan Dikirim",
        description: `Customer mengajukan klaim untuk ${payload.itemTitle}. Batas waktu respons pelaku usaha adalah 3 x 24 jam.`,
      },
    ];

    const newCase: AfterSalesCase = {
      id: caseId,
      caseNumber,
      caseType: payload.caseType,
      sourceOrderId: payload.sourceOrderId,
      sourceOrderNumber: payload.sourceOrderNumber,
      customerId: "cust-01",
      customerName: "Budi Santoso",
      organizationId: payload.organizationId,
      organizationName: payload.organizationName,
      organizationType: payload.organizationType,
      itemTitle: payload.itemTitle,
      itemImageUrl: payload.itemImageUrl,
      itemCategory: payload.itemCategory || (payload.caseType === "claim_product" ? "Suku Cadang" : "Jasa Layanan"),
      orderedQuantity: 1,
      affectedQuantity: 1,
      itemPrice: payload.itemPrice,
      issueReason: payload.issueReason,
      issueDescription: payload.issueDescription,
      evidenceMedia: payload.evidenceMedia || [],
      warrantyId: payload.warrantyId,
      warrantyName: payload.warrantyName,
      warrantyDurationDays: payload.warrantyDurationDays,
      warrantyExpiryDate: payload.warrantyExpiryDate,
      customerRequestedSolution: payload.customerRequestedSolution || "REPAIR",
      submittedAt: now.toISOString(),
      slaDeadlineAt: slaDeadline.toISOString(),
      isNoResponse: false,
      mainStatus: "SUBMITTED",
      specialCondition: "NONE",
      timeline: initialTimeline,
    };

    setCases((prev) => [newCase, ...prev]);

    // If warrantyId exists, update entitlement
    if (payload.warrantyId) {
      setWarranties((prev) =>
        prev.map((w) => (w.id === payload.warrantyId ? { ...w, activeCaseId: caseId } : w))
      );
    }

    return newCase;
  };

  const submitReturn = (payload: SubmitReturnPayload): AfterSalesCase => {
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const caseId = `CAS-RET-${Date.now().toString().slice(-6)}`;
    const caseNumber = `CAS-2026-RET-${Math.floor(100 + Math.random() * 900)}`;

    const initialTimeline: TimelineActivity[] = [
      {
        id: `tl-${Date.now()}-1`,
        timestamp: now.toISOString(),
        actor: "CUSTOMER",
        title: `Permintaan Retur Barang Dikirim (${payload.affectedQuantity} unit)`,
        description: `Customer mengajukan retur untuk ${payload.itemTitle} dengan pilihan solusi: ${
          payload.customerRequestedSolution === "REFUND" ? "Pengembalian Dana (Refund)" : "Penggantian Barang Baru"
        }.`,
      },
    ];

    const newCase: AfterSalesCase = {
      id: caseId,
      caseNumber,
      caseType: "return_product",
      sourceOrderId: payload.sourceOrderId,
      sourceOrderNumber: payload.sourceOrderNumber,
      customerId: "cust-01",
      customerName: "Budi Santoso",
      organizationId: payload.organizationId,
      organizationName: payload.organizationName,
      organizationType: "MERCHANT",
      itemTitle: payload.itemTitle,
      itemImageUrl: payload.itemImageUrl,
      itemCategory: payload.itemCategory || "Suku Cadang & Produk",
      orderedQuantity: payload.orderedQuantity,
      affectedQuantity: payload.affectedQuantity,
      itemPrice: payload.itemPrice,
      issueReason: payload.issueReason,
      issueDescription: payload.issueDescription,
      evidenceMedia: payload.evidenceMedia || [],
      customerRequestedSolution: payload.customerRequestedSolution,
      submittedAt: now.toISOString(),
      slaDeadlineAt: slaDeadline.toISOString(),
      isNoResponse: false,
      mainStatus: "SUBMITTED",
      specialCondition: "NONE",
      timeline: initialTimeline,
      returnShipping: {
        requiresPhysicalReturn: true, // Default to true unless missing parts
        shippingFeePayer: "MERCHANT",
        feePayerExplanation: "Kesalahan pengiriman atau cacat bawaan ditanggung oleh Merchant.",
        returnAddress: "Toko Jaya Pendingin Glodok, Blok D No. 12, Glodok Jaya, Jakarta Barat",
      },
    };

    setCases((prev) => [newCase, ...prev]);
    return newCase;
  };

  const customerAcceptAlternativeProposal = (caseId: string) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        const solution = c.merchantAlternativeProposal?.solution || "REPLACEMENT";
        const newTimeline: TimelineActivity = {
          id: `tl-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "CUSTOMER",
          title: "Solusi Alternatif Disetujui Customer",
          description: `Customer menyetujui solusi yang ditawarkan Merchant: ${solution}. Kasus dilanjutkan ke tahap penyelesaian.`,
        };
        return {
          ...c,
          approvedSolution: solution,
          specialCondition: "NONE",
          mainStatus: "IN_RESOLUTION",
          merchantAlternativeProposal: c.merchantAlternativeProposal
            ? { ...c.merchantAlternativeProposal, customerAccepted: true }
            : undefined,
          timeline: [...c.timeline, newTimeline],
        };
      })
    );
  };

  const customerRejectAlternativeProposal = (caseId: string, reason: string) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        const newTimeline: TimelineActivity = {
          id: `tl-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "CUSTOMER",
          title: "Solusi Alternatif Ditolak Customer",
          description: `Customer menolak solusi alternatif dengan alasan: "${reason}". Meminta peninjauan ulang solusi awal.`,
        };
        return {
          ...c,
          specialCondition: "NONE",
          merchantAlternativeProposal: c.merchantAlternativeProposal
            ? { ...c.merchantAlternativeProposal, customerAccepted: false }
            : undefined,
          timeline: [...c.timeline, newTimeline],
        };
      })
    );
  };

  const customerSubmitReturnShipping = (
    caseId: string,
    trackingNumber: string,
    courierName: string,
    claimedFee?: number
  ) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        const newTimeline: TimelineActivity = {
          id: `tl-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "CUSTOMER",
          title: "Resi Pengembalian Barang Diunggah",
          description: `Customer telah mengirimkan barang via ${courierName} dengan no. resi ${trackingNumber}.`,
        };
        return {
          ...c,
          mainStatus: "IN_RESOLUTION",
          returnShipping: {
            ...c.returnShipping!,
            courierName,
            trackingNumber,
            claimedShippingFee: claimedFee,
          },
          timeline: [...c.timeline, newTimeline],
        };
      })
    );
  };

  const customerReportIssue = (caseId: string, reason: string) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        const reportId = `DISP-${Date.now().toString().slice(-6)}`;
        const newTimeline: TimelineActivity = {
          id: `tl-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "CUSTOMER",
          title: `Laporan Diteruskan ke Support & Dispute SERVIO (${reportId})`,
          description: `Customer melaporkan kendala ke Customer Support SERVIO (Modul 09 Demo): "${reason}". Riwayat kasus tetap tersimpan.`,
        };
        return {
          ...c,
          reportedToSupport: true,
          reportDetails: {
            reportId,
            reportedAt: new Date().toISOString(),
            reason,
          },
          timeline: [...c.timeline, newTimeline],
        };
      })
    );
  };

  const customerApprovePaidWork = (caseId: string) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId || !c.warrantyJob?.paidWorkQuote) return c;
        const newTimeline: TimelineActivity = {
          id: `tl-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "CUSTOMER",
          title: "Customer Menyetujui Estimasi Pekerjaan Berbayar Tambahan",
          description: `Customer menyetujui tambahan pengerjaan di luar garansi senilai Rp${c.warrantyJob.paidWorkQuote.amount.toLocaleString(
            "id-ID"
          )}: ${c.warrantyJob.paidWorkQuote.description}. (Simulasi Demo, tidak ada tagihan riil).`,
        };
        return {
          ...c,
          warrantyJob: {
            ...c.warrantyJob,
            paidWorkQuote: {
              ...c.warrantyJob.paidWorkQuote,
              customerApproved: true,
            },
          },
          timeline: [...c.timeline, newTimeline],
        };
      })
    );
  };

  const merchantApproveCase = (
    caseId: string,
    solution: AfterSalesSolutionType,
    note: string
  ) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        const now = new Date().toISOString();
        const newTimeline: TimelineActivity = {
          id: `tl-${Date.now()}`,
          timestamp: now,
          actor: "MERCHANT",
          title: `Pengajuan Disetujui Merchant (${solution})`,
          description: note || `Merchant menyetujui penanganan masalah dengan solusi: ${solution}.`,
        };

        const updated: AfterSalesCase = {
          ...c,
          approvedSolution: solution,
          respondedAt: now,
          mainStatus: "IN_RESOLUTION",
          specialCondition: "NONE",
          timeline: [...c.timeline, newTimeline],
        };

        if (solution === "REFUND") {
          updated.refundDetail = {
            productAmount: c.itemPrice * c.affectedQuantity,
            approvedShippingAmount: 15000,
            feeAdjustment: 0,
            totalRefund: c.itemPrice * c.affectedQuantity + 15000,
            approvedAt: now,
            refundReference: `REF-SPAY-DEMO-${Date.now().toString().slice(-5)}`,
            status: "PROCESSING",
            statusNote: "Refund telah disetujui penjual. Dana sedang diproses dan belum masuk ke saldo S-Pay.",
            payoutDestination: "Saldo S-Pay Customer (Simulasi)",
          };
        } else if (solution === "REPLACEMENT") {
          updated.replacementShipment = {
            replacementItemName: `${c.itemTitle} (Unit Pengganti Baru)`,
            courierName: "JNE Express",
            shippingStatus: "PREPARING",
            estimatedArrival: "2-3 Hari Kerja",
          };
        }

        return updated;
      })
    );
  };

  const merchantRejectCase = (caseId: string, rejectionReason: string) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        const now = new Date().toISOString();
        const newTimeline: TimelineActivity = {
          id: `tl-${Date.now()}`,
          timestamp: now,
          actor: "MERCHANT",
          title: "Pengajuan Ditolak oleh Merchant",
          description: `Alasan penolakan: ${rejectionReason}`,
        };
        return {
          ...c,
          mainStatus: "REJECTED",
          specialCondition: "NONE",
          respondedAt: now,
          rejectionReason,
          timeline: [...c.timeline, newTimeline],
        };
      })
    );
  };

  const merchantProposeAlternative = (
    caseId: string,
    alternativeSolution: AfterSalesSolutionType,
    note: string
  ) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        const now = new Date().toISOString();
        const newTimeline: TimelineActivity = {
          id: `tl-${Date.now()}`,
          timestamp: now,
          actor: "MERCHANT",
          title: "Merchant Mengusulkan Solusi Alternatif",
          description: `Merchant menawarkan solusi: ${alternativeSolution}. Catatan: "${note}". Menunggu persetujuan Customer.`,
        };
        return {
          ...c,
          specialCondition: "WAITING_CUSTOMER_APPROVAL",
          merchantAlternativeProposal: {
            solution: alternativeSolution,
            note,
            proposedAt: now,
            customerAccepted: undefined,
          },
          timeline: [...c.timeline, newTimeline],
        };
      })
    );
  };

  const merchantConfirmReturnReceived = (caseId: string, inspected: boolean, inspectionNote?: string) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        const newTimeline: TimelineActivity = {
          id: `tl-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "MERCHANT",
          title: "Barang Retur Diterima oleh Merchant",
          description: inspected
            ? `Pemeriksaan selesai: ${inspectionNote || "Kondisi barang sesuai klaim."}`
            : "Barang telah diterima di alamat gudang penjual.",
        };
        return {
          ...c,
          returnShipping: c.returnShipping
            ? {
                ...c.returnShipping,
                receivedByMerchant: true,
                inspectedByMerchant: inspected,
                inspectionNote,
              }
            : undefined,
          timeline: [...c.timeline, newTimeline],
        };
      })
    );
  };

  const providerApproveWarrantyJob = (
    caseId: string,
    workerName: string,
    scheduledDate: string,
    note?: string
  ) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        const now = new Date().toISOString();
        const newTimeline: TimelineActivity = {
          id: `tl-${Date.now()}`,
          timestamp: now,
          actor: "PROVIDER",
          title: "Klaim Garansi Layanan Disetujui (Rp0)",
          description: `Pekerjaan garansi dijadwalkan bersama teknisi ${workerName} pada ${scheduledDate}. Ditanggung penuh oleh Provider (Rp0).`,
        };
        return {
          ...c,
          mainStatus: "IN_RESOLUTION",
          specialCondition: "NONE",
          approvedSolution: "REPAIR",
          respondedAt: now,
          warrantyJob: {
            jobId: `JOB-WAR-05B-${Date.now().toString().slice(-4)}`,
            jobTitle: `Klaim Garansi — ${c.itemTitle}`,
            isWarrantyCovered: true,
            coveredAmountText: "Rp0 (Ditanggung Garansi Layanan)",
            workerName,
            scheduledDate,
            operationalStatus: "ASSIGNED",
            notes: note || "Pengerjaan perbaikan garansi tanpa biaya.",
          },
          timeline: [...c.timeline, newTimeline],
        };
      })
    );
  };

  const providerRejectClaim = (caseId: string, rejectionReason: string) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        const now = new Date().toISOString();
        const newTimeline: TimelineActivity = {
          id: `tl-${Date.now()}`,
          timestamp: now,
          actor: "PROVIDER",
          title: "Klaim Garansi Layanan Ditolak",
          description: `Alasan penolakan: ${rejectionReason}`,
        };
        return {
          ...c,
          mainStatus: "REJECTED",
          specialCondition: "NONE",
          respondedAt: now,
          rejectionReason,
          timeline: [...c.timeline, newTimeline],
        };
      })
    );
  };

  const addPreset = (preset: Omit<WarrantyPreset, "id" | "createdAt" | "usageCount">): WarrantyPreset => {
    const newPreset: WarrantyPreset = {
      ...preset,
      id: `preset-${Date.now().toString().slice(-6)}`,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };
    setPresets((prev) => [newPreset, ...prev]);
    return newPreset;
  };

  const updatePreset = (id: string, updates: Partial<WarrantyPreset>) => {
    setPresets((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const togglePresetStatus = (id: string) => {
    setPresets((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)));
  };

  const resetDemoData = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_CASES);
      localStorage.removeItem(STORAGE_KEY_WARRANTIES);
      localStorage.removeItem(STORAGE_KEY_PRESETS);
    }
    setCases(MOCK_AFTER_SALES_CASES);
    setWarranties(MOCK_CUSTOMER_WARRANTIES);
    setPresets(MOCK_WARRANTY_PRESETS);
  };

  return (
    <AfterSalesContext.Provider
      value={{
        cases,
        warranties,
        presets,
        warrantyPresets: presets,
        activeOrgId,
        setActiveOrgId,
        getCaseById,
        getWarrantyById,
        getPresetsByOrg,
        getActivePresetsByOrg,
        getCasesByOrg,
        submitClaim,
        submitReturn,
        customerAcceptAlternativeProposal,
        customerRejectAlternativeProposal,
        customerSubmitReturnShipping,
        customerReportIssue,
        customerApprovePaidWork,
        merchantApproveCase,
        merchantRejectCase,
        merchantProposeAlternative,
        merchantConfirmReturnReceived,
        providerApproveWarrantyJob,
        providerRejectClaim,
        addPreset,
        updatePreset,
        togglePresetStatus,
        resetDemoData,
      }}
    >
      {children}
    </AfterSalesContext.Provider>
  );
}

export function useAfterSales() {
  const context = useContext(AfterSalesContext);
  if (!context) {
    throw new Error("useAfterSales must be used within an AfterSalesProvider");
  }
  return context;
}
