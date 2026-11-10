"use client";

import React, { useState, useRef } from "react";
import {
  UploadSimple,
  Trash,
  CheckCircle,
  CircleNotch,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import {
  CategoryIconRenderer,
  isCustomImageIcon,
  CATEGORY_ICON_MAP,
  AVAILABLE_SERVICE_ICONS,
  AVAILABLE_PRODUCT_ICONS,
} from "./CategoryIconRenderer";

export {
  CategoryIconRenderer,
  isCustomImageIcon,
  CATEGORY_ICON_MAP,
  AVAILABLE_SERVICE_ICONS,
  AVAILABLE_PRODUCT_ICONS,
};

interface CategoryIconPickerProps {
  value: string; // e.g. "Wrench" or "/uploads/categories/..."
  onChange: (val: string) => void;
  masterCode: "JASA" | "PRODUK";
}

export function CategoryIconPicker({ value, onChange, masterCode }: CategoryIconPickerProps) {
  const isCustomImage = isCustomImageIcon(value);
  const [activeTab, setActiveTab] = useState<"PRESET" | "UPLOAD">(isCustomImage ? "UPLOAD" : "PRESET");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableIcons = masterCode === "JASA" ? AVAILABLE_SERVICE_ICONS : AVAILABLE_PRODUCT_ICONS;
  const defaultFallbackIcon = masterCode === "JASA" ? "Wrench" : "Package";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Ukuran file maksimal 2MB.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/uploads/category-icon", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengunggah foto ikon.");
      }

      onChange(json.data.url);
      setActiveTab("UPLOAD");
    } catch (err: any) {
      setUploadError(err.message || "Gagal mengunggah gambar.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveCustomImage = () => {
    onChange(defaultFallbackIcon);
    setActiveTab("PRESET");
    setUploadError(null);
  };

  return (
    <div className="space-y-3">
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between gap-2">
        <label className="block font-bold text-slate-700">Pilih Ikon atau Foto Kategori</label>
        
        {/* Toggle Preset vs Upload */}
        <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab("PRESET");
              if (isCustomImage) {
                // Keep the value until user picks a preset or keep tab switch
              }
            }}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeTab === "PRESET"
                ? "bg-white text-[#0F4C81] shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Ikon Preset
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("UPLOAD")}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeTab === "UPLOAD"
                ? "bg-white text-[#0F4C81] shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Unggah Foto / Ilustrasi
          </button>
        </div>
      </div>

      {/* Current Preview Banner */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-sky-50/70 border border-sky-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white border border-sky-300 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
            <CategoryIconRenderer
              iconName={value || defaultFallbackIcon}
              size={22}
              weight="duotone"
              className="text-[#0F4C81]"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81]">Ikon Terpilih Saat Ini</p>
            <p className="text-xs font-semibold text-slate-800 truncate">
              {isCustomImage ? "Foto / Ilustrasi Kustom Terunggah" : value || defaultFallbackIcon}
            </p>
          </div>
        </div>

        {isCustomImage && (
          <button
            type="button"
            onClick={handleRemoveCustomImage}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
            title="Hapus foto dan kembali ke ikon preset"
          >
            <Trash size={12} weight="bold" />
            <span>Hapus Foto</span>
          </button>
        )}
      </div>

      {/* TAB 1: PRESET ICONS */}
      {activeTab === "PRESET" && (
        <div className="space-y-2">
          {/* Default recommended icons */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              6 Ikon Utama Rekomendasi
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {availableIcons
                .filter((i) => i.isDefault)
                .map((item) => {
                  const IconComp = item.icon;
                  const isSelected = !isCustomImage && value === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => onChange(item.name)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                        isSelected
                          ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-xs ring-2 ring-[#0F4C81]/20"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                      }`}
                      title={item.label}
                    >
                      <IconComp size={22} weight={isSelected ? "bold" : "duotone"} />
                      <span className="text-[9px] font-bold truncate max-w-full">{item.label.split(" ")[0]}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Other icons */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Pilihan Ikon Tambahan Lainnya
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1.5 border border-slate-100 rounded-xl bg-slate-50/50">
              {availableIcons
                .filter((i) => !i.isDefault)
                .map((item) => {
                  const IconComp = item.icon;
                  const isSelected = !isCustomImage && value === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => onChange(item.name)}
                      className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                      title={item.label}
                    >
                      <IconComp size={18} weight={isSelected ? "bold" : "duotone"} />
                      <span className="text-[8px] truncate max-w-full font-medium">{item.name}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UPLOAD CUSTOM PHOTO / ILLUSTRATION */}
      {activeTab === "UPLOAD" && (
        <div className="space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-sky-300 hover:border-[#0F4C81] bg-sky-50/40 hover:bg-sky-50/80 rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <CircleNotch size={26} className="animate-spin text-[#0F4C81]" />
                <span className="text-xs font-semibold text-slate-600">Mengunggah gambar ikon...</span>
              </div>
            ) : isCustomImage ? (
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="w-16 h-16 rounded-2xl bg-white border border-sky-200 p-2 flex items-center justify-center shadow-xs">
                  <img
                    src={value}
                    alt="Preview"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-[#0F4C81] group-hover:underline">
                    Klik untuk Mengganti Foto / Ilustrasi
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Mendukung format PNG, SVG, WebP, atau JPG (Maks 2MB)</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-10 h-10 rounded-xl bg-white text-[#0F4C81] flex items-center justify-center border border-sky-200 shadow-2xs group-hover:scale-105 transition-transform">
                  <UploadSimple size={20} weight="bold" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-700 group-hover:text-[#0F4C81]">
                    Pilih File Foto atau Ilustrasi
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Format transparan SVG / PNG sangat disarankan (Maksimal 2MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {uploadError && (
            <p className="text-[11px] font-semibold text-red-600 bg-red-50 p-2 rounded-xl border border-red-200">
              {uploadError}
            </p>
          )}

          {isCustomImage && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
              <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0" />
              <span>Foto kustom aktif. Kategori ini akan menampilkan foto ini di seluruh antarmuka pelanggan dan publik.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
