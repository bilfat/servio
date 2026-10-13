"use client";

import React, { useState } from "react";
import {
  CalendarCheck,
  ClockCountdown,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { Toast } from "@/components/feedback/Toast";

export default function ProviderBookingSettingsPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [slaHours, setSlaHours] = useState(2);
  const [leadTimeHours, setLeadTimeHours] = useState(3);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(14);
  const [allowInstant, setAllowInstant] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage("Pengaturan booking & SLA berhasil disimpan.");
  };

  return (
    <div className="space-y-6 pb-20 font-body">
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
          SLA &amp; Booking
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
          Pengaturan Reservasi &amp; Booking
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Tentukan SLA waktu respons bengkel, batas waktu penugasan teknisi, dan jadwal pemesanan maju.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <label className="font-bold text-slate-800 block">
              SLA Respons Booking (Jam)
            </label>
            <input
              type="number"
              value={slaHours}
              onChange={(e) => setSlaHours(Number(e.target.value))}
              min={1}
              max={12}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 bg-white"
            />
            <p className="text-[11px] text-slate-400">
              Batas waktu sebelum permintaan booking kadaluarsa otomatis.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <label className="font-bold text-slate-800 block">
              Minimum Lead Time Booking (Jam)
            </label>
            <input
              type="number"
              value={leadTimeHours}
              onChange={(e) => setLeadTimeHours(Number(e.target.value))}
              min={1}
              max={24}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 bg-white"
            />
            <p className="text-[11px] text-slate-400">
              Waktu minimum persiapan teknisi sebelum jam servis dimulai.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
          <label className="font-bold text-slate-800 block">
            Maksimum Pemesanan Maju (Hari)
          </label>
          <input
            type="number"
            value={maxAdvanceDays}
            onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
            min={3}
            max={60}
            className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 bg-white"
          />
          <p className="text-[11px] text-slate-400">
            Pelanggan dapat menjadwalkan servis hingga {maxAdvanceDays} hari ke depan.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs shadow-xs transition"
          >
            Simpan Pengaturan Booking
          </button>
        </div>
      </form>
    </div>
  );
}
