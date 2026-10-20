"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MapPin,
  Buildings,
  CircleNotch,
  WarningCircle,
  ArrowClockwise,
  Check,
  HouseLine,
  Compass,
} from "@phosphor-icons/react";

export interface AddressData {
  province_id?: string;
  province_name?: string;
  province?: string;
  city_id?: string;
  city_name?: string;
  city?: string;
  district_id?: string;
  district_name?: string;
  district?: string;
  village_id?: string;
  village_name?: string;
  village?: string;
  postal_code?: string;
  street_address?: string;
  address?: string;
  rt_rw?: string;
  landmark?: string;
}

interface RegionItem {
  id: string;
  name: string;
  province_id?: string;
  regency_id?: string;
  district_id?: string;
}

export interface AddressCascadingFormProps {
  value?: AddressData | null;
  onChange: (data: AddressData) => void;
  disabled?: boolean;
  required?: boolean;
  title?: string;
  subtitle?: string;
  showRtRw?: boolean;
  showLandmark?: boolean;
  className?: string;
  idPrefix?: string;
}

// In-memory global cache for Emsifa API responses to avoid duplicate fetches
const emsifaCache: Record<string, RegionItem[]> = {};

// Fallback postal code estimation by district name for instant autofill
const KNOWN_POSTAL_CODES: Record<string, string> = {
  "KEBON JERUK": "11530",
  "KEMBANGAN": "11610",
  "PALMERAH": "11480",
  "GROGOL PETAMBURAN": "11470",
  "TAMBORA": "11210",
  "TAMAN SARI": "11180",
  "CENGKARENG": "11730",
  "KALI DERES": "11840",
  "TEBET": "12810",
  "SETIABUDI": "12910",
  "MAMPANG PRAPATAN": "12790",
  "PASAR MINGGU": "12520",
  "KEBAYORAN BARU": "12110",
  "KEBAYORAN LAMA": "12240",
  "PANCORAN": "12780",
  "JAGAKARSA": "12620",
  "GAMBIR": "10110",
  "MENTENG": "10310",
  "SENEN": "10410",
  "CAKUNG": "13910",
  "PULOGADUNG": "13220",
  "DUREN SAWIT": "13440",
  "COBLONG": "40135",
  "SUKAJADI": "40162",
  "GUBENG": "60281",
  "TEGALSARI": "60262",
};

