"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  Wrench,
  Cube,
  CalendarBlank,
  Clock,
  CheckCircle,
  MapPin,
  ShieldCheck,
  Buildings,
  ArrowRight,
  Info,
} from "@phosphor-icons/react";
import { FollowUpOrderDraft } from "../../types";

interface FollowUpOrderDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: FollowUpOrderDraft;
  onConfirmFollowUp: (scheduledDate: string, scheduledTimeSlot: string) => void;
}

export function FollowUpOrderDraftModal({
  isOpen,
  onClose,
  draft,
  onConfirmFollowUp,
}: FollowUpOrderDraftModalProps) {
  const [selectedDate, setSelectedDate] = useState("2026-10-31");
  const [selectedSlot, setSelectedSlot] = useState("09:00 - 11:00 WIB");
  const [isConditionConfirmed, setIsConditionConfirmed] = useState(false);
  const [isSparepartReadyConfirmed, setIsSparepartReadyConfirmed] = useState(false);

  if (!draft) return null;

  const handleConfirm = () => {
    onConfirmFollowUp(selectedDate, selectedSlot);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lanjutkan Perbaikan — Draft Order Lanjutan"
      size="lg"
    >
      <div className="space-y-5 text-xs text-slate-700">
        {/* Banner Pembebasan Biaya Diagnosis */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
          <ShieldCheck size={18} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-emerald-900 block text-xs">
              Bebas Biaya Diagnosis Ulang (Rp 0)
            </span>
            <p className="text-[11px] text-emerald-800 leading-snug">
              Karena pemeriksaan sebelumnya telah valid pada ref #{draft.originalOrderId}, Anda tidak dikenakan biaya diagnosis kedua. Booking akan langsung dijadwalkan untuk penanganan teknisi.
            </p>
          </div>
        </div>

        {/* Info Layanan & Rekam Diagnosis Sebelumnya */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-xs">{draft.serviceTitle}</span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">Ref: #{draft.originalOrderId}</span>
          </div>

          <div className="text-[11px] text-slate-600">
            <strong className="text-slate-800">Ringkasan Diagnosa Lalu:</strong> {draft.diagnosisSummary}
          </div>

          <div className="space-y-1 pt-1.5 border-t border-slate-200/60">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Suku Cadang yang Diperlukan:</span>
            {draft.requiredSpareparts.map((sp, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="font-semibold text-slate-800">{sp.name}</span>
                <span className="text-slate-500">{sp.qty} Unit ({sp.source === "PROVIDER" ? "Disediakan Bengkel" : "Milik Customer"})</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
            <MapPin size={13} className="text-primary shrink-0" />
            <span className="truncate">{draft.savedAddress.fullAddress}, {draft.savedAddress.city}</span>
          </div>
        </div>

        {/* Pilihan Jadwal Kunjungan Baru */}
        <div className="space-y-2">
          <span className="font-bold text-slate-900 text-xs block">Pilih Jadwal Kunjungan Baru</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Tanggal Kunjungan</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Slot Waktu</label>
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="09:00 - 11:00 WIB">Pagi (09:00 - 11:00 WIB)</option>
                <option value="11:00 - 13:00 WIB">Siang (11:00 - 13:00 WIB)</option>
                <option value="14:00 - 16:00 WIB">Sore (14:00 - 16:00 WIB)</option>
                <option value="16:00 - 18:00 WIB">Sore (16:00 - 18:00 WIB)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Checklist Konfirmasi Pelanggan */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isConditionConfirmed}
              onChange={(e) => setIsConditionConfirmed(e.target.checked)}
              className="mt-0.5 accent-primary cursor-pointer"
            />
            <span className="text-[11px] text-slate-700 leading-tight">
              Saya mengonfirmasi bahwa kondisi unit fisik saat ini belum berubah sejak pemeriksaan terakhir.
            </span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isSparepartReadyConfirmed}
              onChange={(e) => setIsSparepartReadyConfirmed(e.target.checked)}
              className="mt-0.5 accent-primary cursor-pointer"
            />
            <span className="text-[11px] text-slate-700 leading-tight">
              Suku cadang yang diperlukan telah dipastikan siap untuk dipasang oleh teknisi pada jadwal kunjungan baru.
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!isConditionConfirmed || !isSparepartReadyConfirmed}
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            <CheckCircle size={15} weight="bold" />
            <span>Konfirmasi Lanjutkan Perbaikan</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
