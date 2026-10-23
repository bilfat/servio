"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Package,
  ArrowsClockwise,
  Clock,
  WarningCircle,
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  Check,
  X,
  FileText,
  User,
  Truck,
  Receipt,
  Tag,
  ArrowRight,
} from "@phosphor-icons/react";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { WarrantyPresetManager } from "@/components/features/afterSales/WarrantyPresetManager";
import { AfterSalesCase, AfterSalesSolutionType } from "@/types/afterSales";

type MerchantTab = "settings" | "claims" | "returns";

function MerchantAfterSalesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as MerchantTab) || "settings";

  const [activeTab, setActiveTab] = useState<MerchantTab>(
    initialTab === "claims" || initialTab === "returns" ? initialTab : "settings"
  );

  const {
    cases,
    merchantApproveCase,
    merchantRejectCase,
    merchantProposeAlternative,
    merchantConfirmReturnReceived,
  } = useAfterSales();

  const activeOrgId = "merch-jaya-motor"; // Canonical Merchant Organization

  // Filter cases for this merchant
  const merchantClaims = cases.filter(
    (c) => c.caseType === "claim_product" && (c.organizationId === activeOrgId || c.organizationType === "MERCHANT")
  );

  const merchantReturns = cases.filter(
    (c) => c.caseType === "return_product" && (c.organizationId === activeOrgId || c.organizationType === "MERCHANT")
  );

  // Search and filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Approve Modal State
  const [approvingCase, setApprovingCase] = useState<AfterSalesCase | null>(null);
  const [chosenApprovalSolution, setChosenApprovalSolution] = useState<AfterSalesSolutionType>("REPLACEMENT");
  const [approvalNote, setApprovalNote] = useState("");

  // Reject Modal State
  const [rejectingCase, setRejectingCase] = useState<AfterSalesCase | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Propose Alternative Modal State
  const [altCase, setAltCase] = useState<AfterSalesCase | null>(null);
  const [altSolution, setAltSolution] = useState<AfterSalesSolutionType>("REPLACEMENT");
  const [altNote, setAltNote] = useState("");

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingCase) return;
    merchantApproveCase(approvingCase.id, chosenApprovalSolution, approvalNote);
    setToastMsg(`Pengajuan #${approvingCase.caseNumber} berhasil disetujui dengan solusi: ${chosenApprovalSolution}.`);
    setApprovingCase(null);
    setApprovalNote("");
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingCase) return;
    if (!rejectionReason.trim()) return;
    merchantRejectCase(rejectingCase.id, rejectionReason.trim());
    setToastMsg(`Pengajuan #${rejectingCase.caseNumber} telah ditolak dengan alasan tercatat.`);
    setRejectingCase(null);
    setRejectionReason("");
  };

  const handleAltSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!altCase) return;
    if (!altNote.trim()) return;
    merchantProposeAlternative(altCase.id, altSolution, altNote.trim());
    setToastMsg(`Solusi alternatif berhasil diajukan kepada Customer untuk kasus #${altCase.caseNumber}.`);
    setAltCase(null);
    setAltNote("");
  };

  return (
    <div className="w-full pb-16 font-body space-y-3.5">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <div className="fixed top-6 right-6 z-50">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2.5 shadow-md"
            >
              <CheckCircle size={16} weight="fill" className="text-emerald-600" />
              <span>{toastMsg}</span>
              <button onClick={() => setToastMsg(null)} className="font-bold ml-2 text-emerald-900 cursor-pointer">
                ✕
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="w-full bg-white border-b border-slate-200/80 px-4 sm:px-6 pt-3 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                Dashboard Merchant • After-Sales
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Toko: Jaya Pendingin Glodok
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold font-display text-slate-900 leading-tight">
              Layanan Purnajual &amp; Pengaturan Garansi Toko
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur preset durasi garansi toko, kelola permohonan klaim barang, serta proses pengembalian retur dari pembeli.
            </p>
          </div>
        </div>

        {/* 3 Merchant Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 -mb-px overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab("settings");
              router.push("/merchant/warranty?tab=settings");
            }}
            className={`pb-2.5 px-3.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
              activeTab === "settings"
                ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <ShieldCheck size={15} weight={activeTab === "settings" ? "fill" : "bold"} />
            <span>Pengaturan Garansi Toko</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("claims");
              router.push("/merchant/warranty?tab=claims");
            }}
            className={`pb-2.5 px-3.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
              activeTab === "claims"
                ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <Package size={15} weight={activeTab === "claims" ? "fill" : "bold"} />
            <span>Klaim Garansi Produk</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
              {merchantClaims.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("returns");
              router.push("/merchant/warranty?tab=returns");
            }}
            className={`pb-2.5 px-3.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
              activeTab === "returns"
                ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <ArrowsClockwise size={15} weight={activeTab === "returns" ? "fill" : "bold"} />
            <span>Retur Barang</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
              {merchantReturns.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full px-4 sm:px-6 py-3 space-y-3.5">
        {/* Demo Indicator */}
        <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-300 rounded-xl text-[10px] text-amber-800 font-medium flex items-center gap-2">
          <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[9px] font-bold uppercase">
            DEMO ONLY
          </span>
          <span>DATA SIMULASI — BELUM TERHUBUNG SISTEM AFTER-SALES OPERASIONAL</span>
        </div>

        {/* TAB 1: PENGATURAN GARANSI TOKO */}
        {activeTab === "settings" && (
          <WarrantyPresetManager
            organizationId={activeOrgId}
            organizationType="MERCHANT"
            title="Pengaturan Garansi Toko Merchant"
            subtitle="Pilihan garansi ini akan muncul di dropdown saat Anda menambahkan atau mengedit produk di katalog."
          />
        )}

        {/* TAB 2: KLAIM GARANSI PRODUK */}
        {activeTab === "claims" && (
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80">
              <h2 className="text-xs font-bold text-slate-900">
                Daftar Permohonan Klaim Garansi Barang Masuk
              </h2>
              <div className="relative">
                <MagnifyingGlass size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor klaim / item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {merchantClaims.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-500">
                Belum ada klaim garansi produk masuk untuk toko Anda.
              </div>
            ) : (
              <div className="space-y-3">
                {merchantClaims.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-600">#{c.caseNumber}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500">Order #{c.sourceOrderNumber}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-semibold text-slate-700">Customer: {c.customerName}</span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mt-0.5">{c.itemTitle}</h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {c.isNoResponse ? (
                          <span className="px-2.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                            TIDAK DITANGGAPI (+72h)
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              c.mainStatus === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : c.mainStatus === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-sky-50 text-sky-700 border-sky-200"
                            }`}
                          >
                            {c.mainStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Kendala Masalah:</span>
                        <strong className="text-slate-800 text-xs">{c.issueReason}</strong>
                        <p className="text-slate-600 mt-0.5 text-[11px] leading-snug">{c.issueDescription}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tenggat Tanggapan (SLA 72 Jam):</span>
                        <p className="font-semibold text-slate-800 text-xs">
                          {new Date(c.slaDeadlineAt).toLocaleString("id-ID")}
                        </p>
                        {c.rejectionReason && (
                          <p className="text-rose-700 mt-0.5 text-[11px]">
                            <strong>Alasan Ditolak:</strong> {c.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons if not terminal */}
                    {c.mainStatus !== "COMPLETED" && c.mainStatus !== "REJECTED" && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setApprovingCase(c);
                            setChosenApprovalSolution("REPLACEMENT");
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                        >
                          Setujui Penanganan
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingCase(c)}
                          className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Tolak dengan Alasan
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RETUR BARANG MASUK */}
        {activeTab === "returns" && (
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80">
              <h2 className="text-xs font-bold text-slate-900">
                Daftar Permintaan Retur Barang dari Pembeli
              </h2>
            </div>

            {merchantReturns.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-500">
                Belum ada permintaan retur barang masuk.
              </div>
            ) : (
              <div className="space-y-3">
                {merchantReturns.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-rose-600">#{c.caseNumber}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500">Order #{c.sourceOrderNumber}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-semibold text-slate-700">Customer: {c.customerName}</span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mt-0.5">{c.itemTitle}</h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {c.specialCondition === "WAITING_CUSTOMER_APPROVAL" ? (
                          <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-800 rounded-full text-[10px] font-bold border border-indigo-200">
                            Menunggu Persetujuan Customer
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              c.mainStatus === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : c.mainStatus === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : c.mainStatus === "IN_RESOLUTION"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-sky-50 text-sky-700 border-sky-200"
                            }`}
                          >
                            {c.mainStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <div className="space-y-1">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Rincian Retur:</span>
                        <p className="font-bold text-slate-800 text-xs">
                          {c.affectedQuantity} unit bermasalah (dari total beli {c.orderedQuantity} unit)
                        </p>
                        <p className="text-slate-600 text-[11px]">Alasan: {c.issueReason}</p>
                        <p className="text-slate-500 italic mt-0.5 text-[11px] leading-snug">{c.issueDescription}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Solusi Pilihan Customer:</span>
                        <p className="font-bold text-blue-600 text-xs">
                          {c.customerRequestedSolution === "REFUND" ? "Pengembalian Dana (Refund)" : "Penggantian Unit Baru"}
                        </p>
                        {c.merchantAlternativeProposal && (
                          <p className="text-indigo-800 bg-indigo-50 p-2 rounded-lg border border-indigo-100 mt-1 text-[11px]">
                            <strong>Usulan Alternatif Anda:</strong> {c.merchantAlternativeProposal.solution} — &ldquo;{c.merchantAlternativeProposal.note}&rdquo;
                          </p>
                        )}
                        {c.returnShipping?.trackingNumber && (
                          <p className="text-emerald-700 font-mono mt-1 text-[11px]">
                            Resi Kirim Balik: {c.returnShipping.courierName} ({c.returnShipping.trackingNumber})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Merchant Actions */}
                    {c.mainStatus !== "COMPLETED" && c.mainStatus !== "REJECTED" && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        {c.returnShipping?.trackingNumber && !c.returnShipping.receivedByMerchant && (
                          <button
                            type="button"
                            onClick={() => merchantConfirmReturnReceived(c.id, true, "Barang retur diperiksa dan sesuai keluhan.")}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                          >
                            Konfirmasi Barang Diterima &amp; Lolos Cek
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setApprovingCase(c);
                            setChosenApprovalSolution(c.customerRequestedSolution || "REFUND");
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                        >
                          Setujui Retur ({c.customerRequestedSolution})
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAltCase(c);
                            setAltSolution(c.customerRequestedSolution === "REFUND" ? "REPLACEMENT" : "REFUND");
                          }}
                          className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Tawarkan Solusi Alternatif
                        </button>

                        <button
                          type="button"
                          onClick={() => setRejectingCase(c)}
                          className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Tolak dengan Alasan
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Setujui Kasus */}
      <AnimatePresence>
        {approvingCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900">
                Persetujuan Penanganan: #{approvingCase.caseNumber}
              </h3>
              <form onSubmit={handleApproveSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pilih Solusi Penanganan:</label>
                  <select
                    value={chosenApprovalSolution}
                    onChange={(e) => setChosenApprovalSolution(e.target.value as AfterSalesSolutionType)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="REPAIR">Perbaikan (Repair)</option>
                    <option value="REPLACEMENT">Penggantian Barang Baru (Replacement)</option>
                    <option value="REFUND">Pengembalian Dana (Refund)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catatan Persetujuan untuk Pembeli:</label>
                  <textarea
                    rows={3}
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder="Contoh: Kami telah menyiapkan unit baru untuk dikirimkan..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setApprovingCase(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold bg-emerald-600 text-white rounded-xl shadow-sm"
                  >
                    Konfirmasi Persetujuan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Tolak dengan Alasan */}
      <AnimatePresence>
        {rejectingCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900">
                Tolak Pengajuan: #{rejectingCase.caseNumber}
              </h3>
              <p className="text-xs text-slate-600">
                Alasan penolakan wajib dituliskan dengan jelas dan akan dapat dibaca langsung oleh Customer.
              </p>
              <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Alasan Penolakan Sah (Wajib):</label>
                  <textarea
                    rows={4}
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Tuliskan bukti fisik atau ketentuan garansi yang tidak terpenuhi..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingCase(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold bg-rose-600 text-white rounded-xl shadow-sm"
                  >
                    Kirim Penolakan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Tawarkan Solusi Alternatif */}
      <AnimatePresence>
        {altCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900">
                Tawarkan Solusi Alternatif: #{altCase.caseNumber}
              </h3>
              <p className="text-xs text-slate-600">
                Customer meminta: <strong>{altCase.customerRequestedSolution}</strong>. Anda dapat mengusulkan alternatif yang wajib disetujui Customer.
              </p>
              <form onSubmit={handleAltSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Usulan Solusi Anda:</label>
                  <select
                    value={altSolution}
                    onChange={(e) => setAltSolution(e.target.value as AfterSalesSolutionType)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="REPLACEMENT">Tukar dengan Varian / Unit Lain (Replacement)</option>
                    <option value="REFUND">Pengembalian Dana (Refund)</option>
                    <option value="REPAIR">Perbaikan Sparepart (Repair)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Penjelasan & Alasan Tawaran (Wajib):</label>
                  <textarea
                    rows={3}
                    required
                    value={altNote}
                    onChange={(e) => setAltNote(e.target.value)}
                    placeholder="Contoh: Kami menyarankan menukar ke seri original tanpa biaya tambahan karena seri universal sering tidak pas..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAltCase(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold bg-indigo-600 text-white rounded-xl shadow-sm"
                  >
                    Kirim Tawaran Alternatif
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

export default function MerchantWarrantyPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Memuat dashboard after-sales...</div>}>
      <MerchantAfterSalesContent />
    </Suspense>
  );
}
