"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  CheckCircle,
  Plus,
  Trash,
  SlidersHorizontal,
  FloppyDisk,
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

  return (
    <div className="space-y-6 pb-20 font-body">
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
          Cakupan Operasional
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
          Area &amp; Radius Layanan
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Tentukan batas radius jarak teknisi lapangan dan kecamatan yang dicakup oleh bengkel Anda.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6 text-xs">
        {/* Radius Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800 text-sm">
              Radius Maksimum Penugasan Teknisi: {workRadiusKm} km
            </label>
            <span className="text-slate-500 text-[11px]">Dari titik pusat workshop</span>
          </div>
          <input
            type="range"
            min={5}
            max={40}
            value={workRadiusKm}
            onChange={(e) => setWorkRadiusKm(Number(e.target.value))}
            className="w-full accent-[#0F4C81]"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>5 km</span>
            <span>20 km</span>
            <span>40 km</span>
          </div>
        </div>

        {/* Coverage Subdistricts */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <label className="font-bold text-slate-800 text-sm block">
            Daftar Wilayah / Kecamatan Aktif ({areas.length})
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              placeholder="Tambah kecamatan atau area baru..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
            <button
              type="button"
              onClick={handleAddArea}
              className="px-4 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs flex items-center gap-1 transition"
            >
              <Plus size={14} weight="bold" />
              <span>Tambah</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 pt-2">
            {areas.map((area, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin size={16} className="text-[#0F4C81]" />
                  <span>{area}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveArea(idx)}
                  className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition"
                >
                  <Trash size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-slate-500 text-[11px]">
            {isLoading ? "Memuat konfigurasi..." : "Perubahan akan segera berlaku untuk order baru"}
          </span>
          <button
            type="button"
            disabled={isSaving || isLoading}
            onClick={handleSaveCoverage}
            className="px-6 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
          >
            <FloppyDisk size={16} weight="bold" />
            <span>{isSaving ? "Menyimpan..." : "Simpan Cakupan Area"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
