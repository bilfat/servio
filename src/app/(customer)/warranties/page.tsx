"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Package,
  Wrench,
  Clock,
  WarningCircle,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
  ArrowRight,
  MagnifyingGlass,
  Funnel,
  FileText,
  SlidersHorizontal,
  Info,
  CalendarCheck,
  Eye,
} from "@phosphor-icons/react";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { CustomerWarrantyEntitlement, AfterSalesCase } from "@/types/afterSales";
import { AfterSalesCaseDetail } from "@/components/features/afterSales/AfterSalesCaseDetail";
import { WarrantyClaimModal } from "@/components/features/afterSales/WarrantyClaimModal";
import { WarrantyDetailTwoGrid } from "@/components/features/afterSales/WarrantyDetailTwoGrid";

type MainTab = "active" | "submissions" | "expired";
type CaseTypeFilter = "ALL" | "claim_product" | "claim_service" | "return_product";
type CaseStatusFilter = "ALL" | "IN_PROGRESS" | "COMPLETED" | "REJECTED" | "NO_RESPONSE";
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

  const initialTab = (searchParams.get("tab") as MainTab) || "active";
  const initialCaseId = searchParams.get("caseId") || null;
  const initialType = searchParams.get("type") as CaseTypeFilter || "ALL";

  const [activeTab, setActiveTab] = useState<MainTab>(
    initialTab === "submissions" || initialTab === "expired" ? initialTab : "active"
  );
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(initialCaseId);

  // Filters for Tab 1 & Tab 3 (Warranties)
  const [warrantyFilter, setWarrantyFilter] = useState<ItemTypeFilter>("ALL");
  const [warrantySearch, setWarrantySearch] = useState("");

  // Filters for Tab 2 (Submissions)
  const [caseTypeFilter, setCaseTypeFilter] = useState<CaseTypeFilter>(initialType);
  const [caseStatusFilter, setCaseStatusFilter] = useState<CaseStatusFilter>("ALL");
  const [submissionSearch, setSubmissionSearch] = useState("");

  // Warranty Claim Modal state
  const [claimModalWarranty, setClaimModalWarranty] = useState<CustomerWarrantyEntitlement | null>(null);

  // Warranty Detail Sheet / Modal state
  const [viewingWarranty, setViewingWarranty] = useState<CustomerWarrantyEntitlement | null>(null);

  const { warranties, cases, getCaseById } = useAfterSales();

  useEffect(() => {
    const tabParam = searchParams.get("tab") as MainTab;
    if (tabParam && ["active", "submissions", "expired"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    const cId = searchParams.get("caseId");
    if (cId) {
      setSelectedCaseId(cId);
    }
  }, [searchParams]);

  // Tab 1: Active Warranties (Strictly only active, unconsumed, claim-eligible warranties)
  const activeWarranties = warranties.filter((w) => {
    const isEligible = w.isClaimEligible !== false;
    const hasRemaining = w.remainingQuantity === undefined || w.remainingQuantity > 0;
    const notConsumed = w.status === "ACTIVE" && w.activeCaseStatus !== "COMPLETED";
    if (!w.isActive || !isEligible || !hasRemaining || !notConsumed) {
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

  // Tab 3: Expired Warranties (Entitlements that expired without being claimed)
  const expiredWarranties = warranties.filter((w) => {
    const isExpired = !w.isActive || w.status === "EXPIRED" || (w.remainingDays !== undefined && w.remainingDays <= 0);
    const unclaimed = !(w as any).claimedQuantity || (w as any).claimedQuantity === 0;
    const notConsumed = w.status !== "CONSUMED" && w.activeCaseStatus !== "COMPLETED";
    if (!isExpired || !unclaimed || !notConsumed) {
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

  // Tab 2: Unified Submissions (Claims + Returns)
  const filteredSubmissions = cases.filter((c) => {
    // Type Filter
    if (caseTypeFilter !== "ALL" && c.caseType !== caseTypeFilter) return false;

    // Status Filter
    if (caseStatusFilter === "NO_RESPONSE" && !c.isNoResponse) return false;
    if (caseStatusFilter === "IN_PROGRESS" && (c.mainStatus === "COMPLETED" || c.mainStatus === "REJECTED")) return false;
    if (caseStatusFilter === "COMPLETED" && c.mainStatus !== "COMPLETED") return false;
    if (caseStatusFilter === "REJECTED" && c.mainStatus !== "REJECTED") return false;

    // Search query
    if (
      submissionSearch &&
      !c.itemTitle.toLowerCase().includes(submissionSearch.toLowerCase()) &&
      !c.caseNumber.toLowerCase().includes(submissionSearch.toLowerCase()) &&
      !c.organizationName.toLowerCase().includes(submissionSearch.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // If a case is selected, render the unified detail page!
  if (selectedCaseId) {
    const currentCase = getCaseById(selectedCaseId);
    if (currentCase) {
      const parentWarranty = warranties.find(
        (w) =>
          w.id === currentCase.warrantyId ||
          w.orderId === currentCase.sourceOrderId ||
          (w.cases && w.cases.some((wc: any) => wc.id === currentCase.id))
      );

      if (parentWarranty) {
        return (
          <WarrantyDetailTwoGrid
            warranty={parentWarranty}
            initialCaseId={currentCase.id}
            onBack={() => {
              setSelectedCaseId(null);
              router.push("/warranties?tab=submissions");
            }}
            backHref="/warranties?tab=submissions"
          />
        );
      }

      return (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AfterSalesCaseDetail
            caseData={currentCase}
            onBack={() => {
              setSelectedCaseId(null);
              router.push("/warranties?tab=submissions");
            }}
          />
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  Layanan Purnajual Terpadu
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-2">
                Garansi & Pengajuan
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Pantau hak garansi toko dan layanan, ajukan klaim perbaikan, ajukan retur barang bermasalah, serta lacak status pengembalian dana dalam satu pusat terpadu.
              </p>
            </div>
          </div>

          {/* 3 Main Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 -mb-px">
            <button
              type="button"
              onClick={() => {
                setActiveTab("active");
                router.push("/warranties?tab=active");
              }}
              className={`pb-3.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === "active"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <ShieldCheck size={16} weight="bold" />
              Garansi Aktif
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-sky/40 text-primary font-bold">
                {activeWarranties.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("submissions");
                router.push("/warranties?tab=submissions");
              }}
              className={`pb-3.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === "submissions"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <ArrowsClockwise size={16} weight="bold" />
              Pengajuan (Klaim & Retur)
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                {cases.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("expired");
                router.push("/warranties?tab=expired");
              }}
              className={`pb-3.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === "expired"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Clock size={16} weight="bold" />
              Berakhir
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
                {expiredWarranties.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck size={26} weight="fill" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Garansi Aktif
              </span>
              <div className="text-xl font-bold font-display text-slate-900 mt-0.5">
                {activeWarranties.length} Hak Perlindungan
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Siap diklaim jika terdapat kendala
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <ArrowsClockwise size={26} weight="bold" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Pengajuan Berjalan
              </span>
              <div className="text-xl font-bold font-display text-slate-900 mt-0.5">
                {cases.filter((c) => c.mainStatus !== "COMPLETED" && c.mainStatus !== "REJECTED" && c.mainStatus !== "CANCELLED").length} Kasus Aktif
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dalam peninjauan & penyelesaian SLA 72 jam
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <WarningCircle size={26} weight="fill" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Perlu Respon Anda
              </span>
              <div className="text-xl font-bold font-display text-slate-900 mt-0.5">
                {cases.filter((c) => c.specialCondition === "WAITING_CUSTOMER_INFO" || c.specialCondition === "WAITING_CUSTOMER_APPROVAL" || c.isNoResponse).length} Menunggu Aksi
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Unggah bukti tambahan atau respon proposal solusi
              </p>
            </div>
          </div>
        </div>

        {/* TAB 1: GARANSI AKTIF */}
        {activeTab === "active" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Filter Jenis:</span>
                {(["ALL", "PRODUCT", "SERVICE"] as ItemTypeFilter[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setWarrantyFilter(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      warrantyFilter === type
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {type === "ALL" ? "Semua" : type === "PRODUCT" ? "Barang" : "Jasa"}
                  </button>
                ))}
              </div>

              <div className="relative">
                <MagnifyingGlass size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari garansi / usaha..."
                  value={warrantySearch}
                  onChange={(e) => setWarrantySearch(e.target.value)}
                  className="w-full sm:w-60 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* List */}
            {activeWarranties.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <ShieldCheck size={36} className="mx-auto text-slate-300" />
                <h3 className="font-bold text-sm text-slate-700">Belum Ada Garansi Usaha Aktif</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Belum ada hak garansi toko atau layanan yang aktif untuk akun Anda. Hak perlindungan konsumen Anda tetap berlaku untuk pesanan selesai.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeWarranties.map((w) => (
                  <div
                    key={w.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {w.itemImageUrl && (
                            <img
                              src={w.itemImageUrl}
                              alt={w.itemTitle}
                              className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shrink-0 bg-slate-50 shadow-xs"
                            />
                          )}
                          <div className="space-y-1 min-w-0 flex-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                w.itemType === "PRODUCT"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}
                            >
                              {w.itemType === "PRODUCT" ? <Package size={12} weight="bold" /> : <Wrench size={12} weight="bold" />}
                              {w.itemType === "PRODUCT" ? "Garansi Toko Barang" : "Garansi Layanan Jasa"}
                            </span>
                            <h3 className="font-bold text-sm text-slate-900 line-clamp-2" title={w.itemTitle}>
                              {w.itemTitle}
                            </h3>
                            <p className="text-xs text-slate-500 truncate">
                              <span className="font-semibold text-slate-700">{w.organizationName}</span>
                              {" • "}
                              <span className="text-slate-400">Ref: #{w.orderNumber}</span>
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          Aktif
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Pilihan Garansi:</span>
                          <span className="font-bold text-slate-800">{w.presetName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Durasi:</span>
                          <span className="font-bold text-primary">{w.durationDays} Hari Kalender</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Mulai Berlaku:</span>
                          <span className="font-medium text-slate-700">{formatDisplayDate(w.startDate)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Berlaku Sampai:</span>
                          <span className="font-semibold text-emerald-800">{formatDisplayDate(w.endDate)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                          <span className="text-slate-400">Sisa Masa Berlaku:</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                            {w.remainingDays !== undefined ? `${w.remainingDays} Hari` : `${Math.max(0, Math.ceil((new Date(w.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} Hari`}
                          </span>
                        </div>
                        {((w.quantity && w.quantity > 1) || (w.remainingQuantity !== undefined && w.remainingQuantity > 1)) && (
                          <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                            <span className="text-slate-400">Unit Tersedia:</span>
                            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-[11px]">
                              {w.remainingQuantity ?? w.quantity} dari {w.quantity} Unit
                            </span>
                          </div>
                        )}
                        {w.coverage && (
                          <div className="pt-1.5 border-t border-slate-200/60">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cakupan Garansi:</span>
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                              {w.coverage}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                      <Link
                        href={`/warranties/${w.id}`}
                        className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
                      >
                        <FileText size={14} weight="bold" />
                        Detail Garansi
                      </Link>

                      <button
                        type="button"
                        onClick={() => setClaimModalWarranty(w)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        Ajukan Klaim
                        <ArrowRight size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PENGAJUAN (KLAIM GARANSI & RETUR BARANG TERPADU) */}
        {activeTab === "submissions" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Jenis Kasus:</span>
                  {(
                    [
                      { id: "ALL", label: "Semua" },
                      { id: "claim_product", label: "Klaim Barang" },
                      { id: "claim_service", label: "Klaim Jasa" },
                      { id: "return_product", label: "Retur Barang" },
                    ] as const
                  ).map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setCaseTypeFilter(type.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        caseTypeFilter === type.id
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <MagnifyingGlass size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari kasus / item..."
                    value={submissionSearch}
                    onChange={(e) => setSubmissionSearch(e.target.value)}
                    className="w-full sm:w-60 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500">Status:</span>
                {(
                  [
                    { id: "ALL", label: "Semua" },
                    { id: "IN_PROGRESS", label: "Berjalan" },
                    { id: "COMPLETED", label: "Selesai" },
                    { id: "REJECTED", label: "Ditolak" },
                    { id: "NO_RESPONSE", label: "Tidak Ditanggapi" },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setCaseStatusFilter(st.id)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      caseStatusFilter === st.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submissions List */}
            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <ArrowsClockwise size={36} className="mx-auto text-slate-300" />
                <h3 className="font-bold text-sm text-slate-700">Belum Ada Pengajuan</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Belum ada pengajuan klaim garansi atau retur yang sesuai filter. Ajukan masalah melalui detail pesanan atau garansi yang aktif.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4.5">
                {filteredSubmissions.map((c) => {
                  const isClaimProduct = c.caseType === "claim_product";
                  const isClaimService = c.caseType === "claim_service";

                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isClaimProduct
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : isClaimService
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {isClaimProduct
                              ? "Klaim Garansi Barang"
                              : isClaimService
                              ? "Klaim Garansi Jasa"
                              : "Retur Barang"}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-400">
                            #{c.caseNumber}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-semibold text-slate-600">
                            Order #{c.sourceOrderNumber}
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-slate-900">{c.itemTitle}</h3>

                        <p className="text-xs text-slate-500 line-clamp-1">
                          Masalah: <strong className="text-slate-700">{c.issueReason}</strong> • Usaha: {c.organizationName}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                          <span>Diajukan: {new Date(c.submittedAt).toLocaleDateString("id-ID")}</span>
                          {c.approvedSolution && (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Solusi: {c.approvedSolution}
                            </span>
                          )}
                          {c.specialCondition === "WAITING_CUSTOMER_APPROVAL" && (
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              Menunggu Persetujuan Solusi Anda
                            </span>
                          )}
                          {c.refundDetail && (
                            <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                              Refund Rp{c.refundDetail.totalRefund.toLocaleString("id-ID")} ({c.refundDetail.status})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
                        {c.isNoResponse ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white border border-amber-600">
                            TIDAK DITANGGAPI
                          </span>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border ${
                              c.mainStatus === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : c.mainStatus === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : c.mainStatus === "IN_RESOLUTION"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-sky-50 text-sky-700 border-sky-200"
                            }`}
                          >
                            {c.mainStatus === "COMPLETED"
                              ? "Selesai"
                              : c.mainStatus === "REJECTED"
                              ? "Ditolak"
                              : c.mainStatus === "IN_RESOLUTION"
                              ? "Dalam Penyelesaian"
                              : "Diajukan"}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const parentW = warranties.find(
                              (w) =>
                                w.id === c.warrantyId ||
                                w.orderId === c.sourceOrderId ||
                                (w.cases && w.cases.some((wc: any) => wc.id === c.id))
                            );
                            if (parentW) {
                              router.push(`/warranties/${parentW.id}?caseId=${c.id}`);
                            } else {
                              setSelectedCaseId(c.id);
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          Lihat Detail Pengajuan
                          <ArrowRight size={14} weight="bold" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BERAKHIR */}
        {activeTab === "expired" && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <Info size={18} weight="fill" className="shrink-0 text-amber-600" />
              <span>
                Garansi usaha di bawah ini telah melewati masa aktif. Riwayat klaim yang diajukan tepat waktu tetap dapat dibuka. Hak perlindungan hukum konsumen tetap dihormati.
              </span>
            </div>

            {expiredWarranties.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <Clock size={36} className="mx-auto text-slate-300" />
                <h3 className="font-bold text-sm text-slate-700">Belum Ada Garansi Berakhir</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Semua garansi usaha Anda saat ini masih aktif atau belum kedaluwarsa.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {expiredWarranties.map((w) => (
                  <div
                    key={w.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm opacity-85 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {w.itemImageUrl && (
                            <img
                              src={w.itemImageUrl}
                              alt={w.itemTitle}
                              className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shrink-0 bg-slate-50 grayscale"
                            />
                          )}
                          <div className="space-y-1 min-w-0 flex-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {w.itemType === "PRODUCT" ? <Package size={12} weight="bold" /> : <Wrench size={12} weight="bold" />}
                              {w.itemType === "PRODUCT" ? "Garansi Toko Barang" : "Garansi Layanan Jasa"}
                            </span>
                            <h3 className="font-bold text-sm text-slate-800 line-clamp-2">{w.itemTitle}</h3>
                            <p className="text-xs text-slate-500 truncate">
                              <span className="font-semibold text-slate-700">{w.organizationName}</span>
                              {" • "}
                              <span className="text-slate-400">Ref: #{w.orderNumber}</span>
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                          Berakhir
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1.5 border border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Pilihan Garansi:</span>
                          <span className="font-medium text-slate-700">{w.presetName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Durasi:</span>
                          <span className="text-slate-600">{w.durationDays} Hari Kalender</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Periode:</span>
                          <span className="text-slate-600">
                            {formatDisplayDate(w.startDate)} s.d. {formatDisplayDate(w.endDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <Link
                        href={`/warranties/${w.id}`}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center gap-1.5"
                      >
                        <FileText size={14} weight="bold" />
                        Detail Riwayat Garansi
                      </Link>
                      <span className="text-slate-400 text-[11px] italic">Garansi Usaha Telah Habis</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Claim Modal */}
      {claimModalWarranty && (
        <WarrantyClaimModal
          isOpen={!!claimModalWarranty}
          onClose={() => setClaimModalWarranty(null)}
          warranty={claimModalWarranty}
          onSuccess={(caseId) => {
            setActiveTab("submissions");
            setSelectedCaseId(caseId);
            router.push(`/warranties?tab=submissions&caseId=${caseId}`);
          }}
        />
      )}

      {/* Warranty Detail Modal */}
      <AnimatePresence>
        {viewingWarranty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                  <ShieldCheck size={22} weight="fill" className="text-primary" />
                  <span>Rincian Cakupan & Janji Garansi</span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingWarranty(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-start gap-3">
                  {viewingWarranty.itemImageUrl && (
                    <img
                      src={viewingWarranty.itemImageUrl}
                      alt={viewingWarranty.itemTitle}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0 bg-slate-50"
                    />
                  )}
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                      Item / Jasa Terlindungi:
                    </span>
                    <strong className="text-slate-900 text-sm block leading-snug">{viewingWarranty.itemTitle}</strong>
                    <p className="text-xs text-slate-500">
                      <span>{viewingWarranty.organizationName}</span> • <span className="font-mono text-slate-400">Order #{viewingWarranty.orderNumber}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Pilihan Garansi:</span>
                    <p className="font-bold text-slate-800">{viewingWarranty.presetName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Durasi Garansi:</span>
                    <p className="font-bold text-primary">{viewingWarranty.durationDays} Hari Kalender</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Tanggal Mulai:</span>
                    <p className="font-semibold text-slate-700">{formatDisplayDate(viewingWarranty.startDate)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Berlaku Sampai:</span>
                    <p className="font-semibold text-emerald-800">{formatDisplayDate(viewingWarranty.endDate)}</p>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Sisa Masa Berlaku:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                      {viewingWarranty.remainingDays !== undefined ? `${viewingWarranty.remainingDays} Hari Kalender` : `${Math.max(0, Math.ceil((new Date(viewingWarranty.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} Hari Kalender`}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-700 block">Cakupan yang Ditanggung:</span>
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-600 leading-relaxed">
                    {viewingWarranty.coverage}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-700 block">Syarat & Ketentuan:</span>
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-600 leading-relaxed">
                    {viewingWarranty.terms}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <Link
                  href={`/warranties/${viewingWarranty.id}`}
                  onClick={() => setViewingWarranty(null)}
                  className="px-4 py-2 text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
                >
                  <Eye size={15} weight="bold" />
                  Buka Tampilan Penuh Dua Grid
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingWarranty(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Tutup
                  </button>
                  {viewingWarranty.isActive && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingWarranty;
                        setViewingWarranty(null);
                        setClaimModalWarranty(target);
                      }}
                      className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm cursor-pointer"
                    >
                      Ajukan Klaim Sekarang
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CustomerWarrantiesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Memuat Garansi & Pengajuan...</div>}>
      <CustomerWarrantiesAndSubmissionsContent />
    </Suspense>
  );
}
