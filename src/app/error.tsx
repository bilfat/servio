"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/feedback/ErrorState";
import { House } from "@phosphor-icons/react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <ErrorState
        title="Terjadi Kesalahan Sistem"
        message="Terjadi kesalahan yang tidak terduga pada aplikasi SERVIO. Tim teknis kami telah menerima notifikasi insiden ini."
        onRetry={reset}
        action={
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-all"
          >
            <House size={14} />
            <span>Beranda</span>
          </Link>
        }
      />
    </div>
  );
}
