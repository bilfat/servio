"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle,
  ShieldCheck,
  Wrench,
  User,
  WarningCircle,
  X,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { ServiceOrder } from "../../types";

interface ConfirmServiceCompletionModalProps {
  order: ServiceOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string) => void | Promise<void>;
  isSubmitting?: boolean;
}

export function ConfirmServiceCompletionModal({
  order,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}: ConfirmServiceCompletionModalProps) {
  const [isConfirmedChecked, setIsConfirmedChecked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsConfirmedChecked(false);
    }
  }, [isOpen, order?.id]);

  if (!isOpen || !order) return null;

  const warrantyDays = order.serviceSnapshot?.warrantyDurationDays ?? 0;
  const hasWarranty = warrantyDays > 0;
  const workerName = order.assignment?.workerName || "Teknisi Bertugas";
  const rawTitle = order.serviceSnapshot?.title || "";
  const serviceTitle =
    !rawTitle ||
    rawTitle.toLowerCase().includes("service offering") ||
    /[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawTitle)
      ? "Layanan Servis Resmi Servio"
      : rawTitle;
  const execAmount =
    order.paymentSummary?.executionPayment?.amount ??
    order.diagnosis?.costBreakdown?.grandTotal ??
    0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-service-completion-title"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200/90 font-body text-slate-800">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle size={24} weight="fill" />
            </div>
            <div>
              <h3
                id="confirm-service-completion-title"
                className="font-display font-extrabold text-base text-slate-900 leading-snug"
              >
                Pastikan Pekerjaan Telah Selesai &amp; Berfungsi Baik
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                Order #{order.orderNumber} &bull; {order.providerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Tutup dialog"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Ringkasan Layanan */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-start justify-between gap-2">
            <span className="text-slate-500 shrink-0">Layanan Jasa:</span>
            <span className="font-bold text-slate-900 text-right">{serviceTitle}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 flex items-center gap-1">
              <User size={13} className="text-slate-400" />
              Teknisi Pelaksana:
            </span>
            <span className="font-semibold text-slate-800">{workerName}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 flex items-center gap-1">
              <Wrench size={13} className="text-slate-400" />
              Status Pembayaran:
            </span>
            <span className="font-mono font-bold text-emerald-700">
              Lunas ({execAmount > 0 ? `Rp ${execAmount.toLocaleString("id-ID")}` : "Terverifikasi"})
            </span>
          </div>
          <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between gap-2">
            <span className="text-slate-500 flex items-center gap-1">
              <ShieldCheck size={14} className={hasWarranty ? "text-emerald-600" : "text-slate-400"} weight="fill" />
              Ketentuan Garansi:
            </span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                hasWarranty
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {hasWarranty ? `Garansi Resmi ${warrantyDays} Hari Aktif` : "Tanpa Garansi Tambahan"}
            </span>
          </div>
        </div>

        {/* Notifikasi Verifikasi Kualitas Hasil Kerja */}
        <div className="p-4 rounded-2xl bg-emerald-50/75 border border-emerald-200 space-y-2.5 text-xs text-emerald-950">
          <div className="flex items-center gap-2 font-extrabold text-emerald-900">
            <ShieldCheck size={17} weight="fill" className="text-emerald-600 shrink-0" />
            <span>Mohon Periksa Kembali Sebelum Menyelesaikan Pesanan</span>
          </div>

          <ul className="space-y-2 text-[12px] leading-relaxed text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-900">Pekerjaan 100% Tuntas:</strong> Seluruh perbaikan sesuai keluhan telah selesai dikerjakan oleh teknisi dan area pengerjaan sudah kembali rapi.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-900">Hasil Bagus &amp; Bekerja Optimal:</strong> Anda telah memeriksa langsung dan menguji unit/komponen yang diservis — fungsinya normal, baik, dan tidak ada kendala tersisa.
              </span>
            </li>
          </ul>

          <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 flex items-start gap-2 text-[11px] text-amber-900 leading-relaxed">
            <WarningCircle size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              {hasWarranty ? (
                <>
                  Jika Anda mengonfirmasi selesai, status pesanan berubah menjadi <strong>Selesai (COMPLETED)</strong>,{" "}
                  <strong>garansi resmi {warrantyDays} hari langsung aktif</strong>, dan pembayaran diproses melalui escrow mitra. Jangan konfirmasi jika masih ada hasil yang kurang sesuai.
                </>
              ) : (
                <>
                  Jika Anda mengonfirmasi selesai, status pesanan berubah menjadi <strong>Selesai (COMPLETED)</strong> dan pembayaran diteruskan ke escrow mitra. Karena layanan ini <strong>tanpa tambahan masa garansi</strong>, pastikan hasil kerja benar-benar bekerja dengan baik sebelum mengonfirmasi.
                </>
              )}
            </span>
          </div>
        </div>

        {/* Mandatory Checkbox */}
        <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isConfirmedChecked}
            onChange={(e) => setIsConfirmedChecked(e.target.checked)}
            disabled={isSubmitting}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer"
          />
          <span className="text-xs font-semibold text-slate-800 leading-relaxed">
            Saya sudah memeriksa hasil pengerjaan teknisi dan memastikan pekerjaan order jasa ini benar-benar selesai, hasilnya rapi, dan berfungsi dengan baik.
          </span>
        </label>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            Belum, Periksa Lagi
          </button>
          <button
            type="button"
            disabled={!isConfirmedChecked || isSubmitting}
            onClick={() => onConfirm(order.id)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <ArrowsClockwise size={15} weight="bold" className="animate-spin" />
                <span>Menyelesaikan Pesanan...</span>
              </>
            ) : (
              <>
                <CheckCircle size={15} weight="bold" />
                <span>Ya, Pekerjaan Selesai &amp; Berfungsi Baik</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

