"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  ClockCountdown,
  Bell,
  Wrench,
  Pause,
  Play,
  ArrowRight,
  Sparkle,
  WarningCircle,
  Plus,
} from "@phosphor-icons/react";
import { useMaintenancePlans } from "@/features/maintenance/useMaintenancePlans";
import { Toast } from "@/components/feedback/Toast";

export default function MaintenanceDashboardPage() {
  const { plans, snoozePlan, markServiced, overduePlansCount } = useMaintenancePlans();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSnooze = (planId: string) => {
    snoozePlan(planId, 7);
    setToastMessage("Jadwal pemeliharaan berhasil ditunda (snooze) 7 hari.");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  Pemeliharaan Berkala
                </span>
                {overduePlansCount > 0 && (
                  <span className="text-xs font-bold bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200">
                    {overduePlansCount} Jatuh Tempo
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">
                Kalender & Rencana Perawatan Rutin
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Otomatisasi pengingat servis unit agar performa mesin awet dan hemat energi.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Overdue Notice Banner if any */}
        {overduePlansCount > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 flex items-start sm:items-center justify-between gap-4 text-rose-900 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 rounded-2xl text-rose-700 shrink-0">
                <WarningCircle size={24} weight="fill" />
              </div>
              <div>
                <p className="text-sm font-bold">Ada Unit Aset yang Melewati Batas Perawatan</p>
                <p className="text-xs text-rose-700 mt-0.5">
                  Lakukan pembersihan atau ganti oli agar tidak terjadi kerusakan komponen yang lebih fatal.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isOverdue = plan.isOverdue && !plan.isSnoozed;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-3xl p-6 shadow-sm border flex flex-col justify-between transition-all ${
                  isOverdue
                    ? "border-rose-300 ring-2 ring-rose-100"
                    : "border-slate-200/80 hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isOverdue
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : plan.isSnoozed
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {isOverdue
                        ? "Jatuh Tempo!"
                        : plan.isSnoozed
                        ? "Ditunda (Snoozed)"
                        : "Terkontrol Baik"}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Tiap {plan.frequencyMonths} Bln
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {plan.title}
                  </h3>
                  <p className="text-xs text-[#0F4C81] font-semibold mt-1">
                    {plan.assetName}
                  </p>

                  <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <CalendarCheck size={16} />
                        Jatuh Tempo:
                      </span>
                      <span className="font-bold text-slate-900">{plan.nextDueDate}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <ClockCountdown size={16} />
                        Servis Terakhir:
                      </span>
                      <span className="font-semibold text-slate-700">
                        {plan.lastServiceDate || "Belum ada"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                  <Link
                    href={`/bookings/new?serviceId=${plan.recommendedServiceId}&assetId=${plan.assetId}`}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <Wrench size={16} weight="bold" />
                    Panggil Teknisi Sekarang
                  </Link>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSnooze(plan.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                    >
                      Tunda 7 Hari (Snooze)
                    </button>

                    <Link
                      href={`/maintenance/${plan.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#0F4C81] hover:underline"
                    >
                      Detail &rarr;
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
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
