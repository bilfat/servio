"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Handshake,
  Star,
  CheckCircle,
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Info,
  WarningCircle,
} from "@phosphor-icons/react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { Badge } from "@/components/ui/Badge";
import { Toast } from "@/components/feedback/Toast";

export default function MerchantPartnershipRequestDetailPage() {
  const params = useParams();
  const repo = useDomainRepository();
  const currentMerchantId = "merch-01";

  const requestId = params?.requestId as string;
  const partnership = repo.getPartnershipById(requestId);

  // Confirmation dialog states
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("Tidak sesuai kebutuhan bisnis");
  const [customRejectNote, setCustomRejectNote] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!partnership) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4 font-body">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center">
          <Handshake size={32} />
        </div>
        <h2 className="text-lg font-bold text-slate-800 font-display">
          Pengajuan Kerja Sama Tidak Ditemukan
        </h2>
        <p className="text-xs text-slate-500">
          ID pengajuan #{requestId} tidak terdaftar di sistem atau bukan ditujukan untuk toko Anda.
        </p>
        <Link
          href="/business/merchant/partnerships/requests"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
        >
          <ArrowLeft size={14} weight="bold" />
          <span>Kembali ke Daftar Pengajuan</span>
        </Link>
      </div>
    );
  }

  const handleConfirmAccept = () => {
    const updated = repo.acceptStorePartnership(partnership.id, currentMerchantId);
    if (updated) {
      setShowAcceptDialog(false);
      setToastMessage(`Kemitraan dengan ${updated.providerName || "Penyedia Jasa"} telah disetujui! Status kini AKTIF.`);
    }
  };

  const handleConfirmReject = () => {
    const finalReason =
      rejectReason === "Alasan lainnya" && customRejectNote.trim()
        ? customRejectNote.trim()
        : rejectReason;

    const updated = repo.rejectStorePartnership(
      partnership.id,
      finalReason,
      currentMerchantId
    );
    if (updated) {
      setShowRejectDialog(false);
      setToastMessage(`Pengajuan kerja sama dari ${updated.providerName || "Penyedia Jasa"} telah ditolak.`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 font-body">
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/business/merchant/partnerships/requests"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 transition"
        >
          <ArrowLeft size={14} weight="bold" />
          <span>Kembali ke Pengajuan Kerja Sama</span>
        </Link>

        <span className="text-[11px] font-mono text-slate-400">
          #{partnership.id}
        </span>
      </div>

      {/* Confirmation Dialog Accept */}
      {showAcceptDialog && (
        <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 space-y-3">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
              <CheckCircle size={20} weight="fill" />
            </span>
            <div>
              <h4 className="font-bold text-emerald-950 font-display text-sm">
                Terima kerja sama dengan {partnership.providerName}?
              </h4>
              <p className="text-emerald-800 text-xs mt-1">
                Setelah kerja sama disetujui:
              </p>
              <ul className="list-disc list-inside mt-1.5 space-y-1 text-emerald-900 text-xs">
                <li>{partnership.providerName} resmi menjadi partner aktif toko Anda.</li>
                <li>Teknisi provider dapat menemukan dan merekomendasikan produk Anda.</li>
                <li>Attribution affiliate tetap mengikuti policy Servio.</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200">
            <button
              type="button"
              onClick={() => setShowAcceptDialog(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmAccept}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs shadow-xs"
            >
              Terima Kerja Sama
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Reject */}
      {showRejectDialog && (
        <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 space-y-3">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
              <WarningCircle size={20} weight="fill" />
            </span>
            <div className="flex-1">
              <h4 className="font-bold text-rose-950 font-display text-sm">
                Tolak pengajuan kerja sama dari {partnership.providerName}?
              </h4>
              <p className="text-rose-800 text-xs mt-1">
                Pilih alasan penolakan:
              </p>

              <div className="mt-2.5 space-y-2 text-xs">
                {[
                  "Tidak sesuai kebutuhan bisnis",
                  "Area layanan tidak sesuai",
                  "Kategori produk tidak sesuai",
                  "Alasan lainnya",
                ].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="rejectReason"
                      value={opt}
                      checked={rejectReason === opt}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{opt}</span>
                  </label>
                ))}

                {rejectReason === "Alasan lainnya" && (
                  <textarea
                    value={customRejectNote}
                    onChange={(e) => setCustomRejectNote(e.target.value)}
                    placeholder="Tuliskan alasan penolakan spesifik..."
                    rows={2}
                    className="w-full mt-1.5 p-2 rounded-xl border border-slate-300 text-xs"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200">
            <button
              type="button"
              onClick={() => setShowRejectDialog(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-bold text-xs shadow-xs"
            >
              Tolak Pengajuan
            </button>
          </div>
        </div>
      )}

      {/* Main Provider Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-2xl shrink-0 shadow-xs">
              {partnership.providerName ? partnership.providerName.slice(0, 2).toUpperCase() : "PJ"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold font-display text-slate-900">
                  {partnership.providerName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                  <ShieldCheck size={12} weight="fill" />
                  Mitra Terverifikasi
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600 flex-wrap">
                {partnership.providerRating && (
                  <span className="flex items-center gap-1 text-amber-600 font-bold">
                    <Star size={14} weight="fill" />
                    {partnership.providerRating} ({partnership.providerReviewCount || 100}+ ulasan)
                  </span>
                )}
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} weight="duotone" className="text-slate-400" />
                  <span>{partnership.providerServiceArea || "Jabodetabek"}</span>
                </span>
                <span>•</span>
                <span>{partnership.providerServiceCount || 12} Layanan</span>
              </div>

              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                {partnership.providerDescription ||
                  "Penyedia jasa pemeliharaan pendingin udara dan instalasi kelistrikan resmi Servio."}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            {partnership.status === "PENDING" && (
              <Badge variant="warning" size="md">
                Menunggu Persetujuan
              </Badge>
            )}
            {partnership.status === "ACTIVE" && (
              <Badge variant="success" size="md">
                Kemitraan Aktif
              </Badge>
            )}
            {partnership.status === "REJECTED" && (
              <Badge variant="danger" size="md">
                Pengajuan Ditolak
              </Badge>
            )}
          </div>
        </div>

        {/* Request Information Grid */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Informasi Pengajuan & Kerja Sama
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Request ID
              </span>
              <strong className="text-slate-900 font-mono text-sm">{partnership.id}</strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Tanggal Diajukan
              </span>
              <strong className="text-slate-900 text-sm">{partnership.requestedAt}</strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Cakupan Kerja Sama (Scope)
              </span>
              <strong className="text-slate-900 font-mono text-sm">{partnership.scope}</strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Status Hubungan
              </span>
              <strong className="text-indigo-700 text-sm">{partnership.status}</strong>
            </div>
          </div>

          {partnership.notes && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-1">
              <span className="text-[10px] uppercase font-bold text-indigo-700 block">
                Pesan Konteks Kerja Sama:
              </span>
              <p className="text-xs text-slate-700 leading-relaxed italic">
                &ldquo;{partnership.notes}&rdquo;
              </p>
            </div>
          )}

          {partnership.productCategories && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                Kategori Suku Cadang Terkait:
              </span>
              <div className="flex flex-wrap gap-2">
                {partnership.productCategories.map((c) => (
                  <span
                    key={c}
                    className="px-3 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-medium"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {partnership.approvedAt && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              Kemitraan resmi ini telah disetujui pada: <strong>{partnership.approvedAt}</strong>.
            </div>
          )}

          {partnership.rejectedAt && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
              <p>Pengajuan telah ditolak pada: <strong>{partnership.rejectedAt}</strong></p>
              <p>Alasan: <strong>{partnership.rejectionReason}</strong></p>
            </div>
          )}
        </div>

        {/* Read-Only Policy Notice */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-500">
          <Info size={16} weight="fill" className="text-indigo-600 shrink-0 mt-0.5" />
          <span>
            Keputusan kemitraan hanya menentukan izin jaringan teknisi untuk merekomendasikan produk toko. Komisi dan reward afiliasi tidak dibuat otomatis, melainkan mengikuti siklus transaksi servis riil.
          </span>
        </div>

        {/* Action Buttons if PENDING */}
        {partnership.status === "PENDING" && !showAcceptDialog && !showRejectDialog && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowRejectDialog(true)}
              className="px-5 py-2.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-xs transition"
            >
              Tolak Pengajuan
            </button>
            <button
              type="button"
              onClick={() => setShowAcceptDialog(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs flex items-center gap-2 shadow-xs transition"
            >
              <CheckCircle size={16} weight="bold" />
              <span>Terima Kerja Sama</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
