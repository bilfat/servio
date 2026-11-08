"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, WarningCircle } from "@phosphor-icons/react";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { WarrantyDetailTwoGrid } from "@/components/features/afterSales/WarrantyDetailTwoGrid";
import { AfterSalesCaseDetail } from "@/components/features/afterSales/AfterSalesCaseDetail";

function WarrantyDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = (params?.warrantyId as string) || "";

  const { getCaseById, getWarrantyById, warranties, cases } = useAfterSales();

  // 1. Check if targetId is an after-sales case ID directly
  const matchedCase = getCaseById(targetId);
  if (matchedCase) {
    // Attempt to find its parent warranty entitlement
    const parentWarranty = warranties.find(
      (w) =>
        w.id === matchedCase.warrantyId ||
        w.orderId === matchedCase.sourceOrderId ||
        (w.cases && w.cases.some((wc: any) => wc.id === matchedCase.id))
    );

    if (parentWarranty) {
      return (
        <WarrantyDetailTwoGrid
          warranty={parentWarranty}
          initialCaseId={matchedCase.id}
          backHref="/warranties?tab=submissions"
        />
      );
    }

    // Standalone case fallback (e.g., pure return without warranty entitlement)
    return (
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AfterSalesCaseDetail
          caseData={matchedCase}
          onBack={() => router.push("/warranties?tab=submissions")}
        />
      </div>
    );
  }

  // 2. Check if targetId is a warranty entitlement ID or order ID
  const matchedWarranty =
    getWarrantyById(targetId) ||
    warranties.find((w) => w.orderId === targetId || w.id === targetId);

  if (matchedWarranty) {
    const caseIdParam = searchParams.get("caseId");
    return (
      <WarrantyDetailTwoGrid
        warranty={matchedWarranty}
        initialCaseId={caseIdParam}
        backHref="/warranties?tab=active"
      />
    );
  }

  // 3. Fallback: Not Found
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
        <WarningCircle size={26} weight="fill" />
      </div>
      <h2 className="text-xl font-bold font-display text-slate-800">
        Garansi / Pengajuan Tidak Ditemukan
      </h2>
      <p className="text-xs text-slate-500 max-w-md mx-auto">
        Nomor referensi &quot;{targetId}&quot; tidak ditemukan dalam data aktif akun Anda.
      </p>
      <Link
        href="/warranties"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl"
      >
        <ArrowLeft size={16} weight="bold" />
        Kembali ke Garansi & Pengajuan
      </Link>
    </div>
  );
}

export default function CustomerWarrantyDetailPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Memuat rincian garansi...</div>}>
      <WarrantyDetailInner />
    </Suspense>
  );
}
