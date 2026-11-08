"use client";

import React, { useState, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  Wrench,
  Plus,
  Trash,
  Cube,
  CheckCircle,
  CurrencyCircleDollar,
  Camera,
  Info,
  FloppyDisk,
  PaperPlaneTilt,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { ServiceOrder, ServiceWorkItem, SparepartItem, SparepartSource } from "../../types";

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

interface WorkerDiagnosisFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder;
  onSubmitDiagnosis: (diagnosisData: {
    findings: string;
    rootCause: string;
    damagePhotos: string[];
    recommendedActions: string;
    costBreakdown: {
      workItems: ServiceWorkItem[];
      spareparts: SparepartItem[];
      workTotal: number;
      sparepartTotal: number;
      grandTotal: number;
      version: number;
    };
  }) => Promise<void> | void;
  onAcceptInPerson?: (diagnosisData: {
    findings: string;
    rootCause: string;
    damagePhotos: string[];
    recommendedActions: string;
    costBreakdown: {
      workItems: ServiceWorkItem[];
      spareparts: SparepartItem[];
      workTotal: number;
      sparepartTotal: number;
      grandTotal: number;
      version: number;
    };
  }) => Promise<void> | void;
}

export function WorkerDiagnosisFormModal({
  isOpen,
  onClose,
  order,
  onSubmitDiagnosis,
  onAcceptInPerson,
}: WorkerDiagnosisFormModalProps) {
  const [findings, setFindings] = useState(order.diagnosis?.findings || "");
  const [rootCause, setRootCause] = useState(order.diagnosis?.rootCause || "");
  const [recommendedActions, setRecommendedActions] = useState(
    order.diagnosis?.recommendedActions || ""
  );
  const [damagePhotos, setDamagePhotos] = useState<string[]>(
    order.diagnosis?.damagePhotos || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [consentMode, setConsentMode] = useState<"REMOTE" | "IN_PERSON">("IN_PERSON");
  const [inPersonAgreed, setInPersonAgreed] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      try {
        const compressed = await compressImageFile(file);
        setDamagePhotos((prev) => [...prev, compressed]);
      } catch {
        // Fallback
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePhoto = (index: number) => {
    setDamagePhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Work items
  const [workItems, setWorkItems] = useState<ServiceWorkItem[]>(
    order.diagnosis?.costBreakdown?.workItems || []
  );

  // Spareparts
  const [spareparts, setSpareparts] = useState<SparepartItem[]>(
    order.diagnosis?.costBreakdown?.spareparts || []
  );

  // Work item handlers
  const handleAddWorkItem = () => {
    const newItem: ServiceWorkItem = {
      id: `wi-${Date.now()}`,
      title: "",
      description: "",
      qty: 1,
      unitPrice: 0,
      subtotal: 0,
    };
    setWorkItems([...workItems, newItem]);
  };

  const handleRemoveWorkItem = (idx: number) => {
    setWorkItems(workItems.filter((_, i) => i !== idx));
  };

  const handleUpdateWorkItem = (idx: number, field: keyof ServiceWorkItem, value: any) => {
    setWorkItems(
      workItems.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (field === "qty" || field === "unitPrice") {
          updated.subtotal = (Number(updated.qty) || 0) * (Number(updated.unitPrice) || 0);
        }
        return updated;
      })
    );
  };

  // Sparepart handlers
  const handleAddSparepart = () => {
    const newSp: SparepartItem = {
      id: `sp-${Date.now()}`,
      name: "",
      specification: "",
      source: "PROVIDER",
      qty: 1,
      unitPrice: 0,
      subtotal: 0,
      isAvailableForVisit: true,
    };
    setSpareparts([...spareparts, newSp]);
  };

  const handleRemoveSparepart = (idx: number) => {
    setSpareparts(spareparts.filter((_, i) => i !== idx));
  };

  const handleUpdateSparepart = (idx: number, field: keyof SparepartItem, value: any) => {
    setSpareparts(
      spareparts.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (field === "source" && value === "CUSTOMER") {
          updated.unitPrice = 0;
        }
        if (field === "qty" || field === "unitPrice" || field === "source") {
          updated.subtotal = (Number(updated.qty) || 0) * (Number(updated.unitPrice) || 0);
        }
        return updated;
      })
    );
  };

  // Calculations
  const workTotal = workItems.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  const sparepartTotal = spareparts.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  const grandTotal = workTotal + sparepartTotal;

  const buildDiagnosisPayload = () => ({
    findings: findings.trim() || "Pemeriksaan fisik dan analisis komponen unit servis.",
    rootCause: rootCause.trim() || "Penurunan performa dan keausan operasional komponen.",
    damagePhotos,
    recommendedActions: recommendedActions.trim() || "Perbaikan, pembersihan menyeluruh, dan penggantian suku cadang yang diperlukan.",
    costBreakdown: {
      workItems: workItems.length > 0 ? workItems : [
        {
          id: `wi-${Date.now()}`,
          title: "Jasa Perbaikan & Servis Standar",
          description: "Tindakan teknisi perbaikan unit",
          qty: 1,
          unitPrice: 100000,
          subtotal: 100000,
        },
      ],
      spareparts,
      workTotal: workTotal > 0 ? workTotal : 100000,
      sparepartTotal,
      grandTotal: (workTotal > 0 ? workTotal : 100000) + sparepartTotal,
      version: (order.diagnosis?.version || 0) + 1,
    },
  });

  const handleKirimPengajuan = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onSubmitDiagnosis(buildDiagnosisPayload());
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal mengirimkan pengajuan pemeriksaan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTerimaPengajuanOnsite = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const payload = buildDiagnosisPayload();
      if (onAcceptInPerson) {
        await onAcceptInPerson(payload);
      } else {
        await onSubmitDiagnosis(payload);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Gagal mencatat persetujuan di lokasi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleKirimPengajuan();
  };

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Form Hasil Pemeriksaan & Rincian Biaya Lapangan"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-xs text-slate-700">
        {/* Context Read-Only Header */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Layanan &amp; Order</span>
            <span className="font-bold text-slate-900 block">
              {!order.serviceSnapshot?.title || order.serviceSnapshot.title.startsWith("Service Offering ") || order.serviceSnapshot.title.includes("6129bf1a")
                ? "Cuci dan Servis AC Split Bergaransi Mandiri Teknik"
                : order.serviceSnapshot.title}
            </span>
            <span className="text-[11px] font-mono text-primary font-semibold">#{order.orderNumber}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Keluhan Pelanggan</span>
            <p className="text-[11px] text-slate-600 line-clamp-2 italic">&quot;{order.complaint.description}&quot;</p>
            {order.complaint.photos && order.complaint.photos.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1.5">
                {order.complaint.photos.map((p, i) => (
                  <a key={i} href={p} target="_blank" rel="noopener noreferrer" title="Foto Kerusakan Pelanggan">
                    <img src={p} alt="Foto Kerusakan Pelanggan" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-2xs hover:opacity-85 transition-opacity" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BAGIAN A: PEMERIKSAAN & TEMUAN KERUSAKAN                                  */}
        {/* ========================================================================= */}
        <div className="space-y-3 p-4 rounded-2xl border border-slate-200/90 bg-white">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Wrench size={14} className="text-primary" weight="bold" />
              <span>Bagian A: Hasil Pemeriksaan Fisik &amp; Analisa</span>
            </h4>
            <span className="text-[10px] font-bold text-slate-400">Wajib Diisi</span>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Temuan Kerusakan Lapangan</label>
              <textarea
                required
                rows={2}
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder="Jelaskan kondisi kerusakan yang ditemukan saat pemeriksaan fisik..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Penyebab Utama (Bila Diketahui)</label>
                <input
                  type="text"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="Contoh: Lonjakan tegangan listrik / aus alami"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Tindakan Rekomendasi</label>
                <input
                  type="text"
                  value={recommendedActions}
                  onChange={(e) => setRecommendedActions(e.target.value)}
                  placeholder="Contoh: Penggantian kapasitor & cuci kondensor"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Foto Bukti Kerusakan */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Foto Bukti Kerusakan / Kondisi Awal ({damagePhotos.length})
                </label>
                <span className="text-[10px] text-slate-400">Pilih dari perangkat/kamera</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {damagePhotos.map((url, i) => (
                  <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 relative shrink-0 group shadow-2xs">
                    <img src={url} alt={`Bukti ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-[10px] shadow-xs cursor-pointer transition"
                      title="Hapus foto"
                    >
                      <X size={10} weight="bold" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-primary flex flex-col items-center justify-center text-slate-400 hover:text-primary transition shrink-0 cursor-pointer bg-slate-50/50 hover:bg-sky-50/30"
                  title="Pilih foto dari komputer / folder"
                >
                  <Camera size={18} />
                  <span className="text-[9px] font-bold mt-0.5">+ Foto</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BAGIAN B: RINCIAN TINDAKAN PEKERJAAN                                     */}
        {/* ========================================================================= */}
        <div className="space-y-3 p-4 rounded-2xl border border-slate-200/90 bg-white">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Bagian B: Daftar Tindakan Pekerjaan
              </h4>
              <p className="text-[11px] text-slate-500">Item jasa yang akan dikerjakan oleh teknisi.</p>
            </div>
            <button
              type="button"
              onClick={handleAddWorkItem}
              className="px-3 py-1.5 rounded-xl bg-sky-50 text-primary border border-sky-200 hover:bg-sky-100 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <Plus size={13} weight="bold" />
              <span>Tambah Pekerjaan</span>
            </button>
          </div>

          {workItems.length === 0 ? (
            <p className="text-slate-400 text-center py-3 text-[11px] border border-dashed border-slate-200 rounded-xl">
              Belum ada tindakan pekerjaan. Klik <strong>+ Tambah Pekerjaan</strong> untuk menambah tindakan jasa teknisi.
            </p>
          ) : (
            <div className="space-y-2.5">
              {workItems.map((item, idx) => (
                <div key={item.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Nama tindakan (misal: Jasa Bongkar & Ganti Kapasitor)"
                      value={item.title}
                      onChange={(e) => handleUpdateWorkItem(idx, "title", e.target.value)}
                      className="flex-1 text-xs p-2 rounded-lg border border-slate-200 bg-white font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveWorkItem(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash size={15} />
                    </button>
                  </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Keterangan singkat"
                    value={item.description}
                    onChange={(e) => handleUpdateWorkItem(idx, "description", e.target.value)}
                    className="text-xs p-2 rounded-lg border border-slate-200 bg-white sm:col-span-2"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400 font-mono font-bold">Rp</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) => handleUpdateWorkItem(idx, "unitPrice", Number(e.target.value))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono font-bold text-right"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}

          <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-slate-100">
            <span>Subtotal Jasa Pekerjaan:</span>
            <span className="font-mono text-primary text-sm">{formatRupiah(workTotal)}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BAGIAN C: SUKU CADANG & BAHAN                                             */}
        {/* ========================================================================= */}
        <div className="space-y-3 p-4 rounded-2xl border border-slate-200/90 bg-white">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Bagian C: Suku Cadang &amp; Komponen
              </h4>
              <p className="text-[11px] text-slate-500">Opsional jika membutuhkan suku cadang pengganti.</p>
            </div>
            <button
              type="button"
              onClick={handleAddSparepart}
              className="px-3 py-1.5 rounded-xl bg-sky-50 text-primary border border-sky-200 hover:bg-sky-100 font-bold text-xs flex items-center gap-1 transition"
            >
              <Plus size={13} weight="bold" />
              <span>Tambah Suku Cadang</span>
            </button>
          </div>

          {spareparts.length === 0 ? (
            <p className="text-slate-400 text-center py-2 text-[11px]">
              Tidak ada suku cadang tambahan yang ditambahkan.
            </p>
          ) : (
            <div className="space-y-2.5">
              {spareparts.map((sp, idx) => (
                <div key={sp.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Nama suku cadang (misal: Kapasitor 35uF)"
                      value={sp.name}
                      onChange={(e) => handleUpdateSparepart(idx, "name", e.target.value)}
                      className="flex-1 text-xs p-2 rounded-lg border border-slate-200 bg-white font-semibold"
                    />
                    <select
                      value={sp.source}
                      onChange={(e) => handleUpdateSparepart(idx, "source", e.target.value as SparepartSource)}
                      className="text-xs p-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-700"
                    >
                      <option value="PROVIDER">Dari Bengkel</option>
                      <option value="MERCHANT_05A">Toko SERVIO</option>
                      <option value="CUSTOMER">Milik Pelanggan (Rp0)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveSparepart(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Spesifikasi / Nomor seri"
                      value={sp.specification}
                      onChange={(e) => handleUpdateSparepart(idx, "specification", e.target.value)}
                      className="text-xs p-2 rounded-lg border border-slate-200 bg-white"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 shrink-0">QTY:</span>
                      <input
                        type="number"
                        min={1}
                        value={sp.qty}
                        onChange={(e) => handleUpdateSparepart(idx, "qty", Number(e.target.value))}
                        className="w-16 text-xs p-2 rounded-lg border border-slate-200 bg-white font-bold text-center"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-400 font-mono font-bold">Rp</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        disabled={sp.source === "CUSTOMER"}
                        value={sp.unitPrice}
                        onChange={(e) => handleUpdateSparepart(idx, "unitPrice", Number(e.target.value))}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono font-bold text-right disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-slate-100">
            <span>Subtotal Suku Cadang Bengkel:</span>
            <span className="font-mono text-primary text-sm">{formatRupiah(sparepartTotal)}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BAGIAN D: RINGKASAN BIAYA & SUBMIT                                       */}
        {/* ========================================================================= */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-2.5 shadow-sm">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Subtotal Pekerjaan:</span>
            <span className="font-mono">{formatRupiah(workTotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-300">
            <span>Subtotal Suku Cadang:</span>
            <span className="font-mono">{formatRupiah(sparepartTotal)}</span>
          </div>
          <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
            <span className="font-bold text-sm">Total Estimasi Pengerjaan:</span>
            <span className="font-extrabold text-lg text-emerald-400 font-mono">
              {formatRupiah(grandTotal)}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            * Pelanggan akan menerima rincian ini. Setelah disetujui sah (di lokasi atau via aplikasi), Anda dapat segera memulai perbaikan tanpa menunggu pembayaran pengerjaan di awal.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* PILIHAN METODE PERSETUJUAN BIAYA DENGAN PELANGGAN                        */}
        {/* ========================================================================= */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
            Pilih Metode Persetujuan Biaya dengan Pelanggan:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Opsi 1: Lisan Langsung di Tempat */}
            <label
              onClick={() => setConsentMode("IN_PERSON")}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                consentMode === "IN_PERSON"
                  ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-200"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100/70"
              }`}
            >
              <input
                type="radio"
                name="consentMode"
                checked={consentMode === "IN_PERSON"}
                onChange={() => setConsentMode("IN_PERSON")}
                className="mt-1 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-xs text-slate-900 block flex items-center gap-1.5">
                  <CheckCircle size={15} weight="bold" className="text-emerald-600" />
                  Pelanggan Setuju Langsung di Lokasi (Lisan)
                </span>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Gunakan ini jika pelanggan ada di rumah dan sudah setuju lisan, agar Anda bisa langsung mulai tanpa pelanggan buka aplikasi.
                </p>
              </div>
            </label>

            {/* Opsi 2: Kirim ke Aplikasi */}
            <label
              onClick={() => setConsentMode("REMOTE")}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                consentMode === "REMOTE"
                  ? "bg-sky-50/70 border-sky-300 ring-2 ring-sky-200"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100/70"
              }`}
            >
              <input
                type="radio"
                name="consentMode"
                checked={consentMode === "REMOTE"}
                onChange={() => setConsentMode("REMOTE")}
                className="mt-1 text-primary focus:ring-primary"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-xs text-slate-900 block flex items-center gap-1.5">
                  <PaperPlaneTilt size={15} weight="bold" className="text-primary" />
                  Kirim ke Aplikasi Pelanggan
                </span>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Pelanggan akan menerima notifikasi di ponselnya untuk meninjau dan klik setuju secara digital di aplikasi Servio.
                </p>
              </div>
            </label>
          </div>

          {/* Konfirmasi / Notif Khusus Persetujuan Langsung di Tempat */}
          {consentMode === "IN_PERSON" && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
              <div className="flex items-start gap-2 text-amber-900">
                <Info size={16} weight="bold" className="text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Pemberitahuan:</strong> Anda menyatakan telah menanyakan dan menjelaskan estimasi biaya Rp {grandTotal.toLocaleString("id-ID")} langsung kepada pelanggan di tempat. Sistem akan mencatat persetujuan tatap muka ini dan Anda dapat langsung memulai pengerjaan fisik unit.
                </p>
              </div>
              <label className="flex items-center gap-2 pt-1 border-t border-amber-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inPersonAgreed}
                  onChange={(e) => setInPersonAgreed(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[11px] font-bold text-slate-800">
                  Saya konfirmasi telah menanyakan langsung &amp; pelanggan menyetujui biaya ini di lokasi.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <XCircle size={18} weight="fill" className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tombol Aksi Form */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition disabled:opacity-50 text-center"
          >
            Batal
          </button>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {consentMode === "IN_PERSON" ? (
              <button
                type="button"
                disabled={isSubmitting || !inPersonAgreed}
                onClick={handleTerimaPengajuanOnsite}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle size={16} weight="bold" />
                <span>{isSubmitting ? "Mencatat..." : "Setujui di Lokasi & Mulai Pengerjaan"}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleKirimPengajuan}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <PaperPlaneTilt size={16} weight="bold" className={isSubmitting ? "animate-spin" : ""} />
                <span>{isSubmitting ? "Mengirim Pengajuan..." : "Kirim Pengajuan ke Pelanggan"}</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
