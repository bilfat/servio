"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  Package,
  Wrench,
  Clock,
  WarningCircle,
  CheckCircle,
  FileText,
  CalendarCheck,
  User,
  ArrowRight,
} from "@phosphor-icons/react";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { AfterSalesCaseDetail } from "@/components/features/afterSales/AfterSalesCaseDetail";
import { WarrantyClaimModal } from "@/components/features/afterSales/WarrantyClaimModal";

function WarrantyDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = (params?.warrantyId as string) || "";

  const { getCaseById, getWarrantyById, warranties, cases } = useAfterSales();

  // Check if targetId is an after-sales case
  const matchedCase = getCaseById(targetId);
  if (matchedCase) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <AfterSalesCaseDetail
          caseData={matchedCase}
          onBack={() => router.push("/warranties?tab=submissions")}
        />
      </div>
    );
  }

  // Check if targetId is a warranty entitlement
  const matchedWarranty = getWarrantyById(targetId) || warranties.find((w) => w.orderId === targetId);

  const [isClaimModalOpen, setIsClaimModalOpen] = useState(searchParams.get("claim") === "true");

  if (!matchedWarranty) {
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

  const isProduct = matchedWarranty.itemType === "PRODUCT";
  const orderHref = isProduct
    ? `/orders/products/${matchedWarranty.orderId}`
    : `/orders/${matchedWarranty.orderId}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Demo Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-amber-500/10 border border-amber-300 rounded-2xl text-[11px] text-amber-800 font-medium">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[10px] font-bold uppercase tracking-wider">
            DEMO ONLY
          </span>
          <span>DATA SIMULASI — BELUM TERHUBUNG SISTEM AFTER-SALES OPERASIONAL</span>
        </div>
      </div>

      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/warranties?tab=active"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-primary transition"
        >
          <ArrowLeft size={16} weight="bold" />
          Kembali ke Garansi Aktif
        </Link>

        <Link
          href={orderHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 bg-sky/30 px-3.5 py-1.5 rounded-xl border border-primary/20 transition"
        >
          <FileText size={15} weight="bold" />
          Lihat Pesanan Asli ({matchedWarranty.orderNumber})
        </Link>
      </div>

      {/* Detail Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
                  isProduct
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-purple-50 text-purple-700 border-purple-200"
                }`}
              >
                {isProduct ? <Package size={14} weight="bold" /> : <Wrench size={14} weight="bold" />}
                {isProduct ? "Garansi Toko Barang" : "Garansi Layanan Jasa"}
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                #{matchedWarranty.warrantyNumber}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 mt-2">
              {matchedWarranty.itemTitle}
            </h1>
            <p className="text-xs text-slate-500">
              Penyedia: <strong className="text-slate-700">{matchedWarranty.organizationName}</strong>
            </p>
          </div>

          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
              matchedWarranty.isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {matchedWarranty.isActive ? "Garansi Aktif" : "Garansi Berakhir"}
          </span>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Nama Opsi Garansi:</span>
            <strong className="text-slate-800">{matchedWarranty.presetName}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Durasi Masa Berlaku:</span>
            <strong className="text-primary">{matchedWarranty.durationDays} Hari Kalender</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Periode Perlindungan:</span>
            <strong className="text-emerald-800">
              {matchedWarranty.startDate} s.d. {matchedWarranty.endDate}
            </strong>
          </div>
        </div>

        {/* Coverage & Exclusions */}
        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Cakupan yang Ditanggung
            </h3>
            <p className="p-4 bg-slate-50 rounded-2xl text-slate-700 leading-relaxed border border-slate-100">
              {matchedWarranty.coverage}
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Syarat & Ketentuan Berlaku
            </h3>
            <p className="p-4 bg-slate-50 rounded-2xl text-slate-600 leading-relaxed border border-slate-100">
              {matchedWarranty.terms}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {matchedWarranty.isActive
              ? "Batas waktu respons pelaku usaha adalah 3 x 24 jam kalender."
              : "Masa garansi usaha telah habis. Hak perlindungan hukum konsumen tetap berlaku."}
          </span>

          {matchedWarranty.isActive ? (
            <button
              type="button"
              onClick={() => setIsClaimModalOpen(true)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck size={16} weight="bold" />
              Ajukan Klaim Sekarang
            </button>
          ) : (
            <span className="text-xs font-semibold text-slate-400">Tidak dapat mengajukan klaim baru</span>
          )}
        </div>
      </div>

      {/* Claim Modal */}
      {isClaimModalOpen && (
        <WarrantyClaimModal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          warranty={matchedWarranty}
          onSuccess={(caseId) => {
            router.push(`/warranties?tab=submissions&caseId=${caseId}`);
          }}
        />
      )}
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
