"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  CheckCircle,
  WarningCircle,
  ShieldCheck,
  User,
  Wrench,
  Cube,
  FileText,
} from "@phosphor-icons/react";
import { ServiceOrder } from "../../types";

interface WorkerInPersonConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder;
  onRecordConsent: (notes?: string) => void;
}

export function WorkerInPersonConsentModal({
  isOpen,
  onClose,
  order,
  onRecordConsent,
}: WorkerInPersonConsentModalProps) {
  const [workerDeclared, setWorkerDeclared] = useState(false);
  const [notes, setNotes] = useState("");

  if (!order || !order.diagnosis) return null;

  const cost = order.diagnosis.costBreakdown;
  const formatRupiah = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerDeclared) return;
    onRecordConsent(notes || "Persetujuan lisan di lokasi telah dicatat resmi oleh teknisi.");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Persetujuan Pelanggan di Lokasi"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-700">
        {/* Banner Instruksi Resmi */}
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <WarningCircle size={15} weight="bold" className="text-amber-700 shrink-0" />
            <span>Pencatatan Persetujuan Tatap Muka</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-snug">
            Gunakan fitur ini apabila pelanggan berada langsung di lokasi bersama Anda dan telah menyetujui rincian perbaikan secara lisan. Tindakan ini dicatat sebagai tindakan teknisi (bukan login digital pelanggan).
          </p>
        </div>

        {/* Ringkasan Biaya yang Disetujui */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-800">Order #{order.orderNumber}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200">
              Versi #{order.diagnosis.version}
            </span>
          </div>

          <div className="text-[11px] text-slate-600">
            <span className="text-slate-400 block">Pelanggan di Lokasi:</span>
            <strong className="text-slate-800">{order.customerName}</strong> ({order.customerPhone})
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center">
            <span className="font-semibold text-slate-700">Total Biaya Disepakati:</span>
            <span className="font-bold text-sm text-primary font-mono">
              {formatRupiah(cost.grandTotal)}
            </span>
          </div>
        </div>

        {/* Checkbox Pernyataan Teknisi */}
        <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={workerDeclared}
              onChange={(e) => setWorkerDeclared(e.target.checked)}
              className="mt-0.5 accent-primary cursor-pointer"
            />
            <span className="text-[11px] text-slate-800 font-medium leading-tight">
              Saya menyatakan bahwa saya telah menjelaskan rincian kerusakan, tindakan perbaikan, dan biaya kepada Bapak/Ibu <strong>{order.customerName}</strong>, dan pelanggan telah memberikan persetujuannya secara lisan di lokasi.
            </span>
          </label>
        </div>

        {/* Catatan Tambahan Opsional */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">Catatan Tambahan (Opsional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Disetujui langsung oleh pemilik rumah di ruang tamu"
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!workerDeclared}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            <CheckCircle size={15} weight="bold" />
            <span>Catat Persetujuan di Lokasi</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
