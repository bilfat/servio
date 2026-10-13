"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  ArrowRight,
  CheckCircle,
  Wrench,
  NavigationArrow,
} from "@phosphor-icons/react";
import { useWorkerOperations } from "@/features/worker/useWorkerOperations";

export default function WorkerSchedulePage() {
  const { jobs } = useWorkerOperations();
  const [selectedDay, setSelectedDay] = useState<"TODAY" | "TOMORROW" | "ALL">("TODAY");

  const todayJobs = jobs.slice(0, 8);
  const tomorrowJobs = jobs.slice(8, 12);

  const displayedJobs =
    selectedDay === "TODAY"
      ? todayJobs
      : selectedDay === "TOMORROW"
      ? tomorrowJobs
      : jobs;

  return (
    <div className="space-y-5 pb-24 max-w-2xl mx-auto font-body text-left">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
            Operasional Teknisi
          </span>
          <span className="text-[11px] font-medium text-slate-500">
            Agenda Lapangan
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 tracking-tight">
          Jadwal Penugasan
        </h1>
        <p className="text-xs text-slate-500">
          Susunan rute dan jadwal kedatangan servis teknisi lapangan.
        </p>

        {/* Day selector tabs */}
        <div className="flex items-center gap-2 pt-2">
          {[
            { id: "TODAY" as const, label: "Hari Ini", count: todayJobs.length },
            { id: "TOMORROW" as const, label: "Besok", count: tomorrowJobs.length },
            { id: "ALL" as const, label: "Semua Terjadwal", count: jobs.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedDay(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                selectedDay === tab.id
                  ? "bg-[#0F4C81] text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedDay === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Schedule timeline list */}
      <div className="space-y-3">
        {displayedJobs.map((job, idx) => (
          <div
            key={job.id}
            className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:shadow-md transition"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0F4C81] border border-sky-100 flex flex-col items-center justify-center font-mono shrink-0">
                <span className="text-[10px] font-bold">SLOT</span>
                <span className="text-xs font-black">#{idx + 1}</span>
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    #{job.orderId}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Clock size={13} className="text-slate-400" />
                    {job.scheduledTime}
                  </span>
                </div>

                <h2 className="text-sm font-bold text-slate-900 truncate">
                  {job.serviceTitle}
                </h2>

                <p className="text-slate-500 text-[11px] flex items-center gap-1 truncate">
                  <MapPin size={13} className="text-rose-500 shrink-0" />
                  <span>{job.customerAddress} ({job.distanceKm} km)</span>
                </p>
              </div>
            </div>

            <Link
              href={`/worker/jobs/${job.id}`}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs shrink-0"
            >
              <span>Buka Lembar Kerja</span>
              <ArrowRight size={13} weight="bold" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
