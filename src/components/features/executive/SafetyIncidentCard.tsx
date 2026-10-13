"use client";

import React from "react";
import { ShieldCheck, WarningOctagon, Warning, Info, CheckCircle } from "@phosphor-icons/react";
import { AISafetyIncident } from "@/types/domain";

interface SafetyIncidentCardProps {
  incident: AISafetyIncident;
  onMitigate?: () => void;
}

export function SafetyIncidentCard({ incident, onMitigate }: SafetyIncidentCardProps) {
  const isCritical = incident.severity === "CRITICAL";
  const isHigh = incident.severity === "HIGH";
  const isMedium = incident.severity === "MEDIUM";
  const isResolved = incident.status === "RESOLVED";

  const severityBadgeClass = isCritical
    ? "bg-rose-100 text-rose-800 border-rose-200"
    : isHigh
    ? "bg-orange-100 text-orange-800 border-orange-200"
    : isMedium
    ? "bg-amber-100 text-amber-800 border-amber-200"
    : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-servio-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${severityBadgeClass}`}>
            {incident.severity}
          </span>
          <span className="text-xs font-mono font-bold text-neutral-slate">{incident.id}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-neutral-slate font-medium">
            Diblokir oleh: {incident.blockedBy}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-muted">{incident.timestamp}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              isResolved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {incident.status}
          </span>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-neutral-dark font-display">{incident.description}</p>
        <div className="mt-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px] text-neutral-slate">
          <span className="font-semibold text-neutral-dark">Prompt Input:</span> &ldquo;{incident.promptSummary}&rdquo;
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
        <div className="text-[11px] text-neutral-slate">
          <span className="font-semibold">Tindakan Mitigasi:</span> {incident.mitigationAction}
        </div>

        {!isResolved && onMitigate && (
          <button
            type="button"
            onClick={onMitigate}
            className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors self-start sm:self-auto shrink-0"
          >
            Konfirmasi Mitigasi
          </button>
        )}
      </div>
    </div>
  );
}
