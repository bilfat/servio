"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  X,
  Storefront,
  Wrench,
  Package,
  CheckCircle,
  WarningCircle,
  ChatCircleText,
  CalendarBlank,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import {
  afterSalesApi,
  ReviewSubmission,
  ReviewEntry,
  SubmitReviewPayload,
} from "@/lib/afterSalesApi";

export interface ReviewableOrderItem {
  orderItemId: string;
  targetId: string; // product_id or service_id
  title: string;
  imageUrl?: string;
  quantity?: number;
  variantLabel?: string;
  price?: number;
}

export interface OrderReviewModalTarget {
  sourceKind: "GOODS" | "SERVICE";
  orderId: string;
  subOrderId?: string | null;
  orderNumber: string;
  orderedAt?: string | null;
  completedAt?: string | null;
  businessOrgId: string;
  businessName: string;
  items: ReviewableOrderItem[];
  existingSubmission?: ReviewSubmission | null;
  skipExistingReviewCheck?: boolean;
}

interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: OrderReviewModalTarget | null;
  onSubmitted?: (submission: ReviewSubmission) => void;
}

const STAR_LABELS: Record<number, string> = {
  1: "Sangat Buruk",
  2: "Kurang Memuaskan",
  3: "Cukup Baik",
  4: "Memuaskan",
  5: "Sangat Memuaskan",
};

