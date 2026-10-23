"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowsClockwise, ArrowRight } from "@phosphor-icons/react";

export default function CustomerReturnsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Seamlessly redirect to the consolidated Garansi & Pengajuan page
    router.replace("/warranties?tab=submissions&type=return_product");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <ArrowsClockwise size={24} weight="bold" className="animate-spin" />
        </div>
        <h2 className="text-lg font-bold font-display text-slate-900">
          Mengalihkan ke Garansi & Pengajuan...
        </h2>
        <p className="text-xs text-slate-500">
          Sesuai pembaruan sistem purnajual SERVIO V2.1, seluruh pengajuan retur barang dan klaim garansi kini disatukan dalam tab <strong>Pengajuan</strong>.
        </p>
        <Link
          href="/warranties?tab=submissions&type=return_product"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm"
        >
          Buka Tab Pengajuan
          <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
    </div>
  );
}
