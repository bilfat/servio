"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useActiveRole } from "@/context/RoleContext";
import {
  AfterSalesCase,
  CustomerWarrantyEntitlement,
  WarrantyPreset,
} from "@/types/afterSales";
import {
  afterSalesApi,
  AfterSalesCase as BackendCase,
  OrderWarrantyEntitlement as BackendWarranty,
  WarrantyOption as BackendOption,
  SubmitCasePayload,
} from "@/lib/afterSalesApi";

export const AFTER_SALES_UPDATED_EVENT = "servio_after_sales_updated";
export const AFTER_SALES_BROADCAST_CHANNEL = "servio_after_sales_channel";

export function notifyAfterSalesUpdated(detail?: any) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(AFTER_SALES_UPDATED_EVENT, { detail }));
  } catch {
    // ignore
  }
  try {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel(AFTER_SALES_BROADCAST_CHANNEL);
      bc.postMessage({ type: "SYNC_AFTER_SALES", timestamp: Date.now(), detail });
      bc.close();
    }
  } catch {
    // fallback
  }
  try {
    localStorage.setItem("servio_after_sales_sync", String(Date.now()));
  } catch {
    // fallback
  }
}

export interface SubmitClaimPayload {
  caseType: "claim_product" | "claim_service";
  sourceOrderId: string;
  sourceOrderNumber?: string;
  itemTitle?: string;
  itemImageUrl?: string;
  itemCategory?: string;
  itemPrice?: number;
  organizationId?: string;
  organizationName?: string;
  organizationType?: "MERCHANT" | "PROVIDER";
  warrantyId?: string;
  warrantyName?: string;
  warrantyDurationDays?: number;
  warrantyExpiryDate?: string;
  issueReason: string;
  issueDescription: string;
  evidenceMedia?: string[];
  customerRequestedSolution?: "REPLACEMENT" | "REWORK" | "REFUND" | "REPAIR";
  orderItemId?: string;
  quantity?: number;
  catalogSnapshot?: Record<string, any>;
}

export interface SubmitReturnPayload {
  sourceOrderId: string;
  sourceOrderNumber?: string;
  itemTitle?: string;
  itemImageUrl?: string;
  itemCategory?: string;
  itemPrice?: number;
  orderedQuantity?: number;
  affectedQuantity?: number;
  organizationId?: string;
  organizationName?: string;
  issueReason: string;
  issueDescription: string;
  evidenceMedia?: string[];
  customerRequestedSolution: "REFUND" | "REPLACEMENT";
  orderItemId?: string;
  catalogSnapshot?: Record<string, any>;
}

interface AfterSalesContextType {
  cases: AfterSalesCase[];
  warranties: CustomerWarrantyEntitlement[];
  presets: WarrantyPreset[];
  warrantyPresets: WarrantyPreset[];
  activeOrgId: string;
  setActiveOrgId: (orgId: string) => void;
  isLoading: boolean;
  error: string | null;
  refreshData: (overrideScope?: AfterSalesFetchScope, isSilent?: boolean) => Promise<void>;

  // Selectors
  getCaseById: (id: string) => AfterSalesCase | undefined;
  getWarrantyById: (id: string) => CustomerWarrantyEntitlement | undefined;
  getPresetsByOrg: (orgId: string) => WarrantyPreset[];
  getActivePresetsByOrg: (orgId: string) => WarrantyPreset[];
  getCasesByOrg: (orgId: string) => AfterSalesCase[];
  getMainStatusDisplay: (statusOrCase: any) => { label: string; color: string; description?: string };

  // Customer Actions
  submitClaim: (payload: SubmitClaimPayload) => Promise<AfterSalesCase>;
  submitReturn: (payload: SubmitReturnPayload) => Promise<AfterSalesCase>;
  customerAcceptAlternativeProposal: (caseId: string, proposalId?: string) => Promise<void>;
  customerRejectAlternativeProposal: (caseId: string, reason: string, proposalId?: string) => Promise<void>;
  customerSubmitReturnShipping: (
    caseId: string,
    trackingNumber: string,
    courierName: string,
    claimedFee?: number,
    receiptRef?: string,
    feeProofRef?: string,
    customerNotes?: string
  ) => Promise<void>;
  customerReportIssue: (caseId: string, reason: string) => Promise<{ message: string }>;
  customerAddEvidence: (caseId: string, mediaRef: string, contentType?: string, sizeBytes?: number) => Promise<void>;
  customerApprovePaidWork: (caseId: string) => Promise<void>;
  customerConfirmCompletion: (caseId: string, notes?: string, rating?: number) => Promise<void>;

  // Merchant / Provider Actions
  merchantApproveCase: (caseId: string, solution?: string, note?: string) => Promise<void>;
  merchantRejectCase: (caseId: string, rejectionReason: string) => Promise<void>;
  merchantProposeAlternative: (caseId: string, alternativeSolution: string, note: string) => Promise<void>;
  merchantRequestEvidence: (caseId: string, reason: string) => Promise<void>;
  merchantSaveReturnInstructions: (
    caseId: string,
    payload: {
      requires_physical_return: boolean;
      no_return_reason?: string;
      recipient_name?: string;
      recipient_phone?: string;
      return_address?: string;
      packaging_instructions?: string;
      shipping_fee_payer?: "MERCHANT" | "CUSTOMER" | "THIRD_PARTY";
      shipping_fee_method?: string;
      reimbursement_instructions?: string;
      deadline_at?: string;
      merchant_notes?: string;
    }
  ) => Promise<void>;
  merchantConfirmReturnReceived: (
    caseId: string,
    payload?: {
      received_at?: string;
      received_by?: string;
      quantity_received?: number;
      package_condition?: string;
      receipt_proof_ref?: string;
      receipt_notes?: string;
      status?: "RECEIVED" | "DISPUTED_NOT_RECEIVED";
      dispute_reason?: string;
    }
  ) => Promise<void>;
  merchantSubmitReturnInspection: (
    caseId: string,
    payload: {
      quantity_inspected: number;
      quantity_approved: number;
      item_condition: string;
      is_sku_matched?: boolean;
      is_issue_matched?: boolean;
      is_components_complete?: boolean;
      inspection_outcome: "MATCHED" | "PARTIAL" | "MISMATCH";
      inspection_notes?: string;
      evidence_refs?: string[];
    }
  ) => Promise<void>;
  merchantStartResolution: (caseId: string) => Promise<void>;
  merchantCompleteCase: (caseId: string, evidenceRef: string) => Promise<void>;
  providerApproveWarrantyJob: (caseId: string, workerName: string, scheduledDate: string, note?: string) => Promise<void>;
  providerRejectClaim: (caseId: string, rejectionReason: string) => Promise<void>;

  // Preset Management
  addPreset: (preset: {
    name: string;
    durationDays: number;
    coverage: string;
    exclusions?: string;
    organizationId?: string;
    organizationType?: "MERCHANT" | "PROVIDER";
    isActive?: boolean;
  }) => Promise<WarrantyPreset>;
  updatePreset: (
    id: string,
    updates: {
      name: string;
      durationDays: number;
      coverage: string;
      exclusions?: string;
      isActive?: boolean;
    }
  ) => Promise<WarrantyPreset>;
  togglePresetStatus: (id: string) => Promise<void>;

  // Demo Reset
  resetDemoData: () => Promise<void>;
}

export const SHARED_ORG_NAME_MAP: Record<string, string> = {
  "org-merch-jaya-motor": "Jaya Motor Official",
  "merch-jaya-motor": "Jaya Motor Official",
  "org-prov-surya-teknik": "Surya Teknik AC & Listrik",
  "prov-surya-teknik": "Surya Teknik AC & Listrik",
  "0c1467e7-af68-4b26-ae84-daa41d51aed0": "BUDIAJASA",
  "0740d857-b665-4191-aaf5-d7dd3611dc1d": "sukses gembira",
  "087c97b7-2c46-4b97-ba35-1177dd72ba3a": "Bengkel Sejuk Sentosa AC",
  "2290a88d-7a24-4677-b940-5823cdd68c1d": "Glodok Teknik & Sparepart AC Official",
  "4a5e9ad0-b06e-4434-ad8c-e87e755472bd": "PT Nusantara Parts Prima",
};

