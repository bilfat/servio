"use client";

import React, { useState, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  Wrench,
  CheckCircle,
  Camera,
  FloppyDisk,
  Cube,
  ShieldCheck,
  Info,
  X,
} from "@phosphor-icons/react";
import { ServiceOrder } from "../../types";

const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

interface WorkerFinishFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder;
  onFinishJob: (executionData: {
    beforePhotos: string[];
    afterPhotos: string[];
    workSummary: string;
    testResults: string;
    usedSpareparts?: string[];
    notes?: string;
  }) => void;
}

export function WorkerFinishFormModal({
  isOpen,
  onClose,
  order,
  onFinishJob,
}: WorkerFinishFormModalProps) {
  const [beforePhotos, setBeforePhotos] = useState<string[]>(
    order.execution?.beforePhotos?.length
      ? order.execution.beforePhotos
      : order.diagnosis?.damagePhotos || []
  );

  const [afterPhotos, setAfterPhotos] = useState<string[]>(
    order.execution?.afterPhotos?.length
      ? order.execution.afterPhotos
      : []
  );

  const beforeFileInputRef = useRef<HTMLInputElement | null>(null);
  const afterFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleBeforePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      try {
        const compressed = await compressImageFile(file);
        setBeforePhotos((prev) => [...prev, compressed]);
      } catch {
        // Fallback
      }
    }
    if (beforeFileInputRef.current) beforeFileInputRef.current.value = "";
  };

  const handleAfterPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      try {
        const compressed = await compressImageFile(file);
        setAfterPhotos((prev) => [...prev, compressed]);
      } catch {
        // Fallback
      }
    }
    if (afterFileInputRef.current) afterFileInputRef.current.value = "";
  };

  const handleRemoveBeforePhoto = (index: number) => {
    setBeforePhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleRemoveAfterPhoto = (index: number) => {
    setAfterPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const [workSummary, setWorkSummary] = useState(
    order.execution?.workSummary || ""
  );

  const [testResults, setTestResults] = useState(
    order.execution?.testResults || ""
  );

  const [notes, setNotes] = useState(order.execution?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFinishJob({
      beforePhotos,
      afterPhotos,
      workSummary,
      testResults,
      usedSpareparts: order.diagnosis?.costBreakdown.spareparts.map((s) => s.name) || [],
      notes,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Form Penyelesaian Pekerjaan &amp; Bukti Lapangan"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-slate-700">
        <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100 flex items-start gap-2.5">
          <Info size={16} weight="bold" className="text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-600 leading-snug">
            Unggah bukti foto sebelum dan sesudah serta catatan pengujian fungsi. Setelah Anda menandai selesai, sistem akan menerbitkan tagihan pelunasan pengerjaan resmi kepada pelanggan.
          </p>
        </div>

        {/* Foto Sebelum & Sesudah */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50">
          <div>
            <input
              type="file"
              ref={beforeFileInputRef}
              accept="image/*"
              multiple
              onChange={handleBeforePhotoUpload}
              className="hidden"
            />
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Foto Sebelum ({beforePhotos.length})
              </label>
              <span className="text-[9px] text-slate-400">Pilih dari folder</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {beforePhotos.map((url, i) => (
                <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 relative group shadow-2xs">
                  <img src={url} alt={`Before ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveBeforePhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-[10px] shadow-xs cursor-pointer transition"
                    title="Hapus foto"
                  >
                    <X size={10} weight="bold" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => beforeFileInputRef.current?.click()}
                className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-primary flex flex-col items-center justify-center text-slate-400 hover:text-primary transition shrink-0 cursor-pointer bg-white"
                title="Pilih foto sebelum dari komputer"
              >
                <Camera size={16} />
                <span className="text-[8px] font-bold mt-0.5">+ Foto</span>
              </button>
            </div>
          </div>

          <div>
            <input
              type="file"
              ref={afterFileInputRef}
              accept="image/*"
              multiple
              onChange={handleAfterPhotoUpload}
              className="hidden"
            />
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Foto Sesudah ({afterPhotos.length})
              </label>
              <span className="text-[9px] text-slate-400">Pilih dari folder</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {afterPhotos.map((url, i) => (
                <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 relative group shadow-2xs">
                  <img src={url} alt={`After ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveAfterPhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-[10px] shadow-xs cursor-pointer transition"
                    title="Hapus foto"
                  >
                    <X size={10} weight="bold" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => afterFileInputRef.current?.click()}
                className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-primary flex flex-col items-center justify-center text-slate-400 hover:text-primary transition shrink-0 cursor-pointer bg-white"
                title="Pilih foto sesudah dari komputer"
              >
                <Camera size={16} />
                <span className="text-[8px] font-bold mt-0.5">+ Foto</span>
              </button>
            </div>
          </div>
        </div>

        {/* Ringkasan Pekerjaan */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            Ringkasan Pekerjaan yang Telah Dilakukan
          </label>
          <textarea
            required
            rows={2}
            value={workSummary}
            onChange={(e) => setWorkSummary(e.target.value)}
            placeholder="Jelaskan ringkasan tindakan pekerjaan yang telah tuntas dilakukan sesuai SOP..."
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
          />
        </div>

        {/* Hasil Pengujian / Testing */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            Hasil Uji Coba &amp; Pengujian Fungsi
          </label>
          <textarea
            required
            rows={2}
            value={testResults}
            onChange={(e) => setTestResults(e.target.value)}
            placeholder="Contoh: Unit dites menyala 15 menit, suhu stabil, tidak ada getaran abnormal..."
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
          />
        </div>

        {/* Catatan untuk Pelanggan */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            Catatan Perawatan / Saran untuk Pelanggan (Opsional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Disarankan cuci filter rutin setiap 2 minggu sekali"
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle size={15} weight="bold" />
            <span>Pekerjaan Selesai (Kirim Bukti)</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
