"use client";

import { useState, useMemo, useCallback } from "react";
import { z } from "zod";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useActiveRole } from "@/context/RoleContext";
import { FeePolicyConfig } from "@/types/domain";

export const feePolicySchema = z.object({
  version: z
    .string()
    .min(3, "Format versi minimal 3 karakter (misal: v2.5)")
    .regex(/^v\d+\.\d+/, "Format versi harus dimulai dengan 'v' diikuti angka (misal: v2.5)"),
  effectiveDate: z.string().min(10, "Tanggal efektif wajib ditentukan (YYYY-MM-DD)"),
  serviceTakeRatePercent: z
    .number()
    .min(1.0, "Service take rate minimal 1.0%")
    .max(30.0, "Service take rate maksimal 30.0%"),
  productTakeRatePercent: z
    .number()
    .min(1.0, "Product take rate minimal 1.0%")
    .max(25.0, "Product take rate maksimal 25.0%"),
  b2bTakeRatePercent: z
    .number()
    .min(0.5, "B2B take rate minimal 0.5%")
    .max(15.0, "B2B take rate maksimal 15.0%"),
  platformProtectionFee: z
    .number()
    .min(1000, "Biaya proteksi minimal Rp 1.000")
    .max(50000, "Biaya proteksi maksimal Rp 50.000"),
  escrowFeePercent: z.number().min(0.1, "Escrow fee minimal 0.1%").max(5.0, "Escrow fee maksimal 5.0%"),
  minServiceFee: z.number().min(5000, "Fee minimum servis minimal Rp 5.000"),
  description: z.string().min(10, "Deskripsi kebijakan minimal 10 karakter"),
  notes: z.string().optional(),
});

export type FeePolicyFormData = z.infer<typeof feePolicySchema>;

export function useCeoPricingPolicy() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();

  const policies = repo.feePolicies;

  const currentPolicy = useMemo(() => {
    return policies.find((p) => p.status === "CURRENT") || policies[0];
  }, [policies]);

  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [draftForm, setDraftForm] = useState<FeePolicyFormData>(() => ({
    version: "v2.5",
    effectiveDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    serviceTakeRatePercent: currentPolicy ? currentPolicy.serviceTakeRatePercent : 12.5,
    productTakeRatePercent: currentPolicy ? currentPolicy.productTakeRatePercent : 8.0,
    b2bTakeRatePercent: currentPolicy ? currentPolicy.b2bTakeRatePercent : 3.5,
    platformProtectionFee: currentPolicy ? currentPolicy.platformProtectionFee : 5000,
    escrowFeePercent: currentPolicy ? currentPolicy.escrowFeePercent : 1.0,
    minServiceFee: currentPolicy ? currentPolicy.minServiceFee : 15000,
    description: "Pembaruan kebijakan fee platform Q4 2026",
    notes: "Pengaturan take-rate kompetitif untuk mendorong transaksi retail dan grosir B2B.",
  }));

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const startNewDraft = useCallback(() => {
    const nextVersionNum = currentPolicy
      ? (parseFloat(currentPolicy.version.replace("v", "")) + 0.1).toFixed(1)
      : "2.5";

    setDraftForm({
      version: `v${nextVersionNum}`,
      effectiveDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      serviceTakeRatePercent: currentPolicy.serviceTakeRatePercent,
      productTakeRatePercent: currentPolicy.productTakeRatePercent,
      b2bTakeRatePercent: currentPolicy.b2bTakeRatePercent,
      platformProtectionFee: currentPolicy.platformProtectionFee,
      escrowFeePercent: currentPolicy.escrowFeePercent,
      minServiceFee: currentPolicy.minServiceFee,
      description: `Pembaruan kebijakan take-rate v${nextVersionNum}`,
      notes: "Optimalisasi yield margin dan ekspansi mitra jasa profesional.",
    });
    setValidationErrors({});
    setIsEditingDraft(true);
    setPublishSuccess(false);
  }, [currentPolicy]);

  const updateDraftField = useCallback(
    (field: keyof FeePolicyFormData, value: unknown) => {
      setDraftForm((prev) => ({
        ...prev,
        [field]: value,
      }));
      // Clear error on edit
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    },
    []
  );

  const validateDraft = useCallback((): boolean => {
    const res = feePolicySchema.safeParse(draftForm);
    if (!res.success) {
      const errMap: Record<string, string> = {};
      res.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        errMap[fieldName] = issue.message;
      });
      setValidationErrors(errMap);
      return false;
    }
    setValidationErrors({});
    return true;
  }, [draftForm]);

  const handleOpenPublishModal = useCallback(() => {
    if (validateDraft()) {
      setPublishModalOpen(true);
    }
  }, [validateDraft]);

  const handleExecutePublish = useCallback(() => {
    if (!validateDraft()) return false;

    const actor = {
      id: user.id || "usr-ceo-001",
      name: user.name || "Michael Tanuwijaya (CEO & Founder)",
    };

    const newPolicy: FeePolicyConfig = {
      id: `fee-pol-${draftForm.version.replace(".", "")}-${Date.now()}`,
      version: draftForm.version,
      status: "CURRENT",
      effectiveDate: draftForm.effectiveDate,
      serviceTakeRatePercent: draftForm.serviceTakeRatePercent,
      productTakeRatePercent: draftForm.productTakeRatePercent,
      b2bTakeRatePercent: draftForm.b2bTakeRatePercent,
      platformProtectionFee: draftForm.platformProtectionFee,
      escrowFeePercent: draftForm.escrowFeePercent,
      minServiceFee: draftForm.minServiceFee,
      description: draftForm.description,
      notes: draftForm.notes,
      createdBy: actor.name,
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 19) + " WIB",
    };

    repo.publishFeePolicy(newPolicy, actor);
    setPublishModalOpen(false);
    setIsEditingDraft(false);
    setPublishSuccess(true);
    return true;
  }, [draftForm, repo, user, validateDraft]);

  return {
    policies,
    currentPolicy,
    isEditingDraft,
    setIsEditingDraft,
    draftForm,
    updateDraftField,
    validationErrors,
    publishModalOpen,
    setPublishModalOpen,
    publishSuccess,
    setPublishSuccess,
    startNewDraft,
    validateDraft,
    handleOpenPublishModal,
    handleExecutePublish,
  };
}