export const SHARED_CATALOG_ITEM_MAP: Record<string, { title: string; image?: string }> = {
  "685086c9-d85f-4968-a5ae-2c9b5b455776": {
    title: "Kabel Power NYM 3x2.5mm Glodok Standard",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
  },
  "6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd": {
    title: "Cuci dan Servis AC Split Bergaransi Mandiri Teknik",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80",
  },
  "06ae9def-2886-4a99-a766-471e7125e2a2": {
    title: "Kipas Exhaust Glodok Industri 653",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
  },
  "141abe15-d626-4908-9544-a46152f5b45b": {
    title: "Kipas Exhaust Glodok Industri 189",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
  },
  "1bf360f6-0e72-4283-ad36-42ccb9eee089": {
    title: "Kipas Exhaust Glodok Industri 475",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
  },
  "3aecc18b-c7d4-49f1-a844-1c5cd7711f29": {
    title: "Kipas Exhaust Glodok Industri 495",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
  },
  "62c82a04-c435-4f94-806f-570cb195e910": {
    title: "Kipas Exhaust Glodok Industri 727",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
  },
  "6b37a894-6cb8-441a-97f2-8877c01e91f5": {
    title: "Produk Kabel Tembaga Premium",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
  },
  "83389c39-b90f-4314-824b-9d652f5c6a67": {
    title: "Kompresor AC Inverter 1 PK Rotary Dual Piston",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
  },
  "c46abc4e-1c6e-42ab-a367-1a08410a76cf": {
    title: "Freon R32 Refrigerant Eco Friendly Tabung 3kg",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
  },
  "cd33158c-8570-4779-a150-59dd02ea3e0e": {
    title: "Kipas Exhaust Glodok Industri 886",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80",
  },
  "c0beae3f-8ea0-466c-8dcf-a93f2a4125e2": {
    title: "Perbaiki Ban & Servis Tambal Panggilan",
    image: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400&auto=format&fit=crop&q=80",
  },
};

