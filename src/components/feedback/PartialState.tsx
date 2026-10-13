import React from "react";
import { CheckCircle, Clock } from "@phosphor-icons/react";

interface PartialStateProps {
  completedCount: number;
  totalCount: number;
  title?: string;
  completedItems?: string[];
  pendingItems?: string[];
}

export function PartialState({
  completedCount,
  totalCount,
  title = "Penyelesaian Parsial (Sebagian)",
  completedItems = [],
  pendingItems = [],
}: PartialStateProps) {
  const percentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="glass-card rounded-2xl p-5 border border-sky-300/80 bg-sky/20 space-y-4 my-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-display font-bold text-neutral-dark">
            {title}
          </h4>
          <p className="text-xs text-neutral-slate">
            {completedCount} dari {totalCount} tahapan telah selesai ({percentage}%)
          </p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          Status Parsial
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Split lists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
        {completedItems.length > 0 && (
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <p className="font-semibold text-emerald-800 flex items-center gap-1.5 mb-2">
              <CheckCircle size={15} weight="fill" className="text-emerald-600" />
              Selesai ({completedItems.length})
            </p>
            <ul className="space-y-1 text-emerald-900/80 text-[11px]">
              {completedItems.map((item, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {pendingItems.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
            <p className="font-semibold text-amber-800 flex items-center gap-1.5 mb-2">
              <Clock size={15} weight="fill" className="text-amber-600" />
              Tertunda / Menunggu ({pendingItems.length})
            </p>
            <ul className="space-y-1 text-amber-900/80 text-[11px]">
              {pendingItems.map((item, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
