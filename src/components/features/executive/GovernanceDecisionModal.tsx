"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CheckCircle, XCircle, ArrowClockwise, Warning } from "@phosphor-icons/react";
import { TaxonomyProposal } from "@/types/domain";

interface GovernanceDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: TaxonomyProposal | null;
  decisionType: "APPROVE" | "REJECT" | "REVISE";
  onConfirm: (notesOrReason: string) => void;
}

export function GovernanceDecisionModal({
  isOpen,
  onClose,
  proposal,
  decisionType,
  onConfirm,
}: GovernanceDecisionModalProps) {
  const [inputVal, setInputVal] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!proposal) return null;

  const isReject = decisionType === "REJECT";
  const isRevise = decisionType === "REVISE";
  const isApprove = decisionType === "APPROVE";

  const title = isApprove
    ? "Persetujuan Tata Kelola Taksonomi"
    : isReject
    ? "Penolakan Usulan Taksonomi"
    : "Permintaan Revisi Usulan Taksonomi";

  const handleSubmit = () => {
    if ((isReject || isRevise) && !inputVal.trim()) {
      setErrorMsg("Alasan atau instruksi revisi wajib diisi.");
      return;
    }
    setErrorMsg("");
    onConfirm(inputVal.trim());
    setInputVal("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="space-y-4">
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            isApprove
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
              : isReject
              ? "bg-rose-50/80 border-rose-200 text-rose-900"
              : "bg-amber-50/80 border-amber-200 text-amber-900"
          }`}
        >
          {isApprove ? (
            <CheckCircle size={22} className="text-emerald-600 shrink-0 mt-0.5" weight="fill" />
          ) : isReject ? (
            <XCircle size={22} className="text-rose-600 shrink-0 mt-0.5" weight="fill" />
          ) : (
            <ArrowClockwise size={22} className="text-amber-600 shrink-0 mt-0.5" weight="bold" />
          )}
          <div className="text-xs">
            <p className="font-bold">{proposal.title}</p>
            <p className="mt-0.5 opacity-90">
              Domain: <span className="font-semibold">{proposal.domainName}</span> • Diusulkan oleh:{" "}
              <span className="font-semibold">{proposal.proposedBy}</span>
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-dark mb-1.5">
            {isApprove
              ? "Catatan Pengesahan Eksekutif (Opsional)"
              : isReject
              ? "Alasan Penolakan Resmi (Wajib)"
              : "Instruksi Revisi untuk Admin Ops (Wajib)"}
          </label>
          <textarea
            rows={3}
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              if (errorMsg) setErrorMsg("");
            }}
            placeholder={
              isApprove
                ? "Masukkan arahan atau catatan persetujuan dewan eksekutif..."
                : isReject
                ? "Jelaskan mengapa usulan ini tidak selaras dengan standar atau strategi platform..."
                : "Tuliskan bagian skema form atau sertifikasi yang perlu disesuaikan kembali oleh tim Ops..."
            }
            className={`w-full p-3 text-xs rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 ${
              errorMsg ? "border-rose-400" : "border-slate-300"
            }`}
          />
          {errorMsg && <p className="text-[11px] text-rose-600 mt-1 font-semibold">{errorMsg}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant={isApprove ? "primary" : isReject ? "danger" : "secondary"}
            size="sm"
            onClick={handleSubmit}
          >
            {isApprove ? "Sahkan & Publikasikan" : isReject ? "Tolak Usulan" : "Kirim Catatan Revisi"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
