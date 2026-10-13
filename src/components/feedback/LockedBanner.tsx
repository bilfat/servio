import React from "react";
import { Lock } from "@phosphor-icons/react";

interface LockedBannerProps {
  reason: string;
  conditionDescription?: string;
  action?: React.ReactNode;
}

export function LockedBanner({
  reason,
  conditionDescription,
  action,
}: LockedBannerProps) {
  return (
    <div className="rounded-2xl p-4 bg-slate-100 border border-slate-300/80 text-neutral-dark flex items-start gap-3 text-xs my-4 shadow-servio-xs">
      <div className="p-2 rounded-xl bg-slate-200 text-neutral-slate shrink-0 mt-0.5">
        <Lock size={18} weight="bold" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-neutral-dark font-display">
            Aksi Terkunci: {reason}
          </span>
          <span className="text-[10px] font-semibold bg-slate-200 text-neutral-slate px-2 py-0.5 rounded-full">
            Locked State
          </span>
        </div>
        {conditionDescription && (
          <p className="text-neutral-slate text-[11px] leading-relaxed">
            {conditionDescription}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
