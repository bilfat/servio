"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Package,
  Wrench,
  Camera,
  Trash,
  Clock,
  WarningCircle,
  X,
  CheckCircle,
  UploadSimple,
} from "@phosphor-icons/react";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { CustomerWarrantyEntitlement } from "@/types/afterSales";

interface WarrantyClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  warranty: CustomerWarrantyEntitlement;
  onSuccess?: (caseId: string) => void;
}

const PRODUCT_REASONS = [
  "Tidak berfungsi sebagaimana mestinya",
  "Kerusakan komponen / cacat pabrik",
  "Nilai spesifikasi teknis tidak sesuai",
  "Terbakar / korsleting pada penggunaan normal",
  "Komponen macet atau menimbulkan suara abnormal",
  "Lainnya terkait cakupan garansi toko",
];

const SERVICE_REASONS = [
  "Masalah yang sama muncul kembali pasca servis",
  "Indoor/outdoor AC meneteskan air pasca pengerjaan",
  "Hembusan angin berbau / tidak dingin dalam kondisi normal",
  "Hasil pengerjaan tidak sesuai standar kesepakatan",
  "Instalasi pipa / kabel kendor atau bocor",
  "Lainnya terkait cakupan garansi layanan",
];

export function WarrantyClaimModal({
  isOpen,
  onClose,
  warranty,
  onSuccess,
}: WarrantyClaimModalProps) {
  const { submitClaim, cases, refreshData } = useAfterSales();

  const isProduct = warranty.itemType === "PRODUCT";
  const reasonOptions = isProduct ? PRODUCT_REASONS : SERVICE_REASONS;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedReason, setSelectedReason] = useState(reasonOptions[0]);
  const [description, setDescription] = useState("");
  const [chosenSolution, setChosenSolution] = useState<"REPLACEMENT" | "REWORK" | "REFUND">(
    isProduct ? "REPLACEMENT" : "REWORK"
  );
  const [claimedQuantity, setClaimedQuantity] = useState<number>(1);
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
  ]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if there is already an active claim for this warranty
  const existingActiveCase = cases.find(
    (c) =>
      c.warrantyId === warranty.id &&
      c.mainStatus !== "COMPLETED" &&
      c.mainStatus !== "REJECTED"
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).slice(0, 4 - evidencePreviews.length);
    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === "string") {
          setEvidencePreviews((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddSampleEvidence = () => {
    if (evidencePreviews.length >= 4) return;
    const samples = [
      "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80",
    ];
    setEvidencePreviews((prev) => [...prev, samples[prev.length % samples.length]]);
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidencePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (existingActiveCase) {
      setErrorMessage(
        `Sudah ada pengajuan klaim aktif (#${existingActiveCase.caseNumber}) untuk garansi ini yang sedang diproses.`
      );
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setErrorMessage("Deskripsi masalah wajib diisi minimal 10 karakter.");
      return;
    }

    setIsSubmitting(true);

    try {
      const snap = typeof (warranty as any).catalogSnapshot === "string"
        ? (() => { try { return JSON.parse((warranty as any).catalogSnapshot); } catch { return {}; } })()
        : ((warranty as any).catalogSnapshot || {});
      const effectiveItemPrice = Number(snap?.price ?? snap?.unit_price ?? 150000);

      const newCase = await submitClaim({
        caseType: isProduct ? "claim_product" : "claim_service",
        sourceOrderId: warranty.orderId,
        sourceOrderNumber: warranty.orderNumber,
        itemTitle: warranty.itemTitle,
        itemImageUrl: warranty.itemImageUrl,
        itemCategory: isProduct ? "Suku Cadang & Komponen" : "Jasa Layanan",
        itemPrice: effectiveItemPrice,
        organizationId: warranty.organizationId,
        organizationName: warranty.organizationName,
        organizationType: isProduct ? "MERCHANT" : "PROVIDER",
        warrantyId: warranty.id,
        warrantyName: warranty.presetName,
        warrantyDurationDays: warranty.durationDays,
        warrantyExpiryDate: warranty.endDate,
        issueReason: selectedReason,
        issueDescription: description.trim(),
        evidenceMedia: evidencePreviews,
        customerRequestedSolution: chosenSolution as any,
        quantity: claimedQuantity,
      });

      await refreshData();
      setIsSubmitting(false);
      onClose();
      if (onSuccess && newCase) {
        onSuccess(newCase.id);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || "Gagal mengirim klaim.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200 my-6 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky/30 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck size={22} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-display text-slate-900">
                  Ajukan Klaim Garansi
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Garansi Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isProduct ? "Garansi Toko Merchant Resmi" : "Garansi Layanan Service Provider"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* 2-Column Side-by-Side Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* KOLOM KIRI (5 Cols): Data Objek, Garansi, & Foto Bukti */}
            <div className="md:col-span-5 space-y-3.5">
              {/* Context Summary Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Order Asal:</span>
                  <span className="font-bold text-slate-800 font-mono">{warranty.orderNumber}</span>
                </div>
                <div className="flex justify-between items-start gap-2 pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium shrink-0">Item / Jasa:</span>
                  <span className="font-bold text-slate-900 text-right line-clamp-2">{warranty.itemTitle}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Penyedia:</span>
                  <span className="font-semibold text-slate-800">{warranty.organizationName}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Masa Berlaku:</span>
                  <span className="font-bold text-emerald-700">
                    {warranty.durationDays} Hari Kalender
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                  <span>Kadaluarsa:</span>
                  <span className="font-semibold text-slate-700">
                    {warranty.endDate ? new Date(warranty.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                  </span>
                </div>
              </div>

              {/* Ketentuan Garansi Card */}
              {warranty.coverage && (
                <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-[11px] space-y-1">
                  <p className="font-bold text-emerald-950 flex items-center gap-1">
                    <ShieldCheck size={14} weight="fill" className="text-emerald-700" />
                    Cakupan yang Ditanggung:
                  </p>
                  <p className="text-emerald-900/90 leading-relaxed">{warranty.coverage}</p>
                </div>
              )}

              {/* Local Evidence Upload */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 block">
                    Foto Bukti Kendala:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={evidencePreviews.length >= 4}
                      className="text-[11px] text-primary font-bold hover:underline disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                    >
                      <UploadSimple size={12} weight="bold" />
                      Pilih Foto
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleAddSampleEvidence}
                      disabled={evidencePreviews.length >= 4}
                      className="text-[11px] text-blue-600 font-bold hover:underline disabled:opacity-40 cursor-pointer"
                    >
                      + Contoh
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {evidencePreviews.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group shadow-2xs"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveEvidence(idx)}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow"
                        title="Hapus foto"
                      >
                        <Trash size={10} weight="bold" />
                      </button>
                    </div>
                  ))}
                  {evidencePreviews.length < 4 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-primary flex flex-col items-center justify-center text-slate-400 hover:text-primary transition cursor-pointer"
                    >
                      <Camera size={18} weight="bold" />
                      <span className="text-[9px] mt-0.5 font-bold">Upload</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* KOLOM KANAN (7 Cols): Form Masalah & Aksi */}
            <div className="md:col-span-7 space-y-3.5">
              {existingActiveCase && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-900 flex items-start gap-2">
                  <WarningCircle size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Perhatian: Garansi ini sudah memiliki klaim berjalan <strong>#{existingActiveCase.caseNumber}</strong>. Sesuai aturan, Anda tidak dapat mengajukan klaim ganda aktif untuk objek yang sama.
                  </span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-300 text-xs text-rose-800">
                  {errorMessage}
                </div>
              )}

              {warranty.quantity && warranty.quantity > 1 ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 block">
                    Jumlah Unit yang Diklaim:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={warranty.quantity}
                      value={claimedQuantity}
                      onChange={(e) =>
                        setClaimedQuantity(
                          Math.min(
                            warranty.quantity || 1,
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        )
                      }
                      className="w-24 p-2 text-xs border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="text-xs text-slate-500">
                      dari total {warranty.quantity} unit bergaransi sah
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 block">
                  Alasan Masalah yang Dialami <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {reasonOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 block">
                    Deskripsi Masalah / Kronologi <span className="text-rose-500">*</span>:
                  </label>
                  <span className="text-[10px] text-slate-400">Min. 10 karakter</span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ceritakan kendala yang terjadi secara rinci sejak barang/layanan diterima..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Solusi yang Diharapkan <span className="text-rose-500">*</span>:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChosenSolution(isProduct ? "REPLACEMENT" : "REWORK")}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      chosenSolution === (isProduct ? "REPLACEMENT" : "REWORK")
                        ? "border-blue-600 bg-blue-50/70 text-blue-900"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="text-xs font-bold">
                      {isProduct ? "Ganti Unit Baru (Replacement)" : "Pengerjaan Ulang (Rework)"}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {isProduct
                        ? "Kirim unit pengganti baru"
                        : "Teknisi datang servis ulang garansi"}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChosenSolution("REFUND")}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      chosenSolution === "REFUND"
                        ? "border-blue-600 bg-blue-50/70 text-blue-900"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="text-xs font-bold">Pengembalian Dana (Refund)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Pengembalian dana ke saldo S-Pay
                    </div>
                  </button>
                </div>
              </div>

              {/* SLA Notice */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-700 flex items-center gap-2">
                <Clock size={16} weight="bold" className="shrink-0" />
                <span>
                  Pelaku usaha memiliki waktu <strong>3 × 24 jam (72 jam)</strong> sejak pengajuan diterima untuk merespons klaim ini.
                </span>
              </div>

              {/* Submit Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition border border-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!existingActiveCase}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? "Mengirim Klaim..." : "Kirim Klaim Garansi"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
