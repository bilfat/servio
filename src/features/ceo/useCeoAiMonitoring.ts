"use client";

import { useState, useMemo, useCallback } from "react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useActiveRole } from "@/context/RoleContext";
import { AISafetyIncident, AISafetySeverity } from "@/types/domain";

export function useCeoAiMonitoring() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();

  const [selectedSeverity, setSelectedSeverity] = useState<AISafetySeverity | "ALL">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "INVESTIGATING" | "RESOLVED">("ALL");
  const [activeIncident, setActiveIncident] = useState<AISafetyIncident | null>(null);
  const [mitigationModalOpen, setMitigationModalOpen] = useState(false);
  const [mitigationNote, setMitigationNote] = useState("");

  const telemetry = repo.aiTelemetry;
  const incidents = repo.aiIncidents;

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchSeverity = selectedSeverity === "ALL" || inc.severity === selectedSeverity;
      const matchStatus = selectedStatus === "ALL" || inc.status === selectedStatus;
      return matchSeverity && matchStatus;
    });
  }, [incidents, selectedSeverity, selectedStatus]);

  const unresolvedIncidentsCount = useMemo(() => {
    return incidents.filter((i) => i.status !== "RESOLVED").length;
  }, [incidents]);

  const handleOpenMitigation = useCallback((incident: AISafetyIncident) => {
    setActiveIncident(incident);
    setMitigationNote("");
    setMitigationModalOpen(true);
  }, []);

  const handleResolveIncident = useCallback(() => {
    if (!activeIncident) return false;

    const actor = {
      id: user.id || "usr-ceo-001",
      name: user.name || "Michael Tanuwijaya (CEO & Founder)",
    };

    const actionText = mitigationNote.trim() || "Mitigasi otomatis dikonfirmasi oleh CEO.";
    repo.resolveAiSafetyIncident(activeIncident.id, actionText, actor);

    setMitigationModalOpen(false);
    setActiveIncident(null);
    return true;
  }, [activeIncident, mitigationNote, repo, user]);

  return {
    telemetry,
    incidents: filteredIncidents,
    allIncidents: incidents,
    unresolvedIncidentsCount,
    selectedSeverity,
    setSelectedSeverity,
    selectedStatus,
    setSelectedStatus,
    activeIncident,
    setActiveIncident,
    mitigationModalOpen,
    setMitigationModalOpen,
    mitigationNote,
    setMitigationNote,
    handleOpenMitigation,
    handleResolveIncident,
  };
}
