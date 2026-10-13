"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Star,
  ChatCircleText,
  CheckCircle,
  PaperPlaneRight,
  ShieldCheck,
  ThumbsUp,
  SlidersHorizontal,
  ArrowRight,
  User,
} from "@phosphor-icons/react";

interface CustomerReview {
  id: string;
  orderId: string;
  customerName: string;
  rating: number;
  date: string;
  serviceTitle: string;
  comment: string;
  photos?: string[];
  officialResponse?: {
    text: string;
    respondedAt: string;
  };
}

export default function ProviderRatingsPage() {
  const [reviews, setReviews] = useState<CustomerReview[]>([
    {
      id: "rev-1",
      orderId: "ord-srv-101",
      customerName: "Sarah Wijaya",
      rating: 5,
      date: "20 September 2026",
      serviceTitle: "Cuci & Servis Komprehensif AC Inverter",
      comment:
        "Pelayanan luar biasa rapi! Teknisi Pak Budi datang tepat waktu, lantai dipasangi plastik pelindung sehingga tidak ada cipratan air kotor sama sekali. AC jadi dingin maksimal!",
      photos: [
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80",
      ],
      officialResponse: {
        text: "Terima kasih banyak Bu Sarah atas kepercayaannya pada Bintang Teknik Mandiri. Kami selalu mengutamakan kerapian dan kepuasan Anda!",
        respondedAt: "20 Sep 2026, 17:30 WIB",
      },
    },
    {
      id: "rev-2",
      orderId: "ord-srv-104",
      customerName: "Bambang Sudiro",
      rating: 4,
      date: "19 September 2026",
      serviceTitle: "Reparasi PCB & Penggantian Sensor IC",
      comment:
        "Pengerjaan workshop sangat cepat, AC kantor yang sebelumnya mati total kini hidup normal kembali. Sedikit masukan untuk kurir pickup agar bisa lebih pagi tiba.",
    },
    {
      id: "rev-3",
      orderId: "ord-srv-102",
      customerName: "Diana Maharani",
      rating: 5,
      date: "17 September 2026",
      serviceTitle: "Hydro Cleaning & Sanitasi Kasur King Size",
      comment:
        "Sangat higienis dan wangi lavender organiknya tahan lama. Hasil air vakumnya diperlihatkan langsung ke saya, benar-benar bersih!",
      photos: [
        "https://images.unsplash.com/photo-1540518614846-7ede433c4ef7?w=300&auto=format&fit=crop&q=80",
      ],
    },
  ]);

  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [starFilter, setStarFilter] = useState<number | "ALL">("ALL");
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  // CSAT Metrics calculation
  const totalReviews = reviews.length;
  const avgRating = (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1);
  const fiveStarsCount = reviews.filter((r) => r.rating === 5).length;
  const fourStarsCount = reviews.filter((r) => r.rating === 4).length;
  const responseRate = Math.round(
    (reviews.filter((r) => r.officialResponse).length / totalReviews) * 100
  );

  const handleSendResponse = (reviewId: string) => {
    if (!replyText.trim()) return;

    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              officialResponse: {
                text: replyText.trim(),
                respondedAt: new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }) + ", " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
              },
            }
          : r
      )
    );

    setActiveReplyId(null);
    setReplyText("");
    setAlertSuccess("Tanggapan resmi mitra berhasil dipublikasikan pada halaman ulasan toko Anda.");
  };

  const filteredReviews = reviews.filter((r) => {
    if (starFilter === "ALL") return true;
    return r.rating === starFilter;
  });

  return (
    <div className="space-y-6 font-body text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display text-neutral-dark">
              Manajemen Ulasan & Kepuasan Pelanggan (CSAT)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Verified Public Reviews
            </span>
          </div>
          <p className="text-sm text-neutral-slate mt-1">
            Pantau feedback nyata pelanggan, respon ulasan secara resmi, dan jaga reputasi bintang bengkel Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-neutral-slate shadow-servio-xs">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Rating Autentik 100% dari Order Selesai</span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {alertSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
            <span>{alertSuccess}</span>
          </div>
          <button onClick={() => setAlertSuccess(null)} className="text-xs font-bold text-emerald-700 hover:underline">
            Tutup
          </button>
        </div>
      )}

      {/* CSAT Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Rating Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-servio-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 border border-amber-200 flex flex-col items-center justify-center shrink-0">
            <span className="text-xl font-bold font-display leading-none">{avgRating}</span>
            <div className="flex gap-0.5 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={8} weight="fill" className="text-amber-500" />
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs text-neutral-slate font-medium block">Rating Rata-rata</span>
            <span className="text-sm font-bold text-neutral-dark">Bintang Unggul (4.9/5)</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Dari {totalReviews} ulasan terverifikasi</span>
          </div>
        </div>

        {/* CSAT Score Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-servio-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 font-bold font-display text-lg">
            98%
          </div>
          <div>
            <span className="text-xs text-neutral-slate font-medium block">Indeks Kepuasan (CSAT)</span>
            <span className="text-sm font-bold text-neutral-dark">Sangat Memuaskan</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Berdasarkan survei kelayakan</span>
          </div>
        </div>

        {/* Response Rate Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-servio-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky text-primary border border-sky-light flex items-center justify-center shrink-0 font-bold font-display text-lg">
            {responseRate}%
          </div>
          <div>
            <span className="text-xs text-neutral-slate font-medium block">Tingkat Balasan Resmi</span>
            <span className="text-sm font-bold text-neutral-dark">Cepat & Responsif</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Meningkatkan kepercayaan pembeli</span>
          </div>
        </div>

        {/* Star Breakdown Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-servio-xs space-y-1.5 justify-center flex flex-col text-xs">
          <div className="flex items-center justify-between text-neutral-slate">
            <span>5 Bintang:</span>
            <span className="font-bold text-neutral-dark">{fiveStarsCount} review</span>
          </div>
          <div className="flex items-center justify-between text-neutral-slate">
            <span>4 Bintang:</span>
            <span className="font-bold text-neutral-dark">{fourStarsCount} review</span>
          </div>
          <div className="flex items-center justify-between text-neutral-slate">
            <span>1-3 Bintang:</span>
            <span className="font-bold text-neutral-dark">0 review</span>
          </div>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <span className="text-xs font-bold text-neutral-dark mr-1 flex items-center gap-1">
          <SlidersHorizontal size={14} />
          Filter:
        </span>
        <button
          onClick={() => setStarFilter("ALL")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
            starFilter === "ALL"
              ? "bg-neutral-dark text-white"
              : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
          }`}
        >
          Semua Rating
        </button>
        <button
          onClick={() => setStarFilter(5)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
            starFilter === 5
              ? "bg-amber-500 text-white"
              : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
          }`}
        >
          ★ 5 Saja
        </button>
        <button
          onClick={() => setStarFilter(4)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
            starFilter === 4
              ? "bg-amber-500 text-white"
              : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
          }`}
        >
          ★ 4 Saja
        </button>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <div
            key={review.id}
            className="p-5 bg-white rounded-3xl border border-slate-200 shadow-servio-xs space-y-4"
          >
            {/* Review Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky text-primary flex items-center justify-center font-bold font-display text-sm">
                  {review.customerName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-neutral-dark">{review.customerName}</h4>
                  <p className="text-[11px] text-neutral-slate">
                    {review.serviceTitle} • <span className="font-mono text-slate-400">#{review.orderId}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      weight={i < review.rating ? "fill" : "regular"}
                      className={i < review.rating ? "text-amber-500" : "text-slate-200"}
                    />
                  ))}
                </div>
                <span className="text-xs text-neutral-slate">{review.date}</span>
              </div>
            </div>

            {/* Review Comment */}
            <p className="text-xs text-neutral-dark leading-relaxed">
              &ldquo;{review.comment}&rdquo;
            </p>

            {/* Photos if any */}
            {review.photos && review.photos.length > 0 && (
              <div className="flex gap-2">
                {review.photos.map((url, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                    <Image src={url} alt="Review attachment" fill unoptimized className="object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Official Response if already given */}
            {review.officialResponse ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-primary font-bold">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={16} weight="fill" />
                    <span>Tanggapan Resmi dari Pemilik Toko (Mitra Bintang Teknik)</span>
                  </div>
                  <span className="text-[10px] text-neutral-slate font-normal">
                    {review.officialResponse.respondedAt}
                  </span>
                </div>
                <p className="text-neutral-dark pt-1 leading-relaxed">
                  {review.officialResponse.text}
                </p>
              </div>
            ) : activeReplyId === review.id ? (
              /* Reply Composer */
              <div className="p-4 rounded-2xl bg-sky/30 border border-sky-light space-y-3">
                <label className="text-xs font-bold text-neutral-dark block">
                  Tulis Balasan Resmi Publik:
                </label>
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Terima kasih atas kepercayaannya... Kami berkomitmen menjaga kualitas..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setActiveReplyId(null)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-neutral-slate"
                  >
                    Batal
                  </button>
                  <button
                    disabled={!replyText.trim()}
                    onClick={() => handleSendResponse(review.id)}
                    className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Kirim Balasan Resmi</span>
                    <PaperPlaneRight size={14} weight="bold" />
                  </button>
                </div>
              </div>
            ) : (
              /* Button to open reply composer */
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveReplyId(review.id);
                    setReplyText("");
                  }}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-neutral-dark flex items-center gap-1.5 transition-colors"
                >
                  <ChatCircleText size={15} className="text-primary" />
                  <span>Beri Tanggapan Resmi</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
