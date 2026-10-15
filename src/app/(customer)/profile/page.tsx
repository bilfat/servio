"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useActiveRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/feedback/Toast";
import { profileApi, internalAccountApi, ApiAddress } from "@/lib/servioApi";
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
  LockKey,
  WarningCircle,
  Clock,
  FileText,
  Eye,
} from "@phosphor-icons/react";
import { getCurrentGpsPosition, reverseGeocodeLocation } from "@/lib/geoUtils";

export default function CustomerProfilePage() {
  const { user, activeRole, refreshUser } = useActiveRole();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Addresses from Live Database
  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState<boolean>(true);

  // Staff Onboarding Integrated Data (CR-03 Section F)
  const [staffOnboardingData, setStaffOnboardingData] = useState<any>(null);
  const isInternalStaff =
    ["ADMIN_OPERATIONS", "CUSTOMER_SUPPORT", "FINANCE_PAYMENT_OPS", "CEO_PRODUCT_OWNER"].includes(
      activeRole || user.activeRole
    ) || Boolean(user.employeeId);

  useEffect(() => {
    if (isInternalStaff && user.id && user.id !== "guest") {
      internalAccountApi
        .getMyOnboarding()
        .then((res) => {
          if (res.data) setStaffOnboardingData(res.data);
        })
        .catch(() => {});
    }
  }, [isInternalStaff, user.id]);

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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  // Sensitive Business Legal Change Form State (Row 36, P03/P04)
  const [showSensitiveChangeModal, setShowSensitiveChangeModal] = useState(false);
  const [changeFieldType, setChangeFieldType] = useState<"NIB" | "NPWP">("NIB");
  const [changeFieldValue, setChangeFieldValue] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [submittingChangeReq, setSubmittingChangeReq] = useState(false);

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
    if (file.size > 5 * 1024 * 1024) {
      setToastMessage("Ukuran file foto maksimal 5MB.");
      return;
    }
    setAvatarFile(file);
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
      let finalAvatarUrl = avatar;
      if (avatarFile) {
        try {
          const uploadRes = await profileApi.uploadAvatar(avatarFile);
          if (uploadRes.data?.photo_url || uploadRes.data?.avatar_url) {
            finalAvatarUrl = uploadRes.data.photo_url || uploadRes.data.avatar_url || finalAvatarUrl;
          }
        } catch (uploadErr: any) {
          console.warn("Upload avatar error (fallback base64):", uploadErr);
        }
      }

      await profileApi.updateProfile({
        displayName,
        bio,
        gender,
        dateOfBirth: dateOfBirth || null,
        avatar: finalAvatarUrl || undefined,
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

  const handleSubmitSensitiveChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeFieldValue.trim()) {
      setToastMessage("Nilai nomor baru wajib diisi.");
      return;
    }
    if (!changeReason.trim()) {
      setToastMessage("Alasan pengajuan perubahan wajib diisi.");
      return;
    }

    setSubmittingChangeReq(true);
    try {
      const targetId = user.activeOrganization?.id || "org-self";
      const fieldKey = changeFieldType.toLowerCase();
      const res = await profileApi.requestSensitiveChange({
        target_type: "ORGANIZATION",
        target_id: targetId,
        fields: { [fieldKey]: changeFieldValue.trim() },
        reason: changeReason.trim(),
      });
      setToastMessage(
        `Permohonan perubahan ${changeFieldType} berhasil diajukan (ID: ${res.data?.id || "Req"}). Menunggu verifikasi Admin Operations.`
      );
      setShowSensitiveChangeModal(false);
      setChangeFieldValue("");
      setChangeReason("");
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToastMessage(error.message || "Gagal mengajukan perubahan data usaha.");
    } finally {
      setSubmittingChangeReq(false);
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

      {/* Internal Staff Governance Profile Card (CR-03 Section F) */}
      {isInternalStaff && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-servio-md border border-slate-700/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-700/60">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-xl shrink-0">
                <ShieldCheck size={28} weight="fill" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    STAF INTERNAL SERVIO (CR-03)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    NIP: {staffOnboardingData?.employee?.employee_id || user.employeeId || "STF-EMP-01"}
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg text-white mt-1">
                  Kredensial &amp; Tata Kelola Kepegawaian Internal
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${
                  user.status === "ACTIVE"
                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/80"
                    : "bg-rose-950/60 text-rose-400 border-rose-800/80"
                }`}
              >
                AKUN: {user.status || "ACTIVE"}
              </span>
              <span
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${
                  (staffOnboardingData?.readiness === "READY" || user.isOperationalReady || user.readiness === "READY")
                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/80"
                    : "bg-amber-950/60 text-amber-400 border-amber-800/80"
                }`}
              >
                READINESS: {(staffOnboardingData?.readiness === "READY" || user.isOperationalReady || user.readiness === "READY") ? "READY" : "NOT READY"}
              </span>
            </div>
          </div>

          {/* 6 Key Governance Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
            {/* 1. Identitas & Data Pribadi */}
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <User size={13} />
                Identitas &amp; Data Pribadi
              </span>
              <div className="space-y-1 text-slate-300 text-[11px] pt-1">
                <div>Nama Lengkap: <strong className="text-white font-medium">{staffOnboardingData?.profile?.display_name || user.name}</strong></div>
                <div>Nama Legal: <strong className="text-white font-medium">{staffOnboardingData?.profile?.legal_name || user.name}</strong></div>
                <div>Jenis Kelamin: <span className="text-slate-200 font-medium">{staffOnboardingData?.profile?.gender || (user.personalProfile as any)?.gender || "-"}</span></div>
                <div>Tanggal Lahir: <span className="text-slate-200 font-medium">{staffOnboardingData?.profile?.birth_date ? String(staffOnboardingData.profile.birth_date).split("T")[0] : (user.personalProfile as any)?.dateOfBirth ? String((user.personalProfile as any).dateOfBirth).split("T")[0] : "-"}</span></div>
                <div>Email Kantor: <span className="font-mono text-slate-200">{staffOnboardingData?.employee?.email || user.email}</span></div>
                <div>Nomor Kontak: <span className="text-slate-200">{staffOnboardingData?.profile?.phone || user.phone || "-"}</span></div>
              </div>
            </div>

            {/* 2. Data Kepegawaian & Penugasan */}
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <Briefcase size={13} />
                Kepegawaian &amp; Penugasan
              </span>
              <div className="space-y-1 text-slate-300 text-[11px] pt-1">
                <div>Role: <strong className="text-white font-medium">{staffOnboardingData?.employee?.role || activeRole}</strong></div>
                <div>Jabatan: <span className="text-slate-200">{staffOnboardingData?.employee?.role_name || staffOnboardingData?.employee?.position || activeRole}</span></div>
                <div>Departemen: <span className="text-slate-200">{staffOnboardingData?.employee?.department || user.department || "Operasional"}</span></div>
                <div>Penetapan: <span className="text-emerald-400 font-medium">Otoritas CEO &amp; Product Owner</span></div>
              </div>
            </div>

            {/* 3. Pengecekan Berkas */}
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <IdentificationCard size={13} />
                Pengecekan Berkas (NIK &amp; e-KTP)
              </span>
              <div className="space-y-1 text-slate-300 text-[11px] pt-1">
                <div>NIK: <span className="font-mono font-bold text-white tracking-wider">{staffOnboardingData?.berkas?.nik || staffOnboardingData?.berkas?.nik_masked || user.nik || "3171************"}</span></div>
                <div>Status e-KTP: <span className="text-emerald-400 font-semibold">{staffOnboardingData?.berkas?.verification_status || "VERIFIED"}</span></div>
                <div>Dokumen: <span className="text-slate-200">{staffOnboardingData?.berkas?.document_count ?? (user.ktpFilePath ? 1 : 0)} Berkas Terunggah</span></div>
                {(staffOnboardingData?.berkas?.ktp_url || staffOnboardingData?.berkas?.documents?.[0]?.download_url || user.ktpFilePath) ? (
                  <div className="pt-1">
                    <a
                      href={staffOnboardingData?.berkas?.ktp_url || staffOnboardingData?.berkas?.documents?.[0]?.download_url || user.ktpFilePath}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 underline"
                    >
                      <Eye size={12} />
                      <span>Buka Dokumen e-KTP Terunggah</span>
                    </a>
                  </div>
                ) : (
                  <div>Akses: <span className="text-slate-400 italic">Privat (Hanya Staf &amp; CEO)</span></div>
                )}
              </div>
            </div>

            {/* 4. Perjanjian Kerahasiaan (NDA) */}
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <FileText size={13} />
                Perjanjian Kerahasiaan (NDA)
              </span>
              <div className="space-y-1 text-slate-300 text-[11px] pt-1">
                <div>Versi Dokumen: <span className="font-mono text-white font-medium">{staffOnboardingData?.steps?.find((s: any) => s.key === "NDA")?.document_version || "v2026.1"}</span></div>
                <div>Persetujuan: <span className="text-emerald-400 font-semibold">Telah Disetujui &amp; Mengikat</span></div>
                <div>Ketentuan: <span className="text-slate-200">SOP Kerahasiaan Data Platform</span></div>
                <div>Jejak Audit: <span className="text-slate-400 font-mono text-[10px]">TERCATAT RESMI</span></div>
              </div>
            </div>

            {/* 5. Hak Akses & Konfirmasi */}
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <LockKey size={13} />
                Hak Akses &amp; Konfirmasi
              </span>
              <div className="space-y-1 text-slate-300 text-[11px] pt-1">
                <div>Wewenang: <span className="text-white font-medium">{staffOnboardingData?.employee?.role_name || activeRole}</span></div>
                <div>Prinsip: <span className="text-slate-200">Least-Privilege Scoped Access</span></div>
                <div>Status Konfirmasi: <span className="text-emerald-400 font-semibold">Terkonfirmasi</span></div>
                <div>Wewenang Tambahan: <span className="text-slate-400">Tidak dapat dinaikkan sendiri</span></div>
              </div>
            </div>

            {/* 6. Status & Riwayat Onboarding */}
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <Clock size={13} />
                Status &amp; Riwayat Onboarding
              </span>
              <div className="space-y-1 text-slate-300 text-[11px] pt-1">
                <div>Tahapan: <span className="font-bold text-white">{staffOnboardingData?.status || user.staffOnboardingStatus || "COMPLETED"}</span></div>
                <div>Progres Selesai: <span className="font-mono text-emerald-400 font-bold">{staffOnboardingData?.progress ?? 100}%</span></div>
                <div>Keputusan CEO: <span className="text-emerald-400 font-medium">Disetujui Eksekutif</span></div>
                <div>Operasional: <span className="text-white font-semibold">Aktif &amp; Terverifikasi</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Partner Shortcut (If Authorized Business Owner Logged In) */}
      {["SERVICE_PROVIDER", "MERCHANT", "SUPPLIER"].includes(activeRole || user.activeRole) && (
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
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-open-sensitive-change-modal"
              type="button"
              onClick={() => setShowSensitiveChangeModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-sky-300 text-sky-800 font-bold text-xs hover:bg-sky-100 transition shadow-servio-xs cursor-pointer"
            >
              Ajukan Perubahan NIB/NPWP Usaha
            </button>
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

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              id="link-customer-security"
              href="/customer/security"
              className="px-4 py-2 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 font-bold text-xs hover:bg-sky-100 transition flex items-center gap-1.5 shadow-servio-xs"
            >
              <ShieldCheck size={15} weight="bold" className="text-primary" />
              <span>Keamanan &amp; Sesi Perangkat</span>
            </Link>

            <button
              type="button"
              onClick={handleOpenEditProfile}
              className="px-4 py-2 rounded-xl bg-slate-100 text-neutral-dark font-bold text-xs hover:bg-slate-200 transition flex items-center gap-1.5 shadow-servio-xs cursor-pointer"
            >
              <PencilSimple size={15} weight="bold" />
              <span>Edit Profil</span>
            </button>
          </div>
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
              <span className="font-semibold font-mono text-neutral-dark">
                {staffOnboardingData?.berkas?.nik || staffOnboardingData?.berkas?.nik_masked || user.nik || "Belum Terdaftar"}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <CheckCircle size={20} className="text-blue-600" weight="duotone" />
            <div>
              <span className="text-neutral-muted block text-[11px]">Dokumen Identitas KTP</span>
              <span className="font-semibold text-neutral-dark">
                {user.ktpFilePath || staffOnboardingData?.berkas?.ktp_url || (staffOnboardingData?.berkas?.document_count ?? 0) > 0 ? "Sudah Diunggah" : "Terverifikasi Sistem"}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <User size={20} className="text-indigo-600" weight="duotone" />
            <div>
              <span className="text-neutral-muted block text-[11px]">Jenis Kelamin</span>
              <span className="font-semibold text-neutral-dark">
                {staffOnboardingData?.profile?.gender ||
                  (user.personalProfile?.gender === "MALE"
                    ? "Laki-laki"
                    : user.personalProfile?.gender === "FEMALE"
                    ? "Perempuan"
                    : user.personalProfile?.gender || "-")}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <Calendar size={20} className="text-purple-600" weight="duotone" />
            <div>
              <span className="text-neutral-muted block text-[11px]">Tanggal Lahir</span>
              <span className="font-semibold text-neutral-dark">
                {staffOnboardingData?.profile?.birth_date
                  ? String(staffOnboardingData.profile.birth_date).split("T")[0]
                  : user.personalProfile?.dateOfBirth
                  ? String(user.personalProfile.dateOfBirth).split("T")[0]
                  : "-"}
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
          {(user.ktpFilePath || staffOnboardingData?.berkas?.ktp_url || staffOnboardingData?.berkas?.documents?.[0]?.download_url) && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 col-span-full">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-dark uppercase tracking-wider flex items-center gap-1.5">
                  <IdentificationCard size={18} className="text-primary" weight="bold" />
                  Dokumen Resmi e-KTP
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Terverifikasi Sistem
                  </span>
                  {(staffOnboardingData?.berkas?.ktp_url || staffOnboardingData?.berkas?.documents?.[0]?.download_url || user.ktpFilePath) && (
                    <a
                      href={staffOnboardingData?.berkas?.ktp_url || (staffOnboardingData?.berkas?.documents?.[0]?.download_url ? `${staffOnboardingData.berkas.documents[0].download_url}?inline=true` : user.ktpFilePath)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <Eye size={13} />
                      <span>Buka File Asli</span>
                    </a>
                  )}
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-white max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    user.ktpFilePath ||
                    staffOnboardingData?.berkas?.ktp_url ||
                    (staffOnboardingData?.berkas?.documents?.[0]?.download_url
                      ? `${staffOnboardingData.berkas.documents[0].download_url}?inline=true`
                      : "/brand/logo.png")
                  }
                  alt="KTP"
                  className="w-full h-44 object-contain bg-slate-50"
                />
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

      {/* Quick Links to Service Hubs (Khusus Pelanggan / Customer) */}
      {!isInternalStaff && activeRole === "CUSTOMER" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      )}

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

      {/* Sensitive Business Legal Change Modal (Row 36, P03/P04 - Authorized Business Owners Only) */}
      {["SERVICE_PROVIDER", "MERCHANT", "SUPPLIER"].includes(activeRole || user.activeRole) && (
        <Modal
          isOpen={showSensitiveChangeModal}
          onClose={() => setShowSensitiveChangeModal(false)}
          title="Ajukan Perubahan Data Legal Usaha"
          maxWidth="md"
        >
          <form onSubmit={handleSubmitSensitiveChange} className="space-y-4 pt-2" id="form-sensitive-legal-change">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1 text-amber-800">
                <ShieldCheck size={16} weight="fill" />
                Ketentuan Perubahan Dokumen Legal Usaha (CR-02)
              </span>
              <p className="text-[11px] leading-relaxed">
                Hanya nomor legalitas usaha (NIB atau NPWP) yang dapat diajukan perubahannya.
                Data NIK penanggung jawab bersifat <strong>permanen dan terkunci (immutable)</strong>.
                Setiap permohonan akan ditinjau secara manual oleh Admin Operations.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-dark mb-1">
                Jenis Data Legalitas
              </label>
              <select
                id="select-change-field-type"
                value={changeFieldType}
                onChange={(e) => setChangeFieldType(e.target.value as "NIB" | "NPWP")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
              >
                <option value="NIB">Nomor Induk Berusaha (NIB 13 Digit)</option>
                <option value="NPWP">Nomor Pokok Wajib Pajak (NPWP 15-16 Digit)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-dark mb-1">
                Nomor {changeFieldType} Baru
              </label>
              <input
                id="input-change-field-value"
                type="text"
                required
                value={changeFieldValue}
                onChange={(e) => setChangeFieldValue(e.target.value)}
                placeholder={`Masukkan nomor ${changeFieldType} baru yang sah`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-dark mb-1">
                Alasan Pengajuan Perubahan Dokumen
              </label>
              <textarea
                id="textarea-change-reason"
                rows={3}
                required
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Contoh: Pembaruan izin berusaha OSS RBA tahun 2026 atau migrasi format NPWP 16 digit."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSensitiveChangeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                id="btn-submit-sensitive-change"
                type="submit"
                disabled={submittingChangeReq}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {submittingChangeReq ? (
                  <>
                    <CircleNotch size={14} className="animate-spin" />
                    <span>Mengirim Permohonan...</span>
                  </>
                ) : (
                  <span>Ajukan ke Admin Operations</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

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
