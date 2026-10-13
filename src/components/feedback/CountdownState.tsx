"use client";

import React, { useState, useEffect } from "react";
import { Timer, ArrowCounterClockwise, WarningOctagon } from "@phosphor-icons/react";

interface CountdownStateProps {
  initialSeconds: number;
  label?: string;
  onExpire?: () => void;
  onRenew?: () => void;
  renewLabel?: string;
}

export function CountdownState({
  initialSeconds,
  label = "Batas Waktu Pembayaran",
  onExpire,
  onRenew,
  renewLabel = "Buat Ulang Pesanan",
}: CountdownStateProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const isExpired = secondsRemaining <= 0;

  useEffect(() => {
    if (secondsRemaining <= 0) {
      onExpire?.();
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, onExpire]);

  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (isExpired) {
    return (
      <div className="rounded-2xl p-5 bg-rose-50 border border-rose-200 text-neutral-dark space-y-3 text-center my-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <WarningOctagon size={28} weight="fill" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-display font-bold text-neutral-dark">
            Waktu Transaksi Telah Kedaluwarsa (Expired)
          </h4>
          <p className="text-xs text-neutral-slate max-w-sm mx-auto">
            Batas waktu penyelesaian telah berakhir. Slot dan reservasi sistem telah dilepas secara otomatis.
          </p>
        </div>
        {onRenew && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onRenew}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all shadow-servio-xs"
            >
              <ArrowCounterClockwise size={14} weight="bold" />
              {renewLabel}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 my-4">
      <div className="flex items-center gap-2.5">
        <Timer size={22} weight="duotone" className="text-amber-600 shrink-0" />
        <div>
          <p className="text-[11px] uppercase font-bold text-amber-900 tracking-wider">
            {label}
          </p>
          <p className="text-xs text-amber-950/80">
            Selesaikan transaksi sebelum waktu habis agar pesanan tidak dibatalkan.
          </p>
        </div>
      </div>

      <div className="px-3.5 py-1.5 rounded-xl bg-white/90 border border-amber-300 font-mono text-base font-bold text-amber-700 shadow-sm shrink-0">
        {formatTime(secondsRemaining)}
      </div>
    </div>
  );
}
