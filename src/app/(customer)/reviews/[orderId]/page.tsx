"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Star,
  ArrowLeft,
  Camera,
  CheckCircle,
  ThumbsUp,
  UserSwitch,
  Sparkle,
  X,
  ChatCircleText,
} from "@phosphor-icons/react";
import { useServiceOrder } from "@/features/orders/useServiceOrder";
import { Toast } from "@/components/feedback/Toast";

const PRESET_TAGS = [
  "Sangat Tepat Waktu",
  "Pengerjaan Bersih & Rapi",
  "Penjelasan Sangat Jelas",
  "Alat Kerja Lengkap & Modern",
  "Sopan & Profesional",
  "Harga Transparan Sesuai Estimasi",
];

export default function RatingReviewPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params?.orderId as string) || "order-awaiting-proof";

  const { order } = useServiceOrder(orderId);

  const [ratings, setRatings] = useState({
    punctuality: 5,
    cleanliness: 5,
    expertise: 5,
    communication: 5,
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([
    "Sangat Tepat Waktu",
    "Pengerjaan Bersih & Rapi",
  ]);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [photos, setPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1540518614846-7ede433c4ef7?w=600&auto=format&fit=crop&q=80",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleRatingChange = (category: keyof typeof ratings, value: number) => {
    setRatings((prev) => ({ ...prev, [category]: value }));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsSubmitting(false);
    setToastMessage("Terima kasih! Ulasan Anda berhasil diterbitkan.");
    setTimeout(() => {
      router.push("/history");
    }, 1000);
  };

  const averageRating = (
    (ratings.punctuality + ratings.cleanliness + ratings.expertise + ratings.communication) / 4
  ).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/orders/${orderId}`}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Ulasan & Rating
              </span>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                Beri Ulasan Layanan & Teknisi
              </h1>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">#{orderId}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmitReview} className="space-y-6">
          {/* Service & Provider Header Banner */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#0F4C81]">Pesanan Selesai</p>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">{order.serviceTitle}</h2>
              <p className="text-xs text-slate-500 mt-1">
                Mitra: <span className="font-semibold text-slate-700">{order.providerName}</span> • Teknisi: <span className="font-semibold text-slate-700">{order.assignedWorker?.name || "Rizky Firmansyah"}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 px-4 py-2.5 rounded-2xl border border-amber-200/80 shrink-0">
              <Star size={24} weight="fill" className="text-amber-500" />
              <div className="leading-tight">
                <span className="text-lg font-bold text-slate-900">{averageRating}</span>
                <span className="text-xs text-slate-400"> / 5.0</span>
                <p className="text-[10px] text-amber-700 font-bold uppercase">Rata-rata</p>
              </div>
            </div>
          </div>

          {/* 4-Dimension Star Ratings */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-4 border-b border-slate-100">
              <Sparkle size={20} weight="duotone" className="text-amber-500" />
              Penilaian Kinerja 4 Dimensi
            </h3>

            <div className="space-y-4">
              {[
                { key: "punctuality" as const, label: "Ketepatan Waktu", desc: "Sesuai jadwal kedatangan yang disepakati" },
                { key: "cleanliness" as const, label: "Kerapihan & Kebersihan", desc: "Area kerja dibersihkan setelah servis selesai" },
                { key: "expertise" as const, label: "Keahlian Teknis & Alat", desc: "Solutif, teliti, dan menguasai permasalahan alat" },
                { key: "communication" as const, label: "Komunikasi & Keramahan", desc: "Sopan, jelas dalam menjelaskan tindakan perbaikan" },
              ].map((dim) => (
                <div key={dim.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50/70 rounded-2xl">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{dim.label}</p>
                    <p className="text-xs text-slate-400">{dim.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => handleRatingChange(dim.key, star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          size={24}
                          weight={star <= ratings[dim.key] ? "fill" : "regular"}
                          className={star <= ratings[dim.key] ? "text-amber-400" : "text-slate-300"}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preset Quick Tags */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ThumbsUp size={20} weight="duotone" className="text-[#0F4C81]" />
              Apa yang paling memuaskan? (Tag Cepat)
            </h3>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
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
              Testimoni & Foto Hasil Pengerjaan
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Tuliskan Ulasan Anda
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Ceritakan pengalaman Anda menggunakan jasa teknisi ini..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C81] focus:border-transparent resize-none"
              />
            </div>

            {/* Photo Upload Zone */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Foto Hasil Kerja (Opsional)
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {photos.map((url, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 group">
                    <Image
                      src={url}
                      alt="Hasil"
                      width={80}
                      height={80}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setPhotos([
                      ...photos,
                      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format&fit=crop&q=80",
                    ])
                  }
                  className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#0F4C81] flex flex-col items-center justify-center text-slate-400 hover:text-[#0F4C81] transition"
                >
                  <Camera size={22} weight="duotone" />
                  <span className="text-[10px] font-semibold mt-1">+ Foto</span>
                </button>
              </div>
            </div>

            {/* Anonymous Toggle */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <UserSwitch size={20} weight="duotone" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Sembunyikan Identitas (Anonim)</p>
                  <p className="text-[11px] text-slate-400">
                    Nama profil Anda akan disamarkan sebagai &quot;Pelanggan Servio&quot; di ulasan publik
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-5 h-5 accent-[#0F4C81] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/history"
              className="px-5 py-3 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Lewati Ulasan
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3.5 rounded-xl font-bold text-xs text-white bg-[#0F4C81] hover:bg-[#0c3c66] active:scale-[0.99] transition shadow-lg shadow-sky-900/15 flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle size={18} weight="bold" />
              {isSubmitting ? "Mengirimkan..." : "Kirim Ulasan & Dapatkan 50 Poin"}
            </button>
          </div>
        </form>
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
