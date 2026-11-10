"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Wrench,
  Clock,
  CheckCircle,
  MagnifyingGlass,
  Star,
  ChatCircleDots,
  ArrowsClockwise,
  Eye,
  Camera,
  X,
  ChartBar,
  Buildings,
  CalendarBlank,
  Play,
  FilePlus,
  Bank,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { useActiveRole } from "@/context/RoleContext";
import { WarrantyPresetManager } from "@/components/features/afterSales/WarrantyPresetManager";
import { AfterSalesCase, AfterSalesSolutionType } from "@/types/afterSales";
import {
  afterSalesApi,
  ReviewEntryDto,
  BusinessReviewSummary,
} from "@/lib/afterSalesApi";

type ProviderTab = "summary" | "settings" | "refunds" | "rework" | "reviews";

function ProviderAfterSalesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") as string | null;

  const resolveTab = (t: string | null): ProviderTab => {
    if (t === "settings") return "settings";
    if (t === "refund" || t === "refunds") return "refunds";
    if (t === "rework" || t === "claims") return "rework";
    return "summary";
  };

  const [activeTab, setActiveTab] = useState<ProviderTab>(resolveTab(rawTab));

  useEffect(() => {
    if (rawTab) {
      if (rawTab === "reviews") {
        router.replace("/provider/reviews");
      } else {
        setActiveTab(resolveTab(rawTab));
      }
    }
  }, [rawTab, router]);

  const [reviews, setReviews] = useState<ReviewEntryDto[]>([]);
  const [reviewSummary, setReviewSummary] = useState<BusinessReviewSummary | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"ALL" | "SERVICE" | "PROVIDER" | "UNREPLIED">("ALL");
  const [viewingReview, setViewingReview] = useState<ReviewEntryDto | null>(null);
  const [replyingReview, setReplyingReview] = useState<ReviewEntryDto | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const loadReviews = useCallback(async () => {
    setIsLoadingReviews(true);
    try {
      const res = await afterSalesApi.business.getReviews({ per_page: 50 });
      setReviews(Array.isArray(res.data) ? res.data : []);
      if (res.meta?.summary) {
        setReviewSummary(res.meta.summary);
      }
    } catch {
      // handled gracefully
    } finally {
      setIsLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingReview || !replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      await afterSalesApi.business.replyReview(replyingReview.id, {
        text: replyText.trim(),
      });
      setToastMsg("Tanggapan resmi mitra penyedia jasa berhasil dikirim.");
      setReplyingReview(null);
      setReplyText("");
      await loadReviews();
    } catch (err: unknown) {
      setToastMsg(err instanceof Error ? err.message : "Gagal membalas ulasan.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const { user } = useActiveRole();
  const {
    cases,
    warrantyPresets,
    activeOrgId: contextOrgId,
    providerApproveWarrantyJob,
    providerRejectClaim,
    merchantProposeAlternative,
    merchantRequestEvidence,
    merchantStartResolution,
    merchantCompleteCase,
    getMainStatusDisplay,
  } = useAfterSales();

  const [viewingDetailCase, setViewingDetailCase] = useState<AfterSalesCase | null>(null);

  const activeProviderOrgId = user?.organizationId || contextOrgId || "0740d857-b665-4191-aaf5-d7dd3611dc1d";

  const serviceClaims = cases.filter(
    (c) =>
      c.caseType === "claim_service" &&
      (c.organizationId === activeProviderOrgId || c.organizationType === "PROVIDER")
  );

  const isCaseRefund = (c: AfterSalesCase) => {
    if (c.approvedSolution) return c.approvedSolution === "REFUND";
    if (c.chosenSolution) return c.chosenSolution === "REFUND";
    if ((c as any).agreedSolution) return (c as any).agreedSolution === "REFUND";
    if ((c as any).agreed_solution) return (c as any).agreed_solution === "REFUND";
    return (
      c.customerRequestedSolution === "REFUND" ||
      (c as any).initial_solution === "REFUND" ||
      (c as any).initialSolution === "REFUND"
    );
  };

  const refundClaims = serviceClaims.filter(isCaseRefund);
  const reworkClaims = serviceClaims.filter((c) => !isCaseRefund(c));

  const activePresetsCount = warrantyPresets.filter(
    (p) =>
      (p.organizationId === activeProviderOrgId || p.organizationType === "PROVIDER") &&
      p.isActive
  ).length;

  const [searchQuery, setSearchQuery] = useState("");
  const [reworkStatusFilter, setReworkStatusFilter] = useState("ALL");
  const [refundStatusFilter, setRefundStatusFilter] = useState("ALL");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Approve Warranty Job Modal State
  const [approvingClaim, setApprovingClaim] = useState<AfterSalesCase | null>(null);
  const [workerName, setWorkerName] = useState("Ahmad Fauzi (Teknisi Senior)");
  const [scheduledDate, setScheduledDate] = useState("Besok, 13:00 - 15:00 WIB");
  const [jobNote, setJobNote] = useState("Flushing selang drainase dan reposisi talang air.");

  // Propose Alternative Modal State
  const [altClaim, setAltClaim] = useState<AfterSalesCase | null>(null);
  const [altSolution, setAltSolution] = useState<AfterSalesSolutionType>("REFUND");
  const [altReason, setAltReason] = useState("");

  // Request Evidence Modal State
  const [reqEvidenceClaim, setReqEvidenceClaim] = useState<AfterSalesCase | null>(null);
  const [reqEvidenceReason, setReqEvidenceReason] = useState("");

  // Complete Case Modal State
  const [completingClaim, setCompletingClaim] = useState<AfterSalesCase | null>(null);
  const [completionEvidenceRef, setCompletionEvidenceRef] = useState("");

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

  const handleAltSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!altClaim || !altReason.trim()) return;
    merchantProposeAlternative(altClaim.id, altSolution, altReason.trim());
    setToastMsg(`Solusi alternatif (${altSolution}) berhasil ditawarkan ke Customer untuk kasus #${altClaim.caseNumber}.`);
    setAltClaim(null);
    setAltReason("");
  };

  const handleRequestEvidenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqEvidenceClaim || !reqEvidenceReason.trim()) return;
    merchantRequestEvidence(reqEvidenceClaim.id, reqEvidenceReason.trim());
    setToastMsg(`Permintaan bukti tambahan untuk klaim #${reqEvidenceClaim.caseNumber} telah dikirim.`);
    setReqEvidenceClaim(null);
    setReqEvidenceReason("");
  };

  const handleStartResolution = (c: AfterSalesCase) => {
    merchantStartResolution(c.id);
    setToastMsg(`Eksekusi penyelesaian klaim jasa #${c.caseNumber} dimulai.`);
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingClaim || !completionEvidenceRef.trim()) return;
    merchantCompleteCase(completingClaim.id, completionEvidenceRef.trim());
    setToastMsg(`Klaim garansi jasa #${completingClaim.caseNumber} telah diselesaikan.`);
    setCompletingClaim(null);
    setCompletionEvidenceRef("");
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingClaim || !rejectionReason.trim()) return;
    providerRejectClaim(rejectingClaim.id, rejectionReason.trim());
    setToastMsg(`Klaim garansi #${rejectingClaim.caseNumber} telah ditolak dengan alasan tercatat.`);
    setRejectingClaim(null);
    setRejectionReason("");
  };

  // Computed KPI for P06
  const serviceReviews = reviews.filter((r) => r.target_type === "SERVICE" && r.status === "VISIBLE");
  const providerReviews = reviews.filter((r) => r.target_type === "PROVIDER" && r.status === "VISIBLE");
  const avgServiceRating =
    reviewSummary?.service_average_rating ??
    reviewSummary?.item_average_rating ??
    (serviceReviews.length > 0
      ? Number((serviceReviews.reduce((acc, r) => acc + r.rating, 0) / serviceReviews.length).toFixed(2))
      : 0);
  const totalServiceRatings = reviewSummary?.item_total_ratings ?? serviceReviews.length;
  const avgProviderRating =
    reviewSummary?.provider_average_rating ??
    reviewSummary?.business_average_rating ??
    (providerReviews.length > 0
      ? Number((providerReviews.reduce((acc, r) => acc + r.rating, 0) / providerReviews.length).toFixed(2))
      : 0);
  const totalProviderRatings = reviewSummary?.business_total_ratings ?? providerReviews.length;
  const totalAllReviews = reviewSummary?.total_reviews ?? reviews.length;
  const unrepliedCount =
    reviewSummary?.unreplied_count ?? reviews.filter((r) => !r.reply).length;

  const filteredReviews = reviews.filter((r) => {
    if (reviewFilter === "SERVICE") return r.target_type === "SERVICE";
    if (reviewFilter === "PROVIDER") return r.target_type === "PROVIDER";
    if (reviewFilter === "UNREPLIED") return !r.reply;
    return true;
  });

  const filteredRework = reworkClaims.filter((c) => {
    const matchesStatus = reworkStatusFilter === "ALL" || c.mainStatus === reworkStatusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.itemTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sourceOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredRefunds = refundClaims.filter((c) => {
    const matchesStatus = refundStatusFilter === "ALL" || c.mainStatus === refundStatusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.itemTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sourceOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const activeReworkCount = reworkClaims.filter(
    (c) => c.mainStatus !== "COMPLETED" && c.mainStatus !== "REJECTED" && c.mainStatus !== "CANCELLED"
  ).length;
  const activeRefundsCount = refundClaims.filter(
    (c) => c.mainStatus !== "COMPLETED" && c.mainStatus !== "REJECTED" && c.mainStatus !== "CANCELLED"
  ).length;
  const overdueClaimsCount = serviceClaims.filter((c) => c.isNoResponse).length;
  const inResolutionCount = serviceClaims.filter((c) => c.mainStatus === "IN_RESOLUTION").length;

  const switchTab = (tab: ProviderTab) => {
    setActiveTab(tab);
    router.push(`/provider/warranty?tab=${tab}`);
  };

  const renderClaimCard = (c: AfterSalesCase, isRefund: boolean) => {
    const statusBadge = getMainStatusDisplay(c.mainStatus);
    const isCompleted = c.mainStatus === "COMPLETED";
    const isRejected = c.mainStatus === "REJECTED";

    return (
      <div
        key={c.id}
        className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4 hover:border-slate-300 transition"
      >
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-mono font-bold text-xs ${isRefund ? "text-rose-700" : "text-purple-700"}`}>
                #{c.caseNumber}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-mono">Order #{c.sourceOrderNumber}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-700">Pelanggan: {c.customerName}</span>
            </div>
            <h3 className="font-bold text-base text-slate-900 mt-1">{c.itemTitle}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {c.isNoResponse && (
              <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-bold animate-pulse">
                TIDAK DITANGGAPI (+72h)
              </span>
            )}
            {c.specialCondition === "WAITING_CUSTOMER_APPROVAL" && (
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-800 rounded-full text-[10px] font-bold border border-indigo-200">
                Menunggu Persetujuan Customer
              </span>
            )}
            {c.specialCondition === "WAITING_CUSTOMER_INFO" && (
              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 rounded-full text-[10px] font-bold border border-amber-200">
                Menunggu Bukti Customer
              </span>
            )}
            {c.slaDeadlineAt && (c.mainStatus === "SUBMITTED" || c.mainStatus === "UNDER_REVIEW") && (
              <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-mono font-bold border border-rose-200">
                SLA: {new Date(c.slaDeadlineAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.color}`}>
              {statusBadge.label} ({c.mainStatus})
            </span>
          </div>
        </div>

        {/* RINCIAN FORMULIR PENGAJUAN GARANSI (COMPACT SEPERTI PELANGGAN) */}
        <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 text-xs space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold uppercase tracking-wider">Solusi yang Diharapkan:</span>
              <strong className={isRefund ? "text-rose-700 font-bold" : "text-purple-700 font-bold"}>
                {isRefund ? "Pengembalian Dana (Refund ke S-Pay)" : "Perbaikan Ulang Teknisi (Rework Rp 0)"}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold uppercase tracking-wider">Alasan Masalah yang Dialami:</span>
              <span className="font-bold text-slate-800">{c.issueReason || "Kendala fungsional pasca servis"}</span>
            </div>
          </div>

          {c.issueDescription && (
            <div className="pt-0.5">
              <span className="text-slate-400 text-[10px] block font-semibold uppercase tracking-wider">Kronologi Keluhan:</span>
              <p className="text-slate-700 italic bg-white p-2 rounded-xl border border-slate-200/60 text-[11px] mt-0.5 leading-relaxed line-clamp-2">
                &ldquo;{c.issueDescription}&rdquo;
              </p>
            </div>
          )}

          {c.evidenceMedia && c.evidenceMedia.length > 0 && (
            <div className="pt-0.5 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <Camera size={13} className="text-purple-600" />
                <span>{c.evidenceMedia.length} Foto Bukti Pelanggan Terlampir</span>
              </span>
              <button
                type="button"
                onClick={() => setViewingDetailCase(c)}
                className="text-[10px] text-purple-700 hover:underline font-bold cursor-pointer"
              >
                Lihat Foto di Detail Lengkap &rarr;
              </button>
            </div>
          )}

          {c.rejectionReason && (
            <div className="p-2 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-[11px]">
              <strong>Catatan Penolakan:</strong> {c.rejectionReason}
            </div>
          )}
        </div>

        {/* SECTION 3: VISUAL TIMELINE RESOLUSI */}
        {isRefund ? (
          <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-200/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-rose-900">
              <span className="flex items-center gap-1.5">
                <Bank size={14} weight="bold" className="text-rose-600" />
                Alur Penyelesaian Refund Jasa:
              </span>
              <span className="text-rose-700 font-mono">
                {isCompleted ? "Refund Selesai" : isRejected ? "Ditolak" : "Berjalan"}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[9px] font-bold">
              <div className="space-y-0.5">
                <div className="h-1.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-800">1. Diajukan</span>
              </div>
              <div className="space-y-0.5">
                <div className={`h-1.5 rounded-full ${c.mainStatus !== "SUBMITTED" ? "bg-emerald-500" : "bg-slate-200"}`} />
                <span className={c.mainStatus !== "SUBMITTED" ? "text-emerald-800" : "text-slate-400"}>2. Persetujuan Mitra</span>
              </div>
              <div className="space-y-0.5">
                <div className={`h-1.5 rounded-full ${c.mainStatus === "IN_RESOLUTION" ? "bg-rose-600 animate-pulse" : isCompleted ? "bg-emerald-500" : "bg-slate-200"}`} />
                <span className={c.mainStatus === "IN_RESOLUTION" ? "text-rose-700" : isCompleted ? "text-emerald-800" : "text-slate-400"}>3. Pencairan Dana</span>
              </div>
              <div className="space-y-0.5">
                <div className={`h-1.5 rounded-full ${isCompleted ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-slate-200"}`} />
                <span className={isCompleted ? "text-emerald-800" : isRejected ? "text-rose-700" : "text-slate-400"}>{isRejected ? "Ditolak" : "4. Selesai"}</span>
              </div>
            </div>
          </div>
        ) : (
          (() => {
            const opStatus: string = c.warrantyJob?.operationalStatus || (isCompleted ? "DONE" : "ASSIGNED");
            const isAssigned = c.mainStatus !== "SUBMITTED";
            const isAccepted = isCompleted || opStatus === "ACCEPTED" || opStatus === "OTW" || opStatus === "IN_PROGRESS" || opStatus === "DONE";
            const isOtw = isCompleted || opStatus === "OTW" || opStatus === "IN_PROGRESS" || opStatus === "DONE";
            const isWorking = isCompleted || opStatus === "IN_PROGRESS" || opStatus === "DONE";

            return (
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                  <span className="flex items-center gap-1.5">
                    <Wrench size={14} weight="bold" className="text-purple-600" />
                    Alur Pengerjaan Ulang Teknisi (Rework Rp 0):
                  </span>
                  <span className="text-purple-700 font-mono">
                    {isCompleted ? "Pengerjaan Selesai" : isRejected ? "Ditolak" : opStatus === "IN_PROGRESS" ? "Sedang Dikerjakan" : opStatus === "OTW" ? "Teknisi OTW" : "Berjalan"}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1 text-center text-[8.5px] font-bold">
                  <div className="space-y-0.5">
                    <div className="h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-emerald-800">1. Diajukan</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className={`h-1.5 rounded-full ${isAssigned ? "bg-emerald-500" : "bg-slate-200"}`} />
                    <span className={isAssigned ? "text-emerald-800" : "text-slate-400"}>2. Ditugaskan</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className={`h-1.5 rounded-full ${isAccepted ? "bg-emerald-500" : opStatus === "ASSIGNED" ? "bg-blue-600 animate-pulse" : "bg-slate-200"}`} />
                    <span className={isAccepted ? "text-emerald-800" : opStatus === "ASSIGNED" ? "text-blue-700" : "text-slate-400"}>3. Terima</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className={`h-1.5 rounded-full ${isOtw ? "bg-emerald-500" : opStatus === "ACCEPTED" ? "bg-sky-600 animate-pulse" : "bg-slate-200"}`} />
                    <span className={isOtw ? "text-emerald-800" : opStatus === "ACCEPTED" ? "text-sky-700" : "text-slate-400"}>4. OTW</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className={`h-1.5 rounded-full ${isWorking ? "bg-emerald-500" : opStatus === "IN_PROGRESS" ? "bg-purple-600 animate-pulse" : "bg-slate-200"}`} />
                    <span className={isWorking ? "text-emerald-800" : opStatus === "IN_PROGRESS" ? "text-purple-700" : "text-slate-400"}>5. Pengerjaan</span>
                  </div>
                  <div className="space-y-0.5">
                    <div className={`h-1.5 rounded-full ${isCompleted ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-slate-200"}`} />
                    <span className={isCompleted ? "text-emerald-800" : isRejected ? "text-rose-700" : "text-slate-400"}>{isRejected ? "Ditolak" : "6. Selesai"}</span>
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* RINGKASAN PENUGASAN WORKER (COMPACT BAR SEPERTI PELANGGAN) */}
        {c.warrantyJob && (
          <div className="p-2.5 bg-white rounded-xl border border-purple-200 text-xs text-purple-950 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span>Teknisi: <strong className="text-slate-900">{c.warrantyJob.workerName || "Ahmad Fauzi (Teknisi Senior)"}</strong></span>
              <span className="text-slate-300">•</span>
              <span>Jadwal: <strong className="text-slate-900">{c.warrantyJob.scheduledDate || "Besok, 13:00 WIB"}</strong></span>
              <span className="text-slate-300">•</span>
              <span className="font-bold text-emerald-700">Biaya: Rp 0 (Garansi Resmi)</span>
            </div>

            {c.warrantyJob.completionEvidence && (isCompleted || c.warrantyJob.operationalStatus === "DONE") ? (
              <button
                type="button"
                onClick={() => setViewingDetailCase(c)}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold flex items-center gap-1 hover:bg-emerald-100 transition cursor-pointer"
              >
                <CheckCircle size={13} weight="bold" className="text-emerald-600" />
                <span>Bukti Selesai Tersimpan (Lihat Detail)</span>
              </button>
            ) : (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                c.warrantyJob.operationalStatus === "IN_PROGRESS"
                  ? "bg-purple-100 text-purple-800"
                  : c.warrantyJob.operationalStatus === "OTW"
                  ? "bg-sky-100 text-sky-800"
                  : c.warrantyJob.operationalStatus === "ACCEPTED"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {c.warrantyJob.operationalStatus === "IN_PROGRESS"
                  ? "Sedang Dikerjakan"
                  : c.warrantyJob.operationalStatus === "OTW"
                  ? "Teknisi OTW"
                  : c.warrantyJob.operationalStatus === "ACCEPTED"
                  ? "Tugas Diterima"
                  : "Menunggu Respon"}
              </span>
            )}
          </div>
        )}

        {/* SECTION 5: FOOTER ACTION BUTTONS */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Link
              href={`/chat?partner_id=${encodeURIComponent(c.customerId || "")}&partner_type=customer&partner_name=${encodeURIComponent(c.customerName || "Customer")}&ctx_type=warranty_jasa&ctx_id=${encodeURIComponent(c.id)}&ctx_title=${encodeURIComponent(c.itemTitle)}&ctx_summary=${encodeURIComponent(`Klaim Garansi #${c.caseNumber}`)}`}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <ChatCircleDots size={14} weight="bold" className="text-purple-700" />
              <span>Chat Pelanggan</span>
            </Link>
            <button
              type="button"
              onClick={() => setViewingDetailCase(c)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Eye size={14} weight="bold" />
              <span>Detail Lengkap</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(c.mainStatus === "SUBMITTED" || c.mainStatus === "UNDER_REVIEW") && (
              <>
                {isRefund ? (
                  <button
                    type="button"
                    onClick={() => {
                      merchantProposeAlternative(c.id, "REFUND", "Mitra menyetujui refund pengembalian dana kepada pelanggan.");
                      setToastMsg(`Pengembalian dana (Refund) disetujui untuk kasus #${c.caseNumber}.`);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bank size={14} weight="bold" />
                    <span>Setujui Refund Dana</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setApprovingClaim(c);
                      setJobNote(`Pengerjaan perbaikan garansi untuk masalah: ${c.issueReason}`);
                    }}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wrench size={14} weight="bold" />
                    <span>Setujui &amp; Tugaskan Teknisi (Rp0)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAltClaim(c);
                    setAltSolution(isRefund ? "REPAIR" : "REFUND");
                    setAltReason("");
                  }}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Tawarkan Alternatif
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReqEvidenceClaim(c);
                    setReqEvidenceReason("");
                  }}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Minta Bukti Tambahan
                </button>

                <button
                  type="button"
                  onClick={() => setRejectingClaim(c)}
                  className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Tolak dengan Alasan
                </button>
              </>
            )}

            {c.mainStatus === "IN_RESOLUTION" && (
              <>
                <button
                  type="button"
                  onClick={() => handleStartResolution(c)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Play size={13} weight="fill" />
                  <span>{isRefund ? "Proses Pengembalian Dana" : "Mulai Penyelesaian"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCompletingClaim(c);
                    setCompletionEvidenceRef("");
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle size={14} weight="bold" />
                  <span>{isRefund ? "Selesaikan Refund" : "Selesaikan Klaim"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white pb-24">
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                Dashboard Service Provider • After-Sales
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                PT Servio Mandiri Teknik
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold font-display text-slate-900 leading-tight">
              Layanan Purnajual, Garansi Jasa &amp; Ulasan Penyedia Jasa
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola opsi garansi pengerjaan layanan, tindak lanjuti klaim pengerjaan ulang (Rework Rp0), serta balas penilaian pelanggan.
            </p>
          </div>
        </div>

        {/* 4 Provider Tabs: Ringkasan, Pengaturan Garansi, Refund, Perbaikan Jasa */}
        <div className="flex items-center gap-1 sm:gap-2 -mb-px overflow-x-auto">
          <button
            type="button"
            onClick={() => switchTab("summary")}
            className={`pb-2.5 px-3.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
              activeTab === "summary"
                ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <ChartBar size={15} weight={activeTab === "summary" ? "fill" : "bold"} />
            <span>Ringkasan</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("settings")}
            className={`pb-2.5 px-3.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
              activeTab === "settings"
                ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <ShieldCheck size={15} weight={activeTab === "settings" ? "fill" : "bold"} />
            <span>Pengaturan Garansi</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("refunds")}
            className={`pb-2.5 px-3.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
              activeTab === "refunds"
                ? "border-rose-600 text-rose-600 font-extrabold bg-rose-50/40 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <Bank size={15} weight={activeTab === "refunds" ? "fill" : "bold"} />
            <span>Refund</span>
            {refundClaims.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                {refundClaims.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => switchTab("rework")}
            className={`pb-2.5 px-3.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
              activeTab === "rework"
                ? "border-purple-600 text-purple-600 font-extrabold bg-purple-50/40 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <Wrench size={15} weight={activeTab === "rework" ? "fill" : "bold"} />
            <span>Perbaikan Jasa</span>
            {reworkClaims.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-700 font-bold">
                {reworkClaims.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 py-3 space-y-3.5">
        {/* Live Service Indicator */}
        <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-medium flex flex-wrap items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">Pusat Garansi Jasa Terintegrasi</span>
            <span className="text-emerald-600 text-[11px]">• Microservice After-Sales (Port 8008) • Auto-Sync Aktif</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Real-Time Stream
            </span>
            <span className="text-[11px] font-mono text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
              SLA Respon: 72 Jam Kalender
            </span>
          </div>
        </div>

        {/* TAB 0: RINGKASAN (P03) */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => switchTab("rework")}
                className="p-4 bg-white rounded-2xl border border-slate-200/80 text-left hover:border-purple-400 transition cursor-pointer shadow-xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Perbaikan Jasa Aktif
                </span>
                <p className="text-2xl font-extrabold text-purple-700 mt-1">{activeReworkCount}</p>
                <span className="text-[11px] text-slate-500">Total {reworkClaims.length} tiket</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("refunds")}
                className="p-4 bg-white rounded-2xl border border-slate-200/80 text-left hover:border-rose-400 transition cursor-pointer shadow-xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Refund Jasa Aktif
                </span>
                <p className="text-2xl font-extrabold text-rose-600 mt-1">{activeRefundsCount}</p>
                <span className="text-[11px] text-slate-500">Total {refundClaims.length} tiket</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("rework")}
                className="p-4 bg-white rounded-2xl border border-amber-200 text-left hover:border-amber-400 transition cursor-pointer shadow-xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                  TIDAK DITANGGAPI
                </span>
                <p className="text-2xl font-extrabold text-amber-600 mt-1">{overdueClaimsCount}</p>
                <span className="text-[11px] text-amber-700">Lewat SLA 72 jam</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("rework")}
                className="p-4 bg-white rounded-2xl border border-indigo-200 text-left hover:border-indigo-400 transition cursor-pointer shadow-xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                  Dalam Penyelesaian
                </span>
                <p className="text-2xl font-extrabold text-indigo-600 mt-1">{inResolutionCount}</p>
                <span className="text-[11px] text-slate-500">Pengerjaan ulang / Refund</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("settings")}
                className="p-4 bg-white rounded-2xl border border-slate-200/80 text-left hover:border-emerald-400 transition cursor-pointer shadow-xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Opsi Garansi Aktif
                </span>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{activePresetsCount}</p>
                <span className="text-[11px] text-slate-500">Template garansi layanan</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/provider/reviews")}
                className="p-4 bg-white rounded-2xl border border-slate-200/80 text-left hover:border-amber-400 transition cursor-pointer shadow-xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ulasan Belum Dibalas
                </span>
                <p className="text-2xl font-extrabold text-amber-500 mt-1">{unrepliedCount}</p>
                <span className="text-[11px] text-slate-500">
                  Layanan ★ {totalServiceRatings > 0 ? Number(avgServiceRating).toFixed(1) : "—"} • Provider ★{" "}
                  {totalProviderRatings > 0 ? Number(avgProviderRating).toFixed(1) : "—"}
                </span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900">
                  Klaim Garansi Layanan Terbaru
                </h2>
                <button
                  type="button"
                  onClick={() => switchTab("rework")}
                  className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                >
                  Kelola Semua Klaim →
                </button>
              </div>
              {serviceClaims.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Belum ada pengajuan klaim garansi jasa yang masuk.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {serviceClaims.slice(0, 5).map((c) => {
                    const statusBadge = getMainStatusDisplay(c.mainStatus);
                    return (
                      <div
                        key={c.id}
                        className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-purple-700">#{c.caseNumber}</span>
                            <span className="text-slate-500">Order #{c.sourceOrderNumber}</span>
                          </div>
                          <p className="font-bold text-slate-900 mt-0.5">
                            {c.itemTitle} — <span className="font-normal text-slate-600">{c.customerName}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.isNoResponse && (
                            <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                              TIDAK DITANGGAPI
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => setViewingDetailCase(c)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] cursor-pointer"
                          >
                            Detail
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: PENGATURAN GARANSI LAYANAN (P01) */}
        {activeTab === "settings" && (
          <WarrantyPresetManager
            organizationId={activeProviderOrgId}
            organizationType="PROVIDER"
            title="Pengaturan Garansi Layanan Jasa"
            subtitle="Pilihan garansi ini akan muncul di dropdown saat Anda menambahkan atau mengedit layanan jasa di katalog."
          />
        )}

        {/* TAB 3: REFUND JASA */}
        {activeTab === "refunds" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Bank size={18} className="text-rose-600" />
                  <span>Daftar Permohonan Refund Jasa</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tindak lanjuti permohonan pengembalian dana dari pelanggan dengan persetujuan refund, tawaran perbaikan alternatif, atau penolakan beralasan.
                </p>
              </div>

              <div className="relative">
                <MagnifyingGlass size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor klaim / customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200"
                />
              </div>
            </div>

            {/* Sub-tab Status Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: "ALL", label: "Semua", count: refundClaims.length },
                { id: "SUBMITTED", label: "Menunggu Respon", count: refundClaims.filter((c) => c.mainStatus === "SUBMITTED").length },
                { id: "UNDER_REVIEW", label: "Ditinjau / Info", count: refundClaims.filter((c) => c.mainStatus === "UNDER_REVIEW").length },
                { id: "IN_RESOLUTION", label: "Proses Refund", count: refundClaims.filter((c) => c.mainStatus === "IN_RESOLUTION").length },
                { id: "COMPLETED", label: "Selesai", count: refundClaims.filter((c) => c.mainStatus === "COMPLETED").length },
                { id: "REJECTED", label: "Ditolak", count: refundClaims.filter((c) => c.mainStatus === "REJECTED").length },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setRefundStatusFilter(st.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    refundStatusFilter === st.id
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      refundStatusFilter === st.id
                        ? "bg-rose-800 text-rose-100"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              ))}
            </div>

            {filteredRefunds.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500">
                Belum ada permohonan refund jasa yang sesuai dengan filter.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRefunds.map((c) => renderClaimCard(c, true))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PERBAIKAN JASA (REWORK RP0) */}
        {activeTab === "rework" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Wrench size={18} className="text-purple-600" />
                  <span>Daftar Permohonan Perbaikan Jasa (Rework Rp0)</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tindak lanjuti klaim garansi servis dengan penugasan teknisi kunjungan servis ulang, tawaran alternatif, atau penolakan beralasan.
                </p>
              </div>

              <div className="relative">
                <MagnifyingGlass size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor klaim / customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200"
                />
              </div>
            </div>

            {/* Sub-tab Status Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: "ALL", label: "Semua", count: reworkClaims.length },
                { id: "SUBMITTED", label: "Menunggu Respon", count: reworkClaims.filter((c) => c.mainStatus === "SUBMITTED").length },
                { id: "UNDER_REVIEW", label: "Ditinjau / Info", count: reworkClaims.filter((c) => c.mainStatus === "UNDER_REVIEW").length },
                { id: "IN_RESOLUTION", label: "Sedang Dikerjakan", count: reworkClaims.filter((c) => c.mainStatus === "IN_RESOLUTION").length },
                { id: "COMPLETED", label: "Selesai", count: reworkClaims.filter((c) => c.mainStatus === "COMPLETED").length },
                { id: "REJECTED", label: "Ditolak", count: reworkClaims.filter((c) => c.mainStatus === "REJECTED").length },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setReworkStatusFilter(st.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    reworkStatusFilter === st.id
                      ? "bg-purple-700 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      reworkStatusFilter === st.id
                        ? "bg-purple-900 text-purple-100"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              ))}
            </div>

            {filteredRework.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500">
                Belum ada klaim perbaikan jasa yang sesuai dengan filter.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRework.map((c) => renderClaimCard(c, false))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RATING & ULASAN JASA & PROVIDER (P06) */}
        {activeTab === "reviews" && (
          <div className="space-y-4">
            {/* 4 KPI Cards (P06 Mandatory Amendment) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Rata-rata Kualitas Layanan
                  </span>
                  <Wrench size={16} weight="duotone" className="text-purple-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {avgServiceRating > 0 ? avgServiceRating.toFixed(1) : "0.0"}
                  </span>
                  <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                    <Star size={14} weight="fill" /> / 5.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Dari {totalServiceRatings} penilaian layanan (SERVICE)
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Rata-rata Penyedia Jasa
                  </span>
                  <Buildings size={16} weight="duotone" className="text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {avgProviderRating > 0 ? avgProviderRating.toFixed(1) : "0.0"}
                  </span>
                  <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                    <Star size={14} weight="fill" /> / 5.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Dari {totalProviderRatings} penilaian mitra (PROVIDER)
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Seluruh Ulasan
                  </span>
                  <Star size={16} weight="fill" className="text-amber-500" />
                </div>
                <p className="text-2xl font-extrabold text-slate-900">{totalAllReviews}</p>
                <p className="text-[11px] text-slate-500">
                  Tanpa rating terpisah untuk Worker / Teknisi
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Ulasan Belum Dibalas
                  </span>
                  <ChatCircleDots size={16} weight="duotone" className="text-amber-600" />
                </div>
                <p className="text-2xl font-extrabold text-amber-600">{unrepliedCount}</p>
                <p className="text-[11px] text-slate-500">
                  Maksimal 1 balasan resmi per entri ulasan
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "ALL", label: "Semua Ulasan" },
                    { id: "SERVICE", label: "Ulasan Layanan (SERVICE)" },
                    { id: "PROVIDER", label: "Ulasan Mitra (PROVIDER)" },
                    { id: "UNREPLIED", label: `Belum Dibalas (${unrepliedCount})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setReviewFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      reviewFilter === f.id
                        ? "bg-purple-700 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={loadReviews}
                disabled={isLoadingReviews}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowsClockwise size={14} className={isLoadingReviews ? "animate-spin" : ""} />
                <span>Muat Ulang</span>
              </button>
            </div>

            {isLoadingReviews ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-500">
                <Clock size={24} className="animate-spin text-purple-600 mx-auto mb-2" />
                <span>Memuat data ulasan layanan...</span>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-500">
                Belum ada rating atau ulasan pelanggan yang sesuai dengan filter ini.
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredReviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200/80 space-y-3 shadow-xs hover:border-purple-200 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              r.target_type === "SERVICE"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {r.target_type === "SERVICE" ? "Penilaian Layanan" : "Penilaian Mitra Provider"}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {r.customer_display_name || "Pelanggan Servio"}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            • Target: {r.target_id}
                          </span>
                          {r.source_order_id && (
                            <span className="text-[11px] font-mono text-slate-500">
                              • Order #{r.source_order_id}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                          {r.ordered_at && (
                            <span className="flex items-center gap-1">
                              <CalendarBlank size={12} />
                              Tanggal Order: {new Date(r.ordered_at).toLocaleDateString("id-ID")}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            Tanggal Ulasan:{" "}
                            {new Date(r.submitted_at || r.created_at).toLocaleDateString("id-ID")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            weight={s <= r.rating ? "fill" : "regular"}
                            className={s <= r.rating ? "text-amber-400" : "text-slate-300"}
                          />
                        ))}
                        <span className="text-xs font-bold text-slate-700 ml-1">
                          {r.rating}.0
                        </span>
                      </div>
                    </div>

                    {r.review_text ? (
                      <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                        {r.review_text}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Pelanggan memberikan rating bintang tanpa komentar tertulis.
                      </p>
                    )}

                    {r.media_refs && r.media_refs.length > 0 && (
                      <div className="flex gap-2">
                        {r.media_refs.map((m, mIdx) => (
                          <div key={mIdx} className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m} alt={`Bukti ${mIdx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    {r.reply && (
                      <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-purple-900 font-bold">
                          <span>Tanggapan Resmi Anda:</span>
                          <span className="text-[10px] text-purple-600 font-normal">
                            {new Date(r.reply.updated_at || r.reply.created_at).toLocaleDateString("id-ID")}
                          </span>
                        </div>
                        <p className="text-slate-700 italic">{r.reply.reply_text || r.reply.text}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setViewingReview(r)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={14} weight="bold" />
                        <span>Detail Ulasan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingReview(r);
                          setReplyText(r.reply?.reply_text || r.reply?.text || "");
                        }}
                        className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <ChatCircleDots size={14} />
                        <span>{r.reply ? "Edit Balasan Resmi" : "Balas Ulasan"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Detail Ulasan Provider (P06 Detail Card) */}
      <AnimatePresence>
        {viewingReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                    {viewingReview.target_type === "SERVICE" ? "Detail Ulasan Layanan" : "Detail Ulasan Mitra Provider"}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-1">
                    Ulasan dari {viewingReview.customer_display_name || "Pelanggan Servio"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingReview(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Penilaian</span>
                  <p className="font-bold text-slate-800">{viewingReview.target_type} • {viewingReview.target_id}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Nomor Pesanan</span>
                  <p className="font-mono font-bold text-slate-800">
                    {viewingReview.source_order_id || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tanggal Order</span>
                  <p className="font-semibold text-slate-700">
                    {viewingReview.ordered_at
                      ? new Date(viewingReview.ordered_at).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tanggal Ulasan</span>
                  <p className="font-semibold text-slate-700">
                    {new Date(viewingReview.submitted_at || viewingReview.created_at).toLocaleDateString(
                      "id-ID",
                      { day: "2-digit", month: "short", year: "numeric" }
                    )}
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/70 space-y-2 text-xs">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      weight={s <= viewingReview.rating ? "fill" : "regular"}
                      className={s <= viewingReview.rating ? "text-amber-400" : "text-slate-300"}
                    />
                  ))}
                  <span className="font-bold text-slate-900 ml-1">{viewingReview.rating}.0 / 5.0</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  {viewingReview.review_text || "Tidak ada komentar tertulis."}
                </p>
              </div>

              {viewingReview.reply && (
                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 text-xs space-y-1">
                  <span className="font-bold text-purple-900 block">Balasan Resmi Mitra:</span>
                  <p className="text-slate-700">
                    {viewingReview.reply.reply_text || viewingReview.reply.text}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingReview;
                    setViewingReview(null);
                    setReplyingReview(target);
                    setReplyText(target.reply?.reply_text || target.reply?.text || "");
                  }}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  {viewingReview.reply ? "Edit Balasan" : "Balas Ulasan"}
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReview(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <label className="font-bold text-slate-700 block mb-1">Instruksi &amp; Catatan Pengerjaan:</label>
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

      {/* Modal: Tawarkan Solusi Alternatif (PROPOSE_ALTERNATIVE) */}
      <AnimatePresence>
        {altClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900">
                Tawarkan Solusi Alternatif: #{altClaim.caseNumber}
              </h3>
              <p className="text-xs text-slate-600">
                Usulkan solusi alternatif kepada Customer (wajib mendapatkan persetujuan Customer).
              </p>
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
                  <label className="font-bold text-slate-700 block mb-1">Penjelasan &amp; Alasan Tawaran (Wajib):</label>
                  <textarea
                    rows={3}
                    required
                    value={altReason}
                    onChange={(e) => setAltReason(e.target.value)}
                    placeholder="Contoh: Karena jadwal teknisi penuh pada lokasi tersebut, kami menawarkan pengembalian dana..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
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

      {/* Modal: Minta Bukti Tambahan (REQUEST_EVIDENCE) */}
      <AnimatePresence>
        {reqEvidenceClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
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
                  <label className="font-bold text-slate-700 block mb-1">Rincian Bukti yang Diminta (Wajib):</label>
                  <textarea
                    rows={3}
                    required
                    value={reqEvidenceReason}
                    onChange={(e) => setReqEvidenceReason(e.target.value)}
                    placeholder="Contoh: Mohon unggah foto titik kebocoran pipa indoor dan indikator error pada unit AC..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
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
                    className="px-5 py-2 font-bold bg-amber-600 text-white rounded-xl shadow-sm"
                  >
                    Kirim Permintaan Bukti
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Selesaikan Klaim (completeCase) */}
      <AnimatePresence>
        {completingClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900">
                Selesaikan Klaim Garansi Jasa: #{completingClaim.caseNumber}
              </h3>
              <p className="text-xs text-slate-600">
                Masukkan referensi bukti penyelesaian otoritatif (mis. ID berita acara pengerjaan ulang atau referensi refund).
              </p>
              <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Referensi Bukti Penyelesaian (evidence_ref):</label>
                  <input
                    type="text"
                    required
                    value={completionEvidenceRef}
                    onChange={(e) => setCompletionEvidenceRef(e.target.value)}
                    placeholder="Contoh: BAST-REWORK-05B-9921"
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
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
                    className="px-5 py-2 font-bold bg-emerald-600 text-white rounded-xl shadow-sm"
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

      {/* Modal: Balas Ulasan Pelanggan */}
      <AnimatePresence>
        {replyingReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900">
                {replyingReview.reply ? "Edit Balasan Resmi Mitra Jasa" : "Balas Ulasan Pelanggan"}
              </h3>
              <p className="text-xs text-slate-600">
                Tanggapan Anda akan ditampilkan secara publik di bawah ulasan layanan. Gunakan bahasa yang profesional dan bertanggung jawab.
              </p>
              <form onSubmit={handleReplySubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggapan Mitra Jasa:</label>
                  <textarea
                    rows={4}
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Terima kasih atas kepercayaannya menggunakan layanan kami..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReplyingReview(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReply}
                    className="px-5 py-2 font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingReply ? "Mengirim..." : "Simpan Balasan"}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
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

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">Status Saat Ini</span>
                  <span className="font-bold text-slate-800">{viewingDetailCase.mainStatus}</span>
                  {viewingDetailCase.specialCondition && (
                    <span className="ml-2 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {viewingDetailCase.specialCondition}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">Tenggat SLA Tanggapan</span>
                  <span className="font-bold text-rose-600 font-mono">
                    {new Date(viewingDetailCase.slaDeadlineAt).toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">Solusi Diajukan Customer</span>
                  <span className="font-bold text-purple-700">
                    {viewingDetailCase.customerRequestedSolution || "REWORK"}
                  </span>
                </div>
              </div>

              {/* Stepper Timeline di Detail Modal */}
              {(() => {
                const isCaseRefund = viewingDetailCase.customerRequestedSolution === "REFUND" || viewingDetailCase.chosenSolution === "REFUND";
                const isCaseCompleted = viewingDetailCase.mainStatus === "COMPLETED";
                const isCaseRejected = viewingDetailCase.mainStatus === "REJECTED";
                const opStatus: string = viewingDetailCase.warrantyJob?.operationalStatus || (isCaseCompleted ? "DONE" : "ASSIGNED");
                const isAssigned = viewingDetailCase.mainStatus !== "SUBMITTED";
                const isAccepted = isCaseCompleted || opStatus === "ACCEPTED" || opStatus === "OTW" || opStatus === "IN_PROGRESS" || opStatus === "DONE";
                const isOtw = isCaseCompleted || opStatus === "OTW" || opStatus === "IN_PROGRESS" || opStatus === "DONE";
                const isWorking = isCaseCompleted || opStatus === "IN_PROGRESS" || opStatus === "DONE";

                if (isCaseRefund) {
                  return (
                    <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-200/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-rose-900">
                        <span className="flex items-center gap-1.5">
                          <Bank size={14} weight="bold" className="text-rose-600" />
                          Alur Penyelesaian Refund Jasa:
                        </span>
                        <span className="text-rose-700 font-mono">
                          {isCaseCompleted ? "Refund Selesai" : isCaseRejected ? "Ditolak" : "Berjalan"}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[9px] font-bold">
                        <div className="space-y-0.5">
                          <div className="h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-emerald-800">1. Diajukan</span>
                        </div>
                        <div className="space-y-0.5">
                          <div className={`h-1.5 rounded-full ${viewingDetailCase.mainStatus !== "SUBMITTED" ? "bg-emerald-500" : "bg-slate-200"}`} />
                          <span className={viewingDetailCase.mainStatus !== "SUBMITTED" ? "text-emerald-800" : "text-slate-400"}>2. Persetujuan</span>
                        </div>
                        <div className="space-y-0.5">
                          <div className={`h-1.5 rounded-full ${viewingDetailCase.mainStatus === "IN_RESOLUTION" ? "bg-rose-600 animate-pulse" : isCaseCompleted ? "bg-emerald-500" : "bg-slate-200"}`} />
                          <span className={viewingDetailCase.mainStatus === "IN_RESOLUTION" ? "text-rose-700" : isCaseCompleted ? "text-emerald-800" : "text-slate-400"}>3. Pencairan</span>
                        </div>
                        <div className="space-y-0.5">
                          <div className={`h-1.5 rounded-full ${isCaseCompleted ? "bg-emerald-500" : isCaseRejected ? "bg-rose-500" : "bg-slate-200"}`} />
                          <span className={isCaseCompleted ? "text-emerald-800" : isCaseRejected ? "text-rose-700" : "text-slate-400"}>{isCaseRejected ? "Ditolak" : "4. Selesai"}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                      <span className="flex items-center gap-1.5">
                        <Wrench size={14} weight="bold" className="text-purple-600" />
                        Alur Pengerjaan Ulang Teknisi (Rework Rp 0):
                      </span>
                      <span className="text-purple-700 font-mono">
                        {isCaseCompleted ? "Pengerjaan Selesai" : isCaseRejected ? "Ditolak" : opStatus === "IN_PROGRESS" ? "Sedang Dikerjakan" : opStatus === "OTW" ? "Teknisi OTW" : "Berjalan"}
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-1 text-center text-[8.5px] font-bold">
                      <div className="space-y-0.5">
                        <div className="h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-emerald-800">1. Diajukan</span>
                      </div>
                      <div className="space-y-0.5">
                        <div className={`h-1.5 rounded-full ${isAssigned ? "bg-emerald-500" : "bg-slate-200"}`} />
                        <span className={isAssigned ? "text-emerald-800" : "text-slate-400"}>2. Ditugaskan</span>
                      </div>
                      <div className="space-y-0.5">
                        <div className={`h-1.5 rounded-full ${isAccepted ? "bg-emerald-500" : opStatus === "ASSIGNED" ? "bg-blue-600 animate-pulse" : "bg-slate-200"}`} />
                        <span className={isAccepted ? "text-emerald-800" : opStatus === "ASSIGNED" ? "text-blue-700" : "text-slate-400"}>3. Terima</span>
                      </div>
                      <div className="space-y-0.5">
                        <div className={`h-1.5 rounded-full ${isOtw ? "bg-emerald-500" : opStatus === "ACCEPTED" ? "bg-sky-600 animate-pulse" : "bg-slate-200"}`} />
                        <span className={isOtw ? "text-emerald-800" : opStatus === "ACCEPTED" ? "text-sky-700" : "text-slate-400"}>4. OTW</span>
                      </div>
                      <div className="space-y-0.5">
                        <div className={`h-1.5 rounded-full ${isWorking ? "bg-emerald-500" : opStatus === "IN_PROGRESS" ? "bg-purple-600 animate-pulse" : "bg-slate-200"}`} />
                        <span className={isWorking ? "text-emerald-800" : opStatus === "IN_PROGRESS" ? "text-purple-700" : "text-slate-400"}>5. Pengerjaan</span>
                      </div>
                      <div className="space-y-0.5">
                        <div className={`h-1.5 rounded-full ${isCaseCompleted ? "bg-emerald-500" : isCaseRejected ? "bg-rose-500" : "bg-slate-200"}`} />
                        <span className={isCaseCompleted ? "text-emerald-800" : isCaseRejected ? "text-rose-700" : "text-slate-400"}>{isCaseRejected ? "Ditolak" : "6. Selesai"}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">Informasi Pekerjaan Asal</span>
                  <p className="font-bold text-slate-800 mt-0.5">Order ID: {viewingDetailCase.sourceOrderNumber}</p>
                  <p className="text-slate-600">Layanan: {viewingDetailCase.itemTitle}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">Informasi Pelanggan</span>
                  <p className="font-bold text-slate-800 mt-0.5">{viewingDetailCase.customerName}</p>
                  <p className="text-slate-600">Diajukan: {new Date(viewingDetailCase.submittedAt).toLocaleString("id-ID")}</p>
                  {viewingDetailCase.rejectionReason && (
                    <p className="text-rose-600 font-medium mt-1">Alasan Penolakan: {viewingDetailCase.rejectionReason}</p>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/60 text-xs space-y-1">
                <span className="text-amber-800 font-bold uppercase tracking-wider text-[10px] block">Kendala / Keluhan Pelanggan:</span>
                <p className="font-bold text-slate-900">{viewingDetailCase.issueReason}</p>
                <p className="text-slate-700 leading-relaxed">{viewingDetailCase.issueDescription}</p>
              </div>

              <div>
                <span className="text-slate-700 font-bold text-xs flex items-center gap-1.5 mb-2">
                  <Camera size={14} weight="bold" />
                  <span>Foto &amp; Bukti Kendala Layanan ({viewingDetailCase.evidenceMedia?.length || 0} file)</span>
                </span>
                {!viewingDetailCase.evidenceMedia || viewingDetailCase.evidenceMedia.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 border border-slate-200">
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
                        className="group relative aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Bukti ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                          Foto {idx + 1}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {viewingDetailCase.warrantyJob && (
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs space-y-1">
                  <span className="text-purple-800 font-bold uppercase tracking-wider text-[10px] block">Penugasan Pekerjaan Garansi Rp0:</span>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-purple-950">Teknisi: {viewingDetailCase.warrantyJob.workerName}</p>
                    <span className="font-mono font-bold text-purple-800 bg-white px-2 py-0.5 rounded border border-purple-200">
                      {viewingDetailCase.warrantyJob.coveredAmountText}
                    </span>
                  </div>
                  <p className="text-slate-600">Jadwal Kedatangan: {viewingDetailCase.warrantyJob.scheduledDate}</p>
                  <p className="text-slate-600">Catatan Pengerjaan: {viewingDetailCase.warrantyJob.notes || "-"}</p>
                </div>
              )}

              {/* Laporan & Bukti Pengerjaan Teknisi (Tersimpan di Sistem & Detail Lengkap) */}
              {viewingDetailCase.warrantyJob?.completionEvidence && (() => {
                const rawEv = viewingDetailCase.warrantyJob.completionEvidence;
                let photoUrl: string | null = null;
                let noteText: string = rawEv;
                if (rawEv.includes("|")) {
                  const parts = rawEv.split("|");
                  photoUrl = parts[0].trim();
                  noteText = parts.slice(1).join("|").trim();
                } else if (rawEv.startsWith("http")) {
                  photoUrl = rawEv.trim();
                  noteText = "Pekerjaan garansi selesai dikerjakan.";
                }

                return (
                  <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                        <CheckCircle size={15} weight="bold" className="text-emerald-600" />
                        Laporan &amp; Bukti Pengerjaan Selesai oleh Teknisi:
                      </span>
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                        TERVERIFIKASI
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-start">
                      {photoUrl && (
                        <div className="relative group shrink-0">
                          <img
                            src={photoUrl}
                            alt="Bukti Selesai"
                            className="w-24 h-24 object-cover rounded-xl border border-emerald-200 cursor-pointer shadow-2xs hover:opacity-90 transition"
                            onClick={() => window.open(photoUrl!, "_blank")}
                          />
                          <span className="text-[9px] text-emerald-700 font-bold block text-center mt-0.5">
                            Klik zoom
                          </span>
                        </div>
                      )}
                      <div className="flex-1 bg-white p-2.5 rounded-xl border border-emerald-100 text-xs space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Catatan Pengerjaan di Lokasi:</span>
                        <p className="font-medium text-slate-700 leading-relaxed">
                          {noteText || "Pekerjaan garansi telah selesai dilakukan dan diuji coba bersama pelanggan di lokasi."}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {viewingDetailCase.timeline && viewingDetailCase.timeline.length > 0 && (
                <div className="space-y-2">
                  <span className="text-slate-700 font-bold text-xs block">Riwayat Aktivitas &amp; Keputusan (Audit Trail)</span>
                  <div className="max-h-36 overflow-y-auto space-y-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    {viewingDetailCase.timeline.map((evt) => (
                      <div key={evt.id} className="flex items-start gap-2 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-purple-500 mt-1 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800">{evt.title}</p>
                          <p className="text-slate-500">{evt.description}</p>
                          <span className="text-[10px] text-slate-400">{new Date(evt.timestamp).toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                {(viewingDetailCase.mainStatus === "SUBMITTED" ||
                  viewingDetailCase.mainStatus === "UNDER_REVIEW") && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const c = viewingDetailCase;
                        setViewingDetailCase(null);
                        setApprovingClaim(c);
                      }}
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                    >
                      Setujui Pekerjaan Garansi (Rp0)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const c = viewingDetailCase;
                        setViewingDetailCase(null);
                        setAltClaim(c);
                      }}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Tawarkan Alternatif
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const c = viewingDetailCase;
                        setViewingDetailCase(null);
                        setReqEvidenceClaim(c);
                      }}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Minta Bukti
                    </button>
                  </>
                )}
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

export default function ProviderWarrantyPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Memuat dashboard garansi layanan...</div>}>
      <ProviderAfterSalesContent />
    </Suspense>
  );
}
