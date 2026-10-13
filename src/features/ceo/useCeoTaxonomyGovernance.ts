"use client";

import { useState, useMemo, useCallback } from "react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useActiveRole } from "@/context/RoleContext";
import { TaxonomyProposal, TaxonomyProposalStatus } from "@/types/domain";

export function useCeoTaxonomyGovernance() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();
  const [selectedFilter, setSelectedFilter] = useState<TaxonomyProposalStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeProposal, setActiveProposal] = useState<TaxonomyProposal | null>(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<"APPROVE" | "REJECT" | "REVISE">("APPROVE");
  const [impactModalOpen, setImpactModalOpen] = useState(false);

  const proposals = repo.taxonomyProposals;

  const filteredProposals = useMemo(() => {
    return proposals.filter((prop) => {
      const matchFilter = selectedFilter === "ALL" || prop.status === selectedFilter;
      const matchQuery =
        !searchQuery ||
        prop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.subcategoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.domainName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.proposedBy.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchQuery;
    });
  }, [proposals, selectedFilter, searchQuery]);

  const pendingCount = useMemo(() => {
    return proposals.filter((p) => p.status === "PENDING_APPROVAL").length;
  }, [proposals]);

  const handleOpenDecision = useCallback(
    (proposal: TaxonomyProposal, type: "APPROVE" | "REJECT" | "REVISE") => {
      setActiveProposal(proposal);
      setDecisionType(type);
      setDecisionModalOpen(true);
    },
    []
  );

  const handleOpenImpact = useCallback((proposal: TaxonomyProposal) => {
    setActiveProposal(proposal);
    setImpactModalOpen(true);
  }, []);

  const handleExecuteDecision = useCallback(
    (reasonOrNotes: string) => {
      if (!activeProposal) return false;

      const actor = {
        id: user.id || "usr-ceo-001",
        name: user.name || "Michael Tanuwijaya (CEO & Founder)",
      };

      if (decisionType === "APPROVE") {
        repo.approveTaxonomyProposal(activeProposal.id, reasonOrNotes, actor);
      } else if (decisionType === "REJECT") {
        repo.rejectTaxonomyProposal(activeProposal.id, reasonOrNotes, actor);
      } else {
        repo.requestRevisionTaxonomyProposal(activeProposal.id, reasonOrNotes, actor);
      }

      setDecisionModalOpen(false);
      setActiveProposal(null);
      return true;
    },
    [activeProposal, decisionType, repo, user]
  );

  return {
    proposals: filteredProposals,
    allProposals: proposals,
    pendingCount,
    selectedFilter,
    setSelectedFilter,
    searchQuery,
    setSearchQuery,
    activeProposal,
    setActiveProposal,
    decisionModalOpen,
    setDecisionModalOpen,
    decisionType,
    impactModalOpen,
    setImpactModalOpen,
    handleOpenDecision,
    handleOpenImpact,
    handleExecuteDecision,
  };
}