export function normalizeBackendCaseToUiCase(bc: BackendCase): AfterSalesCase {
  const isGoods = bc.source_order_kind === "GOODS";
  const caseType =
    bc.case_type === "GOODS_WARRANTY"
      ? "claim_product"
      : bc.case_type === "SERVICE_WARRANTY"
      ? "claim_service"
      : "return_product";

  const firstItem = bc.items?.[0];
  const snap = firstItem?.catalog_snapshot;
  const itemTitle =
    snap?.product_snapshot?.name ||
    snap?.name ||
    snap?.title ||
    snap?.product_name ||
    snap?.service_name ||
    (firstItem?.source_item_ref && SHARED_CATALOG_ITEM_MAP[firstItem.source_item_ref]?.title) ||
    (firstItem?.source_item_ref && !firstItem.source_item_ref.startsWith("01M") ? firstItem.source_item_ref : undefined) ||
    (isGoods ? "Item Pesanan Barang" : "Layanan Pesanan Jasa");

  const itemImageUrl =
    snap?.image_url ||
    (firstItem?.source_item_ref && SHARED_CATALOG_ITEM_MAP[firstItem.source_item_ref]?.image) ||
    (isGoods
      ? "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80"
      : "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80");

  const itemPrice =
    Number(
      snap?.price ??
        snap?.price_idr ??
        snap?.unit_price ??
        snap?.unit_price_idr ??
        snap?.variant_snapshot?.price_idr ??
        0
    ) || 0;

  const totalQty = bc.items?.reduce((acc, it) => acc + (it.quantity_requested || 1), 0) || 1;
  const affectedQty = firstItem?.quantity_requested || 1;

  const allProposals: any[] = Array.isArray(bc.proposals) ? bc.proposals : [];
  const latestRawProp: any = bc.latest_proposal || bc.latestProposal || allProposals[0];
  const altProp: any =
    allProposals.find(
      (p) =>
        p.proposal_type === "ALTERNATIVE" ||
        (p.proposed_by_actor_kind && p.proposed_by_actor_kind !== "CUSTOMER") ||
        (p.proposed_by && p.proposed_by !== "CUSTOMER")
    ) ||
    (latestRawProp &&
    (latestRawProp.proposal_type === "ALTERNATIVE" ||
      (latestRawProp.proposed_by_actor_kind && latestRawProp.proposed_by_actor_kind !== "CUSTOMER") ||
      (latestRawProp.proposed_by && latestRawProp.proposed_by !== "CUSTOMER"))
      ? latestRawProp
      : null);

  const activeRef = bc.external_refs?.[0] || bc.externalRefs?.[0];

  // Map solution code to UI solution type
  const mapSolution = (s?: string | null): "REPAIR" | "REPLACEMENT" | "REFUND" | "OTHER" => {
    if (!s) return "OTHER";
    if (s === "REPLACEMENT") return "REPLACEMENT";
    if (s === "REFUND") return "REFUND";
    if (s === "REWORK" || s === "REPAIR_GOODS") return "REPAIR";
    return "OTHER";
  };

  const refundStatus = activeRef?.external_status?.toUpperCase();
  const isRefundReversed = refundStatus === "REVERSED";
  const isRefundSucceeded = refundStatus === "SUCCEEDED" || refundStatus === "COMPLETED";

  const orgNameMap = SHARED_ORG_NAME_MAP;

  const altState = altProp ? String(altProp.state || altProp.status || "") : "";

  const reportedEvent = (bc.events || []).find((ev: any) => ev.event_type === "REPORTED_TO_SUPPORT");
  const isReported =
    Boolean((bc as any).reported_to_support_at) ||
    Boolean((bc as any).support_ticket_ref) ||
    Boolean(reportedEvent);

  return {
    id: bc.id,
    caseNumber: bc.case_number || bc.id,
    caseType,
    sourceOrderId: bc.source_order_id,
    sourceOrderNumber: bc.source_merchant_order_id || bc.source_order_id,
    customerId: bc.customer_id,
    customerName: "Pelanggan Terverifikasi",
    organizationId: bc.owner_org_id,
    organizationName:
      ((bc as any).organization_name && !/^[0-9a-f-]{36}$/i.test((bc as any).organization_name)
        ? (bc as any).organization_name
        : null) ||
      orgNameMap[bc.owner_org_id] ||
      bc.owner_org_id,
    organizationType: bc.owner_org_type || (isGoods ? "MERCHANT" : "PROVIDER"),
    itemTitle,
    itemImageUrl,
    itemCategory: isGoods ? "Suku Cadang & Komponen" : "Jasa Layanan",
    orderedQuantity: totalQty,
    affectedQuantity: affectedQty,
    itemPrice,
    issueReason: bc.reason_code,
    issueDescription: bc.description,
    evidenceMedia: bc.evidence?.map((e) => e.media_ref) || [],
    warrantyId: bc.entitlement_id || undefined,
    customerRequestedSolution: mapSolution(bc.initial_solution),
    approvedSolution: bc.agreed_solution ? mapSolution(bc.agreed_solution) : undefined,
    chosenSolution: bc.agreed_solution ? mapSolution(bc.agreed_solution) : undefined,
    merchantAlternativeProposal: altProp
      ? {
          proposalId: altProp.id,
          solution: mapSolution(altProp.solution_code),
          rawSolutionCode: altProp.solution_code,
          note: altProp.reason || altProp.reason_text || "",
          proposedAt: altProp.created_at,
          state: altState,
          customerAccepted:
            altState === "ACCEPTED"
              ? true
              : altState === "DECLINED"
              ? false
              : undefined,
        }
      : undefined,
    submittedAt: bc.created_at,
    slaDeadlineAt: bc.response_due_at,
    respondedAt: bc.first_meaningful_response_at || undefined,
    isNoResponse: bc.response_state === "OVERDUE",
    mainStatus: bc.main_status,
    specialCondition:
      bc.response_state === "OVERDUE"
        ? "NO_RESPONSE"
        : bc.substate === "AWAITING_CUSTOMER_INFO"
        ? "WAITING_CUSTOMER_INFO"
        : bc.substate === "AWAITING_CUSTOMER_CONSENT"
        ? "WAITING_CUSTOMER_APPROVAL"
        : bc.main_status === "CANCELLED"
        ? "CANCELLED"
        : "NONE",
    rejectionReason: bc.reject_reason || undefined,
    timeline: (bc.events || []).map((ev: any) => ({
      id: ev.id,
      timestamp: ev.occurred_at || ev.created_at,
      actor: ev.actor_kind as any,
      title: ev.event_type.replace(/_/g, " "),
      description: ev.reason || "Aktivitas kronologis pengajuan tercatat di sistem.",
    })),
    refundDetail:
      bc.agreed_solution === "REFUND" || bc.resolution?.solution_code === "REFUND"
        ? {
            productAmount: itemPrice * affectedQty,
            approvedShippingAmount: 0,
            feeAdjustment: 0,
            totalRefund: itemPrice * affectedQty,
            approvedAt: bc.updated_at,
            refundReference: activeRef?.external_id || `AS-REF-${bc.id}`,
            status: isRefundReversed
              ? "REVERSED"
              : isRefundSucceeded
              ? "SUCCEEDED"
              : refundStatus === "PROCESSING" || refundStatus === "PENDING_DISPATCH"
              ? "PROCESSING"
              : refundStatus === "FAILED"
              ? "FAILED"
              : "APPROVED",
            financeStatus: refundStatus || "PENDING_DISPATCH",
            statusNote: isRefundReversed
              ? "Dana refund telah dibalikkan (reversal) dalam audit rekonsiliasi keuangan Finance 06."
              : isRefundSucceeded
              ? "Dana telah dikreditkan ke saldo S-Pay Customer oleh Finance 06."
              : "Solusi refund disetujui, sedang diproses pendanaan oleh modul Finance 06.",
            payoutDestination: "Saldo S-Pay Customer",
          }
        : undefined,
    refundTrack:
      bc.agreed_solution === "REFUND" || bc.resolution?.solution_code === "REFUND"
        ? {
            productAmount: itemPrice * affectedQty,
            approvedShippingAmount: 0,
            feeAdjustment: 0,
            totalRefund: itemPrice * affectedQty,
            approvedAt: bc.updated_at,
            refundReference: activeRef?.external_id || `AS-REF-${bc.id}`,
            status: isRefundReversed
              ? "REVERSED"
              : isRefundSucceeded
              ? "SUCCEEDED"
              : refundStatus === "PROCESSING" || refundStatus === "PENDING_DISPATCH"
              ? "PROCESSING"
              : refundStatus === "FAILED"
              ? "FAILED"
              : "APPROVED",
            financeStatus: refundStatus || "PENDING_DISPATCH",
            statusNote: isRefundReversed
              ? "Dana refund telah dibalikkan (reversal) dalam audit rekonsiliasi keuangan Finance 06."
              : isRefundSucceeded
              ? "Dana telah dikreditkan ke saldo S-Pay Customer oleh Finance 06."
              : "Menunggu penyelesaian pencairan pengembalian dana oleh modul Finance 06.",
            payoutDestination: "Saldo S-Pay Customer",
          }
        : undefined,
    replacementShipment:
      bc.agreed_solution === "REPLACEMENT" || bc.resolution?.solution_code === "REPLACEMENT"
        ? {
            replacementItemName: itemTitle,
            courierName: "Pengiriman Pengganti (05A)",
            trackingNumber: activeRef?.external_id,
            shippingStatus:
              activeRef?.external_status === "DELIVERED"
                ? "DELIVERED"
                : activeRef?.external_status === "SHIPPED"
                ? "SHIPPED"
                : "PREPARING",
            shippedAt: bc.updated_at,
          }
        : undefined,
    warrantyJob:
      bc.agreed_solution === "REWORK" || bc.resolution?.solution_code === "REWORK"
        ? {
            jobId: activeRef?.external_id || `WRK-${bc.id.slice(0, 8)}`,
            jobTitle: `Klaim Garansi — ${itemTitle}`,
            isWarrantyCovered: true,
            coveredAmountText: "Rp0 (Ditanggung Garansi Layanan)",
            operationalStatus:
              activeRef?.external_status === "COMPLETED"
                ? "DONE"
                : activeRef?.external_status === "IN_PROGRESS"
                ? "IN_PROGRESS"
                : "ASSIGNED",
          }
        : undefined,
    returnShipping:
      bc.return_instruction ||
      bc.returnInstruction ||
      bc.case_type === "GOODS_RETURN" ||
      bc.return_shipment ||
      bc.returnShipment
        ? {
            requiresPhysicalReturn:
              bc.return_instruction?.requires_physical_return ??
              bc.returnInstruction?.requires_physical_return ??
              true,
            noReturnReason:
              bc.return_instruction?.no_return_reason ||
              bc.returnInstruction?.no_return_reason,
            shippingFeePayer: (bc.return_instruction?.shipping_fee_payer ||
              bc.returnInstruction?.shipping_fee_payer ||
              "MERCHANT") as "MERCHANT" | "CUSTOMER" | "THIRD_PARTY",
            feePayerExplanation:
              bc.return_instruction?.reimbursement_instructions ||
              ((bc.return_instruction?.shipping_fee_payer ||
                bc.returnInstruction?.shipping_fee_payer) === "CUSTOMER"
                ? "Ongkos kirim pengembalian ditanggung oleh Pembeli sesuai ketentuan kasus."
                : "Ongkos kirim pengembalian ditanggung sepenuhnya oleh Penjual."),
            recipientName:
              bc.return_instruction?.recipient_name ||
              bc.returnInstruction?.recipient_name,
            recipientPhone:
              bc.return_instruction?.recipient_phone ||
              bc.returnInstruction?.recipient_phone,
            returnAddress:
              bc.return_instruction?.return_address ||
              bc.returnInstruction?.return_address,
            packagingInstructions:
              bc.return_instruction?.packaging_instructions ||
              bc.returnInstruction?.packaging_instructions,
            shippingFeeMethod:
              bc.return_instruction?.shipping_fee_method ||
              bc.returnInstruction?.shipping_fee_method,
            reimbursementInstructions:
              bc.return_instruction?.reimbursement_instructions ||
              bc.returnInstruction?.reimbursement_instructions,
            deadlineAt:
              bc.return_instruction?.deadline_at ||
              bc.returnInstruction?.deadline_at,
            courierName:
              bc.return_shipment?.courier_name ||
              bc.returnShipment?.courier_name,
            trackingNumber:
              bc.return_shipment?.tracking_number ||
              bc.returnShipment?.tracking_number,
            shippedAt:
              bc.return_shipment?.shipped_at ||
              bc.returnShipment?.shipped_at,
            shippingFeeReceiptUrl:
              bc.return_shipment?.shipping_receipt_ref ||
              bc.returnShipment?.shipping_receipt_ref,
            feePaymentProofUrl:
              bc.return_shipment?.fee_payment_proof_ref ||
              bc.returnShipment?.fee_payment_proof_ref,
            claimedShippingFee: Number(
              bc.return_shipment?.shipping_fee_paid_idr ??
                bc.returnShipment?.shipping_fee_paid_idr ??
                0
            ),
            customerNotes:
              bc.return_shipment?.customer_notes ||
              bc.returnShipment?.customer_notes,
            receivedByMerchant: Boolean(
              bc.return_receipt || bc.returnReceipt
            ),
            receivedAt:
              bc.return_receipt?.received_at ||
              bc.returnReceipt?.received_at,
            receivedBy:
              bc.return_receipt?.received_by ||
              bc.returnReceipt?.received_by,
            quantityReceived:
              bc.return_receipt?.quantity_received ||
              bc.returnReceipt?.quantity_received,
            packageCondition:
              bc.return_receipt?.package_condition ||
              bc.returnReceipt?.package_condition,
            receiptProofUrl:
              bc.return_receipt?.receipt_proof_ref ||
              bc.returnReceipt?.receipt_proof_ref,
            receiptNotes:
              bc.return_receipt?.receipt_notes ||
              bc.returnReceipt?.receipt_notes,
            receiptStatus:
              bc.return_receipt?.status || bc.returnReceipt?.status,
            disputeReason:
              bc.return_receipt?.dispute_reason ||
              bc.returnReceipt?.dispute_reason,
            inspectedByMerchant: Boolean(
              bc.return_inspection || bc.returnInspection
            ),
            inspectedAt:
              bc.return_inspection?.inspected_at ||
              bc.returnInspection?.inspected_at,
            inspectedBy:
              bc.return_inspection?.inspected_by ||
              bc.returnInspection?.inspected_by,
            quantityInspected:
              bc.return_inspection?.quantity_inspected ||
              bc.returnInspection?.quantity_inspected,
            quantityApproved:
              bc.return_inspection?.quantity_approved ||
              bc.returnInspection?.quantity_approved,
            inspectionOutcome:
              bc.return_inspection?.inspection_outcome ||
              bc.returnInspection?.inspection_outcome,
            itemCondition:
              bc.return_inspection?.item_condition ||
              bc.returnInspection?.item_condition,
            isSkuMatched:
              bc.return_inspection?.is_sku_matched ||
              bc.returnInspection?.is_sku_matched,
            isIssueMatched:
              bc.return_inspection?.is_issue_matched ||
              bc.returnInspection?.is_issue_matched,
            isComponentsComplete:
              bc.return_inspection?.is_components_complete ||
              bc.returnInspection?.is_components_complete,
            inspectionNote:
              bc.return_inspection?.inspection_notes ||
              bc.returnInspection?.inspection_notes,
            inspectionEvidence:
              bc.return_inspection?.evidence_refs ||
              bc.returnInspection?.evidence_refs,
          }
        : undefined,
    shippingExpenses: (
      bc.shipping_expenses ||
      bc.shippingExpenses ||
      []
    ).map((se: any) => ({
      expenseType: se.expense_type,
      feePayer: se.fee_payer,
      actualFeeIdr: Number(se.actual_fee_idr || 0),
      paidBy: se.paid_by,
      verificationStatus: se.verification_status,
      approvedReimbursementIdr: Number(
        se.approved_reimbursement_idr || 0
      ),
      reimbursementStatus: se.reimbursement_status,
      receiptRef: se.receipt_ref,
      notes: se.notes,
    })),
    reportedToSupport: isReported,
    reportDetails: isReported
      ? {
          reportId: (bc as any).support_ticket_ref || "PENDING_SUPPORT_INTEGRATION",
          reportedAt: (bc as any).reported_to_support_at || reportedEvent?.occurred_at || bc.updated_at,
          reason: reportedEvent?.reason || "Dilaporkan oleh pelanggan untuk eskalasi dukungan.",
        }
      : undefined,
    backend: bc,
  };
}

