"use client";

import React, { useState } from "react";
import { MapPin, NavigationArrow, Buildings, House, Briefcase, CircleNotch } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { getCurrentGpsPosition, reverseGeocodeLocation } from "@/lib/geoUtils";

export interface AddressData {
  label: "Rumah" | "Kantor" | "Apartemen" | "Lainnya";
  fullAddress: string;
  notes?: string;
  latitude: number;
  longitude: number;
}

export interface LocationPickerProps {
  initialValue?: Partial<AddressData>;
  onChange: (data: AddressData) => void;
  disabled?: boolean;
}

const DEFAULT_ADDRESS: AddressData = {
  label: "Rumah",
  fullAddress: "Jl. Boulevard Raya Blok QF 1 No. 24, Kelapa Gading, Jakarta Utara, DKI Jakarta 14240",
  notes: "Pagar hitam nomor 24, sebelah mini market FamilyMart",
  latitude: -6.1554,
  longitude: 106.9038,
};

export function LocationPicker({
  initialValue,
  onChange,
  disabled = false,
}: LocationPickerProps) {
  const [address, setAddress] = useState<AddressData>({
    ...DEFAULT_ADDRESS,
    ...initialValue,
  });

  const [isDetectingGps, setIsDetectingGps] = useState(false);

  const addressLabels: { id: AddressData["label"]; icon: typeof House }[] = [
    { id: "Rumah", icon: House },
    { id: "Kantor", icon: Briefcase },
    { id: "Apartemen", icon: Buildings },
  ];

  const updateField = <K extends keyof AddressData>(key: K, value: AddressData[K]) => {
    const updated = { ...address, [key]: value };
    setAddress(updated);
    onChange(updated);
  };

  const handleGetLiveLocation = async () => {
    setIsDetectingGps(true);
    try {
      const pos = await getCurrentGpsPosition();
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      const geo = await reverseGeocodeLocation(lat, lng);

      const fullAddr = geo.street
        ? `${geo.street}, ${geo.district ? geo.district + ', ' : ''}${geo.city}, ${geo.province} ${geo.postalCode}`
        : address.fullAddress;

      const updated: AddressData = {
        ...address,
        latitude: lat,
        longitude: lng,
        fullAddress: fullAddr,
      };
      setAddress(updated);
      onChange(updated);
    } catch {
      // Graceful fallback
      updateField("latitude", -6.2088);
      updateField("longitude", 106.8456);
    } finally {
      setIsDetectingGps(false);
    }
  };

  return (
    <div className="space-y-4 text-left font-body">
      {/* Label Pills */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-neutral-dark font-display">
          Label Alamat Servis
        </label>
        <div className="flex flex-wrap gap-2">
          {addressLabels.map(({ id, icon: Icon }) => {
            const isSelected = address.label === id;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => updateField("label", id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-primary text-white shadow-servio-xs"
                    : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
                }`}
              >
                <Icon size={14} weight={isSelected ? "fill" : "bold"} />
                <span>{id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Simulated Interactive Map Pinpoint Card */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-sky/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary text-white shadow-sm">
              <MapPin size={20} weight="fill" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-dark font-display">
                Titik Presisi GPS Lokasi
              </p>
              <p className="text-[11px] text-neutral-slate font-mono">
                {address.latitude.toFixed(4)}, {address.longitude.toFixed(4)}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={disabled || isDetectingGps}
            onClick={handleGetLiveLocation}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-neutral-dark text-[11px] font-semibold hover:bg-slate-50 transition-colors shadow-servio-xs disabled:opacity-50"
            title="Ambil lokasi GPS perangkat dan isi alamat otomatis"
          >
            {isDetectingGps ? (
              <>
                <CircleNotch size={12} weight="bold" className="animate-spin text-secondary" />
                <span>Mendeteksi GPS...</span>
              </>
            ) : (
              <>
                <NavigationArrow size={12} weight="fill" className="text-secondary" />
                <span>Gunakan Lokasi Saat Ini</span>
              </>
            )}
          </button>
        </div>

        {/* Mock Map Background Visual */}
        <div className="h-28 rounded-xl bg-gradient-to-br from-sky-100 via-sky-50 to-emerald-50 border border-sky-200/80 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#0F4C81_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="relative z-10 flex flex-col items-center animate-bounce">
            <MapPin size={32} weight="fill" className="text-secondary drop-shadow-md" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-dark text-white shadow-sm mt-0.5">
              Lokasi Pengerjaan
            </span>
          </div>
        </div>
      </div>

      {/* Detail Alamat Input */}
      <Textarea
        label="Alamat Lengkap"
        required
        value={address.fullAddress}
        onChange={(e) => updateField("fullAddress", e.target.value)}
        placeholder="Nama jalan, nomor rumah/gedung, RT/RW, kelurahan, kecamatan, kota..."
        disabled={disabled}
        rows={2}
      />

      {/* Patokan Tambahan */}
      <Input
        label="Catatan Patokan Lokasi (Opsional)"
        value={address.notes || ""}
        onChange={(e) => updateField("notes", e.target.value)}
        placeholder="Cth: Cat rumah abu-abu, pagar hitam, dekat pos satpam..."
        disabled={disabled}
      />
    </div>
  );
}
