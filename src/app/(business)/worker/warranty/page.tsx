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
  VideoCamera,
  Image as ImageIcon,
  Trash,
  Plus,
  FileText,
  MapPin,
  Sparkle,
  UploadSimple,
  CurrencyCircleDollar,
  Play,
  Check,
} from "@phosphor-icons/react";
import { useWarranties } from "@/features/warranties/useWarranties";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import {
  WarrantyAssignmentV1,
  WarrantyClaimV1,
  WarrantyDiagnosisV1,
  WarrantyPaidWorkRequestV1,
  WarrantyPaidWorkProposalV1,
} from "@/types/domain";

export default function WorkerWarrantyPage() {
  const repo = useDomainRepository();
  const {
    warrantiesV1,
    claimsV1,
    assignmentsV1,
    diagnosesV1,
    paidWorkRequestsV1,
    paidWorkProposalsV1,
    completionProofsV1,
    getWarrantyAssignmentsByWorker,
    workerStartWarrantyHandling,
    workerCheckInWarranty,
    workerSubmitWarrantyDiagnosis,
    workerRecommendPaidWork,
    workerSubmitCompletionProof,
  } = useWarranties();

  const [currentWorkerId, setCurrentWorkerId] = useState("wrk-01"); // Canonical default worker

  // Top-level tabs: [Tugas Garansi] and [Riwayat Garansi] (Section 51)
  const [topTab, setTopTab] = useState<"ACTIVE_TASKS" | "HISTORY">("ACTIVE_TASKS");

  // Status chips: 10 locked tabs matching the Worker operational journey
  type StatusFilter =
    | "ALL"
    | "MENDATANG"
    | "HARI_INI"
    | "OTW"
    | "PEMERIKSAAN"
    | "DIAGNOSIS"
    | "MENUNGGU_PROVIDER"
    | "MENUNGGU_CUSTOMER"
    | "PENGERJAAN"
    | "SELESAI";
  const [statusChip, setStatusChip] = useState<StatusFilter>("ALL");

  // History sub-filter: [Semua] [Warranty Repair] [Paid Work]
  type HistoryFilter = "ALL" | "WARRANTY_REPAIR" | "PAID_WORK";
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("ALL");

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Active task for detail
  const [selectedAssignment, setSelectedAssignment] = useState<WarrantyAssignmentV1 | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<"SUMMARY" | "TIMELINE" | "DIAGNOSIS" | "EVIDENCE">("SUMMARY");

  // Inspection intermediate state (Check-in -> Pemeriksaan -> Diagnosis)
  const [inspectingAssignmentIds, setInspectingAssignmentIds] = useState<string[]>(["WAS-2026-0104-DX"]);

  // Proposal modal for Menunggu Customer
  const [selectedProposalForView, setSelectedProposalForView] = useState<WarrantyPaidWorkProposalV1 | null>(null);
  const [isViewProposalModalOpen, setIsViewProposalModalOpen] = useState(false);

  // Diagnosis Modal Form
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [findings, setFindings] = useState("");
  const [diagnosisText, setDiagnosisText] = useState("");
  const [condition, setCondition] = useState("Kondisi aus wajar akibat penggunaan");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [requiredMaterial, setRequiredMaterial] = useState("");
  const [technicalNotes, setTechnicalNotes] = useState("");
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
  ]);
  const [evidenceVideos, setEvidenceVideos] = useState<string[]>([]);

  // Paid Work Recommendation Modal
  const [isPaidRecModalOpen, setIsPaidRecModalOpen] = useState(false);
  const [findingSummary, setFindingSummary] = useState("");
  const [recommendedWork, setRecommendedWork] = useState("");
  const [recommendedMaterial, setRecommendedMaterial] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState(60);

  // Completion Proof Modal
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [proofSummary, setProofSummary] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [evidenceBefore, setEvidenceBefore] = useState<string[]>([
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
  ]);
  const [evidenceAfter, setEvidenceAfter] = useState<string[]>([
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter assignments using canonical worker query
  const workerAssignments = getWarrantyAssignmentsByWorker(currentWorkerId);

  // Date helper for TODAY
  const todayStr = new Date().toISOString().split("T")[0];

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  /**
   * Helper to map any assignment into its strictly defined 10-tab category matching the Worker Journey.
   * Mendatang -> Hari Ini -> OTW -> Pemeriksaan -> Diagnosis -> Menunggu Provider -> (Menunggu Customer) -> Pengerjaan -> Selesai
   */
  const getTaskCategory = (a: WarrantyAssignmentV1): StatusFilter => {
    const claim = claimsV1.find((c) => c.id === a.warrantyClaimId);
    const dx = diagnosesV1.find((d) => d.warrantyClaimId === a.warrantyClaimId);
    const paidProp = paidWorkProposalsV1.find((p) => p.warrantyClaimId === a.warrantyClaimId);
    const proof = completionProofsV1.find((p) => p.warrantyClaimId === a.warrantyClaimId);

    // 1. Selesai
    if (
      a.status === "COMPLETED" ||
      a.status === "CANCELLED" ||
      claim?.status === "RESOLVED" ||
      Boolean(proof && proof.status === "APPROVED")
    ) {
      return "SELESAI";
    }

    // 2. Menunggu Customer: Provider set NOT_COVERED and Paid Work Proposal sent (Customer has not approved yet)
    if (
      paidProp?.status === "PROPOSAL_SENT" ||
      (claim?.coverageDecision === "NOT_COVERED" && !paidProp?.status.includes("APPROVED"))
    ) {
      return "MENUNGGU_CUSTOMER";
    }

    // 3. Pengerjaan: Strictly authorized execution only! (Warranty Repair OR Customer-Approved Paid Work)
    const isAuthorizedRepair =
      a.assignmentType === "REPAIR" ||
      claim?.coverageDecision === "COVERED" ||
      claim?.status === "REPAIR_APPROVED" ||
      claim?.status === "REPAIR_SCHEDULED" ||
      claim?.status === "REPAIR_IN_PROGRESS";

    const isAuthorizedPaidWork =
      paidProp?.status === "CUSTOMER_APPROVED" ||
      paidWorkRequestsV1.some((r) => r.warrantyClaimId === a.warrantyClaimId && r.status === "AUTHORIZED");

    if (isAuthorizedRepair || isAuthorizedPaidWork) {
      // If scheduled in the future and not started, it belongs in MENDATANG
      if (a.scheduledDate > todayStr && a.status === "SCHEDULED" && !a.startedAt) {
        return "MENDATANG";
      }
      return "PENGERJAAN";
    }

    // 4. Menunggu Provider: Diagnosis has been submitted, waiting for Provider coverage decision or info requested
    if (
      Boolean(dx) ||
      claim?.status === "WAITING_PROVIDER_DECISION" ||
      claim?.status === "DIAGNOSIS_SUBMITTED" ||
      claim?.infoRequested
    ) {
      return "MENUNGGU_PROVIDER";
    }

    // 5. Diagnosis: Worker has completed preliminary inspection / is drafting diagnosis
    const isInspecting =
      inspectingAssignmentIds.includes(a.id) ||
      (Boolean(a.checkInAt) && Boolean(a.notes?.toLowerCase().includes("diagnosis")));
    if (isInspecting && !dx) {
      return "DIAGNOSIS";
    }

    // 6. Pemeriksaan: Worker checked in at location, physical inspection in progress
    if (Boolean(a.checkInAt)) {
      return "PEMERIKSAAN";
    }

    // 7. OTW: Worker started handling, on the way to location
    if (Boolean(a.otwAt && !a.checkInAt)) {
      return "OTW";
    }

    // 8. Mendatang: Scheduled in the future
    if (a.scheduledDate > todayStr && !a.startedAt) {
      return "MENDATANG";
    }

    // 9. Hari Ini: Scheduled today and ready to start
    return "HARI_INI";
  };

  const filteredAssignments = workerAssignments.filter((a) => {
    const claim = claimsV1.find((c) => c.id === a.warrantyClaimId);
    const war = claim ? warrantiesV1.find((w) => w.id === claim.warrantyId) : null;
    const paidProp = paidWorkProposalsV1.find((p) => p.warrantyClaimId === a.warrantyClaimId);

    // Search query
    const matchSearch =
      !searchQuery ||
      a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (claim?.claimNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (war?.serviceTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (war?.customerName || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    const category = getTaskCategory(a);

    // Top Tab filter: HISTORY
    if (topTab === "HISTORY") {
      if (category !== "SELESAI") return false;
      if (historyFilter === "ALL") return true;
      const isPaid = Boolean(paidProp?.status === "CUSTOMER_APPROVED" || paidProp?.status === "PROPOSAL_SENT");
      if (historyFilter === "PAID_WORK") return isPaid;
      if (historyFilter === "WARRANTY_REPAIR") return !isPaid;
      return true;
    }

    // Top Tab filter: ACTIVE_TASKS
    if (statusChip === "ALL") {
      return true;
    }

    return category === statusChip;
  });

  // Category counts for chip badges
  const getCategoryCount = (key: StatusFilter) => {
    if (key === "ALL") {
      return workerAssignments.length;
    }
    return workerAssignments.filter((a) => getTaskCategory(a) === key).length;
  };

  const STATUS_CHIPS: Array<{ key: StatusFilter; label: string }> = [
    { key: "ALL", label: "Semua" },
    { key: "MENDATANG", label: "Mendatang" },
    { key: "HARI_INI", label: "Hari Ini" },
    { key: "OTW", label: "OTW" },
    { key: "PEMERIKSAAN", label: "Pemeriksaan" },
    { key: "DIAGNOSIS", label: "Diagnosis" },
    { key: "MENUNGGU_PROVIDER", label: "Menunggu Provider" },
    { key: "MENUNGGU_CUSTOMER", label: "Menunggu Customer" },
    { key: "PENGERJAAN", label: "Pengerjaan" },
    { key: "SELESAI", label: "Selesai" },
  ];

  // Action Handlers
  const handleStartHandling = (assignment: WarrantyAssignmentV1) => {
    try {
      workerStartWarrantyHandling(currentWorkerId, assignment.id);
      setToastMessage("Penanganan dimulai! Status Anda sekarang OTW (menuju lokasi pelanggan).");
      setTimeout(() => setToastMessage(null), 3500);
      setStatusChip("OTW");
    } catch (err: any) {
      alert(err.message || "Gagal memulai penanganan.");
    }
  };

  const handleCheckIn = (assignment: WarrantyAssignmentV1) => {
    try {
      workerCheckInWarranty(currentWorkerId, assignment.id);
      setToastMessage("Check-in berhasil! Anda telah tiba di lokasi pelanggan.");
      setTimeout(() => setToastMessage(null), 3500);
      setStatusChip("PEMERIKSAAN");
    } catch (err: any) {
      alert(err.message || "Gagal melakukan check-in.");
    }
  };

  const handleStartInspection = (assignmentId: string) => {
    setInspectingAssignmentIds((prev) => [...prev, assignmentId]);
    setToastMessage("Pemeriksaan fisik unit selesai! Silakan lanjutkan ke pengisian Diagnosis teknis.");
    setTimeout(() => setToastMessage(null), 3500);
    setStatusChip("DIAGNOSIS");
  };

  const handleStartRepair = (assignment: WarrantyAssignmentV1) => {
    try {
      workerStartWarrantyHandling(currentWorkerId, assignment.id);
      setToastMessage("Pengerjaan perbaikan resmi dimulai! Silakan lakukan tindakan perbaikan.");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || "Gagal memulai pengerjaan.");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEvidencePhotos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEvidenceVideos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const addSamplePhoto = () => {
    const samples = [
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
    ];
    const picked = samples[evidencePhotos.length % samples.length];
    setEvidencePhotos((prev) => [...prev, picked]);
  };

  const addSampleVideo = () => {
    const sampleVideoUrl =
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
    setEvidenceVideos((prev) => [...prev, sampleVideoUrl]);
  };

  const removePhoto = (index: number) => {
    setEvidencePhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setEvidenceVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitDiagnosis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    if (!findings.trim() || !diagnosisText.trim() || !recommendedAction.trim()) {
      alert("Harap lengkapi seluruh temuan, diagnosa, dan tindakan yang disarankan.");
      return;
    }
    try {
      workerSubmitWarrantyDiagnosis(currentWorkerId, selectedAssignment.warrantyClaimId, {
        findings,
        diagnosis: diagnosisText,
        condition,
        recommendedAction,
        requiredMaterial: requiredMaterial || undefined,
        evidence: evidencePhotos,
        evidenceVideos: evidenceVideos.length > 0 ? evidenceVideos : undefined,
        technicalNotes: technicalNotes || undefined,
      });
      setIsDiagnosisModalOpen(false);
      setFindings("");
      setDiagnosisText("");
      setRecommendedAction("");
      setRequiredMaterial("");
      setTechnicalNotes("");
      setEvidencePhotos([
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
      ]);
      setEvidenceVideos([]);
      setToastMessage("Laporan diagnosis teknis beserta foto & video berhasil diserahkan ke Provider!");
      setTimeout(() => setToastMessage(null), 3500);
      setStatusChip("MENUNGGU_PROVIDER");
    } catch (err: any) {
      alert(err.message || "Gagal menyerahkan diagnosis.");
    }
  };

  const handleRecommendPaidWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    try {
      workerRecommendPaidWork(currentWorkerId, selectedAssignment.warrantyClaimId, {
        findingSummary: findingSummary || "Komponen mengalami kerusakan akibat pemakaian atau lonjakan daya di luar jaminan garansi.",
        recommendedWork: recommendedWork || "Penggantian unit kapasitor & servis jalur freon.",
        recommendedMaterial: recommendedMaterial || "Kapasitor 35uF + Freon R32 1 Tabung",
        estimatedDuration: Number(estimatedDuration) || 60,
        evidence: evidencePhotos,
      });
      setIsPaidRecModalOpen(false);
      setFindingSummary("");
      setRecommendedWork("");
      setRecommendedMaterial("");
      setToastMessage("Rekomendasi teknis pekerjaan berbayar berhasil diajukan ke Provider!");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || "Gagal mengajukan rekomendasi berbayar.");
    }
  };

  const handleSubmitProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    try {
      workerSubmitCompletionProof(currentWorkerId, selectedAssignment.warrantyClaimId, {
        summary: proofSummary || "Pekerjaan perbaikan selesai dilaksanakan dan unit telah diuji coba berfungsi normal.",
        notes: proofNotes || "Tekanan freon normal 150 PSI, arus kompresor 3.2A.",
        evidenceBefore,
        evidenceAfter,
      });
      setIsProofModalOpen(false);
      setProofSummary("");
      setProofNotes("");
      setToastMessage("Bukti perbaikan berhasil diunggah! Pengerjaan selesai.");
      setTimeout(() => setToastMessage(null), 3500);
      setStatusChip("SELESAI");
    } catch (err: any) {
      alert(err.message || "Gagal mengirimkan bukti perbaikan.");
    }
  };

  return (
    <div className="space-y-6 font-body text-left pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm animate-fade-in">
          <CheckCircle size={20} weight="fill" className="text-emerald-300" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-white/70 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-display text-slate-900">Garansi (Warranty)</h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
              Operasional Teknisi
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Penugasan resmi inspeksi dan perbaikan garansi pengerjaan dari Mitra Provider.
          </p>
        </div>

        {/* Technician Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-2xs self-start sm:self-auto">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 shrink-0">
            <User size={16} className="text-[#0F4C81]" weight="bold" />
            <span>Teknisi Aktif:</span>
          </label>
          <select
            value={currentWorkerId}
            onChange={(e) => setCurrentWorkerId(e.target.value)}
            className="px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-slate-900 focus:bg-white"
          >
            {repo.workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.skills[0] || "Teknisi"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top-Level Tabs: [Tugas Garansi] [Riwayat Garansi] */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setTopTab("ACTIVE_TASKS")}
          className={`px-5 py-2.5 rounded-t-xl transition border-b-2 flex items-center gap-2 ${
            topTab === "ACTIVE_TASKS"
              ? "border-[#0F4C81] text-[#0F4C81] bg-blue-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Tugas Garansi</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
            {workerAssignments.filter((a) => getTaskCategory(a) !== "SELESAI").length}
          </span>
        </button>

        <button
          onClick={() => setTopTab("HISTORY")}
          className={`px-5 py-2.5 rounded-t-xl transition border-b-2 flex items-center gap-2 ${
            topTab === "HISTORY"
              ? "border-[#0F4C81] text-[#0F4C81] bg-blue-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Riwayat Garansi</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
            {workerAssignments.filter((a) => getTaskCategory(a) === "SELESAI").length}
          </span>
        </button>
      </div>

      {/* 10 Locked Status Chips Filter */}
      {topTab === "ACTIVE_TASKS" && (
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_CHIPS.map((chip) => {
            const count = getCategoryCount(chip.key);
            const isSelected = statusChip === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => setStatusChip(chip.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#0F4C81] text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sub-filter for Riwayat Garansi: [Semua] [Warranty Repair] [Paid Work] */}
      {topTab === "HISTORY" && (
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "ALL" as const, label: "Semua" },
            { key: "WARRANTY_REPAIR" as const, label: "Warranty Repair" },
            { key: "PAID_WORK" as const, label: "Paid Work" },
          ].map((item) => {
            const isSelected = historyFilter === item.key;
            const count = workerAssignments.filter((a) => {
              if (getTaskCategory(a) !== "SELESAI") return false;
              if (item.key === "ALL") return true;
              const paidProp = paidWorkProposalsV1.find((p) => p.warrantyClaimId === a.warrantyClaimId);
              const isPaid = Boolean(
                paidProp?.status === "CUSTOMER_APPROVED" || paidProp?.status === "PROPOSAL_SENT"
              );
              if (item.key === "PAID_WORK") return isPaid;
              if (item.key === "WARRANTY_REPAIR") return !isPaid;
              return true;
            }).length;

            return (
              <button
                key={item.key}
                onClick={() => setHistoryFilter(item.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#0F4C81] text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Search Input */}
      <div className="relative max-w-sm">
        <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari tugas, nomor klaim, atau pelanggan..."
          className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0F4C81]"
        />
      </div>

      {/* Task Cards List */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center bg-white space-y-2">
            <ShieldCheck size={36} className="mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">Tidak ada tugas garansi pada filter ini.</p>
            <p className="text-[11px] text-slate-400">
              Penugasan baru dari Provider akan muncul di sini secara otomatis.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssignments.map((assignment) => {
              const claim = claimsV1.find((c) => c.id === assignment.warrantyClaimId);
              const war = claim ? warrantiesV1.find((w) => w.id === claim.warrantyId) : null;
              const dx = diagnosesV1.find((d) => d.warrantyClaimId === assignment.warrantyClaimId);
              const paidProp = paidWorkProposalsV1.find((p) => p.warrantyClaimId === assignment.warrantyClaimId);
              const proof = completionProofsV1.find((p) => p.warrantyClaimId === assignment.warrantyClaimId);

              const category = getTaskCategory(assignment);

              // Header Badge & Status Title
              let badgeText = "WARRANTY";
              let badgeColor = "bg-sky-600";
              let statusLabel = "MENDATANG";
              let statusBg = "bg-slate-100 text-slate-700";

              if (category === "MENDATANG") {
                badgeText = "WARRANTY";
                badgeColor = "bg-sky-600";
                statusLabel = "MENDATANG";
                statusBg = "bg-slate-100 text-slate-700";
              } else if (category === "HARI_INI") {
                badgeText = "WARRANTY";
                badgeColor = "bg-sky-600";
                statusLabel = "HARI INI";
                statusBg = "bg-amber-100 text-amber-800 font-bold";
              } else if (category === "OTW") {
                badgeText = "WARRANTY";
                badgeColor = "bg-sky-600";
                statusLabel = "● OTW";
                statusBg = "bg-purple-100 text-purple-800 font-bold animate-pulse";
              } else if (category === "PEMERIKSAAN") {
                badgeText = "WARRANTY";
                badgeColor = "bg-sky-600";
                statusLabel = "PEMERIKSAAN";
                statusBg = "bg-blue-100 text-blue-800 font-bold";
              } else if (category === "DIAGNOSIS") {
                badgeText = "WARRANTY";
                badgeColor = "bg-sky-600";
                statusLabel = "DIAGNOSIS";
                statusBg = "bg-indigo-100 text-indigo-800 font-bold";
              } else if (category === "MENUNGGU_PROVIDER") {
                badgeText = "WARRANTY";
                badgeColor = "bg-sky-600";
                if (claim?.infoRequested) {
                  statusLabel = "⚠ INFORMASI TAMBAHAN";
                  statusBg = "bg-amber-100 text-amber-900 font-bold border border-amber-300";
                } else {
                  statusLabel = "MENUNGGU PROVIDER";
                  statusBg = "bg-purple-100 text-purple-800 font-bold";
                }
              } else if (category === "MENUNGGU_CUSTOMER") {
                badgeText = "PAID WORK";
                badgeColor = "bg-amber-600";
                statusLabel = "MENUNGGU CUSTOMER";
                statusBg = "bg-rose-100 text-rose-800 font-bold";
              } else if (category === "PENGERJAAN") {
                if (paidProp?.status === "CUSTOMER_APPROVED") {
                  badgeText = "PAID WORK";
                  badgeColor = "bg-amber-600";
                } else {
                  badgeText = "WARRANTY REPAIR";
                  badgeColor = "bg-emerald-600";
                }
                statusLabel = "PENGERJAAN";
                statusBg = "bg-emerald-100 text-emerald-800 font-bold";
              } else if (category === "SELESAI") {
                const isPaid = Boolean(paidProp?.status === "CUSTOMER_APPROVED");
                if (isPaid) {
                  badgeText = "PAID WORK";
                  badgeColor = "bg-amber-600";
                } else {
                  badgeText = "WARRANTY";
                  badgeColor = "bg-emerald-600";
                }
                statusLabel = "SELESAI";
                statusBg = "bg-emerald-100 text-emerald-800 font-bold";
              }

              return (
                <div
                  key={assignment.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header Badge & Right Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider text-white shadow-xs flex items-center gap-1 ${badgeColor}`}
                        >
                          <ShieldCheck size={14} weight="bold" />
                          <span>{badgeText}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {assignment.assignmentType}
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${statusBg}`}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Basic Info */}
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                        <span>{claim?.claimNumber || assignment.id}</span>
                        <span>&bull;</span>
                        <span>War #{war?.id || "WAR-2026-1001"}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 font-display mt-0.5">
                        {war?.serviceTitle || "AC Repair"}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Customer: <strong className="text-slate-800">{war?.customerName || "Budi Santoso"}</strong>
                      </p>
                      <p className="text-xs text-slate-500">
                        Provider: {war?.providerName || "PT Servio Mandiri Teknik"}
                      </p>
                    </div>

                    {/* Schedule & Location Box */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <CalendarCheck size={14} className="text-slate-500 shrink-0" />
                        <span>
                          {category === "HARI_INI" || category === "OTW" ? (
                            <>Hari ini • <strong>{assignment.scheduledStartTime}</strong></>
                          ) : (
                            <>Jadwal: <strong>{assignment.scheduledDate} • {assignment.scheduledStartTime}</strong></>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <MapPin size={14} className="text-slate-500 shrink-0" />
                        <span>Lokasi: {assignment.location}</span>
                      </div>
                    </div>

                    {/* CATEGORY SPECIFIC CARD CONTENT */}

                    {/* 2. MENDATANG */}
                    {category === "MENDATANG" && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <span className="font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Status</span>
                          <span className="font-bold text-slate-700 text-[11px]">TERJADWAL</span>
                        </div>
                        <div className="space-y-1 text-[11px] text-slate-700">
                          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                            <Check size={13} weight="bold" /> <span>Kamu ditugaskan</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                            <Check size={13} weight="bold" /> <span>Jadwal sudah dibuat</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3. HARI INI */}
                    {category === "HARI_INI" && (
                      <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-2">
                        <div className="flex items-center justify-between border-b border-amber-200/80 pb-1.5">
                          <span className="font-semibold text-amber-800 uppercase tracking-wide text-[10px]">Status</span>
                          <span className="font-bold text-amber-900 text-[11px]">SIAP DIMULAI</span>
                        </div>
                        <p className="text-[11px] text-amber-800">
                          Waktu penanganan telah tiba. Mulai penanganan untuk menuju lokasi pelanggan.
                        </p>
                      </div>
                    )}

                    {/* 4. OTW */}
                    {category === "OTW" && (
                      <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-2">
                        <p className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">Progress</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                          <div className="flex items-center gap-1 text-emerald-700 font-medium">
                            <Check size={12} weight="bold" /> <span>Ditugaskan</span>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-700 font-medium">
                            <Check size={12} weight="bold" /> <span>Terjadwal</span>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-700 font-medium">
                            <Check size={12} weight="bold" /> <span>Mulai Penanganan</span>
                          </div>
                          <div className="flex items-center gap-1 font-bold text-purple-800 animate-pulse">
                            <span>●</span> <span>OTW</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <span>○</span> <span>Check-in</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <span>○</span> <span>Pemeriksaan</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <span>○</span> <span>Diagnosis</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 5. PEMERIKSAAN */}
                    {category === "PEMERIKSAAN" && (
                      <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
                        <div className="flex items-center justify-between border-b border-blue-200/80 pb-1.5 text-[11px]">
                          <span className="font-semibold text-blue-900">Check-in</span>
                          <span className="font-bold text-blue-950">
                            {assignment.checkInAt
                              ? new Date(assignment.checkInAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
                              : "10:21 WIB"}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5 animate-pulse">
                          <span>●</span> Pemeriksaan sedang berjalan
                        </p>
                        <p className="text-[11px] text-blue-800">
                          Lakukan pengecekan fisik unit di lokasi sebelum lanjut ke pengisian diagnosis.
                        </p>
                      </div>
                    )}

                    {/* 6. DIAGNOSIS */}
                    {category === "DIAGNOSIS" && (
                      <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                          <Check size={13} weight="bold" /> <span>Pemeriksaan selesai</span>
                        </div>
                        <div className="text-[11px] space-y-0.5">
                          <span className="text-slate-500 font-medium">Temuan sementara</span>
                          <p className="font-bold text-slate-800">
                            {findings || assignment.notes?.replace(/^Diagnosis:\s*/i, "") || "Kompresor tidak bekerja normal"}
                          </p>
                        </div>
                        <p className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5 animate-pulse pt-1 border-t border-indigo-100">
                          <span>●</span> Sedang mengisi diagnosis
                        </p>
                      </div>
                    )}

                    {/* 7. MENUNGGU PROVIDER */}
                    {category === "MENUNGGU_PROVIDER" && (
                      <div className="space-y-2">
                        {claim?.infoRequested ? (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1.5">
                            <div className="flex items-center gap-2 font-bold text-amber-900">
                              <Warning size={16} weight="fill" className="text-amber-600" />
                              <span>⚠ INFORMASI TAMBAHAN</span>
                            </div>
                            <p className="text-[11px] text-slate-700">
                              Provider meminta tambahan bukti:{" "}
                              <em>"{claim.infoRequestedNotes || "Tambahkan foto unit indoor."}"</em>
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200 text-xs space-y-2">
                            <div className="space-y-1 text-[11px] text-purple-950">
                              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                <Check size={13} weight="bold" /> <span>Pemeriksaan selesai</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                <Check size={13} weight="bold" /> <span>Diagnosis dikirim</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                <Check size={13} weight="bold" /> <span>Bukti dikirim</span>
                              </div>
                            </div>
                            <p className="text-[11px] text-purple-800 font-semibold pt-1 border-t border-purple-100">
                              Menunggu keputusan Provider
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 8. MENUNGGU CUSTOMER */}
                    {category === "MENUNGGU_CUSTOMER" && (
                      <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 text-xs space-y-2">
                        <div className="space-y-1 text-slate-800">
                          <p className="text-[11px]">
                            <span className="text-slate-500">Alasan</span>: <strong>Di luar cakupan garansi</strong>
                          </p>
                          <p className="text-[11px]">
                            <span className="text-slate-500">Nilai pekerjaan</span>: <strong>{formatRupiah(paidProp?.totalAmount || 505000)}</strong>
                          </p>
                          <p className="text-[11px] text-rose-700 font-semibold">
                            ● Menunggu persetujuan Customer
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-rose-100/80 border border-rose-300 text-rose-900 font-bold text-[11px] flex items-center gap-1.5">
                          <Warning size={14} weight="fill" className="text-rose-600 shrink-0" />
                          <span>⚠ Belum dapat dikerjakan</span>
                        </div>
                      </div>
                    )}

                    {/* 9. PENGERJAAN */}
                    {category === "PENGERJAAN" && (
                      <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-2">
                        {paidProp?.status === "CUSTOMER_APPROVED" ? (
                          <div className="space-y-1 text-slate-800 text-[11px]">
                            <p>
                              <span className="text-slate-500">Total:</span> <strong>{formatRupiah(paidProp.totalAmount || 505000)}</strong>
                            </p>
                            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                              <Check size={13} weight="bold" /> <span>Customer menyetujui</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                              <Check size={13} weight="bold" /> <span>Paid Work Order tersedia</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1 text-slate-800 text-[11px]">
                            <p>
                              <span className="text-slate-500">Perbaikan:</span> <strong>{claim?.reason || "Penggantian Kompresor"}</strong>
                            </p>
                            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                              <Check size={13} weight="bold" /> <span>Provider menyetujui Warranty Repair</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                              <Check size={13} weight="bold" /> <span>Repair Assignment tersedia</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 10. SELESAI */}
                    {category === "SELESAI" && (
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                        <div className="space-y-1 text-[11px] text-emerald-950">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                            <Check size={13} weight="bold" /> <span>Pengerjaan selesai</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                            <Check size={13} weight="bold" /> <span>Bukti perbaikan dikirim</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 pt-1 border-t border-emerald-100">
                          Selesai:{" "}
                          <strong>
                            {assignment.completedAt
                              ? new Date(assignment.completedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
                                " • " +
                                new Date(assignment.completedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                              : "27 Sep 2026 • 16:20"}
                          </strong>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions according to lifecycle and active tab */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    {/* Common [Lihat Detail] */}
                    <button
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setDetailSubTab("SUMMARY");
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Lihat Detail
                    </button>

                    {/* RULE: If in Tab SEMUA, NO OTHER ACTIONS. "Tidak ada action khusus di tab ini selain membuka detail." */}
                    {statusChip !== "ALL" && (
                      <>
                        {/* 2. MENDATANG: Tidak ada tombol mulai */}

                        {/* 3. HARI INI: [▶ Mulai Penanganan] */}
                        {category === "HARI_INI" && (
                          <button
                            onClick={() => handleStartHandling(assignment)}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition shadow-xs flex items-center gap-1.5"
                          >
                            <Play size={14} weight="fill" />
                            <span>Mulai Penanganan</span>
                          </button>
                        )}

                        {/* 4. OTW: [Check-in di Lokasi] */}
                        {category === "OTW" && (
                          <button
                            onClick={() => handleCheckIn(assignment)}
                            className="px-3.5 py-1.5 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition shadow-xs flex items-center gap-1.5"
                          >
                            <MapPin size={15} weight="bold" />
                            <span>Check-in di Lokasi</span>
                          </button>
                        )}

                        {/* 5. PEMERIKSAAN: [Mulai Pemeriksaan] */}
                        {category === "PEMERIKSAAN" && (
                          <button
                            onClick={() => handleStartInspection(assignment.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition shadow-xs flex items-center gap-1.5"
                          >
                            <MagnifyingGlass size={15} weight="bold" />
                            <span>Mulai Pemeriksaan</span>
                          </button>
                        )}

                        {/* 6. DIAGNOSIS: [Lanjutkan Diagnosis] */}
                        {category === "DIAGNOSIS" && (
                          <button
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              if (dx) {
                                setFindings(dx.findings);
                                setDiagnosisText(dx.diagnosis);
                                setCondition(dx.condition);
                                setRecommendedAction(dx.recommendedAction);
                                setRequiredMaterial(dx.requiredMaterial || "");
                                setTechnicalNotes(dx.technicalNotes || "");
                                setEvidencePhotos(
                                  dx.evidence && dx.evidence.length > 0
                                    ? dx.evidence
                                    : [
                                        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
                                      ]
                                );
                                setEvidenceVideos(
                                  dx.evidenceVideos && dx.evidenceVideos.length > 0 ? dx.evidenceVideos : []
                                );
                              } else {
                                setFindings("");
                                setDiagnosisText("");
                                setCondition("Kondisi aus wajar akibat penggunaan");
                                setRecommendedAction("");
                                setRequiredMaterial("");
                                setTechnicalNotes("");
                                setEvidencePhotos([
                                  "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
                                ]);
                                setEvidenceVideos([]);
                              }
                              setIsDiagnosisModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-700 text-white text-xs font-bold hover:bg-indigo-800 transition shadow-xs flex items-center gap-1.5"
                          >
                            <FileText size={15} weight="bold" />
                            <span>Lanjutkan Diagnosis</span>
                          </button>
                        )}

                        {/* 7. MENUNGGU PROVIDER: [Update Diagnosis] / [Lihat Diagnosis] */}
                        {category === "MENUNGGU_PROVIDER" && (
                          <>
                            {claim?.infoRequested ? (
                              <button
                                onClick={() => {
                                  setSelectedAssignment(assignment);
                                  if (dx) {
                                    setFindings(dx.findings);
                                    setDiagnosisText(dx.diagnosis);
                                    setCondition(dx.condition);
                                    setRecommendedAction(dx.recommendedAction);
                                    setRequiredMaterial(dx.requiredMaterial || "");
                                    setTechnicalNotes(dx.technicalNotes || "");
                                    setEvidencePhotos(
                                      dx.evidence && dx.evidence.length > 0
                                        ? dx.evidence
                                        : [
                                            "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
                                          ]
                                    );
                                    setEvidenceVideos(
                                      dx.evidenceVideos && dx.evidenceVideos.length > 0
                                        ? dx.evidenceVideos
                                        : []
                                    );
                                  } else {
                                    setFindings("");
                                    setDiagnosisText("");
                                    setCondition("Kondisi aus wajar akibat penggunaan");
                                    setRecommendedAction("");
                                    setRequiredMaterial("");
                                    setTechnicalNotes("");
                                    setEvidencePhotos([
                                      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
                                    ]);
                                    setEvidenceVideos([]);
                                  }
                                  setIsDiagnosisModalOpen(true);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition shadow-xs flex items-center gap-1.5"
                              >
                                <Warning size={14} weight="bold" />
                                <span>Update Diagnosis</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedAssignment(assignment);
                                  setDetailSubTab("DIAGNOSIS");
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition shadow-xs flex items-center gap-1.5"
                              >
                                <FileText size={15} weight="bold" />
                                <span>Lihat Diagnosis</span>
                              </button>
                            )}
                          </>
                        )}

                        {/* 8. MENUNGGU CUSTOMER: [Lihat Proposal] */}
                        {category === "MENUNGGU_CUSTOMER" && (
                          <button
                            onClick={() => {
                              setSelectedProposalForView(paidProp || null);
                              setIsViewProposalModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition shadow-xs flex items-center gap-1.5"
                          >
                            <FileText size={15} weight="bold" />
                            <span>Lihat Proposal</span>
                          </button>
                        )}

                        {/* 9. PENGERJAAN: [Mulai Pengerjaan] or [Upload Bukti] */}
                        {category === "PENGERJAAN" && (
                          <>
                            {assignment.status === "SCHEDULED" ? (
                              <button
                                onClick={() => handleStartRepair(assignment)}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition shadow-xs flex items-center gap-1.5"
                              >
                                <Play size={14} weight="fill" />
                                <span>Mulai Pengerjaan</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedAssignment(assignment);
                                  setIsProofModalOpen(true);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition shadow-xs flex items-center gap-1.5"
                              >
                                <UploadSimple size={15} weight="bold" />
                                <span>Upload Bukti {paidProp?.status === "CUSTOMER_APPROVED" ? "Selesai" : "Perbaikan"}</span>
                              </button>
                            )}
                          </>
                        )}

                        {/* 10. SELESAI / HISTORY: [Lihat Riwayat] */}
                        {(category === "SELESAI" || topTab === "HISTORY") && (
                          <button
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setDetailSubTab(proof ? "EVIDENCE" : "TIMELINE");
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition shadow-xs flex items-center gap-1.5"
                          >
                            <FileText size={15} weight="bold" />
                            <span>Lihat Riwayat</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL MODAL: [Ringkasan] [Timeline] [Diagnosis] [Bukti] (Section 53) */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-rose-600 text-white">
                  WARRANTY TASK
                </span>
                <h3 className="text-base font-bold text-slate-900 font-display mt-1">
                  Detail Tugas Garansi #{selectedAssignment.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 text-xs font-semibold">
              {(["SUMMARY", "TIMELINE", "DIAGNOSIS", "EVIDENCE"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailSubTab(tab)}
                  className={`px-3 py-1.5 rounded-t-lg transition border-b-2 ${
                    detailSubTab === tab
                      ? "border-[#0F4C81] text-[#0F4C81] font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab === "SUMMARY" && "Ringkasan"}
                  {tab === "TIMELINE" && "Timeline"}
                  {tab === "DIAGNOSIS" && "Diagnosis"}
                  {tab === "EVIDENCE" && "Bukti"}
                </button>
              ))}
            </div>

            {detailSubTab === "SUMMARY" && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400">Jadwal:</span>
                    <p className="font-bold text-slate-900">
                      {selectedAssignment.scheduledDate} {selectedAssignment.scheduledStartTime}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Tipe Tugas:</span>
                    <p className="font-bold text-slate-900">{selectedAssignment.assignmentType}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Status Tugas:</span>
                    <p className="font-bold text-slate-900">{selectedAssignment.status}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Lokasi:</span>
                    <p className="font-bold text-slate-900">{selectedAssignment.location}</p>
                  </div>
                </div>
              </div>
            )}

            {detailSubTab === "TIMELINE" && (() => {
              const claim = claimsV1.find((c) => c.id === selectedAssignment.warrantyClaimId);
              const dx = diagnosesV1.find((d) => d.warrantyClaimId === selectedAssignment.warrantyClaimId);
              const proof = completionProofsV1.find((p) => p.warrantyClaimId === selectedAssignment.warrantyClaimId);

              const workerStages = [
                { id: 1, name: "CLAIM MASUK", done: true },
                { id: 2, name: "TEKNISI DITUGASKAN", done: true },
                { id: 3, name: "JADWAL DITENTUKAN", done: !!selectedAssignment.scheduledDate },
                { id: 4, name: "MENDATANG", done: true },
                { id: 5, name: "CHECK-IN", done: !!selectedAssignment.checkInAt || !!selectedAssignment.startedAt || selectedAssignment.status === "IN_PROGRESS" || !!dx || !!proof },
                { id: 6, name: "SEDANG DIKERJAKAN", done: selectedAssignment.status === "IN_PROGRESS" || !!dx || !!proof },
                { id: 7, name: "PEMERIKSAAN", done: !!selectedAssignment.checkInAt || !!selectedAssignment.startedAt || !!dx || !!proof },
                { id: 8, name: "DIAGNOSIS", done: !!dx },
                { id: 9, name: "LAPORAN DIKIRIM", done: !!dx || claim?.status === "DIAGNOSIS_SUBMITTED" || claim?.status === "WAITING_PROVIDER_DECISION" },
                { id: 10, name: "MENUNGGU PROVIDER", done: claim?.status === "WAITING_PROVIDER_DECISION" || !!claim?.coverageDecision },
                { id: 11, name: "KEPUTUSAN PROVIDER", done: !!claim?.coverageDecision },
                { id: 12, name: "REPAIR", done: claim?.status === "REPAIR_SCHEDULED" || claim?.status === "REPAIR_IN_PROGRESS" || !!proof },
                { id: 13, name: "COMPLETION", done: !!proof || claim?.status === "RESOLVED" },
              ];

              return (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                      Alur Siklus Tugas Teknisi (13 Tahap)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {workerStages.map((st) => (
                        <div
                          key={st.id}
                          className={`p-2 rounded-xl border flex items-center gap-2 ${
                            st.done ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold" : "bg-white border-slate-200 text-slate-400"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            st.done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                          }`}>
                            {st.done ? "✓" : st.id}
                          </span>
                          <span className="text-[10px] leading-tight">{st.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                      Riwayat Aktivitas Log
                    </span>
                    {repo.getWarrantyTimeline(
                      claim?.warrantyId || "",
                      "WORKER"
                    ).map((evt) => (
                      <div key={evt.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-1">
                        <div className="flex justify-between items-center">
                          <strong className="text-slate-900">{evt.title}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(evt.timestamp).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <p className="text-slate-600">{evt.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {detailSubTab === "DIAGNOSIS" && (
              <div className="space-y-3 text-xs">
                {diagnosesV1.filter((d) => d.warrantyClaimId === selectedAssignment.warrantyClaimId).length === 0 ? (
                  <p className="text-slate-400 text-center py-4">Belum ada diagnosis yang diserahkan.</p>
                ) : (
                  diagnosesV1
                    .filter((d) => d.warrantyClaimId === selectedAssignment.warrantyClaimId)
                    .map((d) => (
                      <div key={d.id} className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-3">
                        <div className="space-y-1.5">
                          <p><strong>Temuan:</strong> {d.findings}</p>
                          <p><strong>Diagnosa:</strong> {d.diagnosis}</p>
                          <p><strong>Kondisi:</strong> {d.condition}</p>
                          <p><strong>Tindakan yang Disarankan:</strong> {d.recommendedAction}</p>
                          {d.requiredMaterial && <p><strong>Material:</strong> {d.requiredMaterial}</p>}
                          {d.technicalNotes && <p><strong>Catatan Teknis:</strong> {d.technicalNotes}</p>}
                        </div>

                        {/* Dokumentasi Bukti Foto & Video */}
                        <div className="pt-2 border-t border-purple-200/70 space-y-2">
                          <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                            Dokumentasi Bukti Diagnosis ({((d.evidence?.length || 0) + (d.evidenceVideos?.length || 0))} file)
                          </span>
                          
                          {d.evidence && d.evidence.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                                <ImageIcon size={13} weight="bold" /> Foto ({d.evidence.length})
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {d.evidence.map((photo, pIdx) => (
                                  <img
                                    key={pIdx}
                                    src={photo}
                                    alt={`Bukti Foto ${pIdx + 1}`}
                                    className="w-full h-24 object-cover rounded-xl border border-purple-200 shadow-2xs hover:opacity-95 transition"
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {d.evidenceVideos && d.evidenceVideos.length > 0 && (
                            <div>
                              <p className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                                <VideoCamera size={13} weight="bold" /> Video ({d.evidenceVideos.length})
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {d.evidenceVideos.map((video, vIdx) => (
                                  <div key={vIdx} className="rounded-xl overflow-hidden border border-purple-200 bg-black">
                                    <video
                                      src={video}
                                      controls
                                      className="w-full h-28 object-contain"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {detailSubTab === "EVIDENCE" && (() => {
              const dx = diagnosesV1.find((d) => d.warrantyClaimId === selectedAssignment.warrantyClaimId);
              const photos = dx?.evidence && dx.evidence.length > 0
                ? dx.evidence
                : [
                    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
                    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
                  ];
              const videos = dx?.evidenceVideos || [];

              return (
                <div className="space-y-4 text-xs">
                  <p className="text-slate-500">
                    Bukti visual foto dan video yang tercatat pada penanganan klaim garansi ini:
                  </p>

                  <div className="space-y-2">
                    <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-purple-600" weight="bold" />
                      <span>Dokumentasi Foto ({photos.length})</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {photos.map((imgSrc, idx) => (
                        <img
                          key={idx}
                          src={imgSrc}
                          alt={`Bukti Foto ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-xl border border-slate-200 shadow-2xs"
                        />
                      ))}
                    </div>
                  </div>

                  {videos.length > 0 ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <VideoCamera size={14} className="text-purple-600" weight="bold" />
                        <span>Dokumentasi Video ({videos.length})</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {videos.map((vidSrc, idx) => (
                          <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 bg-black">
                            <video
                              src={vidSrc}
                              controls
                              className="w-full h-32 object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-dashed border-slate-200 text-slate-400 text-center text-[11px]">
                      Belum ada video pemeriksaan yang diunggah untuk klaim ini.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: Submit Diagnosis (Section 55) */}
      {isDiagnosisModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Laporan Hasil Pemeriksaan / Diagnosis Teknis
              </h3>
              <p className="text-xs text-slate-500">
                Teknisi menyerahkan fakta teknis lapangan. Keputusan cakupan penjaminan ditetapkan sepenuhnya oleh Provider.
              </p>
            </div>

            <form onSubmit={handleSubmitDiagnosis} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Temuan Lapangan</label>
                <textarea
                  rows={2}
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="Contoh: Pipa evaporator berkarat ringan, kapasitor outdoor melemah..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Diagnosis Teknis</label>
                <textarea
                  rows={2}
                  value={diagnosisText}
                  onChange={(e) => setDiagnosisText(e.target.value)}
                  placeholder="Contoh: Kapasitor run motor aus menyebabkan kompresor overload..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kondisi Kerusakan</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                >
                  <option value="Kondisi aus wajar akibat penggunaan">Kondisi aus wajar akibat penggunaan</option>
                  <option value="Kegagalan komponen sebelumnya">Kegagalan komponen sebelumnya</option>
                  <option value="Faktor eksternal / lonjakan arus listrik">Faktor eksternal / lonjakan arus listrik</option>
                  <option value="Kerusakan lain di luar servis sebelumnya">Kerusakan lain di luar servis sebelumnya</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tindakan yang Disarankan</label>
                <input
                  type="text"
                  value={recommendedAction}
                  onChange={(e) => setRecommendedAction(e.target.value)}
                  placeholder="Contoh: Ganti kapasitor 35uF dan flashing pipa freon"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Material yang Diperlukan (Jika Ada)</label>
                <input
                  type="text"
                  value={requiredMaterial}
                  onChange={(e) => setRequiredMaterial(e.target.value)}
                  placeholder="Contoh: Kapasitor 35uF 450V"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Teknis Tambahan</label>
                <textarea
                  rows={2}
                  value={technicalNotes}
                  onChange={(e) => setTechnicalNotes(e.target.value)}
                  placeholder="Catatan parameter tegangan, freon, atau kondisi unit..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {/* SECTION: Upload Foto & Video Bukti Diagnosis */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-3.5">
                <div>
                  <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Camera size={15} className="text-purple-700" weight="bold" />
                    <span>Dokumentasi Foto & Video Pemeriksaan</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Unggah foto & video kondisi fisik kerusakan, komponen, atau unit untuk diverifikasi Provider.
                  </p>
                </div>

                {/* Sub-section: FOTO */}
                <div className="space-y-2 bg-white p-3 rounded-xl border border-purple-100/80">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-indigo-600" weight="bold" />
                      <span>Foto Bukti ({evidencePhotos.length})</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={addSamplePhoto}
                        className="px-2 py-1 text-[11px] font-semibold text-purple-700 bg-purple-100/70 hover:bg-purple-100 rounded-lg transition flex items-center gap-1"
                        title="Tambahkan foto sampel peralatan"
                      >
                        <Plus size={12} weight="bold" />
                        <span>+ Sampel Foto</span>
                      </button>
                      <label className="px-2.5 py-1 text-[11px] font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs">
                        <UploadSimple size={12} weight="bold" />
                        <span>Upload Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {evidencePhotos.length === 0 ? (
                    <div className="py-3 px-3 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-[11px]">
                      Belum ada foto yang ditambahkan. Gunakan <strong>Upload Foto</strong> atau <strong>+ Sampel Foto</strong>.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {evidencePhotos.map((photo, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 shadow-2xs">
                          <img
                            src={photo}
                            alt={`Foto ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-md hover:bg-red-700 transition opacity-80 group-hover:opacity-100 shadow-xs"
                            title="Hapus foto ini"
                          >
                            <Trash size={12} weight="bold" />
                          </button>
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white">
                            Foto {idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sub-section: VIDEO */}
                <div className="space-y-2 bg-white p-3 rounded-xl border border-purple-100/80">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                      <VideoCamera size={14} className="text-amber-600" weight="bold" />
                      <span>Video Bukti ({evidenceVideos.length})</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={addSampleVideo}
                        className="px-2 py-1 text-[11px] font-semibold text-amber-800 bg-amber-100/80 hover:bg-amber-100 rounded-lg transition flex items-center gap-1"
                        title="Tambahkan video sampel teknis"
                      >
                        <Plus size={12} weight="bold" />
                        <span>+ Sampel Video</span>
                      </button>
                      <label className="px-2.5 py-1 text-[11px] font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs">
                        <UploadSimple size={12} weight="bold" />
                        <span>Upload Video</span>
                        <input
                          type="file"
                          accept="video/*"
                          multiple
                          onChange={handleVideoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {evidenceVideos.length === 0 ? (
                    <div className="py-3 px-3 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-[11px]">
                      Belum ada video yang ditambahkan. Unggah video singkat suara / tes operasional unit (opsional namun disarankan).
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {evidenceVideos.map((video, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-black">
                          <video
                            src={video}
                            controls
                            className="w-full h-32 object-contain"
                          />
                          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/70 text-white">
                              Video {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeVideo(idx)}
                              className="p-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition shadow-xs"
                              title="Hapus video ini"
                            >
                              <Trash size={12} weight="bold" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDiagnosisModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setToastMessage("Draft diagnosis berhasil disimpan.");
                    setIsDiagnosisModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Simpan Draft
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-700 text-white font-bold hover:bg-purple-800 shadow-sm"
                >
                  Kirim Diagnosis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Paid Work Technical Recommendation (Section 21) */}
      {isPaidRecModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Rekomendasi Teknis Pekerjaan di Luar Garansi
              </h3>
              <p className="text-xs text-slate-500">
                Rekomendasi teknis teknisi bersifat non-final. Harga resmi pelanggan ditetapkan oleh Provider.
              </p>
            </div>

            <form onSubmit={handleRecommendPaidWork} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ringkasan Temuan</label>
                <textarea
                  rows={2}
                  value={findingSummary}
                  onChange={(e) => setFindingSummary(e.target.value)}
                  placeholder="Temuan kerusakan di luar lingkup garansi..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pekerjaan yang Disarankan</label>
                <input
                  type="text"
                  value={recommendedWork}
                  onChange={(e) => setRecommendedWork(e.target.value)}
                  placeholder="Contoh: Penggantian modul PCB dan motor blower"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Material / Suku Cadang</label>
                <input
                  type="text"
                  value={recommendedMaterial}
                  onChange={(e) => setRecommendedMaterial(e.target.value)}
                  placeholder="Contoh: Modul PCB Universal + Motor AC"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Estimasi Durasi (Menit)</label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaidRecModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700"
                >
                  Kirim Rekomendasi ke Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Completion Proof (Section 29) */}
      {isProofModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Unggah Bukti Hasil Perbaikan (Completion Proof)
              </h3>
              <p className="text-xs text-slate-500">
                Sertakan dokumentasi sebelum dan sesudah perbaikan untuk verifikasi penutupan klaim.
              </p>
            </div>

            <form onSubmit={handleSubmitProof} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ringkasan Pekerjaan Selesai</label>
                <textarea
                  rows={2}
                  value={proofSummary}
                  onChange={(e) => setProofSummary(e.target.value)}
                  placeholder="Perbaikan selesai dilaksanakan dan unit telah diuji coba berjalan normal..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Teknis Hasil Uji</label>
                <input
                  type="text"
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  placeholder="Contoh: Suhu hembusan 16°C, arus 3.1A stabil..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                <Camera size={20} className="text-slate-500" />
                <span className="text-slate-600 text-[11px]">2 foto dokumentasi terlampir otomatis.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProofModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800"
                >
                  Kirim Bukti ke Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Paid Work Proposal (Menunggu Customer) */}
      {isViewProposalModalOpen && selectedProposalForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-600 text-white">
                  PAID WORK PROPOSAL
                </span>
                <h3 className="text-base font-bold text-slate-900 font-display mt-1">
                  Proposal #{selectedProposalForView.id}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsViewProposalModalOpen(false);
                  setSelectedProposalForView(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Warning Callout for Worker: DO NOT WORK */}
            <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-1.5">
              <div className="flex items-center gap-2 font-black text-rose-700 uppercase tracking-wide text-[11px]">
                <Warning size={16} weight="fill" className="text-rose-600 shrink-0" />
                <span>Peringatan Keras Teknisi: Jangan Mulai Pekerjaan!</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-700">
                Pekerjaan ini berbayar dan berada di luar lingkup garansi. Proposal resmi telah diajukan Provider ke Customer. <strong>Teknisi tidak diizinkan melakukan pengerjaan fisik atau penggantian suku cadang apapun sebelum Customer menyetujui rincian biaya ini.</strong>
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Judul Usulan:</span>
                <p className="font-bold text-slate-900">{selectedProposalForView.title}</p>
                <p className="text-slate-600 text-[11px]">{selectedProposalForView.scope}</p>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1">
                <span className="text-amber-900 font-bold block text-[10px] uppercase">Alasan di Luar Garansi:</span>
                <p className="text-slate-700 text-[11px]">{selectedProposalForView.reasonOutsideWarranty}</p>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 text-[11px] grid grid-cols-12 gap-2">
                  <span className="col-span-6">Deskripsi Pekerjaan / Part</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-4 text-right">Subtotal</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {selectedProposalForView.lineItems.map((item, idx) => (
                    <div key={idx} className="px-3 py-2 text-[11px] grid grid-cols-12 gap-2 text-slate-700">
                      <span className="col-span-6 font-medium">{item.description}</span>
                      <span className="col-span-2 text-center text-slate-500">{item.quantity}x</span>
                      <span className="col-span-4 text-right font-semibold">{formatRupiah(item.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 p-3 border-t border-slate-200 space-y-1 text-right text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span>{formatRupiah(selectedProposalForView.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Biaya Platform:</span>
                    <span>{formatRupiah(selectedProposalForView.fees)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200 text-xs">
                    <span>Total Biaya Pelanggan:</span>
                    <span className="text-[#0F4C81]">{formatRupiah(selectedProposalForView.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {selectedProposalForView.notes && (
                <p className="text-[10px] text-slate-500 italic">
                  Catatan: {selectedProposalForView.notes}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsViewProposalModalOpen(false);
                  setSelectedProposalForView(null);
                }}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition"
              >
                Tutup Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
