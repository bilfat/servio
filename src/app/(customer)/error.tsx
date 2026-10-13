"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Receipt } from "@phosphor-icons/react";

export default function CustomerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Customer Portal Segment Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <ErrorState
        title="Gagal Memuat Portal Pelanggan"
        message="Tidak dapat menyinkronkan data pesanan atau inventaris Anda saat ini. Data Anda tetap aman di server."
        onRetry={reset}
        action={
          <Link
            href="/orders"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-all"
          >
            <Receipt size={14} />
            <span>Riwayat Pesanan</span>
          </Link>
        }
      />
    </div>
  );
}
