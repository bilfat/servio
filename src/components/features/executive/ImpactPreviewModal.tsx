"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TrendUp, Users, Wrench, ShieldCheck, Database } from "@phosphor-icons/react";
import { TaxonomyProposal } from "@/types/domain";

interface ImpactPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: TaxonomyProposal | null;
}

export function ImpactPreviewModal({ isOpen, onClose, proposal }: ImpactPreviewModalProps) {
  if (!proposal) return null;

  const { impactSummary, schemaChanges } = proposal;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Simulasi Dampak Tata Kelola Kategori Jasa" maxWidth="lg">
      <div className="space-y-4">
        {/* Proposal Header Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-sky border border-sky-200">
            {proposal.domainName}
          </span>
          <h4 className="text-sm font-bold text-neutral-dark font-display mt-1.5">{proposal.title}</h4>
          <p className="text-xs text-neutral-slate mt-1 leading-relaxed">{proposal.description}</p>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80">
            <div className="flex items-center gap-2 text-blue-700 text-xs font-semibold mb-1">
              <Wrench size={16} />
              <span>Layanan Terdampak</span>
            </div>
            <p className="text-xl font-bold text-blue-950 font-display">
              {impactSummary.affectedServicesCount} Layanan
            </p>
            <p className="text-[10px] text-blue-700 mt-0.5">Katalog jasa yang disinkronisasi</p>
          </div>

          <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/80">
            <div className="flex items-center gap-2 text-purple-700 text-xs font-semibold mb-1">
              <Users size={16} />
              <span>Mitra Aktif</span>
            </div>
            <p className="text-xl font-bold text-purple-950 font-display">
              {impactSummary.activeProvidersCount} Penyedia
            </p>
            <p className="text-[10px] text-purple-700 mt-0.5">Memerlukan pembaruan kualifikasi</p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold mb-1">
              <TrendUp size={16} />
              <span>Estimasi Yield GMV</span>
            </div>
            <p className="text-xl font-bold text-emerald-950 font-display">
              +{impactSummary.estimatedGmvImpactPercent}%
            </p>
            <p className="text-[10px] text-emerald-700 mt-0.5">Potensi kenaikan transaksi 30 hari</p>
          </div>
        </div>

        {/* Schema Changes */}
        {schemaChanges && (
          <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
            <h5 className="text-xs font-bold text-neutral-dark flex items-center gap-1.5 font-display">
              <Database size={15} className="text-primary" />
              <span>Modifikasi Skema Form Order Dinamis</span>
            </h5>
            {schemaChanges.addedFields && schemaChanges.addedFields.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-neutral-slate">Atribut Baru:</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {schemaChanges.addedFields.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 rounded-md bg-sky-light text-primary text-[10px] font-mono font-medium border border-sky-200"
                    >
                      +{f}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {schemaChanges.modifiedValidations && (
              <div>
                <p className="text-[11px] font-semibold text-neutral-slate">Validasi Standar K3:</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {schemaChanges.modifiedValidations.map((v) => (
                    <span
                      key={v}
                      className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-mono border border-amber-200"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-bold">Catatan Kompatibilitas:</span> {impactSummary.catalogCompatibilityNotes}
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup Simulasi
          </Button>
        </div>
      </div>
    </Modal>
  );
}
