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
  Storefront,
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
  Package,
  PencilSimple,
  Copy,
  Plus,
  CircleNotch,
} from "@phosphor-icons/react";

type MerchantTab = "store" | "contact" | "address" | "documents" | "operations" | "settlement";

const TIME_OPTIONS_24H = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

function normalizeTo24H(val?: string | null, fallback = "09:00"): string {
  if (!val) return fallback;
  const t = String(val).trim().toUpperCase();
  const ampm = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2];
    if (ampm[3] === "PM" && h < 12) h += 12;
    if (ampm[3] === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  const hms = t.match(/^(\d{1,2}):(\d{2})/);
  if (hms) {
    return `${String(parseInt(hms[1], 10)).padStart(2, "0")}:${hms[2]}`;
  }
  return fallback;
}

export default function MerchantProfilePage() {
  const { user, refreshUser } = useActiveRole();
  const [activeTab, setActiveTab] = useState<MerchantTab>("store");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [liveDocuments, setLiveDocuments] = useState<any[]>(user.documents || []);

  // Store Information initialized from user.activeOrganization / user.businessProfile with fallback
  const [brandName, setBrandName] = useState(
    user.activeOrganization?.name || (user.activeOrganization as any)?.brandName || user.businessProfile?.businessData?.brandName || "Sinar AC & Sparepart Glodok"
  );
  const [legalName, setLegalName] = useState(
    (user.activeOrganization as any)?.legalName || (user.activeOrganization as any)?.legal_name || user.businessProfile?.businessData?.legalName || "Toko Sinar AC Glodok"
  );
  const [registrationNumber, setRegistrationNumber] = useState(
    (user.activeOrganization as any)?.registrationNumber || user.businessProfile?.registrationNumber || "REG-2026-0002"
  );
  const [nib, setNib] = useState(
    (user.activeOrganization as any)?.nib || user.businessProfile?.businessData?.nib || "8120009922331"
  );
  const [npwp, setNpwp] = useState(
    (user.activeOrganization as any)?.npwp || user.businessProfile?.businessData?.npwp || "01.234.567.8-011.000"
  );
  const [storeType, setStoreType] = useState(
    (user.activeOrganization as any)?.storeType || (user.activeOrganization as any)?.businessType || (user.businessProfile?.specializedData?.storeType as string) || "Retail Sparepart AC & Pendingin"
  );
  const [description, setDescription] = useState(
    (user.activeOrganization as any)?.description || "Pusat penyedia suku cadang pendingin ruangan original, kompresor, pipa tembaga, manifold gauge, dan refrigeran bersertifikat SNI."
  );

  // Contact
  const [phone, setPhone] = useState(
    (user.activeOrganization as any)?.phone || (user.activeOrganization as any)?.business_phone || user.businessProfile?.picData?.phone || user.phone || "+6281255566677"
  );
  const [email, setEmail] = useState(
    (user.activeOrganization as any)?.email || (user.activeOrganization as any)?.business_email || user.businessProfile?.picData?.email || user.email || "merchant@servio.id"
  );
  const [picName, setPicName] = useState(
    (user.activeOrganization as any)?.picData?.fullName || user.businessProfile?.picData?.fullName || user.name || "Ko Hendra"
  );
  const [picNik, setPicNik] = useState(
    (user.activeOrganization as any)?.picData?.nik || user.businessProfile?.picData?.nik || user.nik || "3174051208880003"
  );
  const [picPosition, setPicPosition] = useState(
    (user.activeOrganization as any)?.picData?.position || user.businessProfile?.picData?.position || "Pemilik Toko"
  );

  // Address
  const [address, setAddress] = useState(
    user.businessProfile?.businessData?.address || "Harco Glodok Blok A No. 15, Jl. Hayam Wuruk"
  );
  const [city, setCity] = useState(
    user.businessProfile?.businessData?.city || "Jakarta Barat"
  );
  const [district, setDistrict] = useState(
    user.businessProfile?.businessData?.district || "Taman Sari"
  );
  const [postalCode, setPostalCode] = useState(
    user.businessProfile?.businessData?.postalCode || "11180"
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
      setToastMessage("Harap lengkapi setidaknya Provinsi, Kota/Kabupaten, dan Jalan/Nomor Alamat Toko.");
      return;
    }

    const orgId = user.activeOrganization?.id || user.organizationId;
    if (!orgId) {
      setToastMessage("ID Organisasi Merchant tidak ditemukan.");
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
      setToastMessage("Alamat toko sparepart berhasil diperbarui!");
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToastMessage(error.message || "Gagal memperbarui alamat toko.");
    } finally {
      setIsSavingBizAddress(false);
    }
  };

  // Operational Settings (Level 02+ features preserved)
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("17:00");
  const [workDays, setWorkDays] = useState("Senin - Sabtu");
  const [operationalAvailability, setOperationalAvailability] = useState<"AVAILABLE" | "UNAVAILABLE">("AVAILABLE");

  // Settlement Bank Info (Level 02+ features preserved)
  const [bankName, setBankName] = useState("Bank Central Asia (BCA)");
  const [accountNumber, setAccountNumber] = useState("542-0199-881");
  const [accountHolder, setAccountHolder] = useState("Ko Hendra / Toko Sinar AC");

  // Keep state synchronized when user loads asynchronously
  // Keep state synchronized when user loads asynchronously
  useEffect(() => {
    // 1. Sync from activeOrganization if present
    const activeOrg = user.activeOrganization as any;
    if (activeOrg) {
      if (activeOrg.brandName || activeOrg.name) setBrandName(activeOrg.brandName || activeOrg.name);
      if (activeOrg.legalName || activeOrg.legal_name) setLegalName(activeOrg.legalName || activeOrg.legal_name);
      if (activeOrg.nib) setNib(activeOrg.nib);
      if (activeOrg.npwp) setNpwp(activeOrg.npwp);
      if (activeOrg.phone || activeOrg.business_phone) setPhone(activeOrg.phone || activeOrg.business_phone);
      if (activeOrg.email || activeOrg.business_email) setEmail(activeOrg.email || activeOrg.business_email);
      if (activeOrg.description) setDescription(activeOrg.description);
      if (activeOrg.storeType || activeOrg.businessType) setStoreType(activeOrg.storeType || activeOrg.businessType);
      if (activeOrg.registrationNumber) setRegistrationNumber(activeOrg.registrationNumber);
      if (activeOrg.picData) {
        if (activeOrg.picData.fullName || activeOrg.picData.full_name) setPicName(activeOrg.picData.fullName || activeOrg.picData.full_name);
        if (activeOrg.picData.nik) setPicNik(activeOrg.picData.nik);
        if (activeOrg.picData.position) setPicPosition(activeOrg.picData.position);
        if (activeOrg.picData.phone) setPhone(activeOrg.picData.phone);
        if (activeOrg.picData.email) setEmail(activeOrg.picData.email);
      }
    }

    // 2. Sync from businessProfile as fallback
    if (user.businessProfile?.businessData) {
      const b = user.businessProfile.businessData;
      if (b.brandName && !activeOrg?.brandName) setBrandName(b.brandName);
      if (b.legalName && !activeOrg?.legalName) setLegalName(b.legalName);
      if (b.nib && !activeOrg?.nib) setNib(b.nib);
      if (b.npwp && !activeOrg?.npwp) setNpwp(b.npwp);
      if (b.address) setAddress(b.address);
      if (b.city) setCity(b.city);
      if (b.district) setDistrict(b.district);
      if (b.postalCode) setPostalCode(b.postalCode);
    }
    if (user.businessProfile?.registrationNumber && !activeOrg?.registrationNumber) {
      setRegistrationNumber(user.businessProfile.registrationNumber);
    }
    if (user.businessProfile?.picData && !activeOrg?.picData) {
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

    const orgHours = (user.activeOrganization as any)?.operational_hours ||
                     (user.activeOrganization as any)?.operationalHours ||
                     (user.activeOrganization?.profile as any)?.operationalHours;
    if (orgHours) {
      if (orgHours.days) setWorkDays(orgHours.days);
      if (orgHours.open_time || orgHours.openTime) setOpenTime(normalizeTo24H(orgHours.open_time || orgHours.openTime, "09:00"));
      if (orgHours.close_time || orgHours.closeTime) setCloseTime(normalizeTo24H(orgHours.close_time || orgHours.closeTime, "17:00"));
    }

    const orgId = user.activeOrganization?.id || user.organizationId;
    if (orgId) {
      organizationApi.getOrganization(orgId)
        .then((res: any) => {
          if (res.data) {
            const d = res.data;
            if (d.brandName || d.display_name || d.name) setBrandName(d.brandName || d.display_name || d.name);
            if (d.legalName || d.legal_name) setLegalName(d.legalName || d.legal_name);
            if (d.nib) setNib(d.nib);
            if (d.npwp) setNpwp(d.npwp);
            if (d.phone || d.business_phone) setPhone(d.phone || d.business_phone);
            if (d.email || d.business_email) setEmail(d.email || d.business_email);
            if (d.description) setDescription(d.description);
            if (d.storeType || d.businessType) setStoreType(d.storeType || d.businessType);
            if (d.registrationNumber) setRegistrationNumber(d.registrationNumber);
            if (d.picData) {
              if (d.picData.fullName || d.picData.full_name) setPicName(d.picData.fullName || d.picData.full_name);
              if (d.picData.nik) setPicNik(d.picData.nik);
              if (d.picData.position) setPicPosition(d.picData.position);
              if (d.picData.phone) setPhone(d.picData.phone);
              if (d.picData.email) setEmail(d.picData.email);
            }
            if (d.settlementBank || d.specialization?.settlementBank) {
              const sb = d.settlementBank || d.specialization?.settlementBank;
              if (sb.bankName) setBankName(sb.bankName);
              if (sb.accountNumber) setAccountNumber(sb.accountNumber);
              if (sb.accountHolder) setAccountHolder(sb.accountHolder);
            }
            const op = d.operational_hours || d.operationalHours;
            if (op) {
              if (op.days) setWorkDays(op.days);
              if (op.open_time || op.openTime) setOpenTime(normalizeTo24H(op.open_time || op.openTime, "09:00"));
              if (op.close_time || op.closeTime) setCloseTime(normalizeTo24H(op.close_time || op.closeTime, "17:00"));
            }
            const status = d.operational_status || d.operationalStatus;
            if (status) {
              setOperationalAvailability(status === "TEMPORARY_CLOSED" ? "UNAVAILABLE" : "AVAILABLE");
            }
          }
        })
        .catch(() => {
          organizationApi.getAvailability(orgId)
            .then((res) => {
              if (res.data?.status) {
                setOperationalAvailability(res.data.status);
              }
            })
            .catch(() => {});
        });
    }
  }, [user]);

  // Load uploaded documents directly from database application history
  useEffect(() => {
    registrationApi.myApplications().then((res: any) => {
      const items = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      if (items.length > 0) {
        const latest = items[0];
        if (latest.documents && latest.documents.length > 0) {
          setLiveDocuments(latest.documents);
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
        const operationalHoursPayload = {
          days: workDays,
          open_time: openTime,
          close_time: closeTime,
        };

        const picDataPayload = {
          fullName: picName,
          nik: picNik,
          position: picPosition,
          phone,
          email,
        };

        const settlementBankPayload = {
          bankName,
          accountNumber,
          accountHolder,
        };

        await organizationApi.updateOrganization(orgId, {
          name: brandName,
          brandName,
          legalName,
          description,
          businessType: storeType,
          registrationNumber,
          business_phone: phone,
          business_email: email,
          phone,
          email,
          nib,
          npwp,
          picName,
          picNik,
          picPosition,
          picData: picDataPayload,
          settlementBank: settlementBankPayload,
          operational_hours: operationalHoursPayload,
          operationalHours: operationalHoursPayload,
          operational_status: operationalAvailability === "AVAILABLE" ? "ONLINE_ACCEPTING" : "TEMPORARY_CLOSED",
        });
      }
      setToastMessage("Profil dan informasi toko sparepart berhasil disimpan ke database!");
      await refreshUser();
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : "Gagal memperbarui profil toko.");
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
    <div className="space-y-6 font-body pb-20 w-full text-left">
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

      {/* Header */}
      <PageHeader
        title="Profil &amp; Legalitas Toko Sparepart"
        description="Kelola identitas usaha dagang, berkas dokumen terverifikasi, jam buka toko, dan rincian rekening settlement."
        breadcrumbs={[
          { label: "Dashboard Merchant", href: "/merchant/dashboard" },
          { label: "Profil Toko", href: "/merchant/profile" },
        ]}
      />

      {/* Verified Banner */}
      <div className="bg-emerald-50 rounded-3xl border border-emerald-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-emerald-900 shadow-servio-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Storefront size={28} weight="fill" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-base text-emerald-950 font-display">{brandName}</p>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1">
                <CheckCircle size={12} weight="fill" />
                {user.businessProfile?.status || "APPROVED / TOKO RESMI"}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              Badan Usaha: <strong className="font-semibold">{legalName}</strong> • Tipe: {storeType}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] bg-white/90 p-3 rounded-2xl border border-emerald-200/90 shadow-2xs">
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">No. Registrasi</span>
            <span className="font-bold text-emerald-900">{registrationNumber}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">NIB Usaha</span>
            <span className="font-bold text-emerald-900">{nib}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div>
            <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">NPWP Toko</span>
            <span className="font-bold text-emerald-900">{npwp}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-servio-xs overflow-hidden">
        <div className="flex items-center gap-1 overflow-x-auto p-2 border-b border-slate-100 bg-slate-50/50">
          {[
            { id: "store", label: "Informasi Toko", icon: Storefront },
            { id: "contact", label: "Kontak & PIC", icon: Phone },
            { id: "address", label: "Alamat Toko & Gudang", icon: MapPin },
            { id: "documents", label: "Dokumen Toko Terverifikasi", icon: FileText },
            { id: "operations", label: "Jam Operasional", icon: Clock },
            { id: "settlement", label: "Rekening Settlement", icon: Bank },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as MerchantTab)}
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
          {/* TAB 1: INFORMASI TOKO */}
          {activeTab === "store" && (
            <div className="space-y-5 max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Registrasi Toko</label>
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
                      className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Verifikasi Toko</label>
                  <div className="px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold flex items-center gap-2">
                    <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                    <span>{user.businessProfile?.status || "APPROVED / TOKO RESMI"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Brand / Toko Komersial</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Legal Badan Usaha (UD / CV / PT)</label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block font-bold text-slate-700 mb-1">NPWP Toko / Badan</label>
                  <input
                    type="text"
                    value={npwp}
                    onChange={(e) => setNpwp(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori Spesialisasi Toko</label>
                <input
                  type="text"
                  value={storeType}
                  onChange={(e) => setStoreType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Katalog &amp; Profil Singkat</label>
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
            <div className="space-y-5 max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor WhatsApp &amp; Telepon Toko</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Toko / Pemilik</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Pemilik / PIC Toko</label>
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

              <div className="max-w-md">
                <label className="block font-bold text-slate-700 mb-1">NIK Pemilik Toko</label>
                <input
                  type="text"
                  value={picNik}
                  onChange={(e) => setPicNik(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-semibold"
                />
              </div>
            </div>
          )}

          {/* TAB 3: ALAMAT TOKO & GUDANG (CR-04) */}
          {activeTab === "address" && (
            <div className="space-y-5 max-w-4xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Alamat Usaha &amp; Lokasi Toko Fisik</h4>
                  <p className="text-slate-500 text-xs">Lokasi toko atau gudang pengiriman untuk kalkulasi jarak radius pengiriman dan logistik lokal.</p>
                </div>
                <button
                  id="btn-edit-alamat-usaha-merchant"
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
                      <span>Alamat Toko Terverifikasi</span>
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
                      Silakan lengkapi alamat fisik toko sparepart Anda untuk mempermudah kalkulasi ongkir dan pickup pesanan.
                    </p>
                  </div>
                  <button
                    id="btn-lengkapi-alamat-usaha-empty-merchant"
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

          {/* TAB 4: DOKUMEN TOKO TERVERIFIKASI */}
          {activeTab === "documents" && (
            <div className="space-y-5 max-w-5xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Dokumen Toko &amp; Legalitas Usaha Dagang</h4>
                  <p className="text-slate-500 text-xs">
                    Dokumen resmi yang tersimpan di database MongoDB SERVIO dan telah disetujui oleh tim verifikator.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(liveDocuments && liveDocuments.length > 0
                  ? liveDocuments
                  : (user.documents && user.documents.length > 0
                      ? user.documents
                      : [
                    {
                      id: "doc-m1",
                      documentType: "RESPONSIBLE_PERSON_ID",
                      fileName: "ktp_pemilik_toko.pdf",
                      filePath: "/storage/registration/docs/ktp_pemilik_toko.pdf",
                      fileSize: 1024000,
                      status: "APPROVED",
                      version: 1,
                    },
                    {
                      id: "doc-m2",
                      documentType: "BUSINESS_ID",
                      fileName: "nib_usaha_dagang_toko.pdf",
                      filePath: "/storage/registration/docs/nib_usaha_dagang_toko.pdf",
                      fileSize: 1800000,
                      status: "APPROVED",
                      version: 1,
                    },
                    {
                      id: "doc-m3",
                      documentType: "BUSINESS_ADDRESS_PROOF",
                      fileName: "foto_toko_papan_nama_glodok.jpg",
                      filePath: "/storage/registration/docs/foto_toko_papan_nama_glodok.jpg",
                      fileSize: 2048000,
                      status: "APPROVED",
                      version: 1,
                    },
                    {
                      id: "doc-m4",
                      documentType: "TAX_DOCUMENT",
                      fileName: "npwp_usaha_sinar_ac.pdf",
                      filePath: "/storage/registration/docs/npwp_usaha_sinar_ac.pdf",
                      fileSize: 512000,
                      status: "APPROVED",
                      version: 1,
                    },
                  ]
                )
                ).map((doc: any) => {
                  const typeLabels: Record<string, string> = {
                    KTP_PIC: "Identitas Pemilik Toko (KTP)",
                    NPWP_BISNIS: "NPWP Toko / Usaha Dagang",
                    NIB: "Nomor Induk Berusaha (NIB Toko)",
                    FOTO_TOKO: "Foto Plang Toko & Bukti Alamat",
                    FOTO_BENGKEL: "Foto Fisik Fasilitas",
                    AKTA_PERUSAHAAN: "Akta Pendirian / SK Kemenkumham",
                    RESPONSIBLE_PERSON_ID: "Identitas Pemilik Toko (KTP)",
                    BUSINESS_ID: "Nomor Induk Berusaha (NIB Toko)",
                    BUSINESS_ADDRESS_PROOF: "Foto Plang Toko & Bukti Alamat",
                    TAX_DOCUMENT: "NPWP Toko / Usaha Dagang",
                    LEGAL_DOCUMENT: "Akta Notaris / Legalitas Usaha",
                  };
                  const label = typeLabels[doc.documentType || doc.doc_type] || doc.documentType || doc.doc_type || "Dokumen Toko";
                  const sizeMB = doc.fileSize ? (doc.fileSize / (1024 * 1024)).toFixed(2) + " MB" : "1.5 MB";
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
                          v{doc.version || 1} • Dokumen Terverifikasi
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

          {/* TAB 5: JAM OPERASIONAL & KURIR */}
          {activeTab === "operations" && (
            <div className="space-y-5 max-w-4xl">
              {/* Level 08 Canonical Merchant Operational Availability */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Status Operasional Toko (Level 08)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Menentukan apakah toko saat ini melayani pesanan atau sedang tutup sementara.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      operationalAvailability === "AVAILABLE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {operationalAvailability === "AVAILABLE" ? "TERSEDIA (AVAILABLE)" : "TIDAK TERSEDIA (TUTUP)"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOperationalAvailability("AVAILABLE")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      operationalAvailability === "AVAILABLE"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-300" />
                    <span>Toko Buka (Available)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperationalAvailability("UNAVAILABLE")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      operationalAvailability === "UNAVAILABLE"
                        ? "bg-slate-800 text-white shadow-xs"
                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Toko Tutup (Unavailable)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Hari Buka</label>
                  <input
                    type="text"
                    value={workDays}
                    onChange={(e) => setWorkDays(e.target.value)}
                    placeholder="Senin - Sabtu"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-xs sm:text-sm text-slate-900 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Hari aktif toko</span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Jam Buka (24 Jam)</label>
                  <div className="relative">
                    <select
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold text-xs sm:text-sm text-slate-900 bg-white appearance-none pr-9 cursor-pointer"
                    >
                      {!TIME_OPTIONS_24H.includes(openTime) && (
                        <option value={openTime}>{openTime}</option>
                      )}
                      {TIME_OPTIONS_24H.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <Clock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Format 24 jam (Contoh: 08:00, 09:00)</span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Jam Tutup (24 Jam)</label>
                  <div className="relative">
                    <select
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold text-xs sm:text-sm text-slate-900 bg-white appearance-none pr-9 cursor-pointer"
                    >
                      {!TIME_OPTIONS_24H.includes(closeTime) && (
                        <option value={closeTime}>{closeTime}</option>
                      )}
                      {TIME_OPTIONS_24H.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <Clock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Format 24 jam (Contoh: 17:00, 21:00)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: REKENING SETTLEMENT */}
          {activeTab === "settlement" && (
            <div className="space-y-5 max-w-4xl">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <p className="font-bold">Informasi Penarikan Saldo Penjualan</p>
                <p className="text-[11px]">
                  Seluruh hasil transaksi penjualan sparepart di platform Servio akan dicairkan ke rekening bank resmi pemilik toko ini.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Bank Penampung</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Rekening Bank</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Pemilik Rekening (Sesuai Buku Tabungan)</label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button variant="primary" size="md" type="submit" disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan Profil Toko"}
            </Button>
          </div>
        </form>
      </div>

      {/* CR-04: Modal Edit / Lengkapi Alamat Usaha Merchant */}
      <Modal
        isOpen={showBizAddressModal}
        onClose={() => setShowBizAddressModal(false)}
        title={hasBizAddress ? "Edit Alamat Toko Fisik" : "Lengkapi Alamat Toko Fisik"}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveBizAddressModal} className="space-y-5 pt-2">
          <AddressCascadingForm
            value={editingBizAddress}
            onChange={setEditingBizAddress}
            title="Alamat Lokasi Toko & Gudang Sparepart"
            subtitle="Pilih provinsi, kota/kabupaten, kecamatan, dan kelurahan resmi untuk penentuan kalkulasi radius pengiriman"
            required={true}
            idPrefix="merchant-edit-addr-modal"
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
              id="btn-save-merchant-biz-address"
              type="submit"
              disabled={isSavingBizAddress}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition flex items-center gap-2 shadow-servio-xs disabled:opacity-60 cursor-pointer"
            >
              {isSavingBizAddress ? (
                <>
                  <CircleNotch size={16} className="animate-spin" />
                  <span>Menyimpan Alamat Toko...</span>
                </>
              ) : (
                <span>Simpan Alamat Toko</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
