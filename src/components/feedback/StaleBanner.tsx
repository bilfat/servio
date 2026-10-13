import React from "react";
import { ClockCounterClockwise, ArrowClockwise } from "@phosphor-icons/react";

export function StaleBanner({
  lastUpdated,
  onRefresh,
}: {
  lastUpdated?: string;
  onRefresh?: () => void;
}) {
  return (
    <div className="rounded-xl p-3 bg-sky/60 border border-sky-300/60 text-primary flex items-center justify-between gap-3 text-xs my-3">
      <div className="flex items-center gap-2">
        <ClockCounterClockwise size={18} weight="duotone" className="shrink-0 text-primary" />
        <span>
          Data ini mungkin telah diperbarui {lastUpdated ? `(pembaruan terakhir ${lastUpdated})` : ""}.
        </span>
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-white font-semibold text-[11px] hover:bg-primary-dark transition-all shrink-0"
        >
          <ArrowClockwise size={13} weight="bold" />
          Perbarui
        </button>
      )}
    </div>
  );
}