function formatDateId(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function OrderReviewModal({
  isOpen,
  onClose,
  target,
  onSubmitted,
}: OrderReviewModalProps) {
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [submission, setSubmission] = useState<ReviewSubmission | null>(null);

  // Item ratings state keyed by targetId
  const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
  const [itemTexts, setItemTexts] = useState<Record<string, string>>({});

  // Business rating state (0 = not yet selected by Customer)
  const [businessRating, setBusinessRating] = useState<number>(0);
  const [businessText, setBusinessText] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [failedImageKeys, setFailedImageKeys] = useState<Record<string, boolean>>({});

  // Deduplicate items by targetId so multi-line items with the same product_id only ask once
  const distinctItems = useMemo(() => {
    if (!target?.items?.length) return [];
    const map = new Map<string, ReviewableOrderItem>();
    for (const item of target.items) {
      const key = (item.targetId || item.orderItemId).trim();
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, { ...item, targetId: key });
      }
    }
    return Array.from(map.values());
  }, [target]);

  const targetIdentityKey =
    isOpen && target
      ? `${target.sourceKind}:${target.orderId}:${target.subOrderId || ""}`
      : "";

  const distinctItemsRef = useRef(distinctItems);
  const existingSubmissionRef = useRef(target?.existingSubmission);
  const skipCheckRef = useRef(target?.skipExistingReviewCheck);
  const targetRef = useRef(target);

  useEffect(() => {
    distinctItemsRef.current = distinctItems;
    existingSubmissionRef.current = target?.existingSubmission;
    skipCheckRef.current = target?.skipExistingReviewCheck;
    targetRef.current = target;
  });

  useEffect(() => {
    const activeTarget = targetRef.current;
    if (!isOpen || !targetIdentityKey || !activeTarget) return;
    setErrorMsg(null);
    setJustSubmitted(false);
    setFailedImageKeys({});

    // Initialize empty (0 stars) for each distinct item until Customer explicitly chooses 1–5
    const initialRatings: Record<string, number> = {};
    const initialTexts: Record<string, string> = {};
    for (const it of distinctItemsRef.current) {
      initialRatings[it.targetId] = 0;
      initialTexts[it.targetId] = "";
    }
    setItemRatings(initialRatings);
    setItemTexts(initialTexts);
    setBusinessRating(0);
    setBusinessText("");

    const existing = existingSubmissionRef.current;
    if (existing) {
      setSubmission(existing);
      setLoadingExisting(false);
      return;
    }

    if (skipCheckRef.current) {
      setSubmission(null);
      setLoadingExisting(false);
      return;
    }

    let cancelled = false;
    setLoadingExisting(true);
    setSubmission(null);

    afterSalesApi.customer
      .getMyReview(activeTarget.orderId, activeTarget.subOrderId || undefined)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data && res.data.id) {
          setSubmission(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, targetIdentityKey]);

  useEffect(() => {
    if (isOpen && target?.existingSubmission) {
      setSubmission(target.existingSubmission);
      setLoadingExisting(false);
    }
  }, [isOpen, target?.existingSubmission]);

  if (!isOpen || !target) return null;

  const isGoods = target.sourceKind === "GOODS";
  const itemTargetType = isGoods ? "PRODUCT" : "SERVICE";
  const businessTargetType = isGoods ? "MERCHANT" : "PROVIDER";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    for (const it of distinctItems) {
      const r = itemRatings[it.targetId] || 0;
      if (r < 1 || r > 5) {
        setErrorMsg(`Mohon pilih rating bintang (1–5) untuk "${it.title}".`);
        return;
      }
    }

    if (businessRating < 1 || businessRating > 5) {
      setErrorMsg(
        `Mohon pilih rating bintang (1–5) untuk ${
          isGoods ? "Toko / Merchant" : "Penyedia Jasa"
        } "${target.businessName}".`
      );
      return;
    }

    const ratingsPayload: SubmitReviewPayload["ratings"] = [];

    for (const it of distinctItems) {
      ratingsPayload.push({
        target_type: itemTargetType,
        target_id: it.targetId,
        rating: itemRatings[it.targetId] || 5,
        text: (itemTexts[it.targetId] || "").trim() || undefined,
        source_item_key: it.orderItemId,
      });
    }

    ratingsPayload.push({
      target_type: businessTargetType,
      target_id: target.businessOrgId,
      rating: businessRating,
      text: businessText.trim() || undefined,
    });

    setIsSubmitting(true);
    try {
      const res = await afterSalesApi.customer.submitReview({
        source_kind: target.sourceKind,
        source_order_id: target.orderId,
        source_merchant_order_id: target.subOrderId || undefined,
        ratings: ratingsPayload,
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal mengirimkan penilaian.");
      }

      setSubmission(res.data);
      setJustSubmitted(true);
      onSubmitted?.(res.data);
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kesalahan saat menyimpan ulasan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarInput = (
    value: number,
    onChange: (val: number) => void,
    size = 24
  ) => (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 rounded-lg hover:scale-110 transition cursor-pointer focus:outline-none"
          >
            <Star
              size={size}
              weight={star <= value ? "fill" : "regular"}
              className={
                star <= value
                  ? "text-amber-400 drop-shadow-xs"
                  : "text-slate-300 hover:text-amber-300"
              }
            />
          </button>
        ))}
      </div>
      {value >= 1 ? (
        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
          {value}/5 — {STAR_LABELS[value] || "Memuaskan"}
        </span>
      ) : (
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
          Pilih 1–5 Bintang (Wajib)
        </span>
      )}
    </div>
  );

  const renderReadOnlyEntry = (entry: ReviewEntry) => {
    const isItemEntry =
      entry.target_type === "PRODUCT" || entry.target_type === "SERVICE";
    const matchedItem =
      distinctItems.find(
        (it) =>
          it.targetId === entry.target_id || it.orderItemId === entry.source_item_key
      ) || (!isGoods && entry.target_type === "SERVICE" ? distinctItems[0] : undefined);
    const title = isItemEntry
      ? matchedItem?.title ||
        (entry.target_type === "PRODUCT"
          ? `Produk (${entry.target_id})`
          : `Layanan Jasa (${entry.target_id})`)
      : `${isGoods ? "Reputasi Toko" : "Reputasi Penyedia Jasa"}: ${
          target.businessName
        }`;

    const commentText = entry.review_text ?? entry.text;
    const replyText = entry.reply?.reply_text ?? entry.reply?.text;
    const roImgKey = `ro-${entry.id}`;
    const showReadOnlyImg = Boolean(
      isItemEntry && matchedItem?.imageUrl && !failedImageKeys[roImgKey]
    );

    return (
      <div
        key={entry.id}
        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${
                isItemEntry
                  ? "bg-blue-50 text-blue-600 border border-blue-200"
                  : "bg-amber-50 text-amber-600 border border-amber-200"
              }`}
            >
              {showReadOnlyImg ? (
                <img
                  src={matchedItem!.imageUrl!}
                  alt={title}
                  onError={() =>
                    setFailedImageKeys((prev) => ({ ...prev, [roImgKey]: true }))
                  }
                  className="w-full h-full object-cover"
                />
              ) : isItemEntry ? (
                isGoods ? (
                  <Package size={18} weight="duotone" />
                ) : (
                  <Wrench size={18} weight="duotone" />
                )
              ) : (
                <Storefront size={18} weight="duotone" />
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {entry.target_type === "PRODUCT"
                  ? "Penilaian Kualitas Produk"
                  : entry.target_type === "SERVICE"
                  ? "Penilaian Kualitas Layanan Jasa"
                  : entry.target_type === "MERCHANT"
                  ? "Penilaian Layanan Toko (Merchant)"
                  : "Penilaian Penyedia Jasa (Provider)"}
              </span>
              <h4 className="text-xs font-bold text-slate-900">{title}</h4>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={14}
                weight={s <= entry.rating ? "fill" : "regular"}
                className={s <= entry.rating ? "text-amber-400" : "text-slate-200"}
              />
            ))}
            <span className="text-xs font-bold text-slate-800 ml-1">
              {entry.rating}.0
            </span>
          </div>
        </div>

        {commentText ? (
          <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200/70 leading-relaxed">
            &ldquo;{commentText}&rdquo;
          </p>
        ) : (
          <p className="text-[11px] italic text-slate-400">
            Tidak ada komentar tertulis (hanya penilaian bintang).
          </p>
        )}

        {replyText && (
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <ChatCircleText size={14} weight="fill" className="text-blue-600" />
                Balasan Resmi {target.businessName}
              </span>
              {entry.reply?.created_at && (
                <span className="text-blue-600/80 text-[10px]">
                  {formatDateId(entry.reply.created_at)}
                </span>
              )}
            </div>
            <p className="text-xs text-blue-950 leading-relaxed">{replyText}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                <Star size={20} weight="fill" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {submission
                      ? "Detail Penilaian & Ulasan Anda"
                      : isGoods
                      ? "Beri Rating & Ulasan Pesanan Barang"
                      : "Beri Rating & Ulasan Pesanan Jasa"}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {target.orderNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {target.businessName} • Tanggal Order:{" "}
                  <strong className="text-slate-700">
                    {formatDateId(submission?.ordered_at || target.orderedAt)}
                  </strong>
                  {submission?.submitted_at && (
                    <>
                      {" "}
                      • Tanggal Ulasan:{" "}
                      <strong className="text-emerald-700">
                        {formatDateId(submission.submitted_at)}
                      </strong>
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {loadingExisting ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Memeriksa status penilaian pesanan...
              </div>
            ) : submission ? (
              /* C07: Read-Only Submitted Review View */
              <div className="space-y-4">
                {justSubmitted && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                    <CheckCircle
                      size={20}
                      weight="fill"
                      className="text-emerald-600 shrink-0 mt-0.5"
                    />
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold">
                        Terima kasih! Penilaian dan ulasan Anda berhasil disimpan.
                      </p>
                      <p className="text-emerald-700">
                        Ulasan Anda telah ditampilkan secara publik pada halaman katalog dan reputasi usaha.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Nomor Pesanan
                    </span>
                    <span className="font-bold text-slate-800">
                      {target.orderNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Tanggal Pesanan
                    </span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <CalendarBlank size={13} />
                      {formatDateId(submission.ordered_at || target.orderedAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Tanggal Penilaian
                    </span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CalendarBlank size={13} />
                      {formatDateId(submission.submitted_at)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {(submission.entries || []).map(renderReadOnlyEntry)}
                </div>

                <div className="p-3 rounded-xl bg-slate-100 text-[11px] text-slate-600 flex items-center gap-2">
                  <ShieldCheck size={16} weight="fill" className="text-slate-500 shrink-0" />
                  <span>
                    Penilaian bersifat permanen (1x per pesanan selesai) untuk menjaga keaslian reputasi ekosistem SERVIO.
                  </span>
                </div>
              </div>
            ) : (
              /* C05 / C06: Submit Review Form */
              <form id="order-review-form" onSubmit={handleSubmit} className="space-y-5">
                {errorMsg && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                    <WarningCircle size={18} weight="fill" className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {!isGoods && (
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 text-[11px] text-blue-900 flex items-center gap-2">
                    <Sparkle size={16} weight="fill" className="text-blue-600 shrink-0" />
                    <span>
                      Penilaian pesanan jasa diberikan untuk <strong>Kualitas Layanan Jasa</strong> dan <strong>Reputasi Penyedia Jasa (Provider)</strong>. Teknisi/Worker tidak dinilai secara individu.
                    </span>
                  </div>
                )}

                {/* Section 1: Product(s) or Service Rating */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    1. Nilai Kualitas {isGoods ? `Produk (${distinctItems.length} Item)` : "Layanan Jasa"}
                  </h4>

                  {distinctItems.map((it) => (
                    <div
                      key={it.targetId}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {it.imageUrl && !failedImageKeys[`form-${it.targetId}`] ? (
                            <img
                              src={it.imageUrl}
                              alt={it.title}
                              onError={() =>
                                setFailedImageKeys((prev) => ({
                                  ...prev,
                                  [`form-${it.targetId}`]: true,
                                }))
                              }
                              className="w-full h-full object-cover"
                            />
                          ) : isGoods ? (
                            <Package size={20} weight="duotone" className="text-blue-600" />
                          ) : (
                            <Wrench size={20} weight="duotone" className="text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-slate-900 truncate">
                            {it.title}
                          </h5>
                          <p className="text-[11px] text-slate-500">
                            {it.quantity ? `${it.quantity}x` : "1x"}{" "}
                            {it.variantLabel ? `• ${it.variantLabel}` : ""}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Rating {isGoods ? "Produk" : "Layanan Jasa"} <span className="text-red-500">*</span>
                        </label>
                        {renderStarInput(itemRatings[it.targetId] || 0, (val) =>
                          setItemRatings((prev) => ({ ...prev, [it.targetId]: val }))
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Ulasan Tertulis (Opsional)
                        </label>
                        <textarea
                          rows={2}
                          value={itemTexts[it.targetId] || ""}
                          onChange={(e) =>
                            setItemTexts((prev) => ({
                              ...prev,
                              [it.targetId]: e.target.value,
                            }))
                          }
                          placeholder={
                            isGoods
                              ? "Bagaimana kualitas barang, kesesuaian deskripsi, dan fungsi produk ini?"
                              : "Bagaimana kualitas hasil pengerjaan dan ketepatan layanan jasa ini?"
                          }
                          className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Section 2: Merchant or Provider Rating */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    2. Nilai Reputasi {isGoods ? "Toko / Merchant" : "Penyedia Jasa (Provider)"}
                  </h4>

                  <div className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/30 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Storefront size={18} weight="duotone" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                          {isGoods ? "Pelayanan Toko / Merchant" : "Pelayanan Penyedia Jasa"}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900">
                          {target.businessName}
                        </h5>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Rating {isGoods ? "Toko / Merchant" : "Penyedia Jasa"}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      {renderStarInput(businessRating, setBusinessRating)}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Ulasan untuk {isGoods ? "Toko" : "Penyedia Jasa"} (Opsional)
                      </label>
                      <textarea
                        rows={2}
                        value={businessText}
                        onChange={(e) => setBusinessText(e.target.value)}
                        placeholder={
                          isGoods
                            ? "Bagaimana kecepatan respons, pengemasan, dan pelayanan toko?"
                            : "Bagaimana koordinasi jadwal, komunikasi, dan profesionalisme penyedia jasa?"
                        }
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
            >
              {submission ? "Tutup" : "Batal"}
            </button>

            {!submission && !loadingExisting && (
              <button
                type="submit"
                form="order-review-form"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Star size={14} weight="fill" />
                <span>{isSubmitting ? "Menyimpan Penilaian..." : "Kirim Penilaian & Ulasan"}</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
