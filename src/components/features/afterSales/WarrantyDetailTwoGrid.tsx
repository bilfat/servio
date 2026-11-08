"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  Package,
  Wrench,
  Clock,
  WarningCircle,
  CheckCircle,
  XCircle,
  Truck,
  ArrowRight,
  FileText,
  ArrowsClockwise,
  UploadSimple,
  Info,
  CalendarCheck,
  User,
  Storefront,
  Eye,
  Check,
  X,
  CreditCard,
  Bank,
  CheckSquareOffset,
  HourglassMedium,
} from "@phosphor-icons/react";
import { CustomerWarrantyEntitlement, AfterSalesCase } from "@/types/afterSales";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { ClaimProgressTimeline } from "@/components/features/afterSales/ClaimProgressTimeline";
import { WarrantyClaimModal } from "@/components/features/afterSales/WarrantyClaimModal";
import { orderBarangApi } from "@/lib/orderBarangApi";
import { orderJasaApi } from "@/lib/orderJasaApi";

interface WarrantyDetailTwoGridProps {
  warranty: CustomerWarrantyEntitlement;
  onBack?: () => void;
  backHref?: string;
  initialCaseId?: string | null;
}

export function WarrantyDetailTwoGrid({
  warranty,
  onBack,
  backHref = "/warranties?tab=active",
  initialCaseId = null,
}: WarrantyDetailTwoGridProps) {
  const {
    cases,
    getCaseById,
    customerAcceptAlternativeProposal,
    customerRejectAlternativeProposal,
    customerReportIssue,
    customerSubmitReturnShipping,
    refreshData,
  } = useAfterSales();

  // Find all cases related to this specific warranty entitlement
  const linkedCases = useMemo(() => {
    return cases.filter(
      (c) =>
        c.warrantyId === warranty.id ||
        c.sourceOrderId === warranty.orderId ||
        (warranty.cases && warranty.cases.some((wc: any) => wc.id === c.id))
    );
  }, [cases, warranty]);

  // Determine active/selected case
  const defaultCaseId = useMemo(() => {
    if (initialCaseId && linkedCases.some((c) => c.id === initialCaseId)) {
      return initialCaseId;
    }
    // Prioritize active in-progress case
    const active = linkedCases.find(
      (c) => c.mainStatus !== "COMPLETED" && c.mainStatus !== "REJECTED"
    );
    if (active) return active.id;
    // Otherwise latest case
    return linkedCases[0]?.id || null;
  }, [initialCaseId, linkedCases]);

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(defaultCaseId);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Additional evidence modal
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [evidenceUrlInput, setEvidenceUrlInput] = useState("");
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);

  // Alternative proposal decision modal
  const [showAlternativeModal, setShowAlternativeModal] = useState(false);
  const [alternativeDecision, setAlternativeDecision] = useState<"ACCEPT" | "DECLINE">("ACCEPT");
  const [alternativeReason, setAlternativeReason] = useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Report issue modal (Phase 09 support escalation)
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Confirmation banner / toast
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Async historical order detail data
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState<boolean>(true);

  const isProduct = warranty.itemType === "PRODUCT";
  const orderHref = isProduct
    ? `/orders/products/${warranty.orderId}`
    : `/orders/${warranty.orderId}`;

  // Current selected case data
  const currentCase: AfterSalesCase | undefined = useMemo(() => {
    if (!selectedCaseId) return undefined;
    return getCaseById(selectedCaseId) || linkedCases.find((c) => c.id === selectedCaseId);
  }, [selectedCaseId, getCaseById, linkedCases]);

  // Load deep order data for Grid Kiri
  useEffect(() => {
    let isMounted = true;
    async function loadOrder() {
      try {
        setLoadingOrder(true);
        if (isProduct) {
          const res = await orderBarangApi.customer.getOrder(warranty.orderId);
          if (isMounted && res.data) {
            setOrderDetail(res.data);
          }
        } else {
          const res = await orderJasaApi.getCustomerOrder(warranty.orderId);
          if (isMounted && res.data) {
            setOrderDetail(res.data);
          }
        }
      } catch {
        // Fallback to snapshot
      } finally {
        if (isMounted) setLoadingOrder(false);
      }
    }
    if (warranty.orderId) {
      loadOrder();
    }
    return () => {
      isMounted = false;
    };
  }, [warranty.orderId, isProduct]);

  // Handle evidence upload submission
  const handleUploadAdditionalEvidence = async () => {
    if (!currentCase || !evidenceUrlInput.trim()) return;
    try {
      setIsSubmittingEvidence(true);
      await refreshData();
      setFeedbackMsg({
        type: "success",
        text: "Bukti tambahan berhasil diunggah dan diteruskan ke pemeriksa.",
      });
      setIsEvidenceModalOpen(false);
      setEvidenceUrlInput("");
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: err.message || "Gagal mengunggah bukti tambahan.",
      });
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  // Handle alternative proposal response
  const handleSubmitAlternativeDecision = async () => {
    if (!currentCase) return;
    try {
      setIsSubmittingDecision(true);
      if (alternativeDecision === "ACCEPT") {
        await customerAcceptAlternativeProposal(currentCase.id);
        setFeedbackMsg({
          type: "success",
          text: "Solusi alternatif berhasil disetujui. Proses penyelesaian segera dimulai.",
        });
      } else {
        await customerRejectAlternativeProposal(currentCase.id, alternativeReason.trim());
        setFeedbackMsg({
          type: "success",
          text: "Penolakan solusi alternatif tercatat. Hak eskalasi dukungan tetap terjaga.",
        });
      }
      setShowAlternativeModal(false);
      await refreshData();
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: err.message || "Gagal memproses keputusan solusi.",
      });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Handle reporting issue to support
  const handleReportIssueToSupport = async () => {
    if (!currentCase || !reportReason.trim()) return;
    try {
      setIsSubmittingReport(true);
      await customerReportIssue(currentCase.id, reportReason.trim());
      setFeedbackMsg({
        type: "success",
        text: "Masalah telah dilaporkan ke Tim Dukungan & Mediasi SERVIO (Phase 09).",
      });
      setShowReportModal(false);
      setReportReason("");
      await refreshData();
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: err.message || "Gagal melaporkan masalah.",
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Price calculations for Grid Kiri
  const unitPrice =
    warranty.catalogSnapshot?.price ||
    warranty.catalogSnapshot?.unit_price_idr ||
    (orderDetail?.items?.[0]?.unit_price_idr ?? orderDetail?.grand_total_idr ?? 450000);
  const totalQty = warranty.quantity || 1;
  const subtotalPrice = unitPrice * totalQty;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-primary transition py-1 px-2.5 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft size={16} weight="bold" />
              <span>Kembali</span>
            </button>
          ) : (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-primary transition py-1 px-2.5 rounded-xl hover:bg-slate-100"
            >
              <ArrowLeft size={16} weight="bold" />
              <span>Kembali ke Garansi & Pengajuan</span>
            </Link>
          )}

          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-800 font-mono">
            {warranty.warrantyNumber}
          </span>
        </div>

        {/* Live Service Indicator Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-[11px] font-bold shadow-2xs">
          <ShieldCheck size={14} weight="fill" className="text-emerald-600" />
          <span>Perlindungan Resmi Terverifikasi</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Global Feedback Banner */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-4 rounded-2xl text-xs font-medium flex items-center justify-between gap-2 shadow-xs border ${
              feedbackMsg.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-rose-50 text-rose-900 border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === "success" ? (
                <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
              ) : (
                <WarningCircle size={18} weight="fill" className="text-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MASTER TWO-GRID LAYOUT (KIRI: HISTORIS ~42%, KANAN: DINAMIS ~58%)         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================================= */}
        {/* GRID KIRI (42% / 5 COLS): INFORMASI TETAP HISTORIS & KETENTUAN GARANSI  */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          {/* 1. Header Card: Objek & Garansi Asli */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-sm p-5 space-y-4">
            <div className="flex items-start gap-3.5">
              {/* Product / Service Thumbnail */}
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-2xs">
                {warranty.itemImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={warranty.itemImageUrl}
                    alt={warranty.itemTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    {isProduct ? <Package size={32} /> : <Wrench size={32} />}
                  </div>
                )}
              </div>

              {/* Title & Organization */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      isProduct
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    }`}
                  >
                    {isProduct ? <Package size={11} weight="bold" /> : <Wrench size={11} weight="bold" />}
                    <span>{isProduct ? "Garansi Toko Barang" : "Garansi Layanan Jasa"}</span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      warranty.isActive
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {warranty.isActive ? "Aktif" : "Berakhir"}
                  </span>
                </div>

                <h2 className="text-sm sm:text-base font-bold font-display text-slate-900 leading-snug line-clamp-2">
                  {warranty.itemTitle}
                </h2>

                <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                  <Storefront size={13} className="text-slate-400 shrink-0" />
                  <span>{warranty.organizationName}</span>
                </p>
              </div>
            </div>

            {/* Durasi & Periode Garansi Bar */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                  Nama Opsi Garansi
                </span>
                <span className="font-extrabold text-emerald-950 text-xs truncate block">
                  {warranty.presetName}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                  Masa: {warranty.durationDays} Hari Kalender
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                  Sisa Perlindungan
                </span>
                <span className="font-extrabold text-emerald-800 text-xs block">
                  {warranty.isActive
                    ? `Sisa ${warranty.remainingDays ?? warranty.durationDays} Hari`
                    : "Masa Berlaku Habis"}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                  s.d. {formatDate(warranty.endDate)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Rincian Pesanan Asli (Fakta Transaksi Historis) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-sm p-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText size={16} weight="bold" className="text-slate-700" />
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Fakta Pesanan Asli ({isProduct ? "Order 05A" : "Order 05B"})
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                COMPLETED
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-100/70">
                <span className="text-slate-500">Nomor Pesanan:</span>
                <span className="font-mono font-bold text-slate-900">{warranty.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100/70">
                <span className="text-slate-500">Tanggal Dibuat:</span>
                <span className="font-semibold text-slate-700">{formatDate(warranty.orderedAt)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100/70">
                <span className="text-slate-500">Tanggal Selesai (COMPLETED):</span>
                <span className="font-semibold text-slate-700">{formatDate(warranty.completedAt)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100/70">
                <span className="text-slate-500">Jumlah Tercakup:</span>
                <span className="font-bold text-slate-900">{totalQty} Unit / Layanan</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100/70">
                <span className="text-slate-500">Harga Satuan Saat Transaksi:</span>
                <span className="font-bold text-slate-900">
                  Rp {Number(unitPrice).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 pt-1.5">
                <span className="font-bold text-slate-800">Total Transaksi Selesai:</span>
                <span className="font-extrabold text-primary text-sm">
                  Rp {Number(subtotalPrice).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Specific Service Diagnosis / Technician Facts if Order Jasa */}
            {!isProduct && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] bg-slate-50 p-3 rounded-2xl">
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <User size={13} weight="bold" className="text-primary" />
                  <span>Teknisi Pelaksana:</span>{" "}
                  <strong className="text-slate-900">
                    {orderDetail?.assignment?.worker_name || "Teknisi Mitra Resmi"}
                  </strong>
                </p>
                {orderDetail?.diagnosis && (
                  <p className="text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-700">Hasil Diagnosis Awal:</span>{" "}
                    {orderDetail.diagnosis.summary || orderDetail.diagnosis.finding_notes || "Pemeriksaan unit sesuai SOP teknisi."}
                  </p>
                )}
              </div>
            )}

            {/* Direct Order Link */}
            <div className="pt-2">
              <Link
                href={orderHref}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                <FileText size={14} weight="bold" />
                <span>Lihat Pesanan Asal</span>
                <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          </div>

          {/* 3. Ketentuan Garansi Asli (Yang Ditanggung & Pengecualian) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-sm p-5 space-y-3.5 text-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ShieldCheck size={16} weight="bold" className="text-emerald-600" />
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Ketentuan &amp; Cakupan Garansi
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <span className="font-bold text-slate-800 block text-[11px] mb-1">
                  Yang Ditanggung Garansi:
                </span>
                <p className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-950 leading-relaxed">
                  {warranty.coverage || "Jaminan perbaikan atau penanganan resmi jika terjadi malafungsi teknis."}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-800 block text-[11px] mb-1">
                  Pengecualian Garansi:
                </span>
                <p className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700 leading-relaxed">
                  {warranty.exclusions || "Tidak ada pengecualian khusus."}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-800 block text-[11px] mb-1">
                  Syarat &amp; Ketentuan Pengajuan:
                </span>
                <p className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-600 leading-relaxed text-[11px]">
                  {warranty.terms || "Klaim dapat diajukan konsumen melalui pusat purnajual selama masa garansi aktif dengan melampirkan bukti kendala unit."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* GRID KANAN (58% / 7 COLS): PUSAT INTERAKSI DINAMIS & CLAIM LIFECYCLE     */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* Multiple Claims Selector (If any claims exist) */}
          {linkedCases.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="font-bold text-slate-700">
                  Riwayat Pengajuan Garansi Ini ({linkedCases.length})
                </span>
                {warranty.isActive && (
                  <button
                    type="button"
                    onClick={() => setIsClaimModalOpen(true)}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Buat Klaim Baru</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {linkedCases.map((c) => {
                  const isCur = selectedCaseId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCaseId(c.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer border ${
                        isCur
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>#{c.caseNumber}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                          c.mainStatus === "COMPLETED"
                            ? isCur
                              ? "bg-white/20 text-white"
                              : "bg-emerald-100 text-emerald-800"
                            : c.mainStatus === "REJECTED"
                            ? isCur
                              ? "bg-white/20 text-white"
                              : "bg-rose-100 text-rose-800"
                            : isCur
                            ? "bg-white/20 text-white"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {c.mainStatus}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* KONDISI 1: BELUM ADA KLAIM / USER VIEWING FRESH CLAIM STATE           */}
          {/* ===================================================================== */}
          {(!currentCase || (!selectedCaseId && linkedCases.length === 0)) ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-sm p-6 sm:p-8 space-y-6">
              {/* Status Header */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">
                  <ShieldCheck size={14} weight="fill" className="text-emerald-600" />
                  <span>Garansi Aktif — Belum Ada Pengajuan</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold font-display text-slate-900">
                  Perlindungan Garansi Resmi Sedang Berjalan
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Produk atau layanan Anda saat ini berada dalam masa perlindungan garansi resmi. Jika mengalami kendala teknis atau kerusakan yang sesuai dengan cakupan garansi, Anda dapat mengajukan klaim purnajual kapan saja selama masa berlaku aktif.
                </p>
              </div>

              {/* Guarantees & SLA Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Clock size={18} weight="bold" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs">72 Jam SLA Respons</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Mitra usaha wajib memberikan tanggapan resmi maksimal 3 × 24 jam kalender.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck size={18} weight="fill" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs">Biaya Customer Rp 0</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Pengerjaan ulang servis garansi, unit pengganti, dan penanganan yang disetujui tidak dipungut biaya.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Bank size={18} weight="bold" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs">Proteksi Escrow S-Pay</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Jika disetujui refund, dana dikembalikan penuh langsung ke saldo S-Pay akun Anda.
                  </p>
                </div>
              </div>

              {/* Action Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-slate-900 text-sm">Mengalami Kendala Pada Unit?</h4>
                  <p className="text-xs text-slate-600">
                    Masa garansi aktif Anda tersisa{" "}
                    <strong>{warranty.remainingDays ?? warranty.durationDays} hari kalender</strong>.
                  </p>
                </div>

                {warranty.isActive ? (
                  <button
                    type="button"
                    onClick={() => setIsClaimModalOpen(true)}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <ShieldCheck size={16} weight="bold" />
                    <span>Ajukan Klaim Sekarang</span>
                  </button>
                ) : (
                  <span className="text-xs font-bold text-slate-400">
                    Masa garansi usaha telah berakhir
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* =================================================================== */
            /* KONDISI 2: DETAIL PENGAJUAN KLAIM AKTIF / TERPILIH                 */
            /* =================================================================== */
            <div className="space-y-5">
              {/* A. Status & Tindakan Utama */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-sm p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        #{currentCase.caseNumber}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        Diajukan pada {formatDate(currentCase.submittedAt)}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold font-display text-slate-900">
                      Pengajuan {isProduct ? "Klaim Garansi Toko" : "Klaim Garansi Layanan"}
                    </h3>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs self-start sm:self-auto ${
                      currentCase.mainStatus === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : currentCase.mainStatus === "REJECTED"
                        ? "bg-rose-50 text-rose-800 border-rose-300"
                        : currentCase.isNoResponse
                        ? "bg-amber-500 text-white border-amber-600"
                        : "bg-sky-50 text-primary border-sky-300"
                    }`}
                  >
                    {currentCase.mainStatus === "COMPLETED" && <CheckCircle size={14} weight="fill" />}
                    {currentCase.mainStatus === "REJECTED" && <XCircle size={14} weight="fill" />}
                    {currentCase.isNoResponse && <WarningCircle size={14} weight="fill" />}
                    {currentCase.mainStatus !== "COMPLETED" &&
                      currentCase.mainStatus !== "REJECTED" &&
                      !currentCase.isNoResponse && <Clock size={14} weight="bold" />}
                    <span>{resolveStatusLabel(currentCase)}</span>
                  </span>
                </div>

                {/* 72-Hour Response Countdown (when SUBMITTED) */}
                {currentCase.mainStatus === "SUBMITTED" && !currentCase.isNoResponse && (
                  <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-primary font-bold">
                      <HourglassMedium size={18} weight="bold" className="shrink-0" />
                      <span>Batas Waktu Respons Pelaku Usaha:</span>
                    </div>
                    <span className="font-mono font-extrabold text-[#0F4C81] bg-white px-2.5 py-1 rounded-lg border border-sky-200">
                      3 × 24 Jam Kalender (s.d. {formatDate(currentCase.slaDeadlineAt)})
                    </span>
                  </div>
                )}

                {/* ACTION REQUIRED: Info Requested */}
                {currentCase.specialCondition === "WAITING_CUSTOMER_INFO" && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                      <WarningCircle size={18} weight="fill" className="text-amber-600 shrink-0" />
                      <span>Informasi / Bukti Tambahan Diperlukan</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      Pelaku usaha memerlukan bukti pendukung tambahan untuk memverifikasi kendala unit. Silakan unggah foto/video dokumen tambahan agar pengajuan dapat diproses.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsEvidenceModalOpen(true)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <UploadSimple size={14} weight="bold" />
                      <span>Unggah Bukti Tambahan Sekarang</span>
                    </button>
                  </div>
                )}

                {/* ACTION REQUIRED: Alternative Solution Offered */}
                {currentCase.specialCondition === "WAITING_CUSTOMER_APPROVAL" && (
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-300 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-blue-900 font-bold">
                      <ArrowsClockwise size={18} weight="bold" className="text-blue-600 shrink-0" />
                      <span>Solusi Alternatif Ditawarkan Pelaku Usaha</span>
                    </div>
                    <p className="text-blue-800 leading-relaxed">
                      Pelaku usaha menawarkan solusi penanganan yang berbeda dari permintaan awal Anda. Anda berhak menerima tawaran solusi ini atau menolaknya.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAlternativeDecision("ACCEPT");
                          setShowAlternativeModal(true);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={14} weight="bold" />
                        <span>Setujui Solusi Alternatif</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAlternativeDecision("DECLINE");
                          setShowAlternativeModal(true);
                        }}
                        className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-xl transition cursor-pointer"
                      >
                        <X size={14} weight="bold" />
                        <span>Tolak Solusi</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* WARNING: SLA Breached / No Response */}
                {currentCase.isNoResponse && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                      <WarningCircle size={18} weight="fill" className="text-amber-600 shrink-0" />
                      <span>Batas Waktu Respons Terlewati (3 × 24 Jam)</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      Pelaku usaha belum memberikan tanggapan dalam batas waktu 72 jam kalender. Pengajuan belum otomatis ditolak. Anda berhak melaporkan masalah ini langsung ke tim mediasi SERVIO.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowReportModal(true)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <WarningCircle size={14} weight="bold" />
                      <span>Laporkan Masalah Ini (Phase 09)</span>
                    </button>
                  </div>
                )}

                {/* REJECTED: Show Reason */}
                {currentCase.mainStatus === "REJECTED" && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-rose-900 font-bold">
                      <XCircle size={18} weight="fill" className="text-rose-600 shrink-0" />
                      <span>Pengajuan Ditolak oleh Pelaku Usaha</span>
                    </div>
                    <p className="text-rose-800 leading-relaxed">
                      <strong>Alasan Penolakan:</strong>{" "}
                      {currentCase.rejectionReason || "Klaim tidak memenuhi kriteria garansi resmi atau di luar cakupan."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowReportModal(true)}
                      className="px-3.5 py-1.5 bg-white text-rose-700 border border-rose-300 font-bold rounded-xl hover:bg-rose-100 transition cursor-pointer"
                    >
                      Laporkan ke Mediasi SERVIO
                    </button>
                  </div>
                )}
              </div>

              {/* B. Timeline Horizontal Beranimasi Reusable */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-sm p-5 sm:p-6">
                <ClaimProgressTimeline caseData={currentCase} />
              </div>

              {/* C. Rincian Masalah & Bukti Customer */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-servio-sm p-5 sm:p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Info size={16} weight="bold" className="text-slate-700" />
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Rincian Masalah &amp; Bukti Konsumen
                    </h4>
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    Solusi Diminta:{" "}
                    <strong className="text-slate-900">
                      {resolveSolutionLabel(currentCase.customerRequestedSolution)}
                    </strong>
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <span className="font-bold text-slate-700 block text-[11px]">
                      Alasan Kendala:
                    </span>
                    <p className="font-semibold text-slate-900">{currentCase.issueReason}</p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 block text-[11px]">
                      Deskripsi Kronologi Masalah:
                    </span>
                    <p className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 leading-relaxed">
                      {currentCase.issueDescription}
                    </p>
                  </div>

                  {/* Evidence Media Photos */}
                  {currentCase.evidenceMedia && currentCase.evidenceMedia.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="font-bold text-slate-700 block text-[11px]">
                        Foto / Video Bukti Kendala ({currentCase.evidenceMedia.length}):
                      </span>
                      <div className="flex flex-wrap gap-2.5">
                        {currentCase.evidenceMedia.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={() => setPreviewImage(img)}
                            className="relative w-20 h-20 rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer group shadow-2xs hover:border-primary transition"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img}
                              alt={`Bukti ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                              <Eye size={18} weight="bold" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* D. Progres Penyelesaian Terpadu (Refund / Rework / Replacement) */}
              {/* RESOLUTION 1: REFUND */}
              {(currentCase.approvedSolution === "REFUND" ||
                currentCase.chosenSolution === "REFUND") && (
                <div className="bg-white rounded-3xl border border-emerald-200 shadow-servio-sm p-5 sm:p-6 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                    <div className="flex items-center gap-2">
                      <Bank size={18} weight="bold" className="text-emerald-700" />
                      <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                        Progres Pengembalian Dana (Finance 06)
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300">
                      Biaya Pelanggan Rp 0
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-900 font-medium">Nominal Pengembalian:</span>
                      <span className="font-extrabold text-emerald-950 text-sm">
                        Rp {Number(currentCase.itemPrice || subtotalPrice).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-emerald-200/60">
                      <span className="text-emerald-900 font-medium">Tujuan Pengembalian:</span>
                      <span className="font-bold text-emerald-900">Saldo S-Pay Konsumen</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-emerald-200/60">
                      <span className="text-emerald-900 font-medium">Status Keuangan:</span>
                      <span className="font-bold text-emerald-800">
                        {currentCase.mainStatus === "COMPLETED" || currentCase.refundTrack?.status === "SUCCEEDED"
                          ? "Dana Berhasil Masuk Saldo S-Pay"
                          : "Pencairan Dana Sedang Diproses Finance"}
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/spay"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-2xs cursor-pointer"
                  >
                    <Bank size={14} weight="bold" />
                    <span>Cek Saldo S-Pay Anda</span>
                  </Link>
                </div>
              )}

              {/* RESOLUTION 2: REWORK (PENGERJAAN ULANG JASA) */}
              {(currentCase.approvedSolution === "REPAIR" ||
                (currentCase.approvedSolution as any) === "REWORK" ||
                currentCase.chosenSolution === "REPAIR" ||
                (currentCase.chosenSolution as any) === "REWORK") && (
                <div className="bg-white rounded-3xl border border-purple-200 shadow-servio-sm p-5 sm:p-6 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-purple-100">
                    <div className="flex items-center gap-2">
                      <Wrench size={18} weight="bold" className="text-purple-700" />
                      <h4 className="font-bold text-purple-950 uppercase tracking-wider text-[11px]">
                        Pekerjaan Garansi Servis (Order 05B Rework)
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-800 border border-purple-300">
                      Biaya Pelanggan Rp 0
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-purple-900 font-medium">Teknisi Bertugas:</span>
                      <span className="font-bold text-purple-950">
                        {currentCase.warrantyJob?.workerName || "Menunggu penugasan oleh Provider"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-purple-200/60">
                      <span className="text-purple-900 font-medium">Jadwal Kunjungan:</span>
                      <span className="font-bold text-purple-900">
                        {currentCase.warrantyJob?.scheduledDate || "Akan dihubungi untuk konfirmasi waktu"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-purple-200/60">
                      <span className="text-purple-900 font-medium">Status Pengerjaan:</span>
                      <span className="font-bold text-purple-800">
                        {currentCase.mainStatus === "COMPLETED"
                          ? "Pengerjaan Garansi Selesai & Terverifikasi"
                          : currentCase.warrantyJob?.operationalStatus === "DONE"
                          ? "Teknisi Selesai Mengerjakan (Menunggu Konfirmasi Anda)"
                          : "Dalam Proses Penjadwalan Teknisi"}
                      </span>
                    </div>
                  </div>

                  {/* Completion confirmation button if finished */}
                  {currentCase.warrantyJob?.operationalStatus === "DONE" &&
                    currentCase.mainStatus !== "COMPLETED" && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await refreshData();
                            setFeedbackMsg({
                              type: "success",
                              text: "Pengerjaan servis garansi berhasil dikonfirmasi selesai.",
                            });
                          } catch {}
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle size={14} weight="bold" />
                        <span>Konfirmasi Pengerjaan Garansi Selesai</span>
                      </button>
                    )}
                </div>
              )}

              {/* RESOLUTION 3: REPLACEMENT (PENGGANTIAN BARANG) */}
              {(currentCase.approvedSolution === "REPLACEMENT" ||
                currentCase.chosenSolution === "REPLACEMENT") && (
                <div className="bg-white rounded-3xl border border-blue-200 shadow-servio-sm p-5 sm:p-6 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <div className="flex items-center gap-2">
                      <Truck size={18} weight="bold" className="text-blue-700" />
                      <h4 className="font-bold text-blue-950 uppercase tracking-wider text-[11px]">
                        Penggantian Unit Baru (Fulfillment 05A)
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-300">
                      Biaya Pelanggan Rp 0
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-900 font-medium">Status Pengiriman:</span>
                      <span className="font-bold text-blue-950">
                        {currentCase.replacementShipment?.shippingStatus || "Disiapkan oleh Merchant"}
                      </span>
                    </div>
                    {currentCase.replacementShipment?.trackingNumber && (
                      <div className="flex justify-between items-center pt-1 border-t border-blue-200/60">
                        <span className="text-blue-900 font-medium">Ekspedisi &amp; Nomor Resi:</span>
                        <span className="font-mono font-bold text-blue-900">
                          {currentCase.replacementShipment.courierName || "J&T Cargo"} —{" "}
                          {currentCase.replacementShipment.trackingNumber}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1 border-t border-blue-200/60">
                      <span className="text-blue-900 font-medium">Jumlah Unit Pengganti:</span>
                      <span className="font-bold text-blue-900">
                        1 Unit Baru Tersegel
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS & DRAWERS                                                          */}
      {/* ========================================================================= */}
      {/* 1. Claim Modal */}
      {isClaimModalOpen && (
        <WarrantyClaimModal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          warranty={warranty}
          onSuccess={async (newCaseId) => {
            await refreshData();
            setSelectedCaseId(newCaseId);
            setFeedbackMsg({
              type: "success",
              text: "Pengajuan klaim garansi berhasil dikirim. Pelaku usaha memiliki 72 jam untuk meninjau.",
            });
          }}
        />
      )}

      {/* 2. Additional Evidence Modal */}
      {isEvidenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Unggah Bukti Tambahan</h3>
              <button
                type="button"
                onClick={() => setIsEvidenceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Lampirkan URL foto atau dokumen bukti pendukung untuk memperjelas kendala unit yang Anda laporkan.
            </p>
            <input
              type="text"
              placeholder="https://..."
              value={evidenceUrlInput}
              onChange={(e) => setEvidenceUrlInput(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEvidenceModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingEvidence || !evidenceUrlInput.trim()}
                onClick={handleUploadAdditionalEvidence}
                className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs disabled:opacity-50"
              >
                {isSubmittingEvidence ? "Menyimpan..." : "Kirim Bukti"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Alternative Proposal Decision Modal */}
      {showAlternativeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                {alternativeDecision === "ACCEPT" ? "Konfirmasi Setujui Solusi" : "Alasan Penolakan Solusi"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAlternativeModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              {alternativeDecision === "ACCEPT"
                ? "Dengan menyetujui, solusi yang ditawarkan pelaku usaha akan segera dilaksanakan."
                : "Silakan tuliskan alasan penolakan solusi alternatif yang ditawarkan pelaku usaha."}
            </p>
            {alternativeDecision === "DECLINE" && (
              <textarea
                rows={3}
                placeholder="Alasan penolakan..."
                value={alternativeReason}
                onChange={(e) => setAlternativeReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            )}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAlternativeModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingDecision}
                onClick={handleSubmitAlternativeDecision}
                className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs disabled:opacity-50"
              >
                {isSubmittingDecision ? "Menyimpan..." : "Kirim Keputusan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Report Issue Modal (Phase 09 support escalation) */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Laporkan Masalah ke Dukungan SERVIO</h3>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Laporan Anda akan diteruskan langsung ke tim Mediasi &amp; Resolusi Sengketa (Phase 09) untuk ditinjau secara adil.
            </p>
            <textarea
              rows={3}
              required
              placeholder="Jelaskan alasan pelaporan kendala purnajual..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingReport || !reportReason.trim()}
                onClick={handleReportIssueToSupport}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs disabled:opacity-50"
              >
                {isSubmittingReport ? "Mengirim Laporan..." : "Kirim Laporan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Image Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage} alt="Bukti Penuh" className="max-w-full max-h-[85vh] object-contain" />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Helper Formatters
// -------------------------------------------------------------
function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function resolveStatusLabel(c: AfterSalesCase): string {
  if (c.isNoResponse) return "TIDAK DITANGGAPI";
  if (c.specialCondition === "WAITING_CUSTOMER_APPROVAL") return "SOLUSI ALTERNATIF DITAWARKAN";
  if (c.specialCondition === "WAITING_CUSTOMER_INFO") return "INFORMASI TAMBAHAN DIPERLUKAN";
  switch (c.mainStatus) {
    case "SUBMITTED":
      return "DIAJUKAN — MENUNGGU RESPONS";
    case "UNDER_REVIEW":
      return "SEDANG DITINJAU";
    case "IN_RESOLUTION":
      return "SOLUSI SEDANG DIPROSES";
    case "COMPLETED":
      return "PENGAJUAN SELESAI";
    case "REJECTED":
      return "PENGAJUAN DITOLAK";
    default:
      return c.mainStatus;
  }
}

function resolveSolutionLabel(sol?: string): string {
  switch (sol) {
    case "REFUND":
      return "Pengembalian Dana (Refund)";
    case "REWORK":
      return "Perbaikan / Pengerjaan Ulang (Rework)";
    case "REPLACEMENT":
      return "Penggantian Unit Baru (Replacement)";
    default:
      return sol || "Penanganan Resmi";
  }
}
