"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Star,
  ChatCircleText,
  Wrench,
  ShieldCheck,
  MagnifyingGlass,
  CheckCircle,
  Clock,
  ArrowsClockwise,
  X,
  PaperPlaneRight,
  Eye,
  CalendarBlank,
  Receipt,
  Sparkle,
} from "@phosphor-icons/react";
import {
  afterSalesApi,
  ReviewEntryDto,
  BusinessReviewSummary,
} from "@/lib/afterSalesApi";

function formatDateID(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ProviderReviewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkReviewId = searchParams.get("reviewId");

  const [reviews, setReviews] = useState<ReviewEntryDto[]>([]);
  const [reviewSummary, setReviewSummary] = useState<BusinessReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [reviewFilter, setReviewFilter] = useState<"ALL" | "SERVICE" | "PROVIDER" | "UNREPLIED">("ALL");
  const [starFilter, setStarFilter] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [viewingReview, setViewingReview] = useState<ReviewEntryDto | null>(null);
  const [replyingReview, setReplyingReview] = useState<ReviewEntryDto | null>(null);
  const [replyText, setReplyText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const revRes = await afterSalesApi.business.getReviews({ per_page: 50 });
      const fetchedReviews = Array.isArray(revRes.data) ? revRes.data : [];
      setReviews(fetchedReviews);
      if (revRes.meta?.summary) {
        setReviewSummary(revRes.meta.summary);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal memuat data rating & ulasan penyedia jasa."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Deep-link ?reviewId=<id> support from notifications
  useEffect(() => {
    if (deepLinkReviewId && reviews.length > 0) {
      const target = reviews.find((r) => String(r.id) === String(deepLinkReviewId));
      if (target) {
        setViewingReview(target);
      }
    }
  }, [deepLinkReviewId, reviews]);

  const handleReplySubmit = async () => {
    if (!replyingReview || !replyText.trim()) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await afterSalesApi.business.replyReview(replyingReview.id, {
        text: replyText.trim(),
      });
      setReplyingReview(null);
      setReplyText("");
      await loadData();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal mengirim balasan resmi.");
    } finally {
      setActionLoading(false);
    }
  };

  // Compute KPI metrics (strictly SERVICE and PROVIDER — no Worker rating)
  const serviceReviews = useMemo(
    () => reviews.filter((r) => r.target_type === "SERVICE" && r.status !== "HIDDEN"),
    [reviews]
  );
  const providerReviews = useMemo(
    () => reviews.filter((r) => r.target_type === "PROVIDER" && r.status !== "HIDDEN"),
    [reviews]
  );

  const serviceAvg =
    reviewSummary?.service_average_rating ??
    reviewSummary?.item_average_rating ??
    (serviceReviews.length > 0
      ? Number(
          (
            serviceReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) /
            serviceReviews.length
          ).toFixed(2)
        )
      : 0);
  const serviceTotal =
    reviewSummary?.service_total_ratings ??
    reviewSummary?.item_total_ratings ??
    serviceReviews.length;

  const providerAvg =
    reviewSummary?.provider_average_rating ??
    reviewSummary?.business_average_rating ??
    (providerReviews.length > 0
      ? Number(
          (
            providerReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) /
            providerReviews.length
          ).toFixed(2)
        )
      : 0);
  const providerTotal =
    reviewSummary?.provider_total_ratings ??
    reviewSummary?.business_total_ratings ??
    providerReviews.length;

  const totalEntries = reviewSummary?.total_reviews ?? reviews.length;
  const unrepliedCount =
    reviewSummary?.unreplied_count ?? reviews.filter((r) => !r.reply).length;

  // Star breakdown across all tenant review entries
  const starDistribution = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const s = Math.min(5, Math.max(1, Math.round(Number(r.rating || 0))));
      if (counts[s] !== undefined) counts[s] += 1;
    });
    return counts;
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (reviewFilter === "SERVICE" && r.target_type !== "SERVICE") return false;
      if (reviewFilter === "PROVIDER" && r.target_type !== "PROVIDER") return false;
      if (reviewFilter === "UNREPLIED" && r.reply) return false;
      if (starFilter !== "ALL" && Math.round(Number(r.rating)) !== starFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const orderRef = (
          r.source_order_id ||
          r.submission?.source_order_id ||
          ""
        ).toLowerCase();
        const customerName = (
          r.customer_display_name ||
          r.submission?.customer_display_name ||
          ""
        ).toLowerCase();
        const textBody = (r.text || r.review_text || r.comment || "").toLowerCase();
        const targetRef = (r.target_id || "").toLowerCase();
        if (
          !orderRef.includes(q) &&
          !customerName.includes(q) &&
          !textBody.includes(q) &&
          !targetRef.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [reviews, reviewFilter, starFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/70 text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                <Star size={14} weight="fill" className="text-amber-500" />
                Reputasi &amp; Ulasan Penyedia Jasa
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Rating &amp; Ulasan Layanan Jasa
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Pantau kualitas seluruh layanan jasa (`SERVICE`), pelayanan penyedia jasa (`PROVIDER`), dan kirim balasan resmi (tanpa penilaian individu teknisi/Worker).
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => router.push("/provider/warranty")}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
              >
                Buka Garansi Jasa
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                <ArrowsClockwise size={15} weight="bold" className={loading ? "animate-spin" : ""} />
                Muat Ulang
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold underline ml-4"
            >
              Tutup
            </button>
          </div>
        )}

        {/* 4 Mandatory KPI Cards (12E.2 & 12F.1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Kualitas Seluruh Layanan Jasa */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Kualitas Seluruh Layanan (`SERVICE`)
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                <Wrench size={18} weight="duotone" />
              </div>
            </div>
            {serviceTotal > 0 ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {Number(serviceAvg).toFixed(1)}
                  </span>
                  <div className="flex items-center text-amber-400">
                    <Star size={18} weight="fill" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500">/ 5.0</span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">
                  Dari <strong className="text-slate-800">{serviceTotal}</strong> penilaian layanan jasa
                </p>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-black text-slate-400">—</div>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">Belum ada penilaian layanan</p>
              </div>
            )}
          </div>

          {/* KPI 2: Pelayanan Penyedia Jasa */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Pelayanan Penyedia (`PROVIDER`)
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <ShieldCheck size={18} weight="duotone" />
              </div>
            </div>
            {providerTotal > 0 ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {Number(providerAvg).toFixed(1)}
                  </span>
                  <div className="flex items-center text-amber-400">
                    <Star size={18} weight="fill" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500">/ 5.0</span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">
                  Dari <strong className="text-slate-800">{providerTotal}</strong> penilaian penyedia jasa
                </p>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-black text-slate-400">—</div>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">Belum ada penilaian penyedia</p>
              </div>
            )}
          </div>

          {/* KPI 3: Total Entri Ulasan Masuk */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Total Entri Ulasan Masuk
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <ChatCircleText size={18} weight="duotone" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">{totalEntries}</div>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              Gabungan entri layanan ({serviceTotal}) + penyedia ({providerTotal})
            </p>
          </div>

          {/* KPI 4: Ulasan Belum Dibalas */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Ulasan Belum Dibalas
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <Clock size={18} weight="duotone" />
              </div>
            </div>
            <div className="text-3xl font-black text-rose-600">{unrepliedCount}</div>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              {unrepliedCount > 0
                ? "Menunggu tanggapan resmi penyedia jasa"
                : "Semua ulasan telah memiliki balasan resmi"}
            </p>
          </div>
        </div>

        {/* Distribusi Bintang & Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-black text-slate-900">Distribusi Bintang &amp; Filter Ulasan</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Filter berdasarkan target penilaian (`SERVICE` / `PROVIDER`), status balasan, atau tingkat bintang.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setStarFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  starFilter === "ALL"
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Semua Bintang ({reviews.length})
              </button>
              {[5, 4, 3, 2, 1].map((star) => (
                <button
                  key={star}
                  onClick={() => setStarFilter(starFilter === star ? "ALL" : star)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    starFilter === star
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-amber-50/70 text-amber-900 border border-amber-200/70 hover:bg-amber-100/80"
                  }`}
                >
                  <span>{star}</span>
                  <Star size={12} weight="fill" className={starFilter === star ? "text-white" : "text-amber-500"} />
                  <span className="opacity-75">({starDistribution[star] || 0})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: "ALL", label: `Semua (${reviews.length})` },
                { key: "SERVICE", label: `Ulasan Layanan (${serviceReviews.length})` },
                { key: "PROVIDER", label: `Pelayanan Penyedia (${providerReviews.length})` },
                { key: "UNREPLIED", label: `Belum Dibalas (${unrepliedCount})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setReviewFilter(tab.key as typeof reviewFilter)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    reviewFilter === tab.key
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
                placeholder="Cari Order ID, pelanggan, layanan, komentar..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Daftar Ulasan */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Memuat ulasan pelanggan jasa...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <ChatCircleText size={24} weight="duotone" />
            </div>
            <h3 className="text-base font-black text-slate-900">Belum Ada Ulasan yang Cocok</h3>
            <p className="text-xs text-slate-500 mt-1">
              Ulasan pelanggan akan tampil di sini setelah order jasa selesai dan pelanggan mengirimkan penilaian.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((rev) => {
              const isService = rev.target_type === "SERVICE";
              const customerName =
                rev.customer_display_name ||
                rev.submission?.customer_display_name ||
                "Pelanggan SERVIO";
              const orderRef =
                rev.source_order_id || rev.submission?.source_order_id || "—";
              const orderedAt = rev.ordered_at || rev.submission?.ordered_at;
              const submittedAt =
                rev.submitted_at || rev.submission?.submitted_at || rev.created_at;
              const commentText = rev.text || rev.review_text || rev.comment;
              const replyBody = rev.reply?.text || rev.reply?.reply_text;

              return (
                <div
                  key={rev.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3.5 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                            isService
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {isService ? <Wrench size={12} weight="bold" /> : <ShieldCheck size={12} weight="bold" />}
                          {isService ? "Kualitas Layanan (SERVICE)" : "Pelayanan Penyedia (PROVIDER)"}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">{customerName}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-600">
                          <Receipt size={13} />
                          Order #{orderRef}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-700">
                        Target ID: <span className="text-slate-900 font-mono">{rev.target_id}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-medium pt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <CalendarBlank size={13} className="text-slate-400" />
                          Dipesan pada: <strong className="text-slate-700">{formatDateID(orderedAt)}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={13} className="text-slate-400" />
                          Diulas pada: <strong className="text-slate-700">{formatDateID(submittedAt)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start">
                      <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200/80">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            size={14}
                            weight={idx < rev.rating ? "fill" : "regular"}
                            className={idx < rev.rating ? "text-amber-500" : "text-slate-300"}
                          />
                        ))}
                        <span className="ml-1 text-xs font-black text-amber-900">
                          {Number(rev.rating).toFixed(1)}
                        </span>
                      </div>
                      {rev.reply ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                          <CheckCircle size={13} weight="fill" />
                          Sudah Dibalas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                          Belum Dibalas
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Isi Komentar */}
                  <div className="py-3.5">
                    {commentText ? (
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                        {commentText}
                      </p>
                    ) : (
                      <p className="text-xs italic text-slate-400">
                        Pelanggan memberikan rating bintang tanpa komentar tertulis.
                      </p>
                    )}

                    {/* Media Lampiran */}
                    {rev.media_refs && rev.media_refs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {rev.media_refs.map((url, idx) => (
                          <a
                            key={`${url}-${idx}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-16 h-16 rounded-xl overflow-hidden border border-slate-200 hover:opacity-90 transition"
                          >
                            <img
                              src={url}
                              alt={`Review media ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Balasan Resmi Penyedia Jasa */}
                    {rev.reply && (
                      <div className="mt-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span className="inline-flex items-center gap-1.5 text-slate-900">
                            <Sparkle size={13} weight="fill" className="text-blue-600" />
                            Balasan Resmi Penyedia Jasa
                          </span>
                          <span>{formatDateID(rev.reply.updated_at || rev.reply.created_at)}</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                          {replyBody}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => setViewingReview(rev)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
                    >
                      <Eye size={14} weight="bold" />
                      Detail Ulasan
                    </button>
                    <button
                      onClick={() => {
                        setReplyingReview(rev);
                        setReplyText(replyBody || "");
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                    >
                      <PaperPlaneRight size={14} weight="bold" />
                      {rev.reply ? "Edit Balasan Resmi" : "Balas Ulasan"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Detail Ulasan */}
      {viewingReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
                  Detail Penilaian Pelanggan Jasa
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Order #{viewingReview.source_order_id || viewingReview.submission?.source_order_id || "—"}
                </h3>
              </div>
              <button
                onClick={() => setViewingReview(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <div>
                  <span className="text-slate-400 block">Nama Pelanggan (Publik)</span>
                  <strong className="text-slate-900 text-sm">
                    {viewingReview.customer_display_name ||
                      viewingReview.submission?.customer_display_name ||
                      "Pelanggan SERVIO"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Tipe Penilaian</span>
                  <strong className="text-slate-900">
                    {viewingReview.target_type === "SERVICE"
                      ? "Kualitas Layanan Jasa (SERVICE)"
                      : "Pelayanan Penyedia Jasa (PROVIDER)"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Dipesan Pada</span>
                  <strong className="text-slate-800">
                    {formatDateID(viewingReview.ordered_at || viewingReview.submission?.ordered_at)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Diulas Pada</span>
                  <strong className="text-slate-800">
                    {formatDateID(
                      viewingReview.submitted_at ||
                        viewingReview.submission?.submitted_at ||
                        viewingReview.created_at
                    )}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Rating:</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      weight={i < viewingReview.rating ? "fill" : "regular"}
                      className={i < viewingReview.rating ? "text-amber-500" : "text-slate-300"}
                    />
                  ))}
                  <span className="font-black text-slate-900 ml-1">
                    {viewingReview.rating} / 5
                  </span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Komentar Pelanggan:</span>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed">
                  {viewingReview.text ||
                    viewingReview.review_text ||
                    viewingReview.comment ||
                    "Tidak ada komentar tertulis."}
                </div>
              </div>

              {viewingReview.reply && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">
                    Balasan Resmi Penyedia Jasa:
                  </span>
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-slate-800 leading-relaxed">
                    {viewingReview.reply.text || viewingReview.reply.reply_text}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  const target = viewingReview;
                  setViewingReview(null);
                  setReplyingReview(target);
                  setReplyText(target.reply?.text || target.reply?.reply_text || "");
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
              >
                {viewingReview.reply ? "Edit Balasan Resmi" : "Balas Ulasan Ini"}
              </button>
              <button
                onClick={() => setViewingReview(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Balas / Edit Balasan Resmi */}
      {replyingReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
                  Tanggapan Resmi Penyedia Jasa
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  {replyingReview.reply ? "Edit Balasan Resmi" : "Balas Ulasan Pelanggan"}
                </h3>
              </div>
              <button
                onClick={() => setReplyingReview(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <strong className="text-slate-900">
                  {replyingReview.customer_display_name ||
                    replyingReview.submission?.customer_display_name ||
                    "Pelanggan SERVIO"}
                </strong>
                <span className="font-bold text-amber-600">{replyingReview.rating} ★</span>
              </div>
              <p className="text-slate-600">
                {replyingReview.text ||
                  replyingReview.review_text ||
                  replyingReview.comment ||
                  "Rating bintang tanpa teks ulasan."}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Isi Balasan Resmi Penyedia Jasa
              </label>
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Tulis tanggapan sopan dan profesional yang akan tampil secara publik di bawah ulasan pelanggan..."
                className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setReplyingReview(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleReplySubmit}
                disabled={actionLoading || !replyText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                <PaperPlaneRight size={14} weight="bold" />
                {actionLoading ? "Menyimpan..." : "Simpan Balasan Resmi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProviderReviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center p-8">
          <div className="text-sm font-bold text-slate-600">
            Memuat halaman Rating &amp; Ulasan Penyedia Jasa...
          </div>
        </div>
      }
    >
      <ProviderReviewsContent />
    </Suspense>
  );
}
