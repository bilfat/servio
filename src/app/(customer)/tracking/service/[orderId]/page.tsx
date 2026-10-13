"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTracking } from "@/features/tracking/useTracking";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import {
  NavigationArrow,
  MapPin,
  Clock,
  ShareNetwork,
  ArrowsClockwise,
  WarningCircle,
  ArrowLeft,
} from "@phosphor-icons/react";

export default function ServiceTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;

  const { tracking, isLoading, error, refresh } = useTracking(orderId);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-neutral-muted">ID: {orderId}</span>
            <StatusBadge
              status={tracking?.status === "DEPARTED" ? "info" : tracking?.status === "ARRIVED" ? "success" : "neutral"}
              label={
                tracking?.status === "DEPARTED"
                  ? "Teknisi Menuju Lokasi"
                  : tracking?.status === "ARRIVED"
                  ? "Teknisi Telah Tiba"
                  : "Menunggu Penugasan"
              }
            />
          </div>
          <h1 className="text-2xl font-display font-extrabold text-neutral-dark mt-1">
            Live Tracking Teknisi
          </h1>
          <p className="text-xs text-neutral-slate mt-0.5">
            Pantau status perjalanan teknisi menuju alamat layanan Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-neutral-dark text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-servio-xs"
          >
            <ShareNetwork size={16} />
            <span>{copiedLink ? "Link Tersalin!" : "Bagikan Rute"}</span>
          </button>
          <Link
            href={`/orders/${orderId}`}
            className="px-4 py-2 rounded-xl bg-slate-100 text-neutral-dark text-xs font-bold hover:bg-slate-200 transition-colors"
          >
            Detail Order
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-12 rounded-3xl border border-slate-200 bg-white shadow-servio-xs text-center space-y-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-neutral-dark">Memuat Data Pelacakan...</p>
          <p className="text-xs text-neutral-slate">Mengambil status posisi terkini dari sistem backend SERVIO.</p>
        </div>
      )}

      {/* Error / Empty State */}
      {!isLoading && (error || !tracking) && (
        <div className="p-8 sm:p-12 rounded-3xl border border-amber-200 bg-amber-50/60 shadow-servio-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <WarningCircle size={28} weight="fill" />
          </div>
          <div>
            <h3 className="text-base font-display font-extrabold text-neutral-dark">
              Informasi Pelacakan Belum Tersedia
            </h3>
            <p className="text-xs text-neutral-slate max-w-md mx-auto mt-1">
              {error || "Teknisi belum mengaktifkan pelacakan langsung untuk pesanan ini atau pesanan belum dalam status penugasan aktif."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={refresh}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-neutral-dark hover:bg-slate-50 shadow-servio-xs flex items-center gap-1.5"
            >
              <ArrowsClockwise size={14} />
              <span>Coba Muat Ulang</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/orders")}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark shadow-servio-xs flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Pesanan</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Map Viewport Area (when tracking exists) */}
      {!isLoading && tracking && (
        <>
          <div className="relative h-96 sm:h-[420px] rounded-3xl overflow-hidden border border-slate-200 shadow-servio-md bg-slate-100 flex flex-col justify-between p-4 sm:p-6">
            {/* Map Grid Background Texture */}
            <div className="absolute inset-0 bg-[radial-gradient(#0F4C81_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
            
            {/* Simulated Streets / Roads SVG */}
            <svg className="absolute inset-0 w-full h-full stroke-slate-300" strokeWidth="4" fill="none">
              <path d="M 50 350 Q 200 200 400 250 T 800 120" stroke="#E2E8F0" strokeWidth="12" />
              <path d="M 50 350 Q 200 200 400 250 T 800 120" stroke="#0F4C81" strokeWidth="4" strokeDasharray="8 8" className="animate-pulse" />
            </svg>

            {/* Top Floating ETA Card */}
            <div className="relative z-10 self-start glass-panel p-4 rounded-2xl border border-sky-200/80 bg-white/95 shadow-servio-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold">
                <Clock size={20} weight="fill" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-muted block">Estimasi Tiba (ETA):</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display font-extrabold text-xl text-primary">
                    {tracking.estimatedArrivalMinutes > 0 ? `${tracking.estimatedArrivalMinutes} Menit` : "Menuju Lokasi"}
                  </span>
                  {tracking.distanceKm > 0 && (
                    <span className="text-xs text-neutral-slate">
                      ({tracking.distanceKm} km lagi)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Technician Pin Marker on Map */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-servio-lg border-2 border-white animate-bounce">
                  <NavigationArrow size={24} weight="fill" className="rotate-45 text-amber-300" />
                </div>
                <div className="absolute -inset-2 rounded-full bg-primary/20 animate-ping pointer-events-none" />
              </div>
              <div className="mt-2 px-2.5 py-1 rounded-full bg-neutral-dark text-white text-[11px] font-bold shadow-xs whitespace-nowrap">
                {tracking.workerName || "Teknisi Mitra"}
              </div>
            </div>

            {/* Destination Customer Pin */}
            <div className="absolute bottom-10 left-12 z-10 flex items-center gap-2 bg-white/95 px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
              <MapPin size={18} weight="fill" className="text-rose-500" />
              <span className="text-xs font-bold text-neutral-dark">Lokasi Layanan Anda</span>
            </div>

            {/* Bottom Signal Status */}
            <div className="relative z-10 self-end flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] text-neutral-slate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Status: {tracking.status} • Diperbarui {tracking.lastUpdated}</span>
              <button type="button" onClick={refresh} title="Sinkronkan posisi">
                <ArrowsClockwise size={13} className="hover:rotate-180 transition-transform text-primary" />
              </button>
            </div>
          </div>

          {/* Technician Contact Bottom Card */}
          <div className="glass-card p-5 sm:p-6 rounded-3xl border border-slate-200/80 bg-white shadow-servio-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 font-display font-extrabold flex items-center justify-center text-base shrink-0">
                {tracking.workerName?.charAt(0) || "T"}
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-neutral-dark">
                  {tracking.workerName || "Teknisi Mitra"}
                </h3>
                <p className="text-xs text-neutral-slate">Mitra Teknisi SERVIO Terverifikasi</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => router.push(`/chat/${orderId}`)}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center justify-center gap-1.5 shadow-servio-xs"
              >
                <span>Buka Chat Order</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
