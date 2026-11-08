"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Package,
  Wrench,
  ArrowsClockwise,
  Clock,
  WarningCircle,
  CheckCircle,
  Eye,
  EyeSlash,
  Star,
  MagnifyingGlass,
  Funnel,
  Buildings,
  User,
  ChatText,
  CalendarCheck,
} from "@phosphor-icons/react";
import { afterSalesApi, AfterSalesCase, ReviewEntry } from "@/lib/afterSalesApi";
import {
  getCaseMainStatusConfig,
  getResponseStateConfig,
  calculateSlaCountdown,
  getSolutionLabel,
  getCaseTypeLabel,
  formatWibDateTime,
} from "@/features/afterSales/statusMapper";
import { Toast } from "@/components/feedback/Toast";

type AdminTab = "cases" | "moderation";

export default function AdminAfterSalesPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("cases");

  // Cases State
  const [cases, setCases] = useState<AfterSalesCase[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [caseTypeFilter, setCaseTypeFilter] = useState("ALL");
  const [caseStatusFilter, setCaseStatusFilter] = useState("ALL");
  const [caseSearch, setCaseSearch] = useState("");

  // Moderation State
  const [reviews, setReviews] = useState<ReviewEntry[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewStatusFilter, setReviewStatusFilter] = useState("ALL");
  const [reviewSearch, setReviewSearch] = useState("");
  const [moderatingReview, setModeratingReview] = useState<ReviewEntry | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [isSubmittingModeration, setIsSubmittingModeration] = useState(false);

  // Detail Modal
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<AfterSalesCase | null>(null);
  const [selectedReviewDetail, setSelectedReviewDetail] = useState<ReviewEntry | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    setIsLoadingCases(true);
    try {
      const params: any = {};
      if (caseTypeFilter !== "ALL") params.case_type = caseTypeFilter;
      if (caseStatusFilter !== "ALL") params.status = caseStatusFilter;
      const res = await afterSalesApi.admin.getCases(params);
      if (res.data) setCases(res.data);
    } catch {
      // ignore
    } finally {
      setIsLoadingCases(false);
    }
  }, [caseTypeFilter, caseStatusFilter]);

  const loadReviews = useCallback(async () => {
    setIsLoadingReviews(true);
    try {
      const params: any = {};
      if (reviewStatusFilter !== "ALL") params.status = reviewStatusFilter;
      const res = await afterSalesApi.admin.getReviews(params);
      if (res.data) setReviews(res.data);
    } catch {
      // ignore
    } finally {
      setIsLoadingReviews(false);
    }
  }, [reviewStatusFilter]);

  useEffect(() => {
    if (activeTab === "cases") {
      loadCases();
    } else {
      loadReviews();
    }
  }, [activeTab, loadCases, loadReviews]);

  const handleModerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moderatingReview) return;
    setIsSubmittingModeration(true);
    const isCurrentlyVisible = moderatingReview.status === "VISIBLE" || moderatingReview.status === "PUBLISHED";
    const newAction = isCurrentlyVisible ? "HIDE" : "RESTORE";
    try {
      await afterSalesApi.admin.moderateReview(
        moderatingReview.id,
        newAction,
        moderationReason || "Moderasi oleh Admin Operasional"
      );
      setToastMessage(
        `Status ulasan berhasil diubah menjadi: ${newAction === "HIDE" ? "DISEMBUNYIKAN" : "DITAMPILKAN"}`
      );
      setModeratingReview(null);
      setModerationReason("");
      await loadReviews();
    } catch (err: any) {
      setToastMessage(err.message || "Gagal memperbarui status moderasi.");
    } finally {
      setIsSubmittingModeration(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    if (!caseSearch.trim()) return true;
    const q = caseSearch.toLowerCase();
    return (
      c.case_number?.toLowerCase().includes(q) ||
      c.source_order_id.toLowerCase().includes(q) ||
      c.source_merchant_order_id?.toLowerCase().includes(q) ||
      c.customer_id.toLowerCase().includes(q) ||
      c.owner_org_id?.toLowerCase().includes(q)
    );
  });

  const filteredReviews = reviews.filter((r) => {
    if (!reviewSearch.trim()) return true;
    const q = reviewSearch.toLowerCase();
    return (
      r.target_id.toLowerCase().includes(q) ||
      (r.review_text && r.review_text.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/60 pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Operations &amp; QC Panel
                </span>
                <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Port 8008 • Active
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold font-display text-slate-900 mt-1">
                Pusat Pengawasan After-Sales &amp; Moderasi Ulasan
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring kepatuhan SLA 72 jam kasus purnajual platform serta pengawasan integritas review pelanggan.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveTab("cases")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "cases"
                    ? "bg-white text-indigo-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldCheck size={16} weight={activeTab === "cases" ? "fill" : "bold"} />
                <span>Monitoring Kasus</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-extrabold ml-1">
                  {cases.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("moderation")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "moderation"
                    ? "bg-white text-indigo-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Star size={16} weight={activeTab === "moderation" ? "fill" : "bold"} className="text-amber-500" />
                <span>Moderasi Ulasan</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-extrabold ml-1">
                  {reviews.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* TAB 1: MONITORING KASUS SELURUH PLATFORM */}
        {activeTab === "cases" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px]">
                  <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={caseSearch}
                    onChange={(e) => setCaseSearch(e.target.value)}
                    placeholder="Cari ID kasus, order, atau pihak..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <select
                  value={caseTypeFilter}
                  onChange={(e) => setCaseTypeFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-medium cursor-pointer"
                >
                  <option value="ALL">Semua Jenis Kasus</option>
                  <option value="GOODS_WARRANTY">Garansi Barang (05A)</option>
                  <option value="SERVICE_WARRANTY">Garansi Layanan (05B)</option>
                  <option value="GOODS_RETURN">Retur Barang (05A)</option>
                </select>

                <select
                  value={caseStatusFilter}
                  onChange={(e) => setCaseStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-medium cursor-pointer"
                >
                  <option value="ALL">Semua Status Kasus</option>
                  <option value="SUBMITTED">Diajukan (Submitted)</option>
                  <option value="UNDER_REVIEW">Ditinjau (Under Review)</option>
                  <option value="IN_RESOLUTION">Dalam Penyelesaian (In Resolution)</option>
                  <option value="COMPLETED">Selesai (Completed)</option>
                  <option value="REJECTED">Ditolak (Rejected)</option>
                  <option value="CANCELLED">Dibatalkan (Cancelled)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={loadCases}
                disabled={isLoadingCases}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 self-end md:self-center cursor-pointer"
              >
                <ArrowsClockwise size={14} className={isLoadingCases ? "animate-spin" : ""} />
                <span>Segarkan</span>
              </button>
            </div>

            {/* Cases Table */}
            {isLoadingCases ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
                <Clock size={28} className="animate-spin text-indigo-600 mx-auto mb-2" />
                <span>Memuat data pengawasan kasus...</span>
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
                Tidak ada kasus after-sales yang sesuai dengan kriteria filter saat ini.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Kasus &amp; Jenis</th>
                        <th className="py-3 px-4">Sumber Pesanan</th>
                        <th className="py-3 px-4">Pihak Terkait</th>
                        <th className="py-3 px-4">Solusi Sepakat</th>
                        <th className="py-3 px-4">SLA 72 Jam</th>
                        <th className="py-3 px-4">Status Kasus</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredCases.map((c) => {
                        const statusConfig = getCaseMainStatusConfig(c.main_status, c.substate);
                        const slaConfig = getResponseStateConfig(c.response_state, c.response_due_at);
                        const slaTimer = calculateSlaCountdown(c.response_due_at);

                        return (
                          <tr key={c.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3.5 px-4">
                              <div className="font-mono font-bold text-slate-900">
                                {c.case_number || c.id}
                              </div>
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                {getCaseTypeLabel(c.case_type)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                              {c.source_merchant_order_id || c.source_order_id}
                              <span className="text-[10px] text-slate-400 block font-sans">
                                Kind: {c.source_order_kind}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 text-slate-800">
                                <Buildings size={14} className="text-slate-400 shrink-0" />
                                <span className="font-semibold">{c.owner_org_id || "Platform"}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                                <User size={14} className="text-slate-400 shrink-0" />
                                <span>{c.customer_id}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-800">
                                {getSolutionLabel(c.agreed_solution || c.initial_solution)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${slaConfig.badgeClass}`}>
                                  {slaConfig.label}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                                {slaTimer.remainingText}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.badgeClass}`}>
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedCaseDetail(c)}
                                className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition border border-indigo-200 cursor-pointer"
                              >
                                Detail Kasus
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MODERASI ULASAN & RATING */}
        {activeTab === "moderation" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[240px]">
                  <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    placeholder="Cari target ID atau isi ulasan..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <select
                  value={reviewStatusFilter}
                  onChange={(e) => setReviewStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-medium cursor-pointer"
                >
                  <option value="ALL">Semua Status Moderasi</option>
                  <option value="PUBLISHED">Dipublikasikan (Published)</option>
                  <option value="HIDDEN">Disembunyikan (Hidden)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={loadReviews}
                disabled={isLoadingReviews}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 self-end md:self-center cursor-pointer"
              >
                <ArrowsClockwise size={14} className={isLoadingReviews ? "animate-spin" : ""} />
                <span>Segarkan</span>
              </button>
            </div>

            {isLoadingReviews ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
                <Clock size={28} className="animate-spin text-amber-600 mx-auto mb-2" />
                <span>Memuat data ulasan untuk moderasi...</span>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
                Tidak ada ulasan yang perlu dimoderasi.
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredReviews.map((r) => {
                  const isPublished = r.status === "VISIBLE" || r.status === "PUBLISHED";

                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedReviewDetail(r)}
                      className={`p-4 rounded-2xl border transition shadow-xs cursor-pointer hover:border-indigo-300 ${
                        isPublished
                          ? "bg-white border-slate-200/80"
                          : "bg-slate-50/80 border-slate-300 opacity-80"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              r.target_type === "PRODUCT"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : r.target_type === "SERVICE"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {r.target_type}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {r.target_id}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ID: {r.id.slice(0, 8)}...
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
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

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isPublished
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-rose-50 text-rose-800 border-rose-300"
                            }`}
                          >
                            {isPublished ? "PUBLISHED" : "HIDDEN"}
                          </span>
                        </div>
                      </div>

                      <div className="py-2.5 space-y-2">
                        {r.review_text ? (
                          <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                            {r.review_text}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            (Customer hanya memberikan rating bintang tanpa catatan ulasan)
                          </p>
                        )}

                        {r.media_refs && r.media_refs.length > 0 && (
                          <div className="flex gap-2 pt-1">
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
                          <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs">
                            <span className="font-bold text-blue-900 block mb-0.5">Tanggapan Pelaku Usaha:</span>
                            <p className="text-slate-700 italic">{r.reply.reply_text}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-slate-400">
                          Diajukan: {formatWibDateTime(r.submitted_at)}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedReviewDetail(r)}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                          >
                            Detail &amp; Log Moderasi
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setModeratingReview(r);
                              setModerationReason("");
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                              isPublished
                                ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {isPublished ? (
                              <>
                                <EyeSlash size={14} />
                                <span>Sembunyikan Ulasan</span>
                              </>
                            ) : (
                              <>
                                <Eye size={14} />
                                <span>Tampilkan Kembali</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Moderation Confirmation Modal */}
      <AnimatePresence>
        {moderatingReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs"
            >
              <h3 className="font-bold text-sm text-slate-900">
                Konfirmasi Tindakan Moderasi Ulasan
              </h3>
              <p className="text-slate-600">
                Anda akan mengubah status ulasan ini menjadi:{" "}
                <strong className={moderatingReview.status === "PUBLISHED" ? "text-rose-600" : "text-emerald-600"}>
                  {moderatingReview.status === "PUBLISHED" ? "DISEMBUNYIKAN (HIDDEN)" : "DITAMPILKAN (PUBLISHED)"}
                </strong>
                .
              </p>

              <form onSubmit={handleModerateSubmit} className="space-y-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Alasan / Catatan Audit Moderasi (Wajib):
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    placeholder="Contoh: Mengandung kata-kata ofensif atau spam promosi..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModeratingReview(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingModeration}
                    className={`px-5 py-2 font-bold text-white rounded-xl shadow-sm cursor-pointer disabled:opacity-50 ${
                      moderatingReview.status === "PUBLISHED"
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {isSubmittingModeration ? "Menyimpan..." : "Simpan Tindakan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Moderation Detail & Audit Log Modal (A02 Detail Card) */}
      <AnimatePresence>
        {selectedReviewDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Detail Ulasan &amp; Audit Moderasi
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID Entry: {selectedReviewDetail.id}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReviewDetail(null)}
                  className="font-bold text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Penilaian</span>
                  <span className="font-bold text-slate-900">
                    {selectedReviewDetail.target_type} ({selectedReviewDetail.target_id})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Rating Bintang</span>
                  <span className="font-bold text-amber-600">★ {selectedReviewDetail.rating}.0 / 5.0</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Pelanggan</span>
                  <span className="font-bold text-slate-800">
                    {selectedReviewDetail.customer_display_name || selectedReviewDetail.submission?.customer_id || "Pelanggan"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Status Visibilitas</span>
                  <span className="font-bold text-slate-800">{selectedReviewDetail.status}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  Isi Komentar Pelanggan:
                </span>
                <p className="p-3 bg-white rounded-xl border border-slate-200 text-slate-700">
                  {selectedReviewDetail.review_text || selectedReviewDetail.text || "(Hanya penilaian bintang tanpa teks)"}
                </p>
              </div>

              {selectedReviewDetail.reply && (
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-900 uppercase block mb-0.5">
                    Balasan Resmi Pelaku Usaha:
                  </span>
                  <p className="text-slate-700">{selectedReviewDetail.reply.reply_text || selectedReviewDetail.reply.text}</p>
                </div>
              )}

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1.5">
                  Riwayat Log Moderasi Admin:
                </span>
                {(selectedReviewDetail.moderations || []).length === 0 ? (
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 italic">
                    Belum pernah ada tindakan moderasi pada ulasan ini.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(selectedReviewDetail.moderations || []).map((mod) => (
                      <div key={mod.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>{mod.action} oleh {mod.admin_id}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {formatWibDateTime(mod.occurred_at)}
                          </span>
                        </div>
                        <p className="text-slate-600">Alasan: {mod.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedReviewDetail;
                    setSelectedReviewDetail(null);
                    setModeratingReview(target);
                    setModerationReason("");
                  }}
                  className="px-4 py-2 font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition cursor-pointer"
                >
                  Ubah Status Moderasi
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReviewDetail(null)}
                  className="px-5 py-2 font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Case Oversight Modal */}
      <AnimatePresence>
        {selectedCaseDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 font-mono">
                    #{selectedCaseDetail.case_number || selectedCaseDetail.id}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {getCaseTypeLabel(selectedCaseDetail.case_type)} • Versi {selectedCaseDetail.version}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCaseDetail(null)}
                  className="font-bold text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Order Asal</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedCaseDetail.source_merchant_order_id || selectedCaseDetail.source_order_id}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Pelaku Usaha</span>
                  <span className="font-bold text-slate-800">{selectedCaseDetail.owner_org_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Solusi Yang Diminta</span>
                  <span className="font-bold text-blue-600">
                    {getSolutionLabel(selectedCaseDetail.initial_solution)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Solusi Disepakati</span>
                  <span className="font-bold text-emerald-600">
                    {selectedCaseDetail.agreed_solution ? getSolutionLabel(selectedCaseDetail.agreed_solution) : "Belum Disepakati"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  Deskripsi Kendala yang Dilaporkan:
                </span>
                <p className="p-3 bg-white rounded-xl border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedCaseDetail.description}
                </p>
              </div>

              {/* Event Timeline Log */}
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1.5">
                  Log Kronologis Kejadian (Audit Trail):
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(selectedCaseDetail.events || []).map((ev) => (
                    <div key={ev.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>{ev.event_type}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {formatWibDateTime(ev.created_at)}
                        </span>
                      </div>
                      <p className="text-slate-600">{ev.reason || "Dicatat secara otomatis oleh sistem."}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedCaseDetail(null)}
                  className="px-5 py-2 font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
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
