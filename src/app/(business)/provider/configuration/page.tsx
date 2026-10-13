"use client";

import React, { useState } from "react";
import {
  SlidersHorizontal,
  CheckCircle,
  CurrencyCircleDollar,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { Toast } from "@/components/feedback/Toast";

export default function ProviderConfigurationPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [authThreshold, setAuthThreshold] = useState(250000);
  const [autoDispatch, setAutoDispatch] = useState(false);
  const [requirePhotoProof, setRequirePhotoProof] = useState(true);
  const [maxActiveJobsPerWorker, setMaxActiveJobsPerWorker] = useState(3);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage("Kebijakan & konfigurasi layanan berhasil diperbarui.");
  };

  return (
    <div className="space-y-6 pb-20 font-body">
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
          Policy &amp; Rules
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
          Konfigurasi Layanan &amp; Otorisasi
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Atur batas ambang otorisasi biaya teknisi (C8 Price Adjustment threshold) dan SOP operasional.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5 text-xs">
        {/* C8 Price Adjustment Threshold Policy */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <CurrencyCircleDollar size={18} weight="fill" className="text-amber-700" />
            <span>Batas Ambang Otorisasi Biaya Tambahan (C8 Policy)</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Jika teknisi mengajukan biaya tambahan (jasa/material) melebihi batas ini, penyesuaian wajib disetujui (otorisasi) oleh Provider sebelum diteruskan ke pelanggan.
          </p>
          <div className="pt-1">
            <label className="block font-bold text-slate-800 mb-1">
              Nominal Ambang Otorisasi Wajib (Rp)
            </label>
            <input
              type="number"
              value={authThreshold}
              onChange={(e) => setAuthThreshold(Number(e.target.value))}
              step={50000}
              className="w-full sm:w-64 px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 bg-white"
            />
          </div>
        </div>

        {/* Operational SOP Rules */}
        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
            <input
              type="checkbox"
              checked={requirePhotoProof}
              onChange={(e) => setRequirePhotoProof(e.target.checked)}
              className="w-4 h-4 rounded text-[#0F4C81]"
            />
            <div>
              <p className="font-bold text-slate-800">Wajib Lampirkan Foto Sebelum &amp; Sesudah Servis</p>
              <p className="text-slate-500 text-[11px]">
                Teknisi tidak dapat menyelesaikan order tanpa mengunggah dokumen bukti visual sesuai SOP (C9).
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
            <input
              type="checkbox"
              checked={autoDispatch}
              onChange={(e) => setAutoDispatch(e.target.checked)}
              className="w-4 h-4 rounded text-[#0F4C81]"
            />
            <div>
              <p className="font-bold text-slate-800">Saran Otomatis Teknisi Terdekat</p>
              <p className="text-slate-500 text-[11px]">
                Sistem memberikan rekomendasi teknisi standby terdekat saat Provider membuka modal konfirmasi booking.
              </p>
            </div>
          </label>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs shadow-xs transition"
          >
            Simpan Konfigurasi
          </button>
        </div>
      </form>
    </div>
  );
}
