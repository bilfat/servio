"use client";

import React from "react";
import { ClockCounterClockwise, CheckCircle, WarningCircle, Sparkle } from "@phosphor-icons/react";
import { FeePolicyConfig } from "@/types/domain";

interface PolicyVersionPanelProps {
  currentPolicy: FeePolicyConfig;
  allPolicies: FeePolicyConfig[];
  onStartDraft?: () => void;
  isEditing?: boolean;
}

export function PolicyVersionPanel({
  currentPolicy,
  allPolicies,
  onStartDraft,
  isEditing = false,
}: PolicyVersionPanelProps) {
  return (
    <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Sparkle size={22} className="text-amber-700" weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-neutral-dark font-display">
                Versi Aktif: {currentPolicy.version}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                {currentPolicy.status}
              </span>
            </div>
            <p className="text-xs text-neutral-slate mt-0.5">
              Berlaku Efektif: <span className="font-semibold">{currentPolicy.effectiveDate}</span> • Disahkan oleh:{" "}
              <span className="font-medium text-neutral-dark">{currentPolicy.publishedBy || currentPolicy.createdBy}</span>
            </p>
          </div>
        </div>

        {onStartDraft && !isEditing && (
          <button
            type="button"
            onClick={onStartDraft}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark shadow-servio-xs transition-colors self-start sm:self-auto"
          >
            + Buat Draft Kebijakan Baru
          </button>
        )}
      </div>

      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-neutral-dark">
        <p className="font-medium">{currentPolicy.description}</p>
        {currentPolicy.notes && (
          <p className="text-neutral-slate text-[11px] mt-1">{currentPolicy.notes}</p>
        )}
      </div>

      {/* Version History Drawer / List */}
      <div className="border-t border-slate-100 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted mb-2 flex items-center gap-1.5">
          <ClockCounterClockwise size={14} />
          <span>Riwayat Versi Kebijakan</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {allPolicies.map((pol) => {
            const isCurrent = pol.id === currentPolicy.id;
            return (
              <div
                key={pol.id}
                className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
                  isCurrent
                    ? "bg-sky/40 border-sky text-primary font-bold"
                    : "bg-white border-slate-200 text-neutral-slate"
                }`}
              >
                <span>{pol.version}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold uppercase ${
                    pol.status === "CURRENT"
                      ? "bg-emerald-100 text-emerald-700"
                      : pol.status === "DRAFT"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {pol.status}
                </span>
                <span className="text-[10px] text-neutral-muted">({pol.effectiveDate})</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
