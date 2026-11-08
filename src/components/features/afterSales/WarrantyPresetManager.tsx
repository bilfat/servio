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
  MagnifyingGlass,
  ArrowsClockwise,
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
  const { presets, addPreset, updatePreset, togglePresetStatus, refreshData } = useAfterSales();

  const orgPresets = presets.filter((p) => {
    if (organizationId && (p.organizationId === organizationId || p.organizationId.includes(organizationId))) {
      return true;
    }
    return p.organizationType === organizationType;
  });

  const [presetSearch, setPresetSearch] = useState("");
  const [presetStatusFilter, setPresetStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const filteredPresets = orgPresets.filter((p) => {
    if (presetStatusFilter === "ACTIVE" && !p.isActive) return false;
    if (presetStatusFilter === "INACTIVE" && p.isActive) return false;
    if (presetSearch.trim()) {
      const q = presetSearch.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchCov = p.coverage.toLowerCase().includes(q);
      if (!matchName && !matchCov) return false;
    }
    return true;
  });

  const activeCount = orgPresets.filter((p) => p.isActive).length;
  const inactiveCount = orgPresets.filter((p) => !p.isActive).length;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<WarrantyPreset | null>(null);
  const [viewingPreset, setViewingPreset] = useState<WarrantyPreset | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [durationDays, setDurationDays] = useState<number>(30);
  const [coverage, setCoverage] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (durationDays <= 0) return;

    setIsSubmitting(true);
    try {
      if (editingPreset) {
        await updatePreset(editingPreset.id, {
          name: name.trim(),
          durationDays,
          coverage: coverage.trim(),
          exclusions: exclusions.trim(),
          isActive,
        });
        setToastMsg(`Pilihan garansi "${name}" berhasil diperbarui.`);
      } else {
        await addPreset({
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
    } catch (err: any) {
      setToastMsg(err.message || "Gagal menyimpan opsi garansi.");
    } finally {
      setIsSubmitting(false);
    }
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="Muat ulang data garansi dari database"
          >
            <ArrowsClockwise size={13} weight="bold" />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition shadow-xs self-start sm:self-auto cursor-pointer shrink-0"
          >
            <Plus size={14} weight="bold" />
            <span>Tambah Pilihan Garansi</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setPresetStatusFilter("ALL")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
              presetStatusFilter === "ALL"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua ({orgPresets.length})
          </button>
          <button
            type="button"
            onClick={() => setPresetStatusFilter("ACTIVE")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
              presetStatusFilter === "ACTIVE"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            Aktif ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setPresetStatusFilter("INACTIVE")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
              presetStatusFilter === "INACTIVE"
                ? "bg-slate-700 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Nonaktif ({inactiveCount})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={presetSearch}
            onChange={(e) => setPresetSearch(e.target.value)}
            placeholder="Cari nama atau cakupan garansi..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
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
      ) : filteredPresets.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
          <p className="text-xs font-bold text-slate-700">Tidak ada pilihan garansi yang sesuai filter.</p>
          <button
            type="button"
            onClick={() => {
              setPresetSearch("");
              setPresetStatusFilter("ALL");
            }}
            className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredPresets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => setViewingPreset(preset)}
              className={`p-4 rounded-2xl border transition bg-white space-y-3 shadow-xs cursor-pointer hover:border-blue-300 hover:shadow-md ${
                preset.isActive ? "border-slate-200/80" : "border-slate-200/60 opacity-60 bg-slate-50/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
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
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      v{preset.version || 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                    <span className="font-semibold text-primary flex items-center gap-1">
                      <Clock size={14} weight="bold" />
                      Durasi: {preset.durationDays} Hari
                    </span>
                    {preset.updatedAt && (
                      <>
                        <span>•</span>
                        <span className="text-[11px] text-slate-400">
                          Diperbarui {new Date(preset.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => openEditModal(preset)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="Edit Garansi"
                  >
                    <PencilSimple size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePresetStatus(preset.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition cursor-pointer"
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

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-blue-600">
                <span>Klik untuk detail lengkap opsi garansi</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: View Preset Detail (M02) */}
      <AnimatePresence>
        {viewingPreset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/30 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200 my-8"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Versi v{viewingPreset.version || 1}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        viewingPreset.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {viewingPreset.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1.5">{viewingPreset.name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID Opsi: {viewingPreset.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingPreset(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Masa Berlaku</span>
                  <span className="font-bold text-slate-900 text-sm">{viewingPreset.durationDays} Hari Kalender</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Tipe Organisasi</span>
                  <span className="font-bold text-slate-800">
                    {viewingPreset.organizationType === "MERCHANT" ? "Garansi Toko (Merchant)" : "Garansi Layanan (Provider)"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Dibuat Pada</span>
                  <span className="font-medium text-slate-700">
                    {viewingPreset.createdAt ? new Date(viewingPreset.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Terakhir Diperbarui</span>
                  <span className="font-medium text-slate-700">
                    {viewingPreset.updatedAt ? new Date(viewingPreset.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/70">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase block mb-1">Cakupan Garansi</span>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">{viewingPreset.coverage}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70">
                  <span className="text-[11px] font-bold text-amber-800 uppercase block mb-1">Pengecualian & Ketentuan</span>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {viewingPreset.exclusions || "Tidak ada pengecualian khusus di luar pemakaian wajar."}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-800">
                Setiap perubahan pada template garansi akan menerbitkan versi baru tanpa mengubah snapshot hak garansi (entitlement) pada pesanan pelanggan yang sudah selesai sebelumnya.
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={async () => {
                    await togglePresetStatus(viewingPreset.id);
                    setViewingPreset(null);
                  }}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {viewingPreset.isActive ? "Nonaktifkan Opsi" : "Aktifkan Opsi"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingPreset(null)}
                    className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingPreset;
                      setViewingPreset(null);
                      openEditModal(target);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                  >
                    Edit & Terbitkan Versi Baru
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition cursor-pointer"
                  >
                    {isSubmitting ? "Menyimpan..." : editingPreset ? "Simpan Perubahan" : "Buat Pilihan Garansi"}
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
