"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  SealCheck,
  ShieldCheck,
  ShieldPlus,
  Clock,
  WarningCircle,
  CheckCircle,
  Package,
  Receipt,
  Camera,
  X,
  ArrowsClockwise,
  User,
} from "@phosphor-icons/react";
import { warrantiesApi } from "@/lib/servioApi";
import { Toast } from "@/components/feedback/Toast";

interface CustomerProductWarrantyDetailProps {
  warrantyId: string;
}

export function CustomerProductWarrantyDetail({ warrantyId }: CustomerProductWarrantyDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [warranty, setWarranty] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimReason, setClaimReason] = useState("Kerusakan fungsi bawaan komponen");
  const [claimDescription, setClaimDescription] = useState("");
  const [claimPhotos, setClaimPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
  ]);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Respond Modal State
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [selectedClaimForRespond, setSelectedClaimForRespond] = useState<any | null>(null);
  const [respondNotes, setRespondNotes] = useState("");
  const [respondPhotos, setRespondPhotos] = useState<string[]>([]);
  const [isSubmittingRespond, setIsSubmittingRespond] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await warrantiesApi.get(warrantyId);
      if (res && res.data) {
        setWarranty(res.data);
      }
    } catch (err: any) {
      console.warn("Failed fetching product warranty detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [warrantyId]);

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warranty) return;
    if (!claimReason.trim()) {
      alert("Harap tentukan alasan klaim.");
      return;
    }

    setIsSubmittingClaim(true);
    try {
      await warrantiesApi.createClaim(warranty.warrantyId, {
        reason: claimReason.trim(),
        description: claimDescription.trim(),
        evidenceMedia: claimPhotos.map((url) => ({
          url,
          type: "PHOTO",
          description: "Foto bukti kendala fisik / komponen",
        })),
      });

      setToastMessage("Klaim garansi produk berhasil diajukan dan sedang ditinjau Merchant!");
      setIsClaimModalOpen(false);
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || "Gagal mengajukan klaim garansi produk.");
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleRespondSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForRespond) return;
    if (!respondNotes.trim()) {
      alert("Harap berikan catatan atau penjelasan.");
      return;
    }

    setIsSubmittingRespond(true);
    try {
      await warrantiesApi.respondNeedMoreInfo(selectedClaimForRespond.claimId, {
        notes: respondNotes.trim(),
        additionalEvidence: respondPhotos.map((url) => ({
          url,
          type: "PHOTO",
          description: "Foto bukti klarifikasi tambahan",
        })),
      });

      setToastMessage("Klarifikasi dan bukti tambahan berhasil dikirim ke Merchant!");
      setIsRespondModalOpen(false);
      await fetchDetail();
    } catch (err: any) {
      alert(err.message || "Gagal mengirim klarifikasi tambahan.");
    } finally {
      setIsSubmittingRespond(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#0F4C81] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-600">Memuat Sertifikat Garansi Produk...</p>
      </div>
    );
  }

  if (!warranty) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <WarningCircle size={48} className="mx-auto text-amber-500" />
        <h2 className="text-base font-bold text-slate-800">Garansi Produk Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">
          Sertifikat garansi #{warrantyId} tidak terdaftar atau bukan milik akun Anda.
        </p>
        <Link
          href="/warranties"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F4C81] text-white text-xs font-bold rounded-xl"
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Pusat Garansi</span>
        </Link>
      </div>
    );
  }

  const isExpired = warranty.status === "EXPIRED" || warranty.isExpired;
  const isVoid = warranty.status === "VOID";
  const canClaim = warranty.status === "ACTIVE" && !isExpired && !isVoid;
  const claims = warranty.claims || [];
  const activeClaim = claims.find((c: any) =>
    ["SUBMITTED", "UNDER_REVIEW", "NEED_MORE_INFORMATION", "APPROVED", "IN_SERVICE", "REPLACEMENT_PROCESS"].includes(c.status)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/warranties"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Kembali ke Garansi &amp; Perlindungan</span>
        </Link>

        <span className="font-mono text-xs font-bold text-slate-400">
          ORDER #{warranty.orderId}
        </span>
      </div>

      {/* Official Certificate Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6 relative overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <SealCheck size={28} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Sertifikat Garansi Resmi
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    isVoid
                      ? "bg-slate-100 text-slate-700 border-slate-300"
                      : isExpired
                      ? "bg-slate-100 text-slate-600 border-slate-300"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {isVoid ? "VOID" : isExpired ? "KEDALUWARSA" : "GARANSI AKTIF"}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 font-display mt-0.5">
                {warranty.productName}
              </h1>
              <p className="text-xs text-slate-500">
                Varian: <strong>{warranty.variantName}</strong> • Tipe: <strong>{warranty.warrantyProvider === "MANUFACTURER" ? "Garansi Pabrikan (OEM)" : "Garansi Toko Resmi"}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {canClaim && !activeClaim ? (
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm"
              >
                <ShieldPlus size={16} weight="bold" />
                <span>Ajukan Klaim Kerusakan</span>
              </button>
            ) : activeClaim ? (
              <span className="px-4 py-2 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold">
                Klaim Sedang Diproses (#{activeClaim.claimNumber || activeClaim.claimId})
              </span>
            ) : (
              <span className="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold">
                Masa Klaim Tidak Aktif
              </span>
            )}
          </div>
        </div>

        {/* Certificate Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Nomor Sertifikat</span>
            <p className="font-mono font-bold text-[#0F4C81]">{warranty.warrantyId}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Durasi Perlindungan</span>
            <p className="font-bold text-slate-900">{warranty.durationMonths} Bulan ({warranty.durationDays || (warranty.durationMonths * 30)} Hari)</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Tanggal Mulai</span>
            <p className="font-bold text-slate-900">{warranty.startAt || "-"}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Berakhir Pada</span>
            <p className="font-bold text-slate-900">{warranty.endAt || "-"}</p>
          </div>
        </div>

        {/* Policy Snapshot Cards (Immutable History) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block">
              Cakupan Perlindungan (Coverage)
            </span>
            <p className="text-slate-700 leading-relaxed">
              {warranty.coverage || "Kerusakan fungsi bawaan pabrik, cacat manufaktur, malfungsi kelistrikan komponen resmi."}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900 block">
              Pengecualian (Exclusions)
            </span>
            <p className="text-slate-700 leading-relaxed">
              {warranty.exclusions || "Kerusakan fisik akibat jatuh, kesalahan instalasi non-resmi, karat karena air, atau modifikasi."}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 block">
              Syarat &amp; Ketentuan Klaim
            </span>
            <p className="text-slate-600 leading-relaxed">
              {warranty.terms || "Wajib menyertakan bukti invoice transaksi resmi SERVIO dan segel fisik unit tidak rusak."}
            </p>
          </div>
        </div>
      </div>

      {/* Claims History for this Warranty */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Riwayat Pengajuan Klaim</h2>
            <p className="text-xs text-slate-500">Daftar klaim yang diajukan untuk unit terdaftar ini</p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700">
            {claims.length} Klaim
          </span>
        </div>

        {claims.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-1">
            <CheckCircle size={32} className="mx-auto text-slate-300" />
            <p>Belum ada klaim yang diajukan untuk garansi ini.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map((claim: any) => (
              <div
                key={claim.claimId}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {claim.claimNumber || claim.claimId}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        claim.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : claim.status === "APPROVED"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : claim.status === "NEED_MORE_INFORMATION"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : claim.status === "INSPECTION_REQUIRED"
                          ? "bg-purple-100 text-purple-800 border-purple-300"
                          : claim.status === "IN_SERVICE"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : claim.status === "REPLACEMENT_PROCESS"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : claim.status === "REJECTED"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {claim.status === "SUBMITTED"
                        ? "Menunggu Review"
                        : claim.status === "NEED_MORE_INFORMATION"
                        ? "Butuh Informasi Tambahan"
                        : claim.status === "INSPECTION_REQUIRED"
                        ? "Inspeksi Teknis Diperlukan"
                        : claim.status === "APPROVED"
                        ? "Disetujui"
                        : claim.status === "IN_SERVICE"
                        ? "Dalam Perbaikan"
                        : claim.status === "REPLACEMENT_PROCESS"
                        ? "Proses Tukar Unit"
                        : claim.status === "COMPLETED"
                        ? "Selesai"
                        : claim.status === "REJECTED"
                        ? "Ditolak"
                        : claim.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Diajukan: {claim.submittedAt ? new Date(claim.submittedAt).toLocaleDateString("id-ID") : "-"}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-800">Kendala: {claim.reason}</p>
                  {claim.description && <p className="text-slate-600">{claim.description}</p>}
                </div>

                {/* Need More Information Action */}
                {claim.status === "NEED_MORE_INFORMATION" && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <WarningCircle size={16} className="text-amber-600" />
                      <span>Permintaan Informasi dari Merchant:</span>
                    </div>
                    <p className="text-amber-800">{claim.needMoreInfoPrompt}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClaimForRespond(claim);
                        setRespondNotes("");
                        setRespondPhotos([]);
                        setIsRespondModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition"
                    >
                      <ArrowsClockwise size={14} weight="bold" />
                      <span>Kirim Klarifikasi Tambahan</span>
                    </button>
                  </div>
                )}

                {claim.rejectionReason && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    <strong>Alasan Penolakan:</strong> {claim.rejectionReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Claim Submission Modal */}
      <AnimatePresence>
        {isClaimModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81]">
                    Klaim Garansi Suku Cadang &amp; Produk
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 font-display mt-0.5">
                    Ajukan Klaim Kerusakan Unit
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Unit Terdaftar:</span>
                <p className="font-bold text-slate-900">{warranty.productName}</p>
                <p className="text-slate-500">
                  Varian: {warranty.variantName} • Masa Berlaku s.d. <strong>{warranty.endAt}</strong>
                </p>
              </div>

              <form onSubmit={handleClaimSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Masalah / Kendala Komponen
                  </label>
                  <input
                    type="text"
                    value={claimReason}
                    onChange={(e) => setClaimReason(e.target.value)}
                    placeholder="Contoh: Kapasitor meledak, relay putus, dll"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ceritakan Detail Kerusakan
                  </label>
                  <textarea
                    rows={3}
                    value={claimDescription}
                    onChange={(e) => setClaimDescription(e.target.value)}
                    placeholder="Jelaskan kondisi saat kendala pertama kali terjadi..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Foto Bukti Fisik / Kerusakan
                  </label>
                  <div className="flex items-center gap-2">
                    {claimPhotos.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                        <img src={url} alt="Bukti" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setClaimPhotos((prev) => [
                          ...prev,
                          "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
                        ])
                      }
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-1 transition"
                    >
                      <Camera size={18} />
                      <span className="text-[9px] font-bold">+ Bukti</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsClaimModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 text-xs transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingClaim}
                    className="px-6 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle size={16} weight="bold" />
                    <span>{isSubmittingClaim ? "Mengirim..." : "Kirim Klaim Garansi"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Respond to Need More Information Modal */}
        {isRespondModalOpen && selectedClaimForRespond && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    Klarifikasi Klaim Garansi
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 font-display mt-0.5">
                    Kirim Informasi &amp; Bukti Tambahan
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRespondModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-900 uppercase">Permintaan Merchant:</span>
                <p className="text-xs text-amber-950 font-medium">
                  {selectedClaimForRespond.needMoreInfoPrompt || "Mohon berikan informasi detail atau foto tambahan terkait kendala unit."}
                </p>
              </div>

              <form onSubmit={handleRespondSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Penjelasan / Tanggapan Anda
                  </label>
                  <textarea
                    rows={4}
                    value={respondNotes}
                    onChange={(e) => setRespondNotes(e.target.value)}
                    placeholder="Tuliskan keterangan detail atau kronologi tambahan yang diminta..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Foto Bukti Tambahan (Opsional)
                  </label>
                  <div className="flex items-center gap-2">
                    {respondPhotos.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                        <img src={url} alt="Bukti" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setRespondPhotos((prev) => [
                          ...prev,
                          "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
                        ])
                      }
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-1 transition"
                    >
                      <Camera size={18} />
                      <span className="text-[9px] font-bold">+ Foto</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRespondModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 text-xs transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRespond}
                    className="px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle size={16} weight="bold" />
                    <span>{isSubmittingRespond ? "Mengirim..." : "Kirim Tanggapan"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}
