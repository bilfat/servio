"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle,
  CalendarBlank,
  FloppyDisk,
} from "@phosphor-icons/react";
import { Toast } from "@/components/feedback/Toast";
import { useActiveRole } from "@/context/RoleContext";
import { organizationApi } from "@/lib/servioApi";

interface DayHour {
  dayCode: string;
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const DEFAULT_DAYS: DayHour[] = [
  { dayCode: "MONDAY", day: "Senin", isOpen: true, openTime: "08:00", closeTime: "18:00" },
  { dayCode: "TUESDAY", day: "Selasa", isOpen: true, openTime: "08:00", closeTime: "18:00" },
  { dayCode: "WEDNESDAY", day: "Rabu", isOpen: true, openTime: "08:00", closeTime: "18:00" },
  { dayCode: "THURSDAY", day: "Kamis", isOpen: true, openTime: "08:00", closeTime: "18:00" },
  { dayCode: "FRIDAY", day: "Jumat", isOpen: true, openTime: "08:00", closeTime: "18:00" },
  { dayCode: "SATURDAY", day: "Sabtu", isOpen: true, openTime: "08:00", closeTime: "16:00" },
  { dayCode: "SUNDAY", day: "Minggu", isOpen: false, openTime: "09:00", closeTime: "15:00" },
];

export default function ProviderHoursPage() {
  const { user } = useActiveRole();
  const orgId = user.activeOrganization?.id || user.organizationId;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<DayHour[]>(DEFAULT_DAYS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!orgId) return;
    const loadSchedule = async () => {
      setIsLoading(true);
      try {
        const res = await organizationApi.getSchedule(orgId);
        if (res.data?.weeklyHours && res.data.weeklyHours.length > 0) {
          const apiHours = res.data.weeklyHours;
          setSchedule((prev) =>
            prev.map((day) => {
              const matched = apiHours.find((h: any) => h.day?.toUpperCase() === day.dayCode);
              if (matched) {
                const firstWindow = matched.windows?.[0];
                return {
                  ...day,
                  isOpen: matched.isOpen,
                  openTime: firstWindow?.start || day.openTime,
                  closeTime: firstWindow?.end || day.closeTime,
                };
              }
              return day;
            })
          );
        }
      } catch {
        // Fallback default
      } finally {
        setIsLoading(false);
      }
    };
    loadSchedule();
  }, [orgId]);

  const handleToggle = (idx: number) => {
    const updated = [...schedule];
    updated[idx].isOpen = !updated[idx].isOpen;
    setSchedule(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      setToastMessage("Organisasi tidak teridentifikasi.");
      return;
    }
    setIsSaving(true);
    try {
      const weeklyHours = schedule.map((item) => ({
        day: item.dayCode,
        isOpen: item.isOpen,
        windows: item.isOpen ? [{ start: item.openTime, end: item.closeTime }] : [],
      }));
      await organizationApi.updateSchedule(orgId, {
        timezone: "Asia/Jakarta",
        weeklyHours,
      });
      setToastMessage("Jam operasional bengkel berhasil disimpan ke server!");
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal menyimpan jadwal operasional.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 font-body">
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
          Waktu Kerja
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
          Jam Operasional &amp; Hari Kerja
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Atur jam penerimaan booking dan ketersediaan teknisi untuk panggilan ke rumah pelanggan.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4 text-xs">
        <div className="divide-y divide-slate-100">
          {schedule.map((item, idx) => (
            <div key={item.day} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={item.isOpen}
                  onChange={() => handleToggle(idx)}
                  className="w-4 h-4 rounded text-[#0F4C81]"
                />
                <span className={`font-bold text-sm ${item.isOpen ? "text-slate-900" : "text-slate-400"}`}>
                  {item.day}
                </span>
                {!item.isOpen && (
                  <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-200">
                    Tutup / Libur
                  </span>
                )}
              </div>

              {item.isOpen && (
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="time"
                    value={item.openTime}
                    onChange={(e) => {
                      const updated = [...schedule];
                      updated[idx].openTime = e.target.value;
                      setSchedule(updated);
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 font-semibold"
                  />
                  <span className="text-slate-400">s/d</span>
                  <input
                    type="time"
                    value={item.closeTime}
                    onChange={(e) => {
                      const updated = [...schedule];
                      updated[idx].closeTime = e.target.value;
                      setSchedule(updated);
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 font-semibold"
                  />
                  <span className="text-slate-400 text-[10px]">WIB</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-slate-500 text-[11px]">
            {isLoading ? "Memuat jadwal..." : "Zona Waktu: Asia/Jakarta (WIB)"}
          </span>
          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="px-5 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-2"
          >
            <FloppyDisk size={16} weight="bold" />
            <span>{isSaving ? "Menyimpan..." : "Simpan Jadwal Operasional"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
