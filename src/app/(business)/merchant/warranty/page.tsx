"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Package,
  ArrowsClockwise,
  Clock,
  WarningCircle,
  CheckCircle,
  MagnifyingGlass,
  X,
  Eye,
  Camera,
  Star,
  ChatCircleText,
  ChatCircleDots,
  Storefront,
  ChartBar,
  CalendarBlank,
  Play,
  FilePlus,
  Bank,
  SlidersHorizontal,
  Truck,
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

type MerchantTab = "summary" | "settings" | "refunds" | "returns" | "reviews";

function MerchantAfterSalesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") as string | null;

  const resolveTab = (t: string | null): MerchantTab => {
    if (t === "settings") return "settings";
    if (t === "refund" || t === "refunds") return "refunds";
    if (t === "returns" || t === "claims") return "returns";
    return "summary";
  };

  const [activeTab, setActiveTab] = useState<MerchantTab>(resolveTab(rawTab));

  useEffect(() => {
    if (rawTab) {
      if (rawTab === "reviews") {
        router.replace("/merchant/reviews");
      } else {
        setActiveTab(resolveTab(rawTab));
      }
    }
  }, [rawTab, router]);

  const { user } = useActiveRole();
  const {
    cases,
    warrantyPresets,
    activeOrgId: contextOrgId,
    merchantApproveCase,
    merchantRejectCase,
    merchantProposeAlternative,
    merchantRequestEvidence,
    merchantStartResolution,
    merchantCompleteCase,
    merchantSaveReturnInstructions,
    merchantConfirmReturnReceived,
    merchantSubmitReturnInspection,
    getMainStatusDisplay,
  } = useAfterSales();

  const activeOrgId = user?.organizationId || contextOrgId || "0c1467e7-af68-4b26-ae84-daa41d51aed0";

  const merchantAllCases = cases.filter(
    (c) =>
      (c.caseType === "claim_product" || c.caseType === "return_product") &&
      (c.organizationId === activeOrgId || c.organizationType === "MERCHANT")
  );

  const isCaseRefund = (c: AfterSalesCase) =>
    c.customerRequestedSolution === "REFUND" ||
    c.chosenSolution === "REFUND" ||
    c.approvedSolution === "REFUND" ||
    (c as any).agreedSolution === "REFUND" ||
    (c as any).initial_solution === "REFUND" ||
    (c as any).initialSolution === "REFUND";

  const merchantRefunds = merchantAllCases.filter(isCaseRefund);
  const merchantReturns = merchantAllCases.filter((c) => !isCaseRefund(c));

  const activePresetsCount = warrantyPresets.filter(
    (p) =>
      (p.organizationId === activeOrgId || p.organizationType === "MERCHANT") &&
      p.isActive
  ).length;

  // Search and filter
  const [searchQuery, setSearchQuery] = useState("");
  const [returnStatusFilter, setReturnStatusFilter] = useState("ALL");
  const [refundStatusFilter, setRefundStatusFilter] = useState("ALL");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Reviews State (M08)
  const [reviews, setReviews] = useState<ReviewEntryDto[]>([]);
  const [reviewSummary, setReviewSummary] = useState<BusinessReviewSummary | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"ALL" | "PRODUCT" | "MERCHANT" | "UNREPLIED">("ALL");
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

  // Approve Modal State & Return Instructions
  const [approvingCase, setApprovingCase] = useState<AfterSalesCase | null>(null);
  const [chosenApprovalSolution, setChosenApprovalSolution] = useState<AfterSalesSolutionType>("REPLACEMENT");
  const [approvalNote, setApprovalNote] = useState("");
  const [requiresPhysicalReturn, setRequiresPhysicalReturn] = useState(true);
  const [noReturnReason, setNoReturnReason] = useState("");
  const [returnAddress, setReturnAddress] = useState("Komp. Glodok Glodok Jaya Blok B-12, Mangga Besar, Jakarta Barat, DKI Jakarta 11180");
  const [recipientName, setRecipientName] = useState("Bagian Retur & Garansi Toko");
  const [recipientPhone, setRecipientPhone] = useState("0812-9876-5432");
  const [packagingInstructions, setPackagingInstructions] = useState("Kemas rapi menggunakan bubble wrap dan kardus asli beserta aksesoris.");
  const [returnShippingFeePayer, setReturnShippingFeePayer] = useState<"MERCHANT" | "CUSTOMER">("MERCHANT");

  // Receiving Package Modal State
  const [receivingCase, setReceivingCase] = useState<AfterSalesCase | null>(null);
  const [receiptStaffName, setReceiptStaffName] = useState("Staff Gudang / Logistik Toko");
  const [receiptQuantity, setReceiptQuantity] = useState(1);
  const [receiptPackageCondition, setReceiptPackageCondition] = useState("BAIK_TERSEGEL");
  const [receiptNotes, setReceiptNotes] = useState("");

  // Reject Modal State
  const [rejectingCase, setRejectingCase] = useState<AfterSalesCase | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Propose Alternative Modal State
  const [altCase, setAltCase] = useState<AfterSalesCase | null>(null);
  const [altSolution, setAltSolution] = useState<AfterSalesSolutionType>("REPLACEMENT");
  const [altNote, setAltNote] = useState("");

  // Request Evidence Modal State
  const [reqEvidenceCase, setReqEvidenceCase] = useState<AfterSalesCase | null>(null);
  const [reqEvidenceReason, setReqEvidenceReason] = useState("");

  // Complete Case Modal State
  const [completingCase, setCompletingCase] = useState<AfterSalesCase | null>(null);
  const [completionEvidenceRef, setCompletionEvidenceRef] = useState("");

  // Detailed Case View Modal State (M07)
  const [viewingDetailCase, setViewingDetailCase] = useState<AfterSalesCase | null>(null);

  // Return Physical Inspection Modal State
  const [inspectingCase, setInspectingCase] = useState<AfterSalesCase | null>(null);
  const [inspectPackageIntact, setInspectPackageIntact] = useState(true);
  const [inspectSealIntact, setInspectSealIntact] = useState(true);
  const [inspectSerialMatched, setInspectSerialMatched] = useState(true);
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [inspectionResultPass, setInspectionResultPass] = useState(true);

  const handleInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingCase) return;
    try {
      const outcome = inspectionResultPass ? "MATCHED" : "MISMATCH";
      const notesSummary = `[Fisik: ${inspectPackageIntact ? "Kemasan Utuh" : "Kemasan Rusak"}, Segel: ${inspectSealIntact ? "Segel Utuh" : "Segel Terbuka"}, SN: ${inspectSerialMatched ? "SN Cocok" : "SN Beda"}] ${inspectionNotes.trim()}`;
      await merchantSubmitReturnInspection(inspectingCase.id, {
        quantity_inspected: inspectingCase.affectedQuantity || 1,
        quantity_approved: inspectionResultPass ? (inspectingCase.affectedQuantity || 1) : 0,
        item_condition: inspectPackageIntact && inspectSealIntact ? "BAIK_DAN_UTUH" : "RUSAK_KEMASAN",
        is_sku_matched: inspectSerialMatched,
        is_issue_matched: inspectionResultPass,
        is_components_complete: inspectPackageIntact,
        inspection_outcome: outcome,
        inspection_notes: notesSummary,
      });
      setToastMsg(
        `Hasil inspeksi barang retur #${inspectingCase.caseNumber} berhasil disimpan (${outcome}).`
      );
      setInspectingCase(null);
      setInspectionNotes("");
    } catch (err: any) {
      setToastMsg(`Gagal simpan inspeksi: ${err.message}`);
    }
  };

  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingCase) return;
    try {
      await merchantConfirmReturnReceived(receivingCase.id, {
        received_by: receiptStaffName || "Staff Gudang / Logistik Toko",
        quantity_received: receiptQuantity || receivingCase.affectedQuantity || 1,
        package_condition: receiptPackageCondition || "BAIK_TERSEGEL",
        receipt_notes: receiptNotes || "Paket retur fisik telah diterima di alamat resmi toko.",
      });
      setToastMsg(`Penerimaan barang retur #${receivingCase.caseNumber} berhasil dikonfirmasi.`);
      setReceivingCase(null);
    } catch (err: any) {
      setToastMsg(`Gagal konfirmasi terima: ${err.message}`);
    }
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingCase) return;
    try {
      await merchantApproveCase(approvingCase.id, chosenApprovalSolution, approvalNote);
      if (approvingCase.caseType === "return_product" || approvingCase.caseType === "claim_product") {
        await merchantSaveReturnInstructions(approvingCase.id, {
          requires_physical_return: requiresPhysicalReturn,
          no_return_reason: !requiresPhysicalReturn ? (noReturnReason || "Komponen/kerusakan dikonfirmasi tanpa pengiriman fisik.") : undefined,
          return_address: requiresPhysicalReturn ? (returnAddress || "Komp. Glodok Glodok Jaya Blok B-12, Mangga Besar, Jakarta Barat, DKI Jakarta 11180") : undefined,
          recipient_name: requiresPhysicalReturn ? (recipientName || "Bagian Retur & Garansi Toko") : undefined,
          recipient_phone: requiresPhysicalReturn ? (recipientPhone || "0812-9876-5432") : undefined,
          packaging_instructions: requiresPhysicalReturn ? (packagingInstructions || "Kemas rapi menggunakan bubble wrap dan kardus asli.") : undefined,
          shipping_fee_payer: requiresPhysicalReturn ? returnShippingFeePayer : "MERCHANT",
        });
      }
      setToastMsg(
        `Pengajuan #${approvingCase.caseNumber} berhasil disetujui (${chosenApprovalSolution})${requiresPhysicalReturn ? " dan instruksi retur fisik diterbitkan." : " tanpa pengiriman fisik."}`
      );
      setApprovingCase(null);
      setApprovalNote("");
    } catch (err: any) {
      setToastMsg(`Gagal menyetujui: ${err.message}`);
    }
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingCase || !rejectionReason.trim()) return;
    merchantRejectCase(rejectingCase.id, rejectionReason.trim());
    setToastMsg(`Pengajuan #${rejectingCase.caseNumber} telah ditolak dengan alasan tercatat.`);
    setRejectingCase(null);
    setRejectionReason("");
  };

  const handleAltSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!altCase || !altNote.trim()) return;
    merchantProposeAlternative(altCase.id, altSolution, altNote.trim());
    setToastMsg(`Solusi alternatif berhasil diajukan kepada Customer untuk kasus #${altCase.caseNumber}.`);
    setAltCase(null);
    setAltNote("");
  };

  const handleRequestEvidenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqEvidenceCase || !reqEvidenceReason.trim()) return;
    merchantRequestEvidence(reqEvidenceCase.id, reqEvidenceReason.trim());
    setToastMsg(`Permintaan bukti tambahan untuk kasus #${reqEvidenceCase.caseNumber} telah dikirim ke Customer.`);
    setReqEvidenceCase(null);
    setReqEvidenceReason("");
  };

  const handleStartResolution = (c: AfterSalesCase) => {
    merchantStartResolution(c.id);
    setToastMsg(`Eksekusi penyelesaian untuk kasus #${c.caseNumber} dimulai.`);
  };

  const handleCompleteCaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingCase || !completionEvidenceRef.trim()) return;
    merchantCompleteCase(completingCase.id, completionEvidenceRef.trim());
    setToastMsg(`Kasus #${completingCase.caseNumber} telah ditandai selesai dengan referensi bukti penyelesaian.`);
    setCompletingCase(null);
    setCompletionEvidenceRef("");
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingReview || !replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      await afterSalesApi.business.replyReview(replyingReview.id, {
        text: replyText.trim(),
      });
      setToastMsg("Tanggapan resmi toko atas ulasan pelanggan berhasil disimpan.");
      setReplyingReview(null);
      setReplyText("");
      await loadReviews();
    } catch (err: unknown) {
      setToastMsg(err instanceof Error ? err.message : "Gagal menyimpan balasan ulasan.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Computed KPI for M08
  const productReviews = reviews.filter((r) => r.target_type === "PRODUCT" && r.status === "VISIBLE");
  const merchantReviews = reviews.filter((r) => r.target_type === "MERCHANT" && r.status === "VISIBLE");
  const avgProductRating =
    reviewSummary?.product_average_rating ??
    reviewSummary?.item_average_rating ??
    (productReviews.length > 0
      ? Number((productReviews.reduce((acc, r) => acc + r.rating, 0) / productReviews.length).toFixed(2))
      : 0);
  const totalProductRatings = reviewSummary?.item_total_ratings ?? productReviews.length;
  const avgMerchantRating =
    reviewSummary?.merchant_average_rating ??
    reviewSummary?.business_average_rating ??
    (merchantReviews.length > 0
      ? Number((merchantReviews.reduce((acc, r) => acc + r.rating, 0) / merchantReviews.length).toFixed(2))
      : 0);
  const totalMerchantRatings = reviewSummary?.business_total_ratings ?? merchantReviews.length;
  const totalAllReviews = reviewSummary?.total_reviews ?? reviews.length;
  const unrepliedCount =
    reviewSummary?.unreplied_count ?? reviews.filter((r) => !r.reply).length;

  const filteredReviews = reviews.filter((r) => {
    if (reviewFilter === "PRODUCT") return r.target_type === "PRODUCT";
    if (reviewFilter === "MERCHANT") return r.target_type === "MERCHANT";
    if (reviewFilter === "UNREPLIED") return !r.reply;
    return true;
  });

  const filterCaseList = (list: AfterSalesCase[], status: string) =>
    list.filter((c) => {
      const matchesStatus = status === "ALL" || c.mainStatus === status;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.caseNumber.toLowerCase().includes(q) ||
        c.itemTitle.toLowerCase().includes(q) ||
        c.sourceOrderNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });

  const filteredRefunds = filterCaseList(merchantRefunds, refundStatusFilter);
  const filteredReturns = filterCaseList(merchantReturns, returnStatusFilter);

  const overdueCasesCount = [...merchantRefunds, ...merchantReturns].filter((c) => c.isNoResponse).length;
  const inResolutionCount = [...merchantRefunds, ...merchantReturns].filter(
    (c) => c.mainStatus === "IN_RESOLUTION"
  ).length;
  const activeRefundsCount = merchantRefunds.filter(
    (c) => c.mainStatus !== "COMPLETED" && c.mainStatus !== "REJECTED" && c.mainStatus !== "CANCELLED"
  ).length;
  const activeReturnsCount = merchantReturns.filter(
    (c) => c.mainStatus !== "COMPLETED" && c.mainStatus !== "REJECTED" && c.mainStatus !== "CANCELLED"
  ).length;

  const switchTab = (tab: MerchantTab) => {
    setActiveTab(tab);
    router.push(`/merchant/warranty?tab=${tab}`);
  };

  const renderCaseCard = (c: AfterSalesCase, isRefund: boolean) => {
    const statusBadge = getMainStatusDisplay(c.mainStatus);
    const isCompleted = c.mainStatus === "COMPLETED";
    const isRejected = c.mainStatus === "REJECTED";

    return (
      <div
        key={c.id}
        className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4 hover:border-slate-300 transition"
      >
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`font-mono font-bold text-xs ${
                  isRefund ? "text-rose-600" : "text-blue-600"
                }`}
              >
                #{c.caseNumber}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-mono">Order #{c.sourceOrderNumber}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-700">
                Pembeli: {c.customerName}
              </span>
            </div>
            <h3 className="font-bold text-base text-slate-900 mt-1">{c.itemTitle}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {c.isNoResponse && (
              <span className="px-2.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold animate-pulse">
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
                Menunggu Bukti Tambahan Customer
              </span>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.color}`}
            >
              {statusBadge.label} ({c.mainStatus})
            </span>
          </div>
        </div>

        {/* SECTION 1: RINGKASAN ORDER ASLI & SLA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
          <div className="space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Ringkasan Pesanan Barang Asal:
            </span>
            <p className="font-bold text-slate-800 text-xs">
              {c.itemTitle}
            </p>
            <p className="text-slate-600 text-[11px]">
              No. Order: <strong className="font-mono text-slate-700">#{c.sourceOrderNumber}</strong> • Pembeli: <strong className="text-slate-700">{c.customerName}</strong>
            </p>
            <p className="text-slate-600 text-[11px]">
              Total Dibeli: <strong className="text-slate-800">{c.orderedQuantity || 1} Unit</strong>
              {Boolean(c.itemPrice) && (
                <> • Nilai Satuan: <strong className="text-emerald-700">Rp {Number(c.itemPrice).toLocaleString("id-ID")}</strong></>
              )}
            </p>
          </div>

          <div className="space-y-1 md:text-right">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Tenggat Respons Regulasi (SLA 72 Jam):
            </span>
            <p className="font-mono font-bold text-slate-800 text-xs">
              {new Date(c.slaDeadlineAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} WIB
            </p>
            <p className="text-xs text-slate-600">
              Solusi Pembeli:{" "}
              <strong className={isRefund ? "text-rose-700 font-bold" : "text-blue-700 font-bold"}>
                {c.customerRequestedSolution || (isRefund ? "REFUND" : "REPLACEMENT")}
              </strong>
              {c.chosenSolution && (
                <span className="ml-1.5 text-emerald-700 font-bold">
                  • Disepakati: {c.chosenSolution}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* SECTION 2: DATA FORM PENGAJUAN PEMBELI */}
        <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 text-xs space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
            <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
              <FilePlus size={14} weight="bold" className={isRefund ? "text-rose-600" : "text-blue-600"} />
              Formulir Pengajuan Pembeli:
            </span>
            <span className="text-[11px] font-semibold text-slate-600">
              Unit Diklaim: <strong className="text-slate-900">{c.affectedQuantity || 1} Unit</strong> (dari {c.orderedQuantity || 1} unit dipesan)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Kendala / Kerusakan:</span>
              <strong className="text-slate-800">{c.issueReason}</strong>
              <p className="text-slate-600 mt-1 italic bg-white p-2.5 rounded-xl border border-slate-200/60 text-[11px]">
                &ldquo;{c.issueDescription}&rdquo;
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">Bukti Foto / Media Pembeli:</span>
              {c.evidenceMedia && c.evidenceMedia.length > 0 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {c.evidenceMedia.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="block shrink-0">
                      <img
                        src={url}
                        alt={`Bukti ${idx + 1}`}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 hover:scale-105 transition"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-[11px] italic">Pembeli tidak melampirkan foto bukti tambahan.</p>
              )}

              {c.rejectionReason && (
                <div className="p-2 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-[11px] mt-1">
                  <strong>Catatan Penolakan:</strong> {c.rejectionReason}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: VISUAL TIMELINE RESOLUSI */}
        {isRefund ? (
          <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-200/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-rose-900">
              <span className="flex items-center gap-1.5">
                <Bank size={14} weight="bold" className="text-rose-600" />
                Alur Penyelesaian Refund Produk:
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
                <span className={c.mainStatus !== "SUBMITTED" ? "text-emerald-800" : "text-slate-400"}>2. Persetujuan Toko</span>
              </div>
              <div className="space-y-0.5">
                <div className={`h-1.5 rounded-full ${c.mainStatus === "IN_RESOLUTION" ? "bg-rose-600 animate-pulse" : isCompleted ? "bg-emerald-500" : "bg-slate-200"}`} />
                <span className={c.mainStatus === "IN_RESOLUTION" ? "text-rose-700" : isCompleted ? "text-emerald-800" : "text-slate-400"}>3. Pencairan S-Pay</span>
              </div>
              <div className="space-y-0.5">
                <div className={`h-1.5 rounded-full ${isCompleted ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-slate-200"}`} />
                <span className={isCompleted ? "text-emerald-800" : isRejected ? "text-rose-700" : "text-slate-400"}>{isRejected ? "Ditolak" : "4. Selesai"}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
              <span className="flex items-center gap-1.5">
                <Package size={14} weight="bold" className="text-blue-600" />
                Alur Retur &amp; Penggantian Barang Fisik:
              </span>
              <span className="text-blue-700 font-mono">
                {isCompleted ? "Unit Pengganti Selesai" : isRejected ? "Ditolak" : "Berjalan"}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center text-[9px] font-bold">
              <div className="space-y-0.5">
                <div className="h-1.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-800">1. Diajukan</span>
              </div>
              <div className="space-y-0.5">
                <div className={`h-1.5 rounded-full ${c.mainStatus !== "SUBMITTED" ? "bg-emerald-500" : "bg-slate-200"}`} />
                <span className={c.mainStatus !== "SUBMITTED" ? "text-emerald-800" : "text-slate-400"}>2. Alamat Terbit</span>
              </div>
              <div className="space-y-0.5">
                <div className={`h-1.5 rounded-full ${c.returnShipping?.trackingNumber ? "bg-emerald-500" : "bg-slate-200"}`} />
                <span className={c.returnShipping?.trackingNumber ? "text-emerald-800" : "text-slate-400"}>3. Pembeli Kirim</span>
              </div>
              <div className="space-y-0.5">
                <div className={`h-1.5 rounded-full ${c.returnShipping?.inspectedByMerchant ? "bg-emerald-500" : c.mainStatus === "IN_RESOLUTION" ? "bg-blue-600 animate-pulse" : "bg-slate-200"}`} />
                <span className={c.returnShipping?.inspectedByMerchant ? "text-emerald-800" : "text-slate-400"}>4. Toko QC</span>
              </div>
              <div className="space-y-0.5">
                <div className={`h-1.5 rounded-full ${isCompleted ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-slate-200"}`} />
                <span className={isCompleted ? "text-emerald-800" : isRejected ? "text-rose-700" : "text-slate-400"}>{isRejected ? "Ditolak" : "5. Selesai"}</span>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: INFORMASI LOGISTIK RETUR FISIK (Bila Retur Barang) */}
        {!isRefund && (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
            <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
              <Truck size={14} weight="bold" className="text-blue-600" />
              Status Logistik &amp; Kurir Retur:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700 pt-0.5">
              <p>
                Resi Kirim Pembeli:{" "}
                <strong className="font-mono text-blue-700">
                  {c.returnShipping?.trackingNumber || "Belum diinput pembeli"}
                </strong>
              </p>
              <p>
                Penerimaan Toko:{" "}
                <strong>
                  {c.returnShipping?.receivedByMerchant ? "✓ Paket Fisik Diterima" : "Menunggu Pengiriman"}
                </strong>
              </p>
              <p>
                Hasil Pemeriksaan QC:{" "}
                <strong>
                  {c.returnShipping?.inspectedByMerchant ? "✓ Lolos Inspeksi QC" : "Belum Diinspeksi"}
                </strong>
              </p>
              <p>
                Unit Pengganti Toko:{" "}
                <strong className="font-mono text-emerald-700">
                  {c.replacementShipment?.trackingNumber || (isCompleted ? "Unit Pengganti Terkirim" : "Diproses setelah QC")}
                </strong>
              </p>
            </div>
          </div>
        )}

        {/* SECTION 5: FOOTER ACTION BUTTONS */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Link
              href={`/chat?partner_id=${encodeURIComponent(c.customerId || "")}&partner_type=customer&partner_name=${encodeURIComponent(c.customerName || "Customer")}&ctx_type=warranty_barang&ctx_id=${encodeURIComponent(c.id)}&ctx_title=${encodeURIComponent(c.itemTitle)}&ctx_summary=${encodeURIComponent(`Kasus Purnajual #${c.caseNumber}`)}`}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <ChatCircleDots size={14} weight="bold" className="text-blue-700" />
              <span>Chat Pembeli</span>
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
                      setApprovingCase(c);
                      setChosenApprovalSolution("REFUND");
                      setRequiresPhysicalReturn(false);
                      setNoReturnReason("Refund dana disetujui tanpa pengiriman fisik kembali.");
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bank size={14} weight="bold" />
                    <span>Setujui Refund Dana</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setApprovingCase(c);
                      setChosenApprovalSolution("REPLACEMENT");
                      setRequiresPhysicalReturn(true);
                      setNoReturnReason("");
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowsClockwise size={14} weight="bold" />
                    <span>Setujui &amp; Buat Alamat Retur</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAltCase(c);
                    setAltSolution(isRefund ? "REPLACEMENT" : "REFUND");
                  }}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Tawarkan Alternatif
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReqEvidenceCase(c);
                    setReqEvidenceReason("");
                  }}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Minta Bukti Tambahan
                </button>

                <button
                  type="button"
                  onClick={() => setRejectingCase(c)}
                  className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Tolak dengan Alasan
                </button>
              </>
            )}

            {c.mainStatus === "AWAITING_RETURN" && (
              <>
                {c.returnShipping?.trackingNumber && !c.returnShipping.receivedByMerchant && (
                  <button
                    type="button"
                    onClick={() => {
                      setReceivingCase(c);
                      setReceiptQuantity(c.affectedQuantity || 1);
                      setReceiptPackageCondition("BAIK_TERSEGEL");
                      setReceiptStaffName("Staff Gudang / Logistik Toko");
                      setReceiptNotes("");
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Package size={14} weight="bold" />
                    <span>Konfirmasi Paket Diterima</span>
                  </button>
                )}

                {c.returnShipping?.receivedByMerchant && !c.returnShipping.inspectedByMerchant && (
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingCase(c);
                      setInspectPackageIntact(true);
                      setInspectSealIntact(true);
                      setInspectSerialMatched(true);
                      setInspectionResultPass(true);
                      setInspectionNotes("");
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle size={14} weight="bold" />
                    <span>Pemeriksaan Fisik Retur (QC)</span>
                  </button>
                )}

                {!c.returnShipping?.trackingNumber && (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                    Menunggu Pembeli Mengirimkan Barang
                  </span>
                )}
              </>
            )}

            {c.mainStatus === "IN_RESOLUTION" && c.chosenSolution !== "REPAIR" && (
              <>
                <button
                  type="button"
                  onClick={() => handleStartResolution(c)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Play size={13} weight="fill" />
                  <span>Mulai Penyelesaian</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCompletingCase(c);
                    setCompletionEvidenceRef("");
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle size={14} weight="bold" />
                  <span>Selesaikan Kasus</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white w-full pb-16 font-body space-y-3.5">
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
              Layanan Purnajual, Garansi, Retur &amp; Ulasan Toko
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau ringkasan purnajual, kelola opsi garansi produk, proses klaim &amp; retur pembeli, serta balas penilaian pelanggan.
            </p>
          </div>
        </div>

        {/* 4 Merchant Tabs: Ringkasan, Pengaturan Garansi, Refund, Retur Barang */}
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
            <span>Pengaturan Garansi Toko</span>
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
            {merchantRefunds.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                {merchantRefunds.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => switchTab("returns")}
            className={`pb-2.5 px-3.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
              activeTab === "returns"
                ? "border-blue-600 text-blue-600 font-extrabold bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <ArrowsClockwise size={15} weight={activeTab === "returns" ? "fill" : "bold"} />
            <span>Retur Barang</span>
            {merchantReturns.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
                {merchantReturns.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full px-4 sm:px-6 py-3 space-y-3.5">
        {/* Live Service Indicator */}
        <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-medium flex flex-wrap items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">Pusat After-Sales Merchant Terintegrasi</span>
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

        {/* TAB 0: RINGKASAN */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <button
                type="button"
                onClick={() => switchTab("returns")}
                className="p-4 bg-white rounded-2xl border border-slate-200/80 text-left hover:border-blue-400 transition cursor-pointer shadow-xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Retur Barang Aktif
                </span>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">{activeReturnsCount}</p>
                <span className="text-[11px] text-slate-500">Total {merchantReturns.length} retur</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("refunds")}
                className="p-4 bg-white rounded-2xl border border-slate-200/80 text-left hover:border-rose-400 transition cursor-pointer shadow-xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Refund Barang Aktif
                </span>
                <p className="text-2xl font-extrabold text-rose-600 mt-1">{activeRefundsCount}</p>
                <span className="text-[11px] text-slate-500">Total {merchantRefunds.length} refund</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("returns")}
                className="p-4 bg-white rounded-2xl border border-amber-200 text-left hover:border-amber-400 transition cursor-pointer shadow-xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                  TIDAK DITANGGAPI
                </span>
                <p className="text-2xl font-extrabold text-amber-600 mt-1">{overdueCasesCount}</p>
                <span className="text-[11px] text-amber-700">Lewat SLA 72 jam</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("returns")}
                className="p-4 bg-white rounded-2xl border border-indigo-200 text-left hover:border-indigo-400 transition cursor-pointer shadow-xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                  Dalam Penyelesaian
                </span>
                <p className="text-2xl font-extrabold text-indigo-600 mt-1">{inResolutionCount}</p>
                <span className="text-[11px] text-slate-500">Status IN_RESOLUTION</span>
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
                <span className="text-[11px] text-slate-500">Template garansi toko</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/merchant/reviews")}
                className="p-4 bg-white rounded-2xl border border-slate-200/80 text-left hover:border-amber-400 transition cursor-pointer shadow-xs"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ulasan Belum Dibalas
                </span>
                <p className="text-2xl font-extrabold text-amber-500 mt-1">{unrepliedCount}</p>
                <span className="text-[11px] text-slate-500">
                  Produk ★ {totalProductRatings > 0 ? Number(avgProductRating).toFixed(1) : "—"} • Toko ★{" "}
                  {totalMerchantRatings > 0 ? Number(avgMerchantRating).toFixed(1) : "—"}
                </span>
              </button>
            </div>

            {/* Quick Recent Cases */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900">
                  Pengajuan Retur &amp; Refund Terbaru yang Memerlukan Perhatian
                </h2>
                <button
                  type="button"
                  onClick={() => switchTab("returns")}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Kelola Semua Kasus →
                </button>
              </div>
              {[...merchantRefunds, ...merchantReturns].length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Belum ada pengajuan retur atau refund barang yang masuk.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {[...merchantRefunds, ...merchantReturns].slice(0, 5).map((c) => {
                    const statusBadge = getMainStatusDisplay(c.mainStatus);
                    const isRef = isCaseRefund(c);
                    return (
                      <div
                        key={c.id}
                        className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold ${isRef ? "text-rose-600" : "text-blue-600"}`}>
                              #{c.caseNumber}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isRef ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}>
                              {isRef ? "Refund" : "Retur Barang"}
                            </span>
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

        {/* TAB 1: PENGATURAN GARANSI TOKO (M01-M02) */}
        {activeTab === "settings" && (
          <WarrantyPresetManager
            organizationId={activeOrgId}
            organizationType="MERCHANT"
            title="Pengaturan Garansi Toko Merchant"
            subtitle="Pilihan garansi ini akan muncul di dropdown saat Anda menambahkan atau mengedit produk di katalog."
          />
        )}

        {/* TAB 2: REFUND */}
        {activeTab === "refunds" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Bank size={18} className="text-rose-600" />
                  <span>Daftar Permohonan Refund Produk</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tindak lanjuti permohonan pengembalian dana dari pembeli produk dengan persetujuan refund, penawaran unit alternatif, atau penolakan beralasan.
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
                { id: "ALL", label: "Semua", count: merchantRefunds.length },
                { id: "SUBMITTED", label: "Menunggu Respon", count: merchantRefunds.filter((c) => c.mainStatus === "SUBMITTED").length },
                { id: "UNDER_REVIEW", label: "Ditinjau / Info", count: merchantRefunds.filter((c) => c.mainStatus === "UNDER_REVIEW").length },
                { id: "IN_RESOLUTION", label: "Proses Refund", count: merchantRefunds.filter((c) => c.mainStatus === "IN_RESOLUTION").length },
                { id: "COMPLETED", label: "Selesai", count: merchantRefunds.filter((c) => c.mainStatus === "COMPLETED").length },
                { id: "REJECTED", label: "Ditolak", count: merchantRefunds.filter((c) => c.mainStatus === "REJECTED").length },
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
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-500">
                Belum ada permohonan refund barang yang sesuai dengan filter ini.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRefunds.map((c) => renderCaseCard(c, true))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RETUR BARANG */}
        {activeTab === "returns" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ArrowsClockwise size={18} className="text-blue-600" />
                  <span>Daftar Permintaan Retur &amp; Ganti Unit</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Kelola pengembalian barang fisik dari pembeli, verifikasi kedatangan paket kurir, inspeksi kondisi QC fisik, dan selesaikan penggantian unit baru.
                </p>
              </div>

              <div className="relative">
                <MagnifyingGlass size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor kasus / item / order..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200"
                />
              </div>
            </div>

            {/* Sub-tab Status Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: "ALL", label: "Semua", count: merchantReturns.length },
                { id: "SUBMITTED", label: "Menunggu Respon", count: merchantReturns.filter((c) => c.mainStatus === "SUBMITTED").length },
                { id: "AWAITING_RETURN", label: "Menunggu Kirim", count: merchantReturns.filter((c) => c.mainStatus === "AWAITING_RETURN").length },
                { id: "UNDER_REVIEW", label: "Sedang Diperiksa", count: merchantReturns.filter((c) => c.mainStatus === "UNDER_REVIEW").length },
                { id: "IN_RESOLUTION", label: "Ganti Unit / Resolusi", count: merchantReturns.filter((c) => c.mainStatus === "IN_RESOLUTION").length },
                { id: "COMPLETED", label: "Selesai", count: merchantReturns.filter((c) => c.mainStatus === "COMPLETED").length },
                { id: "REJECTED", label: "Ditolak", count: merchantReturns.filter((c) => c.mainStatus === "REJECTED").length },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setReturnStatusFilter(st.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    returnStatusFilter === st.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      returnStatusFilter === st.id
                        ? "bg-blue-800 text-blue-100"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              ))}
            </div>

            {filteredReturns.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-500">
                Belum ada permintaan retur barang yang sesuai dengan filter ini.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReturns.map((c) => renderCaseCard(c, false))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RATING & ULASAN PRODUK & TOKO (M08) */}
        {activeTab === "reviews" && (
          <div className="space-y-4">
            {/* 4 KPI Cards (M08 Mandatory Amendment) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Rata-rata Kualitas Produk
                  </span>
                  <Package size={16} weight="duotone" className="text-blue-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {avgProductRating > 0 ? avgProductRating.toFixed(1) : "0.0"}
                  </span>
                  <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                    <Star size={14} weight="fill" /> / 5.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Dari {totalProductRatings} penilaian produk (VISIBLE)
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Rata-rata Penilaian Toko
                  </span>
                  <Storefront size={16} weight="duotone" className="text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {avgMerchantRating > 0 ? avgMerchantRating.toFixed(1) : "0.0"}
                  </span>
                  <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                    <Star size={14} weight="fill" /> / 5.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Dari {totalMerchantRatings} penilaian layanan toko (MERCHANT)
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
                  Akumulasi seluruh entri ulasan produk &amp; toko
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Ulasan Belum Dibalas
                  </span>
                  <ChatCircleText size={16} weight="duotone" className="text-amber-600" />
                </div>
                <p className="text-2xl font-extrabold text-amber-600">{unrepliedCount}</p>
                <p className="text-[11px] text-slate-500">
                  Maksimal 1 balasan resmi per entri ulasan
                </p>
              </div>
            </div>

            {/* Filter & Refresh Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "ALL", label: "Semua Ulasan" },
                    { id: "PRODUCT", label: "Ulasan Produk (PRODUCT)" },
                    { id: "MERCHANT", label: "Ulasan Toko (MERCHANT)" },
                    { id: "UNREPLIED", label: `Belum Dibalas (${unrepliedCount})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setReviewFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      reviewFilter === f.id
                        ? "bg-blue-600 text-white shadow-xs"
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
                <Clock size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                <span>Memuat data penilaian produk dan toko...</span>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-500">
                Belum ada ulasan pelanggan yang sesuai dengan filter ini.
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredReviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200/80 space-y-3 shadow-xs hover:border-blue-200 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              r.target_type === "PRODUCT"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {r.target_type === "PRODUCT" ? "Penilaian Produk" : "Penilaian Toko"}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {r.customer_display_name || "Pelanggan Servio"}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
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
                        <span className="text-xs font-bold text-slate-800 ml-1">{r.rating}.0</span>
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
                          <div
                            key={mIdx}
                            className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m} alt={`Bukti ${mIdx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    {r.reply && (
                      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-blue-900 font-bold">
                          <span>Balasan Resmi Toko Anda:</span>
                          <span className="text-[10px] text-blue-600 font-normal">
                            {new Date(r.reply.updated_at || r.reply.created_at).toLocaleDateString("id-ID")}
                          </span>
                        </div>
                        <p className="text-slate-700">{r.reply.reply_text || r.reply.text}</p>
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
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <ChatCircleText size={14} weight="bold" />
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

      {/* Modal: Detail Ulasan (M08 Detail Card) */}
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {viewingReview.target_type === "PRODUCT" ? "Detail Ulasan Produk" : "Detail Ulasan Toko"}
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
                <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 text-xs space-y-1">
                  <span className="font-bold text-blue-900 block">Balasan Resmi Toko:</span>
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer"
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

      {/* Modal: Balas / Edit Balasan Ulasan (M08) */}
      <AnimatePresence>
        {replyingReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900">
                {replyingReview.reply ? "Edit Balasan Resmi Toko" : "Balas Ulasan Pelanggan"}
              </h3>
              <p className="text-xs text-slate-600">
                Balasan Anda akan tampil secara publik di bawah ulasan pelanggan pada halaman produk / profil toko.
              </p>
              <form onSubmit={handleReplySubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Isi Balasan Resmi (Wajib):</label>
                  <textarea
                    rows={4}
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Terima kasih atas kepercayaan Anda berbelanja di toko kami..."
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
                    className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingReply ? "Menyimpan..." : "Simpan Balasan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Setujui Kasus & Instruksi Retur Fisik */}
      <AnimatePresence>
        {approvingCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 my-8"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">
                  Persetujuan Penanganan: #{approvingCase.caseNumber}
                </h3>
                <button
                  type="button"
                  onClick={() => setApprovingCase(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              <form onSubmit={handleApproveSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pilih Solusi Penanganan Disetujui:</label>
                  <select
                    value={chosenApprovalSolution}
                    onChange={(e) => setChosenApprovalSolution(e.target.value as AfterSalesSolutionType)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="REPLACEMENT">Penggantian Barang Baru (Replacement)</option>
                    <option value="REFUND">Pengembalian Dana (Refund)</option>
                    <option value="REPAIR">Perbaikan (Repair)</option>
                  </select>
                </div>

                {/* Bagian B: Apakah Barang Perlu Dikembalikan Secara Fisik? */}
                <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-3">
                  <span className="font-bold text-blue-950 block text-xs">
                    Apakah Barang Perlu Dikembalikan Secara Fisik?
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition ${
                        requiresPhysicalReturn
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="requiresPhysicalReturn"
                        checked={requiresPhysicalReturn}
                        onChange={() => setRequiresPhysicalReturn(true)}
                        className="sr-only"
                      />
                      Ya, Wajib Dikirim Balik
                    </label>
                    <label
                      className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition ${
                        !requiresPhysicalReturn
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="requiresPhysicalReturn"
                        checked={!requiresPhysicalReturn}
                        onChange={() => setRequiresPhysicalReturn(false)}
                        className="sr-only"
                      />
                      Tidak Perlu Dikirim Balik
                    </label>
                  </div>

                  {requiresPhysicalReturn ? (
                    <div className="space-y-2.5 pt-2 border-t border-blue-200/60">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Alamat Resmi Pengembalian Toko:</label>
                        <textarea
                          rows={2}
                          required
                          value={returnAddress}
                          onChange={(e) => setReturnAddress(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-xl bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Nama Penerima Toko:</label>
                          <input
                            type="text"
                            required
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-xl bg-white"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">No. Telp Penerima:</label>
                          <input
                            type="text"
                            required
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-xl bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Instruksi Pengemasan untuk Pembeli:</label>
                        <input
                          type="text"
                          value={packagingInstructions}
                          onChange={(e) => setPackagingInstructions(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-xl bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Penanggung Ongkos Kirim Pengembalian:</label>
                        <select
                          value={returnShippingFeePayer}
                          onChange={(e) => setReturnShippingFeePayer(e.target.value as "MERCHANT" | "CUSTOMER")}
                          className="w-full p-2 border border-slate-200 rounded-xl bg-white font-semibold"
                        >
                          <option value="MERCHANT">Ditanggung Penjual (Merchant Reimburse / Free)</option>
                          <option value="CUSTOMER">Ditanggung Pembeli (Customer)</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-blue-200/60">
                      <label className="font-bold text-slate-700 block mb-1">Alasan Barang Tidak Perlu Dikirim Balik:</label>
                      <input
                        type="text"
                        required
                        value={noReturnReason}
                        onChange={(e) => setNoReturnReason(e.target.value)}
                        placeholder="Contoh: Komponen cacat telah diverifikasi via foto tanpa perlu pengiriman fisik."
                        className="w-full p-2 border border-slate-200 rounded-xl bg-white"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catatan Persetujuan untuk Pembeli:</label>
                  <textarea
                    rows={2}
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder="Contoh: Pengajuan Anda telah disetujui..."
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
                    className="px-5 py-2 font-bold bg-emerald-600 text-white rounded-xl shadow-sm cursor-pointer"
                  >
                    Konfirmasi Persetujuan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Konfirmasi Paket Retur Diterima (confirmReturnReceipt) */}
      <AnimatePresence>
        {receivingCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Package size={18} className="text-blue-600" weight="bold" />
                  <span>Konfirmasi Paket Retur Diterima: #{receivingCase.caseNumber}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setReceivingCase(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Konfirmasikan bahwa paket kiriman pengembalian dari pembeli telah sampai di alamat toko Anda.
              </p>

              <form onSubmit={handleReceiptSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Penerima / Staff Gudang:</label>
                  <input
                    type="text"
                    required
                    value={receiptStaffName}
                    onChange={(e) => setReceiptStaffName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jumlah Unit Diterima:</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={receiptQuantity}
                    onChange={(e) => setReceiptQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kondisi Kemasan Awal:</label>
                  <select
                    value={receiptPackageCondition}
                    onChange={(e) => setReceiptPackageCondition(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="BAIK_TERSEGEL">Baik &amp; Tersegel Rapi</option>
                    <option value="KEMASAN_RUSAK">Kemasan Luar Penyok / Rusak</option>
                    <option value="KEMASAN_TERBUKA">Kemasan Terbuka / Segel Sobek</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catatan Penerimaan:</label>
                  <input
                    type="text"
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    placeholder="Contoh: Paket diterima utuh via kurir JNE..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReceivingCase(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm cursor-pointer"
                  >
                    Konfirmasi Penerimaan Paket
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Minta Bukti Tambahan (REQUEST_EVIDENCE) */}
      <AnimatePresence>
        {reqEvidenceCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FilePlus size={18} className="text-amber-600" weight="bold" />
                <span>Minta Bukti Tambahan: #{reqEvidenceCase.caseNumber}</span>
              </h3>
              <p className="text-xs text-slate-600">
                Status kasus akan berubah menjadi <strong>UNDER_REVIEW (Menunggu Informasi Customer)</strong> hingga pembeli mengunggah bukti yang diminta.
              </p>
              <form onSubmit={handleRequestEvidenceSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rincian Bukti yang Diminta (Wajib):</label>
                  <textarea
                    rows={3}
                    required
                    value={reqEvidenceReason}
                    onChange={(e) => setReqEvidenceReason(e.target.value)}
                    placeholder="Contoh: Mohon lampirkan foto label nomor seri pada bagian belakang kompresor dan video saat dinyalakan..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReqEvidenceCase(null)}
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

      {/* Modal: Selesaikan Kasus (completeCase) */}
      <AnimatePresence>
        {completingCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-900">
                Selesaikan Kasus Purnajual: #{completingCase.caseNumber}
              </h3>
              <p className="text-xs text-slate-600">
                Masukkan referensi bukti penyelesaian otoritatif (mis. nomor resi pengiriman pengganti atau referensi pencairan refund).
              </p>
              <form onSubmit={handleCompleteCaseSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Referensi Bukti Penyelesaian (evidence_ref):</label>
                  <input
                    type="text"
                    required
                    value={completionEvidenceRef}
                    onChange={(e) => setCompletionEvidenceRef(e.target.value)}
                    placeholder="Contoh: RESI-JNE-88291022 / REF-FIN-001"
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCompletingCase(null)}
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
                    <option value="REPLACEMENT">Tukar dengan Unit Baru (Replacement)</option>
                    <option value="REFUND">Pengembalian Dana (Refund)</option>
                    <option value="REPAIR">Perbaikan Sparepart (Repair)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Penjelasan &amp; Alasan Tawaran (Wajib):</label>
                  <textarea
                    rows={3}
                    required
                    value={altNote}
                    onChange={(e) => setAltNote(e.target.value)}
                    placeholder="Contoh: Kami menyarankan menukar ke seri original tanpa biaya tambahan..."
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

      {/* Modal: Detail Kasus Lengkap Merchant (M07) */}
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                    {viewingDetailCase.caseType === "claim_product" ? "Klaim Garansi Produk" : "Retur Barang Pembeli"}
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

              {/* Status and SLA bar */}
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
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">Tenggat SLA Respon</span>
                  <span className="font-bold text-rose-600 font-mono">
                    {new Date(viewingDetailCase.slaDeadlineAt).toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">Solusi Diajukan Customer</span>
                  <span className="font-bold text-blue-600">
                    {viewingDetailCase.customerRequestedSolution || "—"}
                  </span>
                </div>
              </div>

              {/* Customer and Order summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">Informasi Pesanan</span>
                  <p className="font-bold text-slate-800 mt-0.5">Order ID: {viewingDetailCase.sourceOrderNumber}</p>
                  <p className="text-slate-600">Produk: {viewingDetailCase.itemTitle}</p>
                  <p className="text-slate-600">
                    Kuantitas Klaim: <strong>{viewingDetailCase.affectedQuantity}</strong> dari {viewingDetailCase.orderedQuantity} unit
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block font-semibold">Informasi Pembeli</span>
                  <p className="font-bold text-slate-800 mt-0.5">{viewingDetailCase.customerName}</p>
                  <p className="text-slate-600">Diajukan: {new Date(viewingDetailCase.submittedAt).toLocaleString("id-ID")}</p>
                  {viewingDetailCase.rejectionReason && (
                    <p className="text-rose-600 font-medium mt-1">Alasan Penolakan: {viewingDetailCase.rejectionReason}</p>
                  )}
                </div>
              </div>

              {/* Issue & Description */}
              <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/60 text-xs space-y-1">
                <span className="text-amber-800 font-bold uppercase tracking-wider text-[10px] block">Kendala / Keluhan Pembeli:</span>
                <p className="font-bold text-slate-900">{viewingDetailCase.issueReason}</p>
                <p className="text-slate-700 leading-relaxed">{viewingDetailCase.issueDescription}</p>
              </div>

              {/* Photos Gallery */}
              <div>
                <span className="text-slate-700 font-bold text-xs flex items-center gap-1.5 mb-2">
                  <Camera size={14} weight="bold" />
                  <span>Foto &amp; Bukti Fisik Kerusakan ({viewingDetailCase.evidenceMedia?.length || 0} file)</span>
                </span>
                {!viewingDetailCase.evidenceMedia || viewingDetailCase.evidenceMedia.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 border border-slate-200">
                    Tidak ada lampiran foto dari pembeli.
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

              {/* Return shipping info if present */}
              {viewingDetailCase.returnShipping && (
                <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 text-xs">
                  <span className="text-emerald-800 font-bold uppercase tracking-wider text-[10px] block">Ekspedisi Retur:</span>
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                    <p className="font-semibold text-slate-800">
                      Kurir: {viewingDetailCase.returnShipping.courierName || "Ekspedisi Terdaftar"}
                    </p>
                    <p className="font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      Resi: {viewingDetailCase.returnShipping.trackingNumber}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Status Diterima Toko:{" "}
                    <strong>{viewingDetailCase.returnShipping.receivedByMerchant ? "SUDAH DITERIMA & LOLOS INSPEKSI" : "SEDANG DIKIRIM OLEH PEMBELI"}</strong>
                  </p>
                </div>
              )}

              {/* Audit trail events */}
              {viewingDetailCase.timeline && viewingDetailCase.timeline.length > 0 && (
                <div className="space-y-2">
                  <span className="text-slate-700 font-bold text-xs block">Riwayat Aktivitas &amp; Keputusan (Audit Trail)</span>
                  <div className="max-h-36 overflow-y-auto space-y-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    {viewingDetailCase.timeline.map((evt) => (
                      <div key={evt.id} className="flex items-start gap-2 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
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
                        setApprovingCase(c);
                        setChosenApprovalSolution(c.customerRequestedSolution || "REPLACEMENT");
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Setujui Penanganan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const c = viewingDetailCase;
                        setViewingDetailCase(null);
                        setAltCase(c);
                        setAltSolution(
                          c.customerRequestedSolution === "REFUND" ? "REPLACEMENT" : "REFUND"
                        );
                      }}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Tawarkan Alternatif
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const c = viewingDetailCase;
                        setViewingDetailCase(null);
                        setReqEvidenceCase(c);
                      }}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Minta Bukti
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const c = viewingDetailCase;
                        setViewingDetailCase(null);
                        setRejectingCase(c);
                      }}
                      className="px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Tolak
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

      {/* Modal: Form Inspeksi Fisik Barang Retur */}
      <AnimatePresence>
        {inspectingCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Package size={18} className="text-blue-600" weight="bold" />
                  <span>Inspeksi Fisik Barang Retur: #{inspectingCase.caseNumber}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setInspectingCase(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Lakukan verifikasi kelengkapan kemasan, keutuhan segel, dan kecocokan nomor seri barang retur sebelum menyetujui pengembalian dana atau penggantian barang.
              </p>

              <form onSubmit={handleInspectionSubmit} className="space-y-4 text-xs">
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={inspectPackageIntact}
                      onChange={(e) => setInspectPackageIntact(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Kemasan / Box Asli Utuh &amp; Tidak Dirusak Sengaja</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={inspectSealIntact}
                      onChange={(e) => setInspectSealIntact(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Segel Garansi / Stiker Segel Toko Utuh (Tidak dibongkar sendiri)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={inspectSerialMatched}
                      onChange={(e) => setInspectSerialMatched(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Nomor Seri / Serial Number Fisik Cocok dengan Catatan Penjualan</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-slate-700 block">Hasil Kesimpulan Inspeksi:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectionResultPass(true)}
                      className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                        inspectionResultPass
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-400"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      ✓ Lolos Inspeksi QC
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectionResultPass(false)}
                      className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                        !inspectionResultPass
                          ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-400"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      ✕ Gagal / Ditolak
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Catatan Hasil Pemeriksaan:</label>
                  <textarea
                    rows={3}
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="Contoh: Unit dicek fisik sesuai laporan pembeli, motor fan macet, segel utuh..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setInspectingCase(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2 font-bold text-white rounded-xl shadow-sm ${
                      inspectionResultPass ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    {inspectionResultPass ? "Simpan & Loloskan Barang" : "Tolak Hasil Inspeksi"}
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
