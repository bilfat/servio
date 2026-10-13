"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldCheck,
  ShieldWarning,
  CheckCircle,
  WarningCircle,
  XCircle,
  Clock,
  Package,
  User,
  ArrowRight,
  ArrowsClockwise,
  MagnifyingGlass,
  Funnel,
  Camera,
  Receipt,
  Truck,
  Wrench,
  ChatCircleDots,
} from "@phosphor-icons/react";
import { warrantiesApi, productsApi } from "@/lib/servioApi";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/feedback/Toast";

interface WarrantyClaimItem {
  claimId: string;
  claimNumber: string;
  warrantyId: string;
  orderId?: string;
  customerId: string;
  customerName?: string;
  productName?: string;
  variantName?: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "NEED_MORE_INFORMATION" | "INSPECTION_REQUIRED" | "APPROVED" | "REJECTED" | "IN_SERVICE" | "REPLACEMENT_PROCESS" | "COMPLETED";
  reason: string;
  description?: string;
  needMoreInfoPrompt?: string;
  customerNotes?: string;
  rejectionReason?: string;
  evidenceMedia?: Array<{ url: string; description?: string }>;
  submittedAt?: string;
  reviewedAt?: string;
}

export default function MerchantWarrantyPage() {
  const [activeTab, setActiveTab] = useState<"ENTITLEMENTS" | "CLAIMS" | "POLICIES">("ENTITLEMENTS");
  const [claims, setClaims] = useState<WarrantyClaimItem[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [entitlements, setEntitlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review Modal State
  const [selectedClaimForReview, setSelectedClaimForReview] = useState<WarrantyClaimItem | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "REJECTED" | "NEED_MORE_INFORMATION" | "INSPECTION_REQUIRED">("APPROVED");
  const [rejectionReason, setRejectionReason] = useState("");
  const [needMoreInfoPrompt, setNeedMoreInfoPrompt] = useState("");

  // Inspection Modal State
  const [selectedClaimForInspect, setSelectedClaimForInspect] = useState<WarrantyClaimItem | null>(null);
  const [inspectionResult, setInspectionResult] = useState<"DEFECT_CONFIRMED" | "NO_DEFECT_FOUND" | "USER_DAMAGE_EXCLUDED" | "INCONCLUSIVE">("DEFECT_CONFIRMED");
  const [inspectionNotes, setInspectionNotes] = useState("");

  // Resolution Modal State
  const [selectedClaimForResolution, setSelectedClaimForResolution] = useState<WarrantyClaimItem | null>(null);
  const [resolutionType, setResolutionType] = useState<"REPLACEMENT" | "REPAIR" | "REWORK" | "REFUND">("REPAIR");
  const [resolutionAmount, setResolutionAmount] = useState<number>(0);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [immediateCompletion, setImmediateCompletion] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [claimRes, prodRes, entRes] = await Promise.all([
        warrantiesApi.listClaims().catch(() => ({ data: [] })),
        productsApi.list({ scope: "merchant" }).catch(() => ({ data: [] })),
        warrantiesApi.list().catch(() => ({ data: [] })),
      ]);

      // Extract entitlements and policies from actual merchant catalog
      const productList = prodRes.data || [];
      const extractedPolicies = productList
        .filter((p: any) => p.warrantyPolicy && p.warrantyPolicy.durationMonths)
        .map((p: any) => ({
          productId: p.productId,
          productName: p.name,
          category: p.categoryName || p.categoryId,
          policy: p.warrantyPolicy,
        }));
      setPolicies(extractedPolicies);

      // Authoritative Claims from Backend API (No fake/mock fallback!)
      if (claimRes && Array.isArray(claimRes.data)) {
        setClaims(claimRes.data);
      } else {
        setClaims([]);
      }

      // Authoritative Entitlements (Step 9 Canonical Snapshot)
      if (entRes && Array.isArray(entRes.data)) {
        setEntitlements(entRes.data);
      } else {
        setEntitlements([]);
      }
    } catch (err) {
      console.warn("Failed loading merchant warranty data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForReview) return;
    try {
      await warrantiesApi.reviewClaim(
        selectedClaimForReview.claimId,
        reviewAction,
        reviewAction === "REJECTED" ? rejectionReason : undefined,
        (reviewAction === "NEED_MORE_INFORMATION" || reviewAction === "INSPECTION_REQUIRED") ? needMoreInfoPrompt : undefined
      );
      setToastMessage(`Klaim #${selectedClaimForReview.claimNumber} berhasil diperbarui menjadi ${reviewAction}!`);
      setSelectedClaimForReview(null);
      setRejectionReason("");
      setNeedMoreInfoPrompt("");
      loadData();
    } catch (err: any) {
      setToastMessage(err.message || "Gagal memperbarui status review.");
    }
  };

  const handleInspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForInspect) return;
    try {
      await warrantiesApi.recordInspection(selectedClaimForInspect.claimId, {
        result: inspectionResult,
        notes: inspectionNotes.trim() || "Inspeksi fisik teknis unit produk selesai dilaksanakan.",
      });
      setToastMessage(`Hasil inspeksi untuk klaim #${selectedClaimForInspect.claimNumber} berhasil dicatat!`);
      setSelectedClaimForInspect(null);
      setInspectionNotes("");
      loadData();
    } catch (err: any) {
      setToastMessage(err.message || "Gagal mencatat hasil inspeksi.");
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForResolution) return;
    try {
      await warrantiesApi.resolveClaim(selectedClaimForResolution.claimId, {
        resolutionType,
        amount: resolutionType === "REFUND" ? Number(resolutionAmount) : undefined,
        description: resolutionNotes.trim() || `Penyelesaian garansi dengan solusi ${resolutionType}`,
        immediateCompletion,
      });

      const message = resolutionType === "REFUND"
        ? `Permohonan refund untuk klaim #${selectedClaimForResolution.claimNumber} berhasil diajukan ke Finance Payment Ops!`
        : `Klaim #${selectedClaimForResolution.claimNumber} berhasil diproses (${resolutionType})!`;

      setToastMessage(message);
      setSelectedClaimForResolution(null);
      setResolutionNotes("");
      loadData();
    } catch (err: any) {
      setToastMessage(err.message || "Gagal menyelesaikan klaim garansi.");
    }
  };

  const filteredEntitlements = useMemo(() => {
    return entitlements.filter((e) => {
      const matchStatus = statusFilter === "ALL" || e.status === statusFilter;
      const matchSearch =
        !searchQuery ||
        (e.warrantyId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.orderId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.productName || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [entitlements, statusFilter, searchQuery]);

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchSearch =
        !searchQuery ||
        c.claimNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.productName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.customerName || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [claims, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={20} className="text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={22} weight="bold" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  Operasional Garansi &amp; Klaim Produk (Warranty Management)
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tinjau garansi terbit dari transaksi terkirim, verifikasi pengajuan klaim pembeli, dan eksekusi resolusi resmi sesuai integritas historis.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === "ENTITLEMENTS" ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setActiveTab("ENTITLEMENTS");
                  setStatusFilter("ALL");
                }}
                className="flex items-center gap-1.5"
              >
                <span>Garansi Terbit ({entitlements.length})</span>
              </Button>
              <Button
                variant={activeTab === "CLAIMS" ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setActiveTab("CLAIMS");
                  setStatusFilter("ALL");
                }}
                className="flex items-center gap-1.5"
              >
                <span>Klaim Masuk ({claims.length})</span>
              </Button>
              <Button
                variant={activeTab === "POLICIES" ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setActiveTab("POLICIES");
                  setStatusFilter("ALL");
                }}
                className="flex items-center gap-1.5"
              >
                <span>Kebijakan Katalog ({policies.length})</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {activeTab === "ENTITLEMENTS" ? (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlass
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Cari nomor garansi, order ID, atau nama produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                {["ALL", "ACTIVE", "EXPIRED", "VOID"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      statusFilter === st
                        ? "bg-[#0F4C81] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {st === "ALL" ? "Semua Status" : st === "ACTIVE" ? "Aktif" : st === "EXPIRED" ? "Kedaluwarsa" : "Batal"}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-start gap-2.5">
              <ShieldCheck size={20} className="text-[#0F4C81] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">Integritas Historis Entitlement (Step 9 Canonical Snapshot)</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Daftar garansi yang terbit otomatis dari pesanan yang telah diterima pembeli. Data durasi, cakupan, dan masa berlaku merupakan salinan permanen (snapshot) yang tidak dapat dimutasi sepihak demi perlindungan konsumen.
                </p>
              </div>
            </div>

            {/* Entitlement Table / Cards */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {filteredEntitlements.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Package size={36} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Belum ada garansi produk yang terdaftar</p>
                  <p className="text-[11px] text-slate-500">
                    Garansi resmi akan otomatis terbit saat pembeli menerima barang pesanan toko Anda.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">No. Garansi / Order</th>
                      <th className="py-3 px-4">Produk &amp; Varian</th>
                      <th className="py-3 px-4">Masa Berlaku</th>
                      <th className="py-3 px-4">Cakupan / Pengecualian</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEntitlements.map((w: any) => (
                      <tr key={w.warrantyId} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 align-top">
                          <span className="font-mono font-bold text-slate-900 block">{w.warrantyId}</span>
                          <span className="font-mono text-[10px] text-slate-400">Order: #{w.orderId}</span>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <span className="font-bold text-slate-800 block">{w.productName}</span>
                          <span className="text-[11px] text-slate-500">Varian: {w.variantName || "Standard"}</span>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-semibold text-slate-700 block">
                              {w.startAt || "-"} s/d {w.endAt || "-"}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Durasi: {w.durationMonths} Bulan ({w.durationDays} Hari)
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top max-w-xs">
                          <div className="text-[11px] text-slate-600 line-clamp-2">
                            <strong className="text-slate-700">Cakupan:</strong> {w.coverage}
                          </div>
                          {w.exclusions && (
                            <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                              <strong>Pengecualian:</strong> {w.exclusions}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center align-top">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              w.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : w.status === "EXPIRED"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {w.status === "ACTIVE" ? "AKTIF" : w.status === "EXPIRED" ? "KEDALUWARSA" : w.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : activeTab === "CLAIMS" ? (
          <>
            {/* Filter and Search Bar with 8 Sub-navigation states (Section 21) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlass
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Cari nomor klaim, nama produk, atau nama pembeli..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {[
                  ["ALL", "Semua"],
                  ["SUBMITTED", "Menunggu Review"],
                  ["UNDER_REVIEW", "Dalam Review"],
                  ["NEED_MORE_INFORMATION", "Butuh Info"],
                  ["APPROVED", "Disetujui"],
                  ["IN_SERVICE", "Dalam Perbaikan"],
                  ["REPLACEMENT_PROCESS", "Tukar Unit"],
                  ["COMPLETED", "Selesai"],
                  ["REJECTED", "Ditolak"],
                ].map(([st, label]) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      statusFilter === st
                        ? "bg-[#0F4C81] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Claims Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
              {loading ? (
                <div className="p-16 text-center text-xs text-slate-400">Memuat klaim garansi toko...</div>
              ) : filteredClaims.length === 0 ? (
                <div className="p-16 text-center text-xs text-slate-400">
                  Tidak ada klaim garansi dengan kriteria filter saat ini.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="p-4 pl-6">No. Klaim &amp; Tanggal</th>
                      <th className="p-4">Produk / Varian</th>
                      <th className="p-4">Pembeli / Order</th>
                      <th className="p-4">Kendala yang Dilaporkan</th>
                      <th className="p-4">Status Klaim</th>
                      <th className="p-4 pr-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClaims.map((c) => (
                      <tr key={c.claimId} className="hover:bg-slate-50/60 transition">
                        <td className="p-4 pl-6">
                          <div className="font-mono font-bold text-slate-900">{c.claimNumber}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{c.submittedAt || "Hari Ini"}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800 line-clamp-1">{c.productName}</div>
                          <div className="text-[11px] text-slate-400">{c.variantName}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-700">{c.customerName || c.customerId}</div>
                          <div className="font-mono text-[10px] text-slate-400">Ref: #{c.orderId}</div>
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="font-semibold text-slate-800 line-clamp-1">{c.reason}</div>
                          {c.description && (
                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{c.description}</div>
                          )}
                          {c.customerNotes && (
                            <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded-lg mt-1 border border-amber-200">
                              <strong>Info Pembeli:</strong> {c.customerNotes}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              c.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : c.status === "APPROVED"
                                ? "bg-sky-50 text-sky-700 border-sky-200"
                                : c.status === "UNDER_REVIEW"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : c.status === "NEED_MORE_INFORMATION"
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : c.status === "INSPECTION_REQUIRED"
                                ? "bg-purple-100 text-purple-800 border-purple-300"
                                : c.status === "IN_SERVICE"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : c.status === "REPLACEMENT_PROCESS"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : c.status === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right space-x-2">
                          {(c.status === "SUBMITTED" || c.status === "UNDER_REVIEW") && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedClaimForReview(c);
                                setReviewAction("APPROVED");
                                setRejectionReason("");
                                setNeedMoreInfoPrompt("");
                              }}
                              className="text-[11px]"
                            >
                              Tinjau Klaim
                            </Button>
                          )}
                          {c.status === "INSPECTION_REQUIRED" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedClaimForInspect(c);
                                setInspectionResult("DEFECT_CONFIRMED");
                                setInspectionNotes("");
                              }}
                              className="bg-purple-50 text-purple-800 border-purple-200 text-[11px]"
                            >
                              Catat Hasil Inspeksi
                            </Button>
                          )}
                          {c.status === "NEED_MORE_INFORMATION" && (
                            <span className="text-[11px] text-amber-700 font-medium">
                              Menunggu Respon Pembeli
                            </span>
                          )}
                          {(c.status === "APPROVED" || c.status === "IN_SERVICE") && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSelectedClaimForResolution(c);
                                setResolutionType("REPAIR");
                                setImmediateCompletion(false);
                              }}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px]"
                            >
                              Tetapkan Resolusi
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          /* POLICIES TAB */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-1">
                Katalog Kebijakan Garansi Toko &amp; Manufaktur
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Kebijakan garansi yang dikonfigurasikan pada Step 7 pendaftaran katalog produk akan otomatis disnapshot ke setiap transaksi resmi.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {policies.map((p) => (
                  <div key={p.productId} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                        {p.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {p.policy.durationMonths} Bulan
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-xs line-clamp-1">{p.productName}</h3>

                    <div className="space-y-1.5 text-[11px] text-slate-600">
                      <div>
                        <strong className="text-slate-800">Cakupan:</strong> {p.policy.coverage}
                      </div>
                      <div>
                        <strong className="text-slate-800">Pengecualian:</strong> {p.policy.exclusions}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedClaimForReview && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedClaimForReview(null)}
          title={`Tinjau Klaim: #${selectedClaimForReview.claimNumber}`}
          description={`Pelanggan: ${selectedClaimForReview.customerName || selectedClaimForReview.customerId} • ${selectedClaimForReview.productName}`}
        >
          <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Masalah yang Dilaporkan:</span>
                <p className="font-semibold text-slate-800">{selectedClaimForReview.reason}</p>
              </div>
              {selectedClaimForReview.description && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Rincian Tambahan:</span>
                  <p className="text-slate-600">{selectedClaimForReview.description}</p>
                </div>
              )}
              {selectedClaimForReview.customerNotes && (
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                  <span className="block text-[10px] uppercase font-bold text-amber-700">Klarifikasi Pembeli:</span>
                  <p>{selectedClaimForReview.customerNotes}</p>
                </div>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Keputusan Review *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewAction("APPROVED")}
                  className={`p-2.5 rounded-xl border font-bold text-xs text-center transition ${
                    reviewAction === "APPROVED"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ✓ Setujui Klaim
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction("NEED_MORE_INFORMATION")}
                  className={`p-2.5 rounded-xl border font-bold text-xs text-center transition ${
                    reviewAction === "NEED_MORE_INFORMATION"
                      ? "bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-500"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ? Butuh Info Tambahan
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction("INSPECTION_REQUIRED")}
                  className={`p-2.5 rounded-xl border font-bold text-xs text-center transition ${
                    reviewAction === "INSPECTION_REQUIRED"
                      ? "bg-purple-50 border-purple-500 text-purple-800 ring-1 ring-purple-500"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  🔍 Butuh Inspeksi Teknis
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction("REJECTED")}
                  className={`p-2.5 rounded-xl border font-bold text-xs text-center transition ${
                    reviewAction === "REJECTED"
                      ? "bg-rose-50 border-rose-500 text-rose-800 ring-1 ring-rose-500"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ✕ Tolak Klaim
                </button>
              </div>
            </div>

            {reviewAction === "NEED_MORE_INFORMATION" && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">Permintaan Informasi Tambahan ke Pembeli *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Mohon sertakan foto nomor seri atau video singkat kendala komponen..."
                  value={needMoreInfoPrompt}
                  onChange={(e) => setNeedMoreInfoPrompt(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            )}

            {reviewAction === "INSPECTION_REQUIRED" && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">Instruksi Inspeksi Fisik Teknis *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Unit harus diperiksa fisik oleh tim teknisi resmi di workshop..."
                  value={needMoreInfoPrompt}
                  onChange={(e) => setNeedMoreInfoPrompt(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            )}

            {reviewAction === "REJECTED" && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">Alasan Penolakan Klaim *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Misal: Segel rusak / kerusakan fisik akibat jatuh..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedClaimForReview(null)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-[#0F4C81] text-white">
                Simpan Keputusan Review
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Technical Inspection Modal */}
      {selectedClaimForInspect && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedClaimForInspect(null)}
          title={`Catat Hasil Inspeksi: #${selectedClaimForInspect.claimNumber}`}
          description={`Pelanggan: ${selectedClaimForInspect.customerName || selectedClaimForInspect.customerId} • ${selectedClaimForInspect.productName}`}
        >
          <form onSubmit={handleInspectSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-1">
              <span className="text-purple-700 block text-[10px] uppercase font-bold">Instruksi Inspeksi:</span>
              <p className="font-medium text-purple-900">{selectedClaimForInspect.needMoreInfoPrompt || "Lakukan pengujian fisik dan fungsional terhadap komponen."}</p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Hasil Temuan Teknis *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInspectionResult("DEFECT_CONFIRMED")}
                  className={`p-2.5 rounded-xl border font-bold text-xs text-center transition ${
                    inspectionResult === "DEFECT_CONFIRMED"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ✓ Cacat Manufaktur Terkonfirmasi
                </button>
                <button
                  type="button"
                  onClick={() => setInspectionResult("NO_DEFECT_FOUND")}
                  className={`p-2.5 rounded-xl border font-bold text-xs text-center transition ${
                    inspectionResult === "NO_DEFECT_FOUND"
                      ? "bg-slate-100 border-slate-500 text-slate-800 ring-1 ring-slate-500"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ○ Tidak Ditemukan Malfungsi
                </button>
                <button
                  type="button"
                  onClick={() => setInspectionResult("USER_DAMAGE_EXCLUDED")}
                  className={`p-2.5 rounded-xl border font-bold text-xs text-center transition ${
                    inspectionResult === "USER_DAMAGE_EXCLUDED"
                      ? "bg-rose-50 border-rose-500 text-rose-800 ring-1 ring-rose-500"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ✕ Kerusakan Pemakaian (Pengecualian)
                </button>
                <button
                  type="button"
                  onClick={() => setInspectionResult("INCONCLUSIVE")}
                  className={`p-2.5 rounded-xl border font-bold text-xs text-center transition ${
                    inspectionResult === "INCONCLUSIVE"
                      ? "bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-500"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ? Belum Dapat Disimpulkan
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Catatan Hasil Pemeriksaan Teknis *</label>
              <textarea
                rows={3}
                required
                placeholder="Rincian nomor serial, kondisi segel, tegangan listrik, komponen yang terbakar..."
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedClaimForInspect(null)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-[#0F4C81] text-white">
                Simpan Hasil Inspeksi
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Resolution Modal */}
      {selectedClaimForResolution && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedClaimForResolution(null)}
          title={`Tetapkan Resolusi Garansi: #${selectedClaimForResolution.claimNumber}`}
          description="Pilih penyelesaian komitmen garansi sesuai cakupan perlindungan resmi"
        >
          <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tipe Solusi *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setResolutionType("REPAIR")}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    resolutionType === "REPAIR"
                      ? "bg-sky-50 border-[#0F4C81] text-[#0F4C81] font-bold ring-1 ring-[#0F4C81]"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  Perbaikan (Repair)
                </button>
                <button
                  type="button"
                  onClick={() => setResolutionType("REWORK")}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    resolutionType === "REWORK"
                      ? "bg-sky-50 border-[#0F4C81] text-[#0F4C81] font-bold ring-1 ring-[#0F4C81]"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  Pengerjaan Ulang
                </button>
                <button
                  type="button"
                  onClick={() => setResolutionType("REPLACEMENT")}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    resolutionType === "REPLACEMENT"
                      ? "bg-sky-50 border-[#0F4C81] text-[#0F4C81] font-bold ring-1 ring-[#0F4C81]"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  Tukar Unit Baru
                </button>
                <button
                  type="button"
                  onClick={() => setResolutionType("REFUND")}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    resolutionType === "REFUND"
                      ? "bg-sky-50 border-[#0F4C81] text-[#0F4C81] font-bold ring-1 ring-[#0F4C81]"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  Pengajuan Refund
                </button>
              </div>
            </div>

            {resolutionType === "REFUND" ? (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <WarningCircle size={16} className="text-amber-600" />
                  <span>Otorisasi Keuangan (Finance Boundary):</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Merchant mengajukan permintaan pengembalian dana (Request Refund). Eksekusi pemindahan uang mutlak menjadi wewenang tim <strong>Finance Payment Ops</strong> melalui sistem Escrow platform.
                </p>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estimasi Nominal Refund (Rp) *</label>
                  <input
                    type="number"
                    min={1000}
                    required
                    value={resolutionAmount}
                    onChange={(e) => setResolutionAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs font-bold"
                  />
                </div>
              </div>
            ) : (resolutionType === "REPAIR" || resolutionType === "REWORK") ? (
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="immediateCompletion"
                  checked={immediateCompletion}
                  onChange={(e) => setImmediateCompletion(e.target.checked)}
                  className="rounded border-slate-300 text-[#0F4C81] focus:ring-[#0F4C81]"
                />
                <label htmlFor="immediateCompletion" className="text-xs text-slate-700 font-medium">
                  Tandai perbaikan langsung selesai (Unit siap diserahterimakan)
                </label>
              </div>
            ) : (
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-xs text-sky-900">
                <strong>Handoff Pergudangan:</strong> Status klaim akan beralih ke <code>REPLACEMENT_PROCESS</code> untuk alokasi stok baru dan integrasi pengiriman.
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1">Catatan Resolusi</label>
              <textarea
                rows={2}
                placeholder="Rincian suku cadang pengganti atau instruksi operasional..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedClaimForResolution(null)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-[#0F4C81] text-white">
                {resolutionType === "REFUND" ? "Ajukan ke Finance" : "Tetapkan Resolusi"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
