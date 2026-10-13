"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MapPin,
  House,
  Briefcase,
  Buildings,
  Plus,
  PencilSimple,
  Trash,
  CheckCircle,
  ArrowLeft,
  Star,
  WarningCircle,
  NavigationArrow,
  Crosshair,
  CircleNotch,
} from "@phosphor-icons/react";
import { Toast } from "@/components/feedback/Toast";
import { LocationPicker, AddressData } from "@/components/form/LocationPicker";
import { profileApi, ApiAddress } from "@/lib/servioApi";
import { useActiveRole } from "@/context/RoleContext";
import { getCurrentGpsPosition, reverseGeocodeLocation } from "@/lib/geoUtils";

export default function CustomerAddressesPage() {
  const { user } = useActiveRole();
  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDetectingModalGps, setIsDetectingModalGps] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info" | "warning">("success");

  // Modal / Form state
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState<string>("Rumah");
  const [formRecipient, setFormRecipient] = useState<string>("");
  const [formPhone, setFormPhone] = useState<string>("");
  const [formAddressLine, setFormAddressLine] = useState<string>("");
  const [formCity, setFormCity] = useState<string>("Jakarta Selatan");
  const [formDistrict, setFormDistrict] = useState<string>("");
  const [formProvince, setFormProvince] = useState<string>("DKI Jakarta");
  const [formPostalCode, setFormPostalCode] = useState<string>("");
  const [formLat, setFormLat] = useState<number>(-6.2088);
  const [formLng, setFormLng] = useState<number>(106.8456);
  const [formIsDefault, setFormIsDefault] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadAddresses = async () => {
    setIsLoading(true);
    try {
      const res = await profileApi.getAddresses();
      if (res.data) {
        setAddresses(res.data);
      }
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal memuat daftar alamat.");
      setToastType("warning");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const openAddModal = () => {
    setEditingAddressId(null);
    setFormLabel("Rumah");
    setFormRecipient(user.name || "");
    setFormPhone(user.phone || "");
    setFormAddressLine("");
    setFormCity("Jakarta Selatan");
    setFormDistrict("");
    setFormProvince("DKI Jakarta");
    setFormPostalCode("");
    setFormLat(-6.2088);
    setFormLng(106.8456);
    setFormIsDefault(addresses.length === 0);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (addr: ApiAddress) => {
    setEditingAddressId(addr.id);
    setFormLabel(addr.label);
    setFormRecipient(addr.recipientName || "");
    setFormPhone(addr.phone || "");
    setFormAddressLine(addr.addressLine);
    setFormCity(addr.city);
    setFormDistrict(addr.district || "");
    setFormProvince(addr.province || "DKI Jakarta");
    setFormPostalCode(addr.postalCode || "");
    setFormLat(addr.latitude ?? -6.2088);
    setFormLng(addr.longitude ?? 106.8456);
    setFormIsDefault(Boolean(addr.isDefault));
    setFormError(null);
    setShowModal(true);
  };

  const handleLocationPickerChange = async (data: AddressData) => {
    setFormLabel(data.label);
    if (data.fullAddress) {
      setFormAddressLine(data.fullAddress);
    }
    setFormLat(data.latitude);
    setFormLng(data.longitude);

    if (data.latitude && data.longitude) {
      try {
        const geo = await reverseGeocodeLocation(data.latitude, data.longitude);
        if (geo.city) setFormCity(geo.city);
        if (geo.district) setFormDistrict(geo.district);
        if (geo.postalCode) setFormPostalCode(geo.postalCode);
      } catch {
        // ignore
      }
    }
  };

  const handleDirectGpsInModal = async () => {
    setIsDetectingModalGps(true);
    try {
      const pos = await getCurrentGpsPosition();
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      setFormLat(lat);
      setFormLng(lng);

      const geo = await reverseGeocodeLocation(lat, lng);
      if (geo.city) setFormCity(geo.city);
      if (geo.district) setFormDistrict(geo.district);
      if (geo.postalCode) setFormPostalCode(geo.postalCode);
      if (!formAddressLine || formAddressLine.trim() === "") {
        setFormAddressLine(geo.street);
      }

      setToastMessage(
        `Titik GPS berhasil disematkan: ${geo.district ? geo.district + ', ' : ''}${geo.city} (${lat}, ${lng}). Wilayah otomatis terisi!`
      );
      setToastType("success");
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal mengambil lokasi GPS. Pastikan izin lokasi browser aktif.");
      setToastType("warning");
    } finally {
      setIsDetectingModalGps(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAddressLine.trim()) {
      setFormError("Alamat lengkap tidak boleh kosong.");
      return;
    }
    if (!formCity.trim()) {
      setFormError("Kota/Kabupaten tidak boleh kosong.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        label: formLabel,
        recipientName: formRecipient,
        phone: formPhone,
        addressLine: formAddressLine,
        city: formCity,
        district: formDistrict,
        province: formProvince,
        postalCode: formPostalCode,
        latitude: formLat,
        longitude: formLng,
        isDefault: formIsDefault,
      };

      if (editingAddressId) {
        await profileApi.updateAddress(editingAddressId, payload);
        setToastMessage("Alamat berhasil diperbarui.");
      } else {
        await profileApi.createAddress(payload);
        setToastMessage("Alamat baru berhasil ditambahkan.");
      }
      setToastType("success");
      setShowModal(false);
      await loadAddresses();
    } catch (err: any) {
      setFormError(err?.message || "Gagal menyimpan alamat.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus alamat ini?")) return;
    try {
      await profileApi.deleteAddress(addressId);
      setToastMessage("Alamat berhasil dihapus.");
      setToastType("info");
      await loadAddresses();
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal menghapus alamat.");
      setToastType("warning");
    }
  };

  const handleSetDefault = async (addr: ApiAddress) => {
    try {
      await profileApi.updateAddress(addr.id, { isDefault: true });
      setToastMessage(`Alamat "${addr.label}" dijadikan sebagai alamat utama.`);
      setToastType("success");
      await loadAddresses();
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal mengubah alamat utama.");
      setToastType("warning");
    }
  };

  const getLabelIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("kantor") || l.includes("office")) return <Briefcase size={16} weight="fill" className="text-sky-600" />;
    if (l.includes("apartemen")) return <Buildings size={16} weight="fill" className="text-indigo-600" />;
    return <House size={16} weight="fill" className="text-emerald-600" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 font-body text-left">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 transition"
          >
            <ArrowLeft size={18} weight="bold" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Item 93
              </span>
              <h1 className="text-xl font-bold font-display text-slate-900">
                Buku Alamat Tersimpan
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola alamat tujuan layanan servis teknisi dengan titik koordinat GPS presisi.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs flex items-center gap-2 transition shadow-xs self-start sm:self-auto"
        >
          <Plus size={16} weight="bold" />
          <span>Tambah Alamat Baru</span>
        </button>
      </div>

      {/* Address List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/80 animate-pulse text-xs">
            Memuat daftar alamat dari server...
          </div>
        ) : addresses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0F4C81] flex items-center justify-center mx-auto">
              <MapPin size={24} weight="bold" />
            </div>
            <p className="text-sm font-bold text-slate-800">Belum Ada Alamat Tersimpan</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tambahkan alamat rumah atau kantor Anda untuk mempermudah pemesanan teknisi Servio.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-sky-900 transition"
            >
              Tambah Sekarang
            </button>
          </div>
        ) : (
          addresses.map((addr) => (
            <div
              key={addr.id}
              className={`p-5 rounded-3xl bg-white border transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                addr.isDefault
                  ? "border-[#0F4C81]/60 ring-1 ring-[#0F4C81]/20 bg-sky-50/20"
                  : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100 flex items-center justify-center">
                    {getLabelIcon(addr.label)}
                  </div>
                  <span className="font-bold text-sm text-slate-900">{addr.label}</span>
                  {addr.isDefault && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0F4C81] text-white">
                      Alamat Utama
                    </span>
                  )}
                  {addr.latitude != null && addr.longitude != null && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <NavigationArrow size={10} weight="fill" />
                      GPS Terverifikasi
                    </span>
                  )}
                </div>

                <div>
                  {(addr.recipientName || addr.phone) && (
                    <p className="text-xs font-bold text-slate-800">
                      {addr.recipientName} {addr.phone && `(${addr.phone})`}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {addr.addressLine}
                    {addr.district && `, ${addr.district}`}
                    {addr.city && `, ${addr.city}`}
                    {addr.province && `, ${addr.province}`}
                    {addr.postalCode && ` ${addr.postalCode}`}
                  </p>
                  {addr.latitude != null && addr.longitude != null && (
                    <p className="text-[11px] font-mono text-slate-400 mt-1">
                      Koordinat: {addr.latitude.toFixed(6)}, {addr.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
                  >
                    Jadikan Utama
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEditModal(addr)}
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                  title="Edit Alamat"
                >
                  <PencilSimple size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                  title="Hapus Alamat"
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add / Edit Address with LocationPicker */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-servio-lg text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold font-display text-base text-slate-900">
                {editingAddressId ? "Edit Alamat Tersimpan" : "Tambah Alamat Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Tutup
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <WarningCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="space-y-4 text-xs">
              {/* Map & GPS Picker Component */}
              <div className="space-y-1">
                <div className="flex items-center justify-between pb-1">
                  <label className="font-bold text-slate-800 text-xs">Pin Lokasi GPS</label>
                  <button
                    type="button"
                    onClick={handleDirectGpsInModal}
                    disabled={isDetectingModalGps}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-[11px] transition shadow-xs disabled:opacity-50"
                    title="Ambil titik koordinat dan wilayah otomatis dari GPS perangkat"
                  >
                    {isDetectingModalGps ? (
                      <>
                        <CircleNotch size={12} weight="bold" className="animate-spin text-white" />
                        <span>Mengambil GPS...</span>
                      </>
                    ) : (
                      <>
                        <Crosshair size={12} weight="bold" className="text-rose-300" />
                        <span>Gunakan GPS (Ambil Wilayah)</span>
                      </>
                    )}
                  </button>
                </div>
                <LocationPicker
                  initialValue={{
                    label: formLabel as any,
                    fullAddress: formAddressLine,
                    latitude: formLat,
                    longitude: formLng,
                  }}
                  onChange={handleLocationPickerChange}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Nama Penerima</label>
                  <input
                    type="text"
                    value={formRecipient}
                    onChange={(e) => setFormRecipient(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Nomor Telepon</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+62812xxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Alamat Lengkap *</label>
                <textarea
                  value={formAddressLine}
                  onChange={(e) => setFormAddressLine(e.target.value)}
                  rows={2}
                  placeholder="Nama jalan, nomor rumah, RT/RW, patokan..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Kota / Kab *</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="Jakarta Selatan"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Kecamatan</label>
                  <input
                    type="text"
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    placeholder="Kebayoran Baru"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-800">Kode Pos</label>
                  <input
                    type="text"
                    value={formPostalCode}
                    onChange={(e) => setFormPostalCode(e.target.value)}
                    placeholder="12130"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chkDefault"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0F4C81]"
                />
                <label htmlFor="chkDefault" className="font-semibold text-slate-700 text-xs cursor-pointer">
                  Jadikan sebagai alamat servis utama
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs transition disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Alamat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
