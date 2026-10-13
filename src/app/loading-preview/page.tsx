"use client";

import React, { useState } from "react";
import { ServioLoadingScreen } from "@/components/feedback/ServioLoadingScreen";
import { usePageLoading } from "@/components/feedback/PageLoadingProvider";
import { Sparkle, ArrowClockwise, Timer, Eye } from "@phosphor-icons/react";

export default function LoadingPreviewPage() {
  const [activeVariant, setActiveVariant] = useState<"root" | "ceo" | "merchant" | "ops" | "customer">("root");
  const [overlayOpen, setOverlayOpen] = useState(false);
  const { showLoading } = usePageLoading();

  const configs = {
    root: {
      message: "Menyiapkan Layanan...",
      subMessage: "Memuat ekosistem platform SERVIO",
    },
    ceo: {
      message: "Menyiapkan Dashboard Eksekutif...",
      subMessage: "Mengompilasi analitik makro dan tata kelola platform",
    },
    merchant: {
      message: "Menyiapkan Workspace Bisnis...",
      subMessage: "Memuat inventaris gudang dan operasional toko mitra",
    },
    ops: {
      message: "Menyiapkan Pusat Kendali Operasi...",
      subMessage: "Sinkronisasi audit trail dan antrean verifikasi platform",
    },
    customer: {
      message: "Menyiapkan Layanan Anda...",
      subMessage: "Lebih dari servis, menghadirkan hari yang lebih baik",
    },
  };

  const current = configs[activeVariant];

  return (
    <div className="min-h-screen bg-slate-100/70 p-6 flex flex-col items-center">
      {/* Interactive Controls Bar */}
      <div className="max-w-2xl w-full bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6 z-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-primary font-bold text-base font-display">
            <Sparkle size={20} weight="fill" className="text-secondary" />
            <span>Kontrol Layar Loading SERVIO</span>
          </div>

          {/* Action trigger buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-test-1-5s"
              type="button"
              onClick={() => showLoading(1500, current.message, current.subMessage)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark shadow-xs transition cursor-pointer"
              title="Tampilkan loading selama 1.5 detik"
            >
              <Timer size={16} weight="bold" />
              <span>Tes Durasi 1.5 Detik</span>
            </button>

            <button
              id="btn-test-2-5s"
              type="button"
              onClick={() => showLoading(2500, current.message, current.subMessage)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky/30 text-primary border border-sky/50 text-xs font-bold hover:bg-sky/40 transition cursor-pointer"
              title="Tampilkan loading selama 2.5 detik"
            >
              <Timer size={16} weight="bold" />
              <span>Tes Durasi 2.5 Detik</span>
            </button>

            <button
              id="btn-reload-page"
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
              title="Refresh halaman penuh untuk menguji loading otomatis"
            >
              <ArrowClockwise size={16} weight="bold" />
              <span>Refresh Halaman (F5)</span>
            </button>
          </div>
        </div>

        {/* Role variant selectors */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs text-slate-600 font-semibold mr-1 shrink-0">Pilih Konteks:</span>
          {(["root", "ceo", "merchant", "ops", "customer"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setActiveVariant(v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize ${
                activeVariant === v
                  ? "bg-primary text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {v === "root" ? "Umum" : v}
            </button>
          ))}
        </div>
      </div>

      {/* Embedded Live Preview Stage */}
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200/80 shadow-servio-md overflow-hidden relative min-h-[460px] flex items-center justify-center p-8">
        <ServioLoadingScreen
          message={current.message}
          subMessage={current.subMessage}
          fullScreen={false}
        />
      </div>

      {/* Fullscreen Overlay Test Modal */}
      {overlayOpen && (
        <div className="fixed inset-0 z-[9999]">
          <ServioLoadingScreen
            message="Memproses Permintaan Anda..."
            subMessage="Mohon tunggu sebentar selagi sistem menyinkronkan data"
            fullScreen
          />
          <button
            type="button"
            onClick={() => setOverlayOpen(false)}
            className="absolute top-6 right-6 z-[10000] px-4 py-2 rounded-xl bg-white/90 text-slate-800 text-xs font-bold shadow-lg hover:bg-white border border-slate-200"
          >
            Tutup Pratinjau (ESC)
          </button>
        </div>
      )}
    </div>
  );
}
