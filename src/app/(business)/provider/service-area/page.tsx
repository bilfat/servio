"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  MagnifyingGlass,
  Check,
  CircleNotch,
  GlobeHemisphereWest,
  Sparkle,
  Target,
  ToggleLeft,
  ToggleRight,
} from "@phosphor-icons/react";
import { Toast } from "@/components/feedback/Toast";
import { useActiveRole } from "@/context/RoleContext";
import { organizationApi, OFFICIAL_CITIES } from "@/lib/servioApi";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export type CoverageMode = "HYBRID" | "RADIUS_ONLY" | "CITY_ONLY";

export interface CoverageCity {
  code: string;
  name: string;
  province?: string;
}

interface RegionApiItem {
  id: string;
  province_id?: string;
  name: string;
}

const DEFAULT_ACTIVE_CITIES: CoverageCity[] = [
  { code: "JKT-SEL", name: "Kota Jakarta Selatan", province: "DKI Jakarta" },
  { code: "JKT-BARAT", name: "Kota Jakarta Barat", province: "DKI Jakarta" },
  { code: "TNG-KOTA", name: "Kota Tangerang", province: "Banten" },
  { code: "TNG-SEL", name: "Kota Tangerang Selatan", province: "Banten" },
  { code: "DPK-KOTA", name: "Kota Depok", province: "Jawa Barat" },
];

function formatTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function ProviderServiceAreaPage() {
  const { user } = useActiveRole();
  const orgId = user.activeOrganization?.id || user.organizationId;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info" | "warning">("success");

  // Operational Coverage Mode: HYBRID (Both), RADIUS_ONLY, or CITY_ONLY
  const [coverageMode, setCoverageMode] = useState<CoverageMode>("HYBRID");
  const [workRadiusKm, setWorkRadiusKm] = useState(15);
  const [cities, setCities] = useState<CoverageCity[]>(DEFAULT_ACTIVE_CITIES);

  const [workshopName, setWorkshopName] = useState(user.activeOrganization?.name || "PT Servio Mandiri Teknik");
  const [workshopAddress, setWorkshopAddress] = useState("Jl. Tebet Raya No. 42, Tebet Barat, Jakarta Selatan 12810");
  const [workshopCoords, setWorkshopCoords] = useState({ lat: -6.2361, lng: 106.8522 });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [provinces, setProvinces] = useState<RegionApiItem[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("31"); // Default: DKI Jakarta
  const [regencies, setRegencies] = useState<RegionApiItem[]>([]);
  const [isLoadingWilayah, setIsLoadingWilayah] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [selectedCityCodesInModal, setSelectedCityCodesInModal] = useState<string[]>([]);

  // 1. Load Initial Coverage from Backend Database
  useEffect(() => {
    if (!orgId) return;
    const loadCoverage = async () => {
      setIsLoading(true);
      try {
        const res = await organizationApi.getCoverage(orgId);
        if (res.data) {
          if ((res.data as any).coverageMode) {
            setCoverageMode((res.data as any).coverageMode);
          }
          if (res.data.coverageRadiusKm !== null && res.data.coverageRadiusKm !== undefined) {
            setWorkRadiusKm(res.data.coverageRadiusKm);
          }
          if (res.data.serviceAreas && res.data.serviceAreas.length > 0) {
            const mapped: CoverageCity[] = res.data.serviceAreas.map((a: any, idx: number) => {
              if (typeof a === "string") {
                const matched = OFFICIAL_CITIES.find(
                  (c) => c.name.toLowerCase() === a.toLowerCase() || c.code.toLowerCase() === a.toLowerCase()
                );
                return {
                  code: matched?.code || `${a.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}-${idx}`,
                  name: matched?.name || a,
                  province: matched?.province || "DKI Jakarta",
                };
              }
              const matched = OFFICIAL_CITIES.find((c) => c.code === a.code || c.name === a.name);
              return {
                code: a.code || matched?.code || `CITY-${idx}`,
                name: a.name || matched?.name || a.code,
                province: a.province || matched?.province || "Wilayah Operasional",
              };
            });
            setCities(mapped);
          }
          const w = (res.data as any).workshop;
          if (w) {
            if (w.name) setWorkshopName(w.name);
            if (w.address) setWorkshopAddress(w.address);
            if (w.lat && w.lng) setWorkshopCoords({ lat: w.lat, lng: w.lng });
          }
        }
      } catch {
        // Fallback to default values
      } finally {
        setIsLoading(false);
      }
    };
    loadCoverage();
  }, [orgId]);

  // 2. Fetch Provinces from Wilayah API
  const fetchProvinces = useCallback(async () => {
    if (provinces.length > 0) return;
    setIsLoadingWilayah(true);
    try {
      const res = await fetch("https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json");
      if (res.ok) {
        const data: RegionApiItem[] = await res.json();
        setProvinces(data);
      }
    } catch {
      setProvinces([
        { id: "31", name: "DKI JAKARTA" },
        { id: "32", name: "JAWA BARAT" },
        { id: "36", name: "BANTEN" },
        { id: "33", name: "JAWA TENGAH" },
        { id: "35", name: "JAWA TIMUR" },
        { id: "34", name: "DI YOGYAKARTA" },
      ]);
    } finally {
      setIsLoadingWilayah(false);
    }
  }, [provinces.length]);

  // 3. Fetch Regencies (Kota/Kabupaten) when Province Changes
  const fetchRegencies = useCallback(async (provId: string) => {
    setIsLoadingWilayah(true);
    try {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provId}.json`);
      if (res.ok) {
        const data: RegionApiItem[] = await res.json();
        setRegencies(data);
      }
    } catch {
      const filtered = OFFICIAL_CITIES.map((c, i) => ({
        id: `${provId}0${i + 1}`,
        province_id: provId,
        name: c.name.toUpperCase(),
      }));
      setRegencies(filtered);
    } finally {
      setIsLoadingWilayah(false);
    }
  }, []);

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
    setSelectedCityCodesInModal([]);
    setCitySearch("");
    fetchProvinces();
    fetchRegencies(selectedProvinceId);
  };

  const handleProvinceChange = (provId: string) => {
    setSelectedProvinceId(provId);
    fetchRegencies(provId);
  };

  // Convert regency API item to standardized CoverageCity
  const resolveRegencyToCity = useCallback((reg: RegionApiItem, idx: number): CoverageCity => {
    const formatted = formatTitleCase(reg.name);
    const provObj = provinces.find((p) => p.id === reg.province_id || p.id === selectedProvinceId);
    const provName = provObj ? formatTitleCase(provObj.name) : "Indonesia";

    const matched = OFFICIAL_CITIES.find(
      (c) => c.name.toLowerCase() === formatted.toLowerCase() || formatted.toLowerCase().includes(c.name.toLowerCase())
    );

    const generatedCode = matched
      ? matched.code
      : `${formatted
          .replace(/^(Kota|Kabupaten|Kab\.)\s+/i, "")
          .replace(/[^A-Za-z0-9]/g, "")
          .slice(0, 7)
          .toUpperCase()}-${idx}`;

    return {
      code: generatedCode,
      name: formatted,
      province: provName,
    };
  }, [provinces, selectedProvinceId]);

  // Filtered Regencies in Modal
  const availableCitiesInModal = useMemo(() => {
    return regencies.map((reg, idx) => resolveRegencyToCity(reg, idx)).filter((c) => {
      if (!citySearch.trim()) return true;
      const q = citySearch.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    });
  }, [regencies, resolveRegencyToCity, citySearch]);

  const handleToggleSelectCityInModal = (cityCode: string) => {
    setSelectedCityCodesInModal((prev) =>
      prev.includes(cityCode) ? prev.filter((c) => c !== cityCode) : [...prev, cityCode]
    );
  };

  const handleSelectQuickJabodetabek = () => {
    const codes = OFFICIAL_CITIES.map((c) => c.code);
    setSelectedCityCodesInModal(codes);
  };

  const handleConfirmAddCities = () => {
    const newItems: CoverageCity[] = [];

    availableCitiesInModal.forEach((c) => {
      if (selectedCityCodesInModal.includes(c.code) && !cities.some((existing) => existing.code === c.code)) {
        newItems.push(c);
      }
    });

    OFFICIAL_CITIES.forEach((c) => {
      if (selectedCityCodesInModal.includes(c.code) && !cities.some((existing) => existing.code === c.code)) {
        if (!newItems.some((n) => n.code === c.code)) {
          newItems.push(c);
        }
      }
    });

    if (newItems.length === 0) {
      setIsAddModalOpen(false);
      return;
    }

    setCities((prev) => [...prev, ...newItems]);
    setIsAddModalOpen(false);
    setToastMessage(`Berhasil menambahkan ${newItems.length} kota/kabupaten ke cakupan layanan.`);
    setToastType("info");
  };

  const handleRemoveCity = (code: string) => {
    if (cities.length <= 1) {
      setToastMessage("Minimal satu kota cakupan operasional harus tetap ada.");
      setToastType("warning");
      return;
    }
    setCities((prev) => prev.filter((c) => c.code !== code));
    setToastMessage("Kota layanan dihapus dari cakupan.");
    setToastType("info");
  };

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
        serviceAreas: cities.map((c) => ({
          type: "CITY",
          code: c.code,
          name: c.name,
          province: c.province,
        })),
      } as any);
      setToastMessage("Cakupan area & radius layanan berhasil disimpan ke sistem!");
      setToastType("success");
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal menyimpan konfigurasi cakupan.");
      setToastType("warning");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setCoverageMode("HYBRID");
    setWorkRadiusKm(15);
    setCities(DEFAULT_ACTIVE_CITIES);
    setToastMessage("Pengaturan dikembalikan ke konfigurasi default.");
    setToastType("info");
  };

  const isRadiusActive = coverageMode === "HYBRID" || coverageMode === "RADIUS_ONLY";
  const isCityActive = coverageMode === "HYBRID" || coverageMode === "CITY_ONLY";

  const handleToggleRadius = () => {
    if (isRadiusActive) {
      if (!isCityActive) {
        setToastMessage("Minimal salah satu metode (Radius atau Kota) harus tetap aktif.");
        setToastType("warning");
        return;
      }
      setCoverageMode("CITY_ONLY");
      setToastMessage("Radius jarak dinonaktifkan. Mode diubah ke Cakupan Kota Saja.");
      setToastType("info");
    } else {
      setCoverageMode(isCityActive ? "HYBRID" : "RADIUS_ONLY");
      setToastMessage("Radius jarak diaktifkan.");
      setToastType("success");
    }
  };

  const handleToggleCity = () => {
    if (isCityActive) {
      if (!isRadiusActive) {
        setToastMessage("Minimal salah satu metode (Radius atau Kota) harus tetap aktif.");
        setToastType("warning");
        return;
      }
      setCoverageMode("RADIUS_ONLY");
      setToastMessage("Daftar kota dinonaktifkan. Mode diubah ke Radius Jarak Saja.");
      setToastType("info");
    } else {
      setCoverageMode(isRadiusActive ? "HYBRID" : "CITY_ONLY");
      setToastMessage("Cakupan kota diaktifkan.");
      setToastType("success");
    }
  };

  return (
    <div className="space-y-5 pb-16 w-full font-body">
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
            Atur batas radius jarak teknisi dan daftar kota/kabupaten operasional resmi bengkel Anda.
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

      {/* ========================================================================= */}
      {/* 1. TOMBOL PILIHAN MODEL CAKUPAN OPERASIONAL (RADIUS / KOTA / KEDUANYA)   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-[#0F4C81] uppercase tracking-wider">
                Pengaturan Aktivasi
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <SlidersHorizontal size={16} className="text-primary" weight="bold" />
                <span>Pilih Metode Pembatasan Wilayah Operasional</span>
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tentukan apakah bengkel Anda ingin membatasi order berdasarkan Radius Jarak (GPS), Daftar Kota Administratif, atau keduanya.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-900 text-white shadow-2xs flex items-center gap-1.5">
              <CheckCircle size={13} weight="fill" className="text-emerald-400" />
              <span>
                {coverageMode === "HYBRID"
                  ? "Mode: Keduanya (Radius & Kota)"
                  : coverageMode === "RADIUS_ONLY"
                  ? "Mode: Radius Jarak Saja"
                  : "Mode: Cakupan Kota Saja"}
              </span>
            </span>
          </div>
        </div>

        {/* 3 Interactive Cards for Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option 1: Hybrid (Rekomendasi) */}
          <button
            type="button"
            onClick={() => {
              setCoverageMode("HYBRID");
              setToastMessage("Mode Keduanya (Hybrid) aktif: Melayani order dari kota terdaftar & radius workshop.");
              setToastType("success");
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative ${
              coverageMode === "HYBRID"
                ? "bg-gradient-to-br from-sky-50 to-blue-50/50 border-primary shadow-xs ring-2 ring-primary/25"
                : "bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    coverageMode === "HYBRID" ? "bg-primary text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  <Sparkle size={16} weight="fill" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Keduanya (Hybrid)</h3>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                    Rekomendasi
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {coverageMode === "HYBRID" && (
                  <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                    <Check size={13} weight="bold" /> Aktif
                  </span>
                )}
                <input
                  type="radio"
                  name="coverageMode"
                  checked={coverageMode === "HYBRID"}
                  onChange={() => setCoverageMode("HYBRID")}
                  className="w-4 h-4 accent-primary cursor-pointer pointer-events-none"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Melayani pelanggan di dalam <strong>Kota Terdaftar</strong> <em>dan</em> pelanggan terdekat dalam <strong>Radius {workRadiusKm} km</strong> dari workshop.
            </p>
          </button>

          {/* Option 2: Radius Jarak Saja */}
          <button
            type="button"
            onClick={() => {
              setCoverageMode("RADIUS_ONLY");
              setToastMessage("Mode Radius Jarak Saja aktif: Pelanggan dibatasi maksimal jarak GPS dari workshop.");
              setToastType("info");
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative ${
              coverageMode === "RADIUS_ONLY"
                ? "bg-gradient-to-br from-sky-50 to-blue-50/50 border-primary shadow-xs ring-2 ring-primary/25"
                : "bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    coverageMode === "RADIUS_ONLY" ? "bg-primary text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  <Target size={16} weight="bold" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Radius Jarak Saja</h3>
                  <span className="text-[9px] text-slate-500 font-medium">Berdasarkan GPS</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {coverageMode === "RADIUS_ONLY" && (
                  <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                    <Check size={13} weight="bold" /> Aktif
                  </span>
                )}
                <input
                  type="radio"
                  name="coverageMode"
                  checked={coverageMode === "RADIUS_ONLY"}
                  onChange={() => setCoverageMode("RADIUS_ONLY")}
                  className="w-4 h-4 accent-primary cursor-pointer pointer-events-none"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Hanya melayani pelanggan yang berjarak maksimal <strong>{workRadiusKm} km</strong> dari workshop, tanpa membatasi nama kota/kabupaten.
            </p>
          </button>

          {/* Option 3: Kota / Kabupaten Saja */}
          <button
            type="button"
            onClick={() => {
              setCoverageMode("CITY_ONLY");
              setToastMessage("Mode Cakupan Kota Saja aktif: Hanya melayani pelanggan di kota resmi yang Anda pilih.");
              setToastType("info");
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative ${
              coverageMode === "CITY_ONLY"
                ? "bg-gradient-to-br from-sky-50 to-blue-50/50 border-primary shadow-xs ring-2 ring-primary/25"
                : "bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    coverageMode === "CITY_ONLY" ? "bg-primary text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  <Buildings size={16} weight="bold" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Cakupan Kota Saja</h3>
                  <span className="text-[9px] text-slate-500 font-medium">Wilayah Resmi</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {coverageMode === "CITY_ONLY" && (
                  <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                    <Check size={13} weight="bold" /> Aktif
                  </span>
                )}
                <input
                  type="radio"
                  name="coverageMode"
                  checked={coverageMode === "CITY_ONLY"}
                  onChange={() => setCoverageMode("CITY_ONLY")}
                  className="w-4 h-4 accent-primary cursor-pointer pointer-events-none"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Hanya melayani pelanggan yang beralamat di dalam daftar <strong>{cities.length} Kota Terdaftar</strong> resmi di sebelah kanan.
            </p>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* KOLOM KIRI (lg:col-span-5): Radius & Titik Workshop */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card A: Radius Maksimum Penugasan */}
          <div
            className={`bg-white rounded-2xl border p-4 shadow-xs space-y-3 transition-opacity ${
              isRadiusActive ? "border-slate-200/80 opacity-100" : "border-slate-200/60 opacity-60 bg-slate-50/40"
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <SlidersHorizontal size={15} className={isRadiusActive ? "text-primary" : "text-slate-400"} weight="bold" />
                <span>A. Radius Maksimum Teknisi</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    isRadiusActive
                      ? "text-primary bg-sky-50 border-sky-200"
                      : "text-slate-400 bg-slate-100 border-slate-200"
                  }`}
                >
                  {isRadiusActive ? `${workRadiusKm} KM (Aktif)` : "Radius Nonaktif"}
                </span>

                {/* Direct Toggle Button for Radius */}
                <button
                  type="button"
                  onClick={handleToggleRadius}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isRadiusActive ? "bg-primary" : "bg-slate-300"
                  }`}
                  title={isRadiusActive ? "Klik untuk menonaktifkan radius jarak" : "Klik untuk mengaktifkan radius jarak"}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isRadiusActive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
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
                disabled={!isRadiusActive}
                value={workRadiusKm}
                onChange={(e) => setWorkRadiusKm(Number(e.target.value))}
                className="w-full accent-primary h-1.5 bg-slate-200 rounded-lg cursor-pointer disabled:cursor-not-allowed"
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
                  <span className={`font-bold flex items-center gap-1 ${isRadiusActive ? "text-emerald-600" : "text-slate-400"}`}>
                    <CheckCircle size={12} weight="fill" />
                    <span>{isRadiusActive ? `Aktif dalam ${workRadiusKm} km` : "Dibatasi oleh Kota Saja"}</span>
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
                  {workshopName}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug pl-6">
                {workshopAddress}
              </p>
              <div className="pl-6 pt-1 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-200/60">
                <span>Lat: {workshopCoords.lat}</span>
                <span>Lng: {workshopCoords.lng}</span>
              </div>
            </div>
          </div>

          {/* Card C: Ketentuan Dispatch Lapangan */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-blue-950 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#0F4C81]">
              <Info size={15} weight="bold" />
              <span>Ketentuan Penugasan Teknisi</span>
            </div>
            <p className="leading-relaxed">
              {coverageMode === "HYBRID" ? (
                <>
                  Pelanggan yang memesan di dalam <strong>Kota Terdaftar</strong> atau berada dalam radius <strong>{workRadiusKm} km</strong> dari workshop otomatis dapat dilayani oleh tim teknisi Anda.
                </>
              ) : coverageMode === "RADIUS_ONLY" ? (
                <>
                  Pesanan hanya diterima jika lokasi pelanggan berada dalam radius maksimal <strong>{workRadiusKm} km</strong> dari workshop bengkel Anda.
                </>
              ) : (
                <>
                  Pesanan hanya diterima jika lokasi pelanggan beralamat di dalam daftar <strong>Kota Terdaftar</strong> bengkel Anda.
                </>
              )}
            </p>
          </div>
        </div>

        {/* KOLOM KANAN (lg:col-span-7): Daftar Kota & Kabupaten Aktif */}
        <div className="lg:col-span-7 space-y-4">
          <div
            className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs space-y-3.5 transition-opacity ${
              isCityActive ? "border-slate-200/80 opacity-100" : "border-slate-200/60 opacity-80"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    C. Daftar Kota &amp; Kabupaten Layanan Aktif
                  </h3>
                  <span
                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                      isCityActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {isCityActive ? "Kota Aktif" : "Kota Nonaktif (Opsional)"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Kota dan kabupaten resmi cakupan operasional tim teknisi bengkel Anda.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {cities.length} Kota
                </span>

                {/* Direct Toggle Button for City */}
                <button
                  type="button"
                  onClick={handleToggleCity}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isCityActive ? "bg-primary" : "bg-slate-300"
                  }`}
                  title={isCityActive ? "Klik untuk menonaktifkan filter kota" : "Klik untuk mengaktifkan filter kota"}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isCityActive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus size={13} weight="bold" />
                  <span>Tambah Kota</span>
                </button>
              </div>
            </div>

            {/* Tabel List Kota */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[460px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-10">No</th>
                    <th className="py-2.5 px-3">Nama Kota / Kabupaten</th>
                    <th className="py-2.5 px-3 w-36">Provinsi</th>
                    <th className="py-2.5 px-3 w-24 text-center">Status</th>
                    <th className="py-2.5 px-3 w-14 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        Belum ada kota cakupan layanan. Klik tombol <strong>Tambah Kota</strong> di atas.
                      </td>
                    </tr>
                  ) : (
                    cities.map((city, idx) => (
                      <tr key={`${city.code}-${idx}`} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-400 text-xs">
                          #{idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 text-xs">
                          <div className="flex items-center gap-2">
                            <NavigationArrow size={13} className="text-primary shrink-0" weight="fill" />
                            <span>{city.name}</span>
                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-sky-50 text-[#0F4C81] border border-sky-200 font-bold">
                              {city.code}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {city.province || "DKI Jakarta"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            <CheckCircle size={11} weight="fill" />
                            <span>Aktif</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveCity(city.code)}
                            className="p-1 rounded-md text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus kota"
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
              <span>{isLoading ? "Memuat konfigurasi..." : "Cakupan otomatis diterapkan di katalog dan pesanan pelanggan."}</span>
              <span className="font-semibold text-slate-700">Total: {cities.length} Kota Terdaftar</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL POP-UP: TAMBAH KOTA CAKUPAN DENGAN API WILAYAH RESMI               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-slate-900">
            <GlobeHemisphereWest size={20} className="text-[#0F4C81]" weight="duotone" />
            <span>Pilih Kota &amp; Kabupaten Layanan Resmi</span>
          </div>
        }
        description="Pilih kota atau kabupaten cakupan operasional teknisi menggunakan master data wilayah Indonesia resmi."
        maxWidth="2xl"
        footer={
          <div className="w-full flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              <strong>{selectedCityCodesInModal.length}</strong> Kota dipilih
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmAddCities}
                disabled={selectedCityCodesInModal.length === 0}
                className="bg-primary hover:bg-primary-dark text-white font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus size={14} weight="bold" />
                <span>Tambahkan ke Cakupan</span>
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 font-body">
          {/* Quick Jabodetabek Action Bar */}
          <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-sky-950">
              <Sparkle size={16} weight="fill" className="text-amber-500 shrink-0" />
              <span>Pilihan Cepat Wilayah Metropolitan Utama:</span>
            </div>
            <button
              type="button"
              onClick={handleSelectQuickJabodetabek}
              className="px-2.5 py-1 bg-white hover:bg-sky-100 text-[#0F4C81] border border-sky-300 font-bold rounded-lg text-[11px] transition shadow-2xs cursor-pointer shrink-0"
            >
              + Pilih Semua Jabodetabek
            </button>
          </div>

          {/* Filter Bar: Province & Search Input */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Pilih Provinsi:
              </label>
              <select
                value={selectedProvinceId}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatTitleCase(p.name)}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-7">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Cari Kota / Kabupaten:
              </label>
              <div className="relative">
                <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Ketik nama kota (contoh: Jakarta, Tangerang)..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* List of Cities with Checkboxes */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
            {isLoadingWilayah ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <CircleNotch size={24} className="animate-spin text-primary" />
                <span>Memuat data wilayah resmi dari API Kemendagri...</span>
              </div>
            ) : availableCitiesInModal.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada kota yang sesuai dengan kata kunci pencarian.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {availableCitiesInModal.map((item, idx) => {
                  const isAlreadyInActive = cities.some((c) => c.code === item.code);
                  const isChecked = selectedCityCodesInModal.includes(item.code) || isAlreadyInActive;

                  return (
                    <label
                      key={`${item.code}-${idx}`}
                      className={`flex items-center justify-between p-3 transition text-xs select-none ${
                        isAlreadyInActive
                          ? "bg-slate-50/80 opacity-60 cursor-not-allowed"
                          : "hover:bg-sky-50/40 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          disabled={isAlreadyInActive}
                          checked={isChecked}
                          onChange={() => handleToggleSelectCityInModal(item.code)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {item.province} • Kode: <span className="font-mono">{item.code}</span>
                          </p>
                        </div>
                      </div>

                      {isAlreadyInActive ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Sudah Aktif
                        </span>
                      ) : (
                        isChecked && (
                          <span className="text-[10px] font-bold text-primary bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 flex items-center gap-1">
                            <Check size={11} weight="bold" />
                            <span>Dipilih</span>
                          </span>
                        )
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

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
