"use client";

import { useState } from "react";
import {
  WarrantyCertificate,
  WarrantyClaim,
  WarrantyV1,
  WarrantyClaimV1,
  WarrantyAssignmentV1,
  WarrantyDiagnosisV1,
  WarrantyPaidWorkRequestV1,
  WarrantyPaidWorkProposalV1,
  WarrantyCompletionProofV1,
  WarrantyTimelineEventV1,
  ProviderWarrantySettings,
  ProviderWarrantyDuration,
  ServiceWarrantyConfiguration,
} from "@/types/domain";
import { useDomainRepository, normalizeEntityId } from "@/lib/repository/domainRepository";

export function useWarranties() {
  const repo = useDomainRepository();
  const [legacyClaims, setLegacyClaims] = useState<WarrantyClaim[]>([]);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Legacy mappings
  const warranties = repo.warranties;

  const getWarrantyById = (id: string): WarrantyCertificate | undefined => {
    return repo.getWarranty(id) || undefined;
  };

  const getWarrantyByOrderId = (orderId: string): WarrantyCertificate | undefined => {
    const target = normalizeEntityId(orderId);
    return warranties.find((w) => w.orderId === target || normalizeEntityId(w.orderId) === target);
  };

  const submitClaim = async (
    warrantyId: string,
    orderId: string,
    issueDescription: string,
    evidenceUrls: string[] = []
  ): Promise<WarrantyClaim> => {
    setIsSubmittingClaim(true);
    await new Promise((r) => setTimeout(r, 80));

    const claim: WarrantyClaim = {
      id: `clm-${Date.now().toString().slice(-4)}`,
      warrantyId,
      orderId,
      issueDescription,
      evidenceUrls,
      status: "SUBMITTED",
      submittedAt: new Date().toISOString(),
    };

    setLegacyClaims((prev) => [claim, ...prev]);
    setIsSubmittingClaim(false);
    return claim;
  };

  // V1 Collections
  const warrantiesV1: WarrantyV1[] = repo.warrantiesV1;
  const claimsV1: WarrantyClaimV1[] = repo.warrantyClaimsV1;
  const assignmentsV1: WarrantyAssignmentV1[] = repo.warrantyAssignmentsV1;
  const diagnosesV1: WarrantyDiagnosisV1[] = repo.warrantyDiagnosesV1;
  const paidWorkRequestsV1: WarrantyPaidWorkRequestV1[] = repo.warrantyPaidWorkRequestsV1;
  const paidWorkProposalsV1: WarrantyPaidWorkProposalV1[] = repo.warrantyPaidWorkProposalsV1;
  const completionProofsV1: WarrantyCompletionProofV1[] = repo.warrantyCompletionProofsV1;
  const timelineEventsV1: WarrantyTimelineEventV1[] = repo.warrantyTimelineEventsV1;
  const providerWarrantySettings: ProviderWarrantySettings[] = repo.providerWarrantySettings;
  const providerWarrantyDurations: ProviderWarrantyDuration[] = repo.providerWarrantyDurations;
  const serviceWarrantyConfigs: ServiceWarrantyConfiguration[] = repo.serviceWarrantyConfigs;

  // V1 Queries
  const getWarrantyV1 = (id: string): WarrantyV1 | null => repo.getWarrantyV1(id);
  const getWarrantyV1ByOrderId = (orderId: string): WarrantyV1 | null => repo.getWarrantyV1ByOrderId(orderId);
  const getWarrantyClaimV1ById = (id: string): WarrantyClaimV1 | null => repo.getWarrantyClaimV1ById(id);
  const getWarrantiesByProvider = (providerId: string): WarrantyV1[] => repo.getWarrantiesByProvider(providerId);
  const getWarrantiesByCustomer = (customerId: string): WarrantyV1[] => repo.getWarrantiesByCustomer(customerId);
  const getWarrantyClaimsByProvider = (providerId: string): WarrantyClaimV1[] => repo.getWarrantyClaimsByProvider(providerId);
  const getWarrantyAssignmentsByWorker = (workerId: string): WarrantyAssignmentV1[] => repo.getWarrantyAssignmentsByWorker(workerId);
  const getWarrantyTimeline = (warrantyId: string, role: "CUSTOMER" | "WORKER" | "PROVIDER" | "ADMIN" = "CUSTOMER") =>
    repo.getWarrantyTimeline(warrantyId, role);
  const getWarrantyDiagnosis = (claimId: string): WarrantyDiagnosisV1 | null => repo.getWarrantyDiagnosisByClaim(claimId);
  const getWarrantyPaidWorkRequest = (claimId: string): WarrantyPaidWorkRequestV1 | null => repo.getWarrantyPaidWorkRequest(claimId);
  const getWarrantyPaidWorkProposal = (proposalId: string): WarrantyPaidWorkProposalV1 | null => repo.getWarrantyPaidWorkProposal(proposalId);
  const getWarrantyPaidWorkProposalByClaim = (claimId: string): WarrantyPaidWorkProposalV1 | null => repo.getWarrantyPaidWorkProposalByClaim(claimId);

  // V1 Mutations
  const setProviderWarrantyStoreStatus = (providerId: string, enabled: boolean) =>
    repo.setProviderWarrantyStoreStatus(providerId, enabled);
  const addProviderWarrantyDuration = (providerId: string, durationDays: number) =>
    repo.addProviderWarrantyDuration(providerId, durationDays);
  const archiveProviderWarrantyDuration = (durationId: string) =>
    repo.archiveProviderWarrantyDuration(durationId);
  const configureServiceWarranty = (providerMasterServiceId: string, enabled: boolean, durationDays: number, policyVersion?: string) =>
    repo.configureServiceWarranty(providerMasterServiceId, enabled, durationDays, policyVersion);
  const grantWarranty = (providerId: string, warrantyId: string) =>
    repo.grantWarranty(providerId, warrantyId);
  const submitWarrantyClaim = (customerId: string, warrantyId: string, data: { reason: string; description: string; issueOccurredAt: string; evidence: string[] }) =>
    repo.submitWarrantyClaim(customerId, warrantyId, data);
  const reviewWarrantyClaim = (providerId: string, claimId: string, action: "ACCEPT" | "REJECT", rejectionReason?: string) =>
    repo.reviewWarrantyClaim(providerId, claimId, action, rejectionReason);
  const assignWarrantyWorker = (providerId: string, claimId: string, workerId: string, assignmentType: "INSPECTION" | "REPAIR", schedule: { scheduledDate: string; scheduledStartTime: string; estimatedDuration?: number; location?: string; notes?: string }) =>
    repo.assignWarrantyWorker(providerId, claimId, workerId, assignmentType, schedule);
  const rescheduleWarrantyAssignment = (providerId: string, assignmentId: string, newSchedule: { scheduledDate: string; scheduledStartTime: string; estimatedDuration?: number; notes?: string }) =>
    repo.rescheduleWarrantyAssignment(providerId, assignmentId, newSchedule);
  const workerStartWarrantyHandling = (workerId: string, assignmentId: string) =>
    repo.workerStartWarrantyHandling(workerId, assignmentId);
  const workerCheckInWarranty = (workerId: string, assignmentId: string) =>
    repo.workerCheckInWarranty(workerId, assignmentId);
  const workerSubmitWarrantyDiagnosis = (workerId: string, claimId: string, data: { findings: string; diagnosis: string; condition: string; recommendedAction: string; requiredMaterial?: string; evidence: string[]; evidenceVideos?: string[]; technicalNotes?: string }) =>
    repo.workerSubmitWarrantyDiagnosis(workerId, claimId, data);
  const providerDecideCoverage = (providerId: string, claimId: string, isCovered: boolean, notes?: string) =>
    repo.providerDecideCoverage(providerId, claimId, isCovered, notes);
  const providerApproveWarrantyRepair = (providerId: string, claimId: string, notes?: string) =>
    repo.providerApproveWarrantyRepair(providerId, claimId, notes);
  const providerRequestMoreInfo = (providerId: string, claimId: string, notes: string) =>
    repo.providerRequestMoreInfo(providerId, claimId, notes);
  const providerRequestMoreWarrantyInfo = (providerId: string, claimId: string, notes: string) =>
    repo.providerRequestMoreWarrantyInfo(providerId, claimId, notes);
  const workerRecommendPaidWork = (workerId: string, claimId: string, data: { findingSummary: string; recommendedWork: string; recommendedMaterial: string; estimatedDuration: number; evidence: string[]; technicalNotes?: string }) =>
    repo.workerRecommendPaidWork(workerId, claimId, data);
  const providerCreatePaidWorkProposal = (providerId: string, paidWorkRequestId: string, data: { title: string; scope: string; lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>; reasonOutsideWarranty: string; notes?: string }) =>
    repo.providerCreatePaidWorkProposal(providerId, paidWorkRequestId, data);
  const customerRespondPaidWorkProposal = (customerId: string, proposalId: string, approved: boolean, reason?: string) =>
    repo.customerRespondPaidWorkProposal(customerId, proposalId, approved, reason);
  const customerApprovePaidWork = (customerId: string, proposalId: string) =>
    repo.customerApprovePaidWork(customerId, proposalId);
  const customerRejectPaidWork = (customerId: string, proposalId: string, reason?: string) =>
    repo.customerRejectPaidWork(customerId, proposalId, reason);
  const customerDisputeWarrantyClaim = (customerId: string, claimId: string, reason: string) =>
    repo.customerDisputeWarrantyClaim(customerId, claimId, reason);
  const workerSubmitCompletionProof = (workerId: string, claimId: string, data: { summary: string; notes?: string; evidenceBefore: string[]; evidenceAfter: string[] }) =>
    repo.workerSubmitCompletionProof(workerId, claimId, data);
  const workerSubmitWarrantyCompletion = (workerId: string, claimId: string, data: { summary: string; notes?: string; evidenceBefore: string[]; evidenceAfter: string[] }) =>
    repo.workerSubmitWarrantyCompletion(workerId, claimId, data);
  const providerReviewCompletionProof = (providerId: string, proofId: string, approved: boolean) =>
    repo.providerReviewCompletionProof(providerId, proofId, approved);
  const providerResolveWarrantyClaim = (providerId: string, claimIdOrProofId: string, notes?: string) =>
    repo.providerResolveWarrantyClaim(providerId, claimIdOrProofId, notes);
  const resetWarrantyV1Fixtures = () => repo.resetWarrantyV1Fixtures();
  const isWarrantyActive = (warrantyId: string, referenceTimeMs?: number): boolean =>
    repo.isWarrantyActive(warrantyId, referenceTimeMs);

  return {
    // Legacy support
    warranties,
    claims: legacyClaims,
    getWarrantyById,
    getWarrantyByOrderId,
    submitClaim,
    isSubmittingClaim,
    activeWarrantiesCount: warrantiesV1.filter((w) => w.status === "ACTIVE").length,

    // V1 Collections
    warrantiesV1,
    claimsV1,
    assignmentsV1,
    diagnosesV1,
    paidWorkRequestsV1,
    paidWorkProposalsV1,
    completionProofsV1,
    timelineEventsV1,
    providerWarrantySettings,
    providerWarrantyDurations,
    serviceWarrantyConfigs,

    // V1 Queries
    getWarrantyV1,
    getWarrantyV1ByOrderId,
    getWarrantyClaimV1ById,
    getWarrantiesByProvider,
    getWarrantiesByCustomer,
    getWarrantyClaimsByProvider,
    getWarrantyAssignmentsByWorker,
    getWarrantyTimeline,
    getWarrantyDiagnosis,
    getWarrantyPaidWorkRequest,
    getWarrantyPaidWorkProposal,
    getWarrantyPaidWorkProposalByClaim,
    isWarrantyActive,

    // V1 Mutations
    setProviderWarrantyStoreStatus,
    addProviderWarrantyDuration,
    archiveProviderWarrantyDuration,
    configureServiceWarranty,
    grantWarranty,
    submitWarrantyClaim,
    reviewWarrantyClaim,
    assignWarrantyWorker,
    rescheduleWarrantyAssignment,
    workerStartWarrantyHandling,
    workerCheckInWarranty,
    workerSubmitWarrantyDiagnosis,
    providerDecideCoverage,
    providerApproveWarrantyRepair,
    providerRequestMoreInfo,
    providerRequestMoreWarrantyInfo,
    workerRecommendPaidWork,
    providerCreatePaidWorkProposal,
    customerRespondPaidWorkProposal,
    customerApprovePaidWork,
    customerRejectPaidWork,
    customerDisputeWarrantyClaim,
    workerSubmitCompletionProof,
    workerSubmitWarrantyCompletion,
    providerReviewCompletionProof,
    providerResolveWarrantyClaim,
    resetWarrantyV1Fixtures,
  };
}
