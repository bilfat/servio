import React from "react";
import { CheckCircle, ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";

interface SuccessFeedbackProps {
  title: string;
  message: string;
  nextRoute?: { label: string; href: string };
  onDismiss?: () => void;
}

export function SuccessFeedback({
  title,
  message,
  nextRoute,
  onDismiss,
}: SuccessFeedbackProps) {
  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8 text-center max-w-md mx-auto space-y-4 border border-emerald-300 bg-emerald-50/25 my-6">
      <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
        <CheckCircle size={32} weight="fill" />
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-display font-bold text-neutral-dark">
          {title}
        </h3>
        <p className="text-xs text-neutral-slate leading-relaxed">
          {message}
        </p>
      </div>

      <div className="pt-2 flex items-center justify-center gap-3">
        {nextRoute && (
          <Link
            href={nextRoute.href}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all shadow-servio-xs"
          >
            {nextRoute.label}
            <ArrowRight size={14} weight="bold" />
          </Link>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="px-3.5 py-2 rounded-xl bg-slate-100 text-neutral-slate text-xs font-semibold hover:bg-slate-200 transition-colors"
          >
            Tutup
          </button>
        )}
      </div>
    </div>
  );
}
