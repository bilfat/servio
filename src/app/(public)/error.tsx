"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Compass } from "@phosphor-icons/react";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Public Route Segment Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <ErrorState
        title="Gagal Memuat Halaman Katalog"
        message="Terjadi gangguan saat memuat konten katalog layanan atau produk. Silakan muat ulang atau jelajahi kategori lain."
        onRetry={reset}
        action={
          <Link
            href="/services"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-all"
          >
            <Compass size={14} />
            <span>Katalog Layanan</span>
          </Link>
        }
      />
    </div>
  );
}
