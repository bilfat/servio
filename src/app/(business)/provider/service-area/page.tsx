"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  CheckCircle,
  Plus,
  Trash,
  SlidersHorizontal,
  FloppyDisk,
  Info,
  ArrowsClockwise,
  Buildings,
  NavigationArrow,
} from "@phosphor-icons/react";
import { Toast } from "@/components/feedback/Toast";
import { useActiveRole } from "@/context/RoleContext";
import { organizationApi } from "@/lib/servioApi";

export default function ProviderServiceAreaPage() {
  const { user } = useActiveRole();
  const orgId = user.activeOrganization?.id || user.organizationId;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info" | "warning">("success");
  const [workRadiusKm, setWorkRadiusKm] = useState(15);
  const [areas, setAreas] = useState<string[]>([
    "Tebet & Pancoran (Jakarta Selatan)",
    "Kebayoran Baru & Gandaria",
    "Mampang Prapatan & Kuningan",
    "Pasar Minggu & Kalibata",
    "Jatinegara & Matraman (Jakarta Timur)",
  ]);
  const [newArea, setNewArea] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    const loadCoverage = async () => {
      setIsLoading(true);
      try {
        const res = await organizationApi.getCoverage(orgId);
        if (res.data) {
          if (res.data.coverageRadiusKm !== null && res.data.coverageRadiusKm !== undefined) {
            setWorkRadiusKm(res.data.coverageRadiusKm);
          }
          if (res.data.serviceAreas && res.data.serviceAreas.length > 0) {
            setAreas(res.data.serviceAreas.map((a: any) => typeof a === "string" ? a : (a.name || a.code)));
          }
        }
      } catch {
        // Keep fallback values on initial setup
      } finally {
        setIsLoading(false);
      }
    };
    loadCoverage();
  }, [orgId]);

  const handleSaveCoverage = async () => {
    if (!orgId) {
      setToastMessage("Organisasi tidak teridentifikasi.");
      setToastType("warning");
      return;
    }
    setIsSaving(true);
    try {
      await organizationApi.updateCoverage(orgId, {
        coverageRadiusKm: workRadiusKm,
        serviceAreas: areas.map((name) => ({
          type: "CITY",
          code: name.replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase(),
          name,
        })),
      });
      setToastMessage("Cakupan area & radius layanan berhasil disimpan ke sistem!");
      setToastType("success");
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal menyimpan konfigurasi cakupan.");
      setToastType("warning");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddArea = () => {
    if (!newArea.trim()) return;
    if (areas.includes(newArea.trim())) {
      setToastMessage("Wilayah ini sudah ada dalam daftar cakupan.");
      setToastType("warning");
      return;
    }
    setAreas([...areas, newArea.trim()]);
    setNewArea("");
    setToastMessage("Area jangkauan servis baru berhasil ditambahkan.");
    setToastType("info");
  };

  const handleRemoveArea = (idx: number) => {
    setAreas(areas.filter((_, i) => i !== idx));
    setToastMessage("Area servis dihapus.");
    setToastType("info");
  };

  const handleReset = () => {
    setWorkRadiusKm(15);
    setToastMessage("Pengaturan dikembalikan ke konfigurasi default.");
    setToastType("info");
  };

  return (
    <div className="space-y-4 pb-16 w-full font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
              Cakupan Operasional Teknisi
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-display font-extrabold text-slate-900 leading-tight">
            Area &amp; Radius Jangkauan Layanan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur batas radius jarak penugasan teknisi dan kecamatan cakupan operasional bengkel Anda.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <ArrowsClockwise size={14} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            disabled={isSaving || isLoading}
            onClick={handleSaveCoverage}
            className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FloppyDisk size={15} weight="bold" />
            <span>{isSaving ? "Menyimpan..." : "Simpan Cakupan"}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* KOLOM KIRI (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card A: Radius Maksimum Penugasan */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <SlidersHorizontal size={15} className="text-primary shrink-0" weight="bold" />
                <span>A. Radius Maksimum Teknisi</span>
              </div>
              <span className="text-[11px] font-bold text-primary bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                {workRadiusKm} KM
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 text-[11px] font-medium">Batas Jarak Penugasan:</span>
                <span className="font-bold text-slate-900 font-mono text-xs">{workRadiusKm} km dari workshop</span>
              </div>

              <input
                type="range"
                min={5}
                max={40}
                value={workRadiusKm}
                onChange={(e) => setWorkRadiusKm(Number(e.target.value))}
                className="w-full accent-primary h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                <span>5 km (Lokal)</span>
                <span>20 km (Standar)</span>
                <span>40 km (Maksimal)</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-500">Estimasi waktu tempuh:</span>
                  <span className="font-bold text-slate-900">
                    &plusmn; {Math.round(workRadiusKm * 2)} - {Math.round(workRadiusKm * 3.5)} menit
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-500">Status penerimaan order:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" />
                    <span>Aktif dalam {workRadiusKm} km</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card B: Titik Pusat Workshop */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Buildings size={15} className="text-primary shrink-0" weight="bold" />
                <span>B. Titik Pusat Workshop</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">GPS Reference</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-rose-500 shrink-0" weight="fill" />
                <span className="font-bold text-slate-900 text-xs">
                  {user.activeOrganization?.name || "Bengkel Servis Pusat Mitra"}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug pl-6">
                Jl. Tebet Raya No. 42, Tebet Barat, Jakarta Selatan 12810
              </p>
              <div className="pl-6 pt-1 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-200/60">
                <span>Lat: -6.2361</span>
                <span>Lng: 106.8522</span>
              </div>
            </div>
          </div>

          {/* Card C: Ketentuan Dispatch */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-blue-950 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#0F4C81]">
              <Info size={15} weight="bold" />
              <span>Ketentuan Penugasan Teknisi</span>
            </div>
            <p className="leading-relaxed">
              Order di luar radius <strong>{workRadiusKm} km</strong> atau di luar kecamatan terdaftar akan dialihkan ke mitra provider lain yang terdekat demi menjaga ketepatan waktu servis.
            </p>
          </div>
        </div>

        {/* KOLOM KANAN (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card D: Daftar Wilayah / Kecamatan Aktif */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  C. Daftar Wilayah &amp; Kecamatan Aktif
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Kecamatan dan kelurahan prioritas penugasan tim teknisi bengkel Anda.
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {areas.length} Area
              </span>
            </div>

            {/* Input Tambah Area Baru */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddArea();
                    }
                  }}
                  placeholder="Ketik nama kecamatan atau kota baru (contoh: Cilandak, Jaksel)..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                type="button"
                onClick={handleAddArea}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <Plus size={13} weight="bold" />
                <span>Tambah</span>
              </button>
            </div>

            {/* Tabel List Area */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2 px-3 w-10">No</th>
                    <th className="py-2 px-3">Nama Wilayah / Kecamatan</th>
                    <th className="py-2 px-3 w-28 text-center">Status</th>
                    <th className="py-2 px-3 w-16 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {areas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                        Belum ada wilayah jangkauan. Silakan tambahkan minimal satu wilayah di atas.
                      </td>
                    </tr>
                  ) : (
                    areas.map((area, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-2 px-3 font-mono font-bold text-slate-400 text-xs">
                          #{idx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 text-xs">
                          <div className="flex items-center gap-1.5">
                            <NavigationArrow size={13} className="text-primary shrink-0" weight="fill" />
                            <span>{area}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            <CheckCircle size={11} weight="fill" />
                            <span>Aktif</span>
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveArea(idx)}
                            className="p-1 rounded-md text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus area"
                          >
                            <Trash size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>{isLoading ? "Memuat konfigurasi..." : "Cakupan akan otomatis sinkron saat pelanggan memilih alamat."}</span>
              <span className="font-semibold text-slate-700">Total: {areas.length} Area Aktif</span>
            </div>
          </div>
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

