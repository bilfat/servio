"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Package,
  Wrench,
  Clock,
  ClockCounterClockwise,
  WarningCircle,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
  ArrowRight,
  MagnifyingGlass,
  FileText,
  Info,
  Truck,
  MapPin,
  Bank,
  Check,
  X,
  ChatCircleDots,
  ArrowSquareOut,
  Sparkle,
  LockKey,
} from "@phosphor-icons/react";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { CustomerWarrantyEntitlement, AfterSalesCase } from "@/types/afterSales";
import { ClaimProgressTimeline } from "@/components/features/afterSales/ClaimProgressTimeline";
import { WarrantyClaimModal } from "@/components/features/afterSales/WarrantyClaimModal";
import { WarrantyDetailTwoGrid } from "@/components/features/afterSales/WarrantyDetailTwoGrid";
import { AfterSalesCaseDetail } from "@/components/features/afterSales/AfterSalesCaseDetail";

type MainTab = "active" | "submissions" | "history";
type ItemTypeFilter = "ALL" | "PRODUCT" | "SERVICE";

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function CustomerWarrantiesAndSubmissionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const initialTab: MainTab = rawTab === "submissions" ? "submissions" : rawTab === "history" || rawTab === "expired" ? "history" : "active";
  const initialCaseId = searchParams.get("caseId") || null;
  const initialType = (searchParams.get("type") as ItemTypeFilter) || "ALL";

  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(initialCaseId);

  // Filters for Tab 1 (Active Warranties)
  const [warrantyFilter, setWarrantyFilter] = useState<ItemTypeFilter>("ALL");
  const [warrantySearch, setWarrantySearch] = useState("");

  // Filters for Tab 2 & Tab 3 (Category: Semua | Barang | Jasa)
  const [submissionFilter, setSubmissionFilter] = useState<ItemTypeFilter>("ALL");
  const [submissionSearch, setSubmissionSearch] = useState("");

  // Sub-filter for Tab 3 (Riwayat: Semua | Selesai Diklaim | Kedaluwarsa Alami)
  const [historyTypeFilter, setHistoryTypeFilter] = useState<"ALL" | "CLAIMED" | "EXPIRED">("ALL");

  // Interactive Modals State
  const [claimModalWarranty, setClaimModalWarranty] = useState<CustomerWarrantyEntitlement | null>(null);
  const [viewingWarranty, setViewingWarranty] = useState<CustomerWarrantyEntitlement | null>(null);
  const [viewingCase, setViewingCase] = useState<AfterSalesCase | null>(null);

  // Additional Evidence Submission in Modal 2
  const [additionalEvidenceText, setAdditionalEvidenceText] = useState("");
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    warranties,
    cases,
    getCaseById,
    customerAcceptAlternativeProposal,
    customerRejectAlternativeProposal,
    customerReportIssue,
    customerAddEvidence,
    customerConfirmCompletion,
    merchantCompleteCase,
    refreshData,
  } = useAfterSales();

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "active" || tabParam === "submissions" || tabParam === "history") {
      setActiveTab(tabParam);
    } else if (tabParam === "expired") {
      setActiveTab("history");
    }
    const cId = searchParams.get("caseId");
    if (cId) {
      const matched = getCaseById(cId);
      if (matched) {
        setViewingCase(matched);
      }
    }
  }, [searchParams, getCaseById]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Tab 1: Active Warranties (Hanya transaksi yang belum pernah diajukan klaim dan masa garansi masih aktif)
  const activeWarranties = useMemo(() => {
    return warranties.filter((w) => {
      const isEligible = w.isClaimEligible !== false;
      const hasRemaining = w.remainingQuantity === undefined || w.remainingQuantity > 0;
      const notConsumed = w.status === "ACTIVE";

      // Aturan sistem SERVIO: Garansi hanya 1x per transaksi.
      // Jika pesanan/garansi ini sudah pernah diajukan klaim (baik sedang berjalan atau sudah selesai),
      // maka garansi transaksi tersebut tidak lagi berada di tab Garansi Aktif.
      const hasCaseHistory = cases.some(
        (c) =>
          (c.warrantyId && c.warrantyId === w.id) ||
          (c.sourceOrderId && c.sourceOrderId === w.orderId) ||
          (c.sourceOrderNumber && c.sourceOrderNumber === w.orderNumber)
      );

      if (!w.isActive || !isEligible || !hasRemaining || !notConsumed || hasCaseHistory) {
        return false;
      }
      if (warrantyFilter !== "ALL" && w.itemType !== warrantyFilter) {
        return false;
      }
      if (
        warrantySearch &&
        !w.itemTitle.toLowerCase().includes(warrantySearch.toLowerCase()) &&
        !w.organizationName.toLowerCase().includes(warrantySearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [warranties, cases, warrantyFilter, warrantySearch]);

  // 2. Tab 3: Expired & Consumed Warranties
  const expiredWarranties = useMemo(() => {
    return warranties.filter((w) => {
      const isConsumed = w.status === "CONSUMED";
      const isClaimActive =
        w.status === "CLAIM_LOCKED" ||
        w.activeCaseStatus === "SUBMITTED" ||
        w.activeCaseStatus === "UNDER_REVIEW" ||
        w.activeCaseStatus === "IN_RESOLUTION" ||
        w.activeCaseStatus === "AWAITING_RETURN";
      const isExpired =
        (!w.isActive || w.status === "EXPIRED" || (w.remainingDays !== undefined && w.remainingDays <= 0)) &&
        !isClaimActive;

      if (!isConsumed && !isExpired) {
        return false;
      }
      if (warrantyFilter !== "ALL" && w.itemType !== warrantyFilter) {
        return false;
      }
      if (
        warrantySearch &&
        !w.itemTitle.toLowerCase().includes(warrantySearch.toLowerCase()) &&
        !w.organizationName.toLowerCase().includes(warrantySearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [warranties, warrantyFilter, warrantySearch]);

  // In-Progress vs Resolved Cases segregation
  const inProgressCases = useMemo(() => {
    return cases.filter(
      (c) => c.mainStatus !== "COMPLETED" && c.mainStatus !== "REJECTED" && c.mainStatus !== "CANCELLED"
    );
  }, [cases]);

  const resolvedCases = useMemo(() => {
    return cases.filter(
      (c) => c.mainStatus === "COMPLETED" || c.mainStatus === "REJECTED" || c.mainStatus === "CANCELLED"
    );
  }, [cases]);

  // Tab 2: Submissions (Hanya Kasus Aktif Berjalan, yang sudah Selesai/Ditolak dipindahkan ke Riwayat Selesai)
  const filteredSubmissions = useMemo(() => {
    return inProgressCases.filter((c) => {
      if (submissionFilter === "PRODUCT") {
        const isProd = c.caseType === "claim_product" || c.caseType === "return_product" || c.organizationType === "MERCHANT";
        if (!isProd) return false;
      }
      if (submissionFilter === "SERVICE") {
        const isServ = c.caseType === "claim_service" || c.organizationType === "PROVIDER";
        if (!isServ) return false;
      }

      if (
        submissionSearch &&
        !c.itemTitle.toLowerCase().includes(submissionSearch.toLowerCase()) &&
        !c.caseNumber.toLowerCase().includes(submissionSearch.toLowerCase()) &&
        !c.organizationName.toLowerCase().includes(submissionSearch.toLowerCase()) &&
        !c.sourceOrderNumber?.toLowerCase().includes(submissionSearch.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [inProgressCases, submissionFilter, submissionSearch]);

  // Tab 3: History (Kasus Selesai / Ditutup untuk arsip dan pemantauan hasil)
  const filteredHistory = useMemo(() => {
    return resolvedCases.filter((c) => {
      if (submissionFilter === "PRODUCT") {
        const isProd = c.caseType === "claim_product" || c.caseType === "return_product" || c.organizationType === "MERCHANT";
        if (!isProd) return false;
      }
      if (submissionFilter === "SERVICE") {
        const isServ = c.caseType === "claim_service" || c.organizationType === "PROVIDER";
        if (!isServ) return false;
      }

      if (
        submissionSearch &&
        !c.itemTitle.toLowerCase().includes(submissionSearch.toLowerCase()) &&
        !c.caseNumber.toLowerCase().includes(submissionSearch.toLowerCase()) &&
        !c.organizationName.toLowerCase().includes(submissionSearch.toLowerCase()) &&
        !c.sourceOrderNumber?.toLowerCase().includes(submissionSearch.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [resolvedCases, submissionFilter, submissionSearch]);

  // Tab 3: Natural Expired Warranties (Berakhir masa garansi kalender tanpa pernah diajukan klaim)
  const naturalExpiredWarranties = useMemo(() => {
    return expiredWarranties.filter((w) => {
      const isConsumed = w.status === "CONSUMED";
      const hasMatchedCase = cases.some(
        (c) =>
          c.sourceOrderId === w.orderId ||
          (c as any).source_order_id === w.orderId ||
          c.sourceOrderNumber === w.orderNumber ||
          c.warrantyId === w.id ||
          (c as any).entitlement_id === w.id ||
          (c as any).entitlementId === w.id
      );
      return !hasMatchedCase && !isConsumed;
    });
  }, [expiredWarranties, cases]);

  const filteredExpiredWarranties = useMemo(() => {
    return naturalExpiredWarranties.filter((w) => {
      if (submissionFilter === "PRODUCT" && w.itemType !== "PRODUCT") return false;
      if (submissionFilter === "SERVICE" && w.itemType !== "SERVICE") return false;
      if (
        submissionSearch &&
        !w.itemTitle.toLowerCase().includes(submissionSearch.toLowerCase()) &&
        !w.organizationName.toLowerCase().includes(submissionSearch.toLowerCase()) &&
        !w.orderNumber?.toLowerCase().includes(submissionSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [naturalExpiredWarranties, submissionFilter, submissionSearch]);

  // Handler for Accepting Alternative Solution
  const handleAcceptProposal = async (caseId: string) => {
    try {
      await customerAcceptAlternativeProposal(caseId);
      showToast("Tawaran solusi alternatif berhasil disetujui. Mitra segera memproses tindakan.");
      await refreshData();
      if (viewingCase && viewingCase.id === caseId) {
        const updated = getCaseById(caseId);
        if (updated) setViewingCase(updated);
      }
    } catch (err: any) {
      showToast(err.message || "Gagal menyetujui tawaran.");
    }
  };

  // Handler for Rejecting Alternative Solution
  const handleRejectProposal = async (caseId: string) => {
    try {
      await customerRejectAlternativeProposal(caseId, "Konsumen menolak tawaran alternatif, meminta solusi sesuai hak awal.");
      showToast("Tawaran ditolak. Kasus tetap tercatat di tab Pengajuan untuk negosiasi lanjutan.");
      await refreshData();
      if (viewingCase && viewingCase.id === caseId) {
        const updated = getCaseById(caseId);
        if (updated) setViewingCase(updated);
      }
    } catch (err: any) {
      showToast(err.message || "Gagal menolak tawaran.");
    }
  };

  // Handler for Reporting Issue on NO_RESPONSE (72 Hours SLA breached)
  const handleReportIssue = async (caseId: string) => {
    try {
      await customerReportIssue(caseId, "Mitra tidak merespons pengajuan garansi dalam batas waktu 3x24 jam kalender.");
      showToast("Laporan telah dikirimkan ke Tim Mediasi & Perlindungan Konsumen SERVIO.");
      await refreshData();
      if (viewingCase && viewingCase.id === caseId) {
        const updated = getCaseById(caseId);
        if (updated) setViewingCase(updated);
      }
    } catch (err: any) {
      showToast(err.message || "Gagal melaporkan kendala.");
    }
  };

  // Handler for Uploading Additional Evidence on Request (WAITING_CUSTOMER_INFO)
  const handleAddEvidence = async (caseId: string) => {
    if (!additionalEvidenceText.trim()) {
      showToast("Mohon tuliskan keterangan atau tautan bukti tambahan.");
      return;
    }
    setIsSubmittingEvidence(true);
    try {
      await customerAddEvidence(caseId, additionalEvidenceText.trim(), "text/plain", 1024);
      showToast("Bukti tambahan berhasil dikirim ke mitra untuk melanjutkan peninjauan.");
      setAdditionalEvidenceText("");
      await refreshData();
      if (viewingCase && viewingCase.id === caseId) {
        const updated = getCaseById(caseId);
        if (updated) setViewingCase(updated);
      }
    } catch (err: any) {
      showToast(err.message || "Gagal mengirim bukti tambahan.");
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  // Reusable card renderer for both "Sedang Diajukan" (Active) and "Riwayat Selesai" (Resolved)
  const renderCaseCard = (c: AfterSalesCase) => {
    const isService = c.caseType === "claim_service" || c.organizationType === "PROVIDER";
    const isCompleted = c.mainStatus === "COMPLETED";
    const isRejected = c.mainStatus === "REJECTED";
    const isNoResponse = c.isNoResponse;
    const isAlternative = c.specialCondition === "WAITING_CUSTOMER_APPROVAL";

    const itemPrice = c.itemPrice || 0;
    const qty = c.affectedQuantity || c.orderedQuantity || 1;
    const totalPrice = itemPrice * qty;

    return (
      <motion.div
        key={c.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-5 rounded-3xl bg-white border shadow-xs transition space-y-4 ${
          isAlternative
            ? "border-amber-300 ring-2 ring-amber-100"
            : isNoResponse
            ? "border-rose-300"
            : isCompleted
            ? "border-slate-200 opacity-95"
            : "border-slate-200 hover:border-blue-300"
        }`}
      >
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border flex items-center gap-1 ${
                isService
                  ? "bg-sky-50 text-blue-800 border-sky-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              {isService ? <Wrench size={12} weight="bold" /> : <Package size={12} weight="bold" />}
              {isService ? "Garansi Jasa Servis" : "Garansi Toko Barang"}
            </span>
            <span className="text-xs font-bold text-slate-800">
              {c.organizationName}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono font-bold text-slate-500">
              Order #{c.sourceOrderNumber || c.sourceOrderId}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-mono font-bold text-slate-400">
              Tiket #{c.caseNumber}
            </span>
          </div>

          {/* Status Badge */}
          <div>
            {isNoResponse ? (
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                ⏱️ Tidak Ditanggapi (72 Jam Lewat)
              </span>
            ) : isAlternative ? (
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500 text-white flex items-center gap-1.5 animate-pulse">
                ⚠️ Tawaran Alternatif Mitra
              </span>
            ) : isCompleted ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Check size={13} weight="bold" /> Selesai (COMPLETED)
              </span>
            ) : isRejected ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                <X size={13} weight="bold" /> Ditolak (REJECTED)
              </span>
            ) : c.approvedSolution === "REFUND" ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                💳 Proses Refund S-Pay
              </span>
            ) : c.approvedSolution === "REPLACEMENT" ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                📦 Pengiriman Unit Pengganti
              </span>
            ) : (c.approvedSolution as any) === "REPAIR" || (c.approvedSolution as any) === "REWORK" ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                🔧 Perbaikan Teknisi (Rp0)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                Sedang Ditinjau Mitra
              </span>
            )}
          </div>
        </div>

        {/* Content Row: Image + Details + Order Price Breakdown */}
        <div className="space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border overflow-hidden mt-0.5 ${
                  isService
                    ? "bg-sky-50 text-blue-700 border-sky-100"
                    : "bg-amber-50 text-amber-700 border-amber-100"
                }`}
              >
                {c.itemImageUrl ? (
                  <img
                    src={c.itemImageUrl}
                    alt={c.itemTitle}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : isService ? (
                  <Wrench size={28} weight="bold" />
                ) : (
                  <Package size={28} weight="bold" />
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Rincian Pesanan Asal:
                </span>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {c.itemTitle}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                  <span>Harga Satuan: <strong>Rp {itemPrice.toLocaleString("id-ID")}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Jumlah: <strong>{qty} Unit</strong></span>
                  {totalPrice > 0 && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-emerald-700 font-bold">Total Pesanan: Rp {totalPrice.toLocaleString("id-ID")}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-slate-500 shrink-0">
              <span className="block text-[10px] uppercase text-slate-400 font-semibold">Tenggat Respon Toko (SLA 72h):</span>
              <span className="font-mono font-bold text-slate-800">
                {c.slaDeadlineAt ? new Date(c.slaDeadlineAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "3x24 Jam Kalender"}
              </span>
            </div>
          </div>

          {/* DETAIL FORM PENGAJUAN PELANGGAN */}
          <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 text-xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
              <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                <FileText size={14} weight="bold" className="text-blue-600" />
                Rincian Formulir Pengajuan Garansi
              </span>
              <span className="text-[11px] text-slate-600">
                Unit yang Diklaim: <strong className="text-slate-900">{c.affectedQuantity || 1} Unit</strong> (dari {c.orderedQuantity || qty} Unit)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block font-semibold uppercase">Solusi yang Diharapkan:</span>
                <strong className={c.customerRequestedSolution === "REFUND" || c.approvedSolution === "REFUND" ? "text-rose-700" : isService ? "text-purple-700" : "text-blue-700"}>
                  {c.approvedSolution
                    ? (c.approvedSolution as any) === "REPAIR" || (c.approvedSolution as any) === "REWORK"
                      ? "Perbaikan Ulang Teknisi (Rework Rp 0)"
                      : c.approvedSolution === "REPLACEMENT"
                      ? "Penggantian Unit Baru (Replacement)"
                      : "Pengembalian Dana (Refund ke S-Pay)"
                    : c.customerRequestedSolution === "REFUND"
                    ? "Pengembalian Dana Penuh (Refund ke S-Pay)"
                    : isService
                    ? "Perbaikan Ulang Teknisi (Rework Rp 0)"
                    : "Penggantian Unit Baru (Replacement)"}
                </strong>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block font-semibold uppercase">Alasan Masalah yang Dialami:</span>
                <span className="font-bold text-slate-800">{c.issueReason || "Kendala fungsional barang/layanan"}</span>
              </div>
            </div>

            {c.issueDescription && (
              <div className="pt-1">
                <span className="text-slate-400 text-[10px] block font-semibold uppercase">Kronologi &amp; Penjelasan Keluhan:</span>
                <p className="text-slate-700 italic bg-white p-2 rounded-xl border border-slate-200/60 text-[11px] mt-0.5 leading-relaxed">
                  &ldquo;{c.issueDescription}&rdquo;
                </p>
              </div>
            )}

            {c.evidenceMedia && c.evidenceMedia.length > 0 && (
              <div className="pt-1">
                <span className="text-slate-400 text-[10px] block font-semibold uppercase mb-1">Bukti Foto / Dokumen Kerusakan:</span>
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                  {c.evidenceMedia.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="block shrink-0">
                      <img
                        src={url}
                        alt={`Bukti ${idx + 1}`}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 hover:scale-105 transition"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SPESIFIK TIMELINE RESOLUSI BERDASARKAN SOLUSI */}
          {(() => {
            const isRefund = c.customerRequestedSolution === "REFUND" || c.approvedSolution === "REFUND" || (c as any).agreedSolution === "REFUND";
            const isRework = isService && !isRefund;
            const isReplacement = !isService && !isRefund;

            if (isRefund) {
              return (
                <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-200/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-rose-900">
                    <span className="flex items-center gap-1.5">
                      <Bank size={14} weight="bold" className="text-rose-600" />
                      Timeline Proses Refund Pengembalian Dana:
                    </span>
                    <span className="text-rose-700 font-mono">
                      {isCompleted ? "Dana Berhasil Dikembalikan" : isRejected ? "Ditolak" : "Dalam Proses"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[9px] font-bold">
                    <div className="space-y-0.5">
                      <div className="h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-emerald-800">1. Diajukan</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className={`h-1.5 rounded-full ${c.mainStatus !== "SUBMITTED" ? "bg-emerald-500" : "bg-slate-200"}`} />
                      <span className={c.mainStatus !== "SUBMITTED" ? "text-emerald-800" : "text-slate-400"}>2. Review Mitra</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className={`h-1.5 rounded-full ${c.mainStatus === "IN_RESOLUTION" ? "bg-rose-600 animate-pulse" : isCompleted ? "bg-emerald-500" : "bg-slate-200"}`} />
                      <span className={c.mainStatus === "IN_RESOLUTION" ? "text-rose-700" : isCompleted ? "text-emerald-800" : "text-slate-400"}>3. Pencairan S-Pay</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className={`h-1.5 rounded-full ${isCompleted ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-slate-200"}`} />
                      <span className={isCompleted ? "text-emerald-800" : isRejected ? "text-rose-700" : "text-slate-400"}>{isRejected ? "Ditolak" : "4. Selesai"}</span>
                    </div>
                  </div>
                </div>
              );
            }

            if (isRework) {
              const opStatus: string = c.warrantyJob?.operationalStatus || (isCompleted ? "DONE" : "ASSIGNED");
              const isAssigned = c.mainStatus !== "SUBMITTED";
              const isAccepted = isCompleted || opStatus === "ACCEPTED" || opStatus === "OTW" || opStatus === "IN_PROGRESS" || opStatus === "DONE";
              const isOtw = isCompleted || opStatus === "OTW" || opStatus === "IN_PROGRESS" || opStatus === "DONE";
              const isWorking = isCompleted || opStatus === "IN_PROGRESS" || opStatus === "DONE";
              const isDone = isCompleted || opStatus === "DONE";

              return (
                <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                    <span className="flex items-center gap-1.5">
                      <Wrench size={14} weight="bold" className="text-purple-600" />
                      Timeline Perbaikan Jasa (Rework Rp 0):
                    </span>
                    <span className="text-purple-700 font-mono">
                      {isCompleted ? "Perbaikan Selesai" : isRejected ? "Ditolak" : opStatus === "IN_PROGRESS" ? "Sedang Dikerjakan" : opStatus === "OTW" ? "Teknisi OTW" : "Berjalan"}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1 text-center text-[8.5px] font-bold">
                    <div className="space-y-0.5">
                      <div className="h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-emerald-800">1. Diajukan</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className={`h-1.5 rounded-full ${isAssigned ? "bg-emerald-500" : "bg-slate-200"}`} />
                      <span className={isAssigned ? "text-emerald-800" : "text-slate-400"}>2. Ditugaskan</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className={`h-1.5 rounded-full ${isAccepted ? "bg-emerald-500" : opStatus === "ASSIGNED" ? "bg-blue-600 animate-pulse" : "bg-slate-200"}`} />
                      <span className={isAccepted ? "text-emerald-800" : opStatus === "ASSIGNED" ? "text-blue-700" : "text-slate-400"}>3. Terima</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className={`h-1.5 rounded-full ${isOtw ? "bg-emerald-500" : opStatus === "ACCEPTED" ? "bg-sky-600 animate-pulse" : "bg-slate-200"}`} />
                      <span className={isOtw ? "text-emerald-800" : opStatus === "ACCEPTED" ? "text-sky-700" : "text-slate-400"}>4. OTW</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className={`h-1.5 rounded-full ${isWorking ? "bg-emerald-500" : opStatus === "IN_PROGRESS" ? "bg-purple-600 animate-pulse" : "bg-slate-200"}`} />
                      <span className={isWorking ? "text-emerald-800" : opStatus === "IN_PROGRESS" ? "text-purple-700" : "text-slate-400"}>5. Pengerjaan</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className={`h-1.5 rounded-full ${isCompleted ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-slate-200"}`} />
                      <span className={isCompleted ? "text-emerald-800" : isRejected ? "text-rose-700" : "text-slate-400"}>{isRejected ? "Ditolak" : "6. Selesai"}</span>
                    </div>
                  </div>
                  {c.warrantyJob && (
                    <div className="p-2 bg-white rounded-xl border border-purple-200 text-xs text-purple-950 flex flex-wrap items-center justify-between gap-2 mt-1">
                      <span>Teknisi Bertugas: <strong>{c.warrantyJob.workerName || "Ahmad Fauzi (Teknisi Senior)"}</strong></span>
                      <span>Jadwal: <strong>{c.warrantyJob.scheduledDate || "Besok, 13:00 WIB"}</strong></span>
                      <span className="font-bold text-emerald-700">Biaya: Rp 0 (Garansi Resmi)</span>
                    </div>
                  )}
                </div>
              );
            }

            // isReplacement (Retur Barang)
            return (
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <Package size={14} weight="bold" className="text-blue-600" />
                    Timeline Retur &amp; Penggantian Unit:
                  </span>
                  <span className="text-blue-700 font-mono">
                    {isCompleted ? "Unit Pengganti Selesai" : isRejected ? "Ditolak" : c.replacementShipment?.shippingStatus === "SHIPPED" ? "Unit Sedang Dikirim" : "Berjalan"}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1 text-center text-[8.5px] font-bold">
                  <div className="space-y-0.5">
                    <div className="h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-emerald-800">1. Diajukan</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className={`h-1.5 rounded-full ${c.mainStatus !== "SUBMITTED" ? "bg-emerald-500" : "bg-slate-200"}`} />
                    <span className={c.mainStatus !== "SUBMITTED" ? "text-emerald-800" : "text-slate-400"}>2. Alamat Terbit</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className={`h-1.5 rounded-full ${c.returnShipping?.trackingNumber ? "bg-emerald-500" : "bg-slate-200"}`} />
                    <span className={c.returnShipping?.trackingNumber ? "text-emerald-800" : "text-slate-400"}>3. Kirim Retur</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className={`h-1.5 rounded-full ${c.returnShipping?.inspectedByMerchant ? "bg-emerald-500" : c.mainStatus === "AWAITING_RETURN" ? "bg-blue-600 animate-pulse" : "bg-slate-200"}`} />
                    <span className={c.returnShipping?.inspectedByMerchant ? "text-emerald-800" : "text-slate-400"}>4. Toko QC</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className={`h-1.5 rounded-full ${isCompleted ? "bg-emerald-500" : c.replacementShipment?.shippingStatus === "SHIPPED" ? "bg-blue-600 animate-pulse" : c.mainStatus === "IN_RESOLUTION" ? "bg-amber-500" : "bg-slate-200"}`} />
                    <span className={isCompleted || c.replacementShipment?.shippingStatus === "SHIPPED" ? "text-emerald-800" : c.mainStatus === "IN_RESOLUTION" ? "text-amber-800" : "text-slate-400"}>5. Kirim Unit Baru</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className={`h-1.5 rounded-full ${isCompleted ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-slate-200"}`} />
                    <span className={isCompleted ? "text-emerald-800" : isRejected ? "text-rose-700" : "text-slate-400"}>{isRejected ? "Ditolak" : "6. Selesai"}</span>
                  </div>
                </div>

                {c.returnShipping?.trackingNumber && (
                  <div className="p-2 bg-white rounded-xl border border-blue-200 text-xs text-blue-950 flex flex-wrap items-center justify-between gap-2 mt-1">
                    <span>Resi Retur Pembeli: <strong className="font-mono">{c.returnShipping.trackingNumber}</strong></span>
                    <span>Status Retur: <strong>{c.returnShipping.receivedByMerchant ? "Diterima Toko & Lolos QC" : "Sedang Dikirim via Kurir"}</strong></span>
                  </div>
                )}

                {/* Info Pengiriman Unit Pengganti Baru */}
                {c.replacementShipment && (
                  <div className="p-2.5 bg-gradient-to-r from-blue-50/90 to-emerald-50/90 rounded-xl border border-blue-200/90 text-xs space-y-2 mt-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Truck size={14} className="text-blue-700" weight="bold" />
                        <span className="font-bold text-slate-800">
                          {c.replacementShipment.shippingStatus === "SHIPPED"
                            ? `Unit Baru Dikirim (${c.replacementShipment.shippingMethod === "KURIR_TOKO" ? "Kurir Toko" : "GoSend Instant"})`
                            : isCompleted || c.replacementShipment.shippingStatus === "DELIVERED"
                            ? "Unit Baru Telah Diterima"
                            : "Menyiapkan Unit Baru"}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                          Ongkir Rp0
                        </span>
                      </div>

                      {c.replacementShipment.trackingUrl && (c.replacementShipment.shippingMethod === "GOSEND" || c.replacementShipment.courierName?.toLowerCase().includes("gosend")) && (
                        <a
                          href={c.replacementShipment.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-lg transition"
                        >
                          <MapPin size={12} weight="bold" />
                          <span>Buka Live Tracking Gojek</span>
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-slate-600 text-[11px]">
                      <span>
                        <strong>Pengirim:</strong> {c.replacementShipment.driverName || (c.replacementShipment.shippingMethod === "KURIR_TOKO" ? "Kurir Toko" : "Driver GoSend")}
                      </span>
                      {c.replacementShipment.driverPhone && (
                        <span>
                          <strong>Telp:</strong> <span className="font-mono">{c.replacementShipment.driverPhone}</span>
                        </span>
                      )}
                    </div>

                    {c.replacementShipment.notes && (
                      <p className="text-[11px] text-slate-600 italic">
                        Catatan Toko: {c.replacementShipment.notes}
                      </p>
                    )}

                    {/* Tombol Konfirmasi Langsung di Card */}
                    {c.mainStatus === "IN_RESOLUTION" && c.replacementShipment.shippingStatus === "SHIPPED" && (
                      <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-600 font-medium">Sudah terima paket unit pengganti?</span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await customerConfirmCompletion(c.id, "CUSTOMER_VERIFIED_COMPLETION");
                              showToast("Penerimaan unit baru terverifikasi! Garansi diselesaikan.");
                            } catch (err: any) {
                              showToast(err?.message || "Gagal mengonfirmasi penerimaan unit.");
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Check size={12} weight="bold" />
                          <span>Konfirmasi Unit Diterima</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 text-[11px]">
            Diajukan pada: <strong className="text-slate-700">{formatDisplayDate(c.submittedAt)}</strong>
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            {isAlternative && (
              <>
                <button
                  type="button"
                  onClick={() => handleAcceptProposal(c.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                >
                  Setujui Tawaran
                </button>
                <button
                  type="button"
                  onClick={() => handleRejectProposal(c.id)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Tolak Tawaran
                </button>
              </>
            )}
            {isNoResponse && (
              <button
                type="button"
                onClick={() => handleReportIssue(c.id)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
              >
                Laporkan ke Dukungan
              </button>
            )}
            <Link
              href={`/chat?partner_id=${encodeURIComponent(c.organizationId)}&partner_type=${isService ? "provider" : "merchant"}&partner_name=${encodeURIComponent(c.organizationName)}&ctx_type=${isService ? "warranty_jasa" : "warranty_barang"}&ctx_id=${encodeURIComponent(c.id)}&ctx_title=${encodeURIComponent(c.itemTitle)}&ctx_summary=${encodeURIComponent(`Klaim #${c.caseNumber} • Status: ${c.mainStatus}`)}`}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ChatCircleDots size={14} weight="bold" className={isService ? "text-purple-600" : "text-blue-600"} />
              <span>{isService ? "Chat Provider" : "Chat Toko"}</span>
            </Link>
            <button
              type="button"
              onClick={() => setViewingCase(c)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
            >
              <span>Lihat Detail & Timeline Alur</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  // Reusable card renderer for naturally expired warranties (tidak pernah diajukan klaim)
  const renderExpiredWarrantyCard = (w: CustomerWarrantyEntitlement) => {
    return (
      <motion.div
        key={w.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3.5 hover:border-slate-300 transition"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
              {w.itemType === "PRODUCT" ? <Package size={12} weight="bold" /> : <Wrench size={12} weight="bold" />}
              {w.itemType === "PRODUCT" ? "Garansi Toko Barang" : "Garansi Jasa Servis"}
            </span>
            <span className="font-bold text-slate-800">{w.organizationName}</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-slate-500">Order #{w.orderNumber}</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 w-fit">
            <Clock size={12} weight="bold" />
            Masa Garansi Berakhir • Tidak Pernah Diajukan Klaim
          </span>
        </div>

        {/* Content Row */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border bg-slate-50 text-slate-400 overflow-hidden">
            {w.itemImageUrl ? (
              <img src={w.itemImageUrl} alt={w.itemTitle} className="w-full h-full object-cover" />
            ) : w.itemType === "PRODUCT" ? (
              <Package size={24} weight="bold" />
            ) : (
              <Wrench size={24} weight="bold" />
            )}
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 leading-snug">{w.itemTitle}</h4>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span>Paket: <strong>{w.presetName.toLowerCase().includes(`${w.durationDays} hari`) ? w.presetName : `${w.presetName} (${w.durationDays} Hari)`}</strong></span>
              <span className="text-slate-300">•</span>
              <span>Cakupan: <strong>{w.coverage || "Kerusakan fungsional normal"}</strong></span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 text-xs text-slate-600 space-y-1">
          <p className="font-medium">
            Masa perlindungan resmi selama {w.durationDays} hari kalender telah berakhir pada <strong>{formatDisplayDate(w.endDate)}</strong> tanpa ada kendala yang dilaporkan.
          </p>
          <p className="text-[11px] text-slate-400">
            Hak klaim gratis telah kedaluwarsa secara alami. Jika membutuhkan perawatan baru, Anda dapat melakukan pemesanan ulang.
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-[11px] text-slate-400">
            Masa Aktif: {formatDisplayDate(w.startDate)} s.d. {formatDisplayDate(w.endDate)}
          </span>
          <button
            type="button"
            onClick={() => setViewingWarranty(w)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer self-end sm:self-auto flex items-center gap-1.5 shadow-2xs"
          >
            <FileText size={14} weight="bold" className="text-blue-600" />
            <span>Lihat Sertifikat Garansi</span>
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-28 text-slate-800 antialiased">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2.5 border border-slate-700"
          >
            <Sparkle size={16} weight="fill" className="text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Banner */}
      <div className="bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
                  <ShieldCheck size={14} weight="bold" />
                  Pusat Purnajual Terpadu
                </span>
                <span className="text-xs text-slate-400">• Proteksi Konsumen SERVIO</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                Garansi & Perlindungan
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Pantau sertifikat garansi resmi dari pesanan selesai, rincian biaya pengerjaan asal, serta lacak proses klaim perbaikan, tukar barang, atau pengembalian dana dalam satu dashboard.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Auto-Sync</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (activeWarranties.length > 0) {
                    setClaimModalWarranty(activeWarranties[0]);
                  } else {
                    showToast("Pilih salah satu kartu pesanan aktif di bawah untuk mengajukan klaim.");
                  }
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <ShieldCheck size={16} weight="bold" />
                <span>Ajukan Klaim / Retur Baru</span>
              </button>
            </div>
          </div>

          {/* 3 Main Tabs: Garansi Aktif, Sedang Diajukan, Riwayat Garansi */}
          <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 -mb-px overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab("active");
                router.push("/warranties?tab=active");
              }}
              className={`pb-3.5 px-3.5 sm:px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "active"
                  ? "border-blue-600 text-blue-600 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <ShieldCheck size={16} weight="bold" />
              <span>Garansi Aktif</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                {activeWarranties.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("submissions");
                router.push("/warranties?tab=submissions");
              }}
              className={`pb-3.5 px-3.5 sm:px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "submissions"
                  ? "border-blue-600 text-blue-600 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <ArrowsClockwise size={16} weight="bold" />
              <span>Sedang Diajukan</span>
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  inProgressCases.length > 0
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}
              >
                {inProgressCases.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("history");
                router.push("/warranties?tab=history");
              }}
              className={`pb-3.5 px-3.5 sm:px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "history"
                  ? "border-blue-600 text-blue-600 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <ClockCounterClockwise size={16} weight="bold" />
              <span>Riwayat Garansi</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                {resolvedCases.length + naturalExpiredWarranties.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* 4 Summary Strip Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div
            onClick={() => {
              setActiveTab("active");
              router.push("/warranties?tab=active");
            }}
            className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs cursor-pointer hover:border-blue-300 transition"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Garansi Aktif
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-emerald-600 font-display">
                {activeWarranties.length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Hak Perlindungan</span>
            </div>
          </div>

          <div
            onClick={() => {
              setActiveTab("submissions");
              router.push("/warranties?tab=submissions");
            }}
            className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs cursor-pointer hover:border-blue-300 transition"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Pengajuan Berjalan
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-blue-600 font-display">
                {inProgressCases.length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Dalam Penanganan</span>
            </div>
          </div>

          <div
            onClick={() => {
              setActiveTab("submissions");
              router.push("/warranties?tab=submissions");
            }}
            className="bg-amber-50/70 p-4.5 rounded-2xl border border-amber-200 shadow-2xs cursor-pointer hover:border-amber-300 transition"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
              Butuh Respon Anda
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-700 font-display">
                {cases.filter((c) => c.specialCondition === "WAITING_CUSTOMER_INFO" || c.specialCondition === "WAITING_CUSTOMER_APPROVAL" || c.isNoResponse).length}
              </span>
              <span className="text-[11px] text-amber-900 font-medium">Menunggu Aksi</span>
            </div>
          </div>

          <div
            onClick={() => {
              setActiveTab("history");
              router.push("/warranties?tab=history");
            }}
            className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs cursor-pointer hover:border-emerald-300 transition"
          >
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Riwayat Garansi
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-emerald-600 font-display">
                {resolvedCases.length + naturalExpiredWarranties.length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Selesai &amp; Berakhir</span>
            </div>
          </div>
        </div>

        {/* TAB 1: GARANSI AKTIF */}
        {activeTab === "active" && (
          <div className="space-y-5">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
                {(["ALL", "SERVICE", "PRODUCT"] as ItemTypeFilter[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setWarrantyFilter(type)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      warrantyFilter === type
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {type === "ALL" ? "Semua" : type === "SERVICE" ? "Jasa Servis" : "Produk & Barang"}
                  </button>
                ))}
              </div>

              <div className="relative">
                <MagnifyingGlass size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari item garansi atau mitra..."
                  value={warrantySearch}
                  onChange={(e) => setWarrantySearch(e.target.value)}
                  className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Warranties List */}
            {activeWarranties.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <ShieldCheck size={38} className="mx-auto text-slate-300" />
                <h3 className="font-bold text-sm text-slate-800">Belum Ada Garansi Aktif</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Garansi otomatis terbit dan aktif saat pesanan barang atau jasa Anda berstatus selesai (COMPLETED).
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeWarranties.map((w) => {
                  const isService = w.itemType === "SERVICE";
                  const remainingDays = w.remainingDays !== undefined ? w.remainingDays : 15;
                  const totalDays = w.durationDays || 30;
                  const percentRemaining = Math.max(0, Math.min(100, Math.round((remainingDays / totalDays) * 100)));

                  return (
                    <div
                      key={w.id}
                      className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition space-y-4"
                    >
                      {/* Top Header Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border flex items-center gap-1 ${
                              isService
                                ? "bg-sky-50 text-blue-800 border-sky-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {isService ? <Wrench size={12} weight="bold" /> : <Package size={12} weight="bold" />}
                            {isService ? "Garansi Jasa Servis" : "Garansi Toko Barang"}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {w.organizationName}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-mono font-bold text-slate-500">
                            #{w.orderNumber}
                          </span>
                        </div>

                        <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 w-fit">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Garansi Aktif
                        </span>
                      </div>

                      {/* Content Row */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                              isService
                                ? "bg-sky-50 text-blue-700 border-sky-100"
                                : "bg-amber-50 text-amber-700 border-amber-100"
                            }`}
                          >
                            {w.itemImageUrl ? (
                              <img
                                src={w.itemImageUrl}
                                alt={w.itemTitle}
                                className="w-full h-full object-cover rounded-2xl"
                              />
                            ) : isService ? (
                              <Wrench size={26} weight="bold" />
                            ) : (
                              <Package size={26} weight="bold" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-slate-900 leading-snug">
                              {w.itemTitle}
                            </h3>
                            <p className="text-xs text-slate-500">
                              Paket: <strong>{w.presetName.toLowerCase().includes(`${w.durationDays} hari`) ? w.presetName : `${w.presetName} (${w.durationDays} Hari)`}</strong> • {w.organizationName}
                            </p>
                            {Boolean((w as any).catalogSnapshot?.price || (w as any).catalogSnapshot?.unit_price || (w as any).itemPrice) && (
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 pt-0.5">
                                <span>Harga Satuan: <strong>Rp {Number((w as any).catalogSnapshot?.price || (w as any).catalogSnapshot?.unit_price || (w as any).itemPrice || 0).toLocaleString("id-ID")}</strong></span>
                                <span className="text-slate-300">•</span>
                                <span>Jumlah: <strong>{w.quantity || 1} Unit</strong></span>
                                <span className="text-slate-300">•</span>
                                <span className="text-emerald-700 font-bold">Total: Rp {Number(((w as any).catalogSnapshot?.price || (w as any).catalogSnapshot?.unit_price || (w as any).itemPrice || 0) * (w.quantity || 1)).toLocaleString("id-ID")}</span>
                              </div>
                            )}
                            {w.coverage && (
                              <p className="text-[11px] text-slate-400 line-clamp-1">
                                Cakupan: {w.coverage}
                              </p>
                            )}

                            {/* Partial Quantity Locking Note */}
                            {w.quantity && w.remainingQuantity !== undefined && w.remainingQuantity < w.quantity && (
                              <div className="flex items-center gap-2 pt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <LockKey size={11} weight="bold" />
                                  {w.quantity - w.remainingQuantity} Unit Sedang Diklaim (Terkunci)
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ✓ {w.remainingQuantity} Unit Masih Aktif
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Animated Expiry Progress Bar */}
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 min-w-[240px] space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">Sisa Masa Garansi:</span>
                            <span className="font-extrabold text-emerald-700">
                              {remainingDays} Hari Lagi
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden relative">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentRemaining}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full relative overflow-hidden"
                            >
                              <motion.div
                                className="w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent"
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                              />
                            </motion.div>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>Mulai: {formatDisplayDate(w.startDate)}</span>
                            <span>Berakhir: {formatDisplayDate(w.endDate)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">
                          Jaminan Layanan: <strong className="text-emerald-700 font-bold">Biaya Perbaikan Rp 0 / Tukar Unit Resmi</strong>
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/chat?partner_id=${encodeURIComponent(w.organizationId || (isService ? "0740d857-b665-4191-aaf5-d7dd3611dc1d" : "0c1467e7-af68-4b26-ae84-daa41d51aed0"))}&partner_type=${isService ? "provider" : "merchant"}&partner_name=${encodeURIComponent(w.organizationName || (isService ? "sukses gembira" : "BUDIAJASA"))}&ctx_type=${isService ? "warranty_jasa" : "warranty_barang"}&ctx_id=${encodeURIComponent(w.id)}&ctx_title=${encodeURIComponent(w.itemTitle)}&ctx_thumb=${encodeURIComponent(w.itemImageUrl || "")}&ctx_summary=${encodeURIComponent(`Garansi: ${w.warrantyNumber} • Berlaku s.d. ${formatDisplayDate(w.endDate)}`)}&ctx_url=${encodeURIComponent("/warranties")}`}
                            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Tanyakan Garansi Ini"
                          >
                            <ChatCircleDots size={14} weight="bold" className={isService ? "text-purple-600" : "text-blue-600"} />
                            <span>{isService ? "Chat Provider" : "Chat Toko"}</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setViewingWarranty(w)}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <FileText size={14} weight="bold" />
                            <span>Lihat Detail Pesanan & Ketentuan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setClaimModalWarranty(w)}
                            className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                              isService ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"
                            }`}
                          >
                            <ShieldCheck size={14} weight="bold" />
                            <span>{isService ? "Ajukan Klaim Garansi Jasa" : "Ajukan Klaim Barang"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SEDANG DIAJUKAN */}
        {activeTab === "submissions" && (
          <div className="space-y-5">
            {/* Filter Bar: Hanya Semua | Barang | Jasa & Search Input */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
                {(["ALL", "PRODUCT", "SERVICE"] as ItemTypeFilter[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSubmissionFilter(type)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      submissionFilter === type
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {type === "ALL" ? "Semua" : type === "PRODUCT" ? "Barang" : "Jasa"}
                  </button>
                ))}
              </div>

              <div className="relative">
                <MagnifyingGlass size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor klaim, item, atau mitra..."
                  value={submissionSearch}
                  onChange={(e) => setSubmissionSearch(e.target.value)}
                  className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Cases List (Hanya Kasus Sedang Berjalan) */}
            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                  <CheckCircle size={32} weight="fill" className="text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-slate-800">Tidak Ada Pengajuan yang Sedang Berjalan</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Semua pengajuan garansi Anda sebelumnya telah selesai diproses. Riwayat penyelesaian dapat Anda periksa di tab Riwayat Selesai.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  {(resolvedCases.length > 0 || naturalExpiredWarranties.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("history");
                        router.push("/warranties?tab=history");
                      }}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-emerald-200 cursor-pointer"
                    >
                      <ClockCounterClockwise size={15} weight="bold" />
                      <span>Buka Riwayat Garansi ({resolvedCases.length + naturalExpiredWarranties.length})</span>
                    </button>
                  )}
                  {activeWarranties.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("active");
                        router.push("/warranties?tab=active");
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ShieldCheck size={15} weight="bold" />
                      <span>Lihat Garansi Aktif ({activeWarranties.length})</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSubmissions.map(renderCaseCard)}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RIWAYAT GARANSI (SELESAI & BERAKHIR) */}
        {activeTab === "history" && (
          <div className="space-y-5">
            {/* Filter Bar: Kategori & Sub-Filter Status & Search Input */}
            <div className="flex flex-col gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Filter Kategori: Semua | Barang | Jasa */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
                  {(["ALL", "PRODUCT", "SERVICE"] as ItemTypeFilter[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSubmissionFilter(type)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        submissionFilter === type
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {type === "ALL" ? "Semua" : type === "PRODUCT" ? "Barang" : "Jasa"}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative">
                  <MagnifyingGlass size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nomor klaim, item, atau mitra..."
                    value={submissionSearch}
                    onChange={(e) => setSubmissionSearch(e.target.value)}
                    className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Sub-Filter Status: Semua Riwayat | Selesai Diklaim | Kedaluwarsa Alami */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter("ALL")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    historyTypeFilter === "ALL"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70"
                  }`}
                >
                  <span>Semua Riwayat</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${historyTypeFilter === "ALL" ? "bg-slate-700 text-slate-100" : "bg-slate-200 text-slate-700"}`}>
                    {filteredHistory.length + filteredExpiredWarranties.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter("CLAIMED")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    historyTypeFilter === "CLAIMED"
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/70"
                  }`}
                >
                  <Check size={12} weight="bold" />
                  <span>Selesai Diklaim (Tuntas)</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${historyTypeFilter === "CLAIMED" ? "bg-emerald-800 text-emerald-100" : "bg-emerald-200 text-emerald-900"}`}>
                    {filteredHistory.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter("EXPIRED")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    historyTypeFilter === "EXPIRED"
                      ? "bg-slate-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  <Clock size={12} weight="bold" />
                  <span>Kedaluwarsa Alami (Tanpa Klaim)</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${historyTypeFilter === "EXPIRED" ? "bg-slate-800 text-slate-100" : "bg-slate-200 text-slate-700"}`}>
                    {filteredExpiredWarranties.length}
                  </span>
                </button>
              </div>
            </div>

            {/* List Riwayat */}
            {filteredHistory.length === 0 && filteredExpiredWarranties.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <ClockCounterClockwise size={38} className="mx-auto text-slate-300" />
                <h3 className="font-bold text-sm text-slate-800">Belum Ada Riwayat Garansi</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Semua klaim yang telah selesai diproses maupun garansi yang telah berakhir masa aktifnya akan tersimpan rapi di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(historyTypeFilter === "ALL" || historyTypeFilter === "CLAIMED") &&
                  filteredHistory.map(renderCaseCard)}
                {(historyTypeFilter === "ALL" || historyTypeFilter === "EXPIRED") &&
                  filteredExpiredWarranties.map(renderExpiredWarrantyCard)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* POPUP MODAL 1: DETAIL PESANAN ASAL & SERTIFIKAT GARANSI (0 Detik Instant Modal) */}
      <AnimatePresence>
        {viewingWarranty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4.5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                    Sertifikat Garansi Resmi SERVIO
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-base mt-1.5 leading-snug">
                    {viewingWarranty.itemTitle}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    No. Pesanan Asal: #{viewingWarranty.orderNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingWarranty(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Order Metadata Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] block font-medium">Pihak Bertanggung Jawab:</span>
                  <strong className="text-slate-800 text-xs block mt-0.5">{viewingWarranty.organizationName}</strong>
                  <span className="text-[11px] text-slate-500">{viewingWarranty.itemType === "SERVICE" ? "Mitra Servis Resmi" : "Toko Terverifikasi"}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] block font-medium">Masa Berlaku:</span>
                  <strong className="text-slate-800 text-xs block mt-0.5">{viewingWarranty.durationDays} Hari Kalender</strong>
                  <span className="text-[11px] text-emerald-600 font-bold">
                    Sisa {viewingWarranty.remainingDays !== undefined ? viewingWarranty.remainingDays : 15} Hari
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 text-[10px] block font-medium">Biaya Penanganan Garansi:</span>
                  <strong className="text-emerald-700 text-xs font-bold block mt-0.5">Bebas Biaya (Rp 0)</strong>
                  <span className="text-[11px] text-slate-500">Dijamin Platform</span>
                </div>
              </div>

              {/* Terms & Coverage */}
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                  Syarat & Cakupan Garansi:
                </span>
                <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-1.5 text-xs">
                  <div className="text-slate-800">
                    <strong>Cakupan Resmi:</strong>{" "}
                    <span>{viewingWarranty.coverage || "Reparasi ulang tanpa biaya (Rp0) jika unit mengalami kendala serupa pasca servis."}</span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    <strong>Pengecualian:</strong>{" "}
                    <span>{viewingWarranty.terms || "Kerusakan fisik baru akibat benturan keras, kemasukan cairan setelah perbaikan, atau kelalaian pemakaian di luar batas normal."}</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <Link
                  href={`/orders`}
                  target="_blank"
                  className="text-blue-600 hover:underline font-bold flex items-center gap-1"
                >
                  <span>Buka Invoice & Halaman Pesanan Asal</span>
                  <ArrowSquareOut size={14} weight="bold" />
                </Link>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setViewingWarranty(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingWarranty;
                      setViewingWarranty(null);
                      setClaimModalWarranty(target);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                  >
                    Ajukan Klaim Sekarang
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP MODAL 2: DETAIL KASUS PENGAJUAN & ANIMATED LIVE TIMELINE */}
      <AnimatePresence>
        {viewingCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        viewingCase.caseType === "claim_service"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {viewingCase.caseType === "claim_service" ? "Klaim Garansi Jasa Servis" : "Klaim Garansi Barang"}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">#{viewingCase.caseNumber}</span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-snug">{viewingCase.itemTitle}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mitra Penanggung Jawab: <strong className="text-slate-700">{viewingCase.organizationName}</strong> • Order #{viewingCase.sourceOrderNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingCase(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Solution Banner */}
              <div className="p-4 rounded-2xl border bg-blue-50/70 border-blue-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                    Solusi Penanganan Disetujui:
                  </span>
                  <strong className="text-slate-900 text-sm">
                    {(viewingCase.approvedSolution as any) === "REPAIR" || (viewingCase.approvedSolution as any) === "REWORK"
                      ? "Perbaikan Ulang Jasa (Rework Rp 0)"
                      : viewingCase.approvedSolution === "REPLACEMENT"
                      ? "Penggantian Unit Baru Tersegel"
                      : viewingCase.approvedSolution === "REFUND"
                      ? "Pengembalian Dana Penuh 100% (Refund)"
                      : "Dalam Peninjauan Kelayakan Mitra"}
                  </strong>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Seluruh penanganan ini dijamin oleh SERVIO bebas biaya komersial tambahan.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Bebas Biaya (Rp 0)
                </span>
              </div>

              {/* ANIMATED LIVE TIMELINE */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    Tahapan & Pelacakan Kasus (Live Timeline)
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {viewingCase.caseType === "claim_service" ? "Alur Operasional Jasa Servis" : "Alur Logistik & Kurir Ekspedisi"}
                  </span>
                </div>

                {/* Embedded Timeline Component with Animated Light Beam */}
                <div className="pt-2 bg-slate-50/60 p-3.5 rounded-2xl border border-slate-200/70">
                  <ClaimProgressTimeline caseData={viewingCase} />
                </div>
              </div>

              {/* 1. Goods Replacement Logistics Card */}
              {(viewingCase.approvedSolution === "REPLACEMENT" || viewingCase.replacementShipment) && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Truck size={18} weight="bold" className="text-blue-600" />
                      <strong className="text-slate-800">Pelacakan Logistik Penggantian Unit Baru</strong>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      {viewingCase.replacementShipment?.shippingStatus === "DELIVERED" || viewingCase.mainStatus === "COMPLETED"
                        ? "Tiba di Tujuan"
                        : viewingCase.replacementShipment?.shippingStatus === "SHIPPED"
                        ? "Dalam Pengiriman"
                        : "Sedang Dikemas"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">Kurir Pengiriman:</span>
                      <strong className="text-slate-800 text-xs">
                        {viewingCase.replacementShipment?.shippingMethod === "KURIR_TOKO" || viewingCase.replacementShipment?.courierName === "Kurir Toko"
                          ? "Kurir Internal Toko"
                          : "GoSend Instant"}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">Nama Pengirim / Driver:</span>
                      <strong className="text-slate-800 text-xs">
                        {viewingCase.replacementShipment?.driverName || (viewingCase.replacementShipment?.shippingMethod === "KURIR_TOKO" ? "Kurir Toko" : "Pak Joko (Driver GoSend)")}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">Nomor Telepon:</span>
                      <span className="font-mono text-slate-800 font-bold text-xs">
                        {viewingCase.replacementShipment?.driverPhone || "0812-3456-7890"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">Biaya Ongkir:</span>
                      <span className="text-emerald-700 font-extrabold text-xs">
                        Rp0 (Garansi Toko)
                      </span>
                    </div>
                  </div>

                  {/* Jika GoSend, tampilkan tombol Live Tracking Gojek */}
                  {viewingCase.replacementShipment?.trackingUrl && (viewingCase.replacementShipment.shippingMethod === "GOSEND" || viewingCase.replacementShipment.courierName?.toLowerCase().includes("gosend")) && (
                    <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-600">Pantau posisi kurir Gojek secara real-time:</span>
                      <a
                        href={viewingCase.replacementShipment.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-2xs"
                      >
                        <MapPin size={14} weight="bold" />
                        <span>Buka Live Tracking Gojek</span>
                      </a>
                    </div>
                  )}

                  {viewingCase.replacementShipment?.notes && (
                    <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/50">
                      Catatan Toko: {viewingCase.replacementShipment.notes}
                    </p>
                  )}
                </div>
              )}

              {/* 2. Service Rework Job Card */}
              {(viewingCase.approvedSolution === "REPAIR" || (viewingCase.approvedSolution as any) === "REWORK" || viewingCase.warrantyJob) && (
                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-purple-200">
                    <div className="flex items-center gap-2">
                      <Wrench size={18} weight="bold" className="text-purple-600" />
                      <strong className="text-slate-800">Pengerjaan Ulang Teknisi Resmi (Warranty Work Rp 0)</strong>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                      {viewingCase.warrantyJob?.operationalStatus === "DONE" || viewingCase.mainStatus === "COMPLETED"
                        ? "Pekerjaan Selesai"
                        : viewingCase.warrantyJob?.operationalStatus === "IN_PROGRESS"
                        ? "Sedang Dikerjakan di Lokasi"
                        : viewingCase.warrantyJob?.operationalStatus === "OTW"
                        ? "Teknisi Menuju Lokasi (OTW)"
                        : viewingCase.warrantyJob?.operationalStatus === "ACCEPTED"
                        ? "Teknisi Menerima Tugas"
                        : "Teknisi Ditugaskan"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-medium">Teknisi Bertugas:</span>
                      <strong className="text-slate-800 text-xs">
                        {viewingCase.warrantyJob?.workerName || "Ahmad Fauzi (Teknisi Senior)"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-medium">Jadwal Kunjungan:</span>
                      <span className="text-slate-700 font-medium text-xs">
                        {viewingCase.warrantyJob?.scheduledDate || "Besok, 13:00 WIB"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-medium">Biaya Jasa:</span>
                      <strong className="text-emerald-700 text-xs font-extrabold">Rp 0 (Garansi Resmi)</strong>
                    </div>
                  </div>
                  {viewingCase.warrantyJob?.completionEvidence && (
                    <div className="p-2.5 bg-white rounded-xl border border-purple-200 text-xs text-slate-700 mt-2">
                      <span className="text-purple-950 font-bold block mb-1">Bukti Penyelesaian Teknisi:</span>
                      <p className="font-mono text-[11px] bg-purple-50/50 p-2 rounded-lg">{viewingCase.warrantyJob.completionEvidence}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Refund Breakdown Card */}
              {(viewingCase.approvedSolution === "REFUND" || viewingCase.refundTrack) && (
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                    <div className="flex items-center gap-2">
                      <Bank size={18} weight="bold" className="text-emerald-600" />
                      <strong className="text-slate-800">Pengembalian Dana (Refund ke Saldo S-Pay)</strong>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {viewingCase.mainStatus === "COMPLETED" || viewingCase.refundTrack?.status === "SUCCEEDED"
                        ? "Dana Berhasil Masuk"
                        : "Diproses Finance 06"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-medium">Nominal Pengembalian:</span>
                      <strong className="text-emerald-800 text-sm font-bold">
                        Rp {Number(viewingCase.refundTrack?.totalRefund || viewingCase.itemPrice).toLocaleString("id-ID")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-medium">Tujuan Pengembalian:</span>
                      <span className="text-slate-700 font-medium text-xs">Saldo S-Pay Pelanggan</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-medium">Verifikasi Otomatis:</span>
                      <span className="text-slate-500 text-[10px]">Tuntas saat Finance 06 mencatat sukses</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Alternative Proposal Banner (if offered) */}
              {viewingCase.specialCondition === "WAITING_CUSTOMER_APPROVAL" && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2 text-amber-900">
                    <WarningCircle size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-amber-950 font-bold">Mitra Menawarkan Solusi Alternatif</strong>
                      <p className="text-[11px] mt-0.5">
                        Mitra menawarkan penyesuaian solusi penanganan. Anda berhak menyetujui atau menolak tawaran ini.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end pt-2 border-t border-amber-200">
                    <button
                      type="button"
                      onClick={() => handleRejectProposal(viewingCase.id)}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-xl transition cursor-pointer"
                    >
                      Tolak Tawaran
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAcceptProposal(viewingCase.id)}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition shadow-xs cursor-pointer"
                    >
                      Setujui Tawaran
                    </button>
                  </div>
                </div>
              )}

              {/* 5. Additional Evidence Request Form (WAITING_CUSTOMER_INFO) */}
              {viewingCase.specialCondition === "WAITING_CUSTOMER_INFO" && (
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-300 space-y-3 text-xs">
                  <div className="flex items-start gap-2 text-sky-900">
                    <Info size={18} weight="fill" className="text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-sky-950 font-bold">Mitra Meminta Bukti Tambahan</strong>
                      <p className="text-[11px] mt-0.5 text-sky-800">
                        Mitra memerlukan foto / informasi tambahan untuk meninjau klaim garansi Anda. Batas SLA 72 jam tetap berlaku pada pengajuan yang sama.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-sky-200/80 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Tautan Foto atau Catatan Bukti Tambahan:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={additionalEvidenceText}
                        onChange={(e) => setAdditionalEvidenceText(e.target.value)}
                        placeholder="Contoh: https://example.com/foto-bukti.jpg atau deskripsi komponen..."
                        className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        disabled={isSubmittingEvidence}
                        onClick={() => handleAddEvidence(viewingCase.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        {isSubmittingEvidence ? "Mengirim..." : "Kirim Bukti"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. 72 Hours SLA Breach Banner (NO_RESPONSE) */}
              {(viewingCase.isNoResponse || viewingCase.specialCondition === "NO_RESPONSE") && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2 text-rose-900">
                    <WarningCircle size={18} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-rose-950 font-bold">Batas Waktu Respons 72 Jam Terlewati</strong>
                      <p className="text-[11px] mt-0.5 text-rose-800">
                        {viewingCase.reportedToSupport
                          ? `Laporan kendala telah diteruskan ke Tim Mediasi & Perlindungan Konsumen SERVIO (Ref: ${viewingCase.reportDetails?.reportId || viewingCase.caseNumber}).`
                          : "Mitra belum memberikan tanggapan dalam 3x24 jam kalender. Anda dapat melaporkan masalah ini langsung ke tim mediasi SERVIO."}
                      </p>
                    </div>
                  </div>
                  {!viewingCase.reportedToSupport && (
                    <div className="flex items-center justify-end pt-2 border-t border-rose-200">
                      <button
                        type="button"
                        onClick={() => handleReportIssue(viewingCase.id)}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                      >
                        Laporkan Masalah ke CS SERVIO
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Issue Details & Evidence */}
              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                  Rincian Kendala yang Anda Laporkan:
                </span>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Keluhan / Gejala Utama:</span>
                    <strong className="text-slate-800 font-semibold">{viewingCase.issueReason}</strong>
                  </div>
                  {viewingCase.issueDescription && (
                    <div>
                      <span className="text-slate-400 text-[11px] block">Deskripsi Detail:</span>
                      <p className="text-slate-700 leading-relaxed text-xs">{viewingCase.issueDescription}</p>
                    </div>
                  )}

                  {viewingCase.evidenceMedia && viewingCase.evidenceMedia.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-slate-400 text-[11px] block mb-1.5">Foto Bukti Kerusakan:</span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {viewingCase.evidenceMedia.map((mediaUrl, idx) => (
                          <img
                            key={idx}
                            src={mediaUrl}
                            alt={`Bukti ${idx + 1}`}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-400 text-[11px]">
                  Batas respon mitra 3x24 jam kalender dilindungi garansi SERVIO.
                </span>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setViewingCase(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Tutup
                  </button>

                  {/* Final Customer Verification Button before Case can be completed */}
                  {viewingCase.mainStatus === "IN_RESOLUTION" && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await customerConfirmCompletion(viewingCase.id, "CUSTOMER_VERIFIED_COMPLETION");
                          showToast("Verifikasi selesai! Kasus klaim tuntas dan hak garansi selesai.");
                          setViewingCase(null);
                        } catch (err: any) {
                          showToast(err?.message || "Gagal mengonfirmasi penyelesaian.");
                        }
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Check size={14} weight="bold" />
                      <span>{viewingCase.caseType === "claim_service" ? "Konfirmasi Hasil Pekerjaan Tuntas" : "Konfirmasi Penerimaan Unit Baru"}</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Warranty Claim Submission Modal */}
      {claimModalWarranty && (
        <WarrantyClaimModal
          isOpen={!!claimModalWarranty}
          onClose={() => setClaimModalWarranty(null)}
          warranty={claimModalWarranty}
          onSuccess={(caseId) => {
            setActiveTab("submissions");
            showToast("Pengajuan garansi berhasil dikirim! Kasus telah masuk ke tab Pengajuan.");
            const newCase = getCaseById(caseId);
            if (newCase) {
              setViewingCase(newCase);
            }
          }}
        />
      )}
    </div>
  );
}

export default function CustomerWarrantiesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Memuat Garansi & Perlindungan...</div>}>
      <CustomerWarrantiesAndSubmissionsContent />
    </Suspense>
  );
}
