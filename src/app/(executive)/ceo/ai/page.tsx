"use client";

import React from "react";
import { useCeoAiMonitoring } from "@/features/ceo/useCeoAiMonitoring";
import { PageHeader } from "@/components/layout/PageHeader";
import { AIHealthMetric } from "@/components/features/executive/AIHealthMetric";
import { SafetyIncidentCard } from "@/components/features/executive/SafetyIncidentCard";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Sparkle, WarningOctagon, CheckCircle, Info } from "@phosphor-icons/react";
import { AISafetySeverity } from "@/types/domain";

export default function CeoAiMonitoringPage() {
  const {
    telemetry,
    incidents,
    unresolvedIncidentsCount,
    selectedSeverity,
    setSelectedSeverity,
    selectedStatus,
    setSelectedStatus,
    activeIncident,
    mitigationModalOpen,
    setMitigationModalOpen,
    mitigationNote,
    setMitigationNote,
    handleOpenMitigation,
    handleResolveIncident,
  } = useCeoAiMonitoring();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengawasan Kinerja & Keamanan AI Smart Discovery"
        description="Monitoring performa model inferensi, rasio penerimaan rekomendasi, transparansi pipeline arsitektur, dan mitigasi insiden keselamatan (guardrails)."
        breadcrumbs={[
          { label: "Executive", href: "/ceo/dashboard" },
          { label: "AI Monitoring", href: "/ceo/ai" },
        ]}
      />

      {/* CORE INVARIANT BANNER */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-slate-900 text-white shadow-servio-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} className="text-sky-300" weight="fill" />
          </div>
          <div className="text-xs">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-white">Invarian Mutlak Tata Kelola AI SERVIO</p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                STRICTLY ENFORCED
              </span>
            </div>
            <p className="text-slate-300 mt-1 leading-relaxed">
              AI hanya bertindak sebagai asisten diagnosa rekomendasi. AI{" "}
              <span className="font-bold text-amber-300 underline">TIDAK PERNAH</span> diizinkan membuat pesanan diam-diam,
              memanipulasi harga katalog, atau memintas persetujuan pengguna.
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-[11px] font-semibold text-sky-200 self-start sm:self-auto shrink-0">
          Zero Silent Transaction
        </div>
      </div>

      {/* Telemetry Metric Cards & Pipeline Visualizer */}
      <AIHealthMetric telemetry={telemetry} />

      {/* Safety & Guardrail Incidents Header & Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-dark font-display flex items-center gap-2">
              <span>Log Insiden Keselamatan & Intervensi Guardrails</span>
              {unresolvedIncidentsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  {unresolvedIncidentsCount} Butuh Review
                </span>
              )}
            </h3>
            <p className="text-xs text-neutral-slate mt-0.5">
              Percobaan pelanggaran batas keamanan yang berhasil dicegat oleh lapisan aturan deterministik
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSelectedSeverity(sev as AISafetySeverity | "ALL")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  selectedSeverity === sev
                    ? "bg-slate-900 text-white shadow-servio-xs"
                    : "bg-white border border-slate-200 text-neutral-slate hover:text-neutral-dark"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Incidents List */}
        <div className="space-y-3">
          {incidents.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-neutral-muted text-xs">
              Tidak ada insiden keselamatan yang tercatat pada filter ini.
            </div>
          ) : (
            incidents.map((incident) => (
              <SafetyIncidentCard
                key={incident.id}
                incident={incident}
                onMitigate={() => handleOpenMitigation(incident)}
              />
            ))
          )}
        </div>
      </div>

      {/* Mitigation Resolution Modal */}
      <Modal
        isOpen={mitigationModalOpen}
        onClose={() => setMitigationModalOpen(false)}
        title="Tindakan Mitigasi Insiden AI"
        maxWidth="md"
      >
        {activeIncident && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-primary">Insiden: {activeIncident.id}</span>
              <p className="font-bold text-neutral-dark">{activeIncident.description}</p>
              <p className="text-neutral-slate text-[11px]">
                Prompt: &ldquo;{activeIncident.promptSummary}&rdquo;
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-dark mb-1">
                Catatan Penyelesaian & Konfirmasi Mitigasi
              </label>
              <textarea
                rows={3}
                value={mitigationNote}
                onChange={(e) => setMitigationNote(e.target.value)}
                placeholder="Tuliskan tindakan korektif (misal: Aturan batasan K3 ditegakkan, sampel prompt ditandai untuk evaluasi guardrail)..."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setMitigationModalOpen(false)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" onClick={handleResolveIncident}>
                Selesaikan Insiden & Simpan Audit
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
