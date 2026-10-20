"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { useActiveRole } from "@/context/RoleContext";
import { organizationApi, registrationApi } from "@/lib/servioApi";
import { Modal } from "@/components/ui/Modal";
import { AddressCascadingForm, AddressData } from "@/components/identity/AddressCascadingForm";
import {
  Buildings,
  Building,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle,
  FileText,
  DownloadSimple,
  ArrowSquareOut,
  Bank,
  Truck,
  Package,
  PencilSimple,
  Copy,
  Plus,
  CircleNotch,
} from "@phosphor-icons/react";

type SupplierTab = "company" | "contact" | "warehouse" | "documents" | "distribution" | "terms";

export default function SupplierProfilePage() {
  const { user, refreshUser } = useActiveRole();
  const [activeTab, setActiveTab] = useState<SupplierTab>("company");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [liveDocuments, setLiveDocuments] = useState<any[]>(user.documents || []);

  // Distributor Info initialized from user.businessProfile with seed fallback
  const [brandName, setBrandName] = useState(
    user.businessProfile?.businessData?.brandName || "Nusantara Parts B2B"
  );
  const [legalName, setLegalName] = useState(
    user.businessProfile?.businessData?.legalName || "PT Nusantara Parts Prima"
  );
  const [registrationNumber, setRegistrationNumber] = useState(
    user.businessProfile?.registrationNumber || "REG-2026-0003"
  );
  const [nib, setNib] = useState(
    user.businessProfile?.businessData?.nib || "9120005544332"
  );
  const [npwp, setNpwp] = useState(
    user.businessProfile?.businessData?.npwp || "03.888.999.2-022.000"
  );
  const [businessType, setBusinessType] = useState(
    user.businessProfile?.businessData?.businessType || "PT / Distributor Resmi"
  );
  const [description, setDescription] = useState(
    "Distributor principal resmi suku cadang HVAC, unit pendingin industri, sparepart komersial berkapasitas besar, dan suplai grosir B2B nasional."
  );

  // Contact & PIC
  const [phone, setPhone] = useState(
    user.businessProfile?.picData?.phone || user.phone || "+6281233344455"
  );
  const [email, setEmail] = useState(
    user.businessProfile?.picData?.email || user.email || "supplier@servio.id"
  );
  const [picName, setPicName] = useState(
    user.businessProfile?.picData?.fullName || user.name || "Suryanto Wijaya"
  );
  const [picNik, setPicNik] = useState(
    user.businessProfile?.picData?.nik || user.nik || "3275010906850002"
  );
  const [picPosition, setPicPosition] = useState(
    user.businessProfile?.picData?.position || "General Manager Sales B2B"
  );

  // Address
  const [address, setAddress] = useState(
    user.businessProfile?.businessData?.address || "Kawasan Industri Pulogadung Blok F No. 8"
  );
  const [district, setDistrict] = useState(
    user.businessProfile?.businessData?.district || "Cakung"
  );
  const [city, setCity] = useState(
    user.businessProfile?.businessData?.city || "Jakarta Timur"
  );
  const [postalCode, setPostalCode] = useState(
    user.businessProfile?.businessData?.postalCode || "13930"
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

  const bizAddressData: AddressData | null = React.useMemo(() => {
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
          district_name: district,
          city_name: city,
          postal_code: postalCode,
          province_name: "DKI Jakarta",
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
          district_name: district,
          city_name: city,
          postal_code: postalCode,
          province_name: "",
        };
      }
    }
    if (typeof raw === "object") return raw as AddressData;
    return null;
  }, [user, address, city, district, postalCode]);

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
        district_name: bizAddressData.district_name || district || "",
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
      setToastMessage("Harap lengkapi setidaknya Provinsi, Kota/Kabupaten, dan Jalan/Nomor Alamat Gudang.");
      return;
    }

    const orgId = user.activeOrganization?.id || user.organizationId;
    if (!orgId) {
      setToastMessage("ID Organisasi Distributor tidak ditemukan.");
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
      if (editingBizAddress.district_name) setDistrict(editingBizAddress.district_name);
      setPostalCode(editingBizAddress.postal_code || "");
      await refreshUser();
      setShowBizAddressModal(false);
      setToastMessage("Alamat hub distributor logistik berhasil diperbarui!");
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToastMessage(error.message || "Gagal memperbarui alamat gudang.");
    } finally {
      setIsSavingBizAddress(false);
    }
  };

  // Distribution & Logistics (Level 02+ features preserved)
  const [warehouseCount, setWarehouseCount] = useState(3);
  const [fleetSize, setFleetSize] = useState(8);
  const [minOrderB2B, setMinOrderB2B] = useState("Rp 5.000.000");
  const [supplyCapacity, setSupplyCapacity] = useState("High Volume Industrial Parts Supply (50.000 unit/bulan)");

  // Terms of Payment & Financial (Level 02+ features preserved)
  const [topTerms, setTopTerms] = useState("TOP 30 Hari (Khusus Mitra Bengkel Tier Verified)");
  const [bankName, setBankName] = useState("Bank Mandiri Commercial");
  const [accountNumber, setAccountNumber] = useState("123-00-9988771-2");
  const [accountHolder, setAccountHolder] = useState("PT Nusantara Parts Prima");

  // Keep state synchronized when user loads asynchronously
  useEffect(() => {
    if (user.businessProfile?.businessData) {
      const b = user.businessProfile.businessData;
      if (b.brandName) setBrandName(b.brandName);
      if (b.legalName) setLegalName(b.legalName);
      if (b.nib) setNib(b.nib);
      if (b.npwp) setNpwp(b.npwp);
      if (b.address) setAddress(b.address);
      if (b.city) setCity(b.city);
      if (b.district) setDistrict(b.district);
      if (b.postalCode) setPostalCode(b.postalCode);
      if (b.businessType) setBusinessType(b.businessType);
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
      if (p.position) setPicPosition(p.position);
    }
    if (user.documents && user.documents.length > 0) {
      setLiveDocuments(user.documents);
    }
  }, [user]);

  // Load latest registered distributor profile & uploaded documents directly from database
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
          if (b.brandName) setBrandName(b.brandName);
          if (b.legalName) setLegalName(b.legalName);
          if (b.nib) setNib(b.nib);
          if (b.npwp) setNpwp(b.npwp);
          if (b.address) setAddress(b.address);
          if (b.city) setCity(b.city);
          if (b.district) setDistrict(b.district);
          if (b.postalCode) setPostalCode(b.postalCode);
          if (b.businessType) setBusinessType(b.businessType);
        }
        if (latest.picData) {
          const p = latest.picData;
          if (p.fullName) setPicName(p.fullName);
          if (p.nik) setPicNik(p.nik);
          if (p.phone) setPhone(p.phone);
          if (p.email) setEmail(p.email);
          if (p.position) setPicPosition(p.position);
        }
        if (latest.registrationNumber) {
          setRegistrationNumber(latest.registrationNumber);
        }
      }
    }).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const orgId = user.activeOrganization?.id || user.organizationId;
      if (orgId) {
        await organizationApi.updateOrganization(orgId, {
          name: brandName,
          brandName,
          legalName,
          description,
          businessType,
          registrationNumber,
        });
      }
      setToastMessage("Profil dan konfigurasi logistik distributor berhasil disimpan.");
      await refreshUser();
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : "Gagal memperbarui profil distributor.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setToastMessage(`${label} berhasil disalin ke clipboard`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="space-y-6 font-body pb-20 max-w-5xl mx-auto text-left">
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

      {/* Header */}
      <PageHeader
        title="Profil &amp; Legalitas Distributor Principal B2B"
        description="Data identitas badan hukum perseroan, sertifikat keagenan resmi, armada distribusi, dan ketentuan kerja sama suplai grosir."
        breadcrumbs={[
          { label: "Dashboard Suplai", href: "/business/supplier/dashboard" },
          { label: "Profil Distributor", href: "/business/supplier/profile" },
        ]}
      />

      {/* Verified Banner */}
      <div className="bg-emerald-50 rounded-3xl border border-emerald-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-emerald-900 shadow-servio-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0F4C81] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Buildings size={28} weight="fill" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-base text-slate-900 font-display">{brandName}</p>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1">
                <CheckCircle size={12} weight="fill" />
                {user.businessProfile?.status || "APPROVED / DISTRIBUTOR RESMI"}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Badan Hukum: <strong className="font-semibold text-slate-800">{legalName}</strong> • Tipe: {businessType}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] bg-white/90 p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">No. Registrasi</span>
            <span className="font-bold text-slate-900">{registrationNumber}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">NIB OSS</span>
            <span className="font-bold text-slate-900">{nib}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">NPWP Badan</span>
            <span className="font-bold text-slate-900">{npwp}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-servio-xs overflow-hidden">
        <div className="flex items-center gap-1 overflow-x-auto p-2 border-b border-slate-100 bg-slate-50/50">
          {[
            { id: "company", label: "Informasi Perusahaan", icon: Buildings },
            { id: "contact", label: "Kontak & PIC B2B", icon: Phone },
            { id: "warehouse", label: "Gudang & Hub Distribusi", icon: MapPin },
            { id: "documents", label: "Dokumen Legalitas & Izin", icon: FileText },
            { id: "distribution", label: "Kapasitas & Armada Logistik", icon: Truck },
            { id: "terms", label: "Ketentuan TOP & Settlement", icon: Bank },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SupplierTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === tab.id
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
          {/* TAB 1: INFORMASI PERUSAHAAN */}
          {activeTab === "company" && (
            <div className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Registrasi Distributor</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      disabled
                      value={registrationNumber}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-700 cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(registrationNumber, "Nomor Registrasi")}
                      className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Verifikasi Legalitas</label>
                  <div className="px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold flex items-center gap-2">
                    <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                    <span>{user.businessProfile?.status || "APPROVED / DISTRIBUTOR RESMI"}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Brand / Divisi Distribusi</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Legal Perseroan Terbatas (PT)</label>
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
                  <label className="block font-bold text-slate-700 mb-1">NPWP Perusahaan</label>
                  <input
                    type="text"
                    value={npwp}
                    onChange={(e) => setNpwp(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Struktur Badan Usaha</label>
                <input
                  type="text"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Ruang Lingkup Suplai</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>
            </div>
          )}

          {/* TAB 2: KONTAK & PIC */}
          {activeTab === "contact" && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Telepon Hotline B2B &amp; Kantor</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Resmi Pengadaan B2B</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama PIC / General Manager</label>
                  <input
                    type="text"
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jabatan PIC</label>
                  <input
                    type="text"
                    value={picPosition}
                    onChange={(e) => setPicPosition(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">NIK PIC Penanggung Jawab</label>
                <input
                  type="text"
                  value={picNik}
                  onChange={(e) => setPicNik(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-semibold"
                />
              </div>
            </div>
          )}

          {/* TAB 3: GUDANG & HUB DISTRIBUSI (CR-04) */}
          {activeTab === "warehouse" && (
            <div className="space-y-5 max-w-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Alamat Usaha &amp; Gudang Logistik Utama</h4>
                  <p className="text-slate-500 text-xs">Lokasi warehouse atau hub suplai B2B untuk penentuan jangkauan distribusi dan pengiriman.</p>
                </div>
                <button
                  id="btn-edit-alamat-usaha-supplier"
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
                      <span>Alamat Gudang Terverifikasi</span>
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
                      {(bizAddressData.district_name || district) && (
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          Kec. {bizAddressData.district_name || district}
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
                      Silakan lengkapi alamat hub logistik utama Anda untuk mempermudah kalkulasi rute distribusi.
                    </p>
                  </div>
                  <button
                    id="btn-lengkapi-alamat-usaha-empty-supplier"
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

          {/* TAB 4: DOKUMEN LEGALITAS & IZIN USAHA DISTRIBUTOR */}
          {activeTab === "documents" && (
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Dokumen Badan Usaha &amp; Surat Keagenan Resmi</h4>
                  <p className="text-slate-500 text-xs">
                    Legalitas distributor B2B yang tercatat di database SERVIO dan telah lolos audit kepatuhan.
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(liveDocuments && liveDocuments.length > 0
                  ? liveDocuments
                  : (user.documents && user.documents.length > 0
                      ? user.documents
                      : [
                    {
                      id: "doc-s1",
                      documentType: "RESPONSIBLE_PERSON_ID",
                      fileName: "ktp_gm_suryanto.pdf",
                      filePath: "/storage/registration/docs/ktp_gm_suryanto.pdf",
                      fileSize: 1024000,
                      status: "APPROVED",
                      version: 1,
                    },
                    {
                      id: "doc-s2",
                      documentType: "BUSINESS_ID",
                      fileName: "nib_distributor_resmi_b2b.pdf",
                      filePath: "/storage/registration/docs/nib_distributor_resmi_b2b.pdf",
                      fileSize: 2500000,
                      status: "APPROVED",
                      version: 1,
                    },
                    {
                      id: "doc-s3",
                      documentType: "BUSINESS_ADDRESS_PROOF",
                      fileName: "foto_gudang_pulogadung.jpg",
                      filePath: "/storage/registration/docs/foto_gudang_pulogadung.jpg",
                      fileSize: 1800000,
                      status: "APPROVED",
                      version: 1,
                    },
                    {
                      id: "doc-s4",
                      documentType: "TAX_DOCUMENT",
                      fileName: "npwp_badan_pt_nusantara.pdf",
                      filePath: "/storage/registration/docs/npwp_badan_pt_nusantara.pdf",
                      fileSize: 512000,
                      status: "APPROVED",
                      version: 1,
                    },
                    {
                      id: "doc-s5",
                      documentType: "LEGAL_DOCUMENT",
                      fileName: "surat_keagenan_distributor_resmi.pdf",
                      filePath: "/storage/registration/docs/surat_keagenan_distributor_resmi.pdf",
                      fileSize: 3200000,
                      status: "APPROVED",
                      version: 1,
                    },
                  ]
                )
                ).map((doc: any) => {
                  const typeLabels: Record<string, string> = {
                    KTP_PIC: "Identitas GM / Penanggung Jawab (KTP)",
                    NPWP_BISNIS: "NPWP Badan Usaha PT",
                    NIB: "Nomor Induk Berusaha (NIB Principal)",
                    FOTO_TOKO: "Foto Gudang & Logistik",
                    FOTO_BENGKEL: "Foto Fasilitas Distributor",
                    AKTA_PERUSAHAAN: "Akta Pendirian PT / Surat Keagenan",
                    RESPONSIBLE_PERSON_ID: "Identitas GM / Penanggung Jawab (KTP)",
                    BUSINESS_ID: "Nomor Induk Berusaha (NIB Principal)",
                    BUSINESS_ADDRESS_PROOF: "Bukti Kepemilikan Gudang Pusat",
                    TAX_DOCUMENT: "NPWP Badan Usaha PT",
                    LEGAL_DOCUMENT: "Surat Keagenan Resmi / Akta Notaris",
                  };
                  const label = typeLabels[doc.documentType || doc.doc_type] || doc.documentType || doc.doc_type || "Dokumen Distributor";
                  const sizeMB = doc.fileSize ? (doc.fileSize / (1024 * 1024)).toFixed(2) + " MB" : "1.8 MB";
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
                          v{doc.version || 1} • Dokumen Resmi
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

          {/* TAB 5: KAPASITAS & ARMADA LOGISTIK (Level 02+ features preserved) */}
          {activeTab === "distribution" && (
            <div className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Jumlah Fasilitas Hub / Gudang</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Buildings size={20} className="text-[#0F4C81]" />
                    <span className="text-xl font-bold font-display text-slate-900">{warehouseCount} Titik</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Armada Pengiriman Kargo</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Truck size={20} className="text-emerald-600" />
                    <span className="text-xl font-bold font-display text-slate-900">{fleetSize} Truk Box</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kapasitas Suplai Bulanan</label>
                <input
                  type="text"
                  value={supplyCapacity}
                  onChange={(e) => setSupplyCapacity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Minimal Order Pembelian Grosir (MOQ)</label>
                <input
                  type="text"
                  value={minOrderB2B}
                  onChange={(e) => setMinOrderB2B(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium font-mono"
                />
              </div>
            </div>
          )}

          {/* TAB 6: KETENTUAN TOP & SETTLEMENT (Level 02+ features preserved) */}
          {activeTab === "terms" && (
            <div className="space-y-4 max-w-xl">
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs space-y-1">
                <p className="font-bold">Ketentuan Kredit B2B (Term of Payment)</p>
                <p className="text-[11px]">
                  Fasilitas pembiayaan tempo (TOP) disediakan bagi mitra bengkel resmi dan merchant yang telah memiliki rekam jejak minimum 3 bulan transaksi.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kebijakan Tempo Pembayaran (TOP)</label>
                <input
                  type="text"
                  value={topTerms}
                  onChange={(e) => setTopTerms(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <p className="font-bold text-slate-800 text-xs">Rekening Bank Penampungan B2B</p>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Nama Bank</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Nomor Rekening Giro / Bisnis</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Atas Nama Rekening</label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button variant="primary" size="md" type="submit" disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan Profil Distributor"}
            </Button>
          </div>
        </form>
      </div>

      {/* CR-04: Modal Edit / Lengkapi Alamat Usaha Supplier */}
      <Modal
        isOpen={showBizAddressModal}
        onClose={() => setShowBizAddressModal(false)}
        title={hasBizAddress ? "Edit Alamat Gudang Logistik" : "Lengkapi Alamat Gudang Logistik"}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveBizAddressModal} className="space-y-5 pt-2">
          <AddressCascadingForm
            value={editingBizAddress}
            onChange={setEditingBizAddress}
            title="Alamat Hub / Gudang Logistik Principal"
            subtitle="Pilih provinsi, kota/kabupaten, kecamatan, dan kelurahan resmi untuk penentuan jangkauan distribusi B2B"
            required={true}
            idPrefix="supplier-edit-addr-modal"
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
              id="btn-save-supplier-biz-address"
              type="submit"
              disabled={isSavingBizAddress}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition flex items-center gap-2 shadow-servio-xs disabled:opacity-60 cursor-pointer"
            >
              {isSavingBizAddress ? (
                <>
                  <CircleNotch size={16} className="animate-spin" />
                  <span>Menyimpan Alamat Gudang...</span>
                </>
              ) : (
                <span>Simpan Alamat Gudang</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
