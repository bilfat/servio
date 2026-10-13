"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  VideoCamera,
  CheckCircle,
  WarningCircle,
  XCircle,
  Clock,
  ShieldCheck,
  Package,
  ArrowsClockwise,
  Info,
} from "@phosphor-icons/react";
import { useReturns } from "@/features/returns/useReturns";
import { Toast } from "@/components/feedback/Toast";

function CreateReturnSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 animate-pulse">
      <div className="bg-white border-b border-slate-200 py-4 px-4">
        <div className="max-w-3xl mx-auto h-8 w-48 bg-slate-200 rounded-lg" />
      </div>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="h-64 bg-white rounded-3xl border border-slate-200" />
      </div>
    </div>
  );
}

function CreateReturnRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramOrderId = searchParams.get("orderId") || "";
  const paramOrderItemId = searchParams.get("orderItemId") || "";

  const { checkEligibility } = useReturns({ autoLoad: false });

  const [orderId, setOrderId] = useState(paramOrderId || "prod-order-881");
  const [orderItemId, setOrderItemId] = useState(paramOrderItemId || "item-01");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>("DEFECTIVE");
  const [customReasonText, setCustomReasonText] = useState<string>("");
  const [conditionClaim, setConditionClaim] = useState<string>("DEFECTIVE_MANUFACTURE");
  const [resolutionType, setResolutionType] = useState<"EXCHANGE" | "REFUND">("REFUND");
  const [hasUnboxingVideo, setHasUnboxingVideo] = useState(true);
  const [photos] = useState<string[]>([
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
  ]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Server-side Eligibility State
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibility, setEligibility] = useState<{
    status: "ELIGIBLE" | "PARTIALLY_ELIGIBLE" | "NOT_ELIGIBLE" | "REQUIRES_REVIEW" | "RETURN_WINDOW_EXPIRED" | string;
    canReturn: boolean;
    canWarranty: boolean;
    reason?: string;
    message: string;
    returnWindowDays?: number;
    eligibleFrom?: string;
    eligibleUntil?: string;
    isWithinReturnWindow?: boolean;
    maxQuantity?: number;
    requestedQuantity?: number;
    eligibleQuantity?: number;
    totalPurchasedQuantity?: number;
    alreadyReturnedQuantity?: number;
    alreadyRefundedQuantity?: number;
    remainingQuantity?: number;
    selectedReason?: string;
    reasonEligibility?: string;
    conditionClaim?: string;
    evidenceRequirement?: "EVIDENCE_REQUIRED" | "EVIDENCE_NOT_REQUIRED";
    evidenceDetails?: {
      unboxingVideoRequired: boolean;
      photoRequired: boolean;
    };
    policySource?: string;
    policyVersion?: string;
  } | null>(null);

  // Sync state if searchParams change
  useEffect(() => {
    const qOrderId = searchParams.get("orderId");
    const qOrderItemId = searchParams.get("orderItemId");
    if (qOrderId) setOrderId(qOrderId);
    if (qOrderItemId) setOrderItemId(qOrderItemId);
  }, [searchParams]);

  const performEligibilityCheck = useCallback(async (
    targetOrderId?: string,
    targetItemId?: string,
    targetQty?: number,
    targetReason?: string,
    targetCondition?: string
  ) => {
    const domOrderId = typeof document !== "undefined" ? (document.getElementById("order-id-input") as HTMLInputElement)?.value : null;
    const domItemId = typeof document !== "undefined" ? (document.getElementById("order-item-id-input") as HTMLInputElement)?.value : null;
    const domQty = typeof document !== "undefined" ? parseInt((document.getElementById("return-quantity-input") as HTMLInputElement)?.value) : null;
    const domReason = typeof document !== "undefined" ? (document.getElementById("return-reason-select") as HTMLSelectElement)?.value : null;
    const domCondition = typeof document !== "undefined" ? (document.getElementById("condition-claim-select") as HTMLSelectElement)?.value : null;

    const effOrderId = targetOrderId ?? domOrderId ?? orderId;
    const effItemId = targetItemId ?? domItemId ?? orderItemId;
    const effQty = targetQty ?? (domQty && !isNaN(domQty) ? domQty : quantity);
    const effReason = targetReason ?? domReason ?? reason;
    const effCondition = targetCondition ?? domCondition ?? conditionClaim;

    if (!effOrderId || !effItemId) return;

    setEligibilityLoading(true);
    try {
      const res = await checkEligibility(effOrderId, effItemId, {
        quantity: effQty,
        reason: effReason,
        conditionClaim: effCondition,
      });
      if (res && res.data) {
        setEligibility(res.data);
      }
    } catch (err: any) {
      setEligibility({
        status: "NOT_ELIGIBLE",
        canReturn: false,
        canWarranty: false,
        message: err?.message || "Gagal memverifikasi kelayakan retur dari server.",
      });
    } finally {
      setEligibilityLoading(false);
    }
  }, [checkEligibility, orderId, orderItemId, quantity, reason, conditionClaim]);

  // Initial check on load or when searchParams change
  useEffect(() => {
    const qOrderId = searchParams.get("orderId") || orderId;
    const qOrderItemId = searchParams.get("orderItemId") || orderItemId;
    if (qOrderId && qOrderItemId) {
      performEligibilityCheck(qOrderId, qOrderItemId, quantity, reason, conditionClaim);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, checkEligibility]);

  const handleManualCheck = (e: React.FormEvent) => {
    e.preventDefault();
    performEligibilityCheck();
  };

  const isExpired = eligibility?.status === "RETURN_WINDOW_EXPIRED" || eligibility?.reason === "RETURN_WINDOW_EXPIRED";
  const isPartiallyEligible = eligibility?.status === "PARTIALLY_ELIGIBLE";
  const isRequiresReview = eligibility?.status === "REQUIRES_REVIEW";
  const isEligible = eligibility?.status === "ELIGIBLE";
  const isNotEligible = !isEligible && !isPartiallyEligible && !isRequiresReview;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
              aria-label="Kembali ke Daftar Pesanan"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81]">
                Tahap 11 — Verifikasi Kelayakan Retur
              </span>
              <h1 className="text-xl font-bold text-slate-900 font-display">
                Pengecekan Kelayakan Pengembalian Barang
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-mono bg-slate-100 px-3 py-1 rounded-full text-slate-700 font-semibold border border-slate-200">
              Order: {orderId}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Step Notice Banner */}
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
          <Info size={20} weight="fill" className="text-[#0F4C81] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Batasan Tahap 11 (Step 11 Scope)</p>
            <p className="text-blue-800 leading-relaxed">
              Halaman ini menguji dan memvalidasi kelayakan retur barang secara server-side berdasarkan kebijakan retur historis, jendela waktu (return window), kuantitas, dan alasan kelayakan sebelum pengajuan fisik diproses.
            </p>
          </div>
        </div>

        {/* Form Inputs for Return Eligibility Check */}
        <form onSubmit={handleManualCheck} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Package size={20} weight="duotone" className="text-[#0F4C81]" />
              Parameter Pemilihan Barang & Kelayakan
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Order ID */}
              <div>
                <label htmlFor="order-id-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ID Pesanan (Order ID)
                </label>
                <input
                  id="order-id-input"
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                  required
                />
              </div>

              {/* Order Item ID */}
              <div>
                <label htmlFor="order-item-id-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ID Item Pesanan (Order Item ID)
                </label>
                <input
                  id="order-item-id-input"
                  type="text"
                  value={orderItemId}
                  onChange={(e) => setOrderItemId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Quantity Selector */}
              <div>
                <label htmlFor="return-quantity-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kuantitas Retur (Quantity)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition"
                    aria-label="Kurangi kuantitas"
                  >
                    -
                  </button>
                  <input
                    id="return-quantity-input"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-3 py-2 text-center rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    aria-label="Jumlah kuantitas yang diajukan retur"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition"
                    aria-label="Tambah kuantitas"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Reason Selector */}
              <div>
                <label htmlFor="return-reason-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alasan Retur (Reason)
                </label>
                <select
                  id="return-reason-select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] bg-white"
                >
                  <option value="DEFECTIVE">Cacat Manufaktur / Kerusakan Fungsi (DEFECTIVE)</option>
                  <option value="DAMAGED">Kerusakan Fisik Saat Pengiriman (DAMAGED)</option>
                  <option value="WRONG_ITEM">Barang Salah / Tidak Sesuai (WRONG_ITEM)</option>
                  <option value="WRONG_VARIANT">Varian Salah Warna / Ukuran (WRONG_VARIANT)</option>
                  <option value="MISSING_ITEM">Komponen Hilang / Kurang (MISSING_ITEM)</option>
                  <option value="NOT_AS_DESCRIBED">Spesifikasi Berbeda dari Deskripsi (NOT_AS_DESCRIBED)</option>
                  <option value="CUSTOMER_CHANGED_MIND">Berubah Pikiran / Salah Beli (CUSTOMER_CHANGED_MIND)</option>
                  <option value="OTHER">Alasan Lainnya (OTHER)</option>
                </select>
              </div>

              {/* Condition Claim Selector */}
              <div>
                <label htmlFor="condition-claim-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Klaim Kondisi Fisik
                </label>
                <select
                  id="condition-claim-select"
                  value={conditionClaim}
                  onChange={(e) => setConditionClaim(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] bg-white"
                >
                  <option value="DEFECTIVE_MANUFACTURE">Cacat Produksi dari Pabrik</option>
                  <option value="DAMAGED_TRANSIT">Rusak Akibat Ekspedisi / Kemasan Robek</option>
                  <option value="UNOPENED_SEALED">Masih Segel Utuh & Belum Dibuka</option>
                  <option value="OPENED_UNUSED">Segel Dibuka Namun Belum Digunakan</option>
                  <option value="USED">Pernah Digunakan / Dipasang</option>
                </select>
              </div>
            </div>

            {reason === "OTHER" && (
              <div>
                <label htmlFor="custom-reason-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rincian Alasan Tambahan
                </label>
                <textarea
                  id="custom-reason-input"
                  rows={2}
                  value={customReasonText}
                  onChange={(e) => setCustomReasonText(e.target.value)}
                  placeholder="Jelaskan kendala spesifik yang dialami..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                id="check-eligibility-btn"
                disabled={eligibilityLoading}
                className="px-6 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <ArrowsClockwise size={16} weight="bold" className={eligibilityLoading ? "animate-spin" : ""} />
                {eligibilityLoading ? "Memeriksa ke Server..." : "Cek Kelayakan Retur"}
              </button>
            </div>
          </div>
        </form>

        {/* Server-Side Eligibility Notification Card */}
        {eligibilityLoading ? (
          <div className="p-6 rounded-3xl bg-slate-100 border border-slate-200 text-xs text-slate-600 animate-pulse flex items-center gap-3">
            <ArrowsClockwise size={20} className="animate-spin text-[#0F4C81]" />
            <span>Mengevaluasi jendela retur (return window), kuantitas tersisa, dan aturan kebijakan toko...</span>
          </div>
        ) : eligibility ? (
          <div
            id="eligibility-result-card"
            className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
              isEligible
                ? "bg-emerald-50/70 border-emerald-200"
                : isPartiallyEligible
                ? "bg-amber-50/70 border-amber-200"
                : isRequiresReview
                ? "bg-blue-50/70 border-blue-200"
                : "bg-rose-50/70 border-rose-200"
            }`}
          >
            {/* Header Status */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    isEligible
                      ? "bg-emerald-100 text-emerald-800"
                      : isPartiallyEligible
                      ? "bg-amber-100 text-amber-800"
                      : isRequiresReview
                      ? "bg-blue-100 text-blue-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {isEligible ? (
                    <CheckCircle size={24} weight="fill" />
                  ) : isPartiallyEligible ? (
                    <WarningCircle size={24} weight="fill" />
                  ) : isRequiresReview ? (
                    <Clock size={24} weight="fill" />
                  ) : (
                    <XCircle size={24} weight="fill" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      id="eligibility-status-badge"
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        isEligible
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : isPartiallyEligible
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : isRequiresReview
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : "bg-rose-100 text-rose-800 border-rose-300"
                      }`}
                    >
                      STATUS: {eligibility.status}
                    </span>
                    {eligibility.policySource && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Sumber Kebijakan: {eligibility.policySource}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    {isEligible
                      ? "Item Memenuhi Seluruh Syarat Pengembalian Barang"
                      : isPartiallyEligible
                      ? "Item Memenuhi Sebagian Syarat Pengembalian (Kuantitas Terbatas)"
                      : isRequiresReview
                      ? "Pengajuan Memerlukan Peninjauan Manual oleh Penjual"
                      : isExpired
                      ? "Batas Waktu Pengembalian (Return Window) Telah Berakhir"
                      : "Item Tidak Memenuhi Syarat Pengembalian Barang"}
                  </h3>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    {eligibility.message}
                  </p>
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-slate-200/60">
              <div className="bg-white/80 p-3 rounded-2xl border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Jendela Retur</span>
                <span className="font-bold text-slate-800">
                  {eligibility.returnWindowDays ? `${eligibility.returnWindowDays} Hari` : "Sesuai Polis"}
                </span>
                {eligibility.eligibleUntil && (
                  <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                    Hingga: {eligibility.eligibleUntil}
                  </span>
                )}
              </div>

              <div className="bg-white/80 p-3 rounded-2xl border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Kuantitas Diajukan</span>
                <span className="font-bold text-slate-800">
                  {eligibility.requestedQuantity ?? quantity} Unit
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Diizinkan: {eligibility.eligibleQuantity ?? eligibility.maxQuantity ?? 0} Unit
                </span>
              </div>

              <div className="bg-white/80 p-3 rounded-2xl border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sisa Dapat Diretur</span>
                <span className="font-bold text-slate-800">
                  {eligibility.remainingQuantity ?? eligibility.maxQuantity ?? 0} Unit
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Total Dibeli: {eligibility.totalPurchasedQuantity ?? "-"}
                </span>
              </div>

              <div className="bg-white/80 p-3 rounded-2xl border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Syarat Bukti Fisik</span>
                <span
                  className={`font-bold text-[11px] block mt-0.5 ${
                    eligibility.evidenceRequirement === "EVIDENCE_REQUIRED"
                      ? "text-rose-700"
                      : "text-emerald-700"
                  }`}
                >
                  {eligibility.evidenceRequirement === "EVIDENCE_REQUIRED"
                    ? "Wajib Video Unboxing & Foto"
                    : "Tidak Diwajibkan Bukti Tambahan"}
                </span>
              </div>
            </div>

            {/* Warranty Fallback if Return Window Expired or Product Excluded */}
            {eligibility.canWarranty && (
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={24} weight="duotone" className="text-purple-700 shrink-0" />
                  <div>
                    <p className="font-bold">Solusi Pengalihan: Garansi Resmi Produk Aktif</p>
                    <p className="text-[11px] text-purple-700">
                      Kendala fungsi atau cacat produksi dapat diselesaikan melalui menu Klaim Garansi Resmi SERVIO.
                    </p>
                  </div>
                </div>
                <Link
                  id="goto-warranty-btn"
                  href="/warranties"
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition whitespace-nowrap text-center"
                >
                  Buka Menu Garansi
                </Link>
              </div>
            )}
          </div>
        ) : null}

        {/* Expected Solution Selection (Preview for Step 12) */}
        <div className={`bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-sm ${!eligibility?.canReturn ? "opacity-50 pointer-events-none" : ""}`}>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Solusi yang Diharapkan (Handoff Tahap 12)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setResolutionType("EXCHANGE")}
                className={`p-4 rounded-2xl border text-left transition ${
                  resolutionType === "EXCHANGE"
                    ? "border-[#0F4C81] bg-sky-50/50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="text-xs font-bold text-slate-900">Tukar Barang Baru (Replacement)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Penggantian unit barang sesuai pesanan
                </p>
              </button>

              <button
                type="button"
                onClick={() => setResolutionType("REFUND")}
                className={`p-4 rounded-2xl border text-left transition ${
                  resolutionType === "REFUND"
                    ? "border-[#0F4C81] bg-sky-50/50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="text-xs font-bold text-slate-900">Pengembalian Dana (Refund)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dana escrow dikembalikan ke rekening/saldo
                </p>
              </button>
            </div>
          </div>

          {/* Unboxing Video Confirmation */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <VideoCamera size={24} weight="duotone" className="text-amber-700" />
              <div>
                <p className="text-xs font-bold text-amber-900">Ketersediaan Video Unboxing</p>
                <p className="text-[11px] text-amber-700">
                  {eligibility?.evidenceRequirement === "EVIDENCE_REQUIRED"
                    ? "Wajib untuk alasan cacat fisik, kerusakan paket, atau ketidaksesuaian barang."
                    : "Direkomendasikan untuk mempermudah investigasi merchant."}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={hasUnboxingVideo}
              onChange={(e) => setHasUnboxingVideo(e.target.checked)}
              className="w-5 h-5 accent-[#0F4C81] rounded"
              aria-label="Konfirmasi ketersediaan rekaman video unboxing"
            />
          </div>

          {/* Photos Preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Pratinjau Foto Bukti
            </label>
            <div className="flex items-center gap-3">
              {photos.map((p, i) => (
                <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200">
                  <Image
                    src={p}
                    alt="Foto bukti fisik kendala"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 11 Hard Stop Notice */}
        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <span>
            Verifikasi kelayakan retur (Tahap 11) selesai. Eksekusi pengajuan final dilanjutkan pada Tahap 12.
          </span>
          <Link
            href="/orders"
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition"
          >
            Kembali ke Pesanan
          </Link>
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

export default function CreateReturnRequestPage() {
  return (
    <Suspense fallback={<CreateReturnSkeleton />}>
      <CreateReturnRequestContent />
    </Suspense>
  );
}