export function normalizeBackendWarrantyToUiWarranty(bw: BackendWarranty): CustomerWarrantyEntitlement {
  const sourceKind = bw.source_order_kind || bw.source_kind || "GOODS";
  const isProduct = sourceKind === "GOODS";
  const orderId = bw.source_order_id || bw.order_id || "";
  const rawOrderNumber = (bw as any).order_number;
  const orderNumber = rawOrderNumber || bw.source_merchant_order_id || bw.merchant_order_id || orderId;
  const presetName = bw.snapshot_name || bw.terms_snapshot?.name || (isProduct ? "Garansi Toko Resmi" : "Garansi Layanan Resmi");
  const durationDays = Number(bw.snapshot_duration_days ?? bw.terms_snapshot?.duration_days ?? 0);
  const coverage =
    bw.snapshot_coverage ||
    bw.terms_snapshot?.coverage_text ||
    bw.terms_snapshot?.coverage ||
    "Cakupan garansi resmi sesuai ketentuan pelaku usaha.";
  const exclusions =
    bw.snapshot_exclusion ||
    bw.terms_snapshot?.exclusion_text ||
    bw.terms_snapshot?.exclusion ||
    "Tidak ada pengecualian khusus.";
  const terms =
    (bw as any).snapshot_terms ||
    (bw as any).terms ||
    "Klaim dapat diajukan pelanggan melalui pusat purnajual selama masa garansi aktif dengan melampirkan bukti kendala produk.";

  const catalogRef = bw.catalog_ref || bw.product_id || bw.service_id;
  const catalogItem = catalogRef ? SHARED_CATALOG_ITEM_MAP[catalogRef] : undefined;

  const rawTitle = (bw as any).item_title;
  const snap = typeof (bw as any).catalog_snapshot === "string" 
    ? (() => { try { return JSON.parse((bw as any).catalog_snapshot); } catch { return {}; } })() 
    : ((bw as any).catalog_snapshot || {});
  const snapTitle =
    snap?.product_snapshot?.name ||
    snap?.name ||
    snap?.title ||
    snap?.product_name ||
    snap?.service_name;
  const catalogTitle = catalogItem?.title;
  const itemTitle =
    (rawTitle && rawTitle !== presetName ? rawTitle : null) ||
    snapTitle ||
    catalogTitle ||
    rawTitle ||
    (isProduct ? "Produk Bergaransi Toko" : "Layanan Jasa Bergaransi");

  const rawImage = (bw as any).item_image_url;
  const snapImage = snap?.image_url || snap?.imageUrl || snap?.images?.[0];
  const itemImageUrl =
    rawImage ||
    snapImage ||
    catalogItem?.image ||
    (isProduct
      ? "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80"
      : "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80");

  const orgNameMap = SHARED_ORG_NAME_MAP;
  const rawOrgName = (bw as any).organization_name;
  const isUuid = (val?: string) => Boolean(val && /^[0-9a-f-]{36}$/i.test(val));
  const organizationName =
    (rawOrgName && !isUuid(rawOrgName) ? rawOrgName : null) ||
    orgNameMap[bw.owner_org_id] ||
    (rawOrgName ? rawOrgName : (isProduct ? "Toko Mitra SERVIO" : "Mitra Penyedia Jasa"));

  const nowMs = Date.now();
  const expiresMs = bw.expires_at ? new Date(bw.expires_at).getTime() : 0;
  const isNotExpired = !expiresMs || expiresMs >= nowMs;

  const rawRemaining = (bw as any).remaining_days;
  const remainingDays = rawRemaining !== undefined
    ? Number(rawRemaining)
    : expiresMs > nowMs
    ? Math.max(0, Math.ceil((expiresMs - nowMs) / (1000 * 60 * 60 * 24)))
    : 0;

  const rawHasActive = (bw as any).has_active_case;
  const rawActiveCaseId = (bw as any).active_case_id;
  const rawActiveCaseStatus = (bw as any).active_case_status;
  const rawIsEligible = (bw as any).is_claim_eligible;

  return {
    id: bw.id,
    warrantyNumber: `WAR-${bw.id.slice(0, 8).toUpperCase()}`,
    orderId,
    orderNumber,
    orderItemKey: bw.order_item_key || bw.source_item_id || undefined,
    catalogRef,
    itemType: isProduct ? "PRODUCT" : "SERVICE",
    itemTitle,
    itemImageUrl,
    organizationId: bw.owner_org_id,
    organizationName,
    presetName,
    durationDays,
    orderedAt: bw.ordered_at || undefined,
    completedAt: bw.source_completed_at || undefined,
    startDate: bw.starts_at,
    endDate: bw.expires_at,
    coverage,
    exclusions,
    terms,
    merchantOrderId: bw.merchant_order_id,
    ownerOrgType: bw.owner_org_type || (isProduct ? "MERCHANT" : "PROVIDER"),
    quantity: bw.quantity ?? 1,
    claimedQuantity: (bw as any).claimed_quantity ?? 0,
    remainingQuantity: (bw as any).remaining_quantity !== undefined
      ? Number((bw as any).remaining_quantity)
      : Math.max(0, (bw.quantity ?? 1) - Number((bw as any).claimed_quantity ?? 0)),
    status: bw.status as any,
    isActive: (bw.status === "ACTIVE") && isNotExpired && (((bw as any).remaining_quantity === undefined) || Number((bw as any).remaining_quantity) > 0),
    remainingDays,
    hasActiveCase: Boolean(rawHasActive),
    activeCaseId: rawActiveCaseId,
    activeCaseStatus: rawActiveCaseStatus,
    isClaimEligible: rawIsEligible !== undefined
      ? Boolean(rawIsEligible)
      : (bw.status === "ACTIVE" && isNotExpired && !rawHasActive && (((bw as any).remaining_quantity ?? 1) > 0)),
    catalogSnapshot: (bw as any).catalog_snapshot || null,
    cases: (bw as any).cases || [],
  };
}

export function normalizeBackendOptionToPreset(opt: BackendOption): WarrantyPreset {
  const lv = opt.latest_version;
  return {
    id: opt.id,
    organizationId: opt.org_id,
    organizationType: opt.org_type,
    slug: opt.slug,
    name: lv?.name ?? opt.name ?? "Garansi",
    durationDays: Number(lv?.duration_days ?? opt.duration_days ?? 0),
    coverage: lv?.coverage_text ?? opt.coverage_text ?? "",
    exclusions: lv?.exclusion_text ?? opt.exclusion_text ?? "",
    terms: (lv as any)?.terms ?? (opt as any)?.terms ?? undefined,
    isActive: opt.status === "ACTIVE",
    version: Number(lv?.version_no ?? opt.version ?? 1),
    usageCount: 0,
    createdAt: opt.created_at,
    updatedAt: opt.updated_at || lv?.published_at || opt.created_at,
  };
}

const AfterSalesContext = createContext<AfterSalesContextType | null>(null);

type AfterSalesFetchScope = "customer" | "merchant" | "provider" | "all" | "none";

function resolveAfterSalesScope(
  pathname: string,
  activeRole: string,
  canFetchCustomer: boolean
): AfterSalesFetchScope {
  if (pathname.startsWith("/merchant")) return "merchant";
  if (pathname.startsWith("/provider")) return "provider";
  if (pathname.startsWith("/warranties") || pathname.startsWith("/orders/")) {
    return "customer";
  }
  return "none";
}

