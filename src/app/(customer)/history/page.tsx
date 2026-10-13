"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FilePdf,
  ArrowClockwise,
  UserCheck,
  CheckCircle,
} from "@phosphor-icons/react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

interface ServiceLogEntry {
  id: string;
  date: string;
  serviceTitle: string;
  providerName: string;
  technicianName: string;
  cost: number;
  replacedParts: string[];
  notes: string;
}

const MOCK_SERVICE_LOGS: ServiceLogEntry[] = [
  {
    id: "log-1",
    date: "2026-06-12",
    serviceTitle: "Cuci Steam AC Rutin & Cek Ampere",
    providerName: "Bintang Teknik Mandiri",
    technicianName: "Budi Santoso",
    cost: 75000,
    replacedParts: [],
    notes: "Tekanan freon normal di 140 PSI, sirip outdoor bersih.",
  },
  {
    id: "log-2",
    date: "2026-01-08",
    serviceTitle: "Ganti Kapasitor Fan Outdoor",
    providerName: "Bintang Teknik Mandiri",
    technicianName: "Budi Santoso",
    cost: 165000,
    replacedParts: ["Kapasitor 2.5uF"],
    notes: "Kipas outdoor berputar lambat, diganti kapasitor baru.",
  },
  {
    id: "log-auto-1",
    date: "2026-09-15",
    serviceTitle: "Home Service Ganti Oli Motul 5W-30 & Tune Up",
    providerName: "AutoPro Mobile Workshop",
    technicianName: "Ahmad Fauzi",
    cost: 605000,
    replacedParts: ["Oli Motul H-Tech 4L", "Filter Oli Honda OEM"],
    notes: "Odometer tercatat 38.500 KM. Kampas rem depan masih tersisa 40%.",
  },
  {
    id: "log-pump-1",
    date: "2025-10-02",
    serviceTitle: "Ganti Flow Switch & Otomatis Pompa",
    providerName: "Ahli Pipa & Deteksi Bocor",
    technicianName: "Doni Kusuma",
    cost: 210000,
    replacedParts: ["Flow Switch Kuningan 1 Inch"],
    notes: "Otomatis sering berbunyi cetak-cetek terus menerus.",
  },
];

export default function ServiceHistoryLogbookPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleExportPdf = () => {
    setToastMessage("Buku Logbook Servis PDF berhasil diunduh ke perangkat Anda.");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Dokumentasi Riwayat
              </span>
              <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">
                Buku Logbook Servis Digital
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Catatan kronologis perawatan berkala, penggantian komponen, dan biaya servis seluruh pesanan Anda.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportPdf}
                aria-label="Ekspor PDF Buku Logbook Servis"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-sm transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <FilePdf size={18} weight="duotone" className="text-rose-500" />
                Ekspor PDF Logbook
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logbook Timeline */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {MOCK_SERVICE_LOGS.length === 0 ? (
          <EmptyState
            title="Belum Ada Catatan Servis"
            description="Belum memiliki catatan riwayat servis atau penggantian suku cadang."
            action={
              <Link
                href="/bookings/new"
                className="px-4 py-2 bg-[#0F4C81] text-white text-xs font-bold rounded-xl"
              >
                Booking Servis Sekarang
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            {MOCK_SERVICE_LOGS.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {log.date}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {log.serviceTitle}
                    </h3>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400">Biaya Pengerjaan</span>
                    <p className="text-base font-bold text-slate-900">
                      Rp {log.cost.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-2">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs">
                    <p className="text-slate-400">Penyedia & Teknisi</p>
                    <p className="font-bold text-slate-800 mt-0.5">{log.providerName}</p>
                    <p className="text-slate-500 mt-0.5 flex items-center gap-1">
                      <UserCheck size={14} className="text-emerald-600" />
                      {log.technicianName}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs">
                    <p className="text-slate-400">Suku Cadang Diganti</p>
                    {log.replacedParts.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 font-semibold text-slate-800">
                        {log.replacedParts.map((p, i) => (
                          <li key={i}>• {p}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400 italic mt-0.5">Tidak ada penggantian spare part</p>
                    )}
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs">
                    <p className="text-slate-400">Catatan Teknisi</p>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{log.notes}</p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle size={14} weight="fill" />
                    Terverifikasi Servio System
                  </span>

                  <Link
                    href={`/bookings/new?rebook=${log.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-[#0F4C81] hover:text-white text-slate-700 text-xs font-bold transition"
                  >
                    <ArrowClockwise size={14} weight="bold" />
                    Panggil Teknisi yang Sama
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
