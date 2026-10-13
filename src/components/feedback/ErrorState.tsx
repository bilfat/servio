import React from "react";
import { WarningCircle, ArrowClockwise } from "@phosphor-icons/react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: React.ReactNode;
}

export function ErrorState({
  title = "Terjadi Kendala Memuat Data",
  message = "Sistem kami mengalami kendala teknis saat memproses permintaan ini. Silakan coba beberapa saat lagi.",
  onRetry,
  action,
}: ErrorStateProps) {
  return (
    <div className="glass-card rounded-2xl p-8 sm:p-10 text-center max-w-lg mx-auto flex flex-col items-center justify-center space-y-4 border border-rose-200 bg-rose-50/20 my-6">
      <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
        <WarningCircle size={32} weight="duotone" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-display font-bold text-neutral-dark">
          {title}
        </h3>
        <p className="text-xs text-neutral-slate max-w-sm leading-relaxed">
          {message}
        </p>
      </div>

      <div className="pt-2 flex items-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all shadow-servio-xs active:scale-95"
          >
            <ArrowClockwise size={14} weight="bold" />
            Coba Lagi
          </button>
        )}
        {action}
      </div>
    </div>
  );
}