export function AfterSalesProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { user, isAuthenticated, isPublicGuest, isLoadingAuth, activeRole } = useActiveRole();

  const [cases, setCases] = useState<AfterSalesCase[]>([]);
  const [warranties, setWarranties] = useState<CustomerWarrantyEntitlement[]>([]);
  const [presets, setPresets] = useState<WarrantyPreset[]>([]);

  const defaultOrgId = useMemo(() => {
    if (user?.organizationId) return user.organizationId;
    if (activeRole === "SERVICE_PROVIDER" || (activeRole as string) === "PROVIDER") {
      return "0740d857-b665-4191-aaf5-d7dd3611dc1d";
    }
    return "0c1467e7-af68-4b26-ae84-daa41d51aed0";
  }, [user?.organizationId, activeRole]);

  const [activeOrgId, setActiveOrgId] = useState<string>(defaultOrgId);

  useEffect(() => {
    if (defaultOrgId && activeOrgId !== defaultOrgId) {
      setActiveOrgId(defaultOrgId);
    }
  }, [defaultOrgId]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef<{ scope: AfterSalesFetchScope; promise: Promise<void> } | null>(null);
  const canFetchCustomer = isAuthenticated && !isPublicGuest;

  const refreshData = useCallback(async (overrideScope?: AfterSalesFetchScope, isSilent = false) => {
    const scope =
      overrideScope ||
      resolveAfterSalesScope(pathname, activeRole, canFetchCustomer);

    if (scope === "none") {
      if (!isSilent) setIsLoading(false);
      return;
    }

    if (inFlightRef.current && inFlightRef.current.scope === scope) {
      return inFlightRef.current.promise;
    }

    const fetchPromise = (async () => {
      if (!isSilent) setIsLoading(true);
      setError(null);
      try {
        const shouldFetchCustomer = scope === "customer" || scope === "all";
        const shouldFetchMerchant = scope === "merchant" || scope === "all";
        const shouldFetchProvider = scope === "provider" || scope === "all";
        const shouldFetchBusinessCases = shouldFetchMerchant || shouldFetchProvider;

        const merchantUserId = (user?.id && activeRole === "MERCHANT") ? user.id : "4bee4c28-6799-4054-87a3-321e29811921";
        const merchantOrgId = (user?.organizationId && activeRole === "MERCHANT") ? user.organizationId : "0c1467e7-af68-4b26-ae84-daa41d51aed0";

        const providerUserId = (user?.id && (activeRole === "SERVICE_PROVIDER" || (activeRole as string) === "PROVIDER")) ? user.id : "8ecc27f5-d30e-401e-89d5-aceec765a19a";
        const providerOrgId = (user?.organizationId && (activeRole === "SERVICE_PROVIDER" || (activeRole as string) === "PROVIDER")) ? user.organizationId : "0740d857-b665-4191-aaf5-d7dd3611dc1d";

        const [wRes, cRes, bRes, mRes, provRes] = await Promise.all([
          shouldFetchCustomer
            ? afterSalesApi.customer.getWarranties({ per_page: 50 }).catch(() => null)
            : Promise.resolve(null),
          shouldFetchCustomer
            ? afterSalesApi.customer.getCases({ per_page: 50 }).catch(() => null)
            : Promise.resolve(null),
          shouldFetchBusinessCases
            ? afterSalesApi.business.getCases({ per_page: 50 }).catch(() => null)
            : Promise.resolve(null),
          shouldFetchMerchant
            ? afterSalesApi.business
                .getWarrantyOptions({
                  "X-Actor-User-Id": merchantUserId,
                  "X-Actor-Role": "MERCHANT",
                  "X-Actor-Org-Id": merchantOrgId,
                  "X-Actor-Org-Type": "MERCHANT",
                })
                .catch(() => null)
            : Promise.resolve(null),
          shouldFetchProvider
            ? afterSalesApi.business
                .getWarrantyOptions({
                  "X-Actor-User-Id": providerUserId,
                  "X-Actor-Role": "SERVICE_PROVIDER",
                  "X-Actor-Org-Id": providerOrgId,
                  "X-Actor-Org-Type": "PROVIDER",
                })
                .catch(() => null)
            : Promise.resolve(null),
        ]);

        let loadedCases: AfterSalesCase[] = [];
        if (cRes?.data || bRes?.data) {
          const mergedMap = new Map<string, AfterSalesCase>();
          if (cRes?.data && Array.isArray(cRes.data)) {
            for (const raw of cRes.data) {
              const ui = normalizeBackendCaseToUiCase(raw);
              mergedMap.set(ui.id, ui);
            }
          }
          if (bRes?.data && Array.isArray(bRes.data)) {
            for (const raw of bRes.data) {
              const ui = normalizeBackendCaseToUiCase(raw);
              mergedMap.set(ui.id, ui);
            }
          }
          loadedCases = Array.from(mergedMap.values());
          setCases(loadedCases);
        }

        if (shouldFetchCustomer) {
          let loadedWarranties: CustomerWarrantyEntitlement[] = [];
          if (wRes?.data && Array.isArray(wRes.data)) {
            loadedWarranties = wRes.data.map(normalizeBackendWarrantyToUiWarranty);
          }

          // Cross-link active/completed case to warranty entitlement
          if (loadedWarranties.length > 0) {
            const enrichedWarranties = loadedWarranties.map((w) => {
              const matchedCases = loadedCases.filter(
                (c) =>
                  (c.warrantyId && c.warrantyId === w.id) ||
                  (c.sourceOrderId && c.sourceOrderId === w.orderId)
              );
              const activeCase = matchedCases.find(
                (c) =>
                  c.mainStatus !== "COMPLETED" &&
                  c.mainStatus !== "REJECTED" &&
                  c.mainStatus !== "CANCELLED"
              );
              const latestCase = matchedCases[0];
              const hasActiveCase = Boolean(activeCase);
              const hasResolvedCase = matchedCases.some(
                (c) => c.mainStatus === "COMPLETED" || c.mainStatus === "REJECTED" || c.mainStatus === "CANCELLED"
              );
              const isEligible =
                w.status === "ACTIVE" &&
                !hasActiveCase &&
                !hasResolvedCase &&
                (w.remainingQuantity === undefined || w.remainingQuantity > 0);

              return {
                ...w,
                status: hasResolvedCase ? "CONSUMED" : w.status,
                isActive: hasResolvedCase ? false : w.isActive,
                hasActiveCase,
                activeCaseId: activeCase?.id,
                activeCaseStatus: activeCase?.mainStatus,
                activeCaseNumber: activeCase?.caseNumber,
                isClaimEligible: isEligible,
              };
            });
            setWarranties(enrichedWarranties);
          } else {
            setWarranties([]);
          }
        }

        if (shouldFetchMerchant || shouldFetchProvider) {
          setPresets((prev) => {
            const nextMap = new Map<string, WarrantyPreset>();
            for (const existing of prev) {
              if (shouldFetchMerchant && existing.organizationType === "MERCHANT") continue;
              if (shouldFetchProvider && existing.organizationType === "PROVIDER") continue;
              nextMap.set(existing.id, existing);
            }
            if (mRes?.data && Array.isArray(mRes.data)) {
              mRes.data.forEach((opt) => {
                const norm = normalizeBackendOptionToPreset(opt);
                nextMap.set(norm.id, norm);
              });
            }
            if (provRes?.data && Array.isArray(provRes.data)) {
              provRes.data.forEach((opt) => {
                const norm = normalizeBackendOptionToPreset(opt);
                nextMap.set(norm.id, norm);
              });
            }
            return nextMap.size > 0 ? Array.from(nextMap.values()) : prev;
          });
        }
      } catch (err: any) {
        console.warn("Failed to refresh After-Sales backend data:", err);
        if (!isSilent) setError(err?.message || "Gagal memuat data purnajual.");
      } finally {
        if (!isSilent) setIsLoading(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = { scope, promise: fetchPromise };
    return fetchPromise;
  }, [pathname, activeRole, canFetchCustomer]);

  useEffect(() => {
    if (isLoadingAuth && !pathname.startsWith("/warranties")) return;
    const scope = resolveAfterSalesScope(
      pathname,
      activeRole,
      isAuthenticated && !isPublicGuest
    );
    if (scope === "none") {
      setIsLoading(false);
      return;
    }
    refreshData(scope);
  }, [pathname, activeRole, isAuthenticated, isPublicGuest, isLoadingAuth, refreshData]);

  // Real-Time Background Synchronization & Cross-Role Auto-Updates
  useEffect(() => {
    if (typeof window === "undefined") return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const triggerSilentSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshData(undefined, true);
      }, 250);
    };

    // 1. Same-window custom event
    const handleCustomEvent = () => triggerSilentSync();
    window.addEventListener(AFTER_SALES_UPDATED_EVENT, handleCustomEvent);

    // 2. Cross-tab BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel(AFTER_SALES_BROADCAST_CHANNEL);
        bc.onmessage = () => triggerSilentSync();
      }
    } catch {
      // ignore
    }

    // 3. Storage event fallback across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "servio_after_sales_sync") {
        triggerSilentSync();
      }
    };
    window.addEventListener("storage", handleStorage);

    // 4. Focus & Visibility Change: sync immediately when user switches to tab
    const handleFocus = () => triggerSilentSync();
    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        triggerSilentSync();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    // 5. Adaptive Auto-Polling interval (every 4 seconds when tab is active on warranty pages)
    const isWarrantyRoute =
      pathname.includes("/warranty") ||
      pathname.includes("/warranties") ||
      pathname.includes("/worker/jobs") ||
      pathname.includes("/orders");

    const pollInterval = isWarrantyRoute ? 4000 : 15000;

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      refreshData(undefined, true);
    }, pollInterval);

    return () => {
      window.removeEventListener(AFTER_SALES_UPDATED_EVENT, handleCustomEvent);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(intervalId);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (bc) bc.close();
    };
  }, [refreshData, pathname]);

  // Selectors
  const getCaseById = useCallback((id: string) => cases.find((c) => c.id === id || c.caseNumber === id), [cases]);
  const getWarrantyById = useCallback((id: string) => warranties.find((w) => w.id === id), [warranties]);
  const getPresetsByOrg = useCallback(
    (orgId: string) => {
      const exact = presets.filter((p) => p.organizationId === orgId);
      if (exact.length > 0) return exact;
      const lower = (orgId || "").toLowerCase();
      if (lower.includes("merch")) return presets.filter((p) => p.organizationType === "MERCHANT");
      if (lower.includes("prov")) return presets.filter((p) => p.organizationType === "PROVIDER");
      return presets;
    },
    [presets]
  );
  const getActivePresetsByOrg = useCallback(
    (orgId: string) => getPresetsByOrg(orgId).filter((p) => p.isActive),
    [getPresetsByOrg]
  );
  const getCasesByOrg = useCallback(
    (orgId: string) => {
      const exact = cases.filter((c) => c.organizationId === orgId);
      if (exact.length > 0) return exact;
      const lower = (orgId || "").toLowerCase();
      if (lower.includes("merch")) return cases.filter((c) => c.organizationType === "MERCHANT");
      if (lower.includes("prov")) return cases.filter((c) => c.organizationType === "PROVIDER");
      return cases;
    },
    [cases]
  );

  const getMainStatusDisplay = useCallback((statusOrCase: any) => {
    const st = typeof statusOrCase === "string" ? statusOrCase : statusOrCase?.mainStatus;
    switch (st) {
      case "SUBMITTED":
        return { label: "Diajukan", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "UNDER_REVIEW":
        return { label: "Ditinjau", color: "bg-amber-50 text-amber-800 border-amber-200" };
      case "AWAITING_RETURN":
        return { label: "Menunggu Pengembalian Barang", color: "bg-purple-50 text-purple-700 border-purple-200" };
      case "IN_RESOLUTION":
        return { label: "Dalam Penyelesaian", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "COMPLETED":
        return { label: "Selesai", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "REJECTED":
        return { label: "Ditolak", color: "bg-rose-50 text-rose-700 border-rose-200" };
      case "CANCELLED":
        return { label: "Dibatalkan", color: "bg-slate-100 text-slate-600 border-slate-200" };
      default:
        return { label: String(st || "Status"), color: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  }, []);

  // Customer Actions
  const submitClaim = async (payload: SubmitClaimPayload): Promise<AfterSalesCase> => {
    const isGoods = payload.caseType === "claim_product";
    const initialSolution = payload.customerRequestedSolution === "REFUND"
      ? "REFUND"
      : isGoods
      ? "REPLACEMENT"
      : "REWORK";

    const apiPayload: SubmitCasePayload = {
      source_order_kind: isGoods ? "GOODS" : "SERVICE",
      source_order_id: payload.sourceOrderId,
      source_merchant_order_id: payload.sourceOrderNumber,
      case_type: isGoods ? "GOODS_WARRANTY" : "SERVICE_WARRANTY",
      initial_solution: initialSolution,
      reason_code: payload.issueReason,
      description: payload.issueDescription,
      entitlement_id: payload.warrantyId,
      owner_org_id: payload.organizationId,
      owner_org_type: isGoods ? "MERCHANT" : "PROVIDER",
      items: [
        {
          order_item_id: payload.orderItemId || `item-${payload.sourceOrderId}`,
          quantity: payload.quantity || 1,
          catalog_snapshot: payload.catalogSnapshot || {
            name: payload.itemTitle,
            price_idr: payload.itemPrice || 0,
            image_url: payload.itemImageUrl,
          },
        },
      ],
      evidence_data: (payload.evidenceMedia || []).map((m) => ({
        media_ref: m,
        content_type: "image/jpeg",
        size_bytes: 102400,
      })),
    };

    const res = await afterSalesApi.customer.submitCase(apiPayload);
    if (!res.data) throw new Error(res.message || "Gagal membuat klaim garansi.");

    const uiCase = normalizeBackendCaseToUiCase(res.data);
    setCases((prev) => [uiCase, ...prev.filter((c) => c.id !== uiCase.id)]);
    notifyAfterSalesUpdated({ action: "CLAIM_SUBMITTED", caseId: uiCase.id });
    return uiCase;
  };

  const submitReturn = async (payload: SubmitReturnPayload): Promise<AfterSalesCase> => {
    const apiPayload: SubmitCasePayload = {
      source_order_kind: "GOODS",
      source_order_id: payload.sourceOrderId,
      source_merchant_order_id: payload.sourceOrderNumber,
      case_type: "GOODS_RETURN",
      initial_solution: payload.customerRequestedSolution,
      reason_code: payload.issueReason,
      description: payload.issueDescription,
      owner_org_id: payload.organizationId,
      owner_org_type: "MERCHANT",
      items: [
        {
          order_item_id: payload.orderItemId || `item-${payload.sourceOrderId}`,
          quantity: payload.affectedQuantity || 1,
          catalog_snapshot: payload.catalogSnapshot || {
            name: payload.itemTitle,
            price_idr: payload.itemPrice || 0,
            image_url: payload.itemImageUrl,
          },
        },
      ],
      evidence_data: (payload.evidenceMedia || []).map((m) => ({
        media_ref: m,
        content_type: "image/jpeg",
        size_bytes: 102400,
      })),
    };

    const res = await afterSalesApi.customer.submitCase(apiPayload);
    if (!res.data) throw new Error(res.message || "Gagal membuat pengajuan retur.");

    const uiCase = normalizeBackendCaseToUiCase(res.data);
    setCases((prev) => [uiCase, ...prev.filter((c) => c.id !== uiCase.id)]);
    notifyAfterSalesUpdated({ action: "RETURN_SUBMITTED", caseId: uiCase.id });
    return uiCase;
  };

  const resolvePendingProposalId = async (caseId: string, explicitId?: string): Promise<string> => {
    if (explicitId) return explicitId;
    const currentCase = cases.find((c) => c.id === caseId);
    if (currentCase?.merchantAlternativeProposal?.proposalId) {
      return currentCase.merchantAlternativeProposal.proposalId;
    }
    const detailRes = await afterSalesApi.customer.getCaseDetail(caseId).catch(() => null);
    const props: any[] = detailRes?.data?.proposals || currentCase?.backend?.proposals || [];
    const altPending = props.find(
      (p) =>
        (p.proposal_type === "ALTERNATIVE" || p.proposed_by_actor_kind !== "CUSTOMER") &&
        (p.state === "PENDING_CONSENT" || p.status === "PENDING")
    );
    if (altPending?.id) return altPending.id;
    const latest = detailRes?.data?.latest_proposal || detailRes?.data?.latestProposal || props[props.length - 1];
    return latest?.id || "";
  };

  const resolveCaseVersion = async (caseId: string): Promise<number> => {
    const currentCase = cases.find((c) => c.id === caseId);
    if (currentCase?.backend?.version) return Number(currentCase.backend.version);
    const detailRes = await afterSalesApi.business.getCaseDetail(caseId).catch(() => null);
    return Number(detailRes?.data?.version ?? 1);
  };

  const customerAcceptAlternativeProposal = async (caseId: string, proposalId?: string) => {
    const propId = await resolvePendingProposalId(caseId, proposalId);
    const res = await afterSalesApi.customer.submitConsent(caseId, propId, "ACCEPT");
    if (!res.success) {
      throw new Error(res.message || "Gagal menyetujui solusi alternatif.");
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "PROPOSAL_ACCEPTED", caseId });
  };

  const customerRejectAlternativeProposal = async (caseId: string, reason: string, proposalId?: string) => {
    const propId = await resolvePendingProposalId(caseId, proposalId);
    const res = await afterSalesApi.customer.submitConsent(caseId, propId, "DECLINE", reason);
    if (!res.success) {
      throw new Error(res.message || "Gagal menolak solusi alternatif.");
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "PROPOSAL_REJECTED", caseId });
  };

  const customerSubmitReturnShipping = async (
    caseId: string,
    trackingNumber: string,
    courierName: string,
    claimedFee?: number,
    receiptRef?: string,
    feeProofRef?: string,
    customerNotes?: string
  ) => {
    const res = await afterSalesApi.customer.submitReturnShipment(caseId, {
      courier_name: courierName,
      tracking_number: trackingNumber || undefined,
      shipping_fee_paid_idr: claimedFee,
      shipping_receipt_ref: receiptRef,
      fee_payment_proof_ref: feeProofRef,
      customer_notes: customerNotes,
    });
    if (!res.success) {
      throw new Error(res.message || "Gagal mengirimkan data resi pengembalian barang.");
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "RETURN_SHIPPING_SUBMITTED", caseId });
  };

  const customerReportIssue = async (caseId: string, reason: string): Promise<{ message: string }> => {
    const res = await afterSalesApi.customer.reportIssue(caseId, reason);
    if (!res.success) {
      throw new Error(res.message || "Gagal melaporkan masalah ke sistem dukungan.");
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "ISSUE_REPORTED", caseId });
    return {
      message:
        res.message ||
        "Laporan masalah telah dicatat dengan status PENDING_SUPPORT_INTEGRATION (menunggu integrasi modul Support 09).",
    };
  };

  const customerAddEvidence = async (caseId: string, mediaRef: string, contentType = "image/jpeg", sizeBytes = 102400) => {
    const res = await afterSalesApi.customer.addEvidence(caseId, {
      media_ref: mediaRef,
      content_type: contentType,
      size_bytes: sizeBytes,
    });
    if (!res.success) {
      throw new Error(res.message || "Gagal mengunggah lampiran bukti.");
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "EVIDENCE_ADDED", caseId });
  };

  const customerApprovePaidWork = async (caseId: string) => {
    await afterSalesApi.customer.addEvidence(caseId, {
      media_ref: "PAID_WORK_APPROVED_BY_CUSTOMER",
      content_type: "text/plain",
      size_bytes: 32,
    });
    await refreshData();
    notifyAfterSalesUpdated({ action: "PAID_WORK_APPROVED", caseId });
  };

  const customerConfirmCompletion = async (caseId: string, notes?: string, rating?: number) => {
    try {
      const res = await afterSalesApi.customer.confirmCompletion(caseId, { notes, rating });
      if (!res.success) {
        await merchantCompleteCase(caseId, notes || "CUSTOMER_VERIFIED_COMPLETION").catch(() => {});
      }
    } catch {
      await merchantCompleteCase(caseId, notes || "CUSTOMER_VERIFIED_COMPLETION").catch(() => {});
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "COMPLETION_CONFIRMED", caseId });
  };

  // Merchant / Provider Actions
  const merchantApproveCase = async (caseId: string, solution?: string, note?: string) => {
    const caseVersion = await resolveCaseVersion(caseId);
    const res = await afterSalesApi.business.makeDecision(caseId, {
      action: "ACCEPT_INITIAL",
      reason: note,
      case_version: caseVersion,
    });
    if (!res.success) {
      throw new Error(res.message || "Gagal menyetujui pengajuan.");
    }
    await afterSalesApi.business.startResolution(caseId).catch(() => {});
    await refreshData();
    notifyAfterSalesUpdated({ action: "CASE_APPROVED", caseId });
  };

  const merchantRejectCase = async (caseId: string, rejectionReason: string) => {
    const caseVersion = await resolveCaseVersion(caseId);
    const res = await afterSalesApi.business.makeDecision(caseId, {
      action: "REJECT_WITH_REASON",
      reason: rejectionReason,
      case_version: caseVersion,
    });
    if (!res.success) {
      throw new Error(res.message || "Gagal menolak pengajuan.");
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "CASE_REJECTED", caseId });
  };

  const merchantProposeAlternative = async (caseId: string, alternativeSolution: string, note: string) => {
    const caseVersion = await resolveCaseVersion(caseId);
    const currentCase = cases.find((c) => c.id === caseId);
    const isService = currentCase?.caseType === "claim_service" || currentCase?.organizationType === "PROVIDER";
    const mapped =
      alternativeSolution === "REPAIR"
        ? isService
          ? "REWORK"
          : "REPAIR_GOODS"
        : (alternativeSolution as any);
    const res = await afterSalesApi.business.makeDecision(caseId, {
      action: "PROPOSE_ALTERNATIVE",
      alternative_solution: mapped,
      reason: note,
      case_version: caseVersion,
    });
    if (!res.success) {
      throw new Error(res.message || "Gagal mengajukan solusi alternatif.");
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "ALTERNATIVE_PROPOSED", caseId });
  };

  const merchantRequestEvidence = async (caseId: string, reason: string) => {
    const caseVersion = await resolveCaseVersion(caseId);
    const res = await afterSalesApi.business.makeDecision(caseId, {
      action: "REQUEST_EVIDENCE",
      reason,
      case_version: caseVersion,
    });
    if (!res.success) {
      throw new Error(res.message || "Gagal meminta bukti tambahan.");
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "EVIDENCE_REQUESTED", caseId });
  };

  const merchantStartResolution = async (caseId: string) => {
    const res = await afterSalesApi.business.startResolution(caseId);
    if (!res.success) {
      throw new Error(res.message || "Gagal memulai tindakan penyelesaian.");
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "RESOLUTION_STARTED", caseId });
  };

  const merchantCompleteCase = async (caseId: string, evidenceRef: string) => {
    const res = await afterSalesApi.business.completeCase(caseId, evidenceRef);
    if (!res.success) {
      throw new Error(res.message || "Gagal menyelesaikan pengajuan.");
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "CASE_COMPLETED", caseId });
  };

  const merchantSaveReturnInstructions = async (
    caseId: string,
    payload: {
      requires_physical_return: boolean;
      no_return_reason?: string;
      recipient_name?: string;
      recipient_phone?: string;
      return_address?: string;
      packaging_instructions?: string;
      shipping_fee_payer?: "MERCHANT" | "CUSTOMER" | "THIRD_PARTY";
      shipping_fee_method?: string;
      reimbursement_instructions?: string;
      deadline_at?: string;
      merchant_notes?: string;
    }
  ) => {
    const res = await afterSalesApi.business.saveReturnInstructions(caseId, payload);
    if (!res.success) {
      throw new Error(res.message || "Gagal menyimpan instruksi pengembalian.");
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "RETURN_INSTRUCTIONS_SAVED", caseId });
  };

  const merchantConfirmReturnReceived = async (
    caseId: string,
    payload?: {
      received_at?: string;
      received_by?: string;
      quantity_received?: number;
      package_condition?: string;
      receipt_proof_ref?: string;
      receipt_notes?: string;
      status?: "RECEIVED" | "DISPUTED_NOT_RECEIVED";
      dispute_reason?: string;
    }
  ) => {
    const res = await afterSalesApi.business.confirmReturnReceipt(caseId, {
      quantity_received: payload?.quantity_received ?? 1,
      package_condition: payload?.package_condition ?? "BAIK_TERSEGEL",
      received_by: payload?.received_by ?? "Merchant Staff",
      receipt_notes: payload?.receipt_notes,
      receipt_proof_ref: payload?.receipt_proof_ref,
      status: payload?.status ?? "RECEIVED",
      dispute_reason: payload?.dispute_reason,
    });
    if (!res.success) {
      throw new Error(res.message || "Gagal mengonfirmasi penerimaan barang retur.");
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "RETURN_RECEIVED", caseId });
  };

  const merchantSubmitReturnInspection = async (
    caseId: string,
    payload: {
      quantity_inspected: number;
      quantity_approved: number;
      item_condition: string;
      is_sku_matched?: boolean;
      is_issue_matched?: boolean;
      is_components_complete?: boolean;
      inspection_outcome: "MATCHED" | "PARTIAL" | "MISMATCH";
      inspection_notes?: string;
      evidence_refs?: string[];
    }
  ) => {
    const res = await afterSalesApi.business.submitReturnInspection(caseId, payload);
    if (!res.success) {
      throw new Error(res.message || "Gagal menyimpan hasil pemeriksaan barang.");
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "RETURN_INSPECTED", caseId });
  };

  const providerApproveWarrantyJob = async (caseId: string, workerName: string, scheduledDate: string, note?: string) => {
    const caseVersion = await resolveCaseVersion(caseId);
    const res = await afterSalesApi.business.makeDecision(caseId, {
      action: "ACCEPT_INITIAL",
      reason: `Pekerjaan garansi dijadwalkan pada ${scheduledDate} (${workerName}). Catatan: ${note || "-"}`,
      case_version: caseVersion,
    });
    if (!res.success) {
      throw new Error(res.message || "Gagal menyetujui pekerjaan garansi.");
    }
    await afterSalesApi.business.startResolution(caseId).catch(() => {});
    await refreshData();
    notifyAfterSalesUpdated({ action: "WARRANTY_JOB_APPROVED", caseId });
  };

  const providerRejectClaim = async (caseId: string, rejectionReason: string) => {
    const caseVersion = await resolveCaseVersion(caseId);
    const res = await afterSalesApi.business.makeDecision(caseId, {
      action: "REJECT_WITH_REASON",
      reason: rejectionReason,
      case_version: caseVersion,
    });
    if (!res.success) {
      throw new Error(res.message || "Gagal menolak klaim garansi layanan.");
    }
    await refreshData();
    notifyAfterSalesUpdated({ action: "CLAIM_REJECTED", caseId });
  };

  // Preset Management
  const addPreset = async (preset: {
    name: string;
    durationDays: number;
    coverage: string;
    exclusions?: string;
    organizationId?: string;
    organizationType?: "MERCHANT" | "PROVIDER";
    isActive?: boolean;
  }): Promise<WarrantyPreset> => {
    const isProv =
      preset.organizationType === "PROVIDER" ||
      preset.organizationId === "0740d857-b665-4191-aaf5-d7dd3611dc1d";

    const merchantUserId = (user?.id && activeRole === "MERCHANT") ? user.id : "4bee4c28-6799-4054-87a3-321e29811921";
    const merchantOrgId = (user?.organizationId && activeRole === "MERCHANT") ? user.organizationId : "0c1467e7-af68-4b26-ae84-daa41d51aed0";

    const providerUserId = (user?.id && (activeRole === "SERVICE_PROVIDER" || (activeRole as string) === "PROVIDER")) ? user.id : "8ecc27f5-d30e-401e-89d5-aceec765a19a";
    const providerOrgId = (user?.organizationId && (activeRole === "SERVICE_PROVIDER" || (activeRole as string) === "PROVIDER")) ? user.organizationId : "0740d857-b665-4191-aaf5-d7dd3611dc1d";

    const actorHeaders: Record<string, string> = isProv
      ? {
          "X-Actor-User-Id": providerUserId,
          "X-Actor-Role": "SERVICE_PROVIDER",
          "X-Actor-Org-Id": providerOrgId,
          "X-Actor-Org-Type": "PROVIDER",
        }
      : {
          "X-Actor-User-Id": merchantUserId,
          "X-Actor-Role": "MERCHANT",
          "X-Actor-Org-Id": merchantOrgId,
          "X-Actor-Org-Type": "MERCHANT",
        };

    const res = await afterSalesApi.business.createWarrantyOption(
      {
        name: preset.name,
        duration_days: preset.durationDays,
        coverage_text: preset.coverage,
        exclusion_text: preset.exclusions,
      },
      actorHeaders
    );
    if (!res.data) throw new Error(res.message || "Gagal membuat opsi garansi.");
    const uiPreset = normalizeBackendOptionToPreset(res.data);
    setPresets((prev) => [uiPreset, ...prev.filter((p) => p.id !== uiPreset.id)]);
    return uiPreset;
  };

  const updatePreset = async (
    id: string,
    updates: {
      name: string;
      durationDays: number;
      coverage: string;
      exclusions?: string;
      isActive?: boolean;
    }
  ): Promise<WarrantyPreset> => {
    const existing = presets.find((p) => p.id === id);
    const isProv =
      existing?.organizationType === "PROVIDER" ||
      existing?.organizationId === "0740d857-b665-4191-aaf5-d7dd3611dc1d";

    const merchantUserId = (user?.id && activeRole === "MERCHANT") ? user.id : "4bee4c28-6799-4054-87a3-321e29811921";
    const merchantOrgId = (user?.organizationId && activeRole === "MERCHANT") ? user.organizationId : "0c1467e7-af68-4b26-ae84-daa41d51aed0";

    const providerUserId = (user?.id && (activeRole === "SERVICE_PROVIDER" || (activeRole as string) === "PROVIDER")) ? user.id : "8ecc27f5-d30e-401e-89d5-aceec765a19a";
    const providerOrgId = (user?.organizationId && (activeRole === "SERVICE_PROVIDER" || (activeRole as string) === "PROVIDER")) ? user.organizationId : "0740d857-b665-4191-aaf5-d7dd3611dc1d";

    const actorHeaders: Record<string, string> = isProv
      ? {
          "X-Actor-User-Id": providerUserId,
          "X-Actor-Role": "SERVICE_PROVIDER",
          "X-Actor-Org-Id": providerOrgId,
          "X-Actor-Org-Type": "PROVIDER",
        }
      : {
          "X-Actor-User-Id": merchantUserId,
          "X-Actor-Role": "MERCHANT",
          "X-Actor-Org-Id": merchantOrgId,
          "X-Actor-Org-Type": "MERCHANT",
        };

    const res = await afterSalesApi.business.updateWarrantyOption(
      id,
      {
        name: updates.name,
        duration_days: updates.durationDays,
        coverage_text: updates.coverage,
        exclusion_text: updates.exclusions,
      },
      actorHeaders
    );
    if (!res.data) throw new Error(res.message || "Gagal memperbarui opsi garansi.");
    const uiPreset = normalizeBackendOptionToPreset(res.data);
    setPresets((prev) => prev.map((p) => (p.id === id ? uiPreset : p)));
    return uiPreset;
  };

  const togglePresetStatus = async (id: string) => {
    const existing = presets.find((p) => p.id === id);
    const isProv =
      existing?.organizationType === "PROVIDER" ||
      existing?.organizationId === "0740d857-b665-4191-aaf5-d7dd3611dc1d";

    const merchantUserId = (user?.id && activeRole === "MERCHANT") ? user.id : "4bee4c28-6799-4054-87a3-321e29811921";
    const merchantOrgId = (user?.organizationId && activeRole === "MERCHANT") ? user.organizationId : "0c1467e7-af68-4b26-ae84-daa41d51aed0";

    const providerUserId = (user?.id && (activeRole === "SERVICE_PROVIDER" || (activeRole as string) === "PROVIDER")) ? user.id : "8ecc27f5-d30e-401e-89d5-aceec765a19a";
    const providerOrgId = (user?.organizationId && (activeRole === "SERVICE_PROVIDER" || (activeRole as string) === "PROVIDER")) ? user.organizationId : "0740d857-b665-4191-aaf5-d7dd3611dc1d";

    const actorHeaders: Record<string, string> = isProv
      ? {
          "X-Actor-User-Id": providerUserId,
          "X-Actor-Role": "SERVICE_PROVIDER",
          "X-Actor-Org-Id": providerOrgId,
          "X-Actor-Org-Type": "PROVIDER",
        }
      : {
          "X-Actor-User-Id": merchantUserId,
          "X-Actor-Role": "MERCHANT",
          "X-Actor-Org-Id": merchantOrgId,
          "X-Actor-Org-Type": "MERCHANT",
        };

    const res = await afterSalesApi.business.toggleWarrantyOptionStatus(id, actorHeaders);
    if (res.data) {
      const updated = normalizeBackendOptionToPreset(res.data);
      setPresets((prev) => prev.map((p) => (p.id === id ? updated : p)));
    }
  };

  const resetDemoData = async () => {
    await refreshData();
  };

  const value: AfterSalesContextType = {
    cases,
    warranties,
    presets,
    warrantyPresets: presets,
    activeOrgId,
    setActiveOrgId,
    isLoading,
    error,
    refreshData,
    getCaseById,
    getWarrantyById,
    getPresetsByOrg,
    getActivePresetsByOrg,
    getCasesByOrg,
    getMainStatusDisplay,
    submitClaim,
    submitReturn,
    customerAcceptAlternativeProposal,
    customerRejectAlternativeProposal,
    customerSubmitReturnShipping,
    customerReportIssue,
    customerAddEvidence,
    customerApprovePaidWork,
    customerConfirmCompletion,
    merchantApproveCase,
    merchantRejectCase,
    merchantProposeAlternative,
    merchantRequestEvidence,
    merchantStartResolution,
    merchantCompleteCase,
    merchantSaveReturnInstructions,
    merchantConfirmReturnReceived,
    merchantSubmitReturnInspection,
    providerApproveWarrantyJob,
    providerRejectClaim,
    addPreset,
    updatePreset,
    togglePresetStatus,
    resetDemoData,
  };

  return <AfterSalesContext.Provider value={value}>{children}</AfterSalesContext.Provider>;
}

export function useAfterSales(): AfterSalesContextType {
  const context = useContext(AfterSalesContext);
  if (!context) {
    throw new Error("useAfterSales must be used within an AfterSalesProvider");
  }
  return context;
}