export function AddressCascadingForm({
  value,
  onChange,
  disabled = false,
  required = true,
  title = "Alamat Lengkap",
  subtitle = "Pilih wilayah secara bertingkat menggunakan data resmi Kemendagri (Emsifa v2)",
  showRtRw = true,
  showLandmark = true,
  className = "",
  idPrefix = "addr",
}: AddressCascadingFormProps) {
  // Region lists
  const [provinces, setProvinces] = useState<RegionItem[]>([]);
  const [regencies, setRegencies] = useState<RegionItem[]>([]);
  const [districts, setDistricts] = useState<RegionItem[]>([]);
  const [villages, setVillages] = useState<RegionItem[]>([]);

  // Loading states
  const [loadingProvinces, setLoadingProvinces] = useState<boolean>(false);
  const [loadingRegencies, setLoadingRegencies] = useState<boolean>(false);
  const [loadingDistricts, setLoadingDistricts] = useState<boolean>(false);
  const [loadingVillages, setLoadingVillages] = useState<boolean>(false);

  // Error state for API failure simulation / resilience
  const [apiError, setApiError] = useState<string | null>(null);

  // Internal form fields
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("");
  const [selectedProvinceName, setSelectedProvinceName] = useState<string>("");

  const [selectedRegencyId, setSelectedRegencyId] = useState<string>("");
  const [selectedRegencyName, setSelectedRegencyName] = useState<string>("");

  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>("");

  const [selectedVillageId, setSelectedVillageId] = useState<string>("");
  const [selectedVillageName, setSelectedVillageName] = useState<string>("");

  const [postalCode, setPostalCode] = useState<string>("");
  const [streetAddress, setStreetAddress] = useState<string>("");
  const [rtRw, setRtRw] = useState<string>("");
  const [landmark, setLandmark] = useState<string>("");

  const isInitialMount = useRef(true);

  // Fetch provinces on component mount
  const fetchProvinces = useCallback(async () => {
    setLoadingProvinces(true);
    setApiError(null);
    try {
      if (emsifaCache["provinces"]) {
        setProvinces(emsifaCache["provinces"]);
        setLoadingProvinces(false);
        return;
      }
      const res = await fetch("https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json");
      if (!res.ok) throw new Error("Gagal memuat data provinsi dari server.");
      const data: RegionItem[] = await res.json();
      emsifaCache["provinces"] = data;
      setProvinces(data);
    } catch (err: any) {
      console.warn("Emsifa provinces fetch error:", err);
      setApiError("Gagal terhubung ke API Wilayah Indonesia. Silakan coba lagi.");
    } finally {
      setLoadingProvinces(false);
    }
  }, []);

  useEffect(() => {
    fetchProvinces();
  }, [fetchProvinces]);

  // Fetch regencies when province changes
  const fetchRegencies = useCallback(async (provinceId: string) => {
    if (!provinceId) {
      setRegencies([]);
      return;
    }
    setLoadingRegencies(true);
    setApiError(null);
    const cacheKey = `regencies_${provinceId}`;
    try {
      if (emsifaCache[cacheKey]) {
        setRegencies(emsifaCache[cacheKey]);
        setLoadingRegencies(false);
        return;
      }
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provinceId}.json`);
      if (!res.ok) throw new Error("Gagal memuat data kabupaten/kota.");
      const data: RegionItem[] = await res.json();
      emsifaCache[cacheKey] = data;
      setRegencies(data);
    } catch (err: any) {
      console.warn("Emsifa regencies fetch error:", err);
      setApiError("Gagal memuat daftar Kota/Kabupaten. Periksa koneksi internet Anda.");
    } finally {
      setLoadingRegencies(false);
    }
  }, []);

  // Fetch districts when regency changes
  const fetchDistricts = useCallback(async (regencyId: string) => {
    if (!regencyId) {
      setDistricts([]);
      return;
    }
    setLoadingDistricts(true);
    setApiError(null);
    const cacheKey = `districts_${regencyId}`;
    try {
      if (emsifaCache[cacheKey]) {
        setDistricts(emsifaCache[cacheKey]);
        setLoadingDistricts(false);
        return;
      }
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regencyId}.json`);
      if (!res.ok) throw new Error("Gagal memuat data kecamatan.");
      const data: RegionItem[] = await res.json();
      emsifaCache[cacheKey] = data;
      setDistricts(data);
    } catch (err: any) {
      console.warn("Emsifa districts fetch error:", err);
      setApiError("Gagal memuat daftar Kecamatan. Periksa koneksi internet Anda.");
    } finally {
      setLoadingDistricts(false);
    }
  }, []);

  // Fetch villages when district changes
  const fetchVillages = useCallback(async (districtId: string) => {
    if (!districtId) {
      setVillages([]);
      return;
    }
    setLoadingVillages(true);
    setApiError(null);
    const cacheKey = `villages_${districtId}`;
    try {
      if (emsifaCache[cacheKey]) {
        setVillages(emsifaCache[cacheKey]);
        setLoadingVillages(false);
        return;
      }
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${districtId}.json`);
      if (!res.ok) throw new Error("Gagal memuat data kelurahan/desa.");
      const data: RegionItem[] = await res.json();
      emsifaCache[cacheKey] = data;
      setVillages(data);
    } catch (err: any) {
      console.warn("Emsifa villages fetch error:", err);
      setApiError("Gagal memuat daftar Kelurahan/Desa. Periksa koneksi internet Anda.");
    } finally {
      setLoadingVillages(false);
    }
  }, []);

  // Handle prefilled value initialization and cascading resolution
  useEffect(() => {
    if (!value) return;

    if (value.street_address || value.address) {
      setStreetAddress(value.street_address || value.address || "");
    }
    if (value.postal_code) {
      setPostalCode(value.postal_code);
    }
    if (value.rt_rw) {
      setRtRw(value.rt_rw);
    }
    if (value.landmark) {
      setLandmark(value.landmark);
    }

    // Match Province
    if (provinces.length > 0) {
      const provName = value.province_name || value.province || "";
      const provId = value.province_id;
      const matchedProv = provinces.find(
        (p) => (provId && p.id === provId) || (provName && p.name.toLowerCase() === provName.trim().toLowerCase())
      );
      if (matchedProv && matchedProv.id !== selectedProvinceId) {
        setSelectedProvinceId(matchedProv.id);
        setSelectedProvinceName(matchedProv.name);
        fetchRegencies(matchedProv.id);
      }
    }
  }, [value, provinces, fetchRegencies, selectedProvinceId]);

  // Match Regency when regencies list updates
  useEffect(() => {
    if (!value || regencies.length === 0) return;
    const cityName = value.city_name || value.city || "";
    const cityId = value.city_id;
    const matchedCity = regencies.find(
      (r) => (cityId && r.id === cityId) || (cityName && r.name.toLowerCase().includes(cityName.trim().toLowerCase()))
    );
    if (matchedCity && matchedCity.id !== selectedRegencyId) {
      setSelectedRegencyId(matchedCity.id);
      setSelectedRegencyName(matchedCity.name);
      fetchDistricts(matchedCity.id);
    }
  }, [value, regencies, fetchDistricts, selectedRegencyId]);

  // Match District when districts list updates
  useEffect(() => {
    if (!value || districts.length === 0) return;
    const distName = value.district_name || value.district || "";
    const distId = value.district_id;
    const matchedDist = districts.find(
      (d) => (distId && d.id === distId) || (distName && d.name.toLowerCase() === distName.trim().toLowerCase())
    );
    if (matchedDist && matchedDist.id !== selectedDistrictId) {
      setSelectedDistrictId(matchedDist.id);
      setSelectedDistrictName(matchedDist.name);
      fetchVillages(matchedDist.id);
    }
  }, [value, districts, fetchVillages, selectedDistrictId]);

  // Match Village when villages list updates
  useEffect(() => {
    if (!value || villages.length === 0) return;
    const vilName = value.village_name || value.village || "";
    const vilId = value.village_id;
    const matchedVil = villages.find(
      (v) => (vilId && v.id === vilId) || (vilName && v.name.toLowerCase() === vilName.trim().toLowerCase())
    );
    if (matchedVil && matchedVil.id !== selectedVillageId) {
      setSelectedVillageId(matchedVil.id);
      setSelectedVillageName(matchedVil.name);
    }
  }, [value, villages, selectedVillageId]);

  // Emit changes to parent
  const emitChanges = useCallback(
    (overrides?: Partial<AddressData>) => {
      const merged: AddressData = {
        province_id: selectedProvinceId,
        province_name: selectedProvinceName,
        province: selectedProvinceName,
        city_id: selectedRegencyId,
        city_name: selectedRegencyName,
        city: selectedRegencyName,
        district_id: selectedDistrictId,
        district_name: selectedDistrictName,
        district: selectedDistrictName,
        village_id: selectedVillageId,
        village_name: selectedVillageName,
        village: selectedVillageName,
        postal_code: postalCode,
        street_address: streetAddress,
        address: streetAddress,
        rt_rw: rtRw,
        landmark: landmark,
        ...overrides,
      };
      onChange(merged);
    },
    [
      selectedProvinceId,
      selectedProvinceName,
      selectedRegencyId,
      selectedRegencyName,
      selectedDistrictId,
      selectedDistrictName,
      selectedVillageId,
      selectedVillageName,
      postalCode,
      streetAddress,
      rtRw,
      landmark,
      onChange,
    ]
  );

  // Trigger emit whenever form state changes (skip first render)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    emitChanges();
  }, [
    selectedProvinceId,
    selectedProvinceName,
    selectedRegencyId,
    selectedRegencyName,
    selectedDistrictId,
    selectedDistrictName,
    selectedVillageId,
    selectedVillageName,
    postalCode,
    streetAddress,
    rtRw,
    landmark,
  ]);

  /* =========================================================================
     CASCADING CHANGE HANDLERS (Parent changes RESET children)
     ========================================================================= */

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provId = e.target.value;
    const matched = provinces.find((p) => p.id === provId);

    setSelectedProvinceId(provId);
    setSelectedProvinceName(matched ? matched.name : "");

    // Reset children cascade
    setSelectedRegencyId("");
    setSelectedRegencyName("");
    setRegencies([]);

    setSelectedDistrictId("");
    setSelectedDistrictName("");
    setDistricts([]);

    setSelectedVillageId("");
    setSelectedVillageName("");
    setVillages([]);

    setPostalCode("");

    if (provId) {
      fetchRegencies(provId);
    }
  };

  const handleRegencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const regId = e.target.value;
    const matched = regencies.find((r) => r.id === regId);

    setSelectedRegencyId(regId);
    setSelectedRegencyName(matched ? matched.name : "");

    // Reset children cascade
    setSelectedDistrictId("");
    setSelectedDistrictName("");
    setDistricts([]);

    setSelectedVillageId("");
    setSelectedVillageName("");
    setVillages([]);

    setPostalCode("");

    if (regId) {
      fetchDistricts(regId);
    }
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const distId = e.target.value;
    const matched = districts.find((d) => d.id === distId);

    setSelectedDistrictId(distId);
    const distName = matched ? matched.name : "";
    setSelectedDistrictName(distName);

    // Auto-fill postal code if known district
    if (distName && KNOWN_POSTAL_CODES[distName.toUpperCase()]) {
      setPostalCode(KNOWN_POSTAL_CODES[distName.toUpperCase()]);
    }

    // Reset children cascade
    setSelectedVillageId("");
    setSelectedVillageName("");
    setVillages([]);

    if (distId) {
      fetchVillages(distId);
    }
  };

  const handleVillageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vilId = e.target.value;
    const matched = villages.find((v) => v.id === vilId);

    setSelectedVillageId(vilId);
    setSelectedVillageName(matched ? matched.name : "");

    // If postal code still empty, provide fallback
    if (!postalCode && selectedDistrictName && KNOWN_POSTAL_CODES[selectedDistrictName.toUpperCase()]) {
      setPostalCode(KNOWN_POSTAL_CODES[selectedDistrictName.toUpperCase()]);
    }
  };

  return (
    <div className={`space-y-4 rounded-2xl bg-slate-50/80 p-4 sm:p-5 border border-slate-200/90 shadow-xs ${className}`}>
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200/70">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <MapPin size={16} weight="bold" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>{title}</span>
              {required && <span className="text-rose-500 font-bold">*</span>}
            </h4>
            <p className="text-[11px] text-slate-500">{subtitle}</p>
          </div>
        </div>

      </div>

      {/* Error state if API fails */}
      {apiError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WarningCircle size={16} className="text-rose-600 shrink-0" weight="fill" />
            <span>{apiError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!provinces.length) fetchProvinces();
              else if (selectedProvinceId && !regencies.length) fetchRegencies(selectedProvinceId);
              else if (selectedRegencyId && !districts.length) fetchDistricts(selectedRegencyId);
              else if (selectedDistrictId && !villages.length) fetchVillages(selectedDistrictId);
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] flex items-center gap-1 transition shrink-0 cursor-pointer"
          >
            <ArrowClockwise size={12} />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {/* Row 1: Provinsi & Kabupaten/Kota */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Provinsi */}
        <div>
          <label htmlFor={`${idPrefix}-province`} className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span>Provinsi {required && <span className="text-rose-500">*</span>}</span>
            {loadingProvinces && (
              <span className="text-[10px] text-sky-600 font-normal flex items-center gap-1">
                <CircleNotch size={10} className="animate-spin" /> Memuat provinsi...
              </span>
            )}
          </label>
          <select
            id={`${idPrefix}-province`}
            disabled={disabled || loadingProvinces}
            required={required}
            value={selectedProvinceId}
            onChange={handleProvinceChange}
            className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer shadow-2xs"
          >
            <option value="">-- Pilih Provinsi --</option>
            {provinces.map((prov) => (
              <option key={prov.id} value={prov.id}>
                {prov.name}
              </option>
            ))}
          </select>
        </div>

        {/* Kabupaten / Kota */}
        <div>
          <label htmlFor={`${idPrefix}-regency`} className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span>Kabupaten / Kota {required && <span className="text-rose-500">*</span>}</span>
            {loadingRegencies && (
              <span className="text-[10px] text-sky-600 font-normal flex items-center gap-1">
                <CircleNotch size={10} className="animate-spin" /> Memuat kota/kab...
              </span>
            )}
          </label>
          <select
            id={`${idPrefix}-regency`}
            disabled={disabled || !selectedProvinceId || loadingRegencies}
            required={required}
            value={selectedRegencyId}
            onChange={handleRegencyChange}
            className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer shadow-2xs"
          >
            <option value="">
              {!selectedProvinceId ? "Pilih Provinsi terlebih dahulu" : "-- Pilih Kabupaten / Kota --"}
            </option>
            {regencies.map((reg) => (
              <option key={reg.id} value={reg.id}>
                {reg.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Kecamatan, Desa/Kelurahan, Kode Pos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Kecamatan */}
        <div>
          <label htmlFor={`${idPrefix}-district`} className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span>Kecamatan {required && <span className="text-rose-500">*</span>}</span>
            {loadingDistricts && (
              <span className="text-[10px] text-sky-600 font-normal flex items-center gap-1">
                <CircleNotch size={10} className="animate-spin" /> Memuat kecamatan...
              </span>
            )}
          </label>
          <select
            id={`${idPrefix}-district`}
            disabled={disabled || !selectedRegencyId || loadingDistricts}
            required={required}
            value={selectedDistrictId}
            onChange={handleDistrictChange}
            className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer shadow-2xs"
          >
            <option value="">
              {!selectedRegencyId ? "Pilih Kota/Kab dahulu" : "-- Pilih Kecamatan --"}
            </option>
            {districts.map((dist) => (
              <option key={dist.id} value={dist.id}>
                {dist.name}
              </option>
            ))}
          </select>
        </div>

        {/* Desa / Kelurahan */}
        <div>
          <label htmlFor={`${idPrefix}-village`} className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span>Desa / Kelurahan {required && <span className="text-rose-500">*</span>}</span>
            {loadingVillages && (
              <span className="text-[10px] text-sky-600 font-normal flex items-center gap-1">
                <CircleNotch size={10} className="animate-spin" /> Memuat kelurahan...
              </span>
            )}
          </label>
          <select
            id={`${idPrefix}-village`}
            disabled={disabled || !selectedDistrictId || loadingVillages}
            required={required}
            value={selectedVillageId}
            onChange={handleVillageChange}
            className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer shadow-2xs"
          >
            <option value="">
              {!selectedDistrictId ? "Pilih Kecamatan dahulu" : "-- Pilih Desa / Kelurahan --"}
            </option>
            {villages.map((vil) => (
              <option key={vil.id} value={vil.id}>
                {vil.name}
              </option>
            ))}
          </select>
        </div>

        {/* Kode Pos */}
        <div>
          <label htmlFor={`${idPrefix}-postal-code`} className="block text-xs font-semibold text-slate-700 mb-1">
            Kode Pos {required && <span className="text-rose-500">*</span>}
          </label>
          <input
            id={`${idPrefix}-postal-code`}
            type="text"
            maxLength={6}
            disabled={disabled}
            required={required}
            placeholder="Contoh: 12810"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:bg-slate-100 disabled:text-slate-400 shadow-2xs"
          />
        </div>
      </div>

      {/* Row 3: Detail Alamat (Jalan, No Rumah/Gedung) */}
      <div>
        <label htmlFor={`${idPrefix}-street-address`} className="block text-xs font-semibold text-slate-700 mb-1">
          Detail Alamat / Nama Jalan &amp; No. Bangunan {required && <span className="text-rose-500">*</span>}
        </label>
        <textarea
          id={`${idPrefix}-street-address`}
          rows={2}
          disabled={disabled}
          required={required}
          placeholder="Nama jalan, gang, nomor rumah/toko, blok, atau kompleks ruko..."
          value={streetAddress}
          onChange={(e) => setStreetAddress(e.target.value)}
          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:bg-slate-100 disabled:text-slate-400 leading-relaxed shadow-2xs"
        />
      </div>

      {/* Row 4: RT/RW dan Patokan Opsional */}
      {(showRtRw || showLandmark) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {showRtRw && (
            <div>
              <label htmlFor={`${idPrefix}-rt-rw`} className="block text-xs font-semibold text-slate-700 mb-1">
                RT / RW <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
              </label>
              <input
                id={`${idPrefix}-rt-rw`}
                type="text"
                maxLength={15}
                disabled={disabled}
                placeholder="Contoh: 005/002"
                value={rtRw}
                onChange={(e) => setRtRw(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:bg-slate-100 disabled:text-slate-400 shadow-2xs"
              />
            </div>
          )}

          {showLandmark && (
            <div>
              <label htmlFor={`${idPrefix}-landmark`} className="block text-xs font-semibold text-slate-700 mb-1">
                Patokan / Keterangan Alamat <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
              </label>
              <input
                id={`${idPrefix}-landmark`}
                type="text"
                disabled={disabled}
                placeholder="Contoh: Sebelah SPBU Pertamina, Pagar Putih"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition disabled:bg-slate-100 disabled:text-slate-400 shadow-2xs"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AddressCascadingForm;
