"use client";

import React, { useState } from "react";
import { SkeletonCard } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PermissionDenied } from "@/components/feedback/PermissionDenied";
import { OfflineBanner } from "@/components/feedback/OfflineBanner";
import { StaleBanner } from "@/components/feedback/StaleBanner";
import { ProcessingOverlay } from "@/components/feedback/ProcessingOverlay";
import { SuccessFeedback } from "@/components/feedback/SuccessFeedback";
import { PartialState } from "@/components/feedback/PartialState";
import { LockedBanner } from "@/components/feedback/LockedBanner";
import { CountdownState } from "@/components/feedback/CountdownState";

export function GlobalStatesShowcase() {
  const [selectedState, setSelectedState] = useState<string>("all");
  const [isProcessing, setIsProcessing] = useState(false);

  const tabs = [
    { id: "all", label: "Semua State (11)" },
    { id: "skeleton", label: "1. Skeleton" },
    { id: "empty", label: "2. Empty" },
    { id: "error", label: "3. Error" },
    { id: "permission", label: "4. Permission Denied" },
    { id: "offline", label: "5. Offline" },
    { id: "stale", label: "6. Stale" },
    { id: "processing", label: "7. Processing" },
    { id: "success", label: "8. Success" },
    { id: "partial", label: "9. Partial" },
    { id: "locked", label: "10. Locked" },
    { id: "expired", label: "11. Expired / Countdown" },
  ];

  return (
    <div className="space-y-6">
      {/* Processing Overlay Demo */}
      <ProcessingOverlay
        isProcessing={isProcessing}
        message="Memverifikasi Transaksi Escrow..."
        subMessage="Sistem sedang mengamankan pembayaran Anda ke rekening tampung Servio Protection."
      />

      {/* Tabs Filter */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedState(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedState === tab.id
                ? "bg-primary text-white font-semibold shadow-servio-xs"
                : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {/* 1. Skeleton */}
        {(selectedState === "all" || selectedState === "skeleton") && (
          <div className="space-y-3">
            <h3 className="text-sm font-display font-bold text-neutral-dark">
              1. State: Loading Skeleton (Card & Table Row)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        )}

        {/* 2. Empty */}
        {(selectedState === "all" || selectedState === "empty") && (
          <div className="space-y-3">
            <h3 className="text-sm font-display font-bold text-neutral-dark">
              2. State: Empty State
            </h3>
            <EmptyState
              title="Belum Ada Pesanan Aktif"
              description="Anda belum memiliki layanan atau suku cadang yang sedang berjalan saat ini. Mulai cari solusi terbaik untuk kebutuhan Anda."
              action={
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold shadow-servio-xs"
                >
                  Jelajahi Katalog Layanan
                </button>
              }
            />
          </div>
        )}

        {/* 3. Error */}
        {(selectedState === "all" || selectedState === "error") && (
          <div className="space-y-3">
            <h3 className="text-sm font-display font-bold text-neutral-dark">
              3. State: Recoverable Error State
            </h3>
            <ErrorState
              title="Gagal Mengambil Data Penawaran"
              message="Koneksi server terputus saat memuat rincian negosiasi harga. Silakan periksa koneksi Anda dan coba lagi."
              onRetry={() => alert("Mencoba memuat ulang data...")}
            />
          </div>
        )}

        {/* 4. Permission Denied */}
        {(selectedState === "all" || selectedState === "permission") && (
          <div className="space-y-3">
            <h3 className="text-sm font-display font-bold text-neutral-dark">
              4. State: Permission Denied (403 Forbidden)
            </h3>
            <PermissionDenied
              requiredRole="FINANCE_PAYMENT_OPS"
              requiredPermission="MANAGE:FINANCE_OPS"
              message="Halaman rekonsiliasi dan pencairan dana escrow hanya dapat diakses oleh tim Finance & Payment Operations."
            />
          </div>
        )}

        {/* 5. Offline */}
        {(selectedState === "all" || selectedState === "offline") && (
          <div className="space-y-3">
            <h3 className="text-sm font-display font-bold text-neutral-dark">
              5. State: Offline Banner
            </h3>
            <OfflineBanner lastSynced="20 September 2026, 23:45 WIB" />
          </div>
        )}

        {/* 6. Stale */}
        {(selectedState === "all" || selectedState === "stale") && (
          <div className="space-y-3">
            <h3 className="text-sm font-display font-bold text-neutral-dark">
              6. State: Stale Data Banner
            </h3>
            <StaleBanner
              lastUpdated="5 menit yang lalu"
              onRefresh={() => alert("Menyinkronkan data terbaru...")}
            />
          </div>
        )}

        {/* 7. Processing */}
        {(selectedState === "all" || selectedState === "processing") && (
          <div className="space-y-3">
            <h3 className="text-sm font-display font-bold text-neutral-dark">
              7. State: Processing Trigger
            </h3>
            <div className="p-4 rounded-xl glass-card text-center space-y-2">
              <p className="text-xs text-neutral-slate">
                Klik tombol di bawah untuk menguji overlay pemrosesan data (anti double-submit):
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsProcessing(true);
                  setTimeout(() => setIsProcessing(false), 2000);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold shadow-servio-xs"
              >
                Buka Processing Overlay
              </button>
            </div>
          </div>
        )}

        {/* 8. Success */}
        {(selectedState === "all" || selectedState === "success") && (
          <div className="space-y-3">
            <h3 className="text-sm font-display font-bold text-neutral-dark">
              8. State: Success Feedback
            </h3>
            <SuccessFeedback
              title="Reservasi Berhasil Diajukan!"
              message="Permintaan pengerjaan AC Anda telah dikirimkan ke mitra penyedia jasa. Anda akan menerima notifikasi segera setelah penawaran disetujui."
              nextRoute={{ label: "Lihat Detail Booking", href: "/bookings" }}
            />
          </div>
        )}

        {/* 9. Partial */}
        {(selectedState === "all" || selectedState === "partial") && (
          <div className="space-y-3">
            <h3 className="text-sm font-display font-bold text-neutral-dark">
              9. State: Partial State (Penyelesaian Bertahap)
            </h3>
            <PartialState
              completedCount={3}
              totalCount={5}
              title="Progres Pemenuhan Multi-Item Jasa & Sparepart"
              completedItems={[
                "Pembersihan Evaporator & Filter AC (Selesai)",
                "Uji Kebocoran Freon (Selesai)",
                "Pemasangan Kapasitor Baru (Selesai)",
              ]}
              pendingItems={[
                "Pengisian Freon R32 (Menunggu unit dingin)",
                "Verifikasi Suhu & Tanda Tangan Pelanggan",
              ]}
            />
          </div>
        )}

        {/* 10. Locked */}
        {(selectedState === "all" || selectedState === "locked") && (
          <div className="space-y-3">
            <h3 className="text-sm font-display font-bold text-neutral-dark">
              10. State: Locked State
            </h3>
            <LockedBanner
              reason="Penawaran Harga Sedang Ditinjau Mitra"
              conditionDescription="Anda tidak dapat mengubah jadwal atau lingkup pekerjaan selama penyedia jasa sedang memvalidasi ketersediaan teknisi dan estimasi biaya material."
            />
          </div>
        )}

        {/* 11. Countdown / Expired */}
        {(selectedState === "all" || selectedState === "expired") && (
          <div className="space-y-3">
            <h3 className="text-sm font-display font-bold text-neutral-dark">
              11. State: Countdown & Expired State
            </h3>
            <CountdownState
              initialSeconds={90}
              label="Batas Pembayaran Escrow (Demo 90 Detik)"
              onExpire={() => console.log("Countdown expired")}
              onRenew={() => alert("Pesanan diperbarui kembali.")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
