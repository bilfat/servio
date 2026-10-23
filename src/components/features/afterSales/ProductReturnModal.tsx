"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowsClockwise,
  Package,
  Camera,
  Trash,
  Clock,
  WarningCircle,
  X,
  Bank,
  CheckCircle,
} from "@phosphor-icons/react";
import { useAfterSales } from "@/features/afterSales/useAfterSales";

interface ReturnItemOption {
  productId: string;
  productTitle: string;
  itemImageUrl?: string;
  unitPrice: number;
  purchasedQuantity: number;
  eligibleQuantity: number;
}

interface ProductReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  merchantId: string;
  merchantName: string;
  items: ReturnItemOption[];
  onSuccess?: (caseId: string) => void;
}

const RETURN_REASONS = [
  "Barang rusak / cacat saat diterima",
  "Barang salah dikirim (tidak sesuai varian/tipe)",
  "Barang tidak sesuai foto / deskripsi",
  "Komponen atau aksesoris kurang / tidak lengkap",
  "Barang tidak berfungsi sebagaimana mestinya",
  "Lainnya terkait kendala produk",
];

export function ProductReturnModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  merchantId,
  merchantName,
  items,
  onSuccess,
}: ProductReturnModalProps) {
  const { submitReturn } = useAfterSales();

  const [selectedItemIdx, setSelectedItemIdx] = useState(0);
  const currentItem = items[selectedItemIdx] || items[0];

  const [returnQuantity, setReturnQuantity] = useState(1);
  const [selectedReason, setSelectedReason] = useState(RETURN_REASONS[0]);
  const [description, setDescription] = useState("");
  const [chosenSolution, setChosenSolution] = useState<"REFUND" | "REPLACEMENT">("REFUND");
  const [evidencePreviews, setEvidencePreviews] = useState<string[]>([
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
  ]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSampleEvidence = () => {
    if (evidencePreviews.length >= 3) return;
    const samples = [
      "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80",
    ];
    setEvidencePreviews((prev) => [...prev, samples[prev.length % samples.length]]);
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidencePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentItem) {
      setErrorMessage("Pilih barang yang bermasalah.");
      return;
    }

    if (returnQuantity < 1 || returnQuantity > currentItem.eligibleQuantity) {
      setErrorMessage(
        `Kuantitas retur harus antara 1 sampai ${currentItem.eligibleQuantity} unit yang memenuhi syarat.`
      );
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setErrorMessage("Deskripsi kendala wajib diisi minimal 10 karakter.");
      return;
    }

    setIsSubmitting(true);

    try {
      const newCase = submitReturn({
        sourceOrderId: orderId,
        sourceOrderNumber: orderNumber,
        itemTitle: currentItem.productTitle,
        itemImageUrl: currentItem.itemImageUrl,
        itemCategory: "Material & Suku Cadang",
        itemPrice: currentItem.unitPrice,
        orderedQuantity: currentItem.purchasedQuantity,
        affectedQuantity: returnQuantity,
        organizationId: merchantId,
        organizationName: merchantName,
        issueReason: selectedReason,
        issueDescription: description.trim(),
        evidenceMedia: evidencePreviews,
        customerRequestedSolution: chosenSolution,
      });

      setIsSubmitting(false);
      onClose();
      if (onSuccess) {
        onSuccess(newCase.id);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || "Gagal mengajukan retur.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/20 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200 my-6 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <ArrowsClockwise size={22} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-display text-slate-900">
                  Ajukan Retur & Pengembalian Barang
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Retur Barang
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih solusi pengembalian dana atau penggantian barang terlebih dahulu
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
            {/* KOLOM KIRI (5 Cols): Data Objek, Kuantitas & Bukti Foto */}
            <div className="md:col-span-5 space-y-3.5">
              {/* Context Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Order Asal:</span>
                  <span className="font-bold text-slate-800 font-mono">{orderNumber}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Penjual:</span>
                  <span className="font-semibold text-slate-800">{merchantName}</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 leading-relaxed">
                  Retur berlaku untuk barang rusak, salah kirim, cacat fisik, atau komponen kurang (retur parsial didukung).
                </p>
              </div>

              {/* Item Selector & Partial Quantity */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Pilih Item & Kuantitas Retur:
                </label>

                {items.length > 1 && (
                  <select
                    value={selectedItemIdx}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value, 10);
                      setSelectedItemIdx(idx);
                      setReturnQuantity(1);
                    }}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  >
                    {items.map((it, idx) => (
                      <option key={it.productId} value={idx}>
                        {it.productTitle} (Beli: {it.purchasedQuantity} unit)
                      </option>
                    ))}
                  </select>
                )}

                {currentItem && (
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                    <div>
                      <div className="font-bold text-slate-800 line-clamp-2">{currentItem.productTitle}</div>
                      <span className="text-[11px] text-slate-500">
                        Rp{currentItem.unitPrice.toLocaleString("id-ID")} / unit • Pembelian total: {currentItem.purchasedQuantity} unit
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <label className="text-[11px] text-slate-600 font-bold">Kuantitas Diretur:</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={currentItem.eligibleQuantity}
                          value={returnQuantity}
                          onChange={(e) => setReturnQuantity(parseInt(e.target.value, 10) || 1)}
                          className="w-14 p-1.5 text-center font-bold text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-[11px] text-slate-400 font-semibold">/ {currentItem.eligibleQuantity} unit</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Local Evidence Upload */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 block">
                    Foto Bukti Kendala:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSampleEvidence}
                    disabled={evidencePreviews.length >= 3}
                    className="text-[11px] text-blue-600 font-bold hover:underline disabled:opacity-40"
                  >
                    + Tambah Contoh
                  </button>
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
                </div>
                <p className="text-[10px] text-slate-400 italic leading-tight">
                  Pratinjau lokal hanya untuk simulasi — tidak ada berkas yang diunggah ke server nyata.
                </p>
              </div>
            </div>

            {/* KOLOM KANAN (7 Cols): Solusi, Alasan, Deskripsi, Aksi */}
            <div className="md:col-span-7 space-y-3.5">
              {errorMessage && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-300 text-xs text-rose-800">
                  {errorMessage}
                </div>
              )}

              {/* Solution Choice: Customer chooses first (Model A) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Pilih Solusi yang Diharapkan <span className="text-rose-500">*</span>:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setChosenSolution("REFUND")}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                      chosenSolution === "REFUND"
                        ? "bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/20"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-rose-900">
                      <Bank size={16} weight="bold" />
                      Pengembalian Dana (Refund)
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Pengembalian nominal barang ke saldo S-Pay setelah disetujui.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChosenSolution("REPLACEMENT")}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                      chosenSolution === "REPLACEMENT"
                        ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/20"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                      <Package size={16} weight="bold" />
                      Penggantian Barang Baru
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Unit barang pengganti baru dikirimkan oleh penjual.
                    </p>
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 block">
                  Alasan Retur <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 block">
                    Deskripsi Kendala <span className="text-rose-500">*</span>:
                  </label>
                  <span className="text-[10px] text-slate-400">Min. 10 karakter</span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ceritakan detail kerusakan fisik atau ketidaksesuaian barang saat unboxing..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* SLA Notice */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-700 flex items-center gap-2">
                <Clock size={16} weight="bold" className="shrink-0" />
                <span>
                  Penjual memiliki waktu <strong>3 × 24 jam (72 jam)</strong> untuk meninjau retur dan bukti yang Anda lampirkan.
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
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? "Mengirim Retur..." : "Kirim Pengajuan Retur"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
