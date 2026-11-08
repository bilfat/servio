"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Star,
  ArrowLeft,
  Camera,
  CheckCircle,
  ThumbsUp,
  Sparkle,
  X,
  ChatCircleText,
  Storefront,
  Wrench,
  Package,
  WarningCircle,
  Clock,
} from "@phosphor-icons/react";
import { Toast } from "@/components/feedback/Toast";
import { afterSalesApi, ReviewSubmission } from "@/lib/afterSalesApi";
import { useServiceOrder } from "@/features/orders/useServiceOrder";
import { useOrderBarang } from "@/features/order-barang/hooks/useOrderBarang";
import { useOrderJasa } from "@/features/order-jasa/hooks/useOrderJasa";

const PRESET_TAGS = [
  "Sangat Tepat Waktu",
  "Pengerjaan Bersih & Rapi",
  "Kualitas Produk Original & Sesuai",
  "Kemasan Aman & Rapi",
  "Penjelasan Sangat Jelas",
  "Pelayanan Ramah & Responsif",
  "Harga Transparan Sesuai",
];

export default function RatingReviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = (params?.orderId as string) || "";
  const orderType = searchParams.get("type") || "SERVICE"; // 'GOODS' or 'SERVICE'
  const isGoods = orderType.toUpperCase() === "GOODS" || orderId.startsWith("ORD-PRD");

  const { order } = useServiceOrder(orderId);
  const { customerOrders } = useOrderBarang();
  const { orders: serviceOrders05B } = useOrderJasa();

  const matchedGoodsOrder = customerOrders.find(
    (o) => o.id === orderId || o.orderNumber === orderId
  );
  const matchedServiceOrder = serviceOrders05B.find(
    (o) => o.id === orderId || o.orderNumber === orderId
  );

  // Existing Review State
  const [existingReview, setExistingReview] = useState<ReviewSubmission | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState(true);

  // Rating state: 1 target item (Product/Service) + 1 target business (Merchant/Provider)
  const [itemRating, setItemRating] = useState(5);
  const [businessRating, setBusinessRating] = useState(5);

  const [selectedTags, setSelectedTags] = useState<string[]>([
    "Sangat Tepat Waktu",
    "Pengerjaan Bersih & Rapi",
  ]);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch existing review on mount
  useEffect(() => {
    let isMounted = true;
    async function checkReview() {
      if (!orderId) return;
      setIsLoadingReview(true);
      try {
        const res = await afterSalesApi.customer.getMyReview(orderId);
        if (isMounted && res.data) {
          setExistingReview(res.data);
        }
      } catch {
        // If not found or error, review can still be submitted
      } finally {
        if (isMounted) setIsLoadingReview(false);
      }
    }
    checkReview();
    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddPhoto = () => {
    if (photos.length >= 3) return;
    const samples = [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80",
    ];
    setPhotos((prev) => [...prev, samples[prev.length % samples.length]]);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const fullText = [
        selectedTags.length > 0 ? `[${selectedTags.join(", ")}]` : "",
        comment.trim(),
      ]
        .filter(Boolean)
        .join("\n\n");

      // Resolve authentic item & business targets from order context
      const ratingsPayload: Array<{
        target_type: "PRODUCT" | "SERVICE" | "MERCHANT" | "PROVIDER";
        target_id: string;
        rating: number;
        text?: string;
        source_item_key?: string;
        media_refs?: string[];
      }> = [];

      if (isGoods && matchedGoodsOrder?.items?.length) {
        const seenProducts = new Set<string>();
        for (const it of matchedGoodsOrder.items) {
          const pid = it.productId || it.id;
          if (!pid || seenProducts.has(pid)) continue;
          seenProducts.add(pid);
          ratingsPayload.push({
            target_type: "PRODUCT",
            target_id: pid,
            rating: itemRating,
            text: fullText || undefined,
            source_item_key: it.id,
            media_refs: photos.length > 0 ? photos : undefined,
          });
        }
        ratingsPayload.push({
          target_type: "MERCHANT",
          target_id: matchedGoodsOrder.merchantId || "merch-jaya-motor",
          rating: businessRating,
          text: fullText || undefined,
        });
      } else {
        const targetItemId = isGoods
          ? matchedGoodsOrder?.items?.[0]?.productId || matchedGoodsOrder?.items?.[0]?.id || orderId
          : (matchedServiceOrder as any)?.serviceId || matchedServiceOrder?.serviceSnapshot?.id || order.serviceId || orderId;
        const targetBusinessId = isGoods
          ? matchedGoodsOrder?.merchantId || "merch-jaya-motor"
          : matchedServiceOrder?.providerId || order.providerId || "prov-surya-teknik";

        ratingsPayload.push(
          {
            target_type: isGoods ? "PRODUCT" : "SERVICE",
            target_id: targetItemId,
            rating: itemRating,
            text: fullText || undefined,
            media_refs: photos.length > 0 ? photos : undefined,
          },
          {
            target_type: isGoods ? "MERCHANT" : "PROVIDER",
            target_id: targetBusinessId,
            rating: businessRating,
            text: fullText || undefined,
          }
        );
      }

      const res = await afterSalesApi.customer.submitReview({
        source_kind: isGoods ? "GOODS" : "SERVICE",
        source_order_id: orderId,
        source_merchant_order_id: isGoods ? matchedGoodsOrder?.id || orderId : undefined,
        ratings: ratingsPayload,
      });

      if (!res.data) {
        throw new Error(res.message || "Gagal menerbitkan ulasan.");
      }

      setExistingReview(res.data);
      setToastMessage("Terima kasih! Ulasan dan rating Anda berhasil diterbitkan secara resmi.");
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menyimpan ulasan. Pastikan pesanan telah selesai.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const backUrl = isGoods
    ? `/orders/products/${orderId}`
    : `/orders/${orderId}`;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={backUrl}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Ulasan & Rating
              </span>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                {isGoods ? "Ulasan Produk & Toko" : "Ulasan Layanan & Mitra"}
              </h1>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">#{orderId}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {isLoadingReview ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <Clock size={32} className="animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Memeriksa status ulasan pesanan...</p>
          </div>
        ) : existingReview ? (
          /* READ-ONLY VIEW WHEN REVIEW ALREADY SUBMITTED */
          <div className="space-y-6">
            <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle size={24} weight="fill" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">Ulasan Anda Telah Terverifikasi</h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Ulasan ini telah dipublikasikan dan mempengaruhi reputasi resmi penyedia layanan / toko.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 bg-white text-emerald-800 rounded-full border border-emerald-300">
                Resmi Terbit
              </span>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                <Sparkle size={18} weight="fill" className="text-amber-500" />
                Rincian Ulasan yang Diberikan
              </h3>

              <div className="space-y-4">
                {(existingReview.entries || []).map((entry, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {entry.target_type === "PRODUCT" ? (
                          <Package size={18} className="text-blue-600" />
                        ) : entry.target_type === "SERVICE" ? (
                          <Wrench size={18} className="text-purple-600" />
                        ) : (
                          <Storefront size={18} className="text-emerald-600" />
                        )}
                        <span className="text-xs font-bold text-slate-800">
                          {entry.target_type === "PRODUCT"
                            ? "Penilaian Produk"
                            : entry.target_type === "SERVICE"
                            ? "Penilaian Layanan Jasa"
                            : "Penilaian Pelaku Usaha / Mitra"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            weight={star <= entry.rating ? "fill" : "regular"}
                            className={star <= entry.rating ? "text-amber-400" : "text-slate-300"}
                          />
                        ))}
                        <span className="text-xs font-bold text-slate-700 ml-1.5">{entry.rating}.0</span>
                      </div>
                    </div>

                    {entry.review_text && (
                      <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                        {entry.review_text}
                      </p>
                    )}

                    {entry.media_refs && entry.media_refs.length > 0 && (
                      <div className="flex gap-2 pt-1">
                        {entry.media_refs.map((m, mIdx) => (
                          <div key={mIdx} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m} alt={`Bukti ${mIdx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Business Reply */}
                    {entry.reply && (
                      <div className="mt-2 p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-blue-900">
                          <Storefront size={14} />
                          <span>Tanggapan dari Penjual / Penyedia:</span>
                        </div>
                        <p className="text-slate-700 italic">{entry.reply.reply_text}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href={backUrl}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
                >
                  Kembali ke Detail Pesanan
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* SUBMIT REVIEW FORM */
          <form onSubmit={handleSubmitReview} className="space-y-6">
            {errorMessage && (
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-300 text-xs text-rose-800 flex items-start gap-2.5">
                <WarningCircle size={18} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Target Header Banner */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#0F4C81]">Pesanan Selesai</p>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  {isGoods ? "Suku Cadang & Komponen Kendaraan" : order.serviceTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pihak Terkait:{" "}
                  <span className="font-semibold text-slate-700">
                    {isGoods ? "Jaya Motor Official" : order.providerName}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 px-4 py-2.5 rounded-2xl border border-amber-200/80 shrink-0">
                <Star size={24} weight="fill" className="text-amber-500" />
                <div className="leading-tight">
                  <span className="text-lg font-bold text-slate-900">
                    {((itemRating + businessRating) / 2).toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400"> / 5.0</span>
                  <p className="text-[10px] text-amber-700 font-bold uppercase">Rata-rata</p>
                </div>
              </div>
            </div>

            {/* Granular Ratings: 1 for Item, 1 for Business */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-1">
                  <Sparkle size={20} weight="duotone" className="text-amber-500" />
                  Penilaian Kualitas & Kepuasan
                </h3>
                <p className="text-[11px] text-slate-400">
                  Sesuai ketentuan, penilaian diberikan secara terpisah untuk objek (produk/jasa) dan pelaku usaha.
                </p>
              </div>

              <div className="space-y-4">
                {/* 1. Item Rating */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {isGoods ? "Kualitas Fisik & Fungsi Produk" : "Kualitas Hasil Pekerjaan Layanan"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {isGoods
                        ? "Kesesuaian dengan deskripsi, orisinalitas, dan kelengkapan"
                        : "Kerapihan hasil pengerjaan, ketepatan solusi, dan kepuasan teknis"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setItemRating(star)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          size={26}
                          weight={star <= itemRating ? "fill" : "regular"}
                          className={star <= itemRating ? "text-amber-400" : "text-slate-300"}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-2">{itemRating}.0</span>
                  </div>
                </div>

                {/* 2. Business Rating */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {isGoods ? "Pelayanan Toko / Merchant" : "Pelayanan Mitra Penyedia Jasa"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {isGoods
                        ? "Kecepatan proses pesanan, keramahan komunikasi, dan pengemasan"
                        : "Ketepatan jadwal kehadiran, kejelasan koordinasi, dan kepatuhan SOP"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setBusinessRating(star)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          size={26}
                          weight={star <= businessRating ? "fill" : "regular"}
                          className={star <= businessRating ? "text-amber-400" : "text-slate-300"}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-2">{businessRating}.0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tags */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ThumbsUp size={20} weight="duotone" className="text-[#0F4C81]" />
                Kelebihan yang Paling Menonjol (Tag Cepat)
              </h3>
              <div className="flex flex-wrap gap-2">
                {PRESET_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                        isSelected
                          ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Testimonial & Photos */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ChatCircleText size={20} weight="duotone" className="text-[#0F4C81]" />
                Ulasan Tertulis & Dokumentasi Foto
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Tulis Ulasan Anda (Opsional namun sangat membantu)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="Ceritakan pengalaman kepuasan Anda mengenai produk atau pengerjaan layanan ini..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81] focus:border-transparent resize-none font-medium"
                />
              </div>

              {/* Photo Previews */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Lampiran Foto Produk / Hasil Kerja (Maks. 3 Foto)
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  {photos.map((url, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      >
                        <X size={12} weight="bold" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 3 && (
                    <button
                      type="button"
                      onClick={handleAddPhoto}
                      className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#0F4C81] flex flex-col items-center justify-center text-slate-400 hover:text-[#0F4C81] transition cursor-pointer"
                    >
                      <Camera size={22} weight="duotone" />
                      <span className="text-[10px] font-semibold mt-1">+ Foto</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href={backUrl}
                className="px-5 py-3 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition border border-slate-200"
              >
                Batal / Kembali
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-xl font-bold text-xs text-white bg-[#0F4C81] hover:bg-[#0c3c66] active:scale-[0.99] transition shadow-lg shadow-sky-900/15 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle size={18} weight="bold" />
                {isSubmitting ? "Menerbitkan Ulasan..." : "Kirim Ulasan Resmi"}
              </button>
            </div>
          </form>
        )}
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
