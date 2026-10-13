"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Star,
  ArrowClockwise,
  Trash,
  UserCheck,
  CalendarBlank,
} from "@phosphor-icons/react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

interface FavoriteItem {
  id: string;
  serviceId: string;
  serviceTitle: string;
  providerId: string;
  providerName: string;
  technicianName: string;
  rating: number;
  lastBookedDate: string;
  lastPrice: number;
  defaultMode: string;
}

const INITIAL_FAVORITES: FavoriteItem[] = [
  {
    id: "fav-1",
    serviceId: "srv-ac-cuci-standar",
    serviceTitle: "Cuci & Perawatan AC Split 0.5 - 1 PK",
    providerId: "prov-bintang-teknik",
    providerName: "Bintang Teknik Mandiri",
    technicianName: "Budi Santoso",
    rating: 4.9,
    lastBookedDate: "12 Juni 2026",
    lastPrice: 75000,
    defaultMode: "Home Service",
  },
  {
    id: "fav-2",
    serviceId: "srv-ganti-oli-tuneup",
    serviceTitle: "Home Service Ganti Oli & Tune Up Mobil",
    providerId: "prov-autopro",
    providerName: "AutoPro Mobile Workshop",
    technicianName: "Ahmad Fauzi",
    rating: 5.0,
    lastBookedDate: "15 September 2026",
    lastPrice: 605000,
    defaultMode: "Home Service",
  },
];

export default function FavoritesQuickRebookPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(INITIAL_FAVORITES);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleRemoveFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    setToastMessage("Layanan berhasil dihapus dari daftar favorit.");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              Layanan Langganan
            </span>
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">
            Teknisi Favorit & Pesan Ulang Cepat
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Panggil kembali teknisi andalan yang sudah terbukti memuaskan dengan konfigurasi pesanan sebelumnya.
          </p>
        </div>
      </div>

      {/* Favorites List */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {favorites.length === 0 ? (
          <EmptyState
            title="Belum Ada Teknisi Favorit"
            description="Tandai layanan atau teknisi terbaik sebagai favorit setelah pengerjaan selesai untuk pesan ulang instan."
            action={
              <Link
                href="/search"
                className="px-4 py-2 bg-[#0F4C81] text-white text-xs font-bold rounded-xl"
              >
                Cari Layanan Servio
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {favorites.map((fav) => (
              <motion.div
                key={fav.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                      {fav.defaultMode}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFavorite(fav.id)}
                      className="text-slate-400 hover:text-rose-500 transition p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
                      title="Hapus dari Favorit"
                      aria-label="Hapus dari Favorit"
                    >
                      <Trash size={16} />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {fav.serviceTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{fav.providerName}</p>

                  <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <UserCheck size={16} className="text-emerald-600" />
                        Teknisi Langganan:
                      </span>
                      <span className="font-bold text-slate-900">{fav.technicianName}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <CalendarBlank size={16} />
                        Pernah Dipesan:
                      </span>
                      <span className="font-medium text-slate-600">{fav.lastBookedDate}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-slate-500">Estimasi Biaya:</span>
                      <span className="font-bold text-slate-900">
                        Rp {fav.lastPrice.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1 text-xs text-amber-600 font-bold">
                    <Star size={16} weight="fill" />
                    <span>{fav.rating}</span>
                  </div>

                  <Link
                    href={`/bookings/new?serviceId=${fav.serviceId}&providerId=${fav.providerId}&technician=${encodeURIComponent(
                      fav.technicianName
                    )}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition shadow-sm shadow-sky-900/10"
                  >
                    <ArrowClockwise size={16} weight="bold" />
                    Pesan Ulang Instan
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
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
