"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Wrench,
  Clock,
  CheckCircle,
  MagnifyingGlass,
  ArrowsClockwise,
  Eye,
  Camera,
  X,
  CalendarBlank,
  Play,
  FilePlus,
  WarningCircle,
  Receipt,
} from "@phosphor-icons/react";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { AfterSalesCase, AfterSalesSolutionType } from "@/types/afterSales";

export default function ProviderWarrantyRequestsPage() {
  const router = useRouter();
  const {
    cases,
    isLoading,
    refreshData,
    providerApproveWarrantyJob,
    providerRejectClaim,
    merchantProposeAlternative,
    merchantRequestEvidence,
    merchantStartResolution,
    merchantCompleteCase,
    getMainStatusDisplay,
  } = useAfterSales();

  const serviceClaims = useMemo(
    () =>
      cases.filter(
        (c) =>
          c.caseType === "claim_service" ||
          c.organizationType === "PROVIDER"
      ),
    [cases]
  );

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Detail Modal State (P05)
  const [viewingDetailCase, setViewingDetailCase] = useState<AfterSalesCase | null>(null);

  // Approve Warranty Job Modal State (ACCEPT_INITIAL)
  const [approvingClaim, setApprovingClaim] = useState<AfterSalesCase | null>(null);
  const [workerName, setWorkerName] = useState("Teknisi Garansi Resmi");
  const [scheduledDate, setScheduledDate] = useState("Besok, 10:00 - 12:00 WIB");
  const [jobNote, setJobNote] = useState("Pemeriksaan dan pengerjaan ulang sesuai cakupan garansi layanan (Rp0).");

  // Propose Alternative Modal State (PROPOSE_ALTERNATIVE)
  const [altClaim, setAltClaim] = useState<AfterSalesCase | null>(null);
  const [altSolution, setAltSolution] = useState<AfterSalesSolutionType>("REFUND");
  const [altReason, setAltReason] = useState("");

  // Request Evidence Modal State (REQUEST_EVIDENCE)
  const [reqEvidenceClaim, setReqEvidenceClaim] = useState<AfterSalesCase | null>(null);
  const [reqEvidenceReason, setReqEvidenceReason] = useState("");

  // Complete Case Modal State (complete)
  const [completingClaim, setCompletingClaim] = useState<AfterSalesCase | null>(null);
  const [completionEvidenceRef, setCompletionEvidenceRef] = useState("");

  // Reject Claim Modal State (REJECT_WITH_REASON)
  const [rejectingClaim, setRejectingClaim] = useState<AfterSalesCase | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const filteredClaims = useMemo(() => {
    return serviceClaims.filter((c) => {
      const matchesStatus = statusFilter === "ALL" || c.mainStatus === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.caseNumber.toLowerCase().includes(q) ||
        c.itemTitle.toLowerCase().includes(q) ||
        c.sourceOrderNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.issueReason.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [serviceClaims, statusFilter, searchQuery]);

  // KPI Metrics from Real Backend Cases
  const submittedOrReviewCount = serviceClaims.filter(
    (c) => c.mainStatus === "SUBMITTED" || c.mainStatus === "UNDER_REVIEW"
  ).length;
  const overdueCount = serviceClaims.filter((c) => c.isNoResponse).length;
  const inResolutionCount = serviceClaims.filter((c) => c.mainStatus === "IN_RESOLUTION").length;
  const completedCount = serviceClaims.filter((c) => c.mainStatus === "COMPLETED").length;

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingClaim) return;
    await providerApproveWarrantyJob(approvingClaim.id, workerName, scheduledDate, jobNote);
    setToastMsg(`Klaim garansi #${approvingClaim.caseNumber} berhasil disetujui (Pengerjaan Ulang Rp0).`);
    setApprovingClaim(null);
  };

  const handleAltSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!altClaim || !altReason.trim()) return;
    await merchantProposeAlternative(altClaim.id, altSolution, altReason.trim());
    setToastMsg(`Solusi alternatif (${altSolution}) berhasil diajukan ke Customer untuk #${altClaim.caseNumber}.`);
    setAltClaim(null);
    setAltReason("");
  };

  const handleRequestEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqEvidenceClaim || !reqEvidenceReason.trim()) return;
    await merchantRequestEvidence(reqEvidenceClaim.id, reqEvidenceReason.trim());
    setToastMsg(`Permintaan bukti tambahan untuk klaim #${reqEvidenceClaim.caseNumber} telah dikirim.`);
    setReqEvidenceClaim(null);
    setReqEvidenceReason("");
  };

  const handleStartResolution = async (c: AfterSalesCase) => {
    await merchantStartResolution(c.id);
    setToastMsg(`Eksekusi penyelesaian klaim jasa #${c.caseNumber} dimulai.`);
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingClaim || !completionEvidenceRef.trim()) return;
    await merchantCompleteCase(completingClaim.id, completionEvidenceRef.trim());
    setToastMsg(`Klaim garansi jasa #${completingClaim.caseNumber} telah diselesaikan.`);
    setCompletingClaim(null);
    setCompletionEvidenceRef("");
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingClaim || !rejectionReason.trim()) return;
    await providerRejectClaim(rejectingClaim.id, rejectionReason.trim());
    setToastMsg(`Klaim garansi #${rejectingClaim.caseNumber} telah ditolak dengan alasan tercatat.`);
    setRejectingClaim(null);
    setRejectionReason("");
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Toast Notification */}
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
              <button
                onClick={() => setToastMsg(null)}
                className="font-bold ml-2 text-emerald-900 cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                <ShieldCheck size={14} weight="fill" className="text-purple-600" />
                Pusat Klaim Garansi Layanan Jasa (Port 8008)
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Pengajuan Garansi Layanan
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Kelola seluruh klaim garansi layanan pelanggan secara real-time dari database After-Sales (`SERVICE_WARRANTY`), berikan keputusan resmi, dan pantau penyelesaian pengerjaan ulang (Rp0) maupun pengembalian dana.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => router.push("/provider/warranty?tab=settings")}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                Konfigurasi Garansi
              </button>
              <button
                type="button"
                onClick={() => refreshData()}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                <ArrowsClockwise size={15} weight="bold" className={isLoading ? "animate-spin" : ""} />
                Muat Ulang
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* 5 Real KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
              Total Pengajuan
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">{serviceClaims.length}</p>
            <span className="text-xs text-slate-500">Klaim garansi jasa tercatat</span>
          </div>

          <div className="bg-white rounded-2xl border border-blue-200 p-4 shadow-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 block">
              Menunggu Keputusan
            </span>
            <p className="text-3xl font-black text-blue-600 mt-1">{submittedOrReviewCount}</p>
            <span className="text-xs text-slate-500">SUBMITTED / UNDER_REVIEW</span>
          </div>

          <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 block">
              Tidak Ditanggapi
            </span>
            <p className="text-3xl font-black text-amber-600 mt-1">{overdueCount}</p>
            <span className="text-xs text-amber-700">Lewat SLA 72 jam kalender</span>
          </div>

          <div className="bg-white rounded-2xl border border-indigo-200 p-4 shadow-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 block">
              Dalam Penyelesaian
            </span>
            <p className="text-3xl font-black text-indigo-600 mt-1">{inResolutionCount}</p>
            <span className="text-xs text-slate-500">Rework Rp0 / Refund S-Pay</span>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 block">
              Selesai
            </span>
            <p className="text-3xl font-black text-emerald-600 mt-1">{completedCount}</p>
            <span className="text-xs text-slate-500">Penanganan tuntas</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: `Semua (${serviceClaims.length})` },
              {
                id: "SUBMITTED",
                label: `Diajukan (${serviceClaims.filter((c) => c.mainStatus === "SUBMITTED").length})`,
              },
              {
                id: "UNDER_REVIEW",
                label: `Ditinjau (${serviceClaims.filter((c) => c.mainStatus === "UNDER_REVIEW").length})`,
              },
              {
                id: "IN_RESOLUTION",
                label: `Dalam Penyelesaian (${inResolutionCount})`,
              },
              {
                id: "COMPLETED",
                label: `Selesai (${completedCount})`,
              },
              {
                id: "REJECTED",
                label: `Ditolak (${serviceClaims.filter((c) => c.mainStatus === "REJECTED").length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor klaim, order ID, layanan..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Case Cards List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">
              Memuat daftar pengajuan garansi layanan dari database...
            </p>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3 border border-purple-100">
              <ShieldCheck size={24} weight="duotone" />
            </div>
            <h3 className="text-base font-black text-slate-900">
              Belum Ada Pengajuan Klaim Garansi Jasa
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Saat pelanggan mengajukan klaim garansi atas layanan jasa yang telah selesai, pengajuan akan tampil secara otomatis di halaman ini.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClaims.map((claim) => {
              const statusBadge = getMainStatusDisplay(claim.mainStatus);
              return (
                <div
                  key={claim.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition space-y-4"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3.5 border-b border-slate-100">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-extrabold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                          #{claim.caseNumber}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-600">
                          <Receipt size={13} />
                          Order #{claim.sourceOrderNumber}
                        </span>
                        {claim.isNoResponse && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                            <WarningCircle size={12} weight="fill" />
                            TIDAK DITANGGAPI (&gt;72 JAM)
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-slate-900 mt-1.5">
                        {claim.itemTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                        <span>
                          Pelanggan: <strong className="text-slate-800">{claim.customerName}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarBlank size={13} />
                          Diajukan: <strong className="text-slate-700">{new Date(claim.submittedAt).toLocaleDateString("id-ID")}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={13} />
                          Batas SLA:{" "}
                          <strong className="text-rose-600">
                            {new Date(claim.slaDeadlineAt).toLocaleString("id-ID")}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.color}`}
                      >
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Issue Description & Requested Solution */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="md:col-span-2 p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        Alasan &amp; Keluhan Pelanggan
                      </span>
                      <p className="font-bold text-slate-900">{claim.issueReason}</p>
                      <p className="text-slate-600 leading-relaxed">{claim.issueDescription}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                          Solusi Diminta Customer
                        </span>
                        <span className="font-extrabold text-purple-700">
                          {claim.customerRequestedSolution === "REFUND"
                            ? "Pengembalian Dana (REFUND)"
                            : "Pengerjaan Ulang Garansi Rp0 (REWORK)"}
                        </span>
                      </div>
                      {claim.chosenSolution && (
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Solusi Disepakati
                          </span>
                          <span className="font-extrabold text-emerald-700">
                            {claim.chosenSolution}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                          Lampiran Bukti
                        </span>
                        <span className="font-semibold text-slate-700">
                          {claim.evidenceMedia?.length || 0} berkas bukti
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingDetailCase(claim)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      <Eye size={14} weight="bold" />
                      Lihat Detail Kasus
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      {(claim.mainStatus === "SUBMITTED" ||
                        claim.mainStatus === "UNDER_REVIEW") && (
                        <>
                          <button
                            type="button"
                            onClick={() => setApprovingClaim(claim)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                          >
                            Setujui Klaim (Rp0)
                          </button>
                          <button
                            type="button"
                            onClick={() => setAltClaim(claim)}
                            className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer"
                          >
                            Tawarkan Alternatif
                          </button>
                          <button
                            type="button"
                            onClick={() => setReqEvidenceClaim(claim)}
                            className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition cursor-pointer"
                          >
                            Minta Bukti
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingClaim(claim)}
                            className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer"
                          >
                            Tolak Klaim
                          </button>
                        </>
                      )}

                      {claim.mainStatus === "IN_RESOLUTION" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartResolution(claim)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition cursor-pointer"
                          >
                            <Play size={13} weight="fill" />
                            Eksekusi Penyelesaian
                          </button>
                          <button
                            type="button"
                            onClick={() => setCompletingClaim(claim)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                          >
                            <CheckCircle size={14} weight="bold" />
                            Tandai Selesai
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Setujui Pekerjaan Garansi (ACCEPT_INITIAL) */}
      <AnimatePresence>
        {approvingClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Wrench size={18} className="text-purple-700" weight="bold" />
                <span>Setujui Klaim Garansi Jasa: #{approvingClaim.caseNumber}</span>
              </h3>
              <form onSubmit={handleApproveSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Teknisi Penanggung Jawab:
                  </label>
                  <input
                    type="text"
                    required
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Jadwal Kunjungan Garansi:
                  </label>
                  <input
                    type="text"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Instruksi &amp; Catatan Pengerjaan:
                  </label>
                  <textarea
                    rows={3}
                    value={jobNote}
                    onChange={(e) => setJobNote(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
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
                    className="px-5 py-2 font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-xs"
                  >
                    Konfirmasi Setujui (Rp0)
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Tawarkan Solusi Alternatif */}
      <AnimatePresence>
        {altClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900">
                Tawarkan Solusi Alternatif: #{altClaim.caseNumber}
              </h3>
              <form onSubmit={handleAltSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Solusi Alternatif:</label>
                  <select
                    value={altSolution}
                    onChange={(e) => setAltSolution(e.target.value as AfterSalesSolutionType)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="REFUND">Pengembalian Dana Layanan (REFUND)</option>
                    <option value="REWORK">Pengerjaan Ulang Garansi (REWORK)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Penjelasan &amp; Alasan Tawaran (Wajib):
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={altReason}
                    onChange={(e) => setAltReason(e.target.value)}
                    placeholder="Jelaskan alasan pengajuan solusi alternatif kepada pelanggan..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAltClaim(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold bg-indigo-600 text-white rounded-xl shadow-xs"
                  >
                    Kirim Tawaran Alternatif
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Minta Bukti Tambahan */}
      <AnimatePresence>
        {reqEvidenceClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FilePlus size={18} className="text-amber-600" weight="bold" />
                <span>Minta Bukti Tambahan: #{reqEvidenceClaim.caseNumber}</span>
              </h3>
              <form onSubmit={handleRequestEvidenceSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Rincian Bukti yang Diminta (Wajib):
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reqEvidenceReason}
                    onChange={(e) => setReqEvidenceReason(e.target.value)}
                    placeholder="Contoh: Mohon unggah foto kondisi unit dan titik kendala..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReqEvidenceClaim(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold bg-amber-600 text-white rounded-xl shadow-xs"
                  >
                    Kirim Permintaan Bukti
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Selesaikan Klaim */}
      <AnimatePresence>
        {completingClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900">
                Selesaikan Klaim Garansi Jasa: #{completingClaim.caseNumber}
              </h3>
              <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Referensi Bukti Penyelesaian (`evidence_ref`):
                  </label>
                  <input
                    type="text"
                    required
                    value={completionEvidenceRef}
                    onChange={(e) => setCompletionEvidenceRef(e.target.value)}
                    placeholder="Contoh: BAST-REWORK-05B-9921"
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCompletingClaim(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold bg-emerald-600 text-white rounded-xl shadow-xs"
                  >
                    Konfirmasi Selesai
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900">
                Tolak Klaim Garansi Jasa: #{rejectingClaim.caseNumber}
              </h3>
              <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Alasan Penolakan (Wajib):
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Jelaskan alasan objektif penolakan klaim..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
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
                    className="px-5 py-2 font-bold bg-rose-600 text-white rounded-xl shadow-xs"
                  >
                    Kirim Penolakan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Detail Kasus Lengkap Provider (P05) */}
      <AnimatePresence>
        {viewingDetailCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 my-8"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                    Klaim Garansi Layanan Jasa
                  </span>
                  <h3 className="font-bold text-base text-slate-900 mt-1">
                    Detail Kasus #{viewingDetailCase.caseNumber}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingDetailCase(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">
                    Status Saat Ini
                  </span>
                  <span className="font-bold text-slate-800">{viewingDetailCase.mainStatus}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">
                    Tenggat SLA Tanggapan
                  </span>
                  <span className="font-bold text-rose-600 font-mono">
                    {new Date(viewingDetailCase.slaDeadlineAt).toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">
                    Solusi Diajukan Customer
                  </span>
                  <span className="font-bold text-purple-700">
                    {viewingDetailCase.customerRequestedSolution || "REWORK"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">
                    Informasi Pekerjaan Asal
                  </span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    Order ID: {viewingDetailCase.sourceOrderNumber}
                  </p>
                  <p className="text-slate-600">Layanan: {viewingDetailCase.itemTitle}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">
                    Informasi Pelanggan
                  </span>
                  <p className="font-bold text-slate-800 mt-0.5">{viewingDetailCase.customerName}</p>
                  <p className="text-slate-600">
                    Diajukan: {new Date(viewingDetailCase.submittedAt).toLocaleString("id-ID")}
                  </p>
                  {viewingDetailCase.rejectionReason && (
                    <p className="text-rose-600 font-medium mt-1">
                      Alasan Penolakan: {viewingDetailCase.rejectionReason}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/60 text-xs space-y-1">
                <span className="text-amber-800 font-bold uppercase tracking-wider text-[10px] block">
                  Kendala / Keluhan Pelanggan:
                </span>
                <p className="font-bold text-slate-900">{viewingDetailCase.issueReason}</p>
                <p className="text-slate-700 leading-relaxed">{viewingDetailCase.issueDescription}</p>
              </div>

              <div>
                <span className="text-slate-700 font-bold text-xs flex items-center gap-1.5 mb-2">
                  <Camera size={14} weight="bold" />
                  <span>
                    Foto &amp; Bukti Kendala Layanan ({viewingDetailCase.evidenceMedia?.length || 0} file)
                  </span>
                </span>
                {!viewingDetailCase.evidenceMedia || viewingDetailCase.evidenceMedia.length === 0 ? (
                  <div className="p-4 bg-white rounded-xl text-center text-xs text-slate-400 border border-slate-200">
                    Tidak ada lampiran foto kendala dari pelanggan.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {viewingDetailCase.evidenceMedia.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative aspect-video bg-white rounded-xl overflow-hidden border border-slate-200 block"
                      >
                        <img
                          src={url}
                          alt={`Bukti ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {viewingDetailCase.timeline && viewingDetailCase.timeline.length > 0 && (
                <div className="space-y-2">
                  <span className="text-slate-700 font-bold text-xs block">
                    Riwayat Aktivitas &amp; Keputusan (Audit Trail)
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-2 p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                    {viewingDetailCase.timeline.map((evt) => (
                      <div key={evt.id} className="flex items-start gap-2 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-purple-500 mt-1 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800">{evt.title}</p>
                          <p className="text-slate-500">{evt.description}</p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(evt.timestamp).toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewingDetailCase(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
