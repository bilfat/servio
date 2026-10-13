"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/feedback/ErrorState";
import { ChartLineUp } from "@phosphor-icons/react";

export default function BusinessError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Business Portal Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <ErrorState
        title="Gagal Memuat Workspace Mitra"
        message="Terjadi gangguan saat memuat data operasional bengkel Anda. Data inventaris dan transaksi Anda tersimpan aman di server."
        onRetry={reset}
        action={
          <Link
            href="/provider/dashboard"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-all"
          >
            <ChartLineUp size={14} />
            <span>Dashboard Mitra</span>
          </Link>
        }
      />
    </div>
  );
}
