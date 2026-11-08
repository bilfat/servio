"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  HouseLine,
  Buildings,
  NavigationArrow,
  CheckCircle,
  Truck,
  CircleNotch,
  Plus,
  ArrowRight,
  X,
} from "@phosphor-icons/react";
import { useActiveLocation } from "@/context/LocationContext";
import { useActiveRole } from "@/context/RoleContext";
import { Modal } from "@/components/ui/Modal";
import { profileApi } from "@/lib/servioApi";
import { AddressCascadingForm, AddressData } from "@/components/identity/AddressCascadingForm";

export function LocationPickerModal() {
  const {
    location,
    savedAddresses,
    isDetectingGps,
    isLocationModalOpen,
    closeLocationModal,
    detectGps,
    setActiveLocation,
    selectSavedAddress,
    refreshAddresses,
  } = useActiveLocation();

  const { user, activeRole, isAuthenticated, isPublicGuest } = useActiveRole();
  const isCustomer = (activeRole === "CUSTOMER" || user?.activeRole === "CUSTOMER") && isAuthenticated && !isPublicGuest;

  // New Address Form State using Kemendagri / Identity cascading location data
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [formLabel, setFormLabel] = useState("Rumah");
  const [formRecipient, setFormRecipient] = useState(user?.name || "");
  const [formPhone, setFormPhone] = useState(user?.phone || "");
  const [addrCascading, setAddrCascading] = useState<AddressData>({
    province: "DKI JAKARTA",
    city: "KOTA JAKARTA SELATAN",
    district: "",
    village: "",
    postal_code: "",
    street_address: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name && !formRecipient) {
      setFormRecipient(user.name);
    }
    if (user?.phone && !formPhone) {
      setFormPhone(user.phone);
    }
  }, [user]);

  const handleDetectGps = async () => {
    const res = await detectGps();
    if (res) {
      closeLocationModal();
    }
  };

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    const prov = addrCascading.province_name || addrCascading.province || "";
    const city = addrCascading.city_name || addrCascading.city || "";
    const district = addrCascading.district_name || addrCascading.district || "";
    const village = addrCascading.village_name || addrCascading.village || "";
    const postalCode = addrCascading.postal_code || "";
    const street = addrCascading.street_address || addrCascading.address || "";
    const rtRw = addrCascading.rt_rw || "";
    const landmark = addrCascading.landmark || "";

    if (!city.trim() || !street.trim()) {
      setFormError("Kota/kabupaten dan detail alamat lengkap wajib diisi.");
      return;
    }

    setFormError(null);
    setIsSavingAddress(true);

    try {
      const label = formLabel.trim() || "Alamat Baru";
      const fullStreet = [
        street.trim(),
        rtRw ? `RT/RW ${rtRw}` : null,
        landmark ? `(Patokan: ${landmark})` : null,
      ]
        .filter(Boolean)
        .join(", ");

      if (isCustomer) {
        await profileApi.createAddress({
          label,
          recipientName: formRecipient.trim() || undefined,
          phone: formPhone.trim() || undefined,
          addressLine: fullStreet,
          province: prov || undefined,
          city: city.trim(),
          district: district.trim() || undefined,
          village: village.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
          latitude: addrCascading.latitude,
          longitude: addrCascading.longitude,
        });
        await refreshAddresses();
      }

      setActiveLocation({
        displayName: `${city.trim()} (${district.trim() || village.trim() || label})`,
        city: city.trim(),
        district: district.trim(),
        province: prov,
        postalCode: postalCode.trim() || undefined,
        street: fullStreet,
        latitude: addrCascading.latitude,
        longitude: addrCascading.longitude,
        isGps: false,
        source: isCustomer ? "CUSTOMER_ADDRESS" : "MANUAL_SELECT",
        addressLabel: label,
      });

      setShowAddForm(false);
      closeLocationModal();
    } catch (err: any) {
      setFormError(err?.message || "Gagal menyimpan alamat.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  return (
    <Modal
      isOpen={isLocationModalOpen}
      onClose={closeLocationModal}
      title="Pilih Titik Lokasi Layanan"
      maxWidth={showAddForm ? "3xl" : "2xl"}
    >
      <div className="space-y-6 font-body text-slate-900">
        {/* Intro Alert: Explaining Distance-Based Service Jangkauan */}
        <div className="flex items-start gap-3 p-3.5 bg-sky-50/80 border border-sky-200/90 rounded-2xl text-xs text-sky-950">
          <Truck size={20} className="text-[#0F4C81] shrink-0 mt-0.5" weight="duotone" />
          <div className="leading-relaxed">
            <span className="font-bold text-[#0F4C81] block">
              Jangkauan Layanan &amp; Pengiriman Berdasarkan Jarak:
            </span>
            <span>
              Katalog produk dan jasa menyesuaikan lokasi Anda secara real-time. Toko atau penyedia jasa di luar radius jangkauan maksimal (maksimum platform 80 km) otomatis disaring untuk menjamin kecepatan dan keandalan layanan.
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
                  Gunakan koordinat GPS perangkat Anda untuk mencocokkan jangkauan toko &amp; teknisi secara presisi
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
                  <span>Gunakan GPS</span>
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
                <span>Buku Alamat Saya</span>
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

        {/* 3. Tambah Alamat Baru (Pengganti Filter Kota Manual) */}
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Buildings size={16} className="text-[#0F4C81]" weight="bold" />
              <span>Tambah Alamat Baru</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs font-bold text-[#0F4C81] hover:underline flex items-center gap-1 cursor-pointer"
            >
              {showAddForm ? (
                <>
                  <X size={12} weight="bold" />
                  <span>Tutup Form</span>
                </>
              ) : (
                <>
                  <Plus size={12} weight="bold" />
                  <span>Isi Alamat Baru</span>
                </>
              )}
            </button>
          </div>

          {showAddForm ? (
            <form onSubmit={handleSaveNewAddress} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 animate-in fade-in">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Recipient & Label Information */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Label Alamat <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formLabel}
                      onChange={(e) => setFormLabel(e.target.value)}
                      placeholder="Rumah, Kantor, dll"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-1 focus:ring-[#0F4C81] outline-none"
                    />
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {["Rumah", "Kantor", "Apartemen"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFormLabel(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition cursor-pointer ${
                            formLabel === preset
                              ? "bg-sky-100 border-[#0F4C81] text-[#0F4C81] font-bold"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Nama Penerima
                    </label>
                    <input
                      type="text"
                      value={formRecipient}
                      onChange={(e) => setFormRecipient(e.target.value)}
                      placeholder="Nama Penerima"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-1 focus:ring-[#0F4C81] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      No. Telepon
                    </label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="0812xxxxxxxx"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-1 focus:ring-[#0F4C81] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Cascading Location Form (Emsifa Kemendagri API) */}
              <AddressCascadingForm
                value={addrCascading}
                onChange={(data) => {
                  setAddrCascading(data);
                  if (formError) setFormError(null);
                }}
                title="Wilayah & Alamat Lengkap"
                subtitle="Pilih provinsi, kota/kabupaten, kecamatan, dan kelurahan resmi."
                required={true}
                showRtRw={true}
                showLandmark={true}
                showGoogleMap={false}
                layout="stacked"
                idPrefix="navbar-picker"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="px-4 py-2 rounded-xl bg-[#0F4C81] hover:bg-[#0A365C] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingAddress ? (
                    <>
                      <CircleNotch size={13} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan &amp; Jadikan Alamat Aktif</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full p-3 rounded-2xl border border-dashed border-slate-300 hover:border-[#0F4C81] bg-slate-50/50 hover:bg-sky-50/30 text-slate-600 hover:text-[#0F4C81] text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={15} weight="bold" />
              <span>Masukkan Alamat Baru (Tersimpan ke Buku Alamat)</span>
            </button>
          )}
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
