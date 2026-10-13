"use client";

import React, { useState } from "react";
import { CalendarBlank, Clock, CheckCircle } from "@phosphor-icons/react";

export interface TimeSlot {
  id: string;
  label: string;
  timeRange: string;
  available: boolean;
  remainingSlots?: number;
}

export interface SchedulePickerProps {
  selectedDate?: string;
  selectedSlotId?: string;
  onSelectSchedule: (date: string, slotId: string) => void;
  slots?: TimeSlot[];
  disabled?: boolean;
}

const DEFAULT_SLOTS: TimeSlot[] = [
  { id: "morning", label: "Pagi", timeRange: "08:00 – 12:00 WIB", available: true, remainingSlots: 4 },
  { id: "afternoon", label: "Siang", timeRange: "12:00 – 15:00 WIB", available: true, remainingSlots: 2 },
  { id: "evening", label: "Sore", timeRange: "15:00 – 18:00 WIB", available: true, remainingSlots: 1 },
  { id: "night", label: "Malam", timeRange: "18:00 – 21:00 WIB", available: false, remainingSlots: 0 },
];

export function SchedulePicker({
  selectedDate,
  selectedSlotId,
  onSelectSchedule,
  slots = DEFAULT_SLOTS,
  disabled = false,
}: SchedulePickerProps) {
  // Generate next 7 days for quick booking
  const dates = React.useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push({
        iso: d.toISOString().split("T")[0],
        dayName: d.toLocaleDateString("id-ID", { weekday: "short" }),
        dayNumber: d.getDate(),
        monthName: d.toLocaleDateString("id-ID", { month: "short" }),
        isToday: i === 0,
      });
    }
    return list;
  }, []);

  const [activeDate, setActiveDate] = useState<string>(selectedDate || dates[0].iso);
  const [activeSlot, setActiveSlot] = useState<string | undefined>(selectedSlotId);

  const handleDateChange = (iso: string) => {
    setActiveDate(iso);
    if (activeSlot) {
      onSelectSchedule(iso, activeSlot);
    }
  };

  const handleSlotChange = (slotId: string) => {
    setActiveSlot(slotId);
    onSelectSchedule(activeDate, slotId);
  };

  return (
    <div className="space-y-4 font-body text-left">
      {/* Date Carousel Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-neutral-dark font-display flex items-center gap-1.5">
            <CalendarBlank size={16} className="text-primary" weight="bold" />
            Pilih Tanggal Kedatangan Teknisi
          </label>
          <span className="text-[11px] text-neutral-slate">Tersedia 7 hari ke depan</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {dates.map((item) => {
            const isSelected = activeDate === item.iso;
            return (
              <button
                key={item.iso}
                type="button"
                disabled={disabled}
                onClick={() => handleDateChange(item.iso)}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all min-h-[56px] ${
                  isSelected
                    ? "bg-primary text-white border-primary shadow-servio-xs font-bold scale-[1.02]"
                    : "bg-white text-neutral-dark border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`text-[10px] uppercase tracking-wider ${
                    isSelected ? "text-sky" : "text-neutral-slate"
                  }`}
                >
                  {item.isToday ? "Hari ini" : item.dayName}
                </span>
                <span className="text-base font-bold font-display mt-0.5 leading-none">
                  {item.dayNumber}
                </span>
                <span
                  className={`text-[9px] mt-0.5 ${
                    isSelected ? "text-white/80" : "text-neutral-muted"
                  }`}
                >
                  {item.monthName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots Grid */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-neutral-dark font-display flex items-center gap-1.5">
          <Clock size={16} className="text-secondary" weight="bold" />
          Pilih Slot Waktu Operasional
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {slots.map((slot) => {
            const isSelected = activeSlot === slot.id;
            const isUnavailable = !slot.available || disabled;

            return (
              <button
                key={slot.id}
                type="button"
                disabled={isUnavailable}
                onClick={() => handleSlotChange(slot.id)}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-sky/40 border-primary shadow-servio-xs"
                    : isUnavailable
                    ? "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-display text-neutral-dark">
                      {slot.label}
                    </span>
                    {slot.remainingSlots !== undefined && slot.available && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                        Sisa {slot.remainingSlots} teknisi
                      </span>
                    )}
                    {!slot.available && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-neutral-slate font-medium">
                        Penuh
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-slate mt-0.5 font-mono">
                    {slot.timeRange}
                  </p>
                </div>

                {isSelected && (
                  <CheckCircle size={20} weight="fill" className="text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
