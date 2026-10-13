import React from "react";
import { CloudSlash, Clock } from "@phosphor-icons/react";

export function OfflineBanner({ lastSynced }: { lastSynced?: string }) {
  return (
    <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/30 text-amber-900 flex items-center justify-between gap-3 text-xs my-3">
      <div className="flex items-center gap-2.5">
        <CloudSlash size={18} weight="bold" className="text-amber-600 shrink-0" />
        <div>
          <span className="font-semibold">Mode Offline Aktif:</span> Menampilkan salinan data terakhir yang tersimpan di perangkat.
        </div>
      </div>
      {lastSynced && (
        <span className="flex items-center gap-1 text-[11px] text-amber-700/80 shrink-0">
          <Clock size={14} /> Terakhir sinkron: {lastSynced}
        </span>
      )}
    </div>
  );
}
