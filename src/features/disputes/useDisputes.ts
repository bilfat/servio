"use client";

import { useState } from "react";
import { DisputeCase, DisputeStatus } from "@/types/domain";
import { MOCK_DISPUTES } from "@/mocks/disputes";

export function useDisputes() {
  const [disputes, setDisputes] = useState<DisputeCase[]>(MOCK_DISPUTES);

  const getDisputeById = (id: string): DisputeCase | undefined => {
    return disputes.find((d) => d.id === id);
  };

  const getDisputeByOrderId = (orderId: string): DisputeCase | undefined => {
    return disputes.find((d) => d.orderId === orderId);
  };

  const updateStatus = (disputeId: string, status: DisputeStatus, notes?: string) => {
    setDisputes((prev) =>
      prev.map((d) =>
        d.id === disputeId
          ? {
              ...d,
              status,
              mediationNotes: notes || d.mediationNotes,
            }
          : d
      )
    );
  };

  return {
    disputes,
    getDisputeById,
    getDisputeByOrderId,
    updateStatus,
    activeDisputesCount: disputes.filter((d) => d.status === "OPEN" || d.status === "IN_MEDIATION").length,
  };
}
