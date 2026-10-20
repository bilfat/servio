"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useActiveRole } from "@/context/RoleContext";
import { organizationApi, registrationApi } from "@/lib/servioApi";
import { Modal } from "@/components/ui/Modal";
import { AddressCascadingForm, AddressData } from "@/components/identity/AddressCascadingForm";
import {
  Building,
  Phone,
  MapPin,
  Clock,
  Compass,
  Bell,
  ShieldCheck,
  CheckCircle,
  Certificate,
  Wrench,
  ArrowRight,
  FileText,
  DownloadSimple,
  ArrowSquareOut,
  Copy,
  PencilSimple,
  Plus,
  CircleNotch,
} from "@phosphor-icons/react";

type ProfileTab = "business" | "contact" | "address" | "hours" | "area" | "competency" | "documents" | "notifications";

export default function ProviderProfilePage() {
  const repo = useDomainRepository();
  const { user, refreshUser } = useActiveRole();
  const currentProviderId = user.id || "usr-prov-001";
  const [activeTab, setActiveTab] = useState<ProfileTab>("business");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [liveDocuments, setLiveDocuments] = useState<any[]>(user.documents || []);

  // Business Info initialized from live user.businessProfile with safe fallback
  const [providerName, setProviderName] = useState(
    user.businessProfile?.businessData?.brandName ||
    user.businessProfile?.businessData?.legalName ||
    user.organizationName ||
    "PT Servio Mandiri Teknik"
  );
  const [legalName, setLegalName] = useState(
    user.businessProfile?.businessData?.legalName || "PT Servio Mandiri Teknik"
  );
  const [registrationNumber, setRegistrationNumber] = useState(
    user.businessProfile?.registrationNumber || "REG-2026-0001"
  );
  const [nib, setNib] = useState(
    user.businessProfile?.businessData?.nib || "9120001234567"
  );
  const [npwp, setNpwp] = useState(
    user.businessProfile?.businessData?.npwp || "01.123.456.7-012.000"
  );
  const [businessType, setBusinessType] = useState(
    user.businessProfile?.businessData?.businessType || "WORKSHOP"
  );
  const [description, setDescription] = useState(
    (user.businessProfile?.specializedData?.workshopType as string) ||
    "Mitra bengkel resmi spesialis HVAC, perbaikan pendingin udara split, inverter, dan instalasi mekanikal komersial."
  );

  // Contact
  const [phone, setPhone] = useState(
    user.businessProfile?.picData?.phone || user.phone || "0812-9988-7711"
  );
  const [email, setEmail] = useState(
    user.businessProfile?.picData?.email || user.email || "provider@servio.id"
  );
  const [picName, setPicName] = useState(
    user.businessProfile?.picData?.fullName || user.name || "Budi Santoso"
  );
  const [picNik, setPicNik] = useState(
    user.businessProfile?.picData?.nik || user.nik || "3171012345670001"
  );

  // Address
  const [address, setAddress] = useState(
    user.businessProfile?.businessData?.address || "Jl. Kebon Jeruk Raya No. 88, Kebon Jeruk"
  );
  const [city, setCity] = useState(
    user.businessProfile?.businessData?.city || "Jakarta Barat"
  );
  const [postalCode, setPostalCode] = useState(
    user.businessProfile?.businessData?.postalCode || "11530"
  );

  // CR-04: Business Address Modal & Structured Data
  const [showBizAddressModal, setShowBizAddressModal] = useState(false);
  const [isSavingBizAddress, setIsSavingBizAddress] = useState(false);
  const [editingBizAddress, setEditingBizAddress] = useState<AddressData>({
    province_id: "",
    province_name: "",
    city_id: "",
    city_name: "",
    district_id: "",
    district_name: "",
    village_id: "",
    village_name: "",
    postal_code: "",
    street_address: "",
    rt_rw: "",
    landmark: "",
  });

  const bizAddressData: AddressData | null = useMemo(() => {
    const raw = (user.activeOrganization as any)?.address_json ||
                (user.activeOrganization?.profile as any)?.address_json ||
                (user.activeOrganization as any)?.address ||
                (user.activeOrganization?.profile as any)?.address ||
                user.businessProfile?.businessData?.address_json ||
                user.businessProfile?.businessData?.addressData;
    if (!raw) {
      if (address) {
        return {
          street_address: address,
          city_name: city,
          postal_code: postalCode,
          province_name: "DKI Jakarta",
          district_name: "",
        };
      }
      return null;
    }
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) return parsed;
      } catch {
        return {
          street_address: raw,
          city_name: city,
          postal_code: postalCode,
          province_name: "",
          district_name: "",
        };
      }
    }
    if (typeof raw === "object") return raw as AddressData;
    return null;
  }, [user, address, city, postalCode]);

  const hasBizAddress = Boolean(
    bizAddressData &&
    (bizAddressData.street_address || bizAddressData.province_name || bizAddressData.city_name)
  );

  const handleOpenEditBizAddress = () => {
    if (bizAddressData) {
      setEditingBizAddress({
        province_id: bizAddressData.province_id || "",
        province_name: bizAddressData.province_name || "",
        city_id: bizAddressData.city_id || "",
        city_name: bizAddressData.city_name || city || "",
        district_id: bizAddressData.district_id || "",
        district_name: bizAddressData.district_name || "",
        village_id: bizAddressData.village_id || "",
        village_name: bizAddressData.village_name || "",
        postal_code: bizAddressData.postal_code || postalCode || "",
        street_address: bizAddressData.street_address || address || "",
        rt_rw: bizAddressData.rt_rw || "",
        landmark: bizAddressData.landmark || "",
      });
    } else {
      setEditingBizAddress({
        province_id: "",
        province_name: "",
        city_id: "",
        city_name: "",
        district_id: "",
        district_name: "",
        village_id: "",
        village_name: "",
        postal_code: "",
        street_address: "",
        rt_rw: "",
        landmark: "",
      });
    }
    setShowBizAddressModal(true);
  };

  const handleSaveBizAddressModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBizAddress.province_name || !editingBizAddress.city_name || !editingBizAddress.street_address) {
      setToastMessage("Harap lengkapi setidaknya Provinsi, Kota/Kabupaten, dan Jalan/Nomor Alamat.");
      return;
    }

    const orgId = user.activeOrganization?.id || user.organizationId;
    if (!orgId) {
      setToastMessage("ID Organisasi tidak ditemukan.");
      return;
    }

    setIsSavingBizAddress(true);
    try {
      const fullStreet = [
        editingBizAddress.street_address,
        editingBizAddress.rt_rw ? `RT/RW ${editingBizAddress.rt_rw}` : null,
        editingBizAddress.village_name ? `Kel. ${editingBizAddress.village_name}` : null,
        editingBizAddress.district_name ? `Kec. ${editingBizAddress.district_name}` : null,
        editingBizAddress.city_name,
        editingBizAddress.province_name,
        editingBizAddress.postal_code,
      ].filter(Boolean).join(", ");

      await organizationApi.updateOrganization(orgId, {
        address: {
          address: fullStreet,
          street_address: editingBizAddress.street_address,
          city: editingBizAddress.city_name,
          province: editingBizAddress.province_name,
          district: editingBizAddress.district_name,
          village: editingBizAddress.village_name,
          postalCode: editingBizAddress.postal_code,
          postal_code: editingBizAddress.postal_code,
          address_json: editingBizAddress,
          addressData: editingBizAddress,
        },
      });

      setAddress(editingBizAddress.street_address || "");
      setCity(editingBizAddress.city_name || "");
      setPostalCode(editingBizAddress.postal_code || "");
      await refreshUser();
      setShowBizAddressModal(false);
      setToastMessage("Alamat usaha workshop berhasil diperbarui!");
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToastMessage(error.message || "Gagal memperbarui alamat usaha.");
    } finally {
      setIsSavingBizAddress(false);
    }
  };

  // Sync state if user.businessProfile loads/updates asynchronously
  useEffect(() => {
    if (user.businessProfile?.businessData) {
      const b = user.businessProfile.businessData;
      if (b.brandName || b.legalName) setProviderName(b.brandName || b.legalName || "");
      if (b.legalName) setLegalName(b.legalName);
      if (b.nib) setNib(b.nib);
      if (b.npwp) setNpwp(b.npwp);
      if (b.businessType) setBusinessType(b.businessType);
      if (b.address) setAddress(b.address);
      if (b.city) setCity(b.city);
      if (b.postalCode) setPostalCode(b.postalCode);
    }
    if (user.businessProfile?.registrationNumber) {
      setRegistrationNumber(user.businessProfile.registrationNumber);
    }
    if (user.businessProfile?.picData) {
      const p = user.businessProfile.picData;
      if (p.fullName) setPicName(p.fullName);
      if (p.nik) setPicNik(p.nik);
      if (p.phone) setPhone(p.phone);
      if (p.email) setEmail(p.email);
    }
    if (user.documents && user.documents.length > 0) {
      setLiveDocuments(user.documents);
    }
    const opHours = user.activeOrganization?.operational_hours || (user.businessProfile as any)?.operationalHours || (user.businessProfile as any)?.operational_hours;
    if (opHours) {
      if (opHours.open_time || opHours.openTime) setOpenTime(opHours.open_time || opHours.openTime);
      if (opHours.close_time || opHours.closeTime) setCloseTime(opHours.close_time || opHours.closeTime);
      if (opHours.work_days || opHours.workDays) setWorkDays(opHours.work_days || opHours.workDays);
    }
    const servArea = user.activeOrganization?.service_area || (user.businessProfile as any)?.serviceArea || (user.businessProfile as any)?.service_area;
    if (servArea) {
      if (servArea.areas) setServiceAreas(servArea.areas);
      if (servArea.radius_km || servArea.radiusKm) setCoverageRadiusKm(Number(servArea.radius_km || servArea.radiusKm));
    }
  }, [user]);

  // Load latest registered company profile & uploaded documents from database
  useEffect(() => {
    registrationApi.myApplications().then((res: any) => {
      const items = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      if (items.length > 0) {
        const latest = items[0];
        if (latest.documents && latest.documents.length > 0) {
          setLiveDocuments(latest.documents);
        }
        if (latest.businessData) {
          const b = latest.businessData;
          if (b.brandName || b.legalName) setProviderName(b.brandName || b.legalName || "");
          if (b.legalName) setLegalName(b.legalName);
          if (b.nib) setNib(b.nib);
          if (b.npwp) setNpwp(b.npwp);
          if (b.businessType) setBusinessType(b.businessType);
          if (b.address) setAddress(b.address);
          if (b.city) setCity(b.city);
          if (b.postalCode) setPostalCode(b.postalCode);
        }
        if (latest.picData) {
          const p = latest.picData;
          if (p.fullName) setPicName(p.fullName);
          if (p.nik) setPicNik(p.nik);
          if (p.phone) setPhone(p.phone);
          if (p.email) setEmail(p.email);
        }
        if (latest.registrationNumber) {
          setRegistrationNumber(latest.registrationNumber);
        }
      }
    }).catch(() => {});
  }, []);

  // Hours
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [workDays, setWorkDays] = useState("Senin - Sabtu");

  // Area Layanan & Radius (Locked Decision Section 18, 30, 32)
  const [serviceAreas, setServiceAreas] = useState("Jakarta Barat, Jakarta Selatan, Tangerang Kota");
  const [coverageRadiusKm, setCoverageRadiusKm] = useState(25);

  // Notifications
  const [orderNotifSms, setOrderNotifSms] = useState(true);
  const [orderNotifWa, setOrderNotifWa] = useState(true);

  // Provider's own services (strictly scoped to this provider session)
  const myServices = useMemo(() => {
    return repo.providerMasterServices.filter((s) => {
      if (s.providerId === currentProviderId) return true;
      if (user.id && s.providerId === user.id) return true;
      if (user.organizationId && s.providerId === user.organizationId) return true;
      if (
        (user.organizationName === "PT Servio Mandiri Teknik" || user.name?.includes("Servio Mandiri")) &&
        (s.providerId === "usr-prov-001" || s.providerId === "org-prov-101" || s.providerId === "prov-01")
      ) {
        return true;
      }
      return false;
    });
  }, [repo.providerMasterServices, currentProviderId, user.id, user.organizationId, user.organizationName, user.name]);

  // Hierarchical Kompetensi Layanan (Category -> Subcategory -> Master Services)
  const providerCompetencies = useMemo(() => {
    const active = myServices.filter((s) => s.status === "ACTIVE");
    const catMap = new Map<
      string,
      {
        category: { id: string; name: string };
        subcategories: Map<
          string,
          {
            subcategory: { id: string; name: string };
            services: typeof active;
          }
        >;
      }
    >();

    active.forEach((service) => {
      const cat = repo.categories.find((c) => c.id === service.categoryId);
      const catId = service.categoryId;
      const catName = cat?.name || service.categoryName || "Kategori Lain";

      const sub = repo.subcategories.find((s) => s.id === service.subcategoryId);
      const subId = service.subcategoryId;
      const subName = sub?.name || service.subcategoryName || "Subkategori Lain";

      if (!catMap.has(catId)) {
        catMap.set(catId, {
          category: { id: catId, name: catName },
          subcategories: new Map(),
        });
      }

      const catEntry = catMap.get(catId)!;
      if (!catEntry.subcategories.has(subId)) {
        catEntry.subcategories.set(subId, {
          subcategory: { id: subId, name: subName },
          services: [],
        });
      }

      catEntry.subcategories.get(subId)!.services.push(service);
    });

    return Array.from(catMap.values()).map((c) => ({
      category: c.category,
      subcategories: Array.from(c.subcategories.values()),
    }));
  }, [myServices, repo.categories, repo.subcategories]);

  const totalCategoriesCount = providerCompetencies.length;
  const totalSubcategoriesCount = useMemo(() => {
    return providerCompetencies.reduce((acc, c) => acc + c.subcategories.length, 0);
  }, [providerCompetencies]);
  const totalServicesCount = useMemo(() => {
    return myServices.filter((s) => s.status === "ACTIVE").length;
  }, [myServices]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const orgId = user.activeOrganization?.id || user.organizationId;
      if (orgId) {
        await organizationApi.updateOrganization(orgId, {
          name: providerName,
          brandName: providerName,
          legalName,
          description,
          businessType,
          registrationNumber,
          address: {
            address,
            city,
            postalCode,
          },
          operationalHours: {
            work_days: workDays,
            open_time: openTime,
            close_time: closeTime,
          },
          serviceArea: {
            areas: serviceAreas,
            radius_km: coverageRadiusKm,
          },
        });
      }
      setToastMessage("Profil dan konfigurasi operasional bengkel berhasil disimpan ke database.");
      await refreshUser();
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : "Gagal menyimpan profil organisasi.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 font-body pb-20">
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

      {/* Header */}
      <PageHeader
        title="Profil &amp; Konfigurasi Operasional Mitra"
        description="Satu sumber kebenaran data profil bisnis, kontak, alamat workshop, jam operasional, area layanan, dan radius coverage."
        breadcrumbs={[
          { label: "Mitra Bengkel", href: "/provider/dashboard" },
          { label: "Pengaturan Profil", href: "/provider/profile" },
        ]}
      />

      {/* Verified Banner */}
      <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-emerald-900">
        <div className="flex items-center gap-3">
          <ShieldCheck size={32} weight="fill" className="text-emerald-600 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm">Mitra Terverifikasi Servio Enterprise</p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                {user.businessProfile?.status || "APPROVED"}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              NIB, NPWP Usaha, dan Sertifikasi Keahlian Teknisi aktif dan terdata di pusat database Servio.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] bg-white/80 p-2.5 rounded-xl border border-emerald-200/80">
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">No. Registrasi</span>
            <span className="font-bold text-emerald-900">{registrationNumber}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">NIB OSS</span>
            <span className="font-bold text-emerald-900">{nib}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">NPWP</span>
            <span className="font-bold text-emerald-900">{npwp}</span>
          </div>
        </div>
      </div>

      {/* Profile Internal Tabs (Locked Decision Section 19 & 30) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center gap-1 overflow-x-auto p-2 border-b border-slate-100 bg-slate-50/50">
          {[
            { id: "business", label: "Informasi Bisnis", icon: Building },
            { id: "contact", label: "Kontak", icon: Phone },
            { id: "address", label: "Alamat Workshop", icon: MapPin },
            { id: "documents", label: "Dokumen & Legalitas", icon: FileText },
            { id: "hours", label: "Jam Operasional", icon: Clock },
            { id: "area", label: "Area Layanan & Radius", icon: Compass },
            { id: "competency", label: "Kompetensi Layanan", icon: Certificate },
            { id: "notifications", label: "Notifikasi", icon: Bell },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ProfileTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[#0F4C81] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
              >
                <Icon size={16} weight={activeTab === tab.id ? "fill" : "bold"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6 text-xs">
          {/* TAB 1: INFORMASI BISNIS */}
          {activeTab === "business" && (
            <div className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Registrasi Sistem</label>
                  <input
                    type="text"
                    disabled
                    value={registrationNumber}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Kemitraan</label>
                  <div className="px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold flex items-center gap-2">
                    <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                    <span>{user.businessProfile?.status || "APPROVED / TERVERIFIKASI"}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Brand / Merk Komersial</label>
                <input
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Legal Badan Usaha (PT / CV / UD)</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Induk Berusaha (NIB)</label>
                  <input
                    type="text"
                    value={nib}
                    onChange={(e) => setNib(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NPWP Badan Usaha</label>
                  <input
                    type="text"
                    value={npwp}
                    onChange={(e) => setNpwp(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipe Bisnis</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                >
                  <option value="WORKSHOP">Workshop / Bengkel Resmi</option>
                  <option value="INDIVIDUAL">Teknisi Mandiri / Individual</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi &amp; Pengalaman Usaha</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>
            </div>
          )}

          {/* TAB 2: KONTAK */}
          {activeTab === "contact" && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor WhatsApp Operasional Bengkel</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Korespondensi</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Penanggung Jawab / PIC</label>
                  <input
                    type="text"
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIK Penanggung Jawab</label>
                  <input
                    type="text"
                    value={picNik}
                    onChange={(e) => setPicNik(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ALAMAT WORKSHOP (CR-04) */}
          {activeTab === "address" && (
            <div className="space-y-5 max-w-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Alamat Usaha &amp; Workshop Bengkel</h4>
                  <p className="text-slate-500 text-xs">Lokasi operasional untuk penentuan radius penugasan teknisi dan penjemputan unit.</p>
                </div>
                <button
                  id="btn-edit-alamat-usaha-provider"
                  type="button"
                  onClick={handleOpenEditBizAddress}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition flex items-center gap-1.5 shadow-servio-xs cursor-pointer"
                >
                  <PencilSimple size={14} weight="bold" />
                  <span>{hasBizAddress ? "Edit Alamat Usaha" : "Lengkapi Alamat Usaha"}</span>
                </button>
              </div>

              {hasBizAddress && bizAddressData ? (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/30 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <MapPin size={18} className="text-primary" weight="fill" />
                      <span>Alamat Usaha Terverifikasi</span>
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={12} weight="fill" />
                      Aktif di Sistem
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                      {bizAddressData.street_address || address || "-"}
                    </p>
                    <div className="text-slate-600 leading-relaxed flex flex-wrap gap-x-2 gap-y-1">
                      {bizAddressData.rt_rw && (
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          RT/RW: {bizAddressData.rt_rw}
                        </span>
                      )}
                      {bizAddressData.village_name && (
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          Kel. {bizAddressData.village_name}
                        </span>
                      )}
                      {bizAddressData.district_name && (
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          Kec. {bizAddressData.district_name}
                        </span>
                      )}
                      {(bizAddressData.city_name || city) && (
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          {bizAddressData.city_name || city}
                        </span>
                      )}
                      {bizAddressData.province_name && (
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          {bizAddressData.province_name}
                        </span>
                      )}
                      {(bizAddressData.postal_code || postalCode) && (
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          Kode Pos: {bizAddressData.postal_code || postalCode}
                        </span>
                      )}
                    </div>
                    {bizAddressData.landmark && (
                      <p className="text-slate-500 text-xs italic pt-1">
                        <span className="font-semibold not-italic text-slate-700">Patokan / Landmark:</span> {bizAddressData.landmark}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-3 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 p-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <MapPin size={24} weight="duotone" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Alamat usaha belum dilengkapi</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                      Silakan lengkapi alamat usaha workshop Anda melalui form wilayah resmi untuk keperluan penugasan pesanan.
                    </p>
                  </div>
                  <button
                    id="btn-lengkapi-alamat-usaha-empty-provider"
                    type="button"
                    onClick={handleOpenEditBizAddress}
                    className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark transition shadow-servio-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={15} weight="bold" />
                    <span>Lengkapi Alamat Usaha</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB DOKUMEN & LEGALITAS MITRA */}
          {activeTab === "documents" && (
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Dokumen Legalitas &amp; Sertifikasi Workshop</h4>
                  <p className="text-slate-500 text-xs">Seluruh dokumen yang telah diverifikasi dan diapprove oleh tim Platform Operations Servio.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setToastMessage("Form pembaruan dokumen akan segera dibuka.")}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0c3c66] transition shadow-xs"
                >
                  + Unggah Dokumen Baru
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(liveDocuments && liveDocuments.length > 0
                  ? liveDocuments
                  : (user.documents && user.documents.length > 0
                      ? user.documents
                      : [
                          {
                            id: "doc-1",
                            documentType: "RESPONSIBLE_PERSON_ID",
                            fileName: "ktp_budi_santoso.pdf",
                            filePath: "/storage/registration/docs/ktp_budi_santoso.pdf",
                            fileSize: 1024000,
                            status: "APPROVED",
                            version: 1,
                          },
                          {
                            id: "doc-2",
                            documentType: "BUSINESS_ID",
                            fileName: "nib_oss_pt_servio_mandiri.pdf",
                            filePath: "/storage/registration/docs/nib_oss_pt_servio_mandiri.pdf",
                            fileSize: 2048000,
                            status: "APPROVED",
                            version: 1,
                          },
                          {
                            id: "doc-3",
                            documentType: "BUSINESS_ADDRESS_PROOF",
                            fileName: "foto_plang_workshop_kebon_jeruk.jpg",
                            filePath: "/storage/registration/docs/foto_plang_workshop_kebon_jeruk.jpg",
                            fileSize: 1536000,
                            status: "APPROVED",
                            version: 1,
                          },
                          {
                            id: "doc-4",
                            documentType: "LEGAL_DOCUMENT",
                            fileName: "akta_notaris_pendirian_pt.pdf",
                            filePath: "/storage/registration/docs/akta_notaris_pendirian_pt.pdf",
                            fileSize: 3072000,
                            status: "APPROVED",
                            version: 1,
                          },
                          {
                            id: "doc-5",
                            documentType: "TAX_DOCUMENT",
                            fileName: "npwp_badan_pt_servio_mandiri.pdf",
                            filePath: "/storage/registration/docs/npwp_badan_pt_servio_mandiri.pdf",
                            fileSize: 512000,
                            status: "APPROVED",
                            version: 1,
                          },
                        ]
                    )
                ).map((doc: any) => {
                  const typeLabels: Record<string, string> = {
                    KTP_PIC: "KTP Penanggung Jawab (PIC)",
                    NPWP_BISNIS: "NPWP Badan / Usaha",
                    NIB: "Nomor Induk Berusaha (NIB)",
                    FOTO_BENGKEL: "Foto Fisik Bengkel / Workshop",
                    FOTO_TOKO: "Foto Fisik Toko / Gudang",
                    AKTA_PERUSAHAAN: "Akta Pendirian / SK Kemenkumham",
                    RESPONSIBLE_PERSON_ID: "Identitas Penanggung Jawab (KTP)",
                    BUSINESS_ID: "Nomor Induk Berusaha (NIB)",
                    BUSINESS_ADDRESS_PROOF: "Bukti Alamat Usaha / Workshop",
                    LEGAL_DOCUMENT: "Legalitas Usaha / Akta Pendirian",
                    TAX_DOCUMENT: "NPWP Badan Usaha",
                    TECHNICAL_CERTIFICATION: "Sertifikasi Kompetensi BNSP",
                  };
                  const label = typeLabels[doc.documentType || doc.doc_type] || doc.documentType || doc.doc_type || "Dokumen Legalitas";
                  const sizeMB = doc.fileSize ? (doc.fileSize / (1024 * 1024)).toFixed(2) + " MB" : "1.2 MB";
                  const downloadUrl = doc.filePath || doc.file_path || (doc.id ? `/api/v1/registration-applications/${registrationNumber}/documents/${doc.id}/download` : "#");

                  return (
                    <div
                      key={doc.id || doc.fileName}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0F4C81] flex items-center justify-center shrink-0">
                            <FileText size={22} weight="duotone" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                              {label}
                            </span>
                            <p className="font-bold text-slate-900 text-xs truncate max-w-[190px]">
                              {doc.fileName || label}
                            </p>
                            <span className="text-[11px] text-slate-400 font-mono">{sizeMB}</span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                          doc.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : doc.status === "REPLACEMENT_REQUIRED"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          <CheckCircle size={12} weight="fill" />
                          {doc.status || "APPROVED"}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500 font-mono">
                          Ver: v{doc.version || 1} • Dokumen Resmi
                        </span>
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#0F4C81] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowSquareOut size={14} weight="bold" />
                          <span>Buka Dokumen</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: JAM OPERASIONAL */}
          {activeTab === "hours" && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hari Kerja</label>
                <input
                  type="text"
                  value={workDays}
                  onChange={(e) => setWorkDays(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Buka</label>
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Tutup</label>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AREA LAYANAN & RADIUS (LOCKED DECISION SECTION 18 & 32) */}
          {activeTab === "area" && (
            <div className="space-y-4 max-w-xl">
              <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-200 text-sky-900 text-xs">
                <p className="font-bold">Ketentuan Radius &amp; Cakupan Wilayah:</p>
                <p className="text-[11px] mt-0.5">
                  Radius coverage diatur di sini sebagai satu sumber data tunggal. Setiap layanan yang Anda buat akan otomatis mewarisi jangkauan radius ini tanpa perlu diinput ulang.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Wilayah / Kecamatan Utama</label>
                <input
                  type="text"
                  value={serviceAreas}
                  onChange={(e) => setServiceAreas(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Radius Operasional Teknisi: <span className="text-[#0F4C81]">{coverageRadiusKm} km</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={coverageRadiusKm}
                  onChange={(e) => setCoverageRadiusKm(Number(e.target.value))}
                  className="w-full accent-[#0F4C81]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                  <span>5 km (Lokal)</span>
                  <span>25 km (Standar)</span>
                  <span>50 km (Maksimal)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: KOMPETENSI LAYANAN */}
          {activeTab === "competency" && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-sky-50 text-[#0F4C81] border border-sky-200">
                    <Certificate size={20} weight="duotone" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-display">
                      KOMPETENSI LAYANAN
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cakupan spesialisasi dan layanan terverifikasi yang dikuasai bengkel Anda. Diturunkan langsung dari katalog Provider Master Service aktif.
                    </p>
                  </div>
                </div>

                {/* Summary Metrics Banner */}
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-sky-50/80 to-slate-50 border border-sky-200/80 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-xl bg-white text-slate-800 font-black text-xs border border-slate-200 shadow-2xs">
                      {totalCategoriesCount} Kategori
                    </div>
                    <span className="text-slate-300">•</span>
                    <div className="px-3 py-1.5 rounded-xl bg-white text-[#0F4C81] font-black text-xs border border-sky-200 shadow-2xs">
                      {totalSubcategoriesCount} Subkategori
                    </div>
                    <span className="text-slate-300">•</span>
                    <div className="px-3 py-1.5 rounded-xl bg-white text-emerald-800 font-black text-xs border border-emerald-200 shadow-2xs">
                      {totalServicesCount} Layanan Dikuasai
                    </div>
                  </div>

                  <Link
                    href="/provider/services"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0c3c66] transition shadow-xs"
                  >
                    <span>Kelola di Katalog</span>
                    <ArrowRight size={13} weight="bold" />
                  </Link>
                </div>
              </div>

              {/* Hierarchy Tree */}
              <div className="space-y-4">
                {providerCompetencies.map((comp) => (
                  <div
                    key={comp.category.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4"
                  >
                    {/* Category Level */}
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                      <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                        <Wrench size={16} weight="duotone" />
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm font-display">
                        {comp.category.name}
                      </h4>
                      <span className="ml-auto text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                        {comp.subcategories.length} Subkategori
                      </span>
                    </div>

                    {/* Subcategories Level */}
                    <div className="space-y-3.5 pl-3 border-l-2 border-sky-200 ml-3">
                      {comp.subcategories.map((sub) => (
                        <div key={sub.subcategory.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0F4C81]" />
                            <h5 className="font-bold text-slate-800 text-xs">
                              {sub.subcategory.name}
                            </h5>
                            <span className="text-[10px] font-medium text-slate-400">
                              ({sub.services.length} layanan)
                            </span>
                          </div>

                          {/* Master Services Level */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                            {sub.services.map((srv) => (
                              <div
                                key={srv.id}
                                className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="font-bold text-slate-800">{srv.name}</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Dikuasai
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: NOTIFIKASI */}
          {activeTab === "notifications" && (
            <div className="space-y-3 max-w-xl">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={orderNotifWa}
                  onChange={(e) => setOrderNotifWa(e.target.checked)}
                  className="rounded text-[#0F4C81]"
                />
                <div>
                  <p className="font-bold text-slate-900">Notifikasi Pesanan WhatsApp</p>
                  <p className="text-[11px] text-slate-500">Kirim pemberitahuan instan saat ada reservasi masuk.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={orderNotifSms}
                  onChange={(e) => setOrderNotifSms(e.target.checked)}
                  className="rounded text-[#0F4C81]"
                />
                <div>
                  <p className="font-bold text-slate-900">Notifikasi SMS Darurat</p>
                  <p className="text-[11px] text-slate-500">Pemberitahuan cadangan untuk layanan darurat.</p>
                </div>
              </label>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button variant="primary" size="md" type="submit">
              Simpan Perubahan Profil
            </Button>
          </div>
        </form>
      </div>

      {/* CR-04: Modal Edit / Lengkapi Alamat Usaha Provider */}
      <Modal
        isOpen={showBizAddressModal}
        onClose={() => setShowBizAddressModal(false)}
        title={hasBizAddress ? "Edit Alamat Usaha Workshop" : "Lengkapi Alamat Usaha Workshop"}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveBizAddressModal} className="space-y-5 pt-2">
          <AddressCascadingForm
            value={editingBizAddress}
            onChange={setEditingBizAddress}
            title="Alamat Lokasi Workshop / Bengkel"
            subtitle="Pilih provinsi, kota/kabupaten, kecamatan, dan kelurahan resmi untuk penentuan zona servis"
            required={true}
            idPrefix="provider-edit-addr-modal"
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowBizAddressModal(false)}
              disabled={isSavingBizAddress}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-neutral-dark hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-save-provider-biz-address"
              type="submit"
              disabled={isSavingBizAddress}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition flex items-center gap-2 shadow-servio-xs disabled:opacity-60 cursor-pointer"
            >
              {isSavingBizAddress ? (
                <>
                  <CircleNotch size={16} className="animate-spin" />
                  <span>Menyimpan Alamat Usaha...</span>
                </>
              ) : (
                <span>Simpan Alamat Usaha</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
