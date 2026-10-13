"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useActiveRole } from "@/context/RoleContext";
import {
  ShippingGovernancePolicy,
  ReturnGovernancePolicy,
  GuaranteeGovernancePolicy,
} from "@/types/domain";

export type PolicyTab = "shipping" | "return" | "guarantee";

export const shippingPolicySchema = z.object({
  version: z.string().min(3),
  standardFulfillmentSlaHours: z.number().min(2).max(72),
  expressFulfillmentSlaHours: z.number().min(1).max(24),
  cargoStagingSlaHours: z.number().min(12).max(120),
  carrierEscalationThresholdMinutes: z.number().min(30).max(360),
  remoteAreaSurchargeAllowed: z.boolean(),
  notes: z.string().min(5),
});

export const returnPolicySchema = z.object({
  version: z.string().min(3),
  retailReturnWindowDays: z.number().min(1).max(30),
  b2bReturnWindowDays: z.number().min(3).max(60),
  requireUnboxingVideo: z.boolean(),
  inspectionSlaHours: z.number().min(12).max(96),
  sellerRestockingFeePercent: z.number().min(0).max(25),
  disputeEscalationWindowDays: z.number().min(1).max(14),
  notes: z.string().min(5),
});

export const guaranteePolicySchema = z.object({
  version: z.string().min(3),
  workmanshipWarrantyDays: z.number().min(7).max(180),
  sparepartWarrantyDays: z.number().min(14).max(365),
  autoRefundThreshold: z.number().min(20000).max(1000000),
  reServiceMaxAttempts: z.number().min(1).max(4),
  customerSatisfactionCoveragePercent: z.number().min(50).max(100),
  notes: z.string().min(5),
});

export function useCeoPolicyGovernance() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();

  const [activeTab, setActiveTab] = useState<PolicyTab>("shipping");
  const [isEditing, setIsEditing] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forms
  const [shippingDraft, setShippingDraft] = useState<ShippingGovernancePolicy>(repo.shippingPolicy);
  const [returnDraft, setReturnDraft] = useState<ReturnGovernancePolicy>(repo.returnPolicy);
  const [guaranteeDraft, setGuaranteeDraft] = useState<GuaranteeGovernancePolicy>(repo.guaranteePolicy);

  const startEdit = useCallback(() => {
    setShippingDraft({ ...repo.shippingPolicy });
    setReturnDraft({ ...repo.returnPolicy });
    setGuaranteeDraft({ ...repo.guaranteePolicy });
    setIsEditing(true);
    setSuccessMessage(null);
  }, [repo.guaranteePolicy, repo.returnPolicy, repo.shippingPolicy]);

  const handlePublishCurrentTab = useCallback(() => {
    const actor = {
      id: user.id || "usr-ceo-001",
      name: user.name || "Michael Tanuwijaya (CEO & Founder)",
    };

    if (activeTab === "shipping") {
      repo.publishShippingPolicy(shippingDraft, actor);
      setSuccessMessage("Kebijakan logistik & SLA pengiriman berhasil dipublikasikan.");
    } else if (activeTab === "return") {
      repo.publishReturnPolicy(returnDraft, actor);
      setSuccessMessage("Kebijakan retur & mitigasi fraud berhasil dipublikasikan.");
    } else {
      repo.publishGuaranteePolicy(guaranteeDraft, actor);
      setSuccessMessage("Kebijakan jaminan garansi & resolusi escrow berhasil dipublikasikan.");
    }

    setConfirmModalOpen(false);
    setIsEditing(false);
  }, [activeTab, guaranteeDraft, repo, returnDraft, shippingDraft, user]);

  return {
    activeTab,
    setActiveTab,
    isEditing,
    setIsEditing,
    confirmModalOpen,
    setConfirmModalOpen,
    successMessage,
    shippingPolicy: repo.shippingPolicy,
    returnPolicy: repo.returnPolicy,
    guaranteePolicy: repo.guaranteePolicy,
    shippingDraft,
    setShippingDraft,
    returnDraft,
    setReturnDraft,
    guaranteeDraft,
    setGuaranteeDraft,
    startEdit,
    handlePublishCurrentTab,
  };
}
