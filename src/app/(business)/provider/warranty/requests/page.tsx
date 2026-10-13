"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CalendarCheck,
  Clock,
  Warning,
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  ArrowRight,
  User,
  Wrench,
  Camera,
  FileText,
  MapPin,
  Sparkle,
  Money,
  ArrowsClockwise,
  Eye,
  Check,
  X,
  ClipboardText,
} from "@phosphor-icons/react";
import { useWarranties } from "@/features/warranties/useWarranties";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { PageHeader } from "@/components/layout/PageHeader";
import { motion } from "framer-motion";
import {
  WarrantyV1,
  WarrantyClaimV1,
  WarrantyAssignmentV1,
  WarrantyDiagnosisV1,
  WarrantyPaidWorkProposalV1,
  WarrantyCompletionProofV1,
} from "@/types/domain";

export default function ProviderWarrantyRequestsPage() {
  const repo = useDomainRepository();
  const {
    warrantiesV1,
    claimsV1,
    assignmentsV1,
    diagnosesV1,
    paidWorkRequestsV1,
    paidWorkProposalsV1,
    completionProofsV1,
    getWarrantiesByProvider,
    getWarrantyClaimsByProvider,
    reviewWarrantyClaim,
    assignWarrantyWorker,
    rescheduleWarrantyAssignment,
    providerDecideCoverage,
    providerRequestMoreInfo,
    providerCreatePaidWorkProposal,
    providerReviewCompletionProof,
  } = useWarranties();

  const providerId = "prov-01"; // Canonical default provider
  const isMatchProvider = (pid: string) =>
    pid === providerId ||
    ((providerId === "prov-01" || providerId === "usr-prov-001") &&
      (pid === "prov-01" || pid === "usr-prov-001" || pid === "org-prov-101"));

  // 10 Locked UI Groupings (Prompt Section 5 & 6):
  // [Semua] [Pengajuan] [Sudah Dijadwal] [Hari Ini] [OTW] [Diagnosis] [Hasil] [Menunggu Customer] [Pengerjaan] [Selesai]
  type ProviderTabGroup =
    | "ALL"
    | "SUBMITTED"
    | "SCHEDULED"
    | "TODAY"
    | "OTW"
    | "DIAGNOSIS"
    | "HASIL"
    | "WAITING_CUSTOMER"
    | "PENGERJAAN"
    | "COMPLETED";

  const PROVIDER_TABS: { id: ProviderTabGroup; label: string; badgeColor: string }[] = [
    { id: "ALL", label: "Semua", badgeColor: "bg-slate-200 text-slate-700" },
    { id: "SUBMITTED", label: "Pengajuan", badgeColor: "bg-rose-500 text-white" },
    { id: "SCHEDULED", label: "Sudah Dijadwal", badgeColor: "bg-blue-500 text-white" },
    { id: "TODAY", label: "Hari Ini", badgeColor: "bg-indigo-500 text-white" },
    { id: "OTW", label: "OTW", badgeColor: "bg-amber-500 text-white" },
    { id: "DIAGNOSIS", label: "Diagnosis", badgeColor: "bg-purple-500 text-white" },
    { id: "HASIL", label: "Hasil", badgeColor: "bg-amber-600 text-white" },
    { id: "WAITING_CUSTOMER", label: "Menunggu Customer", badgeColor: "bg-orange-500 text-white" },
    { id: "PENGERJAAN", label: "Pengerjaan", badgeColor: "bg-emerald-600 text-white" },
    { id: "COMPLETED", label: "Selesai", badgeColor: "bg-slate-500 text-white" },
  ];

  const [activeFilter, setActiveFilter] = useState<ProviderTabGroup>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedClaimForDetail, setSelectedClaimForDetail] = useState<WarrantyClaimV1 | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Initial Review / Reject Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Assign Worker Modal (Inspection or Repair)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [assignmentType, setAssignmentType] = useState<"INSPECTION" | "REPAIR">("INSPECTION");
  const [scheduledDate, setScheduledDate] = useState("2026-09-26");
  const [scheduledTime, setScheduledTime] = useState("10:00 WIB");
  const [estimatedDuration, setEstimatedDuration] = useState(60);
  const [assignmentLocation, setAssignmentLocation] = useState("Jl. Tebet Barat Dalam No. 42, Jakarta Selatan");
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);

  // Reschedule Modal
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleAssignmentId, setRescheduleAssignmentId] = useState("");
  const [newRescheduleDate, setNewRescheduleDate] = useState("2026-09-27");
  const [newRescheduleTime, setNewRescheduleTime] = useState("14:00 WIB");

  // Paid Work Proposal Modal
  const [isPaidProposalModalOpen, setIsPaidProposalModalOpen] = useState(false);
  const [proposalTitle, setProposalTitle] = useState("Penggantian Komponen X");
  const [proposalScope, setProposalScope] = useState("Perbaikan dan instalasi sparepart tambahan");
  const [proposalReason, setProposalReason] = useState("Kerusakan fisik di luar cakupan garansi");
  const [lineItemMaterial, setLineItemMaterial] = useState<number>(350000);
  const [lineItemJasa, setLineItemJasa] = useState<number>(150000);

  // Request More Info Modal
  const [isRequestInfoModalOpen, setIsRequestInfoModalOpen] = useState(false);
  const [requestInfoNotes, setRequestInfoNotes] = useState("");

  // Completion Proof Review Modal
  const [isProofReviewModalOpen, setIsProofReviewModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Date formatting utilities
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      return (
        new Date(dateStr).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }) + " WIB"
      );
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    return `${formatDate(dateStr)} • ${formatTime(dateStr)}`;
  };

  // Provider's claims
  const providerClaims = getWarrantyClaimsByProvider(providerId);

  // Eligible workers for assignment (matching provider & active/online)
  const eligibleWorkers = repo.workers.filter(
    (w) =>
      isMatchProvider(w.providerId) ||
      w.providerId === "prov-bintang-teknik" ||
      w.id === "worker-budi" ||
      providerId === "prov-01" ||
      providerId === "usr-prov-001"
  );

  // Helper to resolve parent warranty
  const resolveWarranty = (warrantyId: string): WarrantyV1 | undefined => {
    return warrantiesV1.find((w) => w.id === warrantyId);
  };

  // Helper to resolve assignment
  const resolveAssignment = (claimId: string): WarrantyAssignmentV1 | undefined => {
    return assignmentsV1.find((a) => a.warrantyClaimId === claimId);
  };

  // Helper to resolve diagnosis
  const resolveDiagnosis = (claimId: string): WarrantyDiagnosisV1 | undefined => {
    return diagnosesV1.find((d) => d.warrantyClaimId === claimId);
  };

  // Helper to resolve paid work proposal
  const resolveProposal = (claimId: string): WarrantyPaidWorkProposalV1 | undefined => {
    return paidWorkProposalsV1.find((p) => p.warrantyClaimId === claimId);
  };

  // Helper to resolve completion proof
  const resolveProof = (claimId: string): WarrantyCompletionProofV1 | undefined => {
    return completionProofsV1.find((p) => p.warrantyClaimId === claimId);
  };

  // Category resolver for the 10 locked UI groupings (Section 5 & 6)
  const getProviderRequestCategory = (claim: WarrantyClaimV1): Exclude<ProviderTabGroup, "ALL"> => {
    const asg = resolveAssignment(claim.id);
    const dx = resolveDiagnosis(claim.id);
    const proposal = resolveProposal(claim.id);
    const proof = resolveProof(claim.id);
    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Selesai (Terminal outcomes)
    if (
      claim.status === "RESOLVED" ||
      claim.status === "REJECTED" ||
      claim.status === "DISPUTED" ||
      (asg && asg.status === "COMPLETED") ||
      (proof && proof.status === "APPROVED") ||
      proposal?.status === "CUSTOMER_REJECTED" ||
      proposal?.status === "PROVIDER_REJECTED" ||
      proposal?.status === "CANCELLED"
    ) {
      return "COMPLETED";
    }

    // 2. Pengerjaan (Active warranty repair or paid work being worked on)
    if (
      claim.status === "REPAIR_IN_PROGRESS" ||
      claim.status === "REPAIR_SCHEDULED" ||
      claim.status === "REPAIR_APPROVED" ||
      (asg && asg.assignmentType === "REPAIR" && asg.status !== "COMPLETED") ||
      proposal?.status === "CUSTOMER_APPROVED" ||
      proposal?.status === "AUTHORIZED" ||
      proposal?.status === "IN_PROGRESS" ||
      paidWorkRequestsV1.some((r) => r.warrantyClaimId === claim.id && (r.status === "AUTHORIZED" || r.status === "IN_PROGRESS"))
    ) {
      return "PENGERJAAN";
    }

    // 3. Menunggu Customer (Paid work proposal awaiting customer decision)
    if (proposal && proposal.status === "PROPOSAL_SENT") {
      return "WAITING_CUSTOMER";
    }

    // 4. Hasil (Worker submitted diagnosis, ball is on Provider to decide)
    if (
      claim.status === "WAITING_PROVIDER_DECISION" ||
      claim.status === "DIAGNOSIS_SUBMITTED" ||
      claim.infoRequested ||
      Boolean(dx && !claim.coverageDecision)
    ) {
      return "HASIL";
    }

    // 5. Diagnosis (Worker checked-in / diagnosis under way at location)
    if (
      (asg && asg.checkInAt && !dx) ||
      claim.status === "INSPECTION_IN_PROGRESS"
    ) {
      return "DIAGNOSIS";
    }

    // 6. OTW (Worker clicked Mulai Penanganan, travelling to location)
    if (
      asg &&
      (asg.otwAt || (asg.startedAt && !asg.checkInAt))
    ) {
      return "OTW";
    }

    // 7. Hari Ini (Scheduled today, but worker has not clicked Mulai Penanganan yet)
    if (
      asg &&
      asg.status === "SCHEDULED" &&
      asg.scheduledDate <= todayStr &&
      !asg.otwAt &&
      !asg.startedAt
    ) {
      return "TODAY";
    }

    // 8. Sudah Dijadwal (Provider has assigned worker & set schedule)
    if (
      asg &&
      (asg.status === "SCHEDULED" || claim.status === "INSPECTION_SCHEDULED" || claim.status === "INSPECTION_ASSIGNED") &&
      !asg.otwAt &&
      !asg.startedAt
    ) {
      return "SCHEDULED";
    }

    // 9. Pengajuan (New incoming claim needing provider review)
    return "SUBMITTED";
  };

  const matchesTab = (claim: WarrantyClaimV1, tab: ProviderTabGroup): boolean => {
    if (tab === "ALL") return true;
    return getProviderRequestCategory(claim) === tab;
  };

  // Filtered claims list
  const filteredClaims = providerClaims.filter((claim) => {
    const matchesFilter = matchesTab(claim, activeFilter);

    const war = resolveWarranty(claim.warrantyId);
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      claim.claimNumber.toLowerCase().includes(q) ||
      (war?.serviceTitle || "").toLowerCase().includes(q) ||
      (war?.customerName || "").toLowerCase().includes(q) ||
      (claim.reason || "").toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  // Stepper Stage Calculation (1 to 10)
  const calculateStepperStage = (claim: WarrantyClaimV1): number => {
    const asg = resolveAssignment(claim.id);
    const dx = resolveDiagnosis(claim.id);
    const proof = resolveProof(claim.id);

    if (claim.status === "RESOLVED") return 10;
    if (proof && proof.status === "SUBMITTED") return 9;
    if (claim.status === "REPAIR_IN_PROGRESS" || claim.status === "REPAIR_SCHEDULED") return 9;
    if (claim.status === "REPAIR_APPROVED") return 8;
    if (claim.status === "WAITING_PROVIDER_DECISION" || dx) return 8;
    if (asg && (asg.status === "IN_PROGRESS" || asg.startedAt)) return 6;
    if (asg && asg.status === "SCHEDULED") return 4;
    if (claim.status === "INSPECTION_ASSIGNED" || asg) return 3;
    if (claim.reviewedAt) return 2;
    return 1;
  };

  // Handlers
  const handleOpenDetail = (claim: WarrantyClaimV1) => {
    setSelectedClaimForDetail(claim);
    setIsDetailModalOpen(true);
  };

  const handleAcceptClaim = (claim: WarrantyClaimV1) => {
    try {
      reviewWarrantyClaim(providerId, claim.id, "ACCEPT");
      setToastMessage("Klaim diterima untuk pemeriksaan. Silakan tugaskan teknisi.");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || "Gagal memproses klaim.");
    }
  };

  const handleOpenRejectModal = (claim: WarrantyClaimV1) => {
    setSelectedClaimForDetail(claim);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedClaimForDetail || !rejectionReason.trim()) {
      alert("Alasan penolakan wajib diisi.");
      return;
    }
    try {
      reviewWarrantyClaim(providerId, selectedClaimForDetail.id, "REJECT", rejectionReason);
      setIsRejectModalOpen(false);
      setIsDetailModalOpen(false);
      setToastMessage("Klaim garansi berhasil ditolak dengan alasan tercatat.");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || "Gagal menolak klaim.");
    }
  };

  const handleOpenAssignModal = (claim: WarrantyClaimV1, type: "INSPECTION" | "REPAIR" = "INSPECTION") => {
    setSelectedClaimForDetail(claim);
    setAssignmentType(type);
    const defaultWorker = eligibleWorkers[0]?.id || repo.workers[0]?.id || "worker-budi";
    setSelectedWorkerId(defaultWorker);
    const today = new Date().toISOString().split("T")[0];
    setScheduledDate(today);
    setScheduledTime("10:00 WIB");
    setEstimatedDuration(type === "REPAIR" ? 90 : 60);
    const war = resolveWarranty(claim.warrantyId);
    setAssignmentLocation(
      war?.customerName ? `Alamat Pelanggan (${war.customerName}), Bandung` : "Jl. Tebet Barat Dalam No. 42, Jakarta Selatan"
    );
    setAssignmentNotes(
      type === "REPAIR"
        ? "Pelaksanaan perbaikan garansi resmi Servio"
        : "Pemeriksaan teknis dan diagnosis lapangan garansi Servio"
    );
    setAssignError(null);
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForDetail || !selectedWorkerId) {
      setAssignError("Pilih teknisi terlebih dahulu.");
      return;
    }
    try {
      // If the claim is still in SUBMITTED state, accept it first so it transitions cleanly
      if (selectedClaimForDetail.status === "SUBMITTED") {
        reviewWarrantyClaim(providerId, selectedClaimForDetail.id, "ACCEPT");
      }

      assignWarrantyWorker(
        providerId,
        selectedClaimForDetail.id,
        selectedWorkerId,
        assignmentType,
        {
          scheduledDate,
          scheduledStartTime: scheduledTime,
          estimatedDuration: Number(estimatedDuration || 60),
          location: assignmentLocation,
          notes: assignmentNotes,
        }
      );
      setIsAssignModalOpen(false);
      setIsDetailModalOpen(false);
      setToastMessage(
        assignmentType === "REPAIR"
          ? `Perbaikan garansi berhasil dijadwalkan pada ${scheduledDate} pukul ${scheduledTime}.`
          : `Klaim diterima & jadwal penugasan berhasil dikirimkan ke Teknisi pada ${scheduledDate} pukul ${scheduledTime}.`
      );
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setAssignError(err.message || "Gagal menugaskan teknisi.");
    }
  };

  // Reschedule
  const handleOpenRescheduleModal = (assignmentId: string) => {
    setRescheduleAssignmentId(assignmentId);
    setNewRescheduleDate("2026-09-27");
    setNewRescheduleTime("14:00 WIB");
    setIsRescheduleModalOpen(true);
  };

  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleAssignmentId) return;
    try {
      rescheduleWarrantyAssignment(providerId, rescheduleAssignmentId, {
        scheduledDate: newRescheduleDate,
        scheduledStartTime: newRescheduleTime,
        estimatedDuration: 60,
        notes: "Penyesuaian jadwal inspeksi teknisi",
      });
      setIsRescheduleModalOpen(false);
      setToastMessage(`Jadwal teknisi berhasil diperbarui ke ${newRescheduleDate} pukul ${newRescheduleTime}.`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || "Gagal mengubah jadwal.");
    }
  };

  // 3 DECISION BUTTON HANDLERS
  // Button 1: Setujui Perbaikan Garansi (COVERED)
  const handleApproveCoveredRepair = (claim: WarrantyClaimV1) => {
    try {
      providerDecideCoverage(
        providerId,
        claim.id,
        true,
        "Kerusakan tercakup 100% dalam garansi servis resmi Servio."
      );
      setToastMessage("Perbaikan garansi disetujui. Silakan atur jadwal pengerjaan perbaikan.");
      setTimeout(() => setToastMessage(null), 3500);
      // Immediately open repair assignment modal
      handleOpenAssignModal(claim, "REPAIR");
    } catch (err: any) {
      alert(err.message || "Gagal menyetujui perbaikan.");
    }
  };

  // Button 2: Ajukan Pekerjaan Berbayar (NOT COVERED)
  const handleOpenPaidProposalModal = (claim: WarrantyClaimV1) => {
    setSelectedClaimForDetail(claim);
    setProposalTitle("Penggantian Komponen X & Dudukan Outdoor");
    setProposalScope("Pergantian komponen kompresor X dan kalibrasi balancing unit outdoor");
    setProposalReason("Kerusakan fisik akibat benturan benda jatuh dari luar, tidak dicakup polis garansi pengerjaan.");
    setLineItemMaterial(350000);
    setLineItemJasa(150000);
    setIsPaidProposalModalOpen(true);
  };

  const handleSendPaidProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForDetail) return;
    try {
      // First ensure coverage decision is recorded as NOT_COVERED
      providerDecideCoverage(
        providerId,
        selectedClaimForDetail.id,
        false,
        proposalReason
      );

      const existingReq = resolveProposal(selectedClaimForDetail.id);
      const reqId = existingReq?.paidWorkRequestId || `wpr-${Date.now()}`;

      providerCreatePaidWorkProposal(providerId, reqId, {
        title: proposalTitle,
        scope: proposalScope,
        reasonOutsideWarranty: proposalReason,
        lineItems: [
          { description: "Komponen Suku Cadang Resmi", quantity: 1, unitPrice: lineItemMaterial, total: lineItemMaterial },
          { description: "Jasa Pengerjaan & Kalibrasi", quantity: 1, unitPrice: lineItemJasa, total: lineItemJasa },
        ],
      });

      setIsPaidProposalModalOpen(false);
      setToastMessage("Proposal pekerjaan berbayar berhasil dikirim ke Pelanggan.");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || "Gagal mengajukan pekerjaan berbayar.");
    }
  };

  // Button 3: Minta Informasi Tambahan
  const handleOpenRequestInfoModal = (claim: WarrantyClaimV1) => {
    setSelectedClaimForDetail(claim);
    setRequestInfoNotes("");
    setIsRequestInfoModalOpen(true);
  };

  const handleConfirmRequestInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForDetail || !requestInfoNotes.trim()) {
      alert("Masukkan rincian informasi atau bukti tambahan yang diminta.");
      return;
    }
    try {
      providerRequestMoreInfo(providerId, selectedClaimForDetail.id, requestInfoNotes);
      setIsRequestInfoModalOpen(false);
      setToastMessage("Permintaan informasi tambahan telah dikirimkan ke Teknisi.");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || "Gagal meminta informasi tambahan.");
    }
  };

  // Completion Proof Review & Resolution
  const handleConfirmCompletion = (claim: WarrantyClaimV1) => {
    const proof = resolveProof(claim.id);
    if (!proof) return;
    try {
      providerReviewCompletionProof(providerId, proof.id, true);
      setToastMessage("Perbaikan garansi dikonfirmasi selesai. Klaim tuntas (Resolved).");
      setTimeout(() => setToastMessage(null), 3500);
      setIsProofReviewModalOpen(false);
      setIsDetailModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Gagal memverifikasi penyelesaian.");
    }
  };

  return (
    <div className="space-y-6 font-body pb-20 text-left w-full bg-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle size={20} className="text-emerald-400 shrink-0" weight="fill" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Pengajuan Garansi"
        description="Pusat operasional seluruh kasus garansi pelanggan. Pantau tahap penanganan, penugasan teknisi, jadwal kunjungan, dan pengambilan keputusan jaminan."
        breadcrumbs={[
          { label: "Mitra Bengkel", href: "/provider/dashboard" },
          { label: "Pengajuan Garansi", href: "/provider/warranty/requests" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/provider/warranty"
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition shadow-2xs"
            >
              Konfigurasi Garansi
            </Link>
          </div>
        }
      />

      <div className="space-y-6 w-full">
        {/* 10 Status Groupings Filter Bar (Prompt Section 5 & 6) */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none relative">
            {PROVIDER_TABS.map((f) => {
              const active = activeFilter === f.id;
              const count =
                f.id === "ALL"
                  ? providerClaims.length
                  : providerClaims.filter((c) => matchesTab(c, f.id)).length;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id)}
                  className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 select-none ${
                    active
                      ? "text-white font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="providerRequestActiveTabIndicator"
                      className="absolute inset-0 bg-[#0F4C81] rounded-xl shadow-xs"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{f.label}</span>
                  <span
                    className={`relative z-10 text-[10px] font-black px-1.5 py-0.2 rounded-full transition-colors ${
                      active
                        ? "bg-white/25 text-white"
                        : f.badgeColor || "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64 shrink-0">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor klaim, servis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#0F4C81] focus:ring-2 focus:ring-[#0F4C81]/20 transition"
            />
          </div>
        </div>

        {/* Claim Cards Grid (Prompt Section 16: Unified Card Template) */}
        {filteredClaims.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
            <ClipboardText size={32} className="text-slate-400 mx-auto" weight="duotone" />
            <h3 className="text-base font-bold text-slate-800">Tidak ada pengajuan pada kategori ini</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ditemukan kasus klaim yang cocok dengan tab filter atau kata kunci pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClaims.map((claim) => {
              const war = resolveWarranty(claim.warrantyId);
              const asg = resolveAssignment(claim.id);
              const dx = resolveDiagnosis(claim.id);
              const proposal = resolveProposal(claim.id);
              const proof = resolveProof(claim.id);
              const category = getProviderRequestCategory(claim);

              // 1. Badge & Stage config
              let badgeType = "WARRANTY";
              let badgeTypeStyle = "bg-sky-50 text-sky-800 border-sky-200";
              let stageLabel = "PENGAJUAN";
              let stageBadgeStyle = "bg-rose-50 text-rose-800 border-rose-200";
              let hasPulseDot = false;

              if (category === "SUBMITTED") {
                stageLabel = "PENGAJUAN";
                stageBadgeStyle = "bg-rose-50 text-rose-800 border-rose-200";
              } else if (category === "SCHEDULED") {
                stageLabel = "SUDAH DIJADWAL";
                stageBadgeStyle = "bg-blue-50 text-blue-800 border-blue-200";
              } else if (category === "TODAY") {
                stageLabel = "HARI INI";
                stageBadgeStyle = "bg-indigo-50 text-indigo-800 border-indigo-200";
              } else if (category === "OTW") {
                stageLabel = "OTW";
                stageBadgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
                hasPulseDot = true;
              } else if (category === "DIAGNOSIS") {
                stageLabel = "DIAGNOSIS";
                stageBadgeStyle = "bg-purple-50 text-purple-800 border-purple-200";
              } else if (category === "HASIL") {
                stageLabel = "HASIL";
                stageBadgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
              } else if (category === "WAITING_CUSTOMER") {
                badgeType = "PAID WORK";
                badgeTypeStyle = "bg-purple-50 text-purple-800 border-purple-200";
                stageLabel = "MENUNGGU CUSTOMER";
                stageBadgeStyle = "bg-orange-50 text-orange-800 border-orange-200";
              } else if (category === "PENGERJAAN") {
                if (proposal && (proposal.status === "CUSTOMER_APPROVED" || proposal.status === "AUTHORIZED" || proposal.status === "IN_PROGRESS")) {
                  badgeType = "PAID WORK";
                  badgeTypeStyle = "bg-purple-50 text-purple-800 border-purple-200";
                } else {
                  badgeType = "WARRANTY REPAIR";
                  badgeTypeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200";
                }
                stageLabel = "PENGERJAAN";
                stageBadgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200";
              } else if (category === "COMPLETED") {
                if (proposal?.status === "CUSTOMER_REJECTED") {
                  badgeType = "PAID WORK";
                  badgeTypeStyle = "bg-rose-50 text-rose-800 border-rose-200";
                }
                stageLabel = "SELESAI";
                stageBadgeStyle = "bg-slate-100 text-slate-700 border-slate-300";
              }

              // Assigned worker name display
              const workerName = asg?.workerName || war?.originalWorkerName || "Belum Ditugaskan";

              return (
                <div
                  key={claim.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
                >
                  <div className="space-y-3">
                    {/* 1. BADGE + STAGE */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${badgeTypeStyle}`}>
                        {badgeType}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1.5 ${stageBadgeStyle}`}>
                        {hasPulseDot && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                        )}
                        <span>{stageLabel}</span>
                      </span>
                    </div>

                    {/* 2. ID */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {claim.claimNumber}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        #{war?.originalServiceOrderId || claim.warrantyId}
                      </span>
                    </div>

                    {/* 3. SERVICE */}
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm font-display leading-tight line-clamp-1">
                        {war?.serviceTitle || "Layanan Servis"}
                      </h3>
                    </div>

                    {/* 4. CUSTOMER & WORKER */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Customer</p>
                        <p className="font-semibold text-slate-800 truncate">{war?.customerName || "Pelanggan"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Worker</p>
                        <p className="font-semibold text-slate-800 truncate">{workerName}</p>
                      </div>
                    </div>

                    {/* 5. SCHEDULE & 6. LOCATION */}
                    <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Clock size={13} className="text-[#0F4C81] shrink-0" />
                        <span className="truncate">
                          {category === "SUBMITTED" && `Diajukan: ${formatDateTime(claim.submittedAt || claim.createdAt)}`}
                          {category === "SCHEDULED" && `${asg?.scheduledDate || "26 Sep 2026"} • ${asg?.scheduledStartTime || "10:00 WIB"}`}
                          {category === "TODAY" && `Hari ini • ${asg?.scheduledStartTime || "10:00 WIB"}`}
                          {category === "OTW" && `Jadwal: Hari ini • ${asg?.scheduledStartTime || "10:00 WIB"}`}
                          {category === "DIAGNOSIS" && "Pemeriksaan di lokasi berlangsung"}
                          {category === "HASIL" && `Diagnosis masuk • ${formatTime(dx?.submittedAt || claim.updatedAt)}`}
                          {category === "WAITING_CUSTOMER" && `Proposal terkirim • ${formatDate(proposal?.createdAt || claim.updatedAt)}`}
                          {category === "PENGERJAAN" && `Pengerjaan • ${asg?.scheduledDate || "Hari ini"} ${asg?.scheduledStartTime || ""}`}
                          {category === "COMPLETED" && `Selesai • ${formatDateTime(claim.resolvedAt || claim.updatedAt)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{asg?.location || "Bandung, Jawa Barat"}</span>
                      </div>
                    </div>

                    {/* 7. SUMMARY / CURRENT INFO (Contextual per stage) */}
                    {category === "SUBMITTED" && (
                      <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-200/80 text-xs space-y-1.5">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-rose-800 tracking-wider">Masalah</span>
                          <p className="text-slate-800 font-medium text-[11px] line-clamp-2">&quot;{claim.reason}&quot;</p>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-rose-200/60 text-[11px] text-rose-900 font-medium">
                          <span>Diajukan</span>
                          <span className="font-semibold">{formatDateTime(claim.submittedAt || claim.createdAt)}</span>
                        </div>
                        {claim.evidence && claim.evidence.length > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Camera size={12} className="text-slate-400" />
                            <span>Bukti: {claim.evidence.length} foto</span>
                          </div>
                        )}
                      </div>
                    )}

                    {category === "SCHEDULED" && asg && (
                      <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-200/80 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-[11px]">
                          <Check size={13} weight="bold" className="text-blue-700" />
                          <span>Worker ditugaskan ({workerName})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-[11px]">
                          <Check size={13} weight="bold" className="text-blue-700" />
                          <span>Jadwal dibuat ({asg.scheduledDate})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Clock size={13} />
                          <span>Menunggu waktu penanganan</span>
                        </div>
                      </div>
                    )}

                    {category === "TODAY" && (
                      <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-200/80 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-indigo-800 tracking-wider">Status</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-200/80 text-indigo-900 uppercase">
                            SIAP DIMULAI
                          </span>
                        </div>
                        <p className="text-[11px] text-indigo-950 font-medium">
                          Jadwal telah masuk hari ini. Menunggu Worker menekan tombol Mulai Penanganan.
                        </p>
                      </div>
                    )}

                    {category === "OTW" && (
                      <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/80 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                          <Check size={13} weight="bold" />
                          <span>Penanganan dimulai</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-[11px]">
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                          <span>Worker menuju lokasi</span>
                        </div>
                      </div>
                    )}

                    {category === "DIAGNOSIS" && (
                      <div className="bg-purple-50/60 rounded-xl p-3 border border-purple-200/80 text-xs space-y-1.5">
                        <p className="text-[11px] font-bold text-purple-900">
                          Pemeriksaan sedang berlangsung
                        </p>
                        <div className="space-y-1 text-[11px] text-purple-950">
                          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                            <Check size={12} weight="bold" />
                            <span>Check-in di lokasi</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                            <Check size={12} weight="bold" />
                            <span>Pemeriksaan dimulai</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-purple-800 font-bold">
                            <span className="inline-block w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                            <span>Diagnosis</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {category === "HASIL" && dx && (
                      <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/80 text-xs space-y-1.5">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">Temuan</span>
                          <p className="text-slate-800 font-medium text-[11px] line-clamp-1">{dx.findings || "-"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">Diagnosis</span>
                          <p className="text-slate-900 font-bold text-[11px] line-clamp-1">{dx.diagnosis || "-"}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">Rekomendasi</span>
                          <p className="text-slate-800 font-medium text-[11px] line-clamp-1">{dx.recommendedAction || "-"}</p>
                        </div>
                        {dx.evidence && dx.evidence.length > 0 && (
                          <div className="pt-1 border-t border-amber-200/60 flex items-center gap-1 text-[11px] text-amber-900 font-semibold">
                            <Camera size={12} weight="bold" />
                            <span>Bukti: {dx.evidence.length} foto</span>
                          </div>
                        )}
                      </div>
                    )}

                    {category === "WAITING_CUSTOMER" && (
                      <div className="bg-orange-50/70 rounded-xl p-3 border border-orange-200/80 text-xs space-y-1.5">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-orange-800 tracking-wider">Alasan</span>
                          <p className="text-[11px] text-slate-800 font-medium line-clamp-1">
                            {proposal?.reasonOutsideWarranty || "Kerusakan di luar cakupan garansi"}
                          </p>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-900 pt-1 border-t border-orange-200/60">
                          <span>Total</span>
                          <span className="text-orange-700 font-mono">
                            Rp{((proposal?.totalAmount) || 505000).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="space-y-0.5 pt-0.5 text-[11px]">
                          <div className="flex items-center gap-1.5 text-orange-800 font-semibold">
                            <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                            <span>Menunggu persetujuan Customer</span>
                          </div>
                          <p className="text-[10px] text-slate-500">Worker belum dapat mengerjakan</p>
                        </div>
                      </div>
                    )}

                    {category === "PENGERJAAN" && (
                      <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-200/80 text-xs space-y-1.5">
                        {proposal && (proposal.status === "CUSTOMER_APPROVED" || proposal.status === "AUTHORIZED" || proposal.status === "IN_PROGRESS") ? (
                          <>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-600">Total:</span>
                              <span className="font-bold font-mono text-emerald-800">
                                Rp{((proposal.totalAmount) || 0).toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="space-y-0.5 text-[11px] text-emerald-800 font-medium">
                              <div className="flex items-center gap-1"><Check size={12} weight="bold" /> <span>Customer menyetujui</span></div>
                              <div className="flex items-center gap-1"><Check size={12} weight="bold" /> <span>Paid Work Order tersedia</span></div>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px] pt-1 border-t border-emerald-200/60">
                              <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                              <span>Worker sedang mengerjakan</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">Perbaikan</span>
                              <p className="text-slate-900 font-bold text-[11px] line-clamp-1">
                                {dx?.recommendedAction || "Penggantian Kompresor / Sesuai Klaim"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px] pt-1 border-t border-emerald-200/60">
                              <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                              <span>Worker sedang mengerjakan</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {category === "COMPLETED" && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                        {proposal && proposal.status === "CUSTOMER_REJECTED" ? (
                          <div className="space-y-1">
                            <p className="text-[11px] font-bold text-rose-700">PAID WORK DITOLAK CUSTOMER</p>
                            <p className="text-[10px] text-slate-500">Pekerjaan tidak dilanjutkan</p>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                              <Check size={13} weight="bold" />
                              <span>Pengerjaan selesai</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-slate-600">
                              <span>Selesai:</span>
                              <span className="font-semibold text-slate-800">
                                {formatDateTime(claim.resolvedAt || claim.updatedAt)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200/60">
                              <span>Warranty:</span>
                              <span className="font-bold text-emerald-700">
                                AKTIF • s/d {formatDate(war?.expiresAt)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* 8. LAST UPDATE */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Update Terakhir</span>
                      <span className="font-medium text-slate-600">
                        {formatTime(asg?.otwAt || claim.updatedAt || claim.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* 9. PRIMARY ACTION / CTA (Unified standard per prompt) */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    {category === "SUBMITTED" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(claim, "INSPECTION")}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition flex items-center justify-center gap-1 shadow-xs"
                        >
                          <CheckCircle size={14} weight="bold" />
                          <span>Terima &amp; Berikan Jadwal</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(claim)}
                          className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                        >
                          Lihat Pengajuan
                        </button>
                      </>
                    )}

                    {category === "SCHEDULED" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(claim)}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-sky-800 transition flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Eye size={14} weight="bold" />
                          <span>Lihat Penanganan</span>
                        </button>
                        {asg && (
                          <button
                            type="button"
                            onClick={() => handleOpenRescheduleModal(asg.id)}
                            className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center gap-1"
                          >
                            <CalendarCheck size={14} weight="bold" />
                            <span>Ubah Jadwal</span>
                          </button>
                        )}
                      </>
                    )}

                    {(category === "TODAY" || category === "OTW") && (
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(claim)}
                        className="w-full py-2 px-3 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-sky-800 transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Eye size={14} weight="bold" />
                        <span>Lihat Penanganan</span>
                      </button>
                    )}

                    {category === "DIAGNOSIS" && (
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(claim)}
                        className="w-full py-2 px-3 rounded-xl bg-purple-700 text-white font-bold text-xs hover:bg-purple-800 transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Eye size={14} weight="bold" />
                        <span>Lihat Penanganan</span>
                      </button>
                    )}

                    {category === "HASIL" && (
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(claim)}
                        className="w-full py-2 px-3 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <ClipboardText size={14} weight="bold" />
                        <span>Lihat Diagnosis &amp; Keputusan</span>
                      </button>
                    )}

                    {category === "WAITING_CUSTOMER" && (
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(claim)}
                        className="w-full py-2 px-3 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <FileText size={14} weight="bold" />
                        <span>Lihat Proposal</span>
                      </button>
                    )}

                    {category === "PENGERJAAN" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(claim)}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Eye size={14} weight="bold" />
                          <span>Lihat Progres</span>
                        </button>
                        {proof && proof.status === "SUBMITTED" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClaimForDetail(claim);
                              setIsProofReviewModalOpen(true);
                            }}
                            className="py-2 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs transition"
                          >
                            Verifikasi
                          </button>
                        )}
                      </>
                    )}

                    {category === "COMPLETED" && (
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(claim)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Eye size={14} weight="bold" />
                        <span>Lihat Riwayat</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DETAIL MODAL: PENANGANAN GARANSI (STEPPER + TIMELINE + DECISION)          */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedClaimForDetail && (() => {
        const claim = selectedClaimForDetail;
        const war = resolveWarranty(claim.warrantyId);
        const asg = resolveAssignment(claim.id);
        const dx = resolveDiagnosis(claim.id);
        const proposal = resolveProposal(claim.id);
        const proof = resolveProof(claim.id);
        const activeStage = calculateStepperStage(claim);

        const steps = [
          { num: 1, title: "Pengajuan" },
          { num: 2, title: "Review Provider" },
          { num: 3, title: "Teknisi Ditugaskan" },
          { num: 4, title: "Jadwal" },
          { num: 5, title: "Teknisi Datang" },
          { num: 6, title: "Pemeriksaan" },
          { num: 7, title: "Diagnosis" },
          { num: 8, title: "Keputusan Provider" },
          { num: 9, title: "Perbaikan" },
          { num: 10, title: "Selesai" },
        ];

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-auto text-xs">
              {/* Modal Top Header with Close */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      WARRANTY CASE
                    </span>
                    <span className="font-mono font-bold text-slate-700">{claim.claimNumber}</span>
                  </div>
                  <h2 className="text-lg font-bold font-display text-slate-900 mt-1">
                    PENANGANAN GARANSI
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>

              {/* Header Information (Prompt Section 11) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px]">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Service</p>
                  <p className="font-bold text-slate-900 truncate">{war?.serviceTitle}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Customer</p>
                  <p className="font-bold text-slate-900 truncate">{war?.customerName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Original Order</p>
                  <p className="font-bold text-slate-900">#{war?.originalServiceOrderId}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Original Worker</p>
                  <p className="font-bold text-slate-900 truncate">{war?.originalWorkerName || "Andi Pratama"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Warranty Worker</p>
                  <p className="font-bold text-emerald-700 truncate">{asg?.workerName || "Belum Ditugaskan"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Periode Garansi</p>
                  <p className="font-bold text-slate-900">
                    {war?.startedAt ? new Date(war.startedAt).toLocaleDateString("id-ID") : "24 Sep"} –{" "}
                    {war?.expiresAt ? new Date(war.expiresAt).toLocaleDateString("id-ID") : "07 Nov 2026"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Status Garansi</p>
                  <p className="font-bold text-emerald-700">AKTIF</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Klaim Ke-</p>
                  <p className="font-bold text-slate-900">{war?.claimCount || 1}</p>
                </div>
              </div>

              {/* 10-Step Visual Stepper (Prompt Section 10) */}
              <div className="space-y-2 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Progres Penanganan Garansi (Tahap {activeStage} dari 10)
                </p>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-center">
                  {steps.map((st) => {
                    const isDone = st.num < activeStage;
                    const isCurrent = st.num === activeStage;
                    return (
                      <div
                        key={st.num}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center transition ${
                          isCurrent
                            ? "bg-[#0F4C81] text-white shadow-xs font-bold"
                            : isDone
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-slate-50 text-slate-400 border border-slate-100"
                        }`}
                      >
                        <span className="text-sm font-black">
                          {isDone ? "✓" : isCurrent ? "●" : "○"}
                        </span>
                        <span className="text-[9px] font-semibold mt-1 leading-tight line-clamp-1">
                          {st.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Context Actions / Current Stage Focus */}
              {/* STAGE A: CLAIM SUBMITTED (Prompt Section 13) */}
              {claim.status === "SUBMITTED" && (
                <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
                  <div className="flex items-center gap-2 text-rose-800 font-bold">
                    <Warning size={18} weight="fill" />
                    <span>Pengajuan Garansi Masuk — Perlu Review Mitra</span>
                  </div>
                  <div className="space-y-1 text-slate-700">
                    <p><span className="font-bold">Keluhan:</span> {claim.reason}</p>
                    <p><span className="font-bold">Deskripsi:</span> {claim.description}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleOpenAssignModal(claim, "INSPECTION");
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition flex items-center gap-1.5"
                    >
                      <CheckCircle size={16} weight="bold" />
                      <span>Terima &amp; Berikan Jadwal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRejectModal(claim)}
                      className="px-4 py-2 rounded-xl bg-white border border-rose-300 text-rose-700 font-bold hover:bg-rose-50 transition"
                    >
                      Tolak Klaim
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE B: ACCEPTED -> NEED ASSIGNMENT (Prompt Section 14) */}
              {((claim.status as string) === "UNDER_REVIEW" || (!asg && claim.status !== "SUBMITTED" && claim.status !== "REJECTED")) && (
                <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sky-900">Klaim Telah Diterima — Tugaskan Teknisi</h4>
                      <p className="text-slate-600 mt-0.5">Pilih teknisi yang berkompeten dan atur jadwal inspeksi lapangan.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenAssignModal(claim, "INSPECTION")}
                      className="px-4 py-2 rounded-xl bg-[#0F4C81] text-white font-bold hover:bg-sky-800 transition shrink-0"
                    >
                      Tugaskan Teknisi Sekarang
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE C: SCHEDULED / IN PROGRESS INFO */}
              {asg && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {asg.assignmentType === "REPAIR" ? "Penugasan Perbaikan" : "Penugasan Inspeksi"}:
                      </span>
                      <span className="font-bold text-emerald-700">{asg.workerName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenRescheduleModal(asg.id)}
                      className="text-[#0F4C81] font-bold hover:underline"
                    >
                      Ubah Jadwal
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-600">
                    <p>Jadwal: <span className="font-semibold text-slate-900">{asg.scheduledDate} ({asg.scheduledStartTime})</span></p>
                    <p>Lokasi: <span className="font-semibold text-slate-900">{asg.location}</span></p>
                    <p>Status: <span className="font-bold text-sky-800">{asg.status}</span></p>
                  </div>
                </div>
              )}

              {/* STAGE D: PROMINENT 3-BUTTON DECISION CARD (Prompt Section 22) */}
              {(claim.status === "WAITING_PROVIDER_DECISION" || dx) && claim.status !== "RESOLVED" && claim.status !== "REJECTED" && (
                <div className="p-6 rounded-3xl bg-amber-50/50 border-2 border-amber-300 space-y-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        HASIL DIAGNOSIS TEKNISI
                      </span>
                    </div>
                    <h3 className="text-base font-bold font-display text-slate-900 mt-1">
                      KEPUTUSAN PENJAMINAN PROVIDER
                    </h3>
                  </div>

                  {dx && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white border border-amber-200">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Temuan Lapangan</p>
                        <p className="font-semibold text-slate-800 mt-0.5">{dx.findings}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Diagnosis Kerusakan</p>
                        <p className="font-semibold text-slate-800 mt-0.5">{dx.diagnosis}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Rekomendasi Teknisi</p>
                        <p className="font-semibold text-slate-800 mt-0.5">{dx.recommendedAction}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Material yang Diperlukan</p>
                        <p className="font-semibold text-slate-800 mt-0.5">{dx.requiredMaterial || "Tidak ada"}</p>
                      </div>
                    </div>
                  )}

                  {/* 3 MANDATORY LARGE DECISION BUTTONS (Prompt Section 22) */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Pilih Tindakan Keputusan Garansi:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Button 1: Setujui Perbaikan Garansi */}
                      <button
                        type="button"
                        onClick={() => handleApproveCoveredRepair(claim)}
                        className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md flex flex-col items-center justify-center text-center gap-1 group"
                      >
                        <CheckCircle size={24} weight="bold" className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs">✓ Setujui Perbaikan Garansi</span>
                        <span className="text-[10px] font-normal opacity-90">100% Ditanggung Provider</span>
                      </button>

                      {/* Button 2: Ajukan Pekerjaan Berbayar */}
                      <button
                        type="button"
                        onClick={() => handleOpenPaidProposalModal(claim)}
                        className="p-4 rounded-2xl bg-[#0F4C81] hover:bg-sky-800 text-white font-bold transition shadow-md flex flex-col items-center justify-center text-center gap-1 group"
                      >
                        <Money size={24} weight="bold" className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs">Rp Ajukan Pekerjaan Berbayar</span>
                        <span className="text-[10px] font-normal opacity-90">Di Luar Garansi (Perlu ACC Customer)</span>
                      </button>

                      {/* Button 3: Minta Informasi Tambahan */}
                      <button
                        type="button"
                        onClick={() => handleOpenRequestInfoModal(claim)}
                        className="p-4 rounded-2xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold transition shadow-xs flex flex-col items-center justify-center text-center gap-1 group"
                      >
                        <ArrowsClockwise size={24} weight="bold" className="group-hover:rotate-45 transition-transform" />
                        <span className="text-xs">↻ Minta Informasi Tambahan</span>
                        <span className="text-[10px] font-normal text-slate-500">Klarifikasi &amp; Bukti Teknisi</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE E: COMPLETION PROOF REVIEW (Prompt Section 26) */}
              {proof && claim.status !== "RESOLVED" && (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-emerald-900">Bukti Penyelesaian Perbaikan Masuk</h4>
                      <p className="text-slate-600 mt-0.5">{proof.summary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleConfirmCompletion(claim)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle size={16} weight="bold" />
                      <span>Konfirmasi Selesai (Resolve)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Timeline Penanganan Garansi (Prompt Section 12) */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs">
                  Riwayat Timeline Penanganan Garansi
                </h4>
                <div className="space-y-2 border-l-2 border-sky-200 pl-4 ml-2">
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <p className="font-bold text-slate-800">Pengajuan Garansi Masuk</p>
                    <p className="text-[10px] text-slate-400">
                      Diajukan oleh {war?.customerName} pada {new Date(claim.submittedAt || claim.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>

                  {claim.reviewedAt && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <p className="font-bold text-slate-800">Klaim Ditinjau Provider</p>
                      <p className="text-[10px] text-slate-400">{new Date(claim.reviewedAt).toLocaleString("id-ID")}</p>
                    </div>
                  )}

                  {asg && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <p className="font-bold text-slate-800">
                        {asg.assignmentType === "REPAIR" ? "Worker Ditugaskan untuk Perbaikan" : "Worker Ditugaskan"}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold">{asg.workerName}</p>
                      <p className="text-[10px] text-slate-400">
                        Jadwal: {asg.scheduledDate} • {asg.scheduledStartTime}
                      </p>
                    </div>
                  )}

                  {asg && asg.startedAt && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <p className="font-bold text-slate-800">Teknisi Check-in di Lokasi</p>
                      <p className="text-[10px] text-slate-400">{new Date(asg.startedAt).toLocaleString("id-ID")}</p>
                    </div>
                  )}

                  {dx && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <p className="font-bold text-slate-800">Diagnosis Dikirim Teknisi</p>
                      <p className="text-[10px] text-slate-400">{new Date(dx.submittedAt).toLocaleString("id-ID")}</p>
                    </div>
                  )}

                  {claim.coverageDecision && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <p className="font-bold text-slate-800">
                        Keputusan Provider: {claim.coverageDecision === "COVERED" ? "100% Ditanggung Garansi" : "Pekerjaan di Luar Garansi"}
                      </p>
                      <p className="text-[10px] text-slate-400">{claim.coverageDecisionNotes || "Keputusan dicatat"}</p>
                    </div>
                  )}

                  {claim.status === "RESOLVED" && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <p className="font-bold text-emerald-700">Klaim Selesai (Resolved)</p>
                      <p className="text-[10px] text-slate-400">Unit telah diperbaiki dan garansi tetap aktif sampai expiry.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button Footer */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN WORKER (INSPECTION OR REPAIR)                              */}
      {/* ========================================================================= */}
      {isAssignModalOpen && selectedClaimForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs font-body">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900">
                {selectedClaimForDetail?.status === "SUBMITTED"
                  ? "Terima & Berikan Jadwal Penugasan Teknisi"
                  : assignmentType === "REPAIR"
                  ? "Jadwalkan Perbaikan Garansi"
                  : "Tugaskan Teknisi Pemeriksaan"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Klaim #{selectedClaimForDetail.claimNumber} &bull; {selectedClaimForDetail?.status === "SUBMITTED" ? "Inspeksi & Diagnosis Garansi" : assignmentType}
              </p>
            </div>

            <form onSubmit={handleConfirmAssign} className="space-y-3 font-medium">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Teknisi</label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold bg-white text-slate-900"
                >
                  {eligibleWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.skills.join(", ")}) &bull; Rating {w.rating}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="text"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    placeholder="10:00 WIB"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimasi Durasi</label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assignment Type</label>
                  <input
                    type="text"
                    readOnly
                    value={assignmentType}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lokasi Kunjungan</label>
                <input
                  type="text"
                  value={assignmentLocation}
                  onChange={(e) => setAssignmentLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan untuk Teknisi</label>
                <textarea
                  rows={2}
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              {assignError && (
                <p className="text-xs text-rose-600 font-bold">{assignError}</p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle size={16} weight="bold" />
                  <span>Kirim Penugasan &amp; Jadwal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESCHEDULE ASSIGNMENT                                              */}
      {/* ========================================================================= */}
      {isRescheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs font-body">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900">
                Ubah Jadwal Kunjungan Teknisi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Jadwal baru akan langsung disinkronkan ke kalender Teknisi dan Pelanggan.
              </p>
            </div>

            <form onSubmit={handleConfirmReschedule} className="space-y-3 font-medium">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal Baru</label>
                <input
                  type="date"
                  value={newRescheduleDate}
                  onChange={(e) => setNewRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Jam Mulai Baru</label>
                <input
                  type="text"
                  value={newRescheduleTime}
                  onChange={(e) => setNewRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Simpan Jadwal Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TOLAK KLAIM                                                        */}
      {/* ========================================================================= */}
      {isRejectModalOpen && selectedClaimForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs font-body">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900">
                Tolak Klaim Garansi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Klaim #{selectedClaimForDetail.claimNumber}. Alasan penolakan wajib dicatat secara transparan.
              </p>
            </div>

            <div className="space-y-3 font-medium">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Alasan Penolakan</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Misal: Kerusakan akibat benturan fisik eksternal, bukan pengerjaan servis sebelumnya."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700"
                >
                  Konfirmasi Tolak Klaim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AJUKAN PEKERJAAN BERBAYAR (PAID WORK PROPOSAL)                     */}
      {/* ========================================================================= */}
      {isPaidProposalModalOpen && selectedClaimForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs font-body">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                COMMERCIAL PROPOSAL
              </span>
              <h3 className="text-base font-bold font-display text-slate-900 mt-1">
                PEKERJAAN DI LUAR GARANSI
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Klaim #{selectedClaimForDetail.claimNumber} tidak ditanggung garansi. Susun proposal komersial untuk dikirim ke Pelanggan.
              </p>
            </div>

            <form onSubmit={handleSendPaidProposal} className="space-y-3 font-medium">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Pekerjaan</label>
                <input
                  type="text"
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alasan di Luar Garansi</label>
                <textarea
                  rows={2}
                  value={proposalReason}
                  onChange={(e) => setProposalReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Biaya Material / Part (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={lineItemMaterial}
                    onChange={(e) => setLineItemMaterial(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Biaya Jasa (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={lineItemJasa}
                    onChange={(e) => setLineItemJasa(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Summary calculation */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-800">
                    Rp {(lineItemMaterial + lineItemJasa).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Biaya Layanan Aplikasi:</span>
                  <span className="font-semibold text-slate-800">Rp 5.000</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Tagihan Pelanggan:</span>
                  <span className="text-[#0F4C81]">
                    Rp {(lineItemMaterial + lineItemJasa + 5000).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaidProposalModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0F4C81] text-white font-bold hover:bg-sky-800 shadow-xs"
                >
                  Kirim ke Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MINTA INFORMASI TAMBAHAN                                           */}
      {/* ========================================================================= */}
      {isRequestInfoModalOpen && selectedClaimForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs font-body">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900">
                Minta Informasi Tambahan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Klaim #{selectedClaimForDetail.claimNumber}. Kirim instruksi klarifikasi atau permintaan foto bukti tambahan kepada Teknisi.
              </p>
            </div>

            <form onSubmit={handleConfirmRequestInfo} className="space-y-3 font-medium">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Permintaan Mitra</label>
                <textarea
                  rows={3}
                  value={requestInfoNotes}
                  onChange={(e) => setRequestInfoNotes(e.target.value)}
                  placeholder="Misal: Mohon foto lebih dekat titik kebocoran pada flare nut dan ukur arus ampere kompresor."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRequestInfoModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Kirim ke Teknisi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
