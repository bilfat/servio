"use client";

import { useState } from "react";
import { ExecutionSession } from "@/types/domain";
import { MOCK_EXECUTION_SESSIONS } from "@/mocks/execution";

export function useExecution(orderId: string = "order-normal-progress") {
  const [sessions, setSessions] = useState<Record<string, ExecutionSession>>(MOCK_EXECUTION_SESSIONS);

  const session = sessions[orderId] || MOCK_EXECUTION_SESSIONS["order-normal-progress"];

  const toggleSopStep = (stepId: string) => {
    setSessions((prev) => {
      const current = prev[orderId];
      if (!current) return prev;

      return {
        ...prev,
        [orderId]: {
          ...current,
          sopChecklist: current.sopChecklist.map((step) =>
            step.id === stepId
              ? {
                  ...step,
                  isCompleted: !step.isCompleted,
                  completedAt: !step.isCompleted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
                }
              : step
          ),
        },
      };
    });
  };

  const triggerSafetyStop = (reason: string) => {
    setSessions((prev) => {
      const current = prev[orderId];
      if (!current) return prev;

      return {
        ...prev,
        [orderId]: {
          ...current,
          safetyStopTriggered: true,
          safetyStopReason: reason,
        },
      };
    });
  };

  const resetSafetyStop = () => {
    setSessions((prev) => {
      const current = prev[orderId];
      if (!current) return prev;

      return {
        ...prev,
        [orderId]: {
          ...current,
          safetyStopTriggered: false,
          safetyStopReason: undefined,
        },
      };
    });
  };

  return {
    session,
    toggleSopStep,
    triggerSafetyStop,
    resetSafetyStop,
    completedStepsCount: session?.sopChecklist.filter((s) => s.isCompleted).length || 0,
    totalStepsCount: session?.sopChecklist.length || 0,
  };
}
