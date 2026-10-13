"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useActiveRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/feedback/Toast";
import { profileApi, ApiAddress } from "@/lib/servioApi";
import {
  User,
  Envelope,
  Phone,
  MapPin,
  ShieldCheck,
  HouseLine,
  Receipt,
  GearSix,
  ArrowRight,
  PencilSimple,
  CheckCircle,
  Plus,
  Trash,
  NavigationArrow,
  ArrowLeft,
  Briefcase,
  IdentificationCard,
  UploadSimple,
  ClipboardText,
  Calendar,
  Crosshair,
  CircleNotch,
} from "@phosphor-icons/react";
import { getCurrentGpsPosition, reverseGeocodeLocation } from "@/lib/geoUtils";

export default function CustomerProfilePage() {
  const { user, activeRole, refreshUser } = useActiveRole();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Addresses from Live Database
  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState<boolean>(true);

  // Modals state
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [showAddressModal, setShowAddressModal] = useState<boolean>(false);
  const [selectedAddress, setSelectedAddress] = useState<ApiAddress | null>(null);

  // Edit Profile Form State
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<string>("MALE");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [avatar, setAvatar] = useState<string>("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const getDashboardUrl = (role: string) => {
    switch (role) {
      case "CEO_PRODUCT_OWNER":
        return "/ceo/dashboard";
      case "ADMIN_OPERATIONS":
        return "/ops/admin/dashboard";
      case "CUSTOMER_SUPPORT":
        return "/ops/support/dashboard";
      case "FINANCE_PAYMENT_OPS":
        return "/ops/finance/dashboard";
      case "SERVICE_PROVIDER":
        return "/provider/dashboard";
      case "WORKER_TECHNICIAN":
        return "/worker/dashboard";
      case "MERCHANT":
        return "/ops/merchant/dashboard";
      case "SUPPLIER":
        return "/ops/supplier/dashboard";
      default:
        return "/bookings";
    }
  };
  const dashboardHomeUrl = getDashboardUrl(activeRole);

  // Address Form State
  const [addrLabel, setAddrLabel] = useState("Rumah");
  const [addrRecipient, setAddrRecipient] = useState("");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrCity, setAddrCity] = useState("Jakarta Selatan");
  const [addrDistrict, setAddrDistrict] = useState("");
  const [addrProvince, setAddrProvince] = useState("DKI Jakarta");
  const [addrPostalCode, setAddrPostalCode] = useState("");
  const [addrLatitude, setAddrLatitude] = useState<number | undefined>(undefined);
  const [addrLongitude, setAddrLongitude] = useState<number | undefined>(undefined);
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isFetchingModalGps, setIsFetchingModalGps] = useState(false);

  const handleUseGpsInAddressModal = async () => {
    setIsFetchingModalGps(true);
    try {
      const pos = await getCurrentGpsPosition();
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));

      setAddrLatitude(lat);
      setAddrLongitude(lng);

      // Otomatis mengambil dan mengisi titik wilayah
      const geo = await reverseGeocodeLocation(lat, lng);
      if (geo.city) setAddrCity(geo.city);
      if (geo.district) setAddrDistrict(geo.district);
      if (geo.province) setAddrProvince(geo.province);
      if (geo.postalCode) setAddrPostalCode(geo.postalCode);
      if (!addrStreet || addrStreet.trim() === "") {
        setAddrStreet(geo.street);
      }

      setToastMessage(
        `Titik GPS berhasil disematkan: ${geo.district ? geo.district + ', ' : ''}${geo.city} (${lat}, ${lng}). Wilayah otomatis terisi!`
      );
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal mengambil lokasi GPS. Pastikan izin lokasi browser diaktifkan.");
    } finally {
      setIsFetchingModalGps(false);
    }
  };

  // Fetch addresses from Laravel REST API
  const loadAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const res = await profileApi.getAddresses();
      if (res.data) {
        setAddresses(res.data);
      }
    } catch {
      // Fallback empty list on error
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (user.id && user.id !== "guest") {
      loadAddresses();
    }
  }, [user.id]);

  // Sync profile form when opening modal
  const handleOpenEditProfile = () => {
    setDisplayName(user.personalProfile?.displayName || user.name);
    setBio(user.personalProfile?.bio || "");
    setGender(user.personalProfile?.gender || "MALE");
    setDateOfBirth(user.personalProfile?.dateOfBirth || "");
    setAvatar(user.avatar || user.personalProfile?.avatar || "");
    setShowEditProfileModal(true);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setToastMessage("Ukuran file foto maksimal 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await profileApi.updateProfile({
        displayName,
        bio,
        gender,
        dateOfBirth: dateOfBirth || null,
        avatar: avatar || undefined,
      });
      await refreshUser();
      setShowEditProfileModal(false);
      setToastMessage("Profil berhasil diperbarui!");
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleOpenAddressModal = (addr?: ApiAddress) => {
    if (addr) {
      setSelectedAddress(addr);
      setAddrLabel(addr.label);
      setAddrRecipient(addr.recipientName || user.name);
      setAddrPhone(addr.phone || user.phone || "");
      setAddrStreet(addr.addressLine);
      setAddrCity(addr.city);
      setAddrDistrict(addr.district || "");
      setAddrProvince(addr.province || "DKI Jakarta");
      setAddrPostalCode(addr.postalCode || "");
      setAddrLatitude(addr.latitude ?? undefined);
      setAddrLongitude(addr.longitude ?? undefined);
      setAddrIsDefault(addr.isDefault);
    } else {
      setSelectedAddress(null);
      setAddrLabel("Rumah");
      setAddrRecipient(user.name);
      setAddrPhone(user.phone || "");
      setAddrStreet("");
      setAddrCity("Jakarta Selatan");
      setAddrDistrict("");
      setAddrProvince("DKI Jakarta");
      setAddrPostalCode("");
      setAddrLatitude(-6.2088);
      setAddrLongitude(106.8456);
      setAddrIsDefault(addresses.length === 0);
    }
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAddress(true);
    try {
      const payload = {
        label: addrLabel,
        recipientName: addrRecipient,
        phone: addrPhone,
        addressLine: addrStreet,
        city: addrCity,
        district: addrDistrict,
        province: addrProvince,
        postalCode: addrPostalCode,
        latitude: addrLatitude,
        longitude: addrLongitude,
        isDefault: addrIsDefault,
      };

      if (selectedAddress) {
        await profileApi.updateAddress(selectedAddress.id, payload);
        setToastMessage("Alamat berhasil diperbarui!");
      } else {
        await profileApi.createAddress(payload);
        setToastMessage("Alamat baru berhasil ditambahkan!");
      }

      await loadAddresses();
      setShowAddressModal(false);
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : "Gagal menyimpan alamat.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus alamat ini?")) return;
    try {
      await profileApi.deleteAddress(id);
      await loadAddresses();
      setToastMessage("Alamat berhasil dihapus.");
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : "Gagal menghapus alamat.");
    }
  };

  const handleSetDefaultAddress = async (addr: ApiAddress) => {
    try {
      await profileApi.updateAddress(addr.id, { isDefault: true });
      await loadAddresses();
      setToastMessage(`Alamat "${addr.label}" dijadikan alamat utama.`);
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : "Gagal mengubah alamat default.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Bar Navigation: Back to Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href={dashboardHomeUrl}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-neutral-dark hover:bg-slate-50 hover:border-slate-300 text-xs font-bold shadow-servio-xs transition-all self-start"
        >
          <ArrowLeft size={16} weight="bold" className="text-primary" />
          <span>Kembali ke Dashboard ({activeRole.replace(/_/g, " ")})</span>
        </Link>

        {user.employeeId && (
          <Link
            href="/ops/staff/onboarding"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-xs font-bold shadow-servio-xs transition-all self-start sm:self-auto"
          >
            <ClipboardText size={16} weight="bold" />
            <span>Lembar Onboarding Staf →</span>
          </Link>
        )}
      </div>

      <PageHeader
        title="Profil & Pengaturan Akun"
        description="Kelola informasi identitas akun, kredensial resmi, dan status keanggotaan Servio Anda."
        breadcrumbs={[
          { label: "Servio", href: "/" },
          { label: "Profil Akun" },
        ]}
      />

      {/* Internal Staff Badge (If Staff Logged In) */}
      {user.employeeId && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-servio-sm border border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-xl">
                <ShieldCheck size={28} weight="fill" />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  STAFF INTERNAL SERVIO
                </span>
                <h3 className="font-display font-bold text-lg text-white mt-1">
                  Kredensial Resmi Platform Servio
                </h3>
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-600">
              SESI AKTIF: {user.status || "ACTIVE"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[11px]">NIP / ID Karyawan</span>
              <span className="font-bold font-mono text-white text-sm">{user.employeeId}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[11px]">Departemen / Divisi</span>
              <span className="font-semibold text-white">{user.department || "Operasional"}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700">
              <span className="text-slate-400 block text-[11px]">Role &amp; Otoritas</span>
              <span className="font-semibold text-white capitalize">{user.activeRole.toLowerCase().replace(/_/g, " ")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Business Partner Shortcut (If Business User Logged In) */}
      {(user.activeOrganization || user.businessProfile) && (
        <div className="bg-sky-50 rounded-3xl p-5 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
              <HouseLine size={22} weight="fill" />
            </div>
            <div>
              <p className="font-bold text-sky-900">
                Profil Usaha Mitra: {user.activeOrganization?.name || user.businessProfile?.businessData?.brandName || "Terdaftar"}
              </p>
              <p className="text-[11px] text-sky-700">
                Kode Organisasi: <span className="font-mono font-bold">{user.activeOrganization?.organizationCode || "ORG-ACTIVE"}</span> • Status: <span className="font-bold text-emerald-700">{user.activeOrganization?.status || "ACTIVE"}</span>
              </p>
            </div>
          </div>
          <Link
            href={
              user.activeRole === "SERVICE_PROVIDER"
                ? "/provider/profile"
                : user.activeRole === "MERCHANT"
                ? "/merchant/profile"
                : user.activeRole === "SUPPLIER"
                ? "/supplier/profile"
                : "/provider/profile"
            }
            className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark transition text-center shrink-0 shadow-servio-xs"
          >
            Buka Profil Organisasi &amp; Bisnis →
          </Link>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-servio-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-display font-black text-2xl overflow-hidden shrink-0 shadow-sm border border-slate-200">
              {user.avatar || user.personalProfile?.avatar || (user.avatarUrl && user.avatarUrl !== "/brand/logo.png") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar || user.personalProfile?.avatar || user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (user.personalProfile?.displayName || user.name || "S").charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-display text-neutral-dark">
                  {user.personalProfile?.displayName || user.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck size={12} weight="fill" />
                  {user.status === "ACTIVE" ? "Akun Terverifikasi" : user.status || "Aktif"}
                </span>
              </div>
              <p className="text-xs text-neutral-slate mt-0.5">
                ID Akun: <strong className="font-mono text-neutral-dark">{user.id}</strong> • Role: <span className="capitalize">{activeRole.toLowerCase().replace(/_/g, " ")}</span>
              </p>
              {user.personalProfile?.bio && (
                <p className="text-xs text-slate-600 mt-1 italic">&ldquo;{user.personalProfile.bio}&rdquo;</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenEditProfile}
            className="px-4 py-2 rounded-xl bg-slate-100 text-neutral-dark font-bold text-xs hover:bg-slate-200 transition flex items-center gap-1.5 shadow-servio-xs cursor-pointer"
          >
            <PencilSimple size={15} weight="bold" />
            <span>Edit Profil</span>
          </button>
        </div>

        {/* Identity Details from Live Database */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <Envelope size={20} className="text-primary" weight="duotone" />
            <div className="overflow-hidden">
              <span className="text-neutral-muted block text-[11px]">Email Terdaftar</span>
              <span className="font-semibold text-neutral-dark truncate block">{user.email}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <Phone size={20} className="text-secondary" weight="duotone" />
            <div>
              <span className="text-neutral-muted block text-[11px]">Nomor Handphone</span>
              <span className="font-semibold text-neutral-dark">{user.phone || "-"}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <ShieldCheck size={20} className="text-emerald-600" weight="duotone" />
            <div>
              <span className="text-neutral-muted block text-[11px]">NIK Kependudukan</span>
              <span className="font-semibold font-mono text-neutral-dark">{user.nik || "Belum Terdaftar"}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <CheckCircle size={20} className="text-blue-600" weight="duotone" />
            <div>
              <span className="text-neutral-muted block text-[11px]">Dokumen Identitas KTP</span>
              <span className="font-semibold text-neutral-dark">{user.ktpFilePath ? "Sudah Diunggah" : "Terverifikasi Sistem"}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <User size={20} className="text-indigo-600" weight="duotone" />
            <div>
              <span className="text-neutral-muted block text-[11px]">Jenis Kelamin</span>
              <span className="font-semibold text-neutral-dark">
                {user.personalProfile?.gender === "MALE"
                  ? "Laki-laki"
                  : user.personalProfile?.gender === "FEMALE"
                  ? "Perempuan"
                  : user.personalProfile?.gender || "-"}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <Calendar size={20} className="text-purple-600" weight="duotone" />
            <div>
              <span className="text-neutral-muted block text-[11px]">Tanggal Lahir</span>
              <span className="font-semibold text-neutral-dark">
                {user.personalProfile?.dateOfBirth ? String(user.personalProfile.dateOfBirth).split("T")[0] : "-"}
              </span>
            </div>
          </div>

          {user.emergencyContact && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3 sm:col-span-2 md:col-span-3">
              <Phone size={20} className="text-rose-500" weight="duotone" />
              <div>
                <span className="text-neutral-muted block text-[11px]">Kontak Darurat (Emergency Contact)</span>
                <span className="font-semibold text-neutral-dark">
                  {user.emergencyContact.name} ({user.emergencyContact.phone})
                </span>
              </div>
            </div>
          )}

          {/* e-KTP Photo Preview if Uploaded */}
          {user.ktpFilePath && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 col-span-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-dark uppercase tracking-wider flex items-center gap-1.5">
                  <IdentificationCard size={18} className="text-primary" weight="bold" />
                  Dokumen Resmi e-KTP
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Terverifikasi Sistem
                </span>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-white max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.ktpFilePath} alt="KTP" className="w-full h-44 object-contain bg-slate-50" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Address Book Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-servio-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-display font-bold text-base text-neutral-dark">
              Buku Alamat Pengerjaan
            </h3>
            <p className="text-xs text-neutral-slate">
              Alamat statis untuk kunjungan teknisi servis dan pengiriman suku cadang.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAddressModal()}
            className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark transition shadow-servio-xs flex items-center gap-1.5"
          >
            <Plus size={16} weight="bold" />
            <span>Tambah Alamat</span>
          </button>
        </div>

        {isLoadingAddresses ? (
          <div className="py-8 text-center text-xs text-slate-400">Memuat buku alamat...</div>
        ) : addresses.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <MapPin size={24} weight="duotone" />
            </div>
            <p className="text-xs font-semibold text-slate-600">Belum ada alamat tersimpan.</p>
            <button
              type="button"
              onClick={() => handleOpenAddressModal()}
              className="px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition"
            >
              + Buat Alamat Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  addr.isDefault
                    ? "border-primary/80 bg-sky-50/40 shadow-servio-xs"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-dark flex items-center gap-1.5">
                      <HouseLine size={16} className="text-primary" weight="bold" />
                      {addr.label}
                    </span>
                    {addr.isDefault && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">
                        Alamat Utama
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-neutral-dark">
                    {addr.recipientName || user.name} ({addr.phone || user.phone})
                  </p>
                  <p className="text-xs text-neutral-slate leading-relaxed">
                    {addr.addressLine}{addr.district ? `, ${addr.district}` : ""}, {addr.city}{addr.postalCode ? ` ${addr.postalCode}` : ""}
                  </p>
                  {addr.latitude !== null && addr.latitude !== undefined && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                      <NavigationArrow size={12} weight="fill" className="text-primary" />
                      <span>{addr.latitude.toFixed(4)}, {addr.longitude?.toFixed(4)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddress(addr)}
                        className="text-slate-500 hover:text-primary font-medium hover:underline text-[11px]"
                      >
                        Jadikan Utama
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenAddressModal(addr)}
                      className="text-primary font-bold hover:underline"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-rose-500 hover:text-rose-700 transition"
                      title="Hapus Alamat"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links to Service Hubs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/history"
          className="p-5 rounded-3xl bg-white border border-slate-200/80 hover:border-primary/50 hover:shadow-servio-xs transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <Receipt size={20} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-dark">Logbook Servis</p>
              <p className="text-[11px] text-neutral-muted">Riwayat pengerjaan</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-neutral-slate group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/warranties"
          className="p-5 rounded-3xl bg-white border border-slate-200/80 hover:border-primary/50 hover:shadow-servio-xs transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <ShieldCheck size={20} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-dark">Garansi Aktif</p>
              <p className="text-[11px] text-neutral-muted">Sertifikat digital</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-neutral-slate group-hover:text-primary transition-colors" />
        </Link>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        title="Edit Profil Akun"
        maxWidth="md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
          {/* Avatar Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-dark">Foto Profil / Avatar</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-2xl overflow-hidden shrink-0 shadow-sm border border-slate-200">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (displayName || user.name || "S").charAt(0).toUpperCase()
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-neutral-dark text-xs font-semibold shadow-servio-xs cursor-pointer"
                >
                  <UploadSimple size={14} />
                  <span>Pilih Foto Baru</span>
                </button>
                <p className="text-[10px] text-neutral-slate">Format JPG, PNG, atau WEBP. Maks 2MB.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-dark mb-1">Nama Tampilan</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="Contoh: Budi Santoso"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-dark mb-1">Biodata Singkat</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="Tuliskan catatan singkat profil Anda..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-dark mb-1">Jenis Kelamin</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="MALE">Laki-laki</option>
                <option value="FEMALE">Perempuan</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-dark mb-1">Tanggal Lahir</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEditProfileModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
            >
              {isSavingProfile ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Address Modal */}
      <Modal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        title={selectedAddress ? "Ubah Alamat Kunjungan" : "Tambah Alamat Baru"}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAddress} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-dark mb-1">Label Alamat</label>
              <input
                type="text"
                required
                value={addrLabel}
                onChange={(e) => setAddrLabel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Contoh: Rumah, Kantor, Toko"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-dark mb-1">Nama Penerima</label>
              <input
                type="text"
                required
                value={addrRecipient}
                onChange={(e) => setAddrRecipient(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Nama kontak"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-dark mb-1">Nomor Telepon</label>
              <input
                type="text"
                required
                value={addrPhone}
                onChange={(e) => setAddrPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="0812xxxx"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-dark mb-1">Alamat Lengkap</label>
            <textarea
              rows={2}
              required
              value={addrStreet}
              onChange={(e) => setAddrStreet(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="Jalan, Blok, Nomor Rumah/Gedung, RT/RW"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-dark mb-1">Kota / Kabupaten</label>
              <input
                type="text"
                required
                value={addrCity}
                onChange={(e) => setAddrCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Jakarta Selatan"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-dark mb-1">Kecamatan</label>
              <input
                type="text"
                value={addrDistrict}
                onChange={(e) => setAddrDistrict(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Kebayoran Baru"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-dark mb-1">Provinsi</label>
              <input
                type="text"
                value={addrProvince}
                onChange={(e) => setAddrProvince(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="DKI Jakarta"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-dark mb-1">Kode Pos</label>
              <input
                type="text"
                value={addrPostalCode}
                onChange={(e) => setAddrPostalCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="12150"
              />
            </div>
          </div>

          {/* Static Map Coordinate Pin (Level 03 GPS Boundary: static pin coordinate only) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <NavigationArrow size={14} weight="bold" className="text-primary" />
                <span>Titik Koordinat Statis Alamat (Opsional Pin Peta)</span>
              </div>

              <button
                type="button"
                onClick={handleUseGpsInAddressModal}
                disabled={isFetchingModalGps}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-[11px] transition shadow-xs disabled:opacity-50"
                title="Ambil titik koordinat dan wilayah otomatis dari GPS perangkat"
              >
                {isFetchingModalGps ? (
                  <>
                    <CircleNotch size={13} weight="bold" className="animate-spin text-white" />
                    <span>Mengambil GPS...</span>
                  </>
                ) : (
                  <>
                    <Crosshair size={13} weight="bold" className="text-rose-300" />
                    <span>Gunakan GPS (Ambil Wilayah)</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Koordinat statis untuk panduan navigasi kurir dan teknisi Servio ke lokasi alamat tetap.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Latitude</span>
                <input
                  type="number"
                  step="any"
                  value={addrLatitude ?? ""}
                  onChange={(e) => setAddrLatitude(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                  placeholder="-6.2088"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Longitude</span>
                <input
                  type="number"
                  step="any"
                  value={addrLongitude ?? ""}
                  onChange={(e) => setAddrLongitude(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                  placeholder="106.8456"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isDefaultCheckbox"
              checked={addrIsDefault}
              onChange={(e) => setAddrIsDefault(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
            />
            <label htmlFor="isDefaultCheckbox" className="text-xs font-medium text-neutral-dark cursor-pointer">
              Jadikan sebagai alamat utama
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddressModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSavingAddress}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
            >
              {isSavingAddress ? "Menyimpan..." : selectedAddress ? "Perbarui Alamat" : "Simpan Alamat"}
            </button>
          </div>
        </form>
      </Modal>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
