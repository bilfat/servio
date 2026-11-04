"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  Wrench,
  Cube,
  CheckCircle,
  XCircle,
  Clock,
  WarningCircle,
  CurrencyCircleDollar,
  ShieldCheck,
  User,
  Info,
} from "@phosphor-icons/react";
import { Diagnosis, SparepartItem } from "../../types";

interface DiagnosisReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosis: Diagnosis;
  orderNumber: string;
  orderStatus?: string;
  orderSubStatus?: string;
  isConsentPending?: boolean;
  readOnly?: boolean;
  onApproveRemote?: () => void;
  onRejectRemote?: (reason: string) => void;
  onChangeSparepartSource?: () => void;
  onReportDispute?: (reason: string) => void;
}

export function DiagnosisReviewModal({
  isOpen,
  onClose,
  diagnosis,
  orderNumber,
  orderStatus,
  orderSubStatus,
  isConsentPending,
  readOnly = false,
  onApproveRemote,
  onRejectRemote,
  onChangeSparepartSource,
  onReportDispute,
}: DiagnosisReviewModalProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [isReportingDispute, setIsReportingDispute] = useState(false);

  if (!diagnosis) return null;

  const isCompleted =
    orderStatus === "COMPLETED" ||
    orderSubStatus === "COMPLETED_NORMAL" ||
    orderSubStatus === "AUTO_COMPLETED_72H" ||
    orderSubStatus === "WORK_FINISHED" ||
    orderSubStatus === "EXECUTION_PENDING" ||
    orderSubStatus === "AWAITING_CUSTOMER_CONFIRMATION";
  const isCancelled = orderStatus === "CANCELLED" || (orderSubStatus && orderSubStatus.startsWith("CANCELLED"));
  const isInPerson = diagnosis.consent?.type === "IN_PERSON_RECORDED";
  const cost = diagnosis.costBreakdown;

  // Active actionable state strictly when waiting for customer consent:
  const canAct =
    !readOnly &&
    !isCompleted &&
    !isCancelled &&
    orderSubStatus === "WAITING_CUSTOMER_CONSENT" &&
    (isConsentPending ?? true);

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hasil Pemeriksaan & Rincian Biaya Perbaikan"
      size="xl"
    >
      <div className="space-y-5 text-xs text-slate-700">
        {/* Header Notice */}
        <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] block">
              Pemeriksaan Fisik Lapangan #{orderNumber}
            </span>
            <span className="text-xs font-bold text-slate-900 block mt-0.5">
              Diperiksa oleh {diagnosis.workerName} • {diagnosis.diagnosisTime}
            </span>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white border border-sky-200 text-primary shadow-3xs shrink-0">
            Versi Rincian #{diagnosis.version}
          </span>
        </div>

        {/* 1. Status Notice Banner */}
        {isCompleted ? (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
            <div className="flex items-center gap-2 text-emerald-900 font-bold">
              <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0" />
              <span>Pesanan Selesai — Rincian Biaya Tuntas</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-snug">
              Seluruh tindakan perbaikan dan suku cadang pada rincian ini telah selesai dikerjakan oleh teknisi {diagnosis.workerName} dan telah dilunasi sepenuhnya oleh pelanggan.
            </p>
          </div>
        ) : isInPerson ? (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
            <div className="flex items-center gap-2 text-emerald-900 font-bold">
              <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0" />
              <span>Persetujuan di Lokasi Telah Dicatat Resmi oleh Teknisi</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-snug">
              Teknisi {diagnosis.workerName} mencatat persetujuan lisan Anda di lokasi pada {diagnosis.consent?.timestamp}. Pekerjaan dapat langsung dikerjakan tanpa pembayaran pengerjaan di awal.
            </p>
          </div>
        ) : null}

        {/* 1. Temuan Pemeriksaan & Foto Kerusakan */}
        <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Wrench size={14} className="text-primary" weight="bold" />
            <span>Hasil Analisa &amp; Temuan Kerusakan</span>
          </h4>
          <p className="text-slate-800 leading-relaxed font-medium">
            {diagnosis.findings}
          </p>

          {diagnosis.rootCause && (
            <p className="text-[11px] text-slate-500">
              <strong>Penyebab Utama:</strong> {diagnosis.rootCause}
            </p>
          )}

          {diagnosis.recommendedActions && (
            <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
              <strong className="text-slate-800">Tindakan Rekomendasi:</strong> {diagnosis.recommendedActions}
            </div>
          )}

          {diagnosis.damagePhotos && diagnosis.damagePhotos.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] font-bold text-slate-400 block mb-1.5">Foto Bukti Kerusakan:</span>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {diagnosis.damagePhotos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo}
                    alt={`Kerusakan ${i + 1}`}
                    className="w-20 h-20 rounded-xl object-cover border border-slate-200"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Rincian Tindakan Pekerjaan */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              A. Daftar Pekerjaan Teknisi
            </span>
            <span className="font-bold text-slate-900 font-mono">
              {formatRupiah(cost.workTotal)}
            </span>
          </div>

          <div className="space-y-2">
            {cost.workItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
              >
                <div>
                  <h5 className="font-bold text-slate-800 text-xs">{item.title}</h5>
                  <p className="text-[11px] text-slate-500">{item.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-slate-900 font-mono text-xs">{formatRupiah(item.subtotal)}</span>
                  {item.qty > 1 && (
                    <span className="text-[10px] text-slate-400 block">@ {formatRupiah(item.unitPrice)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Rincian Suku Cadang */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                B. Kebutuhan Suku Cadang &amp; Bahan
              </span>
              {canAct && (
                <button
                  type="button"
                  onClick={onChangeSparepartSource}
                  className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Ubah Sumber
                </button>
              )}
            </div>
            <span className="font-bold text-slate-900 font-mono">
              {formatRupiah(cost.sparepartTotal)}
            </span>
          </div>

          {cost.spareparts.length === 0 ? (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-center text-[11px]">
              Tidak membutuhkan suku cadang tambahan untuk perbaikan ini.
            </div>
          ) : (
            <div className="space-y-2">
              {cost.spareparts.map((sp, idx) => (
                <div
                  key={sp.id || idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-slate-800 text-xs">{sp.name}</h5>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-[#0F4C81]">
                        {(sp.source as string) === "PROVIDER" || (sp.source as string) === "PROVIDER_SUPPLIED"
                          ? "Dari Bengkel"
                          : (sp.source as string) === "MERCHANT_05A" || (sp.source as string) === "SERVIO_MERCHANT"
                          ? "Beli di SERVIO"
                          : "Milik Pelanggan (Rp0)"}
                      </span>
                    </div>
                    {sp.specification && (
                      <p className="text-[11px] text-slate-500">{sp.specification}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 font-mono text-xs">
                      {sp.subtotal === 0 ? "Rp 0" : formatRupiah(sp.subtotal)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{sp.qty} Unit</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Total Ringkasan Biaya Final */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Total Jasa Pengerjaan:</span>
            <span className="font-mono">{formatRupiah(cost.workTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Total Suku Cadang Bengkel:</span>
            <span className="font-mono">{formatRupiah(cost.sparepartTotal)}</span>
          </div>
          <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
            <span className="font-bold text-sm">Total Estimasi Pelunasan:</span>
            <span className="font-extrabold text-lg text-emerald-400 font-mono">
              {formatRupiah(cost.grandTotal)}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight pt-1">
            * Pembayaran pengerjaan dilakukan <strong>SETELAH</strong> teknisi selesai mengerjakan dan melakukan pengujian tuntas.
          </p>
        </div>

        {/* Actions for Remote Approval (Only visible when customer action is pending) */}
        {canAct && !isInPerson && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            {!isRejecting ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsRejecting(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition cursor-pointer"
                >
                  Tidak Setuju &amp; Batalkan
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onChangeSparepartSource}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    Ubah Suku Cadang
                  </button>
                  <button
                    type="button"
                    onClick={onApproveRemote}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle size={15} weight="bold" />
                    <span>Setujui &amp; Kerjakan</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5">
                <span className="font-bold text-rose-900 block text-xs">
                  Konfirmasi Penolakan Perbaikan
                </span>
                <p className="text-[11px] text-rose-700 leading-snug">
                  Jika Anda menolak rincian biaya ini, pesanan akan dibatalkan. Biaya diagnosis yang telah dibayar sah menjadi hak teknisi atas kunjungan dan analisa kerusakan.
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Tuliskan alasan penolakan (misal: biaya melebihi anggaran)..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-rose-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRejecting(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={!rejectReason.trim()}
                    onClick={() => onRejectRemote(rejectReason)}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
                  >
                    Konfirmasi Tolak Perbaikan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* If In-Person AND canAct, provide option to report discrepancy */}
        {canAct && isInPerson && (
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
            <span>Persetujuan ini telah disepakati langsung di lokasi.</span>
            <button
              type="button"
              onClick={() => {
                if (onReportDispute) {
                  onReportDispute("Pelanggan melaporkan ketidaksesuaian persetujuan lisan.");
                }
              }}
              className="text-rose-600 font-bold hover:underline cursor-pointer"
            >
              Laporkan Ketidaksesuaian
            </button>
          </div>
        )}

        {/* Read-Only Footer: When order is finished, executing, completed, or cancelled */}
        {!canAct && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" weight="fill" />
              <span>
                {isCompleted
                  ? "Pesanan telah selesai dikonfirmasi dan seluruh pembayaran tuntas."
                  : isCancelled
                  ? "Pesanan servis telah dibatalkan."
                  : "Rincian biaya telah disetujui untuk tindakan operasional teknisi."}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
