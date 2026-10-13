"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { useActiveRole } from "@/context/RoleContext";
import { organizationApi } from "@/lib/servioApi";
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
  Bank,
  Truck,
  Package,
  PencilSimple,
  Copy,
} from "@phosphor-icons/react";

type SupplierTab = "company" | "contact" | "warehouse" | "documents" | "distribution" | "terms";

export default function SupplierProfilePage() {
  const { user, refreshUser } = useActiveRole();
  const [activeTab, setActiveTab] = useState<SupplierTab>("company");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

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
  }, [user]);

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

          {/* TAB 3: GUDANG & HUB DISTRIBUSI */}
          {activeTab === "warehouse" && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat Hub / Gudang Logistik Utama</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kecamatan</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kota / Wilayah</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kode Pos</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              </div>
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
                {(user.documents && user.documents.length > 0
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
                ).map((doc) => {
                  const typeLabels: Record<string, string> = {
                    RESPONSIBLE_PERSON_ID: "Identitas GM / Penanggung Jawab (KTP)",
                    BUSINESS_ID: "Nomor Induk Berusaha (NIB Principal)",
                    BUSINESS_ADDRESS_PROOF: "Bukti Kepemilikan Gudang Pusat",
                    TAX_DOCUMENT: "NPWP Badan Usaha PT",
                    LEGAL_DOCUMENT: "Surat Keagenan Resmi / Akta Notaris",
                  };
                  const label = typeLabels[doc.documentType] || doc.documentType;
                  const sizeMB = doc.fileSize ? (doc.fileSize / (1024 * 1024)).toFixed(2) + " MB" : "1.8 MB";

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
                              {doc.fileName}
                            </p>
                            <span className="text-[11px] text-slate-400 font-mono">{sizeMB}</span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                          <CheckCircle size={12} weight="fill" />
                          {doc.status || "APPROVED"}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500 font-mono">
                          v{doc.version || 1} • Dokumen Resmi
                        </span>
                        <button
                          type="button"
                          onClick={() => setToastMessage(`Mengunduh berkas ${doc.fileName}...`)}
                          className="text-[#0F4C81] font-bold hover:underline flex items-center gap-1"
                        >
                          <DownloadSimple size={14} weight="bold" />
                          <span>Unduh</span>
                        </button>
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
    </div>
  );
}
