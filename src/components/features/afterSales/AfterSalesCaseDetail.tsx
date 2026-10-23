"use client";

import React, { useState } from "react";
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
  Receipt,
  FileText,
  ArrowsClockwise,
  UploadSimple,
  Info,
  WarningOctagon,
  Tag,
  Bank,
} from "@phosphor-icons/react";
import { AfterSalesCase } from "@/types/afterSales";
import { useAfterSales } from "@/features/afterSales/useAfterSales";

interface AfterSalesCaseDetailProps {
  caseData: AfterSalesCase;
  onBack?: () => void;
  backHref?: string;
}

export function AfterSalesCaseDetail({
  caseData,
  onBack,
  backHref = "/warranties?tab=submissions",
}: AfterSalesCaseDetailProps) {
  const {
    customerAcceptAlternativeProposal,
    customerRejectAlternativeProposal,
    customerSubmitReturnShipping,
    customerReportIssue,
    customerApprovePaidWork,
  } = useAfterSales();

  // Local interactive modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [courierNameInput, setCourierNameInput] = useState("J&T Cargo");
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [claimedFeeInput, setClaimedFeeInput] = useState("");
  const [showRejectAltModal, setShowRejectAltModal] = useState(false);
  const [rejectAltReason, setRejectAltReason] = useState("");
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const getCaseTypeBadge = (type: string) => {
    switch (type) {
      case "claim_product":
        return {
          label: "Klaim Garansi Barang",
          className: "bg-blue-50 text-blue-700 border-blue-200",
          icon: Package,
        };
      case "claim_service":
        return {
          label: "Klaim Garansi Jasa",
          className: "bg-purple-50 text-purple-700 border-purple-200",
          icon: Wrench,
        };
      case "return_product":
      default:
        return {
          label: "Retur Barang",
          className: "bg-rose-50 text-rose-700 border-rose-200",
          icon: ArrowsClockwise,
        };
    }
  };

  const getMainStatusBadge = (status: string, isNoResponse: boolean) => {
    if (isNoResponse) {
      return {
        label: "TIDAK DITANGGAPI",
        className: "bg-amber-500 text-white border-amber-600 font-bold",
        icon: WarningCircle,
      };
    }
    switch (status) {
      case "SUBMITTED":
        return {
          label: "Diajukan",
          className: "bg-sky-50 text-sky-700 border-sky-200",
          icon: Clock,
        };
      case "UNDER_REVIEW":
        return {
          label: "Ditinjau",
          className: "bg-amber-50 text-amber-700 border-amber-200",
          icon: Clock,
        };
      case "IN_RESOLUTION":
        return {
          label: "Dalam Penyelesaian",
          className: "bg-indigo-50 text-indigo-700 border-indigo-200",
          icon: ArrowsClockwise,
        };
      case "COMPLETED":
        return {
          label: "Selesai",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle,
        };
      case "REJECTED":
        return {
          label: "Ditolak",
          className: "bg-rose-50 text-rose-700 border-rose-200",
          icon: XCircle,
        };
      default:
        return {
          label: status,
          className: "bg-slate-50 text-slate-700 border-slate-200",
          icon: Info,
        };
    }
  };

  const badgeInfo = getCaseTypeBadge(caseData.caseType);
  const statusInfo = getMainStatusBadge(caseData.mainStatus, caseData.isNoResponse);
  const TypeIcon = badgeInfo.icon;
  const StatusIcon = statusInfo.icon;

  const orderHref =
    caseData.caseType === "claim_service"
      ? `/orders/${caseData.sourceOrderId}`
      : `/orders/products/${caseData.sourceOrderId}`;

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    customerReportIssue(caseData.id, reportReason);
    setShowReportModal(false);
    setReportReason("");
    setNotificationMsg("Laporan Anda telah diteruskan ke Customer Support SERVIO (Simulasi Demo Modul 09).");
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumberInput.trim()) return;
    customerSubmitReturnShipping(
      caseData.id,
      trackingNumberInput,
      courierNameInput,
      claimedFeeInput ? parseInt(claimedFeeInput, 10) : undefined
    );
    setShowShippingModal(false);
    setTrackingNumberInput("");
    setNotificationMsg("Resi pengiriman pengembalian berhasil diunggah!");
  };

  const handleAcceptAlt = () => {
    customerAcceptAlternativeProposal(caseData.id);
    setNotificationMsg("Anda telah menyetujui tawaran solusi alternatif dari penjual.");
  };

  const handleRejectAltSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    customerRejectAlternativeProposal(caseData.id, rejectAltReason || "Meminta kembali solusi awal");
    setShowRejectAltModal(false);
    setRejectAltReason("");
    setNotificationMsg("Solusi alternatif ditolak. Kasus dikembalikan untuk peninjauan solusi awal.");
  };

  return (
    <div className="w-full space-y-5">
      {/* Toast Notification */}
      <AnimatePresence>
        {notificationMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
              <span>{notificationMsg}</span>
            </div>
            <button
              onClick={() => setNotificationMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-amber-500/10 border border-amber-300 rounded-2xl text-[11px] text-amber-800 font-medium">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-amber-500 text-white rounded-md text-[10px] font-bold uppercase tracking-wider">
            DEMO ONLY
          </span>
          <span>DATA SIMULASI — BELUM TERHUBUNG SISTEM AFTER-SALES OPERASIONAL</span>
        </div>
        <span className="text-slate-500 hidden sm:inline font-mono">Phase 07 V2.1 Spec</span>
      </div>

      {/* Navigation Header */}
      <div className="flex items-center justify-between gap-4">
        {onBack ? (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition cursor-pointer"
          >
            <ArrowLeft size={16} weight="bold" />
            Kembali ke Daftar Pengajuan
          </button>
        ) : (
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft size={16} weight="bold" />
            Kembali ke Garansi & Pengajuan
          </Link>
        )}

        <Link
          href={orderHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-xl border border-blue-200 transition"
        >
          <FileText size={15} weight="bold" />
          Lihat Pesanan Asli ({caseData.sourceOrderNumber})
        </Link>
      </div>

      {/* Main Header Card: Title, Case #, Badges */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${badgeInfo.className}`}>
              <TypeIcon size={14} weight="bold" />
              {badgeInfo.label}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              #{caseData.caseNumber}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 mt-1">
            {caseData.itemTitle}
          </h1>
          <p className="text-xs text-slate-500">
            Pelaku Usaha: <strong className="text-slate-700">{caseData.organizationName}</strong> • Kategori: {caseData.itemCategory}
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">Status Pengajuan</span>
          <span className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full border shadow-2xs ${statusInfo.className}`}>
            <StatusIcon size={16} weight="bold" />
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT: SECTION KIRI & SECTION KANAN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ======================================================== */}
        {/* SECTION KIRI (7 Kolom): STATUS DETAIL CARD & RINCIAN MASALAH */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Status Resolusi Aktif / Penyelesaian */}

          {/* 1.a. Status Pengembalian Dana (Refund) Stepper & Breakdown */}
          {caseData.refundDetail && (
            <div className="bg-white rounded-3xl border border-emerald-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Bank size={18} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Status Pengembalian Dana (Refund)
                    </h3>
                    <p className="text-[11px] text-slate-500">Penyaluran saldo kompensasi ke dompet Anda</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Ref: {caseData.refundDetail.refundReference}
                </span>
              </div>

              {/* Stepper Steps: Disetujui -> Diproses -> Berhasil / Terkendala */}
              <div className="grid grid-cols-3 gap-2 py-1">
                {/* Step 1: Disetujui */}
                <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-center space-y-1">
                  <div className="w-6 h-6 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                  <div className="font-bold text-xs text-slate-800">1. Disetujui</div>
                  <p className="text-[10px] text-slate-500">Keputusan hak refund tercatat</p>
                </div>

                {/* Step 2: Diproses */}
                <div
                  className={`p-3 rounded-2xl border text-center space-y-1 ${
                    caseData.refundDetail.status === "PROCESSING" || caseData.refundDetail.status === "COMPLETED_DEMO"
                      ? "bg-white border-emerald-300"
                      : "bg-slate-50 border-slate-200 opacity-60"
                  }`}
                >
                  <div
                    className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
                      caseData.refundDetail.status === "COMPLETED_DEMO"
                        ? "bg-emerald-600 text-white"
                        : caseData.refundDetail.status === "PROCESSING"
                        ? "bg-amber-500 text-white animate-pulse"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {caseData.refundDetail.status === "COMPLETED_DEMO" ? "✓" : "2"}
                  </div>
                  <div className="font-bold text-xs text-slate-800">2. Diproses</div>
                  <p className="text-[10px] text-slate-500">Penyaluran dana sedang ditangani</p>
                </div>

                {/* Step 3: Berhasil (Demo) / Terkendala */}
                <div
                  className={`p-3 rounded-2xl border text-center space-y-1 ${
                    caseData.refundDetail.status === "COMPLETED_DEMO"
                      ? "bg-emerald-100/70 border-emerald-300"
                      : caseData.refundDetail.status === "FAILED"
                      ? "bg-rose-50 border-rose-300"
                      : "bg-slate-50 border-slate-200 opacity-60"
                  }`}
                >
                  <div
                    className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
                      caseData.refundDetail.status === "COMPLETED_DEMO"
                        ? "bg-emerald-700 text-white"
                        : caseData.refundDetail.status === "FAILED"
                        ? "bg-rose-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {caseData.refundDetail.status === "COMPLETED_DEMO" ? "✓" : "3"}
                  </div>
                  <div className="font-bold text-xs text-slate-800">
                    {caseData.refundDetail.status === "FAILED" ? "Terkendala" : "3. Berhasil"}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {caseData.refundDetail.status === "COMPLETED_DEMO"
                      ? "Tersedia di S-Pay (Demo)"
                      : caseData.refundDetail.status === "FAILED"
                      ? "Kendala sistem settlement"
                      : "Menunggu penyelesaian"}
                  </p>
                </div>
              </div>

              {/* Refund Status Note */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-slate-700 font-medium">{caseData.refundDetail.statusNote}</span>
                {caseData.refundDetail.status === "COMPLETED_DEMO" && (
                  <Link
                    href="/spay"
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shrink-0 flex items-center justify-center gap-1 shadow-2xs"
                  >
                    Buka S-Pay
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                )}
              </div>

              {/* Refund Nominal Breakdown */}
              <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Nilai Pokok Barang/Jasa Disetujui:</span>
                  <span className="font-semibold text-slate-800">
                    Rp{caseData.refundDetail.productAmount.toLocaleString("id-ID")}
                  </span>
                </div>
                {caseData.refundDetail.approvedShippingAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Ongkos Kirim yang Disetujui:</span>
                    <span className="font-semibold text-slate-800">
                      +Rp{caseData.refundDetail.approvedShippingAmount.toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
                {caseData.refundDetail.feeAdjustment !== 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Penyesuaian Biaya Layanan:</span>
                    <span className="font-semibold text-slate-800">
                      Rp{caseData.refundDetail.feeAdjustment.toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-emerald-200/80 flex justify-between font-bold text-sm text-emerald-900">
                  <span>Total Pengembalian Dana:</span>
                  <span>Rp{caseData.refundDetail.totalRefund.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>
          )}

          {/* 1.b. Contextual Service Warranty Job (Rp0) */}
          {caseData.warrantyJob && (
            <div className="bg-white rounded-3xl border border-purple-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-purple-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Wrench size={18} weight="bold" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {caseData.warrantyJob.jobTitle}
                    </h3>
                    <p className="text-[11px] text-slate-500">Pekerjaan perbaikan & servis garansi toko</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-extrabold self-start sm:self-auto">
                  {caseData.warrantyJob.coveredAmountText}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">Teknisi Bertugas:</span>
                  <span className="font-bold text-slate-800">{caseData.warrantyJob.workerName || "Menunggu Penugasan"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Jadwal Pengerjaan:</span>
                  <span className="font-bold text-slate-800">{caseData.warrantyJob.scheduledDate || "Menunggu Konfirmasi"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Status Operasional:</span>
                  <span className="font-bold text-purple-700">
                    {caseData.warrantyJob.operationalStatus === "ASSIGNED"
                      ? "Teknisi Ditugaskan"
                      : caseData.warrantyJob.operationalStatus === "OTW"
                      ? "Teknisi Menuju Lokasi"
                      : caseData.warrantyJob.operationalStatus === "IN_PROGRESS"
                      ? "Sedang Dikerjakan"
                      : "Pekerjaan Selesai"}
                  </span>
                </div>
              </div>

              {caseData.warrantyJob.notes && (
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <strong>Catatan Pekerjaan:</strong> {caseData.warrantyJob.notes}
                </p>
              )}

              {/* Paid Work Quote (If diagnostic found outside-warranty issues) */}
              {caseData.warrantyJob.paidWorkQuote && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <WarningCircle size={15} weight="bold" />
                      Estimasi Pekerjaan Berbayar Tambahan (Di Luar Cakupan Garansi)
                    </span>
                    <span className="font-extrabold text-amber-900">
                      Rp{caseData.warrantyJob.paidWorkQuote.amount.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <p className="text-slate-700">{caseData.warrantyJob.paidWorkQuote.description}</p>
                  <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {caseData.warrantyJob.paidWorkQuote.customerApproved ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                        <CheckCircle size={14} weight="bold" />
                        Telah Anda Setujui (Simulasi Demo, tidak ada tagihan riil)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => customerApprovePaidWork(caseData.id)}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition cursor-pointer"
                      >
                        Setujui Pekerjaan Berbayar
                      </button>
                    )}
                    <span className="text-[10px] text-slate-500 italic">Persetujuan Customer wajib secara sadar</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 1.c. Contextual Return Shipping Section */}
          {caseData.returnShipping && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Truck size={18} weight="bold" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Instruksi Pengembalian Barang Fisik
                  </h3>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                  Ongkir: {caseData.returnShipping.shippingFeePayer === "MERCHANT" ? "Ditanggung Penjual" : "Ditanggung Pembeli"}
                </span>
              </div>

              {caseData.returnShipping.requiresPhysicalReturn ? (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600 leading-relaxed">
                    {caseData.returnShipping.feePayerExplanation}
                  </p>
                  {caseData.returnShipping.returnAddress && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[11px] text-slate-400 block font-medium">Alamat Pengembalian Toko:</span>
                      <strong className="text-slate-800">{caseData.returnShipping.returnAddress}</strong>
                    </div>
                  )}

                  {caseData.returnShipping.trackingNumber ? (
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] text-emerald-800 block">Resi Pengembalian Anda:</span>
                        <strong className="text-emerald-950 font-mono text-xs">
                          {caseData.returnShipping.courierName} — {caseData.returnShipping.trackingNumber}
                        </strong>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle size={14} weight="bold" />
                        {caseData.returnShipping.receivedByMerchant ? "Barang Diterima Penjual" : "Dalam Pengiriman"}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowShippingModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <UploadSimple size={15} weight="bold" />
                      Input Resi Pengembalian Barang
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-sky-50 rounded-2xl border border-sky-200 text-xs text-sky-900 flex items-center gap-2">
                  <Info size={16} weight="bold" className="shrink-0" />
                  <span>
                    <strong>Tanpa Pengiriman Balik:</strong> Karena komponen hilang atau salah kirim, Anda tidak diwajibkan mengirimkan barang fisik kembali.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 1.d. Contextual Replacement Item Tracking (Subprocess, NOT new order) */}
          {caseData.replacementShipment && (
            <div className="bg-white rounded-3xl border border-blue-200 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Package size={18} weight="bold" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Lacak Pengiriman Barang Pengganti
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold">
                  {caseData.replacementShipment.shippingStatus === "PREPARING"
                    ? "Sedang Dikemas"
                    : caseData.replacementShipment.shippingStatus === "SHIPPED"
                    ? "Sedang Dikirim"
                    : "Telah Diterima"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">Unit Pengganti:</span>
                  <span className="font-bold text-slate-800">{caseData.replacementShipment.replacementItemName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Kurir & No. Resi:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {caseData.replacementShipment.courierName} • {caseData.replacementShipment.trackingNumber || "Menunggu Resi"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Estimasi Tiba:</span>
                  <span className="font-bold text-blue-700">{caseData.replacementShipment.estimatedArrival || "-"}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Penggantian barang dipantau langsung pada pengajuan ini, bukan sebagai pembelian baru di Pesanan Saya.
              </p>
            </div>
          )}

          {/* 1.e. Merchant Alternative Solution Proposal (Scenario 12) */}
          {caseData.specialCondition === "WAITING_CUSTOMER_APPROVAL" && caseData.merchantAlternativeProposal && (
            <div className="bg-white rounded-3xl border border-indigo-200 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-start gap-3">
                <Tag size={20} weight="fill" className="text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-indigo-950">
                  <h4 className="font-bold text-sm">
                    Penjual Menawarkan Solusi Alternatif:{" "}
                    {caseData.merchantAlternativeProposal.solution === "REPLACEMENT"
                      ? "Penggantian / Penukaran Barang"
                      : caseData.merchantAlternativeProposal.solution === "REFUND"
                      ? "Pengembalian Dana"
                      : "Perbaikan"}
                  </h4>
                  <p className="text-slate-600 leading-relaxed italic">
                    &ldquo;{caseData.merchantAlternativeProposal.note}&rdquo;
                  </p>
                  <p className="text-[11px] text-indigo-800 font-medium">
                    Keputusan ini memerlukan persetujuan Anda sebelum diproses lebih lanjut.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAcceptAlt}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Setujui Solusi Alternatif
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectAltModal(true)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer"
                >
                  Tolak & Minta Solusi Awal
                </button>
              </div>
            </div>
          )}

          {/* 1.f. Rejection Details */}
          {caseData.mainStatus === "REJECTED" && (
            <div className="bg-white rounded-3xl border border-rose-200 p-5 sm:p-6 shadow-xs space-y-2 text-xs">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm pb-2 border-b border-rose-100">
                <XCircle size={18} weight="fill" className="text-rose-600" />
                <span>Pengajuan Ditolak oleh Pelaku Usaha</span>
              </div>
              <p className="text-rose-950 leading-relaxed pt-1">
                <strong>Alasan Penolakan:</strong> {caseData.rejectionReason || "Kondisi di luar syarat garansi / ketentuan retur."}
              </p>
              <div className="pt-2">
                {!caseData.reportedToSupport ? (
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Laporkan Masalah jika Tidak Sesuai Fakta
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Kasus telah dilaporkan ke Customer Support SERVIO (#{caseData.reportDetails?.reportId})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 2. Rincian Masalah & Solusi & Bukti */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Rincian Masalah & Bukti Pengajuan</span>
              {caseData.warrantyName && (
                <span className="font-semibold text-blue-600 normal-case tracking-normal flex items-center gap-1">
                  <ShieldCheck size={14} weight="fill" />
                  {caseData.warrantyName}
                </span>
              )}
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Alasan Kasus / Kendala:</span>
                <p className="font-bold text-slate-800 mt-0.5">{caseData.issueReason}</p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Deskripsi Lengkap Kronologi:</span>
                <p className="p-3 bg-slate-50 rounded-2xl text-slate-700 mt-1 leading-relaxed border border-slate-100">
                  {caseData.issueDescription}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[11px] font-medium">Solusi Diminta Customer:</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {caseData.customerRequestedSolution === "REFUND"
                      ? "Pengembalian Dana (Refund)"
                      : caseData.customerRequestedSolution === "REPLACEMENT"
                      ? "Penggantian Barang Baru"
                      : caseData.customerRequestedSolution === "REPAIR"
                      ? "Perbaikan / Pengerjaan Ulang Garansi"
                      : "Lainnya"}
                  </p>
                </div>

                {caseData.approvedSolution ? (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <span className="text-emerald-700 block text-[11px] font-medium">Solusi Disetujui Penjual:</span>
                    <p className="font-bold text-emerald-900 mt-0.5 flex items-center gap-1">
                      <CheckCircle size={14} weight="bold" />
                      {caseData.approvedSolution === "REFUND"
                        ? "Pengembalian Dana (Refund)"
                        : caseData.approvedSolution === "REPLACEMENT"
                        ? "Penggantian Barang Baru"
                        : "Perbaikan Garansi"}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[11px] font-medium">Solusi Disetujui:</span>
                    <p className="text-slate-500 italic mt-0.5">Menunggu konfirmasi pelaku usaha</p>
                  </div>
                )}
              </div>

              {caseData.caseType === "return_product" && (
                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-600">
                  <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700">
                    Kuantitas Retur: {caseData.affectedQuantity} dari {caseData.orderedQuantity} unit
                  </span>
                  <span>(Mendukung Retur Parsial)</span>
                </div>
              )}

              {caseData.evidenceMedia && caseData.evidenceMedia.length > 0 && (
                <div className="pt-2">
                  <span className="text-slate-500 block text-[11px] font-medium mb-1.5">
                    Bukti Foto / Media Lokal:
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {caseData.evidenceMedia.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`Bukti ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION KANAN (5 Kolom): SLA STATUS, RINGKASAN ORDER, & TIMELINE */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. SLA 72H & NO_RESPONSE Status Notice */}
          <div
            className={`rounded-3xl p-5 border shadow-xs space-y-3 ${
              caseData.isNoResponse
                ? "bg-amber-50/90 border-amber-300 text-amber-950"
                : "bg-white border-slate-200 text-slate-700"
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Clock size={16} weight="bold" className={caseData.isNoResponse ? "text-amber-600" : "text-blue-600"} />
                <span>SLA Tanggapan Pelaku Usaha</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  caseData.isNoResponse ? "bg-amber-200 text-amber-900" : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                Batas 3×24 Jam
              </span>
            </div>

            {caseData.isNoResponse ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                  <WarningOctagon size={16} weight="fill" className="text-amber-600 shrink-0" />
                  <span>Batas Waktu Respons Terlewati</span>
                </div>
                <p className="text-amber-900 text-[11px] leading-relaxed">
                  Pelaku usaha (<strong className="font-semibold">{caseData.organizationName}</strong>) belum memberikan tanggapan hingga tenggat waktu{" "}
                  <strong>{new Date(caseData.slaDeadlineAt).toLocaleString("id-ID")}</strong>.
                  Pengajuan Anda <strong>belum dinyatakan ditolak</strong> dan tidak otomatis ditutup.
                </p>
                <div className="pt-1">
                  {!caseData.reportedToSupport ? (
                    <button
                      type="button"
                      onClick={() => setShowReportModal(true)}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <WarningCircle size={15} weight="bold" />
                      Laporkan Masalah ke Support SERVIO
                    </button>
                  ) : (
                    <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-[11px] font-bold flex items-center gap-1.5">
                      <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0" />
                      <span>Laporan Terkirim #{caseData.reportDetails?.reportId}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[11px]">Batas Waktu SLA:</span>
                  <span className="font-semibold text-slate-800">{new Date(caseData.slaDeadlineAt).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="text-slate-400 text-[11px]">Status Respons:</span>
                  {caseData.respondedAt ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                      <CheckCircle size={13} weight="bold" />
                      Direspons {new Date(caseData.respondedAt).toLocaleDateString("id-ID")}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold flex items-center gap-1 text-[11px]">
                      <Clock size={13} weight="bold" />
                      Menunggu tanggapan awal
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Ringkasan Dokumen Pesanan */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Informasi Pesanan Asli</span>
              <Receipt size={16} className="text-slate-400" />
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Nomor Pesanan:</span>
                <span className="font-mono font-bold text-slate-800">{caseData.sourceOrderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mitra Penyedia:</span>
                <span className="font-semibold text-slate-700">{caseData.organizationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kategori:</span>
                <span className="text-slate-700">{caseData.itemCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tanggal Pengajuan:</span>
                <span className="text-slate-700">{new Date(caseData.submittedAt).toLocaleDateString("id-ID")}</span>
              </div>
            </div>
            <div className="pt-2">
              <Link
                href={orderHref}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-blue-600 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <FileText size={14} weight="bold" />
                Buka Dokumen Pesanan #{caseData.sourceOrderNumber}
              </Link>
            </div>
          </div>

          {/* 3. Riwayat Aktivitas & Perjalanan Kasus (Timeline) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
              Riwayat Aktivitas & Timeline
            </h3>

            <div className="relative pl-5 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {caseData.timeline.map((item, idx) => (
                <div key={item.id || idx} className="relative space-y-1 text-xs">
                  <div
                    className={`absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-2xs ${
                      item.actor === "CUSTOMER"
                        ? "bg-blue-600"
                        : item.actor === "MERCHANT"
                        ? "bg-rose-500"
                        : item.actor === "PROVIDER"
                        ? "bg-purple-600"
                        : "bg-slate-400"
                    }`}
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-slate-800">{item.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.actor}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{new Date(item.timestamp).toLocaleString("id-ID")}</p>
                  <p className="text-slate-600 leading-relaxed text-[11px] pt-0.5">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODALS DENGAN BACKDROP LEMBUT (NO BG HITAM) */}
      {/* ======================================================== */}

      {/* Modal: Laporkan Masalah (Demo Modul 09) */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-amber-700 font-bold">
                  <WarningCircle size={20} weight="fill" />
                  <span>Laporkan Masalah ke Customer Support (Demo)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p><strong>Nomor Pengajuan:</strong> {caseData.caseNumber}</p>
                <p><strong>Item / Jasa:</strong> {caseData.itemTitle}</p>
                <p><strong>Pelaku Usaha:</strong> {caseData.organizationName}</p>
                <p className="text-[11px] text-slate-500 italic">
                  Ringkasan kronologi dan bukti kasus otomatis dilampirkan ke laporan.
                </p>
              </div>

              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Alasan Pelaporan / Keluhan:
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Contoh: Pelaku usaha tidak membalas pengajuan selama lebih dari 3 hari, atau menolak tanpa dasar bukti..."
                    className="w-full p-3 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Kirim Laporan (Demo Only)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Input Resi Pengembalian */}
      <AnimatePresence>
        {showShippingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                  <Truck size={20} weight="bold" />
                  <span>Input Resi Pengembalian Barang</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShippingModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleShippingSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Kurir Pengiriman:</label>
                  <input
                    type="text"
                    required
                    value={courierNameInput}
                    onChange={(e) => setCourierNameInput(e.target.value)}
                    placeholder="Contoh: J&T Cargo, JNE Reguler..."
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Nomor Resi / AWB:</label>
                  <input
                    type="text"
                    required
                    value={trackingNumberInput}
                    onChange={(e) => setTrackingNumberInput(e.target.value)}
                    placeholder="Contoh: JTC-980128391..."
                    className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Klaim Biaya Ongkir (Opsional, jika ditanggung Merchant):
                  </label>
                  <input
                    type="number"
                    value={claimedFeeInput}
                    onChange={(e) => setClaimedFeeInput(e.target.value)}
                    placeholder="Contoh: 35000"
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShippingModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm cursor-pointer"
                  >
                    Simpan Resi (Demo)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Tolak Tawaran Alternatif */}
      <AnimatePresence>
        {showRejectAltModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="text-sm font-bold text-slate-900">
                Tolak Solusi Alternatif Penjual
              </h3>
              <p className="text-xs text-slate-600">
                Anda memilih untuk tidak menerima penukaran barang alternatif dan meminta peninjauan kembali solusi awal yang Anda ajukan.
              </p>
              <form onSubmit={handleRejectAltSubmit} className="space-y-4">
                <textarea
                  rows={3}
                  value={rejectAltReason}
                  onChange={(e) => setRejectAltReason(e.target.value)}
                  placeholder="Catatan untuk penjual mengapa Anda tidak setuju..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectAltModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer"
                  >
                    Kirim Penolakan Alternatif
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
