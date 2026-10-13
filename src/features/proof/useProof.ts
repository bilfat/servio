"use client";

import { useState } from "react";
import { ProofOfService } from "@/types/domain";
import { MOCK_PROOFS } from "@/mocks/proofs";

export function useProof(orderId: string = "order-awaiting-proof") {
  const [proofs, setProofs] = useState<Record<string, ProofOfService>>(MOCK_PROOFS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const proof = proofs[orderId] || MOCK_PROOFS["order-awaiting-proof"];

  const approveProof = async (feedback?: string) => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 80));
    setProofs((prev) => {
      const cur = prev[orderId];
      if (!cur) return prev;
      return {
        ...prev,
        [orderId]: {
          ...cur,
          isApprovedByCustomer: true,
          customerFeedback: feedback || "Pekerjaan sangat bersih dan rapi.",
        },
      };
    });
    setIsSubmitting(false);
  };

  const requestRevision = async (feedback: string) => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 80));
    setProofs((prev) => {
      const cur = prev[orderId];
      if (!cur) return prev;
      return {
        ...prev,
        [orderId]: {
          ...cur,
          isApprovedByCustomer: false,
          customerFeedback: feedback,
        },
      };
    });
    setIsSubmitting(false);
  };

  return {
    proof,
    approveProof,
    requestRevision,
    isSubmitting,
  };
}
