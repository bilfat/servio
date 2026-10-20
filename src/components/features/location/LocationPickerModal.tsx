"use client";

import React, { useState } from "react";
import {
  MapPin,
  NavigationArrow,
  CheckCircle,
  CircleNotch,
  HouseLine,
  Buildings,
  X,
  MagnifyingGlass,
  WarningCircle,
  Truck,
  ArrowRight,
} from "@phosphor-icons/react";
import { useActiveLocation, POPULAR_CITIES } from "@/context/LocationContext";
import { useActiveRole } from "@/context/RoleContext";
import { Modal } from "@/components/ui/Modal";

export function LocationPickerModal() {
  const {
    location,
    savedAddresses,
    isDetectingGps,
    isLocationModalOpen,
    closeLocationModal,
    detectGps,
    setManualCity,
    selectSavedAddress,
  } = useActiveLocation();

  const { user, activeRole, isAuthenticated, isPublicGuest } = useActiveRole();
  const isCustomer = (activeRole === "CUSTOMER" || user?.activeRole === "CUSTOMER") && isAuthenticated && !isPublicGuest;
  const [cityFilter, setCityFilter] = useState("");

  const filteredCities = POPULAR_CITIES.filter((c) =>
    c.city.toLowerCase().includes(cityFilter.toLowerCase()) ||
    c.province.toLowerCase().includes(cityFilter.toLowerCase())
  );

  const handleSelectCity = (city: string, province: string) => {
    setManualCity(city, province);
    closeLocationModal();
  };

  const handleDetectGps = async () => {
    const res = await detectGps();
    if (res) {
      closeLocationModal();
    }
  };

  return (
    <Modal
      isOpen={isLocationModalOpen}
      onClose={closeLocationModal}
      title="Pilih Titik Lokasi Pengiriman"
      maxWidth="2xl"
    >
      <div className="space-y-6 font-body text-slate-900">
        {/* Intro Alert: Explaining In-City Local Delivery Concept */}
        <div className="flex items-start gap-3 p-3.5 bg-sky-50/80 border border-sky-200/90 rounded-2xl text-xs text-sky-950">
          <Truck size={20} className="text-[#0F4C81] shrink-0 mt-0.5" weight="duotone" />
          <div className="leading-relaxed">
            <span className="font-bold text-[#0F4C81] block">
              Pengiriman Suku Cadang &amp; Material Servis Sekota:
            </span>
            <span>
              Suku cadang dan material teknis SERVIO dikirim langsung oleh mitra toko terdekat menggunakan kurir lokal instan/sameday. Pengiriman ke luar kota tidak dapat diproses demi menjaga keamanan barang dan kecepatan penanganan teknisi.
            </span>
          </div>
        </div>

        {/* 1. Quick GPS Button */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/70 to-teal-50/40 border border-emerald-200/80 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <NavigationArrow size={18} weight="bold" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Deteksi Otomatis Lokasi Saya (GPS)</h4>
                <p className="text-[11px] text-slate-500">
                  Gunakan GPS perangkat untuk mencocokkan toko sekota Anda secara presisi
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDetectGps}
              disabled={isDetectingGps}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isDetectingGps ? (
                <>
                  <CircleNotch size={14} className="animate-spin" />
                  <span>Mencari GPS...</span>
                </>
              ) : (
                <>
                  <span>Aktifkan GPS</span>
                  <ArrowRight size={13} weight="bold" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Customer Saved Addresses (if logged in customer has addresses) */}
        {isCustomer && savedAddresses.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <HouseLine size={16} className="text-[#0F4C81]" weight="bold" />
                <span>Buku Alamat Pengerjaan Saya</span>
              </h4>
              <span className="text-[10px] text-slate-400">Tersimpan di Profil Pelanggan</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {savedAddresses.map((addr) => {
                const isSelected = location.source === "CUSTOMER_ADDRESS" && location.addressId === addr.id;
                return (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      selectSavedAddress(addr);
                      closeLocationModal();
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-sky-50/90 border-[#0F4C81] ring-2 ring-[#0F4C81]/20 shadow-xs"
                        : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-1 truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Utama
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 font-medium">
                          &bull; {addr.recipientName} ({addr.phone})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 truncate">{addr.addressLine}</p>
                      <p className="text-[11px] font-semibold text-[#0F4C81]">
                        {addr.district ? `${addr.district}, ` : ""}
                        {addr.city} {addr.postalCode ? `(${addr.postalCode})` : ""}
                      </p>
                    </div>

                    <div className="shrink-0 mt-0.5">
                      {isSelected ? (
                        <CheckCircle size={18} weight="fill" className="text-[#0F4C81]" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-slate-300 block" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Manual City Selection Grid */}
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Buildings size={16} className="text-[#0F4C81]" weight="bold" />
              <span>Atau Pilih Kota Manual</span>
            </h4>

            {/* Mini Search Input */}
            <div className="relative min-w-[200px]">
              <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="Cari nama kota..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F4C81]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
            {filteredCities.map((item) => {
              const isSelected =
                location.city.toLowerCase().includes(item.city.toLowerCase()) ||
                item.city.toLowerCase().includes(location.city.toLowerCase());

              return (
                <button
                  key={item.city}
                  type="button"
                  onClick={() => handleSelectCity(item.city, item.province)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-xs font-bold ring-2 ring-[#0F4C81]/30"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs truncate">{item.city}</span>
                    {isSelected && <CheckCircle size={13} weight="fill" className="text-sky-300 shrink-0" />}
                  </div>
                  <span className={`text-[10px] mt-0.5 truncate ${isSelected ? "text-sky-100" : "text-slate-400"}`}>
                    {item.province}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Active Location Display */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <MapPin size={15} weight="fill" className={location.isGps ? "text-emerald-600" : "text-[#0F4C81]"} />
            <span>Lokasi Aktif: <strong className="text-slate-900">{location.displayName}</strong></span>
            {location.isGps && (
              <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                GPS
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeLocationModal}
            className="text-xs font-bold text-[#0F4C81] hover:underline cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </Modal>
  );
}
