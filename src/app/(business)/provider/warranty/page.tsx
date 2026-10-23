"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Wrench,
  Clock,
  WarningCircle,
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  User,
  CalendarCheck,
  Tag,
  ArrowRight,
} from "@phosphor-icons/react";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { WarrantyPresetManager } from "@/components/features/afterSales/WarrantyPresetManager";
import { AfterSalesCase } from "@/types/afterSales";

type ProviderTab = "settings" | "claims";

function ProviderAfterSalesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as ProviderTab) || "settings";

  const [activeTab, setActiveTab] = useState<ProviderTab>(
    initialTab === "claims" ? "claims" : "settings"
  );

  const { cases, providerApproveWarrantyJob, providerRejectClaim } = useAfterSales();

  const activeProviderOrgId = "usr-prov-001"; // PT Servio Mandiri Teknik

  const serviceClaims = cases.filter(
    (c) =>
      c.caseType === "claim_service" &&
      (c.organizationId === activeProviderOrgId || c.organizationType === "PROVIDER")
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Approve Warranty Job Modal State
  const [approvingClaim, setApprovingClaim] = useState<AfterSalesCase | null>(null);
  const [workerName, setWorkerName] = useState("Ahmad Fauzi (Teknisi Senior)");
  const [scheduledDate, setScheduledDate] = useState("Besok, 13:00 - 15:00 WIB");
  const [jobNote, setJobNote] = useState("Flushing selang drainase dan reposisi talang air.");

  // Reject Modal State
  const [rejectingClaim, setRejectingClaim] = useState<AfterSalesCase | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingClaim) return;
    providerApproveWarrantyJob(approvingClaim.id, workerName, scheduledDate, jobNote);
    setToastMsg(`Pekerjaan garansi Rp0 berhasil dijadwalkan untuk kasus #${approvingClaim.caseNumber}.`);
    setApprovingClaim(null);
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingClaim) return;
    if (!rejectionReason.trim()) return;
    providerRejectClaim(rejectingClaim.id, rejectionReason.trim());
    setToastMsg(`Klaim garansi #${rejectingClaim.caseNumber} telah ditolak dengan alasan tercatat.`);
    setRejectingClaim(null);
    setRejectionReason("");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <div className="fixed top-6 right-6 z-50">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-3 shadow-lg"
            >
              <CheckCircle size={18} weight="fill" className="text-emerald-600" />
              <span>{toastMsg}</span>
              <button onClick={() => setToastMsg(null)} className="font-bold ml-2 text-emerald-900">
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                Dashboard Service Provider • After-Sales
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                PT Servio Mandiri Teknik
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold font-display text-slate-900 leading-tight">
              Layanan Purnajual &amp; Pengaturan Garansi Jasa
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola pilihan durasi garansi pengerjaan layanan dan tinjau klaim garansi yang diajukan oleh pelanggan.
            </p>
          </div>
        </div>

        {/* 2 Provider Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 -mb-px overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab("settings");
              router.push("/provider/warranty?tab=settings");
            }}
            className={`pb-2.5 px-3.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
              activeTab === "settings"
                ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <ShieldCheck size={15} weight={activeTab === "settings" ? "fill" : "bold"} />
            <span>Pengaturan Garansi Layanan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("claims");
              router.push("/provider/warranty?tab=claims");
            }}
            className={`pb-2.5 px-3.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
              activeTab === "claims"
                ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <Wrench size={15} weight={activeTab === "claims" ? "fill" : "bold"} />
            <span>Klaim Garansi Jasa</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-700 font-bold">
              {serviceClaims.length}
            </span>
          </button>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 py-3 space-y-3.5">
        {/* Demo Indicator */}
        <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-300 rounded-xl text-[10px] text-amber-800 font-medium flex items-center gap-2">
          <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[9px] font-bold uppercase">
            DEMO ONLY
          </span>
          <span>DATA SIMULASI — BELUM TERHUBUNG SISTEM AFTER-SALES OPERASIONAL</span>
        </div>

        {/* TAB 1: PENGATURAN GARANSI LAYANAN */}
        {activeTab === "settings" && (
          <WarrantyPresetManager
            organizationId={activeProviderOrgId}
            organizationType="PROVIDER"
            title="Pengaturan Garansi Layanan Jasa"
            subtitle="Pilihan garansi ini akan muncul di dropdown saat Anda menambahkan atau mengedit layanan jasa di katalog."
          />
        )}

        {/* TAB 2: KLAIM GARANSI JASA */}
        {activeTab === "claims" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200">
              <h2 className="text-sm font-bold text-slate-900">
                Daftar Permohonan Klaim Garansi Pengerjaan Layanan
              </h2>
              <div className="relative">
                <MagnifyingGlass size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor klaim / jasa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200"
                />
              </div>
            </div>

            {serviceClaims.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500">
                Belum ada klaim garansi jasa masuk untuk penyedia Anda.
              </div>
            ) : (
              <div className="space-y-4">
                {serviceClaims.map((c) => (
                  <div
                    key={c.id}
                    className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-purple-700">#{c.caseNumber}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500">Order #{c.sourceOrderNumber}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-semibold text-slate-700">Customer: {c.customerName}</span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900 mt-1">{c.itemTitle}</h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {c.isNoResponse ? (
                          <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-bold">
                            TIDAK DITANGGAPI (+72h)
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
                            {c.mainStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Kendala Layanan Dilaporkan:</span>
                        <strong className="text-slate-800">{c.issueReason}</strong>
                        <p className="text-slate-600 mt-1">{c.issueDescription}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-400 block text-[11px]">Batas Respons (SLA 72 Jam):</span>
                        <p className="font-semibold text-slate-800">
                          {new Date(c.slaDeadlineAt).toLocaleString("id-ID")}
                        </p>
                        {c.warrantyJob && (
                          <div className="p-2 bg-purple-50 rounded-lg border border-purple-200 text-purple-900 mt-1">
                            <strong>Pekerjaan Garansi Ditugaskan:</strong> {c.warrantyJob.workerName} ({c.warrantyJob.coveredAmountText})
                          </div>
                        )}
                        {c.rejectionReason && (
                          <p className="text-rose-700 mt-1">
                            <strong>Alasan Ditolak:</strong> {c.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Provider Actions if not terminal */}
                    {c.mainStatus !== "COMPLETED" && c.mainStatus !== "REJECTED" && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setApprovingClaim(c);
                            setJobNote(`Pengerjaan perbaikan garansi untuk masalah: ${c.issueReason}`);
                          }}
                          className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
                        >
                          <Wrench size={14} weight="bold" />
                          Setujui Pekerjaan Garansi (Rp0)
                        </button>

                        <button
                          type="button"
                          onClick={() => setRejectingClaim(c)}
                          className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold rounded-xl transition"
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

      {/* Modal: Setujui Pekerjaan Garansi */}
      <AnimatePresence>
        {approvingClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                <Wrench size={18} weight="bold" />
                <span>Jadwalkan Pekerjaan Garansi (Rp0): #{approvingClaim.caseNumber}</span>
              </div>
              <p className="text-xs text-slate-600">
                Pekerjaan garansi ini terhubung dengan pesanan asal #{approvingClaim.sourceOrderNumber} dan <strong>tidak membuat pesanan komersial baru</strong>.
              </p>

              <form onSubmit={handleApproveSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Teknisi Ditugaskan:</label>
                  <input
                    type="text"
                    required
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jadwal Kehadiran Teknisi:</label>
                  <input
                    type="text"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Instruksi & Catatan Pengerjaan:</label>
                  <textarea
                    rows={3}
                    value={jobNote}
                    onChange={(e) => setJobNote(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-950 font-bold text-[11px] flex items-center justify-between">
                  <span>Biaya Customer (Ditanggung Garansi):</span>
                  <span className="text-emerald-700 font-extrabold text-xs">Rp0</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setApprovingClaim(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-sm"
                  >
                    Konfirmasi Penugasan (Rp0)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Tolak Klaim */}
      <AnimatePresence>
        {rejectingClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900">
                Tolak Klaim Garansi Jasa: #{rejectingClaim.caseNumber}
              </h3>
              <p className="text-xs text-slate-600">
                Alasan penolakan wajib disampaikan secara objektif dan akan terlihat oleh Customer.
              </p>
              <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Alasan Penolakan (Wajib):</label>
                  <textarea
                    rows={4}
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Contoh: Kerusakan terjadi akibat pembongkaran oleh pihak ketiga di luar cakupan garansi layanan..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingClaim(null)}
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
    </div>
  );
}

export default function ProviderWarrantyPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Memuat dashboard garansi layanan...</div>}>
      <ProviderAfterSalesContent />
    </Suspense>
  );
}
