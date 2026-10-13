"use client";

export type {
  DisputePriority,
  DisputeCategory,
  DisputeDecision,
  TripartiteChatMessage,
  SupportCase,
} from "@/mocks/supportCases";
export {
  MOCK_SUPPORT_CASES,
  INITIAL_SUPPORT_CASES,
} from "@/mocks/supportCases";

import {
  SupportCase,
  DisputeDecision,
  TripartiteChatMessage,
} from "@/mocks/supportCases";
import { useDomainRepository } from "@/lib/repository/domainRepository";

export function useSupportOperations() {
  const repo = useDomainRepository();
  const cases = repo.supportCases;

  const getCaseById = (id: string): SupportCase => {
    return repo.getSupportCase(id) || cases[0];
  };

  const findCaseById = (id: string): SupportCase | null => {
    return repo.getSupportCase(id);
  };


  const assignToMe = (caseId: string, agentName: string = "Rina Kusuma (CS Specialist)") => {
    const target = repo.getSupportCase(caseId);
    if (target) {
      target.assignedTo = agentName;
      if (target.status === "OPEN") {
        target.status = "IN_MEDIATION";
      }
      repo.notify();
    }
  };

  const escalateCase = (caseId: string, level: "FINANCE" | "LEADERSHIP") => {
    const target = repo.getSupportCase(caseId);
    if (target) {
      target.status = level === "FINANCE" ? "ESCALATED_FINANCE" : "IN_MEDIATION";
      target.priority = "URGENT";
      target.chatThread.push({
        id: `sys-${Date.now()}`,
        senderRole: "SUPPORT_MEDIATOR",
        senderName: "Sistem Otomasi Servio",
        message: `Tiket sengketa ini telah dieskalasi ke ${
          level === "FINANCE" ? "Divisi Finance & Escrow Resolution" : "Manajemen Operasional Tingkat Lanjut"
        }.`,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
        isSystemNotice: true,
      });
      repo.notify();
    }
  };

  const submitMediationDecision = (
    caseId: string,
    decisionType: DisputeDecision,
    notes: string,
    refundAmount?: number
  ) => {
    repo.resolveSupportVerdict(caseId, {
      type: decisionType,
      notes,
      refundAmount,
    });
  };

  const sendTripartiteMessage = (
    caseId: string,
    message: string,
    senderRole: "CUSTOMER" | "PROVIDER" | "SUPPORT_MEDIATOR" = "SUPPORT_MEDIATOR",
    senderName: string = "Rina Kusuma (Mediator CS)"
  ) => {
    const target = repo.getSupportCase(caseId);
    if (target) {
      const newMsg: TripartiteChatMessage = {
        id: `msg-${Date.now()}`,
        senderRole,
        senderName,
        message,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
      };
      target.chatThread.push(newMsg);
      repo.notify();
    }
  };

  const openCases = cases.filter((c) => c.status === "OPEN");
  const inMediationCases = cases.filter((c) => c.status === "IN_MEDIATION");
  const urgentCases = cases.filter((c) => c.priority === "URGENT" && c.status !== "RESOLVED");
  const resolvedCases = cases.filter((c) => c.status === "RESOLVED");

  return {
    cases,
    getCaseById,
    findCaseById,
    assignToMe,
    escalateCase,
    submitMediationDecision,
    sendTripartiteMessage,
    openCases,
    inMediationCases,
    urgentCases,
    resolvedCases,
    totalEscrowHeld: cases
      .filter((c) => c.status !== "RESOLVED")
      .reduce((acc, c) => acc + c.escrowAmount, 0),
  };
}

