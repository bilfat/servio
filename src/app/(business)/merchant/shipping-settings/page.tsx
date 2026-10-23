"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Truck,
  MapPin,
  CheckCircle,
  WarningCircle,
  Plus,
  Trash,
  Calculator,
  Info,
  ArrowsClockwise,
  FloppyDisk,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { useOrderBarang } from "@/features/order-barang/hooks/useOrderBarang";
import { formatRupiah, calculateTieredShippingFee } from "@/features/order-barang/helpers";
import { MockShippingRateTier, MockShippingSettings } from "@/types/order-barang";
import { Toast } from "@/components/feedback/Toast";

export default function MerchantShippingSettingsPage() {
  const {
    activeMerchantId,
    getShippingSettings,
    updateShippingSettings,
  } = useOrderBarang();

  const currentSettings = useMemo(
    () => getShippingSettings(activeMerchantId),
    [activeMerchantId, getShippingSettings]
  );

  const [formData, setFormData] = useState<MockShippingSettings>(currentSettings);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "warning">("success");

  // Calculator preview distance state
  const [testDistance, setTestDistance] = useState<number>(4.2);

  // New tier inputs
  const [newMinKm, setNewMinKm] = useState<number>(0);
  const [newMaxKm, setNewMaxKm] = useState<number>(0);
  const [newRate, setNewRate] = useState<number>(0);

  useEffect(() => {
    setFormData(currentSettings);
  }, [currentSettings]);

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!formData.isLocalDeliveryActive) return errors;

    if (formData.maxRadiusKm <= 0) {
      errors.push("Radius maksimum pengiriman harus lebih besar dari 0 km.");
    }

    if (formData.rateTiers.length === 0) {
      errors.push("Wajib memiliki minimal 1 rentang tarif bertingkat.");
    }

    // Sort tiers by minKm
    const sorted = [...formData.rateTiers].sort((a, b) => a.minKm - b.minKm);

    for (let i = 0; i < sorted.length; i++) {
      const tier = sorted[i];
      if (tier.minKm >= tier.maxKm) {
        errors.push(`Rentang ${tier.minKm}–${tier.maxKm} km tidak valid: Jarak minimum harus lebih kecil dari maksimum.`);
      }
      if (tier.rate < 0) {
        errors.push(`Tarif untuk rentang ${tier.minKm}–${tier.maxKm} km tidak boleh negatif.`);
      }
      // Check gaps & overlaps
      if (i > 0) {
        const prev = sorted[i - 1];
        if (tier.minKm < prev.maxKm) {
          errors.push(`Terdapat tumpang tindih (overlap) antara rentang ${prev.minKm}–${prev.maxKm} km dan ${tier.minKm}–${tier.maxKm} km.`);
        } else if (tier.minKm > prev.maxKm) {
          errors.push(`Terdapat celah (gap) antara rentang ${prev.minKm}–${prev.maxKm} km dan ${tier.minKm}–${tier.maxKm} km.`);
        }
      }
    }

    if (sorted.length > 0 && sorted[0].minKm !== 0) {
      errors.push("Rentang tarif pertama harus dimulai dari 0 km.");
    }

    return errors;
  }, [formData]);

  const previewResult = useMemo(() => {
    return calculateTieredShippingFee(
      testDistance,
      formData.rateTiers,
      formData.maxRadiusKm
    );
  }, [testDistance, formData]);

  const handleToggleActive = () => {
    setFormData((prev) => ({
      ...prev,
      isLocalDeliveryActive: !prev.isLocalDeliveryActive,
    }));
  };

  const handleAddTier = () => {
    if (newMinKm >= newMaxKm) {
      setToastMessage("Jarak minimum harus lebih kecil daripada jarak maksimum.");
      setToastType("warning");
      return;
    }
    if (newRate <= 0) {
      setToastMessage("Tarif pengiriman harus lebih dari Rp0.");
      setToastType("warning");
      return;
    }

    const newTier: MockShippingRateTier = {
      id: `tier-${Date.now()}`,
      minKm: newMinKm,
      maxKm: newMaxKm,
      rate: newRate,
    };

    setFormData((prev) => ({
      ...prev,
      rateTiers: [...prev.rateTiers, newTier].sort((a, b) => a.minKm - b.minKm),
    }));

    setNewMinKm(newMaxKm);
    setNewMaxKm(newMaxKm + 3);
    setNewRate(newRate + 5000);
    setToastMessage("Rentang tarif berhasil ditambahkan.");
    setToastType("success");
  };

  const handleDeleteTier = (tierId: string) => {
    setFormData((prev) => ({
      ...prev,
      rateTiers: prev.rateTiers.filter((t) => t.id !== tierId),
    }));
  };

  const handleSave = () => {
    if (validationErrors.length > 0) {
      setToastMessage("Harap perbaiki kesalahan konfigurasi sebelum menyimpan.");
      setToastType("warning");
      return;
    }

    updateShippingSettings(activeMerchantId, formData);
    setToastMessage("Pengaturan pengiriman lokal berhasil disimpan!");
    setToastType("success");
  };

  const handleReset = () => {
    setFormData(currentSettings);
    setToastMessage("Perubahan dibatalkan. Kembali ke pengaturan awal.");
    setToastType("warning");
  };

  return (
    <div className="space-y-4 pb-16 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
              Konfigurasi Logistik Toko
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-display font-extrabold text-slate-900 leading-tight">
            Pengaturan Pengiriman Lokal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur radius jangkauan layanan toko dan tarif bertingkat untuk pembeli dalam satu kota administratif.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <ArrowsClockwise size={14} />
            <span>Batalkan</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={validationErrors.length > 0}
            className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FloppyDisk size={15} weight="bold" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>

      {/* Validation Alert */}
      {validationErrors.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-1">
          <div className="flex items-center gap-2 font-bold text-xs">
            <WarningCircle size={16} weight="fill" className="text-amber-600 shrink-0" />
            <span>Perhatian Konfigurasi Tarif:</span>
          </div>
          <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* KOLOM KIRI (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Section A: Informasi Lokasi Toko */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <MapPin size={15} className="text-primary shrink-0" weight="bold" />
                <span>A. Lokasi Toko (Titik Asal)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">GPS Origin</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Nama &amp; Alamat Toko:
                </span>
                <p className="font-bold text-slate-900 text-xs">{formData.merchantName}</p>
                <p className="text-[11px] text-slate-600 leading-snug">{formData.address}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Kota Administratif:
                  </span>
                  <span className="font-bold text-slate-900 text-xs">{formData.city}</span>
                </div>
                <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Koordinat:</span>
                  <span>{formData.coordinates.lat}, {formData.coordinates.lng}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Status Layanan Pengiriman Lokal */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <h3 className="text-xs font-bold text-slate-900">
                B. Status Pengiriman Lokal
              </h3>
              <p className="text-[11px] text-slate-500">
                {formData.isLocalDeliveryActive
                  ? "Toko menerima checkout pesanan lokal."
                  : "Produk suku cadang tidak dapat dicheckout."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleActive}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs ${
                formData.isLocalDeliveryActive
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  formData.isLocalDeliveryActive ? "bg-white" : "bg-slate-500"
                }`}
              />
              <span>{formData.isLocalDeliveryActive ? "Aktif" : "Nonaktif"}</span>
            </button>
          </div>

          {/* Section C: Jangkauan Pengiriman Maksimum */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">
                C. Radius Pengiriman Maksimum
              </h3>
              <span className="text-[11px] font-bold text-primary bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                Maks: {formData.maxRadiusKm} KM
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Pesanan di luar radius ini akan ditolak otomatis pada tahap validasi keranjang pembeli.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <div className="w-36">
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 px-2.5 py-1.5">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.maxRadiusKm}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        maxRadiusKm: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-transparent text-xs font-bold text-slate-900 outline-none"
                  />
                  <span className="text-[10px] font-semibold text-slate-400 ml-1">KM</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-600 flex-1 leading-snug">
                Radius cakupan hingga <strong>{formData.maxRadiusKm} km</strong> dari alamat gudang.
              </div>
            </div>
          </div>

          {/* Section E: Kalkulator Preview Interaktif */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Calculator size={15} className="text-emerald-600" weight="bold" />
                <span>Simulasi Kalkulasi Ongkir</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Uji Coba Tarif</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-medium text-slate-600 shrink-0">
                  Uji Jarak:
                </label>
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 px-2.5 py-1 w-28">
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    value={testDistance}
                    onChange={(e) => setTestDistance(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-bold text-slate-900 outline-none bg-transparent"
                  />
                  <span className="text-[10px] font-semibold text-slate-400 ml-1">KM</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Hasil Tarif:
                  </span>
                  {previewResult.isCovered ? (
                    <span className="text-sm font-extrabold text-emerald-600 font-mono">
                      {formatRupiah(previewResult.fee)}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-rose-600">
                      Di Luar Jangkauan
                    </span>
                  )}
                </div>
                {previewResult.isCovered && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle size={11} weight="fill" />
                    <span>Rentang {previewResult.tierMatched?.minKm}&ndash;{previewResult.tierMatched?.maxKm} km</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Section D: Tarif Pengiriman Bertingkat */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  D. Tarif Pengiriman Bertingkat (Tiered Rates)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tentukan ongkir yang dibayarkan pembeli berdasarkan rentang kilometer.
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {formData.rateTiers.length} Rentang
              </span>
            </div>

            {/* Existing Tiers Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Rentang Jarak</th>
                    <th className="py-2.5 px-3">Tarif Ongkir</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.rateTiers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-5 text-center text-slate-400 text-xs">
                        Belum ada rentang tarif. Tambahkan minimal satu rentang di bawah.
                      </td>
                    </tr>
                  ) : (
                    formData.rateTiers.map((tier, idx) => (
                      <tr key={tier.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-400 text-xs">
                          #{idx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 text-xs">
                          {tier.minKm === 0 ? "0" : tier.minKm} km &ndash; {tier.maxKm} km
                        </td>
                        <td className="py-2 px-3 font-bold text-primary text-xs">
                          {formatRupiah(tier.rate)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTier(tier.id)}
                            className="p-1 rounded-md text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus rentang"
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

            {/* Form Add Tier */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                <Plus size={13} weight="bold" />
                <span>Tambah Rentang Tarif Baru:</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">
                    Jarak Min (KM)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={newMinKm}
                    onChange={(e) => setNewMinKm(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">
                    Jarak Maks (KM)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={newMaxKm}
                    onChange={(e) => setNewMaxKm(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">
                    Tarif Ongkir (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={newRate}
                    onChange={(e) => setNewRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddTier}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                  >
                    + Tambah
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section F: Penjelasan & Kebijakan Ongkir */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-blue-950 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[#0F4C81]">
              <Info size={15} weight="bold" />
              <span>Ketentuan Pengiriman Toko &amp; Ekspedisi Pihak Ketiga</span>
            </div>
            <p className="leading-relaxed">
              &bull; <strong>Penentuan Ekspedisi:</strong> Toko dapat memilih antara <strong>Kurir Internal Toko</strong> atau <strong>GoSend Instant</strong> saat pesanan telah selesai dikemas (PACKED).
            </p>
            <p className="leading-relaxed">
              &bull; <strong>Tarif Pelanggan:</strong> Ongkir yang dibayar Customer selalu mengikuti tarif Pengiriman Lokal yang Anda tetapkan pada tabel bertingkat di atas.
            </p>
            <p className="leading-relaxed">
              &bull; <strong>Selisih Ongkir Pihak Ketiga:</strong> Jika toko menggunakan GoSend dan ongkir aktual berbeda, <strong>selisih biaya sepenuhnya menjadi tanggung jawab toko</strong> dan tidak ditagihkan kepada pelanggan.
            </p>
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
