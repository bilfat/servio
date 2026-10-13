"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkle,
  ThumbsUp,
  ThumbsDown,
  Wrench,
  ThermometerHot,
  CloudRain,
  ShieldCheck,
  Lightning,
  CalendarCheck,
} from "@phosphor-icons/react";
import { Toast } from "@/components/feedback/Toast";

interface RecommendationCard {
  id: string;
  title: string;
  assetName: string;
  reason: string;
  category: string;
  estimatedSaving: string;
  recommendedServiceId: string;
  iconType: "weather" | "usage" | "maintenance";
}

const INITIAL_RECOMMENDATIONS: RecommendationCard[] = [
  {
    id: "rec-1",
    title: "Cuci Evaporator AC Sebelum Musim Kemarau Panas Ekstrem",
    assetName: "AC Daikin Inverter Flash 1 PK (Ruang Tamu)",
    reason:
      "AC Anda telah bekerja lebih dari 90 hari sejak pencucian terakhir. Membersihkan sirip outdoor saat ini menghemat listrik hingga 22% saat cuaca panas tiba.",
    category: "Hemat Energi & Performa",
    estimatedSaving: "Hemat ~Rp 65.000/bln tagihan PLN",
    recommendedServiceId: "srv-ac-cuci-standar",
    iconType: "weather",
  },
  {
    id: "rec-2",
    title: "Pengurasan Toren Air Antisipasi Musim Hujan & Kekeruhan",
    assetName: "Pompa Air Otomatis Booster Shimizu PB-228",
    reason:
      "Toren air belum dikuras lebih dari 6 bulan. Endapan lumut dan lumpur dapat menyumbat membran otomatis pompa pendorong.",
    category: "Kesehatan Air Bersih",
    estimatedSaving: "Cegah pompa macet & terbakar",
    recommendedServiceId: "srv-pipa-mampet",
    iconType: "maintenance",
  },
  {
    id: "rec-3",
    title: "Pemeriksaan Filter Udara Kabin Mobil Menjelang Perjalanan Jauh",
    assetName: "Honda HR-V 1.5 E CVT (Putih Mutiara)",
    reason:
      "Odometer mendekati interval 40.000 KM. Kualitas udara dalam kabin menurun karena partikel debu halus polusi jalanan.",
    category: "Kenyamanan Berkendara",
    estimatedSaving: "AC kabin 3x lebih cepat dingin",
    recommendedServiceId: "srv-ganti-oli-tuneup",
    iconType: "usage",
  },
];

export default function SmartRecommendationsPage() {
  const [recommendations, setRecommendations] = useState(INITIAL_RECOMMENDATIONS);
  const [feedback, setFeedback] = useState<Record<string, "UP" | "DOWN">>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleFeedback = (id: string, type: "UP" | "DOWN") => {
    setFeedback((prev) => ({ ...prev, [id]: type }));
    setToastMessage(
      type === "UP"
        ? "Terima kasih! Rekomendasi serupa akan diprioritaskan untuk Anda."
        : "Terima kasih atas masukan Anda. Kami akan memperbaiki akurasi AI."
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 flex items-center gap-1.5">
              <Sparkle size={14} weight="fill" className="text-amber-500" />
              Servio Smart Advisor AI
            </span>
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">
            Rekomendasi Pemeliharaan Cerdas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Prediksi kebutuhan servis preventif berdasarkan pola penggunaan, usia suku cadang, dan cuaca terkini.
          </p>
        </div>
      </div>

      {/* Recommendations Cards */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {recommendations.map((rec) => {
          const userFeedback = feedback[rec.id];

          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                    {rec.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    Untuk: {rec.assetName}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {rec.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">{rec.reason}</p>

                <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <Lightning size={16} weight="fill" className="text-amber-500" />
                  <span>Dampak: {rec.estimatedSaving}</span>
                </div>
              </div>

              {/* Actions & Feedback */}
              <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 shrink-0">
                <Link
                  href={`/bookings/new?serviceId=${rec.recommendedServiceId}&source=ai-advisor`}
                  className="px-6 py-3 rounded-2xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-bold text-center flex items-center justify-center gap-2 transition shadow-md shadow-sky-900/10"
                >
                  <Wrench size={16} weight="bold" />
                  Panggil Teknisi Sesuai Saran
                </Link>

                {/* Accuracy Feedback */}
                <div className="flex items-center justify-center md:justify-end gap-2 text-xs text-slate-400">
                  <span>Apakah saran ini relevan?</span>
                  <button
                    type="button"
                    onClick={() => handleFeedback(rec.id, "UP")}
                    className={`p-1.5 rounded-lg border transition ${
                      userFeedback === "UP"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "hover:bg-slate-100 border-slate-200 text-slate-500"
                    }`}
                  >
                    <ThumbsUp size={14} weight={userFeedback === "UP" ? "fill" : "regular"} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback(rec.id, "DOWN")}
                    className={`p-1.5 rounded-lg border transition ${
                      userFeedback === "DOWN"
                        ? "bg-rose-50 text-rose-700 border-rose-300"
                        : "hover:bg-slate-100 border-slate-200 text-slate-500"
                    }`}
                  >
                    <ThumbsDown size={14} weight={userFeedback === "DOWN" ? "fill" : "regular"} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
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
