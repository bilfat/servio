"use client";

import React, { useState } from "react";
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
} from "@phosphor-icons/react";
import { ServiceOrder, ServiceWorkItem, SparepartItem, SparepartSource } from "../../types";

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
  }) => void;
}

export function WorkerDiagnosisFormModal({
  isOpen,
  onClose,
  order,
  onSubmitDiagnosis,
}: WorkerDiagnosisFormModalProps) {
  const [findings, setFindings] = useState(order.diagnosis?.findings || "");
  const [rootCause, setRootCause] = useState(order.diagnosis?.rootCause || "");
  const [recommendedActions, setRecommendedActions] = useState(
    order.diagnosis?.recommendedActions || ""
  );
  const [damagePhotos, setDamagePhotos] = useState<string[]>(
    order.diagnosis?.damagePhotos || []
  );

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitDiagnosis({
      findings,
      rootCause,
      damagePhotos,
      recommendedActions,
      costBreakdown: {
        workItems,
        spareparts,
        workTotal,
        sparepartTotal,
        grandTotal,
        version: (order.diagnosis?.version || 0) + 1,
      },
    });
    onClose();
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
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Foto Bukti Kerusakan / Kondisi Awal</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {damagePhotos.map((url, i) => (
                  <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 relative shrink-0">
                    <img src={url} alt={`Bukti ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const url = window.prompt("Masukkan URL foto bukti kerusakan:");
                    if (url && url.trim()) {
                      setDamagePhotos((prev) => [...prev, url.trim()]);
                    }
                  }}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary flex flex-col items-center justify-center text-slate-400 hover:text-primary transition shrink-0 cursor-pointer"
                >
                  <Camera size={16} />
                  <span className="text-[9px] font-bold mt-1">+ Foto</span>
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
                      step={5000}
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
                        step={5000}
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

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <PaperPlaneTilt size={16} weight="bold" />
            <span>Kirim Hasil Pemeriksaan ke Pelanggan</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
