"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  WarningCircle,
  Camera,
  CheckCircle,
  SealCheck,
  ShieldPlus,
  ShieldCheck,
  CalendarCheck,
  Clock,
  User,
  Wrench,
  Receipt,
  Check,
  X,
  XCircle,
  CreditCard,
  FileText,
  ClockCountdown,
} from "@phosphor-icons/react";
import { useWarranties } from "@/features/warranties/useWarranties";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { CustomerProductWarrantyDetail } from "@/components/features/products/CustomerProductWarrantyDetail";

export default function CustomerWarrantyDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const warrantyId = (params?.warrantyId as string) || "WAR-2026-1001";

  // AC4-01: Strict domain boundary — If WRN- product warranty, render Product Warranty Certificate!
  if (warrantyId.startsWith("WRN-")) {
    return <CustomerProductWarrantyDetail warrantyId={warrantyId} />;
  }

  const initialClaimOpen = searchParams.get("claim") === "true";

  const repo = useDomainRepository();
  const {
    warrantiesV1,
    claimsV1,
    assignmentsV1,
    diagnosesV1,
    paidWorkProposalsV1,
    completionProofsV1,
    submitWarrantyClaim,
    customerRespondPaidWorkProposal,
    isWarrantyActive,
  } = useWarranties();

  const customerId = "cust-01"; // Canonical default customer

  const warranty = warrantiesV1.find((w) => w.id === warrantyId) || {
    id: warrantyId,
    providerId: "usr-prov-001",
    providerName: "PT Servio Mandiri Teknik",
    customerId,
    customerName: "Budi Santoso",
    originalServiceOrderId: "ORD-W-1002",
    serviceTitle: "Servis Reparasi AC Split 1 PK Inverter Daikin",
    providerMasterServiceId: "pms-smt-002",
    status: "ACTIVE" as const,
    durationDaysSnapshot: 45,
    policyVersion: "v1.0",
    startedAt: "2026-09-24T00:00:00.000Z",
    expiresAt: "2026-11-08T00:00:00.000Z",
    grantedAt: "2026-09-24T00:00:00.000Z",
    grantedBy: "usr-prov-001",
    claimCount: 1,
    originalWorkerName: "Andi Pratama",
  };

  const isActive = isWarrantyActive(warranty.id);
  const isPending = warranty.status === "PENDING_ACTIVATION";
  const isExpired = warranty.status === "EXPIRED" || (!isActive && !isPending);

  // Claims for this warranty
  const existingClaims = claimsV1.filter((c) => c.warrantyId === warrantyId);

  // Active in-progress claim (if any)
  const activeClaim = existingClaims.find(
    (c) => c.status !== "RESOLVED" && c.status !== "REJECTED"
  );
  const hasActiveClaim = !!activeClaim;

  // Past resolved claims (history)
  const pastResolvedClaims = existingClaims.filter((c) => c.status === "RESOLVED");
  const lastResolvedClaim = pastResolvedClaims[0];

  // CTA Guard: enabled ONLY when status = ACTIVE, not expired, and no active claim
  const canSubmitClaim = isActive && !isPending && !hasActiveClaim && !isExpired;

  // Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(initialClaimOpen);
  const [claimReason, setClaimReason] = useState("AC kembali tidak dingin");
  const [claimDescription, setClaimDescription] = useState("");
  const [issueOccurredAt, setIssueOccurredAt] = useState(new Date().toISOString().split("T")[0]);
  const [claimEvidence, setClaimEvidence] = useState<string[]>([
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
  ]);
  const [claimNotes, setClaimNotes] = useState("");

  // Paid Work Proposal Context
  const paidWorkProposal = activeClaim
    ? paidWorkProposalsV1.find((p) => p.warrantyClaimId === activeClaim.id)
    : null;
  const isProposalSent = paidWorkProposal && paidWorkProposal.status === "PROPOSAL_SENT";
  const isProposalRejected = paidWorkProposal && paidWorkProposal.status === "CUSTOMER_REJECTED";
  const isProposalApproved = paidWorkProposal && paidWorkProposal.status === "CUSTOMER_APPROVED";

  // Rejection modal
  const [isRejectProposalModalOpen, setIsRejectProposalModalOpen] = useState(false);
  const [proposalRejectReason, setProposalRejectReason] = useState("");

  // Payment simulation state
  const [isPaidSimulated, setIsPaidSimulated] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dispute modal state
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [selectedDisputeClaimId, setSelectedDisputeClaimId] = useState<string | null>(null);

  const handleOpenDispute = (claimId: string) => {
    setSelectedDisputeClaimId(claimId);
    setDisputeReason("");
    setIsDisputeModalOpen(true);
  };

  const handleSubmitDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisputeClaimId || !disputeReason.trim()) {
      alert("Harap masukkan alasan atau argumen pengajuan sengketa.");
      return;
    }
    try {
      repo.customerDisputeWarrantyClaim(customerId, selectedDisputeClaimId, disputeReason.trim());
      setIsDisputeModalOpen(false);
      setToastMessage("Sengketa garansi berhasil diajukan ke Tim Mediasi Platform Servio.");
    } catch (err: any) {
      alert(err.message || "Gagal mengajukan sengketa.");
    }
  };

  // Handlers
  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimReason.trim() || !claimDescription.trim()) {
      alert("Harap lengkapi masalah dan deskripsi kendala.");
      return;
    }

    try {
      submitWarrantyClaim(customerId, warranty.id, {
        reason: claimReason.trim(),
        description: claimNotes.trim()
          ? `${claimDescription.trim()} (Catatan: ${claimNotes.trim()})`
          : claimDescription.trim(),
        issueOccurredAt,
        evidence: claimEvidence,
      });

      setIsClaimModalOpen(false);
      setClaimReason("");
      setClaimDescription("");
      setClaimNotes("");
      setToastMessage("Klaim garansi berhasil dikirimkan! Status berubah ke 'Menggunakan Garansi'.");
    } catch (err: any) {
      alert(err.message || "Gagal mengajukan klaim.");
    }
  };

  const handleApprovePaidWork = () => {
    if (!paidWorkProposal) return;
    try {
      const res = customerRespondPaidWorkProposal(customerId, paidWorkProposal.id, true);
      setToastMessage(
        `Penawaran disetujui! Order pekerjaan baru #${res.newOrder?.id || ""} telah diterbitkan.`
      );
    } catch (err: any) {
      alert(err.message || "Gagal menyetujui penawaran.");
    }
  };

  const handleRejectPaidWork = () => {
    if (!paidWorkProposal) return;
    try {
      customerRespondPaidWorkProposal(
        customerId,
        paidWorkProposal.id,
        false,
        proposalRejectReason || "Pelanggan menolak melanjutkan pekerjaan berbayar."
      );
      setIsRejectProposalModalOpen(false);
      setProposalRejectReason("");
      setToastMessage("Pekerjaan berbayar ditolak. Pekerjaan tidak dilanjutkan dan penanganan selesai.");
    } catch (err: any) {
      alert(err.message || "Gagal menolak penawaran.");
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "-";
    try {
      return new Date(isoString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return "-";
    try {
      return new Date(isoString).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB";
    } catch {
      return isoString;
    }
  };

  const remainingDays = warranty.expiresAt
    ? Math.max(0, Math.ceil((new Date(warranty.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : warranty.durationDaysSnapshot;

  // Active claim context data
  const assign = activeClaim
    ? assignmentsV1.find((a) => a.warrantyClaimId === activeClaim.id)
    : null;
  const dx = activeClaim
    ? diagnosesV1.find((d) => d.warrantyClaimId === activeClaim.id)
    : null;

  // Branch detection
  const isBranchCovered =
    activeClaim?.coverageDecision === "COVERED" ||
    activeClaim?.status === "REPAIR_APPROVED" ||
    activeClaim?.status === "REPAIR_SCHEDULED" ||
    activeClaim?.status === "REPAIR_IN_PROGRESS";

  const isBranchPaidWork =
    activeClaim?.coverageDecision === "NOT_COVERED" || !!paidWorkProposal;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 text-left font-body">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm animate-fade-in">
          <CheckCircle size={20} weight="fill" className="text-emerald-300" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-white/70 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER                                                             */}
      {/* Header: Service, Status, Warranty ID, Action Button                       */}
      {/* ========================================================================= */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/warranties"
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
              aria-label="Kembali ke Daftar Garansi"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    hasActiveClaim
                      ? "bg-sky-50 text-sky-800 border-sky-200"
                      : isPending
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : isExpired
                      ? "bg-slate-100 text-slate-600 border-slate-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {hasActiveClaim
                    ? "MENGGUNAKAN GARANSI"
                    : isPending
                    ? "MENUNGGU AKTIVASI"
                    : isExpired
                    ? "GARANSI HABIS"
                    : "GARANSI AKTIF"}
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  #{warranty.id}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 font-display mt-0.5">
                {warranty.serviceTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canSubmitClaim && (
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm"
              >
                <ShieldPlus size={16} weight="bold" />
                <span>Ajukan Klaim Garansi</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* ========================================================================= */}
        {/* 2. RINGKASAN GARANSI (Informasi Garansi)                                 */}
        {/* Service, Provider, Garansi, Berlaku, Status, Claim                       */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <SealCheck size={18} className="text-emerald-600" weight="fill" />
              <span>INFORMASI GARANSI</span>
            </h2>
            <span
              className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                hasActiveClaim
                  ? "bg-sky-100 text-sky-800"
                  : isPending
                  ? "bg-amber-100 text-amber-800"
                  : isExpired
                  ? "bg-slate-200 text-slate-700"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {hasActiveClaim
                ? "SEDANG DIGUNAKAN"
                : isPending
                ? "MENUNGGU AKTIVASI"
                : isExpired
                ? "KADALUARSA"
                : "AKTIF"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Service / Layanan
              </span>
              <p className="font-bold text-slate-900 mt-0.5">{warranty.serviceTitle}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Mitra Provider
              </span>
              <p className="font-bold text-slate-900 mt-0.5">{warranty.providerName}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Durasi Garansi
              </span>
              <p className="font-bold text-slate-900 mt-0.5">{warranty.durationDaysSnapshot} Hari</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Masa Berlaku
              </span>
              <p className="font-bold text-slate-900 mt-0.5">
                {isPending
                  ? `Durasi ${warranty.durationDaysSnapshot} Hari (Menunggu Aktivasi Mitra)`
                  : `${formatDate(warranty.startedAt)} – ${formatDate(warranty.expiresAt)}`}
              </p>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block tracking-wider">
                Sisa Masa Garansi
              </span>
              <p className="font-extrabold text-emerald-900 text-sm mt-0.5">
                {isPending ? `${warranty.durationDaysSnapshot} Hari (Terjadwal)` : `${remainingDays} Hari`}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Status Klaim
              </span>
              <p className="font-bold text-slate-900 mt-0.5">
                {hasActiveClaim
                  ? `Klaim Aktif #${activeClaim.claimNumber}`
                  : "Belum ada claim aktif"}
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. JIKA BELUM ADA CLAIM AKTIF: RIWAYAT PENGGUNAAN GARANSI (Spec #1)       */}
        {/* Penggunaan Terakhir: Claim, Digunakan, Worker, Hasil ATAU Belum digunakan */}
        {/* ========================================================================= */}
        {!hasActiveClaim && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <ClockCountdown size={18} className="text-slate-600" weight="bold" />
                <span>RIWAYAT PENGGUNAAN GARANSI</span>
              </h2>
              {pastResolvedClaims.length > 0 && (
                <span className="text-xs text-slate-500 font-medium">
                  {pastResolvedClaims.length} Kali Penggunaan
                </span>
              )}
            </div>

            {pastResolvedClaims.length > 0 ? (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                      PENGGUNAAN TERAKHIR
                    </span>
                    <span className="font-mono font-bold text-xs text-emerald-950">
                      #{lastResolvedClaim.claimNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">
                        Digunakan Pada
                      </span>
                      <p className="font-bold text-slate-900">
                        {formatDateTime(lastResolvedClaim.submittedAt)}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">
                        Teknisi yang Menangani
                      </span>
                      <p className="font-bold text-slate-900">
                        {warranty.originalWorkerName || "Andi Pratama"}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">
                        Hasil Penanganan
                      </span>
                      <p className="font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle size={14} weight="fill" />
                        <span>Perbaikan selesai &amp; unit normal</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 italic pt-1 border-t border-emerald-100">
                    Keluhan: &quot;{lastResolvedClaim.reason}&quot;
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                  <p className="text-slate-600">
                    Garansi Anda <strong>tetap aktif</strong> hingga{" "}
                    <strong>{formatDate(warranty.expiresAt)}</strong>. Anda masih dapat mengajukan klaim jika kendala terjadi lagi.
                  </p>
                  {canSubmitClaim && (
                    <button
                      type="button"
                      onClick={() => setIsClaimModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition shrink-0"
                    >
                      Ajukan Klaim Garansi
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-2">
                <ShieldCheck size={36} className="mx-auto text-emerald-600" weight="fill" />
                <h3 className="text-sm font-bold text-slate-800 font-display">
                  Belum pernah digunakan
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Garansi Anda masih utuh dan siap digunakan. Jika sewaktu-waktu terjadi kendala pada hasil pekerjaan servis, Anda dapat langsung mengajukan klaim tanpa biaya.
                </p>
                {canSubmitClaim && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsClaimModalOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5"
                    >
                      <ShieldPlus size={16} weight="bold" />
                      <span>Ajukan Klaim Garansi</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. JIKA SEDANG MENGGUNAKAN GARANSI: RINGKASAN CLAIM AKTIF (Spec #4)       */}
        {/* Pengajuan, Masalah, Diajukan, Status Ringkas                              */}
        {/* ========================================================================= */}
        {hasActiveClaim && (
          <div className="p-6 sm:p-7 rounded-3xl bg-sky-50/70 border-2 border-sky-300 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-200/80 pb-4">
              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-600 text-white">
                  MENGGUNAKAN GARANSI
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display mt-2">
                  Klaim Perbaikan #{activeClaim.claimNumber}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Layanan: <strong className="text-slate-800">{warranty.serviceTitle}</strong>
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[11px] text-slate-500 block">Waktu Pengajuan:</span>
                <span className="font-bold text-slate-800 text-xs">
                  {formatDateTime(activeClaim.submittedAt)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-white rounded-2xl border border-sky-100">
                <span className="font-bold text-slate-800 block mb-0.5">Masalah yang Dilaporkan:</span>
                <p className="text-slate-900 font-semibold">{activeClaim.reason}</p>
                {activeClaim.description && (
                  <p className="text-slate-600 mt-1 leading-relaxed">{activeClaim.description}</p>
                )}
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-sky-100">
                <span className="font-bold text-slate-800 block mb-0.5">Status Penanganan:</span>
                <p className="font-extrabold text-[#0F4C81] text-sm">
                  {assign?.checkInAt
                    ? "Teknisi Tiba di Lokasi & Memeriksa Unit"
                    : assign?.otwAt
                    ? "Teknisi OTW Menuju Lokasi Anda"
                    : assign
                    ? "Teknisi Sudah Dijadwalkan"
                    : "Menunggu Pemeriksaan Provider"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Mitra Provider: {warranty.providerName}
                </p>
              </div>
            </div>

            {/* Bukti Foto dari Customer */}
            {activeClaim.evidence && activeClaim.evidence.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                  Foto Bukti yang Anda Lampirkan
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeClaim.evidence.map((url, i) => (
                    <div
                      key={i}
                      className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-2xs"
                    >
                      <img src={url} alt="Bukti kendala" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. TEKNISI ANDA & JADWAL (Spec #5)                                        */}
        {/* Hanya muncul setelah Provider Approve & Assign Worker/Schedule            */}
        {/* ========================================================================= */}
        {hasActiveClaim && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <User size={18} className="text-[#0F4C81]" weight="bold" />
                <span>TEKNISI ANDA &amp; JADWAL</span>
              </h2>
              {assign && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {assign.assignmentType === "REPAIR" ? "Tugas Perbaikan" : "Tugas Pemeriksaan Lapangan"}
                </span>
              )}
            </div>

            {assign ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#0F4C81] text-white flex items-center justify-center font-bold text-base shadow-xs">
                      <User size={22} weight="bold" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Teknisi Resmi Mitra
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-sm">{assign.workerName}</h3>
                      <p className="text-[11px] text-slate-500">{warranty.providerName}</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Status Kedatangan
                    </span>
                    <span
                      className={`text-xs font-bold inline-block px-2.5 py-1 rounded-xl ${
                        assign.checkInAt
                          ? "bg-emerald-100 text-emerald-900"
                          : assign.otwAt
                          ? "bg-sky-100 text-sky-900 animate-pulse"
                          : "bg-indigo-50 text-indigo-900"
                      }`}
                    >
                      {assign.checkInAt
                        ? `✓ Telah Tiba di Lokasi (${formatDateTime(assign.checkInAt)})`
                        : assign.otwAt
                        ? `● Sedang Menuju Lokasi Anda (OTW)`
                        : "TEKNISI SUDAH DIJADWALKAN"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center gap-2.5">
                    <CalendarCheck size={18} className="text-emerald-700 shrink-0" weight="bold" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Tanggal</span>
                      <strong className="text-slate-900">{assign.scheduledDate}</strong>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center gap-2.5">
                    <Clock size={18} className="text-[#0F4C81] shrink-0" weight="bold" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Waktu Kunjungan</span>
                      <strong className="text-slate-900">{assign.scheduledStartTime}</strong>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center gap-2.5">
                    <Wrench size={18} className="text-amber-600 shrink-0" weight="bold" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Lokasi</span>
                      <strong className="text-slate-900 truncate block max-w-[150px]">
                        {assign.location || "Alamat Pelanggan"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
                <WarningCircle size={20} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-amber-950">Menunggu Penugasan Teknisi &amp; Jadwal</strong>
                  <p className="text-slate-700 mt-0.5 leading-relaxed">
                    Mitra Provider sedang meninjau detail keluhan Anda. Nama teknisi yang bertugas dan tanggal kunjungan pemeriksaan akan otomatis tampil di sini segera setelah dikonfirmasi oleh Mitra.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. TIMELINE CUSTOMER FINAL (Spec #6)                                      */}
        {/* Customer-Safe: Pengajuan, Disetujui, Teknisi Ditugaskan, Jadwal, OTW,    */}
        {/* Sampai, Pemeriksaan, Hasil, Tindak Lanjut, Perbaikan, Selesai             */}
        {/* ========================================================================= */}
        {hasActiveClaim && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  TIMELINE PENANGANAN KLAIM
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pantau perkembangan penanganan klaim secara transparan dan aman
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Disinkronkan
              </span>
            </div>

            {/* Stepper Grid (Human-readable, Spec #6) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {[
                {
                  label: "1. Pengajuan Dikirim",
                  desc: "Klaim berhasil tercatat",
                  done: true,
                },
                {
                  label: "2. Pengajuan Disetujui",
                  desc: "Mitra menerima klaim",
                  done: activeClaim.status !== "SUBMITTED",
                },
                {
                  label: "3. Teknisi Ditugaskan",
                  desc: assign?.workerName || "Menunggu penugasan",
                  done: !!assign,
                },
                {
                  label: "4. Jadwal Pemeriksaan",
                  desc: assign ? `${assign.scheduledDate}` : "Menunggu jadwal",
                  done: !!assign?.scheduledDate,
                },
                {
                  label: "5. Teknisi OTW",
                  desc: assign?.otwAt ? "Menuju lokasi Anda" : "Sesuai jadwal",
                  done: !!assign?.otwAt || !!assign?.checkInAt || !!dx,
                },
                {
                  label: "6. Teknisi Sampai",
                  desc: assign?.checkInAt ? "Tiba di lokasi" : "Check-in unit",
                  done: !!assign?.checkInAt || !!dx,
                },
                {
                  label: "7. Pemeriksaan Unit",
                  desc: assign?.checkInAt || dx ? "Inspeksi kendala" : "Pemeriksaan fisik",
                  done: !!assign?.checkInAt || !!dx,
                },
                {
                  label: "8. Hasil Pemeriksaan",
                  desc: dx ? "Diagnosis selesai" : "Menunggu hasil",
                  done: !!dx,
                },
                {
                  label: "9. Tindak Lanjut",
                  desc: isBranchCovered
                    ? "Garansi Disetujui"
                    : isBranchPaidWork
                    ? "Pekerjaan Berbayar"
                    : "Menunggu Provider",
                  done: isBranchCovered || isBranchPaidWork,
                },
                {
                  label: "10. Perbaikan / Pengerjaan",
                  desc:
                    activeClaim.status === "REPAIR_IN_PROGRESS" ||
                    activeClaim.status === "RESOLVED"
                      ? "Pengerjaan unit"
                      : "Jadwal pengerjaan",
                  done:
                    activeClaim.status === "REPAIR_IN_PROGRESS" ||
                    activeClaim.status === "RESOLVED",
                },
                {
                  label: "11. Selesai",
                  desc: activeClaim.status === "RESOLVED" ? "Garansi tuntas" : "Verifikasi akhir",
                  done: activeClaim.status === "RESOLVED",
                },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border flex flex-col justify-between space-y-1.5 transition ${
                    step.done
                      ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                      : "bg-slate-50/60 border-slate-200 text-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        step.done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {step.done ? "✓" : idx + 1}
                    </span>
                    {step.done && (
                      <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        OK
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold leading-tight block">{step.label}</span>
                    <p className="text-[10px] opacity-80 mt-0.5 leading-snug line-clamp-1">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. HASIL PEMERIKSAAN (SAAT WORKER DIAGNOSIS - Spec #7)                    */}
        {/* Kondisi, Tindakan, Bukti Foto Aman (NO raw technical notes/telemetry!)   */}
        {/* ========================================================================= */}
        {hasActiveClaim && dx && (
          <div className="bg-white rounded-3xl border border-purple-200 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                <FileText size={18} className="text-purple-700" weight="bold" />
                <span>HASIL PEMERIKSAAN TEKNISI</span>
              </h2>
              <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                Pemeriksaan Lapangan Selesai
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Kondisi Unit
                </span>
                <p className="text-slate-800 font-semibold leading-relaxed">
                  {dx.condition || dx.findings || "Ditemukan kerusakan pada komponen AC."}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Tindakan yang Diperlukan
                </span>
                <p className="text-slate-800 font-semibold leading-relaxed">
                  {dx.recommendedAction || "Penggantian komponen dan kalibrasi unit."}
                </p>
              </div>
            </div>

            {/* Bukti Pemeriksaan yang Aman Dilihat Pelanggan */}
            {dx.evidence && dx.evidence.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Bukti Pemeriksaan Fisik
                </span>
                <div className="flex flex-wrap gap-2">
                  {dx.evidence.map((url, i) => (
                    <div
                      key={i}
                      className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-2xs"
                    >
                      <img src={url} alt="Foto kondisi unit" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-100 text-xs text-purple-900 flex items-center justify-between">
              <span>Status Penanganan:</span>
              <strong className="text-purple-950">
                {isBranchCovered
                  ? "Termasuk dalam Cakupan Garansi"
                  : isBranchPaidWork
                  ? "Pekerjaan di Luar Garansi"
                  : "Menunggu Tindak Lanjut Provider"}
              </strong>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. CABANG A — GARANSI DISETUJUI (Spec #8)                                 */}
        {/* Perbaikan termasuk garansi, tanpa biaya tambahan, jadwal repair           */}
        {/* ========================================================================= */}
        {hasActiveClaim && isBranchCovered && (
          <div className="p-6 sm:p-7 rounded-3xl bg-emerald-50/80 border-2 border-emerald-400 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={22} weight="fill" className="text-emerald-700" />
                <h3 className="text-sm sm:text-base font-extrabold text-emerald-950 font-display">
                  TINDAK LANJUT — PERBAIKAN GARANSI
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                GRATIS &bull; TERMASUK GARANSI
              </span>
            </div>

            <div className="p-4 bg-white/90 rounded-2xl border border-emerald-200 text-xs text-slate-800 space-y-2">
              <p className="font-bold text-emerald-950 text-sm">
                Perbaikan Anda termasuk dalam garansi resmi.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Teknisi akan melakukan perbaikan tanpa biaya tambahan apapun. Masa garansi Anda tetap aktif hingga tanggal kedaluwarsa resmi.
              </p>
            </div>

            {/* Jadwal Perbaikan Garansi */}
            <div className="p-4 bg-white rounded-2xl border border-emerald-200 text-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Jadwal &amp; Teknisi Perbaikan
              </span>
              <div className="flex flex-wrap items-center justify-between gap-3 text-slate-800">
                <div className="flex items-center gap-2">
                  <CalendarCheck size={16} className="text-emerald-700" weight="bold" />
                  <span>
                    Jadwal: <strong>{assign?.scheduledDate || "27 Sep 2026"}</strong> (
                    <strong>{assign?.scheduledStartTime || "14:00 WIB"}</strong>)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-[#0F4C81]" weight="bold" />
                  <span>
                    Teknisi: <strong>{assign?.workerName || "Andi Pratama"}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-100/70 rounded-xl text-xs text-emerald-950 font-semibold flex items-center gap-2">
              <Check size={16} weight="bold" className="text-emerald-700" />
              <span>
                Status:{" "}
                {activeClaim.status === "RESOLVED"
                  ? "Perbaikan Selesai (Klaim Tuntas)"
                  : activeClaim.status === "REPAIR_IN_PROGRESS"
                  ? "Perbaikan Berlangsung di Lokasi"
                  : "Menunggu Jadwal Perbaikan"}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 9. CABANG B — PEKERJAAN BERBAYAR (Spec #9, #10, #11)                      */}
        {/* Card Proposal: Jasa, Material, TOTAL, [Tolak], [Setujui & Lanjutkan]      */}
        {/* ========================================================================= */}
        {hasActiveClaim && isBranchPaidWork && paidWorkProposal && (
          <div className="space-y-4">
            {isProposalSent && (
              <div className="p-6 sm:p-7 rounded-3xl bg-amber-50/90 border-2 border-amber-400 shadow-md space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-4">
                  <div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white">
                      PEKERJAAN DI LUAR GARANSI
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display mt-2">
                      {paidWorkProposal.title}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Layanan: <strong className="text-slate-800">{warranty.serviceTitle}</strong>
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-500">Total Biaya Tambahan:</span>
                    <p className="text-2xl font-black text-emerald-800 font-display">
                      Rp {paidWorkProposal.totalAmount.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-white rounded-2xl border border-amber-200/70">
                    <span className="font-bold text-slate-900 block mb-1">Hasil Pemeriksaan:</span>
                    <p className="text-slate-700 leading-relaxed">
                      Kerusakan berada di luar cakupan garansi.
                    </p>
                    <p className="text-slate-500 mt-1 italic">
                      Alasan: &quot;{paidWorkProposal.reasonOutsideWarranty}&quot;
                    </p>
                  </div>

                  <div className="p-3.5 bg-white rounded-2xl border border-amber-200/70">
                    <span className="font-bold text-slate-900 block mb-1">Ruang Lingkup Pengerjaan:</span>
                    <p className="text-slate-700 leading-relaxed">{paidWorkProposal.scope}</p>
                  </div>
                </div>

                {/* Line Items Breakdown (Jasa, Material, Total) */}
                <div className="p-4 bg-white/95 rounded-2xl border border-amber-200 text-xs space-y-2">
                  <span className="font-bold text-slate-900 block">Rincian Komponen Biaya:</span>
                  {paidWorkProposal.lineItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">
                        {item.description} ({item.quantity}x)
                      </span>
                      <strong className="text-slate-900">
                        Rp {item.total.toLocaleString("id-ID")}
                      </strong>
                    </div>
                  ))}
                  <div className="flex justify-between text-slate-600 pt-1">
                    <span>Biaya Layanan Aplikasi:</span>
                    <span>Rp {paidWorkProposal.fees.toLocaleString("id-ID")}</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-100/70 rounded-xl text-xs text-amber-950 font-medium">
                  Status: <strong>Menunggu persetujuan Anda</strong> &bull; Teknisi hanya akan melakukan perbaikan berbayar setelah Anda mengonfirmasi persetujuan.
                </div>

                {/* Actions: [Tolak] and [Setujui & Lanjutkan] */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-amber-200">
                  <button
                    type="button"
                    onClick={() => setIsRejectProposalModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl border border-rose-300 bg-white text-rose-700 text-xs font-bold hover:bg-rose-50 transition"
                  >
                    Tolak
                  </button>
                  <button
                    type="button"
                    onClick={handleApprovePaidWork}
                    className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                  >
                    <Check size={16} weight="bold" />
                    <span>Setujui &amp; Lanjutkan</span>
                  </button>
                </div>
              </div>
            )}

            {/* Jika Customer Menolak (Spec #10) */}
            {isProposalRejected && (
              <div className="p-6 rounded-3xl bg-slate-100 border-2 border-slate-300 space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <XCircle size={22} weight="fill" className="text-rose-600" />
                  <h3 className="text-sm font-extrabold text-slate-900 font-display">
                    Pekerjaan Berbayar Ditolak
                  </h3>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 text-slate-700 space-y-1">
                  <p className="font-semibold text-rose-700">Pekerjaan tidak akan dilanjutkan.</p>
                  <p className="text-slate-600 leading-relaxed">
                    Garansi tidak berubah menjadi aktif kembali atau diperpanjang. Original Order tetap tersimpan secara aman.
                  </p>
                  <p className="text-[11px] text-slate-400 pt-1">
                    Alasan: &quot;{paidWorkProposal.responseReason || "Pelanggan menolak penawaran tambahan."}&quot;
                  </p>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span>Timeline: Di luar garansi &bull; Proposal ditolak &bull; Penanganan selesai</span>
                </div>
              </div>
            )}

            {/* Jika Customer Menyetujui (Spec #11) */}
            {isProposalApproved && (
              <div className="p-6 sm:p-7 rounded-3xl bg-emerald-50/90 border-2 border-emerald-400 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={22} weight="fill" className="text-emerald-700" />
                    <h3 className="text-sm sm:text-base font-extrabold text-emerald-950 font-display">
                      PEMBAYARAN PEKERJAAN BERBAYAR
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white">
                    PROPOSAL DISETUJUI
                  </span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-emerald-200 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Pekerjaan:</span>
                    <strong className="text-slate-900">{paidWorkProposal.title}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Order Baru Diterbitkan:</span>
                    <strong className="font-mono text-emerald-800">
                      #{paidWorkProposal.linkedPaidOrderId || "ORD-PW-2001"}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-800 text-xs">Total Pembayaran:</span>
                    <p className="text-xl font-black text-emerald-900 font-display">
                      Rp {paidWorkProposal.totalAmount.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                {/* Simulasi Pembayaran */}
                {!isPaidSimulated ? (
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-emerald-200">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Menunggu Pembayaran Pelanggan</p>
                      <p className="text-[11px] text-slate-500">
                        Klik bayar untuk memvalidasi pembayaran dan memulai pengerjaan teknisi.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPaidSimulated(true);
                        setToastMessage("Pembayaran berhasil! Teknisi siap melaksanakan pengerjaan.");
                      }}
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0"
                    >
                      <CreditCard size={16} weight="bold" />
                      <span>Bayar Sekarang (Simulasi)</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-100/90 rounded-2xl border border-emerald-300 text-xs text-emerald-950 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                      <CheckCircle size={16} weight="fill" />
                      <span>✓ Pembayaran berhasil</span>
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      ✓ Pekerjaan dapat dimulai oleh teknisi ({assign?.workerName || "Andi Pratama"}).
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 10. REJECTED / DISPUTED CLAIMS CARD (Jika Provider menolak klaim)         */}
        {/* ========================================================================= */}
        {existingClaims
          .filter((c) => c.status === "REJECTED" || c.status === "DISPUTED")
          .map((rejClaim) => (
            <div
              key={rejClaim.id}
              className={`p-6 rounded-3xl border-2 space-y-4 shadow-sm ${
                rejClaim.status === "DISPUTED"
                  ? "bg-purple-50/70 border-purple-300"
                  : "bg-rose-50/70 border-rose-300"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      rejClaim.status === "DISPUTED"
                        ? "bg-purple-600 text-white"
                        : "bg-rose-600 text-white"
                    }`}
                  >
                    <WarningCircle size={22} weight="bold" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700">
                        #{rejClaim.claimNumber}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          rejClaim.status === "DISPUTED"
                            ? "bg-purple-200 text-purple-900"
                            : "bg-rose-200 text-rose-900"
                        }`}
                      >
                        {rejClaim.status === "DISPUTED"
                          ? "Sengketa Mediasi Aktif"
                          : "Klaim Ditolak Provider"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      {rejClaim.reason}
                    </h3>
                  </div>
                </div>

                {rejClaim.status === "REJECTED" && (
                  <button
                    type="button"
                    onClick={() => handleOpenDispute(rejClaim.id)}
                    className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <span>Ajukan Sengketa / Dispute</span>
                  </button>
                )}
              </div>

              <div className="p-3.5 bg-white/90 rounded-2xl border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-rose-700 block">
                  Alasan Penolakan dari Provider:
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {rejClaim.rejectionReason || "Klaim di luar kriteria penjaminan garansi servis."}
                </p>
                {rejClaim.reviewedAt && (
                  <span className="text-[10px] text-slate-400 block pt-1 font-mono">
                    Ditinjau pada: {formatDateTime(rejClaim.reviewedAt)}
                  </span>
                )}
              </div>

              {rejClaim.status === "DISPUTED" && (
                <div className="p-3 bg-purple-100/80 rounded-xl text-xs text-purple-900 flex items-center gap-2">
                  <Clock size={16} weight="bold" className="shrink-0 text-purple-700" />
                  <span>
                    Sengketa resmi tercatat. Tim mediasi operasional platform Servio sedang meninjau kasus ini secara independen.
                  </span>
                </div>
              )}
            </div>
          ))}
      </div>

      {/* ========================================================================= */}
      {/* CLAIM SUBMISSION MODAL (Spec #3)                                          */}
      {/* Layanan, Masalah, Ceritakan masalah, Kapan mulai, Foto, Catatan, [Kirim]  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isClaimModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Ajukan Garansi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Klaim perbaikan resmi &bull; Garansi #{warranty.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleClaimSubmit} className="space-y-4 text-xs">
                {/* Layanan */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Layanan
                  </label>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-semibold">
                    {warranty.serviceTitle}
                    <span className="text-[11px] text-slate-500 block font-normal mt-0.5">
                      Mitra: {warranty.providerName}
                    </span>
                  </div>
                </div>

                {/* Masalah (Dropdown / Preset Selector) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Masalah
                  </label>
                  <select
                    value={claimReason}
                    onChange={(e) => setClaimReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-[#0F4C81] text-xs font-semibold text-slate-800"
                    required
                  >
                    <option value="AC kembali tidak dingin">AC kembali tidak dingin</option>
                    <option value="Pipa bocor / air rembes">Pipa bocor / air menetes</option>
                    <option value="Unit indoor/outdoor bergetar keras">Unit indoor/outdoor bergetar keras</option>
                    <option value="MCB listrik kembali trip / padam">MCB listrik kembali trip / padam</option>
                    <option value="Hasil servis tidak bertahan lama">Hasil servis tidak bertahan lama</option>
                    <option value="Kendala teknis lainnya">Kendala teknis lainnya</option>
                  </select>
                </div>

                {/* Ceritakan Masalah */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ceritakan masalah
                  </label>
                  <textarea
                    rows={3}
                    value={claimDescription}
                    onChange={(e) => setClaimDescription(e.target.value)}
                    placeholder="Jelaskan secara singkat kendala yang dialami pasca servis..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F4C81] text-xs"
                    required
                  />
                </div>

                {/* Kapan Masalah Mulai Terjadi */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kapan masalah mulai terjadi?
                  </label>
                  <input
                    type="date"
                    value={issueOccurredAt}
                    onChange={(e) => setIssueOccurredAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium"
                    required
                  />
                </div>

                {/* Upload Foto / Video */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Upload Foto / Video Bukti
                  </label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {claimEvidence.map((url, i) => (
                        <div
                          key={i}
                          className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-2xs group"
                        >
                          <img src={url} alt="Bukti" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setClaimEvidence((prev) => [
                            ...prev,
                            "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
                          ])
                        }
                        className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-1 transition"
                      >
                        <Camera size={18} />
                        <span className="text-[9px] font-bold">+ Bukti</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Catatan Tambahan */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Catatan tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={claimNotes}
                    onChange={(e) => setClaimNotes(e.target.value)}
                    placeholder="Contoh: Rumah hanya bisa dikunjungi di akhir pekan"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F4C81] text-xs"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsClaimModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Batalkan
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle size={16} weight="bold" />
                    <span>Kirim Pengajuan</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REJECT PROPOSAL MODAL */}
      <AnimatePresence>
        {isRejectProposalModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Tolak Penawaran Pekerjaan Berbayar
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menolak perbaikan tambahan berbayar ini? Teknisi tidak akan melanjutkan pengerjaan tersebut dan order garansi awal tetap tersimpan tanpa perubahan.
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alasan Penolakan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={proposalRejectReason}
                  onChange={(e) => setProposalRejectReason(e.target.value)}
                  placeholder="Contoh: Biaya melebihi perkiraan anggaran saya saat ini."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRejectProposalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleRejectPaidWork}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition"
                >
                  Konfirmasi Tolak
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* DISPUTE SUBMISSION MODAL */}
      <AnimatePresence>
        {isDisputeModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <WarningCircle size={20} weight="bold" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Ajukan Sengketa Penolakan Klaim
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Mediasi Platform Servio &bull; Investigasi Independen
                  </p>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Jika Anda merasa penolakan klaim oleh Provider tidak sesuai dengan riwayat pengerjaan atau cakupan garansi, silakan ajukan sengketa. Tim mediasi platform Servio akan memeriksa bukti pengerjaan teknisi secara netral.
              </p>

              <form onSubmit={handleSubmitDispute} className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Alasan &amp; Argumen Sengketa <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Jelaskan mengapa Anda menolak keputusan provider, kondisi unit saat ini, atau bukti tambahan..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsDisputeModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-700 text-white font-bold hover:bg-purple-800 transition"
                  >
                    Kirim ke Mediasi Servio
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
