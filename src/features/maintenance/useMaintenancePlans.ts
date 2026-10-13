"use client";

import { useState } from "react";
import { MaintenancePlan } from "@/types/domain";
import { MOCK_MAINTENANCE_PLANS } from "@/mocks/maintenance";

export function useMaintenancePlans() {
  const [plans, setPlans] = useState<MaintenancePlan[]>(MOCK_MAINTENANCE_PLANS);

  const snoozePlan = (planId: string, days: number = 7) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const dateStr = futureDate.toISOString().split("T")[0];

    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              isSnoozed: true,
              snoozeUntil: dateStr,
            }
          : p
      )
    );
  };

  const markServiced = (planId: string) => {
    const today = new Date().toISOString().split("T")[0];
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === planId) {
          const nextDate = new Date();
          nextDate.setMonth(nextDate.getMonth() + p.frequencyMonths);
          return {
            ...p,
            isOverdue: false,
            isSnoozed: false,
            lastServiceDate: today,
            nextDueDate: nextDate.toISOString().split("T")[0],
          };
        }
        return p;
      })
    );
  };

  return {
    plans,
    snoozePlan,
    markServiced,
    overduePlansCount: plans.filter((p) => p.isOverdue && !p.isSnoozed).length,
  };
}
