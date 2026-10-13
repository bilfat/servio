"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarCheck,
  ClockCountdown,
  Wrench,
  Pause,
  Play,
  BellRinging,
  Gear,
  CheckCircle,
} from "@phosphor-icons/react";
import { useMaintenancePlans } from "@/features/maintenance/useMaintenancePlans";
import { Toast } from "@/components/feedback/Toast";

export default function MaintenancePlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = (params?.planId as string) || "plan-ac-ruang-tamu";

  const { plans, snoozePlan, markServiced } = useMaintenancePlans();
  const plan = plans.find((p) => p.id === planId) || plans[0];

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [frequency, setFrequency] = useState(plan.frequencyMonths);
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  const handleSnooze = () => {
    snoozePlan(plan.id, 14);
    setToastMessage("Jadwal pemeliharaan ditunda 14 hari.");
  };

  const handleMarkDone = () => {
    markServiced(plan.id);
    setToastMessage("Status pemeliharaan diperbarui: Servis selesai dicatat!");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/maintenance"
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Aturan Rutinitas Perawatan
              </span>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">{plan.title}</h1>
            </div>
          </div>

          <Link
            href={`/bookings/new?serviceId=${plan.recommendedServiceId}&assetId=${plan.assetId}`}
            className="px-4 py-2 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition shadow-sm"
          >
            Panggil Teknisi
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Main Details Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <p className="text-xs text-slate-400">Target Unit Aset</p>
              <p className="text-base font-bold text-slate-900">{plan.assetName}</p>
              <p className="text-xs text-slate-500 mt-0.5">ID Rencana: {plan.id}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-slate-400">Jatuh Tempo Berikutnya</p>
              <p className="text-base font-bold text-[#0F4C81]">{plan.nextDueDate}</p>
              {plan.isSnoozed && (
                <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                  Ditunda sampai {plan.snoozeUntil}
                </p>
              )}
            </div>
          </div>

          {/* Configuration Parameters */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Gear size={20} weight="duotone" className="text-[#0F4C81]" />
              Pengaturan Interval & Pemicu Servis
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Frekuensi Rutinitas</p>
                  <p className="text-[11px] text-slate-400">Jarak waktu servis otomatis dijadwalkan ulang</p>
                </div>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none"
                >
                  <option value={1}>Setiap 1 Bulan</option>
                  <option value={3}>Setiap 3 Bulan (Rekomendasi AC)</option>
                  <option value={6}>Setiap 6 Bulan (Rekomendasi Oli/Toren)</option>
                  <option value={12}>Setiap 12 Bulan</option>
                </select>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Notifikasi Pengingat WhatsApp & Email</p>
                  <p className="text-[11px] text-slate-400">Pemberitahuan 7 hari sebelum tanggal jatuh tempo</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationEnabled}
                  onChange={(e) => setNotificationEnabled(e.target.checked)}
                  className="w-5 h-5 accent-[#0F4C81] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSnooze}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition w-full sm:w-auto"
              >
                Tunda (Snooze 14 Hari)
              </button>
              <button
                type="button"
                onClick={handleMarkDone}
                className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition w-full sm:w-auto"
              >
                Tandai Selesai Servis Mandiri
              </button>
            </div>

            <Link
              href={`/bookings/new?serviceId=${plan.recommendedServiceId}&assetId=${plan.assetId}`}
              className="px-6 py-2.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition shadow-sm w-full sm:w-auto text-center"
            >
              Order Servis Sekarang
            </Link>
          </div>
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
