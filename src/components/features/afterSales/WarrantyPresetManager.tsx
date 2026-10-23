"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Plus,
  PencilSimple,
  ToggleLeft,
  ToggleRight,
  Trash,
  CheckCircle,
  WarningCircle,
  Package,
  Wrench,
  Clock,
  X,
} from "@phosphor-icons/react";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { WarrantyPreset } from "@/types/afterSales";

interface WarrantyPresetManagerProps {
  organizationId: string;
  organizationType: "MERCHANT" | "PROVIDER";
  title?: string;
  subtitle?: string;
}

export function WarrantyPresetManager({
  organizationId,
  organizationType,
  title,
  subtitle,
}: WarrantyPresetManagerProps) {
  const { presets, addPreset, updatePreset, togglePresetStatus } = useAfterSales();

  const orgPresets = presets.filter(
    (p) => p.organizationId === organizationId || p.organizationType === organizationType
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<WarrantyPreset | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [durationDays, setDurationDays] = useState<number>(30);
  const [coverage, setCoverage] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingPreset(null);
    setName("");
    setDurationDays(30);
    setCoverage("");
    setExclusions("");
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (preset: WarrantyPreset) => {
    setEditingPreset(preset);
    setName(preset.name);
    setDurationDays(preset.durationDays);
    setCoverage(preset.coverage);
    setExclusions(preset.exclusions);
    setIsActive(preset.isActive);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (durationDays <= 0) return;

    if (editingPreset) {
      updatePreset(editingPreset.id, {
        name: name.trim(),
        durationDays,
        coverage: coverage.trim(),
        exclusions: exclusions.trim(),
        isActive,
      });
      setToastMsg(`Pilihan garansi "${name}" berhasil diperbarui.`);
    } else {
      addPreset({
        organizationId,
        organizationType,
        name: name.trim(),
        durationDays,
        coverage: coverage.trim(),
        exclusions: exclusions.trim(),
        isActive,
      });
      setToastMsg(`Pilihan garansi "${name}" berhasil ditambahkan.`);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-emerald-700 font-bold ml-4">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold font-display text-slate-900">
            {title || (organizationType === "MERCHANT" ? "Pengaturan Garansi Toko" : "Pengaturan Garansi Layanan")}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {subtitle ||
              "Kelola daftar opsi garansi yang dapat dipilih untuk katalog produk dan jasa usaha Anda."}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition shadow-xs self-start sm:self-auto cursor-pointer shrink-0"
        >
          <Plus size={14} weight="bold" />
          <span>Tambah Pilihan Garansi</span>
        </button>
      </div>

      {/* Preset List */}
      {orgPresets.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2.5">
          <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <ShieldCheck size={22} />
          </div>
          <h3 className="font-bold text-xs text-slate-700">Belum Ada Pilihan Garansi</h3>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Buat opsi garansi pertama untuk toko/layanan Anda. Durasi hari dapat diisi bebas sesuai kebijakan usaha Anda.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Buat Garansi Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {orgPresets.map((preset) => (
            <div
              key={preset.id}
              className={`p-4 rounded-2xl border transition bg-white space-y-3 shadow-xs ${
                preset.isActive ? "border-slate-200/80" : "border-slate-200/60 opacity-60 bg-slate-50/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">{preset.name}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        preset.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {preset.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className="font-semibold text-primary flex items-center gap-1">
                      <Clock size={14} weight="bold" />
                      Durasi: {preset.durationDays} Hari
                    </span>
                    <span>•</span>
                    <span>Dipakai di {preset.usageCount} katalog</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(preset)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    title="Edit Garansi"
                  >
                    <PencilSimple size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePresetStatus(preset.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition"
                    title={preset.isActive ? "Nonaktifkan Garansi" : "Aktifkan Garansi"}
                  >
                    {preset.isActive ? (
                      <ToggleRight size={20} weight="fill" className="text-emerald-600" />
                    ) : (
                      <ToggleLeft size={20} weight="bold" className="text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Cakupan:</span>
                  <p className="text-slate-700 line-clamp-2">{preset.coverage}</p>
                </div>
                {preset.exclusions && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">Pengecualian / Ketentuan:</span>
                    <p className="text-slate-600 line-clamp-2">{preset.exclusions}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add / Edit Preset */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/20 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 my-8"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                  <ShieldCheck size={20} weight="fill" className="text-primary" />
                  <span>{editingPreset ? "Edit Pilihan Garansi" : "Tambah Pilihan Garansi Baru"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {editingPreset && editingPreset.usageCount > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <WarningCircle size={16} weight="fill" className="shrink-0 text-amber-600" />
                  <span>
                    Perubahan ini tidak mengubah garansi yang sudah dimiliki pelanggan sebelumnya pada transaksi masa lalu.
                  </span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Nama Pilihan Garansi:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Garansi Toko Tukar Baru 14 Hari..."
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Durasi Masa Berlaku Garansi (Input Bebas dalam Hari):
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      required
                      min={1}
                      max={3650}
                      value={durationDays}
                      onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 1)}
                      className="w-32 p-2.5 text-xs font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-xs text-slate-500 font-medium">
                      Hari Kalender (bebas angka positif, mis. 10, 20, 30, 45, 90, 365)
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Cakupan Garansi:</label>
                  <textarea
                    rows={3}
                    required
                    value={coverage}
                    onChange={(e) => setCoverage(e.target.value)}
                    placeholder="Jelaskan apa saja yang ditanggung (misal: cacat pabrik, kebocoran pipa, kerusakan kompresor)..."
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Pengecualian / Syarat Ketentuan:</label>
                  <textarea
                    rows={2}
                    value={exclusions}
                    onChange={(e) => setExclusions(e.target.value)}
                    placeholder="Pengecualian yang wajar (misal: kerusakan akibat sambaran petir langsung, segel toko robek)..."
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveCheckbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-primary border-slate-300"
                  />
                  <label htmlFor="isActiveCheckbox" className="text-xs font-semibold text-slate-700">
                    Aktifkan opsi garansi ini agar bisa dipilih di katalog produk/jasa
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                  >
                    {editingPreset ? "Simpan Perubahan (Demo)" : "Buat Pilihan Garansi (Demo)"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
