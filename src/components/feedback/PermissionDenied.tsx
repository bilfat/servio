import React from "react";
import Link from "next/link";
import { LockKey, ArrowLeft } from "@phosphor-icons/react";

interface PermissionDeniedProps {
  requiredRole?: string;
  requiredPermission?: string;
  message?: string;
  action?: React.ReactNode;
}

export function PermissionDenied({
  requiredRole,
  requiredPermission,
  message = "Anda tidak memiliki hak akses yang memadai untuk membuka halaman atau fitur ini.",
  action,
}: PermissionDeniedProps) {
  return (
    <div className="glass-card rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto flex flex-col items-center justify-center space-y-4 border border-amber-200 bg-amber-50/15 my-8">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
        <LockKey size={34} weight="duotone" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xl font-display font-extrabold text-neutral-dark">
          Akses Ditolak (403 Forbidden)
        </h2>
        <p className="text-xs text-neutral-slate max-w-md leading-relaxed">
          {message}
        </p>

        {(requiredRole || requiredPermission) && (
          <div className="mt-3 p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-neutral-slate text-left space-y-1 max-w-xs mx-auto">
            {requiredRole && (
              <p>
                <strong>Peran yang dibutuhkan:</strong> {requiredRole}
              </p>
            )}
            {requiredPermission && (
              <p>
                <strong>Wewenang:</strong> {requiredPermission}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
        {action}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-neutral-dark text-xs font-semibold hover:bg-slate-200 transition-all shadow-servio-xs"
        >
          <ArrowLeft size={14} weight="bold" />
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

